import { defineAsyncComponent } from 'vue'
import { tools, categoryGroups } from './meta'

const asyncTool = (loader) =>
  defineAsyncComponent({
    loader,
    delay: 150,
    timeout: 30000,
    suspensible: true,
  })

export { tools, categoryGroups }

export const toolMap = new Map(tools.map((t) => [t.id, t]))

export const toolComponentMap = {
  qrcode: asyncTool(() => import('../components/QRCodeGenerator.vue')),
  json: asyncTool(() => import('../components/JsonFormatter.vue')),
  encrypt: asyncTool(() => import('../components/TextEncryption.vue')),
  encoding: asyncTool(() => import('../components/EncodingTools.vue')),
  regex: asyncTool(() => import('../components/RegexTools.vue')),
  markdown: asyncTool(() => import('../components/MarkdownTools.vue')),
  time: asyncTool(() => import('../components/TimeTools.vue')),
  convert: asyncTool(() => import('../components/ConversionTools.vue')),
  color: asyncTool(() => import('../components/ColorTools.vue')),
  validator: asyncTool(() => import('../components/ValidatorTools.vue')),
  network: asyncTool(() => import('../components/NetworkTools.vue')),
  urltools: asyncTool(() => import('../components/UrlTools.vue')),
  csvjson: asyncTool(() => import('../components/CsvJsonConverter.vue')),
  curlfetch: asyncTool(() => import('../components/CurlFetchConverter.vue')),
  chmod: asyncTool(() => import('../components/ChmodTools.vue')),
  notes: asyncTool(() => import('../components/NotesTools.vue')),
  storage: asyncTool(() => import('../components/StoragePanel.vue')),
  settings: asyncTool(() => import('../components/SettingsPanel.vue')),
  textadvanced: asyncTool(() => import('../components/TextToolsAdvanced.vue')),
  calculator: asyncTool(() => import('../components/CalculatorTool.vue')),
  codeformatter: asyncTool(() => import('../components/CodeFormatterTools.vue')),
  fileconverter: asyncTool(() => import('../components/FileConverterTools.vue')),
  jwt: asyncTool(() => import('../components/JwtDecoder.vue')),
  cron: asyncTool(() => import('../components/CronParser.vue')),
  diff: asyncTool(() => import('../components/DiffTool.vue')),
  datagen: asyncTool(() => import('../components/DataGenerator.vue')),
  cssunit: asyncTool(() => import('../components/CssUnitConverter.vue')),
  imgcompress: asyncTool(() => import('../components/ImageCompressor.vue')),
  htmlentity: asyncTool(() => import('../components/HtmlEntityConverter.vue')),
  lottery: asyncTool(() => import('../components/LotteryTool.vue')),
  metalprice: asyncTool(() => import('../components/MetalPriceTool.vue')),
  configconvert: asyncTool(() => import('../components/ConfigConverter.vue')),
}
