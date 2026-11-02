// Точка входа: игровой цикл с delta time (скорость не зависит от FPS)
(function () {
	Input.init();
	Scene.init(document.getElementById("scene"));

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
		// Шаг 1: удержание = телефон наверху, отпускание = под столом
		Scene.vovaPhoneUp = Input.pressed;
	}

	requestAnimationFrame(tick);
})();
