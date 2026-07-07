import type { IBGEUF, Estado, Municipio } from './ibge.types'

const BASE_URL = 'https://servicodados.ibge.gov.br/api/v1/localidades'

export const ibgeLocalidadesService = {
  /**
   * Obtém a lista de todas as Unidades Federativas (Estados)
   */
  async getEstados(): Promise<Estado[]> {
    const response = await fetch(`${BASE_URL}/estados?ordenacao=nome`)
    if (!response.ok) {
      throw new Error('Falha ao buscar estados do IBGE')
    }
    const data: IBGEUF[] = await response.json()
    return data.map((uf) => ({
      id: uf.id,
      sigla: uf.sigla,
      nome: uf.nome,
    }))
  },

  /**
   * Obtém a lista de todos os municípios do Brasil a partir de um JSON estático local otimizado
   */
  async getMunicipios(): Promise<Municipio[]> {
    const response = await fetch('/data/municipios.json')
    if (!response.ok) {
      throw new Error('Falha ao buscar lista de municípios local')
    }
    return response.json()
  },
}
