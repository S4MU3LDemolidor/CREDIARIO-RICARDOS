import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { Modal } from './Modal'

describe('Modal', () => {
  it('nao renderiza nada quando closed', () => {
    render(<Modal open={false} title="Teste" onClose={() => {}}><p>Conteudo</p></Modal>)
    expect(screen.queryByText('Teste')).not.toBeInTheDocument()
  })

  it('renderiza titulo e children quando open', () => {
    render(<Modal open={true} title="Modal Teste" onClose={() => {}}><p>Conteudo do modal</p></Modal>)
    expect(screen.getByText('Modal Teste')).toBeInTheDocument()
    expect(screen.getByText('Conteudo do modal')).toBeInTheDocument()
  })

  it('chama onClose ao pressionar Escape', () => {
    const onClose = vi.fn()
    render(<Modal open={true} title="Teste" onClose={onClose}><p>x</p></Modal>)
    fireEvent.keyDown(document, { key: 'Escape' })
    expect(onClose).toHaveBeenCalledOnce()
  })

  it('chama onClose ao clicar no backdrop', () => {
    const onClose = vi.fn()
    render(<Modal open={true} title="Teste" onClose={onClose}><p>x</p></Modal>)
    const backdrop = screen.getByRole('dialog')
    fireEvent.click(backdrop)
    expect(onClose).toHaveBeenCalledOnce()
  })
})
