# Brutto-Netto-Rechner 2026

A privacy-friendly German payroll calculator (Brutto-Netto) for 2026, built with Next.js 14 and Tailwind CSS. Bilingual (DE/EN), fully client-side, no tracking.

## Features

- Accurate 2026 calculation matching real payslips (verified against actual Lohnabrechnungen)
- All 6 Steuerklassen including **Steuerklasse IV with Faktor** (§ 39f EStG)
- All 16 Bundesländer with correct Kirchensteuersatz
- Dienstwagen: 1,0 % (Verbrenner) / 0,5 % (Hybrid, EV > 100k) / 0,25 % (EV ≤ 100k)
- Betriebliche Altersvorsorge (bAV) with correct 8 %/4 % BBG caps
- Kinderfreibetrag with correct halving for monthly LSt + full claim for Soli/KiSt
- GKV / PKV switching
- Full DE/EN translation with auto-detection
- "How to use" help panel
- Imprint + Privacy Policy modals
- Schema.org structured data for SEO
- Sitemap + robots.txt generated automatically

## Quick start

```bash
# Install dependencies
npm install

# Copy and edit environment file
cp .env.example .env.local
# Edit .env.local — set NEXT_PUBLIC_SITE_URL to your real domain

# Start dev server
npm run dev

# Production build
npm run build && npm run start
```

Open <http://localhost:3000> in your browser.

## Deploy to Vercel

1. Push this repo to GitHub.
2. Go to <https://vercel.com/new>, import the GitHub repo.
3. In Vercel project settings → Environment Variables, add:
   - `NEXT_PUBLIC_SITE_URL` = `https://your-domain.de`
4. Click Deploy. You're live in ~60 seconds.
5. Add your custom domain in Vercel → Settings → Domains.

## SEO setup

The site has comprehensive SEO baked in. After deployment:

### 1. Verify with Google Search Console
- Go to <https://search.google.com/search-console>
- Add property using your domain (DNS verification recommended)
- Submit `https://your-domain.de/sitemap.xml`
- Optional: add the meta verification tag to `app/layout.tsx` under `metadata.verification`

### 2. Verify with Bing Webmaster Tools
- Go to <https://www.bing.com/webmasters>
- Import from Google Search Console (one click), or add manually

### 3. Optional content marketing
The technical SEO is set up correctly, but ranking in this niche needs *content*. Consider writing one in-depth article per quarter on long-tail topics — `/blog/dienstwagen-2026`, `/blog/bav-erklaert`, `/blog/steuerklasse-iv-faktor`. The big calculator sites often have thin or outdated explanations; thoughtful content is your edge.

### 4. Privacy-friendly analytics (optional)
The current site has NO analytics — fully consistent with the privacy policy. If you want stats:

- **Vercel Web Analytics** — privacy-friendly, no cookies, GDPR-safe. Enable in Vercel dashboard, then add `@vercel/analytics` package. Update the Datenschutz text to disclose this.
- **Plausible** (self-hosted) — totally GDPR-compliant, no cookies, no PII.
- **Server logs only** — already covered by your current privacy text. No action needed.

Whichever you choose, update the `privacyCookies` and `privacyHosting` translations in `BruttoNettoCalculator.jsx` accordingly.

## Customize the Impressum

Before going live, fill in your real Impressum data. Open `components/BruttoNettoCalculator.jsx` and search for:

- `impressumOperator` (German + English versions)
- `impressumContact`
- `impressumResp`

Replace the `[Vor- und Nachname]`, `[Straße und Hausnummer]`, etc. placeholders with your actual ladungsfähige Anschrift. German Impressum law requires a real physical address — no P.O. Boxes.

## Project structure

```
brutto-netto-app/
├── app/
│   ├── layout.tsx          # Root layout with full SEO metadata + JSON-LD
│   ├── page.tsx            # Home page (imports calculator)
│   ├── sitemap.ts          # Auto-generates /sitemap.xml
│   ├── robots.ts           # Auto-generates /robots.txt
│   └── globals.css         # Tailwind imports
├── components/
│   └── BruttoNettoCalculator.jsx   # The calculator (client component)
├── public/                 # Static assets (favicon, og-image, etc.)
├── next.config.js
├── tailwind.config.js
├── tsconfig.json
├── .env.example
└── package.json
```

## Add a favicon and OG image

For maximum SEO polish, add these files to `public/`:

- `favicon.ico` — 32×32 favicon
- `icon.png` — 192×192 (Android home screen)
- `apple-icon.png` — 180×180 (iOS)
- `opengraph-image.png` — 1200×630 (Twitter/Facebook share card)

Next.js will auto-detect and serve them. No code changes needed.

## Performance

- Server-rendered HTML for fast first paint
- Tailwind generates only the CSS classes used (small bundle)
- Component is client-side because of React state — first paint is HTML+CSS, JS hydrates after
- Google Lighthouse: should score 95+ on all axes out of the box

## License

(Pick one — e.g. MIT for open source, or remove this section for proprietary.)

## Disclaimer

This calculator implements the official 2026 BMF formulas as accurately as a simplified model can. It is not a substitute for professional tax advice or certified payroll software. See the Disclaimer text in the app itself.
