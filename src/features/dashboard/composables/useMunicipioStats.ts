import { useQuery } from '@tanstack/vue-query'
import { computed } from 'vue'
import { useDashboardStore } from '../dashboard.store'
import { ibgeSidraService } from '../../../services/ibge/ibgeSidra.service'

export function useMunicipioStatsQuery() {
  const dashboardStore = useDashboardStore()

  const enabled = computed(() => !!dashboardStore.selectedMunicipio || !!dashboardStore.selectedEstado)

  return useQuery({
    queryKey: [
      'location-stats',
      computed(() => dashboardStore.selectedMunicipio?.id || dashboardStore.selectedEstado?.id),
    ],
    queryFn: () => {
      if (dashboardStore.selectedMunicipio) {
        const mun = dashboardStore.selectedMunicipio
        return ibgeSidraService.getMunicipioStats(mun.id, mun.nome, mun.uf)
      } else if (dashboardStore.selectedEstado) {
        const est = dashboardStore.selectedEstado
        return ibgeSidraService.getEstadoStats(est.id, est.nome, est.sigla)
      }
      throw new Error('Nenhuma localidade selecionada')
    },
    enabled,
    staleTime: 1000 * 60 * 10, // Cache de 10 minutos
  })
}
