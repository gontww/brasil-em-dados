export interface IBGERegiao {
  id: number
  sigla: string
  nome: string
}

export interface IBGEUF {
  id: number
  sigla: string
  nome: string
  regiao: IBGERegiao
}

export interface IBGEMunicipioRaw {
  id: number
  nome: string
  microrregiao: {
    id: number
    nome: string
    mesorregiao: {
      id: number
      nome: string
      UF: IBGEUF
    }
  }
}

// Modelos de Domínio Simplificados para o Frontend (Redução de memória)
export interface Estado {
  id: number
  sigla: string
  nome: string
}

export interface Municipio {
  id: number
  nome: string
  uf: string
  estadoNome: string
}

export interface MunicipioStats {
  id: number
  nome: string
  uf: string
  populacao: number
  pibTotal: number
  pibPerCapita: number
  pibAgropecuaria: number
  pibIndustria: number
  pibServicos: number
  pibAdministracao: number
}

export type EstadoStats = MunicipioStats
