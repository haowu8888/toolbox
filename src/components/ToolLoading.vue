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
  background: var(--surface-glass);
  border: 1px solid var(--border);
}

.spinner {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  border: 4px solid var(--primary-soft);
  border-top-color: var(--primary);
  animation: spin 0.9s linear infinite;
}

.text {
  margin: 1rem 0 0;
  color: var(--text);
  font-weight: 600;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}
</style>
