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
			<div id="timerbar-bg" style="position: absolute; bottom: 0; left: 0; right: 0;
				height: 8px; background: rgba(255,255,255,0.15);">
				<div id="timerbar" style="height: 100%; width: 100%; background: #4a8a4a;"></div>
			</div>
		`;
		this.root.appendChild(hud);
		this.percentLabel = hud.querySelector("#percent");
		this.timerBar = hud.querySelector("#timerbar");
	},

	// Обновление HUD каждый кадр
	updateHUD(roundTime, percent) {
		const left = Math.max(0, CONFIG.round.durationSec - roundTime);
		this.timerBar.style.width = (left / CONFIG.round.durationSec * 100) + "%";
		this.timerBar.style.background = left < 10 ? "#c06040" : "#4a8a4a";
		this.percentLabel.textContent = `Свои дела: ${percent}%`;
	},

	// Красная вспышка + текст «ЗАМЕЧАНИЕ 1/2» на 1 секунду
	showWarning(count) {
		const el = document.createElement("div");
		el.textContent = `ЗАМЕЧАНИЕ ${count}/${CONFIG.warnings.max}`;
		el.style.cssText = `
			position: absolute; inset: 0;
			display: flex; align-items: center; justify-content: center;
			background: rgba(200, 30, 30, 0.35);
			color: #fff; font-size: 28px; font-weight: bold;
			font-family: system-ui, sans-serif;
		`;
		this.root.appendChild(el);
		setTimeout(() => el.remove(), 1000);
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
			<p style="font-size: 20px; margin: 0;">Совещание без тебя не ждёт.</p>
			<p style="margin: 8px 0 0;">Коснись, чтобы вернуться</p>
		`;
	},

	hidePause() {
		if (this.pauseEl) {
			this.pauseEl.remove();
			this.pauseEl = null;
		}
	},

	// Звание по проценту (ТЗ §9.3)
	rankFor(percent) {
		for (const r of CONFIG.ranks) {
			if (percent >= r.minPercent && percent <= r.maxPercent) return r.title;
		}
		return CONFIG.ranks[CONFIG.ranks.length - 1].title;
	},

	// Финальный экран: один шаблон, три исхода (ТЗ §9)
	// kind: "win" | "fail" | "easter"
	showFinal(kind, data, onRestart) {
		let text = "";
		let sub = "";
		let shareText = "";

		if (kind === "win") {
			text = `Вова дожил до конца совещания. ${this.rankFor(data.percent)}. ${data.percent}% рабочего времени занимался своими делами`;
			sub = `Замечаний: ${data.warnings}`;
			shareText = CONFIG.shareText.replace("{P}", data.percent);
		} else if (kind === "fail") {
			text = `Спалился на ${data.second} секунде`;
			shareText = CONFIG.shareTextFail.replace("{N}", data.second);
		} else {
			// пасхалка: победа с 0% «своих дел»
			text = "Вова не занялся ни одним своим делом. Босс подозрительно доволен";
			shareText = "Вова не занялся ни одним своим делом на совещании. Босс подозрительно доволен";
		}

		const el = this._overlay();
		el.innerHTML = `
			<div style="max-width: 300px; padding: 24px; background: #26263a;
				border-radius: 12px; margin: 0 16px;">
				<p style="font-size: 20px; line-height: 1.4; margin: 0 0 8px;">${text}</p>
				${sub ? `<p style="color: #9a9ab0; margin: 0 0 8px;">${sub}</p>` : ""}
				<button id="share-btn" style="display: block; width: 100%; padding: 12px;
					margin: 16px 0 0; border: none; border-radius: 8px;
					background: #3a5a8a; color: #fff; font-size: 16px;">Поделиться</button>
				<button id="again-btn" style="display: block; width: 100%; padding: 14px;
					margin: 10px 0 0; border: none; border-radius: 8px;
					background: #4a8a4a; color: #fff; font-size: 18px; font-weight: bold;">Ещё раз</button>
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
