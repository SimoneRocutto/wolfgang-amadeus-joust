/**
 * Dashboard App
 * Main application logic for dashboard interface
 */

class DashboardApp {
  constructor() {
    this.gameState = "lobby"; // 'lobby' | 'playing' | 'winner'
    this.lobbyPlayers = [];
    this.gamePlayers = [];

    this.init();
  }

  init() {
    // Initialize QR code
    dashboardUI.initQRCode();

    // Setup UI event listeners
    dashboardUI.onStartClick(() => this.handleStartGame());
    dashboardUI.onLobbyClick(() => this.handleBackToLobby());

    // Setup socket listeners
    socketService.on("update_player_list", (data) =>
      this.handlePlayerListUpdate(data)
    );
    socketService.on("speed_update", (data) => this.handleSpeedUpdate(data));
    socketService.on("winner_announced", (data) =>
      this.handleWinnerAnnounced(data)
    );

    // Request initial player list
    socketService.emit("dashboard_load");

    // Set initial UI
    dashboardUI.updateUI("lobby");
    dashboardUI.showStartButton();
  }

  handleStartGame() {
    // Select random song
    const randomIndex = Math.floor(Math.random() * playlist.length);
    const selectedSong = playlist[randomIndex];

    // Start background music
    audioService.playBackgroundMusic(selectedSong);

    // Update state
    this.gameState = "playing";
    dashboardUI.updateUI("slow");
    dashboardUI.hideAllButtons();

    // Notify server
    socketService.emit("start_game");
  }

  handleBackToLobby() {
    this.gameState = "lobby";
    dashboardUI.updateUI("lobby");
    dashboardUI.showStartButton();
    socketService.emit("dashboard_load");
  }

  handlePlayerListUpdate(data) {
    // Don't update during winner screen
    if (this.gameState === "winner") return;

    this.lobbyPlayers = data.lobbyPlayers || [];
    this.gamePlayers = data.gamePlayers || [];

    dashboardUI.updatePlayerLists(this.lobbyPlayers, this.gamePlayers);
  }

  handleSpeedUpdate(data) {
    audioService.setMusicSpeed(data.speed);

    if (data.speed > 1) {
      dashboardUI.updateUI("fast");
      audioService.playSFX("/assets/sounds/sfx/speed_up.mp3");
    } else {
      dashboardUI.updateUI("slow");
      audioService.playSFX("/assets/sounds/sfx/speed_down.mp3");
    }
  }

  handleWinnerAnnounced(data) {
    audioService.stopBackgroundMusic();
    this.gameState = "winner";
    dashboardUI.updateUI("winner", data.name);
    dashboardUI.showLobbyButton();
  }
}

// Initialize app when DOM is ready
document.addEventListener("DOMContentLoaded", () => {
  new DashboardApp();
});
