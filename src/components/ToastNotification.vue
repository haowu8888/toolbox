<script setup>
import { useToast } from '../composables/useToast'

const { toasts, removeToast } = useToast()
</script>

<template>
  <Teleport to="body">
    <div class="toast-container" role="status" aria-live="polite">
      <TransitionGroup name="toast">
        <div
          v-for="toast in toasts"
          :key="toast.id"
          :class="['toast-item', `toast-${toast.type}`]"
          @click="removeToast(toast.id)"
        >
          <span class="toast-icon">
            {{ toast.type === 'success' ? '✓' : toast.type === 'error' ? '✕' : 'ℹ' }}
          </span>
          <span class="toast-message">{{ toast.message }}</span>
        </div>
      </TransitionGroup>
    </div>
  </Teleport>
</template>

<style scoped>
.toast-container {
  position: fixed;
  top: 1rem;
  right: 1rem;
  z-index: 99999;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  pointer-events: none;
}

.toast-item {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.7rem 1.2rem;
  border-radius: 8px;
  font-size: 0.9rem;
  font-weight: 500;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  cursor: pointer;
  pointer-events: auto;
  backdrop-filter: blur(8px);
  max-width: 320px;
  word-break: break-word;
}

.toast-icon {
  font-weight: 700;
  font-size: 1rem;
  flex-shrink: 0;
}

.toast-success {
  background: rgba(76, 175, 80, 0.95);
  color: white;
}

.toast-error {
  background: rgba(244, 67, 54, 0.95);
  color: white;
}

.toast-info {
  background: rgba(33, 150, 243, 0.95);
  color: white;
}

.toast-enter-active {
  transition: all 0.3s ease-out;
}

.toast-leave-active {
  transition: all 0.2s ease-in;
}

.toast-enter-from {
  opacity: 0;
  transform: translateX(100%);
}

.toast-leave-to {
  opacity: 0;
  transform: translateX(100%);
}

.toast-move {
  transition: transform 0.3s ease;
}

:global([data-theme='dark']) .toast-success {
  background: rgba(56, 142, 60, 0.95);
}

:global([data-theme='dark']) .toast-error {
  background: rgba(211, 47, 47, 0.95);
}

:global([data-theme='dark']) .toast-info {
  background: rgba(25, 118, 210, 0.95);
}
</style>
