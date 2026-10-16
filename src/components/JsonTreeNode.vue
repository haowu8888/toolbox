<script setup>
import { computed, inject, ref } from 'vue'
import { childPath } from '../utils/jsonFormat'

defineOptions({ name: 'JsonTreeNode' })

const props = defineProps({
  label: { type: [String, Number], default: null },
  value: { type: null, required: true },
  path: { type: String, required: true },
})

// 超大数组 / 对象分批渲染，避免一次生成上万个节点
const CHILD_PAGE_SIZE = 200

const tree = inject('jsonTree')

const isContainer = computed(() => props.value !== null && typeof props.value === 'object')
const isArray = computed(() => Array.isArray(props.value))
const collapsed = computed(() => tree.isCollapsed(props.path))
const visibleCount = ref(CHILD_PAGE_SIZE)

const entries = computed(() => {
  if (!isContainer.value) return []
  return isArray.value
    ? props.value.map((value, index) => ({ key: index, value }))
    : Object.entries(props.value).map(([key, value]) => ({ key, value }))
})
const visibleEntries = computed(() => entries.value.slice(0, visibleCount.value))
const hiddenCount = computed(() => entries.value.length - visibleEntries.value.length)

const preview = computed(() =>
  isArray.value ? `Array(${props.value.length})` : `Object{${Object.keys(props.value).length}}`,
)

const valueType = computed(() => (props.value === null ? 'null' : typeof props.value))
const displayValue = computed(() =>
  typeof props.value === 'string' ? JSON.stringify(props.value) : String(props.value),
)
</script>

<template>
  <div class="tree-node">
    <button
      v-if="isContainer"
      type="button"
      class="tree-toggle"
      :aria-expanded="!collapsed"
      :aria-label="collapsed ? '展开' : '折叠'"
      @click="tree.toggle(path)"
    >
      {{ collapsed ? '▶' : '▼' }}
    </button>
    <span v-else class="tree-leaf-space"></span>
    <template v-if="label !== null">
      <button
        type="button"
        class="tree-key"
        :title="`点击复制路径 ${path}`"
        @click="tree.copyPath(path)"
      >
        {{ label }}
      </button>
      <span class="tree-colon">:</span>
    </template>
    <template v-if="isContainer">
      <span class="tree-preview">{{ preview }}</span>
      <div v-if="!collapsed" class="tree-children">
        <JsonTreeNode
          v-for="entry in visibleEntries"
          :key="entry.key"
          :label="entry.key"
          :value="entry.value"
          :path="childPath(path, entry.key)"
        />
        <button
          v-if="hiddenCount > 0"
          type="button"
          class="tree-more"
          @click="visibleCount += CHILD_PAGE_SIZE"
        >
          还有 {{ hiddenCount }} 项，继续显示
        </button>
      </div>
    </template>
    <span v-else :class="['tree-value', `type-${valueType}`]">{{ displayValue }}</span>
  </div>
</template>

<style scoped>
.tree-node {
  line-height: 1.6;
}

.tree-children {
  padding-left: 1.5rem;
  border-left: 1px dashed #ddd;
  margin-left: 0.4rem;
}

.tree-toggle,
.tree-key,
.tree-more {
  font: inherit;
  background: none;
  border: 0;
  padding: 0;
  cursor: pointer;
}

.tree-toggle {
  display: inline-block;
  width: 1rem;
  text-align: center;
  color: #999;
  font-size: 0.7rem;
  user-select: none;
}

.tree-toggle:hover {
  color: #42b883;
}

.tree-leaf-space {
  display: inline-block;
  width: 1rem;
}

.tree-key {
  color: #881391;
  font-weight: 600;
}

.tree-key:hover,
.tree-key:focus-visible {
  text-decoration: underline;
}

.tree-colon {
  color: #333;
  margin: 0 0.3rem;
}

.tree-preview {
  color: #999;
  font-size: 0.8rem;
  font-style: italic;
}

.tree-more {
  margin: 0.25rem 0 0.25rem 1rem;
  color: #42b883;
  font-size: 0.8rem;
}

.tree-value {
  word-break: break-all;
}

.tree-value.type-string {
  color: #0b7500;
}
.tree-value.type-number {
  color: #1a01cc;
}
.tree-value.type-boolean {
  color: #ff6b6b;
}
.tree-value.type-null {
  color: #808080;
  font-style: italic;
}

:root[data-theme='dark'] .tree-children {
  border-left-color: #555;
}

:root[data-theme='dark'] .tree-key {
  color: #c792ea;
}

:root[data-theme='dark'] .tree-colon {
  color: #e0e0e0;
}

:root[data-theme='dark'] .tree-value.type-string {
  color: #c3e88d;
}
:root[data-theme='dark'] .tree-value.type-number {
  color: #f78c6c;
}
:root[data-theme='dark'] .tree-value.type-boolean {
  color: #ff5370;
}
:root[data-theme='dark'] .tree-value.type-null {
  color: #808080;
}
</style>
