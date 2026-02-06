// FIREBASE
firebase.initializeApp({
  databaseURL: "https://nebula-plus-app-default-rtdb.firebaseio.com/"
});
const db = firebase.database();

let users = [], movies = [];
let currentBrand='disney', currentType='pelicula';
let datosSerieActual=[], hlsInstance=null;

// HELPERS (CRÍTICO PARA TV)
const $ = id => document.getElementById(id);

// CARGA FIREBASE
db.ref('users').on('value', s=>{
  const d=s.val(); users=[];
  for(let id in d) users.push(d[id]);
});

db.ref('movies').on('value', s=>{
  const d=s.val(); movies=[];
  for(let id in d) movies.push(d[id]);
  actualizarVista();
});

// LOGIN
function entrar(){
  const u = $('log-u').value;
  const p = $('log-p').value;

  const ok = users.find(x=>x.u===u && x.p===p);
  if(ok){
    $('sc-login').classList.add('hidden');
    $('sc-main').classList.remove('hidden');
    actualizarVista();
    tvScan();
  } else alert("Acceso denegado");
}

// VISTAS
function seleccionarMarca(b){ currentBrand=b; actualizarVista(); }
function cambiarTipo(t){ currentType=t; actualizarVista(); }

function actualizarVista(){
  $('cat-title').innerText=currentBrand+" > "+currentType;

  $('grid').innerHTML = movies
    .filter(m=>m.brand===currentBrand && m.type===currentType)
    .map(m=>`
      <div class="poster"
        style="background-image:url('${m.poster}')"
        onclick="reproducir('${m.video}','${m.title}')">
      </div>`).join('');

  tvScan();
}

// PLAYER
function reproducir(video,titulo){
  $('player-title').innerText=titulo;
  $('video-player').classList.remove('hidden');

  const item=movies.find(m=>m.title===titulo && m.video===video);

  if(item.type==='serie'){
    $('serie-controls').classList.remove('hidden');

    const t=item.video.split('|');
    datosSerieActual=t.map(x=>x.split(','));

    $('season-selector').innerHTML =
      datosSerieActual.map((_,i)=>`<option value="${i}">Temporada ${i+1}</option>`);

    cargarTemporada(0);
  } else {
    $('serie-controls').classList.add('hidden');
    gestionarFuenteVideo(video);
  }
}

function gestionarFuenteVideo(url){
  $('video-frame').innerHTML='';
  const v=document.createElement('video');
  v.controls=true; v.autoplay=true;
  $('video-frame').appendChild(v);

  if(url.includes('.m3u8') && Hls.isSupported()){
    hlsInstance=new Hls();
    hlsInstance.loadSource(url);
    hlsInstance.attachMedia(v);
  } else v.src=url;
}

function cargarTemporada(i){
  const caps=datosSerieActual[i];

  $('episodes-grid').innerHTML =
    caps.map((l,i)=>`<button onclick="gestionarFuenteVideo('${l}')">EP ${i+1}</button>`);

  gestionarFuenteVideo(caps[0]);
}

function cerrarReproductor(){
  if(hlsInstance) hlsInstance.destroy();
  $('video-player').classList.add('hidden');
  $('video-frame').innerHTML='';
}

// ===== TV NAV =====
let tvEls=[], tvI=0;

function tvScan(){
  tvEls=[...document.querySelectorAll('button,.poster,select,input')]
    .filter(e=>e.offsetParent);
  tvFocus(0);
}

function tvFocus(i){
  tvEls.forEach(e=>e.classList.remove('tv-focused'));
  if(tvEls[i]) tvEls[i].classList.add('tv-focused');
  tvI=i;
}

document.addEventListener('keydown',e=>{
  if(e.key==='ArrowRight') tvFocus(tvI+1);
  if(e.key==='ArrowLeft') tvFocus(tvI-1);
  if(e.key==='Enter') tvEls[tvI].click();
});
