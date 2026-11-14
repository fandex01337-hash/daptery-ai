// Генератор «фото» тетрадного листа в клетку с рукописной работой ученика
// и подготовленные разборы этих же примеров для демо-режима (без обращения к ИИ).
//
// Пример выбирается по предмету и классу, которые указал учитель.
// Поля варианта:
//   subjects, grades — для каких предметов и классов он подходит;
//   lang             — язык работы: ru, kz или en;
//   task             — строка задания после заголовка;
//   lines            — строки работы ученика сверху вниз;
//   answer           — что ученик записал в ответ (null — строки «Ответ» нет);
//   error            — { at: номер строки в lines (с 1), type, correct, why } или null для верной работы.

const ALG = ['алгебра', 'математика'];

const VARIANTS = [
  /* ---------- Математика, 5–6 класс ---------- */
  {
    id: 'math-fractions', subjects: ['математика'], grades: [5, 6], lang: 'ru',
    task: '№1. Вычислите:', topic: 'Сложение дробей',
    lines: ['2/3 + 1/4', '2/3 + 1/4 = (2 + 1)/(3 + 4) = 3/7'],
    answer: '3/7', correctAnswer: '11/12', share: 0.3,
    error: { at: 2, type: 'правило', correct: '2/3 + 1/4 = 8/12 + 3/12 = 11/12', why: 'Дроби с разными знаменателями нельзя складывать «числитель с числителем, знаменатель со знаменателем». Сначала приводим их к общему знаменателю 12.' },
    strengths: 'Пример переписан аккуратно, ответ записан.',
    feedback: 'Ты аккуратно записал пример и ответ. Запомни: прежде чем складывать дроби, их нужно привести к общему знаменателю. Для 3 и 4 это 12.',
    practice: 'Вычислите: 1/2 + 1/3',
    note: 'Повторить приведение дробей к общему знаменателю.',
  },
  {
    id: 'math-order', subjects: ['математика'], grades: [5, 6], lang: 'ru',
    task: '№1. Найдите значение выражения:', topic: 'Порядок действий',
    lines: ['48 : 6 + 7 · 3', '1) 48 : 6 = 8', '2) 7 · 3 = 24', '3) 8 + 24 = 32'],
    answer: '32', correctAnswer: '29', share: 0.8,
    error: { at: 3, type: 'вычислительная', correct: '2) 7 · 3 = 21', why: '7 · 3 = 21, а не 24. Из-за этого неверным получился и ответ.' },
    strengths: 'Порядок действий выбран верно: сначала деление и умножение, потом сложение. Действия пронумерованы.',
    feedback: 'Ты правильно определил порядок действий — это главное в таком примере! Перепроверь таблицу умножения на 7. Проверяй каждое действие, прежде чем переходить к следующему.',
    practice: 'Найдите значение выражения: 56 : 8 + 6 · 4',
    note: 'Порядок действий усвоен; повторить таблицу умножения.',
  },
  {
    id: 'math-fractions-ok', subjects: ['математика'], grades: [5, 6], lang: 'ru',
    task: '№1. Вычислите:', topic: 'Сложение дробей',
    lines: ['3/5 + 1/10', '3/5 + 1/10 = 6/10 + 1/10 = 7/10'],
    answer: '7/10', correctAnswer: '7/10', share: 1, error: null,
    strengths: 'Дроби верно приведены к общему знаменателю 10 и правильно сложены.',
    feedback: 'Отлично! Ты правильно нашёл общий знаменатель и сложил дроби. Попробуй теперь пример, где общий знаменатель нужно найти самому.',
    practice: 'Вычислите: 2/3 + 1/6',
    note: 'Тема усвоена.',
  },

  /* ---------- Алгебра, 7–8 класс: линейные уравнения ---------- */
  {
    id: 'sign-transfer-ru', subjects: ALG, grades: [7, 8], lang: 'ru',
    task: '№1. Решите уравнение:', topic: 'Линейные уравнения',
    lines: ['3(x – 4) – 2x = 5 – 2(x + 1)', '3x – 12 – 2x = 5 – 2x – 2', 'x – 12 = 3 – 2x', 'x + 2x = 3 – 12', '3x = –9', 'x = –9 : 3', 'x = –3'],
    answer: 'x = –3', correctAnswer: 'x = 5', share: 0.6,
    error: { at: 4, type: 'знак', correct: 'x + 2x = 3 + 12', why: 'При переносе –12 из левой части в правую знак меняется на противоположный: получается +12, а не –12.' },
    strengths: 'Скобки раскрыты верно в обеих частях уравнения, подобные слагаемые приведены без ошибок. Ход решения выбран правильно.',
    feedback: 'Ты уверенно раскрываешь скобки и приводишь подобные слагаемые. Обрати внимание на перенос: когда число переходит через знак «=», его знак меняется на противоположный. Подставь свой ответ в уравнение — так сразу видно, сходится ли оно.',
    practice: 'Решите уравнение: 2(x – 3) – x = 7 – 3(x + 1)',
    note: 'Повторить перенос слагаемых через знак равенства со сменой знака.',
  },
  {
    id: 'sign-transfer-kz', subjects: ALG, grades: [7, 8], lang: 'kz',
    task: '№1. Теңдеуді шешіңдер:', topic: 'Сызықтық теңдеулер',
    lines: ['5x – 7 = 2x + 8', '5x – 2x = 8 – 7', '3x = 1', 'x = 1 : 3', 'x = 1/3'],
    answer: 'x = 1/3', correctAnswer: 'x = 5', share: 0.5,
    error: { at: 2, type: 'знак', correct: '5x – 2x = 8 + 7', why: '–7 саны теңдіктің оң жағына көшкенде таңбасы өзгеріп, +7 болуы керек.' },
    strengths: 'Белгісіздер сол жаққа, сандар оң жаққа дұрыс жиналған. Шешу реті сақталған.',
    feedback: 'Белгісіздерді бір жаққа, сандарды екінші жаққа жинауды жақсы білесің! Санды теңдік белгісінен өткізгенде оның таңбасы қарама-қарсыға өзгеретінін есіңе сақта. Жауабыңды теңдеуге қойып тексеріп көр.',
    practice: 'Теңдеуді шеш: 4x – 9 = x + 6',
    note: 'Қосылғышты теңдіктің екінші жағына көшіргенде таңбаны өзгерту ережесін қайталау.',
  },
  {
    id: 'sign-transfer-x-ru', subjects: ALG, grades: [7, 8], lang: 'ru',
    task: '№1. Решите уравнение:', topic: 'Линейные уравнения',
    lines: ['4(2x + 1) = 3(x – 2) + 20', '8x + 4 = 3x – 6 + 20', '8x + 4 = 3x + 14', '8x + 3x = 14 – 4', '11x = 10', 'x = 10/11'],
    answer: 'x = 10/11', correctAnswer: 'x = 2', share: 0.6,
    error: { at: 4, type: 'знак', correct: '8x – 3x = 14 – 4', why: 'Слагаемое 3x переносится из правой части в левую со сменой знака: должно получиться 8x – 3x.' },
    strengths: 'Скобки раскрыты верно, подобные слагаемые в правой части приведены правильно.',
    feedback: 'Скобки раскрыты без единой ошибки — отличная работа! При переносе слагаемого с x в другую часть уравнения не забывай менять его знак. Проверь ответ подстановкой: это быстрый способ найти неточность.',
    practice: 'Решите уравнение: 5(x + 2) = 2(x – 1) + 24',
    note: 'Повторить перенос слагаемых с переменной через знак равенства.',
  },
  {
    id: 'sign-bracket-ru', subjects: ALG, grades: [7, 8], lang: 'ru',
    task: '№1. Решите уравнение:', topic: 'Линейные уравнения',
    lines: ['2(3 – x) = 4x – 18', '6 + 2x = 4x – 18', '2x – 4x = –18 – 6', '–2x = –24', 'x = –24 : (–2)', 'x = 12'],
    answer: 'x = 12', correctAnswer: 'x = 4', share: 0.6,
    error: { at: 2, type: 'знак', correct: '6 – 2x = 4x – 18', why: 'При раскрытии скобок 2 умножается на –x, получается –2x, а не +2x.' },
    strengths: 'Перенос слагаемых и деление на отрицательное число выполнены верно.',
    feedback: 'Ты аккуратно переносишь слагаемые и правильно делишь на отрицательное число. Посмотри ещё раз на раскрытие скобок: знак «минус» перед x внутри скобок сохраняется при умножении. Попробуй проверить ответ подстановкой.',
    practice: 'Решите уравнение: 3(4 – x) = 2x – 3',
    note: 'Повторить раскрытие скобок с отрицательным слагаемым.',
  },
  {
    id: 'sign-bracket-kz', subjects: ALG, grades: [7, 8], lang: 'kz',
    task: '№1. Теңдеуді шешіңдер:', topic: 'Сызықтық теңдеулер',
    lines: ['7 – 3(x + 2) = x – 7', '7 – 3x + 6 = x – 7', '13 – 3x = x – 7', '–3x – x = –7 – 13', '–4x = –20', 'x = 5'],
    answer: 'x = 5', correctAnswer: 'x = 2', share: 0.6,
    error: { at: 2, type: 'знак', correct: '7 – 3x – 6 = x – 7', why: 'Жақшаны ашқанда –3 саны 2-ге көбейтіледі, сондықтан +6 емес, –6 болуы керек.' },
    strengths: 'Теңдеуді шешудің жалпы реті дұрыс: белгісіздер сол жаққа, сандар оң жаққа көшірілген.',
    feedback: 'Теңдеуді шешу алгоритмін жақсы меңгергенсің! Жақша алдында теріс сан тұрғанда, жақша ішіндегі мүшелердің таңбалары қарама-қарсыға өзгеретініне назар аудар. Осы ережені есте сақтасаң, нәтижең одан да жақсы болады!',
    practice: 'Теңдеуді шеш: 8 – 2(x + 3) = x – 7',
    note: 'Жақшаны ашу кезіндегі таңбалар ережесін қайталау.',
  },
  {
    id: 'calc-ru', subjects: ALG, grades: [7, 8], lang: 'ru',
    task: '№1. Решите уравнение:', topic: 'Линейные уравнения',
    lines: ['3(2x – 1) = 4x + 9', '6x – 3 = 4x + 9', '6x – 4x = 9 + 3', '2x = 13', 'x = 13 : 2', 'x = 6,5'],
    answer: 'x = 6,5', correctAnswer: 'x = 6', share: 0.8,
    error: { at: 4, type: 'вычислительная', correct: '2x = 12', why: '9 + 3 = 12, а не 13. Из-за этого изменился и ответ.' },
    strengths: 'Скобки раскрыты верно, слагаемые перенесены с правильными знаками. Ход решения полностью верный.',
    feedback: 'Ход решения у тебя полностью верный: скобки и перенос слагаемых выполнены без ошибок. В одном месте подвело сложение: пересчитай 9 + 3. Привычка перепроверять вычисления поможет получать полный балл.',
    practice: 'Решите уравнение: 2(3x – 2) = 4x + 8',
    note: 'Ход решения усвоен; напомнить о самопроверке вычислений.',
  },
  {
    id: 'correct-ru', subjects: ALG, grades: [7, 8], lang: 'ru',
    task: '№1. Решите уравнение:', topic: 'Линейные уравнения',
    lines: ['6x – 5 = 2x + 11', '6x – 2x = 11 + 5', '4x = 16', 'x = 16 : 4', 'x = 4'],
    answer: 'x = 4', correctAnswer: 'x = 4', share: 1, error: null,
    strengths: 'Слагаемые перенесены с правильными знаками, вычисления выполнены без ошибок, ответ записан.',
    feedback: 'Отличная работа: каждый шаг выполнен верно и аккуратно. Ты уверенно переносишь слагаемые и следишь за знаками. Попробуй теперь уравнение со скобками — оно чуть сложнее.',
    practice: 'Решите уравнение: 3(x – 2) = x + 8',
    note: 'Тема усвоена, можно давать задания со скобками.',
  },

  /* ---------- Алгебра, 9–11 класс: квадратные уравнения ---------- */
  {
    id: 'quad-sign', subjects: ALG, grades: [9, 10, 11], lang: 'ru',
    task: '№1. Решите уравнение:', topic: 'Квадратные уравнения',
    lines: ['x² – 5x + 6 = 0', 'D = 25 + 24 = 49', 'x1 = (5 + 7) : 2 = 6', 'x2 = (5 – 7) : 2 = –1'],
    answer: 'x = 6; x = –1', correctAnswer: 'x = 2; x = 3', share: 0.5,
    error: { at: 2, type: 'знак', correct: 'D = 25 – 24 = 1', why: 'D = b² – 4ac = 25 – 4 · 1 · 6 = 25 – 24 = 1. Перед 4ac стоит минус.' },
    strengths: 'Формулы дискриминанта и корней выбраны верно, корни найдены по правильной схеме.',
    feedback: 'Ты знаешь формулы и правильно выстраиваешь решение. Обрати внимание на формулу дискриминанта: D = b² – 4ac, перед 4ac всегда минус. Подставь найденные корни в уравнение — это быстрая проверка.',
    practice: 'Решите уравнение: x² – 7x + 10 = 0',
    note: 'Повторить формулу дискриминанта и проверку корней подстановкой.',
  },
  {
    id: 'quad-ok', subjects: ALG, grades: [9, 10, 11], lang: 'ru',
    task: '№1. Решите уравнение:', topic: 'Квадратные уравнения',
    lines: ['x² + 2x – 8 = 0', 'D = 4 + 32 = 36', 'x1 = (–2 + 6) : 2 = 2', 'x2 = (–2 – 6) : 2 = –4'],
    answer: 'x = 2; x = –4', correctAnswer: 'x = 2; x = –4', share: 1, error: null,
    strengths: 'Дискриминант посчитан верно с учётом знака c, оба корня найдены правильно.',
    feedback: 'Отличное решение: ты правильно учёл, что c отрицательное, и нашёл оба корня. Попробуй решить уравнение, где D = 0.',
    practice: 'Решите уравнение: x² – 6x + 9 = 0',
    note: 'Тема усвоена.',
  },

  /* ---------- Геометрия ---------- */
  {
    id: 'geom-pythagoras', subjects: ['геометрия'], grades: [8, 9, 10, 11], lang: 'ru',
    task: '№1. Задача', topic: 'Теорема Пифагора',
    lines: ['Катеты прямоугольного треугольника', 'равны 6 см и 8 см. Найдите гипотенузу.', 'c² = a² + b²', 'c² = 6² + 8²', 'c² = 12 + 16', 'c² = 28', 'c = 5,3 см'],
    answer: 'c = 5,3 см', correctAnswer: 'c = 10 см', share: 0.4,
    error: { at: 5, type: 'правило', correct: 'c² = 36 + 64', why: '6² — это 6 · 6 = 36, а не 6 · 2 = 12. Так же 8² = 64. Тогда c² = 100 и c = 10 см.' },
    strengths: 'Теорема Пифагора записана верно, данные подставлены правильно.',
    feedback: 'Ты правильно вспомнил теорему Пифагора и подставил катеты. Квадрат числа — это число, умноженное само на себя: 6² = 36. Проверь себя: у треугольника 6, 8, 10 всё сходится.',
    practice: 'Катеты прямоугольного треугольника равны 9 см и 12 см. Найдите гипотенузу.',
    note: 'Повторить возведение в квадрат.',
  },
  {
    id: 'geom-pythagoras-ok', subjects: ['геометрия'], grades: [8, 9, 10, 11], lang: 'ru',
    task: '№1. Задача', topic: 'Теорема Пифагора',
    lines: ['Катеты прямоугольного треугольника', 'равны 5 см и 12 см. Найдите гипотенузу.', 'c² = a² + b²', 'c² = 5² + 12²', 'c² = 25 + 144 = 169', 'c = 13 см'],
    answer: 'c = 13 см', correctAnswer: 'c = 13 см', share: 1, error: null,
    strengths: 'Теорема Пифагора применена верно, вычисления без ошибок, единицы измерения указаны.',
    feedback: 'Отлично! Решение полное и аккуратное, единицы измерения на месте. Попробуй обратную задачу: найди катет по гипотенузе и другому катету.',
    practice: 'Гипотенуза равна 15 см, один катет 9 см. Найдите второй катет.',
    note: 'Тема усвоена.',
  },

  /* ---------- Физика ---------- */
  {
    id: 'phys-speed', subjects: ['физика'], grades: [7, 8, 9, 10, 11], lang: 'ru',
    task: '№1. Задача', topic: 'Скорость движения',
    lines: ['Автомобиль проехал 120 км за 1,5 ч.', 'Найдите скорость автомобиля.', 'Дано: s = 120 км, t = 1,5 ч', 'Найти: v', 'v = s · t', 'v = 120 · 1,5 = 180 км/ч'],
    answer: 'v = 180 км/ч', correctAnswer: 'v = 80 км/ч', share: 0.4,
    error: { at: 5, type: 'правило', correct: 'v = s : t', why: 'Скорость — это путь, делённый на время: v = s : t. Тогда v = 120 : 1,5 = 80 км/ч.' },
    strengths: 'Условие оформлено верно: записаны «Дано» и «Найти», единицы измерения указаны.',
    feedback: 'Ты хорошо оформил задачу: «Дано» и «Найти» записаны правильно. Запомни формулу: скорость — это путь, делённый на время. Проверь ответ здравым смыслом: за полтора часа на скорости 180 км/ч машина проехала бы 270 км.',
    practice: 'Велосипедист проехал 36 км за 2 ч. Найдите его скорость.',
    note: 'Повторить формулу скорости v = s : t.',
  },
  {
    id: 'phys-speed-ok', subjects: ['физика'], grades: [7, 8, 9, 10, 11], lang: 'ru',
    task: '№1. Задача', topic: 'Скорость движения',
    lines: ['Поезд прошёл 240 км за 3 ч.', 'Найдите скорость поезда.', 'Дано: s = 240 км, t = 3 ч', 'Найти: v', 'v = s : t', 'v = 240 : 3 = 80 км/ч'],
    answer: 'v = 80 км/ч', correctAnswer: 'v = 80 км/ч', share: 1, error: null,
    strengths: 'Формула выбрана верно, вычисление правильное, задача оформлена полностью.',
    feedback: 'Отличное решение и аккуратное оформление! Попробуй задачу, где нужно найти не скорость, а время.',
    practice: 'Автобус едет со скоростью 60 км/ч. За какое время он проедет 150 км?',
    note: 'Тема усвоена.',
  },

  /* ---------- Химия ---------- */
  {
    id: 'chem-coef', subjects: ['химия'], grades: [8, 9, 10, 11], lang: 'ru',
    task: '№1. Расставьте коэффициенты:', topic: 'Уравнения реакций',
    lines: ['1) Mg + 2HCl = MgCl2 + H2', '2) H2 + O2 = 2H2O', '3) CaO + H2O = Ca(OH)2'],
    answer: null, correctAnswer: '2H2 + O2 = 2H2O', share: 0.7,
    error: { at: 2, type: 'правило', correct: '2) 2H2 + O2 = 2H2O', why: 'Слева 2 атома водорода, а справа 4. Чтобы число атомов совпало, перед H2 нужен коэффициент 2.' },
    strengths: 'Первое и третье уравнения уравнены верно, формулы веществ записаны правильно.',
    feedback: 'Ты верно уравнял две реакции из трёх! После расстановки коэффициентов пересчитай атомы каждого элемента слева и справа — их число должно совпадать.',
    practice: 'Расставьте коэффициенты: Al + O2 = Al2O3',
    note: 'Напомнить о проверке: число атомов каждого элемента слева и справа.',
  },
  {
    id: 'chem-coef-ok', subjects: ['химия'], grades: [8, 9, 10, 11], lang: 'ru',
    task: '№1. Расставьте коэффициенты:', topic: 'Уравнения реакций',
    lines: ['1) 2Mg + O2 = 2MgO', '2) Zn + 2HCl = ZnCl2 + H2', '3) 2H2 + O2 = 2H2O'],
    answer: null, correctAnswer: '', share: 1, error: null,
    strengths: 'Все три уравнения уравнены верно, формулы записаны без ошибок.',
    feedback: 'Отлично: во всех трёх реакциях число атомов сходится. Попробуй уравнение посложнее, где коэффициенты больше двух.',
    practice: 'Расставьте коэффициенты: Fe + O2 = Fe2O3',
    note: 'Тема усвоена.',
  },

  /* ---------- Русский язык ---------- */
  {
    id: 'rus-tsya', subjects: ['русский язык'], grades: [5, 6, 7, 8, 9, 10, 11], lang: 'ru',
    task: '№1. Диктант', topic: 'Правописание -тся и -ться',
    lines: ['Осенью в парке очень красиво.', 'Листья медленно кружаться в воздухе.', 'Под ногами шуршит жёлтый ковёр.', 'Мы с другом долго гуляли по аллеям.'],
    answer: null, correctAnswer: '', share: 0.8,
    error: { at: 2, type: 'правило', correct: 'Листья медленно кружатся в воздухе.', why: 'Глагол отвечает на вопрос «что делают?» — кружатся, поэтому мягкий знак не пишется.' },
    strengths: 'Предложения записаны грамотно, буквы ё и знаки препинания на месте.',
    feedback: 'Ты пишешь аккуратно и почти без ошибок! Чтобы не ошибиться в -тся и -ться, задай вопрос к глаголу: «что делают?» — кружатся, без мягкого знака.',
    practice: 'Вставьте пропущенные буквы: Птицы собираю..ся в стаи. Нам нужно собрат..ся в дорогу.',
    note: 'Повторить правописание -тся и -ться в глаголах.',
  },
  {
    id: 'rus-ok', subjects: ['русский язык'], grades: [5, 6, 7, 8, 9, 10, 11], lang: 'ru',
    task: '№1. Диктант', topic: 'Диктант',
    lines: ['Зимой в лесу тихо.', 'Снег искрится на солнце.', 'Мы катаемся на лыжах.', 'Нам хочется гулять весь день.'],
    answer: null, correctAnswer: '', share: 1, error: null,
    strengths: 'Ошибок нет: глаголы на -тся и -ться написаны верно, знаки препинания на месте.',
    feedback: 'Замечательная работа без ошибок! Ты правильно написал «искрится» и «хочется». Так держать.',
    practice: 'Составьте два предложения: одно с глаголом «учиться», другое с глаголом «учится».',
    note: 'Тема усвоена.',
  },

  /* ---------- Казахский язык ---------- */
  {
    id: 'kaz-plural', subjects: ['казахский язык'], grades: [5, 6, 7, 8, 9, 10, 11], lang: 'kz',
    task: '№1. Диктант', topic: 'Көптік жалғау',
    lines: ['Күз келді. Ауа салқындады.', 'Ағаштардың жапырақтары сарғайды.', 'Ауылдағы үйлар биік емес.', 'Біз мектепке жаяу барамыз.'],
    answer: null, correctAnswer: '', share: 0.8,
    error: { at: 3, type: 'правило', correct: 'Ауылдағы үйлер биік емес.', why: '«Үй» сөзі жіңішке дауыстымен айтылады, сондықтан көптік жалғау да жіңішке болады: үйлер.' },
    strengths: 'Сөйлемдер дұрыс құрылған, тыныс белгілері орнында.',
    feedback: 'Сөйлемдерді жақсы құрадың! «Үй» сөзі жіңішке айтылады, сондықтан көптік жалғауы да жіңішке: -лер. Сөзге жалғау қосқанда дауыстыларды тексеріп отыр.',
    practice: 'Көптік жалғауын жалға: мектеп, бала, өзен, кітап.',
    note: 'Көптік жалғауының үндесу заңын қайталау.',
  },
  {
    id: 'kaz-ok', subjects: ['казахский язык'], grades: [5, 6, 7, 8, 9, 10, 11], lang: 'kz',
    task: '№1. Диктант', topic: 'Диктант',
    lines: ['Қыс келді. Ауа суытты.', 'Балалар шана тебеді.', 'Ауылдағы үйлер жылы.', 'Біз мектепке жаяу барамыз.'],
    answer: null, correctAnswer: '', share: 1, error: null,
    strengths: 'Қате жоқ: жалғаулар дұрыс жазылған, тыныс белгілері орнында.',
    feedback: 'Жарайсың! Жұмысың қатесіз және ұқыпты жазылған.',
    practice: 'Қыс туралы үш сөйлем құрап жаз.',
    note: 'Тақырып меңгерілген.',
  },

  /* ---------- Английский язык ---------- */
  {
    id: 'eng-past', subjects: ['английский язык'], grades: [5, 6, 7, 8], lang: 'en',
    task: 'Ex. 1. Put the verbs into Past Simple.', topic: 'Past Simple',
    lines: ['1. Yesterday I went to the cinema.', '2. We watched a funny film.', '3. Then my friend buyed popcorn.', '4. We came home at nine.'],
    answer: null, correctAnswer: '', share: 0.8,
    error: { at: 3, type: 'правило', correct: '3. Then my friend bought popcorn.', why: 'Buy — неправильный глагол: его вторая форма bought, окончание -ed к нему не добавляется.' },
    strengths: 'Правильные и неправильные глаголы went, watched, came употреблены верно.',
    feedback: 'Ты хорошо знаешь Past Simple: went, watched и came написаны верно! Запомни ещё один неправильный глагол: buy — bought. Неправильные глаголы удобно учить по таблице.',
    practice: 'Put the verbs into Past Simple: She (take) a photo. We (eat) ice cream. They (see) a film.',
    note: 'Повторить неправильные глаголы (вторая форма).',
  },
  {
    id: 'eng-past-ok', subjects: ['английский язык'], grades: [5, 6, 7, 8], lang: 'en',
    task: 'Ex. 1. Put the verbs into Past Simple.', topic: 'Past Simple',
    lines: ['1. Last summer we visited London.', '2. I saw Big Ben.', '3. My sister took many photos.', '4. We had a great time.'],
    answer: null, correctAnswer: '', share: 1, error: null,
    strengths: 'Все глаголы стоят в Past Simple, неправильные формы saw, took, had написаны верно.',
    feedback: 'Отличная работа! Все глаголы, включая неправильные, стоят в верной форме. Попробуй теперь составить вопросы в Past Simple.',
    practice: 'Make questions: you / visit London? she / take photos?',
    note: 'Тема усвоена.',
  },
  {
    id: 'eng-cond', subjects: ['английский язык'], grades: [9, 10, 11], lang: 'en',
    task: 'Ex. 2. Use the Second Conditional.', topic: 'Second Conditional',
    lines: ['1. If I were you, I would rest.', '2. If we had time, we would come.', '3. If he would know, he would help.', '4. If it rained, we would stay in.'],
    answer: null, correctAnswer: '', share: 0.8,
    error: { at: 3, type: 'правило', correct: '3. If he knew, he would help.', why: 'В части с if во втором типе условных предложений используется Past Simple (knew), а would ставится только в главной части.' },
    strengths: 'Три предложения из четырёх построены верно, форма were в первом предложении употреблена правильно.',
    feedback: 'Ты хорошо понимаешь второй тип условных предложений: were, had и rained стоят на своих местах. Запомни: после if would не ставится — там нужен Past Simple, например knew.',
    practice: 'Complete: If I (have) a dog, I (walk) it every day. If she (live) here, she (visit) us.',
    note: 'Повторить: в придаточном с if не употребляется would.',
  },
  {
    id: 'eng-cond-ok', subjects: ['английский язык'], grades: [9, 10, 11], lang: 'en',
    task: 'Ex. 2. Use the Second Conditional.', topic: 'Second Conditional',
    lines: ['1. If I had a car, I would drive.', '2. If she were here, she would help.', '3. If they knew, they would call.', '4. If it snowed, we would ski.'],
    answer: null, correctAnswer: '', share: 1, error: null,
    strengths: 'Все предложения построены верно: Past Simple после if и would в главной части.',
    feedback: 'Отлично! Все условные предложения построены правильно. Попробуй теперь третий тип: If I had known…',
    practice: 'Complete with the Third Conditional: If I (know), I (come).',
    note: 'Тема усвоена, можно переходить к третьему типу.',
  },
];

