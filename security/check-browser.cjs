const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const storage=()=>{const map=new Map();return{getItem:k=>map.get(k)||null,setItem:(k,v)=>map.set(k,String(v)),removeItem:k=>map.delete(k)}};
const calls=[];const localStorage=storage(),sessionStorage=storage();
const sandbox={Headers,Request,URL,TextEncoder,crypto:require('node:crypto').webcrypto,localStorage,sessionStorage,location:{href:'https://ubnb.pw/portal.html'},fetch:async(input,init)=>{calls.push({url:String(input),...init});return{ok:true,json:async()=>({ok:true,user:{id:1,role:'kasir'},token:'new-token'})}}};sandbox.window=sandbox;
vm.runInNewContext(fs.readFileSync('ubnb-security.js','utf8'),sandbox);
(async()=>{
 localStorage.setItem('ubnb_secure_staff','staff-token');localStorage.setItem('ubnb_secure_member','member-token');
 await sandbox.fetch('https://skltbmcrqutevmtcxqxj.supabase.co/rest/v1/users?select=*',{headers:{apikey:'public-key'}});
 assert.equal(calls.at(-1).headers.get('x-ubnb-staff'),'staff-token');
 assert(!new URL(calls.at(-1).url).searchParams.get('select').includes('password_hash'));
 await sandbox.fetch('https://example.com/other',{headers:{test:'value'}});
 assert.equal(calls.at(-1).headers['x-ubnb-staff'],undefined);
 // Capture cache with another kind, then ensure logout revokes the intended current token.
 localStorage.setItem('ubnb_secure_staff','rotated-token');
 await sandbox.UBNBSecurity.logout('staff');
 assert.equal(localStorage.getItem('ubnb_secure_staff'),null);
 assert.equal(calls.at(-1).headers.get('x-ubnb-staff'),'rotated-token');
 assert.equal(calls.at(-1).headers.get('x-ubnb-member'),null);
 assert.equal(localStorage.getItem('ubnb_secure_member'),'member-token');
 assert.equal(calls.at(-1).keepalive,true);
 const u=await sandbox.UBNBSecurity.login('public-key','staff','test','password');
 assert.equal(u.role,'kasir');assert.equal(localStorage.getItem('ubnb_secure_staff'),'new-token');
 assert(!('password_hash' in u));
 console.log('PASS: request session headers, external-request isolation, safe columns, correct token revocation, independent account sessions, server login');
})().catch(e=>{console.error(e);process.exitCode=1});
