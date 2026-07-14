import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { Municipio, Estado } from '../../services/ibge/ibge.types'

export type MapIndicator = 'none' | 'populacao' | 'pib' | 'pibPerCapita'
export type MapViewMode = '2d' | '3d'
export type MapLevelMode = 'estados' | 'municipios'

export const useDashboardStore = defineStore('dashboard', () => {
  const selectedMunicipio = ref<Municipio | null>(null)
  const selectedEstado = ref<Estado | null>(null)
  const sidebarOpen = ref(false)

  // Controle Temático
  const activeIndicator = ref<MapIndicator>('none')
  const viewMode = ref<MapViewMode>('2d')
  const mapLevel = ref<MapLevelMode>('estados')

  const selectMunicipio = (municipio: Municipio | null) => {
    selectedMunicipio.value = municipio
    if (municipio) {
      selectedEstado.value = null
    }
    sidebarOpen.value = municipio !== null || selectedEstado.value !== null
  }

  const selectEstado = (estado: Estado | null) => {
    selectedEstado.value = estado
    if (estado) {
      selectedMunicipio.value = null
    }
    sidebarOpen.value = estado !== null || selectedMunicipio.value !== null
  }

  const closeSidebar = () => {
    selectedMunicipio.value = null
    selectedEstado.value = null
    sidebarOpen.value = false
  }

  const setIndicator = (indicator: MapIndicator) => {
    activeIndicator.value = indicator
  }

  const toggleViewMode = () => {
    viewMode.value = viewMode.value === '2d' ? '3d' : '2d'
  }

  const setMapLevel = (level: MapLevelMode) => {
    mapLevel.value = level
  }

  return {
    selectedMunicipio,
    selectedEstado,
    sidebarOpen,
    activeIndicator,
    viewMode,
    mapLevel,
    selectMunicipio,
    selectEstado,
    closeSidebar,
    setIndicator,
    toggleViewMode,
    setMapLevel,
  }
})
