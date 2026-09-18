import json
import os
import uuid
import re
import math
from datetime import datetime, timezone
from io import BytesIO

import boto3
from pypdf import PdfReader
from docx import Document
from groq import Groq


# ============================================================
# AWS CLIENTS
# ============================================================

dynamodb = boto3.resource("dynamodb")

table = dynamodb.Table(
    os.environ.get("TABLE_NAME", "TeamGate")
)

s3 = boto3.client("s3")

cognito = boto3.client("cognito-idp")

DOCUMENT_BUCKET = os.environ.get(
    "DOCUMENT_BUCKET",
    ""
)

USER_POOL_ID = os.environ.get(
    "USER_POOL_ID",
    ""
)

GROQ_API_KEY = os.environ.get(
    "GROQ_API_KEY",
    ""
)


# ============================================================
# RESPONSE HELPER
# ============================================================

def response(status_code, body):

    return {
        "statusCode": status_code,

        "headers": {
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Headers":
                "Content-Type,Authorization",
            "Access-Control-Allow-Methods":
                "GET,POST,PUT,DELETE,OPTIONS",
        },

        "body": json.dumps(
            body,
            default=str
        ),
    }


# ============================================================
# REQUEST HELPERS
# ============================================================

def get_method(event):

    return (
        event.get("requestContext", {})
        .get("http", {})
        .get("method", "")
        .upper()
    )


def get_path(event):

    return event.get(
        "rawPath",
        "/"
    )


def get_body(event):

    body = event.get("body")

    if not body:
        return {}

    try:

        return json.loads(body)

    except json.JSONDecodeError:

        return None


def get_claims(event):

    return (
        event.get("requestContext", {})
        .get("authorizer", {})
        .get("jwt", {})
        .get("claims", {})
    )


# ============================================================
# GENERAL HELPERS
# ============================================================

def normalize_email(email):

    return str(
        email or ""
    ).strip().lower()


def now_iso():

    return datetime.now(
        timezone.utc
    ).isoformat()


def clean_text(text):

    if not text:
        return ""

    text = re.sub(
        r"\s+",
        " ",
        text
    )

    return text.strip()


# ============================================================
# INVITATION HELPERS
# ============================================================

def get_invitation(email):

    email = normalize_email(
        email
    )

    if not email:
        return None

    result = table.get_item(
        Key={
            "PK": f"INVITE#{email}",
            "SK": "INVITE",
        }
    )

    invitation = result.get(
        "Item"
    )

    if not invitation:
        return None

    if invitation.get(
        "status"
    ) != "pending":

        return None

    return invitation


def create_invitation(
    admin_user,
    email,
    role
):

    email = normalize_email(
        email
    )

    role = str(
        role or ""
    ).strip().lower()

    if not email:

        return None, "Email is required"

    # Admin can invite all three roles.
    if role not in {
        "admin",
        "manager",
        "employee",
    }:

        return None, (
            "Role must be admin, manager or employee"
        )

    if normalize_email(
        admin_user.get("email")
    ) == email:

        return None, (
            "You cannot invite yourself"
        )

    org_id = admin_user.get(
        "orgId"
    )

    if not org_id:

        org_id = (
            f"ORG#{admin_user.get('userId')}"
        )

    invitation = {

        "PK":
            f"INVITE#{email}",

        "SK":
            "INVITE",

        "email":
            email,

        "role":
            role,

        "orgId":
            org_id,

        "invitedBy":
            admin_user.get("userId"),

        "invitedByEmail":
            admin_user.get("email"),

        "status":
            "pending",

        "createdAt":
            now_iso(),
    }

    table.put_item(
        Item=invitation
    )

    return invitation, None


def mark_invitation_accepted(
    email
):

    email = normalize_email(
        email
    )

    invitation = get_invitation(
        email
    )

    if not invitation:
        return

    invitation["status"] = "accepted"

    invitation["acceptedAt"] = now_iso()

    table.put_item(
        Item=invitation
    )


# ============================================================
# COGNITO INVITATION
# ============================================================

def send_cognito_invitation(
    email,
    role
):

    if not USER_POOL_ID:

        return False, (
            "Cognito User Pool ID is missing"
        )

    try:

        cognito.admin_create_user(

            UserPoolId=USER_POOL_ID,

            Username=email,

            UserAttributes=[
                {
                    "Name": "email",
                    "Value": email,
                },
                {
                    "Name": "email_verified",
                    "Value": "true",
                },
            ],

            DesiredDeliveryMediums=[
                "EMAIL"
            ],

            ForceAliasCreation=False,

            ClientMetadata={
                "role": role,
            },
        )

        return True, None

    except cognito.exceptions.UsernameExistsException:

        return False, (
            "A Cognito account already exists "
            "for this email address."
        )

    except Exception as error:

        print(
            "Cognito invitation error:",
            str(error)
        )

        return False, (
            "Unable to send Cognito invitation."
        )


# ============================================================
# USER HELPERS
# ============================================================