const BY_ID = Object.fromEntries(VARIANTS.map((v) => [v.id, v]));

const TEXT = {
  ru: {
    months: ['января', 'февраля', 'марта', 'апреля', 'мая', 'июня', 'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря'],
    header: 'Классная работа',
    answer: 'Ответ:',
  },
  kz: {
    months: ['қаңтар', 'ақпан', 'наурыз', 'сәуір', 'мамыр', 'маусым', 'шілде', 'тамыз', 'қыркүйек', 'қазан', 'қараша', 'желтоқсан'],
    header: 'Сынып жұмысы',
    answer: 'Жауабы:',
  },
  en: {
    months: ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'],
    header: 'Classwork',
    answer: 'Answer:',
  },
};

const dateText = (lang, now = new Date()) => `${now.getDate()} ${TEXT[lang].months[now.getMonth()]}`;

// Варианты для предмета и класса: сначала точное совпадение по классу, иначе любые по предмету.
function candidates(subject, grade) {
  const bySubject = VARIANTS.filter((v) => v.subjects.includes(subject));
  const byGrade = bySubject.filter((v) => v.grades.includes(Number(grade)));
  return byGrade.length ? byGrade : bySubject.length ? bySubject : VARIANTS.filter((v) => v.subjects.includes('алгебра'));
}

