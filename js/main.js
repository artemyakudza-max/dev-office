// Точка входа: игровой цикл с delta time (скорость не зависит от FPS)
(function () {
	const Game = {
		time: 0,   // игровое время в секундах (паузы его замирают — в шаге 4+)
		over: false,
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
		if (Game.over) return; // после провала сцена замирает

		Game.time += dt;

		// Телефон: удержание = наверху, отпускание = под столом
		Vova.update(dt, Game.time);
		Scene.vovaPhoneUp = Vova.phoneUp;
		Scene.vovaStunned = Vova.stunLeft > 0;

		// Автомат босса
		Boss.update(dt);
		Scene.bossState = Boss.state;

		// Поимка: только когда босс смотрит на аудиторию
		if (Boss.state === "WATCHING" && Vova.checkCaught(Boss.stateTime, Game.time)) {
			caught();
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

	requestAnimationFrame(tick);
})();
