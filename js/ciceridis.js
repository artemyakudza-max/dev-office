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
	crowdLeft: 0,      // сколько выкриков толпы осталось в этой паре сцен
	crowdT: 0,         // секунд до следующего выкрика толпы
	crowdPending: null, // фраза для показа — покажет main.js через UI.crowdShout
	lastCrowd: "",     // последняя фраза — чтобы не повторять подряд

	// Физика качания (этап 6): угол игрока + самокачание
	playerAngle: 0,    // угол от толчков игрока, градусы (минус = влево)
	angVel: 0,         // угловая скорость, градусы/сек

	reset() {
		this.phase = "intro"; // стартовая пауза: стоит ровно, потом первый тост
		this.introT = 0;
		this.introFired = false;
		this.toastT = 0;
		this.toastStartFired = false;
		this.drinkStartFired = false;
		this.nextToastFired = false;
		this.toastNum = 1;
		this.crowdLeft = 0;
		this.crowdT = 0;
		this.crowdPending = null;
		this.lastCrowd = "";
		this.playerAngle = 0;
		this.angVel = 0;
		this.fallT = 0;
		this.fallDir = 1;
		this.plan = this._buildPlan();
	},

	// Прогресс падения 0..1 — для анимации в Scene
	fallProgress() {
		return Math.min(1, this.fallT / CONFIG.ciceridis.fallSec);
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

	// Длительность речи текущего раунда (больше = медленнее говорит)
	speechDuration() {
		return this._diff(CONFIG.ciceridis.speechSec, CONFIG.ciceridis.speechSecEnd);
	},

	// Итоговый угол в градусах для отрисовки: самокачание + толчки игрока.
	// Качается только во время тоста; между раундами стоит ровно
	swayAngle() {
		// в падении угол заморожен: toastT и playerAngle не меняются
		if (this.phase !== "toast" && this.phase !== "fall") return 0;
		const c = CONFIG.ciceridis;
		// Раунды без самопадения: самокачание упирается в cap — стоит с наклоном,
		// свалить может только тап/зажим игрока
		const amp = c.noSelfFallRounds.includes(this.toastNum)
			? Math.min(this.swayAmp(), c.selfFallCapDeg)
			: this.swayAmp();
		const self = Math.sin(this.toastT / this.swayPeriod() * Math.PI * 2) * amp;
		return self + this.playerAngle;
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

		// Интегрирование угла через delta time — скорость не зависит от FPS
		this.playerAngle += this.angVel * dt;

		// Падение: ОБЩИЙ наклон (самокачание + игрок) превысил порог — свалился.
		// В поздних раундах самокачание само превышает порог (ТЗ §5)
		const totalAngle = this.swayAngle();
		if (Math.abs(totalAngle) >= c.fallAngleDeg) {
			this.phase = "fall";
			this.fallT = 0;
			this.fallDir = totalAngle >= 0 ? 1 : -1;
		}

		// Цикл раундов (ТЗ §3.1.6): тост → выпил → радость → «Ещё тост!» → тост
		if (this.phase === "toast") {
			this.toastT += dt;
			if (this.toastT >= c.toastSec) {
				this.phase = "drink";
				this.drinkT = 0;
				this.drinkStartFired = false; // плашка «буль-буль-буль» — заново каждый раунд
				this.playerAngle = 0; // между раундами стоит ровно
				this.angVel = 0;
				// Новая пара сцен «буль-буль» + «Ещё тост!» — новый лимит выкриков
				this.crowdLeft = c.crowdMaxPerRound;
				this.crowdT = this.crowdDelay();
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
			}
		} else if (this.phase === "win") {
			// победа: карточку покажет main.js
		}

		// Выкрики толпы: только в сценах «буль-буль-буль» и «Ещё тост!»
		if (this.phase === "drink" || this.phase === "nextToast") {
			this.crowdT -= dt;
			if (this.crowdT <= 0 && this.crowdLeft > 0) {
				const phrase = this.crowdPhrase();
				if (phrase) {
					this.crowdLeft--;
					this.crowdT = this.crowdDelay();
					this.crowdPending = phrase; // покажет main.js
				}
			}
		}
	},

	// Пауза до следующего выкрика толпы, сек — случайная между min и max
	crowdDelay() {
		const c = CONFIG.ciceridis;
		return c.crowdMinDelaySec
			+ Math.random() * (c.crowdMaxDelaySec - c.crowdMinDelaySec);
	},

	// Случайная фраза толпы для текущего раунда (1-й раунд — тишина)
	crowdPhrase() {
		if (this.toastNum < 2) return null;
		const p = CONFIG.ciceridis.crowdPhrases;
		const pool = this.toastNum <= 3 ? p.rounds23
			: this.toastNum <= 6 ? p.rounds46 : p.rounds710;
		if (!pool || !pool.length) return null;
		let phrase = pool[Math.floor(Math.random() * pool.length)];
		if (phrase === this.lastCrowd && pool.length > 1) { // без повторов подряд
			phrase = pool[(pool.indexOf(phrase) + 1) % pool.length];
		}
		this.lastCrowd = phrase;
		return phrase;
	},
};
