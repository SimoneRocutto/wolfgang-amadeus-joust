const socket = io();
const music = document.getElementById("bg-music");
const header = document.getElementById("header");
const startBtn = document.getElementById("start-game-btn");
const toLobbyBtn = document.getElementById("to-lobby-btn");
const winnerBox = document.getElementById("winner-box");
const winnerDiv = document.getElementById("winner");
const lobbyPlayerList = document.getElementById("lobby-players");
const gamePlayerList = document.getElementById("active-players");

const initialSpeed = 0

const lobbySettings = {
    text: "Lobby",
    class: "lobby"
};
const slowSettings = {
    text: "❄️ SLOW... DON'T MOVE!",
    class: "slow-music"
};
const fastSettings = {
    text: "🔥 FAST! ATTACK!",
    class: "fast-music"
};

setUI(lobbySettings)

window.addEventListener('load', () => {
    socket.emit('dashboard_load')
})

startBtn.onclick = () => {
    music.play();
    startBtn.classList.add("hidden");
    socket.emit('start_game');
    setUI(slowSettings)
};

toLobbyBtn.onclick = () => {
    startBtn.classList.remove("hidden");
    toLobbyBtn.classList.add("hidden");
    setUI(lobbySettings)
    socket.emit('dashboard_load')
};

socket.on("speed_update", (data) => {
    music.playbackRate = data.speed;
    if (data.speed > 1) {
        setUI(fastSettings)
    } else {
        setUI(slowSettings)
    }
});

socket.on("update_player_list", ({ lobbyPlayers, gamePlayers }) => {
    updatePlayersList(lobbyPlayerList, lobbyPlayers)
    updatePlayersList(gamePlayerList, gamePlayers)
});

socket.on("winner_announced", (data) => {
    music.pause()
    music.currentTime = 0
    setUI(getWinnerSettings(data.name))
    toLobbyBtn.classList.remove("hidden")
});

let qrcode = new QRCode(document.getElementById("qrcode"), {
    text: `${window.location.protocol}//${window.location.host}`,
    width: 128,
    height: 128,
    colorDark: "#000000",
    colorLight: "#ffffff",
    correctLevel: QRCode.CorrectLevel.H
});

function setUI(settings) {
    header.innerText = settings.text
    // document.body.style.backgroundColor = settings.color
    document.body.classList.remove("lobby", "slow-music", "fast-music", "winner")
    document.body.classList.add(settings.class)
}

function updatePlayersList(listHTML, players) {
    listHTML.innerHTML = players
        .map((p) => `<div class="player-item ${p.status}">${p.name}</div>`)
        .join("");
}

function getWinnerSettings(winnerName) {
    return {
        text: `Game is over! Winner is: ${winnerName}`,
        class: "winner"
    };
}