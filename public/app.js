import { renderSample, demoResult, stackIds } from './sample.js';

/* ===== Константы ===== */
const STORE_KEY = 'daptery.works.v1';
const DEMO_KEY = 'daptery.demo';
const MAX_SIDE = 1600;
const MANUAL_SECONDS = 150;       // ручная проверка ≈ 2,5 мин
const DEMO_ASSUMED_SECONDS = 15;  // для счётчика экономии: столько занимает живая проверка ИИ
const REQUEST_TIMEOUT = 120_000;
const MAX_QUEUE = 40;

const TYPES = [
  { key: 'calc', name: 'вычислительная', hint: 'Стоит потренировать вычисления и привычку делать проверку.' },
  { key: 'sign', name: 'знак', hint: 'Стоит повторить правила знаков: раскрытие скобок и перенос слагаемых.' },
  { key: 'rule', name: 'правило', hint: 'Стоит повторить правила по этой теме.' },
  { key: 'concept', name: 'понимание', hint: 'Стоит ещё раз разобрать эту тему с классом.' },
  { key: 'format', name: 'оформление', hint: 'Стоит напомнить требования к оформлению решения.' },
];
const TYPE_BY_NAME = Object.fromEntries(TYPES.map((t) => [t.name, t]));

const STATUS = {
  correct: { label: 'Верно', icon: '<path d="M20 6 9 17l-5-5"/>' },
  partial: { label: 'Частично верно', icon: '<path d="M12 3a9 9 0 1 0 0 18V3z" fill="currentColor" stroke="none"/><circle cx="12" cy="12" r="9"/>' },
  wrong: { label: 'Неверно', icon: '<path d="M6 6l12 12M18 6 6 18"/>' },
  unreadable: { label: 'Неразборчиво', icon: '<path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z"/><path d="M3 3l18 18"/>' },
};

const CAPTIONS = [
  [0, 'Распознаю почерк…'],
  [1.5, 'Решаю задачу…'],
  [3.5, 'Сверяю шаги…'],
  [6, 'Пишу объяснение…'],
  [20, 'Gemini отвечает дольше обычного, жду…'],
];
const DEMO_CAPTION = 'Демо-режим: показываю подготовленный разбор…';

const QUEUE_STATUS = { wait: 'ожидает', run: 'проверяется…', done: 'готово', error: 'ошибка' };

const DEMO_NAMES = ['Айгерим С.', 'Нурлан К.', 'Дана М.', 'Арман Т.', 'Алия Б.', 'Ерлан Ж.', 'Мадина О.', 'Тимур А.', 'Аружан Е.', 'Санжар Н.'];

/* ===== Утилиты ===== */
const $ = (id) => document.getElementById(id);
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const fmt = (n, d = 1) => Number(n).toLocaleString('ru-RU', { maximumFractionDigits: d, minimumFractionDigits: 0 });
const fmtFixed = (n) => Number(n).toLocaleString('ru-RU', { minimumFractionDigits: 1, maximumFractionDigits: 1 });
const icon = (paths) => `<svg viewBox="0 0 24 24" aria-hidden="true">${paths}</svg>`;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
const isTouch = matchMedia('(pointer: coarse)').matches;

function plural(n, one, few, many) {
  const m10 = n % 10, m100 = n % 100;
  if (m10 === 1 && m100 !== 11) return one;
  if (m10 >= 2 && m10 <= 4 && (m100 < 12 || m100 > 14)) return few;
  return many;
}

function level(pct) {
  if (pct == null) return 'na';
  if (pct >= 0.8) return 'ok';
  if (pct >= 0.5) return 'warn';
  return 'bad';
}

/* ===== Состояние ===== */
const state = {
  photo: null,        // одна работа: { dataUrl, width, height, bytes, source, sampleId? }
  queue: [],          // стопка: [{ id, photo, name, status, error, workId }]
  pending: null,      // что повторять по кнопке «Повторить»
  works: loadWorks(),
  currentId: null,
  busy: false,
  loadTimer: null,
  demo: loadDemo(),
};

function loadWorks() {
  try {
    const raw = sessionStorage.getItem(STORE_KEY);
    const arr = raw ? JSON.parse(raw) : [];
    return Array.isArray(arr) ? arr : [];
  } catch { return []; }
}

function saveWorks() {
  try {
    sessionStorage.setItem(STORE_KEY, JSON.stringify(state.works));
  } catch {
    // Переполнение хранилища — убираем миниатюры у старых работ и пробуем ещё раз.
    try {
      state.works.forEach((w, i) => { if (i < state.works.length - 1) w.thumb = null; });
      sessionStorage.setItem(STORE_KEY, JSON.stringify(state.works));
    } catch { /* работаем без сохранения */ }
  }
}

function loadDemo() {
  try { return localStorage.getItem(DEMO_KEY) === '1'; } catch { return false; }
}

const finalScore = (w) => (w.teacherScore ?? w.result.score);
const workPct = (w) => (w.result.status === 'unreadable' && w.teacherScore == null ? null : finalScore(w) / w.max);

/* ===== Тема ===== */
$('themeBtn').addEventListener('click', () => {
  const root = document.documentElement;
  const dark = root.dataset.theme ? root.dataset.theme === 'dark' : matchMedia('(prefers-color-scheme: dark)').matches;
  root.dataset.theme = dark ? 'light' : 'dark';
  try { localStorage.setItem('daptery.theme', root.dataset.theme); } catch { /* ок */ }
});

/* ===== Демо-режим ===== */
// В демо-режиме сгенерированные примеры разбираются по подготовленному ключу, без запроса к ИИ.
// Такие работы всегда помечены как «демо-разбор». Загруженные фото проверяет только ИИ.
function renderDemo() {
  $('demoBtn').setAttribute('aria-pressed', String(state.demo));
  $('demoNote').hidden = !state.demo;
}

$('demoBtn').addEventListener('click', () => {
  state.demo = !state.demo;
  try { localStorage.setItem(DEMO_KEY, state.demo ? '1' : '0'); } catch { /* ок */ }
  renderDemo();
  toast(state.demo ? 'Демо-режим включён: примеры разбираются без ИИ' : 'Демо-режим выключен: примеры проверяет ИИ');
});

