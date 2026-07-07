import type { MunicipioStats } from './ibge.types'

const SIDRA_BASE_URL = 'https://servicodados.ibge.gov.br/api/v3/agregados'

interface SidraSeriesItem {
  localidade: {
    id: string
    nome?: string
  }
  serie?: Record<string, string>
}

interface SidraResult {
  series?: SidraSeriesItem[]
}

interface SidraResponseItem {
  id?: string
  resultados?: SidraResult[]
}

// Cache em memória para evitar requisições repetidas ao SIDRA
const memoryCache = new Map<string, unknown>()

export const ibgeSidraService = {
  /**
   * Busca dados demográficos e econômicos do município pelo código IBGE (7 dígitos)
   */
  async getMunicipioStats(municipioId: number, nome: string, uf: string): Promise<MunicipioStats> {
    const cacheKey = `stats-${municipioId}`
    if (memoryCache.has(cacheKey)) {
      return memoryCache.get(cacheKey) as MunicipioStats
    }

    const popUrl = `${SIDRA_BASE_URL}/9514/periodos/2022/variaveis/93?localidades=N6[${municipioId}]`
    const econUrl = `${SIDRA_BASE_URL}/5938/periodos/2021/variaveis/37|513|517|6575|525?localidades=N6[${municipioId}]`

    const [popRes, econRes] = await Promise.all([fetch(popUrl), fetch(econUrl)])

    if (!popRes.ok || !econRes.ok) {
      throw new Error(`Erro ao buscar estatísticas do IBGE para o município ${nome}`)
    }

    const popData = (await popRes.json()) as SidraResponseItem[]
    const econData = (await econRes.json()) as SidraResponseItem[]

    // 1. Extrair População
    let populacao = 0
    try {
      const valStr = popData[0]?.resultados?.[0]?.series?.[0]?.serie?.['2022']
      populacao = valStr ? Number.parseInt(valStr, 10) : 0
    } catch (e) {
      console.warn('Erro ao ler dados de população do SIDRA:', e)
    }

    // 2. Extrair Indicadores Econômicos
    let pibTotal = 0
    let pibAgropecuaria = 0
    let pibIndustria = 0
    let pibServicos = 0
    let pibAdministracao = 0

    try {
      econData.forEach((item) => {
        const valueStr = item.resultados?.[0]?.series?.[0]?.serie?.['2021']
        const value = valueStr ? Number.parseInt(valueStr, 10) * 1000 : 0 // SIDRA retorna PIB em Mil Reais

        switch (item.id) {
          case '37':
            pibTotal = value
            break
          case '513':
            pibAgropecuaria = value
            break
          case '517':
            pibIndustria = value
            break
          case '6575':
            pibServicos = value
            break
          case '525':
            pibAdministracao = value
            break
        }
      })
    } catch (e) {
      console.warn('Erro ao ler dados econômicos do SIDRA:', e)
    }

    // 3. Calcular PIB per capita
    const pibPerCapita = populacao > 0 ? pibTotal / populacao : 0

    const result: MunicipioStats = {
      id: municipioId,
      nome,
      uf,
      populacao,
      pibTotal,
      pibPerCapita,
      pibAgropecuaria,
      pibIndustria,
      pibServicos,
      pibAdministracao,
    }

    memoryCache.set(cacheKey, result)
    return result
  },

  /**
   * Busca dados agregados de um indicador para TODOS os estados do Brasil.
   * Retorna um mapa de { estadoIbgeCode: valor }
   */
  async getEstadosIndicatorData(
    indicator: 'populacao' | 'pib' | 'pibPerCapita'
  ): Promise<Record<string, number>> {
    const cacheKey = `est-${indicator}`
    if (memoryCache.has(cacheKey)) {
      return memoryCache.get(cacheKey) as Record<string, number>
    }

    let result: Record<string, number> = {}

    if (indicator === 'populacao') {
      const url = `${SIDRA_BASE_URL}/9514/periodos/2022/variaveis/93?localidades=N3[all]`
      const res = await fetch(url)
      if (!res.ok) throw new Error('Erro ao buscar dados de população dos estados')
      const data = await res.json()
      result = this.parseSidraResponse(data, '2022', 1)
    } else if (indicator === 'pib') {
      const url = `${SIDRA_BASE_URL}/5938/periodos/2021/variaveis/37?localidades=N3[all]`
      const res = await fetch(url)
      if (!res.ok) throw new Error('Erro ao buscar dados de PIB dos estados')
      const data = await res.json()
      result = this.parseSidraResponse(data, '2021', 1000) // PIB em Mil Reais
    } else if (indicator === 'pibPerCapita') {
      const [pop, pib] = await Promise.all([
        this.getEstadosIndicatorData('populacao'),
        this.getEstadosIndicatorData('pib'),
      ])
      const resTemp: Record<string, number> = {}
      Object.keys(pib).forEach((code) => {
        const popVal = pop[code] || 0
        resTemp[code] = popVal > 0 ? pib[code] / popVal : 0
      })
      result = resTemp
    }

    memoryCache.set(cacheKey, result)
    return result
  },

  /**
   * Busca dados agregados de um indicador para TODOS os municípios de um determinado estado.
   * Retorna um mapa de { municipioIbgeCode: valor }
   */
  async getMunicipiosIndicatorData(
    stateCode: string,
    indicator: 'populacao' | 'pib' | 'pibPerCapita'
  ): Promise<Record<string, number>> {
    const cacheKey = `mun-${stateCode}-${indicator}`
    if (memoryCache.has(cacheKey)) {
      return memoryCache.get(cacheKey) as Record<string, number>
    }

    let result: Record<string, number> = {}

    if (indicator === 'populacao') {
      const url =
        stateCode === 'all'
          ? `${SIDRA_BASE_URL}/9514/periodos/2022/variaveis/93?localidades=N6[all]`
          : `${SIDRA_BASE_URL}/9514/periodos/2022/variaveis/93?localidades=N6[N3[${stateCode}]]`
      const res = await fetch(url)
      if (!res.ok) throw new Error(`Erro ao buscar população dos municípios de ${stateCode}`)
      const data = await res.json()
      result = this.parseSidraResponse(data, '2022', 1)
    } else if (indicator === 'pib') {
      const url =
        stateCode === 'all'
          ? `${SIDRA_BASE_URL}/5938/periodos/2021/variaveis/37?localidades=N6[all]`
          : `${SIDRA_BASE_URL}/5938/periodos/2021/variaveis/37?localidades=N6[N3[${stateCode}]]`
      const res = await fetch(url)
      if (!res.ok) throw new Error(`Erro ao buscar PIB dos municípios de ${stateCode}`)
      const data = await res.json()
      result = this.parseSidraResponse(data, '2021', 1000) // PIB em Mil Reais
    } else if (indicator === 'pibPerCapita') {
      const [pop, pib] = await Promise.all([
        this.getMunicipiosIndicatorData(stateCode, 'populacao'),
        this.getMunicipiosIndicatorData(stateCode, 'pib'),
      ])
      const resTemp: Record<string, number> = {}
      Object.keys(pib).forEach((code) => {
        const popVal = pop[code] || 0
        resTemp[code] = popVal > 0 ? pib[code] / popVal : 0
      })
      result = resTemp
    }

    memoryCache.set(cacheKey, result)
    return result
  },

  /**
   * Parser auxiliar para respostas brutas do SIDRA
   */
  parseSidraResponse(data: unknown, period: string, multiplier: number): Record<string, number> {
    const result: Record<string, number> = {}
    try {
      const dataArr = data as SidraResponseItem[]
      const series = dataArr[0]?.resultados?.[0]?.series
      if (series) {
        series.forEach((s) => {
          const code = s.localidade.id
          const valStr = s.serie?.[period]
          if (valStr && valStr !== '-' && valStr !== '..') {
            result[code] = Number.parseInt(valStr, 10) * multiplier
          } else {
            result[code] = 0
          }
        })
      }
    } catch (e) {
      console.warn('Erro ao parsear resposta SIDRA:', e)
    }
    return result
  },
}
