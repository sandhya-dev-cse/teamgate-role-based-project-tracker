\# TeamGate



\### Role-Based Project Management System



TeamGate is a cloud-based project management application that provides secure project access based on user roles.



> \*\*“The UI hides, the server denies.”\*\*



Unauthorized actions are hidden from the interface and independently enforced by the backend.



\## Key Features



\- Secure authentication using Amazon Cognito

\- JWT-based authenticated API requests

\- Role-Based Access Control (RBAC)

\- Employee, Manager, and Admin roles

\- Project creation, editing, and deletion

\- Admin-only user role management

\- Server-side authorization

\- Responsive dashboard

\- Dark blue and black modern UI

\- Serverless AWS backend

\- Infrastructure as Code using AWS CDK

\- Production deployment using Vercel



\## Role Permissions



| Feature | Employee | Manager | Admin |

|---|:---:|:---:|:---:|

| View Projects | ✓ | ✓ | ✓ |

| Create Project | — | ✓ | ✓ |

| Edit Project | — | ✓ | ✓ |

| Delete Project | — | — | ✓ |

| View Team | — | — | ✓ |

| Change User Role | — | — | ✓ |



\## Technology Stack



\### Frontend



\- Next.js 15

\- TypeScript

\- React

\- Tailwind CSS

\- AWS Amplify



\### Backend



\- Python

\- AWS Lambda

\- API Gateway HTTP API



\### Authentication



\- Amazon Cognito

\- JWT



\### Database



\- Amazon DynamoDB



\### Infrastructure



\- AWS CDK

\- TypeScript



\### Deployment



\- Vercel

\- AWS



\## Architecture



```text

User

&#x20; ↓

Next.js + TypeScript + Tailwind

&#x20; ↓

AWS Cognito

&#x20; ↓ JWT

API Gateway HTTP API

&#x20; ↓

Python AWS Lambda

&#x20; ↓

Amazon DynamoDB

