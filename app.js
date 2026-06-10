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

// Contrôles désactivés jusqu'à la confirmation du join
flipBtn.disabled = true;
meshSelect.disabled = true;
sizeSlider.disabled = true; 

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
                flipBtn.disabled = false;
                meshSelect.disabled = false;
                sizeSlider.disabled = false; 
            }
        } catch (e) {
            console.warn("Message non-JSON reçu :", msg);
        }
    },

    onClose: () => {
        statusDiv.innerText = "Statut : Déconnecté";
        statusDiv.style.color = "#dc3545";
        
        // Désactivation
        flipBtn.disabled = true;
        meshSelect.disabled = true;
        sizeSlider.disabled = true;
    },

    onError: () => {
        statusDiv.innerText = "Statut : Erreur Réseau";
        statusDiv.style.color = "#dc3545";
        
        // Désactivation
        flipBtn.disabled = true;
        meshSelect.disabled = true;
        sizeSlider.disabled = true;
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

// Boutons et contrôles
flipBtn.addEventListener("click", () => {
    console.log("flipEyes →");
    sendModuleCommand(INSTANCE_UUID, "flipEyes", {});
});

meshSelect.addEventListener("change", (event) => {
    const fileName = event.target.value;
    console.log(`changeMesh → ${fileName}`);
    sendModuleCommand(INSTANCE_UUID, "changeMesh", { fileName });
});

// L'événement "input" permet un envoi en direct pendant que tu glisses le curseur
sizeSlider.addEventListener("input", (event) => {
    const newSize = parseFloat(event.target.value);
    console.log(`changePointSize → ${newSize}`);
    sendModuleCommand(INSTANCE_UUID, "changePointSize", { size: newSize });
});