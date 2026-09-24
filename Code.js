/*******************************************************
 SISTEM PENGENDALIAN ABT 2026 — FINAL-2.2
 Backend: Google Apps Script + Google Sheets
 Frontend: GitHub Pages
*******************************************************/
const CFG = {
  SPREADSHEET_ID: '1kRLF6cqTeqdKHzUi7Gc4otlKRjAkzuUwSqPMK7DiEYY', // kosong jika script dibuat dari Spreadsheet ABT baru
  TZ: 'Asia/Jakarta',
  VERSION: 'ABT-2026-FINAL-2.2',
  ACCESS_CODES: { PIC: 'PIC2026', PENGENDALI: 'kendali2026', PIMPINAN: 'kendali2026' }
};

const SHEETS = {
  KEGIATAN: ['id_kegiatan','unit','kode_program','kode_kro','kode_ro','kode_komponen','kode_subkomponen','nama_kegiatan','tujuan','sasaran','output','target_volume','satuan','pic','ppk','tanggal_mulai','tanggal_selesai','status'],
  ANGGARAN: ['id_anggaran','id_kegiatan','kode_akun','nama_akun','detail_belanja','volume','satuan','harga_satuan','jumlah_anggaran','sumber_dana','kppn','komponen_utama_penunjang','level_rkk'],
  KEBUTUHAN: ['id_kebutuhan','id_kegiatan','id_anggaran','peruntukan','nilai_kebutuhan','bulan_kebutuhan','tanggal_kebutuhan','prioritas','keterangan','created_at','updated_at'],
  RENCANA: ['id_rencana_cair','id_kegiatan','id_kebutuhan','periode','tanggal_rencana','metode_pencairan','nominal_rencana','status','keterangan','created_at','updated_at'],
  PENCAIRAN: ['id_transaksi','id_rencana_cair','id_kegiatan','tanggal_pengajuan','nominal_pengajuan','tanggal_pencairan','nominal_dicairkan','metode','nomor_dokumen','keterangan','created_at','updated_at'],
  BELANJA: ['id_realisasi','id_kegiatan','id_anggaran','tanggal_realisasi','nominal_realisasi','nomor_dokumen','uraian','verifikasi','keterangan','created_at','updated_at'],
  MONITORING: ['id_monitoring','id_kegiatan','periode','tanggal_monitoring','target_anggaran_minggu','realisasi_anggaran_minggu','target_anggaran_kumulatif','realisasi_anggaran_kumulatif','target_fisik_minggu','realisasi_fisik_minggu','target_fisik_kumulatif','realisasi_fisik_kumulatif','target_output','realisasi_output','kendala','tindak_lanjut','pic','deadline','created_at','updated_at'],
  HAMBATAN: ['id_hambatan','id_kegiatan','tanggal','kategori','masalah','root_cause','dampak','tingkat_dampak','status','created_at','updated_at'],
  ACTION: ['id_action','id_kegiatan','id_hambatan','temuan','tindakan','pic','tanggal_mulai','deadline','status','tanggal_selesai','bukti','catatan','created_at','updated_at'],
  RISIKO: ['id_risk','id_kegiatan','risiko','penyebab','probabilitas','dampak','level_risiko','mitigasi','pic','deadline','status','created_at','updated_at'],
  DOKUMEN: ['id_dokumen','id_kegiatan','jenis_dokumen','nomor_dokumen','tanggal_dokumen','file_url','status_verifikasi','catatan','created_at','updated_at'],
  LOG: ['timestamp','user','action','sheet_key','record_id','payload'],
  PIC_INPUT: ['id_input','timestamp','periode','direktorat','id_kegiatan','tujuan','sasaran','deadline','pic','pagu_abt','target_anggaran_nominal','target_anggaran_persen','realisasi_anggaran_nominal','realisasi_anggaran_persen','deviasi_persen','target_output_jumlah','target_output_persen','realisasi_output_jumlah','realisasi_output_persen','status','kendala_utama','tindak_lanjut','catatan_pembaku','keterangan','sumber_input']
};

