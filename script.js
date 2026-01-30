const firebaseConfig = { databaseURL: "https://nebula-plus-app-default-rtdb.firebaseio.com/" };
firebase.initializeApp(firebaseConfig);
const db = firebase.database();

let catalogFull = [], currentBrand = 'disney', currentType = 'pelicula', hlsInstance = null, datosSerieActual = [];

// INTRO CON TIMER DE SEGURIDAD (6 segundos)
const vIntro = document.getElementById('intro-video'), lIntro = document.getElementById('intro-layer');
function saltarIntro() {
    lIntro.style.display = 'none';
    document.getElementById('sc-login').classList.remove('hidden');
    document.getElementById('log-u').focus();
}
vIntro.onended = saltarIntro;
setTimeout(() => { if(lIntro.style.display !== 'none') saltarIntro(); }, 6000);

// LOGIN REAL
function entrar() {
    const u = document.getElementById('log-u').value;
    const p = document.getElementById('log-p').value;
    db.ref('usuarios').once('value', (snap) => {
        const users = snap.val();
        let ok = false;
        for(let id in users) { if(users[id].user === u && users[id].pass === p) ok = true; }
        if(ok) {
            document.getElementById('sc-login').classList.add('hidden');
            document.getElementById('sc-main').classList.remove('hidden');
        } else { alert("Acceso denegado"); }
    });
}
function cerrarSesion() { location.reload(); }

// CATALOGO Y BUSCADOR
db.ref('movies').on('value', snap => {
    const data = snap.val(); catalogFull = [];
    for (let id in data) catalogFull.push({ ...data[id], fbId: id });
    actualizarVista();
});

function actualizarVista() {
    const grid = document.getElementById('grid');
    const term = document.getElementById('search-input').value.toLowerCase();
    const filtrados = catalogFull.filter(m => m.brand === currentBrand && m.type === currentType && m.title.toLowerCase().includes(term));
    grid.innerHTML = filtrados.map(m => `<div class="poster" tabindex="20" style="background-image:url('${m.poster}')" onclick="reproducir('${m.video}', '${m.title}', '${m.type}')"></div>`).join('');
}

// REPRODUCTOR SUPER TV
function reproducir(url, titulo, tipo) {
    document.getElementById('video-player').classList.remove('hidden');
    document.getElementById('player-title').innerText = titulo;
    const ctrl = document.getElementById('serie-controls');
    if(tipo === 'serie') {
        ctrl.classList.remove('hidden');
        const temps = url.split('|');
        datosSerieActual = temps.map(t => t.split(','));
        const sel = document.getElementById('season-selector');
        sel.innerHTML = datosSerieActual.map((_, i) => `<option value="${i}">T${i+1}</option>`).join('');
        cargarTemporadaTV(0);
    } else {
        ctrl.classList.add('hidden');
        gestionarVideo(url);
    }
}

function cargarTemporadaTV(idx) {
    const list = document.getElementById('chapters-list');
    list.innerHTML = datosSerieActual[idx].map((link, i) => `<button class="btn-cap-st" tabindex="40" onclick="gestionarVideo('${link.trim()}')">EP ${i+1}</button>`).join('');
    gestionarVideo(datosSerieActual[idx][0]);
}

function gestionarVideo(url) {
    const cont = document.getElementById('v-container');
    if(hlsInstance) hlsInstance.destroy();
    cont.innerHTML = `<video id="v-main" autoplay style="width:100%; height:100%;"></video>`;
    const v = document.getElementById('v-main');
    if(url.includes('.m3u8')) {
        hlsInstance = new Hls(); hlsInstance.loadSource(url); hlsInstance.attachMedia(v);
    } else { v.src = url; }
}

function cerrarReproductor() { document.getElementById('video-player').classList.add('hidden'); if(hlsInstance) hlsInstance.destroy(); }
function seleccionarMarca(m) { currentBrand = m; actualizarVista(); }
function cambiarTipo(t) { currentType = t; actualizarVista(); }

// NAVEGACIÓN
document.addEventListener('keydown', (e) => {
    const el = Array.from(document.querySelectorAll('button, input, select, .poster, .btn-cap-st')).filter(x => x.offsetParent !== null);
    let i = el.indexOf(document.activeElement);
    if (e.keyCode === 37) i = Math.max(0, i - 1);
    else if (e.keyCode === 39) i = Math.min(el.length - 1, i + 1);
    else if (e.keyCode === 38) i = (document.activeElement.classList.contains('poster')) ? Math.max(0, i - 5) : Math.max(0, i - 1);
    else if (e.keyCode === 40) i = (document.activeElement.classList.contains('poster')) ? Math.min(el.length - 1, i + 5) : Math.min(el.length - 1, i + 1);
    else if (e.keyCode === 13) {
        if(document.activeElement.tagName === 'BODY') {
            const v = document.getElementById('v-main');
            if(v) { if(v.paused) v.play(); else v.pause(); }
        } else { document.activeElement.click(); }
    }
    if (el[i]) el[i].focus();
});