const canDemo = (photo) => !!photo?.sampleId;

/* ===== Тост ===== */
let toastTimer;
function toast(msg) {
  const t = $('toast');
  t.textContent = msg;
  t.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.remove('show'), 2800);
}

/* ===== Фото: загрузка и сжатие ===== */
const dropzone = $('dropzone');
const fileInput = $('fileInput');
const galleryInput = $('galleryInput');

if (isTouch) {
  fileInput.setAttribute('capture', 'environment');
  fileInput.removeAttribute('multiple');
  $('galleryBtn').hidden = false;
  $('galleryBtn').textContent = 'Выбрать из галереи (можно несколько)';
  $('dzTitle').textContent = 'Сфотографировать работу';
  $('dzHint').textContent = 'Откроется камера. Держите телефон ровно над тетрадью';
}

dropzone.addEventListener('click', (e) => {
  if (e.target.closest('#galleryBtn')) return;
  fileInput.click();
});
dropzone.addEventListener('keydown', (e) => {
  if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); fileInput.click(); }
});
$('galleryBtn').addEventListener('click', (e) => { e.stopPropagation(); galleryInput.click(); });
fileInput.addEventListener('change', () => { handleFiles(fileInput.files); fileInput.value = ''; });
galleryInput.addEventListener('change', () => { handleFiles(galleryInput.files); galleryInput.value = ''; });

['dragenter', 'dragover'].forEach((ev) => dropzone.addEventListener(ev, (e) => {
  e.preventDefault();
  dropzone.classList.add('drag');
}));
['dragleave', 'drop'].forEach((ev) => dropzone.addEventListener(ev, (e) => {
  e.preventDefault();
  if (ev === 'dragleave' && dropzone.contains(e.relatedTarget)) return;
  dropzone.classList.remove('drag');
}));
// Файл можно бросить в любое место страницы: браузер не откроет его вместо приложения.
window.addEventListener('dragover', (e) => e.preventDefault());
window.addEventListener('drop', (e) => {
  e.preventDefault();
  if (e.dataTransfer?.files?.length) handleFiles(e.dataTransfer.files);
});

document.addEventListener('paste', (e) => {
  const items = [...(e.clipboardData?.items || [])];
  const item = items.find((i) => i.kind === 'file' && i.type.startsWith('image/'));
  if (!item) return;
  e.preventDefault();
  handleFiles([item.getAsFile()]);
});

const isImage = (f) => f && (f.type.startsWith('image/') || /\.(jpe?g|png|webp|heic|heif|gif|bmp)$/i.test(f.name || ''));

async function handleFiles(files) {
  const all = [...(files || [])].filter(Boolean);
  const list = all.filter(isImage);
  if (!list.length) {
    if (all.length) toast('Это не изображение. Загрузите фото работы.');
    return;
  }
  if (state.busy) { toast('Дождитесь окончания проверки'); return; }

  // Одно фото и стопки ещё нет — обычная проверка одной работы.
  if (list.length === 1 && !state.queue.length) {
    try {
      setPhoto({ ...(await compressImage(list[0])), source: 'upload' });
    } catch {
      toast('Не удалось открыть фото. Попробуйте JPEG или PNG.');
    }
    return;
  }

  // Несколько фото — собираем стопку.
  moveSingleToQueue();
  let added = 0, failed = 0, skipped = 0;
  for (const f of list) {
    if (state.queue.length >= MAX_QUEUE) { skipped++; continue; }
    try {
      addToQueue({ ...(await compressImage(f)), source: 'upload' }, '');
      added++;
    } catch { failed++; }
  }
  renderInput();
  const notes = [];
  if (failed) notes.push(`не открылось: ${failed}`);
  if (skipped) notes.push(`сверх лимита в ${MAX_QUEUE}: ${skipped}`);
  toast(`В стопку добавлено: ${added}${notes.length ? ' (' + notes.join(', ') + ')' : ''}`);
}

// Картинку ждём по событию load, а не через img.decode(): decode() не завершается, пока
// вкладка в фоне, и проверка зависала бы, если учитель переключился на другую вкладку.
function loadImage(src, timeoutMs = 8000) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const timer = setTimeout(() => reject(new Error('image load timeout')), timeoutMs);
    img.onload = () => { clearTimeout(timer); resolve(img); };
    img.onerror = () => { clearTimeout(timer); reject(new Error('image load failed')); };
    img.src = src;
  });
}

