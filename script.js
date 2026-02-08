const firebaseConfig = { databaseURL: "https://nebula-plus-app-default-rtdb.firebaseio.com/" };
if (!firebase.apps.length) firebase.initializeApp(firebaseConfig);
const db = firebase.database();

let users = []; let movies = []; let currentBrand = 'disney'; let currentType = 'pelicula';
let videoActualUrl = ""; let hlsInstance = null;

// ==========================================
// CONTROL REMOTO - NAVEGACIÓN Y PLAY/PAUSE
// ==========================================
document.addEventListener('keydown', (e) => {
    const activeScreen = document.querySelector('.screen:not(.hidden), .player-overlay:not(.hidden)');
    if (!activeScreen) return;

    const focusables = Array.from(activeScreen.querySelectorAll('.tv-focusable:not(.hidden)'));
    let index = focusables.indexOf(document.activeElement);
    const cols = 8; 

    const elActivo = document.activeElement;
    const esPoster = elActivo.classList.contains('poster');
    const esBuscador = elActivo.id === 'search-box';
    const esPlayerActivo = !document.getElementById('video-player-final').classList.contains('hidden');
    const esBotonCerrar = elActivo.classList.contains('btn-close-player');
    const esVideoCore = elActivo.id === 'v-core';

    // --- LÓGICA DE PAUSA/PLAY VS CERRAR ---
    if (e.key === 'Enter' && esPlayerActivo) {
        e.preventDefault();
        if (esVideoCore) {
            const video = document.getElementById('v-core');
            if (video) {
                if (video.paused) video.play();
                else video.pause();
            }
        } else if (esBotonCerrar) {
            cerrarReproductorAFicha();
        }
        return;
    }

    if (e.key === 'ArrowRight') {
        if (esPlayerActivo) return; // Bloquear lateral en player si no hay más botones
        e.preventDefault();
        if (esBuscador) {
            const avatar = document.querySelector('.avatar');
            if (avatar) avatar.focus();
        } else if (index < focusables.length - 1) {
            focusables[index + 1].focus();
        }
    }

    if (e.key === 'ArrowLeft') {
        if (esPlayerActivo) return;
        e.preventDefault();
        if (index > 0) focusables[index - 1].focus();
    }

    if (e.key === 'ArrowDown') {
        e.preventDefault();
        if (esPlayerActivo) {
            // Si estamos en el botón cerrar, bajar el foco al video para poder pausar
            document.getElementById('v-core').focus();
        } else if (esPoster) {
            if (index + cols < focusables.length) focusables[index + cols].focus();
        } else {
            const primerPoster = document.querySelector('.poster');
            if (primerPoster) primerPoster.focus();
        }
    }

    if (e.key === 'ArrowUp') {
        e.preventDefault();
        if (esPlayerActivo) {
            // Si estamos en el video, subir el foco al botón cerrar
            document.querySelector('.btn-close-player').focus();
        } else if (esPoster) {
            const filaActual = Array.from(document.querySelectorAll('.poster')).indexOf(elActivo);
            if (filaActual < cols) {
                document.getElementById('search-box').focus();
            } else {
                focusables[index - cols].focus();
            }
        } else {
            if (index > 0) focusables[index - 1].focus();
        }
    }

    if (e.key === 'Enter' && !esPlayerActivo) {
        e.preventDefault();
        if (elActivo) elActivo.click();
    }
});

// ==========================================
// BUSCADOR EN TIEMPO REAL
// ==========================================
function buscar() {
    const q = document.getElementById('search-box').value.toLowerCase();
    if (q.trim() === "") { actualizarVista(); return; }
    const filtrados = movies.filter(m => m.title.toLowerCase().includes(q));
    document.getElementById('cat-title').innerText = "Resultados: " + q;
    renderGrid(filtrados);
}

