(() => {
'use strict';
// ABT 2026 FRONTEND 9.0 — SAFE ANALYTIC LAYER
// Code.gs tidak diubah. Dashboard baseline tetap dari Spreadsheet Kendali;
// Data PIC dan histori/analisis pengendalian berasal dari Spreadsheet PIC.

const C=window.ABT_CONFIG;
const state={role:'',selectedRole:'PIC',access:false,code:'',view:'pic',data:{},cache:{},loading:false,error:'',picRequest:0,requestSeq:0};
const $=s=>document.querySelector(s), esc=v=>String(v??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
const num=v=>{if(v===null||v===undefined||v==='')return 0;if(typeof v==='number')return Number.isFinite(v)?v:0;let s=String(v).replace(/\s/g,'').replace(/Rp/gi,'');if(s.includes('.')&&s.includes(','))s=s.replace(/\./g,'').replace(',','.');else if(s.includes(','))s=s.replace(',','.');else s=s.replace(/\.(?=\d{3}(?:\D|$))/g,'');const n=Number(s.replace(/[^0-9.-]/g,''));return Number.isFinite(n)?n:0};
const rup=v=>{if(v===null||v===undefined||v==='')return '—';const n=Number(v);return Number.isFinite(n)?'Rp '+n.toLocaleString('id-ID'): '—'};
const pct=v=>{const n=Number(v);return Number.isFinite(n)?n.toLocaleString('id-ID',{maximumFractionDigits:2})+'%':'—'};
const safePct=(a,b)=>b?Math.round(Number(a||0)/Number(b)*10000)/100:0;
const status=s=>{s=String(s||'TERKENDALI').toUpperCase();let c=s.includes('KRITIS')?'crit':s.includes('RISIKO')?'risk':s.includes('PERHATIAN')||s.includes('OPEN')||s.includes('PROSES')?'warn':'ok';return `<span class="status ${c}">${esc(s)}</span>`};
function api(action,payload={},attempt=0){
  if(!C?.API_URL)return Promise.resolve({ok:false,message:'Layanan data belum tersedia.'});
  const cb='abt6_'+Date.now()+'_'+Math.random().toString(36).slice(2);
  const u=new URL(C.API_URL);u.searchParams.set('api',action);u.searchParams.set('callback',cb);u.searchParams.set('_',Date.now());
  if(action==='validateAccess'){u.searchParams.set('role',payload.role||'');u.searchParams.set('code',payload.code||'')}
  else if(Object.keys(payload).length)u.searchParams.set('payload',JSON.stringify(payload));
  return new Promise(resolve=>{
    let done=false,script;
    const finish=x=>{if(done)return;done=true;try{delete window[cb]}catch(e){}script?.remove();resolve(x||{ok:false,message:'Respons kosong dari server.'})};
    window[cb]=finish;script=document.createElement('script');script.src=u.toString();script.onerror=()=>{if(attempt<1){setTimeout(()=>api(action,payload,attempt+1).then(resolve),350)}else finish({ok:false,message:'Layanan data tidak dapat dihubungi.'})};document.body.appendChild(script);
    setTimeout(()=>{if(done)return;if(attempt<1){try{delete window[cb]}catch(e){}script?.remove();setTimeout(()=>api(action,payload,attempt+1).then(resolve),350)}else finish({ok:false,message:'Layanan data belum merespons. Silakan coba lagi.'})},10000)
  })
}
function allowed(role){if(role==='PIC')return ['pic'];if(role==='PENGENDALI')return ['dashboard','inbox','kendali','realisasi','monitoring','hambatan','action','risk','master','report','docs'];if(role==='PIMPINAN')return ['report'];return []}
const navItems=[['dashboard','⌂','Dashboard Pengendali'],['inbox','▣','Data Masuk PIC'],['kendali','▤','Kartu Kendali'],['realisasi','◫','Rencana & Realisasi'],['monitoring','◷','Monitoring Mingguan'],['hambatan','⚠','Hambatan & Root Cause'],['action','✓','Corrective Action'],['risk','◇','Risk Register'],['master','☷','Master Data'],['report','▥','Laporan'],['docs','▧','Dokumentasi']];
function drawNav(){const a=allowed(state.role);$('#nav').innerHTML=navItems.filter(x=>a.includes(x[0])).map(x=>`<button class="nav-item ${state.view===x[0]?'active':''}" data-view="${x[0]}">${x[1]} <span>${x[2]}</span></button>`).join('');document.querySelectorAll('.nav-item').forEach(b=>b.onclick=()=>showView(b.dataset.view))}
function showView(v){
  if(!allowed(state.role).includes(v))return;
  state.view=v;
  state.error='';
  state.loading=v!=='pic';
  drawNav();
  render();
  if(v!=='pic')loadModule(v);
}
function setLoading(v){state.loading=v;render()}
async function access(){const code=$('#accessCode').value.trim();if(!code){$('#accessMsg').textContent='Kode akses wajib diisi.';return}$('#accessMsg').textContent='Memeriksa akses…';const r=await api('validateAccess',{role:state.selectedRole,code});if(!r.ok){$('#accessMsg').textContent=r.message||'Kode akses tidak sesuai.';return}state.role=state.selectedRole;state.code=code;state.access=true;try{sessionStorage.setItem('abt_access',JSON.stringify({role:state.role,code:state.code}))}catch(e){};state.view=state.role==='PIC'?'pic':state.role==='PIMPINAN'?'report':'dashboard';document.body.classList.remove('locked');$('#modal').classList.add('hidden');$('#accessCode').value='';$('#roleLabel').textContent=state.role==='PENGENDALI'?'Tim Pengendali':state.role==='PIMPINAN'?'Pimpinan / Laporan':'PIC Kegiatan';$('#roleSub').textContent='Akses aktif';drawNav();await initialLoad()}
async function initialLoad(){
  setLoading(true);
  try{
    if(state.role==='PIC'){
      const r=await api('getPICBootstrapData');
      state.loading=false;
      if(!r.ok){state.error=r.message||'Data belum dapat dibaca.';render();return}
      state.data=r;render();return;
    }
    if(state.role==='PIMPINAN'){
      const [r,p]=await Promise.all([api('getLightReport'),api('getPICInbox')]);
      state.loading=false;
      if(!r.ok){state.error=r.message||'Data laporan belum dapat dibaca.';render();return}
      state.data=r;state.cache.report=r;state.cache.inbox=p.ok?p:null;
      render();return;
    }
    // PENGENDALI:
    // Dashboard = tetap memakai Spreadsheet Kendali sebagai sumber baseline keuangan.
    // Data PIC = hanya dari Spreadsheet PIC untuk monitoring/analisis pengendalian.
    const [d,p]=await Promise.all([api('getDashboardData'),api('getPICInbox')]);
    state.loading=false;
    if(!d.ok){state.error=d.message||'Data Dashboard belum dapat dibaca.';render();return}
    if(!p.ok){state.error=p.message||'Data PIC belum dapat dibaca.';render();return}
    state.data=Object.assign({},d,{picInbox:p.picInbox||[],picActivities:p.activities||[]});
    state.cache.dashboard=d;
    state.cache.inbox=p;
    render();
  }catch(e){
    state.loading=false;state.error=e?.message||'Data awal tidak dapat dimuat.';render();
  }
}

async function loadModule(v){
  // Semua modul pengendalian dibaca dari data yang sudah dimuat.
  // Hanya modul Master/Laporan/Dokumentasi yang tetap meminta API masing-masing.
  state.loading=true;state.error='';render();
  try{
    if(v==='dashboard'){
      const [d,p]=await Promise.all([api('getDashboardData'),api('getPICInbox')]);
      if(!d.ok)throw new Error(d.message||'Dashboard belum dapat dibaca.');
      if(!p.ok)throw new Error(p.message||'Data PIC belum dapat dibaca.');
      state.cache.dashboard=d;state.cache.inbox=p;
      state.data=Object.assign({},d,{picInbox:p.picInbox||[],picActivities:p.activities||[]});
    }else if(v==='inbox'){
      const p=await api('getPICInbox');if(!p.ok)throw new Error(p.message||'Data PIC belum dapat dibaca.');
      state.cache.inbox=p;state.data=Object.assign({},state.data,{picInbox:p.picInbox||[],picActivities:p.activities||[]});
    }else if(v==='master'){
      const r=await api('getMasterData',{code:state.code});if(!r.ok)throw new Error(r.message||'Master Data belum dapat dibaca.');state.cache.master=r;
    }else if(v==='docs'){
      const r=await api('getDokumentasi',{code:state.code});if(!r.ok)throw new Error(r.message||'Dokumentasi belum dapat dibaca.');state.cache.docs=r;
    }else if(v==='report'){
      const [d,p]=await Promise.all([api('getReport',{code:state.code}),api('getPICInbox')]);
      if(!d.ok)throw new Error(d.message||'Laporan belum dapat dibaca.');
      if(!p.ok)throw new Error(p.message||'Data PIC belum dapat dibaca.');
      state.cache.report=d;state.cache.inbox=p;state.data=Object.assign({},d,{picInbox:p.picInbox||[],picActivities:p.activities||[]});
    }else{
      // Kartu Kendali s.d. Risk Register adalah hasil olahan dari input PIC.
      // Tidak ada input ulang yang dibuat di sini.
      const p=await api('getPICInbox');if(!p.ok)throw new Error(p.message||'Data PIC belum dapat dibaca.');
      state.cache.inbox=p;state.data=Object.assign({},state.data,{picInbox:p.picInbox||[],picActivities:p.activities||[]});
    }
    state.loading=false;render();
  }catch(e){
    state.loading=false;state.error=e?.message||'Modul tidak dapat ditampilkan.';render();
  }
}
function refresh(){state.cache={};loadModule(state.view)}
function render(){
  drawNav();
  const map={dashboard:dashboard,pic:picView,inbox:inboxView,kendali:kendaliView,realisasi:realisasiView,monitoring:monitoringView,hambatan:hambatanView,action:actionView,risk:riskView,master:masterView,report:reportView,docs:docsView};
  const fn=map[state.view]||dashboard;
  if(state.loading){$('#content').innerHTML='<section class="panel loading-panel"><div class="loading">Memuat data…</div></section>';return}
  if(state.error){$('#content').innerHTML=`<section class="panel error-panel"><h3>Data belum tersedia</h3><p>${esc(state.error)}</p><button class="secondary" onclick="refresh()">↻ Coba Lagi</button></section>`;return}
  try{$('#content').innerHTML=fn()}catch(e){state.error=e?.message||'Tampilan modul mengalami kesalahan.';console.error('ABT render error:',e);$('#content').innerHTML=`<section class="panel error-panel"><h3>Modul tidak dapat ditampilkan</h3><p>${esc(state.error)}</p><button class="secondary" onclick="refresh()">↻ Coba Lagi</button></section>`}
}

/* =========================
   LAPIS ANALISIS DATA PIC
   Sumber: Spreadsheet PIC melalui getPICInbox
   Dashboard baseline keuangan tetap dari Spreadsheet Kendali.
   ========================= */
const PIC_PERIODS=['September 2026','Oktober 2026','Nopember 2026','November 2026','Desember 2026'];
const periodRank=p=>{
  const s=String(p||'').toLowerCase().trim();
  const i=PIC_PERIODS.findIndex(x=>x.toLowerCase()===s);
  return i<0?99:i;
};
const picKey=x=>String(x?.subkegiatan_id||x?.id_kegiatan||x?.kode||x?.nama_kegiatan||x?.kegiatan||'').trim();
const picStatus=x=>{
  const s=String(x?.status||'').toUpperCase().trim();
  if(s==='HIJAU'||s==='KUNING'||s==='MERAH')return s;
  const t=num(x?.target_anggaran_nominal),r=num(x?.realisasi_anggaran_nominal);
  const to=num(x?.target_output_jumlah),ro=num(x?.realisasi_output_jumlah);
  const dev=t?((r/t)-(num(x?.target_anggaran_persen)||0)):0;
  const out=to?ro/to:0;
  if(dev>=-0.05&&out>=0.90)return'HIJAU';
  if(dev>=-0.15&&out>=0.70)return'KUNING';
  return'MERAH';
};
function picAnalysis(){
  const rows=((state.cache.inbox||{}).picInbox||state.data.picInbox||[]).filter(x=>x&&(x.id_input||x.id_kegiatan||x.subkegiatan_id||x.nama_kegiatan));
  const sorted=rows.slice().sort((a,b)=>{
    const pr=periodRank(a.periode)-periodRank(b.periode);
    if(pr)return pr;
    return String(a.timestamp||'').localeCompare(String(b.timestamp||''));
  });
  const latestMap={};
  sorted.forEach(x=>{const k=picKey(x);if(k)latestMap[k]=x});
  const latest=Object.values(latestMap);
  const statusCount={HIJAU:0,KUNING:0,MERAH:0,LAIN:0};
  latest.forEach(x=>{const s=picStatus(x);if(statusCount[s]!==undefined)statusCount[s]++;else statusCount.LAIN++});
  const weekly={};
  sorted.forEach(x=>{
    const p=String(x.periode||'').trim()||'Periode belum diisi';
    if(!weekly[p])weekly[p]={periode:p,jumlah:0,target:0,real:0,outputTarget:0,outputReal:0,deviasi:0};
    const w=weekly[p];w.jumlah++;w.target+=num(x.target_anggaran_nominal);w.real+=num(x.realisasi_anggaran_nominal);w.outputTarget+=num(x.target_output_jumlah);w.outputReal+=num(x.realisasi_output_jumlah);w.deviasi+=num(x.deviasi_persen);
  });
  const weeklyRows=Object.values(weekly).sort((a,b)=>periodRank(a.periode)-periodRank(b.periode)||String(a.periode).localeCompare(String(b.periode)));
  weeklyRows.forEach(w=>{w.outputPct=w.outputTarget?safePct(w.outputReal,w.outputTarget):0;w.realPct=w.target?safePct(w.real,w.target):0});
  const totals=latest.reduce((o,x)=>{
    o.target+=num(x.target_anggaran_nominal);o.real+=num(x.realisasi_anggaran_nominal);
    o.outputTarget+=num(x.target_output_jumlah);o.outputReal+=num(x.realisasi_output_jumlah);
    o.pagu+=num(x.pagu_abt);return o;
  },{pagu:0,target:0,real:0,outputTarget:0,outputReal:0});
  const recommendations=latest.map(x=>{
    const s=picStatus(x),kendala=String(x.kendala_utama||'').trim(),tindak=String(x.tindak_lanjut||'').trim();
    let level='TERKENDALI',text='Lanjutkan pelaksanaan dan monitoring mingguan.';
    if(s==='MERAH'){level='KRITIS';text='Segera lakukan klarifikasi deviasi anggaran/output dan tetapkan rencana pemulihan dengan PIC.'}
    else if(s==='KUNING'){level='PERHATIAN';text='Lakukan monitoring lebih dekat dan minta PIC memastikan tindak lanjut sampai periode berikutnya.'}
    if(kendala)text+=' Kendala PIC: '+kendala+'.';
    if(tindak)text+=' Tindak lanjut tercatat: '+tindak+'.';
    return{key:picKey(x),subKegiatan:x.nama_kegiatan||x.kegiatan||x.id_kegiatan||x.subkegiatan_id||'-',pic:x.pic||'-',pekan:x.periode||'-',status:s,level,rekomendasi:text,target:num(x.target_anggaran_nominal),real:num(x.realisasi_anggaran_nominal),outputTarget:num(x.target_output_jumlah),outputReal:num(x.realisasi_output_jumlah),kendala,tindak};
  }).sort((a,b)=>(({KRITIS:0,PERHATIAN:1,TERKENDALI:2}[a.level]||9)-({KRITIS:0,PERHATIAN:1,TERKENDALI:2}[b.level]||9)));
  const hambatan=latest.filter(x=>String(x.kendala_utama||'').trim()).map(x=>({kode:x.id_kegiatan||x.subkegiatan_id||x.kode||'-',subKegiatan:x.nama_kegiatan||x.kegiatan||'-',masalah:x.kendala_utama,root:'Perlu klarifikasi kepada PIC',dampak:picStatus(x)==='MERAH'?'Berpotensi mengganggu target anggaran/output':'Perlu dipantau',level:picStatus(x),status:'OPEN',pic:x.pic||'-',periode:x.periode||'-'}));
  const actions=recommendations.filter(x=>x.level!=='TERKENDALI').map(x=>({kode:x.key,subKegiatan:x.subKegiatan,temuan:x.status==='MERAH'?'Status MERAH berdasarkan laporan PIC':'Status KUNING berdasarkan laporan PIC',tindakan:x.rekomendasi,pic:x.pic,deadline:'Periode berikutnya',status:'PROSES'}));
  const risks=recommendations.filter(x=>x.level!=='TERKENDALI').map(x=>({kode:x.key,risiko:x.status==='MERAH'?'Keterlambatan/ketidaktercapaian target':'Potensi deviasi pelaksanaan',penyebab:x.kendala||'Belum ada kendala yang dijelaskan',prob:x.status==='MERAH'?'TINGGI':'SEDANG',dampak:x.status==='MERAH'?'TINGGI':'SEDANG',level:x.status,mitigasi:x.rekomendasi,pic:x.pic,status:'OPEN'}));
  return {rows,latest,statusCount,weeklyRows,totals,recommendations,hambatan,actions,risks};
}
function septemberChartData(base,analysis){
  const names=['September 2026','Oktober 2026','Nopember 2026','Desember 2026'];
  const by={};analysis.weeklyRows.forEach(w=>{by[w.periode]=w});
  return names.map(name=>({m:name.replace(' 2026',''),target:by[name]?.target||0,real:by[name]?.real||0,outputTarget:by[name]?.outputTarget||0,outputReal:by[name]?.outputReal||0}));
}
function analysisTableRows(a){
  return a.latest.map(x=>{
    const s=picStatus(x);
    return `<tr><td>${esc(x.periode||'-')}</td><td><b>${esc(x.subkegiatan_id||x.id_kegiatan||x.kode||'-')}</b><br>${esc(x.nama_kegiatan||x.kegiatan||'-')}</td><td>${esc(x.pic||'-')}</td><td>${rup(x.target_anggaran_nominal)}</td><td>${rup(x.realisasi_anggaran_nominal)}</td><td>${pct(x.target_output_jumlah?safePct(x.realisasi_output_jumlah,x.target_output_jumlah):0)}</td><td>${status(s)}</td></tr>`;
  }).join('');
}
function dashboard(){
  const d=state.cache.dashboard||state.data||{},s=d.summary||{},a=picAnalysis(),c=a.statusCount;
  const chart=septemberChartData(d,a);
  const max=Math.max(...chart.flatMap(x=>[x.target,x.real]),1);
  const target=a.totals.target,real=a.totals.real,outT=a.totals.outputTarget,outR=a.totals.outputReal;
  const critical=a.recommendations.filter(x=>x.level==='KRITIS'),attention=a.recommendations.filter(x=>x.level==='PERHATIAN');
  const bar=v=>Math.max(0,Math.min(100,(Number(v)||0)/max*100));
  return `<div class="page-title"><div><h2>Dashboard Pengendalian ABT 2026</h2><p>Baseline keuangan tetap berasal dari Spreadsheet Kendali; progres, status dan analisis pelaksanaan berasal dari laporan PIC.</p></div><div class="toolbar"><button class="secondary" onclick="refresh()">↻ Perbarui</button><button class="primary" onclick="window.print()">Cetak</button></div></div>
  <div class="cards">
    <div class="metric blue"><div class="label">Total Pagu Kendali</div><div class="value">${rup(s.pagu)}</div><div class="sub">Baseline anggaran</div></div>
    <div class="metric green"><div class="label">Realisasi Belanja Kendali</div><div class="value">${rup(s.belanja)}</div><div class="sub">Data keuangan Kendali</div></div>
    <div class="metric amber"><div class="label">Subkegiatan PIC</div><div class="value">${a.latest.length}</div><div class="sub">laporan terbaru</div></div>
    <div class="metric green"><div class="label">🟢 Hijau</div><div class="value">${c.HIJAU}</div><div class="sub">terkendali</div></div>
    <div class="metric amber"><div class="label">🟡 Kuning</div><div class="value">${c.KUNING}</div><div class="sub">perlu perhatian</div></div>
    <div class="metric orange"><div class="label">🔴 Merah</div><div class="value">${c.MERAH}</div><div class="sub">perlu intervensi</div></div>
  </div>
  <div class="grid2">
    <section class="panel"><div class="panel-head"><h3>Tren ABT September–Desember 2026</h3><span class="muted">Target vs realisasi laporan PIC</span></div>
      <div class="chart"><div class="bars">${chart.map(x=>`<div class="bar-group"><div class="bar plan" title="Target ${rup(x.target)}" style="height:${bar(x.target)}%"></div><div class="bar real" title="Realisasi ${rup(x.real)}" style="height:${bar(x.real)}%"></div></div>`).join('')}</div><div class="months">${chart.map(x=>`<span>${esc(x.m)}</span>`).join('')}</div></div>
      <div class="kpi-note"><span class="dot a"></span>Target Anggaran <span class="dot g"></span>Realisasi Anggaran</div>
    </section>
    <section class="panel"><div class="panel-head"><h3>Status Pengendalian</h3><span class="muted">Laporan Pelaksanaan terbaru per subkegiatan</span></div>
      <div class="report-grid"><div class="report-box"><span>Hijau</span><b>${c.HIJAU}</b></div><div class="report-box"><span>Kuning</span><b>${c.KUNING}</b></div><div class="report-box"><span>Merah</span><b>${c.MERAH}</b></div><div class="report-box"><span>Total</span><b>${a.latest.length}</b></div></div>
      <div class="muted" style="margin-top:12px">Status mengikuti laporan pelaksanaan terbaru.</div>
    </section>
  </div>
  <div class="grid2">
    <section class="panel"><div class="panel-head"><h3>Rencana & Realisasi dari PIC</h3><span class="muted">${rup(real)} / ${rup(target)}</span></div>
      <div class="progress-row"><div class="progress-label"><span>Realisasi Anggaran</span><b>${target?pct(safePct(real,target)):0}%</b></div><div class="track"><div class="fill" style="width:${Math.min(100,Math.max(0,target?real/target*100:0))}%"></div></div></div>
      <div class="progress-row"><div class="progress-label"><span>Realisasi Output</span><b>${outT?pct(safePct(outR,outT)):0}%</b></div><div class="track"><div class="fill" style="width:${Math.min(100,Math.max(0,outT?outR/outT*100:0))}%"></div></div></div>
      <div class="report-grid"><div class="report-box"><span>Target Anggaran PIC</span><b>${rup(target)}</b></div><div class="report-box"><span>Realisasi Anggaran PIC</span><b>${rup(real)}</b></div><div class="report-box"><span>Target Output</span><b>${outT.toLocaleString('id-ID')}</b></div><div class="report-box"><span>Realisasi Output</span><b>${outR.toLocaleString('id-ID')}</b></div></div>
    </section>
    <section class="panel"><div class="panel-head"><h3>Prioritas Tindakan Pengendali</h3><span class="muted">Analisis otomatis</span></div>
      ${critical.concat(attention).slice(0,6).map(x=>`<div style="padding:10px 0;border-bottom:1px solid #edf2f6"><b>${x.level==='KRITIS'?'🔴':'🟡'} ${esc(x.subKegiatan)}</b><div class="muted">PIC: ${esc(x.pic)} · ${esc(x.pekan)}</div><div style="font-size:12px;margin-top:4px">${esc(x.rekomendasi)}</div></div>`).join('')||'<div class="empty">Tidak ada rekomendasi intervensi dari laporan pelaksanaan terbaru.</div>'}
    </section>
  </div>
  <section class="panel"><div class="panel-head"><h3>Ringkasan Laporan Pelaksanaan</h3><button class="secondary" onclick="showView('inbox')">Buka Data Masuk PIC</button></div>
    <div class="table-wrap"><table class="data-table"><thead><tr><th>Pekan</th><th>Sub Kegiatan</th><th>PIC</th><th>Target Anggaran</th><th>Realisasi</th><th>Output</th><th>Status</th></tr></thead><tbody>${analysisTableRows(a)||'<tr><td colspan="7" class="empty">Belum ada data pelaksanaan.</td></tr>'}</tbody></table></div>
  </section>`;
}
function picView(){const acts=state.data.activities||[];return `<div class="page-title"><div><h2>Input Data PIC</h2><p>PIC memilih kegiatan berdasarkan kode <b>dan nama kegiatan</b>. Pagu diambil otomatis dari Master Anggaran.</p></div></div><section class="panel"><div class="hint-card"><b>Cara membaca kode kegiatan:</b> kode adalah identitas unik pada Master RKK. Nama kegiatan di samping kode menjelaskan substansi kegiatan, sehingga PIC tidak perlu menghafal arti kode.</div><div class="form-grid"><div class="field"><label>Periode<select id="pPeriode"><option>September 2026</option><option>Oktober 2026</option><option>Nopember 2026</option><option>Desember 2026</option></select></label></div><div class="field"><label>Direktorat<select id="pDir"><option>Direktorat Informasi & Edukasi</option><option>Direktorat Advokasi</option></select></label></div><div class="field"><label>Nama PIC<input id="pPIC" placeholder="Nama personel PIC"></label></div><div class="field"><label>Deadline Kegiatan<input id="pDeadline" type="date"></label></div><div class="field full"><label>Pilih Kegiatan<select id="pKegiatan"><option value="">Pilih kode — nama kegiatan</option>${acts.map(x=>`<option value="${esc(x.id_kegiatan)}">${esc(x.id_kegiatan)} — ${esc(x.nama_kegiatan)}</option>`).join('')}</select></label><span class="help">Pilihan menampilkan kode dan nama kegiatan agar jelas pada layar HP maupun laptop.</span></div></div><div id="picContext" class="activity-context hidden"></div><div id="picFields" class="hidden"><div class="section-title"><h3 style="margin:18px 0 8px">Kondisi Periode Berjalan</h3></div><div class="form-grid"><div class="field"><label>Target Anggaran (Rp)<input id="pTargetA" inputmode="numeric" placeholder="0"></label></div><div class="field"><label>Realisasi Anggaran (Rp)<input id="pRealA" inputmode="numeric" placeholder="0"></label></div><div class="field"><label>Target Output<input id="pTargetO" type="number" min="0" placeholder="0"></label></div><div class="field"><label>Realisasi Output<input id="pRealO" type="number" min="0" placeholder="0"></label></div><div class="field full"><label>Kendala Utama<textarea id="pKendala" placeholder="Tuliskan kendala bila ada."></textarea></label></div><div class="field full"><label>Tindak Lanjut<textarea id="pTindak" placeholder="Tuliskan tindak lanjut yang dilakukan/direncanakan."></textarea></label></div><div class="field full"><label>Catatan<input id="pCatatan" placeholder="Catatan tambahan"></label></div></div><div class="form-actions"><button class="primary" id="savePicBtn">Simpan Data PIC</button></div><div id="picMsg" class="msg"></div></div></section>`}
async function loadPICContext(){const id=$('#pKegiatan').value;if(!id){$('#picContext').classList.add('hidden');$('#picFields').classList.add('hidden');return}const req=++state.picRequest;const a=(state.data.activities||[]).find(x=>String(x.id_kegiatan)===String(id))||{};$('#picContext').classList.remove('hidden');$('#picFields').classList.add('hidden');$('#picContext').innerHTML=`<section class="panel"><div class="context-head"><div><div class="context-code">${esc(a.id_kegiatan||id)}</div><div class="context-name">${esc(a.nama_kegiatan||'Nama kegiatan')}</div></div></div><div class="context-grid"><div class="context-box"><small>Tujuan</small><b>${esc(a.tujuan||'—')}</b></div><div class="context-box"><small>Sasaran</small><b>${esc(a.sasaran||'—')}</b></div><div class="context-box"><small>Output</small><b>${esc(a.output||'—')}</b></div><div class="context-box"><small>Target Master</small><b>${esc(a.target_volume||'—')} ${esc(a.satuan||'')}</b></div><div class="context-box"><small>Pagu Kegiatan</small><b>${rup(a.pagu)}</b></div></div></section>`;try{const r=await api('getPICContext',{id_kegiatan:id,periode:$('#pPeriode').value});if(req!==state.picRequest||$('#pKegiatan').value!==id)return;if(!r.ok)throw new Error(r.message);const f=r.finance||{},m=r.master||{},l=r.latest||{};$('#picContext').innerHTML=`<section class="panel"><div class="context-head"><div><div class="context-code">${esc(m.id_kegiatan||id)}</div><div class="context-name">${esc(m.nama_kegiatan||'Nama kegiatan')}</div></div></div><div class="context-grid"><div class="context-box"><small>Tujuan</small><b>${esc(m.tujuan||'—')}</b></div><div class="context-box"><small>Sasaran</small><b>${esc(m.sasaran||'—')}</b></div><div class="context-box"><small>Output</small><b>${esc(m.output||'—')}</b></div><div class="context-box"><small>Target Master</small><b>${esc(m.target_volume||'—')} ${esc(m.satuan||'')}</b></div><div class="context-box"><small>Pagu Kegiatan</small><b>${rup(f.pagu)}</b></div><div class="context-box"><small>Realisasi Sebelumnya</small><b>${rup(f.belanja)}</b></div><div class="context-box"><small>Sisa Pagu</small><b>${rup(f.sisa)}</b></div><div class="context-box"><small>Rencana Pencairan</small><b>${rup(f.rencana)}</b></div><div class="context-box"><small>Pencairan Aktual</small><b>${rup(f.cair)}</b></div><div class="context-box"><small>Realisasi PIC Terakhir</small><b>${l.realisasi_output_jumlah??'—'}</b></div></div></section>`;$('#picFields').classList.remove('hidden')}catch(e){if(req!==state.picRequest||$('#pKegiatan').value!==id)return;$('#picContext').innerHTML=`<section class="panel error-panel"><h3>Data kegiatan belum dapat dibaca</h3><p>${esc(e.message)}</p><button class="secondary" onclick="loadPICContext()">↻ Coba lagi</button></section>`}}
async function savePIC(){const p={periode:$('#pPeriode').value,direktorat:$('#pDir').value,id_kegiatan:$('#pKegiatan').value,pic:$('#pPIC').value.trim(),deadline:$('#pDeadline').value,target_anggaran_nominal:num($('#pTargetA').value),realisasi_anggaran_nominal:num($('#pRealA').value),target_output_jumlah:num($('#pTargetO').value),realisasi_output_jumlah:num($('#pRealO').value),kendala_utama:$('#pKendala').value.trim(),tindak_lanjut:$('#pTindak').value.trim(),catatan_pembaku:$('#pCatatan').value.trim(),sumber_input:'PIC'};if(!p.id_kegiatan||!p.pic){$('#picMsg').textContent='Nama PIC dan kegiatan wajib diisi.';return}const b=$('#savePicBtn');b.disabled=true;b.textContent='Menyimpan…';$('#picMsg').textContent='';const r=await api('savePICInput',p);b.disabled=false;b.textContent='Simpan Data PIC';$('#picMsg').textContent=r.ok?'Data tersimpan dan langsung diproses ke sistem pengendalian.':(r.message||'Data belum berhasil disimpan.');if(r.ok){$('#pTargetA').value='';$('#pRealA').value='';$('#pTargetO').value='';$('#pRealO').value='';$('#pKendala').value='';$('#pTindak').value='';$('#pCatatan').value='';}}
function inboxView(){
  const d=state.cache.inbox||state.data||{};
  const rows=Array.isArray(d.picInbox)?d.picInbox:[];
  const v=(x,...keys)=>{for(const k of keys){if(x&&x[k]!==undefined&&x[k]!==null&&x[k]!=='')return x[k]}return ''};
  const headers=[
    'No','Direktorat','RO','Komponen','Kegiatan','Tujuan','Sasaran','Deadline/Timeline','PIC','Pagu ABT',
    'Target Anggaran Nominal','Target Anggaran %','Realisasi Anggaran Nominal','Realisasi Anggaran %','Deviasi %',
    'Target Output Jumlah','Target Output %','Realisasi Output Jumlah','Realisasi Output %','Status',
    'Kendala Utama','Tindak Lanjut','Catatan Perwabku','Keterangan'
  ];
  const body=rows.map(x=>`<tr>
    <td>${esc(v(x,'no')||'')}</td>
    <td>${esc(v(x,'direktorat')||'')}</td>
    <td>${esc(v(x,'ro')||'')}</td>
    <td>${esc(v(x,'komponen')||'')}</td>
    <td><b>${esc(v(x,'kegiatan','nama_kegiatan')||'')}</b></td>
    <td>${esc(v(x,'tujuan')||'')}</td>
    <td>${esc(v(x,'sasaran')||'')}</td>
    <td>${esc(v(x,'deadline')||'')}</td>
    <td>${esc(v(x,'pic')||'')}</td>
    <td>${rup(v(x,'pagu_abt'))}</td>
    <td>${rup(v(x,'target_anggaran_nominal'))}</td>
    <td>${pct(v(x,'target_anggaran_persen'))}</td>
    <td>${rup(v(x,'realisasi_anggaran_nominal'))}</td>
    <td>${pct(v(x,'realisasi_anggaran_persen'))}</td>
    <td>${pct(v(x,'deviasi_persen'))}</td>
    <td>${num(v(x,'target_output_jumlah'))}</td>
    <td>${pct(v(x,'target_output_persen'))}</td>
    <td>${num(v(x,'realisasi_output_jumlah'))}</td>
    <td>${pct(v(x,'realisasi_output_persen'))}</td>
    <td>${status(v(x,'status')||'')}</td>
    <td>${esc(v(x,'kendala_utama')||'')}</td>
    <td>${esc(v(x,'tindak_lanjut')||'')}</td>
    <td>${esc(v(x,'catatan_pembaku','catatan_perwabku')||'')}</td>
    <td>${esc(v(x,'keterangan')||'')}</td>
  </tr>`).join('');
  return `<div class="page-title"><div><h2>Data Masuk PIC</h2><p>Laporan pelaksanaan yang telah diterima dan menjadi dasar pengolahan pengendalian.</p></div><div class="toolbar"><button class="secondary" onclick="refresh()">↻ Perbarui</button></div></div>
  <section class="panel"><div class="table-wrap"><table class="data-table"><thead><tr>${headers.map(h=>`<th>${h}</th>`).join('')}</tr></thead><tbody>${body||`<tr><td colspan="${headers.length}" class="empty">Belum ada data pelaksanaan.</td></tr>`}</tbody></table></div></section>`;
}
function tablePage(title,desc,headers,rows,empty='Belum ada data.',addKey='') {return `<div class="page-title"><div><h2>${title}</h2><p>${desc}</p></div><div class="toolbar"><button class="secondary" onclick="refresh()">↻ Perbarui</button>${addKey?`<button class="primary" onclick="openGeneric('${addKey}')">+ Tambah Data</button>`:''}</div></div><section class="panel"><div class="table-wrap"><table class="data-table"><thead><tr>${headers.map(h=>`<th>${h}</th>`).join('')}</tr></thead><tbody>${rows.length?rows.join(''):`<tr><td colspan="${headers.length}" class="empty">${empty}</td></tr>`}</tbody></table></div></section>`}
function kendaliView(){
  const a=picAnalysis();
  const rows=a.latest.map(x=>`<tr><td>${esc(x.subkegiatan_id||x.id_kegiatan||x.kode||'-')}</td><td><b>${esc(x.nama_kegiatan||x.kegiatan||'-')}</b></td><td>${esc(x.pic||'-')}</td><td>${rup(x.target_anggaran_nominal)}</td><td>${rup(x.realisasi_anggaran_nominal)}</td><td>${pct(x.deviasi_persen)}</td><td>${status(picStatus(x))}</td></tr>`);
  return tablePage('Kartu Kendali','Satu baris terakhir untuk setiap subkegiatan. Histori mingguan tetap tersimpan sebagai riwayat laporan.',['ID Sub Kegiatan','Sub Kegiatan','PIC','Target Anggaran','Realisasi','Deviasi','Status'],rows,'Belum ada laporan PIC.');
}
function realisasiView(){
  const a=picAnalysis(),rows=a.weeklyRows.flatMap(w=>{
    return a.rows.filter(x=>String(x.periode||'')===String(w.periode)).map(x=>`<tr><td>${esc(x.periode||'-')}</td><td>${esc(x.subkegiatan_id||x.id_kegiatan||'-')}</td><td>${esc(x.nama_kegiatan||x.kegiatan||'-')}</td><td>${rup(x.target_anggaran_nominal)}</td><td>${rup(x.realisasi_anggaran_nominal)}</td><td>${rup(num(x.target_anggaran_nominal)-num(x.realisasi_anggaran_nominal))}</td><td>${status(picStatus(x))}</td></tr>`);
  });
  return tablePage('Rencana & Realisasi','Perbandingan target dan realisasi anggaran berdasarkan laporan mingguan PIC.',['Pekan','ID Sub Kegiatan','Sub Kegiatan','Target','Realisasi','Selisih','Status'],rows,'Belum ada laporan PIC.');
}
function monitoringView(){
  const a=picAnalysis(),rows=a.rows.slice().sort((x,y)=>(periodRank(y.periode)-periodRank(x.periode))||String(y.timestamp||'').localeCompare(String(x.timestamp||''))).map(x=>`<tr><td>${esc(x.periode||'-')}</td><td>${esc(x.subkegiatan_id||x.id_kegiatan||'-')}</td><td>${esc(x.nama_kegiatan||x.kegiatan||'-')}</td><td>${num(x.target_output_jumlah)}</td><td>${num(x.realisasi_output_jumlah)}</td><td>${pct(x.target_output_jumlah?safePct(x.realisasi_output_jumlah,x.target_output_jumlah):0)}</td><td>${esc(x.kendala_utama||'-')}</td><td>${esc(x.pic||'-')}</td></tr>`);
  return tablePage('Monitoring Mingguan','Histori laporan PIC per pekan. Data tidak ditimpa; setiap pekan menjadi histori subkegiatan.',['Pekan','ID Sub Kegiatan','Sub Kegiatan','Target Output','Realisasi Output','Capaian','Kendala','PIC'],rows,'Belum ada monitoring mingguan dari PIC.');
}
function hambatanView(){
  const a=picAnalysis(),rows=a.hambatan.map(x=>`<tr><td>${esc(x.periode)}</td><td>${esc(x.kode)}</td><td>${esc(x.subKegiatan)}</td><td>${esc(x.masalah)}</td><td>${esc(x.root)}</td><td>${esc(x.dampak)}</td><td>${status(x.level)}</td><td>${esc(x.pic)}</td></tr>`);
  return tablePage('Hambatan & Root Cause','Hambatan diambil dari kolom Kendala Utama PIC dan dianalisis secara otomatis.',['Pekan','ID Sub Kegiatan','Sub Kegiatan','Kendala','Root Cause Awal','Dampak','Level','PIC'],rows,'Belum ada kendala yang dilaporkan PIC.');
}
function actionView(){
  const a=picAnalysis(),rows=a.actions.map(x=>`<tr><td>${esc(x.kode)}</td><td>${esc(x.subKegiatan)}</td><td>${esc(x.temuan)}</td><td>${esc(x.tindakan)}</td><td>${esc(x.pic)}</td><td>${esc(x.deadline)}</td><td>${status(x.status)}</td></tr>`);
  return tablePage('Corrective Action','Tindakan pengendali yang dihasilkan mesin berdasarkan status, deviasi, output dan kendala PIC.',['ID Sub Kegiatan','Sub Kegiatan','Temuan','Tindakan Pengendali','PIC','Target Tindak Lanjut','Status'],rows,'Belum ada tindakan korektif yang diperlukan.');
}
function riskView(){
  const a=picAnalysis(),rows=a.risks.map(x=>`<tr><td>${esc(x.kode)}</td><td>${esc(x.risiko)}</td><td>${esc(x.penyebab)}</td><td>${esc(x.prob)}</td><td>${esc(x.dampak)}</td><td>${status(x.level)}</td><td>${esc(x.mitigasi)}</td><td>${esc(x.pic)}</td></tr>`);
  return tablePage('Risk Register','Risiko operasional yang diturunkan dari status dan kendala laporan PIC.',['ID Sub Kegiatan','Risiko','Penyebab','Probabilitas','Dampak','Level','Mitigasi','PIC'],rows,'Belum ada risiko yang teridentifikasi.');
}
function activityTable(rows){return `<div class="table-wrap"><table class="data-table"><thead><tr><th>Kode</th><th>Nama Kegiatan</th><th>Pagu</th><th>Realisasi</th><th>Fisik</th><th>PIC</th><th>Status</th></tr></thead><tbody>${rows.length?rows.map(x=>`<tr><td><b>${esc(x.kode||x.id_kegiatan)}</b></td><td>${esc(x.nama||x.nama_kegiatan)}</td><td>${rup(x.pagu)}</td><td>${rup(x.real)}</td><td>${pct(x.fisik)}</td><td>${esc(x.pic||'-')}</td><td>${status(x.status)}</td></tr>`).join(''):'<tr><td colspan="7" class="empty">Belum ada data kegiatan.</td></tr>'}</tbody></table></div>`}
function masterView(){
  const d=state.cache.master||{},s=d.summary||{},a=d.activities||state.data.picActivities||[];
  return `<div class="page-title"><div><h2>Master Data</h2><p>Master kegiatan dan anggaran tetap membaca Spreadsheet Kendali.</p></div><button class="secondary" onclick="refresh()">↻ Perbarui</button></div><section class="panel"><div class="notice">Total pagu master: <b>${rup(s.pagu)}</b>.</div>${activityTable(a)}</section>`;
}
function reportView(){
  const d=state.cache.report||state.cache.dashboard||state.data||{},s=d.summary||{},a=picAnalysis(),att=a.recommendations.filter(x=>x.level!=='TERKENDALI');
  return `<div class="page-title"><div><h2>Laporan Pengendalian</h2><p>Ringkasan analisis pelaksanaan ABT 2026 untuk pimpinan.</p></div><button class="primary" onclick="window.print()">Cetak / PDF</button></div>
  <section class="panel"><div class="report-head"><h1>LAPORAN PENGENDALIAN ANGGARAN BELANJA TAMBAHAN (ABT) 2026</h1><p>Deputi Bidang Pencegahan · Badan Narkotika Nasional Republik Indonesia</p></div>
  <div class="report-grid"><div class="report-box"><span>Total Pagu Kendali</span><b>${rup(s.pagu)}</b></div><div class="report-box"><span>Realisasi Belanja Kendali</span><b>${rup(s.belanja)}</b></div><div class="report-box"><span>Target Anggaran PIC</span><b>${rup(a.totals.target)}</b></div><div class="report-box"><span>Realisasi Anggaran PIC</span><b>${rup(a.totals.real)}</b></div><div class="report-box"><span>Capaian Output PIC</span><b>${pct(a.totals.outputTarget?safePct(a.totals.outputReal,a.totals.outputTarget):0)}</b></div><div class="report-box"><span>Merah</span><b>${a.statusCount.MERAH}</b></div></div>
  <h3 style="margin-top:22px">1. Ringkasan Kondisi</h3><p style="font-size:12px;line-height:1.7">Dashboard menggunakan data kendali sebagai baseline keuangan. Laporan pelaksanaan dan status pengendalian menggunakan laporan terbaru dari PIC. Periode grafik dan analisis dimulai September 2026 karena ABT mulai berjalan pada September.</p>
  <h3>2. Kondisi Per Subkegiatan</h3><div class="table-wrap"><table class="data-table"><thead><tr><th>Pekan</th><th>Sub Kegiatan</th><th>PIC</th><th>Target</th><th>Realisasi</th><th>Output</th><th>Status</th></tr></thead><tbody>${analysisTableRows(a)||'<tr><td colspan="7" class="empty">Belum ada data.</td></tr>'}</tbody></table></div>
  <h3 style="margin-top:22px">3. Kegiatan yang Memerlukan Perhatian</h3>${att.length?att.map(x=>`<div class="notice"><b>${x.level==='KRITIS'?'🔴':'🟡'} ${esc(x.subKegiatan)}</b> — ${esc(x.rekomendasi)}</div>`).join(''):'<p class="empty">Belum ada kegiatan yang memerlukan perhatian.</p>'}
  <h3>4. Rekomendasi Pengendalian</h3><p style="font-size:12px;line-height:1.7">${att.length?'Prioritaskan subkegiatan dengan status MERAH, kemudian KUNING. Minta PIC memastikan tindak lanjut pada periode berikutnya dan lakukan verifikasi atas perubahan realisasi dan output.':'Lanjutkan monitoring mingguan dan verifikasi data pelaksanaan.'}</p>
  </section>`;
}
function docsView(){
  const d=state.cache.docs||{},rows=d.documents||[];
  const a=picAnalysis();
  const picDocs=a.latest.map(x=>`<tr><td>${esc(x.subkegiatan_id||x.id_kegiatan||'-')}</td><td>Laporan Pelaksanaan</td><td>${esc(x.id_input||'-')}</td><td>${esc(x.periode||'-')}</td><td>${status('DITERIMA DARI PIC')}</td><td>Laporan diterima dari PIC dan menjadi dasar pengolahan pengendalian.</td></tr>`);
  const existing=rows.map(x=>`<tr><td>${esc(x.kode)}</td><td>${esc(x.jenis)}</td><td>${esc(x.nomor)}</td><td>${esc(x.tanggal)}</td><td>${status(x.verifikasi)}</td><td>${esc(x.catatan)}</td></tr>`);
  return `<div class="page-title"><div><h2>Dokumentasi</h2><p>Jejak laporan pelaksanaan dan dokumen pendukung pengendalian.</p></div><div class="toolbar"><button class="secondary" onclick="refresh()">↻ Perbarui</button></div></div>
  <section class="panel"><div class="panel-head"><h3>Jejak Laporan Pelaksanaan</h3><span class="muted">${a.latest.length} laporan terbaru</span></div><div class="table-wrap"><table class="data-table"><thead><tr><th>ID Sub Kegiatan</th><th>Jenis</th><th>ID Input</th><th>Pekan</th><th>Status</th><th>Keterangan</th></tr></thead><tbody>${picDocs||'<tr><td colspan="6" class="empty">Belum ada laporan PIC.</td></tr>'}</tbody></table></div></section>
  <section class="panel"><div class="panel-head"><h3>Dokumen Pendukung</h3></div><div class="table-wrap"><table class="data-table"><thead><tr><th>Kode</th><th>Jenis Dokumen</th><th>Nomor</th><th>Tanggal</th><th>Verifikasi</th><th>Catatan</th></tr></thead><tbody>${existing||'<tr><td colspan="6" class="empty">Belum ada dokumen pendukung pada Spreadsheet Kendali.</td></tr>'}</tbody></table></div></section>`;
}
function openGeneric(key){
 const acts=(state.data.activities||state.cache.master?.activities||state.cache.inbox?.activities||[]);
 const labels={MONITORING:['Monitoring Mingguan',['Periode','Tanggal Monitoring','Target Fisik Kumulatif','Realisasi Fisik Kumulatif','Target Output','Realisasi Output','Kendala','Tindak Lanjut','PIC','Deadline']],HAMBATAN:['Hambatan & Root Cause',['Tanggal','Kategori','Masalah','Root Cause','Dampak','Tingkat Dampak','Status']],ACTION:['Corrective Action',['Temuan','Tindakan','PIC','Tanggal Mulai','Deadline','Status','Bukti','Catatan']],RISIKO:['Risk Register',['Risiko','Penyebab','Probabilitas','Dampak','Level Risiko','Mitigasi','PIC','Deadline','Status']],DOKUMEN:['Dokumentasi',['Jenis Dokumen','Nomor Dokumen','Tanggal Dokumen','File URL','Status Verifikasi','Catatan']]}[key];
 if(!labels)return alert('Form modul belum tersedia.');
 const ov=document.createElement('div');ov.className='modal';ov.id='genericModal';
 const activity=`<div class="field full"><label>Kegiatan<select id="gKegiatan"><option value="">Pilih kode — nama kegiatan</option>${acts.map(x=>`<option value="${esc(x.id_kegiatan)}">${esc(x.id_kegiatan)} — ${esc(x.nama_kegiatan||x.nama)}</option>`).join('')}</select></label></div>`;
 let fields='';
 if(key==='MONITORING')fields=`<div class="field"><label>Periode<input id="gPeriode" placeholder="Minggu ke / periode"></label></div><div class="field"><label>Tanggal Monitoring<input id="gTanggal" type="date"></label></div><div class="field"><label>Target Fisik Kumulatif<input id="gTargetFisik" type="number" step="0.01"></label></div><div class="field"><label>Realisasi Fisik Kumulatif<input id="gRealFisik" type="number" step="0.01"></label></div><div class="field"><label>Target Output<input id="gTargetOutput" type="number"></label></div><div class="field"><label>Realisasi Output<input id="gRealOutput" type="number"></label></div><div class="field"><label>PIC<input id="gPic"></label></div><div class="field"><label>Deadline<input id="gDeadline" type="date"></label></div><div class="field full"><label>Kendala<textarea id="gKendala"></textarea></label></div><div class="field full"><label>Tindak Lanjut<textarea id="gTindak"></textarea></label></div>`;
 if(key==='HAMBATAN')fields=`<div class="field"><label>Tanggal<input id="gTanggal" type="date"></label></div><div class="field"><label>Kategori<input id="gKategori"></label></div><div class="field full"><label>Masalah<textarea id="gMasalah"></textarea></label></div><div class="field full"><label>Root Cause<textarea id="gRoot"></textarea></label></div><div class="field full"><label>Dampak<textarea id="gDampak"></textarea></label></div><div class="field"><label>Tingkat Dampak<input id="gLevel"></label></div><div class="field"><label>Status<input id="gStatus" value="OPEN"></label></div>`;
 if(key==='ACTION')fields=`<div class="field full"><label>Temuan<textarea id="gTemuan"></textarea></label></div><div class="field full"><label>Tindakan<textarea id="gTindakan"></textarea></label></div><div class="field"><label>PIC<input id="gPic"></label></div><div class="field"><label>Tanggal Mulai<input id="gMulai" type="date"></label></div><div class="field"><label>Deadline<input id="gDeadline" type="date"></label></div><div class="field"><label>Status<input id="gStatus" value="PROSES"></label></div><div class="field full"><label>Bukti<input id="gBukti"></label></div><div class="field full"><label>Catatan<textarea id="gCatatan"></textarea></label></div>`;
 if(key==='RISIKO')fields=`<div class="field full"><label>Risiko<textarea id="gRisiko"></textarea></label></div><div class="field full"><label>Penyebab<textarea id="gPenyebab"></textarea></label></div><div class="field"><label>Probabilitas<input id="gProb"></label></div><div class="field"><label>Dampak<input id="gDampak"></label></div><div class="field"><label>Level Risiko<input id="gLevel"></label></div><div class="field"><label>PIC<input id="gPic"></label></div><div class="field"><label>Deadline<input id="gDeadline" type="date"></label></div><div class="field"><label>Status<input id="gStatus" value="OPEN"></label></div><div class="field full"><label>Mitigasi<textarea id="gMitigasi"></textarea></label></div>`;
 if(key==='DOKUMEN')fields=`<div class="field"><label>Jenis Dokumen<input id="gJenis"></label></div><div class="field"><label>Nomor Dokumen<input id="gNomor"></label></div><div class="field"><label>Tanggal Dokumen<input id="gTanggal" type="date"></label></div><div class="field"><label>File URL<input id="gUrl"></label></div><div class="field"><label>Status Verifikasi<input id="gStatus" value="BELUM DIPERIKSA"></label></div><div class="field full"><label>Catatan<textarea id="gCatatan"></textarea></label></div>`;
 ov.innerHTML=`<div class="modal-card"><div class="modal-head"><div><h3>${labels[0]}</h3><p class="muted">Data dicatat sebagai bagian dari pengendalian ABT 2026.</p></div><button class="icon-btn" onclick="closeGeneric()">×</button></div><div class="form-grid">${activity}${fields}</div><div class="form-actions"><button class="secondary" onclick="closeGeneric()">Batal</button><button class="primary" id="gSave">Simpan Data</button></div><div id="gMsg" class="msg"></div></div>`;
 document.body.appendChild(ov);$('#gSave').onclick=()=>saveGeneric(key);
}
async function saveGeneric(key){const id=$('#gKegiatan').value;if(!id){$('#gMsg').textContent='Kegiatan wajib dipilih.';return}const v=id=>document.getElementById(id)?.value||'';let p={key,code:state.code,id_kegiatan:id};if(key==='MONITORING')Object.assign(p,{periode:v('gPeriode'),tanggal_monitoring:v('gTanggal'),target_fisik_kumulatif:num(v('gTargetFisik')),realisasi_fisik_kumulatif:num(v('gRealFisik')),target_output:num(v('gTargetOutput')),realisasi_output:num(v('gRealOutput')),pic:v('gPic'),deadline:v('gDeadline'),kendala:v('gKendala'),tindak_lanjut:v('gTindak')});if(key==='HAMBATAN')Object.assign(p,{tanggal:v('gTanggal'),kategori:v('gKategori'),masalah:v('gMasalah'),root_cause:v('gRoot'),dampak:v('gDampak'),tingkat_dampak:v('gLevel'),status:v('gStatus')});if(key==='ACTION')Object.assign(p,{temuan:v('gTemuan'),tindakan:v('gTindakan'),pic:v('gPic'),tanggal_mulai:v('gMulai'),deadline:v('gDeadline'),status:v('gStatus'),bukti:v('gBukti'),catatan:v('gCatatan')});if(key==='RISIKO')Object.assign(p,{risiko:v('gRisiko'),penyebab:v('gPenyebab'),probabilitas:v('gProb'),dampak:v('gDampak'),level_risiko:v('gLevel'),mitigasi:v('gMitigasi'),pic:v('gPic'),deadline:v('gDeadline'),status:v('gStatus')});if(key==='DOKUMEN')Object.assign(p,{jenis_dokumen:v('gJenis'),nomor_dokumen:v('gNomor'),tanggal_dokumen:v('gTanggal'),file_url:v('gUrl'),status_verifikasi:v('gStatus'),catatan:v('gCatatan')});const b=$('#gSave');b.disabled=true;b.textContent='Menyimpan…';const r=await api('saveGeneric',p);if(r.ok){closeGeneric();state.cache[{MONITORING:'monitoring',HAMBATAN:'hambatan',ACTION:'action',RISIKO:'risk',DOKUMEN:'docs'}[key]]=null;await loadModule({MONITORING:'monitoring',HAMBATAN:'hambatan',ACTION:'action',RISIKO:'risk',DOKUMEN:'docs'}[key])}else $('#gMsg').textContent=r.message||'Data belum berhasil disimpan.';b.disabled=false;b.textContent='Simpan Data'}
function closeGeneric(){$('#genericModal')?.remove()}

function editPIC(id){const d=state.cache.inbox||{},r=(d.picInbox||[]).find(x=>String(x.id_input)===String(id));if(!r)return;const acts=state.data.activities||d.activities||[];const ov=document.createElement('div');ov.className='modal';ov.id='editPicModal';ov.style.cssText='align-items:flex-start;justify-content:center;padding:12px 12px 24px;overflow-y:auto;';ov.innerHTML=`<div class="modal-card" style="width:min(760px,96vw);max-height:calc(100vh - 24px);overflow-y:auto;margin:0 auto;"><div class="modal-head"><div><h3>Edit Data PIC</h3><p class="muted">Perubahan langsung diproses sebagai data pengendalian.</p></div><button class="icon-btn" onclick="closeEdit()">×</button></div><div class="form-grid"><div class="field"><label>Periode<select id="ePeriode"><option>September 2026</option><option>Oktober 2026</option><option>Nopember 2026</option><option>Desember 2026</option></select></label></div><div class="field"><label>Direktorat<input id="eDir"></label></div><div class="field full"><label>Kegiatan<select id="eKegiatan">${acts.map(x=>`<option value="${esc(x.id_kegiatan)}">${esc(x.id_kegiatan)} — ${esc(x.nama_kegiatan||x.nama)}</option>`).join('')}</select></label></div><div class="field"><label>Nama PIC<input id="ePIC"></label></div><div class="field"><label>Deadline<input id="eDeadline" type="date"></label></div><div class="field"><label>Target Anggaran<input id="eTarget" inputmode="numeric"></label></div><div class="field"><label>Realisasi Anggaran<input id="eReal" inputmode="numeric"></label></div><div class="field"><label>Target Output<input id="eTO" type="number"></label></div><div class="field"><label>Realisasi Output<input id="eRO" type="number"></label></div><div class="field full"><label>Kendala<textarea id="eKendala"></textarea></label></div><div class="field full"><label>Tindak Lanjut<textarea id="eTindak"></textarea></label></div><div class="field full"><label>Catatan<input id="eCatatan"></label></div></div><div class="form-actions" style="position:sticky;bottom:0;background:#fff;padding-top:12px;padding-bottom:4px;z-index:3;"><button class="secondary" onclick="closeEdit()">Batal</button><button class="primary" id="eSave">Simpan Perubahan</button></div><div id="eMsg" class="msg"></div></div>`;document.body.appendChild(ov);$('#ePeriode').value=r.periode||'September 2026';$('#eDir').value=r.direktorat||'';$('#eKegiatan').value=r.id_kegiatan||'';$('#ePIC').value=r.pic||'';$('#eDeadline').value=r.deadline||'';$('#eTarget').value=r.target_anggaran_nominal||0;$('#eReal').value=r.realisasi_anggaran_nominal||0;$('#eTO').value=r.target_output_jumlah||0;$('#eRO').value=r.realisasi_output_jumlah||0;$('#eKendala').value=r.kendala_utama||'';$('#eTindak').value=r.tindak_lanjut||'';$('#eCatatan').value=r.catatan_pembaku||'';$('#eSave').onclick=async()=>{const b=$('#eSave');b.disabled=true;b.textContent='Menyimpan…';const p={code:state.code,id_input:r.id_input,payload:{periode:$('#ePeriode').value,direktorat:$('#eDir').value,id_kegiatan:$('#eKegiatan').value,pic:$('#ePIC').value.trim(),deadline:$('#eDeadline').value,target_anggaran_nominal:num($('#eTarget').value),realisasi_anggaran_nominal:num($('#eReal').value),target_output_jumlah:num($('#eTO').value),realisasi_output_jumlah:num($('#eRO').value),kendala_utama:$('#eKendala').value,tindak_lanjut:$('#eTindak').value,catatan_pembaku:$('#eCatatan').value}};const z=await api('updatePICInput',p);if(z.ok){closeEdit();state.cache.inbox=null;await loadModule('inbox')}else $('#eMsg').textContent=z.message||'Perubahan belum berhasil disimpan.';b.disabled=false;b.textContent='Simpan Perubahan'}}
function closeEdit(){$('#editPicModal')?.remove()}
async function confirmPIC(id){if(!confirm('Konfirmasi data pelaksanaan ini telah diperiksa?'))return;const r=await api('confirmPICInput',{id_input:id,code:state.code});if(r.ok){state.cache.inbox=null;await loadModule('inbox')}else alert(r.message||'Data belum dapat dikonfirmasi.')}
async function deletePIC(id){if(!confirm('Hapus data pelaksanaan ini?'))return;const r=await api('deletePICInput',{id_input:id,code:state.code});if(r.ok){state.cache.inbox=null;await loadModule('inbox')}else alert(r.message||'Data belum berhasil dihapus.')}
function logout(){try{sessionStorage.removeItem('abt_access')}catch(e){};state.role='';state.code='';state.access=false;state.data={};state.cache={};state.view='pic';$('#modal').classList.remove('hidden');document.body.classList.add('locked');$('#accessMsg').textContent='';$('#accessCode').value='';$('#roleLabel').textContent='Pengguna';$('#roleSub').textContent='Belum masuk';drawNav()}
$('#doAccess').onclick=access;$('#accessBtn').onclick=()=>$('#modal').classList.remove('hidden');$('#logoutBtn').onclick=logout;document.querySelectorAll('.role-card').forEach(b=>b.onclick=()=>{document.querySelectorAll('.role-card').forEach(x=>x.classList.remove('selected'));b.classList.add('selected');state.selectedRole=b.dataset.role;$('#accessMsg').textContent=''});$('#accessCode').addEventListener('keydown',e=>{if(e.key==='Enter')access()});document.addEventListener('change',e=>{if(e.target.id==='pKegiatan')loadPICContext();if(e.target.id==='pPeriode'&&$('#pKegiatan')?.value)loadPICContext()});document.addEventListener('click',e=>{if(e.target.id==='savePicBtn')savePIC()});
function tick(){$('#clock').textContent=new Intl.DateTimeFormat('id-ID',{dateStyle:'full',timeStyle:'short'}).format(new Date())+' WIB'}setInterval(tick,1000);tick();try{const saved=JSON.parse(sessionStorage.getItem('abt_access')||'null');if(saved&&saved.role&&saved.code){state.selectedRole=saved.role;state.role=saved.role;state.code=saved.code;state.access=true;state.view=saved.role==='PIC'?'pic':saved.role==='PIMPINAN'?'report':'dashboard';document.body.classList.remove('locked');$('#modal').classList.add('hidden');$('#roleLabel').textContent=saved.role==='PENGENDALI'?'Tim Pengendali':saved.role==='PIMPINAN'?'Pimpinan / Laporan':'PIC Kegiatan';$('#roleSub').textContent='Akses aktif';drawNav();initialLoad();}else{$('#modal').classList.remove('hidden');drawNav();render();}}catch(e){$('#modal').classList.remove('hidden');drawNav();render();}
window.showView=showView;window.refresh=refresh;window.confirmPIC=confirmPIC;window.deletePIC=deletePIC;window.editPIC=editPIC;window.closeEdit=closeEdit;window.openGeneric=openGeneric;window.closeGeneric=closeGeneric;
})();
