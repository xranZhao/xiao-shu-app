# 阿野觉察室

一个基于谢小树「核心需求探索」课程内容的个人觉察 PWA 应用。

## 功能

- 💬 **双模式对话**：普通助手模式 / 阿野模式
- 📝 **觉察日记**：写下日记，获得阿野视角的回应
- ⚙️ **本地设置**：可自定义 API Key、模型、API 地址
- 💾 **本地存储**：对话和日记存在 localStorage，文章草稿和照片存在共享的 IndexedDB
- 📱 **PWA**：可添加到手机主屏幕，像原生 App 一样使用
- ☁️ **私人同步**：单条或批量上传觉察日记、反向选择和快乐治愈记录，供电脑端调用
- 📄 **公众号文章**：在“文章”页写原稿、选择处理方式和1～3张封面照片，直接上传到阿野文章工作流

## 快速开始

### 方式一：本地打开（最快测试）

**Windows 用户推荐：** 直接双击 `start-server.bat`，然后浏览器打开：

```
http://localhost:8080/index.html
```

**或者命令行启动：**

```bash
cd xiao-shu-app
python -m http.server 8080
```

然后浏览器打开 `http://localhost:8080/index.html`。

> 注意：如果你在 `D:\CLAUDE\谢小树` 根目录启动服务器，访问的会是 `http://localhost:8080/xiao-shu-app/index.html`。

### 方式二：部署到 GitHub Pages

1. 把 `xiao-shu-app` 文件夹 push 到你的 GitHub 仓库
2. 进入仓库 Settings → Pages
3. Source 选择 Deploy from a branch，分支选 main，文件夹选 `/xiao-shu-app`
4. 访问 `https://xranzhao.github.io/xiao-shu-app/index.html`

### 方式三：部署到家里的 NAS

把 `xiao-shu-app` 文件夹放到 NAS 的静态网站目录下即可。拾光坞一般支持 Nginx/Apache 静态托管。

## ⚠️ 安全提醒

当前 `config.js` 里直接写了 DeepSeek API Key。如果要把项目 push 到**公开的 GitHub 仓库**，请务必改为从设置页输入，否则 Key 会泄露。

改为安全方式很简单：

1. 把 `config.js` 里的 `API_KEY` 改成空字符串：
   ```js
   API_KEY: "",
   ```
2. 用户首次打开时，在「设置」页填入自己的 API Key
3. Key 会存在浏览器 localStorage 中

## 技术栈

- 前端：原生 HTML / CSS / JavaScript
- 大模型：DeepSeek API（OpenAI 兼容格式）
- 存储：浏览器 localStorage
- PWA：Service Worker + Manifest

## 自定义

### 同步到电脑

在「设置 → 同步到电脑」中使用 `xranZhao/aye-article-inbox` 私人仓库。App 会优先读取同一 GitHub Pages 域名下阿野写作已经保存的 GitHub Token，也可以单独填写。

- 每条记录展开后可单独点击「上传到电脑」
- 设置页可点击「上传全部未同步记录」
- 更换手机或本地同步状态丢失时，可点击「核对 GitHub 已有记录」恢复状态
- 同步状态按日记实际内容判断，品牌名称和 Markdown 排版变化不会触发重复上传
- 上传前会校验目标仓库必须为 Private
- 远端目录为 `5-小树觉察库/`，不会进入文章待处理队列

### 手机写公众号文章

底部进入“文章”页，填写正文并选择“需要电脑端优化”或“已定稿，电脑端直接排版”。标题可以留空：第一次点击保存会生成标题并回填，确认或修改后再次点击“保存并上传”。

- 文章原稿上传到 `0-原始文稿/`
- 1～3张候选封面照片上传到 `4-素材与封面/`
- 上传失败时文章保留在手机文章列表，可点击云朵按钮重试
- 文章页与独立的 `aye_article` 手机页面共享草稿、文章列表和私人仓库配置

### 修改默认模型

编辑 `config.js`：

```js
MODEL: "deepseek-v4-flash", // 或 deepseek-v4-pro
```

### 修改阿野 system prompt

编辑 `xiaoshu-prompt.js` 里的 `XIAOSHU_PROMPT`。

### 修改应用名称/颜色

编辑 `manifest.json` 和 `index.html` 里的 `theme-color`。
