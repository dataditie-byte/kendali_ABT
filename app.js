const state={
  view:'pic', role:'', access:false, selectedRole:'PIC',
  data:null, loading:false, error:'', picRows:[], kendaliRows:[], realisasiRows:[], monitoringRows:[],
  hambatanRows:[], actionRows:[], riskRows:[]
};

function rupiah(n){return 'Rp '+Number(n||0).toLocaleString('id-ID')}
function pct(n){const v=Number(n);return (isFinite(v)?v:0).toLocaleString('id-ID',{maximumFractionDigits:2})+'%'}
function safePct(a,b){a=Number(a)||0;b=Number(b)||0;return b?Math.round(a/b*10000)/100:0}
function status(s){s=String(s||'TERKENDALI').toUpperCase();let c=s.includes('RISIKO')?'risk':s.includes('KRITIS')?'crit':s.includes('PERHATIAN')||s.includes('OPEN')||s.includes('PROSES')?'warn':'ok';return `<span class="status ${c}">${esc(s)}</span>`}
function esc(s){return String(s??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]))}

async function api(action,payload={}){
  if(!API_URL){
    return {ok:false,message:'Layanan data belum tersedia. Silakan coba lagi.'};
  }
  const cb='abt_cb_'+Date.now()+'_'+Math.floor(Math.random()*10000);
  const extra=action==='validateAccess'
    ? '&code='+encodeURIComponent(payload.code||'')+'&role='+encodeURIComponent(payload.role||'')
    : '';
  const q='?api='+encodeURIComponent(action)+'&callback='+cb+extra+(action==='validateAccess'?'':'&payload='+encodeURIComponent(JSON.stringify(payload||{})));
  return new Promise(resolve=>{
    let done=false;
    let script=null;
    const finish=x=>{
      if(done)return;
      done=true;
      try{delete window[cb];}catch(e){}
      if(script)script.remove();
      resolve(x||{ok:false,message:'Respons kosong dari server.'});
    };
    window[cb]=finish;
    script=document.createElement('script');
    script.src=API_URL.replace(/\/$/,'')+q;
    script.onerror=()=>finish({ok:false,message:'Layanan data tidak dapat dihubungi. Silakan coba lagi.'});
    document.body.appendChild(script);
    setTimeout(()=>finish({ok:false,message:'Layanan data belum merespons. Silakan coba lagi.'}),45000);
  });
}
function data(){return state.data||{}}

