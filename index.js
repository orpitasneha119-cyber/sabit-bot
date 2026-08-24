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

  sock.ev.on('messages.upsert', async (chatUpdate) => {
    try {
      const mek = chatUpdate.messages[0];
      if (!mek.message) return;
      
      const from = mek.key.remoteJid;
      const type = Object.keys(mek.message)[0];
      
      let body = (type === 'conversation') ? mek.message.conversation : 
                 (type === 'extendedTextMessage') ? mek.message.extendedTextMessage.text : '';

      if (!body) return;

      console.log('Received message:', body);

      if (body === '.menu' || body === '.help' || body === '.bot') {
        await sock.sendMessage(from, { text: '🤖 *Bot is active and working perfectly!*\n\nCommands:\n* .menu\n* .ping' }, { quoted: mek });
      } else if (body === '.ping') {
        await sock.sendMessage(from, { text: 'Pong! 🏓 Bot is alive.' }, { quoted: mek });
      }
    } catch (err) {
      console.error('Error in messages.upsert:', err);
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
