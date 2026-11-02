// Точка входа: игровой цикл с delta time (скорость не зависит от FPS)
(function () {
	const Game = {
		time: 0,          // игровое время в секундах (для таймеров автомата и Вовы)
		roundTime: 0,     // сколько секунд идёт забег
		phoneUpTime: 0,   // сколько секунд телефон был наверху («свои дела»)
		over: false,
		paused: false,
	};

	Input.init();
	UI.init();
	Scene.init(document.getElementById("scene"));
	Boss.reset();
	Vova.reset();

	let lastTime = performance.now();

	function tick(now) {
		// delta в секундах, с защитой от скачков (вкладка спала)
		const dt = Math.min((now - lastTime) / 1000, 0.1);
		lastTime = now;

		update(dt);
		Scene.draw();

		requestAnimationFrame(tick);
	}

	function update(dt) {
		if (Game.over) return; // после финала сцена замирает
		if (Game.paused) return; // пауза: таймеры замирают

		Game.time += dt;
		Game.roundTime += dt;
		if (Vova.phoneUp) Game.phoneUpTime += dt;

		// Телефон: удержание = наверху, отпускание = под столом
		Vova.update(dt, Game.time);
		Scene.vovaPhoneUp = Vova.phoneUp;
		Scene.vovaStunned = Vova.stunLeft > 0;

		// Автомат босса
		Boss.update(dt, Game.roundTime);
		Scene.bossState = Boss.state;
		Scene.bossTelegraph = Boss.isTelegraphing();

		// Поимка: только когда босс смотрит на аудиторию
		if (Boss.state === "WATCHING" && Vova.checkCaught(Boss.stateTime, Game.time)) {
			caught();
		}

		// HUD
		const percent = Math.round(Game.phoneUpTime / CONFIG.scoring.roundSec * 100);
		UI.updateHUD(Game.roundTime, percent);

		// Победа: таймер забега дошёл до конца
		if (Game.roundTime >= CONFIG.round.durationSec) {
			win(percent);
		}
	}

	function caught() {
		Vova.warnings++;
		Vova.stunLeft = CONFIG.phone.stunSec;
		Vova.phoneUp = false;
		UI.showWarning(Vova.warnings);
		// Вибрация только на Android, на iOS API нет — тихо пропускаем
		if (navigator.vibrate) navigator.vibrate(80);

		if (Vova.warnings >= CONFIG.warnings.max) {
			Game.over = true;
			UI.showFailStub();
		}
	}

	function win(percent) {
		Game.over = true;
		UI.showWinStub(percent);
	}

	// Автоматическая пауза: ушёл с вкладки / свернул окно (ТЗ §6.5)
	function pause() {
		if (Game.over || Game.paused) return;
		Game.paused = true;
		Input.reset(); // касание возврата не должно поднимать телефон
		UI.showPause();
	}

	function resume() {
		Game.paused = false;
		UI.hidePause();
	}

	document.addEventListener("visibilitychange", () => {
		if (document.hidden) pause();
	});
	window.addEventListener("blur", pause);
	// Возврат по касанию (слушаем на оверлее паузы через pointerdown на window)
	window.addEventListener("pointerdown", () => {
		if (Game.paused) resume();
	});

	requestAnimationFrame(tick);
})();
