// app.js
import ClientNetwork from "./ClientNetwork.js";

import * as THREE from 'three';
import { PLYLoader } from 'three/addons/loaders/PLYLoader.js';

const INTERFACE_UUID = "11111111-2222-3333-4444-555555555555"; 
const INSTANCE_UUID = "00000000-0000-0000-0000-000000000000"; 

const network = new ClientNetwork();
const statusDiv = document.getElementById("status");
const connectBtn = document.getElementById("connectBtn");
const flipBtn = document.getElementById("flipBtn");
const meshSelect = document.getElementById("meshSelect");
const sizeSlider = document.getElementById("sizeSlider"); 
const mooveFinger = document.getElementById("mooveFinger"); 
const clipSlider = document.getElementById("clipSlider");

const activePointers = new Map();

const meshViewer = document.getElementById("meshViewer");
const confirmMeshBtn = document.getElementById("confirmMeshBtn");

// 🕹️ Récupération des éléments Joysticks
const joystickContainer = document.getElementById("joystickContainer");
const joystickZone = document.getElementById("joystickZone");
const joystickCursor = document.getElementById("joystickCursor");
const joystickValues = document.getElementById("joystickValues");

const joystickHeightContainer = document.getElementById("joystickHeightContainer");
const joystickHeightZone = document.getElementById("joystickHeightZone");
const joystickHeightCursor = document.getElementById("joystickHeightCursor");
const joystickHeightValue = document.getElementById("joystickHeightValue");
const autoRotateBtn = document.getElementById("autoRotateBtn");
let isAutoRotating = false;

// Contrôles désactivés jusqu'à la confirmation du join
flipBtn.disabled = true;
meshSelect.disabled = true;
sizeSlider.disabled = true; 
confirmMeshBtn.disabled = true; 
if(clipSlider) clipSlider.disabled = true;
autoRotateBtn.disabled = true; 

// Tourner
let currentTreeScale = 1.0;   // scale multiplicateur de l'arbre, indépendant de la taille des points

// Connexion au serveur
connectBtn.addEventListener("click", () => {
    const ip = document.getElementById("ipInput").value;
    const port = document.getElementById("portInput").value;
    statusDiv.innerText = "Connexion en cours...";
    statusDiv.style.color = "#ffc107";
    network.connect(ip, port);
});

// --- VARIABLES THREE.JS ---
let camera, scene, renderer, point_cloud;
const canvas_3d = document.getElementById("canvas_3d");

// Initialisation de Three.js au chargement de la page
initThreeJS();


function initThreeJS() {
    const initialWidth = canvas_3d.clientWidth || 360;

    renderer = new THREE.WebGLRenderer({ canvas: canvas_3d, antialias: true, alpha: true });
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setSize(initialWidth, 250);
    renderer.setClearColor(0x000000, 0);

    scene = new THREE.Scene();

    camera = new THREE.PerspectiveCamera(70, initialWidth / 250, 0.01, 40);
    camera.position.set(0, 0, 4);
    scene.add(camera);

    animate();
}


function animate() {
    requestAnimationFrame(animate);
    render();
}

function loadPLY(filepath) {
    if (point_cloud) {
        scene.remove(point_cloud);
        point_cloud.geometry.dispose();
        point_cloud.material.dispose();
    }

    document.body.style.cursor = 'wait'; 

    const loader = new PLYLoader();
    loader.load(filepath, function (geometry) {
        geometry.center();
        
        const currentSize = parseFloat(sizeSlider.value) || 0.1;
        const material = new THREE.PointsMaterial({ size: currentSize , vertexColors: true });
        
        point_cloud = new THREE.Points(geometry, material);
        
        const bbox = new THREE.Box3().setFromObject(point_cloud);
        const size = bbox.getSize(new THREE.Vector3());
        const maxAxis = Math.max(size.x, size.y, size.z);
        const baseScale = 2.0 / maxAxis;
        point_cloud.userData.baseScale = baseScale;
        point_cloud.scale.multiplyScalar(baseScale);
        point_cloud.rotateX(-0.5 * Math.PI);
        scene.add(point_cloud);

        // Réinitialise l'état trackball à chaque nouveau mesh chargé
        resetTrackballState();

        render();

        document.body.style.cursor = 'default'; 
    }, undefined, function(error) {
        console.error("Erreur lors du chargement du fichier PLY:", error);
        document.body.style.cursor = 'default';
    });
}

