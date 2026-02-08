const firebaseConfig = { databaseURL: "https://nebula-plus-app-default-rtdb.firebaseio.com/" };
if (!firebase.apps.length) firebase.initializeApp(firebaseConfig);
const db = firebase.database();

let users = []; let movies = []; 
let currentBrand = 'disney'; 
let currentType = 'pelicula';
let videoActualUrl = ""; let hlsInstance = null; let guiTimeout;

// CONTROL REMOTO
document.addEventListener('keydown', (e) => {
    const activeScreen = document.querySelector('.screen:not(.hidden), .player-overlay:not(.hidden)');
    if (!activeScreen) return;

    if (!document.getElementById('video-player-final').classList.contains('hidden')) showControls();

    if (e.keyCode === 8 || e.keyCode === 27 || e.keyCode === 10009) {
        if (!document.getElementById('video-player-final').classList.contains('hidden')) { cerrarReproductorFinal(); e.preventDefault(); }
        else if (!document.getElementById('sc-pre-video').classList.contains('hidden')) { 
            document.getElementById('sc-pre-video').classList.add('hidden'); 
            document.getElementById('sc-main').classList.remove('hidden'); 
            e.preventDefault(); 
        }
        return;
    }

    const focusables = Array.from(activeScreen.querySelectorAll('.tv-focusable:not(.hidden)'));
    let index = focusables.indexOf(document.activeElement);
    let nextIndex = index;
    const columns = 8; 

    if (e.key === 'ArrowRight') nextIndex = index + 1;
    if (e.key === 'ArrowLeft') nextIndex = index - 1;
    if (e.key === 'ArrowDown') {
        if (document.activeElement.classList.contains('poster')) nextIndex = index + columns;
        else nextIndex = index + 1;
    }
    if (e.key === 'ArrowUp') {
        if (document.activeElement.classList.contains('poster')) nextIndex = index - columns;
        else nextIndex = index - 1;
    }

    if (focusables[nextIndex]) {
        e.preventDefault();
        focusables[nextIndex].focus();
    }

    if (e.key === 'Enter') {
        e.preventDefault();
        document.activeElement.click();
    }
});

// LOGIN
function entrar() {
    const u = document.getElementById('log-u').value;
    const p = document.getElementById('log-p').value;
    const user = users.find(x => x.u === u && x.p === p);
    if(user) {
        document.getElementById('u-name').innerText = "Hola, " + u;
        document.getElementById('sc-login').classList.add('hidden');
        document.getElementById('sc-main').classList.remove('hidden');
        setTimeout(() => document.querySelector('.brand-bar button').focus(), 300);
    } else { alert("Usuario o contraseña incorrectos"); }
}

// BÚSQUEDA EN TIEMPO REAL
function buscar() {
    const q = document.getElementById('search-box').value.toLowerCase();
    
    if (q.trim() === "") {
        actualizarVista();
        return;
    }

    // Búsqueda global en todas las marcas
    const filtrados = movies.filter(m => m.title.toLowerCase().includes(q));
    document.getElementById('cat-title').innerText = "Resultados para: " + q;
    renderGrid(filtrados);
}

// MENÚ DE USUARIO Y CERRAR SESIÓN
function toggleMenu() { 
    document.getElementById('drop-menu').classList.toggle('hidden'); 
}

function cerrarSesion() {
    // Resetear app
    document.getElementById('sc-main').classList.add('hidden');
    document.getElementById('sc-login').classList.remove('hidden');
    document.getElementById('log-u').value = "";
    document.getElementById('log-p').value = "";
    document.getElementById('search-box').value = "";
    document.getElementById('drop-menu').classList.add('hidden');
    setTimeout(() => document.getElementById('log-u').focus(), 200);
}

// DATOS
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
    document.getElementById('cat-title').innerText = currentBrand + " / " + (currentType === 'pelicula' ? 'Películas' : 'Series');
    const filtrados = movies.filter(m => m.brand === currentBrand && m.type === currentType);
    renderGrid(filtrados);
}

function renderGrid(lista) {
    const grid = document.getElementById('grid');
    if (lista.length === 0) {
        grid.innerHTML = `<p style="margin-left:40px; color:gray;">No se encontraron resultados.</p>`;
        return;
    }
    grid.innerHTML = lista.map(m => `
        <div class="poster tv-focusable" tabindex="0" style="background-image:url('${m.poster}')" onclick="previsualizar('${m.video}', '${m.title}')"></div>
    `).join('');
}

// PREVISUALIZACIÓN Y VIDEO
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
    container.innerHTML = `<video id="v-core" style="width:100%; height:100%;" autoplay></video>`;
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
    guiTimeout = setTimeout(() => gui.classList.add('fade-out'), 4000);
}

function togglePlayPause() {
    const v = document.getElementById('v-core');
    if (v.paused) { v.play(); document.getElementById('btn-play-pause').innerText = "⏸"; } 
    else { v.pause(); document.getElementById('btn-play-pause').innerText = "▶"; }
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

window.onload = () => document.getElementById('log-u').focus();
