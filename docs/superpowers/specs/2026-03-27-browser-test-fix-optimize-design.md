# 娴忚鍣ㄧ鍏ㄥ姛鑳芥祴璇?淇/浼樺寲璁捐

鏃ユ湡锛?026-03-27  
浠撳簱锛歵oolbox  
鑼冨洿锛氭祻瑙堝櫒绔紙Vue 3 + Vite锛夛紝浠呭墠绔?
## 鐩爣
- 瑕嗙洊鈥滄墍鏈夊姛鑳解€濇祴璇曪細鍏ㄥ眬鍔熻兘 + 31 涓伐鍏风殑鍏蜂綋鐢ㄤ緥锛岀‘淇濈湡瀹炲彲鐢ㄣ€?- 瀵瑰彂鐜扮殑闂杩涜鏍瑰洜瀹氫綅涓庝慨澶嶏紝淇鍚庡洖褰掗獙璇併€?- 杈撳嚭娓呮櫚鍙鐜扮殑璇佹嵁锛堟楠ゃ€佽緭鍏ユ暟鎹€佹湡鏈?瀹為檯銆佹帶鍒跺彴閿欒锛夈€?
## 闈炵洰鏍?- 涓嶆秹鍙婂悗绔湇鍔°€佸閮?API 鎴栭儴缃插眰鍙樻洿銆?- 涓嶈繘琛岄潪蹇呰閲嶆瀯锛涗粎鍥寸粫闂鏍瑰洜涓庡彲鐢ㄦ€ф敼杩涖€?
## 鑼冨洿涓庤鐩?### 鍏ㄥ眬鍔熻兘
- 涓婚鍒囨崲锛堟祬/娣憋級涓庡埛鏂版寔涔呭寲
- 鏀惰棌/鍘嗗彶锛氭柊澧炪€佸睍绀恒€佹竻绌恒€佹寔涔呭寲
- 閰嶇疆瀵煎叆/瀵煎嚭锛氭甯告枃浠躲€佺┖鏂囦欢銆侀潪娉?JSON銆佸瓧娈电己澶?- localStorage 璇诲啓涓庡紓甯稿閿欙紙绌哄€?鎹熷潖锛?
#### 配置文件结构（用于导入/导出用例）
- 文件大小 <= 5MB
- 版本号必须为 `1.0`
- `history` / `favorites` 必须为数组
```json
{
  "config": {},
  "history": [],
  "favorites": [],
  "theme": "light",
  "exportDate": "2026-03-27T00:00:00.000Z",
  "version": "1.0"
}
```
### 工具级（31 个工具）清单
- qrcode / QRCodeGenerator：二维码生成
- json / JsonFormatter：JSON 格式化与校验
- encrypt / TextEncryption：文本加密/解密/哈希
- encoding / EncodingTools：常见编码/解码
- regex / RegexTools：正则匹配/替换测试
- markdown / MarkdownTools：Markdown 渲染/预览
- time / TimeTools：时间戳/日期转换
- convert / ConversionTools：单位换算
- color / ColorTools：颜色转换/取色
- validator / ValidatorTools：常见数据校验
- network / NetworkTools：网络信息/请求辅助
- urltools / UrlTools：URL 解析/编码/解码
- csvjson / CsvJsonConverter：CSV ↔ JSON
- curlfetch / CurlFetchConverter：cURL ↔ Fetch
- chmod / ChmodTools：权限换算
- notes / NotesTools：笔记/TODO
- textadvanced / TextToolsAdvanced：文本处理（去重/排序/统计）
- calculator / CalculatorTool：计算器
- codeformatter / CodeFormatterTools：代码格式化
- fileconverter / FileConverterTools：文件转换
- jwt / JwtDecoder：JWT 解码
- cron / CronParser：Cron 解析
- diff / DiffTool：文本对比
- datagen / DataGenerator：数据生成
- cssunit / CssUnitConverter：CSS 单位转换
- imgcompress / ImageCompressor：图片压缩
- htmlentity / HtmlEntityConverter：HTML 实体转换
- configconvert / ConfigConverter：配置转换
- lottery / LotteryTool：抽奖工具
- storage / StoragePanel：历史/收藏管理
- settings / SettingsPanel：设置/导入导出

