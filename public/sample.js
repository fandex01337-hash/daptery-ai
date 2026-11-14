// Генератор «фото» тетрадного листа в клетку с рукописным решением уравнения 7 класса
// и подготовленные разборы этих же примеров для демо-режима (без обращения к ИИ).

const VARIANTS = [
  {
    id: 'sign-transfer-ru', lang: 'ru',
    eq: '3(x – 4) – 2x = 5 – 2(x + 1)',
    lines: ['3x – 12 – 2x = 5 – 2x – 2', 'x – 12 = 3 – 2x', 'x + 2x = 3 – 12', '3x = –9', 'x = –9 : 3', 'x = –3'],
    answer: 'x = –3', correctAnswer: 'x = 5', share: 0.6,
    error: { at: 3, type: 'знак', correct: 'x + 2x = 3 + 12', why: 'При переносе –12 из левой части в правую знак меняется на противоположный: получается +12, а не –12.' },
    strengths: 'Скобки раскрыты верно в обеих частях уравнения, подобные слагаемые приведены без ошибок. Ход решения выбран правильно.',
    feedback: 'Ты уверенно раскрываешь скобки и приводишь подобные слагаемые. Обрати внимание на перенос: когда число переходит через знак «=», его знак меняется на противоположный. Подставь свой ответ в уравнение — так сразу видно, сходится ли оно.',
    practice: 'Решите уравнение: 2(x – 3) – x = 7 – 3(x + 1)',
    note: 'Повторить перенос слагаемых через знак равенства со сменой знака.',
  },
  {
    id: 'sign-transfer-kz', lang: 'kz',
    eq: '5x – 7 = 2x + 8',
    lines: ['5x – 2x = 8 – 7', '3x = 1', 'x = 1 : 3', 'x = 1/3'],
    answer: 'x = 1/3', correctAnswer: 'x = 5', share: 0.5,
    error: { at: 1, type: 'знак', correct: '5x – 2x = 8 + 7', why: '–7 саны теңдіктің оң жағына көшкенде таңбасы өзгеріп, +7 болуы керек.' },
    strengths: 'Белгісіздер сол жаққа, сандар оң жаққа дұрыс жиналған. Шешу реті сақталған.',
    feedback: 'Белгісіздерді бір жаққа, сандарды екінші жаққа жинауды жақсы білесің! Санды теңдік белгісінен өткізгенде оның таңбасы қарама-қарсыға өзгеретінін есіңе сақта. Жауабыңды теңдеуге қойып тексеріп көр.',
    practice: 'Теңдеуді шеш: 4x – 9 = x + 6',
    note: 'Қосылғышты теңдіктің екінші жағына көшіргенде таңбаны өзгерту ережесін қайталау.',
  },
  {
    id: 'sign-transfer-x-ru', lang: 'ru',
    eq: '4(2x + 1) = 3(x – 2) + 20',
    lines: ['8x + 4 = 3x – 6 + 20', '8x + 4 = 3x + 14', '8x + 3x = 14 – 4', '11x = 10', 'x = 10/11'],
    answer: 'x = 10/11', correctAnswer: 'x = 2', share: 0.6,
    error: { at: 3, type: 'знак', correct: '8x – 3x = 14 – 4', why: 'Слагаемое 3x переносится из правой части в левую со сменой знака: должно получиться 8x – 3x.' },
    strengths: 'Скобки раскрыты верно, подобные слагаемые в правой части приведены правильно.',
    feedback: 'Скобки раскрыты без единой ошибки — отличная работа! При переносе слагаемого с x в другую часть уравнения не забывай менять его знак. Проверь ответ подстановкой: это быстрый способ найти неточность.',
    practice: 'Решите уравнение: 5(x + 2) = 2(x – 1) + 24',
    note: 'Повторить перенос слагаемых с переменной через знак равенства.',
  },
  {
    id: 'sign-bracket-ru', lang: 'ru',
    eq: '2(3 – x) = 4x – 18',
    lines: ['6 + 2x = 4x – 18', '2x – 4x = –18 – 6', '–2x = –24', 'x = –24 : (–2)', 'x = 12'],
    answer: 'x = 12', correctAnswer: 'x = 4', share: 0.6,
    error: { at: 1, type: 'знак', correct: '6 – 2x = 4x – 18', why: 'При раскрытии скобок 2 умножается на –x, получается –2x, а не +2x.' },
    strengths: 'Перенос слагаемых и деление на отрицательное число выполнены верно.',
    feedback: 'Ты аккуратно переносишь слагаемые и правильно делишь на отрицательное число. Посмотри ещё раз на раскрытие скобок: знак «минус» перед x внутри скобок сохраняется при умножении. Попробуй проверить ответ подстановкой.',
    practice: 'Решите уравнение: 3(4 – x) = 2x – 3',
    note: 'Повторить раскрытие скобок с отрицательным слагаемым.',
  },
  {
    id: 'sign-bracket-kz', lang: 'kz',
    eq: '7 – 3(x + 2) = x – 7',
    lines: ['7 – 3x + 6 = x – 7', '13 – 3x = x – 7', '–3x – x = –7 – 13', '–4x = –20', 'x = 5'],
    answer: 'x = 5', correctAnswer: 'x = 2', share: 0.6,
    error: { at: 1, type: 'знак', correct: '7 – 3x – 6 = x – 7', why: 'Жақшаны ашқанда –3 саны 2-ге көбейтіледі, сондықтан +6 емес, –6 болуы керек.' },
    strengths: 'Теңдеуді шешудің жалпы реті дұрыс: белгісіздер сол жаққа, сандар оң жаққа көшірілген.',
    feedback: 'Теңдеуді шешу алгоритмін жақсы меңгергенсің! Жақша алдында теріс сан тұрғанда, жақша ішіндегі мүшелердің таңбалары қарама-қарсыға өзгеретініне назар аудар. Осы ережені есте сақтасаң, нәтижең одан да жақсы болады!',
    practice: 'Теңдеуді шеш: 8 – 2(x + 3) = x – 7',
    note: 'Жақшаны ашу кезіндегі таңбалар ережесін қайталау.',
  },
  {
    id: 'calc-ru', lang: 'ru',
    eq: '3(2x – 1) = 4x + 9',
    lines: ['6x – 3 = 4x + 9', '6x – 4x = 9 + 3', '2x = 13', 'x = 13 : 2', 'x = 6,5'],
    answer: 'x = 6,5', correctAnswer: 'x = 6', share: 0.8,
    error: { at: 3, type: 'вычислительная', correct: '2x = 12', why: '9 + 3 = 12, а не 13. Из-за этого изменился и ответ.' },
    strengths: 'Скобки раскрыты верно, слагаемые перенесены с правильными знаками. Ход решения полностью верный.',
    feedback: 'Ход решения у тебя полностью верный: скобки и перенос слагаемых выполнены без ошибок. В одном месте подвело сложение: пересчитай 9 + 3. Привычка перепроверять вычисления поможет получать полный балл.',
    practice: 'Решите уравнение: 2(3x – 2) = 4x + 8',
    note: 'Ход решения усвоен; напомнить о самопроверке вычислений.',
  },
  {
    id: 'correct-ru', lang: 'ru',
    eq: '6x – 5 = 2x + 11',
    lines: ['6x – 2x = 11 + 5', '4x = 16', 'x = 16 : 4', 'x = 4'],
    answer: 'x = 4', correctAnswer: 'x = 4', share: 1,
    error: null,
    strengths: 'Слагаемые перенесены с правильными знаками, вычисления выполнены без ошибок, ответ записан.',
    feedback: 'Отличная работа: каждый шаг выполнен верно и аккуратно. Ты уверенно переносишь слагаемые и следишь за знаками. Попробуй теперь уравнение со скобками — оно чуть сложнее.',
    practice: 'Решите уравнение: 3(x – 2) = x + 8',
    note: 'Тема усвоена, можно давать задания со скобками.',
  },
];

