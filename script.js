const firebaseConfig = { databaseURL: "https://nebula-plus-app-default-rtdb.firebaseio.com/" };
firebase.initializeApp(firebaseConfig);
const db = firebase.database();

let catalogFull = [], currentBrand = 'disney', currentType = 'pelicula', hlsInstance = null, datosSerieActual = [];

// 1. INTRO LÓGICA
const vIntro = document.getElementById('intro-video'), lIntro = document.getElementById('intro-layer');
vIntro.onended = () => { lIntro.classList.add('hidden'); document.getElementById('sc-login').classList.remove('hidden'); document.getElementById('log-u').focus(); };

// 2. FIREBASE DATA
db.ref('movies').on('value', snap => {
    const data = snap.val(); catalogFull = [];
    for (let id in data) catalogFull.push({ ...data[id], fbId: id });
    actualizarVista();
});

function actualizarVista() {
    const grid = document.getElementById('grid');
    const filtrados = catalogFull.filter(item => item.brand === currentBrand && item.type === currentType);
    grid.innerHTML = filtrados.map(m => `<div class="poster" tabindex="20" style="background-image:url('${m.poster}')" onclick="reproducir('${m.video}', '${m.title}', '${m.type}')"></div>`).join('');
}

// 3. REPRODUCTOR (PELI INSTANTÁNEA / SERIE CON BARRA)
function reproducir(url, titulo, tipo) {
    document.getElementById('video-player').classList.remove('hidden');
    document.getElementById('player-title').innerText = titulo;
    const ctrl = document.getElementById('serie-controls');
    
    if(tipo === 'serie') {
        ctrl.classList.remove('hidden');
        const temps = url.split('|');
        datosSerieActual = temps.map(t => t.split(','));
        const sel = document.getElementById('season-selector');
        sel.innerHTML = datosSerieActual.map((_, i) => `<option value="${i}">TEMPORADA ${i+1}</option>`).join('');
        cargarTemporadaTV(0);
        setTimeout(() => document.querySelector('.btn-cap-square').focus(), 500);
    } else {
        ctrl.classList.add('hidden');
        gestionarVideo(url);
        document.getElementById('btn-close').focus();
    }
}

function cargarTemporadaTV(idx) {
    const list = document.getElementById('chapters-list');
    list.innerHTML = datosSerieActual[idx].map((link, i) => `<button class="btn-cap-square" tabindex="40" onclick="gestionarVideo('${link.trim()}')">EP ${i+1}</button>`).join('');
    gestionarVideo(datosSerieActual[idx][0]); // Auto-reproducir primer cap
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
function entrar() { document.getElementById('sc-login').classList.add('hidden'); document.getElementById('sc-main').classList.remove('hidden'); }

// 4. MANDO (FLECHAS + OK/PAUSA)
document.addEventListener('keydown', (e) => {
    const el = Array.from(document.querySelectorAll('button, input, select, .poster, .btn-cap-square')).filter(x => x.offsetParent !== null);
    let i = el.indexOf(document.activeElement);
    if (e.keyCode === 37) i = Math.max(0, i - 1);
    else if (e.keyCode === 39) i = Math.min(el.length - 1, i + 1);
    else if (e.keyCode === 38) i = (document.activeElement.classList.contains('poster')) ? Math.max(0, i - 4) : Math.max(0, i - 1);
    else if (e.keyCode === 40) i = (document.activeElement.classList.contains('poster')) ? Math.min(el.length - 1, i + 4) : Math.min(el.length - 1, i + 1);
    else if (e.keyCode === 13) {
        const v = document.getElementById('v-main');
        // Si no hay botón enfocado, PAUSA
        if (v && (document.activeElement.tagName === 'BODY' || document.activeElement.id === 'video-player')) {
            if(v.paused) v.play(); else v.pause();
            return;
        }
        document.activeElement.click();
    }
    if (el[i]) { el[i].focus(); el[i].scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'center' }); }
});
