<script setup lang="ts">
import { onMounted, ref, shallowRef, watch } from 'vue'
import mapboxgl from 'mapbox-gl'
import { useMapboxMap } from '../composables/useMapboxMap'
import { useDashboardStore, type MapIndicator } from '../../dashboard/dashboard.store'
import { geojsonService } from '../../../services/geojson/geojson.service'
import { ibgeSidraService } from '../../../services/ibge/ibgeSidra.service'
import { useQuery } from '@tanstack/vue-query'
import { ibgeLocalidadesService } from '../../../services/ibge/ibgeLocalidades.service'
import MapControls from './MapControls.vue'
import type { FeatureCollection, Feature } from 'geojson'
import type { Municipio } from '../../../services/ibge/ibge.types'

type FeatureId = string | number

const mapContainer = ref<HTMLDivElement | null>(null)
const { mapInstance, isLoaded, error, initializeMap } = useMapboxMap()
const dashboardStore = useDashboardStore()

const { data: estadosList } = useQuery({
  queryKey: ['estados'],
  queryFn: () => ibgeLocalidadesService.getEstados(),
  staleTime: Infinity,
})

// Cache local
const loadedEstadoCode = ref<string | null>(null)
const isGeoJsonLoading = ref(false)
const stateGeoJson = shallowRef<FeatureCollection | null>(null)

const loadStatesGeoJson = async () => {
  if (stateGeoJson.value) return stateGeoJson.value
  const res = await fetch('/geojson/brazil-states.json')
  stateGeoJson.value = await res.json()
  return stateGeoJson.value
}
const municipioGeoJson = shallowRef<FeatureCollection | null>(null)
const nationalMunicipalitiesGeoJson = shallowRef<FeatureCollection | null>(null)

// Cache para evitar recálculos redundantes e chamadas lentas ao setFeatureState do Mapbox
const lastAppliedIndicator = ref<Record<string, string>>({})
const lastAppliedGeoJsonRef = ref<Record<string, unknown>>({})

// Helper functions to safely modify layers only if they exist in the map style
const safeSetLayoutProperty = (
  map: mapboxgl.Map,
  layerId: string,
  name: string,
  value: unknown
) => {
  if (map.getLayer(layerId)) {
    map.setLayoutProperty(
      layerId,
      name as Parameters<mapboxgl.Map['setLayoutProperty']>[1],
      value as never
    )
  }
}

const safeSetPaintProperty = (map: mapboxgl.Map, layerId: string, name: string, value: unknown) => {
  if (map.getLayer(layerId)) {
    map.setPaintProperty(
      layerId,
      name as Parameters<mapboxgl.Map['setPaintProperty']>[1],
      value as never
    )
  }
}

const safeSetFilter = (
  map: mapboxgl.Map,
  layerId: string,
  filter: Parameters<mapboxgl.Map['setFilter']>[1]
) => {
  if (map.getLayer(layerId)) {
    map.setFilter(layerId, filter)
  }
}

const loadNationalMunicipalities = async (map: mapboxgl.Map) => {
  if (nationalMunicipalitiesGeoJson.value) {
    ensureMunicipiosSource(map, nationalMunicipalitiesGeoJson.value)
    return
  }
  isGeoJsonLoading.value = true
  try {
    const res = await fetch('/geojson/brazil-municipalities.json')
    if (!res.ok) throw new Error('Erro ao baixar arquivo nacional de municípios')
    const geojsonData = await res.json()
    nationalMunicipalitiesGeoJson.value = geojsonData
    ensureMunicipiosSource(map, geojsonData)
  } catch (err) {
    console.error('Erro ao carregar municípios nacionais:', err)
  } finally {
    isGeoJsonLoading.value = false
  }
}

// Paleta de cores para os indicadores temáticos (Quantiles)
const colorPalettes = {
  populacao: ['#1e1b4b', '#312e81', '#4338ca', '#6366f1', '#818cf8', '#c7d2fe'],
  pib: ['#064e3b', '#065f46', '#0f766e', '#0d9488', '#14b8a6', '#99f6e4'],
  pibPerCapita: ['#78350f', '#92400e', '#b45309', '#d97706', '#f59e0b', '#fde68a'],
}

// Carregar lista de municípios para mapeamento bidirecional (Clique no Mapa -> Seleção no Store)
const { data: municipiosList } = useQuery({
  queryKey: ['municipios'],
  queryFn: () => ibgeLocalidadesService.getMunicipios(),
  staleTime: Infinity,
})

