const express = require('express');
const path = require('path');
const fs = require('fs');
const bodyParser = require('body-parser');

const app = express();
const __path = process.cwd();
const port = process.env.PORT || 8000;

// Make sure the temp folder used by pair.js / qr.js exists
if (!fs.existsSync(path.join(__path, 'temp'))) {
    fs.mkdirSync(path.join(__path, 'temp'), { recursive: true });
}

const qrRouter = require('./qr');
const pairRouter = require('./pair');

require('events').EventEmitter.defaultMaxListeners = 500;

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static(__path));

// Session endpoints
app.use('/qr', qrRouter);
app.use('/code', pairRouter);

// Pages
app.use('/pair', (req, res) => res.sendFile(path.join(__path, 'pair.html')));
app.use('/ping', (req, res) => res.send('GOTHIC MD BOT V6 :: alive'));

app.get('/', (req, res) => res.sendFile(path.join(__path, 'main.html')));

// Fallback — always land on the home page
app.use((req, res) => res.redirect('/'));

app.listen(port, () => {
    console.log(`📡 GOTHIC MD BOT V6 session server running on http://localhost:${port}`);
});

module.exports = app;