когда // Ввод: удержание в любой точке экрана = телефон наверху (ТЗ §6.1)
// Этап 6 «Цицеридис»: тап/зажатие половин экрана толкает Чекеридиса (ТЗ §3.2)
const Input = {
	pressed: false,      // палец/мышь зажаты сейчас (первый палец — для Вовы)
	pointerId: null,     // первый палец управляет, остальные игнорируются
	leftHeld: false,     // палец зажат на левой половине экрана
	rightHeld: false,    // палец зажат на правой половине экрана
	tapLeft: false,      // одиночный тап по левой половине (потребляет Ciceridis)
	tapRight: false,     // одиночный тап по правой половине
	_halfPointers: {},   // pointerId -> "left" | "right" (все пальцы на canvas)

	init() {
		window.addEventListener("pointerdown", (e) => {
			if (e.button !== 0) return; // только левая кнопка мыши / тап
			// Касания UI-элементов (кнопки, оверлеи) не управляют игрой —
			// только касания игрового поля (canvas)
			if (e.target.tagName !== "CANVAS") return;
			const side = e.clientX < window.innerWidth / 2 ? "left" : "right";
			if (this.pointerId !== null) {
				// Второй и дальше пальцы: для Вовы игнор, для половин — учитываются
				this._halfPointers[e.pointerId] = side;
				this._refreshHalves();
				return;
			}
			this.pointerId = e.pointerId;
			this.pressed = true;
			this._halfPointers[e.pointerId] = side;
			this._refreshHalves();
			// Одиночный тап = мгновенный импульс (потребляет мини-игра в update)
			if (side === "left") this.tapLeft = true; else this.tapRight = true;
		});
		window.addEventListener("pointerup", (e) => {
			if (e.pointerId === this.pointerId) {
				this.pointerId = null;
				this.pressed = false;
			}
			delete this._halfPointers[e.pointerId];
			this._refreshHalves();
		});
		// системный жест (звонок, свайп) = как отпускание
		window.addEventListener("pointercancel", (e) => {
			if (e.pointerId === this.pointerId) {
				this.pointerId = null;
				this.pressed = false;
			}
			delete this._halfPointers[e.pointerId];
			this._refreshHalves();
		});
		// запрет контекстного меню по долгому тапу
		window.addEventListener("contextmenu", (e) => e.preventDefault());
	},

	// Пересчитать, какие половины зажаты сейчас (обе сразу = гасятся в физике)
	_refreshHalves() {
		this.leftHeld = false;
		this.rightHeld = false;
		for (const side of Object.values(this._halfPointers)) {
			if (side === "left") this.leftHeld = true; else this.rightHeld = true;
		}
	},

	// Забыть все касания (выход из паузы, рестарт)
	reset() {
		this.pressed = false;
		this.pointerId = null;
		this.leftHeld = false;
		this.rightHeld = false;
		this.tapLeft = false;
		this.tapRight = false;
		this._halfPointers = {};
	},
};