onMounted(() => {
  if (mapContainer.value) {
    initializeMap(mapContainer.value, {
      center: [-51.9253, -14.235], // Centro do Brasil
      zoom: 3.8,
      minZoom: 3.5,
      maxZoom: 5.95,
    })
  }
})

// Adiciona as fontes e camadas base de estados
const setupStatesLayers = (map: mapboxgl.Map, geojsonData: FeatureCollection) => {
  geojsonData.features.forEach((feat) => {
    feat.id = Number(feat.properties?.codigo_ibg || feat.properties?.id)
  })

  map.addSource('brazil-states', {
    type: 'geojson',
    data: geojsonData,
  })

  // Camada de preenchimento (cor base neutra)
  map.addLayer({
    id: 'states-fill',
    type: 'fill',
    source: 'brazil-states',
    paint: {
      'fill-color': '#0ea5e9',
      'fill-opacity': ['case', ['boolean', ['feature-state', 'hover'], false], 0.2, 0.05],
    },
  })

  // Camada de bordas
  map.addLayer({
    id: 'states-borders',
    type: 'line',
    source: 'brazil-states',
    paint: {
      'line-color': '#1e293b', // slate-800
      'line-width': 1,
      'line-opacity': 0.8,
    },
  })

  // Camada de extrusão 3D para estados (desabilitada por padrão)
  map.addLayer({
    id: 'states-extrusion',
    type: 'fill-extrusion',
    source: 'brazil-states',
    layout: { visibility: 'none' },
    paint: {
      'fill-extrusion-color': [
        'case',
        ['boolean', ['feature-state', 'hover'], false],
        '#38bdf8', // hover: sky-400
        '#0ea5e9', // padrão
      ],
      'fill-extrusion-height': 0,
      'fill-extrusion-base': 0,
      'fill-extrusion-opacity': 0.85,
    },
  })

  map.addLayer({
    id: 'states-hit',
    type: 'fill',
    source: 'brazil-states',
    layout: { visibility: 'none' },
    paint: {
      'fill-color': '#000000',
      'fill-opacity': 0,
    },
  })

  map.addLayer({
    id: 'state-highlight',
    type: 'line',
    source: 'brazil-states',
    filter: ['==', ['get', 'codigo_ibg'], ''],
    paint: {
      'line-color': '#38bdf8', // sky-400
      'line-width': 2.5,
      'line-opacity': 0.9,
    },
  })
}

// Registra eventos de clique e hover para estados (tanto 2D quanto 3D)
const setupStatesEvents = (map: mapboxgl.Map) => {
  let stateHoverId: FeatureId | null = null

  const clearHover = () => {
    if (stateHoverId !== null) {
      map.setFeatureState({ source: 'brazil-states', id: stateHoverId }, { hover: false })
    }
    stateHoverId = null
    map.getCanvas().style.cursor = ''
  }

  const applyHover = (featureId: FeatureId | null = null) => {
    if (featureId === stateHoverId) return
    clearHover()
    stateHoverId = featureId
    if (stateHoverId !== null) {
      map.setFeatureState({ source: 'brazil-states', id: stateHoverId }, { hover: true })
    }
    map.getCanvas().style.cursor = 'pointer'
  }

  const handleClick = (features: mapboxgl.MapboxGeoJSONFeature[]) => {
    if (features.length > 0 && estadosList.value) {
      const props = features[0].properties
      if (props) {
        const idNum = Number.parseInt(props.codigo_ibg || props.id)
        const matched = estadosList.value.find((e) => e.id === idNum)
        if (matched) {
          dashboardStore.selectEstado(matched)
        }
      }
    }
  }

  const getHitTestLayer = (): string => {
    return dashboardStore.viewMode === '3d' && dashboardStore.activeIndicator !== 'none'
      ? 'states-hit'
      : 'states-fill'
  }

  map.on('mousemove', (e) => {
    if (dashboardStore.mapLevel !== 'estados') return
    if (!map.getLayer('states-fill') && !map.getLayer('states-hit')) return

    const hitLayer = getHitTestLayer()
    if (!map.getLayer(hitLayer)) return

    const features = map.queryRenderedFeatures(e.point, { layers: [hitLayer] })
    if (features.length > 0) {
      applyHover(features[0].id)
    } else {
      clearHover()
    }
  })

  map.on('click', (e) => {
    if (dashboardStore.mapLevel !== 'estados') return
    if (!map.getLayer('states-fill') && !map.getLayer('states-hit')) return

    const hitLayer = getHitTestLayer()
    if (!map.getLayer(hitLayer)) return

    const features = map.queryRenderedFeatures(e.point, { layers: [hitLayer] })
    handleClick(features)
  })
}

