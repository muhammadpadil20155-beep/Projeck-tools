// api/online.js — pengguna aktif (heartbeat) dan riwayat 35 menit untuk grafik beranda. Tabel: supabase-semua.sql
const L = require("./_lib"), enc = encodeURIComponent;
module.exports = async (req, res) => {
  const out = (c, o) => { res.statusCode = c; res.setHeader("Content-Type", "application/json"); res.setHeader("Cache-Control", "no-store"); res.end(JSON.stringify(o)); };
  if (req.method !== "POST") return out(405, { ok: false, error: "Metode tidak didukung" });
  const A = await L.requireRole(req); if (!A.user) return out(A.code || 401, { ok: false, error: "Login dulu" });
  let b = req.body; if (typeof b === "string") { try { b = JSON.parse(b); } catch (e) { b = null; } }
  const sid = b && /^[a-z0-9]{8,40}$/.test(b.sid || "") ? b.sid : null; if (!sid) return out(400, { ok: false, error: "sid tidak valid" });
  const now = Date.now(), iso = t => new Date(t).toISOString();
  try {
    const up = await L.sb("presence?on_conflict=sid", "POST", { sid, seen: iso(now) }, "resolution=merge-duplicates,return=minimal");
    if (!up.ok) return out(503, { ok: false, error: "Jalankan supabase-semua.sql di Supabase dulu" });
    const r = await L.sb("presence?select=sid&seen=gte." + enc(iso(now - 60000)) + "&limit=5000"), n = r.ok ? (await r.json()).length : 1;
    const l = await L.sb("online_stats?select=ts&order=ts.desc&limit=1"), last = l.ok ? (await l.json())[0] : null;
    if (!last || now - new Date(last.ts).getTime() > 25000) {
      await L.sb("online_stats", "POST", { n }, "return=minimal");
      if (Math.random() < 0.1) { await L.sb("presence?seen=lt." + enc(iso(now - 6e5)), "DELETE"); await L.sb("online_stats?ts=lt." + enc(iso(now - 2 * 864e5)), "DELETE"); }
    }
    const s = await L.sb("online_stats?select=ts,n&ts=gte." + enc(iso(now - 36 * 60000)) + "&order=ts.asc&limit=300");
    out(200, { ok: true, now: n, series: s.ok ? await s.json() : [] });
  } catch (e) { out(500, { ok: false, error: "Gagal memuat data aktif" }); }
};
