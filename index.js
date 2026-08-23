const { default: makeWASocket, useMultiFileAuthState, DisconnectReason, fetchLatestBaileysVersion, makeCacheableSignalKeyStore, Browsers } = require("@whiskeysockets/baileys");
const pino = require("pino");
const http = require("http");

// রেন্ডার পোর্ট রিকোয়েরমেন্ট পূরণ করার জন্য ডামি সার্ভার
const server = http.createServer((req, res) => {
    res.writeHead(200, { 'Content-Type': 'text/plain' });
    res.end('Bot is running successfully!\n');
});

const PORT = process.env.PORT || 10000;
server.listen(PORT, () => {
    console.log(`Server is listening on port ${PORT}`);
});

async function startBot() {
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
        browser: Browsers.ubuntu("Chrome") // উবুন্টু ব্রাউজার ইউজার এজেন্ট ব্যবহার করা হলো
    });

    if (!sock.authState.creds.registered) {
        const phoneNumber = "8801716627500"; // আপনার বিজনেস নাম্বার
        setTimeout(async () => {
            try {
                let code = await sock.requestPairingCode(phoneNumber);
                code = code?.match(/.{1,4}/g)?.join("-") || code;
                console.log(`\n========================================`);
                console.log(`\nYOUR PAIRING CODE IS : ${code}\n`);
                console.log(`========================================\n`);
            } catch (err) {
                console.log("Error getting pairing code:", err);
            }
        }, 5000); // ৫ সেকেন্ড সময় বাড়িয়ে দেওয়া হলো
    }

    sock.ev.on('connection.update', async (update) => {
        const { connection, lastDisconnect } = update;
        if (connection === 'close') {
            const shouldReconnect = lastDisconnect?.error?.output?.statusCode !== DisconnectReason.loggedOut;
            if (shouldReconnect) { startBot(); }
        } else if (connection === 'open') {
            console.log('Bot successfully connected to WhatsApp!');
        }
    });

    sock.ev.on('creds.update', saveCreds);
}

startBot();