// Configurar as camadas do mapa assim que estiver carregado
watch(isLoaded, async (loaded) => {
  if (loaded && mapInstance.value) {
    const map = mapInstance.value
    map.addControl(new mapboxgl.NavigationControl({ showCompass: false }), 'bottom-right')

    const geojson = await loadStatesGeoJson()
    if (geojson) {
      setupStatesLayers(map, geojson)
      setupStatesEvents(map)
    }
    setupMunicipiosEvents(map)

    // Sincronizar estado inicial a partir dos valores da URL carregados na store
    const hasMunicipio = !!dashboardStore.selectedMunicipio
    const hasEstado = !!dashboardStore.selectedEstado

    if (hasMunicipio || dashboardStore.mapLevel === 'municipios') {
      // Garantir visualização municipal ativa
      safeSetLayoutProperty(map, 'states-fill', 'visibility', 'none')
      safeSetLayoutProperty(map, 'states-borders', 'visibility', 'none')
      await loadNationalMunicipalities(map)

      if (hasMunicipio) {
        await handleSelectMunicipio(map, dashboardStore.selectedMunicipio!)
      } else {
        await updateThematicVisualization()
      }
    } else {
      // Visualização estadual ativa
      if (hasEstado) {
        const stateIdStr = String(dashboardStore.selectedEstado!.id)
        safeSetFilter(map, 'state-highlight', ['==', ['get', 'codigo_ibg'], stateIdStr])

        // Focar no estado selecionado
        const geojson = await loadStatesGeoJson()
        if (geojson && geojson.features) {
          const feature = geojson.features.find(
            (f: Feature) =>
              String(f.properties?.codigo_ibg) === stateIdStr ||
              String(f.properties?.id) === stateIdStr
          )

          if (feature) {
            const bounds = geojsonService.getFeatureBounds(feature)
            const centerLng = (bounds[0][0] + bounds[1][0]) / 2
            const centerLat = (bounds[0][1] + bounds[1][1]) / 2

            await updateThematicVisualization(false)

            map.easeTo({
              center: [centerLng, centerLat],
              zoom: 6.1,
              pitch: dashboardStore.viewMode === '3d' ? 55 : 0,
              bearing: dashboardStore.viewMode === '3d' ? -15 : 0,
              duration: 1200,
            })
          }
        }
      } else {
        await updateThematicVisualization()
      }
    }
  }
})

// Registra eventos de clique e hover para municípios (tanto 2D quanto 3D)
// Em modo 3D, usamos a camada 'municipios-hit' (fill transparente) como alvo de hit-test,
// pois o raycasting do fill-extrusion do Mapbox usa a projeção visual 3D que fica
// deslocada com pitch alto, causando hover/clique no município errado.
const setupMunicipiosEvents = (map: mapboxgl.Map) => {
  let municipioHoverId: FeatureId | null = null

  const clearHover = () => {
    if (municipioHoverId !== null) {
      map.setFeatureState({ source: 'municipios-source', id: municipioHoverId }, { hover: false })
    }
    municipioHoverId = null
    map.getCanvas().style.cursor = ''
  }

  const applyHover = (featureId: FeatureId | null = null) => {
    if (featureId === municipioHoverId) return // Sem mudança
    clearHover()
    municipioHoverId = featureId
    if (municipioHoverId !== null) {
      map.setFeatureState({ source: 'municipios-source', id: municipioHoverId }, { hover: true })
    }
    map.getCanvas().style.cursor = 'pointer'
  }

  const handleClick = (features: mapboxgl.MapboxGeoJSONFeature[]) => {
    if (features.length > 0 && municipiosList.value) {
      const props = features[0].properties
      if (props && props.id) {
        const idNum = Number.parseInt(props.id)
        const matched = municipiosList.value.find((m) => m.id === idNum)
        if (matched) {
          dashboardStore.selectMunicipio(matched)
        }
      }
    }
  }

  // Determinar qual camada usar para hit-test baseado no modo de visualização
  const getHitTestLayer = (): string => {
    return dashboardStore.viewMode === '3d' && dashboardStore.activeIndicator !== 'none'
      ? 'municipios-hit'
      : 'municipios-fill'
  }

  // Usar eventos no nível do mapa para controlar qual camada é consultada
  map.on('mousemove', (e) => {
    if (!map.getLayer('municipios-fill') && !map.getLayer('municipios-hit')) return

    const hitLayer = getHitTestLayer()
    if (!map.getLayer(hitLayer)) return

    const features = map.queryRenderedFeatures(e.point, { layers: [hitLayer] })
    if (features.length > 0) {
      applyHover(features[0].id)
    } else {
      clearHover()
    }
  })

  map.on('click', (e) => {
    if (!map.getLayer('municipios-fill') && !map.getLayer('municipios-hit')) return

    const hitLayer = getHitTestLayer()
    if (!map.getLayer(hitLayer)) return

    const features = map.queryRenderedFeatures(e.point, { layers: [hitLayer] })
    handleClick(features)
  })
}

