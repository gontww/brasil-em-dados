<script setup lang="ts">
import { onMounted, ref, watch } from 'vue'
import { useDebounceFn } from '@vueuse/core'
import mapboxgl from 'mapbox-gl'
import { useMapboxMap } from '../composables/useMapboxMap'
import { useDashboardStore, type MapIndicator } from '../../dashboard/dashboard.store'
import { geojsonService } from '../../../services/geojson/geojson.service'
import { ibgeSidraService } from '../../../services/ibge/ibgeSidra.service'
import { useQuery } from '@tanstack/vue-query'
import { ibgeLocalidadesService } from '../../../services/ibge/ibgeLocalidades.service'
import MapControls from './MapControls.vue'
import type { FeatureCollection, Feature } from 'geojson'

const mapContainer = ref<HTMLDivElement | null>(null)
const { mapInstance, isLoaded, error, initializeMap } = useMapboxMap()
const dashboardStore = useDashboardStore()

// Cache local
const loadedEstadoCode = ref<string | null>(null)
const isGeoJsonLoading = ref(false)
const stateGeoJson = ref<FeatureCollection | null>(null)
const municipioGeoJson = ref<FeatureCollection | null>(null)
const nationalMunicipalitiesGeoJson = ref<FeatureCollection | null>(null)

// Cache para evitar recálculos redundantes e chamadas lentas ao setFeatureState do Mapbox
const lastAppliedIndicator = ref<Record<string, string>>({})
const lastAppliedGeoJsonRef = ref<Record<string, unknown>>({})