const SHEET_NAMES = {
  KEGIATAN:'01_MASTER_KEGIATAN', ANGGARAN:'02_MASTER_ANGGARAN', KEBUTUHAN:'03_KEBUTUHAN_DANA',
  RENCANA:'04_RENCANA_PENCAIRAN', PENCAIRAN:'05_REALISASI_PENCAIRAN', BELANJA:'06_REALISASI_BELANJA',
  MONITORING:'07_MONITORING_MINGGUAN', HAMBATAN:'08_HAMBATAN_ROOTCAUSE', ACTION:'09_CORRECTIVE_ACTION',
  RISIKO:'10_RISK_REGISTER', DOKUMEN:'11_DOKUMEN_PENDUKUNG', LOG:'12_LOG_AKTIVITAS', PIC_INPUT:'14_INPUT_PIC'
};

function ss_(){
  if(CFG.SPREADSHEET_ID) return SpreadsheetApp.openById(CFG.SPREADSHEET_ID);
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  if(!ss) throw new Error('Spreadsheet belum terhubung. Buat Apps Script dari Spreadsheet ABT 2026 atau isi SPREADSHEET_ID.');
  return ss;
}
function now_(){return Utilities.formatDate(new Date(),CFG.TZ,'yyyy-MM-dd HH:mm:ss');}
function uid_(p){return p+'-'+Utilities.getUuid().slice(0,8).toUpperCase();}
function num_(v){
  if(v===null||v===undefined||v==='') return 0;
  if(typeof v==='number') return isFinite(v)?v:0;
  const s=String(v).replace(/\s/g,'').replace(/Rp/gi,'').replace(/\./g,'').replace(/,/g,'.').replace(/[^0-9.-]/g,'');
  const n=Number(s); return isFinite(n)?n:0;
}
function pct_(a,b){a=num_(a);b=num_(b);return b?Math.round(a/b*10000)/100:0;}
function dateKey_(v){
  if(!v) return '';
  const d = v instanceof Date ? v : new Date(v);
  if(isNaN(d.getTime())) return '';
  return Utilities.formatDate(d,CFG.TZ,'yyyy-MM-dd');
}
function monthKey_(v){return dateKey_(v).slice(0,7);}
function monthLabel_(m){const a=['Jan','Feb','Mar','Apr','Mei','Jun','Jul','Agu','Sep','Okt','Nov','Des'];return a[Number(m)-1]||m;}
function safe_(v){return v instanceof Date ? Utilities.formatDate(v,CFG.TZ,"yyyy-MM-dd'T'HH:mm:ss") : v;}

function setup(){
  setupSheets_();
  seedRKK_();
  formatSheets_();
  return {ok:true,message:'Database Pengendalian ABT 2026 siap digunakan.',version:CFG.VERSION,spreadsheet:ss_().getName()};
}
function initializeSystem(){return setup();}
function setupSheets_(){
  const ss=ss_();
  Object.keys(SHEETS).forEach(k=>{
    const name=SHEET_NAMES[k];
    let sh=ss.getSheetByName(name);
    if(!sh) sh=ss.insertSheet(name);
    const h=SHEETS[k];
    const current=sh.getRange(1,1,1,h.length).getValues()[0];
    if(sh.getLastRow()===0 || current.every(x=>x==='')) sh.getRange(1,1,1,h.length).setValues([h]);
    else if(current.join('|')!==h.join('|')) sh.getRange(1,1,1,h.length).setValues([h]);
    sh.setFrozenRows(1);
  });
}
function formatSheets_(){
  const ss=ss_();
  Object.keys(SHEETS).forEach(k=>{
    const sh=ss.getSheetByName(SHEET_NAMES[k]);
    if(!sh) return;
    sh.getRange(1,1,1,SHEETS[k].length).setBackground('#082b55').setFontColor('#ffffff').setFontWeight('bold');
    sh.setFrozenRows(1);
    if(sh.getMaxColumns()>SHEETS[k].length) sh.deleteColumns(SHEETS[k].length+1,sh.getMaxColumns()-SHEETS[k].length);
    sh.autoResizeColumns(1,SHEETS[k].length);
  });
}
function rows_(k){
  const sh=ss_().getSheetByName(SHEET_NAMES[k]);
  if(!sh || sh.getLastRow()<2) return [];
  const h=SHEETS[k], v=sh.getRange(2,1,sh.getLastRow()-1,h.length).getValues();
  return v.map(r=>Object.fromEntries(h.map((x,i)=>[x,safe_(r[i])] )));
}
function append_(k,o){
  const sh=ss_().getSheetByName(SHEET_NAMES[k]);
  if(!sh) throw new Error('Sheet '+k+' belum tersedia. Jalankan setup().');
  sh.appendRow(SHEETS[k].map(x=>o[x]!==undefined?o[x]:''));
}
function log_(action,key,id,payload){
  try{append_('LOG',{timestamp:now_(),user:Session.getActiveUser().getEmail()||'web',action:action,sheet_key:key,record_id:id,payload:JSON.stringify(payload)});}catch(e){}
}

