// api/_core.js — logika semua tools Secretly (dipakai situs lewat /api/tools dan oleh bot WhatsApp). Tanpa dependensi, Node 18+.
"use strict";
const crypto = require("crypto");
const UA = "SecretlyTools/1.6 (+https://vercel.com)";
const S = v => (v === undefined || v === null) ? "" : String(v).trim();
const num = (v, d = NaN) => { let s = S(v).replace(/\s/g, ""); if (!s) return d; if (/^-?\d{1,3}(\.\d{3})+(,\d+)?$/.test(s)) s = s.replace(/\./g, "").replace(",", "."); else s = s.replace(",", "."); const n = Number(s); return Number.isFinite(n) ? n : d; };
const f = (n, d = 2) => Number(n).toLocaleString("id-ID", { maximumFractionDigits: d });
const rp = n => "Rp " + Math.round(n).toLocaleString("id-ID");
const err = m => { throw Object.assign(new Error(m), { user: true }); };
const rint = (a, b) => crypto.randomInt(a, b + 1);
const HARI = ["Minggu", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"], BLN = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"];

async function jget(url, o = {}) {
  const r = await fetch(url, { headers: { "user-agent": UA, accept: o.text ? "text/plain,*/*" : "application/json", ...(o.h || {}) }, signal: AbortSignal.timeout(o.t || 9000), redirect: "follow" });
  if (!r.ok) throw new Error("HTTP " + r.status);
  return o.text ? (await r.text()).trim() : r.json();
}
async function first(fns) { let last; for (const fn of fns) { try { const v = await fn(); if (v) return v; } catch (e) { if (e.user) throw e; last = e; } } throw last || new Error("kosong"); }
const net = async (label, fn) => { try { return await fn(); } catch (e) { if (e.user) throw e; throw Object.assign(new Error("Layanan " + label + " sedang tidak bisa dihubungi. Coba lagi sebentar."), { user: true }); } };

/* ===== tools lokal ===== */
const mkd = (y, m, d) => { const t = new Date(Date.UTC(y, m - 1, d)); return t.getUTCFullYear() === y && t.getUTCMonth() === m - 1 && t.getUTCDate() === d ? t : null; };
function pdate(s) { s = S(s); let m; if ((m = s.match(/^(\d{4})[-\/.](\d{1,2})[-\/.](\d{1,2})$/))) return mkd(+m[1], +m[2], +m[3]); if ((m = s.match(/^(\d{1,2})[-\/.](\d{1,2})[-\/.](\d{4})$/))) return mkd(+m[3], +m[2], +m[1]); return null; }
const today = () => { const t = new Date(Date.now() + 7 * 36e5); return new Date(Date.UTC(t.getUTCFullYear(), t.getUTCMonth(), t.getUTCDate())); };
const dstr = d => `${HARI[d.getUTCDay()]}, ${d.getUTCDate()} ${BLN[d.getUTCMonth()]} ${d.getUTCFullYear()}`;
function umur(a) {
  const b = pdate(a.tgl); if (!b) err("Format tanggal lahir salah. Contoh: 17-05-2008 atau 2008-05-17");
  const e = S(a.sampai) ? pdate(a.sampai) : today(); if (!e) err("Format tanggal 'sampai' salah");
  if (e < b) err("Tanggal lahir tidak boleh setelah tanggal 'sampai'");
  let y = e.getUTCFullYear() - b.getUTCFullYear(), m = e.getUTCMonth() - b.getUTCMonth(), d = e.getUTCDate() - b.getUTCDate();
  if (d < 0) { m--; d += new Date(Date.UTC(e.getUTCFullYear(), e.getUTCMonth(), 0)).getUTCDate(); }
  if (m < 0) { y--; m += 12; }
  const days = Math.round((e - b) / 864e5);
  let nx = new Date(Date.UTC(e.getUTCFullYear(), b.getUTCMonth(), b.getUTCDate())); if (nx < e) nx = new Date(Date.UTC(e.getUTCFullYear() + 1, b.getUTCMonth(), b.getUTCDate()));
  return `Lahir: ${dstr(b)}\nUmur: ${y} tahun ${m} bulan ${d} hari\nTotal: ${f(days, 0)} hari (${f(days / 7, 0)} minggu)\nUlang tahun berikutnya: ${dstr(nx)} (${Math.round((nx - e) / 864e5)} hari lagi)`;
}

