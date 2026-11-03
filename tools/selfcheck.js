// Самопроверка спрайтов против конфига: читает PNG-заголовки и сверяет
// с CONFIG.sprites (размеры кадра, пропорции, границы сцены). Без зависимостей.
// Запуск: node tools/selfcheck.js
"use strict";
const fs = require("fs");
const path = require("path");

// Минимальный парсер PNG-заголовка (IHDR): width, height
function pngSize(file) {
	const buf = fs.readFileSync(file);
	if (buf.readUInt32BE(0) !== 0x89504e47) throw new Error("не PNG: " + file);
	return { w: buf.readUInt32BE(16), h: buf.readUInt32BE(20) };
}

// CONFIG парсим без eval: извлекаем только блок sprites регуляркой
function readConfig() {
	const src = fs.readFileSync("js/config.js", "utf8");
	const m = src.match(/sprites:\s*\{[\s\S]*?\n\t\},/);
	if (!m) throw new Error("блок sprites в config.js не найден");
	const s = m[0];
	const grab = (re) => { const r = s.match(re); if (!r) throw new Error("config: " + re); return +r[1]; };
	return {
		vova: {
			sheet: "assets/sprites/vova_poses.png",
			frames: 3,
			fw: grab(/vova:\s*\{[^}]*frame:\s*\{\s*w:\s*(\d+)/),
			fh: grab(/vova:[\s\S]*?frame:\s*\{[^}]*h:\s*(\d+)/),
			x: grab(/vova:[\s\S]*?pos:\s*\{\s*x:\s*(-?\d+)/),
			y: grab(/vova:[\s\S]*?pos:\s*\{[^}]*y:\s*(-?\d+)/),
			sw: grab(/vova:[\s\S]*?size:\s*\{\s*w:\s*(\d+)/),
			sh: grab(/vova:[\s\S]*?size:\s*\{[^}]*h:\s*(\d+)/),
		},
		boss: {
			sheet: "assets/sprites/boss_states.png",
			frames: 4,
			fw: grab(/boss:\s*\{[^}]*frame:\s*\{\s*w:\s*(\d+)/),
			fh: grab(/boss:[\s\S]*?frame:\s*\{[^}]*h:\s*(\d+)/),
			x: grab(/boss:[\s\S]*?pos:\s*\{\s*x:\s*(-?\d+)/),
			y: grab(/boss:[\s\S]*?pos:\s*\{[^}]*y:\s*(-?\d+)/),
			sw: grab(/boss:[\s\S]*?size:\s*\{\s*w:\s*(\d+)/),
			sh: grab(/boss:[\s\S]*?size:\s*\{[^}]*h:\s*(\d+)/),
		},
	};
}

let errors = 0;
const check = (name, cond, detail) => {
	if (cond) {
		console.log("  OK  " + name + (detail ? " — " + detail : ""));
	} else {
		console.log("  FAIL " + name + (detail ? " — " + detail : ""));
		errors++;
	}
};

const cfg = readConfig();
console.log("Самопроверка спрайтов v" + fs.readFileSync("js/config.js", "utf8").match(/version:\s*"([^"]+)"/)[1]);

for (const key of ["vova", "boss"]) {
	const c = cfg[key];
	console.log(key + ":");
	let size;
	try { size = pngSize(c.sheet); } catch (e) { check(key + " файл существует", false, e.message); continue; }
	check(key + " файл загружается", true, size.w + "x" + size.h);
	// Кадры: лист = frame.w * frames, frame.h = высота листа
	check(key + " ширина листа = кадр × " + c.frames, size.w === c.fw * c.frames,
		"ожидалось " + (c.fw * c.frames) + ", факт " + size.w);
	check(key + " высота листа = frame.h", size.h === c.fh,
		"ожидалось " + c.fh + ", факт " + size.h);
	// Пропорции: size на сцене должно сохранять пропорцию кадра (допуск 2%)
	const frameRatio = c.fw / c.fh;
	const sceneRatio = c.sw / c.sh;
	check(key + " пропорции кадра/сцены совпадают", Math.abs(frameRatio - sceneRatio) / frameRatio < 0.02,
		"кадр " + frameRatio.toFixed(3) + ", сцена " + sceneRatio.toFixed(3));
	// Границы сцены 360×640
	check(key + " внутри сцены по X", c.x >= 0 && c.x + c.sw <= 360, "x=" + c.x + " w=" + c.sw);
	check(key + " низ на полу y=478", c.y + c.sh === 478, "y=" + c.y + " h=" + c.sh + " низ=" + (c.y + c.sh));
}

// Размер файла: веб-лимиты
for (const key of ["vova", "boss"]) {
	const kb = Math.round(fs.statSync(cfg[key].sheet).size / 1024);
	check(key + " размер файла < 1200 KB", kb < 1200, kb + " KB");
}

if (errors) {
	console.log("\nПРОВАЛЕНО: " + errors + " ошибок");
	process.exit(1);
}
console.log("\nВСЕ ПРОВЕРКИ ПРОЙДЕНЫ");
