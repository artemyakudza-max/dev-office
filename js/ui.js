// UI: DOM-слой поверх canvas. Пока минимум: вспышка замечания и заглушка провала
const UI = {
	root: null,

	init() {
		this.root = document.getElementById("ui");
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

	// Заглушка экрана провала (полный финальный экран — в шаге 6)
	showFailStub() {
		const el = document.createElement("div");
		el.innerHTML = `
			<p style="font-size: 26px; font-weight: bold; margin: 0 0 16px;">Спалился!</p>
			<p style="margin: 0 0 24px;">Коснись экрана, чтобы попробовать снова</p>
		`;
		el.style.cssText = `
			position: absolute; inset: 0;
			display: flex; flex-direction: column; align-items: center; justify-content: center;
			background: rgba(10, 10, 20, 0.9);
			color: #fff; text-align: center;
			font-family: system-ui, sans-serif;
			pointer-events: auto;
		`;
		el.addEventListener("pointerdown", () => location.reload());
		this.root.appendChild(el);
	},
};
