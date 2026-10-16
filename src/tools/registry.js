import { defineAsyncComponent, h, reactive } from 'vue'
import ToolLoading from '../components/ToolLoading.vue'
import { tools, categoryGroups } from './meta'

export { tools, categoryGroups }

export const toolMap = new Map(tools.map((t) => [t.id, t]))

// 已完成加载的工具 id（响应式），App 据此输出 data-tool-ready
export const loadedToolIds = reactive(new Set())

// 每个工具一个独立 chunk
const toolLoaders = {
  qrcode: () => import('../components/QRCodeGenerator.vue'),
  json: () => import('../components/JsonFormatter.vue'),
  encrypt: () => import('../components/TextEncryption.vue'),
  encoding: () => import('../components/EncodingTools.vue'),
  regex: () => import('../components/RegexTools.vue'),
  markdown: () => import('../components/MarkdownTools.vue'),
  time: () => import('../components/TimeTools.vue'),
  convert: () => import('../components/ConversionTools.vue'),
  color: () => import('../components/ColorTools.vue'),
  validator: () => import('../components/ValidatorTools.vue'),
  network: () => import('../components/NetworkTools.vue'),
  urltools: () => import('../components/UrlTools.vue'),
  csvjson: () => import('../components/CsvJsonConverter.vue'),
  curlfetch: () => import('../components/CurlFetchConverter.vue'),
  chmod: () => import('../components/ChmodTools.vue'),
  notes: () => import('../components/NotesTools.vue'),
  storage: () => import('../components/StoragePanel.vue'),
  settings: () => import('../components/SettingsPanel.vue'),
  textadvanced: () => import('../components/TextToolsAdvanced.vue'),
  calculator: () => import('../components/CalculatorTool.vue'),
  codeformatter: () => import('../components/CodeFormatterTools.vue'),
  fileconverter: () => import('../components/FileConverterTools.vue'),
  jwt: () => import('../components/JwtDecoder.vue'),
  cron: () => import('../components/CronParser.vue'),
  diff: () => import('../components/DiffTool.vue'),
  datagen: () => import('../components/DataGenerator.vue'),
  cssunit: () => import('../components/CssUnitConverter.vue'),
  imgcompress: () => import('../components/ImageCompressor.vue'),
  htmlentity: () => import('../components/HtmlEntityConverter.vue'),
  lottery: () => import('../components/LotteryTool.vue'),
  metalprice: () => import('../components/MetalPriceTool.vue'),
  configconvert: () => import('../components/ConfigConverter.vue'),
}

// 不使用 Suspense：它与 KeepAlive 组合时只在首次加载触发 pending/resolve，
// 之后切换工具不会再回调，且初始挂载期间切换工具会卡住渲染。
const asyncTool = (id, loader) =>
  defineAsyncComponent({
    loader: () =>
      loader().then((mod) => {
        loadedToolIds.add(id)
        return mod
      }),
    loadingComponent: {
      name: 'ToolLoadingPlaceholder',
      render: () => h(ToolLoading, { toolName: toolMap.get(id)?.name ?? '' }),
    },
    delay: 150,
    timeout: 30000,
    suspensible: false,
  })

export const toolComponentMap = Object.fromEntries(
  Object.entries(toolLoaders).map(([id, loader]) => [id, asyncTool(id, loader)]),
)
