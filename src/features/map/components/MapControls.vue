<script setup lang="ts">
import { ref, computed } from 'vue'
import { useDashboardStore } from '../../dashboard/dashboard.store'

const dashboardStore = useDashboardStore()
const isMobileControlsOpen = ref(false)

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
  <!-- BOTÃO FLUTUANTE DE FILTROS (MOBILE) -->
  <button
    class="md:hidden fixed top-[84px] right-4 z-20 w-10 h-10 rounded-full bg-slate-900/90 border border-slate-800 text-slate-300 hover:text-sky-400 flex items-center justify-center shadow-lg transition-colors cursor-pointer"
    :title="isMobileControlsOpen ? 'Fechar Filtros' : 'Abrir Filtros'"
    @click="isMobileControlsOpen = !isMobileControlsOpen"
  >
    <svg v-if="isMobileControlsOpen" class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M6 18L18 6M6 6l12 12" />
    </svg>
    <svg v-else class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path
        stroke-linecap="round"
        stroke-linejoin="round"
        stroke-width="2"
        d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z"
      />
    </svg>
  </button>

  <!-- PAINEL DE CONTROLES (MOBILE SUSPENSO) -->
  <transition name="fade">
    <div
      v-if="isMobileControlsOpen"
      class="md:hidden fixed top-[132px] right-4 z-20 w-72 glass-panel p-4 rounded-xl border border-slate-800/80 shadow-2xl flex flex-col gap-3"
    >
      <div class="flex items-center justify-between">
        <h4 class="text-xs font-bold text-slate-200 uppercase tracking-wider">Filtros do Mapa</h4>
      </div>
      <div class="h-px bg-slate-800/60"></div>

      <!-- Seletor de Indicador -->
      <div>
        <label class="text-[9px] text-slate-500 font-bold uppercase tracking-wider block mb-1.5"
          >Indicador Temático</label
        >
        <div class="grid grid-cols-2 gap-1.5">
          <button
            v-for="ind in indicators"
            :key="ind.id"
            class="px-2.5 py-1.5 text-[10px] font-semibold rounded-lg border text-left transition-all duration-150 cursor-pointer"
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

      <div class="h-px bg-slate-800/60"></div>

      <!-- Alternador 2D / 3D -->
      <div class="flex items-center justify-between">
        <div>
          <h4 class="text-xs font-bold text-slate-200">Visualização 3D</h4>
          <p class="text-[9px] text-slate-500">Extrusão por valor</p>
        </div>
        <button
          class="w-10 h-5 rounded-full p-0.5 border transition-colors cursor-pointer relative"
          :class="[
            dashboardStore.viewMode === '3d'
              ? 'bg-sky-500/20 border-sky-500/50'
              : 'bg-slate-900/60 border-slate-800',
          ]"
          @click="dashboardStore.toggleViewMode"
        >
          <div
            class="w-3.5 h-3.5 rounded-full bg-slate-100 shadow transition-transform duration-200"
            :class="dashboardStore.viewMode === '3d' ? 'translate-x-4 bg-sky-400' : 'translate-x-0'"
          ></div>
        </button>
      </div>

      <div class="h-px bg-slate-800/60"></div>

      <!-- Nível do Mapa -->
      <div class="flex items-center justify-between">
        <div>
          <h4 class="text-xs font-bold text-slate-200">Nível</h4>
          <p class="text-[9px] text-slate-500">Estados ou municípios</p>
        </div>
        <div class="flex bg-slate-950/80 border border-slate-800 p-0.5 rounded-lg">
          <button
            class="px-2 py-0.5 text-[9px] font-bold rounded-md transition-all cursor-pointer"
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
            class="px-2 py-0.5 text-[9px] font-bold rounded-md transition-all cursor-pointer"
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
      </div>
    </div>
  </transition>

  <!-- PAINEL DE CONTROLES E LEGENDA (DESKTOP) -->
  <div class="hidden md:flex absolute bottom-6 left-6 z-10 flex-col gap-4 w-80">
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

    <!-- Legenda Dinâmica (Desktop) -->
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

  <!-- LEGENDA DINÂMICA FLUTUANTE (MOBILE) -->
  <transition name="fade">
    <div
      v-if="legendInfo"
      class="md:hidden fixed z-10 glass-panel p-3.5 rounded-xl border border-slate-800/80 shadow-2xl flex flex-col gap-2 transition-all duration-300"
      :class="[
        dashboardStore.selectedMunicipio ? 'bottom-[115px] left-4 right-16' : 'bottom-6 left-4 right-16',
      ]"
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