### 工具用例覆盖规则
- 每个工具至少覆盖：
- 正常输入输出
- 关键边界输入（空、超长、非法格式）
- 错误提示/校验反馈
- 清空/复制/格式化/切换等操作
## 娴嬭瘯绛栫暐锛堟贩鍚堬級
1. **鑷姩鍖栵紙Playwright锛?*
   - 瑕嗙洊锛氬鑸€佸垎绫诲睍寮€銆佷富棰樺垏鎹€佹敹钘?鍘嗗彶銆侀厤缃鍏ュ鍑恒€乴ocalStorage
   - 瑕嗙洊锛氬悇宸ュ叿鐨勪富娴佺▼锛堟渶灏忓彲鐢ㄨ矾寰勶級
2. **鎵嬪伐琛ユ祴**
   - 瑕嗙洊澶嶆潅宸ュ叿/杈圭晫鐢ㄤ緥
   - 瑕嗙洊瑙嗚/浜や簰缁嗚妭锛堟寜閽姸鎬併€佹彁绀烘枃妗堛€佹粴鍔ㄤ笌甯冨眬锛?
## 鐢ㄤ緥绮掑害涓庢暟鎹?- 姣忎釜宸ュ叿缁存姢鈥滄渶灏忓彲鐢ㄨ緭鍏モ€?鈥?-2 涓竟鐣岃緭鍏モ€濄€?- 缁熶竴璁板綍锛?  - 杈撳叆鏁版嵁锛堝彲澶嶅埗锛?  - 鏈熸湜琛屼负锛堣緭鍑?鎻愮ず/鏍煎紡锛?  - 瀹為檯琛屼负锛堝惈鎴浘鎴栨帶鍒跺彴閿欒锛?
## 澶辫触澶勭悊涓庝慨澶嶆祦绋?閬靛惊绯荤粺鍖栬皟璇曟祦绋嬶細
1. 澶嶇幇骞跺浐瀹氭楠?2. 鏀堕泦璇佹嵁锛堟帶鍒跺彴銆佺綉缁溿€佺粍浠剁姸鎬侊級
3. 杩借釜鏁版嵁娴侊紝瀹氫綅鏍瑰洜
4. 鏈€灏忎慨澶?5. 鍥炲綊楠岃瘉锛堢洰鏍囩敤渚?+ 鍏宠仈鐢ㄤ緥锛?
## 浼樺寲鍘熷垯
- 鍙仛鍙噺鍖栥€佸彲楠岃瘉鐨勪紭鍖栵細
  - 鏄庣‘閿欒鎻愮ず
  - 浜や簰涓€鑷存€э紙鎸夐挳鍙敤鐘舵€併€佹竻绌?澶嶅埗琛屼负锛?  - 鎬ц兘鏄捐憲闂锛堝ぇ杈撳叆鍗￠】銆佹槑鏄鹃樆濉烇級
- 涓嶅紩鍏ラ殣钘忛檷绾ф垨鏃犺瘉鎹殑鈥滈槻寰℃€ч€昏緫鈥濄€?
## 楠屾敹鏍囧噯
- 鍏ㄥ眬鍔熻兘鍙噸澶嶉€氳繃锛屽埛鏂板悗鐘舵€佷竴鑷淬€?- 31 涓伐鍏锋牳蹇冪敤渚嬩笌杈圭晫鐢ㄤ緥閫氳繃銆?- 鎺у埗鍙版棤鏈鐞嗛敊璇紙濡傛湁 warning 闇€璇勪及涓嶅奖鍝嶄娇鐢級銆?- 淇鍚庡洖褰掗€氳繃锛屼笉寮曞叆鏂板洖褰掋€?
## 浜у嚭
- E2E 鎵ц璁板綍锛堥€氳繃/澶辫触鍒楄〃锛?- 澶辫触鐢ㄤ緥娓呭崟涓庝慨澶嶈鏄?- 鍥炲綊缁撴灉涓庢渶缁堢粨璁?