const prefetchInitiated = ref(false)

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
      minZoom: 3,
      maxZoom: 14,
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

  // Preenchimento dos estados (2D)
  map.addLayer({
    id: 'states-fill',
    type: 'fill',
    source: 'brazil-states',
    paint: {
      'fill-color': '#0ea5e9',
      'fill-opacity': ['case', ['boolean', ['feature-state', 'hover'], false], 0.2, 0.05],
    },
  })

  // Bordas dos estados
  map.addLayer({
    id: 'states-borders',
    type: 'line',
    source: 'brazil-states',
    paint: {
      'line-color': '#38bdf8',
      'line-width': 1,
      'line-opacity': 0.4,
    },
  })

  // Camada de extrusão 3D para estados
  map.addLayer({
    id: 'states-extrusion',
    type: 'fill-extrusion',
    source: 'brazil-states',
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

  // Hover effect para estados
  let stateHoverId: string | number | null = null

  map.on('mousemove', 'states-fill', (e) => {
    if (e.features && e.features.length > 0) {
      if (stateHoverId !== null) {
        map.setFeatureState({ source: 'brazil-states', id: stateHoverId }, { hover: false })
      }
      stateHoverId = e.features[0].id ?? null
      if (stateHoverId !== null) {
        map.setFeatureState({ source: 'brazil-states', id: stateHoverId }, { hover: true })
      }
      map.getCanvas().style.cursor = 'pointer'
    }
  })

  map.on('mouseleave', 'states-fill', () => {
    if (stateHoverId !== null) {
      map.setFeatureState({ source: 'brazil-states', id: stateHoverId }, { hover: false })
    }
    stateHoverId = null
    map.getCanvas().style.cursor = ''
  })
}

// Configurar as camadas do mapa assim que estiver carregado
watch(isLoaded, async (loaded) => {
  if (loaded && mapInstance.value) {
    const map = mapInstance.value
    map.addControl(new mapboxgl.NavigationControl({ showCompass: false }), 'bottom-right')

    // Carregar e guardar geojson de estados localmente
    const res = await fetch('/geojson/brazil-states.json')
    stateGeoJson.value = await res.json()

    if (stateGeoJson.value) {
      setupStatesLayers(map, stateGeoJson.value)
    }
    setupMunicipiosEvents(map)

    if (!prefetchInitiated.value) {
      prefetchInitiated.value = true
      fetch('/geojson/brazil-municipalities.json')
        .then((r) => r.json())
        .then((data) => {
          nationalMunicipalitiesGeoJson.value = data
        })
        .catch(() => {
          // Silencioso: o fetch normal em loadNationalMunicipalities serve como fallback
        })
    }

    // Se o nível inicial do mapa for municípios, carregar e exibir
    if (dashboardStore.mapLevel === 'municipios') {
      showLevelMunicipios(map)
      await loadNationalMunicipalities(map)
      updateThematicVisualization()
    }
  }
})

// Registra eventos de clique e hover para municípios (tanto 2D quanto 3D)
const setupMunicipiosEvents = (map: mapboxgl.Map) => {
  let municipioHoverId: string | number | null = null

  const handleMouseMove = (e: mapboxgl.MapLayerMouseEvent) => {
    if (e.features && e.features.length > 0) {
      if (municipioHoverId !== null) {
        map.setFeatureState({ source: 'municipios-source', id: municipioHoverId }, { hover: false })
      }
      municipioHoverId = e.features[0].id ?? null
      if (municipioHoverId !== null) {
        map.setFeatureState({ source: 'municipios-source', id: municipioHoverId }, { hover: true })
      }
      map.getCanvas().style.cursor = 'pointer'
    }
  }

  const handleMouseLeave = () => {
    if (municipioHoverId !== null) {
      map.setFeatureState({ source: 'municipios-source', id: municipioHoverId }, { hover: false })
    }
    municipioHoverId = null
    map.getCanvas().style.cursor = ''
  }

  const handleLayerClick = (e: mapboxgl.MapLayerMouseEvent) => {
    if (e.features && e.features.length > 0 && municipiosList.value) {
      const props = e.features[0].properties
      if (props && props.id) {
        const idNum = Number.parseInt(props.id)
        const matched = municipiosList.value.find((m) => m.id === idNum)
        if (matched) {
          dashboardStore.selectMunicipio(matched)
        }
      }
    }
  }

  // Camada 2D (fill)
  map.on('mousemove', 'municipios-fill', handleMouseMove)
  map.on('mouseleave', 'municipios-fill', handleMouseLeave)
  map.on('click', 'municipios-fill', handleLayerClick)

  // Camada 3D (extrusion)
  map.on('mousemove', 'municipios-extrusion', handleMouseMove)
  map.on('mouseleave', 'municipios-extrusion', handleMouseLeave)
  map.on('click', 'municipios-extrusion', handleLayerClick)
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
  const selectedId = dashboardStore.selectedMunicipio
    ? String(dashboardStore.selectedMunicipio.id)
    : ''

  if (indicator === 'none') {
    // Resetar estilos
    map.setPaintProperty(fillLayerId, 'fill-color', '#0ea5e9')
    map.setPaintProperty(fillLayerId, 'fill-opacity', [
      'case',
      ['boolean', ['feature-state', 'hover'], false],
      0.2,
      sourceId === 'brazil-states' ? 0.05 : 0.0,
    ])

    if (map.getLayer(extrusionLayerId)) {
      map.setPaintProperty(extrusionLayerId, 'fill-extrusion-opacity', 0)
    }
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
      const val = indicatorData[code] || 0
      map.setFeatureState({ source: sourceId, id: Number(code) }, { value: val })
    })
    lastAppliedIndicator.value[sourceId] = indicator
    lastAppliedGeoJsonRef.value[sourceId] = geojsonData
  }

  // 3. Criar expressão de interpolação cromática
  const colorExpression: mapboxgl.Expression = [
    'interpolate',
    ['linear'],
    ['feature-state', 'value'],
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
    map.setLayoutProperty(fillLayerId, 'visibility', 'none')

    // Configurar e exibir Extrusão 3D
    if (map.getLayer(extrusionLayerId)) {
      map.setLayoutProperty(extrusionLayerId, 'visibility', 'visible')
      const hoverColorExpression: mapboxgl.Expression = [
        'case',
        ['==', ['get', 'id'], selectedId],
        '#f59e0b', // Destaque para o selecionado (amber-500)
        ['boolean', ['feature-state', 'hover'], false],
        '#38bdf8', // Cor de destaque no hover (sky-400)
        colorExpression,
      ]
      map.setPaintProperty(extrusionLayerId, 'fill-extrusion-color', hoverColorExpression)

      // Altura da extrusão de acordo com o valor estatístico
      const maxExtrusionHeight = sourceId === 'brazil-states' ? 180000 : 80000 // 180km para estados, 80km para mun

      const heightExpression: mapboxgl.Expression = [
        'interpolate',
        ['linear'],
        ['feature-state', 'value'],
        0,
        0,
        maxVal,
        maxExtrusionHeight,
      ]
      map.setPaintProperty(extrusionLayerId, 'fill-extrusion-height', heightExpression)
    }
  } else {
    // Exibir preenchimento 2D e ocultar 3D
    map.setLayoutProperty(fillLayerId, 'visibility', 'visible')
    map.setPaintProperty(fillLayerId, 'fill-color', colorExpression)

    const opacityExpression: mapboxgl.Expression = [
      'case',
      ['boolean', ['feature-state', 'hover'], false],
      0.75,
      0.5,
    ]
    map.setPaintProperty(fillLayerId, 'fill-opacity', opacityExpression)

    if (map.getLayer(extrusionLayerId)) {
      map.setLayoutProperty(extrusionLayerId, 'visibility', 'none')
    }
  }
}