async function decode(blob) {
  if ('createImageBitmap' in window) {
    try { return await createImageBitmap(blob, { imageOrientation: 'from-image' }); } catch { /* запасной путь */ }
  }
  const url = URL.createObjectURL(blob);
  try {
    return await loadImage(url);
  } finally {
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
}

function toJpeg(source, srcW, srcH, maxSide, quality) {
  const scale = Math.min(1, maxSide / Math.max(srcW, srcH));
  const w = Math.max(1, Math.round(srcW * scale));
  const h = Math.max(1, Math.round(srcH * scale));
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  const ctx = c.getContext('2d');
  ctx.fillStyle = '#fff';
  ctx.fillRect(0, 0, w, h);
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(source, 0, 0, w, h);
  const dataUrl = c.toDataURL('image/jpeg', quality);
  return { dataUrl, width: w, height: h, bytes: Math.round((dataUrl.length - 23) * 0.75) };
}

async function compressImage(blob) {
  const bmp = await decode(blob);
  const w = bmp.naturalWidth || bmp.width;
  const h = bmp.naturalHeight || bmp.height;
  const out = toJpeg(bmp, w, h, MAX_SIDE, 0.85);
  if (bmp.close) bmp.close();
  return out;
}

// Миниатюра — необязательное украшение: если она не получилась, работа сохраняется без неё.
async function makeThumb(dataUrl) {
  try {
    const img = await loadImage(dataUrl, 3000);
    return toJpeg(img, img.naturalWidth, img.naturalHeight, 360, 0.7).dataUrl;
  } catch { return null; }
}

function setPhoto(photo) {
  state.photo = photo;
  $('previewImg').src = photo.dataUrl;
  const kb = Math.round(photo.bytes / 1024);
  $('previewMeta').textContent = `${photo.source === 'sample' ? 'Сгенерированный пример · ' : ''}${photo.width}×${photo.height} px · ${kb} КБ · JPEG`;
  renderInput();
}

function clearPhoto() {
  state.photo = null;
  $('previewImg').removeAttribute('src');
  renderInput();
}

$('removeBtn').addEventListener('click', clearPhoto);

/* ===== Стопка работ ===== */
function addToQueue(photo, name) {
  state.queue.push({ id: uid(), photo, name: name || '', status: 'wait', error: null, workId: null });
}

// Если уже выбрана одна работа, а пользователь добавляет ещё — переносим её в стопку первой.
function moveSingleToQueue() {
  if (!state.photo) return;
  addToQueue(state.photo, $('studentName').value.trim());
  state.photo = null;
  $('previewImg').removeAttribute('src');
  $('studentName').value = '';
}

function renderQueueList() {
  const q = state.queue;
  $('queueTitle').textContent = `Стопка: ${q.length} ${plural(q.length, 'работа', 'работы', 'работ')}`;
  $('queueList').innerHTML = q.map((item, i) => `
    <li class="queue-item ${item.status}" data-id="${item.id}">
      <img class="queue-thumb" src="${item.photo.dataUrl}" alt="">
      <input class="queue-name" type="text" value="${esc(item.name)}" placeholder="Имя ученика" maxlength="60"
        autocomplete="off" aria-label="Имя ученика, работа ${i + 1}" ${state.busy || item.status === 'done' ? 'disabled' : ''}>
      <span class="q-status ${item.status}" ${item.error ? `title="${esc(item.error)}"` : ''}>${QUEUE_STATUS[item.status]}</span>
      <button type="button" class="q-remove" aria-label="Убрать работу ${i + 1}" ${state.busy ? 'disabled' : ''}>
        ${icon('<path d="M6 6l12 12M18 6 6 18"/>')}
      </button>
    </li>`).join('');
}

// Показывает нужный блок ввода: зона загрузки, превью одной работы или стопка.
function renderInput() {
  const hasQueue = state.queue.length > 0;
  $('queue').hidden = !hasQueue;
  dropzone.hidden = hasQueue || !!state.photo;
  $('preview').hidden = hasQueue || !state.photo;
  $('nameField').hidden = hasQueue;
  if (hasQueue) renderQueueList();
  updateCheckBtn();
}

$('queueList').addEventListener('input', (e) => {
  const li = e.target.closest('.queue-item');
  const item = li && state.queue.find((q) => q.id === li.dataset.id);
  if (item && e.target.classList.contains('queue-name')) item.name = e.target.value;
});
$('queueList').addEventListener('click', (e) => {
  const li = e.target.closest('.queue-item');
  const item = li && state.queue.find((q) => q.id === li.dataset.id);
  if (!item) return;
  if (e.target.closest('.q-remove')) {
    if (state.busy) return;
    state.queue = state.queue.filter((q) => q !== item);
    renderInput();
  } else if (item.workId && (e.target.closest('.q-status') || e.target.closest('.queue-thumb'))) {
    openWork(item.workId);
  }
});
$('queueAddBtn').addEventListener('click', () => { if (!state.busy) galleryInput.click(); });
$('queueClearBtn').addEventListener('click', () => {
  if (state.busy) return;
  state.queue = [];
  renderInput();
});

function updateCheckBtn() {
  const hasQueue = state.queue.length > 0;
  const todo = state.queue.filter((q) => q.status !== 'done').length;
  const ready = hasQueue ? todo > 0 : !!state.photo;
  $('checkBtn').disabled = !ready || state.busy;
  $('checkBtnText').textContent = !hasQueue ? 'Проверить работу'
    : todo ? `Проверить ${todo} ${plural(todo, 'работу', 'работы', 'работ')}` : 'Стопка проверена';
  $('checkHint').hidden = ready || hasQueue;
  $('sampleBtn').disabled = state.busy;
  $('stackBtn').disabled = state.busy;
  document.querySelectorAll('.lang-seg button').forEach((b) => { b.disabled = state.busy; });
}

/* ===== Примеры ===== */
// Язык примера: русский или казахский. Запоминается в браузере.
const SAMPLE_LANG_KEY = 'daptery.sampleLang';
let sampleLang = 'ru';
try { if (localStorage.getItem(SAMPLE_LANG_KEY) === 'kz') sampleLang = 'kz'; } catch { /* ок */ }
const LANG_NAME = { ru: 'на русском', kz: 'на казахском' };

function renderSampleLang() {
  document.querySelectorAll('.lang-seg button').forEach((b) => {
    b.setAttribute('aria-checked', String(b.dataset.lang === sampleLang));
  });
}
document.querySelector('.lang-seg').addEventListener('click', (e) => {
  const b = e.target.closest('button[data-lang]');
  if (!b || state.busy) return;
  sampleLang = b.dataset.lang;
  try { localStorage.setItem(SAMPLE_LANG_KEY, sampleLang); } catch { /* ок */ }
  renderSampleLang();
});
document.querySelector('.lang-seg').addEventListener('keydown', (e) => {
  if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return;
  e.preventDefault();
  sampleLang = sampleLang === 'ru' ? 'kz' : 'ru';
  try { localStorage.setItem(SAMPLE_LANG_KEY, sampleLang); } catch { /* ок */ }
  renderSampleLang();
  document.querySelector(`.lang-seg button[data-lang="${sampleLang}"]`).focus();
});

// Пример строится под предмет, класс и язык, выбранные учителем; сами поля не меняются.
const sampleTarget = () => ({ subject: $('subject').value, grade: Number($('grade').value), lang: sampleLang });

async function samplePhoto(opts) {
  const s = await renderSample(opts);
  return {
    dataUrl: s.dataUrl, width: s.width, height: s.height,
    bytes: Math.round((s.dataUrl.length - 23) * 0.75),
    source: 'sample', sampleId: s.key, lang: s.lang, topic: s.topic,
  };
}

function pickNames(n) {
  const used = new Set([...state.works.map((w) => w.name), ...state.queue.map((q) => q.name)]);
  const free = DEMO_NAMES.filter((name) => !used.has(name)).sort(() => Math.random() - 0.5);
  const pool = [...free, ...DEMO_NAMES];
  return pool.slice(0, n);
}

$('sampleBtn').addEventListener('click', async () => {
  if (state.busy) return;
  $('sampleBtn').disabled = true;
  try {
    if (state.queue.length >= MAX_QUEUE) { toast(`В стопке уже ${MAX_QUEUE} работ`); return; }
    const photo = await samplePhoto(sampleTarget());
    if (state.queue.length) {
      addToQueue(photo, pickNames(1)[0]);
      renderInput();
    } else {
      setPhoto(photo);
      if (!$('studentName').value.trim()) $('studentName').value = pickNames(1)[0];
    }
    toast(`Пример готов ${LANG_NAME[photo.lang]}: ${photo.topic} — в работе спрятана ошибка`);
  } catch (e) {
    console.error(e);
    toast('Не удалось сгенерировать пример');
  } finally {
    updateCheckBtn();
  }
});

$('stackBtn').addEventListener('click', async () => {
  if (state.busy) return;
  $('stackBtn').disabled = true;
  try {
    moveSingleToQueue();
    const { subject, grade, lang } = sampleTarget();
    const keys = stackIds(subject, grade, lang);
    const names = pickNames(keys.length);
    let added = 0;
    for (const [i, key] of keys.entries()) {
      if (state.queue.length >= MAX_QUEUE) break;
      addToQueue(await samplePhoto({ key }), names[i]);
      added++;
      renderInput();
    }
    toast(`Стопка готова ${LANG_NAME[lang]}: ${added} ${plural(added, 'работа', 'работы', 'работ')} · ${$('subject').selectedOptions[0].text}, ${grade} класс`);
  } catch (e) {
    console.error(e);
    toast('Не удалось сгенерировать стопку');
  } finally {
    renderInput();
  }
});

/* ===== Состояния правой колонки ===== */
function showState(name) {
  for (const s of ['empty', 'loading', 'error', 'result']) $(`${s}State`).hidden = s !== name;
}

function startLoading(photo, { demo = false, batch = '' } = {}) {
  showState('loading');
  $('loadingImg').src = photo.dataUrl;
  $('loadingBatch').hidden = !batch;
  $('loadingBatch').textContent = batch;
  const caption = $('loadingCaption');
  const timer = $('loadingTimer');
  const t0 = performance.now();
  let idx = -1;
  const tick = () => {
    const sec = (performance.now() - t0) / 1000;
    timer.textContent = fmtFixed(sec);
    if (demo) {
      caption.textContent = DEMO_CAPTION;
      return;
    }
    let i = 0;
    while (i + 1 < CAPTIONS.length && sec >= CAPTIONS[i + 1][0]) i++;
    if (i !== idx) {
      idx = i;
      caption.textContent = CAPTIONS[i][1];
      caption.classList.remove('swap');
      void caption.offsetWidth;
      caption.classList.add('swap');
    }
  };
  tick();
  clearInterval(state.loadTimer);
  state.loadTimer = setInterval(tick, 100);
}

function stopLoading() {
  clearInterval(state.loadTimer);
  state.loadTimer = null;
}

function showError(message, offerDemo = false) {
  $('errorText').textContent = message;
  $('demoResultBtn').hidden = !offerDemo;
  $('demoResultHint').hidden = !offerDemo;
  showState('error');
}

/* ===== Проверка ===== */
function readParams() {
  const max = Math.min(100, Math.max(1, Math.round(Number($('maxScore').value) || 10)));
  $('maxScore').value = max;
  return {
    subject: $('subject').value,
    grade: Number($('grade').value),
    max,
    criteria: $('criteria').value.trim(),
    // Имя ученика сюда намеренно не входит — оно остаётся в браузере.
  };
}

// Запрос к серверной функции. Возвращает результат или бросает ошибку с понятным текстом.
async function requestCheck(payload) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT);
  try {
    const res = await fetch('/api/check', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });
    const text = await res.text();
    let data = null;
    try { data = JSON.parse(text); } catch { data = null; }
    if (!data) {
      throw new Error(res.ok
        ? 'Сервер вернул ответ в неожиданном формате. Попробуйте ещё раз.'
        : `Сервер недоступен (код ${res.status}). Проверьте, что он запущен, и попробуйте ещё раз.`);
    }
    if (!data.ok || !data.result) throw new Error(data.error || 'Не удалось получить результат проверки. Попробуйте ещё раз.');
    return data.result;
  } catch (e) {
    if (e.name === 'AbortError') throw new Error('Проверка заняла слишком много времени. Проверьте интернет и попробуйте ещё раз.');
    if (e instanceof TypeError) throw new Error('Нет связи с сервером. Проверьте подключение к интернету и попробуйте ещё раз.');
    throw e;
  } finally {
    clearTimeout(timeout);
  }
}

