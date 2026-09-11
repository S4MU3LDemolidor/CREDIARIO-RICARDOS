import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import { VeredittoBadge, scoreColor, scoreBg } from './Badge'

describe('VeredittoBadge', () => {
  it('exibe texto Aprovado para APROVADO', () => {
    render(<VeredittoBadge veredito="APROVADO" />)
    expect(screen.getByText('Aprovado')).toBeInTheDocument()
  })
  it('exibe texto Analise Manual para MANUAL', () => {
    render(<VeredittoBadge veredito="MANUAL" />)
    expect(screen.getByText('Análise Manual')).toBeInTheDocument()
  })
  it('exibe texto Negado para NEGADO', () => {
    render(<VeredittoBadge veredito="NEGADO" />)
    expect(screen.getByText('Negado')).toBeInTheDocument()
  })
})

describe('scoreColor', () => {
  it('retorna classe vermelha para score <= 600', () => {
    expect(scoreColor(0)).toContain('red')
    expect(scoreColor(600)).toContain('red')
  })
  it('retorna classe amarela para score 601-700', () => {
    expect(scoreColor(601)).toContain('yellow')
    expect(scoreColor(700)).toContain('yellow')
  })
  it('retorna classe verde para score >= 701', () => {
    expect(scoreColor(701)).toContain('green')
    expect(scoreColor(1000)).toContain('green')
  })
})

describe('scoreBg', () => {
  it('retorna bg vermelho para score <= 600', () => {
    expect(scoreBg(500)).toContain('red')
  })
  it('retorna bg amarelo para score 601-700', () => {
    expect(scoreBg(650)).toContain('yellow')
  })
  it('retorna bg verde para score >= 701', () => {
    expect(scoreBg(800)).toContain('green')
  })
})