function dashboard(){
 if(state.loading) return `<section class="panel loading-panel"><div class="loading">Memuat data ABT 2026…</div></section>`;
 if(state.error) return `<section class="panel error-panel"><h3>Data belum tersedia</h3><p>${esc(state.error)}</p><button class="secondary" onclick="loadAll()">↻ Coba Lagi</button></section>`;
 const d=data(),s=d.summary||{},m=d.monthly||[],a=d.activities||[],att=d.attention||[];
 const max=Math.max(...m.map(x=>Number(x.p)||0),...m.map(x=>Number(x.c)||0),...m.map(x=>Number(x.r)||0),1);
 const controlled=a.filter(x=>String(x.status).toUpperCase()==='TERKENDALI').length;
 const attention=a.filter(x=>String(x.status).toUpperCase().includes('PERHATIAN')).length;
 const risk=a.filter(x=>String(x.status).toUpperCase().includes('RISIKO')).length;
 const critical=a.filter(x=>String(x.status).toUpperCase().includes('KRITIS')).length;
 return `<div class="page-title"><div><h2>Dashboard Pengendalian ABT 2026</h2><p>Ringkasan kendali anggaran, pencairan, belanja, fisik, output dan perhatian pimpinan.</p></div><div class="toolbar"><button class="secondary" onclick="loadAll()">↻ Perbarui</button><button class="primary" onclick="window.print()">Cetak</button></div></div>
 <div class="cards">
  <div class="metric blue"><div class="label">Total Pagu</div><div class="value">${rupiah(s.pagu)}</div><div class="sub">Proporsi terhadap pagu</div></div>
  <div class="metric green"><div class="label">Kebutuhan Dana</div><div class="value">${rupiah(s.kebutuhan)}</div><div class="sub">${pct(safePct(s.kebutuhan,s.pagu))} dari pagu</div></div>
  <div class="metric amber"><div class="label">Rencana Pencairan</div><div class="value">${rupiah(s.rencana)}</div><div class="sub">${pct(safePct(s.rencana,s.pagu))} dari pagu</div></div>
  <div class="metric blue"><div class="label">Pencairan Aktual</div><div class="value">${rupiah(s.cair)}</div><div class="sub">${pct(safePct(s.cair,s.pagu))} dari pagu</div></div>
  <div class="metric orange"><div class="label">Realisasi Belanja</div><div class="value">${rupiah(s.belanja)}</div><div class="sub">${pct(safePct(s.belanja,s.pagu))} dari pagu</div></div>
  <div class="metric gray"><div class="label">Sisa Pagu</div><div class="value">${rupiah(s.sisa)}</div><div class="sub">${pct(safePct(s.sisa,s.pagu))} dari pagu</div></div>
 </div>
 <div class="grid2">
  <section class="panel"><div class="panel-head"><h3>Tren Keuangan 2026</h3><span class="muted">Kumulatif: rencana vs pencairan vs belanja</span></div>
   <div class="chart"><div class="chart-grid"></div><div class="bars">${m.map(x=>`<div class="bar-group" title="${esc(x.m)}"><div class="bar plan" style="height:${(Number(x.p)||0)/max*100}%"></div><div class="bar cair" style="height:${(Number(x.c)||0)/max*100}%"></div><div class="bar real" style="height:${(Number(x.r)||0)/max*100}%"></div></div>`).join('')}</div><div class="months">${m.map(x=>`<span>${esc(x.m)}</span>`).join('')}</div></div>
   <div class="kpi-note">Legenda: <span class="dot a"></span>Rencana <span class="dot" style="background:#278fe0"></span>Pencairan <span class="dot g"></span>Belanja</div>
  </section>
  <section class="panel"><div class="panel-head"><h3>Status Kegiatan</h3><span class="muted">${a.length} kegiatan</span></div><div class="donut-wrap"><div class="donut"></div><div class="legend"><div><i class="dot g"></i>Terkendali <b>${controlled}</b></div><div><i class="dot a"></i>Perlu Perhatian <b>${attention}</b></div><div><i class="dot o"></i>Risiko Tinggi <b>${risk}</b></div><div><i class="dot r"></i>Kritis <b>${critical}</b></div></div></div></section>
 </div>
 <div class="grid2">
  <section class="panel"><h3>Capaian Fisik &amp; Output</h3>
   <div class="progress-row"><div class="progress-label"><span>Capaian Fisik</span><b>${pct(s.fisik)}</b></div><div class="track"><div class="fill" style="width:${Math.min(100,Math.max(0,Number(s.fisik)||0))}%"></div></div></div>
   <div class="progress-row"><div class="progress-label"><span>Capaian Output</span><b>${pct(s.outputPct)}</b></div><div class="track"><div class="fill" style="width:${Math.min(100,Math.max(0,Number(s.outputPct)||0))}%"></div></div></div>
   <div class="report-grid"><div class="report-box"><span>Target Output</span><b>${Number(s.targetOutput||0).toLocaleString('id-ID')}</b></div><div class="report-box"><span>Realisasi Output</span><b>${Number(s.realOutput||0).toLocaleString('id-ID')}</b></div></div>
  </section>
  <section class="panel"><h3>Perhatian Pimpinan</h3>${att.length?att.map(x=>`<div style="padding:10px 0;border-bottom:1px solid #edf2f6"><b style="font-size:11px">${esc(x.kode)}</b><div style="font-size:11px;margin-top:3px">${esc(x.problem)}</div><div style="font-size:10px;color:#7b91a8">${esc(x.impact)} · ${status(x.status)}</div></div>`).join(''):'<div class="empty">Belum ada kegiatan yang memerlukan perhatian berdasarkan data terisi.</div>'}</section>
 </div>
 <section class="panel"><div class="panel-head"><h3>Daftar Kegiatan Strategis</h3><button class="secondary" onclick="showView('kendali')">Lihat Semua</button></div>${activityTable(a)}</section>`;
}
function activityTable(rows){return `<div class="table-wrap"><table class="data-table"><thead><tr><th>Kode</th><th>Nama Kegiatan</th><th>Pagu</th><th>Realisasi</th><th>Fisik</th><th>PIC</th><th>Status</th></tr></thead><tbody>${rows.length?rows.map(x=>`<tr><td>${esc(x.kode)}</td><td>${esc(x.nama)}</td><td>${rupiah(x.pagu)}</td><td>${rupiah(x.real)}</td><td>${pct(x.fisik)}</td><td>${esc(x.pic||'-')}</td><td>${status(x.status)}</td></tr>`).join(''):'<tr><td colspan="7" class="empty">Belum ada data kegiatan.</td></tr>'}</tbody></table></div>`}

