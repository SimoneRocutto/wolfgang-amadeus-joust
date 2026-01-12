/**
 * Player App
 * Main application logic for player interface
 */

class PlayerApp {
  constructor() {
    this.playerName = "Player";
    this.isAlive = true;
    this.gameRunning = false;

    this.init();
  }

  init() {
    // Request wake lock
    motionService.requestWakeLock();

    // Setup UI event listeners
    playerUI.onJoinClick(() => this.handleJoin());
    playerUI.onUsernameEnter(() => this.handleJoin());

    // Setup socket listeners
    socketService.on("start_game", () => this.handleGameStart());
    socketService.on("game_over", () => this.handleGameOver());
    socketService.on("winner_announced", () => this.handleWinnerAnnounced());
  }

  handleJoin() {
    this.playerName = playerUI.getUserName();

    // Unlock audio
    audioService.unlockAudio();

    // Request motion permissions
    motionService
      .requestPermission()
      .then(() => {
        // Start tracking to verify accelerometer
        motionService.startTracking((intensity) => {
          if (motionService.hasAccelerometer()) {
            this.joinLobby();
          } else {
            playerUI.showScreen("noGyro");
            motionService.stopTracking();
          }
        });
      })
      .catch((error) => {
        console.error("Motion permission denied:", error);
      });
  }

  joinLobby() {
    motionService.stopTracking();
    playerUI.showScreen("lobby");
    playerUI.setBodyClass("lobby");
    socketService.emit("join_lobby", { name: this.playerName });
  }

  handleGameStart() {
    this.gameRunning = true;
    this.isAlive = true;
    playerUI.showScreen("game");
    playerUI.updateGameStatus(true);

    // Start tracking motion
    motionService.startTracking((intensity) => {
      playerUI.updateMotionIntensity(intensity);

      if (this.isAlive && this.gameRunning) {
        socketService.emit("motion_data", { intensity });
      }
    });
  }

  handleGameOver() {
    if (!this.isAlive) return;

    this.isAlive = false;
    playerUI.updateGameStatus(false);
    audioService.playDeathSound();

    // Vibrate if supported
    if (window.navigator.vibrate) {
      window.navigator.vibrate([200, 100, 200]);
    }
  }

  handleWinnerAnnounced() {
    setTimeout(() => {
      this.gameRunning = false;
      this.isAlive = true;
      motionService.stopTracking();
      playerUI.showScreen("lobby");
      playerUI.setBodyClass("lobby");
    }, 3000);
  }
}

// Initialize app when DOM is ready
document.addEventListener("DOMContentLoaded", () => {
  new PlayerApp();
});
