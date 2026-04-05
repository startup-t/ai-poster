# AI Poster

An AI-powered e-commerce listing agent that converts simple product information into optimized marketplace listings, removes image backgrounds, and publishes to Shopify, TikTok Shop, Lazada, Shopee, and WooCommerce.

## Features

- **AI Listing Generation** — Claude (Anthropic) generates SEO titles, descriptions, bullet points, specs, and tags
- **Image Background Removal** — Remove.bg API removes product image backgrounds and replaces with white
- **Multi-Marketplace Publishing** — Live Shopify REST API + simulated TikTok Shop, Lazada, Shopee
- **Demo Mode** — Works fully without API keys using template-based generation
- **Approval Gate** — Never publishes automatically; always waits for explicit user approval

---

## Folder Structure

```
seller-agent/
├── index.html                  # Vite entry HTML
├── vite.config.js              # Vite config with Remove.bg proxy
├── package.json
├── .env.example                # Environment variable template
├── README.md
└── src/
    ├── main.js                 # App entry point & tab router
    ├── styles/
    │   └── main.css            # All global styles
    ├── api/
    │   ├── claude.js           # Anthropic API integration
    │   ├── removebg.js         # Remove.bg API + canvas fallback
    │   ├── shopify.js          # Shopify REST API (live)
    │   └── marketplaces.js     # TikTok Shop, Lazada, Shopee (simulated)
    ├── utils/
    │   └── parser.js           # Product input parser + fallback listing generator
    └── components/
        ├── Sidebar.js          # Sidebar navigation component
        ├── ListingChat.js      # Chat-based listing generation tab
        ├── ImageProcessor.js   # Drag-and-drop image background removal tab
        └── Publisher.js        # Multi-channel publishing tab
```

---

## Requirements

- **Node.js** v18 or higher — [Download](https://nodejs.org)
- **npm** v9 or higher (included with Node)
- A modern browser (Chrome, Firefox, Safari, Edge)

Optional for live functionality:
- [Anthropic API key](https://console.anthropic.com) — for real AI listing generation
- [Remove.bg API key](https://www.remove.bg/api) — for real background removal
- [Shopify Custom App](https://help.shopify.com/en/manual/apps/custom-apps) — for live Shopify publishing

---

## Setup

### 1. Clone or download the project

```bash
cd seller-agent
```

### 2. Install dependencies

```bash
npm install
```

### 3. Configure environment variables

Copy the example file and fill in your keys:

```bash
cp .env.example .env
```

Edit `.env`:

```env
# Required for real AI generation (optional — demo mode works without it)
VITE_ANTHROPIC_API_KEY=sk-ant-api03-...

# Required for real background removal (optional — demo mode works without it)
VITE_REMOVEBG_API_KEY=your-removebg-key

# Optional — pre-fills Shopify credentials in the publisher
VITE_SHOPIFY_DOMAIN=yourstore.myshopify.com
VITE_SHOPIFY_TOKEN=shpat_...
```

> **Note:** All `VITE_` prefixed variables are exposed to the browser. Never put server-side secrets here. For production, route Shopify and Remove.bg calls through your own backend server.

### 4. Run locally

```bash
npm run dev
```

The app opens automatically at [http://localhost:3000](http://localhost:3000).

---

## Usage

### Tab 1 — New listing
1. Type your product details in the chat (or click "Try example product")
2. If you have an Anthropic key, paste it in the API key bar — Claude will generate a real listing
3. Review the draft report (SEO title, description, bullets, specs, tags, readiness scores)
4. Type **go** or click **Open publisher** to proceed

### Tab 2 — Image processor
1. Drag and drop product images (JPG, PNG, WebP)
2. If you have a Remove.bg key, paste it — live background removal runs automatically
3. Without a key, a white background is composited using the Canvas API (demo mode)
4. Download processed PNG files

### Tab 3 — Publisher
1. Connect your Shopify store (domain + Admin API token with `write_products` scope)
2. Optionally connect TikTok Shop, Lazada, and Shopee (simulated in this version)
3. Select channels and click **Publish now**
4. View live results and listing URLs in the activity log

---

## Shopify API Setup

To get a Shopify Admin API token:

1. Go to your Shopify Admin → **Settings → Apps and sales channels → Develop apps**
2. Create a new custom app
3. Under **Configuration**, enable these API scopes:
   - `write_products`
   - `read_products`
   - `write_inventory`
   - `read_inventory`
4. Install the app and copy the **Admin API access token** (`shpat_...`)
5. Your store domain is `yourstore.myshopify.com`

---

## Production Notes

- **CORS:** Shopify API calls from the browser work for `localhost` in dev. In production, proxy them through your own backend.
- **Remove.bg:** The Vite dev proxy handles CORS in development. In production, call Remove.bg from your server.
- **TikTok Shop / Lazada / Shopee:** These require server-side OAuth flows. The simulated publishers in this project are placeholders — replace them with real API calls on your backend.
- **API keys in browser:** For production, never expose API keys in frontend code. Use a backend API layer.

---

## Scripts

| Command | Description |
|---|---|
| `npm run dev` | Start dev server at localhost:3000 |
| `npm run build` | Build for production (outputs to `dist/`) |
| `npm run preview` | Preview the production build locally |

---

## Tech Stack

- **Vite** — build tool and dev server
- **Vanilla JS** — no framework, fully modular ES modules
- **Anthropic API** — `claude-sonnet-4-20250514` for listing generation
- **Remove.bg API** — background removal
- **Shopify REST API** — product publishing (`2024-01`)
- **Canvas API** — demo background compositing
