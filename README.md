# Brasil em Dados 🌍📊

**Brasil em Dados** é uma aplicação interativa 100% frontend para visualização de dados demográficos, econômicos e setoriais de todos os municípios do Brasil diretamente em um mapa 2D e 3D. O projeto foi estruturado com foco em altíssima performance, design premium (glassmorphism) e excelente experiência do usuário.

Visite o site aqui: https://brasilemdados.gont.com.br

---

## 🚀 Tecnologias Utilizadas

O projeto foi construído utilizando um ecossistema moderno de desenvolvimento frontend:

- **Vue 3** (Composition API, `<script setup>`)
- **TypeScript** para tipagem estática e segurança em tempo de desenvolvimento.
- **Vite** como build tool ultrarrápido.
- **Mapbox GL JS** para renderização vetorial de mapas, mapas de calor, limites geográficos e extrusões 3D.
- **Apache ECharts** para visualizações de gráficos interativos econômicos e de radar multidimensional.
- **Pinia** para gerenciamento de estado global e reativo.
- **TanStack Query (Vue Query)** para caching inteligente de requisições e gerenciamento de estados assíncronos.
- **Vue Router** para navegação e deep linking (sincronização de filtros diretamente no link da URL).
- **Tailwind CSS** para estilização utilitária de alta performance e responsividade nativa.
- **Vitest** para testes unitários automatizados.
- **ESLint & Prettier** para integridade e formatação de código.

---

## 🛠️ Arquitetura do Projeto

A organização dos diretórios segue uma abordagem orientada a **Features (Módulos)**, facilitando a escalabilidade do sistema:

```text
src/
├── assets/             # Estilos CSS globais e tokens de design
├── components/         # Componentes compartilhados globais (Navbar, etc.)
├── features/           # Módulos principais da aplicação
│   ├── comparison/     # Comparador de municípios (radar chart, dados lado a lado)
│   ├── dashboard/      # Sidebar detalhada, estatísticas e gráficos do município
│   ├── map/            # Componentes, legendas e composables do Mapbox GL JS
│   ├── ranking/        # Visualização de maiores PIBs e populações
│   └── search/         # Barra de pesquisa preditiva com teclado
├── router/             # Configuração de rotas da aplicação
├── services/           # Integração com APIs externas (IBGE SIDRA, Localidades)
│   ├── geojson/        # Cache e carregamento dinâmico de malhas (GeoJSON)
│   └── ibge/           # Handlers e formatadores de dados brutos do Censo/PIB
├── __tests__/          # Suíte de testes unitários com Vitest
├── App.vue             # Componente raiz da aplicação
└── main.ts             # Inicializador principal
```

---

## 📡 Integrações de Dados (IBGE)

Toda a coleta de dados estatísticos é feita em tempo real e de forma dinâmica consumindo as APIs governamentais oficiais:

1. **Malha Geográfica (GeoJSON)**: Limites de estados e municípios carregados dinamicamente sob demanda para garantir a leveza da inicialização da página.
2. **IBGE Localidades**: API REST utilizada para mapeamento dos IDs de municípios brasileiros, nomes e siglas de UFs.
3. **IBGE SIDRA (Censo e Contas Regionais)**:
   - **Tabela 4714 (Censo 2022)**: Dados populacionais precisos.
   - **Tabela 5938 (PIB dos Municípios)**: PIB Total, PIB per capita e composição do PIB setorial (Agropecuária, Indústria, Serviços e Administração Pública).

---

## 🎨 Funcionalidades em Destaque

- **Visualização Coroplética Dinâmica**: O mapa pinta automaticamente estados e municípios com paletas cromáticas baseadas no indicador selecionado (População, PIB, PIB per Capita).
- **Extrusão 3D (3D Extrusion)**: Renderização tridimensional onde a altura de cada área do mapa é proporcional à grandeza de seu valor estatístico.
- **Comparador Multidimensional**: Permite selecionar dois municípios simultaneamente, apresentando uma análise comparativa textual inteligente e um gráfico de radar multidimensional.
- **Compartilhamento via URL (Deep Linking)**: O estado selecionado (município, indicador ativo e modo 2D/3D) é sincronizado em tempo real com a URL. Copiar e colar a URL restaura instantaneamente a tela exatamente no mesmo ponto.
- **Responsividade Adaptativa (Bottom Sheet)**: Em celulares, o painel de estatísticas se transforma em um bottom-sheet nativo que desliza a partir da base da tela.
- **Exportação Local**: Faça o download dos gráficos em formato **PNG** de alta resolução e imprima relatórios limpos graças aos estilos `@media print` dedicados.

---

## 💻 Configuração e Instalação

### Pré-requisitos
- Node.js (v18+)
- Token público do Mapbox (gratuito no site do [Mapbox](https://www.mapbox.com/))

### 1. Clonar o Repositório
```bash
git clone <url-do-repositorio>
cd brasil-em-dados
```

### 2. Configurar Variáveis de Ambiente
Crie um arquivo `.env` na raiz do projeto e configure o token público do Mapbox:
```env
VITE_MAPBOX_ACCESS_TOKEN=seu_token_publico_do_mapbox_aqui
```

### 3. Instalar Dependências
```bash
npm install
```

### 4. Executar Servidor de Desenvolvimento
```bash
npm run dev
```

### 5. Executar Suíte de Testes (Vitest)
```bash
npm run test
```

### 6. Gerar Build de Produção
```bash
npm run build
```

---

## 📄 Licença

Este projeto é desenvolvido para fins de portfólio acadêmico e profissional, sendo livre para uso comercial ou privado sob os termos da licença MIT.
