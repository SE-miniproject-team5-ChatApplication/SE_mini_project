# Scalability (NFR-QA-7)

NFR-QA-7: socket handlers shall be stateless apart from connection maps, so that a Redis
adapter can be added later for multi-instance deployment.

The application runs as one server today. This page lists every piece of in-memory state, says
whether it would still work with several servers behind a load balancer, and what to change
when that is needed. `server/tests/unit/stateless.test.js` fails if new top-level state is
added to the socket gateway, its handlers, the services, the middleware or the utilities, so
this list stays complete.

## What already works with several servers

| Part | Why it works |
|---|---|
| Message delivery, receipts, typing, group updates | Everything is sent to Socket.IO rooms (`user:<id>`, `conv:<id>`) through `io.to(...)`, `socket.to(...)`, `socketsJoin` and `socketsLeave` (`server/src/utils/realtime.js`). A Socket.IO adapter shares rooms between servers, so this code does not change. |
| Socket handlers (`server/src/sockets/handlers/`) | They keep no state between events. The only per-connection item is the queue that keeps one sender's messages in order (REQ-MSG-5), which belongs to that connection. |
| Logged-out tokens, lock-out counters, unread counts, receipts | Stored in MongoDB, which every server shares. |

## In-memory state, and what changes with several servers

| State | Where | With several servers |
|---|---|---|
| Connection map (user id -> open connections) | `presenceService.js` `sessions` | Allowed by NFR-QA-7. Each server counts only its own connections, so a user connected to two servers would be shown offline when one of them closes. Fix when needed: count with `io.in('user:<id>').fetchSockets()` once an adapter is installed, and make sure two connections opening at the same moment still send one "online". |
| Message rate limit (20 per 10 s per user, NFR-SEC-6) | `middleware/rateLimit.js` `createMessageLimiter` | Counted per server, so a user could send 20 per server. Fix: keep the timestamps in Redis. |
| REST rate limit (100 per minute per IP, NFR-SEC-6) | `middleware/rateLimit.js` (express-rate-limit, memory store) | Counted per server. Fix: use a Redis store for express-rate-limit. |
| Uploaded files and avatars | `UPLOAD_DIR` on the server's disk (`services/fileStorage.js`) | Another server cannot serve them. Fix: shared storage (a network drive or object storage). |
| In-process event bus | `utils/eventBus.js` | Events stay inside one server. Nothing listens to them today. |
| Socket.IO server reference | `utils/realtime.js` `io` | One per server; correct with an adapter. |
| Constant lists | `PUBLIC_ROUTES` (auth), `REDACT_PATHS` (logger), `FORBIDDEN` (unsafe keys) | Never change at run time. |

## Adding the Redis adapter later

1. Install Redis and `npm install @socket.io/redis-adapter redis --prefix server`.
2. Add `REDIS_URL` to `server/.env` and `server/.env.example`.
3. In `server/src/sockets/index.js`, after `new Server(...)`, connect two Redis clients and call
   `io.adapter(createAdapter(pubClient, subClient))`.
4. Move the two rate limits to Redis and the uploads to shared storage (table above).
5. Put the servers behind a load balancer with sticky sessions (Socket.IO needs them when
   HTTP long-polling is enabled).

None of this is installed in v1.0, because NFR-QA-7 only asks that it can be added later.
