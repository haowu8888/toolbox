/**
 * 标识符命名风格转换：先把输入切成单词，再按目标风格拼接。
 * 支持 camelCase / PascalCase / snake_case / kebab-case / 空格分隔，能正确处理连续大写缩写（XMLHttpRequest）
 * 与数字（v2Beta）。多行输入按行独立转换，方便批量处理。
 */

const splitWords = (text) =>
  String(text ?? '')
    // 小写/数字后面跟大写：fooBar → foo Bar
    .replace(/([\p{Ll}\p{N}])(\p{Lu})/gu, '$1 $2')
    // 连续大写后面跟“大写+小写”：XMLHttp → XML Http
    .replace(/(\p{Lu}+)(\p{Lu}\p{Ll})/gu, '$1 $2')
    .split(/[^\p{L}\p{N}]+/u)
    .filter(Boolean)

const capitalize = (word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()

const mapLines = (text, convertLine) =>
  String(text ?? '')
    .split('\n')
    .map((line) => convertLine(line.trim()))
    .join('\n')

export const toCamelCase = (text) =>
  mapLines(text, (line) =>
    splitWords(line)
      .map((word, index) => (index === 0 ? word.toLowerCase() : capitalize(word)))
      .join(''),
  )

export const toPascalCase = (text) => mapLines(text, (line) => splitWords(line).map(capitalize).join(''))

export const toSnakeCase = (text) =>
  mapLines(text, (line) =>
    splitWords(line)
      .map((word) => word.toLowerCase())
      .join('_'),
  )

export const toKebabCase = (text) =>
  mapLines(text, (line) =>
    splitWords(line)
      .map((word) => word.toLowerCase())
      .join('-'),
  )

export const toConstantCase = (text) =>
  mapLines(text, (line) =>
    splitWords(line)
      .map((word) => word.toUpperCase())
      .join('_'),
  )

export { splitWords }