const showLevelEstados = (map: mapboxgl.Map) => {
  if (map.getLayer('states-fill')) {
    map.setPaintProperty('states-fill', 'fill-opacity', [
      'case',
      ['boolean', ['feature-state', 'hover'], false],
      0.2,
      0.05,
    ])
  }
  if (map.getLayer('states-borders')) {
    map.setPaintProperty('states-borders', 'line-opacity', 0.4)
  }
  if (map.getLayer('municipios-fill')) {
    map.setPaintProperty('municipios-fill', 'fill-opacity', 0)
  }
  if (map.getLayer('municipios-borders')) {
    map.setPaintProperty('municipios-borders', 'line-opacity', 0)
  }
  if (map.getLayer('municipios-extrusion')) {
    map.setPaintProperty('municipios-extrusion', 'fill-extrusion-opacity', 0)
  }
}

const showLevelMunicipios = (map: mapboxgl.Map) => {
  if (map.getLayer('states-fill')) {
    map.setPaintProperty('states-fill', 'fill-opacity', 0)
  }
  if (map.getLayer('states-borders')) {
    map.setPaintProperty('states-borders', 'line-opacity', 0)
  }
  if (map.getLayer('states-extrusion')) {
    map.setPaintProperty('states-extrusion', 'fill-extrusion-opacity', 0)
  }
  if (map.getLayer('municipios-fill')) {
    map.setPaintProperty('municipios-fill', 'fill-opacity', [
      'case',
      ['boolean', ['feature-state', 'hover'], false],
      0.15,
      0.0,
    ])
  }
  if (map.getLayer('municipios-borders')) {
    map.setPaintProperty('municipios-borders', 'line-opacity', 0.4)
  }
}