const UN = { panjang: { mm: .001, cm: .01, m: 1, km: 1000, inci: .0254, inch: .0254, ft: .3048, kaki: .3048, yard: .9144, mil: 1609.344, mile: 1609.344 },
  berat: { mg: 1e-6, g: .001, gram: .001, kg: 1, ton: 1000, oz: .028349523, lb: .45359237, pon: .45359237 },
  volume: { ml: .001, l: 1, liter: 1, gal: 3.785411784, galon: 3.785411784, cup: .2365882365 },
  data: { b: 1, byte: 1, kb: 1024, mb: 1048576, gb: 1073741824, tb: 1099511627776 },
  luas: { m2: 1, km2: 1e6, ha: 1e4, are: 100, acre: 4046.8564224 },
  waktu: { detik: 1, s: 1, menit: 60, jam: 3600, hari: 86400, minggu: 604800 },
  kecepatan: { "m/s": 1, mps: 1, "km/jam": 1 / 3.6, kmh: 1 / 3.6, mph: .44704, knot: .514444444 } };
const TA = { c: "c", celsius: "c", f: "f", fahrenheit: "f", k: "k", kelvin: "k" }, TIN = { c: x => x, f: x => (x - 32) * 5 / 9, k: x => x - 273.15 }, TOUT = { c: x => x, f: x => x * 9 / 5 + 32, k: x => x + 273.15 };
function satuan(a) {
  const lst = () => Object.entries(UN).map(([k, v]) => k + ": " + Object.keys(v).join(", ")).join("\n") + "\nsuhu: c, f, k";
  if (!S(a.nilai) || S(a.nilai).toLowerCase() === "daftar") return "Satuan yang didukung:\n" + lst();
  const v = num(a.nilai); if (!Number.isFinite(v)) err("Nilai harus berupa angka");
  const fr = S(a.dari).toLowerCase().replace("°", ""), to = S(a.ke).toLowerCase().replace("°", "");
  if (TA[fr] && TA[to]) return `${f(v, 6)} °${TA[fr].toUpperCase()} = ${f(TOUT[TA[to]](TIN[TA[fr]](v)), 4)} °${TA[to].toUpperCase()}`;
  for (const k in UN) if (fr in UN[k] && to in UN[k]) return `${f(v, 6)} ${fr} = ${f(v * UN[k][fr] / UN[k][to], 8)} ${to}`;
  err("Satuan tidak cocok atau tidak dikenal.\n" + lst());
}

const FS = [["Bold", 0x1D400, 0x1D41A, 0x1D7CE], ["Italic Bold", 0x1D468, 0x1D482, 0x1D7CE], ["Sans Italic", 0x1D608, 0x1D622], ["Mono", 0x1D670, 0x1D68A, 0x1D7F6], ["Script Bold", 0x1D4D0, 0x1D4EA, 0x1D7CE], ["Fraktur Bold", 0x1D56C, 0x1D586, 0x1D7CE], ["Double", 0x1D538, 0x1D552, 0x1D7D8], ["Fullwidth", 0xFF21, 0xFF41, 0xFF10]];
const DBL = { C: "ℂ", H: "ℍ", N: "ℕ", P: "ℙ", Q: "ℚ", R: "ℝ", Z: "ℤ" }, SC = "ᴀʙᴄᴅᴇꜰɢʜɪᴊᴋʟᴍɴᴏᴘǫʀsᴛᴜᴠᴡxʏᴢ";
function fancy(a) {
  const t = S(a.teks); if (!t) err("Tulis teks yang mau diubah");
  if ([...t].length > 60) err("Maksimal 60 karakter");
  const out = FS.map(([n, U, l, dg]) => n + ": " + [...t].map(ch => { const c = ch.charCodeAt(0);
    if (c >= 65 && c <= 90) return n === "Double" && DBL[ch] ? DBL[ch] : String.fromCodePoint(U + c - 65);
    if (c >= 97 && c <= 122) return String.fromCodePoint(l + c - 97);
    if (dg && c >= 48 && c <= 57) return String.fromCodePoint(dg + c - 48); return ch; }).join(""));
  out.push("Bulat: " + [...t].map(ch => { const c = ch.charCodeAt(0); return c >= 65 && c <= 90 ? String.fromCodePoint(0x24B6 + c - 65) : c >= 97 && c <= 122 ? String.fromCodePoint(0x24D0 + c - 97) : c >= 49 && c <= 57 ? String.fromCodePoint(0x2460 + c - 49) : ch; }).join(""));
  out.push("Small Caps: " + [...t].map(ch => { const c = ch.toLowerCase().charCodeAt(0); return c >= 97 && c <= 122 ? SC[c - 97] : ch; }).join(""));
  return out.join("\n");
}

