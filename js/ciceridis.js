// Мини-игра «Цицеридис»: Чекеридис стоит на барной стойке с бокалом.
// Стул и залезание убраны (решение автора) — стоит на стойке с самого начала
// Этап 5 — первый тост: текст 5 с + очень медленное качание ±10°
// Этап 6 — управление: тап/зажатие половин экрана толкает его (ТЗ §3.2)
const Ciceridis = {
	phase: "intro",    // intro | toast | drink | joy | nextToast | fall | win
	introT: 0,         // сколько секунд идёт стартовая пауза (стоит ровно)
	toastT: 0,         // сколько секунд идёт тост
	drinkT: 0,         // сколько секунд идёт «выпивает бокал»
	joyT: 0,           // сколько секунд идёт радость
	nextT: 0,          // сколько секунд висит «Ещё тост!»
	fallT: 0,          // сколько секунд длится падение (анимация)
	fallDir: 1,        // в какую сторону упал: 1 вправо, -1 влево
	introFired: false,      // стартовую плашку показал? (ставит main.js)
	toastStartFired: false, // плашку с тостом показал? (ставит main.js)
	drinkStartFired: false, // плашку «буль-буль-буль» показал? (ставит main.js)
	nextToastFired: false,  // плашку «Ещё тост!» показал? (ставит main.js)
	toastNum: 1,       // номер текущего тоста (для карточки поражения)
	plan: [],          // тексты тостов этого забега, план[0] — тост 1-го раунда
	crowdTimes: [],    // моменты выкриков от начала «буль-буль», сек
	crowdIdx: 0,       // индекс следующего выкрика в crowdTimes
	crowdT: 0,         // секунд с начала пары сцен (сверяется с crowdTimes)
	crowdPending: null, // фраза для показа — покажет main.js через UI.crowdShout
	lastCrowd: "",     // последняя фраза — чтобы не повторять подряд

	// Физика качания (этап 6): угол игрока + самокачание
	playerAngle: 0,    // физический угол наклона, градусы (минус = влево)
	angVel: 0,         // угловая скорость, градусы/сек
	driftDir: 1,       // сторона начального наклона раунда: 1 вправо, -1 влево
	// «Пьяный фон» (крен комнаты, чисто визуал — читает Scene)
	bgPhase1: 0,       // фаза основной гармоники крена, рад (интегрируется)
	bgPhase2: 1.3,     // фаза второй гармоники, рад (сдвиг, чтобы пики не совпадали)
	bgHarm2Mix: 0,     // плавное включение второй гармоники, 0..1
	bgRollAmp: 0,      // сглаженная амплитуда крена фона, град
	bgRollDeg: 0,      // текущий крен фона, град
	gustT: 0,          // секунд с последнего случайного толчка
	nextGustSec: 0,    // через сколько секунд следующий толчок
	ghostT: 0,         // секунд с начала текущего двойника (0 = нет двойника)
	nextGhostSec: 0,   // через сколько секунд следующий двойник
	ghostChainLeft: 0, // сколько появлений осталось в цепочке (0 = цепочки нет)

	reset() {
		this.phase = "intro"; // стартовая пауза: стоит ровно, потом первый тост
		this.introT = 0;
		this.introFired = false;
		this.toastT = 0;
		this.toastStartFired = false;
		this.drinkStartFired = false;
		this.nextToastFired = false;
		this.toastNum = 1;
		this.crowdTimes = [];
		this.crowdIdx = 0;
		this.crowdT = 0;
		this.crowdPending = null;
		this.lastCrowd = "";
		this.playerAngle = 0; // раунд 1 без самопадения — стоит ровно
		this.angVel = 0;
		this.driftDir = Math.random() < 0.5 ? -1 : 1;
		this.gustT = 0;
		this.nextGustSec = 0;
		this.ghostT = 0;
		this.nextGhostSec = 0;
		this.ghostChainLeft = 0;
		this.fallT = 0;
		this.fallDir = 1;
		this.bgPhase1 = 0; // крен фона начинается с нуля
		this.bgPhase2 = 1.3;
		this.bgHarm2Mix = 0;
		this.bgRollAmp = 0;
		this.bgRollDeg = 0;
		this.plan = this._buildPlan();
	},

	// Прогресс падения 0..1 — для анимации в Scene
	fallProgress() {
		return Math.min(1, this.fallT / CONFIG.ciceridis.fallSec);
	},

	// «Пьяный фон» (помехи ТЗ §5): крен комнаты вокруг точки опоры, град.
	// Чисто визуал: физику Чекеридиса не трогает, ноги остаются на стойке.
	// Амплитуда растёт с раундом, период падает; амплитуда сглаживается,
	// чтобы между раундами не было скачков. С bgSwayHarm2FromRound добавлена
	// вторая гармоника — движение менее предсказуемое
	_updateBgSway(dt) {
		const c = CONFIG.ciceridis;
		const n = Math.max(0, this.toastNum - c.bgSwayFromRound);
		const target = this.toastNum >= c.bgSwayFromRound
			? c.bgSwayAmp0Deg + c.bgSwayAmpStepDeg * n : 0;
		this.bgRollAmp += (target - this.bgRollAmp)
			* Math.min(1, c.bgSwaySmoothRate * dt); // догоняет цель без скачков
		// Фазы интегрируются сами, а не считаются от абсолютного времени:
		// смена периода и амплитуды между раундами не даёт скачков угла
		if (this.bgRollAmp >= 0.01) {
			const period = Math.max(2, c.bgSwayPeriod0Sec + c.bgSwayPeriodStepSec * n);
			this.bgPhase1 += 2 * Math.PI * dt / period;
			this.bgPhase2 += 2 * Math.PI * dt / (period / c.bgSwayHarm2PeriodDiv);
		}
		// вторая гармоника включается плавно (иначе на своём раунде дёргает)
		const mixTarget = this.toastNum >= c.bgSwayHarm2FromRound ? 1 : 0;
		this.bgHarm2Mix += (mixTarget - this.bgHarm2Mix)
			* Math.min(1, c.bgSwaySmoothRate * dt);
		// нормируем сумму гармоник, чтобы пик крена = амплитуде раунда
		let roll = Math.sin(this.bgPhase1)
			+ c.bgSwayHarm2AmpMul * this.bgHarm2Mix * Math.sin(this.bgPhase2);
		roll /= 1 + c.bgSwayHarm2AmpMul * this.bgHarm2Mix;
		this.bgRollDeg = this.bgRollAmp * roll;
	},

	// План тостов на забег (ТЗ §6): раунды 1–3 — из early, 4–6 — из mid,
	// 7–10 — из late. Пул перемешивается — повторов в забеге нет
	_buildPlan() {
		const pools = CONFIG.ciceridis.toastPools;
		// Фишер-Йетс: перемешать копию пула и взять первые count
		const take = (pool, count) => {
			const copy = pool.slice();
			for (let i = copy.length - 1; i > 0; i--) {
				const j = Math.floor(Math.random() * (i + 1));
				[copy[i], copy[j]] = [copy[j], copy[i]];
			}
			return copy.slice(0, count);
		};
		return [
			...take(pools.early, 3),
			...take(pools.mid, 3),
			...take(pools.late, 4),
		];
	},

	// Текст тоста текущего раунда (для плашки и карточки поражения)
	currentToast() {
		return this.plan[this.toastNum - 1] || "";
	},

	// Линейная интерполяция параметра сложности по раундам (ТЗ §5):
	// раунд 1 — значения Start, раунд 10 — значения End
	_diff(start, end) {
		const t = Math.min(1, (this.toastNum - 1) / (CONFIG.ciceridis.totalRounds - 1));
		return start + (end - start) * t;
	},

	// Амплитуда качания текущего раунда
	swayAmp() {
		return this._diff(CONFIG.ciceridis.swayAmpDeg, CONFIG.ciceridis.swayAmpEnd);
	},

	// Период качания текущего раунда (меньше = быстрее)
	swayPeriod() {
		return this._diff(CONFIG.ciceridis.swayPeriodSec, CONFIG.ciceridis.swayPeriodEnd);
	},

	// Доля пути по раундам самопадения: 0 в раунде selfFallFromRound, 1 в 10-м
	_selfFallT() {
		const c = CONFIG.ciceridis;
		return Math.max(0, Math.min(1,
			(this.toastNum - c.selfFallFromRound) / (c.totalRounds - c.selfFallFromRound)));
	},

	// Нестабильность равновесия раунда, 1/сек²: наклон сам усиливается — чем
	// сильнее завалился, тем быстрее падает (как стоять на одной ноге).
	// Сложность растёт РАВНОМЕРНО по λ (скорость экспоненциального роста наклона):
	// в раунде 2 падение без вмешательства за selfFallSecStart, в 10-м — за selfFallSecEnd
	tiltAccel() {
		const c = CONFIG.ciceridis;
		if (this.toastNum < c.selfFallFromRound) return 0;
		const ratio = Math.log(c.fallAngleDeg / c.startLeanDeg);
		const lamStart = ratio / c.selfFallSecStart;
		const lamEnd = ratio / c.selfFallSecEnd;
		const lam = lamStart + (lamEnd - lamStart) * this._selfFallT();
		// λ² + λ·damping — компенсация гашения, чтобы рост был именно λ
		return lam * lam + lam * c.dampingRate;
	},

	// Длительность тоста раунда: 1–3 — toastSec, 4–6 — toastSec46, 7–10 — toastSec710
	toastDuration() {
		const c = CONFIG.ciceridis;
		if (this.toastNum <= 3) return c.toastSec;
		if (this.toastNum <= 6) return c.toastSec46;
		return c.toastSec710;
	},

	// Случайные толчки: сила растёт по раундам самопадения, сторона случайная —
	// не дают спасать одним заученным ритмом тапов
	gustImpulse() {
		const c = CONFIG.ciceridis;
		return c.gustImpulseStart + (c.gustImpulseEnd - c.gustImpulseStart) * this._selfFallT();
	},

	// Интервал до следующего толчка, сек (разброс ±30% вокруг среднего)
	gustInterval() {
		const c = CONFIG.ciceridis;
		const avg = c.gustEverySecStart +
			(c.gustEverySecEnd - c.gustEverySecStart) * this._selfFallT();
		return avg * (0.7 + Math.random() * 0.6);
	},

	// Длительность речи текущего раунда (больше = медленнее говорит)
	speechDuration() {
		return this._diff(CONFIG.ciceridis.speechSec, CONFIG.ciceridis.speechSecEnd);
	},

	// Физический угол: дрожь + наклон игрока (в него накоплен самонаклон).
	// По нему считается и отрисовка, и падение
	physicsAngle() {
		// в падении угол заморожен: toastT и playerAngle не меняются
		if (this.phase !== "toast" && this.phase !== "fall") return 0;
		const self = Math.sin(this.toastT / this.swayPeriod() * Math.PI * 2) * this.swayAmp();
		return self + this.playerAngle;
	},

	// Сколько появлений в цепочке для текущего раунда: 6-7 — два подряд,
	// 8+ — три подряд, раньше — одно
	ghostChainCount() {
		const c = CONFIG.ciceridis;
		if (this.toastNum >= c.ghostChainFromRound3) return 3;
		if (this.toastNum >= c.ghostChainFromRound2) return 2;
		return 1;
	},

	// Длительность одного появления двойника, сек
	ghostDuration() {
		return CONFIG.ciceridis.ghostSec;
	},

	// Двойник (раунды blurFromRound+): 0..1 — сила расхождения призраков,
	// 0 = призраков нет. Синус: расходятся и плавно сходятся обратно
	ghostPower() {
		const dur = this.ghostDuration();
		if (this.ghostT <= 0 || this.ghostT >= dur) return 0;
		return Math.sin(this.ghostT / dur * Math.PI);
	},

	// Интервал до следующего двойника, сек (разброс ±30%)
	ghostInterval() {
		const c = CONFIG.ciceridis;
		const t = Math.max(0, Math.min(1,
			(this.toastNum - c.blurFromRound) / (c.totalRounds - c.blurFromRound)));
		const avg = c.ghostEverySecStart + (c.ghostEverySecEnd - c.ghostEverySecStart) * t;
		return avg * (0.7 + Math.random() * 0.6);
	},

	// Итоговый угол для отрисовки и падения
	swayAngle() {
		return this.physicsAngle();
	},

	// «Трудовая» поза: наклон между tiltPoseFromDeg и порогом падения —
	// под неё автор нарисует отдельный спрайт
	isTiltPose() {
		if (this.phase !== "toast") return false;
		const c = CONFIG.ciceridis;
		const a = Math.abs(this.swayAngle());
		return a >= c.tiltPoseFromDeg && a < c.tiltPoseToDeg;
	},

	// Одиночный тап = мгновенный импульс в сторону тапа (ТЗ §3.2).
	// Быстрые потапывания складываются сами: каждый тап добавляет скорость —
	// чем чаще стучишь, тем сильнее суммарный толчок
	applyTap(side) {
		const c = CONFIG.ciceridis;
		this.angVel += side === "left" ? -c.tapImpulseDeg : c.tapImpulseDeg;
	},

	// Нейтральные сцены (выпивание, радость, «Ещё тост!»):
	// ввод игнорируется — иначе накопленные тапы выстреливают в новом раунде
	ignoreInput() {
		return this.phase !== "toast" ||
			this.toastT < CONFIG.ciceridis.inputDelaySec;
	},

	// Сброс накопленных тапов (вызывается, когда ввод игнорируется)
	discardTaps() {
		Input.tapLeft = false;
		Input.tapRight = false;
	},

	update(dt) {
		// «Пьяный фон»: фазы крена интегрируются непрерывно (и в падении —
		// комната не замирает скачком), на физику не влияет
		this._updateBgSway(dt);
		if (this.phase === "fall") { // падение: крутится анимация, физика стоит
			this.fallT += dt;
			return;
		}

		const c = CONFIG.ciceridis;

		// Стартовая пауза: стоит ровно на столе, качания и ввода нет
		if (this.phase === "intro") {
			this.introT += dt;
			this.discardTaps();
			if (this.introT >= c.introSec) {
				this.phase = "toast";
				this.toastT = 0;
			}
			return;
		}

		// Первые inputDelaySec тоста ввод игнорируется (решение автора:
		// реакция на игрока начинается с задержкой после нейтральных сцен)
		if (this.ignoreInput()) {
			this.discardTaps();
		}

		// Тапы: потребляю флаги ввода (их ставит Input при pointerdown)
		if (Input.tapLeft) { this.applyTap("left"); Input.tapLeft = false; }
		if (Input.tapRight) { this.applyTap("right"); Input.tapRight = false; }

		// Зажатие половины = непрерывная сила (меняется ускорение, не скорость).
		// Обе половины сразу — силы взаимно гасятся (ТЗ §3.2)
		let hold = 0;
		if (Input.rightHeld && !this.ignoreInput()) hold += 1;
		if (Input.leftHeld && !this.ignoreInput()) hold -= 1;
		this.angVel += hold * c.holdAccelDeg * dt;

		// Гашение: без удержания качание плавно затухает (демпфирование)
		this.angVel *= Math.exp(-c.dampingRate * dt);

		if (this.phase === "toast") {
			// Нестабильность (ТЗ §5): наклон сам усиливается — игрок ловит равновесие
			this.angVel += this.tiltAccel() * this.playerAngle * dt;
			// Случайные толчки в случайные стороны
			this.gustT += dt;
			if (this.gustT >= this.nextGustSec) {
				this.gustT = 0;
				this.nextGustSec = this.gustInterval();
				this.angVel += (Math.random() < 0.5 ? -1 : 1) * this.gustImpulse();
			}
			// Двойник (раунды blurFromRound+): таймер эффекта, физику не трогает.
			// С 6-го раунда одиночный двойник срабатывает 2 раза подряд,
			// с 8-го — 3 раза подряд (пауза между появлениями ghostChainGapSec)
			if (this.toastNum >= c.blurFromRound) {
				if (this.ghostT > 0) {
					this.ghostT += dt;
					if (this.ghostT >= this.ghostDuration()) {
						// появление кончилось: в цепочке сразу следующее, без паузы
						this.ghostT = 0;
						if (this.ghostChainLeft > 0) {
							this.ghostChainLeft -= 1;
							this.ghostT = 0.0001;
						}
					}
				} else {
					this.nextGhostSec -= dt;
					if (this.nextGhostSec <= 0) {
						this.ghostT = 0.0001; // старт двойника
						this.ghostChainLeft = this.ghostChainCount() - 1;
						this.nextGhostSec = this.ghostInterval();
					}
				}
			}
		}

		// Интегрирование угла через delta time — скорость не зависит от FPS
		this.playerAngle += this.angVel * dt;

		// Падение: угол (дрожь + игрок + самонаклон) превысил порог — свалился
		const totalAngle = this.physicsAngle();
		if (Math.abs(totalAngle) >= c.fallAngleDeg) {
			this.phase = "fall";
			this.fallT = 0;
			this.fallDir = totalAngle >= 0 ? 1 : -1;
		}

		// Цикл раундов (ТЗ §3.1.6): тост → выпил → радость → «Ещё тост!» → тост
		if (this.phase === "toast") {
			this.toastT += dt;
			if (this.toastT >= this.toastDuration()) {
				this.phase = "drink";
				this.drinkT = 0;
				this.drinkStartFired = false; // плашка «буль-буль-буль» — заново каждый раунд
				this.playerAngle = 0; // между раундами стоит ровно
				this.angVel = 0;
				// Новая пара сцен «буль-буль» + «Ещё тост!» — новое расписание
				this._startCrowd();
			}
		} else if (this.phase === "drink") {
			this.drinkT += dt;
			this.discardTaps(); // тапы во время нейтральных сцен не копятся
			if (this.drinkT >= c.drinkSec) {
				this.phase = "joy";
				this.joyT = 0;
			}
		} else if (this.phase === "joy") {
			this.joyT += dt;
			this.discardTaps();
			if (this.joyT >= c.joySec) {
				if (this.toastNum >= c.totalRounds) {
					this.phase = "win"; // все 10 тостов пройдены — победа (ТЗ §4.3)
				} else {
					this.phase = "nextToast";
					this.nextT = 0;
					this.nextToastFired = false; // плашка «Ещё тост!» — заново каждый раунд
				}
			}
		} else if (this.phase === "nextToast") {
			this.nextT += dt;
			this.discardTaps();
			if (this.nextT >= c.nextToastSec) {
				this.phase = "toast";
				this.toastT = 0;
				this.toastNum += 1;
				this.toastStartFired = false; // новый тост — новая плашка
				// Новый раунд: случайная сторона начального наклона + расписание толчков
				this.driftDir = Math.random() < 0.5 ? -1 : 1;
				this.playerAngle = this.toastNum >= c.selfFallFromRound
					? this.driftDir * c.startLeanDeg : 0;
				this.angVel = 0;
				this.gustT = 0;
				this.nextGustSec = this.gustInterval();
				this.ghostT = 0;
				this.ghostChainLeft = 0;
				this.nextGhostSec = this.ghostInterval();
			}
		} else if (this.phase === "win") {
			// победа: карточку покажет main.js
		}

		// Выкрики толпы: только в сценах «буль-буль-буль» и «Ещё тост!»
		if (this.phase === "drink" || this.phase === "nextToast") {
			this.crowdT += dt;
			if (this.crowdIdx < this.crowdTimes.length
				&& this.crowdT >= this.crowdTimes[this.crowdIdx]) {
				const phrase = this.crowdPhrase();
				if (phrase) {
					this.crowdPending = phrase; // покажет main.js
					this.crowdIdx++;
				}
			}
		}
	},

	// Расписание выкриков на пару сцен: первая фраза — сразу с начала
	// «буль-буль», последняя — за crowdEndGapSec до конца «Ещё тост!»,
	// остальные — случайно между ними
	_startCrowd() {
		const c = CONFIG.ciceridis;
		const end = Math.max(0, c.drinkSec + c.nextToastSec - c.crowdEndGapSec);
		this.crowdTimes = [0];
		for (let i = 2; i < c.crowdMaxPerRound; i++) {
			this.crowdTimes.push(end * (0.35 + Math.random() * 0.3)); // середина окна
		}
		if (c.crowdMaxPerRound >= 2) {
			this.crowdTimes.push(end);
		}
		this.crowdIdx = 0;
		this.crowdT = 0;
	},

	// Случайная фраза толпы. Пара сцен после тоста N открывает раунд N+1 —
	// пул берём по нему (первое «буль-буль» после 1-го тоста — это раунд 2)
	crowdPhrase() {
		const c = CONFIG.ciceridis;
		const n = Math.min(this.toastNum + 1, c.totalRounds);
		const p = c.crowdPhrases;
		const pool = n <= 3 ? p.rounds23 : n <= 6 ? p.rounds46 : p.rounds710;
		if (!pool || !pool.length) return null;
		let phrase = pool[Math.floor(Math.random() * pool.length)];
		if (phrase === this.lastCrowd && pool.length > 1) { // без повторов подряд
			phrase = pool[(pool.indexOf(phrase) + 1) % pool.length];
		}
		this.lastCrowd = phrase;
		return phrase;
	},
};
