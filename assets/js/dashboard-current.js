/* UBNB v86 dashboard-current.js */

/* ============================================================
   SOURCE: ubnb-v71-door-menu-layer-fix-script
   ============================================================ */
(function(){
  function place71(btn,menu){
    if(!btn||!menu)return;

    /* Menu dipindahkan ke body supaya tidak terpotong header/nav/overflow */
    if(menu.parentElement!==document.body){
      document.body.appendChild(menu);
    }

    const r=btn.getBoundingClientRect();
    const vw=document.documentElement.clientWidth||window.innerWidth;
    const gap=6;

    menu.classList.add('ubnb71-portal-menu');
    menu.style.display='block';
    menu.style.visibility='hidden';

    const mw=menu.offsetWidth||170;
    let left=r.right-mw;
    if(left<8)left=8;
    if(left+mw>vw-8)left=Math.max(8,vw-mw-8);

    menu.style.left=left+'px';
    menu.style.right='auto';
    menu.style.top=(r.bottom+gap)+'px';
    menu.style.visibility='';
    menu.style.display='';
  }

  function close71(menu){
    if(!menu)return;
    menu.classList.remove('show');
  }

  function patchButton71(btnId,menuId){
    const btn=document.getElementById(btnId);
    const menu=document.getElementById(menuId);
    if(!btn||!menu||btn.dataset.ubnb71Patched==='1')return;

    btn.dataset.ubnb71Patched='1';

    btn.addEventListener('click',()=>{
      setTimeout(()=>{
        if(menu.classList.contains('show')){
          place71(btn,menu);
        }
      },0);
    },true);
  }

  function patchAll71(){
    patchButton71('db69-door-btn','db69-door-menu');
    patchButton71('ppg69-door-btn','ppg69-door-menu');

    /* Database memakai tombol keluar existing, id tombolnya tidak tetap.
       Cari berdasarkan wrapper. */
    const dbWrap=document.getElementById('db69-door-wrap');
    const dbBtn=dbWrap?.querySelector('.btn-keluar');
    const dbMenu=document.getElementById('db69-door-menu');

    if(dbBtn&&dbMenu&&dbBtn.dataset.ubnb71Patched!=='1'){
      dbBtn.dataset.ubnb71Patched='1';
      dbBtn.addEventListener('click',()=>{
        setTimeout(()=>{
          if(dbMenu.classList.contains('show')){
            place71(dbBtn,dbMenu);
          }
        },0);
      },true);
    }
  }

  function closePortalMenus71(){
    ['db69-door-menu','ppg69-door-menu'].forEach(id=>{
      const m=document.getElementById(id);
      if(m)close71(m);
    });
  }

  /* Reposisi saat viewport berubah; tutup saat scroll agar tidak nyasar */
  window.addEventListener('resize',()=>{
    const db=document.getElementById('db69-door-menu');
    const ppg=document.getElementById('ppg69-door-menu');

    if(db?.classList.contains('show')){
      const btn=document.getElementById('db69-door-wrap')?.querySelector('.btn-keluar');
      if(btn)place71(btn,db);
    }
    if(ppg?.classList.contains('show')){
      const btn=document.getElementById('ppg69-door-btn');
      if(btn)place71(btn,ppg);
    }
  });

  window.addEventListener('scroll',closePortalMenus71,true);

  const root=document.documentElement;
  let t=0;
  new MutationObserver(()=>{
    clearTimeout(t);
    t=setTimeout(patchAll71,30);
  }).observe(root,{childList:true,subtree:true});

  setTimeout(patchAll71,500);
  window.ubnb71DoorMenuFix={patch:patchAll71};
})();

/* ============================================================
   SOURCE: ubnb-v72-mode-report-note-script
   ============================================================ */
(function(){
  /* =========================================================
     1. DATABASE PERWIRA — pastikan menu pintu punya Pindah Mode
     ========================================================= */
  function norm72(v){
    return String(v||'')
      .trim()
      .toLowerCase()
      .replace(/[._/\\-]+/g,' ')
      .replace(/\s+/g,' ');
  }

  function hasPPGAccess72(){
    try{
      if(typeof window.ppgCanAccess==='function' && window.ppgCanAccess())return true;
    }catch(_){}

    try{
      if(typeof window.ppgIsMaster66==='function' && window.ppgIsMaster66())return true;
    }catch(_){}

    if(!window.CU)return false;

    const did=String(CU.did||CU.id||'');
    const role=norm72(CU.role);

    if(
      CU.is_master===true ||
      CU.master===true ||
      CU.ppg_master===true ||
      did==='4075' ||
      role==='master' ||
      role==='master admin' ||
      role==='master_admin' ||
      role==='superadmin'
    ) return true;

    return (Array.isArray(window.aPengurus)?aPengurus:[]).some(p=>{
      if(!p || p.aktif===false || String(p.did)!==did)return false;
      const d=' '+norm72(p.dapukan)+' ';
      return /(^|\s)mt(\s|$)/.test(d)
          || /(^|\s)ms(\s|$)/.test(d)
          || /(^|\s)ki(\s|$)/.test(d)
          || d.includes(' wakil ki ')
          || d.includes(' wk ki ')
          || d.includes(' penerobos ');
    });
  }

  function closeDoorMenus72(){
    document.querySelectorAll('.ubnb69-door-menu.show').forEach(m=>m.classList.remove('show'));
    document.querySelectorAll('.ubnb69-door-btn[aria-expanded="true"], .btn-keluar[aria-expanded="true"]')
      .forEach(b=>b.setAttribute('aria-expanded','false'));
  }

  function goMode72(){
    closeDoorMenus72();
    document.getElementById('ppg-shell')?.classList.remove('show');
    if(typeof window.ppgShowPortal==='function'){
      window.ppgShowPortal();
    }
  }

  function ensureDatabaseMode72(){
    const menu=document.getElementById('db69-door-menu');
    if(!menu)return;

    const allow=hasPPGAccess72();
    let sw=document.getElementById('db69-switch');

    if(!allow){
      sw?.remove();
      return;
    }

    if(!sw){
      sw=document.createElement('button');
      sw.type='button';
      sw.id='db69-switch';
      sw.className='ubnb69-door-item';
      sw.innerHTML='<span>⇄</span><span>Pindah Mode</span>';

      let sep=menu.querySelector('.ubnb69-door-sep');
      const logout=document.getElementById('db69-logout');

      if(sep){
        menu.insertBefore(sw,sep);
      }else if(logout){
        sep=document.createElement('div');
        sep.className='ubnb69-door-sep';
        menu.insertBefore(sw,logout);
        menu.insertBefore(sep,logout);
      }else{
        menu.prepend(sw);
      }
    }

    if(sw.dataset.v72Bound!=='1'){
      sw.dataset.v72Bound='1';
      sw.addEventListener('click',function(e){
        e.preventDefault();
        e.stopPropagation();
        goMode72();
      });
    }
  }

  /* menu/header dapat dirender ulang setelah login */
  let modeTimer72=0;
  new MutationObserver(function(){
    clearTimeout(modeTimer72);
    modeTimer72=setTimeout(ensureDatabaseMode72,40);
  }).observe(document.documentElement,{childList:true,subtree:true});

  [300,800,1500,3000].forEach(ms=>setTimeout(ensureDatabaseMode72,ms));

  /* =========================================================
     2. REPORT ACARA — sertakan Materi / Catatan
     ========================================================= */
  function recapEvent72(){
    const id=Number(window._finalRecapEventId);
    if(!id)return null;
    return (Array.isArray(window.aKegiatan)?aKegiatan:[])
      .find(k=>Number(k.id)===id) || null;
  }

  function recapNote72(){
    const k=recapEvent72();
    const r=window._finalRecapData?.rekap;
    return String(k?.catatan ?? r?.catatan ?? '').trim();
  }

  function noteBlock72(){
    const note=recapNote72();
    if(!note)return '';
    return `<div class="fr-event-note"><b>Materi / Catatan Acara</b><br>${escH(note).replace(/\n/g,'<br>')}</div>`;
  }

  /*
    renderFinalRecap lama tetap dipakai penuh.
    Setelah selesai, tambahkan Materi/Catatan tepat di bawah header.
    printFinalRecap lama mencetak isi #fr-content, jadi otomatis ikut PDF/cetak.
  */
  const oldRenderFinalRecap72=window.renderFinalRecap;
  if(typeof oldRenderFinalRecap72==='function'){
    window.renderFinalRecap=function(){
      const result=oldRenderFinalRecap72.apply(this,arguments);

      try{
        const content=document.getElementById('fr-content');
        if(!content)return result;

        content.querySelector('.fr-event-note')?.remove();

        const block=noteBlock72();
        if(block){
          const head=content.querySelector('.fr-head');
          if(head)head.insertAdjacentHTML('afterend',block);
          else content.insertAdjacentHTML('afterbegin',block);
        }
      }catch(e){
        console.error('[v72 report catatan]',e);
      }

      return result;
    };
  }

  /* Ringkasan tanpa nama / copy text juga ikut Materi/Catatan */
  const oldSummary72=window.finalRecapSummaryText;
  if(typeof oldSummary72==='function'){
    window.finalRecapSummaryText=function(){
      let text=oldSummary72.apply(this,arguments);
      const note=recapNote72();
      if(note){
        text += `\n\nMateri / Catatan Acara:\n${note}`;
      }
      return text;
    };
  }

  window.ubnb72={
    ensureDatabaseMode:ensureDatabaseMode72,
    hasPPGAccess:hasPPGAccess72,
    recapNote:recapNote72
  };
})();

/* ============================================================
   SOURCE: ubnb-v73-filter-download-script
   ============================================================ */
