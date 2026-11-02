
# Socket.IO Event Documentation

This document describes the real-time communication events implemented in the Team 5 Chat Application using Socket.IO.

## 1. Connection and Authentication

The application uses Socket.IO for real-time communication between clients and the server.

A valid JWT access token must be supplied during the Socket.IO handshake.

### Client connection example

```javascript
const socket = io('http://localhost:5000', {
  auth: {
    token: '<JWT_ACCESS_TOKEN>',
  },
});
```

The server validates the token before accepting the connection.

If the token is missing, invalid, expired or revoked, the connection is rejected with a `connect_error` containing the `UNAUTHENTICATED` error code.

### Successful connection

After authentication, the server:

1. Identifies the authenticated user.
2. Joins the socket to the user's personal room.
3. Joins the socket to each conversation room of which the user is a member.
4. Runs the registered connection handlers.
5. Emits `session:ready`.

### Room naming

| Room | Purpose |
|---|---|
| `user:<userId>` | All active connections belonging to a particular user |
| `conv:<conversationId>` | All connected members of a conversation |

These rooms allow messages, receipts, presence and group updates to be delivered to the correct users.

## 2. Client-to-Server Events

These events are sent by the React client to the Socket.IO server.

| Event | Payload | Acknowledgement | Requirement |
|---|---|---|---|
| `message:send` | `{conversationId, content, clientMsgId, attachmentId?}` | Success or failure response | REQ-MSG-1 to REQ-MSG-5, REQ-MSG-7 |
| `message:delete` | `{messageId}` | Success or failure response | REQ-MSG-8 |
| `message:delivered` | `{messageId}` | None | REQ-RCP-2 |
| `message:read` | `{conversationId}` or `{messageId}` | None | REQ-RCP-3 |
| `typing:start` | `{conversationId}` | None | REQ-PRS-3 |
| `typing:stop` | `{conversationId}` | None | REQ-PRS-3 |

### 2.1 message:send

Used to send a new message to a direct or group conversation.

Example payload:

```json
{
  "conversationId": "CONVERSATION_ID",
  "content": "Hello everyone!",
  "clientMsgId": "unique-client-message-id"
}
```

An optional `attachmentId` can be supplied for a file attachment.

The server verifies conversation membership and saves the message before broadcasting it.

Success acknowledgement:

```json
{
  "ok": true,
  "clientMsgId": "unique-client-message-id",
  "messageId": "MESSAGE_ID",
  "status": "sent",
  "sentAt": "2026-11-02T10:00:00.000Z",
  "message": {}
}
```

Failure acknowledgement:

```json
{
  "ok": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "Error description"
  }
}
```

The successful message is also acknowledged to the sending socket through `message:ack`.

### 2.2 message:delete

Used to delete a message sent by the authenticated user.

Example:

```json
{
  "messageId": "MESSAGE_ID"
}
```

Success acknowledgement:

```json
{
  "ok": true,
  "messageId": "MESSAGE_ID",
  "conversationId": "CONVERSATION_ID"
}
```

A deleted message is replaced with a deleted-message representation for conversation participants.

### 2.3 message:delivered

Used by the recipient's client to acknowledge that a message has been received.

Example:

```json
{
  "messageId": "MESSAGE_ID"
}
```

The server updates the delivery receipt and recalculates the message status.

### 2.4 message:read

Used when a recipient reads messages.

Mark a conversation's unread messages as read:

```json
{
  "conversationId": "CONVERSATION_ID"
}
```

Alternatively, mark a specific message as read:

```json
{
  "messageId": "MESSAGE_ID"
}
```

When a conversation ID is provided, the server also resets the authenticated member's unread count.

### 2.5 typing:start and typing:stop

Used to indicate that a user has started or stopped typing in a conversation.

Example:

```json
{
  "conversationId": "CONVERSATION_ID"
}
```

Only conversation members can send valid typing updates.

## 3. Server-to-Client Events

These events are emitted by the Socket.IO server to connected clients.

| Event | Payload | Recipient | Requirement |
|---|---|---|---|
| `session:ready` | `{userId}` | Newly connected socket | REQ-AUTH-7 |
| `message:ack` | `{clientMsgId, messageId, status, sentAt}` | Sending socket | REQ-MSG-3 |
| `message:new` | Serialized message object | Other conversation sockets and reconnecting recipients with pending messages | REQ-MSG-2, REQ-MSG-6 |
| `message:deleted` | `{messageId, conversationId}` | Conversation room | REQ-MSG-8 |
| `receipt:update` | `{messageId, conversationId, status, userId}` | Original message sender | REQ-RCP-4 |
| `presence:update` | `{userId, status, lastSeen?}` | User's contacts | REQ-PRS-1, REQ-PRS-2, REQ-PRS-4 |
| `typing:update` | `{conversationId, userId, typing}` | Other conversation members | REQ-PRS-3 |
| `group:update` | `{groupId, type, group}` | Group members and relevant removed members | REQ-GRP-1, REQ-GRP-2 |
| `error:event` | Error details and originating event | Socket that caused the error | NFR-SAFE-4 |

