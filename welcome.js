// 3D Welcome Landing Page - Three.js Neon Garden & Serpent (Hub System)

const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) || 
                 (window.innerWidth <= 768 && ('ontouchstart' in window || navigator.maxTouchPoints > 0));

let scene, camera, renderer, container;
let snakeSegments = [];
let snakePath = [];
const numSegments = isMobile ? 14 : 24;
const pathHistoryLength = numSegments * 6;
let foodItems = [];
let particlesMesh;
let mouseX = 0, mouseY = 0;
let targetMouseX = 0, targetMouseY = 0;
let clock;

// Pre-allocated reusable THREE objects
const _tempDir = new THREE.Vector3();
const _tempLookTarget = new THREE.Vector3();
let mouseLightRef = null;

function init3D() {
    container = document.getElementById('canvas-container');
    const width = window.innerWidth;
    const height = window.innerHeight;

    scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(0x07050f, isMobile ? 0.04 : 0.035);

    camera = new THREE.PerspectiveCamera(isMobile ? 65 : 60, width / height, 0.1, 1000);
    camera.position.set(0, isMobile ? 6 : 5, isMobile ? 22 : 20);
    camera.lookAt(0, 0, 0);

    renderer = new THREE.WebGLRenderer({ 
        antialias: !isMobile, 
        alpha: true,
        powerPreference: 'high-performance'
    });
    renderer.setSize(width, height);
    
    const pixelRatio = isMobile ? Math.min(window.devicePixelRatio, 1.25) : Math.min(window.devicePixelRatio, 2);
    renderer.setPixelRatio(pixelRatio);
    
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.2;
    container.appendChild(renderer.domElement);

    clock = new THREE.Clock();

    for (let i = 0; i < pathHistoryLength; i++) {
        snakePath.push(new THREE.Vector3(0, 0, 0));
    }

    const ambientLight = new THREE.AmbientLight(0x3b0764, isMobile ? 2.2 : 1.8);
    scene.add(ambientLight);

    const dirLight = new THREE.DirectionalLight(0x00ff88, isMobile ? 1.4 : 1.2);
    dirLight.position.set(10, 20, 15);
    scene.add(dirLight);

    if (!isMobile) {
        const purpleLight = new THREE.PointLight(0xa855f7, 3, 35);
        purpleLight.position.set(-12, 6, 5);
        scene.add(purpleLight);

        const limeLight = new THREE.PointLight(0xa3e635, 3, 35);
        limeLight.position.set(12, -4, 8);
        scene.add(limeLight);

        const mouseLight = new THREE.PointLight(0x38bdf8, 2, 25);
        mouseLight.name = 'mouseLight';
        scene.add(mouseLight);
        mouseLightRef = mouseLight;
    } else {
        const mobileAccentLight = new THREE.PointLight(0xa855f7, 3.5, 30);
        mobileAccentLight.position.set(0, 4, 6);
        scene.add(mobileAccentLight);
    }

    createNeonFloor();
    createPatrollingSnake();
    createFloatingFood();
    createSporeParticles();

    window.addEventListener('resize', onWindowResize, { passive: true });
    
    if (!isMobile) {
        window.addEventListener('mousemove', onMouseMove, { passive: true });
    } else {
        window.addEventListener('touchmove', onTouchMove, { passive: true });
    }

    animate();
}

function createNeonFloor() {
    const gridDivs = isMobile ? 20 : 40;
    const gridHelper = new THREE.GridHelper(60, gridDivs, 0x00ff88, 0x581c87);
    gridHelper.position.y = -6;
    gridHelper.material.opacity = 0.45;
    gridHelper.material.transparent = true;
    scene.add(gridHelper);

    const planeGeo = new THREE.PlaneGeometry(80, 80);
    const planeMat = new THREE.MeshStandardMaterial({
        color: 0x070512,
        roughness: isMobile ? 0.4 : 0.2,
        metalness: isMobile ? 0.6 : 0.8
    });
    const plane = new THREE.Mesh(planeGeo, planeMat);
    plane.rotation.x = -Math.PI / 2;
    plane.position.y = -6.05;
    scene.add(plane);
}

