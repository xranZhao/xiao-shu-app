# 阿野觉察室 — 项目护栏

## 架构
- 纯前端 PWA，零依赖，原生 HTML/CSS/JS 三大件
- app.js 是唯一业务逻辑文件（~3000行，别拆），按 `App = {}` 命名空间组织
- 觉察数据使用 `localStorage`，key 统一 `xs_` 前缀：`xs_chat_history` `xs_diaries` `xs_mood_diaries` `xs_free_diaries` `xs_mode` `xs_people`
- 文章工作台为兼容 `aye_article`，共享 IndexedDB `aye-writer/articles`、草稿 `aye-draft` 和配置 `aye-config`；照片体积较大，不要迁入 localStorage
- AI 直接 `fetch` 调 DeepSeek API（OpenAI 兼容格式），不走任何中间层。所有请求统一在 `callAPI` 系列方法里

## 不要做
- **不要**给 `document.getElementById` 的结果不加 null 检查就用 — 不同 tab 的元素在别的 tab 里不存在，会直接崩
- **不要**改 CSS/JS 引用忘了同步改 `?v=` 版本号 — 不改的话 PWA 缓存不更新
- **不要**改 sw.js 的 `CACHE_NAME` 版本号后忘了同步更新 index.html 里的资源 `?v=` 参数
- **不要**把 `xs_free_diaries` 当成"自由书写"的 key — 它现在实际存的是反向选择数据，历史遗留命名
- **不要**过度包装 init() 里的 try/catch — 已经吞掉过太多错误导致排查困难
- **不要**在 config.js 里写真实 API Key 然后 commit — Key 已被清空，用户自己在设置页填

## 已知踩坑
- **手机自动填充污染**：iOS/Android 的密码管理器会把密码填到 MODEL 字段里（因为 input 在 password 类型旁边）。config.js 里已有防御逻辑检测 `sk-` 前缀自动纠正，别删
- **移动端 vh 问题**：index.html 里的内联 `setVh()` 脚本用 `--vh` CSS 变量解决地址栏遮挡，删了会导致移动端底部导航被遮挡
- **反向选择板块已回退**：当前代码中反向选择已移除（回到 e0497d4），`反向选择板块-需求文档.md` 是设计参考，不是当前功能
- **数据迁移逻辑**：`loadData()` 里有旧格式自动迁移（"my" 日记迁到 `xs_mood_diaries`、"free" 日记迁到 `xs_free_diaries`），加新存储格式时跟着补迁移

## 启动方式
```
python -m http.server 8080
# 或双击 start-server.bat
# 访问 http://localhost:8080/index.html
```
