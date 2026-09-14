import { Component, ErrorInfo, ReactNode } from 'react'

interface Props { children: ReactNode }
interface State { error: Error | null }

export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null }

  static getDerivedStateFromError(error: Error): State {
    return { error }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('[ErrorBoundary]', error, info.componentStack)
  }

  render() {
    if (this.state.error) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-[#f9fafb]">
          <div className="bg-white border border-[#e5e7eb] rounded-xl p-10 max-w-md w-full text-center space-y-4">
            <div className="w-10 h-10 rounded-full bg-[#fee2e2] flex items-center justify-center mx-auto">
              <svg className="w-5 h-5 text-[#aa0000]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                  d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" />
              </svg>
            </div>
            <div>
              <h2 className="font-semibold text-[#111827]">Algo deu errado</h2>
              <p className="text-sm text-[#6b7280] mt-1">Recarregue a página. Se o problema persistir, contate o suporte.</p>
            </div>
            <details className="text-left text-xs text-[#9ca3af]">
              <summary className="cursor-pointer hover:text-[#6b7280] transition-colors">Detalhes técnicos</summary>
              <p className="mt-2 font-mono bg-[#f9fafb] p-3 rounded-lg border border-[#e5e7eb] text-[#6b7280] break-all">
                {this.state.error.message}
              </p>
            </details>
            <button
              onClick={() => window.location.reload()}
              className="px-4 py-2 bg-[#111827] text-white rounded-lg text-sm font-semibold hover:bg-[#374151] transition-colors"
            >
              Recarregar
            </button>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}
