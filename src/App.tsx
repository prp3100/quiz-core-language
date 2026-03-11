import { motion } from 'framer-motion'
import { CloudUpload, Palette, Rocket } from 'lucide-react'

function App() {
  const cards = [
    {
      title: 'Theme-first UI',
      text: 'พร้อมต่อยอดด้วยธีมเฉพาะโปรเจกต์ โดยโครงสร้างสีและ spacing ถูกวางฐานไว้แล้ว',
      icon: Palette,
    },
    {
      title: 'Deploy-ready',
      text: 'รองรับการ push ขึ้น Git และ deploy ต่อไปยัง Vercel, Netlify หรือ Cloudflare Pages ได้ทันที',
      icon: CloudUpload,
    },
    {
      title: 'Fast Frontend Stack',
      text: 'React 19 + TypeScript + Vite 8 + Tailwind 4 สำหรับ workflow ที่เร็วและดูแลต่อได้ง่าย',
      icon: Rocket,
    },
  ]

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-6xl items-center px-6 py-14 md:px-10">
      <section className="grid w-full gap-8 md:grid-cols-[1.2fr_1fr]">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="space-y-6"
        >
          <p className="inline-flex rounded-full border border-[var(--line)] bg-[var(--card)] px-3 py-1 text-sm font-medium text-[var(--ink-soft)]">
            Frontend setup complete
          </p>

          <h1
            className="text-4xl font-bold leading-tight tracking-tight md:text-6xl"
            style={{ fontFamily: 'Sora, sans-serif' }}
          >
            Starter ที่พร้อมทำเว็บสวย
            <span className="block text-[var(--accent)]">และปล่อยขึ้น hosting</span>
          </h1>

          <p className="max-w-xl text-base text-[var(--ink-soft)] md:text-lg">
            เมื่อคุณส่งรายละเอียดว่าอยากทำเว็บอะไร ผมสามารถต่อยอดจากโครงนี้เป็นดีไซน์จริงของโปรเจกต์ได้ทันที
            โดยไม่ต้องเริ่มตั้งค่าพื้นฐานใหม่
          </p>

          <div className="flex flex-wrap gap-3 pt-2">
            <button className="rounded-xl bg-[var(--accent)] px-5 py-3 text-sm font-semibold text-white shadow-[0_8px_20px_rgba(234,91,42,0.35)] transition hover:translate-y-[-1px] hover:shadow-[0_12px_28px_rgba(234,91,42,0.42)]">
              Start Building
            </button>
            <button className="rounded-xl border border-[var(--line)] bg-[var(--card)] px-5 py-3 text-sm font-semibold text-[var(--ink)] transition hover:bg-white">
              Add Your Theme
            </button>
          </div>
        </motion.div>

        <div className="grid gap-4">
          {cards.map((card, index) => {
            const Icon = card.icon

            return (
              <motion.article
                key={card.title}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.5, delay: 0.15 * (index + 1) }}
                className="rounded-2xl border border-[var(--line)] bg-[var(--card)] p-5 shadow-[0_6px_24px_rgba(31,27,22,0.08)]"
              >
                <div className="mb-3 inline-flex rounded-lg bg-white p-2 text-[var(--accent)]">
                  <Icon size={20} />
                </div>
                <h2 className="text-lg font-bold">{card.title}</h2>
                <p className="mt-1 text-sm text-[var(--ink-soft)]">{card.text}</p>
              </motion.article>
            )
          })}
        </div>
      </section>
    </main>
  )
}

export default App
