// 1. Configuración de tu Firebase
const firebaseConfig = { databaseURL: "https://nebula-plus-app-default-rtdb.firebaseio.com/" };
firebase.initializeApp(firebaseConfig);
const db = firebase.database();

let movies = [];
let currentBrand = 'disney';
let currentType = 'pelicula';
let hlsInstance = null;

// 2. Escuchar cambios de la App Android
db.ref('movies').on('value', snap => {
    const data = snap.val();
    movies = [];
    if(data) { 
        for(let id in data) { 
            movies.push({ ...data[id], firebaseId: id }); 
        } 
    }
    actualizarVista();
});

// 3. Funciones de Navegación
function entrar() {
    document.getElementById('sc-login').classList.add('hidden');
    document.getElementById('sc-main').classList.remove('hidden');
    // Poner el foco en el primer botón de marca
    setTimeout(() => document.querySelector('.brand-bar button').focus(), 500);
}

function actualizarVista() {
    const grid = document.getElementById('grid');
    if(!grid) return;
    
    const filtrados = movies.filter(m => m.brand === currentBrand && m.type === currentType);
    
    grid.innerHTML = filtrados.map(m => `
        <div class="poster" 
             tabindex="10" 
             style="background-image:url('${m.poster}')" 
             onclick="reproducir('${m.video}', '${m.title}')">
        </div>`).join('');
}

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

// 4. Reproductor
function reproducir(url, titulo) {
    const player = document.getElementById('video-player');
    const container = document.querySelector('.video-frame');
    document.getElementById('player-title').innerText = titulo;
    player.classList.remove('hidden');

    if(hlsInstance) hlsInstance.destroy();
    container.innerHTML = `<video id="v-main" controls autoplay style="width:100%; height:100%;"></video>`;
    
    const video = document.getElementById('v-main');
    const urlLimpia = url.trim();

    if (urlLimpia.includes('.m3u8') && Hls.isSupported()) {
        hlsInstance = new Hls();
        hlsInstance.loadSource(urlLimpia);
        hlsInstance.attachMedia(video);
    } else {
        video.src = urlLimpia;
    }
    
    document.getElementById('btn-close').focus();
}

function cerrarReproductor() {
    if(hlsInstance) hlsInstance.destroy();
    document.getElementById('video-player').classList.add('hidden');
    document.querySelector('.video-frame').innerHTML = '';
}

// 5. CONTROL REMOTO (Manejo de teclas flechas)
document.addEventListener('keydown', (e) => {
    const focusable = Array.from(document.querySelectorAll('button, input, .poster')).filter(el => el.offsetParent !== null);
    let index = focusable.indexOf(document.activeElement);

    if (e.keyCode === 37) { // Izquierda
        index = Math.max(0, index - 1);
    } else if (e.keyCode === 39) { // Derecha
        index = Math.min(focusable.length - 1, index + 1);
    } else if (e.keyCode === 38) { // Arriba
        index = Math.max(0, index - 4);
    } else if (e.keyCode === 40) { // Abajo
        index = Math.min(focusable.length - 1, index + 4);
    } else if (e.keyCode === 13) { // Enter
        document.activeElement.click();
    }

    if (focusable[index]) focusable[index].focus();
});