function seedRKK_(){
  const sh=ss_().getSheetByName(SHEET_NAMES.KEGIATAN), a=ss_().getSheetByName(SHEET_NAMES.ANGGARAN);
  if(!sh || !a) return;
  if(sh.getLastRow()>1 || a.getLastRow()>1) return;
  const kegiatan=[
    ['PEF001','Deputi Bidang Pencegahan','066.01.BL','8034','PEF','001','051','Penyebarluasan Informasi P4GN','Penyebarluasan informasi pencegahan penyalahgunaan narkotika','Pelajar','Penyebarluasan Informasi Pencegahan Penyalahgunaan Narkotika Khususnya di Kalangan Pelajar',2500000,'orang','','','','','TERKENDALI'],
    ['QDE001','Deputi Bidang Pencegahan','066.01.BL','8034','QDE','001','','Fasilitasi Pendidikan Anti Narkoba Pada Keluarga','Penguatan pendidikan anti narkoba dalam keluarga','Keluarga','Fasilitasi pendidikan anti narkoba pada keluarga',1,'kegiatan','','','','','TERKENDALI'],
    ['UBA001','Deputi Bidang Pencegahan','066.01.BL','8034','UBA','001','','Sarasehan Penguatan Pencegahan dan Pemberantasan Narkoba','Penguatan pencegahan dan pemberantasan','Peserta kegiatan','Sarasehan penguatan pencegahan',1,'kegiatan','','','','','TERKENDALI'],
    ['UBB001','Deputi Bidang Pencegahan','066.01.BL','8034','UBB','001','053','Fasilitasi Pemerintah Desa','Fasilitasi P4GN berbasis sumber daya pembangunan desa','Desa/Kelurahan','Fasilitasi Program P4GN Bidang Pencegahan Berbasis Sumber Daya Pembangunan Desa',1,'desa/kelurahan','','','','','TERKENDALI']
  ];
  const anggaran=[
    ['ANG-PEF','PEF001','','','Baseline RKK PEF',1,'paket',3666940000,3666940000,'RM','088','U','RKK'],
    ['ANG-QDE','QDE001','','','Baseline RKK QDE',1,'kegiatan',223100000,223100000,'RM','088','U','RKK'],
    ['ANG-UBA','UBA001','','','Baseline RKK UBA',1,'kegiatan',8248839000,8248839000,'RM','088','U','RKK'],
    ['ANG-UBB','UBB001','','','Baseline RKK UBB',1,'kegiatan',225222000,225222000,'RM','088','U','RKK']
  ];
  sh.getRange(2,1,kegiatan.length,kegiatan[0].length).setValues(kegiatan);
  a.getRange(2,1,anggaran.length,anggaran[0].length).setValues(anggaran);
}

