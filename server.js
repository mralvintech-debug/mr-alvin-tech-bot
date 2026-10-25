const express = require('express');
const pino = require('pino');
const fs = require('fs');
const path = require('path');
const {
  default: makeWASocket,
  useMultiFileAuthState,
  DisconnectReason,
  fetchLatestBaileysVersion
} = require('@whiskeysockets/baileys');

const app = express();
app.use(express.json({ limit: '32kb' }));
const PORT = process.env.PORT || 3000;
const ADMIN_KEY = process.env.ADMIN_KEY;
const AUTH_DIR = process.env.AUTH_DIR || path.join(__dirname, 'auth_info');
let sock = null;
let connected = false;
let pairingRequested = false;
let lastError = null;

if (!ADMIN_KEY) {
  console.error('ERROR: Set ADMIN_KEY in your hosting environment before starting.');
  process.exit(1);
}

function requireAdmin(req, res, next) {
  const key = req.get('x-admin-key') || req.query.key;
  if (!key || key !== ADMIN_KEY) return res.status(401).json({ error: 'Unauthorized' });
  next();
}

async function startSocket() {
  const { state, saveCreds } = await useMultiFileAuthState(AUTH_DIR);
  let version;
  try { ({ version } = await fetchLatestBaileysVersion()); } catch (_) {}
  sock = makeWASocket({
    ...(version ? { version } : {}),
    auth: state,
    logger: pino({ level: 'silent' }),
    printQRInTerminal: false,
    browser: ['MR ALVIN TECH AI', 'Chrome', '1.0.0']
  });

  sock.ev.on('creds.update', saveCreds);
  sock.ev.on('connection.update', async (update) => {
    const { connection, lastDisconnect } = update;
    if (connection === 'open') {
      connected = true;
      pairingRequested = false;
      lastError = null;
      console.log('WhatsApp connection opened.');
    }
    if (connection === 'close') {
      connected = false;
      const code = lastDisconnect?.error?.output?.statusCode;
      lastError = `Connection closed (${code || 'unknown'})`;
      if (code !== DisconnectReason.loggedOut) {
        setTimeout(() => startSocket().catch(err => { lastError = err.message; }), 3000);
      } else {
        console.error('Logged out. Remove stored auth only if you intend to pair again.');
      }
    }
  });

  // Starter example command. Add your own bot commands here.
  sock.ev.on('messages.upsert', async ({ messages, type }) => {
    if (type !== 'notify') return;
    for (const m of messages) {
      if (!m.message || m.key.fromMe) continue;
      const jid = m.key.remoteJid;
      const body = m.message.conversation || m.message.extendedTextMessage?.text || '';
      if (body.trim().toLowerCase() === '!menu') {
        await sock.sendMessage(jid, { text: '*MR ALVIN🥷🇺🇸. | TECH AI*\n\nCommands:\n!menu - show this menu\n\nBot is online.' });
      }
    }
  });
}

app.get('/', (_req, res) => res.json({ name: 'MR ALVIN TECH AI', service: 'WhatsApp backend', status: connected ? 'connected' : 'not-connected' }));
app.get('/api/status', requireAdmin, (_req, res) => res.json({ connected, pairingRequested, lastError }));

app.post('/api/pair', requireAdmin, async (req, res) => {
  try {
    const phone = String(req.body.phone || '').replace(/[^0-9]/g, '');
    if (!/^\d{8,15}$/.test(phone)) return res.status(400).json({ error: 'Send phone in international digits only, e.g. 263771234567. Do not include + or spaces.' });
    if (!sock) await startSocket();
    if (connected) return res.status(409).json({ error: 'Already connected.' });
    if (sock.authState?.creds?.registered) return res.status(409).json({ error: 'A saved session already exists. Check /api/status before requesting another code.' });
    pairingRequested = true;
    const code = await sock.requestPairingCode(phone);
    res.json({ pairingCode: code, instructions: 'On your phone open WhatsApp > Linked devices > Link a device > Link with phone number instead, then enter this code.' });
  } catch (e) {
    lastError = e.message;
    res.status(500).json({ error: 'Could not create pairing code. Check server logs and try again.' });
  }
});

app.post('/api/start', requireAdmin, async (_req, res) => {
  try { if (!sock) await startSocket(); res.json({ ok: true, message: 'Socket start requested.' }); }
  catch (e) { lastError = e.message; res.status(500).json({ error: 'Could not start WhatsApp connection.' }); }
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`MR ALVIN TECH AI backend listening on ${PORT}`);
  // Do not auto-connect before the owner requests pairing or start.
});
