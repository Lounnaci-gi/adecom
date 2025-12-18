// SettingsView.ts
export class SettingsView {
  private container: HTMLElement;

  constructor() {
    this.container = document.createElement('div');
    this.container.className = 'settings-view';
    this.render();
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
            <input type="text" id="appName" value="Mon Application">
          </div>
          
          <div class="setting-item">
            <label for="language">Langue</label>
            <select id="language">
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
            <input type="text" id="dbfPath" value="D:/epeor">
          </div>
          
          <div class="setting-item">
            <label for="autoRefresh">Actualisation automatique</label>
            <input type="checkbox" id="autoRefresh" checked>
          </div>
          
          <button class="btn btn-primary">Tester la connexion</button>
        </div>
        
        <div class="settings-card">
          <h3>Interface</h3>
          <div class="setting-item">
            <label for="theme">Thème</label>
            <select id="theme">
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

  public getElement(): HTMLElement {
    return this.container;
  }
}