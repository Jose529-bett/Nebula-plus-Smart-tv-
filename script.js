const firebaseConfig = { databaseURL: "https://nebula-plus-app-default-rtdb.firebaseio.com/" };
if (!firebase.apps.length) firebase.initializeApp(firebaseConfig);
const db = firebase.database();

let users = []; let movies = []; let currentBrand = 'disney'; let currentType = 'pelicula';
let datosSerieActual = []; let hlsInstance = null;

// --- MOTOR DE NAVEGACIÓN D-PAD (CONTROL REMOTO) ---
document.addEventListener('keydown', (e) => {
    const focusables = document.querySelectorAll('.focusable, .poster');
    let index = Array.from(focusables).indexOf(document.activeElement);

    switch(e.keyCode) {
        case 37: // Izquierda
            if (index > 0) focusables[index - 1].focus();
            break;
        case 39: // Derecha
            if (index < focusables.length - 1) focusables[index + 1].focus();
            break;
        case 38: // Arriba
            moveVertical(-6);
            break;
        case 40: // Abajo
            moveVertical(6);
            break;
        case 13: // OK / Enter
            if(document.activeElement.click) document.activeElement.click();
            break;
        case 8: // Back / Volver
        case 10009:
            if(!document.getElementById('video-player').classList.contains('hidden')) cerrarReproductor();
            break;
    }
});

function moveVertical(offset) {
    const focusables = Array.from(document.querySelectorAll('.focusable, .poster'));
    let index = focusables.indexOf(document.activeElement);
    let nextIndex = index + offset;
    if (nextIndex >= 0 && nextIndex < focusables.length) focusables[nextIndex].focus();
}

// --- FIREBASE ---
db.ref('users').on('value', snap => { users = Object.values(snap.val() || {}); });
db.ref('movies').on('value', snap => {
    const data = snap.val();
    movies = [];
    for(let id in data) movies.push({ ...data[id], firebaseId: id });
    actualizarVista();
});

// --- SESIÓN Y SALUDO ---
function entrar() {
    const u = document.getElementById('log-u').value;
    const p = document.getElementById('log-p').value;
    const user = users.find(x => x.u === u && x.p === p);
    if(user) {
        document.getElementById('u-name-greeting').innerHTML = `<h2>¡Hola, ${u}!</h2>`;
        switchScreen('sc-main');
        setTimeout(() => document.getElementById('search-box').focus(), 500);
    } else { alert("Usuario o PIN incorrecto"); }
}

function cerrarSesion() { 
    document.getElementById('drop-menu').classList.add('hidden');
    switchScreen('sc-login'); 
}

function switchScreen(id) {
    document.querySelectorAll('.screen').forEach(s => s.classList.add('hidden'));
    document.getElementById(id).classList.remove('hidden');
}

function toggleMenu() { document.getElementById('drop-menu').classList.toggle('hidden'); }

// --- VISTAS ---
function seleccionarMarca(b) { currentBrand = b; actualizarVista(); }
function cambiarTipo(t) { 
    currentType = t; 
    document.getElementById('t-peli').classList.toggle('active', t === 'pelicula');
    document.getElementById('t-serie').classList.toggle('active', t === 'serie');
    actualizarVista(); 
}

function actualizarVista() {
    const grid = document.getElementById('grid');
    if(!grid) return;
    const filtrados = movies.filter(m => m.brand === currentBrand && m.type === currentType);
    grid.innerHTML = filtrados.map(m => `
        <div class="poster focusable" tabindex="0" 
             style="background-image:url('${m.poster}')" 
             onclick="reproducir('${m.video}', '${m.title}')">
        </div>`).join('');
}

// --- REPRODUCTOR ---
function reproducir(cadena, titulo) {
    const player = document.getElementById('video-player');
    document.getElementById('player-title').innerText = titulo;
    player.classList.remove('hidden');

    const item = movies.find(m => m.title === titulo);
    if(item && item.type === 'serie') {
        document.getElementById('serie-controls').classList.remove('hidden');
        const temporadas = item.video.split('|');
        datosSerieActual = temporadas.map(t => t.split(','));
        document.getElementById('season-selector').innerHTML = datosSerieActual.map((_, i) => `<option value="${i}">Temporada ${i+1}</option>`).join('');
        cargarTemporada(0);
    } else {
        document.getElementById('serie-controls').classList.add('hidden');
        gestionarFuente(cadena);
    }
}

function gestionarFuente(url) {
    const container = document.querySelector('.video-frame');
    if(hlsInstance) hlsInstance.destroy();
    
    // Controles nativos habilitados para Play/Pausa con el mando
    container.innerHTML = `<video id="tv-video" controls autoplay style="width:100%; height:100%;"></video>`;
    const video = document.getElementById('tv-video');
    const urlLimpia = url.trim();

    if(urlLimpia.includes('.m3u8')) {
        if(Hls.isSupported()){
            hlsInstance = new Hls();
            hlsInstance.loadSource(urlLimpia);
            hlsInstance.attachMedia(video);
        }
    } else {
        video.src = urlLimpia;
    }
    video.focus();
}

function cargarTemporada(idx) {
    const grid = document.getElementById('episodes-grid');
    grid.innerHTML = datosSerieActual[idx].map((link, i) => `
        <button class="btn-ep focusable" onclick="gestionarFuente('${link.trim()}')">CAP. ${i+1}</button>
    `).join('');
}

function cerrarReproductor() {
    const video = document.getElementById('tv-video');
    if(video) video.pause();
    document.getElementById('video-player').classList.add('hidden');
}

function buscar() {
    const q = document.getElementById('search-box').value.toLowerCase();
    const filtrados = movies.filter(m => m.title.toLowerCase().includes(q));
    document.getElementById('grid').innerHTML = filtrados.map(m => `
        <div class="poster focusable" tabindex="0" style="background-image:url('${m.poster}')" onclick="reproducir('${m.video}', '${m.title}')"></div>
    `).join('');
}
