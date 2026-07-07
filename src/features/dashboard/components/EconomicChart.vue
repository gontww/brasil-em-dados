<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount, watch, shallowRef } from 'vue'
import * as echarts from 'echarts'

const props = defineProps<{
  agro: number
  ind: number
  serv: number
  admin: number
}>()

const chartContainer = ref<HTMLDivElement | null>(null)
const chartInstance = shallowRef<echarts.ECharts | null>(null)
let resizeObserver: ResizeObserver | null = null

// Formatar valor para real brasileiro (BRL)
const formatCurrency = (val: number) => {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    maximumFractionDigits: 0,
  }).format(val)
}

const updateChartOptions = () => {
  if (!chartInstance.value) return

  const total = props.agro + props.ind + props.serv + props.admin
  const option: echarts.EChartsOption = {
    backgroundColor: 'transparent',
    tooltip: {
      trigger: 'item',
      backgroundColor: '#0f172a', // slate-900
      borderColor: '#334155', // slate-700
      borderWidth: 1,
      textStyle: {
        color: '#f8fafc', // slate-50
        fontSize: 12,
        fontFamily: 'Inter, system-ui, sans-serif',
      },
      formatter: (params: unknown) => {
        const p = params as { name: string; value: number }
        const percent = ((p.value / total) * 100).toFixed(1)
        return `
          <div class="p-1">
            <span class="font-bold text-sky-400 mb-1 block">${p.name}</span>
            <span class="text-slate-300">${formatCurrency(p.value)}</span>
            <span class="text-slate-400 text-[10px] ml-1">(${percent}%)</span>
          </div>
        `
      },
    },
    legend: {
      orient: 'horizontal',
      bottom: '2%',
      left: 'center',
      itemWidth: 10,
      itemHeight: 10,
      itemGap: 14,
      textStyle: {
        color: '#94a3b8', // slate-400
        fontSize: 11,
        fontFamily: 'Inter, system-ui, sans-serif',
      },
    },
    series: [
      {
        name: 'Composição Econômica',
        type: 'pie',
        radius: ['45%', '65%'],
        center: ['50%', '38%'],
        avoidLabelOverlap: false,
        padAngle: 3,
        itemStyle: {
          borderRadius: 8,
        },
        label: {
          show: false,
          position: 'center',
        },
        emphasis: {
          label: {
            show: true,
            fontSize: 14,
            fontWeight: 'bold',
            color: '#f8fafc',
            formatter: '{b}',
          },
        },
        labelLine: {
          show: false,
        },
        data: [
          { value: props.agro, name: 'Agropecuária', itemStyle: { color: '#f59e0b' } }, // Amber-500
          { value: props.ind, name: 'Indústria', itemStyle: { color: '#ef4444' } }, // Red-500
          { value: props.serv, name: 'Serviços', itemStyle: { color: '#0ea5e9' } }, // Sky-500
          { value: props.admin, name: 'Adm. Pública', itemStyle: { color: '#10b981' } }, // Emerald-500
        ],
      },
    ],
  }

  chartInstance.value.setOption(option)
}

onMounted(() => {
  if (chartContainer.value) {
    chartInstance.value = echarts.init(chartContainer.value)
    updateChartOptions()

    // Configurar observador de redimensionamento responsivo
    resizeObserver = new ResizeObserver(() => {
      chartInstance.value?.resize()
    })
    resizeObserver.observe(chartContainer.value)
  }
})

onBeforeUnmount(() => {
  if (resizeObserver) {
    resizeObserver.disconnect()
  }
  chartInstance.value?.dispose()
})

// Atualizar o gráfico caso os dados mudem reativamente
watch(
  () => [props.agro, props.ind, props.serv, props.admin],
  () => {
    updateChartOptions()
  }
)
</script>

<template>
  <div ref="chartContainer" class="w-full h-72"></div>
</template>
