<script setup lang="ts">
import { computed } from 'vue'
import { useDashboardStore } from '../../dashboard/dashboard.store'

const dashboardStore = useDashboardStore()

const indicators = [
  { id: 'none', label: 'Sem Tema' },
  { id: 'populacao', label: 'População' },
  { id: 'pib', label: 'PIB Total' },
  { id: 'pibPerCapita', label: 'PIB per Capita' },
] as const

// Cores e limites fictícios para pré-visualização na legenda
const legendInfo = computed(() => {
  const ind = dashboardStore.activeIndicator
  if (ind === 'none') return null

  switch (ind) {
    case 'populacao':
      return {
        title: 'População Residente',
        gradient: 'linear-gradient(to right, #1e1b4b, #312e81, #4338ca, #6366f1, #818cf8, #c7d2fe)',
        min: 'Baixa',
        max: 'Alta',
      }
    case 'pib':
      return {
        title: 'Produto Interno Bruto (PIB)',
        gradient: 'linear-gradient(to right, #064e3b, #065f46, #0f766e, #0d9488, #14b8a6, #99f6e4)',
        min: 'Menor',
        max: 'Maior',
      }
    case 'pibPerCapita':
      return {
        title: 'PIB per Capita',
        gradient: 'linear-gradient(to right, #78350f, #92400e, #b45309, #d97706, #f59e0b, #fde68a)',
        min: 'Baixo',
        max: 'Alto',
      }
    default:
      return null
  }
})
</script>

<template>
  <div class="absolute bottom-6 left-6 z-10 flex flex-col gap-4 max-w-sm w-full sm:w-auto">
    <!-- Painel de Controles -->
    <div
      class="glass-panel p-4 rounded-xl border border-slate-800/80 shadow-2xl flex flex-col gap-3"
    >
      <!-- Seletor de Indicador -->
      <div>
        <label class="text-[10px] text-slate-500 font-bold uppercase tracking-wider block mb-2"
          >Indicador Temático</label
        >
        <div class="grid grid-cols-2 gap-1.5">
          <button
            v-for="ind in indicators"
            :key="ind.id"
            class="px-3 py-1.5 text-xs font-semibold rounded-lg border text-left transition-all duration-150 cursor-pointer flex items-center justify-between"
            :class="[
              dashboardStore.activeIndicator === ind.id
                ? 'bg-sky-500/10 text-sky-400 border-sky-500/50'
                : 'bg-slate-900/40 text-slate-400 border-slate-800/60 hover:border-slate-700/80 hover:text-slate-300',
            ]"
            @click="dashboardStore.setIndicator(ind.id)"
          >
            {{ ind.label }}
          </button>
        </div>
      </div>

      <!-- Divisor -->
      <div class="h-px bg-slate-800/60"></div>

      <!-- Alternador 2D / 3D -->
      <div class="flex items-center justify-between">
        <div>
          <h4 class="text-xs font-bold text-slate-200">Visualização 3D</h4>
          <p class="text-[10px] text-slate-500">Extrusão por valor no mapa</p>
        </div>
        <button
          class="w-12 h-6 rounded-full p-1 border transition-colors cursor-pointer relative"
          :class="[
            dashboardStore.viewMode === '3d'
              ? 'bg-sky-500/20 border-sky-500/50'
              : 'bg-slate-900/60 border-slate-800',
          ]"
          @click="dashboardStore.toggleViewMode"
        >
          <div
            class="w-4 h-4 rounded-full bg-slate-100 shadow transition-transform duration-200"
            :class="dashboardStore.viewMode === '3d' ? 'translate-x-6 bg-sky-400' : 'translate-x-0'"
          ></div>
        </button>
      </div>

      <!-- Divisor -->
      <div class="h-px bg-slate-800/60"></div>

      <!-- Nível do Mapa (Estados vs Municípios) -->
      <div class="flex items-center justify-between">
        <div>
          <h4 class="text-xs font-bold text-slate-200">Nível do Mapa</h4>
          <p class="text-[10px] text-slate-500">Visualizar estados ou todos os municípios</p>
        </div>
        <div class="flex bg-slate-950/80 border border-slate-800 p-0.5 rounded-lg">
          <button
            class="px-2.5 py-1 text-[10px] font-bold rounded-md transition-all cursor-pointer"
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
            class="px-2.5 py-1 text-[10px] font-bold rounded-md transition-all cursor-pointer"
            :class="[
              dashboardStore.mapLevel === 'municipios'
                ? 'bg-sky-500/20 text-sky-400 border border-sky-500/20'
                : 'text-slate-400 hover:text-slate-300 border border-transparent',
            ]"
            @click="dashboardStore.setMapLevel('municipios')"
          >
            Municípios
          </button>
        </div>
      </div>
    </div>

    <!-- Legenda Dinâmica -->
    <transition name="fade">
      <div
        v-if="legendInfo"
        class="glass-panel p-3.5 rounded-xl border border-slate-800/80 shadow-2xl flex flex-col gap-2"
      >
        <span class="text-[10px] text-slate-300 font-bold tracking-wide uppercase">{{
          legendInfo.title
        }}</span>
        <div class="h-2.5 w-full rounded" :style="{ background: legendInfo.gradient }"></div>
        <div class="flex items-center justify-between text-[10px] text-slate-400 font-semibold">
          <span>{{ legendInfo.min }}</span>
          <span>{{ legendInfo.max }}</span>
        </div>
      </div>
    </transition>
  </div>
</template>

<style scoped>
.fade-enter-active,
.fade-leave-active {
  transition:
    opacity 0.25s ease,
    transform 0.25s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
  transform: translateY(8px);
}
</style>
