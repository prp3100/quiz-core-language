# Bilingual Code-Language Quiz

Single-page React quiz for beginners to practice identifying languages and coding topics from plain-text snippets.

## Features

- Hardcoded bank of 60 questions
- Random 30-question round with balanced language spread
- 30-second timer per question
- Immediate feedback after each answer
- TH / EN interface toggle with locale persistence
- Final score, correct/wrong totals, and 7 rating bands
- Guide-first flow with lightweight static hero panels instead of 3D menu animation
- Softer warm-beige theme tuned to reduce harsh white glare

## Stack

- React 19
- TypeScript 5.9
- Vite 8
- Tailwind CSS 4
- Framer Motion
- Lucide React

## Local development

```bash
npm install
npm run dev
```

Do not open the root `index.html` directly in a browser or serve the project root with Live Server.
Vite must transform `src/main.tsx` into browser-ready JavaScript during development.

## Production build

```bash
npm run build
npm run preview
```

For static hosting, deploy the built files from `dist`, not the project root.

## Deploy

The app builds to `dist` and can be hosted as a static site.

- GitHub Pages via `.github/workflows/deploy-pages.yml`
- Vercel with `npm run build` and output `dist`
- Netlify with `npm run build` and publish directory `dist`
- Cloudflare Pages with `npm run build` and output `dist`

### GitHub Pages checklist

1. Push the repository to GitHub and keep the default deployment branch as `main`.
2. In the repository settings, open Pages and set the source to `GitHub Actions`.
3. Push to `main` to trigger `.github/workflows/deploy-pages.yml`.
4. Wait for the Pages deployment job to finish, then open the generated site URL.

The app is ready for GitHub Pages because the Vite build uses relative asset paths and deploys the static `dist` output directly.
