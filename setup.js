const fs = require('fs');
const readline = require('readline');
const path = require('path');

const envPath = path.join(__dirname, '.env');
const args = process.argv.slice(2);
const autoMode = args.includes('--auto');

if (fs.existsSync(envPath) && !args.includes('--force')) {
  console.log('Configuration deja presente.');
  process.exit(0);
}

if (autoMode) {
  fs.writeFileSync(envPath, 'PORT=3000\n', 'utf8');
  console.log('Configuration par defaut creee');
  process.exit(0);
}

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

function ask(question) {
  return new Promise((resolve) => rl.question(question, resolve));
}

async function main() {
  console.log('\n=== Configuration ===\n');

  const telegramToken = await ask('Token du bot Telegram : ');
  const chatId = await ask('Chat ID Telegram : ');

  const content = `PORT=3000
TELEGRAM_BOT_TOKEN=${telegramToken.trim()}
TELEGRAM_CHAT_ID=${chatId.trim()}
`;

  fs.writeFileSync(envPath, content, 'utf8');
  console.log('\nConfiguration sauvegardee !\n');
  rl.close();
}

main().catch(console.error);
