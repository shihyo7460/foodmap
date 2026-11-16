/* 我們的日本美食地圖 — app logic
   資料：data.js 裡的推薦店家 + 自己新增的店家
   儲存：手機本機（localStorage），設定 Firebase 後兩人即時同步 */
"use strict";

// ---------- small helpers ----------
const $ = id => document.getElementById(id);
const ls = {
  get(k, d){ try{ const v = localStorage.getItem(k); return v ? JSON.parse(v) : d; }catch(e){ return d; } },
  set(k, v){ try{ localStorage.setItem(k, JSON.stringify(v)); }catch(e){} },
  del(k){ try{ localStorage.removeItem(k); }catch(e){} }
};
const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
let toastT = null;
function toast(msg, ms){ const t = $("toast"); t.textContent = msg; t.classList.add("on"); clearTimeout(toastT); toastT = setTimeout(() => t.classList.remove("on"), ms || 2600); }
const CITY_CENTER = { fukuoka:[33.5904,130.4017], osaka:[34.6700,135.5020], kyoto:[35.0040,135.7680] };

// ---------- state ----------
const st = {
  city: CITIES[ls.get("fm.city","")] ? ls.get("fm.city") : "fukuoka",
  cat: "all", seg: "all", q: "", sel: null,
  marks: ls.get("fm.marks", {}),
  custom: ls.get("fm.custom", {}),
  me: null, picking: false, moving: null
};

// ---------- sync (Firebase) ----------
const FB_VER = "10.12.2";
const sync = { cfg: ls.get("fm.fb", null), on: false, fs: null, unsub: [] };

function saveLocal(){ ls.set("fm.marks", st.marks); ls.set("fm.custom", st.custom); }
function tripRef(){ return sync.fs.collection("trips").doc(sync.cfg.code); }

function persistMark(id){
  saveLocal();
  if(!sync.on) return;
  const m = st.marks[id] || {};
  tripRef().collection("marks").doc(id).set({
    want: !!m.want, done: !!m.done, rating: m.rating || 0, note: m.note || "",
    pos: m.pos || null, at: Date.now()
  }).catch(syncErr);
}
function persistCustom(id, del){
  saveLocal();
  if(!sync.on) return;
  const ref = tripRef().collection("custom").doc(id);
  (del ? ref.delete() : ref.set(st.custom[id])).catch(syncErr);
}
function syncErr(e){ console.warn(e); setSyncChip("⚠ 同步失敗，點這裡檢查", false); }
function setSyncChip(text, ok){ const c = $("stSync"); c.textContent = text; c.classList.toggle("on", !!ok); }

function loadScript(src){
  return new Promise((res, rej) => { const s = document.createElement("script"); s.src = src; s.onload = res; s.onerror = () => rej(new Error("load " + src)); document.head.appendChild(s); });
}
async function startSync(){
  if(!sync.cfg) { setSyncChip("⚙ 只存在這支手機", false); return; }
  setSyncChip("☁ 連線中…", false);
  try{
    if(!window.firebase){
      const base = `https://www.gstatic.com/firebasejs/${FB_VER}/`;
      await loadScript(base + "firebase-app-compat.js");
      await Promise.all([loadScript(base + "firebase-auth-compat.js"), loadScript(base + "firebase-firestore-compat.js")]);
    }
    const app = firebase.apps.length ? firebase.app() : firebase.initializeApp(sync.cfg.config);
    await app.auth().signInAnonymously();
    sync.fs = app.firestore();
    try{ await sync.fs.enablePersistence({ synchronizeTabs: true }); }catch(e){ /* 已啟用或瀏覽器不支援，沒關係 */ }
    sync.on = true;
    const localMarks = { ...st.marks }, localCustom = { ...st.custom };
    let firstM = true, firstC = true;
    sync.unsub.push(tripRef().collection("marks").onSnapshot(snap => {
      const m = {}; snap.forEach(d => { m[d.id] = d.data(); });
      if(firstM){ firstM = false;   // 第一次連線：把這支手機原本的紀錄補上去
        for(const id in localMarks){ if(!m[id]){ m[id] = localMarks[id]; st.marks = m; persistMark(id); } }
      }
      st.marks = m; saveLocal(); renderAll(true);
      setSyncChip(snap.metadata.fromCache ? "☁ 離線中（連上網會自動同步）" : "☁ 兩人同步中", !snap.metadata.fromCache);
    }, syncErr));
    sync.unsub.push(tripRef().collection("custom").onSnapshot(snap => {
      const c = {}; snap.forEach(d => { const v = d.data(); if(v && v.name && CITIES[v.city] && isFinite(v.lat) && isFinite(v.lng)) c[d.id] = { ...v, id: d.id, custom: true }; });
      if(firstC){ firstC = false;
        for(const id in localCustom){ if(!c[id]){ c[id] = localCustom[id]; st.custom = c; persistCustom(id); } }
      }
      st.custom = c; saveLocal(); renderAll(true);
    }, syncErr));
  }catch(e){
    console.warn(e); sync.on = false;
    setSyncChip("⚠ 同步沒有連上，點這裡檢查", false);
  }
}
function stopSync(){
  sync.unsub.forEach(u => { try{ u(); }catch(e){} }); sync.unsub = []; sync.on = false;
  sync.cfg = null; ls.del("fm.fb"); setSyncChip("⚙ 只存在這支手機", false);
}

