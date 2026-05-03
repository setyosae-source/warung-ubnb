// ============================================================
// ubnb-sso-bootstrap.js — Helper SSO untuk modul yang belum
// punya auto-login dari saved session.
//
// Cara pakai:
//   <script src="ubnb-auth.js"></script>
//   <script src="ubnb-sso-bootstrap.js" data-module-key="keuangan_user"></script>
//
// Script ini akan otomatis cek SSO di window load:
//   - Kalau ada SSO → set CU global, hide login wrap, show app, panggil callback
//   - Kalau tidak → biarkan user login normal
//
// Modul perlu expose:
//   - window.onSSOLogin(cu) callback (opsional) — untuk trigger refresh data
//   - element #login-wrap dan #app harus ada
// ============================================================

(function(){
  'use strict';
  if(typeof window.UBNBAuth === 'undefined') return;

  // Ambil module key dari script tag attribute
  var script = document.currentScript;
  var moduleKey = (script && script.dataset.moduleKey) || 'unknown_module';

  window.addEventListener('DOMContentLoaded', async function(){
    // Cek apakah Supabase client sudah ada di global (sb)
    if(typeof window.sb === 'undefined') {
      // Supabase belum init — coba retry sekali
      setTimeout(tryBootstrap, 200);
    } else {
      tryBootstrap();
    }

    async function tryBootstrap(){
      if(typeof window.sb === 'undefined') return;
      try{
        var cu = await UBNBAuth.bootstrap(window.sb, moduleKey);
        if(!cu) return; // tidak ada SSO, biarkan user login

        // Set global CU
        window.CU = cu;

        // Hide login, show app
        var loginWrap = document.getElementById('login-wrap');
        var app = document.getElementById('app');
        if(loginWrap) loginWrap.style.display = 'none';
        if(app) app.style.display = 'block';

        // Update badges/displays yang umum
        var badge = document.getElementById('user-badge');
        if(badge) badge.textContent = cu.username;
        var sbUser = document.getElementById('sb-user');
        if(sbUser) sbUser.textContent = '👤 ' + cu.username;

        // Mulai idle timer
        UBNBAuth.startIdleTimer(window.sb, function(reason){
          alert('Sesi berakhir. Silakan login kembali.');
          UBNBAuth.clearAllSessions();
          location.reload();
        });

        // Panggil callback modul jika ada
        if(typeof window.onSSOLogin === 'function'){
          await window.onSSOLogin(cu);
        }

        console.log('[SSO] Auto-login berhasil sebagai', cu.username);
      } catch(e){
        console.warn('[SSO] Bootstrap error:', e.message);
      }
    }
  });
})();
