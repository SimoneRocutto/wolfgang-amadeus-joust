/**
 * Motion Service
 * Handles device motion/accelerometer detection
 */

class MotionService {
  constructor() {
    this.wakeLock = null;
    this.motionHandler = null;
    this.hasGyro = false;
    this.bypassGyroCheck = true;
  }

  async requestPermission() {
    if (typeof DeviceMotionEvent.requestPermission === "function") {
      try {
        const response = await DeviceMotionEvent.requestPermission();
        if (response === "granted") {
          console.log("✅ Motion permission granted");
          return true;
        } else {
          console.warn("⚠️ Motion permission denied");
          return false;
        }
      } catch (error) {
        console.error("❌ Motion permission error:", error);
        return false;
      }
    }
    return true;
  }

  hasAccelerometer() {
    return this.bypassGyroCheck || this.hasGyro;
  }

  startTracking(callback) {
    this.motionHandler = (event) => {
      const acc = event.accelerationIncludingGravity || event.acceleration;

      if (!this.bypassGyroCheck && (!acc || acc.x === null)) {
        this.hasGyro = false;
        return;
      }

      this.hasGyro = true;

      const intensity = Math.sqrt(acc.x ** 2 + acc.y ** 2 + acc.z ** 2);

      callback(intensity);
    };

    window.addEventListener("devicemotion", this.motionHandler);
  }

  stopTracking() {
    if (this.motionHandler) {
      window.removeEventListener("devicemotion", this.motionHandler);
      this.motionHandler = null;
    }
  }

  async requestWakeLock() {
    if (!("wakeLock" in navigator)) {
      console.warn("⚠️ Wake Lock API not supported");
      return;
    }

    try {
      this.wakeLock = await navigator.wakeLock.request("screen");
      console.log("✅ Wake Lock active");

      this.wakeLock.addEventListener("release", () => {
        console.log("🔓 Wake Lock released");
      });

      document.addEventListener("visibilitychange", async () => {
        if (this.wakeLock !== null && document.visibilityState === "visible") {
          await this.requestWakeLock();
        }
      });
    } catch (error) {
      console.error("❌ Wake Lock error:", error);
    }
  }

  releaseWakeLock() {
    if (this.wakeLock) {
      this.wakeLock.release();
      this.wakeLock = null;
    }
  }
}

// Export singleton instance
const motionService = new MotionService();