// ==========================================
// GESTIÓN DE SESIÓN
// ==========================================
function entrar() {
    const u = document.getElementById('log-u').value;
    const p = document.getElementById('log-p').value;
    const user = users.find(x => x.u === u && x.p === p);
    if(user) {
        document.getElementById('u-name').innerText = "Hola, " + u;
        document.getElementById('sc-login').classList.add('hidden');
        document.getElementById('sc-main').classList.remove('hidden');
        setTimeout(() => document.getElementById('search-box').focus(), 300);
    } else { alert("Acceso denegado"); }
}

function cerrarSesion() {
    document.getElementById('sc-main').classList.add('hidden');
    document.getElementById('sc-login').classList.remove('hidden');
    document.getElementById('drop-menu').classList.add('hidden');
    document.getElementById('log-u').value = "";
    document.getElementById('log-p').value = "";
    setTimeout(() => document.getElementById('log-u').focus(), 100);
}

function toggleMenu() { document.getElementById('drop-menu').classList.toggle('hidden'); }

// ==========================================
// REPRODUCTOR
// ==========================================
function lanzarReproductor() {
    document.getElementById('sc-pre-video').classList.add('hidden');
    document.getElementById('video-player-final').classList.remove('hidden');
    const container = document.getElementById('video-canvas');
    
    // El video ahora tiene la clase tv-focusable para recibir el foco
    container.innerHTML = `<video id="v-core" class="tv-focusable" tabindex="0" style="width:100%; height:100%;" autoplay></video>`;
    const video = document.getElementById('v-core');

    if (videoActualUrl.includes('.m3u8') && Hls.isSupported()) {
        hlsInstance = new Hls(); hlsInstance.loadSource(videoActualUrl); hlsInstance.attachMedia(video);
    } else { video.src = videoActualUrl; }

    document.getElementById('video-title-ui').innerText = document.getElementById('pre-title').innerText;
    video.ontimeupdate = () => { 
        const bar = document.getElementById('progress-bar-new');
        if(bar) bar.style.width = (video.currentTime / video.duration) * 100 + "%"; 
    };

    // Foco inicial al video para pausar con OK de inmediato
    setTimeout(() => video.focus(), 300);
}

function cerrarReproductorAFicha() {
    const v = document.getElementById('v-core');
    if(v) { v.pause(); v.src = ""; }
    if(hlsInstance) hlsInstance.destroy();
    document.getElementById('video-player-final').classList.add('hidden');
    document.getElementById('sc-pre-video').classList.remove('hidden');
    setTimeout(() => document.getElementById('btn-main-play').focus(), 150);
}

// ==========================================
// FIREBASE Y RENDERS (RESTO DEL CÓDIGO)
// ==========================================
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
    document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
    document.getElementById(t === 'pelicula' ? 't-peli' : 't-serie').classList.add('active');
    actualizarVista(); 
}

function actualizarVista() {
    document.getElementById('cat-title').innerText = currentBrand + " / " + currentType;
    const filtrados = movies.filter(m => m.brand === currentBrand && m.type === currentType);
    renderGrid(filtrados);
}

function renderGrid(lista) {
    document.getElementById('grid').innerHTML = lista.map(m => `
        <div class="poster tv-focusable" tabindex="0" style="background-image:url('${m.poster}')" 
             onclick="previsualizar('${m.video}', '${m.title}')"></div>
    `).join('');
}

function previsualizar(url, titulo) {
    videoActualUrl = url;
    const m = movies.find(x => x.title === titulo);
    document.getElementById('sc-main').classList.add('hidden');
    const pre = document.getElementById('sc-pre-video');
    pre.style.backgroundImage = `url('${m.poster}')`;
    document.getElementById('pre-title').innerText = titulo;
    pre.classList.remove('hidden');
    setTimeout(() => document.getElementById('btn-main-play').focus(), 200);
}

function volverAlCatalogo() {
    document.getElementById('sc-pre-video').classList.add('hidden');
    document.getElementById('sc-main').classList.remove('hidden');
}

window.onload = () => document.getElementById('log-u').focus();
