<script setup lang="ts">
import { ref, watch } from 'vue'
import { useDashboardStore } from '../dashboard.store'
import { useMunicipioStatsQuery } from '../composables/useMunicipioStats'
import EconomicChart from './EconomicChart.vue'

const dashboardStore = useDashboardStore()
const { data: stats, isLoading, error } = useMunicipioStatsQuery()
const isExpanded = ref(false)

// Reset panel expansion state when a new municipality is selected
watch(
  () => dashboardStore.selectedMunicipio,
  () => {
    isExpanded.value = false
  }
)

// Formatar valores financeiros de forma amigável (Milhões ou Bilhões)
const formatCurrencyHumanized = (value: number) => {
  if (value >= 1e9) {
    return `R$ ${(value / 1e9).toLocaleString('pt-BR', { maximumFractionDigits: 2 })} bilhões`
  }
  if (value >= 1e6) {
    return `R$ ${(value / 1e6).toLocaleString('pt-BR', { maximumFractionDigits: 2 })} milhões`
  }
  return value.toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    maximumFractionDigits: 0,
  })
}

const formatNumber = (val: number) => {
  return val.toLocaleString('pt-BR')
}
</script>

<template>
  <transition name="slide-panel">
    <div
      v-if="dashboardStore.sidebarOpen"
      class="absolute top-4 right-4 bottom-4 z-30 w-96 max-w-[calc(100vw-2rem)] glass-panel border border-slate-800/80 shadow-2xl rounded-2xl flex flex-col overflow-hidden"
      :class="{ 'is-expanded': isExpanded }"
    >
      <!-- Swipe/Drag handle helper (visible on mobile only) -->
      <div
        class="sm:hidden w-full py-2 flex justify-center cursor-pointer select-none"
        @click="isExpanded = !isExpanded"
      >
        <div
          class="w-12 h-1 bg-slate-700/80 hover:bg-slate-600 rounded-full transition-colors"
        ></div>
      </div>

      <!-- Header -->
      <div
        class="px-6 py-5 border-b border-slate-800/80 flex items-center justify-between bg-slate-900/40 select-none cursor-pointer sm:cursor-default"
      >
        <div class="flex-grow" @click="isExpanded = !isExpanded">
          <h2 class="text-lg font-bold text-slate-100 leading-tight">
            {{ dashboardStore.selectedMunicipio?.nome }}
          </h2>
          <p class="text-xs text-sky-400 font-semibold uppercase tracking-wider mt-0.5">
            Estado de {{ dashboardStore.selectedMunicipio?.estadoNome }} ({{
              dashboardStore.selectedMunicipio?.uf
            }})
          </p>
        </div>
        <div class="flex items-center gap-2">
          <!-- Botão Expandir/Recolher (apenas mobile) -->
          <button
            class="sm:hidden w-8 h-8 rounded-lg bg-slate-900/60 hover:bg-slate-800 border border-slate-800 text-slate-400 hover:text-slate-200 flex items-center justify-center transition-all cursor-pointer"
            :title="isExpanded ? 'Recolher Painel' : 'Expandir Painel'"
            @click.stop="isExpanded = !isExpanded"
          >
            <svg
              class="w-4 h-4 transition-transform duration-300"
              :class="{ 'rotate-180': isExpanded }"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2.5"
                d="M19 9l-7 7-7-7"
              />
            </svg>
          </button>

          <!-- Botão Fechar -->
          <button
            class="w-8 h-8 rounded-lg bg-slate-900/60 hover:bg-slate-800 border border-slate-800 text-slate-400 hover:text-slate-200 flex items-center justify-center transition-colors cursor-pointer"
            @click.stop="dashboardStore.closeSidebar"
          >
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2.5"
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>
      </div>

      <!-- Content Area -->
      <div
        class="flex-grow overflow-y-auto px-6 py-5 space-y-6 transition-opacity duration-200"
        :class="{
          'opacity-0 pointer-events-none sm:opacity-100 sm:pointer-events-auto': !isExpanded,
        }"
      >
        <!-- Skeleton Loading -->
        <div v-if="isLoading" class="space-y-6 animate-pulse">
          <div class="space-y-2">
            <div class="h-4 bg-slate-800 rounded w-1/3"></div>
            <div class="h-8 bg-slate-800 rounded w-3/4"></div>
          </div>
          <div class="space-y-2">
            <div class="h-4 bg-slate-800 rounded w-1/4"></div>
            <div class="h-8 bg-slate-800 rounded w-2/3"></div>
          </div>
          <div class="h-40 bg-slate-800 rounded-xl"></div>
        </div>

        <!-- Error State -->
        <div v-else-if="error" class="flex flex-col items-center justify-center py-12 text-center">
          <div
            class="w-12 h-12 rounded-full bg-red-500/10 border border-red-500/20 flex items-center justify-center text-red-500 text-lg font-bold mb-3"
          >
            !
          </div>
          <h4 class="text-sm font-semibold text-slate-200 mb-1">Erro ao carregar estatísticas</h4>
          <p class="text-xs text-slate-500 max-w-[240px] leading-relaxed">
            Não foi possível recuperar os dados do IBGE/SIDRA para este município.
          </p>
        </div>

        <!-- Success Stats -->
        <div v-else-if="stats" class="space-y-6">
          <!-- População -->
          <div
            class="bg-slate-900/30 border border-slate-800/50 p-4 rounded-xl flex items-center gap-4"
          >
            <div
              class="w-10 h-10 rounded-lg bg-sky-500/10 border border-sky-500/20 flex items-center justify-center text-sky-400"
            >
              <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
                />
              </svg>
            </div>
            <div>
              <p class="text-[10px] text-slate-500 font-bold uppercase tracking-wider">
                População Residente
              </p>
              <h3 class="text-lg font-extrabold text-slate-100 mt-0.5">
                {{ formatNumber(stats.populacao) }}
              </h3>
              <p class="text-[10px] text-slate-400 font-medium">Censo Demográfico 2022 (IBGE)</p>
            </div>
          </div>

          <!-- PIB Total & Per Capita -->
          <div class="grid grid-cols-2 gap-4">
            <div class="bg-slate-900/30 border border-slate-800/50 p-4 rounded-xl">
              <p class="text-[10px] text-slate-500 font-bold uppercase tracking-wider">PIB Total</p>
              <h4 class="text-sm font-extrabold text-slate-100 mt-1">
                {{ formatCurrencyHumanized(stats.pibTotal) }}
              </h4>
              <p class="text-[9px] text-slate-400 font-medium mt-0.5">Ano base 2021</p>
            </div>
            <div class="bg-slate-900/30 border border-slate-800/50 p-4 rounded-xl">
              <p class="text-[10px] text-slate-500 font-bold uppercase tracking-wider">
                PIB per Capita
              </p>
              <h4 class="text-sm font-extrabold text-sky-400 mt-1">
                {{ formatCurrencyHumanized(stats.pibPerCapita) }}/hab
              </h4>
              <p class="text-[9px] text-slate-400 font-medium mt-0.5">Média por habitante</p>
            </div>
          </div>

          <!-- Divisor -->
          <div class="h-px bg-slate-800/80"></div>

          <!-- Setores Econômicos (Gráfico) -->
          <div>
            <div class="flex items-center justify-between mb-4">
              <h4
                class="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-2"
              >
                <span class="w-1.5 h-3 bg-sky-500 rounded-sm"></span>
                Composição Econômica do PIB
              </h4>
            </div>
            <EconomicChart
              :agro="stats.pibAgropecuaria"
              :ind="stats.pibIndustria"
              :serv="stats.pibServicos"
              :admin="stats.pibAdministracao"
            />
          </div>
        </div>
      </div>

      <!-- Footer Info -->
      <div
        class="px-6 py-4 bg-slate-900/60 border-t border-slate-800/80 text-[10px] text-slate-500 text-center font-medium leading-relaxed"
      >
        Fonte dos dados: APIs SIDRA e Localidades do IBGE.
      </div>
    </div>
  </transition>
</template>

<style scoped>
.slide-panel-enter-active,
.slide-panel-leave-active {
  transition: all 0.35s cubic-bezier(0.16, 1, 0.3, 1);
}

.slide-panel-enter-from,
.slide-panel-leave-to {
  transform: translateX(100%) scale(0.97);
  opacity: 0;
}

@media (max-width: 640px) {
  .slide-panel-enter-from,
  .slide-panel-leave-to {
    transform: translateY(100%) !important;
    opacity: 1 !important;
  }

  /* Ajustar painel para bottom sheet */
  div.absolute {
    top: auto !important;
    right: 0 !important;
    left: 0 !important;
    bottom: 0 !important;
    width: 100% !important;
    max-width: 100% !important;
    height: 105px !important; /* Altura minimizada */
    border-radius: 20px 20px 0 0 !important;
    transition:
      height 0.3s cubic-bezier(0.16, 1, 0.3, 1),
      transform 0.35s cubic-bezier(0.16, 1, 0.3, 1) !important;
  }

  div.absolute.is-expanded {
    height: 65vh !important; /* Altura expandida */
  }
}
</style>
