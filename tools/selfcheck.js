// Самопроверка спрайтов против конфига: читает PNG-заголовки и сверяет
// с CONFIG.sprites (размеры кадров, якорные доли fx/fy/hFrac). Без зависимостей.
// Запуск: node tools/selfcheck.js
"use strict";
const fs = require("fs");

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
			fx: grab(/vova:[\s\S]*?fx:\s*([\d.]+)/),
			fy: grab(/vova:[\s\S]*?fy:\s*([\d.]+)/),
			hFrac: grab(/vova:[\s\S]*?hFrac:\s*([\d.]+)/),
		},
		boss: {
			sheet: "assets/sprites/boss_states.png",
			frames: 4,
			fw: grab(/boss:\s*\{[^}]*frame:\s*\{\s*w:\s*(\d+)/),
			fh: grab(/boss:[\s\S]*?frame:\s*\{[^}]*h:\s*(\d+)/),
			fx: grab(/boss:[\s\S]*?fx:\s*([\d.]+)/),
			fy: grab(/boss:[\s\S]*?fy:\s*([\d.]+)/),
			hFrac: grab(/boss:[\s\S]*?hFrac:\s*([\d.]+)/),
		},
		// Чекеридис: стопы берутся из CONFIG.ciceridis.standFy — fx/fy нет
		ciceridis: {
			sheet: "assets/sprites/chekeridis_states.png",
			frames: 5,
			fw: grab(/ciceridis:\s*\{[^}]*frame:\s*\{\s*w:\s*(\d+)/),
			fh: grab(/ciceridis:[\s\S]*?frame:\s*\{[^}]*h:\s*(\d+)/),
			fx: null,
			fy: null,
			hFrac: grab(/ciceridis:[\s\S]*?hFrac:\s*([\d.]+)/),
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
console.log("Самопроверка спрайтов " + fs.readFileSync("js/config.js", "utf8").match(/version:\s*"([^"]+)"/)[1]);

for (const key of ["vova", "boss", "ciceridis"]) {
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
	// Якорные доли в диапазоне (0..1) — у ciceridis их нет (стопы из standFy)
	if (c.fx != null) check(key + " fx в (0..1)", c.fx > 0 && c.fx < 1, "fx=" + c.fx);
	if (c.fy != null) check(key + " fy в (0..1)", c.fy > 0 && c.fy < 1, "fy=" + c.fy);
	check(key + " hFrac в (0..1)", c.hFrac > 0 && c.hFrac < 1, "hFrac=" + c.hFrac);
	// Размер файла: веб-лимиты
	const kb = Math.round(fs.statSync(c.sheet).size / 1024);
	check(key + " размер файла < 1200 KB", kb < 1200, kb + " KB");
}

// Фон: существует и не слишком тяжёлый
{
	const kb = Math.round(fs.statSync("assets/sprites/bg_office.png").size / 1024);
	check("bg размер файла < 900 KB", kb < 900, kb + " KB");
}

if (errors) {
	console.log("\nПРОВАЛЕНО: " + errors + " ошибок");
	process.exit(1);
}
console.log("\nВСЕ ПРОВЕРКИ ПРОЙДЕНЫ");
