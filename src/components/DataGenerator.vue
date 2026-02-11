<script setup>
import { ref } from 'vue'
import { useToast } from '../composables/useToast'
import { useHistory } from '../composables/useStorage'

const { showToast } = useToast()
const { addHistory } = useHistory()

const activeTab = ref('lorem')

// ==================== 随机工具函数 ====================
const randomInt = (min, max) => {
  const array = new Uint32Array(1)
  crypto.getRandomValues(array)
  return min + (array[0] % (max - min + 1))
}

const randomPick = (arr) => arr[randomInt(0, arr.length - 1)]

const randomPickMultiple = (arr, count) => {
  const result = []
  for (let i = 0; i < count; i++) {
    result.push(randomPick(arr))
  }
  return result
}

// ==================== 硬编码数据 ====================
const surnames = ['王', '李', '张', '刘', '陈', '杨', '赵', '黄', '周', '吴', '徐', '孙', '胡', '朱', '高', '林', '何', '郭', '马', '罗']
const maleNames = ['伟', '强', '磊', '军', '勇', '杰', '涛', '明', '超', '华', '飞', '鑫', '斌', '波', '宇']
const femaleNames = ['芳', '娜', '敏', '静', '丽', '婷', '莉', '燕', '玲', '娟', '萍', '琳', '霞', '秀']
const cities = ['北京', '上海', '广州', '深圳', '杭州', '成都', '武汉', '南京', '重庆', '西安', '苏州', '天津']
const districts = ['朝阳区', '海淀区', '浦东新区', '南山区', '西湖区', '武侯区', '江汉区']
const streets = ['中山路', '建设路', '人民路', '解放路', '和平路', '光明路', '幸福路']

const chineseSentences = [
  '随着人工智能技术的飞速发展，越来越多的行业开始探索智能化转型的可能性。',
  '云计算平台为企业提供了弹性可扩展的基础设施，大幅降低了运维成本。',
  '开源社区的蓬勃发展推动了全球软件技术的快速进步和知识共享。',
  '大数据分析能够从海量信息中发现隐藏的规律和趋势，为决策提供科学依据。',
  '春天的阳光洒在湖面上，微风轻拂，柳树的枝条在水面上划出优美的弧线。',
  '高山之巅白雪皑皑，山脚下溪流潺潺，大自然的壮美令人心旷神怡。',
  '区块链技术凭借其去中心化和不可篡改的特性，正在重塑金融行业的信任机制。',
  '物联网设备的普及使得万物互联成为现实，智慧城市的建设也因此加速推进。',
  '深度学习算法在图像识别和自然语言处理等领域取得了突破性的进展。',
  '绿色能源的开发利用对于实现可持续发展目标和应对气候变化至关重要。',
  '量子计算的研究正在为未来解决复杂计算问题提供全新的思路和方法。',
  '网络安全已成为数字时代最受关注的议题之一，数据隐私保护刻不容缓。',
  '微服务架构的广泛采用提高了系统的可维护性和团队的开发效率。',
  '自动驾驶技术的不断成熟有望彻底改变人们的出行方式和交通格局。',
]

const loremEnSentences = [
  'Lorem ipsum dolor sit amet, consectetur adipiscing elit.',
  'Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.',
  'Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris.',
  'Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore.',
  'Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia.',
  'Nulla facilisi morbi tempus iaculis urna id volutpat lacus.',
  'Pellentesque habitant morbi tristique senectus et netus et malesuada fames.',
  'Cras tincidunt lobortis feugiat vivamus at augue eget arcu.',
  'Viverra accumsan in nisl nisi scelerisque eu ultrices vitae.',
  'Amet venenatis urna cursus eget nunc scelerisque viverra mauris.',
]

// ==================== Lorem Ipsum Tab ====================
const loremCount = ref(3)
const loremLang = ref('zh')
const loremResult = ref('')

const generateLorem = () => {
  const sentences = loremLang.value === 'zh' ? chineseSentences : loremEnSentences
  const paragraphs = []
  for (let i = 0; i < loremCount.value; i++) {
    const sentenceCount = randomInt(3, 6)
    const paragraph = randomPickMultiple(sentences, sentenceCount).join('')
    paragraphs.push(paragraph)
  }
  loremResult.value = paragraphs.join('\n\n')
  addHistory('Lorem Ipsum', `生成了 ${loremCount.value} 段${loremLang.value === 'zh' ? '中文' : '英文'}占位文本`)
  showToast(`已生成 ${loremCount.value} 段占位文本`)
}

