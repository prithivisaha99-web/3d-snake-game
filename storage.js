// Unified Storage & Progression Manager for 3D Snake Game

class GameStorage {
    constructor() {
        this.defaults = {
            selectedSkin: 'emerald',
            selectedWorld: 'neon_garden',
            selectedMode: 'classic',
            selectedDifficulty: 'normal',
            isSoundMuted: false,
            highScores: {
                classic: 0,
                time_attack: 0,
                survival: 0,
                zen: 0
            },
            stats: {
                totalGames: 0,
                totalFoodEaten: 0,
                longestSnake: 3,
                bestTime: 0,
                totalPowerups: 0,
                highestDifficulty: 'normal',
                favoriteSkin: 'emerald',
                favoriteMode: 'classic'
            },
            achievements: {},
            dailyChallenge: {
                date: '',
                type: 'eat_food',
                target: 20,
                progress: 0,
                completed: false,
                desc: 'Eat 20 foods today!'
            }
        };
        this.init();
    }

    init() {
        this.checkDailyChallenge();
    }

    getItem(key, fallback = null) {
        try {
            const data = localStorage.getItem(`snake_${key}`);
            return data !== null ? JSON.parse(data) : fallback;
        } catch (e) {
            return fallback;
        }
    }

    setItem(key, value) {
        try {
            localStorage.setItem(`snake_${key}`, JSON.stringify(value));
        } catch (e) {}
    }

    // Settings
    getSettings() {
        return {
            skin: this.getItem('skin', this.defaults.selectedSkin),
            world: this.getItem('world', this.defaults.selectedWorld),
            mode: this.getItem('mode', this.defaults.selectedMode),
            difficulty: this.getItem('difficulty', this.defaults.selectedDifficulty),
            soundMuted: this.getItem('soundMuted', this.defaults.isSoundMuted)
        };
    }

    saveSettings(settings) {
        if (settings.skin) this.setItem('skin', settings.skin);
        if (settings.world) this.setItem('world', settings.world);
        if (settings.mode) this.setItem('mode', settings.mode);
        if (settings.difficulty) this.setItem('difficulty', settings.difficulty);
        if (settings.soundMuted !== undefined) this.setItem('soundMuted', settings.soundMuted);
    }

    // High Scores by Mode
    getHighScore(mode = 'classic') {
        const scores = this.getItem('highScores', this.defaults.highScores);
        // Also support legacy key
        const legacyScore = Number(localStorage.getItem('snakeHighScore')) || 0;
        if (legacyScore > (scores.classic || 0)) {
            scores.classic = legacyScore;
            this.setItem('highScores', scores);
        }
        return scores[mode] || 0;
    }

    saveHighScore(mode, score) {
        const scores = this.getItem('highScores', this.defaults.highScores);
        if (score > (scores[mode] || 0)) {
            scores[mode] = score;
            this.setItem('highScores', scores);
            if (mode === 'classic') {
                try { localStorage.setItem('snakeHighScore', String(score)); } catch (e) {}
            }
            return true; // New record!
        }
        return false;
    }

    // Stats
    getStats() {
        return this.getItem('stats', this.defaults.stats);
    }

    updateStats(gameSummary) {
        const stats = this.getStats();
        stats.totalGames = (stats.totalGames || 0) + 1;
        stats.totalFoodEaten = (stats.totalFoodEaten || 0) + (gameSummary.foodEaten || 0);
        stats.totalPowerups = (stats.totalPowerups || 0) + (gameSummary.powerupsCollected || 0);

        if ((gameSummary.snakeLength || 0) > (stats.longestSnake || 3)) {
            stats.longestSnake = gameSummary.snakeLength;
        }

        if ((gameSummary.seconds || 0) > (stats.bestTime || 0)) {
            stats.bestTime = gameSummary.seconds;
        }

        stats.favoriteSkin = gameSummary.skin || stats.favoriteSkin || 'emerald';
        stats.favoriteMode = gameSummary.mode || stats.favoriteMode || 'classic';
        stats.highestDifficulty = gameSummary.difficulty || stats.highestDifficulty || 'normal';

        this.setItem('stats', stats);
        return stats;
    }

    // Achievements
    getAchievements() {
        return this.getItem('achievements', {});
    }

    unlockAchievement(id, title, desc, icon = '🏆') {
        const achievements = this.getAchievements();
        if (!achievements[id]) {
            achievements[id] = {
                id,
                title,
                desc,
                icon,
                unlockedAt: new Date().toISOString()
            };
            this.setItem('achievements', achievements);
            return achievements[id];
        }
        return null;
    }

    isAchievementUnlocked(id) {
        const achievements = this.getAchievements();
        return Boolean(achievements && achievements[id]);
    }

    // Daily Challenge
    getTodayDateString() {
        const d = new Date();
        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    }

    checkDailyChallenge() {
        const today = this.getTodayDateString();
        let challenge = this.getItem('dailyChallenge', null);

        if (!challenge || challenge.date !== today) {
            // Deterministic daily challenge based on day-of-year hash
            const dayNum = Math.floor((new Date() - new Date(new Date().getFullYear(), 0, 0)) / 1000 / 60 / 60 / 24);
            const challengePool = [
                { type: 'eat_food', target: 20, desc: 'Eat 20 cyber-orbs in any mode', icon: '💎' },
                { type: 'score_points', target: 300, desc: 'Score 300 points in a single round', icon: '⚡' },
                { type: 'survive_time', target: 90, desc: 'Survive for 90 seconds', icon: '⏱️' },
                { type: 'reach_length', target: 20, desc: 'Grow serpent to length 20', icon: '🐍' },
                { type: 'collect_powerups', target: 4, desc: 'Collect 4 power-ups in one match', icon: '✨' },
                { type: 'play_survival', target: 150, desc: 'Score 150 points in Survival Mode', icon: '🛡️' }
            ];

            const template = challengePool[dayNum % challengePool.length];
            challenge = {
                date: today,
                type: template.type,
                target: template.target,
                desc: template.desc,
                icon: template.icon,
                progress: 0,
                completed: false
            };
            this.setItem('dailyChallenge', challenge);
        }
        return challenge;
    }

    getDailyChallenge() {
        return this.checkDailyChallenge();
    }

    updateDailyProgress(type, amount = 1) {
        const challenge = this.checkDailyChallenge();
        if (challenge.completed) return false;

        if (challenge.type === type) {
            challenge.progress = Math.min(challenge.target, (challenge.progress || 0) + amount);
            if (challenge.progress >= challenge.target) {
                challenge.completed = true;
                this.unlockAchievement('daily_champion', 'Daily Champion', 'Completed today\'s daily challenge!', '📅');
            }
            this.setItem('dailyChallenge', challenge);
            return challenge;
        }
        return false;
    }

    updateDailyChallenge(type, amount = 1) {
        return this.updateDailyProgress(type, amount);
    }
}

const storage = new GameStorage();
