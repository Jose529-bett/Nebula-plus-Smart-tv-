const firebaseConfig = { databaseURL: "https://nebula-plus-app-default-rtdb.firebaseio.com/" };
firebase.initializeApp(firebaseConfig);
const db = firebase.database();

let catalogFull = [];
let currentBrand = 'disney';
let currentType = 'pelicula';
let hlsInstance = null;

const vIntro = document.getElementById('intro-video');
const lIntro = document.getElementById('intro-layer');

// SOLUCIÓN AL AUDIO: Se activa al presionar cualquier tecla del mando
document.addEventListener('keydown', () => {
    if (!lIntro.classList.contains('hidden')) {
        vIntro.muted = false; 
        vIntro.volume = 1.0;
        vIntro.play();
        document.getElementById('audio-msg').style.display = 'none';
    }
}, { once: true });

vIntro.onended = () => { finalizarIntro(); };

function finalizarIntro() {
    lIntro.style.opacity = '0';
    setTimeout(() => {
        lIntro.classList.add('hidden');
        document.getElementById('sc-login').classList.remove('hidden');
        document.getElementById('log-u').focus();
    }, 1000);
}

// SINCRONIZACIÓN CON EL PANEL DE CONTROL (ANDROID)
db.ref('/').on('value', snap => {
    const data = snap.val();
    catalogFull = [];
    if (data) {
        const root = data.movies ? data.movies : data;
        for (let id in root) {
            if (typeof root[id] === 'object') catalogFull.push({ ...root[id], fbId: id });
        }
    }
    actualizarVista();
});

function actualizarVista() {
    const grid = document.getElementById('grid');
    const busqueda = document.getElementById('search-input').value.toLowerCase();
    document.getElementById('current-label').innerText = `${currentBrand} > ${currentType}`;

    const filtrados = catalogFull.filter(item => {
        const b = (item.brand || item.marca || "").toLowerCase();
        const t = (item.type || item.tipo || "").toLowerCase();
        const nom = (item.title || item.titulo || item.nombre || "").toLowerCase();
        return b === currentBrand.toLowerCase() && t === currentType.toLowerCase() && nom.includes(busqueda);
    });

    grid.innerHTML = filtrados.length === 0 ? `<p style="padding:40px; opacity:0.5;">No hay contenido disponible en esta sesión.</p>` :
        filtrados.map(m => `<div class="poster" tabindex="20" style="background-image:url('${m.poster || m.imagen}')" onclick="reproducir('${m.video || m.url}', '${m.title || m.titulo}')"></div>`).join('');
}

function entrar() {
    document.getElementById('sc-login').classList.add('hidden');
    document.getElementById('sc-main').classList.remove('hidden');
    setTimeout(() => document.getElementById('search-input').focus(), 500);
}

function cerrarSesion() {
    document.getElementById('sc-main').classList.add('hidden');
    document.getElementById('sc-login').classList.remove('hidden');
    document.getElementById('log-u').focus();
}

function seleccionarMarca(marca) { currentBrand = marca; actualizarVista(); }
function cambiarTipo(tipo) { 
    currentType = tipo; 
    document.getElementById('t-peli').classList.toggle('active', tipo === 'pelicula');
    document.getElementById('t-serie').classList.toggle('active', tipo === 'serie');
    actualizarVista(); 
}

function reproducir(url, titulo) {
    const player = document.getElementById('video-player');
    const container = document.getElementById('v-container');
    document.getElementById('player-title').innerText = titulo;
    player.classList.remove('hidden');
    if(hlsInstance) hlsInstance.destroy();
    container.innerHTML = `<video id="v-main" controls autoplay></video>`;
    const v = document.getElementById('v-main');
    if (url.includes('.m3u8') && Hls.isSupported()) {
        hlsInstance = new Hls(); hlsInstance.loadSource(url); hlsInstance.attachMedia(v);
    } else { v.src = url; }
    document.getElementById('btn-close').focus();
}

function cerrarReproductor() { if(hlsInstance) hlsInstance.destroy(); document.getElementById('video-player').classList.add('hidden'); }

// NAVEGACIÓN CON CONTROL REMOTO
document.addEventListener('keydown', (e) => {
    if (!lIntro.classList.contains('hidden')) { 
        if(e.keyCode === 13) finalizarIntro(); 
        return; 
    }
    const el = Array.from(document.querySelectorAll('button, input, .poster')).filter(x => x.offsetParent !== null);
    let i = el.indexOf(document.activeElement);
    if (e.keyCode === 37) i = Math.max(0, i - 1);
    else if (e.keyCode === 39) i = Math.min(el.length - 1, i + 1);
    else if (e.keyCode === 38) i = Math.max(0, i - 4);
    else if (e.keyCode === 40) i = Math.min(el.length - 1, i + 4);
    else if (e.keyCode === 13 && document.activeElement.tagName !== 'INPUT') document.activeElement.click();
    if (el[i]) el[i].focus();
});
