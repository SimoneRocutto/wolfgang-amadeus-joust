const socket = io();

const loginScreen = document.getElementById('login-screen');
const gameScreen = document.getElementById('game-screen');
const statusDiv = document.getElementById('status-indicator');
const debugDiv = document.getElementById('debug-info');
const userInp = document.getElementById('username');
const joinBtn = document.getElementById('join-btn');
const playerList = document.getElementById('player-list');

const deathSound = new Audio('assets/sounds/glass_break.mp3');

let isAlive = true;

joinBtn.addEventListener('click', () => {
    const name = userInp.value || 'Player';

    // UNLOCK AUDIO: On mobile devices, audio must be first enabled by the user
    deathSound.play().then(() => {
        deathSound.pause(); // Lo facciamo partire e subito in pausa
        deathSound.currentTime = 0;
    }).catch(e => console.log("Audio waiting for interaction"));

    startGame(name);
});

function startGame(name) {
    loginScreen.classList.add('hidden');
    gameScreen.classList.remove('hidden');
    document.body.classList.add('alive');
    socket.emit('join_game', { name: name });
    window.addEventListener('devicemotion', handleMotion);
}

function handleMotion(event) {
    if (!isAlive) return;
    const acc = event.accelerationIncludingGravity || event.acceleration;
    if (!acc || acc.x === null) return;

    const intensity = Math.sqrt(acc.x ** 2 + acc.y ** 2 + acc.z ** 2);
    debugDiv.innerText = `Force: ${intensity.toFixed(2)}`;

    socket.emit('motion_data', { intensity: intensity });
}

socket.on('game_over', () => {
    if (!isAlive) return;

    isAlive = false;
    document.body.className = 'dead';
    statusDiv.innerText = "YOU'RE DEAD!";

    deathSound.play();

    if (window.navigator.vibrate) {
        window.navigator.vibrate([200, 100, 200]); // Vibra-Pausa-Vibra
    }
});

socket.on('update_player_list', (players) => {
    playerList.innerHTML = '';
    Object.values(players).forEach(p => {
        const li = document.createElement('li');
        li.innerHTML = `<span>${p.name}</span> <span class="${p.status === 'alive' ? 'status-alive' : 'status-dead'}">${p.status.toUpperCase()}</span>`;
        playerList.appendChild(li);
    });
});