// Garante que a fonte de municípios exista no mapa
const ensureMunicipiosSource = (map: mapboxgl.Map, geojsonData: FeatureCollection) => {
  const source = map.getSource('municipios-source') as mapboxgl.GeoJSONSource

  geojsonData.features.forEach((feat) => {
    feat.id = Number(feat.properties?.codigo_ibg || feat.properties?.id)
  })

  municipioGeoJson.value = geojsonData

  if (source) {
    source.setData(geojsonData)
  } else {
    map.addSource('municipios-source', {
      type: 'geojson',
      data: geojsonData,
      maxzoom: 5,
    })

    // Preenchimento dos municípios
    map.addLayer({
      id: 'municipios-fill',
      type: 'fill',
      source: 'municipios-source',
      paint: {
        'fill-color': '#0ea5e9',
        'fill-opacity': ['case', ['boolean', ['feature-state', 'hover'], false], 0.15, 0.0],
      },
    })

    // Bordas finas dos municípios
    map.addLayer({
      id: 'municipios-borders',
      type: 'line',
      source: 'municipios-source',
      paint: {
        'line-color': '#334155', // slate-700
        'line-width': 0.5,
        'line-opacity': 0.4,
      },
    })

    // Extrusão 3D para municípios
    map.addLayer({
      id: 'municipios-extrusion',
      type: 'fill-extrusion',
      source: 'municipios-source',
      layout: { visibility: 'none' },
      paint: {
        'fill-extrusion-color': [
          'case',
          ['boolean', ['feature-state', 'hover'], false],
          '#38bdf8', // Destaque no hover (sky-400)
          '#0ea5e9',
        ],
        'fill-extrusion-height': 0,
        'fill-extrusion-base': 0,
        'fill-extrusion-opacity': 0.85,
      },
    })

    // Camada invisível para hit-test em modo 3D
    // Fica ACIMA da extrusão para capturar eventos do mouse corretamente
    // usando o footprint 2D (sem o offset de perspectiva 3D)
    map.addLayer({
      id: 'municipios-hit',
      type: 'fill',
      source: 'municipios-source',
      layout: { visibility: 'none' }, // Ativada apenas em modo 3D
      paint: {
        'fill-color': '#000000',
        'fill-opacity': 0, // Totalmente transparente — apenas para interação
      },
    })

    // Destaque de bordas do município selecionado
    map.addLayer({
      id: 'municipio-highlight',
      type: 'line',
      source: 'municipios-source',
      filter: ['==', ['get', 'id'], ''],
      paint: {
        'line-color': '#38bdf8', // sky-400
        'line-width': 2.5,
        'line-opacity': 0.9,
      },
    })
  }
}

