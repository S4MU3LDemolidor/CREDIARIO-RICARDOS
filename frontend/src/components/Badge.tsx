import { Veredito } from '../types'

const BADGE_STYLES: Record<Veredito, string> = {
  APROVADO: 'bg-green-100 text-green-800',
  MANUAL:   'bg-yellow-100 text-yellow-800',
  NEGADO:   'bg-red-100 text-red-800',
}

const BADGE_LABELS: Record<Veredito, string> = {
  APROVADO: 'Aprovado',
  MANUAL:   'Análise Manual',
  NEGADO:   'Negado',
}

export function VeredittoBadge({ veredito }: { veredito: Veredito }) {
  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${BADGE_STYLES[veredito]}`}
    >
      {BADGE_LABELS[veredito]}
    </span>
  )
}

export function scoreColor(score: number): string {
  if (score <= 600) return 'text-red-600'
  if (score <= 700) return 'text-yellow-600'
  return 'text-green-600'
}

export function scoreBg(score: number): string {
  if (score <= 600) return 'bg-red-50 border-red-200'
  if (score <= 700) return 'bg-yellow-50 border-yellow-200'
  return 'bg-green-50 border-green-200'
}
