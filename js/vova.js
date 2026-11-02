// Состояние Вовы: телефон (ТЗ §3.1)
const Vova = {
	phoneUp: false,      // телефон логически наверху
	phoneUpStart: 0,     // игровое время подъёма телефона
	stateTime: 0,        // сколько секунд телефон в текущем состоянии (вверх/вниз)
	warnings: 0,         // замечания

	reset() {
		this.phoneUp = false;
		this.phoneUpStart = 0;
		// Телефон «внизу» изначально — первый тап срабатывает сразу
		this.stateTime = CONFIG.phone.minDownSec;
		this.warnings = 0;
	},

	// gameTime — общее игровое время в секундах (ведёт main.js)
	update(dt, gameTime) {
		// Минимальное время состояний (защита от спама двумя пальцами):
		// наверху — не меньше minUpSec, внизу — не меньше minDownSec
		this.stateTime += dt;
		if (this.phoneUp) {
			if (!Input.pressed && this.stateTime >= CONFIG.phone.minUpSec) {
				this.phoneUp = false;
				this.stateTime = 0;
			}
		} else {
			if (Input.pressed && this.stateTime >= CONFIG.phone.minDownSec) {
				this.phoneUp = true;
				this.phoneUpStart = gameTime;
				this.stateTime = 0;
			}
		}
	},

	// Проверка поимки каждый кадр в состоянии WATCHING (псевдокод ТЗ §3.1)
	// watchingElapsed — сколько секунд босс уже смотрит
	checkCaught(watchingElapsed, gameTime) {
		if (!this.phoneUp) return false;

		const wasUpBefore = this.phoneUpStart < gameTime - watchingElapsed;
		if (wasUpBefore) {
			// Телефон был наверху до начала «Смотрит»: спасает койот-тайм
			return watchingElapsed > CONFIG.phone.coyoteSec;
		}
		// Поднял во время «Смотрит»: койот-тайм не применяется, только порог
		return (gameTime - this.phoneUpStart) > CONFIG.phone.caughtThresholdSec;
	},
};
