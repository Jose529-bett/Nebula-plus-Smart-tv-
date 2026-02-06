const firebaseConfig = { databaseURL: "https://nebula-plus-app-default-rtdb.firebaseio.com/" };
firebase.initializeApp(firebaseConfig);
const db = firebase.database();

let users = []; let movies = []; let currentBrand = 'disney'; let currentType = 'pelicula';
let hlsInstance = null;

db.ref('users').on('value', snap => {
    const data = snap.val();
    users = data ? Object.values(data) : [{u:'admin', p:'1234'}];
});

db.ref('movies').on('value', snap => {
    const data = snap.val();
    movies = [];
    if(data) for(let id in data) movies.push({ ...data[id], firebaseId: id });
    actualizarVista();
});

// BUSCADOR CORREGIDO
function buscar() {
    const query = document.getElementById('search-box').value.toLowerCase();
    const grid = document.getElementById('grid');
    
    if(query === "") {
        actualizarVista();
        return;
    }

    const filtrados = movies.filter(m => m.title.toLowerCase().includes(query));
    grid.innerHTML = filtrados.map(m => `
        <div class="poster focusable" tabindex="0" style="background-image:url('${m.poster}')" 
             onclick="reproducir('${m.video}', '${m.title}')"></div>`).join('');
}

// NAVEGACIÓN D-PAD
document.addEventListener('keydown', (e) => {
    const activeScreen = document.querySelector('.screen:not(.hidden), .player-overlay:not(.hidden)');
    if(!activeScreen) return;
    const focusables = Array.from(activeScreen.querySelectorAll('.focusable'));
    let index = focusables.indexOf(document.activeElement);

    if (e.key === 'ArrowRight') (index < focusables.length - 1) && focusables[index + 1].focus();
    if (e.key === 'ArrowLeft') (index > 0) && focusables[index - 1].focus();
    if (e.key === 'ArrowDown') {
        let step = activeScreen.id === 'sc-main' ? 5 : 1;
        (index + step < focusables.length) ? focusables[index + step].focus() : focusables[focusables.length-1].focus();
    }
    if (e.key === 'ArrowUp') {
        let step = activeScreen.id === 'sc-main' ? 5 : 1;
        (index - step >= 0) ? focusables[index - step].focus() : focusables[0].focus();
    }
    if (e.key === 'Enter') {
        e.preventDefault();
        if (document.activeElement) document.activeElement.click();
    }
    if (e.key === 'Escape' || e.key === 'Back') cerrarReproductor();
});

function entrar() {
    const u = document.getElementById('log-u').value;
    const p = document.getElementById('log-p').value;
    const user = users.find(x => x.u === u && x.p === p);
    if(user) {
        document.getElementById('u-name').innerText = "Hola, " + u;
        switchScreen('sc-main');
        setTimeout(() => document.querySelector('.brand-bar .focusable').focus(), 500);
    } else { alert("Acceso denegado"); }
}

function switchScreen(id) {
    document.querySelectorAll('.screen').forEach(s => s.classList.add('hidden'));
    document.getElementById(id).classList.remove('hidden');
}

// REPRODUCIR CON NOMBRE VISIBLE
function reproducir(cadenaVideo, titulo) {
    const player = document.getElementById('video-player');
    document.getElementById('player-title').innerText = titulo; // Pone el nombre
    player.classList.remove('hidden');

    const item = movies.find(m => m.title === titulo);
    if(item && item.type === 'serie') {
        document.getElementById('serie-controls').classList.remove('hidden');
        const temporadas = item.video.split('|');
        const capitulos = temporadas[0].split(',');
        document.getElementById('episodes-grid').innerHTML = capitulos.map((link, i) => `
            <button class="btn-ep focusable" onclick="gestionarFuenteVideo('${link.trim()}')">${i+1}</button>
        `).join('');
        gestionarFuenteVideo(capitulos[0].trim());
    } else {
        document.getElementById('serie-controls').classList.add('hidden');
        gestionarFuenteVideo(cadenaVideo);
    }
    setTimeout(() => document.getElementById('play-pause').focus(), 600);
}

function gestionarFuenteVideo(url) {
    const container = document.getElementById('v-frame');
    if(hlsInstance) hlsInstance.destroy();
    container.innerHTML = '';
    const u = url.trim();
    if(u.includes('.m3u8') || u.includes('.mp4')) {
        container.innerHTML = `<video id="main-v" autoplay style="width:100vw; height:100vh; object-fit: contain; background:#000;"></video>`;
        const video = document.getElementById('main-v');
        if(u.includes('.m3u8') && Hls.isSupported()) {
            hlsInstance = new Hls(); hlsInstance.loadSource(u); hlsInstance.attachMedia(video);
        } else { video.src = u; }
    } else {
        container.innerHTML = `<iframe src="${u}" frameborder="0" allowfullscreen style="width:100vw; height:100vh;"></iframe>`;
    }
}

function controlVideo(action) {
    const v = document.getElementById('main-v');
    if(!v) return;
    if(action === 'toggle') v.paused ? v.play() : v.pause();
    if(action === 'forward') v.currentTime += 10;
    if(action === 'rewind') v.currentTime -= 10;
}

function cerrarReproductor() {
    if(hlsInstance) hlsInstance.destroy();
    document.getElementById('video-player').classList.add('hidden');
    document.getElementById('v-frame').innerHTML = '';
}

function seleccionarMarca(b) { currentBrand = b; actualizarVista(); }
function cambiarTipo(t) { 
    currentType = t; 
    document.getElementById('t-peli').classList.toggle('active', t === 'pelicula');
    document.getElementById('t-serie').classList.toggle('active', t === 'serie');
    actualizarVista(); 
}

function actualizarVista() {
    const grid = document.getElementById('grid');
    if(!grid) return;
    const filtrados = movies.filter(m => m.brand === currentBrand && m.type === currentType);
    grid.innerHTML = filtrados.map(m => `
        <div class="poster focusable" tabindex="0" style="background-image:url('${m.poster}')" 
             onclick="reproducir('${m.video}', '${m.title}')"></div>`).join('');
}

window.onload = () => { if(document.getElementById('log-u')) document.getElementById('log-u').focus(); };
