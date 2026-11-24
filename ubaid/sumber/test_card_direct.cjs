const fs=require('fs'),vm=require('vm'),assert=require('assert');
const html=fs.readFileSync(require('path').join(__dirname,'../kartu.html'),'utf8');
const script=html.match(/<script>([\s\S]*?)<\/script>/)[1];
const elements={};for(const id of html.matchAll(/id="([^"]+)"/g))elements[id[1]]={value:'',hidden:false,disabled:false,textContent:'',focus(){}};
const calls=[];let rejectSave=false;
const ctx={document:{getElementById:id=>elements[id],addEventListener(){}},window:{UBAIDNative:{beginScan(){},stopScan(){}},addEventListener(){}},AbortController,setTimeout,clearTimeout,fetch:async(url,o)=>{const b=JSON.parse(o.body);calls.push(b);if(b.p_action==='register'&&rejectSave)throw Error('Offline');return {ok:true,json:async()=>({ok:true,nama:'Contoh Jamaah',kelompok:'PW4',status:'active'})};}};
vm.createContext(ctx);vm.runInContext(script,ctx);const tick=()=>new Promise(r=>setImmediate(r));
(async()=>{
 elements.code.value='123';elements.open.onclick();await tick();assert.equal(calls.length,0);
 elements.code.value='0123';elements.open.onclick();await tick();assert.equal(calls[0].p_code,'0123');assert.equal(elements.name.textContent,'Contoh Jamaah');
 elements.read.onclick();ctx.window.ubaidNfcUID('aabbccdd');ctx.window.ubaidNfcUID('aabbccdd');await tick();assert.equal(calls.filter(x=>x.p_action==='register').length,1);assert.match(elements.message.textContent,/Berhasil/);
 elements.change.onclick();assert.equal(elements.code.value,'');
 elements.code.value='4567';elements.open.onclick();await tick();elements.read.onclick();elements.cancel.onclick();ctx.window.ubaidNfcUID('AABBCCDD');await tick();assert.equal(calls.filter(x=>x.p_action==='register').length,1);
 rejectSave=true;elements.read.onclick();ctx.window.ubaidNfcUID('AABBCCDD');await tick();assert.equal(elements.retry.hidden,false);rejectSave=false;elements.retry.onclick();await tick();assert.match(elements.message.textContent,/Berhasil/);
 console.log('PASS: code validation/leading zero, identity, auto-save, duplicate callback, reset, cancelled scan, retry');
})().catch(e=>{console.error(e);process.exit(1)});
