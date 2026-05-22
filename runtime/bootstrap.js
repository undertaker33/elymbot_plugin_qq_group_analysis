const COMMANDS = [
  {
    command: "群分析-帮助",
    key: "elymbot-group-analysis.help",
    mode: "help",
    description: "显示群分析指令",
  },
  {
    command: "群分析-完整",
    key: "elymbot-group-analysis.full",
    mode: "full",
    description: "输出完整群聊分析",
  },
  {
    command: "群分析-统计",
    key: "elymbot-group-analysis.stats",
    mode: "stats",
    description: "输出基础统计",
  },
  {
    command: "群分析-话题",
    key: "elymbot-group-analysis.topics",
    mode: "topics",
    description: "分析热门话题",
  },
  {
    command: "群分析-金句",
    key: "elymbot-group-analysis.quotes",
    mode: "quotes",
    description: "提取群聊金句",
  },
  {
    command: "群分析-用户",
    key: "elymbot-group-analysis.users",
    mode: "users",
    description: "分析用户风格",
  },
  {
    command: "群分析-质量",
    key: "elymbot-group-analysis.quality",
    mode: "quality",
    description: "输出聊天质量锐评",
  },
];

const DEFAULTS = {
  history_limit: 100,
  min_messages: 8,
  provider_id: "",
  model_id: "",
  temperature: 0.35,
  max_tokens: 1800,
  tone: "中文，简洁但有梗，避免攻击个人隐私。",
};

export default async function bootstrap(hostApi) {
  hostApi.log("INFO", "[elymbot-group-analysis] loaded");

  register(hostApi, "registerCommandHandler", {
    stage: "command",
    key: "elymbot-group-analysis.root",
    command: "群分析",
    aliases: [],
    groupPath: [],
    priority: 100,
    filters: [],
    metadata: { description: "群分析根命令" },
    handler: async (event) => {
      try {
        const action = extractCommandAction(event) || "帮助";
        await handleCommand(hostApi, event, modeFromAction(action));
        if (event.stopPropagation) {
          event.stopPropagation();
        }
      } catch (error) {
        hostApi.log("ERROR", "[elymbot-group-analysis] root command failed", {
          message: String(error && error.message ? error.message : error),
        });
        event.replyText(`群分析失败：${String(error && error.message ? error.message : error)}`);
      }
    },
  });

  for (const item of COMMANDS) {
    register(hostApi, "registerCommandHandler", {
      stage: "command",
      key: item.key,
      command: item.command,
      aliases: [],
      groupPath: ["群分析"],
      priority: 0,
      filters: [],
      metadata: { description: item.description },
      handler: async (event) => {
        try {
          await handleCommand(hostApi, event, item.mode);
        } catch (error) {
          hostApi.log("ERROR", "[elymbot-group-analysis] command failed", {
            command: item.command,
            message: String(error && error.message ? error.message : error),
          });
          event.replyText(`群分析失败：${String(error && error.message ? error.message : error)}`);
        }
      },
    });
  }

  register(hostApi, "registerMessageHandler", {
    key: "elymbot-group-analysis.message-command",
    priority: 200,
    filters: [],
    metadata: { description: "在命令匹配前拦截 /群分析 指令" },
    handler: async (event) => {
      const action = extractCommandAction(event);
      if (!action) {
        return;
      }

      if (event.stopPropagation) {
        event.stopPropagation();
      }

      try {
        await handleCommand(hostApi, event, modeFromAction(action));
      } catch (error) {
        hostApi.log("ERROR", "[elymbot-group-analysis] message command failed", {
          message: String(error && error.message ? error.message : error),
        });
        event.replyText(`群分析失败：${String(error && error.message ? error.message : error)}`);
      }
    },
  });

  register(hostApi, "registerRegexHandler", {
    key: "elymbot-group-analysis.slash-fallback",
    pattern: "^\\s*/?群分析[-－](帮助|完整|统计|话题|金句|用户|质量)(?:\\s|$)",
    flags: ["i"],
    filters: [],
    priority: 100,
    metadata: { description: "匹配 /群分析-xx 功能指令" },
    handler: async (event) => {
      try {
        const action = extractAction(event);
        const mode = modeFromAction(action);
        await handleCommand(hostApi, event, mode);
        if (event.stopPropagation) {
          event.stopPropagation();
        }
      } catch (error) {
        hostApi.log("ERROR", "[elymbot-group-analysis] regex command failed", {
          message: String(error && error.message ? error.message : error),
        });
        event.replyText(`群分析失败：${String(error && error.message ? error.message : error)}`);
      }
    },
  });
}

