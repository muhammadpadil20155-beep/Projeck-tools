// api/auth.js — login, buat akun, daftar, hapus, ganti sandi. Role: owner > reseller > member.
const L = require("./_lib"), crypto = L.crypto;
const send = (res, c, o) => { res.statusCode = c; res.setHeader("Content-Type", "application/json; charset=utf-8"); res.setHeader("Cache-Control", "no-store"); res.end(JSON.stringify(o)); };
const hash = (p, s) => crypto.scryptSync(p, s, 32).toString("hex");
const same = (a, b) => a.length === b.length && crypto.timingSafeEqual(Buffer.from(a), Buffer.from(b));
const ROLES = ["owner", "reseller", "member"], fails = new Map();
const enc = encodeURIComponent, pub = u => ({ name: u.display || u.username, role: u.role, exp: u.expires_at || null });
const expired = u => !!u.expires_at && new Date(u.expires_at).getTime() <= Date.now();
const RMAX = () => parseInt(process.env.RESELLER_MAX_DAYS, 10) || 0; // 0 = reseller bebas memilih (opsional batasi lewat env)
// days: kosong/0 = permanen, 1-3650 = hari. Hasil { days } atau { error }
function parseDays(v, me) {
  const s = v === undefined || v === null ? "" : String(v).trim(), d = s === "" ? 0 : Number(s);
  if (!Number.isInteger(d) || d < 0 || d > 3650) return { error: "Masa aktif harus angka 0-3650 hari (0 atau kosong = permanen)" };
  if (me.role === "reseller" && RMAX() && (d === 0 || d > RMAX())) return { error: "Reseller hanya boleh memberi masa aktif 1-" + RMAX() + " hari" };
  return { days: d };
}
const expIso = (days, base) => new Date((base || Date.now()) + days * 864e5).toISOString();
async function mk(name, display, pass, role, by, exp) {
  const salt = crypto.randomBytes(16).toString("hex");
  return L.sb("app_users", "POST", { username: name, display, pass_hash: hash(pass, salt), salt, role, created_by: by, ...(exp ? { expires_at: exp } : {}) }, "return=minimal");
}
module.exports = async (req, res) => {
  if (req.method !== "POST") return send(res, 405, { ok: false, error: "Metode tidak didukung" });
  if (!process.env.AUTH_SECRET || !process.env.SB_SERVICE_KEY) return send(res, 500, { ok: false, error: "Server belum dikonfigurasi (AUTH_SECRET, SB_SERVICE_KEY)" });
  let b = req.body; if (typeof b === "string") { try { b = JSON.parse(b); } catch (e) { b = null; } } b = b || {};
  try {
    if (b.action === "login") {
      const ip = L.ipHash(req), now = Date.now(), f = (fails.get(ip) || []).filter(t => now - t < 600000);
      if (f.length >= 8) return send(res, 429, { ok: false, error: "Terlalu banyak percobaan, coba lagi 10 menit lagi" });
      const name = String(b.username || "").trim().toLowerCase(), pass = String(b.password || "");
      const r = await L.sb("app_users?select=*&username=eq." + enc(name));
      if (!r.ok) return send(res, 500, { ok: false, error: "Database error. Sudah menjalankan supabase-semua.sql?" });
      let u = (await r.json())[0];
      const ownerName = (process.env.OWNER_USER || "Jefri").trim();
      if (!u && process.env.OWNER_PASS && name === ownerName.toLowerCase() && pass === process.env.OWNER_PASS) {
        const c = await (await L.sb("app_users?select=username&role=eq.owner&limit=1")).json();
        if (!c.length && (await mk(name, ownerName, pass, "owner", "system")).ok) u = (await (await L.sb("app_users?select=*&username=eq." + enc(name))).json())[0];
      }
      if (!u || !same(hash(pass, u.salt), u.pass_hash)) { f.push(now); fails.set(ip, f); await L.log({ ev: "login_fail", ip, u: name.slice(0, 20) }); return send(res, 401, { ok: false, error: "Username atau password salah" }); }
      if (expired(u)) { await L.log({ ev: "login_expired", ip, u: u.username }); return send(res, 403, { ok: false, error: "Akun sudah expired. Hubungi owner atau reseller untuk perpanjang." }); }
      await L.log({ ev: "login_ok", ip, u: u.username, role: u.role });
      return send(res, 200, { ok: true, token: L.signTok({ u: u.username, exp: Date.now() + 3 * 864e5 }), user: pub(u) });
    }
    const a = await L.requireRole(req); if (!a.user) return send(res, a.code, { ok: false, error: "Sesi habis, login lagi" });
    const me = a.user;
    if (b.action === "me") return send(res, 200, { ok: true, user: pub(me) });
    if (b.action === "create") {
      const name = String(b.username || "").trim().toLowerCase(), pass = String(b.password || ""), role = String(b.role || "member");
      if (!/^[a-z0-9_]{3,20}$/.test(name)) return send(res, 400, { ok: false, error: "Username 3-20 karakter: huruf, angka, garis bawah" });
      if (pass.length < 4 || pass.length > 60) return send(res, 400, { ok: false, error: "Password minimal 4 karakter" });
      if (!ROLES.includes(role)) return send(res, 400, { ok: false, error: "Role tidak valid" });
      if (me.role === "member" || (me.role === "reseller" && role !== "member")) return send(res, 403, { ok: false, error: "Role kamu tidak boleh membuat akun ini" });
      const pd = parseDays(b.days, me); if (pd.error) return send(res, 400, { ok: false, error: pd.error });
      const exp = pd.days ? expIso(pd.days) : null;
      const r = await mk(name, String(b.username).trim(), pass, role, me.username, exp);
      if (r.status === 409) return send(res, 409, { ok: false, error: "Username sudah dipakai" });
      if (!r.ok) return send(res, 500, { ok: false, error: exp ? "Gagal menyimpan akun. Sudah menjalankan supabase-semua.sql?" : "Gagal menyimpan akun" });
      await L.log({ ev: "user_create", by: me.username, u: name, role, days: pd.days }); return send(res, 200, { ok: true });
    }
    if (b.action === "list") {
      if (me.role === "member") return send(res, 403, { ok: false, error: "Tidak diizinkan" });
      const flt = "&order=created_at.desc&limit=300" + (me.role === "owner" ? "" : "&created_by=eq." + enc(me.username));
      let r = await L.sb("app_users?select=username,display,role,created_by,expires_at" + flt);
      if (!r.ok) r = await L.sb("app_users?select=username,display,role,created_by" + flt);
      return send(res, 200, { ok: true, users: r.ok ? await r.json() : [] });
    }
    if (b.action === "setexp") {
      const t = String(b.username || "").trim().toLowerCase();
      if (me.role === "member") return send(res, 403, { ok: false, error: "Tidak diizinkan" });
      if (!t) return send(res, 400, { ok: false, error: "Pilih akun dulu" });
      if (t === me.username) return send(res, 400, { ok: false, error: "Tidak bisa mengubah expired akun sendiri" });
      const tr = (await (await L.sb("app_users?select=*&username=eq." + enc(t))).json())[0];
      if (!tr) return send(res, 404, { ok: false, error: "Akun tidak ditemukan" });
      if (!(me.role === "owner" || (me.role === "reseller" && tr.role === "member" && tr.created_by === me.username))) return send(res, 403, { ok: false, error: "Tidak diizinkan" });
      const pd = parseDays(b.days, me); if (pd.error) return send(res, 400, { ok: false, error: pd.error });
      let exp = null;
      if (pd.days) {
        let base = Date.now();
        if (b.mode === "add") {
          if (!tr.expires_at) return send(res, 400, { ok: false, error: "Akun ini permanen. Pakai Atur dari sekarang untuk mengubahnya" });
          base = Math.max(base, new Date(tr.expires_at).getTime());
        }
        exp = expIso(pd.days, base);
      } else if (b.mode === "add") return send(res, 400, { ok: false, error: "Isi jumlah hari lebih dari 0 untuk menambah" });
      const r = await L.sb("app_users?username=eq." + enc(t), "PATCH", { expires_at: exp }, "return=minimal");
      if (!r.ok) return send(res, 500, { ok: false, error: "Gagal menyimpan. Sudah menjalankan supabase-semua.sql?" });
      await L.log({ ev: "user_setexp", by: me.username, u: t, days: pd.days, mode: b.mode === "add" ? "add" : "set" }); return send(res, 200, { ok: true, exp });
    }
    if (b.action === "delete" || b.action === "setpass") {
      const t = String(b.username || me.username).toLowerCase(), self = t === me.username;
      const tr = (await (await L.sb("app_users?select=username,role,created_by&username=eq." + enc(t))).json())[0];
      if (!tr) return send(res, 404, { ok: false, error: "Akun tidak ditemukan" });
      const can = me.role === "owner" || (me.role === "reseller" && tr.role === "member" && tr.created_by === me.username) || (self && b.action === "setpass");
      if (!can) return send(res, 403, { ok: false, error: "Tidak diizinkan" });
      if (b.action === "delete") {
        if (self) return send(res, 400, { ok: false, error: "Tidak bisa menghapus akun sendiri" });
        await L.sb("app_users?username=eq." + enc(t), "DELETE"); await L.log({ ev: "user_delete", by: me.username, u: t }); return send(res, 200, { ok: true });
      }
      const pass = String(b.password || ""); if (pass.length < 4 || pass.length > 60) return send(res, 400, { ok: false, error: "Password minimal 4 karakter" });
      const salt = crypto.randomBytes(16).toString("hex");
      await L.sb("app_users?username=eq." + enc(t), "PATCH", { pass_hash: hash(pass, salt), salt }, "return=minimal");
      await L.log({ ev: "user_setpass", by: me.username, u: t }); return send(res, 200, { ok: true });
    }
    return send(res, 400, { ok: false, error: "Aksi tidak dikenal" });
  } catch (e) { return send(res, 500, { ok: false, error: e.message || "Terjadi kesalahan" }); }
};