(function(){
  const MENU_ID='v73-jamaah-download-menu';

  function defaultCols73(){
    return (Array.isArray(window.EXPORT_COLUMNS)?EXPORT_COLUMNS:[])
      .filter(c=>c && c.tabel);
  }

  function rows73(){
    const cols=defaultCols73();
    if(!cols.length)throw new Error('Konfigurasi kolom export belum siap.');
    return {cols,rows:buildExportRows(cols)};
  }

  function filename73(ext){
    const d=new Date();
    const ts=[
      d.getFullYear(),
      String(d.getMonth()+1).padStart(2,'0'),
      String(d.getDate()).padStart(2,'0')
    ].join('-');

    const scope=String(
      CU?.kelompok_scope ||
      CU?.scope ||
      (typeof isViewer==='function' && isViewer()?'umum':'desa')
    ).replace(/[^a-z0-9_-]+/gi,'_');

    return `Jamaah_${scope}_${ts}.${ext}`;
  }

  function quickXls73(){
    try{
      if(typeof XLSX==='undefined'){
        toast('Library Excel belum siap. Refresh halaman lalu coba lagi.',true);
        return;
      }

      const {cols,rows}=rows73();
      if(rows.length<=1){
        toast('Tidak ada data sesuai filter aktif.',true);
        return;
      }

      const ws=XLSX.utils.aoa_to_sheet(rows);

      ws['!cols']=cols.map((c,i)=>{
        let max=String(c.label||'').length;
        for(let r=1;r<rows.length;r++){
          max=Math.max(max,String(rows[r][i]??'').length);
        }
        return {wch:Math.min(max+2,36)};
      });

      const wb=XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb,ws,'Jamaah');

      /* XLS sungguhan (BIFF8), sesuai opsi yang diminta */
      XLSX.writeFile(wb,filename73('xls'),{bookType:'biff8'});
      toast(`✅ XLS diunduh (${rows.length-1} jamaah sesuai filter aktif)`);
    }catch(e){
      console.error('[quickXls73]',e);
      toast('Gagal membuat XLS: '+(e.message||e),true);
    }
  }

  function quickCsv73(){
    try{
      const {rows}=rows73();
      if(rows.length<=1){
        toast('Tidak ada data sesuai filter aktif.',true);
        return;
      }

      const csv=rows.map(row=>row.map(cell=>{
        let s=String(cell??'');
        if(/[",\n]/.test(s)){
          s='"'+s.replace(/"/g,'""')+'"';
        }
        return s;
      }).join(',')).join('\n');

      const blob=new Blob(['\ufeff'+csv],{type:'text/csv;charset=utf-8'});
      const url=URL.createObjectURL(blob);
      const a=document.createElement('a');
      a.href=url;
      a.download=filename73('csv');
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(()=>URL.revokeObjectURL(url),1000);

      toast(`✅ CSV diunduh (${rows.length-1} jamaah sesuai filter aktif)`);
    }catch(e){
      console.error('[quickCsv73]',e);
      toast('Gagal membuat CSV: '+(e.message||e),true);
    }
  }

  function quickPdf73(){
    try{
      const cols=defaultCols73();
      if(!cols.length)throw new Error('Konfigurasi kolom export belum siap.');
      const total=getFilteredJamaah().length;
      if(!total){
        toast('Tidak ada data sesuai filter aktif.',true);
        return;
      }

      /* Pakai generator PDF Jamaah existing agar format tetap konsisten */
      exportJamaahPDF(cols);
    }catch(e){
      console.error('[quickPdf73]',e);
      toast('Gagal membuat PDF: '+(e.message||e),true);
    }
  }

  function menu73(){
    let m=document.getElementById(MENU_ID);
    if(m)return m;

    m=document.createElement('div');
    m.id=MENU_ID;
    m.innerHTML=`
      <button type="button" data-format="xls"><span>📊</span><span>Download XLS</span></button>
      <button type="button" data-format="csv"><span>📄</span><span>Download CSV</span></button>
      <div class="v73-sep"></div>
      <button type="button" data-format="pdf"><span>📕</span><span>Download PDF</span></button>
    `;
    document.body.appendChild(m);

    m.addEventListener('click',e=>{
      const b=e.target.closest('button[data-format]');
      if(!b)return;

      close73();
      const f=b.dataset.format;
      if(f==='xls')quickXls73();
      else if(f==='csv')quickCsv73();
      else if(f==='pdf')quickPdf73();
    });

    return m;
  }

  function place73(btn,m){
    const r=btn.getBoundingClientRect();
    const vw=document.documentElement.clientWidth||window.innerWidth;
    const vh=document.documentElement.clientHeight||window.innerHeight;

    m.style.display='block';
    m.style.visibility='hidden';

    const mw=m.offsetWidth||155;
    const mh=m.offsetHeight||130;

    let left=r.right-mw;
    if(left<8)left=8;
    if(left+mw>vw-8)left=Math.max(8,vw-mw-8);

    let top=r.bottom+6;
    if(top+mh>vh-8){
      top=Math.max(8,r.top-mh-6);
    }

    m.style.left=left+'px';
    m.style.top=top+'px';
    m.style.right='auto';
    m.style.visibility='';
    m.style.display='';
  }

  function open73(btn){
    const m=menu73();
    const open=!m.classList.contains('show');

    close73();
    if(!open)return;

    place73(btn,m);
    m.classList.add('show');
    btn.setAttribute('aria-expanded','true');
  }

  function close73(){
    const m=document.getElementById(MENU_ID);
    if(m)m.classList.remove('show');

    const b=document.querySelector('.quick-download-btn[aria-expanded="true"]');
    if(b)b.setAttribute('aria-expanded','false');
  }

  function setup73(){
    const sb=document.querySelector('#subview-jamaah-data .search-box.modern-search');
    if(!sb)return;

    const add=sb.querySelector('.quick-add-btn');
    let btn=sb.querySelector('.quick-download-btn');

    if(!btn){
      btn=document.createElement('button');
      btn.type='button';
      btn.className='quick-download-btn';
      btn.innerHTML='⬇';
      btn.title='Download data jamaah';
      btn.setAttribute('aria-label','Download data jamaah');
      btn.setAttribute('aria-haspopup','menu');
      btn.setAttribute('aria-expanded','false');

      if(add) add.insertAdjacentElement('afterend',btn);
      else sb.appendChild(btn);

      btn.addEventListener('click',e=>{
        e.preventDefault();
        e.stopPropagation();
        open73(btn);
      });
    }
  }

  document.addEventListener('click',e=>{
    if(!e.target.closest?.('.quick-download-btn') &&
       !e.target.closest?.('#'+MENU_ID)){
      close73();
    }
  });

  window.addEventListener('scroll',close73,true);
  window.addEventListener('resize',close73);

  /* Search toolbar dirender ulang oleh beberapa override lama */
  let timer=0;
  new MutationObserver(()=>{
    clearTimeout(timer);
    timer=setTimeout(setup73,40);
  }).observe(document.documentElement,{childList:true,subtree:true});

  setTimeout(setup73,500);
  setTimeout(setup73,1200);

  window.ubnb73={
    setup:setup73,
    downloadXls:quickXls73,
    downloadCsv:quickCsv73,
    downloadPdf:quickPdf73
  };
})();

/* ============================================================
   SOURCE: ubnb-v74-export-sticky-fix-script
   ============================================================ */
(function(){
  const MENU_ID='v74-jamaah-download-menu';

  /* =======================================================
     STICKY STACK
     Hitung tinggi topbar + menu utama secara aktual.
     ======================================================= */
  function measureSticky74(){
    const top=document.querySelector('#app > .topbar');
    const tabs=document.querySelector('#app > .page-tabs');
    if(!top||!tabs)return;

    const topH=Math.ceil(top.getBoundingClientRect().height||0);
    if(topH>0){
      tabs.style.top=topH+'px';
    }

    const tabH=Math.ceil(tabs.getBoundingClientRect().height||0);
    const stack=Math.max(0,topH+tabH);
    document.documentElement.style.setProperty('--v74-main-stack',stack+'px');
  }

  window.addEventListener('resize',measureSticky74);
  window.addEventListener('orientationchange',()=>setTimeout(measureSticky74,180));
  setTimeout(measureSticky74,100);
  setTimeout(measureSticky74,600);
  setTimeout(measureSticky74,1500);

  /* =======================================================
     QUICK EXPORT
     v73 memakai window.EXPORT_COLUMNS, sedangkan konfigurasi asli
     dideklarasikan dengan const dan tidak menjadi property window.
     v74 memakai definisi kolom sendiri sehingga tidak bergantung
     pada modal Export.
     ======================================================= */
  const QUICK_COLS_74=[
    {key:'no',label:'No',picker:()=>null},
    {key:'nama',label:'Nama',picker:j=>j.nama||''},
    {key:'nama_kk',label:'Nama KK',picker:j=>j.nama_kk||''},
    {key:'jenis_kelamin',label:'L/P',picker:j=>j.jenis_kelamin||''},
    {key:'umur',label:'Umur',picker:j=>{
      const u=umurFromTgl(j.tgl_lahir);
      return u===null?'':u;
    }},
    {key:'kelas_kbm',label:'Kelas KBM',picker:j=>kelasKbmAktual(j)||''},
    {key:'status_nikah',label:'Status Nikah',picker:j=>j.status_nikah||''},
    {key:'status_sambung',label:'Status Sambung',picker:j=>j.status_sambung||''}
  ];

  function list74(){
    try{
      if(typeof getExportJamaahSorted==='function'){
        return getExportJamaahSorted();
      }
    }catch(_){}
    return typeof getFilteredJamaah==='function'
      ? getFilteredJamaah().slice()
      : [];
  }

  function rows74(){
    const list=list74();
    const rows=[QUICK_COLS_74.map(c=>c.label)];
    list.forEach((j,i)=>{
      rows.push(QUICK_COLS_74.map(c=>c.key==='no'?i+1:c.picker(j)));
    });
    return {list,rows};
  }

  function scope74(){
    return String(
      CU?.kelompok_scope ||
      (typeof isViewer==='function'&&isViewer()?'umum':'Desa')
    ).replace(/[^a-z0-9_-]+/gi,'_');
  }

  function filename74(ext){
    const d=new Date();
    const date=[
      d.getFullYear(),
      String(d.getMonth()+1).padStart(2,'0'),
      String(d.getDate()).padStart(2,'0')
    ].join('-');
    return `Jamaah_${scope74()}_${date}.${ext}`;
  }

  function downloadBlob74(blob,name){
    const url=URL.createObjectURL(blob);
    const a=document.createElement('a');
    a.href=url;
    a.download=name;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(()=>URL.revokeObjectURL(url),1200);
  }

  function xls74(){
    try{
      if(typeof XLSX==='undefined'){
        throw new Error('Library Excel belum siap. Refresh halaman lalu coba lagi.');
      }

      const {rows}=rows74();
      if(rows.length<=1)throw new Error('Tidak ada data sesuai filter aktif.');

      const ws=XLSX.utils.aoa_to_sheet(rows);
      ws['!cols']=QUICK_COLS_74.map((c,i)=>{
        let max=String(c.label).length;
        for(let r=1;r<rows.length;r++){
          max=Math.max(max,String(rows[r][i]??'').length);
        }
        return {wch:Math.min(max+2,40)};
      });

      const wb=XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb,ws,'Jamaah');

      /* BIFF8 = XLS, bukan XLSX */
      XLSX.writeFile(wb,filename74('xls'),{bookType:'biff8'});
      toast(`✅ XLS diunduh (${rows.length-1} jamaah sesuai filter/search aktif)`);
    }catch(e){
      console.error('[v74 XLS]',e);
      toast('Gagal membuat XLS: '+(e.message||e),true);
    }
  }

  function csv74(){
    try{
      const {rows}=rows74();
      if(rows.length<=1)throw new Error('Tidak ada data sesuai filter aktif.');

      const csv=rows.map(row=>row.map(cell=>{
        let s=String(cell??'');
        if(/[",\n]/.test(s))s='"'+s.replace(/"/g,'""')+'"';
        return s;
      }).join(',')).join('\n');

      downloadBlob74(
        new Blob(['\ufeff'+csv],{type:'text/csv;charset=utf-8'}),
        filename74('csv')
      );

      toast(`✅ CSV diunduh (${rows.length-1} jamaah sesuai filter/search aktif)`);
    }catch(e){
      console.error('[v74 CSV]',e);
      toast('Gagal membuat CSV: '+(e.message||e),true);
    }
  }

  function pdf74(){
    try{
      const list=list74();
      if(!list.length)throw new Error('Tidak ada data sesuai filter aktif.');

      if(typeof exportJamaahPDF!=='function'){
        throw new Error('Generator PDF belum siap. Refresh halaman lalu coba lagi.');
      }

      /* Generator lama menerima array definisi kolom seperti ini. */
      exportJamaahPDF(QUICK_COLS_74);
    }catch(e){
      console.error('[v74 PDF]',e);
      toast('Gagal membuat PDF: '+(e.message||e),true);
    }
  }

  function closeMenu74(){
    document.getElementById(MENU_ID)?.classList.remove('show');
    document.querySelector('.quick-download-btn[aria-expanded="true"]')
      ?.setAttribute('aria-expanded','false');
  }

  function buildMenu74(){
    let m=document.getElementById(MENU_ID);
    if(m)return m;

    /* Hapus menu rusak versi v73 supaya tidak ada dua dropdown. */
    document.getElementById('v73-jamaah-download-menu')?.remove();

    m=document.createElement('div');
    m.id=MENU_ID;
    m.innerHTML=`
      <button type="button" data-format="xls"><span>📊</span><span>Download XLS</span></button>
      <button type="button" data-format="csv"><span>📄</span><span>Download CSV</span></button>
      <div class="v74-sep"></div>
      <button type="button" data-format="pdf"><span>📕</span><span>Download PDF</span></button>
    `;
    document.body.appendChild(m);

    m.addEventListener('click',e=>{
      const b=e.target.closest('button[data-format]');
      if(!b)return;
      e.preventDefault();
      e.stopPropagation();

      closeMenu74();
      if(b.dataset.format==='xls')xls74();
      else if(b.dataset.format==='csv')csv74();
      else if(b.dataset.format==='pdf')pdf74();
    });

    return m;
  }

  function placeMenu74(btn,m){
    const r=btn.getBoundingClientRect();
    const vw=document.documentElement.clientWidth||window.innerWidth;
    const vh=document.documentElement.clientHeight||window.innerHeight;

    m.style.display='block';
    m.style.visibility='hidden';

    const mw=m.offsetWidth||158;
    const mh=m.offsetHeight||132;

    let left=r.right-mw;
    if(left<8)left=8;
    if(left+mw>vw-8)left=Math.max(8,vw-mw-8);

    let top=r.bottom+6;
    if(top+mh>vh-8)top=Math.max(8,r.top-mh-6);

    m.style.left=left+'px';
    m.style.top=top+'px';
    m.style.right='auto';
    m.style.visibility='';
    m.style.display='';
  }

  function openMenu74(btn){
    const m=buildMenu74();
    const opening=!m.classList.contains('show');
    closeMenu74();
    if(!opening)return;
    placeMenu74(btn,m);
    m.classList.add('show');
    btn.setAttribute('aria-expanded','true');
  }

  function setupDownload74(){
    const sb=document.querySelector('#subview-jamaah-data .search-box.modern-search');
    if(!sb)return;

    let old=sb.querySelector('.quick-download-btn');
    if(!old)return;

    /*
      v73 sudah memasang event listener yang memanggil fungsi error.
      Clone tombol untuk membuang seluruh listener lama.
    */
    if(old.dataset.v74Ready!=='1'){
      const btn=old.cloneNode(true);
      btn.dataset.v74Ready='1';
      btn.setAttribute('aria-haspopup','menu');
      btn.setAttribute('aria-expanded','false');
      btn.title='Download data jamaah';
      old.replaceWith(btn);

      btn.addEventListener('click',e=>{
        e.preventDefault();
        e.stopPropagation();
        openMenu74(btn);
      });
    }
  }

  document.addEventListener('click',e=>{
    if(!e.target.closest?.('.quick-download-btn') &&
       !e.target.closest?.('#'+MENU_ID)){
      closeMenu74();
    }
  });

  window.addEventListener('scroll',e=>{
    /* Jangan tutup saat scroll horizontal list Jamaah. */
    if(e.target?.closest?.('#jamaah-list-wrap'))return;
    closeMenu74();
  },true);

  window.addEventListener('resize',closeMenu74);

  let timer74=0;
  new MutationObserver(()=>{
    clearTimeout(timer74);
    timer74=setTimeout(()=>{
      setupDownload74();
      measureSticky74();
    },45);
  }).observe(document.documentElement,{childList:true,subtree:true});

  setTimeout(setupDownload74,250);
  setTimeout(setupDownload74,900);
  setTimeout(setupDownload74,1800);

  window.ubnb74={
    xls:xls74,
    csv:csv74,
    pdf:pdf74,
    measureSticky:measureSticky74
  };
})();

/* ============================================================
   SOURCE: ubnb-v75-filter-option-layer-fix-script
   ============================================================ */
(function(){
  function panel75(){
    return document.getElementById('v11-filter-panel');
  }

  function sync75(){
    const p=panel75();
    if(!p)return;
    p.classList.toggle('v75-options-open',!!p.querySelector('.v11-multi[open]'));
  }

  /* Native <details> tidak selalu bubble konsisten pada semua versi browser,
     jadi sinkronkan sesudah klik summary dan sesudah DOM filter dirender ulang. */
  document.addEventListener('click',e=>{
    if(e.target.closest?.('#v11-filter-panel .v11-multi summary')){
      setTimeout(sync75,0);
    }
  },true);

  const root=document.getElementById('subview-jamaah-data')||document.documentElement;
  let moTimer=0;
  new MutationObserver(()=>{
    clearTimeout(moTimer);
    moTimer=setTimeout(sync75,20);
  }).observe(root,{
    subtree:true,
    childList:true,
    attributes:true,
    attributeFilter:['open','class']
  });

  /*
    Kalau halaman di-scroll, tutup dropdown opsi filter.
    Ini sengaja supaya panel Filter tetap lewat DI BELAKANG Search/Menu Utama,
    dan tidak ada dropdown menggantung saat posisi row sudah bergeser.
    Scroll di DALAM daftar opsi sendiri tidak ditutup.
  */
  window.addEventListener('scroll',e=>{
    if(e.target?.closest?.('.v11-multi-menu'))return;

    const p=panel75();
    if(!p)return;

    const opens=[...p.querySelectorAll('.v11-multi[open]')];
    if(!opens.length)return;

    opens.forEach(d=>d.removeAttribute('open'));
    sync75();
  },true);

  window.addEventListener('resize',()=>{
    const p=panel75();
    if(!p)return;
    p.querySelectorAll('.v11-multi[open]').forEach(d=>d.removeAttribute('open'));
    sync75();
  });

  setTimeout(sync75,300);

  window.ubnb75FilterLayer={
    sync:sync75
  };
})();

/* ============================================================
   SOURCE: ubnb-v77-event-attendance-ui-script
   ============================================================ */
(function(){
  function txt77(el){
    return String(el?.textContent||'').replace(/\s+/g,' ').trim();
  }

  function closeMenus77(except){
    document.querySelectorAll('.v77-more-menu.show,.v77-hadir-tools-menu.show').forEach(m=>{
      if(m!==except)m.classList.remove('show');
    });
  }

  /* =====================================================
     DETAIL ACARA
     ===================================================== */
  function compactSection77(box,kind){
    const isSlot=kind==='slot';
    const el=[...box.children].find(x=>{
      const t=txt77(x);
      return isSlot?t.startsWith('🎟️ Slot Kuota'):t.startsWith('✉️ Undangan');
    });
    if(!el || el.closest('.v77-compact-section'))return;

    const t=txt77(el);
    let meta='';

    if(isSlot){
      const m=t.match(/(\d+)\s+slot\s+·\s+total kuota\s+(\d+)/i);
      if(m)meta=`${m[1]} slot · kuota ${m[2]}`;
      else if(/Tidak ada slot tambahan/i.test(t))meta='Tidak ada slot tambahan';
    }else{
      if(/Belum dibuat/i.test(t))meta='Belum dibuat';
      else{
        const m=t.match(/(Massal per kelompok|Perorangan)\s+·\s+(\d+)\s+penerima\/link/i);
        if(m)meta=`${m[1]} · ${m[2]} link`;
      }
    }

    const d=document.createElement('details');
    d.className='v77-compact-section';
    const s=document.createElement('summary');
    s.innerHTML=`
      <span class="v77-section-label">${isSlot?'🎟️ Slot Kuota':'✉️ Undangan'}</span>
      <span class="v77-section-meta">${meta||'Lihat detail'}</span>
    `;
    el.parentNode.insertBefore(d,el);
    d.appendChild(s);
    el.classList.add('v77-section-body');
    d.appendChild(el);
  }

  function arrangeDetailActions77(box){
    const actions=box.querySelector('.cal-detail-actions');
    if(!actions)return;

    actions.classList.add('v77-detail-actions');

    /* Bersihkan wrapper buatan v77 bila render wrapper lain memanggil ulang */
    actions.querySelectorAll(':scope > .v77-more-wrap').forEach(x=>x.remove());

    const buttons=[...actions.querySelectorAll(':scope > button')]
      .filter(b=>b.style.display!=='none');

    if(!buttons.length)return;

    let primary=null;
    let caution=null;
    const secondary=[];
    const more=[];

    buttons.forEach(b=>{
      b.classList.remove('v77-primary','v77-secondary','v77-caution');
      const t=txt77(b);

      if(!primary && (
        t.includes('Buka Absen') ||
        t.includes('Report Final')
      )){
        primary=b;
        return;
      }

      if(
        t.includes('Update Peserta') ||
        t.includes('Report / Rekap') ||
        t.includes('Daftar Hadir')
      ){
        secondary.push(b);
        return;
      }

      if(
        t.includes('Tutup Acara') ||
        t.includes('Finalisasi Rekap') ||
        t.includes('Buka Kembali')
      ){
        caution=b;
        return;
      }

      more.push(b);
    });

    if(!primary && secondary.length){
      primary=secondary.shift();
    }

    if(primary)primary.classList.add('v77-primary');
    secondary.slice(0,2).forEach(b=>b.classList.add('v77-secondary'));
    if(caution)caution.classList.add('v77-caution');

    /* Sisanya tetap ada, hanya dipindah ke menu Lainnya */
    if(more.length){
      const wrap=document.createElement('div');
      wrap.className='v77-more-wrap';

      const btn=document.createElement('button');
      btn.type='button';
      btn.className='v77-more-btn';
      btn.textContent='⋯ Lainnya';
      btn.setAttribute('aria-expanded','false');

      const menu=document.createElement('div');
      menu.className='v77-more-menu';

      more.forEach(b=>menu.appendChild(b));
      wrap.appendChild(btn);
      wrap.appendChild(menu);
      actions.appendChild(wrap);

      btn.onclick=e=>{
        e.preventDefault();
        e.stopPropagation();
        const open=!menu.classList.contains('show');
        closeMenus77(menu);
        menu.classList.toggle('show',open);
        btn.setAttribute('aria-expanded',open?'true':'false');
      };
    }
  }

  function decorateCalendarDetail77(){
    const box=document.getElementById('calendar-detail-content');
    if(!box)return;

    arrangeDetailActions77(box);
    compactSection77(box,'slot');
    compactSection77(box,'invite');
  }

  const oldDetail77=window.renderCalendarDetail;
  if(typeof oldDetail77==='function'){
    window.renderCalendarDetail=function(){
      const r=oldDetail77.apply(this,arguments);
      try{decorateCalendarDetail77()}catch(e){console.error('[v77 detail UI]',e)}
      return r;
    };
  }

  /* =====================================================
     DAFTAR HADIR / BUKA ABSEN
     ===================================================== */
  function arrangeHadirHeader77(){
    const modal=document.getElementById('modal-hadir');
    if(!modal)return;

    const head=modal.querySelector('.modal > div:nth-of-type(1)');
    if(!head)return;

    head.classList.add('v77-hadir-head');

    const left=head.children[0];
    const right=head.children[1];
    if(left)left.classList.add('v77-hadir-head-left');
    if(!right)return;

    right.classList.add('v77-hadir-head-right');

    if(right.querySelector('.v77-hadir-tool-btn'))return;

    const buttons=[...right.querySelectorAll(':scope > button')];
    const closeBtn=buttons.find(b=>txt77(b)==='✕' || txt77(b)==='×');
    const tools=buttons.filter(b=>b!==closeBtn);

    if(closeBtn){
      closeBtn.classList.add('v77-hadir-close-btn');
    }

    const toolBtn=document.createElement('button');
    toolBtn.type='button';
    toolBtn.className='v77-hadir-tool-btn';
    toolBtn.textContent='⋮';
    toolBtn.title='Alat & laporan';
    toolBtn.setAttribute('aria-expanded','false');

    const menu=document.createElement('div');
    menu.className='v77-hadir-tools-menu';

    tools.forEach(b=>{
      /* display dari logic lama tetap dipertahankan */
      menu.appendChild(b);
    });

    right.insertBefore(toolBtn,closeBtn||right.firstChild);
    head.appendChild(menu);

    toolBtn.onclick=e=>{
      e.preventDefault();
      e.stopPropagation();
      const open=!menu.classList.contains('show');
      closeMenus77(menu);
      menu.classList.toggle('show',open);
      toolBtn.setAttribute('aria-expanded',open?'true':'false');
    };
  }

  function decorateStats77(){
    const stats=document.getElementById('hadir-stats');
    if(!stats)return;

    stats.classList.add('v77-hadir-stats');

    if(!stats.querySelector('.v77-total-pill')){
      const total=(Array.isArray(window.aHadir)?aHadir:[])
        .filter(h=>Number(h.kegiatan_id)===Number(window.curKegiatanId)).length;

      const pill=document.createElement('span');
      pill.className='stat-pill v77-total-pill';
      pill.innerHTML=`<span class="pl">👥</span><span class="pv">${total}</span><span class="pl">peserta</span>`;
      stats.insertBefore(pill,stats.firstChild);
    }
  }

  function decorateSearch77(){
    const s=document.getElementById('hadir-search');
    if(s?.parentElement)s.parentElement.classList.add('v77-hadir-search-wrap');
  }

  function decorateSlotAttendance77(content){
    [...content.children].forEach(ch=>{
      if(txt77(ch).startsWith('🎟️ Kehadiran Slot / Kuota')){
        ch.classList.add('v77-slot-attendance');
        [...ch.children].slice(1).forEach(row=>row.classList.add('v77-slot-row'));
      }
    });
  }

  function decorateAttendanceTable77(){
    const content=document.getElementById('modal-hadir-content');
    if(!content)return;

    const bulkBtn=content.querySelector('button[onclick*="bulkHadir"]');
    if(bulkBtn?.parentElement)bulkBtn.parentElement.classList.add('v77-hadir-bulk-row');

    decorateSlotAttendance77(content);

    const table=content.querySelector('table.tbl-jamaah');
    if(!table)return;

    table.classList.add('v77-hadir-table');
    table.style.minWidth='0';

    const heads=table.querySelectorAll('thead th');
    if(heads[1])heads[1].textContent='Nama / KK';

    [...table.querySelectorAll('tbody tr')].forEach(tr=>{
      const td=tr.children;
      if(td.length<4)return;

      const name=td[1];
      const kk=td[2];
      const status=td[3];

      if(name && kk && !name.querySelector('.v77-inline-kk')){
        const div=document.createElement('div');
        div.className='v77-inline-kk';
        const kkText=String(kk.textContent||'').trim();
        div.textContent='KK: '+(kkText&&kkText!=='—'?kkText:'-');
        name.appendChild(div);
      }

      status?.classList.add('v77-status-cell');
    });
  }

  function decorateHadir77(){
    arrangeHadirHeader77();
    decorateStats77();
    decorateSearch77();
    decorateAttendanceTable77();
  }

  const oldHadir77=window.renderDaftarHadir;
  if(typeof oldHadir77==='function'){
    window.renderDaftarHadir=function(){
      const r=oldHadir77.apply(this,arguments);
      try{decorateHadir77()}catch(e){console.error('[v77 hadir UI]',e)}
      return r;
    };
  }

  /* bila modal sedang terbuka saat file hot-reload/refresh */
  setTimeout(()=>{
    try{
      decorateCalendarDetail77();
      decorateHadir77();
    }catch(_){}
  },500);

  document.addEventListener('click',e=>{
    if(!e.target.closest?.('.v77-more-wrap') &&
       !e.target.closest?.('.v77-hadir-tool-btn') &&
       !e.target.closest?.('.v77-hadir-tools-menu')){
      closeMenus77();
    }
  });

  window.ubnb77UI={
    detail:decorateCalendarDetail77,
    hadir:decorateHadir77
  };
})();

/* ============================================================
   SOURCE: ubnb-v78-event-attendance-fix-script
   ============================================================ */
(function(){
  const DETAIL_MENU_ID='v78-detail-more-menu';

  function text78(el){
    return String(el?.textContent||'').replace(/\s+/g,' ').trim();
  }

  function closeDetailMenu78(){
    const m=document.getElementById(DETAIL_MENU_ID);
    if(m)m.classList.remove('show');
    document.querySelector('#modal-calendar-detail .v77-more-btn[aria-expanded="true"]')
      ?.setAttribute('aria-expanded','false');
  }

  function placeFixedMenu78(btn,menu){
    const r=btn.getBoundingClientRect();
    const vw=document.documentElement.clientWidth||window.innerWidth;
    const vh=document.documentElement.clientHeight||window.innerHeight;

    menu.style.display='block';
    menu.style.visibility='hidden';

    const mw=menu.offsetWidth||230;
    const mh=menu.offsetHeight||160;

    let left=r.left;
    if(left+mw>vw-8)left=Math.max(8,vw-mw-8);
    if(left<8)left=8;

    let top=r.bottom+6;
    if(top+mh>vh-8){
      top=Math.max(8,r.top-mh-6);
    }

    menu.style.left=left+'px';
    menu.style.top=top+'px';
    menu.style.right='auto';
    menu.style.visibility='';
    menu.style.display='';
  }

  function fixDetailMore78(){
    const modal=document.getElementById('modal-calendar-detail');
    if(!modal)return;

    const wrap=modal.querySelector('.v77-more-wrap');
    const btn=wrap?.querySelector('.v77-more-btn');
    const oldMenu=wrap?.querySelector('.v77-more-menu');
    if(!wrap||!btn||!oldMenu)return;

    let menu=document.getElementById(DETAIL_MENU_ID);
    if(menu)menu.remove();

    menu=oldMenu;
    menu.id=DETAIL_MENU_ID;
    menu.classList.remove('v77-more-menu','show');
    document.body.appendChild(menu);

    btn.setAttribute('aria-expanded','false');
    btn.onclick=function(e){
      e.preventDefault();
      e.stopPropagation();

      const opening=!menu.classList.contains('show');
      closeDetailMenu78();

      if(opening){
        placeFixedMenu78(btn,menu);
        menu.classList.add('show');
        btn.setAttribute('aria-expanded','true');
      }
    };
  }

  /* =====================================================
     Daftar Hadir — header tools
     ===================================================== */
  function fixHadirHeader78(){
    const modal=document.getElementById('modal-hadir');
    const title=document.getElementById('modal-hadir-title');
    if(!modal||!title)return;

    /* Struktur existing:
       header = title.parentElement.parentElement
       right  = header.children[1]
    */
    const left=title.parentElement;
    const header=left?.parentElement;
    const right=header?.children?.[1];
    if(!header||!left||!right)return;

    header.classList.add('v78-hadir-header');
    left.classList.add('v78-hadir-header-left');
    right.classList.add('v78-hadir-header-right');

    const allButtons=[...right.querySelectorAll(':scope > button')];
    const closeBtn=allButtons.find(b=>{
      const t=text78(b);
      return t==='✕'||t==='×';
    });

    if(closeBtn)closeBtn.classList.add('v78-close-btn');

    let toolsBtn=right.querySelector('.v78-tools-btn');
    let toolsMenu=header.querySelector('.v78-tools-menu');

    if(!toolsBtn){
      toolsBtn=document.createElement('button');
      toolsBtn.type='button';
      toolsBtn.className='v78-tools-btn';
      toolsBtn.textContent='⋮ Alat';
      toolsBtn.title='Alat absensi';
      toolsBtn.setAttribute('aria-expanded','false');

      right.insertBefore(toolsBtn,closeBtn||right.firstChild);
    }

    if(!toolsMenu){
      toolsMenu=document.createElement('div');
      toolsMenu.className='v78-tools-menu';
      header.appendChild(toolsMenu);
    }

    /* Ambil seluruh tombol action asli; X dan tombol Alat tetap di header */
    [...right.querySelectorAll(':scope > button')].forEach(b=>{
      if(b===closeBtn||b===toolsBtn)return;
      toolsMenu.appendChild(b);
    });

    toolsBtn.onclick=function(e){
      e.preventDefault();
      e.stopPropagation();
      const opening=!toolsMenu.classList.contains('show');

      document.querySelectorAll('.v78-tools-menu.show').forEach(x=>x.classList.remove('show'));

      toolsMenu.classList.toggle('show',opening);
      toolsBtn.setAttribute('aria-expanded',opening?'true':'false');
    };
  }

  function fixStatsTotal78(){
    const stats=document.getElementById('hadir-stats');
    if(!stats)return;

    const old=stats.querySelector('.v77-total-pill');
    if(old)old.remove();

    let total=0;
    try{
      const arr=(typeof aHadir!=='undefined' && Array.isArray(aHadir))?aHadir:[];
      total=arr.filter(h=>Number(h.kegiatan_id)===Number(curKegiatanId)).length;
    }catch(_){}

    const pill=document.createElement('span');
    pill.className='stat-pill v77-total-pill';
    pill.innerHTML=`<span class="pl">👥</span><span class="pv">${total}</span><span class="pl">peserta</span>`;
    stats.insertBefore(pill,stats.firstChild);
  }

  function fixAttendanceRows78(){
    const content=document.getElementById('modal-hadir-content');
    if(!content)return;

    const table=content.querySelector('table.tbl-jamaah');
    if(!table)return;

    table.classList.add('v77-hadir-table');
    table.style.minWidth='0';

    const heads=table.querySelectorAll('thead th');
    if(heads[1])heads[1].textContent='Nama / KK';

    [...table.querySelectorAll('tbody tr')].forEach(tr=>{
      const td=tr.children;
      if(td.length<4)return;

      const name=td[1];
      const kk=td[2];
      const status=td[3];

      if(name&&kk){
        let inline=name.querySelector('.v77-inline-kk');
        if(!inline){
          inline=document.createElement('div');
          inline.className='v77-inline-kk';
          name.appendChild(inline);
        }
        const kkText=String(kk.textContent||'').trim().replace(/^KK:\s*/i,'');
        inline.textContent='KK: '+(kkText&&kkText!=='—'?kkText:'-');
      }

      status?.classList.add('v77-status-cell');
    });
  }

  function decorateHadir78(){
    fixHadirHeader78();
    fixStatsTotal78();
    fixAttendanceRows78();
  }

  /* renderDaftarHadir v77 sudah membungkus render dasar.
     Bungkus sekali lagi setelah semua override lama selesai. */
  const oldRender78=window.renderDaftarHadir;
  if(typeof oldRender78==='function'){
    window.renderDaftarHadir=function(){
      const r=oldRender78.apply(this,arguments);
      try{decorateHadir78()}catch(e){console.error('[v78 hadir]',e)}
      return r;
    };
  }

  const oldDetail78=window.renderCalendarDetail;
  if(typeof oldDetail78==='function'){
    window.renderCalendarDetail=function(){
      closeDetailMenu78();
      const r=oldDetail78.apply(this,arguments);
      try{setTimeout(fixDetailMore78,0)}catch(e){console.error('[v78 detail]',e)}
      return r;
    };
  }

  document.addEventListener('click',e=>{
    if(!e.target.closest?.('#v78-detail-more-menu') &&
       !e.target.closest?.('#modal-calendar-detail .v77-more-btn')){
      closeDetailMenu78();
    }

    if(!e.target.closest?.('.v78-tools-btn') &&
       !e.target.closest?.('.v78-tools-menu')){
      document.querySelectorAll('.v78-tools-menu.show').forEach(x=>x.classList.remove('show'));
      document.querySelectorAll('.v78-tools-btn[aria-expanded="true"]')
        .forEach(x=>x.setAttribute('aria-expanded','false'));
    }
  });

  window.addEventListener('scroll',e=>{
    if(!e.target?.closest?.('#v78-detail-more-menu'))closeDetailMenu78();
  },true);

  window.addEventListener('resize',closeDetailMenu78);

  setTimeout(()=>{
    try{
      fixDetailMore78();
      decorateHadir78();
    }catch(_){}
  },500);

  window.ubnb78UI={
    detail:fixDetailMore78,
    hadir:decorateHadir78
  };
})();

/* ============================================================
   SOURCE: ubnb-v80-report-layout-note-fix-script
   ============================================================ */
(function(){
  function v80EventId(){
    try{
      if(typeof _finalRecapEventId!=='undefined' && Number(_finalRecapEventId)){
        return Number(_finalRecapEventId);
      }
    }catch(_){}
    try{
      if(typeof _finalRecapData!=='undefined' && Number(_finalRecapData?.rekap?.kegiatan_id)){
        return Number(_finalRecapData.rekap.kegiatan_id);
      }
    }catch(_){}
    return 0;
  }

  function v80RecapData(){
    try{
      if(typeof _finalRecapData!=='undefined')return _finalRecapData;
    }catch(_){}
    return null;
  }

  function v80EventNote(){
    const id=v80EventId();
    let k=null;
    try{
      if(typeof aKegiatan!=='undefined' && Array.isArray(aKegiatan)){
        k=aKegiatan.find(x=>Number(x.id)===Number(id))||null;
      }
    }catch(_){}

    const d=v80RecapData();
    return String(
      k?.catatan ??
      d?.rekap?.catatan ??
      k?.final_rekap?.catatan ??
      ''
    ).trim();
  }

  function v80Esc(v){
    try{
      if(typeof escH==='function')return escH(String(v??''));
    }catch(_){}
    return String(v??'')
      .replace(/&/g,'&amp;').replace(/</g,'&lt;')
      .replace(/>/g,'&gt;').replace(/"/g,'&quot;')
      .replace(/'/g,'&#39;');
  }

  function v80NoteHtml(){
    const note=v80EventNote();
    if(!note)return '';
    return `<div class="fr-event-note"><b>📝 Materi / Catatan</b><br>${v80Esc(note).replace(/\r?\n/g,'<br>')}</div>`;
  }

  function v80InjectNote(){
    const content=document.getElementById('fr-content');
    if(!content)return;

    /* hapus hasil wrapper lama v72 supaya tidak duplikat */
    content.querySelectorAll('.fr-event-note').forEach(x=>x.remove());

    const block=v80NoteHtml();
    if(!block)return;

    const head=content.querySelector('.fr-head');
    if(head)head.insertAdjacentHTML('afterend',block);
    else content.insertAdjacentHTML('afterbegin',block);
  }

  /* Re-wrap renderer yang sekarang, tanpa menyentuh statistik/tabel/report logic. */
  const oldRender80=window.renderFinalRecap;
  if(typeof oldRender80==='function'){
    window.renderFinalRecap=function(){
      const r=oldRender80.apply(this,arguments);
      try{v80InjectNote()}catch(e){console.error('[v80 report note]',e)}
      return r;
    };
  }

  /*
    Print Final Recap versi bersih.
    Helper statistik/tabel existing tetap dipakai.
    Yang berubah:
    - Materi/Catatan ikut cetak.
    - Daftar peserta TIDAK break-before page.
    - Cukup garis pemisah + spacing; browser membagi halaman secara natural.
  */
  window.printFinalRecap=function(){
    let d=null;
    try{d=(typeof _finalRecapData!=='undefined')?_finalRecapData:null}catch(_){}
    if(!d?.rekap)return;

    const r=d.rekap;
    const p=Array.isArray(d.peserta)?d.peserta:[];
    let named=true;
    try{named=(typeof _finalRecapMode==='undefined'||_finalRecapMode==='nama')}catch(_){}

    const statusText=d.final?'Rekap Final - data terkunci':'Preview Rekap - acara belum ditutup';
    const subtitle=[
      typeof finalRecapFmtDate==='function'?finalRecapFmtDate(r.tanggal):r.tanggal,
      r.waktu?String(r.waktu).slice(0,5):'',
      r.waktu_selesai?String(r.waktu_selesai).slice(0,5):'',
      r.lokasi||'',
      r.kelompok||''
    ].filter(Boolean);

    const pref=document.getElementById('fr-orientation')?.value||'auto';
    const orientation=pref==='portrait'||pref==='landscape'
      ?pref
      :(named?'landscape':'portrait');

    const eprint=(v)=>{
      try{
        if(typeof ubnbPrintEsc==='function')return ubnbPrintEsc(v);
      }catch(_){}
      return v80Esc(v);
    };

    const note=v80EventNote();
    const noteHtml=note
      ?`<section class="p-event-note"><b>Materi / Catatan</b><div>${eprint(note).replace(/\r?\n/g,'<br>')}</div></section>`
      :'';

    const summary=(typeof ubnbPrintSummaryCards==='function')?ubnbPrintSummaryCards(r):'';
    const breaks=(typeof ubnbPrintBreak==='function')
      ?`${ubnbPrintBreak('Laki-laki / Perempuan',r.gender)}
        ${ubnbPrintBreak('Status Menikah',r.status_menikah)}
        ${ubnbPrintBreak('Status Sambung',r.status_sambung)}
        ${ubnbPrintBreak('Kelas KBM - Belum Menikah',r.kelas_kbm)}`
      :'';

    const details=named && typeof ubnbPrintDetails==='function'
      ?ubnbPrintDetails(r,p,orientation)
      :'<div class="p-anon-note"><b>Rekap tanpa nama.</b> Dokumen ini hanya menampilkan statistik agregat dan tidak memuat identitas peserta.</div>';

    const cara=r.cara_absen
      ?' · '+Object.entries(r.cara_absen).map(([k,v])=>eprint(k)+' <b>'+Number(v||0)+'</b>').join(' · ')
      :'';

    const body=`<main class="report ${named?'named':'anon'} ${orientation}">
      <header class="p-head">
        <div>
          <h1>${eprint(r.acara||'Rekap Acara')}</h1>
          <p>${eprint(subtitle.join(' · '))}</p>
        </div>
        <div class="p-state">${eprint(statusText)}</div>
      </header>

      ${noteHtml}
      ${summary}

      <div class="p-breaks">${breaks}</div>

      <div class="p-note">
        Absen pertama <b>${eprint(r.hadir_pertama||'-')}</b> ·
        terakhir <b>${eprint(r.hadir_terakhir||'-')}</b>${cara}
      </div>

      ${details}
    </main>`;

    const page='A4 '+orientation;
    const w=window.open('','_blank');
    if(!w){
      if(typeof toast==='function')toast('Popup diblokir browser',true);
      return;
    }

    w.document.write(`<!doctype html>
<html>
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Rekap ${eprint(r.acara||'Acara')}</title>
<style>
*{box-sizing:border-box;-webkit-print-color-adjust:exact!important;print-color-adjust:exact!important}
html,body{margin:0;padding:0;background:#fff;color:#17201c;font-family:Arial,Helvetica,sans-serif;font-size:10pt}
@page{size:${page};margin:9mm}

.report{max-width:none;margin:0 auto}

.p-head{
  display:flex;justify-content:space-between;gap:12mm;align-items:flex-start;
  border:1px solid #b8c8c0;border-left:4px solid #147a59;border-radius:2.5mm;
  padding:4mm 5mm;margin-bottom:3mm
}
.p-head h1{font-size:18pt;line-height:1.05;margin:0 0 1.5mm;color:#0e6449}
.p-head p{font-size:10pt;line-height:1.35;margin:0;color:#374151}
.p-state{font-size:9pt;font-weight:700;color:#475569;text-align:right;white-space:nowrap;padding-top:1mm}

.p-event-note{
  border:1px solid #b7d2c3;border-left:4px solid #147a59;
  background:#f4faf6;border-radius:2mm;padding:3mm 3.5mm;
  margin:0 0 3.5mm;font-size:9.5pt;line-height:1.45;
  break-inside:avoid
}
.p-event-note>b{display:block;color:#0f5f46;font-size:10pt;margin-bottom:1.4mm}

.p-stats{display:grid;grid-template-columns:repeat(5,1fr);gap:2.2mm;margin-bottom:4mm}
.p-stat{
  border:1px solid #c9d3ce;border-radius:2mm;padding:3mm 2mm;
  text-align:center;min-height:17mm;background:#fff;break-inside:avoid
}
.p-stat b{display:block;font-size:18pt;line-height:1;color:#17201c;margin-bottom:1.5mm}
.p-stat span{font-size:8.5pt;font-weight:700;color:#4b5563}
.p-stat.good{background:#f0fdf4}.p-stat.warn{background:#fffbeb}.p-stat.bad{background:#fef2f2}

.p-breaks{display:grid;grid-template-columns:repeat(2,1fr);gap:3mm;margin-bottom:3mm}
.p-break{border:1px solid #c9d3ce;border-radius:2mm;overflow:hidden;break-inside:avoid}
.p-break h4{font-size:10pt;margin:0;padding:2.4mm 3mm;background:#eef6f2;color:#124f3c}
.p-br-head,.p-br-row{
  display:grid;grid-template-columns:minmax(0,1fr) 18mm 18mm;gap:2mm;
  align-items:center;padding:1.7mm 3mm;border-top:1px solid #e4e9e6;font-size:9pt
}
.p-br-head{font-weight:700;background:#fafcfb}
.p-br-head b,.p-br-row b{text-align:right}

.p-note{
  border:1px solid #eadb9a;background:#fffdf1;border-radius:2mm;
  padding:2.5mm 3mm;font-size:9.5pt;line-height:1.4;margin-bottom:4mm;
  break-inside:avoid
}

.p-anon-note{
  margin-top:4mm;border-top:1.5px solid #0e6449;
  padding:4mm 0 0;font-size:11pt;line-height:1.45
}

/* v80: tidak ada forced page break. Hanya separator visual. */
.p-details{
  break-before:auto!important;
  page-break-before:auto!important;
  margin-top:4.5mm;
  padding-top:3.5mm;
  border-top:1.5px solid #0e6449
}
.p-section-title{
  font-size:14pt;font-weight:800;color:#0e6449;margin:0 0 3mm;
  padding-bottom:2mm
}

.p-table{width:100%;border-collapse:collapse;table-layout:fixed;font-size:9pt;line-height:1.25}
.p-table thead{display:table-header-group}
.p-table th{
  background:#146b50;color:#fff;border:1px solid #0d553f;
  padding:2.3mm 1.6mm;text-align:left;font-size:8.5pt;vertical-align:middle
}
.p-table td{
  border:1px solid #cfd8d3;padding:2.2mm 1.6mm;vertical-align:top;
  overflow-wrap:break-word;word-break:normal
}
.p-table tr{break-inside:avoid;page-break-inside:avoid}
.p-table td.c{text-align:center;vertical-align:middle}
.p-table td strong{font-size:9.3pt}
.p-table td small{display:block;margin-top:.8mm;color:#5f6b65;font-size:7.8pt;line-height:1.25}
.p-group td{
  background:#eaf4ef!important;color:#0f5f46!important;font-weight:800!important;
  font-size:10pt!important;padding:2.2mm 2mm!important;border-top:1.5px solid #70a590!important
}
.p-group td small{display:inline;margin-left:2mm;font-size:8pt;font-weight:600;color:#587369}
.p-status{font-weight:800;text-align:center;vertical-align:middle!important}
.p-status.hadir{background:#ecfdf5}.p-status.izin{background:#eff6ff}
.p-status.sakit{background:#faf5ff}.p-status.tidak{background:#fff1f2}

.anon .p-head h1{font-size:20pt}
.anon .p-stats{grid-template-columns:repeat(2,1fr);gap:3mm}
.anon .p-stat{min-height:23mm;padding:4mm}
.anon .p-stat b{font-size:23pt}.anon .p-stat span{font-size:10pt}
.anon .p-breaks{grid-template-columns:1fr;gap:3mm}
.anon .p-break h4{font-size:12pt}
.anon .p-br-head,.anon .p-br-row{font-size:10.5pt;padding:2.4mm 3.5mm}
.anon .p-note{font-size:10.5pt}

.named.portrait .p-head{gap:5mm;padding:3.5mm 4mm}
.named.portrait .p-head h1{font-size:16pt}
.named.portrait .p-head p{font-size:9pt}
.named.portrait .p-state{font-size:8pt}
.named.portrait .p-stats{grid-template-columns:repeat(2,1fr);gap:2mm}
.named.portrait .p-stat{min-height:15mm;padding:2.6mm 2mm}
.named.portrait .p-stat b{font-size:16pt}
.named.portrait .p-stat span{font-size:8.5pt}
.named.portrait .p-breaks{grid-template-columns:1fr;gap:2.2mm}
.named.portrait .p-break h4{font-size:9.5pt}
.named.portrait .p-br-head,.named.portrait .p-br-row{font-size:8.8pt;padding:1.8mm 2.5mm}
.named.portrait .p-note{font-size:9pt}
.portrait-table{font-size:8.7pt}
.portrait-table th{font-size:8pt;padding:2.1mm 1.2mm}
.portrait-table td{padding:2.1mm 1.25mm}
.portrait-table td strong{font-size:9.1pt}
.portrait-table td small{font-size:7.7pt}
</style>
</head>
<body>
${body}
<script>window.onload=()=>setTimeout(()=>window.print(),250)<\/script>
</body>
</html>`);
    w.document.close();
  };

  /* expose diagnostics */
  window.ubnb80ReportFix={
    note:v80EventNote,
    inject:v80InjectNote
  };

  setTimeout(()=>{
    try{
      if(document.getElementById('modal-final-rekap')?.style.display!=='none'){
        v80InjectNote();
      }
    }catch(_){}
  },500);
})();

/* ============================================================
   SOURCE: ubnb-v81-report-parent-generus-language
   ============================================================ */
(function(){
  /* =========================================================
     v81 — Bahasa khusus REPORT/EXPORT saja.
     Database/status asli TIDAK diubah:
       Menikah + Single Parent -> Orang Tua
       Belum Menikah           -> Generus
     ========================================================= */

  function reportCategory81(v){
    const s=String(v||'').trim();
    if(s==='Menikah' || s==='Single Parent' || s==='Janda / Duda') return 'Orang Tua';
    if(s==='Belum Menikah') return 'Generus';
    return s || 'Tidak Diketahui';
  }

  function mergedCategory81(obj){
    const out={};
    Object.entries(obj||{}).forEach(([k,v])=>{
      const nk=reportCategory81(k);
      if(!out[nk]) out[nk]={hadir:0,total:0};
      out[nk].hadir += Number(v?.hadir||0);
      out[nk].total += Number(v?.total||0);
    });
    return out;
  }

  function reportData81(d){
    if(!d?.rekap)return d;
    return {
      ...d,
      rekap:{
        ...d.rekap,
        status_menikah:mergedCategory81(d.rekap.status_menikah)
      },
      peserta:Array.isArray(d.peserta)
        ? d.peserta.map(x=>({...x,status_menikah:reportCategory81(x.status_menikah)}))
        : d.peserta
    };
  }

  function postProcessPreview81(){
    const root=document.getElementById('fr-content');
    if(!root)return;

    root.querySelectorAll('.fr-break h4').forEach(h=>{
      const t=String(h.textContent||'').trim();
      if(t==='Status Menikah') h.textContent='Kategori Peserta';
      if(t==='Kelas KBM — Belum Menikah' || t==='Kelas KBM - Belum Menikah'){
        h.textContent='Kelas KBM — Generus';
      }
    });

    root.querySelectorAll('.fr-table th').forEach(th=>{
      const t=String(th.textContent||'').trim();
      if(t==='Menikah' || t==='Status Menikah') th.textContent='Kategori';
    });
  }

  /* Preview report di dashboard:
     gunakan clone transform hanya selama render, lalu kembalikan data asli. */
  const oldRender81=window.renderFinalRecap;
  if(typeof oldRender81==='function'){
    window.renderFinalRecap=function(){
      let original=null;
      let replaced=false;
      try{
        if(typeof _finalRecapData!=='undefined' && _finalRecapData?.rekap){
          original=_finalRecapData;
          _finalRecapData=reportData81(original);
          replaced=true;
        }
        const r=oldRender81.apply(this,arguments);
        postProcessPreview81();
        return r;
      }finally{
        if(replaced)_finalRecapData=original;
      }
    };
  }

  /* Cetak/PDF: ubah judul breakdown + merge angkanya. */
  const oldPrintBreak81=window.ubnbPrintBreak;
  if(typeof oldPrintBreak81==='function'){
    window.ubnbPrintBreak=function(title,obj){
      let t=String(title||'');
      let o=obj;

      if(t==='Status Menikah'){
        t='Kategori Peserta';
        o=mergedCategory81(obj);
      }else if(t==='Kelas KBM - Belum Menikah' || t==='Kelas KBM — Belum Menikah'){
        t='Kelas KBM - Generus';
      }

      return oldPrintBreak81(t,o);
    };
  }

  /* Cetak/PDF daftar peserta:
     nilai kolom status dibuat Orang Tua / Generus, tanpa mengubah sumber data. */
  const oldPrintDetails81=window.ubnbPrintDetails;
  if(typeof oldPrintDetails81==='function'){
    window.ubnbPrintDetails=function(r,p,orientation){
      const rows=Array.isArray(p)
        ? p.map(x=>({...x,status_menikah:reportCategory81(x.status_menikah)}))
        : p;

      let out=oldPrintDetails81(r,rows,orientation);
      out=String(out||'')
        .replace(/Status Menikah/g,'Kategori')
        .replace(/Kelas KBM - Belum Menikah/g,'Kelas KBM - Generus')
        .replace(/Kelas KBM — Belum Menikah/g,'Kelas KBM — Generus');
      return out;
    };
  }

  /* Salin Ringkasan: sama, hanya bahasa laporan. */
  const oldSummary81=window.finalRecapSummaryText;
  if(typeof oldSummary81==='function'){
    window.finalRecapSummaryText=function(){
      let original=null;
      let replaced=false;
      try{
        if(typeof _finalRecapData!=='undefined' && _finalRecapData?.rekap){
          original=_finalRecapData;
          _finalRecapData=reportData81(original);
          replaced=true;
        }
        return String(oldSummary81.apply(this,arguments)||'')
          .replace(/Status Menikah:/g,'Kategori Peserta:')
          .replace(/Kelas KBM:/g,'Kelas KBM Generus:');
      }finally{
        if(replaced)_finalRecapData=original;
      }
    };
  }

  window.ubnb81ReportLanguage={
    category:reportCategory81,
    merge:mergedCategory81
  };
})();

/* ============================================================
   SOURCE: ubnb-v82-report-jamaah-only-stats
   ============================================================ */
(function(){
  window.ubnb82ReportStats = {
    kkSummaryHidden: true,
    note: 'Report/export only: statistik KK disembunyikan; statistik jamaah tetap.'
  };
})();

/* ============================================================
   SOURCE: ubnb-v83-isrun-code-admin-script
   ============================================================ */
(function(){
  let isrunAdminRows83=[];

  async function ensureIsrunToken83(){
    if(DK_ATT_TOKEN)return DK_ATT_TOKEN;
    await dkAttendanceAuthenticate();
    return DK_ATT_TOKEN;
  }

  function setIsrunLockError83(msg){
    const e=document.getElementById('isrun-lock-err');
    if(!e)return;
    e.textContent=msg||'';
    e.style.display=msg?'block':'none';
  }

  async function loadIsrunAdmin83(silent=true){
    const b1=document.getElementById('isrun-admin-code-btn');
    const b2=document.getElementById('isrun-admin-code-btn-open');
    try{
      const token=await ensureIsrunToken83();
      const {data,error}=await sb.rpc('dashboard_isrun_code_admin_status',{p_token:token});
      if(error)throw error;

      const can=!!data?.can_admin;
      if(b1)b1.style.display=can?'block':'none';
      if(b2)b2.style.display=can?'block':'none';

      isrunAdminRows83=Array.isArray(data?.rows)?data.rows:[];
      return can;
    }catch(e){
      if(b1)b1.style.display='none';
      if(b2)b2.style.display='none';
      if(!silent)toast('Gagal cek akses admin kode: '+(e.message||e),true);
      return false;
    }
  }

  function fmtAdminDate83(v){
    if(!v)return '-';
    try{
      return new Intl.DateTimeFormat('id-ID',{
        day:'2-digit',month:'short',year:'numeric',
        hour:'2-digit',minute:'2-digit',
        timeZone:'Asia/Jakarta'
      }).format(new Date(v))+' WIB';
    }catch(_){return String(v)}
  }

  function updateAdminScopeInfo83(){
    const scope=document.getElementById('isrun-admin-scope')?.value||'DESA';
    const row=isrunAdminRows83.find(x=>x.scope_key===scope);
    const el=document.getElementById('isrun-admin-last');
    if(el){
      el.textContent=row?.updated_at
        ?`Terakhir diubah: ${fmtAdminDate83(row.updated_at)}`
        :'Belum ada riwayat perubahan.';
    }
  }

  window.openIsrunCodeAdmin=async function(){
    const ok=await loadIsrunAdmin83(false);
    if(!ok){
      toast('Akses Admin kode IR/ISRUN tidak tersedia untuk akun ini.',true);
      return;
    }

    const scopeEl=document.getElementById('isrun-admin-scope');
    if(scopeEl){
      scopeEl.value=CU?.kelompok_scope||'DESA';
      scopeEl.onchange=updateAdminScopeInfo83;
    }

    document.getElementById('isrun-admin-code1').value='';
    document.getElementById('isrun-admin-code2').value='';

    const st=document.getElementById('isrun-admin-status');
    if(st){
      st.className='msg info';
      st.textContent='Pilih scope, lalu buat kode akses baru.';
    }

    updateAdminScopeInfo83();
    openMod('modal-isrun-code-admin');
    setTimeout(()=>document.getElementById('isrun-admin-code1')?.focus(),80);
  };

  window.saveIsrunAdminCode=async function(){
    const scope=document.getElementById('isrun-admin-scope')?.value||'';
    const c1=(document.getElementById('isrun-admin-code1')?.value||'').trim();
    const c2=(document.getElementById('isrun-admin-code2')?.value||'').trim();
    const st=document.getElementById('isrun-admin-status');
    const btn=document.getElementById('btn-isrun-admin-save');

    const fail=(m)=>{
      if(st){
        st.className='msg err';
        st.textContent=m;
      }
    };

    if(c1.length<4){fail('Kode minimal 4 karakter.');return}
    if(/\s/.test(c1)){fail('Kode tidak boleh mengandung spasi.');return}
    if(c1!==c2){fail('Pengulangan kode tidak sama.');return}

    const old=btn?.textContent;
    if(btn){btn.disabled=true;btn.textContent='⏳ Menyimpan...';}

    try{
      const token=await ensureIsrunToken83();
      const {data,error}=await sb.rpc('dashboard_isrun_code_admin_set',{
        p_token:token,
        p_scope_key:scope,
        p_new_code:c1
      });
      if(error)throw error;
      if(!data?.ok)throw new Error(data?.error||'Gagal menyimpan kode');

      sessionStorage.removeItem(ISRUN_KODE_KEY);

      if(st){
        st.className='msg ok';
        st.textContent=`✅ Kode ${scope} berhasil diganti.`;
      }

      document.getElementById('isrun-admin-code1').value='';
      document.getElementById('isrun-admin-code2').value='';
      await loadIsrunAdmin83(true);
      updateAdminScopeInfo83();

      try{
        await dkLog('ISRUN_GANTI_KODE',{scope});
      }catch(_){}

      toast(`✅ Kode akses ${scope} berhasil diganti`);
    }catch(e){
      fail(e.message||'Gagal menyimpan kode');
    }finally{
      if(btn){btn.disabled=false;btn.textContent=old||'💾 Simpan Kode Baru';}
    }
  };

  /* Replace hardcoded client-side password check with server-side verification. */
  window.unlockIsrun=async function(){
    const inp=document.getElementById('isrun-kode');
    const kode=(inp?.value||'').trim();
    if(!kode){
      setIsrunLockError83('Masukkan kode dulu');
      return;
    }

    setIsrunLockError83('');

    try{
      const token=await ensureIsrunToken83();
      const {data,error}=await sb.rpc('dashboard_isrun_code_verify',{
        p_token:token,
        p_code:kode
      });
      if(error)throw error;
      if(!data?.ok)throw new Error(data?.error||'Kode salah');

      sessionStorage.setItem(ISRUN_KODE_KEY,'1');
      document.getElementById('isrun-lock').style.display='none';
      document.getElementById('isrun-content').style.display='block';
      if(inp)inp.value='';

      toast('🔓 Akses IR/ISRUN dibuka');
      renderIsrunAll();
      loadIsrunAdmin83(true);
    }catch(e){
      setIsrunLockError83(e.message||'Kode salah atau akses ditolak');
      if(inp)inp.value='';
      setTimeout(()=>inp?.focus(),50);
    }
  };

  /* Keep the existing session-unlock behavior, while refreshing Admin visibility. */
  const oldCheck83=window.checkIsrunUnlock;
  window.checkIsrunUnlock=function(){
    const r=typeof oldCheck83==='function'?oldCheck83.apply(this,arguments):undefined;
    loadIsrunAdmin83(true);
    return r;
  };

  /* On initial logged-in dashboard load. */
  setTimeout(()=>loadIsrunAdmin83(true),800);

  window.ubnb83IsrunCodeAdmin={
    refresh:loadIsrunAdmin83,
    scopeInfo:updateAdminScopeInfo83
  };
})();

/* ============================================================
   SOURCE: ubnb-v84-wib-marker
   ============================================================ */
window.ubnb84WIB={
  timezone:'Asia/Jakarta',
  offset:'+07:00',
  note:'Semua timestamp log baru dari dashboard/PPG memakai offset WIB. Timestamp lama ditampilkan dalam WIB.'
};

/* ============================================================
   SOURCE: ubnb-v85-master-login-code-script
   ============================================================ */
(function(){
  const MASTER_DID_85='4075';
  const MASTER_CODE_HASH_85='6f3cd49bf6e3ffb677d7bb0da2a4c2dc388c23baef3f5a2bb9d160fcc10142c6';
  const MASTER_SESSION_KEY_85='ubnb_master_verified_v85';
  const MASTER_FAIL_KEY_85='ubnb_master_fail_v85';
  const REMEMBER_KEY_85='ubnb_dashboard_last_login_v70';

  function isMasterPick85(){
    try{return String(loginPengurusPick?.did||'')===MASTER_DID_85}catch(_){return false}
  }

  async function sha256Hex85(value){
    const enc=new TextEncoder().encode(String(value||''));
    const dig=await crypto.subtle.digest('SHA-256',enc);
    return [...new Uint8Array(dig)].map(b=>b.toString(16).padStart(2,'0')).join('');
  }

  function setMasterCodeVisible85(show){
    const wrap=document.getElementById('login-master-code-wrap');
    const inp=document.getElementById('login-master-code');
    const btn=document.getElementById('btn-login-pengurus');

    if(wrap)wrap.style.display=show?'block':'none';
    if(!show && inp)inp.value='';

    if(btn && show)btn.textContent='Masuk Admin Master →';

    if(show){
      setTimeout(()=>inp?.focus(),60);
    }
  }

  function failState85(){
    try{return JSON.parse(sessionStorage.getItem(MASTER_FAIL_KEY_85)||'null')||{n:0,until:0}}
    catch(_){return {n:0,until:0}}
  }

  function saveFailState85(x){
    try{sessionStorage.setItem(MASTER_FAIL_KEY_85,JSON.stringify(x))}catch(_){}
  }

  function registerFail85(){
    const now=Date.now();
    let x=failState85();
    if(x.until && now>x.until)x={n:0,until:0};
    x.n=Number(x.n||0)+1;
    if(x.n>=8)x.until=now+5*60*1000;
    saveFailState85(x);
    return x;
  }

  function clearFail85(){
    try{sessionStorage.removeItem(MASTER_FAIL_KEY_85)}catch(_){}
  }

  async function verifyMasterCode85(){
    const inp=document.getElementById('login-master-code');
    const code=(inp?.value||'').trim();

    if(!code){
      setLE('Masukkan kode Admin Master');
      inp?.focus();
      return false;
    }

    const state=failState85();
    if(state.until && Date.now()<state.until){
      const sec=Math.ceil((state.until-Date.now())/1000);
      setLE(`Terlalu banyak percobaan. Coba lagi sekitar ${Math.ceil(sec/60)} menit.`);
      return false;
    }

    const hash=await sha256Hex85(code);
    if(hash!==MASTER_CODE_HASH_85){
      const x=registerFail85();
      if(inp)inp.value='';
      setLE(x.until
        ?'Kode salah. Login Admin Master dikunci sementara 5 menit.'
        :'Kode Admin Master salah');
      inp?.focus();
      return false;
    }

    clearFail85();
    try{
      sessionStorage.setItem(MASTER_SESSION_KEY_85,JSON.stringify({
        did:MASTER_DID_85,
        verified_at:ubnbWibIso84()
      }));
    }catch(_){}
    if(inp)inp.value='';
    return true;
  }

  function masterVerified85(){
    try{
      const x=JSON.parse(sessionStorage.getItem(MASTER_SESSION_KEY_85)||'null');
      return String(x?.did||'')===MASTER_DID_85;
    }catch(_){return false}
  }

  /*
    v70 remember-login tidak boleh membuat Admin Master masuk hanya dari nama.
    Untuk tab/sesi browser baru, remembered DID master dibatalkan sebelum DOMContentLoaded.
    Refresh pada tab yang sudah terverifikasi tetap boleh lanjut tanpa mengetik ulang.
  */
  try{
    const rem=JSON.parse(localStorage.getItem(REMEMBER_KEY_85)||'null');
    const editor=JSON.parse(sessionStorage.getItem('dashboard_kelompok_editor_session')||'null');

    if(String(rem?.did||'')===MASTER_DID_85 && !masterVerified85()){
      sessionStorage.removeItem('dashboard_kelompok_editor_session');
      sessionStorage.removeItem('dashboard_kelompok_attendance_token');
    }
    if(String(editor?.did||'')===MASTER_DID_85 && !masterVerified85()){
      sessionStorage.removeItem('dashboard_kelompok_editor_session');
      sessionStorage.removeItem('dashboard_kelompok_attendance_token');
    }
  }catch(_){}

  const oldPick85=window.pickPengurusLogin;
  if(typeof oldPick85==='function'){
    window.pickPengurusLogin=function(){
      const r=oldPick85.apply(this,arguments);
      const master=isMasterPick85();
      setMasterCodeVisible85(master);

      const acc=document.getElementById('login-pengurus-access');
      if(master && acc){
        acc.innerHTML += '<br><span style="color:#9a6700;">🔐 Admin Master wajib memasukkan kode akses.</span>';
      }

      const btn=document.getElementById('btn-login-pengurus');
      if(btn && !master)btn.textContent='Masuk →';
      return r;
    };
  }

  const oldSearch85=window.renderPengurusLoginSearch;
  if(typeof oldSearch85==='function'){
    window.renderPengurusLoginSearch=function(){
      setMasterCodeVisible85(false);
      return oldSearch85.apply(this,arguments);
    };
  }

  const oldLogin85=window.doLoginPengurus;
  if(typeof oldLogin85==='function'){
    window.doLoginPengurus=async function(){
      if(isMasterPick85()){
        const ok=await verifyMasterCode85();
        if(!ok)return;
      }
      return await oldLogin85.apply(this,arguments);
    };
  }

  const oldKeluar85=window.keluar;
  if(typeof oldKeluar85==='function'){
    window.keluar=async function(){
      try{
        sessionStorage.removeItem(MASTER_SESSION_KEY_85);
        sessionStorage.removeItem(MASTER_FAIL_KEY_85);
      }catch(_){}
      return await oldKeluar85.apply(this,arguments);
    };
  }

  window.addEventListener('DOMContentLoaded',()=>{
    const codeInp=document.getElementById('login-master-code');
    codeInp?.addEventListener('keydown',e=>{
      if(e.key==='Enter'){
        e.preventDefault();
        doLoginPengurus();
      }
    });

    /*
      Jika yang tersimpan adalah master tapi sesi ini belum terverifikasi,
      pastikan halaman login tetap tampil.
    */
    setTimeout(()=>{
      if(!masterVerified85()){
        try{
          const rem=JSON.parse(localStorage.getItem(REMEMBER_KEY_85)||'null');
          if(String(rem?.did||'')===MASTER_DID_85 && !CU){
            document.getElementById('login-wrap').style.display='';
            document.getElementById('app').style.display='none';
          }
        }catch(_){}
      }
    },150);
  });

  window.ubnb85MasterLogin={
    did:MASTER_DID_85,
    verified:masterVerified85
  };
})();
