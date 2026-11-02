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

		// Фон вне сцены и стена переговорной
		ctx.fillStyle = "#101018";
		ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
		ctx.save();
		ctx.translate(offX, offY);
		ctx.scale(scale, scale);

		// Стена
		ctx.fillStyle = "#2a2a3e";
		ctx.fillRect(0, 0, this.W, this.H);
		// Окно
		ctx.fillStyle = "#3a4a6a";
		ctx.fillRect(230, 60, 100, 120);
		// Пол
		ctx.fillStyle = "#3e3e52";
		ctx.fillRect(0, 480, this.W, this.H - 480);

		// Флипчарт (справа) с листами-«графиками», смена по номеру цикла босса
		ctx.fillStyle = "#d8d8d8";
		ctx.fillRect(250, 300, 80, 100);
		this.drawChart(ctx, 258, 308, 64, 84, Boss.cycleCount % 4);
		ctx.fillStyle = "#555";
		ctx.fillRect(288, 400, 6, 80);
		// Телеграф: маркер на полке флипчарта — сигнал скорого поворота
		if (this.bossTelegraph) {
			ctx.fillStyle = "#d04040";
			ctx.fillRect(246, 396, 10, 6);
		}

		// Стол (слева, перед Вовой)
		ctx.fillStyle = "#7a5a3a";
		ctx.fillRect(20, 420, 180, 16);
		ctx.fillStyle = "#5a4028";
		ctx.fillRect(30, 436, 10, 60);
		ctx.fillRect(180, 436, 10, 60);

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
