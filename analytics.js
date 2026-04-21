// UBNB Web Analytics Tracker
(function() {
  const SURL = 'https://skltbmcrqutevmtcxqxj.supabase.co';
  const SKEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNrbHRibWNycXV0ZXZtdGN4cXhqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU2NzM5ODIsImV4cCI6MjA5MTI0OTk4Mn0._nogUZg5UylVyP45QTGYw69u76pNxGryj9hZORIfE_A';

  // Generate atau ambil visitor ID dari localStorage
  function getVisitorId() {
    let vid = localStorage.getItem('_ubnb_vid');
    if (!vid) {
      vid = 'v_' + Math.random().toString(36).substr(2,9) + '_' + Date.now().toString(36);
      localStorage.setItem('_ubnb_vid', vid);
    }
    return vid;
  }

  // Deteksi perangkat
  function getPerangkat() {
    const ua = navigator.userAgent;
    if (/tablet|ipad|playbook|silk/i.test(ua)) return 'tablet';
    if (/mobile|android|iphone|ipod|blackberry|opera mini|windows phone/i.test(ua)) return 'mobile';
    return 'desktop';
  }

  // Deteksi browser
  function getBrowser() {
    const ua = navigator.userAgent;
    if (ua.includes('Chrome') && !ua.includes('Edg')) return 'Chrome';
    if (ua.includes('Firefox')) return 'Firefox';
    if (ua.includes('Safari') && !ua.includes('Chrome')) return 'Safari';
    if (ua.includes('Edg')) return 'Edge';
    if (ua.includes('OPR') || ua.includes('Opera')) return 'Opera';
    return 'Other';
  }

  // Ambil nama halaman dari URL
  function getHalaman() {
    const path = window.location.pathname;
    const file = path.split('/').pop() || 'index.html';
    return file || 'index.html';
  }

  // Kirim data ke Supabase
  function track() {
    const data = {
      halaman: getHalaman(),
      judul: document.title || '',
      referrer: document.referrer ? new URL(document.referrer).hostname : 'direct',
      perangkat: getPerangkat(),
      browser: getBrowser(),
      layar: window.screen.width + 'x' + window.screen.height,
      visitor_id: getVisitorId()
    };

    fetch(SURL + '/rest/v1/web_analytics', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': SKEY,
        'Authorization': 'Bearer ' + SKEY,
        'Prefer': 'return=minimal'
      },
      body: JSON.stringify(data)
    }).catch(() => {}); // silent fail, jangan ganggu UX
  }

  // Jalankan saat halaman sudah load
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', track);
  } else {
    track();
  }
})();
