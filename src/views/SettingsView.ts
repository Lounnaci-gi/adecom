// SettingsView.ts
import { DbfService } from '../services/dbfService';

export class SettingsView {
  private container: HTMLElement;
  private currentDbfPath: string = 'D:/epeor';
  private centres: { code: string; libelle: string }[] = [];

  constructor() {
    this.container = document.createElement('div');
    this.container.className = 'settings-view';
    this.initialize();
  }

  private async initialize(): Promise<void> {
    await this.loadCurrentDbfPath();
    await this.loadCentresList();
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

  private async loadCentresList(): Promise<void> {
    try {
      this.centres = await DbfService.getCentresList();
    } catch (error) {
      console.error('Erreur lors du chargement de la liste des centres:', error);
    }
  }

  private render(): void {
    // Générer les options de la liste déroulante des centres
    const centresOptions = this.centres.map(centre => 
      `<option value="${centre.code}">${centre.code} - ${centre.libelle}</option>`
    ).join('\n');
    
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
          
          <div class="setting-item">
            <label for="centreSelection">Centre</label>
            <select id="centreSelection" class="form-control">
              <option value="">Sélectionnez un centre</option>
              ${centresOptions}
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
            <label for="centreDbfSelection">Centre</label>
            <select id="centreDbfSelection" class="form-control">
              <option value="">Sélectionnez un centre</option>
              ${centresOptions}
            </select>
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
    
    // Attacher l'événement pour la liste déroulante des centres (Paramètres)
    const centreSelection = this.container.querySelector('#centreSelection') as HTMLSelectElement;
    console.log('Élément centreSelection trouvé:', centreSelection);
    if (centreSelection) {
      centreSelection.addEventListener('change', async (event) => {
        const selectedValue = (event.target as HTMLSelectElement).value;
        console.log('Centre sélectionné (Paramètres):', selectedValue);
        if (selectedValue) {
          // Enregistrer le centre sélectionné dans le fichier .env
          try {
            const success = await DbfService.saveCentreToEnv(selectedValue);
            if (success) {
              console.log('Centre enregistré dans .env avec succès');
            } else {
              console.error('Échec de l\'enregistrement du centre dans .env');
            }
          } catch (error) {
            console.error('Erreur lors de l\'enregistrement du centre dans .env:', error);
          }
        }
      });
    }
    
    // Attacher l'événement pour la liste déroulante des centres (Connexion DBF)
    const centreDbfSelection = this.container.querySelector('#centreDbfSelection') as HTMLSelectElement;
    console.log('Élément centreDbfSelection trouvé:', centreDbfSelection);
    if (centreDbfSelection) {
      centreDbfSelection.addEventListener('change', async (event) => {
        const selectedValue = (event.target as HTMLSelectElement).value;
        console.log('Centre sélectionné (Connexion DBF):', selectedValue);
        if (selectedValue) {
          // Enregistrer le centre sélectionné dans le fichier .env
          try {
            const success = await DbfService.saveCentreToEnv(selectedValue);
            if (success) {
              console.log('Centre enregistré dans .env avec succès');
            } else {
              console.error('Échec de l\'enregistrement du centre dans .env');
            }
          } catch (error) {
            console.error('Erreur lors de l\'enregistrement du centre dans .env:', error);
          }
        }
      });
    }
  }

  private async browseFolder(): Promise<void> {
    // Vérifier si l'API File System Access est disponible (Chrome 86+)
    if ('showDirectoryPicker' in window) {
      try {
        // Utiliser l'API moderne de sélection de dossier
        const dirHandle = await (window as any).showDirectoryPicker();
        
        // Obtenir le chemin du dossier (si possible)
        if (dirHandle && dirHandle.name) {
          // Note: Pour des raisons de sécurité, l'API ne donne pas le chemin complet
          // Mais on peut utiliser le handle pour accéder aux fichiers
          
          // Pour notre cas, on utilisera le dialogue personnalisé avec le nom du dossier comme suggestion
          const suggestedPath = this.currentDbfPath.replace(/[^\/]*$/, dirHandle.name);
          this.showCustomDialog(suggestedPath);
        }
      } catch (error) {
        // L'utilisateur a annulé ou l'API n'est pas disponible
        console.log('API File System Access non disponible ou annulée');
        this.showCustomDialog();
      }
    } else {
      // Fallback: utiliser le dialogue personnalisé
      this.showCustomDialog();
    }
  }
  
  private showCustomDialog(suggestedPath?: string): void {
    // Créer un dialogue modal pour sélectionner le dossier
    this.createFolderDialog(suggestedPath);
  }
  
  private createFolderDialog(suggestedPath?: string): void {
    // Créer le fond du dialogue (overlay)
    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay';
    
    // Créer le contenu du dialogue
    const dialog = document.createElement('div');
    dialog.className = 'folder-dialog';
    dialog.innerHTML = `
      <div class="dialog-header">
        <h3>Sélectionner un dossier</h3>
        <button class="dialog-close" id="closeDialogBtn">&times;</button>
      </div>
      <div class="dialog-body">
        <div class="folder-browser">
          <div class="folder-path">
            <input type="text" id="folderPathInput" value="${suggestedPath || this.currentDbfPath}" class="form-control" placeholder="Entrez le chemin du dossier">
          </div>
          <div class="folder-examples">
            <p>Exemples de chemins :</p>
            <ul>
              <li>C:/databases/epeor</li>
              <li>D:/data/dbf</li>
              <li>F:/epeor</li>
            </ul>
          </div>
        </div>
      </div>
      <div class="dialog-footer">
        <button class="btn btn-secondary" id="cancelDialogBtn">Annuler</button>
        <button class="btn btn-primary" id="confirmDialogBtn">Confirmer</button>
      </div>
    `;
    
    // Ajouter le dialogue au document
    overlay.appendChild(dialog);
    document.body.appendChild(overlay);
    
    // Attacher les événements
    this.attachDialogEvents(overlay);
  }
  
  private attachDialogEvents(overlay: HTMLElement): void {
    // Fermer le dialogue
    const closeBtn = overlay.querySelector('#closeDialogBtn');
    const cancelBtn = overlay.querySelector('#cancelDialogBtn');
    const confirmBtn = overlay.querySelector('#confirmDialogBtn');
    const folderPathInput = overlay.querySelector('#folderPathInput') as HTMLInputElement;
    
    const closeDialog = () => {
      document.body.removeChild(overlay);
    };
    
    if (closeBtn) {
      closeBtn.addEventListener('click', closeDialog);
    }
    
    if (cancelBtn) {
      cancelBtn.addEventListener('click', closeDialog);
    }
    
    if (confirmBtn) {
      confirmBtn.addEventListener('click', async () => {
        if (folderPathInput) {
          const newPath = folderPathInput.value.trim();
          if (newPath) {
            const dbfPathInput = this.container.querySelector('#dbfPath') as HTMLInputElement;
            if (dbfPathInput) {
              dbfPathInput.value = newPath;
              this.currentDbfPath = newPath;
              
              // Enregistrer le chemin dans le fichier .env
              try {
                const success = await DbfService.saveDbfPathToEnv(newPath);
                if (success) {
                  console.log('Chemin enregistré dans .env avec succès');
                } else {
                  console.error('Échec de l\'enregistrement du chemin dans .env');
                }
              } catch (error) {
                console.error('Erreur lors de l\'enregistrement du chemin dans .env:', error);
              }
            }
          }
        }
        closeDialog();
      });
    }
    
    // Fermer en cliquant en dehors du dialogue
    overlay.addEventListener('click', (event) => {
      if (event.target === overlay) {
        closeDialog();
      }
    });
    
    // Fermer avec la touche Échap
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        closeDialog();
        document.removeEventListener('keydown', handleKeyDown);
      }
    };
    
    document.addEventListener('keydown', handleKeyDown);
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