async function demoCheck(photo, max) {
  await sleep(1500 + Math.random() * 800);
  const result = demoResult(photo.sampleId, max);
  if (!result) throw new Error('Для этого фото нет подготовленного демо-разбора.');
  return result;
}

const usesDemo = (photo, forceDemo) => canDemo(photo) && (forceDemo || state.demo);

async function checkOne(photo, params, forceDemo) {
  const demo = usesDemo(photo, forceDemo);
  const t0 = performance.now();
  const result = demo ? await demoCheck(photo, params.max) : await requestCheck({ image: photo.dataUrl, ...params });
  return { result, demo, seconds: Math.round((performance.now() - t0) / 100) / 10 };
}

async function addWork(name, params, photo, { result, demo, seconds }) {
  const work = {
    id: uid(),
    n: (state.works.at(-1)?.n || 0) + 1,
    name,
    subject: params.subject,
    grade: params.grade,
    max: params.max,
    seconds: demo ? null : seconds, // у демо-разбора нет настоящего времени проверки
    demo,
    result,
    teacherScore: null,
    confirmed: false,
    thumb: await makeThumb(photo.dataUrl),
    at: Date.now(),
  };
  state.works.push(work);
  saveWorks();
  return work;
}

const scrollToResult = () => {
  if (window.innerWidth <= 1000) $('resultCard').scrollIntoView({ behavior: 'smooth', block: 'start' });
};

