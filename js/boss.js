// Конечный автомат босса (ТЗ §4). Фальстарты и телеграф — в шаге 5.
const Boss = {
	// Состояния: AT_FLIPCHART (безопасно) → TURNING (предупреждение) → WATCHING (опасно)
	state: "AT_FLIPCHART",
	stateTime: 0,        // сколько секунд босс в текущем состоянии
	stateDuration: 0,    // сколько секунд длится текущее состояние
	cycleCount: 0,       // номер цикла (0 = первый, фиксированный для обучения)

	reset() {
		this.state = "AT_FLIPCHART";
		this.stateTime = 0;
		this.stateDuration = CONFIG.boss.firstCycle.flipchartSec;
		this.cycleCount = 0;
	},

	// Случайное число в диапазоне [a, b]
	rand(a, b) {
		return a + Math.random() * (b - a);
	},

	// Длительность «у флипчарта» по фазе забега (фазы появятся в шаге 5,
	// пока забег всегда в фазе 1)
	flipchartDuration() {
		return this.rand(...CONFIG.boss.flipchartSec[0]);
	},

	update(dt) {
		this.stateTime += dt;
		if (this.stateTime < this.stateDuration) return;

		// Переходы: AT_FLIPCHART → TURNING → WATCHING → AT_FLIPCHART
		switch (this.state) {
			case "AT_FLIPCHART":
				this.state = "TURNING";
				this.stateDuration = this.cycleCount === 0
					? CONFIG.boss.firstTurningSec
					: CONFIG.boss.turningSec;
				break;
			case "TURNING":
				this.state = "WATCHING";
				this.stateDuration = this.rand(...CONFIG.boss.watchingSec);
				break;
			case "WATCHING":
				this.state = "AT_FLIPCHART";
				this.stateDuration = this.flipchartDuration();
				this.cycleCount++;
				break;
		}
		this.stateTime = 0;
	},
};