function register(hostApi, methodName, descriptor) {
  if (!hostApi || typeof hostApi[methodName] !== "function") {
    if (hostApi && typeof hostApi.log === "function") {
      hostApi.log("WARN", `[elymbot-group-analysis] ${methodName} unavailable`, {
        key: descriptor && descriptor.key ? descriptor.key : "",
      });
    }
    return null;
  }

  try {
    return hostApi[methodName](descriptor);
  } catch (error) {
    if (hostApi && typeof hostApi.log === "function") {
      hostApi.log("ERROR", `[elymbot-group-analysis] ${methodName} failed`, {
        key: descriptor && descriptor.key ? descriptor.key : "",
        message: String(error && error.message ? error.message : error),
      });
    }
    return null;
  }
}

function extractCommandAction(event) {
  const raw = extractEventText(event).trim();
  if (!raw) {
    return "";
  }

  const normalized = raw.replace(/^\/+/, "").trim();
  if (normalized === "群分析") {
    return "帮助";
  }

  let match = normalized.match(/^群分析[-－](帮助|完整|统计|话题|金句|用户|质量)(?:\s|$)/);
  if (match) {
    return match[1];
  }

  match = normalized.match(/^群分析\s+(帮助|完整|统计|话题|金句|用户|质量)(?:\s|$)/);
  if (match) {
    return match[1];
  }

  return "";
}

function extractAction(event) {
  const allowed = ["帮助", "完整", "统计", "话题", "金句", "用户", "质量"];
  if (event && Array.isArray(event.groups)) {
    for (const group of event.groups) {
      const value = String(group || "").trim();
      if (allowed.indexOf(value) >= 0) {
        return value;
      }
    }
  }

  const fromCommand = extractCommandAction(event);
  if (fromCommand) {
    return fromCommand;
  }

  const raw = extractEventText(event || "");
  const match = raw.match(/群分析[-－](帮助|完整|统计|话题|金句|用户|质量)/);
  return match ? match[1] : "帮助";
}

function modeFromAction(action) {
  const map = {
    "帮助": "help",
    "完整": "full",
    "统计": "stats",
    "话题": "topics",
    "金句": "quotes",
    "用户": "users",
    "质量": "quality",
  };
  return map[action] || "help";
}

async function handleCommand(hostApi, event, mode) {
  if (mode === "help") {
    event.replyText(buildHelpText());
    return;
  }

  const settings = normalizeSettings(hostApi.getSettings ? hostApi.getSettings() : {});
  const history = await loadHistory(hostApi, settings.history_limit);
  if (history.ok === false) {
    event.replyText(`读取当前会话历史失败：${history.error}`);
    return;
  }

  const messages = normalizeMessages(history.records);
  const validMessages = messages.filter((msg) => {
    const text = msg.text.trim();
    return text && !text.startsWith("/群分析-");
  });

  if (validMessages.length < settings.min_messages) {
    event.replyText(
      `当前会话可分析消息不足：有效 ${validMessages.length} 条，至少需要 ${settings.min_messages} 条。`
    );
    return;
  }

  const stats = buildStats(validMessages);
  if (mode === "stats") {
    event.replyText(renderStatsReport(stats, validMessages.length));
    return;
  }

  event.replyText(`正在分析当前会话最近 ${validMessages.length} 条有效消息...`);

  const model = await resolveModel(hostApi, settings);
  if (model.ok === false) {
    event.replyText(`无法选择可用模型：${model.error}`);
    return;
  }

  const prompt = buildPrompt(mode, validMessages, stats, settings);
  const result = await callLlm(hostApi, model, settings, prompt);
  if (result.ok === false) {
    event.replyText(`LLM 分析失败：${result.error}`);
    return;
  }

  event.replyText(trimReport(result.text));
}