function doGet(e){
  const p=(e&&e.parameter)||{}; let out;
  try{
    if(!p.api) out={ok:true,version:CFG.VERSION,message:'ABT API aktif'};
    else if(p.api==='validateAccess') {
      const q=JSON.parse(p.payload||'{}');
      const role=String(q.role||p.role||'').toUpperCase();
      const code=String(q.code||p.code||'');
      const expected=CFG.ACCESS_CODES[role]||'';
      const good=!!expected && code===expected;
      out={ok:good,role,message:good?'Akses diterima.':'Kode akses tidak sesuai untuk peran yang dipilih.'};
    }
    else if(p.api==='getBootstrapData') out=getBootstrapData();
    else if(p.api==='savePICInput') out=savePICInput_(JSON.parse(p.payload||'{}'));
    else if(p.api==='saveGeneric') out=saveGeneric_(p.key,JSON.parse(p.payload||'{}'));
    else if(p.api==='getReport') out=getBootstrapData();
    else out={ok:false,message:'API tidak dikenal.'};
  }catch(err){out={ok:false,message:String(err&&err.message||err)};}
  const cb=String(p.callback||'').replace(/[^\w.$]/g,'');
  if(cb) return ContentService.createTextOutput(cb+'('+JSON.stringify(out)+')').setMimeType(ContentService.MimeType.JAVASCRIPT);
  return ContentService.createTextOutput(JSON.stringify(out)).setMimeType(ContentService.MimeType.JSON);
}

