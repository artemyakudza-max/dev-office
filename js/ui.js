// UI: DOM-слой поверх canvas — HUD, вспышка замечания, пауза, финальные экраны
const UI = {
	root: null,
	crowdRects: [], // занятые места выкриков толпы (пока они на экране)
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

	// HUD-элементы Вовы (счётчик «Свои дела», полоска таймера) в «Цицеридисе»
	// не используются — прячу их (решение автора)
	mode: "vova",
	setMode(mode) {
		this.mode = mode;
		const isVova = mode === "vova";
		this.percentLabel.style.display = isVova ? "" : "none";
		this.timerBar.parentElement.style.display = isVova ? "" : "none";
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
		const who = CONFIG.characters[this.mode].namePause;
		this.pauseEl.innerHTML = `
			<p style="font-size: 20px; margin: 0;">Все ждут только тебя, ${who}.</p>
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
	showSelect(onStart, onStartCiceridis) {
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
					<div id="vova-card" class="char-card" style="width: 112px; cursor: pointer;
						background: linear-gradient(180deg, #2c2c44, #1d1d30);
						padding: 7px;
						display: flex; flex-direction: column; box-sizing: border-box;">
						<img src="assets/characters/vova_character_select.jpg" alt="Вова"
							style="flex: 1; min-height: 0; width: 100%; object-fit: cover;
								image-rendering: pixelated; display: block;">
						<!-- Футер фиксированной высоты: имя и название игры на одном уровне во всех карточках -->
						<div style="flex-shrink: 0; height: 52px;">
							<p style="color: #f0c040; font-size: 10px; line-height: 12px; margin: 9px 0 0;
								font-family: var(--pixel-font);">${CONFIG.characters.vova.name}</p>
							<p style="color: #8a8a9a; font-size: 10px; line-height: 13px; margin: 4px 0 0;
								font-family: var(--body-font);">${CONFIG.characters.vova.gameTitle}</p>
						</div>
					</div>
					<!-- Карточка Чекеридиса (мини-игра «Цицеридис») — стиль карточки Вовы -->
					<div id="chekeridis-card" class="char-card" style="width: 112px; cursor: pointer;
						background: linear-gradient(180deg, #2c2c44, #1d1d30);
						padding: 7px;
						display: flex; flex-direction: column; box-sizing: border-box;">
						<img id="chekeridis-img" src="assets/characters/chekeridis_character_select.jpg"
							alt="Чекеридис" style="flex: 1; min-height: 0; width: 100%; object-fit: cover;
								image-rendering: pixelated; display: block;">
						<span id="chekeridis-fallback" style="flex: 1; min-height: 0; display: none;
							align-items: center; justify-content: center; color: #3a3a4a;
							font-size: 22px; font-family: var(--pixel-font);">?</span>
						<div style="flex-shrink: 0; height: 52px;">
							<p style="color: #f0c040; font-size: 10px; line-height: 12px; margin: 9px 0 0;
								font-family: var(--pixel-font);">${CONFIG.characters.ciceridis.name}</p>
							<p style="color: #8a8a9a; font-size: 10px; line-height: 13px; margin: 4px 0 0;
								font-family: var(--body-font);">${CONFIG.characters.ciceridis.gameTitle}</p>
						</div>
					</div>
					<div style="width: 112px; background: #1a1a26; border: 3px dashed #3a3a4a;
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
		// Карточка Чекеридиса: запуск мини-игры «Цицеридис»
		el.querySelector("#chekeridis-card").addEventListener("pointerdown", (e) => {
			if (e.button !== 0) return;
			window.removeEventListener("resize", this._selectFitHandler);
			el.remove();
			onStartCiceridis();
		});
		// Если спрайт Чекеридиса ещё не добавлен — показываем «?», игра не ломается
		const chImg = el.querySelector("#chekeridis-img");
		chImg.addEventListener("error", () => {
			chImg.style.display = "none";
			el.querySelector("#chekeridis-fallback").style.display = "flex";
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

	// Портрет финала: у поражения Чекеридиса зависит от числа тостов —
	// чем дольше продержался, тем сильнее напился
	finalPortraitSrc(kind, data) {
		if (kind === "ciceridisFail") {
			const t = (data && data.toast) || 1;
			if (t <= 3) return CONFIG.finalPortraits.ciceridisFail13;
			if (t <= 6) return CONFIG.finalPortraits.ciceridisFail46;
			return CONFIG.finalPortraits.ciceridisFail79;
		}
		return CONFIG.finalPortraits[kind];
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
				src="${this.finalPortraitSrc(kind, data)}" alt="">
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
		} else if (kind === "ciceridisFail") {
			// поражение Чекеридиса: заголовок «СВАЛИЛСЯ на N-м тосте»
			// + полный текст тоста, на котором упал (ТЗ §4.1)
			body = `
				<div class="final-header">${CONFIG.ciceridis.failHeader.replace("{N}", data.toast)}</div>
				<div class="final-text">${data.toastText}</div>
			`;
			shareText = CONFIG.ciceridis.failShareText.replace("{N}", data.toast);
		} else if (kind === "ciceridisWin") {
			// победа Чекеридиса: выстоял все тосты (ТЗ §4.3)
			body = `
				<div class="final-header">${CONFIG.ciceridis.winHeader}</div>
				<div class="final-label" style="margin-top: 14px;">${CONFIG.rankLabel}</div>
				<div class="final-rank">«${CONFIG.ciceridis.winRank}»</div>
				<div class="final-sub" style="margin-top: 10px;">Тостов: ${data.toast}</div>
			`;
			shareText = CONFIG.ciceridis.winShareText;
		} else if (kind === "fail") {
			body = `
				<div class="final-header">Замечаний: ${CONFIG.warnings.max}</div>
				<div class="final-text">${CONFIG.failText.replace("{N}", data.second)}</div>
			`;
			shareText = CONFIG.shareTextFail.replace("{N}", data.second);
		} else if (kind === "ciceridisEaster") {
			// пасхалка «REAL UNLUCK»: свалился в 1-м раунде (ТЗ §4.2)
			body = `
				<div class="final-header">${CONFIG.ciceridis.easterHeader}</div>
				<div class="final-text">${CONFIG.ciceridis.easterText}</div>
			`;
			shareText = CONFIG.ciceridis.easterShareText;
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
				<button id="share-btn" class="final-btn final-btn-share" disabled>Подготовка…</button>
				<button id="again-btn" class="final-btn final-btn-again">Ещё раз</button>
				<button id="menu-btn" class="final-btn final-btn-menu">Главное меню</button>
			</div>
		`;
		// Кнопка «Поделиться» неактивна, пока не готова PNG-картинка (обычно мгновенно)
		this.shareBtn = el.querySelector("#share-btn");
		this.shareBtn.addEventListener("click", () => this.share(shareText));
		el.querySelector("#again-btn").addEventListener("click", () => {
			el.remove();
			onRestart();
		});
		el.querySelector("#menu-btn").addEventListener("click", () => {
			el.remove();
			onMenu();
		});
		// Триумфальная рамка победы Чекеридиса: венок + меандр (те же SVG, что на шеринге)
		if (kind === "ciceridisWin") {
			const card = el.querySelector(".final-card");
			const wreath = document.createElement("div");
			wreath.className = "win-wreath";
			wreath.innerHTML = this.buildWreathSvg(176);
			const frame = document.createElement("div");
			frame.className = "win-frame";
			frame.innerHTML = this.buildWinFrameSvg(card.clientWidth, card.clientHeight);
			card.prepend(wreath);
			card.prepend(frame);
		}
		// PNG-картинку для шеринга готовим в фоне, пока игрок читает результат
		this._prepareShareCard(kind, data);
	},

	// Шеринг: картинка + текст на мобилках с поддержкой файлов,
	// иначе системное меню с текстом, на десктопе — буфер обмена (ТЗ §9.2)
	async share(text) {
		const url = location.href;
		const full = text + " " + url;
		// картинку вкладываем файлом; canShare — проверка поддержки файлов
		if (this.shareFile && navigator.canShare &&
			navigator.canShare({ files: [this.shareFile] })) {
			try {
				await navigator.share({ text: full, files: [this.shareFile] });
				return;
			} catch (e) {
				// отмена игроком — не ошибка; прочие сбои → текстовый шеринг ниже
			}
		}
		if (navigator.share) {
			try {
				// iOS выбрасывает поле url при отправке в мессенджеры —
				// вкладываем ссылку прямо в текст, иначе доходит только она
				await navigator.share({ text: full });
			} catch (e) {
				// игрок отменил шеринг — не ошибка
			}
		} else {
			try {
				await navigator.clipboard.writeText(full);
				this.toast("Ссылка скопирована");
			} catch (e) {
				this.toast("Не удалось скопировать");
			}
		}
	},

	// ── Триумфальная рамка победы Чекеридиса (греко-римский стиль) ──
	// Меандр («греческий ключ») по краям карточки + лавровый венок вокруг
	// портрета. Одни и те же SVG-строки вставляются в DOM и рисуются на
	// шеринг-картинке — рамки совпадают пик-в-пик.

	// Рамка с меандром по краям, размер w×h. Ячейка на сетке 12px:
	// непрерывная линия с рельсом вдоль края и крюками наружу, в углах — ромбы
	buildWinFrameSvg(w, h) {
		const u = 12, gold = "#c9a227", bright = "#e8c860";
		// полосы не доходят до углов (там ромбы)
		const nH = Math.max(1, Math.floor((w - 34) / u));
		const nV = Math.max(1, Math.floor((h - 34) / u));
		const xH = ((w - nH * u) / 2).toFixed(1);
		const yV = ((h - nV * u) / 2).toFixed(1);
		const rep = (start, unit, n) => start + unit.repeat(n);
		const top = rep("M0 9", " h3 v-6 h6 v3 h-3 v3 h6", nH);
		const bottom = rep("M0 3", " h3 v6 h6 v-3 h-3 v-3 h6", nH);
		const left = rep("M9 0", " v3 h-6 v6 h3 v-3 h3 v6", nV);
		const right = rep("M3 0", " v3 h6 v6 h-3 v-3 h-3 v6", nV);
		const diamond = (cx, cy) =>
			`M${cx} ${cy - 5} L${cx + 5} ${cy} L${cx} ${cy + 5} L${cx - 5} ${cy} Z`;
		return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">` +
			`<g fill="none" stroke="${bright}" stroke-width="2">` +
			`<path transform="translate(${xH} 7)" d="${top}"/>` +
			`<path transform="translate(${xH} ${h - 19})" d="${bottom}"/>` +
			`<path transform="translate(7 ${yV})" d="${left}"/>` +
			`<path transform="translate(${w - 19} ${yV})" d="${right}"/>` +
			`</g><g fill="${gold}">` +
			`<path d="${diamond(9, 9)}"/><path d="${diamond(w - 9, 9)}"/>` +
			`<path d="${diamond(9, h - 9)}"/><path d="${diamond(w - 9, h - 9)}"/>` +
			`</g></svg>`;
	},

	// Лавровый венок: две зеркальные ветви от скрещенного низа, почти
	// сомкнутые сверху; листья крупнее у основания (классический «award wreath»)
	buildWreathSvg(size) {
		const c = size / 2;
		const R = size * 0.385;
		const rad = (d) => d * Math.PI / 180;
		const pt = (a, r) => [c + r * Math.cos(rad(a)), c + r * Math.sin(rad(a))];
		const leaf = (len) => {
			const w = (len * 0.32).toFixed(1);
			const k1 = (-len * 0.25).toFixed(1), k2 = (-len * 0.72).toFixed(1);
			return `M0 0 C ${w} ${k1} ${w} ${k2} 0 ${-len} C ${-w} ${k2} ${-w} ${k1} 0 0 Z`;
		};
		const a0 = 85, a1 = 245; // дуга ветви: от низа почти до верха
		let leaves = "";
		for (let a = a0 + 15; a <= a1 - 5; a += 14) {
			const t = (a - a0) / (a1 - a0);
			const d = leaf(16 - 7 * t); // листья мельче к верху
			for (const s of [-1, 1]) { // s=1 — наружный лист, s=-1 — внутренний
				const [bx, by] = pt(a, R + s * 2);
				const rot = (a + 180 - s * 30).toFixed(1);
				leaves += `<path d="${d}" transform="translate(${bx.toFixed(1)} ${by.toFixed(1)}) rotate(${rot})" fill="url(#wg)"/>`;
			}
		}
		const [x0, y0] = pt(a0, R);
		const [x1, y1] = pt(a1, R);
		const stem = `<path d="M${x0.toFixed(1)} ${y0.toFixed(1)} A${R} ${R} 0 0 1 ${x1.toFixed(1)} ${y1.toFixed(1)}" ` +
			`fill="none" stroke="url(#wg)" stroke-width="2.5" stroke-linecap="round"/>`;
		return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">` +
			`<defs><linearGradient id="wg" x1="0" y1="0" x2="0" y2="1">` +
			`<stop offset="0" stop-color="#f6d878"/><stop offset="0.55" stop-color="#d9a92e"/><stop offset="1" stop-color="#9a6d10"/>` +
			`</linearGradient></defs><g>${stem}${leaves}</g>` +
			`<g transform="translate(${size} 0) scale(-1 1)">${stem}${leaves}</g></svg>`;
	},

	// SVG-строка → картинка для canvas (data URI не «пачкает» canvas)
	_svgImage(svg) {
		return new Promise((resolve, reject) => {
			const im = new Image();
			im.onload = () => resolve(im);
			im.onerror = () => reject(new Error("svg"));
			im.src = "data:image/svg+xml;utf8," + encodeURIComponent(svg);
		});
	},

	// Подготовка PNG-картинки финального экрана для шеринга.
	// Любая ошибка (медленная сеть, file://) — картинки нет, шарим текстом
	async _prepareShareCard(kind, data) {
		this.shareFile = null;
		const unlock = () => {
			if (this.shareBtn) {
				this.shareBtn.disabled = false;
				this.shareBtn.textContent = "Поделиться";
			}
		};
		try {
			// ждём пиксельный шрифт, иначе текст на картинке будет системным
			await document.fonts.load('11px "Press Start 2P"');
			const img = await new Promise((resolve, reject) => {
				const im = new Image();
				im.onload = () => resolve(im);
				im.onerror = () => reject(new Error("portrait"));
				im.src = this.finalPortraitSrc(kind, data);
			});

			// макет финального экрана 360×640 с ×2 масштабом — чётко на ретине
			const W = 360, H = 640, S = 2;
			const c = document.createElement("canvas");
			c.width = W * S;
			c.height = H * S;
			const ctx = c.getContext("2d");
			ctx.scale(S, S);

			// текст исхода считаем ЗАРАНЕЕ — от числа строк зависит высота карточки
			ctx.textAlign = "center";
			ctx.textBaseline = "middle";
			ctx.font = "19px system-ui, sans-serif";
			const cw = 300, cx = (W - cw) / 2, cy = 150;
			const bodyText = kind === "fail"
				? CONFIG.failText.replace("{N}", data.second)
				: kind === "ciceridisFail" ? data.toastText
				: kind === "easter" ? CONFIG.easterText
				: kind === "ciceridisEaster" ? CONFIG.ciceridis.easterText : null;
			const lines = bodyText ? this._wrapLines(ctx, bodyText, cw - 50) : [];
			// высота карточки растёт под длинный текст — ничего не наезжает
			const ch = kind === "win" ? 390
				: kind === "ciceridisWin" ? 420
				: Math.max(250, 158 + lines.length * 27 + 64);

			// фон
			ctx.fillStyle = "#0d0e16";
			ctx.fillRect(0, 0, W, H);

			// карточка с рамкой-акцентом исхода (как на экране финала)
			const accent = kind === "fail" || kind === "ciceridisFail" ? "#c05050" :
				kind === "easter" || kind === "ciceridisEaster" ? "#4a7ae0" : "#c9a227";
			const grad = ctx.createLinearGradient(0, cy, 0, cy + ch);
			grad.addColorStop(0, "#2c2c44");
			grad.addColorStop(1, "#1d1d30");
			ctx.beginPath();
			ctx.roundRect(cx, cy, cw, ch, 14);
			ctx.fillStyle = grad;
			ctx.fill();
			ctx.strokeStyle = accent;
			ctx.lineWidth = 2;
			ctx.stroke();

			// триумфальная рамка + венок — те же SVG, что на экране победы
			if (kind === "ciceridisWin") {
				const frameImg = await this._svgImage(this.buildWinFrameSvg(cw, ch));
				ctx.drawImage(frameImg, cx, cy, cw, ch);
				const wreathImg = await this._svgImage(this.buildWreathSvg(176));
				ctx.drawImage(wreathImg, W / 2 - 88, cy - 54, 176, 176);
			}

			// портрет 132×132, наполовину выходит за верх карточки;
			// картинка вписана «обрезкой», как object-fit: cover
			const ps = 132, px = (W - ps) / 2, py = cy - 32;
			ctx.fillStyle = "#12141c";
			ctx.beginPath();
			ctx.roundRect(px, py, ps, ps, 10);
			ctx.fill();
			ctx.save();
			ctx.beginPath();
			ctx.roundRect(px + 3, py + 3, ps - 6, ps - 6, 8);
			ctx.clip();
			const k = Math.max((ps - 6) / img.width, (ps - 6) / img.height);
			const dw = img.width * k, dh = img.height * k;
			ctx.drawImage(img, px + (ps - dw) / 2, py + (ps - dh) / 2, dw, dh);
			ctx.restore();
			ctx.strokeStyle = accent;
			ctx.lineWidth = 3;
			ctx.beginPath();
			ctx.roundRect(px, py, ps, ps, 10);
			ctx.stroke();

			// заголовок
			const pix = (size) => size + 'px "Press Start 2P", monospace';
			ctx.fillStyle = kind === "fail" || kind === "ciceridisFail" ? "#e07070" : "#f0c040";
			const header = kind === "ciceridisFail"
				? CONFIG.ciceridis.failHeader.replace("{N}", data.toast)
				: kind === "ciceridisWin"
					? CONFIG.ciceridis.winHeader
					: kind === "ciceridisEaster"
						? CONFIG.ciceridis.easterHeader
						: kind === "win" || kind === "easter"
							? CONFIG.winHeader : "Замечаний: " + CONFIG.warnings.max;
			ctx.font = pix(11);
			ctx.fillText(header.toUpperCase(), W / 2, cy + 118);

			if (kind === "win") {
				ctx.font = "800 54px system-ui, sans-serif";
				ctx.fillStyle = "#fff";
				ctx.fillText(data.percent + "%", W / 2, cy + 156);
				ctx.font = "14px system-ui, sans-serif";
				ctx.fillStyle = "#b0b0c0";
				this._wrapDraw(ctx, CONFIG.winStat, W / 2, cy + 195, cw - 60, 20);
				ctx.fillStyle = "rgba(201, 162, 39, 0.4)";
				ctx.fillRect(cx + 40, cy + 236, cw - 80, 1);
				ctx.font = pix(9);
				ctx.fillStyle = "#9a9ab0";
				ctx.fillText(CONFIG.rankLabel.toUpperCase(), W / 2, cy + 254);
				ctx.font = "700 22px system-ui, sans-serif";
				ctx.fillStyle = "#f0c040";
				this._wrapDraw(ctx, "«" + this.rankFor(data.percent) + "»",
					W / 2, cy + 276, cw - 30, 26);
				ctx.font = "14px system-ui, sans-serif";
				ctx.fillStyle = "#b0b0c0";
				ctx.fillText("Замечаний: " + data.warnings, W / 2, cy + 322);
			} else if (kind === "ciceridisWin") {
				// как на экране финала: «Ваш ранг» + звание + число тостов.
				// Отступы считаем от числа строк звания — длинный ранг не наезжает
				const rankText = "«" + CONFIG.ciceridis.winRank + "»";
				ctx.font = pix(9);
				ctx.fillStyle = "#9a9ab0";
				ctx.fillText(CONFIG.rankLabel.toUpperCase(), W / 2, cy + 166);
				ctx.font = "700 24px system-ui, sans-serif";
				ctx.fillStyle = "#f0c040";
				let ry = cy + 198;
				for (const ln of this._wrapLines(ctx, rankText, cw - 30)) {
					ctx.fillText(ln, W / 2, ry);
					ry += 30;
				}
				ctx.font = "14px system-ui, sans-serif";
				ctx.fillStyle = "#b0b0c0";
				ctx.fillText("Тостов: " + data.toast, W / 2, ry + 10);
			} else {
				ctx.font = "19px system-ui, sans-serif";
				ctx.fillStyle = "#fff";
				let ty = cy + 158;
				for (const ln of lines) {
					ctx.fillText(ln, W / 2, ty);
					ty += 27;
				}
			}

			// логотип игры внизу карточки; у победы Чекеридиса выше —
			// чтобы не прилипал к нижней рамке-меандру
			this._drawLogo(ctx, W / 2, cy + ch - (kind === "ciceridisWin" ? 34 : 26));

			const blob = await new Promise((resolve, reject) =>
				c.toBlob((b) => b ? resolve(b) : reject(new Error("toBlob")), "image/png"));
			this.shareFile = new File([blob], "vova-result.png", { type: "image/png" });
		} catch (e) {
			// без картинки — шарим текстом; причину пишем в консоль, иначе тишина
			console.warn("Шеринг-карточка не построена:", e);
			this.shareFile = null;
		} finally {
			unlock();
		}
	},

	// Разбивка текста на строки по ширине (fillText не переносит сам)
	_wrapLines(ctx, text, maxW) {
		const out = [];
		let line = "";
		for (const w of text.split(" ")) {
			const test = line ? line + " " + w : w;
			if (ctx.measureText(test).width > maxW && line) {
				out.push(line);
				line = w;
			} else {
				line = test;
			}
		}
		if (line) out.push(line);
		return out;
	},

	// Отрисовка текста построчно
	_wrapDraw(ctx, text, x, y, maxW, lineH) {
		const lines = this._wrapLines(ctx, text, maxW);
		for (const ln of lines) {
			ctx.fillText(ln, x, y);
			y += lineH;
		}
	},

	// Логотип «one ❤ офис» пиксель-стилем, как на стартовом экране
	_drawLogo(ctx, x, y) {
		ctx.textAlign = "left";
		ctx.font = '12px "Press Start 2P", monospace';
		ctx.textBaseline = "middle";
		const w1 = ctx.measureText("one").width;
		const w2 = ctx.measureText("офис").width;
		const gap = 10, cell = 3, heartW = 7 * cell, heartH = 6 * cell;
		const total = w1 + gap + heartW + gap + w2;
		const lx = x - total / 2;
		ctx.fillStyle = "#f0c040";
		ctx.fillText("one", lx, y);
		// пиксельное сердце из битовой карты
		const bitmap = [
			"0110110",
			"1111111",
			"1111111",
			"0111110",
			"0011100",
			"0001000",
		];
		const hx = lx + w1 + gap, hy = y - heartH / 2;
		ctx.fillStyle = "#e04040";
		for (let r = 0; r < bitmap.length; r++) {
			for (let col = 0; col < 7; col++) {
				if (bitmap[r][col] === "1") {
					ctx.fillRect(hx + col * cell, hy + r * cell, cell, cell);
				}
			}
		}
		ctx.fillStyle = "#f0c040";
		ctx.fillText("офис", hx + heartW + gap, y);
		ctx.textAlign = "center";
	},

	// Плашка над объектом сцены (координаты — логические, 360×640).
	// Всплывает и тает, длительность из конфига
	// align: "center" — по центру точки (десктоп), "left"/"right" — прижата
	// к краю экрана (мобайл), независимо от позиции спрайта
	bubble(text, lx, ly, align, dur) {
		const p = Scene.toScreen(lx, ly);
		const el = document.createElement("div");
		el.className = "bubble";
		el.textContent = text;
		el.style.left = p.x + "px";
		el.style.top = p.y + "px";
		const seconds = dur || CONFIG.ui.bubbleSec;
		el.style.animationDuration = seconds + "s";
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
		setTimeout(() => el.remove(), seconds * 1000);
	},

	// Выкрик толпы: фраза в случайном месте В ПРЕДЕЛАХ ФОНА (на десктопе
	// фон уже окна — выкрики не вылетают на тёмные поля). Позиция считается
	// по измеренным размерам плашки — за края области не выезжает
	crowdShout(text) {
		const el = document.createElement("div");
		el.className = "bubble crowd";
		el.textContent = text;
		el.style.visibility = "hidden";
		this.root.appendChild(el);
		// Область фона на экране; если фон не загрузился — весь экран
		const b = Scene.bgRect;
		let area = { x: 0, y: 0, w: window.innerWidth, h: window.innerHeight };
		if (b) {
			const p0 = Scene.toScreen(b.dx, b.dy);
			const p1 = Scene.toScreen(b.dx + b.dw, b.dy + b.dh);
			area = { x: p0.x, y: p0.y, w: p1.x - p0.x, h: p1.y - p0.y };
		}
		const m = 10, gap = 6;
		el.style.maxWidth = Math.max(80, area.w - 2 * m) + "px"; // длинная фраза переносится
		const w = el.offsetWidth, h = el.offsetHeight;
		// Занятые зоны: плашки Чекеридиса (с запасом сверху — они всплывают)
		// и ещё не растаявшие выкрики толпы
		const now = Date.now();
		this.crowdRects = this.crowdRects.filter((r) => r.until > now);
		const busy = [];
		this.root.querySelectorAll(".bubble:not(.crowd)").forEach((other) => {
			const r = other.getBoundingClientRect();
			busy.push({ x: r.left, y: r.top - r.height, w: r.width, h: r.height * 2 });
		});
		this.crowdRects.forEach((r) => busy.push(r));
		// Ищем случайное место без пересечений (до 30 попыток),
		// иначе — место с наименьшим числом пересечений
		const loX = area.x + m + w / 2, hiX = area.x + area.w - m - w / 2;
		const loY = area.y + m + h / 2, hiY = area.y + area.h - m - h / 2;
		let best = { x: loX, y: loY }, bestHits = Infinity;
		for (let i = 0; i < 30; i++) {
			const cx = loX + (hiX > loX ? Math.random() * (hiX - loX) : 0);
			const cy = loY + (hiY > loY ? Math.random() * (hiY - loY) : 0);
			const r = { x: cx - w / 2 - gap, y: cy - h / 2 - gap, w: w + 2 * gap, h: h + 2 * gap };
			const hits = busy.filter((o) => r.x < o.x + o.w && r.x + r.w > o.x
				&& r.y < o.y + o.h && r.y + r.h > o.y).length;
			if (hits < bestHits) {
				bestHits = hits;
				best = { x: cx, y: cy };
			}
			if (hits === 0) break; // свободное место найдено
		}
		el.style.left = best.x + "px";
		el.style.top = best.y + "px";
		el.style.visibility = "visible";
		const seconds = CONFIG.ciceridis.crowdPhraseSec;
		el.style.animationDuration = seconds + "s";
		// Запоминаем место выкрика, пока он не растает
		this.crowdRects.push({
			x: best.x - w / 2, y: best.y - h / 2, w, h, until: now + seconds * 1000,
		});
		setTimeout(() => el.remove(), seconds * 1000);
	},

	// Плашка с текстом по словам (тост Чекеридиса): слова появляются
	// постепенно за speechSec секунд — как будто он говорит. Плашка висит
	// seconds секунд (CSS-анимация растворяет её в конце). Стиль тот же,
	// что у bubble; ширина фиксируется заранее, чтобы плашка не прыгала
	bubbleWords(text, lx, ly, align, seconds, speechSec) {
		const p = Scene.toScreen(lx, ly);
		const el = document.createElement("div");
		el.className = "bubble";
		// Сначала полный текст (скрытый) — измеряем ширину для центрирования
		el.textContent = text;
		el.style.visibility = "hidden";
		el.style.left = p.x + "px";
		el.style.top = p.y + "px";
		const total = seconds || CONFIG.ui.bubbleSec;
		el.style.animationDuration = total + "s";
		this.root.appendChild(el);
		const w = el.offsetWidth, m = 8;
		let cx;
		if (align === "left") {
			cx = m + w / 2;
		} else if (align === "right") {
			cx = window.innerWidth - m - w / 2;
		} else {
			cx = p.x;
		}
		cx = Math.min(Math.max(cx, m + w / 2), window.innerWidth - m - w / 2);
		el.style.left = cx + "px";
		el.style.boxSizing = "border-box";
		el.style.width = w + "px"; // фиксируем ширину — слова не двигают плашку
		// Слова появляются за speechSec (меньше total — успевают показаться
		// до растворения плашки). Интервал = время речи / число слов
		const words = text.split(" ");
		const speak = Math.min(speechSec || total, total * 0.8);
		const interval = (speak * 1000) / words.length;
		let shown = 0;
		el.textContent = "";
		el.style.visibility = "visible";
		const timer = setInterval(() => {
			shown += 1;
			el.textContent = words.slice(0, shown).join(" ");
			if (shown >= words.length) clearInterval(timer);
		}, interval);
		setTimeout(() => { clearInterval(timer); el.remove(); }, total * 1000);
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

	// Кнопка «Правила» под кнопкой паузы: тот же стиль панели,
	// золотой текст — заметная, но в общем стиле игры
	showRulesBtn(onRules) {
		if (this.rulesBtn) return;
		this.rulesBtn = document.createElement("div");
		this.rulesBtn.textContent = "ПРАВИЛА";
		this.rulesBtn.style.cssText = `
			position: absolute; top: 58px; right: 10px;
			display: flex; align-items: center; justify-content: center;
			height: 40px; padding: 0 10px; box-sizing: border-box;
			background: rgba(38, 38, 58, 0.85);
			border: 2px solid #4a5064; border-radius: 6px;
			color: #f0c040; font-family: var(--pixel-font); font-size: 8px;
			cursor: pointer; pointer-events: auto; z-index: 10;
		`;
		this.rulesBtn.addEventListener("pointerdown", (e) => {
			if (e.button !== 0) return;
			e.stopPropagation(); // касание кнопки не поднимает телефон
			onRules();
		});
		this.root.appendChild(this.rulesBtn);
	},

	hideRulesBtn() {
		if (this.rulesBtn) {
			this.rulesBtn.remove();
			this.rulesBtn = null;
		}
	},

	// Окно правил: игра на паузе. Закрытие — кнопка «Играть» или тап
	// вне карточки (как в меню паузы)
	showRules(rules, onClose) {
		this.rulesEl = this._overlay();
		const lines = rules.map((t) => `<p class="rules-line">${t}</p>`).join("");
		this.rulesEl.innerHTML = `
			<div class="final-card" style="max-width: 320px;">
				<p style="font-family: var(--pixel-font); font-size: 14px; color: #f0c040;
					margin: 0 0 16px; text-align: center;">ПРАВИЛА</p>
				${lines}
				<button id="rules-close" class="final-btn final-btn-again" style="margin-top: 16px;">Играть</button>
			</div>
		`;
		const close = () => {
			this.hideRules();
			onClose();
		};
		this.rulesEl.addEventListener("pointerdown", (e) => {
			if (e.button !== 0) return;
			if (e.target.closest("button")) return; // кнопка закрывает себя сама
			close();
		});
		this.rulesEl.querySelector("#rules-close").addEventListener("click", close);
	},

	hideRules() {
		if (this.rulesEl) {
			this.rulesEl.remove();
			this.rulesEl = null;
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

	// Обучение: содержимое из переданного списка правил (у каждой мини-игры свои).
	// Исчезает при первом касании — сворачивается в кнопку «ПРАВИЛА»
	showTutorial(rules) {
		// Защита: если старое окно ещё висит (вышли в меню, не закрыв обучение) — убрать
		if (this.tutorialEl) {
			this.tutorialEl.remove();
			this.tutorialEl = null;
		}
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
		const lines = rules.map((t) => `<p class="rules-line">${t}</p>`).join("");
		this.tutorialEl.innerHTML = `
			<p style="font-family: var(--pixel-font); font-size: 14px; color: #f0c040;
				margin: 0 0 12px;">ПРАВИЛА</p>
			${lines}
		`;
		this.root.appendChild(this.tutorialEl);
	},

	hideTutorial() {
		if (!this.tutorialEl) return;
		const el = this.tutorialEl;
		this.tutorialEl = null;
		// Куда сворачиваем: центр кнопки «ПРАВИЛА» (если её нет — правый верхний угол)
		const r = el.getBoundingClientRect();
		const cx = r.left + r.width / 2;
		const cy = r.top + r.height / 2;
		let tx = window.innerWidth - 40 - cx;
		let ty = 78 - cy;
		if (this.rulesBtn) {
			const b = this.rulesBtn.getBoundingClientRect();
			tx = b.left + b.width / 2 - cx;
			ty = b.top + b.height / 2 - cy;
		}
		// Пульс держит transform — выключаем его, иначе сворачивание не сработает
		el.style.animation = "none";
		el.style.transition = "transform 0.4s ease-in, opacity 0.4s ease-in";
		// translateX(-50%) — базовое центрирование, поверх него сдвиг к кнопке
		el.style.transform = `translateX(-50%) translate(${tx}px, ${ty}px) scale(0.05)`;
		el.style.opacity = "0";
		setTimeout(() => el.remove(), 450);
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