// Для кнопки «Сгенерировать пример с ошибкой»: по кругу перебираем варианты с ошибкой.
const cursor = new Map();
function nextWithError(subject, grade) {
  const list = candidates(subject, grade).filter((v) => v.error);
  const key = `${subject}|${grade}`;
  const i = cursor.has(key) ? cursor.get(key) : Math.floor(Math.random() * list.length);
  cursor.set(key, (i + 1) % list.length);
  return list[i % list.length];
}

// Стопка из пяти работ одного класса: три с ошибкой, две верные (если верных нет — все с ошибкой).
export function stackIds(subject, grade) {
  const list = candidates(subject, grade);
  const errs = list.filter((v) => v.error);
  const oks = list.filter((v) => !v.error);
  const pattern = ['e', 'ok', 'e', 'e', 'ok'];
  let ei = Math.floor(Math.random() * errs.length);
  let oi = 0;
  return pattern.map((p) => {
    if (p === 'ok' && oks.length) return oks[oi++ % oks.length].id;
    return errs[ei++ % errs.length].id;
  });
}

// Подготовленный разбор примера в том же формате, что возвращает сервер после ответа ИИ.
export function demoResult(id, max) {
  const v = BY_ID[id];
  if (!v) return null;
  const T = TEXT[v.lang];
  const errors = v.error ? [{
    line: 3 + v.error.at,
    student: v.lines[v.error.at - 1],
    correct: v.error.correct,
    type: v.error.type,
    explanation: v.error.why,
  }] : [];
  const recognized = [dateText(v.lang), T.header, v.task, ...v.lines];
  if (v.answer) recognized.push(`${T.answer} ${v.answer}`);
  return {
    status: errors.length ? (v.share >= 0.5 ? 'partial' : 'wrong') : 'correct',
    score: Math.round(max * v.share * 2) / 2,
    max,
    topic: v.topic,
    task: v.task,
    correct_answer: v.correctAnswer || '',
    student_answer: v.answer || '',
    recognized_lines: recognized,
    strengths: v.strengths,
    errors,
    student_feedback: v.feedback,
    practice_task: v.practice,
    teacher_note: v.note,
    model: 'демо-режим',
  };
}

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
  const sample = 'Классная работа Сынып жұмысы Classwork Диктант қараша Ответ Жауабы Answer 0123456789 x – = + : ( ) / , · ² ё';
  const timeout = new Promise((r) => setTimeout(r, 4000));
  try {
    await Promise.race([
      Promise.all([document.fonts.load('500 56px "Caveat"', sample), document.fonts.load('600 56px "Caveat"', sample)]),
      timeout,
    ]);
  } catch { /* рисуем запасным шрифтом */ }
}

