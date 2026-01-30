// CONFIG FIREBASE
const firebaseConfig = { databaseURL: "https://nebula-plus-app-default-rtdb.firebaseio.com/" };
firebase.initializeApp(firebaseConfig);
const db = firebase.database();

let movies = []; let currentBrand = 'disney'; let currentType = 'pelicula';
let hlsInstance = null; let videoActual = null;

// CARGAR DATOS
db.ref('movies').on('value', snap => {
    const data = snap.val();
    movies = [];
    for(let id in data) movies.push({...data[id], firebaseId: id});
    actualizarVista();
});

// NAVEGACIÓN CONTROL REMOTO (D-PAD)
document.addEventListener('keydown', (e) => {
    const actual = document.activeElement;
    const todos = Array.from(document.querySelectorAll('[tabindex], button, input, .poster, select'));
    
    if(e.key === "Enter") { actual.click(); return; }

    const rectA = actual.getBoundingClientRect();
    const centroA = { x: rectA.left + rectA.width/2, y: rectA.top + rectA.height/2 };
    let mejor = null; let dMin = Infinity;

    todos.forEach(cand => {
        if(cand === actual || cand.offsetParent === null) return;
        const rC = cand.getBoundingClientRect();
        const cC = { x: rC.left + rC.width/2, y: rC.top + rC.height/2 };
        const dx = cC.x - centroA.x; const dy = cC.y - centroA.y;
        
        let ok = false;
        if(e.key === "ArrowRight" && dx > 10 && Math.abs(dy) < Math.abs(dx)) ok = true;
        if(e.key === "ArrowLeft" && dx < -10 && Math.abs(dy) < Math.abs(dx)) ok = true;
        if(e.key === "ArrowDown" && dy > 10 && Math.abs(dx) < Math.abs(dy)) ok = true;
        if(e.key === "ArrowUp" && dy < -10 && Math.abs(dx) < Math.abs(dy)) ok = true;

        if(ok) {
            const d = Math.sqrt(dx*dx + dy*dy);
            if(d < dMin) { dMin = d; mejor = cand; }
        }
    });

    if(mejor) {
        mejor.focus();
        mejor.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'center' });
        e.preventDefault();
    }
});

// REPRODUCTOR CON CARGA NEBULA+
function gestionarFuenteVideo(url) {
    const frame = document.querySelector('.video-frame');
    const loader = document.getElementById('loading-screen');
    loader.classList.remove('hidden');
    
    if(hlsInstance) hlsInstance.destroy();
    frame.innerHTML = `<video id="main-v" controlsList="nodownload" oncontextmenu="return false;" style="width:100%; height:100vh;"></video>`;
    videoActual = document.getElementById('main-v');

    if (url.includes('.m3u8')) {
        hlsInstance = new Hls(); hlsInstance.loadSource(url); hlsInstance.attachMedia(videoActual);
    } else { videoActual.src = url; }

    videoActual.oncanplay = () => { loader.classList.add('hidden'); videoActual.play(); };
    videoActual.onwaiting = () => loader.classList.remove('hidden');
    videoActual.onplaying = () => loader.classList.add('hidden');
}

// FUNCIONES DE INTERFAZ
function entrar() {
    document.getElementById('sc-login').classList.add('hidden');
    document.getElementById('sc-main').classList.remove('hidden');
    setTimeout(() => document.querySelector('.brand-btn').focus(), 500);
}

function actualizarVista() {
    const grid = document.getElementById('grid');
    const filtrados = movies.filter(m => m.brand === currentBrand && m.type === currentType);
    grid.innerHTML = filtrados.map(m => `
        <div class="poster" tabindex="0" style="background-image:url('${m.poster}')" 
             onclick="reproducir('${m.video}', '${m.title}')"></div>
    `).join('');
}

function seleccionarMarca(b) { currentBrand = b; actualizarVista(); }
function cambiarTipo(t) { 
    currentType = t; 
    document.getElementById('t-peli').classList.toggle('active', t==='pelicula');
    document.getElementById('t-serie').classList.toggle('active', t==='serie');
    actualizarVista(); 
}

function reproducir(url, titulo) {
    document.getElementById('video-player').classList.remove('hidden');
    document.getElementById('player-title').innerText = titulo;
    gestionarFuenteVideo(url);
}

function cerrarReproductor() {
    if(hlsInstance) hlsInstance.destroy();
    document.getElementById('video-player').classList.add('hidden');
}

function abrirAdmin() { if(prompt("Pass:") === "2026") alert("Modo Admin desde PC recomendado"); }
