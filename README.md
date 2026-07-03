# LOCALPulse

Real-time dashboard for Tempe, AZ business owners, plus an admin view for you.
Backed by **Supabase** (auth + database), **OpenAI** (AI advisor chatbot),
live **Yelp** + **Google Places** data, **Twilio** SMS + **SMTP** email
notifications on new requests, and optional **n8n** webhook triggers.

## How accounts work

- **You (admin)** — instant. Log in directly; create/edit/delete any
  business; instantly invite new owner accounts.
- **Everyone else** — submits a request at `/request-access.html` (name,
  email, business name — no password up front). It sits "pending" until you
  approve it in the admin dashboard. There's no real Google Business OAuth
  ownership check here (that needs your own Google Cloud OAuth app + verified
  domain) — instead the request auto-looks-up a matching Google listing in
  Tempe as a signal, and you get an email + SMS notification to review it.
  Approve → they get a Supabase invite email to set their own password.
- **Delete account** — every account (admin or owner) can delete itself;
  admin can also delete any owner directly. Deleting an owner cascades to
  their business and chat history automatically (Postgres foreign key).

## 1. Set up Supabase (5 min)

1. Create a project at https://supabase.com (free tier).
2. Dashboard → **SQL Editor** → paste the contents of `backend/db/schema.sql` → Run.
   This creates `businesses`, `chat_logs`, `signup_requests` with RLS enabled
   and no public policies (only your backend's service-role key can touch
   them — the browser's anon key is used only for login, never for data).
3. Dashboard → **Authentication → Email Templates** → make sure "Invite user"
   template is enabled (it is by default).
4. Dashboard → **Settings → API** → copy:
   - `Project URL` → `SUPABASE_URL`
   - `anon` `public` key → `SUPABASE_ANON_KEY`
   - `service_role` `secret` key → `SUPABASE_SERVICE_ROLE_KEY` (⚠️ backend only, never expose this one)
5. Dashboard → **Authentication → URL Configuration** → add your app's URL
   (e.g. `http://localhost:3000` for local dev, your real domain later) to
   **Redirect URLs** — this is required or invite links will fail to redirect
   to `/set-password.html`.

## 2. Get your other API keys

| Key | Where |
|---|---|
| `OPENAI_API_KEY` | platform.openai.com/api-keys (paid, usage-based) |
| `GOOGLE_PLACES_API_KEY` | console.cloud.google.com → enable "Places API" → Credentials (free tier ~5k calls/mo) |
| `YELP_API_KEY` | yelp.com/developers → Create App → Fusion API key (free) |
| `TWILIO_ACCOUNT_SID` / `TWILIO_AUTH_TOKEN` / `TWILIO_PHONE_NUMBER` | twilio.com console (free trial) — optional, only needed if you want SMS alerts |
| `SMTP_USER` / `SMTP_PASS` | Gmail: turn on 2FA, then create an **App Password** at myaccount.google.com/apppasswords — don't use your real Gmail password |
| `N8N_WEBHOOK_URL` | wherever your n8n instance runs — optional, leave default if unused |

## 3. Configure

```bash
cd backend
cp .env.example .env
```

Fill in every value from steps 1–2. Also set:
- `ADMIN_EMAIL` — already defaulted to `yadnesh.deshpande2.1@gmail.com`
- `ADMIN_PASSWORD` — your admin login password
- `ADMIN_PHONE` — your phone in E.164 format (e.g. `+14805551234`) if you want SMS alerts
- `APP_API_KEY` — anything; just needs to match between backend and `frontend/js/config.js` (next step)
- `FRONTEND_URL` — `http://localhost:3000` for local dev

Then edit `frontend/js/config.js` and fill in `SUPABASE_URL`, `SUPABASE_ANON_KEY`
(same values as `.env` — these are meant to be public), and `APP_API_KEY`
(must match `.env` exactly).

## 4. Install & run

```bash
cd backend
npm install
npm run seed      # creates your admin account in Supabase Auth
npm start         # http://localhost:3000
```

Open `http://localhost:3000` — the backend serves the frontend too, nothing
separate to run.

## 5. Day-to-day use

1. Log in as admin.
2. Either send owners the `/request-access.html` link, or create their
   account instantly yourself ("+ New owner account" — they'll get an invite
   email either way).
3. When a request comes in you'll get an email + SMS (if configured);
   review the Google match shown on the admin dashboard and Approve/Reject.
   Approving creates their login (via invite email) and their business record
   together.
4. Each business auto-matches to a Yelp + Google Places listing on first
   load and caches those IDs for fast, precise future refreshes. Generic
   names shared by multiple Tempe locations can be pinned manually via the
   edit modal (`yelp_id` / `google_place_id`).
5. Owners see only their own business — live ratings, recent Google reviews,
   and the AI advisor chat bubble (grounded in that live data via OpenAI).

## 6. Push updates to GitHub

If you already have the repo cloned locally:

```bash
cd LOCALPulse
# copy these new/changed files in over your existing repo folder, then:
git add .
git commit -m "Add Supabase auth, OpenAI chatbot, notifications, Vercel config"
git push
```

Starting fresh instead:

```bash
cd LOCALPulse
git init
git add .
git commit -m "Initial commit"
git branch -M main
git remote add origin https://github.com/<your-username>/LOCALPulse.git
git push -u origin main
```

Double-check `.env` never gets committed (it's in `.gitignore` already):

```bash
git status
git log --all --full-history -- backend/.env
```
Empty output on the second command = clean. If it ever shows up, rotate every key in it immediately — don't just delete the commit.

## 7. Deploy to Vercel

**No CLI token needed for this path** — Vercel's GitHub integration handles
auth via your GitHub login, not an API token.

1. Go to https://vercel.com → sign in with GitHub.
2. **Add New → Project** → pick your `LOCALPulse` repo → Import.
3. Framework Preset: leave as **Other** (the included `vercel.json` at the
   repo root tells Vercel how to build it — an Express serverless function
   under `/api/*` plus the `frontend/` folder served as static files).
4. **Root Directory**: leave as `.` (the repo root) — don't point it at
   `backend/` or `frontend/`, `vercel.json` needs to see both.
5. Before clicking Deploy, add **Environment Variables** (Project Settings →
   Environment Variables, or the form on this import screen) — copy every
   key from `backend/.env.example` with your real values:
   `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`,
   `ADMIN_EMAIL`, `ADMIN_PASSWORD`, `ADMIN_PHONE`, `OPENAI_API_KEY`,
   `OPENAI_MODEL`, `GOOGLE_PLACES_API_KEY`, `YELP_API_KEY`,
   `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_PHONE_NUMBER`,
   `APP_API_KEY`, `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`,
   `N8N_WEBHOOK_URL`.
   Skip `PORT` (Vercel manages that itself).
6. Set `FRONTEND_URL` and `ALLOWED_ORIGINS` to your real Vercel URL, e.g.
   `https://localpulse.vercel.app` (you'll know the exact URL after first
   deploy — you can go back and edit these env vars afterward, then
   redeploy).
7. Click **Deploy**.

### After first deploy — three things won't work until you do these:

1. **`frontend/js/config.js`** is a static file with hardcoded
   `SUPABASE_URL` / `SUPABASE_ANON_KEY` / `APP_API_KEY` — env vars don't
   reach static files automatically. Edit that file with your real values,
   commit, push — Vercel auto-redeploys on every push to `main`.
2. **Supabase redirect URL** — Dashboard → Authentication → URL
   Configuration → add `https://localpulse.vercel.app/set-password.html`
   (your real domain) to Redirect URLs, or invite emails will fail to land
   users on the right page.
3. **Re-run the seed script pointed at production** — `npm run seed` uses
   whatever `.env` is on your machine, so either run it locally with your
   real Supabase creds (safe — it just calls the Supabase Auth API, doesn't
   need to run *on* Vercel), or trigger it once via a temporary script.

### Testing the deployed site

1. Visit your Vercel URL → should show the login page.
2. `curl https://your-app.vercel.app/health` → `{"ok":true}` confirms the
   serverless function is live.
3. Log in as admin → try creating an owner invite → check that email
   actually arrives (tests Supabase Auth + your SMTP/email config together).
4. Submit a test request at `/request-access.html` → confirm you get the
   email/SMS notification → approve it → confirm the invite email arrives.
5. Once logged in as an owner, hit "Refresh live data" → confirms Yelp/Google
   keys work in production. Try the chatbot → confirms OpenAI key works.

Nothing here was deployable-and-testable from my side (no network access to
vercel.com, supabase.co, or the other services in my sandbox) — this is the
standard, correct pattern for an Express + static-frontend app on Vercel, but
you're the first real test of this specific deploy. Tell me what errors you
hit and I'll debug from there.

- Verification is admin-review-based, not automatic OAuth ownership proof —
  documented above, and intentional given the infra that'd otherwise be
  required.
- `APP_API_KEY` in `frontend/js/config.js` is visible to anyone viewing page
  source — it's a spam filter on the public request-access endpoint, not real
  security. Real security is the admin approval step + Supabase Auth.
- I could not test live calls to Supabase/OpenAI/Twilio/Gmail SMTP from my
  side (sandboxed, no outbound network to those domains) — I verified the
  server boots cleanly, all routes wire up, and error paths (bad/missing
  keys) fail gracefully without crashing. Test the live integrations on your
  end and tell me what breaks.
