# MR ALVIN TECH AI — WhatsApp backend starter

This is a starter Node.js backend using Baileys pairing codes. It is not an official WhatsApp API integration and WhatsApp may restrict unofficial clients.

## Deploy requirements
- Node.js 20+
- Persistent private storage for `AUTH_DIR` (otherwise a redeploy/restart can lose the linked session)
- Environment variable `ADMIN_KEY` set to a long random secret
- HTTPS in front of the service

## Endpoints
- `GET /` — basic health status
- `GET /api/status` — status; requires `x-admin-key` header
- `POST /api/pair` — body `{"phone":"263771234567"}` and header `x-admin-key`
- `POST /api/start` — start connection; requires `x-admin-key`

Example (run locally):
```bash
npm install
ADMIN_KEY='use-a-long-random-secret' npm start
```

Request pairing code:
```bash
curl -X POST http://localhost:3000/api/pair \
  -H 'content-type: application/json' \
  -H 'x-admin-key: use-a-long-random-secret' \
  -d '{"phone":"263771234567"}'
```

On WhatsApp: Settings > Linked devices > Link a device > Link with phone number instead, then enter the code.

## Important limitations
- Keep `ADMIN_KEY` private. Do not put it in frontend HTML or public GitHub.
- Never share pairing codes or `auth_info` files.
- Baileys is an unofficial WhatsApp Web client. For a production business service, consider Meta's official WhatsApp Cloud API.
- Free hosting may sleep, restart, or erase local files. 24/7 operation needs an always-on host and persistent storage; this starter cannot guarantee uptime by itself.
- The current starter replies to `!menu` only. Add commands and dashboard integration separately.
