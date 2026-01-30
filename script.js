const firebaseConfig = { databaseURL: "https://nebula-plus-app-default-rtdb.firebaseio.com/" };
firebase.initializeApp(firebaseConfig);
const db = firebase.database();

let catalogFull = [];
let currentBrand = 'disney';
let currentType = 'pelicula';
let hlsInstance = null;

// LÓGICA DE INTRO
const vIntro = document.getElementById('intro-video');
const lIntro = document.getElementById('intro-layer');
vIntro.onended = () => { finalizarIntro(); };

function finalizarIntro() {
    lIntro.style.opacity = '0';
    setTimeout(() => {
        lIntro.classList.add('hidden');
        document.getElementById('sc-login').classList.remove('hidden');
        document.getElementById('log-u').focus();
    }, 1000);
}

// SINCRONIZACIÓN CON ANDROID (FIREBASE)
db.ref('/').on('value', snap => {
    const data = snap.val();
    catalogFull = [];
    if (data) {
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
    if(!grid) return;

    const filtrados = catalogFull.filter(item => {
        const b = item.brand || item.marca || "";
        const t = item.type || item.tipo || "";
        return b.toLowerCase() === currentBrand.toLowerCase() && 
               t.toLowerCase() === currentType.toLowerCase();
    });

    if (filtrados.length === 0) {
        grid.innerHTML = `<p style="padding:40px;">No hay contenido en esta sección.</p>`;
    } else {
        grid.innerHTML = filtrados.map(m => {
            const img = m.poster || m.imagen || m.posterUrl;
            const url = m.video || m.url || m.videoUrl;
            const nom = m.title || m.titulo || m.nombre;
            return `<div class="poster" tabindex="10" style="background-image:url('${img}')" onclick="reproducir('${url}', '${nom}')"></div>`;
        }).join('');
    }
}

// FUNCIONES DE SESIÓN
function entrar() {
    document.getElementById('sc-login').classList.add('hidden');
    document.getElementById('sc-main').classList.remove('hidden');
    setTimeout(() => document.querySelector('.brand-bar button').focus(), 500);
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
    const container = document.querySelector('.video-frame');
    document.getElementById('player-title').innerText = titulo;
    player.classList.remove('hidden');
    if(hlsInstance) hlsInstance.destroy();
    container.innerHTML = `<video id="v-main" controls autoplay style="width:100%; height:100%;"></video>`;
    const video = document.getElementById('v-main');
    if (url.includes('.m3u8') && Hls.isSupported()) {
        hlsInstance = new Hls(); hlsInstance.loadSource(url); hlsInstance.attachMedia(video);
    } else { video.src = url; }
    document.getElementById('btn-close').focus();
}

function cerrarReproductor() {
    if(hlsInstance) hlsInstance.destroy();
    document.getElementById('video-player').classList.add('hidden');
    document.querySelector('.video-frame').innerHTML = '';
}

// CONTROL REMOTO
document.addEventListener('keydown', (e) => {
    if (!lIntro.classList.contains('hidden')) { finalizarIntro(); return; }
    const el = Array.from(document.querySelectorAll('button, input, .poster')).filter(x => x.offsetParent !== null);
    let i = el.indexOf(document.activeElement);
    if (e.keyCode === 37) i = Math.max(0, i - 1);
    else if (e.keyCode === 39) i = Math.min(el.length - 1, i + 1);
    else if (e.keyCode === 38) i = Math.max(0, i - 4);
    else if (e.keyCode === 40) i = Math.min(el.length - 1, i + 4);
    else if (e.keyCode === 13) document.activeElement.click();
    if (el[i]) el[i].focus();
});
