// 3D Snake Game Engine (Three.js + Preserved Core Logic + Mobile Performance Engine)

// Device & Performance Detection
const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) || 
                 (window.innerWidth <= 768 && ('ontouchstart' in window || navigator.maxTouchPoints > 0));

// GAME GRID SETTINGS
const GRID_ROWS = 20;
const GRID_COLS = 20;
const CELL_SIZE = 1.6; // 3D world units per grid cell
const BASE_TICK_RATE = 170; // ms per move
const MIN_TICK_RATE = 90;   // fastest speed cap
const SCORE_PER_FOOD = 10;

// GAME STATE
let snake = [];           // snake[0] is head {x: row, y: col}
let food = null;          // {x: row, y: col}
let direction = 'right';
let directionQueue = [];
let score = 0;
let seconds = 0;
let isPlaying = false;
let isPaused = false;
let gameLoop = null;
let timeLoop = null;
let currentTickRate = BASE_TICK_RATE;
let highScore = loadHighScore();
let isNewHighScore = false;

const oppositeDirection = {
    right: 'left',
    left: 'right',
    up: 'down',
    down: 'up'
};

// THREE.JS SCENE OBJECTS
let scene, camera, renderer, clock;
let snakeMeshes = [];
let foodGroup = null;
let foodCore = null;
let foodRing = null;
let foodLight = null;
let arenaGroup = null;
let particleBursts = [];
let ambientSporeMesh = null;
let cameraShake = 0;

// Pre-computed 20x20 Grid World Coordinates Cache (Zero runtime object creation)
const gridWorldCoords = [];

// Pre-allocated reusable THREE objects for zero-GC animation loop
const _tempScreenVec = new THREE.Vector3();
const _tempTargetVec = new THREE.Vector3();

// DOM ELEMENTS
let scoreEl, highScoreEl, timeEl, speedEl;
let lengthEl, finalLengthEl, finalTimeEl;
let gameOverModal, gameOverReasonEl, finalScoreEl, bestScoreEl, newRecordBadge;
let pauseModal, restartBtn, playAgainBtn, pauseToggleBtn, soundToggleBtn, soundIcon;
let dpadUp, dpadDown, dpadLeft, dpadRight;
let popupsContainer;

// ----------------------------------------------------
// HIGH SCORE STORAGE
// ----------------------------------------------------
function loadHighScore() {
    try {
        return Number(localStorage.getItem('snakeHighScore')) || 0;
    } catch (e) {
        return 0;
    }
}

function saveHighScore() {
    if (highScoreEl) highScoreEl.innerText = highScore;
    try {
        localStorage.setItem('snakeHighScore', String(highScore));
    } catch (e) {}
}

// ----------------------------------------------------
// PRE-COMPUTE GRID COORDINATES
// ----------------------------------------------------
function precomputeGridCoords() {
    const halfWidth = (GRID_COLS * CELL_SIZE) / 2;
    const halfHeight = (GRID_ROWS * CELL_SIZE) / 2;
    
    for (let r = 0; r < GRID_ROWS; r++) {
        gridWorldCoords[r] = [];
        for (let c = 0; c < GRID_COLS; c++) {
            const x = (c * CELL_SIZE) - halfWidth + (CELL_SIZE / 2);
            const z = (r * CELL_SIZE) - halfHeight + (CELL_SIZE / 2);
            gridWorldCoords[r][c] = new THREE.Vector3(x, 0.6, z);
        }
    }
}

function gridToWorld(r, c) {
    if (gridWorldCoords[r] && gridWorldCoords[r][c]) {
        return gridWorldCoords[r][c];
    }
    const halfWidth = (GRID_COLS * CELL_SIZE) / 2;
    const halfHeight = (GRID_ROWS * CELL_SIZE) / 2;
    return new THREE.Vector3((c * CELL_SIZE) - halfWidth + (CELL_SIZE / 2), 0.6, (r * CELL_SIZE) - halfHeight + (CELL_SIZE / 2));
}