$('checkBtn').addEventListener('click', () => {
  if (state.busy) return;
  if (state.queue.length) { runBatch(); return; }
  if (!state.photo) return;
  state.pending = { params: readParams(), name: $('studentName').value.trim(), photo: state.photo };
  runSingle();
});

$('retryBtn').addEventListener('click', () => {
  if (state.busy || !state.pending) return;
  if (state.pending.batch) runBatch(); else runSingle();
});
$('demoResultBtn').addEventListener('click', () => {
  if (state.busy || !state.pending) return;
  if (state.pending.batch) runBatch(true); else runSingle(true);
});

async function runSingle(forceDemo = false) {
  const { params, name, photo } = state.pending;
  state.busy = true;
  updateCheckBtn();
  const demo = usesDemo(photo, forceDemo);
  startLoading(photo, { demo });
  scrollToResult();

  let out = null;
  let errorMsg = null;
  try {
    out = await checkOne(photo, params, forceDemo);
  } catch (e) {
    errorMsg = e.message || 'Не удалось проверить работу. Попробуйте ещё раз.';
  }
  stopLoading();
  state.busy = false;
  updateCheckBtn();

  if (errorMsg) {
    showError(errorMsg, canDemo(photo) && !demo);
    return;
  }
  const work = await addWork(name, params, photo, out);
  state.currentId = work.id;
  renderResult(work);
  renderAll(true);
}

async function runBatch(forceDemo = false) {
  const items = state.queue.filter((q) => q.status !== 'done');
  if (!items.length) return;
  const params = readParams();
  state.pending = { batch: true };
  state.busy = true;
  renderInput();
  scrollToResult();

  const tAll = performance.now();
  let lastWork = null;
  let firstError = null;
  let failsInRow = 0;
  let stopped = false;
  for (const [i, item] of items.entries()) {
    item.status = 'run';
    item.error = null;
    renderInput();
    const label = `Работа ${i + 1} из ${items.length}${item.name.trim() ? ' · ' + item.name.trim() : ''}`;
    startLoading(item.photo, { demo: usesDemo(item.photo, forceDemo), batch: label });
    try {
      const out = await checkOne(item.photo, params, forceDemo);
      const work = await addWork(item.name.trim(), params, item.photo, out);
      item.status = 'done';
      item.workId = work.id;
      lastWork = work;
      failsInRow = 0;
      renderAll(true); // аналитика класса растёт на глазах
    } catch (e) {
      item.status = 'error';
      item.error = e.message || 'Не удалось проверить работу.';
      firstError ??= item.error;
      failsInRow++;
    }
    stopLoading();
    // Две ошибки подряд — скорее всего, сервис недоступен: не заставляем ждать всю стопку.
    if (failsInRow >= 2 && i < items.length - 1) { stopped = true; break; }
  }
  state.busy = false;
  renderInput();

  const done = items.filter((q) => q.status === 'done').length;
  const total = (performance.now() - tAll) / 1000;
  if (lastWork) {
    state.currentId = lastWork.id;
    renderResult(lastWork);
    renderTable();
  } else {
    const anyDemo = items.some((q) => canDemo(q.photo) && !usesDemo(q.photo, forceDemo));
    showError(firstError || 'Не удалось проверить работы.', anyDemo);
  }
  if (done === items.length) {
    toast(`Стопка проверена: ${done} ${plural(done, 'работа', 'работы', 'работ')} за ${fmtFixed(total)} с`);
  } else if (done) {
    toast(`Проверено ${done} из ${items.length}. ${stopped ? 'ИИ не отвечает — ' : ''}нажмите «Проверить» ещё раз`);
  }
  if (done) setTimeout(() => $('analytics').scrollIntoView({ behavior: 'smooth', block: 'start' }), 700);
}

/* ===== Отрисовка результата ===== */
const RING_R = 50;
const RING_C = 2 * Math.PI * RING_R;

function ringHtml(w) {
  const pct = workPct(w);
  const lv = level(pct);
  const offset = RING_C * (1 - (pct ?? 0));
  const scoreText = pct == null ? '—' : fmt(finalScore(w));
  return `
    <div class="ring ${lv}" id="ring">
      <svg viewBox="0 0 120 120" aria-hidden="true">
        <circle class="track" cx="60" cy="60" r="${RING_R}"/>
        <circle class="bar" cx="60" cy="60" r="${RING_R}" stroke-linecap="round"
          stroke-dasharray="${RING_C.toFixed(1)}" stroke-dashoffset="${RING_C.toFixed(1)}" data-offset="${offset.toFixed(1)}"/>
      </svg>
      <div class="ring-center">
        <div class="ring-score">${scoreText}<small>/${w.max}</small></div>
        <div class="ring-pct">${pct == null ? 'нет балла' : Math.round(pct * 100) + '%'}</div>
      </div>
    </div>`;
}

function animateRing() {
  const bar = document.querySelector('#ring .bar');
  if (!bar) return;
  requestAnimationFrame(() => requestAnimationFrame(() => { bar.style.strokeDashoffset = bar.dataset.offset; }));
}

function sameAnswer(a, b) {
  const norm = (s) => String(s || '').toLowerCase().replace(/[\s.]/g, '').replace(/[−–—]/g, '-').replace(',', '.');
  return norm(a) === norm(b);
}