const BY_ID = Object.fromEntries(VARIANTS.map((v) => [v.id, v]));

// Кнопка «Сгенерировать пример с ошибкой» по очереди выдаёт варианты с ошибкой в знаке.
const SINGLE_IDS = VARIANTS.filter((v) => v.error?.type === 'знак').map((v) => v.id);
// Стопка из пяти работ: три ошибки в знаке, одна вычислительная, одна верная работа.
export const STACK_IDS = ['sign-transfer-ru', 'correct-ru', 'sign-bracket-ru', 'calc-ru', 'sign-bracket-kz'];

const TEXT = {
  ru: {
    months: ['января', 'февраля', 'марта', 'апреля', 'мая', 'июня', 'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря'],
    header: 'Классная работа',
    task: 'Решите уравнение:',
    answer: 'Ответ:',
    topic: 'Линейные уравнения',
  },
  kz: {
    months: ['қаңтар', 'ақпан', 'наурыз', 'сәуір', 'мамыр', 'маусым', 'шілде', 'тамыз', 'қыркүйек', 'қазан', 'қараша', 'желтоқсан'],
    header: 'Сынып жұмысы',
    task: 'Теңдеуді шешіңдер:',
    answer: 'Жауабы:',
    topic: 'Сызықтық теңдеулер',
  },
};