// ----------------------------------------------------
// THREE.JS 3D INITIALIZATION (PERFORMANCE TUNED)
// ----------------------------------------------------
function initThree() {
    const container = document.getElementById('game-canvas-container');
    const width = window.innerWidth;
    const height = window.innerHeight;

    precomputeGridCoords();

    scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(0x07050f, isMobile ? 0.03 : 0.025);

    camera = new THREE.PerspectiveCamera(50, width / height, 0.1, 1000);
    updateCameraFraming(width, height);

    renderer = new THREE.WebGLRenderer({ 
        antialias: !isMobile, 
        alpha: true, 
        powerPreference: 'high-performance' 
    });
    renderer.setSize(width, height);
    
    // Set optimal pixel ratio
    const pixelRatio = isMobile ? Math.min(window.devicePixelRatio, 1.25) : Math.min(window.devicePixelRatio, 2.0);
    renderer.setPixelRatio(pixelRatio);

    // Shadows: Enabled on Desktop, Disabled on Mobile for optimal FPS
    if (!isMobile) {
        renderer.shadowMap.enabled = true;
        renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    } else {
        renderer.shadowMap.enabled = false;
    }

    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.25;
    container.appendChild(renderer.domElement);

    clock = new THREE.Clock();

    // Lighting
    const ambientLight = new THREE.AmbientLight(0x280e45, isMobile ? 1.6 : 1.4);
    scene.add(ambientLight);

    const dirLight = new THREE.DirectionalLight(0x00ff88, isMobile ? 1.2 : 1.1);
    dirLight.position.set(15, 30, 20);
    
    if (!isMobile) {
        dirLight.castShadow = true;
        dirLight.shadow.mapSize.width = 1024;
        dirLight.shadow.mapSize.height = 1024;
        dirLight.shadow.camera.near = 10;
        dirLight.shadow.camera.far = 60;
        dirLight.shadow.camera.left = -20;
        dirLight.shadow.camera.right = 20;
        dirLight.shadow.camera.top = 20;
        dirLight.shadow.camera.bottom = -20;
    }
    scene.add(dirLight);

    if (!isMobile) {
        const purpleLight = new THREE.PointLight(0xa855f7, 2.5, 45);
        purpleLight.position.set(-15, 12, 10);
        scene.add(purpleLight);

        const cyanLight = new THREE.PointLight(0x06b6d4, 2.0, 40);
        cyanLight.position.set(15, 12, -10);
        scene.add(cyanLight);
    } else {
        const centerLight = new THREE.PointLight(0xa855f7, 2.0, 35);
        centerLight.position.set(0, 10, 0);
        scene.add(centerLight);
    }

    // Build 3D Arena & Grid
    build3DArena();

    // Build Ambient Spores
    buildSporeParticles();

    // Resize listener
    window.addEventListener('resize', onWindowResize, { passive: true });

    // Touch Swipe Controls on Mobile
    setupTouchSwipe();

    // Render loop
    animate3D();
}

function updateCameraFraming(width, height) {
    const aspect = width / height;
    if (aspect < 0.6) {
        // Ultra tall/narrow phone portrait (e.g. 390x844, 412x915, 320x568)
        camera.fov = 64;
        camera.position.set(0, 43, 28);
        camera.lookAt(0, -5, 2);
    } else if (aspect < 0.8) {
        // Standard phone portrait
        camera.fov = 58;
        camera.position.set(0, 39, 28);
        camera.lookAt(0, -4, 2);
    } else if (aspect < 1.2) {
        // Tablet / Square screen
        camera.fov = 52;
        camera.position.set(0, 36, 28);
        camera.lookAt(0, -2, 0);
    } else {
        // Desktop / Landscape
        camera.fov = 50;
        camera.position.set(0, 32, 28);
        camera.lookAt(0, -2, 0);
    }
    camera.aspect = aspect;
    camera.updateProjectionMatrix();
}

