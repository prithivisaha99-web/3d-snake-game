// Web Audio API Synthesizer for 3D Arcade Snake Game (Extended Portfolio Soundset)

class SoundManager {
    constructor() {
        this.ctx = null;
        this.isMuted = false;
        this.initialized = false;
        try {
            const settings = typeof storage !== 'undefined' ? storage.getSettings() : null;
            this.isMuted = settings ? settings.soundMuted : (localStorage.getItem('snake_soundMuted') === 'true');
        } catch (e) {
            this.isMuted = false;
        }
    }

    init() {
        if (!this.initialized) {
            const AudioContext = window.AudioContext || window.webkitAudioContext;
            if (AudioContext) {
                this.ctx = new AudioContext();
                this.initialized = true;
            }
        }
        if (this.ctx && this.ctx.state === 'suspended') {
            this.ctx.resume();
        }
    }

    toggleMute() {
        this.isMuted = !this.isMuted;
        if (typeof storage !== 'undefined') {
            storage.saveSettings({ soundMuted: this.isMuted });
        } else {
            localStorage.setItem('snake_soundMuted', String(this.isMuted));
        }
        return this.isMuted;
    }

    playTone(freq, type, duration, startGain = 0.2, endGain = 0.001) {
        if (this.isMuted) return;
        this.init();
        if (!this.ctx) return;

        try {
            const now = this.ctx.currentTime;
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();

            osc.type = type;
            osc.frequency.setValueAtTime(freq, now);

            gain.gain.setValueAtTime(startGain, now);
            gain.gain.exponentialRampToValueAtTime(endGain, now + duration);

            osc.connect(gain);
            gain.connect(this.ctx.destination);

            osc.start();
            osc.stop(now + duration);
        } catch (e) {}
    }

    playEat() {
        if (this.isMuted) return;
        this.init();
        if (!this.ctx) return;

        try {
            const now = this.ctx.currentTime;
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();

            osc.type = 'triangle';
            osc.frequency.setValueAtTime(523.25, now); // C5
            osc.frequency.exponentialRampToValueAtTime(783.99, now + 0.08); // G5
            osc.frequency.exponentialRampToValueAtTime(1046.50, now + 0.16); // C6

            gain.gain.setValueAtTime(0.22, now);
            gain.gain.exponentialRampToValueAtTime(0.001, now + 0.2);

            osc.connect(gain);
            gain.connect(this.ctx.destination);

            osc.start();
            osc.stop(now + 0.2);
        } catch (e) {}
    }

    playTurn() {
        this.playTone(320, 'sine', 0.05, 0.06);
    }

    playPowerup() {
        if (this.isMuted) return;
        this.init();
        if (!this.ctx) return;

        try {
            const now = this.ctx.currentTime;
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();

            osc.type = 'sawtooth';
            osc.frequency.setValueAtTime(392, now); // G4
            osc.frequency.exponentialRampToValueAtTime(659.25, now + 0.08); // E5
            osc.frequency.exponentialRampToValueAtTime(987.77, now + 0.16); // B5
            osc.frequency.exponentialRampToValueAtTime(1318.51, now + 0.24); // E6

            gain.gain.setValueAtTime(0.25, now);
            gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);

            osc.connect(gain);
            gain.connect(this.ctx.destination);

            osc.start();
            osc.stop(now + 0.35);
        } catch (e) {}
    }

    playPowerupExpire() {
        if (this.isMuted) return;
        this.init();
        if (!this.ctx) return;

        try {
            const now = this.ctx.currentTime;
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();

            osc.type = 'sine';
            osc.frequency.setValueAtTime(600, now);
            osc.frequency.exponentialRampToValueAtTime(250, now + 0.22);

            gain.gain.setValueAtTime(0.15, now);
            gain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);

            osc.connect(gain);
            gain.connect(this.ctx.destination);

            osc.start();
            osc.stop(now + 0.25);
        } catch (e) {}
    }

    playShieldBreak() {
        if (this.isMuted) return;
        this.init();
        if (!this.ctx) return;

        try {
            const now = this.ctx.currentTime;
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();

            osc.type = 'triangle';
            osc.frequency.setValueAtTime(800, now);
            osc.frequency.exponentialRampToValueAtTime(120, now + 0.3);

            gain.gain.setValueAtTime(0.35, now);
            gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);

            osc.connect(gain);
            gain.connect(this.ctx.destination);

            osc.start();
            osc.stop(now + 0.35);
        } catch (e) {}
    }

    playAchievement() {
        if (this.isMuted) return;
        this.init();
        if (!this.ctx) return;

        try {
            const notes = [523.25, 659.25, 783.99, 1046.50]; // C, E, G, C
            notes.forEach((freq, idx) => {
                setTimeout(() => {
                    this.playTone(freq, 'triangle', 0.25, 0.2);
                }, idx * 75);
            });
        } catch (e) {}
    }

    playNewHighScore() {
        if (this.isMuted) return;
        this.init();
        if (!this.ctx) return;

        try {
            const notes = [440, 554.37, 659.25, 880, 1108.73];
            notes.forEach((freq, idx) => {
                setTimeout(() => {
                    this.playTone(freq, 'sawtooth', 0.28, 0.22);
                }, idx * 80);
            });
        } catch (e) {}
    }

    playCountdownBeep(isFinal = false) {
        this.playTone(isFinal ? 880 : 440, 'triangle', 0.12, 0.2);
    }

    playGameOver() {
        if (this.isMuted) return;
        this.init();
        if (!this.ctx) return;

        try {
            const now = this.ctx.currentTime;
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();

            osc.type = 'sawtooth';
            osc.frequency.setValueAtTime(340, now);
            osc.frequency.exponentialRampToValueAtTime(85, now + 0.65);

            gain.gain.setValueAtTime(0.3, now);
            gain.gain.exponentialRampToValueAtTime(0.001, now + 0.75);

            osc.connect(gain);
            gain.connect(this.ctx.destination);

            osc.start();
            osc.stop(now + 0.75);
        } catch (e) {}
    }

    playClick() {
        this.playTone(620, 'sine', 0.05, 0.15);
    }

    playHover() {
        this.playTone(820, 'sine', 0.03, 0.04);
    }
}

const sounds = new SoundManager();
