const firebaseConfig = { databaseURL: "https://nebula-plus-app-default-rtdb.firebaseio.com/" };
if (!firebase.apps.length) firebase.initializeApp(firebaseConfig);
const db = firebase.database();

let users = []; let movies = []; let currentBrand = 'disney'; let currentType = 'pelicula';
let videoActualUrl = ""; let hlsInstance = null; let guiTimeout;

// CONTROL REMOTO [cite: 2026-02-06]
document.addEventListener('keydown', (e) => {
    if (!document.getElementById('video-player-final').classList.contains('hidden')) showControls();
    if (e.keyCode === 8 || e.keyCode === 27 || e.keyCode === 10009) {
        if (!document.getElementById('video-player-final').classList.contains('hidden')) { cerrarReproductorFinal(); e.preventDefault(); }
        else if (!document.getElementById('sc-pre-video').classList.contains('hidden')) { document.getElementById('sc-pre-video').classList.add('hidden'); document.getElementById('sc-main').classList.remove('hidden'); e.preventDefault(); }
    }
});

// LOGIN Y BUSQUEDA ORIGINAL
function entrar() {
    const u = document.getElementById('log-u').value;
    const p = document.getElementById('log-p').value;
    const user = users.find(x => x.u === u && x.p === p);
    if(user) {
        document.getElementById('u-name').innerText = "Hola, " + u;
        document.getElementById('sc-login').classList.add('hidden');
        document.getElementById('sc-main').classList.remove('hidden');
    } else { alert("Acceso denegado"); }
}

function buscar() {
    const q = document.getElementById('search-box').value.toLowerCase();
    const filtrados = movies.filter(m => m.brand === currentBrand && m.type === currentType && m.title.toLowerCase().includes(q));
    renderGrid(filtrados);
}

function toggleMenu() { document.getElementById('drop-menu').classList.toggle('hidden'); }
function cerrarSesion() { document.getElementById('sc-main').classList.add('hidden'); document.getElementById('sc-login').classList.remove('hidden'); }

// DATA LOADING
db.ref('users').on('value', snap => {
    const data = snap.val(); users = [];
    if(data) for(let id in data) users.push({ ...data[id], id });
});

db.ref('movies').on('value', snap => {
    const data = snap.val(); movies = [];
    if(data) for(let id in data) movies.push({ ...data[id], id });
    actualizarVista();
});

function seleccionarMarca(b) { currentBrand = b; actualizarVista(); }
function cambiarTipo(t) { 
    currentType = t; 
    document.querySelectorAll('.filter-btn').forEach(btn => btn.classList.remove('active'));
    document.getElementById(t === 'pelicula' ? 't-peli' : 't-serie').classList.add('active');
    actualizarVista(); 
}

function actualizarVista() {
    document.getElementById('cat-title').innerText = currentBrand + " / " + (currentType === 'pelicula' ? 'Películas' : 'Series'); // [cite: 2026-01-31]
    const filtrados = movies.filter(m => m.brand === currentBrand && m.type === currentType);
    renderGrid(filtrados);
}

function renderGrid(lista) {
    document.getElementById('grid').innerHTML = lista.map(m => `
        <div class="poster tv-focusable" tabindex="0" style="background-image:url('${m.poster}')" onclick="previsualizar('${m.video}', '${m.title}')"></div>
    `).join('');
}

// VIDEO ENGINE [cite: 2026-01-29]
function previsualizar(url, titulo) {
    const m = movies.find(x => x.title === titulo);
    videoActualUrl = url;
    document.getElementById('sc-main').classList.add('hidden');
    const pre = document.getElementById('sc-pre-video');
    pre.style.backgroundImage = `url('${m.poster}')`;
    document.getElementById('pre-title').innerText = titulo;
    pre.classList.remove('hidden');
    setTimeout(() => document.getElementById('btn-main-play').focus(), 200);
}

function lanzarReproductor() {
    document.getElementById('sc-pre-video').classList.add('hidden');
    document.getElementById('video-player-final').classList.remove('hidden');
    const container = document.getElementById('video-canvas');
    container.innerHTML = `<video id="v-core" style="width:100%; height:100%;"></video>`;
    const video = document.getElementById('v-core');

    if (videoActualUrl.includes('.m3u8') && Hls.isSupported()) {
        hlsInstance = new Hls(); hlsInstance.loadSource(videoActualUrl); hlsInstance.attachMedia(video);
    } else { video.src = videoActualUrl; }

    video.play();
    document.getElementById('video-title-ui').innerText = document.getElementById('pre-title').innerText;
    video.ontimeupdate = () => { document.getElementById('progress-bar-new').style.width = (video.currentTime / video.duration) * 100 + "%"; };
    showControls();
}

function showControls() {
    const gui = document.getElementById('player-gui');
    gui.classList.remove('fade-out');
    clearTimeout(guiTimeout);
    guiTimeout = setTimeout(() => gui.classList.add('fade-out'), 3000);
}

function togglePlayPause() {
    const v = document.getElementById('v-core');
    if (v.paused) v.play(); else v.pause();
    showControls();
}
function skip(t) { document.getElementById('v-core').currentTime += t; showControls(); }
function cerrarReproductorFinal() {
    const v = document.getElementById('v-core');
    if(v) { v.pause(); v.src = ""; }
    if(hlsInstance) hlsInstance.destroy();
    document.getElementById('video-player-final').classList.add('hidden');
    document.getElementById('sc-main').classList.remove('hidden');
}