function render() {
    renderer.render(scene, camera);
}

network.setCallbacks({
    onOpen: () => {
        statusDiv.innerText = "Statut : Connecté (identification...)";
        statusDiv.style.color = "#ffc107";
        network.send(JSON.stringify({ UUID: INTERFACE_UUID }));
        sendSystemCommand("INSTANCE_JOIN", { 
            instanceUUID: INSTANCE_UUID, 
            userUUID: INTERFACE_UUID 
        });
    },

    onMessage: (msg) => {
        console.log("Message reçu du serveur :", msg);
        try {
            const data = JSON.parse(msg);
            if (data?.payload?.command === "INSTANCE_LIST") {
                statusDiv.innerText = "Statut : Connecté & Pret !";
                statusDiv.style.color = "#28a745";
                
                if(clipSlider) clipSlider.disabled = false;
                flipBtn.disabled = false;
                meshSelect.disabled = false;
                sizeSlider.disabled = false; 
                confirmMeshBtn.disabled = false; 
                autoRotateBtn.disabled = false; 
                
                if (joystickContainer) {
                    joystickContainer.style.opacity = "1";
                    joystickContainer.style.pointerEvents = "auto";
                }
                if (joystickHeightContainer) {
                    joystickHeightContainer.style.opacity = "1";
                    joystickHeightContainer.style.pointerEvents = "auto";
                }
            }
        } catch (e) {
            console.warn("Message non-JSON reçu :", msg);
        }
    },

    onClose: () => {
        statusDiv.innerText = "Statut : Déconnecté";
        statusDiv.style.color = "#dc3545";
        
        if(clipSlider) clipSlider.disabled = true;
        flipBtn.disabled = true;
        meshSelect.disabled = true;
        sizeSlider.disabled = true;
        confirmMeshBtn.disabled = true;
        autoRotateBtn.disabled = true; 
        
        if (isAutoRotating) {
            isAutoRotating = false;
            autoRotateBtn.innerText = "▶ Lancer la Rotation Auto";
            autoRotateBtn.style.background = "#17a2b8";
        }

        if (joystickContainer) {
            joystickContainer.style.opacity = "0.5";
            joystickContainer.style.pointerEvents = "none";
        }
        if (joystickHeightContainer) {
            joystickHeightContainer.style.opacity = "0.5";
            joystickHeightContainer.style.pointerEvents = "none";
        }
    },

    onError: () => {
        statusDiv.innerText = "Statut : Erreur Réseau";
        statusDiv.style.color = "#dc3545";
        
        flipBtn.disabled = true;
        meshSelect.disabled = true;
        sizeSlider.disabled = true;
        confirmMeshBtn.disabled = true;
        if(clipSlider) clipSlider.disabled = true; 
        autoRotateBtn.disabled = true;

        if (isAutoRotating) {
            isAutoRotating = false;
            autoRotateBtn.innerText = "▶ Lancer la Rotation Auto";
            autoRotateBtn.style.background = "#17a2b8";
        }

        if (joystickContainer) {
            joystickContainer.style.opacity = "0.5";
            joystickContainer.style.pointerEvents = "none";
        }
        if (joystickHeightContainer) {
            joystickHeightContainer.style.opacity = "0.5";
            joystickHeightContainer.style.pointerEvents = "none";
        }
    },
});

// Helpers d'envoi
function sendSystemCommand(command, data = {}) {
    network.send(JSON.stringify({
        scope: "SYSTEM",
        senderUUID: INTERFACE_UUID,
        payload: { command, data }
    }));
}

function sendModuleCommand(moduleUUID, command, data = {}) {
    network.send(JSON.stringify({
        scope: "MODULE",
        senderUUID: INTERFACE_UUID,
        payload: { moduleUUID, command, data }
    }));
}

function sendInstanceCommand(command, data = {}) {
    network.send(JSON.stringify({
        scope: "INSTANCE",
        senderUUID: INTERFACE_UUID,
        payload: { command, data }
    }));
}

flipBtn.addEventListener("click", () => {
    console.log("flipEyes →");
    sendModuleCommand(INSTANCE_UUID, "flipEyes", {});
});

