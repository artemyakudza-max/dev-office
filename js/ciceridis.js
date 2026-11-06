// Мини-игра «Цицеридис»: Чекеридис на стуле с бокалом.
// Этап 4 — залезание на стул (1,5 с).
// Этап 5 — первый тост: текст 5 с + очень медленное качание ±10°
const Ciceridis = {
	phase: "climb",    // climb | toast
	climbT: 0,         // сколько секунд идёт залезание
	toastT: 0,         // сколько секунд идёт тост
	toastStartFired: false, // плашку с тостом показал? (ставит main.js)

	reset() {
		this.phase = "climb";
		this.climbT = 0;
		this.toastT = 0;
		this.toastStartFired = false;
	},

	// Прогресс залезания 0..1 — для отрисовки (Scene читает)
	climbProgress() {
		return Math.min(1, this.climbT / CONFIG.ciceridis.climbSec);
	},

	// Угол качания в градусах для отрисовки: плавная синусоида ±амплитуда
	swayAngle() {
		if (this.phase !== "toast") return 0;
		const c = CONFIG.ciceridis;
		return Math.sin(this.toastT / c.swayPeriodSec * Math.PI * 2) * c.swayAmpDeg;
	},

	update(dt) {
		if (this.phase === "climb") {
			this.climbT += dt;
			if (this.climbT >= CONFIG.ciceridis.climbSec) {
				this.phase = "toast";
				this.toastT = 0;
			}
		} else if (this.phase === "toast") {
			this.toastT += dt;
		}
	},
};
