# LuckyPick Global

> Personal lucky number picker for Powerball & Mega Millions.

A free, no-signup PWA that lets you add personal factors (zodiac, dreams, birthday) to generate lottery numbers.

**For entertainment purposes only. Not affiliated with Powerball, Mega Millions, or any official lottery operator.**

---

## Features

- 🎲 **Two games**: Powerball (5/69 + 1/26) and Mega Millions (5/70 + 1/25)
- 🪐 **Personal factors**: zodiac signs, dream symbols, life path numbers, lucky numbers, dates
- 📱 **PWA**: install to home screen on iOS/Android, works offline
- 🆓 **Free, no ads, no signup, no tracking**
- 🌍 **English-only** (separate Chinese version at `lucky-pick` repo)

---

## Quick Start

Visit the deployed site:

```
https://hinewly.github.io/lucky-pick-global/
```

Or run locally:

```bash
cd public && python3 -m http.server 8765
# Open http://localhost:8765
```

---

## Project Structure

```
lucky-pick-global/
├── public/
│   ├── index.html              # Main page (English)
│   ├── manifest.json           # PWA config
│   ├── service-worker.js       # Offline cache
│   ├── css/styles.css          # Styles
│   ├── js/engine.js            # Number generation
│   ├── js/app.js               # UI logic
│   ├── data/
│   │   ├── powerball.js        # Demo data
│   │   └── megamillions.js     # Demo data
│   └── icons/                  # PWA icons
├── .github/workflows/deploy.yml # GitHub Pages auto-deploy
└── README.md
```

---

## How It Works

The algorithm combines:
- **Personal factors** (zodiac, dreams, life path, etc.) — affects probability weights
- **Historical frequency** — hot/cold numbers from recent draws
- **Random component** — ensures unpredictability
- **Avoid numbers** — drastically reduces weight

Each set is generated independently. The algorithm does **not** improve winning odds — all sets have the same probability of winning as any random selection.

---

## Development

### Update Historical Data

Each game ships with ~50 recent draws from [lotteryusa.com](https://www.lotteryusa.com/) (auto-fetched).

To refresh the data manually:

```bash
node src/fetch_global.mjs
# then bump CACHE_VERSION in public/service-worker.js and commit
```

Or just trigger the **Weekly lottery data fetch** workflow from the Actions tab — it does all of the above (fetch → detect changes → bump SW → commit → push) automatically.

Data files (`public/data/powerball.js`, `public/data/megamillions.js`) are in `[newest, ..., oldest]` order, with shape:

```js
window.POWERBALL = [
  { "date": "YYYY-MM-DD", "main": [n1, n2, n3, n4, n5], "extra": [powerball] },
  // ...
];
```

### Deploy

Push to `main` branch → GitHub Actions auto-deploys to GitHub Pages (1-2 minutes).

---

## Compliance

This app:
- Does NOT sell lottery tickets
- Does NOT predict winning numbers
- Does NOT collect personal data
- Is for entertainment only

You must be **18+** to play any lottery. Play responsibly.

---

## Support

If this tool helped you pick numbers, consider supporting its development:

☕ **Tip via PayPal**: [paypal.me/hinewly](https://paypal.me/hinewly)

---

## License

Personal project. Code may be reused for educational purposes.

---

## Related Projects

- **lucky-pick** (sibling repo): Chinese version for Chinese lotteries (大乐透, 七星彩)

## Game Rules Reference

See [LOTTERIES.md](./LOTTERIES.md) for detailed rules, prize tiers, and how-to-play
guides for all 4 supported lotteries (Powerball, Mega Millions, EuroMillions, UK Lotto).
