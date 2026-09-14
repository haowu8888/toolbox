# 工具箱 · Toolbox

一个纯浏览器端运行的开发者工具集：32 个常用工具，免费、无需注册、隐私优先。所有数据只保存在你自己的浏览器里，支持 PWA 安装与离线使用。

在线地址：<https://wzh-toolbox-89.deno.dev>（Deno Deploy，按 `main` 分支自动发布）

## 功能一览

| 分类 | 工具 |
| --- | --- |
| 基础工具 | 二维码生成/识别、JSON 格式化（树形视图） |
| 编码转换 | 文本加密（MD5/SHA/AES）、Base64/URL 编解码、正则测试、JWT 解码、HTML 实体、JSON/YAML/TOML 互转 |
| 内容处理 | Markdown 预览与导出、文本对比（并排视图、行内高亮、unified diff 导出） |
| 数据转换 | 时间戳/日期互转、单位换算、颜色工具、CSS 单位换算 |
| 验证工具 | 邮箱/手机/URL/IP/身份证校验、DNS 与 IP 查询、Cron 表达式解析、URL 解析 |
| 开发辅助 | CSV ↔ JSON、cURL 转 fetch、chmod 权限换算 |
| 高级工具 | 文本处理（UUID/密码/大小写）、计算器、代码格式化、文件转换与哈希、模拟数据生成、图片压缩、幸运转盘、金属行情 |
| 数据管理 | 笔记与待办、历史/收藏、设置（主题、备份导入导出） |

快捷键：`Ctrl + K`（Mac 为 `⌘ + K`）打开命令面板，支持中英文关键词、描述搜索与最近使用优先。

## 隐私说明

- 所有工具在本地计算，不上传任何输入内容。
- 仅以下三个工具会发起网络请求，且只请求公开接口：
  - 网络工具：`dns.google`（DNS）、`ipapi.co`（本机 IP）
  - 金属行情：`api.gold-api.com`（报价）、`api.frankfurter.dev`（汇率）、Yahoo Finance（走势图，经站点同源代理 `/api/finance/chart`）
- 历史记录、收藏、笔记、主题等只写入 `localStorage`，可在「设置」中一键导出、导入或清空。

## 本地开发

```bash
npm install
npm run dev        # http://127.0.0.1:3455
```

常用脚本：

| 命令 | 说明 |
| --- | --- |
| `npm run build` / `npm run preview` | 生产构建 / 本地预览构建产物 |
| `npm run lint` | ESLint（`--max-warnings 0`） |
| `npm run format` / `npm run format:check` | Prettier |
| `npm run test` / `npm run test:run` | Vitest 单元测试（watch / 单次） |
| `npm run e2e` | Playwright 端到端测试（首次需 `npx playwright install chromium`） |
| `npm run check` | lint + 单测 + 构建，一次跑完 |

要求 Node.js 20 及以上。

## 项目结构

```
src/
├── App.vue               # 应用壳：导航、Hash 路由、收藏/最近、PWA 更新提示、错误边界
├── style.css             # 设计令牌（CSS 变量）与全局基础样式，深色模式只需切换变量
├── tools/
│   ├── meta.js           # 工具元数据：id、名称、图标、颜色、描述、搜索关键词、分类
│   └── registry.js       # 工具 id → 异步组件映射
├── components/           # 每个工具一个 SFC，另有 CommandPalette / Toast / ToolLoading
├── composables/
│   ├── useClipboard.js   # 复制到剪贴板（含非安全上下文回退、成功/失败提示、历史记录）
│   ├── useInterval.js    # KeepAlive 与页面可见性感知的定时器
│   ├── useStorage.js     # 历史 / 收藏（响应式单例）
│   ├── useConfig.js      # 配置导出、导入校验、清空、统计
│   ├── useTheme.js       # 主题切换（跟随系统 / 手动）
│   ├── usePwa.js         # Service Worker 注册与「新版本可用」状态
│   └── useToast.js       # 全局提示
└── utils/                # 纯函数，均有单元测试
    ├── cron.js           # Cron 解析、中文描述、下次执行时间
    ├── diff.js           # patience + LCS 行级对比、行内对比、unified 格式
    ├── jwt.js            # JWT 解码与有效期判断
    ├── htmlEntities.js   # HTML 实体编解码
    ├── format.js         # 字节、日期、相对时间、时长格式化
    ├── random.js         # 基于 Web Crypto 的无偏随机
    ├── download.js       # 文件下载
    ├── storageKeys.js    # localStorage 键名与安全读写
    └── metalPrice.js / metalTrend.js / urlUtils.js / chmodUtils.js
```

### 新增一个工具

1. 在 `src/components/` 新建 `MyTool.vue`。
2. 在 `src/tools/meta.js` 的 `tools` 中添加元数据（`id`、`name`、`icon`、`color`、`description`、`keywords`），并把 `id` 放进 `categoryGroups` 的某个分类。
3. 在 `src/tools/registry.js` 的 `toolComponentMap` 中注册异步导入。
4. 复制请使用 `useClipboard()`，下载请使用 `utils/download.js`，样式颜色请引用 `style.css` 中的设计令牌。

`e2e/smoke.spec.js` 会自动遍历 `meta.js` 中的每个工具做冒烟测试，新工具无需额外注册即可被覆盖。

## 部署

### Deno Deploy（默认）

`.github/workflows/deploy.yml` 在 `main` 分支推送后执行 lint、单测、构建，然后用 `server.ts` 发布到 Deno Deploy。`server.ts` 负责：静态资源与 SPA 回退、安全响应头、缓存策略，以及金属行情走势图的同源代理。

### Docker / nginx

```bash
docker compose up -d --build
```

`nginx.conf` 已包含 SPA 回退、长缓存、gzip、安全头（CSP 放行了工具所需的外部接口）以及 `/api/finance/chart/` 到 Yahoo Finance 的反向代理。

## 技术栈

Vue 3（`<script setup>`）· Vite 7 · vite-plugin-pwa · Vitest · Playwright · ESLint 9 · Prettier

第三方运行时依赖只有：`crypto-js`、`dompurify`、`js-yaml`、`jsqr`、`markdown-it`、`qrcode`、`smol-toml`。
