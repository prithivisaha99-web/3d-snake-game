// 3D Welcome Landing Page - Three.js Neon Garden & Serpent
let scene, camera, renderer, container;
let snakeSegments = [];
let snakePath = [];
const numSegments = 24;
let foodItems = [];
let particlesMesh;
let mouseX = 0, mouseY = 0;
let targetMouseX = 0, targetMouseY = 0;
let clock;

function init3D() {
    container = document.getElementById('canvas-container');
    const width = window.innerWidth;
    const height = window.innerHeight;

    scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(0x07050f, 0.035);

    camera = new THREE.PerspectiveCamera(60, width / height, 0.1, 1000);
    camera.position.set(0, 5, 20);
    camera.lookAt(0, 0, 0);

    renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.2;
    container.appendChild(renderer.domElement);

    clock = new THREE.Clock();

    // Lighting
    const ambientLight = new THREE.AmbientLight(0x3b0764, 1.8);
    scene.add(ambientLight);

    const dirLight = new THREE.DirectionalLight(0x00ff88, 1.2);
    dirLight.position.set(10, 20, 15);
    scene.add(dirLight);

    const purpleLight = new THREE.PointLight(0xa855f7, 3, 35);
    purpleLight.position.set(-12, 6, 5);
    scene.add(purpleLight);

    const limeLight = new THREE.PointLight(0xa3e635, 3, 35);
    limeLight.position.set(12, -4, 8);
    scene.add(limeLight);

    // Dynamic mouse light
    const mouseLight = new THREE.PointLight(0x38bdf8, 2, 25);
    mouseLight.name = 'mouseLight';
    scene.add(mouseLight);

    // Create 3D Ground Grid (Neon Cyber Garden)
    createNeonFloor();

    // Create 3D Patrolling Snake
    createPatrollingSnake();

    // Create Floating Neon Food Crystals
    createFloatingFood();

    // Create Floating Spore Particles
    createSporeParticles();

    // Event Listeners
    window.addEventListener('resize', onWindowResize);
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('touchmove', onTouchMove, { passive: true });

    animate();
}

function createNeonFloor() {
    const gridHelper = new THREE.GridHelper(60, 40, 0x00ff88, 0x581c87);
    gridHelper.position.y = -6;
    gridHelper.material.opacity = 0.45;
    gridHelper.material.transparent = true;
    scene.add(gridHelper);

    // Subtle reflective ground plane
    const planeGeo = new THREE.PlaneGeometry(80, 80);
    const planeMat = new THREE.MeshStandardMaterial({
        color: 0x070512,
        roughness: 0.2,
        metalness: 0.8
    });
    const plane = new THREE.Mesh(planeGeo, planeMat);
    plane.rotation.x = -Math.PI / 2;
    plane.position.y = -6.05;
    scene.add(plane);
}