function picView(){
 if(state.loading) return `<section class="panel loading-panel"><div class="loading">Memuat data kegiatan…</div></section>`;
 if(state.error) return `<section class="panel error-panel"><h3>Data belum tersedia</h3><p>${esc(state.error)}</p><button class="secondary" onclick="loadAll()">↻ Coba Lagi</button></section>`;
 const d=data(), acts=d.activities||[];
 return `<div class="page-title"><div><h2>Input Data PIC</h2><p>PIC hanya mengisi data kegiatan. Dashboard lengkap dan modul pengendalian tidak ditampilkan pada akun PIC.</p></div></div>
 <section class="panel"><div class="notice"><b>Ruang input PIC:</b> data identitas kegiatan, target anggaran, realisasi anggaran, target output, realisasi output, kendala utama dan tindak lanjut. Persentase dihitung otomatis oleh sistem.</div>
 <div class="form-grid">
  <div class="field"><label>Bulan / Periode</label><select id="fPeriode"><option value="September 2026">September 2026</option><option value="Oktober 2026">Oktober 2026</option><option value="Nopember 2026">Nopember 2026</option><option value="Desember 2026">Desember 2026</option></select></div>
  <div class="field"><label>Direktorat</label><select id="fDir"><option value="Direktorat Informasi & Edukasi">Direktorat Informasi &amp; Edukasi</option><option value="Direktorat Advokasi">Direktorat Advokasi</option></select></div>
  <div class="field full"><label>Kegiatan</label><select id="fKegiatan">${acts.map(x=>`<option value="${esc(x.id||x.kode)}">${esc(x.kode)} — ${esc(x.nama)}</option>`).join('')}</select></div>
  <div class="field"><label>Nama PIC</label><input id="fPIC" placeholder="Nama PIC"></div>
  <div class="field"><label>Deadline</label><input id="fDeadline" type="date"></div>
  <div class="field"><label>Pagu ABT</label><input id="fPagu" type="number" min="0" value="0"></div>
  <div class="field"><label>Target Anggaran</label><input id="fTarget" type="number" min="0" value="0"></div>
  <div class="field"><label>Realisasi Anggaran</label><input id="fReal" type="number" min="0" value="0"></div>
  <div class="field"><label>Target Output (Jumlah)</label><input id="fOutTarget" type="number" min="0" value="0"></div>
  <div class="field"><label>Realisasi Output (Jumlah)</label><input id="fOutReal" type="number" min="0" value="0"></div>
  <div class="field full"><label>Kendala Utama</label><textarea id="fKendala" placeholder="Isi jika ada kendala"></textarea></div>
  <div class="field full"><label>Tindak Lanjut</label><textarea id="fTindak" placeholder="Isi rencana tindak lanjut"></textarea></div>
 </div><div class="form-actions"><button class="primary" onclick="savePIC()">Simpan Data PIC</button></div></section>
`;
}

