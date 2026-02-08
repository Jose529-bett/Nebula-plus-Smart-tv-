const firebaseConfig = { databaseURL: "https://nebula-plus-app-default-rtdb.firebaseio.com/" };
if (!firebase.apps.length) firebase.initializeApp(firebaseConfig);
const db = firebase.database();

let users = []; 
let movies = []; 
let currentBrand = 'disney'; 
let currentType = 'pelicula';
let videoActualUrl = ""; 
let hlsInstance = null;

// ==========================================
// CONTROL REMOTO - NAVEGACIÓN (8 COLUMNAS)
// ==========================================
document.addEventListener('keydown', (e) => {
    const activeScreen = document.querySelector('.screen:not(.hidden), .player-overlay:not(.hidden)');
    if (!activeScreen) return;

    const focusables = Array.from(activeScreen.querySelectorAll('.tv-focusable:not(.hidden)'));
    let index = focusables.indexOf(document.activeElement);
    const cols = 8; 

    if (e.key === 'ArrowRight') index++;
    if (e.key === 'ArrowLeft') index--;
    if (e.key === 'ArrowDown') {
        index = (document.activeElement.classList.contains('poster')) ? index + cols : index + 1;
    }
    if (e.key === 'ArrowUp') {
        index = (document.activeElement.classList.contains('poster')) ? index - cols : index - 1;
    }

    if (focusables[index]) { 
        e.preventDefault(); 
        focusables[index].focus(); 
    }

    if (e.key === 'Enter') {
        e.preventDefault();
        if (document.activeElement) document.activeElement.click();
    }
});

// ==========================================
// BUSCADOR EN TIEMPO REAL (PERMITE BORRAR)
// ==========================================
function buscar() {
    const q = document.getElementById('search-box').value.toLowerCase();
    
    // Si el campo está vacío (al borrar), vuelve a la marca/tipo seleccionado
    if (q.trim() === "") { 
        actualizarVista(); 
        return; 
    }
    
    const filtrados = movies.filter(m => m.title.toLowerCase().includes(q));
    document.getElementById('cat-title').innerText = "Resultados: " + q;
    renderGrid(filtrados);
}

// ==========================================
// GESTIÓN DE SESIÓN Y MENÚ
// ==========================================
function entrar() {
    const u = document.getElementById('log-u').value;
    const p = document.getElementById('log-p').value;
    const user = users.find(x => x.u === u && x.p === p);
    if(user) {
        document.getElementById('u-name').innerText = "Hola, " + u;
        document.getElementById('sc-login').classList.add('hidden');
        document.getElementById('sc-main').classList.remove('hidden');
        setTimeout(() => document.querySelector('.brand-btn').focus(), 300);
    } else { 
        alert("Acceso denegado"); 
    }
}

function cerrarSesion() {
    // Regresa al login y limpia campos
    document.getElementById('sc-main').classList.add('hidden');
    document.getElementById('sc-login').classList.remove('hidden');
    document.getElementById('drop-menu').classList.add('hidden');
    document.getElementById('log-u').value = "";
    document.getElementById('log-p').value = "";
    setTimeout(() => document.getElementById('log-u').focus(), 100);
}

function toggleMenu() { 
    document.getElementById('drop-menu').classList.toggle('hidden'); 
}

// ==========================================
// NAVEGACIÓN ENTRE PANTALLAS
// ==========================================
function volverAlCatalogo() {
    document.getElementById('sc-pre-video').classList.add('hidden');
    document.getElementById('sc-main').classList.remove('hidden');
}

function cerrarReproductorAFicha() {
    const v = document.getElementById('v-core');
    if(v) { v.pause(); v.src = ""; }
    if(hlsInstance) hlsInstance.destroy();
    
    document.getElementById('video-player-final').classList.add('hidden');
    document.getElementById('sc-pre-video').classList.remove('hidden');
    // Foco automático al botón VER para el control remoto
    setTimeout(() => document.getElementById('btn-main-play').focus(), 150);
}

// ==========================================
// CARGA DE DATOS (FIREBASE)
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

// ==========================================
// FILTROS Y RENDERIZADO
// ==========================================
function seleccionarMarca(b) { 
    currentBrand = b; 
    actualizarVista(); 
}

function cambiarTipo(t) { 
    currentType = t; 
    document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
    const btnId = (t === 'pelicula') ? 't-peli' : 't-serie';
    document.getElementById(btnId).classList.add('active');
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

// ==========================================
// PREVISUALIZACIÓN Y REPRODUCTOR
// ==========================================
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

function lanzarReproductor() {
    document.getElementById('sc-pre-video').classList.add('hidden');
    document.getElementById('video-player-final').classList.remove('hidden');
    
    const container = document.getElementById('video-canvas');
    container.innerHTML = `<video id="v-core" style="width:100%; height:100%;" autoplay></video>`;
    const video = document.getElementById('v-core');

    // Soporte para MP4 y M3U8
    if (videoActualUrl.includes('.m3u8') && Hls.isSupported()) {
        hlsInstance = new Hls(); 
        hlsInstance.loadSource(videoActualUrl); 
        hlsInstance.attachMedia(video);
    } else { 
        video.src = videoActualUrl; 
    }

    document.getElementById('video-title-ui').innerText = document.getElementById('pre-title').innerText;
    
    // Barra de progreso automática
    video.ontimeupdate = () => { 
        const bar = document.getElementById('progress-bar-new');
        if(bar) bar.style.width = (video.currentTime / video.duration) * 100 + "%"; 
    };

    // Foco automático al botón CERRAR único del reproductor
    setTimeout(() => document.querySelector('.btn-close-player').focus(), 300);
}

// ARRANQUE INICIAL
window.onload = () => {
    const loginInput = document.getElementById('log-u');
    if(loginInput) loginInput.focus();
};