function getBootstrapData(){
  setupSheets_(); seedRKK_();
  const kegiatan=rows_('KEGIATAN'), anggaran=rows_('ANGGARAN'), kebutuhan=rows_('KEBUTUHAN'), rencana=rows_('RENCANA'), pencairan=rows_('PENCAIRAN'), belanja=rows_('BELANJA'), monitoring=rows_('MONITORING'), hambatan=rows_('HAMBATAN'), action=rows_('ACTION'), risiko=rows_('RISIKO'), pic=rows_('PIC_INPUT');
  const pagu=anggaran.reduce((s,r)=>s+num_(r.jumlah_anggaran),0);
  const need=kebutuhan.reduce((s,r)=>s+num_(r.nilai_kebutuhan),0);
  const plan=rencana.reduce((s,r)=>s+num_(r.nominal_rencana),0);
  const cair=pencairan.reduce((s,r)=>s+num_(r.nominal_dicairkan),0);
  const bel=belanja.reduce((s,r)=>s+num_(r.nominal_realisasi),0);
  const latestMon=latestBy_(monitoring,'id_kegiatan','tanggal_monitoring');
  const latestPic=latestBy_(pic,'id_kegiatan','timestamp');

  let targetOutput=0,realOutput=0,physWeighted=0,physWeight=0;
  Object.keys(latestMon).forEach(id=>{
    const r=latestMon[id]; targetOutput+=num_(r.target_output); realOutput+=num_(r.realisasi_output);
    const t=num_(r.target_fisik_kumulatif), q=num_(r.realisasi_fisik_kumulatif);
    if(t>0){physWeighted+=(q/t*100)*1;physWeight+=1;}
  });
  if(!Object.keys(latestMon).length){
    Object.keys(latestPic).forEach(id=>{const r=latestPic[id];targetOutput+=num_(r.target_output_jumlah);realOutput+=num_(r.realisasi_output_jumlah);});
  }
  const outputPct=pct_(realOutput,targetOutput);
  const fisik=physWeight?Math.round(physWeighted/physWeight*100)/100:0;

  const byAct={};
  kegiatan.forEach(k=>{
    const ag=anggaran.filter(x=>x.id_kegiatan===k.id_kegiatan).reduce((s,x)=>s+num_(x.jumlah_anggaran),0);
    const bl=belanja.filter(x=>x.id_kegiatan===k.id_kegiatan).reduce((s,x)=>s+num_(x.nominal_realisasi),0);
    const pc=pencairan.filter(x=>x.id_kegiatan===k.id_kegiatan).reduce((s,x)=>s+num_(x.nominal_dicairkan),0);
    const rp=rencana.filter(x=>x.id_kegiatan===k.id_kegiatan).reduce((s,x)=>s+num_(x.nominal_rencana),0);
    const lm=latestMon[k.id_kegiatan]||{};
    const target= num_(lm.target_anggaran_kumulatif)||rp;
    const real= num_(lm.realisasi_anggaran_kumulatif)||bl;
    const dev=target?pct_(Math.max(target-real,0),target):0;
    const status=deriveStatus_(dev, lm.realisasi_fisik_kumulatif, lm.target_fisik_kumulatif, k.status);
    byAct[k.id_kegiatan]={id:k.id_kegiatan,kode:[k.kode_program,k.kode_kro,k.kode_ro].filter(Boolean).join('.'),nama:k.nama_kegiatan||'-',pagu:ag,real:bl,cair:pc,rencana:rp,target:target,pic:k.pic||lm.pic||latestPic[k.id_kegiatan]?.pic||'-',fisik:num_(lm.realisasi_fisik_kumulatif),status:status};
  });
  const activities=Object.values(byAct);
  const attention=activities.filter(x=>x.status!=='TERKENDALI').map(x=>({kode:x.kode,problem:x.status==='RISIKO TINGGI'?'Deviasi pengendalian memerlukan perhatian':'Realisasi belum sesuai target',impact:'Perlu tindak lanjut pada pelaksanaan dan monitoring',status:x.status}));

  const kendali=activities.map(x=>({kode:x.kode,nama:x.nama,target:x.target||x.rencana||x.pagu,real:x.real,dev:x.target?pct_(Math.max(x.target-x.real,0),x.target):0,status:x.status}));
  const realisasi=[];
  rencana.forEach(x=>realisasi.push({tanggal:dateKey_(x.tanggal_rencana),kode:codeById_(x.id_kegiatan,kegiatan),jenis:'Rencana Pencairan',rencana:num_(x.nominal_rencana),aktual:0,status:x.status||'RENCANA'}));
  pencairan.forEach(x=>realisasi.push({tanggal:dateKey_(x.tanggal_pencairan||x.tanggal_pengajuan),kode:codeById_(x.id_kegiatan,kegiatan),jenis:'Pencairan',rencana:0,aktual:num_(x.nominal_dicairkan),status:'REALISASI'}));
  belanja.forEach(x=>realisasi.push({tanggal:dateKey_(x.tanggal_realisasi),kode:codeById_(x.id_kegiatan,kegiatan),jenis:'Belanja',rencana:0,aktual:num_(x.nominal_realisasi),status:x.verifikasi||'REALISASI'}));
  realisasi.sort((a,b)=>String(b.tanggal).localeCompare(String(a.tanggal)));

  const monthly=buildMonthly_(rencana,pencairan,belanja);
  const monRows=monitoring.slice().sort((a,b)=>String(b.tanggal_monitoring).localeCompare(String(a.tanggal_monitoring))).slice(0,100).map(x=>({periode:x.periode,kode:codeById_(x.id_kegiatan,kegiatan),target:num_(x.target_fisik_kumulatif),real:num_(x.realisasi_fisik_kumulatif),kendala:x.kendala||'',pic:x.pic||'',tanggal:x.tanggal_monitoring}));
  const hamb=hambatan.slice(-100).reverse().map(x=>({kode:codeById_(x.id_kegiatan,kegiatan),masalah:x.masalah,root:x.root_cause,dampak:x.dampak,level:x.tingkat_dampak,status:x.status}));
  const act=action.slice(-100).reverse().map(x=>({kode:codeById_(x.id_kegiatan,kegiatan),temuan:x.temuan,tindakan:x.tindakan,pic:x.pic,deadline:dateKey_(x.deadline),status:x.status}));
  const risk=risiko.slice(-100).reverse().map(x=>({kode:codeById_(x.id_kegiatan,kegiatan),risiko:x.risiko,penyebab:x.penyebab,prob:x.probabilitas,dampak:x.dampak,level:x.level_risiko,mitigasi:x.mitigasi,pic:x.pic,status:x.status}));
  const picOut=pic.slice(-100).reverse().map(x=>({periode:x.periode,direktorat:x.direktorat,id_kegiatan:x.id_kegiatan,pic:x.pic,pagu:num_(x.pagu_abt),target:num_(x.target_anggaran_nominal),real:num_(x.realisasi_anggaran_nominal),outputTarget:num_(x.target_output_jumlah),outputReal:num_(x.realisasi_output_jumlah),status:x.status,kendala:x.kendala_utama,tindak:x.tindak_lanjut}));

  return {ok:true,version:CFG.VERSION,summary:{pagu,kebutuhan:need,rencana:plan,cair,belanja:bel,sisa:pagu-bel,fisik,outputPct,targetOutput,realOutput},monthly,activities,attention,pic:picOut,kendali,realisasi,monitoring:monRows,hambatan:hamb,action:act,risk};
}
function codeById_(id,list){const x=list.find(r=>r.id_kegiatan===id);return x?[x.kode_program,x.kode_kro,x.kode_ro].filter(Boolean).join('.'):'-';}
function latestBy_(rows,key,dateField){const out={};rows.forEach(r=>{const id=r[key];if(!id)return;const d=String(r[dateField]||'');if(!out[id]||d>String(out[id][dateField]||''))out[id]=r;});return out;}
function deriveStatus_(dev,realPhys,targetPhys,fallback){
  if(String(fallback||'').toUpperCase()==='KRITIS') return 'KRITIS';
  if(targetPhys && num_(realPhys)<num_(targetPhys)-20) return 'RISIKO TINGGI';
  if(dev>25) return 'PERLU PERHATIAN';
  return 'TERKENDALI';
}
function buildMonthly_(rencana,pencairan,belanja){
  const map={};for(let i=1;i<=12;i++){const k='2026-'+String(i).padStart(2,'0');map[k]={m:monthLabel_(i),p:0,c:0,r:0};}
  rencana.forEach(x=>{const k=monthKey_(x.tanggal_rencana);if(map[k])map[k].p+=num_(x.nominal_rencana);});
  pencairan.forEach(x=>{const k=monthKey_(x.tanggal_pencairan||x.tanggal_pengajuan);if(map[k])map[k].c+=num_(x.nominal_dicairkan);});
  belanja.forEach(x=>{const k=monthKey_(x.tanggal_realisasi);if(map[k])map[k].r+=num_(x.nominal_realisasi);});
  let p=0,c=0,r=0;return Object.keys(map).sort().map(k=>{p+=map[k].p;c+=map[k].c;r+=map[k].r;return {m:map[k].m,p,c,r};});
}

