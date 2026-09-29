/* SISTEM PENGENDALIAN ABT 2026 — APP FINAL 8.3 */
const state={role:'',data:null,cache:{}};
const $=s=>document.querySelector(s);
const esc=v=>String(v??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
const rup=v=>new Intl.NumberFormat('id-ID',{style:'currency',currency:'IDR',maximumFractionDigits:0}).format(Number(v)||0);
const pct=v=>(Number(v)||0).toFixed(1)+'%';
const status=v=>`<span class="status ${(String(v||'').toLowerCase())}">${esc(v||'-')}</span>`;
function call(name,...args){return new Promise((res,rej)=>google.script.run.withSuccessHandler(res).withFailureHandler(rej)[name](...args));}
async function load(){
  try{const d=await call('getControlData');state.data=d;state.cache=d;renderDashboard();}
  catch(e){$('#content').innerHTML=`<section class="panel"><h3>Gagal mengambil data</h3><p>${esc(e.message||e)}</p></section>`;}
}
function nav(){
  $('#nav').innerHTML=['DASHBOARD','DATA MASUK PIC','KARTU KENDALI','RENCANA & REALISASI','MONITORING MINGGUAN','HAMBATAN & ROOT CAUSE','CORRECTIVE ACTION','RISK REGISTER','LAPORAN']
    .map(x=>`<button onclick="go('${x}')">${x}</button>`).join('');
}
function go(x){
  const d=state.data||{};
  if(x==='DASHBOARD')return renderDashboard();
  if(x==='DATA MASUK PIC')return renderInbox(d);
  if(x==='KARTU KENDALI')return renderKartu(d);
  if(x==='RENCANA & REALISASI')return renderRR(d);
  if(x==='MONITORING MINGGUAN')return renderMonitoring(d);
  if(x==='HAMBATAN & ROOT CAUSE')return renderHambatan(d);
  if(x==='CORRECTIVE ACTION')return renderAction(d);
  if(x==='RISK REGISTER')return renderRisk(d);
  if(x==='LAPORAN')return renderReport(d);
}
function page(title,desc,body){$('#content').innerHTML=`<div class="page-title"><div><h2>${title}</h2><p>${desc}</p></div></div>${body}`;}
function renderDashboard(){
  const d=state.data||{summary:{},monthly:[],kartu:[]},s=d.summary||{};
  page('Dashboard Pengendalian ABT','Periode ABT: September–Desember 2026',
  `<section class="cards">
   <div class="card"><small>Subkegiatan</small><b>${s.total||0}</b></div>
   <div class="card"><small>Hijau</small><b>${s.hijau||0}</b></div>
   <div class="card"><small>Kuning</small><b>${s.kuning||0}</b></div>
   <div class="card"><small>Merah</small><b>${s.merah||0}</b></div>
   <div class="card"><small>Pagu ABT</small><b>${rup(s.pagu)}</b></div>
   <div class="card"><small>Realisasi</small><b>${rup(s.realisasi)}</b></div>
  </section>
  <section class="grid2">
   <div class="panel"><h3>Status Pengendalian</h3><canvas id="statusChart" height="220"></canvas></div>
   <div class="panel"><h3>Target vs Realisasi Anggaran</h3><canvas id="financeChart" height="220"></canvas></div>
  </section>
  <section class="panel"><h3>Prioritas Pengendalian</h3>${attentionRows(d.kartu)}</section>`);
  drawCharts(d);
}
function attentionRows(a=[]){const rows=a.filter(x=>x.level!=='RENDAH');return rows.length?`<div class="table-wrap"><table class="data-table"><tr><th>Sub Kegiatan</th><th>Status</th><th>Trend</th><th>Analisis</th><th>Rekomendasi</th></tr>${rows.map(x=>`<tr><td>${esc(x.sub_kegiatan||x.kegiatan||x.subkegiatan_id)}</td><td>${status(x.status)}</td><td>${esc(x.trend)}</td><td>${esc(x.analysis)}</td><td>${esc(x.rekomendasi)}</td></tr>`).join('')}</table></div>`:'<div class="empty">Tidak ada prioritas khusus.</div>';}
function renderInbox(d){const rows=d.rows||[];page('Data Masuk PIC','Sumber langsung Spreadsheet PIC.',`<section class="panel"><div class="table-wrap"><table class="data-table"><tr><th>Pekan</th><th>Direktorat</th><th>RO</th><th>Komponen</th><th>Sub Kegiatan</th><th>Kegiatan</th><th>PIC</th><th>Pagu ABT</th><th>Target</th><th>Realisasi</th><th>Deviasi</th><th>Output</th><th>Status</th><th>Kendala</th><th>Tindak Lanjut</th></tr>${rows.map(x=>`<tr><td>${esc(x.pekan_laporan)}</td><td>${esc(x.direktorat)}</td><td>${esc(x.ro)}</td><td>${esc(x.komponen)}</td><td><b>${esc(x.sub_kegiatan||x.subkegiatan_id)}</b></td><td>${esc(x.kegiatan||x.id_kegiatan)}</td><td>${esc(x.pic)}</td><td>${rup(x.pagu_abt)}</td><td>${rup(x.target_anggaran_nominal)}</td><td>${rup(x.realisasi_anggaran_nominal)}</td><td>${pct(x.deviasi_persen)}</td><td>${x.realisasi_output_jumlah}/${x.target_output_jumlah}</td><td>${status(x.status)}</td><td>${esc(x.kendala_utama)}</td><td>${esc(x.tindak_lanjut)}</td></tr>`).join('')}</table></div></section>`);}
function renderKartu(d){const rows=d.kartu||[];page('Kartu Kendali','Posisi terbaru setiap sub kegiatan berdasarkan laporan PIC.',`<section class="panel"><div class="table-wrap"><table class="data-table"><tr><th>Sub Kegiatan</th><th>PIC</th><th>Pagu</th><th>Target</th><th>Realisasi</th><th>Deviasi</th><th>Output</th><th>Status</th><th>Trend</th><th>Rekomendasi</th></tr>${rows.map(x=>`<tr><td>${esc(x.sub_kegiatan||x.subkegiatan_id)}</td><td>${esc(x.pic)}</td><td>${rup(x.pagu_abt)}</td><td>${rup(x.target_anggaran_nominal)}</td><td>${rup(x.realisasi_anggaran_nominal)}</td><td>${pct(x.deviasi_persen)}</td><td>${x.realisasi_output_jumlah}/${x.target_output_jumlah}</td><td>${status(x.status)}</td><td>${esc(x.trend)}</td><td>${esc(x.rekomendasi)}</td></tr>`).join('')}</table></div></section>`);}
function renderRR(d){const rows=d.kartu||[];page('Rencana & Realisasi','Perbandingan target dan realisasi laporan PIC.',`<section class="panel"><div class="table-wrap"><table class="data-table"><tr><th>Sub Kegiatan</th><th>Pagu</th><th>Target Anggaran</th><th>Realisasi</th><th>Deviasi</th><th>Target Output</th><th>Realisasi Output</th><th>Status</th></tr>${rows.map(x=>`<tr><td>${esc(x.sub_kegiatan||x.subkegiatan_id)}</td><td>${rup(x.pagu_abt)}</td><td>${rup(x.target_anggaran_nominal)}</td><td>${rup(x.realisasi_anggaran_nominal)}</td><td>${pct(x.deviasi_persen)}</td><td>${x.target_output_jumlah}</td><td>${x.realisasi_output_jumlah}</td><td>${status(x.status)}</td></tr>`).join('')}</table></div></section>`);}
function renderMonitoring(d){const rows=d.monitoring||[];page('Monitoring Mingguan','Histori laporan PIC sejak September 2026.',`<section class="panel"><div class="table-wrap"><table class="data-table"><tr><th>Pekan</th><th>Sub Kegiatan</th><th>Target</th><th>Realisasi</th><th>Output</th><th>Status</th><th>Trend</th><th>Kendala</th><th>Tindak Lanjut</th></tr>${rows.map(x=>`<tr><td>${esc(x.pekan_laporan)}</td><td>${esc(x.sub_kegiatan||x.subkegiatan_id)}</td><td>${rup(x.target_anggaran_nominal)}</td><td>${rup(x.realisasi_anggaran_nominal)}</td><td>${x.realisasi_output_jumlah}/${x.target_output_jumlah}</td><td>${status(x.status)}</td><td>${esc(x.trend)}</td><td>${esc(x.kendala_utama)}</td><td>${esc(x.tindak_lanjut)}</td></tr>`).join('')}</table></div></section>`);}
function renderHambatan(d){const rows=(d.kartu||[]).filter(x=>x.kendala_utama);page('Hambatan & Root Cause','Kendala PIC diolah menjadi indikasi masalah dan rekomendasi.',attentionRows(rows));}
function renderAction(d){const rows=(d.kartu||[]).filter(x=>x.level!=='RENDAH');page('Corrective Action','Tindakan awal yang direkomendasikan mesin berdasarkan data PIC.',`<section class="panel">${rows.map(x=>`<article class="action-card"><b>${esc(x.sub_kegiatan||x.subkegiatan_id)}</b><p>${esc(x.analysis)}</p><strong>Tindakan:</strong> ${esc(x.rekomendasi)}<br><small>PIC: ${esc(x.pic||'-')} · Deadline: ${esc(x.deadline||'-')}</small></article>`).join('')||'<div class="empty">Tidak ada tindakan khusus.</div>'}</section>`);}
function renderRisk(d){const rows=(d.kartu||[]).filter(x=>x.level!=='RENDAH');page('Risk Register','Risiko awal dihitung dari status dan tren laporan PIC.',`<section class="panel"><div class="table-wrap"><table class="data-table"><tr><th>Sub Kegiatan</th><th>Risiko</th><th>Level</th><th>Mitigasi</th><th>PIC</th><th>Deadline</th></tr>${rows.map(x=>`<tr><td>${esc(x.sub_kegiatan||x.subkegiatan_id)}</td><td>${esc(x.analysis)}</td><td>${esc(x.level)}</td><td>${esc(x.rekomendasi)}</td><td>${esc(x.pic)}</td><td>${esc(x.deadline)}</td></tr>`).join('')}</table></div></section>`);}
function renderReport(d){const s=d.summary||{};page('Laporan Pengendalian','Ringkasan pengendalian ABT September–Desember 2026.',`<section class="panel"><h3>Ringkasan</h3><p>Total subkegiatan: <b>${s.total||0}</b></p><p>Hijau: <b>${s.hijau||0}</b> · Kuning: <b>${s.kuning||0}</b> · Merah: <b>${s.merah||0}</b></p><p>Pagu ABT: <b>${rup(s.pagu)}</b></p><p>Realisasi: <b>${rup(s.realisasi)}</b></p><p>Deviasi terhadap target: <b>${pct(s.deviasi)}</b></p></section>`);}
function drawCharts(d){
  if(!window.Chart)return;
  new Chart($('#statusChart'),{type:'doughnut',data:{labels:['Hijau','Kuning','Merah'],datasets:[{data:[d.summary.hijau,d.summary.kuning,d.summary.merah]}]},options:{responsive:true}});
  const m=d.monthly||[];
  new Chart($('#financeChart'),{type:'bar',data:{labels:m.map(x=>x.bulan),datasets:[{label:'Target',data:m.map(x=>x.target)},{label:'Realisasi',data:m.map(x=>x.realisasi)}]},options:{responsive:true,scales:{y:{beginAtZero:true}}}});
}
document.addEventListener('DOMContentLoaded',()=>{nav();load();});