function renderResult(w) {
  const r = w.result;
  const st = STATUS[r.status] || STATUS.wrong;
  const errLines = new Set(r.errors.map((e) => e.line).filter(Boolean));
  const unreadable = r.status === 'unreadable';

  const errorsHtml = r.errors.length ? `
    <div class="errs-title">Найденные ошибки <span class="count">${r.errors.length}</span></div>
    <div class="errs">
      ${r.errors.map((e) => {
        const t = TYPE_BY_NAME[e.type] || TYPES[3];
        return `
        <article class="err" data-t="${t.key}">
          <div class="err-top">
            <span class="type-chip" data-t="${t.key}">${esc(t.name)}</span>
            ${e.line ? `<button type="button" class="line-link" data-line="${e.line}">строка ${e.line}</button>` : ''}
          </div>
          ${(e.student || e.correct) ? `
          <div class="err-fix">
            ${e.student ? `<span class="was" aria-label="как написал ученик">${esc(e.student)}</span>` : ''}
            ${e.student && e.correct ? '<span class="arrow" aria-hidden="true">→</span>' : ''}
            ${e.correct ? `<span class="now" aria-label="как правильно">${esc(e.correct)}</span>` : ''}
          </div>` : ''}
          ${e.explanation ? `<p class="err-expl">${esc(e.explanation)}</p>` : ''}
        </article>`;
      }).join('')}
    </div>` : '';

  const linesHtml = r.recognized_lines.length
    ? `<ol class="lines">${r.recognized_lines.map((l, i) => `
        <li id="line-${i + 1}" class="${errLines.has(i + 1) ? 'has-err' : ''}"><span class="n">${i + 1}</span><span>${esc(l) || '<span class="dash">(пусто)</span>'}</span></li>`).join('')}</ol>`
    : '<p class="lines-empty">ИИ не смог распознать строки на фото.</p>';

  const mismatch = r.student_answer && r.correct_answer && !sameAnswer(r.student_answer, r.correct_answer);
  const answersHtml = (r.task || r.student_answer || r.correct_answer) ? `
    <div class="answers">
      ${r.task ? `<div class="ans ans--task"><div class="ans-label">Условие</div><div class="ans-val">${esc(r.task)}</div></div>` : ''}
      ${r.student_answer ? `<div class="ans ans--student"><div class="ans-label">Ответ ученика</div><div class="ans-val ${mismatch ? 'mismatch' : ''}">${esc(r.student_answer)}</div></div>` : ''}
      ${r.correct_answer ? `<div class="ans ans--right"><div class="ans-label">Верный ответ</div><div class="ans-val">${esc(r.correct_answer)}</div></div>` : ''}
    </div>` : '';

  const block = (cls, title, ic, text) => text ? `
    <section class="block ${cls}"><h3>${icon(ic)}${title}</h3><p>${esc(text)}</p></section>` : '';

  const aiScoreNote = w.teacherScore != null && w.teacherScore !== r.score
    ? `${w.demo ? 'В демо-разборе было' : 'ИИ предложил'} ${fmt(r.score)} из ${w.max}`
    : `${w.demo ? 'Балл из демо-разбора' : 'ИИ предлагает балл'} — последнее слово за вами`;
  const timeText = w.demo
    ? 'Демо-разбор без обращения к ИИ · вручную ≈ 2,5 мин'
    : `Проверено за ${fmtFixed(w.seconds)} с · вручную ≈ 2,5 мин`;

  $('resultState').innerHTML = `
    <div class="res-head">
      ${ringHtml(w)}
      <div class="res-summary">
        <div class="res-work">Работа №${w.n}${w.name ? ' · ' + esc(w.name) : ''}${w.demo ? ' <span class="demo-tag">демо-разбор</span>' : ''}</div>
        <span class="status ${r.status}">${icon(st.icon)}${st.label}</span>
        ${r.topic ? `<div class="res-topic">${esc(r.topic)}</div>` : ''}
        <div class="res-time">${icon('<path d="M13 2 4 14h7l-1 8 9-12h-7z"/>')}${timeText}</div>
      </div>
      ${w.thumb ? `<img class="res-thumb" src="${w.thumb}" alt="Фото работы">` : ''}
    </div>

    ${unreadable ? block('block--warn', 'Не удалось разобрать почерк', '<path d="M12 9v4M12 17v.01"/><path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z"/>',
      'Переснимите страницу при дневном свете, держа телефон ровно над тетрадью и без бликов. Или поставьте оценку вручную.') : ''}

    <div class="grade">
      <div class="grade-label">Оценка учителя<small id="aiNote">${aiScoreNote}</small></div>
      <div class="grade-ctrl">
        <input type="number" id="teacherScore" min="0" max="${w.max}" step="0.5" inputmode="decimal"
          value="${finalScore(w)}" aria-label="Оценка учителя">
        <span class="of">из ${w.max}</span>
        <button type="button" class="btn ${w.confirmed ? 'btn-confirmed' : 'btn-primary'}" id="confirmBtn">
          ${w.confirmed ? icon('<path d="M20 6 9 17l-5-5"/>') + 'Подтверждено' : 'Подтвердить'}
        </button>
      </div>
    </div>

    ${answersHtml}
    ${block('block--good', 'Что сделано верно', '<path d="M20 6 9 17l-5-5"/>', r.strengths)}
    ${errorsHtml}
    ${block('block--student', 'Объяснение для ученика', '<path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>', r.student_feedback)}
    ${block('block--practice', 'Задача для отработки', '<path d="M12 20h9M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z"/>', r.practice_task)}
    ${block('block--note', 'Заметка для учителя', '<path d="M4 4h16v12H5.2L4 17.2z"/><path d="M8 9h8M8 12h5"/>', r.teacher_note)}

    <details class="reading" id="reading">
      <summary>${icon('<path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/>')}Как ИИ прочитал работу
        <span class="muted">· ${r.recognized_lines.length} ${plural(r.recognized_lines.length, 'строка', 'строки', 'строк')}</span>
        <svg class="chev" viewBox="0 0 24 24" aria-hidden="true"><path d="m6 9 6 6 6-6"/></svg>
      </summary>
      ${linesHtml}
    </details>

    <div class="res-actions">
      <button type="button" class="btn btn-secondary" id="copyBtn">
        ${icon('<rect x="9" y="9" width="12" height="12" rx="2"/><path d="M5 15V5a2 2 0 0 1 2-2h10"/>')}Скопировать отзыв для ученика
      </button>
      <button type="button" class="btn btn-primary" id="nextBtn">
        ${icon('<path d="M5 12h14M13 6l6 6-6 6"/>')}Следующая работа
      </button>
    </div>
    ${r.model ? `<p class="res-meta">${w.demo ? 'Источник: демо-режим' : 'Модель: ' + esc(r.model)} · ${esc(w.subject)}, ${w.grade} класс</p>` : ''}
  `;
  showState('result');
  animateRing();
  bindResult(w);
}