function createPatrollingSnake() {
    const currentSkinKey = storage.getSettings().skin || 'emerald';
    const skinData = SNAKE_SKINS[currentSkinKey] || SNAKE_SKINS.emerald;

    const headSegments = isMobile ? 14 : 32;
    const headGeo = new THREE.SphereGeometry(0.7, headSegments, headSegments);
    const headMat = new THREE.MeshStandardMaterial({
        color: skinData.headColor,
        emissive: skinData.headColor,
        emissiveIntensity: 0.4,
        roughness: 0.2,
        metalness: 0.8
    });
    const head = new THREE.Mesh(headGeo, headMat);

    const eyeSegments = isMobile ? 8 : 16;
    const eyeGeo = new THREE.SphereGeometry(0.16, eyeSegments, eyeSegments);
    const eyeMat = new THREE.MeshBasicMaterial({ color: skinData.eyeColor });
    
    const leftEye = new THREE.Mesh(eyeGeo, eyeMat);
    leftEye.position.set(0.35, 0.25, 0.5);
    head.add(leftEye);

    const rightEye = new THREE.Mesh(eyeGeo, eyeMat);
    rightEye.position.set(-0.35, 0.25, 0.5);
    head.add(rightEye);

    if (!isMobile) {
        const headLight = new THREE.PointLight(skinData.glow, 2, 12);
        head.add(headLight);
    }

    scene.add(head);
    snakeSegments.push(head);

    const bodySegments = isMobile ? 10 : 24;
    const bodyGeo = new THREE.SphereGeometry(0.55, bodySegments, bodySegments);
    for (let i = 1; i < numSegments; i++) {
        const ratio = i / numSegments;
        let color;
        if (skinData.isRainbow) {
            color = new THREE.Color().setHSL((i / numSegments + 0.2) % 1.0, 1.0, 0.5);
        } else {
            color = new THREE.Color().lerpColors(
                new THREE.Color(skinData.headColor),
                new THREE.Color(skinData.tailColor),
                ratio
            );
        }

        const bodyMat = new THREE.MeshStandardMaterial({
            color: color,
            emissive: color,
            emissiveIntensity: 0.25 * (1 - ratio * 0.5),
            roughness: 0.3,
            metalness: 0.7
        });
        const seg = new THREE.Mesh(bodyGeo, bodyMat);
        const scale = 1 - (ratio * 0.45);
        seg.scale.set(scale, scale, scale);
        scene.add(seg);
        snakeSegments.push(seg);
    }
}

function createFloatingFood() {
    const foods = isMobile ? [
        { pos: [-6, 2, 2], color: 0xf43f5e, ringColor: 0xa855f7 },
        { pos: [6, -1, 3], color: 0xa3e635, ringColor: 0xec4899 }
    ] : [
        { pos: [-7, 2, 2], color: 0xf43f5e, ringColor: 0xa855f7 },
        { pos: [8, -1, 4], color: 0x38bdf8, ringColor: 0x00ff88 },
        { pos: [0, 4, -3], color: 0xa3e635, ringColor: 0xec4899 }
    ];

    const torusTubular = isMobile ? 8 : 16;
    const torusRadial = isMobile ? 24 : 64;

    foods.forEach(f => {
        const group = new THREE.Group();
        group.position.set(...f.pos);

        const coreGeo = new THREE.OctahedronGeometry(0.65, 0);
        const coreMat = new THREE.MeshStandardMaterial({
            color: f.color,
            emissive: f.color,
            emissiveIntensity: 0.8,
            roughness: 0.1,
            metalness: 0.9
        });
        const core = new THREE.Mesh(coreGeo, coreMat);
        group.add(core);

        const ringGeo = new THREE.TorusGeometry(1.0, 0.04, torusTubular, torusRadial);
        const ringMat = new THREE.MeshBasicMaterial({ color: f.ringColor, transparent: true, opacity: 0.75 });
        const ring = new THREE.Mesh(ringGeo, ringMat);
        ring.rotation.x = Math.PI / 3;
        group.add(ring);

        if (!isMobile) {
            const light = new THREE.PointLight(f.color, 1.5, 10);
            group.add(light);
        }

        scene.add(group);
        foodItems.push({ group, core, ring, basePos: f.pos });
    });
}