function kata(a) {
  const t = String(a.teks || ""); if (!t.trim()) err("Tempel teks dulu");
  const w = t.toLowerCase().match(/[\p{L}\p{N}']+/gu) || [], fr = {}; w.filter(x => x.length > 2).forEach(x => fr[x] = (fr[x] || 0) + 1);
  const top = Object.entries(fr).sort((x, y) => y[1] - x[1]).slice(0, 5).map(([k, v]) => k + " (" + v + ")").join(", ") || "-";
  return `Karakter: ${f(t.length, 0)}\nTanpa spasi: ${f(t.replace(/\s/g, "").length, 0)}\nKata: ${f(w.length, 0)}\nKalimat: ${(t.match(/[^.!?]+[.!?]+|[^.!?]+$/g) || []).filter(x => x.trim()).length}\nParagraf: ${t.split(/\n\s*\n/).filter(x => x.trim()).length}\nWaktu baca: ± ${Math.max(1, Math.round(w.length / 200))} menit\nKata terbanyak: ${top}`;
}

function untung(a) {
  const modal = num(a.modal), qty = num(a.qty, 1), disk = num(a.diskon, 0), fee = num(a.fee, 0), tgt = num(a.target);
  if (!(modal >= 0)) err("Isi harga modal per unit");
  if (!(qty >= 1) || !(disk >= 0 && disk < 100) || !(fee >= 0 && fee < 100)) err("Jumlah minimal 1, diskon dan fee harus 0-99%");
  let jual = num(a.jual);
  if (!Number.isFinite(jual)) { if (!Number.isFinite(tgt)) err("Isi harga jual, atau isi target untung (%) untuk menghitung harga jual"); jual = modal * (1 + tgt / 100) / (1 - fee / 100) / (1 - disk / 100); }
  const net = jual * (1 - disk / 100) * (1 - fee / 100), u = net - modal;
  return `Modal/unit: ${rp(modal)}\nHarga jual: ${rp(jual)}${disk ? "\nSetelah diskon " + disk + "%: " + rp(jual * (1 - disk / 100)) : ""}${fee ? "\nDiterima setelah fee " + fee + "%: " + rp(net) : ""}\nUntung/unit: ${rp(u)} (${modal ? f(u / modal * 100, 1) + "% dari modal" : "-"})\nJumlah ${f(qty, 0)} unit → total modal ${rp(modal * qty)}, total untung ${rp(u * qty)}${u < 0 ? "\n⚠ RUGI, harga jual terlalu rendah" : ""}`;
}

function bersih(a) {
  const t = String(a.teks || ""); if (!t.trim()) err("Tempel teks dulu"); const L = t.split(/\r?\n/), m = S(a.mode) || "dedupe";
  const cmp = (x, y) => x.localeCompare(y, "id");
  const M = { dedupe: () => [...new Set(L)].join("\n"), az: () => L.slice().sort(cmp).join("\n"), za: () => L.slice().sort(cmp).reverse().join("\n"), besar: () => t.toUpperCase(), kecil: () => t.toLowerCase(),
    judul: () => t.toLowerCase().replace(/(^|\s)(\p{L})/gu, (_, s, c) => s + c.toUpperCase()), rapikan: () => L.map(x => x.trim().replace(/\s+/g, " ")).join("\n"),
    balik: () => L.slice().reverse().join("\n"), nomor: () => L.filter(x => x.trim()).map((x, i) => (i + 1) + ". " + x).join("\n"), kosong: () => L.filter(x => x.trim()).join("\n") };
  if (!M[m]) err("Mode tidak dikenal"); return M[m]();
}

function hsl2rgb(h, s, l) { s /= 100; l /= 100; const k = n => (n + h / 30) % 12, A = s * Math.min(l, 1 - l), g = n => l - A * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1))); return [0, 8, 4].map(n => Math.round(g(n) * 255)); }
function rgb2hsl(r, g, b) { r /= 255; g /= 255; b /= 255; const mx = Math.max(r, g, b), mn = Math.min(r, g, b), l = (mx + mn) / 2, d = mx - mn; let h = 0, s = 0;
  if (d) { s = d / (1 - Math.abs(2 * l - 1)); h = mx === r ? ((g - b) / d + (g < b ? 6 : 0)) : mx === g ? (b - r) / d + 2 : (r - g) / d + 4; h *= 60; } return [Math.round(h) % 360, Math.round(s * 100), Math.round(l * 100)]; }
