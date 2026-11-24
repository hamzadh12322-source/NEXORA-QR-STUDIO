# NEXORA QR STUDIO — Telegram Bot

A serverless Telegram QR generator built with Node.js, grammY, Supabase and Vercel.

## Current starter features
- Arabic and English language selection
- `/start`, `/create`, `/myqrs`, `/language`, `/help`, `/cancel`
- QR generation as PNG with five color presets
- Saves users, sessions and QR metadata in Supabase
- Webhook endpoint protected by Telegram's secret-token header
- Dynamic redirect endpoint scaffold (`/r/:id`) with scan event logging

## 1. Requirements
- Node.js 20 or newer
- A Telegram bot token from @BotFather
- A Supabase project
- A Vercel account connected to a Git repository

## 2. Supabase setup
1. Open Supabase Dashboard > SQL Editor > New query.
2. Paste and run `supabase/schema.sql`.
3. Open Project Settings > Data API and copy Project URL.
4. Open Project Settings > API Keys and copy the `service_role` secret key.
   This key is server-side only. Never put it in frontend code or commit it to Git.

## 3. Environment variables
Copy `.env.example` values into Vercel Project > Settings > Environment Variables:
- `BOT_TOKEN`
- `WEBHOOK_SECRET` (generate a long random string, 32+ characters)
- `APP_URL` (your deployed Vercel URL, e.g. https://your-project.vercel.app)
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`

Do not commit `.env` files.

## 4. Deploy to Vercel
1. Push this folder to a private GitHub repository.
2. Import the repository into Vercel.
3. Add all environment variables for Production (and Preview if desired).
4. Deploy.
5. Set the Telegram webhook by opening this URL in a browser, replacing placeholders:

`https://api.telegram.org/bot<BOT_TOKEN>/setWebhook?url=https://YOUR-APP.vercel.app/api/webhook&secret_token=YOUR_WEBHOOK_SECRET`

For safety, prefer using the POST method with JSON body rather than putting the token in a URL that may be logged. You can use the `scripts/set-webhook.js` script locally after setting `.env`.

## 5. Local development
```bash
npm install
npx vercel dev
```

Vercel's local dev server provides the serverless function routes. Configure the environment variables in `.env` or `.env.local` first.

## Important notes
- The first version creates static QR codes. The dynamic redirect endpoint and scan table are groundwork; the bot flow to create/manage dynamic QR codes and a public analytics interface are not implemented yet.
- QR images are generated in memory and sent through Telegram; this version does not upload image files to Supabase Storage.
- No GPS/location tracking is performed. Scan logging stores timestamp and user-agent only.
- Keep the Supabase service-role key and Telegram bot token private.
