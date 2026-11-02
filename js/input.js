// Ввод: удержание в любой точке экрана = телефон наверху (ТЗ §6.1)
const Input = {
	pressed: false,      // палец/мышь зажаты сейчас
	pointerId: null,     // первый палец управляет, остальные игнорируются

	init() {
		window.addEventListener("pointerdown", (e) => {
			if (e.button !== 0) return; // только левая кнопка мыши / тап
			if (this.pointerId !== null) return; // мультитач: первый палец главный
			this.pointerId = e.pointerId;
			this.pressed = true;
		});
		window.addEventListener("pointerup", (e) => {
			if (e.pointerId !== this.pointerId) return;
			this.pointerId = null;
			this.pressed = false;
		});
		// системный жест (звонок, свайп) = как отпускание
		window.addEventListener("pointercancel", (e) => {
			if (e.pointerId !== this.pointerId) return;
			this.pointerId = null;
			this.pressed = false;
		});
		// запрет контекстного меню по долгому тапу
		window.addEventListener("contextmenu", (e) => e.preventDefault());
	},

	// Забыть текущее касание (используется при выходе из паузы,
	// чтобы касание возврата не поднимало телефон)
	reset() {
		this.pressed = false;
		this.pointerId = null;
	},
};