function build3DArena() {
    arenaGroup = new THREE.Group();

    const arenaWidth = GRID_COLS * CELL_SIZE;
    const arenaHeight = GRID_ROWS * CELL_SIZE;

    // Grid Floor
    const gridDivs = isMobile ? 10 : GRID_COLS;
    const gridHelper = new THREE.GridHelper(arenaWidth, gridDivs, 0x00ff88, 0x581c87);
    gridHelper.position.y = 0.05;
    arenaGroup.add(gridHelper);

    // Reflective Floor Plane
    const floorGeo = new THREE.PlaneGeometry(arenaWidth, arenaHeight);
    const floorMat = new THREE.MeshStandardMaterial({
        color: 0x080514,
        roughness: isMobile ? 0.5 : 0.35,
        metalness: isMobile ? 0.4 : 0.6
    });
    const floorMesh = new THREE.Mesh(floorGeo, floorMat);
    floorMesh.rotation.x = -Math.PI / 2;
    if (!isMobile) floorMesh.receiveShadow = true;
    arenaGroup.add(floorMesh);

    // Neon Perimeter Fence / Borders
    const wallMat = new THREE.MeshStandardMaterial({
        color: 0x7c3aed,
        emissive: 0x6d28d9,
        emissiveIntensity: 0.5,
        roughness: 0.3,
        metalness: 0.7
    });

    const wallHeight = 0.8;
    const wallThick = 0.35;

    // Top & Bottom Walls
    const tbGeo = new THREE.BoxGeometry(arenaWidth + wallThick * 2, wallHeight, wallThick);
    const topWall = new THREE.Mesh(tbGeo, wallMat);
    topWall.position.set(0, wallHeight / 2, -(arenaHeight / 2) - (wallThick / 2));
    arenaGroup.add(topWall);

    const bottomWall = new THREE.Mesh(tbGeo, wallMat);
    bottomWall.position.set(0, wallHeight / 2, (arenaHeight / 2) + (wallThick / 2));
    arenaGroup.add(bottomWall);

    // Left & Right Walls
    const lrGeo = new THREE.BoxGeometry(wallThick, wallHeight, arenaHeight);
    const leftWall = new THREE.Mesh(lrGeo, wallMat);
    leftWall.position.set(-(arenaWidth / 2) - (wallThick / 2), wallHeight / 2, 0);
    arenaGroup.add(leftWall);

    const rightWall = new THREE.Mesh(lrGeo, wallMat);
    rightWall.position.set((arenaWidth / 2) + (wallThick / 2), wallHeight / 2, 0);
    arenaGroup.add(rightWall);

    // Corner Pylons
    const pylonRadial = isMobile ? 8 : 16;
    const pylonGeo = new THREE.CylinderGeometry(0.5, 0.5, 2.2, pylonRadial);
    const pylonMat = new THREE.MeshStandardMaterial({
        color: 0x00ff88,
        emissive: 0x00ff88,
        emissiveIntensity: 0.7
    });

    const corners = [
        [-arenaWidth / 2, -arenaHeight / 2],
        [arenaWidth / 2, -arenaHeight / 2],
        [-arenaWidth / 2, arenaHeight / 2],
        [arenaWidth / 2, arenaHeight / 2]
    ];

    corners.forEach(([cx, cz]) => {
        const pylon = new THREE.Mesh(pylonGeo, pylonMat);
        pylon.position.set(cx, 1.1, cz);
        arenaGroup.add(pylon);

        if (!isMobile) {
            const pylonLight = new THREE.PointLight(0x00ff88, 1.2, 8);
            pylonLight.position.set(cx, 2, cz);
            arenaGroup.add(pylonLight);
        }
    });

    scene.add(arenaGroup);
}

function buildSporeParticles() {
    const count = isMobile ? 40 : 150;
    const geo = new THREE.BufferGeometry();
    const pos = new Float32Array(count * 3);
    const colors = new Float32Array(count * 3);
    const c1 = new THREE.Color(0x00ff88);
    const c2 = new THREE.Color(0xa855f7);
    const c3 = new THREE.Color(0xa3e635);
    const temp = new THREE.Color();

    for (let i = 0; i < count; i++) {
        pos[i * 3] = (Math.random() - 0.5) * 50;
        pos[i * 3 + 1] = Math.random() * 20;
        pos[i * 3 + 2] = (Math.random() - 0.5) * 50;

        const rand = Math.random();
        if (rand < 0.4) temp.copy(c1);
        else if (rand < 0.75) temp.copy(c2);
        else temp.copy(c3);

        colors[i * 3] = temp.r;
        colors[i * 3 + 1] = temp.g;
        colors[i * 3 + 2] = temp.b;
    }

    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));

    const mat = new THREE.PointsMaterial({
        size: isMobile ? 0.28 : 0.22,
        vertexColors: true,
        transparent: true,
        opacity: 0.35,
        blending: THREE.AdditiveBlending
    });

    ambientSporeMesh = new THREE.Points(geo, mat);
    scene.add(ambientSporeMesh);
}

// ----------------------------------------------------
// 3D FOOD & PARTICLES
// ----------------------------------------------------
function update3DFood() {
    if (!food) {
        if (foodGroup) {
            scene.remove(foodGroup);
            foodGroup = null;
        }
        return;
    }

    const pos = gridToWorld(food.x, food.y);

    if (!foodGroup) {
        foodGroup = new THREE.Group();

        // High-Vibrancy Glowing 3D Crystal Core (Ruby Neon)
        const coreGeo = new THREE.OctahedronGeometry(CELL_SIZE * 0.44, 0);
        const coreMat = new THREE.MeshStandardMaterial({
            color: 0xff0055,
            emissive: 0xff0055,
            emissiveIntensity: isMobile ? 1.35 : 1.15,
            roughness: 0.15,
            metalness: 0.10
        });
        foodCore = new THREE.Mesh(coreGeo, coreMat);
        if (!isMobile) foodCore.castShadow = true;
        foodGroup.add(foodCore);

        // High-Contrast Chromatic Orbiting Beacon Ring
        const torusTubular = isMobile ? 8 : 16;
        const torusRadial = isMobile ? 16 : 32;
        const ringGeo = new THREE.TorusGeometry(CELL_SIZE * 0.58, 0.07, torusTubular, torusRadial);
        const ringMat = new THREE.MeshBasicMaterial({
            color: 0x00ffff,
            transparent: true,
            opacity: 0.92
        });
        foodRing = new THREE.Mesh(ringGeo, ringMat);
        foodRing.rotation.x = Math.PI / 3;
        foodGroup.add(foodRing);

        // Vibrant Local Point Light under Food (Mobile & Desktop)
        foodLight = new THREE.PointLight(0xff0055, isMobile ? 3.0 : 2.5, 12);
        foodLight.position.set(0, 0.4, 0);
        foodGroup.add(foodLight);

        scene.add(foodGroup);
    }

    foodGroup.position.set(pos.x, pos.y + 0.2, pos.z);
}

