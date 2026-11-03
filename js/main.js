// Точка входа: игровой цикл с delta time (скорость не зависит от FPS)
(function () {
	const Game = {
		time: 0,          // игровое время в секундах (для таймеров автомата и Вовы)
		roundTime: 0,     // сколько секунд идёт забег
		phoneUpTime: 0,   // сколько секунд телефон был наверху («свои дела»)
		over: false,
		paused: false,
		screen: "select", // select | playing
		frozen: 0,        // заморозка игры (окно гнева босса), в секундах
		memeTimer: 0,     // через сколько секунд показать следующую мем-плашку
		lastMeme: -1,     // индекс последнего мема (не повторять подряд)
		lastBossLine: -1, // индекс последней реплики босса (не повторять подряд)
		tutorialDone: false,
	};

	Input.init();
	UI.init();
	Scene.init(document.getElementById("scene"));
	Boss.reset();
	Vova.reset();
	// Экран выбора персонажа (ТЗ §1.3)
	UI.showSelect(startGame);

	let lastTime = performance.now();

	function tick(now) {
		// delta в секундах, с защитой от скачков (вкладка спала)
		const dt = Math.min((now - lastTime) / 1000, 0.1);
		lastTime = now;

		update(dt);
		if (Game.screen === "select") {
			Scene.clearToBackground(); // экран выбора: просто тёмный фон
		} else {
			Scene.draw();
		}

		requestAnimationFrame(tick);
	}

	function update(dt) {
		if (Game.screen !== "playing") return; // экран выбора: сцена живёт фоном
		if (Game.over) return; // после финала сцена замирает
		if (Game.paused) return; // пауза: таймеры замирают
		if (Game.frozen > 0) {
			// Окно гнева босса: игра стоит — штраф «-2,5 сек игрового времени»
			Game.frozen -= dt;
			return;
		}

		Game.time += dt;
		Game.roundTime += dt;
		if (Vova.phoneUp) Game.phoneUpTime += dt;

		// Телефон: удержание = наверху, отпускание = под столом
		Vova.update(dt, Game.time);
		Scene.vovaPhoneUp = Vova.phoneUp;
		Scene.vovaCaught = Vova.locked;
		Scene.animTime = Game.time;

		// Автомат босса
		const prevBossState = Boss.state;
		Boss.update(dt, Game.roundTime);
		Scene.bossState = Boss.state;
		Scene.bossTelegraph = Boss.isTelegraphing();

		// Поимка: только когда босс смотрит на аудиторию
		if (Boss.state === "WATCHING" && Vova.checkCaught(Boss.stateTime, Game.time)) {
			caught();
		}

		// Обучение: плашка исчезает только после первого касания (решение автора)
		if (!Game.tutorialDone && Input.pressed) {
			Game.tutorialDone = true;
			UI.hideTutorial();
		}

		// Реплика босса при переходе в «Смотрит», не подряд одна и та же (ТЗ §5.5)
		if (Boss.state === "WATCHING" && prevBossState !== "WATCHING") {
			let i;
			do {
				i = Math.floor(Math.random() * CONFIG.bossLines.length);
			} while (i === Game.lastBossLine);
			Game.lastBossLine = i;
			const hp = Scene.headPoint("boss");
			UI.bubble(CONFIG.bossLines[i], hp.x, hp.y);
		}

		// Разблокировка телефона: босс отвернулся от аудитории
		if (Vova.locked && Boss.state !== "WATCHING") {
			Vova.locked = false;
			Vova.stateTime = CONFIG.phone.minDownSec; // поднимается сразу, если палец зажат
		}

		// Мем-плашки при листании, каждые 2–3 с (ТЗ §5.5)
		if (Vova.phoneUp) {
			Game.memeTimer -= dt;
			if (Game.memeTimer <= 0) {
				Game.memeTimer = 2 + Math.random();
				let i;
				do {
					i = Math.floor(Math.random() * CONFIG.memes.length);
				} while (i === Game.lastMeme);
				Game.lastMeme = i;
				const mp = Scene.headPoint("vova");
				UI.bubble(CONFIG.memes[i], mp.x, mp.y);
			}
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
		Vova.phoneUp = false;
		Vova.stateTime = 0;
		Vova.locked = true; // телефон спрятан, пока босс не отвернётся
		// Вибрация только на Android, на iOS API нет — тихо пропускаем
		if (navigator.vibrate) navigator.vibrate(80);

		if (Vova.warnings >= CONFIG.warnings.max) {
			// Провал: окно гнева, затем финальный экран
			Game.over = true;
			UI.showAngry(Vova.warnings);
			const second = Math.ceil(Game.roundTime);
			setTimeout(() => {
				if (navigator.vibrate) navigator.vibrate(200);
				UI.showFinal("fail", { second }, restart, goMenu);
			}, CONFIG.phone.angrySec * 1000);
		} else {
			// Окно гнева блокирует игру — штраф «-2,5 сек игрового времени»
			UI.showAngry(Vova.warnings);
			Game.frozen = CONFIG.phone.angrySec;
		}
	}

	function win(percent) {
		Game.over = true;
		// Финальный экран через 1 с — игрок видит финальную позу (ТЗ §9.1)
		setTimeout(() => {
			if (navigator.vibrate) navigator.vibrate(200);
			// Пасхалка: победа, ни разу не подняв телефон (ТЗ §3.8)
			const kind = percent === 0 ? "easter" : "win";
			UI.showFinal(kind, { percent, warnings: Vova.warnings }, restart, goMenu);
		}, 1000);
	}

	// Возврат на экран выбора персонажа
	function goMenu() {
		restart();
		UI.hidePauseBtn();
		Game.screen = "select";
		UI.showSelect(startGame);
	}

	// Полный сброс состояния забега (ТЗ §10)
	function restart() {
		Game.time = 0;
		Game.roundTime = 0;
		Game.phoneUpTime = 0;
		Game.over = false;
		Game.paused = false;
		Game.frozen = 0;
		Game.memeTimer = 0;
		Game.lastMeme = -1;
		Game.lastBossLine = -1;
		Game.tutorialDone = true; // обучение показываем только в первом забеге
		Boss.reset();
		Vova.reset();
		Input.reset();
	}

	// Старт забега после выбора персонажа
	function startGame() {
		restart();
		Game.tutorialDone = false; // после restart: обучение показываем заново
		Game.screen = "playing";
		UI.showTutorial();
		UI.showPauseBtn(pauseByButton);
	}

	// Пауза по кнопке: меню с продолжением и выходом в меню
	function pauseByButton() {
		if (Game.over || Game.paused) return;
		Game.paused = true;
		Input.reset();
		UI.showPauseMenu(resume, goMenu);
	}

	// Автоматическая пауза: ушёл с вкладки / свернул окно (ТЗ §6.5).
	// На экране выбора пауза не нужна — там нет экшена
	function pause() {
		if (Game.screen !== "playing" || Game.over || Game.paused) return;
		Game.paused = true;
		Input.reset(); // касание возврата не должно поднимать телефон
		UI.showPause(resume);
	}

	function resume() {
		Game.paused = false;
		Input.reset(); // клик по кнопке паузы не должен поднимать телефон
		UI.hidePause();
		UI.hidePauseMenu();
	}

	document.addEventListener("visibilitychange", () => {
		if (document.hidden) pause();
	});
	window.addEventListener("blur", pause);
	// Возврат по касанию — слушаем на самом оверлее паузы (showPause),
	// а не на window: иначе клики по кнопкам меню паузы снимали паузу

	requestAnimationFrame(tick);
})();
