
# Team 5 — Chat Application

A real-time chat application built with Node.js, Express, Socket.IO and MongoDB.

## Prerequisites

- Node.js 18 or later
- npm
- MongoDB 7 or a compatible MongoDB deployment

## Installation

1. Clone the repository.
2. Install dependencies:

   ```bash
   npm install
   ```

3. Copy `.env.example` to `.env`.
4. Update the environment variables for your local setup.

## Configuration

| Variable | Description | Default |
|---|---|---|
| `NODE_ENV` | Application environment | `development` |
| `PORT` | HTTP server port | `3000` |
| `MONGODB_URI` | MongoDB connection URI | Local MongoDB |
| `JWT_SECRET` | Secret used for JWT signing | Set your own value |
| `CLIENT_ORIGIN` | Allowed client origin | `http://localhost:5173` |

Never commit `.env` or real credentials.

## Run the server

Development mode:

```bash
npm run dev
```

Production-style start:

```bash
npm start
```

## Health check

With the server running, request:

```text
GET http://localhost:3000/health
```

Expected response:

```json
{
  "status": "ok"
}
```

## Tests and linting

Run the automated tests:

```bash
npm test
```

Check server code quality:

```bash
npm run lint
```

## Project structure

- `server/config/` — server configuration
- `server/middleware/` — middleware and error handling
- `server/models/` — data models
- `server/routes/` — HTTP routes
- `server/services/` — application services
- `server/sockets/` — real-time socket handlers
- `client/src/` — client source code
- `client/public/` — static client assets
- `tests/` — automated tests
- `Documents/Part-1 Deliverables/` — project design and requirements documents
