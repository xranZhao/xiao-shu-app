# 小树觉察室

一个基于谢小树「核心需求探索」课程内容的个人觉察 PWA 应用。

## 功能

- 💬 **双模式对话**：普通助手模式 / 谢小树模式
- 📝 **觉察日记**：写下日记，获得小树视角的回应
- ⚙️ **本地设置**：可自定义 API Key、模型、API 地址
- 💾 **本地存储**：对话和日记存在浏览器本地
- 📱 **PWA**：可添加到手机主屏幕，像原生 App 一样使用

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

### 修改默认模型

编辑 `config.js`：

```js
MODEL: "deepseek-chat", // 或 deepseek-reasoner
```

### 修改谢小树 system prompt

编辑 `xiaoshu-prompt.js` 里的 `XIAOSHU_PROMPT`。

### 修改应用名称/颜色

编辑 `manifest.json` 和 `index.html` 里的 `theme-color`。
