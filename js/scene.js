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

		// Видимая область в логических координатах — чтобы фон
		// заполнял весь экран и в портрете, и в ландшафте
		const x0 = -offX / scale;
		const x1 = (this.canvas.width - offX) / scale;
		const y0 = -offY / scale;
		const y1 = (this.canvas.height - offY) / scale;

		this.drawRoom(ctx, x0, x1, y0, y1);
		this.drawPoster(ctx);
		this.drawWindow(ctx);
		this.drawLamps(ctx);
		this.drawFlipchart(ctx);
		this.drawChair(ctx);
		this.drawVova(ctx);
		this.drawTable(ctx);
		this.drawPlant(ctx);

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

	// Флипчарт (справа) с листами-«графиками», смена по номеру цикла босса
	drawFlipchart(ctx) {
		ctx.fillStyle = "#3a3f4a";
		ctx.fillRect(286, 400, 8, 84);
		ctx.fillRect(262, 400, 8, 76);
		ctx.fillRect(310, 400, 8, 76);
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
		ctx.fillStyle = "#3f4552";
		ctx.fillRect(248, 296, 84, 104);
		ctx.fillStyle = "#e8e8e4";
		ctx.fillRect(252, 300, 76, 96);
		this.drawChart(ctx, 256, 304, 68, 88, Boss.cycleCount % 4);
	},

	// Офисное кресло Вовы
	drawChair(ctx) {
		// Спинка
		ctx.fillStyle = "#262a33";
		ctx.fillRect(42, 344, 16, 74);
		ctx.fillStyle = "#2f5fd0"; // синий акцент бренда
		ctx.fillRect(42, 344, 16, 6);
		// Сиденье
		ctx.fillStyle = "#262a33";
		ctx.fillRect(42, 412, 60, 12);
		// Колесо-стойка
		ctx.fillStyle = "#3a3f4a";
		ctx.fillRect(66, 424, 8, 44);
		// Крестовина
		ctx.fillRect(48, 468, 44, 6);
		// Колёсики
		ctx.fillRect(48, 474, 8, 6);
		ctx.fillRect(84, 474, 8, 6);
	},

	// Вова: сидит за столом, вид сбоку, лицом вправо. Пиксель-арт кодом,
	// палитра от референса vova.png (светло-русые волосы, чёрный худи)
	drawVova(ctx) {
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

		// --- Ноги: бёдра под столом, голени видны ниже столешницы ---
		ctx.fillStyle = P.jeans;
		ctx.fillRect(bx + 10, by + 78, 44, 16); // бедро к столу
		ctx.fillStyle = P.jeansDark;
		ctx.fillRect(bx + 34, by + 94, 12, 72); // голень дальняя
		ctx.fillStyle = P.jeans;
		ctx.fillRect(bx + 46, by + 92, 12, 74); // голень ближняя
		// Кроссовки
		ctx.fillStyle = P.shoe;
		ctx.fillRect(bx + 32, by + 164, 16, 8);
		ctx.fillRect(bx + 44, by + 164, 16, 8);
		ctx.fillStyle = "#b8b8b8";
		ctx.fillRect(bx + 32, by + 170, 16, 3);
		ctx.fillRect(bx + 44, by + 170, 16, 3);

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
			ctx.fillStyle = P.hoodie;
			ctx.fillRect(bx + 40, by + 30, 8, 16);
			ctx.fillStyle = P.skin;
			ctx.fillRect(bx + 40, by + 26, 8, 6);
			ctx.fillStyle = P.phone;
			ctx.fillRect(bx + 38, by + 8, 12, 20);
			ctx.fillStyle = P.screen;
			ctx.fillRect(bx + 40, by + 10, 8, 14);
		} else if (this.vovaPhoneUp) {
			ctx.fillStyle = P.hoodie;
			ctx.fillRect(bx + 40, by + 52, 10, 30);
			ctx.fillRect(bx + 44, by + 74, 14, 8);
			ctx.fillStyle = P.skin;
			ctx.fillRect(bx + 56, by + 72, 6, 8);
			ctx.fillStyle = P.phone;
			ctx.fillRect(bx + 58, by + 56, 14, 22);
			ctx.fillStyle = P.screen;
			ctx.fillRect(bx + 60, by + 58, 10, 16);
			ctx.fillStyle = P.skin;
			ctx.fillRect(bx + 60 + frame * 4, by + 70, 4, 4);
		} else {
			ctx.fillStyle = P.hoodie;
			ctx.fillRect(bx + 40, by + 56, 10, 36);
			ctx.fillStyle = P.skin;
			ctx.fillRect(bx + 40, by + 90, 10, 6);
		}
	},

	// Стол (слева, перед Вовой) с бумагами и кофе.
	// Рисуется ПОСЛЕ Вовы, чтобы столешница перекрывала бёдра
	drawTable(ctx) {
		ctx.fillStyle = "#7a5433";
		ctx.fillRect(12, 420, 192, 16);
		ctx.fillStyle = "#96683c";
		ctx.fillRect(12, 420, 192, 4);
		ctx.fillStyle = "#55381f";
		ctx.fillRect(12, 432, 192, 4);
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
		// Пар
		ctx.fillStyle = "rgba(220, 220, 220, 0.25)";
		ctx.fillRect(164, 396, 3, 6);
		ctx.fillRect(170, 392, 3, 8);
	},

	// Растение в углу справа (в agile-офисах ВТБ много зелени)
	drawPlant(ctx) {
		ctx.fillStyle = "#6b4a2f";
		ctx.fillRect(334, 440, 22, 28);
		ctx.fillStyle = "#55381f";
		ctx.fillRect(334, 440, 22, 6);
		ctx.fillStyle = "#3f6b3f";
		ctx.fillRect(338, 414, 6, 28);
		ctx.fillRect(346, 408, 6, 34);
		ctx.fillRect(330, 422, 6, 20);
		ctx.fillStyle = "#4f7f4a";
		ctx.fillRect(342, 418, 4, 24);
	},

	// Пиксельный «график» на листе флипчарта — 4 варианта по номеру листа
	drawChart(ctx, x, y, w, h, variant) {
		ctx.fillStyle = "#ffffff";
		ctx.fillRect(x, y, w, h);
		ctx.fillStyle = "#2f5fd0"; // синий бренда вместо прежнего голубого
		const bars = 5;
		const bw = Math.floor(w / bars) - 2;
		for (let i = 0; i < bars; i++) {
			const t = (variant * 7 + i * 3) % 10;
			const bh = Math.max(4, Math.floor(h * (0.2 + t * 0.07)));
			ctx.fillRect(x + 2 + i * (bw + 2), y + h - bh - 2, bw, bh);
		}
		ctx.fillStyle = "#c05050";
		ctx.fillRect(x + 2, y + 6 + variant * 4, w - 4, 3);
	},
};
