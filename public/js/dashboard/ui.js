/**
 * Dashboard UI Manager
 * Handles all UI updates for the dashboard
 */

class DashboardUI {
  constructor() {
    this.elements = {
      header: document.getElementById("header"),
      startBtn: document.getElementById("start-game-btn"),
      toLobbyBtn: document.getElementById("to-lobby-btn"),
      lobbyPlayersTitle: document.getElementById("lobby-players-title"),
      lobbyPlayerList: document.getElementById("lobby-players"),
      gamePlayersSection: document.getElementById("active-players-section"),
      gamePlayerList: document.getElementById("active-players"),
      qrcode: document.getElementById("qrcode"),
    };
  }

  setHeaderText(text) {
    this.elements.header.innerText = text;
  }

  setBackgroundClass(className) {
    document.body.classList.remove(
      "lobby",
      "slow-music",
      "fast-music",
      "winner"
    );
    document.body.classList.add(className);
  }

  updateUI(mode, winnerName = "") {
    switch (mode) {
      case "lobby":
        this.setHeaderText("Lobby");
        this.setBackgroundClass("lobby");
        this.hideGamePlayersList();
        break;
      case "slow":
        this.setHeaderText("❄️ SLOW... DON'T MOVE!");
        this.setBackgroundClass("slow-music");
        this.showGamePlayersList();
        break;
      case "fast":
        this.setHeaderText("🔥 FAST! ATTACK!");
        this.setBackgroundClass("fast-music");
        break;
      case "winner":
        this.setHeaderText(`Game is over! Winner is: ${winnerName}`);
        this.setBackgroundClass("winner");
        break;
    }
  }

  renderPlayerList(listElement, players) {
    if (!players || players.length === 0) {
      listElement.innerHTML = '<p class="empty-message">No players yet...</p>';
      return;
    }

    const html = players
      .map((p) => `<div class="player-item ${p.status}">${p.name}</div>`)
      .join("");

    listElement.innerHTML = html;
  }

  hideGamePlayersList() {
    this.elements.lobbyPlayersTitle.classList.add("hidden");
    this.elements.gamePlayersSection.classList.add("hidden");
  }

  showGamePlayersList() {
    this.elements.lobbyPlayersTitle.classList.remove("hidden");
    this.elements.gamePlayersSection.classList.remove("hidden");
  }

  updatePlayerLists(lobbyPlayers, gamePlayers) {
    this.renderPlayerList(this.elements.lobbyPlayerList, lobbyPlayers);
    this.renderPlayerList(this.elements.gamePlayerList, gamePlayers);
  }

  showStartButton() {
    this.elements.startBtn.classList.remove("hidden");
    this.elements.toLobbyBtn.classList.add("hidden");
  }

  showLobbyButton() {
    this.elements.startBtn.classList.add("hidden");
    this.elements.toLobbyBtn.classList.remove("hidden");
  }

  hideAllButtons() {
    this.elements.startBtn.classList.add("hidden");
    this.elements.toLobbyBtn.classList.add("hidden");
  }

  onStartClick(callback) {
    this.elements.startBtn.addEventListener("click", callback);
  }

  onLobbyClick(callback) {
    this.elements.toLobbyBtn.addEventListener("click", callback);
  }

  initQRCode() {
    if (typeof QRCode === "undefined") {
      console.error("QRCode library not loaded");
      return;
    }

    new QRCode(this.elements.qrcode, {
      text: `${window.location.protocol}//${window.location.host}`,
      width: 128,
      height: 128,
      colorDark: "#000000",
      colorLight: "#ffffff",
      correctLevel: QRCode.CorrectLevel.H,
    });
  }
}

// Export singleton instance
const dashboardUI = new DashboardUI();
