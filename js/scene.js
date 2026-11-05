// Отрисовка сцены: переговорная в agile-офисе ВТБ в Москва-Сити (референсы:
// skaz.design/vtb — графит + синие акценты бренда, стекло, растения;
// окно — кластер башен Москва-Сити: синие стеклянные «Федерация»/«ОКО»,
// медная «Меркурий», ночная подсветка)
// Логические координаты 360×640 (портрет), фон тянется на весь экран
const Scene = {
	W: 360,
	H: 640,
	canvas: null,
	ctx: null,

	// Состояния для отрисовки (меняет main.js)
	mode: "vova",        // какая мини-игра на экране: "vova" | "ciceridis"
	vovaPhoneUp: false,
	vovaCaught: false,   // Вова пойман — телефон заблокирован
	animTime: 0,         // игровое время для анимаций
	bossState: "AT_FLIPCHART",
	bossTelegraph: false, // маркер на полке — сигнал скорого поворота

	// Загруженные спрайты (вариант B). Если файл не загрузился — null,
	// и рисуется код-арт (фолбэк, игра не ломается)
	sprites: { vova: null, boss: null, bg: null, flipchart: null },

	init(canvas) {
		this.canvas = canvas;
		this.ctx = canvas.getContext("2d");
		this.resize();
		window.addEventListener("resize", () => this.resize());
		this.loadSprites();
	},

	// Загрузка спрайтов из CONFIG.sprites. Ошибка загрузки = фолбэк на код-арт
	loadSprites() {
		const cfg = CONFIG.sprites;
		if (!cfg || !cfg.useSprites) return;
		const load = (src, key) => {
			const img = new Image();
			img.onload = () => { this.sprites[key] = img; };
			img.onerror = () => { this.sprites[key] = null; };
			img.src = src;
		};
		if (cfg.bg) load(cfg.bg, "bg");
		if (cfg.vova && cfg.vova.sheet) load(cfg.vova.sheet, "vova");
		if (cfg.boss && cfg.boss.sheet) load(cfg.boss.sheet, "boss");
		if (cfg.flipchart && cfg.flipchart.sheet) load(cfg.flipchart.sheet, "flipchart");
	},

	// Прямоугольник фона в логических координатах (заполняется в draw()).
	// Персонажи позиционируются относительно него — стоят на полу комнаты
	// при любом размере экрана (якорные доли fx/fy/hFrac из конфига)
	bgRect: null,

	// Прямоугольник для привязки персонажей: пересечение фона с видимой
	// областью экрана. На портретном телефоне альбомный фон сильно шире
	// экрана — без этого персонажи уезжают за края
	anchorRect: null,

	// Прямоугольник привязки: anchorRect, иначе bgRect, иначе весь экран
	anchor() {
		return this.anchorRect || this.bgRect ||
			{ dx: 0, dy: 0, dw: this.W, dh: this.H };
	},

	// Опорная высота для размеров персонажей. На портретном телефоне фон
	// вытягивается по высоте (dh велико) — без ограничения по ширине
	// персонажи становятся огромными и налезают друг на друга
	unitH(r) {
		return Math.min(r.dh, r.dw * 1.5);
	},

	// Раскладка персонажей по видимой области (считается в draw(), кэш —
	// layoutCache). Узкий экран (мобайл): Вова у левого края, флипчарт у
	// правого, босс вплотную к флипчарту. Широкий (десктоп): позиции по
	// долям ширины (fx из конфига)
	layout() {
		const r = this.anchor();
		const uh = this.unitH(r);
		const vovaCfg = CONFIG.sprites.vova;
		const bossCfg = CONFIG.sprites.boss;
		const flipCfg = CONFIG.sprites.flipchart;
		const vovaW = uh * vovaCfg.hFrac * (vovaCfg.frame.w / vovaCfg.frame.h);
		const bossW = uh * bossCfg.hFrac * (bossCfg.frame.w / bossCfg.frame.h);
		const flipW = uh * flipCfg.hFrac * (flipCfg.frame.w / flipCfg.frame.h);
		const gap = bossW * (flipCfg.bossGap ?? 0.75); // босс↔доска
		const m = 10;                                  // поле от края экрана
		let vovaX, bossX, flipX;
		if (r.dw < 500) {
			flipX = r.dx + r.dw - m - flipW / 2;       // правый край экрана
			bossX = flipX - gap;                       // босс вплотную к доске
			vovaX = r.dx + m + vovaW / 2;              // левый край экрана
		} else {
			vovaX = r.dx + r.dw * vovaCfg.fx;
			bossX = r.dx + r.dw * bossCfg.fx;
			flipX = bossX + gap;
		}
		return { r, uh, vovaX, bossX, flipX };
	},

	layoutCache: null,

	// Рисует кадр frameIndex спрайт-листа, привязанный к фону.
	// fy — линия ног (доля высоты), hFrac — высота (доля опорной высоты).
	// xOverride — готовый центр из раскладки (layout); без него — по доле fx.
	// fallback — доли для код-арт комнаты, если фон не загрузился
	drawSpriteOnBg(ctx, img, cfg, frameIndex, fallback, xOverride) {
		if (!img || !cfg) return false;
		const r = this.anchor();
		const fx = cfg.fx ?? fallback.fx;
		const fy = cfg.fy ?? fallback.fy;
		const hFrac = cfg.hFrac ?? fallback.hFrac;
		const h = this.unitH(r) * hFrac;
		const w = h * (cfg.frame.w / cfg.frame.h);
		// xOverride — ЦЕНТР персонажа из раскладки (layout)
		const x = (xOverride != null) ? xOverride - w / 2 : r.dx + r.dw * fx - w / 2;
		const y = r.dy + r.dh * fy - h;
		const fw = cfg.frame.w, fh = cfg.frame.h;
		ctx.imageSmoothingEnabled = false;
		ctx.drawImage(img, frameIndex * fw, 0, fw, fh, x, y, w, h);
		return true;
	},

	// Подгоняем canvas под вьюпорт с учётом плотности пикселей
	resize() {
		const dpr = window.devicePixelRatio || 1;
		this.canvas.width = this.canvas.clientWidth * dpr;
		this.canvas.height = this.canvas.clientHeight * dpr;
	},

	// Масштаб сцены: вписываем 360×640 в вьюпорт с сохранением пропорций (letterbox)
	getScale() {
		const dpr = window.devicePixelRatio || 1;
		const w = this.canvas.width;
		const h = this.canvas.height;
		return Math.min(w / this.W, h / this.H);
	},

	// Точка над головой персонажа в логических координатах (для плашек).
	// Считается из тех же якорных долей конфига, что и отрисовка спрайта:
	// сдвинешь персонажа в config.js — плашка переедет вместе с ним
	headPoint(who) {
		const cfg = CONFIG.sprites[who];
		if (!cfg) return { x: this.W / 2, y: this.H / 2 };
		const L = this.layoutCache || (this.layoutCache = this.layout());
		const h = L.uh * cfg.hFrac;
		return {
			x: (who === "vova") ? L.vovaX : L.bossX,
			y: L.r.dy + L.r.dh * cfg.fy - h, // верх головы
		};
	},

	// Точка и выравнивание плашки над персонажем.
	// Мобайл (узкий экран): плашка прижимается к краю экрана независимо от
	// позиции спрайта, на высоте головы. Десктоп: по центру головы
	bubbleAnchor(who) {
		const head = this.headPoint(who);
		const narrow = this.anchor().dw < 500;
		return {
			x: head.x,
			y: head.y,
			align: narrow ? (who === "vova" ? "left" : "right") : "center",
		};
	},

	// Преобразование логических координат в CSS-пиксели экрана
	// (для позиционирования DOM-плашек над объектами сцены)
	toScreen(lx, ly) {
		const dpr = window.devicePixelRatio || 1;
		const scale = this.getScale();
		const offX = (this.canvas.width - this.W * scale) / 2;
		const offY = (this.canvas.height - this.H * scale) / 2;
		return {
			x: (offX + lx * scale) / dpr,
			y: (offY + ly * scale) / dpr,
		};
	},

	// Сплошной тёмный фон (для экрана выбора персонажа)
	clearToBackground() {
		this.ctx.fillStyle = "#12141c";
		this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
	},

	draw() {
		const ctx = this.ctx;
		const dpr = window.devicePixelRatio || 1;
		const scale = this.getScale();
		const offX = (this.canvas.width - this.W * scale) / 2;
		const offY = (this.canvas.height - this.H * scale) / 2;

		// Фон вне сцены
		ctx.fillStyle = "#12151c";
		ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
		ctx.save();
		ctx.translate(offX, offY);
		ctx.scale(scale, scale);

		// Видимая область в логических координатах — чтобы фон
		// заполнял весь экран и в портрете, и в ландшафте
		const x0 = -offX / scale;
		const x1 = (this.canvas.width - offX) / scale;
		const y0 = -offY / scale;
		const y1 = (this.canvas.height - offY) / scale;

		// Фон-спрайт (вариант B): комната+окно+плакаты одним изображением.
		// Cover-fit: масштаб без искажений пропорций, центр по видимой области —
		// на портретном экране края альбомного фона обрезаются, окно остаётся в центре.
		// Если не загружен — код-арт комнаты по слоям (фолбэк)
		if (this.sprites.bg) {
			ctx.imageSmoothingEnabled = false;
			const img = this.sprites.bg;
			const vw = x1 - x0, vh = y1 - y0;
			const s = Math.max(vw / img.width, vh / img.height);
			const dw = img.width * s, dh = img.height * s;
			const dx = x0 + (vw - dw) / 2, dy = y0 + (vh - dh) / 2;
			ctx.drawImage(img, dx, dy, dw, dh);
			this.bgRect = { dx, dy, dw, dh };
			const ax0 = Math.max(dx, x0), ay0 = Math.max(dy, y0);
			const ax1 = Math.min(dx + dw, x1), ay1 = Math.min(dy + dh, y1);
			this.anchorRect = { dx: ax0, dy: ay0, dw: ax1 - ax0, dh: ay1 - ay0 };
		} else {
			this.bgRect = null;
			this.anchorRect = { dx: x0, dy: y0, dw: x1 - x0, dh: y1 - y0 };
			this.drawRoom(ctx, x0, x1, y0, y1);
			this.drawPoster(ctx);
			this.drawClock(ctx);
			this.drawWindow(ctx);
			this.drawLamps(ctx);
		}
		this.layoutCache = this.layout(); // раскладка на этот кадр
		if (this.mode === "ciceridis") {
			// Мини-игра «Цицеридис»: своя сцена, персонажи Вовы не рисуются
			this.drawCiceridis(ctx);
			ctx.restore();
			return;
		}
		this.drawFlipchart(ctx);
		// Кресло и стол уже нарисованы в спрайте Вовы — код-арт не дублируем
		if (!this.sprites.vova) {
			this.drawChair(ctx);
			this.drawVova(ctx);
			this.drawTable(ctx);
		} else {
			this.drawVova(ctx);
		}

		this.drawBoss(ctx);

		ctx.restore();
	},

	// Комната: потолок, графитовая стена с синей лентой бренда, панель, ковролин.
	// x0..x1, y0..y1 — видимая область: фон тянется на весь экран
	drawRoom(ctx, x0, x1, y0, y1) {
		// Потолок
		ctx.fillStyle = "#1a1e26";
		ctx.fillRect(x0, y0, x1 - x0, 28 - y0);
		ctx.fillStyle = "#161a21";
		ctx.fillRect(x0, 24, x1 - x0, 4);

		// Стена — графит
		ctx.fillStyle = "#2e333c";
		ctx.fillRect(x0, 28, x1 - x0, 348);
		// Тёплый отсвет от ламп
		ctx.fillStyle = "rgba(240, 214, 160, 0.05)";
		ctx.fillRect(x0, 28, x1 - x0, 200);
		// Гексагоны — фирменный мотив ВТБ (свет и рельеф)
		ctx.strokeStyle = "#3a4150";
		ctx.lineWidth = 2;
		for (let hx = 30; hx < x1; hx += 90) {
			this.hexagon(ctx, hx, 90, 14);
			this.hexagon(ctx, hx + 45, 130, 14);
		}
		// Синяя лента бренда ВТБ
		ctx.fillStyle = "#2f5fd0";
		ctx.fillRect(x0, 344, x1 - x0, 10);
		ctx.fillStyle = "#4a7ae0";
		ctx.fillRect(x0, 344, x1 - x0, 3);

		// Нижняя панель стены
		ctx.fillStyle = "#383e4a";
		ctx.fillRect(x0, 354, x1 - x0, 114);
		ctx.fillStyle = "#2c313c";
		for (let x = Math.floor(x0 / 48) * 48; x < x1; x += 48) {
			ctx.fillRect(x, 358, 3, 106);
		}
		// Плинтус
		ctx.fillStyle = "#3f4552";
		ctx.fillRect(x0, 468, x1 - x0, 10);

		// Пол — ковролин
		ctx.fillStyle = "#232833";
		ctx.fillRect(x0, 478, x1 - x0, y1 - 478);
		ctx.fillStyle = "#20242e";
		for (let y = 478; y < y1; y += 24) {
			for (let x = Math.floor(x0 / 48) * 48 + ((y / 24) % 2) * 24; x < x1; x += 48) {
				ctx.fillRect(x, y, 24, 24);
			}
		}
		// Тёплый световой пул на полу
		ctx.fillStyle = "rgba(240, 214, 160, 0.06)";
		ctx.fillRect(x0, 478, x1 - x0, 60);
	},

	// Шестиугольник (контур)
	hexagon(ctx, cx, cy, r) {
		ctx.beginPath();
		for (let i = 0; i < 6; i++) {
			const a = Math.PI / 3 * i + Math.PI / 6;
			const px = cx + r * Math.cos(a);
			const py = cy + r * Math.sin(a);
			if (i === 0) ctx.moveTo(px, py);
			else ctx.lineTo(px, py);
		}
		ctx.closePath();
		ctx.stroke();
	},

	// Доска KPI на стене — синие столбцы (агильный офис)
	drawPoster(ctx) {
		const x = 44, y = 72, w = 64, h = 84;
		ctx.fillStyle = "#3a3f4a";
		ctx.fillRect(x - 4, y - 4, w + 8, h + 8);
		ctx.fillStyle = "#d8d4c8";
		ctx.fillRect(x, y, w, h);
		ctx.fillStyle = "#2f5fd0";
		ctx.fillRect(x + 8, y + 44, 8, 28);
		ctx.fillRect(x + 20, y + 34, 8, 38);
		ctx.fillRect(x + 32, y + 22, 8, 50);
		ctx.fillRect(x + 44, y + 12, 8, 60);
		ctx.fillStyle = "#8a867a";
		ctx.fillRect(x + 8, y + 8, 40, 3);
		ctx.fillRect(x + 8, y + 14, 28, 3);
	},

	// Настенные часы — на них смотрит босс в фальстарте (слева от окна)
	drawClock(ctx) {
		const cx = 168, cy = 84, r = 18;
		// Корпус
		ctx.fillStyle = "#3f4552";
		ctx.fillRect(cx - r - 4, cy - r - 4, (r + 4) * 2, (r + 4) * 2);
		// Циферблат
		ctx.fillStyle = "#e8e8e4";
		ctx.fillRect(cx - r, cy - r, r * 2, r * 2);
		// Срезаем углы «круга» пикселями
		ctx.fillStyle = "#3f4552";
		ctx.fillRect(cx - r, cy - r, 4, 4);
		ctx.fillRect(cx + r - 4, cy - r, 4, 4);
		ctx.fillRect(cx - r, cy + r - 4, 4, 4);
		ctx.fillRect(cx + r - 4, cy + r - 4, 4, 4);
		// Метки 12/3/6/9
		ctx.fillStyle = "#2a2e38";
		ctx.fillRect(cx - 1, cy - r + 2, 2, 4);
		ctx.fillRect(cx - 1, cy + r - 6, 2, 4);
		ctx.fillRect(cx - r + 2, cy - 1, 4, 2);
		ctx.fillRect(cx + r - 6, cy - 1, 4, 2);
		// Стрелки: почти конец совещания (без минутной — часовая к 12)
		ctx.fillStyle = "#2a2e38";
		ctx.fillRect(cx - 1, cy - 10, 2, 10); // часовая к 12
		ctx.fillRect(cx - 1, cy - 2, 2, 8);   // хвост
		ctx.fillRect(cx, cy - 1, 8, 2);       // минутная на 3 (15 минут)
		// Центр
		ctx.fillStyle = "#c05050";
		ctx.fillRect(cx - 1, cy - 1, 2, 2);
	},

	// Окно: ночная Москва-Сити — кластер стеклянных башен
	drawWindow(ctx) {
		const x = 220, y = 64, w = 104, h = 132;
		// Рама
		ctx.fillStyle = "#3f4552";
		ctx.fillRect(x - 6, y - 6, w + 12, h + 12);
		// Ночное небо
		ctx.fillStyle = "#0d1118";
		ctx.fillRect(x, y, w, h);
		// Звёзды
		ctx.fillStyle = "#8a92a8";
		ctx.fillRect(x + 12, y + 10, 2, 2);
		ctx.fillRect(x + 40, y + 20, 2, 2);
		ctx.fillRect(x + 66, y + 6, 2, 2);
		ctx.fillRect(x + 92, y + 28, 2, 2);
		// Луна-серп
		ctx.fillStyle = "#d8d8c8";
		ctx.fillRect(x + 80, y + 10, 12, 12);
		ctx.fillStyle = "#0d1118";
		ctx.fillRect(x + 76, y + 6, 10, 10);

		// Башни Москва-Сити (слева направо):
		// «Федерация-Запад» — синяя, ниже
		this.tower(ctx, x + 4, y + 56, 18, 76, "#24406a", "#d8b860");
		// «Федерация-Восток» — самая высокая, синяя со шпилем
		this.tower(ctx, x + 26, y + 26, 22, 106, "#2a4a7a", "#f0d090");
		ctx.fillStyle = "#2a4a7a";
		ctx.fillRect(x + 35, y + 18, 4, 8); // шпиль
		// «Меркурий» — медная
		this.tower(ctx, x + 52, y + 44, 18, 88, "#8a5a30", "#f0a860");
		// «ОКО» — синяя, широкая
		this.tower(ctx, x + 74, y + 66, 26, 66, "#26456e", "#d8b860");

		// Река внизу с отражениями
		ctx.fillStyle = "#141c2c";
		ctx.fillRect(x, y + h - 14, w, 14);
		ctx.fillStyle = "rgba(240, 208, 144, 0.35)";
		ctx.fillRect(x + 30, y + h - 10, 4, 8);
		ctx.fillRect(x + 58, y + h - 12, 4, 8);
		ctx.fillRect(x + 84, y + h - 9, 4, 6);

		// Перемычка рамы
		ctx.fillStyle = "#3f4552";
		ctx.fillRect(x + w / 2 - 2, y, 4, h);
		ctx.fillRect(x, y + h / 2 - 2, w, 4);
		// Подоконник
		ctx.fillStyle = "#4a505c";
		ctx.fillRect(x - 10, y + h + 6, w + 20, 8);
	},

	// Башня: корпус + сетка горящих окон
	tower(ctx, x, y, w, h, glass, light) {
		ctx.fillStyle = glass;
		ctx.fillRect(x, y, w, h);
		// Сетка окон: часть горит
		for (let wy = y + 4; wy < y + h - 4; wy += 8) {
			for (let wx = x + 3; wx < x + w - 3; wx += 7) {
				if ((wx * 7 + wy * 13) % 5 < 2) {
					ctx.fillStyle = light;
					ctx.fillRect(wx, wy, 3, 4);
				}
			}
		}
	},

	// Потолочные лампы с тёплым светом
	drawLamps(ctx) {
		for (const lx of [70, 250]) {
			ctx.fillStyle = "#3a3f4a";
			ctx.fillRect(lx - 22, 8, 44, 10);
			ctx.fillStyle = "#f0e0b0";
			ctx.fillRect(lx - 18, 18, 36, 6);
			ctx.fillStyle = "rgba(240, 224, 176, 0.08)";
			ctx.fillRect(lx - 30, 24, 60, 90);
		}
	},

	// Флипчарт: позади босса, чуть правее и крупнее него (доли из конфига,
	// привязка к фону — как у персонажей). Рисуется до босса, чтобы босс
	// перекрывал его — флипчарт «за спиной».
	// Спрайт: 4 листа «доклада», меняются по номеру цикла босса.
	// Нет спрайта — код-арт (фолбэк, игра не ломается)
	drawFlipchart(ctx) {
		const cfg = CONFIG.sprites.flipchart;
		if (!cfg) return;
		const L = this.layoutCache || (this.layoutCache = this.layout());
		const h = L.uh * cfg.hFrac;
		const spr = this.sprites.flipchart && cfg.frame;
		const w = h * (spr ? cfg.frame.w / cfg.frame.h : 0.78);
		const x = L.flipX - w / 2;
		const y = L.r.dy + L.r.dh * cfg.fy - h;
		const s = h / 200;                // масштаб деталей (исходник ~200 высотой)
		if (spr) {
			const frame = Boss.cycleCount % 4;
			ctx.imageSmoothingEnabled = false;
			ctx.drawImage(this.sprites.flipchart,
				frame * cfg.frame.w, 0, cfg.frame.w, cfg.frame.h, x, y, w, h);
		} else {
			// Ножки-тренога
			ctx.fillStyle = "#3a3f4a";
			ctx.fillRect(x + w * 0.62, y + h * 0.52, 8 * s, h * 0.42);
			ctx.fillRect(x + w * 0.12, y + h * 0.52, 8 * s, h * 0.38);
			ctx.fillRect(x + w * 0.86, y + h * 0.52, 8 * s, h * 0.38);
			// Полка под листом
			ctx.fillStyle = "#4a505c";
			ctx.fillRect(x + w * 0.05, y + h * 0.50, w * 0.9, 8 * s);
			// Маркеры на полке
			ctx.fillStyle = "#c05050";
			ctx.fillRect(x + w * 0.12, y + h * 0.48, 10 * s, 4 * s);
			ctx.fillStyle = "#4a7a9a";
			ctx.fillRect(x + w * 0.30, y + h * 0.48, 10 * s, 4 * s);
			// Доска с белым листом
			ctx.fillStyle = "#3f4552";
			ctx.fillRect(x, y, w, h * 0.52);
			ctx.fillStyle = "#e8e8e4";
			ctx.fillRect(x + 4 * s, y + 4 * s, w - 8 * s, h * 0.52 - 8 * s);
			this.drawChart(ctx, x + 8 * s, y + 8 * s, w - 16 * s, h * 0.52 - 16 * s, Boss.cycleCount % 4);
		}
	},

	// Офисное кресло Вовы (вид сбоку): спинка, сиденье, газлифт, крестовина с колёсами
	drawChair(ctx) {
		// Спинка — вертикальная плита за спиной
		ctx.fillStyle = "#262a33";
		ctx.fillRect(44, 344, 16, 72);
		ctx.fillStyle = "#2f5fd0"; // синий акцент бренда
		ctx.fillRect(44, 344, 16, 6);
		// Сиденье — горизонтальная плита, таз на её уровне
		ctx.fillStyle = "#262a33";
		ctx.fillRect(44, 414, 62, 10);
		ctx.fillStyle = "#31353f";
		ctx.fillRect(44, 414, 62, 3);
		// Газлифт
		ctx.fillStyle = "#3a3f4a";
		ctx.fillRect(68, 424, 8, 44);
		// Крестовина
		ctx.fillRect(50, 468, 46, 6);
		// Колёсики — касаются пола (y=478)
		ctx.fillStyle = "#1c1f26";
		ctx.fillRect(50, 472, 8, 6);
		ctx.fillRect(88, 472, 8, 6);
	},

	// Сцена мини-игры «Цицеридис» (этап 3): заглушка — Чекеридис стоит на стуле.
	// Код-арт: стул + пиксельный человечек с бокалом. Настоящий спрайт
	// и анимации добавим на следующих этапах
	drawCiceridis(ctx) {
		const cx = this.W / 2;   // центр сцены
		const floorY = 478;      // линия пола (как в комнате Вовы)

		// Стул: сиденье, спинка, ножки
		ctx.fillStyle = "#7a5433";
		ctx.fillRect(cx - 26, floorY - 96, 52, 10);   // сиденье
		ctx.fillRect(cx - 24, floorY - 150, 8, 54);   // спинка
		ctx.fillRect(cx + 16, floorY - 150, 8, 54);
		ctx.fillRect(cx - 22, floorY - 86, 6, 86);    // ножки
		ctx.fillRect(cx + 16, floorY - 86, 6, 86);
		ctx.fillStyle = "#5c3d24";
		ctx.fillRect(cx - 26, floorY - 88, 52, 3);    // тень на сиденье

		// Чекеридис (заглушка): залезает на стул (этап 4), бокал в руке с самого начала
		const P = {
			hair: "#3a2e26",
			skin: "#e8b48c",
			jacket: "#1c1c22",
			jacketLight: "#2a2a34",
			jeans: "#3a4a6a",
			glass: "#c8a038",
			beer: "#e8a830",
			foam: "#f5f0e0",
		};
		// Прогресс залезания 0..1: от пола (y=floorY) до сиденья (floorY-96)
		const p = Ciceridis.climbProgress();
		const ease = p * p * (3 - 2 * p); // плавный ease-in-out
		const bx = cx - 14;
		const by = floorY - 96 * ease; // базовая точка: от пола к сиденью
		// Ноги (стоя на сиденье)
		ctx.fillStyle = P.jeans;
		ctx.fillRect(bx + 4, by - 34, 9, 34);
		ctx.fillRect(bx + 15, by - 34, 9, 34);
		ctx.fillStyle = "#1a1a20";
		ctx.fillRect(bx + 2, by - 4, 12, 4);   // ботинки
		ctx.fillRect(bx + 14, by - 4, 12, 4);
		// Торс — кожаная куртка
		ctx.fillStyle = P.jacket;
		ctx.fillRect(bx, by - 74, 28, 42);
		ctx.fillStyle = P.jacketLight;
		ctx.fillRect(bx + 12, by - 74, 4, 42); // молния
		// Голова
		ctx.fillStyle = P.skin;
		ctx.fillRect(bx + 6, by - 96, 18, 22);
		ctx.fillStyle = P.hair;
		ctx.fillRect(bx + 4, by - 100, 22, 8);
		ctx.fillStyle = "#26262a";
		ctx.fillRect(bx + 10, by - 88, 3, 3);  // глаза
		ctx.fillRect(bx + 18, by - 88, 3, 3);
		// Рука с бокалом (справа)
		ctx.fillStyle = P.jacket;
		ctx.fillRect(bx + 26, by - 68, 8, 20);
		ctx.fillStyle = P.skin;
		ctx.fillRect(bx + 28, by - 50, 6, 6);
		// Бокал: пиво с пенкой
		ctx.fillStyle = P.glass;
		ctx.fillRect(bx + 26, by - 66, 10, 16);
		ctx.fillStyle = P.beer;
		ctx.fillRect(bx + 27, by - 58, 8, 7);
		ctx.fillStyle = P.foam;
		ctx.fillRect(bx + 27, by - 66, 8, 4);
	},

	// Вова: сидит за столом, вид сбоку, лицом вправо.
	// Спрайт (вариант B): 3 кадра — слушает / телефон / пойман.
	// Если спрайт не загружен — пиксель-арт кодом (фолбэк),
	// палитра от референса vova.png (светло-русые волосы, чёрный худи)
	drawVova(ctx) {
		// Кадр спрайта: 0 слушает, 1 телефон наверху, 2 пойман
		if (this.sprites.vova) {
			const fi = this.vovaCaught ? 2 : (this.vovaPhoneUp ? 1 : 0);
			const L = this.layoutCache || (this.layoutCache = this.layout());
			// Фолбэк-доли для код-арт комнаты (без фона): где Вова сидел в код-арте
			this.drawSpriteOnBg(ctx, this.sprites.vova, CONFIG.sprites.vova, fi,
				{ fx: 0.19, fy: 0.747, hFrac: 0.253 }, L.vovaX);
			return;
		}
		const P = {
			hair: "#b98d5a",
			hairDark: "#8a6238",
			skin: "#e8b48c",
			skinDark: "#c98f68",
			hoodie: "#23262e",
			hoodieLight: "#2e323c",
			jeans: "#3a3f4a",
			jeansDark: "#2e323c",
			shoe: "#e8e8e8",
			phone: "#14161a",
			screen: "#4a7a9a",
			eye: "#26262a",
		};

		const frame = Math.floor(this.animTime * 2) % 2;
		const nod = this.vovaPhoneUp ? 0 : frame;
		const caught = this.vovaCaught;
		const bx = 56, by = 326; // базовая точка (верх головы)

		// --- Ноги: бёдра параллельны полу, колени под прямым углом, стопы на полу ---
		// Бёдра на сиденье
		ctx.fillStyle = P.jeans;
		ctx.fillRect(bx + 2, by + 76, 38, 16);
		// Бедро вперёд (вправо), чуть ниже столешницы
		ctx.fillRect(bx + 4, by + 92, 42, 16);
		// Голень дальняя (в тени)
		ctx.fillStyle = P.jeansDark;
		ctx.fillRect(bx + 30, by + 112, 10, 32);
		// Голень ближняя — вертикально от колена
		ctx.fillStyle = P.jeans;
		ctx.fillRect(bx + 40, by + 108, 12, 36);
		// Кроссовки на полу (y=478)
		ctx.fillStyle = "#c8c8c8";
		ctx.fillRect(bx + 28, by + 144, 14, 8); // дальняя
		ctx.fillStyle = P.shoe;
		ctx.fillRect(bx + 40, by + 144, 18, 8); // ближняя, носок вправо
		ctx.fillStyle = "#b8b8b8";
		ctx.fillRect(bx + 40, by + 150, 18, 2);

		// --- Торс: худи (сидит, до сиденья кресла) ---
		ctx.fillStyle = P.hoodie;
		ctx.fillRect(bx + 2, by + 34, 40, 52);
		// Капюшон за спиной
		ctx.fillStyle = P.hoodieLight;
		ctx.fillRect(bx, by + 32, 10, 18);
		// Ворот
		ctx.fillStyle = P.hoodieLight;
		ctx.fillRect(bx + 26, by + 32, 16, 6);
		// Шнурки капюшона
		ctx.fillStyle = "#d8d8d8";
		ctx.fillRect(bx + 30, by + 38, 2, 10);
		ctx.fillRect(bx + 38, by + 38, 2, 8);
		// Молния
		ctx.fillStyle = "#3a3e48";
		ctx.fillRect(bx + 34, by + 40, 2, 44);

		// --- Голова (профиль вправо) ---
		const hy = by + nod;
		ctx.fillStyle = P.hair;
		ctx.fillRect(bx + 8, hy + 4, 26, 10);
		ctx.fillRect(bx + 6, hy + 8, 6, 16); // затылок
		ctx.fillRect(bx + 10, hy + 2, 6, 2);
		ctx.fillRect(bx + 18, hy, 8, 4);
		ctx.fillRect(bx + 28, hy + 2, 6, 2);
		ctx.fillStyle = P.hairDark;
		ctx.fillRect(bx + 14, hy + 4, 4, 8);
		ctx.fillRect(bx + 24, hy + 6, 4, 6);
		// Лицо
		ctx.fillStyle = P.skin;
		ctx.fillRect(bx + 12, hy + 14, 22, 14);
		ctx.fillRect(bx + 16, hy + 28, 14, 4);
		// Ухо
		ctx.fillStyle = P.skinDark;
		ctx.fillRect(bx + 10, hy + 18, 4, 6);
		// Глаз: обычный или широкий (пойман)
		if (caught) {
			ctx.fillStyle = "#ffffff";
			ctx.fillRect(bx + 24, hy + 16, 8, 8);
			ctx.fillStyle = P.eye;
			ctx.fillRect(bx + 27, hy + 19, 4, 4);
		} else {
			ctx.fillStyle = P.eye;
			ctx.fillRect(bx + 26, hy + 18, 4, 4);
			ctx.fillStyle = P.hairDark;
			ctx.fillRect(bx + 24, hy + 14, 8, 2);
		}
		// Рот
		ctx.fillStyle = "#b06a5a";
		if (caught) {
			ctx.fillRect(bx + 26, hy + 26, 4, 4);
		} else if (this.vovaPhoneUp) {
			ctx.fillRect(bx + 26, hy + 26, 8, 2);
			ctx.fillRect(bx + 32, hy + 24, 2, 2);
		} else {
			ctx.fillRect(bx + 26, hy + 26, 6, 2);
		}

		// --- Руки и телефон ---
		if (caught) {
			// Пойман: рука вскинута, телефон замер у лица
			ctx.fillStyle = P.hoodie;
			ctx.fillRect(bx + 30, by + 24, 8, 18);
			ctx.fillStyle = P.skin;
			ctx.fillRect(bx + 28, by + 18, 8, 8);
			ctx.fillStyle = P.phone;
			ctx.fillRect(bx + 26, by - 4, 12, 22);
			ctx.fillStyle = P.screen;
			ctx.fillRect(bx + 28, by - 2, 8, 16);
		} else if (this.vovaPhoneUp) {
			// Листает: локоть на столе, телефон над столом, палец двигается
			ctx.fillStyle = P.hoodie;
			ctx.fillRect(bx + 32, by + 40, 10, 26); // плечо/локоть
			ctx.fillRect(bx + 38, by + 62, 16, 10); // предплечье к телефону
			ctx.fillStyle = P.skin;
			ctx.fillRect(bx + 52, by + 60, 8, 10); // кисть
			ctx.fillStyle = P.phone;
			ctx.fillRect(bx + 56, by + 38, 16, 26);
			ctx.fillStyle = P.screen;
			ctx.fillRect(bx + 58, by + 40, 12, 20);
			ctx.fillStyle = P.skin;
			ctx.fillRect(bx + 58 + frame * 4, by + 54, 4, 4); // большой палец
		} else {
			// Слушает: предплечье лежит на столе, кисть на столешнице
			ctx.fillStyle = P.hoodie;
			ctx.fillRect(bx + 32, by + 40, 10, 44); // плечо вниз к столу
			ctx.fillRect(bx + 36, by + 78, 20, 10); // предплечье на столе
			ctx.fillStyle = P.skin;
			ctx.fillRect(bx + 52, by + 86, 12, 8); // кисть на столешнице (y=420)
		}
	},

	// Босс: стоит у флипчарта, лицом к игроку.
	// Спрайт (вариант B): 4 кадра — флипчарт / поворот / смотрит / фальстарт.
	// Если спрайт не загружен — пиксель-арт кодом (фолбэк).
	// Силуэт «босса»: костюм, синий галстук (акцент ВТБ), лысый в очках.
	drawBoss(ctx) {
		// Кадр спрайта по состоянию автомата босса
		if (this.sprites.boss) {
			const map = { AT_FLIPCHART: 0, TURNING: 1, WATCHING: 2, FAKEOUT: 3 };
			const L = this.layoutCache || (this.layoutCache = this.layout());
			// Фолбэк-доли для код-арт комнаты (без фона): где стоял босс в код-арте
			this.drawSpriteOnBg(ctx, this.sprites.boss, CONFIG.sprites.boss, map[this.bossState] || 0,
				{ fx: 0.77, fy: 0.747, hFrac: 0.231 }, L.bossX);
			return;
		}
		const P = {
			suit: "#2a2e3a",
			suitLight: "#343846",
			shirt: "#e8e8e8",
			tie: "#2f5fd0",
			pants: "#262a34",
			shoe: "#1c1f26",
			skin: "#d8a878",
			skinDark: "#b8885c",
			glasses: "#14161a",
		};

		const frame = Math.floor(this.animTime * 2) % 2;
		const state = this.bossState;
		// Ноги на полу (y=478), рост ~150
		const bx = 258, by = 330; // верх головы

		// --- Ноги и обувь (видны во всех состояниях) ---
		ctx.fillStyle = P.pants;
		ctx.fillRect(bx + 6, by + 108, 14, 34); // левая нога
		ctx.fillRect(bx + 26, by + 108, 14, 34); // правая нога
		ctx.fillStyle = P.shoe;
		ctx.fillRect(bx + 4, by + 142, 18, 8);
		ctx.fillRect(bx + 24, by + 142, 18, 8);

		// --- Корпус: пиджак ---
		ctx.fillStyle = P.suit;
		ctx.fillRect(bx + 2, by + 44, 42, 66);
		// Плечи шире
		ctx.fillRect(bx, by + 44, 46, 10);

		if (state === "AT_FLIPCHART") {
			// Спиной/боком к игроку: затылок, рука тянетсся к флипчарту
			ctx.fillStyle = P.suitLight;
			ctx.fillRect(bx + 2, by + 44, 42, 8); // складка пиджака
			// Рука к флипчарту: жестикуляция — 2 кадра (указывает/рисует)
			const armY = frame === 0 ? by + 52 : by + 62;
			ctx.fillStyle = P.suit;
			ctx.fillRect(bx + 42, armY, 22, 8);
			ctx.fillStyle = P.skin;
			ctx.fillRect(bx + 62, armY - 2, 6, 10); // кисть с маркером
			ctx.fillStyle = "#c05050";
			ctx.fillRect(bx + 66, armY - 4, 4, 6); // маркер
			// Голова: затылок (лысый верх, волосы по бокам)
			ctx.fillStyle = P.skin;
			ctx.fillRect(bx + 10, by + 14, 26, 30);
			ctx.fillStyle = P.skinDark;
			ctx.fillRect(bx + 10, by + 14, 26, 6); // лысина в тени
			ctx.fillStyle = "#4a4038";
			ctx.fillRect(bx + 8, by + 26, 4, 14); // волосы сзади
			ctx.fillRect(bx + 10, by + 40, 26, 4); // воротник
		} else {
			// Лицом к игроку: рубашка, галстук, лицо в очках
			ctx.fillStyle = P.shirt;
			ctx.fillRect(bx + 16, by + 44, 14, 30);
			ctx.fillStyle = P.tie;
			ctx.fillRect(bx + 20, by + 48, 6, 26);
			ctx.fillStyle = P.suitLight;
			ctx.fillRect(bx + 12, by + 44, 4, 40); // лацканы
			ctx.fillRect(bx + 30, by + 44, 4, 40);

			if (state === "TURNING") {
				// Поворот: голова ещё полубоком, плечи развёрнуты
				ctx.fillStyle = P.skin;
				ctx.fillRect(bx + 12, by + 14, 22, 30);
				ctx.fillStyle = P.skinDark;
				ctx.fillRect(bx + 12, by + 14, 8, 30); // половина в тени
				ctx.fillStyle = P.glasses;
				ctx.fillRect(bx + 24, by + 24, 10, 4); // очки в полупрофиль
			} else {
				// Смотрит / фальстарт: лицо целиком
				ctx.fillStyle = P.skin;
				ctx.fillRect(bx + 10, by + 14, 26, 30);
				// Лысина: блеск сверху
				ctx.fillStyle = P.skinDark;
				ctx.fillRect(bx + 14, by + 14, 18, 4);
				ctx.fillStyle = "#e8c090";
				ctx.fillRect(bx + 20, by + 15, 6, 2);
				// Очки
				ctx.fillStyle = P.glasses;
				ctx.fillRect(bx + 12, by + 24, 22, 5);
				ctx.fillStyle = "#ffffff";
				ctx.fillRect(bx + 14, by + 25, 7, 3);
				ctx.fillRect(bx + 25, by + 25, 7, 3);
				ctx.fillStyle = P.glasses;
				ctx.fillRect(bx + 20, by + 25, 2, 3); // перемычка
				// Глаза: сердитые при «смотрит», подняты к окну при фальстарте
				ctx.fillStyle = P.glasses;
				if (state === "FAKEOUT") {
					ctx.fillRect(bx + 16, by + 22, 4, 3); // зрачки вверх-влево
					ctx.fillRect(bx + 27, by + 22, 4, 3);
				} else {
					ctx.fillRect(bx + 16, by + 26, 4, 2);
					ctx.fillRect(bx + 27, by + 26, 4, 2);
					// Сердитые брови
					ctx.fillRect(bx + 13, by + 21, 8, 2);
					ctx.fillRect(bx + 25, by + 21, 8, 2);
				}
				// Рот: поджатый
				ctx.fillStyle = "#8a5a48";
				ctx.fillRect(bx + 18, by + 36, 10, 2);
				// Позиция «смотрит»: руки скрещены, покачивание
				if (state === "WATCHING") {
					const sway = frame === 0 ? 0 : 2;
					ctx.fillStyle = P.suit;
					ctx.fillRect(bx + 2 + sway, by + 62, 42, 10); // скрещенные руки
					ctx.fillStyle = P.skin;
					ctx.fillRect(bx + 20 + sway, by + 62, 8, 6); // кисть
				}
			}
		}
	},

	// Стол перед Вовой (справа от него) с бумагами и кофе.
	// Рисуется ПОСЛЕ Вовы, чтобы столешница перекрывала колени
	drawTable(ctx) {
		ctx.fillStyle = "#7a5433";
		ctx.fillRect(100, 420, 104, 16);
		ctx.fillStyle = "#96683c";
		ctx.fillRect(100, 420, 104, 4);
		ctx.fillStyle = "#55381f";
		ctx.fillRect(100, 432, 104, 4);
		ctx.fillStyle = "#4a3420";
		ctx.fillRect(108, 436, 12, 60);
		ctx.fillRect(188, 436, 12, 60);
		// Бумаги
		ctx.fillStyle = "#d8d4c8";
		ctx.fillRect(124, 412, 28, 8);
		ctx.fillRect(128, 408, 28, 6);
		// Кружка кофе
		ctx.fillStyle = "#d8d8d8";
		ctx.fillRect(168, 404, 16, 16);
		ctx.fillStyle = "#3a2a1a";
		ctx.fillRect(170, 406, 12, 4);
		ctx.fillStyle = "#d8d8d8";
		ctx.fillRect(184, 408, 4, 8);
		// Пар
		ctx.fillStyle = "rgba(220, 220, 220, 0.25)";
		ctx.fillRect(174, 396, 3, 6);
		ctx.fillRect(180, 392, 3, 8);
	},

	// Листы флипчарта — 4 разных «доклада» по номеру цикла босса
	drawChart(ctx, x, y, w, h, variant) {
		ctx.fillStyle = "#ffffff";
		ctx.fillRect(x, y, w, h);
		const blue = "#2f5fd0";
		const red = "#c05050";
		const dark = "#2a2e38";

		// Заголовок «документа»
		ctx.fillStyle = dark;
		ctx.fillRect(x + 4, y + 4, w - 20, 3);
		ctx.fillStyle = "#9a96a0";
		ctx.fillRect(x + 4, y + 10, w - 32, 2);

		if (variant === 0) {
			// Столбчатая диаграмма роста
			ctx.fillStyle = blue;
			const bw = 8;
			for (let i = 0; i < 5; i++) {
				const bh = 10 + ((i * 13) % 30);
				ctx.fillRect(x + 6 + i * (bw + 3), y + h - 8 - bh, bw, bh);
			}
		} else if (variant === 1) {
			// Линия роста вверх (ступеньками)
			ctx.fillStyle = blue;
			const steps = 6;
			for (let i = 0; i < steps; i++) {
				const lx = x + 6 + i * ((w - 14) / steps);
				const ly = y + h - 12 - i * 8;
				ctx.fillRect(lx, ly, (w - 14) / steps, 3);
				if (i < steps - 1) ctx.fillRect(lx + (w - 14) / steps - 3, ly - 8, 3, 8);
			}
		} else if (variant === 2) {
			// Падение: красная линия вниз (повод для совещания)
			ctx.fillStyle = red;
			const steps = 6;
			for (let i = 0; i < steps; i++) {
				const lx = x + 6 + i * ((w - 14) / steps);
				const ly = y + 24 + i * 7;
				ctx.fillRect(lx, ly, (w - 14) / steps, 3);
				if (i < steps - 1) ctx.fillRect(lx + (w - 14) / steps - 3, ly, 3, 7);
			}
			// Тревожный восклицательный блок
			ctx.fillStyle = red;
			ctx.fillRect(x + w - 14, y + 16, 6, 10);
			ctx.fillRect(x + w - 14, y + 28, 6, 3);
		} else {
			// «Список задач»: строки с галочками
			for (let i = 0; i < 5; i++) {
				const ly = y + 22 + i * 12;
				ctx.fillStyle = i < 3 ? "#4a8a4a" : "#9a96a0";
				ctx.fillRect(x + 6, ly, 6, 6);
				ctx.fillStyle = "#6a667a";
				ctx.fillRect(x + 16, ly + 2, w - 26, 3);
			}
		}
	},
};
