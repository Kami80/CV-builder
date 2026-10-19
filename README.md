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

## Applicant Telegram contact

Applicants connect through https://t.me/ApplyEuropeCVBot?start=cv before sending. The bot reads their ID and optional username from Telegram’s authenticated private-message update and returns a personal questionnaire link. The backend signs that identity for seven days and verifies it again at submission. Manually supplied IDs or usernames are not trusted.

The owner’s document and caption include the verified numeric ID and username (or “Not set”), with a Contact applicant button. Applicants receive no resume file. Telegram privacy settings may limit direct contact through an ID link when a username is unavailable.

The personal link is a bearer credential: keep it private. Its token is placed in the URL fragment, removed from the address bar after capture, and saved separately in browser local storage. A Disconnect button removes it. It is never included in the resume or owner notification. Applicants select Connect through Telegram, press Start in the bot, and return to the original tab. The browser checks its private connection request and unlocks automatically. The bot also provides an Open CV builder button. No link copying is required. After seven days they can press Start again for a fresh link. The UI asks for consent to share Telegram contact details with the resume.

## Automatic Telegram connection

`/api/connect` creates a ten-minute connection request. The browser keeps a separate private polling secret in session storage; the bot Start link contains only the request ID. The authenticated Telegram webhook binds the request to a verified applicant once. `/api/connect/status` releases the signed identity only to the original browser with the matching polling secret. Polling pauses while the tab is hidden and checks immediately on return. A bot button can alternatively open the verified questionnaire directly.

Connection state lives in the Cloudflare D1 database `apply-europe-cv-connections`. It contains expiring identity tokens and hashed polling secrets, never CV content. Expired records are removed when creating connections and by a half-hourly cleanup trigger. Initialize a new database with `connection-schema.sql`; preserve the D1 binding in `wrangler.jsonc` when deploying.

Telegram requires a user action to switch apps or open a bot button; a bot cannot forcibly redirect the Telegram app to an external browser. Returning to the original browser is sufficient to open the builder automatically.

## Telegram Mini App

The bot’s Open CV builder button and Build my CV menu open the questionnaire inside Telegram. The official Telegram SDK supplies signed `initData`; `/api/telegram` validates Telegram’s HMAC, rejects stale or forged data, then issues the same verified applicant identity used for submissions. The client never trusts `initDataUnsafe` for authentication.

Inside Telegram the UI shows one column, larger touch controls, collapsible optional links, light/dark theme colors, safe-area spacing, fixed Continue controls and Telegram’s Back button. Continue visits each section within a step; Preview remains available. The price and local draft status stay visible. The browser connection path remains available for visitors who use the public website.

Run `node --env-file=.env setup-bot.mjs` to set the bot’s web-app menu button. No Main Mini App setup in BotFather is needed for the inline button and menu integration used here. Native Telegram opening and device behavior should also be checked on a Telegram phone client; automated browser checks simulate the Telegram SDK.