const FONT = (s) => `500 ${s.toFixed(1)}px "Caveat", "Segoe Print", cursive`;

// Пишем строку «от руки»: по словам, с лёгким дрожанием, наклоном и разной плотностью чернил.
// Если строка не помещается до полей, она пишется чуть мельче.
function hand(ctx, text, x, y, rand, size, maxWidth = Infinity) {
  ctx.font = FONT(size);
  const full = ctx.measureText(text).width * 1.12;
  if (full > maxWidth) size = Math.max(40, size * (maxWidth / full));
  ctx.font = FONT(size);
  const words = text.split(' ');
  const space = ctx.measureText(' ').width;
  const slope = (rand() - 0.5) * 0.014;
  let cx = x;
  for (const w of words) {
    const s = size * (0.97 + rand() * 0.06);
    ctx.font = FONT(s);
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
  ctx.font = FONT(size);
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

// Рисует пример. { id } — конкретный вариант; иначе { subject, grade } — следующий вариант
// с ошибкой для этого предмета и класса.
export async function renderSample({ id, subject = 'алгебра', grade = 7 } = {}) {
  const v = (id && BY_ID[id]) || nextWithError(subject, grade);
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
  const indent = left + cell * 2;
  const room = (x) => marginX - cell / 2 - x;
  const base = (row) => row * cell - 7;

  const date = dateText(v.lang);
  hand(ctx, date, marginX - cell - textWidth(ctx, date, size), base(3), rand, size);
  hand(ctx, T.header, (marginX - textWidth(ctx, T.header, size)) / 2, base(5), rand, size);

  let row = 7;
  hand(ctx, v.task, left, base(row), rand, size, room(left));

  for (const line of v.lines) {
    row += 2;
    hand(ctx, line, indent, base(row), rand, size, room(indent));
  }

  if (v.answer) {
    row += 2;
    const ansX = hand(ctx, T.answer, left, base(row), rand, size);
    const endX = hand(ctx, v.answer, ansX + 6, base(row), rand, size, room(ansX + 6));
    handLine(ctx, left - 6, base(row) + 12, endX + 6, rand);
  }

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
    topic: v.topic,
  };
}
