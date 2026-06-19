// app.js
import ClientNetwork from "./ClientNetwork.js";

const INTERFACE_UUID = "11111111-2222-3333-4444-555555555555"; 
const INSTANCE_UUID = "00000000-0000-0000-0000-000000000000"; 

const network = new ClientNetwork();

const statusDiv = document.getElementById("status");
const connectBtn = document.getElementById("connectBtn");
const flipBtn = document.getElementById("flipBtn");
const meshSelect = document.getElementById("meshSelect");
const sizeSlider = document.getElementById("sizeSlider"); 
const clipSlider = document.getElementById("clipSlider");

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

// Contrôles désactivés jusqu'à la confirmation du join
flipBtn.disabled = true;
meshSelect.disabled = true;
sizeSlider.disabled = true; 
confirmMeshBtn.disabled = true; // 🌟 Désactivé par défaut
clipSlider.disabled = true;

// Connexion au serveur
connectBtn.addEventListener("click", () => {
    const ip = document.getElementById("ipInput").value;
    const port = document.getElementById("portInput").value;
    statusDiv.innerText = "Connexion en cours...";
    statusDiv.style.color = "#ffc107";
    network.connect(ip, port);
});

network.setCallbacks({
    onOpen: () => {
        statusDiv.innerText = "Statut : Connecté (identification...)";
        statusDiv.style.color = "#ffc107";

        //Identification immédiate
        network.send(JSON.stringify({ UUID: INTERFACE_UUID }));

        //Join de l'instance CAVE
        sendSystemCommand("INSTANCE_JOIN", { 
            instanceUUID: INSTANCE_UUID, 
            userUUID: INTERFACE_UUID 
        });
    },

    onMessage: (msg) => {
        console.log("Message reçu du serveur :", msg);
        try {
            const data = JSON.parse(msg);
            // Le serveur confirme le join en renvoyant INSTANCE_LIST
            if (data?.payload?.command === "INSTANCE_LIST") {
                statusDiv.innerText = "Statut : Connecté & Pret !";
                statusDiv.style.color = "#28a745";
                
                // Activation de tous les contrôles
                clipSlider.disabled = false;
                flipBtn.disabled = false;
                meshSelect.disabled = false;
                sizeSlider.disabled = false; 
                confirmMeshBtn.disabled = false; 
                
                // Activation des Joysticks
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
        
        clipSlider.disabled = true;
        flipBtn.disabled = true;
        meshSelect.disabled = true;
        sizeSlider.disabled = true;
        confirmMeshBtn.disabled = true;

        // Désactivation des Joysticks
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
        
        // Désactivation
        flipBtn.disabled = true;
        meshSelect.disabled = true;
        sizeSlider.disabled = true;
        confirmMeshBtn.disabled = true;
        clipSlider.disabled = true; 

        // Désactivation des Joysticks
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

//On affiche la miniature .glb dans la boîte 3D quand le menu change
meshSelect.addEventListener("change", (event) => {
    const selectedOption = event.target.options[event.target.selectedIndex];
    const modelSrc = selectedOption.getAttribute("data-model");
    
    meshViewer.src = modelSrc;
    meshViewer.style.display = "block";
    confirmMeshBtn.style.display = "inline-block";
});

//On envoie l'ordre au CAVE uniquement au clic sur le bouton Confirmer
confirmMeshBtn.addEventListener("click", () => {
    const fileName = meshSelect.value;
    console.log(`[Validation] Envoi de l'ordre changeMesh → ${fileName}`);
    
    sendModuleCommand(INSTANCE_UUID, "changeMesh", { fileName });
    
    // Feedback visuel temporaire sur le bouton
    const texteOriginal = confirmMeshBtn.innerText;
    confirmMeshBtn.innerText = "✓ Envoyé au CAVE !";
    confirmMeshBtn.style.background = "#28a745"; // Vert succès
    
    setTimeout(() => {
        confirmMeshBtn.innerText = texteOriginal;
        confirmMeshBtn.style.background = "#ff8c00"; // Retour à l'orange
    }, 1500);
});

// L'événement "input" permet un envoi en direct pendant que tu glisses le curseur
sizeSlider.addEventListener("input", (event) => {
    const newSize = parseFloat(event.target.value);
    console.log(`changePointSize → ${newSize}`);
    sendModuleCommand(INSTANCE_UUID, "changePointSize", { size: newSize });
});

clipSlider.addEventListener("input", (event) => {
    const height = parseFloat(event.target.value);
    console.log(`changeClippingHeight → ${height}`);
    sendModuleCommand(INSTANCE_UUID, "changeClippingHeight", { height: height });
});


// ==========================================
// 🕹️ CONTRÔLE JOYSTICK 2D (FACE X/Y)
// ==========================================
let isDragging = false;
let joystickRadius = 75; 
let maxCursorDist = joystickRadius - 25; 

function sendJoystickData(x, y) {
    if(joystickValues) joystickValues.innerText = `X: ${x.toFixed(2)} | Y: ${y.toFixed(2)}`;
    sendModuleCommand(INSTANCE_UUID, "moveTree", { dirX: x, dirY: y }); // On envoie X et Y
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
    const normalizedY = -(dy / maxCursorDist); // Inversé pour que pousser en haut = +Y

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
    sendModuleCommand(INSTANCE_UUID, "moveTreeDepth", { dirZ: z }); // On envoie Z
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