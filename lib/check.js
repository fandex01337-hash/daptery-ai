// Общая логика проверки работы через Google Gemini.
// Используется и локальным сервером (server.js), и серверной функцией (api/check.js).

export const SUBJECTS = [
  'математика', 'алгебра', 'геометрия', 'физика',
  'химия', 'русский язык', 'казахский язык', 'английский язык',
];
export const ERROR_TYPES = ['вычислительная', 'знак', 'правило', 'понимание', 'оформление'];
const STATUSES = ['correct', 'partial', 'wrong', 'unreadable'];

// Основную модель можно задать через GEMINI_MODEL. Если она недоступна, перегружена
// или долго молчит, пробуем следующие из списка.
// Облегчённых моделей (flash-lite) здесь нет намеренно: на живой проверке gemini-3.5-flash-lite
// поставила «верно, 10 из 10» работе с ошибкой в знаке. Лучше подождать, чем ошибиться в оценке.
const FALLBACK_MODELS = ['gemini-3.6-flash', 'gemini-3.8-flash', 'gemini-flash-latest'];
const API_BASE = 'https://generativelanguage.googleapis.com/v1beta/models';
const MAX_IMAGE_BYTES = 6 * 1024 * 1024;

export class CheckError extends Error {
  constructor(code, message, status = 500) {
    super(message);
    this.code = code;
    this.status = status;
  }
}

export function buildPrompt({ subject, grade, max, criteria }) {
  const crit = criteria && criteria.trim() ? criteria.trim() : 'не указаны';
  return `Ты — опытный учитель предмета «${subject}» школы Казахстана, проверяешь письменную работу ученика ${grade} класса. Ты помогаешь учителю, а не заменяешь его.
1. Распознай текст на фото построчно, нумеруй строки сверху вниз, начиная с 1. Неразборчивое не угадывай.
2. Определи условие задачи и реши её сам, чтобы знать верный ответ.
3. Проверь решение ученика по шагам. Для каждой ошибки укажи ПЕРВУЮ строку, где она появилась; ошибки, которые лишь следуют из предыдущей, не перечисляй.
4. Тип ошибки — строго один из: вычислительная, знак, правило, понимание, оформление.
5. Верный ход решения с одной арифметической ошибкой — частично верная работа. Выставь балл из ${max}.
Критерии учителя (имеют приоритет, если указаны): ${crit}
Пиши на языке работы ученика (казахский или русский). Объяснение для ученика — доброжелательно, 2–3 простых предложения, без слов «плохо» и «неправильно». Не используй имена.
Верни ТОЛЬКО JSON:
{"status":"correct|partial|wrong|unreadable","score":число,"topic":"тема в 2–4 словах","task":"условие","correct_answer":"верный ответ","student_answer":"ответ ученика","recognized_lines":["строка 1","строка 2"],"strengths":"что сделано верно","errors":[{"line":номер,"student":"как написал ученик","correct":"как должно быть","type":"тип","explanation":"почему это ошибка"}],"student_feedback":"объяснение для ученика","practice_task":"похожая задача без ответа","teacher_note":"что повторить, одна строка"}`;
}

// Проверка входных данных из браузера.
export function validateInput(body) {
  if (!body || typeof body !== 'object') throw new CheckError('bad_request', 'Пустой запрос.', 400);
  const { image, subject, grade, max, criteria } = body;
  const m = /^data:(image\/(?:jpeg|png|webp));base64,([A-Za-z0-9+/=]+)$/.exec(image || '');
  if (!m) throw new CheckError('bad_image', 'Фото не получено или имеет неподдерживаемый формат.', 400);
  if (m[2].length * 0.75 > MAX_IMAGE_BYTES) throw new CheckError('too_large', 'Фото слишком большое.', 413);
  const g = Number(grade);
  const mx = Number(max);
  return {
    mimeType: m[1],
    data: m[2],
    subject: SUBJECTS.includes(subject) ? subject : 'математика',
    grade: Number.isInteger(g) && g >= 1 && g <= 11 ? g : 7,
    max: Number.isFinite(mx) && mx > 0 && mx <= 100 ? Math.round(mx) : 10,
    criteria: typeof criteria === 'string' ? criteria.slice(0, 3000) : '',
  };
}

// Уровень «размышлений» модели: чем ниже, тем быстрее ответ.
// GEMINI_THINKING = minimal | low | medium | high | default (не передавать параметр).
const THINKING_LEVELS = ['minimal', 'low', 'medium', 'high'];
export const DEFAULT_THINKING = 'low';

