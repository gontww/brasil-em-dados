import { describe, it, expect, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useDashboardStore } from '../features/dashboard/dashboard.store'
import type { Municipio } from '../services/ibge/ibge.types'

const dummyMunicipio: Municipio = {
  id: 3550308,
  nome: 'São Paulo',
  uf: 'SP',
  estadoNome: 'São Paulo',
}

describe('Dashboard Store', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('deve inicializar com valores padrão', () => {
    const store = useDashboardStore()
    expect(store.selectedMunicipio).toBeNull()
    expect(store.sidebarOpen).toBe(false)
    expect(store.activeIndicator).toBe('none')
    expect(store.viewMode).toBe('2d')
    expect(store.mapLevel).toBe('estados')
  })

  it('deve atualizar o município selecionado e abrir a sidebar', () => {
    const store = useDashboardStore()
    store.selectMunicipio(dummyMunicipio)
    expect(store.selectedMunicipio).toEqual(dummyMunicipio)
    expect(store.sidebarOpen).toBe(true)
  })

  it('deve fechar a sidebar e deselecionar o município', () => {
    const store = useDashboardStore()
    store.selectMunicipio(dummyMunicipio)
    store.closeSidebar()
    expect(store.sidebarOpen).toBe(false)
    expect(store.selectedMunicipio).toBeNull()
  })

  it('deve alternar o modo de visualização entre 2d e 3d', () => {
    const store = useDashboardStore()
    expect(store.viewMode).toBe('2d')
    store.toggleViewMode()
    expect(store.viewMode).toBe('3d')
    store.toggleViewMode()
    expect(store.viewMode).toBe('2d')
  })

  it('deve definir o nível do mapa entre estados e municípios', () => {
    const store = useDashboardStore()
    expect(store.mapLevel).toBe('estados')
    store.setMapLevel('municipios')
    expect(store.mapLevel).toBe('municipios')
    store.setMapLevel('estados')
    expect(store.mapLevel).toBe('estados')
  })
})