// Lógica de Renderização Temática (Choropleth / 3D)
const applyThematicStyling = (
  map: mapboxgl.Map,
  sourceId: string,
  fillLayerId: string,
  extrusionLayerId: string,
  indicatorData: Record<string, number>,
  indicator: MapIndicator,
  geojsonData: FeatureCollection
) => {
  const is3D = dashboardStore.viewMode === '3d'
  const selectedId =
    sourceId === 'brazil-states'
      ? dashboardStore.selectedEstado
        ? String(dashboardStore.selectedEstado.id)
        : ''
      : dashboardStore.selectedMunicipio
        ? String(dashboardStore.selectedMunicipio.id)
        : ''

  if (indicator === 'none') {
    // Resetar estilos
    safeSetPaintProperty(map, fillLayerId, 'fill-color', '#0ea5e9')
    safeSetPaintProperty(map, fillLayerId, 'fill-opacity', [
      'case',
      ['boolean', ['feature-state', 'hover'], false],
      0.2,
      sourceId === 'brazil-states' ? 0.05 : 0.0,
    ])

    safeSetLayoutProperty(map, extrusionLayerId, 'visibility', 'none')
    safeSetLayoutProperty(map, 'municipios-hit', 'visibility', 'none')
    safeSetLayoutProperty(map, 'states-hit', 'visibility', 'none')

    // Garantir que a camada 2D fique visível se resetado
    safeSetLayoutProperty(map, fillLayerId, 'visibility', 'visible')
    return
  }

  // 1. Calcular quantiles
  const sortedValues = Object.values(indicatorData)
    .filter((v) => v > 0)
    .sort((a, b) => a - b)

  if (sortedValues.length === 0) return

  const p20 = sortedValues[Math.floor(sortedValues.length * 0.2)] || 0
  const p40 = sortedValues[Math.floor(sortedValues.length * 0.4)] || 0
  const p60 = sortedValues[Math.floor(sortedValues.length * 0.6)] || 0
  const p80 = sortedValues[Math.floor(sortedValues.length * 0.8)] || 0
  const p95 = sortedValues[Math.floor(sortedValues.length * 0.95)] || 0
  const maxVal = sortedValues[sortedValues.length - 1] || 1

  const palette = colorPalettes[indicator as keyof typeof colorPalettes]

  // 2. Definir valores no Feature State do Mapbox (apenas se o indicador ou geojson mudou)
  if (
    lastAppliedIndicator.value[sourceId] !== indicator ||
    lastAppliedGeoJsonRef.value[sourceId] !== geojsonData
  ) {
    geojsonData.features.forEach((feat) => {
      const code = feat.properties?.codigo_ibg || feat.properties?.id
      feat.properties!._value = indicatorData[code] || 0
    })
    const geoSource = map.getSource(sourceId) as mapboxgl.GeoJSONSource
    if (geoSource) geoSource.setData(geojsonData)
    lastAppliedIndicator.value[sourceId] = indicator
    lastAppliedGeoJsonRef.value[sourceId] = geojsonData
  }

  // 3. Criar expressão de interpolação cromática
  const colorExpression: mapboxgl.Expression = [
    'interpolate',
    ['linear'],
    ['get', '_value'],
    0,
    '#0f172a', // Slate-900 (Dark Slate)
    p20,
    palette[0],
    p40,
    palette[1],
    p60,
    palette[2],
    p80,
    palette[3],
    p95,
    palette[4],
    maxVal,
    palette[5],
  ]

  // 4. Aplicar visibilidade e pinturas baseadas no modo de exibição (2D vs 3D)
  if (is3D) {
    // Esconder preenchimento 2D
    safeSetLayoutProperty(map, fillLayerId, 'visibility', 'none')

    // Configurar e exibir Extrusão 3D
    safeSetLayoutProperty(map, extrusionLayerId, 'visibility', 'visible')

    // Ativar camada transparente de hit-test correspondente
    if (sourceId === 'brazil-states') {
      safeSetLayoutProperty(map, 'states-hit', 'visibility', 'visible')
      safeSetLayoutProperty(map, 'municipios-hit', 'visibility', 'none')
    } else {
      safeSetLayoutProperty(map, 'municipios-hit', 'visibility', 'visible')
      safeSetLayoutProperty(map, 'states-hit', 'visibility', 'none')
    }

    const hoverColorExpression: mapboxgl.Expression = [
      'case',
      ['==', ['get', 'id'], selectedId],
      '#f59e0b', // Destaque para o selecionado (amber-500)
      ['boolean', ['feature-state', 'hover'], false],
      '#38bdf8', // Cor de destaque no hover (sky-400)
      colorExpression,
    ]
    safeSetPaintProperty(map, extrusionLayerId, 'fill-extrusion-color', hoverColorExpression)

    // Altura da extrusão de acordo com o valor estatístico
    const maxExtrusionHeight = sourceId === 'brazil-states' ? 180000 : 80000 // 180km para estados, 80km para mun

    const heightExpression: mapboxgl.Expression = [
      'interpolate',
      ['linear'],
      ['get', '_value'],
      0,
      0,
      maxVal,
      maxExtrusionHeight,
    ]
    safeSetPaintProperty(map, extrusionLayerId, 'fill-extrusion-height', heightExpression)
  } else {
    // Exibir preenchimento 2D e ocultar 3D
    safeSetLayoutProperty(map, fillLayerId, 'visibility', 'visible')
    safeSetPaintProperty(map, fillLayerId, 'fill-color', colorExpression)

    const opacityExpression: mapboxgl.Expression = [
      'case',
      ['boolean', ['feature-state', 'hover'], false],
      0.75,
      0.5,
    ]
    safeSetPaintProperty(map, fillLayerId, 'fill-opacity', opacityExpression)

    safeSetLayoutProperty(map, extrusionLayerId, 'visibility', 'none')
    safeSetLayoutProperty(map, 'municipios-hit', 'visibility', 'none')
    safeSetLayoutProperty(map, 'states-hit', 'visibility', 'none')
  }
}

