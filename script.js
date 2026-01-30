const firebaseConfig = { databaseURL: "https://nebula-plus-app-default-rtdb.firebaseio.com/" };
firebase.initializeApp(firebaseConfig);
const db = firebase.database();

let movies = [];
let currentBrand = 'disney';
let currentType = 'pelicula';
let hlsInstance = null;

// --- LÓGICA DE INTRODUCCIÓN ---
const vIntro = document.getElementById('intro-video');
const lIntro = document.getElementById('intro-layer');

vIntro.onended = function() {
    finalizarIntro();
};

function finalizarIntro() {
    lIntro.style.opacity = '0';
    setTimeout(() => {
        lIntro.classList.add('hidden');
        document.getElementById('sc-login').classList.remove('hidden');
        document.getElementById('log-u').focus();
    }, 1000);
}

// Escuchar Firebase
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
        hlsInstance = new Hls();
        hlsInstance.loadSource(url);
        hlsInstance.attachMedia(video);
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
    // Si la intro está activa, cualquier tecla la salta
    if (!lIntro.classList.contains('hidden')) {
        finalizarIntro();
        return;
    }

    const focusable = Array.from(document.querySelectorAll('button, input, .poster')).filter(el => el.offsetParent !== null);
    let index = focusable.indexOf(document.activeElement);

    if (e.keyCode === 37) index = Math.max(0, index - 1);
    else if (e.keyCode === 39) index = Math.min(focusable.length - 1, index + 1);
    else if (e.keyCode === 38) index = Math.max(0, index - 4);
    else if (e.keyCode === 40) index = Math.min(focusable.length - 1, index + 4);
    else if (e.keyCode === 13) document.activeElement.click();

    if (focusable[index]) focusable[index].focus();
});
