# Backend Service

Sample backend service with JWT authentication for testing the API gateway.

## Installation

```bash
cd backend-service
npm install
```

## Run

```bash
npm start
```

Service starts on port **5001**.

## Test Users

| Username | Password     | Role  |
|----------|--------------|-------|
| alice    | password123  | admin |
| bob      | password123  | user  |
| charlie  | password123  | user  |

## API Endpoints

### Public Endpoints

#### Health Check
```bash
curl http://localhost:5001/hello
```

#### Login
```bash
curl -X POST http://localhost:5001/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username": "alice", "password": "password123"}'
```

Response:
```json
{
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

### Protected Endpoints

Require `Authorization: Bearer <token>` header.

#### Get All Users
```bash
curl http://localhost:5001/users \
  -H "Authorization: Bearer <token>"
```

#### Get User by ID
```bash
curl http://localhost:5001/users/1 \
  -H "Authorization: Bearer <token>"
```

#### Get Orders
```bash
curl http://localhost:5001/orders \
  -H "Authorization: Bearer <token>"
```

Note: Admin users see all orders, regular users see only their own.

## Testing via Gateway

Start both services:
```bash
# Terminal 1: Backend
cd backend-service
npm start

# Terminal 2: Gateway
cd gateway
npm start
```

### Login via Gateway
```bash
curl -X POST http://localhost:8081/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username": "alice", "password": "password123"}'
```

### Access Protected Endpoints via Gateway
```bash
# Save token from login response
TOKEN="<your-token-here>"

# Get users
curl http://localhost:8081/users \
  -H "Authorization: Bearer $TOKEN"

# Get orders
curl http://localhost:8081/orders \
  -H "Authorization: Bearer $TOKEN"
```

## Features

- ✅ JWT-based authentication
- ✅ Protected endpoints with middleware
- ✅ Role-based access (admin vs user)
- ✅ Realistic latency (50-100ms)
- ✅ Request logging
- ✅ In-memory data store

## JWT Details

- Secret: `dev-secret`
- Expiration: 1 hour
- Payload: `{ userId, username, role }`

## Architecture

```
routes → controllers → services → data
              ↓
         middleware (JWT validation)
```
