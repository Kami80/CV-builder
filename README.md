# Apply Europe Academic CV Intake

Guided seven-step academic resume questionnaire for Kamyab Safaei. Price: **699 Toman per resume**.

- Website: https://kami80.github.io/CV-builder/
- Contact: https://t.me/SafaeiKamyab
- Apply Europe group: https://t.me/ApplyEuropeIran
- Hosted backend: https://apply-europe-cv-api.micioparla.workers.dev

Applicants review their CV, consent to sharing it, then send a Markdown document directly to the owner’s Telegram inbox. No resume download, import, Markdown preview or Markdown copy controls are provided. Applicants see only the form and formatted CV preview. Payment is arranged with Kamyab; this site does not collect or verify payment.

## Production architecture

GitHub Pages serves `index.html` and the public image/PDF assets from the repository. When opened on `kami80.github.io`, the form sends submissions to the Cloudflare Worker’s `/api/resume` endpoint. On localhost it uses the local Node server instead.

The Worker accepts browser submissions from `https://kami80.github.io`, checks consent and payload size, limits repeated submissions to three per minute per connection IP per Cloudflare location, and uploads a `.md` file to the fixed owner chat. Success is shown only after Telegram accepts the file. Applicant details are not saved in a database.

The Worker’s `/telegram/webhook` endpoint authenticates Telegram requests with a private webhook secret. Private `/start` commands receive the welcome message, price, contact and website buttons, even when the owner’s computer is off. Do not run a local welcome poller while this webhook is active.

## Deployment

The hosted Worker is `apply-europe-cv-api` in the account selected in `wrangler.jsonc`. Its bot token, owner chat ID and webhook secret are stored as private Cloudflare secrets. They are never included in the frontend or source control.

- Run `npm ci` to install dependencies.
- Run `npm test` and `npm run check:backend` before deploying.
- Run `npm run deploy:backend` while signed into the intended Cloudflare account. Existing Worker secrets are preserved.
- Push frontend changes to `main` to update the existing GitHub Pages site.
- If changing the backend URL, update the production endpoint in `index.html` and the Telegram webhook registration.

For a fresh backend, provide `TELEGRAM_BOT_TOKEN`, `TELEGRAM_CHAT_ID` and a random `TELEGRAM_WEBHOOK_SECRET` through Cloudflare’s private secret settings or Wrangler’s secret input. Register `https://YOUR_BACKEND/telegram/webhook` using Telegram’s `setWebhook` method with the same `secret_token`. Never publish secret files. The ignored `.env.production.secrets.json` is a local deployment aid only.

## Local development

Requires Node.js 22.9 or newer.

1. Copy `.env.example` to `.env`.
2. Set the bot token and numeric chat ID privately. Start the bot from your personal Telegram account first.
3. Keep `TELEGRAM_WELCOME_ENABLED=false` when the production webhook is active.
4. If direct Telegram connections are blocked, set `TELEGRAM_PROXY_URL` to a working HTTP proxy. Leave it empty on hosts with direct access.
5. Run `npm start`, then open http://localhost:3000.

`node --env-file=.env setup-bot.mjs` updates the bot’s public description and command list. It does not change the production webhook.

## Privacy and limitations

Drafts are saved unencrypted in the applicant’s browser. On explicit submission, the readable CV passes through the backend to Telegram and the owner. The application does not save CVs to disk or log their content. Telegram and the recipient retain delivered files under their own policies. Markdown submissions do not include the old hidden form-state payload. Ask references for permission before sharing their details.

A timeout may mean delivery succeeded without confirmation; contact the owner before retrying. The IP-based limiter may be shared by visitors using a shared network. Origin checks and rate limits reduce misuse but do not authenticate applicants.

The reference PDF is public and contains the owner’s existing contact details. The supplied contact/group QR cards are public. Browsers may offer their own PDF save controls.

## References

- Telegram file delivery: https://core.telegram.org/bots/api#senddocument
- Telegram webhooks: https://core.telegram.org/bots/api#setwebhook
- Cloudflare secrets: https://developers.cloudflare.com/workers/configuration/secrets/
