import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { Municipio } from '../../services/ibge/ibge.types'

export type MapIndicator = 'none' | 'populacao' | 'pib' | 'pibPerCapita'
export type MapViewMode = '2d' | '3d'
export type MapLevelMode = 'estados' | 'municipios'

export const useDashboardStore = defineStore('dashboard', () => {
  const selectedMunicipio = ref<Municipio | null>(null)
  const sidebarOpen = ref(false)

  // Controle Temático
  const activeIndicator = ref<MapIndicator>('none')
  const viewMode = ref<MapViewMode>('2d')
  const mapLevel = ref<MapLevelMode>('estados')

  const selectMunicipio = (municipio: Municipio | null) => {
    selectedMunicipio.value = municipio
    sidebarOpen.value = municipio !== null
  }

  const closeSidebar = () => {
    selectedMunicipio.value = null
    sidebarOpen.value = false
  }

  const setIndicator = (indicator: MapIndicator) => {
    activeIndicator.value = indicator
  }

  const toggleViewMode = () => {
    viewMode.value = viewMode.value === '2d' ? '3d' : '2d'
  }

  const setMapLevel = (level: MapLevelMode) => {
    // Desselecionar município ao voltar para o nível de estados
    if (level === 'estados' && selectedMunicipio.value !== null) {
      selectedMunicipio.value = null
      sidebarOpen.value = false
    }
    mapLevel.value = level
  }

  return {
    selectedMunicipio,
    sidebarOpen,
    activeIndicator,
    viewMode,
    mapLevel,
    selectMunicipio,
    closeSidebar,
    setIndicator,
    toggleViewMode,
    setMapLevel,
  }
})
