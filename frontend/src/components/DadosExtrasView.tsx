import {
  DadosExtras, NivelSocioeconomico, ProcessosJudiciais,
  AntecedentesCriminais, ValidacaoCadastral, CadastroPF,
  AssistenciaSocial, ApiErro,
  BoaVistaAcertaPF, ProtestosBrasil,
} from '../types'

export function CardExtra({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return (
    <div className="border-t border-[#f0f0f0] px-5 py-4 space-y-3">
      <p className="text-[10px] text-[#bbb] uppercase tracking-[0.15em] font-semibold">{titulo}</p>
      {children}
    </div>
  )
}

export function Campo({ label, value }: { label: string; value: unknown }) {
  const display = value === null || value === undefined || value === '' ? '—' : String(value)
  return (
    <div className="flex justify-between items-baseline gap-3 py-1.5 border-b border-[#f7f7f7] last:border-0">
      <span className="text-xs text-[#bbb] shrink-0">{label}</span>
      <span className="text-xs text-[#444] text-right font-medium">{display}</span>
    </div>
  )
}

function ApiErroBadge({ msg }: { msg: string }) {
  return <p className="text-xs text-[#ccc] italic">{msg}</p>
}

function SecaoNivel({ data }: { data: NivelSocioeconomico | ApiErro }) {
  if ('erro' in data) return <ApiErroBadge msg={`Erro: ${data.erro}`} />
  const d = data as NivelSocioeconomico
  return (
    <div className="space-y-0">
      <Campo label="Classe social"   value={d.classeSocial} />
      <Campo label="Renda estimada"  value={d.rendaEstimada} />
      <Campo label="Faixa salarial"  value={d.rendaFaixaSalarial} />
      <Campo label="Ocupação (CBO)"  value={d.cbo} />
      <Campo label="Escolaridade"    value={d.escolaridade} />
      <Campo label="Renda IBGE"      value={d.rendaIBGE} />
      <Campo label="Renda média CBO" value={d.rendaMediaCBO} />
      {d.perfilDomiciliar && (
        <>
          <Campo label="Tipo domicílio"    value={d.perfilDomiciliar.tipoDomicilio} />
          <Campo label="Moradores"         value={d.perfilDomiciliar.quantidadeMoradores} />
          <Campo label="Adultos / Menores" value={`${d.perfilDomiciliar.quantidadeAdultos ?? '?'} / ${d.perfilDomiciliar.quantidadeMenores ?? '?'}`} />
          <Campo label="Renda domiciliar"  value={d.perfilDomiciliar.rendaDomiciliar} />
          <Campo label="Renda per capita"  value={d.perfilDomiciliar.rendaPerCapita} />
          <Campo label="Classe familiar"   value={d.perfilDomiciliar.classeSocialFamiliar} />
        </>
      )}
    </div>
  )
}

function SecaoProcessos({ data }: { data: ProcessosJudiciais | ApiErro }) {
  if ('erro' in data) return <ApiErroBadge msg={`Erro: ${data.erro}`} />
  const d = data as ProcessosJudiciais
  const total = d.totalProcessos ?? 0
  const cor = total === 0 ? 'text-[#111]' : total <= 2 ? 'text-[#b45309]' : 'text-[#aa0000]'
  return (
    <div className="space-y-3">
      <div className={`text-3xl font-bold ${cor}`}>
        {total} <span className="text-sm font-sans font-normal text-[#bbb]">processo(s)</span>
      </div>
      {d.resumoProcessos && (
        <div className="space-y-0">
          <Campo label="Como réu"    value={d.resumoProcessos.comoReu} />
          <Campo label="Como autor"  value={d.resumoProcessos.comoAutor} />
          <Campo label="Polo indet." value={d.resumoProcessos.poloIndeterminado} />
          {d.resumoProcessos.valorTotalComoReu > 0 && (
            <Campo label="Valor como réu" value={`R$ ${d.resumoProcessos.valorTotalComoReu.toLocaleString('pt-BR')}`} />
          )}
        </div>
      )}
      {d.areasDireito && d.areasDireito.length > 0 && (
        <div className="space-y-1">
          <p className="text-[10px] text-[#bbb] uppercase tracking-wider mt-2">Áreas do direito</p>
          {d.areasDireito.slice(0, 5).map((a, i) => (
            <div key={i} className="flex justify-between text-xs py-1 border-b border-[#f7f7f7]">
              <span className="text-[#999]">{a.areaDireito}</span>
              <span className="text-[#444] font-medium">{a.totalProcessosArea}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function SecaoAntecedentes({ data }: { data: AntecedentesCriminais | ApiErro }) {
  if ('erro' in data) return <ApiErroBadge msg={`Erro: ${data.erro}`} />
  const d = data as AntecedentesCriminais
  const consta = d.possuiAntecedentesCriminais
  return (
    <div className="space-y-2">
      <div className={`flex items-center gap-2 text-sm font-semibold ${consta ? 'text-[#aa0000]' : 'text-[#16a34a]'}`}>
        <span>{consta ? '✕' : '✓'}</span>
        <span>{d.status ?? (consta ? 'CONSTA' : 'NÃO CONSTA')}</span>
      </div>
      <div className="space-y-0">
        <Campo label="Certidão n°" value={d.numeroCertidao} />
        <Campo label="Emitida em"  value={d.dataEmissao} />
        <Campo label="Válida até"  value={d.dataValidade} />
        <Campo label="Nascimento"  value={d.dataNascimento} />
      </div>
    </div>
  )
}

function SecaoValidacao({ data }: { data: ValidacaoCadastral | ApiErro }) {
  if ('erro' in data) return <ApiErroBadge msg={`Erro: ${data.erro}`} />
  const d = data as ValidacaoCadastral
  return (
    <div className="space-y-0">
      <Campo label="Nome"           value={d.name} />
      <Campo label="Idade"          value={d.age ? `${d.age} anos` : null} />
      <Campo label="Gênero"         value={d.gender} />
      <Campo label="Nascimento"     value={d.dateOfBirth} />
      <Campo label="Mãe"            value={d.nameMother} />
      <Campo label="Renda estimada" value={d.estimatedSalary} />
      {d.phones?.[0] && <Campo label="Telefone" value={d.phones[0].phoneNumber} />}
      {d.addresses?.[0] && (
        <Campo label="Endereço" value={`${d.addresses[0].street}, ${d.addresses[0].number} — ${d.addresses[0].city}/${d.addresses[0].state}`} />
      )}
    </div>
  )
}

function SecaoCadastro({ data }: { data: CadastroPF | ApiErro }) {
  if ('erro' in data) return <ApiErroBadge msg={`Erro: ${data.erro}`} />
  const d = data as CadastroPF
  return (
    <div className="space-y-0">
      <Campo label="Nome"               value={d.nome} />
      <Campo label="Nascimento"         value={d.dataNascimento} />
      <Campo label="Idade"              value={d.idade ? `${d.idade} anos` : null} />
      <Campo label="Sexo"               value={d.sexo} />
      <Campo label="Mãe"                value={d.nomeMae} />
      <Campo label="Situação cadastral" value={d.situacaoCadastral} />
      <Campo label="Óbito"              value={d.obito === true ? 'Sim' : d.obito === false ? 'Não' : null} />
      <Campo label="Classe social"      value={d.classeSocial} />
      <Campo label="Renda estimada"     value={d.rendaEstimada} />
      <Campo label="Faixa salarial"     value={d.rendaFaixaSalarial} />
      <Campo label="Ocupação (CBO)"     value={d.cbo} />
      {d.enderecos?.[0] && (
        <Campo label="Endereço" value={`${d.enderecos[0].logradouro}, ${d.enderecos[0].numero} — ${d.enderecos[0].cidade}/${d.enderecos[0].uf}`} />
      )}
      {d.telefones?.[0] && <Campo label="Telefone" value={d.telefones[0].telefoneComDDD} />}
      {d.perfilDomiciliar && (
        <>
          <Campo label="Moradores"        value={d.perfilDomiciliar.quantidadeMoradores} />
          <Campo label="Renda domiciliar" value={d.perfilDomiciliar.rendaDomiciliar} />
          <Campo label="Classe familiar"  value={d.perfilDomiciliar.classeSocialFamiliar} />
        </>
      )}
    </div>
  )
}

function SecaoAssistencia({ data }: { data: AssistenciaSocial | ApiErro }) {
  if ('erro' in data) return <ApiErroBadge msg={`Erro: ${data.erro}`} />
  const d = data as AssistenciaSocial
  const beneficios = [
    { nome: 'Bolsa Família',        ativo: d.bolsaFamilia },
    { nome: 'BPC',                  ativo: d.bpc },
    { nome: 'Auxílio Emergencial',  ativo: d.auxilioEmergencial },
    { nome: 'Auxílio Reconstrução', ativo: d.auxilioReconstrucao },
    { nome: 'Garantia-Safra',       ativo: d.garantiaSafra },
    { nome: 'Seguro-Defeso',        ativo: d.seguroDefeso },
  ]
  return (
    <div className="space-y-1.5">
      {beneficios.map((b, i) => (
        <div key={i} className="flex items-center gap-2.5 py-1 border-b border-[#f7f7f7] last:border-0">
          <span className={`text-xs font-bold ${b.ativo ? 'text-[#16a34a]' : 'text-[#e0e0e0]'}`}>{b.ativo ? '✓' : '−'}</span>
          <span className={`text-xs ${b.ativo ? 'text-[#444] font-medium' : 'text-[#ccc]'}`}>{b.nome}</span>
        </div>
      ))}
    </div>
  )
}

function SecaoBoaVista({ data }: { data: BoaVistaAcertaPF | ApiErro }) {
  if ('erro' in data) return <ApiErroBadge msg={`Erro: ${data.erro}`} />
  const d = data as BoaVistaAcertaPF
  const score = d.scores?.ocorrencias?.[0]
  const qtdPend = parseInt(d.pendenciasFinanceiras?.quantidadeOcorrencia ?? '0')
  const qtdRest = parseInt(d.restricoes?.quantidadeOcorrencias ?? '0')
  const qtdProt = parseInt(d.protestos?.quantidadeOcorrencia ?? '0')
  const qtdChq  = parseInt(d.chequeSemFundoBacen?.quantidadeOcorrencia ?? '0')

  return (
    <div className="space-y-3">
      {d.decisao?.descricao && (
        <div className="text-sm font-semibold text-[#111827]">{d.decisao.descricao}</div>
      )}
      {score && (
        <div className="space-y-0">
          <Campo label="Score Boa Vista"         value={score.score} />
          <Campo label="Risco"                   value={score.risco} />
          <Campo label="Classificação"           value={score.classificacaoABC} />
          <Campo label="Prob. inadimplência"     value={score.probabilidadeInadimplencia} />
        </div>
      )}
      <div className="space-y-0">
        <Campo label="Classe social"             value={d.classeSocial} />
        <Campo label="Renda presumida"           value={d.rendaPresumida?.descricao ?? d.rendaPresumida?.faixa} />
        <Campo label="Pendências financeiras"    value={qtdPend > 0 ? `${qtdPend} — R$ ${d.pendenciasFinanceiras?.valorTotal ?? '?'}` : 'Nenhuma'} />
        <Campo label="Restrições"                value={qtdRest > 0 ? `${qtdRest}` : 'Nenhuma'} />
        <Campo label="Protestos (Boa Vista)"     value={qtdProt > 0 ? `${qtdProt} — R$ ${d.protestos?.valorTotal ?? '?'}` : 'Nenhum'} />
        <Campo label="Cheque sem fundo (BACEN)"  value={qtdChq > 0 ? `${qtdChq}` : 'Nenhum'} />
      </div>
    </div>
  )
}

function SecaoProtestos({ data }: { data: ProtestosBrasil | ApiErro }) {
  if ('erro' in data) return <ApiErroBadge msg={`Erro: ${data.erro}`} />
  const d = data as ProtestosBrasil
  const consta = d.constamProtestos

  return (
    <div className="space-y-3">
      <div className={`flex items-center gap-2 text-sm font-semibold ${consta ? 'text-[#aa0000]' : 'text-[#16a34a]'}`}>
        <span>{consta ? '✕' : '✓'}</span>
        <span>{consta ? 'CONSTA PROTESTO' : 'SEM PROTESTOS'}</span>
      </div>
      {consta && (
        <div className="space-y-0">
          <Campo label="Total de protestos" value={d.numeroTotalProtestos} />
          <Campo label="Valor total"         value={d.valorTotalProtestos ? `R$ ${d.valorTotalProtestos}` : null} />
          {d.protestos && d.protestos.length > 0 && (
            <div className="space-y-1 mt-2">
              <p className="text-[10px] text-[#bbb] uppercase tracking-wider">Por estado</p>
              {d.protestos.map((p, i) => (
                <div key={i} className="flex justify-between text-xs py-1 border-b border-[#f7f7f7]">
                  <span className="text-[#999]">{p.estado}</span>
                  <span className="text-[#444] font-medium">{p.numeroTotalProtestosUF} — R$ {p.valorTotalProtestosEstado}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

const SECOES: Array<{
  key: keyof DadosExtras
  titulo: string
  render: (d: NonNullable<DadosExtras[keyof DadosExtras]>) => React.ReactNode
}> = [
  { key: 'nivel-socioeconomico',  titulo: 'Nível Socioeconômico e Renda',            render: d => <SecaoNivel        data={d as NivelSocioeconomico | ApiErro} /> },
  { key: 'processos-agrupada',    titulo: 'Processos Judiciais',                      render: d => <SecaoProcessos    data={d as ProcessosJudiciais  | ApiErro} /> },
  { key: 'antecedentes-federais', titulo: 'Antecedentes Criminais — Polícia Federal', render: d => <SecaoAntecedentes data={d as AntecedentesCriminais | ApiErro} /> },
  { key: 'registration-brazil',   titulo: 'Validação Cadastral',                      render: d => <SecaoValidacao    data={d as ValidacaoCadastral  | ApiErro} /> },
  { key: 'cadastro-pf-plus',      titulo: 'Cadastro Pessoal Completo',                render: d => <SecaoCadastro     data={d as CadastroPF           | ApiErro} /> },
  { key: 'assistencia-social-pf', titulo: 'Benefícios Sociais',                       render: d => <SecaoAssistencia  data={d as AssistenciaSocial    | ApiErro} /> },
  { key: 'boa-vista-acerta-pf',   titulo: 'Análise Boa Vista',                        render: d => <SecaoBoaVista     data={d as BoaVistaAcertaPF     | ApiErro} /> },
  { key: 'protestos-brasil',      titulo: 'Protestos em Cartório',                    render: d => <SecaoProtestos    data={d as ProtestosBrasil      | ApiErro} /> },
]

export function DadosExtrasView({ dados, layout = 'card' }: { dados: DadosExtras; layout?: 'card' | 'settings' }) {
  const secoes = SECOES.filter(s => dados[s.key] != null)
  if (secoes.length === 0) return null

  if (layout === 'settings') {
    return (
      <>
        {secoes.map(s => (
          <div key={s.key} className="grid grid-cols-[240px_1fr] gap-8 py-6 border-t border-[#e5e7eb]">
            <div>
              <p className="text-sm font-medium text-[#111827]">{s.titulo}</p>
            </div>
            <div>{s.render(dados[s.key]!)}</div>
          </div>
        ))}
      </>
    )
  }

  return (
    <>
      {secoes.map(s => (
        <CardExtra key={s.key} titulo={s.titulo}>
          {s.render(dados[s.key]!)}
        </CardExtra>
      ))}
    </>
  )
}
