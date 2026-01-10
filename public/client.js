const socket = io();

const loginScreen = document.getElementById('login-screen');
const lobbyScreen = document.getElementById('lobby-screen');
const gameScreen = document.getElementById('game-screen');
const statusDiv = document.getElementById('status-indicator');
const debugDiv = document.getElementById('debug-info');
const userInp = document.getElementById('username');
const joinBtn = document.getElementById('join-btn');
const lobbyPlayerList = document.getElementById('lobby-player-list');
const gamePlayerList = document.getElementById('game-player-list');

const deathSound = new Audio('assets/sounds/glass_break.mp3');

let wakeLock = null;
requestWakeLock();

let isAlive = true;

joinBtn.addEventListener('click', () => {
    const name = userInp.value || 'Player';

    // UNLOCK AUDIO: On mobile devices, audio must be first enabled by the user
    deathSound.play().then(() => {
        deathSound.pause(); // Lo facciamo partire e subito in pausa
        deathSound.currentTime = 0;
    }).catch(e => console.log("Audio waiting for interaction"));

    // Todo: add "shake to enter" => we make sure no player can enter unless they prove they
    // can die during the game
    joinLobby(name);
});

function joinLobby(name) {
    loginScreen.classList.add('hidden');
    lobbyScreen.classList.remove('hidden');
    socket.emit('join_lobby', { name: name });
}

function startGame(name) {
    lobbyScreen.classList.add('hidden');
    loginScreen.classList.add('hidden');
    gameScreen.classList.remove('hidden');
    setUI(false)
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

socket.on('start_game', () => {
    startGame()
})

socket.on('game_over', () => {
    if (!isAlive) return;

    setUI(true)

    deathSound.play();

    window.removeEventListener('devicemotion', handleMotion);

    if (window.navigator.vibrate) {
        window.navigator.vibrate([200, 100, 200]); // Vibra-Pausa-Vibra
    }
});

socket.on('update_player_list', ({ lobbyPlayers, gamePlayers }) => {
    console.log(lobbyPlayers)
    updatePlayersList(lobbyPlayerList, lobbyPlayers)
    updatePlayersList(gamePlayerList, gamePlayers)
});

document.addEventListener('visibilitychange', async () => {
    if (wakeLock !== null && document.visibilityState === 'visible') {
        await requestWakeLock();
    }
});

// Player list on client page has been removed in favor of simpler UI
function updatePlayersList(listHTML, players) {
    // listHTML.innerHTML = '';
    // players.forEach(p => {
    //     const li = document.createElement('li');
    //     li.innerHTML = `<span>${p.name}</span> <span class="status-${p.status}">${p.status.toUpperCase()}</span>`;
    //     listHTML.appendChild(li);
    // });
}

function setUI(isDead) {
    isAlive = !isDead;
    classToAdd = isDead ? 'dead' : 'alive'
    classToRemove = isDead ? 'alive' : 'dead'
    document.body.classList.add(classToAdd);
    document.body.classList.remove(classToRemove);
    statusDiv.innerText = isDead ? "YOU'RE DEAD!" : "ALIVE";
}

async function requestWakeLock() {
    try {
        wakeLock = await navigator.wakeLock.request('screen');
        console.log('Wake Lock is active!');

        wakeLock.addEventListener('release', () => {
            console.log('Wake Lock was released');
        });
    } catch (err) {
        console.error(`${err.name}, ${err.message}`);
    }
};