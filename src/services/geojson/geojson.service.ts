import type { Feature, FeatureCollection } from 'geojson'

const BASE_URL = 'https://raw.githubusercontent.com/tbrugz/geodata-br/master/geojson'

export const geojsonService = {
  /**
   * Obtém a malha de municípios de um estado pelo código IBGE do estado (2 dígitos)
   */
  async getMunicipiosByEstado(estadoCode: string): Promise<FeatureCollection> {
    const response = await fetch(`${BASE_URL}/geojs-${estadoCode}-mun.json`)
    if (!response.ok) {
      throw new Error(`Falha ao carregar malha de municípios para o estado ${estadoCode}`)
    }
    return response.json()
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
