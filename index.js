import express from 'express';
import { makeWASocket, useMultiFileAuthState, DisconnectReason, fetchLatestBaileysVersion } from '@whiskeysockets/baileys';
import pino from 'pino';
import http from 'http';

const app = express();
const PORT = process.env.PORT || 10000;

app.get('/', (req, res) => {
  res.send('Bot is running successfully!');
});

const server = app.listen(PORT, () => {
  console.log(`Server is listening on port ${PORT}`);
});

// সেলফ-পিং মেকানিজম
setInterval(() => {
  http.get(`http://localhost:${PORT}`, (res) => {}).on('error', (err) => {});
}, 5 * 60 * 1000);

async function startBot() {
  const { state, saveCreds } = await useMultiFileAuthState('auth_info_baileys');
  const { version } = await fetchLatestBaileysVersion();
  
  const sock = makeWASocket({
    version,
    auth: state,
    logger: pino({ level: 'silent' }),
    generateHighQualityLinkPreview: true
  });

  sock.ev.on('creds.update', saveCreds);

  sock.ev.on('messages.upsert', async (chatUpdate) => {
    try {
      const mek = chatUpdate.messages[0];
      if (!mek.message || mek.key.fromMe) return;

      const from = mek.key.remoteJid;
      const type = Object.keys(mek.message)[0];
      
      let text = (type === 'conversation') ? mek.message.conversation : 
                 (type === 'extendedTextMessage') ? mek.message.extendedTextMessage.text : '';

      if (!text) return;
      const textLower = text.toLowerCase().trim();

      if (textLower === '.menu' || textLower === '.help' || textLower === '.bot') {
        await sock.sendMessage(from, { text: '🤖 *Bot is active and running successfully!*\n\nCommands:\n* .menu\n* .ping' }, { quoted: mek });
      } else if (textLower === '.ping') {
        await sock.sendMessage(from, { text: 'Pong! 🏓 Bot is working.' }, { quoted: mek });
      }
    } catch (err) {
      console.error('Error in message handler:', err);
    }
  });

  sock.ev.on('connection.update', (update) => {
    const { connection, lastDisconnect } = update;
    
    if (connection === 'open') {
      console.log('Bot connected successfully to WhatsApp!');
    } else if (connection === 'close') {
      const statusCode = lastDisconnect?.error?.output?.statusCode;
      const shouldReconnect = statusCode !== DisconnectReason.loggedOut;
      
      console.log(`Connection closed, reconnecting... ${shouldReconnect}`);
      
      if (shouldReconnect) {
        setTimeout(() => {
          startBot();
        }, 5000);
      }
    }
  });
}

startBot();
