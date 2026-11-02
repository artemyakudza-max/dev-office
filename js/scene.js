// Отрисовка сцены-заглушки: фон, стол, флипчарт, босс и Вова прямоугольниками
// Логические координаты 360×640 (портрет), масштабируются под вьюпорт (ТЗ §5.4)
const Scene = {
	W: 360,
	H: 640,
	canvas: null,
	ctx: null,

	// Состояния для отрисовки (меняет main.js)
	vovaPhoneUp: false,
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
		this.drawWindow(ctx);
		this.drawFlipchart(ctx);
		this.drawTable(ctx);

		// Вова — заглушка (сидит за столом, вид сбоку). Листает — ярче, слушает — тусклее
		ctx.fillStyle = this.vovaPhoneUp ? "#4a8a4a" : "#3a6a3a";
		ctx.fillRect(60, 360, 40, 64); // тело
		ctx.fillStyle = "#e0b090";
		ctx.fillRect(66, 330, 28, 30); // голова

		// Телефон: над столом при удержании, под столом при отпускании
		if (this.vovaPhoneUp) {
			ctx.fillStyle = "#222";
			ctx.fillRect(100, 400, 12, 20);
		}

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

	// Комната: стена, плинтус, пол — палитра тёмного референса
	drawRoom(ctx) {
		// Стена
		ctx.fillStyle = "#262b33";
		ctx.fillRect(0, 0, this.W, 480);
		// Панельные швы на стене
		ctx.fillStyle = "#21252d";
		for (let x = 0; x < this.W; x += 60) {
			ctx.fillRect(x, 0, 4, 480);
		}
		// Тёмная полоса сверху (потолок в тени)
		ctx.fillStyle = "#1c2028";
		ctx.fillRect(0, 0, this.W, 24);
		// Плинтус
		ctx.fillStyle = "#3a3f4a";
		ctx.fillRect(0, 468, this.W, 12);
		// Пол — ковролин
		ctx.fillStyle = "#1e222b";
		ctx.fillRect(0, 480, this.W, this.H - 480);
		// Швы плиток пола
		ctx.fillStyle = "#181b22";
		for (let y = 480; y < this.H; y += 32) {
			ctx.fillRect(0, y, this.W, 4);
		}
	},

	// Окно с ночным городом (в духе тёмного референса)
	drawWindow(ctx) {
		const x = 216, y = 64, w = 112, h = 136;
		// Рама
		ctx.fillStyle = "#3a3f4a";
		ctx.fillRect(x - 8, y - 8, w + 16, h + 16);
		// Ночное небо
		ctx.fillStyle = "#10141d";
		ctx.fillRect(x, y, w, h);
		// Луна
		ctx.fillStyle = "#d8d8c8";
		ctx.fillRect(x + 76, y + 16, 16, 16);
		ctx.fillStyle = "#10141d";
		ctx.fillRect(x + 72, y + 12, 10, 10); // серп
		// Силуэты домов
		ctx.fillStyle = "#171b24";
		ctx.fillRect(x + 4, y + 72, 28, 64);
		ctx.fillRect(x + 40, y + 56, 24, 80);
		ctx.fillRect(x + 72, y + 84, 32, 56);
		// Горящие окна
		ctx.fillStyle = "#d8b860";
		ctx.fillRect(x + 10, y + 80, 4, 4);
		ctx.fillRect(x + 22, y + 96, 4, 4);
		ctx.fillRect(x + 46, y + 64, 4, 4);
		ctx.fillRect(x + 54, y + 88, 4, 4);
		ctx.fillRect(x + 80, y + 96, 4, 4);
		// Перемычка рамы
		ctx.fillStyle = "#3a3f4a";
		ctx.fillRect(x + w / 2 - 2, y, 4, h);
		ctx.fillRect(x, y + h / 2 - 2, w, 4);
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
		// Телеграф: маркер на полке — сигнал скорого поворота
		if (this.bossTelegraph) {
			ctx.fillStyle = "#d04040";
			ctx.fillRect(256, 390, 12, 6);
		}
		// Доска
		ctx.fillStyle = "#4a505c";
		ctx.fillRect(248, 296, 84, 104);
		ctx.fillStyle = "#e4e4e0";
		ctx.fillRect(252, 300, 76, 96);
		// Лист с графиком
		this.drawChart(ctx, 256, 304, 68, 88, Boss.cycleCount % 4);
	},

	// Стол (слева, перед Вовой) с кружкой кофе
	drawTable(ctx) {
		// Столешница
		ctx.fillStyle = "#6b4a2f";
		ctx.fillRect(16, 420, 188, 16);
		// Блик на столешнице
		ctx.fillStyle = "#8a6238";
		ctx.fillRect(16, 420, 188, 4);
		// Торец
		ctx.fillStyle = "#4a3420";
		ctx.fillRect(16, 432, 188, 4);
		// Ножки
		ctx.fillStyle = "#4a3420";
		ctx.fillRect(28, 436, 12, 60);
		ctx.fillRect(180, 436, 12, 60);
		// Кружка кофе
		ctx.fillStyle = "#d8d8d8";
		ctx.fillRect(160, 404, 16, 16);
		ctx.fillStyle = "#3a2a1a";
		ctx.fillRect(162, 406, 12, 4);
		// Ручка кружки
		ctx.fillStyle = "#d8d8d8";
		ctx.fillRect(176, 408, 4, 8);
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
