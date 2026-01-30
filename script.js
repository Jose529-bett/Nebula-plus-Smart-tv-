const firebaseConfig = { databaseURL: "https://nebula-plus-app-default-rtdb.firebaseio.com/" };
firebase.initializeApp(firebaseConfig);
const db = firebase.database();

let catalogFull = [];
let currentBrand = 'disney';
let currentType = 'pelicula';
let hlsInstance = null;

const vIntro = document.getElementById('intro-video');
const lIntro = document.getElementById('intro-layer');

// 1. MANEJO DE INTRO Y AUDIO INTELIGENTE
window.addEventListener('load', () => {
    vIntro.muted = true; 
    vIntro.play().catch(() => finalizarIntro());
});

document.addEventListener('keydown', () => {
    if (!lIntro.classList.contains('hidden')) {
        vIntro.muted = false; // El audio se activa al tocar el mando
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

// 2. CONEXIÓN CON TU PANEL DE CONTROL
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

// 3. MOTOR DE FILTRADO (MARCA + CATEGORÍA + BUSCADOR)
function actualizarVista() {
    const grid = document.getElementById('grid');
    const busqueda = document.getElementById('search-input').value.toLowerCase();
    document.getElementById('current-label').innerText = `${currentBrand} > ${currentType}`;

    const filtrados = catalogFull.filter(item => {
        const b = (item.brand || item.marca || "").toLowerCase();
        const t = (item.type || item.tipo || "").toLowerCase();
        const nom = (item.title || item.titulo || item.nombre || "").toLowerCase();
        
        // Verifica que coincida la MARCA seleccionada, el TIPO y la BÚSQUEDA
        return b === currentBrand.toLowerCase() && 
               t === currentType.toLowerCase() && 
               nom.includes(busqueda);
    });

    grid.innerHTML = filtrados.length === 0 ? `<p style="padding:40px; opacity:0.5;">No hay contenido en esta sección.</p>` :
        filtrados.map(m => `<div class="poster" tabindex="20" style="background-image:url('${m.poster || m.imagen}')" onclick="reproducir('${m.video || m.url}', '${m.title || m.titulo}')"></div>`).join('');
}

// 4. FUNCIONES DE INTERFAZ
function seleccionarMarca(marca) { 
    currentBrand = marca; 
    actualizarVista(); 
}

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

function cerrarSesion() {
    document.getElementById('sc-main').classList.add('hidden');
    document.getElementById('sc-login').classList.remove('hidden');
    document.getElementById('log-u').focus();
}

// 5. REPRODUCTOR DE VIDEO (HLS Y MP4)
function reproducir(url, titulo) {
    const player = document.getElementById('video-player');
    const container = document.getElementById('v-container');
    document.getElementById('player-title').innerText = titulo;
    player.classList.remove('hidden');
    
    if(hlsInstance) hlsInstance.destroy();
    container.innerHTML = `<video id="v-main" controls autoplay style="width:100%; height:100%;"></video>`;
    const v = document.getElementById('v-main');
    
    if (url.includes('.m3u8') && Hls.isSupported()) {
        hlsInstance = new Hls(); hlsInstance.loadSource(url); hlsInstance.attachMedia(v);
    } else { v.src = url; }
    document.getElementById('btn-close').focus();
}

function cerrarReproductor() { 
    if(hlsInstance) hlsInstance.destroy(); 
    document.getElementById('video-player').classList.add('hidden'); 
    document.getElementById('v-container').innerHTML = '';
}

// 6. CONTROL POR FLECHAS DEL MANDO
document.addEventListener('keydown', (e) => {
    if (!lIntro.classList.contains('hidden')) { finalizarIntro(); return; }
    const el = Array.from(document.querySelectorAll('button, input, .poster')).filter(x => x.offsetParent !== null);
    let i = el.indexOf(document.activeElement);
    if (e.keyCode === 37) i = Math.max(0, i - 1); // Izquierda
    else if (e.keyCode === 39) i = Math.min(el.length - 1, i + 1); // Derecha
    else if (e.keyCode === 38) i = Math.max(0, i - 4); // Arriba
    else if (e.keyCode === 40) i = Math.min(el.length - 1, i + 4); // Abajo
    else if (e.keyCode === 13 && document.activeElement.tagName !== 'INPUT') document.activeElement.click(); // OK
    if (el[i]) el[i].focus();
});
