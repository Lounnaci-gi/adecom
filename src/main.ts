import './style.css'
import typescriptLogo from './typescript.svg'
import viteLogo from '/vite.svg'
import { setupCounter } from './counter.ts'

// Importer la configuration
import config from './config';

// Importer l'API
import { getDbfFiles } from './api';

// Importer la vue principale
import { MainView } from './views/MainView';

// État de la connexion
let dbfConnectionStatus = false;
let dbfFiles: string[] = [];

// Vérifier la connexion DBF au démarrage
async function checkDbfConnection() {
  console.log('Vérification de la connexion DBF...');
  
  try {
    const result = await getDbfFiles();
    if (result.files) {
      console.log('✅ Connexion au serveur DBF réussie');
      console.log('📁 Dossier:', result.folderPath);
      console.log('📄 Fichiers DBF trouvés:', result.dbfFiles);
      dbfConnectionStatus = true;
      dbfFiles = result.files;
    } else {
      console.log('❌ Réponse inattendue du serveur');
      dbfConnectionStatus = false;
    }
  } catch (error) {
    console.log('❌ Impossible de se connecter au serveur DBF');
    console.log('Erreur:', error);
    dbfConnectionStatus = false;
  }
}

// Initialiser la vérification
checkDbfConnection().then(() => {
  // Créer la vue principale avec navbar et dashboard
  const mainView = new MainView();
  
  // Mettre à jour l'interface utilisateur avec le statut de connexion
  const connectionStatusDiv = document.createElement('div');
  connectionStatusDiv.className = 'connection-status-popup';
  connectionStatusDiv.innerHTML = `
    <div class="connection-status-content">
      <span class="status-text">Connexion DBF: </span>
      <span class="status-icon ${dbfConnectionStatus ? 'success' : 'error'}"></span>
      <span class="status-label">${dbfConnectionStatus ? 'Connecté' : 'Déconnecté'}</span>
    </div>
  `;
  
  document.body.appendChild(connectionStatusDiv);
});