function buildHelpText() {
  return [
    "群分析指令：",
    "/群分析：显示本帮助",
    "/群分析-完整：完整分析最近消息",
    "/群分析-统计：只看基础统计",
    "/群分析-话题：分析热门话题",
    "/群分析-金句：提取金句",
    "/群分析-用户：分析用户风格",
    "/群分析-质量：聊天质量锐评",
    "/群分析-帮助：显示本帮助",
    "",
    "说明：当前版本只分析触发指令所在会话，读取最近最多 100 条历史消息。",
  ].join("\n");
}

function extractEventText(event) {
  if (!event || typeof event !== "object") {
    return "";
  }
  for (const key of ["rawText", "workingText", "messageText", "text", "remainingText"]) {
    if (typeof event[key] === "string" && event[key]) {
      return event[key];
    }
  }
  return extractText(event);
}

function normalizeSettings(raw) {
  const merged = {};
  for (const key of Object.keys(DEFAULTS)) {
    merged[key] = raw && raw[key] !== undefined && raw[key] !== null ? raw[key] : DEFAULTS[key];
  }
  merged.history_limit = clamp(toInt(merged.history_limit, DEFAULTS.history_limit), 1, 100);
  merged.min_messages = clamp(toInt(merged.min_messages, DEFAULTS.min_messages), 1, 100);
  merged.temperature = clamp(toNumber(merged.temperature, DEFAULTS.temperature), 0, 2);
  merged.max_tokens = clamp(toInt(merged.max_tokens, DEFAULTS.max_tokens), 256, 6000);
  merged.provider_id = String(merged.provider_id || "").trim();
  merged.model_id = String(merged.model_id || "").trim();
  merged.tone = String(merged.tone || DEFAULTS.tone).trim();
  return merged;
}

async function loadHistory(hostApi, limit) {
  if (!hostApi.conversation || !hostApi.conversation.history) {
    return { ok: false, error: "宿主未提供 conversation.history" };
  }

  const result = await hostApi.conversation.history({
    limit,
    includeAttachments: false,
  });

  if (result && result.ok === false) {
    return { ok: false, error: formatHostError(result) };
  }

  const records = pickArray(result, ["messages", "items", "records", "history", "data"]);
  if (!records) {
    return { ok: false, error: "历史消息返回格式无法识别" };
  }
  return { ok: true, records };
}

async function resolveModel(hostApi, settings) {
  let providerId = settings.provider_id;
  let modelId = settings.model_id;

  if (providerId && modelId) {
    return { ok: true, providerId, modelId };
  }

  if (!hostApi.providers || !hostApi.providers.list || !hostApi.providers.models) {
    return { ok: false, error: "请在插件设置中填写 provider_id 和 model_id" };
  }

  if (!providerId) {
    const providers = await hostApi.providers.list();
    if (providers && providers.ok === false) {
      return { ok: false, error: formatHostError(providers) };
    }
    const providerList = pickArray(providers, ["providers", "items", "data"]) || [];
    const first = providerList[0];
    providerId = String(
      (first && (first.providerId || first.id || first.key || first.name)) || ""
    ).trim();
  }

  if (!providerId) {
    return { ok: false, error: "没有可用 Provider，请在插件设置中填写 provider_id" };
  }

  if (!modelId) {
    const models = await hostApi.providers.models({ providerId });
    if (models && models.ok === false) {
      return { ok: false, error: formatHostError(models) };
    }
    const modelList = pickArray(models, ["models", "items", "data"]) || [];
    const first = modelList[0];
    modelId = String((first && (first.modelId || first.id || first.key || first.name)) || "").trim();
  }

  if (!modelId) {
    return { ok: false, error: "没有可用 Model，请在插件设置中填写 model_id" };
  }

  return { ok: true, providerId, modelId };
}

