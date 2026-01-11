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
const gyroMissingText = document.getElementById('acceleration-missing');

const deathSound = new Audio('assets/sounds/sfx/glass_break.mp3');

let wakeLock = null;
requestWakeLock();

let gameRunning = false;
let isAlive = true;
let toLobbyTimeout;
let joiningLobby = false;
let playerName = "Player";

joinBtn.addEventListener('click', () => {
    playerName = userInp.value || 'Player';

    // UNLOCK AUDIO: On mobile devices, audio must be first enabled by the user
    deathSound.play().then(() => {
        deathSound.pause();
        deathSound.currentTime = 0;
    }).catch(e => console.log("Audio waiting for interaction"));

    askPermission();
});

function tryJoiningLobby() {
    joiningLobby = true;
    window.addEventListener('devicemotion', handleMotion);
}

function joinLobby() {
    joiningLobby = false;
    loginScreen.classList.add('hidden');
    lobbyScreen.classList.remove('hidden');
    socket.emit('join_lobby', { name: playerName });
}

function startGame(name) {
    // Avoid going to Lobby right after game start
    gameRunning = true;
    clearTimeout(toLobbyTimeout);
    lobbyScreen.classList.add('hidden');
    gameScreen.classList.remove('hidden');
    setUI(false);
}

// Test if this works on safari
function askPermission() {
    if (typeof DeviceMotionEvent.requestPermission === "function") {
        DeviceOrientationEvent.requestPermission()
            .then(response => {
                if (response == "granted") {
                    tryJoiningLobby();
                }
            })
            .catch(console.error);
    } else {
        tryJoiningLobby();
    }
}

function handleMotion(event) {
    if (joiningLobby) {
        checkGyro(event);
        return;
    }

    if (!isAlive || !gameRunning) return;
    const acc = event.accelerationIncludingGravity || event.acceleration;
    if (!acc || acc.x === null) return;

    const intensity = Math.sqrt(acc.x ** 2 + acc.y ** 2 + acc.z ** 2);
    debugDiv.innerText = `Force: ${intensity.toFixed(2)}`;

    socket.emit('motion_data', { intensity: intensity });
}

function checkGyro(event) {
    const acc = event.accelerationIncludingGravity || event.acceleration;
    if (!acc || acc.x == null) {
        gyroMissingText.classList.remove('hidden')
        loginScreen.classList.add('hidden');
    } else {
        gyroMissingText.classList.add('hidden')
        joiningLobby = false;
        joinLobby();
    }
}

socket.on('start_game', () => {
    startGame()
})

socket.on('game_over', () => {
    if (!isAlive) return;

    setUI(true)
    playDeathSfx()

    if (window.navigator.vibrate) {
        window.navigator.vibrate([200, 100, 200]); // Vibration-Pause-Vibration
    }
});

socket.on('winner_announced', () => {
    clearTimeout(toLobbyTimeout)
    toLobbyTimeout = setTimeout(() => {
        gameScreen.classList.add('hidden');
        document.body.classList.remove('dead', 'alive');
        lobbyScreen.classList.remove('hidden');
        gameRunning = false;
    }, 3000)
});

document.addEventListener('visibilitychange', async () => {
    if (wakeLock !== null && document.visibilityState === 'visible') {
        await requestWakeLock();
    }
});

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
}

// Stopping in case someone dies, enters lobby and dies again within
// 3s (mostly me while testing)
function playDeathSfx() {
    deathSound.pause();
    deathSound.currentTime = 0;
    deathSound.play();
}