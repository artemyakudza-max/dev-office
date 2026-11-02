// Отрисовка сцены: переговорная в палитре референса vova.png
// Логические координаты 360×640 (портрет), масштабируются под вьюпорт (ТЗ §5.4)
const Scene = {
	W: 360,
	H: 640,
	canvas: null,
	ctx: null,

	// Состояния для отрисовки (меняет main.js)
	vovaPhoneUp: false,
	vovaCaught: false,   // Вова пойман — телефон заблокирован
	animTime: 0,         // игровое время для анимаций
	bossState: "AT_FLIPCHART",
	bossTelegraph: false, // маркер на полке — сигнал скорого поворота

	init(canvas) {
		this.canvas = canvas;
		this.ctx = canvas.getContext("2d");
		this.resize();
		window.addEventListener("resize", () => this.resize());
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

		this.drawRoom(ctx);
		this.drawPoster(ctx);
		this.drawWindow(ctx);
		this.drawLamps(ctx);
		this.drawFlipchart(ctx);
		this.drawTable(ctx);
		this.drawPlant(ctx);

		this.drawVova(ctx);

		// Босс — заглушка. Цвет и поза зависят от состояния автомата:
		// у флипчарта — боком (тусклый), поворот — промежуточный, смотрит — лицом (яркий)
		const bossColors = {
			AT_FLIPCHART: "#6a4a6a",
			TURNING: "#8a5a8a",
			WATCHING: "#c060c0",
			FAKEOUT: "#c060c0",
		};
		ctx.fillStyle = bossColors[this.bossState] || "#6a4a6a";
		ctx.fillRect(260, 340, 44, 80); // тело
		ctx.fillStyle = "#e0b090";
		// Голова: у флипчарта — к флипчарту (вправо), в фальстарте — к окну (влево-вверх),
		// в остальных состояниях — на игрока
		if (this.bossState === "AT_FLIPCHART") {
			ctx.fillRect(274, 310, 30, 30);
		} else if (this.bossState === "FAKEOUT") {
			ctx.fillRect(258, 302, 30, 30);
		} else {
			ctx.fillRect(266, 310, 30, 30);
		}

		ctx.restore();
	},

	// Комната: потолок, стена с панелью, плинтус, ковролин
	drawRoom(ctx) {
		// Потолок
		ctx.fillStyle = "#1a1e26";
		ctx.fillRect(0, 0, this.W, 28);
		ctx.fillStyle = "#161a21";
		ctx.fillRect(0, 24, this.W, 4);

		// Стена — тёплый тёмный тон
		ctx.fillStyle = "#2b303a";
		ctx.fillRect(0, 28, this.W, 442);
		// Лёгкий тёплый отсвет стены от ламп (верхняя половина)
		ctx.fillStyle = "rgba(240, 214, 160, 0.05)";
		ctx.fillRect(0, 28, this.W, 220);

		// Панель (нижняя часть стены)
		ctx.fillStyle = "#343a46";
		ctx.fillRect(0, 380, this.W, 88);
		// Рейка между панелью и стеной
		ctx.fillStyle = "#3f4552";
		ctx.fillRect(0, 376, this.W, 4);
		// Вертикальные швы панели
		ctx.fillStyle = "#2c313c";
		for (let x = 20; x < this.W; x += 48) {
			ctx.fillRect(x, 384, 3, 80);
		}

		// Плинтус
		ctx.fillStyle = "#3f4552";
		ctx.fillRect(0, 468, this.W, 10);

		// Пол — ковролин
		ctx.fillStyle = "#232833";
		ctx.fillRect(0, 478, this.W, this.H - 478);
		// Небольшая шахматная текстура ковра
		ctx.fillStyle = "#20242e";
		for (let y = 478; y < this.H; y += 24) {
			for (let x = ((y / 24) % 2) * 24; x < this.W; x += 48) {
				ctx.fillRect(x, y, 24, 24);
			}
		}
		// Тёплый световой пул на полу от ламп
		ctx.fillStyle = "rgba(240, 214, 160, 0.06)";
		ctx.fillRect(40, 478, 280, 60);
	},

	// Постер-мотивация на стене
	drawPoster(ctx) {
		const x = 44, y = 72, w = 64, h = 84;
		ctx.fillStyle = "#3a3f4a";
		ctx.fillRect(x - 4, y - 4, w + 8, h + 8);
		ctx.fillStyle = "#d8d4c8";
		ctx.fillRect(x, y, w, h);
		// Мини-диаграмма роста
		ctx.fillStyle = "#4a7a9a";
		ctx.fillRect(x + 8, y + 44, 8, 28);
		ctx.fillRect(x + 20, y + 34, 8, 38);
		ctx.fillRect(x + 32, y + 22, 8, 50);
		ctx.fillRect(x + 44, y + 12, 8, 60);
		// Строки «текста»
		ctx.fillStyle = "#8a867a";
		ctx.fillRect(x + 8, y + 8, 40, 3);
		ctx.fillRect(x + 8, y + 14, 28, 3);
	},

	// Окно с ночным городом, шторы
	drawWindow(ctx) {
		const x = 220, y = 64, w = 104, h = 132;
		// Шторы по бокам
		ctx.fillStyle = "#43384a";
		ctx.fillRect(x - 14, y - 10, 12, h + 20);
		ctx.fillRect(x + w + 2, y - 10, 12, h + 20);
		// Рама
		ctx.fillStyle = "#3f4552";
		ctx.fillRect(x - 6, y - 6, w + 12, h + 12);
		// Ночное небо
		ctx.fillStyle = "#0e1219";
		ctx.fillRect(x, y, w, h);
		// Звёзды
		ctx.fillStyle = "#8a92a8";
		ctx.fillRect(x + 12, y + 12, 2, 2);
		ctx.fillRect(x + 34, y + 26, 2, 2);
		ctx.fillRect(x + 60, y + 8, 2, 2);
		ctx.fillRect(x + 88, y + 34, 2, 2);
		// Луна-серп
		ctx.fillStyle = "#d8d8c8";
		ctx.fillRect(x + 74, y + 14, 14, 14);
		ctx.fillStyle = "#0e1219";
		ctx.fillRect(x + 70, y + 10, 12, 12);
		// Силуэты домов (внутри рамы, не налезают на низ)
		ctx.fillStyle = "#161a23";
		ctx.fillRect(x + 4, y + 78, 26, 50);
		ctx.fillRect(x + 36, y + 62, 22, 66);
		ctx.fillRect(x + 64, y + 88, 34, 40);
		// Горящие окна домов
		ctx.fillStyle = "#d8b860";
		ctx.fillRect(x + 10, y + 86, 4, 4);
		ctx.fillRect(x + 20, y + 100, 4, 4);
		ctx.fillRect(x + 42, y + 70, 4, 4);
		ctx.fillRect(x + 50, y + 92, 4, 4);
		ctx.fillRect(x + 72, y + 96, 4, 4);
		ctx.fillRect(x + 84, y + 104, 4, 4);
		// Перемычка рамы
		ctx.fillStyle = "#3f4552";
		ctx.fillRect(x + w / 2 - 2, y, 4, h);
		ctx.fillRect(x, y + h / 2 - 2, w, 4);
		// Подоконник
		ctx.fillStyle = "#4a505c";
		ctx.fillRect(x - 10, y + h + 6, w + 20, 8);
	},

	// Потолочные лампы с тёплым светом
	drawLamps(ctx) {
		for (const lx of [70, 250]) {
			// Корпус
			ctx.fillStyle = "#3a3f4a";
			ctx.fillRect(lx - 22, 8, 44, 10);
			// Светящаяся панель
			ctx.fillStyle = "#f0e0b0";
			ctx.fillRect(lx - 18, 18, 36, 6);
			// Мягкий ореол
			ctx.fillStyle = "rgba(240, 224, 176, 0.08)";
			ctx.fillRect(lx - 30, 24, 60, 90);
		}
	},

	// Флипчарт (справа) с листами-«графиками», смена по номеру цикла босса
	drawFlipchart(ctx) {
		// Ножки-тренога
		ctx.fillStyle = "#3a3f4a";
		ctx.fillRect(286, 400, 8, 84);
		ctx.fillRect(262, 400, 8, 76);
		ctx.fillRect(310, 400, 8, 76);
		// Полка-держатель
		ctx.fillStyle = "#4a505c";
		ctx.fillRect(252, 396, 76, 8);
		// Маркеры на полке
		ctx.fillStyle = "#c05050";
		ctx.fillRect(258, 392, 10, 4);
		ctx.fillStyle = "#4a7a9a";
		ctx.fillRect(272, 392, 10, 4);
		// Телеграф: маркер в руке босса — сигнал скорого поворота
		if (this.bossTelegraph) {
			ctx.fillStyle = "#d04040";
			ctx.fillRect(246, 388, 8, 8);
		}
		// Доска
		ctx.fillStyle = "#3f4552";
		ctx.fillRect(248, 296, 84, 104);
		ctx.fillStyle = "#e8e8e4";
		ctx.fillRect(252, 300, 76, 96);
		// Лист с графиком
		this.drawChart(ctx, 256, 304, 68, 88, Boss.cycleCount % 4);
	},

	// Стол (слева, перед Вовой) с бумагами и кофе
	drawTable(ctx) {
		// Столешница
		ctx.fillStyle = "#7a5433";
		ctx.fillRect(12, 420, 192, 16);
		// Блик
		ctx.fillStyle = "#96683c";
		ctx.fillRect(12, 420, 192, 4);
		// Торец
		ctx.fillStyle = "#55381f";
		ctx.fillRect(12, 432, 192, 4);
		// Ножки
		ctx.fillStyle = "#4a3420";
		ctx.fillRect(24, 436, 12, 60);
		ctx.fillRect(180, 436, 12, 60);
		// Бумаги
		ctx.fillStyle = "#d8d4c8";
		ctx.fillRect(36, 412, 28, 8);
		ctx.fillRect(40, 408, 28, 6);
		// Кружка кофе
		ctx.fillStyle = "#d8d8d8";
		ctx.fillRect(158, 404, 16, 16);
		ctx.fillStyle = "#3a2a1a";
		ctx.fillRect(160, 406, 12, 4);
		ctx.fillStyle = "#d8d8d8";
		ctx.fillRect(174, 408, 4, 8);
		// Пар над кружкой
		ctx.fillStyle = "rgba(220, 220, 220, 0.25)";
		ctx.fillRect(164, 396, 3, 6);
		ctx.fillRect(170, 392, 3, 8);
	},

	// Растение в углу справа
	drawPlant(ctx) {
		// Горшок
		ctx.fillStyle = "#6b4a2f";
		ctx.fillRect(334, 440, 22, 28);
		ctx.fillStyle = "#55381f";
		ctx.fillRect(334, 440, 22, 6);
		// Листья
		ctx.fillStyle = "#3f6b3f";
		ctx.fillRect(338, 414, 6, 28);
		ctx.fillRect(346, 408, 6, 34);
		ctx.fillRect(330, 422, 6, 20);
		ctx.fillStyle = "#4f7f4a";
		ctx.fillRect(342, 418, 4, 24);
	},

	// Вова: сидит за столом, вид сбоку, лицом вправо. Пиксель-арт кодом,
	// палитра от референса vova.png (светло-русые волосы, чёрный худи)
	// Позы: слушает / листает / пойман. Анимация — по animTime
	drawVova(ctx) {
		const u = 2; // размер «пикселя»
		const P = {
			hair: "#b98d5a",
			hairDark: "#8a6238",
			skin: "#e8b48c",
			skinDark: "#c98f68",
			hoodie: "#23262e",
			hoodieLight: "#2e323c",
			jeans: "#3a3f4a",
			phone: "#14161a",
			screen: "#4a7a9a",
			eye: "#26262a",
		};

		// Анимация: кивок при слушании, палец при листании
		const frame = Math.floor(this.animTime * 2) % 2;
		const nod = this.vovaPhoneUp ? 0 : frame; // кивок 0/1 пикселя вниз
		const caught = this.vovaCaught;

		const bx = 56, by = 326; // базовая точка (верх головы)

		// --- Торс: худи ---
		ctx.fillStyle = P.hoodie;
		ctx.fillRect(bx + 2, by + 34, 40, 60); // корпус до стола (y=420)
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
		ctx.fillRect(bx + 34, by + 40, 2, 52);

		// --- Голова (профиль вправо) ---
		const hy = by + nod;
		// Волосы: верх зигзагом + затылок слева
		ctx.fillStyle = P.hair;
		ctx.fillRect(bx + 8, hy + 4, 26, 10);
		ctx.fillRect(bx + 6, hy + 8, 6, 16); // затылок
		// Зигзаг сверху
		ctx.fillRect(bx + 10, hy + 2, 6, 2);
		ctx.fillRect(bx + 18, hy, 8, 4);
		ctx.fillRect(bx + 28, hy + 2, 6, 2);
		// Тёмные пряди
		ctx.fillStyle = P.hairDark;
		ctx.fillRect(bx + 14, hy + 4, 4, 8);
		ctx.fillRect(bx + 24, hy + 6, 4, 6);
		// Лицо
		ctx.fillStyle = P.skin;
		ctx.fillRect(bx + 12, hy + 14, 22, 14);
		// Челюсть/подбородок
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
			// Бровь
			ctx.fillStyle = P.hairDark;
			ctx.fillRect(bx + 24, hy + 14, 8, 2);
		}
		// Рот: ухмылка при листании, прямая при слушании, «о» при поимке
		ctx.fillStyle = "#b06a5a";
		if (caught) {
			ctx.fillRect(bx + 26, hy + 26, 4, 4);
		} else if (this.vovaPhoneUp) {
			ctx.fillRect(bx + 26, hy + 26, 8, 2);
			ctx.fillRect(bx + 32, hy + 24, 2, 2); // уголок вверх
		} else {
			ctx.fillRect(bx + 26, hy + 26, 6, 2);
		}

		// --- Руки и телефон ---
		if (caught) {
			// Пойман: телефон замирает наверху, руки вскинуты
			ctx.fillStyle = P.hoodie;
			ctx.fillRect(bx + 40, by + 30, 8, 16); // рука вверх
			ctx.fillStyle = P.skin;
			ctx.fillRect(bx + 40, by + 26, 8, 6); // кисть
			ctx.fillStyle = P.phone;
			ctx.fillRect(bx + 38, by + 8, 12, 20);
			ctx.fillStyle = P.screen;
			ctx.fillRect(bx + 40, by + 10, 8, 14);
		} else if (this.vovaPhoneUp) {
			// Листает: локоть на столе, телефон над коленями, большой палец двигается
			ctx.fillStyle = P.hoodie;
			ctx.fillRect(bx + 40, by + 52, 10, 30); // рука
			ctx.fillRect(bx + 44, by + 74, 14, 8); // предплечье к телефону
			ctx.fillStyle = P.skin;
			ctx.fillRect(bx + 56, by + 72, 6, 8); // кисть
			// Телефон
			ctx.fillStyle = P.phone;
			ctx.fillRect(bx + 58, by + 56, 14, 22);
			ctx.fillStyle = P.screen;
			ctx.fillRect(bx + 60, by + 58, 10, 16);
			// Большой палец листает (2 кадра)
			ctx.fillStyle = P.skin;
			ctx.fillRect(bx + 60 + frame * 4, by + 70, 4, 4);
		} else {
			// Слушает: руки на столе
			ctx.fillStyle = P.hoodie;
			ctx.fillRect(bx + 40, by + 56, 10, 36); // рука вниз
			ctx.fillStyle = P.skin;
			ctx.fillRect(bx + 40, by + 90, 10, 6); // кисть на столе
		}
	},

	// Пиксельный «график» на листе флипчарта — 4 варианта по номеру листа
	drawChart(ctx, x, y, w, h, variant) {
		ctx.fillStyle = "#ffffff";
		ctx.fillRect(x, y, w, h);
		ctx.fillStyle = "#3a6a9a";
		const bars = 5;
		const bw = Math.floor(w / bars) - 2;
		for (let i = 0; i < bars; i++) {
			// разные «данные» на каждом листе
			const t = (variant * 7 + i * 3) % 10;
			const bh = Math.max(4, Math.floor(h * (0.2 + t * 0.07)));
			ctx.fillRect(x + 2 + i * (bw + 2), y + h - bh - 2, bw, bh);
		}
		// «линия тренда»
		ctx.fillStyle = "#c05050";
		ctx.fillRect(x + 2, y + 6 + variant * 4, w - 4, 3);
	},
};
