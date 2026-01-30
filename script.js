const firebaseConfig = { databaseURL: "https://nebula-plus-app-default-rtdb.firebaseio.com/" };
firebase.initializeApp(firebaseConfig);
const db = firebase.database();

let movies = [];
let currentBrand = 'disney';
let currentType = 'pelicula';
let hlsInstance = null;

// --- CONTROL DE INTRO ---
const videoIntro = document.getElementById('intro-video');
const capaIntro = document.getElementById('intro-layer');

videoIntro.onended = () => { cerrarIntro(); };

function cerrarIntro() {
    capaIntro.style.opacity = '0';
    setTimeout(() => {
        capaIntro.classList.add('hidden');
        document.getElementById('sc-login').classList.remove('hidden');
        document.getElementById('log-u').focus();
    }, 1000);
}

// --- LOGICA DE DATOS ---
db.ref('movies').on('value', snap => {
    const data = snap.val();
    movies = [];
    if(data) { for(let id in data) { movies.push({ ...data[id], firebaseId: id }); } }
    actualizarVista();
});

function entrar() {
    document.getElementById('sc-login').classList.add('hidden');
    document.getElementById('sc-main').classList.remove('hidden');
    setTimeout(() => document.querySelector('.brand-bar button').focus(), 500);
}

function actualizarVista() {
    const grid = document.getElementById('grid');
    if(!grid) return;
    const filtrados = movies.filter(m => m.brand === currentBrand && m.type === currentType);
    grid.innerHTML = filtrados.map(m => `
        <div class="poster" tabindex="10" style="background-image:url('${m.poster}')" onclick="reproducir('${m.video}', '${m.title}')"></div>
    `).join('');
}

function seleccionarMarca(marca) { currentBrand = marca; actualizarVista(); }
function cambiarTipo(tipo) { currentType = tipo; actualizarVista(); }

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

// --- CONTROL REMOTO ---
document.addEventListener('keydown', (e) => {
    if (!capaIntro.classList.contains('hidden')) { cerrarIntro(); return; }
    const elementos = Array.from(document.querySelectorAll('button, input, .poster')).filter(el => el.offsetParent !== null);
    let idx = elementos.indexOf(document.activeElement);
    if (e.keyCode === 37) idx = Math.max(0, idx - 1);
    else if (e.keyCode === 39) idx = Math.min(elementos.length - 1, idx + 1);
    else if (e.keyCode === 38) idx = Math.max(0, idx - 4);
    else if (e.keyCode === 40) idx = Math.min(elementos.length - 1, idx + 4);
    else if (e.keyCode === 13) document.activeElement.click();
    if (elementos[idx]) elementos[idx].focus();
});
