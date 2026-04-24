// ubnb-auth.js — v1.0 | UBNB Security Layer
// Pasang di semua halaman: <script src="ubnb-auth.js"></script>
// Sebelum script utama halaman, setelah supabase CDN
// ============================================================
(function(global){

  const SESSION_TTL  = 8 * 60 * 60 * 1000; // 8 jam
  const WARN_BEFORE  = 5 * 60 * 1000;       // warning 5 menit sebelum habis
  const KEYS         = ['portal_cu','wu','bmt_cu','wu_jamaah']; // semua key session

  // ── SHA-256 via WebCrypto (semua browser modern) ──────────
  async function sha256(str){
    const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(str));
    return Array.from(new Uint8Array(buf)).map(b=>b.toString(16).padStart(2,'0')).join('');
  }

  // ── Simpan session (tambah login_at) ─────────────────────
  function saveSession(key, userData){
    const sess = Object.assign({}, userData, { login_at: Date.now() });
    // Jangan simpan kolom password ke localStorage
    delete sess.password;
    delete sess.password_hash;
    delete sess.hash_migrated;
    localStorage.setItem(key, JSON.stringify(sess));
    return sess;
  }

  // ── Baca session + cek expiry ─────────────────────────────
  function loadSession(key){
    try {
      const raw = localStorage.getItem(key);
      if(!raw) return null;
      const cu = JSON.parse(raw);
      if(Date.now() - (cu.login_at||0) > SESSION_TTL){
        clearAllSessions();
        return null;
      }
      return cu;
    } catch(e){ return null; }
  }

  // ── Hapus semua key session ───────────────────────────────
  function clearAllSessions(){
    KEYS.forEach(k => localStorage.removeItem(k));
  }

  // ── Login: coba hash dulu, fallback plaintext ─────────────
  async function login(sb, username, password){
    const hashed = await sha256(password);

    // Coba password_hash (Fase 3 sudah selesai di DB)
    let { data, error } = await sb
      .from('users')
      .select('id,username,nama,role,permissions')
      .eq('username', username)
      .eq('password_hash', hashed)
      .single();

    // Fallback plaintext (masa transisi — masih aman karena hash sudah ada di DB)
    if(error || !data){
      const res = await sb
        .from('users')
        .select('id,username,nama,role,permissions')
        .eq('username', username)
        .eq('password', password)
        .single();
      data  = res.data;
      error = res.error;
    }

    if(error || !data) throw new Error('Username atau password salah');
    return data; // caller pilih key mana untuk saveSession
  }

  // ── Verifikasi role dari server (bukan localStorage) ──────
  async function verifySession(sb, sessionKey){
    const cu = loadSession(sessionKey);
    if(!cu) return null;

    try {
      // Gunakan DB function aman — tidak expose password
      const { data, error } = await sb.rpc('verify_user_session', { p_user_id: cu.id });
      if(error || !data || !data.length) { clearAllSessions(); return null; }
      const fresh = data[0];
      // Perbarui localStorage dengan data segar, pertahankan login_at
      const updated = saveSession(sessionKey, Object.assign({}, fresh, { login_at: cu.login_at }));
      return updated;
    } catch(e){
      // Jika RPC belum ada (edge case), percaya localStorage tapi log warning
      console.warn('[ubnb-auth] verify_user_session RPC error:', e.message);
      return cu;
    }
  }

  // ── Session expiry timer ──────────────────────────────────
  let _timer = null;
  function startExpiryTimer(sessionKey, onExpire){
    if(_timer) clearInterval(_timer);
    _timer = setInterval(()=>{
      const cu = loadSession(sessionKey);
      if(!cu){ clearInterval(_timer); onExpire(); return; }
      const remaining = SESSION_TTL - (Date.now() - (cu.login_at||0));
      if(remaining <= 0){
        clearInterval(_timer);
        clearAllSessions();
        onExpire();
      } else if(remaining <= WARN_BEFORE){
        _showWarn(Math.ceil(remaining/60000), sessionKey, cu);
      }
    }, 60_000);
  }

  function _showWarn(mnt, sessionKey, cu){
    let el = document.getElementById('_ubnb_sess_warn');
    if(!el){
      el = Object.assign(document.createElement('div'), { id: '_ubnb_sess_warn' });
      Object.assign(el.style, {
        position:'fixed', bottom:'68px', left:'50%', transform:'translateX(-50%)',
        background:'#BA7517', color:'#fff', padding:'8px 18px',
        borderRadius:'8px', fontSize:'13px', zIndex:'99999',
        cursor:'pointer', boxShadow:'0 2px 8px rgba(0,0,0,.25)', whiteSpace:'nowrap'
      });
      el.onclick = ()=>{ saveSession(sessionKey, Object.assign({}, cu, {login_at: Date.now()})); el.remove(); };
      document.body.appendChild(el);
    }
    el.textContent = `Sesi berakhir ${mnt} mnt lagi — klik untuk perpanjang`;
  }

  // ── Cek duplikat absensi MPPS ─────────────────────────────
  async function cekSudahHadir(sb, nama, kelompok){
    const { data } = await sb
      .from('mpps_hadir')
      .select('id,nomor,nama,kelompok,hadir_at')
      .eq('nama', nama)
      .eq('kelompok', kelompok||'')
      .maybeSingle();
    return data || null; // null = belum hadir, objek = sudah hadir
  }

  // ── Expose ke global ──────────────────────────────────────
  global.UBNBAuth = { sha256, login, saveSession, loadSession,
                      clearAllSessions, verifySession,
                      startExpiryTimer, cekSudahHadir };

})(window);
