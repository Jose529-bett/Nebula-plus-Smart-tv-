const firebaseConfig = { databaseURL: "https://nebula-plus-app-default-rtdb.firebaseio.com/" };
firebase.initializeApp(firebaseConfig);
const db = firebase.database();

let movies = []; let users = []; let currentBrand = 'disney'; let currentType = 'pelicula';
let hlsInstance = null; let datosSerieActual = [];

// INTRO CON SEGURO
const vIntro = document.getElementById('intro-video'), lIntro = document.getElementById('intro-layer');
function skipIntro() {
    lIntro.style.display = 'none';
    document.getElementById('sc-login').classList.remove('hidden');
    document.getElementById('log-u').focus();
}
vIntro.onended = skipIntro;
setTimeout(() => { if(lIntro.style.display !== 'none') skipIntro(); }, 6000);

// ESCUCHADORES (Sincronizados con tu panel Android)
db.ref('users').on('value', snap => {
    const data = snap.val(); users = [];
    if(data) { for(let id in data) users.push(data[id]); }
});

db.ref('movies').on('value', snap => {
    const data = snap.val(); movies = [];
    if(data) { for(let id in data) movies.push(data[id]); }
    actualizarVista();
});

// LOGIN
function entrar() {
    const u = document.getElementById('log-u').value;
    const p = document.getElementById('log-p').value;
    const user = users.find(x => x.u === u && x.p === p);
    if(user || (u === "admin" && p === "2026")) {
        document.getElementById('sc-login').classList.add('hidden');
        document.getElementById('sc-main').classList.remove('hidden');
        document.getElementById('search-box').focus();
    } else { alert("Acceso denegado"); }
}

function cerrarSesion() { location.reload(); }

// CATALOGO Y BUSQUEDA
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
    const term = document.getElementById('search-box').value.toLowerCase();
    const filtrados = movies.filter(m => m.brand === currentBrand && m.type === currentType && m.title.toLowerCase().includes(term));
    
    grid.innerHTML = filtrados.map(m => `
        <div class="poster" tabindex="20" style="background-image:url('${m.poster}')" 
             onclick="reproducir('${m.video}', '${m.title}', '${m.type}')">
        </div>
    `).join('');
}

// REPRODUCTOR SUPER TV
function reproducir(url, titulo, tipo) {
    document.getElementById('video-player').classList.remove('hidden');
    document.getElementById('player-title').innerText = titulo;
    const ctrl = document.getElementById('serie-controls');

    if(tipo === 'serie') {
        ctrl.classList.remove('hidden');
        const temporadas = url.split('|');
        datosSerieActual = temporadas.map(t => t.split(','));
        const sel = document.getElementById('season-selector');
        sel.innerHTML = datosSerieActual.map((_, i) => `<option value="${i}">Temporada ${i+1}</option>`).join('');
        cargarTemporadaTV(0);
    } else {
        ctrl.classList.add('hidden');
        gestionarVideo(url);
    }
}

function cargarTemporadaTV(idx) {
    const list = document.getElementById('chapters-list');
    list.innerHTML = datosSerieActual[idx].map((link, i) => `
        <button class="btn-cap-st" tabindex="40" onclick="gestionarVideo('${link.trim()}')">EPISODIO ${i+1}</button>
    `).join('');
    gestionarVideo(datosSerieActual[idx][0]);
}

function gestionarVideo(url) {
    const cont = document.getElementById('v-container');
    if(hlsInstance) hlsInstance.destroy();
    cont.innerHTML = `<video id="v-main" autoplay style="width:100%; height:100%;"></video>`;
    const v = document.getElementById('v-main');
    const u = url.trim();
    if(u.includes('.m3u8')) {
        hlsInstance = new Hls(); hlsInstance.loadSource(u); hlsInstance.attachMedia(v);
    } else { v.src = u; }
}

function cerrarReproductor() { 
    document.getElementById('video-player').classList.add('hidden'); 
    if(hlsInstance) hlsInstance.destroy(); 
}

// NAVEGACIÓN POR CONTROL REMOTO
document.addEventListener('keydown', (e) => {
    const elementos = Array.from(document.querySelectorAll('button, input, select, .poster, .btn-cap-st')).filter(x => x.offsetParent !== null);
    let index = elementos.indexOf(document.activeElement);

    if (e.keyCode === 37) index = Math.max(0, index - 1); // Izquierda
    else if (e.keyCode === 39) index = Math.min(elementos.length - 1, index + 1); // Derecha
    else if (e.keyCode === 38) { // Arriba
        if(document.activeElement.classList.contains('poster')) index = Math.max(0, index - 5);
        else index = Math.max(0, index - 1);
    }
    else if (e.keyCode === 40) { // Abajo
        if(document.activeElement.classList.contains('poster')) index = Math.min(elementos.length - 1, index + 5);
        else index = Math.min(elementos.length - 1, index + 1);
    }
    else if (e.keyCode === 13) { // OK / Enter
        if(document.activeElement.tagName === 'BODY') {
            const v = document.getElementById('v-main');
            if(v.paused) v.play(); else v.pause();
        } else {
            document.activeElement.click();
        }
    }

    if (elementos[index]) {
        elementos[index].focus();
        elementos[index].scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
});