def has_any_users():

    result = table.scan(

        FilterExpression=(
            "begins_with(PK, :prefix)"
        ),

        ExpressionAttributeValues={
            ":prefix": "USER#"
        },

        ProjectionExpression="PK",

        Limit=1,
    )

    return len(
        result.get(
            "Items",
            []
        )
    ) > 0


def get_current_user(event):

    claims = get_claims(
        event
    )

    user_id = claims.get(
        "sub"
    )

    email = normalize_email(
        claims.get("email")
    )

    if not user_id:
        return None

    result = table.get_item(
        Key={
            "PK":
                f"USER#{user_id}",

            "SK":
                "PROFILE",
        }
    )

    user = result.get(
        "Item"
    )

    # ========================================================
    # EXISTING USER
    # ========================================================

    if user:

        if not user.get(
            "userId"
        ):

            user["userId"] = user_id

        if (
            email
            and user.get("email") != email
        ):

            user["email"] = email

            table.put_item(
                Item=user
            )

        if (
            user.get("role") == "admin"
            and not user.get("orgId")
        ):

            user["orgId"] = (
                f"ORG#{user_id}"
            )

            table.put_item(
                Item=user
            )

        return user

    # ========================================================
    # NEW USER
    # ========================================================

    invitation = get_invitation(
        email
    )

    role = None

    org_id = None

    # --------------------------------------------------------
    # Invited user
    # --------------------------------------------------------

    if invitation:

        role = invitation.get(
            "role",
            "employee"
        )

        org_id = invitation.get(
            "orgId"
        )

    # --------------------------------------------------------
    # First user becomes Organization Owner
    # --------------------------------------------------------

    elif not has_any_users():

        role = "admin"

        org_id = (
            f"ORG#{user_id}"
        )

    # --------------------------------------------------------
    # Block uninvited users
    # --------------------------------------------------------

    else:

        print(
            f"Uninvited user attempted access: {email}"
        )

        return None

    user = {

        "PK":
            f"USER#{user_id}",

        "SK":
            "PROFILE",

        "userId":
            user_id,

        "email":
            email,

        "role":
            role,

        "createdAt":
            now_iso(),

        "orgId":
            org_id,
    }

    table.put_item(
        Item=user
    )

    if invitation:

        mark_invitation_accepted(
            email
        )

    return user


# ============================================================
# PERMISSIONS
# ============================================================

ROLE_PERMISSIONS = {

    "employee": {

        "GET": True,

        "POST": False,

        "PUT": False,

        "DELETE": False,

        "ROLE_CHANGE": False,

        "INVITE": False,

        "DOCUMENT_UPLOAD": False,

        "DOCUMENT_DELETE": False,

        "QA": True,
    },

    "manager": {

        "GET": True,

        "POST": True,

        "PUT": True,

        "DELETE": False,

        "ROLE_CHANGE": False,

        "INVITE": False,

        "DOCUMENT_UPLOAD": True,

        "DOCUMENT_DELETE": False,

        "QA": True,
    },

    "admin": {

        "GET": True,

        "POST": True,

        "PUT": True,

        "DELETE": True,

        "ROLE_CHANGE": True,

        "INVITE": True,

        "DOCUMENT_UPLOAD": True,

        "DOCUMENT_DELETE": True,

        "QA": True,
    },
}


def check_permission(
    user,
    action
):

    role = user.get(
        "role",
        "employee"
    ).lower()

    permissions = ROLE_PERMISSIONS.get(
        role
    )

    if not permissions:
        return False

    return permissions.get(
        action,
        False
    )


# ============================================================
# PROJECT FUNCTIONS
# ============================================================

def get_projects(user):

    org_id = user.get(
        "orgId"
    )

    result = table.scan(

        FilterExpression=(
            "begins_with(PK, :prefix) "
            "AND orgId = :org"
        ),

        ExpressionAttributeValues={
            ":prefix": "PROJECT#",
            ":org": org_id,
        },
    )

    projects = result.get(
        "Items",
        []
    )

    return projects


def create_project(
    user,
    data
):

    name = str(
        data.get(
            "name",
            ""
        )
    ).strip()

    description = str(
        data.get(
            "description",
            ""
        )
    ).strip()

    status = str(
        data.get(
            "status",
            "active"
        )
    ).strip()

    if not name:
        return None

    project_id = str(
        uuid.uuid4()
    )

    now = now_iso()

    project = {

        "PK":
            f"PROJECT#{project_id}",

        "SK":
            "PROJECT",

        "projectId":
            project_id,

        "name":
            name,

        "description":
            description,

        "status":
            status,

        "orgId":
            user.get("orgId"),

        "createdBy":
            user["userId"],

        "createdAt":
            now,

        "updatedAt":
            now,
    }

    table.put_item(
        Item=project
    )

    return project


def get_project_for_org(
    project_id,
    org_id
):

    result = table.get_item(
        Key={
            "PK":
                f"PROJECT#{project_id}",

            "SK":
                "PROJECT",
        }
    )

    project = result.get(
        "Item"
    )

    if not project:
        return None

    if project.get(
        "orgId"
    ) != org_id:

        return None

    return project


