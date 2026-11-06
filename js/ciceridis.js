// Мини-игра «Цицеридис»: Чекеридис на стуле с бокалом.
// Этап 4 — залезание на стул (1,5 с).
// Этап 5 — первый тост: текст 5 с + очень медленное качание ±10°
// Этап 6 — управление: тап/зажатие половин экрана толкает его (ТЗ §3.2)
const Ciceridis = {
	phase: "climb",    // climb | toast | fall
	climbT: 0,         // сколько секунд идёт залезание
	toastT: 0,         // сколько секунд идёт тост
	fallT: 0,          // сколько секунд длится падение (анимация)
	fallDir: 1,        // в какую сторону упал: 1 вправо, -1 влево
	toastStartFired: false, // плашку с тостом показал? (ставит main.js)
	toastNum: 1,       // номер текущего тоста (для карточки поражения)

	// Физика качания (этап 6): угол игрока + самокачание
	playerAngle: 0,    // угол от толчков игрока, градусы (минус = влево)
	angVel: 0,         // угловая скорость, градусы/сек

	reset() {
		this.phase = "climb";
		this.climbT = 0;
		this.toastT = 0;
		this.toastStartFired = false;
		this.toastNum = 1;
		this.playerAngle = 0;
		this.angVel = 0;
		this.fallT = 0;
		this.fallDir = 1;
	},

	// Прогресс залезания 0..1 — для отрисовки (Scene читает)
	climbProgress() {
		return Math.min(1, this.climbT / CONFIG.ciceridis.climbSec);
	},

	// Прогресс падения 0..1 — для анимации в Scene
	fallProgress() {
		return Math.min(1, this.fallT / CONFIG.ciceridis.fallSec);
	},

	// Итоговый угол в градусах для отрисовки: самокачание + толчки игрока
	swayAngle() {
		if (this.phase === "climb") return 0;
		const c = CONFIG.ciceridis;
		const self = Math.sin(this.toastT / c.swayPeriodSec * Math.PI * 2) * c.swayAmpDeg;
		return self + this.playerAngle;
	},

	// Одиночный тап = мгновенный импульс в сторону тапа (ТЗ §3.2).
	// Быстрые потапывания складываются сами: каждый тап добавляет скорость —
	// чем чаще стучишь, тем сильнее суммарный толчок
	applyTap(side) {
		const c = CONFIG.ciceridis;
		this.angVel += side === "left" ? -c.tapImpulseDeg : c.tapImpulseDeg;
	},

	update(dt) {
		if (this.phase === "climb") {
			this.climbT += dt;
			if (this.climbT >= CONFIG.ciceridis.climbSec) {
				this.phase = "toast";
				this.toastT = 0;
			}
			return;
		}
		if (this.phase === "fall") { // падение: крутится анимация, физика стоит
			this.fallT += dt;
			return;
		}

		const c = CONFIG.ciceridis;

		// Тапы: потребляю флаги ввода (их ставит Input при pointerdown)
		if (Input.tapLeft) { this.applyTap("left"); Input.tapLeft = false; }
		if (Input.tapRight) { this.applyTap("right"); Input.tapRight = false; }

		// Зажатие половины = непрерывная сила (меняется ускорение, не скорость).
		// Обе половины сразу — силы взаимно гасятся (ТЗ §3.2)
		let hold = 0;
		if (Input.rightHeld) hold += 1;
		if (Input.leftHeld) hold -= 1;
		this.angVel += hold * c.holdAccelDeg * dt;

		// Гашение: без удержания качание плавно затухает (демпфирование)
		this.angVel *= Math.exp(-c.dampingRate * dt);

		// Интегрирование угла через delta time — скорость не зависит от FPS
		this.playerAngle += this.angVel * dt;

		// Падение: наклон превысил порог — свалился (карточку покажет main.js)
		if (Math.abs(this.playerAngle) >= c.fallAngleDeg) {
			this.phase = "fall";
			this.fallT = 0;
			this.fallDir = this.playerAngle >= 0 ? 1 : -1;
		}

		if (this.phase === "toast") {
			this.toastT += dt;
		}
	},
};
