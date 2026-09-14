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

describe('isValidCPF — digitos verificadores', () => {
  it('retorna true para CPF valido 529.982.247-25', () => {
    expect(isValidCPF('529.982.247-25')).toBe(true)
  })
  it('retorna true para CPF valido sem mascara 52998224725', () => {
    expect(isValidCPF('52998224725')).toBe(true)
  })
  it('retorna false para CPF com digito verificador errado', () => {
    expect(isValidCPF('529.982.247-26')).toBe(false)
  })
  it('retorna false para sequencia repetida 111.111.111-11', () => {
    expect(isValidCPF('111.111.111-11')).toBe(false)
  })
  it('retorna false para sequencia repetida 000.000.000-00', () => {
    expect(isValidCPF('000.000.000-00')).toBe(false)
  })
  it('retorna false para 999.999.999-99', () => {
    expect(isValidCPF('999.999.999-99')).toBe(false)
  })
})
