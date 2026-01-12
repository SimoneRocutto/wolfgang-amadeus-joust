/**
 * Player UI Manager
 * Handles all UI updates and screen transitions
 *
 * File: public/js/player/ui.js
 */

class PlayerUI {
  constructor() {
    this.screens = {
      login: document.getElementById("login-screen"),
      lobby: document.getElementById("lobby-screen"),
      game: document.getElementById("game-screen"),
      noGyro: document.getElementById("acceleration-missing"),
    };

    this.elements = {
      username: document.getElementById("username"),
      joinBtn: document.getElementById("join-btn"),
      statusIndicator: document.getElementById("status-indicator"),
      debugInfo: document.getElementById("debug-info"),
    };

    this.currentScreen = "login";
  }

  showScreen(screenName) {
    // Hide all screens
    Object.values(this.screens).forEach((screen) => {
      screen.classList.add("hidden");
    });

    // Show requested screen
    if (this.screens[screenName]) {
      this.screens[screenName].classList.remove("hidden");
      this.currentScreen = screenName;
    }
  }

  setBodyClass(className) {
    document.body.classList.remove("alive", "dead", "lobby");
    if (className) {
      document.body.classList.add(className);
    }
  }

  updateGameStatus(isAlive) {
    if (isAlive) {
      this.elements.statusIndicator.innerText = "ALIVE";
      this.setBodyClass("alive");
    } else {
      this.elements.statusIndicator.innerText = "YOU'RE DEAD!";
      this.setBodyClass("dead");
    }
  }

  updateMotionIntensity(intensity) {
    this.elements.debugInfo.innerText = `Force: ${intensity.toFixed(2)}`;
  }

  getUserName() {
    return this.elements.username.value.trim() || "Player";
  }

  onJoinClick(callback) {
    this.elements.joinBtn.addEventListener("click", callback);
  }

  onUsernameEnter(callback) {
    this.elements.username.addEventListener("keydown", (e) => {
      if (e.key === "Enter") {
        callback();
      }
    });
  }
}

// Export singleton instance
const playerUI = new PlayerUI();
