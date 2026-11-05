// Мини-игра «Цицеридис»: Чекеридис на стуле с бокалом.
// Этап 4 — залезание на стул (1,5 с). Геймплей добавляется на этапах 5–6
const Ciceridis = {
	phase: "climb", // climb | (дальше — этапы 5–6)
	climbT: 0,      // сколько секунд идёт залезание

	reset() {
		this.phase = "climb";
		this.climbT = 0;
	},

	// Прогресс залезания 0..1 — для отрисовки (Scene читает)
	climbProgress() {
		return Math.min(1, this.climbT / CONFIG.ciceridis.climbSec);
	},

	update(dt) {
		if (this.phase === "climb") {
			this.climbT += dt;
			if (this.climbT >= CONFIG.ciceridis.climbSec) {
				this.phase = "standing"; // дальше — этап 5 (первый тост)
			}
		}
	},
};