def update_project(
    project_id,
    data,
    org_id
):

    project = get_project_for_org(
        project_id,
        org_id
    )

    if not project:
        return None

    if "name" in data:

        name = str(
            data["name"]
        ).strip()

        if name:
            project["name"] = name

    if "description" in data:

        project["description"] = str(
            data["description"]
        ).strip()

    if "status" in data:

        project["status"] = str(
            data["status"]
        ).strip()

    project["updatedAt"] = now_iso()

    table.put_item(
        Item=project
    )

    return project


def delete_project(
    project_id,
    org_id
):

    project = get_project_for_org(
        project_id,
        org_id
    )

    if not project:
        return False

    table.delete_item(
        Key={
            "PK":
                f"PROJECT#{project_id}",

            "SK":
                "PROJECT",
        }
    )

    return True


# ============================================================
# USER MANAGEMENT
# ============================================================

def get_users(user):

    org_id = user.get(
        "orgId"
    )

    result = table.scan(

        FilterExpression=(
            "begins_with(PK, :prefix) "
            "AND orgId = :org"
        ),

        ExpressionAttributeValues={

            ":prefix":
                "USER#",

            ":org":
                org_id,
        },
    )

    users = []

    for item in result.get(
        "Items",
        []
    ):

        users.append({

            "userId":
                item.get("userId"),

            "email":
                item.get("email"),

            "role":
                item.get(
                    "role",
                    "employee"
                ),

            "createdAt":
                item.get("createdAt"),

            "orgId":
                item.get("orgId"),
        })

    return users


def change_user_role(
    admin_user,
    user_id,
    new_role
):

    new_role = str(
        new_role or ""
    ).lower().strip()

    allowed_roles = {
        "employee",
        "manager",
        "admin",
    }

    if new_role not in allowed_roles:

        return None, "Invalid role"

    if user_id == admin_user.get(
        "userId"
    ):

        return None, (
            "You cannot change your own role"
        )

    result = table.get_item(
        Key={
            "PK":
                f"USER#{user_id}",

            "SK":
                "PROFILE",
        }
    )

    user = result.get(
        "Item"
    )

    if not user:

        return None, "User not found"

    if user.get(
        "orgId"
    ) != admin_user.get(
        "orgId"
    ):

        return None, "User not found"

    user["role"] = new_role

    user["updatedAt"] = now_iso()

    table.put_item(
        Item=user
    )

    return user, None


# ============================================================
# DOCUMENT HELPERS
# ============================================================

def get_documents(user):

    org_id = user.get(
        "orgId"
    )

    result = table.scan(

        FilterExpression=(
            "begins_with(PK, :prefix) "
            "AND orgId = :org"
        ),

        ExpressionAttributeValues={

            ":prefix":
                "DOCUMENT#",

            ":org":
                org_id,
        },
    )

    documents = []

    for item in result.get(
        "Items",
        []
    ):

        documents.append({

            "documentId":
                item.get("documentId"),

            "fileName":
                item.get("fileName"),

            "contentType":
                item.get("contentType"),

            "size":
                item.get("size"),

            "uploadedBy":
                item.get("uploadedBy"),

            "uploadedByEmail":
                item.get("uploadedByEmail"),

            "createdAt":
                item.get("createdAt"),

            "chunkCount":
                item.get("chunkCount", 0),

            "status":
                item.get("status", "unknown"),
        })

    documents.sort(
        key=lambda x: x.get(
            "createdAt",
            ""
        ),
        reverse=True
    )

    return documents


def get_document(
    document_id,
    org_id
):

    result = table.get_item(

        Key={

            "PK":
                f"DOCUMENT#{document_id}",

            "SK":
                "DOCUMENT",

        }
    )

    document = result.get(
        "Item"
    )

    if not document:
        return None

    if document.get(
        "orgId"
    ) != org_id:

        return None

    return document


# ============================================================
# DOCUMENT TEXT EXTRACTION
# ============================================================

def extract_pdf_text(
    file_bytes
):

    reader = PdfReader(
        BytesIO(file_bytes)
    )

    pages = []

    for page in reader.pages:

        try:

            text = page.extract_text()

            if text:

                pages.append(
                    text
                )

        except Exception as error:

            print(
                "PDF page extraction error:",
                str(error)
            )

    return clean_text(
        "\n".join(pages)
    )


def extract_docx_text(
    file_bytes
):

    document = Document(
        BytesIO(file_bytes)
    )

    paragraphs = []

    for paragraph in document.paragraphs:

        text = paragraph.text.strip()

        if text:

            paragraphs.append(
                text
            )

    return clean_text(
        "\n".join(paragraphs)
    )


def extract_text(
    file_bytes,
    file_name,
    content_type
):

    extension = (
        file_name.lower()
        .split(".")[-1]
    )

    if (
        extension == "pdf"
        or content_type == "application/pdf"
    ):

        return extract_pdf_text(
            file_bytes
        )

    if extension == "docx":

        return extract_docx_text(
            file_bytes
        )

    if (
        extension == "txt"
        or content_type.startswith(
            "text/"
        )
    ):

        return clean_text(
            file_bytes.decode(
                "utf-8",
                errors="ignore"
            )
        )

    raise ValueError(
        "Supported document types are PDF, DOCX and TXT."
    )


