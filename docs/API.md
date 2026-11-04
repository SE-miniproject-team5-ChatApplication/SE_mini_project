
# REST API Documentation

This document describes the REST API endpoints implemented by the Team 5 Chat Application.

## 1. Base URLs

| Environment | Base URL |
|---|---|
| Backend | `http://localhost:5000/api` |
| Frontend development proxy | `http://localhost:5173/api` |

All request and response bodies use JSON unless an endpoint explicitly requires `multipart/form-data`.

## 2. Authentication

All endpoints require a valid JWT access token except:

- `POST /api/auth/register`
- `POST /api/auth/login`
- `GET /api/health`

For protected endpoints, include the token in the request header:

```http
Authorization: Bearer <token>
```

## 3. Authentication Endpoints

| Method | Endpoint | Request body | Success response | Requirement |
|---|---|---|---|---|
| POST | `/auth/register` | `{username, email, password}` | `201` - `{userId, username}` | REQ-AUTH-1, REQ-AUTH-2 |
| POST | `/auth/login` | `{identifier, password}` | `200` - `{token, expiresIn, user}` | REQ-AUTH-4, REQ-AUTH-5 |
| POST | `/auth/logout` | None | `204 No Content` | REQ-AUTH-6 |
| PUT | `/auth/password` | `{currentPassword, newPassword}` | `204 No Content` | REQ-PRO-5 |

The login identifier can be either a username or an email address.

## 4. User and Profile Endpoints

All user endpoints require authentication.

| Method | Endpoint | Request body / query | Success response | Requirement |
|---|---|---|---|---|
| GET | `/users/me` | None | `200` - Current user profile | REQ-PRO-1 |
| PUT | `/users/me` | `{displayName?, statusMessage?}` | `200` - Updated profile | REQ-PRO-1 |
| DELETE | `/users/me` | `{password}` | `204 No Content` | NFR-SEC-7 |
| POST | `/users/me/avatar` | Multipart field `avatar` | `200` - `{avatarUrl}` | REQ-PRO-2 |
| GET | `/users/:id/avatar` | User ID in URL | Image file | REQ-PRO-2 |
| GET | `/users/search?q=` | Search query `q` | `200` - Matching users | REQ-PRO-3 |

### Avatar upload

Upload an avatar using `multipart/form-data` with the field name `avatar`.

The maximum avatar size is 2 MB.

## 5. Contacts Endpoints

All contact endpoints require authentication.

| Method | Endpoint | Request body | Success response | Requirement |
|---|---|---|---|---|
| GET | `/contacts` | None | `200` - Contact list | REQ-PRO-4 |
| POST | `/contacts` | `{contactUserId}` | `201` - Created contact | REQ-PRO-4 |
| DELETE | `/contacts/:id` | Contact ID in URL | `204 No Content` | REQ-PRO-4 |

## 6. Conversation and Message History Endpoints

All conversation endpoints require authentication.

| Method | Endpoint | Request body / query | Success response | Requirement |
|---|---|---|---|---|
| POST | `/conversations/direct` | `{userId}` | `200` - Direct conversation | REQ-MSG-1 |
| GET | `/conversations` | None | `200` - Conversation list | REQ-HIS-1, REQ-NOT-1 |
| GET | `/conversations/:id/messages` | `before`, optional `limit` | `200` - Paginated messages | REQ-HIS-2, REQ-HIS-4 |
| PUT | `/conversations/:id/mute` | `{muted: true}` or `{muted: false}` | `204 No Content` | REQ-NOT-4 |
| GET | `/messages/:id/receipts` | Message ID in URL | `200` - Delivery and read status of each current member (sender only, others get `403`) | REQ-RCP-5 |

### Direct conversation

The `POST /conversations/direct` endpoint accepts the user ID of the contact with whom the current user wants to start a direct conversation.

### Message history pagination

The messages endpoint supports pagination using the `before` query parameter, which identifies the message before which older messages should be fetched.

Example:

```http
GET /api/conversations/CONVERSATION_ID/messages?before=MESSAGE_ID
```

The endpoint returns paginated message data, including whether more messages are available.

### Notification mute preference

A conversation member can enable or disable notifications for that conversation.

Example request:

```http
PUT /api/conversations/CONVERSATION_ID/mute
Authorization: Bearer <token>
Content-Type: application/json

{
  "muted": true
}
```

The `muted` field must be a Boolean value. The preference belongs to the authenticated conversation member.

## 7. Message Search Endpoint

| Method | Endpoint | Request query | Success response | Requirement |
|---|---|---|---|---|
| GET | `/search?q=&conversationId=` | Search term `q`, optional `conversationId` | `200` - Matching messages | REQ-HIS-3, REQ-HIS-4 |

Example:

```http
GET /api/search?q=meeting
```

To search inside one conversation:

```http
GET /api/search?q=meeting&conversationId=CONVERSATION_ID
```

## 8. Group Endpoints

All group endpoints require authentication. Operations that modify an existing group enforce the relevant group membership and administrator permissions.

| Method | Endpoint | Request body | Success response | Requirement |
|---|---|---|---|---|
| POST | `/groups` | `{name, memberIds[]}` | `201` - Created group | REQ-GRP-1 |
| GET | `/groups/:id` | Group ID in URL | `200` - Group details and members | REQ-GRP-2 |
| PUT | `/groups/:id` | `{name}` | `200` - Updated group | REQ-GRP-2 |
| POST | `/groups/:id/members` | `{userId}` | `200` - Updated group | REQ-GRP-2, REQ-GRP-6 |
| DELETE | `/groups/:id/members/:userId` | IDs in URL | `200` - Updated group | REQ-GRP-2, REQ-GRP-6 |
| POST | `/groups/:id/admins` | `{userId}` | `200` - Updated group | REQ-GRP-2 |
| POST | `/groups/:id/leave` | None | `204 No Content` | REQ-GRP-4, REQ-GRP-6 |

## 9. File Upload and Download Endpoints

All file endpoints require authentication.

| Method | Endpoint | Request body | Success response | Requirement |
|---|---|---|---|---|
| POST | `/files` | Multipart fields `file` and `conversationId` | `201` - Attachment details | REQ-FIL-1, REQ-FIL-2, REQ-FIL-5 |
| GET | `/files/:id` | Attachment ID in URL | File download | REQ-FIL-4, NFR-SAFE-3 |

### File upload

Use `multipart/form-data` with:

- `file`: The file being uploaded.
- `conversationId`: The conversation where the file will be shared.

The maximum file size is 10 MB. Only supported file types are accepted.

### File download

Only authorized conversation participants can download an attachment.

The download response includes security headers such as:

- `Content-Disposition: attachment`
- `X-Content-Type-Options: nosniff`
- `Cache-Control: private, no-store`

## 10. Presence Endpoint

| Method | Endpoint | Request query | Success response | Requirement |
|---|---|---|---|---|
| GET | `/presence?ids=` | Comma-separated user IDs | `200` - Presence information | REQ-PRS-1, REQ-PRS-2 |

Example:

```http
GET /api/presence?ids=USER_ID_1,USER_ID_2
```

The endpoint returns the current online status and last-seen information for the requested users.

A maximum of 200 user IDs can be supplied.

## 11. Health Check Endpoint

This endpoint does not require authentication.

| Method | Endpoint | Request | Success response |
|---|---|---|---|
| GET | `/health` | None | `200` - Server health information |

Example response:

```json
{
  "status": "ok",
  "db": "connected",
  "time": "2026-11-02T10:00:00.000Z",
  "uptimeSeconds": 120
}
```

The actual `db` value is supplied by the database-state utility.

## 12. Error Handling

The API uses a shared error-handling middleware to return structured application errors.

Common HTTP status codes include:

| Status | Meaning |
|---|---|
| 400 | Invalid or missing request data |
| 401 | Authentication required or invalid |
| 403 | Access forbidden |
| 404 | Resource or route not found |
| 409 | Resource conflict |
| 413 | Uploaded file exceeds the size limit |
| 415 | Unsupported file type |
| 423 | Account locked |
| 429 | Rate limit exceeded |
| 500 | Unexpected server error |

The exact error code and message depend on the endpoint and the error raised by the application.

## 13. Related Documentation

- [Socket.IO Events](SOCKET_EVENTS.md)
- [Test Plan Traceability](TRACEABILITY.md)
