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
// CONTROL REMOTO - NAVEGACIÓN Y PLAYER
// ==========================================
document.addEventListener('keydown', (e) => {
    const activeScreen = document.querySelector('.screen:not(.hidden), .player-overlay:not(.hidden)');
    if (!activeScreen) return;

    const elActivo = document.activeElement;
    const esPlayerVisible = !document.getElementById('video-player-final').classList.contains('hidden');

    // --- LÓGICA SI EL REPRODUCTOR ESTÁ ABIERTO ---
    if (esPlayerVisible) {
        if (e.key === 'ArrowUp') {
            e.preventDefault();
            const btnCerrar = document.querySelector('.btn-close-player');
            if (btnCerrar) btnCerrar.focus(); 
        }
        if (e.key === 'ArrowDown') {
            e.preventDefault();
            const video = document.getElementById('v-core');
            if (video) video.focus();
        }
        if (e.key === 'Enter') {
            e.preventDefault();
            // Si el foco está en el video (o nada específico), pausar
            if (elActivo.id === 'v-core' || elActivo.tagName === 'BODY') {
                const v = document.getElementById('v-core');
                if (v.paused) v.play(); else v.pause();
            } else if (elActivo.classList.contains('btn-close-player')) {
                // Si el foco está en el botón, cerrar
                cerrarReproductorAFicha();
            }
        }
        return; 
    }

    // --- NAVEGACIÓN NORMAL (CATÁLOGO) ---
    const focusables = Array.from(activeScreen.querySelectorAll('.tv-focusable:not(.hidden)'));
    let index = focusables.indexOf(elActivo);
    const cols = 8; 

    if (e.key === 'ArrowRight') {
        e.preventDefault();
        if (elActivo.id === 'search-box') {
            const avatar = document.querySelector('.avatar');
            if (avatar) avatar.focus();
        } else if (index < focusables.length - 1) {
            focusables[index + 1].focus();
        }
    }
    if (e.key === 'ArrowLeft') {
        e.preventDefault();
        if (index > 0) focusables[index - 1].focus();
    }
    if (e.key === 'ArrowDown') {
        e.preventDefault();
        if (elActivo.classList.contains('poster')) {
            if (index + cols < focusables.length) focusables[index + cols].focus();
        } else {
            const primerPoster = document.querySelector('.poster');
            if (primerPoster) primerPoster.focus();
        }
    }
    if (e.key === 'ArrowUp') {
        e.preventDefault();
        if (elActivo.classList.contains('poster')) {
            const posters = Array.from(document.querySelectorAll('.poster'));
            const filaActual = posters.indexOf(elActivo);
            if (filaActual < cols) {
                document.getElementById('search-box').focus();
            } else {
                focusables[index - cols].focus();
            }
        } else if (index > 0) {
            focusables[index - 1].focus();
        }
    }
    if (e.key === 'Enter') {
        e.preventDefault();
        if (elActivo) elActivo.click();
    }
});

// ==========================================
// REPRODUCTOR (CORREGIDO)
// ==========================================
function lanzarReproductor() {
    document.getElementById('sc-pre-video').classList.add('hidden');
    document.getElementById('video-player-final').classList.remove('hidden');
    
    const container = document.getElementById('video-canvas');
    // Forzamos el video a ser el primer elemento focusable con tabindex="0"
    container.innerHTML = `<video id="v-core" class="tv-focusable" tabindex="0" style="width:100%; height:100%; outline:none;" autoplay></video>`;
    
    const video = document.getElementById('v-core');
    const btnCerrar = document.querySelector('.btn-close-player');

    // Nos aseguramos de que el botón de cerrar también pueda recibir foco
    if (btnCerrar) {
        btnCerrar.classList.add('tv-focusable');
        btnCerrar.setAttribute('tabindex', '0');
    }

    if (videoActualUrl.includes('.m3u8') && Hls.isSupported()) {
        hlsInstance = new Hls(); 
        hlsInstance.loadSource(videoActualUrl); 
        hlsInstance.attachMedia(video);
    } else { 
        video.src = videoActualUrl; 
    }

    document.getElementById('video-title-ui').innerText = document.getElementById('pre-title').innerText;
    
    video.ontimeupdate = () => { 
        const bar = document.getElementById('progress-bar-new');
        if(bar) bar.style.width = (video.currentTime / video.duration) * 100 + "%"; 
    };

    // Foco automático al video para que el primer OK pause
    setTimeout(() => video.focus(), 500);
}

function cerrarReproductorAFicha() {
    const v = document.getElementById('v-core');
    if(v) { v.pause(); v.src = ""; }
    if(hlsInstance) hlsInstance.destroy();
    document.getElementById('video-player-final').classList.add('hidden');
    document.getElementById('sc-pre-video').classList.remove('hidden');
    setTimeout(() => document.getElementById('btn-main-play').focus(), 150);
}

// === FUNCIONES RESTANTES (FIREBASE Y CATÁLOGO) ===
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
function buscar() {
    const q = document.getElementById('search-box').value.toLowerCase();
    if (q.trim() === "") { actualizarVista(); return; }
    const filtrados = movies.filter(m => m.title.toLowerCase().includes(q));
    document.getElementById('cat-title').innerText = "Resultados: " + q;
    renderGrid(filtrados);
}
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
