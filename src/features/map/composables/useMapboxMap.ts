import { shallowRef, ref, onBeforeUnmount } from 'vue'
import mapboxgl from 'mapbox-gl'

export function useMapboxMap() {
  const mapInstance = shallowRef<mapboxgl.Map | null>(null)
  const isLoaded = ref(false)
  const error = ref<string | null>(null)

  const initializeMap = (
    container: string | HTMLElement,
    options: Partial<mapboxgl.MapOptions> = {}
  ) => {
    const token = import.meta.env.VITE_MAPBOX_ACCESS_TOKEN

    if (!token || token.includes('your_')) {
      error.value = 'Token do Mapbox não configurado no arquivo .env'
      console.warn('Mapbox Access Token is missing or placeholder.')
    }

    mapboxgl.accessToken = token

    try {
      const map = new mapboxgl.Map({
        container,
        style: 'mapbox://styles/mapbox/dark-v11', // Custom dark theme by Mapbox
        center: [-51.9253, -14.235], // Center of Brazil [longitude, latitude]
        zoom: 3.8,
        pitch: 0,
        bearing: 0,
        antialias: true,
        ...options,
      })

      map.on('load', () => {
        isLoaded.value = true
      })

      map.on('error', (e) => {
        console.error('Mapbox error:', e)
        error.value = e.error?.message || 'Erro ao carregar o mapa.'
      })

      mapInstance.value = map
    } catch (err) {
      const errorMsg =
        err instanceof Error ? err.message : 'Falha ao inicializar a instância do Mapbox.'
      error.value = errorMsg
    }
  }

  const destroyMap = () => {
    if (mapInstance.value) {
      mapInstance.value.remove()
      mapInstance.value = null
      isLoaded.value = false
    }
  }

  onBeforeUnmount(() => {
    destroyMap()
  })

  return {
    mapInstance,
    isLoaded,
    error,
    initializeMap,
    destroyMap,
  }
}