function createSporeParticles() {
    const particleCount = isMobile ? 60 : 200;
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(particleCount * 3);
    const colors = new Float32Array(particleCount * 3);

    const col1 = new THREE.Color(0x00ff88);
    const col2 = new THREE.Color(0xa855f7);
    const col3 = new THREE.Color(0xa3e635);
    const tempCol = new THREE.Color();

    for (let i = 0; i < particleCount; i++) {
        positions[i * 3] = (Math.random() - 0.5) * 50;
        positions[i * 3 + 1] = (Math.random() - 0.5) * 30;
        positions[i * 3 + 2] = (Math.random() - 0.5) * 40;

        const rand = Math.random();
        if (rand < 0.4) tempCol.copy(col1);
        else if (rand < 0.75) tempCol.copy(col2);
        else tempCol.copy(col3);

        colors[i * 3] = tempCol.r;
        colors[i * 3 + 1] = tempCol.g;
        colors[i * 3 + 2] = tempCol.b;
    }

    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

    const material = new THREE.PointsMaterial({
        size: isMobile ? 0.22 : 0.18,
        vertexColors: true,
        transparent: true,
        opacity: 0.7,
        blending: THREE.AdditiveBlending
    });

    particlesMesh = new THREE.Points(geometry, material);
    scene.add(particlesMesh);
}

function onWindowResize() {
    const width = window.innerWidth;
    const height = window.innerHeight;
    camera.aspect = width / height;
    camera.fov = (width < 768) ? 65 : 60;
    camera.updateProjectionMatrix();
    renderer.setSize(width, height);
}

function onMouseMove(event) {
    targetMouseX = (event.clientX / window.innerWidth - 0.5) * 2;
    targetMouseY = (event.clientY / window.innerHeight - 0.5) * 2;
}

function onTouchMove(event) {
    if (event.touches.length > 0) {
        targetMouseX = (event.touches[0].clientX / window.innerWidth - 0.5) * 1.5;
        targetMouseY = (event.touches[0].clientY / window.innerHeight - 0.5) * 1.5;
    }
}

function animate() {
    requestAnimationFrame(animate);

    const delta = clock.getDelta();
    const elapsedTime = clock.getElapsedTime();

    mouseX += (targetMouseX - mouseX) * 0.05;
    mouseY += (targetMouseY - mouseY) * 0.05;

    camera.position.x = mouseX * (isMobile ? 1.5 : 3);
    camera.position.y = (isMobile ? 6 : 5) - mouseY * (isMobile ? 1.2 : 2);
    camera.lookAt(0, 0, 0);

    if (mouseLightRef) {
        mouseLightRef.position.set(mouseX * 15, -mouseY * 10 + 2, 8);
    }

    const t = elapsedTime * 0.85;
    const leadX = Math.sin(t) * 9 + Math.cos(t * 0.5) * 3;
    const leadY = Math.sin(t * 1.5) * 2.5 + Math.cos(t * 0.7) * 1.2;
    const leadZ = Math.cos(t) * 6;

    for (let i = pathHistoryLength - 1; i > 0; i--) {
        snakePath[i].copy(snakePath[i - 1]);
    }
    snakePath[0].set(leadX, leadY, leadZ);

    const stepInterval = isMobile ? 4 : 5;
    for (let idx = 0; idx < snakeSegments.length; idx++) {
        const seg = snakeSegments[idx];
        const pathIndex = Math.min(idx * stepInterval, pathHistoryLength - 1);
        seg.position.copy(snakePath[pathIndex]);

        if (idx === 0) {
            _tempDir.subVectors(snakePath[0], snakePath[1]).normalize();
            _tempLookTarget.addVectors(seg.position, _tempDir);
            seg.lookAt(_tempLookTarget);
        }
    }

    for (let idx = 0; idx < foodItems.length; idx++) {
        const f = foodItems[idx];
        const offset = idx * 2.1;
        f.group.position.y = f.basePos[1] + Math.sin(elapsedTime * 2 + offset) * 0.6;
        f.core.rotation.x += 0.015;
        f.core.rotation.y += 0.02;
        f.ring.rotation.z += 0.025;
    }

    if (particlesMesh) {
        const positions = particlesMesh.geometry.attributes.position.array;
        const len = positions.length;
        const speed = delta * 0.6;
        for (let i = 1; i < len; i += 3) {
            positions[i] += speed;
            if (positions[i] > 15) {
                positions[i] = -15;
            }
        }
        particlesMesh.geometry.attributes.position.needsUpdate = true;
        particlesMesh.rotation.y = elapsedTime * 0.02;
    }

    renderer.render(scene, camera);
}

