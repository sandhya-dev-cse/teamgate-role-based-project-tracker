import json
import os
import uuid
from datetime import datetime, timezone

import boto3


# =============================
# DynamoDB
# =============================

dynamodb = boto3.resource("dynamodb")

table = dynamodb.Table(
    os.environ.get("TABLE_NAME", "TeamGate")
)


# =============================
# Response helper
# =============================

def response(status_code, body):
    return {
        "statusCode": status_code,
        "headers": {
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Headers": "Content-Type,Authorization",
            "Access-Control-Allow-Methods": "GET,POST,PUT,DELETE,OPTIONS",
        },
        "body": json.dumps(body, default=str),
    }


# =============================
# Request helpers
# =============================

def get_method(event):
    return (
        event.get("requestContext", {})
        .get("http", {})
        .get("method", "")
        .upper()
    )


def get_path(event):
    return event.get("rawPath", "/")


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


# =============================
# User helpers
# =============================
def get_current_user(event):
    claims = get_claims(event)

    user_id = claims.get("sub")
    email = claims.get("email")

    if not user_id:
        return None

    result = table.get_item(
        Key={
            "PK": f"USER#{user_id}",
            "SK": "PROFILE",
        }
    )

    user = result.get("Item")

    # Create user automatically on first authenticated request.
    if not user:
        user = {
            "PK": f"USER#{user_id}",
            "SK": "PROFILE",
            "userId": user_id,
            "email": email or "",
            "role": "employee",
            "createdAt": datetime.now(timezone.utc).isoformat(),
        }

        table.put_item(Item=user)

    return user


# =============================
# Permissions
# =============================

ROLE_PERMISSIONS = {
    "employee": {
        "GET": True,
        "POST": False,
        "PUT": False,
        "DELETE": False,
        "ROLE_CHANGE": False,
    },

    "manager": {
        "GET": True,
        "POST": True,
        "PUT": True,
        "DELETE": False,
        "ROLE_CHANGE": False,
    },

    "admin": {
        "GET": True,
        "POST": True,
        "PUT": True,
        "DELETE": True,
        "ROLE_CHANGE": True,
    },
}


def check_permission(user, action):
    role = user.get("role", "employee").lower()

    permissions = ROLE_PERMISSIONS.get(role)

    if not permissions:
        return False

    return permissions.get(action, False)


# =============================
# Project functions
# =============================

def get_projects():
    result = table.scan(
        FilterExpression="begins_with(PK, :prefix)",
        ExpressionAttributeValues={
            ":prefix": "PROJECT#"
        },
    )

    return result.get("Items", [])


def create_project(user, data):
    name = str(data.get("name", "")).strip()
    description = str(data.get("description", "")).strip()
    status = str(data.get("status", "active")).strip()

    if not name:
        return None

    project_id = str(uuid.uuid4())
    now = datetime.now(timezone.utc).isoformat()

    project = {
        "PK": f"PROJECT#{project_id}",
        "SK": "PROJECT",
        "projectId": project_id,
        "name": name,
        "description": description,
        "status": status,
        "createdBy": user["userId"],
        "createdAt": now,
        "updatedAt": now,
    }

    table.put_item(Item=project)

    return project


def update_project(project_id, data):
    result = table.get_item(
        Key={
            "PK": f"PROJECT#{project_id}",
            "SK": "PROJECT",
        }
    )

    project = result.get("Item")

    if not project:
        return None

    if "name" in data:
        name = str(data["name"]).strip()

        if name:
            project["name"] = name

    if "description" in data:
        project["description"] = str(data["description"]).strip()

    if "status" in data:
        project["status"] = str(data["status"]).strip()

    project["updatedAt"] = datetime.now(timezone.utc).isoformat()

    table.put_item(Item=project)

    return project


def delete_project(project_id):
    result = table.get_item(
        Key={
            "PK": f"PROJECT#{project_id}",
            "SK": "PROJECT",
        }
    )

    if "Item" not in result:
        return False

    table.delete_item(
        Key={
            "PK": f"PROJECT#{project_id}",
            "SK": "PROJECT",
        }
    )

    return True


# =============================
# User management functions
# =============================

def get_users():
    result = table.scan(
        FilterExpression="begins_with(PK, :prefix)",
        ExpressionAttributeValues={
            ":prefix": "USER#"
        },
    )

    users = []

    for item in result.get("Items", []):
        users.append({
            "userId": item.get("userId"),
            "email": item.get("email"),
            "role": item.get("role", "employee"),
            "createdAt": item.get("createdAt"),
        })

    return users


def change_user_role(user_id, new_role):
    new_role = str(new_role).lower().strip()

    allowed_roles = {
        "employee",
        "manager",
        "admin",
    }

    if new_role not in allowed_roles:
        return None, "Invalid role"

    result = table.get_item(
        Key={
            "PK": f"USER#{user_id}",
            "SK": "PROFILE",
        }
    )

    user = result.get("Item")

    if not user:
        return None, "User not found"

    user["role"] = new_role
    user["updatedAt"] = datetime.now(timezone.utc).isoformat()

    table.put_item(Item=user)

    return user, None