// Ajusta apenas pitch/bearing sem afetar posição/zoom da câmera
const applyCameraAngle = (map: mapboxgl.Map) => {
  const is3D = dashboardStore.viewMode === '3d'
  if (is3D) {
    map.easeTo({ pitch: 55, bearing: -15, duration: 800 })
  } else {
    map.easeTo({ pitch: 0, bearing: 0, duration: 800 })
  }
}

// Atualizar o Mapa quando o Indicador ou Modo de Visualização mudar
const updateThematicVisualization = async (adjustCamera = true) => {
  if (!mapInstance.value || !isLoaded.value) return
  const map = mapInstance.value
  const indicator = dashboardStore.activeIndicator

  // Alternar Câmera entre 2D (plano) e 3D (inclinado) — apenas se solicitado
  // (não ajustar câmera quando chamado pelo watcher de município, pois o fitBounds cuidará disso)
  if (adjustCamera) {
    applyCameraAngle(map)
  }

  try {
    const showMunicipios = loadedEstadoCode.value || dashboardStore.mapLevel === 'municipios'

    if (showMunicipios) {
      // Exibir Municípios (filtrados por estado ou nacional completo)
      const targetGeoJson = loadedEstadoCode.value
        ? municipioGeoJson.value
        : nationalMunicipalitiesGeoJson.value

      if (targetGeoJson) {
        const stateCodeQuery = loadedEstadoCode.value || 'all'
        const munData =
          indicator !== 'none'
            ? await ibgeSidraService.getMunicipiosIndicatorData(stateCodeQuery, indicator)
            : {}

        applyThematicStyling(
          map,
          'municipios-source',
          'municipios-fill',
          'municipios-extrusion',
          munData,
          indicator,
          targetGeoJson
        )
      }
    } else if (stateGeoJson.value) {
      // Exibir Estados
      const stateData =
        indicator !== 'none' ? await ibgeSidraService.getEstadosIndicatorData(indicator) : {}

      applyThematicStyling(
        map,
        'brazil-states',
        'states-fill',
        'states-extrusion',
        stateData,
        indicator,
        stateGeoJson.value
      )
    }
  } catch (err) {
    console.error('Erro ao atualizar visualização temática:', err)
  }
}

watch(
  () => [dashboardStore.activeIndicator, dashboardStore.viewMode],
  () => updateThematicVisualization()
)

const handleDeselectMunicipio = async (map: mapboxgl.Map) => {
  // Se desmarcado, limpar destaque e resetar câmera nacional
  safeSetFilter(map, 'municipio-highlight', ['==', ['get', 'id'], ''])

  // Limpar camada de municípios se voltar para visualização nacional
  loadedEstadoCode.value = null
  municipioGeoJson.value = null

  if (dashboardStore.mapLevel === 'municipios') {
    // Se o nível do mapa for municípios, garantir que os municípios nacionais estão carregados e exibidos
    await loadNationalMunicipalities(map)
    safeSetLayoutProperty(map, 'municipios-fill', 'visibility', 'visible')
    safeSetLayoutProperty(map, 'municipios-borders', 'visibility', 'visible')

    safeSetLayoutProperty(map, 'states-fill', 'visibility', 'none')
    safeSetLayoutProperty(map, 'states-borders', 'visibility', 'none')
  } else {
    // Se voltar para o nível de estados, ocultar municípios e exibir estados
    safeSetLayoutProperty(map, 'municipios-fill', 'visibility', 'none')
    safeSetLayoutProperty(map, 'municipios-borders', 'visibility', 'none')
    safeSetLayoutProperty(map, 'municipios-extrusion', 'visibility', 'none')
    safeSetLayoutProperty(map, 'municipios-hit', 'visibility', 'none')

    safeSetLayoutProperty(map, 'states-fill', 'visibility', 'visible')
    safeSetLayoutProperty(map, 'states-borders', 'visibility', 'visible')
  }

  map.flyTo({
    center: [-51.9253, -14.235],
    zoom: 6.1,
    duration: 1500,
  })

  // Atualizar visualização temática nacional se houver um tema ativo
  updateThematicVisualization()
}

