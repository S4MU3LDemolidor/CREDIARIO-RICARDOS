import { assertEquals } from 'jsr:@std/assert'
import { aplicarRegra, validarCPF } from './index.ts'

Deno.test('score 0 -> NEGADO',     () => assertEquals(aplicarRegra(0),    'NEGADO'))
Deno.test('score 600 -> NEGADO',   () => assertEquals(aplicarRegra(600),  'NEGADO'))
Deno.test('score 601 -> MANUAL',   () => assertEquals(aplicarRegra(601),  'MANUAL'))
Deno.test('score 700 -> MANUAL',   () => assertEquals(aplicarRegra(700),  'MANUAL'))
Deno.test('score 701 -> APROVADO', () => assertEquals(aplicarRegra(701),  'APROVADO'))
Deno.test('score 1000 -> APROVADO',() => assertEquals(aplicarRegra(1000), 'APROVADO'))

Deno.test('validarCPF: CPF valido 52998224725',           () => assertEquals(validarCPF('52998224725'), true))
Deno.test('validarCPF: CPF invalido digito errado',       () => assertEquals(validarCPF('52998224726'), false))
Deno.test('validarCPF: sequencia repetida 11111111111',   () => assertEquals(validarCPF('11111111111'), false))
Deno.test('validarCPF: sequencia repetida 00000000000',   () => assertEquals(validarCPF('00000000000'), false))
Deno.test('validarCPF: comprimento errado 1234567890',    () => assertEquals(validarCPF('1234567890'),  false))
