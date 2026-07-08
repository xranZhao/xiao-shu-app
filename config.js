// API 配置
// ⚠️ 安全提醒：不要把 API Key 写在这个文件里 commit 到 GitHub！
// API Key 请在 App 的「设置」页面中输入，会自动保存在浏览器本地。

const CONFIG = {
  // DeepSeek API 配置
  API_KEY: "",  // 请在 App 设置页面填入你的 API Key
  BASE_URL: "https://api.deepseek.com/v1/chat/completions",
  MODEL: "deepseek-chat",

  // 应用配置
  APP_NAME: "小树觉察室",
  MAX_HISTORY: 50,
};

// 如果 localStorage 里有用户自定义配置，优先使用
function loadUserConfig() {
  try {
    const saved = localStorage.getItem("xs_user_config");
    if (saved) {
      const user = JSON.parse(saved);
      // 防手机自动填充：检测被污染的配置并自动纠正
      if (user.MODEL && (user.MODEL.startsWith("sk-") || user.MODEL.length > 40)) {
        console.warn("检测到模型配置被异常填充，已自动纠正");
        user.MODEL = "deepseek-chat";
      }
      if (user.BASE_URL && (user.BASE_URL.startsWith("sk-") || user.BASE_URL.length > 100)) {
        console.warn("检测到 API 地址配置被异常填充，已自动纠正");
        user.BASE_URL = "https://api.deepseek.com/v1/chat/completions";
      }
      Object.assign(CONFIG, user);
    }
  } catch (e) {
    console.error("加载用户配置失败", e);
  }
}

loadUserConfig();