# ============================================================
# TEXT CHUNKING
# ============================================================

def chunk_text(
    text,
    chunk_size=1200,
    overlap=200
):

    text = clean_text(
        text
    )

    if not text:
        return []

    chunks = []

    start = 0

    text_length = len(
        text
    )

    while start < text_length:

        end = min(
            start + chunk_size,
            text_length
        )

        chunk = text[
            start:end
        ].strip()

        if chunk:

            chunks.append(
                chunk
            )

        if end >= text_length:
            break

        start = max(
            end - overlap,
            start + 1
        )

    return chunks


# ============================================================
# SIMPLE RETRIEVAL
# ============================================================

STOP_WORDS = {

    "the",
    "is",
    "a",
    "an",
    "and",
    "or",
    "of",
    "to",
    "in",
    "on",
    "for",
    "with",
    "what",
    "which",
    "who",
    "when",
    "where",
    "how",
    "why",
    "does",
    "do",
    "can",
    "are",
    "was",
    "were",
    "this",
    "that",
}


def tokenize(text):

    words = re.findall(
        r"[a-zA-Z0-9]+",
        text.lower()
    )

    return [

        word

        for word in words

        if word not in STOP_WORDS
        and len(word) > 2

    ]


def retrieval_score(
    question,
    chunk
):

    question_words = set(
        tokenize(question)
    )

    chunk_words = tokenize(
        chunk
    )

    if not question_words:
        return 0.0

    chunk_set = set(
        chunk_words
    )

    overlap = len(
        question_words
        & chunk_set
    )

    if overlap == 0:
        return 0.0

    frequency_bonus = 0

    for word in question_words:

        frequency_bonus += (
            chunk_words.count(word)
        )

    return (

        overlap
        / math.sqrt(
            len(question_words)
            * max(
                len(chunk_set),
                1
            )
        )

    ) + (

        min(
            frequency_bonus,
            5
        ) * 0.01

    )


# ============================================================
# IMPROVED DOCUMENT RETRIEVAL
# ============================================================

def retrieve_chunks(
    question,
    org_id,
    limit=5,
    document_id=None
):
    """
    Retrieve the most relevant chunks from DynamoDB.

    If document_id is provided, retrieval is restricted
    to that specific document.
    """

    question_words = set(
        re.findall(
            r"\b[a-zA-Z0-9]+\b",
            question.lower()
        )
    )

    if not question_words:
        return []

    all_chunks = []

    scan_kwargs = {

        "FilterExpression": (
            "begins_with(PK, :prefix) "
            "AND orgId = :org"
        ),

        "ExpressionAttributeValues": {

            ":prefix":
                "CHUNK#",

            ":org":
                org_id,

        },

        "ConsistentRead":
            True,
    }

    # --------------------------------------------------------
    # Strict document filtering
    # --------------------------------------------------------

    if document_id:

        scan_kwargs["FilterExpression"] = (
            "begins_with(PK, :prefix) "
            "AND orgId = :org"
        )

    # --------------------------------------------------------
    # DynamoDB pagination
    # --------------------------------------------------------

    while True:

        result = table.scan(
            **scan_kwargs
        )

        for item in result.get(
            "Items",
            []
        ):

            item_document_id = str(
                item.get(
                    "documentId",
                    ""
                )
            )

            # ------------------------------------------------
            # Search only selected document
            # ------------------------------------------------

            if document_id:

                if item_document_id != document_id:

                    continue

            # ------------------------------------------------
            # IMPORTANT:
            # DynamoDB stores extracted text in "text"
            # ------------------------------------------------

            text = str(
                item.get(
                    "text",
                    ""
                )
            ).strip()

            if not text:
                continue

            all_chunks.append({

                "chunkId":
                    item.get(
                        "chunkId"
                    ),

                "documentId":
                    item_document_id,

                "documentName":
                    item.get(
                        "documentName",
                        "Unknown document"
                    ),

                "chunkIndex":
                    int(
                        item.get(
                            "chunkIndex",
                            0
                        )
                    ),

                "text":
                    text,

            })

        last_key = result.get(
            "LastEvaluatedKey"
        )

        if not last_key:
            break

        scan_kwargs[
            "ExclusiveStartKey"
        ] = last_key

    # --------------------------------------------------------
    # Score chunks
    # --------------------------------------------------------

    scored_chunks = []

    for chunk in all_chunks:

        text_lower = chunk[
            "text"
        ].lower()

        score = 0

        for word in question_words:

            if word in text_lower:

                score += 1

        if score > 0:

            scored_chunks.append(
                (
                    score,
                    chunk
                )
            )

    # --------------------------------------------------------
    # Highest score first
    # --------------------------------------------------------

    scored_chunks.sort(

        key=lambda item: (
            item[0],
            -item[1]["chunkIndex"]
        ),

        reverse=True

    )

    return [

        chunk

        for score, chunk

        in scored_chunks[:limit]

    ]