function spawnEatParticles(worldPos) {
    const pCount = isMobile ? 12 : 28;
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(pCount * 3);
    const velocities = [];
    const colors = new Float32Array(pCount * 3);
    const color = new THREE.Color(0x00ff88);

    for (let i = 0; i < pCount; i++) {
        positions[i * 3] = worldPos.x;
        positions[i * 3 + 1] = worldPos.y;
        positions[i * 3 + 2] = worldPos.z;

        const theta = Math.random() * Math.PI * 2;
        const phi = (Math.random() - 0.5) * Math.PI;
        const speed = 4 + Math.random() * (isMobile ? 5 : 8);

        velocities.push(new THREE.Vector3(
            Math.cos(theta) * Math.cos(phi) * speed,
            Math.sin(phi) * speed + 3,
            Math.sin(theta) * Math.cos(phi) * speed
        ));

        colors[i * 3] = color.r;
        colors[i * 3 + 1] = color.g;
        colors[i * 3 + 2] = color.b;
    }

    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

    const material = new THREE.PointsMaterial({
        size: isMobile ? 0.35 : 0.28,
        vertexColors: true,
        transparent: true,
        opacity: 1,
        blending: THREE.AdditiveBlending
    });

    const burst = new THREE.Points(geometry, material);
    scene.add(burst);

    particleBursts.push({
        mesh: burst,
        velocities,
        life: 0.6,
        maxLife: 0.6
    });

    // Screen float popup
    createScoreFloatPopup(worldPos);
}

function createScoreFloatPopup(worldPos) {
    if (!popupsContainer) return;
    _tempScreenVec.set(worldPos.x, worldPos.y + 1, worldPos.z);
    _tempScreenVec.project(camera);

    const x = (_tempScreenVec.x * 0.5 + 0.5) * window.innerWidth;
    const y = (-(_tempScreenVec.y * 0.5) + 0.5) * window.innerHeight;

    const popup = document.createElement('div');
    popup.className = 'score-float-tag';
    popup.innerText = '+' + SCORE_PER_FOOD;
    popup.style.left = x + 'px';
    popup.style.top = y + 'px';

    popupsContainer.appendChild(popup);
    setTimeout(() => popup.remove(), 800);
}