// ==================== 随机姓名 Tab ====================
const nameCount = ref(10)
const nameGender = ref('mixed')
const nameResult = ref([])

const generateName = () => {
  const surname = randomPick(surnames)
  let givenPool
  if (nameGender.value === 'male') {
    givenPool = maleNames
  } else if (nameGender.value === 'female') {
    givenPool = femaleNames
  } else {
    givenPool = randomInt(0, 1) === 0 ? maleNames : femaleNames
  }
  const givenLen = randomInt(1, 2)
  let givenName = ''
  for (let i = 0; i < givenLen; i++) {
    givenName += randomPick(givenPool)
  }
  return surname + givenName
}

const generateNames = () => {
  const names = []
  for (let i = 0; i < nameCount.value; i++) {
    names.push(generateName())
  }
  nameResult.value = names
  addHistory('随机姓名', `生成了 ${nameCount.value} 个中文姓名`)
  showToast(`已生成 ${nameCount.value} 个姓名`)
}

// ==================== 随机数据 Tab ====================
const dataCount = ref(5)
const dataType = ref('email')
const dataResult = ref([])

const generateEmail = () => {
  const name = generateName()
  const pinyin = ['wang', 'li', 'zhang', 'liu', 'chen', 'yang', 'zhao', 'huang', 'zhou', 'wu', 'xu', 'sun', 'hu', 'zhu', 'gao', 'lin', 'he', 'guo', 'ma', 'luo']
  const domains = ['qq.com', '163.com', 'gmail.com', 'outlook.com', 'foxmail.com', '126.com', 'sina.com']
  const prefix = randomPick(pinyin) + randomInt(100, 9999)
  return prefix + '@' + randomPick(domains)
}

const generatePhone = () => {
  const prefixes = ['130', '131', '132', '133', '134', '135', '136', '137', '138', '139',
    '150', '151', '152', '153', '155', '156', '157', '158', '159',
    '170', '171', '172', '173', '175', '176', '177', '178',
    '180', '181', '182', '183', '184', '185', '186', '187', '188', '189',
    '190', '191', '193', '195', '196', '197', '198', '199']
  let phone = randomPick(prefixes)
  for (let i = 0; i < 8; i++) {
    phone += randomInt(0, 9)
  }
  return phone
}

const generateAddress = () => {
  const city = randomPick(cities)
  const district = randomPick(districts)
  const street = randomPick(streets)
  const number = randomInt(1, 999)
  const building = randomInt(1, 30)
  const unit = randomInt(1, 6)
  const room = randomInt(101, 2505)
  return `${city}市${district}${street}${number}号${building}栋${unit}单元${room}室`
}

const generateData = () => {
  const result = []
  for (let i = 0; i < dataCount.value; i++) {
    if (dataType.value === 'email') {
      result.push(generateEmail())
    } else if (dataType.value === 'phone') {
      result.push(generatePhone())
    } else if (dataType.value === 'address') {
      result.push(generateAddress())
    }
  }
  dataResult.value = result
  const typeNames = { email: '邮箱', phone: '手机号', address: '地址' }
  addHistory('随机数据', `生成了 ${dataCount.value} 条${typeNames[dataType.value]}`)
  showToast(`已生成 ${dataCount.value} 条${typeNames[dataType.value]}`)
}

// ==================== JSON 模板 Tab ====================
const jsonCount = ref(5)
const jsonResult = ref('')

const generateJsonData = () => {
  const users = []
  for (let i = 0; i < jsonCount.value; i++) {
    users.push({
      name: generateName(),
      email: generateEmail(),
      phone: generatePhone(),
      age: randomInt(18, 65),
      address: generateAddress(),
    })
  }
  jsonResult.value = JSON.stringify(users, null, 2)
  addHistory('JSON 模板', `生成了 ${jsonCount.value} 条用户 JSON 数据`)
  showToast(`已生成 ${jsonCount.value} 条 JSON 数据`)
}

// ==================== 通用操作 ====================
const copyToClipboard = async (text) => {
  try {
    await navigator.clipboard.writeText(text)
    showToast('已复制到剪贴板')
  } catch (err) {
    showToast('复制失败', 'error')
  }
}

