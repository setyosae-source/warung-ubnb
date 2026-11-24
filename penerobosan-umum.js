/* Laporan Penerobosan Umum Pusat. Tidak mengubah data sensus bulanan lama. */
(()=>{
'use strict';
const GROUPS=['PW1','PW2','PW3','PW4'];
const names={DESA:'Desa Perwira',PW1:'Perwirasari',PW2:'Alinda',PW3:'Bulak Perwira',PW4:'Vila Indah Permai'};
const common=[
 ['sub','Jumlah sub','number'],
 ['persenan','Persenan bulan ini (Rp)','number'],['janda_btn','Janda siap diwayuh: BTN','number'],['janda_trangan','Janda siap diwayuh: Tr-an','number']
];
const facilities=[['masjid','Masjid','number'],['jeding_l','Jeding putra','number'],['jeding_p','Jeding putri','number'],['aula','Aula','number'],['madrasah','Madrasah','number'],['pondok','Pondok','number'],['sekolah','Sekolah','number']];
const groupExtras=[['kamar_mt','Kamar MT','number'],['kamar_tamu','Kamar tamu','number'],['kegiatan_klp','Pengajian kelompok / minggu','text'],['kegiatan_mudadi','Muda-mudi / minggu','text'],['kegiatan_cbr','CBR / minggu','text'],['kegiatan_ibu','Ibu-ibu / minggu','text'],['kegiatan_5unsur','5 unsur','text'],['kegiatan_mus','Musyawarah','text'],['kegiatan_lain','Kegiatan lain','text']];
const desaExtras=[['kegiatan_desa','Pengajian desa / bulan','text'],['kegiatan_mudadi','Muda-mudi / bulan','text'],['kegiatan_ibu','Ibu-ibu / bulan','text'],['kegiatan_agnia','Aghniya / bulan','text'],['kegiatan_mus','Musyawarah / bulan','text'],['kegiatan_organisasi','Organisasi / bulan','text']];
const officers=[['imam','Imam/Kyai'],['wakil','Wakil KI'],['penerobos','Penerobos'],['muballigh','Muballigh'],['ku','KU'],['aghnia','Aghniya'],['lain','Kepengurusan lain']];
const officerPatterns={imam:/^KI (?:Desa|Kelompok)$/i,wakil:/^Wakil KI\b/i,penerobos:/^Penerobos\b/i,muballigh:/^(?:Muballigh|Mubaligh|Muballegh|MT)\b/i,ku:/\bKU\b/i,aghnia:/^Aghnia\b/i};
let profiles={},history=[],mubCounts={},current=null,archiveView=null,busy=false;
const el=id=>document.getElementById(id);
function separateSensusTabs(){
  const panel=el('pu-panel'),oldPage=el('page-sensus');
  const bar=document.querySelector('#app > .page-tabs');
  const monthly=bar?.querySelector('button[onclick="showTab(\'sensus\',this)"]');
  if(!panel||!oldPage||!monthly||el('page-penerobosan'))return;
  monthly.textContent='📋 Sensus Bulanan';
  const button=document.createElement('button');
  button.type='button';button.className='page-tab';button.id='tab-btn-penerobosan';
  button.textContent='📑 Sensus Penerobosan Umum';
  button.onclick=function(){showTab('penerobosan',button);};
  monthly.after(button);
  const page=document.createElement('div');page.id='page-penerobosan';page.className='page';
  oldPage.after(page);page.append(panel);
}
separateSensusTabs();
const reportStyle=document.createElement('style');
reportStyle.textContent=`
.pu-report{min-width:0;max-width:1100px;margin:auto;font:12px Arial,sans-serif}
.pu-report .pu-block{margin:14px 0 18px;overflow-x:auto}
.pu-report h3{font-size:12px;margin:0 0 4px;color:#163e2a}
.pu-report table{table-layout:fixed;margin:4px 0}
.pu-report th,.pu-report td{padding:5px 3px;overflow-wrap:anywhere}
.pu-report table[data-pu-sheet^="Jamaah"] th:first-child,.pu-report table[data-pu-sheet^="Jamaah"] td:first-child{width:15%}
.pu-report table[data-pu-sheet="Kegiatan"] th:first-child,.pu-report table[data-pu-sheet="Kegiatan"] td:first-child{width:40%}
.pu-report .pu-roster th,.pu-report .pu-roster td{text-align:left}
.pu-report .pu-roster th:first-child,.pu-report .pu-roster td:first-child{width:32%}
.pu-report .pu-group-row th{background:#dbe8dd}
.pu-report .pu-sign{text-align:right;margin:14px 12px}
.pu-report .pu-notes{font-size:11px;line-height:1.35}
@media print{
  @page{size:A4 landscape;margin:9mm}
  body.pu-print-mode #pu-print-sheet .pu-report{width:100%;max-width:none;min-width:0;font:9pt Arial,sans-serif}
  body.pu-print-mode #pu-print-sheet .pu-report h2{font-size:14pt;margin:0}
  body.pu-print-mode #pu-print-sheet .pu-report h3{font-size:10pt}
  body.pu-print-mode #pu-print-sheet .pu-report .pu-block{overflow:visible;margin:8px 0;break-inside:avoid}
  body.pu-print-mode #pu-print-sheet .pu-report .pu-roster{break-inside:auto}
  body.pu-print-mode #pu-print-sheet .pu-report .pu-print-break{break-before:page;page-break-before:always}
  body.pu-print-mode #pu-print-sheet .pu-report table{width:100%;table-layout:fixed;margin:3px 0}
  body.pu-print-mode #pu-print-sheet .pu-report th,body.pu-print-mode #pu-print-sheet .pu-report td{padding:2px 3px;font-size:8pt}
  body.pu-print-mode #pu-print-sheet .pu-report thead{display:table-header-group}
  body.pu-print-mode #pu-print-sheet .pu-report tr{break-inside:avoid}
}`;
document.body.append(reportStyle);
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
  const entries=(aPengurus||[]).filter(p=>p.aktif!==false&&p.level===lv&&(g==='DESA'||p.kelompok_nama===g));
  const other=code==='lain';
  const seen=new Set();
  return entries.filter(p=>other?!Object.values(officerPatterns).some(pattern=>pattern.test(p.dapukan||'')):officerPatterns[code]?.test(p.dapukan||''))
    .map(p=>{
      const name=p.jamaah_desa?.nama||aJamaahDesa.find(j=>j.did===p.did)?.nama||'';
      const key=other?`${p.did}|${p.dapukan}`:String(p.did);
      if(!name||seen.has(key))return null;seen.add(key);
      return other?`${name} (${p.dapukan||'dapukan belum diisi'})`:name;
    }).filter(Boolean);
}
function officersFor(g,p){
  const o={};for(const [k] of officers){const value=[p['nama_'+k],k==='muballigh'?p.nama_mt:''].filter(Boolean).join('\n');o[k]=[...new Set([...roster(g,k),...value.split(/\n|;/).map(x=>x.trim()).filter(Boolean)])];}
  return o;
}
function pengurus4S(label){
  // Semua dapukan KU (termasuk KU Pembangunan, Penulis/Pencatat KU) masuk 4S.
  return /\b(?:KI|Penerobos|KU|Aghnia)\b/i.test(String(label||''));
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
  const pengurus=(aPengurus||[]).filter(x=>x.aktif!==false&&x.level==='kelompok'&&x.kelompok_nama===g&&x.did);
  const semua=new Set(pengurus.map(x=>String(x.did)));
  const empatS=new Set(pengurus.filter(x=>pengurus4S(x.dapukan)).map(x=>String(x.did)));
  r.pengurus4s=empatS.size;
  r.pengurus_lain=[...semua].filter(did=>!empatS.has(did)).length;
  r.pengurus=semua.size;
  const mub=mubCounts[g];
  r.mt=mub&&mub.belum_isi===0?number(mub.mt):null;
  r.ms=mub&&mub.belum_isi===0?number(mub.ms):null;
  r.muballigh_belum_isi=mub?.belum_isi??null;
  r.officers=officersFor(g,p);
  return r;
}
function statusFor(rows){const missing=rows.reduce((n,r)=>n+r.missing,0);let notes=[];
  if(missing)notes.push(`${missing} jamaah belum memiliki tanggal lahir, jenis kelamin, atau status nikah lengkap; belum masuk kolom klasifikasi`);
  for(const r of rows){if(r.members!==r.total.L+r.total.P)notes.push(`${r.scope}: ${r.members-r.total.L-r.total.P} jenis kelamin kosong`);}
  for(const r of rows){if(r.muballigh_belum_isi===null)notes.push(`${r.scope}: status muballigh sensus daerah belum dimuat`);else if(r.muballigh_belum_isi>0)notes.push(`${r.scope}: ${r.muballigh_belum_isi} jamaah belum mengisi status muballigh sensus daerah; MT/MS belum dapat dipastikan`);}
  for(const r of rows){const p=r.profile,required=['sub','persenan','janda_btn','janda_trangan'];const incomplete=required.filter(k=>p[k]===undefined||p[k]==='');if(incomplete.length)notes.push(`${r.scope}: ${incomplete.length} rincian profil belum diisi`);}
  return notes;
}
function compute(){
  const s=scope(),period=el('pu-month').value,date=new Date(`${period}-01T12:00:00`);
  if(!period||isNaN(date.getTime()))throw new Error('Pilih bulan yang valid');
  date.setMonth(date.getMonth()+1);date.setDate(0);
  const rows=(s==='DESA'?GROUPS:[s]).map(g=>groupData(g,date));
  const notes=statusFor(rows);if(s==='DESA'&&!profiles.DESA)notes.push('Profil desa belum diisi');
  const wakilDesa=new Set((aPengurus||[]).filter(x=>x.aktif!==false&&x.level==='desa'&&/^Wakil KI\b/i.test(x.dapukan||'')&&x.did).map(x=>String(x.did))).size;
  const genderMap={};for(const j of aJamaahDesa||[]){const k=String(j.nama||'').trim().toLocaleLowerCase('id-ID');if(k)genderMap[k]=normGender(j.jenis_kelamin)||'unknown';}
  return {scope:s,period,rows,wakilDesa,genderMap,profiles:JSON.parse(JSON.stringify(profiles)),created:new Date().toISOString(),notes};
}
function n2(b){const l=number(b?.L)||0,p=number(b?.P)||0;return `<td>${l}</td><td>${p}</td><td>${l+p}</td>`;}
function categoryHead(){return ['Balita','CBR / PAUD - SD','Pra Remaja','Remaja','Usia Nikah','Dewasa','Total Jamaah'].map(c=>`<th colspan="3">${c}</th>`).join('');}
function categorySub(){return Array(7).fill('<th>L</th><th>P</th><th>J</th>').join('');}
function totals(rows){const t={};for(const k of ['balita','cbr','pra','remaja','usia','dewasa','total'])t[k]={L:0,P:0};
  for(const k of ['balita','cbr','pra','remaja','usia','dewasa','total']){t[k].L=rows.reduce((n,r)=>n+r[k].L,0);t[k].P=rows.reduce((n,r)=>n+r[k].P,0);}return t;
}
function numericCell(p,k){return p[k]===undefined||p[k]===''?'—':fmt(number(p[k]));}
function mubCell(value){return value===null||value===undefined?'—':number(value)||0;}
function listCell(x){return Array.isArray(x)&&x.length?x.map(safe).join('<br>'):'—';}
function titleMonth(period){const [y,m]=period.split('-').map(Number);return `${NAMA_BULAN[m-1]} ${y}`;}
function sumProfile(rows,k){return rows.every(r=>r.profile[k]!==undefined&&r.profile[k]!=='')?fmt(rows.reduce((n,r)=>n+(number(r.profile[k])||0),0)):'—';}
function otherGrouped(items,genderMap){
  const groups={L:[],P:[],unknown:[]};
  for(const item of items||[]){
    const name=item.replace(/ \([^()]*\)$/,'').trim();
    const gender=genderMap[name.toLocaleLowerCase('id-ID')]||'unknown';
    groups[gender].push({name,role:item.slice(name.length).replace(/^\s*\(|\)$/g,'')});
  }
  for(const key of Object.keys(groups))groups[key].sort((a,b)=>a.name.localeCompare(b.name,'id-ID'));
  return groups;
}
function render(snapshot){
  const {scope:s,period,rows,profiles:ps}=snapshot,desa=s==='DESA',dp=ps.DESA||{};
  const t=totals(rows),group=rows[0],p=group.profile||{},notes=snapshot.notes||[];
  const age=(keys,title,sheet)=>`<section class="pu-block"><h3>${title}</h3><table data-pu-sheet="${sheet}"><thead><tr><th rowspan="2">Kelompok</th>${keys.map(k=>`<th colspan="3">${({balita:'Balita',cbr:'CBR / PAUD - SD',pra:'Pra remaja',remaja:'Remaja',usia:'Usia nikah',dewasa:'Dewasa',total:'Total jamaah'})[k]}</th>`).join('')}</tr><tr>${keys.map(()=>'<th>L</th><th>P</th><th>J</th>').join('')}</tr></thead><tbody>${rows.map(r=>`<tr><td class="pu-left">${safe(r.nama)}</td>${keys.map(k=>n2(r[k])).join('')}</tr>`).join('')}${desa?`<tr class="pu-total"><td>JUMLAH</td>${keys.map(k=>n2(t[k])).join('')}</tr>`:''}</tbody></table></section>`;
  const summaryRow=r=>`<tr><td class="pu-left">${safe(r.nama)}</td><td>${number(r.janda)||0}</td><td>${numericCell(r.profile,'janda_btn')}</td><td>${numericCell(r.profile,'janda_trangan')}</td><td>${numericCell(r.profile,'sub')}</td><td>${number(r.kk)||0}</td><td>${number(r.pengurus4s)||0}</td><td>${number(r.pengurus_lain)||0}</td><td>${number(r.pengurus)||0}</td><td>${numericCell(r.profile,'persenan')}</td></tr>`;
  const summary=`<section class="pu-block"><h3>JANDA · SUB · KK · PENGURUS · PERSENAN</h3><table data-pu-sheet="Janda Pengurus"><thead><tr><th rowspan="3">Kelompok</th><th colspan="3">JANDA</th><th rowspan="3">SUB</th><th rowspan="3">KK</th><th colspan="3">JUMLAH PENGURUS</th><th rowspan="3">PERSENAN (Rp)</th></tr><tr><th rowspan="2">JML</th><th colspan="2">SIAP DIWAYUH</th><th rowspan="2">4 S</th><th rowspan="2">LAIN</th><th rowspan="2">JML</th></tr><tr><th>BTN</th><th>TR-AN</th></tr></thead><tbody>${rows.map(summaryRow).join('')}${desa?`<tr class="pu-total"><td>JUMLAH</td><td>${sum(rows,'janda')}</td><td>${sumProfile(rows,'janda_btn')}</td><td>${sumProfile(rows,'janda_trangan')}</td><td>${sumProfile(rows,'sub')}</td><td>${sum(rows,'kk')}</td><td>${sum(rows,'pengurus4s')}</td><td>${sum(rows,'pengurus_lain')}</td><td>${sum(rows,'pengurus')}</td><td>${sumProfile(rows,'persenan')}</td></tr>`:''}</tbody></table></section>`;
  const allMt=rows.every(r=>r.mt!==null)?sum(rows,'mt'):'—',allMs=rows.every(r=>r.ms!==null)?sum(rows,'ms'):'—';
  const facilityOrder=desa?['masjid','jeding_l','jeding_p','aula','madrasah','pondok','sekolah']:['masjid','aula','madrasah','jeding_l','jeding_p','sekolah','pondok'];
  const facilityHead=desa?'<th rowspan="2">Masjid</th><th colspan="2">Jeding</th><th rowspan="2">Aula</th><th rowspan="2">Madrasah</th><th rowspan="2">Pondok</th><th rowspan="2">Sekolah</th>':'<th rowspan="2">Masjid</th><th rowspan="2">Aula</th><th rowspan="2">Madrasah</th><th colspan="2">Jeding</th><th rowspan="2">Sekolah</th><th rowspan="2">Pondok</th>';
  const facilitiesTable=`<section class="pu-block"><h3>SARANA DAN PRASARANA</h3><table data-pu-sheet="Sarana"><thead><tr>${desa?'<th rowspan="2">Wakil KI desa</th><th rowspan="2">Kelompok</th>':''}${facilityHead}<th rowspan="2">MT</th><th rowspan="2">MS</th>${desa?'':'<th rowspan="2">Kamar MT</th><th rowspan="2">Kamar tamu</th>'}</tr><tr><th>Putra</th><th>Putri</th></tr></thead><tbody><tr>${desa?`<td>${number(snapshot.wakilDesa)||0}</td><td>${GROUPS.length}</td>`:''}${facilityOrder.map(k=>`<td>${numericCell(desa?dp:p,k)}</td>`).join('')}<td>${desa?allMt:mubCell(group.mt)}</td><td>${desa?allMs:mubCell(group.ms)}</td>${desa?'':`<td>${numericCell(p,'kamar_mt')}</td><td>${numericCell(p,'kamar_tamu')}</td>`}</tr></tbody></table><small>MT = Muballigh Tugasan yang bertugas; MS = lulusan pondok yang tidak sedang bertugas dan tidak memiliki SK tugas. Jumlah mengikuti sensus daerah.</small></section>`;
  const activities=desa?desaExtras:groupExtras.filter(([k])=>k.startsWith('kegiatan_'));
  const activityTable=`<section class="pu-block"><h3>KEGIATAN ${desa?'DESA / BULAN':'KELOMPOK / MINGGU'}</h3><table data-pu-sheet="Kegiatan"><thead><tr><th>Kegiatan</th><th>Jumlah / keterangan</th></tr></thead><tbody>${activities.map(([k,label])=>`<tr><td class="pu-left">${safe(label)}</td><td class="pu-left">${shown((desa?dp:p)[k])}</td></tr>`).join('')}</tbody></table></section>`;
  const off=desa?officersFor('DESA',dp):group.officers;
  const genderMap=snapshot.genderMap||{};
  const other=otherGrouped(off.lain,genderMap);
  const roleRows=officers.filter(([k])=>k!=='lain').map(([k,label])=>(off[k]?.length?off[k]:['—']).map(name=>`<tr><td>${safe(label)} ${desa?'Desa':'Kelompok'}</td><td class="pu-left">${safe(name)}</td></tr>`).join('')).join('');
  const otherRows=(items,heading)=>`<tr class="pu-group-row"><th colspan="2">Kepengurusan lain · ${heading}</th></tr>${items.length?items.map(x=>`<tr><td>${safe(x.role||'Dapukan belum diisi')}</td><td class="pu-left">${safe(x.name)}</td></tr>`).join(''):'<tr><td>—</td><td class="pu-left">—</td></tr>'}`;
  const rosterTable=`<section class="pu-block pu-roster"><h3>KEPENGURUSAN ${desa?'DESA':'KELOMPOK'}</h3><table data-pu-sheet="Kepengurusan"><thead><tr><th>Dapukan</th><th>Nama pengurus</th></tr></thead><tbody>${roleRows}${otherRows(other.L,'laki-laki')}${otherRows(other.P,'perempuan')}${other.unknown.length?otherRows(other.unknown,'jenis kelamin belum terdata'):''}</tbody></table></section>`;
  const sign=off.imam?.[0]||'________________',pnb=off.penerobos?.[0]||'________________';
  return `<article class="pu-report" id="pu-report"><h2>LAPORAN PENEROBOSAN UMUM</h2><div class="pu-sub">${desa?'DESA':'KELOMPOK'} · ${desa?'Perwira':safe(names[s])} · Bekasi Timur · ${safe(titleMonth(period))}</div>
  ${age(['balita','cbr','pra'],'JUMLAH JAMAAH · ANAK','Jamaah Anak')}${age(['remaja','usia','dewasa','total'],'JUMLAH JAMAAH · REMAJA DAN DEWASA','Jamaah Dewasa')}${summary}
  <div class="pu-print-break"></div>${facilitiesTable}${activityTable}${rosterTable}
  ${notes.length?`<p class="pu-notes"><b>Perlu dicek:</b> ${notes.map(safe).join('; ')}.</p>`:''}<p class="pu-sign">Perwira, ${safe(titleMonth(period))}<br>Kyai ${desa?'Desa':'Kelompok'}: ${safe(sign)} &nbsp; &nbsp; Penerobos ${desa?'Desa':'Kelompok'}: ${safe(pnb)}</p></article>`;
}
async function reload(){
  const [p,h,m]=await Promise.all([
    sb.from('ubnb_penerobosan_profil').select('scope_key,rincian'),
    sb.from('ubnb_penerobosan_laporan').select('id,scope_key,periode,snapshot,created_at,created_by').order('periode',{ascending:false}).limit(80),
    sb.rpc('dashboard_penerobosan_mubaligh_counts')
  ]);
  if(p.error||h.error||m.error||!Array.isArray(m.data))throw new Error(p.error?.message||h.error?.message||m.error?.message||'Status muballigh sensus daerah belum dapat dimuat');
  profiles=Object.fromEntries((p.data||[]).map(x=>[x.scope_key,x.rincian||{}]));history=h.data||[];
  mubCounts=Object.fromEntries(m.data.map(x=>[x.kelompok_nama,x]));
}
function showHistory(){const s=scope(),items=history.filter(x=>x.scope_key===s);el('pu-history').innerHTML=items.length?items.map(x=>`<div class="pu-history-item"><span>${safe(titleMonth(x.periode))} · ${safe(names[s])} · ${safe(x.created_by)}</span><button type="button" data-pu-id="${x.id}">Lihat arsip</button></div>`).join(''):'Belum ada laporan tersimpan.';
  el('pu-history').querySelectorAll('[data-pu-id]').forEach(b=>b.onclick=()=>{const r=history.find(x=>String(x.id)===b.dataset.puId);if(!r)return;archiveView=r.snapshot;current=r.snapshot;el('pu-preview').innerHTML=render(current);alertMsg('Menampilkan arsip '+titleMonth(r.periode)+'. Pilih Pratinjau untuk kembali ke data terbaru.');});
}
function refresh(){try{archiveView=null;current=compute();el('pu-preview').innerHTML=render(current);showHistory();alertMsg(current.notes.join('; '));}catch(e){alertMsg(e.message);}}
function edit(){const s=scope(),p=profiles[s]||{};if(!canEdit()){alertMsg('Akun hanya dapat melihat laporan.');return;}
  let html=`<div class="pu-form-section"><h4>Profil ${safe(names[s])}</h4><p>Kolom kosong akan tampil sebagai “—” di laporan. Jumlah Wakil KI dan pengurus 4 S dihitung dari dapukan aktif; MT/MS dari status muballigh sensus daerah. Kepengurusan lain juga ditampilkan otomatis bersama dapukannya.</p><div class="pu-profile-grid">${fields(s==='DESA'?desaExtras:common,p)}</div></div>`;
  if(s==='DESA')html+=`<div class="pu-form-section"><h4>Sarana desa</h4><div class="pu-profile-grid">${fields(facilities,p)}</div></div>`;
  else html+=`<div class="pu-form-section"><h4>Sarana dan kegiatan kelompok</h4><div class="pu-profile-grid">${fields(facilities.concat(groupExtras),p)}</div></div>`;
  html+=`<div class="pu-form-section"><h4>Nama pengurus</h4><p>MT yang bertugas tercantum bersama Muballigh desa atau kelompok sesuai dapukannya; MS tidak otomatis menjadi pengurus. Nama tambahan yang belum ada di daftar pengurus dapat ditulis per baris.</p><div class="pu-profile-grid">${officers.map(([key,label])=>`<label>${label}<textarea data-pu="nama_${key}" placeholder="Otomatis: ${safe(roster(s,key).join(', '))}">${safe([p['nama_'+key],key==='muballigh'?p.nama_mt:''].filter(Boolean).join('\n'))}</textarea></label>`).join('')}</div></div><button type="button" onclick="puSaveProfile()">💾 Simpan profil ${safe(names[s])}</button> <button type="button" onclick="puCloseProfile()">Tutup</button>`;
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
  const book=XLSX.utils.book_new(),tables=el('pu-report').querySelectorAll('table[data-pu-sheet]');
  for(const table of tables){
    const sheet=XLSX.utils.table_to_sheet(table),name=table.dataset.puSheet;
    const cols=Array.from({length:XLSX.utils.decode_range(sheet['!ref']).e.c+1},(_,i)=>({wch:i===0?(name==='Kepengurusan'?28:23):name==='Kegiatan'?54:name==='Kepengurusan'?72:13}));
    sheet['!cols']=cols;
    XLSX.utils.book_append_sheet(book,sheet,name);
  }
  XLSX.writeFile(book,`Penerobosan_Umum_${current.scope}_${current.period}.xlsx`);
}
function print(){if(!current)return alertMsg('Buat pratinjau dahulu.');const node=document.createElement('div');node.id='pu-print-sheet';node.innerHTML=el('pu-preview').innerHTML;document.body.append(node);document.body.classList.add('pu-print-mode');const done=()=>{node.remove();document.body.classList.remove('pu-print-mode');window.removeEventListener('afterprint',done);};window.addEventListener('afterprint',done);window.print();setTimeout(done,60000);}
async function init(){if(!el('pu-panel'))return;const select=el('pu-scope');select.innerHTML=(CU?.kelompok_scope?[CU.kelompok_scope]:['DESA',...GROUPS]).map(g=>`<option value="${g}">${safe(names[g])} (${g})</option>`).join('');
  const now=new Date();el('pu-month').value=`${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}`;
  el('pu-save').hidden=!canEdit();
  const editButton=el('pu-panel').querySelector('button[onclick="puEditProfile()"]');
  if(editButton)editButton.hidden=!canEdit();
  if(isViewer()){
    // Pembatasan lama memakai indeks tab. Pulihkan tab penerobosan yang baru dan
    // tutup dua tab administrasi berdasarkan tujuan, bukan posisi tombol.
    el('tab-btn-penerobosan').style.setProperty('display','flex','important');
    for(const target of ['absen','isrun']){
      const button=document.querySelector(`#app > .page-tabs button[onclick="showTab('${target}',this)"]`);
      if(button)button.style.setProperty('display','none','important');
    }
  }
  try{await reload();refresh();}catch(e){alertMsg('Data penerobosan belum siap: '+e.message);}}
window.puScopeChanged=()=>{el('pu-profile').hidden=true;refresh();};window.puRefresh=refresh;window.puEditProfile=edit;window.puCloseProfile=()=>{el('pu-profile').hidden=true;};window.puSaveProfile=saveProfile;window.puArchive=archive;window.puExport=exportExcel;window.puPrint=print;
const oldRender=window.renderSensus;
window.renderSensus=function(...args){const result=oldRender?.apply(this,args);if(CU)void init();return result;};
})();
