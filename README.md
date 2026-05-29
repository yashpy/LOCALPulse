# 🏙️ LocalPulse — AI Business Intelligence for Tempe Small Businesses

> **Built by an ASU MS CS student, for the Tempe community.**
> Giving local businesses the same data superpowers that Fortune 500 companies have — at 1/100th the cost.

![LocalPulse Dashboard](docs/dashboard-preview.png)

---

## 🚀 What is LocalPulse?

LocalPulse is a **cloud-powered business intelligence + automation platform** built specifically for small businesses in Tempe, AZ (expanding to all college towns).

It connects to a business's existing tools (Google, Yelp, Square POS) and gives them:

- 📊 **Real-time dashboard** — reviews, foot traffic, revenue trends in one place
- 🤖 **AI-powered automations** — auto-respond to reviews, SMS promos during slow hours
- 💡 **Weekly AI insights** — plain English reports: *"Your slowest day is Tuesday — here's what to do"*
- ☁️ **Fully cloud-hosted** — nothing to install, works on any device

---

## 🛠️ Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend | Vanilla HTML/CSS/JS (no framework needed) |
| Backend | Node.js + Express |
| Database | Supabase (PostgreSQL) |
| Cloud | AWS Lambda + S3 (or self-hosted) |
| Automation | n8n (self-hosted) |
| AI | OpenAI GPT-4o API |
| SMS | Twilio |
| Reviews | Google Places API + Yelp Fusion API |

---

## 📁 Project Structure

```
localpulse/
├── frontend/
│   ├── index.html          # Main business dashboard
│   └── landing.html        # Marketing landing page
├── backend/
│   ├── server.js           # Express API server
│   ├── routes/
│   │   ├── reviews.js      # Review fetching + AI response generation
│   │   ├── insights.js     # AI insights engine
│   │   ├── automation.js   # Trigger automations
│   │   └── businesses.js   # Business CRUD
│   ├── services/
│   │   ├── openai.js       # GPT-4o wrapper
│   │   ├── google.js       # Google Places API
│   │   ├── yelp.js         # Yelp Fusion API
│   │   └── twilio.js       # SMS automations
│   └── middleware/
│       └── auth.js         # API key auth
├── n8n-workflows/
│   ├── review-auto-responder.json     # Auto-respond to new reviews
│   ├── weekly-insights-email.json     # Weekly AI digest email
│   └── slow-hours-sms-promo.json      # SMS promo during slow times
├── database/
│   └── schema.sql          # Full Supabase schema
└── .env.example            # All required env variables
```

---

## ⚡ Quick Start

### 1. Clone the repo
```bash
git clone https://github.com/YOUR_USERNAME/localpulse.git
cd localpulse
```

### 2. Install backend dependencies
```bash
cd backend
npm install
```

### 3. Set up environment variables
```bash
cp .env.example .env
# Fill in your API keys (see .env.example for instructions)
```

### 4. Set up the database
- Create a free project at [supabase.com](https://supabase.com)
- Run `database/schema.sql` in the Supabase SQL editor

### 5. Start the backend
```bash
npm run dev
```

### 6. Open the dashboard
Open `frontend/index.html` in your browser — or deploy to Netlify (free).

### 7. Import n8n workflows
- Install n8n: `npm install -g n8n`
- Start n8n: `n8n start`
- Import workflows from `n8n-workflows/` folder

---

## 💰 Business Model in Future

| Plan | Price | Features |
|------|-------|---------|
| Starter | $199/mo | Dashboard + reviews |
| Growth | $349/mo | + Automations + AI insights |
| Pro | $499/mo | + Custom reports + priority support |

**Target:** 50 businesses in Tempe/Scottsdale = **$17,500/month MRR**

---

## 🗺️ Roadmap

- [x] v0.1 — Dashboard MVP + Review monitoring
- [x] v0.1 — n8n automation workflows
- [ ] v0.2 — Square POS integration
- [ ] v0.2 — Foot traffic data (via Placer.ai API)
- [ ] v0.3 — Multi-location support
- [ ] v0.4 — Expand to other college towns (Tucson, Boulder, Austin)

---

## 👨‍💻 About

Built by **LocalPulse Founder**, MS CS student at **Arizona State University**.

