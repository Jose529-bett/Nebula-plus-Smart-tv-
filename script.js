// CONFIGURACIÓN FIREBASE
const firebaseConfig = { databaseURL: "https://nebula-plus-app-default-rtdb.firebaseio.com/" };
firebase.initializeApp(firebaseConfig);
const db = firebase.database();

let movies = [];
let currentBrand = 'disney';
let currentType = 'pelicula';
let hls = null;

// 1. GESTIÓN DE CARGA E INTRO
window.onload = () => {
    setTimeout(() => {
        document.getElementById('sc-intro').classList.add('hidden');
        document.getElementById('sc-login').classList.remove('hidden');
        document.getElementById('log-u').focus();
    }, 3000);
};

// 2. MOTOR DE NAVEGACIÓN (D-PAD SMART TV)
document.addEventListener('keydown', (e) => {
    const focusable = Array.from(document.querySelectorAll('[tabindex="0"]:not(.hidden)'));
    let index = focusable.indexOf(document.activeElement);

    const cols = 6; // Número de posters por fila en el CSS

    switch(e.key) {
        case "ArrowRight": if(index < focusable.length - 1) focusable[index + 1].focus(); break;
        case "ArrowLeft": if(index > 0) focusable[index - 1].focus(); break;
        case "ArrowDown": if(index + cols < focusable.length) focusable[index + cols].focus(); break;
        case "ArrowUp": if(index - cols >= 0) focusable[index - cols].focus(); break;
        case "Enter": document.activeElement.click(); break;
        case "Escape": case "Back": cerrarReproductor(); break;
    }
});

// 3. BUSCADOR ACTIVO
document.getElementById('tv-search').addEventListener('input', (e) => {
    const term = e.target.value.toLowerCase();
    const filtered = movies.filter(m => m.title.toLowerCase().includes(term));
    renderGrid(filtered);
});

// 4. FUNCIONES DE CATÁLOGO
function entrar() {
    document.getElementById('sc-login').classList.add('hidden');
    document.getElementById('sc-main').classList.remove('hidden');
    renderGrid();
}

function cerrarSesion() {
    location.reload();
}

function setBrand(b) {
    currentBrand = b;
    renderGrid();
}

function setType(t) {
    currentType = t;
    document.getElementById('btn-peli').classList.toggle('active', t==='pelicula');
    document.getElementById('btn-serie').classList.toggle('active', t==='serie');
    renderGrid();
}

// 5. REPRODUCTOR INTELIGENTE (Detecta Película o Serie)
function abrirReproductor(m) {
    const player = document.getElementById('video-player');
    const panel = document.getElementById('series-panel');
    player.classList.remove('hidden');
    document.getElementById('v-titulo').innerText = m.title;

    if (m.type === 'serie' || m.episodios) {
        panel.classList.remove('hidden');
        generarEpisodios(m.episodios, m.title);
        cargarVideo(Object.values(m.episodios)[0].video); // Carga el Ep 1
    } else {
        panel.classList.add('hidden');
        cargarVideo(m.video);
    }
    setTimeout(() => document.querySelector('.btn-red-close').focus(), 500);
}

function generarEpisodios(eps, titulo) {
    const container = document.getElementById('ep-list');
    container.innerHTML = "";
    Object.keys(eps).forEach((key, i) => {
        const btn = document.createElement('button');
        btn.className = "ep-btn";
        btn.tabIndex = "0";
        btn.innerText = `EP ${i+1}`;
        btn.onclick = () => {
            document.getElementById('v-titulo').innerText = `${titulo} - EP ${i+1}`;
            cargarVideo(eps[key].video);
        };
        container.appendChild(btn);
    });
}

function cargarVideo(url) {
    const wrapper = document.getElementById('v-wrapper');
    if(hls) hls.destroy();
    wrapper.innerHTML = `<video id="video-node" style="width:100%; height:100vh;" autoplay></video>`;
    const v = document.getElementById('video-node');

    if(url.includes('.m3u8')) {
        hls = new Hls(); hls.loadSource(url); hls.attachMedia(v);
    } else { v.src = url; }
}

function cerrarReproductor() {
    const v = document.getElementById('video-node');
    if(v) v.pause();
    document.getElementById('video-player').classList.add('hidden');
}

// 6. CONEXIÓN REAL FIREBASE
db.ref('movies').on('value', (snapshot) => {
    const data = snapshot.val();
    movies = [];
    for (let id in data) movies.push({ ...data[id], id });
    renderGrid();
});

function renderGrid(dataToRender = null) {
    const grid = document.getElementById('grid');
    const list = dataToRender || movies.filter(m => m.brand === currentBrand && m.type === currentType);
    
    grid.innerHTML = list.map(m => `
        <div class="poster" tabindex="0" style="background-image:url('${m.poster}')" 
             onclick='abrirReproductor(${JSON.stringify(m)})'>
        </div>
    `).join('');
}
