import express from 'express';
import { makeWASocket, useMultiFileAuthState, DisconnectReason } from '@whiskeysockets/baileys';
import pino from 'pino';
import fs from 'fs';

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

  // মেসেজ এবং কমান্ড হ্যান্ডলার
  sock.ev.on('messages.upsert', async ({ messages }) => {
    try {
      const m = messages[0];
      if (!m.message) return;
      
      const messageType = Object.keys(m.message)[0];
      const body = messageType === 'conversation' ? m.message.conversation : 
                   messageType === 'extendedTextMessage' ? m.message.extendedTextMessage.text : '';

      const from = m.key.remoteJid;
      const isCmd = body.startsWith('.');
      const command = isCmd ? body.slice(1).trim().split(' ')[0].toLowerCase() : '';

      

      console.log(`Command received: ${command}`);

      if (command === 'menu' || command === 'help') {
        await sock.sendMessage(from, { text: '🤖 *Bot is active and working perfectly!*\n\nCommands:\n* .menu / .help\n* .ping' }, { quoted: m });
      } else if (command === 'ping') {
        await sock.sendMessage(from, { text: 'Pong! 🏓 Bot is alive.' }, { quoted: m });
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