meshSelect.addEventListener("change", (event) => {
    const selectedOption = event.target.options[event.target.selectedIndex];
    const plyFileName = selectedOption.value; 
    
    canvas_3d.style.display = "block";
    confirmMeshBtn.style.display = "inline-block";
    
    const realWidth = canvas_3d.clientWidth || 360;
    renderer.setSize(realWidth, 250);
    camera.aspect = realWidth / 250;
    camera.updateProjectionMatrix();
    
    loadPLY(plyFileName); 
});

confirmMeshBtn.addEventListener("click", () => {
    const fileName = meshSelect.value;
    console.log(`[Validation] Envoi de l'ordre changeMesh → ${fileName}`);
    
    sendModuleCommand(INSTANCE_UUID, "changeMesh", { fileName });
    
    const texteOriginal = confirmMeshBtn.innerText;
    confirmMeshBtn.innerText = "✓ Envoyé au CAVE !";
    confirmMeshBtn.style.background = "#28a745"; 
    
    setTimeout(() => {
        confirmMeshBtn.innerText = texteOriginal;
        confirmMeshBtn.style.background = "#ff8c00"; 
    }, 1500);
});

// ==========================================
// 🖐 GESTION DU MULTI-TOUCH (ROTATION TRACKBALL & PINCH)
// ==========================================
let initialPinchDistance = null;
let currentScale = parseFloat(sizeSlider.value) || 0.1;

// --- État interne façon THREE.TrackballControls, mais appliqué à l'objet plutôt qu'à une caméra ---
// Dans TrackballControls, _eye et object.up évoluent ensemble à chaque drag (c'est ce qui donne le
// comportement "trackball" : pas de gimbal lock, la rotation reste cohérente peu importe l'orientation
// courante). Ici, notre "caméra" est fixe, donc on rejoue exactement la même logique sur un couple
// eye/up virtuel, et on applique le quaternion obtenu (inversé) directement à l'objet.
const ROTATE_SPEED = 3.0; // équivalent de rotateSpeed dans TrackballControls

let _trackballEye = new THREE.Vector3(0, 0, 1);
let _trackballUp = new THREE.Vector3(0, 1, 0);
const _moveCurr = new THREE.Vector2();
const _movePrev = new THREE.Vector2();

function resetTrackballState() {
    _trackballEye.set(0, 0, 1);
    _trackballUp.set(0, 1, 0);
}

// Équivalent de TrackballControls._getMouseOnCircle, mais normalisé pour un canvas de
// n'importe quel ratio largeur/hauteur.
// ⚠️ La formule originale de three.js divise toujours y par rect.width ("screen.width
// intentional"), ce qui est correct pour un canvas plein écran (large), mais devient un
// bug si le canvas est plus étroit que haut (notre preview fait une hauteur fixe de 250px
// dans un petit encart) : diviser par une largeur trop petite amplifie énormément la
// composante verticale, au point qu'elle écrase l'axe horizontal (d'où l'impression
// qu'un slide vers la droite finit par tourner "vers le haut"). On utilise donc la même
// référence (le plus petit côté) pour x et y, pour garder un vrai mapping circulaire.
function getMouseOnCircle(clientX, clientY) {
    const rect = canvas_3d.getBoundingClientRect();
    const radius = Math.min(rect.width, rect.height) * 0.5;
    const centerX = rect.left + rect.width * 0.5;
    const centerY = rect.top + rect.height * 0.5;

    return new THREE.Vector2(
        (clientX - centerX) / radius,
        (centerY - clientY) / radius // inversé : vers le haut = positif, comme dans three.js
    );
}

// Équivalent de TrackballControls._rotateCamera, mais retourne le quaternion incrémental
// au lieu de l'appliquer directement à une caméra.
function computeTrackballQuaternion() {
    const moveDirection = new THREE.Vector3(_moveCurr.x - _movePrev.x, _moveCurr.y - _movePrev.y, 0);
    let angle = moveDirection.length();

    if (!angle) return null;

    const eyeDirection = _trackballEye.clone().normalize();
    const upDirection = _trackballUp.clone().normalize();
    const sidewaysDirection = new THREE.Vector3().crossVectors(upDirection, eyeDirection).normalize();

    upDirection.setLength(_moveCurr.y - _movePrev.y);
    sidewaysDirection.setLength(_moveCurr.x - _movePrev.x);

    moveDirection.copy(upDirection.add(sidewaysDirection));

    const axis = new THREE.Vector3().crossVectors(moveDirection, _trackballEye).normalize();

    angle *= ROTATE_SPEED;
    const quaternion = new THREE.Quaternion().setFromAxisAngle(axis, angle);

    // Met à jour l'état interne, comme _eye/object.up dans TrackballControls
    _trackballEye.applyQuaternion(quaternion);
    _trackballUp.applyQuaternion(quaternion);

    return quaternion;
}