async function callLlm(hostApi, model, settings, prompt) {
  const payload = {
    providerId: model.providerId,
    modelId: model.modelId,
    systemPrompt:
      "你是群聊分析助手。你只基于用户提供的聊天记录分析，不编造未出现的事实，不输出隐私推断。",
    messages: [{ role: "user", text: prompt }],
    temperature: settings.temperature,
    maxTokens: settings.max_tokens,
  };

  const response = hostApi.callLlm
    ? await hostApi.callLlm(payload)
    : await hostApi.llm.generate(payload);

  if (response && response.ok === false) {
    return { ok: false, error: formatHostError(response) };
  }

  const text = extractText(response).trim();
  if (!text) {
    return { ok: false, error: "模型返回为空" };
  }
  return { ok: true, text };
}

function normalizeMessages(records) {
  return records
    .map((record, index) => {
      const text = extractText(record).replace(/\s+/g, " ").trim();
      const senderId = firstString(record, [
        "senderId",
        "sender_id",
        "userId",
        "user_id",
        "authorId",
        "author_id",
      ]);
      const senderName = firstString(record, [
        "senderName",
        "sender_name",
        "nickname",
        "displayName",
        "author",
        "from",
      ]);
      const timestamp = firstString(record, ["timestamp", "time", "createdAt", "created_at"]);
      return {
        index,
        text,
        sender: senderName || senderId || "未知用户",
        timestamp,
      };
    })
    .filter((msg) => msg.text);
}

function buildStats(messages) {
  const bySender = {};
  const byHour = {};
  let totalChars = 0;

  for (const msg of messages) {
    bySender[msg.sender] = (bySender[msg.sender] || 0) + 1;
    totalChars += msg.text.length;

    const hour = extractHour(msg.timestamp);
    if (hour !== "") {
      byHour[hour] = (byHour[hour] || 0) + 1;
    }
  }

  const senders = Object.keys(bySender)
    .map((name) => ({ name, count: bySender[name] }))
    .sort((a, b) => b.count - a.count);

  const hours = Object.keys(byHour)
    .map((hour) => ({ hour, count: byHour[hour] }))
    .sort((a, b) => b.count - a.count);

  return {
    messageCount: messages.length,
    participantCount: senders.length,
    totalChars,
    avgChars: messages.length ? Math.round(totalChars / messages.length) : 0,
    topSenders: senders.slice(0, 8),
    topHours: hours.slice(0, 5),
  };
}

function renderStatsReport(stats, count) {
  const topSenders = stats.topSenders.length
    ? stats.topSenders.map((item, idx) => `${idx + 1}. ${item.name}: ${item.count} 条`).join("\n")
    : "暂无";
  const topHours = stats.topHours.length
    ? stats.topHours.map((item) => `${item.hour}:00: ${item.count} 条`).join("\n")
    : "暂无";

  return [
    "群分析-统计",
    `样本消息：${count} 条`,
    `参与用户：${stats.participantCount} 人`,
    `总字数：${stats.totalChars}`,
    `平均长度：${stats.avgChars} 字/条`,
    "",
    "活跃用户：",
    topSenders,
    "",
    "活跃时段：",
    topHours,
  ].join("\n");
}

