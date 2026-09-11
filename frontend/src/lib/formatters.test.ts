import { describe, it, expect } from 'vitest'
import { stripCPF, formatCPF, isValidCPF } from './formatters'

describe('stripCPF', () => {
  it('remove pontos e traco', () => {
    expect(stripCPF('123.456.789-09')).toBe('12345678909')
  })
  it('deixa so digitos inalterados', () => {
    expect(stripCPF('12345678909')).toBe('12345678909')
  })
  it('remove espacos e outros caracteres', () => {
    expect(stripCPF('123 456 789 09')).toBe('12345678909')
  })
})

describe('formatCPF', () => {
  it('formata 11 digitos com mascara completa', () => {
    expect(formatCPF('12345678909')).toBe('123.456.789-09')
  })
  it('formata CPF ja mascarado sem duplicar', () => {
    expect(formatCPF('123.456.789-09')).toBe('123.456.789-09')
  })
  it('formata CPF parcial com 6 digitos', () => {
    expect(formatCPF('123456')).toBe('123.456')
  })
  it('formata CPF parcial com 3 digitos', () => {
    expect(formatCPF('123')).toBe('123')
  })
  it('formata CPF parcial com 9 digitos', () => {
    expect(formatCPF('123456789')).toBe('123.456.789')
  })
})

describe('isValidCPF', () => {
  it('retorna true para CPF com 11 digitos', () => {
    expect(isValidCPF('12345678909')).toBe(true)
  })
  it('retorna true para CPF mascarado com 11 digitos', () => {
    expect(isValidCPF('123.456.789-09')).toBe(true)
  })
  it('retorna false para CPF curto', () => {
    expect(isValidCPF('12345678')).toBe(false)
  })
  it('retorna false para string vazia', () => {
    expect(isValidCPF('')).toBe(false)
  })
})
