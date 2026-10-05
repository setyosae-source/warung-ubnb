/* UBNB v86 ppg.js */

/* ============================================================
   SOURCE: ubnb-v32-ppg-prototype-script
   ============================================================ */
(function(){
  const PPG_CLASSES=['Balita','Kelas A','Kelas B','Kelas C','Pra Remaja','Remaja','Dewasa'];
  const PPG_AGE={
    'Balita':'0–4 tahun',
    'Kelas A':'5–7 tahun',
    'Kelas B':'8–10 tahun',
    'Kelas C':'11–12 tahun',
    'Pra Remaja':'13–15 tahun',
    'Remaja':'16–20 tahun',
    'Dewasa':'21+ tahun · belum menikah'
  };
  const PPG_OVERRIDE_KEY='ubnb_ppg_proto_class_overrides';
  let ppgPage='dashboard';
  let ppgSearch='';
  let ppgGroup='';
  let ppgClassFilter='';

  function ppgEsc(s){
    return String(s??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
  }

  function ppgRoles(){
    try{return dashboardDapukanLabels();}catch(_e){return []}
  }

  function ppgMasterAccess(){
    if(!CU)return false;
    if(CU.is_master===true||CU.master===true||CU.permissions?.master===true)return true;
    const r=`${CU.role||''} ${CU.access_role||''}`.toLowerCase();
    return /\bmaster\b|\bsuperadmin\b|\badmin\b/.test(r);
  }

  function ppgRoleMatch(label){
    const raw=String(label||'').toLowerCase();
    const norm=(' '+raw.replace(/[._/\\-]+/g,' ')+' ').replace(/\s+/g,' ');
    const mt=/(^|\s)mt(\s|$)/.test(norm);
    const ms=/(^|\s)ms(\s|$)/.test(norm);
    const ki=/(^|\s)ki(\s|$)/.test(norm); // termasuk Wakil KI
    return mt||ms||ki||raw.includes('penerobos');
  }

  window.ppgCanAccess=function(){
    if(!CU||isViewer())return false;
    return ppgMasterAccess()||ppgRoles().some(ppgRoleMatch);
  };

  function ppgScopeText(){
    if(!CU)return '-';
    return CU.kelompok_scope ? `Kelompok ${CU.kelompok_scope}` : 'Desa Perwira · PW1–PW4';
  }

  function ppgRecClass(j){
    if(!j||j.status_nikah!=='Belum Menikah')return null;
    const u=umurFromTgl(j.tgl_lahir);
    if(u===null)return null;
    if(u<=4)return 'Balita';
    if(u<=7)return 'Kelas A';
    if(u<=10)return 'Kelas B';
    if(u<=12)return 'Kelas C';
    if(u<=15)return 'Pra Remaja';
    if(u<=20)return 'Remaja';
    return 'Dewasa';
  }

  function ppgOverrides(){
    try{return JSON.parse(sessionStorage.getItem(PPG_OVERRIDE_KEY)||'{}')||{}}
    catch(_e){return {}}
  }
  function ppgSaveOverrides(o){
    sessionStorage.setItem(PPG_OVERRIDE_KEY,JSON.stringify(o||{}));
  }

  function ppgActualClass(j){
    const o=ppgOverrides();
    return o[String(j.did)]||j.kelas_kbm||ppgRecClass(j);
  }

  function ppgClassSource(j){
    const o=ppgOverrides();
    if(o[String(j.did)])return 'Prototype';
    if(j.kelas_kbm)return 'Aktual DB';
    return 'Rekomendasi usia';
  }

  function ppgGenerus(){
    const src=Array.isArray(aJamaah)?aJamaah:[];
    return src
      .filter(j=>j.status_nikah==='Belum Menikah')
      .filter(j=>j.status_sambung==='Tetap')
      .map(j=>({...j,__umur:umurFromTgl(j.tgl_lahir),__rec:ppgRecClass(j),__actual:ppgActualClass(j)}));
  }

  function ppgCounts(){
    const rows=ppgGenerus();
    const confirmed=rows.filter(j=>j.kelas_kbm||ppgOverrides()[String(j.did)]).length;
    const noClass=rows.filter(j=>!j.__actual).length;
    const by={};
    PPG_CLASSES.forEach(k=>by[k]=rows.filter(j=>j.__actual===k).length);
    return {rows,total:rows.length,confirmed,pending:rows.length-confirmed,noClass,by};
  }

  function ppgInjectDom(){
    if(document.getElementById('ppg-portal'))return;

    document.body.insertAdjacentHTML('beforeend',`
      <div id="ppg-portal">
        <div class="ppg-portal-card">
          <div class="ppg-portal-head">
            <div>
              <div class="ppg-portal-title">Selamat Datang</div>
              <div class="ppg-portal-sub">Pilih mode kerja yang akan digunakan</div>
            </div>
            <div class="ppg-portal-user">
              <b id="ppg-portal-user-name">-</b><br>
              <span id="ppg-portal-scope">-</span>
            </div>
          </div>
          <div class="ppg-mode-wrap">
            <div class="ppg-mode-card" onclick="ppgChooseDatabase()">
              <div class="ppg-mode-icon">🗂️</div>
              <div class="ppg-mode-name">Database Perwira</div>
              <div class="ppg-mode-desc">Data induk jamaah dan pengurus, sensus, acara, absensi kegiatan, pernikahan, serta administrasi Database Perwira yang sudah berjalan.</div>
              <div class="ppg-mode-tags">
                <span>Jamaah</span><span>Pengurus</span><span>Sensus</span><span>Acara</span><span>Absensi</span>
              </div>
              <button class="ppg-mode-action" type="button">Masuk Database Perwira →</button>
            </div>

            <div id="ppg-mode-card" class="ppg-mode-card ppg" onclick="ppgChoosePPG()">
              <div class="ppg-mode-icon">📚</div>
              <div class="ppg-mode-name">PPG Perwira</div>
              <div class="ppg-mode-desc">Program Pembinaan Generasi Penerus melalui KBM. Menentukan kelas aktual, mengontrol kehadiran, dan memantau penguasaan materi sesuai kurikulum.</div>
              <div class="ppg-mode-tags">
                <span>Setup Kelas</span><span>KBM</span><span>Kehadiran</span><span>Kurikulum</span><span>Perkembangan</span>
              </div>
              <button id="ppg-mode-action" class="ppg-mode-action" type="button">Masuk PPG Perwira →</button>
              <div id="ppg-access-note" class="ppg-access-note"></div>
            </div>
          </div>
          <div class="ppg-portal-footer">Prototype · belum melakukan perubahan struktur database produksi PPG.</div>
        </div>
      </div>

      <div id="ppg-shell">
        <div class="ppg-topbar">
          <div class="ppg-brand">
            <div class="ppg-brand-name">PPG Perwira</div>
            <div class="ppg-brand-sub">Program Pembinaan Generasi Penerus · Powered by UBNB</div>
          </div>
          <div class="ppg-userbox">
            <b id="ppg-user-name">-</b><br><span id="ppg-scope-text">-</span>
          </div>
          <button class="ppg-top-btn" onclick="ppgBackPortal()">⇄ Pilih Mode</button>
        </div>

        <div class="ppg-tabs">
          <button class="ppg-tab active" data-page="dashboard" onclick="ppgOpenPage('dashboard',this)">Dashboard</button>
          <button class="ppg-tab" data-page="setup" onclick="ppgOpenPage('setup',this)">Setup Kelas</button>
          <button class="ppg-tab" data-page="kelas" onclick="ppgOpenPage('kelas',this)">Kelas KBM</button>
          <button class="ppg-tab" data-page="absen" onclick="ppgOpenPage('absen',this)">Kehadiran</button>
          <button class="ppg-tab" data-page="kurikulum" onclick="ppgOpenPage('kurikulum',this)">Kurikulum</button>
          <button class="ppg-tab" data-page="generus" onclick="ppgOpenPage('generus',this)">Generus</button>
          <button class="ppg-tab" data-page="laporan" onclick="ppgOpenPage('laporan',this)">Laporan</button>
        </div>

        <div class="ppg-body">
          <div class="ppg-proto-note">🧪 <b>Mode Prototype:</b> perubahan kelas pada halaman ini hanya disimpan sementara di browser (session), belum menulis ke database produksi.</div>
          <section id="ppg-page-dashboard" class="ppg-page active"></section>
          <section id="ppg-page-setup" class="ppg-page"></section>
          <section id="ppg-page-kelas" class="ppg-page"></section>
          <section id="ppg-page-absen" class="ppg-page"></section>
          <section id="ppg-page-kurikulum" class="ppg-page"></section>
          <section id="ppg-page-generus" class="ppg-page"></section>
          <section id="ppg-page-laporan" class="ppg-page"></section>
        </div>
      </div>
    `);
  }

  window.ppgShowPortal=function(){
    ppgInjectDom();
    const portal=document.getElementById('ppg-portal');
    if(!portal)return;

    document.getElementById('ppg-portal-user-name').textContent=CU?.nama||CU?.username||'-';
    document.getElementById('ppg-portal-scope').textContent=ppgScopeText();

    const ok=ppgCanAccess();
    const card=document.getElementById('ppg-mode-card');
    const btn=document.getElementById('ppg-mode-action');
    const note=document.getElementById('ppg-access-note');
    card.classList.toggle('disabled',!ok);
    if(!ok){
      btn.textContent='Akses PPG tidak tersedia';
      note.textContent='Akses PPG: Master User atau dapukan MT, MS, KI, Wakil KI, Penerobos pada scope yang bersangkutan.';
    }else{
      btn.textContent='Masuk PPG Perwira →';
      note.textContent=`Akses aktif · ${ppgRoles().join(' · ')||'Master User'}`;
    }
    portal.classList.add('show');
  };

  window.ppgChooseDatabase=function(){
    document.getElementById('ppg-portal')?.classList.remove('show');
    document.getElementById('ppg-shell')?.classList.remove('show');
  };

  window.ppgChoosePPG=function(){
    if(!ppgCanAccess()){
      toast('Akses PPG hanya untuk Master User atau dapukan MT, MS, KI, Wakil KI, dan Penerobos sesuai scope.',true);
      return;
    }
    ppgInjectDom();
    document.getElementById('ppg-portal')?.classList.remove('show');
    document.getElementById('ppg-shell')?.classList.add('show');
    document.getElementById('ppg-user-name').textContent=CU?.nama||CU?.username||'-';
    document.getElementById('ppg-scope-text').textContent=ppgScopeText();
    ppgRenderAll();
    ppgOpenPage('dashboard',document.querySelector('.ppg-tab[data-page="dashboard"]'));
  };

  window.ppgBackPortal=function(){
    document.getElementById('ppg-shell')?.classList.remove('show');
    ppgShowPortal();
  };

  window.ppgOpenPage=function(page,btn){
    ppgPage=page;
    document.querySelectorAll('.ppg-page').forEach(x=>x.classList.remove('active'));
    document.querySelectorAll('.ppg-tab').forEach(x=>x.classList.remove('active'));
    document.getElementById('ppg-page-'+page)?.classList.add('active');
    btn?.classList.add('active');
    ppgRenderPage(page);
  };

  function ppgRenderPage(page){
    if(page==='dashboard')ppgRenderDashboard();
    if(page==='setup')ppgRenderSetup();
    if(page==='kelas')ppgRenderKelas();
    if(page==='absen')ppgRenderAbsen();
    if(page==='kurikulum')ppgRenderKurikulum();
    if(page==='generus')ppgRenderGenerus();
    if(page==='laporan')ppgRenderLaporan();
  }

  function ppgRenderAll(){
    ['dashboard','setup','kelas','absen','kurikulum','generus','laporan'].forEach(ppgRenderPage);
  }

  function ppgRenderDashboard(){
    const el=document.getElementById('ppg-page-dashboard'); if(!el)return;
    const c=ppgCounts();
    const max=Math.max(1,...Object.values(c.by));

    el.innerHTML=`
      <div class="ppg-grid-4">
        <div class="ppg-stat"><div class="ppg-stat-label">Generus dalam scope</div><div class="ppg-stat-value">${c.total}</div><div class="ppg-stat-sub">${ppgEsc(ppgScopeText())}</div></div>
        <div class="ppg-stat"><div class="ppg-stat-label">Kelas sudah ditetapkan</div><div class="ppg-stat-value">${c.confirmed}</div><div class="ppg-stat-sub">Aktual DB + perubahan prototype</div></div>
        <div class="ppg-stat"><div class="ppg-stat-label">Perlu konfirmasi kelas</div><div class="ppg-stat-value">${c.pending}</div><div class="ppg-stat-sub">Masih memakai rekomendasi usia</div></div>
        <div class="ppg-stat"><div class="ppg-stat-label">Belum bisa diklasifikasi</div><div class="ppg-stat-value">${c.noClass}</div><div class="ppg-stat-sub">Umur / data belum cukup</div></div>
      </div>

      <div class="ppg-grid-3">
        <div class="ppg-panel">
          <div class="ppg-panel-head"><div><div class="ppg-panel-title">Distribusi Kelas KBM</div><div class="ppg-panel-sub">Kelas aktual / rekomendasi saat ini</div></div></div>
          <div class="ppg-panel-body ppg-class-bars">
            ${PPG_CLASSES.map(k=>`
              <div class="ppg-class-bar">
                <span>${ppgEsc(k)}</span>
                <div class="ppg-bar-track"><div class="ppg-bar-fill" style="width:${Math.round(c.by[k]/max*100)}%"></div></div>
                <b>${c.by[k]}</b>
              </div>`).join('')}
          </div>
        </div>

        <div class="ppg-panel">
          <div class="ppg-panel-head"><div><div class="ppg-panel-title">Kontrol Kehadiran</div><div class="ppg-panel-sub">Akan diisi dari aktivitas KBM</div></div></div>
          <div class="ppg-panel-body">
            <div class="ppg-empty"><div class="ppg-empty-icon">✅</div>Belum ada data kehadiran KBM pada prototype.<br><span class="ppg-mini-note">Alur: pilih kelas → Mulai KBM → tandai Hadir/Izin/Sakit/Tidak Hadir.</span></div>
          </div>
        </div>

        <div class="ppg-panel">
          <div class="ppg-panel-head"><div><div class="ppg-panel-title">Penguasaan Materi</div><div class="ppg-panel-sub">Kontrol sesuai kurikulum</div></div></div>
          <div class="ppg-panel-body">
            <div class="ppg-empty"><div class="ppg-empty-icon">📘</div>Kurikulum belum diinput.<br><span class="ppg-mini-note">Setelah struktur kurikulum ditetapkan, dashboard akan menampilkan progres per kelas dan per generus.</span></div>
          </div>
        </div>
      </div>

      <div class="ppg-panel">
        <div class="ppg-panel-head">
          <div><div class="ppg-panel-title">Alur Implementasi PPG</div><div class="ppg-panel-sub">Tahap yang akan kita bangun setelah prototype disetujui</div></div>
        </div>
        <div class="ppg-panel-body">
          <div class="ppg-hierarchy">
            <div><b>1 · Setup Kelas</b>Rekomendasi usia → konfirmasi kelas aktual</div>
            <div><b>2 · Kehadiran KBM</b>Kelas → kegiatan → absensi generus</div>
            <div><b>3 · Kurikulum</b>Struktur materi dan target penguasaan</div>
            <div><b>4 · Kontrol</b>Progress individu, evaluasi, kenaikan kelas</div>
          </div>
        </div>
      </div>`;
  }

  function ppgSetupRows(){
    const q=ppgSearch.toLowerCase().trim();
    return ppgGenerus()
      .filter(j=>!ppgGroup||j.kelompok_nama===ppgGroup)
      .filter(j=>!ppgClassFilter||j.__actual===ppgClassFilter)
      .filter(j=>!q||`${j.nama||''} ${j.nama_kk||''} ${j.kelompok_nama||''}`.toLowerCase().includes(q))
      .sort((a,b)=>
        String(a.kelompok_nama||'').localeCompare(String(b.kelompok_nama||''),'id') ||
        String(a.__actual||'~').localeCompare(String(b.__actual||'~'),'id') ||
        String(a.nama||'').localeCompare(String(b.nama||''),'id')
      );
  }

  function ppgRenderSetup(){
    const el=document.getElementById('ppg-page-setup'); if(!el)return;
    const rows=ppgSetupRows();
    const override=ppgOverrides();

    el.innerHTML=`
      <div class="ppg-panel" style="margin-top:0">
        <div class="ppg-panel-head">
          <div>
            <div class="ppg-panel-title">Setup Awal · Kelas Aktual KBM</div>
            <div class="ppg-panel-sub">Rekomendasi awal mengikuti mapping usia yang sudah dipakai Database Perwira. Pengurus kemudian menetapkan kelas aktual.</div>
          </div>
          <button class="ppg-btn secondary" onclick="ppgApplyRecommendations()">Terapkan Rekomendasi ke Belum Ditentukan</button>
        </div>
        <div class="ppg-panel-body">
          <div class="ppg-mini-note" style="margin-bottom:8px">
            Mapping saat ini: <b>Balita 0–4</b> · <b>A 5–7</b> · <b>B 8–10</b> · <b>C 11–12</b> · <b>Pra Remaja 13–15</b> · <b>Remaja 16–20</b> · <b>Dewasa 21+ dan belum menikah</b>.
          </div>
          <div class="ppg-toolbar">
            <input class="ppg-input" placeholder="Cari nama / KK..." value="${ppgEsc(ppgSearch)}" oninput="ppgSearch=this.value;ppgRenderSetup()">
            <select class="ppg-select" onchange="ppgGroup=this.value;ppgRenderSetup()">
              <option value="">Semua Kelompok</option>
              ${['PW1','PW2','PW3','PW4'].map(k=>`<option ${ppgGroup===k?'selected':''}>${k}</option>`).join('')}
            </select>
            <select class="ppg-select" onchange="ppgClassFilter=this.value;ppgRenderSetup()">
              <option value="">Semua Kelas</option>
              ${PPG_CLASSES.map(k=>`<option ${ppgClassFilter===k?'selected':''}>${k}</option>`).join('')}
            </select>
            <button class="ppg-btn secondary" onclick="ppgResetPrototypeClasses()">Reset Prototype</button>
          </div>
        </div>
        <div class="ppg-table-wrap">
          <table class="ppg-table">
            <thead><tr><th>No</th><th>Nama</th><th>Kelompok</th><th>Umur</th><th>Rekomendasi Usia</th><th>Kelas Aktual</th><th>Status</th></tr></thead>
            <tbody>
              ${rows.map((j,i)=>{
                const isConfirmed=!!(j.kelas_kbm||override[String(j.did)]);
                return `<tr>
                  <td>${i+1}</td>
                  <td><b>${ppgEsc(j.nama)}</b><div class="ppg-mini-note">KK: ${ppgEsc(j.nama_kk||'-')}</div></td>
                  <td>${ppgEsc(j.kelompok_nama||'-')}</td>
                  <td>${j.__umur??'—'}</td>
                  <td>${j.__rec?`<span class="ppg-badge">${ppgEsc(j.__rec)}</span>`:'—'}</td>
                  <td>
                    <select onchange="ppgSetClass('${ppgEsc(j.did)}',this.value)">
                      <option value="">Belum ditentukan</option>
                      ${PPG_CLASSES.map(k=>`<option value="${k}" ${j.__actual===k?'selected':''}>${k}</option>`).join('')}
                    </select>
                  </td>
                  <td>${isConfirmed?`<span class="ppg-badge">${ppgEsc(ppgClassSource(j))}</span>`:`<span class="ppg-badge warn">Perlu Konfirmasi</span>`}</td>
                </tr>`;
              }).join('')}
            </tbody>
          </table>
        </div>
      </div>`;
  }

  window.ppgSetClass=function(did,val){
    const o=ppgOverrides();
    if(val)o[String(did)]=val; else delete o[String(did)];
    ppgSaveOverrides(o);
    ppgRenderAll();
  };

  window.ppgApplyRecommendations=function(){
    const o=ppgOverrides();
    ppgGenerus().forEach(j=>{
      if(!j.kelas_kbm&&!o[String(j.did)]&&j.__rec)o[String(j.did)]=j.__rec;
    });
    ppgSaveOverrides(o);
    ppgRenderAll();
    toast('Prototype: rekomendasi kelas diterapkan sementara.');
  };

  window.ppgResetPrototypeClasses=function(){
    sessionStorage.removeItem(PPG_OVERRIDE_KEY);
    ppgRenderAll();
    toast('Perubahan kelas prototype di-reset.');
  };

  function ppgRenderKelas(){
    const el=document.getElementById('ppg-page-kelas'); if(!el)return;
    const c=ppgCounts();
    el.innerHTML=`
      <div class="ppg-class-cards">
        ${PPG_CLASSES.map(k=>`
          <div class="ppg-class-card" onclick="ppgOpenClass('${k}')">
            <div class="ppg-class-title">${ppgEsc(k)}</div>
            <div class="ppg-class-num">${c.by[k]}</div>
            <div class="ppg-class-age">${PPG_AGE[k]}</div>
          </div>`).join('')}
      </div>
      <div class="ppg-panel">
        <div class="ppg-panel-head"><div><div class="ppg-panel-title">Konsep Kelas KBM</div><div class="ppg-panel-sub">Setiap kelas nantinya memiliki peserta, jadwal, tempat, pengajar, dan kurikulum.</div></div></div>
        <div class="ppg-panel-body ppg-mini-note">
          Prototype ini memakai kelas aktual dari Database Perwira atau hasil Setup Kelas sementara. Tahap deploy nanti sebaiknya kelas KBM memiliki identitas tersendiri agar dapat dibuat per kelompok maupun kelas gabungan.
        </div>
      </div>`;
  }

  window.ppgOpenClass=function(k){
    ppgClassFilter=k;
    ppgOpenPage('generus',document.querySelector('.ppg-tab[data-page="generus"]'));
  };

  function ppgToday(){
    try{return new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Jakarta',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date())}
    catch(_e){return ubnbWibIso84().slice(0,10)}
  }

  function ppgRenderAbsen(){
    const el=document.getElementById('ppg-page-absen'); if(!el)return;
    el.innerHTML=`
      <div class="ppg-panel" style="margin-top:0">
        <div class="ppg-panel-head"><div><div class="ppg-panel-title">Mulai KBM / Kehadiran</div><div class="ppg-panel-sub">Prototype alur absensi kelas.</div></div></div>
        <div class="ppg-panel-body">
          <div class="ppg-att-setup">
            <select id="ppg-att-class" class="ppg-select">${PPG_CLASSES.map(k=>`<option>${k}</option>`).join('')}</select>
            <input id="ppg-att-date" class="ppg-input" type="date" value="${ppgToday()}">
            <input id="ppg-att-title" class="ppg-input" placeholder="Materi / kegiatan KBM (prototype)">
            <button class="ppg-btn" onclick="ppgStartAttendance()">Mulai Absensi</button>
          </div>
        </div>
        <div id="ppg-att-roster"></div>
      </div>`;
  }

  window.ppgStartAttendance=function(){
    const cls=document.getElementById('ppg-att-class')?.value||'';
    const rows=ppgGenerus().filter(j=>j.__actual===cls)
      .sort((a,b)=>String(a.kelompok_nama||'').localeCompare(String(b.kelompok_nama||''),'id')||String(a.nama||'').localeCompare(String(b.nama||''),'id'));
    const box=document.getElementById('ppg-att-roster'); if(!box)return;
    box.innerHTML=rows.length?`
      <div class="ppg-table-wrap">
        <table class="ppg-table">
          <thead><tr><th>No</th><th>Nama</th><th>Kelompok</th><th>Status Kehadiran</th><th>Catatan</th></tr></thead>
          <tbody>${rows.map((j,i)=>`<tr>
            <td>${i+1}</td><td><b>${ppgEsc(j.nama)}</b></td><td>${ppgEsc(j.kelompok_nama||'-')}</td>
            <td><select class="ppg-roster-status"><option>Hadir</option><option>Izin</option><option>Sakit</option><option>Tidak Hadir</option><option>Terlambat</option></select></td>
            <td><input class="ppg-input" placeholder="Opsional"></td>
          </tr>`).join('')}</tbody>
        </table>
      </div>
      <div class="ppg-panel-body"><button class="ppg-btn" onclick="toast('Prototype: absensi belum disimpan ke database.')">Simpan Absensi Prototype</button></div>`
      :'<div class="ppg-empty">Belum ada peserta pada kelas ini.</div>';
  };

  function ppgRenderKurikulum(){
    const el=document.getElementById('ppg-page-kurikulum'); if(!el)return;
    el.innerHTML=`
      <div class="ppg-panel" style="margin-top:0">
        <div class="ppg-panel-head">
          <div><div class="ppg-panel-title">Kurikulum PPG Perwira</div><div class="ppg-panel-sub">Belum diisi pada prototype — tidak dibuat-buat sebelum struktur kurikulum PPG ditetapkan.</div></div>
          <button class="ppg-btn secondary" onclick="toast('Prototype: editor kurikulum akan dibuat setelah struktur materi disepakati.')">+ Struktur Kurikulum</button>
        </div>
        <div class="ppg-panel-body">
          <div class="ppg-hierarchy">
            <div><b>Kelas</b>Balita / A / B / C / Pra Remaja / Remaja / Dewasa</div>
            <div><b>Bidang / Mata Materi</b>Kelompok besar materi</div>
            <div><b>Bab / Kompetensi</b>Target kemampuan yang harus dicapai</div>
            <div><b>Materi</b>Item yang dinilai per generus</div>
          </div>
          <div class="ppg-empty"><div class="ppg-empty-icon">📘</div>Setelah kurikulum diinput, tiap materi dapat diberi status:<br><b>Belum · Sedang Dipelajari · Menguasai · Perlu Pengulangan</b>.</div>
        </div>
      </div>`;
  }

  function ppgRenderGenerus(){
    const el=document.getElementById('ppg-page-generus'); if(!el)return;
    const q=ppgSearch.toLowerCase().trim();
    const rows=ppgGenerus()
      .filter(j=>!ppgGroup||j.kelompok_nama===ppgGroup)
      .filter(j=>!ppgClassFilter||j.__actual===ppgClassFilter)
      .filter(j=>!q||`${j.nama||''} ${j.nama_kk||''}`.toLowerCase().includes(q))
      .sort((a,b)=>String(a.kelompok_nama||'').localeCompare(String(b.kelompok_nama||''),'id')||String(a.nama||'').localeCompare(String(b.nama||''),'id'));

    el.innerHTML=`
      <div class="ppg-panel" style="margin-top:0">
        <div class="ppg-panel-head"><div><div class="ppg-panel-title">Data Generus</div><div class="ppg-panel-sub">Identitas tetap berasal dari Database Perwira. PPG hanya menambahkan data pembinaan.</div></div></div>
        <div class="ppg-panel-body">
          <div class="ppg-toolbar">
            <input class="ppg-input" placeholder="Cari nama / KK..." value="${ppgEsc(ppgSearch)}" oninput="ppgSearch=this.value;ppgRenderGenerus()">
            <select class="ppg-select" onchange="ppgGroup=this.value;ppgRenderGenerus()"><option value="">Semua Kelompok</option>${['PW1','PW2','PW3','PW4'].map(k=>`<option ${ppgGroup===k?'selected':''}>${k}</option>`).join('')}</select>
            <select class="ppg-select" onchange="ppgClassFilter=this.value;ppgRenderGenerus()"><option value="">Semua Kelas</option>${PPG_CLASSES.map(k=>`<option ${ppgClassFilter===k?'selected':''}>${k}</option>`).join('')}</select>
            <button class="ppg-btn secondary" onclick="ppgSearch='';ppgGroup='';ppgClassFilter='';ppgRenderGenerus()">Reset</button>
          </div>
        </div>
        <div class="ppg-table-wrap">
          <table class="ppg-table">
            <thead><tr><th>No</th><th>Nama</th><th>Kelompok</th><th>Umur</th><th>Kelas Aktual</th><th>Sumber Kelas</th><th>Kehadiran</th><th>Progres Materi</th></tr></thead>
            <tbody>${rows.map((j,i)=>`<tr>
              <td>${i+1}</td>
              <td><b>${ppgEsc(j.nama)}</b><div class="ppg-mini-note">KK: ${ppgEsc(j.nama_kk||'-')}</div></td>
              <td>${ppgEsc(j.kelompok_nama||'-')}</td>
              <td>${j.__umur??'—'}</td>
              <td>${j.__actual?`<span class="ppg-badge">${ppgEsc(j.__actual)}</span>`:'—'}</td>
              <td>${ppgEsc(ppgClassSource(j))}</td>
              <td>—</td><td>—</td>
            </tr>`).join('')}</tbody>
          </table>
        </div>
      </div>`;
  }

  function ppgRenderLaporan(){
    const el=document.getElementById('ppg-page-laporan'); if(!el)return;
    const c=ppgCounts();
    el.innerHTML=`
      <div class="ppg-grid-4">
        <div class="ppg-stat"><div class="ppg-stat-label">Laporan Kehadiran</div><div class="ppg-stat-value">—</div><div class="ppg-stat-sub">Per kelas / kelompok / periode</div></div>
        <div class="ppg-stat"><div class="ppg-stat-label">Capaian Kurikulum</div><div class="ppg-stat-value">—</div><div class="ppg-stat-sub">Per materi dan per generus</div></div>
        <div class="ppg-stat"><div class="ppg-stat-label">Perlu Konfirmasi Kelas</div><div class="ppg-stat-value">${c.pending}</div><div class="ppg-stat-sub">Dapat ditindaklanjuti di Setup Kelas</div></div>
        <div class="ppg-stat"><div class="ppg-stat-label">Rekomendasi Kenaikan</div><div class="ppg-stat-value">—</div><div class="ppg-stat-sub">Nanti berdasarkan aturan yang disepakati</div></div>
      </div>
      <div class="ppg-panel">
        <div class="ppg-panel-head"><div><div class="ppg-panel-title">Rancangan Laporan</div><div class="ppg-panel-sub">Output setelah modul kehadiran dan kurikulum berjalan.</div></div></div>
        <div class="ppg-panel-body">
          <div class="ppg-hierarchy">
            <div><b>Kehadiran Bulanan</b>Hadir, izin, sakit, tidak hadir</div>
            <div><b>Materi Tertinggal</b>Materi dengan penguasaan terendah</div>
            <div><b>Kontrol Individu</b>Riwayat kelas, hadir, progres</div>
            <div><b>Evaluasi Kelas</b>Distribusi dan calon kenaikan kelas</div>
          </div>
        </div>
      </div>`;
  }

  // Override init: setelah login & data selesai dimuat, tampilkan portal pemilihan mode.
  const baseInit=window.init;
  if(typeof baseInit==='function'){
    window.init=async function(){
      await baseInit.apply(this,arguments);
      ppgInjectDom();
      setTimeout(ppgShowPortal,80);
    };
  }

  // Jika prototype dibuka saat app sudah aktif karena hot-reload/file replacement.
  document.addEventListener('DOMContentLoaded',()=>{
    ppgInjectDom();
    setTimeout(()=>{
      if(CU && document.getElementById('app')?.style.display!=='none')ppgShowPortal();
    },650);
  });
})();

/* ============================================================
   SOURCE: ubnb-v33-ppg-tahap1-script
   ============================================================ */
(function(){
  const CLASSES=[
    'Balita',
    'Cabe Rawit Tahap A',
    'Cabe Rawit Tahap B',
    'Pra Remaja',
    'Remaja',
    'Dewasa'
  ];
  const DRAFT_KEY='ubnb_ppg_v33_class_drafts';

  let search='';
  let group='';
  let classFilter='';

  const esc=s=>String(s??'').replace(/[&<>"']/g,m=>(
    {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]
  ));

  function norm(s){
    return String(s||'').trim().toLowerCase().replace(/[._/-]+/g,' ').replace(/\s+/g,' ');
  }

  function roles(){
    try{return (dashboardDapukanLabels()||[]).map(String)}
    catch(_e){return []}
  }

  function isMasterPPG(){
    if(!CU)return false;
    const r=norm(CU.role);
    let p=CU.permissions;
    try{if(typeof p==='string')p=JSON.parse(p)}catch(_e){}
    return CU.is_master===true || CU.master===true ||
      ['master','master admin','master_admin'].includes(r) ||
      (Array.isArray(p)&&p.some(x=>['master','master admin','master_admin'].includes(norm(x)))) ||
      (p&&typeof p==='object'&&(p.master===true||p.master_admin===true));
  }

  function allowedRole(s){
    const x=' '+norm(s)+' ';
    return /(^|\s)mt(\s|$)/.test(x) ||
           /(^|\s)ms(\s|$)/.test(x) ||
           /(^|\s)ki(\s|$)/.test(x) ||
           x.includes('wakil ki') ||
           x.includes('wk ki') ||
           x.includes('penerobos');
  }

  window.ppgCanAccess=function(){
    if(!CU||isViewer())return false;
    return isMasterPPG()||roles().some(allowedRole);
  };

  function scopeText(){
    return CU?.kelompok_scope ? `Scope ${CU.kelompok_scope}` : 'Scope Desa Perwira';
  }

  function rowsBase(){
    return (Array.isArray(aJamaah)?aJamaah:[])
      .filter(j=>j.status_nikah==='Belum Menikah')
      .filter(j=>j.status_sambung==='Tetap');
  }

  function recommended(j){
    // Sumber utama: data aktual yang sudah dihitung Database Perwira.
    return j?.kelas_usia || null;
  }

  function drafts(){
    try{return JSON.parse(localStorage.getItem(DRAFT_KEY)||'{}')||{}}
    catch(_e){return {}}
  }
  function saveDrafts(d){
    localStorage.setItem(DRAFT_KEY,JSON.stringify(d||{}));
  }

  function actualClass(j){
    const d=drafts();
    return d[String(j.did)] || j.kelas_kbm || recommended(j);
  }

  function sourceLabel(j){
    const d=drafts();
    if(d[String(j.did)])return 'Draft PPG';
    if(j.kelas_kbm)return 'Kelas Aktual DB';
    if(j.kelas_usia)return 'Rekomendasi Usia';
    return 'Belum';
  }

  function isConfirmed(j){
    return !!(j.kelas_kbm || drafts()[String(j.did)]);
  }

  function mappedRows(){
    return rowsBase().map(j=>({
      ...j,
      __umur:umurFromTgl(j.tgl_lahir),
      __rec:recommended(j),
      __actual:actualClass(j)
    }));
  }

  function counts(){
    const rows=mappedRows();
    const by=Object.fromEntries(CLASSES.map(k=>[k,0]));
    rows.forEach(j=>{ if(j.__actual in by)by[j.__actual]++; });
    const d=drafts();
    return {
      rows,by,total:rows.length,
      actualDb:rows.filter(j=>!!j.kelas_kbm).length,
      draft:rows.filter(j=>!!d[String(j.did)]).length,
      pending:rows.filter(j=>!isConfirmed(j)).length
    };
  }

  function filteredRows(){
    const q=search.trim().toLowerCase();
    return mappedRows()
      .filter(j=>!group||j.kelompok_nama===group)
      .filter(j=>!classFilter||j.__actual===classFilter)
      .filter(j=>!q||`${j.nama||''} ${j.nama_kk||''} ${j.kelompok_nama||''}`.toLowerCase().includes(q))
      .sort((a,b)=>
        String(a.kelompok_nama||'').localeCompare(String(b.kelompok_nama||''),'id') ||
        (CLASSES.indexOf(a.__actual)-CLASSES.indexOf(b.__actual)) ||
        String(a.nama||'').localeCompare(String(b.nama||''),'id')
      );
  }

  function compactPortal(){
    const portal=document.getElementById('ppg-portal');
    if(!portal)return;

    const sub=portal.querySelector('.ppg-portal-sub');
    if(sub)sub.textContent='Pilih mode';

    const cards=portal.querySelectorAll('.ppg-mode-card');
    if(cards[0]){
      const d=cards[0].querySelector('.ppg-mode-desc');
      if(d)d.textContent='Data jamaah, pengurus, acara dan administrasi.';
    }
    if(cards[1]){
      const d=cards[1].querySelector('.ppg-mode-desc');
      if(d)d.textContent='Kelas KBM, kehadiran, kurikulum dan perkembangan.';
    }

    const footer=portal.querySelector('.ppg-portal-footer');
    if(footer)footer.textContent='Database Perwira · PPG Perwira';

    const scope=document.getElementById('ppg-portal-scope');
    if(scope)scope.textContent=scopeText();

    const ok=ppgCanAccess();
    const card=document.getElementById('ppg-mode-card');
    const btn=document.getElementById('ppg-mode-action');
    const note=document.getElementById('ppg-access-note');
    card?.classList.toggle('disabled',!ok);
    if(btn)btn.textContent=ok?'Masuk PPG Perwira →':'Tidak ada akses';
    if(note)note.textContent=ok?'':'Khusus pengurus PPG terkait';
  }

  window.ppgShowPortal=function(){
    if(typeof ppgInjectDom==='function')ppgInjectDom();
    const portal=document.getElementById('ppg-portal');
    if(!portal)return;
    const u=document.getElementById('ppg-portal-user-name');
    if(u)u.textContent=CU?.nama||CU?.username||'-';
    compactPortal();
    portal.classList.add('show');
  };

  window.ppgChoosePPG=function(){
    if(!ppgCanAccess()){
      toast('Akses PPG khusus Master User, MT, MS, KI, Wakil KI, atau Penerobos sesuai scope.',true);
      return;
    }
    if(typeof ppgInjectDom==='function')ppgInjectDom();
    document.getElementById('ppg-portal')?.classList.remove('show');
    document.getElementById('ppg-shell')?.classList.add('show');
    const un=document.getElementById('ppg-user-name');
    if(un)un.textContent=CU?.nama||CU?.username||'-';
    const sc=document.getElementById('ppg-scope-text');
    if(sc)sc.textContent=scopeText();
    renderAll();
    ppgOpenPage('dashboard',document.querySelector('.ppg-tab[data-page="dashboard"]'));
  };

  window.ppgChooseDatabase=function(){
    document.getElementById('ppg-portal')?.classList.remove('show');
    document.getElementById('ppg-shell')?.classList.remove('show');
  };

  window.ppgBackPortal=function(){
    document.getElementById('ppg-shell')?.classList.remove('show');
    ppgShowPortal();
  };

  window.ppgOpenPage=function(page,btn){
    document.querySelectorAll('.ppg-page').forEach(x=>x.classList.remove('active'));
    document.querySelectorAll('.ppg-tab').forEach(x=>x.classList.remove('active'));
    document.getElementById('ppg-page-'+page)?.classList.add('active');
    btn?.classList.add('active');
    renderPage(page);
  };

  function renderPage(page){
    if(page==='dashboard')renderDashboard();
    else if(page==='setup')renderSetup();
    else if(page==='kelas')renderKelas();
    else if(page==='absen')renderAbsen();
    else if(page==='kurikulum')renderKurikulum();
    else if(page==='generus')renderGenerus();
    else if(page==='laporan')renderLaporan();
  }

  function stage(title,sub,right='● Data aktual'){
    return `<div class="ppg-v33-stage">
      <div><div class="ppg-v33-stage-title">${title}</div><div class="ppg-v33-stage-sub">${sub}</div></div>
      <span class="ppg-v33-live">${right}</span>
    </div>`;
  }

  function renderDashboard(){
    const el=document.getElementById('ppg-page-dashboard'); if(!el)return;
    const c=counts();
    const max=Math.max(1,...Object.values(c.by));
    el.innerHTML=`
      ${stage('Tahap 1 · Data Aktual & Setup Kelas','PPG membaca jamaah_desa dari Database Perwira.')}
      <div class="ppg-grid-4">
        <div class="ppg-stat"><div class="ppg-stat-label">Generus</div><div class="ppg-stat-value">${c.total}</div><div class="ppg-stat-sub">${esc(scopeText())}</div></div>
        <div class="ppg-stat"><div class="ppg-stat-label">Kelas aktual DB</div><div class="ppg-stat-value">${c.actualDb}</div><div class="ppg-stat-sub">kelas_kbm</div></div>
        <div class="ppg-stat"><div class="ppg-stat-label">Draft kelas</div><div class="ppg-stat-value">${c.draft}</div><div class="ppg-stat-sub">belum ke database</div></div>
        <div class="ppg-stat"><div class="ppg-stat-label">Perlu konfirmasi</div><div class="ppg-stat-value">${c.pending}</div><div class="ppg-stat-sub">masih kelas usia</div></div>
      </div>
      <div class="ppg-v33-class-summary">
        ${CLASSES.map(k=>`<div class="ppg-v33-class-chip"><div class="num">${c.by[k]||0}</div><div class="lbl">${esc(k)}</div></div>`).join('')}
      </div>
      <div class="ppg-grid-3">
        <div class="ppg-panel">
          <div class="ppg-panel-head"><div><div class="ppg-panel-title">Distribusi Kelas</div><div class="ppg-panel-sub">Aktual / draft / rekomendasi usia</div></div></div>
          <div class="ppg-panel-body ppg-class-bars">
            ${CLASSES.map(k=>`<div class="ppg-class-bar">
              <span>${esc(k)}</span>
              <div class="ppg-bar-track"><div class="ppg-bar-fill" style="width:${Math.round((c.by[k]||0)/max*100)}%"></div></div>
              <b>${c.by[k]||0}</b>
            </div>`).join('')}
          </div>
        </div>
        <div class="ppg-panel">
          <div class="ppg-panel-head"><div><div class="ppg-panel-title">Kehadiran KBM</div><div class="ppg-panel-sub">Roster aktual sudah bisa dicoba</div></div></div>
          <div class="ppg-panel-body"><div class="ppg-empty"><div class="ppg-empty-icon">✅</div>Peserta diambil dari kelas aktual/draft.<br><span class="ppg-mini-note">Penyimpanan permanen masuk Tahap 2.</span></div></div>
        </div>
        <div class="ppg-panel">
          <div class="ppg-panel-head"><div><div class="ppg-panel-title">Kurikulum</div><div class="ppg-panel-sub">Belum diisi sebelum struktur disepakati</div></div></div>
          <div class="ppg-panel-body"><div class="ppg-empty"><div class="ppg-empty-icon">📘</div>Siap dikembangkan setelah backend kelas & KBM.</div></div>
        </div>
      </div>`;
  }

  function filtersHtml(target){
    return `<div class="ppg-toolbar">
      <input class="ppg-input" placeholder="Cari nama / KK..." value="${esc(search)}"
        oninput="window.ppgV33SetFilter('search',this.value,'${target}')">
      <select class="ppg-select" onchange="window.ppgV33SetFilter('group',this.value,'${target}')">
        <option value="">Semua Kelompok</option>
        ${['PW1','PW2','PW3','PW4'].map(k=>`<option value="${k}" ${group===k?'selected':''}>${k}</option>`).join('')}
      </select>
      <select class="ppg-select" onchange="window.ppgV33SetFilter('class',this.value,'${target}')">
        <option value="">Semua Kelas</option>
        ${CLASSES.map(k=>`<option value="${esc(k)}" ${classFilter===k?'selected':''}>${esc(k)}</option>`).join('')}
      </select>
      <button class="ppg-btn secondary" onclick="window.ppgV33ClearFilter('${target}')">Reset</button>
    </div>`;
  }

  window.ppgV33SetFilter=function(type,val,target){
    if(type==='search')search=val;
    if(type==='group')group=val;
    if(type==='class')classFilter=val;
    target==='setup'?renderSetup():renderGenerus();
  };
  window.ppgV33ClearFilter=function(target){
    search=''; group=''; classFilter='';
    target==='setup'?renderSetup():renderGenerus();
  };

  function renderSetup(){
    const el=document.getElementById('ppg-page-setup'); if(!el)return;
    const rows=filteredRows();
    const d=drafts();

    el.innerHTML=`
      ${stage('Setup Kelas Aktual','Rekomendasi membaca kelas_usia; penetapan akhir akan disimpan sebagai kelas PPG.')}
      <div class="ppg-v33-info">
        Istilah kelas mengikuti data aktual: <b>Balita · Cabe Rawit Tahap A · Cabe Rawit Tahap B · Pra Remaja · Remaja · Dewasa</b>.
      </div>
      <div class="ppg-panel" style="margin-top:0">
        <div class="ppg-panel-head">
          <div><div class="ppg-panel-title">Konfirmasi Kelas Generus</div><div class="ppg-panel-sub">${rows.length} data tampil</div></div>
          <button class="ppg-btn secondary" onclick="ppgApplyRecommendations()">Jadikan Semua Rekomendasi sebagai Draft</button>
        </div>
        <div class="ppg-panel-body">${filtersHtml('setup')}</div>
        <div class="ppg-table-wrap">
          <table class="ppg-table">
            <thead><tr><th>No</th><th>Nama</th><th>Kelompok</th><th>Umur</th><th>Rekomendasi Usia</th><th>Kelas Aktual / Draft</th><th>Status</th></tr></thead>
            <tbody>${rows.map((j,i)=>{
              const hasDraft=!!d[String(j.did)];
              const confirmed=!!j.kelas_kbm||hasDraft;
              return `<tr>
                <td>${i+1}</td>
                <td><b>${esc(j.nama)}</b><div class="ppg-mini-note">KK: ${esc(j.nama_kk||'-')}</div></td>
                <td>${esc(j.kelompok_nama||'-')}</td>
                <td>${j.__umur??'—'}</td>
                <td>${j.__rec?`<span class="ppg-badge">${esc(j.__rec)}</span>`:'—'}</td>
                <td>
                  <select onchange="ppgSetClass('${esc(j.did)}',this.value)">
                    <option value="">Belum ditentukan</option>
                    ${CLASSES.map(k=>`<option value="${esc(k)}" ${j.__actual===k?'selected':''}>${esc(k)}</option>`).join('')}
                  </select>
                  <div class="ppg-v33-source">${esc(sourceLabel(j))}</div>
                </td>
                <td><span class="ppg-badge ${confirmed?'ppg-v33-confirmed':'ppg-v33-pending'}">${confirmed?'Sudah ditetapkan':'Perlu konfirmasi'}</span></td>
              </tr>`;
            }).join('')}</tbody>
          </table>
        </div>
      </div>`;
  }

  window.ppgSetClass=function(did,val){
    const d=drafts();
    if(val)d[String(did)]=val;
    else delete d[String(did)];
    saveDrafts(d);
    renderAll();
  };

  window.ppgApplyRecommendations=function(){
    const d=drafts();
    rowsBase().forEach(j=>{
      const rec=recommended(j);
      if(!j.kelas_kbm&&!d[String(j.did)]&&rec)d[String(j.did)]=rec;
    });
    saveDrafts(d);
    renderAll();
    toast('Rekomendasi usia sudah dijadikan draft kelas PPG.');
  };

  window.ppgResetPrototypeClasses=function(){
    localStorage.removeItem(DRAFT_KEY);
    renderAll();
    toast('Draft kelas PPG di-reset.');
  };

  function renderKelas(){
    const el=document.getElementById('ppg-page-kelas'); if(!el)return;
    const c=counts();
    el.innerHTML=`
      ${stage('Kelas KBM','Jumlah peserta mengikuti kelas aktual, draft, atau rekomendasi usia.')}
      <div class="ppg-class-cards">
        ${CLASSES.map(k=>`<div class="ppg-class-card" onclick="window.ppgV33OpenClass('${esc(k)}')">
          <div class="ppg-class-title">${esc(k)}</div>
          <div class="ppg-class-num">${c.by[k]||0}</div>
          <div class="ppg-class-age">peserta</div>
        </div>`).join('')}
      </div>
      <div class="ppg-panel">
        <div class="ppg-panel-head"><div><div class="ppg-panel-title">Tahap berikutnya</div><div class="ppg-panel-sub">Kelas per scope, pengajar, jadwal, tempat dan sesi KBM.</div></div></div>
      </div>`;
  }

  window.ppgV33OpenClass=function(k){
    classFilter=k;
    ppgOpenPage('generus',document.querySelector('.ppg-tab[data-page="generus"]'));
  };

  function todayJakarta(){
    try{return new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Jakarta',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date())}
    catch(_e){return ubnbWibIso84().slice(0,10)}
  }

  function renderAbsen(){
    const el=document.getElementById('ppg-page-absen'); if(!el)return;
    el.innerHTML=`
      ${stage('Kehadiran KBM · Prototype','Roster peserta sudah memakai data aktual kelas.')}
      <div class="ppg-panel" style="margin-top:0">
        <div class="ppg-panel-body">
          <div class="ppg-att-setup">
            <select id="ppg-att-class" class="ppg-select">${CLASSES.map(k=>`<option value="${esc(k)}">${esc(k)}</option>`).join('')}</select>
            <input id="ppg-att-date" class="ppg-input" type="date" value="${todayJakarta()}">
            <input id="ppg-att-title" class="ppg-input" placeholder="Materi / kegiatan KBM">
            <button class="ppg-btn" onclick="ppgStartAttendance()">Mulai Absensi</button>
          </div>
        </div>
        <div id="ppg-att-roster"></div>
      </div>`;
  }

  window.ppgStartAttendance=function(){
    const cls=document.getElementById('ppg-att-class')?.value||'';
    const rows=mappedRows()
      .filter(j=>j.__actual===cls)
      .sort((a,b)=>String(a.kelompok_nama||'').localeCompare(String(b.kelompok_nama||''),'id')||String(a.nama||'').localeCompare(String(b.nama||''),'id'));
    const box=document.getElementById('ppg-att-roster'); if(!box)return;

    box.innerHTML=rows.length?`
      <div class="ppg-table-wrap">
        <table class="ppg-table">
          <thead><tr><th>No</th><th>Nama</th><th>Kelompok</th><th>Status</th><th>Catatan</th></tr></thead>
          <tbody>${rows.map((j,i)=>`<tr>
            <td>${i+1}</td><td><b>${esc(j.nama)}</b></td><td>${esc(j.kelompok_nama||'-')}</td>
            <td><select class="ppg-roster-status"><option>Hadir</option><option>Izin</option><option>Sakit</option><option>Tidak Hadir</option><option>Terlambat</option></select></td>
            <td><input class="ppg-input" placeholder="Opsional"></td>
          </tr>`).join('')}</tbody>
        </table>
      </div>
      <div class="ppg-panel-body"><span class="ppg-mini-note">Tahap 1: roster dan input sudah berfungsi; penyimpanan permanen dibuat pada Tahap 2.</span></div>`
      :'<div class="ppg-empty">Belum ada peserta pada kelas ini.</div>';
  };

  function renderKurikulum(){
    const el=document.getElementById('ppg-page-kurikulum'); if(!el)return;
    el.innerHTML=`
      ${stage('Kurikulum PPG','Struktur disiapkan, isi materi belum dibuat sebelum sumber kurikulum disepakati.','Tahap 3')}
      <div class="ppg-panel" style="margin-top:0">
        <div class="ppg-panel-body">
          <div class="ppg-hierarchy">
            <div><b>Kelas</b>6 kelas aktual</div>
            <div><b>Bidang / Mata Materi</b>Kelompok materi</div>
            <div><b>Bab / Kompetensi</b>Target kemampuan</div>
            <div><b>Materi</b>Item penguasaan individu</div>
          </div>
        </div>
      </div>`;
  }

  function renderGenerus(){
    const el=document.getElementById('ppg-page-generus'); if(!el)return;
    const rows=filteredRows();
    el.innerHTML=`
      ${stage('Data Generus','Identitas dari Database Perwira; pembinaan akan menjadi data PPG.')}
      <div class="ppg-panel" style="margin-top:0">
        <div class="ppg-panel-body">${filtersHtml('generus')}</div>
        <div class="ppg-table-wrap">
          <table class="ppg-table">
            <thead><tr><th>No</th><th>Nama</th><th>Kelompok</th><th>Umur</th><th>Rekomendasi</th><th>Kelas</th><th>Kehadiran</th><th>Materi</th></tr></thead>
            <tbody>${rows.map((j,i)=>`<tr>
              <td>${i+1}</td>
              <td><b>${esc(j.nama)}</b><div class="ppg-mini-note">KK: ${esc(j.nama_kk||'-')}</div></td>
              <td>${esc(j.kelompok_nama||'-')}</td>
              <td>${j.__umur??'—'}</td>
              <td>${esc(j.__rec||'—')}</td>
              <td><span class="ppg-badge">${esc(j.__actual||'—')}</span><div class="ppg-v33-source">${esc(sourceLabel(j))}</div></td>
              <td>—</td><td>—</td>
            </tr>`).join('')}</tbody>
          </table>
        </div>
      </div>`;
  }

  function renderLaporan(){
    const el=document.getElementById('ppg-page-laporan'); if(!el)return;
    const c=counts();
    el.innerHTML=`
      ${stage('Laporan PPG','Akan hidup bertahap mengikuti modul yang sudah permanen.','Rancangan')}
      <div class="ppg-grid-4">
        <div class="ppg-stat"><div class="ppg-stat-label">Kehadiran</div><div class="ppg-stat-value">—</div><div class="ppg-stat-sub">Tahap 2</div></div>
        <div class="ppg-stat"><div class="ppg-stat-label">Penguasaan Materi</div><div class="ppg-stat-value">—</div><div class="ppg-stat-sub">Tahap 3</div></div>
        <div class="ppg-stat"><div class="ppg-stat-label">Belum Konfirmasi Kelas</div><div class="ppg-stat-value">${c.pending}</div><div class="ppg-stat-sub">Sudah aktual</div></div>
        <div class="ppg-stat"><div class="ppg-stat-label">Evaluasi Kenaikan</div><div class="ppg-stat-value">—</div><div class="ppg-stat-sub">Tahap lanjutan</div></div>
      </div>`;
  }

  function renderAll(){
    renderDashboard(); renderSetup(); renderKelas(); renderAbsen();
    renderKurikulum(); renderGenerus(); renderLaporan();
    compactPortal();
  }
  window.ppgRenderAll=renderAll;

  setTimeout(()=>{
    compactPortal();
    if(document.getElementById('ppg-shell')?.classList.contains('show'))renderAll();
  },700);
})();

/* ============================================================
   SOURCE: ubnb-v34-ppg-scope-teacher-script
   ============================================================ */
(function(){
  const SCOPE_KEY='ubnb_ppg_v34_scope';
  const TEACHER_ASSIGN_KEY='ubnb_ppg_v34_teacher_assign';
  const ATT_KEY='ubnb_ppg_v34_attendance';

  const CLASSES34=[
    'Balita','Cabe Rawit Tahap A','Cabe Rawit Tahap B',
    'Pra Remaja','Remaja','Dewasa'
  ];

  let PPG34_SCOPE=null;
  let teacherSearch='';

  const e34=s=>String(s??'').replace(/[&<>"']/g,m=>(
    {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]
  ));
  const n34=s=>String(s||'').trim().toLowerCase().replace(/[._/-]+/g,' ').replace(/\s+/g,' ');

  function roleAllowed34(label){
    const x=' '+n34(label)+' ';
    return /(^|\s)mt(\s|$)/.test(x) ||
           /(^|\s)ms(\s|$)/.test(x) ||
           /(^|\s)ki(\s|$)/.test(x) ||
           x.includes('wakil ki') || x.includes('wk ki') ||
           x.includes('penerobos');
  }
  function teacherRole34(label){
    const x=' '+n34(label)+' ';
    return /(^|\s)mt(\s|$)/.test(x) || /(^|\s)ms(\s|$)/.test(x);
  }
  function activePeng34(){
    return (Array.isArray(aPengurus)?aPengurus:[]).filter(p=>p&&p.aktif!==false);
  }
  function isMaster34(){
    if(!CU)return false;
    const r=n34(CU.role);
    let p=CU.permissions;
    try{if(typeof p==='string')p=JSON.parse(p)}catch(_e){}
    return CU.is_master===true||CU.master===true||
      ['master','master admin','master_admin'].includes(r)||
      (Array.isArray(p)&&p.some(x=>['master','master admin','master_admin'].includes(n34(x))))||
      (p&&typeof p==='object'&&(p.master===true||p.master_admin===true));
  }

  function myRoles34(){
    if(!CU?.did)return [];
    return activePeng34().filter(p=>String(p.did)===String(CU.did)&&roleAllowed34(p.dapukan));
  }

  function availableScopes34(){
    const out=[];
    const seen=new Set();
    const master=isMaster34();
    const roles=myRoles34();

    if(master || roles.some(r=>r.level==='desa')){
      out.push({type:'controller',kelompok:null,label:'Controller Desa',meta:'Monitoring seluruh PPG Desa Perwira'});
      seen.add('controller');
    }

    let groups=[];
    if(master){
      groups=['PW1','PW2','PW3','PW4'];
    }else{
      groups=roles
        .filter(r=>r.level==='kelompok'&&r.kelompok_nama)
        .map(r=>r.kelompok_nama);
      if(CU?.kelompok_scope)groups=groups.filter(g=>g===CU.kelompok_scope);
    }
    [...new Set(groups)].sort().forEach(g=>{
      if(!seen.has(g)){
        out.push({type:'kelompok',kelompok:g,label:`Kelompok ${g}`,meta:`Operasional KBM ${g}`});
        seen.add(g);
      }
    });

    // Akun pengurus kelompok harus tetap masuk ke kelompoknya sendiri.
    if(!master && CU?.kelompok_scope && !seen.has(CU.kelompok_scope)){
      const hasAllowed=(CU.dapukan||[]).some(x=>roleAllowed34(typeof x==='string'?x:x?.dapukan));
      if(hasAllowed)out.push({type:'kelompok',kelompok:CU.kelompok_scope,label:`Kelompok ${CU.kelompok_scope}`,meta:`Operasional KBM ${CU.kelompok_scope}`});
    }
    return out;
  }

  function scopeRows34(rows){
    if(!PPG34_SCOPE)return [];
    if(PPG34_SCOPE.type==='kelompok')return rows.filter(j=>j.kelompok_nama===PPG34_SCOPE.kelompok);
    return rows;
  }

  function injectScopeGate34(){
    if(document.getElementById('ppg-scope-gate'))return;
    document.body.insertAdjacentHTML('beforeend',`
      <div id="ppg-scope-gate">
        <div class="ppg-scope-card">
          <div class="ppg-scope-head">
            <div class="ppg-scope-title">Pilih Scope PPG</div>
            <div class="ppg-scope-sub">Scope ditentukan dari dapukan aktif Anda</div>
          </div>
          <div id="ppg-scope-list" class="ppg-scope-list"></div>
          <div class="ppg-scope-foot"><button type="button" onclick="ppgScopeCancel34()">← Kembali</button></div>
        </div>
      </div>`);
  }

  function showScopeGate34(){
    injectScopeGate34();
    const scopes=availableScopes34();
    const box=document.getElementById('ppg-scope-list');
    box.innerHTML=scopes.length?scopes.map((s,i)=>`
      <button class="ppg-scope-option" onclick="ppgSelectScope34(${i})">
        <div class="title">${e34(s.label)}</div>
        <div class="meta">${e34(s.meta)}</div>
      </button>`).join('')
      :'<div class="ppg-empty">Tidak ada scope PPG yang sesuai dengan dapukan aktif.</div>';
    window.__PPG34_SCOPE_OPTIONS=scopes;
    document.getElementById('ppg-scope-gate').classList.add('show');
  }

  window.ppgSelectScope34=function(i){
    const s=window.__PPG34_SCOPE_OPTIONS?.[i];
    if(!s)return;
    PPG34_SCOPE=s;
    sessionStorage.setItem(SCOPE_KEY,JSON.stringify(s));
    document.getElementById('ppg-scope-gate')?.classList.remove('show');
    enterPPG34();
  };
  window.ppgScopeCancel34=function(){
    document.getElementById('ppg-scope-gate')?.classList.remove('show');
    ppgShowPortal();
  };

  function setScopeUI34(){
    const label=PPG34_SCOPE?.label||'-';
    const scopeText=document.getElementById('ppg-scope-text');
    if(scopeText)scopeText.textContent=label;
    const brand=document.querySelector('#ppg-shell .ppg-brand-sub');
    if(brand)brand.innerHTML=`Program Pembinaan Generasi Penerus · <span class="ppg-scope-chip">${e34(label)}</span>`;
    document.body.classList.toggle('ppg-controller-mode',PPG34_SCOPE?.type==='controller');

    const setupTab=document.querySelector('.ppg-tab[data-page="setup"]');
    if(setupTab)setupTab.style.display=PPG34_SCOPE?.type==='controller'?'none':'';
  }

  function enterPPG34(){
    document.getElementById('ppg-portal')?.classList.remove('show');
    document.getElementById('ppg-shell')?.classList.add('show');
    const un=document.getElementById('ppg-user-name');
    if(un)un.textContent=CU?.nama||CU?.username||'-';
    setScopeUI34();
    ensureTeacherTab34();
    renderAll34();
    ppgOpenPage('dashboard',document.querySelector('.ppg-tab[data-page="dashboard"]'));
  }

  const oldChoosePPG34=window.ppgChoosePPG;
  window.ppgChoosePPG=function(){
    if(!ppgCanAccess()){
      toast('Akses PPG tidak tersedia untuk dapukan ini.',true);
      return;
    }
    document.getElementById('ppg-portal')?.classList.remove('show');
    showScopeGate34();
  };

  const oldBackPortal34=window.ppgBackPortal;
  window.ppgBackPortal=function(){
    document.getElementById('ppg-shell')?.classList.remove('show');
    PPG34_SCOPE=null;
    sessionStorage.removeItem(SCOPE_KEY);
    ppgShowPortal();
  };

  // ---------- data generus scope ----------
  function baseGenerus34(){
    return scopeRows34(
      (Array.isArray(aJamaah)?aJamaah:[])
        .filter(j=>j.status_nikah==='Belum Menikah')
        .filter(j=>j.status_sambung==='Tetap')
    );
  }

  function classDrafts34(){
    try{return JSON.parse(localStorage.getItem('ubnb_ppg_v33_class_drafts')||'{}')||{}}
    catch(_e){return {}}
  }
  function actualClass34(j){
    const d=classDrafts34();
    return d[String(j.did)]||j.kelas_kbm||j.kelas_usia||null;
  }
  function rowsGenerus34(){
    return baseGenerus34().map(j=>({...j,__umur:umurFromTgl(j.tgl_lahir),__actual:actualClass34(j)}));
  }

  // ---------- dewan guru ----------
  function teacherAssignments34(){
    try{return JSON.parse(localStorage.getItem(TEACHER_ASSIGN_KEY)||'{}')||{}}
    catch(_e){return {}}
  }
  function saveTeacherAssignments34(o){
    localStorage.setItem(TEACHER_ASSIGN_KEY,JSON.stringify(o||{}));
  }
  function teacherRows34(){
    const grouped=new Map();
    activePeng34().filter(p=>teacherRole34(p.dapukan)).forEach(p=>{
      if(PPG34_SCOPE?.type==='kelompok' && p.level==='kelompok' && p.kelompok_nama!==PPG34_SCOPE.kelompok)return;
      if(PPG34_SCOPE?.type==='kelompok' && p.level==='desa')return;
      const j=typeof findJamaahAny==='function'?findJamaahAny(p.did):null;
      if(!j)return;
      const key=String(p.did);
      if(!grouped.has(key))grouped.set(key,{
        did:key,nama:j.nama||'-',jenis_kelamin:j.jenis_kelamin||'',
        kelompok_nama:j.kelompok_nama||p.kelompok_nama||'-',
        roles:[],level:p.level
      });
      grouped.get(key).roles.push(p.dapukan||'');
    });
    const ass=teacherAssignments34();
    return [...grouped.values()].map(t=>({...t,kelas:ass[t.did]||'Semua Kelas'}))
      .sort((a,b)=>String(a.kelompok_nama).localeCompare(String(b.kelompok_nama),'id')||a.nama.localeCompare(b.nama,'id'));
  }

  function ensureTeacherTab34(){
    const tabs=document.querySelector('#ppg-shell .ppg-tabs');
    if(!tabs||tabs.querySelector('[data-page="guru"]'))return;
    const kur=tabs.querySelector('[data-page="kurikulum"]');
    const btn=document.createElement('button');
    btn.className='ppg-tab';btn.dataset.page='guru';btn.textContent='Dewan Guru';
    btn.onclick=function(){ppgOpenPage('guru',btn)};
    if(kur)tabs.insertBefore(btn,kur);else tabs.appendChild(btn);

    const body=document.querySelector('#ppg-shell .ppg-body');
    const sec=document.createElement('section');
    sec.id='ppg-page-guru';sec.className='ppg-page';
    body?.appendChild(sec);
  }

  window.ppgTeacherSetClass34=function(did,val){
    if(PPG34_SCOPE?.type==='controller'){
      toast('Controller Desa hanya memonitor data dewan guru.',true);return;
    }
    const a=teacherAssignments34();a[String(did)]=val;saveTeacherAssignments34(a);
    renderGuru34();
  };

  function renderGuru34(){
    const el=document.getElementById('ppg-page-guru');if(!el)return;
    let rows=teacherRows34();
    const q=teacherSearch.trim().toLowerCase();
    if(q)rows=rows.filter(t=>`${t.nama} ${t.kelompok_nama} ${t.roles.join(' ')}`.toLowerCase().includes(q));
    const l=rows.filter(t=>String(t.jenis_kelamin).toUpperCase().startsWith('L')).length;
    const p=rows.filter(t=>String(t.jenis_kelamin).toUpperCase().startsWith('P')).length;
    const assigned=rows.filter(t=>t.kelas&&t.kelas!=='Semua Kelas').length;

    el.innerHTML=`
      <div class="ppg-v33-stage">
        <div><div class="ppg-v33-stage-title">Dewan Guru</div>
        <div class="ppg-v33-stage-sub">Data awal otomatis dari dapukan MT/MS aktif pada scope ini.</div></div>
        <span class="ppg-v33-live">● ${rows.length} guru</span>
      </div>
      ${PPG34_SCOPE?.type==='controller'?'<div class="ppg-controller-note">Controller Desa melihat rekap dewan guru seluruh kelompok. Penetapan kelas binaan dilakukan di scope kelompok.</div>':''}
      <div class="ppg-teacher-summary">
        <div class="ppg-teacher-stat"><div class="n">${rows.length}</div><div class="l">Total Dewan Guru</div></div>
        <div class="ppg-teacher-stat"><div class="n">${l}</div><div class="l">Laki-laki</div></div>
        <div class="ppg-teacher-stat"><div class="n">${p}</div><div class="l">Perempuan</div></div>
        <div class="ppg-teacher-stat"><div class="n">${assigned}</div><div class="l">Kelas Binaan Khusus</div></div>
      </div>
      <div class="ppg-panel" style="margin-top:0">
        <div class="ppg-panel-body">
          <input class="ppg-input" placeholder="Cari nama / dapukan..." value="${e34(teacherSearch)}"
            oninput="teacherSearch=this.value;window.ppgRenderGuru34()">
        </div>
        <div class="ppg-table-wrap">
          <table class="ppg-table">
            <thead><tr><th>No</th><th>Nama</th><th>Kelompok</th><th>Dapukan</th><th>Kelas Binaan</th><th>Status</th></tr></thead>
            <tbody>${rows.map((t,i)=>`<tr>
              <td>${i+1}</td>
              <td><b>${e34(t.nama)}</b><div class="ppg-teacher-origin">Sumber: ubnb_pengurus</div></td>
              <td>${e34(t.kelompok_nama||'-')}</td>
              <td>${e34([...new Set(t.roles)].join(' · '))}</td>
              <td>${PPG34_SCOPE?.type==='controller'
                ?`<span class="ppg-badge">${e34(t.kelas)}</span>`
                :`<select class="ppg-teacher-class-select" onchange="ppgTeacherSetClass34('${e34(t.did)}',this.value)">
                  <option ${t.kelas==='Semua Kelas'?'selected':''}>Semua Kelas</option>
                  ${CLASSES34.map(k=>`<option value="${e34(k)}" ${t.kelas===k?'selected':''}>${e34(k)}</option>`).join('')}
                </select>`}</td>
              <td><span class="ppg-badge ppg-v33-confirmed">Aktif</span></td>
            </tr>`).join('')}</tbody>
          </table>
        </div>
      </div>`;
  }
  window.ppgRenderGuru34=renderGuru34;

  // ---------- attendance persistent prototype ----------
  function attendance34(){
    try{return JSON.parse(localStorage.getItem(ATT_KEY)||'[]')||[]}
    catch(_e){return []}
  }
  function saveAttendance34(a){localStorage.setItem(ATT_KEY,JSON.stringify(a||[]))}

  function scopeId34(){
    return PPG34_SCOPE?.type==='controller'?'DESA':(PPG34_SCOPE?.kelompok||'');
  }
  function today34(){
    try{return new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Jakarta',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date())}
    catch(_e){return ubnbWibIso84().slice(0,10)}
  }
  function statusSelect34(cls,id){
    return `<select class="${cls}" data-id="${e34(id)}">
      <option>Hadir</option><option>Izin</option><option>Sakit</option><option>Tidak Hadir</option><option>Terlambat</option>
    </select>`;
  }

  function renderAttendanceHistory34(container){
    const scope=scopeId34();
    const rows=attendance34().filter(x=>PPG34_SCOPE?.type==='controller'||x.scope===scope)
      .sort((a,b)=>String(b.date).localeCompare(String(a.date))).slice(0,12);
    container.innerHTML=rows.length?`<div class="ppg-att-history">
      ${rows.map(x=>`
        <div class="ppg-att-history-row">
          <b>${e34(x.date)}</b>
          <span>${e34(x.scope)} · ${e34(x.kelas)}<br><span class="ppg-mini-note">${e34(x.title||'KBM')}</span></span>
          <span>${x.students?.filter(s=>s.status==='Hadir').length||0}/${x.students?.length||0} generus</span>
          <span class="hide-mobile">${x.teachers?.filter(s=>s.status==='Hadir').length||0}/${x.teachers?.length||0} guru</span>
        </div>`).join('')}
    </div>`:'<div class="ppg-empty">Belum ada riwayat absensi KBM prototype.</div>';
  }

  function renderAbsen34(){
    const el=document.getElementById('ppg-page-absen');if(!el)return;

    if(PPG34_SCOPE?.type==='controller'){
      el.innerHTML=`
        <div class="ppg-v33-stage">
          <div><div class="ppg-v33-stage-title">Kontrol Kehadiran KBM</div><div class="ppg-v33-stage-sub">Controller Desa memonitor absensi generus dan dewan guru seluruh kelompok.</div></div>
          <span class="ppg-v33-live">Controller Desa</span>
        </div>
        <div class="ppg-controller-note">Input absensi dilakukan dari scope kelompok. Controller Desa melihat rekap seluruh kelompok.</div>
        <div class="ppg-panel" style="margin-top:0"><div class="ppg-panel-head"><div class="ppg-panel-title">Riwayat KBM</div></div><div id="ppg-att-history34" class="ppg-panel-body"></div></div>`;
      renderAttendanceHistory34(document.getElementById('ppg-att-history34'));
      return;
    }

    el.innerHTML=`
      <div class="ppg-v33-stage">
        <div><div class="ppg-v33-stage-title">Kehadiran KBM · ${e34(PPG34_SCOPE?.kelompok||'')}</div>
        <div class="ppg-v33-stage-sub">Satu sesi mengontrol kehadiran generus dan dewan guru.</div></div>
        <span class="ppg-v33-live">Operasional Kelompok</span>
      </div>
      <div class="ppg-panel" style="margin-top:0">
        <div class="ppg-panel-body">
          <div class="ppg-att-setup">
            <select id="ppg34-att-class" class="ppg-select">${CLASSES34.map(k=>`<option value="${e34(k)}">${e34(k)}</option>`).join('')}</select>
            <input id="ppg34-att-date" class="ppg-input" type="date" value="${today34()}">
            <input id="ppg34-att-title" class="ppg-input" placeholder="Materi / kegiatan KBM">
            <button class="ppg-btn" onclick="ppgStartAttendance34()">Mulai KBM</button>
          </div>
        </div>
        <div id="ppg34-att-roster"></div>
      </div>
      <div class="ppg-panel">
        <div class="ppg-panel-head"><div><div class="ppg-panel-title">Riwayat KBM Prototype</div><div class="ppg-panel-sub">Tersimpan di browser sampai backend PPG dibuat.</div></div></div>
        <div id="ppg-att-history34" class="ppg-panel-body"></div>
      </div>`;
    renderAttendanceHistory34(document.getElementById('ppg-att-history34'));
  }

  window.ppgStartAttendance34=function(){
    const kelas=document.getElementById('ppg34-att-class')?.value||'';
    const students=rowsGenerus34().filter(j=>j.__actual===kelas);
    const teachers=teacherRows34().filter(t=>t.kelas==='Semua Kelas'||t.kelas===kelas);
    const box=document.getElementById('ppg34-att-roster');if(!box)return;

    box.innerHTML=`
      <div class="ppg-att-split">
        <div class="ppg-att-box">
          <div class="ppg-att-box-head"><span class="ppg-att-box-title">Generus</span><span class="ppg-att-count">${students.length} peserta</span></div>
          <div class="ppg-table-wrap"><table class="ppg-table" style="min-width:520px">
            <thead><tr><th>No</th><th>Nama</th><th>Status</th><th>Catatan</th></tr></thead>
            <tbody>${students.map((j,i)=>`<tr>
              <td>${i+1}</td><td><b>${e34(j.nama)}</b></td>
              <td>${statusSelect34('ppg34-student-status',j.did)}</td>
              <td><input class="ppg-input ppg34-student-note" data-id="${e34(j.did)}" placeholder="Opsional"></td>
            </tr>`).join('')}</tbody>
          </table></div>
        </div>
        <div class="ppg-att-box">
          <div class="ppg-att-box-head"><span class="ppg-att-box-title">Dewan Guru</span><span class="ppg-att-count">${teachers.length} guru</span></div>
          <div class="ppg-table-wrap"><table class="ppg-table" style="min-width:460px">
            <thead><tr><th>No</th><th>Nama</th><th>Status</th><th>Catatan</th></tr></thead>
            <tbody>${teachers.map((t,i)=>`<tr>
              <td>${i+1}</td><td><b>${e34(t.nama)}</b><div class="ppg-mini-note">${e34(t.roles.join(' · '))}</div></td>
              <td>${statusSelect34('ppg34-teacher-status',t.did)}</td>
              <td><input class="ppg-input ppg34-teacher-note" data-id="${e34(t.did)}" placeholder="Opsional"></td>
            </tr>`).join('')}</tbody>
          </table></div>
        </div>
      </div>
      <div class="ppg-att-savebar">
        <span class="ppg-att-summary">Sesi ${e34(kelas)} · ${students.length} generus · ${teachers.length} dewan guru</span>
        <button class="ppg-btn" onclick="ppgSaveAttendance34()">Simpan Sesi Prototype</button>
      </div>`;
  };

  window.ppgSaveAttendance34=function(){
    const kelas=document.getElementById('ppg34-att-class')?.value||'';
    const date=document.getElementById('ppg34-att-date')?.value||today34();
    const title=document.getElementById('ppg34-att-title')?.value||'KBM';

    const snote={};document.querySelectorAll('.ppg34-student-note').forEach(x=>snote[x.dataset.id]=x.value||'');
    const tnote={};document.querySelectorAll('.ppg34-teacher-note').forEach(x=>tnote[x.dataset.id]=x.value||'');

    const students=[...document.querySelectorAll('.ppg34-student-status')].map(x=>{
      const j=(Array.isArray(aJamaah)?aJamaah:[]).find(y=>String(y.did)===String(x.dataset.id));
      return {did:x.dataset.id,nama:j?.nama||'',status:x.value,note:snote[x.dataset.id]||''};
    });
    const teacherMap=new Map(teacherRows34().map(t=>[String(t.did),t]));
    const teachers=[...document.querySelectorAll('.ppg34-teacher-status')].map(x=>{
      const t=teacherMap.get(String(x.dataset.id));
      return {did:x.dataset.id,nama:t?.nama||'',status:x.value,note:tnote[x.dataset.id]||''};
    });

    const all=attendance34();
    const key=[scopeId34(),date,kelas,title].join('|');
    const rec={key,scope:scopeId34(),date,kelas,title,students,teachers,saved_at:ubnbWibIso84()};
    const ix=all.findIndex(x=>x.key===key);
    if(ix>=0)all[ix]=rec;else all.push(rec);
    saveAttendance34(all);
    toast('Sesi KBM prototype tersimpan.');
    renderAbsen34();
    renderDashboard34();
  };

  // ---------- dashboard scope-aware ----------
  function renderDashboard34(){
    const el=document.getElementById('ppg-page-dashboard');if(!el)return;
    const rows=rowsGenerus34();
    const by=Object.fromEntries(CLASSES34.map(k=>[k,0]));
    rows.forEach(j=>{if(j.__actual in by)by[j.__actual]++});
    const teachers=teacherRows34();
    const att=attendance34().filter(x=>PPG34_SCOPE?.type==='controller'||x.scope===scopeId34());
    const studentPresent=att.reduce((n,x)=>n+(x.students||[]).filter(s=>s.status==='Hadir').length,0);
    const studentTotal=att.reduce((n,x)=>n+(x.students||[]).length,0);
    const teacherPresent=att.reduce((n,x)=>n+(x.teachers||[]).filter(s=>s.status==='Hadir').length,0);
    const teacherTotal=att.reduce((n,x)=>n+(x.teachers||[]).length,0);

    el.innerHTML=`
      <div class="ppg-v33-stage">
        <div><div class="ppg-v33-stage-title">${PPG34_SCOPE?.type==='controller'?'Controller Desa':'PPG '+e34(PPG34_SCOPE?.kelompok||'')}</div>
        <div class="ppg-v33-stage-sub">${PPG34_SCOPE?.type==='controller'?'Monitoring seluruh kelompok':'Operasional pembinaan dan KBM kelompok'}</div></div>
        <span class="ppg-v33-live">● Data aktual</span>
      </div>
      <div class="ppg-grid-4">
        <div class="ppg-stat"><div class="ppg-stat-label">Generus</div><div class="ppg-stat-value">${rows.length}</div><div class="ppg-stat-sub">${e34(PPG34_SCOPE?.label||'')}</div></div>
        <div class="ppg-stat"><div class="ppg-stat-label">Dewan Guru</div><div class="ppg-stat-value">${teachers.length}</div><div class="ppg-stat-sub">MT/MS aktif</div></div>
        <div class="ppg-stat"><div class="ppg-stat-label">Sesi KBM Prototype</div><div class="ppg-stat-value">${att.length}</div><div class="ppg-stat-sub">tersimpan di browser</div></div>
        <div class="ppg-stat"><div class="ppg-stat-label">Hadir Guru</div><div class="ppg-stat-value">${teacherTotal?Math.round(teacherPresent/teacherTotal*100):0}%</div><div class="ppg-stat-sub">${teacherPresent}/${teacherTotal} catatan hadir</div></div>
      </div>
      <div class="ppg-v33-class-summary">
        ${CLASSES34.map(k=>`<div class="ppg-v33-class-chip"><div class="num">${by[k]||0}</div><div class="lbl">${e34(k)}</div></div>`).join('')}
      </div>
      <div class="ppg-grid-3">
        <div class="ppg-panel"><div class="ppg-panel-head"><div><div class="ppg-panel-title">Kehadiran Generus</div><div class="ppg-panel-sub">Dari sesi prototype tersimpan</div></div></div>
          <div class="ppg-panel-body"><div class="ppg-stat-value">${studentTotal?Math.round(studentPresent/studentTotal*100):0}%</div><div class="ppg-mini-note">${studentPresent}/${studentTotal} catatan hadir</div></div></div>
        <div class="ppg-panel"><div class="ppg-panel-head"><div><div class="ppg-panel-title">Kehadiran Dewan Guru</div><div class="ppg-panel-sub">Kontrol guru saat KBM</div></div></div>
          <div class="ppg-panel-body"><div class="ppg-stat-value">${teacherTotal?Math.round(teacherPresent/teacherTotal*100):0}%</div><div class="ppg-mini-note">${teacherPresent}/${teacherTotal} catatan hadir</div></div></div>
        <div class="ppg-panel"><div class="ppg-panel-head"><div><div class="ppg-panel-title">Kurikulum</div><div class="ppg-panel-sub">Tahap sesudah backend KBM</div></div></div>
          <div class="ppg-panel-body"><div class="ppg-empty">Struktur siap dikembangkan.</div></div></div>
      </div>`;
  }

  // ---------- setup / generus scope-aware ----------
  function currentFilterVals34(){
    // reuse v33 global filters indirectly from DOM if present
    return {};
  }

  function renderSetup34(){
    const el=document.getElementById('ppg-page-setup');if(!el)return;
    if(PPG34_SCOPE?.type==='controller'){
      el.innerHTML='<div class="ppg-controller-note">Setup Kelas dilakukan di scope kelompok. Controller Desa hanya melakukan monitoring.</div>';
      return;
    }
    // Reuse v33 setup then filter table rows by scope through temporary aJamaah proxy is risky;
    // render compact scope-specific version directly.
    const d=classDrafts34();
    const rows=rowsGenerus34().sort((a,b)=>
      CLASSES34.indexOf(a.__actual)-CLASSES34.indexOf(b.__actual)||
      String(a.nama||'').localeCompare(String(b.nama||''),'id'));

    el.innerHTML=`
      <div class="ppg-v33-stage"><div><div class="ppg-v33-stage-title">Setup Kelas · ${e34(PPG34_SCOPE.kelompok)}</div>
      <div class="ppg-v33-stage-sub">Konfirmasi kelas aktual generus pada kelompok ini.</div></div><span class="ppg-v33-live">● ${rows.length} generus</span></div>
      <div class="ppg-panel" style="margin-top:0">
        <div class="ppg-panel-head"><div><div class="ppg-panel-title">Kelas Aktual</div><div class="ppg-panel-sub">Rekomendasi awal dari kelas_usia Database Perwira.</div></div>
          <button class="ppg-btn secondary" onclick="ppgApplyRecommendations()">Jadikan Rekomendasi sebagai Draft</button></div>
        <div class="ppg-table-wrap"><table class="ppg-table">
          <thead><tr><th>No</th><th>Nama</th><th>Umur</th><th>Rekomendasi</th><th>Kelas Aktual / Draft</th><th>Status</th></tr></thead>
          <tbody>${rows.map((j,i)=>`<tr>
            <td>${i+1}</td><td><b>${e34(j.nama)}</b><div class="ppg-mini-note">KK: ${e34(j.nama_kk||'-')}</div></td>
            <td>${j.__umur??'—'}</td><td>${e34(j.kelas_usia||'—')}</td>
            <td><select onchange="ppgSetClass('${e34(j.did)}',this.value)">
              <option value="">Belum ditentukan</option>
              ${CLASSES34.map(k=>`<option value="${e34(k)}" ${j.__actual===k?'selected':''}>${e34(k)}</option>`).join('')}
            </select></td>
            <td><span class="ppg-badge ${j.kelas_kbm||d[String(j.did)]?'ppg-v33-confirmed':'ppg-v33-pending'}">${j.kelas_kbm||d[String(j.did)]?'Ditetapkan':'Perlu konfirmasi'}</span></td>
          </tr>`).join('')}</tbody>
        </table></div>
      </div>`;
  }

  const oldSetClass34=window.ppgSetClass;
  window.ppgSetClass=function(did,val){
    if(PPG34_SCOPE?.type==='controller'){toast('Controller Desa tidak mengubah kelas.',true);return}
    if(typeof oldSetClass34==='function')oldSetClass34(did,val);
    setTimeout(renderAll34,0);
  };

  function renderKelas34(){
    const el=document.getElementById('ppg-page-kelas');if(!el)return;
    const rows=rowsGenerus34();const by=Object.fromEntries(CLASSES34.map(k=>[k,0]));
    rows.forEach(j=>{if(j.__actual in by)by[j.__actual]++});
    el.innerHTML=`
      <div class="ppg-v33-stage"><div><div class="ppg-v33-stage-title">Kelas KBM</div>
      <div class="ppg-v33-stage-sub">${e34(PPG34_SCOPE?.label||'')}</div></div><span class="ppg-v33-live">● Data aktual</span></div>
      <div class="ppg-class-cards">${CLASSES34.map(k=>`<div class="ppg-class-card">
        <div class="ppg-class-title">${e34(k)}</div><div class="ppg-class-num">${by[k]}</div><div class="ppg-class-age">peserta</div>
      </div>`).join('')}</div>`;
  }

  function renderGenerus34(){
    const el=document.getElementById('ppg-page-generus');if(!el)return;
    const rows=rowsGenerus34().sort((a,b)=>String(a.kelompok_nama||'').localeCompare(String(b.kelompok_nama||''),'id')||String(a.nama||'').localeCompare(String(b.nama||''),'id'));
    el.innerHTML=`
      <div class="ppg-v33-stage"><div><div class="ppg-v33-stage-title">Data Generus</div><div class="ppg-v33-stage-sub">${e34(PPG34_SCOPE?.label||'')}</div></div>
      <span class="ppg-v33-live">● ${rows.length} data</span></div>
      <div class="ppg-panel" style="margin-top:0"><div class="ppg-table-wrap"><table class="ppg-table">
        <thead><tr><th>No</th><th>Nama</th><th>Kelompok</th><th>Umur</th><th>Kelas Usia</th><th>Kelas Aktual</th><th>Kehadiran</th><th>Materi</th></tr></thead>
        <tbody>${rows.map((j,i)=>`<tr>
          <td>${i+1}</td><td><b>${e34(j.nama)}</b><div class="ppg-mini-note">KK: ${e34(j.nama_kk||'-')}</div></td>
          <td>${e34(j.kelompok_nama||'-')}</td><td>${j.__umur??'—'}</td>
          <td>${e34(j.kelas_usia||'—')}</td><td><span class="ppg-badge">${e34(j.__actual||'—')}</span></td>
          <td>—</td><td>—</td>
        </tr>`).join('')}</tbody>
      </table></div></div>`;
  }

  function renderLaporan34(){
    const el=document.getElementById('ppg-page-laporan');if(!el)return;
    const att=attendance34().filter(x=>PPG34_SCOPE?.type==='controller'||x.scope===scopeId34());
    const tTot=att.reduce((n,x)=>n+(x.teachers||[]).length,0);
    const tHad=att.reduce((n,x)=>n+(x.teachers||[]).filter(y=>y.status==='Hadir').length,0);
    const sTot=att.reduce((n,x)=>n+(x.students||[]).length,0);
    const sHad=att.reduce((n,x)=>n+(x.students||[]).filter(y=>y.status==='Hadir').length,0);
    el.innerHTML=`
      <div class="ppg-v33-stage"><div><div class="ppg-v33-stage-title">Laporan PPG</div><div class="ppg-v33-stage-sub">${e34(PPG34_SCOPE?.label||'')}</div></div><span class="ppg-v33-live">Prototype</span></div>
      <div class="ppg-grid-4">
        <div class="ppg-stat"><div class="ppg-stat-label">Sesi KBM</div><div class="ppg-stat-value">${att.length}</div><div class="ppg-stat-sub">prototype tersimpan</div></div>
        <div class="ppg-stat"><div class="ppg-stat-label">Kehadiran Generus</div><div class="ppg-stat-value">${sTot?Math.round(sHad/sTot*100):0}%</div><div class="ppg-stat-sub">${sHad}/${sTot}</div></div>
        <div class="ppg-stat"><div class="ppg-stat-label">Kehadiran Dewan Guru</div><div class="ppg-stat-value">${tTot?Math.round(tHad/tTot*100):0}%</div><div class="ppg-stat-sub">${tHad}/${tTot}</div></div>
        <div class="ppg-stat"><div class="ppg-stat-label">Kurikulum</div><div class="ppg-stat-value">—</div><div class="ppg-stat-sub">tahap berikutnya</div></div>
      </div>
      <div class="ppg-panel"><div class="ppg-panel-head"><div class="ppg-panel-title">Riwayat KBM</div></div><div id="ppg-report-history34" class="ppg-panel-body"></div></div>`;
    renderAttendanceHistory34(document.getElementById('ppg-report-history34'));
  }

  function renderKurikulum34(){
    const el=document.getElementById('ppg-page-kurikulum');if(!el)return;
    el.innerHTML=`
      <div class="ppg-v33-stage"><div><div class="ppg-v33-stage-title">Kurikulum PPG</div>
      <div class="ppg-v33-stage-sub">Tahap selanjutnya setelah backend kelas, guru, sesi KBM dan absensi selesai.</div></div><span class="ppg-v33-live">Tahap Berikutnya</span></div>
      <div class="ppg-panel" style="margin-top:0"><div class="ppg-panel-body">
        <div class="ppg-hierarchy">
          <div><b>Kelas</b>Balita s.d. Dewasa</div><div><b>Bidang</b>Kelompok materi</div>
          <div><b>Kompetensi</b>Target penguasaan</div><div><b>Materi</b>Kontrol per generus</div>
        </div>
      </div></div>`;
  }

  function renderAll34(){
    ensureTeacherTab34();setScopeUI34();
    renderDashboard34();renderSetup34();renderKelas34();renderAbsen34();
    renderGuru34();renderKurikulum34();renderGenerus34();renderLaporan34();
  }
  window.ppgRenderAll=renderAll34;

  const oldOpenPage34=window.ppgOpenPage;
  window.ppgOpenPage=function(page,btn){
    document.querySelectorAll('.ppg-page').forEach(x=>x.classList.remove('active'));
    document.querySelectorAll('.ppg-tab').forEach(x=>x.classList.remove('active'));
    document.getElementById('ppg-page-'+page)?.classList.add('active');
    btn?.classList.add('active');
    if(page==='dashboard')renderDashboard34();
    else if(page==='setup')renderSetup34();
    else if(page==='kelas')renderKelas34();
    else if(page==='absen')renderAbsen34();
    else if(page==='guru')renderGuru34();
    else if(page==='kurikulum')renderKurikulum34();
    else if(page==='generus')renderGenerus34();
    else if(page==='laporan')renderLaporan34();
  };

  // Welcome copy even shorter
  setTimeout(()=>{
    const portal=document.getElementById('ppg-portal');
    if(portal){
      const cards=portal.querySelectorAll('.ppg-mode-card');
      if(cards[0]?.querySelector('.ppg-mode-desc'))cards[0].querySelector('.ppg-mode-desc').textContent='Data jamaah & administrasi.';
      if(cards[1]?.querySelector('.ppg-mode-desc'))cards[1].querySelector('.ppg-mode-desc').textContent='KBM generus & kurikulum.';
    }
  },600);
})();

/* ============================================================
   SOURCE: ubnb-v35-ppg-complete-proto-script
   ============================================================ */
(function(){
  const CUR_KEY='ubnb_ppg_v35_curriculum';
  const MASTER_KEY='ubnb_ppg_v35_mastery';
  const CUSTOM_GURU_KEY='ubnb_ppg_v35_custom_teachers';

  const C35=['Balita','Cabe Rawit Tahap A','Cabe Rawit Tahap B','Pra Remaja','Remaja','Dewasa'];
  let kurMode='struktur';

  const x35=s=>String(s??'').replace(/[&<>"']/g,m=>(
    {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]
  ));

  function scope35(){
    try{
      const raw=sessionStorage.getItem('ubnb_ppg_v34_scope');
      return raw?JSON.parse(raw):null;
    }catch(_e){return null}
  }
  function currentScope35(){
    return (typeof PPG34_SCOPE!=='undefined'&&PPG34_SCOPE)?PPG34_SCOPE:scope35();
  }
  function scopeId35(){
    const s=currentScope35();
    return s?.type==='controller'?'DESA':(s?.kelompok||'');
  }
  function isController35(){return currentScope35()?.type==='controller'}

  function curricula35(){
    try{return JSON.parse(localStorage.getItem(CUR_KEY)||'[]')||[]}
    catch(_e){return []}
  }
  function saveCurricula35(v){localStorage.setItem(CUR_KEY,JSON.stringify(v||[]))}
  function mastery35(){
    try{return JSON.parse(localStorage.getItem(MASTER_KEY)||'{}')||{}}
    catch(_e){return {}}
  }
  function saveMastery35(v){localStorage.setItem(MASTER_KEY,JSON.stringify(v||{}))}
  function customTeachers35(){
    try{return JSON.parse(localStorage.getItem(CUSTOM_GURU_KEY)||'[]')||[]}
    catch(_e){return []}
  }
  function saveCustomTeachers35(v){localStorage.setItem(CUSTOM_GURU_KEY,JSON.stringify(v||[]))}

  function allJ35(){
    return Array.isArray(aJamaah)?aJamaah:[];
  }
  function generus35(){
    let rows=allJ35()
      .filter(j=>j.status_nikah==='Belum Menikah')
      .filter(j=>j.status_sambung==='Tetap');
    const s=currentScope35();
    if(s?.type==='kelompok')rows=rows.filter(j=>j.kelompok_nama===s.kelompok);
    const drafts=(()=>{try{return JSON.parse(localStorage.getItem('ubnb_ppg_v33_class_drafts')||'{}')}catch(_e){return {}}})();
    return rows.map(j=>({...j,__kelas:drafts[String(j.did)]||j.kelas_kbm||j.kelas_usia||null,__umur:umurFromTgl(j.tgl_lahir)}));
  }

  function curriculumForClass35(k){
    return curricula35().filter(m=>m.aktif!==false&&(!k||m.kelas===k));
  }
  function masteryKey35(did,mid){return `${did}|${mid}`}
  function masteryStatus35(did,mid){return mastery35()[masteryKey35(did,mid)]||'Belum'}
  function materialProgress35(mid,kelas){
    const students=generus35().filter(j=>j.__kelas===kelas);
    if(!students.length)return {ok:0,total:0,pct:0};
    const ok=students.filter(j=>masteryStatus35(j.did,mid)==='Menguasai').length;
    return {ok,total:students.length,pct:Math.round(ok/students.length*100)};
  }
  function studentProgress35(j){
    const mats=curriculumForClass35(j.__kelas);
    if(!mats.length)return {ok:0,total:0,pct:0};
    const ok=mats.filter(m=>masteryStatus35(j.did,m.id)==='Menguasai').length;
    return {ok,total:mats.length,pct:Math.round(ok/mats.length*100)};
  }

  // ---------- Dewan Guru custom ----------
  function baseTeacherRows35(){
    // v34 teacherRows34 is lexical, so recreate safely from current data.
    const map=new Map();
    const s=currentScope35();
    const isTeacherRole=label=>{
      const z=' '+String(label||'').toLowerCase().replace(/[._/-]+/g,' ').replace(/\s+/g,' ')+' ';
      return /(^|\s)mt(\s|$)/.test(z)||/(^|\s)ms(\s|$)/.test(z);
    };
    (Array.isArray(aPengurus)?aPengurus:[]).filter(p=>p&&p.aktif!==false&&isTeacherRole(p.dapukan)).forEach(p=>{
      if(s?.type==='kelompok' && (p.level!=='kelompok'||p.kelompok_nama!==s.kelompok))return;
      const j=typeof findJamaahAny==='function'?findJamaahAny(p.did):allJ35().find(x=>String(x.did)===String(p.did));
      if(!j)return;
      const key=String(p.did);
      if(!map.has(key))map.set(key,{did:key,nama:j.nama||'-',jenis_kelamin:j.jenis_kelamin||'',kelompok_nama:j.kelompok_nama||p.kelompok_nama||'-',roles:[],origin:'MT/MS'});
      map.get(key).roles.push(p.dapukan||'');
    });
    return [...map.values()];
  }
  function teacherAssign35(){
    try{return JSON.parse(localStorage.getItem('ubnb_ppg_v34_teacher_assign')||'{}')||{}}
    catch(_e){return {}}
  }
  function teachers35(){
    const map=new Map(baseTeacherRows35().map(t=>[String(t.did),t]));
    customTeachers35().forEach(c=>{
      const s=currentScope35();
      if(s?.type==='kelompok'&&c.kelompok_nama!==s.kelompok)return;
      const j=allJ35().find(x=>String(x.did)===String(c.did));
      if(!j)return;
      const key=String(c.did);
      if(map.has(key)){
        const t=map.get(key);
        if(!t.roles.includes(c.role||'Guru'))t.roles.push(c.role||'Guru');
      }else{
        map.set(key,{did:key,nama:j.nama||'-',jenis_kelamin:j.jenis_kelamin||'',kelompok_nama:j.kelompok_nama||'-',roles:[c.role||'Guru'],origin:'Tambahan PPG'});
      }
    });
    const ass=teacherAssign35();
    return [...map.values()].map(t=>({...t,kelas:ass[t.did]||'Semua Kelas'}))
      .sort((a,b)=>String(a.kelompok_nama).localeCompare(String(b.kelompok_nama),'id')||a.nama.localeCompare(b.nama,'id'));
  }

  window.ppgAddTeacher35=function(){
    if(isController35()){toast('Penambahan dewan guru dilakukan di scope kelompok.',true);return}
    const sel=document.getElementById('ppg35-add-teacher');
    const role=document.getElementById('ppg35-add-teacher-role')?.value||'Guru';
    const did=sel?.value;if(!did)return;
    const j=allJ35().find(x=>String(x.did)===String(did));if(!j)return;
    const arr=customTeachers35();
    if(!arr.some(x=>String(x.did)===String(did)&&x.kelompok_nama===j.kelompok_nama)){
      arr.push({did:String(did),kelompok_nama:j.kelompok_nama||'',role});
      saveCustomTeachers35(arr);
    }
    toast('Dewan guru ditambahkan ke prototype.');
    renderGuru35();
  };
  window.ppgRemoveTeacher35=function(did){
    if(isController35())return;
    let arr=customTeachers35();
    const before=arr.length;
    arr=arr.filter(x=>String(x.did)!==String(did));
    saveCustomTeachers35(arr);
    if(before===arr.length){
      toast('Dewan guru dari dapukan MT/MS tidak dapat dihapus dari prototype.',true);
    }else{
      toast('Dewan guru tambahan dihapus.');
    }
    renderGuru35();
  };

  function renderGuru35(){
    const el=document.getElementById('ppg-page-guru');if(!el)return;
    const rows=teachers35();
    let candidates=[];
    if(!isController35()){
      const existing=new Set(rows.map(t=>String(t.did)));
      candidates=allJ35().filter(j=>j.kelompok_nama===currentScope35()?.kelompok&&!existing.has(String(j.did)))
        .sort((a,b)=>String(a.nama||'').localeCompare(String(b.nama||''),'id'));
    }
    const customSet=new Set(customTeachers35().map(x=>String(x.did)));

    el.innerHTML=`
      <div class="ppg-v33-stage"><div><div class="ppg-v33-stage-title">Dewan Guru</div>
      <div class="ppg-v33-stage-sub">Data MT/MS otomatis + guru tambahan yang ditetapkan PPG.</div></div><span class="ppg-v33-live">● ${rows.length} guru</span></div>
      ${isController35()?'<div class="ppg-controller-note">Controller Desa memonitor dewan guru seluruh kelompok. Penambahan dan penetapan kelas binaan dilakukan di kelompok.</div>':`
      <div class="ppg-panel" style="margin-top:0">
        <div class="ppg-panel-head"><div><div class="ppg-panel-title">Tambah Dewan Guru</div><div class="ppg-panel-sub">Pilih dari data jamaah ${x35(currentScope35()?.kelompok||'')}.</div></div></div>
        <div class="ppg-panel-body">
          <div class="ppg-teacher-add">
            <select id="ppg35-add-teacher" class="ppg-select">
              <option value="">Pilih jamaah...</option>
              ${candidates.map(j=>`<option value="${x35(j.did)}">${x35(j.nama)} · ${x35(j.nama_kk||'-')}</option>`).join('')}
            </select>
            <select id="ppg35-add-teacher-role" class="ppg-select"><option>Guru</option><option>Pendamping Guru</option><option>Koordinator Kelas</option></select>
            <button class="ppg-btn" onclick="ppgAddTeacher35()">+ Tambah</button>
          </div>
        </div>
      </div>`}
      <div class="ppg-panel">
        <div class="ppg-table-wrap"><table class="ppg-table">
          <thead><tr><th>No</th><th>Nama</th><th>Kelompok</th><th>Peran / Dapukan</th><th>Kelas Binaan</th><th>Sumber</th>${isController35()?'':'<th>Aksi</th>'}</tr></thead>
          <tbody>${rows.map((t,i)=>`<tr>
            <td>${i+1}</td><td><b>${x35(t.nama)}</b></td><td>${x35(t.kelompok_nama||'-')}</td>
            <td>${x35([...new Set(t.roles)].join(' · '))}</td>
            <td>${isController35()?`<span class="ppg-badge">${x35(t.kelas)}</span>`:
              `<select class="ppg-teacher-class-select" onchange="ppgTeacherSetClass34('${x35(t.did)}',this.value)">
                <option ${t.kelas==='Semua Kelas'?'selected':''}>Semua Kelas</option>${C35.map(k=>`<option ${t.kelas===k?'selected':''}>${x35(k)}</option>`).join('')}
              </select>`}</td>
            <td>${x35(t.origin)}</td>
            ${isController35()?'':`<td>${customSet.has(String(t.did))?`<button class="ppg-icon-btn ppg-danger" onclick="ppgRemoveTeacher35('${x35(t.did)}')">Hapus</button>`:'—'}</td>`}
          </tr>`).join('')}</tbody>
        </table></div>
      </div>`;
  }
  window.ppgRenderGuru35=renderGuru35;

  // ---------- Kurikulum ----------
  window.ppgKurMode35=function(mode,btn){
    kurMode=mode;
    document.querySelectorAll('#ppg-page-kurikulum .ppg-subtab').forEach(x=>x.classList.remove('active'));
    btn?.classList.add('active');
    renderKurikulum35();
  };

  window.ppgAddMaterial35=function(){
    const kelas=document.getElementById('ppg35-kur-kelas')?.value||'';
    const bidang=document.getElementById('ppg35-kur-bidang')?.value.trim()||'';
    const kompetensi=document.getElementById('ppg35-kur-kompetensi')?.value.trim()||'';
    const materi=document.getElementById('ppg35-kur-materi')?.value.trim()||'';
    if(!kelas||!bidang||!materi){toast('Kelas, bidang, dan materi wajib diisi.',true);return}
    const all=curricula35();
    all.push({id:'M'+Date.now(),kelas,bidang,kompetensi,materi,aktif:true,created_at:ubnbWibIso84()});
    saveCurricula35(all);
    toast('Materi kurikulum ditambahkan.');
    renderKurikulum35();
  };

  window.ppgDeleteMaterial35=function(id){
    const all=curricula35().filter(x=>x.id!==id);
    saveCurricula35(all);
    const m=mastery35();
    Object.keys(m).filter(k=>k.endsWith('|'+id)).forEach(k=>delete m[k]);
    saveMastery35(m);
    renderKurikulum35();
  };

  window.ppgLoadMastery35=function(){
    const kelas=document.getElementById('ppg35-master-class')?.value||'';
    const mid=document.getElementById('ppg35-master-mat')?.value||'';
    const box=document.getElementById('ppg35-mastery-list');if(!box)return;
    const mats=curriculumForClass35(kelas);
    const mat=mats.find(x=>x.id===mid);
    const students=generus35().filter(j=>j.__kelas===kelas).sort((a,b)=>String(a.nama||'').localeCompare(String(b.nama||''),'id'));
    if(!mat){box.innerHTML='<div class="ppg-empty">Pilih materi.</div>';return}
    box.innerHTML=`<div class="ppg-v33-info"><b>${x35(mat.bidang)}</b> · ${x35(mat.kompetensi||'-')}<br>${x35(mat.materi)}</div>
      <div class="ppg-table-wrap"><table class="ppg-table">
        <thead><tr><th>No</th><th>Nama</th><th>Status Penguasaan</th></tr></thead>
        <tbody>${students.map((j,i)=>`<tr><td>${i+1}</td><td><b>${x35(j.nama)}</b></td>
          <td><select class="ppg-status-select ppg35-mastery-status" data-did="${x35(j.did)}" data-mid="${x35(mid)}">
            ${['Belum','Sedang Dipelajari','Menguasai','Perlu Pengulangan'].map(s=>`<option ${masteryStatus35(j.did,mid)===s?'selected':''}>${s}</option>`).join('')}
          </select></td></tr>`).join('')}</tbody>
      </table></div><div class="ppg-panel-body"><button class="ppg-btn" onclick="ppgSaveMastery35()">Simpan Penguasaan Materi</button></div>`;
  };
  window.ppgSaveMastery35=function(){
    const m=mastery35();
    document.querySelectorAll('.ppg35-mastery-status').forEach(x=>m[masteryKey35(x.dataset.did,x.dataset.mid)]=x.value);
    saveMastery35(m);
    toast('Penguasaan materi tersimpan di prototype.');
    renderKurikulum35();
  };
  window.ppgMasterClassChanged35=function(){
    const kelas=document.getElementById('ppg35-master-class')?.value||'';
    const mats=curriculumForClass35(kelas);
    const sel=document.getElementById('ppg35-master-mat');
    if(sel)sel.innerHTML='<option value="">Pilih materi...</option>'+mats.map(m=>`<option value="${x35(m.id)}">${x35(m.bidang)} · ${x35(m.materi)}</option>`).join('');
    document.getElementById('ppg35-mastery-list').innerHTML='<div class="ppg-empty">Pilih materi untuk kontrol.</div>';
  };

  function renderKurikulum35(){
    const el=document.getElementById('ppg-page-kurikulum');if(!el)return;
    const mats=curricula35();
    const tabs=`<div class="ppg-subtabs">
      <button class="ppg-subtab ${kurMode==='struktur'?'active':''}" onclick="ppgKurMode35('struktur',this)">Struktur Kurikulum</button>
      ${isController35()?'':`<button class="ppg-subtab ${kurMode==='kontrol'?'active':''}" onclick="ppgKurMode35('kontrol',this)">Kontrol Materi Generus</button>`}
    </div>`;

    if(kurMode==='kontrol'&&!isController35()){
      el.innerHTML=`<div class="ppg-v33-stage"><div><div class="ppg-v33-stage-title">Kontrol Penguasaan Materi</div><div class="ppg-v33-stage-sub">${x35(currentScope35()?.label||'')}</div></div><span class="ppg-v33-live">Prototype</span></div>
        ${tabs}
        <div class="ppg-panel" style="margin-top:0"><div class="ppg-panel-body">
          <div class="ppg-toolbar" style="grid-template-columns:180px 1fr auto">
            <select id="ppg35-master-class" class="ppg-select" onchange="ppgMasterClassChanged35()"><option value="">Pilih kelas...</option>${C35.map(k=>`<option>${x35(k)}</option>`).join('')}</select>
            <select id="ppg35-master-mat" class="ppg-select" onchange="ppgLoadMastery35()"><option value="">Pilih materi...</option></select>
            <button class="ppg-btn secondary" onclick="ppgLoadMastery35()">Tampilkan</button>
          </div>
        </div><div id="ppg35-mastery-list" class="ppg-panel-body"><div class="ppg-empty">Pilih kelas dan materi.</div></div></div>`;
      return;
    }

    const byClass=C35.map(k=>[k,mats.filter(m=>m.kelas===k)]);
    el.innerHTML=`<div class="ppg-v33-stage"><div><div class="ppg-v33-stage-title">Kurikulum PPG</div>
      <div class="ppg-v33-stage-sub">${isController35()?'Controller Desa dapat menyusun struktur kurikulum.':'Kelompok membaca kurikulum dan melakukan kontrol penguasaan.'}</div></div>
      <span class="ppg-v33-live">● ${mats.length} materi</span></div>
      ${tabs}
      ${isController35()?`<div class="ppg-panel" style="margin-top:0"><div class="ppg-panel-head"><div><div class="ppg-panel-title">Tambah Materi</div><div class="ppg-panel-sub">Isi sesuai kurikulum PPG yang berlaku; sistem tidak membuat isi otomatis.</div></div></div>
        <div class="ppg-panel-body"><div class="ppg-form-grid">
          <div class="ppg-form-field"><label>Kelas</label><select id="ppg35-kur-kelas"><option value="">Pilih...</option>${C35.map(k=>`<option>${x35(k)}</option>`).join('')}</select></div>
          <div class="ppg-form-field"><label>Bidang / Mata Materi</label><input id="ppg35-kur-bidang" placeholder="Contoh: isi sesuai kurikulum"></div>
          <div class="ppg-form-field"><label>Bab / Kompetensi</label><input id="ppg35-kur-kompetensi" placeholder="Opsional"></div>
          <div class="ppg-form-field"><label>Materi</label><input id="ppg35-kur-materi" placeholder="Nama materi"></div>
          <button class="ppg-btn" onclick="ppgAddMaterial35()">+ Tambah</button>
        </div></div></div>`:''}
      <div class="ppg-panel"><div class="ppg-panel-head"><div><div class="ppg-panel-title">Daftar Kurikulum</div><div class="ppg-panel-sub">Kelas → Bidang → Kompetensi → Materi.</div></div></div>
        <div class="ppg-panel-body">
          ${mats.length?byClass.map(([k,list])=>list.length?`<div style="margin-bottom:10px"><b style="font-size:11px;color:#175a3a">${x35(k)} · ${list.length} materi</b>
            <div style="margin-top:5px">${list.map(m=>{
              const pr=materialProgress35(m.id,m.kelas);
              return `<div class="ppg-material-card"><div class="ppg-material-top"><div>
                <div class="ppg-material-title">${x35(m.materi)}</div>
                <div class="ppg-material-meta">${x35(m.bidang)} · ${x35(m.kompetensi||'Tanpa bab/kompetensi')}</div>
              </div>${isController35()?`<button class="ppg-icon-btn ppg-danger" onclick="ppgDeleteMaterial35('${x35(m.id)}')">Hapus</button>`:''}</div>
              <div class="ppg-progress"><span style="width:${pr.pct}%"></span></div><div class="ppg-material-meta">${pr.ok}/${pr.total} menguasai · ${pr.pct}%</div>
              </div>`;
            }).join('')}</div></div>`:'').join(''):'<div class="ppg-empty">Belum ada kurikulum. Controller Desa dapat menambahkan materi sesuai kurikulum PPG.</div>'}
        </div></div>`;
  }
  window.ppgRenderKurikulum35=renderKurikulum35;

  // ---------- Generus detail ----------
  function ensureDetailModal35(){
    if(document.getElementById('ppg35-detail-modal'))return;
    document.body.insertAdjacentHTML('beforeend',`<div id="ppg35-detail-modal" class="ppg-detail-modal"><div class="ppg-detail-card">
      <div class="ppg-detail-head"><b id="ppg35-detail-title">Detail Generus</b><button class="ppg-detail-close" onclick="ppgCloseGenerus35()">✕</button></div>
      <div id="ppg35-detail-body" class="ppg-detail-body"></div>
    </div></div>`);
  }
  window.ppgOpenGenerus35=function(did){
    ensureDetailModal35();
    const j=generus35().find(x=>String(x.did)===String(did));if(!j)return;
    const pr=studentProgress35(j);
    let att=[];
    try{att=JSON.parse(localStorage.getItem('ubnb_ppg_v34_attendance')||'[]')}catch(_e){}
    const recs=att.flatMap(s=>(s.students||[]).filter(x=>String(x.did)===String(did)).map(x=>({...x,date:s.date,kelas:s.kelas,title:s.title})));
    const hadir=recs.filter(x=>x.status==='Hadir').length;
    const mats=curriculumForClass35(j.__kelas);
    document.getElementById('ppg35-detail-title').textContent=j.nama;
    document.getElementById('ppg35-detail-body').innerHTML=`
      <div class="ppg-grid-4">
        <div class="ppg-stat"><div class="ppg-stat-label">Kelompok</div><div class="ppg-stat-value" style="font-size:17px">${x35(j.kelompok_nama||'-')}</div></div>
        <div class="ppg-stat"><div class="ppg-stat-label">Kelas</div><div class="ppg-stat-value" style="font-size:16px">${x35(j.__kelas||'-')}</div></div>
        <div class="ppg-stat"><div class="ppg-stat-label">Kehadiran</div><div class="ppg-stat-value">${recs.length?Math.round(hadir/recs.length*100):0}%</div><div class="ppg-stat-sub">${hadir}/${recs.length}</div></div>
        <div class="ppg-stat"><div class="ppg-stat-label">Penguasaan</div><div class="ppg-stat-value">${pr.pct}%</div><div class="ppg-stat-sub">${pr.ok}/${pr.total} materi</div></div>
      </div>
      <div class="ppg-panel"><div class="ppg-panel-head"><div class="ppg-panel-title">Progress Materi</div></div><div class="ppg-panel-body">
        ${mats.length?mats.map(m=>`<div class="ppg-material-card"><b>${x35(m.materi)}</b><div class="ppg-material-meta">${x35(m.bidang)} · <span class="ppg-coverage-badge">${x35(masteryStatus35(j.did,m.id))}</span></div></div>`).join(''):'<div class="ppg-empty">Belum ada materi kurikulum untuk kelas ini.</div>'}
      </div></div>
      <div class="ppg-panel"><div class="ppg-panel-head"><div class="ppg-panel-title">Riwayat Kehadiran</div></div><div class="ppg-panel-body">
        ${recs.length?recs.slice(-10).reverse().map(r=>`<div class="ppg-att-history-row"><b>${x35(r.date)}</b><span>${x35(r.title||'KBM')}</span><span>${x35(r.status)}</span></div>`).join(''):'<div class="ppg-empty">Belum ada riwayat kehadiran.</div>'}
      </div></div>`;
    document.getElementById('ppg35-detail-modal').classList.add('show');
  };
  window.ppgCloseGenerus35=function(){document.getElementById('ppg35-detail-modal')?.classList.remove('show')};

  function renderGenerus35(){
    const el=document.getElementById('ppg-page-generus');if(!el)return;
    const rows=generus35().sort((a,b)=>String(a.kelompok_nama||'').localeCompare(String(b.kelompok_nama||''),'id')||String(a.nama||'').localeCompare(String(b.nama||''),'id'));
    let att=[];try{att=JSON.parse(localStorage.getItem('ubnb_ppg_v34_attendance')||'[]')}catch(_e){}
    el.innerHTML=`<div class="ppg-v33-stage"><div><div class="ppg-v33-stage-title">Data Generus</div><div class="ppg-v33-stage-sub">${x35(currentScope35()?.label||'')}</div></div><span class="ppg-v33-live">● ${rows.length}</span></div>
      <div class="ppg-panel" style="margin-top:0"><div class="ppg-table-wrap"><table class="ppg-table">
        <thead><tr><th>No</th><th>Nama</th><th>Kelompok</th><th>Kelas</th><th>Kehadiran</th><th>Penguasaan Materi</th><th>Detail</th></tr></thead>
        <tbody>${rows.map((j,i)=>{
          const recs=att.flatMap(s=>(s.students||[]).filter(x=>String(x.did)===String(j.did)));
          const hadir=recs.filter(x=>x.status==='Hadir').length;
          const pr=studentProgress35(j);
          return `<tr><td>${i+1}</td><td><b>${x35(j.nama)}</b><div class="ppg-mini-note">KK: ${x35(j.nama_kk||'-')}</div></td>
            <td>${x35(j.kelompok_nama||'-')}</td><td><span class="ppg-badge">${x35(j.__kelas||'-')}</span></td>
            <td>${recs.length?Math.round(hadir/recs.length*100):0}% <span class="ppg-mini-note">(${hadir}/${recs.length})</span></td>
            <td>${pr.pct}% <span class="ppg-mini-note">(${pr.ok}/${pr.total})</span></td>
            <td><button class="ppg-icon-btn" onclick="ppgOpenGenerus35('${x35(j.did)}')">Lihat</button></td></tr>`;
        }).join('')}</tbody>
      </table></div></div>`;
  }
  window.ppgRenderGenerus35=renderGenerus35;

  // ---------- Kelas summary with guru/material ----------
  function renderKelas35(){
    const el=document.getElementById('ppg-page-kelas');if(!el)return;
    const rows=generus35();const teachers=teachers35();const mats=curricula35();
    const by=Object.fromEntries(C35.map(k=>[k,0]));rows.forEach(j=>{if(j.__kelas in by)by[j.__kelas]++});
    el.innerHTML=`<div class="ppg-v33-stage"><div><div class="ppg-v33-stage-title">Kelas KBM</div><div class="ppg-v33-stage-sub">${x35(currentScope35()?.label||'')}</div></div><span class="ppg-v33-live">● Data aktual</span></div>
      <div class="ppg-class-cards">${C35.map(k=>{
        const tg=teachers.filter(t=>t.kelas==='Semua Kelas'||t.kelas===k).length;
        const km=mats.filter(m=>m.kelas===k).length;
        return `<div class="ppg-class-card"><div class="ppg-class-title">${x35(k)}</div><div class="ppg-class-num">${by[k]}</div>
          <div class="ppg-class-age">${tg} guru · ${km} materi</div></div>`;
      }).join('')}</div>`;
  }
  window.ppgRenderKelas35=renderKelas35;

  // ---------- Dashboard/report enrichment ----------
  function overallMastery35(){
    const rows=generus35();
    let total=0,ok=0;
    rows.forEach(j=>{
      const mats=curriculumForClass35(j.__kelas);
      total+=mats.length;
      ok+=mats.filter(m=>masteryStatus35(j.did,m.id)==='Menguasai').length;
    });
    return {ok,total,pct:total?Math.round(ok/total*100):0};
  }

  function renderDashboard35(){
    // Start from v34 dashboard if available, then replace with richer summary.
    const el=document.getElementById('ppg-page-dashboard');if(!el)return;
    const rows=generus35(), teachers=teachers35(), mats=curricula35(), om=overallMastery35();
    let att=[];try{att=JSON.parse(localStorage.getItem('ubnb_ppg_v34_attendance')||'[]')}catch(_e){}
    if(!isController35())att=att.filter(x=>x.scope===scopeId35());
    const sTot=att.reduce((n,x)=>n+(x.students||[]).length,0), sHad=att.reduce((n,x)=>n+(x.students||[]).filter(y=>y.status==='Hadir').length,0);
    const tTot=att.reduce((n,x)=>n+(x.teachers||[]).length,0), tHad=att.reduce((n,x)=>n+(x.teachers||[]).filter(y=>y.status==='Hadir').length,0);
    const by=Object.fromEntries(C35.map(k=>[k,0]));rows.forEach(j=>{if(j.__kelas in by)by[j.__kelas]++});
    el.innerHTML=`<div class="ppg-v33-stage"><div><div class="ppg-v33-stage-title">${isController35()?'Controller Desa':x35(currentScope35()?.label||'PPG')}</div>
      <div class="ppg-v33-stage-sub">${isController35()?'Monitoring seluruh PPG Desa Perwira':'Operasional KBM dan pembinaan generus'}</div></div><span class="ppg-v33-live">● Prototype Aktif</span></div>
      <div class="ppg-grid-4">
        <div class="ppg-stat"><div class="ppg-stat-label">Generus</div><div class="ppg-stat-value">${rows.length}</div><div class="ppg-stat-sub">data aktual</div></div>
        <div class="ppg-stat"><div class="ppg-stat-label">Dewan Guru</div><div class="ppg-stat-value">${teachers.length}</div><div class="ppg-stat-sub">aktif</div></div>
        <div class="ppg-stat"><div class="ppg-stat-label">Kehadiran Generus</div><div class="ppg-stat-value">${sTot?Math.round(sHad/sTot*100):0}%</div><div class="ppg-stat-sub">${sHad}/${sTot}</div></div>
        <div class="ppg-stat"><div class="ppg-stat-label">Kehadiran Guru</div><div class="ppg-stat-value">${tTot?Math.round(tHad/tTot*100):0}%</div><div class="ppg-stat-sub">${tHad}/${tTot}</div></div>
      </div>
      <div class="ppg-v33-class-summary">${C35.map(k=>`<div class="ppg-v33-class-chip"><div class="num">${by[k]}</div><div class="lbl">${x35(k)}</div></div>`).join('')}</div>
      <div class="ppg-grid-3">
        <div class="ppg-panel"><div class="ppg-panel-head"><div><div class="ppg-panel-title">Kurikulum</div><div class="ppg-panel-sub">${mats.length} materi tersusun</div></div></div><div class="ppg-panel-body"><div class="ppg-stat-value">${mats.length}</div><div class="ppg-mini-note">item materi</div></div></div>
        <div class="ppg-panel"><div class="ppg-panel-head"><div><div class="ppg-panel-title">Penguasaan Materi</div><div class="ppg-panel-sub">Status Menguasai</div></div></div><div class="ppg-panel-body"><div class="ppg-stat-value">${om.pct}%</div><div class="ppg-mini-note">${om.ok}/${om.total} target</div></div></div>
        <div class="ppg-panel"><div class="ppg-panel-head"><div><div class="ppg-panel-title">Sesi KBM</div><div class="ppg-panel-sub">Prototype tersimpan</div></div></div><div class="ppg-panel-body"><div class="ppg-stat-value">${att.length}</div><div class="ppg-mini-note">sesi</div></div></div>
      </div>`;
  }
  window.ppgRenderDashboard35=renderDashboard35;

  function renderLaporan35(){
    const el=document.getElementById('ppg-page-laporan');if(!el)return;
    let att=[];try{att=JSON.parse(localStorage.getItem('ubnb_ppg_v34_attendance')||'[]')}catch(_e){}
    if(!isController35())att=att.filter(x=>x.scope===scopeId35());
    const om=overallMastery35();
    const teacherList=teachers35();
    const guruStats=teacherList.map(t=>{
      const recs=att.flatMap(s=>(s.teachers||[]).filter(x=>String(x.did)===String(t.did)));
      const had=recs.filter(x=>x.status==='Hadir').length;
      return {...t,total:recs.length,had,pct:recs.length?Math.round(had/recs.length*100):0}
    }).sort((a,b)=>a.pct-b.pct);

    el.innerHTML=`<div class="ppg-v33-stage"><div><div class="ppg-v33-stage-title">Laporan PPG</div><div class="ppg-v33-stage-sub">${x35(currentScope35()?.label||'')}</div></div><span class="ppg-v33-live">Prototype</span></div>
      <div class="ppg-grid-4">
        <div class="ppg-stat"><div class="ppg-stat-label">Sesi KBM</div><div class="ppg-stat-value">${att.length}</div></div>
        <div class="ppg-stat"><div class="ppg-stat-label">Dewan Guru</div><div class="ppg-stat-value">${teacherList.length}</div></div>
        <div class="ppg-stat"><div class="ppg-stat-label">Materi Kurikulum</div><div class="ppg-stat-value">${curricula35().length}</div></div>
        <div class="ppg-stat"><div class="ppg-stat-label">Penguasaan</div><div class="ppg-stat-value">${om.pct}%</div><div class="ppg-stat-sub">${om.ok}/${om.total}</div></div>
      </div>
      <div class="ppg-report-grid">
        <div class="ppg-panel"><div class="ppg-panel-head"><div><div class="ppg-panel-title">Kehadiran Dewan Guru</div><div class="ppg-panel-sub">Urut kehadiran terendah</div></div></div>
          <div class="ppg-table-wrap"><table class="ppg-table" style="min-width:450px"><thead><tr><th>Nama</th><th>Kelompok</th><th>Hadir</th><th>%</th></tr></thead>
          <tbody>${guruStats.map(t=>`<tr><td><b>${x35(t.nama)}</b></td><td>${x35(t.kelompok_nama)}</td><td>${t.had}/${t.total}</td><td>${t.pct}%</td></tr>`).join('')}</tbody></table></div></div>
        <div class="ppg-panel"><div class="ppg-panel-head"><div><div class="ppg-panel-title">Capaian Kurikulum</div><div class="ppg-panel-sub">Per materi</div></div></div>
          <div class="ppg-panel-body">${curricula35().length?curricula35().map(m=>{const p=materialProgress35(m.id,m.kelas);return `<div class="ppg-material-card"><b>${x35(m.kelas)} · ${x35(m.materi)}</b><div class="ppg-progress"><span style="width:${p.pct}%"></span></div><div class="ppg-material-meta">${p.pct}% · ${p.ok}/${p.total} menguasai</div></div>`}).join(''):'<div class="ppg-empty">Belum ada kurikulum.</div>'}</div></div>
      </div>`;
  }
  window.ppgRenderLaporan35=renderLaporan35;

  // Rebind page routing after v34
  const priorOpen35=window.ppgOpenPage;
  window.ppgOpenPage=function(page,btn){
    document.querySelectorAll('.ppg-page').forEach(x=>x.classList.remove('active'));
    document.querySelectorAll('.ppg-tab').forEach(x=>x.classList.remove('active'));
    document.getElementById('ppg-page-'+page)?.classList.add('active');
    btn?.classList.add('active');
    if(page==='dashboard')renderDashboard35();
    else if(page==='setup'&&typeof renderSetup34==='function')renderSetup34();
    else if(page==='kelas')renderKelas35();
    else if(page==='absen'&&typeof renderAbsen34==='function')renderAbsen34();
    else if(page==='guru')renderGuru35();
    else if(page==='kurikulum')renderKurikulum35();
    else if(page==='generus')renderGenerus35();
    else if(page==='laporan')renderLaporan35();
  };

  window.ppgRenderAll=function(){
    if(typeof ensureTeacherTab34==='function')ensureTeacherTab34();
    if(typeof setScopeUI34==='function')setScopeUI34();
    renderDashboard35();
    if(typeof renderSetup34==='function')renderSetup34();
    renderKelas35();
    if(typeof renderAbsen34==='function')renderAbsen34();
    renderGuru35();
    renderKurikulum35();
    renderGenerus35();
    renderLaporan35();
  };

  setTimeout(()=>{
    if(document.getElementById('ppg-shell')?.classList.contains('show'))window.ppgRenderAll();
  },800);
})();

/* ============================================================
   SOURCE: ubnb-v36-attendance-flow-script
   ============================================================ */
(function(){
  const ATT_KEY36='ubnb_ppg_v34_attendance';
  const CUSTOM_GURU_KEY36='ubnb_ppg_v35_custom_teachers';
  const ASSIGN_KEY36='ubnb_ppg_v34_teacher_assign';

  const esc36=s=>String(s??'').replace(/[&<>"']/g,m=>(
    {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]
  ));

  function scope36(){
    try{
      const r=sessionStorage.getItem('ubnb_ppg_v34_scope');
      return r?JSON.parse(r):null;
    }catch(_e){return null}
  }
  function isController36(){return scope36()?.type==='controller'}
  function scopeId36(){return isController36()?'DESA':(scope36()?.kelompok||'')}
  function today36(){
    try{return new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Jakarta',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date())}
    catch(_e){return ubnbWibIso84().slice(0,10)}
  }

  function attendance36(){
    try{return JSON.parse(localStorage.getItem(ATT_KEY36)||'[]')||[]}
    catch(_e){return []}
  }
  function saveAttendance36(v){localStorage.setItem(ATT_KEY36,JSON.stringify(v||[]))}

  function customTeachers36(){
    try{return JSON.parse(localStorage.getItem(CUSTOM_GURU_KEY36)||'[]')||[]}
    catch(_e){return []}
  }
  function assignments36(){
    try{return JSON.parse(localStorage.getItem(ASSIGN_KEY36)||'{}')||{}}
    catch(_e){return {}}
  }
  function isTeacherRole36(label){
    const z=' '+String(label||'').toLowerCase().replace(/[._/-]+/g,' ').replace(/\s+/g,' ')+' ';
    return /(^|\s)mt(\s|$)/.test(z)||/(^|\s)ms(\s|$)/.test(z);
  }
  function teacherRows36(){
    const s=scope36();
    const map=new Map();

    (Array.isArray(aPengurus)?aPengurus:[])
      .filter(p=>p&&p.aktif!==false&&isTeacherRole36(p.dapukan))
      .forEach(p=>{
        if(s?.type==='kelompok'&&(p.level!=='kelompok'||p.kelompok_nama!==s.kelompok))return;
        const j=typeof findJamaahAny==='function'
          ?findJamaahAny(p.did)
          :(Array.isArray(aJamaah)?aJamaah:[]).find(x=>String(x.did)===String(p.did));
        if(!j)return;
        const key=String(p.did);
        if(!map.has(key))map.set(key,{
          did:key,nama:j.nama||'-',kelompok_nama:j.kelompok_nama||p.kelompok_nama||'-',
          roles:[],origin:'MT/MS'
        });
        const t=map.get(key);
        if(p.dapukan&&!t.roles.includes(p.dapukan))t.roles.push(p.dapukan);
      });

    customTeachers36().forEach(c=>{
      if(s?.type==='kelompok'&&c.kelompok_nama!==s.kelompok)return;
      const j=(Array.isArray(aJamaah)?aJamaah:[]).find(x=>String(x.did)===String(c.did));
      if(!j)return;
      const key=String(c.did);
      if(!map.has(key))map.set(key,{
        did:key,nama:j.nama||'-',kelompok_nama:j.kelompok_nama||'-',roles:[c.role||'Guru'],origin:'Tambahan PPG'
      });
      else if(c.role&&!map.get(key).roles.includes(c.role))map.get(key).roles.push(c.role);
    });

    const ass=assignments36();
    return [...map.values()]
      .map(t=>({...t,kelas:ass[t.did]||'Semua Kelas'}))
      .sort((a,b)=>String(a.nama||'').localeCompare(String(b.nama||''),'id'));
  }

  function classDrafts36(){
    try{return JSON.parse(localStorage.getItem('ubnb_ppg_v33_class_drafts')||'{}')||{}}
    catch(_e){return {}}
  }
  function studentRows36(kelas){
    const s=scope36();
    const d=classDrafts36();
    return (Array.isArray(aJamaah)?aJamaah:[])
      .filter(j=>j.status_nikah==='Belum Menikah')
      .filter(j=>j.status_sambung==='Tetap')
      .filter(j=>s?.type!=='kelompok'||j.kelompok_nama===s.kelompok)
      .map(j=>({...j,__kelas:d[String(j.did)]||j.kelas_kbm||j.kelas_usia||null}))
      .filter(j=>j.__kelas===kelas)
      .sort((a,b)=>String(a.nama||'').localeCompare(String(b.nama||''),'id'));
  }

  function statusSelect36(cls,id,explicit=false){
    return `<select class="${cls}" data-id="${esc36(id)}">
      ${explicit?'<option value="">— Pilih —</option>':''}
      <option value="Hadir">Hadir</option>
      <option value="Izin">Izin</option>
      <option value="Sakit">Sakit</option>
      <option value="Tidak Hadir">Tidak Hadir</option>
      <option value="Terlambat">Terlambat</option>
    </select>`;
  }

  function history36(container){
    if(!container)return;
    const sid=scopeId36();
    const rows=attendance36()
      .filter(x=>isController36()||x.scope===sid)
      .sort((a,b)=>String(b.date).localeCompare(String(a.date)))
      .slice(0,12);

    container.innerHTML=rows.length?`<div class="ppg-att-history">
      ${rows.map(x=>`<div class="ppg-att-history-row">
        <b>${esc36(x.date)}</b>
        <span>${esc36(x.scope)} · ${esc36(x.kelas)}<br><span class="ppg-mini-note">${esc36(x.title||'KBM')}</span></span>
        <span>${(x.students||[]).filter(s=>s.status==='Hadir').length}/${(x.students||[]).length} generus</span>
        <span class="hide-mobile">${(x.teachers||[]).filter(s=>s.status==='Hadir').length}/${(x.teachers||[]).length} guru</span>
      </div>`).join('')}
    </div>`:'<div class="ppg-empty">Belum ada riwayat KBM.</div>';
  }

  function flowHeader36(step){
    return `<div class="ppg36-flow">
      <div class="ppg36-step ${step===1?'active':'done'}"><b>1. Absensi Dewan Guru</b>Guru hadir ditentukan sebelum kelas dimulai.</div>
      <div class="ppg36-step ${step===2?'active':''}"><b>2. Absensi Generus</b>Dibuka setelah absensi guru selesai.</div>
    </div>`;
  }

  function renderAbsen36(){
    const el=document.getElementById('ppg-page-absen');if(!el)return;

    if(isController36()){
      el.innerHTML=`
        <div class="ppg-v33-stage">
          <div><div class="ppg-v33-stage-title">Kontrol Kehadiran KBM</div>
          <div class="ppg-v33-stage-sub">Controller Desa memonitor kehadiran dewan guru dan generus.</div></div>
          <span class="ppg-v33-live">Controller Desa</span>
        </div>
        <div class="ppg-controller-note">Urutan operasional kelompok: <b>absensi guru → absensi generus → simpan sesi KBM</b>.</div>
        <div class="ppg-panel" style="margin-top:0">
          <div class="ppg-panel-head"><div class="ppg-panel-title">Riwayat KBM</div></div>
          <div id="ppg36-history" class="ppg-panel-body"></div>
        </div>`;
      history36(document.getElementById('ppg36-history'));
      return;
    }

    window.PPG36_SESSION=null;
    el.innerHTML=`
      <div class="ppg-v33-stage">
        <div><div class="ppg-v33-stage-title">Mulai KBM · ${esc36(scope36()?.kelompok||'')}</div>
        <div class="ppg-v33-stage-sub">Absensi dewan guru wajib dilakukan sebelum absensi generus.</div></div>
        <span class="ppg-v33-live">Operasional Kelompok</span>
      </div>
      <div class="ppg-panel" style="margin-top:0">
        <div class="ppg-panel-body">
          <div class="ppg-att-setup">
            <select id="ppg36-class" class="ppg-select">
              ${['Balita','Cabe Rawit Tahap A','Cabe Rawit Tahap B','Pra Remaja','Remaja','Dewasa'].map(k=>`<option value="${esc36(k)}">${esc36(k)}</option>`).join('')}
            </select>
            <input id="ppg36-date" class="ppg-input" type="date" value="${today36()}">
            <input id="ppg36-title" class="ppg-input" placeholder="Materi / kegiatan KBM">
            <button class="ppg-btn" onclick="ppgStartAttendance36()">Mulai KBM</button>
          </div>
        </div>
        <div id="ppg36-roster"></div>
      </div>
      <div class="ppg-panel">
        <div class="ppg-panel-head"><div><div class="ppg-panel-title">Riwayat KBM</div><div class="ppg-panel-sub">Prototype tersimpan di browser.</div></div></div>
        <div id="ppg36-history" class="ppg-panel-body"></div>
      </div>`;
    history36(document.getElementById('ppg36-history'));
  }

  window.ppgStartAttendance36=function(){
    const kelas=document.getElementById('ppg36-class')?.value||'';
    const date=document.getElementById('ppg36-date')?.value||today36();
    const title=(document.getElementById('ppg36-title')?.value||'').trim()||'KBM';

    const teachers=teacherRows36().filter(t=>t.kelas==='Semua Kelas'||t.kelas===kelas);
    const students=studentRows36(kelas);

    window.PPG36_SESSION={kelas,date,title,teachers,students,teacherAttendance:[],studentAttendance:[]};

    const box=document.getElementById('ppg36-roster');if(!box)return;
    if(!teachers.length){
      box.innerHTML=`${flowHeader36(1)}
        <div class="ppg36-no-teacher">
          <b>Belum ada Dewan Guru untuk kelas ${esc36(kelas)}.</b>
          Atur Dewan Guru / Kelas Binaan terlebih dahulu sebelum KBM dapat dimulai.
        </div>`;
      return;
    }
    renderTeacherStep36();
  };

  function renderTeacherStep36(){
    const s=window.PPG36_SESSION;if(!s)return;
    const box=document.getElementById('ppg36-roster');if(!box)return;

    box.innerHTML=`
      ${flowHeader36(1)}
      <div class="ppg-att-box">
        <div class="ppg36-session-head">
          <div><div class="ppg36-session-title">Absensi Dewan Guru</div>
          <div class="ppg36-session-meta">${esc36(s.kelas)} · ${esc36(s.date)} · ${esc36(s.title)}</div></div>
          <span class="ppg36-required">Wajib diisi dulu</span>
        </div>
        <div class="ppg-table-wrap">
          <table class="ppg-table" style="min-width:620px">
            <thead><tr><th>No</th><th>Nama Guru</th><th>Dapukan / Peran</th><th>Status</th><th>Catatan</th></tr></thead>
            <tbody>${s.teachers.map((t,i)=>`<tr>
              <td>${i+1}</td>
              <td><b>${esc36(t.nama)}</b></td>
              <td>${esc36((t.roles||[]).join(' · ')||'Guru')}</td>
              <td>${statusSelect36('ppg36-teacher-status',t.did,true)}</td>
              <td><input class="ppg-input ppg36-teacher-note" data-id="${esc36(t.did)}" placeholder="Opsional"></td>
            </tr>`).join('')}</tbody>
          </table>
        </div>
        <div class="ppg36-actions">
          <button class="ppg-btn secondary" onclick="ppgCancelAttendance36()">Batalkan</button>
          <button class="ppg-btn" onclick="ppgTeacherAttendanceDone36()">Selesai Absensi Guru →</button>
        </div>
      </div>`;
  }

  window.ppgTeacherAttendanceDone36=function(){
    const s=window.PPG36_SESSION;if(!s)return;
    const selects=[...document.querySelectorAll('.ppg36-teacher-status')];
    if(!selects.length){toast('Dewan guru belum tersedia.',true);return}
    const missing=selects.filter(x=>!x.value);
    if(missing.length){
      toast(`Status ${missing.length} guru belum diisi.`,true);
      missing[0]?.focus();
      return;
    }
    const notes={};
    document.querySelectorAll('.ppg36-teacher-note').forEach(x=>notes[x.dataset.id]=x.value||'');
    s.teacherAttendance=selects.map(x=>{
      const t=s.teachers.find(y=>String(y.did)===String(x.dataset.id));
      return {did:x.dataset.id,nama:t?.nama||'',status:x.value,note:notes[x.dataset.id]||''};
    });

    // Minimal satu guru/pengajar hadir atau terlambat agar kelas benar-benar dapat dimulai.
    const onSite=s.teacherAttendance.some(x=>x.status==='Hadir'||x.status==='Terlambat');
    if(!onSite){
      toast('KBM belum dapat dilanjutkan karena belum ada dewan guru yang hadir.',true);
      return;
    }
    renderStudentStep36();
  };

  function renderStudentStep36(){
    const s=window.PPG36_SESSION;if(!s)return;
    const box=document.getElementById('ppg36-roster');if(!box)return;
    const hadir=s.teacherAttendance.filter(x=>x.status==='Hadir'||x.status==='Terlambat').length;
    const tidak=s.teacherAttendance.length-hadir;

    box.innerHTML=`
      ${flowHeader36(2)}
      <div class="ppg36-teacher-summary">
        <span class="ppg36-summary-pill"><b>${hadir}</b> guru hadir</span>
        <span class="ppg36-summary-pill"><b>${tidak}</b> izin/sakit/tidak hadir</span>
        <span class="ppg36-summary-pill"><b>${s.teacherAttendance.length}</b> guru sudah diabsen</span>
      </div>
      <div class="ppg-att-box">
        <div class="ppg36-session-head">
          <div><div class="ppg36-session-title">Absensi Generus</div>
          <div class="ppg36-session-meta">${esc36(s.kelas)} · ${s.students.length} peserta</div></div>
          <span class="ppg-badge ppg-v33-confirmed">Guru selesai ✓</span>
        </div>
        <div class="ppg-table-wrap">
          <table class="ppg-table" style="min-width:620px">
            <thead><tr><th>No</th><th>Nama Generus</th><th>Status</th><th>Catatan</th></tr></thead>
            <tbody>${s.students.map((j,i)=>`<tr>
              <td>${i+1}</td><td><b>${esc36(j.nama)}</b><div class="ppg-mini-note">KK: ${esc36(j.nama_kk||'-')}</div></td>
              <td>${statusSelect36('ppg36-student-status',j.did,false)}</td>
              <td><input class="ppg-input ppg36-student-note" data-id="${esc36(j.did)}" placeholder="Opsional"></td>
            </tr>`).join('')}</tbody>
          </table>
        </div>
        <div class="ppg36-actions">
          <button class="ppg-btn secondary" onclick="ppgBackToTeacher36()">← Ubah Absensi Guru</button>
          <button class="ppg-btn" onclick="ppgSaveAttendance36()">Simpan & Akhiri KBM</button>
        </div>
      </div>`;
  }

  window.ppgBackToTeacher36=function(){
    const s=window.PPG36_SESSION;if(!s)return;
    renderTeacherStep36();
    setTimeout(()=>{
      (s.teacherAttendance||[]).forEach(a=>{
        const sel=document.querySelector(`.ppg36-teacher-status[data-id="${CSS.escape(String(a.did))}"]`);
        const note=document.querySelector(`.ppg36-teacher-note[data-id="${CSS.escape(String(a.did))}"]`);
        if(sel)sel.value=a.status||'';
        if(note)note.value=a.note||'';
      });
    },0);
  };

  window.ppgCancelAttendance36=function(){
    window.PPG36_SESSION=null;
    const box=document.getElementById('ppg36-roster');
    if(box)box.innerHTML='';
  };

  window.ppgSaveAttendance36=function(){
    const s=window.PPG36_SESSION;if(!s)return;
    if(!s.teacherAttendance?.length){
      toast('Absensi guru harus diselesaikan terlebih dahulu.',true);return;
    }

    const notes={};
    document.querySelectorAll('.ppg36-student-note').forEach(x=>notes[x.dataset.id]=x.value||'');
    s.studentAttendance=[...document.querySelectorAll('.ppg36-student-status')].map(x=>{
      const j=s.students.find(y=>String(y.did)===String(x.dataset.id));
      return {did:x.dataset.id,nama:j?.nama||'',status:x.value||'Hadir',note:notes[x.dataset.id]||''};
    });

    const all=attendance36();
    const key=[scopeId36(),s.date,s.kelas,s.title].join('|');
    const rec={
      key,scope:scopeId36(),date:s.date,kelas:s.kelas,title:s.title,
      students:s.studentAttendance,
      teachers:s.teacherAttendance,
      teacher_attendance_completed_first:true,
      saved_at:ubnbWibIso84()
    };
    const ix=all.findIndex(x=>x.key===key);
    if(ix>=0)all[ix]=rec;else all.push(rec);
    saveAttendance36(all);
    window.PPG36_SESSION=null;

    toast('KBM selesai. Absensi guru dan generus tersimpan.');
    renderAbsen36();
    if(typeof window.ppgRenderDashboard35==='function')window.ppgRenderDashboard35();
    else if(typeof window.ppgRenderAll==='function')window.ppgRenderAll();
  };

  // Override route for attendance only, leave all other v35 modules intact.
  const priorOpen36=window.ppgOpenPage;
  window.ppgOpenPage=function(page,btn){
    if(page==='absen'){
      document.querySelectorAll('.ppg-page').forEach(x=>x.classList.remove('active'));
      document.querySelectorAll('.ppg-tab').forEach(x=>x.classList.remove('active'));
      document.getElementById('ppg-page-absen')?.classList.add('active');
      btn?.classList.add('active');
      renderAbsen36();
      return;
    }
    return priorOpen36?.apply(this,arguments);
  };

  // If current PPG is already open, redraw attendance page only when selected.
  setTimeout(()=>{
    const active=document.querySelector('.ppg-tab.active')?.dataset?.page;
    if(active==='absen')renderAbsen36();
  },700);

  window.ppgRenderAbsen36=renderAbsen36;
})();

/* ============================================================
   SOURCE: ubnb-v37-ppg-workflow-script
   ============================================================ */
(function(){
const S='ubnb_ppg_v37_classes',R='ubnb_ppg_v37_reports',L='ubnb_ppg_v37_logger',CD='ubnb_ppg_v33_class_drafts',TG='ubnb_ppg_v35_custom_teachers',TA='ubnb_ppg_v34_teacher_assign';
const C=['Balita','Cabe Rawit Tahap A','Cabe Rawit Tahap B','Pra Remaja','Remaja','Dewasa'];
let tab='active',hist='daily',startOpen=false,finishMode=false;
const esc=s=>String(s??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
const J=(k,d)=>{try{return JSON.parse(localStorage.getItem(k)||JSON.stringify(d))}catch(_){return d}}, W=(k,v)=>localStorage.setItem(k,JSON.stringify(v));
function sc(){try{return JSON.parse(sessionStorage.getItem('ubnb_ppg_v34_scope')||'null')}catch(_){return null}} function ctl(){return sc()?.type==='controller'} function sid(){return ctl()?'DESA':(sc()?.kelompok||'')}
function today(){try{return new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Jakarta',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date())}catch(_){return ubnbWibIso84().slice(0,10)}}
function superU(){const r=String(CU?.role||'').toLowerCase();return !!(CU?.is_master||CU?.master||/master|super/.test(r)||/setyo/i.test(CU?.nama||''))}
function gps(){return new Promise(res=>{if(!navigator.geolocation)return res(null);navigator.geolocation.getCurrentPosition(p=>res({lat:p.coords.latitude,lng:p.coords.longitude,accuracy:p.coords.accuracy}),()=>res(null),{enableHighAccuracy:false,timeout:3500,maximumAge:60000})})}
function log(type,data,g){const a=J(L,[]);a.push({at:ubnbWibIso84(),type,account:CU?.nama||CU?.username||'-',scope:sid(),...data,gps:g});W(L,a)}
function drafts(){return J(CD,{})} function gen(){let a=(aJamaah||[]).filter(j=>j.status_nikah==='Belum Menikah'&&j.status_sambung==='Tetap');if(sc()?.type==='kelompok')a=a.filter(j=>j.kelompok_nama===sc().kelompok);const d=drafts();return a.map(j=>({...j,__kelas:d[j.did]||j.kelas_kbm||j.kelas_usia||'Belum Ditentukan',__umur:umurFromTgl(j.tgl_lahir)}))}
function isTR(x){x=' '+String(x||'').toLowerCase().replace(/[._/-]+/g,' ').replace(/\s+/g,' ')+' ';return /(^|\s)mt(\s|$)/.test(x)||/(^|\s)ms(\s|$)/.test(x)}
function teachers(){const m=new Map(),s=sc();(aPengurus||[]).filter(p=>p&&p.aktif!==false&&isTR(p.dapukan)).forEach(p=>{if(s?.type==='kelompok'&&(p.level!=='kelompok'||p.kelompok_nama!==s.kelompok))return;const j=findJamaahAny(p.did);if(!j)return;const k=String(p.did);if(!m.has(k))m.set(k,{did:k,nama:j.nama,roles:[]});if(p.dapukan&&!m.get(k).roles.includes(p.dapukan))m.get(k).roles.push(p.dapukan)});J(TG,[]).forEach(c=>{if(s?.type==='kelompok'&&c.kelompok_nama!==s.kelompok)return;const j=(aJamaah||[]).find(x=>String(x.did)===String(c.did));if(!j)return;const k=String(c.did);if(!m.has(k))m.set(k,{did:k,nama:j.nama,roles:[c.role||'Guru']})});const as=J(TA,{});return [...m.values()].map(t=>({...t,kelas:as[t.did]||'Semua Kelas'})).sort((a,b)=>a.nama.localeCompare(b.nama,'id'))}
const tfc=k=>teachers().filter(t=>t.kelas==='Semua Kelas'||t.kelas===k), sfc=k=>gen().filter(j=>j.__kelas===k).sort((a,b)=>a.nama.localeCompare(b.nama,'id'));
function ss(){return J(S,[])} function saveSS(v){W(S,v)} function vis(){return ss().filter(x=>ctl()||x.scope===sid())}
function setTabs(){const t=document.querySelector('#ppg-shell .ppg-tabs');if(!t)return;['absen','generus'].forEach(p=>{const b=t.querySelector(`[data-page="${p}"]`);if(b)b.style.display='none'});const k=t.querySelector('[data-page="kelas"]');if(k)k.textContent='Kelas KBM';if(superU()&&!t.querySelector('[data-page="logger"]')){const b=document.createElement('button');b.className='ppg-tab';b.dataset.page='logger';b.textContent='Data Logger';b.onclick=()=>ppgOpenPage('logger',b);t.appendChild(b);const s=document.createElement('section');s.id='ppg-page-logger';s.className='ppg-page';document.querySelector('#ppg-shell .ppg-body')?.appendChild(s)}}
function setup(){const e=document.getElementById('ppg-page-setup');if(!e)return;if(ctl()){e.innerHTML='<div class="ppg-controller-note">Setup Kelas dilakukan pada scope kelompok.</div>';return}const a=gen();e.innerHTML=`<div class="ppg-v33-stage"><div><div class="ppg-v33-stage-title">Setup Kelas · ${esc(sc()?.kelompok||'')}</div><div class="ppg-v33-stage-sub">Dikelompokkan per kelas aktual.</div></div></div>${[...C,'Belum Ditentukan'].map(k=>{const r=a.filter(x=>x.__kelas===k);return !r.length?'':`<section class="ppg37-class-group"><div class="ppg37-class-head"><b>${esc(k)}</b><span>${r.length} generus</span></div><div style="overflow:auto"><table class="ppg37-setup-table"><thead><tr><th>No</th><th>Nama</th><th>Umur</th><th>Ubah Kelas</th></tr></thead><tbody>${r.map((j,i)=>`<tr><td>${i+1}</td><td><div class="ppg37-name">${esc(j.nama)}</div><div class="ppg37-kk">KK: ${esc(j.nama_kk||'-')}</div></td><td>${j.__umur??'—'}</td><td><select onchange="ppg37Class('${esc(j.did)}',this.value)">${[...C,'Belum Ditentukan'].map(c=>`<option ${j.__kelas===c?'selected':''}>${esc(c)}</option>`).join('')}</select></td></tr>`).join('')}</tbody></table></div></section>`}).join('')}`}
window.ppg37Class=(did,v)=>{const d=drafts();if(v==='Belum Ditentukan')delete d[did];else d[did]=v;W(CD,d);setup()};
function pct(s){const n=s.students?.length||0,h=s.students?.filter(x=>x.status==='Hadir').length||0;return {n,h,p:n?Math.round(h/n*100):0}}
function activeCards(){const a=vis().filter(x=>x.status==='active'&&x.date===today());return a.length?`<div class="ppg37-cards">${a.map(s=>{const p=pct(s);return `<div class="ppg37-class-card" onclick="ppg37Open('${esc(s.id)}')"><div class="ppg37-card-title">${esc(s.className)}</div><div class="ppg37-card-meta">${esc(s.scope)} · Guru: ${esc(s.teacherName)}</div><div class="ppg37-card-att"><div class="ppg37-card-pct">${p.p}%</div><div class="ppg37-card-count">${p.h}/${p.n} hadir</div></div><div class="ppg37-progress"><span style="width:${p.p}%"></span></div></div>`}).join('')}</div>`:'<div class="ppg-empty">Belum ada kelas aktif hari ini.</div>'}
function week(d){const x=new Date(d+'T00:00:00'),n=(x.getDay()+6)%7;x.setDate(x.getDate()-n);return x.toISOString().slice(0,10)}
function history(){const a=vis().filter(x=>x.status==='finished').sort((a,b)=>b.date.localeCompare(a.date));if(!a.length)return '<div class="ppg-empty">Belum ada kelas selesai.</div>';const g=new Map();a.forEach(s=>{let k=hist==='daily'?s.date:hist==='weekly'?week(s.date):s.date.slice(0,7);if(!g.has(k))g.set(k,[]);g.get(k).push(s)});return `<div class="ppg37-subtabs" style="margin-bottom:8px">${[['daily','Harian'],['weekly','Mingguan'],['monthly','Bulanan']].map(x=>`<button class="ppg37-subtab ${hist===x[0]?'active':''}" onclick="ppg37Hist('${x[0]}')">${x[1]}</button>`).join('')}</div>${[...g.entries()].map(([k,v])=>`<div class="ppg37-history-group"><div class="ppg37-history-head">${esc(k)} · ${v.length} kelas</div>${v.map(s=>{const p=pct(s);return `<div class="ppg37-history-item"><b>${esc(s.date)}</b><span><b>${esc(s.className)}</b><br><span class="ppg-mini-note">${esc(s.scope)} · ${esc(s.teacherName)}</span></span><span>${p.h}/${p.n} hadir</span><span class="optional">${p.p}%</span></div>`}).join('')}</div>`).join('')}`}
window.ppg37Hist=x=>{hist=x;kelas()}; window.ppg37Tab=x=>{tab=x;kelas()};window.ppg37Toggle=()=>{startOpen=!startOpen;kelas()};
function kelas(){const e=document.getElementById('ppg-page-kelas');if(!e)return;if(ctl()){e.innerHTML=`<div class="ppg-v33-stage"><div><div class="ppg-v33-stage-title">Kelas KBM · Controller Desa</div><div class="ppg-v33-stage-sub">Monitoring kelas aktif dan riwayat.</div></div></div>${activeCards()}<div class="ppg-panel"><div class="ppg-panel-head"><div class="ppg-panel-title">Riwayat</div></div><div class="ppg-panel-body">${history()}</div></div>`;return}e.innerHTML=`<div class="ppg37-topline"><div class="ppg37-subtabs"><button class="ppg37-subtab ${tab==='active'?'active':''}" onclick="ppg37Tab('active')">Aktif Hari Ini</button><button class="ppg37-subtab ${tab==='history'?'active':''}" onclick="ppg37Tab('history')">Riwayat</button></div><button class="ppg-btn" onclick="ppg37Toggle()">+ Mulai Kelas Baru</button></div><div class="ppg37-start-panel ${startOpen?'show':''}"><div class="ppg-panel" style="margin-top:0"><div class="ppg-panel-body"><div class="ppg37-start-grid"><div class="ppg37-field"><label>Tanggal</label><input id="p37date" type="date" value="${today()}" readonly></div><div class="ppg37-field"><label>Guru</label><select id="p37guru"><option value="">Pilih guru...</option>${teachers().map(t=>`<option value="${esc(t.did)}">${esc(t.nama)}</option>`).join('')}</select></div><div class="ppg37-field"><label>Kelas</label><select id="p37kelas"><option value="">Pilih kelas...</option>${C.map(k=>`<option>${esc(k)}</option>`).join('')}</select></div><button class="ppg-btn" onclick="ppg37Start()">Mulai Kelas</button></div></div></div></div><div id="p37content">${tab==='active'?activeCards():history()}</div><div id="p37detail"></div>`}
window.ppg37Start=async()=>{const date=document.getElementById('p37date')?.value||today(),did=document.getElementById('p37guru')?.value,k=document.getElementById('p37kelas')?.value;if(!did||!k)return toast('Pilih guru dan kelas terlebih dahulu.',true);const t=teachers().find(x=>x.did===did);if(!tfc(k).some(x=>x.did===did))return toast('Guru belum ditetapkan untuk kelas ini.',true);const s={id:'K'+Date.now(),scope:sid(),date,className:k,teacherDid:did,teacherName:t.nama,startedAt:ubnbWibIso84(),startedBy:CU?.nama||CU?.username,status:'pending',teacherAttendance:[],students:sfc(k).map(j=>({did:String(j.did),nama:j.nama,status:'Belum Hadir'})),generalMaterials:[],studentMaterials:{},generalNote:'',studentNotes:{}};const a=ss();a.push(s);saveSS(a);const g=await gps();log('MULAI_KELAS',{sessionId:s.id,className:k,teacherName:t.nama,date},g);teacherStep(s)};
function teacherStep(s){const e=document.getElementById('p37detail');if(!e)return;const ts=tfc(s.className);e.innerHTML=`<div class="ppg-panel"><div class="ppg-panel-head"><div><div class="ppg-panel-title">Absensi Dewan Guru</div><div class="ppg-panel-sub">Wajib sebelum kelas aktif.</div></div></div><div class="ppg-table-wrap"><table class="ppg-table"><thead><tr><th>No</th><th>Nama</th><th>Status</th></tr></thead><tbody>${ts.map((t,i)=>`<tr><td>${i+1}</td><td><b>${esc(t.nama)}</b></td><td><select class="p37ta" data-id="${esc(t.did)}"><option value="">— Pilih —</option><option ${t.did===s.teacherDid?'selected':''}>Hadir</option><option>Izin</option><option>Sakit</option><option>Tidak Hadir</option><option>Terlambat</option></select></td></tr>`).join('')}</tbody></table></div><div class="ppg36-actions"><button class="ppg-btn" onclick="ppg37TeacherDone('${esc(s.id)}')">Selesai Absensi Guru & Aktifkan Kelas</button></div></div>`;e.scrollIntoView({behavior:'smooth'})}
window.ppg37TeacherDone=id=>{const a=ss(),s=a.find(x=>x.id===id),els=[...document.querySelectorAll('.p37ta')];if(els.some(x=>!x.value))return toast('Status semua dewan guru harus diisi.',true);const tm=new Map(teachers().map(t=>[t.did,t]));s.teacherAttendance=els.map(x=>({did:x.dataset.id,nama:tm.get(x.dataset.id)?.nama||'',status:x.value}));if(!s.teacherAttendance.some(x=>['Hadir','Terlambat'].includes(x.status)))return toast('Belum ada dewan guru yang hadir.',true);s.status='active';saveSS(a);startOpen=false;tab='active';kelas();setTimeout(()=>detail(id),0)};
window.ppg37Open=id=>detail(id);
function detail(id){const s=ss().find(x=>x.id===id),e=document.getElementById('p37detail');if(!s||!e)return;const sec=st=>s.students.filter(x=>x.status===st);e.innerHTML=`<div class="ppg-panel"><div class="ppg-panel-head"><div><div class="ppg-panel-title">${esc(s.className)} · ${esc(s.date)}</div><div class="ppg-panel-sub">Guru: ${esc(s.teacherName)}</div></div><button class="ppg-btn gold" onclick="ppg37Finish('${esc(id)}')">Kelas Selesai</button></div><div class="ppg-panel-body"><div class="ppg37-material-box"><b style="font-size:10.5px">Materi Umum Hari Ini</b><div class="ppg37-material-row" style="margin-top:6px"><input id="p37gm" placeholder="Materi untuk semua murid hadir"><button class="ppg-btn" onclick="ppg37AddGeneral('${esc(id)}')">+ Tambah</button></div><div>${s.generalMaterials.map(m=>`<span class="ppg37-chip">${esc(m.text)}</span>`).join('')}</div></div>${[['Hadir',true],['Izin',false],['Belum Hadir',false]].map(([st,p])=>`<div class="ppg37-status-section"><div class="ppg37-status-title"><span>${st}</span><span>${sec(st).length}</span></div>${sec(st).map(x=>studentRow(s,x,p)).join('')||'<div class="ppg-mini-note">Tidak ada.</div>'}</div>`).join('')}${finishMode?finishPanel(s):''}</div></div>`;e.scrollIntoView({behavior:'smooth'})}
function studentRow(s,x,p){const j=(aJamaah||[]).find(y=>String(y.did)===x.did);return `<div class="ppg37-student-row ${p?'present':''}"><div ${p?`onclick="ppg37Student('${esc(s.id)}','${esc(x.did)}')"`:''}><div class="ppg37-student-name">${esc(x.nama)}</div><div class="ppg37-student-kk">KK: ${esc(j?.nama_kk||'-')}</div></div><select class="ppg37-status-select" onchange="ppg37Status('${esc(s.id)}','${esc(x.did)}',this.value)">${['Hadir','Izin','Belum Hadir'].map(v=>`<option ${x.status===v?'selected':''}>${v}</option>`).join('')}</select>${p?`<button class="ppg37-mini-btn" onclick="ppg37Student('${esc(s.id)}','${esc(x.did)}')">Materi / Catatan</button>`:'<span></span>'}</div>`}
window.ppg37Status=(id,did,v)=>{const a=ss(),s=a.find(x=>x.id===id),x=s?.students.find(y=>y.did===did);if(x)x.status=v;saveSS(a);kelas();setTimeout(()=>detail(id),0)};
window.ppg37AddGeneral=id=>{const t=document.getElementById('p37gm')?.value.trim();if(!t)return;const a=ss(),s=a.find(x=>x.id===id);s.generalMaterials.push({text:t,at:ubnbWibIso84()});saveSS(a);detail(id)};
function modal(){if(document.getElementById('p37modal'))return;document.body.insertAdjacentHTML('beforeend','<div id="p37modal" class="ppg37-modal"><div class="ppg37-modal-card"><div class="ppg37-modal-head"><b id="p37mt">Murid</b><button class="ppg37-close" onclick="ppg37CloseM()">✕</button></div><div id="p37mb" class="ppg37-modal-body"></div></div></div>')}
window.ppg37CloseM=()=>document.getElementById('p37modal')?.classList.remove('show');window.ppg37Student=(id,did)=>{modal();const s=ss().find(x=>x.id===id),x=s?.students.find(y=>y.did===did),m=s?.studentMaterials?.[did]||[],n=s?.studentNotes?.[did]||'';document.getElementById('p37mt').textContent=x?.nama||'';document.getElementById('p37mb').innerHTML=`<div class="ppg37-material-box"><b>Materi Khusus</b><div class="ppg37-material-row" style="margin-top:6px"><input id="p37sm" placeholder="Materi khusus untuk murid ini"><button class="ppg-btn" onclick="ppg37AddStudent('${esc(id)}','${esc(did)}')">+ Tambah</button></div><div>${m.map(z=>`<span class="ppg37-chip">${esc(z.text)}</span>`).join('')}</div></div><div class="ppg37-field"><label>Catatan Khusus</label><input value="${esc(n)}" onblur="ppg37StudentNote('${esc(id)}','${esc(did)}',this.value)" placeholder="Catatan khusus"></div>`;document.getElementById('p37modal').classList.add('show')};
window.ppg37AddStudent=(id,did)=>{const t=document.getElementById('p37sm')?.value.trim();if(!t)return;const a=ss(),s=a.find(x=>x.id===id);s.studentMaterials[did]=s.studentMaterials[did]||[];s.studentMaterials[did].push({text:t,at:ubnbWibIso84()});saveSS(a);ppg37Student(id,did)};window.ppg37StudentNote=(id,did,v)=>{const a=ss(),s=a.find(x=>x.id===id);s.studentNotes[did]=v||'';saveSS(a)};
window.ppg37Finish=id=>{finishMode=true;detail(id)};function finishPanel(s){return `<div class="ppg37-finish-panel"><b>Selesaikan Kelas</b><div class="ppg-mini-note" style="margin:4px 0 7px">Tambahkan catatan umum atau khusus.</div><textarea id="p37gn" placeholder="Catatan umum">${esc(s.generalNote||'')}</textarea><div class="ppg37-note-grid">${s.students.map(x=>`<div class="ppg37-note-row"><b>${esc(x.nama)}</b><input class="p37fn" data-id="${esc(x.did)}" value="${esc(s.studentNotes[x.did]||'')}" placeholder="Catatan khusus (opsional)"></div>`).join('')}</div><div class="ppg36-actions"><button class="ppg-btn secondary" onclick="finishMode=false;ppg37Open('${esc(s.id)}')">Batal</button><button class="ppg-btn gold" onclick="ppg37Close('${esc(s.id)}')">Tutup Kelas</button></div></div>`}
window.ppg37Close=id=>{const a=ss(),s=a.find(x=>x.id===id);s.generalNote=document.getElementById('p37gn')?.value||'';document.querySelectorAll('.p37fn').forEach(x=>s.studentNotes[x.dataset.id]=x.value||'');s.status='finished';s.finishedAt=ubnbWibIso84();s.finishedBy=CU?.nama||CU?.username||'-';saveSS(a);log('TUTUP_KELAS',{sessionId:id,className:s.className,teacherName:s.teacherName,date:s.date},null);finishMode=false;tab='history';kelas()};
function dAfter(d){const x=new Date(d+'T00:00:00');x.setDate(x.getDate()+1);return x.toISOString().slice(0,10)} function d30(d){const x=new Date(d+'T00:00:00');x.setDate(x.getDate()+30);return x.toISOString().slice(0,10)}
function fin(){return vis().filter(s=>s.status==='finished').sort((a,b)=>a.date.localeCompare(b.date))}function nextP(){const a=fin();if(!a.length)return null;const rr=J(R,[]).filter(r=>ctl()||r.scope===sid()).sort((a,b)=>a.end.localeCompare(b.end));const st=rr.length?dAfter(rr.at(-1).end):a[0].date,la=a.at(-1).date;if(st>la)return null;const cp=d30(st);return {start:st,end:la<cp?la:cp}}
window.ppg37GenReport=()=>{const p=nextP();if(!p)return toast('Belum ada kegiatan baru untuk laporan.',true);const ids=fin().filter(s=>s.date>=p.start&&s.date<=p.end).map(s=>s.id),a=J(R,[]);a.push({id:'R'+Date.now(),scope:sid(),start:p.start,end:p.end,ids,by:CU?.nama||CU?.username,at:ubnbWibIso84()});W(R,a);report()};
function pivot(k,a){const s=a.filter(x=>x.className===k);if(!s.length)return'';const ds=[...new Set(s.map(x=>x.date))].sort(),m=new Map();s.forEach(z=>z.students.forEach(x=>{if(!m.has(x.did))m.set(x.did,{nama:x.nama,st:{}});m.get(x.did).st[z.date]=x.status}));return `<div class="ppg-panel"><div class="ppg-panel-head"><div class="ppg-panel-title">${esc(k)}</div></div><div class="ppg37-pivot-wrap"><table class="ppg37-pivot"><thead><tr><th>Nama Murid</th>${ds.map(d=>`<th>${esc(d.slice(5))}</th>`).join('')}<th>Total Hadir</th><th>%</th></tr></thead><tbody>${[...m.values()].sort((a,b)=>a.nama.localeCompare(b.nama,'id')).map(r=>{const v=ds.map(d=>r.st[d]||'—'),hh=v.filter(x=>x==='Hadir').length,p=Math.round(hh/ds.length*100);return `<tr><td class="name">${esc(r.nama)}</td>${v.map(x=>`<td>${x==='Hadir'?'H':x==='Izin'?'I':x==='Belum Hadir'?'B':'—'}</td>`).join('')}<td>${hh}</td><td>${p}%</td></tr>`}).join('')}</tbody></table></div></div>`}
function mats(a){const m=new Map();a.forEach(s=>{s.generalMaterials.forEach(x=>{const k='Umum|'+x.text.toLowerCase();if(!m.has(k))m.set(k,{t:'Umum',x:x.text,n:0,c:new Set()});m.get(k).n++;m.get(k).c.add(s.className)});Object.values(s.studentMaterials||{}).flat().forEach(x=>{const k='Khusus|'+x.text.toLowerCase();if(!m.has(k))m.set(k,{t:'Khusus',x:x.text,n:0,c:new Set()});m.get(k).n++;m.get(k).c.add(s.className)})});return [...m.values()]}
function report(){const e=document.getElementById('ppg-page-laporan');if(!e)return;const rr=J(R,[]).filter(r=>ctl()||r.scope===sid()).sort((a,b)=>b.end.localeCompare(a.end)),n=nextP(),r=rr[0];let c='<div class="ppg-empty">Belum ada laporan yang digenerate.</div>';if(r){const a=ss().filter(s=>r.ids.includes(s.id)),mm=mats(a);c=`<div class="ppg37-report-toolbar"><div><b>Periode ${esc(r.start)} s.d ${esc(r.end)}</b><br><span class="ppg-mini-note">Dibuat oleh ${esc(r.by)}</span></div></div><div class="ppg-panel"><div class="ppg-panel-head"><div class="ppg-panel-title">Performa Kehadiran Generus</div></div></div>${C.map(k=>pivot(k,a)).join('')}<div class="ppg-panel"><div class="ppg-panel-head"><div><div class="ppg-panel-title">Pencapaian Materi</div><div class="ppg-panel-sub">Tanpa menyebut nama murid.</div></div></div><div class="ppg-panel-body">${mm.length?`<div class="ppg37-mat-report">${mm.map(x=>`<div class="ppg37-mat-item"><b>${x.t}</b><span>${esc(x.x)}<br><span class="ppg-mini-note">${esc([...x.c].join(', '))}</span></span><span>${x.n}×</span></div>`).join('')}</div>`:'<div class="ppg-empty">Belum ada materi.</div>'}</div></div>`}e.innerHTML=`<div class="ppg-v33-stage"><div><div class="ppg-v33-stage-title">Laporan PPG</div><div class="ppg-v33-stage-sub">Periode berlanjut dari laporan terakhir, maksimum ±1 bulan.</div></div></div><div class="ppg37-report-toolbar"><div>${n?`Periode berikutnya: <b>${esc(n.start)} s.d ${esc(n.end)}</b>`:'Tidak ada kegiatan baru.'}</div><button class="ppg-btn" onclick="ppg37GenReport()" ${n?'':'disabled'}>Generate Laporan Berikutnya</button></div>${c}`}
function loggerPage(){const e=document.getElementById('ppg-page-logger');if(!e)return;if(!superU()){e.innerHTML='<div class="ppg-empty">Tidak ada akses.</div>';return}const a=J(L,[]).slice().reverse();e.innerHTML=`<div style="overflow:auto"><table class="ppg37-logger-table"><thead><tr><th>Waktu</th><th>Aktivitas</th><th>Akun</th><th>Scope</th><th>Kelas</th><th>Guru</th><th>Lokasi</th></tr></thead><tbody>${a.map(x=>`<tr><td>${esc(ubnbFmtWib84(x.at,true))}</td><td>${esc(x.type)}</td><td>${esc(x.account)}</td><td>${esc(x.scope)}</td><td>${esc(x.className||'-')}</td><td>${esc(x.teacherName||'-')}</td><td>${x.gps?`${x.gps.lat.toFixed(6)}, ${x.gps.lng.toFixed(6)}<br><span class="ppg-mini-note">±${Math.round(x.gps.accuracy||0)} m</span>`:'—'}</td></tr>`).join('')}</tbody></table></div>`}
function dash(){const e=document.getElementById('ppg-page-dashboard');if(!e)return;const a=vis(),ac=a.filter(s=>s.status==='active'&&s.date===today()).length,done=a.filter(s=>s.status==='finished'&&s.date===today()).length,st=a.filter(s=>s.status==='finished').flatMap(s=>s.students||[]),th=a.filter(s=>s.status==='finished').flatMap(s=>s.teacherAttendance||[]),hp=st.filter(x=>x.status==='Hadir').length,tp=th.filter(x=>['Hadir','Terlambat'].includes(x.status)).length;e.innerHTML=`<div class="ppg-v33-stage"><div><div class="ppg-v33-stage-title">${ctl()?'Controller Desa':esc(sc()?.label||'PPG')}</div><div class="ppg-v33-stage-sub">${ctl()?'Monitoring aktivitas KBM':'Operasional kegiatan KBM'}</div></div></div><div class="ppg-grid-4"><div class="ppg-stat"><div class="ppg-stat-label">Generus</div><div class="ppg-stat-value">${gen().length}</div></div><div class="ppg-stat"><div class="ppg-stat-label">Dewan Guru</div><div class="ppg-stat-value">${teachers().length}</div></div><div class="ppg-stat"><div class="ppg-stat-label">Kelas Hari Ini</div><div class="ppg-stat-value">${ac}</div><div class="ppg-stat-sub">${done} selesai</div></div><div class="ppg-stat"><div class="ppg-stat-label">Kehadiran Generus</div><div class="ppg-stat-value">${st.length?Math.round(hp/st.length*100):0}%</div></div></div><div class="ppg-grid-3"><div class="ppg-panel"><div class="ppg-panel-head"><div class="ppg-panel-title">Kelas Aktif Hari Ini</div></div><div class="ppg-panel-body">${activeCards()}</div></div><div class="ppg-panel"><div class="ppg-panel-head"><div class="ppg-panel-title">Kehadiran Dewan Guru</div></div><div class="ppg-panel-body"><div class="ppg-stat-value">${th.length?Math.round(tp/th.length*100):0}%</div></div></div><div class="ppg-panel"><div class="ppg-panel-head"><div class="ppg-panel-title">Laporan</div></div><div class="ppg-panel-body"><div class="ppg-stat-value">${J(R,[]).filter(r=>ctl()||r.scope===sid()).length}</div></div></div></div>`}
window.ppgOpenPage=function(p,b){if(p==='absen')p='kelas';if(p==='generus')p='setup';document.querySelectorAll('.ppg-page').forEach(x=>x.classList.remove('active'));document.querySelectorAll('.ppg-tab').forEach(x=>x.classList.remove('active'));document.getElementById('ppg-page-'+p)?.classList.add('active');b?.classList.add('active');setTabs();if(p==='dashboard')dash();else if(p==='setup')setup();else if(p==='kelas')kelas();else if(p==='guru')window.ppgRenderGuru35?.();else if(p==='kurikulum')window.ppgRenderKurikulum35?.();else if(p==='laporan')report();else if(p==='logger')loggerPage()};
window.ppgRenderAll=function(){setTabs();dash();if(!ctl())setup();kelas();window.ppgRenderGuru35?.();window.ppgRenderKurikulum35?.();report();if(superU())loggerPage()};
setTimeout(()=>{setTabs();if(document.getElementById('ppg-shell')?.classList.contains('show'))window.ppgRenderAll()},900);
})();

/* ============================================================
   SOURCE: ubnb-v38-mobile-setup-simpatisan-script
   ============================================================ */
(function(){
  const SESSION_KEY='ubnb_ppg_v37_classes';
  const REPORT_KEY='ubnb_ppg_v37_reports';
  const DRAFT_KEY='ubnb_ppg_v33_class_drafts';
  const SYMP_KEY='ubnb_ppg_v38_simpatisan';
  const COLLAPSE_KEY='ubnb_ppg_v38_setup_collapsed';
  const TEACHER_ADD_KEY='ubnb_ppg_v35_custom_teachers';
  const TEACHER_ASSIGN_KEY='ubnb_ppg_v34_teacher_assign';
  const LOGGER_KEY='ubnb_ppg_v37_logger';

  const CLASSES=[
    'Balita','Cabe Rawit Tahap A','Cabe Rawit Tahap B',
    'Pra Remaja','Remaja','Dewasa'
  ];

  const e=s=>String(s??'').replace(/[&<>"']/g,m=>(
    {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]
  ));

  function getJson(k,d){
    try{return JSON.parse(localStorage.getItem(k)||JSON.stringify(d))}
    catch(_){return d}
  }
  function setJson(k,v){localStorage.setItem(k,JSON.stringify(v))}

  function scope(){
    try{return JSON.parse(sessionStorage.getItem('ubnb_ppg_v34_scope')||'null')}
    catch(_){return null}
  }
  function controller(){return scope()?.type==='controller'}
  function scopeId(){return controller()?'DESA':(scope()?.kelompok||'')}

  function today(){
    try{return new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Jakarta',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date())}
    catch(_){return ubnbWibIso84().slice(0,10)}
  }

  function sessions(){return getJson(SESSION_KEY,[])}
  function saveSessions(v){setJson(SESSION_KEY,v)}
  function reports(){return getJson(REPORT_KEY,[])}
  function drafts(){return getJson(DRAFT_KEY,{})}
  function simpatisan(){return getJson(SYMP_KEY,[])}
  function saveSimpatisan(v){setJson(SYMP_KEY,v)}
  function collapsed(){return getJson(COLLAPSE_KEY,{})}
  function saveCollapsed(v){setJson(COLLAPSE_KEY,v)}

  function ageFromDob(j){
    try{return umurFromTgl(j.tgl_lahir)}
    catch(_){return null}
  }

  function jamaahStudents(){
    let rows=(Array.isArray(aJamaah)?aJamaah:[])
      .filter(j=>j.status_nikah==='Belum Menikah')
      .filter(j=>j.status_sambung==='Tetap');
    if(scope()?.type==='kelompok')rows=rows.filter(j=>j.kelompok_nama===scope().kelompok);
    const d=drafts();
    return rows.map(j=>({
      did:String(j.did),
      nama:j.nama||'-',
      nama_kk:j.nama_kk||'-',
      umur:ageFromDob(j),
      kelas:d[String(j.did)]||j.kelas_kbm||j.kelas_usia||'Belum Ditentukan',
      jenis:'jamaah',
      kelompok_nama:j.kelompok_nama||''
    }));
  }

  function simpatisanStudents(){
    let rows=simpatisan();
    if(scope()?.type==='kelompok')rows=rows.filter(x=>x.scope===scopeId());
    return rows.map(x=>({
      did:String(x.id),
      nama:x.nama||'-',
      nama_kk:x.nama_kk||'-',
      umur:x.umur??null,
      kelas:x.kelas||'Belum Ditentukan',
      jenis:'simpatisan',
      kelompok_nama:x.scope||''
    }));
  }

  function allStudents(){
    return [...jamaahStudents(),...simpatisanStudents()];
  }

  function studentsForClass(kelas){
    return allStudents()
      .filter(x=>x.kelas===kelas)
      .sort((a,b)=>{
        if(a.jenis!==b.jenis)return a.jenis==='jamaah'?-1:1;
        return String(a.nama).localeCompare(String(b.nama),'id');
      });
  }

  // ---------- teacher helpers for class start ----------
  function isTeacherRole(label){
    const z=' '+String(label||'').toLowerCase().replace(/[._/-]+/g,' ').replace(/\s+/g,' ')+' ';
    return /(^|\s)mt(\s|$)/.test(z)||/(^|\s)ms(\s|$)/.test(z);
  }

  function teachers(){
    const map=new Map(),s=scope();

    (Array.isArray(aPengurus)?aPengurus:[])
      .filter(p=>p&&p.aktif!==false&&isTeacherRole(p.dapukan))
      .forEach(p=>{
        if(s?.type==='kelompok'&&(p.level!=='kelompok'||p.kelompok_nama!==s.kelompok))return;
        const j=typeof findJamaahAny==='function'
          ?findJamaahAny(p.did)
          :(Array.isArray(aJamaah)?aJamaah:[]).find(x=>String(x.did)===String(p.did));
        if(!j)return;
        const key=String(p.did);
        if(!map.has(key))map.set(key,{did:key,nama:j.nama||'-',roles:[]});
        if(p.dapukan&&!map.get(key).roles.includes(p.dapukan))map.get(key).roles.push(p.dapukan);
      });

    getJson(TEACHER_ADD_KEY,[]).forEach(c=>{
      if(s?.type==='kelompok'&&c.kelompok_nama!==s.kelompok)return;
      const j=(Array.isArray(aJamaah)?aJamaah:[]).find(x=>String(x.did)===String(c.did));
      if(!j)return;
      const key=String(c.did);
      if(!map.has(key))map.set(key,{did:key,nama:j.nama||'-',roles:[c.role||'Guru']});
      else if(c.role&&!map.get(key).roles.includes(c.role))map.get(key).roles.push(c.role);
    });

    const ass=getJson(TEACHER_ASSIGN_KEY,{});
    return [...map.values()]
      .map(t=>({...t,kelas:ass[t.did]||'Semua Kelas'}))
      .sort((a,b)=>String(a.nama).localeCompare(String(b.nama),'id'));
  }

  function teachersForClass(k){
    return teachers().filter(t=>t.kelas==='Semua Kelas'||t.kelas===k);
  }

  // ---------- setup modal ----------
  function ensureSimpModal(){
    if(document.getElementById('ppg38-symp-modal'))return;
    document.body.insertAdjacentHTML('beforeend',`
      <div id="ppg38-symp-modal" class="ppg38-modal">
        <div class="ppg38-modal-card">
          <div class="ppg38-modal-head">
            <b>Tambah Murid Simpatisan</b>
            <button class="ppg38-modal-close" onclick="ppg38CloseSimp()">✕</button>
          </div>
          <div class="ppg38-modal-body">
            <div class="ppg38-form-grid">
              <div class="ppg38-field full">
                <label>Nama</label>
                <input id="ppg38-symp-name" placeholder="Nama murid">
              </div>
              <div class="ppg38-field">
                <label>Nama KK / Wali</label>
                <input id="ppg38-symp-kk" placeholder="Opsional">
              </div>
              <div class="ppg38-field">
                <label>Umur</label>
                <input id="ppg38-symp-age" type="number" min="0" max="99" inputmode="numeric" placeholder="Th">
              </div>
              <div class="ppg38-field full">
                <label>Kelas KBM</label>
                <select id="ppg38-symp-class">
                  ${CLASSES.map(k=>`<option value="${e(k)}">${e(k)}</option>`).join('')}
                </select>
              </div>
            </div>
            <div class="ppg38-form-actions">
              <button class="ppg38-lite-btn" onclick="ppg38CloseSimp()">Batal</button>
              <button class="ppg38-add-btn" onclick="ppg38SaveSimp()">Simpan Simpatisan</button>
            </div>
          </div>
        </div>
      </div>`);
  }

  window.ppg38OpenSimp=function(defaultClass){
    if(controller()){toast('Penambahan simpatisan dilakukan di scope kelompok.',true);return}
    ensureSimpModal();
    document.getElementById('ppg38-symp-name').value='';
    document.getElementById('ppg38-symp-kk').value='';
    document.getElementById('ppg38-symp-age').value='';
    const sel=document.getElementById('ppg38-symp-class');
    if(defaultClass&&CLASSES.includes(defaultClass))sel.value=defaultClass;
    document.getElementById('ppg38-symp-modal').classList.add('show');
    setTimeout(()=>document.getElementById('ppg38-symp-name')?.focus(),50);
  };

  window.ppg38CloseSimp=function(){
    document.getElementById('ppg38-symp-modal')?.classList.remove('show');
  };

  window.ppg38SaveSimp=function(){
    const nama=(document.getElementById('ppg38-symp-name')?.value||'').trim();
    const nama_kk=(document.getElementById('ppg38-symp-kk')?.value||'').trim();
    const umurRaw=document.getElementById('ppg38-symp-age')?.value;
    const kelas=document.getElementById('ppg38-symp-class')?.value||'';
    if(!nama||!kelas){toast('Nama dan kelas wajib diisi.',true);return}
    const umur=umurRaw===''?null:Number(umurRaw);
    const rows=simpatisan();
    rows.push({
      id:'SYM-'+Date.now(),
      nama,
      nama_kk:nama_kk||'-',
      umur:Number.isFinite(umur)?umur:null,
      kelas,
      scope:scopeId(),
      created_at:ubnbWibIso84(),
      created_by:CU?.nama||CU?.username||'-'
    });
    saveSimpatisan(rows);
    ppg38CloseSimp();
    renderSetup();
    toast('Simpatisan ditambahkan ke kelas.');
  };

  window.ppg38DeleteSimp=function(id){
    const rows=simpatisan().filter(x=>String(x.id)!==String(id));
    saveSimpatisan(rows);
    renderSetup();
    toast('Simpatisan dihapus dari prototype.');
  };

  // ---------- setup collapse ----------
  window.ppg38ToggleGroup=function(k){
    const c=collapsed();
    c[k]=!c[k];
    saveCollapsed(c);
    renderSetup();
  };

  window.ppg38CollapseAll=function(){
    const c={};
    [...CLASSES,'Belum Ditentukan'].forEach(k=>c[k]=true);
    saveCollapsed(c);
    renderSetup();
  };

  window.ppg38ExpandAll=function(){
    saveCollapsed({});
    renderSetup();
  };

  window.ppg38ChangeClass=function(id,kind,val){
    if(kind==='simpatisan'){
      const rows=simpatisan();
      const x=rows.find(r=>String(r.id)===String(id));
      if(x)x.kelas=val;
      saveSimpatisan(rows);
    }else{
      const d=drafts();
      if(val==='Belum Ditentukan')delete d[String(id)];
      else d[String(id)]=val;
      setJson(DRAFT_KEY,d);
    }
    renderSetup();
  };

  function studentInfoHtml(x,i){
    const simp=x.jenis==='simpatisan';
    return `<div class="ppg38-student-main">
      <div class="ppg38-student-line">
        <span class="ppg38-row-no">${i+1}</span>
        <span class="ppg38-student-name">${e(x.nama)}</span>
        ${simp?'<span class="ppg38-symp-badge">Simpatisan</span>':''}
      </div>
      <div class="ppg38-student-meta">KK/Wali: ${e(x.nama_kk||'-')} · Umur: ${x.umur??'—'} th</div>
      ${simp?`<button class="ppg38-delete-symp" onclick="event.stopPropagation();ppg38DeleteSimp('${e(x.did)}')">Hapus simpatisan</button>`:''}
    </div>`;
  }

  function renderSetup(){
    const el=document.getElementById('ppg-page-setup');if(!el)return;

    if(controller()){
      el.innerHTML='<div class="ppg-controller-note">Setup Kelas dilakukan pada scope kelompok. Controller Desa hanya melakukan monitoring.</div>';
      return;
    }

    const rows=allStudents();
    const c=collapsed();
    const groups=[...CLASSES,'Belum Ditentukan'];

    el.innerHTML=`
      <div class="ppg-v33-stage">
        <div>
          <div class="ppg-v33-stage-title">Setup Kelas · ${e(scope()?.kelompok||'')}</div>
          <div class="ppg-v33-stage-sub">Murid dikelompokkan berdasarkan kelas aktual.</div>
        </div>
        <span class="ppg-v33-live">● ${rows.length} murid</span>
      </div>

      <div class="ppg38-setup-toolbar">
        <button class="ppg38-add-btn" onclick="ppg38OpenSimp()">+ Tambah Simpatisan</button>
        <div class="ppg38-toolbar-actions">
          <button class="ppg38-lite-btn" onclick="ppg38CollapseAll()">Collapse Semua</button>
          <button class="ppg38-lite-btn" onclick="ppg38ExpandAll()">Expand Semua</button>
        </div>
      </div>

      ${groups.map(k=>{
        const list=rows.filter(x=>x.kelas===k);
        if(!list.length)return '';
        const simpCount=list.filter(x=>x.jenis==='simpatisan').length;
        const isCollapsed=!!c[k];

        return `<section class="ppg38-setup-group">
          <button class="ppg38-group-head" onclick="ppg38ToggleGroup('${e(k)}')">
            <span class="left">
              <span class="ppg38-chevron">${isCollapsed?'▸':'▾'}</span>
              <span class="ppg38-group-name">${e(k)}</span>
            </span>
            <span class="ppg38-group-count">${list.length} murid${simpCount?` · ${simpCount} simpatisan`:''}</span>
          </button>

          <div class="ppg38-group-body ${isCollapsed?'collapsed':''}">
            <table class="ppg38-setup-table">
              <thead>
                <tr><th>Murid</th><th>Ubah Kelas</th></tr>
              </thead>
              <tbody>
                ${list.map((x,i)=>`<tr>
                  <td>${studentInfoHtml(x,i)}</td>
                  <td>
                    <select class="ppg38-class-select" onchange="ppg38ChangeClass('${e(x.did)}','${e(x.jenis)}',this.value)">
                      ${[...CLASSES,'Belum Ditentukan'].map(opt=>`<option value="${e(opt)}" ${x.kelas===opt?'selected':''}>${e(opt)}</option>`).join('')}
                    </select>
                  </td>
                </tr>`).join('')}
              </tbody>
            </table>
          </div>
        </section>`;
      }).join('')}

      ${rows.length?'':'<div class="ppg38-empty">Belum ada murid pada scope ini.</div>'}`;
  }

  // ---------- start class override so simpatisan ikut roster ----------
  async function gpsSilent(){
    if(!navigator.geolocation)return null;
    return await new Promise(resolve=>{
      let done=false;
      const end=v=>{if(done)return;done=true;resolve(v)};
      navigator.geolocation.getCurrentPosition(
        p=>end({lat:p.coords.latitude,lng:p.coords.longitude,accuracy:p.coords.accuracy}),
        ()=>end(null),
        {enableHighAccuracy:false,timeout:3500,maximumAge:60000}
      );
      setTimeout(()=>end(null),4000);
    });
  }

  function logStart(s,gps){
    const rows=getJson(LOGGER_KEY,[]);
    rows.push({
      at:ubnbWibIso84(),
      type:'MULAI_KELAS',
      account:CU?.nama||CU?.username||'-',
      scope:scopeId(),
      sessionId:s.id,
      className:s.className,
      teacherName:s.teacherName,
      gps
    });
    setJson(LOGGER_KEY,rows);
  }

  function teacherStep(s){
    const el=document.getElementById('p37detail');if(!el)return;
    const ts=teachersForClass(s.className);

    el.innerHTML=`<div class="ppg-panel">
      <div class="ppg-panel-head">
        <div><div class="ppg-panel-title">Absensi Dewan Guru</div><div class="ppg-panel-sub">Wajib sebelum kelas aktif.</div></div>
      </div>
      <div class="ppg-table-wrap"><table class="ppg-table">
        <thead><tr><th>No</th><th>Nama</th><th>Status</th></tr></thead>
        <tbody>${ts.map((t,i)=>`<tr>
          <td>${i+1}</td>
          <td><b>${e(t.nama)}</b></td>
          <td><select class="p38ta ppg37-status-select" data-id="${e(t.did)}">
            <option value="">— Pilih —</option>
            <option value="Hadir" ${String(t.did)===String(s.teacherDid)?'selected':''}>Hadir</option>
            <option>Izin</option><option>Sakit</option><option>Tidak Hadir</option><option>Terlambat</option>
          </select></td>
        </tr>`).join('')}</tbody>
      </table></div>
      <div class="ppg36-actions">
        <button class="ppg-btn" onclick="ppg38TeacherDone('${e(s.id)}')">Selesai Absensi Guru & Aktifkan Kelas</button>
      </div>
    </div>`;
    el.scrollIntoView({behavior:'smooth',block:'start'});
  }

  window.ppg37Start=async function(){
    const date=document.getElementById('p37date')?.value||today();
    const did=document.getElementById('p37guru')?.value||'';
    const kelas=document.getElementById('p37kelas')?.value||'';

    if(!did||!kelas){toast('Pilih guru dan kelas terlebih dahulu.',true);return}

    const t=teachers().find(x=>String(x.did)===String(did));
    if(!t){toast('Guru tidak ditemukan.',true);return}
    if(!teachersForClass(kelas).some(x=>String(x.did)===String(did))){
      toast('Guru belum ditetapkan untuk kelas ini.',true);return
    }

    const s={
      id:'K'+Date.now(),
      scope:scopeId(),
      date,
      className:kelas,
      teacherDid:String(did),
      teacherName:t.nama,
      startedAt:ubnbWibIso84(),
      startedBy:CU?.nama||CU?.username||'-',
      status:'pending',
      teacherAttendance:[],
      students:studentsForClass(kelas).map(x=>({
        did:String(x.did),
        nama:x.nama,
        status:'Belum Hadir',
        kind:x.jenis,
        nama_kk:x.nama_kk||'-',
        umur:x.umur??null
      })),
      generalMaterials:[],
      studentMaterials:{},
      generalNote:'',
      studentNotes:{}
    };

    const all=sessions();
    all.push(s);
    saveSessions(all);

    gpsSilent().then(g=>logStart(s,g)); // no operational UI text
    teacherStep(s);
  };

  window.ppg38TeacherDone=function(id){
    const all=sessions();
    const s=all.find(x=>x.id===id);
    if(!s)return;

    const els=[...document.querySelectorAll('.p38ta')];
    if(els.some(x=>!x.value)){toast('Status semua dewan guru harus diisi.',true);return}

    const tm=new Map(teachers().map(t=>[String(t.did),t]));
    s.teacherAttendance=els.map(x=>({
      did:x.dataset.id,
      nama:tm.get(String(x.dataset.id))?.nama||'',
      status:x.value
    }));

    if(!s.teacherAttendance.some(x=>['Hadir','Terlambat'].includes(x.status))){
      toast('Belum ada dewan guru yang hadir.',true);return
    }

    s.status='active';
    saveSessions(all);

    // Re-open Kelas KBM through existing v37 page renderer.
    const btn=document.querySelector('.ppg-tab[data-page="kelas"]');
    const oldOpen=window.__ppg38PriorOpen;
    if(typeof oldOpen==='function')oldOpen('kelas',btn);
    setTimeout(()=>window.ppg37Open?.(id),0);
  };

  // ---------- report helpers ----------
  function dayAfter(d){
    const x=new Date(d+'T00:00:00');x.setDate(x.getDate()+1);return x.toISOString().slice(0,10)
  }
  function plus30(d){
    const x=new Date(d+'T00:00:00');x.setDate(x.getDate()+30);return x.toISOString().slice(0,10)
  }
  function visibleFinished(){
    let rows=sessions().filter(s=>s.status==='finished');
    if(!controller())rows=rows.filter(s=>s.scope===scopeId());
    return rows.sort((a,b)=>String(a.date).localeCompare(String(b.date)));
  }
  function nextPeriod(){
    const done=visibleFinished();
    if(!done.length)return null;
    const rr=reports()
      .filter(r=>controller()||r.scope===scopeId())
      .sort((a,b)=>String(a.end).localeCompare(String(b.end)));
    const start=rr.length?dayAfter(rr[rr.length-1].end):done[0].date;
    const latest=done[done.length-1].date;
    if(start>latest)return null;
    const cap=plus30(start);
    return {start,end:latest<cap?latest:cap};
  }

  window.ppg37GenReport=function(){
    const p=nextPeriod();
    if(!p){toast('Belum ada kegiatan baru untuk laporan.',true);return}
    const ids=visibleFinished().filter(s=>s.date>=p.start&&s.date<=p.end).map(s=>s.id);
    const rr=reports();
    rr.push({
      id:'R'+Date.now(),
      scope:scopeId(),
      start:p.start,
      end:p.end,
      ids,
      by:CU?.nama||CU?.username||'-',
      at:ubnbWibIso84()
    });
    setJson(REPORT_KEY,rr);
    renderReport();
  };

  function studentKind(x){
    if(x?.kind==='simpatisan')return 'simpatisan';
    if(String(x?.did||'').startsWith('SYM-'))return 'simpatisan';
    return 'jamaah';
  }

  function pivot(k,rows,kind){
    const ss=rows.filter(x=>x.className===k);
    if(!ss.length)return '';

    const dates=[...new Set(ss.map(x=>x.date))].sort();
    const map=new Map();

    ss.forEach(s=>{
      (s.students||[])
        .filter(x=>studentKind(x)===kind)
        .forEach(x=>{
          if(!map.has(String(x.did))){
            map.set(String(x.did),{nama:x.nama||'-',st:{}});
          }
          map.get(String(x.did)).st[s.date]=x.status;
        });
    });

    if(!map.size)return '';

    const values=[...map.values()].sort((a,b)=>a.nama.localeCompare(b.nama,'id'));

    return `<div class="ppg-panel">
      <div class="ppg-panel-head">
        <div><div class="ppg-panel-title">${e(k)}</div><div class="ppg-panel-sub">${values.length} murid · ${dates.length} tanggal KBM</div></div>
      </div>
      <div class="ppg37-pivot-wrap">
        <table class="ppg37-pivot">
          <thead><tr><th>Nama Murid</th>${dates.map(d=>`<th>${e(d.slice(5))}</th>`).join('')}<th>Total Hadir</th><th>%</th></tr></thead>
          <tbody>${values.map(r=>{
            const vals=dates.map(d=>r.st[d]||'—');
            const hadir=vals.filter(v=>v==='Hadir').length;
            const pct=dates.length?Math.round(hadir/dates.length*100):0;
            return `<tr>
              <td class="name">${e(r.nama)}</td>
              ${vals.map(v=>`<td>${v==='Hadir'?'H':v==='Izin'?'I':v==='Belum Hadir'?'B':'—'}</td>`).join('')}
              <td>${hadir}</td><td>${pct}%</td>
            </tr>`;
          }).join('')}</tbody>
        </table>
      </div>
      <div class="ppg38-pivot-note">H = Hadir · I = Izin · B = Belum Hadir</div>
    </div>`;
  }

  function materials(rows){
    const m=new Map();
    rows.forEach(s=>{
      (s.generalMaterials||[]).forEach(x=>{
        const key='Umum|'+String(x.text||'').toLowerCase();
        if(!m.has(key))m.set(key,{type:'Umum',text:x.text,count:0,classes:new Set()});
        m.get(key).count++;m.get(key).classes.add(s.className);
      });

      // Materi khusus tetap dilaporkan tanpa identitas murid.
      Object.values(s.studentMaterials||{}).flat().forEach(x=>{
        const key='Khusus|'+String(x.text||'').toLowerCase();
        if(!m.has(key))m.set(key,{type:'Khusus',text:x.text,count:0,classes:new Set()});
        m.get(key).count++;m.get(key).classes.add(s.className);
      });
    });
    return [...m.values()];
  }

  function reportBlock(rows,kind,title,symp=false){
    const body=CLASSES.map(k=>pivot(k,rows,kind)).filter(Boolean).join('');
    const personCount=new Set(
      rows.flatMap(s=>(s.students||[]).filter(x=>studentKind(x)===kind).map(x=>String(x.did)))
    ).size;

    return `
      <div class="ppg38-report-section-title ${symp?'symp':''}">
        ${e(title)}
        <div class="ppg38-report-summary">${personCount} murid pada periode laporan</div>
      </div>
      ${body||'<div class="ppg-empty">Tidak ada data kehadiran pada kategori ini.</div>'}`;
  }

  function renderReport(){
    const el=document.getElementById('ppg-page-laporan');if(!el)return;

    const rr=reports()
      .filter(r=>controller()||r.scope===scopeId())
      .sort((a,b)=>String(b.end).localeCompare(String(a.end)));
    const n=nextPeriod();
    const r=rr[0];

    let content='<div class="ppg-empty">Belum ada laporan yang digenerate.</div>';

    if(r){
      const rows=sessions().filter(s=>r.ids.includes(s.id));
      const mm=materials(rows);

      content=`
        <div class="ppg37-report-toolbar">
          <div><b>Periode ${e(r.start)} s.d ${e(r.end)}</b><br><span class="ppg-mini-note">Dibuat oleh ${e(r.by)}</span></div>
        </div>

        ${reportBlock(rows,'jamaah','Laporan Kehadiran Generus Jamaah',false)}
        ${reportBlock(rows,'simpatisan','Laporan Kehadiran Simpatisan',true)}

        <div class="ppg-panel">
          <div class="ppg-panel-head">
            <div><div class="ppg-panel-title">Pencapaian Materi</div><div class="ppg-panel-sub">Materi umum dan khusus tanpa menampilkan nama murid.</div></div>
          </div>
          <div class="ppg-panel-body">
            ${mm.length?`<div class="ppg37-mat-report">${mm.map(x=>`<div class="ppg37-mat-item">
              <b>${e(x.type)}</b>
              <span>${e(x.text)}<br><span class="ppg-mini-note">${e([...x.classes].join(', '))}</span></span>
              <span>${x.count}×</span>
            </div>`).join('')}</div>`:'<div class="ppg-empty">Belum ada materi.</div>'}
          </div>
        </div>`;
    }

    el.innerHTML=`
      <div class="ppg-v33-stage">
        <div><div class="ppg-v33-stage-title">Laporan PPG</div><div class="ppg-v33-stage-sub">Jamaah dan simpatisan dipisahkan dalam laporan kehadiran.</div></div>
      </div>
      <div class="ppg37-report-toolbar">
        <div>${n?`Periode berikutnya: <b>${e(n.start)} s.d ${e(n.end)}</b>`:'Tidak ada kegiatan baru.'}</div>
        <button class="ppg-btn" onclick="ppg37GenReport()" ${n?'':'disabled'}>Generate Laporan Berikutnya</button>
      </div>
      ${content}`;
  }

  // ---------- page routing ----------
  window.__ppg38PriorOpen=window.ppgOpenPage;

  window.ppgOpenPage=function(page,btn){
    if(page==='setup'){
      document.querySelectorAll('.ppg-page').forEach(x=>x.classList.remove('active'));
      document.querySelectorAll('.ppg-tab').forEach(x=>x.classList.remove('active'));
      document.getElementById('ppg-page-setup')?.classList.add('active');
      btn?.classList.add('active');
      renderSetup();
      return;
    }

    if(page==='laporan'){
      document.querySelectorAll('.ppg-page').forEach(x=>x.classList.remove('active'));
      document.querySelectorAll('.ppg-tab').forEach(x=>x.classList.remove('active'));
      document.getElementById('ppg-page-laporan')?.classList.add('active');
      btn?.classList.add('active');
      renderReport();
      return;
    }

    return window.__ppg38PriorOpen?.apply(this,arguments);
  };

  const priorRenderAll=window.ppgRenderAll;
  window.ppgRenderAll=function(){
    if(typeof priorRenderAll==='function')priorRenderAll();
    if(!controller())renderSetup();
    renderReport();
  };

  window.ppg38RenderSetup=renderSetup;
  window.ppg38RenderReport=renderReport;

  setTimeout(()=>{
    if(document.getElementById('ppg-page-setup')?.classList.contains('active'))renderSetup();
    if(document.getElementById('ppg-page-laporan')?.classList.contains('active'))renderReport();
  },900);
})();

/* ============================================================
   SOURCE: ubnb-v39-sticky-start-fix-script
   ============================================================ */
(function(){
  const SESSION_KEY='ubnb_ppg_v37_classes';
  const DRAFT_KEY='ubnb_ppg_v33_class_drafts';
  const SYMP_KEY='ubnb_ppg_v38_simpatisan';
  const COLLAPSE_KEY='ubnb_ppg_v38_setup_collapsed';
  const TEACHER_ADD_KEY='ubnb_ppg_v35_custom_teachers';
  const TEACHER_ASSIGN_KEY='ubnb_ppg_v34_teacher_assign';
  const LOGGER_KEY='ubnb_ppg_v37_logger';

  const CLASSES=[
    'Balita','Cabe Rawit Tahap A','Cabe Rawit Tahap B',
    'Pra Remaja','Remaja','Dewasa'
  ];

  const esc=s=>String(s??'').replace(/[&<>"']/g,m=>(
    {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]
  ));

  function read(k,d){
    try{return JSON.parse(localStorage.getItem(k)||JSON.stringify(d))}
    catch(_){return d}
  }
  function write(k,v){localStorage.setItem(k,JSON.stringify(v))}
  function scope(){
    try{return JSON.parse(sessionStorage.getItem('ubnb_ppg_v34_scope')||'null')}
    catch(_){return null}
  }
  function isController(){return scope()?.type==='controller'}
  function scopeId(){return isController()?'DESA':(scope()?.kelompok||'')}

  function sessions(){return read(SESSION_KEY,[])}
  function saveSessions(v){write(SESSION_KEY,v)}
  function drafts(){return read(DRAFT_KEY,{})}
  function symps(){return read(SYMP_KEY,[])}
  function collapses(){return read(COLLAPSE_KEY,{})}

  function jamaahStudents(){
    let rows=(Array.isArray(aJamaah)?aJamaah:[])
      .filter(j=>j.status_nikah==='Belum Menikah')
      .filter(j=>j.status_sambung==='Tetap');
    if(scope()?.type==='kelompok')rows=rows.filter(j=>j.kelompok_nama===scope().kelompok);
    const d=drafts();
    return rows.map(j=>({
      did:String(j.did),
      nama:j.nama||'-',
      nama_kk:j.nama_kk||'-',
      umur:(()=>{try{return umurFromTgl(j.tgl_lahir)}catch(_){return null}})(),
      kelas:d[String(j.did)]||j.kelas_kbm||j.kelas_usia||'Belum Ditentukan',
      jenis:'jamaah'
    }));
  }

  function simpStudents(){
    let rows=symps();
    if(scope()?.type==='kelompok')rows=rows.filter(x=>x.scope===scopeId());
    return rows.map(x=>({
      did:String(x.id),
      nama:x.nama||'-',
      nama_kk:x.nama_kk||'-',
      umur:x.umur??null,
      kelas:x.kelas||'Belum Ditentukan',
      jenis:'simpatisan'
    }));
  }

  function allStudents(){return [...jamaahStudents(),...simpStudents()]}

  function renderSetup39(){
    const el=document.getElementById('ppg-page-setup');
    if(!el)return;

    if(isController()){
      el.innerHTML='<div class="ppg-controller-note">Setup Kelas dilakukan pada scope kelompok. Controller Desa hanya melakukan monitoring.</div>';
      return;
    }

    const rows=allStudents();
    const c=collapses();
    const groups=[...CLASSES,'Belum Ditentukan'];

    el.innerHTML=`
      <div class="ppg-v33-stage">
        <div>
          <div class="ppg-v33-stage-title">Setup Kelas · ${esc(scope()?.kelompok||'')}</div>
          <div class="ppg-v33-stage-sub">Header kelas dan kolom tetap terlihat saat daftar digulir.</div>
        </div>
        <span class="ppg-v33-live">● ${rows.length} murid</span>
      </div>

      <div class="ppg38-setup-toolbar">
        <button class="ppg38-add-btn" onclick="ppg38OpenSimp()">+ Tambah Simpatisan</button>
        <div class="ppg38-toolbar-actions">
          <button class="ppg38-lite-btn" onclick="ppg38CollapseAll()">Collapse Semua</button>
          <button class="ppg38-lite-btn" onclick="ppg38ExpandAll()">Expand Semua</button>
        </div>
      </div>

      ${groups.map(k=>{
        const list=rows.filter(x=>x.kelas===k).sort((a,b)=>{
          if(a.jenis!==b.jenis)return a.jenis==='jamaah'?-1:1;
          return String(a.nama).localeCompare(String(b.nama),'id');
        });
        if(!list.length)return '';
        const simp=list.filter(x=>x.jenis==='simpatisan').length;
        const closed=!!c[k];

        return `<section class="ppg39-group">
          <div class="ppg39-sticky-stack">
            <button class="ppg39-group-head" onclick="ppg38ToggleGroup('${esc(k)}')">
              <span class="left">
                <span class="chev">${closed?'▸':'▾'}</span>
                <span class="name">${esc(k)}</span>
              </span>
              <span class="count">${list.length} murid${simp?` · ${simp} simpatisan`:''}</span>
            </button>
            ${closed?'':`<div class="ppg39-column-head">
              <div>Murid</div>
              <div>Ubah Kelas</div>
            </div>`}
          </div>

          <div class="ppg39-body ${closed?'collapsed':''}">
            <table class="ppg39-table">
              <colgroup><col><col></colgroup>
              <tbody>
                ${list.map((x,i)=>`<tr>
                  <td>
                    <div class="ppg38-student-main">
                      <div class="ppg38-student-line">
                        <span class="ppg38-row-no">${i+1}</span>
                        <span class="ppg38-student-name">${esc(x.nama)}</span>
                        ${x.jenis==='simpatisan'?'<span class="ppg38-symp-badge">Simpatisan</span>':''}
                      </div>
                      <div class="ppg38-student-meta">KK/Wali: ${esc(x.nama_kk||'-')} · Umur: ${x.umur??'—'} th</div>
                      ${x.jenis==='simpatisan'?`<button class="ppg38-delete-symp" onclick="ppg38DeleteSimp('${esc(x.did)}')">Hapus simpatisan</button>`:''}
                    </div>
                  </td>
                  <td>
                    <select class="ppg38-class-select" onchange="ppg38ChangeClass('${esc(x.did)}','${esc(x.jenis)}',this.value)">
                      ${[...CLASSES,'Belum Ditentukan'].map(o=>`<option value="${esc(o)}" ${x.kelas===o?'selected':''}>${esc(o)}</option>`).join('')}
                    </select>
                  </td>
                </tr>`).join('')}
              </tbody>
            </table>
          </div>
        </section>`;
      }).join('')}
    `;
  }

  // ===== teacher helpers =====
  function isTeacherRole(label){
    const z=' '+String(label||'').toLowerCase().replace(/[._/-]+/g,' ').replace(/\s+/g,' ')+' ';
    return /(^|\s)mt(\s|$)/.test(z)||/(^|\s)ms(\s|$)/.test(z);
  }

  function teachers(){
    const map=new Map(), s=scope();

    (Array.isArray(aPengurus)?aPengurus:[])
      .filter(p=>p&&p.aktif!==false&&isTeacherRole(p.dapukan))
      .forEach(p=>{
        if(s?.type==='kelompok'&&(p.level!=='kelompok'||p.kelompok_nama!==s.kelompok))return;
        const j=typeof findJamaahAny==='function'
          ?findJamaahAny(p.did)
          :(Array.isArray(aJamaah)?aJamaah:[]).find(x=>String(x.did)===String(p.did));
        if(!j)return;
        const key=String(p.did);
        if(!map.has(key))map.set(key,{did:key,nama:j.nama||'-',roles:[]});
        if(p.dapukan&&!map.get(key).roles.includes(p.dapukan))map.get(key).roles.push(p.dapukan);
      });

    read(TEACHER_ADD_KEY,[]).forEach(c=>{
      if(s?.type==='kelompok'&&c.kelompok_nama!==s.kelompok)return;
      const j=(Array.isArray(aJamaah)?aJamaah:[]).find(x=>String(x.did)===String(c.did));
      if(!j)return;
      const key=String(c.did);
      if(!map.has(key))map.set(key,{did:key,nama:j.nama||'-',roles:[c.role||'Guru']});
      else if(c.role&&!map.get(key).roles.includes(c.role))map.get(key).roles.push(c.role);
    });

    const ass=read(TEACHER_ASSIGN_KEY,{});
    return [...map.values()]
      .map(t=>({...t,kelas:ass[t.did]||'Semua Kelas'}))
      .sort((a,b)=>String(a.nama).localeCompare(String(b.nama),'id'));
  }

  function teachersForClass(k){
    return teachers().filter(t=>t.kelas==='Semua Kelas'||t.kelas===k);
  }

  function studentRoster(k){
    return allStudents()
      .filter(x=>x.kelas===k)
      .sort((a,b)=>String(a.nama).localeCompare(String(b.nama),'id'))
      .map(x=>({
        did:String(x.did),
        nama:x.nama,
        status:'Belum Hadir',
        kind:x.jenis,
        nama_kk:x.nama_kk||'-',
        umur:x.umur??null
      }));
  }

  function today(){
    try{return new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Jakarta',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date())}
    catch(_){return ubnbWibIso84().slice(0,10)}
  }

  async function gpsSilent(){
    if(!navigator.geolocation)return null;
    return await new Promise(resolve=>{
      let done=false;
      const end=v=>{if(done)return;done=true;resolve(v)};
      navigator.geolocation.getCurrentPosition(
        p=>end({lat:p.coords.latitude,lng:p.coords.longitude,accuracy:p.coords.accuracy}),
        ()=>end(null),
        {enableHighAccuracy:false,timeout:3500,maximumAge:60000}
      );
      setTimeout(()=>end(null),4000);
    });
  }

  function loggerStart(s,gps){
    const rows=read(LOGGER_KEY,[]);
    rows.push({
      at:ubnbWibIso84(),
      type:'MULAI_KELAS',
      account:CU?.nama||CU?.username||'-',
      scope:scopeId(),
      sessionId:s.id,
      className:s.className,
      teacherName:s.teacherName,
      gps
    });
    write(LOGGER_KEY,rows);
  }

  // Guru yang dipilih pada dropdown = otomatis Hadir.
  // Tidak ada step absensi guru kedua.
  window.ppg37Start=async function(){
    const date=document.getElementById('p37date')?.value||today();
    const teacherDid=document.getElementById('p37guru')?.value||'';
    const className=document.getElementById('p37kelas')?.value||'';

    if(!teacherDid||!className){
      toast('Pilih guru dan kelas terlebih dahulu.',true);
      return;
    }

    const teacher=teachers().find(t=>String(t.did)===String(teacherDid));
    if(!teacher){
      toast('Guru tidak ditemukan.',true);
      return;
    }

    if(!teachersForClass(className).some(t=>String(t.did)===String(teacherDid))){
      toast('Guru belum ditetapkan untuk kelas ini.',true);
      return;
    }

    const duplicate=sessions().some(s=>
      s.scope===scopeId() &&
      s.date===date &&
      s.className===className &&
      s.status==='active'
    );
    if(duplicate){
      toast('Kelas ini sudah aktif hari ini.',true);
      return;
    }

    const s={
      id:'K'+Date.now(),
      scope:scopeId(),
      date,
      className,
      teacherDid:String(teacher.did),
      teacherName:teacher.nama,
      startedAt:ubnbWibIso84(),
      startedBy:CU?.nama||CU?.username||'-',
      status:'active',

      // dropdown guru sekaligus menjadi absensi guru
      teacherAttendance:[{
        did:String(teacher.did),
        nama:teacher.nama,
        status:'Hadir',
        source:'selected_teacher'
      }],

      students:studentRoster(className),
      generalMaterials:[],
      studentMaterials:{},
      generalNote:'',
      studentNotes:{}
    };

    const all=sessions();
    all.push(s);
    saveSessions(all);

    gpsSilent().then(g=>loggerStart(s,g));

    // langsung masuk tab Aktif Hari Ini
    if(typeof window.ppg37Tab==='function'){
      window.ppg37Tab('active');
    }else{
      const btn=document.querySelector('.ppg-tab[data-page="kelas"]');
      window.__ppg39PriorOpen?.('kelas',btn);
    }

    // lalu buka detail kelas aktif yang baru dibuat
    setTimeout(()=>{
      if(typeof window.ppg37Open==='function'){
        window.ppg37Open(s.id);
      }
    },80);
  };

  // Pastikan card aktif benar-benar membuka detail.
  const originalOpen=window.ppg37Open;
  window.ppg37Open=function(id){
    const s=sessions().find(x=>String(x.id)===String(id));
    if(!s){
      toast('Data kelas aktif tidak ditemukan.',true);
      return;
    }

    // Pastikan berada pada menu Kelas KBM / Aktif Hari Ini
    if(typeof window.ppg37Tab==='function'){
      // jangan call ppg37Tab di sini karena ia me-render ulang lalu open lagi.
      // Cukup pastikan page Kelas aktif.
      const page=document.getElementById('ppg-page-kelas');
      if(page&&!page.classList.contains('active')){
        const btn=document.querySelector('.ppg-tab[data-page="kelas"]');
        window.__ppg39PriorOpen?.('kelas',btn);
      }
    }

    if(typeof originalOpen==='function'){
      originalOpen(id);
    }
  };

  // Intercept Setup routing, preserving v38 Report behavior.
  window.__ppg39PriorOpen=window.ppgOpenPage;
  window.ppgOpenPage=function(page,btn){
    if(page==='setup'){
      document.querySelectorAll('.ppg-page').forEach(x=>x.classList.remove('active'));
      document.querySelectorAll('.ppg-tab').forEach(x=>x.classList.remove('active'));
      document.getElementById('ppg-page-setup')?.classList.add('active');
      btn?.classList.add('active');
      renderSetup39();
      return;
    }
    return window.__ppg39PriorOpen?.apply(this,arguments);
  };

  // Prior-open used by the start function to return to Kelas page.
  window.__ppg39PriorOpen=window.__ppg39PriorOpen || window.ppgOpenPage;

  const priorRenderAll=window.ppgRenderAll;
  window.ppgRenderAll=function(){
    if(typeof priorRenderAll==='function')priorRenderAll();
    if(document.getElementById('ppg-page-setup')?.classList.contains('active')){
      renderSetup39();
    }
  };

  window.ppg39RenderSetup=renderSetup39;

  setTimeout(()=>{
    if(document.getElementById('ppg-page-setup')?.classList.contains('active')){
      renderSetup39();
    }
  },900);
})();

/* ============================================================
   SOURCE: ubnb-v41-floating-setup-header-script
   ============================================================ */
(function(){
  let raf41=0;
  let currentGroup41=null;

  function ensureFloat41(){
    let f=document.getElementById('ppg41-float-setup');
    if(f)return f;

    f=document.createElement('div');
    f.id='ppg41-float-setup';
    f.innerHTML=`
      <div class="ppg41-float-class">
        <div class="ppg41-float-left">
          <span class="ppg41-float-chev">▾</span>
          <span class="ppg41-float-name"></span>
        </div>
        <span class="ppg41-float-count"></span>
      </div>
      <div class="ppg41-float-cols">
        <div>Murid</div>
        <div>Ubah Kelas</div>
      </div>`;
    document.getElementById('ppg-shell')?.appendChild(f);

    f.querySelector('.ppg41-float-class').addEventListener('click',()=>{
      if(!currentGroup41)return;
      const btn=currentGroup41.querySelector('.ppg39-group-head');
      btn?.click();
      schedule41();
    });

    return f;
  }

  function hideFloat41(){
    const f=document.getElementById('ppg41-float-setup');
    if(f)f.classList.remove('show');
    currentGroup41=null;
  }

  function activeSetup41(){
    const page=document.getElementById('ppg-page-setup');
    return !!page?.classList.contains('active');
  }

  function updateFloat41(){
    raf41=0;

    if(!activeSetup41()){
      hideFloat41();
      return;
    }

    const body=document.querySelector('#ppg-shell .ppg-body');
    const tabs=document.querySelector('#ppg-shell .ppg-tabs');
    const page=document.getElementById('ppg-page-setup');
    const groups=[...page.querySelectorAll('.ppg39-group')];

    if(!body||!tabs||!groups.length){
      hideFloat41();
      return;
    }

    const bodyRect=body.getBoundingClientRect();
    const tabsRect=tabs.getBoundingClientRect();

    /* titik mulai overlay tepat di bawah tab PPG */
    const top=Math.max(bodyRect.top,tabsRect.bottom);
    const pageRect=page.getBoundingClientRect();

    /* cari group yang sedang "melewati" batas atas viewport */
    let active=null;
    for(const g of groups){
      const r=g.getBoundingClientRect();
      if(r.top <= top + 1 && r.bottom > top + 2){
        active=g;
        break;
      }
    }

    /* jika header group aslinya masih terlihat, overlay belum perlu muncul */
    if(active){
      const nativeHead=active.querySelector('.ppg39-sticky-stack');
      const hr=nativeHead?.getBoundingClientRect();
      if(hr && hr.top >= top - 1){
        hideFloat41();
        return;
      }
    }

    if(!active){
      hideFloat41();
      return;
    }

    const f=ensureFloat41();
    currentGroup41=active;

    const name=active.querySelector('.ppg39-group-head .name')?.textContent?.trim()||'';
    const count=active.querySelector('.ppg39-group-head .count')?.textContent?.trim()||'';
    const closed=active.querySelector('.ppg39-body')?.classList.contains('collapsed');

    f.querySelector('.ppg41-float-name').textContent=name;
    f.querySelector('.ppg41-float-count').textContent=count;
    f.querySelector('.ppg41-float-chev').textContent=closed?'▸':'▾';
    f.querySelector('.ppg41-float-cols').style.display=closed?'none':'grid';

    /* lebar/posisi mengikuti page setup, bukan viewport penuh */
    const left=Math.max(bodyRect.left,pageRect.left);
    const right=Math.min(bodyRect.right,pageRect.right);
    const width=Math.max(0,right-left);

    f.style.top=Math.round(top)+'px';
    f.style.left=Math.round(left)+'px';
    f.style.width=Math.round(width)+'px';

    /*
      Ketika group berikutnya naik, dorong overlay agar tidak menimpa header baru.
      Tinggi overlay berbeda saat collapse/expand.
    */
    f.classList.add('show');
    const fh=f.getBoundingClientRect().height;
    const next=active.nextElementSibling?.classList.contains('ppg39-group')
      ?active.nextElementSibling:null;

    let translateY=0;
    if(next){
      const nr=next.getBoundingClientRect();
      const overlap=(top+fh)-nr.top;
      if(overlap>0)translateY=-overlap;
    }
    f.style.transform=`translateY(${Math.round(translateY)}px)`;
  }

  function schedule41(){
    if(raf41)return;
    raf41=requestAnimationFrame(updateFloat41);
  }

  function bind41(){
    const body=document.querySelector('#ppg-shell .ppg-body');
    if(body&&!body.dataset.ppg41Bound){
      body.dataset.ppg41Bound='1';
      body.addEventListener('scroll',schedule41,{passive:true});
    }

    if(!window.__ppg41ResizeBound){
      window.__ppg41ResizeBound=true;
      window.addEventListener('resize',schedule41,{passive:true});
    }

    const page=document.getElementById('ppg-page-setup');
    if(page&&!page.dataset.ppg41Observed){
      page.dataset.ppg41Observed='1';
      const mo=new MutationObserver(schedule41);
      mo.observe(page,{childList:true,subtree:true,attributes:true,attributeFilter:['class']});
    }
  }

  /* bungkus routing supaya overlay selalu sinkron */
  const priorOpen41=window.ppgOpenPage;
  window.ppgOpenPage=function(page,btn){
    const r=priorOpen41?.apply(this,arguments);
    setTimeout(()=>{
      bind41();
      schedule41();
    },0);
    return r;
  };

  /* fungsi collapse/expand dari v38 tetap dipakai; refresh overlay sesudahnya */
  ['ppg38ToggleGroup','ppg38CollapseAll','ppg38ExpandAll'].forEach(fn=>{
    const old=window[fn];
    if(typeof old==='function'){
      window[fn]=function(){
        const r=old.apply(this,arguments);
        setTimeout(schedule41,0);
        return r;
      };
    }
  });

  document.addEventListener('DOMContentLoaded',()=>{
    setTimeout(()=>{
      bind41();
      schedule41();
    },700);
  });

  setTimeout(()=>{
    bind41();
    schedule41();
  },1100);

  window.ppg41UpdateSticky=updateFloat41;
})();

/* ============================================================
   SOURCE: ubnb-v42-setup-search-script
   ============================================================ */
(function(){
  let q42='';

  const esc42=s=>String(s??'').replace(/[&<>"']/g,m=>(
    {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]
  ));

  function norm42(s){
    return String(s||'')
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g,'')
      .replace(/\s+/g,' ')
      .trim();
  }

  function highlight42(text,q){
    const raw=String(text??'');
    const query=String(q||'').trim();
    if(!query)return esc42(raw);

    const low=raw.toLowerCase();
    const qlow=query.toLowerCase();
    const i=low.indexOf(qlow);
    if(i<0)return esc42(raw);

    return esc42(raw.slice(0,i))+
      '<span class="ppg42-search-highlight">'+esc42(raw.slice(i,i+query.length))+'</span>'+
      esc42(raw.slice(i+query.length));
  }

  window.ppg42SearchSetup=function(v){
    q42=v||'';
    if(typeof window.ppg39RenderSetup==='function'){
      window.ppg39RenderSetup();
      setTimeout(()=>window.ppg41UpdateSticky?.(),0);
    }
  };

  window.ppg42ClearSearch=function(){
    q42='';
    if(typeof window.ppg39RenderSetup==='function'){
      window.ppg39RenderSetup();
      setTimeout(()=>{
        const inp=document.getElementById('ppg42-search');
        if(inp)inp.focus();
        window.ppg41UpdateSticky?.();
      },0);
    }
  };

  /*
    Bungkus renderer v39.
    Setelah renderer asli membuat group, filter DOM berdasarkan Nama/KK/Wali/Umur/Kelas.
    Dengan cara ini seluruh fitur simpatisan, collapse, sticky floating v41 tetap dipertahankan.
  */
  const originalRender42=window.ppg39RenderSetup;

  function applySearch42(){
    const page=document.getElementById('ppg-page-setup');
    if(!page)return;

    // Sisipkan search setelah stage, sebelum toolbar.
    const stage=page.querySelector('.ppg-v33-stage');
    const toolbar=page.querySelector('.ppg38-setup-toolbar');

    if(toolbar&&!document.getElementById('ppg42-search')){
      const wrap=document.createElement('div');
      wrap.innerHTML=`
        <div class="ppg42-searchbar">
          <input id="ppg42-search" type="search"
            placeholder="Cari nama, KK / wali, umur, kelas..."
            value="${esc42(q42)}"
            oninput="ppg42SearchSetup(this.value)">
          <button class="ppg42-search-clear" onclick="ppg42ClearSearch()" ${q42?'':'disabled'}>Hapus</button>
        </div>
        <div id="ppg42-search-info" class="ppg42-search-info"></div>`;
      toolbar.parentNode.insertBefore(wrap,toolbar);
    }

    const searchInput=document.getElementById('ppg42-search');
    if(searchInput&&searchInput.value!==q42)searchInput.value=q42;

    const query=norm42(q42);
    const groups=[...page.querySelectorAll('.ppg39-group')];

    let totalVisible=0;
    let groupVisible=0;

    groups.forEach(group=>{
      const groupName=group.querySelector('.ppg39-group-head .name')?.textContent?.trim()||'';
      const rows=[...group.querySelectorAll('.ppg39-table tbody tr')];

      let visibleRows=0;
      rows.forEach(row=>{
        const main=row.querySelector('.ppg38-student-main');
        const name=main?.querySelector('.ppg38-student-name')?.textContent?.trim()||'';
        const meta=main?.querySelector('.ppg38-student-meta')?.textContent?.trim()||'';
        const simp=!!main?.querySelector('.ppg38-symp-badge');

        const hay=norm42([name,meta,groupName,simp?'simpatisan':'jamaah'].join(' '));
        const ok=!query||hay.includes(query);

        row.style.display=ok?'':'none';
        if(ok)visibleRows++;

        // Highlight hanya nama agar tetap sederhana.
        const nameEl=main?.querySelector('.ppg38-student-name');
        if(nameEl){
          nameEl.innerHTML=query?highlight42(name,q42):esc42(name);
        }
      });

      if(query){
        group.style.display=visibleRows?'':'none';
        if(visibleRows){
          groupVisible++;
          totalVisible+=visibleRows;

          // Saat search aktif, hasil selalu terbuka supaya tidak tersembunyi oleh collapse.
          const body=group.querySelector('.ppg39-body');
          if(body)body.classList.remove('collapsed');

          const stack=group.querySelector('.ppg39-sticky-stack');
          if(stack){
            let cols=stack.querySelector('.ppg39-column-head');
            if(!cols){
              cols=document.createElement('div');
              cols.className='ppg39-column-head';
              cols.innerHTML='<div>Murid</div><div>Ubah Kelas</div>';
              stack.appendChild(cols);
            }
          }

          const chev=group.querySelector('.ppg39-group-head .chev');
          if(chev)chev.textContent='▾';

          const count=group.querySelector('.ppg39-group-head .count');
          if(count){
            const simpCount=rows.filter(r=>r.style.display!== 'none' && !!r.querySelector('.ppg38-symp-badge')).length;
            count.textContent=`${visibleRows} hasil${simpCount?` · ${simpCount} simpatisan`:''}`;
          }
        }
      }else{
        group.style.display='';
      }
    });

    const info=document.getElementById('ppg42-search-info');
    if(info){
      info.textContent=query
        ? `${totalVisible} murid ditemukan dalam ${groupVisible} kelas`
        : 'Cari berdasarkan nama, KK / wali, umur, kelas, atau kata “simpatisan”.';
    }

    // Floating header perlu dihitung ulang setelah filter.
    setTimeout(()=>window.ppg41UpdateSticky?.(),0);
  }

  if(typeof originalRender42==='function'){
    window.ppg39RenderSetup=function(){
      const r=originalRender42.apply(this,arguments);
      applySearch42();

      // Kembalikan focus/cursor agar nyaman saat mengetik.
      if(q42){
        setTimeout(()=>{
          const inp=document.getElementById('ppg42-search');
          if(inp){
            inp.focus();
            const len=inp.value.length;
            try{inp.setSelectionRange(len,len)}catch(_){}
          }
        },0);
      }
      return r;
    };
  }

  // Router v39 memanggil lexical renderSetup39, bukan selalu window function.
  // Maka setelah user masuk tab Setup, apply ulang ke DOM hasil render.
  const priorOpen42=window.ppgOpenPage;
  window.ppgOpenPage=function(page,btn){
    const r=priorOpen42?.apply(this,arguments);
    if(page==='setup'){
      setTimeout(applySearch42,0);
    }
    return r;
  };

  // Mutation observer memastikan search tetap hadir jika Setup dirender ulang dari patch lama.
  function observe42(){
    const page=document.getElementById('ppg-page-setup');
    if(!page||page.dataset.ppg42Observed)return;
    page.dataset.ppg42Observed='1';
    let t=0;
    new MutationObserver(()=>{
      clearTimeout(t);
      t=setTimeout(()=>{
        if(page.classList.contains('active'))applySearch42();
      },20);
    }).observe(page,{childList:true,subtree:false});
  }

  setTimeout(()=>{
    observe42();
    if(document.getElementById('ppg-page-setup')?.classList.contains('active')){
      applySearch42();
    }
  },900);

  window.ppg42ApplySearch=applySearch42;
})();

/* ============================================================
   SOURCE: ubnb-v44-search-fix-script
   ============================================================ */
(function(){
  let query44='';
  let timer44=0;
  let mutTimer44=0;

  const norm44=s=>String(s||'')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g,'')
    .replace(/\s+/g,' ')
    .trim();

  function getCollapsed44(){
    try{return JSON.parse(localStorage.getItem('ubnb_ppg_v38_setup_collapsed')||'{}')||{}}
    catch(_e){return {}}
  }

  function ensureSearch44(){
    const page=document.getElementById('ppg-page-setup');
    if(!page)return;

    let input=document.getElementById('ppg42-search');
    if(input){
      if(input.value!==query44)input.value=query44;
      return;
    }

    const toolbar=page.querySelector('.ppg38-setup-toolbar');
    if(!toolbar)return;

    const wrap=document.createElement('div');
    wrap.innerHTML=`
      <div class="ppg42-searchbar">
        <input id="ppg42-search" type="search"
          autocomplete="off"
          spellcheck="false"
          placeholder="Cari nama, KK / wali, umur, kelas..."
          oninput="ppg42SearchSetup(this.value)">
        <button class="ppg42-search-clear" onclick="ppg42ClearSearch()">Hapus</button>
      </div>
      <div id="ppg42-search-info" class="ppg42-search-info"></div>`;
    toolbar.parentNode.insertBefore(wrap,toolbar);

    input=document.getElementById('ppg42-search');
    if(input)input.value=query44;
  }

  function restoreGroup44(group){
    const groupName=group.querySelector('.ppg39-group-head .name')?.textContent?.trim()||'';
    const body=group.querySelector('.ppg39-body');
    const chev=group.querySelector('.ppg39-group-head .chev');
    const stack=group.querySelector('.ppg39-sticky-stack');
    const rows=[...group.querySelectorAll('.ppg39-table tbody tr')];
    const collapsed=getCollapsed44();
    const isCollapsed=!!collapsed[groupName];

    group.style.display='';
    rows.forEach(r=>r.style.display='');

    if(body)body.classList.toggle('collapsed',isCollapsed);
    if(chev)chev.textContent=isCollapsed?'▸':'▾';

    let cols=stack?.querySelector('.ppg39-column-head');
    if(isCollapsed){
      cols?.remove();
    }else if(stack&&!cols){
      cols=document.createElement('div');
      cols.className='ppg39-column-head';
      cols.innerHTML='<div>Murid</div><div>Ubah Kelas</div>';
      stack.appendChild(cols);
    }

    // Pulihkan count asli berdasarkan seluruh row, bukan count hasil pencarian.
    const count=group.querySelector('.ppg39-group-head .count');
    if(count){
      const simp=rows.filter(r=>!!r.querySelector('.ppg38-symp-badge')).length;
      count.textContent=`${rows.length} murid${simp?` · ${simp} simpatisan`:''}`;
    }
  }

  function apply44(){
    ensureSearch44();

    const page=document.getElementById('ppg-page-setup');
    if(!page)return;

    const input=document.getElementById('ppg42-search');
    if(input&&input.value!==query44)input.value=query44;

    const q=norm44(query44);
    const groups=[...page.querySelectorAll('.ppg39-group')];

    let total=0, groupCount=0;

    // Hilangkan empty state lama.
    page.querySelector('.ppg44-search-empty')?.remove();

    if(!q){
      groups.forEach(restoreGroup44);

      const info=document.getElementById('ppg42-search-info');
      if(info)info.textContent='Cari berdasarkan nama, KK / wali, umur, kelas, atau kata “simpatisan”.';

      const clear=document.querySelector('.ppg42-search-clear');
      if(clear)clear.disabled=true;

      setTimeout(()=>window.ppg41UpdateSticky?.(),0);
      return;
    }

    const clear=document.querySelector('.ppg42-search-clear');
    if(clear)clear.disabled=false;

    groups.forEach(group=>{
      const groupName=group.querySelector('.ppg39-group-head .name')?.textContent?.trim()||'';
      const rows=[...group.querySelectorAll('.ppg39-table tbody tr')];

      let visible=0;
      let visibleSimp=0;

      rows.forEach(row=>{
        const name=row.querySelector('.ppg38-student-name')?.textContent?.trim()||'';
        const meta=row.querySelector('.ppg38-student-meta')?.textContent?.trim()||'';
        const isSimp=!!row.querySelector('.ppg38-symp-badge');

        const hay=norm44(`${name} ${meta} ${groupName} ${isSimp?'simpatisan':'jamaah'}`);
        const ok=hay.includes(q);

        row.style.display=ok?'':'none';
        if(ok){
          visible++;
          if(isSimp)visibleSimp++;
        }
      });

      group.style.display=visible?'':'none';

      if(!visible)return;

      total+=visible;
      groupCount++;

      // Saat pencarian aktif, hasil harus selalu terbuka.
      const body=group.querySelector('.ppg39-body');
      if(body)body.classList.remove('collapsed');

      const chev=group.querySelector('.ppg39-group-head .chev');
      if(chev)chev.textContent='▾';

      const stack=group.querySelector('.ppg39-sticky-stack');
      if(stack&&!stack.querySelector('.ppg39-column-head')){
        const cols=document.createElement('div');
        cols.className='ppg39-column-head';
        cols.innerHTML='<div>Murid</div><div>Ubah Kelas</div>';
        stack.appendChild(cols);
      }

      const count=group.querySelector('.ppg39-group-head .count');
      if(count)count.textContent=`${visible} hasil${visibleSimp?` · ${visibleSimp} simpatisan`:''}`;
    });

    const info=document.getElementById('ppg42-search-info');
    if(info)info.textContent=`${total} murid ditemukan dalam ${groupCount} kelas`;

    if(total===0){
      const toolbar=page.querySelector('.ppg38-setup-toolbar');
      if(toolbar){
        const empty=document.createElement('div');
        empty.className='ppg44-search-empty';
        empty.textContent='Tidak ada murid yang cocok dengan pencarian.';
        toolbar.parentNode.insertBefore(empty,toolbar.nextSibling);
      }
    }

    setTimeout(()=>window.ppg41UpdateSticky?.(),0);
  }

  // Search tidak render ulang seluruh Setup Kelas.
  // Ini yang memperbaiki lag/flicker dan bug saat menghapus teks.
  window.ppg42SearchSetup=function(v){
    query44=String(v??'');

    clearTimeout(timer44);
    timer44=setTimeout(()=>{
      apply44();

      // Fokus tetap di input, cursor tidak lompat.
      const input=document.getElementById('ppg42-search');
      if(input&&document.activeElement!==input)input.focus({preventScroll:true});
    },45);
  };

  window.ppg42ClearSearch=function(){
    query44='';
    clearTimeout(timer44);

    const input=document.getElementById('ppg42-search');
    if(input)input.value='';

    apply44();

    setTimeout(()=>{
      const x=document.getElementById('ppg42-search');
      if(x){
        x.focus({preventScroll:true});
        try{x.setSelectionRange(0,0)}catch(_e){}
      }
    },0);
  };

  // Router: setelah Setup Kelas dirender, pasang kembali search & filter.
  const oldOpen44=window.ppgOpenPage;
  window.ppgOpenPage=function(page,btn){
    const r=oldOpen44?.apply(this,arguments);
    if(page==='setup'){
      setTimeout(apply44,0);
    }
    return r;
  };

  // Jika Setup dirender ulang karena pindah kelas / tambah simpatisan,
  // apply ulang query tanpa memicu render loop.
  function observe44(){
    const page=document.getElementById('ppg-page-setup');
    if(!page||page.dataset.ppg44Observed)return;

    page.dataset.ppg44Observed='1';

    new MutationObserver(muts=>{
      // Abaikan perubahan style/display dari filter kita sendiri.
      const meaningful=muts.some(m=>m.type==='childList');
      if(!meaningful)return;

      clearTimeout(mutTimer44);
      mutTimer44=setTimeout(()=>{
        if(page.classList.contains('active'))apply44();
      },70);
    }).observe(page,{childList:true,subtree:false});
  }

  setTimeout(()=>{
    observe44();

    const input=document.getElementById('ppg42-search');
    if(input)query44=input.value||'';

    if(document.getElementById('ppg-page-setup')?.classList.contains('active')){
      apply44();
    }
  },900);

  window.ppg44ApplySearch=apply44;
})();

/* ============================================================
   SOURCE: ubnb-v45-search-stable-script
   ============================================================ */
(function(){
  let query45='';
  let raf45=0;
  let stickyTimer45=0;

  const norm45=s=>String(s||'')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g,'')
    .replace(/\s+/g,' ')
    .trim();

  function collapsed45(){
    try{return JSON.parse(localStorage.getItem('ubnb_ppg_v38_setup_collapsed')||'{}')||{}}
    catch(_){return {}}
  }

  function setupSearchUi45(){
    const page=document.getElementById('ppg-page-setup');
    if(!page)return null;

    let input=document.getElementById('ppg42-search');
    const toolbar=page.querySelector('.ppg38-setup-toolbar');

    if(!input && toolbar){
      const wrap=document.createElement('div');
      wrap.innerHTML=`
        <div class="ppg42-searchbar">
          <input id="ppg42-search" type="search" autocomplete="off" spellcheck="false"
            placeholder="Cari nama, KK / wali, umur, kelas...">
          <button id="ppg45-clear" class="ppg42-search-clear" type="button">Hapus</button>
        </div>
        <div id="ppg42-search-info" class="ppg42-search-info"></div>
        <div id="ppg45-empty" class="ppg45-search-empty">Tidak ada murid yang cocok dengan pencarian.</div>`;
      toolbar.parentNode.insertBefore(wrap,toolbar);
      input=document.getElementById('ppg42-search');
    }

    if(!input)return null;

    /* Matikan inline handler lama agar tidak ada dua search engine berjalan bersamaan. */
    input.removeAttribute('oninput');

    if(!input.dataset.ppg45Bound){
      input.dataset.ppg45Bound='1';
      input.addEventListener('input',()=>{
        query45=input.value||'';
        schedule45();
      },{passive:true});
    }

    let clear=document.getElementById('ppg45-clear') || document.querySelector('.ppg42-search-clear');
    if(clear){
      clear.removeAttribute('onclick');
      if(!clear.dataset.ppg45Bound){
        clear.dataset.ppg45Bound='1';
        clear.addEventListener('click',()=>{
          query45='';
          input.value='';
          apply45();
          input.focus({preventScroll:true});
        });
      }
      clear.id='ppg45-clear';
    }

    if(!document.getElementById('ppg45-empty')){
      const empty=document.createElement('div');
      empty.id='ppg45-empty';
      empty.className='ppg45-search-empty';
      empty.textContent='Tidak ada murid yang cocok dengan pencarian.';
      toolbar?.parentNode.insertBefore(empty,toolbar?.nextSibling||null);
    }

    if(input.value!==query45)input.value=query45;
    return input;
  }

  function restore45(group){
    const name=group.querySelector('.ppg39-group-head .name')?.textContent?.trim()||'';
    const rows=[...group.querySelectorAll('.ppg39-table tbody tr')];
    const isClosed=!!collapsed45()[name];

    group.classList.remove('ppg45-hidden');
    rows.forEach(r=>r.classList.remove('ppg45-hidden'));

    const body=group.querySelector('.ppg39-body');
    if(body)body.classList.toggle('collapsed',isClosed);

    const chev=group.querySelector('.ppg39-group-head .chev');
    if(chev)chev.textContent=isClosed?'▸':'▾';

    const stack=group.querySelector('.ppg39-sticky-stack');
    let cols=stack?.querySelector('.ppg39-column-head');
    if(isClosed){
      cols?.remove();
    }else if(stack&&!cols){
      cols=document.createElement('div');
      cols.className='ppg39-column-head';
      cols.innerHTML='<div>Murid</div><div>Ubah Kelas</div>';
      stack.appendChild(cols);
    }

    const count=group.querySelector('.ppg39-group-head .count');
    if(count){
      const simp=rows.filter(r=>!!r.querySelector('.ppg38-symp-badge')).length;
      count.textContent=`${rows.length} murid${simp?` · ${simp} simpatisan`:''}`;
    }
  }

  function apply45(){
    raf45=0;
    const page=document.getElementById('ppg-page-setup');
    if(!page)return;

    const input=setupSearchUi45();
    if(!input)return;

    const q=norm45(query45);
    const groups=[...page.querySelectorAll('.ppg39-group')];

    let total=0, groupsShown=0;

    if(!q){
      groups.forEach(restore45);

      const info=document.getElementById('ppg42-search-info');
      if(info)info.textContent='Cari berdasarkan nama, KK / wali, umur, kelas, atau simpatisan.';

      const empty=document.getElementById('ppg45-empty');
      empty?.classList.remove('show');

      const clear=document.getElementById('ppg45-clear');
      if(clear)clear.disabled=true;

      /* Sticky dihitung setelah user selesai mengetik, bukan setiap karakter. */
      clearTimeout(stickyTimer45);
      stickyTimer45=setTimeout(()=>window.ppg41UpdateSticky?.(),180);
      return;
    }

    const clear=document.getElementById('ppg45-clear');
    if(clear)clear.disabled=false;

    groups.forEach(group=>{
      const gName=group.querySelector('.ppg39-group-head .name')?.textContent?.trim()||'';
      const rows=[...group.querySelectorAll('.ppg39-table tbody tr')];

      let visible=0, simp=0;

      rows.forEach(row=>{
        const name=row.querySelector('.ppg38-student-name')?.textContent?.trim()||'';
        const meta=row.querySelector('.ppg38-student-meta')?.textContent?.trim()||'';
        const isSimp=!!row.querySelector('.ppg38-symp-badge');
        const hay=norm45(`${name} ${meta} ${gName} ${isSimp?'simpatisan':'jamaah'}`);
        const ok=hay.includes(q);

        row.classList.toggle('ppg45-hidden',!ok);
        if(ok){
          visible++;
          if(isSimp)simp++;
        }
      });

      group.classList.toggle('ppg45-hidden',visible===0);

      if(!visible)return;

      total+=visible;
      groupsShown++;

      const body=group.querySelector('.ppg39-body');
      if(body)body.classList.remove('collapsed');

      const chev=group.querySelector('.ppg39-group-head .chev');
      if(chev)chev.textContent='▾';

      const stack=group.querySelector('.ppg39-sticky-stack');
      if(stack&&!stack.querySelector('.ppg39-column-head')){
        const cols=document.createElement('div');
        cols.className='ppg39-column-head';
        cols.innerHTML='<div>Murid</div><div>Ubah Kelas</div>';
        stack.appendChild(cols);
      }

      const count=group.querySelector('.ppg39-group-head .count');
      if(count)count.textContent=`${visible} hasil${simp?` · ${simp} simpatisan`:''}`;
    });

    const info=document.getElementById('ppg42-search-info');
    if(info)info.textContent=`${total} murid ditemukan dalam ${groupsShown} kelas`;

    const empty=document.getElementById('ppg45-empty');
    empty?.classList.toggle('show',total===0);

    clearTimeout(stickyTimer45);
    stickyTimer45=setTimeout(()=>window.ppg41UpdateSticky?.(),180);
  }

  function schedule45(){
    if(raf45)cancelAnimationFrame(raf45);
    raf45=requestAnimationFrame(apply45);
  }

  /*
    Override fungsi lama. Tidak ada render ulang, tidak ada focus paksa,
    tidak ada innerHTML nama/highlight saat mengetik.
  */
  window.ppg42SearchSetup=function(v){
    query45=String(v??'');
    const input=document.getElementById('ppg42-search');
    if(input&&input.value!==query45)input.value=query45;
    schedule45();
  };

  window.ppg42ClearSearch=function(){
    query45='';
    const input=document.getElementById('ppg42-search');
    if(input)input.value='';
    apply45();
  };

  /* Setelah Setup dirender ulang, pasang kembali listener sekali saja. */
  const priorOpen45=window.ppgOpenPage;
  window.ppgOpenPage=function(page,btn){
    const r=priorOpen45?.apply(this,arguments);
    if(page==='setup'){
      setTimeout(()=>{
        setupSearchUi45();
        apply45();
      },0);
    }
    return r;
  };

  /*
    Observe hanya direct replacement Setup. Tidak mengamati perubahan row,
    sehingga tidak ada loop saat filter.
  */
  function observe45(){
    const page=document.getElementById('ppg-page-setup');
    if(!page||page.dataset.ppg45Observed)return;
    page.dataset.ppg45Observed='1';

    let t=0;
    new MutationObserver(muts=>{
      const replaced=muts.some(m=>m.type==='childList'&&m.target===page);
      if(!replaced)return;
      clearTimeout(t);
      t=setTimeout(()=>{
        if(page.classList.contains('active')){
          setupSearchUi45();
          apply45();
        }
      },80);
    }).observe(page,{childList:true,subtree:false});
  }

  setTimeout(()=>{
    observe45();
    const input=setupSearchUi45();
    if(input)query45=input.value||'';

    if(document.getElementById('ppg-page-setup')?.classList.contains('active')){
      apply45();
    }
  },900);

  window.ppg45ApplySearch=apply45;
})();

/* ============================================================
   SOURCE: ubnb-v46-kelas-guru-ux-script
   ============================================================ */
(function(){
  const SESSION_KEY='ubnb_ppg_v37_classes';
  const LOGGER_KEY='ubnb_ppg_v37_logger';
  const CUSTOM_GURU_KEY='ubnb_ppg_v35_custom_teachers';
  const OLD_ASSIGN_KEY='ubnb_ppg_v34_teacher_assign';
  const MULTI_ASSIGN_KEY='ubnb_ppg_v46_teacher_classes';
  const SYMP_KEY='ubnb_ppg_v38_simpatisan';
  const DRAFT_KEY='ubnb_ppg_v33_class_drafts';

  const CLASSES=[
    'Balita','Cabe Rawit Tahap A','Cabe Rawit Tahap B',
    'Pra Remaja','Remaja','Dewasa'
  ];

  let kelasMode46='active';
  let historyMode46='daily';
  let expanded46=null;
  let startSelectedClass46='';
  let guruModal46={mode:'add',did:null,classes:[]};

  const esc46=s=>String(s??'').replace(/[&<>"']/g,m=>(
    {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]
  ));
  const norm46=s=>String(s||'').trim().toLowerCase();

  function get46(k,d){
    try{return JSON.parse(localStorage.getItem(k)||JSON.stringify(d))}
    catch(_){return d}
  }
  function set46(k,v){localStorage.setItem(k,JSON.stringify(v))}
  function scope46(){
    try{return JSON.parse(sessionStorage.getItem('ubnb_ppg_v34_scope')||'null')}
    catch(_){return null}
  }
  function controller46(){return scope46()?.type==='controller'}
  function scopeId46(){return controller46()?'DESA':(scope46()?.kelompok||'')}

  function sessions46(){return get46(SESSION_KEY,[])}
  function saveSessions46(v){set46(SESSION_KEY,v)}

  function teacherClassMap46(){return get46(MULTI_ASSIGN_KEY,{})}
  function saveTeacherClassMap46(v){set46(MULTI_ASSIGN_KEY,v)}

  function teacherClasses46(did){
    const key=String(did);
    const multi=teacherClassMap46();
    if(Array.isArray(multi[key])){
      return multi[key].filter(x=>CLASSES.includes(x));
    }

    /* migrate old single-choice setting */
    const old=get46(OLD_ASSIGN_KEY,{});
    const ov=old[key];
    if(ov==='Semua Kelas'||!ov)return [...CLASSES];
    if(CLASSES.includes(ov))return [ov];
    return [...CLASSES];
  }

  function isTeacherRole46(label){
    const z=' '+String(label||'').toLowerCase().replace(/[._/-]+/g,' ').replace(/\s+/g,' ')+' ';
    return /(^|\s)mt(\s|$)/.test(z)||/(^|\s)ms(\s|$)/.test(z);
  }

  function teachers46(){
    const map=new Map(), s=scope46();

    (Array.isArray(aPengurus)?aPengurus:[])
      .filter(p=>p&&p.aktif!==false&&isTeacherRole46(p.dapukan))
      .forEach(p=>{
        if(s?.type==='kelompok'&&(p.level!=='kelompok'||p.kelompok_nama!==s.kelompok))return;
        const j=typeof findJamaahAny==='function'
          ?findJamaahAny(p.did)
          :(Array.isArray(aJamaah)?aJamaah:[]).find(x=>String(x.did)===String(p.did));
        if(!j)return;
        const key=String(p.did);
        if(!map.has(key))map.set(key,{
          did:key,nama:j.nama||'-',kelompok_nama:j.kelompok_nama||p.kelompok_nama||'-',
          roles:[],origin:'MT/MS'
        });
        if(p.dapukan&&!map.get(key).roles.includes(p.dapukan))map.get(key).roles.push(p.dapukan);
      });

    get46(CUSTOM_GURU_KEY,[]).forEach(c=>{
      if(s?.type==='kelompok'&&c.kelompok_nama!==s.kelompok)return;
      const j=(Array.isArray(aJamaah)?aJamaah:[]).find(x=>String(x.did)===String(c.did));
      if(!j)return;
      const key=String(c.did);
      if(!map.has(key))map.set(key,{
        did:key,nama:j.nama||'-',kelompok_nama:j.kelompok_nama||'-',
        roles:[c.role||'Guru'],origin:'Tambahan PPG'
      });
      else if(c.role&&!map.get(key).roles.includes(c.role))map.get(key).roles.push(c.role);
    });

    return [...map.values()]
      .map(t=>({...t,classes:teacherClasses46(t.did)}))
      .sort((a,b)=>String(a.nama).localeCompare(String(b.nama),'id'));
  }

  function jamaahStudents46(){
    let rows=(Array.isArray(aJamaah)?aJamaah:[])
      .filter(j=>j.status_nikah==='Belum Menikah')
      .filter(j=>j.status_sambung==='Tetap');
    if(scope46()?.type==='kelompok')rows=rows.filter(j=>j.kelompok_nama===scope46().kelompok);

    const drafts=get46(DRAFT_KEY,{});
    return rows.map(j=>({
      did:String(j.did),nama:j.nama||'-',nama_kk:j.nama_kk||'-',
      kelas:drafts[String(j.did)]||j.kelas_kbm||j.kelas_usia||'Belum Ditentukan',
      kind:'jamaah'
    }));
  }

  function simpStudents46(){
    let rows=get46(SYMP_KEY,[]);
    if(scope46()?.type==='kelompok')rows=rows.filter(x=>x.scope===scopeId46());
    return rows.map(x=>({
      did:String(x.id),nama:x.nama||'-',nama_kk:x.nama_kk||'-',
      kelas:x.kelas||'Belum Ditentukan',kind:'simpatisan'
    }));
  }

  function studentRoster46(k){
    return [...jamaahStudents46(),...simpStudents46()]
      .filter(x=>x.kelas===k)
      .sort((a,b)=>String(a.nama).localeCompare(String(b.nama),'id'))
      .map(x=>({
        did:x.did,nama:x.nama,status:'Belum Hadir',kind:x.kind,nama_kk:x.nama_kk
      }));
  }

  function today46(){
    try{return new Intl.DateTimeFormat('en-CA',{
      timeZone:'Asia/Jakarta',year:'numeric',month:'2-digit',day:'2-digit'
    }).format(new Date())}
    catch(_){return ubnbWibIso84().slice(0,10)}
  }

  async function gpsSilent46(){
    if(!navigator.geolocation)return null;
    return await new Promise(resolve=>{
      let done=false;
      const end=v=>{if(done)return;done=true;resolve(v)};
      navigator.geolocation.getCurrentPosition(
        p=>end({lat:p.coords.latitude,lng:p.coords.longitude,accuracy:p.coords.accuracy}),
        ()=>end(null),
        {enableHighAccuracy:false,timeout:3500,maximumAge:60000}
      );
      setTimeout(()=>end(null),4000);
    });
  }

  function logStart46(s,gps){
    const rows=get46(LOGGER_KEY,[]);
    rows.push({
      at:ubnbWibIso84(),type:'MULAI_KELAS',
      account:CU?.nama||CU?.username||'-',scope:scopeId46(),
      sessionId:s.id,className:s.className,teacherName:s.teacherName,gps
    });
    set46(LOGGER_KEY,rows);
  }

  /* ---------------- Start Class Popup ---------------- */
  function ensureStartModal46(){
    if(document.getElementById('ppg46-start-modal'))return;

    document.body.insertAdjacentHTML('beforeend',`
      <div id="ppg46-start-modal" class="ppg46-modal">
        <div class="ppg46-modal-card">
          <div class="ppg46-modal-head">
            <b>Mulai Kelas</b>
            <button class="ppg46-modal-close" onclick="ppg46CloseStart()">✕</button>
          </div>
          <div class="ppg46-modal-body">
            <div class="ppg46-field">
              <label>Tanggal</label>
              <input id="ppg46-start-date" type="date" readonly>
            </div>
            <div class="ppg46-field">
              <label>Guru</label>
              <select id="ppg46-start-teacher" onchange="ppg46TeacherChanged()"></select>
            </div>
            <div class="ppg46-field">
              <label>Pilih Kelas Binaan</label>
              <div id="ppg46-start-classes" class="ppg46-class-buttons"></div>
              <div class="ppg46-class-help">Satu kali membuka kelas hanya untuk satu kelas. Guru dapat membuka kelas lain secara terpisah.</div>
            </div>
            <div class="ppg46-modal-actions">
              <button class="ppg46-secondary" onclick="ppg46CloseStart()">Batal</button>
              <button class="ppg46-primary" onclick="ppg46StartClass()">Mulai Kelas</button>
            </div>
          </div>
        </div>
      </div>`);
  }

  function defaultTeacherDid46(ts){
    const did=String(CU?.did||CU?.id||'');
    if(did&&ts.some(t=>String(t.did)===did))return did;

    const name=norm46(CU?.nama||CU?.username||'');
    const byName=ts.find(t=>norm46(t.nama)===name);
    return byName?.did||'';
  }

  window.ppg46OpenStart=function(){
    if(controller46())return;
    ensureStartModal46();

    const ts=teachers46();
    const sel=document.getElementById('ppg46-start-teacher');
    const def=defaultTeacherDid46(ts);

    sel.innerHTML=`<option value="">Pilih guru...</option>`+
      ts.map(t=>`<option value="${esc46(t.did)}" ${String(t.did)===String(def)?'selected':''}>${esc46(t.nama)}</option>`).join('');

    document.getElementById('ppg46-start-date').value=today46();
    startSelectedClass46='';
    renderStartClasses46();
    document.getElementById('ppg46-start-modal').classList.add('show');
  };

  window.ppg46CloseStart=function(){
    document.getElementById('ppg46-start-modal')?.classList.remove('show');
  };

  window.ppg46TeacherChanged=function(){
    startSelectedClass46='';
    renderStartClasses46();
  };

  function renderStartClasses46(){
    const box=document.getElementById('ppg46-start-classes');
    if(!box)return;

    const did=document.getElementById('ppg46-start-teacher')?.value||'';
    const t=teachers46().find(x=>String(x.did)===String(did));
    const classes=t?.classes||[];

    box.innerHTML=classes.length
      ? classes.map(k=>`<button type="button" class="ppg46-class-btn ${startSelectedClass46===k?'selected':''}" onclick="ppg46SelectStartClass('${esc46(k)}')">${esc46(k)}</button>`).join('')
      : '<div class="ppg-empty" style="grid-column:1/-1">Guru belum memiliki Kelas Binaan.</div>';
  }

  window.ppg46SelectStartClass=function(k){
    startSelectedClass46=k;
    renderStartClasses46();
  };

  window.ppg46StartClass=async function(){
    const teacherDid=document.getElementById('ppg46-start-teacher')?.value||'';
    const date=document.getElementById('ppg46-start-date')?.value||today46();
    const className=startSelectedClass46;

    if(!teacherDid){toast('Pilih guru terlebih dahulu.',true);return}
    if(!className){toast('Pilih satu kelas binaan.',true);return}

    const teacher=teachers46().find(t=>String(t.did)===String(teacherDid));
    if(!teacher){toast('Guru tidak ditemukan.',true);return}
    if(!teacher.classes.includes(className)){
      toast('Kelas tersebut bukan kelas binaan guru yang dipilih.',true);return
    }

    const dupe=sessions46().some(s=>
      s.scope===scopeId46()&&s.date===date&&s.className===className&&s.status==='active'
    );
    if(dupe){toast('Kelas ini sudah aktif hari ini.',true);return}

    const s={
      id:'K'+Date.now(),
      scope:scopeId46(),
      date,
      className,
      teacherDid:String(teacher.did),
      teacherName:teacher.nama,
      startedAt:ubnbWibIso84(),
      startedBy:CU?.nama||CU?.username||'-',
      status:'active',
      teacherAttendance:[{
        did:String(teacher.did),nama:teacher.nama,status:'Hadir',source:'selected_teacher'
      }],
      students:studentRoster46(className),
      generalMaterials:[],
      studentMaterials:{},
      generalNote:'',
      studentNotes:{}
    };

    const all=sessions46();
    all.push(s);
    saveSessions46(all);
    gpsSilent46().then(g=>logStart46(s,g));

    ppg46CloseStart();
    expanded46=null; // default collapse
    kelasMode46='active';
    renderKelas46();
    toast('Kelas aktif.');
  };

  /* ---------------- Active Classes ---------------- */
  function visibleSessions46(){
    let rows=sessions46();
    if(!controller46())rows=rows.filter(s=>s.scope===scopeId46());
    return rows;
  }

  function att46(s){
    const total=(s.students||[]).length;
    const hadir=(s.students||[]).filter(x=>x.status==='Hadir').length;
    return {total,hadir,pct:total?Math.round(hadir/total*100):0};
  }

  function activeCards46(){
    const rows=visibleSessions46()
      .filter(s=>s.status==='active'&&s.date===today46())
      .sort((a,b)=>String(a.startedAt||'').localeCompare(String(b.startedAt||'')));

    if(!rows.length)return '<div class="ppg-empty">Belum ada kelas aktif hari ini.</div>';

    return `<div class="ppg46-active-list">${rows.map(s=>{
      const a=att46(s);
      const expanded=String(expanded46)===String(s.id);
      return `<article class="ppg46-active-card ${expanded?'expanded':''}">
        <div class="ppg46-active-summary">
          <div class="ppg46-active-lines">
            <button class="ppg46-class-link" onclick="ppg46ToggleClass('${esc46(s.id)}')">
              <span class="ppg46-chevron">${expanded?'▾':'▸'}</span>
              <span>${esc46(s.className)}</span>
            </button>
            <div class="ppg46-active-line2">Guru: ${esc46(s.teacherName||'-')} · Hadir ${a.hadir}/${a.total}</div>
          </div>
          <div class="ppg46-active-att">
            <div class="ppg46-active-pct">${a.pct}%</div>
            <div class="ppg46-active-count">sudah hadir</div>
          </div>
        </div>
        <div class="ppg46-active-progress"><span style="width:${a.pct}%"></span></div>
        <div class="ppg46-active-detail">${expanded?'<div id="p37detail"></div>':''}</div>
      </article>`;
    }).join('')}</div>`;
  }

  const legacyOpen46=window.ppg37Open;

  window.ppg46ToggleClass=function(id){
    expanded46=String(expanded46)===String(id)?null:id;
    renderKelas46();

    if(expanded46&&typeof legacyOpen46==='function'){
      setTimeout(()=>legacyOpen46(id),0);
    }
  };

  function weekStart46(d){
    const x=new Date(d+'T00:00:00');
    const n=(x.getDay()+6)%7;
    x.setDate(x.getDate()-n);
    return x.toISOString().slice(0,10);
  }

  function history46(){
    const rows=visibleSessions46()
      .filter(s=>s.status==='finished')
      .sort((a,b)=>String(b.date).localeCompare(String(a.date)));

    if(!rows.length)return '<div class="ppg-empty">Belum ada kelas selesai.</div>';

    const groups=new Map();
    rows.forEach(s=>{
      const key=historyMode46==='daily'?s.date:
        historyMode46==='weekly'?weekStart46(s.date):
        String(s.date).slice(0,7);
      if(!groups.has(key))groups.set(key,[]);
      groups.get(key).push(s);
    });

    return `
      <div class="ppg46-tabs" style="margin-bottom:8px">
        ${[['daily','Harian'],['weekly','Mingguan'],['monthly','Bulanan']].map(x=>
          `<button class="ppg46-tab ${historyMode46===x[0]?'active':''}" onclick="ppg46HistoryMode('${x[0]}')">${x[1]}</button>`
        ).join('')}
      </div>
      ${[...groups.entries()].map(([key,list])=>`
        <div class="ppg46-history-group">
          <div class="ppg46-history-title">${esc46(key)} · ${list.length} kelas</div>
          ${list.map(s=>{
            const a=att46(s);
            return `<div class="ppg46-history-row">
              <b>${esc46(s.date)}</b>
              <span><b>${esc46(s.className)}</b><br><span class="ppg-mini-note">${esc46(s.teacherName||'-')}</span></span>
              <span>${a.hadir}/${a.total} · ${a.pct}%</span>
            </div>`;
          }).join('')}
        </div>`).join('')}`;
  }

  window.ppg46HistoryMode=function(m){
    historyMode46=m;
    renderKelas46();
  };

  window.ppg46KelasMode=function(m){
    kelasMode46=m;
    expanded46=null;
    renderKelas46();
  };

  function renderKelas46(){
    const el=document.getElementById('ppg-page-kelas');
    if(!el)return;

    el.innerHTML=`
      <div class="ppg46-topbar">
        <div class="ppg46-tabs">
          <button class="ppg46-tab ${kelasMode46==='active'?'active':''}" onclick="ppg46KelasMode('active')">Aktif Hari Ini</button>
          <button class="ppg46-tab ${kelasMode46==='history'?'active':''}" onclick="ppg46KelasMode('history')">Riwayat</button>
        </div>
        ${controller46()?'':'<button class="ppg46-start-btn" onclick="ppg46OpenStart()">+ Mulai Kelas</button>'}
      </div>
      ${kelasMode46==='active'?activeCards46():history46()}`;

    if(expanded46&&typeof legacyOpen46==='function'){
      setTimeout(()=>legacyOpen46(expanded46),0);
    }
  }

  /* ---------------- Dewan Guru popup + multi-choice ---------------- */
  function ensureGuruModal46(){
    if(document.getElementById('ppg46-guru-modal'))return;

    document.body.insertAdjacentHTML('beforeend',`
      <div id="ppg46-guru-modal" class="ppg46-modal">
        <div class="ppg46-modal-card">
          <div class="ppg46-modal-head">
            <b id="ppg46-guru-modal-title">Dewan Guru</b>
            <button class="ppg46-modal-close" onclick="ppg46CloseGuruModal()">✕</button>
          </div>
          <div class="ppg46-modal-body">
            <div id="ppg46-guru-person-fields">
              <div class="ppg46-field">
                <label>Nama</label>
                <select id="ppg46-guru-person"></select>
              </div>
              <div class="ppg46-field">
                <label>Peran</label>
                <select id="ppg46-guru-role">
                  <option>Guru</option>
                  <option>Pendamping Guru</option>
                  <option>Koordinator Kelas</option>
                </select>
              </div>
            </div>
            <div class="ppg46-field">
              <label>Kelas Binaan</label>
              <div id="ppg46-guru-classes" class="ppg46-class-buttons"></div>
              <div class="ppg46-class-help">Bisa memilih lebih dari satu kelas.</div>
            </div>
            <div class="ppg46-modal-actions">
              <button class="ppg46-secondary" onclick="ppg46CloseGuruModal()">Batal</button>
              <button class="ppg46-primary" onclick="ppg46SaveGuruModal()">Simpan</button>
            </div>
          </div>
        </div>
      </div>`);
  }

  function renderGuruClassChoices46(){
    const box=document.getElementById('ppg46-guru-classes');
    if(!box)return;

    box.innerHTML=CLASSES.map(k=>`
      <button type="button" class="ppg46-class-btn ${guruModal46.classes.includes(k)?'selected':''}"
        onclick="ppg46ToggleGuruClass('${esc46(k)}')">${esc46(k)}</button>
    `).join('');
  }

  window.ppg46ToggleGuruClass=function(k){
    const i=guruModal46.classes.indexOf(k);
    if(i>=0)guruModal46.classes.splice(i,1);
    else guruModal46.classes.push(k);
    renderGuruClassChoices46();
  };

  function guruCandidates46(){
    const existing=new Set(teachers46().map(t=>String(t.did)));
    let rows=(Array.isArray(aJamaah)?aJamaah:[]);
    if(scope46()?.type==='kelompok')rows=rows.filter(j=>j.kelompok_nama===scope46().kelompok);
    return rows.filter(j=>!existing.has(String(j.did)))
      .sort((a,b)=>String(a.nama||'').localeCompare(String(b.nama||''),'id'));
  }

  window.ppg46OpenAddGuru=function(){
    if(controller46())return;
    ensureGuruModal46();
    guruModal46={mode:'add',did:null,classes:[]};

    document.getElementById('ppg46-guru-modal-title').textContent='Tambah Dewan Guru';
    document.getElementById('ppg46-guru-person-fields').style.display='';

    const candidates=guruCandidates46();
    document.getElementById('ppg46-guru-person').innerHTML=
      '<option value="">Pilih nama...</option>'+
      candidates.map(j=>`<option value="${esc46(j.did)}">${esc46(j.nama)} · ${esc46(j.nama_kk||'-')}</option>`).join('');

    document.getElementById('ppg46-guru-role').value='Guru';
    renderGuruClassChoices46();
    document.getElementById('ppg46-guru-modal').classList.add('show');
  };

  window.ppg46EditGuruClasses=function(did){
    ensureGuruModal46();
    const t=teachers46().find(x=>String(x.did)===String(did));
    if(!t)return;

    guruModal46={mode:'edit',did:String(did),classes:[...t.classes]};
    document.getElementById('ppg46-guru-modal-title').textContent='Atur Kelas Binaan · '+t.nama;
    document.getElementById('ppg46-guru-person-fields').style.display='none';
    renderGuruClassChoices46();
    document.getElementById('ppg46-guru-modal').classList.add('show');
  };

  window.ppg46CloseGuruModal=function(){
    document.getElementById('ppg46-guru-modal')?.classList.remove('show');
  };

  window.ppg46SaveGuruModal=function(){
    if(!guruModal46.classes.length){
      toast('Pilih minimal satu Kelas Binaan.',true);
      return;
    }

    if(guruModal46.mode==='add'){
      const did=document.getElementById('ppg46-guru-person')?.value||'';
      const role=document.getElementById('ppg46-guru-role')?.value||'Guru';
      if(!did){toast('Pilih nama dewan guru.',true);return}

      const j=(Array.isArray(aJamaah)?aJamaah:[]).find(x=>String(x.did)===String(did));
      if(!j){toast('Data jamaah tidak ditemukan.',true);return}

      const rows=get46(CUSTOM_GURU_KEY,[]);
      if(!rows.some(x=>String(x.did)===String(did))){
        rows.push({
          did:String(did),kelompok_nama:j.kelompok_nama||scopeId46(),
          role,created_at:ubnbWibIso84()
        });
        set46(CUSTOM_GURU_KEY,rows);
      }

      const map=teacherClassMap46();
      map[String(did)]=[...guruModal46.classes];
      saveTeacherClassMap46(map);
    }else{
      const map=teacherClassMap46();
      map[String(guruModal46.did)]=[...guruModal46.classes];
      saveTeacherClassMap46(map);
    }

    ppg46CloseGuruModal();
    renderGuru46();
    toast('Data Dewan Guru disimpan.');
  };

  window.ppg46RemoveGuru=function(did){
    let rows=get46(CUSTOM_GURU_KEY,[]);
    const before=rows.length;
    rows=rows.filter(x=>String(x.did)!==String(did));

    if(rows.length===before){
      toast('Dewan guru dari dapukan MT/MS tidak dapat dihapus.',true);
      return;
    }

    set46(CUSTOM_GURU_KEY,rows);
    const map=teacherClassMap46();
    delete map[String(did)];
    saveTeacherClassMap46(map);
    renderGuru46();
  };

  function classChips46(classes){
    if(classes.length===CLASSES.length){
      return '<span class="ppg46-class-chip">Semua Kelas</span>';
    }
    return classes.map(k=>`<span class="ppg46-class-chip">${esc46(k)}</span>`).join('');
  }

  function renderGuru46(){
    const el=document.getElementById('ppg-page-guru');
    if(!el)return;

    const rows=teachers46();
    const customSet=new Set(get46(CUSTOM_GURU_KEY,[]).map(x=>String(x.did)));

    el.innerHTML=`
      <div class="ppg46-guru-head">
        <div>
          <div class="ppg-v33-stage-title">Dewan Guru</div>
          <div class="ppg-v33-stage-sub">Kelas Binaan dapat dipilih lebih dari satu.</div>
        </div>
        ${controller46()?'':'<button class="ppg46-start-btn" onclick="ppg46OpenAddGuru()">+ Dewan Guru</button>'}
      </div>
      <div class="ppg-panel" style="margin-top:0">
        <div style="overflow:auto">
          <table class="ppg46-guru-table">
            <thead><tr><th>Nama</th><th>Peran / Dapukan</th><th>Kelas Binaan</th><th>Aksi</th></tr></thead>
            <tbody>${rows.map(t=>`<tr>
              <td><b>${esc46(t.nama)}</b><div class="ppg-mini-note">${esc46(t.kelompok_nama||'-')}</div></td>
              <td>${esc46([...new Set(t.roles)].join(' · ')||'Guru')}</td>
              <td><div class="ppg46-class-chips">${classChips46(t.classes)}</div></td>
              <td>
                ${controller46()?'—':`<div class="ppg46-actions">
                  <button class="ppg46-mini" onclick="ppg46EditGuruClasses('${esc46(t.did)}')">Atur Kelas</button>
                  ${customSet.has(String(t.did))?`<button class="ppg46-mini danger" onclick="ppg46RemoveGuru('${esc46(t.did)}')">Hapus</button>`:''}
                </div>`}
              </td>
            </tr>`).join('')}</tbody>
          </table>
        </div>
      </div>`;
  }

  /* ---------------- Route override ---------------- */
  const priorOpen46=window.ppgOpenPage;
  window.ppgOpenPage=function(page,btn){
    if(page==='kelas'||page==='guru'){
      document.querySelectorAll('.ppg-page').forEach(x=>x.classList.remove('active'));
      document.querySelectorAll('.ppg-tab').forEach(x=>x.classList.remove('active'));
      document.getElementById('ppg-page-'+page)?.classList.add('active');
      btn?.classList.add('active');

      if(page==='kelas')renderKelas46();
      else renderGuru46();
      return;
    }
    return priorOpen46?.apply(this,arguments);
  };

  /* legacy calls from old Kelas flow now point to our page */
  window.ppg37Tab=function(mode){
    kelasMode46=mode==='history'?'history':'active';
    expanded46=null;
    renderKelas46();
  };

  window.ppg46RenderKelas=renderKelas46;
  window.ppg46RenderGuru=renderGuru46;

  setTimeout(()=>{
    if(document.getElementById('ppg-page-kelas')?.classList.contains('active'))renderKelas46();
    if(document.getElementById('ppg-page-guru')?.classList.contains('active'))renderGuru46();
  },900);
})();

/* ============================================================
   SOURCE: ubnb-v47-dynamic-class-script
   ============================================================ */
(function(){
  const CLASS_KEY='ubnb_ppg_v47_classes';
  const DRAFT_KEY='ubnb_ppg_v33_class_drafts';
  const SYMP_KEY='ubnb_ppg_v38_simpatisan';
  const SESSION_KEY='ubnb_ppg_v37_classes';
  const TEACHER_CLASS_KEY='ubnb_ppg_v46_teacher_classes';

  const DEFAULT_CLASSES=[
    'Balita',
    'Cabe Rawit Tahap A',
    'Cabe Rawit Tahap B',
    'Cabe Rawit Tahap C',
    'Pra Remaja',
    'Remaja',
    'Dewasa'
  ];

  const esc=s=>String(s??'').replace(/[&<>"']/g,m=>(
    {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]
  ));

  function get(k,d){
    try{return JSON.parse(localStorage.getItem(k)||JSON.stringify(d))}
    catch(_){return d}
  }
  function set(k,v){localStorage.setItem(k,JSON.stringify(v))}
  function classes(){
    let c=get(CLASS_KEY,null);
    if(!Array.isArray(c)||!c.length){
      c=[...DEFAULT_CLASSES];
      set(CLASS_KEY,c);
      return c;
    }
    // otomatis sisipkan Kelas C untuk existing prototype lama
    if(!c.includes('Cabe Rawit Tahap C')){
      const bi=c.indexOf('Cabe Rawit Tahap B');
      c.splice(bi>=0?bi+1:c.length,0,'Cabe Rawit Tahap C');
      set(CLASS_KEY,c);
    }
    return c;
  }

  function scope(){
    try{return JSON.parse(sessionStorage.getItem('ubnb_ppg_v34_scope')||'null')}
    catch(_){return null}
  }
  function controller(){return scope()?.type==='controller'}
  function scopeId(){return controller()?'DESA':(scope()?.kelompok||'')}

  function allStudentClassesInUse(){
    const used=new Set();
    const d=get(DRAFT_KEY,{});
    Object.values(d).forEach(v=>v&&used.add(v));

    (Array.isArray(aJamaah)?aJamaah:[]).forEach(j=>{
      if(j.kelas_kbm)used.add(j.kelas_kbm);
      if(j.kelas_usia)used.add(j.kelas_usia);
    });

    get(SYMP_KEY,[]).forEach(x=>x.kelas&&used.add(x.kelas));
    get(SESSION_KEY,[]).forEach(s=>s.className&&used.add(s.className));

    const tc=get(TEACHER_CLASS_KEY,{});
    Object.values(tc).flat().forEach(v=>v&&used.add(v));
    return used;
  }

  function ensureClassModal(){
    if(document.getElementById('ppg47-class-modal'))return;

    document.body.insertAdjacentHTML('beforeend',`
      <div id="ppg47-class-modal" class="ppg46-modal">
        <div class="ppg46-modal-card">
          <div class="ppg46-modal-head">
            <b>Kelola Kelas KBM</b>
            <button class="ppg46-modal-close" onclick="ppg47CloseClassManager()">✕</button>
          </div>
          <div class="ppg46-modal-body">
            <div class="ppg-mini-note" style="margin-bottom:8px">
              Daftar ini dipakai untuk Setup Kelas, Dewan Guru, dan Mulai Kelas.
            </div>
            <div id="ppg47-class-list" class="ppg47-class-list"></div>
            <div class="ppg47-add-row">
              <input id="ppg47-new-class" placeholder="Nama kelas baru">
              <button class="ppg46-primary" onclick="ppg47AddClass()">+ Tambah Kelas</button>
            </div>
          </div>
        </div>
      </div>`);
  }

  function renderClassManager(){
    ensureClassModal();
    const used=allStudentClassesInUse();
    const list=document.getElementById('ppg47-class-list');
    const c=classes();

    list.innerHTML=c.map((k,i)=>`
      <div class="ppg47-class-row">
        <div class="ppg47-order">${i+1}</div>
        <div>
          <b>${esc(k)}</b>
          <div class="meta">${used.has(k)?'Sedang digunakan':'Belum digunakan'}</div>
        </div>
        <button class="ppg47-delete" ${used.has(k)?'disabled':''}
          onclick="ppg47DeleteClass('${esc(k)}')">Hapus</button>
      </div>
    `).join('');
  }

  window.ppg47OpenClassManager=function(){
    if(controller())return;
    renderClassManager();
    document.getElementById('ppg47-class-modal').classList.add('show');
    setTimeout(()=>document.getElementById('ppg47-new-class')?.focus(),40);
  };

  window.ppg47CloseClassManager=function(){
    document.getElementById('ppg47-class-modal')?.classList.remove('show');
  };

  window.ppg47AddClass=function(){
    const inp=document.getElementById('ppg47-new-class');
    const name=(inp?.value||'').trim().replace(/\s+/g,' ');
    if(!name){toast('Nama kelas belum diisi.',true);return}

    const c=classes();
    if(c.some(x=>x.toLowerCase()===name.toLowerCase())){
      toast('Nama kelas sudah ada.',true);
      return;
    }
    c.push(name);
    set(CLASS_KEY,c);
    inp.value='';
    renderClassManager();
    refreshAllClassUi();
    toast('Kelas baru ditambahkan.');
  };

  window.ppg47DeleteClass=function(name){
    const used=allStudentClassesInUse();
    if(used.has(name)){
      toast('Kelas masih digunakan dan tidak dapat dihapus.',true);
      return;
    }
    set(CLASS_KEY,classes().filter(x=>x!==name));
    renderClassManager();
    refreshAllClassUi();
  };

  function refreshAllClassUi(){
    // Setup
    if(document.getElementById('ppg-page-setup')?.classList.contains('active')){
      window.ppg47RenderSetup?.();
    }
    // Kelas
    if(document.getElementById('ppg-page-kelas')?.classList.contains('active')){
      window.ppg47RenderKelas?.();
    }
    // Guru
    if(document.getElementById('ppg-page-guru')?.classList.contains('active')){
      window.ppg47RenderGuru?.();
    }
  }

  // ---------- Setup Kelas dynamic ----------
  function studentRows(){
    const d=get(DRAFT_KEY,{});
    let rows=(Array.isArray(aJamaah)?aJamaah:[])
      .filter(j=>j.status_nikah==='Belum Menikah')
      .filter(j=>j.status_sambung==='Tetap');
    if(scope()?.type==='kelompok')rows=rows.filter(j=>j.kelompok_nama===scope().kelompok);

    const jamaah=rows.map(j=>({
      did:String(j.did),
      nama:j.nama||'-',
      nama_kk:j.nama_kk||'-',
      umur:(()=>{try{return umurFromTgl(j.tgl_lahir)}catch(_){return null}})(),
      kelas:d[String(j.did)]||j.kelas_kbm||j.kelas_usia||'Belum Ditentukan',
      jenis:'jamaah'
    }));

    let simp=get(SYMP_KEY,[]);
    if(scope()?.type==='kelompok')simp=simp.filter(x=>x.scope===scopeId());

    const sx=simp.map(x=>({
      did:String(x.id),nama:x.nama||'-',nama_kk:x.nama_kk||'-',
      umur:x.umur??null,kelas:x.kelas||'Belum Ditentukan',jenis:'simpatisan'
    }));

    return [...jamaah,...sx];
  }

  function renderSetup(){
    const el=document.getElementById('ppg-page-setup');
    if(!el)return;
    if(controller()){
      el.innerHTML='<div class="ppg-controller-note">Setup Kelas dilakukan pada scope kelompok.</div>';
      return;
    }

    const rows=studentRows();
    const collapsed=get('ubnb_ppg_v38_setup_collapsed',{});
    const groups=[...classes(),'Belum Ditentukan'];

    el.innerHTML=`
      <div class="ppg-v33-stage">
        <div>
          <div class="ppg-v33-stage-title">Setup Kelas · ${esc(scope()?.kelompok||'')}</div>
          <div class="ppg-v33-stage-sub">Kelas dapat ditambah melalui Kelola Kelas.</div>
        </div>
        <span class="ppg-v33-live">● ${rows.length} murid</span>
      </div>

      <div class="ppg38-setup-toolbar">
        <div class="ppg47-class-tools">
          <button class="ppg38-add-btn" onclick="ppg38OpenSimp()">+ Tambah Simpatisan</button>
          <button class="ppg47-manage-btn" onclick="ppg47OpenClassManager()">⚙ Kelola Kelas</button>
        </div>
        <div class="ppg38-toolbar-actions">
          <button class="ppg38-lite-btn" onclick="ppg38CollapseAll()">Collapse Semua</button>
          <button class="ppg38-lite-btn" onclick="ppg38ExpandAll()">Expand Semua</button>
        </div>
      </div>

      ${groups.map(k=>{
        const list=rows.filter(x=>x.kelas===k).sort((a,b)=>String(a.nama).localeCompare(String(b.nama),'id'));
        if(!list.length)return '';
        const simp=list.filter(x=>x.jenis==='simpatisan').length;
        const closed=!!collapsed[k];

        return `<section class="ppg39-group">
          <div class="ppg39-sticky-stack">
            <button class="ppg39-group-head" onclick="ppg38ToggleGroup('${esc(k)}')">
              <span class="left"><span class="chev">${closed?'▸':'▾'}</span><span class="name">${esc(k)}</span></span>
              <span class="count">${list.length} murid${simp?` · ${simp} simpatisan`:''}</span>
            </button>
            ${closed?'':`<div class="ppg39-column-head"><div>Murid</div><div>Ubah Kelas</div></div>`}
          </div>
          <div class="ppg39-body ${closed?'collapsed':''}">
            <table class="ppg39-table">
              <colgroup><col><col></colgroup>
              <tbody>${list.map((x,i)=>`<tr>
                <td>
                  <div class="ppg38-student-main">
                    <div class="ppg38-student-line">
                      <span class="ppg38-row-no">${i+1}</span>
                      <span class="ppg38-student-name">${esc(x.nama)}</span>
                      ${x.jenis==='simpatisan'?'<span class="ppg38-symp-badge">Simpatisan</span>':''}
                    </div>
                    <div class="ppg38-student-meta">KK/Wali: ${esc(x.nama_kk||'-')} · Umur: ${x.umur??'—'} th</div>
                  </div>
                </td>
                <td>
                  <select class="ppg38-class-select" onchange="ppg38ChangeClass('${esc(x.did)}','${esc(x.jenis)}',this.value)">
                    ${[...classes(),'Belum Ditentukan'].map(c=>`<option value="${esc(c)}" ${x.kelas===c?'selected':''}>${esc(c)}</option>`).join('')}
                  </select>
                </td>
              </tr>`).join('')}</tbody>
            </table>
          </div>
        </section>`;
      }).join('')}`;

    // re-apply search if present
    setTimeout(()=>window.ppg45ApplySearch?.(),0);
    setTimeout(()=>window.ppg41UpdateSticky?.(),0);
  }

  // ---------- Dewan Guru dynamic ----------
  function teachers(){
    // use existing v46 state but reconstruct here so classes are dynamic
    const map=new Map(),s=scope();
    const isRole=label=>{
      const z=' '+String(label||'').toLowerCase().replace(/[._/-]+/g,' ').replace(/\s+/g,' ')+' ';
      return /(^|\s)mt(\s|$)/.test(z)||/(^|\s)ms(\s|$)/.test(z);
    };

    (Array.isArray(aPengurus)?aPengurus:[]).filter(p=>p&&p.aktif!==false&&isRole(p.dapukan)).forEach(p=>{
      if(s?.type==='kelompok'&&(p.level!=='kelompok'||p.kelompok_nama!==s.kelompok))return;
      const j=typeof findJamaahAny==='function'?findJamaahAny(p.did):(Array.isArray(aJamaah)?aJamaah:[]).find(x=>String(x.did)===String(p.did));
      if(!j)return;
      const key=String(p.did);
      if(!map.has(key))map.set(key,{did:key,nama:j.nama||'-',kelompok_nama:j.kelompok_nama||p.kelompok_nama||'-',roles:[],origin:'MT/MS'});
      if(p.dapukan&&!map.get(key).roles.includes(p.dapukan))map.get(key).roles.push(p.dapukan);
    });

    get(CUSTOM_GURU_KEY,[]).forEach(c=>{
      if(s?.type==='kelompok'&&c.kelompok_nama!==s.kelompok)return;
      const j=(Array.isArray(aJamaah)?aJamaah:[]).find(x=>String(x.did)===String(c.did));
      if(!j)return;
      const key=String(c.did);
      if(!map.has(key))map.set(key,{did:key,nama:j.nama||'-',kelompok_nama:j.kelompok_nama||'-',roles:[c.role||'Guru'],origin:'Tambahan PPG'});
    });

    const multi=get(TEACHER_CLASS_KEY,{});
    const old=get(OLD_ASSIGN_KEY,{});
    return [...map.values()].map(t=>{
      let cs=Array.isArray(multi[t.did])?multi[t.did].filter(x=>classes().includes(x)):null;
      if(!cs){
        const ov=old[t.did];
        if(ov==='Semua Kelas'||!ov)cs=[...classes()];
        else if(classes().includes(ov))cs=[ov];
        else cs=[...classes()];
      }
      return {...t,classes:cs};
    }).sort((a,b)=>String(a.nama).localeCompare(String(b.nama),'id'));
  }

  function classChips(cs){
    if(cs.length===classes().length)return '<span class="ppg46-class-chip">Semua Kelas</span>';
    return cs.map(k=>`<span class="ppg46-class-chip">${esc(k)}</span>`).join('');
  }

  function renderGuru(){
    const el=document.getElementById('ppg-page-guru');
    if(!el)return;
    const rows=teachers();
    const customSet=new Set(get(CUSTOM_GURU_KEY,[]).map(x=>String(x.did)));

    el.innerHTML=`
      <div class="ppg46-guru-head">
        <div>
          <div class="ppg-v33-stage-title">Dewan Guru</div>
          <div class="ppg-v33-stage-sub">Kelas Binaan dapat dipilih lebih dari satu.</div>
        </div>
        ${controller()?'':'<button class="ppg46-start-btn" onclick="ppg46OpenAddGuru()">+ Dewan Guru</button>'}
      </div>
      <div class="ppg-panel" style="margin-top:0">
        <div style="overflow:auto"><table class="ppg46-guru-table">
          <thead><tr><th>Nama</th><th>Peran / Dapukan</th><th>Kelas Binaan</th><th>Aksi</th></tr></thead>
          <tbody>${rows.map(t=>`<tr>
            <td><b>${esc(t.nama)}</b><div class="ppg-mini-note">${esc(t.kelompok_nama||'-')}</div></td>
            <td>${esc([...new Set(t.roles)].join(' · ')||'Guru')}</td>
            <td><div class="ppg46-class-chips">${classChips(t.classes)}</div></td>
            <td>${controller()?'—':`<button class="ppg46-mini" onclick="ppg47EditGuru('${esc(t.did)}')">Atur Kelas</button>
              ${customSet.has(String(t.did))?`<button class="ppg46-mini danger" onclick="ppg46RemoveGuru('${esc(t.did)}')">Hapus</button>`:''}`}</td>
          </tr>`).join('')}</tbody>
        </table></div>
      </div>`;
  }

  window.ppg47EditGuru=function(did){
    // leverage existing v46 modal, but rebuild class buttons dynamically after opening
    window.ppg46EditGuruClasses?.(did);
    setTimeout(()=>{
      const t=teachers().find(x=>String(x.did)===String(did));
      if(!t)return;
      // direct replace class choices to include new dynamic classes
      const box=document.getElementById('ppg46-guru-classes');
      if(!box)return;
      window.__ppg47EditingDid=String(did);
      window.__ppg47EditingClasses=[...t.classes];
      box.innerHTML=classes().map(k=>`
        <button type="button" class="ppg46-class-btn ${t.classes.includes(k)?'selected':''}"
          onclick="ppg47ToggleEditClass('${esc(k)}',this)">${esc(k)}</button>`).join('');
    },0);
  };

  window.ppg47ToggleEditClass=function(k,btn){
    let arr=window.__ppg47EditingClasses||[];
    const i=arr.indexOf(k);
    if(i>=0)arr.splice(i,1); else arr.push(k);
    window.__ppg47EditingClasses=arr;
    btn?.classList.toggle('selected',arr.includes(k));
    // sync v46 internal state by clicking is not possible; override save below
  };

  const oldSaveGuru=window.ppg46SaveGuruModal;
  window.ppg46SaveGuruModal=function(){
    if(window.__ppg47EditingDid){
      const arr=window.__ppg47EditingClasses||[];
      if(!arr.length){toast('Pilih minimal satu Kelas Binaan.',true);return}
      const map=get(TEACHER_CLASS_KEY,{});
      map[String(window.__ppg47EditingDid)]=[...arr];
      set(TEACHER_CLASS_KEY,map);
      window.__ppg47EditingDid=null;
      window.__ppg47EditingClasses=null;
      window.ppg46CloseGuruModal?.();
      renderGuru();
      toast('Kelas binaan disimpan.');
      return;
    }
    return oldSaveGuru?.apply(this,arguments);
  };

  // Patch Add Guru modal class choices to dynamic list
  const oldOpenAdd=window.ppg46OpenAddGuru;
  window.ppg46OpenAddGuru=function(){
    oldOpenAdd?.apply(this,arguments);
    setTimeout(()=>{
      const box=document.getElementById('ppg46-guru-classes');
      if(!box)return;
      // v46 add-state uses its own lexical state; easiest is show all existing + new C,
      // add modal already handles click via ppg46ToggleGuruClass.
      box.innerHTML=classes().map(k=>`
        <button type="button" class="ppg46-class-btn"
          onclick="ppg46ToggleGuruClass('${esc(k)}')">${esc(k)}</button>`).join('');
    },0);
  };

  // ---------- Kelas Start modal dynamic ----------
  const oldOpenStart=window.ppg46OpenStart;
  window.ppg46OpenStart=function(){
    oldOpenStart?.apply(this,arguments);
    setTimeout(()=>{
      // teacher change will be handled by our override below
      renderStartClasses();
    },0);
  };

  function renderStartClasses(){
    const box=document.getElementById('ppg46-start-classes');
    if(!box)return;
    const did=document.getElementById('ppg46-start-teacher')?.value||'';
    const t=teachers().find(x=>String(x.did)===String(did));
    const cs=t?.classes||[];
    window.__ppg47StartSelected='';
    box.innerHTML=cs.length?cs.map(k=>`
      <button type="button" class="ppg46-class-btn" onclick="ppg47SelectStart('${esc(k)}',this)">${esc(k)}</button>
    `).join(''):'<div class="ppg-empty" style="grid-column:1/-1">Guru belum memiliki Kelas Binaan.</div>';
  }

  window.ppg46TeacherChanged=function(){renderStartClasses()}

  window.ppg47SelectStart=function(k,btn){
    window.__ppg47StartSelected=k;
    document.querySelectorAll('#ppg46-start-classes .ppg46-class-btn').forEach(x=>x.classList.remove('selected'));
    btn?.classList.add('selected');
  };

  window.ppg46StartClass=async function(){
    const teacherDid=document.getElementById('ppg46-start-teacher')?.value||'';
    const date=document.getElementById('ppg46-start-date')?.value||ubnbWibIso84().slice(0,10);
    const className=window.__ppg47StartSelected||'';

    if(!teacherDid){toast('Pilih guru terlebih dahulu.',true);return}
    if(!className){toast('Pilih satu kelas binaan.',true);return}

    const t=teachers().find(x=>String(x.did)===String(teacherDid));
    if(!t||!t.classes.includes(className)){toast('Kelas bukan binaan guru tersebut.',true);return}

    const all=get(SESSION_KEY,[]);
    if(all.some(s=>s.scope===scopeId()&&s.date===date&&s.className===className&&s.status==='active')){
      toast('Kelas ini sudah aktif hari ini.',true);return
    }

    const students=studentRows().filter(x=>x.kelas===className).map(x=>({
      did:x.did,nama:x.nama,status:'Belum Hadir',kind:x.jenis,nama_kk:x.nama_kk
    }));

    const s={
      id:'K'+Date.now(),scope:scopeId(),date,className,
      teacherDid:String(t.did),teacherName:t.nama,
      startedAt:ubnbWibIso84(),startedBy:CU?.nama||CU?.username||'-',
      status:'active',
      teacherAttendance:[{did:String(t.did),nama:t.nama,status:'Hadir',source:'selected_teacher'}],
      students,generalMaterials:[],studentMaterials:{},generalNote:'',studentNotes:{}
    };
    all.push(s);set(SESSION_KEY,all);

    // GPS logger from v46 can still run through existing function only if called; create compatible log
    try{
      if(navigator.geolocation){
        navigator.geolocation.getCurrentPosition(p=>{
          const logs=get('ubnb_ppg_v37_logger',[]);
          logs.push({at:ubnbWibIso84(),type:'MULAI_KELAS',account:CU?.nama||CU?.username||'-',
            scope:scopeId(),sessionId:s.id,className,teacherName:t.nama,
            gps:{lat:p.coords.latitude,lng:p.coords.longitude,accuracy:p.coords.accuracy}});
          set('ubnb_ppg_v37_logger',logs);
        },()=>{}, {timeout:3000,maximumAge:60000});
      }
    }catch(_){}

    window.ppg46CloseStart?.();
    window.__ppg47StartSelected='';
    window.ppg46KelasMode?.('active');
    toast('Kelas aktif.');
  };

  // ---------- Router override ----------
  const oldOpen=window.ppgOpenPage;
  window.ppgOpenPage=function(page,btn){
    if(page==='setup'||page==='guru'){
      document.querySelectorAll('.ppg-page').forEach(x=>x.classList.remove('active'));
      document.querySelectorAll('.ppg-tab').forEach(x=>x.classList.remove('active'));
      document.getElementById('ppg-page-'+page)?.classList.add('active');
      btn?.classList.add('active');
      if(page==='setup')renderSetup();
      else renderGuru();
      return;
    }
    return oldOpen?.apply(this,arguments);
  };

  window.ppg47RenderSetup=renderSetup;
  window.ppg47RenderGuru=renderGuru;
  window.ppg47Classes=classes;

  // Add Kelola Kelas button if Setup already open
  setTimeout(()=>{
    if(document.getElementById('ppg-page-setup')?.classList.contains('active'))renderSetup();
    if(document.getElementById('ppg-page-guru')?.classList.contains('active'))renderGuru();
  },900);
})();

/* ============================================================
   SOURCE: ubnb-v48-simpatisan-dynamic-class-fix
   ============================================================ */
(function(){
  const oldOpenSimp48=window.ppg38OpenSimp;

  function dynamicClasses48(){
    try{
      const rows=typeof window.ppg47Classes==='function' ? window.ppg47Classes() : [];
      return Array.isArray(rows)?rows:[];
    }catch(_e){
      return [];
    }
  }

  function rebuildSimpClassOptions48(defaultClass){
    const sel=document.getElementById('ppg38-symp-class');
    if(!sel)return;

    const classes=dynamicClasses48();
    const prev=defaultClass || sel.value || '';

    sel.innerHTML=classes.map(k=>{
      const safe=String(k)
        .replace(/&/g,'&amp;')
        .replace(/</g,'&lt;')
        .replace(/>/g,'&gt;')
        .replace(/"/g,'&quot;')
        .replace(/'/g,'&#39;');
      return `<option value="${safe}">${safe}</option>`;
    }).join('');

    if(prev && classes.includes(prev)){
      sel.value=prev;
    }else if(classes.length){
      sel.value=classes[0];
    }
  }

  window.ppg38OpenSimp=function(defaultClass){
    // Jalankan fungsi lama untuk memastikan modal/form sudah dibuat.
    if(typeof oldOpenSimp48==='function'){
      oldOpenSimp48.apply(this,arguments);
    }

    // Setelah modal ada, rebuild daftar kelas dari daftar dinamis v47.
    rebuildSimpClassOptions48(defaultClass);

    // Pastikan nilai default tetap diterapkan setelah rebuild.
    const sel=document.getElementById('ppg38-symp-class');
    const classes=dynamicClasses48();
    if(defaultClass && classes.includes(defaultClass) && sel){
      sel.value=defaultClass;
    }
  };

  // Jika Kelola Kelas sedang menambah/menghapus kelas saat modal simpatisan masih terbuka,
  // daftar dropdown ikut diperbarui pada pembukaan berikutnya.
  const oldAddClass48=window.ppg47AddClass;
  if(typeof oldAddClass48==='function'){
    window.ppg47AddClass=function(){
      const r=oldAddClass48.apply(this,arguments);
      if(document.getElementById('ppg38-symp-modal')?.classList.contains('show')){
        rebuildSimpClassOptions48();
      }
      return r;
    };
  }

  const oldDeleteClass48=window.ppg47DeleteClass;
  if(typeof oldDeleteClass48==='function'){
    window.ppg47DeleteClass=function(name){
      const r=oldDeleteClass48.apply(this,arguments);
      if(document.getElementById('ppg38-symp-modal')?.classList.contains('show')){
        rebuildSimpClassOptions48();
      }
      return r;
    };
  }

  window.ppg48RefreshSimpatisanClasses=rebuildSimpClassOptions48;
})();

/* ============================================================
   SOURCE: ubnb-v49-dynamic-class-live-fix
   ============================================================ */
(function(){
  const DRAFT_KEY='ubnb_ppg_v33_class_drafts';
  const SYMP_KEY='ubnb_ppg_v38_simpatisan';
  const COLLAPSE_KEY='ubnb_ppg_v38_setup_collapsed';

  function get49(k,d){
    try{return JSON.parse(localStorage.getItem(k)||JSON.stringify(d))}
    catch(_e){return d}
  }
  function set49(k,v){
    localStorage.setItem(k,JSON.stringify(v));
  }

  function dynamicClasses49(){
    try{
      const rows=typeof window.ppg47Classes==='function' ? window.ppg47Classes() : [];
      return Array.isArray(rows)?rows:[];
    }catch(_e){
      return [];
    }
  }

  function renderDynamicSetup49(){
    if(typeof window.ppg47RenderSetup==='function'){
      window.ppg47RenderSetup();
      return;
    }
    // fallback only
    if(typeof window.ppg39RenderSetup==='function'){
      window.ppg39RenderSetup();
    }
  }

  /*
   * FIX UTAMA:
   * v38 masih memanggil closure renderSetup() lama sesudah Ubah Kelas.
   * Closure itu masih memakai daftar kelas hardcode, sehingga kelas C/custom
   * hilang sampai refresh browser.
   *
   * Semua aksi mutasi Setup Kelas di bawah ini sekarang selalu render memakai
   * renderer dinamis v47.
   */
  window.ppg38ChangeClass=function(id,kind,val){
    if(kind==='simpatisan'){
      const rows=get49(SYMP_KEY,[]);
      const x=rows.find(r=>String(r.id)===String(id));
      if(x)x.kelas=val;
      set49(SYMP_KEY,rows);
    }else{
      const d=get49(DRAFT_KEY,{});
      if(val==='Belum Ditentukan')delete d[String(id)];
      else d[String(id)]=val;
      set49(DRAFT_KEY,d);
    }

    renderDynamicSetup49();
  };

  window.ppg38ToggleGroup=function(k){
    const c=get49(COLLAPSE_KEY,{});
    c[k]=!c[k];
    set49(COLLAPSE_KEY,c);
    renderDynamicSetup49();
  };

  window.ppg38CollapseAll=function(){
    const c={};
    [...dynamicClasses49(),'Belum Ditentukan'].forEach(k=>c[k]=true);
    set49(COLLAPSE_KEY,c);
    renderDynamicSetup49();
  };

  window.ppg38ExpandAll=function(){
    set49(COLLAPSE_KEY,{});
    renderDynamicSetup49();
  };

  window.ppg38SaveSimp=function(){
    const nama=(document.getElementById('ppg38-symp-name')?.value||'').trim();
    const nama_kk=(document.getElementById('ppg38-symp-kk')?.value||'').trim();
    const umurRaw=document.getElementById('ppg38-symp-age')?.value;
    const kelas=document.getElementById('ppg38-symp-class')?.value||'';

    if(!nama||!kelas){
      toast('Nama dan kelas wajib diisi.',true);
      return;
    }

    const classes=dynamicClasses49();
    if(!classes.includes(kelas)){
      toast('Kelas tidak ditemukan. Buka kembali form dan pilih kelas yang tersedia.',true);
      return;
    }

    let scopeValue='';
    try{
      const sc=JSON.parse(sessionStorage.getItem('ubnb_ppg_v34_scope')||'null');
      scopeValue=sc?.type==='kelompok'?(sc.kelompok||''):'DESA';
    }catch(_e){}

    const umur=umurRaw===''?null:Number(umurRaw);
    const rows=get49(SYMP_KEY,[]);
    rows.push({
      id:'SYM-'+Date.now(),
      nama,
      nama_kk:nama_kk||'-',
      umur:Number.isFinite(umur)?umur:null,
      kelas,
      scope:scopeValue,
      created_at:ubnbWibIso84(),
      created_by:CU?.nama||CU?.username||'-'
    });

    set49(SYMP_KEY,rows);
    window.ppg38CloseSimp?.();
    renderDynamicSetup49();
    toast('Simpatisan ditambahkan ke kelas.');
  };

  window.ppg38DeleteSimp=function(id){
    const rows=get49(SYMP_KEY,[]).filter(x=>String(x.id)!==String(id));
    set49(SYMP_KEY,rows);
    renderDynamicSetup49();
    toast('Simpatisan dihapus dari prototype.');
  };

  /*
   * Saat daftar kelas berubah melalui Kelola Kelas dan Setup sedang aktif,
   * render langsung dari sumber dinamis; tidak menunggu refresh browser.
   */
  const oldAddClass49=window.ppg47AddClass;
  if(typeof oldAddClass49==='function'){
    window.ppg47AddClass=function(){
      const before=JSON.stringify(dynamicClasses49());
      const r=oldAddClass49.apply(this,arguments);
      const after=JSON.stringify(dynamicClasses49());

      if(before!==after && document.getElementById('ppg-page-setup')?.classList.contains('active')){
        renderDynamicSetup49();
      }
      window.ppg48RefreshSimpatisanClasses?.();
      return r;
    };
  }

  const oldDeleteClass49=window.ppg47DeleteClass;
  if(typeof oldDeleteClass49==='function'){
    window.ppg47DeleteClass=function(name){
      const before=JSON.stringify(dynamicClasses49());
      const r=oldDeleteClass49.apply(this,arguments);
      const after=JSON.stringify(dynamicClasses49());

      if(before!==after && document.getElementById('ppg-page-setup')?.classList.contains('active')){
        renderDynamicSetup49();
      }
      window.ppg48RefreshSimpatisanClasses?.();
      return r;
    };
  }

  // helper diagnostic
  window.ppg49DynamicClassLiveFix={
    classes:dynamicClasses49,
    rerender:renderDynamicSetup49
  };
})();

/* ============================================================
   SOURCE: ubnb-v52-kbm-guru-welcome-script
   ============================================================ */
(function(){
  const SESSION_KEY='ubnb_ppg_v37_classes';
  const LOGGER_KEY='ubnb_ppg_v37_logger';
  const CUSTOM_GURU_KEY='ubnb_ppg_v35_custom_teachers';
  const MULTI_CLASS_KEY='ubnb_ppg_v46_teacher_classes';
  const OLD_ASSIGN_KEY='ubnb_ppg_v34_teacher_assign';
  const DRAFT_KEY='ubnb_ppg_v33_class_drafts';
  const SYMP_KEY='ubnb_ppg_v38_simpatisan';

  let mode52='active';
  let history52='daily';
  let expanded52=null;
  let start52={selected:'',otherOpen:false};
  let guru52={mode:'add',did:null,classes:[]};

  const esc=s=>String(s??'').replace(/[&<>"']/g,m=>(
    {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]
  ));
  const norm=s=>String(s||'').toLowerCase().trim();

  function get(k,d){
    try{return JSON.parse(localStorage.getItem(k)||JSON.stringify(d))}
    catch(_){return d}
  }
  function set(k,v){localStorage.setItem(k,JSON.stringify(v))}
  function scope(){
    try{return JSON.parse(sessionStorage.getItem('ubnb_ppg_v34_scope')||'null')}
    catch(_){return null}
  }
  function controller(){return scope()?.type==='controller'}
  function scopeId(){return controller()?'DESA':(scope()?.kelompok||'')}

  function classes(){
    try{
      const x=typeof window.ppg47Classes==='function'?window.ppg47Classes():[];
      if(Array.isArray(x)&&x.length)return x;
    }catch(_){}
    return ['Balita','Cabe Rawit Tahap A','Cabe Rawit Tahap B','Cabe Rawit Tahap C','Pra Remaja','Remaja','Dewasa'];
  }

  function sessions(){return get(SESSION_KEY,[])}
  function saveSessions(v){set(SESSION_KEY,v)}

  function isTeacherRole(label){
    const z=' '+String(label||'').toLowerCase().replace(/[._/-]+/g,' ').replace(/\s+/g,' ')+' ';
    return /(^|\s)mt(\s|$)/.test(z)||/(^|\s)ms(\s|$)/.test(z);
  }

  function teacherClasses(did){
    const key=String(did);
    const cls=classes();
    const multi=get(MULTI_CLASS_KEY,{});
    if(Array.isArray(multi[key])){
      return multi[key].filter(x=>cls.includes(x));
    }

    const old=get(OLD_ASSIGN_KEY,{});
    const ov=old[key];
    if(ov==='Semua Kelas')return [...cls];
    if(ov&&cls.includes(ov))return [ov];

    // Tidak otomatis semua kelas. Jika belum pernah diatur berarti belum punya binaan.
    return [];
  }

  function teachers(){
    const map=new Map(),sc=scope();

    (Array.isArray(aPengurus)?aPengurus:[])
      .filter(p=>p&&p.aktif!==false&&isTeacherRole(p.dapukan))
      .forEach(p=>{
        if(sc?.type==='kelompok'&&(p.level!=='kelompok'||p.kelompok_nama!==sc.kelompok))return;
        const j=typeof findJamaahAny==='function'
          ?findJamaahAny(p.did)
          :(Array.isArray(aJamaah)?aJamaah:[]).find(x=>String(x.did)===String(p.did));
        if(!j)return;
        const key=String(p.did);
        if(!map.has(key))map.set(key,{
          did:key,nama:j.nama||'-',kelompok_nama:j.kelompok_nama||p.kelompok_nama||'-',
          roles:[],origin:'MT/MS'
        });
        if(p.dapukan&&!map.get(key).roles.includes(p.dapukan))map.get(key).roles.push(p.dapukan);
      });

    get(CUSTOM_GURU_KEY,[]).forEach(c=>{
      if(sc?.type==='kelompok'&&c.kelompok_nama!==sc.kelompok)return;
      const j=(Array.isArray(aJamaah)?aJamaah:[]).find(x=>String(x.did)===String(c.did));
      if(!j)return;
      const key=String(c.did);
      if(!map.has(key))map.set(key,{
        did:key,nama:j.nama||'-',kelompok_nama:j.kelompok_nama||'-',
        roles:[c.role||'Guru'],origin:'Tambahan PPG'
      });
      else if(c.role&&!map.get(key).roles.includes(c.role))map.get(key).roles.push(c.role);
    });

    return [...map.values()]
      .map(t=>({...t,classes:teacherClasses(t.did)}))
      .sort((a,b)=>String(a.nama).localeCompare(String(b.nama),'id'));
  }

  function studentRows(){
    const drafts=get(DRAFT_KEY,{});
    let rows=(Array.isArray(aJamaah)?aJamaah:[])
      .filter(j=>j.status_nikah==='Belum Menikah')
      .filter(j=>j.status_sambung==='Tetap');

    if(scope()?.type==='kelompok')rows=rows.filter(j=>j.kelompok_nama===scope().kelompok);

    const jamaah=rows.map(j=>({
      did:String(j.did),nama:j.nama||'-',nama_kk:j.nama_kk||'-',
      kelas:drafts[String(j.did)]||j.kelas_kbm||j.kelas_usia||'Belum Ditentukan',
      kind:'jamaah'
    }));

    let simp=get(SYMP_KEY,[]);
    if(scope()?.type==='kelompok')simp=simp.filter(x=>x.scope===scopeId());

    return [...jamaah,...simp.map(x=>({
      did:String(x.id),nama:x.nama||'-',nama_kk:x.nama_kk||'-',
      kelas:x.kelas||'Belum Ditentukan',kind:'simpatisan'
    }))];
  }

  function rosterForClass(k){
    return studentRows()
      .filter(x=>x.kelas===k)
      .sort((a,b)=>String(a.nama).localeCompare(String(b.nama),'id'))
      .map(x=>({
        did:x.did,nama:x.nama,status:'Belum Hadir',
        kind:x.kind,nama_kk:x.nama_kk
      }));
  }

  function today(){
    try{
      return new Intl.DateTimeFormat('en-CA',{
        timeZone:'Asia/Jakarta',year:'numeric',month:'2-digit',day:'2-digit'
      }).format(new Date())
    }catch(_){return ubnbWibIso84().slice(0,10)}
  }

  function visibleSessions(){
    let rows=sessions();
    if(!controller())rows=rows.filter(s=>s.scope===scopeId());
    return rows;
  }

  function attendance(s){
    const total=(s.students||[]).length;
    const hadir=(s.students||[]).filter(x=>x.status==='Hadir').length;
    return {total,hadir,pct:total?Math.round(hadir/total*100):0};
  }

  async function gpsSilent(){
    if(!navigator.geolocation)return null;
    return await new Promise(resolve=>{
      let done=false;
      const end=v=>{if(done)return;done=true;resolve(v)};
      navigator.geolocation.getCurrentPosition(
        p=>end({lat:p.coords.latitude,lng:p.coords.longitude,accuracy:p.coords.accuracy}),
        ()=>end(null),
        {enableHighAccuracy:false,timeout:3000,maximumAge:60000}
      );
      setTimeout(()=>end(null),3500);
    });
  }

  function logStart(s,gps){
    const logs=get(LOGGER_KEY,[]);
    logs.push({
      at:ubnbWibIso84(),
      type:'MULAI_KELAS',
      account:CU?.nama||CU?.username||'-',
      scope:scopeId(),
      sessionId:s.id,
      className:s.className,
      teacherName:s.teacherName,
      substitute:!!s.substituteTeacher,
      gps
    });
    set(LOGGER_KEY,logs);
  }

  /* ---------------- START KELAS ---------------- */
  function ensureStartModal(){
    if(document.getElementById('ppg52-start-modal'))return;
    document.body.insertAdjacentHTML('beforeend',`
      <div id="ppg52-start-modal" class="ppg52-modal">
        <div class="ppg52-modal-card">
          <div class="ppg52-modal-head">
            <b>Mulai Kelas</b>
            <button class="ppg52-modal-close" onclick="ppg52CloseStart()">✕</button>
          </div>
          <div class="ppg52-modal-body">
            <div class="ppg52-field">
              <label>Tanggal</label>
              <input id="ppg52-start-date" type="date" readonly>
            </div>
            <div class="ppg52-field">
              <label>Guru</label>
              <select id="ppg52-start-teacher" onchange="ppg52TeacherChanged()"></select>
            </div>
            <div class="ppg52-field">
              <label>Pilih Kelas</label>
              <div class="ppg52-class-block">
                <div class="ppg52-class-label">Kelas Binaan</div>
                <div id="ppg52-binaan-classes" class="ppg52-class-buttons"></div>
                <button id="ppg52-other-toggle" class="ppg52-other-toggle" type="button" onclick="ppg52ToggleOther()">Mengajar Kelas Lain</button>
                <div id="ppg52-other-wrap" class="ppg52-other-wrap">
                  <div class="ppg52-class-label">Kelas Lain</div>
                  <div id="ppg52-other-classes" class="ppg52-class-buttons"></div>
                </div>
              </div>
              <div class="ppg52-help">Satu kali Mulai Kelas hanya membuka satu kelas. Guru dapat membuka kelas lain secara terpisah.</div>
            </div>
            <div class="ppg52-modal-actions">
              <button class="ppg52-secondary" onclick="ppg52CloseStart()">Batal</button>
              <button class="ppg52-primary" onclick="ppg52StartClass()">Mulai Kelas</button>
            </div>
          </div>
        </div>
      </div>`);
  }

  function defaultTeacherDid(ts){
    const did=String(CU?.did||CU?.id||'');
    if(did&&ts.some(t=>String(t.did)===did))return did;

    const loginName=norm(CU?.nama||CU?.username||'');
    return ts.find(t=>norm(t.nama)===loginName)?.did||'';
  }

  window.ppg52OpenStart=function(){
    if(controller())return;
    ensureStartModal();
    const ts=teachers();
    const def=defaultTeacherDid(ts);

    const sel=document.getElementById('ppg52-start-teacher');
    sel.innerHTML='<option value="">Pilih guru...</option>'+
      ts.map(t=>`<option value="${esc(t.did)}" ${String(t.did)===String(def)?'selected':''}>${esc(t.nama)}</option>`).join('');

    document.getElementById('ppg52-start-date').value=today();
    start52={selected:'',otherOpen:false};
    renderStartClasses();
    document.getElementById('ppg52-start-modal').classList.add('show');
  };

  window.ppg52CloseStart=function(){
    document.getElementById('ppg52-start-modal')?.classList.remove('show');
  };

  window.ppg52TeacherChanged=function(){
    start52={selected:'',otherOpen:false};
    renderStartClasses();
  };

  window.ppg52ToggleOther=function(){
    start52.otherOpen=!start52.otherOpen;
    renderStartClasses();
  };

  window.ppg52SelectClass=function(k){
    start52.selected=k;
    renderStartClasses();
  };

  function classButtons(list){
    return list.map(k=>`
      <button type="button"
        class="ppg52-class-btn ${start52.selected===k?'selected':''}"
        onclick="ppg52SelectClass('${esc(k)}')">${esc(k)}</button>
    `).join('');
  }

  function renderStartClasses(){
    const did=document.getElementById('ppg52-start-teacher')?.value||'';
    const t=teachers().find(x=>String(x.did)===String(did));
    const all=classes();
    const binaan=t?.classes||[];
    const other=all.filter(k=>!binaan.includes(k));

    const binaanBox=document.getElementById('ppg52-binaan-classes');
    if(binaanBox){
      binaanBox.innerHTML=binaan.length
        ?classButtons(binaan)
        :'<div class="ppg-empty" style="grid-column:1/-1;padding:10px">Belum ada Kelas Binaan.</div>';
    }

    const toggle=document.getElementById('ppg52-other-toggle');
    if(toggle){
      toggle.style.display=other.length?'':'none';
      toggle.textContent=start52.otherOpen?'Tutup Kelas Lain':'Mengajar Kelas Lain';
    }

    const wrap=document.getElementById('ppg52-other-wrap');
    if(wrap)wrap.classList.toggle('show',!!start52.otherOpen);

    const otherBox=document.getElementById('ppg52-other-classes');
    if(otherBox)otherBox.innerHTML=classButtons(other);
  }

  window.ppg52StartClass=async function(){
    const date=document.getElementById('ppg52-start-date')?.value||today();
    const teacherDid=document.getElementById('ppg52-start-teacher')?.value||'';
    const className=start52.selected||'';

    if(!teacherDid){toast('Pilih guru terlebih dahulu.',true);return}
    if(!className){toast('Pilih satu kelas.',true);return}

    const t=teachers().find(x=>String(x.did)===String(teacherDid));
    if(!t){toast('Guru tidak ditemukan.',true);return}

    const dupe=sessions().some(s=>
      s.scope===scopeId()&&s.date===date&&s.className===className&&s.status==='active'
    );
    if(dupe){toast('Kelas ini sudah aktif hari ini.',true);return}

    const isSubstitute=!t.classes.includes(className);

    const s={
      id:'K'+Date.now(),
      scope:scopeId(),
      date,
      className,
      teacherDid:String(t.did),
      teacherName:t.nama,
      substituteTeacher:isSubstitute,
      startedAt:ubnbWibIso84(),
      startedBy:CU?.nama||CU?.username||'-',
      status:'active',
      teacherAttendance:[{
        did:String(t.did),nama:t.nama,status:'Hadir',
        source:isSubstitute?'selected_substitute_teacher':'selected_teacher'
      }],
      students:rosterForClass(className),
      generalMaterials:[],
      studentMaterials:{},
      generalNote:'',
      studentNotes:{}
    };

    const all=sessions();
    all.push(s);
    saveSessions(all);
    gpsSilent().then(g=>logStart(s,g));

    ppg52CloseStart();
    mode52='active';
    expanded52=null;
    renderKelas();
    toast('Kelas aktif.');
  };

  /* ---------------- KELAS AKTIF ---------------- */
  function activeCards(){
    const rows=visibleSessions()
      .filter(s=>s.status==='active'&&s.date===today())
      .sort((a,b)=>String(a.startedAt||'').localeCompare(String(b.startedAt||'')));

    if(!rows.length)return '<div class="ppg-empty">Belum ada kelas aktif hari ini.</div>';

    return `<div class="ppg52-active-list">${rows.map(s=>{
      const a=attendance(s);
      const expanded=String(expanded52)===String(s.id);

      return `<article class="ppg52-active-card ${expanded?'expanded':''}">
        <button type="button" class="ppg52-active-summary" onclick="ppg52ToggleActive('${esc(s.id)}')">
          <div class="ppg52-active-main">
            <div class="ppg52-active-name">${esc(s.className)}</div>
            <div class="ppg52-active-meta">Guru: ${esc(s.teacherName||'-')} · Hadir ${a.hadir}/${a.total}${s.substituteTeacher?' · Pengganti':''}</div>
          </div>
          <div class="ppg52-active-att">
            <div class="ppg52-active-pct">${a.pct}%</div>
            <div class="ppg52-active-count">hadir</div>
          </div>
          <div class="ppg52-chevron">${expanded?'▾':'▸'}</div>
        </button>
        <div class="ppg52-progress"><span style="width:${a.pct}%"></span></div>
        <div class="ppg52-detail">${expanded?'<div id="p37detail"></div>':''}</div>
      </article>`;
    }).join('')}</div>`;
  }

  const legacyOpen=window.ppg37Open;
  window.ppg52ToggleActive=function(id){
    expanded52=String(expanded52)===String(id)?null:id;
    renderKelas();
    if(expanded52&&typeof legacyOpen==='function'){
      setTimeout(()=>legacyOpen(id),0);
    }
  };

  function weekStart(d){
    const x=new Date(d+'T00:00:00');
    const n=(x.getDay()+6)%7;
    x.setDate(x.getDate()-n);
    return x.toISOString().slice(0,10);
  }

  function historyHtml(){
    const rows=visibleSessions()
      .filter(s=>s.status==='finished')
      .sort((a,b)=>String(b.date).localeCompare(String(a.date)));

    if(!rows.length)return '<div class="ppg-empty">Belum ada kelas selesai.</div>';

    const groups=new Map();
    rows.forEach(s=>{
      const key=history52==='daily'?s.date:
        history52==='weekly'?weekStart(s.date):
        String(s.date).slice(0,7);
      if(!groups.has(key))groups.set(key,[]);
      groups.get(key).push(s);
    });

    return `
      <div class="ppg52-tabs" style="margin-bottom:8px">
        ${[['daily','Harian'],['weekly','Mingguan'],['monthly','Bulanan']].map(x=>`
          <button class="ppg52-tab ${history52===x[0]?'active':''}" onclick="ppg52History('${x[0]}')">${x[1]}</button>
        `).join('')}
      </div>
      ${[...groups.entries()].map(([k,list])=>`
        <div style="margin-bottom:9px">
          <div style="font-size:11.5px;font-weight:750;color:#175a3a;margin-bottom:5px">${esc(k)} · ${list.length} kelas</div>
          ${list.map(s=>{
            const a=attendance(s);
            return `<div class="ppg52-history-row">
              <b>${esc(s.date)}</b>
              <span><b>${esc(s.className)}</b><br><span class="ppg-mini-note">${esc(s.teacherName||'-')}</span></span>
              <span>${a.hadir}/${a.total} · ${a.pct}%</span>
            </div>`;
          }).join('')}
        </div>
      `).join('')}`;
  }

  window.ppg52History=function(m){
    history52=m;
    renderKelas();
  };

  window.ppg52KelasMode=function(m){
    mode52=m;
    expanded52=null;
    renderKelas();
  };

  function renderKelas(){
    const el=document.getElementById('ppg-page-kelas');
    if(!el)return;

    el.innerHTML=`
      <div class="ppg52-topline">
        <div class="ppg52-tabs">
          <button class="ppg52-tab ${mode52==='active'?'active':''}" onclick="ppg52KelasMode('active')">Aktif Hari Ini</button>
          <button class="ppg52-tab ${mode52==='history'?'active':''}" onclick="ppg52KelasMode('history')">Riwayat</button>
        </div>
        ${controller()?'':'<button class="ppg52-primary" onclick="ppg52OpenStart()">+ Mulai Kelas</button>'}
      </div>
      ${mode52==='active'?activeCards():historyHtml()}`;

    if(expanded52&&typeof legacyOpen==='function'){
      setTimeout(()=>legacyOpen(expanded52),0);
    }
  }

  /* ---------------- DEWAN GURU ---------------- */
  function ensureGuruModal(){
    if(document.getElementById('ppg52-guru-modal'))return;
    document.body.insertAdjacentHTML('beforeend',`
      <div id="ppg52-guru-modal" class="ppg52-modal">
        <div class="ppg52-modal-card">
          <div class="ppg52-modal-head">
            <b id="ppg52-guru-title">Dewan Guru</b>
            <button class="ppg52-modal-close" onclick="ppg52CloseGuru()">✕</button>
          </div>
          <div class="ppg52-modal-body">
            <div id="ppg52-guru-add-fields">
              <div class="ppg52-field">
                <label>Nama</label>
                <select id="ppg52-guru-person"></select>
              </div>
              <div class="ppg52-field">
                <label>Peran</label>
                <select id="ppg52-guru-role">
                  <option>Guru</option>
                  <option>Pendamping Guru</option>
                  <option>Koordinator Kelas</option>
                </select>
              </div>
            </div>
            <div class="ppg52-field">
              <label>Kelas Binaan</label>
              <div id="ppg52-guru-classes" class="ppg52-class-buttons"></div>
              <div class="ppg52-help">Bisa memilih lebih dari satu kelas.</div>
            </div>
            <div class="ppg52-modal-actions">
              <button class="ppg52-secondary" onclick="ppg52CloseGuru()">Batal</button>
              <button class="ppg52-primary" onclick="ppg52SaveGuru()">Simpan</button>
            </div>
          </div>
        </div>
      </div>`);
  }

  function renderGuruClasses(){
    const box=document.getElementById('ppg52-guru-classes');
    if(!box)return;
    box.innerHTML=classes().map(k=>`
      <button type="button"
        class="ppg52-class-btn ${guru52.classes.includes(k)?'selected':''}"
        onclick="ppg52ToggleGuruClass('${esc(k)}')">${esc(k)}</button>
    `).join('');
  }

  window.ppg52ToggleGuruClass=function(k){
    const i=guru52.classes.indexOf(k);
    if(i>=0)guru52.classes.splice(i,1);
    else guru52.classes.push(k);
    renderGuruClasses();
  };

  function candidates(){
    const existing=new Set(teachers().map(t=>String(t.did)));
    let rows=(Array.isArray(aJamaah)?aJamaah:[])
      .filter(j=>j.status_sambung==='Tetap');

    if(scope()?.type==='kelompok')rows=rows.filter(j=>j.kelompok_nama===scope().kelompok);

    return rows
      .filter(j=>!existing.has(String(j.did)))
      .sort((a,b)=>String(a.nama||'').localeCompare(String(b.nama||''),'id'));
  }

  window.ppg52OpenAddGuru=function(){
    if(controller())return;
    ensureGuruModal();
    guru52={mode:'add',did:null,classes:[]};

    document.getElementById('ppg52-guru-title').textContent='Tambah Dewan Guru';
    document.getElementById('ppg52-guru-add-fields').style.display='';

    const sel=document.getElementById('ppg52-guru-person');
    sel.innerHTML='<option value="">Pilih nama...</option>'+
      candidates().map(j=>`<option value="${esc(j.did)}">${esc(j.nama)} · ${esc(j.nama_kk||'-')}</option>`).join('');

    document.getElementById('ppg52-guru-role').value='Guru';
    renderGuruClasses();
    document.getElementById('ppg52-guru-modal').classList.add('show');
  };

  window.ppg52EditGuru=function(did){
    if(controller())return;
    ensureGuruModal();
    const t=teachers().find(x=>String(x.did)===String(did));
    if(!t)return;

    guru52={mode:'edit',did:String(did),classes:[...t.classes]};
    document.getElementById('ppg52-guru-title').textContent='Atur Kelas Binaan · '+t.nama;
    document.getElementById('ppg52-guru-add-fields').style.display='none';
    renderGuruClasses();
    document.getElementById('ppg52-guru-modal').classList.add('show');
  };

  window.ppg52CloseGuru=function(){
    document.getElementById('ppg52-guru-modal')?.classList.remove('show');
  };

  window.ppg52SaveGuru=function(){
    if(!guru52.classes.length){
      toast('Pilih minimal satu Kelas Binaan.',true);
      return;
    }

    if(guru52.mode==='add'){
      const did=document.getElementById('ppg52-guru-person')?.value||'';
      const role=document.getElementById('ppg52-guru-role')?.value||'Guru';
      if(!did){toast('Pilih nama Dewan Guru.',true);return}

      const j=(Array.isArray(aJamaah)?aJamaah:[]).find(x=>String(x.did)===String(did));
      if(!j){toast('Data jamaah tidak ditemukan.',true);return}

      const rows=get(CUSTOM_GURU_KEY,[]);
      if(!rows.some(x=>String(x.did)===String(did))){
        rows.push({
          did:String(did),
          kelompok_nama:j.kelompok_nama||scopeId(),
          role,
          created_at:ubnbWibIso84()
        });
        set(CUSTOM_GURU_KEY,rows);
      }

      const map=get(MULTI_CLASS_KEY,{});
      map[String(did)]=[...guru52.classes];
      set(MULTI_CLASS_KEY,map);
    }else{
      const map=get(MULTI_CLASS_KEY,{});
      map[String(guru52.did)]=[...guru52.classes];
      set(MULTI_CLASS_KEY,map);
    }

    ppg52CloseGuru();
    renderGuru();
    toast('Dewan Guru disimpan.');
  };

  window.ppg52RemoveGuru=function(did){
    const rows=get(CUSTOM_GURU_KEY,[]);
    if(!rows.some(x=>String(x.did)===String(did))){
      toast('Dewan Guru dari dapukan MT/MS tidak dapat dihapus.',true);
      return;
    }

    set(CUSTOM_GURU_KEY,rows.filter(x=>String(x.did)!==String(did)));
    const map=get(MULTI_CLASS_KEY,{});
    delete map[String(did)];
    set(MULTI_CLASS_KEY,map);
    renderGuru();
  };

  function chips(cs){
    if(!cs.length)return '<span class="ppg-mini-note">Belum diatur</span>';
    return cs.map(k=>`<span class="ppg52-chip">${esc(k)}</span>`).join('');
  }

  function renderGuru(){
    const el=document.getElementById('ppg-page-guru');
    if(!el)return;

    const rows=teachers();
    const customSet=new Set(get(CUSTOM_GURU_KEY,[]).map(x=>String(x.did)));

    el.innerHTML=`
      <div class="ppg52-guru-head">
        <div>
          <div class="ppg-v33-stage-title">Dewan Guru</div>
          <div class="ppg-v33-stage-sub">Atur satu atau beberapa Kelas Binaan untuk setiap guru.</div>
        </div>
        ${controller()?'':'<button class="ppg52-primary" onclick="ppg52OpenAddGuru()">+ Dewan Guru</button>'}
      </div>
      <div class="ppg-panel" style="margin-top:0">
        <div style="overflow:auto">
          <table class="ppg52-guru-table">
            <thead><tr><th>Nama</th><th>Peran / Dapukan</th><th>Kelas Binaan</th><th>Aksi</th></tr></thead>
            <tbody>${rows.map(t=>`<tr>
              <td><b>${esc(t.nama)}</b><div class="ppg-mini-note">${esc(t.kelompok_nama||'-')}</div></td>
              <td>${esc([...new Set(t.roles)].join(' · ')||'Guru')}</td>
              <td><div class="ppg52-chips">${chips(t.classes)}</div></td>
              <td>${controller()?'—':`<div class="ppg52-row-actions">
                <button class="ppg52-mini" onclick="ppg52EditGuru('${esc(t.did)}')">Atur Kelas</button>
                ${customSet.has(String(t.did))?`<button class="ppg52-mini danger" onclick="ppg52RemoveGuru('${esc(t.did)}')">Hapus</button>`:''}
              </div>`}</td>
            </tr>`).join('')}</tbody>
          </table>
        </div>
      </div>`;
  }

  /* ---------------- FINAL ROUTER OVERRIDE ---------------- */
  const priorOpen=window.ppgOpenPage;
  window.ppgOpenPage=function(page,btn){
    if(page==='kelas'||page==='guru'){
      document.querySelectorAll('.ppg-page').forEach(x=>x.classList.remove('active'));
      document.querySelectorAll('.ppg-tab').forEach(x=>x.classList.remove('active'));
      document.getElementById('ppg-page-'+page)?.classList.add('active');
      btn?.classList.add('active');

      if(page==='kelas')renderKelas();
      else renderGuru();
      return;
    }
    return priorOpen?.apply(this,arguments);
  };

  // legacy refresh calls
  window.ppg46RenderKelas=renderKelas;
  window.ppg46RenderGuru=renderGuru;
  window.ppg52RenderKelas=renderKelas;
  window.ppg52RenderGuru=renderGuru;

  setTimeout(()=>{
    if(document.getElementById('ppg-page-kelas')?.classList.contains('active'))renderKelas();
    if(document.getElementById('ppg-page-guru')?.classList.contains('active'))renderGuru();
  },1000);
})();

/* ============================================================
   SOURCE: ubnb-v54-scroll-finish-export-script
   ============================================================ */
(function(){
  const SESSION_KEY='ubnb_ppg_v37_classes';
  const DRAFT_KEY='ubnb_ppg_v33_class_drafts';
  const SYMP_KEY='ubnb_ppg_v38_simpatisan';

  const esc=s=>String(s??'').replace(/[&<>"']/g,m=>(
    {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]
  ));

  function get(k,d){
    try{return JSON.parse(localStorage.getItem(k)||JSON.stringify(d))}
    catch(_){return d}
  }
  function set(k,v){localStorage.setItem(k,JSON.stringify(v))}
  function scope(){
    try{return JSON.parse(sessionStorage.getItem('ubnb_ppg_v34_scope')||'null')}
    catch(_){return null}
  }
  function scopeId(){
    const s=scope();
    return s?.type==='kelompok'?(s.kelompok||''):'DESA';
  }
  function classes(){
    try{
      const x=typeof window.ppg47Classes==='function'?window.ppg47Classes():[];
      if(Array.isArray(x)&&x.length)return x;
    }catch(_){}
    return ['Balita','Cabe Rawit Tahap A','Cabe Rawit Tahap B','Cabe Rawit Tahap C','Pra Remaja','Remaja','Dewasa'];
  }
  function today(){
    try{
      return new Intl.DateTimeFormat('en-CA',{
        timeZone:'Asia/Jakarta',year:'numeric',month:'2-digit',day:'2-digit'
      }).format(new Date());
    }catch(_){return ubnbWibIso84().slice(0,10)}
  }
  function safeFile(s){
    return String(s||'data')
      .replace(/[\\/:*?"<>|]+/g,'_')
      .replace(/\s+/g,'_');
  }

  /* ---------------- ONE SCROLL ---------------- */
  function syncPageLock(){
    const show=document.getElementById('ppg-shell')?.classList.contains('show');
    document.documentElement.classList.toggle('ppg54-lock-page',!!show);
    document.body.classList.toggle('ppg54-lock-page',!!show);
  }

  const shell=document.getElementById('ppg-shell');
  if(shell){
    new MutationObserver(syncPageLock).observe(shell,{attributes:true,attributeFilter:['class']});
  }

  const priorChoosePPG=window.ppgChoosePPG;
  window.ppgChoosePPG=function(){
    const r=priorChoosePPG?.apply(this,arguments);
    setTimeout(syncPageLock,0);
    return r;
  };

  const priorBackPortal=window.ppgBackPortal;
  window.ppgBackPortal=function(){
    const r=priorBackPortal?.apply(this,arguments);
    setTimeout(syncPageLock,0);
    return r;
  };

  const priorChooseDatabase=window.ppgChooseDatabase;
  window.ppgChooseDatabase=function(){
    const r=priorChooseDatabase?.apply(this,arguments);
    setTimeout(syncPageLock,0);
    return r;
  };

  setTimeout(syncPageLock,700);

  /* ---------------- SETUP EXPORT DATA ---------------- */
  function age(j){
    try{return umurFromTgl(j.tgl_lahir)}
    catch(_){return null}
  }

  function setupRows(){
    const s=scope();
    const drafts=get(DRAFT_KEY,{});

    let jamaah=(Array.isArray(aJamaah)?aJamaah:[])
      .filter(j=>j.status_nikah==='Belum Menikah')
      .filter(j=>j.status_sambung==='Tetap');

    if(s?.type==='kelompok'){
      jamaah=jamaah.filter(j=>j.kelompok_nama===s.kelompok);
    }

    const jrows=jamaah.map(j=>({
      id:String(j.did),
      nama:j.nama||'-',
      kk:j.nama_kk||'-',
      umur:age(j),
      kelas:drafts[String(j.did)]||j.kelas_kbm||j.kelas_usia||'Belum Ditentukan',
      jenis:'Jamaah'
    }));

    let simp=get(SYMP_KEY,[]);
    if(s?.type==='kelompok'){
      simp=simp.filter(x=>x.scope===s.kelompok);
    }

    const srows=simp.map(x=>({
      id:String(x.id),
      nama:x.nama||'-',
      kk:x.nama_kk||'-',
      umur:x.umur??null,
      kelas:x.kelas||'Belum Ditentukan',
      jenis:'Simpatisan'
    }));

    return [...jrows,...srows];
  }

  function groupedRows(){
    const rows=setupRows();
    const order=[...classes(),'Belum Ditentukan'];
    return order.map(k=>({
      kelas:k,
      rows:rows.filter(x=>x.kelas===k).sort((a,b)=>String(a.nama).localeCompare(String(b.nama),'id'))
    })).filter(g=>g.rows.length);
  }

  function ensureExportButtons(){
    const page=document.getElementById('ppg-page-setup');
    if(!page||!page.classList.contains('active'))return;
    if(page.querySelector('.ppg54-export-tools'))return;

    const toolbar=page.querySelector('.ppg38-setup-toolbar');
    if(!toolbar)return;

    const box=document.createElement('div');
    box.className='ppg54-export-tools';
    box.innerHTML=`
      <span class="ppg54-export-label">Download Data Murid KBM:</span>
      <button class="ppg54-export-btn" onclick="ppg54ExportPNG(this)">Gambar PNG</button>
      <button class="ppg54-export-btn" onclick="ppg54ExportPDF(this)">PDF</button>`;
    toolbar.parentNode.insertBefore(box,toolbar);
  }

  async function withBusy(btn,fn){
    if(btn)btn.disabled=true;
    try{await fn()}
    catch(e){
      console.error(e);
      toast(e?.message||'Export gagal.',true);
    }finally{
      if(btn)btn.disabled=false;
    }
  }

  function canvasData(){
    const groups=groupedRows();
    const scopeName=scope()?.type==='kelompok'?(scope()?.kelompok||'Kelompok'):'Desa Perwira';
    const title=`Data Murid KBM - ${scopeName}`;
    return {groups,scopeName,title};
  }

  window.ppg54ExportPNG=function(btn){
    return withBusy(btn,async()=>{
      const {groups,title}=canvasData();
      if(!groups.length)throw new Error('Belum ada data murid untuk diexport.');

      const width=1200;
      const margin=48;
      const rowH=40;
      const groupH=44;
      const titleH=95;
      const footerH=44;
      const totalRows=groups.reduce((n,g)=>n+g.rows.length,0);
      const height=titleH+footerH+groups.length*groupH+totalRows*rowH;

      const c=document.createElement('canvas');
      c.width=width;
      c.height=height;
      const ctx=c.getContext('2d');

      ctx.fillStyle='#ffffff';
      ctx.fillRect(0,0,width,height);

      let y=36;
      ctx.fillStyle='#145f3d';
      ctx.font='700 28px Arial, sans-serif';
      ctx.fillText(title,margin,y);

      y+=30;
      ctx.fillStyle='#68776f';
      ctx.font='16px Arial, sans-serif';
      ctx.fillText(`Tanggal export: ${today()} · Total ${totalRows} murid`,margin,y);

      y=titleH;

      groups.forEach(g=>{
        ctx.fillStyle='#e9f5ed';
        ctx.fillRect(margin,y,width-margin*2,groupH);
        ctx.fillStyle='#155d3a';
        ctx.font='700 19px Arial, sans-serif';
        ctx.fillText(g.kelas,margin+12,y+28);
        ctx.font='15px Arial, sans-serif';
        ctx.textAlign='right';
        ctx.fillText(`${g.rows.length} murid`,width-margin-12,y+27);
        ctx.textAlign='left';
        y+=groupH;

        g.rows.forEach((r,i)=>{
          if(i%2===1){
            ctx.fillStyle='#f8faf9';
            ctx.fillRect(margin,y,width-margin*2,rowH);
          }

          ctx.fillStyle='#25362d';
          ctx.font='700 16px Arial, sans-serif';
          ctx.fillText(`${i+1}. ${r.nama}`,margin+10,y+17);

          ctx.fillStyle='#6b7871';
          ctx.font='13px Arial, sans-serif';
          const meta=`KK/Wali: ${r.kk} · Umur: ${r.umur??'-'} th · ${r.jenis}`;
          ctx.fillText(meta,margin+26,y+34);

          ctx.strokeStyle='#e6ece8';
          ctx.beginPath();
          ctx.moveTo(margin,y+rowH-.5);
          ctx.lineTo(width-margin,y+rowH-.5);
          ctx.stroke();

          y+=rowH;
        });
      });

      ctx.fillStyle='#7a867f';
      ctx.font='13px Arial, sans-serif';
      ctx.fillText('PPG Perwira · Data Murid KBM',margin,height-18);

      const blob=await new Promise(resolve=>c.toBlob(resolve,'image/png'));
      if(!blob)throw new Error('Gagal membuat gambar.');
      const url=URL.createObjectURL(blob);
      const a=document.createElement('a');
      a.href=url;
      a.download=safeFile(`${title}_${today()}`)+'.png';
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(()=>URL.revokeObjectURL(url),1200);
    });
  };

  window.ppg54ExportPDF=function(btn){
    return withBusy(btn,async()=>{
      const {groups,title}=canvasData();
      if(!groups.length)throw new Error('Belum ada data murid untuk diexport.');

      const jsPDFCtor=window.jspdf?.jsPDF;
      if(!jsPDFCtor)throw new Error('Library PDF belum siap. Refresh halaman lalu coba lagi.');

      const doc=new jsPDFCtor({orientation:'portrait',unit:'mm',format:'a4'});
      const pageW=doc.internal.pageSize.getWidth();

      doc.setFont('helvetica','bold');
      doc.setFontSize(15);
      doc.setTextColor(20,95,61);
      doc.text(title,14,16);

      doc.setFont('helvetica','normal');
      doc.setFontSize(9);
      doc.setTextColor(95,108,101);
      const total=groups.reduce((n,g)=>n+g.rows.length,0);
      doc.text(`Tanggal export: ${today()}  |  Total: ${total} murid`,14,22);

      let startY=27;

      for(const g of groups){
        if(typeof doc.autoTable!=='function'){
          throw new Error('Plugin tabel PDF belum siap. Refresh halaman lalu coba lagi.');
        }

        doc.autoTable({
          startY,
          margin:{left:14,right:14},
          head:[[{content:`${g.kelas} (${g.rows.length} murid)`,colSpan:4,styles:{
            fillColor:[233,245,237],
            textColor:[21,93,58],
            fontStyle:'bold',
            fontSize:10
          }}]],
          body:g.rows.map((r,i)=>[
            String(i+1),
            `${r.nama}\nKK/Wali: ${r.kk}`,
            r.umur==null?'-':String(r.umur),
            r.jenis
          ]),
          columns:[
            {header:'No',dataKey:0},
            {header:'Nama',dataKey:1},
            {header:'Umur',dataKey:2},
            {header:'Jenis',dataKey:3}
          ],
          theme:'grid',
          styles:{
            font:'helvetica',
            fontSize:8.5,
            cellPadding:2.2,
            lineColor:[224,231,227],
            lineWidth:.15,
            textColor:[38,53,45],
            valign:'middle'
          },
          columnStyles:{
            0:{cellWidth:10,halign:'center'},
            1:{cellWidth:'auto'},
            2:{cellWidth:16,halign:'center'},
            3:{cellWidth:24}
          },
          didDrawPage:(data)=>{
            doc.setFontSize(7.5);
            doc.setTextColor(120,130,124);
            doc.text(`PPG Perwira · ${data.pageNumber}`,pageW-14,291,{align:'right'});
          }
        });

        startY=doc.lastAutoTable.finalY+5;
        if(startY>270){
          doc.addPage();
          startY=14;
        }
      }

      doc.save(safeFile(`${title}_${today()}`)+'.pdf');
    });
  };

  /* setup rerender listener */
  const priorOpen=window.ppgOpenPage;
  window.ppgOpenPage=function(page,btn){
    const r=priorOpen?.apply(this,arguments);
    if(page==='setup')setTimeout(ensureExportButtons,0);
    return r;
  };

  const setupPage=document.getElementById('ppg-page-setup');
  if(setupPage){
    let t=0;
    new MutationObserver(()=>{
      clearTimeout(t);
      t=setTimeout(ensureExportButtons,50);
    }).observe(setupPage,{childList:true,subtree:false});
  }
  setTimeout(ensureExportButtons,900);

  /* ---------------- FINISH CLASS POPUP ---------------- */
  function ensureFinishModal(){
    if(document.getElementById('ppg54-finish-modal'))return;

    document.body.insertAdjacentHTML('beforeend',`
      <div id="ppg54-finish-modal" class="ppg54-finish-modal">
        <div class="ppg54-finish-card">
          <div class="ppg54-finish-head">
            <b>Selesaikan Kelas</b>
            <button class="ppg54-finish-close" onclick="ppg54CloseFinish()">✕</button>
          </div>
          <div id="ppg54-finish-body" class="ppg54-finish-body"></div>
        </div>
      </div>`);
  }

  window.ppg54CloseFinish=function(){
    document.getElementById('ppg54-finish-modal')?.classList.remove('show');
  };

  window.ppg37Finish=function(id){
    const s=get(SESSION_KEY,[]).find(x=>String(x.id)===String(id));
    if(!s)return;

    ensureFinishModal();

    const notes=s.studentNotes||{};
    document.getElementById('ppg54-finish-body').innerHTML=`
      <div class="ppg54-finish-meta">
        <b>${esc(s.className||'-')}</b> · ${esc(s.date||'-')}<br>
        Guru: ${esc(s.teacherName||'-')}
      </div>

      <div class="ppg54-finish-field">
        <label>Catatan Umum</label>
        <textarea id="ppg54-general-note" placeholder="Contoh: bacaannya di deres lagi di rumah">${esc(s.generalNote||'')}</textarea>
      </div>

      <div class="ppg54-finish-field">
        <label>Catatan Khusus Per Murid <span style="font-weight:400">(opsional)</span></label>
        <div class="ppg54-child-notes">
          ${(s.students||[]).map(x=>`
            <div class="ppg54-child-note">
              <b>${esc(x.nama)}</b>
              <input class="ppg54-student-note" data-id="${esc(x.did)}"
                value="${esc(notes[String(x.did)]||'')}"
                placeholder="Catatan khusus">
            </div>
          `).join('')}
        </div>
      </div>

      <div class="ppg54-finish-actions">
        <button class="ppg54-cancel" onclick="ppg54CloseFinish()">Batal</button>
        <button class="ppg54-close-class" onclick="ppg54ConfirmFinish('${esc(s.id)}')">Tutup Kelas</button>
      </div>`;

    document.getElementById('ppg54-finish-modal').classList.add('show');
  };

  window.ppg54ConfirmFinish=function(id){
    const all=get(SESSION_KEY,[]);
    const s=all.find(x=>String(x.id)===String(id));
    if(!s)return;

    s.generalNote=document.getElementById('ppg54-general-note')?.value||'';
    s.studentNotes=s.studentNotes||{};
    document.querySelectorAll('.ppg54-student-note').forEach(x=>{
      s.studentNotes[String(x.dataset.id)]=x.value||'';
    });

    s.status='finished';
    s.finishedAt=ubnbWibIso84();
    s.finishedBy=CU?.nama||CU?.username||'-';
    set(SESSION_KEY,all);

    const logs=get('ubnb_ppg_v37_logger',[]);
    logs.push({
      at:ubnbWibIso84(),
      type:'TUTUP_KELAS',
      account:CU?.nama||CU?.username||'-',
      scope:s.scope||scopeId(),
      sessionId:s.id,
      className:s.className,
      teacherName:s.teacherName,
      date:s.date
    });
    set('ubnb_ppg_v37_logger',logs);

    ppg54CloseFinish();

    if(typeof window.ppg52KelasMode==='function'){
      window.ppg52KelasMode('history');
    }else{
      const btn=document.querySelector('.ppg-tab[data-page="kelas"]');
      window.ppgOpenPage?.('kelas',btn);
    }

    toast('Kelas ditutup dan masuk riwayat.');
  };
})();

/* ============================================================
   SOURCE: ubnb-v55-report-history-review-script
   ============================================================ */
(function(){
  const SESSION_KEY='ubnb_ppg_v37_classes';
  const REPORT_KEY='ubnb_ppg_v37_reports';
  let selectedReport55=null;
  let historyMode55='daily';

  const esc=s=>String(s??'').replace(/[&<>"']/g,m=>(
    {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]
  ));

  function get(k,d){
    try{return JSON.parse(localStorage.getItem(k)||JSON.stringify(d))}
    catch(_){return d}
  }
  function set(k,v){localStorage.setItem(k,JSON.stringify(v))}
  function scope(){
    try{return JSON.parse(sessionStorage.getItem('ubnb_ppg_v34_scope')||'null')}
    catch(_){return null}
  }
  function controller(){return scope()?.type==='controller'}
  function scopeId(){return controller()?'DESA':(scope()?.kelompok||'')}
  function sessions(){return get(SESSION_KEY,[])}
  function reports(){return get(REPORT_KEY,[])}
  function saveReports(v){set(REPORT_KEY,v)}
  function classes(){
    try{
      const x=typeof window.ppg47Classes==='function'?window.ppg47Classes():[];
      if(Array.isArray(x)&&x.length)return x;
    }catch(_){}
    return ['Balita','Cabe Rawit Tahap A','Cabe Rawit Tahap B','Cabe Rawit Tahap C','Pra Remaja','Remaja','Dewasa'];
  }
  function safeFile(s){
    return String(s||'laporan').replace(/[\\/:*?"<>|]+/g,'_').replace(/\s+/g,'_');
  }

  function visibleFinished(){
    let rows=sessions().filter(s=>s.status==='finished');
    if(!controller())rows=rows.filter(s=>s.scope===scopeId());
    return rows.sort((a,b)=>String(a.date).localeCompare(String(b.date)));
  }

  function visibleReports(){
    return reports()
      .filter(r=>controller()||r.scope===scopeId())
      .sort((a,b)=>String(b.end||'').localeCompare(String(a.end||'')) || String(b.at||'').localeCompare(String(a.at||'')));
  }

  function reportIds(r){
    return Array.isArray(r?.ids)?r.ids:(Array.isArray(r?.session_ids)?r.session_ids:[]);
  }

  function reportSessions(r){
    const ids=new Set(reportIds(r).map(String));
    return sessions().filter(s=>ids.has(String(s.id)));
  }

  function dayAfter(d){
    const x=new Date(d+'T00:00:00');x.setDate(x.getDate()+1);return x.toISOString().slice(0,10);
  }
  function plus30(d){
    const x=new Date(d+'T00:00:00');x.setDate(x.getDate()+30);return x.toISOString().slice(0,10);
  }
  function nextPeriod(){
    const done=visibleFinished();
    if(!done.length)return null;

    const rr=visibleReports().slice().sort((a,b)=>String(a.end||'').localeCompare(String(b.end||'')));
    const start=rr.length?dayAfter(rr[rr.length-1].end):done[0].date;
    const latest=done[done.length-1].date;
    if(start>latest)return null;

    const cap=plus30(start);
    return {start,end:latest<cap?latest:cap};
  }

  function studentKind(x){
    if(x?.kind==='simpatisan')return 'simpatisan';
    if(String(x?.did||'').startsWith('SYM-'))return 'simpatisan';
    return 'jamaah';
  }

  function attendanceStats(s){
    const students=s.students||[];
    const total=students.length;
    const hadir=students.filter(x=>x.status==='Hadir').length;
    return {total,hadir,pct:total?Math.round(hadir/total*100):0};
  }

  /* ---------------- RIWAYAT KBM REVIEW ---------------- */
  function weekStart(d){
    const x=new Date(d+'T00:00:00');
    const n=(x.getDay()+6)%7;
    x.setDate(x.getDate()-n);
    return x.toISOString().slice(0,10);
  }

  function historyRowsHtml(){
    const rows=visibleFinished().slice().sort((a,b)=>String(b.date).localeCompare(String(a.date)));
    if(!rows.length)return '<div class="ppg-empty">Belum ada kelas selesai.</div>';

    const groups=new Map();
    rows.forEach(s=>{
      const key=historyMode55==='daily'?s.date:
        historyMode55==='weekly'?weekStart(s.date):
        String(s.date).slice(0,7);
      if(!groups.has(key))groups.set(key,[]);
      groups.get(key).push(s);
    });

    return `
      <div class="ppg52-tabs" style="margin-bottom:8px">
        ${[['daily','Harian'],['weekly','Mingguan'],['monthly','Bulanan']].map(x=>`
          <button class="ppg52-tab ${historyMode55===x[0]?'active':''}" onclick="ppg55HistoryMode('${x[0]}')">${x[1]}</button>
        `).join('')}
      </div>
      ${[...groups.entries()].map(([key,list])=>`
        <div style="margin-bottom:9px">
          <div style="font-size:11.5px;font-weight:750;color:#175a3a;margin-bottom:5px">${esc(key)} · ${list.length} kelas</div>
          ${list.map(s=>{
            const a=attendanceStats(s);
            return `<button type="button" class="ppg55-history-row" onclick="ppg55ReviewKBM('${esc(s.id)}')">
              <b>${esc(s.date)}</b>
              <span><b>${esc(s.className||'-')}</b><br><span class="ppg-mini-note">${esc(s.teacherName||'-')}</span></span>
              <span>${a.hadir}/${a.total} · ${a.pct}%</span>
              <span class="ppg55-history-arrow">›</span>
            </button>`;
          }).join('')}
        </div>
      `).join('')}`;
  }

  window.ppg55HistoryMode=function(m){
    historyMode55=m;
    renderKBMHistory55();
  };

  function renderKBMHistory55(){
    const el=document.getElementById('ppg-page-kelas');
    if(!el)return;
    el.innerHTML=`
      <div class="ppg52-topline">
        <div class="ppg52-tabs">
          <button class="ppg52-tab" onclick="ppg52KelasMode('active')">Aktif Hari Ini</button>
          <button class="ppg52-tab active" onclick="ppg55HistoryMode('${historyMode55}')">Riwayat</button>
        </div>
        ${controller()?'':'<button class="ppg52-primary" onclick="ppg52OpenStart()">+ Mulai Kelas</button>'}
      </div>
      ${historyRowsHtml()}`;
  }

  const oldMode55=window.ppg52KelasMode;
  window.ppg52KelasMode=function(m){
    if(m==='history'){
      renderKBMHistory55();
      return;
    }
    return oldMode55?.apply(this,arguments);
  };

  function ensureReviewModal(){
    if(document.getElementById('ppg55-review-modal'))return;
    document.body.insertAdjacentHTML('beforeend',`
      <div id="ppg55-review-modal" class="ppg55-modal">
        <div class="ppg55-modal-card">
          <div class="ppg55-modal-head">
            <b id="ppg55-review-title">Review KBM</b>
            <button class="ppg55-modal-close" onclick="ppg55CloseReview()">✕</button>
          </div>
          <div id="ppg55-review-body" class="ppg55-modal-body"></div>
        </div>
      </div>`);
  }

  window.ppg55CloseReview=function(){
    document.getElementById('ppg55-review-modal')?.classList.remove('show');
  };

  function generalMaterials(s){
    return s.generalMaterials||s.general_materials||[];
  }
  function studentMaterials(s){
    return s.studentMaterials||s.student_materials||{};
  }
  function studentNotes(s){
    return s.studentNotes||s.student_notes||{};
  }

  window.ppg55ReviewKBM=function(id){
    const s=sessions().find(x=>String(x.id)===String(id));
    if(!s)return;

    ensureReviewModal();
    const a=attendanceStats(s);
    const gm=generalMaterials(s);
    const sm=studentMaterials(s);
    const sn=studentNotes(s);
    const teacherAtt=s.teacherAttendance||s.teachers||[];

    const special=[];
    Object.entries(sm).forEach(([did,arr])=>{
      const st=(s.students||[]).find(x=>String(x.did)===String(did));
      (arr||[]).forEach(m=>special.push({
        nama:st?.nama||'-',
        text:m?.text||String(m||'')
      }));
    });

    document.getElementById('ppg55-review-title').textContent=`Review KBM · ${s.className||'-'}`;
    document.getElementById('ppg55-review-body').innerHTML=`
      <div class="ppg55-review-meta">
        <div class="ppg55-review-stat"><small>Tanggal</small><b>${esc(s.date||'-')}</b></div>
        <div class="ppg55-review-stat"><small>Guru</small><b>${esc(s.teacherName||'-')}</b></div>
        <div class="ppg55-review-stat"><small>Kehadiran</small><b>${a.hadir}/${a.total} · ${a.pct}%</b></div>
        <div class="ppg55-review-stat"><small>Status</small><b>Selesai</b></div>
      </div>

      <div class="ppg55-section">
        <div class="ppg55-section-head">Kehadiran Murid</div>
        <div class="ppg55-section-body">
          <div class="ppg55-att-list">
            ${(s.students||[]).map(x=>`
              <div class="ppg55-att-row">
                <span><b>${esc(x.nama||'-')}</b>${studentKind(x)==='simpatisan'?'<span class="ppg38-symp-badge">Simpatisan</span>':''}</span>
                <span class="ppg55-status">${esc(x.status||'-')}</span>
              </div>`).join('')||'<div class="ppg-empty">Tidak ada data murid.</div>'}
          </div>
        </div>
      </div>

      ${teacherAtt.length?`
      <div class="ppg55-section">
        <div class="ppg55-section-head">Kehadiran Dewan Guru</div>
        <div class="ppg55-section-body">
          <div class="ppg55-att-list">
            ${teacherAtt.map(x=>`<div class="ppg55-att-row"><b>${esc(x.nama||'-')}</b><span class="ppg55-status">${esc(x.status||'-')}</span></div>`).join('')}
          </div>
        </div>
      </div>`:''}

      <div class="ppg55-section">
        <div class="ppg55-section-head">Materi Umum</div>
        <div class="ppg55-section-body">
          <div class="ppg55-material-list">
            ${gm.length?gm.map(m=>`<div class="ppg55-material-item">${esc(m?.text||String(m||''))}</div>`).join(''):'<div class="ppg-empty">Belum ada materi umum.</div>'}
          </div>
        </div>
      </div>

      <div class="ppg55-section">
        <div class="ppg55-section-head">Materi Khusus</div>
        <div class="ppg55-section-body">
          <div class="ppg55-material-list">
            ${special.length?special.map(m=>`<div class="ppg55-material-item">${esc(m.text)}<small>${esc(m.nama)}</small></div>`).join(''):'<div class="ppg-empty">Belum ada materi khusus.</div>'}
          </div>
        </div>
      </div>

      ${(s.generalNote||s.general_note||Object.values(sn).some(Boolean))?`
      <div class="ppg55-section">
        <div class="ppg55-section-head">Catatan</div>
        <div class="ppg55-section-body">
          ${(s.generalNote||s.general_note)?`<div class="ppg55-material-item"><b>Umum</b><br>${esc(s.generalNote||s.general_note)}</div>`:''}
          ${Object.entries(sn).filter(([,v])=>String(v||'').trim()).map(([did,v])=>{
            const st=(s.students||[]).find(x=>String(x.did)===String(did));
            return `<div class="ppg55-material-item"><b>${esc(st?.nama||'-')}</b><br>${esc(v)}</div>`;
          }).join('')}
        </div>
      </div>`:''}
    `;
    document.getElementById('ppg55-review-modal').classList.add('show');
  };

  /* ---------------- LAPORAN ---------------- */
  function classSessions(rows,k){
    return rows.filter(s=>s.className===k);
  }

  function reportClassStats(rows,k){
    const ss=classSessions(rows,k);
    const dates=[...new Set(ss.map(s=>s.date))].sort();
    const people=new Set();
    let hadir=0,total=0;
    ss.forEach(s=>(s.students||[]).forEach(x=>{
      people.add(String(x.did));
      total++;
      if(x.status==='Hadir')hadir++;
    }));
    return {
      sessions:ss.length,
      dates,
      people:people.size,
      hadir,
      total,
      pct:total?Math.round(hadir/total*100):0
    };
  }

  function classPivot(rows,k,kind){
    const ss=classSessions(rows,k);
    const dates=[...new Set(ss.map(s=>s.date))].sort();
    const map=new Map();

    ss.forEach(s=>(s.students||[])
      .filter(x=>studentKind(x)===kind)
      .forEach(x=>{
        const key=String(x.did);
        if(!map.has(key))map.set(key,{nama:x.nama||'-',st:{}});
        map.get(key).st[s.date]=x.status||'—';
      })
    );

    return {
      dates,
      rows:[...map.values()].sort((a,b)=>String(a.nama).localeCompare(String(b.nama),'id'))
    };
  }

  function classMaterials(rows,k){
    const umum=new Map(),khusus=new Map();
    classSessions(rows,k).forEach(s=>{
      generalMaterials(s).forEach(m=>{
        const text=m?.text||String(m||'');
        if(!text)return;
        const key=text.toLowerCase();
        umum.set(key,{text,count:(umum.get(key)?.count||0)+1});
      });

      Object.values(studentMaterials(s)).flat().forEach(m=>{
        const text=m?.text||String(m||'');
        if(!text)return;
        const key=text.toLowerCase();
        khusus.set(key,{text,count:(khusus.get(key)?.count||0)+1});
      });
    });
    return {umum:[...umum.values()],khusus:[...khusus.values()]};
  }

  function classSummaryHtml(rows,k){
    const st=reportClassStats(rows,k);
    return `
      <div class="ppg-panel">
        <div class="ppg-panel-head">
          <div><div class="ppg-panel-title">${esc(k)}</div><div class="ppg-panel-sub">${st.sessions} kegiatan KBM · ${st.people} murid</div></div>
        </div>
        <div class="ppg-panel-body">
          <div class="ppg55-report-class-summary">
            <div class="ppg55-report-kpi"><small>Kegiatan</small><b>${st.sessions}</b></div>
            <div class="ppg55-report-kpi"><small>Murid</small><b>${st.people}</b></div>
            <div class="ppg55-report-kpi"><small>Total Hadir</small><b>${st.hadir}/${st.total}</b></div>
            <div class="ppg55-report-kpi"><small>Kehadiran</small><b>${st.pct}%</b></div>
          </div>
        </div>
      </div>`;
  }

  window.ppg37GenReport=function(){
    const p=nextPeriod();
    if(!p){toast('Belum ada kegiatan baru untuk laporan.',true);return}

    const ids=visibleFinished().filter(s=>s.date>=p.start&&s.date<=p.end).map(s=>s.id);
    if(!ids.length){toast('Tidak ada kegiatan pada periode laporan.',true);return}

    const all=reports();
    const rec={
      id:'R'+Date.now(),
      scope:scopeId(),
      start:p.start,
      end:p.end,
      ids,
      by:CU?.nama||CU?.username||'-',
      at:ubnbWibIso84()
    };
    all.push(rec);
    saveReports(all);
    selectedReport55=rec.id;
    renderReport55();
    toast('Laporan dibuat dan tersimpan di Riwayat Laporan.');
  };

  window.ppg55SelectReport=function(id){
    selectedReport55=id;
    renderReport55();
  };

  function renderReport55(){
    const el=document.getElementById('ppg-page-laporan');
    if(!el)return;

    const rr=visibleReports();
    if(!selectedReport55&&rr.length)selectedReport55=rr[0].id;
    const r=rr.find(x=>String(x.id)===String(selectedReport55))||rr[0]||null;
    if(r)selectedReport55=r.id;

    const n=nextPeriod();
    let content='<div class="ppg-empty">Belum ada laporan yang digenerate.</div>';

    if(r){
      const rows=reportSessions(r);
      const activeClasses=classes().filter(k=>rows.some(s=>s.className===k));
      content=`
        <div class="ppg37-report-toolbar">
          <div>
            <b>Periode ${esc(r.start)} s.d ${esc(r.end)}</b><br>
            <span class="ppg-mini-note">Dibuat oleh ${esc(r.by||'-')} · ${activeClasses.length} kelas</span>
          </div>
          <div class="ppg55-report-actions">
            <button class="ppg55-download" onclick="ppg55DownloadReportPDF('${esc(r.id)}',this)">Download PDF Presentasi</button>
          </div>
        </div>
        ${activeClasses.map(k=>classSummaryHtml(rows,k)).join('')||'<div class="ppg-empty">Tidak ada kelas pada laporan ini.</div>'}`;
    }

    el.innerHTML=`
      <div class="ppg-v33-stage">
        <div>
          <div class="ppg-v33-stage-title">Laporan PPG</div>
          <div class="ppg-v33-stage-sub">Setiap generate otomatis disimpan pada Riwayat Laporan.</div>
        </div>
      </div>

      <div class="ppg37-report-toolbar">
        <div>${n?`Periode berikutnya: <b>${esc(n.start)} s.d ${esc(n.end)}</b>`:'Tidak ada kegiatan baru yang belum dilaporkan.'}</div>
        <button class="ppg-btn" onclick="ppg37GenReport()" ${n?'':'disabled'}>Generate Laporan Berikutnya</button>
      </div>

      ${content}

      <div class="ppg-panel">
        <div class="ppg-panel-head">
          <div><div class="ppg-panel-title">Riwayat Laporan</div><div class="ppg-panel-sub">${rr.length} laporan tersimpan.</div></div>
        </div>
        <div class="ppg-panel-body">
          <div class="ppg55-report-history">
            ${rr.length?rr.map(x=>`
              <div class="ppg55-report-row ${String(x.id)===String(selectedReport55)?'active':''}">
                <b>${esc(x.start)}</b>
                <span>s.d ${esc(x.end)}<br><span class="ppg-mini-note">${reportIds(x).length} kegiatan · ${esc(x.by||'-')}</span></span>
                <span>${new Date(x.at||Date.now()).toLocaleDateString('id-ID')}</span>
                <button onclick="ppg55SelectReport('${esc(x.id)}')">Lihat</button>
              </div>`).join(''):'<div class="ppg-empty">Belum ada riwayat laporan.</div>'}
          </div>
        </div>
      </div>`;
  }

  /* ---------------- PDF PRESENTASI ---------------- */
  function statusShort(v){
    return v==='Hadir'?'H':v==='Izin'?'I':v==='Sakit'?'S':v==='Terlambat'?'T':v==='Tidak Hadir'?'TH':v==='Belum Hadir'?'B':'-';
  }

  function pivotTableHtml(p){
    if(!p.rows.length)return '<div style="font-size:11px;color:#7b8780">Tidak ada data.</div>';
    return `<table class="ppg55-slide-table">
      <thead><tr><th>Nama</th>${p.dates.map(d=>`<th>${esc(d.slice(5))}</th>`).join('')}<th>H</th><th>%</th></tr></thead>
      <tbody>${p.rows.map(r=>{
        const vals=p.dates.map(d=>r.st[d]||'—');
        const h=vals.filter(x=>x==='Hadir').length;
        const pct=p.dates.length?Math.round(h/p.dates.length*100):0;
        return `<tr><td>${esc(r.nama)}</td>${vals.map(v=>`<td>${statusShort(v)}</td>`).join('')}<td>${h}</td><td>${pct}%</td></tr>`;
      }).join('')}</tbody>
    </table>`;
  }

  function materialListHtml(list){
    if(!list.length)return '<span style="color:#7d8982">Belum ada.</span>';
    return `<ul>${list.map(x=>`<li>${esc(x.text)}${x.count>1?` <b>(${x.count}×)</b>`:''}</li>`).join('')}</ul>`;
  }

  function buildSlide(r,rows,k,index,total){
    const st=reportClassStats(rows,k);
    const pj=classPivot(rows,k,'jamaah');
    const ps=classPivot(rows,k,'simpatisan');
    const mt=classMaterials(rows,k);
    const teachers=[...new Set(classSessions(rows,k).map(s=>s.teacherName).filter(Boolean))];

    const slide=document.createElement('div');
    slide.className='ppg55-slide';
    slide.innerHTML=`
      <div class="ppg55-slide-head">
        <div>
          <div class="ppg55-slide-title">Laporan Kegiatan KBM</div>
          <div class="ppg55-slide-sub">PPG Perwira · Periode ${esc(r.start)} s.d ${esc(r.end)}</div>
        </div>
        <div>
          <div class="ppg55-slide-class">${esc(k)}</div>
          <div class="ppg55-slide-sub" style="text-align:right">Guru: ${esc(teachers.join(', ')||'-')}</div>
        </div>
      </div>

      <div class="ppg55-slide-content">
        <div class="ppg55-slide-kpis">
          <div class="ppg55-slide-kpi"><small>Kegiatan KBM</small><b>${st.sessions}</b></div>
          <div class="ppg55-slide-kpi"><small>Jumlah Murid</small><b>${st.people}</b></div>
          <div class="ppg55-slide-kpi"><small>Total Hadir</small><b>${st.hadir}/${st.total}</b></div>
          <div class="ppg55-slide-kpi"><small>Kehadiran</small><b>${st.pct}%</b></div>
        </div>

        <h3>Kehadiran Generus Jamaah</h3>
        ${pivotTableHtml(pj)}

        ${ps.rows.length?`<h3>Kehadiran Simpatisan</h3>${pivotTableHtml(ps)}`:''}

        <div class="ppg55-slide-materials">
          <div class="ppg55-slide-material-box"><b>Materi Umum</b>${materialListHtml(mt.umum)}</div>
          <div class="ppg55-slide-material-box"><b>Materi Khusus</b>${materialListHtml(mt.khusus)}</div>
        </div>
      </div>

      <div class="ppg55-slide-foot">
        <span>Dibuat: ${esc(r.by||'-')}</span>
        <span>${index+1}/${total}</span>
      </div>`;
    return slide;
  }

  function fitSlideContent(slide){
    const content=slide.querySelector('.ppg55-slide-content');
    if(!content)return;

    content.style.transform='none';
    content.style.width='100%';

    const availableH=650;
    const naturalH=content.scrollHeight;
    const naturalW=content.scrollWidth;
    const availableW=1024;

    const scale=Math.min(1,availableH/Math.max(naturalH,1),availableW/Math.max(naturalW,1));
    if(scale<1){
      content.style.transform=`scale(${scale})`;
      content.style.width=`${100/scale}%`;
    }
  }

  window.ppg55DownloadReportPDF=async function(reportId,btn){
    if(btn)btn.disabled=true;
    try{
      const r=reports().find(x=>String(x.id)===String(reportId));
      if(!r)throw new Error('Laporan tidak ditemukan.');

      const rows=reportSessions(r);
      const activeClasses=classes().filter(k=>rows.some(s=>s.className===k));
      if(!activeClasses.length)throw new Error('Tidak ada kelas pada laporan ini.');

      const jsPDFCtor=window.jspdf?.jsPDF;
      if(!jsPDFCtor)throw new Error('Library PDF belum siap.');
      if(typeof window.html2canvas!=='function')throw new Error('Library gambar PDF belum siap.');

      let stage=document.getElementById('ppg55-pdf-stage');
      if(!stage){
        stage=document.createElement('div');
        stage.id='ppg55-pdf-stage';
        document.body.appendChild(stage);
      }
      stage.innerHTML='';

      const slides=activeClasses.map((k,i)=>{
        const s=buildSlide(r,rows,k,i,activeClasses.length);
        stage.appendChild(s);
        fitSlideContent(s);
        return s;
      });

      const doc=new jsPDFCtor({orientation:'landscape',unit:'mm',format:'a4'});

      for(let i=0;i<slides.length;i++){
        if(i>0)doc.addPage('a4','landscape');
        const canvas=await window.html2canvas(slides[i],{
          scale:1.5,
          backgroundColor:'#ffffff',
          logging:false,
          useCORS:true
        });
        const img=canvas.toDataURL('image/jpeg',0.92);
        doc.addImage(img,'JPEG',0,0,297,210,undefined,'FAST');
      }

      doc.save(safeFile(`Laporan_PPG_${r.start}_sd_${r.end}`)+'.pdf');
      stage.innerHTML='';
    }catch(e){
      console.error(e);
      toast(e?.message||'Gagal membuat PDF laporan.',true);
    }finally{
      if(btn)btn.disabled=false;
    }
  };

  /* ---------------- ROUTE FINAL ---------------- */
  const priorOpen=window.ppgOpenPage;
  window.ppgOpenPage=function(page,btn){
    if(page==='laporan'){
      document.querySelectorAll('.ppg-page').forEach(x=>x.classList.remove('active'));
      document.querySelectorAll('.ppg-tab').forEach(x=>x.classList.remove('active'));
      document.getElementById('ppg-page-laporan')?.classList.add('active');
      btn?.classList.add('active');
      renderReport55();
      return;
    }
    return priorOpen?.apply(this,arguments);
  };

  window.ppg55RenderReport=renderReport55;
  window.ppg55RenderHistory=renderKBMHistory55;

  setTimeout(()=>{
    if(document.getElementById('ppg-page-laporan')?.classList.contains('active'))renderReport55();
  },1000);
})();

/* ============================================================
   SOURCE: ubnb-v56-compact-report-fix-script
   ============================================================ */
(function(){
  const SESSION_KEY='ubnb_ppg_v37_classes';
  const REPORT_KEY='ubnb_ppg_v37_reports';
  const DRAFT_KEY='ubnb_ppg_v33_class_drafts';
  const SYMP_KEY='ubnb_ppg_v38_simpatisan';

  const EXPORT_CLASSES=[
    'Cabe Rawit Tahap A',
    'Cabe Rawit Tahap B',
    'Cabe Rawit Tahap C',
    'Pra Remaja',
    'Remaja'
  ];

  let selectedReport56=null;

  const esc=s=>String(s??'').replace(/[&<>"']/g,m=>(
    {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]
  ));

  function get(k,d){
    try{return JSON.parse(localStorage.getItem(k)||JSON.stringify(d))}
    catch(_){return d}
  }
  function set(k,v){localStorage.setItem(k,JSON.stringify(v))}
  function scope(){
    try{return JSON.parse(sessionStorage.getItem('ubnb_ppg_v34_scope')||'null')}
    catch(_){return null}
  }
  function controller(){return scope()?.type==='controller'}
  function scopeId(){return controller()?'DESA':(scope()?.kelompok||'')}
  function sessions(){return get(SESSION_KEY,[])}
  function reports(){return get(REPORT_KEY,[])}
  function saveReports(v){set(REPORT_KEY,v)}
  function safeFile(s){return String(s||'data').replace(/[\\/:*?"<>|]+/g,'_').replace(/\s+/g,'_')}
  function today(){
    try{
      return new Intl.DateTimeFormat('en-CA',{
        timeZone:'Asia/Jakarta',year:'numeric',month:'2-digit',day:'2-digit'
      }).format(new Date())
    }catch(_){return ubnbWibIso84().slice(0,10)}
  }

  /* =======================================================
     TAB SCROLL: hide scrollbar + active tab smooth into view
     ======================================================= */
  function smoothActiveTab(){
    const active=document.querySelector('#ppg-shell .ppg-tab.active');
    if(active){
      try{active.scrollIntoView({behavior:'smooth',inline:'center',block:'nearest'})}catch(_){}
    }
  }

  const priorOpen56=window.ppgOpenPage;
  window.ppgOpenPage=function(page,btn){
    const r=priorOpen56?.apply(this,arguments);
    setTimeout(smoothActiveTab,0);
    return r;
  };

  /* =======================================================
     SETUP COMPACT TOOLBAR
     ======================================================= */
  function ensureCompactSetup(){
    const page=document.getElementById('ppg-page-setup');
    if(!page||!page.classList.contains('active'))return;

    // Hapus toolbar ringkas lama bila renderer membangun ulang halaman
    let bar=page.querySelector('.ppg56-setup-actions');
    if(!bar){
      const search=page.querySelector('.ppg42-searchbar');
      if(!search)return;

      bar=document.createElement('div');
      bar.className='ppg56-setup-actions';
      bar.innerHTML=`
        <button class="ppg56-action primary" onclick="ppg38OpenSimp()">+ Simpatisan</button>
        <button class="ppg56-action" onclick="ppg47OpenClassManager()">⚙ Kelas</button>
        <div class="ppg56-action-menu">
          <button class="ppg56-action" onclick="ppg56ToggleDownloadMenu(event)">⇩ Download</button>
          <div id="ppg56-download-menu" class="ppg56-download-menu">
            <button onclick="ppg56ExportSetupPNG();ppg56CloseDownloadMenu()">Gambar PNG</button>
            <button onclick="ppg56ExportSetupPDF();ppg56CloseDownloadMenu()">PDF A4</button>
          </div>
        </div>
        <button id="ppg56-collapse-toggle" class="ppg56-action" onclick="ppg56ToggleCollapse()">Collapse</button>`;
      search.parentNode.insertBefore(bar,search.nextSibling);
    }

    updateCollapseText();
  }

  window.ppg56ToggleDownloadMenu=function(ev){
    ev?.stopPropagation?.();
    document.getElementById('ppg56-download-menu')?.classList.toggle('show');
  };
  window.ppg56CloseDownloadMenu=function(){
    document.getElementById('ppg56-download-menu')?.classList.remove('show');
  };
  document.addEventListener('click',e=>{
    if(!e.target.closest('.ppg56-action-menu'))ppg56CloseDownloadMenu();
  });

  function expandedGroups(){
    return [...document.querySelectorAll('#ppg-page-setup .ppg39-group')]
      .filter(g=>!g.querySelector('.ppg39-body')?.classList.contains('collapsed'));
  }
  function updateCollapseText(){
    const b=document.getElementById('ppg56-collapse-toggle');
    if(!b)return;
    b.textContent=expandedGroups().length?'Collapse':'Expand';
  }
  window.ppg56ToggleCollapse=function(){
    if(expandedGroups().length)window.ppg38CollapseAll?.();
    else window.ppg38ExpandAll?.();
    setTimeout(()=>{
      ensureCompactSetup();
      updateCollapseText();
    },0);
  };

  const setupPage=document.getElementById('ppg-page-setup');
  if(setupPage){
    let st=0;
    new MutationObserver(()=>{
      clearTimeout(st);
      st=setTimeout(ensureCompactSetup,50);
    }).observe(setupPage,{childList:true,subtree:false});
  }
  setTimeout(ensureCompactSetup,900);

  /* =======================================================
     DATA MURID KBM — only A/B/C/Pra Remaja/Remaja
     ======================================================= */
  function setupRows(){
    const sc=scope();
    const drafts=get(DRAFT_KEY,{});

    let jamaah=(Array.isArray(aJamaah)?aJamaah:[])
      .filter(j=>j.status_nikah==='Belum Menikah')
      .filter(j=>j.status_sambung==='Tetap');

    if(sc?.type==='kelompok')jamaah=jamaah.filter(j=>j.kelompok_nama===sc.kelompok);

    const jrows=jamaah.map(j=>({
      did:String(j.did),
      nama:j.nama||'-',
      kk:j.nama_kk||'-',
      umur:(()=>{try{return umurFromTgl(j.tgl_lahir)}catch(_){return null}})(),
      kelas:drafts[String(j.did)]||j.kelas_kbm||j.kelas_usia||'Belum Ditentukan',
      kind:'jamaah'
    }));

    let simp=get(SYMP_KEY,[]);
    if(sc?.type==='kelompok')simp=simp.filter(x=>x.scope===sc.kelompok);

    const srows=simp.map(x=>({
      did:String(x.id),
      nama:x.nama||'-',
      kk:x.nama_kk||'-',
      umur:x.umur??null,
      kelas:x.kelas||'Belum Ditentukan',
      kind:'simpatisan'
    }));

    return [...jrows,...srows];
  }

  function exportGroups(){
    const rows=setupRows();
    return EXPORT_CLASSES.map(k=>({
      kelas:k,
      rows:rows.filter(x=>x.kelas===k)
        .sort((a,b)=>String(a.nama).localeCompare(String(b.nama),'id'))
    }));
  }

  function drawBoxPDF(doc,g,x,y,w,h){
    const rows=g.rows;
    doc.setDrawColor(205,219,210);
    doc.setFillColor(247,250,248);
    doc.roundedRect(x,y,w,h,2,2,'FD');

    doc.setFillColor(233,245,237);
    doc.rect(x,y,w,10,'F');
    doc.setTextColor(20,95,61);
    doc.setFont('helvetica','bold');
    doc.setFontSize(8.5);
    doc.text(g.kelas,x+3,y+6.4);

    doc.setFont('helvetica','normal');
    doc.setFontSize(6.5);
    doc.setTextColor(95,108,101);
    doc.text(`${rows.length} murid`,x+w-3,y+6.2,{align:'right'});

    const headY=y+10;
    const rowArea=h-10;
    const n=Math.max(rows.length,1);
    const rowH=Math.min(6.2,Math.max(2.8,rowArea/(n+1)));

    const noW=8, ageW=11, nameW=w-noW-ageW;
    doc.setFillColor(23,106,65);
    doc.rect(x,headY,w,rowH,'F');
    doc.setTextColor(255,255,255);
    doc.setFont('helvetica','bold');
    doc.setFontSize(Math.min(6.5,Math.max(4.8,rowH*1.15)));
    doc.text('No',x+noW/2,headY+rowH*.68,{align:'center'});
    doc.text('Nama / KK',x+noW+2,headY+rowH*.68);
    doc.text('Umur',x+w-ageW/2,headY+rowH*.68,{align:'center'});

    let cy=headY+rowH;
    rows.forEach((r,i)=>{
      if(i%2===1){
        doc.setFillColor(252,253,252);
        doc.rect(x,cy,w,rowH,'F');
      }
      doc.setDrawColor(230,236,232);
      doc.line(x,cy+rowH,x+w,cy+rowH);

      const fs=Math.min(6.4,Math.max(4.1,rowH*1.05));
      doc.setTextColor(35,52,43);
      doc.setFont('helvetica','normal');
      doc.setFontSize(fs);

      doc.text(String(i+1),x+noW/2,cy+rowH*.62,{align:'center'});

      const simp=r.kind==='simpatisan'?' (S)':'';
      const name=doc.splitTextToSize(`${r.nama}${simp}`,nameW-4)[0]||'';
      doc.text(name,x+noW+2,cy+rowH*.46);

      if(rowH>=4.2){
        doc.setTextColor(105,118,110);
        doc.setFontSize(Math.max(3.7,fs-1.4));
        const kk=doc.splitTextToSize(`KK: ${r.kk}`,nameW-4)[0]||'';
        doc.text(kk,x+noW+2,cy+rowH*.83);
      }

      doc.setTextColor(35,52,43);
      doc.setFontSize(fs);
      doc.text(r.umur==null?'-':String(r.umur),x+w-ageW/2,cy+rowH*.62,{align:'center'});
      cy+=rowH;
    });
  }

  window.ppg56ExportSetupPDF=function(){
    try{
      const jsPDFCtor=window.jspdf?.jsPDF;
      if(!jsPDFCtor)throw new Error('Library PDF belum siap.');

      const doc=new jsPDFCtor({orientation:'portrait',unit:'mm',format:'a4'});
      const groups=exportGroups();
      const scopeName=scope()?.type==='kelompok'?(scope()?.kelompok||'Kelompok'):'Desa Perwira';

      doc.setTextColor(20,95,61);
      doc.setFont('helvetica','bold');
      doc.setFontSize(14);
      doc.text(`Data Murid KBM - ${scopeName}`,10,11);

      doc.setTextColor(105,118,110);
      doc.setFont('helvetica','normal');
      doc.setFontSize(7);
      doc.text(`PPG Perwira · ${today()} · (S) = Simpatisan`,10,16);

      /* 2 kotak horizontal x 3 baris = 5 kelas dalam 1 halaman */
      const marginX=10, gapX=5, gapY=5, top=21, bottom=10;
      const boxW=(210-marginX*2-gapX)/2;
      const boxH=(297-top-bottom-gapY*2)/3;

      groups.forEach((g,i)=>{
        const col=i%2;
        const row=Math.floor(i/2);
        const x=marginX+col*(boxW+gapX);
        const y=top+row*(boxH+gapY);
        drawBoxPDF(doc,g,x,y,boxW,boxH);
      });

      doc.save(safeFile(`Data_Murid_KBM_${scopeName}_${today()}`)+'.pdf');
    }catch(e){
      console.error(e);
      toast(e?.message||'Gagal membuat PDF.',true);
    }
  };

  function drawCanvasBox(ctx,g,x,y,w,h,scale){
    const rows=g.rows;
    ctx.fillStyle='#f8fbf9';
    ctx.strokeStyle='#cddbd2';
    ctx.lineWidth=1*scale;
    ctx.beginPath();
    ctx.roundRect(x,y,w,h,6*scale);
    ctx.fill();ctx.stroke();

    const hh=34*scale;
    ctx.fillStyle='#e9f5ed';
    ctx.fillRect(x,y,w,hh);
    ctx.fillStyle='#145f3d';
    ctx.font=`700 ${12*scale}px Arial`;
    ctx.fillText(g.kelas,x+9*scale,y+22*scale);
    ctx.fillStyle='#66766d';
    ctx.font=`${9*scale}px Arial`;
    ctx.textAlign='right';
    ctx.fillText(`${rows.length} murid`,x+w-9*scale,y+21*scale);
    ctx.textAlign='left';

    const tableY=y+hh;
    const n=Math.max(rows.length,1);
    const rowH=Math.min(24*scale,Math.max(11*scale,(h-hh)/(n+1)));
    const noW=30*scale, ageW=42*scale;

    ctx.fillStyle='#176a41';
    ctx.fillRect(x,tableY,w,rowH);
    ctx.fillStyle='#fff';
    ctx.font=`700 ${Math.min(10*scale,rowH*.55)}px Arial`;
    ctx.fillText('No',x+8*scale,tableY+rowH*.68);
    ctx.fillText('Nama / KK',x+noW+4*scale,tableY+rowH*.68);
    ctx.textAlign='center';
    ctx.fillText('Umur',x+w-ageW/2,tableY+rowH*.68);
    ctx.textAlign='left';

    let cy=tableY+rowH;
    rows.forEach((r,i)=>{
      if(i%2===1){
        ctx.fillStyle='#fff';
        ctx.fillRect(x,cy,w,rowH);
      }
      ctx.strokeStyle='#e6ece8';
      ctx.beginPath();ctx.moveTo(x,cy+rowH);ctx.lineTo(x+w,cy+rowH);ctx.stroke();

      const fs=Math.max(6*scale,Math.min(9.5*scale,rowH*.42));
      ctx.fillStyle='#24362c';
      ctx.font=`${fs}px Arial`;
      ctx.textAlign='center';
      ctx.fillText(String(i+1),x+noW/2,cy+rowH*.62);
      ctx.textAlign='left';

      const maxChars=Math.max(8,Math.floor((w-noW-ageW)/(fs*.58)));
      const nm=(r.nama+(r.kind==='simpatisan'?' (S)':''));
      ctx.fillText(nm.length>maxChars?nm.slice(0,maxChars-1)+'…':nm,x+noW+4*scale,cy+rowH*.43);

      if(rowH>=15*scale){
        ctx.fillStyle='#6f7d75';
        ctx.font=`${Math.max(5*scale,fs*.72)}px Arial`;
        const kk=`KK: ${r.kk}`;
        ctx.fillText(kk.length>maxChars?kk.slice(0,maxChars-1)+'…':kk,x+noW+4*scale,cy+rowH*.79);
      }

      ctx.fillStyle='#24362c';
      ctx.font=`${fs}px Arial`;
      ctx.textAlign='center';
      ctx.fillText(r.umur==null?'-':String(r.umur),x+w-ageW/2,cy+rowH*.62);
      ctx.textAlign='left';
      cy+=rowH;
    });
  }

  window.ppg56ExportSetupPNG=function(){
    try{
      const groups=exportGroups();
      const c=document.createElement('canvas');
      c.width=794;
      c.height=1123;
      const ctx=c.getContext('2d');
      const scale=1;

      ctx.fillStyle='#fff';ctx.fillRect(0,0,c.width,c.height);
      ctx.fillStyle='#145f3d';ctx.font='700 22px Arial';
      const scopeName=scope()?.type==='kelompok'?(scope()?.kelompok||'Kelompok'):'Desa Perwira';
      ctx.fillText(`Data Murid KBM - ${scopeName}`,38,42);
      ctx.fillStyle='#6b7971';ctx.font='11px Arial';
      ctx.fillText(`PPG Perwira · ${today()} · (S) = Simpatisan`,38,61);

      const mx=38,gx=16,gy=16,top=76,bottom=32;
      const bw=(c.width-mx*2-gx)/2;
      const bh=(c.height-top-bottom-gy*2)/3;

      groups.forEach((g,i)=>{
        const col=i%2,row=Math.floor(i/2);
        drawCanvasBox(ctx,g,mx+col*(bw+gx),top+row*(bh+gy),bw,bh,scale);
      });

      c.toBlob(blob=>{
        if(!blob)return toast('Gagal membuat gambar.',true);
        const url=URL.createObjectURL(blob);
        const a=document.createElement('a');
        a.href=url;
        a.download=safeFile(`Data_Murid_KBM_${scopeName}_${today()}`)+'.png';
        document.body.appendChild(a);a.click();a.remove();
        setTimeout(()=>URL.revokeObjectURL(url),1000);
      },'image/png');
    }catch(e){
      console.error(e);
      toast(e?.message||'Gagal membuat gambar.',true);
    }
  };

  /* =======================================================
     LAPORAN — clearer concept + robust buttons
     ======================================================= */
  function visibleFinished(){
    let rows=sessions().filter(s=>s.status==='finished');
    if(!controller())rows=rows.filter(s=>s.scope===scopeId());
    return rows.sort((a,b)=>String(a.date).localeCompare(String(b.date)));
  }

  function visibleReports(){
    return reports()
      .filter(r=>controller()||r.scope===scopeId())
      .sort((a,b)=>String(b.end||'').localeCompare(String(a.end||'')) || String(b.at||'').localeCompare(String(a.at||'')));
  }
  function reportIds(r){
    return Array.isArray(r?.ids)?r.ids:(Array.isArray(r?.session_ids)?r.session_ids:[]);
  }
  function reportSessions(r){
    const ids=new Set(reportIds(r).map(String));
    return sessions().filter(s=>ids.has(String(s.id)));
  }
  function dayAfter(d){
    const x=new Date(d+'T00:00:00');x.setDate(x.getDate()+1);return x.toISOString().slice(0,10)
  }
  function plus30(d){
    const x=new Date(d+'T00:00:00');x.setDate(x.getDate()+30);return x.toISOString().slice(0,10)
  }
  function nextPeriod(){
    const done=visibleFinished();
    if(!done.length)return null;
    const rr=visibleReports().slice().sort((a,b)=>String(a.end||'').localeCompare(String(b.end||'')));
    const start=rr.length?dayAfter(rr[rr.length-1].end):done[0].date;
    const latest=done[done.length-1].date;
    if(start>latest)return null;
    const cap=plus30(start);
    return {start,end:latest<cap?latest:cap};
  }

  function studentKind(x){
    if(x?.kind==='simpatisan'||String(x?.did||'').startsWith('SYM-'))return 'simpatisan';
    return 'jamaah';
  }
  function generalMaterials(s){return s.generalMaterials||s.general_materials||[]}
  function studentMaterials(s){return s.studentMaterials||s.student_materials||{}}

  function classSessions(rows,k){return rows.filter(s=>s.className===k)}
  function classStats(rows,k){
    const ss=classSessions(rows,k);
    const people=new Set();
    let hadir=0,total=0;
    ss.forEach(s=>(s.students||[]).forEach(x=>{
      people.add(String(x.did));total++;
      if(x.status==='Hadir')hadir++;
    }));
    const umum=new Set(),khusus=new Set();
    ss.forEach(s=>{
      generalMaterials(s).forEach(m=>umum.add((m?.text||String(m||'')).trim()).filter?.(Boolean));
      Object.values(studentMaterials(s)).flat().forEach(m=>khusus.add((m?.text||String(m||'')).trim()).filter?.(Boolean));
    });
    return {
      sessions:ss.length,
      people:people.size,
      hadir,total,
      pct:total?Math.round(hadir/total*100):0,
      umum:[...umum].filter(Boolean).length,
      khusus:[...khusus].filter(Boolean).length
    };
  }

  // JS Set has no filter; normalize materials safely
  function materialCounts(rows,k){
    const umum=new Set(),khusus=new Set();
    classSessions(rows,k).forEach(s=>{
      generalMaterials(s).forEach(m=>{
        const t=(m?.text||String(m||'')).trim();if(t)umum.add(t);
      });
      Object.values(studentMaterials(s)).flat().forEach(m=>{
        const t=(m?.text||String(m||'')).trim();if(t)khusus.add(t);
      });
    });
    return {umum:umum.size,khusus:khusus.size};
  }

  window.ppg37GenReport=function(){
    const p=nextPeriod();
    if(!p){toast('Belum ada kegiatan baru untuk laporan.',true);return}

    const ids=visibleFinished().filter(s=>s.date>=p.start&&s.date<=p.end).map(s=>s.id);
    if(!ids.length){toast('Tidak ada kegiatan pada periode tersebut.',true);return}

    const all=reports();
    const rec={
      id:'R'+Date.now(),
      scope:scopeId(),
      start:p.start,
      end:p.end,
      ids,
      by:CU?.nama||CU?.username||'-',
      at:ubnbWibIso84()
    };
    all.push(rec);saveReports(all);
    selectedReport56=rec.id;
    renderReport();
    toast('Laporan dibuat dan otomatis masuk Riwayat Laporan.');
  };

  function currentReport(){
    const rr=visibleReports();
    if(!selectedReport56&&rr.length)selectedReport56=rr[0].id;
    const r=rr.find(x=>String(x.id)===String(selectedReport56))||rr[0]||null;
    if(r)selectedReport56=r.id;
    return r;
  }

  function renderReport(){
    const el=document.getElementById('ppg-page-laporan');
    if(!el)return;

    const rr=visibleReports();
    const r=currentReport();
    const n=nextPeriod();

    let selectedHtml='<div class="ppg56-report-note">Belum ada laporan. Generate laporan pertama dari kegiatan KBM yang sudah selesai.</div>';

    if(r){
      const rows=reportSessions(r);
      const activeClasses=[...new Set(rows.map(s=>s.className).filter(Boolean))];
      const totalKBM=rows.length;
      const uniqueStudents=new Set(rows.flatMap(s=>(s.students||[]).map(x=>String(x.did)))).size;
      let hadir=0,total=0;
      rows.forEach(s=>(s.students||[]).forEach(x=>{total++;if(x.status==='Hadir')hadir++}));
      const pct=total?Math.round(hadir/total*100):0;

      selectedHtml=`
        <div class="ppg56-generate-row">
          <div>
            <b style="color:#175a3a">Periode ${esc(r.start)} s.d ${esc(r.end)}</b><br>
            <span class="ppg56-report-note">Dibuat ${ubnbFmtWib84(r.at||Date.now(),false)} oleh ${esc(r.by||'-')}</span>
          </div>
          <div class="ppg56-report-buttons">
            <button id="ppg56-download-report" class="ppg56-report-btn primary" type="button">Download PDF Presentasi</button>
          </div>
        </div>
        <div class="ppg56-report-summary">
          <div class="ppg56-kpi"><small>Kegiatan KBM</small><b>${totalKBM}</b></div>
          <div class="ppg56-kpi"><small>Kelas</small><b>${activeClasses.length}</b></div>
          <div class="ppg56-kpi"><small>Murid</small><b>${uniqueStudents}</b></div>
          <div class="ppg56-kpi"><small>Kehadiran</small><b>${pct}%</b></div>
        </div>
        <div class="ppg56-class-list">
          ${activeClasses.map(k=>{
            const st=classStats(rows,k),mc=materialCounts(rows,k);
            return `<div class="ppg56-class-card">
              <b>${esc(k)}</b>
              <span>${st.sessions} KBM · ${st.people} murid · Kehadiran ${st.pct}%</span>
              <span>Materi: ${mc.umum} umum · ${mc.khusus} khusus</span>
            </div>`;
          }).join('')}
        </div>`;
    }

    el.innerHTML=`
      <div class="ppg56-report-flow">
        <section class="ppg56-report-card">
          <div class="ppg56-report-card-head"><b><span class="ppg56-step">1</span>Generate Periode Baru</b></div>
          <div class="ppg56-report-body">
            <div class="ppg56-generate-row">
              <div class="ppg56-report-note">
                Generate mengambil <b>KBM yang sudah selesai</b> mulai setelah laporan terakhir sampai kegiatan terbaru, maksimal sekitar 1 bulan.
                Setelah dibuat, laporan otomatis tersimpan.
                ${n?`<br><b>Periode berikutnya: ${esc(n.start)} s.d ${esc(n.end)}</b>`:'<br><b>Tidak ada kegiatan baru yang belum dilaporkan.</b>'}
              </div>
              <button id="ppg56-generate-report" class="ppg56-report-btn primary" type="button" ${n?'':'disabled'}>Generate Laporan</button>
            </div>
          </div>
        </section>

        <section id="ppg56-selected-report" class="ppg56-report-card">
          <div class="ppg56-report-card-head"><b><span class="ppg56-step">2</span>Laporan Terpilih</b></div>
          <div class="ppg56-report-body">${selectedHtml}</div>
        </section>

        <section class="ppg56-report-card">
          <div class="ppg56-report-card-head"><b><span class="ppg56-step">3</span>Riwayat Laporan</b><span class="ppg56-report-note">${rr.length} laporan</span></div>
          <div class="ppg56-report-body">
            <div id="ppg56-report-history" class="ppg56-history">
              ${rr.length?rr.map(x=>`
                <div class="ppg56-history-row ${String(x.id)===String(selectedReport56)?'active':''}" data-report-id="${esc(x.id)}">
                  <b>${esc(x.start)}</b>
                  <span>s.d ${esc(x.end)} · ${reportIds(x).length} kegiatan<br>${esc(x.by||'-')}</span>
                  <span class="view">Lihat ›</span>
                </div>`).join(''):'<div class="ppg56-report-note">Belum ada riwayat laporan.</div>'}
            </div>
          </div>
        </section>
      </div>`;

    document.getElementById('ppg56-generate-report')?.addEventListener('click',()=>window.ppg37GenReport());
    document.getElementById('ppg56-download-report')?.addEventListener('click',function(){
      window.ppg56DownloadReportPDF(selectedReport56,this);
    });

    document.querySelectorAll('#ppg56-report-history .ppg56-history-row').forEach(row=>{
      row.addEventListener('click',()=>{
        selectedReport56=row.dataset.reportId;
        renderReport();
        setTimeout(()=>{
          document.getElementById('ppg56-selected-report')?.scrollIntoView({behavior:'smooth',block:'start'});
        },0);
      });
    });
  }

  /* =======================================================
     PDF PRESENTASI — direct jsPDF, no html2canvas dependency
     1 kelas = tepat 1 halaman
     ======================================================= */
  function statusShort(v){
    return v==='Hadir'?'H':
      v==='Izin'?'I':
      v==='Sakit'?'S':
      v==='Terlambat'?'T':
      v==='Tidak Hadir'?'TH':
      v==='Belum Hadir'?'B':'-';
  }

  function classPivot(rows,k){
    const ss=classSessions(rows,k);
    const dates=[...new Set(ss.map(s=>s.date))].sort();
    const map=new Map();

    ss.forEach(s=>(s.students||[]).forEach(x=>{
      const key=String(x.did);
      if(!map.has(key))map.set(key,{
        nama:x.nama||'-',
        kind:studentKind(x),
        st:{}
      });
      map.get(key).st[s.date]=x.status||'—';
    }));

    return {dates,rows:[...map.values()].sort((a,b)=>String(a.nama).localeCompare(String(b.nama),'id'))};
  }

  function materialsForClass(rows,k){
    const umum=new Map(),khusus=new Map();
    classSessions(rows,k).forEach(s=>{
      generalMaterials(s).forEach(m=>{
        const t=(m?.text||String(m||'')).trim();if(!t)return;
        const key=t.toLowerCase();
        umum.set(key,{text:t,count:(umum.get(key)?.count||0)+1});
      });
      Object.values(studentMaterials(s)).flat().forEach(m=>{
        const t=(m?.text||String(m||'')).trim();if(!t)return;
        const key=t.toLowerCase();
        khusus.set(key,{text:t,count:(khusus.get(key)?.count||0)+1});
      });
    });
    return {umum:[...umum.values()],khusus:[...khusus.values()]};
  }

  function truncate(doc,text,w,fs){
    let s=String(text||'');
    doc.setFontSize(fs);
    if(doc.getTextWidth(s)<=w)return s;
    while(s.length>1&&doc.getTextWidth(s+'…')>w)s=s.slice(0,-1);
    return s+'…';
  }

  function drawAttendanceMatrix(doc,pivot,x,y,w,maxH){
    const dates=pivot.dates;
    const rows=pivot.rows;
    const nameW=Math.min(54,Math.max(42,w*.20));
    const totalW=10,pctW=11;
    const dateArea=Math.max(20,w-nameW-totalW-pctW);
    const dateW=dates.length?dateArea/dates.length:dateArea;

    const rowCount=Math.max(rows.length,1);
    const headerH=7;
    const rowH=Math.min(4.3,Math.max(2.5,(maxH-headerH)/rowCount));
    const fs=Math.min(6.2,Math.max(4.2,rowH*1.3));
    const tableH=headerH+rowH*rowCount;

    doc.setDrawColor(218,228,221);
    doc.setFillColor(23,106,65);
    doc.rect(x,y,w,headerH,'F');

    doc.setFont('helvetica','bold');
    doc.setFontSize(5.8);
    doc.setTextColor(255,255,255);
    doc.text('Nama',x+2,y+4.6);
    dates.forEach((d,i)=>{
      const cx=x+nameW+dateW*i+dateW/2;
      doc.text(d.slice(-2),cx,y+4.6,{align:'center'});
    });
    doc.text('H',x+nameW+dateArea+totalW/2,y+4.6,{align:'center'});
    doc.text('%',x+w-pctW/2,y+4.6,{align:'center'});

    let cy=y+headerH;
    rows.forEach((r,ri)=>{
      if(ri%2===1){
        doc.setFillColor(249,251,250);
        doc.rect(x,cy,w,rowH,'F');
      }
      doc.setDrawColor(229,235,231);
      doc.line(x,cy+rowH,x+w,cy+rowH);

      doc.setFont('helvetica','normal');
      doc.setFontSize(fs);
      doc.setTextColor(35,51,43);
      const tag=r.kind==='simpatisan'?' (S)':'';
      doc.text(truncate(doc,r.nama+tag,nameW-3,fs),x+1.5,cy+rowH*.67);

      const vals=dates.map(d=>r.st[d]||'—');
      vals.forEach((v,i)=>{
        doc.text(statusShort(v),x+nameW+dateW*i+dateW/2,cy+rowH*.67,{align:'center'});
      });
      const h=vals.filter(v=>v==='Hadir').length;
      const pct=dates.length?Math.round(h/dates.length*100):0;
      doc.text(String(h),x+nameW+dateArea+totalW/2,cy+rowH*.67,{align:'center'});
      doc.text(`${pct}%`,x+w-pctW/2,cy+rowH*.67,{align:'center'});
      cy+=rowH;
    });

    if(!rows.length){
      doc.setFont('helvetica','normal');doc.setFontSize(6);doc.setTextColor(120,130,124);
      doc.text('Tidak ada data murid.',x+2,y+headerH+4);
    }

    return Math.min(tableH,maxH);
  }

  function materialText(list,maxItems=7){
    if(!list.length)return ['Belum ada.'];
    return list.slice(0,maxItems).map(x=>`• ${x.text}${x.count>1?` (${x.count}x)`:''}`)
      .concat(list.length>maxItems?[`• +${list.length-maxItems} materi lainnya`]:[]);
  }

  function drawPresentationPage(doc,r,rows,k,pageNo,totalPages){
    const pageW=297,pageH=210,margin=12;
    const ss=classSessions(rows,k);
    const st=classStats(rows,k);
    const pivot=classPivot(rows,k);
    const mats=materialsForClass(rows,k);
    const gurus=[...new Set(ss.map(s=>s.teacherName).filter(Boolean))];

    // Header
    doc.setFillColor(20,95,61);
    doc.rect(0,0,pageW,28,'F');
    doc.setTextColor(255,255,255);
    doc.setFont('helvetica','bold');doc.setFontSize(16);
    doc.text('Laporan Kegiatan KBM',margin,11);
    doc.setFontSize(10);
    doc.text(k,margin,20);

    doc.setFont('helvetica','normal');doc.setFontSize(7.5);
    doc.text(`Periode ${r.start} s.d ${r.end}`,pageW-margin,10,{align:'right'});
    doc.text(`Guru: ${gurus.join(', ')||'-'}`,pageW-margin,17,{align:'right'});
    doc.text(`PPG Perwira`,pageW-margin,23,{align:'right'});

    // KPI
    const ky=34,kGap=4,kW=(pageW-margin*2-kGap*3)/4;
    const kpis=[
      ['Kegiatan',String(st.sessions)],
      ['Murid',String(st.people)],
      ['Total Hadir',`${st.hadir}/${st.total}`],
      ['Kehadiran',`${st.pct}%`]
    ];
    kpis.forEach((x,i)=>{
      const xx=margin+i*(kW+kGap);
      doc.setFillColor(245,250,247);doc.setDrawColor(218,228,221);
      doc.roundedRect(xx,ky,kW,16,2,2,'FD');
      doc.setTextColor(110,124,116);doc.setFont('helvetica','normal');doc.setFontSize(6.5);
      doc.text(x[0],xx+3,ky+5);
      doc.setTextColor(21,93,58);doc.setFont('helvetica','bold');doc.setFontSize(11);
      doc.text(x[1],xx+3,ky+12);
    });

    // Attendance
    const tableY=56;
    doc.setTextColor(21,90,58);doc.setFont('helvetica','bold');doc.setFontSize(8);
    doc.text('Performa Kehadiran Murid',margin,tableY);
    const matrixY=tableY+3;
    const matrixH=93;
    drawAttendanceMatrix(doc,pivot,margin,matrixY,pageW-margin*2,matrixH);

    // Materials fixed lower area
    const my=158,boxGap=5,boxW=(pageW-margin*2-boxGap)/2,boxH=37;
    [
      ['Materi Umum',mats.umum,margin],
      ['Materi Khusus',mats.khusus,margin+boxW+boxGap]
    ].forEach(([title,list,x])=>{
      doc.setFillColor(250,252,251);doc.setDrawColor(220,229,223);
      doc.roundedRect(x,my,boxW,boxH,2,2,'FD');
      doc.setTextColor(21,90,58);doc.setFont('helvetica','bold');doc.setFontSize(7.5);
      doc.text(title,x+3,my+6);
      doc.setFont('helvetica','normal');doc.setTextColor(65,82,72);doc.setFontSize(6);
      const lines=materialText(list,7);
      let yy=my+11;
      lines.forEach(t=>{
        const wrapped=doc.splitTextToSize(t,boxW-6);
        wrapped.slice(0,2).forEach(line=>{
          if(yy<my+boxH-3){doc.text(line,x+3,yy);yy+=3.5}
        });
      });
    });

    doc.setTextColor(130,142,135);doc.setFont('helvetica','normal');doc.setFontSize(6);
    doc.text(`Dibuat oleh ${r.by||'-'} · ${ubnbFmtWibDate84(r.at||Date.now())}`,margin,pageH-5);
    doc.text(`${pageNo}/${totalPages}`,pageW-margin,pageH-5,{align:'right'});
  }

  window.ppg56DownloadReportPDF=function(reportId,btn){
    if(btn)btn.disabled=true;
    try{
      const r=reports().find(x=>String(x.id)===String(reportId));
      if(!r)throw new Error('Laporan tidak ditemukan.');

      const rows=reportSessions(r);
      const activeClasses=[...new Set(rows.map(s=>s.className).filter(Boolean))];
      if(!activeClasses.length)throw new Error('Tidak ada kelas pada laporan ini.');

      const jsPDFCtor=window.jspdf?.jsPDF;
      if(!jsPDFCtor)throw new Error('Library PDF belum siap.');

      const doc=new jsPDFCtor({orientation:'landscape',unit:'mm',format:'a4'});
      activeClasses.forEach((k,i)=>{
        if(i>0)doc.addPage('a4','landscape');
        drawPresentationPage(doc,r,rows,k,i+1,activeClasses.length);
      });

      doc.save(safeFile(`Laporan_PPG_${r.start}_sd_${r.end}`)+'.pdf');
    }catch(e){
      console.error(e);
      toast(e?.message||'Gagal membuat PDF laporan.',true);
    }finally{
      if(btn)btn.disabled=false;
    }
  };

  // Alias old broken handler to robust v56
  window.ppg55DownloadReportPDF=window.ppg56DownloadReportPDF;
  window.ppg55SelectReport=function(id){
    selectedReport56=id;
    renderReport();
    setTimeout(()=>document.getElementById('ppg56-selected-report')?.scrollIntoView({behavior:'smooth',block:'start'}),0);
  };

  /* Final report route override */
  const routeBeforeReport56=window.ppgOpenPage;
  window.ppgOpenPage=function(page,btn){
    if(page==='laporan'){
      document.querySelectorAll('.ppg-page').forEach(x=>x.classList.remove('active'));
      document.querySelectorAll('.ppg-tab').forEach(x=>x.classList.remove('active'));
      document.getElementById('ppg-page-laporan')?.classList.add('active');
      btn?.classList.add('active');
      renderReport();
      setTimeout(smoothActiveTab,0);
      return;
    }
    const r=routeBeforeReport56?.apply(this,arguments);
    if(page==='setup')setTimeout(ensureCompactSetup,0);
    return r;
  };

  window.ppg56RenderReport=renderReport;

  setTimeout(()=>{
    if(document.getElementById('ppg-page-setup')?.classList.contains('active'))ensureCompactSetup();
    if(document.getElementById('ppg-page-laporan')?.classList.contains('active'))renderReport();
  },1000);
})();

/* ============================================================
   SOURCE: ubnb-v57-export-report-font-fix-script
   ============================================================ */
(function(){
  const DRAFT_KEY='ubnb_ppg_v33_class_drafts';
  const SYMP_KEY='ubnb_ppg_v38_simpatisan';
  const SESSION_KEY='ubnb_ppg_v37_classes';
  const REPORT_KEY='ubnb_ppg_v37_reports';

  let menuPlaceholder57=null;

  function get(k,d){
    try{return JSON.parse(localStorage.getItem(k)||JSON.stringify(d))}
    catch(_){return d}
  }
  function scope(){
    try{return JSON.parse(sessionStorage.getItem('ubnb_ppg_v34_scope')||'null')}
    catch(_){return null}
  }
  function today(){
    try{
      return new Intl.DateTimeFormat('en-CA',{
        timeZone:'Asia/Jakarta',year:'numeric',month:'2-digit',day:'2-digit'
      }).format(new Date())
    }catch(_){return ubnbWibIso84().slice(0,10)}
  }
  function safeFile(s){
    return String(s||'data')
      .replace(/[\\/:*?"<>|]+/g,'_')
      .replace(/\s+/g,'_');
  }
  function normGender(v){
    const s=String(v||'').trim().toLowerCase();
    if(['l','lk','laki','laki-laki','pria','male'].includes(s))return 'L';
    if(['p','pr','perempuan','wanita','female'].includes(s))return 'P';
    return '';
  }

  /* =====================================================
     FIX DROPDOWN DOWNLOAD TERTUTUP
     Menu dipindah ke document.body ketika dibuka.
     ===================================================== */
  function restoreDownloadMenu57(){
    const menu=document.getElementById('ppg56-download-menu');
    if(menu && menuPlaceholder57?.parentNode){
      menuPlaceholder57.parentNode.insertBefore(menu,menuPlaceholder57);
      menuPlaceholder57.remove();
      menuPlaceholder57=null;
    }
    if(menu){
      menu.style.position='';
      menu.style.left='';
      menu.style.right='';
      menu.style.top='';
      menu.style.width='';
      menu.style.zIndex='';
    }
  }

  window.ppg56ToggleDownloadMenu=function(ev){
    ev?.stopPropagation?.();
    const trigger=ev?.currentTarget || ev?.target;
    const menu=document.getElementById('ppg56-download-menu');
    if(!trigger||!menu)return;

    if(menu.classList.contains('show')){
      menu.classList.remove('show');
      restoreDownloadMenu57();
      return;
    }

    if(!menuPlaceholder57){
      menuPlaceholder57=document.createComment('ppg56-download-menu-placeholder');
      menu.parentNode?.insertBefore(menuPlaceholder57,menu);
    }

    const r=trigger.getBoundingClientRect();
    document.body.appendChild(menu);

    menu.classList.add('show');
    menu.style.position='fixed';
    menu.style.zIndex='99999';
    menu.style.top=(r.bottom+4)+'px';
    menu.style.width='158px';
    menu.style.left=Math.max(8,Math.min(r.left,window.innerWidth-166))+'px';
    menu.style.right='auto';
  };

  window.ppg56CloseDownloadMenu=function(){
    const menu=document.getElementById('ppg56-download-menu');
    menu?.classList.remove('show');
    restoreDownloadMenu57();
  };

  window.addEventListener('resize',()=>window.ppg56CloseDownloadMenu(),{passive:true});
  document.querySelector('#ppg-shell .ppg-body')?.addEventListener('scroll',()=>{
    window.ppg56CloseDownloadMenu();
  },{passive:true});

  /* =====================================================
     EXPORT DATA MURID KBM
     Layout 1 lembar A4 portrait:
     row 1: A | B
     row 2: C | Pra Remaja
     row 3: Remaja Laki-laki | Remaja Perempuan
     ===================================================== */
  function exportRows57(){
    const sc=scope();
    const drafts=get(DRAFT_KEY,{});

    let jamaah=(Array.isArray(aJamaah)?aJamaah:[])
      .filter(j=>j.status_nikah==='Belum Menikah')
      .filter(j=>j.status_sambung==='Tetap');

    if(sc?.type==='kelompok'){
      jamaah=jamaah.filter(j=>j.kelompok_nama===sc.kelompok);
    }

    const jrows=jamaah.map(j=>({
      did:String(j.did),
      nama:j.nama||'-',
      kk:j.nama_kk||'-',
      umur:(()=>{try{return umurFromTgl(j.tgl_lahir)}catch(_){return null}})(),
      kelas:drafts[String(j.did)]||j.kelas_kbm||j.kelas_usia||'Belum Ditentukan',
      kind:'jamaah',
      gender:normGender(j.jenis_kelamin)
    }));

    let simp=get(SYMP_KEY,[]);
    if(sc?.type==='kelompok'){
      simp=simp.filter(x=>x.scope===sc.kelompok);
    }

    const srows=simp.map(x=>({
      did:String(x.id),
      nama:x.nama||'-',
      kk:x.nama_kk||'-',
      umur:x.umur??null,
      kelas:x.kelas||'Belum Ditentukan',
      kind:'simpatisan',
      gender:normGender(x.jenis_kelamin||x.gender)
    }));

    return [...jrows,...srows];
  }

  function exportGroups57(){
    const rows=exportRows57();
    const remaja=rows.filter(x=>x.kelas==='Remaja');
    return {
      groups:[
        {kelas:'Cabe Rawit Tahap A',rows:rows.filter(x=>x.kelas==='Cabe Rawit Tahap A')},
        {kelas:'Cabe Rawit Tahap B',rows:rows.filter(x=>x.kelas==='Cabe Rawit Tahap B')},
        {kelas:'Cabe Rawit Tahap C',rows:rows.filter(x=>x.kelas==='Cabe Rawit Tahap C')},
        {kelas:'Pra Remaja',rows:rows.filter(x=>x.kelas==='Pra Remaja')},
        {kelas:'Remaja Laki-laki',rows:remaja.filter(x=>x.gender==='L')},
        {kelas:'Remaja Perempuan',rows:remaja.filter(x=>x.gender==='P')}
      ].map(g=>({...g,rows:g.rows.sort((a,b)=>String(a.nama).localeCompare(String(b.nama),'id'))})),
      unknownRemaja:remaja.filter(x=>!x.gender)
    };
  }

  function drawPdfBox57(doc,g,x,y,w,h){
    const rows=g.rows;
    doc.setDrawColor(205,219,210);
    doc.setFillColor(248,251,249);
    doc.roundedRect(x,y,w,h,2,2,'FD');

    doc.setFillColor(233,245,237);
    doc.rect(x,y,w,10,'F');

    doc.setTextColor(20,95,61);
    doc.setFont('helvetica','bold');
    doc.setFontSize(8.3);
    doc.text(g.kelas,x+3,y+6.4);

    doc.setFont('helvetica','normal');
    doc.setFontSize(6.4);
    doc.setTextColor(95,108,101);
    doc.text(`${rows.length} murid`,x+w-3,y+6.2,{align:'right'});

    const headY=y+10;
    const rowArea=h-10;
    const rowH=Math.min(6.3,Math.max(2.75,rowArea/(Math.max(rows.length,1)+1)));
    const noW=8,ageW=11,nameW=w-noW-ageW;

    doc.setFillColor(23,106,65);
    doc.rect(x,headY,w,rowH,'F');
    doc.setTextColor(255,255,255);
    doc.setFont('helvetica','bold');
    doc.setFontSize(Math.min(6.4,Math.max(4.8,rowH*1.13)));
    doc.text('No',x+noW/2,headY+rowH*.68,{align:'center'});
    doc.text('Nama / KK',x+noW+2,headY+rowH*.68);
    doc.text('Umur',x+w-ageW/2,headY+rowH*.68,{align:'center'});

    let cy=headY+rowH;
    rows.forEach((r,i)=>{
      if(i%2===1){
        doc.setFillColor(253,254,253);
        doc.rect(x,cy,w,rowH,'F');
      }
      doc.setDrawColor(230,236,232);
      doc.line(x,cy+rowH,x+w,cy+rowH);

      const fs=Math.min(6.3,Math.max(4.05,rowH*1.03));
      doc.setFont('helvetica','normal');
      doc.setFontSize(fs);
      doc.setTextColor(35,52,43);

      doc.text(String(i+1),x+noW/2,cy+rowH*.62,{align:'center'});

      const simp=r.kind==='simpatisan'?' (S)':'';
      const name=doc.splitTextToSize(`${r.nama}${simp}`,nameW-4)[0]||'';
      doc.text(name,x+noW+2,cy+rowH*.44);

      if(rowH>=4.15){
        doc.setTextColor(105,118,110);
        doc.setFontSize(Math.max(3.7,fs-1.35));
        const kk=doc.splitTextToSize(`KK: ${r.kk}`,nameW-4)[0]||'';
        doc.text(kk,x+noW+2,cy+rowH*.82);
      }

      doc.setTextColor(35,52,43);
      doc.setFontSize(fs);
      doc.text(r.umur==null?'-':String(r.umur),x+w-ageW/2,cy+rowH*.62,{align:'center'});
      cy+=rowH;
    });
  }

  window.ppg56ExportSetupPDF=function(){
    try{
      const jsPDFCtor=window.jspdf?.jsPDF;
      if(!jsPDFCtor)throw new Error('Library PDF belum siap.');

      const {groups,unknownRemaja}=exportGroups57();
      const doc=new jsPDFCtor({orientation:'portrait',unit:'mm',format:'a4'});
      const scopeName=scope()?.type==='kelompok'?(scope()?.kelompok||'Kelompok'):'Desa Perwira';

      doc.setTextColor(20,95,61);
      doc.setFont('helvetica','bold');
      doc.setFontSize(14);
      doc.text(`Data Murid KBM - ${scopeName}`,10,11);

      doc.setTextColor(105,118,110);
      doc.setFont('helvetica','normal');
      doc.setFontSize(7);
      doc.text(`PPG Perwira · ${today()} · (S) = Simpatisan`,10,16);

      const marginX=10,gapX=5,gapY=5,top=21,bottom=14;
      const boxW=(210-marginX*2-gapX)/2;
      const boxH=(297-top-bottom-gapY*2)/3;

      groups.forEach((g,i)=>{
        const col=i%2;
        const row=Math.floor(i/2);
        const x=marginX+col*(boxW+gapX);
        const y=top+row*(boxH+gapY);
        drawPdfBox57(doc,g,x,y,boxW,boxH);
      });

      if(unknownRemaja.length){
        doc.setFont('helvetica','normal');
        doc.setFontSize(5.8);
        doc.setTextColor(135,90,30);
        const txt='Remaja belum memiliki data L/P: '+unknownRemaja.map(x=>x.nama).join(', ');
        doc.text(doc.splitTextToSize(txt,190),10,294);
      }

      doc.save(safeFile(`Data_Murid_KBM_${scopeName}_${today()}`)+'.pdf');
    }catch(e){
      console.error(e);
      toast(e?.message||'Gagal membuat PDF.',true);
    }
  };

  function drawCanvasBox57(ctx,g,x,y,w,h){
    const rows=g.rows;
    ctx.fillStyle='#f8fbf9';
    ctx.strokeStyle='#cddbd2';
    ctx.lineWidth=1;
    ctx.beginPath();
    ctx.roundRect(x,y,w,h,6);
    ctx.fill();ctx.stroke();

    const hh=34;
    ctx.fillStyle='#e9f5ed';
    ctx.fillRect(x,y,w,hh);
    ctx.fillStyle='#145f3d';
    ctx.font='700 12px Arial';
    ctx.fillText(g.kelas,x+9,y+22);
    ctx.fillStyle='#66766d';
    ctx.font='9px Arial';
    ctx.textAlign='right';
    ctx.fillText(`${rows.length} murid`,x+w-9,y+21);
    ctx.textAlign='left';

    const tableY=y+hh;
    const rowH=Math.min(24,Math.max(11,(h-hh)/(Math.max(rows.length,1)+1)));
    const noW=30,ageW=42;

    ctx.fillStyle='#176a41';
    ctx.fillRect(x,tableY,w,rowH);
    ctx.fillStyle='#fff';
    ctx.font=`700 ${Math.min(10,rowH*.55)}px Arial`;
    ctx.fillText('No',x+8,tableY+rowH*.68);
    ctx.fillText('Nama / KK',x+noW+4,tableY+rowH*.68);
    ctx.textAlign='center';
    ctx.fillText('Umur',x+w-ageW/2,tableY+rowH*.68);
    ctx.textAlign='left';

    let cy=tableY+rowH;
    rows.forEach((r,i)=>{
      if(i%2===1){
        ctx.fillStyle='#fff';
        ctx.fillRect(x,cy,w,rowH);
      }
      ctx.strokeStyle='#e6ece8';
      ctx.beginPath();ctx.moveTo(x,cy+rowH);ctx.lineTo(x+w,cy+rowH);ctx.stroke();

      const fs=Math.max(6,Math.min(9.5,rowH*.42));
      ctx.fillStyle='#24362c';
      ctx.font=`${fs}px Arial`;
      ctx.textAlign='center';
      ctx.fillText(String(i+1),x+noW/2,cy+rowH*.62);
      ctx.textAlign='left';

      const maxChars=Math.max(8,Math.floor((w-noW-ageW)/(fs*.58)));
      const nm=r.nama+(r.kind==='simpatisan'?' (S)':'');
      ctx.fillText(nm.length>maxChars?nm.slice(0,maxChars-1)+'…':nm,x+noW+4,cy+rowH*.43);

      if(rowH>=15){
        ctx.fillStyle='#6f7d75';
        ctx.font=`${Math.max(5,fs*.72)}px Arial`;
        const kk=`KK: ${r.kk}`;
        ctx.fillText(kk.length>maxChars?kk.slice(0,maxChars-1)+'…':kk,x+noW+4,cy+rowH*.79);
      }

      ctx.fillStyle='#24362c';
      ctx.font=`${fs}px Arial`;
      ctx.textAlign='center';
      ctx.fillText(r.umur==null?'-':String(r.umur),x+w-ageW/2,cy+rowH*.62);
      ctx.textAlign='left';
      cy+=rowH;
    });
  }

  window.ppg56ExportSetupPNG=function(){
    try{
      const {groups,unknownRemaja}=exportGroups57();
      const c=document.createElement('canvas');
      c.width=794;
      c.height=1123;
      const ctx=c.getContext('2d');

      ctx.fillStyle='#fff';ctx.fillRect(0,0,c.width,c.height);

      const scopeName=scope()?.type==='kelompok'?(scope()?.kelompok||'Kelompok'):'Desa Perwira';
      ctx.fillStyle='#145f3d';ctx.font='700 22px Arial';
      ctx.fillText(`Data Murid KBM - ${scopeName}`,38,42);
      ctx.fillStyle='#6b7971';ctx.font='11px Arial';
      ctx.fillText(`PPG Perwira · ${today()} · (S) = Simpatisan`,38,61);

      const mx=38,gx=16,gy=16,top=76,bottom=44;
      const bw=(c.width-mx*2-gx)/2;
      const bh=(c.height-top-bottom-gy*2)/3;

      groups.forEach((g,i)=>{
        const col=i%2,row=Math.floor(i/2);
        drawCanvasBox57(ctx,g,mx+col*(bw+gx),top+row*(bh+gy),bw,bh);
      });

      if(unknownRemaja.length){
        ctx.fillStyle='#8b6326';
        ctx.font='10px Arial';
        const txt='Remaja belum memiliki data L/P: '+unknownRemaja.map(x=>x.nama).join(', ');
        ctx.fillText(txt.slice(0,115),38,c.height-18);
      }

      c.toBlob(blob=>{
        if(!blob)return toast('Gagal membuat gambar.',true);
        const url=URL.createObjectURL(blob);
        const a=document.createElement('a');
        a.href=url;
        a.download=safeFile(`Data_Murid_KBM_${scopeName}_${today()}`)+'.png';
        document.body.appendChild(a);a.click();a.remove();
        setTimeout(()=>URL.revokeObjectURL(url),1000);
      },'image/png');
    }catch(e){
      console.error(e);
      toast(e?.message||'Gagal membuat gambar.',true);
    }
  };

  /* =====================================================
     PDF PRESENTASI — FONT LEBIH BESAR
     1 kelas = 1 halaman A4 landscape
     ===================================================== */
  function sessions57(){return get(SESSION_KEY,[])}
  function reports57(){return get(REPORT_KEY,[])}

  function reportIds57(r){
    return Array.isArray(r?.ids)?r.ids:(Array.isArray(r?.session_ids)?r.session_ids:[]);
  }
  function reportSessions57(r){
    const ids=new Set(reportIds57(r).map(String));
    return sessions57().filter(s=>ids.has(String(s.id)));
  }
  function studentKind57(x){
    return x?.kind==='simpatisan'||String(x?.did||'').startsWith('SYM-')?'simpatisan':'jamaah';
  }
  function generalMaterials57(s){return s.generalMaterials||s.general_materials||[]}
  function studentMaterials57(s){return s.studentMaterials||s.student_materials||{}}

  function classSessions57(rows,k){return rows.filter(s=>s.className===k)}
  function classStats57(rows,k){
    const ss=classSessions57(rows,k);
    const people=new Set();
    let hadir=0,total=0;
    ss.forEach(s=>(s.students||[]).forEach(x=>{
      people.add(String(x.did));
      total++;
      if(x.status==='Hadir')hadir++;
    }));
    return {
      sessions:ss.length,
      people:people.size,
      hadir,total,
      pct:total?Math.round(hadir/total*100):0
    };
  }
  function classPivot57(rows,k){
    const ss=classSessions57(rows,k);
    const dates=[...new Set(ss.map(s=>s.date))].sort();
    const map=new Map();

    ss.forEach(s=>(s.students||[]).forEach(x=>{
      const key=String(x.did);
      if(!map.has(key))map.set(key,{nama:x.nama||'-',kind:studentKind57(x),st:{}});
      map.get(key).st[s.date]=x.status||'—';
    }));

    return {
      dates,
      rows:[...map.values()].sort((a,b)=>String(a.nama).localeCompare(String(b.nama),'id'))
    };
  }
  function materials57(rows,k){
    const umum=new Map(),khusus=new Map();
    classSessions57(rows,k).forEach(s=>{
      generalMaterials57(s).forEach(m=>{
        const t=(m?.text||String(m||'')).trim();if(!t)return;
        const key=t.toLowerCase();
        umum.set(key,{text:t,count:(umum.get(key)?.count||0)+1});
      });
      Object.values(studentMaterials57(s)).flat().forEach(m=>{
        const t=(m?.text||String(m||'')).trim();if(!t)return;
        const key=t.toLowerCase();
        khusus.set(key,{text:t,count:(khusus.get(key)?.count||0)+1});
      });
    });
    return {umum:[...umum.values()],khusus:[...khusus.values()]};
  }

  function statusShort57(v){
    return v==='Hadir'?'H':
      v==='Izin'?'I':
      v==='Sakit'?'S':
      v==='Terlambat'?'T':
      v==='Tidak Hadir'?'TH':
      v==='Belum Hadir'?'B':'-';
  }

  function truncate57(doc,text,w,fs){
    let s=String(text||'');
    doc.setFontSize(fs);
    if(doc.getTextWidth(s)<=w)return s;
    while(s.length>1&&doc.getTextWidth(s+'…')>w)s=s.slice(0,-1);
    return s+'…';
  }

  function drawMatrix57(doc,pivot,x,y,w,maxH){
    const dates=pivot.dates;
    const rows=pivot.rows;

    const nameW=Math.min(62,Math.max(48,w*.22));
    const totalW=11,pctW=13;
    const dateArea=Math.max(20,w-nameW-totalW-pctW);
    const dateW=dates.length?dateArea/dates.length:dateArea;

    const headerH=8;
    const rowCount=Math.max(rows.length,1);
    const rowH=Math.min(5.6,Math.max(3.4,(maxH-headerH)/rowCount));
    const nameFs=Math.min(8.4,Math.max(6.4,rowH*1.45));
    const cellFs=Math.min(7.8,Math.max(6.0,rowH*1.30));

    doc.setFillColor(23,106,65);
    doc.rect(x,y,w,headerH,'F');
    doc.setFont('helvetica','bold');
    doc.setFontSize(7.2);
    doc.setTextColor(255,255,255);
    doc.text('Nama Murid',x+2,y+5.3);

    dates.forEach((d,i)=>{
      doc.text(d.slice(-2),x+nameW+dateW*i+dateW/2,y+5.3,{align:'center'});
    });
    doc.text('H',x+nameW+dateArea+totalW/2,y+5.3,{align:'center'});
    doc.text('%',x+w-pctW/2,y+5.3,{align:'center'});

    let cy=y+headerH;
    rows.forEach((r,ri)=>{
      if(ri%2===1){
        doc.setFillColor(249,251,250);
        doc.rect(x,cy,w,rowH,'F');
      }
      doc.setDrawColor(226,233,228);
      doc.line(x,cy+rowH,x+w,cy+rowH);

      doc.setFont('helvetica','normal');
      doc.setTextColor(35,51,43);
      doc.setFontSize(nameFs);
      const tag=r.kind==='simpatisan'?' (S)':'';
      doc.text(truncate57(doc,r.nama+tag,nameW-3,nameFs),x+1.5,cy+rowH*.68);

      const vals=dates.map(d=>r.st[d]||'—');
      doc.setFontSize(cellFs);
      vals.forEach((v,i)=>{
        doc.text(statusShort57(v),x+nameW+dateW*i+dateW/2,cy+rowH*.68,{align:'center'});
      });

      const hadir=vals.filter(v=>v==='Hadir').length;
      const pct=dates.length?Math.round(hadir/dates.length*100):0;
      doc.text(String(hadir),x+nameW+dateArea+totalW/2,cy+rowH*.68,{align:'center'});
      doc.text(`${pct}%`,x+w-pctW/2,cy+rowH*.68,{align:'center'});
      cy+=rowH;
    });

    if(!rows.length){
      doc.setTextColor(115,126,119);
      doc.setFontSize(7);
      doc.text('Tidak ada data murid.',x+2,y+headerH+5);
    }
  }

  function materialLines57(list,max=6){
    if(!list.length)return ['Belum ada.'];
    const out=list.slice(0,max).map(x=>`• ${x.text}${x.count>1?` (${x.count}x)`:''}`);
    if(list.length>max)out.push(`• +${list.length-max} materi lainnya`);
    return out;
  }

  function drawPresentation57(doc,r,rows,k,pageNo,totalPages){
    const pageW=297,pageH=210,margin=12;
    const ss=classSessions57(rows,k);
    const st=classStats57(rows,k);
    const pivot=classPivot57(rows,k);
    const mats=materials57(rows,k);
    const gurus=[...new Set(ss.map(s=>s.teacherName).filter(Boolean))];

    /* Header */
    doc.setFillColor(20,95,61);
    doc.rect(0,0,pageW,31,'F');

    doc.setTextColor(255,255,255);
    doc.setFont('helvetica','bold');
    doc.setFontSize(19);
    doc.text('Laporan Kegiatan KBM',margin,12);

    doc.setFontSize(12.5);
    doc.text(k,margin,23);

    doc.setFont('helvetica','normal');
    doc.setFontSize(8.5);
    doc.text(`Periode ${r.start} s.d ${r.end}`,pageW-margin,10,{align:'right'});
    doc.text(`Guru: ${gurus.join(', ')||'-'}`,pageW-margin,18,{align:'right'});
    doc.text('PPG Perwira',pageW-margin,25,{align:'right'});

    /* KPI */
    const ky=36,gap=4,kw=(pageW-margin*2-gap*3)/4;
    const kpis=[
      ['Kegiatan KBM',String(st.sessions)],
      ['Jumlah Murid',String(st.people)],
      ['Total Hadir',`${st.hadir}/${st.total}`],
      ['Kehadiran',`${st.pct}%`]
    ];
    kpis.forEach((kv,i)=>{
      const x=margin+i*(kw+gap);
      doc.setFillColor(245,250,247);
      doc.setDrawColor(216,226,219);
      doc.roundedRect(x,ky,kw,18,2,2,'FD');

      doc.setTextColor(108,121,113);
      doc.setFont('helvetica','normal');
      doc.setFontSize(7.4);
      doc.text(kv[0],x+3,ky+5.5);

      doc.setTextColor(21,93,58);
      doc.setFont('helvetica','bold');
      doc.setFontSize(13.5);
      doc.text(kv[1],x+3,ky+14);
    });

    /* Attendance */
    const titleY=61;
    doc.setTextColor(21,90,58);
    doc.setFont('helvetica','bold');
    doc.setFontSize(10.5);
    doc.text('Performa Kehadiran Murid',margin,titleY);

    drawMatrix57(doc,pivot,margin,titleY+4,pageW-margin*2,94);

    /* Materials */
    const my=164,boxGap=6,boxW=(pageW-margin*2-boxGap)/2,boxH=31;
    [
      ['Materi Umum',mats.umum,margin],
      ['Materi Khusus',mats.khusus,margin+boxW+boxGap]
    ].forEach(([title,list,x])=>{
      doc.setFillColor(250,252,251);
      doc.setDrawColor(219,228,222);
      doc.roundedRect(x,my,boxW,boxH,2,2,'FD');

      doc.setTextColor(21,90,58);
      doc.setFont('helvetica','bold');
      doc.setFontSize(9);
      doc.text(title,x+3,my+6);

      doc.setTextColor(62,79,69);
      doc.setFont('helvetica','normal');
      doc.setFontSize(7.2);

      let yy=my+11;
      materialLines57(list,6).forEach(t=>{
        const wrapped=doc.splitTextToSize(t,boxW-6);
        wrapped.slice(0,2).forEach(line=>{
          if(yy<my+boxH-3){
            doc.text(line,x+3,yy);
            yy+=4;
          }
        });
      });
    });

    /* Footer */
    doc.setTextColor(125,137,130);
    doc.setFont('helvetica','normal');
    doc.setFontSize(7);
    doc.text(`Dibuat oleh ${r.by||'-'} · ${ubnbFmtWibDate84(r.at||Date.now())}`,margin,pageH-5);
    doc.text(`${pageNo}/${totalPages}`,pageW-margin,pageH-5,{align:'right'});
  }

  window.ppg56DownloadReportPDF=function(reportId,btn){
    if(btn)btn.disabled=true;
    try{
      const r=reports57().find(x=>String(x.id)===String(reportId));
      if(!r)throw new Error('Laporan tidak ditemukan.');

      const rows=reportSessions57(r);
      const activeClasses=[...new Set(rows.map(s=>s.className).filter(Boolean))];
      if(!activeClasses.length)throw new Error('Tidak ada kelas pada laporan ini.');

      const jsPDFCtor=window.jspdf?.jsPDF;
      if(!jsPDFCtor)throw new Error('Library PDF belum siap.');

      const doc=new jsPDFCtor({orientation:'landscape',unit:'mm',format:'a4'});
      activeClasses.forEach((k,i)=>{
        if(i>0)doc.addPage('a4','landscape');
        drawPresentation57(doc,r,rows,k,i+1,activeClasses.length);
      });

      doc.save(safeFile(`Laporan_PPG_${r.start}_sd_${r.end}`)+'.pdf');
    }catch(e){
      console.error(e);
      toast(e?.message||'Gagal membuat PDF laporan.',true);
    }finally{
      if(btn)btn.disabled=false;
    }
  };

  /* alias handler lama tetap diarahkan ke versi baru */
  window.ppg55DownloadReportPDF=window.ppg56DownloadReportPDF;
})();

/* ============================================================
   SOURCE: ubnb-v58-single-participant-ui-script
   ============================================================ */
(function(){
  function findTargetCard58(box){
    return [...box.children].find(el=>{
      const t=(el.textContent||'').trim();
      return t.startsWith('🎯 Target Peserta') || t.includes('Target Peserta');
    })||null;
  }

  function participantMode58(e){
    try{return targetModeOfFilter(e?.filter_peserta||{})||'criteria'}
    catch(_){return 'criteria'}
  }

  window.ubnb58UpdatePeserta=function(key){
    const e=calendarFindEntry(key);
    if(!e)return;
    if(!calendarCanManageEntry(e)){
      toast('Acara ini hanya dapat dilihat',true);
      return;
    }

    const ready=calendarH7Ready(e);
    const mode=participantMode58(e);

    /*
      Satu tool saja:
      - Kriteria + sudah H-7 => generate/refresh langsung dari kriteria.
      - Manual/hybrid atau kebutuhan edit nama => buka editor peserta.
      - Belum H-7 => update target saja.
    */
    if(ready && mode==='criteria'){
      generateCalendarParticipants(e.key,!!e.generated);
      return;
    }

    if(e.actual && ready){
      openKegiatanPeserta(e.id);
      return;
    }

    if(e.kind==='virtual' && ready){
      openVirtualPeserta(e.key);
      return;
    }

    if(typeof openTargetParticipantsEntry==='function'){
      openTargetParticipantsEntry(e.key);
      return;
    }

    toast('Peserta belum dapat diperbarui.',true);
  };

  const prior58=window.renderCalendarDetail;
  window.renderCalendarDetail=function(){
    const r=prior58?.apply(this,arguments);

    const e=_calCurrentEntry;
    const box=document.getElementById('calendar-detail-content');
    if(!e||!box)return r;

    /* 1. Hapus blok Target Peserta kedua supaya info tidak dobel */
    const targetCard=findTargetCard58(box);
    targetCard?.remove();

    /* 2. Rapikan teks info peserta utama */
    const infoCandidates=[...box.querySelectorAll('div')].filter(el=>{
      const t=(el.textContent||'').trim();
      return t.startsWith('👥') && (t.includes('peserta') || t.includes('H-7'));
    });

    const info=infoCandidates.find(el=>
      el.parentElement===box ||
      (el.style?.marginTop==='11px' && el.style?.padding)
    );

    if(info && !info.classList.contains('ubnb58-participant-box')){
      info.classList.add('ubnb58-participant-box');
      info.removeAttribute('style');

      if(e.generated){
        const ts=e.raw?.participants_generated_at
          ?' · '+ubnbFmtWib84(e.raw.participants_generated_at,false)
          :'';
        info.innerHTML=`👥 <b>${e.participant_count||0} peserta</b>${ts}`;
      }else if(calendarH7Ready(e)){
        let n=0;
        try{n=calendarParticipantsForEntry(e).length}catch(_){}
        info.innerHTML=`👥 <b>${n} peserta</b> berdasarkan kriteria saat ini`;
      }
    }

    /* 3. Hapus seluruh tombol peserta lama yang dobel */
    const actions=box.querySelector('.cal-detail-actions');
    if(actions){
      [...actions.querySelectorAll('button')].forEach(b=>{
        const t=(b.textContent||'').trim();
        if(
          t.includes('Pilih / Edit Peserta') ||
          t.includes('Refresh Kriteria') ||
          t.includes('Generate dari Kriteria') ||
          t.includes('Pilih Peserta Manual') ||
          t.includes('Update Target Peserta')
        ){
          b.remove();
        }
      });

      /* 4. Tambahkan satu tombol Update Peserta */
      if(calendarCanManageEntry(e) && !e.cancelled && e.status!=='dibatalkan'){
        const btn=document.createElement('button');
        btn.className='blue';
        btn.textContent='👥 Update Peserta';
        btn.onclick=()=>window.ubnb58UpdatePeserta(e.key);

        const openAbsen=[...actions.querySelectorAll('button')]
          .find(b=>(b.textContent||'').includes('Buka Absen'));

        if(openAbsen && openAbsen.nextSibling){
          actions.insertBefore(btn,openAbsen.nextSibling);
        }else if(openAbsen){
          actions.appendChild(btn);
        }else{
          actions.insertBefore(btn,actions.firstChild);
        }
      }
    }

    return r;
  };
})();

/* ============================================================
   SOURCE: ubnb-v59-invitation-snapshot-source-fix
   ============================================================ */
(function(){
  function invSnapshotParticipants59(e){
    if(e && e.actual && e.generated && Number(e.id)){
      const rows=(aHadir||[]).filter(h=>Number(h.kegiatan_id)===Number(e.id));
      if(rows.length){
        return rows.map(h=>{
          const j=findJamaahAny(h.jamaah_did)||{};
          return {
            did:h.jamaah_did,
            nama:h.jamaah_nama||j.nama||'-',
            nama_kk:h.jamaah_kk||j.nama_kk||null,
            kelompok_nama:j.kelompok_nama||e.scope_kelompok||null,
            kelompok:j.kelompok_nama||e.scope_kelompok||null,
            jenis_kelamin:j.jenis_kelamin||null,
            status_nikah:j.status_nikah||null
          };
        });
      }
    }
    return calendarParticipantsForEntry(e||{});
  }

  eventParticipantsGrouped=function(e){
    const out={PW1:[],PW2:[],PW3:[],PW4:[]};
    invSnapshotParticipants59(e).forEach(p=>{
      const j=findJamaahAny(p.did)||p;
      const g=j.kelompok_nama||p.kelompok_nama||p.kelompok||e?.scope_kelompok;
      if(out[g]) out[g].push({...j,...p});
    });
    return out;
  };

  invitationPayloadRecipients=function(model){
    const peserta=invSnapshotParticipants59(_invEntry||{});
    const grouped=eventParticipantsGrouped(_invEntry||{});

    if(model==='massal_kelompok'){
      return ['PW1','PW2','PW3','PW4'].map(g=>({
        recipient_type:'kelompok',
        kelompok:g,
        peserta:(grouped[g]||[]).map(j=>({
          did:j.did,
          nama:j.nama,
          kelompok:j.kelompok_nama||j.kelompok||g,
          gender:pgNormGender(j.jenis_kelamin),
          status_nikah:j.status_nikah||null,
          nama_kk:j.nama_kk||null
        })),
        slots:eventSlotsForGroup(_invEntry,g).map(s=>({
          nama_slot:s.nama_slot,
          kuota:s.kuota,
          allow_over_quota:s.allow_over_quota,
          gender:s.gender||null
        }))
      })).filter(x=>x.peserta.length||x.slots.length);
    }

    return peserta.map(p=>({
      recipient_type:'jamaah',
      jamaah_did:p.did,
      slots:[]
    }));
  };

  invModelChanged=function(){
    const model=document.getElementById('inv-model')?.value||'massal_kelompok';
    const peserta=invSnapshotParticipants59(_invEntry||{});
    const p=eventParticipantsGrouped(_invEntry||{});
    let text='';

    if(model==='massal_kelompok'){
      const groups=['PW1','PW2','PW3','PW4'].filter(g=>(p[g]||[]).length||eventSlotsForGroup(_invEntry,g).length);
      text=`📣 Akan dibuat <b>${groups.length} undangan kelompok</b>: ${groups.join(', ')||'tidak ada penerima'}. Peserta mengikuti snapshot acara yang dipakai untuk absensi.`;
    }else{
      text=`✉️ Akan dibuat <b>${peserta.length} undangan personal</b>, mengikuti snapshot peserta acara.`;
    }
    document.getElementById('inv-receiver-summary').innerHTML=text;
  };

  window.invSnapshotParticipants59=invSnapshotParticipants59;
})();

/* ============================================================
   SOURCE: ubnb-v60-supabase-persistence-script
   ============================================================ */
(function(){
  const PREFIX='ubnb_ppg_';
  const USER_KEYS=new Set(['ubnb_ppg_v38_setup_collapsed']);
  const MERGE_KEYS=new Set([
    'ubnb_ppg_v37_classes',
    'ubnb_ppg_v37_logger',
    'ubnb_ppg_v37_reports'
  ]);

  const saveTimers=new Map();
  const inflight=new Map();
  const lastSync=new Map();

  let hydrating=false;
  let syncBusy=0;
  let pollTimer=null;

  const nativeSet=Storage.prototype.setItem;
  const nativeRemove=Storage.prototype.removeItem;

  function editorDid(){
    return String(CU?.did||CU?.id||'').trim();
  }

  function currentScope(){
    try{
      const s=JSON.parse(sessionStorage.getItem('ubnb_ppg_v34_scope')||'null');
      return s?.type==='kelompok'?(s.kelompok||''):(s?.type==='controller'?'DESA':'');
    }catch(_){return ''}
  }

  function ownerForKey(k){
    return USER_KEYS.has(k)?editorDid():'';
  }

  function parseLocal(v){
    try{return JSON.parse(v)}
    catch(_){return v}
  }

  function stable(v){
    try{return JSON.stringify(v)}
    catch(_){return String(v)}
  }

  function localKeys(){
    const out=[];
    for(let i=0;i<localStorage.length;i++){
      const k=localStorage.key(i);
      if(k&&k.startsWith(PREFIX))out.push(k);
    }
    return out;
  }

  function status(text,cls=''){
    let el=document.getElementById('ppg60-sync-status');
    if(!el){
      const host=document.querySelector('#ppg-shell .ppg-brand-sub');
      if(host){
        el=document.createElement('span');
        el.id='ppg60-sync-status';
        host.appendChild(el);
      }
    }
    if(el){
      el.className=cls;
      el.textContent=text;
    }
  }

  function markSyncStart(){
    syncBusy++;
    status('Cloud •','syncing');
  }

  function markSyncDone(ok=true){
    syncBusy=Math.max(0,syncBusy-1);
    if(!syncBusy){
      status(ok?'Cloud ✓':'Cloud !',ok?'':'error');
    }
  }

  function sessionRank(s){
    const st=String(s?.status||'').toLowerCase();
    if(st==='finished'||st==='closed')return 4;
    if(st==='active')return 3;
    if(st==='pending')return 2;
    return 1;
  }

  function sessionRichness(s){
    if(!s||typeof s!=='object')return 0;

    let score=0;
    const students=Array.isArray(s.students)?s.students:[];
    score+=students.filter(x=>x?.status&&x.status!=='Belum Hadir').length*10;
    score+=students.filter(x=>x?.status==='Hadir').length*4;

    const gm=Array.isArray(s.generalMaterials)?s.generalMaterials:[];
    score+=gm.length*30;

    const sm=s.studentMaterials&&typeof s.studentMaterials==='object'?s.studentMaterials:{};
    Object.values(sm).forEach(v=>{
      score+=(Array.isArray(v)?v.length:0)*25;
    });

    const sn=s.studentNotes&&typeof s.studentNotes==='object'?s.studentNotes:{};
    score+=Object.values(sn).filter(v=>String(v||'').trim()).length*20;

    if(String(s.generalNote||'').trim())score+=40;
    if(s.finishedAt)score+=100;
    return score;
  }

  function chooseSession(a,b){
    if(!a)return b;
    if(!b)return a;

    const ra=sessionRank(a),rb=sessionRank(b);
    if(ra!==rb)return rb>ra?b:a;

    const sa=sessionRichness(a),sb=sessionRichness(b);
    if(sa!==sb)return sb>sa?b:a;

    const ta=String(a.finishedAt||a.updatedAt||a.startedAt||'');
    const tb=String(b.finishedAt||b.updatedAt||b.startedAt||'');
    return tb>=ta?b:a;
  }

  function mergeSessions(a,b){
    const map=new Map();

    for(const x of [...(Array.isArray(a)?a:[]),...(Array.isArray(b)?b:[])]){
      const id=String(x?.id||'');
      if(!id)continue;
      map.set(id,chooseSession(map.get(id),x));
    }

    return [...map.values()].sort((x,y)=>
      String(x?.startedAt||x?.id||'').localeCompare(String(y?.startedAt||y?.id||''))
    );
  }

  function mergeLogs(a,b){
    const map=new Map();
    for(const x of [...(Array.isArray(a)?a:[]),...(Array.isArray(b)?b:[])]){
      const key=[
        x?.sessionId||'',
        x?.type||'',
        x?.at||'',
        x?.account||''
      ].join('|') || stable(x);
      if(!map.has(key))map.set(key,x);
    }
    return [...map.values()].sort((x,y)=>
      String(x?.at||'').localeCompare(String(y?.at||''))
    );
  }

  function mergeReports(a,b){
    const map=new Map();
    for(const x of [...(Array.isArray(a)?a:[]),...(Array.isArray(b)?b:[])]){
      const id=String(x?.id||stable(x));
      map.set(id,{...(map.get(id)||{}),...x});
    }
    return [...map.values()].sort((x,y)=>
      String(x?.at||x?.id||'').localeCompare(String(y?.at||y?.id||''))
    );
  }

  function mergeSpecial(key,a,b){
    if(key==='ubnb_ppg_v37_classes')return mergeSessions(a,b);
    if(key==='ubnb_ppg_v37_logger')return mergeLogs(a,b);
    if(key==='ubnb_ppg_v37_reports')return mergeReports(a,b);
    return b;
  }

  function mergePayloads(entries,key){
    if(!entries.length)return undefined;
    if(entries.length===1)return entries[0].payload;

    if(MERGE_KEYS.has(key)){
      return entries.reduce((acc,e)=>mergeSpecial(key,acc,e.payload),undefined);
    }

    const vals=entries.map(x=>x.payload);

    if(vals.every(Array.isArray)){
      if(key==='ubnb_ppg_v47_classes'){
        return [...new Set(vals.flat().filter(Boolean))];
      }

      const flat=vals.flat();
      const seen=new Set();
      return flat.filter(x=>{
        if(!x||typeof x!=='object')return true;
        const id=x.id??x.sessionId??x.did??null;
        if(id==null)return true;
        const k=String(id);
        if(seen.has(k))return false;
        seen.add(k);
        return true;
      });
    }

    if(vals.every(v=>v && typeof v==='object' && !Array.isArray(v))){
      return Object.assign({},...vals);
    }

    return entries
      .slice()
      .sort((a,b)=>String(a.updated_at||'').localeCompare(String(b.updated_at||'')))
      .at(-1)?.payload;
  }

  function rerenderCurrentPage(){
    try{
      const active=document.querySelector('#ppg-shell .ppg-page.active');
      const page=active?.id?.replace('ppg-page-','')||'dashboard';
      const btn=document.querySelector(`#ppg-shell .ppg-tab[data-page="${page}"]`);
      window.ppgOpenPage?.(page,btn);
    }catch(e){
      console.error('[PPG rerender current]',e);
    }
  }

  function safeToRerender(){
    const ae=document.activeElement;
    if(ae && ['INPUT','TEXTAREA','SELECT'].includes(ae.tagName))return false;
    if(document.querySelector('.ppg52-modal.show,.ppg54-finish-modal.show,.ppg55-modal.show,.ppg54-finish-modal.show'))return false;
    return true;
  }

  async function rpcSave(scope,key,payload){
    const did=editorDid();
    if(!did||!scope||scope==='DESA')return;

    markSyncStart();
    try{
      const {data,error}=await sb.rpc('ppg_state_save',{
        p_editor_did:did,
        p_scope:scope,
        p_state_key:key,
        p_payload:payload,
        p_owner_did:ownerForKey(key)
      });

      if(error)throw error;
      if(!data?.ok)throw new Error(data?.error||'Gagal menyimpan data PPG');

      /*
        Server mengembalikan payload hasil merge.
        Khusus session/logger/report, cache lokal wajib ikut hasil server,
        sehingga login lain tidak pernah "menghilangkan" kelas yang sudah ada.
      */
      if(MERGE_KEYS.has(key) && data.payload!==undefined){
        const before=parseLocal(localStorage.getItem(key));
        const merged=mergeSpecial(key,data.payload,before);
        const next=stable(merged);
        const prev=localStorage.getItem(key);

        if(prev!==next){
          nativeSet.call(localStorage,key,next);

          /* dorong versi lokal yang lebih kaya (mis. closed class dari device guru)
             kembali ke server secara aman; server juga merge */
          if(stable(merged)!==stable(data.payload)){
            setTimeout(()=>rpcSave(scope,key,merged),0);
          }

          if(safeToRerender())requestAnimationFrame(rerenderCurrentPage);
        }
      }

      markSyncDone(true);
    }catch(e){
      console.error('[PPG Supabase save]',key,e);
      markSyncDone(false);
    }
  }

  async function rpcSaveBatch(scope,items){
    const did=editorDid();
    if(!did||!scope||scope==='DESA'||!items.length)return;

    markSyncStart();
    try{
      const {data,error}=await sb.rpc('ppg_state_save_batch',{
        p_editor_did:did,
        p_scope:scope,
        p_items:items
      });
      if(error)throw error;
      if(!data?.ok)throw new Error(data?.error||'Gagal migrasi data PPG');
      markSyncDone(true);
    }catch(e){
      console.error('[PPG Supabase batch save]',e);
      markSyncDone(false);
    }
  }

  function scheduleSave(key,value,scopeAtWrite){
    if(hydrating||!key?.startsWith(PREFIX))return;

    const scope=scopeAtWrite||currentScope();
    if(!scope||scope==='DESA')return;

    clearTimeout(saveTimers.get(key));
    saveTimers.set(key,setTimeout(()=>{
      saveTimers.delete(key);
      rpcSave(scope,key,parseLocal(value));
    },250));
  }

  async function rpcDelete(scope,key){
    const did=editorDid();
    if(!did||!scope||scope==='DESA')return;

    markSyncStart();
    try{
      const {data,error}=await sb.rpc('ppg_state_delete',{
        p_editor_did:did,
        p_scope:scope,
        p_state_key:key,
        p_owner_did:ownerForKey(key)
      });

      if(error)throw error;
      if(!data?.ok)throw new Error(data?.error||'Gagal menghapus state PPG');
      markSyncDone(true);
    }catch(e){
      console.error('[PPG Supabase delete]',key,e);
      markSyncDone(false);
    }
  }

  Storage.prototype.setItem=function(key,value){
    const r=nativeSet.apply(this,arguments);
    try{
      if(this===window.localStorage && String(key).startsWith(PREFIX)){
        scheduleSave(String(key),String(value),currentScope());
      }
    }catch(_){}
    return r;
  };

  Storage.prototype.removeItem=function(key){
    const isPPG=this===window.localStorage && String(key).startsWith(PREFIX);
    const sc=isPPG?currentScope():'';
    const r=nativeRemove.apply(this,arguments);
    if(isPPG&&!hydrating)rpcDelete(sc,String(key));
    return r;
  };

  async function hydrateScope(scope,{force=false,silent=false}={}){
    const did=editorDid();
    if(!did||!scope)return;

    const syncKey=`${did}|${scope}`;

    if(inflight.has(syncKey))return inflight.get(syncKey);

    const now=Date.now();
    if(!force && now-(lastSync.get(syncKey)||0)<5000){
      status(scope==='DESA'?'Cloud ✓ controller':'Cloud ✓');
      return;
    }

    const job=(async()=>{
      if(!silent)status('Cloud •','syncing');

      try{
        const {data,error}=await sb.rpc('ppg_state_snapshot',{
          p_editor_did:did,
          p_scope:scope
        });

        if(error)throw error;
        if(!data?.ok)throw new Error(data?.error||'Gagal memuat data PPG');

        const rows=Array.isArray(data.data)?data.data:[];
        const grouped=new Map();

        rows.forEach(r=>{
          if(!r?.state_key)return;
          if(!grouped.has(r.state_key))grouped.set(r.state_key,[]);
          grouped.get(r.state_key).push(r);
        });

        let changed=false;
        const recovered=[];

        hydrating=true;
        try{
          const local=localKeys();
          const allKeys=new Set([...local,...grouped.keys()]);

          for(const key of allKeys){
            const remoteEntries=grouped.get(key)||[];
            const localRaw=localStorage.getItem(key);
            const localVal=localRaw==null?undefined:parseLocal(localRaw);

            if(remoteEntries.length){
              const remoteVal=mergePayloads(remoteEntries,key);
              let finalVal=remoteVal;

              if(MERGE_KEYS.has(key) && localVal!==undefined){
                finalVal=mergeSpecial(key,remoteVal,localVal);

                if(scope!=='DESA' && stable(finalVal)!==stable(remoteVal)){
                  recovered.push({
                    state_key:key,
                    owner_did:ownerForKey(key),
                    payload:finalVal
                  });
                }
              }

              const next=stable(finalVal);
              if(localRaw!==next){
                nativeSet.call(localStorage,key,next);
                changed=true;
              }
            }else if(scope!=='DESA' && localRaw!=null){
              recovered.push({
                state_key:key,
                owner_did:ownerForKey(key),
                payload:localVal
              });
            }
          }
        }finally{
          hydrating=false;
        }

        lastSync.set(syncKey,Date.now());
        status(scope==='DESA'?'Cloud ✓ controller':'Cloud ✓');

        /* Satu batch untuk salvage data browser yang belum ada / lebih lengkap */
        if(recovered.length){
          rpcSaveBatch(scope,recovered);
        }

        if(changed && safeToRerender()){
          requestAnimationFrame(rerenderCurrentPage);
        }
      }catch(e){
        console.error('[PPG Supabase hydrate]',e);
        status('Cloud !','error');
      }finally{
        inflight.delete(syncKey);
      }
    })();

    inflight.set(syncKey,job);
    return job;
  }

  const priorSelectScope=window.ppgSelectScope34;
  window.ppgSelectScope34=function(i){
    const r=priorSelectScope?.apply(this,arguments);
    setTimeout(()=>{
      const sc=currentScope();
      if(sc)hydrateScope(sc,{force:true});
    },0);
    return r;
  };

  const priorChoose=window.ppgChoosePPG;
  window.ppgChoosePPG=function(){
    return priorChoose?.apply(this,arguments);
  };

  function startPolling(){
    clearInterval(pollTimer);
    pollTimer=setInterval(()=>{
      const shell=document.getElementById('ppg-shell');
      if(!shell?.classList.contains('show'))return;
      if(document.visibilityState!=='visible')return;
      if(!safeToRerender())return;

      const sc=currentScope();
      if(sc)hydrateScope(sc,{force:true,silent:true});
    },10000);
  }

  startPolling();

  window.ppg60SyncNow=function(){
    const sc=currentScope();
    return hydrateScope(sc,{force:true});
  };

  window.ppg67MergeAudit={
    mergeSessions,
    mergeLogs,
    mergeReports,
    currentScope,
    localKeys
  };
})();

/* ============================================================
   SOURCE: ubnb-v61-fullscreen-ppg-fix-script
   ============================================================ */
(function(){
  function lock61(){
    const shell=document.getElementById('ppg-shell');
    const active=!!shell?.classList.contains('show');
    document.documentElement.classList.toggle('ppg54-lock-page',active);
    document.body.classList.toggle('ppg54-lock-page',active);
  }

  const shell=document.getElementById('ppg-shell');
  if(shell){
    new MutationObserver(lock61).observe(shell,{
      attributes:true,
      attributeFilter:['class']
    });
  }

  const oldChoose61=window.ppgChoosePPG;
  window.ppgChoosePPG=function(){
    const r=oldChoose61?.apply(this,arguments);
    setTimeout(lock61,0);
    return r;
  };

  const oldBack61=window.ppgBackPortal;
  window.ppgBackPortal=function(){
    const r=oldBack61?.apply(this,arguments);
    setTimeout(lock61,0);
    return r;
  };

  const oldDb61=window.ppgChooseDatabase;
  window.ppgChooseDatabase=function(){
    const r=oldDb61?.apply(this,arguments);
    setTimeout(lock61,0);
    return r;
  };

  setTimeout(lock61,500);
})();

/* ============================================================
   SOURCE: ubnb-v63-export-name-kk-one-line-script
   ============================================================ */
(function(){
  const DRAFT_KEY='ubnb_ppg_v33_class_drafts';
  const SYMP_KEY='ubnb_ppg_v38_simpatisan';

  function get63(k,d){
    try{return JSON.parse(localStorage.getItem(k)||JSON.stringify(d))}
    catch(_){return d}
  }
  function scope63(){
    try{return JSON.parse(sessionStorage.getItem('ubnb_ppg_v34_scope')||'null')}
    catch(_){return null}
  }
  function today63(){
    try{
      return new Intl.DateTimeFormat('en-CA',{
        timeZone:'Asia/Jakarta',year:'numeric',month:'2-digit',day:'2-digit'
      }).format(new Date())
    }catch(_){return ubnbWibIso84().slice(0,10)}
  }
  function safeFile63(s){
    return String(s||'data').replace(/[\\/:*?"<>|]+/g,'_').replace(/\s+/g,'_');
  }
  function normGender63(v){
    const s=String(v||'').trim().toLowerCase();
    if(['l','lk','laki','laki-laki','pria','male'].includes(s))return 'L';
    if(['p','pr','perempuan','wanita','female'].includes(s))return 'P';
    return '';
  }

  function exportRows63(){
    const sc=scope63();
    const drafts=get63(DRAFT_KEY,{});

    let jamaah=(Array.isArray(aJamaah)?aJamaah:[])
      .filter(j=>j.status_nikah==='Belum Menikah')
      .filter(j=>j.status_sambung==='Tetap');

    if(sc?.type==='kelompok'){
      jamaah=jamaah.filter(j=>j.kelompok_nama===sc.kelompok);
    }

    const jrows=jamaah.map(j=>({
      did:String(j.did),
      nama:j.nama||'-',
      kk:j.nama_kk||'-',
      umur:(()=>{try{return umurFromTgl(j.tgl_lahir)}catch(_){return null}})(),
      kelas:drafts[String(j.did)]||j.kelas_kbm||j.kelas_usia||'Belum Ditentukan',
      kind:'jamaah',
      gender:normGender63(j.jenis_kelamin)
    }));

    let simp=get63(SYMP_KEY,[]);
    if(sc?.type==='kelompok'){
      simp=simp.filter(x=>x.scope===sc.kelompok);
    }

    const srows=simp.map(x=>({
      did:String(x.id),
      nama:x.nama||'-',
      kk:x.nama_kk||'-',
      umur:x.umur??null,
      kelas:x.kelas||'Belum Ditentukan',
      kind:'simpatisan',
      gender:normGender63(x.jenis_kelamin||x.gender)
    }));

    return [...jrows,...srows];
  }

  function groups63(){
    const rows=exportRows63();
    const remaja=rows.filter(x=>x.kelas==='Remaja');

    return {
      groups:[
        {kelas:'Cabe Rawit Tahap A',rows:rows.filter(x=>x.kelas==='Cabe Rawit Tahap A')},
        {kelas:'Cabe Rawit Tahap B',rows:rows.filter(x=>x.kelas==='Cabe Rawit Tahap B')},
        {kelas:'Cabe Rawit Tahap C',rows:rows.filter(x=>x.kelas==='Cabe Rawit Tahap C')},
        {kelas:'Pra Remaja',rows:rows.filter(x=>x.kelas==='Pra Remaja')},
        {kelas:'Remaja Laki-laki',rows:remaja.filter(x=>x.gender==='L')},
        {kelas:'Remaja Perempuan',rows:remaja.filter(x=>x.gender==='P')}
      ].map(g=>({...g,rows:g.rows.sort((a,b)=>String(a.nama).localeCompare(String(b.nama),'id'))})),
      unknownRemaja:remaja.filter(x=>!x.gender)
    };
  }

  function displayName63(r){
    const nama=String(r.nama||'-').trim();
    const kk=String(r.kk||'').trim();

    let s=nama;
    if(kk && kk!=='-' && kk.toLowerCase()!==nama.toLowerCase()){
      s+=` (${kk})`;
    }
    if(r.kind==='simpatisan')s+=' [S]';
    return s;
  }

  function fitText63(doc,text,maxWidth,startSize,minSize){
    let fs=startSize;
    doc.setFontSize(fs);
    while(fs>minSize && doc.getTextWidth(text)>maxWidth){
      fs-=0.2;
      doc.setFontSize(fs);
    }
    if(doc.getTextWidth(text)<=maxWidth)return {text,fs};

    let s=text;
    while(s.length>1 && doc.getTextWidth(s+'…')>maxWidth){
      s=s.slice(0,-1);
    }
    return {text:s+'…',fs};
  }

  function drawPdfBox63(doc,g,x,y,w,h){
    const rows=g.rows;

    doc.setDrawColor(205,219,210);
    doc.setFillColor(248,251,249);
    doc.roundedRect(x,y,w,h,2,2,'FD');

    doc.setFillColor(233,245,237);
    doc.rect(x,y,w,10,'F');

    doc.setTextColor(20,95,61);
    doc.setFont('helvetica','bold');
    doc.setFontSize(8.8);
    doc.text(g.kelas,x+3,y+6.5);

    doc.setFont('helvetica','normal');
    doc.setFontSize(6.6);
    doc.setTextColor(95,108,101);
    doc.text(`${rows.length} murid`,x+w-3,y+6.3,{align:'right'});

    const headY=y+10;
    const rowArea=h-10;
    const rowH=Math.min(7.0,Math.max(3.45,rowArea/(Math.max(rows.length,1)+1)));

    const noW=8.5;
    const ageW=11;
    const nameW=w-noW-ageW;

    doc.setFillColor(23,106,65);
    doc.rect(x,headY,w,rowH,'F');

    doc.setTextColor(255,255,255);
    doc.setFont('helvetica','bold');
    doc.setFontSize(Math.min(7.2,Math.max(5.4,rowH*1.15)));
    doc.text('No',x+noW/2,headY+rowH*.68,{align:'center'});
    doc.text('Nama (KK)',x+noW+2,headY+rowH*.68);
    doc.text('Umur',x+w-ageW/2,headY+rowH*.68,{align:'center'});

    let cy=headY+rowH;

    rows.forEach((r,i)=>{
      if(i%2===1){
        doc.setFillColor(253,254,253);
        doc.rect(x,cy,w,rowH,'F');
      }

      doc.setDrawColor(230,236,232);
      doc.line(x,cy+rowH,x+w,cy+rowH);

      doc.setTextColor(35,52,43);
      doc.setFont('helvetica','normal');

      const baseFs=Math.min(7.3,Math.max(5.3,rowH*1.10));

      doc.setFontSize(baseFs);
      doc.text(String(i+1),x+noW/2,cy+rowH*.66,{align:'center'});

      const shown=displayName63(r);
      const fit=fitText63(doc,shown,nameW-4,baseFs,4.8);
      doc.setFontSize(fit.fs);
      doc.text(fit.text,x+noW+2,cy+rowH*.66);

      doc.setFontSize(baseFs);
      doc.text(r.umur==null?'-':String(r.umur),x+w-ageW/2,cy+rowH*.66,{align:'center'});

      cy+=rowH;
    });
  }

  window.ppg56ExportSetupPDF=function(){
    try{
      const jsPDFCtor=window.jspdf?.jsPDF;
      if(!jsPDFCtor)throw new Error('Library PDF belum siap.');

      const {groups,unknownRemaja}=groups63();
      const doc=new jsPDFCtor({orientation:'portrait',unit:'mm',format:'a4'});
      const scopeName=scope63()?.type==='kelompok'?(scope63()?.kelompok||'Kelompok'):'Desa Perwira';

      doc.setTextColor(20,95,61);
      doc.setFont('helvetica','bold');
      doc.setFontSize(15);
      doc.text(`Data Murid KBM - ${scopeName}`,10,11);

      doc.setTextColor(105,118,110);
      doc.setFont('helvetica','normal');
      doc.setFontSize(7.3);
      doc.text(`PPG Perwira · ${today63()} · [S] = Simpatisan`,10,16);

      const marginX=10,gapX=5,gapY=5,top=21,bottom=14;
      const boxW=(210-marginX*2-gapX)/2;
      const boxH=(297-top-bottom-gapY*2)/3;

      groups.forEach((g,i)=>{
        const col=i%2;
        const row=Math.floor(i/2);
        const x=marginX+col*(boxW+gapX);
        const y=top+row*(boxH+gapY);
        drawPdfBox63(doc,g,x,y,boxW,boxH);
      });

      if(unknownRemaja.length){
        doc.setFont('helvetica','normal');
        doc.setFontSize(6);
        doc.setTextColor(135,90,30);
        const txt='Remaja belum memiliki data L/P: '+unknownRemaja.map(x=>x.nama).join(', ');
        doc.text(doc.splitTextToSize(txt,190),10,294);
      }

      doc.save(safeFile63(`Data_Murid_KBM_${scopeName}_${today63()}`)+'.pdf');
    }catch(e){
      console.error(e);
      toast(e?.message||'Gagal membuat PDF.',true);
    }
  };

  function fitCanvasText63(ctx,text,maxWidth,startSize,minSize){
    let fs=startSize;
    while(fs>minSize){
      ctx.font=`${fs}px Arial`;
      if(ctx.measureText(text).width<=maxWidth)break;
      fs-=0.3;
    }
    ctx.font=`${fs}px Arial`;

    if(ctx.measureText(text).width<=maxWidth)return {text,fs};

    let s=text;
    while(s.length>1 && ctx.measureText(s+'…').width>maxWidth){
      s=s.slice(0,-1);
    }
    return {text:s+'…',fs};
  }

  function drawCanvasBox63(ctx,g,x,y,w,h){
    const rows=g.rows;

    ctx.fillStyle='#f8fbf9';
    ctx.strokeStyle='#cddbd2';
    ctx.lineWidth=1;
    ctx.beginPath();
    ctx.roundRect(x,y,w,h,6);
    ctx.fill();
    ctx.stroke();

    const hh=34;
    ctx.fillStyle='#e9f5ed';
    ctx.fillRect(x,y,w,hh);

    ctx.fillStyle='#145f3d';
    ctx.font='700 13px Arial';
    ctx.fillText(g.kelas,x+9,y+22);

    ctx.fillStyle='#66766d';
    ctx.font='9.5px Arial';
    ctx.textAlign='right';
    ctx.fillText(`${rows.length} murid`,x+w-9,y+21);
    ctx.textAlign='left';

    const tableY=y+hh;
    const rowH=Math.min(27,Math.max(13,(h-hh)/(Math.max(rows.length,1)+1)));
    const noW=31,ageW=42;
    const nameW=w-noW-ageW;

    ctx.fillStyle='#176a41';
    ctx.fillRect(x,tableY,w,rowH);

    ctx.fillStyle='#fff';
    ctx.font=`700 ${Math.min(11,rowH*.58)}px Arial`;
    ctx.fillText('No',x+8,tableY+rowH*.68);
    ctx.fillText('Nama (KK)',x+noW+4,tableY+rowH*.68);
    ctx.textAlign='center';
    ctx.fillText('Umur',x+w-ageW/2,tableY+rowH*.68);
    ctx.textAlign='left';

    let cy=tableY+rowH;

    rows.forEach((r,i)=>{
      if(i%2===1){
        ctx.fillStyle='#fff';
        ctx.fillRect(x,cy,w,rowH);
      }

      ctx.strokeStyle='#e6ece8';
      ctx.beginPath();
      ctx.moveTo(x,cy+rowH);
      ctx.lineTo(x+w,cy+rowH);
      ctx.stroke();

      const baseFs=Math.max(7.2,Math.min(11,rowH*.45));

      ctx.fillStyle='#24362c';
      ctx.font=`${baseFs}px Arial`;
      ctx.textAlign='center';
      ctx.fillText(String(i+1),x+noW/2,cy+rowH*.66);
      ctx.textAlign='left';

      const shown=displayName63(r);
      const fit=fitCanvasText63(ctx,shown,nameW-8,baseFs,6.2);
      ctx.font=`${fit.fs}px Arial`;
      ctx.fillText(fit.text,x+noW+4,cy+rowH*.66);

      ctx.font=`${baseFs}px Arial`;
      ctx.textAlign='center';
      ctx.fillText(r.umur==null?'-':String(r.umur),x+w-ageW/2,cy+rowH*.66);
      ctx.textAlign='left';

      cy+=rowH;
    });
  }

  window.ppg56ExportSetupPNG=function(){
    try{
      const {groups,unknownRemaja}=groups63();
      const c=document.createElement('canvas');
      c.width=794;
      c.height=1123;
      const ctx=c.getContext('2d');

      ctx.fillStyle='#fff';
      ctx.fillRect(0,0,c.width,c.height);

      const scopeName=scope63()?.type==='kelompok'?(scope63()?.kelompok||'Kelompok'):'Desa Perwira';

      ctx.fillStyle='#145f3d';
      ctx.font='700 23px Arial';
      ctx.fillText(`Data Murid KBM - ${scopeName}`,38,42);

      ctx.fillStyle='#6b7971';
      ctx.font='11.5px Arial';
      ctx.fillText(`PPG Perwira · ${today63()} · [S] = Simpatisan`,38,61);

      const mx=38,gx=16,gy=16,top=76,bottom=44;
      const bw=(c.width-mx*2-gx)/2;
      const bh=(c.height-top-bottom-gy*2)/3;

      groups.forEach((g,i)=>{
        const col=i%2,row=Math.floor(i/2);
        drawCanvasBox63(ctx,g,mx+col*(bw+gx),top+row*(bh+gy),bw,bh);
      });

      if(unknownRemaja.length){
        ctx.fillStyle='#8b6326';
        ctx.font='10px Arial';
        const txt='Remaja belum memiliki data L/P: '+unknownRemaja.map(x=>x.nama).join(', ');
        ctx.fillText(txt.slice(0,115),38,c.height-18);
      }

      c.toBlob(blob=>{
        if(!blob)return toast('Gagal membuat gambar.',true);
        const url=URL.createObjectURL(blob);
        const a=document.createElement('a');
        a.href=url;
        a.download=safeFile63(`Data_Murid_KBM_${scopeName}_${today63()}`)+'.png';
        document.body.appendChild(a);
        a.click();
        a.remove();
        setTimeout(()=>URL.revokeObjectURL(url),1000);
      },'image/png');
    }catch(e){
      console.error(e);
      toast(e?.message||'Gagal membuat gambar.',true);
    }
  };
})();

/* ============================================================
   SOURCE: ubnb-v64-uniform-row-height-script
   ============================================================ */
(function(){
  const DRAFT_KEY='ubnb_ppg_v33_class_drafts';
  const SYMP_KEY='ubnb_ppg_v38_simpatisan';

  function get64(k,d){
    try{return JSON.parse(localStorage.getItem(k)||JSON.stringify(d))}
    catch(_){return d}
  }

  function scope64(){
    try{return JSON.parse(sessionStorage.getItem('ubnb_ppg_v34_scope')||'null')}
    catch(_){return null}
  }

  function today64(){
    try{
      return new Intl.DateTimeFormat('en-CA',{
        timeZone:'Asia/Jakarta',year:'numeric',month:'2-digit',day:'2-digit'
      }).format(new Date())
    }catch(_){return ubnbWibIso84().slice(0,10)}
  }

  function safeFile64(s){
    return String(s||'data')
      .replace(/[\\/:*?"<>|]+/g,'_')
      .replace(/\s+/g,'_');
  }

  function normGender64(v){
    const s=String(v||'').trim().toLowerCase();
    if(['l','lk','laki','laki-laki','pria','male'].includes(s))return 'L';
    if(['p','pr','perempuan','wanita','female'].includes(s))return 'P';
    return '';
  }

  function rows64(){
    const sc=scope64();
    const drafts=get64(DRAFT_KEY,{});

    let jamaah=(Array.isArray(aJamaah)?aJamaah:[])
      .filter(j=>j.status_nikah==='Belum Menikah')
      .filter(j=>j.status_sambung==='Tetap');

    if(sc?.type==='kelompok'){
      jamaah=jamaah.filter(j=>j.kelompok_nama===sc.kelompok);
    }

    const jrows=jamaah.map(j=>({
      did:String(j.did),
      nama:j.nama||'-',
      kk:j.nama_kk||'-',
      umur:(()=>{try{return umurFromTgl(j.tgl_lahir)}catch(_){return null}})(),
      kelas:drafts[String(j.did)]||j.kelas_kbm||j.kelas_usia||'Belum Ditentukan',
      kind:'jamaah',
      gender:normGender64(j.jenis_kelamin)
    }));

    let simp=get64(SYMP_KEY,[]);
    if(sc?.type==='kelompok'){
      simp=simp.filter(x=>x.scope===sc.kelompok);
    }

    const srows=simp.map(x=>({
      did:String(x.id),
      nama:x.nama||'-',
      kk:x.nama_kk||'-',
      umur:x.umur??null,
      kelas:x.kelas||'Belum Ditentukan',
      kind:'simpatisan',
      gender:normGender64(x.jenis_kelamin||x.gender)
    }));

    return [...jrows,...srows];
  }

  function groups64(){
    const rows=rows64();
    const remaja=rows.filter(x=>x.kelas==='Remaja');

    return {
      groups:[
        {kelas:'Cabe Rawit Tahap A',rows:rows.filter(x=>x.kelas==='Cabe Rawit Tahap A')},
        {kelas:'Cabe Rawit Tahap B',rows:rows.filter(x=>x.kelas==='Cabe Rawit Tahap B')},
        {kelas:'Cabe Rawit Tahap C',rows:rows.filter(x=>x.kelas==='Cabe Rawit Tahap C')},
        {kelas:'Pra Remaja',rows:rows.filter(x=>x.kelas==='Pra Remaja')},
        {kelas:'Remaja Laki-laki',rows:remaja.filter(x=>x.gender==='L')},
        {kelas:'Remaja Perempuan',rows:remaja.filter(x=>x.gender==='P')}
      ].map(g=>({
        ...g,
        rows:g.rows.sort((a,b)=>String(a.nama).localeCompare(String(b.nama),'id'))
      })),
      unknownRemaja:remaja.filter(x=>!x.gender)
    };
  }

  function display64(r){
    const nama=String(r.nama||'-').trim();
    const kk=String(r.kk||'').trim();
    let s=nama;

    if(kk && kk!=='-' && kk.toLowerCase()!==nama.toLowerCase()){
      s+=` (${kk})`;
    }

    if(r.kind==='simpatisan')s+=' [S]';
    return s;
  }

  function fitPdf64(doc,text,maxWidth,start,min){
    let fs=start;
    doc.setFontSize(fs);

    while(fs>min && doc.getTextWidth(text)>maxWidth){
      fs-=0.15;
      doc.setFontSize(fs);
    }

    if(doc.getTextWidth(text)<=maxWidth)return {text,fs};

    let s=text;
    while(s.length>1 && doc.getTextWidth(s+'…')>maxWidth){
      s=s.slice(0,-1);
    }
    return {text:s+'…',fs};
  }

  function drawPdfBox64(doc,g,x,y,w,h,rowH){
    const rows=g.rows;

    doc.setDrawColor(205,219,210);
    doc.setFillColor(248,251,249);
    doc.roundedRect(x,y,w,h,2,2,'FD');

    doc.setFillColor(233,245,237);
    doc.rect(x,y,w,10,'F');

    doc.setTextColor(20,95,61);
    doc.setFont('helvetica','bold');
    doc.setFontSize(8.8);
    doc.text(g.kelas,x+3,y+6.5);

    doc.setFont('helvetica','normal');
    doc.setFontSize(6.6);
    doc.setTextColor(95,108,101);
    doc.text(`${rows.length} murid`,x+w-3,y+6.3,{align:'right'});

    const headY=y+10;
    const noW=8.5;
    const ageW=11;
    const nameW=w-noW-ageW;

    doc.setFillColor(23,106,65);
    doc.rect(x,headY,w,rowH,'F');

    doc.setTextColor(255,255,255);
    doc.setFont('helvetica','bold');
    doc.setFontSize(5.9);
    doc.text('No',x+noW/2,headY+rowH*.69,{align:'center'});
    doc.text('Nama (KK)',x+noW+2,headY+rowH*.69);
    doc.text('Umur',x+w-ageW/2,headY+rowH*.69,{align:'center'});

    let cy=headY+rowH;
    rows.forEach((r,i)=>{
      if(i%2===1){
        doc.setFillColor(253,254,253);
        doc.rect(x,cy,w,rowH,'F');
      }

      doc.setDrawColor(230,236,232);
      doc.line(x,cy+rowH,x+w,cy+rowH);

      const baseFs=5.8;

      doc.setTextColor(35,52,43);
      doc.setFont('helvetica','normal');
      doc.setFontSize(baseFs);

      doc.text(String(i+1),x+noW/2,cy+rowH*.68,{align:'center'});

      const shown=display64(r);
      const fit=fitPdf64(doc,shown,nameW-4,baseFs,4.6);
      doc.setFontSize(fit.fs);
      doc.text(fit.text,x+noW+2,cy+rowH*.68);

      doc.setFontSize(baseFs);
      doc.text(r.umur==null?'-':String(r.umur),x+w-ageW/2,cy+rowH*.68,{align:'center'});

      cy+=rowH;
    });
  }

  window.ppg56ExportSetupPDF=function(){
    try{
      const jsPDFCtor=window.jspdf?.jsPDF;
      if(!jsPDFCtor)throw new Error('Library PDF belum siap.');

      const {groups,unknownRemaja}=groups64();
      const doc=new jsPDFCtor({orientation:'portrait',unit:'mm',format:'a4'});
      const scopeName=scope64()?.type==='kelompok'?(scope64()?.kelompok||'Kelompok'):'Desa Perwira';

      doc.setTextColor(20,95,61);
      doc.setFont('helvetica','bold');
      doc.setFontSize(15);
      doc.text(`Data Murid KBM - ${scopeName}`,10,11);

      doc.setTextColor(105,118,110);
      doc.setFont('helvetica','normal');
      doc.setFontSize(7.3);
      doc.text(`PPG Perwira · ${today64()} · [S] = Simpatisan`,10,16);

      const marginX=10;
      const gapX=5;
      const gapY=5;
      const top=21;
      const bottom=14;
      const boxW=(210-marginX*2-gapX)/2;
      const boxH=(297-top-bottom-gapY*2)/3;

      /*
        Semua tabel memakai tinggi row yang SAMA.
        Acuan diambil dari tabel dengan jumlah murid terbanyak.
      */
      const maxRows=Math.max(1,...groups.map(g=>g.rows.length));
      const rowArea=boxH-10;
      const commonRowH=Math.min(5.2,Math.max(3.35,rowArea/(maxRows+1)));

      groups.forEach((g,i)=>{
        const col=i%2;
        const row=Math.floor(i/2);
        const x=marginX+col*(boxW+gapX);
        const y=top+row*(boxH+gapY);
        drawPdfBox64(doc,g,x,y,boxW,boxH,commonRowH);
      });

      if(unknownRemaja.length){
        doc.setFont('helvetica','normal');
        doc.setFontSize(6);
        doc.setTextColor(135,90,30);
        const txt='Remaja belum memiliki data L/P: '+unknownRemaja.map(x=>x.nama).join(', ');
        doc.text(doc.splitTextToSize(txt,190),10,294);
      }

      doc.save(safeFile64(`Data_Murid_KBM_${scopeName}_${today64()}`)+'.pdf');
    }catch(e){
      console.error(e);
      toast(e?.message||'Gagal membuat PDF.',true);
    }
  };

  function fitCanvas64(ctx,text,maxWidth,start,min){
    let fs=start;
    while(fs>min){
      ctx.font=`${fs}px Arial`;
      if(ctx.measureText(text).width<=maxWidth)break;
      fs-=0.2;
    }

    ctx.font=`${fs}px Arial`;
    if(ctx.measureText(text).width<=maxWidth)return {text,fs};

    let s=text;
    while(s.length>1 && ctx.measureText(s+'…').width>maxWidth){
      s=s.slice(0,-1);
    }
    return {text:s+'…',fs};
  }

  function drawCanvasBox64(ctx,g,x,y,w,h,rowH){
    const rows=g.rows;

    ctx.fillStyle='#f8fbf9';
    ctx.strokeStyle='#cddbd2';
    ctx.lineWidth=1;
    ctx.beginPath();
    ctx.roundRect(x,y,w,h,6);
    ctx.fill();
    ctx.stroke();

    const hh=34;

    ctx.fillStyle='#e9f5ed';
    ctx.fillRect(x,y,w,hh);

    ctx.fillStyle='#145f3d';
    ctx.font='700 13px Arial';
    ctx.fillText(g.kelas,x+9,y+22);

    ctx.fillStyle='#66766d';
    ctx.font='9.5px Arial';
    ctx.textAlign='right';
    ctx.fillText(`${rows.length} murid`,x+w-9,y+21);
    ctx.textAlign='left';

    const tableY=y+hh;
    const noW=31;
    const ageW=42;
    const nameW=w-noW-ageW;

    ctx.fillStyle='#176a41';
    ctx.fillRect(x,tableY,w,rowH);

    ctx.fillStyle='#fff';
    ctx.font='700 8.6px Arial';
    ctx.fillText('No',x+8,tableY+rowH*.69);
    ctx.fillText('Nama (KK)',x+noW+4,tableY+rowH*.69);

    ctx.textAlign='center';
    ctx.fillText('Umur',x+w-ageW/2,tableY+rowH*.69);
    ctx.textAlign='left';

    let cy=tableY+rowH;

    rows.forEach((r,i)=>{
      if(i%2===1){
        ctx.fillStyle='#fff';
        ctx.fillRect(x,cy,w,rowH);
      }

      ctx.strokeStyle='#e6ece8';
      ctx.beginPath();
      ctx.moveTo(x,cy+rowH);
      ctx.lineTo(x+w,cy+rowH);
      ctx.stroke();

      const baseFs=8.4;

      ctx.fillStyle='#24362c';
      ctx.font=`${baseFs}px Arial`;

      ctx.textAlign='center';
      ctx.fillText(String(i+1),x+noW/2,cy+rowH*.68);

      ctx.textAlign='left';
      const shown=display64(r);
      const fit=fitCanvas64(ctx,shown,nameW-8,baseFs,6.2);
      ctx.font=`${fit.fs}px Arial`;
      ctx.fillText(fit.text,x+noW+4,cy+rowH*.68);

      ctx.font=`${baseFs}px Arial`;
      ctx.textAlign='center';
      ctx.fillText(r.umur==null?'-':String(r.umur),x+w-ageW/2,cy+rowH*.68);
      ctx.textAlign='left';

      cy+=rowH;
    });
  }

  window.ppg56ExportSetupPNG=function(){
    try{
      const {groups,unknownRemaja}=groups64();

      const c=document.createElement('canvas');
      c.width=794;
      c.height=1123;
      const ctx=c.getContext('2d');

      ctx.fillStyle='#fff';
      ctx.fillRect(0,0,c.width,c.height);

      const scopeName=scope64()?.type==='kelompok'?(scope64()?.kelompok||'Kelompok'):'Desa Perwira';

      ctx.fillStyle='#145f3d';
      ctx.font='700 23px Arial';
      ctx.fillText(`Data Murid KBM - ${scopeName}`,38,42);

      ctx.fillStyle='#6b7971';
      ctx.font='11.5px Arial';
      ctx.fillText(`PPG Perwira · ${today64()} · [S] = Simpatisan`,38,61);

      const mx=38;
      const gx=16;
      const gy=16;
      const top=76;
      const bottom=44;
      const bw=(c.width-mx*2-gx)/2;
      const bh=(c.height-top-bottom-gy*2)/3;

      const maxRows=Math.max(1,...groups.map(g=>g.rows.length));
      const rowArea=bh-34;
      const commonRowH=Math.min(20,Math.max(13,rowArea/(maxRows+1)));

      groups.forEach((g,i)=>{
        const col=i%2;
        const row=Math.floor(i/2);
        drawCanvasBox64(
          ctx,
          g,
          mx+col*(bw+gx),
          top+row*(bh+gy),
          bw,
          bh,
          commonRowH
        );
      });

      if(unknownRemaja.length){
        ctx.fillStyle='#8b6326';
        ctx.font='10px Arial';
        const txt='Remaja belum memiliki data L/P: '+unknownRemaja.map(x=>x.nama).join(', ');
        ctx.fillText(txt.slice(0,115),38,c.height-18);
      }

      c.toBlob(blob=>{
        if(!blob)return toast('Gagal membuat gambar.',true);

        const url=URL.createObjectURL(blob);
        const a=document.createElement('a');
        a.href=url;
        a.download=safeFile64(`Data_Murid_KBM_${scopeName}_${today64()}`)+'.png';

        document.body.appendChild(a);
        a.click();
        a.remove();

        setTimeout(()=>URL.revokeObjectURL(url),1000);
      },'image/png');
    }catch(e){
      console.error(e);
      toast(e?.message||'Gagal membuat gambar.',true);
    }
  };
})();

/* ============================================================
   SOURCE: ubnb-v65-adaptive-export-layout-script
   ============================================================ */
(function(){
  const DRAFT_KEY='ubnb_ppg_v33_class_drafts';
  const SYMP_KEY='ubnb_ppg_v38_simpatisan';

  function get65(k,d){
    try{return JSON.parse(localStorage.getItem(k)||JSON.stringify(d))}
    catch(_){return d}
  }

  function scope65(){
    try{return JSON.parse(sessionStorage.getItem('ubnb_ppg_v34_scope')||'null')}
    catch(_){return null}
  }

  function today65(){
    try{
      return new Intl.DateTimeFormat('en-CA',{
        timeZone:'Asia/Jakarta',year:'numeric',month:'2-digit',day:'2-digit'
      }).format(new Date())
    }catch(_){return ubnbWibIso84().slice(0,10)}
  }

  function safeFile65(s){
    return String(s||'data')
      .replace(/[\\/:*?"<>|]+/g,'_')
      .replace(/\s+/g,'_');
  }

  function normGender65(v){
    const s=String(v||'').trim().toLowerCase();
    if(['l','lk','laki','laki-laki','pria','male'].includes(s))return 'L';
    if(['p','pr','perempuan','wanita','female'].includes(s))return 'P';
    return '';
  }

  function rows65(){
    const sc=scope65();
    const drafts=get65(DRAFT_KEY,{});

    let jamaah=(Array.isArray(aJamaah)?aJamaah:[])
      .filter(j=>j.status_nikah==='Belum Menikah')
      .filter(j=>j.status_sambung==='Tetap');

    if(sc?.type==='kelompok'){
      jamaah=jamaah.filter(j=>j.kelompok_nama===sc.kelompok);
    }

    const jr=jamaah.map(j=>({
      did:String(j.did),
      nama:j.nama||'-',
      kk:j.nama_kk||'-',
      umur:(()=>{try{return umurFromTgl(j.tgl_lahir)}catch(_){return null}})(),
      kelas:drafts[String(j.did)]||j.kelas_kbm||j.kelas_usia||'Belum Ditentukan',
      kind:'jamaah',
      gender:normGender65(j.jenis_kelamin)
    }));

    let simp=get65(SYMP_KEY,[]);
    if(sc?.type==='kelompok'){
      simp=simp.filter(x=>x.scope===sc.kelompok);
    }

    const sr=simp.map(x=>({
      did:String(x.id),
      nama:x.nama||'-',
      kk:x.nama_kk||'-',
      umur:x.umur??null,
      kelas:x.kelas||'Belum Ditentukan',
      kind:'simpatisan',
      gender:normGender65(x.jenis_kelamin||x.gender)
    }));

    return [...jr,...sr];
  }

  function groups65(){
    const rows=rows65();
    const remaja=rows.filter(x=>x.kelas==='Remaja');

    const groups=[
      {kelas:'Cabe Rawit Tahap A',rows:rows.filter(x=>x.kelas==='Cabe Rawit Tahap A')},
      {kelas:'Cabe Rawit Tahap B',rows:rows.filter(x=>x.kelas==='Cabe Rawit Tahap B')},
      {kelas:'Cabe Rawit Tahap C',rows:rows.filter(x=>x.kelas==='Cabe Rawit Tahap C')},
      {kelas:'Pra Remaja',rows:rows.filter(x=>x.kelas==='Pra Remaja')},
      {kelas:'Remaja Laki-laki',rows:remaja.filter(x=>x.gender==='L')},
      {kelas:'Remaja Perempuan',rows:remaja.filter(x=>x.gender==='P')}
    ].map(g=>({
      ...g,
      rows:g.rows.sort((a,b)=>String(a.nama).localeCompare(String(b.nama),'id'))
    }));

    return {
      groups,
      unknownRemaja:remaja.filter(x=>!x.gender)
    };
  }

  function display65(r){
    const nama=String(r.nama||'-').trim();
    const kk=String(r.kk||'').trim();

    let s=nama;
    if(kk && kk!=='-' && kk.toLowerCase()!==nama.toLowerCase()){
      s+=` (${kk})`;
    }
    if(r.kind==='simpatisan')s+=' [S]';
    return s;
  }

  function fitPdf65(doc,text,maxWidth,start,min){
    let fs=start;
    doc.setFontSize(fs);

    while(fs>min && doc.getTextWidth(text)>maxWidth){
      fs-=0.15;
      doc.setFontSize(fs);
    }

    if(doc.getTextWidth(text)<=maxWidth)return {text,fs};

    let s=text;
    while(s.length>1 && doc.getTextWidth(s+'…')>maxWidth){
      s=s.slice(0,-1);
    }
    return {text:s+'…',fs};
  }

  function pairMax65(groups){
    return [
      Math.max(groups[0].rows.length,groups[1].rows.length,1),
      Math.max(groups[2].rows.length,groups[3].rows.length,1),
      Math.max(groups[4].rows.length,groups[5].rows.length,1)
    ];
  }

  function calcPdfLayout65(groups){
    const pageH=297;
    const top=21,bottom=14,gapY=5;
    const titleH=10; // header kelas
    const maxRows=pairMax65(groups);

    const availableForBoxes=pageH-top-bottom-gapY*2;
    const coefficient=maxRows.reduce((n,c)=>n+(c+1),0); // +1 header tabel tiap pasangan
    const targetRowH=5.2;
    const fitRowH=(availableForBoxes-titleH*3)/coefficient;
    const rowH=Math.max(3.5,Math.min(targetRowH,fitRowH));

    const pairHeights=maxRows.map(n=>titleH+(n+1)*rowH);

    let y=top;
    const ys=[];
    pairHeights.forEach((h,i)=>{
      ys.push(y);
      y+=h+(i<2?gapY:0);
    });

    return {rowH,pairHeights,ys};
  }

  function drawPdfBox65(doc,g,x,y,w,h,rowH){
    const rows=g.rows;

    doc.setDrawColor(205,219,210);
    doc.setFillColor(248,251,249);
    doc.roundedRect(x,y,w,h,2,2,'FD');

    doc.setFillColor(233,245,237);
    doc.rect(x,y,w,10,'F');

    doc.setTextColor(20,95,61);
    doc.setFont('helvetica','bold');
    doc.setFontSize(9.2);
    doc.text(g.kelas,x+3,y+6.5);

    doc.setFont('helvetica','normal');
    doc.setFontSize(6.8);
    doc.setTextColor(95,108,101);
    doc.text(`${rows.length} murid`,x+w-3,y+6.3,{align:'right'});

    const headY=y+10;
    const noW=8.5;
    const ageW=11;
    const nameW=w-noW-ageW;

    doc.setFillColor(23,106,65);
    doc.rect(x,headY,w,rowH,'F');

    doc.setTextColor(255,255,255);
    doc.setFont('helvetica','bold');
    const headerFs=Math.min(7.2,Math.max(6.0,rowH*1.16));
    doc.setFontSize(headerFs);
    doc.text('No',x+noW/2,headY+rowH*.69,{align:'center'});
    doc.text('Nama (KK)',x+noW+2,headY+rowH*.69);
    doc.text('Umur',x+w-ageW/2,headY+rowH*.69,{align:'center'});

    let cy=headY+rowH;
    rows.forEach((r,i)=>{
      if(i%2===1){
        doc.setFillColor(253,254,253);
        doc.rect(x,cy,w,rowH,'F');
      }

      doc.setDrawColor(230,236,232);
      doc.line(x,cy+rowH,x+w,cy+rowH);

      const baseFs=Math.min(7.8,Math.max(6.6,rowH*1.40));

      doc.setTextColor(35,52,43);
      doc.setFont('helvetica','normal');
      doc.setFontSize(baseFs);

      doc.text(String(i+1),x+noW/2,cy+rowH*.68,{align:'center'});

      const shown=display65(r);
      const fit=fitPdf65(doc,shown,nameW-4,baseFs,5.3);
      doc.setFontSize(fit.fs);
      doc.text(fit.text,x+noW+2,cy+rowH*.68);

      doc.setFontSize(baseFs);
      doc.text(r.umur==null?'-':String(r.umur),x+w-ageW/2,cy+rowH*.68,{align:'center'});

      cy+=rowH;
    });
  }

  window.ppg56ExportSetupPDF=function(){
    try{
      const jsPDFCtor=window.jspdf?.jsPDF;
      if(!jsPDFCtor)throw new Error('Library PDF belum siap.');

      const {groups,unknownRemaja}=groups65();
      const doc=new jsPDFCtor({orientation:'portrait',unit:'mm',format:'a4'});
      const scopeName=scope65()?.type==='kelompok'?(scope65()?.kelompok||'Kelompok'):'Desa Perwira';

      doc.setTextColor(20,95,61);
      doc.setFont('helvetica','bold');
      doc.setFontSize(15);
      doc.text(`Data Murid KBM - ${scopeName}`,10,11);

      doc.setTextColor(105,118,110);
      doc.setFont('helvetica','normal');
      doc.setFontSize(7.4);
      doc.text(`PPG Perwira · ${today65()} · [S] = Simpatisan`,10,16);

      const marginX=10;
      const gapX=5;
      const boxW=(210-marginX*2-gapX)/2;

      const lay=calcPdfLayout65(groups);

      for(let pair=0;pair<3;pair++){
        const y=lay.ys[pair];
        const h=lay.pairHeights[pair];

        drawPdfBox65(doc,groups[pair*2],marginX,y,boxW,h,lay.rowH);
        drawPdfBox65(doc,groups[pair*2+1],marginX+boxW+gapX,y,boxW,h,lay.rowH);
      }

      if(unknownRemaja.length){
        doc.setFont('helvetica','normal');
        doc.setFontSize(6);
        doc.setTextColor(135,90,30);
        const txt='Remaja belum memiliki data L/P: '+unknownRemaja.map(x=>x.nama).join(', ');
        doc.text(doc.splitTextToSize(txt,190),10,294);
      }

      doc.save(safeFile65(`Data_Murid_KBM_${scopeName}_${today65()}`)+'.pdf');
    }catch(e){
      console.error(e);
      toast(e?.message||'Gagal membuat PDF.',true);
    }
  };

  function fitCanvas65(ctx,text,maxWidth,start,min){
    let fs=start;

    while(fs>min){
      ctx.font=`${fs}px Arial`;
      if(ctx.measureText(text).width<=maxWidth)break;
      fs-=0.2;
    }

    ctx.font=`${fs}px Arial`;
    if(ctx.measureText(text).width<=maxWidth)return {text,fs};

    let s=text;
    while(s.length>1 && ctx.measureText(s+'…').width>maxWidth){
      s=s.slice(0,-1);
    }
    return {text:s+'…',fs};
  }

  function calcCanvasLayout65(groups){
    const pageH=1123;
    const top=76,bottom=44,gapY=16;
    const titleH=34;
    const maxRows=pairMax65(groups);

    const availableForBoxes=pageH-top-bottom-gapY*2;
    const coefficient=maxRows.reduce((n,c)=>n+(c+1),0);
    const targetRowH=19.5;
    const fitRowH=(availableForBoxes-titleH*3)/coefficient;
    const rowH=Math.max(13,Math.min(targetRowH,fitRowH));

    const pairHeights=maxRows.map(n=>titleH+(n+1)*rowH);

    let y=top;
    const ys=[];
    pairHeights.forEach((h,i)=>{
      ys.push(y);
      y+=h+(i<2?gapY:0);
    });

    return {rowH,pairHeights,ys};
  }

  function drawCanvasBox65(ctx,g,x,y,w,h,rowH){
    const rows=g.rows;

    ctx.fillStyle='#f8fbf9';
    ctx.strokeStyle='#cddbd2';
    ctx.lineWidth=1;
    ctx.beginPath();
    ctx.roundRect(x,y,w,h,6);
    ctx.fill();
    ctx.stroke();

    const hh=34;

    ctx.fillStyle='#e9f5ed';
    ctx.fillRect(x,y,w,hh);

    ctx.fillStyle='#145f3d';
    ctx.font='700 13.5px Arial';
    ctx.fillText(g.kelas,x+9,y+22);

    ctx.fillStyle='#66766d';
    ctx.font='9.8px Arial';
    ctx.textAlign='right';
    ctx.fillText(`${rows.length} murid`,x+w-9,y+21);
    ctx.textAlign='left';

    const tableY=y+hh;
    const noW=31;
    const ageW=42;
    const nameW=w-noW-ageW;

    ctx.fillStyle='#176a41';
    ctx.fillRect(x,tableY,w,rowH);

    const headerFs=Math.min(10.5,Math.max(9,rowH*.48));
    ctx.fillStyle='#fff';
    ctx.font=`700 ${headerFs}px Arial`;
    ctx.fillText('No',x+8,tableY+rowH*.69);
    ctx.fillText('Nama (KK)',x+noW+4,tableY+rowH*.69);

    ctx.textAlign='center';
    ctx.fillText('Umur',x+w-ageW/2,tableY+rowH*.69);
    ctx.textAlign='left';

    let cy=tableY+rowH;

    rows.forEach((r,i)=>{
      if(i%2===1){
        ctx.fillStyle='#fff';
        ctx.fillRect(x,cy,w,rowH);
      }

      ctx.strokeStyle='#e6ece8';
      ctx.beginPath();
      ctx.moveTo(x,cy+rowH);
      ctx.lineTo(x+w,cy+rowH);
      ctx.stroke();

      const baseFs=Math.min(11.5,Math.max(9,rowH*.52));

      ctx.fillStyle='#24362c';
      ctx.font=`${baseFs}px Arial`;

      ctx.textAlign='center';
      ctx.fillText(String(i+1),x+noW/2,cy+rowH*.68);

      ctx.textAlign='left';
      const shown=display65(r);
      const fit=fitCanvas65(ctx,shown,nameW-8,baseFs,7.2);
      ctx.font=`${fit.fs}px Arial`;
      ctx.fillText(fit.text,x+noW+4,cy+rowH*.68);

      ctx.font=`${baseFs}px Arial`;
      ctx.textAlign='center';
      ctx.fillText(r.umur==null?'-':String(r.umur),x+w-ageW/2,cy+rowH*.68);
      ctx.textAlign='left';

      cy+=rowH;
    });
  }

  window.ppg56ExportSetupPNG=function(){
    try{
      const {groups,unknownRemaja}=groups65();

      const c=document.createElement('canvas');
      c.width=794;
      c.height=1123;
      const ctx=c.getContext('2d');

      ctx.fillStyle='#fff';
      ctx.fillRect(0,0,c.width,c.height);

      const scopeName=scope65()?.type==='kelompok'?(scope65()?.kelompok||'Kelompok'):'Desa Perwira';

      ctx.fillStyle='#145f3d';
      ctx.font='700 23px Arial';
      ctx.fillText(`Data Murid KBM - ${scopeName}`,38,42);

      ctx.fillStyle='#6b7971';
      ctx.font='11.5px Arial';
      ctx.fillText(`PPG Perwira · ${today65()} · [S] = Simpatisan`,38,61);

      const mx=38;
      const gx=16;
      const bw=(c.width-mx*2-gx)/2;

      const lay=calcCanvasLayout65(groups);

      for(let pair=0;pair<3;pair++){
        const y=lay.ys[pair];
        const h=lay.pairHeights[pair];

        drawCanvasBox65(ctx,groups[pair*2],mx,y,bw,h,lay.rowH);
        drawCanvasBox65(ctx,groups[pair*2+1],mx+bw+gx,y,bw,h,lay.rowH);
      }

      if(unknownRemaja.length){
        ctx.fillStyle='#8b6326';
        ctx.font='10px Arial';
        const txt='Remaja belum memiliki data L/P: '+unknownRemaja.map(x=>x.nama).join(', ');
        ctx.fillText(txt.slice(0,115),38,c.height-18);
      }

      c.toBlob(blob=>{
        if(!blob)return toast('Gagal membuat gambar.',true);

        const url=URL.createObjectURL(blob);
        const a=document.createElement('a');
        a.href=url;
        a.download=safeFile65(`Data_Murid_KBM_${scopeName}_${today65()}`)+'.png';

        document.body.appendChild(a);
        a.click();
        a.remove();

        setTimeout(()=>URL.revokeObjectURL(url),1000);
      },'image/png');
    }catch(e){
      console.error(e);
      toast(e?.message||'Gagal membuat gambar.',true);
    }
  };
})();

/* ============================================================
   SOURCE: ubnb-v66-ppg-permission-mode-switch-script
   ============================================================ */
(function(){
  const SCOPE_KEY='ubnb_ppg_v34_scope';
  const PREF_KEYS=new Set(['ubnb_ppg_v38_setup_collapsed']);

  function norm66(s){
    return String(s||'')
      .trim()
      .toLowerCase()
      .replace(/[._/\\-]+/g,' ')
      .replace(/\s+/g,' ');
  }

  function isMaster66(){
    if(!CU)return false;
    const role=norm66(CU.role);
    let p=CU.permissions;
    try{if(typeof p==='string')p=JSON.parse(p)}catch(_){}

    return CU.is_master===true ||
      CU.master===true ||
      CU.ppg_master===true ||
      ['master','master admin','master_admin','superadmin'].includes(role) ||
      (p&&typeof p==='object'&&(p.master===true||p.master_admin===true)) ||
      String(CU.did||CU.id||'')==='4075' ||
      /(^|\s)setyo(\s|$)/i.test(String(CU.nama||CU.username||''));
  }

  function isMTMS66(label){
    const x=' '+norm66(label)+' ';
    return /(^|\s)mt(\s|$)/.test(x) || /(^|\s)ms(\s|$)/.test(x);
  }

  function currentScope66(){
    try{return JSON.parse(sessionStorage.getItem(SCOPE_KEY)||'null')}
    catch(_){return null}
  }

  function activeRoles66(){
    const did=String(CU?.did||CU?.id||'');
    if(!did)return [];
    return (Array.isArray(aPengurus)?aPengurus:[])
      .filter(p=>p && p.aktif!==false && String(p.did)===did);
  }

  function canActScope66(scopeObj){
    if(!scopeObj)return false;

    /* Controller Desa selalu review-only.
       Master melakukan aksi dengan memilih PW1-PW4. */
    if(scopeObj.type==='controller')return false;

    if(isMaster66())return true;

    const g=scopeObj.kelompok;
    return activeRoles66().some(p=>
      isMTMS66(p.dapukan) &&
      (
        (p.level==='kelompok' && p.kelompok_nama===g) ||
        (p.level==='khusus' && p.akses_level==='kelompok' && p.akses_kelompok_nama===g)
      )
    );
  }

  function canAct66(){return canActScope66(currentScope66())}

  window.ppgCanAct66=canAct66;
  window.ppgIsMaster66=isMaster66;

  /* Safety guard:
     bila mode review, shared state PPG tidak boleh berubah bahkan bila
     ada handler lama yang terlewat. Preference tampilan user tetap boleh. */
  const setBefore66=Storage.prototype.setItem;
  Storage.prototype.setItem=function(key,value){
    try{
      if(
        this===window.localStorage &&
        String(key).startsWith('ubnb_ppg_') &&
        currentScope66() &&
        !canAct66() &&
        !PREF_KEYS.has(String(key))
      ){
        return;
      }
    }catch(_){}
    return setBefore66.apply(this,arguments);
  };

  /* ---------- Database Perwira: tombol pindah mode ---------- */
  function ensureDatabaseModeButton66(){
    const bar=document.querySelector('#app .topbar-right');
    if(!bar)return;

    let btn=document.getElementById('db-mode-switch-66');

    let canAccess=false;
    try{
      canAccess=typeof window.ppgCanAccess==='function' && window.ppgCanAccess();
    }catch(_){}

    if(!canAccess){
      btn?.remove();
      return;
    }

    if(!btn){
      btn=document.createElement('button');
      btn.id='db-mode-switch-66';
      btn.className='btn-mode-switch';
      btn.type='button';
      btn.textContent='⇄ Mode';
      btn.title='Pilih Database Perwira / PPG Perwira';
      btn.onclick=()=>{
        document.getElementById('ppg-shell')?.classList.remove('show');
        window.ppgShowPortal?.();
      };

      const user=document.getElementById('user-badge');
      if(user)bar.insertBefore(btn,user);
      else bar.insertBefore(btn,bar.firstChild);
    }
  }

  /* ---------- Scope Gate ---------- */
  function patchScopeGate66(){
    const gate=document.getElementById('ppg-scope-gate');
    const box=document.getElementById('ppg-scope-list');
    if(!gate||!box)return;

    if(isMaster66()){
      const opts=[
        {type:'controller',kelompok:null,label:'Controller Desa',meta:'Monitoring & reporting seluruh PPG Desa Perwira'},
        ...['PW1','PW2','PW3','PW4'].map(g=>({
          type:'kelompok',
          kelompok:g,
          label:`Kelompok ${g}`,
          meta:`Operasional KBM ${g}`
        }))
      ];
      window.__PPG34_SCOPE_OPTIONS=opts;
      box.innerHTML=opts.map((s,i)=>`
        <button class="ppg-scope-option" onclick="ppgSelectScope34(${i})">
          <div class="title">${s.label}</div>
          <div class="meta">${s.meta}</div>
        </button>
      `).join('');
      return;
    }

    const opts=window.__PPG34_SCOPE_OPTIONS||[];
    [...box.querySelectorAll('.ppg-scope-option')].forEach((b,i)=>{
      const s=opts[i];
      const meta=b.querySelector('.meta');
      if(!s||!meta)return;

      if(s.type==='controller'){
        meta.textContent='Monitoring & reporting seluruh PPG Desa Perwira';
      }else{
        meta.textContent=canActScope66(s)
          ?`Operasional KBM ${s.kelompok}`
          :`Review & Reporting KBM ${s.kelompok}`;
      }
    });
  }

  const oldChoosePPG66=window.ppgChoosePPG;
  window.ppgChoosePPG=function(){
    const r=oldChoosePPG66?.apply(this,arguments);
    setTimeout(patchScopeGate66,0);
    return r;
  };

  /* ---------- Read-only UI ---------- */
  const ALLOWED_TEXT=[
    'download','pdf','png','lihat','review','riwayat',
    'aktif hari ini','collapse','expand','pilih mode','kembali'
  ];

  const WRITE_TEXT=[
    'mulai kelas','mulai kelas baru','+ dewan guru',
    'atur kelas','kelola kelas','+ simpatisan','tambah simpatisan',
    'tambah materi','simpan materi','simpan','hapus',
    'selesaikan kelas','tutup kelas',
    'generate laporan','generate laporan berikutnya',
    'tambah kurikulum','hapus materi'
  ];

  const WRITE_HANDLERS=[
    'ppg38opensimp',
    'ppg47openclassmanager',
    'ppg52openstart',
    'ppg52openaddguru',
    'ppg52editguru',
    'ppg52removeguru',
    'ppg37genreport',
    'ppg54confirmfinish',
    'ppg37finish',
    'saveguru',
    'addclass',
    'deleteclass',
    'changeclass',
    'masterysave'
  ];

  function isWriteButton66(btn){
    if(!btn)return false;

    const text=norm66(btn.textContent);
    const oc=norm66(btn.getAttribute('onclick'));

    if(ALLOWED_TEXT.some(x=>text.includes(x)))return false;
    if(WRITE_HANDLERS.some(x=>oc.includes(x)))return true;
    return WRITE_TEXT.some(x=>text===x || text.startsWith(x+' ') || text.includes(x));
  }

  function lockPage66(root){
    if(!root)return;

    root.querySelectorAll('button').forEach(btn=>{
      if(isWriteButton66(btn))btn.classList.add('ppg66-write-only');
    });

    root.querySelectorAll('#ppg-page-setup select').forEach(x=>{
      x.disabled=true;
      x.dataset.ppg66Locked='1';
    });

    root.querySelectorAll('#ppg-page-kelas select,#ppg-page-kelas input,#ppg-page-kelas textarea').forEach(x=>{
      x.disabled=true;
      x.dataset.ppg66Locked='1';
    });

    root.querySelectorAll('#ppg-page-guru button').forEach(btn=>{
      const t=norm66(btn.textContent);
      if(t.includes('atur kelas')||t.includes('hapus')||t.includes('dewan guru')){
        btn.classList.add('ppg66-write-only');
      }
    });

    root.querySelectorAll('#ppg-page-kurikulum .ppg35-mastery-status').forEach(x=>{
      x.disabled=true;
      x.dataset.ppg66Locked='1';
    });

    root.querySelectorAll('#ppg-page-kurikulum input:not([type="search"]),#ppg-page-kurikulum textarea').forEach(x=>{
      x.disabled=true;
      x.dataset.ppg66Locked='1';
    });

    root.querySelectorAll('#ppg-page-laporan button').forEach(btn=>{
      if(norm66(btn.textContent).includes('generate')){
        btn.classList.add('ppg66-write-only');
      }
    });
  }

  function unlockPage66(root){
    if(!root)return;

    root.querySelectorAll('.ppg66-write-only').forEach(x=>{
      x.classList.remove('ppg66-write-only');
    });

    root.querySelectorAll('[data-ppg66-locked="1"]').forEach(x=>{
      x.disabled=false;
      delete x.dataset.ppg66Locked;
    });
  }

  function updateAccessUI66(){
    const shell=document.getElementById('ppg-shell');
    if(!shell)return;

    const act=canAct66();
    shell.classList.toggle('ppg66-readonly',!act);

    const brand=document.querySelector('#ppg-shell .ppg-brand-sub');
    if(brand){
      let chip=document.getElementById('ppg66-access-chip');
      if(!chip){
        chip=document.createElement('span');
        chip.id='ppg66-access-chip';
        brand.appendChild(chip);
      }
      chip.className=act?'operational':'review';
      chip.textContent=act?'Operasional':'Review';
    }

    if(act){
      unlockPage66(shell);
      shell.querySelector('.ppg66-review-note')?.remove();
    }else{
      lockPage66(shell);

      const page=shell.querySelector('.ppg-page.active');
      if(page && !page.querySelector('.ppg66-review-note')){
        const note=document.createElement('div');
        note.className='ppg66-review-note';
        note.textContent='Mode Review & Reporting — perubahan data hanya dapat dilakukan oleh MT, MS, atau Master User.';
        page.prepend(note);
      }
    }

    const dashSub=shell.querySelector('#ppg-page-dashboard .ppg-v33-stage-sub');
    if(dashSub){
      dashSub.textContent=act
        ?'Operasional kegiatan KBM'
        :'Review & Reporting kegiatan KBM';
    }
  }

  /* Capture guard untuk handler lama */
  document.addEventListener('click',e=>{
    const shell=e.target.closest?.('#ppg-shell');
    if(!shell||canAct66())return;

    const btn=e.target.closest('button');
    if(btn&&isWriteButton66(btn)){
      e.preventDefault();
      e.stopImmediatePropagation();
      toast('Mode Review: perubahan data hanya untuk MT, MS, atau Master User.',true);
    }
  },true);

  document.addEventListener('change',e=>{
    const shell=e.target.closest?.('#ppg-shell');
    if(!shell||canAct66())return;

    if(
      e.target.matches('#ppg-page-setup select') ||
      e.target.matches('#ppg-page-kelas select') ||
      e.target.matches('.ppg35-mastery-status')
    ){
      e.preventDefault();
      e.stopImmediatePropagation();
      toast('Mode Review: data tidak dapat diubah.',true);
    }
  },true);

  /* Re-apply setelah render innerHTML */
  const shell=document.getElementById('ppg-shell');
  if(shell){
    let timer=0;
    new MutationObserver(()=>{
      clearTimeout(timer);
      timer=setTimeout(updateAccessUI66,30);
    }).observe(shell,{childList:true,subtree:true});
  }

  const oldSelectScope66=window.ppgSelectScope34;
  window.ppgSelectScope34=function(){
    const r=oldSelectScope66?.apply(this,arguments);
    setTimeout(updateAccessUI66,0);
    return r;
  };

  const oldOpenPage66=window.ppgOpenPage;
  window.ppgOpenPage=function(){
    const r=oldOpenPage66?.apply(this,arguments);
    setTimeout(updateAccessUI66,0);
    return r;
  };

  const oldShowPortal66=window.ppgShowPortal;
  window.ppgShowPortal=function(){
    const r=oldShowPortal66?.apply(this,arguments);
    setTimeout(()=>{
      const note=document.getElementById('ppg-access-note');
      if(note && typeof window.ppgCanAccess==='function' && window.ppgCanAccess()){
        note.textContent='Aksi PPG: MT, MS, Master User · Pengurus lain: Review & Reporting.';
      }
    },0);
    return r;
  };

  /* Header Database dapat dibangun ulang setelah login */
  const app=document.getElementById('app');
  if(app){
    let timer=0;
    new MutationObserver(()=>{
      clearTimeout(timer);
      timer=setTimeout(ensureDatabaseModeButton66,40);
    }).observe(app,{childList:true,subtree:true});
  }

  setTimeout(()=>{
    ensureDatabaseModeButton66();
    patchScopeGate66();
    updateAccessUI66();
  },800);
})();

/* ============================================================
   SOURCE: ubnb-v67-concurrency-ui-script
   ============================================================ */
(function(){
  function addBadge(){
    const host=document.querySelector('#ppg-shell .ppg-brand-sub');
    if(!host||document.getElementById('ppg67-live-badge'))return;
    const b=document.createElement('span');
    b.id='ppg67-live-badge';
    b.textContent='Multi-user';
    b.title='Sinkron multi-user aktif';
    host.appendChild(b);
  }

  const shell=document.getElementById('ppg-shell');
  if(shell){
    new MutationObserver(()=>setTimeout(addBadge,20))
      .observe(shell,{childList:true,subtree:true});
  }
  setTimeout(addBadge,700);
})();

/* ============================================================
   SOURCE: ubnb-v68-session-owner-script
   ============================================================ */
(function(){
  const KEY='ubnb_ppg_v37_classes';

  function norm68(s){
    return String(s||'')
      .trim()
      .toLowerCase()
      .replace(/\s+/g,' ');
  }

  function editorDid68(){
    return String(CU?.did||CU?.id||'').trim();
  }

  function editorNames68(){
    return new Set([
      norm68(CU?.nama),
      norm68(CU?.username)
    ].filter(Boolean));
  }

  function sessions68(){
    try{return JSON.parse(localStorage.getItem(KEY)||'[]')}
    catch(_){return []}
  }

  function owns68(s){
    const did=editorDid68();
    if(!s||!did)return false;

    if(String(s.startedByDid||'').trim()){
      return String(s.startedByDid)===did;
    }

    const names=editorNames68();
    if(names.has(norm68(s.startedBy)))return true;

    /* legacy fallback untuk sesi lama yang belum punya startedByDid */
    if(!s.startedBy && String(s.teacherDid||'')===did)return true;

    return false;
  }

  function stampOwner68(next,prev){
    const prevMap=new Map(
      (Array.isArray(prev)?prev:[])
        .filter(x=>x?.id)
        .map(x=>[String(x.id),x])
    );

    const did=editorDid68();
    const nm=CU?.nama||CU?.username||'-';
    const out=[];

    for(const incoming of (Array.isArray(next)?next:[])){
      if(!incoming?.id)continue;

      const id=String(incoming.id);
      const old=prevMap.get(id);

      if(!old){
        /* session baru: akun login yang menekan Mulai Kelas menjadi owner */
        out.push({
          ...incoming,
          startedByDid: incoming.startedByDid || did,
          startedBy: incoming.startedBy || nm
        });
        continue;
      }

      if(owns68(old)){
        out.push({
          ...incoming,
          startedByDid: old.startedByDid || did,
          startedBy: old.startedBy || incoming.startedBy || nm
        });
      }else{
        /* akun lain tidak boleh mengubah / menghapus / menutup sesi ini */
        out.push(old);
      }

      prevMap.delete(id);
    }

    /* session milik akun lain tidak boleh hilang karena payload lokal lama */
    for(const old of prevMap.values()){
      out.push(old);
    }

    return out.sort((a,b)=>
      String(a.startedAt||a.id||'').localeCompare(String(b.startedAt||b.id||''))
    );
  }

  /*
    Guard cache lokal:
    sebelum v60 persistence mengirim payload ke Supabase, session array
    sudah dibersihkan agar hanya owner yang bisa mengubah sesi miliknya.
  */
  const setBefore68=Storage.prototype.setItem;
  Storage.prototype.setItem=function(key,value){
    if(this===window.localStorage && String(key)===KEY){
      try{
        const prev=sessions68();
        const next=JSON.parse(String(value)||'[]');
        value=JSON.stringify(stampOwner68(next,prev));
      }catch(e){
        console.error('[PPG owner guard local]',e);
      }
    }
    return setBefore68.call(this,key,value);
  };

  function idFromCard68(card){
    const btn=card?.querySelector('.ppg52-active-summary');
    const oc=String(btn?.getAttribute('onclick')||'');
    const m=oc.match(/ppg52ToggleActive\(['"]([^'"]+)['"]\)/);
    return m?.[1]||'';
  }

  function decorate68(){
    const all=sessions68();
    const map=new Map(all.map(x=>[String(x.id),x]));

    document.querySelectorAll('#ppg-page-kelas .ppg52-active-card').forEach(card=>{
      const id=idFromCard68(card);
      const s=map.get(String(id));
      if(!s)return;

      const own=owns68(s);
      card.classList.toggle('ppg68-foreign-session',!own);

      const meta=card.querySelector('.ppg52-active-meta');
      if(meta && !meta.querySelector('.ppg68-owner-badge')){
        const b=document.createElement('span');
        b.className='ppg68-owner-badge';
        b.textContent=own?'Sesi Saya':'Review';
        meta.appendChild(b);
      }

      const detail=card.querySelector('.ppg52-detail');
      if(detail){
        detail.querySelector('.ppg68-lock-note')?.remove();

        if(!own && card.classList.contains('expanded')){
          const note=document.createElement('div');
          note.className='ppg68-lock-note';
          note.textContent=`Kelas dibuka oleh ${s.startedBy||s.teacherName||'akun lain'}. Hanya akun pembuka kelas yang dapat mengubah absensi, materi, catatan, atau menutup kelas.`;
          detail.prepend(note);
        }
      }
    });
  }

  /* Capture guard untuk seluruh kontrol sesi aktif akun lain */
  document.addEventListener('click',e=>{
    const card=e.target.closest?.('#ppg-page-kelas .ppg52-active-card.ppg68-foreign-session');
    if(!card)return;

    /* summary tetap boleh diklik untuk review */
    if(e.target.closest('.ppg52-active-summary'))return;

    const interactive=e.target.closest('button,input,select,textarea,label');
    if(interactive){
      e.preventDefault();
      e.stopImmediatePropagation();
      toast('Hanya akun yang membuka kelas ini yang dapat melakukan perubahan.',true);
    }
  },true);

  document.addEventListener('change',e=>{
    const card=e.target.closest?.('#ppg-page-kelas .ppg52-active-card.ppg68-foreign-session');
    if(!card)return;

    e.preventDefault();
    e.stopImmediatePropagation();
    toast('Hanya akun yang membuka kelas ini yang dapat melakukan perubahan.',true);
  },true);

  /* render Kelas KBM sering mengganti innerHTML, jadi dekorasi diulang */
  const page=document.getElementById('ppg-page-kelas');
  if(page){
    let t=0;
    new MutationObserver(()=>{
      clearTimeout(t);
      t=setTimeout(decorate68,25);
    }).observe(page,{childList:true,subtree:true});
  }

  const oldOpen68=window.ppgOpenPage;
  window.ppgOpenPage=function(){
    const r=oldOpen68?.apply(this,arguments);
    setTimeout(decorate68,0);
    return r;
  };

  const oldToggle68=window.ppg52ToggleActive;
  window.ppg52ToggleActive=function(){
    const r=oldToggle68?.apply(this,arguments);
    setTimeout(decorate68,0);
    return r;
  };

  window.ppg68SessionOwner={
    owns:owns68,
    currentDid:editorDid68,
    sessions:sessions68
  };

  setTimeout(decorate68,800);
})();

/* ============================================================
   SOURCE: ubnb-v69-door-menu-script
   ============================================================ */
(function(){
  function canPPG69(){
    try{
      return typeof window.ppgCanAccess==='function' && !!window.ppgCanAccess();
    }catch(_){
      return false;
    }
  }

  function closeMenus69(except){
    document.querySelectorAll('.ubnb69-door-menu.show').forEach(m=>{
      if(m!==except)m.classList.remove('show');
    });
    document.querySelectorAll('.ubnb69-door-btn[aria-expanded="true"]').forEach(b=>{
      if(!except || b.nextElementSibling!==except)b.setAttribute('aria-expanded','false');
    });
  }

  function toggleMenu69(btn,menu){
    const opening=!menu.classList.contains('show');
    closeMenus69(menu);
    menu.classList.toggle('show',opening);
    btn.setAttribute('aria-expanded',opening?'true':'false');
  }

  function switchMode69(){
    closeMenus69();
    try{
      document.getElementById('ppg-shell')?.classList.remove('show');
      window.ppgShowPortal?.();
    }catch(e){
      console.error('[Mode switch]',e);
    }
  }

  async function logout69(){
    closeMenus69();
    await window.keluar?.();
  }

  function menuHTML69(idPrefix,showMode){
    return `
      ${showMode?`
      <button type="button" class="ubnb69-door-item" id="${idPrefix}-switch">
        <span>⇄</span><span>Pindah Mode</span>
      </button>
      <div class="ubnb69-door-sep"></div>`:''}
      <button type="button" class="ubnb69-door-item danger" id="${idPrefix}-logout">
        <span>🚪</span><span>Keluar</span>
      </button>
    `;
  }

  function wireMenu69(btn,menu,idPrefix){
    btn.onclick=(e)=>{
      e.preventDefault();
      e.stopPropagation();
      toggleMenu69(btn,menu);
    };

    const sw=document.getElementById(`${idPrefix}-switch`);
    if(sw)sw.onclick=(e)=>{
      e.preventDefault();
      e.stopPropagation();
      switchMode69();
    };

    const lo=document.getElementById(`${idPrefix}-logout`);
    if(lo)lo.onclick=(e)=>{
      e.preventDefault();
      e.stopPropagation();
      logout69();
    };
  }

  /* =======================================================
     DATABASE PERWIRA
     Gunakan tombol pintu existing agar header tetap hemat.
     ======================================================= */
  function setupDatabaseDoor69(){
    /* mode button v66 kalau muncul lagi dari observer cukup dibuang */
    document.getElementById('db-mode-switch-66')?.remove();

    const top=document.querySelector('#app .topbar-right');
    const old=document.querySelector('#app .topbar-right > .btn-keluar');
    if(!top||!old)return;

    old.textContent='🚪';
    old.title='Menu';
    old.setAttribute('aria-label','Menu akun');
    old.setAttribute('aria-haspopup','menu');
    old.setAttribute('aria-expanded','false');

    /* wrapper ditambahkan tanpa merusak urutan badge */
    let wrap=document.getElementById('db69-door-wrap');
    if(!wrap){
      wrap=document.createElement('div');
      wrap.id='db69-door-wrap';
      wrap.className='ubnb69-door-wrap';

      top.insertBefore(wrap,old);
      wrap.appendChild(old);

      const menu=document.createElement('div');
      menu.id='db69-door-menu';
      menu.className='ubnb69-door-menu';
      menu.setAttribute('role','menu');
      menu.innerHTML=menuHTML69('db69',canPPG69());
      wrap.appendChild(menu);

      wireMenu69(old,menu,'db69');
    }else{
      const menu=document.getElementById('db69-door-menu');
      if(menu){
        const shouldMode=canPPG69();
        const hasMode=!!document.getElementById('db69-switch');
        if(shouldMode!==hasMode){
          menu.innerHTML=menuHTML69('db69',shouldMode);
          wireMenu69(old,menu,'db69');
        }
      }
    }
  }

  /* =======================================================
     PPG PERWIRA
     Ganti tombol "Pilih Mode" dengan pintu yang sama.
     ======================================================= */
  function setupPPGDoor69(){
    const bar=document.querySelector('#ppg-shell .ppg-topbar');
    if(!bar)return;

    /* tombol lama tetap hidden oleh CSS */
    const oldMode=bar.querySelector('.ppg-top-btn');
    if(oldMode)oldMode.style.display='none';

    let wrap=document.getElementById('ppg69-door-wrap');
    if(!wrap){
      wrap=document.createElement('div');
      wrap.id='ppg69-door-wrap';
      wrap.className='ubnb69-door-wrap';

      const btn=document.createElement('button');
      btn.id='ppg69-door-btn';
      btn.type='button';
      btn.className='ubnb69-door-btn';
      btn.textContent='🚪';
      btn.title='Menu';
      btn.setAttribute('aria-label','Menu akun');
      btn.setAttribute('aria-haspopup','menu');
      btn.setAttribute('aria-expanded','false');

      const menu=document.createElement('div');
      menu.id='ppg69-door-menu';
      menu.className='ubnb69-door-menu';
      menu.setAttribute('role','menu');
      menu.innerHTML=menuHTML69('ppg69',true);

      wrap.appendChild(btn);
      wrap.appendChild(menu);
      bar.appendChild(wrap);

      wireMenu69(btn,menu,'ppg69');
    }
  }

  /* klik di luar / Escape menutup dropdown */
  document.addEventListener('click',e=>{
    if(!e.target.closest?.('.ubnb69-door-wrap'))closeMenus69();
  });

  document.addEventListener('keydown',e=>{
    if(e.key==='Escape')closeMenus69();
  });

  /* header Database dirender ulang beberapa kali */
  const app=document.getElementById('app');
  if(app){
    let t=0;
    new MutationObserver(()=>{
      clearTimeout(t);
      t=setTimeout(setupDatabaseDoor69,30);
    }).observe(app,{childList:true,subtree:true});
  }

  /* PPG shell juga banyak innerHTML/render override */
  const shell=document.getElementById('ppg-shell');
  if(shell){
    let t=0;
    new MutationObserver(()=>{
      clearTimeout(t);
      t=setTimeout(setupPPGDoor69,30);
    }).observe(shell,{childList:true,subtree:true});
  }

  /* setelah fungsi pilih mode dipakai, pastikan menu terpasang */
  const oldChoosePPG69=window.ppgChoosePPG;
  window.ppgChoosePPG=function(){
    const r=oldChoosePPG69?.apply(this,arguments);
    setTimeout(setupPPGDoor69,0);
    return r;
  };

  const oldChooseDB69=window.ppgChooseDatabase;
  window.ppgChooseDatabase=function(){
    const r=oldChooseDB69?.apply(this,arguments);
    setTimeout(setupDatabaseDoor69,0);
    return r;
  };

  setTimeout(()=>{
    setupDatabaseDoor69();
    setupPPGDoor69();
  },700);

  window.ubnb69Menu={
    setupDatabase:setupDatabaseDoor69,
    setupPPG:setupPPGDoor69,
    close:closeMenus69
  };
})();

/* ============================================================
   SOURCE: ubnb-v70-remember-login-script
   ============================================================ */
(function(){
  const REMEMBER_KEY='ubnb_dashboard_last_login_v70';

  function readRemembered70(){
    try{
      const x=JSON.parse(localStorage.getItem(REMEMBER_KEY)||'null');
      if(!x||!x.type)return null;
      return x;
    }catch(_){
      return null;
    }
  }

  function savePengurus70(){
    if(!CU?.did || CU?._umum_match)return;
    try{
      localStorage.setItem(REMEMBER_KEY,JSON.stringify({
        type:'pengurus',
        did:String(CU.did),
        nama:CU.nama||CU.username||'',
        saved_at:ubnbWibIso84()
      }));
    }catch(e){
      console.warn('[Remember login pengurus]',e);
    }
  }

  function saveUmum70(){
    if(!CU?._umum_match)return;
    try{
      localStorage.setItem(REMEMBER_KEY,JSON.stringify({
        type:'umum',
        cu:CU,
        saved_at:ubnbWibIso84()
      }));
    }catch(e){
      console.warn('[Remember login umum]',e);
    }
  }

  function forget70(){
    try{localStorage.removeItem(REMEMBER_KEY)}catch(_){}
  }

  /*
    Seed sessionStorage SEBELUM handler DOMContentLoaded lama berjalan.
    Jadi mekanisme login/validasi existing tetap dipakai:
    - Pengurus tetap diverifikasi ulang via dashboard_pengurus_profile.
    - Token absensi tetap dibuat baru per sesi.
    - Yang disimpan lokal hanya identitas login terakhir, bukan token/password.
  */
  const remembered=readRemembered70();

  if(remembered?.type==='pengurus' && remembered.did){
    if(!sessionStorage.getItem('dashboard_kelompok_editor_session') &&
       !sessionStorage.getItem('ubnb_umum_jamaah')){
      sessionStorage.setItem(
        'dashboard_kelompok_editor_session',
        JSON.stringify({did:String(remembered.did)})
      );
    }
  }

  if(remembered?.type==='umum' && remembered.cu){
    if(!sessionStorage.getItem('ubnb_umum_jamaah') &&
       !sessionStorage.getItem('dashboard_kelompok_editor_session')){
      sessionStorage.setItem('ubnb_umum_jamaah',JSON.stringify(remembered.cu));
    }
  }

  /* Simpan otomatis setelah login manual sukses */
  const oldLoginPengurus70=window.doLoginPengurus;
  if(typeof oldLoginPengurus70==='function'){
    window.doLoginPengurus=async function(){
      const r=await oldLoginPengurus70.apply(this,arguments);
      if(CU?.did && !CU?._umum_match)savePengurus70();
      return r;
    };
  }

  const oldLoginUmum70=window.doLoginUmum;
  if(typeof oldLoginUmum70==='function'){
    window.doLoginUmum=async function(){
      const r=await oldLoginUmum70.apply(this,arguments);
      if(CU?._umum_match)saveUmum70();
      return r;
    };
  }

  /*
    Jika app berhasil dipulihkan dari session lama / remembered login,
    refresh timestamp dan format simpanannya.
  */
  window.addEventListener('DOMContentLoaded',()=>{
    setTimeout(()=>{
      if(CU?._umum_match)saveUmum70();
      else if(CU?.did)savePengurus70();
    },1200);
  });

  /*
    Keluar = logout sungguhan + lupakan login tersimpan.
    Pindah Mode tidak menghapus remember-login.
  */
  const oldKeluar70=window.keluar;
  if(typeof oldKeluar70==='function'){
    window.keluar=async function(){
      forget70();
      return oldKeluar70.apply(this,arguments);
    };
  }

  window.ubnbRememberLogin70={
    read:readRemembered70,
    forget:forget70,
    key:REMEMBER_KEY
  };
})();