export function thinkingConfig(model, level) {
  if (!THINKING_LEVELS.includes(level)) return null;
  if (/^gemini-2\./.test(model)) {
    // У моделей 2.x вместо уровня — бюджет токенов (0 = без размышлений).
    return { thinkingBudget: { minimal: 0, low: 1024, medium: 4096, high: -1 }[level] };
  }
  return { thinkingLevel: level };
}

async function callModel(model, apiKey, input, signal, thinking) {
  const generationConfig = { responseMimeType: 'application/json' };
  if (thinking) generationConfig.thinkingConfig = thinking;
  const res = await fetch(`${API_BASE}/${encodeURIComponent(model)}:generateContent`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-goog-api-key': apiKey },
    signal,
    body: JSON.stringify({
      contents: [{
        role: 'user',
        parts: [
          { inline_data: { mime_type: input.mimeType, data: input.data } },
          { text: buildPrompt(input) },
        ],
      }],
      generationConfig,
    }),
  });
  const text = await res.text();
  let json = null;
  try { json = JSON.parse(text); } catch { /* разберём ниже */ }
  return { ok: res.ok, status: res.status, json, text };
}

// Достаём JSON из ответа модели, даже если он обёрнут в ```json … ```.
export function extractJson(text) {
  if (!text) return null;
  const cleaned = text.replace(/^﻿/, '').replace(/```(?:json)?/gi, '').trim();
  try { return JSON.parse(cleaned); } catch { /* ищем фигурные скобки */ }
  const a = cleaned.indexOf('{');
  const b = cleaned.lastIndexOf('}');
  if (a === -1 || b <= a) return null;
  try { return JSON.parse(cleaned.slice(a, b + 1)); } catch { return null; }
}

const str = (v) => (v === null || v === undefined ? '' : String(v)).trim();

function normType(t) {
  const s = str(t).toLowerCase();
  if (ERROR_TYPES.includes(s)) return s;
  if (s.startsWith('вычисл') || s.includes('арифм')) return 'вычислительная';
  if (s.includes('знак')) return 'знак';
  if (s.includes('правил')) return 'правило';
  if (s.includes('понима')) return 'понимание';
  if (s.includes('оформ')) return 'оформление';
  return 'понимание';
}

// Приводим ответ модели к ожидаемой форме, чтобы интерфейс не ломался.
export function normalizeResult(raw, max) {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null;
  const status = STATUSES.includes(str(raw.status).toLowerCase()) ? str(raw.status).toLowerCase() : null;
  let score = Number(String(raw.score ?? '').replace(',', '.'));
  if (!Number.isFinite(score)) score = status === 'correct' ? max : 0;
  score = Math.min(max, Math.max(0, Math.round(score * 2) / 2));
  const lines = Array.isArray(raw.recognized_lines) ? raw.recognized_lines.map(str) : [];
  const errors = Array.isArray(raw.errors) ? raw.errors
    .filter((e) => e && typeof e === 'object')
    .map((e) => {
      const line = parseInt(e.line, 10);
      return {
        line: Number.isFinite(line) && line > 0 ? line : null,
        student: str(e.student),
        correct: str(e.correct),
        type: normType(e.type),
        explanation: str(e.explanation),
      };
    }) : [];
  const finalStatus = status || (errors.length ? (score > 0 ? 'partial' : 'wrong') : 'correct');
  return {
    status: finalStatus,
    score: finalStatus === 'unreadable' ? 0 : score,
    max,
    topic: str(raw.topic),
    task: str(raw.task),
    correct_answer: str(raw.correct_answer),
    student_answer: str(raw.student_answer),
    recognized_lines: lines,
    strengths: str(raw.strengths),
    errors,
    student_feedback: str(raw.student_feedback),
    practice_task: str(raw.practice_task),
    teacher_note: str(raw.teacher_note),
  };
}


// Если модель молчит дольше этого времени, параллельно запускаем запрос к следующей
// и берём тот ответ, который придёт первым. GEMINI_HEDGE_SECONDS=0 отключает это.
// По умолчанию ждём дольше обычного времени ответа (на уровне low это 8–11 с),
// чтобы не слать второй запрос, когда первый вот-вот придёт.
const HEDGE_DEFAULT_SECONDS = { minimal: 12, low: 15, medium: 25, high: 35 };
const MAX_PARALLEL = 2;   // одновременно не больше двух запросов
const MAX_ATTEMPTS = 4;   // всего не больше четырёх запросов на одну работу
const TOTAL_TIMEOUT_MS = 110_000;

export function hedgeDelayMs(env, level) {
  const raw = env.GEMINI_HEDGE_SECONDS;
  if (raw !== undefined && String(raw).trim() !== '') {
    const n = Number(String(raw).replace(',', '.'));
    if (Number.isFinite(n) && n >= 0) return n * 1000;
  }
  return (HEDGE_DEFAULT_SECONDS[level] ?? 20) * 1000;
}

// Разбор ответа 429: это суточный лимит или поминутный, и через сколько секунд можно повторить.
export function parseQuota(json, text) {
  const msg = json?.error?.message || text || '';
  const daily = /per day|perday/i.test(msg);
  let seconds = null;
  const m = /retry in\s+(?:(\d+)h)?(?:(\d+)m)?(?:([\d.]+)s)?/i.exec(msg);
  if (m && (m[1] || m[2] || m[3])) {
    seconds = (Number(m[1]) || 0) * 3600 + (Number(m[2]) || 0) * 60 + (parseFloat(m[3]) || 0);
  } else {
    const d = (json?.error?.details || []).find((x) => typeof x?.retryDelay === 'string')?.retryDelay; // например "53257s"
    if (d && /^[\d.]+s$/.test(d)) seconds = parseFloat(d);
  }
  return { daily, seconds };
}

export function humanDelay(seconds) {
  if (seconds >= 3600) {
    const h = Math.floor(seconds / 3600);
    const min = Math.round((seconds % 3600) / 60);
    return min ? `${h} ч ${min} мин` : `${h} ч`;
  }
  if (seconds >= 60) return `${Math.round(seconds / 60)} мин`;
  return `${Math.max(1, Math.round(seconds))} с`;
}

function quotaError(model, daily, seconds) {
  const wait = seconds ? ` Лимит обновится через ${humanDelay(seconds)}.` : '';
  const e = daily
    ? new CheckError('quota_day', `Дневной лимит бесплатного тарифа Gemini для модели ${model} исчерпан.${wait} Чтобы снять ограничение, подключите оплату в Google AI Studio.`, 429)
    : new CheckError('rate_limit', `Превышен лимит запросов к ИИ.${seconds ? ` Повторите через ${humanDelay(seconds)}.` : ' Подождите минуту и повторите.'}`, 429);
  e.retrySeconds = seconds;
  return e;
}

// Модель с исчерпанным лимитом не трогаем, пока лимит не обновится: каждый лишний запрос
// к ней — потерянная секунда. Хранится в памяти процесса.
const blockedUntil = new Map(); // модель → { until, daily }
export function resetBlocked() { blockedUntil.clear(); }

// Итоговая ошибка, когда не ответила ни одна модель.
function finalError(failures) {
  const quota = failures.filter((f) => f.error.code === 'quota_day');
  if (quota.length && quota.length === failures.length) {
    const waits = quota.map((f) => f.error.retrySeconds).filter(Boolean);
    const wait = waits.length ? ` Ближайшее обновление — через ${humanDelay(Math.min(...waits))}.` : '';
    return new CheckError('quota_day', `Дневной лимит бесплатного тарифа Gemini исчерпан.${wait} Чтобы снять ограничение, подключите оплату в Google AI Studio.`, 429);
  }
  if (quota.length) {
    const busy = failures.some((f) => f.error.code === 'overloaded');
    return new CheckError('quota_day', `Дневной лимит бесплатного тарифа для ${quota[0].model} исчерпан, а запасные модели Gemini сейчас ${busy ? 'перегружены' : 'не ответили'}. Нажмите «Повторить» через минуту или подключите оплату в Google AI Studio.`, 429);
  }
  // «Модель не найдена» — наименее полезное сообщение, показываем его только если других нет.
  return (failures.find((f) => f.error.code !== 'no_model') || failures[0])?.error
    || new CheckError('upstream', 'Сервис ИИ недоступен. Попробуйте ещё раз.', 502);
}

// Ошибка, после которой нет смысла пробовать другие модели (например, неверный ключ).
const fatal =(code, message, status) => Object.assign(new CheckError(code, message, status), { fatal: true });

// Один запрос к одной модели: возвращает готовый результат или бросает CheckError.
async function attempt(model, apiKey, input, level, signal) {
  let r;
  try {
    const thinking = thinkingConfig(model, level);
    r = await callModel(model, apiKey, input, signal, thinking);
    // Модель не поддерживает этот уровень размышлений — повторяем без параметра.
    if (thinking && r.status === 400 && /thinking/i.test(r.json?.error?.message || r.text)) {
      console.warn(`[gemini ${model}] не принимает ${JSON.stringify(thinking)}, повтор без него`);
      r = await callModel(model, apiKey, input, signal, null);
    }
  } catch (e) {
    if (e.name === 'AbortError') throw new CheckError('timeout', 'ИИ слишком долго не отвечает. Попробуйте ещё раз.', 504);
    throw new CheckError('upstream_network', 'Сервер не смог связаться с Google Gemini.', 502);
  }
  if (r.status === 404) {
    throw new CheckError('no_model', `Модель Gemini не найдена (${model}). Укажите доступную модель в GEMINI_MODEL.`, 502);
  }
  if (!r.ok) {
    const msg = r.json?.error?.message || r.text.slice(0, 300);
    console.error(`[gemini ${model}] HTTP ${r.status}: ${msg}`);
    if (r.status === 503 || r.status === 500) throw new CheckError('overloaded', 'Сервис Gemini сейчас перегружен. Подождите минуту и нажмите «Повторить».', 503);
    if (r.status === 429) {
      const q = parseQuota(r.json, r.text);
      if (q.seconds) blockedUntil.set(model, { until: Date.now() + Math.min(q.seconds, 86_400) * 1000, daily: q.daily });
      throw quotaError(model, q.daily, q.seconds);
    }
    if (r.status === 400 && /api key/i.test(msg)) throw fatal('bad_key', 'Ключ GEMINI_API_KEY недействителен.', 500);
    if (r.status === 401 || r.status === 403) throw fatal('bad_key', 'Ключ GEMINI_API_KEY недействителен или не имеет доступа к модели.', 500);
    throw new CheckError('upstream', `Сервис ИИ вернул ошибку (${r.status}). Попробуйте ещё раз.`, 502);
  }
  const cand = r.json?.candidates?.[0];
  const text = (cand?.content?.parts || [])
    .filter((p) => typeof p.text === 'string' && !p.thought)
    .map((p) => p.text).join('');
  if (!text) {
    const reason = cand?.finishReason || r.json?.promptFeedback?.blockReason || 'нет текста';
    console.error(`[gemini ${model}] пустой ответ: ${reason}`);
    throw new CheckError('empty', 'ИИ не вернул ответ. Попробуйте ещё раз или сделайте фото чётче.', 502);
  }
  const result = normalizeResult(extractJson(text), input.max);
  if (!result) {
    console.error(`[gemini ${model}] не JSON:`, text.slice(0, 500));
    throw new CheckError('bad_json', 'ИИ ответил в неожиданном формате. Попробуйте ещё раз.', 502);
  }
  // Расход токенов — из него считается себестоимость одной проверки.
  const u = r.json?.usageMetadata || {};
  const tokensIn = u.promptTokenCount ?? null;
  const tokensOut = u.candidatesTokenCount ?? null;
  // Если размышления не указаны отдельно, берём разницу с общим числом токенов.
  const tokensThink = u.thoughtsTokenCount
    ?? (u.totalTokenCount != null && tokensIn != null ? Math.max(0, u.totalTokenCount - tokensIn - (tokensOut ?? 0)) : null);
  result.usage = { input: tokensIn, output: tokensOut, thinking: tokensThink };
  return result;
}

export async function checkWork(body, env = process.env) {
  const apiKey = env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new CheckError('no_key', 'На сервере не задан ключ GEMINI_API_KEY. Добавьте его в переменные окружения и перезапустите сервер.', 500);
  }
  const input = validateInput(body);
  const level = (env.GEMINI_THINKING || DEFAULT_THINKING).trim().toLowerCase();
  const hedge = hedgeDelayMs(env, level);

  // Очередь попыток: основная модель, затем запасные (у каждой свой лимит запросов),
  // и в самом конце ещё раз основная — на случай, если перегрузка была минутной.
  const primary = (env.GEMINI_MODEL || '').trim() || FALLBACK_MODELS[0];
  const failures = []; // { model, error } — что пошло не так с каждой моделью
  const available = [primary, ...FALLBACK_MODELS.filter((m) => m !== primary)].filter((model) => {
    const b = blockedUntil.get(model);
    if (!b || b.until <= Date.now()) return true;
    failures.push({ model, error: quotaError(model, b.daily, (b.until - Date.now()) / 1000) }); // лимит ещё не обновился
    return false;
  });
  const queue = available.includes(primary) ? [...available, primary] : available;
  if (!queue.length) throw finalError(failures);
  const dead = new Set(); // модели, которые нет смысла пробовать снова (не найдена, исчерпан лимит)
  let budget = MAX_ATTEMPTS;

  const controllers = [];
  const pending = new Map(); // номер попытки → промис с её исходом
  let seq = 0;
  let expired = false;
  const deadline = setTimeout(() => { expired = true; controllers.forEach((c) => c.abort()); }, TOTAL_TIMEOUT_MS);

  const nextModel = () => {
    while (queue.length && dead.has(queue[0])) queue.shift();
    return budget > 0 ? queue[0] : undefined;
  };
  const launch = () => {
    const model = nextModel();
    queue.shift();
    budget--;
    const id = ++seq;
    const ctrl = new AbortController();
    controllers.push(ctrl);
    pending.set(id, attempt(model, apiKey, input, level, ctrl.signal)
      .then((result) => ({ id, model, result }), (error) => ({ id, model, error })));
  };

  try {
    launch();
    while (pending.size) {
      const racers = [...pending.values()];
      let hedgeTimer;
      if (hedge > 0 && pending.size < MAX_PARALLEL && nextModel()) {
        racers.push(new Promise((resolve) => { hedgeTimer = setTimeout(() => resolve({ hedge: true }), hedge); }));
      }
      const settled = await Promise.race(racers);
      clearTimeout(hedgeTimer);
      if (expired) break;
      if (settled.hedge) {
        console.warn(`[gemini] нет ответа ${hedge / 1000} с — параллельно запускаем ${nextModel()}`);
        launch();
        continue;
      }
      pending.delete(settled.id);
      if (settled.result) return { ...settled.result, model: settled.model };
      const e = settled.error;
      if (e.fatal) throw e;
      // Промах по имени модели и исчерпанный лимит обходятся почти бесплатно — попыткой не считаем.
      if (e.code === 'no_model' || e.code === 'quota_day' || e.code === 'rate_limit') { dead.add(settled.model); budget++; }
      failures.push({ model: settled.model, error: e });
      if (!pending.size && nextModel()) launch();
    }
    if (expired) throw new CheckError('timeout', 'ИИ слишком долго не отвечает. Попробуйте ещё раз.', 504);
    throw finalError(failures);
  } finally {
    clearTimeout(deadline);
    controllers.forEach((c) => c.abort()); // отменяем запросы, которые уже не нужны
  }
}

// Ограничение частоты для публичного сайта: не больше RATE_LIMIT_PER_HOUR проверок
// с одного IP за час (по умолчанию 30, 0 — без ограничения). Счётчик живёт в памяти
// экземпляра функции, поэтому это защита от случайного перерасхода, а не от атаки:
// жёсткий потолок трат задаётся бюджетом в Google Cloud.
const hits = new Map(); // ip → время последних проверок
export function allowRequest(ip, env = process.env, now = Date.now()) {
  const raw = env.RATE_LIMIT_PER_HOUR;
  const limit = raw === undefined || String(raw).trim() === '' ? 30 : Number(raw);
  if (!ip || !Number.isFinite(limit) || limit <= 0) return true;
  const recent = (hits.get(ip) || []).filter((t) => now - t < 3_600_000);
  if (recent.length >= limit) { hits.set(ip, recent); return false; }
  recent.push(now);
  hits.set(ip, recent);
  if (hits.size > 10_000) hits.clear();
  return true;
}

export const RATE_LIMITED = {
  ok: false,
  code: 'rate_limit_ip',
  error: 'Слишком много проверок с этого устройства за час. Попробуйте позже или включите «Демо-режим» в шапке.',
};

// Общий обработчик: принимает разобранное тело, возвращает [статус, объект].
export async function handleCheck(body, env) {
  try {
    return [200, { ok: true, result: await checkWork(body, env) }];
  } catch (e) {
    if (e instanceof CheckError) return [e.status, { ok: false, code: e.code, error: e.message }];
    console.error(e);
    return [500, { ok: false, code: 'internal', error: 'Внутренняя ошибка сервера.' }];
  }
}
