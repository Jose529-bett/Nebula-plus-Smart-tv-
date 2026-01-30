const firebaseConfig = { databaseURL: "https://nebula-plus-app-default-rtdb.firebaseio.com/" };
firebase.initializeApp(firebaseConfig);
const db = firebase.database();

let movies = []; let currentBrand = 'disney'; let currentType = 'pelicula';
let datosSerieActual = []; let hlsInstance = null;

// 1. CARGA DE DATOS
db.ref('movies').on('value', snap => {
    const data = snap.val();
    movies = [];
    if(data) { for(let id in data) { movies.push({ ...data[id], firebaseId: id }); } }
    actualizarVista();
});

// 2. NAVEGACIÓN ESPACIAL PARA CONTROL REMOTO
document.addEventListener('keydown', (e) => {
    const teclas = ["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", "Enter"];
    if (!teclas.includes(e.key)) return;

    const actual = document.activeElement;
    if (e.key === "Enter") { actual.click(); return; }

    const todos = Array.from(document.querySelectorAll('[tabindex="0"], button, input, .poster, select'))
                       .filter(el => el.offsetParent !== null);

    const rectActual = actual.getBoundingClientRect();
    const centroActual = { x: rectActual.left + rectActual.width/2, y: rectActual.top + rectActual.height/2 };

    let mejorCand = null; let distMin = Infinity;

    todos.forEach(cand => {
        if (cand === actual) return;
        const rC = cand.getBoundingClientRect();
        const cC = { x: rC.left + rC.width/2, y: rC.top + rC.height/2 };
        const dx = cC.x - centroActual.x; const dy = cC.y - centroActual.y;

        let esValido = false;
        if (e.key === "ArrowRight" && dx > 0 && Math.abs(dy) < Math.abs(dx)) esValido = true;
        if (e.key === "ArrowLeft" && dx < 0 && Math.abs(dy) < Math.abs(dx)) esValido = true;
        if (e.key === "ArrowDown" && dy > 0 && Math.abs(dx) < Math.abs(dy)) esValido = true;
        if (e.key === "ArrowUp" && dy < 0 && Math.abs(dx) < Math.abs(dy)) esValido = true;

        if (esValido) {
            const dist = Math.sqrt(dx*dx + dy*dy);
            if (dist < distMin) { distMin = dist; mejorCand = cand; }
        }
    });

    if (mejorCand) { mejorCand.focus(); e.preventDefault(); }
});

// 3. FUNCIONES DE VISTA
function actualizarVista() {
    const grid = document.getElementById('grid');
    const filtrados = movies.filter(m => m.brand === currentBrand && m.type === currentType);
    grid.innerHTML = filtrados.map(m => `
        <div class="poster" tabindex="0" style="background-image:url('${m.poster}')" 
             onclick="reproducir('${m.video}', '${m.title}')"></div>
    `).join('');
}

function reproducir(url, titulo) {
    document.getElementById('video-player').classList.remove('hidden');
    document.getElementById('player-title').innerText = titulo;
    const item = movies.find(m => m.title === titulo);
    
    if(item && item.type === 'serie') {
        document.getElementById('serie-controls').classList.remove('hidden');
        const temps = item.video.split('|');
        datosSerieActual = temps.map(t => t.split(','));
        document.getElementById('season-selector').innerHTML = datosSerieActual.map((_,i) => `<option value="${i}">Temporada ${i+1}</option>`).join('');
        cargarTemporada(0);
    } else {
        document.getElementById('serie-controls').classList.add('hidden');
        gestionarFuenteVideo(url);
    }
}

function gestionarFuenteVideo(url) {
    const frame = document.querySelector('.video-frame');
    if(hlsInstance) hlsInstance.destroy();
    frame.innerHTML = '';
    if (url.includes('.m3u8')) {
        frame.innerHTML = `<video id="vid" controls autoplay style="width:100%;height:100%"></video>`;
        hlsInstance = new Hls(); hlsInstance.loadSource(url); hlsInstance.attachMedia(document.getElementById('vid'));
    } else if(url.includes('.mp4')) {
        frame.innerHTML = `<video src="${url}" controls autoplay style="width:100%;height:100%"></video>`;
    } else {
        frame.innerHTML = `<iframe src="${url}" style="width:100%;height:100%" allowfullscreen></iframe>`;
    }
}

function cargarTemporada(idx) {
    const grid = document.getElementById('episodes-grid');
    grid.innerHTML = datosSerieActual[idx].map((link, i) => `
        <button class="btn-ep" tabindex="0" onclick="gestionarFuenteVideo('${link.trim()}')">EP ${i+1}</button>
    `).join('');
}

function cerrarReproductor() { 
    if(hlsInstance) hlsInstance.destroy(); 
    document.getElementById('video-player').classList.add('hidden'); 
}

function entrar() { switchScreen('sc-main'); setTimeout(()=>document.querySelector('.nav-item').focus(), 500); }
function seleccionarMarca(b) { currentBrand = b; actualizarVista(); }
function cambiarTipo(t) { currentType = t; actualizarVista(); }
function switchScreen(id) { document.querySelectorAll('.screen').forEach(s => s.classList.add('hidden')); document.getElementById(id).classList.remove('hidden'); }
function abrirAdmin() { if(prompt("Pass:") === "2026") switchScreen('sc-admin'); }

function guardarContenido() {
    const data = {
        title: document.getElementById('c-title').value,
        poster: document.getElementById('c-post').value,
        video: document.getElementById('c-video').value,
        brand: document.getElementById('c-brand').value,
        type: document.getElementById('c-type').value
    };
    db.ref('movies').push(data); alert("Publicado");
}
