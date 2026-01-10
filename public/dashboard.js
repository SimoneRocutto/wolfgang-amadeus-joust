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
    color: "#004400",
};
const slowSettings = {
    text: "❄️ SLOW... DON'T MOVE!",
    color: "#000044",
};
const fastSettings = {
    text: "🔥 FAST! ATTACK!",
    color: "#440000",
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
    document.body.style.backgroundColor = settings.color
}

function updatePlayersList(listHTML, players) {
    listHTML.innerHTML = players
        .map((p) => `<div class="${p.status}">${p.name} - ${p.status}</div>`)
        .join("");
}

function getWinnerSettings(winnerName) {
    return {
        text: `Game is over! Winner is: ${winnerName}`,
        color: "#118811",
    };
}