/* UBNB v86 boot */
/* Global display/write helpers for UBNB logs.
   WIB has fixed UTC+07:00 and no DST. */
function ubnbWibIso84(value){
  const d=value instanceof Date?value:new Date(value==null?Date.now():value);
  if(isNaN(d.getTime()))return '';
  return new Date(d.getTime()+7*60*60*1000).toISOString().replace(/Z$/,'+07:00');
}
function ubnbFmtWib84(value,withSeconds){
  const d=value instanceof Date?value:new Date(value);
  if(isNaN(d.getTime()))return String(value??'');
  try{
    return new Intl.DateTimeFormat('id-ID',{
      timeZone:'Asia/Jakarta',
      day:'2-digit',month:'short',year:'numeric',
      hour:'2-digit',minute:'2-digit',
      ...(withSeconds?{second:'2-digit'}:{}),
      hourCycle:'h23'
    }).format(d)+' WIB';
  }catch(_){return String(value??'')}
}
function ubnbFmtWibDate84(value){
  const d=value instanceof Date?value:new Date(value);
  if(isNaN(d.getTime()))return String(value??'');
  try{
    return new Intl.DateTimeFormat('id-ID',{
      timeZone:'Asia/Jakarta',
      day:'2-digit',month:'short',year:'numeric'
    }).format(d);
  }catch(_){return String(value??'')}
}
