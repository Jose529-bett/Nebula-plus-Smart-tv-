// CONFIGURACIÓN FIREBASE
const fbConf = { databaseURL: "https://nebula-plus-app-default-rtdb.firebaseio.com/" };
firebase.initializeApp(fbConf);
const database = firebase.database();

let allContent = [];
let brandActive = 'disney';
let typeActive = 'pelicula';
let hls = null;

// 1. INICIO SEGURO (QUITA LA INTRO)
window.onload = () => {
    setTimeout(() => {
        document.getElementById('sc-intro').classList.add('hidden');
        document.getElementById('sc-login').classList.remove('hidden');
        document.getElementById('log-u').focus();
    }, 3000);
    iniciarBuscador();
};

// 2. MOTOR DE NAVEGACIÓN POR FLECHAS
document.addEventListener('keydown', (e) => {
    const items = Array.from(document.querySelectorAll('[tabindex]:not(.hidden)'));
    let idx = items.indexOf(document.activeElement);

    if (e.key === "ArrowRight") items[idx + 1]?.focus();
    if (e.key === "ArrowLeft") items[idx - 1]?.focus();
    if (e.key === "ArrowDown") items[idx + 5]?.focus() || items[items.length-1].focus();
    if (e.key === "ArrowUp") items[idx - 5]?.focus() || items[0].focus();
    if (e.key === "Enter") document.activeElement.click();
});

// 3. BUSCADOR INTELIGENTE
function iniciarBuscador() {
    document.getElementById('tv-search').addEventListener('input', (e) => {
        const val = e.target.value.toLowerCase();
        const filtrados = allContent.filter(c => c.title.toLowerCase().includes(val));
        renderGrid(filtrados);
    });
}

// 4. FUNCIONES DE INTERFAZ
function validarLogin() {
    document.getElementById('sc-login').classList.add('hidden');
    document.getElementById('sc-main').classList.remove('hidden');
    navMarca('disney');
}

function salirApp() {
    location.reload(); // Reinicia la app al login
}

function navMarca(m) {
    brandActive = m;
    renderGrid();
}

function setFiltroTipo(t) {
    typeActive = t;
    document.getElementById('tab-peli').classList.toggle('active', t==='pelicula');
    document.getElementById('tab-serie').classList.toggle('active', t==='serie');
    renderGrid();
}

// 5. REPRODUCTOR INTELIGENTE
function abrirReproductor(item) {
    const player = document.getElementById('video-player');
    player.classList.remove('hidden');
    document.getElementById('v-title').innerText = item.title;

    const panel = document.getElementById('series-panel');
    if (item.type === 'serie' || item.episodios) {
        panel.classList.remove('hidden');
        renderEpisodios(item.episodios, item.title);
        cargarVideo(Object.values(item.episodios)[0].video);
    } else {
        panel.classList.add('hidden');
        cargarVideo(item.video);
    }
    setTimeout(() => document.querySelector('.close-player').focus(), 500);
}

function renderEpisodios(eps, titulo) {
    const container = document.getElementById('ep-list');
    container.innerHTML = "";
    Object.keys(eps).forEach((key, i) => {
        const b = document.createElement('button');
        b.className = "ep-btn";
        b.tabIndex = 100 + i;
        b.innerText = `EP ${i+1}`;
        b.onclick = () => cargarVideo(eps[key].video);
        container.appendChild(b);
    });
}

function cargarVideo(url) {
    const container = document.getElementById('v-wrapper');
    if(hls) hls.destroy();
    container.innerHTML = `<video id="video-v" style="width:100%; height:100vh;" autoplay></video>`;
    const v = document.getElementById('video-v');

    if(url.includes('.m3u8')) {
        hls = new Hls(); hls.loadSource(url); hls.attachMedia(v);
    } else {
        v.src = url;
    }
}

function cerrarReproductor() {
    document.getElementById('video-player').classList.add('hidden');
    document.getElementById('v-wrapper').innerHTML = "";
}

// 6. SYNC CON FIREBASE
database.ref('movies').on('value', snap => {
    const data = snap.val();
    allContent = [];
    for(let id in data) allContent.push({...data[id], id});
    renderGrid();
});

function renderGrid(dataOverride = null) {
    const grid = document.getElementById('grid');
    const lista = dataOverride ? dataOverride : allContent.filter(c => c.brand === brandActive && c.type === typeActive);
    grid.innerHTML = lista.map(item => `
        <div class="poster-card" tabindex="20" style="background-image:url('${item.poster}')" 
             onclick='abrirReproductor(${JSON.stringify(item)})'></div>
    `).join('');
}