// ----------------------------------------------------
// 3D SNAKE MESH MANAGEMENT
// ----------------------------------------------------
function update3DSnake() {
    const currentSkinKey = (typeof storage !== 'undefined' && storage.getSettings().skin) || 'emerald';
    const skinData = (typeof SNAKE_SKINS !== 'undefined' && SNAKE_SKINS[currentSkinKey]) || {
        id: 'emerald',
        name: 'Emerald Cyber',
        headColor: 0x00ff88,
        tailColor: 0xa855f7,
        eyeColor: 0xff0055,
        glow: 0x00ff88
    };

    while (snakeMeshes.length < snake.length) {
        const idx = snakeMeshes.length;
        const isHead = idx === 0;

        let mesh;
        if (isHead) {
            const headGroup = new THREE.Group();
            const headGeo = new THREE.BoxGeometry(CELL_SIZE * 0.90, CELL_SIZE * 0.82, CELL_SIZE * 0.90);
            const headMat = new THREE.MeshStandardMaterial({
                color: skinData.headColor,
                emissive: skinData.headColor,
                emissiveIntensity: isMobile ? 1.05 : 0.88,
                roughness: 0.25,
                metalness: 0.10
            });
            const headBox = new THREE.Mesh(headGeo, headMat);
            if (!isMobile) headBox.castShadow = true;
            headGroup.add(headBox);

            // Sleek Neon Visor / Brow Plate Accent
            const visorGeo = new THREE.BoxGeometry(CELL_SIZE * 0.76, CELL_SIZE * 0.16, CELL_SIZE * 0.35);
            const visorMat = new THREE.MeshBasicMaterial({
                color: skinData.eyeColor || 0xff0055,
                transparent: true,
                opacity: 0.95
            });
            const visorMesh = new THREE.Mesh(visorGeo, visorMat);
            visorMesh.position.set(0, 0.30, 0.32);
            headGroup.add(visorMesh);

            // Glowing Diamond Eyes
            const eyeSegments = isMobile ? 8 : 16;
            const eyeGeo = new THREE.SphereGeometry(0.17, eyeSegments, eyeSegments);
            const eyeMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
            
            const leftEye = new THREE.Mesh(eyeGeo, eyeMat);
            leftEye.position.set(0.28, 0.22, 0.44);
            headGroup.add(leftEye);

            const rightEye = new THREE.Mesh(eyeGeo, eyeMat);
            rightEye.position.set(-0.28, 0.22, 0.44);
            headGroup.add(rightEye);

            const headLight = new THREE.PointLight(
                skinData.glow || skinData.headColor,
                isMobile ? 3.0 : 2.4,
                12
            );
            headLight.position.set(0, 0.6, 0);
            headGroup.add(headLight);

            mesh = headGroup;
        } else {
            const ratio = idx / Math.max(snake.length, 10);
            // Segments sized to create crisp clean separation between blocks
            const segGeo = new THREE.BoxGeometry(CELL_SIZE * 0.78, CELL_SIZE * 0.70, CELL_SIZE * 0.78);
            
            let segColor;
            if (skinData.isRainbow) {
                const hue = ((idx * 0.09) % 1);
                segColor = new THREE.Color().setHSL(hue, 1.0, 0.55);
            } else {
                segColor = new THREE.Color().lerpColors(
                    new THREE.Color(skinData.headColor),
                    new THREE.Color(skinData.tailColor),
                    Math.min(ratio * 1.2, 1)
                );
            }

            const segMat = new THREE.MeshStandardMaterial({
                color: segColor,
                emissive: segColor,
                emissiveIntensity: isMobile ? (0.65 * (1 - ratio * 0.35)) : (0.48 * (1 - ratio * 0.35)),
                roughness: 0.32,
                metalness: 0.12
            });
            mesh = new THREE.Mesh(segGeo, segMat);
            if (!isMobile) mesh.castShadow = true;
        }

        scene.add(mesh);
        snakeMeshes.push(mesh);
    }

    while (snakeMeshes.length > snake.length) {
        const removed = snakeMeshes.pop();
        scene.remove(removed);
    }

    // Direct Position update from precomputed coordinates
    const len = snake.length;
    for (let idx = 0; idx < len; idx++) {
        const seg = snake[idx];
        const target = gridToWorld(seg.x, seg.y);
        const mesh = snakeMeshes[idx];
        if (mesh) {
            mesh.position.copy(target);

            // Rotate head to current direction
            if (idx === 0) {
                if (direction === 'right') mesh.rotation.y = Math.PI / 2;
                else if (direction === 'left') mesh.rotation.y = -Math.PI / 2;
                else if (direction === 'up') mesh.rotation.y = Math.PI;
                else if (direction === 'down') mesh.rotation.y = 0;
            }
        }
    }
}

function clear3DSnake() {
    for (let i = 0; i < snakeMeshes.length; i++) {
        scene.remove(snakeMeshes[i]);
    }
    snakeMeshes.length = 0;
}

// ----------------------------------------------------
// ANIMATION LOOP (EFFICIENT 60 FPS)
// ----------------------------------------------------
function animate3D() {
    requestAnimationFrame(animate3D);

    const delta = clock.getDelta();
    const elapsedTime = clock.getElapsedTime();

    // Food floating, pulsing & rotation animation
    if (foodGroup) {
        foodGroup.position.y = 0.8 + Math.sin(elapsedTime * 3) * 0.25;
        if (foodCore) {
            foodCore.rotation.x += 0.025;
            foodCore.rotation.y += 0.035;
            // Subtle rhythmic breathing scale pulse
            const pulse = 1.0 + Math.sin(elapsedTime * 4.5) * 0.12;
            foodCore.scale.set(pulse, pulse, pulse);
            if (foodCore.material) {
                foodCore.material.emissiveIntensity = (isMobile ? 1.35 : 1.15) + Math.sin(elapsedTime * 4.5) * 0.35;
            }
        }
        if (foodRing) {
            foodRing.rotation.z += 0.04;
            foodRing.rotation.x += 0.015;
        }
        if (foodLight) {
            foodLight.intensity = (isMobile ? 3.0 : 2.5) + Math.sin(elapsedTime * 4.5) * 0.7;
        }
    }

    // Ambient spores floating
    if (ambientSporeMesh) {
        const pos = ambientSporeMesh.geometry.attributes.position.array;
        const len = pos.length;
        const speed = delta * 0.8;
        for (let i = 1; i < len; i += 3) {
            pos[i] += speed;
            if (pos[i] > 20) pos[i] = 0;
        }
        ambientSporeMesh.geometry.attributes.position.needsUpdate = true;
    }

    // Particle explosions update
    for (let i = particleBursts.length - 1; i >= 0; i--) {
        const burst = particleBursts[i];
        burst.life -= delta;

        if (burst.life <= 0) {
            scene.remove(burst.mesh);
            particleBursts.splice(i, 1);
            continue;
        }

        const posArr = burst.mesh.geometry.attributes.position.array;
        const vLen = burst.velocities.length;
        for (let j = 0; j < vLen; j++) {
            const v = burst.velocities[j];
            posArr[j * 3] += v.x * delta;
            posArr[j * 3 + 1] += v.y * delta - 9.8 * delta * delta;
            posArr[j * 3 + 2] += v.z * delta;
        }
        burst.mesh.geometry.attributes.position.needsUpdate = true;
        burst.mesh.material.opacity = burst.life / burst.maxLife;
    }

    // Camera Shake on impact
    if (cameraShake > 0) {
        camera.position.x = (Math.random() - 0.5) * cameraShake;
        cameraShake = Math.max(0, cameraShake - delta * 5);
    } else {
        camera.position.x = 0;
    }

    renderer.render(scene, camera);
}

