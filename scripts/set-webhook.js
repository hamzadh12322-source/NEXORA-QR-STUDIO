require('dotenv').config();

async function main() {
  const { BOT_TOKEN, WEBHOOK_SECRET, APP_URL } = process.env;
  if (!BOT_TOKEN || !WEBHOOK_SECRET || !APP_URL) {
    throw new Error('Set BOT_TOKEN, WEBHOOK_SECRET and APP_URL before running this script.');
  }
  const url = `${APP_URL.replace(/\/$/, '')}/api/webhook`;
  const response = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/setWebhook`, {
    method: 'POST', headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ url, secret_token: WEBHOOK_SECRET, allowed_updates: ['message', 'callback_query'] })
  });
  const result = await response.json();
  if (!result.ok) throw new Error(result.description || 'Telegram setWebhook failed');
  console.log(`Webhook configured: ${url}`);
}
main().catch(err => { console.error(err.message); process.exit(1); });