function savePICInput_(p){
  setupSheets_(); const id=uid_('PIC');
  const row={id_input:id,timestamp:now_(),periode:p.periode||'',direktorat:p.direktorat||'',id_kegiatan:p.id_kegiatan||'',tujuan:p.tujuan||'',sasaran:p.sasaran||'',deadline:p.deadline||'',pic:p.pic||'',pagu_abt:num_(p.pagu),target_anggaran_nominal:num_(p.target),target_anggaran_persen:pct_(p.target,p.pagu),realisasi_anggaran_nominal:num_(p.real),realisasi_anggaran_persen:pct_(p.real,p.target),deviasi_persen:pct_(Math.max(num_(p.target)-num_(p.real),0),p.target),target_output_jumlah:num_(p.outputTarget),target_output_persen:100,realisasi_output_jumlah:num_(p.outputReal),realisasi_output_persen:pct_(p.outputReal,p.outputTarget),status:p.status||'TERKENDALI',kendala_utama:p.kendala||'',tindak_lanjut:p.tindak||'',catatan_pembaku:'',keterangan:'',sumber_input:'PIC'};
  append_('PIC_INPUT',row); log_('CREATE','PIC_INPUT',id,row); return {ok:true,id,message:'Data PIC berhasil disimpan.'};
}
function saveGeneric_(key,p){
  const allowed=['MONITORING','HAMBATAN','ACTION','RISIKO','KEBUTUHAN','RENCANA','PENCAIRAN','BELANJA','DOKUMEN'];
  if(allowed.indexOf(key)<0) return {ok:false,message:'Modul tidak valid.'};
  setupSheets_(); const ids={MONITORING:'id_monitoring',HAMBATAN:'id_hambatan',ACTION:'id_action',RISIKO:'id_risk',KEBUTUHAN:'id_kebutuhan',RENCANA:'id_rencana_cair',PENCAIRAN:'id_transaksi',BELANJA:'id_realisasi',DOKUMEN:'id_dokumen'}; const o=Object.assign({},p); const idKey=ids[key]; o[idKey]=o[idKey]||uid_(key); o.created_at=o.created_at||now_(); o.updated_at=now_(); append_(key,o); log_('CREATE',key,o[idKey],o); return {ok:true,id:o[idKey],message:'Data tersimpan.'};
}
