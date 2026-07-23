# LOCALPulse (simple build)

Multi-tenant dashboard for Tempe, AZ business owners. An **admin** sees every
business; each **owner** sees only their own — enforced at the database
level with real Postgres Row-Level Security, not just app-side filtering.

Stack: **Node.js/Express** REST API, **PostgreSQL + RLS**, **JWT** auth,
**GPT-4o** for review analytics, live **Yelp** + **Google Places** data,
plain **React (via CDN, no build step)** frontend.

This is a deliberately simple first pass — one owner per business, one
business per owner, no Supabase/Twilio/email/n8n layer yet. Those can be
added later (see "Growing this up" below) without changing the schema.

## 1. Create a Postgres database

Any Postgres 13+ works — local, Docker, Supabase, Neon, Render, etc.

```bash
createdb localpulse
psql localpulse -f backend/db/schema.sql
```

## 2. Configure

```bash
cd backend
cp .env.example .env
```

Fill in:
- `DATABASE_URL` — your Postgres connection string
- `JWT_SECRET` — any long random string
- `ADMIN_EMAIL` / `ADMIN_PASSWORD` — your admin login
- AI advisor — set `AI_PROVIDER` to `openai` or `groq`:
  - `openai`: fill in `OPENAI_API_KEY` (paid, usage-based). `AI_MODEL` defaults to `gpt-4o`.
  - `groq`: fill in `GROQ_API_KEY` (free, no card, from console.groq.com/keys). `AI_MODEL` defaults to `llama-3.3-70b-versatile` — Groq only serves open models, not `gpt-4o`.
- `YELP_API_KEY` — from yelp.com/developers (Fusion API)
- `GOOGLE_PLACES_API_KEY` — from console.cloud.google.com (enable Places API)

Yelp/Google/OpenAI keys are optional to get the app running — endpoints that
need them will just return a clear `{"error": "...API_KEY not configured"}`
instead of crashing.

## 3. Install & run

```bash
npm install
npm run seed    # creates your admin account
npm start        # http://localhost:3000
```

The Express server also serves `frontend/`, so there's nothing separate to run.

## 4. Use it

1. Go to `http://localhost:3000`, sign in as admin.
2. Click **+ New owner account** — give it an email, temp password, and
   business name/address. That creates the owner's login **and** their
   business row in one step (no invite-email flow in this simple version —
   just hand them the email/password directly, or wire up email later).
3. On a business card, click **Refresh live data** to pull Yelp + Google
   ratings/reviews (first call auto-matches by name+address in Tempe and
   caches the IDs; you can also pin `yelp_id` / `google_place_id` manually
   via **Edit** if the auto-match picks the wrong location).
4. Click **AI advisor** to ask GPT-4o questions about the business's live
   ratings/reviews, or request a general summary.
5. Sign in as an owner (the email/password you created in step 2) to see
   the owner's view — only their own business, same actions minus delete
   and account creation.

## How multi-tenancy actually works

Every `businesses` row has an `owner_id`. On every request, the backend
(`db.js` → `tenantQuery`) sets two Postgres session variables —
`app.current_user_id` and `app.current_role` — inside the same transaction
as the query. Row-Level Security policies in `schema.sql` use those to
filter rows automatically:

- `role = 'admin'` → sees all rows.
- otherwise → sees only rows where `owner_id = current_user_id`.

This means even a bug in the route code (e.g. forgetting a `WHERE owner_id
= ...` clause) can't leak another tenant's data — the database itself won't
return rows the session isn't allowed to see.

## CRUD map

| Action | Route |
|---|---|
| List businesses (tenant-scoped) | `GET /api/businesses` |
| Get one | `GET /api/businesses/:id` |
| Create (admin) | `POST /api/businesses` |
| Update (name/address/yelp id/google id) | `PUT /api/businesses/:id` |
| Delete (admin) | `DELETE /api/businesses/:id` |
| Pull live Yelp+Google data | `POST /api/businesses/:id/refresh` |
| Ask the AI advisor | `POST /api/businesses/:id/advisor` |
| Chat history | `GET /api/businesses/:id/chat` |
| Login | `POST /api/auth/login` |
| Create owner account (admin) | `POST /api/auth/owners` |

## Growing this up

The original README you had describes a richer version of this same idea:
Supabase-hosted Postgres + Auth (so you get invite emails for free), a
public `/request-access.html` flow with admin approval instead of admin
always creating accounts directly, Twilio SMS + SMTP notifications on new
requests, and n8n webhooks. None of that changes the core schema or RLS
model here — it mostly adds a `signup_requests` table and swaps this app's
own JWT auth for Supabase Auth. Happy to layer those in once this simple
version is working end-to-end for you.

## Deploying

`vercel.json` at the repo root routes `/api/*` to the Express app as a
serverless function and serves `frontend/` as static files — same pattern
as before. Push to GitHub, import the repo in Vercel, add the env vars from
`.env.example`, deploy, then run `npm run seed` once against your
production `DATABASE_URL` to create the admin account.
