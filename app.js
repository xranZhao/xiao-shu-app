// 小树觉察室 - 主逻辑

const App = {
  currentMode: "normal",
  currentChat: [],
  diaries: [],        // 觉察日记
  moodDiaries: [],    // 情绪日记
  freeDiaries: [],    // 自由书写
  activeTab: "chat",
  // 引导式觉察状态
  guided: {
    currentStep: 1,
    steps: { event: "", feeling: "", defense: "", extend: "" },
  },
  // 识人板块
  people: [],
  currentPersonId: null,
  obsType: "言",

  // 情绪颜色区数据（来自情绪盒子）
  emotionZones: {
    red: { name: "红色区", emotions: ["愤怒", "嫉妒", "气愤", "怨恨", "憎恨", "反感", "烦躁"] },
    orange: { name: "橙色区", emotions: ["喜悦", "感动", "爱", "快乐", "感激", "期待"] },
    green: { name: "绿色区", emotions: ["自豪", "自信", "满意", "冷静"] },
    grey: { name: "灰色区", emotions: ["担心", "不耐烦", "焦虑", "纠结", "紧张", "矛盾"] },
    blue: { name: "蓝色区", emotions: ["忧郁", "迷惘", "孤独", "寂寞", "渴望", "怀念"] },
    purple: { name: "紫色区", emotions: ["灰心", "疲倦", "空白感", "无力感", "被困住", "无聊", "失望", "绝望", "背叛", "恐惧"] },
    brown: { name: "棕色区", emotions: ["后悔", "内疚", "尴尬", "害羞", "受伤", "同情", "伤心"] },
  },

  // 情绪日记当前选中颜色区
  myDiaryZone: null,
  // 情绪日记分步状态
  moodStep: {
    current: 1,
    total: 4,
    landingTimer: null,
    landingSeconds: 20,
  },

  init() {
    this.loadData();
    this.renderTabs();
    this.renderChat();
    this.renderDiaries();
    this.renderMoodDiaries();
    this.renderFreeDiaries();
    this.renderSettings();
    this.setupEventListeners();
    this.setMode("xiaoshu");
    this.checkWeeklyExportReminder();

    // 首次使用检查：如果没有 API Key，提示用户去设置
    if (!CONFIG.API_KEY) {
      setTimeout(() => {
        this.showToast("👋 欢迎！请先到「⚙️ 设置」填入你的 API Key");
      }, 1000);
    }
  },

  // ========== 数据存储 ==========
  loadData() {
    try {
      const chat = localStorage.getItem("xs_chat_history");
      const diaries = localStorage.getItem("xs_diaries");
      const moodDiaries = localStorage.getItem("xs_mood_diaries");
      const freeDiaries = localStorage.getItem("xs_free_diaries");
      const mode = localStorage.getItem("xs_mode");
      const people = localStorage.getItem("xs_people");
      if (chat) this.currentChat = JSON.parse(chat);
      if (diaries) this.diaries = JSON.parse(diaries);
      if (moodDiaries) this.moodDiaries = JSON.parse(moodDiaries);
      if (freeDiaries) this.freeDiaries = JSON.parse(freeDiaries);
      if (mode) this.currentMode = mode;
      if (people) this.people = JSON.parse(people);

      // 迁移：旧版本中 source 为 "my" 的情绪日记在 xs_diaries 里，迁移到 xs_mood_diaries
      const migratedMy = this.diaries.filter(d => d.source === "my");
      if (migratedMy.length > 0) {
        this.moodDiaries = [...migratedMy, ...this.moodDiaries];
        this.diaries = this.diaries.filter(d => d.source !== "my");
        this.saveData();
        console.log(`已迁移 ${migratedMy.length} 条情绪日记到新存储`);
      }

      // 迁移：旧版本（V2）中 source 为 "free" 的自由书写在 xs_diaries 里，迁移到 xs_free_diaries
      const migratedFree = this.diaries.filter(d => d.source === "free");
      if (migratedFree.length > 0) {
        this.freeDiaries = [...migratedFree, ...this.freeDiaries];
        this.diaries = this.diaries.filter(d => d.source !== "free");
        this.saveData();
        console.log(`已迁移 ${migratedFree.length} 条自由书写到新存储`);
      }
    } catch (e) {
      console.error("加载数据失败", e);
    }
  },

  saveData() {
    try {
      localStorage.setItem("xs_chat_history", JSON.stringify(this.currentChat.slice(-CONFIG.MAX_HISTORY)));
      localStorage.setItem("xs_diaries", JSON.stringify(this.diaries));
      localStorage.setItem("xs_mood_diaries", JSON.stringify(this.moodDiaries));
      localStorage.setItem("xs_free_diaries", JSON.stringify(this.freeDiaries));
      localStorage.setItem("xs_mode", this.currentMode);
      localStorage.setItem("xs_people", JSON.stringify(this.people));
    } catch (e) {
      console.error("保存数据失败", e);
      this.showToast("本地存储已满，请清理数据");
    }
  },

  // ========== 模式切换 ==========
  setMode(mode) {
    this.currentMode = mode;
    const btn = document.getElementById("mode-switch");
    if (mode === "xiaoshu") {
      btn.textContent = "🌱 小树模式";
      btn.classList.add("active");
      document.body.classList.add("xiaoshu-mode");
    } else {
      btn.textContent = "💬 普通模式";
      btn.classList.remove("active");
      document.body.classList.remove("xiaoshu-mode");
    }
    this.saveData();
  },

  toggleMode() {
    this.setMode(this.currentMode === "xiaoshu" ? "normal" : "xiaoshu");
  },

  // ========== 对话 ==========
  async sendMessage() {
    const input = document.getElementById("chat-input");
    const text = input.value.trim();
    if (!text) return;
    input.value = "";
    input.style.height = "auto";
    this.addMessage("user", text);
    this.showLoading(true);
    try {
      const reply = await this.callAI(text);
      this.addMessage("assistant", reply);
    } catch (err) {
      console.error(err);
      this.addMessage("assistant", "抱歉，刚才没连上。你可以检查一下网络或 API Key 是否正确。错误：" + err.message);
    } finally {
      this.showLoading(false);
    }
  },

  addMessage(role, content) {
    this.currentChat.push({ role, content, time: Date.now() });
    this.saveData();
    this.renderChat();
  },

  renderChat() {
    const container = document.getElementById("chat-messages");
    if (!container) return;
    container.innerHTML = "";
    this.currentChat.forEach((msg) => {
      const div = document.createElement("div");
      div.className = `message ${msg.role}`;
      const avatar = document.createElement("div");
      avatar.className = "avatar";
      avatar.textContent = msg.role === "user" ? "我" : "树";
      const bubble = document.createElement("div");
      bubble.className = "bubble";
      bubble.innerHTML = this.markdownToHtml(msg.content);
      div.appendChild(avatar);
      div.appendChild(bubble);
      container.appendChild(div);
    });
    container.scrollTop = container.scrollHeight;
  },

  showLoading(show) {
    const loading = document.getElementById("chat-loading");
    if (!loading) return;
    loading.style.display = show ? "flex" : "none";
    const sendBtn = document.getElementById("send-btn");
    if (sendBtn) sendBtn.disabled = show;
  },

  async callAI(userMessage) {
    const systemPrompt = this.currentMode === "xiaoshu"
      ? (typeof XIAOSHU_PROMPT !== "undefined" ? XIAOSHU_PROMPT : "你是一个温暖的心理洞察助手。")
      : (typeof NORMAL_PROMPT !== "undefined" ? NORMAL_PROMPT : "你是一个温暖的心理洞察助手。");
    const messages = [
      { role: "system", content: systemPrompt },
      ...this.currentChat.slice(-40).map((m) => ({ role: m.role, content: m.content })),
    ];
    const response = await fetch(CONFIG.BASE_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json; charset=utf-8", "Authorization": `Bearer ${CONFIG.API_KEY}` },
      body: JSON.stringify({ model: CONFIG.MODEL, messages, temperature: 0.8, max_tokens: 4000 }),
    });
    if (!response.ok) { const err = await response.text(); throw new Error(`API 错误 (${response.status}): ${err}`); }
    const data = await response.json();
    return data.choices[0].message.content;
  },

  clearChat() {
    if (!confirm("确定清空所有对话记录吗？")) return;
    this.currentChat = [];
    this.saveData();
    this.renderChat();
    this.showToast("对话已清空");
  },

  // ========== 引导式觉察 ==========
  GUIDED_QUESTIONS: {
    1: "最近发生了什么让你情绪波动的事？\n\n先不急着分析，就客观描述一下发生了什么。什么人说了什么话？做了什么事？",
    2: "当时你感受到了什么情绪？生气？难过？委屈？无力？\n\n——没有评价，只有感受。身体上有什么感觉吗？心里堵？手发抖？肩膀紧绷？",
    3: "你怎么应对这些情绪的？是发脾气骂出来了？还是忍住不说、压抑自己？还是吃东西、刷手机转移注意力？还是开始责备自己？\n\n观察一下，基于事实，不加工，不评价总结。",
    4: "以前有过类似的感受吗？往回看，有没有想到过往什么经历也是这种感觉？小时候有没有类似的事情发生过？\n\n——观察，没有评价，只是看看这个模式是不是出现过。",
  },

  GUIDED_STEP_NAMES: { 1: "情绪事件", 2: "身心感受", 3: "防御方式", 4: "延展模型" },

  getGuidedDraftKey() {
    const today = new Date().toISOString().slice(0, 10);
    return "xs_guided_draft_" + today;
  },

  saveGuidedDraft() {
    try {
      localStorage.setItem(this.getGuidedDraftKey(), JSON.stringify(this.guided));
    } catch (e) { /* ignore */ }
  },

  loadGuidedDraft() {
    try {
      const saved = localStorage.getItem(this.getGuidedDraftKey());
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed && parsed.currentStep) {
          this.guided = {
            currentStep: parsed.currentStep,
            steps: { event: "", feeling: "", defense: "", extend: "", ...parsed.steps },
          };
        }
      }
    } catch (e) { /* ignore */ }
  },

  clearGuidedDraft() {
    try { localStorage.removeItem(this.getGuidedDraftKey()); } catch (e) { /* ignore */ }
  },

  renderGuidedStep() {
    const step = this.guided.currentStep;
    document.getElementById("step-num").textContent = step;
    document.getElementById("step-name").textContent = this.GUIDED_STEP_NAMES[step];
    document.getElementById("step-question").textContent = this.GUIDED_QUESTIONS[step];
    document.getElementById("step-input").value = this.guided.steps[Object.keys(this.guided.steps)[step - 1]] || "";
    document.getElementById("step-prev-btn").style.display = step === 1 ? "none" : "";
    document.getElementById("step-next-btn").textContent = step === 4 ? "✅ 完成" : "下一步 →";
    this.saveGuidedDraft();
  },

  guidedPrev() {
    if (this.guided.currentStep <= 1) return;
    // 保存当前步骤内容
    const key = Object.keys(this.guided.steps)[this.guided.currentStep - 1];
    this.guided.steps[key] = document.getElementById("step-input").value;
    this.guided.currentStep--;
    this.renderGuidedStep();
  },

  guidedNext() {
    const key = Object.keys(this.guided.steps)[this.guided.currentStep - 1];
    const value = document.getElementById("step-input").value.trim();
    this.guided.steps[key] = value;

    if (this.guided.currentStep < 4) {
      this.guided.currentStep++;
      this.renderGuidedStep();
    } else {
      // 四步完成 → 汇总
      this.showGuidedSummary();
    }
  },

  async showGuidedSummary() {
    const steps = this.guided.steps;

    // 显示汇总
    document.getElementById("guided-step-card").style.display = "none";
    const summary = document.getElementById("guided-summary");
    summary.style.display = "flex";

    // 构建汇总内容
    const labels = { event: "情绪事件", feeling: "身心感受", defense: "防御方式", extend: "延展模型" };
    let html = "";
    for (const [key, label] of Object.entries(labels)) {
      html += `<span class="s-label">${label}</span><span class="s-text">${this.escapeHtml(steps[key])}</span>`;
    }
    document.getElementById("summary-body").innerHTML = html;

    // 生成标题
    const localTitle = this.generateDiaryTitle(steps);
    const titleInput = document.getElementById("summary-title");
    titleInput.value = localTitle;

    if (!CONFIG.API_KEY) {
      this.showToast("未设置 API Key，已使用本地规则生成标题");
    } else {
      this.generateAITitle(steps).then((aiTitle) => {
        if (aiTitle) titleInput.value = aiTitle;
      }).catch((err) => {
        console.error("AI 标题生成失败", err);
      });
    }

    // 本地检测强迫性重复
    const match = this.findSimilarPattern(steps);
    if (match) {
      document.getElementById("pattern-alert").style.display = "block";
      document.getElementById("pattern-alert").innerHTML =
        `🌱 小树注意到：你在 <strong>${match.date}</strong> 的日记里也有过类似的感觉——"${this.escapeHtml(match.snippet)}"。这可能是你的一个<strong>强迫性重复模式</strong>。<br><br><a onclick="App.viewDiary(${match.id})">📖 回顾那篇日记：《${this.escapeHtml(match.title)}》</a>`;
    }

    // 检查 API Key
    if (!CONFIG.API_KEY) {
      document.getElementById("summary-feedback-label").textContent = "🌱 缺少 API Key";
      document.getElementById("summary-feedback").innerHTML = "请先到「⚙️ 设置」填入你的 API Key，然后回来点「重新来过」重新提交。";
      return;
    }

    // 显示进度条
    const fbLabel = document.getElementById("summary-feedback-label");
    const fbBody = document.getElementById("summary-feedback");
    fbLabel.textContent = "🌱 小树正在感受你的日记...";
    fbBody.innerHTML = `
      <div class="feedback-progress">
        <div class="fp-bar"><div class="fp-fill" id="fp-fill"></div></div>
        <div class="fp-text" id="fp-text">连接中...</div>
      </div>`;

    // 模拟进度条动画
    let progressTimer = null;
    let progress = 0;
    const advanceProgress = () => {
      if (progress < 90) {
        progress += Math.random() * 15 + 5; // 5-20% per tick
        if (progress > 90) progress = 90;
        document.getElementById("fp-fill").style.width = progress + "%";
        const messages = ["连接中...", "小树在读你的情绪事件...", "小树在体会你的感受...", "小树在看你的防御方式...", "小树在连接你的过去..."];
        const idx = Math.min(Math.floor(progress / 20), messages.length - 1);
        document.getElementById("fp-text").textContent = messages[idx];
        progressTimer = setTimeout(advanceProgress, 600 + Math.random() * 800);
      }
    };
    advanceProgress();

    // 调 AI 反馈
    try {
      const feedback = await this.callGuidedFeedback(steps);
      clearTimeout(progressTimer);
      document.getElementById("fp-fill").style.width = "100%";
      document.getElementById("fp-text").textContent = "完成 ✓";
      setTimeout(() => {
        fbLabel.textContent = "🌱 小树回应";
        fbBody.innerHTML = this.markdownToHtml(feedback);
      }, 400);
    } catch (err) {
      clearTimeout(progressTimer);
      console.error(err);
      fbLabel.textContent = "🌱 小树回应（获取失败）";
      fbBody.innerHTML = `<div style="color:#c45c5c;padding:12px;">${this.escapeHtml(err.message)}<br><br>请检查：<br>1. ⚙️ 设置页 API Key 是否正确<br>2. 网络连接是否正常<br>3. API 额度是否用完<br><br>修复后点「重新来过」再试一次。</div>`;
    }
  },

  generateDiaryTitle(steps) {
    const today = new Date().toISOString().slice(0, 10).replace(/-/g, "");
    const event = steps.event || "";
    const feeling = steps.feeling || "";
    // 从情绪事件中提取关键词（前2-6个字符）
    let eventKey = event.replace(/\s+/g, "").slice(0, 8);
    if (eventKey.length > 8) eventKey = eventKey.slice(0, 8);
    if (eventKey.length < 2) eventKey = "觉察";
    // 从身心感受中匹配主要情绪
    const emotionMap = [
      "愤怒", "委屈", "难过", "无力", "焦虑", "恐惧", "羞耻", "内疚", "孤独",
      "失望", "烦躁", "崩溃", "压抑", "悲伤", "痛苦", "自责", "自卑", "不安全感",
    ];
    let emotion = "";
    for (const e of emotionMap) {
      if (feeling.includes(e)) { emotion = e; break; }
    }
    if (!emotion) emotion = "情绪波动";
    return `${today}-${eventKey}-${emotion}`;
  },

  async generateAITitle(steps) {
    const today = new Date().toISOString().slice(0, 10).replace(/-/g, "");
    const prompt = `请根据用户以下四步觉察日记，直接总结一个标题。

要求：
1. 标题格式：YYYYMMDD-事件总结-情绪
2. 时间使用今天的日期：${today}
3. 事件总结：用10个汉字以内概括"情绪事件"的核心内容，不是截取原文前10个字，而是提炼关键词。例如：
   - 不好："我之前和男朋友..."（这是原文截取）
   - 好："恋爱脑+妈宝女"（这是提炼核心主题）
4. 情绪：从"身心感受"中提炼1-3个最主要情绪词
5. 只输出标题，不要任何其他内容

【情绪事件】${steps.event || ""}
【身心感受】${steps.feeling || ""}
【防御方式】${steps.defense || ""}
【延展模型】${steps.extend || ""}`;

    const response = await fetch(CONFIG.BASE_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json; charset=utf-8", "Authorization": `Bearer ${CONFIG.API_KEY}` },
      body: JSON.stringify({
        model: CONFIG.MODEL,
        messages: [
          { role: "system", content: "你是一个标题总结助手，只输出规定格式的标题，不解释。" },
          { role: "user", content: prompt },
        ],
        temperature: 0.5,
        max_tokens: 100,
      }),
    });
    if (!response.ok) { const err = await response.text(); throw new Error(`API 错误 (${response.status}): ${err}`); }
    const data = await response.json();
    let title = data.choices[0].message.content.trim();
    // 去除可能包裹的引号或 markdown 代码块标记
    title = title.replace(/^["'`]+|["'`]+$/g, "").replace(/```/g, "").trim();
    // 校验格式：YYYYMMDD-...-...
    if (!/^\d{8}-.+-.+$/.test(title)) {
      throw new Error("AI 返回的标题格式不正确");
    }
    return title;
  },

  findSimilarPattern(steps) {
    if (!this.diaries || this.diaries.length < 1) return null;
    const currentText = ((steps.extend || "") + (steps.defense || "") + (steps.feeling || "")).toLowerCase();
    const currentWords = this.extractKeywords(currentText);

    let bestMatch = null;
    let bestScore = 0;

    for (const d of this.diaries) {
      let histText = "";
      if (d.steps) {
        histText = (d.steps.extend || "") + (d.steps.defense || "") + (d.steps.feeling || "");
      } else {
        histText = d.content || "";
      }
      histText = histText.toLowerCase();
      const histWords = this.extractKeywords(histText);

      // 计算关键词交集
      const intersection = currentWords.filter(w => histWords.includes(w));
      const score = intersection.length;

      if (score > bestScore) {
        bestScore = score;
        const snippet = d.steps ? (d.steps.event || d.steps.feeling || "") : (d.content || "");
        bestMatch = {
          id: d.id,
          date: new Date(d.createdAt).toLocaleDateString("zh-CN"),
          title: d.title || "",
          snippet: snippet.slice(0, 30),
        };
      }
    }

    // 需要至少 3 个共同关键词才算匹配
    return bestScore >= 3 ? bestMatch : null;
  },

  extractKeywords(text) {
    // 简单分词：提取2字及以上中文词
    const words = [];
    // 提取所有中文字符序列
    const chinese = text.match(/[一-龥]{2,}/g) || [];
    words.push(...chinese);
    // 加上情绪词
    const emotions = ["愤怒", "委屈", "难过", "无力", "焦虑", "恐惧", "羞耻", "内疚",
      "自我攻击", "压抑", "回避", "沉默", "发脾气", "逃避", "责备自己", "讨好",
      "冷暴力", "爆发", "转移注意力", "控制", "被忽视", "被抛弃", "被拒绝", "不被需要"];
    for (const e of emotions) {
      if (text.includes(e)) words.push(e);
    }
    return [...new Set(words)];
  },

  async callGuidedFeedback(steps) {
    const today = new Date().toLocaleDateString("zh-CN", { year: "numeric", month: "long", day: "numeric" });
    const hasHistory = this.diaries.length > 0;

    // 构建历史摘要（极简格式，控制 token）
    let historySummary = "";
    if (hasHistory) {
      const recent = this.diaries.slice(0, 10); // 最多取最近 10 篇
      historySummary = "\n\n=== 用户过去的觉察日记摘要（供参考，用于判断强迫性重复） ===\n";
      for (const d of recent) {
        const date = new Date(d.createdAt).toLocaleDateString("zh-CN");
        const title = d.title || date;
        let emotion = "";
        let defense = "";
        if (d.steps) {
          emotion = d.steps.feeling ? d.steps.feeling.slice(0, 20) : "";
          defense = d.steps.defense ? d.steps.defense.slice(0, 20) : "";
        }
        historySummary += `${date} | ${title}`;
        if (emotion) historySummary += ` | 感受:${emotion}`;
        if (defense) historySummary += ` | 应对:${defense}`;
        historySummary += "\n";
      }
      historySummary += "=== 摘要结束 ===\n";
    }

    const prompt = `你是谢小树，正在陪伴用户做觉察日记。

这是 ${today} 的觉察日记。用户的四步觉察已经完成。

## 你的角色

你现在是一个**陪伴者**，不是解读师。你的目标是帮用户在感受里多待一会儿，而不是跳到分析。

但你不需要每次都说同样的话。根据用户今天写的内容，自然地回应。以下是一些方向性的指引——不是每一条都要用到，而是根据用户今天写了什么来选择：

- 如果用户写了很多情绪但没有说身体感受，你可以问"这些情绪在你身体的什么地方？"
- 如果用户已经清楚地命名了感受，你可以帮ta看到这感受下面还有没有什么——"那个生气下面，是不是还有什么？"
- 如果用户写了一个反复出现的模式，你可以轻轻点一下——"你有没有发现，好像每次遇到这种情况，你都会做同一件事？"
- 如果用户写到了过去，你可以帮ta在那里停一会儿——不用急着回答，就呆一会。
- 如果用户写得很饱满，你不需要再加东西——一句"你写得很清楚，我在这里。"就够了。
- 如果用户什么都没写，只是打了几个字，你也可以就那"几个字"开始——那几个字里往往有最多的东西。

原则：
- "停在感受里 > 解释为什么有感受"
- "身体 > 大脑"
- "问一个具体的问题 > 给一堆分析"
- 不要套话。不要让用户觉得"小树又在说那几句了"。
- 如果有强迫性重复，可以轻点，但不要贴理论标签（别说"这是强迫性重复"）。

控制在 200-400 字——少即是多。

## 用户今天的觉察日记

【情绪事件】${steps.event}
【身心感受】${steps.feeling}
【防御方式】${steps.defense}
【延展模型】${steps.extend}
${historySummary}
如果用户在今天的日记和过去的日记之间存在相似的防御模式和情绪模式，请轻轻地点一下。如果没有明显的重复，不用强行分析。`;

    const response = await fetch(CONFIG.BASE_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json; charset=utf-8", "Authorization": `Bearer ${CONFIG.API_KEY}` },
      body: JSON.stringify({
        model: CONFIG.MODEL,
        messages: [
          {
            role: "system",
            content: typeof XIAOSHU_PROMPT !== "undefined" ? XIAOSHU_PROMPT : "你是一个温暖的心理洞察助手。",
          },
          { role: "user", content: prompt },
        ],
        temperature: 0.8,
        max_tokens: 4000,
      }),
    });
    if (!response.ok) { const err = await response.text(); throw new Error(`API 错误 (${response.status}): ${err}`); }
    const data = await response.json();
    return data.choices[0].message.content;
  },

  saveGuidedDiary() {
    const steps = this.guided.steps;
    const title = document.getElementById("summary-title").value.trim();
    // 从 innerHTML 里获取真实反馈（处理 markdown 渲染后的内容）
    const fbEl = document.getElementById("summary-feedback");
    const feedback = fbEl ? fbEl.innerText || fbEl.textContent : "";
    const content = `【情绪事件】\n${steps.event}\n\n【身心感受】\n${steps.feeling}\n\n【防御方式】\n${steps.defense}\n\n【延展模型】\n${steps.extend}`;

    const diary = {
      id: Date.now(),
      title: title || this.generateDiaryTitle(steps),
      date: new Date().toISOString().slice(0, 10),
      source: "guided",
      steps: { ...steps },
      content,
      feedback,
      primaryEmotion: this.extractPrimaryEmotion(steps.feeling),
      createdAt: Date.now(),
    };

    this.diaries.unshift(diary);
    this.saveData();

    // 重置引导状态
    this.guided = { currentStep: 1, steps: { event: "", feeling: "", defense: "", extend: "" } };
    this.clearGuidedDraft();

    // 重新显示引导卡片，隐藏汇总
    document.getElementById("guided-step-card").style.display = "";
    document.getElementById("guided-summary").style.display = "none";
    this.renderGuidedStep();
    this.renderDiaries();
    this.showToast("觉察日记已保存 🌱");
  },

  // ========== 自由书写 ==========
  async saveFreeDiary() {
    const titleInput = document.getElementById("free-diary-title");
    const contentInput = document.getElementById("free-diary-content");
    const title = titleInput.value.trim();
    const content = contentInput.value.trim();
    if (!content) { this.showToast("请先写下今天的觉察"); return; }

    this.showFreeDiaryLoading(true);
    let feedback = "";
    try {
      feedback = await this.callAIFeedback(content);
    } catch (err) {
      console.error(err);
      feedback = "（小树反馈获取失败，你可以稍后再试）";
    }

    const diary = {
      id: Date.now(),
      title: title || new Date().toLocaleDateString("zh-CN"),
      date: new Date().toISOString().slice(0, 10),
      source: "free",
      content,
      feedback,
      createdAt: Date.now(),
    };

    this.freeDiaries.unshift(diary);
    this.saveData();
    titleInput.value = "";
    contentInput.value = "";
    this.renderFreeDiaries();
    this.showFreeDiaryLoading(false);
    this.showToast("自由书写已保存 🌱");
  },

  showFreeDiaryLoading(show) {
    const btn = document.getElementById("save-free-diary-btn");
    const loading = document.getElementById("free-diary-loading");
    if (btn) btn.disabled = show;
    if (loading) loading.style.display = show ? "block" : "none";
  },

  renderFreeDiaries() {
    const list = document.getElementById("free-diary-list");
    const countEl = document.getElementById("free-diary-count");
    if (!list) return;
    if (countEl) countEl.textContent = `共 ${this.freeDiaries.length} 篇`;

    if (this.freeDiaries.length === 0) {
      list.innerHTML = '<div class="empty">还没有自由书写，开始你的第一篇吧 ✍️</div>';
      return;
    }

    list.innerHTML = "";
    this.freeDiaries.forEach((d) => {
      const card = document.createElement("div");
      card.className = "diary-card";
      card.dataset.id = String(d.id);

      card.innerHTML = `
        <div class="diary-header">
          <div class="diary-header-main">
            <h4>${this.escapeHtml(d.title)}</h4>
            <span class="diary-date">${new Date(d.createdAt).toLocaleString("zh-CN")}</span>
          </div>
          <span class="expand-icon">▶</span>
        </div>
        <div class="diary-body">
          <div class="diary-content">${this.markdownToHtml(d.content)}</div>
          <div class="diary-feedback">
            <div class="feedback-label">🌱 小树回应</div>
            <div class="feedback-body">${this.markdownToHtml(d.feedback)}</div>
          </div>
          <div class="diary-card-actions">
            <button class="btn-text" onclick="App.exportFreeDiary(${d.id})">📤 导出</button>
            <button class="btn-text danger" onclick="App.deleteFreeDiary(${d.id})">删除</button>
          </div>
        </div>
      `;

      const header = card.querySelector(".diary-header");
      header.addEventListener("click", () => {
        card.classList.toggle("expanded");
      });

      list.appendChild(card);
    });
  },

  deleteFreeDiary(id) {
    if (!confirm("确定删除这条自由书写吗？")) return;
    this.freeDiaries = this.freeDiaries.filter((d) => d.id !== id);
    this.saveData();
    this.renderFreeDiaries();
    this.showToast("自由书写已删除");
  },

  extractPrimaryEmotion(feelingText) {
    const emotions = ["愤怒", "委屈", "难过", "无力", "焦虑", "恐惧", "羞耻", "内疚", "孤独",
      "失望", "烦躁", "崩溃", "压抑", "悲伤", "痛苦", "自责", "自卑"];
    for (const e of emotions) {
      if (feelingText.includes(e)) return e;
    }
    return "情绪波动";
  },

  viewDiary(id) {
    const d = this.diaries.find(dd => dd.id === id);
    if (!d) return;
    // 在日记列表中高亮该日记
    this.switchTab("diary");
    setTimeout(() => {
      const cards = document.querySelectorAll(".diary-card");
      cards.forEach(c => {
        if (c.dataset.id === String(id)) {
          c.scrollIntoView({ behavior: "smooth", block: "center" });
          c.style.boxShadow = "0 0 0 3px var(--primary)";
          setTimeout(() => { c.style.boxShadow = ""; }, 3000);
        }
      });
    }, 300);
  },

  // ========== 情绪日记 ==========
  openMyDiaryWithZone(zone) {
    // 切换到日记 Tab 和情绪日记模式
    this.switchTab("diary");
    document.querySelectorAll(".diary-mode-btn").forEach(b => b.classList.remove("active"));
    const myBtn = document.querySelector('.diary-mode-btn[data-mode="my"]');
    if (myBtn) myBtn.classList.add("active");
    document.querySelectorAll(".diary-mode-content").forEach(c => c.classList.remove("active"));
    document.getElementById("my-diary").classList.add("active");
    this.resetMoodStep();
    this.selectMyDiaryZone(zone);
  },

  resetMoodStep() {
    this.moodStep.current = 1;
    if (this.moodStep.landingTimer) {
      clearInterval(this.moodStep.landingTimer);
      this.moodStep.landingTimer = null;
    }
    this.moodStep.landingSeconds = 20;
    this.renderMoodStep();
  },

  selectMyDiaryZone(zone) {
    this.myDiaryZone = zone;
    document.querySelectorAll("#my-diary-mood-wheel .mood-zone").forEach(el => {
      el.classList.toggle("selected", el.dataset.zone === zone);
    });
    this.renderMyDiaryEmotionTags(zone);
  },

  renderMyDiaryEmotionTags(zone) {
    const container = document.getElementById("my-diary-emotion-tags");
    if (!container) return;
    if (!zone) {
      container.innerHTML = "";
      return;
    }
    const emotions = this.emotionZones[zone]?.emotions || [];
    container.innerHTML = emotions.map(e => `<span class="emotion-tag">${e}</span>`).join("");
  },

  renderMoodStep() {
    const badge = document.getElementById("mood-step-badge");
    const nameEl = document.getElementById("mood-step-name");
    const steps = ["落地", "情绪命名", "安放今天的日子", "感受体验"];
    const stepNames = ["落地", "情绪命名", "安放今天的日子", "感受体验"];
    if (badge) badge.textContent = `第 ${this.moodStep.current} / ${this.moodStep.total} 步`;
    if (nameEl) nameEl.textContent = stepNames[this.moodStep.current - 1] || "";

    document.querySelectorAll("#my-diary .mood-step").forEach(el => {
      el.classList.toggle("active", parseInt(el.dataset.step) === this.moodStep.current);
    });

    const prevBtn = document.getElementById("mood-prev-btn");
    const nextBtn = document.getElementById("mood-next-btn");
    if (prevBtn) prevBtn.style.visibility = this.moodStep.current === 1 ? "hidden" : "visible";
    if (nextBtn) {
      nextBtn.textContent = this.moodStep.current === this.moodStep.total ? "保存情绪日记" : "下一步 →";
      nextBtn.disabled = false;
    }

    if (this.moodStep.current === 1) {
      this.startLandingTimer();
    } else {
      this.stopLandingTimer();
    }
  },

  startLandingTimer() {
    if (this.moodStep.landingTimer) return;
    const total = 20;
    let seconds = total;
    const progressEl = document.getElementById("landing-progress");
    const textEl = document.getElementById("landing-text");
    const hintEl = document.getElementById("landing-hint");
    const nextBtn = document.getElementById("mood-next-btn");

    if (progressEl) progressEl.style.width = "0%";
    if (textEl) textEl.textContent = seconds;
    if (hintEl) hintEl.textContent = "吸气 4 秒，呼气 6 秒，慢慢来";
    if (nextBtn) nextBtn.disabled = true;

    this.moodStep.landingTimer = setInterval(() => {
      seconds--;
      if (textEl) textEl.textContent = seconds;
      if (progressEl) progressEl.style.width = `${((total - seconds) / total) * 100}%`;
      if (hintEl) {
        if (seconds <= 15) hintEl.textContent = "感受身体与椅子/床的接触";
        if (seconds <= 10) hintEl.textContent = "让肩膀松一点，再松一点";
        if (seconds <= 5) hintEl.textContent = "准备好后，进入下一步";
      }
      if (seconds <= 0) {
        this.stopLandingTimer();
        if (nextBtn) nextBtn.disabled = false;
      }
    }, 1000);
  },

  stopLandingTimer() {
    if (this.moodStep.landingTimer) {
      clearInterval(this.moodStep.landingTimer);
      this.moodStep.landingTimer = null;
    }
  },

  skipLandingTimer() {
    this.stopLandingTimer();
    const progressEl = document.getElementById("landing-progress");
    const textEl = document.getElementById("landing-text");
    const nextBtn = document.getElementById("mood-next-btn");
    if (progressEl) progressEl.style.width = "100%";
    if (textEl) textEl.textContent = "0";
    if (nextBtn) nextBtn.disabled = false;
  },

  nextMoodStep() {
    if (this.moodStep.current < this.moodStep.total) {
      this.moodStep.current++;
      this.renderMoodStep();
    } else {
      this.saveMyDiary();
    }
  },

  prevMoodStep() {
    if (this.moodStep.current > 1) {
      this.moodStep.current--;
      this.renderMoodStep();
    }
  },

  saveMyDiary() {
    const bodyInput = document.getElementById("my-body");
    const emotionInput = document.getElementById("my-emotion");
    const needInput = document.getElementById("my-need");
    const actionInput = document.getElementById("my-action");
    const body = (bodyInput?.value || "").trim();
    const emotion = emotionInput.value.trim();
    const need = needInput.value.trim();
    const action = actionInput.value.trim();

    if (!emotion && !need && !action && !body) {
      this.showToast("请至少填写一项");
      return;
    }

    const date = new Date().toISOString().slice(0, 10);
    const zoneName = this.myDiaryZone ? this.emotionZones[this.myDiaryZone].name : "未选择";
    const title = `${date}-${emotion || "情绪"}-${zoneName}`;
    const content = `身体感受：${body || "未记录"}\n情绪颜色区：${zoneName}\n今天最强烈的情绪：${emotion || "未记录"}\n它可能指向的需求：${need || "未记录"}\n我做的一件小事：${action || "未记录"}`;

    const diary = {
      id: Date.now(),
      title,
      date,
      source: "my",
      colorZone: this.myDiaryZone,
      colorZoneName: zoneName,
      body,
      emotion,
      need,
      action,
      content,
      feedback: "",
      createdAt: Date.now(),
    };

    this.moodDiaries.unshift(diary);
    this.saveData();

    // 清空输入并回到第一步
    if (bodyInput) bodyInput.value = "";
    emotionInput.value = "";
    needInput.value = "";
    actionInput.value = "";
    this.selectMyDiaryZone(null);
    this.resetMoodStep();

    this.renderMoodDiaries();
    this.showToast("情绪日记已保存，进入冥想催眠 🌙");

    // 直接进入冥想催眠：10 秒镇定 + 自动播放催眠音频
    this.startRelaxFlow();
  },

  // ========== 放松流程：10 秒镇定 + 催眠音频 ==========
  startRelaxFlow() {
    const overlay = document.getElementById("relax-overlay");
    const calmSection = document.getElementById("calm-section");
    const audioSection = document.getElementById("audio-section");
    const audioFallback = document.getElementById("audio-fallback");
    const calmProgress = document.getElementById("calm-progress");
    const calmText = document.getElementById("calm-text");
    const calmStep = document.getElementById("calm-step");

    overlay.style.display = "flex";
    calmSection.style.display = "block";
    audioSection.style.display = "none";
    audioFallback.style.display = "none";

    // 提前开始加载音频
    const audio = document.getElementById("hypnosis-audio");
    if (audio) {
      audio.preload = "auto";
      audio.load();
    }

    const steps = [
      "注意你身体的哪个部位能感受到这种情绪",
      "命名情感。你是否感到愤怒、不耐烦或恐惧？",
      "为自己争取一些时间。深呼吸、数到 10、暂停对话",
    ];
    const total = 10;
    let seconds = total;
    calmText.textContent = seconds;
    calmProgress.style.width = "0%";
    calmStep.textContent = steps[0];

    const timer = setInterval(() => {
      seconds--;
      calmText.textContent = seconds;
      calmProgress.style.width = `${((total - seconds) / total) * 100}%`;
      if (seconds <= 7) calmStep.textContent = steps[1];
      if (seconds <= 4) calmStep.textContent = steps[2];

      if (seconds <= 0) {
        clearInterval(timer);
        calmSection.style.display = "none";
        audioSection.style.display = "block";
        this.playHypnosisAudio();
      }
    }, 1000);

    this._relaxTimer = timer;
  },

  closeRelaxOverlay() {
    const overlay = document.getElementById("relax-overlay");
    overlay.style.display = "none";
    this.pauseHypnosisAudio();
    if (this._relaxTimer) {
      clearInterval(this._relaxTimer);
      this._relaxTimer = null;
    }
  },

  toggleHypnosisAudio() {
    const audio = document.getElementById("hypnosis-audio");
    if (!audio) return;
    if (audio.paused) {
      this.playHypnosisAudio();
    } else {
      this.pauseHypnosisAudio();
    }
  },

  playHypnosisAudio() {
    const audio = document.getElementById("hypnosis-audio");
    const btn = document.getElementById("audio-play-pause");
    const fallback = document.getElementById("audio-fallback");
    if (!audio) return;

    const playPromise = audio.play();
    if (playPromise !== undefined) {
      playPromise.then(() => {
        if (btn) btn.textContent = "暂停";
        if (fallback) fallback.style.display = "none";
      }).catch((err) => {
        console.error("音频自动播放失败", err);
        if (btn) btn.textContent = "播放";
        if (fallback) fallback.style.display = "block";
      });
    }
  },

  pauseHypnosisAudio() {
    const audio = document.getElementById("hypnosis-audio");
    const btn = document.getElementById("audio-play-pause");
    if (!audio) return;
    audio.pause();
    if (btn) btn.textContent = "播放";
  },

  async callAIFeedback(content) {
    const today = new Date().toLocaleDateString("zh-CN", { year: "numeric", month: "long", day: "numeric" });
    const prompt = `这是 ${today} 的觉察日记。

你是谢小树，一个陪伴者不是解读师。你的目标是帮用户在感受里多待一会儿。

根据用户今天写的内容，自然地回应——不需要每次都说同样的话：

- 看用户写得多还是少？写得多→也许只需要一句轻轻的点。写得少→那"少"里可能有很多东西。
- 看用户在哪个层面？写了情绪没说身体→问问身体。已经说了身体→问问下面还有什么。
- 看有没有重复模式？有→轻轻点一下。没有→不强行分析。
- 如果用户已经自我觉察得很好→肯定就够了。不需要添油加醋。

不要套话。别让用户觉得"小树又在说那几句了"。控制在 200-400 字。

用户的日记内容：
${content}`;

    const response = await fetch(CONFIG.BASE_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json; charset=utf-8", "Authorization": `Bearer ${CONFIG.API_KEY}` },
      body: JSON.stringify({
        model: CONFIG.MODEL,
        messages: [
          {
            role: "system",
            content: typeof XIAOSHU_PROMPT !== "undefined" ? XIAOSHU_PROMPT : "你是一个温暖的心理洞察助手。",
          },
          { role: "user", content: prompt },
        ],
        temperature: 0.8,
        max_tokens: 4000,
      }),
    });
    if (!response.ok) { const err = await response.text(); throw new Error(`API 错误 (${response.status}): ${err}`); }
    const data = await response.json();
    return data.choices[0].message.content;
  },

  renderDiaries() {
    const list = document.getElementById("guided-diary-list");
    const countEl = document.getElementById("guided-diary-count");
    if (!list) return;
    if (countEl) countEl.textContent = `共 ${this.diaries.length} 篇`;

    if (this.diaries.length === 0) {
      list.innerHTML = '<div class="empty">还没有觉察日记，开始你的第一篇吧 ✍️</div>';
      return;
    }

    list.innerHTML = "";
    this.diaries.forEach((d) => {
      const card = document.createElement("div");
      card.className = "diary-card";
      card.dataset.id = String(d.id);

      const hasSteps = d.steps && d.steps.event;
      let contentHtml = "";
      if (hasSteps) {
        contentHtml = `
          <div class="diary-steps-mini">
            <div><span class="s-label">情绪事件</span> ${this.escapeHtml(d.steps.event || "")}</div>
            <div><span class="s-label">身心感受</span> ${this.escapeHtml(d.steps.feeling || "")}</div>
            <div><span class="s-label">防御方式</span> ${this.escapeHtml(d.steps.defense || "")}</div>
            <div><span class="s-label">延展模型</span> ${this.escapeHtml(d.steps.extend || "")}</div>
          </div>`;
      } else {
        contentHtml = `<div class="diary-content">${this.markdownToHtml(d.content)}</div>`;
      }

      card.innerHTML = `
        <div class="diary-header">
          <div class="diary-header-main">
            <h4>${this.escapeHtml(d.title)}</h4>
            <span class="diary-date">${new Date(d.createdAt).toLocaleString("zh-CN")}</span>
          </div>
          <span class="expand-icon">▶</span>
        </div>
        <div class="diary-body">
          ${contentHtml}
          <div class="diary-feedback">
            <div class="feedback-label">🌱 小树回应</div>
            <div class="feedback-body">${this.markdownToHtml(d.feedback)}</div>
          </div>
          <div class="diary-card-actions">
            <button class="btn-text" onclick="App.exportGuidedDiary(${d.id})">📤 导出</button>
            <button class="btn-text danger" onclick="App.deleteGuidedDiary(${d.id})">删除</button>
          </div>
        </div>
      `;

      const header = card.querySelector(".diary-header");
      header.addEventListener("click", () => {
        card.classList.toggle("expanded");
      });

      list.appendChild(card);
    });
  },

  renderMoodDiaries() {
    const list = document.getElementById("mood-diary-list");
    const countEl = document.getElementById("mood-diary-count");
    if (!list) return;
    if (countEl) countEl.textContent = `共 ${this.moodDiaries.length} 篇`;

    if (this.moodDiaries.length === 0) {
      list.innerHTML = '<div class="empty">还没有情绪日记，完成一次冥想式 check-in 吧 🌙</div>';
      return;
    }

    list.innerHTML = "";
    this.moodDiaries.forEach((d) => {
      const card = document.createElement("div");
      card.className = "diary-card";
      card.dataset.id = String(d.id);

      card.innerHTML = `
        <div class="diary-header">
          <div class="diary-header-main">
            <h4>${this.escapeHtml(d.title)}</h4>
            <span class="diary-date">${new Date(d.createdAt).toLocaleString("zh-CN")}</span>
          </div>
          <span class="expand-icon">▶</span>
        </div>
        <div class="diary-body">
          <div class="diary-my-mini">
            <div><span class="s-label">身体感受</span> ${this.escapeHtml(d.body || "未记录")}</div>
            <div><span class="s-label">颜色区</span> ${this.escapeHtml(d.colorZoneName || "未选择")}</div>
            <div><span class="s-label">情绪</span> ${this.escapeHtml(d.emotion || "未记录")}</div>
            <div><span class="s-label">需求</span> ${this.escapeHtml(d.need || "未记录")}</div>
            <div><span class="s-label">行动</span> ${this.escapeHtml(d.action || "未记录")}</div>
          </div>
          <div class="diary-card-actions">
            <button class="btn-text" onclick="App.exportMoodDiary(${d.id})">📤 导出</button>
            <button class="btn-text danger" onclick="App.deleteMoodDiary(${d.id})">删除</button>
          </div>
        </div>
      `;

      const header = card.querySelector(".diary-header");
      header.addEventListener("click", () => {
        card.classList.toggle("expanded");
      });

      list.appendChild(card);
    });
  },

  // ========== 导出 ==========
  exportGuidedDiary(id) {
    const d = this.diaries.find(dd => dd.id === id);
    if (!d) return;
    const filename = (d.title || "觉察日记").replace(/[\\/:*?"<>|]/g, "_") + ".txt";
    let text = `标题：${d.title}\n日期：${d.date}\n类型：觉察日记\n\n`;
    if (d.steps) {
      text += `【情绪事件】\n${d.steps.event}\n\n【身心感受】\n${d.steps.feeling}\n\n【防御方式】\n${d.steps.defense}\n\n【延展模型】\n${d.steps.extend}\n\n`;
    } else {
      text += `${d.content}\n\n`;
    }
    text += `【🌱 小树回应】\n${d.feedback}\n`;
    this.downloadFile(filename, text);
  },

  exportAllGuidedDiaries() {
    if (this.diaries.length === 0) { this.showToast("没有觉察日记可导出"); return; }
    for (const d of this.diaries) {
      this.exportGuidedDiary(d.id);
    }
    this.showToast(`已导出 ${this.diaries.length} 篇觉察日记`);
  },

  exportMoodDiary(id) {
    const d = this.moodDiaries.find(dd => dd.id === id);
    if (!d) return;
    const filename = (d.title || "情绪日记").replace(/[\\/:*?"<>|]/g, "_") + ".txt";
    let text = `标题：${d.title}\n日期：${d.date}\n类型：情绪日记\n\n`;
    text += `身体感受：${d.body || "未记录"}\n颜色区：${d.colorZoneName || "未选择"}\n情绪：${d.emotion || "未记录"}\n需求：${d.need || "未记录"}\n行动：${d.action || "未记录"}\n\n`;
    this.downloadFile(filename, text);
  },

  exportAllMoodDiaries() {
    if (this.moodDiaries.length === 0) { this.showToast("没有情绪日记可导出"); return; }
    for (const d of this.moodDiaries) {
      this.exportMoodDiary(d.id);
    }
    this.showToast(`已导出 ${this.moodDiaries.length} 篇情绪日记`);
  },

  exportFreeDiary(id) {
    const d = this.freeDiaries.find(dd => dd.id === id);
    if (!d) return;
    const filename = (d.title || "自由书写").replace(/[\\/:*?"<>|]/g, "_") + ".txt";
    let text = `标题：${d.title}\n日期：${d.date}\n类型：自由书写\n\n`;
    text += `${d.content}\n\n`;
    text += `【🌱 小树回应】\n${d.feedback}\n`;
    this.downloadFile(filename, text);
  },

  exportAllFreeDiaries() {
    if (this.freeDiaries.length === 0) { this.showToast("没有自由书写可导出"); return; }
    for (const d of this.freeDiaries) {
      this.exportFreeDiary(d.id);
    }
    this.showToast(`已导出 ${this.freeDiaries.length} 篇自由书写`);
  },

  // ========== 一键周报导出 ==========
  getISOWeekNumber(date) {
    // ISO 8601: 周一为一周开始，1月4日所在周为第1周
    const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
    d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7));
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
    const weekNo = Math.ceil(((d - yearStart) / 86400000 + 1) / 7);
    return String(weekNo).padStart(2, "0");
  },

  getFridayStart(timestamp) {
    const d = new Date(timestamp);
    const dDay = d.getDay();
    // 回退到最近周五的天数: 周五0, 周六1, 周日2, 周一3, ... 周四6
    const backDays = (dDay + 2) % 7;
    d.setDate(d.getDate() - backDays);
    d.setHours(0, 0, 0, 0);
    return d.getTime();
  },

  checkWeeklyExportReminder() {
    const banner = document.getElementById("weekly-export-banner");
    if (!banner) return;
    const now = new Date();
    const day = now.getDay();
    // 只在周五(5)、周六(6)、周日(0)显示
    if (day !== 5 && day !== 6 && day !== 0) { banner.style.display = "none"; return; }

    let lastExportedFriday = "";
    try {
      const saved = localStorage.getItem("xs_weekly_export");
      if (saved) {
        const parsed = JSON.parse(saved);
        lastExportedFriday = parsed.fridayKey || "";
      }
    } catch (e) { console.error("读取周报导出记录失败", e); }

    const thisFriday = new Date(this.getFridayStart(Date.now()));
    const thisFridayKey = thisFriday.toISOString().slice(0, 10); // "2026-07-17"
    if (lastExportedFriday === thisFridayKey) {
      banner.style.display = "none";
    } else {
      banner.style.display = "block";
    }
  },

  dismissWeeklyReminder() {
    const thisFriday = new Date(this.getFridayStart(Date.now()));
    const fridayKey = thisFriday.toISOString().slice(0, 10);
    try {
      localStorage.setItem("xs_weekly_export", JSON.stringify({ fridayKey }));
    } catch (e) { console.error("保存周报导出记录失败", e); }
    const banner = document.getElementById("weekly-export-banner");
    if (banner) banner.style.display = "none";
  },

  formatWeeklyReport() {
    const lines = [];
    const now = new Date().toLocaleString("zh-CN");
    // 以最近一个周五 0:00 为终点，往前7天
    const fridayEnd = this.getFridayStart(Date.now());
    const weekStart = fridayEnd - 7 * 24 * 60 * 60 * 1000;
    lines.push(`# 小树觉察室周报`);
    lines.push(`生成时间：${now}`);
    lines.push(`---`);
    lines.push("");

    // 一、对话记录
    lines.push("## 一、对话记录");
    const userMessages = this.currentChat.filter(m => m.role === "user" && m.time >= weekStart && m.time < fridayEnd + 24 * 60 * 60 * 1000);
    if (userMessages.length === 0) {
      lines.push("（本周暂无对话记录）");
    } else {
      userMessages.forEach((m, i) => {
        const t = new Date(m.time).toLocaleString("zh-CN");
        lines.push(`${i + 1}. ${t}`);
        lines.push(`   ${m.content}`);
        lines.push("");
      });
    }
    lines.push("");

    // 二、引导式觉察
    lines.push("## 二、引导式觉察");
    const guided = this.diaries.filter(d => d.source === "guided" && d.createdAt >= weekStart);
    if (guided.length === 0) {
      lines.push("（本周暂无引导式觉察）");
    } else {
      guided.forEach((d) => {
        lines.push(`《${d.title}》 ${new Date(d.createdAt).toLocaleString("zh-CN")}`);
        if (d.steps) {
          lines.push(`情绪事件：${d.steps.event || "未记录"}`);
          lines.push(`身心感受：${d.steps.feeling || "未记录"}`);
          lines.push(`防御方式：${d.steps.defense || "未记录"}`);
          lines.push(`延展模型：${d.steps.extend || "未记录"}`);
        } else {
          lines.push(d.content || "");
        }
        lines.push("");
      });
    }
    lines.push("");

    // 三、自由书写
    lines.push("## 三、自由书写");
    const free = this.freeDiaries.filter(d => d.source === "free" && d.createdAt >= weekStart);
    if (free.length === 0) {
      lines.push("（本周暂无自由书写）");
    } else {
      free.forEach((d) => {
        lines.push(`《${d.title}》 ${new Date(d.createdAt).toLocaleString("zh-CN")}`);
        lines.push(d.content || "");
        lines.push("");
      });
    }
    lines.push("");

    // 四、情绪日记
    lines.push("## 四、情绪日记");
    const moods = this.moodDiaries.filter(d => d.source === "my" && d.createdAt >= weekStart);
    if (moods.length === 0) {
      lines.push("（本周暂无情绪日记）");
    } else {
      moods.forEach((d) => {
        lines.push(`《${d.title}》 ${new Date(d.createdAt).toLocaleString("zh-CN")}`);
        lines.push(`身体感受：${d.body || "未记录"}`);
        lines.push(`颜色区：${d.colorZoneName || "未选择"}`);
        lines.push(`情绪：${d.emotion || "未记录"}`);
        lines.push(`需求：${d.need || "未记录"}`);
        lines.push(`行动：${d.action || "未记录"}`);
        lines.push("");
      });
    }
    lines.push("");

    // 五、识人观察
    lines.push("## 五、识人观察");
    const peopleWithObs = this.people.filter(p => p.observations && p.observations.some(o => o.createdAt >= weekStart));
    if (peopleWithObs.length === 0) {
      lines.push("（本周暂无识人观察）");
    } else {
      peopleWithObs.forEach((p) => {
        lines.push(`角色：${p.name}（${p.relation}）`);
        [...p.observations]
          .filter(o => o.createdAt >= weekStart)
          .sort((a, b) => a.createdAt - b.createdAt)
          .forEach((o) => {
            const t = new Date(o.createdAt).toLocaleString("zh-CN");
            lines.push(`[${o.type}] ${t}`);
            lines.push(o.content || "");
            lines.push("");
          });
      });
    }
    lines.push("");
    lines.push("---");
    lines.push("周报结束");

    return lines.join("\n");
  },

  exportWeeklyReport() {
    const text = this.formatWeeklyReport();
    const now = new Date();
    const year = now.getFullYear();
    const weekNum = this.getISOWeekNumber(now);
    const dateStr = now.toISOString().slice(0, 10).replace(/-/g, "");
    const filename = `酥梨周报_${year}_${weekNum}WK_${dateStr}.txt`;
    this.downloadFile(filename, text);

    // 记录导出时间，隐藏提醒
    this.dismissWeeklyReminder();
    this.showToast("周报已导出 🌱");
  },

  downloadFile(filename, text) {
    // 使用 UTF-8 BOM 确保 Windows/手机打开不乱码
    const blob = new Blob(["﻿" + text], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  },

  deleteGuidedDiary(id) {
    if (!confirm("确定删除这条觉察日记吗？")) return;
    this.diaries = this.diaries.filter((d) => d.id !== id);
    this.saveData();
    this.renderDiaries();
    this.showToast("觉察日记已删除");
  },

  deleteMoodDiary(id) {
    if (!confirm("确定删除这条情绪日记吗？")) return;
    this.moodDiaries = this.moodDiaries.filter((d) => d.id !== id);
    this.saveData();
    this.renderMoodDiaries();
    this.showToast("情绪日记已删除");
  },

  // ========== 设置 ==========
  renderSettings() {
    const apiKeyInput = document.getElementById("setting-api-key");
    const modelInput = document.getElementById("setting-model");
    const baseUrlInput = document.getElementById("setting-base-url");
    if (apiKeyInput) apiKeyInput.value = CONFIG.API_KEY;
    if (modelInput) modelInput.value = CONFIG.MODEL;
    if (baseUrlInput) baseUrlInput.value = CONFIG.BASE_URL;
  },

  saveSettings() {
    const apiKey = document.getElementById("setting-api-key").value.trim();
    let model = document.getElementById("setting-model").value.trim();
    const baseUrl = document.getElementById("setting-base-url").value.trim();

    // 防手机自动填充：检测模型框是否被填入了 API Key
    if (model.startsWith("sk-") || model.length > 40) {
      console.warn("检测到模型框被异常填充，已自动纠正");
      model = "deepseek-chat";
      document.getElementById("setting-model").value = model;
    }

    // 防手机自动填充：检测 API 地址框是否被异常填充
    let cleanBaseUrl = baseUrl;
    if (baseUrl.startsWith("sk-") || baseUrl.length > 80) {
      console.warn("检测到 API 地址框被异常填充，已自动纠正");
      cleanBaseUrl = "https://api.deepseek.com/v1/chat/completions";
      document.getElementById("setting-base-url").value = cleanBaseUrl;
    }

    const userConfig = { API_KEY: apiKey, MODEL: model, BASE_URL: cleanBaseUrl };
    localStorage.setItem("xs_user_config", JSON.stringify(userConfig));
    Object.assign(CONFIG, userConfig);
    this.showToast("设置已保存 ✅");
  },

  clearAllData() {
    if (!confirm("确定清空所有对话、日记和设置吗？此操作不可恢复。")) return;
    localStorage.removeItem("xs_chat_history");
    localStorage.removeItem("xs_diaries");
    localStorage.removeItem("xs_mood_diaries");
    localStorage.removeItem("xs_free_diaries");
    localStorage.removeItem("xs_weekly_export");
    localStorage.removeItem("xs_mode");
    localStorage.removeItem("xs_people");
    localStorage.removeItem("xs_user_config");
    this.currentChat = [];
    this.diaries = [];
    this.moodDiaries = [];
    this.freeDiaries = [];
    this.people = [];
    this.currentMode = "xiaoshu";
    this.saveData();
    location.reload();
  },

  // ========== 识人板块 ==========
  renderPeopleList() {
    const list = document.getElementById("people-list");
    if (!list) return;
    if (this.people.length === 0) {
      list.innerHTML = '<div class="empty-people">🔍 还没有观察对象<br>点击上方「新增角色」开始识人<br><br><small>识人的目的不是评判对方，<br>而是理解「我为什么会有这种感觉」</small></div>';
      return;
    }
    list.innerHTML = "";
    this.people.forEach(p => {
      const card = document.createElement("div");
      card.className = "person-card";
      const title = this.getPersonTitle(p);
      card.innerHTML = `
        <div class="person-card-main">
          <div class="person-card-header">
            <span class="person-card-name">${this.escapeHtml(p.name)}</span>
            <span class="person-card-relation">${this.escapeHtml(p.relation)}</span>
          </div>
          ${title ? `<div class="person-card-title">${this.escapeHtml(title)}</div>` : ""}
          <div class="person-card-meta">观察到 ${p.observations.length} 次 · ${new Date(p.createdAt).toLocaleDateString("zh-CN")}</div>
        </div>
        <button class="person-card-delete" data-pid="${p.id}" title="删除角色">×</button>
      `;
      card.querySelector(".person-card-main").addEventListener("click", () => this.openPerson(p.id));
      card.querySelector(".person-card-delete").addEventListener("click", (e) => {
        e.stopPropagation();
        this.deletePerson(parseInt(e.currentTarget.dataset.pid));
      });
      list.appendChild(card);
    });
  },

  deletePerson(id) {
    const p = this.people.find(pp => pp.id === id);
    if (!p) return;
    if (!confirm(`确定删除角色「${p.name}」及其所有观察记录和分析吗？`)) return;
    this.people = this.people.filter(pp => pp.id !== id);
    this.saveData();
    if (this.currentPersonId === id) this.closePerson();
    this.renderPeopleList();
    this.showToast("角色已删除");
  },

  getPersonTitle(p) {
    if (p.title) return p.title;
    return this.generatePersonTitleLocal(p);
  },

  generatePersonTitleLocal(p) {
    // 本地规则标题，类似觉察日记：日期-关键词-关系
    const date = new Date().toISOString().slice(0, 10).replace(/-/g, "");
    const latest = p.observations[p.observations.length - 1];
    if (latest) {
      const snippet = latest.content.replace(/[\s，。！？、；：""''（）]/g, "").slice(0, 6);
      return `${date}-${snippet || "观察"}-${p.relation}`;
    }
    return `${date}-${p.name}-${p.relation}`;
  },

  showPersonForm() {
    // 移除旧弹框
    const old = document.querySelector(".person-form-overlay");
    if (old) old.remove();

    const overlay = document.createElement("div");
    overlay.className = "person-form-overlay";
    overlay.innerHTML = `
      <div class="person-form-card">
        <h3>新增角色</h3>
        <input type="text" id="person-form-name" placeholder="角色名称（如：男朋友、同事A）">
        <select id="person-form-relation">
          <option value="">选择关系...</option>
          <option value="伴侣">伴侣</option>
          <option value="家人">家人</option>
          <option value="同事">同事</option>
          <option value="朋友">朋友</option>
          <option value="相亲对象">相亲对象</option>
          <option value="其他">其他</option>
        </select>
        <textarea id="person-form-impression" placeholder="这个人给我的初步印象..." rows="2"></textarea>
        <button id="person-form-save" class="btn-primary">保存角色</button>
        <button id="person-form-cancel" class="btn-text">取消</button>
      </div>`;
    document.body.appendChild(overlay);

    overlay.addEventListener("click", (e) => {
      if (e.target === overlay) { overlay.remove(); }
    });
    document.getElementById("person-form-cancel").addEventListener("click", () => overlay.remove());
    document.getElementById("person-form-save").addEventListener("click", () => {
      const name = document.getElementById("person-form-name").value.trim();
      const relation = document.getElementById("person-form-relation").value;
      const impression = document.getElementById("person-form-impression").value.trim();
      if (!name) { this.showToast("请输入角色名称"); return; }
      const person = {
        id: Date.now(),
        name,
        relation: relation || "其他",
        impression,
        observations: [],
        analyses: [],
        createdAt: Date.now(),
      };
      this.people.unshift(person);
      this.saveData();
      overlay.remove();
      this.renderPeopleList();
      this.showToast("角色已添加");
    });
  },

  openPerson(id) {
    this.currentPersonId = id;
    document.getElementById("people-list-view").style.display = "none";
    document.getElementById("person-detail-view").style.display = "";
    this.renderPersonDetail();

    // 过度分析检测
    if (this.people.length >= 4) {
      document.getElementById("over-analyze-warning").style.display = "block";
      document.getElementById("over-analyze-warning").innerHTML =
        "🌱 小树轻轻问：你在观察这么多人的时候，有没有可能想通过分析别人，来转移对自我的觉察？也许可以去觉察日记那边写一篇。分析功能依然能用。";
    }
  },

  closePerson() {
    this.currentPersonId = null;
    document.getElementById("people-list-view").style.display = "";
    document.getElementById("person-detail-view").style.display = "none";
  },

  getCurrentPerson() {
    return this.people.find(p => p.id === this.currentPersonId);
  },

  renderPersonDetail() {
    const p = this.getCurrentPerson();
    if (!p) return;

    // 角色信息
    const title = this.getPersonTitle(p);
    document.getElementById("person-info-card").innerHTML = `
      <div class="person-info-name">${this.escapeHtml(p.name)}</div>
      <div class="person-info-relation">${this.escapeHtml(p.relation)} · ${new Date(p.createdAt).toLocaleDateString("zh-CN")}</div>
      ${title ? `<div class="person-info-title">${this.escapeHtml(title)}</div>` : ""}
      ${p.impression ? `<div class="person-info-meta" style="font-size:13px;color:var(--text-light);margin-top:6px;">${this.escapeHtml(p.impression)}</div>` : ""}
      <div class="person-info-ct-hint">
        💡 识人的目的不是评判对方，而是理解「为什么我和他在一起会有这种感觉」。<br><br>
        先问自己：<br>
        1. 我的反移情是什么？<br>
        2. 这个人让我想起了谁？<br>
        3. 这种互动模式，是不是在别的关系里也出现过？
      </div>
      <button class="btn-text danger" style="margin-top:8px;" id="delete-person-btn">删除此角色</button>
    `;
    document.getElementById("delete-person-btn").addEventListener("click", () => {
      if (!confirm(`确定删除「${p.name}」及其所有记录吗？`)) return;
      this.people = this.people.filter(pp => pp.id !== p.id);
      this.saveData();
      this.closePerson();
      this.renderPeopleList();
      this.showToast("角色已删除");
    });

    // 观察记录
    document.getElementById("obs-count").textContent = `(${p.observations.length} 条)`;
    this.renderObsList();

    // 上次分析
    if (p.analyses.length > 0) {
      document.getElementById("person-analysis-card").style.display = "";
      const last = p.analyses[p.analyses.length - 1];
      document.getElementById("analysis-body").innerHTML = this.markdownToHtml(last.content);
      document.getElementById("analysis-honesty").innerHTML = `<div class="honesty-title">⚠️ 诚实边界</div>` + this.HONESTY_BOUNDARY.map(item => `<p class="honesty-item">• ${this.escapeHtml(item)}</p>`).join("");
      document.getElementById("analysis-date").textContent = "分析时间：" + new Date(last.createdAt).toLocaleString("zh-CN");
    } else {
      document.getElementById("person-analysis-card").style.display = "none";
    }
  },

  renderObsList() {
    const p = this.getCurrentPerson();
    if (!p) return;
    const list = document.getElementById("obs-list");
    if (!list) return;
    if (p.observations.length === 0) {
      list.innerHTML = '<div style="color:var(--text-light);font-size:13px;text-align:center;padding:12px;">还没有观察记录，在下方添加</div>';
      return;
    }
    list.innerHTML = "";
    [...p.observations].reverse().forEach(o => {
      const div = document.createElement("div");
      div.className = "obs-item";
      const isLong = o.content.length > 40;
      const preview = this.escapeHtml(o.content.slice(0, 40));
      div.innerHTML = `
        <div class="obs-item-header">
          <span class="obs-item-type">${o.type === "言" ? "💬" : o.type === "行" ? "🏃" : "🧠"} ${o.type}</span>
          <div>
            <span class="obs-item-date">${new Date(o.createdAt).toLocaleString("zh-CN")}</span>
            <button class="obs-item-delete" data-oid="${o.id}">删除</button>
          </div>
        </div>
        <div class="obs-item-content collapsed" data-full="${this.escapeHtml(o.content)}">
          <span class="obs-preview">${preview}${isLong ? "…" : ""}</span>
          ${isLong ? `<button class="obs-expand-btn">展开</button>` : ""}
        </div>
      `;
      list.appendChild(div);
    });

    // 展开/收起
    list.querySelectorAll(".obs-expand-btn").forEach(btn => {
      btn.addEventListener("click", (e) => {
        e.stopPropagation();
        const contentEl = e.currentTarget.closest(".obs-item-content");
        const isCollapsed = contentEl.classList.contains("collapsed");
        if (isCollapsed) {
          contentEl.innerHTML = `<span class="obs-full">${contentEl.dataset.full}</span><button class="obs-expand-btn">收起</button>`;
          contentEl.classList.remove("collapsed");
          contentEl.classList.add("expanded");
        } else {
          contentEl.classList.remove("expanded");
          contentEl.classList.add("collapsed");
          this.renderObsList();
        }
      });
    });

    // 删除事件
    list.querySelectorAll(".obs-item-delete").forEach(btn => {
      btn.addEventListener("click", (e) => {
        e.stopPropagation();
        const oid = parseInt(btn.dataset.oid);
        p.observations = p.observations.filter(o => o.id !== oid);
        this.saveData();
        this.renderObsList();
        document.getElementById("obs-count").textContent = `(${p.observations.length} 条)`;
      });
    });
  },

  HONESTY_BOUNDARY: [
    "这些分析基于你提供的二手信息（你的视角），不是第一手观察，存在严重偏差。",
    "分析依赖的只是你记录的语言和行为片段，无法还原完整的语境和对方的内心体验。",
    "我能看到的只是「你这侧的客体关系配对」——看到的不是真实的他，是你眼中的他。",
    "以下结论仅为推测，不能被当作对方的事实。",
    "不要用这些分析去给对方贴标签；不要用这些分析去质问对方、「诊断」对方、或证明自己是对的。",
    "精神分析不是你攻击别人的武器。",
    "如果你用这些去说服对方\"你不是回避型吗\"——我会生气。",
  ],

  async analyzePerson() {
    const p = this.getCurrentPerson();
    if (!p) return;
    if (p.observations.length === 0) { this.showToast("请先添加观察记录"); return; }
    if (!CONFIG.API_KEY) { this.showToast("请先在设置页填入 API Key"); return; }

    document.getElementById("analyze-person-btn").disabled = true;
    document.getElementById("analyze-person-btn").textContent = "分析中...";

    // 构建观察记录文本
    let obsText = p.observations.map((o, i) => {
      return `${i + 1}. [${o.type}] ${o.content}`;
    }).join("\n");

    // 反移情信息
    let ctInfo = "";
    if (p.analyses.length > 0) {
      ctInfo = `\n（历史分析次数：${p.analyses.length}，请关注模式是否在变化）`;
    }

    // 男性类型参考（来自人生护航课第18-25节）
    const MALE_TYPES_REF = `
【小树课程中的男性类型参考】
- 妈宝男（隐形/大孝子型）：与妈妈共生的生存模式，善于摸女性情绪，永远有人兜底
- 巨婴男（隐形型）：心智停留在偏执分裂位，用"好坏/三观正不正"评价一切
- 回避型依恋男：真正回避的不是冲突，而是亲密的感觉和靠近的愿望
- 凤凰男：心里住着海滩上挣扎的家人，最在意家族荣耀
- 经济适用男：攻击性出不去就以被动方式表达（爱抱怨/麻木/聊骚）
- 富二代/精英男：镜映失败、看不清自己、需要"养成系"伴侣
- 离异男：离婚对男人是"总结教训"（防御更高），核心需求是钱`;

    const prompt = `你是谢小树。你正在帮用户分析一位她身边的重要他人。

你的分析目的不是给不在场的人贴标签，而是**帮助用户理解自己的反移情和关系模式**。

${MALE_TYPES_REF}

用户观察的对象信息：
- 称呼：${p.name}
- 关系：${p.relation}
- 用户初步印象：${p.impression || "未提供"}

用户记录的观察（按时间顺序）：
${obsText}${ctInfo}

请运用你的精神分析框架，给出一段分析。以下是你应该调用的核心模型：
- 防御机制面具（模型2）：这个人用什么样的方式保护自己？
- 核心需求的矛盾性（模型4）：这个人最渴望得到却从未得到过的是什么？
- 一元/二元/三元发展模型（模型7）：这个人的人格发展水平线索
- 客体关系配对（模型17）：用户和这个人的互动，是不是在重复某种熟悉的配对模式？

然后，最关键的部分——**帮用户看反移情**。如果你分析时没有被分析人的信息，你只是推断，但是你知道ta和用户之间的互动：
- 一致性反移情（模型10）：用户和这个人相处时，感受到的是什么？这个感受可能是这个人自己内心的感受。
- 互补性反移情（模型10）：用户有没有被勾起一种"被迫扮演某个角色"的感觉？那个角色是谁？
- 四客体移情（模型9）：这个人有没有让用户想到过去的某个人？父亲？母亲？某个伤害过ta的人？某个ta想拯救的人？
- 投射性认同（模型13）：用户在记录这些观察时，是不是也在参与某种关系模式？——比如，用户是不是在"寻找证据证明这个人不可靠"？还是在"努力证明自己对他有用"？

控制分析在500-700字。用推测框架而非结论框架，不贴标签。

分析结束后，加上下面这段——这是给用户的下一步方向，不是分析的一部分：

---

💡 **给你的下一步**

这个人让你想到谁？你有没有在别的关系里也做过类似的事——比如总是你在观察、你在解读、你在想办法理解对方？

你记录的这些观察里，有没有哪一条让你特别不舒服？那个不舒服，是你自己的伤口在疼，还是他的行为在伤害你？

如果还想继续聊，你可以告诉我：
- 哪个分析点让你觉得"好像不太对"？我们来讨论。
- 哪个人让你想到过去的谁？我们来溯源。
- 或者，直接给我更多的观察记录，我们可以继续往下看。`;

    const parseAnalysisResponse = (text) => {
      const match = text.match(/TITLE:\s*(.+?)(?:\n|$)/);
      if (match) {
        const title = match[1].trim();
        const content = text.replace(match[0], "").trim();
        return { title, content };
      }
      return { title: "", content: text.trim() };
    };

    try {
      const response = await fetch(CONFIG.BASE_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json; charset=utf-8", "Authorization": `Bearer ${CONFIG.API_KEY}` },
        body: JSON.stringify({
          model: CONFIG.MODEL,
          messages: [
            {
              role: "system",
              content: typeof XIAOSHU_PROMPT !== "undefined" ? XIAOSHU_PROMPT : "你是一个基于精神分析的识人助手。",
            },
            { role: "user", content: prompt },
          ],
          temperature: 0.7,
          max_tokens: 4000,
        }),
      });
      if (!response.ok) { const err = await response.text(); throw new Error(`API 错误: ${err}`); }
      const data = await response.json();
      const raw = data.choices[0].message.content;
      const { title, content } = parseAnalysisResponse(raw);

      if (title) p.title = title;
      p.analyses.push({ id: Date.now(), content, createdAt: Date.now() });
      this.saveData();
      this.renderPersonDetail();
      this.showToast("分析完成 🌱");
    } catch (err) {
      console.error(err);
      this.showToast("分析失败：" + err.message);
    } finally {
      document.getElementById("analyze-person-btn").disabled = false;
      document.getElementById("analyze-person-btn").textContent = "🌱 小树分析此角色";
    }
  },

  // ========== Tab 导航 ==========
  switchTab(tab) {
    this.activeTab = tab;
    document.querySelectorAll(".tab-content").forEach((el) => {
      el.classList.remove("active");
    });
    document.getElementById(`tab-${tab}`).classList.add("active");
    document.querySelectorAll(".tab-btn").forEach((el) => {
      el.classList.remove("active");
    });
    document.getElementById(`nav-${tab}`).classList.add("active");

    // 切换到日记页时加载草稿并刷新列表
    if (tab === "diary") {
      this.loadGuidedDraft();
      this.renderGuidedStep();
      this.renderDiaries();
      this.renderMoodDiaries();
      this.renderFreeDiaries();
    }
    // 切换到识人页时渲染角色列表
    if (tab === "people") {
      this.renderPeopleList();
    }
  },

  renderTabs() {
    this.switchTab(this.activeTab);
  },

  // ========== 事件监听 ==========
  setupEventListeners() {
    // 发送消息
    const sendBtn = document.getElementById("send-btn");
    const chatInput = document.getElementById("chat-input");
    if (sendBtn) sendBtn.addEventListener("click", () => this.sendMessage());
    if (chatInput) {
      chatInput.addEventListener("keydown", (e) => {
        if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); this.sendMessage(); }
      });
      chatInput.addEventListener("input", function () {
        this.style.height = "auto";
        this.style.height = Math.min(this.scrollHeight, 120) + "px";
      });
    }

    // 模式切换
    const modeBtn = document.getElementById("mode-switch");
    if (modeBtn) modeBtn.addEventListener("click", () => this.toggleMode());

    // Tab 切换
    ["chat", "diary", "people", "settings"].forEach((tab) => {
      const btn = document.getElementById(`nav-${tab}`);
      if (btn) btn.addEventListener("click", () => this.switchTab(tab));
    });

    // 日记模式切换（觉察日记 / 情绪日记 / 自由书写）
    document.querySelectorAll(".diary-mode-btn").forEach(btn => {
      btn.addEventListener("click", (e) => {
        const mode = e.target.dataset.mode;
        document.querySelectorAll(".diary-mode-btn").forEach(b => b.classList.remove("active"));
        e.target.classList.add("active");
        document.querySelectorAll(".diary-mode-content").forEach(c => c.classList.remove("active"));
        if (mode === "guided") {
          document.getElementById("guided-diary").classList.add("active");
          this.loadGuidedDraft();
          this.renderGuidedStep();
          this.renderDiaries();
        } else if (mode === "my") {
          document.getElementById("my-diary").classList.add("active");
          this.resetMoodStep();
          this.renderMoodDiaries();
        } else if (mode === "free") {
          document.getElementById("free-diary").classList.add("active");
          this.renderFreeDiaries();
        }
      });
    });

    // 引导式觉察步骤导航
    document.getElementById("step-prev-btn").addEventListener("click", () => this.guidedPrev());
    document.getElementById("step-next-btn").addEventListener("click", () => this.guidedNext());

    // 保存引导日记
    document.getElementById("save-guided-btn").addEventListener("click", () => this.saveGuidedDiary());
    // 重新来过
    document.getElementById("reset-guided-btn").addEventListener("click", () => {
      this.guided = { currentStep: 1, steps: { event: "", feeling: "", defense: "", extend: "" } };
      this.clearGuidedDraft();
      document.getElementById("guided-step-card").style.display = "";
      document.getElementById("guided-summary").style.display = "none";
      document.getElementById("step-input").value = "";
      this.renderGuidedStep();
    });

    // 导出
    const exportGuidedBtn = document.getElementById("export-guided-btn");
    if (exportGuidedBtn) exportGuidedBtn.addEventListener("click", () => this.exportAllGuidedDiaries());

    const exportMoodBtn = document.getElementById("export-mood-btn");
    if (exportMoodBtn) exportMoodBtn.addEventListener("click", () => this.exportAllMoodDiaries());

    // 自由书写事件
    const saveFreeDiaryBtn = document.getElementById("save-free-diary-btn");
    if (saveFreeDiaryBtn) saveFreeDiaryBtn.addEventListener("click", () => this.saveFreeDiary());

    const exportFreeBtn = document.getElementById("export-free-btn");
    if (exportFreeBtn) exportFreeBtn.addEventListener("click", () => this.exportAllFreeDiaries());

    // 周报导出提醒
    const weeklyExportBtn = document.getElementById("weekly-export-btn");
    if (weeklyExportBtn) weeklyExportBtn.addEventListener("click", () => this.exportWeeklyReport());

    const weeklyExportDismiss = document.getElementById("weekly-export-dismiss");
    if (weeklyExportDismiss) weeklyExportDismiss.addEventListener("click", () => this.dismissWeeklyReminder());

    // ===== 情绪日记事件 =====
    const moodPrevBtn = document.getElementById("mood-prev-btn");
    if (moodPrevBtn) moodPrevBtn.addEventListener("click", () => this.prevMoodStep());

    const moodNextBtn = document.getElementById("mood-next-btn");
    if (moodNextBtn) moodNextBtn.addEventListener("click", () => this.nextMoodStep());

    const landingSkipBtn = document.getElementById("landing-skip-btn");
    if (landingSkipBtn) landingSkipBtn.addEventListener("click", () => this.skipLandingTimer());

    const audioPlayPause = document.getElementById("audio-play-pause");
    if (audioPlayPause) audioPlayPause.addEventListener("click", () => this.toggleHypnosisAudio());

    const audioManualPlay = document.getElementById("audio-manual-play");
    if (audioManualPlay) audioManualPlay.addEventListener("click", () => this.playHypnosisAudio());

    const relaxClose = document.getElementById("relax-close");
    if (relaxClose) relaxClose.addEventListener("click", () => this.closeRelaxOverlay());

    // 情绪日记颜色区选择
    document.querySelectorAll("#my-diary-mood-wheel .mood-zone").forEach(zone => {
      zone.addEventListener("click", (e) => {
        const zoneKey = e.currentTarget.dataset.zone;
        this.selectMyDiaryZone(zoneKey);
      });
    });

    // 我的日记情绪标签选择
    document.getElementById("my-diary-emotion-tags").addEventListener("click", (e) => {
      if (e.target.classList.contains("emotion-tag")) {
        const input = document.getElementById("my-emotion");
        input.value = e.target.textContent;
      }
    });

    // ===== 识人板块事件 =====
    document.getElementById("add-person-btn").addEventListener("click", () => this.showPersonForm());
    document.getElementById("person-back-btn").addEventListener("click", () => this.closePerson());

    // 观察类型切换
    document.querySelectorAll(".obs-type-btn").forEach(btn => {
      btn.addEventListener("click", (e) => {
        document.querySelectorAll(".obs-type-btn").forEach(b => b.classList.remove("active"));
        e.target.classList.add("active");
        this.obsType = e.target.dataset.type;
      });
    });

    // 添加观察记录
    document.getElementById("add-obs-btn").addEventListener("click", () => {
      const p = this.getCurrentPerson();
      if (!p) return;
      const input = document.getElementById("obs-input");
      const content = input.value.trim();
      if (!content) { this.showToast("请输入观察内容"); return; }
      p.observations.push({
        id: Date.now(),
        type: this.obsType,
        content,
        createdAt: Date.now(),
      });
      // 若还没有标题，用最新记录本地生成一个
      if (!p.title) {
        p.title = this.generatePersonTitleLocal(p);
      }
      this.saveData();
      input.value = "";
      this.renderPersonDetail();
      this.showToast("观察记录已添加");
    });

    // 小树分析
    document.getElementById("analyze-person-btn").addEventListener("click", () => this.analyzePerson());

    // 设置
    const saveSettingsBtn = document.getElementById("save-settings-btn");
    if (saveSettingsBtn) saveSettingsBtn.addEventListener("click", () => this.saveSettings());
    const clearDataBtn = document.getElementById("clear-data-btn");
    if (clearDataBtn) clearDataBtn.addEventListener("click", () => this.clearAllData());
    const clearChatBtn = document.getElementById("clear-chat-btn");
    if (clearChatBtn) clearChatBtn.addEventListener("click", () => this.clearChat());
    // 高级设置展开/折叠
    const toggleAdvancedBtn = document.getElementById("toggle-advanced-btn");
    if (toggleAdvancedBtn) {
      toggleAdvancedBtn.addEventListener("click", () => {
        const panel = document.getElementById("advanced-settings");
        if (panel.style.display === "none" || panel.style.display === "") {
          panel.style.display = "block";
          toggleAdvancedBtn.textContent = "⚙️ 高级设置 ▾";
        } else {
          panel.style.display = "none";
          toggleAdvancedBtn.textContent = "⚙️ 高级设置 ▸";
        }
      });
    }
  },

  // ========== 工具函数 ==========
  markdownToHtml(text) {
    if (!text) return "";
    return text
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/^### (.*$)/gim, "<h4>$1</h4>")
      .replace(/^## (.*$)/gim, "<h3>$1</h3>")
      .replace(/^# (.*$)/gim, "<h2>$1</h2>")
      .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
      .replace(/\*(.*?)\*/g, "<em>$1</em>")
      .replace(/`(.*?)`/g, "<code>$1</code>")
      .replace(/^\s*[-*] (.*$)/gim, "<li>$1</li>")
      .replace(/(<li>.*<\/li>)/s, "<ul>$1</ul>")
      .replace(/\n/g, "<br>");
  },

  escapeHtml(text) {
    const div = document.createElement("div");
    div.textContent = text;
    return div.innerHTML;
  },

  showToast(message) {
    const toast = document.getElementById("toast");
    if (!toast) return;
    toast.textContent = message;
    toast.classList.add("show");
    setTimeout(() => toast.classList.remove("show"), 2500);
  },
};

// PWA 注册 + 自动更新
if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("sw.js?v=11").then((reg) => {
      reg.addEventListener("updatefound", () => {
        const newWorker = reg.installing;
        newWorker.addEventListener("statechange", () => {
          if (newWorker.state === "activated" && navigator.serviceWorker.controller) {
            App.showToast("应用已更新，刷新页面获取最新版本");
          }
        });
      });
    }).catch((err) => {
      console.log("Service Worker 注册失败", err);
    });
  });
}

// 启动应用
document.addEventListener("DOMContentLoaded", () => {
  App.init();
});


