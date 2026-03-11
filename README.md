# Frontend Starter (2026)

Modern frontend starter สำหรับทำเว็บสวยๆ และพร้อม deploy ขึ้น hosting ผ่าน Git

## Stack

- React 19
- TypeScript 5.9
- Vite 8
- Tailwind CSS 4 (`@tailwindcss/vite`)
- Framer Motion
- Lucide React
- clsx

## Run

```bash
npm install
npm run dev
```

## Build

```bash
npm run build
npm run preview
```

## Push ขึ้น Git

```bash
git init
git add .
git commit -m "chore: initialize frontend starter"
git branch -M main
git remote add origin <YOUR_GIT_REPO_URL>
git push -u origin main
```

## Deploy Hosting (แนะนำ)

### Vercel

1. Import repository
2. Framework preset: `Vite`
3. Build command: `npm run build`
4. Output directory: `dist`

### Netlify

1. Import repository
2. Build command: `npm run build`
3. Publish directory: `dist`

### Cloudflare Pages

1. Connect repository
2. Build command: `npm run build`
3. Build output directory: `dist`

## Next Step

ส่งข้อมูลธีม/ประเภทเว็บที่ต้องการ แล้วสามารถต่อยอดจากโครงนี้ได้ทันที