function createPatrollingSnake() {
    const headGeo = new THREE.SphereGeometry(0.7, 32, 32);
    const headMat = new THREE.MeshStandardMaterial({
        color: 0x00ff88,
        emissive: 0x00ff88,
        emissiveIntensity: 0.4,
        roughness: 0.2,
        metalness: 0.8
    });
    const head = new THREE.Mesh(headGeo, headMat);

    // Eyes
    const eyeGeo = new THREE.SphereGeometry(0.16, 16, 16);
    const eyeMat = new THREE.MeshBasicMaterial({ color: 0xff0055 });
    
    const leftEye = new THREE.Mesh(eyeGeo, eyeMat);
    leftEye.position.set(0.35, 0.25, 0.5);
    head.add(leftEye);

    const rightEye = new THREE.Mesh(eyeGeo, eyeMat);
    rightEye.position.set(-0.35, 0.25, 0.5);
    head.add(rightEye);

    // Head Light
    const headLight = new THREE.PointLight(0x00ff88, 2, 12);
    head.add(headLight);

    scene.add(head);
    snakeSegments.push(head);

    // Body segments with color gradient from Lime to Violet
    const bodyGeo = new THREE.SphereGeometry(0.55, 24, 24);
    for (let i = 1; i < numSegments; i++) {
        const ratio = i / numSegments;
        const color = new THREE.Color().lerpColors(
            new THREE.Color(0xa3e635),
            new THREE.Color(0xa855f7),
            ratio
        );
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
    const foods = [
        { pos: [-7, 2, 2], color: 0xf43f5e, ringColor: 0xa855f7 },
        { pos: [8, -1, 4], color: 0x38bdf8, ringColor: 0x00ff88 },
        { pos: [0, 4, -3], color: 0xa3e635, ringColor: 0xec4899 }
    ];

    foods.forEach(f => {
        const group = new THREE.Group();
        group.position.set(...f.pos);

        // Crystal Core
        const coreGeo = new THREE.OctahedronGeometry(0.65, 0);
        const coreMat = new THREE.MeshStandardMaterial({
            color: f.color,
            emissive: f.color,
            emissiveIntensity: 0.8,
            roughness: 0.1,
            metalness: 0.9,
            wireframe: false
        });
        const core = new THREE.Mesh(coreGeo, coreMat);
        group.add(core);

        // Orbiting Ring
        const ringGeo = new THREE.TorusGeometry(1.0, 0.04, 16, 64);
        const ringMat = new THREE.MeshBasicMaterial({ color: f.ringColor, transparent: true, opacity: 0.75 });
        const ring = new THREE.Mesh(ringGeo, ringMat);
        ring.rotation.x = Math.PI / 3;
        group.add(ring);

        // Glow light
        const light = new THREE.PointLight(f.color, 1.5, 10);
        group.add(light);

        scene.add(group);
        foodItems.push({ group, core, ring, basePos: f.pos });
    });
}

function createSporeParticles() {
    const particleCount = 200;
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
        size: 0.18,
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
    camera.updateProjectionMatrix();
    renderer.setSize(width, height);
}

function onMouseMove(event) {
    targetMouseX = (event.clientX / window.innerWidth - 0.5) * 2;
    targetMouseY = (event.clientY / window.innerHeight - 0.5) * 2;
}

function onTouchMove(event) {
    if (event.touches.length > 0) {
        targetMouseX = (event.touches[0].clientX / window.innerWidth - 0.5) * 2;
        targetMouseY = (event.touches[0].clientY / window.innerHeight - 0.5) * 2;
    }
}

function animate() {
    requestAnimationFrame(animate);

    const delta = clock.getDelta();
    const elapsedTime = clock.getElapsedTime();

    // Smooth mouse lerp
    mouseX += (targetMouseX - mouseX) * 0.05;
    mouseY += (targetMouseY - mouseY) * 0.05;

    // Camera tilt / parallax
    camera.position.x = mouseX * 3;
    camera.position.y = 5 - mouseY * 2;
    camera.lookAt(0, 0, 0);

    // Mouse dynamic light
    const mouseLight = scene.getObjectByName('mouseLight');
    if (mouseLight) {
        mouseLight.position.set(mouseX * 15, -mouseY * 10 + 2, 8);
    }

    // Undulating 3D Snake Motion along 3D Lissajous curve
    const t = elapsedTime * 0.85;
    const leadX = Math.sin(t) * 9 + Math.cos(t * 0.5) * 3;
    const leadY = Math.sin(t * 1.5) * 2.5 + Math.cos(t * 0.7) * 1.2;
    const leadZ = Math.cos(t) * 6;

    snakePath.unshift(new THREE.Vector3(leadX, leadY, leadZ));
    if (snakePath.length > numSegments * 6) {
        snakePath.pop();
    }

    snakeSegments.forEach((seg, idx) => {
        const pathIndex = Math.min(idx * 5, snakePath.length - 1);
        if (snakePath[pathIndex]) {
            seg.position.copy(snakePath[pathIndex]);
            if (idx === 0 && snakePath[1]) {
                const dir = new THREE.Vector3().subVectors(snakePath[0], snakePath[1]).normalize();
                seg.lookAt(seg.position.clone().add(dir));
            }
        }
    });

    // Animate Floating Food items
    foodItems.forEach((f, idx) => {
        const offset = idx * 2.1;
        f.group.position.y = f.basePos[1] + Math.sin(elapsedTime * 2 + offset) * 0.6;
        f.core.rotation.x += 0.015;
        f.core.rotation.y += 0.02;
        f.ring.rotation.z += 0.025;
    });

    // Animate Spore Particles
    if (particlesMesh) {
        const positions = particlesMesh.geometry.attributes.position.array;
        for (let i = 1; i < positions.length; i += 3) {
            positions[i] += delta * 0.6;
            if (positions[i] > 15) {
                positions[i] = -15;
            }
        }
        particlesMesh.geometry.attributes.position.needsUpdate = true;
        particlesMesh.rotation.y = elapsedTime * 0.02;
    }

    renderer.render(scene, camera);
}

// UI & Navigation Logic
document.addEventListener('DOMContentLoaded', () => {
    init3D();

    // High score display
    const highScoreEl = document.getElementById('high-score-val');
    try {
        const savedHighScore = localStorage.getItem('snakeHighScore') || 0;
        if (highScoreEl) highScoreEl.innerText = savedHighScore;
    } catch (e) {}

    // Audio & Mute button
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
        soundToggle.addEventListener('click', () => {
            sounds.toggleMute();
            updateSoundUI();
            sounds.playClick();
        });
    }

    // Modal How-To
    const infoToggle = document.getElementById('info-toggle');
    const infoModal = document.getElementById('info-modal');
    const modalClose = document.getElementById('modal-close');

    if (infoToggle && infoModal && modalClose) {
        infoToggle.addEventListener('click', () => {
            sounds.playClick();
            infoModal.classList.add('active');
        });
        modalClose.addEventListener('click', () => {
            sounds.playClick();
            infoModal.classList.remove('active');
        });
        infoModal.addEventListener('click', (e) => {
            if (e.target === infoModal) {
                infoModal.classList.remove('active');
            }
        });
    }

    // Start Game Button Animation & Navigation
    const startBtn = document.getElementById('start-game-btn');
    if (startBtn) {
        startBtn.addEventListener('mouseenter', () => {
            sounds.playHover();
        });

        startBtn.addEventListener('click', (e) => {
            e.preventDefault();
            sounds.playEat(); // celebratory arcade chime
            
            // Visual warp transition
            document.body.style.transition = 'transform 0.5s ease-in, opacity 0.5s ease-in';
            document.body.style.transform = 'scale(1.08)';
            document.body.style.opacity = '0';

            setTimeout(() => {
                window.location.href = 'game.html';
            }, 450);
        });
    }

    // Button sound effects on all feature cards
    document.querySelectorAll('.feature-card, .icon-btn').forEach(elem => {
        elem.addEventListener('mouseenter', () => sounds.playHover());
    });
});
