// 小树觉察室 - 主逻辑

const App = {
  currentMode: "normal",
  currentChat: [],
  diaries: [],        // 觉察日记
  moodDiaries: [],    // 情绪日记
  freeDiaries: [],    // 反向选择
  // 反向选择随机回顾
  reverseQueue: [],
  reverseQueueIndex: 0,
  activeTab: "chat",
  // 引导式觉察状态
  guided: {
    currentStep: 1,
    steps: { event: "", feeling: "", defense: "", extend: "", zones: [], emotions: [], category: null },
  },
  // 识人板块
  people: [],
  currentPersonId: null,
  obsType: "言",
  // 闪光页当前卡片
  sparkleCurrentDiary: null,
  // 洗牌队列
  sparkleQueue: [],
  sparkleQueueIndex: 0,

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

  // 快乐治愈小分队：正向情绪颜色区
  HAPPY_ZONES: ["orange", "green"],

  // 日日记录当前选中颜色区（支持多选）
  myDiaryZones: [],
  // 日日记录当前选中情绪词（支持多选）
  myDiaryEmotions: [],
  // 日日记录分步状态
  moodStep: {
    current: 1,
    total: 3,
    landingTimer: null,
    landingSeconds: 20,
  },

  init() {
    try { this.loadData(); } catch (e) { console.error("init loadData error", e); }
    try { this.renderTabs(); } catch (e) { console.error("init renderTabs error", e); }
    try { this.renderChat(); } catch (e) { console.error("init renderChat error", e); }
    try { this.renderDiaries(); } catch (e) { console.error("init renderDiaries error", e); }
    try { this.renderMoodDiaries(); } catch (e) { console.error("init renderMoodDiaries error", e); }
    try { this.renderFreeDiaries(); } catch (e) { console.error("init renderFreeDiaries error", e); }
    try { this.renderSettings(); } catch (e) { console.error("init renderSettings error", e); }
    try { this.setupEventListeners(); } catch (e) { console.error("init setupEventListeners error", e); }
    try { this.setMode("xiaoshu"); } catch (e) { console.error("init setMode error", e); }
    try { this.checkWeeklyExportReminder(); } catch (e) { console.error("init checkWeeklyExportReminder error", e); }

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
    2: "当时你感受到什么情绪？——没有评价，只有感受。\n\n身体有什么感觉？心，胸，头，手，脚，肩膀，脖子在发生什么变化？",
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
    const stepNum = document.getElementById("step-num");
    const stepName = document.getElementById("step-name");
    const stepQ = document.getElementById("step-question");
    const stepInput = document.getElementById("step-input");
    if (stepNum) stepNum.textContent = step;
    if (stepName) stepName.textContent = this.getGuidedStepName(step);
    if (stepQ) stepQ.textContent = this.getGuidedStepQuestion(step);
    if (stepInput) stepInput.value = this.guided.steps[Object.keys(this.guided.steps)[step - 1]] || "";

    // 颜色区仅在第 2 步显示
    const moodWheel = document.getElementById("guided-mood-wheel");
    const emotionTags = document.getElementById("guided-emotion-tags");
    if (moodWheel) {
      moodWheel.style.display = step === 2 ? "grid" : "none";
      if (emotionTags) emotionTags.style.display = step === 2 ? "flex" : "none";
      if (step === 2) {
        this.renderGuidedZones();
        this.renderGuidedEmotionTags();
      }
    }

    // 第 3 步显示当前分类标签
    const categoryTag = document.getElementById("guided-category-tag");
    if (categoryTag) {
      categoryTag.style.display = step === 3 ? "inline-flex" : "none";
      categoryTag.textContent = this.getCategoryLabel(this.guided.steps.category);
      categoryTag.className = `category-tag ${this.guided.steps.category || "aware"}`;
    }

    const prevBtn = document.getElementById("step-prev-btn");
    const nextBtn = document.getElementById("step-next-btn");
    if (prevBtn) prevBtn.style.display = step === 1 ? "none" : "";
    if (nextBtn) nextBtn.textContent = step === 4 ? "✅ 完成" : "下一步 →";
    this.saveGuidedDraft();
  },

  getGuidedStepName(step) {
    if (step === 3) {
      return this.guided.steps.category === "happy" ? "感受方式" : "防御方式";
    }
    return this.GUIDED_STEP_NAMES[step];
  },

  getGuidedStepQuestion(step) {
    if (step === 3) {
      return this.guided.steps.category === "happy"
        ? "试着描述这一刻：你看到了什么、听到了什么、闻到了什么？把它放慢，像重放一段短片，一点点讲出来。这份快乐/平静在身体里多待一会儿。"
        : this.GUIDED_QUESTIONS[3];
    }
    return this.GUIDED_QUESTIONS[step];
  },

  renderGuidedZones() {
    const zones = this.guided.steps.zones || [];
    document.querySelectorAll("#guided-mood-wheel .mood-zone").forEach((el) => {
      el.classList.toggle("selected", zones.includes(el.dataset.zone));
    });
  },

  renderGuidedEmotionTags() {
    const container = document.getElementById("guided-emotion-tags");
    if (!container) return;
    const selectedZones = this.guided.steps.zones || [];
    const selectedEmotions = this.guided.steps.emotions || [];

    if (selectedZones.length === 0) {
      container.innerHTML = "";
      return;
    }

    const emotions = selectedZones.flatMap((zone) => this.emotionZones[zone]?.emotions || []);
    const uniqueEmotions = [...new Set(emotions)];

    container.innerHTML = uniqueEmotions
      .map((e) => `<span class="emotion-tag ${selectedEmotions.includes(e) ? "selected" : ""}" data-emotion="${e}">${e}</span>`)
      .join("");
  },

  classifyZones(zones) {
    if (!zones || zones.length === 0) return "aware";
    return zones.every((zone) => this.HAPPY_ZONES.includes(zone)) ? "happy" : "aware";
  },

  getCategoryLabel(category) {
    return category === "happy" ? "✨ 快乐治愈小分队" : "🌧 情绪觉察";
  },

  guidedPrev() {
    if (this.guided.currentStep <= 1) return;
    // 保存当前步骤内容
    const key = Object.keys(this.guided.steps)[this.guided.currentStep - 1];
    const si = document.getElementById("step-input");
    if (si) this.guided.steps[key] = si.value;
    this.guided.currentStep--;
    this.renderGuidedStep();
  },

  guidedNext() {
    const key = Object.keys(this.guided.steps)[this.guided.currentStep - 1];
    const si2 = document.getElementById("step-input");
    const value = si2 ? si2.value.trim() : "";
    this.guided.steps[key] = value;

    // 第 2 步保存颜色区、情绪词并自动分类
    if (this.guided.currentStep === 2) {
      const selectedZones = Array.from(document.querySelectorAll("#guided-mood-wheel .mood-zone.selected"))
        .map((el) => el.dataset.zone);
      const selectedEmotions = Array.from(document.querySelectorAll("#guided-emotion-tags .emotion-tag.selected"))
        .map((el) => el.dataset.emotion);
      this.guided.steps.zones = selectedZones;
      this.guided.steps.emotions = selectedEmotions;
      this.guided.steps.category = this.classifyZones(selectedZones);
      if (selectedZones.length === 0) {
        this.showToast("未选颜色，已按情绪觉察流程继续");
      }
    }

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
    const gsc2 = document.getElementById("guided-step-card");
    if (gsc2) gsc2.style.display = "none";
    const summary = document.getElementById("guided-summary");
    if (summary) summary.style.display = "flex";

    // 构建汇总内容
    const defenseLabel = steps.category === "happy" ? "感受方式" : "防御方式";
    const labels = { event: "情绪事件", feeling: "身心感受", defense: defenseLabel, extend: "延展模型" };
    let html = "";
    for (const [key, label] of Object.entries(labels)) {
      html += `<span class="s-label">${label}</span><span class="s-text">${this.escapeHtml(steps[key])}</span>`;
    }
    // 已选情绪词
    const emotions = steps.emotions || [];
    if (emotions.length > 0) {
      html += `<span class="s-label">情绪词</span><span class="s-text">${this.escapeHtml(emotions.join("、"))}</span>`;
    }
    const summaryBody = document.getElementById("summary-body");
    if (summaryBody) summaryBody.innerHTML = html;

    // 汇总头部显示分类标签
    const summaryHeader = document.querySelector(".summary-header");
    if (summaryHeader) {
      summaryHeader.textContent = `✅ 觉察日记已完成 · ${this.getCategoryLabel(steps.category)}`;
    }

    // 生成标题
    const localTitle = this.generateDiaryTitle(steps);
    const titleInput = document.getElementById("summary-title");
    if (titleInput) titleInput.value = localTitle;

    if (!CONFIG.API_KEY) {
      this.showToast("未设置 API Key，已使用本地规则生成标题");
    } else {
      this.generateAITitle(steps).then((aiTitle) => {
        if (aiTitle && titleInput) titleInput.value = aiTitle;
      }).catch((err) => {
        console.error("AI 标题生成失败", err);
      });
    }

    // 本地检测强迫性重复
    const match = this.findSimilarPattern(steps);
    if (match) {
      const pa = document.getElementById("pattern-alert");
      if (pa) {
        pa.style.display = "block";
        pa.innerHTML =
          `🌱 小树注意到：你在 <strong>${match.date}</strong> 的日记里也有过类似的感觉——"${this.escapeHtml(match.snippet)}"。这可能是你的一个<strong>强迫性重复模式</strong>。<br><br><a onclick="App.viewDiary(${match.id})">📖 回顾那篇日记：《${this.escapeHtml(match.title)}》</a>`;
      }
    }

    // 检查 API Key
    if (!CONFIG.API_KEY) {
      const sfl = document.getElementById("summary-feedback-label");
      const sf = document.getElementById("summary-feedback");
      if (sfl) sfl.textContent = "🌱 缺少 API Key";
      if (sf) sf.innerHTML = "请先到「⚙️ 设置」填入你的 API Key，然后回来点「重新来过」重新提交。";
      return;
    }

    // 显示进度条
    const fbLabel = document.getElementById("summary-feedback-label");
    const fbBody = document.getElementById("summary-feedback");
    if (fbLabel) fbLabel.textContent = "🌱 小树正在感受你的日记...";
    if (fbBody) fbBody.innerHTML = `
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
        const fpFill = document.getElementById("fp-fill");
        const fpText = document.getElementById("fp-text");
        if (fpFill) fpFill.style.width = progress + "%";
        const messages = ["连接中...", "小树在读你的情绪事件...", "小树在体会你的感受...", "小树在看你的防御方式...", "小树在连接你的过去..."];
        const idx = Math.min(Math.floor(progress / 20), messages.length - 1);
        if (fpText) fpText.textContent = messages[idx];
        progressTimer = setTimeout(advanceProgress, 600 + Math.random() * 800);
      }
    };
    advanceProgress();

    // 调 AI 反馈
    try {
      const feedback = await this.callGuidedFeedback(steps);
      clearTimeout(progressTimer);
      const fpFill2 = document.getElementById("fp-fill");
      const fpText2 = document.getElementById("fp-text");
      if (fpFill2) fpFill2.style.width = "100%";
      if (fpText2) fpText2.textContent = "完成 ✓";
      setTimeout(() => {
        if (fbLabel) fbLabel.textContent = "🌱 小树回应";
        if (fbBody) fbBody.innerHTML = this.markdownToHtml(feedback);
      }, 400);
    } catch (err) {
      clearTimeout(progressTimer);
      console.error(err);
      if (fbLabel) fbLabel.textContent = "🌱 小树回应（获取失败）";
      if (fbBody) fbBody.innerHTML = `<div style="color:#c45c5c;padding:12px;">${this.escapeHtml(err.message)}<br><br>请检查：<br>1. ⚙️ 设置页 API Key 是否正确<br>2. 网络连接是否正常<br>3. API 额度是否用完<br><br>修复后点「重新来过」再试一次。</div>`;
    }
  },

  generateDiaryTitle(steps) {
    const today = new Date().toISOString().slice(0, 10).replace(/-/g, "");
    const event = steps.event || "";
    const feeling = steps.feeling || "";
    const isHappy = steps.category === "happy";

    // 从情绪事件中提取关键词（前2-6个字符）
    let eventKey = event.replace(/\s+/g, "").slice(0, 8);
    if (eventKey.length > 8) eventKey = eventKey.slice(0, 8);
    if (eventKey.length < 2) eventKey = isHappy ? "快乐" : "觉察";

    // 从身心感受中匹配主要情绪
    const happyEmotions = ["喜悦", "感动", "爱", "快乐", "感激", "期待", "自豪", "自信", "满意", "冷静"];
    const awareEmotions = [
      "愤怒", "委屈", "难过", "无力", "焦虑", "恐惧", "羞耻", "内疚", "孤独",
      "失望", "烦躁", "崩溃", "压抑", "悲伤", "痛苦", "自责", "自卑", "不安全感",
    ];
    const emotionMap = isHappy ? happyEmotions : awareEmotions;

    let emotion = "";
    for (const e of emotionMap) {
      if (feeling.includes(e)) { emotion = e; break; }
    }
    if (!emotion) emotion = isHappy ? "快乐瞬间" : "情绪波动";

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

    const prompt = `这是我的觉察日记。请用你（谢小树）的视角回应。

不用解释你在做什么——不用先说"我先白描你的感受"、再说"接下来是我直接的视角"这类过渡语。直接开始，你的感受、你的看见、你的命名，自然流出来就好。

可以尖锐，可以直接引用课程里的概念和金句。必须引用我日记里的具体文字，不要泛泛而谈。看到强迫性重复就直说，看到防御机制就命名它。

${today} 的记录：

【情绪事件】${steps.event}
【身心感受】${steps.feeling}
【${steps.category === "happy" ? "感受方式" : "防御方式"}】${steps.defense}
【延展模型】${steps.extend}
${historySummary}`;

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

  async saveGuidedDiary() {
    const steps = this.guided.steps;
    const titleInput2 = document.getElementById("summary-title");
    const title = titleInput2 ? titleInput2.value.trim() : "";
    // 从 innerHTML 里获取真实反馈（处理 markdown 渲染后的内容）
    const fbEl = document.getElementById("summary-feedback");
    const feedback = fbEl ? fbEl.innerText || fbEl.textContent : "";
    const content = `【情绪事件】\n${steps.event}\n\n【身心感受】\n${steps.feeling}\n\n【${steps.category === "happy" ? "感受方式" : "防御方式"}】\n${steps.defense}\n\n【延展模型】\n${steps.extend}`;

    let aiSummary = "";
    let people = [];
    if (steps.category === "happy") {
      try {
        this.showToast("✨ 正在为闪光瞬间生成温暖金句…");
        const excluded = this.getExcludedSparklePeople();
        [aiSummary, people] = await Promise.all([
          this.generateHappySummary(steps),
          this.extractHappyPeople(steps, excluded),
        ]);
      } catch (err) {
        console.error("生成闪光金句失败", err);
      }
    }

    const diary = {
      id: Date.now(),
      title: title || this.generateDiaryTitle(steps),
      date: new Date().toISOString().slice(0, 10),
      source: "guided",
      category: steps.category,
      steps: { ...steps },
      content,
      feedback,
      aiSummary,
      people,
      primaryEmotion: this.extractPrimaryEmotion(steps.feeling),
      createdAt: Date.now(),
    };

    this.diaries.unshift(diary);
    this.saveData();

    // 重置引导状态
    this.guided = { currentStep: 1, steps: { event: "", feeling: "", defense: "", extend: "", zones: [], emotions: [], category: null } };
    this.clearGuidedDraft();

    // 重新显示引导卡片，隐藏汇总
    const gsc3 = document.getElementById("guided-step-card");
    const gs2 = document.getElementById("guided-summary");
    if (gsc3) gsc3.style.display = "";
    if (gs2) gs2.style.display = "none";
    this.renderGuidedStep();
    this.renderDiaries();
    this.showToast("觉察日记已保存 ✨");
  },

  async generateHappySummary(steps) {
    const prompt = `请根据下面这篇快乐/治愈日记，写一句温暖、诗意、让人想停下来的金句。

要求：
- 1-2 句话，30-80 字。
- 不罗列事件，不分析情绪。
- 用第一人称「我」来写，就像日记主人自己在回忆、在感慨。
- 抓取一个具体细节放大（一个动作、一句话、一个场景）。
- 语气温暖、轻、有停顿感，像随手翻开一张鼓励卡。

错误示例（不要这样写）：
- "你托腮望月，风拂过你的发梢" → 第二人称，不对
- "那天你骑车经过江边" → 第二人称，不对

正确示例：
- "我托腮望月，风拂过发梢"
- "我骑车经过江边，江水在身后，清风在耳边"

【情绪事件】${steps.event || ""}
【身心感受】${steps.feeling || ""}
【感受方式】${steps.defense || ""}
【延展模型】${steps.extend || ""}
【情绪词】${(steps.emotions || []).join("、")}

只输出金句，不要任何解释。`;

    const response = await fetch(CONFIG.BASE_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json; charset=utf-8", "Authorization": `Bearer ${CONFIG.API_KEY}` },
      body: JSON.stringify({
        model: CONFIG.MODEL,
        messages: [
          { role: "system", content: "你是一个擅长写温暖短句的助手。" },
          { role: "user", content: prompt },
        ],
        temperature: 0.8,
        max_tokens: 200,
      }),
    });
    if (!response.ok) { const err = await response.text(); throw new Error(`API 错误 (${response.status}): ${err}`); }
    const data = await response.json();
    return data.choices[0].message.content.trim();
  },

  async extractHappyPeople(steps, excludedNames = []) {
    const exclusionHint = excludedNames.length > 0
      ? `\n7. 不要提取以下用户已删除/合并的人物：${excludedNames.join("、")}。如果文中只有这些名字，输出空数组 []。`
      : "";

    const prompt = `请从下面这篇快乐/治愈日记中，提取所有出现的人物。

要求：
1. 只输出人名、称呼或亲属称谓，包括但不限于：妈妈、爸爸、老公、老婆、男朋友、女朋友、他、她、孩子、朋友、同事、闺蜜、兄弟、希里、狸克、至夏、陈前、寒冰、十月 等。
2. 特别注意中文语境中的亲属称呼（妈妈、爸爸、哥哥、姐姐、弟弟、妹妹、舅舅、舅妈、叔叔、阿姨、姑妈、伯父等）。
3. 特别注意文中直接提到的朋友名字或昵称。
4. 如果文中明确出现了人物，哪怕只提了一次，也要提取。
5. 如果文中没有提到任何人，输出空数组 []。
6. 只输出 JSON 数组，不要任何解释。${exclusionHint}

【情绪事件】${steps.event || ""}
【身心感受】${steps.feeling || ""}
【感受方式】${steps.defense || ""}
【延展模型】${steps.extend || ""}

输出格式示例：["妈妈", "爸爸", "陈前"] 或 ["希里", "狸克"] 或 []`;

    const response = await fetch(CONFIG.BASE_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json; charset=utf-8", "Authorization": `Bearer ${CONFIG.API_KEY}` },
      body: JSON.stringify({
        model: CONFIG.MODEL,
        messages: [
          { role: "system", content: "你是一个只输出 JSON 数组的助手。" },
          { role: "user", content: prompt },
        ],
        temperature: 0.3,
        max_tokens: 100,
      }),
    });
    if (!response.ok) { const err = await response.text(); throw new Error(`API 错误 (${response.status}): ${err}`); }
    const data = await response.json();
    let result = data.choices[0].message.content.trim();
    result = result.replace(/^```json\s*|\s*```$/g, "").trim();
    try {
      const parsed = JSON.parse(result);
      return Array.isArray(parsed) ? parsed : [];
    } catch (e) {
      return [];
    }
  },

  // ========== 反向选择 ==========
  reverseStep: { current: 1, total: 4, steps: { trigger: "", triggerIntensity: 5, oldProgram: "", newChoice: "", result: "", resultIntensity: 5 } },

  renderReverseStep() {
    const step = this.reverseStep.current;
    const rsn = document.getElementById("reverse-step-num");
    const rsn2 = document.getElementById("reverse-step-name");
    const rsh = document.getElementById("reverse-step-hint");
    if (rsn) rsn.textContent = step;
    if (rsn2) rsn2.textContent = ["触发", "旧程序", "反向选择", "结果"][step - 1];
    if (rsh) rsh.textContent = [
      "发生了什么？客观描述，一句话。",
      "那个瞬间，旧程序在你脑子里说了什么？",
      "你做了什么不一样的事？",
      "对方什么反应？你什么感受？和以前哪里不同？",
    ][step - 1];

    for (let i = 1; i <= 4; i++) {
      const el = document.getElementById(`reverse-step-${i}`);
      if (el) el.style.display = i === step ? "block" : "none";
    }

    const rpb = document.getElementById("reverse-prev-btn");
    const rnb = document.getElementById("reverse-next-btn");
    if (rpb) rpb.style.display = step === 1 ? "none" : "";
    if (rnb) rnb.textContent = step === 4 ? "✅ 完成" : "下一步 →";
  },

  reversePrev() {
    if (this.reverseStep.current <= 1) return;
    this.reverseStep.current--;
    this.renderReverseStep();
  },

  reverseNext() {
    const step = this.reverseStep.current;
    if (step === 1) {
      const rt = document.getElementById("reverse-trigger");
      const rib = document.getElementById("reverse-intensity-before");
      if (rt) this.reverseStep.steps.trigger = rt.value.trim();
      if (rib) this.reverseStep.steps.triggerIntensity = parseInt(rib.value);
    } else if (step === 2) {
      const ro = document.getElementById("reverse-old");
      if (ro) this.reverseStep.steps.oldProgram = ro.value.trim();
    } else if (step === 3) {
      const rn = document.getElementById("reverse-new");
      if (rn) this.reverseStep.steps.newChoice = rn.value.trim();
    }

    if (step < 4) {
      this.reverseStep.current++;
      this.renderReverseStep();
    } else {
      // 第4步保存数据
      const rr = document.getElementById("reverse-result");
      const ria = document.getElementById("reverse-intensity-after");
      if (rr) this.reverseStep.steps.result = rr.value.trim();
      if (ria) this.reverseStep.steps.resultIntensity = parseInt(ria.value);
      this.showReverseSummary();
    }
  },

  async showReverseSummary() {
    const s = this.reverseStep.steps;
    const rsc = document.getElementById("reverse-step-card");
    const rs = document.getElementById("reverse-summary");
    if (rsc) rsc.style.display = "none";
    if (rs) rs.style.display = "flex";

    let html = "";
    html += `<span class="s-label">触发</span><span class="s-text">${this.escapeHtml(s.trigger)} · 情绪 ${s.triggerIntensity}/10</span>`;
    html += `<span class="s-label">旧程序</span><span class="s-text">${this.escapeHtml(s.oldProgram || "未记录")}</span>`;
    html += `<span class="s-label">反向选择</span><span class="s-text">${this.escapeHtml(s.newChoice)}</span>`;
    html += `<span class="s-label">结果</span><span class="s-text">${this.escapeHtml(s.result || "未记录")} · 现在情绪 ${s.resultIntensity}/10</span>`;
    const rsb = document.getElementById("reverse-summary-body");
    if (rsb) rsb.innerHTML = html;

    if (!CONFIG.API_KEY) {
      const rfl = document.getElementById("reverse-feedback-label");
      const rf = document.getElementById("reverse-feedback");
      if (rfl) rfl.textContent = "🌱 缺少 API Key";
      if (rf) rf.innerHTML = "请先到「⚙️ 设置」填入 API Key。";
      return;
    }

    const rfl2 = document.getElementById("reverse-feedback-label");
    const rf2 = document.getElementById("reverse-feedback");
    if (rfl2) rfl2.textContent = "🌱 小树正在见证...";
    if (rf2) rf2.innerHTML = "";

    try {
      const feedback = await this.callReverseFeedback({
        trigger: s.trigger, oldProgram: s.oldProgram, newChoice: s.newChoice,
        result: s.result, intensityBefore: s.triggerIntensity, intensityAfter: s.resultIntensity,
      });
      const rfl3 = document.getElementById("reverse-feedback-label");
      const rf3 = document.getElementById("reverse-feedback");
      if (rfl3) rfl3.textContent = "🌱 小树见证";
      if (rf3) rf3.innerHTML = this.markdownToHtml(feedback);
      this.reverseStep._feedback = feedback;
    } catch (err) {
      console.error(err);
      const rfl4 = document.getElementById("reverse-feedback-label");
      const rf4 = document.getElementById("reverse-feedback");
      if (rfl4) rfl4.textContent = "🌱 小树见证（获取失败）";
      if (rf4) rf4.innerHTML = `<div style="color:#c45c5c;padding:12px;">${this.escapeHtml(err.message)}</div>`;
    }
  },

  saveReverseRecord() {
    const s = this.reverseStep.steps;

    const record = {
      id: Date.now(),
      trigger: s.trigger,
      oldProgram: s.oldProgram,
      newChoice: s.newChoice,
      result: s.result,
      intensityBefore: s.triggerIntensity,
      intensityAfter: s.resultIntensity,
      feedback: this.reverseStep._feedback || "",
      createdAt: Date.now(),
    };

    this.freeDiaries.unshift(record);
    this.saveData();

    // 重置
    this.reverseStep = { current: 1, total: 4, steps: { trigger: "", triggerIntensity: 5, oldProgram: "", newChoice: "", result: "", resultIntensity: 5 } };
    this.reverseStep._feedback = "";
    const rsc2 = document.getElementById("reverse-step-card");
    const rs2 = document.getElementById("reverse-summary");
    if (rsc2) rsc2.style.display = "";
    if (rs2) rs2.style.display = "none";
    const rt = document.getElementById("reverse-trigger");
    const ro = document.getElementById("reverse-old");
    const rn = document.getElementById("reverse-new");
    const rr = document.getElementById("reverse-result");
    const rib = document.getElementById("reverse-intensity-before");
    const ria = document.getElementById("reverse-intensity-after");
    const ibv = document.getElementById("intensity-before-val");
    const iav = document.getElementById("intensity-after-val");
    if (rt) rt.value = "";
    if (ro) ro.value = "";
    if (rn) rn.value = "";
    if (rr) rr.value = "";
    if (rib) rib.value = "5";
    if (ria) ria.value = "5";
    if (ibv) ibv.textContent = "5";
    if (iav) iav.textContent = "5";
    this.renderReverseStep();
    this.renderFreeDiaries();
    this.showToast("反向选择已保存 🔄");
  },

  async callReverseFeedback(record) {
    const prompt = `这是我的内化体验记录。在我用新程序处理事情的时候，请用小树的视角做见证。

不用解释你在做什么，直接开始。在我写的具体细节里，帮我轻轻地聚焦——"你做到的，具体是这个。"就像帮我把这个证据捡起来，放在手里。

你可以叫我至春。

【触发】${record.trigger}
【旧程序会说】${record.oldProgram}
【我选择了反向】${record.newChoice}
【结果】${record.result}
【情绪变化】${record.intensityBefore} → ${record.intensityAfter}`;

    const response = await fetch(CONFIG.BASE_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json; charset=utf-8", "Authorization": `Bearer ${CONFIG.API_KEY}` },
      body: JSON.stringify({
        model: CONFIG.MODEL,
        messages: [
          { role: "system", content: typeof XIAOSHU_PROMPT !== "undefined" ? XIAOSHU_PROMPT : "你是一个温暖的心理洞察助手。" },
          { role: "user", content: prompt },
        ],
        temperature: 0.8,
        max_tokens: 2000,
      }),
    });
    if (!response.ok) { const err = await response.text(); throw new Error(`API 错误 (${response.status}): ${err}`); }
    const data = await response.json();
    return data.choices[0].message.content;
  },

  renderFreeDiaries() {
    const list = document.getElementById("free-diary-list");
    const countEl = document.getElementById("free-diary-count");
    const reverseCount = document.getElementById("reverse-count");
    const reverseSparkle = document.getElementById("reverse-sparkle");
    if (!list) return;
    const total = this.freeDiaries.length;
    if (countEl) countEl.textContent = `共 ${total} 条`;
    if (reverseCount) reverseCount.innerHTML = `至春已经选择了 <strong>${total}</strong> 次反向`;

    // 随机回顾区域
    if (reverseSparkle) {
      reverseSparkle.style.display = total > 0 ? "block" : "none";
      if (total > 0) this.renderReverseSparkle();
    }

    if (total === 0) {
      list.innerHTML = '<div class="empty">还没有反向选择记录<br>下一次旧程序说跑的时候，站住，然后回来记下。</div>';
      return;
    }

    list.innerHTML = "";
    this.freeDiaries.forEach((d) => {
      const card = document.createElement("div");
      card.className = "diary-card";
      card.dataset.id = String(d.id);

      const title = `${new Date(d.createdAt).toLocaleDateString("zh-CN")} · ${d.trigger.slice(0, 20)}`;

      card.innerHTML = `
        <div class="diary-header">
          <div class="diary-header-main">
            <h4>${this.escapeHtml(title)}</h4>
            <span class="diary-date">${new Date(d.createdAt).toLocaleString("zh-CN")}</span>
          </div>
          <span class="expand-icon">▶</span>
        </div>
        <div class="diary-body">
          <div class="reverse-mini">
            <div><span class="s-label">触发</span> ${this.escapeHtml(d.trigger)}</div>
            <div><span class="s-label">旧程序</span> ${this.escapeHtml(d.oldProgram || "未记录")}</div>
            <div><span class="s-label">反向选择</span> ${this.escapeHtml(d.newChoice)}</div>
            <div><span class="s-label">结果</span> ${this.escapeHtml(d.result || "未记录")}</div>
            <div><span class="s-label">情绪</span> ${d.intensityBefore || "-"} → ${d.intensityAfter || "-"}</div>
          </div>
          ${d.feedback ? `<div class="diary-feedback"><div class="feedback-label">🌱 小树见证</div><div class="feedback-body">${this.markdownToHtml(d.feedback)}</div></div>` : ""}
          <div class="diary-card-actions">
            <button class="btn-text" onclick="App.exportFreeDiary(${d.id})">📤 导出</button>
            <button class="btn-text danger" onclick="App.deleteFreeDiary(${d.id})">删除</button>
          </div>
        </div>
      `;

      const header = card.querySelector(".diary-header");
      header.addEventListener("click", () => { card.classList.toggle("expanded"); });
      list.appendChild(card);
    });
  },

  renderReverseSparkle() {
    const total = this.freeDiaries.length;
    if (total === 0) return;
    // 洗牌
    if (this.reverseQueue.length === 0 || this.reverseQueueIndex >= this.reverseQueue.length) {
      this.reverseQueue = this.shuffleArray(this.freeDiaries.map(d => d.id));
      this.reverseQueueIndex = 0;
    }
    const id = this.reverseQueue[this.reverseQueueIndex];
    this.reverseQueueIndex++;
    const d = this.freeDiaries.find(r => r.id === id) || this.freeDiaries[0];
    if (!d) return;

    const dateStr = new Date(d.createdAt).toLocaleDateString("zh-CN");
    const rsd = document.getElementById("reverse-sparkle-date");
    const rsq = document.getElementById("reverse-sparkle-quote");
    const detail = document.getElementById("reverse-sparkle-detail");
    if (rsd) rsd.textContent = dateStr;
    if (rsq) rsq.textContent = d.newChoice;
    if (detail) detail.innerHTML = `
      <div class="rs-line"><span>触发：</span>${this.escapeHtml(d.trigger)}</div>
      <div class="rs-line"><span>旧程序：</span>${this.escapeHtml(d.oldProgram || "—")}</div>
      <div class="rs-line"><span>结果：</span>${this.escapeHtml(d.result || "—")}</div>
      <div class="rs-line"><span>情绪：</span>${d.intensityBefore || "-"} → ${d.intensityAfter || "-"}</div>
    `;
  },

  deleteFreeDiary(id) {
    if (!confirm("确定删除这条反向选择记录吗？")) return;
    this.freeDiaries = this.freeDiaries.filter((d) => d.id !== id);
    this.saveData();
    this.renderFreeDiaries();
    this.showToast("反向选择记录已删除");
  },

  exportFreeDiary(id) {
    const d = this.freeDiaries.find(r => r.id === id);
    if (!d) return;
    const dateStr = new Date(d.createdAt).toLocaleDateString("zh-CN").replace(/[/:]/g, "-");
    const filename = `反向选择_${dateStr}.txt`;
    let text = `反向选择 · ${new Date(d.createdAt).toLocaleString("zh-CN")}\n\n`;
    text += `触发：${d.trigger}\n`;
    text += `旧程序会说：${d.oldProgram || "未记录"}\n`;
    text += `我选择了反向：${d.newChoice}\n`;
    text += `结果：${d.result || "未记录"}\n`;
    text += `情绪：${d.intensityBefore || "-"} → ${d.intensityAfter || "-"}\n\n`;
    text += `【🌱 小树见证】\n${d.feedback}\n`;
    this.downloadFile(filename, text);
  },

  exportAllFreeDiaries() {
    if (this.freeDiaries.length === 0) { this.showToast("没有反向选择记录可导出"); return; }
    for (const d of this.freeDiaries) {
      this.exportFreeDiary(d.id);
    }
    this.showToast(`已导出 ${this.freeDiaries.length} 条反向选择记录`);
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

  // ========== 日日记录 ==========
  openMyDiaryWithZone(zone) {
    // 切换到日记 Tab 和日日记录模式
    this.switchTab("diary");
    document.querySelectorAll(".diary-mode-btn").forEach(b => b.classList.remove("active"));
    const myBtn = document.querySelector('.diary-mode-btn[data-mode="my"]');
    if (myBtn) myBtn.classList.add("active");
    document.querySelectorAll(".diary-mode-content").forEach(c => c.classList.remove("active"));
    const md = document.getElementById("my-diary");
    if (md) md.classList.add("active");
    this.resetMoodStep();
    if (zone) this.toggleMyDiaryZone(zone);
  },

  resetMoodStep() {
    this.moodStep.current = 1;
    if (this.moodStep.landingTimer) {
      clearInterval(this.moodStep.landingTimer);
      this.moodStep.landingTimer = null;
    }
    this.moodStep.landingSeconds = 20;
    this.myDiaryZones = [];
    this.myDiaryEmotions = [];
    this.renderMoodStep();
  },

  toggleMyDiaryZone(zone) {
    const idx = this.myDiaryZones.indexOf(zone);
    if (idx >= 0) {
      this.myDiaryZones.splice(idx, 1);
    } else {
      this.myDiaryZones.push(zone);
    }
    document.querySelectorAll("#my-diary-mood-wheel .mood-zone").forEach(el => {
      el.classList.toggle("selected", this.myDiaryZones.includes(el.dataset.zone));
    });
    this.renderMyDiaryEmotionTags();
  },

  renderMyDiaryEmotionTags() {
    const container = document.getElementById("my-diary-emotion-tags");
    if (!container) return;
    if (this.myDiaryZones.length === 0) {
      container.innerHTML = "";
      return;
    }
    const emotions = this.myDiaryZones.flatMap(z => this.emotionZones[z]?.emotions || []);
    const uniqueEmotions = [...new Set(emotions)];
    container.innerHTML = uniqueEmotions.map(e =>
      `<span class="emotion-tag ${this.myDiaryEmotions.includes(e) ? 'selected' : ''}" data-emotion="${e}">${e}</span>`
    ).join("");
  },

  renderMoodStep() {
    const badge = document.getElementById("mood-step-badge");
    const nameEl = document.getElementById("mood-step-name");
    const steps = ["感受今天一天的情绪", "聊聊今天的日子", "落地"];
    const stepNames = ["感受今天一天的情绪", "聊聊今天的日子", "落地"];
    if (badge) badge.textContent = `第 ${this.moodStep.current} / ${this.moodStep.total} 步`;
    if (nameEl) nameEl.textContent = stepNames[this.moodStep.current - 1] || "";

    document.querySelectorAll("#my-diary .mood-step").forEach(el => {
      el.classList.toggle("active", parseInt(el.dataset.step) === this.moodStep.current);
    });

    const prevBtn = document.getElementById("mood-prev-btn");
    const nextBtn = document.getElementById("mood-next-btn");
    if (prevBtn) prevBtn.style.visibility = this.moodStep.current === 1 ? "hidden" : "visible";
    if (nextBtn) {
      nextBtn.textContent = this.moodStep.current === 2 ? "保存并进入落地" : this.moodStep.current === this.moodStep.total ? "进入冥想" : "下一步 →";
      nextBtn.disabled = false;
    }

    if (this.moodStep.current === 3) {
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
        if (seconds <= 5) hintEl.textContent = "准备好后，进入冥想催眠";
      }
      if (seconds <= 0) {
        this.stopLandingTimer();
        if (nextBtn) nextBtn.disabled = false;
        if (hintEl) hintEl.textContent = "准备好了，点击进入冥想";
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
    if (this.moodStep.current === 2) {
      // 第2步 → 保存数据并进入第3步（落地）
      this.saveMyDiary();
      this.moodStep.current++;
      this.renderMoodStep();
    } else if (this.moodStep.current < this.moodStep.total) {
      this.moodStep.current++;
      this.renderMoodStep();
    } else {
      // 第3步 → 进入冥想（数据已在第2步保存）
      this.startRelaxFlow();
    }
  },

  prevMoodStep() {
    if (this.moodStep.current > 1) {
      this.moodStep.current--;
      this.renderMoodStep();
    }
  },

  saveMyDiary() {
    const emotionInput = document.getElementById("my-emotion");
    const todayInput = document.getElementById("my-today");
    const emotion = (emotionInput?.value || "").trim();
    const today = (todayInput?.value || "").trim();

    const zones = this.myDiaryZones.length > 0 ? [...this.myDiaryZones] : [];
    const emotions = this.myDiaryEmotions.length > 0 ? [...this.myDiaryEmotions] : [];
    // 手动输入的情绪也加入
    if (emotion && !emotions.includes(emotion)) emotions.push(emotion);

    if (emotions.length === 0 && !today) {
      this.showToast("请至少选择一个情绪或写点今天的日子");
      return;
    }

    const date = new Date().toISOString().slice(0, 10);
    const zoneNames = zones.length > 0 ? zones.map(z => this.emotionZones[z].name).join("、") : "未选择";
    const emotionStr = emotions.join("、") || "未记录";
    const title = `${date}-${emotionStr}-${zoneNames}`;
    const content = `情绪颜色区：${zoneNames}\n今天最强烈的情绪：${emotionStr}\n\n聊聊今天的日子：${today || "未记录"}`;

    const diary = {
      id: Date.now(),
      title,
      date,
      source: "my",
      colorZones: zones,
      colorZoneNames: zoneNames,
      emotions: emotions,
      today,
      content,
      feedback: "",
      createdAt: Date.now(),
    };

    this.moodDiaries.unshift(diary);
    this.saveData();

    // 清空输入
    if (emotionInput) emotionInput.value = "";
    if (todayInput) todayInput.value = "";
    this.myDiaryZones = [];
    this.myDiaryEmotions = [];
    document.querySelectorAll("#my-diary-mood-wheel .mood-zone").forEach(el => el.classList.remove("selected"));
    const mdEt = document.getElementById("my-diary-emotion-tags");
    if (mdEt) mdEt.innerHTML = "";

    this.renderMoodDiaries();
    this.showToast("日日记录已保存，进入落地呼吸 🌙");
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

    if (overlay) overlay.style.display = "flex";
    if (calmSection) calmSection.style.display = "block";
    if (audioSection) audioSection.style.display = "none";
    if (audioFallback) audioFallback.style.display = "none";

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
        if (calmSection) calmSection.style.display = "none";
        if (audioSection) audioSection.style.display = "block";
        this.playHypnosisAudio();
      }
    }, 1000);

    this._relaxTimer = timer;
  },

  closeRelaxOverlay() {
    const overlay = document.getElementById("relax-overlay");
    if (overlay) overlay.style.display = "none";
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

  renderDiaries() {
    // 只显示觉察日记（来源为 guided 且非 happy），不显示导入的快乐治愈小分队
    const guidedDiaries = this.diaries.filter((d) => d.source === "guided" && (d.category || d.steps?.category) !== "happy");
    const list = document.getElementById("guided-diary-list");
    const countEl = document.getElementById("guided-diary-count");
    if (!list) return;
    if (countEl) countEl.textContent = `共 ${guidedDiaries.length} 篇`;

    if (guidedDiaries.length === 0) {
      list.innerHTML = '<div class="empty">还没有觉察日记，开始你的第一篇吧 ✍️</div>';
      return;
    }

    list.innerHTML = "";
    guidedDiaries.forEach((d) => {
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
      list.innerHTML = '<div class="empty">还没有日日记录，完成一次睡前安放吧 🌙</div>';
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
            <div><span class="s-label">颜色区</span> ${this.escapeHtml(d.colorZoneNames || "未选择")}</div>
            <div><span class="s-label">情绪</span> ${this.escapeHtml((d.emotions && d.emotions.length > 0) ? d.emotions.join("、") : (d.emotion || "未记录"))}</div>
            <div><span class="s-label">今天的日子</span> ${this.escapeHtml(d.today || d.action || "未记录")}</div>
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
    const filename = (d.title || "日日记录").replace(/[\\/:*?"<>|]/g, "_") + ".txt";
    let text = `标题：${d.title}\n日期：${d.date}\n类型：日日记录\n\n`;
    text += `颜色区：${d.colorZoneNames || "未选择"}\n情绪：${(d.emotions && d.emotions.length > 0) ? d.emotions.join("、") : (d.emotion || "未记录")}\n\n`;
    text += `聊聊今天的日子：\n${d.today || d.action || "未记录"}\n`;
    this.downloadFile(filename, text);
  },

  exportAllMoodDiaries() {
    if (this.moodDiaries.length === 0) { this.showToast("没有日日记录可导出"); return; }
    for (const d of this.moodDiaries) {
      this.exportMoodDiary(d.id);
    }
    this.showToast(`已导出 ${this.moodDiaries.length} 篇日日记录`);
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

    // 二、觉察此刻
    lines.push("## 二、觉察此刻");
    const guided = this.diaries.filter(d => d.source === "guided" && (d.category || d.steps?.category) !== "happy" && d.createdAt >= weekStart);
    if (guided.length === 0) {
      lines.push("（本周暂无觉察此刻）");
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

    // 三、反向选择
    lines.push("## 三、反向选择");
    const reverse = this.freeDiaries.filter(d => d.createdAt >= weekStart);
    if (reverse.length === 0) {
      lines.push("（本周暂无反向选择）");
    } else {
      reverse.forEach((d) => {
        lines.push(`${new Date(d.createdAt).toLocaleString("zh-CN")} · ${d.trigger.slice(0, 30)}`);
        lines.push(`旧程序：${d.oldProgram || "未记录"}`);
        lines.push(`反向选择：${d.newChoice}`);
        lines.push(`结果：${d.result || "未记录"}`);
        lines.push(`情绪：${d.intensityBefore || "-"} → ${d.intensityAfter || "-"}`);
        lines.push("");
      });
    }
    lines.push("");

    // 四、日日记录
    lines.push("## 四、日日记录");
    const moods = this.moodDiaries.filter(d => d.source === "my" && d.createdAt >= weekStart);
    if (moods.length === 0) {
      lines.push("（本周暂无日日记录）");
    } else {
      moods.forEach((d) => {
        lines.push(`《${d.title}》 ${new Date(d.createdAt).toLocaleString("zh-CN")}`);
        lines.push(`颜色区：${d.colorZoneNames || "未选择"}`);
        lines.push(`情绪：${(d.emotions && d.emotions.length > 0) ? d.emotions.join("、") : (d.emotion || "未记录")}`);
        lines.push(`今天的日子：${d.today || d.action || "未记录"}`);
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
    // 六、快乐治愈小分队
    lines.push("## 六、快乐治愈小分队");
    const happyDiaries = this.diaries.filter(d => (d.category || d.steps?.category) === "happy" && d.createdAt >= weekStart);
    if (happyDiaries.length === 0) {
      lines.push("（本周暂无快乐治愈小分队）");
    } else {
      happyDiaries.forEach((d) => {
        lines.push(`《${d.title}》 ${new Date(d.createdAt).toLocaleString("zh-CN")}`);
        if (d.aiSummary) {
          lines.push(`✨ ${d.aiSummary}`);
        }
        if (d.people && d.people.length > 0) {
          lines.push(`👥 一起的人：${d.people.join("、")}`);
        }
        if (d.steps) {
          const ems = d.steps.emotions || [];
          if (ems.length > 0) lines.push(`情绪词：${ems.join("、")}`);
        }
        lines.push("");
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
    if (!confirm("确定删除这条日日记录吗？")) return;
    this.moodDiaries = this.moodDiaries.filter((d) => d.id !== id);
    this.saveData();
    this.renderMoodDiaries();
    this.showToast("日日记录已删除");
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
    const apiKeyInput = document.getElementById("setting-api-key");
    const modelInput = document.getElementById("setting-model");
    const baseUrlInput = document.getElementById("setting-base-url");
    const apiKey = apiKeyInput ? apiKeyInput.value.trim() : "";
    let model = modelInput ? modelInput.value.trim() : "";
    const baseUrl = baseUrlInput ? baseUrlInput.value.trim() : "";

    // 防手机自动填充：检测模型框是否被填入了 API Key
    if (model.startsWith("sk-") || model.length > 40) {
      console.warn("检测到模型框被异常填充，已自动纠正");
      model = "deepseek-v4-flash"; // deepseek-chat 已废弃，等价于 v4-flash 非思考模式
      if (modelInput) modelInput.value = model;
    }

    // 防手机自动填充：检测 API 地址框是否被异常填充
    let cleanBaseUrl = baseUrl;
    if (baseUrl.startsWith("sk-") || baseUrl.length > 80) {
      console.warn("检测到 API 地址框被异常填充，已自动纠正");
      cleanBaseUrl = "https://api.deepseek.com/v1/chat/completions";
      if (baseUrlInput) baseUrlInput.value = cleanBaseUrl;
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
    const pfc = document.getElementById("person-form-cancel");
    const pfs = document.getElementById("person-form-save");
    if (pfc) pfc.addEventListener("click", () => overlay.remove());
    if (pfs) pfs.addEventListener("click", () => {
      const nameInput = document.getElementById("person-form-name");
      const relationInput = document.getElementById("person-form-relation");
      const impressionInput = document.getElementById("person-form-impression");
      const name = nameInput ? nameInput.value.trim() : "";
      const relation = relationInput ? relationInput.value : "其他";
      const impression = impressionInput ? impressionInput.value.trim() : "";
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
    const plv = document.getElementById("people-list-view");
    const pdv = document.getElementById("person-detail-view");
    if (plv) plv.style.display = "none";
    if (pdv) pdv.style.display = "";
    this.renderPersonDetail();

    // 过度分析检测
    if (this.people.length >= 4) {
      const oaw = document.getElementById("over-analyze-warning");
      if (oaw) {
        oaw.style.display = "block";
        oaw.innerHTML =
          "🌱 小树轻轻问：你在观察这么多人的时候，有没有可能想通过分析别人，来转移对自我的觉察？也许可以去觉察日记那边写一篇。分析功能依然能用。";
      }
    }
  },

  closePerson() {
    this.currentPersonId = null;
    const plv = document.getElementById("people-list-view");
    const pdv = document.getElementById("person-detail-view");
    if (plv) plv.style.display = "";
    if (pdv) pdv.style.display = "none";
  },

  getCurrentPerson() {
    return this.people.find(p => p.id === this.currentPersonId);
  },

  renderPersonDetail() {
    const p = this.getCurrentPerson();
    if (!p) return;

    // 角色信息
    const title = this.getPersonTitle(p);
    const pic = document.getElementById("person-info-card");
    if (pic) pic.innerHTML = `
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
    const dpb = document.getElementById("delete-person-btn");
    if (dpb) dpb.addEventListener("click", () => {
      if (!confirm(`确定删除「${p.name}」及其所有记录吗？`)) return;
      this.people = this.people.filter(pp => pp.id !== p.id);
      this.saveData();
      this.closePerson();
      this.renderPeopleList();
      this.showToast("角色已删除");
    });

    // 观察记录
    const ocEl = document.getElementById("obs-count");
    if (ocEl) ocEl.textContent = `(${p.observations.length} 条)`;
    this.renderObsList();

    // 上次分析
    if (p.analyses.length > 0) {
      const pac = document.getElementById("person-analysis-card");
      if (pac) pac.style.display = "";
      const last = p.analyses[p.analyses.length - 1];
      const ab = document.getElementById("analysis-body");
      const ah = document.getElementById("analysis-honesty");
      const ad = document.getElementById("analysis-date");
      if (ab) ab.innerHTML = this.markdownToHtml(last.content);
      if (ah) ah.innerHTML = `<div class="honesty-title">⚠️ 诚实边界</div>` + this.HONESTY_BOUNDARY.map(item => `<p class="honesty-item">• ${this.escapeHtml(item)}</p>`).join("");
      if (ad) ad.textContent = "分析时间：" + new Date(last.createdAt).toLocaleString("zh-CN");
    } else {
      const pac = document.getElementById("person-analysis-card");
      if (pac) pac.style.display = "none";
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
        const ocEl2 = document.getElementById("obs-count");
        if (ocEl2) ocEl2.textContent = `(${p.observations.length} 条)`;
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

    const analyzeBtn = document.getElementById("analyze-person-btn");
    if (analyzeBtn) {
      analyzeBtn.disabled = true;
      analyzeBtn.textContent = "分析中...";
    }

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
      const analyzeBtn2 = document.getElementById("analyze-person-btn");
      if (analyzeBtn2) {
        analyzeBtn2.disabled = false;
        analyzeBtn2.textContent = "🌱 小树分析此角色";
      }
    }
  },

  // ========== Tab 导航 ==========
  switchTab(tab) {
    this.activeTab = tab;
    document.querySelectorAll(".tab-content").forEach((el) => {
      el.classList.remove("active");
    });
    const tabEl = document.getElementById(`tab-${tab}`);
    if (tabEl) tabEl.classList.add("active");
    document.querySelectorAll(".tab-btn").forEach((el) => {
      el.classList.remove("active");
    });
    const navEl = document.getElementById(`nav-${tab}`);
    if (navEl) navEl.classList.add("active");

    // 切换到日记页时加载草稿并刷新列表
    if (tab === "diary") {
      this.loadGuidedDraft();
      this.renderGuidedStep();
      this.renderDiaries();
      this.renderMoodDiaries();
      this.renderFreeDiaries();
      this.renderReverseStep();
    }
    // 切换到识人页时渲染角色列表
    if (tab === "people") {
      this.renderPeopleList();
    }
    // 切换到闪光页时渲染随机卡片
    if (tab === "sparkle") {
      this.ensureSparkleQueue();
      this.renderSparkleCard();
    }
  },

  renderTabs() {
    this.switchTab(this.activeTab);
  },

  // ========== 闪光页：快乐治愈小分队随机回顾 ==========
  getHappyDiaries() {
    return this.diaries.filter((d) => (d.category || d.steps?.category) === "happy");
  },

  // 用户主动删除/合并过的人物标签，后续 AI 不再提取
  getExcludedSparklePeople() {
    try {
      return JSON.parse(localStorage.getItem("xs_sparkle_excluded_people") || "[]");
    } catch (e) {
      return [];
    }
  },
  addExcludedSparklePerson(name) {
    if (!name) return;
    const excluded = this.getExcludedSparklePeople();
    if (!excluded.includes(name)) {
      excluded.push(name);
      localStorage.setItem("xs_sparkle_excluded_people", JSON.stringify(excluded));
    }
  },
  clearExcludedSparklePeople() {
    localStorage.removeItem("xs_sparkle_excluded_people");
  },

  // Fisher-Yates 洗牌
  shuffleArray(arr) {
    const a = [...arr];
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  },

  // 确保洗牌队列就绪
  ensureReverseQueue() {
    const total = this.freeDiaries.length;
    if (total === 0) { this.reverseQueue = []; this.reverseQueueIndex = 0; return; }
    if (this.reverseQueue.length === 0 || this.reverseQueueIndex >= this.reverseQueue.length) {
      this.reverseQueue = this.shuffleArray(this.freeDiaries.map(d => d.id));
      this.reverseQueueIndex = 0;
    }
  },

  ensureSparkleQueue() {
    const happyDiaries = this.getHappyDiaries();
    if (happyDiaries.length === 0) {
      this.sparkleQueue = [];
      this.sparkleQueueIndex = 0;
      return;
    }
    // 队列为空或者走完了就重新洗牌
    if (this.sparkleQueue.length === 0 || this.sparkleQueueIndex >= this.sparkleQueue.length) {
      this.sparkleQueue = this.shuffleArray(happyDiaries.map(d => d.id));
      this.sparkleQueueIndex = 0;
    }
  },

  async ensureHappyDiaryMetadata(diary) {
    // 用户已手动编辑过人物标签，直接跳过并标记完成，尊重用户选择
    if (diary._peopleEdited) {
      diary._metaGenerated = true;
      return diary;
    }

    // 已生成过（有标记位）就直接跳过，避免反复请求
    if (diary._metaGenerated) return diary;

    diary.aiSummary = diary.aiSummary || "";
    diary.people = diary.people || [];
    if (!diary.aiSummary || diary.people.length === 0) {
      try {
        const excluded = this.getExcludedSparklePeople();
        const [aiSummary, people] = await Promise.all([
          this.generateHappySummary(diary.steps),
          this.extractHappyPeople(diary.steps, excluded),
        ]);
        diary.aiSummary = aiSummary;
        diary.people = people;
      } catch (err) {
        console.error("补生成闪光元数据失败", err);
        if (!diary.aiSummary) diary.aiSummary = diary.steps?.event?.slice(0, 60) || diary.title || "";
        if (diary.people.length === 0) diary.people = [];
      }
    }
    diary._metaGenerated = true;
    this.saveData();
    return diary;
  },

  async renderSparkleCard() {
    const happyDiaries = this.getHappyDiaries();
    const emptyEl = document.getElementById("sparkle-empty");
    const loadingEl = document.getElementById("sparkle-loading");
    const cardViewEl = document.getElementById("sparkle-card-view");
    const browseEl = document.getElementById("sparkle-browse-all");
    const detailEl = document.getElementById("sparkle-detail");

    if (happyDiaries.length === 0) {
      if (emptyEl) emptyEl.style.display = "flex";
      if (loadingEl) loadingEl.style.display = "none";
      if (cardViewEl) cardViewEl.style.display = "none";
      if (browseEl) browseEl.style.display = "none";
      if (detailEl) detailEl.style.display = "none";
      return;
    }

    if (emptyEl) emptyEl.style.display = "none";
    if (browseEl) browseEl.style.display = "none";
    if (detailEl) detailEl.style.display = "none";
    if (cardViewEl) cardViewEl.style.display = "none";
    if (loadingEl) loadingEl.style.display = "flex";

    // 洗牌循环：按队列顺序取下一张
    this.ensureSparkleQueue();
    const nextId = this.sparkleQueue[this.sparkleQueueIndex];
    const diary = happyDiaries.find(d => d.id === nextId) || happyDiaries[0];
    this.sparkleQueueIndex++;
    this.sparkleCurrentDiary = diary;
    await this.ensureHappyDiaryMetadata(diary);

    if (loadingEl) loadingEl.style.display = "none";
    if (cardViewEl) cardViewEl.style.display = "flex";

    const sparkleCardDate = document.getElementById("sparkle-card-date");
    if (sparkleCardDate) sparkleCardDate.textContent = new Date(diary.createdAt).toLocaleDateString("zh-CN");
    const quoteEl = document.getElementById("sparkle-card-quote");
    if (quoteEl) {
      quoteEl.textContent = diary.aiSummary || diary.title || diary.steps?.event?.slice(0, 40) || "✨";
      // 点击金句可编辑
      quoteEl.contentEditable = "true";
      quoteEl.spellcheck = false;
      quoteEl.style.cursor = "text";
      quoteEl.ondblclick = null;
      quoteEl.addEventListener("blur", () => {
        const newText = quoteEl.textContent.trim();
        if (newText && newText !== (diary.aiSummary || diary.title)) {
          diary.aiSummary = newText;
          if (!diary.title) diary.title = newText;
          this.saveData();
          this.showToast("金句已更新 ✨");
        }
      });
    }

    // 也更新详情页的金句（如果正在看）
    const detailQuote = document.querySelector("#sparkle-detail .sparkle-detail-quote");
    if (detailQuote) detailQuote.textContent = diary.aiSummary || diary.title;

    const peopleEl = document.getElementById("sparkle-card-people");
    if (diary.people && diary.people.length > 0) {
      peopleEl.innerHTML = diary.people.map((p) => `<span class="people-chip">${this.escapeHtml(p)}</span>`).join("");
    } else {
      peopleEl.innerHTML = "";
    }

    // 把当前日记绑定到查看原文按钮
    const viewBtn = document.getElementById("sparkle-view-detail");
    viewBtn.style.display = "";
  },

  showSparkleDetail(diary) {
    const cardViewEl = document.getElementById("sparkle-card-view");
    const detailEl = document.getElementById("sparkle-detail");
    const browseEl = document.getElementById("sparkle-browse-all");
    const detailBody = document.getElementById("sparkle-detail-body");

    if (cardViewEl) cardViewEl.style.display = "none";
    if (browseEl) browseEl.style.display = "none";
    if (detailEl) detailEl.style.display = "block";

    const steps = diary.steps || {};
    const defenseLabel = diary.category === "happy" || steps.category === "happy" ? "感受方式" : "防御方式";
    const emotions = steps.emotions || [];
    const zones = steps.zones || [];

    let html = `
      <div class="sparkle-detail-meta">
        <span class="sparkle-detail-tag">✨ 快乐治愈小分队</span>
        <span class="sparkle-detail-date">${new Date(diary.createdAt).toLocaleDateString("zh-CN")}</span>
      </div>
      <div class="sparkle-detail-quote">${this.escapeHtml(diary.aiSummary || diary.title)}</div>
    `;

    if (emotions.length > 0 || zones.length > 0) {
      html += `<div class="sparkle-detail-tags">`;
      if (zones.length > 0) {
        html += zones.map((z) => `<span class="sparkle-detail-zone">${this.emotionZones[z]?.name || z}</span>`).join("");
      }
      if (emotions.length > 0) {
        html += emotions.map((e) => `<span class="sparkle-detail-emotion">${this.escapeHtml(e)}</span>`).join("");
      }
      html += `</div>`;
    }

    html += `
      <div class="sparkle-detail-section"><span class="sparkle-detail-label">情绪事件</span><div class="sparkle-detail-text">${this.markdownToHtml(steps.event || "")}</div></div>
      <div class="sparkle-detail-section"><span class="sparkle-detail-label">身心感受</span><div class="sparkle-detail-text">${this.markdownToHtml(steps.feeling || "")}</div></div>
      <div class="sparkle-detail-section"><span class="sparkle-detail-label">${defenseLabel}</span><div class="sparkle-detail-text">${this.markdownToHtml(steps.defense || "")}</div></div>
      <div class="sparkle-detail-section"><span class="sparkle-detail-label">延展模型</span><div class="sparkle-detail-text">${this.markdownToHtml(steps.extend || "")}</div></div>
    `;

    if (diary.feedback) {
      html += `<div class="sparkle-detail-feedback"><span class="sparkle-detail-feedback-label">🌱 小树回应</span><div class="sparkle-detail-feedback-body">${this.markdownToHtml(diary.feedback)}</div></div>`;
    }

    if (detailBody) detailBody.innerHTML = html;
  },

  hideSparkleDetail() {
    const cardViewEl = document.getElementById("sparkle-card-view");
    const detailEl = document.getElementById("sparkle-detail");
    const browseEl = document.getElementById("sparkle-browse-all");
    if (cardViewEl) cardViewEl.style.display = "flex";
    if (detailEl) detailEl.style.display = "none";
    if (browseEl) browseEl.style.display = "none";
  },

  // ========== 浏览全部治愈小分队 ==========
  showSparkleBrowseAll() {
    const cardViewEl = document.getElementById("sparkle-card-view");
    const detailEl = document.getElementById("sparkle-detail");
    const browseEl = document.getElementById("sparkle-browse-all");
    const happyDiaries = this.getHappyDiaries();

    if (cardViewEl) cardViewEl.style.display = "none";
    if (detailEl) detailEl.style.display = "none";
    if (browseEl) browseEl.style.display = "flex";

    const sbc = document.getElementById("sparkle-browse-count");
    if (sbc) sbc.textContent = `共 ${happyDiaries.length} 篇`;
    const listEl = document.getElementById("sparkle-browse-list");
    if (!listEl) return;
    listEl.innerHTML = "";

    // 按日期倒序排列
    const sorted = [...happyDiaries].sort((a, b) => b.createdAt - a.createdAt);

    sorted.forEach((diary) => {
      const item = document.createElement("div");
      item.className = "sparkle-browse-item";
      const quote = diary.aiSummary || diary.steps?.event?.slice(0, 60) || "✨";
      const dateStr = new Date(diary.createdAt).toLocaleDateString("zh-CN");
      const ppl = (diary.people && diary.people.length > 0)
        ? diary.people.map((p) => `<span class="people-chip">${this.escapeHtml(p)}</span>`).join("")
        : "";

      item.innerHTML = `
        <div class="sparkle-browse-item-quote">${this.escapeHtml(quote)}</div>
        <div class="sparkle-browse-item-meta">
          <span>${dateStr}</span>
          ${ppl ? `<div class="sparkle-browse-item-people">${ppl}</div>` : ""}
        </div>
      `;

      item.addEventListener("click", () => this.showSparkleDetail(diary));
      listEl.appendChild(item);
    });
  },

  hideSparkleBrowseAll() {
    const cardViewEl = document.getElementById("sparkle-card-view");
    const browseEl = document.getElementById("sparkle-browse-all");
    if (cardViewEl) cardViewEl.style.display = "flex";
    if (browseEl) browseEl.style.display = "none";
  },

  renderSparklePeopleFilter() {
    const filterEl = document.getElementById("sparkle-people-filter");
    const listEl = document.getElementById("sparkle-people-list");
    const happyDiaries = this.getHappyDiaries();

    // 读取用户自定义的合并映射
    let mergeMap = {};
    try {
      mergeMap = JSON.parse(localStorage.getItem("xs_sparkle_merge_map") || "{}");
    } catch (e) {}

    // 统计每个人物出现次数，过滤掉无意义标签
    const skipWords = new Set(["我", "他", "她", "其他人", "朋友", "同事", "孩子", "男朋友", "女朋友", "老公", "老婆"]);
    const countMap = {};
    happyDiaries.forEach((d) => {
      (d.people || []).forEach((p) => {
        if (skipWords.has(p)) return;
        // 应用合并映射
        const canonical = mergeMap[p] || p;
        countMap[canonical] = (countMap[canonical] || 0) + 1;
      });
    });

    // 按出现次数降序排列
    const people = Object.entries(countMap).sort((a, b) => b[1] - a[1]);

    if (people.length === 0) {
      listEl.innerHTML = '<div class="sparkle-empty-hint">还没有人物标签</div>';
    } else {
      listEl.innerHTML = [
        `<span class="people-chip active" data-person="__all__">全部 (${happyDiaries.length})</span>`,
        ...people.map(([name, count]) =>
          `<span class="people-chip" data-person="${this.escapeHtml(name)}">${this.escapeHtml(name)} ${count}<button class="chip-rename" data-name="${this.escapeHtml(name)}" title="重命名/合并此标签">✎</button><button class="chip-delete" data-name="${this.escapeHtml(name)}" title="删除此标签">×</button></span>`
        ),
      ].join("");
    }

    // 如果有合并映射，显示提示
    if (Object.keys(mergeMap).length > 0) {
      listEl.innerHTML += '<div style="font-size:11px;color:var(--text-light);margin-top:8px;">已合并：' +
        Object.entries(mergeMap).map(([from, to]) => `「${from}」→「${to}」`).join("、") + '</div>';
    }

    filterEl.style.display = "flex";

    // 重命名人物标签
    listEl.querySelectorAll(".chip-rename").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        e.stopPropagation();
        const oldName = btn.dataset.name;
        if (!oldName) return;
        const newName = prompt(`将「${oldName}」重命名为（合并到已有标签会自动合并统计）：`, oldName);
        if (!newName || newName.trim() === oldName) return;
        this.mergeSparklePerson(oldName, newName.trim());
        this.renderSparklePeopleFilter();
      });
    });

    // 删除人物标签事件
    listEl.querySelectorAll(".chip-delete").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        e.stopPropagation();
        const name = btn.dataset.name;
        if (!name) return;
        if (!confirm(`确定从所有日记中删除人物标签「${name}」吗？`)) return;
        this.deleteSparklePerson(name);
        this.renderSparklePeopleFilter();
      });
    });
  },

  mergeSparklePerson(fromName, toName) {
    // 保存合并映射到 localStorage，持久化
    let mergeMap = {};
    try {
      mergeMap = JSON.parse(localStorage.getItem("xs_sparkle_merge_map") || "{}");
    } catch (e) {}
    mergeMap[fromName] = toName;
    // 如果 fromName 之前作为目标接收过其他合并，级联更新
    for (const [k, v] of Object.entries(mergeMap)) {
      if (v === fromName) mergeMap[k] = toName;
    }
    localStorage.setItem("xs_sparkle_merge_map", JSON.stringify(mergeMap));

    const happyDiaries = this.getHappyDiaries();
    let affected = false;
    for (const d of happyDiaries) {
      if (d.people && d.people.includes(fromName)) {
        d.people = d.people.map((p) => p === fromName ? toName : p);
        // 去重
        d.people = [...new Set(d.people)];
        d._peopleEdited = true;
        affected = true;
      }
    }
    this.saveData();
    if (affected) {
      this.addExcludedSparklePerson(fromName);
    }
    this.showToast(`已将「${fromName}」合并到「${toName}」`);
  },

  deleteSparklePerson(name) {
    const happyDiaries = this.getHappyDiaries();
    let affected = false;
    for (const d of happyDiaries) {
      if (d.people && d.people.includes(name)) {
        d.people = d.people.filter((p) => p !== name);
        d._peopleEdited = true;
        affected = true;
      }
    }
    this.saveData();
    if (affected) {
      this.addExcludedSparklePerson(name);
    }
    this.showToast(`已删除标签「${name}」`);
  },

  hideSparklePeopleFilter() {
    const filterEl = document.getElementById("sparkle-people-filter");
    if (filterEl) filterEl.style.display = "none";
  },

  filterSparkleByPerson(person) {
    this.hideSparklePeopleFilter();
    const happyDiaries = this.getHappyDiaries();
    const filtered = person === "__all__"
      ? happyDiaries
      : happyDiaries.filter((d) => (d.people || []).includes(person));

    if (filtered.length === 0) {
      this.showToast("没有和这个人相关的闪光瞬间");
      return;
    }

    const diary = filtered[Math.floor(Math.random() * filtered.length)];
    this.showSparkleDetail(diary);
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
    ["chat", "diary", "sparkle", "people", "settings"].forEach((tab) => {
      const btn = document.getElementById(`nav-${tab}`);
      if (btn) btn.addEventListener("click", () => this.switchTab(tab));
    });

    // 日记模式切换（觉察日记 / 情绪日记 / 反向选择）
    document.querySelectorAll(".diary-mode-btn").forEach(btn => {
      btn.addEventListener("click", (e) => {
        const mode = e.target.dataset.mode;
        document.querySelectorAll(".diary-mode-btn").forEach(b => b.classList.remove("active"));
        e.target.classList.add("active");
        document.querySelectorAll(".diary-mode-content").forEach(c => c.classList.remove("active"));
        if (mode === "guided") {
          const gd = document.getElementById("guided-diary");
          if (gd) gd.classList.add("active");
          this.loadGuidedDraft();
          this.renderGuidedStep();
          this.renderDiaries();
        } else if (mode === "my") {
          const md = document.getElementById("my-diary");
          if (md) md.classList.add("active");
          this.resetMoodStep();
          this.renderMoodDiaries();
        } else if (mode === "free") {
          const fd = document.getElementById("free-diary");
          if (fd) fd.classList.add("active");
          this.renderReverseStep();
          this.renderFreeDiaries();
        }
      });
    });

    // 引导式觉察步骤导航
    const stepPrevBtn = document.getElementById("step-prev-btn");
    const stepNextBtn = document.getElementById("step-next-btn");
    if (stepPrevBtn) stepPrevBtn.addEventListener("click", () => this.guidedPrev());
    if (stepNextBtn) stepNextBtn.addEventListener("click", () => this.guidedNext());

    // 保存引导日记
    const saveGuidedBtn = document.getElementById("save-guided-btn");
    if (saveGuidedBtn) saveGuidedBtn.addEventListener("click", () => {
      this.saveGuidedDiary().catch((err) => {
        console.error("保存觉察日记失败", err);
        this.showToast("保存失败，请检查网络或 API Key");
      });
    });
    // 重新来过
    const resetGuidedBtn = document.getElementById("reset-guided-btn");
    if (resetGuidedBtn) resetGuidedBtn.addEventListener("click", () => {
      this.guided = { currentStep: 1, steps: { event: "", feeling: "", defense: "", extend: "", zones: [], emotions: [], category: null } };
      this.clearGuidedDraft();
      const gsc = document.getElementById("guided-step-card");
      const gs = document.getElementById("guided-summary");
      const si = document.getElementById("step-input");
      if (gsc) gsc.style.display = "";
      if (gs) gs.style.display = "none";
      if (si) si.value = "";
      this.renderGuidedStep();
    });

    // 觉察日记颜色区多选
    const guidedMoodWheel = document.getElementById("guided-mood-wheel");
    if (guidedMoodWheel) {
      guidedMoodWheel.addEventListener("click", (e) => {
        const zone = e.target.closest(".mood-zone");
        if (!zone) return;
        zone.classList.toggle("selected");
        const selectedZones = Array.from(guidedMoodWheel.querySelectorAll(".mood-zone.selected"))
          .map((el) => el.dataset.zone);
        this.guided.steps.zones = selectedZones;
        this.renderGuidedEmotionTags();
      });
    }

    // 觉察日记情绪词多选
    const guidedEmotionTags = document.getElementById("guided-emotion-tags");
    if (guidedEmotionTags) {
      guidedEmotionTags.addEventListener("click", (e) => {
        const tag = e.target.closest(".emotion-tag");
        if (!tag) return;
        tag.classList.toggle("selected");
      });
    }

    // 导出
    const exportGuidedBtn = document.getElementById("export-guided-btn");
    if (exportGuidedBtn) exportGuidedBtn.addEventListener("click", () => this.exportAllGuidedDiaries());

    const exportMoodBtn = document.getElementById("export-mood-btn");
    if (exportMoodBtn) exportMoodBtn.addEventListener("click", () => this.exportAllMoodDiaries());

    // 反向选择事件
    const reversePrevBtn = document.getElementById("reverse-prev-btn");
    const reverseNextBtn = document.getElementById("reverse-next-btn");
    if (reversePrevBtn) reversePrevBtn.addEventListener("click", () => this.reversePrev());
    if (reverseNextBtn) reverseNextBtn.addEventListener("click", () => this.reverseNext());
    const saveReverseBtn = document.getElementById("save-reverse-btn");
    if (saveReverseBtn) saveReverseBtn.addEventListener("click", () => this.saveReverseRecord());

    const resetReverseBtn = document.getElementById("reset-reverse-btn");
    if (resetReverseBtn) resetReverseBtn.addEventListener("click", () => {
      this.reverseStep = { current: 1, total: 4, steps: { trigger: "", triggerIntensity: 5, oldProgram: "", newChoice: "", result: "", resultIntensity: 5 } };
      this.reverseStep._feedback = "";
      const rsc = document.getElementById("reverse-step-card");
      const rs = document.getElementById("reverse-summary");
      if (rsc) rsc.style.display = "";
      if (rs) rs.style.display = "none";
      const rt = document.getElementById("reverse-trigger");
      const ro = document.getElementById("reverse-old");
      const rn = document.getElementById("reverse-new");
      const rr = document.getElementById("reverse-result");
      const rib = document.getElementById("reverse-intensity-before");
      const ria = document.getElementById("reverse-intensity-after");
      const ibv = document.getElementById("intensity-before-val");
      const iav = document.getElementById("intensity-after-val");
      if (rt) rt.value = "";
      if (ro) ro.value = "";
      if (rn) rn.value = "";
      if (rr) rr.value = "";
      if (rib) rib.value = "5";
      if (ria) ria.value = "5";
      if (ibv) ibv.textContent = "5";
      if (iav) iav.textContent = "5";
      this.renderReverseStep();
    });

    const exportFreeBtn = document.getElementById("export-free-btn");
    if (exportFreeBtn) exportFreeBtn.addEventListener("click", () => this.exportAllFreeDiaries());

    const reverseSparkleNextBtn = document.getElementById("reverse-sparkle-next");
    if (reverseSparkleNextBtn) reverseSparkleNextBtn.addEventListener("click", () => { this.ensureReverseQueue(); this.renderFreeDiaries(); });

    // 情绪强度滑动条
    const intensityBefore = document.getElementById("reverse-intensity-before");
    const intensityAfter = document.getElementById("reverse-intensity-after");
    if (intensityBefore) intensityBefore.addEventListener("input", function() { const el = document.getElementById("intensity-before-val"); if (el) el.textContent = this.value; });
    if (intensityAfter) intensityAfter.addEventListener("input", function() { const el = document.getElementById("intensity-after-val"); if (el) el.textContent = this.value; });

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

    // 日日记录颜色区多选
    document.querySelectorAll("#my-diary-mood-wheel .mood-zone").forEach(zone => {
      zone.addEventListener("click", (e) => {
        const zoneKey = e.currentTarget.dataset.zone;
        this.toggleMyDiaryZone(zoneKey);
      });
    });

    // 日日记录情绪标签多选
    const myDiaryEmotionTags = document.getElementById("my-diary-emotion-tags");
    if (myDiaryEmotionTags) {
      myDiaryEmotionTags.addEventListener("click", (e) => {
        const tag = e.target.closest(".emotion-tag");
        if (!tag) return;
        const em = tag.dataset.emotion;
        const idx = this.myDiaryEmotions.indexOf(em);
        if (idx >= 0) {
          this.myDiaryEmotions.splice(idx, 1);
          tag.classList.remove("selected");
        } else {
          this.myDiaryEmotions.push(em);
          tag.classList.add("selected");
        }
      });
    }

    // ===== 识人板块事件 =====
    const addPersonBtn = document.getElementById("add-person-btn");
    const personBackBtn = document.getElementById("person-back-btn");
    if (addPersonBtn) addPersonBtn.addEventListener("click", () => this.showPersonForm());
    if (personBackBtn) personBackBtn.addEventListener("click", () => this.closePerson());

    // 观察类型切换
    document.querySelectorAll(".obs-type-btn").forEach(btn => {
      btn.addEventListener("click", (e) => {
        document.querySelectorAll(".obs-type-btn").forEach(b => b.classList.remove("active"));
        e.target.classList.add("active");
        this.obsType = e.target.dataset.type;
      });
    });

    // 添加观察记录
    const addObsBtn = document.getElementById("add-obs-btn");
    if (addObsBtn) addObsBtn.addEventListener("click", () => {
      const p = this.getCurrentPerson();
      if (!p) return;
      const input = document.getElementById("obs-input");
      if (!input) return;
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
    const analyzePersonBtn = document.getElementById("analyze-person-btn");
    if (analyzePersonBtn) analyzePersonBtn.addEventListener("click", () => this.analyzePerson());

    // 设置
    const saveSettingsBtn = document.getElementById("save-settings-btn");
    if (saveSettingsBtn) saveSettingsBtn.addEventListener("click", () => this.saveSettings());
    const clearDataBtn = document.getElementById("clear-data-btn");
    if (clearDataBtn) clearDataBtn.addEventListener("click", () => this.clearAllData());
    const clearChatBtn = document.getElementById("clear-chat-btn");
    if (clearChatBtn) clearChatBtn.addEventListener("click", () => this.clearChat());
    // 导入闪光数据
    const importDataBtn = document.getElementById("import-data-btn");
    const importStatus = document.getElementById("import-status");
    if (importDataBtn) importDataBtn.addEventListener("click", () => this.importSparkleData());
    // 如果已通过导入或之前使用积累了大量快乐日记，隐藏导入卡片
    const happyCount = this.getHappyDiaries().length;
    if (happyCount >= 40 || this.diaries.length > 200) {
      const importSection = document.getElementById("import-section");
      if (importSection) importSection.style.display = "none";
    }
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

    // ===== 闪光页事件 =====
    const sparkleNext = document.getElementById("sparkle-next");
    if (sparkleNext) sparkleNext.addEventListener("click", () => {
      this.ensureSparkleQueue();
      this.renderSparkleCard();
    });

    const sparkleBrowseAll = document.getElementById("sparkle-browse-all-link");
    if (sparkleBrowseAll) sparkleBrowseAll.addEventListener("click", () => this.showSparkleBrowseAll());

    const sparkleBrowseBack = document.getElementById("sparkle-browse-back");
    if (sparkleBrowseBack) sparkleBrowseBack.addEventListener("click", () => this.hideSparkleBrowseAll());

    const sparkleViewDetail = document.getElementById("sparkle-view-detail");
    if (sparkleViewDetail) sparkleViewDetail.addEventListener("click", () => {
      if (this.sparkleCurrentDiary) this.showSparkleDetail(this.sparkleCurrentDiary);
    });

    const sparkleBack = document.getElementById("sparkle-back");
    if (sparkleBack) sparkleBack.addEventListener("click", () => this.hideSparkleDetail());

    const sparkleFilterToggle = document.getElementById("sparkle-filter-toggle");
    if (sparkleFilterToggle) sparkleFilterToggle.addEventListener("click", () => this.renderSparklePeopleFilter());

    const sparkleFilterClose = document.getElementById("sparkle-filter-close");
    if (sparkleFilterClose) sparkleFilterClose.addEventListener("click", () => this.hideSparklePeopleFilter());

    const sparklePeopleList = document.getElementById("sparkle-people-list");
    if (sparklePeopleList) {
      sparklePeopleList.addEventListener("click", (e) => {
        const chip = e.target.closest(".people-chip");
        if (!chip) return;
        const person = chip.dataset.person;
        if (person) this.filterSparkleByPerson(person);
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

  // ========== 导入闪光数据 ==========
  async importSparkleData() {
    const statusEl = document.getElementById("import-status");
    const btn = document.getElementById("import-data-btn");
    const existingCount = this.getHappyDiaries().length;

    if (existingCount > 40) {
      this.showToast("闪光数据已经很丰富了，无需再次导入 ✨");
      return;
    }

    if (!confirm(`当前已有 ${existingCount} 条闪光瞬间。将导入 44 条历史快乐治愈小分队数据，确定吗？`)) return;

    btn.disabled = true;
    btn.textContent = "导入中...";
    if (statusEl) { statusEl.style.display = "block"; statusEl.textContent = "正在加载数据..."; }

    try {
      const resp = await fetch("import_data.json");
      if (!resp.ok) throw new Error(`加载失败 (${resp.status})`);
      const data = await resp.json();
      if (!Array.isArray(data)) throw new Error("数据格式不正确");

      // 避免重复：按 createdAt 去重
      const existingIds = new Set(this.diaries.map(d => d.id));
      let imported = 0;
      let skipped = 0;
      for (const entry of data) {
        if (existingIds.has(entry.id)) {
          skipped++;
          continue;
        }
        this.diaries.unshift(entry);
        existingIds.add(entry.id);
        imported++;
      }

      this.saveData();
      if (statusEl) statusEl.textContent = `✅ 导入成功：新增 ${imported} 条，跳过 ${skipped} 条重复`;
      this.showToast(`导入完成：${imported} 条新记录 ✨`);
      // 隐藏导入区域
      const importSection = document.getElementById("import-section");
      if (importSection) importSection.style.display = "none";
    } catch (err) {
      console.error("导入失败", err);
      if (statusEl) statusEl.textContent = "❌ 导入失败：" + err.message;
      this.showToast("导入失败：" + err.message);
    } finally {
      btn.disabled = false;
      btn.textContent = "📥 一键导入历史闪光数据";
    }
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
    navigator.serviceWorker.register("sw.js?v=22").then((reg) => {
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


