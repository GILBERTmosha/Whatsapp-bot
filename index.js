const express = require('express');
const path = require('path');
const { default: makeWASocket, useMultiFileAuthState, delay } = require("@whiskeysockets/baileys");
const pino = require("pino");

const app = express();
const PORT = process.env.PORT || 3000;

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

app.get('/pair', async (req, res) => {
    let namba = req.query.number;
    if (!namba) return res.json({ error: "No number" });

    const { state, saveCreds } = await useMultiFileAuthState('./session');
    const sock = makeWASocket({
        auth: state,
        logger: pino({ level: "silent" }),
        printQRInTerminal: false
    });

    if (!sock.authState.creds.registered) {
        await delay(1500);
        const code = await sock.requestPairingCode(namba.trim());
        res.json({ code: code });
    }

    sock.ev.on("creds.update", saveCreds);

    // SEHEMU YA KUJIBU MESEJI (Hapa ndipo unaongeza mambo yako)
    sock.ev.on("messages.upsert", async (m) => {
        const msg = m.messages[0];
        if (!msg.message || msg.key.fromMe) return;
        const sender = msg.key.remoteJid;
        const text = msg.message.conversation || msg.message.extendedTextMessage?.text;

        if (text === "Habari") {
            await sock.sendMessage(sender, { text: "Karibu! Mimi ni Bot yako ya WhatsApp." });
        }
        // Unaweza kuongeza code hapa za kusave vitu au ku-like (kwa kutumia react)
    });
});

app.listen(PORT, () => console.log(`Server online on port ${PORT}`));
