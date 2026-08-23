const { default: makeWASocket, useMultiFileAuthState, DisconnectReason, fetchLatestBaileysVersion, makeCacheableSignalKeyStore, Browsers } = require("@whiskeysockets/baileys");
const pino = require("pino");
const http = require("http");
const fs = require('fs');

// রেন্ডার পোর্ট মেইনটেইন করার জন্য মিনি সার্ভার
const server = http.createServer((req, res) => {
    res.writeHead(200, { 'Content-Type': 'text/plain' });
    res.end('Bot is running successfully!\n');
});

const PORT = process.env.PORT || 10000;
server.listen(PORT, () => {
    console.log(`Server is listening on port ${PORT}`);
});

async function startBot() {
    // সেশন আইডি থেকে সরাসরি ক্রেডেন্সিয়াল তৈরি করার ব্যবস্থা
    const SESSION_ID = process.env.SESSION_ID || "এখানে_আপনার_সেশন_আইডি_বসাবেন";
    
    if (!fs.existsSync('./auth_info_baileys')) {
        fs.mkdirSync('./auth_info_baileys');
    }

    if (SESSION_ID && !fs.existsSync('./auth_info_baileys/creds.json')) {
        // যদি সেশন আইডি বেস64 (Base64) বা সাধারণ টেক্সট হয় তা ডিকোড করে সেভ করা
        let sessData = SESSION_ID.includes('SESSION_ID_') ? SESSION_ID.replace('SESSION_ID_', '') : SESSION_ID;
        fs.writeFileSync('./auth_info_baileys/creds.json', Buffer.from(sessData, 'base64').toString('utf-8'));
    }

    const { state, saveCreds } = await useMultiFileAuthState('./auth_info_baileys');
    const { version } = await fetchLatestBaileysVersion();
    
    const sock = makeWASocket({
        version,
        logger: pino({ level: "silent" }),
        printQRInTerminal: false,
        auth: {
            creds: state.creds,
            keys: makeCacheableSignalKeyStore(state.creds, pino({ level: "fatal" }).child({ level: "fatal" })),
        },
        browser: Browsers.macOS("Chrome")
    });

    sock.ev.on('connection.update', async (update) => {
        const { connection, lastDisconnect } = update;
        if (connection === 'close') {
            const shouldReconnect = lastDisconnect?.error?.output?.statusCode !== DisconnectReason.loggedOut;
            if (shouldReconnect) { 
                startBot(); 
            } else {
                console.log('Connection closed. You are logged out.');
            }
        } else if (connection === 'open') {
            console.log('Bot successfully connected to WhatsApp via Session ID!');
        }
    });

    sock.ev.on('creds.update', saveCreds);
}

startBot();