function kendaliView(){const rows=data().kendali||[];return `<div class="page-title"><div><h2>Kartu Kendali</h2><p>Perbandingan target dan realisasi kegiatan untuk pengendalian.</p></div><div class="toolbar"><button class="primary" onclick="window.print()">Cetak</button></div></div><section class="panel"><div class="table-wrap"><table class="data-table"><thead><tr><th>Kode</th><th>Kegiatan</th><th>Target Anggaran</th><th>Realisasi</th><th>Deviasi</th><th>Status</th></tr></thead><tbody>${rows.length?rows.map(x=>`<tr><td>${esc(x.kode)}</td><td>${esc(x.nama)}</td><td>${rupiah(x.target)}</td><td>${rupiah(x.real)}</td><td>${pct(x.dev)}</td><td>${status(x.status)}</td></tr>`).join(''):'<tr><td colspan="6" class="empty">Belum ada data kendali.</td></tr>'}</tbody></table></div></section>`}
function realisasiView(){const rows=data().realisasi||[];return `<div class="page-title"><div><h2>Rencana &amp; Realisasi</h2><p>Kontrol pencairan dan realisasi belanja berdasarkan transaksi yang terisi.</p></div></div><section class="panel"><div class="table-wrap"><table class="data-table"><thead><tr><th>Tanggal</th><th>Kode</th><th>Jenis</th><th>Rencana</th><th>Aktual</th><th>Selisih</th><th>Status</th></tr></thead><tbody>${rows.length?rows.map(x=>`<tr><td>${esc(x.tanggal)}</td><td>${esc(x.kode)}</td><td>${esc(x.jenis)}</td><td>${rupiah(x.rencana)}</td><td>${rupiah(x.aktual)}</td><td>${rupiah((Number(x.rencana)||0)-(Number(x.aktual)||0))}</td><td>${status(x.status)}</td></tr>`).join(''):'<tr><td colspan="7" class="empty">Belum ada transaksi rencana/realisasi.</td></tr>'}</tbody></table></div></section>`}
function monitoringView(){const rows=data().monitoring||[];return `<div class="page-title"><div><h2>Monitoring Mingguan</h2><p>Catatan progres mingguan, kendala dan PIC.</p></div></div><section class="panel"><div class="table-wrap"><table class="data-table"><thead><tr><th>Periode</th><th>Kode</th><th>Target %</th><th>Realisasi %</th><th>Deviasi</th><th>Kendala</th><th>PIC</th></tr></thead><tbody>${rows.length?rows.map(x=>`<tr><td>${esc(x.periode)}</td><td>${esc(x.kode)}</td><td>${pct(x.target)}</td><td>${pct(x.real)}</td><td>${pct((Number(x.real)||0)-(Number(x.target)||0))}</td><td>${esc(x.kendala||'-')}</td><td>${esc(x.pic||'-')}</td></tr>`).join(''):'<tr><td colspan="7" class="empty">Belum ada monitoring mingguan.</td></tr>'}</tbody></table></div></section>`}
function hambatanView(){const rows=data().hambatan||[];return `<div class="page-title"><div><h2>Hambatan &amp; Root Cause</h2><p>Masalah, akar penyebab, dampak dan status pengendalian.</p></div></div><section class="panel"><div class="table-wrap"><table class="data-table"><thead><tr><th>Kode</th><th>Masalah</th><th>Root Cause</th><th>Dampak</th><th>Level</th><th>Status</th></tr></thead><tbody>${rows.length?rows.map(x=>`<tr><td>${esc(x.kode)}</td><td>${esc(x.masalah)}</td><td>${esc(x.root)}</td><td>${esc(x.dampak)}</td><td>${esc(x.level)}</td><td>${status(x.status)}</td></tr>`).join(''):'<tr><td colspan="6" class="empty">Belum ada hambatan yang dicatat.</td></tr>'}</tbody></table></div></section>`}
function actionView(){const rows=data().action||[];return `<div class="page-title"><div><h2>Corrective Action</h2><p>Tindakan korektif, PIC, deadline dan status penyelesaian.</p></div></div><section class="panel"><div class="table-wrap"><table class="data-table"><thead><tr><th>Kode</th><th>Temuan</th><th>Tindakan</th><th>PIC</th><th>Deadline</th><th>Status</th></tr></thead><tbody>${rows.length?rows.map(x=>`<tr><td>${esc(x.kode)}</td><td>${esc(x.temuan)}</td><td>${esc(x.tindakan)}</td><td>${esc(x.pic)}</td><td>${esc(x.deadline)}</td><td>${status(x.status)}</td></tr>`).join(''):'<tr><td colspan="6" class="empty">Belum ada corrective action.</td></tr>'}</tbody></table></div></section>`}
function riskView(){const rows=data().risk||[];return `<div class="page-title"><div><h2>Risk Register</h2><p>Risiko, penyebab, dampak, mitigasi, PIC dan status.</p></div></div><section class="panel"><div class="table-wrap"><table class="data-table"><thead><tr><th>Kode</th><th>Risiko</th><th>Penyebab</th><th>Prob.</th><th>Dampak</th><th>Level</th><th>Mitigasi</th><th>Status</th></tr></thead><tbody>${rows.length?rows.map(x=>`<tr><td>${esc(x.kode)}</td><td>${esc(x.risiko)}</td><td>${esc(x.penyebab)}</td><td>${esc(x.prob)}</td><td>${esc(x.dampak)}</td><td>${status(x.level)}</td><td>${esc(x.mitigasi)}</td><td>${status(x.status)}</td></tr>`).join(''):'<tr><td colspan="8" class="empty">Belum ada risk register.</td></tr>'}</tbody></table></div></section>`}
function masterView(){const d=data();return `<div class="page-title"><div><h2>Master Data</h2><p>Baseline kegiatan dan anggaran yang menjadi sumber perhitungan sistem.</p></div></div><section class="panel"><div class="notice">Total pagu: <b>${rupiah(d.summary?.pagu)}</b>.</div>${activityTable(d.activities||[])}</section>`}
function reportView(){if(state.loading)return `<section class="panel loading-panel"><div class="loading">Memuat laporan…</div></section>`;if(state.error)return `<section class="panel error-panel"><h3>Laporan belum tersedia</h3><p>${esc(state.error)}</p><button class="secondary" onclick="loadAll()">↻ Coba Lagi</button></section>`;const d=data(),s=d.summary||{},att=d.attention||[];return `<div class="page-title"><div><h2>Laporan Pengendalian</h2><p>Laporan ringkas siap cetak untuk pimpinan.</p></div><button class="primary" onclick="window.print()">Cetak / PDF</button></div><section class="panel"><div class="report-head"><h1>LAPORAN PENGENDALIAN ANGGARAN BELANJA TAMBAHAN (ABT) 2026</h1><p>Deputi Bidang Pencegahan · Badan Narkotika Nasional Republik Indonesia</p></div><div class="report-grid"><div class="report-box"><span>Total Pagu</span><b>${rupiah(s.pagu)}</b></div><div class="report-box"><span>Pencairan Aktual</span><b>${rupiah(s.cair)}</b></div><div class="report-box"><span>Realisasi Belanja</span><b>${rupiah(s.belanja)}</b></div><div class="report-box"><span>Capaian Fisik</span><b>${pct(s.fisik)}</b></div></div><h3 style="margin-top:22px">1. Ringkasan Kondisi</h3><p style="font-size:12px;line-height:1.7">Pagu ABT sebesar <b>${rupiah(s.pagu)}</b>. Pencairan aktual sebesar <b>${rupiah(s.cair)}</b> dan realisasi belanja sebesar <b>${rupiah(s.belanja)}</b>. Capaian fisik tercatat <b>${pct(s.fisik)}</b> dan capaian output <b>${pct(s.outputPct)}</b>. Angka pada laporan mengikuti data yang telah tercatat pada sistem.</p><h3>2. Kegiatan yang Memerlukan Perhatian</h3>${att.length?att.map(x=>`<div style="padding:10px;border-left:3px solid #efb33b;background:#fffaf0;margin:7px 0;font-size:11px"><b>${esc(x.kode)}</b> — ${esc(x.problem)}. ${esc(x.impact)}. ${status(x.status)}</div>`).join(''):'<p class="empty">Belum ada kegiatan yang memerlukan perhatian berdasarkan data terisi.</p>'}<h3>3. Analisis Pengendalian</h3><p style="font-size:12px;line-height:1.7">Analisis membaca kesesuaian antara pagu, kebutuhan dana, rencana pencairan, pencairan aktual dan realisasi belanja. Progres fisik dan output dibaca dari monitoring terbaru per kegiatan. Hambatan, root cause dan corrective action digunakan sebagai dasar tindak lanjut.</p><h3>4. Tindak Lanjut</h3><p style="font-size:12px;line-height:1.7">Kegiatan yang menunjukkan deviasi perlu ditindaklanjuti melalui pembaruan monitoring, penetapan PIC, batas waktu, dokumentasi dan verifikasi penyelesaian. Sistem tidak mengubah data sumber; laporan mengikuti data terakhir yang tersimpan.</p><h3>5. Lampiran Kegiatan</h3>${activityTable(d.activities||[])}</section>`}
function docsView(){return `<div class="page-title"><div><h2>Dokumentasi</h2><p>Dokumen pendukung, bukti verifikasi dan arsip pengendalian.</p></div></div><section class="panel"><div class="empty">Dokumen pendukung dan bukti verifikasi dapat dicatat melalui modul Dokumentasi.</div></section>`}