canvas_3d.addEventListener('pointerdown', e => {
    canvas_3d.setPointerCapture(e.pointerId);
    activePointers.set(e.pointerId, { x: e.clientX, y: e.clientY });

    if (activePointers.size === 1) {
        _moveCurr.copy(getMouseOnCircle(e.clientX, e.clientY));
        _movePrev.copy(_moveCurr);
    }
});

canvas_3d.addEventListener('pointermove', e => {
    if (!activePointers.has(e.pointerId)) return;

    if (activePointers.size === 1) {
        activePointers.set(e.pointerId, { x: e.clientX, y: e.clientY });

        _movePrev.copy(_moveCurr);
        _moveCurr.copy(getMouseOnCircle(e.clientX, e.clientY));

        const quaternion = computeTrackballQuaternion();

        if (quaternion) {
            if (point_cloud) {
                // La rotation calculée orbiterait une caméra virtuelle autour de l'objet ;
                // pour faire tourner l'objet lui-même (caméra fixe), on applique la rotation inverse.
                point_cloud.quaternion.premultiply(quaternion.clone().invert());
                render();
            }

            sendModuleCommand(INSTANCE_UUID, "rotateTree", {
                x: quaternion.x,
                y: quaternion.y,
                z: quaternion.z,
                w: quaternion.w
            });
        }
    } else {
        activePointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
    }


    if (activePointers.size === 2) {
        const pts = Array.from(activePointers.values());
        const dx = pts[0].x - pts[1].x;
        const dy = pts[0].y - pts[1].y;
        const distance = Math.sqrt(dx * dx + dy * dy);

        if (initialPinchDistance === null) {
            initialPinchDistance = distance;
        } else {
            const scaleFactor = distance / initialPinchDistance;
            let newTreeScale = currentTreeScale * scaleFactor;
            newTreeScale = Math.min(Math.max(newTreeScale, 0.1), 5.0);

            if (point_cloud) {
                point_cloud.scale.setScalar(point_cloud.userData.baseScale * newTreeScale);
                render();
            }
            sendModuleCommand(INSTANCE_UUID, "scaleTree", { scaleFactor: newTreeScale });
        }
    }
});

function resetPinchState() {
    if (activePointers.size < 2 && point_cloud) {
        currentTreeScale = point_cloud.scale.x / point_cloud.userData.baseScale;
        initialPinchDistance = null;
    }
}
canvas_3d.addEventListener('pointerup', e => {
    activePointers.delete(e.pointerId);
    resetPinchState();

    // Réinitialise le point de départ pour le doigt restant, pour éviter un saut de rotation
    if (activePointers.size === 1) {
        const [remaining] = activePointers.values();
        _moveCurr.copy(getMouseOnCircle(remaining.x, remaining.y));
        _movePrev.copy(_moveCurr);
    }
});
canvas_3d.addEventListener('pointercancel', e => {
    activePointers.delete(e.pointerId);
    resetPinchState();

    if (activePointers.size === 1) {
        const [remaining] = activePointers.values();
        _moveCurr.copy(getMouseOnCircle(remaining.x, remaining.y));
        _movePrev.copy(_moveCurr);
    }
});

// ==========================================
// 🎚 GESTION DES SLIDERS
// ==========================================
sizeSlider.addEventListener("input", (event) => {
    const newSize = parseFloat(event.target.value);
    currentScale = newSize; // Synchronisation avec le pinch
    
    if (point_cloud) {
        point_cloud.material.size = newSize * 0.5;
        render();
    }
    sendModuleCommand(INSTANCE_UUID, "changePointSize", { size: newSize });
});

if (clipSlider) {
    clipSlider.addEventListener("input", (event) => {
        const height = parseFloat(event.target.value);
        sendModuleCommand(INSTANCE_UUID, "changeClippingHeight", { height: height });
    });
}

