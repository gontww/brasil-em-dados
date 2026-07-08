<script setup lang="ts">
import { ref, computed, watch, onMounted, onBeforeUnmount } from 'vue'
import { useQuery } from '@tanstack/vue-query'
import { ibgeLocalidadesService } from '../../../services/ibge/ibgeLocalidades.service'
import type { Municipio } from '../../../services/ibge/ibge.types'
import { useDashboardStore } from '../../dashboard/dashboard.store'

defineProps<{
  placeholder?: string
}>()

const emit = defineEmits<{
  (e: 'select', municipio: Municipio): void
}>()

const dashboardStore = useDashboardStore()

// Carregar lista de municípios usando o TanStack Query
const {
  data: municipios,
  isLoading,
  error,
} = useQuery({
  queryKey: ['municipios'],
  queryFn: () => ibgeLocalidadesService.getMunicipios(),
  staleTime: Infinity, // Dados estáticos do Censo/IBGE
})

const searchQuery = ref('')
const isOpen = ref(false)
const activeIndex = ref(0)
const searchInput = ref<HTMLInputElement | null>(null)
const containerRef = ref<HTMLDivElement | null>(null)

// Limpar o input de busca sempre que o município selecionado mudar (ex: por clique no mapa)
watch(
  () => dashboardStore.selectedMunicipio,
  () => {
    searchQuery.value = ''
  }
)

// Helper para remover acentos e caracteres especiais para busca difusa
function removeAccents(str: string): string {
  return str.normalize('NFD').replace(/[\u0300-\u036f]/g, '')
}

// Filtrar municípios de forma reativa e otimizada
const filteredMunicipios = computed(() => {
  const query = removeAccents(searchQuery.value.trim().toLowerCase())
  if (!query || query.length < 2 || !municipios.value) return []

  const matches: Municipio[] = []

  for (const mun of municipios.value) {
    const nameNormalized = removeAccents(mun.nome.toLowerCase())
    if (nameNormalized.includes(query)) {
      matches.push(mun)
    }
    // Limitar para 10 resultados para maximizar performance de renderização
    if (matches.length >= 10) break
  }

  return matches
})

// Resetar index ativo ao alterar busca
watch(searchQuery, () => {
  activeIndex.value = 0
  isOpen.value = searchQuery.value.trim().length >= 2
})

// Fechar ao clicar fora
const handleClickOutside = (e: MouseEvent) => {
  if (containerRef.value && !containerRef.value.contains(e.target as Node)) {
    isOpen.value = false
  }
}

onMounted(() => {
  document.addEventListener('click', handleClickOutside)
})

onBeforeUnmount(() => {
  document.removeEventListener('click', handleClickOutside)
})

// Ação de selecionar município
const handleSelect = (municipio: Municipio) => {
  searchQuery.value = `${municipio.nome} - ${municipio.uf}`
  isOpen.value = false
  emit('select', municipio)
  searchInput.value?.blur()
}

// Navegação por teclado
const handleKeyDown = (e: KeyboardEvent) => {
  if (!isOpen.value || filteredMunicipios.value.length === 0) return

  switch (e.key) {
    case 'ArrowDown':
      e.preventDefault()
      activeIndex.value = (activeIndex.value + 1) % filteredMunicipios.value.length
      break
    case 'ArrowUp':
      e.preventDefault()
      activeIndex.value =
        (activeIndex.value - 1 + filteredMunicipios.value.length) % filteredMunicipios.value.length
      break
    case 'Enter':
      e.preventDefault()
      handleSelect(filteredMunicipios.value[activeIndex.value])
      break
    case 'Escape':
      e.preventDefault()
      isOpen.value = false
      searchInput.value?.blur()
      break
  }
}
</script>

<template>
  <div ref="containerRef" class="relative w-full">
    <div class="relative flex items-center">
      <!-- Input de pesquisa -->
      <input
        ref="searchInput"
        v-model="searchQuery"
        type="text"
        aria-label="Pesquisar município"
        :placeholder="placeholder || 'Pesquise por município (ex: Chuí)...'"
        class="w-full h-11 bg-slate-900/90 text-slate-100 placeholder-slate-500 text-sm font-medium pl-4 pr-10 rounded-xl border border-slate-800 focus:border-sky-500/50 focus:outline-none focus:ring-2 focus:ring-sky-500/10 shadow-lg transition-all duration-200"
        @focus="isOpen = searchQuery.trim().length >= 2"
        @keydown="handleKeyDown"
      />

      <!-- Indicador de carregamento ou ícone de busca -->
      <div class="absolute right-3.5 flex items-center justify-center">
        <div
          v-if="isLoading"
          class="w-4 h-4 rounded-full border-2 border-sky-500/20 border-t-sky-500 animate-spin"
        ></div>
        <svg
          v-else
          class="w-4 h-4 text-slate-500"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2.5"
            d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
          />
        </svg>
      </div>
    </div>

    <!-- Dropdown de Resultados -->
    <transition name="slide-up">
      <div
        v-if="isOpen && filteredMunicipios.length > 0"
        class="absolute top-13 left-0 right-0 z-50 glass-panel rounded-xl shadow-2xl border border-slate-800/80 overflow-hidden py-1 max-h-72 overflow-y-auto"
      >
        <button
          v-for="(mun, idx) in filteredMunicipios"
          :key="mun.id"
          class="w-full px-4 py-2.5 text-left text-sm font-medium flex items-center justify-between transition-colors duration-150"
          :class="[
            idx === activeIndex
              ? 'bg-sky-500/10 text-sky-400 border-l-2 border-sky-500 pl-3.5'
              : 'text-slate-300 hover:bg-slate-800/50 border-l-2 border-transparent',
          ]"
          @click="handleSelect(mun)"
          @mouseenter="activeIndex = idx"
        >
          <span>{{ mun.nome }}</span>
          <span
            class="text-xs font-semibold px-2 py-0.5 rounded bg-slate-800 text-slate-400 group-hover:bg-slate-700 transition-colors"
          >
            {{ mun.uf }}
          </span>
        </button>
      </div>
    </transition>

    <!-- Sem Resultados / Erros -->
    <div
      v-if="
        isOpen && searchQuery.trim().length >= 2 && filteredMunicipios.length === 0 && !isLoading
      "
      class="absolute top-13 left-0 right-0 z-50 glass-panel rounded-xl shadow-2xl border border-slate-800/80 p-4 text-center text-xs text-slate-500"
    >
      Nenhum município encontrado para "{{ searchQuery }}"
    </div>

    <div
      v-if="error"
      class="absolute top-13 left-0 right-0 z-50 bg-red-950/20 border border-red-500/20 rounded-xl p-3 text-xs text-red-400 text-center"
    >
      Erro ao carregar dados de busca.
    </div>
  </div>
</template>

<style scoped>
.slide-up-enter-active,
.slide-up-leave-active {
  transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
}

.slide-up-enter-from,
.slide-up-leave-to {
  transform: translateY(-8px);
  opacity: 0;
}
</style>