### 3.1 session:ready

Sent after successful authentication and socket room setup.

Example:

```json
{
  "userId": "USER_ID"
}
```

### 3.2 message:ack

Sent to the sending socket when a message has been successfully stored.

Example:

```json
{
  "clientMsgId": "unique-client-message-id",
  "messageId": "MESSAGE_ID",
  "status": "sent",
  "sentAt": "2026-11-02T10:00:00.000Z"
}
```

### 3.3 message:new

Sent when a new message is available to other connected conversation participants.

It is also used to deliver pending messages when an offline user reconnects.

The payload is the serialized message object.

### 3.4 message:deleted

Broadcast after a message has been successfully deleted.

Example:

```json
{
  "messageId": "MESSAGE_ID",
  "conversationId": "CONVERSATION_ID"
}
```

### 3.5 receipt:update

Sent to the original message sender when a recipient's delivery or read receipt changes the overall message status.

Example:

```json
{
  "messageId": "MESSAGE_ID",
  "conversationId": "CONVERSATION_ID",
  "status": "delivered",
  "userId": "RECIPIENT_USER_ID"
}
```

Possible message statuses include:

- `sent`
- `delivered`
- `read`
- `deleted`

### 3.6 presence:update

Sent when a user's online status changes.

Online example:

```json
{
  "userId": "USER_ID",
  "status": "online"
}
```

Offline example:

```json
{
  "userId": "USER_ID",
  "status": "offline",
  "lastSeen": "2026-11-02T10:00:00.000Z"
}
```

The server tracks multiple active connections, so a user is considered offline only after their last active connection closes.

### 3.7 typing:update

Sent to the other members of a conversation when someone starts or stops typing.

Example:

```json
{
  "conversationId": "CONVERSATION_ID",
  "userId": "USER_ID",
  "typing": true
}
```

The `typing` property is `true` while the user is typing and `false` when typing stops.

### 3.8 group:update

Sent to group members when group information or membership changes.

Example:

```json
{
  "groupId": "GROUP_ID",
  "type": "member_added",
  "group": {
    "id": "GROUP_ID",
    "type": "group",
    "name": "Project Team",
    "members": []
  }
}
```

The `type` property identifies the change.

Supported group update types:

| Type | Meaning |
|---|---|
| `created` | A group was created |
| `member_added` | A member was added |
| `member_removed` | A member was removed |
| `renamed` | The group name changed |
| `admin_promoted` | A member was promoted to admin |
| `member_left` | A member left the group |

The update is sent to current members and, where relevant, users who have just been removed or left.

### 3.9 error:event

Used to report an error associated with a client socket event.

Example:

```json
{
  "code": "ERROR_CODE",
  "message": "Error description",
  "event": "message:send"
}
```

The error payload may include additional information depending on the error.

## 4. Event Acknowledgements and Error Handling

Some client-to-server events use Socket.IO acknowledgement callbacks.

- `message:send` returns a success or failure acknowledgement.
- `message:delete` returns a success or failure acknowledgement.
- Other listed client events do not use acknowledgement callbacks.

The server also emits `error:event` when a handled socket operation fails or a socket event is rejected by the relevant protection middleware.

## 5. Reliability and Security

The Socket.IO implementation includes the following protections:

- JWT authentication during the connection handshake.
- Rejection of revoked authentication tokens.
- Conversation membership validation before sending messages.
- Authorization checks for message deletion and receipt updates.
- A per-user message rate limit of 20 messages per 10 seconds.
- Unsafe socket payload protection.
- Isolation of conversations using Socket.IO rooms.
- Automatic delivery of pending messages after reconnection.
- Per-connection message sequencing to preserve message order.

## 6. Notification Preferences

Unread message counts are maintained by the server's notification service.

Notification mute preferences are managed using the REST endpoint:

```http
PUT /api/conversations/:id/mute
```

The request body is:

```json
{
  "muted": true
}
```

The mute preference belongs to the authenticated conversation member.

The current implementation does not expose a `notification:unread` Socket.IO event. Unread counts are obtained through the conversation REST response.

## 7. Related Documentation

- [REST API Documentation](API.md)
- [Project README](../README.md)
- [Test Plan Traceability](TRACEABILITY.md)