function buildPrompt(mode, messages, stats, settings) {
  const title = {
    full: "完整群聊分析",
    topics: "热门话题分析",
    quotes: "群聊金句提取",
    users: "用户风格分析",
    quality: "聊天质量锐评",
  }[mode] || "群聊分析";

  const requirements = {
    full: [
      "输出：总体摘要、热门话题、金句、用户风格、聊天质量、可行动结论。",
      "每个部分控制在 3-6 条，避免长篇流水账。",
    ],
    topics: ["输出 3-6 个热门话题，每个包含话题名、证据、简短点评。"],
    quotes: ["挑选 3-8 条最有代表性的原话，保留说话人，说明入选理由。"],
    users: ["按发言表现给 3-8 位用户生成风格称号和一句点评，避免人格/隐私诊断。"],
    quality: ["输出聊天质量评分、主要维度、优点、槽点和一句总结锐评。"],
  }[mode] || ["输出群聊分析。"];

  const statsText = [
    `样本消息数：${stats.messageCount}`,
    `参与用户数：${stats.participantCount}`,
    `平均消息长度：${stats.avgChars}`,
    `活跃用户：${stats.topSenders.map((x) => `${x.name}(${x.count})`).join("，") || "暂无"}`,
  ].join("\n");

  const messagesText = messages
    .map((msg, idx) => `${idx + 1}. [${msg.sender}] ${msg.text}`)
    .join("\n");

  return [
    `任务：${title}`,
    `风格：${settings.tone}`,
    "",
    "要求：",
    ...requirements.map((line) => `- ${line}`),
    "- 只依据聊天记录，不要臆测身份、性格、职业、年龄等隐私。",
    "- 输出中文 Markdown，不要包裹代码块。",
    "",
    "基础统计：",
    statsText,
    "",
    "聊天记录：",
    messagesText,
  ].join("\n");
}

function trimReport(text) {
  const normalized = String(text || "").trim();
  if (normalized.length <= 7000) {
    return normalized;
  }
  return `${normalized.slice(0, 6900)}\n\n[报告过长，已截断]`;
}

function pickArray(value, keys) {
  if (Array.isArray(value)) {
    return value;
  }
  if (!value || typeof value !== "object") {
    return null;
  }
  for (const key of keys) {
    if (Array.isArray(value[key])) {
      return value[key];
    }
  }
  return null;
}

function extractText(value) {
  if (value === null || value === undefined) {
    return "";
  }
  if (typeof value === "string") {
    return value;
  }
  if (typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }
  if (Array.isArray(value)) {
    return value.map(extractText).filter(Boolean).join(" ");
  }
  if (typeof value === "object") {
    for (const key of [
      "text",
      "rawText",
      "content",
      "message",
      "body",
      "displayText",
      "answer",
      "output",
      "result",
    ]) {
      const nested = extractText(value[key]);
      if (nested) {
        return nested;
      }
    }
  }
  return "";
}

function firstString(obj, keys) {
  if (!obj || typeof obj !== "object") {
    return "";
  }
  for (const key of keys) {
    const value = obj[key];
    if (value !== undefined && value !== null && String(value).trim()) {
      return String(value).trim();
    }
  }
  return "";
}

function extractHour(value) {
  if (value === undefined || value === null || value === "") {
    return "";
  }
  const raw = String(value);
  const iso = raw.match(/T(\d{2}):\d{2}/);
  if (iso) {
    return iso[1];
  }
  const clock = raw.match(/\b(\d{1,2}):\d{2}/);
  if (clock) {
    return String(Number(clock[1])).padStart(2, "0");
  }
  const numeric = Number(raw);
  if (Number.isFinite(numeric)) {
    const millis = numeric > 100000000000 ? numeric : numeric * 1000;
    const date = new Date(millis);
    if (!Number.isNaN(date.getTime())) {
      return String(date.getHours()).padStart(2, "0");
    }
  }
  return "";
}

function formatHostError(result) {
  if (!result || !result.error) {
    return "unknown_error";
  }
  const code = result.error.code || "error";
  const message = result.error.message || "";
  return message ? `${code}: ${message}` : code;
}

function toInt(value, fallback) {
  const num = parseInt(String(value), 10);
  return Number.isFinite(num) ? num : fallback;
}

function toNumber(value, fallback) {
  const num = Number(value);
  return Number.isFinite(num) ? num : fallback;
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}
