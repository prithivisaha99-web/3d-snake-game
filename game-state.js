// Game State, Modes, Difficulties, Power-ups & Skins Configuration Engine

const GAME_MODES = {
    classic: {
        id: 'classic',
        name: 'Classic',
        desc: 'Traditional snake gameplay with walls and clean grid navigation.',
        icon: '🎮',
        hasWalls: true,
        hasObstacles: false,
        timeLimit: 0,
        wraps: false
    },
    time_attack: {
        id: 'time_attack',
        name: 'Time Attack',
        desc: 'Race against the clock! 60s base timer, +2s bonus per food eaten.',
        icon: '⏳',
        hasWalls: true,
        hasObstacles: false,
        timeLimit: 60,
        wraps: false
    },
    survival: {
        id: 'survival',
        name: 'Survival',
        desc: 'Dynamic 3D barriers spawn over time. Speed increases steadily!',
        icon: '🛡️',
        hasWalls: true,
        hasObstacles: true,
        timeLimit: 0,
        wraps: false
    },
    zen: {
        id: 'zen',
        name: 'Zen Mode',
        desc: 'Peaceful, relaxed gameplay. Boundaries wrap seamlessly, no stress.',
        icon: '🌸',
        hasWalls: false,
        hasObstacles: false,
        timeLimit: 0,
        wraps: true
    }
};

const GAME_DIFFICULTIES = {
    easy: {
        id: 'easy',
        name: 'Easy',
        desc: 'Gentle speed, long power-up durations.',
        tickRate: 210,
        minTickRate: 120,
        powerupDurationMult: 1.4,
        scoreMult: 1.0,
        obstacleRate: 25 // food intervals
    },
    normal: {
        id: 'normal',
        name: 'Normal',
        desc: 'Standard arcade speed and balanced challenge.',
        tickRate: 165,
        minTickRate: 90,
        powerupDurationMult: 1.0,
        scoreMult: 1.0,
        obstacleRate: 15
    },
    hard: {
        id: 'hard',
        name: 'Hard',
        desc: 'Fast pace, frequent obstacles, high reflex test.',
        tickRate: 120,
        minTickRate: 75,
        powerupDurationMult: 0.8,
        scoreMult: 1.25,
        obstacleRate: 10
    },
    insane: {
        id: 'insane',
        name: 'Insane',
        desc: 'Ultra-fast speed, rapid obstacle spawns, 1.5x score bonus!',
        tickRate: 90,
        minTickRate: 60,
        powerupDurationMult: 0.65,
        scoreMult: 1.5,
        obstacleRate: 7
    }
};

const SNAKE_SKINS = {
    emerald: {
        id: 'emerald',
        name: 'Emerald Cyber',
        headColor: 0x00ff88,
        tailColor: 0xa855f7,
        eyeColor: 0xff0055,
        glow: 0x00ff88,
        icon: '🟢',
        desc: 'Classic vibrant electric green & purple neon core.'
    },
    purple: {
        id: 'purple',
        name: 'Royal Amethyst',
        headColor: 0xc084fc,
        tailColor: 0x6366f1,
        eyeColor: 0x00ff88,
        glow: 0xa855f7,
        icon: '🟣',
        desc: 'Majestic deep violet with glowing electric accents.'
    },
    lime: {
        id: 'lime',
        name: 'Radioactive Lime',
        headColor: 0xa3e635,
        tailColor: 0x06b6d4,
        eyeColor: 0xff0077,
        glow: 0xa3e635,
        icon: '🟩',
        desc: 'Hyper-vibrant electric lime with cyan undertones.'
    },
    rainbow: {
        id: 'rainbow',
        name: 'Prismatic Rainbow',
        isRainbow: true,
        headColor: 0xff0055,
        tailColor: 0x00ffcc,
        eyeColor: 0xffffff,
        glow: 0xec4899,
        icon: '🌈',
        desc: 'Flowing chromatic gradient across every body segment.'
    },
    fire: {
        id: 'fire',
        name: 'Molten Phoenix',
        headColor: 0xff3b30,
        tailColor: 0xff9500,
        eyeColor: 0xffff00,
        glow: 0xff4500,
        icon: '🔥',
        desc: 'Infernal molten orange & fiery crimson combustion.'
    },
    ice: {
        id: 'ice',
        name: 'Glacial Aurora',
        headColor: 0x38bdf8,
        tailColor: 0x818cf8,
        eyeColor: 0x00ffcc,
        glow: 0x38bdf8,
        icon: '❄️',
        desc: 'Sub-zero frozen cyan with shimmering diamond core.'
    },
    galaxy: {
        id: 'galaxy',
        name: 'Cosmic Nebula',
        headColor: 0xe879f9,
        tailColor: 0x3b82f6,
        eyeColor: 0x38bdf8,
        glow: 0x8b5cf6,
        icon: '🌌',
        desc: 'Deep cosmic starlight with swirling celestial hues.'
    }
};