const dateText = (lang, now = new Date()) => `${now.getDate()} ${TEXT[lang].months[now.getMonth()]}`;

// Подготовленный разбор примера в том же формате, что возвращает сервер после ответа ИИ.
export function demoResult(id, max) {
  const v = BY_ID[id];
  if (!v) return null;
  const T = TEXT[v.lang];
  const errors = v.error ? [{
    line: 4 + v.error.at,
    student: v.lines[v.error.at - 1],
    correct: v.error.correct,
    type: v.error.type,
    explanation: v.error.why,
  }] : [];
  return {
    status: errors.length ? 'partial' : 'correct',
    score: Math.round(max * v.share * 2) / 2,
    max,
    topic: T.topic,
    task: `${T.task} ${v.eq}`,
    correct_answer: v.correctAnswer,
    student_answer: v.answer,
    recognized_lines: [dateText(v.lang), T.header, `№1. ${T.task}`, v.eq, ...v.lines, `${T.answer} ${v.answer}`],
    strengths: v.strengths,
    errors,
    student_feedback: v.feedback,
    practice_task: v.practice,
    teacher_note: v.note,
    model: 'демо-режим',
  };
}

let nextIndex = Math.floor(Math.random() * SINGLE_IDS.length);

function mulberry32(seed) {
  return function () {
    seed |= 0; seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

async function ensureFont() {
  if (!document.fonts || !document.fonts.load) return;
  const sample = 'Классная работа Сынып жұмысы Теңдеуді шешіңдер қараша Ответ Жауабы 0123456789 x – = + : ( ) / ,';
  const timeout = new Promise((r) => setTimeout(r, 4000));
  try {
    await Promise.race([
      Promise.all([document.fonts.load('500 56px "Caveat"', sample), document.fonts.load('600 56px "Caveat"', sample)]),
      timeout,
    ]);
  } catch { /* рисуем запасным шрифтом */ }
}

// Пишем строку «от руки»: по словам, с лёгким дрожанием, наклоном и разной плотностью чернил.
function hand(ctx, text, x, y, rand, size) {
  ctx.font = `500 ${size}px "Caveat", "Segoe Print", cursive`;
  const words = text.split(' ');
  const space = ctx.measureText(' ').width;
  const slope = (rand() - 0.5) * 0.014;
  let cx = x;
  for (const w of words) {
    const s = size * (0.97 + rand() * 0.06);
    ctx.font = `500 ${s.toFixed(1)}px "Caveat", "Segoe Print", cursive`;
    ctx.save();
    ctx.globalAlpha = 0.84 + rand() * 0.14;
    ctx.translate(cx, y + (rand() - 0.5) * 3 + (cx - x) * slope);
    ctx.rotate((rand() - 0.5) * 0.035);
    ctx.fillText(w, 0, 0);
    ctx.restore();
    cx += ctx.measureText(w).width + space * (1 + rand() * 0.35);
  }
  return cx;
}

function textWidth(ctx, text, size) {
  ctx.font = `500 ${size}px "Caveat", "Segoe Print", cursive`;
  return ctx.measureText(text).width * 1.08;
}

// Волнистая линия от руки (подчёркивание ответа).
function handLine(ctx, x1, y1, x2, rand) {
  ctx.save();
  ctx.lineWidth = 3;
  ctx.lineCap = 'round';
  ctx.globalAlpha = 0.85;
  ctx.beginPath();
  ctx.moveTo(x1, y1);
  const steps = 6;
  for (let i = 1; i <= steps; i++) {
    const px = x1 + ((x2 - x1) * i) / steps;
    ctx.quadraticCurveTo(px - (x2 - x1) / steps / 2, y1 + (rand() - 0.5) * 5, px, y1 + (rand() - 0.5) * 3 + i * 0.6);
  }
  ctx.stroke();
  ctx.restore();
}

// Рисует пример. Без id берёт следующий вариант с ошибкой в знаке.
export async function renderSample(id) {
  let v = id ? BY_ID[id] : null;
  if (!v) {
    v = BY_ID[SINGLE_IDS[nextIndex]];
    nextIndex = (nextIndex + 1) % SINGLE_IDS.length;
  }
  const T = TEXT[v.lang];
  await ensureFont();

  const W = 1200, H = 1500, cell = 40, size = 58;
  const rand = mulberry32(((Date.now() & 0xffff) ^ 0x5eed) + Math.floor(Math.random() * 1e6));
  const c = document.createElement('canvas');
  c.width = W; c.height = H;
  const ctx = c.getContext('2d');

  // Бумага
  ctx.fillStyle = '#fbfbf5';
  ctx.fillRect(0, 0, W, H);

  // Лёгкий поворот листа, как на настоящем фото
  ctx.save();
  ctx.translate(W / 2, H / 2);
  ctx.rotate(-0.009 + rand() * 0.006);
  ctx.translate(-W / 2, -H / 2);

  // Клетка 5 мм
  ctx.strokeStyle = 'rgba(92, 146, 204, 0.42)';
  ctx.lineWidth = 1.3;
  ctx.beginPath();
  for (let x = -cell * 2; x <= W + cell * 2; x += cell) { ctx.moveTo(x + 0.5, -cell * 2); ctx.lineTo(x + 0.5, H + cell * 2); }
  for (let y = -cell * 2; y <= H + cell * 2; y += cell) { ctx.moveTo(-cell * 2, y + 0.5); ctx.lineTo(W + cell * 2, y + 0.5); }
  ctx.stroke();

  // Поля справа
  const marginX = W - cell * 3 + 0.5;
  ctx.strokeStyle = 'rgba(214, 64, 64, 0.65)';
  ctx.lineWidth = 2.2;
  ctx.beginPath(); ctx.moveTo(marginX, -cell * 2); ctx.lineTo(marginX, H + cell * 2); ctx.stroke();

  // Текст синей ручкой
  ctx.fillStyle = '#1f3c98';
  ctx.strokeStyle = '#1f3c98';
  ctx.textBaseline = 'alphabetic';
  const left = cell * 2;
  const base = (row) => row * cell - 7;

  const date = dateText(v.lang);
  hand(ctx, date, marginX - cell - textWidth(ctx, date, size), base(3), rand, size);
  hand(ctx, T.header, (marginX - textWidth(ctx, T.header, size)) / 2, base(5), rand, size);

  let row = 7;
  const after = hand(ctx, '№1.', left, base(row), rand, size);
  hand(ctx, T.task, after + 10, base(row), rand, size);
  row += 2;
  hand(ctx, v.eq, left + cell * 2, base(row), rand, size);

  for (const line of v.lines) {
    row += 2;
    hand(ctx, line, left + cell * 2, base(row), rand, size);
  }

  row += 2;
  const ansX = hand(ctx, T.answer, left, base(row), rand, size);
  const endX = hand(ctx, v.answer, ansX + 6, base(row), rand, size);
  handLine(ctx, left - 6, base(row) + 12, endX + 6, rand);

  ctx.restore();

  // Неравномерное освещение
  const g = ctx.createRadialGradient(W * 0.32, H * 0.22, 80, W * 0.5, H * 0.55, H * 0.95);
  g.addColorStop(0, 'rgba(255, 255, 250, 0)');
  g.addColorStop(1, 'rgba(70, 60, 40, 0.18)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);

  // Шум сенсора камеры
  const img = ctx.getImageData(0, 0, W, H);
  const d = img.data;
  for (let i = 0; i < d.length; i += 4) {
    const n = (rand() - 0.5) * 10;
    d[i] += n; d[i + 1] += n; d[i + 2] += n;
  }
  ctx.putImageData(img, 0, 0);

  return {
    dataUrl: c.toDataURL('image/jpeg', 0.88),
    width: W,
    height: H,
    lang: v.lang,
    id: v.id,
  };
}
