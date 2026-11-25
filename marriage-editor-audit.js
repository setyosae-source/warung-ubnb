
/* Pernikahan: MT editor, session-bound audit and recoverable archive. */
(function(){
'use strict';
const baseMatch=window.dapukanModuleMatch;
window.dapukanModuleMatch=function(label,module){
 if(module==='marriage'&&/(^|\s)mt(\s|$)/i.test((' '+String(label||'').replace(/[._/\\-]+/g,' ')+' ').replace(/\s+/g,' ')))return true;
 return baseMatch(label,module);
};
const originalRpc=sb.rpc.bind(sb);
async function request(action,target,payload){
 if(!CU?.did||!canAccessMarriage())throw new Error('Akses Pernikahan tidak diberikan untuk akun ini');
 const expected=CU.did;
 const args=()=>({p_token:DK_ATT_TOKEN,p_action:action,p_target:target==null?null:String(target),p_payload:{...(payload||{}),_editor_did:expected}});
 if(!DK_ATT_TOKEN)await dkAttendanceAuthenticate();
 if(CU?.did!==expected)throw new Error('Akun login berubah. Ulangi tindakan.');
 let result=await originalRpc('dashboard_marriage_editor',args());
 if(result.error?.code==='28000'){
  await dkAttendanceAuthenticate();
  if(CU?.did!==expected)throw new Error('Akun login berubah. Ulangi tindakan.');
  result=await originalRpc('dashboard_marriage_editor',args());
 }
 if(result.error)throw new Error(result.error.message||'Gagal memproses data');
 if(result.data?.ok!==true)throw new Error(result.data?.error||'Gagal memproses data');
 return result.data;
}
sb.rpc=function(name,args){
 if(name==='dashboard_marriage_process'||name==='dashboard_marriage_youth_save'){
  if(args?.p_editor_did!==CU?.did)return Promise.resolve({data:null,error:{message:'Akun editor berbeda dengan login'}});
  return request(name==='dashboard_marriage_process'?'process':'youth_save',args?.p_jamaah_did,args?.p_payload)
   .then(data=>({data,error:null}),error=>({data:null,error:{message:error.message}}));
 }
 return originalRpc(...arguments);
};
const esc=x=>escH(String(x??''));
const date=x=>x?new Date(x).toLocaleString('id-ID',{timeZone:'Asia/Jakarta'}):'-';
const style=document.createElement('style');
style.textContent='.mra-bar{display:flex;gap:8px;flex-wrap:wrap;margin:10px 0}.mra-btn{border:1px solid #cbd5d1;background:white;color:#17583c;border-radius:7px;padding:7px 10px;font:inherit;cursor:pointer}.mra-btn.danger{color:#b91c1c}.mra-dialog{border:1px solid #ccd9d1;border-radius:12px;padding:18px;width:min(850px,94vw);max-height:88vh;overflow:auto;color:#243b30;background:#fafbf9}.mra-dialog::backdrop{background:#0007}.mra-head{display:flex;align-items:center;justify-content:space-between;gap:12px;margin-bottom:12px}.mra-content table{width:100%;border-collapse:collapse;font-size:12px}.mra-content td,.mra-content th{padding:8px;text-align:left;border:1px solid #dce4df;vertical-align:top;overflow-wrap:anywhere}.mra-content .scroll{overflow-x:auto}.mra-content label{display:block;margin:12px 0}.mra-content input,.mra-content textarea{display:block;width:100%;padding:9px;border:1px solid #bdcdc3;border-radius:6px;font:inherit}.mra-note{font-size:12px;color:#52665b;line-height:1.5;margin:8px 0}.mra-content button:disabled{opacity:.5;cursor:wait}.mra-actions{display:flex;gap:6px;flex-wrap:wrap}.mra-content h3{margin:16px 0 8px}.mra-diff{white-space:pre-wrap;max-width:280px}';
style.textContent+=' .mra-dialog{box-sizing:border-box}.mra-content input,.mra-content textarea{box-sizing:border-box;max-width:100%}.mra-mobile-list{display:none}.mra-mobile-card{display:block;width:100%;border:1px solid #d8e4dc;background:#fff;border-radius:12px;padding:12px;margin:0 0 10px;text-align:left;font:inherit;color:#243b30;box-shadow:0 2px 8px #1535220c;cursor:pointer}.mra-mobile-card:focus-visible{outline:3px solid #166534;outline-offset:2px}.mra-mobile-card-top{display:flex;align-items:flex-start;justify-content:space-between;gap:8px}.mra-mobile-card-date{font-size:12px;color:#64748b;font-weight:700}.mra-mobile-card-pair{font-size:15px;font-weight:800;line-height:1.45;overflow-wrap:anywhere;margin:6px 0}.mra-mobile-card-hint{font-size:11px;color:#64748b;margin-top:7px}.mra-mobile-card .marriage-type{white-space:normal!important;text-align:center;overflow-wrap:anywhere;flex:0 1 auto;max-width:48%;line-height:1.3}.mra-detail-grid{display:grid;grid-template-columns:105px minmax(0,1fr);gap:10px 8px;font-size:13px;line-height:1.45}.mra-detail-grid dt{color:#64748b}.mra-detail-grid dd{margin:0;overflow-wrap:anywhere;font-weight:650}@media(max-width:640px){#marriage-panel-history,#marriage-list-wrap{min-width:0!important;max-width:100%!important}#marriage-list-wrap{overflow-x:hidden!important;min-height:0!important;border:0!important;background:transparent!important}#marriage-list-wrap .marriage-history-table{display:none!important}.mra-mobile-list{display:block;width:100%;max-width:100%}.v11-marriage-history-top{grid-template-columns:minmax(0,1fr)!important;gap:9px!important}.v11-marriage-card{min-width:0!important;max-width:100%!important;padding:9px!important}#marriage-stats{grid-template-columns:repeat(2,minmax(0,1fr))!important;gap:7px!important}#marriage-stats .stat-pill{min-width:0!important;width:100%!important;white-space:normal!important;overflow:visible!important;justify-content:flex-start!important;text-align:left!important;gap:4px!important;padding:9px!important;line-height:1.3!important}#marriage-stats .stat-pill .pl{font-size:11px!important;white-space:normal!important;overflow-wrap:anywhere!important}#marriage-stats .stat-pill .pv{font-size:15px!important;flex:none}.v11-marriage-control .btn-save{height:auto!important;min-height:40px!important;white-space:normal!important;line-height:1.25!important;padding:7px!important}.v11-year-row{grid-template-columns:auto minmax(0,1fr)!important;gap:8px!important}.marriage-inner-tabs button{white-space:normal!important;overflow-wrap:anywhere!important}}';
document.head.appendChild(style);
let dialog;
function panel(title,html){
 if(!dialog){
  dialog=document.createElement('dialog');dialog.className='mra-dialog';document.body.appendChild(dialog);
  dialog.addEventListener('click',e=>{if(e.target===dialog)dialog.close();});
 }
 dialog.innerHTML='<div class="mra-head"><strong>'+esc(title)+'</strong><button type="button" class="mra-btn" data-close>Tutup</button></div><div class="mra-content">'+html+'</div>';
 dialog.querySelector('[data-close]').onclick=()=>dialog.close();
 if(!dialog.open)dialog.showModal();
 return dialog.querySelector('.mra-content');
}
async function busy(btn,fn){
 if(btn)btn.disabled=true;
 try{await fn();}catch(e){toast(e.message||String(e),true);}
 finally{if(btn)btn.disabled=false;}
}
function tools(){
 if(!canAccessMarriage())return;
 const toolbar=document.querySelector('#marriage-panel-history .marriage-toolbar');
 if(toolbar&&!toolbar.querySelector('[data-mra-tools]')){
  const b=document.createElement('button');b.type='button';b.className='mra-btn';b.dataset.mraTools='1';b.textContent='Log & Arsip';b.onclick=()=>busy(b,showAudit);toolbar.appendChild(b);
 }
}
const oldRender=window.renderMarriage;
window.renderMarriage=function(){
 const result=oldRender.apply(this,arguments);tools();
 const table=document.querySelector('#marriage-list-wrap table');
 if(table){
  table.querySelector('thead tr')?.insertAdjacentHTML('beforeend','<th>Tindakan</th>');
  table.querySelectorAll('tbody tr').forEach((row,i)=>{
   const e=aMarriageEvents[i];if(!e)return;
   const td=document.createElement('td');td.innerHTML='<div class="mra-actions"><button type="button" class="mra-btn" data-edit>Ubah</button><button type="button" class="mra-btn danger" data-delete>Hapus</button></div>';
   td.querySelector('[data-edit]').onclick=()=>editEvent(e);
   td.querySelector('[data-delete]').onclick=ev=>busy(ev.currentTarget,async()=>{
    if(!confirm('Arsipkan catatan pernikahan ini? Catatan dapat dipulihkan. Status nikah dan susunan keluarga tetap.'))return;
    await request('event_delete',e.id);await loadMarriageData();toast('Catatan dipindahkan ke arsip');
   });
   row.appendChild(td);
  });
 }
 renderMobileEvents();
 return result;
};
function renderMobileEvents(){
 const wrap=document.getElementById('marriage-list-wrap');
 if(!wrap||!aMarriageEvents.length)return;
 const list=document.createElement('div');list.className='mra-mobile-list';
 aMarriageEvents.forEach(e=>{
  const type=e.jenis_proses==='internal_perwira'?'Sesama Perwira':e.jenis_proses==='external_in'?'Pasangan Masuk':'Pindah Keluar';
  const cls=e.jenis_proses==='internal_perwira'?'internal':e.jenis_proses==='external_in'?'in':'out';
  const people=[{name:e.jamaah_1_nama||'',gender:e.jamaah_1_jk||''},{name:e.jamaah_2_nama||'',gender:e.jamaah_2_jk||''}];
  if(e.jenis_proses!=='internal_perwira'&&people[1].name&&!people[1].gender)people[1].gender=String(people[0].gender).toLowerCase().startsWith('laki')?'Perempuan':'Laki-laki';
  const husband=people.find(x=>String(x.gender).toLowerCase().startsWith('laki'))||people[0];
  const wife=people.find(x=>String(x.gender).toLowerCase().startsWith('perempuan'))||(people[1].name?people[1]:null);
  const card=document.createElement('button');card.type='button';card.className='mra-mobile-card';
  card.setAttribute('aria-label','Lihat detail pernikahan '+(husband.name||'-')+' dan '+(wife?.name||'-'));
  card.innerHTML='<div class="mra-mobile-card-top"><span class="mra-mobile-card-date">'+esc(marriageDateFmt(e.tanggal_nikah))+'</span><span class="marriage-type '+cls+'">'+esc(type)+'</span></div><div class="mra-mobile-card-pair">'+esc(husband.name||'-')+' &amp; '+esc(wife?.name||'-')+'</div><div class="mra-mobile-card-hint">Ketuk untuk lihat detail ›</div>';
  card.onclick=()=>showEventDetail(e);list.appendChild(card);
 });
 wrap.appendChild(list);
}
function showEventDetail(e){
 const type=e.jenis_proses==='internal_perwira'?'Sesama Perwira':e.jenis_proses==='external_in'?'Pasangan Masuk':'Pindah Keluar';
 const fields=[['Tanggal',marriageDateFmt(e.tanggal_nikah)],['Jenis proses',type],['Jamaah 1',e.jamaah_1_nama],['Kelompok asal 1',e.asal_kelompok_1],['Jamaah 2 / pasangan',e.jamaah_2_nama],['Kelompok asal 2',e.asal_kelompok_2],['Desa asal pasangan',e.asal_desa_external],['Desa tujuan',e.tujuan_desa_external],['Kelompok akhir',e.kelompok_akhir],['KK setelah nikah',e.kk_nama],['Catatan',e.catatan],['Dicatat oleh',e.created_by_name]];
 const c=panel('Detail pernikahan','<dl class="mra-detail-grid">'+fields.filter(([,v])=>v!=null&&v!=='').map(([k,v])=>'<dt>'+esc(k)+'</dt><dd>'+esc(v)+'</dd>').join('')+'</dl><div class="mra-bar"><button type="button" class="mra-btn" data-edit>Ubah</button><button type="button" class="mra-btn danger" data-delete>Hapus</button></div><p class="mra-note">Hapus memindahkan catatan ke arsip; status nikah dan susunan keluarga tetap.</p>');
 c.querySelector('[data-edit]').onclick=()=>editEvent(e);
 c.querySelector('[data-delete]').onclick=ev=>busy(ev.currentTarget,async()=>{
  if(!confirm('Arsipkan catatan pernikahan ini? Catatan dapat dipulihkan. Status nikah dan susunan keluarga tetap.'))return;
  await request('event_delete',e.id);dialog.close();await loadMarriageData();toast('Catatan dipindahkan ke arsip');
 });
}
function editEvent(e){
 const c=panel('Ubah catatan pernikahan','<p>'+esc(e.jamaah_1_nama)+' &amp; '+esc(e.jamaah_2_nama||'-')+'</p><p class="mra-note">Perubahan tanggal dan catatan dicatat atas akun yang sedang login. Pasangan dan susunan keluarga mengikuti proses registrasi.</p><label>Tanggal nikah<input type="date" id="mra-date" required></label><label>Catatan<textarea id="mra-note" rows="4"></textarea></label><button type="button" class="mra-btn" data-save>Simpan</button>');
 c.querySelector('input').value=String(e.tanggal_nikah||'').slice(0,10);c.querySelector('textarea').value=e.catatan||'';
 c.querySelector('[data-save]').onclick=ev=>busy(ev.currentTarget,async()=>{
  const tanggal_nikah=c.querySelector('input').value;if(!tanggal_nikah)throw new Error('Tanggal nikah wajib diisi');
  await request('event_update',e.id,{tanggal_nikah,catatan:c.querySelector('textarea').value});
  dialog.close();await loadMarriageData();toast('Perubahan tersimpan dan tercatat');
 });
}
async function showAudit(){
 const data=await request('audit');
 const c=panel('Log & Arsip Pernikahan','<div class="mra-bar"><button type="button" class="mra-btn" data-audit>Log perubahan</button><button type="button" class="mra-btn" data-trash>Arsip terhapus</button></div><p class="mra-note">200 aktivitas terbaru sesuai lingkup akses. Penambahan, perubahan, penghapusan, dan pemulihan mencatat akun pelaku.</p><div class="scroll"><table><thead><tr><th>Waktu (WIB)</th><th>Akun</th><th>Tindakan</th><th>Data</th><th>Detail</th></tr></thead><tbody>'+((data.logs||[]).map(l=>'<tr><td>'+esc(date(l.created_at))+'</td><td>'+esc(l.actor_name)+'<br><small>'+esc(l.actor_scope)+'</small></td><td>'+esc(l.action)+'</td><td>'+esc(l.record_label||l.record_id)+'<br><small>'+esc(l.entity.replace('private.','').replace('public.',''))+'</small></td><td><button type="button" class="mra-btn" data-log="'+esc(l.id)+'">Sebelum / sesudah</button></td></tr>').join('')||'<tr><td colspan="5">Belum ada aktivitas sejak pencatatan log diaktifkan.</td></tr>')+'</tbody></table></div>');
 c.querySelector('[data-audit]').onclick=e=>busy(e.currentTarget,showAudit);
 c.querySelector('[data-trash]').onclick=e=>busy(e.currentTarget,showTrash);
 c.querySelectorAll('[data-log]').forEach(b=>b.onclick=()=>busy(b,()=>detail(b.dataset.log)));
}
function value(v,key){
 if(v==null)return '-';
 if(key==='foto_data')return v?'[Foto tersimpan]':'-';
 return typeof v==='object'?JSON.stringify(v):String(v);
}
async function detail(id){
 const {log:l}=await request('audit_detail',id);
 const c=panel('Detail perubahan', '<p><b>'+esc(l.actor_name)+'</b> · '+esc(l.action)+' · '+esc(date(l.created_at))+'</p><p>'+esc(l.record_label||l.record_id)+'</p><div class="scroll"><table><thead><tr><th>Kolom</th><th>Sebelum</th><th>Sesudah</th></tr></thead><tbody>'+(l.changed_fields||[]).map(k=>'<tr><td>'+esc(k)+'</td><td class="mra-diff">'+esc(value(l.before_data?.[k],k))+'</td><td class="mra-diff">'+esc(value(l.after_data?.[k],k))+'</td></tr>').join('')+'</tbody></table></div><div class="mra-bar"><button type="button" class="mra-btn" data-back>Kembali ke log</button></div>');
 c.querySelector('[data-back]').onclick=e=>busy(e.currentTarget,showAudit);
}
async function showTrash(){
 const data=await request('trash');
 const items=[...(data.events||[]).map(x=>({...x,type:'event',label:x.jamaah_1_nama+' & '+(x.jamaah_2_nama||'-'),target:x.id})),...(data.profiles||[]).map(x=>({...x,type:'youth',label:x.nama,target:x.jamaah_did}))];
 const c=panel('Arsip terhapus Pernikahan','<p class="mra-note">Data tetap disimpan. Pulihkan untuk menampilkannya kembali. Pengarsipan riwayat tidak membatalkan status nikah atau perubahan keluarga.</p><div class="scroll"><table><thead><tr><th>Data</th><th>Dihapus oleh</th><th>Waktu (WIB)</th><th>Tindakan</th></tr></thead><tbody>'+(items.map((x,i)=>'<tr><td>'+esc(x.label)+'<br><small>'+(x.type==='event'?'Riwayat pernikahan':'Profil usia nikah')+'</small></td><td>'+esc(x.deleted_by_name||x.deleted_by_did)+'</td><td>'+esc(date(x.deleted_at))+'</td><td><button type="button" class="mra-btn" data-restore="'+i+'">Pulihkan</button></td></tr>').join('')||'<tr><td colspan="4">Tidak ada data terhapus.</td></tr>')+'</tbody></table></div><div class="mra-bar"><button type="button" class="mra-btn" data-back>Kembali ke log</button></div>');
 c.querySelector('[data-back]').onclick=e=>busy(e.currentTarget,showAudit);
 c.querySelectorAll('[data-restore]').forEach(btn=>btn.onclick=()=>busy(btn,async()=>{
  const x=items[Number(btn.dataset.restore)];if(!confirm('Pulihkan '+x.label+'?'))return;
  await request(x.type+'_restore',x.target);aYouthMarriage=[];await loadMarriageData();await showTrash();toast('Data dipulihkan dan tercatat');
 }));
}
if(typeof window.renderYouthProfile==='function'){
 const old=window.renderYouthProfile;
 window.renderYouthProfile=function(){
  const result=old.apply(this,arguments),p=_ynCurrent,c=document.getElementById('yn-profile-content');
  if(c&&p?.profile_id&&!c.querySelector('[data-mra-delete-profile]')){
   const b=document.createElement('button');b.type='button';b.className='mra-btn danger';b.dataset.mraDeleteProfile='1';b.textContent='Hapus profil ke arsip';b.onclick=()=>busy(b,async()=>{
    if(!confirm('Arsipkan biodata usia nikah ini? Data jamaah tetap tersimpan dan biodata dapat dipulihkan melalui Log & Arsip.'))return;
    await request('youth_delete',p.did);closeMod('modal-youth-profile');aYouthMarriage=[];await loadYouthMarriageData(true);toast('Biodata dipindahkan ke arsip');
   });c.appendChild(b);
  }
  return result;
 };
}
const oldInner=window.showMarriageInnerTab;
window.showMarriageInnerTab=function(){const r=oldInner.apply(this,arguments);tools();return r;};
window.ubnbMarriageAudit={request,showAudit,showTrash};
if(typeof CU!=='undefined'&&CU){applyRoleRestrictions();tools();}
})();
