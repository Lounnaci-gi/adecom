import './style.css'
import typescriptLogo from './typescript.svg'
import viteLogo from '/vite.svg'
import { setupCounter } from './counter.ts'

// Importer la configuration
import config from './config';

// Importer l'API
import { getDbfFiles } from './api';

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
  // Mettre à jour l'interface utilisateur
  document.querySelector<HTMLDivElement>('#app')!.innerHTML = `
    <div>
      <a href="https://vite.dev" target="_blank">
        <img src="${viteLogo}" class="logo" alt="Vite logo" />
      </a>
      <a href="https://www.typescriptlang.org/" target="_blank">
        <img src="${typescriptLogo}" class="logo vanilla" alt="TypeScript logo" />
      </a>
      <h1>Vite + TypeScript</h1>
      <div class="connection-status">
        <span class="status-text">Connexion DBF: </span>
        <span class="status-icon ${dbfConnectionStatus ? 'success' : 'error'}"></span>
        <span class="status-label">${dbfConnectionStatus ? 'Connecté' : 'Déconnecté'}</span>
      </div>
      <div class="card">
        <button id="counter" type="button"></button>
      </div>
      <p class="read-the-docs">
        Click on the Vite and TypeScript logos to learn more
      </p>
    </div>
  `

  setupCounter(document.querySelector<HTMLButtonElement>('#counter')!)
});
