// SettingsView.ts
import { DbfService } from '../services/dbfService';

export class SettingsView {
  private container: HTMLElement;
  private currentDbfPath: string = 'D:/epeor';

  constructor() {
    this.container = document.createElement('div');
    this.container.className = 'settings-view';
    this.loadCurrentDbfPath();
    this.render();
    this.attachEventListeners();
  }

  private async loadCurrentDbfPath(): Promise<void> {
    try {
      this.currentDbfPath = await DbfService.getDbfPath();
    } catch (error) {
      console.error('Erreur lors du chargement du chemin DBF:', error);
    }
  }

  private render(): void {
    this.container.innerHTML = `
      <div class="settings-header">
        <h2>Paramètres</h2>
        <p>Configuration de l'application</p>
      </div>
      
      <div class="settings-sections">
        <div class="settings-card">
          <h3>Configuration Générale</h3>
          <div class="setting-item">
            <label for="appName">Nom de l'application</label>
            <input type="text" id="appName" value="Mon Application" class="form-control">
          </div>
          
          <div class="setting-item">
            <label for="language">Langue</label>
            <select id="language" class="form-control">
              <option value="fr">Français</option>
              <option value="en">Anglais</option>
              <option value="es">Espagnol</option>
            </select>
          </div>
          
          <button class="btn btn-primary">Enregistrer</button>
        </div>
        
        <div class="settings-card">
          <h3>Connexion DBF</h3>
          <div class="setting-item">
            <label for="dbfPath">Chemin du dossier DBF</label>
            <div class="input-group">
              <input type="text" id="dbfPath" value="${this.currentDbfPath}" class="form-control">
              <button id="browseFolderBtn" class="btn btn-secondary">Parcourir</button>
            </div>
          </div>
          
          <div class="setting-item">
            <label for="autoRefresh">Actualisation automatique</label>
            <input type="checkbox" id="autoRefresh" checked>
          </div>
          
          <button id="testConnectionBtn" class="btn btn-primary">Tester la connexion</button>
        </div>
        
        <div class="settings-card">
          <h3>Interface</h3>
          <div class="setting-item">
            <label for="theme">Thème</label>
            <select id="theme" class="form-control">
              <option value="light">Clair</option>
              <option value="dark" selected>Sombre</option>
            </select>
          </div>
          
          <div class="setting-item">
            <label for="sidebarCollapsed">Barre latérale réduite</label>
            <input type="checkbox" id="sidebarCollapsed">
          </div>
          
          <button class="btn btn-primary">Appliquer</button>
        </div>
      </div>
    `;
  }

  private attachEventListeners(): void {
    // Attacher l'événement pour le bouton Parcourir
    const browseBtn = this.container.querySelector('#browseFolderBtn');
    if (browseBtn) {
      browseBtn.addEventListener('click', () => {
        this.browseFolder();
      });
    }
    
    // Attacher l'événement pour le bouton Tester la connexion
    const testBtn = this.container.querySelector('#testConnectionBtn');
    if (testBtn) {
      testBtn.addEventListener('click', () => {
        this.testConnection();
      });
    }
  }

  private browseFolder(): void {
    // Afficher un message d'information puisqu'on ne peut pas ouvrir un dialogue de fichier dans le navigateur
    const dbfPathInput = this.container.querySelector('#dbfPath') as HTMLInputElement;
    if (dbfPathInput) {
      const newPath = prompt("Veuillez entrer le chemin du dossier DBF:", this.currentDbfPath);
      if (newPath !== null) {
        dbfPathInput.value = newPath;
        this.currentDbfPath = newPath;
      }
    }
  }
  
  private async testConnection(): Promise<void> {
    const dbfPathInput = this.container.querySelector('#dbfPath') as HTMLInputElement;
    if (!dbfPathInput) return;
    
    const testBtn = this.container.querySelector('#testConnectionBtn') as HTMLButtonElement;
    if (!testBtn) return;
    
    const originalText = testBtn.textContent;
    testBtn.textContent = 'Test en cours...';
    testBtn.disabled = true;
    
    try {
      const dbfPath = dbfPathInput.value;
      if (!dbfPath) {
        alert('Veuillez entrer un chemin de dossier DBF.');
        return;
      }
      
      // Mettre à jour le chemin DBF
      const success = await DbfService.updateDbfPath(dbfPath);
      
      if (success) {
        alert('Connexion réussie! Le chemin du dossier DBF a été mis à jour.');
        this.currentDbfPath = dbfPath;
      } else {
        alert('Échec de la mise à jour du chemin du dossier DBF.');
      }
    } catch (error) {
      console.error('Erreur lors du test de connexion:', error);
      alert('Erreur lors du test de connexion: ' + (error as Error).message);
    } finally {
      testBtn.textContent = originalText;
      testBtn.disabled = false;
    }
  }

  public getElement(): HTMLElement {
    return this.container;
  }
}