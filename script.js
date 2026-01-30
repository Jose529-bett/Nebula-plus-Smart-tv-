        const firebaseConfig = { databaseURL: "https://nebula-plus-app-default-rtdb.firebaseio.com/" };
firebase.initializeApp(firebaseConfig);
const db = firebase.database();

let catalogFull = [];
let currentBrand = 'disney';
let currentType = 'pelicula';
let hlsInstance = null;
let datosSerieActual = [];

// 1. INTRO
const vIntro = document.getElementById('intro-video');
const lIntro = document.getElementById('intro-layer');

window.addEventListener('load', () => {
    vIntro.muted = true; 
    vIntro.play().catch(() => finalizarIntro());
});

document.addEventListener('keydown', () => {
    if (!lIntro.classList.contains('hidden')) {
        vIntro.muted = false; 
        vIntro.play();
    }
}, { once: true });

vIntro.onended = () => finalizarIntro();

function finalizarIntro() {
    lIntro.style.opacity = '0';
    setTimeout(() => {
        lIntro.classList.add('hidden');
        document.getElementById('sc-login').classList.remove('hidden');
        document.getElementById('log-u').focus();
    }, 500);
}

// 2. FIREBASE
db.ref('movies').on('value', snap => {
    const data = snap.val();
    catalogFull = [];
    if (data) {
        for (let id in data) {
            catalogFull.push({ ...data[id], fbId: id });
        }
    }
    actualizarVista();
});

// 3. VISTA
function actualizarVista() {
    const grid = document.getElementById('grid');
    const busqueda = document.getElementById('search-input').value.toLowerCase();
    document.getElementById('current-label').innerText = `${currentBrand.toUpperCase()} > ${currentType.toUpperCase()}`;

    const filtrados = catalogFull.filter(item => {
        const b = (item.brand || "").toLowerCase();
        const t = (item.type || "").toLowerCase();
        const nom = (item.title || "").toLowerCase();
        return b === currentBrand.toLowerCase() && t === currentType.toLowerCase() && nom.includes(busqueda);
    });

    grid.innerHTML = filtrados.length === 0 ? `<p style="padding:40px; opacity:0.5;">No hay contenido.</p>` :
        filtrados.map(m => `<div class="poster" tabindex="20" style="background-image:url('${m.poster}')" onclick="reproducir('${m.video}', '${m.title}', '${m.type}')"></div>`).join('');
}

// 4. FUNCIONES NAVBAR
function seleccionarMarca(marca) { currentBrand = marca; actualizarVista(); }
function cambiarTipo(tipo) { 
    currentType = tipo; 
    document.getElementById('t-peli').classList.toggle('active', tipo === 'pelicula');
    document.getElementById('t-serie').classList.toggle('active', tipo === 'serie');
    actualizarVista(); 
}
function entrar() {
    document.getElementById('sc-login').classList.add('hidden');
    document.getElementById('sc-main').classList.remove('hidden');
    setTimeout(() => document.getElementById('search-input').focus(), 500);
}
function cerrarSesion() { location.reload(); }

// 5. REPRODUCTOR INTEGRADO
function reproducir(cadenaVideo, titulo, tipo) {
    const player = document.getElementById('video-player');
    const serieControls = document.getElementById('serie-controls');
    document.getElementById('player-title').innerText = titulo;
    player.classList.remove('hidden');
    
    if(tipo === 'serie') {
        serieControls.classList.remove('hidden');
        const temporadas = cadenaVideo.split('|');
        datosSerieActual = temporadas.map(t => t.split(','));
        const selector = document.getElementById('season-selector');
        selector.innerHTML = datosSerieActual.map((_, i) => `<option value="${i}">Temporada ${i+1}</option>`).join('');
        cargarTemporadaTV(0); 
    } else {
        serieControls.classList.add('hidden');
        gestionarFuenteVideoTV(cadenaVideo);
    }
    document.getElementById('btn-close').focus();
}

function cargarTemporadaTV(idx) {
    const listado = document.getElementById('chapters-list');
    const capitulos = datosSerieActual[idx];
    listado.innerHTML = capitulos.map((link, i) => `
        <button class="btn-cap-square" tabindex="40" onclick="gestionarFuenteVideoTV('${link.trim()}')">
            EP. ${i+1}
        </button>
    `).join('');
    gestionarFuenteVideoTV(capitulos[0].trim());
}

function gestionarFuenteVideoTV(url) {
    const container = document.getElementById('v-container');
    if(hlsInstance) hlsInstance.destroy();
    container.innerHTML = `<video id="v-main" autoplay style="width:100%; height:100%;"></video>`;
    const v = document.getElementById('v-main');
    
    if (url.includes('.m3u8') && Hls.isSupported()) {
        hlsInstance = new Hls(); hlsInstance.loadSource(url); hlsInstance.attachMedia(v);
    } else { v.src = url; }
}

function cerrarReproductor() { 
    if(hlsInstance) hlsInstance.destroy(); 
    document.getElementById('video-player').classList.add('hidden'); 
    document.getElementById('v-container').innerHTML = '';
}

// 6. CONTROL REMOTO + PAUSA/PLAY
document.addEventListener('keydown', (e) => {
    if (!lIntro.classList.contains('hidden')) { finalizarIntro(); return; }
    
    const el = Array.from(document.querySelectorAll('button, input, select, .poster, .btn-cap-square')).filter(x => x.offsetParent !== null);
    let i = el.indexOf(document.activeElement);

    if (e.keyCode === 37) i = Math.max(0, i - 1); 
    else if (e.keyCode === 39) i = Math.min(el.length - 1, i + 1); 
    else if (e.keyCode === 38) { // ARRIBA
        if (document.activeElement.classList.contains('btn-cap-square')) i = Math.max(0, i - 3);
        else i = Math.max(0, i - 1);
    } 
    else if (e.keyCode === 40) { // ABAJO
        if (document.activeElement.classList.contains('btn-cap-square')) i = Math.min(el.length - 1, i + 3);
        else i = Math.min(el.length - 1, i + 1);
    }
    else if (e.keyCode === 13) { // ENTER / OK
        const v = document.getElementById('v-main');
        // Si el foco no está en un botón, pausar/reproducir
        if (v && document.activeElement.tagName !== 'BUTTON' && document.activeElement.tagName !== 'SELECT') {
            if (v.paused) v.play(); else v.pause();
            return;
        }
        if (document.activeElement.tagName !== 'SELECT') document.activeElement.click();
    }
    
    if (el[i]) {
        el[i].focus();
        el[i].scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
});
