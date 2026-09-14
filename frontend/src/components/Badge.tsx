import { Veredito } from '../types'

const BADGE_CFG: Record<Veredito, { text: string; cls: string }> = {
  APROVADO: { text: 'Aprovado',       cls: 'bg-[#dcfce7] text-[#16a34a] ring-1 ring-[#86efac]' },
  MANUAL:   { text: 'Análise Manual', cls: 'bg-[#fef9c3] text-[#b45309] ring-1 ring-[#fde047]' },
  NEGADO:   { text: 'Negado',         cls: 'bg-[#fee2e2] text-[#aa0000] ring-1 ring-[#fca5a5]' },
}

export function VeredittoBadge({ veredito }: { veredito: Veredito }) {
  const { text, cls } = BADGE_CFG[veredito]
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-semibold ${cls}`}>
      {text}
    </span>
  )
}

export function scoreColor(score: number): string {
  if (score <= 500) return 'text-[#aa0000]'
  if (score <= 650) return 'text-[#b45309]'
  return 'text-[#111827]'
}
