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
const groupExtras=[['kamar_mt','Kamar MT','number'],['kamar_tamu','Kamar tamu','number'],['kegiatan_klp','Pengajian kelompok / minggu','text'],['kegiatan_mudadi','Muda-mudi / minggu','text'],['kegiatan_cbr','CBR / minggu','text'],['kegiatan_ibu','Ibu-ibu / minggu','text'],['kegiatan_5unsur','5 unsur','text'],['kegiatan_mus','Musyawarah','text']];
const desaExtras=[['kegiatan_desa','Pengajian desa / bulan','text'],['kegiatan_mudadi','Muda-mudi / bulan','text'],['kegiatan_ibu','Ibu-ibu / bulan','text'],['kegiatan_agnia','Agnia / bulan','text'],['kegiatan_mus','Musyawarah / bulan','text'],['kegiatan_organisasi','Organisasi / bulan','text']];
const officers=[['imam','Imam/Kyai'],['wakil','Wakil KI'],['penerobos','Penerobos'],['muballigh','Muballigh'],['ku','KU'],['aghnia','Agnia'],['lain','Kepengurusan lain']];
const officerPatterns={imam:/^KI (?:Desa|Kelompok)$/i,wakil:/^Wakil KI\b/i,penerobos:/^Penerobos\b/i,muballigh:/^(?:Muballigh|Mubaligh|Muballegh|MT)\b/i,ku:/\bKU\b/i,aghnia:/^(?:Agnia|Aghnia|Aghniya)\b/i};
let profiles={},history=[],mubCounts={},current=null,archiveView=null,busy=false,printCleanup=null;
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
#pu-print-sheet{display:none!important}
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
.pu-excel .pu-report-footer{display:flex;align-items:flex-start;justify-content:space-between;gap:22px;margin:12px 0 0;break-inside:avoid;page-break-inside:avoid}
.pu-excel .pu-report-footer .pu-notes{flex:1;min-width:0;font-size:12px;line-height:1.45;margin:0;text-align:left;overflow-wrap:anywhere}
.pu-excel .pu-report-footer .pu-notes strong{display:block;margin-bottom:4px}
.pu-excel .pu-report-footer .pu-signatures{flex:0 0 37%;margin:0}
.pu-excel .pu-sign{text-align:right;font-size:10px;margin:5px 0}
.pu-excel .pu-signatures{text-align:initial;margin:8px 0 0;font-size:11px;break-inside:avoid;page-break-inside:avoid}
.pu-excel .pu-signatures .pu-sign-place{text-align:right;margin-bottom:5px}
.pu-excel .pu-signatures .pu-sign-row{display:flex;justify-content:flex-end;gap:30px;text-align:center}
.pu-excel .pu-signatures .pu-sign-box{width:160px}
.pu-excel .pu-signatures .pu-sign-space{height:48px}
@media print{
  @page{size:A4 landscape;margin:6mm}
  body.pu-print-mode #pu-print-sheet{display:block!important}
  body.pu-print-mode #pu-print-sheet .pu-report.pu-excel{width:100%;max-width:none;min-width:0;font:7pt Arial,sans-serif}
  body.pu-print-mode #pu-print-sheet .pu-excel h2{font-size:15pt;line-height:1.1;margin:0 0 2px}
  body.pu-print-mode #pu-print-sheet .pu-excel .pu-sub{font-size:10pt;line-height:1.2;margin:1px 0}
  body.pu-print-mode #pu-print-sheet .pu-excel .pu-meta{font-size:9pt;line-height:1.2;margin:2px 0 5px}
  body.pu-print-mode #pu-print-sheet .pu-excel .pu-block{overflow:visible;margin:3px 0;break-inside:avoid}
  body.pu-print-mode #pu-print-sheet .pu-excel table{width:100%;table-layout:fixed;margin:0}
  body.pu-print-mode #pu-print-sheet .pu-excel th,body.pu-print-mode #pu-print-sheet .pu-excel td{padding:1px;line-height:1.08;font-size:6.5pt}
  body.pu-print-mode #pu-print-sheet .pu-excel .pu-excel-main th,body.pu-print-mode #pu-print-sheet .pu-excel .pu-excel-main td{font-size:5pt;padding:1px 0}
  body.pu-print-mode #pu-print-sheet .pu-excel small,body.pu-print-mode #pu-print-sheet .pu-excel .pu-notes{font-size:6pt;margin:2px 0}
  body.pu-print-mode #pu-print-sheet .pu-excel .pu-sign{font-size:7pt;margin:2px 0}
  body.pu-print-mode #pu-print-sheet .pu-excel tr{break-inside:avoid}
  body.pu-print-mode #pu-print-sheet :is(.pu-village,.pu-group) .pu-block{margin:8px 0}
  body.pu-print-mode #pu-print-sheet :is(.pu-village,.pu-group) .pu-excel-main col.pu-col-no{width:2.4%}
  body.pu-print-mode #pu-print-sheet :is(.pu-village,.pu-group) .pu-excel-main col.pu-col-kelompok{width:14%}
  body.pu-print-mode #pu-print-sheet :is(.pu-village,.pu-group) .pu-excel-main col.pu-col-angka{width:2.57%}
  body.pu-print-mode #pu-print-sheet :is(.pu-village,.pu-group) .pu-excel-main col.pu-col-persenan{width:9%}
  body.pu-print-mode #pu-print-sheet :is(.pu-village,.pu-group) .pu-excel-main th,
  body.pu-print-mode #pu-print-sheet :is(.pu-village,.pu-group) .pu-excel-main td{font-size:7.2pt;padding:3px 1px;line-height:1.18}
  body.pu-print-mode #pu-print-sheet :is(.pu-village,.pu-group) .pu-excel-main tbody td{height:18px}
  body.pu-print-mode #pu-print-sheet :is(.pu-village,.pu-group) .pu-excel-detail th,
  body.pu-print-mode #pu-print-sheet :is(.pu-village,.pu-group) .pu-excel-detail td,
  body.pu-print-mode #pu-print-sheet :is(.pu-village,.pu-group) .pu-excel-roster th,
  body.pu-print-mode #pu-print-sheet :is(.pu-village,.pu-group) .pu-excel-roster td,
  body.pu-print-mode #pu-print-sheet :is(.pu-village,.pu-group) .pu-excel-other th,
  body.pu-print-mode #pu-print-sheet :is(.pu-village,.pu-group) .pu-excel-other td{font-size:8.5pt;padding:3px 2px;line-height:1.2}
  body.pu-print-mode #pu-print-sheet :is(.pu-village,.pu-group) .pu-excel-detail tbody td{height:20px}
  body.pu-print-mode #pu-print-sheet :is(.pu-village,.pu-group) .pu-signatures{font-size:8.5pt;margin-top:4px;break-inside:avoid;page-break-inside:avoid}
  body.pu-print-mode #pu-print-sheet :is(.pu-village,.pu-group) .pu-signatures .pu-sign-space{height:28px}
  body.pu-print-mode #pu-print-sheet :is(.pu-village,.pu-group) .pu-excel-other th,
  body.pu-print-mode #pu-print-sheet :is(.pu-village,.pu-group) .pu-excel-other td{font-size:8.4pt;padding:1px 2px;line-height:1.1}
  body.pu-print-mode #pu-print-sheet :is(.pu-village,.pu-group) .pu-excel-other td{border-top:0;border-bottom:0}
  body.pu-print-mode #pu-print-sheet :is(.pu-village,.pu-group) .pu-excel-other tr:last-child td{border-bottom:1px solid #333}
  body.pu-print-mode #pu-print-sheet :is(.pu-village,.pu-group) .pu-excel-other{margin-bottom:0}
  body.pu-print-mode #pu-print-sheet .pu-group .pu-excel-main col.pu-col-angka{width:2.65%}
  body.pu-print-mode #pu-print-sheet .pu-village .pu-block{margin:6px 0}
  body.pu-print-mode #pu-print-sheet .pu-village .pu-excel-other th{font-size:8.6pt}
  body.pu-print-mode #pu-print-sheet .pu-village .pu-excel-main th{font-size:7.6pt}
  body.pu-print-mode #pu-print-sheet .pu-village .pu-excel-main td{font-size:8.8pt;padding:3px 1px;line-height:1.2}
  body.pu-print-mode #pu-print-sheet .pu-village .pu-excel-main tbody td{height:22px}
  body.pu-print-mode #pu-print-sheet .pu-village .pu-excel-main td.pu-left{font-size:9.5pt;font-weight:600}
  body.pu-print-mode #pu-print-sheet .pu-village .pu-excel-detail th{font-size:9pt}
  body.pu-print-mode #pu-print-sheet .pu-group .pu-block{margin:12px 0}
  body.pu-print-mode #pu-print-sheet .pu-group .pu-excel-main th{font-size:8pt;padding:4px 1px;line-height:1.18}
  body.pu-print-mode #pu-print-sheet .pu-group .pu-excel-main td{font-size:9.2pt;padding:5px 1px;line-height:1.25;overflow-wrap:anywhere}
  body.pu-print-mode #pu-print-sheet .pu-group .pu-excel-main tbody td{height:28px}
  body.pu-print-mode #pu-print-sheet .pu-group .pu-excel-main td.pu-left{font-size:9.8pt;font-weight:600}
  body.pu-print-mode #pu-print-sheet .pu-group .pu-excel-detail th{font-size:9.5pt;padding:5px 3px;line-height:1.2}
  body.pu-print-mode #pu-print-sheet .pu-group .pu-excel-detail td{font-size:10pt;padding:5px 3px;line-height:1.25;overflow-wrap:anywhere}
  body.pu-print-mode #pu-print-sheet .pu-group .pu-excel-detail tbody td{height:30px}
  body.pu-print-mode #pu-print-sheet .pu-group .pu-excel-roster th{font-size:10pt;padding:5px 3px}
  body.pu-print-mode #pu-print-sheet .pu-group .pu-excel-roster td{font-size:10pt;padding:6px 4px;line-height:1.35;overflow-wrap:anywhere}
  body.pu-print-mode #pu-print-sheet .pu-group .pu-excel-other th{font-size:10pt;padding:3px 4px}
  body.pu-print-mode #pu-print-sheet .pu-group .pu-excel-other td{font-size:10pt;padding:3px 4px;line-height:1.2;overflow-wrap:anywhere}
  body.pu-print-mode #pu-print-sheet .pu-group .pu-signatures{font-size:10pt;margin-top:12px}
  body.pu-print-mode #pu-print-sheet .pu-group .pu-signatures .pu-sign-space{height:44px}
  body.pu-print-mode #pu-print-sheet .pu-report-footer{margin-top:9px;gap:12px;break-inside:avoid;page-break-inside:avoid}
  body.pu-print-mode #pu-print-sheet .pu-report-footer .pu-notes{font-size:9pt;line-height:1.3;margin:0}
  body.pu-print-mode #pu-print-sheet .pu-report-footer .pu-signatures{margin:0;flex-basis:38%}
  body.pu-print-mode #pu-print-sheet .pu-report-footer .pu-signatures .pu-sign-box{width:44%}
  body.pu-print-mode #pu-print-sheet .pu-report-footer .pu-signatures .pu-sign-row{gap:10px}
  /* Ruang cetak Android lebih pendek; rapatkan jarak tanpa mengubah tabel desktop. */
  body.pu-print-mode #pu-print-sheet.pu-print-mobile .pu-excel h2{font-size:13pt;margin:0}
  body.pu-print-mode #pu-print-sheet.pu-print-mobile .pu-excel .pu-sub{font-size:9pt;margin:0}
  body.pu-print-mode #pu-print-sheet.pu-print-mobile .pu-excel .pu-meta{font-size:8pt;margin:0 0 2px}
  body.pu-print-mode #pu-print-sheet.pu-print-mobile .pu-excel .pu-block{margin:2px 0}
  body.pu-print-mode #pu-print-sheet.pu-print-mobile .pu-excel .pu-signatures{font-size:8pt;margin:2px 0 0}
  body.pu-print-mode #pu-print-sheet.pu-print-mobile .pu-excel .pu-signatures .pu-sign-space{height:18px}
  body.pu-print-mode #pu-print-sheet.pu-print-mobile .pu-report-footer .pu-notes{font-size:8.5pt;line-height:1.25}
  body.pu-print-mode #pu-print-sheet.pu-print-mobile .pu-report-footer .pu-signatures{margin:0}
  body.pu-print-mode #pu-print-sheet.pu-print-mobile .pu-village .pu-excel-main th{font-size:7.2pt;padding:2px 1px}
  body.pu-print-mode #pu-print-sheet.pu-print-mobile .pu-village .pu-excel-main td{font-size:8pt;padding:2px 1px;line-height:1.08}
  body.pu-print-mode #pu-print-sheet.pu-print-mobile .pu-village .pu-excel-main tbody td{height:18px}
  body.pu-print-mode #pu-print-sheet.pu-print-mobile .pu-village .pu-excel-main td.pu-left{font-size:8.5pt}
  body.pu-print-mode #pu-print-sheet.pu-print-mobile .pu-village .pu-excel-detail th,
  body.pu-print-mode #pu-print-sheet.pu-print-mobile .pu-village .pu-excel-detail td{font-size:8pt;padding:2px 1px;line-height:1.08}
  body.pu-print-mode #pu-print-sheet.pu-print-mobile .pu-village .pu-excel-detail tbody td{height:17px}
  body.pu-print-mode #pu-print-sheet.pu-print-mobile .pu-village .pu-excel-roster th,
  body.pu-print-mode #pu-print-sheet.pu-print-mobile .pu-village .pu-excel-roster td{font-size:8pt;padding:2px;line-height:1.1}
  body.pu-print-mode #pu-print-sheet.pu-print-mobile .pu-village .pu-excel-other th,
  body.pu-print-mode #pu-print-sheet.pu-print-mobile .pu-village .pu-excel-other td{font-size:7.6pt;padding:0 1px;line-height:1.04}
  body.pu-print-mode #pu-print-sheet.pu-print-mobile .pu-group .pu-excel-main td{padding:3px 1px;line-height:1.15}
  body.pu-print-mode #pu-print-sheet.pu-print-mobile .pu-group .pu-excel-main tbody td{height:22px}
  body.pu-print-mode #pu-print-sheet.pu-print-mobile .pu-group .pu-excel-detail th,
  body.pu-print-mode #pu-print-sheet.pu-print-mobile .pu-group .pu-excel-detail td{padding:3px 2px;line-height:1.15}
  body.pu-print-mode #pu-print-sheet.pu-print-mobile .pu-group .pu-excel-detail tbody td{height:24px}
  body.pu-print-mode #pu-print-sheet.pu-print-mobile .pu-group .pu-excel-roster td{padding:3px 2px;line-height:1.2}
  body.pu-print-mode #pu-print-sheet.pu-print-mobile .pu-group .pu-excel-other th,
  body.pu-print-mode #pu-print-sheet.pu-print-mobile .pu-group .pu-excel-other td{padding:1px 2px;line-height:1.1}
}`;
document.body.append(reportStyle);
const mobileStyle=document.createElement('style');
mobileStyle.textContent=`@media screen and (max-width:1024px){
  .pu-panel{padding:10px}
  .pu-preview{overflow:visible}
  .pu-report.pu-excel{width:100%;max-width:none;font-size:12px}
  .pu-excel h2{font-size:17px;line-height:1.2}
  .pu-excel .pu-sub,.pu-excel .pu-meta{font-size:11px;line-height:1.35}
  .pu-excel .pu-block{max-width:100%;overflow-x:auto;overflow-y:hidden;-webkit-overflow-scrolling:touch;overscroll-behavior-inline:contain;border:1px solid #d5ded5;border-radius:5px;margin:12px 0}
  .pu-excel .pu-block::before{content:'Geser tabel ke samping →';display:block;position:sticky;left:0;width:max-content;padding:4px 7px;color:#3c664a;background:#eaf4e9;font-size:11px;font-weight:600;z-index:5}
  .pu-excel .pu-excel-main{width:1403px;min-width:1403px;font-size:10px}
  .pu-excel .pu-excel-main col.pu-col-no{width:36px}
  .pu-excel .pu-excel-main col.pu-col-kelompok{width:155px}
  .pu-excel .pu-excel-main col.pu-col-angka{width:38px}
  .pu-excel .pu-excel-main col.pu-col-persenan{width:110px}
  .pu-excel .pu-excel-main th{font-size:9px;line-height:1.2;overflow-wrap:normal;word-break:normal;padding:5px 2px}
  .pu-excel .pu-excel-main td{font-size:10px;line-height:1.25;white-space:nowrap;overflow-wrap:normal;padding:6px 2px}
  .pu-excel .pu-excel-main td.pu-left{font-size:11px;white-space:normal;overflow-wrap:normal;word-break:normal}
  .pu-village .pu-excel-main thead tr:first-child th:first-child,.pu-village .pu-excel-main tbody td:first-child{position:sticky;left:0;background:#edf5e8;z-index:2}
  .pu-village .pu-excel-main thead tr:first-child th:nth-child(2),.pu-village .pu-excel-main tbody tr:not(.pu-total) td:nth-child(2){position:sticky;left:36px;background:#fff;z-index:2}
  .pu-village .pu-excel-main thead tr:first-child th:nth-child(2){background:#d9e8cf}
  .pu-village .pu-excel-main tbody .pu-total td:first-child{background:#edf5ed}
  .pu-group .pu-excel-main thead tr:first-child th:first-child,.pu-group .pu-excel-main tbody td:first-child{position:sticky;left:0;background:#fff;z-index:2}
  .pu-group .pu-excel-main thead tr:first-child th:first-child{background:#d9e8cf}
  .pu-excel .pu-excel-detail{width:1000px;min-width:1000px;font-size:11px}
  .pu-excel .pu-excel-detail th,.pu-excel .pu-excel-detail td{font-size:11px;padding:6px 4px;overflow-wrap:normal;word-break:normal}
  .pu-excel .pu-excel-roster,.pu-excel .pu-excel-other{width:760px;min-width:760px;font-size:11px}
  .pu-excel .pu-excel-roster th,.pu-excel .pu-excel-roster td,.pu-excel .pu-excel-other th,.pu-excel .pu-excel-other td{font-size:11px;line-height:1.35;padding:6px 5px;overflow-wrap:normal;word-break:normal}
  .pu-excel .pu-signatures{font-size:11px}
  #pu-editor-dialog{width:100%;padding:12px;overflow-x:hidden;box-sizing:border-box}
  #pu-editor-dialog table{min-width:0}
}`;
document.body.append(mobileStyle);
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
  const entries=(aPengurus||[]).filter(p=>p.aktif!==false&&p.level===lv&&(g==='DESA'||p.kelompok_nama===g)&&!/^MS\b/i.test(p.dapukan||''));
  const other=code==='lain';
  const selected=entries.filter(p=>other?!Object.values(officerPatterns).some(pattern=>pattern.test(p.dapukan||'')):officerPatterns[code]?.test(p.dapukan||''));
  const byDid=new Map();
  for(const p of selected){
    const name=p.jamaah_desa?.nama||aJamaahDesa.find(j=>j.did===p.did)?.nama||'';
    if(!name||!p.did)continue;
    const did=String(p.did);
    if(!byDid.has(did))byDid.set(did,{name,roles:[]});
    const roles=byDid.get(did).roles,role=String(p.dapukan||'dapukan belum diisi').trim();
    if(other&&!roles.some(x=>x.toLocaleLowerCase('id-ID')===role.toLocaleLowerCase('id-ID')))roles.push(role);
  }
  return [...byDid.values()].map(x=>other?`${x.name} (${x.roles.join('; ')})`:x.name);
}
function officersFor(g,p){
  const o={};for(const [k] of officers){const value=[p['nama_'+k],k==='muballigh'?p.nama_mt:''].filter(Boolean).join('\n');o[k]=[...new Set([...roster(g,k),...value.split(/\n|;/).map(x=>x.trim()).filter(Boolean)])];}
  return o;
}
function pengurus4S(label){
  // Semua dapukan KU (termasuk KU Pembangunan, Penulis/Pencatat KU) masuk 4S.
  return /\b(?:KI|Penerobos|KU|Agnia|Aghnia|Aghniya)\b/i.test(String(label||''));
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
  const pengurus=(aPengurus||[]).filter(x=>x.aktif!==false&&x.level==='kelompok'&&x.kelompok_nama===g&&x.did&&!/^MS\b/i.test(x.dapukan||''));
  const semua=new Set(pengurus.map(x=>String(x.did)));
  const empatS=new Set(pengurus.filter(x=>pengurus4S(x.dapukan)).map(x=>String(x.did)));
  r.pengurus4s=empatS.size;
  r.pengurus_lain=[...semua].filter(did=>!empatS.has(did)).length;
  r.pengurus=semua.size;
  const mub=mubCounts[g];
  r.mt=new Set(pengurus.filter(x=>/^MT Kelompok$/i.test(String(x.dapukan||'').trim())).map(x=>String(x.did))).size;
  r.ms=mub?number(mub.ms):null;
  r.muballigh_belum_isi=mub?.belum_isi??null;
  r.officers=officersFor(g,p);
  return r;
}
function statusFor(rows){const missing=rows.reduce((n,r)=>n+r.missing,0);let notes=[];
  if(missing)notes.push(`${missing} jamaah belum memiliki tanggal lahir, jenis kelamin, atau status nikah lengkap; belum masuk kolom klasifikasi`);
  for(const r of rows){if(r.members!==r.total.L+r.total.P)notes.push(`${r.scope}: ${r.members-r.total.L-r.total.P} jenis kelamin kosong`);}
  for(const r of rows){if(r.muballigh_belum_isi===null)notes.push(`${r.scope}: status MS sensus daerah belum dimuat`);else if(r.muballigh_belum_isi>0)notes.push(`${r.scope}: ${r.muballigh_belum_isi} jamaah belum mengisi status muballigh sensus daerah; jumlah MS berdasarkan data yang sudah diisi`);}
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
  const mtDesa=new Set((aPengurus||[]).filter(x=>x.aktif!==false&&x.did&&/^MT (?:Desa|Kelompok)$/i.test(String(x.dapukan||'').trim())).map(x=>String(x.did))).size;
  const genderMap={};for(const j of aJamaahDesa||[]){const k=String(j.nama||'').trim().toLocaleLowerCase('id-ID');if(k)genderMap[k]=normGender(j.jenis_kelamin)||'unknown';}
  return {scope:s,period,rows,wakilDesa,mtDesa,genderMap,profiles:JSON.parse(JSON.stringify(profiles)),created:new Date().toISOString(),notes};
}
function editCell(value,g,kind,key,gender=''){return `<td data-pu-edit="${kind}" data-pu-scope="${g}" data-pu-key="${key}" data-pu-gender="${gender}">${value}</td>`;}
function n2(b,g,k){const l=number(b?.L)||0,p=number(b?.P)||0;if(!g)return `<td>${l}</td><td>${p}</td><td>${l+p}</td>`;return editCell(l,g,'jamaah',k,'L')+editCell(p,g,'jamaah',k,'P')+editCell(l+p,g,'jamaah',k);}
function categoryHead(){return ['Balita','CBR / PAUD - SD','Pra Remaja','Remaja','Usia Nikah','Dewasa','Total Jamaah'].map(c=>`<th colspan="3">${c}</th>`).join('');}
function categorySub(){return Array(7).fill('<th>L</th><th>P</th><th>J</th>').join('');}
function totals(rows){const t={};for(const k of ['balita','cbr','pra','remaja','usia','dewasa','total'])t[k]={L:0,P:0};
  for(const k of ['balita','cbr','pra','remaja','usia','dewasa','total']){t[k].L=rows.reduce((n,r)=>n+r[k].L,0);t[k].P=rows.reduce((n,r)=>n+r[k].P,0);}return t;
}
function numericCell(p,k){return p[k]===undefined||p[k]===''?'—':fmt(number(p[k]));}
function mubCell(value){return value===null||value===undefined?'—':number(value)||0;}
function listCell(x){return Array.isArray(x)&&x.length?x.map(safe).join('<br>'):'—';}
function groupDisplayName(scope,name){const m=String(scope).match(/^PW([1-4])$/);return m?`Klp ${m[1]} ${name}`:name;}
function titleMonth(period){const [y,m]=period.split('-').map(Number);return `${NAMA_BULAN[m-1]} ${y}`;}
function sumProfile(rows,k){return rows.every(r=>r.profile[k]!==undefined&&r.profile[k]!=='')?fmt(rows.reduce((n,r)=>n+(number(r.profile[k])||0),0)):'—';}
function sumKnownProfile(rows,k){const filled=rows.map(r=>r.profile?.[k]).filter(v=>v!==undefined&&v!==null&&v!=='');return filled.length?fmt(filled.reduce((n,v)=>n+(number(v)||0),0)):'—';}
function shortRole(label){return String(label||'dapukan belum diisi')
  .replace(/\bKoordinator\b/gi,'Koord.')
  .replace(/\bSekretaris\b/gi,'Sekr.')
  .replace(/\bBendahara\b/gi,'Bend.')
  .replace(/\bWakil\b/gi,'Wk.')
  .replace(/\bKetua\b/gi,'Ket.')
  .replace(/\bKelompok\b/gi,'Klp.')
  .replace(/\bPembangunan\b/gi,'Pemb.')
  .replace(/\bDesa\b/gi,'Ds.');
}
function signatureDate(){return new Intl.DateTimeFormat('id-ID',{day:'numeric',month:'long',year:'numeric',timeZone:'Asia/Jakarta'}).format(new Date());}
function otherGrouped(items,genderMap){
  const maps={L:new Map(),P:new Map(),unknown:new Map()};
  const knownNames=Object.keys(genderMap).sort((a,b)=>b.length-a.length);
  for(const item of items||[]){
    // Nama jamaah dapat memiliki panggilan dalam kurung, misalnya "Hanantirmi (Temy)".
    // Cocokkan nama lengkap lebih dulu agar kurung panggilan tidak terbaca sebagai dapukan.
    const lower=item.toLocaleLowerCase('id-ID');
    const matched=knownNames.find(key=>lower.startsWith(key+' ('));
    const name=(matched?item.slice(0,matched.length):item.replace(/ \([^()]*\)$/,'')).trim();
    if(!name)continue;
    const role=item.slice(name.length).replace(/^\s*\(|\)$/g,'').trim();
    const key=name.toLocaleLowerCase('id-ID'),gender=genderMap[key]||'unknown';
    if(!maps[gender].has(key))maps[gender].set(key,{name,roles:[]});
    const roles=maps[gender].get(key).roles;
    for(const part of role.split(';').map(x=>x.trim()).filter(Boolean)){
      if(!roles.some(x=>x.toLocaleLowerCase('id-ID')===part.toLocaleLowerCase('id-ID')))roles.push(part);
    }
  }
  const groups={};
  for(const [gender,map] of Object.entries(maps))groups[gender]=[...map.values()]
    .map(x=>({name:x.name,role:x.roles.join(', ')}))
    .sort((a,b)=>a.name.localeCompare(b.name,'id-ID'));
  return groups;
}
function render(snapshot){
  const {scope:s,period,rows,profiles:ps}=snapshot,desa=s==='DESA',dp=ps.DESA||{},t=totals(rows),group=rows[0],p=group.profile||{},notes=snapshot.notes||[];
  const level=desa?'Desa':'Kelompok';
  const categories=[['balita','BALITA'],['cbr','CBR / PAUD - SD'],['pra','PRA REMAJA'],['remaja','REMAJA'],['usia','USIA NIKAH'],['dewasa','DEWASA'],['total',desa?'TOTAL JAMAAH':'TOTAL JIWA JAMAAH']];
  const mainRow=(r,i)=>`<tr>${desa?`<td>${i+1}</td>`:''}<td class="pu-left" data-pu-edit="jamaah" data-pu-scope="${r.scope}" data-pu-key="total">${safe(groupDisplayName(r.scope,r.nama))}</td>${categories.map(([k])=>n2(r[k],r.scope,k)).join('')}${editCell(number(r.janda)||0,r.scope,'jamaah','janda')}${['janda_btn','janda_trangan','sub'].map(k=>editCell(numericCell(r.profile,k),r.scope,'profile',k)).join('')}${editCell(number(r.kk)||0,r.scope,'jamaah','kk')}${['4s','lain','semua'].map((k,i)=>editCell(number(r[['pengurus4s','pengurus_lain','pengurus'][i]])||0,r.scope,'pengurus',k)).join('')}${editCell(numericCell(r.profile,'persenan'),r.scope,'profile','persenan')}</tr>`;
  const totalRow=desa?`<tr class="pu-total"><td colspan="2">JUMLAH</td>${categories.map(([k])=>n2(t[k])).join('')}<td>${sum(rows,'janda')}</td><td>${sumProfile(rows,'janda_btn')}</td><td>${sumProfile(rows,'janda_trangan')}</td><td>${sumProfile(rows,'sub')}</td><td>${sum(rows,'kk')}</td><td>${sum(rows,'pengurus4s')}</td><td>${sum(rows,'pengurus_lain')}</td><td>${sum(rows,'pengurus')}</td><td>${sumProfile(rows,'persenan')}</td></tr>`:'';
  const main=`<section class="pu-block"><table class="pu-excel-main" data-pu-sheet="Laporan">${desa?`<colgroup><col class="pu-col-no"><col class="pu-col-kelompok">${Array(29).fill('<col class="pu-col-angka">').join('')}<col class="pu-col-persenan"></colgroup>`:`<colgroup><col class="pu-col-kelompok">${Array(29).fill('<col class="pu-col-angka">').join('')}<col class="pu-col-persenan"></colgroup>`}<thead><tr>${desa?'<th rowspan="3">NO</th>':''}<th rowspan="3">KELOMPOK</th><th colspan="21">JUMLAH JAMAAH</th><th colspan="3">JANDA</th><th rowspan="3">SUB</th><th rowspan="3">KK</th><th colspan="3">JUMLAH PENGURUS</th><th rowspan="3">PERSENAN</th></tr><tr>${categories.map(([,label])=>`<th colspan="3">${label}</th>`).join('')}<th rowspan="2">JML</th><th colspan="2">SIAP DIWAYUH</th><th rowspan="2">4-S</th><th rowspan="2">LAIN</th><th rowspan="2">JML</th></tr><tr>${categories.map(()=>'<th>L</th><th>P</th><th>J</th>').join('')}<th>BTN</th><th>TR-AN</th></tr></thead><tbody>${rows.map(mainRow).join('')}${totalRow}</tbody></table></section>`;
  const countMT=snapshot.mtDesa??sum(rows,'mt'),countMS=rows.every(r=>r.ms!==null)?sum(rows,'ms'):'—';
  const sarana=desa?`<section class="pu-block"><table class="pu-excel-detail" data-pu-sheet="Laporan"><thead><tr><th colspan="13">JUMLAH</th><th colspan="6">JUMLAH PENGAJIAN / BULAN</th></tr><tr><th rowspan="2">WAKIL DESA</th><th rowspan="2">KELOMPOK</th><th rowspan="2">SUB</th><th rowspan="2">KK</th><th rowspan="2">Masjid</th><th colspan="2">Jeding</th><th rowspan="2">Aula</th><th rowspan="2">Madrasah</th><th rowspan="2">Pondok</th><th rowspan="2">Sekolah</th><th rowspan="2">MT</th><th rowspan="2">MS</th><th rowspan="2">Desa</th><th rowspan="2">Muda-di</th><th rowspan="2">Ibu-ibu</th><th rowspan="2">Agnia</th><th rowspan="2">Muswrh</th><th rowspan="2">Org.</th></tr><tr><th>L</th><th>P</th></tr></thead><tbody><tr>${editCell(number(snapshot.wakilDesa)||0,'DESA','pengurus','wakil')}<td>${GROUPS.length}</td><td>${sumProfile(rows,'sub')}</td><td>${sum(rows,'kk')}</td>${['masjid','jeding_l','jeding_p','aula','madrasah','pondok','sekolah'].map(k=>`<td>${sumKnownProfile(rows,k)}</td>`).join('')}<td>${countMT}</td><td title="Status MS diperbaiki di Sensus Jamaah Daerah">${countMS}</td>${['kegiatan_desa','kegiatan_mudadi','kegiatan_ibu','kegiatan_agnia','kegiatan_mus','kegiatan_organisasi'].map(k=>editCell(shown(dp[k]),'DESA','profile',k)).join('')}</tr></tbody></table></section>`:
  `<section class="pu-block"><table class="pu-excel-detail" data-pu-sheet="Laporan"><thead><tr><th colspan="11">SARANA DAN PRASARANA</th><th colspan="6">KEGIATAN KELOMPOK / MINGGU</th></tr><tr><th rowspan="2">MASJID</th><th rowspan="2">AULA</th><th rowspan="2">MADRASAH</th><th colspan="2">JEDING</th><th rowspan="2">SEKOLAH</th><th rowspan="2">PONDOK</th><th rowspan="2">MT</th><th rowspan="2">MS</th><th rowspan="2">KAMAR MT</th><th rowspan="2">KAMAR TAMU</th><th rowspan="2">KLP</th><th rowspan="2">Mdadi</th><th rowspan="2">Cbr</th><th rowspan="2">Ibu2</th><th rowspan="2">5 Unsur</th><th rowspan="2">Msywrh</th></tr><tr><th>PUTRA</th><th>PUTRI</th></tr></thead><tbody><tr>${['masjid','aula','madrasah','jeding_l','jeding_p','sekolah','pondok'].map(k=>editCell(numericCell(p,k),s,'profile',k)).join('')}${editCell(mubCell(group.mt),s,'pengurus','mt')}<td title="Status MS diperbaiki di Sensus Jamaah Daerah">${mubCell(group.ms)}</td>${editCell(numericCell(p,'kamar_mt'),s,'profile','kamar_mt')}${editCell(numericCell(p,'kamar_tamu'),s,'profile','kamar_tamu')}${['kegiatan_klp','kegiatan_mudadi','kegiatan_cbr','kegiatan_ibu','kegiatan_5unsur','kegiatan_mus'].map(k=>editCell(shown(p[k]),s,'profile',k)).join('')}</tr></tbody></table></section>`;
  const off=desa?officersFor('DESA',dp):group.officers,other=otherGrouped(off.lain,snapshot.genderMap||{});
  const roles=[['imam',desa?'IMAM DESA':'Kyai Kelompok'],['wakil',desa?'WAKIL DESA':'Wakil Kelompok'],['penerobos',desa?'PENEROBOS DESA':'Pnb Kelompok'],['muballigh',desa?'MUBALLIGH DESA':'Mubaligh Kelompok'],['ku',desa?'KU DESA':'KU Kelompok'],['aghnia',desa?'AGNIA DESA':'Agnia Kelompok']];
  const normalRoster=`<section class="pu-block"><table class="pu-excel-roster" data-pu-sheet="Laporan"><thead><tr>${roles.map(([,label])=>`<th>${label}</th>`).join('')}</tr></thead><tbody><tr>${roles.map(([k])=>`<td class="pu-left" data-pu-edit="pengurus" data-pu-scope="${s}" data-pu-key="${k}">${off[k]?.length?off[k].map(safe).join('<br>'):'—'}</td>`).join('')}</tr></tbody></table></section>`;
  const otherRows=(items,label)=>items.length?`<tr><th class="pu-left" colspan="4">KEPENGURUSAN LAIN · ${label}</th></tr>${Array.from({length:Math.ceil(items.length/4)},(_,i)=>`<tr>${Array.from({length:4},(_,c)=>{const x=items[c*Math.ceil(items.length/4)+i];return `<td class="pu-left" data-pu-edit="pengurus" data-pu-scope="${s}" data-pu-key="lain">${x?`${safe(x.name)} — ${safe(shortRole(x.role))}`:''}</td>`}).join('')}</tr>`).join('')}`:'';
  const others=`<section class="pu-block"><table class="pu-excel-other" data-pu-sheet="Laporan"><tbody><tr><th colspan="4" data-pu-edit="pengurus" data-pu-scope="${s}" data-pu-key="lain">KEPENGURUSAN LAIN</th></tr>${otherRows(other.L,'LAKI-LAKI')}${otherRows(other.P,'PEREMPUAN')}${otherRows(other.unknown,'JENIS KELAMIN BELUM TERDATA')}</tbody></table></section>`;
  const sign=off.imam?.[0]||'________________';
  const reportSign=`<div class="pu-sign pu-signatures"><div class="pu-sign-place">Bekasi, ${safe(signatureDate())}</div><div class="pu-sign-row"><div class="pu-sign-box"><div>KI ${level}</div><div class="pu-sign-space"></div><div class="pu-sign-name">${safe(sign)}</div></div><div class="pu-sign-box"><div>Penerobos ${level}</div><div class="pu-sign-space"></div><div class="pu-sign-name">&nbsp;</div></div></div></div>`;
  const reportNote=desa?'':`<div class="pu-notes"><strong>CATATAN :</strong><div>ANJURAN KAMAR MANDI PUTRA PUTRI TERPISAH, SEDANGKAN KAMAR MANDI PUTRI DAN TEMPAT WUDHUNYA KEADAAN TERTUTUP, DAN TEMPAT WUDHU PUTRI DIBERI CERMIN DAN TEMPAT CANTOLAN KERUDUNG.</div></div>`;
  return `<article class="pu-report pu-excel${desa?' pu-village':' pu-group'}" id="pu-report"><h2>LAPORAN PENEROBOSAN UMUM</h2><div class="pu-sub">JUMLAH JAMAAH, PERSENAN ${desa?', KEGIATAN DAN KEPENGURUSAN DESA':'DAN KEGIATAN KELOMPOK'}</div><div class="pu-meta">${desa?`DESA: Perwira · DAERAH: Bekasi Timur`:`KELOMPOK: ${safe(groupDisplayName(s,names[s]))} · DESA: Perwira · DAERAH: Bekasi Timur`} · BULAN: ${safe(titleMonth(period))} · DIISI ${desa?'DESA':'KELOMPOK'}</div>${main}${sarana}${normalRoster}${others}<div class="pu-report-footer">${reportNote}${reportSign}</div></article>`;
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
  let html=`<div class="pu-form-section"><h4>Profil ${safe(names[s])}</h4><p>Kolom kosong akan tampil sebagai “—” di laporan. Jumlah Wakil KI, pengurus 4 S, dan MT dihitung dari dapukan aktif; MS dari status sensus jamaah daerah. Kepengurusan lain juga ditampilkan otomatis bersama dapukannya.</p><div class="pu-profile-grid">${fields(s==='DESA'?desaExtras:common,p)}</div></div>`;
  if(s==='DESA')html+=`<div class="pu-form-section"><h4>Sarana desa</h4><p>Jumlah masjid, jeding, aula, madrasah, pondok, dan sekolah otomatis dijumlahkan dari profil kelompok yang sudah diisi.</p></div>`;
  else html+=`<div class="pu-form-section"><h4>Sarana dan kegiatan kelompok</h4><div class="pu-profile-grid">${fields(facilities.concat(groupExtras),p)}</div></div>`;
  html+=`<div class="pu-form-section"><h4>Nama pengurus</h4><p>MT yang bertugas tercantum bersama Muballigh desa atau kelompok sesuai dapukannya; MS tidak otomatis menjadi pengurus. Nama tambahan yang belum ada di daftar pengurus dapat ditulis per baris.</p><div class="pu-profile-grid">${officers.map(([key,label])=>`<label>${label}<textarea data-pu="nama_${key}" placeholder="Otomatis: ${safe(roster(s,key).join(', '))}">${safe([p['nama_'+key],key==='muballigh'?p.nama_mt:''].filter(Boolean).join('\n'))}</textarea></label>`).join('')}</div></div><button type="button" onclick="puSaveProfile()">💾 Simpan profil ${safe(names[s])}</button> <button type="button" onclick="puCloseProfile()">Tutup</button>`;
  el('pu-profile').innerHTML=html+'<div id="pu-profile-status" role="status"></div>';el('pu-profile').dataset.scope=s;el('pu-profile').hidden=false;
}
async function token(){if(!DK_ATT_TOKEN)await dkAttendanceAuthenticate();if(!DK_ATT_TOKEN)throw new Error('Masuk kembali sebagai pengurus untuk menyimpan.');return DK_ATT_TOKEN;}
async function saveProfile(){const box=el('pu-profile');if(box.hidden||busy)return;busy=true;try{
  const s=box.dataset.scope,data={...(profiles[s]||{})};if(!s||scope()!==s)throw new Error('Cakupan profil berubah. Buka kembali profil kelompok/desa yang ingin disimpan.');for(const input of box.querySelectorAll('[data-pu]')){const key=input.dataset.pu;if(input.type==='number'){if(input.value!==''&&(!Number.isInteger(Number(input.value))||Number(input.value)<0))throw new Error('Isi angka bulat yang tidak negatif: '+key);data[key]=input.value===''?'':Number(input.value);}else data[key]=input.value.trim();}
  const {data:res,error}=await sb.rpc('dashboard_penerobosan_save',{p_token:await token(),p_scope:s,p_rincian:data});if(error||!res?.ok)throw new Error(error?.message||res?.error||'Gagal menyimpan profil');
  const {data:stored,error:readError}=await sb.from('ubnb_penerobosan_profil').select('rincian').eq('scope_key',s).single();
  if(readError||!stored?.rincian||Object.keys(data).some(k=>stored.rincian[k]!==data[k]))throw new Error(readError?.message||'Profil belum terverifikasi tersimpan. Coba simpan kembali.');
  profiles[s]=stored.rincian;box.hidden=true;refresh();alertMsg('Profil '+names[s]+' tersimpan dan terverifikasi.');
 }catch(e){alertMsg(e.message);const status=el('pu-profile-status');if(status)status.textContent=e.message;}finally{busy=false;}}
async function archive(){if(!canEdit()||busy)return;busy=true;try{
  const snap=compute(),existing=history.find(h=>h.scope_key===snap.scope&&h.periode===snap.period);
  if(snap.notes.length&&!confirm('Ada data sensus yang belum lengkap. Simpan laporan dengan catatan tersebut?'))return;
  if(existing&&!confirm('Laporan '+titleMonth(snap.period)+' sudah tersimpan. Perbarui arsip periode tersebut?'))return;
  const {data,error}=await sb.rpc('dashboard_penerobosan_archive',{p_token:await token(),p_scope:snap.scope,p_periode:snap.period,p_snapshot:snap});
  if(error||!data?.ok)throw new Error(error?.message||data?.error||'Gagal menyimpan laporan');
  await reload();refresh();alertMsg('Laporan '+titleMonth(snap.period)+' tersimpan.');
 }catch(e){alertMsg(e.message);}finally{busy=false;}}
function loadExcelWriter(){
  if(window.ExcelJS)return Promise.resolve(window.ExcelJS);
  return new Promise((resolve,reject)=>{
    let script=document.getElementById('pu-excel-writer');
    if(!script){
      script=document.createElement('script');
      script.id='pu-excel-writer';
      script.src='https://cdn.jsdelivr.net/npm/exceljs@4.4.0/dist/exceljs.min.js';
      document.head.appendChild(script);
    }
    script.addEventListener('load',()=>window.ExcelJS?resolve(window.ExcelJS):reject(new Error('Komponen format Excel belum siap')),{once:true});
    script.addEventListener('error',()=>reject(new Error('Gagal memuat komponen format Excel')),{once:true});
  });
}
async function exportExcel(){
  if(!current)return alertMsg('Buat pratinjau dahulu.');
  try{
    const ExcelJS=await loadExcelWriter(),book=new ExcelJS.Workbook();
    const sheet=book.addWorksheet('Penerobosan Umum',{pageSetup:{paperSize:9,orientation:'landscape',fitToPage:true,fitToWidth:1,fitToHeight:1,margins:{left:0.2,right:0.2,top:0.25,bottom:0.25,header:0.1,footer:0.1}}});
    sheet.views=[{state:'normal',showGridLines:false}];
    sheet.properties.defaultRowHeight=14;
    for(let i=1;i<=35;i++)sheet.getColumn(i).width=4.3;
    const green={type:'pattern',pattern:'solid',fgColor:{argb:current.scope==='DESA'?'FFDDEBF7':'FFC6E0B4'}};
    const pale={type:'pattern',pattern:'solid',fgColor:{argb:'FFEDF5ED'}};
    const border={top:{style:'thin'},left:{style:'thin'},bottom:{style:'thin'},right:{style:'thin'}};
    const desa=current.scope==='DESA',periode=current.period.split('-'),bulan=NAMA_BULAN[Number(periode[1])-1],tahun=periode[0];
    const header=(range,value,options={})=>{
      sheet.mergeCells(range);
      const cell=sheet.getCell(range.split(':')[0]);cell.value=value;
      cell.font={name:'Arial',size:options.size||9,bold:!!options.bold,color:options.color?{argb:options.color}:undefined};
      cell.alignment={horizontal:options.align||'left',vertical:'middle'};
      return cell;
    };
    header('A1:AI1','LAPORAN PENEROBOSAN UMUM',{size:15,bold:true,align:'center'});
    header('A2:AI2',desa?'JUMLAH JAMAAH, PERSENAN, KEGIATAN DAN KEPENGURUSAN DESA':'JUMLAH JAMAAH, PERSENAN DAN KEGIATAN KELOMPOK',{size:11,bold:true,align:'center'});
    sheet.getRow(1).height=24;sheet.getRow(2).height=21;
    if(desa){
      header('A3:N3','DESA     : Perwira');
      header('A4:N4','DAERAH : Bekasi Timur');
      header('T3:AA3','BULAN : '+bulan);
      header('AC3:AI3','TAHUN : '+tahun);
      header('AC4:AI4','DIISI DESA',{color:'FF2464B5',align:'right'});
    }else{
      header('A3:N3','KELOMPOK : '+(names[current.scope]||current.scope));
      header('A4:N4','DESA        : Perwira');
      header('A5:N5','DAERAH    : Bekasi Timur');
      header('W4:AD4','BULAN : '+bulan);
      header('W5:AD5','TAHUN : '+tahun);
      header('AE6:AI6','DIISI KELOMPOK',{color:'FF297243',align:'right'});
    }
    let top=desa?6:8;
    const tables=el('pu-report').querySelectorAll('table[data-pu-sheet]');
    for(const table of tables){
      const trs=Array.from(table.rows),main=table.classList.contains('pu-excel-main');
      const logicalCount=main?(current.scope==='DESA'?32:31):table.classList.contains('pu-excel-detail')?(current.scope==='DESA'?19:17):table.classList.contains('pu-excel-roster')?6:4;
      const start=i=>main?(current.scope==='DESA'?(i===0?1:i===1?2:i+4):(i===0?1:i+4)):Math.floor(i*35/logicalCount)+1;
      const busy=[];
      trs.forEach((tr,r)=>{
        let index=0,maxLines=1;
        Array.from(tr.cells).forEach(dom=>{
          while(busy[index]>r)index++;
          const span=Math.max(1,dom.colSpan||1),vertical=Math.max(1,dom.rowSpan||1);
          const col1=start(index),col2=start(index+span)-1,rr=top+r;
          const value=(dom.innerText||dom.textContent||'').trim();
          const cell=sheet.getCell(rr,col1);
          if(col1!==col2||vertical>1)sheet.mergeCells(rr,col1,rr+vertical-1,col2);
          const numeric=/^(?:\d+|\d{1,3}(?:\.\d{3})+)$/.test(value)&&!dom.closest('.pu-excel-roster,.pu-excel-other');
          cell.value=numeric?Number(value.replace(/\./g,'')):value;
          if(numeric)cell.numFmt='#,##0';
          cell.font={name:'Arial',size:main?8:9,bold:dom.tagName==='TH'||tr.classList.contains('pu-total')};
          cell.alignment={horizontal:dom.classList.contains('pu-left')?'left':'center',vertical:'middle',wrapText:true};
          cell.border=border;
          if(dom.tagName==='TH')cell.fill=green;
          else if(tr.classList.contains('pu-total'))cell.fill=pale;
          maxLines=Math.max(maxLines,value.split('\n').length);
          for(let i=index;i<index+span;i++)busy[i]=r+vertical;
          index+=span;
        });
        sheet.getRow(top+r).height=Math.min(220,Math.max(main?18:17,maxLines*12+5));
      });
      top+=trs.length+2;
    }
    const footer=el('pu-report').querySelector('.pu-report-footer');
    const noteBox=footer?.querySelector('.pu-notes');
    const noteText=noteBox?`${noteBox.querySelector('strong')?.textContent.trim()||'CATATAN :'}\n${noteBox.querySelector('div')?.textContent.trim()||''}`:null;
    if(noteText){
      sheet.mergeCells(top,1,top+4,20);
      const note=sheet.getCell(top,1);note.value=noteText;note.font={name:'Arial',size:10,bold:false};note.alignment={horizontal:'left',vertical:'top',wrapText:true,indent:1};
    }
    const signName=footer?.querySelector('.pu-sign-name')?.textContent.trim()||'';
    const signCell=(row,first,last,value,size=9)=>{
      sheet.mergeCells(row,first,row,last);
      const cell=sheet.getCell(row,first);cell.value=value;cell.font={name:'Arial',size};
      cell.alignment={horizontal:'center',vertical:'middle',wrapText:true};
    };
    signCell(top,21,35,`Bekasi, ${signatureDate()}`);
    signCell(top+1,21,27,`KI ${desa?'Desa':'Kelompok'}`);
    signCell(top+1,29,35,`Penerobos ${desa?'Desa':'Kelompok'}`);
    signCell(top+4,21,27,signName);
    for(let row=top;row<=top+4;row++)sheet.getRow(row).height=16;
    sheet.pageSetup.printArea=`A1:AI${top+4}`;
    const bytes=await book.xlsx.writeBuffer();
    const url=URL.createObjectURL(new Blob([bytes],{type:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'}));
    const link=document.createElement('a');link.href=url;link.download=`Penerobosan_Umum_${current.scope}_${current.period}.xlsx`;document.body.appendChild(link);link.click();link.remove();setTimeout(()=>URL.revokeObjectURL(url),60000);
  }catch(e){alertMsg('Gagal mengunduh Excel: '+e.message);}
}
function print(){
  if(!current)return alertMsg('Buat pratinjau dahulu.');
  if(printCleanup)printCleanup();
  document.querySelectorAll('#pu-print-sheet').forEach(old=>old.remove());
  const node=document.createElement('div');node.id='pu-print-sheet';node.innerHTML=el('pu-preview').innerHTML;
  if(window.matchMedia('(max-width: 1024px)').matches)node.classList.add('pu-print-mobile');
  const previousTitle=document.title;
  const scopeLabel=current.scope==='DESA'?'Desa':`Klp ${String(current.scope).replace(/^PW/,'')}`;
  document.title=`Penerobosan Umum - ${scopeLabel} - ${titleMonth(current.period)}`;
  document.body.append(node);document.body.classList.add('pu-print-mode');
  let finished=false;
  const done=()=>{
    if(finished)return;finished=true;
    clearTimeout(timer);node.remove();document.body.classList.remove('pu-print-mode');
    document.title=previousTitle;window.removeEventListener('afterprint',done);
    if(printCleanup===done)printCleanup=null;
  };
  printCleanup=done;
  window.addEventListener('afterprint',done);
  const timer=setTimeout(done,60000);
  try{window.print();}catch(e){done();throw e;}
}
// Popup khusus layar. Atribut pada sel tidak mengubah teks maupun ukuran saat dicetak.
const editorStyle=document.createElement('style');editorStyle.textContent=`@media screen{
#pu-preview [data-pu-edit]{cursor:pointer}#pu-preview [data-pu-edit]:hover{background:#e7f4de;outline:2px solid #198653;outline-offset:-2px}
#pu-editor-overlay{position:fixed;inset:0;z-index:999999;background:#1119;display:flex;align-items:center;justify-content:center;padding:15px;box-sizing:border-box}
#pu-editor-overlay[hidden]{display:none}#pu-editor-dialog{background:white;color:#16251a;width:min(950px,100%);max-height:93vh;overflow-y:auto;overflow-x:hidden;box-sizing:border-box;min-width:0;border-radius:8px;box-shadow:0 12px 40px #0005;padding:18px;font:14px Arial,sans-serif}
#pu-editor-dialog .pu-editbar{display:flex;gap:8px;align-items:center;flex-wrap:wrap;margin:10px 0}#pu-editor-dialog h3{flex:1;margin:0;font-size:20px}
#pu-editor-dialog table{width:100%;border-collapse:collapse}#pu-editor-dialog th,#pu-editor-dialog td{border-bottom:1px solid #ddd;padding:7px;text-align:left}
#pu-editor-dialog input,#pu-editor-dialog select{padding:7px;max-width:100%;border:1px solid #aaa;border-radius:4px}
#pu-editor-dialog button{padding:7px 11px;cursor:pointer}#pu-editor-dialog .pu-editfields{display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:10px;margin:12px 0}
#pu-editor-dialog label{display:grid;gap:4px}#pu-editor-dialog .pu-editnote{font-size:12px;color:#536057}
}@media screen and (max-width:700px){
  #pu-editor-overlay{padding:8px}
  #pu-editor-dialog{width:100%;max-height:calc(100dvh - 16px);padding:14px}
  #pu-editor-dialog h3{font-size:18px;line-height:1.25;overflow-wrap:anywhere}
  #pu-editor-dialog input,#pu-editor-dialog select,#pu-editor-dialog textarea{box-sizing:border-box;min-width:0}
  #pu-editor-dialog textarea{width:100%;max-width:100%;resize:vertical}
  #pu-editor-dialog .pu-editbar select,#pu-editor-dialog .pu-editbar input{flex:1 1 100%;width:100%}
  #pu-editor-dialog table.pu-editor-roles,#pu-editor-dialog table.pu-editor-members{display:block;min-width:0;width:100%;border-collapse:separate}
  #pu-editor-dialog .pu-editor-roles thead,#pu-editor-dialog .pu-editor-members thead{display:none}
  #pu-editor-dialog .pu-editor-roles tbody,#pu-editor-dialog .pu-editor-members tbody{display:grid;gap:10px}
  #pu-editor-dialog .pu-editor-roles tr,#pu-editor-dialog .pu-editor-members tr{display:grid;min-width:0;padding:12px;border:1px solid #d6e4d9;border-radius:8px;background:#f8fbf8}
  #pu-editor-dialog .pu-editor-roles td,#pu-editor-dialog .pu-editor-members td{display:block;min-width:0;border:0;padding:0;overflow-wrap:anywhere}
  #pu-editor-dialog .pu-editor-roles tr{gap:9px}
  #pu-editor-dialog .pu-editor-roles td:first-child,#pu-editor-dialog .pu-editor-members td:first-child{font-weight:700;font-size:15px}
  #pu-editor-dialog .pu-editor-roles td:nth-child(2)::before{content:'Dapukan';display:block;color:#536057;font-size:12px;margin-bottom:4px}
  #pu-editor-dialog .pu-editor-roles td:nth-child(2) input{width:100%;max-width:none}
  #pu-editor-dialog .pu-editor-roles td:nth-child(3){display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px}
  #pu-editor-dialog .pu-editor-roles td:nth-child(3) button{width:100%;min-height:42px;padding:7px 4px;white-space:normal;line-height:1.2}
  #pu-editor-dialog .pu-editor-members tr{grid-template-columns:1fr 1fr;gap:6px}
  #pu-editor-dialog .pu-editor-members td:first-child,#pu-editor-dialog .pu-editor-members td:nth-child(4){grid-column:1/-1}
  #pu-editor-dialog .pu-editor-members td:nth-child(4) button{width:100%}
}@media print{#pu-editor-overlay{display:none!important}}`;document.body.append(editorStyle);
let editor=null;
function editorBox(){let box=el('pu-editor-overlay');if(!box){box=document.createElement('div');box.id='pu-editor-overlay';box.hidden=true;box.innerHTML='<div id="pu-editor-dialog" role="dialog" aria-modal="true"></div>';document.body.append(box);box.onclick=e=>{if(e.target===box)closeEditor();};}return box;}
function closeEditor(){editorBox().hidden=true;editor=null;}
function editorShow(title,body){editorBox().hidden=false;el('pu-editor-dialog').innerHTML=`<div class="pu-editbar"><h3>${safe(title)}</h3><button type="button" data-pu-action="close">Tutup ✕</button></div>${body}<p class="pu-editnote">Perubahan tersimpan pada data utama dan laporan terbaru dihitung ulang. Arsip lama tetap sesuai saat disimpan.</p>`;}
function memberCategory(j){const date=new Date(`${el('pu-month').value}-01T12:00:00`);date.setMonth(date.getMonth()+1);date.setDate(0);const age=hitungUmur(j.tgl_lahir,date),status=String(j.status_nikah||'').trim().toLowerCase();if(!normGender(j.jenis_kelamin)||age===null||!status&&age>=16)return 'belum_lengkap';if(status==='menikah'||status==='janda / duda')return 'dewasa';return age<5?'balita':age<=12?'cbr':age<=15?'pra':age<=20?'remaja':'usia';}
function editorMembers(){const {scope:g,key,gender}=editor,all=(aJamaahDesa||[]).filter(j=>j.kelompok_nama===g),listed=all.filter(j=>j.status_sambung==='Tetap'&&(key==='janda'?normGender(j.jenis_kelamin)==='P'&&j.status_nikah==='Janda / Duda':key==='kk'?true:key==='total'?Boolean(normGender(j.jenis_kelamin)):memberCategory(j)===key)&&(!gender||normGender(j.jenis_kelamin)===gender));
  listed.sort((a,b)=>a.nama.localeCompare(b.nama,'id-ID'));all.sort((a,b)=>a.nama.localeCompare(b.nama,'id-ID'));
  editorShow(`${groupDisplayName(g,names[g])} · ${key==='janda'?'Janda':key==='kk'?'KK':key.toUpperCase()}${gender?' · '+gender:''}`,`<p>${listed.length} jamaah pada rincian ini. Ubah status sambung untuk mengeluarkan dari perhitungan, atau tambahkan jamaah baru.</p><table class="pu-editor-members"><thead><tr><th>Nama</th><th>JK</th><th>Status nikah</th><th></th></tr></thead><tbody>${listed.map(j=>`<tr><td>${safe(j.nama)}</td><td>${safe(j.jenis_kelamin||'—')}</td><td>${safe(j.status_nikah||'—')}</td><td><button type="button" data-pu-action="member" data-did="${safe(j.did)}">Ubah</button></td></tr>`).join('')||'<tr><td colspan="4">Belum ada data</td></tr>'}</tbody></table><div class="pu-editbar"><select id="pu-member-select"><option value="">Pilih jamaah lain di kelompok ini</option>${all.map(j=>`<option value="${safe(j.did)}">${safe(j.nama)} · ${safe(j.status_sambung||'—')}</option>`).join('')}</select><button type="button" data-pu-action="selected-member">Ubah jamaah</button><button type="button" data-pu-action="new-member">+ Tambah jamaah</button></div>`);
}
function editorMemberForm(did){const g=editor.scope,j=(aJamaahDesa||[]).find(x=>x.did===did&&x.kelompok_nama===g);if(did&&!j)return;editor.did=did||null;
  const opts=(values,val)=>values.map(v=>`<option value="${safe(v)}" ${v===val?'selected':''}>${safe(v||'—')}</option>`).join('');
  const heads=[...new Map((aJamaahDesa||[]).filter(x=>x.kelompok_nama===g&&x.keluarga_id).map(x=>[x.keluarga_id,x])).values()].sort((a,b)=>a.nama.localeCompare(b.nama,'id-ID'));
  editorShow(`${did?'Ubah':'Tambah'} jamaah · ${groupDisplayName(g,names[g])}`,`<div class="pu-editfields"><label>Nama<input id="pu-f-name" value="${safe(j?.nama||'')}"></label><label>Jenis kelamin<select id="pu-f-gender">${opts(['','L','P','Laki-laki','Perempuan'],j?.jenis_kelamin||'')}</select></label><label>Tanggal lahir<input id="pu-f-birth" type="date" value="${safe(j?.tgl_lahir||'')}"></label><label>Status nikah<select id="pu-f-marriage">${opts(['','Belum Menikah','Menikah','Janda / Duda'],j?.status_nikah||'')}</select></label><label>Status sambung<select id="pu-f-connection">${opts(['','Tetap','Pindah Sementara','Pindah Sambung','Meninggal Dunia'],j?.status_sambung??'Tetap')}</select></label>${did?'':`<label>Hubungan keluarga<select id="pu-f-headtype"><option value="existing">Masuk KK yang ada</option><option value="new">KK baru</option></select></label><label>KK tujuan<select id="pu-f-head">${heads.map(x=>`<option value="${safe(x.did)}">${safe(x.nama)}</option>`).join('')}</select></label>`}</div><div class="pu-editbar"><button type="button" data-pu-action="save-member">Simpan</button><button type="button" data-pu-action="back">Kembali</button></div>`);
}
function editorRoles(){const {scope:g,key}=editor,entries=(aPengurus||[]).filter(x=>x.aktif!==false&&x.level===(g==='DESA'?'desa':'kelompok')&&(g==='DESA'||x.kelompok_nama===g)&&!/^MS\b/i.test(x.dapukan||'')&&(key==='semua'||key==='mt'&&/^MT (?:Desa|Kelompok)$/i.test(x.dapukan||'')||key==='4s'&&pengurus4S(x.dapukan)||key==='lain'&&!pengurus4S(x.dapukan)||officerPatterns[key]?.test(x.dapukan||'')));
  const members=(aJamaahDesa||[]).filter(j=>j.status_sambung==='Tetap'&&(g==='DESA'||j.kelompok_nama===g)).sort((a,b)=>a.nama.localeCompare(b.nama,'id-ID'));
  editorShow(`Pengurus ${g==='DESA'?'desa':groupDisplayName(g,names[g])} · ${key.toUpperCase()}`,`<table class="pu-editor-roles"><thead><tr><th>Nama</th><th>Dapukan</th><th>Tindakan</th></tr></thead><tbody>${entries.map(x=>`<tr><td>${safe(x.jamaah_desa?.nama||members.find(j=>j.did===x.did)?.nama||x.did)}</td><td><input data-role-id="${x.id}" value="${safe(x.dapukan)}"></td><td><button type="button" data-pu-action="save-role" data-id="${x.id}">Simpan</button> <button type="button" data-pu-action="remove-role" data-id="${x.id}">Hapus dapukan</button></td></tr>`).join('')||'<tr><td colspan="3">Belum ada dapukan</td></tr>'}</tbody></table><div class="pu-editbar"><select id="pu-role-member"><option value="">Pilih jamaah</option>${members.map(j=>`<option value="${safe(j.did)}">${safe(j.nama)}</option>`).join('')}</select><input id="pu-role-name" placeholder="Dapukan baru, contoh: MT Kelompok" size="32"><button type="button" data-pu-action="add-role">+ Tambah dapukan</button></div>${['imam','wakil','penerobos','muballigh','ku','aghnia','lain'].includes(key)?`<label>Nama tambahan dari profil laporan (satu nama per baris)<textarea id="pu-role-manual" rows="3">${safe(profiles[g]?.['nama_'+key]||'')}</textarea></label><button type="button" data-pu-action="save-manual">Simpan nama tambahan</button>`:''}<p class="pu-editnote">Hapus dapukan menonaktifkan catatan pengurus, tidak menghapus jamaah.</p>`);
}
function editorProfile(){const {scope:g,key}=editor,field=[...common,...facilities,...groupExtras,...desaExtras].find(x=>x[0]===key);if(!field)return;editorShow(`${g==='DESA'?'Desa':groupDisplayName(g,names[g])} · ${field[1]}`,`<div class="pu-editfields"><label>${safe(field[1])}<input id="pu-profile-value" type="${field[2]}" ${field[2]==='number'?'min="0" step="1"':''} value="${safe(profiles[g]?.[key]??'')}"></label></div><button type="button" data-pu-action="save-profile">Simpan</button>`);}
function editorOpen(target){if(archiveView){alertMsg('Arsip hanya dapat dilihat. Klik Pratinjau untuk menyunting data terbaru.');return;}if(!canEdit()){alertMsg('Akun hanya dapat melihat laporan.');return;}const g=target.dataset.puScope;if(!['DESA',...GROUPS].includes(g)||CU?.kelompok_scope&&(g==='DESA'||g!==CU.kelompok_scope))return;editor={scope:g,kind:target.dataset.puEdit,key:target.dataset.puKey,gender:target.dataset.puGender};if(editor.kind==='jamaah')editorMembers();else if(editor.kind==='pengurus')editorRoles();else editorProfile();}
async function editorSave(action,id){const c=editor,g=c.scope;let r;if(action==='save-manual'){
  r=await sb.rpc('dashboard_penerobosan_save',{p_token:await token(),p_scope:g,p_rincian:{...(profiles[g]||{}),['nama_'+c.key]:el('pu-role-manual').value.trim()}});
 }else if(action==='save-profile'){
  const field=[...common,...facilities,...groupExtras,...desaExtras].find(x=>x[0]===c.key),raw=el('pu-profile-value').value.trim();if(field[2]==='number'&&raw!==''&&(!Number.isInteger(Number(raw))||Number(raw)<0))throw Error('Angka harus bulat dan tidak negatif');const payload={...(profiles[g]||{}),[c.key]:field[2]==='number'&&raw!==''?Number(raw):raw};r=await sb.rpc('dashboard_penerobosan_save',{p_token:await token(),p_scope:g,p_rincian:payload});
 }else if(action==='save-member'){
  const get=x=>el(x).value.trim(),payload={nama:get('pu-f-name'),jenis_kelamin:get('pu-f-gender'),tgl_lahir:get('pu-f-birth'),status_nikah:get('pu-f-marriage'),status_sambung:get('pu-f-connection')};if(!payload.nama)throw Error('Nama wajib diisi');if(!c.did){payload.kelompok_nama=g;const isKK=get('pu-f-headtype')==='new';if(!isKK&&!get('pu-f-head'))throw Error('Pilih KK tujuan atau KK baru');r=await sb.rpc('dashboard_penerobosan_edit_jamaah',{p_token:await token(),p_scope:g,p_action:'create',p_did:null,p_payload:payload,p_is_kk:isKK,p_kk_did:isKK?null:get('pu-f-head')});}else r=await sb.rpc('dashboard_penerobosan_edit_jamaah',{p_token:await token(),p_scope:g,p_action:'update',p_did:c.did,p_payload:payload});
 }else{
  const dapukan=action==='add-role'?el('pu-role-name').value.trim():el('pu-editor-dialog').querySelector(`[data-role-id="${id}"]`)?.value.trim();if(action!=='remove-role'&&!dapukan)throw Error('Dapukan wajib diisi');const did=action==='add-role'?el('pu-role-member').value:null;if(action==='add-role'&&!did)throw Error('Pilih jamaah');r=await sb.rpc('dashboard_penerobosan_edit_pengurus',{p_token:await token(),p_scope:g,p_action:action==='add-role'?'create':action==='remove-role'?'remove':'update',p_id:id?Number(id):null,p_did:did,p_dapukan:dapukan||null});
 }
 if(r.error||!r.data?.ok)throw Error(r.error?.message||r.data?.error||'Gagal menyimpan');closeEditor();await loadAll();await reload();refresh();alertMsg('Data utama dan laporan sudah diperbarui.');
}
document.addEventListener('click',async e=>{const cell=e.target.closest('#pu-preview [data-pu-edit]');if(cell){editorOpen(cell);return;}const button=e.target.closest('#pu-editor-dialog [data-pu-action]');if(!button||busy)return;const action=button.dataset.puAction;if(action==='close'){closeEditor();return;}if(action==='back'){editorMembers();return;}if(action==='member'){editorMemberForm(button.dataset.did);return;}if(action==='selected-member'){const did=el('pu-member-select').value;if(did)editorMemberForm(did);return;}if(action==='new-member'){editorMemberForm(null);return;}if(action==='remove-role'&&!confirm('Nonaktifkan dapukan ini?'))return;busy=true;try{await editorSave(action,button.dataset.id);}catch(err){alertMsg(err.message);window.alert(err.message);}finally{busy=false;}});
async function init(){if(!el('pu-panel'))return;const select=el('pu-scope'),selected=select.value;
  const allowed=CU?.kelompok_scope?[CU.kelompok_scope]:['DESA',...GROUPS];
  select.innerHTML=allowed.map(g=>`<option value="${g}">${safe(names[g])} (${g})</option>`).join('');
  if(allowed.includes(selected))select.value=selected;
  const now=new Date();if(!el('pu-month').value)el('pu-month').value=`${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}`;
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
