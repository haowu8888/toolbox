<script setup>
defineProps({
  toolName: {
    type: String,
    default: '',
  },
})
</script>

<template>
  <div class="tool-loading" role="status" aria-live="polite">
    <div class="spinner" aria-hidden="true"></div>
    <p class="text">正在加载{{ toolName ? `《${toolName}》` : '' }}…</p>
  </div>
</template>

<style scoped>
.tool-loading {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 220px;
  padding: 2rem;
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.6);
  border: 1px solid rgba(78, 205, 196, 0.25);
}

.spinner {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  border: 4px solid rgba(78, 205, 196, 0.25);
  border-top-color: rgba(78, 205, 196, 1);
  animation: spin 0.9s linear infinite;
}

.text {
  margin: 1rem 0 0;
  color: #333;
  font-weight: 600;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

:global([data-theme='dark']) .tool-loading {
  background: rgba(26, 26, 46, 0.65);
  border-color: rgba(78, 205, 196, 0.25);
}

:global([data-theme='dark']) .text {
  color: #e0e0e0;
}
</style>

