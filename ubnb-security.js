(function(global){
'use strict';
const origin='https://skltbmcrqutevmtcxqxj.supabase.co', nativeFetch=global.fetch.bind(global), kinds=['staff','member','sopram','family'];
const publicKey='sb_publishable_-_oDmSzXdOTzEBcthp8v9w_p3zA1VXX';
let apiHeaders=new Headers({apikey:publicKey,Authorization:'Bearer '+publicKey});
const key=k=>'ubnb_secure_'+k;
function headersFor(input,init){const h=new Headers(input instanceof Request?input.headers:undefined);new Headers(init?.headers).forEach((v,k)=>h.set(k,v));kinds.forEach(k=>{const t=localStorage.getItem(key(k));if(t)h.set('x-ubnb-'+k,t)});const dk=sessionStorage.getItem('dk_attendance_token')||sessionStorage.getItem('dashboard_kelompok_attendance_token');if(dk)h.set('x-ubnb-dk',dk);return h}
global.fetch=function(input,init){const url=new URL(typeof input==='string'||input instanceof URL?input:input.url,location.href);if(url.origin!==origin)return nativeFetch(input,init);
const table=url.pathname.split('/').pop(),safe={users:'id,username,role,nama,permissions,menu_layout,last_login_at,last_active_at,updated_at,kelompok_scope',ppob_member:'id,anggota_id,jamaah_did,nama,no_hp,status,total_piutang,approved_at,approved_by,created_at,updated_at',sopram_user:'id,jamaah_did,username,no_wa,bio,foto_url,foto_cover_url,is_admin,status,last_login_at,created_at'};
let changed=false;
if(safe[table]){let select=url.searchParams.get('select');if(select){select=select.replace(/(^|,)\*(?=,|$)/,(_,prefix)=>prefix+safe[table]);if(table==='sopram_user')select=select.split(',').filter(x=>x.trim()!=='kode_akses').join(',');if(select!==url.searchParams.get('select')){url.searchParams.set('select',select);changed=true}}}
if(changed)input=input instanceof Request?new Request(url.href,input):url.href;
const options=Object.assign({},init);options.headers=headersFor(input,init);if(options.headers.has('apikey'))apiHeaders=new Headers(options.headers);return nativeFetch(input,options)};
async function call(sb,name,args){if(sb&&typeof sb.rpc==='function')return sb.rpc(name,args);const apiKey=typeof sb==='string'?sb:publicKey;const h=headersFor('',{headers:{apikey:apiKey,Authorization:'Bearer '+apiKey,'Content-Type':'application/json'}});apiHeaders=new Headers(h);const r=await nativeFetch(origin+'/rest/v1/rpc/'+name,{method:'POST',headers:h,body:JSON.stringify(args)});const data=await r.json();return r.ok?{data,error:null}:{data:null,error:{message:data.message||'Permintaan gagal'}}}
async function hash(s){const b=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(s));return Array.from(new Uint8Array(b),x=>x.toString(16).padStart(2,'0')).join('')}
async function login(sb,kind,identifier,secret){const{data,error}=await call(sb,'ubnb_secure_login',{p_kind:kind,p_identifier:identifier,p_secret:secret});if(error||!data?.ok)throw new Error(data?.error||error?.message||'Login gagal');localStorage.setItem(key(kind),data.token);return data.user}
async function resume(sb,kind='staff'){if(!localStorage.getItem(key(kind)))return null;const{data,error}=await call(sb,'ubnb_secure_session',{p_kind:kind});if(error)throw new Error(error.message);if(!data){localStorage.removeItem(key(kind));return null}return data}
async function logout(kind='staff'){
 const token=localStorage.getItem(key(kind));
 const h=apiHeaders&&new Headers(apiHeaders);
 if(h){kinds.forEach(k=>h.delete('x-ubnb-'+k));if(token)h.set('x-ubnb-'+kind,token);h.set('Content-Type','application/json')}
 localStorage.removeItem(key(kind));
 if(h&&token){try{await nativeFetch(origin+'/rest/v1/rpc/ubnb_secure_logout',{method:'POST',headers:h,body:JSON.stringify({p_kind:kind}),keepalive:true})}catch(_){}}
}
async function result(sb,kind,id,secret){try{return{data:await login(sb,kind,id,secret),error:null}}catch(e){return{data:null,error:{message:e.message}}}}
async function requireStaff(apiKey){let u;try{u=await resume(apiKey)}catch(_){}if(u)return;const wrap=document.createElement('div');wrap.id='ubnb-security-login';wrap.style.cssText='position:fixed;inset:0;background:#f3f6fa;z-index:2147483647;display:grid;place-items:center;font-family:system-ui';wrap.innerHTML='<form style="background:white;padding:28px;border-radius:16px;width:min(360px,90vw);box-sizing:border-box"><h2>Masuk Gubukan Krasti</h2><p>Gunakan akun pengelola UBNB.</p><label>Username<input name="username" autocomplete="username" required style="display:block;width:100%;padding:10px;margin:8px 0 16px;box-sizing:border-box"></label><label>Password<input name="password" type="password" autocomplete="current-password" required style="display:block;width:100%;padding:10px;margin:8px 0 16px;box-sizing:border-box"></label><p role="alert" style="color:#b91c1c"></p><button type="submit" style="padding:12px;width:100%">Masuk</button></form>';document.body.appendChild(wrap);wrap.querySelector('form').onsubmit=async e=>{e.preventDefault();const form=e.currentTarget,btn=form.querySelector('button');btn.disabled=true;try{await login(apiKey,'staff',form.elements.username.value,form.elements.password.value);location.reload()}catch(err){form.querySelector('[role=alert]').textContent=err.message;btn.disabled=false}}}
// Old display-only identities cannot substitute for a verified server session.
if(!localStorage.getItem(key('member')))localStorage.removeItem('jw_u');
if(!localStorage.getItem(key('staff'))){sessionStorage.removeItem('jw_adm');['ubnb_sso','portal_cu','wu','bmt_cu','wu_jamaah','saham_user','mpps_user','keuangan_user'].forEach(k=>localStorage.removeItem(k));}
async function register(sb,name,phone,pin,anggota,did){const {data,error}=await call(sb,'ubnb_secure_member_register',{p_name:name,p_phone:phone,p_pin:pin,p_anggota_id:anggota||null,p_jamaah_did:did||null});if(error||!data?.ok)return{data:null,error:{message:data?.error||error?.message||'Gagal mendaftar'}};localStorage.setItem(key('member'),data.token);return{data:data.user,error:null}}
global.UBNBSecurity={register,login,resume,logout,result,requireStaff,hash};
})(window);
