// Configuración de tu base de datos
const fbConf = { databaseURL: "https://nebula-plus-app-default-rtdb.firebaseio.com/" };
firebase.initializeApp(fbConf);
const database = firebase.database();

let allContent = [];
let brandActive = 'disney';
let typeActive = 'pelicula';
let currentVideo = null;
let hls = null;

// 1. CONTROL DE FLUJO
window.onload = () => {
    setTimeout(() => {
        document.getElementById('sc-intro').classList.add('hidden');
        document.getElementById('sc-login').classList.remove('hidden');
        document.getElementById('log-u').focus();
    }, 3000); // 3 segundos de intro
};

function validarLogin() {
    // Simulación de login exitoso
    document.getElementById('sc-login').classList.add('hidden');
    document.getElementById('sc-main').classList.remove('hidden');
    navMarca('disney');
}

// 2. BUSCADOR INTELIGENTE
document.getElementById('tv-search').addEventListener('input', (e) => {
    const query = e.target.value.toLowerCase();
    const filtrados = allContent.filter(c => c.title.toLowerCase().includes(query));
    renderizarGrid(filtrados);
});

// 3. NAVEGACIÓN
function navMarca(m) {
    brandActive = m;
    renderizarGrid();
}

function setFiltroTipo(t) {
    typeActive = t;
    document.getElementById('tab-peli').classList.toggle('active', t==='pelicula');
    document.getElementById('tab-serie').classList.toggle('active', t==='serie');
    renderizarGrid();
}

// 4. REPRODUCTOR INTELIGENTE (Identifica Película o Serie)
function abrirReproductor(item) {
    const player = document.getElementById('video-player');
    const panelSeries = document.getElementById('series-panel');
    const displayTitle = document.getElementById('v-display-title');
    
    player.classList.remove('hidden');
    displayTitle.innerText = item.title;

    // --- LÓGICA DE IDENTIFICACIÓN ---
    if (item.type === 'serie' || item.episodios) {
        console.log("Modo Inteligente: SERIE Detectada.");
        panelSeries.classList.remove('hidden');
        generarCapitulos(item.episodios, item.title);
        
        // Cargar el primer capítulo automáticamente si existe
        if(item.episodios) {
            const primerEp = Object.values(item.episodios)[0].video;
            prepararVideo(primerEp);
        }
    } else {
        console.log("Modo Inteligente: PELÍCULA Detectada.");
        panelSeries.classList.add('hidden');
        prepararVideo(item.video); // Reproducción instantánea
    }
}

function generarCapitulos(eps, tituloSerie) {
    const container = document.getElementById('episodes-list');
    container.innerHTML = "";
    Object.keys(eps).forEach((key, i) => {
        const btn = document.createElement('button');
        btn.className = "ep-btn";
        btn.tabIndex = 30 + i;
        btn.innerText = `Episodio ${i + 1}`;
        btn.onclick = () => {
            document.getElementById('v-display-title').innerText = `${tituloSerie} - E${i+1}`;
            prepararVideo(eps[key].video);
        };
        container.appendChild(btn);
    });
}

function prepararVideo(url) {
    const wrapper = document.getElementById('v-wrapper');
    const loader = document.getElementById('nebula-loader');
    
    if(hls) hls.destroy();
    wrapper.innerHTML = `<video id="main-v" style="width:100%; height:100vh;"></video>`;
    currentVideo = document.getElementById('main-v');

    loader.classList.add('loading-on');
    currentVideo.onplaying = () => loader.classList.remove('loading-on');

    if(url.includes('.m3u8')) {
        hls = new Hls(); hls.loadSource(url); hls.attachMedia(currentVideo);
        hls.on(Hls.Events.MANIFEST_PARSED, () => currentVideo.play());
    } else {
        currentVideo.src = url; currentVideo.play();
    }

    currentVideo.ontimeupdate = () => {
        const pct = (currentVideo.currentTime / currentVideo.duration) * 100;
        document.getElementById('v-bar').style.width = pct + "%";
    };
}

function togglePlay() {
    if(currentVideo.paused) { currentVideo.play(); } else { currentVideo.pause(); }
}

function cerrarReproductor() {
    if(currentVideo) currentVideo.pause();
    document.getElementById('video-player').classList.add('hidden');
}

// 5. CARGA DESDE FIREBASE
database.ref('movies').on('value', res => {
    const data = res.val();
    allContent = [];
    for(let id in data) allContent.push({...data[id], id});
    renderizarGrid();
});

function renderizarGrid(dataCustom = null) {
    const grid = document.getElementById('grid');
    const lista = dataCustom ? dataCustom : allContent.filter(c => c.brand === brandActive && c.type === typeActive);
    
    grid.innerHTML = lista.map(item => `
        <div class="poster-card" tabindex="0" 
             style="background-image:url('${item.poster}')"
             onclick='abrirReproductor(${JSON.stringify(item).replace(/'/g, "&apos;")})'>
        </div>
    `).join('');
}