function bindResult(w) {
  const input = $('teacherScore');
  const btn = $('confirmBtn');
  input.addEventListener('input', () => {
    if (w.confirmed) {
      btn.className = 'btn btn-primary';
      btn.textContent = 'Подтвердить';
    }
  });
  input.addEventListener('keydown', (e) => { if (e.key === 'Enter') btn.click(); });
  btn.addEventListener('click', () => {
    let v = Number(String(input.value).replace(',', '.'));
    if (!Number.isFinite(v)) { input.focus(); toast('Введите число'); return; }
    v = Math.min(w.max, Math.max(0, Math.round(v * 2) / 2));
    w.teacherScore = v;
    w.confirmed = true;
    saveWorks();
    renderResult(w);
    renderAll();
    toast(`Оценка ${fmt(v)} из ${w.max} подтверждена`);
  });

  $('resultState').querySelectorAll('.line-link').forEach((b) => b.addEventListener('click', () => {
    const det = $('reading');
    det.open = true;
    const li = document.getElementById(`line-${b.dataset.line}`);
    if (!li) return;
    li.scrollIntoView({ behavior: 'smooth', block: 'center' });
    li.classList.remove('flash');
    void li.offsetWidth;
    li.classList.add('flash');
  }));

  $('copyBtn').addEventListener('click', () => copyFeedback(w));
  $('nextBtn').addEventListener('click', nextWork);
}

async function copyFeedback(w) {
  const r = w.result;
  const parts = [];
  if (w.name) parts.push(`${w.name}!`);
  if (r.topic) parts.push(`Работа: ${r.topic}`);
  parts.push(`Балл: ${fmt(finalScore(w))} из ${w.max}`);
  if (r.student_feedback) parts.push('', r.student_feedback);
  if (r.practice_task) parts.push('', `Задача для отработки: ${r.practice_task}`);
  const text = parts.join('\n');
  try {
    await navigator.clipboard.writeText(text);
  } catch {
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.style.position = 'fixed'; ta.style.opacity = '0';
    document.body.appendChild(ta);
    ta.select();
    try { document.execCommand('copy'); } catch { /* ок */ }
    ta.remove();
  }
  toast('Отзыв скопирован — можно вставить в чат или дневник');
}

function nextWork() {
  state.photo = null;
  state.queue = [];
  $('previewImg').removeAttribute('src');
  $('studentName').value = '';
  state.currentId = null;
  state.pending = null;
  renderInput();
  showState('empty');
  renderTable();
  document.querySelector('.input-card').scrollIntoView({ behavior: 'smooth', block: 'start' });
  setTimeout(() => dropzone.focus({ preventScroll: true }), 400);
}

/* ===== Аналитика ===== */
function renderAll(bump = false) {
  renderCounter(bump);
  renderAnalytics();
}

function renderCounter(bump) {
  const n = state.works.length;
  const savedSec = state.works.reduce((s, w) => s + Math.max(0, MANUAL_SECONDS - (w.seconds ?? DEMO_ASSUMED_SECONDS)), 0);
  $('counterText').textContent = `Проверено работ: ${n} · сэкономлено ≈ ${fmt(savedSec / 60)} мин`;
  if (bump) {
    const c = $('counter');
    c.classList.remove('bump');
    void c.offsetWidth;
    c.classList.add('bump');
  }
}

function mainErrorType(w) {
  const counts = new Map();
  for (const e of w.result.errors) counts.set(e.type, (counts.get(e.type) || 0) + 1);
  let best = null, bestN = 0;
  for (const [t, n] of counts) if (n > bestN) { best = t; bestN = n; }
  return best;
}

function renderAnalytics() {
  const works = state.works;
  const sec = $('analytics');
  sec.hidden = works.length === 0;
  if (!works.length) return;

  const total = works.length;
  const stats = TYPES.map((t) => {
    const withType = works.filter((w) => w.result.errors.some((e) => e.type === t.name));
    const errCount = works.reduce((s, w) => s + w.result.errors.filter((e) => e.type === t.name).length, 0);
    return { ...t, works: withType.length, errors: errCount, pct: withType.length / total };
  });

  const graded = works.map(workPct).filter((p) => p != null);
  const avg = graded.length ? graded.reduce((a, b) => a + b, 0) / graded.length : null;
  const confirmed = works.filter((w) => w.confirmed).length;
  const timed = works.filter((w) => w.seconds != null);
  const avgTime = timed.length ? timed.reduce((s, w) => s + w.seconds, 0) / timed.length : null;

  $('anStats').innerHTML = `
    <div class="stat"><div class="stat-val">${total}</div><div class="stat-label">${plural(total, 'работа проверена', 'работы проверено', 'работ проверено')}</div></div>
    <div class="stat"><div class="stat-val">${avg == null ? '—' : Math.round(avg * 100) + '%'}</div><div class="stat-label">средний результат</div></div>
    <div class="stat"><div class="stat-val">${confirmed}<small> / ${total}</small></div><div class="stat-label">подтверждено учителем</div></div>
    <div class="stat"><div class="stat-val">${avgTime == null ? '—' : fmtFixed(avgTime) + '<small> с</small>'}</div><div class="stat-label">${avgTime == null ? 'время ИИ: в демо не измеряется' : 'ИИ в среднем на работу'}</div></div>`;

  $('anBars').innerHTML = stats.map((s) => `
    <div class="bar-row ${s.works ? '' : 'zero'}" data-t="${s.key}" data-tip="${esc(`${s.name}: ${s.works} из ${total} ${plural(total, 'работы', 'работ', 'работ')} (${Math.round(s.pct * 100)}%) · всего ${s.errors} ${plural(s.errors, 'ошибка', 'ошибки', 'ошибок')}`)}">
      <span class="bar-name">${esc(s.name)}</span>
      <span class="bar-track"><span class="bar-fill" data-w="${(s.pct * 100).toFixed(1)}"></span></span>
      <span class="bar-val">${s.works} из ${total}</span>
    </div>`).join('');
  requestAnimationFrame(() => requestAnimationFrame(() => {
    document.querySelectorAll('.bar-fill').forEach((f) => { f.style.width = f.dataset.w + '%'; });
  }));

  // Вывод
  const top = [...stats].sort((a, b) => b.works - a.works || b.errors - a.errors)[0];
  const avgText = avg == null ? '' : ` Средний результат класса — <b>${Math.round(avg * 100)}%</b>.`;
  let insight;
  if (top.works === 0) {
    insight = `Ошибок не найдено ни в одной из ${total} ${plural(total, 'работы', 'работ', 'работ')}.${avgText} Класс хорошо усвоил тему.`;
  } else {
    insight = `Чаще всего — ошибки типа <b>«${esc(top.name)}»</b>: у ${top.works} из ${total} ${plural(total, 'работы', 'работ', 'работ')} (${Math.round(top.pct * 100)}%).${avgText} ${top.hint}`;
  }
  $('anInsight').innerHTML = insight;

  renderTable();
}

