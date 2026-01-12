/**
 * Audio Service
 * Handles all audio playback
 */

class AudioService {
  constructor() {
    this.deathSound = null;
    this.backgroundMusic = null;
    this.audioUnlocked = false;
  }

  init() {
    if (this.deathSound) return;

    this.deathSound = new Audio("/assets/sounds/sfx/glass_break.mp3");
    this.deathSound.preload = "auto";
  }

  unlockAudio() {
    if (this.audioUnlocked) return;

    this.init();

    this.deathSound
      .play()
      .then(() => {
        this.deathSound.pause();
        this.deathSound.currentTime = 0;
        this.audioUnlocked = true;
        console.log("✅ Audio unlocked");
      })
      .catch((error) => {
        console.warn("⚠️ Audio unlock failed:", error);
      });
  }

  playDeathSound() {
    if (!this.deathSound) this.init();

    this.deathSound.pause();
    this.deathSound.currentTime = 0;

    this.deathSound.play().catch((error) => {
      console.error("❌ Failed to play death sound:", error);
    });
  }

  playBackgroundMusic(filename) {
    if (this.backgroundMusic) {
      this.stopBackgroundMusic();
    }

    this.backgroundMusic = new Audio(
      `/assets/sounds/background_music/${filename}`
    );
    this.backgroundMusic.loop = true;
    this.backgroundMusic.type = "audio/mpeg";

    return this.backgroundMusic.play().catch((error) => {
      console.error("❌ Failed to play background music:", error);
    });
  }

  stopBackgroundMusic() {
    if (this.backgroundMusic) {
      this.backgroundMusic.pause();
      this.backgroundMusic.currentTime = 0;
      this.backgroundMusic = null;
    }
  }

  setMusicSpeed(speed) {
    if (this.backgroundMusic) {
      this.backgroundMusic.playbackRate = speed;
    }
  }

  playSFX(path) {
    const sfx = new Audio(path);
    sfx.play().catch((error) => {
      console.error("❌ Failed to play SFX:", error);
    });
  }
}

// Export singleton instance
const audioService = new AudioService();
