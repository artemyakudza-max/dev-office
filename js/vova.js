// Состояние Вовы: телефон, оглушение после поимки (ТЗ §3.1, §6.4)
const Vova = {
	phoneUp: false,      // телефон логически наверху (с момента pointerdown, не анимации)
	phoneUpStart: 0,     // игровое время подъёма телефона
	stunLeft: 0,         // сколько секунд оглушения осталось
	warnings: 0,         // замечания

	reset() {
		this.phoneUp = false;
		this.phoneUpStart = 0;
		this.stunLeft = 0;
		this.warnings = 0;
	},

	// gameTime — общее игровое время в секундах (ведёт main.js)
	update(dt, gameTime) {
		if (this.stunLeft > 0) {
			// Оглушение: ввод игнорируется, телефон внизу
			this.stunLeft -= dt;
			this.phoneUp = false;
			if (this.stunLeft <= 0 && Input.pressed) {
				// Палец всё ещё зажат — телефон «догоняет» состояние пальца
				this.phoneUp = true;
				this.phoneUpStart = gameTime;
			}
			return;
		}

		const wantUp = Input.pressed;
		if (wantUp && !this.phoneUp) {
			this.phoneUp = true;
			this.phoneUpStart = gameTime;
		} else if (!wantUp) {
			this.phoneUp = false;
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
