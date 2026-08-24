import express from 'express';
import { makeWASocket, useMultiFileAuthState } from '@whiskeysockets/baileys';
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

  sock.ev.on('connection.update', (update) => {
    const { connection } = update;
    if(connection === 'open') {
      console.log('Bot connected successfully to WhatsApp!');
    } else if(connection === 'close') {
      console.log('Connection closed, reconnecting...');
      startBot();
    }
  });
}

startBot();
