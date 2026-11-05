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
					<div id="vova-card" class="char-card" style="width: 112px; cursor: pointer;
						background: linear-gradient(180deg, #2c2c44, #1d1d30);
						padding: 7px;
						display: flex; flex-direction: column; box-sizing: border-box;">
						<img src="assets/characters/vova_character_select.png" alt="Вова"
							style="flex: 1; min-height: 0; width: 100%; object-fit: cover;
								image-rendering: pixelated; display: block;">
						<!-- Футер фиксированной высоты: имя и название игры на одном уровне во всех карточках -->
						<div style="flex-shrink: 0; height: 52px;">
							<p style="color: #f0c040; font-size: 10px; line-height: 12px; margin: 9px 0 0;
								font-family: var(--pixel-font);">ВОВАН</p>
							<p style="color: #8a8a9a; font-size: 10px; line-height: 13px; margin: 4px 0 0;
								font-family: var(--body-font);">Успеть за 60 секунд</p>
						</div>
					</div>
					<!-- Карточка Чекеридиса (мини-игра «Цицеридис») — стиль карточки Вовы -->
					<div id="chekeridis-card" class="char-card" style="width: 112px; cursor: pointer;
						background: linear-gradient(180deg, #2c2c44, #1d1d30);
						padding: 7px;
						display: flex; flex-direction: column; box-sizing: border-box;">
						<img id="chekeridis-img" src="assets/characters/chekeridis_character_select.png"
							alt="Чекеридис" style="flex: 1; min-height: 0; width: 100%; object-fit: cover;
								image-rendering: pixelated; display: block;">
						<span id="chekeridis-fallback" style="flex: 1; min-height: 0; display: none;
							align-items: center; justify-content: center; color: #3a3a4a;
							font-size: 22px; font-family: var(--pixel-font);">?</span>
						<div style="flex-shrink: 0; height: 52px;">
							<p style="color: #f0c040; font-size: 10px; line-height: 12px; margin: 9px 0 0;
								font-family: var(--pixel-font);">ЧЕКЕРИДИС</p>
							<p style="color: #8a8a9a; font-size: 10px; line-height: 13px; margin: 4px 0 0;
								font-family: var(--body-font);">Цицеридис</p>
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
		// Карточка Чекеридиса: пока открывает экран-заглушку мини-игры
		el.querySelector("#chekeridis-card").addEventListener("pointerdown", (e) => {
			if (e.button !== 0) return;
			window.removeEventListener("resize", this._selectFitHandler);
			el.remove();
			this.showCiceridisStub(() => this.showSelect(onStart));
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

	// Экран-заглушка мини-игры «Цицеридис» (этап 2): фон + название + кнопка «НАЗАД».
	// Настоящая сцена появится на следующих этапах
	showCiceridisStub(onBack) {
		const el = this._overlay();
		el.style.background = "#12141c";
		el.innerHTML = `
			<div id="select-scale" style="position: absolute; left: 50%; top: 50%;
				width: 360px; height: 640px; transform-origin: center;
				display: flex; flex-direction: column; align-items: center; justify-content: center;">
				<p style="font-size: 27px; color: #f0c040; margin: 0; line-height: 1.4;
					font-family: var(--pixel-font); text-shadow: 4px 4px 0 #c05050;">ЦИЦЕРИДИС</p>
				<p style="font-size: 10px; letter-spacing: 2px; color: #8a92a8;
					margin: 14px 0 0; font-family: var(--pixel-font);">МИНИ-ИГРА В РАЗРАБОТКЕ</p>
				<div id="ciceridis-back" class="char-card" style="margin-top: 40px; padding: 10px 26px;
					cursor: pointer; background: linear-gradient(180deg, #2c2c44, #1d1d30);">
					<p style="color: #f0c040; font-size: 12px; margin: 0;
						font-family: var(--pixel-font);">НАЗАД</p>
				</div>
			</div>
			<div class="crt-scanlines"></div>
			<div class="crt-vignette"></div>
		`;
		this.fitSelect(el);
		this._selectFitHandler = () => this.fitSelect(el);
		window.addEventListener("resize", this._selectFitHandler);
		el.querySelector("#ciceridis-back").addEventListener("pointerdown", (e) => {
			if (e.button !== 0) return;
			window.removeEventListener("resize", this._selectFitHandler);
			el.remove();
			onBack();
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
				im.src = CONFIG.finalPortraits[kind];
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
				: kind === "easter" ? CONFIG.easterText : null;
			const lines = bodyText ? this._wrapLines(ctx, bodyText, cw - 50) : [];
			// высота карточки растёт под длинный текст — ничего не наезжает
			const ch = kind === "win" ? 390
				: Math.max(250, 158 + lines.length * 27 + 64);

			// фон
			ctx.fillStyle = "#0d0e16";
			ctx.fillRect(0, 0, W, H);

			// карточка с рамкой-акцентом исхода (как на экране финала)
			const accent = kind === "fail" ? "#c05050" :
				kind === "easter" ? "#4a7ae0" : "#c9a227";
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
			ctx.font = pix(11);
			ctx.fillStyle = kind === "fail" ? "#e07070" : "#f0c040";
			const header = kind === "win" || kind === "easter"
				? CONFIG.winHeader : "Замечаний: " + CONFIG.warnings.max;
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
			} else {
				ctx.font = "19px system-ui, sans-serif";
				ctx.fillStyle = "#fff";
				let ty = cy + 158;
				for (const ln of lines) {
					ctx.fillText(ln, W / 2, ty);
					ty += 27;
				}
			}

			// логотип игры внизу карточки (ссылка и так идёт текстом рядом)
			this._drawLogo(ctx, W / 2, cy + ch - 26);

			const blob = await new Promise((resolve, reject) =>
				c.toBlob((b) => b ? resolve(b) : reject(new Error("toBlob")), "image/png"));
			this.shareFile = new File([blob], "vova-result.png", { type: "image/png" });
		} catch (e) {
			this.shareFile = null; // без картинки — шарим текстом
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
	showRules(onClose) {
		this.rulesEl = this._overlay();
		const lines = CONFIG.rules.map((t) => `<p class="rules-line">${t}</p>`).join("");
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

	// Обучение: то же содержимое, что в окне «Правила» (CONFIG.rules).
	// Исчезает при первом касании — сворачивается в кнопку «ПРАВИЛА»
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
		const lines = CONFIG.rules.map((t) => `<p class="rules-line">${t}</p>`).join("");
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
