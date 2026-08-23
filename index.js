const { default: makeWASocket, useMultiFileAuthState, DisconnectReason, fetchLatestBaileysVersion, makeCacheableSignalKeyStore, Browsers } = require("@whiskeysockets/baileys");
const pino = require("pino");

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
        browser: Browsers.macOS("Chrome")
    });

    if (!sock.authState.creds.registered) {
        const phoneNumber = "8801716627500"; // আপনার বিজনেস নাম্বার
        setTimeout(async () => {
            let code = await sock.requestPairingCode(phoneNumber);
            code = code?.match(/.{1,4}/g)?.join("-") || code;
            console.log(`\n========================================`);
            console.log(`\nYOUR PAIRING CODE IS : ${code}\n`);
            console.log(`========================================\n`);
        }, 3000);
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