const downloadJson = () => {
  if (!jsonResult.value) {
    showToast('请先生成 JSON 数据', 'info')
    return
  }
  const blob = new Blob([jsonResult.value], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `mock-data-${Date.now()}.json`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
  showToast('JSON 文件已下载')
}

const copyListResult = (list) => {
  if (!list || list.length === 0) {
    showToast('没有可复制的数据', 'info')
    return
  }
  copyToClipboard(list.join('\n'))
}
</script>

<template>
  <div class="data-generator">
    <h2>数据生成器</h2>
    <p class="description">生成假数据、占位文本、随机姓名、JSON 模板等测试数据</p>

    <div class="mode-tabs">
      <button :class="['tab-btn', { active: activeTab === 'lorem' }]" @click="activeTab = 'lorem'">
        📝 Lorem Ipsum
      </button>
      <button :class="['tab-btn', { active: activeTab === 'name' }]" @click="activeTab = 'name'">
        👤 随机姓名
      </button>
      <button :class="['tab-btn', { active: activeTab === 'data' }]" @click="activeTab = 'data'">
        📊 随机数据
      </button>
      <button :class="['tab-btn', { active: activeTab === 'json' }]" @click="activeTab = 'json'">
        🗂️ JSON 模板
      </button>
    </div>

    <!-- Lorem Ipsum Tab -->
    <div v-show="activeTab === 'lorem'" class="tab-content">
      <div class="controls-row">
        <div class="control-group">
          <label>段落数量</label>
          <input type="number" v-model.number="loremCount" min="1" max="10" class="control-input" />
        </div>
        <div class="control-group">
          <label>语言</label>
          <select v-model="loremLang" class="control-input">
            <option value="zh">中文</option>
            <option value="en">English</option>
          </select>
        </div>
        <button class="btn btn-primary" @click="generateLorem">生成文本</button>
      </div>

      <div v-if="loremResult" class="result-box">
        <div class="result-header">
          <span class="result-label">生成结果</span>
          <button class="btn btn-copy" @click="copyToClipboard(loremResult)" title="复制">📋 复制</button>
        </div>
        <pre class="result-pre">{{ loremResult }}</pre>
      </div>
    </div>

    <!-- 随机姓名 Tab -->
    <div v-show="activeTab === 'name'" class="tab-content">
      <div class="controls-row">
        <div class="control-group">
          <label>数量</label>
          <input type="number" v-model.number="nameCount" min="1" max="50" class="control-input" />
        </div>
        <div class="control-group">
          <label>性别</label>
          <select v-model="nameGender" class="control-input">
            <option value="mixed">随机</option>
            <option value="male">男</option>
            <option value="female">女</option>
          </select>
        </div>
        <button class="btn btn-primary" @click="generateNames">生成姓名</button>
      </div>

      <div v-if="nameResult.length > 0" class="result-box">
        <div class="result-header">
          <span class="result-label">生成结果 ({{ nameResult.length }} 个)</span>
          <button class="btn btn-copy" @click="copyListResult(nameResult)" title="复制">📋 复制</button>
        </div>
        <div class="tag-list">
          <span v-for="(name, idx) in nameResult" :key="idx" class="tag-item">{{ name }}</span>
        </div>
      </div>
    </div>

    <!-- 随机数据 Tab -->
    <div v-show="activeTab === 'data'" class="tab-content">
      <div class="controls-row">
        <div class="control-group">
          <label>数量</label>
          <input type="number" v-model.number="dataCount" min="1" max="20" class="control-input" />
        </div>
        <div class="control-group">
          <label>类型</label>
          <select v-model="dataType" class="control-input">
            <option value="email">邮箱地址</option>
            <option value="phone">手机号码</option>
            <option value="address">中文地址</option>
          </select>
        </div>
        <button class="btn btn-primary" @click="generateData">生成数据</button>
      </div>

      <div v-if="dataResult.length > 0" class="result-box">
        <div class="result-header">
          <span class="result-label">生成结果 ({{ dataResult.length }} 条)</span>
          <button class="btn btn-copy" @click="copyListResult(dataResult)" title="复制">📋 复制</button>
        </div>
        <div class="data-list">
          <div v-for="(item, idx) in dataResult" :key="idx" class="data-list-item">
            <span class="data-index">{{ idx + 1 }}.</span>
            <code class="data-value">{{ item }}</code>
            <button class="btn btn-copy-sm" @click="copyToClipboard(item)" title="复制">📋</button>
          </div>
        </div>
      </div>
    </div>

    <!-- JSON 模板 Tab -->
    <div v-show="activeTab === 'json'" class="tab-content">
      <div class="controls-row">
        <div class="control-group">
          <label>数据条数</label>
          <input type="number" v-model.number="jsonCount" min="1" max="50" class="control-input" />
        </div>
        <button class="btn btn-primary" @click="generateJsonData">生成 JSON</button>
      </div>
      <p class="hint-text">生成包含 name、email、phone、age、address 字段的用户对象数组</p>

      <div v-if="jsonResult" class="result-box">
        <div class="result-header">
          <span class="result-label">JSON 结果</span>
          <div class="result-actions">
            <button class="btn btn-copy" @click="copyToClipboard(jsonResult)" title="复制">📋 复制</button>
            <button class="btn btn-download" @click="downloadJson" title="下载">💾 下载</button>
          </div>
        </div>
        <pre class="result-pre result-json">{{ jsonResult }}</pre>
      </div>
    </div>
  </div>
</template>

<style scoped>
.data-generator {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

h2 {
  margin: 0;
  color: #ff9800;
  font-size: 1.8em;
}

.description {
  margin: 0;
  color: #888;
  font-size: 0.95rem;
}

.mode-tabs {
  display: flex;
  gap: 0.5rem;
  flex-wrap: wrap;
}

.tab-btn {
  padding: 0.6rem 1.2rem;
  border: 2px solid #ffe0b2;
  background: white;
  border-radius: 8px;
  font-size: 0.9rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s;
  color: #666;
}

.tab-btn.active {
  background: #ff9800;
  color: white;
  border-color: #ff9800;
}

.tab-btn:hover:not(.active) {
  border-color: #ff9800;
  color: #ff9800;
}

.tab-content {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.controls-row {
  display: flex;
  align-items: flex-end;
  gap: 1rem;
  flex-wrap: wrap;
}

.control-group {
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
}

.control-group label {
  font-size: 0.85rem;
  font-weight: 600;
  color: #555;
}

.control-input {
  padding: 0.6rem 0.75rem;
  border: 2px solid #ffe0b2;
  border-radius: 8px;
  font-size: 0.95rem;
  background: #fffbf5;
  color: #333;
  min-width: 100px;
  transition: border-color 0.3s;
}

.control-input:focus {
  outline: none;
  border-color: #ff9800;
  box-shadow: 0 0 0 3px rgba(255, 152, 0, 0.1);
}

.hint-text {
  margin: 0;
  color: #999;
  font-size: 0.85rem;
  font-style: italic;
}

.result-box {
  background: linear-gradient(135deg, #fffaf0, #fffcf5);
  border: 2px solid #ffe0b2;
  border-radius: 10px;
  padding: 1rem;
  transition: all 0.3s;
}

.result-box:hover {
  border-color: #ffb74d;
  box-shadow: 0 4px 12px rgba(255, 152, 0, 0.12);
}

.result-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 0.75rem;
}

.result-label {
  font-weight: 600;
  color: #ff9800;
  font-size: 0.95rem;
}

.result-actions {
  display: flex;
  gap: 0.5rem;
}

.result-pre {
  margin: 0;
  padding: 0.75rem;
  background: #fafafa;
  border-radius: 6px;
  font-size: 0.9rem;
  font-family: 'Courier New', monospace;
  color: #333;
  white-space: pre-wrap;
  word-break: break-word;
  max-height: 400px;
  overflow-y: auto;
  line-height: 1.6;
}

.result-json {
  font-size: 0.85rem;
  line-height: 1.5;
}

.tag-list {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
}

.tag-item {
  display: inline-block;
  padding: 0.4rem 0.85rem;
  background: #fff3e0;
  border: 1px solid #ffe0b2;
  border-radius: 20px;
  font-size: 0.9rem;
  color: #e65100;
  font-weight: 500;
  transition: all 0.2s;
}

.tag-item:hover {
  background: #ffe0b2;
  border-color: #ffb74d;
}

.data-list {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.data-list-item {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 0.75rem;
  background: #fafafa;
  border-radius: 6px;
  transition: background 0.2s;
}

.data-list-item:hover {
  background: #fff3e0;
}

.data-index {
  font-weight: 600;
  color: #ff9800;
  min-width: 2rem;
  font-size: 0.85rem;
}

.data-value {
  flex: 1;
  font-family: 'Courier New', monospace;
  font-size: 0.9rem;
  color: #333;
  word-break: break-all;
}

.btn {
  padding: 0.6rem 1.2rem;
  border: none;
  border-radius: 6px;
  font-size: 0.95rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.3s;
}

.btn-primary {
  background: #ff9800;
  color: white;
}

.btn-primary:hover {
  background: #f57c00;
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(255, 152, 0, 0.3);
}

.btn-secondary {
  background-color: #f0f0f0;
  color: #333;
}

.btn-secondary:hover {
  background-color: #e0e0e0;
}

.btn-copy {
  padding: 0.4rem 0.8rem;
  background: #ff9800;
  color: white;
  font-size: 0.85rem;
  border-radius: 6px;
}

.btn-copy:hover {
  background: #f57c00;
  transform: translateY(-1px);
  box-shadow: 0 2px 8px rgba(255, 152, 0, 0.3);
}

.btn-copy-sm {
  padding: 0.25rem 0.5rem;
  background: transparent;
  color: #ff9800;
  font-size: 0.8rem;
  border-radius: 4px;
  opacity: 0.6;
  transition: all 0.2s;
}

.btn-copy-sm:hover {
  opacity: 1;
  background: #fff3e0;
}

.btn-download {
  padding: 0.4rem 0.8rem;
  background: #66bb6a;
  color: white;
  font-size: 0.85rem;
  border-radius: 6px;
}

.btn-download:hover {
  background: #4caf50;
  transform: translateY(-1px);
  box-shadow: 0 2px 8px rgba(76, 175, 80, 0.3);
}

@media (max-width: 768px) {
  .mode-tabs {
    flex-direction: column;
  }

  .controls-row {
    flex-direction: column;
    align-items: stretch;
  }

  .control-input {
    min-width: auto;
    width: 100%;
  }

  .result-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 0.5rem;
  }
}

@media (max-width: 480px) {
  h2 {
    font-size: 1.4em;
  }
}

/* ==================== Dark Mode ==================== */
:global([data-theme='dark'] .data-generator h2) {
  color: #ffb74d;
}

:global([data-theme='dark'] .data-generator .description) {
  color: #a0a0a0;
}

:global([data-theme='dark'] .data-generator .tab-btn) {
  background: #2a2a3e;
  border-color: #5c4a2a;
  color: #a0a0a0;
}

:global([data-theme='dark'] .data-generator .tab-btn.active) {
  background: #ff9800;
  color: white;
  border-color: #ff9800;
}

:global([data-theme='dark'] .data-generator .tab-btn:hover:not(.active)) {
  border-color: #ff9800;
  color: #ffb74d;
}

:global([data-theme='dark'] .data-generator .control-group label) {
  color: #c0c0c0;
}

:global([data-theme='dark'] .data-generator .control-input) {
  background: #2a2a3e;
  color: #e0e0e0;
  border-color: #5c4a2a;
}

:global([data-theme='dark'] .data-generator .control-input:focus) {
  border-color: #ff9800;
  box-shadow: 0 0 0 3px rgba(255, 152, 0, 0.15);
}

:global([data-theme='dark'] .data-generator .hint-text) {
  color: #707070;
}

:global([data-theme='dark'] .data-generator .result-box) {
  background: linear-gradient(135deg, #2e2a22, #302c25);
  border-color: #5c4a2a;
}

:global([data-theme='dark'] .data-generator .result-box:hover) {
  border-color: #7a6030;
  box-shadow: 0 4px 12px rgba(255, 152, 0, 0.15);
}

:global([data-theme='dark'] .data-generator .result-label) {
  color: #ffb74d;
}

:global([data-theme='dark'] .data-generator .result-pre) {
  background: #1e1e2e;
  color: #e0e0e0;
}

:global([data-theme='dark'] .data-generator .tag-item) {
  background: #3a3020;
  border-color: #5c4a2a;
  color: #ffb74d;
}

:global([data-theme='dark'] .data-generator .tag-item:hover) {
  background: #4a3a28;
  border-color: #7a6030;
}

:global([data-theme='dark'] .data-generator .data-list-item) {
  background: #1e1e2e;
}

:global([data-theme='dark'] .data-generator .data-list-item:hover) {
  background: #2e2a22;
}

:global([data-theme='dark'] .data-generator .data-index) {
  color: #ffb74d;
}

:global([data-theme='dark'] .data-generator .data-value) {
  color: #e0e0e0;
}

:global([data-theme='dark'] .data-generator .btn-secondary) {
  background-color: #404050;
  color: #e0e0e0;
}

:global([data-theme='dark'] .data-generator .btn-secondary:hover) {
  background-color: #505060;
}

:global([data-theme='dark'] .data-generator .btn-copy-sm) {
  color: #ffb74d;
}

:global([data-theme='dark'] .data-generator .btn-copy-sm:hover) {
  background: #3a3020;
}
</style>
