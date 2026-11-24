/* Laporan Penerobosan Umum Pusat. Tidak mengubah data sensus bulanan lama. */
(()=>{
'use strict';
const GROUPS=['PW1','PW2','PW3','PW4'];
const names={DESA:'Desa Perwira',PW1:'Perwirasari',PW2:'Alinda',PW3:'Bulak Perwira',PW4:'Vila Indah Permai'};
const common=[
 ['sub','Jumlah sub','number'],['pengurus4s','Pengurus 4 S','number'],['pengurus_lain','Pengurus lain','number'],
 ['persenan','Persenan bulan ini (Rp)','number'],['janda_siap','Janda siap diwayuh','number'],['janda_btn','Janda BTN','number'],['janda_trangan','Janda trangan','number']
];
const facilities=[['masjid','Masjid','number'],['jeding_l','Jeding putra','number'],['jeding_p','Jeding putri','number'],['aula','Aula','number'],['madrasah','Madrasah','number'],['pondok','Pondok','number'],['sekolah','Sekolah','number'],['mt','MT','number'],['ms','MS','number']];
const groupExtras=[['kamar_mt','Kamar MT','number'],['kamar_tamu','Kamar tamu','number'],['kegiatan_klp','Pengajian kelompok / minggu','text'],['kegiatan_mudadi','Muda-mudi / minggu','text'],['kegiatan_cbr','CBR / minggu','text'],['kegiatan_ibu','Ibu-ibu / minggu','text'],['kegiatan_5unsur','5 unsur','text'],['kegiatan_mus','Musyawarah','text'],['kegiatan_lain','Kegiatan lain','text']];
const desaExtras=[['wakil_desa','Jumlah wakil desa','number'],['kegiatan_desa','Pengajian desa / bulan','text'],['kegiatan_mudadi','Muda-mudi / bulan','text'],['kegiatan_ibu','Ibu-ibu / bulan','text'],['kegiatan_agnia','Aghniya / bulan','text'],['kegiatan_mus','Musyawarah / bulan','text'],['kegiatan_organisasi','Organisasi / bulan','text']];
const officers=[['imam','Imam/Kyai'],['wakil','Wakil'],['penerobos','Penerobos'],['muballigh','Muballigh'],['ku','KU'],['aghnia','Aghniya'],['lain','Kepengurusan lain']];
let profiles={},history=[],current=null,archiveView=null,busy=false;
const el=id=>document.getElementById(id);
const safe=x=>String(x??'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;');
const number=x=>{const v=Number(x);return x!==''&&x!==null&&x!==undefined&&Number.isFinite(v)?Math.max(0,Math.floor(v)):null};
const shown=x=>x===null||x===undefined||x===''?'—':safe(x);
const sum=(rows,key)=>rows.reduce((n,r)=>n+(Number(r[key])||0),0);
const fmt=x=>x===null?'—':Number(x).toLocaleString('id-ID');
const scope=()=>CU?.kelompok_scope||el('pu-scope')?.value||'DESA';
const active=()=>Array.isArray(aJamaahDesa)?aJamaahDesa.filter(j=>j.status_sambung==='Tetap'):[];
const groupMembers=g=>active().filter(j=>j.kelompok_nama===g);
function alertMsg(s){el('pu-message').textContent=s||'';}
function fields(items,values){return items.map(([key,label,type])=>`<label>${safe(label)}<input data-pu="${key}" type="${type}" ${type==='number'?'min="0" step="1"':''} value="${safe(values[key]??'')}"></label>`).join('');}
function roster(g,code){
  const lv=g==='DESA'?'desa':'kelompok';
  const patterns={imam:/^ki (desa|kelompok)$/i,wakil:/^wakil ki/i,penerobos:/^penerobos/i,muballigh:/^muballigh/i,ku:/^ku (desa|kelompok)$/i,aghnia:/^aghnia/i};
  return (aPengurus||[]).filter(p=>p.aktif!==false&&p.level===lv&&(g==='DESA'||p.kelompok_nama===g)&&patterns[code]?.test(p.dapukan||''))
    .map(p=>p.jamaah_desa?.nama||aJamaahDesa.find(j=>j.did===p.did)?.nama||'').filter(Boolean);
}
function officersFor(g,p){
  const o={};for(const [k] of officers){const value=String(p['nama_'+k]||'').trim();o[k]=value?value.split(/\n|;/).map(x=>x.trim()).filter(Boolean):roster(g,k);}
  return o;
}
function groupData(g,date){
  const p=profiles[g]||{},members=groupMembers(g),r={scope:g,nama:names[g],profile:p};
  for(const key of ['balita','cbr','pra','remaja','usia','dewasa','total']){r[key]={L:0,P:0};}
  let missing=0;
  for(const j of members){
    const gender=normGender(j.jenis_kelamin),age=hitungUmur(j.tgl_lahir,date),status=String(j.status_nikah||'').trim().toLowerCase();
    if(gender)r.total[gender]++;
    if(!gender||age===null||(!status&&age>=16)){missing++;continue;}
    let bucket;
    if(status==='menikah'||status==='janda / duda')bucket='dewasa';
    else if(age<5)bucket='balita';
    else if(age<=12)bucket='cbr';
    else if(age<=15)bucket='pra';
    else if(age<=20)bucket='remaja';
    else bucket='usia';
    r[bucket][gender]++;
  }
  r.members=members.length;r.missing=missing;
  r.kk=new Set(members.map(j=>j.keluarga_id||j.nama_kk).filter(Boolean)).size;
  r.janda=members.filter(j=>normGender(j.jenis_kelamin)==='P'&&String(j.status_nikah||'').trim()==='Janda / Duda').length;
  r.pengurus=new Set((aPengurus||[]).filter(x=>x.aktif!==false&&x.level==='kelompok'&&x.kelompok_nama===g).map(x=>x.did).filter(Boolean)).size;
  r.officers=officersFor(g,p);
  return r;
}
function statusFor(rows){const missing=rows.reduce((n,r)=>n+r.missing,0);let notes=[];
  if(missing)notes.push(`${missing} jamaah belum memiliki tanggal lahir, jenis kelamin, atau status nikah lengkap; belum masuk kolom klasifikasi`);
  for(const r of rows){if(r.members!==r.total.L+r.total.P)notes.push(`${r.scope}: ${r.members-r.total.L-r.total.P} jenis kelamin kosong`);}
  for(const r of rows){const p=r.profile,required=['sub','pengurus4s','pengurus_lain','persenan','janda_siap','janda_btn','janda_trangan'];const incomplete=required.filter(k=>p[k]===undefined||p[k]==='');if(incomplete.length)notes.push(`${r.scope}: ${incomplete.length} rincian profil belum diisi`);
    if(p.pengurus4s!==undefined&&p.pengurus_lain!==undefined&&p.pengurus4s!==''&&p.pengurus_lain!==''&&Number(p.pengurus4s)+Number(p.pengurus_lain)!==r.pengurus)notes.push(`${r.scope}: 4 S + lain berbeda dari jumlah pengurus aktif`);
  }
  return notes;
}
function compute(){
  const s=scope(),period=el('pu-month').value,date=new Date(`${period}-01T12:00:00`);
  if(!period||isNaN(date.getTime()))throw new Error('Pilih bulan yang valid');
  date.setMonth(date.getMonth()+1);date.setDate(0);
  const rows=(s==='DESA'?GROUPS:[s]).map(g=>groupData(g,date));
  const notes=statusFor(rows);if(s==='DESA'&&!profiles.DESA)notes.push('Profil desa belum diisi');
  return {scope:s,period,rows,profiles:JSON.parse(JSON.stringify(profiles)),created:new Date().toISOString(),notes};
}
function n2(b){const l=number(b?.L)||0,p=number(b?.P)||0;return `<td>${l}</td><td>${p}</td><td>${l+p}</td>`;}
function categoryHead(){return ['Balita','CBR / PAUD - SD','Pra Remaja','Remaja','Usia Nikah','Dewasa','Total Jamaah'].map(c=>`<th colspan="3">${c}</th>`).join('');}
function categorySub(){return Array(7).fill('<th>L</th><th>P</th><th>J</th>').join('');}
function totals(rows){const t={};for(const k of ['balita','cbr','pra','remaja','usia','dewasa','total'])t[k]={L:0,P:0};
  for(const k of ['balita','cbr','pra','remaja','usia','dewasa','total']){t[k].L=rows.reduce((n,r)=>n+r[k].L,0);t[k].P=rows.reduce((n,r)=>n+r[k].P,0);}return t;
}
function numericCell(p,k){return p[k]===undefined||p[k]===''?'—':fmt(number(p[k]));}
function listCell(x){return Array.isArray(x)&&x.length?x.map(safe).join('<br>'):'—';}
function titleMonth(period){const [y,m]=period.split('-').map(Number);return `${NAMA_BULAN[m-1]} ${y}`;}
function render(snapshot){
  const {scope:s,period,rows,profiles:ps}=snapshot,desa=s==='DESA',dp=ps.DESA||{};
  const t=totals(rows),group=rows[0],p=group.profile||{};
  const statRow=r=>`<tr><td>${safe(r.scope)}</td><td class="pu-left">${safe(r.nama)}</td>${['balita','cbr','pra','remaja','usia','dewasa','total'].map(k=>n2(r[k])).join('')}<td>${number(r.janda)||0}</td><td>${numericCell(r.profile,'janda_siap')}</td><td>${numericCell(r.profile,'janda_btn')}</td><td>${numericCell(r.profile,'janda_trangan')}</td><td>${numericCell(r.profile,'sub')}</td><td>${number(r.kk)||0}</td><td>${numericCell(r.profile,'pengurus4s')}</td><td>${numericCell(r.profile,'pengurus_lain')}</td><td>${number(r.pengurus)||0}</td><td>${numericCell(r.profile,'persenan')}</td></tr>`;
  const totalRow=desa?`<tr class="pu-total"><td colspan="2">JUMLAH</td>${['balita','cbr','pra','remaja','usia','dewasa','total'].map(k=>n2(t[k])).join('')}<td>${sum(rows,'janda')}</td>${['janda_siap','janda_btn','janda_trangan','sub'].map(k=>`<td>${rows.every(r=>r.profile[k]!==undefined&&r.profile[k]!=='')?fmt(rows.reduce((n,r)=>n+(number(r.profile[k])||0),0)):'—'}</td>`).join('')}<td>${sum(rows,'kk')}</td>${['pengurus4s','pengurus_lain'].map(k=>`<td>${rows.every(r=>r.profile[k]!==undefined&&r.profile[k]!=='')?fmt(rows.reduce((n,r)=>n+(number(r.profile[k])||0),0)):'—'}</td>`).join('')}<td>${sum(rows,'pengurus')}</td><td>${rows.every(r=>r.profile.persenan!==undefined&&r.profile.persenan!=='')?fmt(rows.reduce((n,r)=>n+(number(r.profile.persenan)||0),0)):'—'}</td></tr>`:'';
  const detail=desa?`<table><thead><tr><th>Wakil desa</th><th>Kelompok</th><th>Sub</th><th>KK</th>${facilities.map(x=>`<th>${safe(x[1])}</th>`).join('')}<th>Pengajian desa/bulan</th><th>Muda-mudi</th><th>Ibu-ibu</th><th>Aghniya</th><th>Musyawarah</th><th>Organisasi</th></tr></thead><tbody><tr><td>${numericCell(dp,'wakil_desa')}</td><td>${GROUPS.length}</td><td>${rows.every(r=>r.profile.sub!==undefined&&r.profile.sub!=='')?rows.reduce((n,r)=>n+(number(r.profile.sub)||0),0):'—'}</td><td>${sum(rows,'kk')}</td>${facilities.map(([k])=>`<td>${numericCell(dp,k)}</td>`).join('')}${['kegiatan_desa','kegiatan_mudadi','kegiatan_ibu','kegiatan_agnia','kegiatan_mus','kegiatan_organisasi'].map(k=>`<td>${shown(dp[k])}</td>`).join('')}</tr></tbody></table>`
   :`<table><thead><tr>${facilities.map(x=>`<th>${safe(x[1])}</th>`).join('')}<th>Kamar MT</th><th>Kamar tamu</th>${['Kelompok','Muda-mudi','CBR','Ibu-ibu','5 unsur','Musyawarah','Lain'].map(x=>`<th>Kegiatan ${x}</th>`).join('')}</tr></thead><tbody><tr>${facilities.map(([k])=>`<td>${numericCell(p,k)}</td>`).join('')}${['kamar_mt','kamar_tamu'].map(k=>`<td>${numericCell(p,k)}</td>`).join('')}${['kegiatan_klp','kegiatan_mudadi','kegiatan_cbr','kegiatan_ibu','kegiatan_5unsur','kegiatan_mus','kegiatan_lain'].map(k=>`<td>${shown(p[k])}</td>`).join('')}</tr></tbody></table>`;
  const off=desa?officersFor('DESA',dp):group.officers;
  const notes=snapshot.notes||[];
  const sign=off.imam?.[0]||'________________',pnb=off.penerobos?.[0]||'________________';
  return `<article class="pu-report" id="pu-report"><h2>LAPORAN PENEROBOSAN UMUM</h2><div class="pu-sub">JUMLAH JAMAAH, PERSENAN, KEGIATAN DAN KEPENGURUSAN ${desa?'DESA':'KELOMPOK'}</div><div>${desa?'DESA: Perwira':`KELOMPOK: ${safe(names[s])}`} &nbsp; | &nbsp; ${desa?'':'DESA: Perwira &nbsp; | &nbsp; '}DAERAH: Bekasi Timur &nbsp; | &nbsp; BULAN: ${safe(titleMonth(period))}</div>
  <table><thead><tr><th rowspan="3">NO</th><th rowspan="3">KELOMPOK</th><th colspan="21">JUMLAH JAMAAH</th><th colspan="4">JANDA</th><th rowspan="3">SUB</th><th rowspan="3">KK</th><th colspan="3">JUMLAH PENGURUS</th><th rowspan="3">PERSENAN (Rp)</th></tr><tr>${categoryHead()}<th rowspan="2">JML</th><th rowspan="2">SIAP DIWAYUH</th><th rowspan="2">BTN</th><th rowspan="2">TR-AN</th><th rowspan="2">4 S</th><th rowspan="2">LAIN</th><th rowspan="2">JML</th></tr><tr>${categorySub()}</tr></thead><tbody>${rows.map(statRow).join('')}${totalRow}</tbody></table>
  <b>SARANA DAN PRASARANA · KEGIATAN</b>${detail}<b>KEPENGURUSAN ${desa?'DESA':'KELOMPOK'}</b><table><thead><tr>${officers.map(([,label])=>`<th>${safe(label)} ${desa?'Desa':'Kelompok'}</th>`).join('')}</tr></thead><tbody><tr>${officers.map(([k])=>`<td>${listCell(off[k])}</td>`).join('')}</tr></tbody></table>
  ${notes.length?`<p><b>Perlu dicek:</b> ${notes.map(safe).join('; ')}.</p>`:''}<p style="text-align:right;margin:20px 12px">Perwira, ${safe(titleMonth(period))}<br>Kyai ${desa?'Desa':'Kelompok'}: ${safe(sign)} &nbsp; &nbsp; Penerobos ${desa?'Desa':'Kelompok'}: ${safe(pnb)}</p></article>`;
}
async function reload(){
  const [p,h]=await Promise.all([
    sb.from('ubnb_penerobosan_profil').select('scope_key,rincian'),
    sb.from('ubnb_penerobosan_laporan').select('id,scope_key,periode,snapshot,created_at,created_by').order('periode',{ascending:false}).limit(80)
  ]);
  if(p.error||h.error)throw new Error(p.error?.message||h.error?.message);
  profiles=Object.fromEntries((p.data||[]).map(x=>[x.scope_key,x.rincian||{}]));history=h.data||[];
}
function showHistory(){const s=scope(),items=history.filter(x=>x.scope_key===s);el('pu-history').innerHTML=items.length?items.map(x=>`<div class="pu-history-item"><span>${safe(titleMonth(x.periode))} · ${safe(names[s])} · ${safe(x.created_by)}</span><button type="button" data-pu-id="${x.id}">Lihat arsip</button></div>`).join(''):'Belum ada laporan tersimpan.';
  el('pu-history').querySelectorAll('[data-pu-id]').forEach(b=>b.onclick=()=>{const r=history.find(x=>String(x.id)===b.dataset.puId);if(!r)return;archiveView=r.snapshot;current=r.snapshot;el('pu-preview').innerHTML=render(current);alertMsg('Menampilkan arsip '+titleMonth(r.periode)+'. Pilih Pratinjau untuk kembali ke data terbaru.');});
}
function refresh(){try{archiveView=null;current=compute();el('pu-preview').innerHTML=render(current);showHistory();alertMsg(current.notes.join('; '));}catch(e){alertMsg(e.message);}}
function edit(){const s=scope(),p=profiles[s]||{};if(!canEdit()){alertMsg('Akun hanya dapat melihat laporan.');return;}
  let html=`<div class="pu-form-section"><h4>Profil ${safe(names[s])}</h4><p>Kolom kosong akan tampil sebagai “—” di laporan. Jumlah pengurus otomatis dari daftar pengurus aktif; rincian 4 S dan lain diisi di sini.</p><div class="pu-profile-grid">${fields(s==='DESA'?desaExtras:common,p)}</div></div>`;
  if(s==='DESA')html+=`<div class="pu-form-section"><h4>Sarana desa</h4><div class="pu-profile-grid">${fields(facilities,p)}</div></div>`;
  else html+=`<div class="pu-form-section"><h4>Sarana dan kegiatan kelompok</h4><div class="pu-profile-grid">${fields(facilities.concat(groupExtras),p)}</div></div>`;
  html+=`<div class="pu-form-section"><h4>Nama pengurus</h4><p>Nama dari daftar pengurus aktif terisi otomatis. Isi di sini bila perlu koreksi atau jabatan belum tersedia; pisahkan beberapa nama dengan baris baru.</p><div class="pu-profile-grid">${officers.map(([key,label])=>`<label>${label}<textarea data-pu="nama_${key}" placeholder="Otomatis: ${safe(roster(s,key).join(', '))}">${safe(p['nama_'+key]||'')}</textarea></label>`).join('')}</div></div><button type="button" onclick="puSaveProfile()">💾 Simpan profil ${safe(names[s])}</button> <button type="button" onclick="puCloseProfile()">Tutup</button>`;
  el('pu-profile').innerHTML=html;el('pu-profile').hidden=false;
}
async function token(){if(!DK_ATT_TOKEN)await dkAttendanceAuthenticate();if(!DK_ATT_TOKEN)throw new Error('Masuk kembali sebagai pengurus untuk menyimpan.');return DK_ATT_TOKEN;}
async function saveProfile(){const box=el('pu-profile');if(box.hidden||busy)return;busy=true;try{
  const s=scope(),data={};for(const input of box.querySelectorAll('[data-pu]')){const key=input.dataset.pu;if(input.type==='number'){if(input.value!==''&&(!Number.isInteger(Number(input.value))||Number(input.value)<0))throw new Error('Isi angka bulat yang tidak negatif: '+key);data[key]=input.value===''?'':Number(input.value);}else data[key]=input.value.trim();}
  const {data:res,error}=await sb.rpc('dashboard_penerobosan_save',{p_token:await token(),p_scope:s,p_rincian:data});if(error||!res?.ok)throw new Error(error?.message||res?.error||'Gagal menyimpan profil');
  profiles[s]=data;box.hidden=true;refresh();alertMsg('Profil '+names[s]+' tersimpan.');
 }catch(e){alertMsg(e.message);}finally{busy=false;}}
async function archive(){if(!canEdit()||busy)return;busy=true;try{
  const snap=compute(),existing=history.find(h=>h.scope_key===snap.scope&&h.periode===snap.period);
  if(snap.notes.length&&!confirm('Ada data sensus yang belum lengkap. Simpan laporan dengan catatan tersebut?'))return;
  if(existing&&!confirm('Laporan '+titleMonth(snap.period)+' sudah tersimpan. Perbarui arsip periode tersebut?'))return;
  const {data,error}=await sb.rpc('dashboard_penerobosan_archive',{p_token:await token(),p_scope:snap.scope,p_periode:snap.period,p_snapshot:snap});
  if(error||!data?.ok)throw new Error(error?.message||data?.error||'Gagal menyimpan laporan');
  await reload();refresh();alertMsg('Laporan '+titleMonth(snap.period)+' tersimpan.');
 }catch(e){alertMsg(e.message);}finally{busy=false;}}
function exportExcel(){if(!current)return alertMsg('Buat pratinjau dahulu.');if(typeof XLSX==='undefined')return alertMsg('Komponen Excel belum tersedia.');
  const book=XLSX.utils.table_to_book(el('pu-report').querySelector('table'),{sheet:'Jamaah'});
  const tables=el('pu-report').querySelectorAll('table');for(let i=1;i<tables.length;i++)XLSX.utils.book_append_sheet(book,XLSX.utils.table_to_sheet(tables[i]),i===1?'Sarana Kegiatan':'Kepengurusan');
  XLSX.writeFile(book,`Penerobosan_Umum_${current.scope}_${current.period}.xlsx`);
}
function print(){if(!current)return alertMsg('Buat pratinjau dahulu.');const node=document.createElement('div');node.id='pu-print-sheet';node.innerHTML=el('pu-preview').innerHTML;document.body.append(node);document.body.classList.add('pu-print-mode');const done=()=>{node.remove();document.body.classList.remove('pu-print-mode');window.removeEventListener('afterprint',done);};window.addEventListener('afterprint',done);window.print();setTimeout(done,60000);}
async function init(){if(!el('pu-panel'))return;const select=el('pu-scope');select.innerHTML=(CU?.kelompok_scope?[CU.kelompok_scope]:['DESA',...GROUPS]).map(g=>`<option value="${g}">${safe(names[g])} (${g})</option>`).join('');
  const now=new Date();el('pu-month').value=`${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}`;
  el('pu-save').hidden=!canEdit();try{await reload();refresh();}catch(e){alertMsg('Data penerobosan belum siap: '+e.message);}}
window.puScopeChanged=()=>{el('pu-profile').hidden=true;refresh();};window.puRefresh=refresh;window.puEditProfile=edit;window.puCloseProfile=()=>{el('pu-profile').hidden=true;};window.puSaveProfile=saveProfile;window.puArchive=archive;window.puExport=exportExcel;window.puPrint=print;
const oldRender=window.renderSensus;
window.renderSensus=function(...args){const result=oldRender?.apply(this,args);if(CU)void init();return result;};
})();