function render(){const map={dashboard:dashboard,pic:picView,kendali:kendaliView,realisasi:realisasiView,monitoring:monitoringView,hambatan:hambatanView,action:actionView,risk:riskView,master:masterView,report:reportView,docs:docsView};document.getElementById('content').innerHTML=map[state.view]();document.querySelectorAll('.nav-item').forEach(x=>x.classList.toggle('active',x.dataset.view===state.view));}
function showView(v){state.view=v;render();window.scrollTo({top:0,behavior:'smooth'})}
async function loadAll(){
  state.loading=true;
  state.error='';
  render();
  const r=await api('getBootstrapData');
  state.loading=false;
  if(r && r.ok){
    state.data=r;
    state.error='';
    render();
    return true;
  }
  state.data=null;
  state.error=(r&&r.message)||'Data ABT belum dapat dibaca dari server.';
  render();
  return false;
}

async function savePIC(){
 const btn=document.querySelector('.form-actions .primary');
 const p={
  periode:document.getElementById('fPeriode').value,
  direktorat:document.getElementById('fDir').value,
  id_kegiatan:document.getElementById('fKegiatan').value,
  pic:document.getElementById('fPIC').value.trim(),
  deadline:document.getElementById('fDeadline').value,
  pagu:Number(document.getElementById('fPagu').value)||0,
  target:Number(document.getElementById('fTarget').value)||0,
  real:Number(document.getElementById('fReal').value)||0,
  outputTarget:Number(document.getElementById('fOutTarget').value)||0,
  outputReal:Number(document.getElementById('fOutReal').value)||0,
  status:'TERKENDALI',
  kendala:document.getElementById('fKendala').value.trim(),
  tindak:document.getElementById('fTindak').value.trim()
 };
 if(!p.id_kegiatan || !p.pic){
   alert('Kegiatan dan Nama PIC wajib diisi.');
   return;
 }
 if(btn){
   btn.disabled=true;
   btn.dataset.oldText=btn.textContent;
   btn.textContent='Menyimpan…';
 }
 try{
   const r=await api('savePICInput',p);
   if(r && r.ok){
     alert('Data PIC berhasil disimpan.');
     await loadAll();
   }else{
     alert((r&&r.message)||'Data belum berhasil disimpan. Silakan coba lagi.');
   }
 }catch(e){
   alert('Data belum berhasil disimpan. Silakan coba lagi.');
 }finally{
   if(btn){
     btn.disabled=false;
     btn.textContent=btn.dataset.oldText||'Simpan Data PIC';
   }
 }
}
function openModal(){document.getElementById('modal').classList.remove('hidden');document.body.classList.add('locked');document.getElementById('accessCode').focus();}
function closeModal(){if(state.access){document.getElementById('modal').classList.add('hidden');}}
function allowedViews(role){
 if(role==='PIC') return ['pic'];
 if(role==='PENGENDALI') return ['dashboard','kendali','realisasi','monitoring','hambatan','action','risk','master','report','docs'];
 if(role==='PIMPINAN') return ['report'];
 return [];
}
function applyRoleUI(){
 const allowed=allowedViews(state.role);
 document.querySelectorAll('.nav-item').forEach(b=>{const ok=allowed.includes(b.dataset.view);b.style.display=ok?'flex':'none';b.classList.toggle('active',b.dataset.view===state.view);});
 document.getElementById('roleLabel').textContent=state.role||'Pengguna';
 document.getElementById('roleSub').textContent=state.access?'Akses aktif':'Belum masuk';
}
async function access(){
 const code=document.getElementById('accessCode').value.trim(),msg=document.getElementById('accessMsg');
 if(!code){msg.textContent='Kode akses wajib diisi.';return;}
 msg.textContent='Memeriksa akses...';
 const r=await api('validateAccess',{code,role:state.selectedRole});
 if(!r.ok){msg.textContent=r.message||'Kode akses tidak sesuai.';return;}
 state.role=state.selectedRole;state.access=true;
 state.view=state.role==='PIC'?'pic':(state.role==='PIMPINAN'?'report':'dashboard');
 document.body.classList.remove('locked');
 document.getElementById('modal').classList.add('hidden');
 document.getElementById('accessCode').value='';
 document.getElementById('accessMsg').textContent='';
 applyRoleUI();
 await loadAll();
}
document.querySelectorAll('.nav-item').forEach(b=>b.addEventListener('click',()=>{if(!state.access)return; if(!allowedViews(state.role).includes(b.dataset.view))return;showView(b.dataset.view);}));
document.querySelectorAll('.role-card').forEach(b=>b.addEventListener('click',()=>{document.querySelectorAll('.role-card').forEach(x=>x.classList.remove('selected'));b.classList.add('selected');state.selectedRole=b.dataset.role;document.getElementById('accessMsg').textContent='';}));
document.getElementById('accessBtn').onclick=openModal;
document.getElementById('closeModal')?.addEventListener('click',()=>{});
document.getElementById('doAccess').onclick=access;
document.getElementById('logoutBtn').onclick=()=>{state.access=false;state.role='';state.view='pic';document.body.classList.add('locked');document.getElementById('modal').classList.remove('hidden');document.getElementById('roleLabel').textContent='Pengguna';document.getElementById('roleSub').textContent='Belum masuk';document.getElementById('accessCode').value='';document.getElementById('accessMsg').textContent='';applyRoleUI();};
function tick(){document.getElementById('clock').textContent=new Intl.DateTimeFormat('id-ID',{dateStyle:'full',timeStyle:'short'}).format(new Date())+' WIB'}setInterval(tick,1000);tick();
document.body.classList.add('locked');
applyRoleUI();
render();
