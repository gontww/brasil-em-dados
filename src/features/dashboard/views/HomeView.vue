<script setup lang="ts">
import { ref, watch } from 'vue'
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

const isSearchOpen = ref(false)

const indicators = [
  { id: 'none', label: 'Sem Tema' },
  { id: 'populacao', label: 'População' },
  { id: 'pib', label: 'PIB Total' },
  { id: 'pibPerCapita', label: 'PIB per Capita' },
] as const

const { data: municipios } = useQuery({
  queryKey: ['municipios'],
  queryFn: () => ibgeLocalidadesService.getMunicipios(),
  staleTime: Infinity,
})

const { data: estados } = useQuery({
  queryKey: ['estados'],
  queryFn: () => ibgeLocalidadesService.getEstados(),
  staleTime: Infinity,
})

watch(
  [municipios, estados, () => route.query],
  ([muns, ests, query]) => {
    if (!muns || !ests) return

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

    const queryEstId = query.est ? parseInt(query.est as string, 10) : null
    const currentEstId = dashboardStore.selectedEstado?.id || null

    if (queryEstId && queryEstId !== currentEstId) {
      const matched = ests.find((e) => e.id === queryEstId)
      if (matched) {
        dashboardStore.selectEstado(matched)
      }
    } else if (!queryEstId && currentEstId) {
      dashboardStore.selectEstado(null)
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

watch(
  [
    () => dashboardStore.selectedMunicipio,
    () => dashboardStore.selectedEstado,
    () => dashboardStore.activeIndicator,
    () => dashboardStore.viewMode,
    () => dashboardStore.mapLevel,
  ],
  ([mun, est, ind, mode, level]) => {
    const query: Record<string, string | undefined> = {
      ...route.query,
      mun: mun ? String(mun.id) : undefined,
      est: est ? String(est.id) : undefined,
      ind: ind !== 'none' ? ind : undefined,
      mode: mode !== '2d' ? mode : undefined,
      level: level !== 'estados' ? level : undefined,
    }

    Object.keys(query).forEach((key) => {
      if (query[key] === undefined) delete query[key]
    })

    router.replace({ query })
  }
)
</script>

<template>
  <div class="relative w-full flex-1 min-h-0 overflow-hidden flex flex-col">
    <!-- Map Container Wrapper -->
    <div
      class="flex-grow w-full h-full pt-4 px-4 md:pt-6 md:px-6 md:pb-2 bg-slate-950 relative flex flex-col"
    >
      <MapContainer />

      <!-- Desktop: Overlay Search Bar -->
      <div class="hidden md:block absolute top-8 left-8 z-10 w-80">
        <div class="glass-panel p-4 rounded-xl shadow-2xl">
          <p class="text-[10px] text-sky-400 font-bold mb-2 uppercase tracking-wider">
            Brasil em Dados
          </p>
          <SearchBar @select="dashboardStore.selectMunicipio" />
        </div>
      </div>

      <!-- Mobile: Top Bar Controls (Minimized Search and Accessible Filters) -->
      <div class="md:hidden absolute top-4 left-4 right-4 z-10">
        <transition name="fade-search" mode="out-in">
          <!-- Expanded Search Panel -->
          <div
            v-if="isSearchOpen"
            class="glass-panel p-3 rounded-xl shadow-2xl flex items-center gap-2"
          >
            <button
              class="w-8 h-8 rounded-lg bg-slate-900/60 hover:bg-slate-800 border border-slate-800 text-slate-400 hover:text-slate-200 flex items-center justify-center transition-colors cursor-pointer"
              title="Fechar Pesquisa"
              @click="isSearchOpen = false"
            >
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2.5"
                  d="M10 19l-7-7m0 0l7-7m-7 7h18"
                />
              </svg>
            </button>
            <SearchBar
              class="flex-grow"
              placeholder="Pesquise município..."
              @select="
                (mun) => {
                  dashboardStore.selectMunicipio(mun)
                  isSearchOpen = false
                }
              "
            />
          </div>

          <!-- Minimized Search Button + Direct Filters Row -->
          <div v-else class="flex items-center gap-2 w-full max-w-full overflow-hidden">
            <!-- Minimized Search Bubble Button -->
            <button
              class="flex-shrink-0 w-10 h-10 rounded-full bg-slate-900/90 border border-slate-800 text-slate-300 hover:text-sky-400 flex items-center justify-center shadow-lg transition-colors cursor-pointer"
              title="Pesquisar Município"
              @click="isSearchOpen = true"
            >
              <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2.5"
                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                />
              </svg>
            </button>

            <!-- Horizontal Scroll Filter Bar -->
            <div
              class="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-1 flex-grow scroll-smooth"
            >
              <!-- Nível Selector -->
              <div
                class="flex bg-slate-900/90 border border-slate-800 p-0.5 rounded-full flex-shrink-0"
              >
                <button
                  class="px-2.5 py-1 text-[10px] font-bold rounded-full transition-all cursor-pointer"
                  :class="[
                    dashboardStore.mapLevel === 'estados'
                      ? 'bg-sky-500/20 text-sky-400 border border-sky-500/20'
                      : 'text-slate-400 hover:text-slate-300 border border-transparent',
                  ]"
                  @click="dashboardStore.setMapLevel('estados')"
                >
                  Estados
                </button>
                <button
                  class="px-2.5 py-1 text-[10px] font-bold rounded-full transition-all cursor-pointer"
                  :class="[
                    dashboardStore.mapLevel === 'municipios'
                      ? 'bg-sky-500/20 text-sky-400 border border-sky-500/20'
                      : 'text-slate-400 hover:text-slate-300 border border-transparent',
                  ]"
                  @click="dashboardStore.setMapLevel('municipios')"
                >
                  Muns
                </button>
              </div>

              <!-- 3D Toggle -->
              <button
                class="flex-shrink-0 px-3 py-1.5 rounded-full text-[10px] font-bold border transition-all cursor-pointer flex items-center gap-1"
                :class="[
                  dashboardStore.viewMode === '3d'
                    ? 'bg-sky-500/20 text-sky-400 border-sky-500/50'
                    : 'bg-slate-900/90 text-slate-400 border-slate-800 hover:border-slate-700 hover:text-slate-300',
                ]"
                @click="dashboardStore.toggleViewMode"
              >
                <span>3D</span>
                <span
                  class="w-1.5 h-1.5 rounded-full"
                  :class="dashboardStore.viewMode === '3d' ? 'bg-sky-400' : 'bg-slate-600'"
                ></span>
              </button>

              <!-- Separator -->
              <div class="w-px h-5 bg-slate-800 flex-shrink-0 mx-0.5"></div>

              <!-- Theme/Indicator pills -->
              <button
                v-for="ind in indicators"
                :key="ind.id"
                class="flex-shrink-0 px-3 py-1.5 text-[10px] font-bold rounded-full border transition-all cursor-pointer"
                :class="[
                  dashboardStore.activeIndicator === ind.id
                    ? 'bg-sky-500/20 text-sky-400 border-sky-500/50'
                    : 'bg-slate-900/90 text-slate-400 border-slate-800 hover:border-slate-700/80 hover:text-slate-300',
                ]"
                @click="dashboardStore.setIndicator(ind.id)"
              >
                {{ ind.label }}
              </button>
            </div>
          </div>
        </transition>
      </div>

      <!-- Stats Sidebar Panel -->
      <StatsSidebar />
    </div>
  </div>
</template>

<style scoped>
/* Hide scrollbar for Chrome, Safari and Opera */
.no-scrollbar::-webkit-scrollbar {
  display: none;
}

/* Hide scrollbar for IE, Edge and Firefox */
.no-scrollbar {
  -ms-overflow-style: none; /* IE and Edge */
  scrollbar-width: none; /* Firefox */
}

.fade-search-enter-active,
.fade-search-leave-active {
  transition:
    opacity 0.15s ease,
    transform 0.15s ease;
}

.fade-search-enter-from,
.fade-search-leave-to {
  opacity: 0;
  transform: scale(0.98);
}
</style>
