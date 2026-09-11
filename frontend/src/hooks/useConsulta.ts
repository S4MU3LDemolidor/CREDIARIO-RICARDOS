import { useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import { Resultado } from '../types'

type ConsultaState =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'resultado'; data: Resultado }

export function useConsulta() {
  const [state, setState] = useState<ConsultaState>({ status: 'idle' })

  async function consultar(
    cpf: string,
    documentoConferido: boolean,
    motivoForca?: string
  ) {
    setState({ status: 'loading' })

    const { data, error } = await supabase.functions.invoke('consultar-cpf', {
      body: {
        cpf,
        documento_conferido: documentoConferido,
        ...(motivoForca ? { motivo_forca: motivoForca } : {}),
      },
    })

    if (error) {
      setState({
        status: 'resultado',
        data: { tipo: 'erro_sistema', motivo: error.message },
      })
    } else {
      setState({ status: 'resultado', data: data as Resultado })
    }
  }

  function reset() {
    setState({ status: 'idle' })
  }

  return { state, consultar, reset }
}