// ----------------------------------------------------
// UI, MODALS & PROGRESSION HUB
// ----------------------------------------------------
document.addEventListener('DOMContentLoaded', () => {
    init3D();

    function updateHubChips() {
        const settings = storage.getSettings();
        const modeData = GAME_MODES[settings.mode] || GAME_MODES.classic;
        const diffData = GAME_DIFFICULTIES[settings.difficulty] || GAME_DIFFICULTIES.normal;
        const skinData = SNAKE_SKINS[settings.skin] || SNAKE_SKINS.emerald;
        const worldData = WORLDS[settings.world] || WORLDS.neon_garden;

        const modeChip = document.getElementById('chip-mode');
        const diffChip = document.getElementById('chip-diff');
        const skinChip = document.getElementById('chip-skin');
        const worldChip = document.getElementById('chip-world');

        if (modeChip) modeChip.innerHTML = `${modeData.icon} Mode: <strong>${modeData.name}</strong>`;
        if (diffChip) diffChip.innerHTML = `⚡ Difficulty: <strong>${diffData.name}</strong>`;
        if (skinChip) skinChip.innerHTML = `${skinData.icon} Skin: <strong>${skinData.name}</strong>`;
        if (worldChip) worldChip.innerHTML = `🌍 World: <strong>${worldData.name}</strong>`;

        const highScoreEl = document.getElementById('high-score-val');
        if (highScoreEl) highScoreEl.innerText = storage.getHighScore(settings.mode);
    }
    updateHubChips();

    // Sound UI
    const soundToggle = document.getElementById('sound-toggle');
    const soundIcon = document.getElementById('sound-icon');
    
    function updateSoundUI() {
        if (!soundIcon) return;
        if (sounds.isMuted) {
            soundIcon.innerHTML = '<path d="M11 5L6 9H2V15H6L11 19V5Z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><line x1="23" y1="9" x2="17" y2="15" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><line x1="17" y1="9" x2="23" y2="15" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>';
        } else {
            soundIcon.innerHTML = '<path d="M11 5L6 9H2V15H6L11 19V5Z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>';
        }
    }
    updateSoundUI();

    if (soundToggle) {
        soundToggle.addEventListener('click', (e) => {
            e.preventDefault();
            sounds.toggleMute();
            updateSoundUI();
            sounds.playClick();
        });
    }

    // Generic Modal Management
    const modalBackdrop = document.getElementById('hub-modal');
    const modalTitle = document.getElementById('modal-title');
    const modalBody = document.getElementById('modal-content');
    const modalClose = document.getElementById('modal-close');

    function openModal(title, contentHTML) {
        if (modalTitle) modalTitle.innerHTML = title;
        if (modalBody) modalBody.innerHTML = contentHTML;
        if (modalBackdrop) modalBackdrop.classList.add('active');
        sounds.playClick();
    }

    function closeModal() {
        if (modalBackdrop) modalBackdrop.classList.remove('active');
        sounds.playClick();
        updateHubChips();
    }

    if (modalClose) modalClose.addEventListener('click', closeModal);
    if (modalBackdrop) {
        modalBackdrop.addEventListener('click', (e) => {
            if (e.target === modalBackdrop) closeModal();
        });
    }

    // 1. GAME MODES MODAL
    function openModesModal() {
        const currentMode = storage.getSettings().mode;
        let html = '<div class="selection-grid">';
        Object.values(GAME_MODES).forEach(m => {
            const isActive = m.id === currentMode ? 'active' : '';
            html += `
                <div class="select-card ${isActive}" data-mode="${m.id}">
                    <div class="select-card-header">
                        <span class="select-card-title">${m.icon} ${m.name}</span>
                        ${isActive ? '<span style="color: #00ff88; font-size: 0.8rem;">● SELECTED</span>' : ''}
                    </div>
                    <p class="select-card-desc">${m.desc}</p>
                </div>
            `;
        });
        html += '</div>';
        openModal('🎮 SELECT GAME MODE', html);

        modalBody.querySelectorAll('.select-card').forEach(card => {
            card.addEventListener('click', () => {
                const mode = card.getAttribute('data-mode');
                storage.saveSettings({ mode });
                closeModal();
            });
        });
    }

    // 2. DIFFICULTY MODAL
    function openDifficultyModal() {
        const currentDiff = storage.getSettings().difficulty;
        let html = '<div class="selection-grid">';
        Object.values(GAME_DIFFICULTIES).forEach(d => {
            const isActive = d.id === currentDiff ? 'active' : '';
            html += `
                <div class="select-card ${isActive}" data-diff="${d.id}">
                    <div class="select-card-header">
                        <span class="select-card-title">⚡ ${d.name}</span>
                        ${isActive ? '<span style="color: #00ff88; font-size: 0.8rem;">● ACTIVE</span>' : ''}
                    </div>
                    <p class="select-card-desc">${d.desc}</p>
                </div>
            `;
        });
        html += '</div>';
        openModal('⚡ SELECT DIFFICULTY', html);

        modalBody.querySelectorAll('.select-card').forEach(card => {
            card.addEventListener('click', () => {
                const difficulty = card.getAttribute('data-diff');
                storage.saveSettings({ difficulty });
                closeModal();
            });
        });
    }

    // 3. SNAKE SKINS MODAL
    function openSkinsModal() {
        const currentSkin = storage.getSettings().skin;
        let html = '<div class="selection-grid">';
        Object.values(SNAKE_SKINS).forEach(s => {
            const isActive = s.id === currentSkin ? 'active' : '';
            html += `
                <div class="select-card ${isActive}" data-skin="${s.id}">
                    <div class="select-card-header">
                        <span class="select-card-title">${s.icon} ${s.name}</span>
                        ${isActive ? '<span style="color: #00ff88; font-size: 0.8rem;">● EQUIPPED</span>' : ''}
                    </div>
                    <p class="select-card-desc">${s.desc}</p>
                </div>
            `;
        });
        html += '</div>';
        openModal('🐍 SELECT SNAKE SKIN', html);

        modalBody.querySelectorAll('.select-card').forEach(card => {
            card.addEventListener('click', () => {
                const skin = card.getAttribute('data-skin');
                storage.saveSettings({ skin });
                closeModal();
                // Reload 3D scene snake to reflect skin
                location.reload();
            });
        });
    }

    // 4. 3D WORLDS MODAL
    function openWorldsModal() {
        const currentWorld = storage.getSettings().world;
        let html = '<div class="selection-grid">';
        Object.values(WORLDS).forEach(w => {
            const isActive = w.id === currentWorld ? 'active' : '';
            html += `
                <div class="select-card ${isActive}" data-world="${w.id}">
                    <div class="select-card-header">
                        <span class="select-card-title">🌍 ${w.name}</span>
                        ${isActive ? '<span style="color: #00ff88; font-size: 0.8rem;">● ACTIVE</span>' : ''}
                    </div>
                    <p class="select-card-desc">${w.desc}</p>
                </div>
            `;
        });
        html += '</div>';
        openModal('🌍 SELECT 3D WORLD', html);

        modalBody.querySelectorAll('.select-card').forEach(card => {
            card.addEventListener('click', () => {
                const world = card.getAttribute('data-world');
                storage.saveSettings({ world });
                closeModal();
            });
        });
    }

    // 5. ACHIEVEMENTS MODAL
    function openAchievementsModal() {
        const unlocked = storage.getAchievements();
        let html = '<div class="achievements-grid">';
        ACHIEVEMENTS_LIST.forEach(a => {
            const isUnlocked = !!unlocked[a.id];
            html += `
                <div class="achievement-row ${isUnlocked ? 'unlocked' : ''}">
                    <div class="achievement-icon">${a.icon}</div>
                    <div class="achievement-info">
                        <div class="achievement-title">${a.title} ${isUnlocked ? '✓' : '🔒'}</div>
                        <div class="achievement-desc">${a.desc}</div>
                    </div>
                </div>
            `;
        });
        html += '</div>';
        openModal('🏆 ACHIEVEMENTS', html);
    }

    // 6. STATISTICS MODAL
    function openStatsModal() {
        const stats = storage.getStats();
        const mins = String(Math.floor((stats.bestTime || 0) / 60)).padStart(2, '0');
        const secs = String((stats.bestTime || 0) % 60).padStart(2, '0');
        const unlockedCount = Object.keys(storage.getAchievements()).length;

        let html = `
            <div class="stats-grid">
                <div class="stat-box">
                    <div class="stat-box-label">Total Games</div>
                    <div class="stat-box-value">${stats.totalGames || 0}</div>
                </div>
                <div class="stat-box">
                    <div class="stat-box-label">Food Collected</div>
                    <div class="stat-box-value">${stats.totalFoodEaten || 0}</div>
                </div>
                <div class="stat-box">
                    <div class="stat-box-label">Longest Serpent</div>
                    <div class="stat-box-value">${stats.longestSnake || 3}</div>
                </div>
                <div class="stat-box">
                    <div class="stat-box-label">Best Time</div>
                    <div class="stat-box-value">${mins}:${secs}</div>
                </div>
                <div class="stat-box">
                    <div class="stat-box-label">Power-Ups Found</div>
                    <div class="stat-box-value">${stats.totalPowerups || 0}</div>
                </div>
                <div class="stat-box">
                    <div class="stat-box-label">Achievements</div>
                    <div class="stat-box-value">${unlockedCount} / ${ACHIEVEMENTS_LIST.length}</div>
                </div>
            </div>
        `;
        openModal('📊 PLAYER STATISTICS', html);
    }

    // 7. DAILY CHALLENGE MODAL
    function openDailyModal() {
        const daily = storage.checkDailyChallenge();
        const pct = Math.min(100, Math.round((daily.progress / daily.target) * 100));
        let html = `
            <div class="daily-card">
                <div style="font-size: 2.2rem; margin-bottom: 0.5rem;">${daily.icon || '📅'}</div>
                <h3 style="font-family: Orbitron; color: #00ff88; margin-bottom: 0.5rem;">TODAY'S MISSION</h3>
                <p style="color: #e2e8f0; font-size: 0.95rem; margin-bottom: 1rem;">${daily.desc}</p>
                <div class="daily-progress-bar">
                    <div class="daily-progress-fill" style="width: ${pct}%;"></div>
                </div>
                <div style="display: flex; justify-content: space-between; font-family: Orbitron; font-size: 0.85rem; color: #94a3b8;">
                    <span>Progress: ${daily.progress} / ${daily.target}</span>
                    <span style="color: ${daily.completed ? '#00ff88' : '#facc15'};">${daily.completed ? 'COMPLETED ✓' : `${pct}%`}</span>
                </div>
            </div>
        `;
        openModal('📅 DAILY CHALLENGE', html);
    }

    // 8. HOW TO PLAY MODAL
    function openHowToModal() {
        let html = `
            <ul style="list-style: none; display: flex; flex-direction: column; gap: 0.85rem;">
                <li style="display: flex; gap: 0.75rem; align-items: flex-start; color: #cbd5e1; font-size: 0.9rem;">
                    <span>🧭</span>
                    <div><strong>Controls:</strong> Use <strong>Arrow Keys / WASD</strong> on desktop, or tap the <strong>Touch D-Pad</strong> / <strong>Swipe</strong> on mobile.</div>
                </li>
                <li style="display: flex; gap: 0.75rem; align-items: flex-start; color: #cbd5e1; font-size: 0.9rem;">
                    <span>💎</span>
                    <div><strong>Food & Score:</strong> Devour glowing cyber-orbs (+10 pts) to grow length and speed.</div>
                </li>
                <li style="display: flex; gap: 0.75rem; align-items: flex-start; color: #cbd5e1; font-size: 0.9rem;">
                    <span>✨</span>
                    <div><strong>Power-Ups:</strong> Collect ⚡ Speed, ⏳ Slow, 🛡️ Shield, ✨ 2X Score, 🧲 Magnet, and ❄️ Freeze!</div>
                </li>
                <li style="display: flex; gap: 0.75rem; align-items: flex-start; color: #cbd5e1; font-size: 0.9rem;">
                    <span>⚠️</span>
                    <div><strong>Obstacles:</strong> Avoid colliding with perimeter walls & 3D cyber barriers (or use an Energy Shield!).</div>
                </li>
            </ul>
        `;
        openModal('❓ HOW TO PLAY', html);
    }

    // Bind Hub Buttons
    document.getElementById('btn-hub-modes')?.addEventListener('click', openModesModal);
    document.getElementById('btn-hub-diff')?.addEventListener('click', openDifficultyModal);
    document.getElementById('btn-hub-skins')?.addEventListener('click', openSkinsModal);
    document.getElementById('btn-hub-worlds')?.addEventListener('click', openWorldsModal);
    document.getElementById('btn-hub-achievements')?.addEventListener('click', openAchievementsModal);
    document.getElementById('btn-hub-stats')?.addEventListener('click', openStatsModal);
    document.getElementById('btn-hub-daily')?.addEventListener('click', openDailyModal);
    document.getElementById('btn-hub-howto')?.addEventListener('click', openHowToModal);
    document.getElementById('info-toggle')?.addEventListener('click', openHowToModal);

    // Bind Chips
    document.getElementById('chip-mode')?.addEventListener('click', openModesModal);
    document.getElementById('chip-diff')?.addEventListener('click', openDifficultyModal);
    document.getElementById('chip-skin')?.addEventListener('click', openSkinsModal);
    document.getElementById('chip-world')?.addEventListener('click', openWorldsModal);

    // Start Game Button Animation & Navigation
    const startBtn = document.getElementById('start-game-btn');
    if (startBtn) {
        startBtn.addEventListener('mouseenter', () => sounds.playHover());
        startBtn.addEventListener('click', (e) => {
            e.preventDefault();
            sounds.playEat();
            
            document.body.style.transition = 'transform 0.4s ease-in, opacity 0.4s ease-in';
            document.body.style.transform = 'scale(1.06)';
            document.body.style.opacity = '0';

            setTimeout(() => {
                window.location.href = 'game.html';
            }, 380);
        });
    }

    if (!isMobile) {
        document.querySelectorAll('.hub-btn, .icon-btn, .config-chip').forEach(elem => {
            elem.addEventListener('mouseenter', () => sounds.playHover(), { passive: true });
        });
    }
});