function onWindowResize() {
    const width = window.innerWidth;
    const height = window.innerHeight;
    updateCameraFraming(width, height);
    renderer.setSize(width, height);
}

// ----------------------------------------------------
// PRESERVED CORE SNAKE GAME LOGIC
// ----------------------------------------------------
function resetRound() {
    clear3DSnake();

    const middleRow = Math.floor(GRID_ROWS / 2);
    const headCol = Math.min(4, GRID_COLS - 1);

    // Initial 3-segment snake
    snake = [0, 1, 2].map(offset => ({
        x: middleRow,
        y: Math.max(0, headCol - offset)
    }));

    direction = 'right';
    directionQueue.length = 0;
    score = 0;
    seconds = 0;
    currentTickRate = BASE_TICK_RATE;
    isNewHighScore = false;

    if (scoreEl) scoreEl.innerText = score;
    if (timeEl) timeEl.innerText = formatTime(seconds);
    if (speedEl) speedEl.innerText = '1.0x';
    updateLengthHUD();

    generateFood();
    update3DSnake();
    update3DFood();
}

function generateFood() {
    const freeCells = [];

    for (let r = 0; r < GRID_ROWS; r++) {
        for (let c = 0; c < GRID_COLS; c++) {
            const onSnake = snake.some(segment => segment.x === r && segment.y === c);
            if (!onSnake) freeCells.push({ x: r, y: c });
        }
    }

    if (freeCells.length === 0) {
        food = null;
        return false;
    }

    food = freeCells[Math.floor(Math.random() * freeCells.length)];
    return true;
}

function queueDirection(newDirection) {
    const lastDirection = directionQueue.length > 0
        ? directionQueue[directionQueue.length - 1]
        : direction;

    if (newDirection === lastDirection) return;
    if (newDirection === oppositeDirection[lastDirection]) return;

    if (directionQueue.length === 2) directionQueue.shift();
    directionQueue.push(newDirection);
    sounds.playTurn();
}

function moveSnake() {
    if (directionQueue.length > 0) {
        direction = directionQueue.shift();
    }

    const head = { ...snake[0] };

    if (direction === 'right') head.y++;
    if (direction === 'left') head.y--;
    if (direction === 'up') head.x--;
    if (direction === 'down') head.x++;

    // WALL COLLISION
    if (
        head.x < 0 || head.x >= GRID_ROWS ||
        head.y < 0 || head.y >= GRID_COLS
    ) {
        cameraShake = 1.2;
        gameOver('You collided with the perimeter wall!');
        return;
    }

    const isEating = food !== null && head.x === food.x && head.y === food.y;

    // SELF COLLISION
    const body = isEating ? snake : snake.slice(0, -1);
    if (body.some(seg => seg.x === head.x && seg.y === head.y)) {
        cameraShake = 1.2;
        gameOver('You collided into your own serpent body!');
        return;
    }

    snake.unshift(head);

    // EAT FOOD
    if (isEating) {
        score += SCORE_PER_FOOD;
        updateScore();
        sounds.playEat();

        // 3D Visual FX
        const eatPos = gridToWorld(food.x, food.y);
        spawnEatParticles(eatPos);

        // Dynamic Speed scaling
        currentTickRate = Math.max(MIN_TICK_RATE, BASE_TICK_RATE - Math.floor(score / 50) * 8);
        if (speedEl) {
            const speedMultiplier = (BASE_TICK_RATE / currentTickRate).toFixed(1);
            speedEl.innerText = `${speedMultiplier}x`;
        }

        if (!generateFood()) {
            gameOver('Supreme Victory! You filled the entire neon grid!');
        } else {
            update3DFood();
        }

        // Restart tick loop with new speed if changed
        if (isPlaying && !isPaused) {
            clearInterval(gameLoop);
            gameLoop = setInterval(gameTick, currentTickRate);
        }
    } else {
        snake.pop();
    }

    update3DSnake();
    updateLengthHUD();
}