const WORLDS = {
    neon_garden: {
        id: 'neon_garden',
        name: 'Neon Garden',
        fogColor: 0x07050f,
        ambientColor: 0x3b0764,
        dirLightColor: 0x00ff88,
        gridMain: 0x00ff88,
        gridSub: 0x581c87,
        wallColor: 0xa855f7,
        floorColor: 0x0b071a,
        sporeColors: [0x00ff88, 0xa855f7, 0xa3e635],
        desc: 'Lush cybernetic botanical garden with bioluminescent spores.'
    },
    cosmic_space: {
        id: 'cosmic_space',
        name: 'Cosmic Space',
        fogColor: 0x04020a,
        ambientColor: 0x1e1b4b,
        dirLightColor: 0x38bdf8,
        gridMain: 0x38bdf8,
        gridSub: 0x4338ca,
        wallColor: 0x818cf8,
        floorColor: 0x030712,
        sporeColors: [0x38bdf8, 0x818cf8, 0xf43f5e],
        desc: 'The deep void of outer space surrounded by drifting star clusters.'
    },
    cyber_city: {
        id: 'cyber_city',
        name: 'Cyber City',
        fogColor: 0x080314,
        ambientColor: 0x4a044e,
        dirLightColor: 0xf43f5e,
        gridMain: 0xec4899,
        gridSub: 0x701a75,
        wallColor: 0x06b6d4,
        floorColor: 0x0f051d,
        sporeColors: [0xf43f5e, 0x06b6d4, 0xa855f7],
        desc: 'Futuristic synthwave megalopolis with vibrant pulse lines.'
    },
    lava_arena: {
        id: 'lava_arena',
        name: 'Lava Arena',
        fogColor: 0x140402,
        ambientColor: 0x450a0a,
        dirLightColor: 0xf97316,
        gridMain: 0xf97316,
        gridSub: 0x7c2d12,
        wallColor: 0xef4444,
        floorColor: 0x120302,
        sporeColors: [0xf97316, 0xef4444, 0xfacc15],
        desc: 'Obsidian arena suspended over molten volcanic rivers.'
    },
    frozen_world: {
        id: 'frozen_world',
        name: 'Frozen World',
        fogColor: 0x020b14,
        ambientColor: 0x0c4a6e,
        dirLightColor: 0x06b6d4,
        gridMain: 0x06b6d4,
        gridSub: 0x075985,
        wallColor: 0x38bdf8,
        floorColor: 0x02131d,
        sporeColors: [0x06b6d4, 0x38bdf8, 0xe0f2fe],
        desc: 'Glacial tundra with shimmering crystalline aurora skies.'
    }
};

