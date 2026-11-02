// Конечный автомат босса (ТЗ §4): фазы сложности, фальстарты, телеграф
const Boss = {
	// Состояния: AT_FLIPCHART (безопасно) → TURNING → WATCHING (опасно)
	// или AT_FLIPCHART → TURNING → FAKEOUT (безопасно, с 20-й секунды)
	state: "AT_FLIPCHART",
	stateTime: 0,        // сколько секунд босс в текущем состоянии
	stateDuration: 0,    // сколько секунд длится текущее состояние
	cycleCount: 0,       // номер цикла (0 = первый, фиксированный для обучения)
	lastWasFakeout: false, // два фальстарта подряд запрещены (ТЗ §4.2)

	reset() {
		this.state = "AT_FLIPCHART";
		this.stateTime = 0;
		this.stateDuration = CONFIG.boss.firstCycle.flipchartSec;
		this.cycleCount = 0;
		this.lastWasFakeout = false;
	},

	// Случайное число в диапазоне [a, b]
	rand(a, b) {
		return a + Math.random() * (b - a);
	},

	// Фаза забега по времени: 0 (0–20 с), 1 (20–40 с), 2 (40–60 с)
	phase(roundTime) {
		const [b1, b2] = CONFIG.boss.phaseBoundsSec;
		if (roundTime < b1) return 0;
		if (roundTime < b2) return 1;
		return 2;
	},

	// Длительность «у флипчарта» по фазе забега
	flipchartDuration(roundTime) {
		const ranges = CONFIG.boss.flipchartSec;
		return this.rand(...ranges[this.phase(roundTime)]);
	},

	// Телеграф: последние 0,5 с у флипчарта босс ставит маркер на полку (ТЗ §4.3)
	isTelegraphing() {
		return this.state === "AT_FLIPCHART"
			&& (this.stateDuration - this.stateTime) <= CONFIG.boss.telegraphSec;
	},

	update(dt, roundTime) {
		this.stateTime += dt;
		if (this.stateTime < this.stateDuration) return;

		switch (this.state) {
			case "AT_FLIPCHART":
				this.state = "TURNING";
				this.stateDuration = this.cycleCount === 0
					? CONFIG.boss.firstTurningSec
					: CONFIG.boss.turningSec;
				break;

			case "TURNING": {
				// Фальстарт: с 20-й секунды, шанс 20%, не два подряд
				const canFakeout = roundTime >= CONFIG.boss.fakeoutFromSec
					&& !this.lastWasFakeout
					&& Math.random() < CONFIG.boss.fakeoutChance;
				if (canFakeout) {
					this.state = "FAKEOUT";
					this.stateDuration = this.rand(...CONFIG.boss.fakeoutSec);
				} else {
					this.state = "WATCHING";
					this.stateDuration = this.rand(...CONFIG.boss.watchingSec);
				}
				break;
			}

			case "FAKEOUT":
				this.state = "AT_FLIPCHART";
				this.stateDuration = this.flipchartDuration(roundTime);
				this.cycleCount++;
				this.lastWasFakeout = true;
				break;

			case "WATCHING":
				this.state = "AT_FLIPCHART";
				this.stateDuration = this.flipchartDuration(roundTime);
				this.cycleCount++;
				this.lastWasFakeout = false;
				break;
		}
		this.stateTime = 0;
	},
};
