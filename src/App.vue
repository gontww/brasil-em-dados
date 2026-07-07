<script setup lang="ts">
import { RouterView } from 'vue-router'
import Navbar from './components/layout/Navbar.vue'
</script>

<template>
  <div class="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
    <!-- Navbar Component -->
    <Navbar />

    <!-- Main Content Area -->
    <main class="flex-grow pt-16 flex flex-col">
      <RouterView v-slot="{ Component }">
        <transition name="fade" mode="out-in">
          <component :is="Component" />
        </transition>
      </RouterView>
    </main>
  </div>
</template>

<style>
/* Page transition styles */
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.2s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