# ============================================================
# GROQ
# ============================================================

def generate_groq_answer(
    question,
    context
):

    if not GROQ_API_KEY:

        raise RuntimeError(
            "GROQ_API_KEY is not configured."
        )

    client = Groq(
        api_key=GROQ_API_KEY
    )

    prompt = f"""
You are TeamGate AI, a document question-answering assistant.

Answer the user's question using ONLY the provided document context.

If the answer cannot be found in the context, clearly say:

"I couldn't find that information in the uploaded documents."

Do not invent facts.

Be concise, clear and professional.

DOCUMENT CONTEXT:
{context}

USER QUESTION:
{question}
"""

    completion = client.chat.completions.create(

        model="openai/gpt-oss-20b",

        messages=[

            {
                "role":
                    "system",

                "content":
                    "You answer questions using supplied document context."
            },

            {
                "role":
                    "user",

                "content":
                    prompt,
            },

        ],

        temperature=0.1,

        max_tokens=700,
    )

    return (
        completion.choices[0]
        .message.content
        .strip()
    )


# ============================================================
# LAMBDA HANDLER
# ============================================================

def lambda_handler(
    event,
    context
):

    print(
        "TeamGate Lambda received event:"
    )

    print(
        json.dumps(event)
    )

    method = get_method(
        event
    )

    path = get_path(
        event
    )

    # ========================================================
    # CORS
    # ========================================================

    if method == "OPTIONS":

        return response(
            204,
            {}
        )

    # ========================================================
    # AUTHENTICATION
    # ========================================================

    user = get_current_user(
        event
    )

    if not user:

        return response(
            401,
            {
                "message":
                    "Unauthorized. "
                    "You must be invited to this workspace."
            }
        )

    role = user.get(
        "role",
        "employee"
    ).lower()

    print(
        f"User: {user.get('email')}"
    )

    print(
        f"Role: {role}"
    )

    print(
        f"Method: {method}"
    )

    print(
        f"Path: {path}"
    )

    # ========================================================
    # GET /me
    # ========================================================

    if (
        method == "GET"
        and path == "/me"
    ):

        return response(
            200,
            {

                "userId":
                    user.get("userId"),

                "email":
                    user.get("email"),

                "role":
                    role,

                "orgId":
                    user.get("orgId"),

            }
        )

    # ========================================================
    # GET /projects
    # ========================================================

    if (
        method == "GET"
        and path == "/projects"
    ):

        if not check_permission(
            user,
            "GET"
        ):

            return response(
                403,
                {
                    "message":
                        "Forbidden"
                }
            )

        projects = get_projects(
            user
        )

        return response(
            200,
            {
                "projects":
                    projects
            }
        )

    # ========================================================
    # POST /projects
    # ========================================================

    if (
        method == "POST"
        and path == "/projects"
    ):

        if not check_permission(
            user,
            "POST"
        ):

            return response(
                403,
                {
                    "message":
                        "Forbidden"
                }
            )

        data = get_body(
            event
        )

        if data is None:

            return response(
                400,
                {
                    "message":
                        "Invalid JSON body"
                }
            )

        project = create_project(
            user,
            data
        )

        if not project:

            return response(
                400,
                {
                    "message":
                        "Project name is required"
                }
            )

        return response(
            201,
            project
        )

    # ========================================================
    # PUT /projects/{projectId}
    # ========================================================

    if (
        method == "PUT"
        and path.startswith(
            "/projects/"
        )
    ):

        if not check_permission(
            user,
            "PUT"
        ):

            return response(
                403,
                {
                    "message":
                        "Forbidden"
                }
            )

        project_id = path.split(
            "/"
        )[-1]

        if not project_id:

            return response(
                400,
                {
                    "message":
                        "Project ID is required"
                }
            )

        data = get_body(
            event
        )

        if data is None:

            return response(
                400,
                {
                    "message":
                        "Invalid JSON body"
                }
            )

        project = update_project(
            project_id,
            data,
            user.get("orgId")
        )

        if not project:

            return response(
                404,
                {
                    "message":
                        "Project not found"
                }
            )

        return response(
            200,
            project
        )

    # ========================================================
    # DELETE /projects/{projectId}
    # ========================================================

    if (
        method == "DELETE"
        and path.startswith(
            "/projects/"
        )
    ):

        if not check_permission(
            user,
            "DELETE"
        ):

            return response(
                403,
                {
                    "message":
                        "Forbidden"
                }
            )

        project_id = path.split(
            "/"
        )[-1]

        deleted = delete_project(
            project_id,
            user.get("orgId")
        )

        if not deleted:

            return response(
                404,
                {
                    "message":
                        "Project not found"
                }
            )

        return response(
            200,
            {
                "message":
                    "Project deleted successfully"
            }
        )

    # ========================================================
    # GET /users
    # ========================================================

    if (
        method == "GET"
        and path == "/users"
    ):

        if not check_permission(
            user,
            "ROLE_CHANGE"
        ):

            return response(
                403,
                {
                    "message":
                        "Only an admin can view users"
                }
            )

        users = get_users(
            user
        )

        return response(
            200,
            {
                "users":
                    users
            }
        )

    # ========================================================
    # PUT /users/{userId}/role
    # ========================================================

    if (
        method == "PUT"
        and path.startswith(
            "/users/"
        )
        and path.endswith(
            "/role"
        )
    ):

        if not check_permission(
            user,
            "ROLE_CHANGE"
        ):

            return response(
                403,
                {
                    "message":
                        "Only an admin can change roles"
                }
            )

        parts = path.strip(
            "/"
        ).split("/")

        if len(parts) != 3:

            return response(
                400,
                {
                    "message":
                        "Invalid user role path"
                }
            )

        target_user_id = parts[1]

        data = get_body(
            event
        )

        if data is None:

            return response(
                400,
                {
                    "message":
                        "Invalid JSON body"
                }
            )

        new_role = data.get(
            "role"
        )

        updated_user, error = change_user_role(
            user,
            target_user_id,
            new_role
        )

        if error == "Invalid role":

            return response(
                400,
                {
                    "message":
                        "Role must be employee, manager, or admin"
                }
            )

        if error == "User not found":

            return response(
                404,
                {
                    "message":
                        "User not found"
                }
            )

        if error == "You cannot change your own role":

            return response(
                400,
                {
                    "message":
                        error
                }
            )

        return response(
            200,
            {

                "message":
                    "User role updated successfully",

                "user": {

                    "userId":
                        updated_user.get(
                            "userId"
                        ),

                    "email":
                        updated_user.get(
                            "email"
                        ),

                    "role":
                        updated_user.get(
                            "role"
                        ),

                },
            }
        )

    # ========================================================
    # POST /invites
    # ========================================================

    if (
        method == "POST"
        and path == "/invites"
    ):

        if not check_permission(
            user,
            "INVITE"
        ):

            return response(
                403,
                {
                    "message":
                        "Only an admin can invite members"
                }
            )

        data = get_body(
            event
        )

        if data is None:

            return response(
                400,
                {
                    "message":
                        "Invalid JSON body"
                }
            )

        email = normalize_email(
            data.get("email")
        )

        invite_role = str(
            data.get(
                "role",
                ""
            )
        ).strip().lower()

        if not email:

            return response(
                400,
                {
                    "message":
                        "Email address is required"
                }
            )

        # Admin can invite Admin, Manager or Employee.
        if invite_role not in {
            "admin",
            "manager",
            "employee",
        }:

            return response(
                400,
                {
                    "message":
                        "Role must be admin, manager or employee"
                }
            )

        invitation, error = create_invitation(
            user,
            email,
            invite_role
        )

        if error:

            return response(
                400,
                {
                    "message":
                        error
                }
            )

        sent, invite_error = send_cognito_invitation(
            email,
            invite_role
        )

        if not sent:

            return response(
                400,
                {
                    "message":
                        invite_error
                }
            )

        return response(
            201,
            {

                "message":
                    "Invitation sent successfully",

                "invitation": {

                    "email":
                        invitation.get(
                            "email"
                        ),

                    "role":
                        invitation.get(
                            "role"
                        ),

                    "status":
                        invitation.get(
                            "status"
                        ),

                    "createdAt":
                        invitation.get(
                            "createdAt"
                        ),

                },
            }
        )

    # ========================================================
    # GET /documents
    # ========================================================

    if (
        method == "GET"
        and path == "/documents"
    ):

        if not check_permission(
            user,
            "GET"
        ):

            return response(
                403,
                {
                    "message":
                        "Forbidden"
                }
            )

        documents = get_documents(
            user
        )

        return response(
            200,
            {
                "documents":
                    documents
            }
        )

    # ========================================================
    # POST /documents/upload-url
    # ========================================================

    if (
        method == "POST"
        and path == "/documents/upload-url"
    ):

        if not check_permission(
            user,
            "DOCUMENT_UPLOAD"
        ):

            return response(
                403,
                {
                    "message":
                        "Only admins and managers can upload documents"
                }
            )

        data = get_body(
            event
        )

        if data is None:

            return response(
                400,
                {
                    "message":
                        "Invalid JSON body"
                }
            )

        file_name = str(
            data.get(
                "fileName",
                ""
            )
        ).strip()

        content_type = str(
            data.get(
                "contentType",
                "application/octet-stream"
            )
        ).strip()

        if not file_name:

            return response(
                400,
                {
                    "message":
                        "File name is required"
                }
            )

        extension = (
            file_name.lower()
            .split(".")[-1]
        )

        if extension not in {
            "pdf",
            "docx",
            "txt",
        }:

            return response(
                400,
                {
                    "message":
                        "Only PDF, DOCX and TXT files are supported"
                }
            )

        document_id = str(
            uuid.uuid4()
        )

        object_key = (
            f"{user.get('orgId')}/"
            f"{document_id}/"
            f"{file_name}"
        )

        try:

            upload_url = s3.generate_presigned_url(

                "put_object",

                Params={

                    "Bucket":
                        DOCUMENT_BUCKET,

                    "Key":
                        object_key,

                    "ContentType":
                        content_type,

                },

                ExpiresIn=900,
            )

        except Exception as error:

            print(
                "Presigned URL error:",
                str(error)
            )

            return response(
                500,
                {
                    "message":
                        "Unable to create upload URL"
                }
            )

        document = {

            "PK":
                f"DOCUMENT#{document_id}",

            "SK":
                "DOCUMENT",

            "documentId":
                document_id,

            "orgId":
                user.get("orgId"),

            "fileName":
                file_name,

            "contentType":
                content_type,

            "objectKey":
                object_key,

            "uploadedBy":
                user.get("userId"),

            "uploadedByEmail":
                user.get("email"),

            "createdAt":
                now_iso(),

            "status":
                "uploading",

            "chunkCount":
                0,
        }

        table.put_item(
            Item=document
        )

        return response(
            200,
            {

                "documentId":
                    document_id,

                "uploadUrl":
                    upload_url,

                "objectKey":
                    object_key,

            }
        )

    # ========================================================
    # POST /documents/{documentId}/complete
    # ========================================================

    if (
        method == "POST"
        and path.startswith(
            "/documents/"
        )
        and path.endswith(
            "/complete"
        )
    ):

        if not check_permission(
            user,
            "DOCUMENT_UPLOAD"
        ):

            return response(
                403,
                {
                    "message":
                        "Only admins and managers can upload documents"
                }
            )

        parts = path.strip(
            "/"
        ).split("/")

        if len(parts) != 3:

            return response(
                400,
                {
                    "message":
                        "Invalid document path"
                }
            )

        document_id = parts[1]

        document = get_document(
            document_id,
            user.get("orgId")
        )

        if not document:

            return response(
                404,
                {
                    "message":
                        "Document not found"
                }
            )

        try:

            s3_object = s3.get_object(

                Bucket=DOCUMENT_BUCKET,

                Key=document.get(
                    "objectKey"
                )

            )

            file_bytes = s3_object[
                "Body"
            ].read()

            text = extract_text(

                file_bytes,

                document.get(
                    "fileName",
                    ""
                ),

                document.get(
                    "contentType",
                    ""
                )

            )

            if not text:

                return response(
                    400,
                    {
                        "message":
                            "No readable text was found in the document"
                    }
                )

            chunks = chunk_text(
                text
            )

            if not chunks:

                return response(
                    400,
                    {
                        "message":
                            "Unable to create document chunks"
                    }
                )

            # ------------------------------------------------
            # Remove old chunks for this document.
            # ------------------------------------------------

            old_chunks_kwargs = {

                "FilterExpression": (
                    "begins_with(PK, :prefix) "
                    "AND documentId = :document"
                ),

                "ExpressionAttributeValues": {

                    ":prefix":
                        "CHUNK#",

                    ":document":
                        document_id,

                },

            }

            while True:

                old_chunks = table.scan(
                    **old_chunks_kwargs
                )

                for old_chunk in old_chunks.get(
                    "Items",
                    []
                ):

                    table.delete_item(

                        Key={

                            "PK":
                                old_chunk["PK"],

                            "SK":
                                old_chunk["SK"],

                        }

                    )

                last_key = old_chunks.get(
                    "LastEvaluatedKey"
                )

                if not last_key:
                    break

                old_chunks_kwargs[
                    "ExclusiveStartKey"
                ] = last_key

            # ------------------------------------------------
            # Store new chunks.
            # ------------------------------------------------

            for index, chunk in enumerate(
                chunks
            ):

                chunk_id = str(
                    uuid.uuid4()
                )

                table.put_item(

                    Item={

                        "PK":
                            f"CHUNK#{chunk_id}",

                        "SK":
                            "CHUNK",

                        "chunkId":
                            chunk_id,

                        "documentId":
                            document_id,

                        "documentName":
                            document.get(
                                "fileName"
                            ),

                        "orgId":
                            document.get(
                                "orgId"
                            ),

                        "chunkIndex":
                            index,

                        "text":
                            chunk,

                    }

                )

            document["status"] = "ready"

            document["chunkCount"] = len(
                chunks
            )

            document["updatedAt"] = now_iso()

            table.put_item(
                Item=document
            )

            return response(
                200,
                {

                    "message":
                        "Document processed successfully",

                    "document": {

                        "documentId":
                            document_id,

                        "fileName":
                            document.get(
                                "fileName"
                            ),

                        "chunkCount":
                            len(chunks),

                        "status":
                            "ready",

                    },

                }
            )

        except ValueError as error:

            return response(
                400,
                {
                    "message":
                        str(error)
                }
            )

        except Exception as error:

            print(
                "Document processing error:",
                str(error)
            )

            document["status"] = "failed"

            document["error"] = str(
                error
            )

            table.put_item(
                Item=document
            )

            return response(
                500,
                {
                    "message":
                        "Document processing failed"
                }
            )

    # ========================================================
    # DELETE /documents/{documentId}
    # ========================================================

    if (
        method == "DELETE"
        and path.startswith(
            "/documents/"
        )
    ):

        if not check_permission(
            user,
            "DOCUMENT_DELETE"
        ):

            return response(
                403,
                {
                    "message":
                        "Only an admin can delete documents"
                }
            )

        document_id = path.split(
            "/"
        )[-1]

        document = get_document(
            document_id,
            user.get("orgId")
        )

        if not document:

            return response(
                404,
                {
                    "message":
                        "Document not found"
                }
            )

        # ----------------------------------------------------
        # Delete S3 object
        # ----------------------------------------------------

        try:

            s3.delete_object(

                Bucket=DOCUMENT_BUCKET,

                Key=document.get(
                    "objectKey"
                )

            )

        except Exception as error:

            print(
                "S3 delete error:",
                str(error)
            )

        # ----------------------------------------------------
        # Delete all chunks for document
        # ----------------------------------------------------

        chunks_kwargs = {

            "FilterExpression": (
                "begins_with(PK, :prefix) "
                "AND documentId = :document"
            ),

            "ExpressionAttributeValues": {

                ":prefix":
                    "CHUNK#",

                ":document":
                    document_id,

            },

        }

        while True:

            chunks_result = table.scan(
                **chunks_kwargs
            )

            for chunk in chunks_result.get(
                "Items",
                []
            ):

                table.delete_item(

                    Key={

                        "PK":
                            chunk["PK"],

                        "SK":
                            chunk["SK"],

                    }

                )

            last_key = chunks_result.get(
                "LastEvaluatedKey"
            )

            if not last_key:
                break

            chunks_kwargs[
                "ExclusiveStartKey"
            ] = last_key

        # ----------------------------------------------------
        # Delete document metadata
        # ----------------------------------------------------

        table.delete_item(

            Key={

                "PK":
                    f"DOCUMENT#{document_id}",

                "SK":
                    "DOCUMENT",

            }

        )

        return response(
            200,
            {
                "message":
                    "Document deleted successfully"
            }
        )

    # ========================================================
    # POST /qa
    # ========================================================

    if (
        method == "POST"
        and path == "/qa"
    ):

        if not check_permission(
            user,
            "QA"
        ):

            return response(
                403,
                {
                    "message":
                        "You do not have permission to ask questions"
                }
            )

        data = get_body(
            event
        )

        if data is None:

            return response(
                400,
                {
                    "message":
                        "Invalid JSON body"
                }
            )

        question = str(
            data.get(
                "question",
                ""
            )
        ).strip()

        if not question:

            return response(
                400,
                {
                    "message":
                        "Question is required"
                }
            )

        # ----------------------------------------------------
        # Selected document from frontend
        # ----------------------------------------------------

        document_id = str(
            data.get(
                "documentId",
                ""
            )
        ).strip()

        # ----------------------------------------------------
        # Verify selected document
        # ----------------------------------------------------

        if document_id:

            selected_document = get_document(

                document_id,

                user.get(
                    "orgId"
                )

            )

            if not selected_document:

                return response(
                    404,
                    {
                        "message":
                            "Selected document was not found"
                    }
                )

            if selected_document.get(
                "status"
            ) != "ready":

                return response(
                    400,
                    {
                        "message":
                            "Selected document is not ready yet"
                    }
                )

        # ----------------------------------------------------
        # Retrieve relevant chunks
        # ----------------------------------------------------

        retrieved = retrieve_chunks(

            question,

            user.get(
                "orgId"
            ),

            limit=5,

            document_id=(
                document_id
                if document_id
                else None
            )

        )

        if not retrieved:

            message = (

                "I couldn't find relevant information "
                "in the selected document."

                if document_id

                else

                "I couldn't find relevant information "
                "in the uploaded documents."

            )

            return response(
                200,
                {

                    "answer":
                        message,

                    "sources":
                        [],

                }
            )

        # ----------------------------------------------------
        # Build AI context
        # ----------------------------------------------------

        context_parts = []

        sources = []

        for item in retrieved:

            context_parts.append(
                item.get(
                    "text",
                    ""
                )
            )

            source_name = item.get(
                "documentName"
            )

            if (
                source_name
                and source_name not in sources
            ):

                sources.append(
                    source_name
                )

        context = "\n\n---\n\n".join(
            context_parts
        )

        # ====================================================
        # GROQ AI ANSWER
        # ====================================================

        try:

            answer = generate_groq_answer(

                question,

                context

            )

        except Exception as error:

            print(
                "Groq error:",
                repr(error)
            )

            return response(
                500,
                {

                    "message":
                        "Unable to generate AI answer",

                    "error":
                        str(error),

                }
            )

        return response(
            200,
            {

                "answer":
                    answer,

                "sources":
                    sources,

            }
        )

    # ========================================================
    # UNKNOWN ROUTE
    # ========================================================

    return response(
        404,
        {
            "message":
                "Route not found"
        }
    )