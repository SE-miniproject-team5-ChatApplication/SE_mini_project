# Performance load tests (NFR-PERF-1, NFR-PERF-2, TC-PERF-01)

- NFR-PERF-1: with 100 concurrent users, 95 % of messages reach the online recipient within 500 ms.
- NFR-PERF-2: the server supports at least 200 simultaneous WebSocket connections without message loss.

## Message latency (NFR-PERF-1)

## How to run it

1. Start the server (`npm run dev --prefix server`, or `npm start` in `server`).
2. In a second terminal: `npm run perf:latency --prefix server`

The script uses the database and `JWT_SECRET` from `server/.env`, creates 100 test users
(`perf_...`) in 50 direct chats, opens one connection per user and removes every test user
afterwards. Options: `--users 100`, `--messages 6`, `--interval 5000` (one message per user
every 5 s). Keep `--interval` at 500 or more, because the server allows 20 messages per 10 s
per user (NFR-SEC-6).

## Load model

The SRS gives no message rate. Each user sends one message every 5 seconds, and the sends are
spread evenly over those 5 seconds, because real users do not press Send at the same moment.
Latency is measured from the send to the message arriving on the recipient's connection
(rendering on screen adds a few milliseconds in the browser).

## Results (4 Nov 2026, commit on `feature/NFR-PERF-1-latency-load-test`)

Server, MongoDB 8.2 and all 100 simulated users ran on one Windows laptop (Node 22), with a
freshly started server for each set of runs.

| Users | Each user sends | Messages | Received | p50 | p95 | Result |
|---|---|---|---|---|---|---|
| 100 | 1 every 5 s (default) | 600 | 600 | 21 ms | 38 ms | Pass |
| 100 | 1 every 5 s (default, repeated) | 600 | 600 | 15 ms | 28 ms | Pass |
| 100 | 1 every 2 s | 600 | 600 | 10 ms | 20 ms | Pass |
| 100 | 1 every second | 1000 | 1000 | 7 ms | 23-36 ms | Pass (2 runs) |
| 100 | 2 every second | 1500 | 1500 | 4 ms | 22 ms | Pass |

## Limits found

- **Everyone sending at the same moment:** when all users send in the same instant every second
  (the bundle's first version of this script), the server queues the burst. p95 was 512 ms with
  40 users, 1.7 s with 60 and about 12 s with 100. A burst like this does not happen with real
  users, but it shows the server handles roughly 45 messages arriving in the same instant.
- **A server that had been running for a long time:** one test server that had already been
  through several overloaded runs gave p95 = 1.6 s at one message per user per second, where a
  fresh server gave 23-36 ms. Its memory use was normal (50 MB). The cause was not found; a
  longer test is part of NFR-QA-3 (availability).

## Capacity (NFR-PERF-2)

Run: `npm run perf:capacity --prefix server` (options `--users 200`, `--messages 5`).

The script opens 200 connections (100 direct chats). Every user then sends one message a second
for 5 seconds, all at the same moment, which is harder than real use. A message only counts if
the server acknowledged it within 10 s (so it was stored, REQ-MSG-3) and it reached the
recipient. The server must still answer `/api/health` afterwards.

Results (4 Nov 2026, same laptop, freshly started server):

| Connections | Messages | Acknowledged | Received | Result |
|---|---|---|---|---|
| 200 | 1000 | 1000 | 1000 | Pass |
| 200 (repeated) | 1000 | 1000 | 1000 | Pass |
| 300 | 1500 | 1498 | 1500 | Fail: 2 acknowledgements took over 10 s |
| 400 | 2000 | 1722 | 2000 | Fail: 278 acknowledgements took over 10 s |

At 300 and 400 connections every message was still stored and delivered; only some
acknowledgements were late, because 300-400 messages arrive in the same instant.