const handleSelectMunicipio = async (map: mapboxgl.Map, newMunicipio: Municipio) => {
  // Garantir que o nível do mapa está em 'municipios' ao selecionar um município
  if (dashboardStore.mapLevel !== 'municipios') {
    dashboardStore.setMapLevel('municipios')
  }

  isGeoJsonLoading.value = true

  try {
    // Ocultar preenchimento dos estados para focar nos municípios
    safeSetLayoutProperty(map, 'states-fill', 'visibility', 'none')
    safeSetLayoutProperty(map, 'states-borders', 'visibility', 'none')

    // Sempre carregar o GeoJSON nacional completo (loadNationalMunicipalities tem cache interno)
    // Isso garante que todos os municípios sejam exibidos, independente do nível anterior
    await loadNationalMunicipalities(map)
    const geojsonData = nationalMunicipalitiesGeoJson.value!

    // Reexibir a camada municipal caso estivesse oculta
    safeSetLayoutProperty(map, 'municipios-fill', 'visibility', 'visible')
    safeSetLayoutProperty(map, 'municipios-borders', 'visibility', 'visible')

    // Destacar o município selecionado no mapa
    safeSetFilter(map, 'municipio-highlight', ['==', ['get', 'id'], String(newMunicipio.id)])

    // Atualizar estilos temáticos SEM ajustar câmera
    // (o fitBounds abaixo cuidará do ângulo e posição da câmera)
    await updateThematicVisualization(false)

    // Encontrar a feature do município para obter os limites geográficos
    // O GeoJSON pode usar 'id' ou 'codigo_ibg' como identificador
    const munIdStr = String(newMunicipio.id)
    const is3D = dashboardStore.viewMode === '3d'

    if (geojsonData && geojsonData.features) {
      const feature = geojsonData.features.find(
        (f: Feature) =>
          f.properties?.id === munIdStr || String(f.properties?.codigo_ibg) === munIdStr
      )

      if (feature) {
        const bounds = geojsonService.getFeatureBounds(feature)
        // Calcular o centro do município a partir dos bounds
        const centerLng = (bounds[0][0] + bounds[1][0]) / 2
        const centerLat = (bounds[0][1] + bounds[1][1]) / 2
        // easeTo anima linearmente sem o zoom-out intermediário do flyTo
        map.easeTo({
          center: [centerLng, centerLat],
          zoom: 6.1,
          pitch: is3D ? 55 : 0,
          bearing: is3D ? -15 : 0,
          duration: 1200,
        })
      } else {
        console.warn(
          `Feature não encontrada para o município ${newMunicipio.id} (${newMunicipio.nome})`
        )
      }
    }
  } catch (err) {
    console.error('Erro ao focar no município:', err)
  } finally {
    isGeoJsonLoading.value = false
  }
}

// Sincronizar store do Pinia com a câmera do mapa e destaques
watch(
  () => dashboardStore.selectedMunicipio,
  async (newMunicipio) => {
    if (!mapInstance.value || !isLoaded.value) return
    const map = mapInstance.value

    if (!newMunicipio) {
      await handleDeselectMunicipio(map)
    } else {
      await handleSelectMunicipio(map, newMunicipio)
    }
  }
)

// Sincronizar store do Pinia com a câmera do mapa e destaques para estados
watch(
  () => dashboardStore.selectedEstado,
  async (newEstado) => {
    if (!mapInstance.value || !isLoaded.value) return
    const map = mapInstance.value

    if (!newEstado) {
      safeSetFilter(map, 'state-highlight', ['==', ['get', 'codigo_ibg'], ''])
      // Se desmarcado e no nível de estados, resetar câmera nacional
      if (dashboardStore.mapLevel === 'estados') {
        map.easeTo({
          center: [-51.9253, -14.235],
          zoom: 3.8,
          pitch: dashboardStore.viewMode === '3d' ? 55 : 0,
          bearing: dashboardStore.viewMode === '3d' ? -15 : 0,
          duration: 1200,
        })
      }
      updateThematicVisualization()
    } else {
      // Destacar o estado selecionado
      const stateIdStr = String(newEstado.id)
      safeSetFilter(map, 'state-highlight', ['==', ['get', 'codigo_ibg'], stateIdStr])

      // Encontrar a feature do estado para focar a câmera
      const geojson = await loadStatesGeoJson()
      if (geojson && geojson.features) {
        const feature = geojson.features.find(
          (f: Feature) =>
            String(f.properties?.codigo_ibg) === stateIdStr ||
            String(f.properties?.id) === stateIdStr
        )

        if (feature) {
          const bounds = geojsonService.getFeatureBounds(feature)
          const centerLng = (bounds[0][0] + bounds[1][0]) / 2
          const centerLat = (bounds[0][1] + bounds[1][1]) / 2

          await updateThematicVisualization(false)

          map.easeTo({
            center: [centerLng, centerLat],
            zoom: 6.1,
            pitch: dashboardStore.viewMode === '3d' ? 55 : 0,
            bearing: dashboardStore.viewMode === '3d' ? -15 : 0,
            duration: 1200,
          })
        }
      }
    }
  }
)

