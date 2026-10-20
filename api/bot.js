// api/bot.js — perantara situs ke bot WhatsApp yang berjalan di panel. Env: BOT_URL (mis. http://IP:PORT) dan BOT_KEY (sama dengan di panel).
const L = require("./_lib"), URL_ = (process.env.BOT_URL || "").replace(/\/$/, ""), KEY = process.env.BOT_KEY || "";
module.exports = async (req, res) => {
  const out = (c, o) => { res.statusCode = c; res.setHeader("Content-Type", "application/json"); res.setHeader("Cache-Control", "no-store"); res.end(JSON.stringify(o)); };
  if (req.method !== "POST") return out(405, { ok: false, error: "Metode tidak didukung" });
  const A = await L.requireRole(req); if (!A.user) return out(A.code || 401, { ok: false, error: "Login dulu" });
  let b = req.body; if (typeof b === "string") { try { b = JSON.parse(b); } catch (e) { b = null; } } b = b || {};
  if (b.action === "diag") { // khusus owner: tampilkan apakah variabel terbaca dan apakah panel bisa dihubungi dari Vercel
    if (A.user.role !== "owner") return out(403, { ok: false, error: "Khusus owner" });
    const d = { ok: true, urlSet: !!URL_, keySet: !!KEY, urlHost: null, env: process.env.VERCEL_ENV || "tidak diketahui", health: null };
    if (URL_) { try { d.urlHost = new URL(URL_).host; const r = await fetch(URL_ + "/health", { signal: AbortSignal.timeout(8000) }); d.health = r.status + " " + (await r.text()).slice(0, 120); } catch (e) { d.health = "GAGAL dihubungi: " + e.message; } }
    return out(200, d);
  }
  if (!URL_ && !KEY) return out(503, { ok: false, error: "BOT_URL dan BOT_KEY belum terbaca di server ini. Tambahkan di Vercel (project yang menjalankan situs ini), centang Production, lalu Redeploy." });
  if (!URL_) return out(503, { ok: false, error: "BOT_URL belum terbaca di server (BOT_KEY sudah). Periksa nama variabelnya dan Redeploy." });
  if (!KEY) return out(503, { ok: false, error: "BOT_KEY belum terbaca di server (BOT_URL sudah). Periksa nama variabelnya dan Redeploy." });
  let n = String(b.number || "").replace(/\D/g, ""); if (n.startsWith("0")) n = "62" + n.slice(1); else if (n.startsWith("8")) n = "62" + n;
  const who = "user=" + encodeURIComponent(A.user.username) + "&admin=" + (A.user.role === "owner" ? "1" : "0"), admin = A.user.role === "owner";
  const call = async (path, method, body) => { const r = await fetch(URL_ + path, { method, headers: { "x-bot-key": KEY, "content-type": "application/json" }, body: body ? JSON.stringify(body) : undefined, signal: AbortSignal.timeout(25000) }); let j = {}; try { j = await r.json(); } catch (e) {} return out(r.ok ? 200 : (r.status >= 400 && r.status < 600 ? r.status : 502), r.ok ? j : { ok: false, error: j.error || "Bot menolak permintaan" }); };
  try {
    if (b.action === "pair") { if (!/^\d{9,15}$/.test(n)) return out(400, { ok: false, error: "Nomor tidak valid. Pakai format 08xxx atau 628xxx" }); return await call("/pair", "POST", { number: n, user: A.user.username, admin }); }
    if (b.action === "status") return await call("/status?number=" + n + "&" + who, "GET");
    if (b.action === "list") return await call("/list?" + who, "GET");
    if (b.action === "logout") return await call("/logout", "POST", { number: n, user: A.user.username, admin });
    out(400, { ok: false, error: "Aksi tidak dikenal" });
  } catch (e) { out(502, { ok: false, error: "Bot di panel tidak bisa dihubungi. Pastikan panel menyala dan BOT_URL benar." }); }
};
