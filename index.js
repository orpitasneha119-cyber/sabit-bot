const { default: makeWASocket, useMultiFileAuthState, DisconnectReason } = require('@whiskeysockets/baileys');
const pino = require('pino');

const BOT_NAME = "꧁𓊈𒆜𝕊𝕒𝕓𝕚𝕥𒆜𓊉꧂";
const OWNER_NAME = "Sabit";

async function startBot() {
    const { state, saveCreds } = await useMultiFileAuthState('auth_info_baileys');
    
    const sock = makeWASocket({
        auth: state,
        printQRInTerminal: true,
        logger: pino({ level: 'silent' })
    });

    sock.ev.on('creds.update', saveCreds);

    sock.ev.on('connection.update', (update) => {
        const { connection, lastDisconnect } = update;
        if(connection === 'close') {
            const shouldReconnect = (lastDisconnect.error)?.output?.statusCode !== DisconnectReason.loggedOut;
            console.log('Connection closed, reconnecting...', shouldReconnect);
            if(shouldReconnect) {
                startBot();
            }
        } else if(connection === 'open') {
            console.log('✅ ' + BOT_NAME + ' Connected Successfully!');
        }
    });

    // কমান্ড ও মেনু হ্যান্ডলার
    sock.ev.on('messages.upsert', async m => {
        const msg = m.messages[0];
        if (!msg.message || msg.key.fromMe) return;

        const text = msg.message.conversation || msg.message.extendedTextMessage?.text || '';
        const remoteJid = msg.key.remoteJid;

        // মেনু কমান্ড
        if (text === '.menu' || text === '!menu') {
            const menuText = `╭━━━〔 *${BOT_NAME}* 〕━━━┈⊷
┃ 👤 *Owner:* ${OWNER_NAME}
┃ ⚡ *Status:* Active & Fast
┃ 🛡️ *Group Protection:* ON
╰━━━━━━━━━━━━━━━┈⊷

📌 *Available Commands:*
🔹 .ping - বটের স্পিড চেক করতে
🔹 .owner - ওনারের ইনফো জানতে`;

            await sock.sendMessage(remoteJid, { text: menuText }, { quoted: msg });
        }

        // পিং কমান্ড (স্পিড চেক)
        if (text === '.ping' || text === '!ping') {
            await sock.sendMessage(remoteJid, { text: '⚡ Pong! Bot is running super fast.' }, { quoted: msg });
        }

        // ওনার কমান্ড
        if (text === '.owner' || text === '!owner') {
            await sock.sendMessage(remoteJid, { text: `👑 This bot is proudly owned and managed by *${OWNER_NAME}* (${BOT_NAME}).` }, { quoted: msg });
        }
    });
}

startBot();
