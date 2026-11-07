# AGENTS.md — памятка проекта (читается в КАЖДОМ запросе — держать коротким)

## Игра
«one ❤ офис» — браузерные мини-игры по коллегам. №1 Вова (`js/vova.js`, `js/boss.js`): листать мемы, пока босс не смотрит, 60 с, 2 замечания = провал. №2 «Цицеридис» (`js/ciceridis.js`): Чекеридис балансирует на столе в баре, тап по половинам экрана.
Vanilla HTML/CSS/JS, без сборки. Canvas 2D + DOM-UI поверх. Мобайл-first.

## ЭКОНОМИЯ ТОКЕНОВ (строго)
Каждый вызов инструмента заново отправляет модели весь контекст — чем меньше шагов и чтений, тем дешевле.
1. Сначала карта кода ниже, потом `search_files` по имени функции/ключа, потом `read_file` с offset/limit (≤ 150 строк) или в режиме indentation. **Целиком не читать** `js/scene.js` (1050 строк), `js/ui.js` (840), `js/config.js` (354), `css/style.css` (343), ТЗ в `design/`.
2. Не перечитывать файл, который уже видел в этой задаче. Независимые чтения — одним пакетом в одном ответе.
3. Картинки не открывать и не анализировать скриптами (пиксельные профили, сканы кадров — огромный вывод). Размеры кадров, координаты, что на спрайте — спросить у пользователя одной фразой.
4. Вывод команд — короткий: `git status -sb`, `git log --oneline -3`; никаких дампов файлов и больших логов.
5. Дизайн-доки читать только если задача про правила/дизайн. Не читать: `design/ideas.md` (архив), `design/features/vova-minigame.md` (устарел, правда — в ТЗ).
6. Не пересказывать в ответе код и большие куски файлов; итог — коротко.
7. Скрытые от агента файлы — в `.rooignore` (картинки, tmp, мусор). Не пытаться их читать.

## Карта кода (порядок подключения в index.html)
- `js/config.js` — CONFIG, ВСЕ числа и тексты. Ключи: `version` (стр. 3), `round`, `boss`, `phone`, `ui`, `characters` (реестр персонажей), `rules`, `ciceridis` (большой блок: физика + пулы тостов), `sprites` (пути, кадры, позиции на фоне), `scoring`, `warnings`, `memes`, `bossLines`, `bossAngryLines`, `finalPortraits`, `ranks`.
- `js/input.js` — Input: pointer-события, `pressed` (Вова), `leftHeld/rightHeld/tapLeft/tapRight` (Цицеридис), `reset()`.
- `js/boss.js` — Boss: автомат AT_FLIPCHART → TURNING → WATCHING (+ фальстарт, телеграф), фазы сложности.
- `js/vova.js` — Vova: телефон вверх/вниз, мин. время состояний, `checkCaught()`.
- `js/ciceridis.js` — Ciceridis: фазы toast/drink/joy/nextToast/fall/win, качание (`swayAngle`), тапы (`applyTap`), план тостов.
- `js/ui.js` — UI (DOM): HUD `updateHUD`, `showSelect` (экран выбора, карточки), `showFinal` (финалы), `share`/`_prepareShareCard` (картинка для шаринга), `bubble`/`bubbleWords` (плашки), пауза/правила/обучение (`showPauseMenu`, `showRules`, `showTutorial`), `toast`.
- `js/scene.js` — Scene (canvas): `loadSprites`, `layout`, `drawSpriteOnBg`, `draw` (главная отрисовка), `headPoint`/`bubbleAnchor`, `drawCiceridisSprite`. Функции `drawRoom/drawPoster/drawClock/drawWindow/tower/drawLamps/drawChair/drawTable/drawChart` и код-арт в `drawVova/drawBoss/drawCiceridis/drawFlipchart` — фолбэк на случай незагрузки спрайтов, обычно не трогать.
- `js/main.js` — игровой цикл (delta time), смена экранов, связка модулей.
- `css/style.css` — стили UI, пиксельный шрифт.
- `tools/compress_assets.ps1` — сжатие арта для `assets/`. Остальные `tools/*.ps1` — разовые диагностические, не запускать без просьбы.

## Дизайн-доки
`design/README.md` — статус; `design/tz-vova-minigame.md` — ТЗ Вовы (источник правды); `design/tz-ciceridis-minigame.md` — ТЗ Цицеридиса; `design/decisions.md` — решения. Дизайн меняет только пользователь / режим «Геймдизайнер»; ИИ сообщает о проблемах, а не меняет молча.

## Цикл работы ИИ (каждое изменение игры)
1. Сделать задачу. Самопроверки (автотесты, превью, запуск скриптов) не делать — проверяет пользователь. **Всегда** поднять `version` в `js/config.js` (v0.9.86 → v0.9.87).
2. Если добавлен новый JS-файл — подключить его в `index.html`.
3. Коммит ОДНОЙ командой: `git fetch origin && git add -A && git commit -m "<что сделано, по-русски>" && git status -sb`. Не делать `--amend`/rebase запушенного. Push делает пользователь.
4. Коротко сообщить: что изменилось; «открой `index.html` двойным кликом»; что проверить на телефоне.
5. В конце всегда два блока (одна кнопка — одна команда):

```
git push dev main
```
↑ для теста: https://artemyakudza-max.github.io/dev-office/

```
git push
```
↑ для прода: https://artemyakudza-max.github.io/office/

## Договорённости
- Числа баланса и все тексты — только в `js/config.js`. Комментарии в коде — короткие, на русском.
- Реестр персонажей: имена и тексты — только в `CONFIG.characters` (`name` — капс для карточки, `namePause` — для интерфейса, `gameTitle` — название мини-игры). В HTML/JS имена не хардкодить. Новый персонаж = запись в `CONFIG.characters` + карточка в `UI.showSelect`.
- Арт: пользователь кладёт исходники в `design/assets/characters/` (не трогать). ИИ сжимает через `tools/compress_assets.ps1` (NearestNeighbor) и кладёт в `assets/` под именами из `CONFIG.sprites` / `CONFIG.finalPortraits`. Ширина: портреты ≤ 512px и ≤ 200 КБ; листы персонажей ≤ 768px; фон ≤ 720px; крупные листы ≤ 1024px. Цель — все ассеты < 3 МБ.
- Формат: по умолчанию JPEG (~80). Если спрайту нужна прозрачность — не сохранять PNG молча, а сказать пользователю и предложить вариант (например, залить фон цветом сцены).
- Маленькие шаги: одно изменение = одна проверка пользователем.

## Справка
- Запуск: двойной клик по `index.html`; если нужно — `python -m http.server 8000`.
- Синтаксис: `node --check js/<файл>.js`. Ошибки — F12 → Console.
- Git: ветка `main`; remotes `origin` (прод, GitHub Pages) и `dev` (тест). Папка: `c:\Users\kolesnikov\Desktop\temp\Oth\Projects\one love office`.
