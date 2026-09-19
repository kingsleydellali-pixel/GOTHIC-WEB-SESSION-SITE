const { makeid } = require('./id');
const express = require('express');
const fs = require('fs');
const path = require('path');
const pino = require('pino');
const {
    default: makeWASocket,
    useMultiFileAuthState,
    Browsers,
    delay,
    makeCacheableSignalKeyStore,
    fetchLatestBaileysVersion,
    DisconnectReason,
} = require("@whiskeysockets/baileys");

const router = express.Router();

const BOT_NAME = 'GOTHIC MD BOT V6';
const SESSION_PREFIX = process.env.SESSION_PREFIX || 'GOTHIC-MD:~';
const SUPPORT_LINK = 'https://wa.me/message/YNDA2RFTE35LB1';

function removeFile(filePath) {
    try {
        if (!fs.existsSync(filePath)) return false;
        fs.rmSync(filePath, { recursive: true, force: true });
    } catch (e) {
        console.log('Cleanup error:', e?.message);
    }
}

router.get('/', async (req, res) => {
    const id = makeid();
    let num = req.query.number;

    async function GOTHIC() {
        const tempDir = path.join(__dirname, 'temp', id);
        const { state, saveCreds } = await useMultiFileAuthState(tempDir);

        try {
            const { version } = await fetchLatestBaileysVersion();
            const logger = pino({ level: 'silent' });

            const client = makeWASocket({
                version,
                auth: {
                    creds: state.creds,
                    keys: makeCacheableSignalKeyStore(state.keys, logger),
                },
                printQRInTerminal: false,
                logger,
                browser: Browsers.ubuntu('Chrome'),
                connectTimeoutMs: 60000,
                keepAliveIntervalMs: 10000,
            });

            client.ev.on('creds.update', saveCreds);

            client.ev.on('connection.update', async (s) => {
                const { connection, lastDisconnect } = s;

                if (connection === 'open') {
                    try {
                        await client.sendMessage(client.user.id, {
                            text: `⚡ *${BOT_NAME}* ⚡\nGenerating your session, please wait a moment...`
                        });

                        await delay(50000);

                        const data = fs.readFileSync(path.join(tempDir, 'creds.json'));
                        const b64data = Buffer.from(data).toString('base64');

                        // Prefixed session id — recognised by most Baileys bots
                        const session = await client.sendMessage(client.user.id, {
                            text: SESSION_PREFIX + b64data
                        });

                        // Raw base64 backup — for bots that expect no prefix
                        await client.sendMessage(client.user.id, {
                            text: b64data
                        });

                        await client.sendMessage(client.user.id, {
                            text:
`\`\`\`⚡ ${BOT_NAME} has been linked to your WhatsApp account!

Do NOT share this session_id with anyone.

Paste it into the SESSION variable of ANY Baileys WhatsApp bot (GOTHIC MD, or your own) — it will be used for authentication.

For any issues, reach us via:
${SUPPORT_LINK}

Don't forget to sleep 😴, for even the relentless must recharge ⚡.

Goodluck 🎉 — ${BOT_NAME}\`\`\``
                        }, { quoted: session });

                        await delay(500);
                        await client.ws.close();
                        removeFile(tempDir);
                    } catch (e) {
                        console.log('Error sending session messages:', e);
                    }
                } else if (connection === 'close') {
                    const code = lastDisconnect?.error?.output?.statusCode;
                    if (code !== DisconnectReason.loggedOut) {
                        await delay(5000);
                        GOTHIC();
                    } else {
                        removeFile(tempDir);
                    }
                }
            });

            if (!client.authState.creds.registered) {
                await delay(1500);
                num = String(num || '').replace(/[^0-9]/g, '');
                if (!num) {
                    if (!res.headersSent) return res.send({ code: 'Invalid Number' });
                    return;
                }
                const code = await client.requestPairingCode(num);
                if (!res.headersSent) {
                    await res.send({ code });
                }
            }

        } catch (err) {
            console.log('Pair service error:', err);
            removeFile(tempDir);
            if (!res.headersSent) {
                await res.send({ code: 'Service Currently Unavailable' });
            }
        }
    }

    await GOTHIC();
});

module.exports = router;