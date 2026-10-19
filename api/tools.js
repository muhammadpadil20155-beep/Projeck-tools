// api/tools.js — menjalankan tools harian dan tools API (logika di _core.js). Wajib login, dibatasi 40 permintaan/menit per akun.
const L = require("./_lib"), C = require("./_core");
const OK = new Set(["umur", "satuan", "fancy", "kata", "untung", "bersih", "warna", "acak", "kode", "waktu", "hitung", "cuaca", "kurs", "crypto", "sholat", "wiki", "translate", "ip", "short"]);
const hits = new Map();
module.exports = async (req, res) => {
  const out = (c, o) => { res.statusCode = c; res.setHeader("Content-Type", "application/json"); res.setHeader("Cache-Control", "no-store"); res.end(JSON.stringify(o)); };
  if (req.method !== "POST") return out(405, { ok: false, error: "Metode tidak didukung" });
  const A = await L.requireRole(req); if (!A.user) return out(A.code || 401, { ok: false, error: "Login dulu" });
  const now = Date.now(), h = (hits.get(A.user.username) || []).filter(t => now - t < 60000);
  if (h.length >= 40) return out(429, { ok: false, error: "Terlalu cepat, tunggu sebentar" }); h.push(now); hits.set(A.user.username, h); if (hits.size > 2000) hits.clear();
  let b = req.body; if (typeof b === "string") { try { b = JSON.parse(b); } catch (e) { b = null; } }
  if (!b || !OK.has(b.tool)) return out(400, { ok: false, error: "Tool tidak dikenal" });
  const args = {}; for (const [k, v] of Object.entries(b.args || {})) if (typeof v === "string" || typeof v === "number") args[String(k).slice(0, 20)] = String(v).slice(0, 6000);
  args._ip = String(req.headers["x-forwarded-for"] || "").split(",")[0].trim();
  try { out(200, { ok: true, text: await C.run(b.tool, args) }); }
  catch (e) { out(e.user ? 400 : 500, { ok: false, error: e.user ? e.message : "Terjadi kesalahan pada server" }); }
};
