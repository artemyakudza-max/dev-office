// UI: DOM-слой поверх canvas — HUD, вспышка замечания, пауза, финальные экраны
const UI = {
	root: null,
	timerBar: null,
	percentLabel: null,

	init() {
		this.root = document.getElementById("ui");

		// HUD: полоска таймера внизу + бейдж «Свои дела» в углу (пиксель-стиль)
		const hud = document.createElement("div");
		hud.style.cssText = "position: absolute; inset: 0;";
		hud.innerHTML = `
			<div id="percent" class="hud-badge">
				<span class="hud-badge-icon">📱</span>
				<span class="hud-badge-text">
					<span class="hud-badge-label">Свои дела:</span>
					<span class="hud-badge-value" id="percent-value">0%</span>
				</span>
			</div>
			<div id="version" style="position: absolute; bottom: 14px; right: 10px;
				color: #6a6a80; font-family: system-ui, sans-serif; font-size: 12px;"></div>
			<div id="timerbar-bg" style="position: absolute; bottom: 0; left: 0; right: 0;
				height: 8px; background: rgba(255,255,255,0.15);">
				<div id="timerbar" style="height: 100%; width: 100%; background: #4a8a4a;"></div>
			</div>
		`;
		this.root.appendChild(hud);
		this.percentLabel = hud.querySelector("#percent");
		this.percentValue = hud.querySelector("#percent-value");
		this.timerBar = hud.querySelector("#timerbar");
		hud.querySelector("#version").textContent = CONFIG.version;
	},

	// Обновление HUD каждый кадр
	updateHUD(roundTime, percent) {
		const left = Math.max(0, CONFIG.round.durationSec - roundTime);
		this.timerBar.style.width = (left / CONFIG.round.durationSec * 100) + "%";
		this.timerBar.style.background = left < 10 ? "#c06040" : "#4a8a4a";
		// Пульс бейджа только при изменении процента (не каждый кадр)
		const text = `${percent}%`;
		if (this.percentValue.textContent !== text) {
			this.percentValue.textContent = text;
			this.percentLabel.classList.remove("hud-pop");
			void this.percentLabel.offsetWidth; // reflow — перезапуск анимации
			this.percentLabel.classList.add("hud-pop");
		}
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

	// Пауза: оверлей возврата. Возврат — касание самого оверлея
	showPause(onResume) {
		this.pauseEl = this._overlay();
		this.pauseEl.innerHTML = `
			<p style="font-size: 20px; margin: 0;">Все ждут только тебя, Вова.</p>
			<p style="margin: 8px 0 0;">Коснись, чтобы вернуться</p>
		`;
		this.pauseEl.addEventListener("pointerdown", (e) => {
			if (e.button !== 0) return;
			onResume();
		});
	},

	hidePause() {
		if (this.pauseEl) {
			this.pauseEl.remove();
			this.pauseEl = null;
		}
	},

	// Экран выбора персонажа: отдельный экран с тёмным фоном (без игровой сцены).
	// Макет фиксированный 360×640 и целиком масштабируется под вьюпорт —
	// пропорции одинаковы на любом устройстве (как игровая сцена).
	// Выбор — только левой кнопкой мыши / тапом
	showSelect(onStart) {
		const el = this._overlay();
		el.style.background = "#12141c";
		el.innerHTML = `
			<div id="select-scale" style="position: absolute; left: 50%; top: 50%;
				width: 360px; height: 640px; transform-origin: center;
				display: flex; flex-direction: column; align-items: center;">
				<!-- Зона логотипа: визуально отделена, доминирует -->
				<div style="margin-top: 64px; text-align: center;">
					<p class="game-logo" style="font-size: 27px; color: #f0c040; margin: 0; line-height: 1.4;
						font-family: var(--pixel-font); text-shadow: 4px 4px 0 #c05050;"><span class="logo-text">one</span> <svg class="logo-heart"
						viewBox="-1 -1 10 9" shape-rendering="crispEdges" aria-label="сердце"
						style="width: 50px; height: 45px; vertical-align: -12px; margin: 0;">
						<path fill="#e04040" stroke="#e04040" stroke-width="0.12" d="M1 0H3V1H5V0H7V1H8V4H7V5H6V6H5V7H3V6H2V5H1V4H0V1H1Z"/></svg> <span class="logo-text">офис</span></p>
					<p style="font-size: 8px; letter-spacing: 3px; color: #8a92a8;
						margin: 14px 0 0; font-family: var(--pixel-font);">ПРОВЕРЬ, НА ЧТО ТЫ СПОСОБЕН</p>
				</div>
				<!-- Пиксельные звёзды-разделитель -->
				<div style="display: flex; gap: 10px; margin: 26px 0 0;">
					<div style="width: 4px; height: 4px; background: #3a4150;"></div>
					<div style="width: 4px; height: 4px; background: #f0c040;"></div>
					<div style="width: 4px; height: 4px; background: #3a4150;"></div>
				</div>
				<!-- Зона выбора: метка придвинута к карточкам -->
				<p style="font-size: 10px; letter-spacing: 2px; color: #4a7ae0;
					margin: 34px 0 6px; font-family: var(--pixel-font);">ВЫБОР ПЕРСОНАЖА</p>
				<p style="font-size: 12px; color: #8a8a9a; margin: 0 0 14px;
					font-family: var(--body-font);">Кто ты сегодня в офисе?</p>
				<div style="display: flex; gap: 12px; align-items: stretch; height: 264px;">
					<div id="vova-card" class="vova-card" style="width: 128px; cursor: pointer;
						background: linear-gradient(180deg, #2c2c44, #1d1d30);
						padding: 7px;
						display: flex; flex-direction: column; box-sizing: border-box;">
						<img src="assets/characters/vova_character_select.png" alt="Вова"
							style="flex: 1; min-height: 0; width: 100%; object-fit: cover;
								image-rendering: pixelated; display: block;">
						<p style="color: #f0c040; font-size: 10px; margin: 9px 0 0;
							font-family: var(--pixel-font);">ВОВА</p>
						<p style="color: #8a8a9a; font-size: 10px; margin: 4px 0 0;
							font-family: var(--body-font);">Успеть за 60 секунд</p>
					</div>
					<div style="width: 92px; background: #1a1a26; border: 3px dashed #3a3a4a;
						border-radius: 0; padding: 7px; display: flex; flex-direction: column;
						align-items: center; justify-content: center; box-sizing: border-box;">
						<p style="color: #3a3a4a; font-size: 22px; margin: 0; font-family: var(--pixel-font);">?</p>
						<p style="color: #3a3a4a; font-size: 9px; margin: 8px 0 0;
							font-family: var(--body-font);">Скоро</p>
					</div>
					<div style="width: 92px; background: #1a1a26; border: 3px dashed #3a3a4a;
						border-radius: 0; padding: 7px; display: flex; flex-direction: column;
						align-items: center; justify-content: center; box-sizing: border-box;">
						<p style="color: #3a3a4a; font-size: 22px; margin: 0; font-family: var(--pixel-font);">?</p>
						<p style="color: #3a3a4a; font-size: 9px; margin: 8px 0 0;
							font-family: var(--body-font);">Скоро</p>
					</div>
				</div>
				<!-- Футер-строка в духе аркадных экранов: текущая версия игры -->
				<p style="font-size: 7px; letter-spacing: 2px; color: #4a4a5a;
					margin: auto 0 18px; font-family: var(--pixel-font);">${CONFIG.version}</p>
			</div>
			<!-- CRT-эффекты поверх: сканлайны и виньетка -->
			<div class="crt-scanlines"></div>
			<div class="crt-vignette"></div>
		`;
		this.fitSelect(el);
		this._selectFitHandler = () => this.fitSelect(el);
		window.addEventListener("resize", this._selectFitHandler);
		el.querySelector("#vova-card").addEventListener("pointerdown", (e) => {
			if (e.button !== 0) return; // только левая кнопка мыши / тап
			window.removeEventListener("resize", this._selectFitHandler);
			el.remove();
			onStart();
		});
	},

	// Масштаб макета 360×640 под вьюпорт с сохранением пропорций
	fitSelect(el) {
		const inner = el.querySelector("#select-scale");
		if (!inner) return;
		const s = Math.min(window.innerWidth / 380, window.innerHeight / 660);
		inner.style.transform = `translate(-50%, -50%) scale(${s})`;
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
	// Портрет-«вспышка исхода» сверху карточки + цветовой акцент рамки
	// (приём из референсов: эмоция персонажа читается раньше текста)
	showFinal(kind, data, onRestart, onMenu) {
		let body = "";
		let shareText = "";
		const portrait = `
			<img class="final-portrait final-portrait-${kind}"
				src="${CONFIG.finalPortraits[kind]}" alt="">
		`;

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
			<div class="final-card final-card-${kind}">
				${portrait}
				${body}
				<button id="share-btn" class="final-btn final-btn-share">Поделиться</button>
				<button id="again-btn" class="final-btn final-btn-again">Ещё раз</button>
				<button id="menu-btn" class="final-btn final-btn-menu">Главное меню</button>
			</div>
		`;
		el.querySelector("#share-btn").addEventListener("click", () => this.share(shareText));
		el.querySelector("#again-btn").addEventListener("click", () => {
			el.remove();
			onRestart();
		});
		el.querySelector("#menu-btn").addEventListener("click", () => {
			el.remove();
			onMenu();
		});
	},

	// Шеринг: системное меню на мобиле, буфер обмена на десктопе (ТЗ §9.2)
	async share(text) {
		const url = location.href;
		if (navigator.share) {
			try {
				// iOS выбрасывает поле url при отправке в мессенджеры —
				// вкладываем ссылку прямо в текст, иначе доходит только она
				await navigator.share({ text: text + " " + url });
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
	// align: "center" — по центру точки (десктоп), "left"/"right" — прижата
	// к краю экрана (мобайл), независимо от позиции спрайта
	bubble(text, lx, ly, align) {
		const p = Scene.toScreen(lx, ly);
		const el = document.createElement("div");
		el.className = "bubble";
		el.textContent = text;
		el.style.left = p.x + "px";
		el.style.top = p.y + "px";
		el.style.animationDuration = CONFIG.ui.bubbleSec + "s";
		this.root.appendChild(el);
		// ВАЖНО: CSS-анимация плашки держит её центрированной на координате
		// (translate(-50%)), поэтому задаём ЦЕНТР плашки, а не её край
		const w = el.offsetWidth, m = 8;
		let cx;
		if (align === "left") {
			cx = m + w / 2;                             // прижата к левому краю
		} else if (align === "right") {
			cx = window.innerWidth - m - w / 2;         // прижата к правому краю
		} else {
			cx = p.x;                                   // центр над головой
		}
		// Страховка: даже в центре плашка не выезжает за края экрана
		cx = Math.min(Math.max(cx, m + w / 2), window.innerWidth - m - w / 2);
		el.style.left = cx + "px";
		setTimeout(() => el.remove(), CONFIG.ui.bubbleSec * 1000);
	},

	// Кнопка паузы (две палки) в правом верхнем углу во время игры
	showPauseBtn(onPause) {
		if (this.pauseBtn) return;
		this.pauseBtn = document.createElement("div");
		this.pauseBtn.innerHTML = `
			<div style="width: 6px; height: 18px; background: #fff;"></div>
			<div style="width: 6px; height: 18px; background: #fff;"></div>
		`;
		this.pauseBtn.style.cssText = `
			position: absolute; top: 10px; right: 10px;
			display: flex; gap: 5px; align-items: center; justify-content: center;
			width: 40px; height: 40px; box-sizing: border-box;
			background: rgba(38, 38, 58, 0.85);
			border: 2px solid #4a5064; border-radius: 6px;
			cursor: pointer; pointer-events: auto; z-index: 10;
		`;
		this.pauseBtn.addEventListener("pointerdown", (e) => {
			if (e.button !== 0) return;
			e.stopPropagation();
			onPause();
		});
		this.root.appendChild(this.pauseBtn);
	},

	hidePauseBtn() {
		if (this.pauseBtn) {
			this.pauseBtn.remove();
			this.pauseBtn = null;
		}
	},

	// Меню паузы: продолжить или выйти в главное меню.
	// Клик в любую точку экрана (кроме кнопок) тоже продолжает игру
	showPauseMenu(onResume, onMenu) {
		this.pauseMenuEl = this._overlay();
		this.pauseMenuEl.innerHTML = `
			<div class="final-card" style="max-width: 260px;">
				<p style="font-family: var(--pixel-font); font-size: 14px; color: #f0c040;
					margin: 0 0 18px; text-align: center;">ПАУЗА</p>
				<button id="resume-btn" class="final-btn final-btn-again">Продолжить</button>
				<button id="pmenu-btn" class="final-btn final-btn-menu">Главное меню</button>
			</div>
		`;
		this.pauseMenuEl.addEventListener("pointerdown", (e) => {
			if (e.button !== 0) return;
			if (e.target.closest("button")) return; // кнопки обрабатывают себя сами
			onResume();
		});
		this.pauseMenuEl.querySelector("#resume-btn").addEventListener("click", onResume);
		this.pauseMenuEl.querySelector("#pmenu-btn").addEventListener("click", () => {
			this.pauseMenuEl.remove();
			this.pauseMenuEl = null;
			onMenu();
		});
	},

	hidePauseMenu() {
		if (this.pauseMenuEl) {
			this.pauseMenuEl.remove();
			this.pauseMenuEl = null;
		}
	},

	// Обучение: плашка первые 3 с или до первого касания (ТЗ §6.2).
	// Пиксельный заголовок + читаемый текст, панель в стиле финальных карточек
	showTutorial() {
		this.tutorialEl = document.createElement("div");
		this.tutorialEl.style.cssText = `
			position: absolute; top: 10%; left: 50%; transform: translateX(-50%);
			max-width: 360px; padding: 18px 22px;
			background: linear-gradient(180deg, #2c2c44, #1d1d30);
			border: 3px solid #c9a227; border-radius: 10px;
			box-shadow: 0 0 20px rgba(201, 162, 39, 0.2);
			text-align: center;
			animation: tutorialPulse 1s ease-in-out infinite;
		`;
		this.tutorialEl.innerHTML = `
			<p style="font-family: var(--pixel-font); font-size: 16px; color: #f0c040;
				margin: 0 0 12px;">КАК ИГРАТЬ</p>
			<p style="font-family: var(--body-font); font-size: 16px; line-height: 1.55;
				color: #fff; margin: 0;">
				<b>Нажми на экран</b> — Вова достанет телефон.<br>
				<b>Отпусти</b>, когда на тебя смотрят.
			</p>
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
