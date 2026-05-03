// ============================================================
// ubnb-auth.js — v2.0 | UBNB Single Sign-On + Idle Timer
// ============================================================
// Pasang di SEMUA halaman SEBELUM script utama:
//   <script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>
//   <script src="ubnb-auth.js"></script>
//
// Pola pakai di modul (auto-login dari SSO):
//   const sso = await UBNBAuth.bootstrap(sb, 'wu');  // 'wu' = legacy key modul ini
//   if(sso) { CU = sso; showApp(); }
//
// Pola pakai di Portal (login fresh):
//   const cu = await UBNBAuth.login(sb, username, password);
//   UBNBAuth.saveSSO(cu);
//   UBNBAuth.startIdleTimer(sb, () => doLogout());
// ============================================================

(function(global){
'use strict';

// ===== Konstanta =====
var SSO_KEY      = 'ubnb_sso';                 // primary single sign-on key
var IDLE_TIMEOUT = 10 * 60 * 1000;             // 10 menit idle = auto logout
var WARN_BEFORE  = 2 * 60 * 1000;              // warning muncul 2 menit sebelum expire

// Legacy keys yang dipakai modul lama — tetap di-support untuk backward compat
var LEGACY_KEYS  = ['portal_cu','wu','bmt_cu','wu_jamaah','saham_user','mpps_user','keuangan_user'];

// ===== Helpers =====
async function sha256(str){
  var buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(str));
  return Array.from(new Uint8Array(buf)).map(function(b){return b.toString(16).padStart(2,'0');}).join('');
}

function _now(){ return Date.now(); }

function _sanitize(userData){
  var sess = Object.assign({}, userData);
  delete sess.password;
  delete sess.password_hash;
  return sess;
}

// ===== Session storage =====
function saveSSO(userData){
  var sess = _sanitize(userData);
  sess.login_at = _now();
  sess.last_active_at = _now();
  localStorage.setItem(SSO_KEY, JSON.stringify(sess));
  // Mirror ke legacy keys yang masih dipakai modul lama
  LEGACY_KEYS.forEach(function(k){
    localStorage.setItem(k, JSON.stringify(sess));
  });
  return sess;
}

function loadSSO(){
  try{
    var raw = localStorage.getItem(SSO_KEY);
    if(!raw) return null;
    var cu = JSON.parse(raw);
    var idle = _now() - (cu.last_active_at || cu.login_at || 0);
    if(idle > IDLE_TIMEOUT){
      clearAllSessions();
      return null;
    }
    return cu;
  }catch(e){ return null; }
}

// Legacy compatibility: untuk modul yang belum upgrade
function loadSession(key){
  // Prioritaskan SSO; jika ada, pakai itu (otomatis SSO)
  var sso = loadSSO();
  if(sso) return sso;
  // Fallback ke legacy key
  try{
    var raw = localStorage.getItem(key);
    if(!raw) return null;
    var cu = JSON.parse(raw);
    var idle = _now() - (cu.last_active_at || cu.login_at || 0);
    if(idle > IDLE_TIMEOUT){
      clearAllSessions();
      return null;
    }
    return cu;
  }catch(e){ return null; }
}

function saveSession(key, userData){
  // Saat modul lama save session, kita save ke SSO juga supaya seamless
  saveSSO(userData);
  return _sanitize(userData);
}

function clearAllSessions(){
  localStorage.removeItem(SSO_KEY);
  LEGACY_KEYS.forEach(function(k){ localStorage.removeItem(k); });
  // Trigger storage event untuk cross-tab logout
  // (storage event tidak fire di tab yang trigger, tapi tab lain akan dengar)
}

// ===== Login =====
async function login(sb, username, password){
  var hashed = await sha256(password);

  // Try hashed first
  var result = await sb
    .from('users')
    .select('id,username,nama,role,permissions,menu_layout')
    .eq('username', username)
    .eq('password_hash', hashed)
    .maybeSingle();

  // Fallback: plain text password (legacy users yang belum di-hash)
  if((result.error || !result.data) && password){
    result = await sb
      .from('users')
      .select('id,username,nama,role,permissions,menu_layout,password_hash')
      .eq('username', username)
      .eq('password_hash', password)  // beberapa legacy user pakai plain
      .maybeSingle();
  }

  if(result.error || !result.data){
    throw new Error('Username atau password salah');
  }

  // Track login
  try{
    await sb.rpc('update_user_activity', { p_user_id: result.data.id, p_action: 'login' });
  }catch(e){ console.warn('[ubnb-auth] update_user_activity:', e.message); }

  // Set audit session var (supaya trigger audit_log capture username)
  try{
    await sb.rpc('set_audit_user', {
      p_username: result.data.username,
      p_user_id: parseInt(result.data.id, 10)
    });
  }catch(e){ console.warn('[ubnb-auth] set_audit_user:', e.message); }

  return _sanitize(result.data);
}

// ===== Bootstrap (auto-login dari SSO) =====
// Dipanggil di setiap modul saat onLoad untuk cek apakah sudah login via SSO
async function bootstrap(sb, legacyKey){
  var cu = loadSSO();
  if(!cu) return null;

  // Set audit session var (supaya trigger audit_log capture username pada operasi DML)
  try{
    await sb.rpc('set_audit_user', {
      p_username: cu.username,
      p_user_id: parseInt(cu.id, 10)
    });
  }catch(e){ /* silent */ }

  // Update last_active
  try{
    await sb.rpc('update_user_activity', { p_user_id: cu.id, p_action: 'active' });
  }catch(e){ /* silent */ }

  // Update last_active_at di local
  cu.last_active_at = _now();
  localStorage.setItem(SSO_KEY, JSON.stringify(cu));
  if(legacyKey) localStorage.setItem(legacyKey, JSON.stringify(cu));

  return cu;
}

// ===== Verify session (deep check ke server) =====
async function verifySession(sb, sessionKey){
  var cu = loadSSO() || loadSession(sessionKey);
  if(!cu) return null;
  try{
    var res = await sb.rpc('verify_user_session', { p_user_id: cu.id });
    if(res.error || !res.data || !res.data.length){
      clearAllSessions();
      return null;
    }
    var fresh = res.data[0];
    var updated = Object.assign({}, fresh, {
      login_at: cu.login_at,
      last_active_at: _now(),
      menu_layout: cu.menu_layout  // preserve client-side layout
    });
    saveSSO(updated);
    return updated;
  }catch(e){
    console.warn('[ubnb-auth] verifySession error:', e.message);
    return cu;
  }
}

// ===== Idle Timer =====
var _idleTimer = null;
var _activityHandlers = null;

function _touchActivity(){
  var raw = localStorage.getItem(SSO_KEY);
  if(!raw) return;
  try{
    var cu = JSON.parse(raw);
    cu.last_active_at = _now();
    localStorage.setItem(SSO_KEY, JSON.stringify(cu));
    // Hapus warning kalau ada
    var warn = document.getElementById('_ubnb_sess_warn');
    if(warn) warn.remove();
  }catch(e){}
}

function startIdleTimer(sb, onExpire){
  if(_idleTimer) clearInterval(_idleTimer);

  // Pasang activity listeners
  if(!_activityHandlers){
    _activityHandlers = {
      click: _touchActivity,
      keypress: _touchActivity,
      scroll: _touchActivity,
      touchstart: _touchActivity,
      mousemove: _throttle(_touchActivity, 30000) // throttle mousemove 30s
    };
    Object.keys(_activityHandlers).forEach(function(ev){
      window.addEventListener(ev, _activityHandlers[ev], { passive: true });
    });
  }

  // Cek setiap 30 detik
  _idleTimer = setInterval(function(){
    var cu = loadSSO();
    if(!cu){
      stopIdleTimer();
      onExpire && onExpire('expired');
      return;
    }
    var idle = _now() - (cu.last_active_at || cu.login_at || 0);
    var remaining = IDLE_TIMEOUT - idle;
    if(remaining <= 0){
      stopIdleTimer();
      clearAllSessions();
      // Track logout via activity (best effort)
      try{ sb.rpc('update_user_activity', { p_user_id: cu.id, p_action: 'logout' }); }catch(e){}
      onExpire && onExpire('expired');
    } else if(remaining <= WARN_BEFORE){
      _showWarn(Math.ceil(remaining/60000));
    }
  }, 30000);

  // Storage listener: cross-tab logout
  window.addEventListener('storage', function(e){
    if(e.key === SSO_KEY && e.newValue === null){
      stopIdleTimer();
      onExpire && onExpire('cross_tab_logout');
    }
  });
}

function stopIdleTimer(){
  if(_idleTimer){ clearInterval(_idleTimer); _idleTimer = null; }
  if(_activityHandlers){
    Object.keys(_activityHandlers).forEach(function(ev){
      window.removeEventListener(ev, _activityHandlers[ev]);
    });
    _activityHandlers = null;
  }
}

function _throttle(fn, wait){
  var last = 0;
  return function(){
    var now = _now();
    if(now - last >= wait){
      last = now;
      fn();
    }
  };
}

function _showWarn(mnt){
  var el = document.getElementById('_ubnb_sess_warn');
  if(!el){
    el = document.createElement('div');
    el.id = '_ubnb_sess_warn';
    Object.assign(el.style, {
      position:'fixed', bottom:'80px', left:'50%', transform:'translateX(-50%)',
      background:'#FFB300', color:'#1a2841', padding:'10px 20px',
      borderRadius:'12px', fontSize:'13px', fontWeight:'700',
      zIndex:'99999', cursor:'pointer',
      boxShadow:'0 4px 16px rgba(0,0,0,.25)', whiteSpace:'nowrap',
      fontFamily:'system-ui, -apple-system, sans-serif'
    });
    el.onclick = function(){
      _touchActivity();
    };
    document.body.appendChild(el);
  }
  el.textContent = '⏱️ Sesi berakhir ' + mnt + ' menit lagi · Klik untuk perpanjang';
}

// ===== Logout (broadcast ke semua tab) =====
async function logout(sb){
  var cu = loadSSO();
  if(cu){
    try{
      await sb.rpc('update_user_activity', { p_user_id: cu.id, p_action: 'logout' });
    }catch(e){}
  }
  stopIdleTimer();
  clearAllSessions();
}

// ===== Helper untuk MPPS (legacy) =====
async function cekSudahHadir(sb, nama, kelompok){
  var res = await sb
    .from('mpps_hadir')
    .select('id,nomor,nama,kelompok,hadir_at')
    .eq('nama', nama)
    .eq('kelompok', kelompok||'')
    .maybeSingle();
  return res.data || null;
}

// ===== Touch activity manual (untuk dipakai modul) =====
function attachActivityDetector(){
  // Alias untuk konsistensi nama dgn dokumentasi
  startIdleTimer.activityOnly = true;
}

// ===== Export =====
global.UBNBAuth = {
  // v2 API
  bootstrap: bootstrap,
  saveSSO: saveSSO,
  loadSSO: loadSSO,
  startIdleTimer: startIdleTimer,
  stopIdleTimer: stopIdleTimer,
  logout: logout,
  IDLE_TIMEOUT: IDLE_TIMEOUT,
  WARN_BEFORE: WARN_BEFORE,
  // Legacy v1 API (tetap bekerja)
  sha256: sha256,
  login: login,
  saveSession: saveSession,
  loadSession: loadSession,
  clearAllSessions: clearAllSessions,
  verifySession: verifySession,
  cekSudahHadir: cekSudahHadir,
  attachActivityDetector: attachActivityDetector,
  // Internal helpers
  _touchActivity: _touchActivity
};

})(window);
