async function cardReg(action,data={}){return rpc('ubaid_card_registration',{p_token:token,p_action:action,p_data:data});}
async function registrationRequests(){
 const r=await cardReg('list');
 $('content').innerHTML='<h1>Pendaftaran kartu lewat HP</h1><p class="muted">APK v3: jamaah memasukkan kode absen lalu scan kartu; kartu langsung aktif tanpa approval. Daftar di bawah hanya untuk permintaan melalui tautan versi lama.</p><button id="reg-refresh">Perbarui</button><div class="panel" id="requests"></div>';
 $('reg-refresh').onclick=()=>task(registrationRequests);
 const box=$('requests');
 box.innerHTML=r.requests.map(p=>'<article class="request-row"><div><b>'+esc(p.nama)+'</b><p>'+esc(p.kelompok)+' · <span class="badge">'+esc(({invited:'Menunggu pembacaan',pending:'Perlu diperiksa',approved:'Disetujui',rejected:'Ditolak',revoked:'Dibatalkan'})[p.status])+'</span></p><small>'+esc(p.uid||'Kartu belum dibaca')+' · '+date(p.submitted_at||p.created_at)+'</small></div><div class="request-actions">'+(p.status==='pending'?'<button data-review="approve" data-id="'+p.id+'" class="primary">Setujui</button><button data-review="reject" data-id="'+p.id+'">Tolak</button>':p.status==='invited'?'<button data-review="revoke" data-id="'+p.id+'">Batalkan tautan</button>':'')+'</div></article>').join('')||empty('Belum ada pendaftaran.');
 box.querySelectorAll('[data-review]').forEach(b=>b.onclick=()=>task(async()=>{if(!confirm((b.dataset.review==='approve'?'Aktifkan kartu ini? Pastikan pemilik dan UID sudah benar.':'Proses pendaftaran ini?')))return;await cardReg(b.dataset.review,{id:Number(b.dataset.id)});await registrationRequests();notice('Pendaftaran diperbarui. Kartu disetujui diterima mesin saat sinkron berikutnya.');}));
}
async function createCardInvite(p){
 modal('<h2>Daftar kartu via HP</h2><p>Pasang UBAID NFC v3, masukkan kode absen sendiri, periksa nama lalu scan kartu. Tidak perlu tautan atau persetujuan pengurus.</p><p><a href="UBAID_NFC_v3.apk">Unduh UBAID NFC v3</a></p>');
}
const ubaidRenderBase=render;
render=async function(next){
 if(next==='registrations'){view=next;document.querySelectorAll('[data-view]').forEach(b=>b.classList.toggle('active',b.dataset.view===next));notice('');return registrationRequests();}
 if(next==='events'){view=next;notice('');document.querySelectorAll('[data-view]').forEach(b=>b.classList.toggle('active',b.dataset.view===next));$('content').innerHTML='<iframe title="Acara dan kehadiran" class="acara-frame" src="acara.html"></iframe>';return;}
 return ubaidRenderBase(next);
};
const ubaidLoadPeopleBase=loadPeople;
loadPeople=async function(){await ubaidLoadPeopleBase();document.querySelectorAll('[data-person]').forEach(b=>{const p=people[Number(b.dataset.person)];const invite=document.createElement('button');invite.textContent='Panduan daftar via HP';invite.disabled=!p.absen_code;invite.onclick=()=>task(()=>createCardInvite(p));b.parentElement.append(' ',invite);});};
