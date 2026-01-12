const socket = io();
const header = document.getElementById("header");
const startBtn = document.getElementById("start-game-btn");
const toLobbyBtn = document.getElementById("to-lobby-btn");
const winnerBox = document.getElementById("winner-box");
const winnerDiv = document.getElementById("winner");
const lobbyPlayerList = document.getElementById("lobby-players");
const gamePlayerList = document.getElementById("active-players");

const speedDownSfx = new Audio("/assets/sounds/sfx/speed_down.mp3");
const speedUpSfx = new Audio("/assets/sounds/sfx/speed_up.mp3");

const initialSpeed = 0;

const lobbySettings = {
  text: "Lobby",
  class: "lobby",
};
const slowSettings = {
  text: "❄️ SLOW... DON'T MOVE!",
  class: "slow-music",
};
const fastSettings = {
  text: "🔥 FAST! ATTACK!",
  class: "fast-music",
};

let music;
let currentScreen = "lobby";

setUI(lobbySettings);

window.addEventListener("load", () => {
  // Get players data
  socket.emit("dashboard_load");
});

startBtn.onclick = () => {
  const randomIndex = Math.floor(Math.random() * playlist.length);
  const selectedSong = playlist[randomIndex];

  music = new Audio(`/assets/sounds/background_music/${selectedSong}`);
  music.loop = true;
  music.type = "audio/mpeg";

  music.play();
  startBtn.classList.add("hidden");
  socket.emit("start_game");
  currentScreen = "game";
  setUI(slowSettings);
};

toLobbyBtn.onclick = () => {
  startBtn.classList.remove("hidden");
  toLobbyBtn.classList.add("hidden");
  setUI(lobbySettings);
  currentScreen = "lobby";
  socket.emit("dashboard_load");
};

socket.on("speed_update", (data) => {
  music.playbackRate = data.speed;
  if (data.speed > 1) {
    setUI(fastSettings);
    speedUpSfx.play();
  } else {
    setUI(slowSettings);
    speedDownSfx.play();
  }
});

socket.on("update_player_list", ({ lobbyPlayers, gamePlayers }) => {
  // Do not update players status during the final screen (otherwise
  // we would see people with lobby status instead of alive/dead).
  if (currentScreen === "winner") return;

  updatePlayersList(lobbyPlayerList, lobbyPlayers);
  updatePlayersList(gamePlayerList, gamePlayers);
});

socket.on("winner_announced", (data) => {
  music.pause();
  music.currentTime = 0;
  setUI(getWinnerSettings(data.name));
  currentScreen = "winner";
  toLobbyBtn.classList.remove("hidden");
});

let qrcode = new QRCode(document.getElementById("qrcode"), {
  text: `${window.location.protocol}//${window.location.host}`,
  width: 128,
  height: 128,
  colorDark: "#000000",
  colorLight: "#ffffff",
  correctLevel: QRCode.CorrectLevel.H,
});

function setUI(settings) {
  header.innerText = settings.text;
  document.body.classList.remove("lobby", "slow-music", "fast-music", "winner");
  document.body.classList.add(settings.class);
}

function updatePlayersList(listHTML, players) {
  listHTML.innerHTML = players
    .map((p) => `<div class="player-item ${p.status}">${p.name}</div>`)
    .join("");
}

function getWinnerSettings(winnerName) {
  return {
    text: `Game is over! Winner is: ${winnerName}`,
    class: "winner",
  };
}