function updateLengthHUD() {
    if (!lengthEl) lengthEl = document.getElementById('length-val');
    if (lengthEl) {
        lengthEl.innerText = snake.length;
    }
}

function updateScore() {
    if (scoreEl) scoreEl.innerText = score;
    updateLengthHUD();

    if (score > highScore) {
        highScore = score;
        isNewHighScore = true;
        saveHighScore();
    }
}

function formatTime(totalSecs) {
    const mins = String(Math.floor(totalSecs / 60)).padStart(2, '0');
    const secs = String(totalSecs % 60).padStart(2, '0');
    return `${mins}:${secs}`;
}

function updateTimer() {
    if (!isPaused && isPlaying) {
        seconds++;
        if (timeEl) timeEl.innerText = formatTime(seconds);
    }
}

function gameTick() {
    if (!isPaused && isPlaying) {
        moveSnake();
    }
}

function startLoops() {
    stopLoops();
    isPlaying = true;
    isPaused = false;

    gameLoop = setInterval(gameTick, currentTickRate);
    timeLoop = setInterval(updateTimer, 1000);
}

function stopLoops() {
    isPlaying = false;
    clearInterval(gameLoop);
    clearInterval(timeLoop);
    gameLoop = null;
    timeLoop = null;
}

function togglePause() {
    if (!isPlaying) return;

    isPaused = !isPaused;
    if (pauseModal) {
        if (isPaused) pauseModal.classList.add('active');
        else pauseModal.classList.remove('active');
    }
    sounds.playClick();
}

// ----------------------------------------------------
// TOUCH SWIPE DETECTION
// ----------------------------------------------------
function setupTouchSwipe() {
    let touchStartX = 0;
    let touchStartY = 0;
    const minSwipeDistance = 30;

    window.addEventListener('touchstart', (e) => {
        if (e.touches.length > 0) {
            touchStartX = e.touches[0].clientX;
            touchStartY = e.touches[0].clientY;
        }
    }, { passive: true });

    window.addEventListener('touchend', (e) => {
        if (!isPlaying || isPaused || e.changedTouches.length === 0) return;
        const deltaX = e.changedTouches[0].clientX - touchStartX;
        const deltaY = e.changedTouches[0].clientY - touchStartY;

        if (Math.abs(deltaX) < minSwipeDistance && Math.abs(deltaY) < minSwipeDistance) return;

        if (Math.abs(deltaX) > Math.abs(deltaY)) {
            if (deltaX > 0) queueDirection('right');
            else queueDirection('left');
        } else {
            if (deltaY > 0) queueDirection('down');
            else queueDirection('up');
        }
    }, { passive: true });
}

// ----------------------------------------------------
// GAME OVER & MODAL OVERLAYS
// ----------------------------------------------------
function gameOver(reason) {
    stopLoops();
    sounds.playGameOver();

    if (gameOverReasonEl) gameOverReasonEl.innerText = reason;
    if (finalScoreEl) finalScoreEl.innerText = score;
    if (bestScoreEl) bestScoreEl.innerText = highScore;

    if (!finalLengthEl) finalLengthEl = document.getElementById('stat-final-length');
    if (finalLengthEl) finalLengthEl.innerText = snake.length;

    if (!finalTimeEl) finalTimeEl = document.getElementById('stat-final-time');
    if (finalTimeEl) finalTimeEl.innerText = formatTime(seconds);

    updateLengthHUD();

    if (newRecordBadge) {
        if (isNewHighScore && score > 0) newRecordBadge.style.display = 'inline-block';
        else newRecordBadge.style.display = 'none';
    }

    if (gameOverModal) gameOverModal.classList.add('active');
}

function hideOverlays() {
    if (gameOverModal) gameOverModal.classList.remove('active');
    if (pauseModal) pauseModal.classList.remove('active');
}

function startGame() {
    hideOverlays();
    resetRound();
    startLoops();
}

