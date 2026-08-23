const { default: makeWASocket, useMultiFileAuthState, DisconnectReason, fetchLatestBaileysVersion, makeCacheableSignalKeyStore, Browsers } = require("@whiskeysockets/baileys");
const pino = require("pino");
const http = require("http");

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
    const { state, saveCreds } = await useMultiFileAuthState('./');
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
            console.log('Bot successfully connected to WhatsApp!');
        }
    });

    sock.ev.on('creds.update', saveCreds);
}
setTimeout(async () => {
        try {
            let phoneNumber = "8801716627500"; // আপনার হোয়াটসঅ্যাপ নম্বর
            let code = await sock.requestPairingCode(phoneNumber);
            code = code?.match(/.{1,4}/g)?.join("-") || code;
            console.log(`==================================`);
            console.log(`YOUR PAIRING CODE IS : ${code}`);
            console.log(`==================================\n`);
        } catch (err) {
            console.log("Pairing code error, retrying...");
        }
    }, 6000);
startBot();
