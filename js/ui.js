// UI: DOM-слой поверх canvas — HUD, вспышка замечания, пауза, финальные экраны
const UI = {
	root: null,
	timerBar: null,
	percentLabel: null,

	init() {
		this.root = document.getElementById("ui");

		// HUD: полоска таймера внизу + процент в углу
		const hud = document.createElement("div");
		hud.style.cssText = "position: absolute; inset: 0;";
		hud.innerHTML = `
			<div id="percent" style="position: absolute; top: 10px; left: 10px;
				color: #fff; font-family: system-ui, sans-serif; font-size: 16px;"></div>
			<div id="version" style="position: absolute; top: 10px; right: 10px;
				color: #6a6a80; font-family: system-ui, sans-serif; font-size: 12px;"></div>
			<div id="timerbar-bg" style="position: absolute; bottom: 0; left: 0; right: 0;
				height: 8px; background: rgba(255,255,255,0.15);">
				<div id="timerbar" style="height: 100%; width: 100%; background: #4a8a4a;"></div>
			</div>
		`;
		this.root.appendChild(hud);
		this.percentLabel = hud.querySelector("#percent");
		this.timerBar = hud.querySelector("#timerbar");
		hud.querySelector("#version").textContent = CONFIG.version;
	},

	// Обновление HUD каждый кадр
	updateHUD(roundTime, percent) {
		const left = Math.max(0, CONFIG.round.durationSec - roundTime);
		this.timerBar.style.width = (left / CONFIG.round.durationSec * 100) + "%";
		this.timerBar.style.background = left < 10 ? "#c06040" : "#4a8a4a";
		this.percentLabel.textContent = `Свои дела: ${percent}%`;
	},

	// Окно гнева босса: красный оверлей с гневной фразой на время заморозки
	showAngry(count) {
		const el = this._overlay();
		el.style.background = "rgba(150, 20, 20, 0.88)";
		const phrase = CONFIG.bossAngryLines[
			Math.floor(Math.random() * CONFIG.bossAngryLines.length)
		];
		el.innerHTML = `
			<p style="font-size: 24px; font-weight: bold; margin: 0 16px 10px; max-width: 300px;">${phrase}</p>
			<p style="margin: 0; color: #ffc0c0; font-size: 16px;">ЗАМЕЧАНИЕ ${count}/${CONFIG.warnings.max}</p>
		`;
		setTimeout(() => el.remove(), CONFIG.phone.angrySec * 1000);
	},

	// Оверлей на весь экран (используют пауза и финалы)
	_overlay() {
		const el = document.createElement("div");
		el.style.cssText = `
			position: absolute; inset: 0;
			display: flex; flex-direction: column; align-items: center; justify-content: center;
			background: rgba(10, 10, 20, 0.9);
			color: #fff; text-align: center;
			font-family: system-ui, sans-serif;
			pointer-events: auto;
		`;
		this.root.appendChild(el);
		return el;
	},

	// Пауза: оверлей возврата
	showPause() {
		this.pauseEl = this._overlay();
		this.pauseEl.innerHTML = `
			<p style="font-size: 20px; margin: 0;">Все ждут только тебя, Вова.</p>
			<p style="margin: 8px 0 0;">Коснись, чтобы вернуться</p>
		`;
	},

	hidePause() {
		if (this.pauseEl) {
			this.pauseEl.remove();
			this.pauseEl = null;
		}
	},

	// Экран выбора персонажа: отдельный экран с тёмным фоном (без игровой сцены).
	// Масштабируется под весь экран; карточка Вовы запускает его мини-игру
	showSelect(onStart) {
		const el = this._overlay();
		el.style.background = "#12141c";
		el.innerHTML = `
			<div style="width: 100%; height: 100%; box-sizing: border-box;
				display: flex; flex-direction: column; align-items: center;
				justify-content: center; padding: 5vh 5vw;">
				<p style="font-size: 8vh; font-weight: 900; color: #fff; margin: 0;
					font-family: system-ui, sans-serif; letter-spacing: 1px;">one <3 офис</p>
				<p style="font-size: 3.2vh; font-weight: 700; letter-spacing: 3px;
					text-transform: uppercase; color: #4a7ae0; margin: 1.5vh 0 0;
					font-family: system-ui, sans-serif;">Выбор персонажа</p>
				<p style="font-size: 2.2vh; color: #8a8a9a; margin: 0.8vh 0 4vh;
					font-family: system-ui, sans-serif;">Кто ты сегодня в офисе?</p>
				<div style="display: flex; gap: 2vw; width: 100%; max-width: 92vw;
					flex: 1; min-height: 0;">
					<div id="vova-card" style="flex: 1.3; cursor: pointer;
						background: linear-gradient(180deg, #2c2c44, #1d1d30);
						border: 3px solid #2f5fd0; border-radius: 2.4vh; padding: 1.6vh;
						display: flex; flex-direction: column; box-sizing: border-box;">
						<img src="assets/characters/vova_character_select.png" alt="Вова"
							style="flex: 1; min-height: 0; width: 100%; object-fit: cover;
								border-radius: 1.6vh; image-rendering: pixelated; display: block;">
						<p style="color: #fff; font-weight: bold; font-size: 3vh; margin: 1.4vh 0 0;
							font-family: system-ui, sans-serif;">Вова</p>
						<p style="color: #8a8a9a; font-size: 1.9vh; margin: 0.4vh 0 0;
							font-family: system-ui, sans-serif;">Мемы под столом</p>
					</div>
					<div style="flex: 1; background: #1a1a26; border: 3px dashed #3a3a4a;
						border-radius: 2.4vh; padding: 1.6vh; display: flex; flex-direction: column;
						align-items: center; justify-content: center; box-sizing: border-box;">
						<p style="color: #3a3a4a; font-size: 8vh; margin: 0; font-family: system-ui, sans-serif;">?</p>
						<p style="color: #3a3a4a; font-size: 1.9vh; margin: 1vh 0 0;
							font-family: system-ui, sans-serif;">Скоро</p>
					</div>
					<div style="flex: 1; background: #1a1a26; border: 3px dashed #3a3a4a;
						border-radius: 2.4vh; padding: 1.6vh; display: flex; flex-direction: column;
						align-items: center; justify-content: center; box-sizing: border-box;">
						<p style="color: #3a3a4a; font-size: 8vh; margin: 0; font-family: system-ui, sans-serif;">?</p>
						<p style="color: #3a3a4a; font-size: 1.9vh; margin: 1vh 0 0;
							font-family: system-ui, sans-serif;">Скоро</p>
					</div>
				</div>
			</div>
		`;
		el.querySelector("#vova-card").addEventListener("pointerdown", () => {
			el.remove();
			onStart();
		});
	},

	// Звание по проценту (ТЗ §9.3)
	rankFor(percent) {
		for (const r of CONFIG.ranks) {
			if (percent >= r.minPercent && percent <= r.maxPercent) return r.title;
		}
		return CONFIG.ranks[CONFIG.ranks.length - 1].title;
	},

	// Финальный экран: один шаблон-карточка, три исхода (ТЗ §9)
	// kind: "win" | "fail" | "easter"
	showFinal(kind, data, onRestart) {
		let body = "";
		let shareText = "";

		if (kind === "win") {
			body = `
				<div class="final-header">${CONFIG.winHeader}</div>
				<div class="final-percent">${data.percent}%</div>
				<div class="final-sub">${CONFIG.winStat}</div>
				<div class="final-divider"></div>
				<div class="final-label">${CONFIG.rankLabel}</div>
				<div class="final-rank">«${this.rankFor(data.percent)}»</div>
				<div class="final-sub" style="margin-top: 10px;">Замечаний: ${data.warnings}</div>
			`;
			shareText = CONFIG.shareText.replace("{P}", data.percent);
		} else if (kind === "fail") {
			body = `
				<div class="final-header">Замечаний: ${CONFIG.warnings.max}</div>
				<div class="final-text">${CONFIG.failText.replace("{N}", data.second)}</div>
			`;
			shareText = CONFIG.shareTextFail.replace("{N}", data.second);
		} else {
			// пасхалка: победа с 0% «своих дел»
			body = `
				<div class="final-header">${CONFIG.winHeader}</div>
				<div class="final-text">${CONFIG.easterText}</div>
			`;
			shareText = CONFIG.easterShareText;
		}

		const el = this._overlay();
		el.innerHTML = `
			<div class="final-card">
				${body}
				<button id="share-btn" class="final-btn final-btn-share">Поделиться</button>
				<button id="again-btn" class="final-btn final-btn-again">Ещё раз</button>
			</div>
		`;
		el.querySelector("#share-btn").addEventListener("click", () => this.share(shareText));
		el.querySelector("#again-btn").addEventListener("click", () => {
			el.remove();
			onRestart();
		});
	},

	// Шеринг: системное меню на мобиле, буфер обмена на десктопе (ТЗ §9.2)
	async share(text) {
		const url = location.href;
		if (navigator.share) {
			try {
				await navigator.share({ text, url });
			} catch (e) {
				// игрок отменил шеринг — не ошибка
			}
		} else {
			try {
				await navigator.clipboard.writeText(text + " " + url);
				this.toast("Ссылка скопирована");
			} catch (e) {
				this.toast("Не удалось скопировать");
			}
		}
	},

	// Плашка над объектом сцены (координаты — логические, 360×640).
	// Всплывает и тает, длительность из конфига
	bubble(text, lx, ly) {
		const p = Scene.toScreen(lx, ly);
		const el = document.createElement("div");
		el.className = "bubble";
		el.textContent = text;
		el.style.left = p.x + "px";
		el.style.top = p.y + "px";
		el.style.animationDuration = CONFIG.ui.bubbleSec + "s";
		this.root.appendChild(el);
		setTimeout(() => el.remove(), CONFIG.ui.bubbleSec * 1000);
	},

	// Обучение: плашка первые 3 с или до первого касания (ТЗ §6.2)
	showTutorial() {
		this.tutorialEl = document.createElement("div");
		this.tutorialEl.textContent = "Держи — Вова листает. Отпусти — босс смотрит";
		this.tutorialEl.style.cssText = `
			position: absolute; top: 18%; left: 50%; transform: translateX(-50%);
			max-width: 280px; padding: 12px 16px;
			background: #f0f0f0; color: #222; border-radius: 10px;
			font-family: system-ui, sans-serif; font-size: 15px; text-align: center;
		`;
		this.root.appendChild(this.tutorialEl);
	},

	hideTutorial() {
		if (this.tutorialEl) {
			this.tutorialEl.remove();
			this.tutorialEl = null;
		}
	},

	// Небольшая плашка-уведомление внизу экрана
	toast(message) {
		const el = document.createElement("div");
		el.textContent = message;
		el.style.cssText = `
			position: absolute; bottom: 24px; left: 50%; transform: translateX(-50%);
			padding: 10px 18px; background: #33334a; color: #fff;
			border-radius: 8px; font-family: system-ui, sans-serif; font-size: 14px;
		`;
		this.root.appendChild(el);
		setTimeout(() => el.remove(), 2000);
	},
};
