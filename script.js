// --- CONFIGURACIÓN FIREBASE ---
const fbConf = { databaseURL: "https://nebula-plus-app-default-rtdb.firebaseio.com/" };
firebase.initializeApp(fbConf);
const database = firebase.database();

let allContent = [];
let brandActive = 'disney';
let typeActive = 'pelicula';
let currentVideo = null;

// --- MOTOR DE NAVEGACIÓN PARA TV ---
// Esta función permite que al mover las flechas, el foco salte correctamente
document.addEventListener('keydown', (e) => {
    const focusable = Array.from(document.querySelectorAll('[tabindex]:not(.hidden)'));
    let index = focusable.indexOf(document.activeElement);

    if (e.key === "ArrowRight") {
        let next = index + 1;
        if (next < focusable.length) focusable[next].focus();
    }
    if (e.key === "ArrowLeft") {
        let prev = index - 1;
        if (prev >= 0) focusable[prev].focus();
    }
    if (e.key === "ArrowDown") {
        // Salto inteligente hacia abajo (del header al grid)
        if (index < 5) focusable[6].focus(); 
        else if (index >= 6 && index <= 10) focusable[11].focus();
        else focusable[index + 4]?.focus(); // Baja en el grid
    }
    if (e.key === "ArrowUp") {
        if (index > 11) focusable[11].focus();
        else if (index > 5) focusable[1].focus();
    }
    if (e.key === "Enter") {
        document.activeElement.click();
    }
});

// --- BUSCADOR REAL (Corregido) ---
function activarBuscador() {
    const searchInput = document.getElementById('tv-search');
    searchInput.addEventListener('input', (e) => {
        const query = e.target.value.toLowerCase();
        const filtrados = allContent.filter(c => 
            c.title.toLowerCase().includes(query) || 
            c.brand.toLowerCase().includes(query)
        );
        renderizarGrid(filtrados);
    });
}

// --- BOTÓN SALIR / CERRAR SESIÓN ---
function salirApp() {
    // Te devuelve al login y limpia la pantalla
    document.getElementById('sc-main').classList.add('hidden');
    document.getElementById('sc-login').classList.remove('hidden');
    document.getElementById('log-u').focus();
}

// --- REPRODUCTOR INTELIGENTE (Mejorado) ---
function abrirReproductor(item) {
    const player = document.getElementById('video-player');
    player.classList.remove('hidden');
    
    // Si es serie, genera botones de EPISODIOS
    const panelSeries = document.getElementById('series-panel');
    if (item.type === 'serie' || item.episodios) {
        panelSeries.classList.remove('hidden');
        const container = document.getElementById('episodes-list');
        container.innerHTML = "";
        
        // Convertir episodios en botones para el mando
        Object.keys(item.episodios).forEach((key, i) => {
            const btn = document.createElement('button');
            btn.className = "ep-btn";
            btn.tabIndex = 100 + i; // Tabindex alto para no chocar
            btn.innerText = `EP. ${i+1}`;
            btn.onclick = () => cargarVideo(item.episodios[key].video);
            container.appendChild(btn);
        });
        // Auto-reproducir el primero
        cargarVideo(Object.values(item.episodios)[0].video);
    } else {
        panelSeries.classList.add('hidden');
        cargarVideo(item.video);
    }
    
    // Poner el foco en el botón de cerrar por seguridad
    setTimeout(() => document.querySelector('.close-player').focus(), 500);
}

function cerrarReproductor() {
    const video = document.getElementById('main-v');
    if(video) video.pause();
    document.getElementById('video-player').classList.add('hidden');
    // Al cerrar, devuelve el foco al catálogo
    document.querySelector('.poster-card').focus();
}

// --- RENDERIZADO ---
function renderizarGrid(dataCustom = null) {
    const grid = document.getElementById('grid');
    const lista = dataCustom ? dataCustom : allContent.filter(c => c.brand === brandActive && c.type === typeActive);
    
    grid.innerHTML = lista.map((item, i) => `
        <div class="poster-card" tabindex="${20 + i}" 
             style="background-image:url('${item.poster}')"
             onclick='abrirReproductor(${JSON.stringify(item)})'>
        </div>
    `).join('');
}

// Iniciar buscador al cargar
window.onload = () => {
    activarBuscador();
    // ... resto de lógica de intro ...
};
