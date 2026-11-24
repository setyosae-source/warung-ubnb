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
.pu-report.pu-excel{min-width:0;max-width:1200px;margin:auto;color:#111;font:11px Arial,sans-serif;background:#fff}
.pu-excel h2{text-align:center;font-size:16px;margin:3px 0}
.pu-excel .pu-sub{text-align:center;font-weight:bold;margin:0 0 5px}
.pu-excel .pu-meta{text-align:center;margin-bottom:7px}
.pu-excel .pu-block{margin:7px 0;overflow-x:auto}
.pu-excel table{width:100%;border-collapse:collapse;table-layout:fixed;margin:0}
.pu-excel th,.pu-excel td{border:1px solid #333;text-align:center;padding:3px 2px;overflow-wrap:anywhere;vertical-align:middle}
.pu-excel th{background:#d9e8cf}
.pu-excel .pu-left{text-align:left}
.pu-excel .pu-excel-main{font-size:8px}
.pu-excel .pu-excel-main th,.pu-excel .pu-excel-main td{padding:3px 1px}
.pu-excel .pu-excel-detail{font-size:9px}
.pu-excel .pu-excel-roster td{vertical-align:top;line-height:1.25}
.pu-excel .pu-excel-other th{text-align:left}
.pu-excel .pu-total{font-weight:bold;background:#edf5ed}
.pu-excel small{display:block;margin-top:3px;font-size:9px}
.pu-excel .pu-notes{font-size:9px;line-height:1.2;margin:4px 0}
.pu-excel .pu-sign{text-align:right;font-size:10px;margin:5px 0}
@media print{
  @page{size:A4 landscape;margin:6mm}
  body.pu-print-mode #pu-print-sheet .pu-report.pu-excel{width:100%;max-width:none;min-width:0;font:7pt Arial,sans-serif}
  body.pu-print-mode #pu-print-sheet .pu-excel h2{font-size:10pt;margin:0}
  body.pu-print-mode #pu-print-sheet .pu-excel .pu-sub,body.pu-print-mode #pu-print-sheet .pu-excel .pu-meta{font-size:7pt;margin:1px 0}
  body.pu-print-mode #pu-print-sheet .pu-excel .pu-block{overflow:visible;margin:3px 0;break-inside:avoid}
  body.pu-print-mode #pu-print-sheet .pu-excel table{width:100%;table-layout:fixed;margin:0}
  body.pu-print-mode #pu-print-sheet .pu-excel th,body.pu-print-mode #pu-print-sheet .pu-excel td{padding:1px;line-height:1.08;font-size:6.5pt}
  body.pu-print-mode #pu-print-sheet .pu-excel .pu-excel-main th,body.pu-print-mode #pu-print-sheet .pu-excel .pu-excel-main td{font-size:5pt;padding:1px 0}
  body.pu-print-mode #pu-print-sheet .pu-excel small,body.pu-print-mode #pu-print-sheet .pu-excel .pu-notes{font-size:6pt;margin:2px 0}
  body.pu-print-mode #pu-print-sheet .pu-excel .pu-sign{font-size:7pt;margin:2px 0}
  body.pu-print-mode #pu-print-sheet .pu-excel tr{break-inside:avoid}
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
  const {scope:s,period,rows,profiles:ps}=snapshot,desa=s==='DESA',dp=ps.DESA||{},t=totals(rows),group=rows[0],p=group.profile||{},notes=snapshot.notes||[];
  const level=desa?'Desa':'Kelompok';
  const categories=[['balita','BALITA'],['cbr','CBR / PAUD - SD'],['pra','PRA REMAJA'],['remaja','REMAJA'],['usia','USIA NIKAH'],['dewasa','DEWASA'],['total',desa?'TOTAL JAMAAH':'TOTAL JIWA JAMAAH']];
  const mainRow=(r,i)=>`<tr>${desa?`<td>${i+1}</td>`:''}<td class="pu-left">${safe(r.nama)}</td>${categories.map(([k])=>n2(r[k])).join('')}<td>${number(r.janda)||0}</td><td>${numericCell(r.profile,'janda_btn')}</td><td>${numericCell(r.profile,'janda_trangan')}</td><td>${numericCell(r.profile,'sub')}</td><td>${number(r.kk)||0}</td><td>${number(r.pengurus4s)||0}</td><td>${number(r.pengurus_lain)||0}</td><td>${number(r.pengurus)||0}</td><td>${numericCell(r.profile,'persenan')}</td></tr>`;
  const totalRow=desa?`<tr class="pu-total"><td colspan="2">JUMLAH</td>${categories.map(([k])=>n2(t[k])).join('')}<td>${sum(rows,'janda')}</td><td>${sumProfile(rows,'janda_btn')}</td><td>${sumProfile(rows,'janda_trangan')}</td><td>${sumProfile(rows,'sub')}</td><td>${sum(rows,'kk')}</td><td>${sum(rows,'pengurus4s')}</td><td>${sum(rows,'pengurus_lain')}</td><td>${sum(rows,'pengurus')}</td><td>${sumProfile(rows,'persenan')}</td></tr>`:'';
  const main=`<section class="pu-block"><table class="pu-excel-main" data-pu-sheet="Laporan"><thead><tr>${desa?'<th rowspan="3">NO</th>':''}<th rowspan="3">KELOMPOK</th><th colspan="21">JUMLAH JAMAAH</th><th colspan="3">JANDA</th><th rowspan="3">SUB</th><th rowspan="3">KK</th><th colspan="3">JUMLAH PENGURUS</th><th rowspan="3">PERSENAN</th></tr><tr>${categories.map(([,label])=>`<th colspan="3">${label}</th>`).join('')}<th rowspan="2">JML</th><th colspan="2">SIAP DIWAYUH</th><th rowspan="2">4-S</th><th rowspan="2">LAIN</th><th rowspan="2">JML</th></tr><tr>${categories.map(()=>'<th>L</th><th>P</th><th>J</th>').join('')}<th>BTN</th><th>TR-AN</th></tr></thead><tbody>${rows.map(mainRow).join('')}${totalRow}</tbody></table></section>`;
  const countMT=rows.every(r=>r.mt!==null)?sum(rows,'mt'):'—',countMS=rows.every(r=>r.ms!==null)?sum(rows,'ms'):'—';
  const sarana=desa?`<section class="pu-block"><table class="pu-excel-detail" data-pu-sheet="Laporan"><thead><tr><th colspan="13">JUMLAH</th><th colspan="6">JUMLAH PENGAJIAN / BULAN</th></tr><tr><th rowspan="2">WAKIL DESA</th><th rowspan="2">KELOMPOK</th><th rowspan="2">SUB</th><th rowspan="2">KK</th><th rowspan="2">Masjid</th><th colspan="2">Jeding</th><th rowspan="2">Aula</th><th rowspan="2">Madrasah</th><th rowspan="2">Pondok</th><th rowspan="2">Sekolah</th><th rowspan="2">MT</th><th rowspan="2">MS</th><th rowspan="2">Desa</th><th rowspan="2">Muda-di</th><th rowspan="2">Ibu-ibu</th><th rowspan="2">Agny'</th><th rowspan="2">Muswrh</th><th rowspan="2">Organisasi</th></tr><tr><th>L</th><th>P</th></tr></thead><tbody><tr><td>${number(snapshot.wakilDesa)||0}</td><td>${GROUPS.length}</td><td>${sumProfile(rows,'sub')}</td><td>${sum(rows,'kk')}</td>${['masjid','jeding_l','jeding_p','aula','madrasah','pondok','sekolah'].map(k=>`<td>${numericCell(dp,k)}</td>`).join('')}<td>${countMT}</td><td>${countMS}</td>${['kegiatan_desa','kegiatan_mudadi','kegiatan_ibu','kegiatan_agnia','kegiatan_mus','kegiatan_organisasi'].map(k=>`<td>${shown(dp[k])}</td>`).join('')}</tr></tbody></table></section>`:
  `<section class="pu-block"><table class="pu-excel-detail" data-pu-sheet="Laporan"><thead><tr><th colspan="11">SARANA DAN PRASARANA</th><th colspan="6">KEGIATAN KELOMPOK / MINGGU</th></tr><tr><th rowspan="2">MASJID</th><th rowspan="2">AULA</th><th rowspan="2">MADRASAH</th><th colspan="2">JEDING</th><th rowspan="2">SEKOLAH</th><th rowspan="2">PONDOK</th><th rowspan="2">MT</th><th rowspan="2">MS</th><th rowspan="2">KAMAR MT</th><th rowspan="2">KAMAR TAMU</th><th rowspan="2">KLP</th><th rowspan="2">Mdadi</th><th rowspan="2">Cbr</th><th rowspan="2">Ibu2</th><th rowspan="2">5 Unsur</th><th rowspan="2">Msywrh</th></tr><tr><th>PUTRA</th><th>PUTRI</th></tr></thead><tbody><tr>${['masjid','aula','madrasah','jeding_l','jeding_p','sekolah','pondok'].map(k=>`<td>${numericCell(p,k)}</td>`).join('')}<td>${mubCell(group.mt)}</td><td>${mubCell(group.ms)}</td><td>${numericCell(p,'kamar_mt')}</td><td>${numericCell(p,'kamar_tamu')}</td>${['kegiatan_klp','kegiatan_mudadi','kegiatan_cbr','kegiatan_ibu','kegiatan_5unsur','kegiatan_mus'].map(k=>`<td>${shown(p[k])}</td>`).join('')}</tr></tbody></table>${p.kegiatan_lain?`<small>Kegiatan lain: ${safe(p.kegiatan_lain)}</small>`:''}<small>ANJURAN KAMAR MANDI PUTRA PUTRI TERPISAH, SEDANGKAN KAMAR MANDI PUTRI DAN TEMPAT WUDHUNYA KEADAAN TERTUTUP, DAN TEMPAT WUDHU PUTRI DIBERI CERMIN DAN TEMPAT CANTOLAN KERUDUNG.</small></section>`;
  const off=desa?officersFor('DESA',dp):group.officers,other=otherGrouped(off.lain,snapshot.genderMap||{});
  const roles=[['imam',desa?'IMAM DESA':'Kyai Kelompok'],['wakil',desa?'WAKIL DESA':'Wakil Kelompok'],['penerobos',desa?'PENEROBOS DESA':'Pnb Kelompok'],['muballigh',desa?'MUBALLIGH DESA':'Mubaligh Kelompok'],['ku',desa?'KU DESA':'KU Kelompok'],['aghnia',desa?"AGHNIYA' DESA":"Aghniya' Kelompok"]];
  const normalRoster=`<section class="pu-block"><table class="pu-excel-roster" data-pu-sheet="Laporan"><thead><tr>${roles.map(([,label])=>`<th>${label}</th>`).join('')}</tr></thead><tbody><tr>${roles.map(([k])=>`<td class="pu-left">${off[k]?.length?off[k].map(safe).join('<br>'):'—'}</td>`).join('')}</tr></tbody></table></section>`;
  const otherRows=(items,label)=>items.length?`<tr><th class="pu-left" colspan="4">KEPENGURUSAN LAIN · ${label}</th></tr>${Array.from({length:Math.ceil(items.length/4)},(_,i)=>`<tr>${Array.from({length:4},(_,c)=>{const x=items[c*Math.ceil(items.length/4)+i];return `<td class="pu-left">${x?`${safe(x.name)} — ${safe(x.role||'dapukan belum diisi')}`:''}</td>`}).join('')}</tr>`).join('')}`:'';
  const others=`<section class="pu-block"><table class="pu-excel-other" data-pu-sheet="Laporan"><tbody><tr><th colspan="4">KEPENGURUSAN LAIN</th></tr>${otherRows(other.L,'LAKI-LAKI')}${otherRows(other.P,'PEREMPUAN')}${otherRows(other.unknown,'JENIS KELAMIN BELUM TERDATA')}</tbody></table></section>`;
  const sign=off.imam?.[0]||'________________',pnb=off.penerobos?.[0]||'________________';
  return `<article class="pu-report pu-excel" id="pu-report"><h2>LAPORAN PENEROBOSAN UMUM</h2><div class="pu-sub">JUMLAH JAMAAH, PERSENAN ${desa?', KEGIATAN DAN KEPENGURUSAN DESA':'DAN KEGIATAN KELOMPOK'}</div><div class="pu-meta">${desa?`DESA: Perwira · DAERAH: Bekasi Timur`:`KELOMPOK: ${safe(names[s])} · DESA: Perwira · DAERAH: Bekasi Timur`} · BULAN: ${safe(titleMonth(period))} · DIISI ${desa?'DESA':'KELOMPOK'}</div>${main}${sarana}${normalRoster}${others}${notes.length?`<p class="pu-notes">CATATAN: ${notes.map(safe).join('; ')}.</p>`:''}<p class="pu-sign">Perwira, ${safe(titleMonth(period))}<br>Kyai ${level}: ${safe(sign)} &nbsp; &nbsp; Penerobos ${level}: ${safe(pnb)}</p></article>`;
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
function exportExcel(){
  if(!current)return alertMsg('Buat pratinjau dahulu.');
  if(typeof XLSX==='undefined')return alertMsg('Komponen Excel belum tersedia.');
  const sheet=XLSX.utils.aoa_to_sheet([['LAPORAN PENEROBOSAN UMUM'],[`${current.scope} · ${titleMonth(current.period)}`],[]]);
  const tables=el('pu-report').querySelectorAll('table[data-pu-sheet]');
  for(const table of tables){
    const row=XLSX.utils.decode_range(sheet['!ref']).e.r+2;
    XLSX.utils.sheet_add_dom(sheet,table,{origin:{r:row,c:0}});
  }
  const width=XLSX.utils.decode_range(sheet['!ref']).e.c+1;
  sheet['!cols']=Array.from({length:width},(_,i)=>({wch:i<2?15:8}));
  const book=XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(book,sheet,'Penerobosan Umum');
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