// ==========================================
// 🔄 ROTATION AUTOMATIQUE
// ==========================================
autoRotateBtn.addEventListener("click", () => {
    isAutoRotating = !isAutoRotating;
    
    if (isAutoRotating) {
        autoRotateBtn.innerText = "⏸ Mettre en Pause (Rotation)";
        autoRotateBtn.style.background = "#dc3545"; 
    } else {
        autoRotateBtn.innerText = "▶ Lancer la Rotation Auto";
        autoRotateBtn.style.background = "#17a2b8"; 
    }
    
    sendModuleCommand(INSTANCE_UUID, "toggleAutoRotate", { state: isAutoRotating });
});

// ==========================================
// 🕹️ CONTRÔLE JOYSTICK 2D (FACE X/Y)
// ==========================================
let isDragging = false;
let joystickRadius = 75; 
let maxCursorDist = joystickRadius - 25; 

function sendJoystickData(x, y) {
    if(joystickValues) joystickValues.innerText = `X: ${x.toFixed(2)} | Y: ${y.toFixed(2)}`;
    sendModuleCommand(INSTANCE_UUID, "moveTree", { dirX: x, dirY: y }); 
}

if(joystickZone) {
    joystickZone.addEventListener("pointerdown", (e) => {
        isDragging = true;
        joystickCursor.style.transition = "none"; 
        updateJoystick(e);
    });
}

window.addEventListener("pointermove", (e) => {
    if (isDragging) updateJoystick(e);
    if (isDraggingHeight) updateDepthJoystick(e);
});

window.addEventListener("pointerup", () => {
    if (isDragging) {
        isDragging = false;
        joystickCursor.style.transition = "top 0.2s ease-out, left 0.2s ease-out";
        joystickCursor.style.top = "50%";
        joystickCursor.style.left = "50%";
        sendJoystickData(0, 0);
    }
    if (isDraggingHeight) {
        isDraggingHeight = false;
        joystickHeightCursor.style.transition = "top 0.2s ease-out";
        joystickHeightCursor.style.top = "50%";
        sendDepthData(0);
    }
});

function updateJoystick(e) {
    const rect = joystickZone.getBoundingClientRect();
    const centerX = rect.left + joystickRadius;
    const centerY = rect.top + joystickRadius;

    let dx = e.clientX - centerX;
    let dy = e.clientY - centerY;
    const distance = Math.sqrt(dx * dx + dy * dy);

    if (distance > maxCursorDist) {
        dx = (dx / distance) * maxCursorDist;
        dy = (dy / distance) * maxCursorDist;
    }

    joystickCursor.style.left = `${dx + joystickRadius}px`;
    joystickCursor.style.top = `${dy + joystickRadius}px`;

    const normalizedX = dx / maxCursorDist;
    const normalizedY = -(dy / maxCursorDist); 

    sendJoystickData(normalizedX, normalizedY);
}

// ==========================================
// 🚀 CONTRÔLE JOYSTICK 1D (PROFONDEUR Z)
// ==========================================
let isDraggingHeight = false;
let trackHeight = 150; 
let heightCursorSize = 40; 
let maxCursorDistY = (trackHeight - heightCursorSize) / 2; 

function sendDepthData(z) {
    if(joystickHeightValue) joystickHeightValue.innerText = `Z: ${z.toFixed(2)}`;
    sendModuleCommand(INSTANCE_UUID, "moveTreeDepth", { dirZ: z }); 
}

if(joystickHeightZone) {
    joystickHeightZone.addEventListener("pointerdown", (e) => {
        isDraggingHeight = true;
        joystickHeightCursor.style.transition = "none"; 
        updateDepthJoystick(e);
    });
}

function updateDepthJoystick(e) {
    const rect = joystickHeightZone.getBoundingClientRect();
    const centerY = rect.top + (rect.height / 2);

    let dy = e.clientY - centerY;

    if (dy > maxCursorDistY) dy = maxCursorDistY;
    if (dy < -maxCursorDistY) dy = -maxCursorDistY;

    joystickHeightCursor.style.top = `${dy + (trackHeight / 2)}px`;

    const normalizedZ = -(dy / maxCursorDistY); 

    sendDepthData(normalizedZ);
}