const hex = c => "#" + c.map(x => x.toString(16).padStart(2, "0")).join("").toUpperCase();
function pcolor(s) { s = S(s).toLowerCase(); let m; const NM = { merah: [255, 0, 0], hijau: [0, 128, 0], biru: [0, 0, 255], kuning: [255, 255, 0], hitam: [0, 0, 0], putih: [255, 255, 255], oranye: [255, 165, 0], ungu: [128, 0, 128], pink: [255, 192, 203], abu: [128, 128, 128] };
  if (NM[s]) return NM[s]; if ((m = s.match(/^#([0-9a-f]{3})$/))) return m[1].split("").map(c => parseInt(c + c, 16)); if ((m = s.match(/^#?([0-9a-f]{6})$/))) return [0, 2, 4].map(i => parseInt(m[1].substr(i, 2), 16));
  if ((m = s.match(/^(?:rgb\()?\s*(\d{1,3})\s*[, ]\s*(\d{1,3})\s*[, ]\s*(\d{1,3})\s*\)?$/))) { const v = [+m[1], +m[2], +m[3]]; return v.every(x => x <= 255) ? v : null; }
  if ((m = s.match(/^hsl\(\s*(\d+(?:\.\d+)?)\s*[, ]\s*(\d+(?:\.\d+)?)%?\s*[, ]\s*(\d+(?:\.\d+)?)%?\s*\)$/))) return hsl2rgb(+m[1], +m[2], +m[3]); return null; }
function warna(a) {
  const c = pcolor(a.warna); if (!c) err("Warna tidak dikenali. Contoh: #ff3d81, 255,61,129, hsl(340,100%,62%), atau nama (merah, biru)");
  const [h, s, l] = rgb2hsl(...c), lum = (0.299 * c[0] + 0.587 * c[1] + 0.114 * c[2]) / 255, v = x => Math.max(0, Math.min(100, x));
  return `HEX: ${hex(c)}\nRGB: rgb(${c.join(", ")})\nHSL: hsl(${h}, ${s}%, ${l}%)\nKomplemen: ${hex(hsl2rgb((h + 180) % 360, s, l))}\nLebih terang: ${hex(hsl2rgb(h, s, v(l + 15)))}\nLebih gelap: ${hex(hsl2rgb(h, s, v(l - 15)))}\nTeks di atasnya paling jelas: ${lum > .55 ? "hitam" : "putih"}`;
}

function acak(a) {
  const m = S(a.mode) || "angka", isi = S(a.isi), items = () => isi.split(/[\n,|]+/).map(x => x.trim()).filter(Boolean);
  if (m === "koin") return "🪙 " + (rint(0, 1) ? "Angka" : "Gambar");
  if (m === "angka") { const p = isi.match(/^(-?\d+)\s*[-, ]\s*(-?\d+)$/) || ["", "1", "100"]; let lo = +p[1], hi = +p[2]; if (lo > hi) [lo, hi] = [hi, lo]; if (hi - lo > 1e12) err("Rentang terlalu besar"); return "🎲 " + rint(lo, hi) + " (dari " + lo + " sampai " + hi + ")"; }
  if (m === "dadu") { const p = (isi || "1d6").toLowerCase().match(/^(\d{1,2})d(\d{1,4})$/); if (!p || +p[1] < 1 || +p[1] > 20 || +p[2] < 2) err("Format dadu: 2d6 (maks 20 dadu, sisi 2-9999)"); const r = Array.from({ length: +p[1] }, () => rint(1, +p[2])); return "🎲 " + r.join(" + ") + (r.length > 1 ? " = " + r.reduce((x, y) => x + y) : ""); }
  const it = items(); if (it.length < 2) err("Isi minimal 2 pilihan, pisahkan dengan koma atau baris baru");
  const sh = x => { x = x.slice(); for (let i = x.length - 1; i > 0; i--) { const j = rint(0, i); [x[i], x[j]] = [x[j], x[i]]; } return x; };
  if (m === "pilih") return "👉 " + it[rint(0, it.length - 1)];
  if (m === "urut") return sh(it).map((x, i) => (i + 1) + ". " + x).join("\n");
  if (m === "undi") { const n = Math.max(1, Math.min(it.length, parseInt(a.n, 10) || 1)); return "🏆 Pemenang:\n" + sh(it).slice(0, n).map((x, i) => (i + 1) + ". " + x).join("\n"); }
  err("Mode tidak dikenal");
}

const MO = { A: ".-", B: "-...", C: "-.-.", D: "-..", E: ".", F: "..-.", G: "--.", H: "....", I: "..", J: ".---", K: "-.-", L: ".-..", M: "--", N: "-.", O: "---", P: ".--.", Q: "--.-", R: ".-.", S: "...", T: "-", U: "..-", V: "...-", W: ".--", X: "-..-", Y: "-.--", Z: "--..", 0: "-----", 1: ".----", 2: "..---", 3: "...--", 4: "....-", 5: ".....", 6: "-....", 7: "--...", 8: "---..", 9: "----.", ".": ".-.-.-", ",": "--..--", "?": "..--..", "!": "-.-.--", "/": "-..-.", "@": ".--.-.", "-": "-....-" };
const OM = Object.fromEntries(Object.entries(MO).map(([k, v]) => [v, k]));
function kode(a) {
  const t = String(a.teks || ""), m = S(a.mode) || "morse"; if (!t.trim()) err("Isi teks dulu");
  const B = { morse: () => t.toUpperCase().split(/\s+/).map(w => [...w].map(c => MO[c] || "").filter(Boolean).join(" ")).join(" / "), demorse: () => t.trim().split(/\s*\/\s*|\s{3,}/).map(w => w.split(/\s+/).map(c => OM[c] || "?").join("")).join(" "),
    biner: () => [...Buffer.from(t, "utf8")].map(x => x.toString(2).padStart(8, "0")).join(" "), debiner: () => { const p = t.trim().split(/\s+/); if (!p.every(x => /^[01]{8}$/.test(x))) throw new Error("x"); return Buffer.from(p.map(x => parseInt(x, 2))).toString("utf8"); },
    hex: () => [...Buffer.from(t, "utf8")].map(x => x.toString(16).padStart(2, "0")).join(" "), dehex: () => { const p = t.replace(/\s+/g, ""); if (!/^([0-9a-fA-F]{2})+$/.test(p)) throw new Error("x"); return Buffer.from(p, "hex").toString("utf8"); },
    b64: () => Buffer.from(t, "utf8").toString("base64"), deb64: () => { if (!/^[A-Za-z0-9+/_-]+=*$/.test(t.replace(/\s/g, ""))) throw new Error("x"); return Buffer.from(t.replace(/\s/g, ""), "base64").toString("utf8"); },
    rot13: () => t.replace(/[a-z]/gi, c => String.fromCharCode((c <= "Z" ? 90 : 122) >= (c = c.charCodeAt(0) + 13) ? c : c - 26)), balik: () => [...t].reverse().join("") };
  if (!B[m]) err("Mode tidak dikenal"); try { return B[m](); } catch (e) { err("Teks tidak valid untuk mode ini"); }
}

const ZN = [["WIB", "Asia/Jakarta"], ["WITA", "Asia/Makassar"], ["WIT", "Asia/Jayapura"], ["UTC", "UTC"], ["Singapura", "Asia/Singapore"], ["Tokyo", "Asia/Tokyo"], ["Dubai", "Asia/Dubai"], ["London", "Europe/London"], ["New York", "America/New_York"]];
const inz = (d, z) => new Intl.DateTimeFormat("id-ID", { timeZone: z, weekday: "long", day: "numeric", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false }).format(d);
function waktu(a) {
  const s = S(a.isi); let d;
  if (!s) d = new Date(); else if (/^\d{13}$/.test(s)) d = new Date(+s); else if (/^\d{9,10}$/.test(s)) d = new Date(+s * 1000);
  else { const m = s.match(/^(\S+?)(?:[ T](\d{1,2}):(\d{2})(?::(\d{2}))?)?$/), dt = m && pdate(m[1]); if (!dt) err("Isi kosong (sekarang), timestamp (10 atau 13 digit), atau tanggal: 17-05-2026 14:30 (dianggap WIB)"); d = new Date(dt.getTime() + ((+m[2] || 0) * 3600 + (+m[3] || 0) * 60 + (+m[4] || 0)) * 1000 - 7 * 36e5); }
  if (isNaN(d)) err("Waktu tidak valid");
  return `Unix: ${Math.floor(d / 1000)} (detik) / ${d.getTime()} (milidetik)\nISO: ${d.toISOString()}\n` + ZN.map(([n, z]) => n + ": " + inz(d, z)).join("\n");
}

function calc(src) {
  const s = S(src).toLowerCase().replace(/×/g, "*").replace(/÷/g, "/").replace(/,/g, ".").replace(/\s+/g, ""); let i = 0; const bad = m => { throw Object.assign(new Error(m), { user: true }); };
  const FN = { sqrt: Math.sqrt, abs: Math.abs, sin: x => Math.sin(x * Math.PI / 180), cos: x => Math.cos(x * Math.PI / 180), tan: x => Math.tan(x * Math.PI / 180), log: Math.log10, ln: Math.log, round: Math.round, floor: Math.floor, ceil: Math.ceil }, CS = { pi: Math.PI, e: Math.E };
  const expr = () => { let v = term(); while (s[i] === "+" || s[i] === "-") { const o = s[i++], r = term(); v = o === "+" ? v + r : v - r; } return v; };
  const term = () => { let v = pw(); while (s[i] === "*" || s[i] === "/" || s[i] === "%") { const o = s[i++], r = pw(); v = o === "*" ? v * r : o === "/" ? v / r : v % r; } return v; };
  const pw = () => { const v = un(); if (s[i] === "^") { i++; return Math.pow(v, pw()); } return v; };
  const un = () => { if (s[i] === "-") { i++; return -un(); } if (s[i] === "+") { i++; return un(); } return at(); };
  const at = () => { if (s[i] === "(") { i++; const v = expr(); if (s[i] !== ")") bad("Kurung belum ditutup"); i++; return v; }
    let m = /^\d+(\.\d+)?/.exec(s.slice(i)); if (m) { i += m[0].length; let v = parseFloat(m[0]); if (s[i] === "%" && !/[\d(a-z]/.test(s[i + 1] || "")) { i++; v /= 100; } return v; }
    m = /^[a-z]+/.exec(s.slice(i)); if (m) { i += m[0].length; if (m[0] in CS) return CS[m[0]]; if (FN[m[0]] && s[i] === "(") { i++; const v = expr(); if (s[i] !== ")") bad("Kurung belum ditutup"); i++; return FN[m[0]](v); } }
    bad("Ekspresi tidak dikenali. Contoh: (12+8)*3/4, 2^10, sqrt(144), 15% dari tidak didukung: pakai 200*15%"); };
  if (!s) bad("Tulis ekspresi dulu"); const v = expr(); if (i < s.length) bad("Ada bagian ekspresi yang tidak dikenali"); if (!Number.isFinite(v)) bad("Hasil tidak valid (bagi nol?)"); return v;
}
const hitung = a => { const v = calc(a.expr); return S(a.expr) + " = " + f(v, 10); };

/* ===== tools API (tanpa kunci) ===== */
const WMO = { 0: "Cerah", 1: "Cerah berawan", 2: "Berawan sebagian", 3: "Berawan", 45: "Berkabut", 48: "Kabut beku", 51: "Gerimis ringan", 53: "Gerimis", 55: "Gerimis lebat", 61: "Hujan ringan", 63: "Hujan", 65: "Hujan lebat", 71: "Salju ringan", 73: "Salju", 75: "Salju lebat", 80: "Hujan lokal ringan", 81: "Hujan lokal", 82: "Hujan lokal lebat", 95: "Badai petir", 96: "Badai petir + es", 99: "Badai petir + es lebat" };
const cuaca = a => net("cuaca", async () => {
  const q = S(a.kota); if (!q) err("Isi nama kota");
  const g = await jget("https://geocoding-api.open-meteo.com/v1/search?count=1&language=id&format=json&name=" + encodeURIComponent(q.split(",")[0].trim())), p = g.results && g.results[0]; if (!p) err("Kota '" + q + "' tidak ditemukan");
  const w = await jget(`https://api.open-meteo.com/v1/forecast?latitude=${p.latitude}&longitude=${p.longitude}&current=temperature_2m,relative_humidity_2m,apparent_temperature,weather_code,wind_speed_10m&daily=temperature_2m_max,temperature_2m_min,precipitation_probability_max&timezone=auto&forecast_days=3`), c = w.current, d = w.daily;
  const days = d.time.map((t, i) => { const dt = new Date(t + "T00:00:00Z"); return `${HARI[dt.getUTCDay()]} ${dt.getUTCDate()} ${BLN[dt.getUTCMonth()].slice(0, 3)}: ${Math.round(d.temperature_2m_min[i])}–${Math.round(d.temperature_2m_max[i])}°C, hujan ${d.precipitation_probability_max[i] ?? 0}%`; });
  return `📍 ${[p.name, p.admin1, p.country].filter(Boolean).join(", ")}\n🌡️ ${Math.round(c.temperature_2m)}°C (terasa ${Math.round(c.apparent_temperature)}°C) · ${WMO[c.weather_code] || "—"}\n💧 Kelembapan ${c.relative_humidity_2m}% · 💨 Angin ${Math.round(c.wind_speed_10m)} km/jam\n\nPrakiraan:\n${days.join("\n")}`;
});

const kurs = a => net("kurs", async () => {
  const amt = num(a.jumlah, 1), fr = S(a.dari || "USD").toUpperCase(), to = S(a.ke || "IDR").toUpperCase();
  if (!(amt > 0) || !/^[A-Z]{3}$/.test(fr) || !/^[A-Z]{3}$/.test(to)) err("Contoh: jumlah 100, dari USD, ke IDR (kode 3 huruf)");
  if (fr === to) return `${f(amt)} ${fr} = ${f(amt)} ${to}`;
  const r = await first([async () => { const j = await jget(`https://api.frankfurter.app/latest?amount=${amt}&from=${fr}&to=${to}`); return j.rates && j.rates[to] ? { v: j.rates[to], d: j.date } : null; },
    async () => { const j = await jget(`https://api.frankfurter.dev/v1/latest?base=${fr}&symbols=${to}`); return j.rates && j.rates[to] ? { v: j.rates[to] * amt, d: j.date } : null; },
    async () => { const j = await jget("https://open.er-api.com/v6/latest/" + fr); return j.rates && j.rates[to] ? { v: j.rates[to] * amt, d: String(j.time_last_update_utc || "").slice(5, 16) } : null; }]).catch(() => null);
  if (!r) err("Kurs " + fr + "→" + to + " tidak tersedia. Pastikan kode mata uang benar (mis. USD, EUR, SGD, JPY).");
  return `💱 ${f(amt)} ${fr} = ${f(r.v, 4)} ${to}\n1 ${fr} = ${f(r.v / amt, 6)} ${to}\nData: ${r.d}`;
});

const CG = { btc: "bitcoin", eth: "ethereum", bnb: "binancecoin", sol: "solana", doge: "dogecoin", xrp: "ripple", ada: "cardano", usdt: "tether", ton: "the-open-network", trx: "tron", dot: "polkadot", ltc: "litecoin", shib: "shiba-inu", matic: "matic-network", avax: "avalanche-2", link: "chainlink" };
const crypto_ = a => net("harga crypto", async () => {
  const k = S(a.koin || "btc").toLowerCase().replace(/[^a-z0-9-]/g, ""); if (!k) err("Isi nama atau simbol koin, mis. btc, eth, sol"); const id = CG[k] || k;
  const r = await first([async () => { const j = await jget(`https://api.coingecko.com/api/v3/simple/price?ids=${id}&vs_currencies=usd,idr&include_24hr_change=true`), c = j[id]; return c && c.usd != null ? { usd: c.usd, idr: c.idr, ch: c.usd_24h_change } : null; },
    async () => { const sym = (Object.entries(CG).find(([, v]) => v === id) || [id])[0].toUpperCase(), j = await jget("https://data-api.binance.vision/api/v3/ticker/24hr?symbol=" + sym + "USDT"); return j.lastPrice ? { usd: +j.lastPrice, idr: null, ch: +j.priceChangePercent } : null; }]).catch(() => null);
  if (!r) err("Koin '" + k + "' tidak ditemukan atau layanan harga sedang penuh. Coba simbol seperti btc, eth, sol.");
  const ch = r.ch == null ? "" : `\n${r.ch >= 0 ? "📈" : "📉"} 24 jam: ${r.ch >= 0 ? "+" : ""}${f(r.ch, 2)}%`;
  return `🪙 ${id.toUpperCase()}\nUSD: $${f(r.usd, r.usd < 1 ? 6 : 2)}${r.idr ? "\nIDR: " + rp(r.idr) : ""}${ch}`;
});

const sholat = a => net("jadwal sholat", async () => {
  const p = S(a.kota || "Jakarta").split(","), city = p[0].trim(), country = (p[1] || "Indonesia").trim(); if (!city) err("Isi nama kota");
  const j = await jget(`https://api.aladhan.com/v1/timingsByCity?city=${encodeURIComponent(city)}&country=${encodeURIComponent(country)}${/indonesia/i.test(country) ? "&method=20" : ""}`);
  if (!j.data || !j.data.timings) err("Kota '" + city + "' tidak ditemukan"); const t = j.data.timings, c = x => String(x).slice(0, 5);
  return `🕌 Jadwal sholat ${city}${/indonesia/i.test(country) ? "" : ", " + country}\n📅 ${j.data.date.readable}\nImsak: ${c(t.Imsak)}\nSubuh: ${c(t.Fajr)}\nTerbit: ${c(t.Sunrise)}\nDzuhur: ${c(t.Dhuhr)}\nAshar: ${c(t.Asr)}\nMaghrib: ${c(t.Maghrib)}\nIsya: ${c(t.Isha)}\n(Waktu setempat, metode Kemenag RI untuk Indonesia)`;
});

const wiki = a => net("Wikipedia", async () => {
  const q = S(a.kata); if (!q) err("Isi kata yang dicari"); const H = { "Api-User-Agent": UA };
  const os = await jget("https://id.wikipedia.org/w/api.php?action=opensearch&limit=1&format=json&search=" + encodeURIComponent(q), { h: H });
  let title = os[1] && os[1][0], lang = "id";
  if (!title) { const en = await jget("https://en.wikipedia.org/w/api.php?action=opensearch&limit=1&format=json&search=" + encodeURIComponent(q), { h: H }); title = en[1] && en[1][0]; lang = "en"; }
  if (!title) err("Tidak ada artikel untuk '" + q + "'");
  const s = await jget(`https://${lang}.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(title)}`, { h: H });
  return `📖 ${s.title}${lang === "en" ? " (Inggris)" : ""}\n\n${s.extract || "Tidak ada ringkasan."}\n\n🔗 ${s.content_urls && s.content_urls.desktop ? s.content_urls.desktop.page : ""}`;
});

const translate = a => net("terjemahan", async () => {
  const t = S(a.teks), to = S(a.ke || "id").toLowerCase(); if (!t) err("Isi teks yang mau diterjemahkan"); if (t.length > 480) err("Maksimal 480 karakter"); if (!/^[a-z]{2}(-[a-z]{2})?$/.test(to)) err("Kode bahasa 2 huruf, mis. id, en, ja, ar, ko, es");
  const r = await first([async () => { const j = await jget(`https://api.mymemory.translated.net/get?q=${encodeURIComponent(t)}&langpair=Autodetect|${to}`); const x = j.responseData && j.responseData.translatedText; return x && j.responseStatus == 200 && !/MYMEMORY WARNING/i.test(x) ? x : null; },
    async () => { const j = await jget(`https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=${to}&dt=t&q=${encodeURIComponent(t)}`); return Array.isArray(j[0]) ? j[0].map(x => x[0]).join("") : null; }]).catch(() => null);
  if (!r) err("Terjemahan gagal. Coba lagi atau persingkat teks."); return `🌐 → ${to}\n${r}`;
});

const ip = a => net("info IP", async () => {
  const q = S(a.ip) || S(a._ip); if (q && !/^[0-9a-f:.]{3,45}$/i.test(q)) err("Format IP tidak valid");
  const r = await first([async () => { const j = await jget("https://ipwho.is/" + q); return j.success ? { ip: j.ip, c: j.city, rg: j.region, co: j.country, isp: j.connection && (j.connection.isp || j.connection.org), tz: j.timezone && j.timezone.id, lat: j.latitude, lon: j.longitude } : null; },
    async () => { const j = await jget("http://ip-api.com/json/" + q); return j.status === "success" ? { ip: j.query, c: j.city, rg: j.regionName, co: j.country, isp: j.isp, tz: j.timezone, lat: j.lat, lon: j.lon } : null; }]).catch(() => null);
  if (!r) err("IP tidak ditemukan atau layanan sedang sibuk");
  return `🌐 IP: ${r.ip}\n📍 ${[r.c, r.rg, r.co].filter(Boolean).join(", ")}\n🏢 ISP: ${r.isp || "-"}\n🕒 Zona: ${r.tz || "-"}\n🧭 Koordinat: ${r.lat}, ${r.lon}`;
});

const short = a => net("pemendek link", async () => {
  const u = S(a.url); if (!/^https?:\/\/[^\s]+\.[^\s]+$/i.test(u)) err("Masukkan URL lengkap yang diawali http:// atau https://");
  const r = await first([() => jget("https://tinyurl.com/api-create.php?url=" + encodeURIComponent(u), { text: true }), () => jget("https://is.gd/create.php?format=simple&url=" + encodeURIComponent(u), { text: true }), () => jget("https://v.gd/create.php?format=simple&url=" + encodeURIComponent(u), { text: true })]).catch(() => null);
  if (!r || !/^https?:\/\//.test(r)) err("Gagal memendekkan link. Coba lagi."); return r;
});

const kamus = a => net("kamus", async () => {
  const w = S(a.kata).toLowerCase(); if (!/^[a-z' -]{2,40}$/.test(w)) err("Isi satu kata bahasa Inggris, mis. .kamus love");
  const j = await jget("https://api.dictionaryapi.dev/api/v2/entries/en/" + encodeURIComponent(w)).catch(() => null); if (!Array.isArray(j) || !j[0]) err("Kata '" + w + "' tidak ditemukan");
  return `📚 ${j[0].word}${j[0].phonetic ? " " + j[0].phonetic : ""}\n` + j[0].meanings.slice(0, 3).map(m => `• ${m.partOfSpeech}: ${m.definitions[0].definition}${m.definitions[0].example ? "\n  contoh: " + m.definitions[0].example : ""}`).join("\n");
});
const github = a => net("GitHub", async () => {
  const u = S(a.user); if (!/^[a-z0-9-]{1,39}$/i.test(u)) err("Username GitHub tidak valid");
  const j = await jget("https://api.github.com/users/" + u, { h: { accept: "application/vnd.github+json" } }).catch(e => { if (/404/.test(e.message)) err("User '" + u + "' tidak ditemukan"); throw e; });
  return `🐙 ${j.name || j.login} (@${j.login})\n${j.bio || ""}\nRepo: ${j.public_repos} · Follower: ${j.followers} · Following: ${j.following}\nBergabung: ${String(j.created_at).slice(0, 10)}\n${j.html_url}`;
});

const TOOLS = { umur, satuan, fancy, kata, untung, bersih, warna, acak, kode, waktu, hitung, cuaca, kurs, crypto: crypto_, sholat, wiki, translate, ip, short, kamus, github };
async function run(tool, args) { const fn = Object.prototype.hasOwnProperty.call(TOOLS, tool) && TOOLS[tool]; if (!fn) err("Tool tidak dikenal"); return String(await fn(args || {})); }
module.exports = { run, TOOLS, calc, num, f, rp, S };
