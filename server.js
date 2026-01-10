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

const SPEED_SLOW = 1.0;
const SPEED_FAST = 2.0;
const THRESHOLD_SLOW = 12;
const THRESHOLD_FAST = 20;

let players = {};
let gameSpeed = 1.0;
let currentThreshold = THRESHOLD_SLOW;

// Status initialization
gameSpeed = SPEED_SLOW;
currentThreshold = THRESHOLD_SLOW;

// Change rythm logic
setInterval(() => {
    let hasChanged = false;

    if (gameSpeed === SPEED_SLOW) {
        if (Math.random() < 0.25) {
            gameSpeed = SPEED_FAST;
            currentThreshold = THRESHOLD_FAST;
            hasChanged = true;
        }
    } else {
        if (Math.random() < 0.33) {
            gameSpeed = SPEED_SLOW;
            currentThreshold = THRESHOLD_SLOW;
            hasChanged = true;
        }
    }

    if (hasChanged) {
        // Update dashboard (speed) and phones (threshold)
        io.emit('speed_update', {
            speed: gameSpeed,
            threshold: currentThreshold
        });

        console.log(`>>> RYTHM CHANGE! Speed: ${gameSpeed}x | Threshold: ${currentThreshold}`);
    } else {
        console.log(`Rhythm unvaried (${gameSpeed === SPEED_SLOW ? 'Slow' : 'Fast'})`);
    }
}, 5000);

function checkWinner() {
    const alivePlayers = Object.values(players).filter(p => p.status === 'alive');
    if (alivePlayers.length === 1 && Object.keys(players).length > 1) {
        io.emit('winner_announced', alivePlayers[0]);
        console.log(`🏆 Winner: ${alivePlayers[0].name}`);
    }
}

io.on('connection', (socket) => {
    console.log(`New connection: ${socket.id}`);

    socket.on('join_game', (data) => {
        players[socket.id] = {
            id: socket.id,
            name: data.name || `Player ${socket.id.substr(0, 4)}`,
            status: 'alive'
        };
        console.log(`${players[socket.id].name} si è unito!`);

        io.emit('update_player_list', players);
    });

    socket.on('motion_data', (data) => {
        const player = players[socket.id];
        if (!player || player.status === 'dead') return;

        if (data.intensity > currentThreshold) {
            console.log(`💀 ${player.name} DEAD (Movement: ${data.intensity.toFixed(2)} > Threshold: ${currentThreshold.toFixed(2)})`);

            player.status = 'dead';
            socket.emit('game_over');
            io.emit('update_player_list', players);

            checkWinner();
        }

    });

    socket.on('disconnect', () => {
        console.log(`Disconnection: ${socket.id}`);
        delete players[socket.id];
        io.emit('update_player_list', players);
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