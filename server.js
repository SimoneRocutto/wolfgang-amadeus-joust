const fs = require('fs');
const https = require('https'); // Usiamo HTTPS nativo
const express = require('express');
const socketIo = require('socket.io');
const path = require('path');

// Configurazione Certificati SSL
const options = {
    key: fs.readFileSync(path.join(__dirname, 'certs', 'key.pem')),
    cert: fs.readFileSync(path.join(__dirname, 'certs', 'cert.pem'))
};

// Inizializzazione App
const app = express();
const server = https.createServer(options, app);
const io = socketIo(server);

// Serviamo i file statici dalla cartella 'public' (che creeremo dopo)
app.use(express.static(path.join(__dirname, 'public')));

app.get('/dashboard', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'dashboard.html'));
});

// STATO DEL GIOCO (Semplificato per ora)
// const MOVEMENT_THRESHOLD = 15; // Valore di prova per la "morte"

// STATO DEL GIOCO GLOBALE
let players = {};
let currentThreshold = 13; // Soglia iniziale (per musica lenta)
let gameSpeed = 1.0;       // Partiamo da velocità normale

// DEFINIZIONE STATI
const SPEED_SLOW = 1.0;    // Musica lenta, sensibilità alta
const SPEED_FAST = 2.0;    // Musica veloce, sensibilità bassa
const THRESHOLD_SLOW = 12; // Molto difficile
const THRESHOLD_FAST = 20; // Più facile

// Inizializziamo lo stato attuale
gameSpeed = SPEED_SLOW;
currentThreshold = THRESHOLD_SLOW;

// LOGICA DI CAMBIO RITMO OGNI 5 SECONDI
setInterval(() => {
    let hasChanged = false;

    if (gameSpeed === SPEED_SLOW) {
        // Se è LENTA: 1 possibilità su 4 (25%) di diventare VELOCE
        if (Math.random() < 0.25) {
            gameSpeed = SPEED_FAST;
            currentThreshold = THRESHOLD_FAST;
            hasChanged = true;
        }
    } else {
        // Se è VELOCE: 1 possibilità su 3 (33%) di diventare LENTA
        if (Math.random() < 0.33) {
            gameSpeed = SPEED_SLOW;
            currentThreshold = THRESHOLD_SLOW;
            hasChanged = true;
        }
    }

    if (hasChanged) {
        // Comunica il cambio alla Dashboard (musica) e ai Telefoni (soglia)
        io.emit('speed_update', {
            speed: gameSpeed,
            threshold: currentThreshold
        });

        console.log(`>>> CAMBIO RITMO! Speed: ${gameSpeed}x | Threshold: ${currentThreshold}`);
    } else {
        console.log(`Ritmo invariato (${gameSpeed === SPEED_SLOW ? 'Lento' : 'Veloce'})`);
    }
}, 5000); // Valuta ogni 5 secondi

io.on('connection', (socket) => {
    // ... (join_game e disconnect rimangono uguali)

    socket.on('motion_data', (data) => {
        const player = players[socket.id];
        if (!player || player.status === 'dead') return;

        // USA LA SOGLIA DINAMICA INVECE DI QUELLA FISSA
        if (data.intensity > currentThreshold) {
            console.log(`💀 ${player.name} ELIMINATO (Movimento: ${data.intensity.toFixed(2)} > Soglia: ${currentThreshold.toFixed(2)})`);

            player.status = 'dead';
            socket.emit('game_over');
            io.emit('update_player_list', players);

            // LOGICA LAST MAN STANDING
            checkWinner();
        }
    });
});

// Funzione di utilità per vedere se è rimasto solo uno
function checkWinner() {
    const alivePlayers = Object.values(players).filter(p => p.status === 'alive');
    if (alivePlayers.length === 1 && Object.keys(players).length > 1) {
        io.emit('winner_announced', alivePlayers[0]);
        console.log(`🏆 Vincitore: ${alivePlayers[0].name}`);
    }
}

io.on('connection', (socket) => {
    console.log(`Nuova connessione: ${socket.id}`);

    // 1. Il giocatore entra nella partita
    socket.on('join_game', (data) => {
        players[socket.id] = {
            id: socket.id,
            name: data.name || `Player ${socket.id.substr(0, 4)}`,
            status: 'alive'
        };
        console.log(`${players[socket.id].name} si è unito!`);

        // Diciamo a tutti chi c'è
        io.emit('update_player_list', players);
    });

    // 2. Ricezione dati accelerometro
    socket.on('motion_data', (data) => {
        // const player = players[socket.id];

        // // Se il giocatore è già morto o non esiste, ignoriamo
        // if (!player || player.status === 'dead') return;

        // // data.intensity è calcolato dal client (magnitudo del vettore)
        // if (data.intensity > MOVEMENT_THRESHOLD) {
        //     console.log(`💀 ${player.name} si è mosso troppo! (${data.intensity.toFixed(2)})`);

        //     player.status = 'dead';

        //     // Notifica specifica al giocatore che è morto
        //     socket.emit('game_over');

        //     // Aggiorna la dashboard per mostrare lo stato
        //     io.emit('update_player_list', players);
        // }

        const player = players[socket.id];
        if (!player || player.status === 'dead') return;

        // USA LA SOGLIA DINAMICA INVECE DI QUELLA FISSA
        if (data.intensity > currentThreshold) {
            console.log(`💀 ${player.name} ELIMINATO (Movimento: ${data.intensity.toFixed(2)} > Soglia: ${currentThreshold.toFixed(2)})`);

            player.status = 'dead';
            socket.emit('game_over');
            io.emit('update_player_list', players);

            // LOGICA LAST MAN STANDING
            checkWinner();
        }

    });

    // 3. Disconnessione
    socket.on('disconnect', () => {
        console.log(`Disconnessione: ${socket.id}`);
        delete players[socket.id];
        io.emit('update_player_list', players);
    });
});

// Avvio del server su tutte le interfacce (0.0.0.0) per essere visibile in WiFi
const PORT = 3000;
server.listen(PORT, '0.0.0.0', () => {
    console.log(`\n--- SERVER AVVIATO ---`);
    console.log(`Per connetterti dal Pixel 4a:`);
    console.log(`1. Assicurati che PC e Telefono siano sullo stesso WiFi.`);
    console.log(`2. Trova l'IP locale del tuo PC (es. ipconfig o ifconfig).`);
    console.log(`3. Vai su: https://IL_TUO_IP_LOCALE:${PORT}`);
    console.log(`----------------------\n`);
});