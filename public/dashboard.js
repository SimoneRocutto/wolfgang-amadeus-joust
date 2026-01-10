const socket = io();
const music = document.getElementById("bg-music");
const speedDisplay = document.getElementById("speed-display");
const startBtn = document.getElementById("start-game-btn");

const slowSettings = {
    text: "❄️ SLOW... DON'T MOVE!",
    color: "#000044",
};
const fastSettings = {
    text: "🔥 FAST! ATTACK!",
    color: "#440000",
};

speedDisplay.innerText = slowSettings.text;
document.body.style.backgroundColor = slowSettings.color;

startBtn.onclick = () => {
    music.play();
    startBtn.style.display = "none";
};

socket.on("speed_update", (data) => {
    music.playbackRate = data.speed;
    speedDisplay.innerText =
        data.speed > 1 ? fastSettings.text : slowSettings.text;

    document.body.style.backgroundColor =
        data.speed > 1 ? fastSettings.color : slowSettings.color;
});

socket.on("update_player_list", (players) => {
    const container = document.getElementById("active-players");
    container.innerHTML = Object.values(players)
        .map((p) => `<div class="${p.status}">${p.name} - ${p.status}</div>`)
        .join("");
});