const _updateThematicVisualizationImpl = async () => {
  if (!mapInstance.value || !isLoaded.value) return
  const map = mapInstance.value
  const indicator = dashboardStore.activeIndicator
  const is3D = dashboardStore.viewMode === '3d'

  // Alternar Câmera entre 2D (plano) e 3D (inclinado)
  if (is3D) {
    map.easeTo({ pitch: 55, bearing: -15, duration: 1000 })
  } else {
    map.easeTo({ pitch: 0, bearing: 0, duration: 1000 })
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
    } // Se estamos visualizando em nível nacional e com mapLevel de estados, aplicar estilos nos Estados
    else if (stateGeoJson.value) {
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

const updateThematicVisualization = useDebounceFn(_updateThematicVisualizationImpl, 300)

watch(() => [dashboardStore.activeIndicator, dashboardStore.viewMode], updateThematicVisualization)

// Sincronizar store do Pinia com a câmera do mapa e destaques
watch(
  () => dashboardStore.selectedMunicipio,
  async (newMunicipio) => {
    if (!mapInstance.value || !isLoaded.value) return
    const map = mapInstance.value

    if (!newMunicipio) {
      // Se desmarcado, limpar destaque e resetar câmera nacional
      if (map.getLayer('municipio-highlight')) {
        map.setFilter('municipio-highlight', ['==', ['get', 'id'], ''])
      }

      // Limpar camada de municípios se voltar para visualização nacional
      loadedEstadoCode.value = null
      municipioGeoJson.value = null

      if (dashboardStore.mapLevel === 'municipios') {
        // Se o nível do mapa for municípios, garantir que os municípios nacionais estão carregados e exibidos
        await loadNationalMunicipalities(map)
        showLevelMunicipios(map)
      } else {
        showLevelEstados(map)
      }

      map.flyTo({
        center: [-51.9253, -14.235],
        zoom: 3.8,
        duration: 1500,
      })

      // Atualizar visualização temática nacional se houver um tema ativo
      updateThematicVisualization()
      return
    }

    const estadoCode = String(newMunicipio.id).slice(0, 2)
    isGeoJsonLoading.value = true

    try {
      showLevelMunicipios(map)

      // Carregar GeoJSON do estado correspondente sob demanda se não estiver em cache
      let geojsonData: FeatureCollection

      if (nationalMunicipalitiesGeoJson.value) {
        geojsonData = nationalMunicipalitiesGeoJson.value
      } else if (loadedEstadoCode.value !== estadoCode) {
        geojsonData = await geojsonService.getMunicipiosByEstado(estadoCode)
        ensureMunicipiosSource(map, geojsonData)
        loadedEstadoCode.value = estadoCode
      } else {
        geojsonData = municipioGeoJson.value!
      }

      // Destacar o município selecionado no mapa
      if (map.getLayer('municipio-highlight')) {
        map.setFilter('municipio-highlight', ['==', ['get', 'id'], String(newMunicipio.id)])
      }

      // Encontrar a feature do município para obter os limites geográficos
      if (geojsonData && geojsonData.features) {
        const feature = geojsonData.features.find(
          (f: Feature) => f.properties?.id === String(newMunicipio.id)
        )

        if (feature) {
          const bounds = geojsonService.getFeatureBounds(feature)
          map.fitBounds(bounds, {
            padding: 100,
            maxZoom: 10,
            duration: 1500,
          })
        }
      }

      // Atualizar visualização temática municipal se houver um tema ativo
      updateThematicVisualization()
    } catch (err) {
      console.error('Erro ao focar no município:', err)
    } finally {
      isGeoJsonLoading.value = false
    }
  }
)

// Watcher para alternar dinamicamente o nível do mapa entre Estados e Municípios (Nível Nacional)
watch(
  () => dashboardStore.mapLevel,
  async (newLevel) => {
    if (!mapInstance.value || !isLoaded.value) return
    const map = mapInstance.value

    // Se houver um município selecionado, o comportamento de foco é mantido
    if (dashboardStore.selectedMunicipio) return

    if (newLevel === 'municipios') {
      showLevelMunicipios(map)
      await loadNationalMunicipalities(map)
    } else {
      showLevelEstados(map)
    }

    updateThematicVisualization()
  }
)
</script>

<template>
  <div
    class="relative w-full h-full min-h-[400px] flex-grow rounded-2xl overflow-hidden border border-slate-800/80 bg-slate-950 shadow-2xl"
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
      <div
        class="text-xs text-slate-500 border border-slate-800/80 px-4 py-3 rounded-lg bg-slate-900/50 max-w-lg"
      >
        Certifique-se de configurar o token público do Mapbox no arquivo
        <code class="text-sky-400">.env</code> como
        <code class="text-sky-400">VITE_MAPBOX_ACCESS_TOKEN</code>.
      </div>
    </div>
  </div>
</template>

<style>
.mapboxgl-canvas {
  width: 100% !important;
  height: 100% !important;
  outline: none;
}
</style>