// 解析從 Firebase 複製來的設定（接受整段 `const firebaseConfig = {...}`）
function parseFbConfig(text){
  const a = text.indexOf("{"), b = text.lastIndexOf("}");
  if(a < 0 || b < a) throw new Error("找不到 { } 包住的設定內容");
  let body = text.slice(a, b + 1)
    .replace(/\/\/[^\n]*/g, "")
    .replace(/([{,]\s*)([A-Za-z_][\w]*)\s*:/g, '$1"$2":')
    .replace(/'/g, '"')
    .replace(/,\s*}/g, "}");
  const cfg = JSON.parse(body);
  for(const k of ["apiKey","authDomain","projectId","appId"]) if(!cfg[k]) throw new Error("設定裡缺少 " + k);
  return cfg;
}
function newTripCode(){
  const abc = "abcdefghijkmnpqrstuvwxyz23456789"; let s = "";
  const r = new Uint32Array(20); crypto.getRandomValues(r); r.forEach(n => s += abc[n % abc.length]);
  return s;
}
function inviteLink(){
  const payload = btoa(unescape(encodeURIComponent(JSON.stringify(sync.cfg)))).replace(/\+/g,"-").replace(/\//g,"_").replace(/=+$/,"");
  return location.origin + location.pathname + "#join=" + payload;
}
function readJoinHash(){
  const m = location.hash.match(/^#join=([\w-]+)/);
  if(!m) return;
  try{
    let b = m[1].replace(/-/g,"+").replace(/_/g,"/"); while(b.length % 4) b += "=";
    const cfg = JSON.parse(decodeURIComponent(escape(atob(b))));
    if(!cfg.config || !cfg.code) throw 0;
    sync.cfg = cfg; ls.set("fm.fb", cfg);
    toast("已加入同步！你們會看到同一份紀錄", 3500);
  }catch(e){ toast("邀請連結不完整，請對方重新複製一次", 4000); }
  history.replaceState(null, "", location.pathname);
}

// ---------- places ----------
const allPlaces = () => PLACES.concat(Object.values(st.custom));
const placeById = id => allPlaces().find(p => p.id === id);
const mark = id => st.marks[id] || {};
const stateOf = id => { const m = mark(id); return m.done ? "done" : (m.want ? "want" : ""); };
const posOf = p => { const m = mark(p.id); return (m.pos && isFinite(m.pos.lat)) ? [m.pos.lat, m.pos.lng] : [p.lat, p.lng]; };
const catOf = p => CATS[p.cat] || CATS.other;

function distKm(a, b){
  const R = 6371, toR = x => x * Math.PI / 180;
  const dLat = toR(b[0]-a[0]), dLng = toR(b[1]-a[1]);
  const h = Math.sin(dLat/2)**2 + Math.cos(toR(a[0]))*Math.cos(toR(b[0]))*Math.sin(dLng/2)**2;
  return 2 * R * Math.asin(Math.sqrt(h));
}
function distLabel(p){
  if(!st.me) return "";
  const d = distKm(st.me, posOf(p));
  if(d > 30) return "";
  if(d < 1.5) return "走路 " + Math.max(1, Math.round(d * 1000 / 75)) + " 分";
  return d.toFixed(1) + " 公里";
}
function visible(p){
  if(p.city !== st.city) return false;
  if(st.cat !== "all" && p.cat !== st.cat) return false;
  const s = stateOf(p.id);
  if(st.seg === "want" && s !== "want") return false;
  if(st.seg === "done" && s !== "done") return false;
  if(st.seg === "none" && s !== "") return false;
  if(st.q){
    const hay = (p.name + (p.jp||"") + (p.area||"") + catOf(p).label + (p.desc||"") + (mark(p.id).note||"")).toLowerCase();
    if(!hay.includes(st.q.toLowerCase())) return false;
  }
  return true;
}
function gmapsUrl(p){
  if(p.link && /^https:\/\//.test(p.link)) return p.link;
  return "https://www.google.com/maps/search/?api=1&query=" + encodeURIComponent((p.jp || p.name) + " " + CITIES[p.city].name);
}

// ---------- map ----------
const map = L.map("map", { zoomControl: true, attributionControl: true }).setView(CITY_CENTER[st.city], 14);
L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
  maxZoom: 19, attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
}).addTo(map);
const pinLayer = L.layerGroup().addTo(map);
let meMarker = null;
const markers = {};

function drawPins(){
  pinLayer.clearLayers();
  for(const k in markers) delete markers[k];
  allPlaces().filter(p => p.city === st.city).forEach(p => {
    const s = stateOf(p.id), vis = visible(p), sel = p.id === st.sel, moving = p.id === st.moving;
    const icon = L.divIcon({
      className: "",
      html: `<div class="pin ${s}${vis ? "" : " dim"}${sel ? " sel" : ""}${moving ? " moving" : ""}">${catOf(p).k}</div>`,
      iconSize: [32, 32], iconAnchor: [16, 16]
    });
    const mk = L.marker(posOf(p), { icon, draggable: moving, zIndexOffset: sel ? 1000 : (vis ? 100 : 0), keyboard: true, title: p.name }).addTo(pinLayer);
    if(sel) mk.bindTooltip(esc(p.name), { permanent: true, direction: "right", offset: [18, 0], className: "pinlbl" });
    mk.on("click", () => { if(!st.picking) select(p.id, false); });
    if(moving) mk.on("dragend", e => {
      const ll = e.target.getLatLng();
      st.marks[p.id] = { ...mark(p.id), pos: { lat: +ll.lat.toFixed(6), lng: +ll.lng.toFixed(6) } };
      persistMark(p.id); toast("位置已更新");
    });
    markers[p.id] = mk;
  });
}
function fitCity(){
  const pts = allPlaces().filter(p => p.city === st.city).map(posOf);
  if(pts.length) map.fitBounds(L.latLngBounds(pts), { padding: [30, 30], maxZoom: 15 });
  else map.setView(CITY_CENTER[st.city], 14);
}
function locateMe(cb){
  if(!navigator.geolocation){ toast("這個瀏覽器不支援定位"); return; }
  toast("定位中…");
  navigator.geolocation.getCurrentPosition(pos => {
    st.me = [pos.coords.latitude, pos.coords.longitude];
    const icon = L.divIcon({ className: "", html: '<div class="me"></div>', iconSize: [16,16], iconAnchor: [8,8] });
    if(meMarker) meMarker.setLatLng(st.me); else meMarker = L.marker(st.me, { icon, interactive: false, zIndexOffset: 2000 }).addTo(map);
    toast("找到你了"); renderList();
    if(cb) cb(st.me);
  }, err => {
    toast(err.code === 1 ? "沒有定位權限：請到手機設定允許這個網站使用位置" : "暫時抓不到位置，再試一次", 4000);
  }, { enableHighAccuracy: true, timeout: 12000, maximumAge: 30000 });
}
$("locBtn").onclick = () => locateMe(me => map.setView(me, Math.max(map.getZoom(), 16)));
$("fitBtn").onclick = fitCity;

// ---------- side panel ----------
const side = $("side");
function renderTabs(){
  const T = $("tabs"); T.innerHTML = "";
  for(const k in CITIES){
    const b = document.createElement("button"); b.setAttribute("role","tab"); b.textContent = CITIES[k].name;
    b.setAttribute("aria-selected", k === st.city); b.onclick = () => setCity(k); T.appendChild(b);
  }
}
function renderFilters(){
  const C = $("cats"); C.innerHTML = "";
  const present = new Set(allPlaces().filter(p => p.city === st.city).map(p => p.cat));
  if(st.cat !== "all" && !present.has(st.cat)) st.cat = "all";
  [["all","全部"]].concat(Object.keys(CATS).filter(k => present.has(k)).map(k => [k, CATS[k].k + " " + CATS[k].label])).forEach(([k,l]) => {
    const b = document.createElement("button"); b.textContent = l; b.setAttribute("aria-pressed", k === st.cat);
    b.onclick = () => { st.cat = k; renderAll(); }; C.appendChild(b);
  });
  const S = $("seg"); S.innerHTML = "";
  [["all","全部"],["want","♥ 想吃"],["done","✓ 吃過"],["none","還沒決定"]].forEach(([k,l]) => {
    const b = document.createElement("button"); b.textContent = l; b.setAttribute("aria-pressed", k === st.seg);
    b.onclick = () => { st.seg = k; renderAll(); }; S.appendChild(b);
  });
}
const starStr = n => n ? "★".repeat(n) + "☆".repeat(5 - n) : "";
function renderList(){
  const L_ = $("list");
  const order = { want:0, "":1, done:2 };
  let items = allPlaces().filter(visible);
  items.sort((a,b) => {
    if(st.me){ return distKm(st.me, posOf(a)) - distKm(st.me, posOf(b)); }
    return order[stateOf(a.id)] - order[stateOf(b.id)];
  });
  if(!items.length){ L_.innerHTML = `<div class="empty">這個條件下沒有店家。<br>換個篩選，或按「＋ 新增」加一間。</div>`; return; }
  L_.innerHTML = items.map(p => {
    const s = stateOf(p.id), m = mark(p.id), c = catOf(p), d = distLabel(p);
    const right = s === "done" ? `<span class="stars">${starStr(m.rating)}</span><br>吃過了` : s === "want" ? `<span style="color:var(--shu)">♥ 想吃</span>` : (p.price || "");
    return `<button class="item${p.id === st.sel ? " sel" : ""}" data-id="${esc(p.id)}">
      <span class="k ${s}">${c.k}</span>
      <span><span class="n">${esc(p.name)}</span><br><span class="m">${esc(p.area || "")} · ${c.label}${p.custom ? " · 我們加的" : ""}${m.note ? " · 📝" : ""}${d ? " · " + d : ""}</span></span>
      <span class="s">${right}</span></button>`;
  }).join("");
  L_.querySelectorAll(".item").forEach(b => b.onclick = () => select(b.dataset.id, true));
}
let noteTimer = null;
function renderDetail(){
  const D = $("detail"), p = st.sel && placeById(st.sel);
  if(!p){ side.classList.remove("showdetail"); return; }
  side.classList.add("showdetail");
  const m = mark(p.id), c = catOf(p), d = distLabel(p);
  D.innerHTML = `
    <button class="back" id="dBack">← 回到清單</button>
    <h2>${esc(p.name)}</h2>
    <div class="jp">${esc(p.jp || "")}</div>
    <div class="meta"><span class="chip">${c.k} ${c.label}</span><span class="chip">${esc(p.area || CITIES[p.city].name)}</span>${p.price ? `<span class="chip">${p.price}</span>` : ""}${d ? `<span class="chip">📍 ${d}</span>` : ""}${p.custom ? `<span class="chip">我們加的</span>` : ""}</div>
    ${p.desc ? `<p>${esc(p.desc)}</p>` : ""}
    ${p.tip ? `<div class="tip">${esc(p.tip)}</div>` : ""}
    <div class="acts">
      <button class="toggle want" id="tWant" aria-pressed="${!!m.want}">♥ 想吃</button>
      <button class="toggle done" id="tDone" aria-pressed="${!!m.done}">✓ 吃過了</button>
    </div>
    <div class="rate" id="rate"><span class="small" style="margin-right:6px">我們的評分</span>${[1,2,3,4,5].map(i => `<button type="button" data-r="${i}" class="${(m.rating||0) >= i ? "on" : ""}" aria-label="${i} 顆星">★</button>`).join("")}</div>
    <label class="lab" for="note">我們的筆記</label>
    <textarea id="note" placeholder="要點什麼、誰說好吃、下次想試…">${esc(m.note || "")}</textarea>
    <a class="gmaps" href="${esc(gmapsUrl(p))}" target="_blank" rel="noopener">📍 用 Google 地圖導航</a>
    <button class="linkbtn" id="dMove">${st.moving === p.id ? "✓ 移好了" : "圖釘位置不對？拖曳修正"}</button>
    <p class="small">營業時間和公休日常會變動，出發前請在 Google 地圖再確認一次。</p>
    ${p.custom ? `<button class="btn danger" id="dDel">刪除這間店</button>` : ""}`;
  $("dBack").onclick = () => { st.sel = null; st.moving = null; renderAll(); };
  $("tWant").onclick = () => updMark(p.id, { want: !m.want });
  $("tDone").onclick = () => updMark(p.id, m.done ? { done:false } : { done:true, want:false });
  D.querySelectorAll("#rate button").forEach(b => b.onclick = () => { const r = +b.dataset.r; updMark(p.id, { rating: m.rating === r ? 0 : r }); });
  const ta = $("note");
  ta.oninput = () => { clearTimeout(noteTimer); const v = ta.value; noteTimer = setTimeout(() => { st.marks[p.id] = { ...mark(p.id), note: v }; persistMark(p.id); renderList(); }, 700); };
  $("dMove").onclick = () => {
    if(st.moving === p.id){ st.moving = null; }
    else { st.moving = p.id; map.setView(posOf(p), Math.max(map.getZoom(), 17)); toast("按住圖釘拖到正確位置", 3500); }
    renderAll();
  };
  const del = $("dDel");
  if(del) del.onclick = () => {
    if(del.dataset.confirm){ delete st.custom[p.id]; persistCustom(p.id, true); st.sel = null; renderAll(); toast("已刪除"); }
    else { del.dataset.confirm = "1"; del.textContent = "再按一次確認刪除"; }
  };
}
function updMark(id, patch){ st.marks[id] = { ...mark(id), ...patch }; persistMark(id); renderAll(); }
function renderStats(){
  const ids = allPlaces().map(p => p.id);
  $("stWant").textContent = "♥ 想吃 " + ids.filter(i => stateOf(i) === "want").length;
  $("stDone").textContent = "✓ 吃過 " + ids.filter(i => stateOf(i) === "done").length;
}
function renderAll(fromSync){
  renderTabs(); renderFilters(); renderList(); drawPins(); renderStats();
  // 對方同步過來時，如果你正在打筆記，就先不要重畫，免得打到一半被蓋掉
  if(!(fromSync && document.activeElement && document.activeElement.id === "note")) renderDetail();
}
function select(id, pan){
  const p = placeById(id); if(!p) return;
  if(p.city !== st.city){ st.city = p.city; ls.set("fm.city", p.city); }
  if(st.moving && st.moving !== id) st.moving = null;
  st.sel = id; renderAll();
  if(pan) map.setView(posOf(p), Math.max(map.getZoom(), 16));
}
function setCity(k){
  st.city = k; st.sel = null; st.moving = null; st.cat = "all"; ls.set("fm.city", k);
  renderAll(); fitCity();
}
$("q").addEventListener("input", e => { st.q = e.target.value.trim(); renderAll(); });

// ---------- add place ----------
const addDlg = $("addDlg"), pickbar = $("pickbar");
let pickLL = null;
$("fCat").innerHTML = Object.keys(CATS).map(k => `<option value="${k}">${CATS[k].k} ${CATS[k].label}</option>`).join("");
$("addBtn").onclick = () => { st.picking = true; pickbar.classList.add("on"); document.body.classList.add("picking"); };
function endPicking(){ st.picking = false; pickbar.classList.remove("on"); document.body.classList.remove("picking"); }
$("pickCancel").onclick = endPicking;
$("pickHere").onclick = () => locateMe(me => { pickLL = me; openAdd("用你現在的位置"); });
map.on("click", e => { if(!st.picking) return; pickLL = [e.latlng.lat, e.latlng.lng]; openAdd("已在地圖上選好位置"); });
function openAdd(where){
  endPicking(); $("addForm").reset();
  $("addWhere").textContent = CITIES[st.city].name + "・" + where;
  try{ addDlg.showModal(); }catch(e){ addDlg.setAttribute("open",""); }
}
$("addCancel").onclick = () => addDlg.close();
$("addForm").addEventListener("submit", e => {
  e.preventDefault();
  const name = $("fName").value.trim(); if(!name || !pickLL) return;
  // 判斷新店家離哪個城市最近
  let city = st.city, best = 1e9;
  for(const k in CITY_CENTER){ const d = distKm(pickLL, CITY_CENTER[k]); if(d < best){ best = d; city = k; } }
  const id = "c-" + Date.now().toString(36) + Math.random().toString(36).slice(2,6);
  const link = $("fLink").value.trim();
  st.custom[id] = { id, city, custom:true, name, jp: $("fJp").value.trim(), cat: $("fCat").value, area: $("fArea").value.trim(),
    lat: +pickLL[0].toFixed(6), lng: +pickLL[1].toFixed(6), desc: $("fDesc").value.trim(), link: /^https:\/\//.test(link) ? link : "", at: Date.now() };
  persistCustom(id);
  st.marks[id] = { ...mark(id), want: true }; persistMark(id);
  addDlg.close(); select(id, true); toast("已加到地圖");
});

// ---------- sync dialog ----------
const syncDlg = $("syncDlg");
$("syncClose").onclick = () => syncDlg.close();
$("stSync").onclick = () => { renderSyncDlg(); try{ syncDlg.showModal(); }catch(e){ syncDlg.setAttribute("open",""); } };
function renderSyncDlg(){
  const B = $("syncBody");
  if(sync.cfg){
    B.innerHTML = `
      <p>${sync.on ? '<span class="ok">● 同步中</span>' : '<span class="err">● 目前沒有連上</span>'}　專案：<code>${esc(sync.cfg.config.projectId)}</code></p>
      <p class="small">把下面的邀請連結傳給女朋友，她用手機打開就會加入同一份紀錄。這個連結等於你們的鑰匙，不要貼到公開的地方。</p>
      <button type="button" class="btn full" id="sInvite">分享邀請連結</button>
      <button type="button" class="btn ghost full" id="sCopy">複製邀請連結</button>
      ${sync.on ? "" : '<button type="button" class="btn ghost full" id="sRetry">重新連線</button><p class="err">如果一直連不上：確認 Firebase 已開啟「匿名登入」和 Firestore，而且安全規則已貼上（見設定說明）。</p>'}
      <button type="button" class="linkbtn" id="sStop">這支手機停止同步</button>`;
    $("sInvite").onclick = async () => {
      const url = inviteLink();
      if(navigator.share){ try{ await navigator.share({ title: "我們的日本美食地圖", text: "打開這個連結，一起標記日本想吃的店", url }); return; }catch(e){ if(e && e.name === "AbortError") return; } }
      copyText(url);
    };
    $("sCopy").onclick = () => copyText(inviteLink());
    const r = $("sRetry"); if(r) r.onclick = () => { syncDlg.close(); startSync(); };
    $("sStop").onclick = () => { stopSync(); renderSyncDlg(); toast("這支手機已停止同步，紀錄還留在手機上"); };
  } else {
    B.innerHTML = `
      <p class="small">現在紀錄只存在這支手機。要和女朋友同步，二選一：</p>
      <p><b>A. 她已經設定好了</b>：請她在這個畫面按「分享邀請連結」傳給你，你打開連結就好。</p>
      <p><b>B. 由你來設定</b>：把 Firebase 的設定整段貼在下面（以 <code>const firebaseConfig = {</code> 開頭那段）。</p>
      <textarea id="sCfg" placeholder="const firebaseConfig = {&#10;  apiKey: &quot;…&quot;,&#10;  authDomain: &quot;…&quot;,&#10;  projectId: &quot;…&quot;,&#10;  …&#10;};"></textarea>
      <p class="err" id="sErr"></p>
      <button type="button" class="btn full" id="sSave">開始同步</button>`;
    $("sSave").onclick = async () => {
      try{
        const config = parseFbConfig($("sCfg").value);
        sync.cfg = { config, code: newTripCode() }; ls.set("fm.fb", sync.cfg);
        $("sErr").textContent = ""; await startSync(); renderSyncDlg();
        if(sync.on) toast("同步開好了！接著把邀請連結傳給女朋友", 3500);
      }catch(e){ $("sErr").textContent = "看不懂這段設定：" + e.message + "。請整段重新複製貼上。"; }
    };
  }
}
function copyText(t){
  (navigator.clipboard ? navigator.clipboard.writeText(t) : Promise.reject()).then(
    () => toast("已複製，貼到 LINE 傳給她"),
    () => { window.prompt("複製這個連結：", t); }
  );
}

// ---------- boot ----------
readJoinHash();
renderAll();
fitCity();
startSync();
if("serviceWorker" in navigator && location.protocol === "https:"){
  navigator.serviceWorker.register("sw.js").catch(() => {});
}