// ----------------------------------------------------
// UI INITIALIZATION & FAST-TOUCH LISTENERS
// ----------------------------------------------------
function initGameUI() {
    // DOM Element hooks
    scoreEl = document.getElementById('score-val');
    highScoreEl = document.getElementById('highscore-val');
    timeEl = document.getElementById('time-val');
    lengthEl = document.getElementById('length-val');
    speedEl = document.getElementById('speed-val');
    popupsContainer = document.getElementById('floating-popups');

    gameOverModal = document.getElementById('game-over-modal');
    gameOverReasonEl = document.getElementById('game-over-reason');
    finalScoreEl = document.getElementById('final-score');
    bestScoreEl = document.getElementById('best-score');
    finalLengthEl = document.getElementById('stat-final-length');
    finalTimeEl = document.getElementById('stat-final-time');
    newRecordBadge = document.getElementById('new-record-badge');
    pauseModal = document.getElementById('pause-modal');

    restartBtn = document.getElementById('btn-restart');
    playAgainBtn = document.getElementById('btn-play-again');
    pauseToggleBtn = document.getElementById('btn-pause');
    soundToggleBtn = document.getElementById('sound-toggle');
    soundIcon = document.getElementById('sound-icon');

    // D-Pad
    dpadUp = document.getElementById('dpad-up');
    dpadDown = document.getElementById('dpad-down');
    dpadLeft = document.getElementById('dpad-left');
    dpadRight = document.getElementById('dpad-right');

    if (highScoreEl) highScoreEl.innerText = highScore;

    // Initialize 3D Engine
    initThree();

    // Sound UI
    function updateSoundUI() {
        if (!soundIcon) return;
        if (sounds.isMuted) {
            soundIcon.innerHTML = '<path d="M11 5L6 9H2V15H6L11 19V5Z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><line x1="23" y1="9" x2="17" y2="15" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><line x1="17" y1="9" x2="23" y2="15" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>';
        } else {
            soundIcon.innerHTML = '<path d="M11 5L6 9H2V15H6L11 19V5Z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>';
        }
    }
    updateSoundUI();

    // Button Listeners with instant touchstart & double-trigger prevention
    function bindFastClick(element, handler) {
        if (!element) return;
        let lastTouchTime = 0;
        element.addEventListener('touchstart', (e) => {
            e.preventDefault();
            e.stopPropagation();
            lastTouchTime = Date.now();
            handler(e);
        }, { passive: false });
        element.addEventListener('click', (e) => {
            if (Date.now() - lastTouchTime < 450) {
                e.preventDefault();
                return;
            }
            e.preventDefault();
            handler(e);
        });
    }

    if (soundToggleBtn) {
        bindFastClick(soundToggleBtn, () => {
            sounds.toggleMute();
            updateSoundUI();
            sounds.playClick();
        });
    }

    bindFastClick(restartBtn, () => { sounds.playClick(); startGame(); });
    bindFastClick(playAgainBtn, () => { sounds.playClick(); startGame(); });
    bindFastClick(pauseToggleBtn, togglePause);

    const btnResume = document.getElementById('btn-resume');
    bindFastClick(btnResume, togglePause);

    // Fast-response Mobile D-Pad Touch Handlers with ghost-click prevention
    function bindDpad(btn, dir) {
        if (!btn) return;
        let lastTouchTime = 0;
        const trigger = (e) => {
            if (e.type === 'mousedown' && Date.now() - lastTouchTime < 450) {
                return;
            }
            if (e.type === 'touchstart') {
                lastTouchTime = Date.now();
            }
            e.preventDefault();
            e.stopPropagation();
            if (isPlaying && !isPaused) {
                queueDirection(dir);
            }
        };
        btn.addEventListener('touchstart', trigger, { passive: false });
        btn.addEventListener('mousedown', trigger);
    }

    bindDpad(dpadUp, 'up');
    bindDpad(dpadDown, 'down');
    bindDpad(dpadLeft, 'left');
    bindDpad(dpadRight, 'right');

    const dpadCenter = document.getElementById('dpad-center');
    bindFastClick(dpadCenter, togglePause);

    // Keyboard controls
    document.addEventListener('keydown', event => {
        const arrowKeys = ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', ' ', 'w', 'a', 's', 'd', 'W', 'A', 'S', 'D'];
        if (arrowKeys.includes(event.key)) {
            event.preventDefault();
        }

        // Pause
        if (event.key === ' ' || event.key === 'p' || event.key === 'P') {
            togglePause();
            return;
        }

        // Play again on Enter
        if (event.key === 'Enter') {
            if (!isPlaying || isPaused) {
                startGame();
            }
            return;
        }

        if (!isPlaying || isPaused) return;

        if (event.key === 'ArrowRight' || event.key === 'd' || event.key === 'D') queueDirection('right');
        if (event.key === 'ArrowLeft' || event.key === 'a' || event.key === 'A') queueDirection('left');
        if (event.key === 'ArrowUp' || event.key === 'w' || event.key === 'W') queueDirection('up');
        if (event.key === 'ArrowDown' || event.key === 's' || event.key === 'S') queueDirection('down');
    });

    // Start Game immediately on load
    startGame();
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initGameUI);
} else {
    initGameUI();
}