const POWERUP_TYPES = {
    speed: {
        id: 'speed',
        name: 'Speed Boost',
        color: 0x38bdf8,
        icon: '⚡',
        baseDuration: 8,
        desc: 'Boosts speed & adds +50% bonus score per food!'
    },
    slow: {
        id: 'slow',
        name: 'Slow Time',
        color: 0xa855f7,
        icon: '⏳',
        baseDuration: 8,
        desc: 'Slows down time for ultra-precise maneuvering.'
    },
    shield: {
        id: 'shield',
        name: 'Energy Shield',
        color: 0x00ff88,
        icon: '🛡️',
        baseDuration: 12,
        desc: 'Absorbs one collision with walls or obstacles!'
    },
    multiplier: {
        id: 'multiplier',
        name: '2X Score',
        color: 0xfacc15,
        icon: '✨',
        baseDuration: 10,
        desc: 'Doubles all score gains while active!'
    },
    magnet: {
        id: 'magnet',
        name: 'Food Magnet',
        color: 0xec4899,
        icon: '🧲',
        baseDuration: 10,
        desc: 'Automatically draws nearby food towards the serpent!'
    },
    freeze: {
        id: 'freeze',
        name: 'Freeze Time',
        color: 0x06b6d4,
        icon: '❄️',
        baseDuration: 8,
        desc: 'Freezes moving obstacles in place.'
    }
};

const ACHIEVEMENTS_LIST = [
    { id: 'first_bite', title: 'First Bite', desc: 'Eat your first cyber-orb.', icon: '🍎' },
    { id: 'long_boy', title: 'Long Boy', desc: 'Reach a serpent length of 25.', icon: '🐍' },
    { id: 'speed_demon', title: 'Speed Demon', desc: 'Play on Insane difficulty or reach top speed.', icon: '⚡' },
    { id: 'collector_50', title: 'Orb Collector', desc: 'Eat 50 total foods across your career.', icon: '💎' },
    { id: 'collector_100', title: 'Master Collector', desc: 'Eat 100 total foods across your career.', icon: '👑' },
    { id: 'snake_master', title: 'Snake Master', desc: 'Score 500+ points in a single match.', icon: '🏆' },
    { id: 'survivor_pro', title: 'True Survivor', desc: 'Survive for 3 minutes without crashing.', icon: '⏱️' },
    { id: 'shield_hero', title: 'Shield Hero', desc: 'Survive an obstacle crash using an Energy Shield.', icon: '🛡️' },
    { id: 'power_junkie', title: 'Power Overwhelming', desc: 'Collect 4 power-ups in a single run.', icon: '✨' },
    { id: 'time_gladiator', title: 'Time Gladiator', desc: 'Score 250+ in Time Attack Mode.', icon: '⏳' },
    { id: 'daily_champion', title: 'Daily Champion', desc: 'Complete today\'s daily challenge.', icon: '📅' }
];

// Active Power-Up Manager
class PowerUpManager {
    constructor() {
        this.activePowerup = null; // { type, timeLeft, maxTime, interval }
    }

    activate(type, difficulty = 'normal', onExpireCallback = null) {
        const pData = POWERUP_TYPES[type];
        if (!pData) return null;

        const diffConfig = GAME_DIFFICULTIES[difficulty] || GAME_DIFFICULTIES.normal;
        const duration = Math.round(pData.baseDuration * diffConfig.powerupDurationMult);

        if (this.activePowerup && this.activePowerup.interval) {
            clearInterval(this.activePowerup.interval);
        }

        this.activePowerup = {
            type,
            data: pData,
            timeLeft: duration,
            maxTime: duration,
            onExpire: onExpireCallback
        };

        this.activePowerup.interval = setInterval(() => {
            if (!this.activePowerup) return;
            this.activePowerup.timeLeft -= 0.1;
            if (this.activePowerup.timeLeft <= 0) {
                this.deactivate();
            }
        }, 100);

        return this.activePowerup;
    }

    deactivate() {
        if (this.activePowerup) {
            if (this.activePowerup.interval) {
                clearInterval(this.activePowerup.interval);
            }
            if (this.activePowerup.onExpire) {
                this.activePowerup.onExpire(this.activePowerup.type);
            }
            this.activePowerup = null;
        }
    }

    has(type) {
        return Boolean(this.activePowerup && this.activePowerup.type === type && this.activePowerup.timeLeft > 0);
    }

    getActive() {
        return this.activePowerup;
    }
}
