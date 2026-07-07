import { useQuery } from '@tanstack/vue-query'
import { computed } from 'vue'
import { useDashboardStore } from '../dashboard.store'
import { ibgeSidraService } from '../../../services/ibge/ibgeSidra.service'

export function useMunicipioStatsQuery() {
  const dashboardStore = useDashboardStore()

  const enabled = computed(() => !!dashboardStore.selectedMunicipio)
  const municipio = computed(() => dashboardStore.selectedMunicipio)

  return useQuery({
    queryKey: ['municipio-stats', computed(() => municipio.value?.id)],
    queryFn: () => {
      const mun = municipio.value
      if (!mun) throw new Error('Nenhum município selecionado')
      return ibgeSidraService.getMunicipioStats(mun.id, mun.nome, mun.uf)
    },
    enabled,
    staleTime: 1000 * 60 * 10, // Cache de 10 minutos
  })
}
