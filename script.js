const firebaseConfig = { databaseURL: "https://nebula-plus-app-default-rtdb.firebaseio.com/" };
firebase.initializeApp(firebaseConfig);
const db = firebase.database();

let catalogFull = [];
let currentBrand = 'disney';
let currentType = 'pelicula';
let hlsInstance = null;

// GESTIÓN DE INTRO
const vIntro = document.getElementById('intro-video');
const lIntro = document.getElementById('intro-layer');

vIntro.onended = () => { terminarIntro(); };

function terminarIntro() {
    lIntro.style.opacity = '0';
    setTimeout(() => {
        lIntro.classList.add('hidden');
        document.getElementById('sc-login').classList.remove('hidden');
        document.getElementById('log-u').focus();
    }, 1000);
}

// SINCRONIZACIÓN CON CONTENIDO DE ANDROID
db.ref('/').on('value', snap => {
    const data = snap.val();
    catalogFull = [];
    if (data) {
        // Busca en nodo "movies" o raíz
        const root = data.movies ? data.movies : data;
        for (let id in root) {
            if (typeof root[id] === 'object') {
                catalogFull.push({ ...root[id], fbId: id });
            }
        }
    }
    actualizarVista();
});

function actualizarVista() {
    const grid = document.getElementById('grid');
    const busqueda = document.getElementById('search-input').value.toLowerCase();
    if(!grid) return;

    const filtrados = catalogFull.filter(item => {
        const b = item.brand || item.marca || "";
        const t = item.type || item.tipo || "";
        const nom = (item.title || item.titulo || item.nombre || "").toLowerCase();
        
        return b.toLowerCase() === currentBrand.toLowerCase() && 
               t.toLowerCase() === currentType.toLowerCase() &&
               nom.includes(busqueda);
    });

    if (filtrados.length === 0) {
        grid.innerHTML = `<p style="padding:50px; opacity:0.6;">No se encontró contenido.</p>`;
    } else {
        grid.innerHTML = filtrados.map(m => {
            const img = m.poster || m.imagen || m.posterUrl;
            const url = m.video || m.url || m.videoUrl;
            const nom = m.title || m.titulo || m.nombre;
            return `<div class="poster" tabindex="20" style="background-image:url('${img}')" onclick="reproducir('${url}', '${nom}')"></div>`;
        }).join('');
    }
}

// SESIONES Y NAVEGACIÓN
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

function seleccionarMarca(marca) { 
    currentBrand = marca; 
    document.getElementById('search-input').value = ""; 
    actualizarVista(); 
}

function cambiarTipo(tipo) { 
    currentType = tipo; 
    document.getElementById('t-peli').classList.toggle('active', tipo === 'pelicula');
    document.getElementById('t-serie').classList.toggle('active', tipo === 'serie');
    actualizarVista(); 
}

// REPRODUCTOR
function reproducir(url, titulo) {
    const player = document.getElementById('video-player');
    const container = document.getElementById('v-container');
    document.getElementById('player-title').innerText = titulo;
    player.classList.remove('hidden');
    
    if(hlsInstance) hlsInstance.destroy();
    container.innerHTML = `<video id="v-main" controls autoplay></video>`;
    const video = document.getElementById('v-main');
    
    if (url.includes('.m3u8') && Hls.isSupported()) {
        hlsInstance = new Hls(); hlsInstance.loadSource(url); hlsInstance.attachMedia(video);
    } else { video.src = url; }
    document.getElementById('btn-close').focus();
}

function cerrarReproductor() {
    if(hlsInstance) hlsInstance.destroy();
    document.getElementById('video-player').classList.add('hidden');
    document.getElementById('v-container').innerHTML = '';
}

// CONTROL REMOTO
document.addEventListener('keydown', (e) => {
    if (!lIntro.classList.contains('hidden')) { terminarIntro(); return; }
    
    const elementos = Array.from(document.querySelectorAll('button, input, .poster')).filter(x => x.offsetParent !== null);
    let idx = elementos.indexOf(document.activeElement);
    
    if (e.keyCode === 37) idx = Math.max(0, idx - 1);
    else if (e.keyCode === 39) idx = Math.min(elementos.length - 1, idx + 1);
    else if (e.keyCode === 38) idx = Math.max(0, idx - 4);
    else if (e.keyCode === 40) idx = Math.min(elementos.length - 1, idx + 4);
    else if (e.keyCode === 13 && document.activeElement.tagName !== 'INPUT') document.activeElement.click();

    if (elementos[idx]) elementos[idx].focus();
});
