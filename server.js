import fs from "fs";
import https from "https";
import express from "express";
import { Server } from "socket.io";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ============================================================================
// CONFIGURATION
// ============================================================================

const PORT = 3000;

const SSL_OPTIONS = {
  key: fs.readFileSync(path.join(__dirname, "certs", "key.pem")),
  cert: fs.readFileSync(path.join(__dirname, "certs", "cert.pem")),
};

const GAME_MODES = {
  slow: {
    name: "Slow",
    musicSpeed: 1.0,
    threshold: 12,
    currentThreshold: 12,
    changeProbability: 0.25,
    changeTransition: 0,
    changeTo: "fast",
  },
  fast: {
    name: "Fast",
    musicSpeed: 2.0,
    threshold: 20,
    currentThreshold: 20,
    changeProbability: 0.33,
    changeTransition: 1000,
    changeTo: "slow",
  },
};

const RHYTHM_CHECK_INTERVAL = 5000;

// ============================================================================
// SERVER SETUP
// ============================================================================

const app = express();
const server = https.createServer(SSL_OPTIONS, app);
const io = new Server(server);

app.use(express.static(path.join(__dirname, "public")));

app.get("/dashboard", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "dashboard.html"));
});

// ============================================================================
// GAME STATE
// ============================================================================

class GameState {
  constructor() {
    this.players = {};
    this.gameRunning = false;
    this.currentMode = GAME_MODES.slow;
    this.rhythmInterval = null;
    this.transitionTimeout = null;
  }

  addPlayer(socketId, name) {
    this.players[socketId] = {
      id: socketId,
      name: name || `Player ${socketId.substr(0, 4)}`,
      status: "lobby",
    };
    console.log(`✅ ${this.players[socketId].name} joined the lobby`);
  }

  removePlayer(socketId) {
    const player = this.players[socketId];
    if (player) {
      console.log(`❌ ${player.name} disconnected`);
      delete this.players[socketId];
    }
  }

  getPlayer(socketId) {
    return this.players[socketId];
  }

  getAllPlayers() {
    return Object.values(this.players);
  }

  getPlayersByStatus(...statuses) {
    return this.getAllPlayers().filter((p) => statuses.includes(p.status));
  }

  getLobbyPlayers() {
    return this.getPlayersByStatus("lobby");
  }

  getAlivePlayers() {
    return this.getPlayersByStatus("alive");
  }

  getGamePlayers() {
    return this.getPlayersByStatus("alive", "dead");
  }

  killPlayer(socketId) {
    const player = this.players[socketId];
    if (player) {
      player.status = "dead";
    }
  }

  startGame() {
    if (this.gameRunning) return false;

    this.gameRunning = true;
    this.currentMode = GAME_MODES.slow;

    this.getLobbyPlayers().forEach((player) => {
      player.status = "alive";
    });

    console.log("🎮 Game started!");
    return true;
  }

  endGame() {
    this.gameRunning = false;
    this.stopRhythmChanges();

    this.getGamePlayers().forEach((player) => {
      player.status = "lobby";
    });

    console.log("🏁 Game ended");
  }

  startRhythmChanges() {
    this.rhythmInterval = setInterval(() => {
      this.attemptRhythmChange();
    }, RHYTHM_CHECK_INTERVAL);
  }

  stopRhythmChanges() {
    if (this.rhythmInterval) {
      clearInterval(this.rhythmInterval);
      this.rhythmInterval = null;
    }
    if (this.transitionTimeout) {
      clearTimeout(this.transitionTimeout);
      this.transitionTimeout = null;
    }
  }

