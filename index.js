import express from 'express';
import { makeWASocket, useMultiFileAuthState, DisconnectReason } from '@whiskeysockets/baileys';
import pino from 'pino';

const app = express();
const PORT = process.env.PORT || 10000;

app.get('/', (req, res) => {
  res.send('Bot is running successfully!');
});

app.listen(PORT, () => {
  console.log(`Server is listening on port ${PORT}`);
});

async function startBot() {
  const { state, saveCreds } = await useMultiFileAuthState('auth_info_baileys');
  const sock = makeWASocket({
    auth: state,
    logger: pino({ level: 'silent' })
  });

  sock.ev.on('creds.update', saveCreds);

  sock.ev.on('messages.upsert', async (m) => {
    try {
      const msg = m.messages[0];
      if (!msg.message || msg.key.fromMe) return;

      const from = msg.key.remoteJid;
      const type = Object.keys(msg.message)[0];
      
      let text = '';
      if (type === 'conversation') {
        text = msg.message.conversation;
      } else if (type === 'extendedTextMessage') {
        text = msg.message.extendedTextMessage.text;
      }

      if (!text) return;

      console.log(`Received text: ${text}`);

      if (text.toLowerCase() === '.menu' || text.toLowerCase() === '.help') {
        await sock.sendMessage(from, { text: '🤖 *Bot is active!*\n\nCommands:\n* .menu\n* .ping' }, { quoted: msg });
      } else if (text.toLowerCase() === '.ping') {
        await sock.sendMessage(from, { text: 'Pong! 🏓' }, { quoted: msg });
      }
    } catch (err) {
      console.error('Error handling message:', err);
    }
  });

  sock.ev.on('connection.update', (update) => {
    const { connection, lastDisconnect } = update;
    if (connection === 'open') {
      console.log('Bot connected successfully to WhatsApp!');
    } else if (connection === 'close') {
      const shouldReconnect = lastDisconnect?.error?.output?.statusCode !== DisconnectReason.loggedOut;
      console.log('Connection closed. Reconnecting...', shouldReconnect);
      if (shouldReconnect) {
        startBot();
      }
    }
  });
}

startBot();
