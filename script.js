// CONFIGURACIÓN DE TU FIREBASE (Mismo que tu Android)
const firebaseConfig = { databaseURL: "https://nebula-plus-app-default-rtdb.firebaseio.com/" };
firebase.initializeApp(firebaseConfig);
const db = firebase.database();

let movies = []; let users = []; let currentBrand = 'disney'; let currentType = 'pelicula';
let hlsInstance = null; let datosSerieActual = [];

// 1. CONTROL DE INTRO
const vIntro = document.getElementById('intro-video'), lIntro = document.getElementById('intro-layer');
function skipIntro() {
    lIntro.style.display = 'none';
    document.getElementById('sc-login').classList.remove('hidden');
    document.getElementById('log-u').focus();
}
if(vIntro) {
    vIntro.onended = skipIntro;
    // Seguro de 6 segundos si el video falla
    setTimeout(() => { if(lIntro.style.display !== 'none') skipIntro(); }, 6000);
}

// 2. ESCUCHADORES DE FIREBASE (Sincronizado con tu Panel)
// Escuchamos la carpeta 'users' exactamente como tu Android
db.ref('users').on('value', snap => {
    const data = snap.val(); 
    users = [];
    if(data) { 
        for(let id in data) { 
            users.push(data[id]); 
        } 
        console.log("Usuarios cargados:", users.length);
    }
});

// Escuchamos la carpeta 'movies'
db.ref('movies').on('value', snap => {
    const data = snap.val(); 
    movies = [];
    if(data) { 
        for(let id in data) { 
            movies.push(data[id]); 
        } 
    }
    actualizarVista();
});

// 3. FUNCIÓN DE ENTRADA (LOGICA ANDROID)
function entrar() {
    const userIn = document.getElementById('log-u').value.trim();
    const passIn = document.getElementById('log-p').value.trim();
    
    // Buscamos coincidencia con 'u' y 'p' que es como lo guarda tu panel
    const encontrado = users.find(x => x.u === userIn && x.p === passIn);

    if(encontrado) {
        document.getElementById('sc-login').classList.add('hidden');
        document.getElementById('sc-main').classList.remove('hidden');
        document.getElementById('search-box').focus();
    } else {
        // Mensaje de ayuda para depurar
        alert("Usuario o PIN incorrectos. Revisa tu panel de Android.");
    }
}

function cerrarSesion() { location.reload(); }

// 4. VISTAS Y FILTROS
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
    
    // Filtramos por Marca, Tipo y Buscador
    const filtrados = movies.filter(m => 
        m.brand === currentBrand && 
        m.type === currentType && 
        m.title.toLowerCase().includes(term)
    );
    
    grid.innerHTML = filtrados.map(m => `
        <div class="poster" tabindex="20" style="background-image:url('${m.poster}')" 
             onclick="reproducir('${m.video}', '${m.title}', '${m.type}')">
        </div>
    `).join('');
}

// 5. REPRODUCTOR SUPER TV
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
    const caps = datosSerieActual[idx];
    list.innerHTML = caps.map((link, i) => `
        <button class="btn-cap-st" tabindex="40" onclick="gestionarVideo('${link.trim()}')">CAP ${i+1}</button>
    `).join('');
    gestionarVideo(caps[0].trim());
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

// 6. NAVEGACIÓN MANDO (Flechas y OK)
document.addEventListener('keydown', (e) => {
    const el = Array.from(document.querySelectorAll('button, input, select, .poster, .btn-cap-st')).filter(x => x.offsetParent !== null);
    let i = el.indexOf(document.activeElement);

    if (e.keyCode === 37) i = Math.max(0, i - 1);
    else if (e.keyCode === 39) i = Math.min(el.length - 1, i + 1);
    else if (e.keyCode === 38) {
        if(document.activeElement.classList.contains('poster')) i = Math.max(0, i - 5);
        else i = Math.max(0, i - 1);
    }
    else if (e.keyCode === 40) {
        if(document.activeElement.classList.contains('poster')) i = Math.min(el.length - 1, i + 5);
        else i = Math.min(el.length - 1, i + 1);
    }
    else if (e.keyCode === 13) {
        if(document.activeElement.tagName === 'BODY') {
            const v = document.getElementById('v-main');
            if(v) { if(v.paused) v.play(); else v.pause(); }
        } else {
            document.activeElement.click();
        }
    }

    if (el[i]) {
        el[i].focus();
        el[i].scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
});
