// UI: DOM-слой поверх canvas — HUD, вспышка замечания, пауза, заглушки финалов
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

	// Оверлей на весь экран с кнопкой «коснись» (используют пауза и финалы)
	_overlay(html) {
		const el = document.createElement("div");
		el.innerHTML = html;
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
		this.pauseEl = this._overlay(`
			<p style="font-size: 20px; margin: 0;">Совещание без тебя не ждёт.</p>
			<p style="margin: 8px 0 0;">Коснись, чтобы вернуться</p>
		`);
	},

	hidePause() {
		if (this.pauseEl) {
			this.pauseEl.remove();
			this.pauseEl = null;
		}
	},

	// Заглушка экрана провала (полный финальный экран — в шаге 6)
	showFailStub() {
		const el = this._overlay(`
			<p style="font-size: 26px; font-weight: bold; margin: 0 0 16px;">Спалился!</p>
			<p style="margin: 0 0 24px;">Коснись экрана, чтобы попробовать снова</p>
		`);
		el.addEventListener("pointerdown", () => location.reload());
	},

	// Заглушка экрана победы (полный финальный экран — в шаге 6)
	showWinStub(percent) {
		const el = this._overlay(`
			<p style="font-size: 26px; font-weight: bold; margin: 0 0 16px;">Дожил до конца совещания!</p>
			<p style="margin: 0 0 24px;">Свои дела: ${percent}%. Коснись, чтобы сыграть ещё</p>
		`);
		el.addEventListener("pointerdown", () => location.reload());
	},
};