# =============================
# Lambda handler
# =============================

def lambda_handler(event, context):

    print("TeamGate Lambda received event:")
    print(json.dumps(event))

    method = get_method(event)
    path = get_path(event)

    # -------------------------
    # CORS
    # -------------------------

    if method == "OPTIONS":
        return response(204, {})

    # -------------------------
    # Authentication
    # -------------------------

    user = get_current_user(event)

    if not user:
        return response(
            401,
            {
                "message": "Unauthorized"
            }
        )

    role = user.get("role", "employee").lower()

    print(f"User: {user.get('email')}")
    print(f"Role: {role}")
    print(f"Method: {method}")
    print(f"Path: {path}")

    # =========================
    # GET /me
    # =========================

    if method == "GET" and path == "/me":

        return response(
            200,
            {
                "userId": user.get("userId"),
                "email": user.get("email"),
                "role": role,
            },
        )

    # =========================
    # GET /projects
    # =========================

    if method == "GET" and path == "/projects":

        if not check_permission(user, "GET"):
            return response(
                403,
                {
                    "message": "Forbidden"
                }
            )

        projects = get_projects()

        return response(
            200,
            {
                "projects": projects
            }
        )

    # =========================
    # POST /projects
    # =========================

    if method == "POST" and path == "/projects":

        if not check_permission(user, "POST"):
            return response(
                403,
                {
                    "message": "Forbidden"
                }
            )

        data = get_body(event)

        if data is None:
            return response(
                400,
                {
                    "message": "Invalid JSON body"
                }
            )

        project = create_project(user, data)

        if not project:
            return response(
                400,
                {
                    "message": "Project name is required"
                }
            )

        return response(
            201,
            project
        )

    # =========================
    # PUT /projects/{projectId}
    # =========================

    if method == "PUT" and path.startswith("/projects/"):

        if not check_permission(user, "PUT"):
            return response(
                403,
                {
                    "message": "Forbidden"
                }
            )

        project_id = path.split("/")[-1]

        if not project_id:
            return response(
                400,
                {
                    "message": "Project ID is required"
                }
            )

        data = get_body(event)

        if data is None:
            return response(
                400,
                {
                    "message": "Invalid JSON body"
                }
            )

        project = update_project(project_id, data)

        if not project:
            return response(
                404,
                {
                    "message": "Project not found"
                }
            )

        return response(
            200,
            project
        )

    # =========================
    # DELETE /projects/{projectId}
    # =========================

    if method == "DELETE" and path.startswith("/projects/"):

        if not check_permission(user, "DELETE"):
            return response(
                403,
                {
                    "message": "Forbidden"
                }
            )

        project_id = path.split("/")[-1]

        if not project_id:
            return response(
                400,
                {
                    "message": "Project ID is required"
                }
            )

        deleted = delete_project(project_id)

        if not deleted:
            return response(
                404,
                {
                    "message": "Project not found"
                }
            )

        return response(
            200,
            {
                "message": "Project deleted successfully"
            }
        )

    # =========================
    # GET /users
    # =========================

    if method == "GET" and path == "/users":

        if not check_permission(user, "ROLE_CHANGE"):
            return response(
                403,
                {
                    "message": "Only an admin can view users"
                }
            )

        users = get_users()

        return response(
            200,
            {
                "users": users
            }
        )

    # =========================
    # PUT /users/{userId}/role
    # =========================

    if method == "PUT" and path.startswith("/users/") and path.endswith("/role"):

        if not check_permission(user, "ROLE_CHANGE"):
            return response(
                403,
                {
                    "message": "Only an admin can change roles"
                }
            )

        parts = path.strip("/").split("/")

        if len(parts) != 3:
            return response(
                400,
                {
                    "message": "Invalid user role path"
                }
            )

        target_user_id = parts[1]

        data = get_body(event)

        if data is None:
            return response(
                400,
                {
                    "message": "Invalid JSON body"
                }
            )

        new_role = data.get("role")

        if not new_role:
            return response(
                400,
                {
                    "message": "Role is required"
                }
            )

        updated_user, error = change_user_role(
            target_user_id,
            new_role
        )

        if error == "Invalid role":
            return response(
                400,
                {
                    "message": "Role must be employee, manager, or admin"
                }
            )

        if error == "User not found":
            return response(
                404,
                {
                    "message": "User not found"
                }
            )

        return response(
            200,
            {
                "message": "User role updated successfully",
                "user": {
                    "userId": updated_user.get("userId"),
                    "email": updated_user.get("email"),
                    "role": updated_user.get("role"),
                },
            }
        )

    # =========================
    # Unknown route
    # =========================

    return response(
        404,
        {
            "message": "Route not found"
        }
    )