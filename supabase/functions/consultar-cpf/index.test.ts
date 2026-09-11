import { assertEquals } from 'jsr:@std/assert'
import { aplicarRegra } from './index.ts'

Deno.test('score 0 -> NEGADO',    () => assertEquals(aplicarRegra(0),    'NEGADO'))
Deno.test('score 600 -> NEGADO',  () => assertEquals(aplicarRegra(600),  'NEGADO'))
Deno.test('score 601 -> MANUAL',  () => assertEquals(aplicarRegra(601),  'MANUAL'))
Deno.test('score 700 -> MANUAL',  () => assertEquals(aplicarRegra(700),  'MANUAL'))
Deno.test('score 701 -> APROVADO',() => assertEquals(aplicarRegra(701),  'APROVADO'))
Deno.test('score 1000 -> APROVADO',()=> assertEquals(aplicarRegra(1000), 'APROVADO'))
