// app.js
import ClientNetwork from "./ClientNetwork.js";

const INTERFACE_UUID = "11111111-2222-3333-4444-555555555555"; 
const INSTANCE_UUID = "00000000-0000-0000-0000-000000000000"; 

const network = new ClientNetwork();

const statusDiv = document.getElementById("status");
const connectBtn = document.getElementById("connectBtn");
const flipBtn = document.getElementById("flipBtn");

// gestion de la connexion réseau
connectBtn.addEventListener("click", () => {
    const ip = document.getElementById("ipInput").value;
    const port = document.getElementById("portInput").value;
    
    statusDiv.innerText = "Connexion en cours...";
    network.connect(ip, port);
});

// configurer les écouteurs réseau
network.setCallbacks({
    onOpen: () => {
        statusDiv.innerText = "Statut : Connecté (En attente d'identification)";
        statusDiv.style.color = "#28a745";

        // ÉTAPE CRITIQUE : Ton serveur exige une identification immédiate avec un UUID
        const authMessage = { UUID: INTERFACE_UUID };
        network.send(JSON.stringify(authMessage));
        
        // Optionnel : On s'ajoute à l'instance par défaut du CAVE pour pouvoir lui parler
        setTimeout(() => {
            sendSystemCommand("INSTANCE_JOIN", { 
                instanceUUID: INSTANCE_UUID, 
                userUUID: INTERFACE_UUID 
            });
            statusDiv.innerText = "Statut : Connecté & Prêt !";
        }, 500);
    },
    onClose: () => {
        statusDiv.innerText = "Statut : Déconnecté";
        statusDiv.style.color = "#dc3545";
    },
    onError: () => {
        statusDiv.innerText = "Statut : Erreur Réseau";
        statusDiv.style.color = "#dc3545";
    },
    onMessage: (msg) => {
        console.log("Message reçu du serveur CAVE :", msg);
    }
});

// 2. Fonctions pour formater les messages selon ton ServerManager
function sendSystemCommand(command, data = {}) {
    const message = {
        scope: "SYSTEM",
        senderUUID: INTERFACE_UUID,
        payload: {
            command: command,
            data: data
        }
    };
    network.send(JSON.stringify(message));
}

function sendModuleCommand(moduleUUID, command, data = {}) {
    const message = {
        scope: "MODULE",
        senderUUID: INTERFACE_UUID,
        payload: {
            moduleUUID: moduleUUID,
            command: command,
            data: data
        }
    };
    network.send(JSON.stringify(message));
}

// 3. Liaison avec le bouton de l'interface graphique
flipBtn.addEventListener("click", () => {
    console.log("Envoi de l'ordre : flipEyes");
    // Remplace "MON_MODULE_CAVE_ID" par l'ID réel de ton module de rendu CAVE si nécessaire
    sendModuleCommand("MON_MODULE_CAVE_ID", "flipEyes", {});
});