import type { Feature, FeatureCollection } from 'geojson'

const BASE_URL = 'https://raw.githubusercontent.com/tbrugz/geodata-br/master/geojson'

export const geojsonService = {
  /**
   * Helper para carregar arquivos JSON com cache persistente (Cache API) no navegador
   */
  async fetchWithCache<T>(url: string): Promise<T> {
    try {
      if (typeof window !== 'undefined' && 'caches' in window) {
        const cache = await caches.open('brasil-em-dados-geojson-v1')
        const cachedResponse = await cache.match(url)
        if (cachedResponse) {
          return await cachedResponse.json()
        }
        const response = await fetch(url)
        if (response.ok) {
          await cache.put(url, response.clone())
          return await response.json()
        }
      }
    } catch (e) {
      console.warn('Erro ao acessar Cache API, buscando da rede:', e)
    }
    const response = await fetch(url)
    if (!response.ok) {
      throw new Error(`Erro ao baixar recurso: ${url}`)
    }
    return response.json()
  },

  /**
   * Obtém a malha de municípios de um estado pelo código IBGE do estado (2 dígitos)
   */
  async getMunicipiosByEstado(estadoCode: string): Promise<FeatureCollection> {
    return this.fetchWithCache<FeatureCollection>(`${BASE_URL}/geojs-${estadoCode}-mun.json`)
  },

  /**
   * Calcula o Bounding Box (limites) de uma feature GeoJSON
   */
  getFeatureBounds(feature: Feature): [[number, number], [number, number]] {
    let minLng = Infinity
    let minLat = Infinity
    let maxLng = -Infinity
    let maxLat = -Infinity

    const processCoords = (coords: unknown) => {
      if (Array.isArray(coords)) {
        if (typeof coords[0] === 'number') {
          const [lng, lat] = coords as [number, number]
          if (lng < minLng) minLng = lng
          if (lat < minLat) minLat = lat
          if (lng > maxLng) maxLng = lng
          if (lat > maxLat) maxLat = lat
        } else {
          coords.forEach((c) => processCoords(c))
        }
      }
    }

    if (feature.geometry && 'coordinates' in feature.geometry) {
      processCoords(feature.geometry.coordinates)
    }

    // Se nenhum limite válido for encontrado, retornar limites padrão
    if (minLng === Infinity) {
      return [
        [-73.99, -33.75],
        [-28.84, 5.27],
      ] // Brasil total
    }

    return [
      [minLng, minLat],
      [maxLng, maxLat],
    ]
  },
}
