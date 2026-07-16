// 小树觉察室 - 主逻辑

const App = {
  currentMode: "normal",
  currentChat: [],
  diaries: [],
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

  init() {
    this.loadData();
    this.renderTabs();
    this.renderChat();
    this.renderDiaries();
    this.renderSettings();
    this.setupEventListeners();
    this.setMode("xiaoshu");

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
      const mode = localStorage.getItem("xs_mode");
      const people = localStorage.getItem("xs_people");
      if (chat) this.currentChat = JSON.parse(chat);
      if (diaries) this.diaries = JSON.parse(diaries);
      if (mode) this.currentMode = mode;
      if (people) this.people = JSON.parse(people);
    } catch (e) {
      console.error("加载数据失败", e);
    }
  },

  saveData() {
    try {
      localStorage.setItem("xs_chat_history", JSON.stringify(this.currentChat.slice(-CONFIG.MAX_HISTORY)));
      localStorage.setItem("xs_diaries", JSON.stringify(this.diaries));
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
      ...this.currentChat.slice(-20).map((m) => ({ role: m.role, content: m.content })),
    ];
    const response = await fetch(CONFIG.BASE_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json; charset=utf-8", "Authorization": `Bearer ${CONFIG.API_KEY}` },
      body: JSON.stringify({ model: CONFIG.MODEL, messages, temperature: 0.8, max_tokens: 2000 }),
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

这是 ${today} 的觉察日记。用户的四步觉察已经完成，请你以陪伴者的身份给一段温暖、帮助松动的回应。

## 你的核心角色（最重要）

你的首要任务不是分析、不是归类、不是给理论标签。

你的首要任务：
1. **帮用户停下来**——"你写到这里，先停一下。闭上眼睛，再感受一下当时那个感觉。"
2. **帮用户回到身体**——"那个生气让你身体的哪个地方不舒服？是胸口？喉咙？还是胃？"
3. **帮用户命名感受，而不是归类**——不要说"这是自我攻击型防御"，要说"你好像一直习惯把责任往自己身上揽，对不对？"
4. **温和地连接过去**——"这种感觉，是不是很小的时候就有了？不用急着回答，就在那里呆一会。"
5. **肯定写下来的勇气**——"你能把这些写下来，本身就已经在跟过去那个自己对话了。"

分析（理论标签）只在涉及强迫性重复时轻轻带过。
平时，你的回应是一个**陪伴者，不是解读师**。

最核心的原则：
- "停留在感受里 > 解释为什么有这个感受"
- "身体体验 > 大脑理解"
- "问问题 > 给结论"

回答控制在 300-500 字。不要长篇大论。

## 用户今天的觉察日记

【情绪事件】${steps.event}
【身心感受】${steps.feeling}
【防御方式】${steps.defense}
【延展模型】${steps.extend}
${historySummary}
如果用户在今天的日记和过去的日记之间存在相似的防御模式和情绪模式（强迫性重复），请轻轻地点一下，但不要贴标签。如果没有明显的重复，就不用强行分析。`;

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
        max_tokens: 2000,
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

  // ========== 自由书写日记 ==========
  async saveDiary() {
    const titleInput = document.getElementById("diary-title");
    const contentInput = document.getElementById("diary-content");
    const title = titleInput.value.trim();
    const content = contentInput.value.trim();
    if (!content) { this.showToast("请先写下今天的觉察"); return; }

    this.showDiaryLoading(true);
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

    this.diaries.unshift(diary);
    this.saveData();
    titleInput.value = "";
    contentInput.value = "";
    this.renderDiaries();
    this.showDiaryLoading(false);
    this.showToast("觉察日记已保存");
  },

  async callAIFeedback(content) {
    const today = new Date().toLocaleDateString("zh-CN", { year: "numeric", month: "long", day: "numeric" });
    const prompt = `这是 ${today} 的觉察日记。你的首要任务不是分析、归类、给理论标签。

你的首要任务：
1. 帮用户停下来——"你写到这里，先停一下。闭上眼睛，再感受一下当时那个感觉。"
2. 帮用户回到身体——"那个生气让你身体的哪个地方不舒服？"
3. 帮用户命名感受，而不是归类——不要说"这是自我攻击型防御"，要说"你好像一直习惯把责任往自己身上揽，对不对？"
4. 温和地连接过去——"这种感觉，是不是很小的时候就有了？不用急着回答。"
5. 肯定写下来的勇气。

回答控制在 300-500 字。陪伴者，不是解读师。

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
        max_tokens: 2000,
      }),
    });
    if (!response.ok) { const err = await response.text(); throw new Error(`API 错误 (${response.status}): ${err}`); }
    const data = await response.json();
    return data.choices[0].message.content;
  },

  renderDiaries() {
    const list = document.getElementById("diary-list");
    const countEl = document.getElementById("diary-count");
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
            <button class="btn-text" onclick="App.exportDiary(${d.id})">📤 导出</button>
            <button class="btn-text danger" onclick="App.deleteDiary(${d.id})">删除</button>
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
  exportDiary(id) {
    const d = this.diaries.find(dd => dd.id === id);
    if (!d) return;
    const filename = (d.title || "觉察日记").replace(/[\\/:*?"<>|]/g, "_") + ".txt";
    let text = `标题：${d.title}\n日期：${d.date}\n类型：${d.source === "guided" ? "引导式觉察" : "自由书写"}\n\n`;
    if (d.steps) {
      text += `【情绪事件】\n${d.steps.event}\n\n【身心感受】\n${d.steps.feeling}\n\n【防御方式】\n${d.steps.defense}\n\n【延展模型】\n${d.steps.extend}\n\n`;
    } else {
      text += `${d.content}\n\n`;
    }
    text += `【🌱 小树回应】\n${d.feedback}\n`;
    this.downloadFile(filename, text);
  },

  exportAllDiaries() {
    if (this.diaries.length === 0) { this.showToast("没有日记可导出"); return; }
    // 一个一个导出
    for (const d of this.diaries) {
      const filename = (d.title || "觉察日记").replace(/[\\/:*?"<>|]/g, "_") + ".txt";
      let text = `标题：${d.title}\n日期：${d.date}\n类型：${d.source === "guided" ? "引导式觉察" : "自由书写"}\n\n`;
      if (d.steps) {
        text += `【情绪事件】\n${d.steps.event}\n\n【身心感受】\n${d.steps.feeling}\n\n【防御方式】\n${d.steps.defense}\n\n【延展模型】\n${d.steps.extend}\n\n`;
      } else {
        text += `${d.content}\n\n`;
      }
      text += `【🌱 小树回应】\n${d.feedback}\n`;
      this.downloadFile(filename, text);
    }
    this.showToast(`已导出 ${this.diaries.length} 篇日记`);
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

  showDiaryLoading(show) {
    const btn = document.getElementById("save-diary-btn");
    const loading = document.getElementById("diary-loading");
    if (btn) btn.disabled = show;
    if (loading) loading.style.display = show ? "block" : "none";
  },

  deleteDiary(id) {
    if (!confirm("确定删除这条日记吗？")) return;
    this.diaries = this.diaries.filter((d) => d.id !== id);
    this.saveData();
    this.renderDiaries();
    this.showToast("日记已删除");
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
    localStorage.removeItem("xs_mode");
    localStorage.removeItem("xs_people");
    localStorage.removeItem("xs_user_config");
    this.currentChat = [];
    this.diaries = [];
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
      card.innerHTML = `
        <div class="person-card-header">
          <span class="person-card-name">${this.escapeHtml(p.name)}</span>
          <span class="person-card-relation">${this.escapeHtml(p.relation)}</span>
        </div>
        <div class="person-card-meta">观察到 ${p.observations.length} 次 · ${new Date(p.createdAt).toLocaleDateString("zh-CN")}</div>
      `;
      card.addEventListener("click", () => this.openPerson(p.id));
      list.appendChild(card);
    });
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
    document.getElementById("person-info-card").innerHTML = `
      <div class="person-info-name">${this.escapeHtml(p.name)}</div>
      <div class="person-info-relation">${this.escapeHtml(p.relation)} · ${new Date(p.createdAt).toLocaleDateString("zh-CN")}</div>
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
      document.getElementById("analysis-honesty").innerHTML = `<strong>⚠️ 诚实边界</strong><br>${this.HONESTY_BOUNDARY}`;
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
      div.innerHTML = `
        <div class="obs-item-header">
          <span class="obs-item-type">${o.type === "言" ? "💬" : o.type === "行" ? "🏃" : "🧠"} ${o.type}</span>
          <div>
            <span class="obs-item-date">${new Date(o.createdAt).toLocaleString("zh-CN")}</span>
            <button class="obs-item-delete" data-oid="${o.id}">删除</button>
          </div>
        </div>
        <div class="obs-item-content">${this.escapeHtml(o.content)}</div>
      `;
      list.appendChild(div);
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

  HONESTY_BOUNDARY: `• 这些分析基于你提供的二手信息（你的视角），不是第一手观察，存在严重偏差。
• 分析依赖的只是你记录的语言和行为片段，无法还原完整的语境和对方的内心体验。
• 我能看到的只是「你这侧的客体关系配对」——看到的不是真实的他，是你眼中的他。
• 以下结论仅为推测，不能被当作对方的事实。
• 不要用这些分析去给对方贴标签；不要用这些分析去质问对方、「诊断」对方、或证明自己是对的。
• 精神分析不是你攻击别人的武器。
• 如果你用这些去说服对方"你不是回避型吗"——我会生气。`,

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

    const prompt = `你正在帮用户分析一位她身边的重要他人。你的分析目的不是给这个不在场的人贴标签，而是帮助用户理解自己的反移情和关系模式。

${MALE_TYPES_REF}

用户观察的对象信息：
- 称呼：${p.name}
- 关系：${p.relation}
- 用户初步印象：${p.impression || "未提供"}

用户记录的观察（按时间顺序）：
${obsText}${ctInfo}

请给出一段温和的精神动力学分析。原则：
1. 用「推测框架」而非「结论框架」——"从这些记录来看，我观察到这样的模式..."而非"他是XX型"
2. 关注防御机制：这个人用什么样的方式保护自己？
3. 关注核心需求：这个人最渴望得到却从未得到过的是什么？
4. 关注反移情：用户记录这些时，可能在被唤起什么样的感受？
5. 指出人格发展水平（一元/二元/三元）的线索（如有）
6. 如果与上述7种男性类型有相似之处，温和地点一下
7. 控制 400-600 字`;

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
          max_tokens: 2000,
        }),
      });
      if (!response.ok) { const err = await response.text(); throw new Error(`API 错误: ${err}`); }
      const data = await response.json();
      const content = data.choices[0].message.content;

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

    // 切换到日记页时加载草稿
    if (tab === "diary") {
      this.loadGuidedDraft();
      this.renderGuidedStep();
      this.renderDiaries();
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

    // 日记模式切换
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
        } else {
          document.getElementById("free-diary").classList.add("active");
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

    // 自由书写
    const saveDiaryBtn = document.getElementById("save-diary-btn");
    if (saveDiaryBtn) saveDiaryBtn.addEventListener("click", () => this.saveDiary());

    // 导出
    document.getElementById("export-all-btn").addEventListener("click", () => this.exportAllDiaries());

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
    navigator.serviceWorker.register("sw.js?v=7").then((reg) => {
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


