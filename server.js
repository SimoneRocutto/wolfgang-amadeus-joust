const fs = require('fs');
const https = require('https');
const express = require('express');
const socketIo = require('socket.io');
const path = require('path');

// SSL config
const options = {
    key: fs.readFileSync(path.join(__dirname, 'certs', 'key.pem')),
    cert: fs.readFileSync(path.join(__dirname, 'certs', 'cert.pem'))
};

// App init
const app = express();
const server = https.createServer(options, app);
const io = socketIo(server);

// Serving public files
app.use(express.static(path.join(__dirname, 'public')));

app.get('/dashboard', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'dashboard.html'));
});

const slowSettings = {
    name: "Slow",
    musicSpeed: 1.0,
    threshold: 12,
    // Used when transitioning
    currentThreshold: 12,
    changeProbability: 0.25,
    changeTransition: 0,
    changeTo: "fast"
}

const fastSettings = {
    name: "Fast",
    musicSpeed: 2.0,
    threshold: 20,
    // Used when transitioning
    currentThreshold: 20,
    changeProbability: 0.33,
    // When changing from fast to slow, give players 1 sec of
    // tolerance
    changeTransition: 1000,
    changeTo: "slow"
}

const allSettings = {
    slow: slowSettings,
    fast: fastSettings
}

let players = {};
let interval;
let currentSettings = slowSettings;
let speedTransitionTimeout;
let gameRunning = false;

io.on('connection', (socket) => {
    console.log(`New connection: ${socket.id}`);

    // Dashboard logic
    socket.on('start_game', () => {
        if (gameRunning) { return; }
        console.log("Game start!")
        io.emit('start_game')
        initGame()
    })

    socket.on('dashboard_load', () => {
        emitPlayers()
    })

    // Players logic
    socket.on('join_lobby', (data) => {
        players[socket.id] = {
            id: socket.id,
            name: data.name || `Player ${socket.id.substr(0, 4)}`,
            status: 'lobby'
        };
        console.log(`${players[socket.id].name} joined the lobby!`);

        emitPlayers()
    });

    socket.on('motion_data', (data) => {
        const player = players[socket.id];
        if (!player || player.status === 'dead') return;

        if (data.intensity > currentSettings.currentThreshold) {
            console.log(`💀 ${player.name} DEAD (Movement: ${data.intensity.toFixed(2)} > Threshold: ${currentSettings.currentThreshold.toFixed(2)})`);

            player.status = 'dead';
            socket.emit('game_over');
            emitPlayers()

            checkWinner();
        }

    });

    socket.on('disconnect', () => {
        console.log(`Disconnection: ${socket.id}`);
        delete players[socket.id];
        emitPlayers();
        checkWinner();
    });
});

// Start server on every interface (0.0.0.0) to be visible on WiFi
const PORT = 3000;
server.listen(PORT, '0.0.0.0', () => {
    console.log(`\n--- SERVER STARTED ---`);
    console.log(`To connect with your phone`);
    console.log(`1. Make sure both the server machine and phone are on the same WiFi`);
    console.log(`2. Go to : https://YOUR_LOCAL_IP:${PORT}`);
    console.log(`----------------------\n`);
});

function initGame() {
    gameRunning = true;

    initPlayers()

    // Change rythm logic
    interval = setInterval(() => {
        let hasChanged = false;

        if (Math.random() < currentSettings.changeProbability) {
            // Handle transition
            const { changeTransition, currentThreshold } = currentSettings;
            currentSettings = { ...(allSettings[currentSettings.changeTo]) };
            if (changeTransition > 0) {
                currentSettings.currentThreshold = currentThreshold;
                console.log(`Tranistioning: keeping threshold at ${currentThreshold} for ${changeTransition}ms`)
                speedTransitionTimeout = setTimeout(() => {
                    currentSettings.currentThreshold = currentSettings.threshold;
                    console.log(`Transitioning ended: threshold at ${currentSettings.threshold}`)
                }, changeTransition)
            }
            hasChanged = true;
        }

        if (hasChanged) {
            // Update dashboard (speed) and phones (threshold)
            io.emit('speed_update', {
                speed: currentSettings.musicSpeed,
                threshold: currentSettings.threshold
            });

            console.log(`>>> RYTHM CHANGE! Speed: ${currentSettings.musicSpeed}x | Threshold: ${currentSettings.threshold}`);
        } else {
            console.log(`Rhythm unvaried (${currentSettings.name})`);
        }
    }, 5000);
}

function checkWinner() {
    if (!gameRunning) { return; }

    const alivePlayers = Object.values(players).filter(p => p.status === 'alive');

    if (alivePlayers.length > 1) { return; }

    const nobody = {
        id: null,
        name: "nobody",
        status: "alive"
    }
    let winner = alivePlayers?.[0] ?? nobody;
    io.emit('winner_announced', winner);
    console.log(`🏆 Winner: ${winner.name}`);
    endGame()
}

function endGame() {
    clearInterval(interval)
    clearTimeout(speedTransitionTimeout)
    resetPlayerStatus()
    gameRunning = false;
}

function initPlayers() {
    for (const player of getLobbyPlayers()) {
        player.status = "alive"
    }

    emitPlayers()

    return players
}

function resetPlayerStatus() {
    for (const player of getNonLobbyPlayers()) {
        console.log(player)
        player.status = "lobby"
    }
}

function getLobbyPlayers() {
    return getPlayersByStatus(["lobby"])
}

function getNonLobbyPlayers() {
    return getPlayersByStatus(["alive", "dead"])
}

function getPlayersByStatus(statusArr) {
    return Object.values(players).filter((p) => statusArr.includes(p.status))
}

function emitPlayers() {
    io.emit('update_player_list', { lobbyPlayers: getLobbyPlayers(), gamePlayers: getNonLobbyPlayers() });
}