<script setup lang="ts">
const year = new Date().getFullYear()
</script>

<template>
  <footer class="footer-bar">
    <p class="footer-text">
      Desenvolvido por
      <strong class="footer-author">Augusto Gontijo</strong>
      {{ year }} 🧑‍💻
      <a
        href="https://www.gont.com.br"
        target="_blank"
        rel="noopener noreferrer"
        class="footer-link"
      >
        Acesse meu portfólio aqui
      </a>
    </p>
  </footer>
</template>

<style scoped>
.footer-bar {
  width: 100%;
  padding: 0.1rem 1.5rem;
  background: rgba(2, 6, 23, 0.85);
  backdrop-filter: blur(10px);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.footer-text {
  font-size: 0.72rem;
  color: #64748b;
  margin: 0;
  display: flex;
  align-items: center;
  gap: 0.3rem;
  flex-wrap: wrap;
  justify-content: center;
}

.footer-author {
  color: #94a3b8;
  font-weight: 600;
}

.footer-link {
  color: #38bdf8;
  text-decoration: none;
  font-weight: 500;
  transition:
    color 0.2s ease,
    text-shadow 0.2s ease;
}

.footer-link:hover {
  color: #7dd3fc;
  text-shadow: 0 0 8px rgba(56, 189, 248, 0.4);
}
</style>
