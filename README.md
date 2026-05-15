# FamilyCalc

Maritime leave budget calculator. Single-page web app: enter assets, expenses, goals, and Russian investment instruments — see remaining funds and runway dynamically. RU/EN, dark/light, named scenarios, JSON backup, mobile-readable PDF.

## Quick start

```
nvm install 20
npm install
npm run dev          # http://localhost:5173
```

## Build & preview

```
npm run build        # outputs dist/
npm run preview      # serve dist/ locally
```

## Test

```
npm test             # vitest
```

## Deploy to GitHub Pages (no Actions used)

```
npm run deploy       # builds and pushes dist/ to gh-pages branch
```

Then enable GitHub Pages in repo Settings → Pages → Source: `gh-pages` branch.

## Architecture

See `docs/superpowers/specs/2026-05-14-family-calc-design.md`.