function renderTable() {
  $('worksBody').innerHTML = [...state.works].reverse().map((w) => {
    const pct = workPct(w);
    const main = mainErrorType(w);
    const t = main ? TYPE_BY_NAME[main] : null;
    return `
      <tr data-id="${w.id}" class="${w.id === state.currentId ? 'active' : ''}" tabindex="0" title="Открыть результат">
        <td class="n">${w.n}</td>
        <td>${w.name ? esc(w.name) : '<span class="dash">Без имени</span>'}</td>
        <td>${w.result.topic ? esc(w.result.topic) : '<span class="dash">—</span>'}${w.demo ? ' <span class="demo-tag">демо</span>' : ''}</td>
        <td class="num"><span class="score-pill ${level(pct)}">${pct == null ? '—' : fmt(finalScore(w))}/${w.max}</span></td>
        <td>${t ? `<span class="type-chip" data-t="${t.key}">${esc(t.name)}</span>` : '<span class="dash">нет ошибок</span>'}</td>
        <td>${w.confirmed
          ? `<span class="conf yes">${icon('<path d="M20 6 9 17l-5-5"/>')}подтверждено</span>`
          : '<span class="conf no">ожидает</span>'}</td>
      </tr>`;
  }).join('');
}

function openWork(id) {
  const w = state.works.find((x) => x.id === id);
  if (!w || state.busy) return;
  state.currentId = id;
  renderResult(w);
  renderTable();
  $('resultCard').scrollIntoView({ behavior: 'smooth', block: 'start' });
}

$('worksBody').addEventListener('click', (e) => {
  const tr = e.target.closest('tr[data-id]');
  if (tr) openWork(tr.dataset.id);
});
$('worksBody').addEventListener('keydown', (e) => {
  const tr = e.target.closest('tr[data-id]');
  if (tr && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); openWork(tr.dataset.id); }
});

$('clearBtn').addEventListener('click', () => {
  if (state.busy) return;
  if (!confirm('Удалить все проверенные работы из этой сессии?')) return;
  state.works = [];
  state.currentId = null;
  state.queue.forEach((q) => { if (q.status === 'done') { q.status = 'wait'; q.workId = null; } });
  saveWorks();
  showState('empty');
  renderInput();
  renderAll();
  toast('Сессия очищена');
});

/* ===== Выгрузка оценок для журнала ===== */
// Файл собирается в браузере и никуда не отправляется. Разделитель «;» и BOM — чтобы Excel
// открыл кириллицу и столбцы без настройки.
function csvCell(value) {
  let s = String(value ?? '');
  if (/^[=+\-@\t\r]/.test(s)) s = "'" + s; // не даём Excel принять текст за формулу
  return /[";\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

$('exportBtn').addEventListener('click', () => {
  if (!state.works.length) return;
  const rows = [['№', 'Ученик', 'Предмет', 'Класс', 'Тема', 'Балл', 'Максимум', 'Процент', 'Статус', 'Главная ошибка', 'Подтверждено учителем', 'Заметка для учителя', 'Источник']];
  for (const w of state.works) {
    const pct = workPct(w);
    rows.push([
      w.n, w.name, w.subject, w.grade, w.result.topic,
      pct == null ? '' : fmt(finalScore(w)), w.max, pct == null ? '' : Math.round(pct * 100) + '%',
      STATUS[w.result.status]?.label || '', mainErrorType(w) || 'нет ошибок',
      w.confirmed ? 'да' : 'нет', w.result.teacher_note, w.demo ? 'демо-разбор' : 'ИИ',
    ]);
  }
  const csv = '﻿' + rows.map((r) => r.map(csvCell).join(';')).join('\r\n');
  const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
  const a = document.createElement('a');
  const d = new Date();
  const stamp = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  a.href = url;
  a.download = `daptery-ocenki-${stamp}.csv`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
  toast(`Оценки сохранены в файл: ${state.works.length} ${plural(state.works.length, 'работа', 'работы', 'работ')}`);
});

/* ===== Подсказка при наведении на полосы ===== */
const tip = $('vizTip');
$('anBars').addEventListener('pointermove', (e) => {
  const row = e.target.closest('.bar-row');
  if (!row) { tip.hidden = true; return; }
  tip.textContent = row.dataset.tip;
  tip.hidden = false;
  const pad = 14;
  const rect = tip.getBoundingClientRect();
  let x = e.clientX + pad;
  let y = e.clientY + pad;
  if (x + rect.width > window.innerWidth - 8) x = e.clientX - rect.width - pad;
  if (y + rect.height > window.innerHeight - 8) y = e.clientY - rect.height - pad;
  tip.style.left = x + 'px';
  tip.style.top = y + 'px';
});
$('anBars').addEventListener('pointerleave', () => { tip.hidden = true; });

/* ===== Старт ===== */
renderSampleLang();
renderDemo();
renderInput();
renderAll();