  attemptRhythmChange() {
    const shouldChange = Math.random() < this.currentMode.changeProbability;

    if (shouldChange) {
      const previousThreshold = this.currentMode.currentThreshold;
      const transition = this.currentMode.changeTransition;
      const nextModeName = this.currentMode.changeTo;

      this.currentMode = { ...GAME_MODES[nextModeName] };

      if (transition > 0) {
        this.currentMode.currentThreshold = previousThreshold;
        console.log(
          `🔄 Transitioning: keeping threshold at ${previousThreshold} for ${transition}ms`
        );

        this.transitionTimeout = setTimeout(() => {
          this.currentMode.currentThreshold = this.currentMode.threshold;
          console.log(
            `✅ Transition complete: threshold now ${this.currentMode.threshold}`
          );
        }, transition);
      }

      console.log(
        `🎵 RHYTHM CHANGE! Speed: ${this.currentMode.musicSpeed}x | Threshold: ${this.currentMode.threshold}`
      );
      return true;
    }

    console.log(`⏸️  Rhythm unchanged (${this.currentMode.name})`);
    return false;
  }

  checkForWinner() {
    if (!this.gameRunning) return null;

    const alivePlayers = this.getAlivePlayers();

    if (alivePlayers.length > 1) return null;

    const winner = alivePlayers[0] || {
      id: null,
      name: "nobody",
      status: "alive",
    };

    console.log(`🏆 Winner: ${winner.name}`);
    return winner;
  }
}

// ============================================================================
// GAME INSTANCE
// ============================================================================

const game = new GameState();

// ============================================================================
// SOCKET EVENT HANDLERS
// ============================================================================

io.on("connection", (socket) => {
  console.log(`🔌 New connection: ${socket.id}`);

  socket.on("start_game", () => {
    if (game.startGame()) {
      io.emit("start_game");
      game.startRhythmChanges();
      broadcastPlayerList();
    }
  });

  socket.on("dashboard_load", () => {
    broadcastPlayerList();
  });

  socket.on("join_lobby", (data) => {
    game.addPlayer(socket.id, data.name);
    broadcastPlayerList();
  });

  socket.on("motion_data", (data) => {
    const player = game.getPlayer(socket.id);

    if (!player || player.status === "dead" || !game.gameRunning) {
      return;
    }

    if (data.intensity > game.currentMode.currentThreshold) {
      console.log(
        `💀 ${player.name} DEAD ` +
          `(Movement: ${data.intensity.toFixed(2)} > ` +
          `Threshold: ${game.currentMode.currentThreshold.toFixed(2)})`
      );

      game.killPlayer(socket.id);
      socket.emit("game_over");
      broadcastPlayerList();

      const winner = game.checkForWinner();
      if (winner) {
        io.emit("winner_announced", winner);
        game.endGame();
      }
    }
  });

  socket.on("disconnect", () => {
    game.removePlayer(socket.id);
    broadcastPlayerList();

    const winner = game.checkForWinner();
    if (winner) {
      io.emit("winner_announced", winner);
      game.endGame();
    }
  });
});

// Override startRhythmChanges to broadcast changes
game.startRhythmChanges = function () {
  this.rhythmInterval = setInterval(() => {
    if (this.attemptRhythmChange()) {
      io.emit("speed_update", {
        speed: this.currentMode.musicSpeed,
        threshold: this.currentMode.threshold,
      });
    }
  }, RHYTHM_CHECK_INTERVAL);
};

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function broadcastPlayerList() {
  io.emit("update_player_list", {
    lobbyPlayers: game.getLobbyPlayers(),
    gamePlayers: game.getGamePlayers(),
  });
}

// ============================================================================
// START SERVER
// ============================================================================

server.listen(PORT, "0.0.0.0", () => {
  console.log("\n" + "=".repeat(50));
  console.log("🎮 WOLFGANG AMADEUS JOUST SERVER");
  console.log("=".repeat(50));
  console.log(`📡 Server running on port ${PORT}`);
  console.log(`🌐 To connect with your phone:`);
  console.log(`   1. Ensure both server and phone are on same WiFi`);
  console.log(`   2. Go to: https://YOUR_LOCAL_IP:${PORT}`);
  console.log("=".repeat(50) + "\n");
});