// Watcher para alternar dinamicamente o nível do mapa entre Estados e Municípios (Nível Nacional)
watch(
  () => dashboardStore.mapLevel,
  async (newLevel) => {
    if (!mapInstance.value || !isLoaded.value) return
    const map = mapInstance.value

    // Se voltar para estados e houver município selecionado, desselecionar
    if (newLevel === 'estados' && dashboardStore.selectedMunicipio) {
      dashboardStore.selectMunicipio(null)
      return
    }

    if (newLevel === 'municipios' && dashboardStore.selectedEstado) {
      dashboardStore.selectEstado(null)
    }

    if (newLevel === 'municipios') {
      // Ocultar estados
      safeSetLayoutProperty(map, 'states-fill', 'visibility', 'none')
      safeSetLayoutProperty(map, 'states-borders', 'visibility', 'none')
      safeSetLayoutProperty(map, 'states-extrusion', 'visibility', 'none')

      // Carregar e exibir municípios nacionais
      await loadNationalMunicipalities(map)
      safeSetLayoutProperty(map, 'municipios-fill', 'visibility', 'visible')
      safeSetLayoutProperty(map, 'municipios-borders', 'visibility', 'visible')
    } else {
      // Ocultar municípios
      safeSetLayoutProperty(map, 'municipios-fill', 'visibility', 'none')
      safeSetLayoutProperty(map, 'municipios-borders', 'visibility', 'none')
      safeSetLayoutProperty(map, 'municipios-extrusion', 'visibility', 'none')
      safeSetLayoutProperty(map, 'municipios-hit', 'visibility', 'none')

      // Exibir estados
      safeSetLayoutProperty(map, 'states-fill', 'visibility', 'visible')
      safeSetLayoutProperty(map, 'states-borders', 'visibility', 'visible')
    }

    updateThematicVisualization()
  }
)
</script>

<template>
  <div
    class="relative w-full h-full min-h-[400px] flex-grow rounded-2xl overflow-hidden border border-slate-800/80 bg-slate-950 shadow-2xl"
    :class="{
      'sidebar-open-mobile':
        dashboardStore.selectedMunicipio !== null || dashboardStore.selectedEstado !== null,
    }"
  >
    <!-- Target Container for Mapbox -->
    <div ref="mapContainer" class="w-full h-full absolute inset-0"></div>

    <!-- Overlay de Controles, Legendas e Filtros do Mapa -->
    <MapControls />

    <!-- Loading Overlay para Mapa Base -->
    <div
      v-if="!isLoaded && !error"
      class="absolute inset-0 bg-slate-950/80 backdrop-blur-md flex flex-col items-center justify-center z-20 transition-opacity duration-300"
    >
      <div
        class="w-12 h-12 rounded-full border-4 border-sky-500/20 border-t-sky-500 animate-spin mb-4"
      ></div>
      <p class="text-sm text-slate-400 font-medium tracking-wide">Carregando mapa interativo...</p>
    </div>

    <!-- Loading Overlay para GeoJSON Dinâmico -->
    <div
      v-if="isGeoJsonLoading"
      class="absolute bottom-6 right-16 z-20 glass-panel px-4 py-2.5 rounded-lg flex items-center gap-3 border border-slate-800 shadow-xl"
    >
      <div
        class="w-4 h-4 rounded-full border-2 border-sky-500/20 border-t-sky-500 animate-spin"
      ></div>
      <span class="text-xs text-slate-300 font-medium">Carregando malha municipal...</span>
    </div>

    <!-- Error State Overlay -->
    <div
      v-if="error"
      class="absolute inset-0 bg-slate-950/90 backdrop-blur-md flex flex-col items-center justify-center p-6 text-center z-20"
    >
      <div
        class="w-12 h-12 rounded-full bg-red-500/10 border border-red-500/20 flex items-center justify-center text-red-500 text-xl font-bold mb-4"
      >
        !
      </div>
      <h3 class="text-lg font-bold text-slate-100 mb-2">Erro ao carregar o Mapa</h3>
      <p class="text-sm text-slate-400 max-w-md mb-6 leading-relaxed">{{ error }}</p>
    </div>
  </div>
</template>

<style>
.mapboxgl-canvas {
  width: 100% !important;
  height: 100% !important;
  outline: none;
}

@media (max-width: 640px) {
  .sidebar-open-mobile .mapboxgl-ctrl-bottom-right {
    bottom: 115px !important;
    transition: bottom 0.3s ease;
  }
}
</style>
