<script setup lang="ts">
import { watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useQuery } from '@tanstack/vue-query'
import MapContainer from '../../map/components/MapContainer.vue'
import SearchBar from '../../search/components/SearchBar.vue'
import StatsSidebar from '../components/StatsSidebar.vue'
import { useDashboardStore, type MapIndicator, type MapLevelMode } from '../dashboard.store'
import { ibgeLocalidadesService } from '../../../services/ibge/ibgeLocalidades.service'

const route = useRoute()
const router = useRouter()
const dashboardStore = useDashboardStore()

// Carregar lista de municípios para mapear o id da URL
const { data: municipios } = useQuery({
  queryKey: ['municipios'],
  queryFn: () => ibgeLocalidadesService.getMunicipios(),
  staleTime: Infinity,
})

// 1. Restaurar o estado a partir das query params do URL
watch(
  [municipios, () => route.query],
  ([muns, query]) => {
    if (!muns) return

    const queryMunId = query.mun ? parseInt(query.mun as string, 10) : null
    const currentMunId = dashboardStore.selectedMunicipio?.id || null

    if (queryMunId && queryMunId !== currentMunId) {
      const matched = muns.find((m) => m.id === queryMunId)
      if (matched) {
        dashboardStore.selectMunicipio(matched)
      }
    } else if (!queryMunId && currentMunId) {
      dashboardStore.selectMunicipio(null)
    }

    if (query.ind && query.ind !== dashboardStore.activeIndicator) {
      dashboardStore.setIndicator(query.ind as MapIndicator)
    }

    if (query.mode && query.mode !== dashboardStore.viewMode) {
      if (query.mode === '3d') {
        dashboardStore.viewMode = '3d'
      } else {
        dashboardStore.viewMode = '2d'
      }
    }

    if (query.level && query.level !== dashboardStore.mapLevel) {
      if (query.level === 'municipios' || query.level === 'estados') {
        dashboardStore.setMapLevel(query.level as MapLevelMode)
      }
    }
  },
  { immediate: true }
)

// 2. Sincronizar o estado da store de volta para a URL
watch(
  [
    () => dashboardStore.selectedMunicipio,
    () => dashboardStore.activeIndicator,
    () => dashboardStore.viewMode,
    () => dashboardStore.mapLevel,
  ],
  ([mun, ind, mode, level]) => {
    const query: Record<string, string | undefined> = {
      ...route.query,
      mun: mun ? String(mun.id) : undefined,
      ind: ind !== 'none' ? ind : undefined,
      mode: mode !== '2d' ? mode : undefined,
      level: level !== 'estados' ? level : undefined,
    }

    // Limpar valores indefinidos
    Object.keys(query).forEach((key) => {
      if (query[key] === undefined) delete query[key]
    })

    router.replace({ query })
  }
)
</script>

<template>
  <div class="relative w-full h-[calc(100vh-4rem)] overflow-hidden flex flex-col">
    <!-- Map Container Wrapper -->
    <div class="flex-grow w-full h-full p-4 md:p-6 bg-slate-950 relative flex flex-col">
      <MapContainer />

      <!-- Overlay Search Bar -->
      <div class="absolute top-4 left-4 right-4 md:right-auto md:w-80 md:top-8 md:left-8 z-10">
        <div class="glass-panel p-4 rounded-xl shadow-2xl">
          <p class="text-[10px] text-sky-400 font-bold mb-2 uppercase tracking-wider">
            Brasil em Dados
          </p>
          <SearchBar @select="dashboardStore.selectMunicipio" />
        </div>
      </div>

      <!-- Stats Sidebar Panel -->
      <StatsSidebar />
    </div>
  </div>
</template>
