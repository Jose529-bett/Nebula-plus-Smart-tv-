// 1. CONFIGURACIÓN FIREBASE
const firebaseConfig = { databaseURL: "https://nebula-plus-app-default-rtdb.firebaseio.com/" };
firebase.initializeApp(firebaseConfig);
const db = firebase.database();

// VARIABLES GLOBALES
let users = []; 
let movies = []; 
let currentBrand = 'disney'; 
let currentType = 'pelicula';
let datosSerieActual = [];
let hlsInstance = null;

// 2. ESCUCHA EN TIEMPO REAL (Lo que subas en Android aparecerá aquí)
db.ref('users').on('value', snap => {
    const data = snap.val();
    users = [];
    if(data) { for(let id in data) { users.push({ ...data[id], firebaseId: id }); } }
    renderUserTable();
});

db.ref('movies').on('value', snap => {
    const data = snap.val();
    movies = [];
    if(data) { for(let id in data) { movies.push({ ...data[id], firebaseId: id }); } }
    actualizarVista();
    renderMovieTable();
});

// 3. NAVEGACIÓN SMART TV (CONTROL REMOTO)
document.addEventListener('keydown', (e) => {
    const focusable = Array.from(document.querySelectorAll('button, input, .poster, select')).filter(el => el.offsetParent !== null);
    let index = focusable.indexOf(document.activeElement);

    if (e.keyCode === 37) { // Izquierda
        index = Math.max(0, index - 1);
        focusable[index].focus();
    } else if (e.keyCode === 39) { // Derecha
        index = Math.min(focusable.length - 1, index + 1);
        focusable[index].focus();
    } else if (e.keyCode === 38) { // Arriba
        index = Math.max(0, index - 4); // Salto aproximado de fila
        focusable[index].focus();
    } else if (e.keyCode === 40) { // Abajo
        index = Math.min(focusable.length - 1, index + 4);
        focusable[index].focus();
    } else if (e.keyCode === 13) { // Enter
        if (document.activeElement.classList.contains('poster')) {
            document.activeElement.click();
        }
    } else if (e.keyCode === 27 || e.keyCode === 461 || e.keyCode === 10009) { // Atrás (Esc o Back TV)
        cerrarReproductor();
    }
});

// 4. LÓGICA DE LA APP
function entrar() {
    const u = document.getElementById('log-u').value;
    const p = document.getElementById('log-p').value;
    const user = users.find(x => x.u === u && x.p === p);
    if(user || (u === 'admin' && p === '1234')) {
        document.getElementById('u-name').innerText = "Usuario: " + u;
        switchScreen('sc-main');
        setTimeout(() => document.querySelector('.brand-bar button').focus(), 500);
    } else { alert("Datos incorrectos"); }
}

function switchScreen(id) {
    document.querySelectorAll('.screen').forEach(s => s.classList.add('hidden'));
    document.getElementById(id).classList.remove('hidden');
}

function actualizarVista() {
    const grid = document.getElementById('grid');
    if(!grid) return;
    const filtrados = movies.filter(m => m.brand === currentBrand && m.type === currentType);
    grid.innerHTML = filtrados.map(m => `
        <div class="poster" 
             tabindex="20" 
             style="background-image:url('${m.poster}')" 
             onclick="reproducir('${m.video}', '${m.title}')">
        </div>`).join('');
}

function reproducir(url, titulo) {
    const player = document.getElementById('video-player');
    document.getElementById('player-title').innerText = titulo;
    player.classList.remove('hidden');
    gestionarFuenteVideo(url);
    document.getElementById('btn-close-p').focus();
}

function gestionarFuenteVideo(url) {
    const container = document.querySelector('.video-frame');
    if(hlsInstance) hlsInstance.destroy();
    container.innerHTML = '';

    const urlLimpia = url.trim();
    if (urlLimpia.includes('.m3u8') || urlLimpia.includes('.mp4')) {
        container.innerHTML = `<video id="v-player" controls autoplay style="width:100%; height:100%;"></video>`;
        const video = document.getElementById('v-player');
        if (urlLimpia.includes('.m3u8') && Hls.isSupported()) {
            hlsInstance = new Hls();
            hlsInstance.loadSource(urlLimpia);
            hlsInstance.attachMedia(video);
        } else { video.src = urlLimpia; }
    } else {
        container.innerHTML = `<iframe src="${urlLimpia}" frameborder="0" allowfullscreen style="width:100%; height:100%;"></iframe>`;
    }
}

function cerrarReproductor() {
    if(hlsInstance) hlsInstance.destroy();
    document.getElementById('video-player').classList.add('hidden');
    document.querySelector('.video-frame').innerHTML = '';
}

function seleccionarMarca(b) { currentBrand = b; actualizarVista(); }
function cambiarTipo(t) { 
    currentType = t; 
    document.getElementById('t-peli').className = (t === 'pelicula' ? 'active' : '');
    document.getElementById('t-serie').className = (t === 'serie' ? 'active' : '');
    actualizarVista(); 
}

// Funciones adicionales de Admin (Iguales a las tuyas corregidas)
function abrirAdmin() { if(prompt("Pass:") === "2026") switchScreen('sc-admin'); }
function guardarContenido() {
    const title = document.getElementById('c-title').value;
    const poster = document.getElementById('c-post').value;
    const video = document.getElementById('c-video').value;
    const brand = document.getElementById('c-brand').value;
    const type = document.getElementById('c-type').value;
    if(title && poster && video) {
        db.ref('movies').push({title, poster, video, brand, type});
        alert("Publicado");
    }
}
function cerrarSesion() { location.reload(); }
