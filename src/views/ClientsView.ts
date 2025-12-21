// ClientsView.ts
import { DbfService } from '../services/dbfService';

export class ClientsView {
  private container: HTMLElement;

  constructor() {
    this.container = document.createElement('div');
    this.container.className = 'clients-view';
    this.render();
    this.loadCreancesData();
    this.loadCreancesResiliesData();
    this.setupEventListeners();
  }

  private render(): void {
    this.container.innerHTML = `
      <div class="clients-header">
        <h2>Portefeuille Abonnés</h2>
        <p>Module de gestion du portefeuille des abonnés</p>
      </div>
      
      <div class="clients-stats">
        <div class="stat-card">
          <h3>Total Abonnés</h3>
          <p class="stat-value">128</p>
        </div>
        
        <div class="stat-card">
          <h3>Abonnés Actifs</h3>
          <p class="stat-value">96</p>
        </div>
        

        
        <div class="stat-card">
          <h3>Créances Abonnés</h3>
          <p class="stat-value" id="creances-value">Chargement...</p>
        </div>
        
        <div class="stat-card">
          <h3>Créances Abonnés Résiliés</h3>
          <p class="stat-value" id="creances-resilies-value">Chargement...</p>
        </div>
      </div>
      
      <div class="clients-actions">
        <button class="btn btn-primary">Nouvel Abonné</button>
        <button class="btn btn-secondary">Importer Abonnés</button>
      </div>
      
      <div class="clients-table-container">
        <table class="clients-table">
          <thead>
            <tr>
              <th>Code</th>
              <th>Nom</th>
              <th>Type</th>
              <th>Téléphone</th>
              <th>Email</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>A001</td>
              <td>Entreprise ABC</td>
              <td>Professionnel</td>
              <td>01 23 45 67 89</td>
              <td>contact@abc.com</td>
              <td>
                <button class="btn btn-small btn-secondary">Modifier</button>
                <button class="btn btn-small btn-danger">Supprimer</button>
              </td>
            </tr>
            <tr>
              <td>A002</td>
              <td>M. Dupont</td>
              <td>Particulier</td>
              <td>06 12 34 56 78</td>
              <td>dupont@email.com</td>
              <td>
                <button class="btn btn-small btn-secondary">Modifier</button>
                <button class="btn btn-small btn-danger">Supprimer</button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    `;
  }

  private async loadCreancesData(): Promise<void> {
    try {
      // Vérifier si les données sont dans le sessionStorage
      const cachedData = sessionStorage.getItem('creancesAbonnes');
      if (cachedData) {
        const data = JSON.parse(cachedData);
        // Vérifier si les données ne sont pas expirées (5 minutes)
        if (Date.now() - data.timestamp < 5 * 60 * 1000) {
          this.updateCreancesDisplay(data.value);
          return;
        }
      }

      // Charger les données depuis le service
      const creances = await DbfService.getAbonnesCreances();
      
      // Sauvegarder dans le sessionStorage
      const cacheData = {
        value: creances,
        timestamp: Date.now()
      };
      sessionStorage.setItem('creancesAbonnes', JSON.stringify(cacheData));
      
      // Mettre à jour l'affichage
      this.updateCreancesDisplay(creances);
    } catch (error) {
      console.error('Erreur lors du chargement des créances:', error);
      this.updateCreancesDisplay(0);
    }
  }

  private updateCreancesDisplay(value: number): void {
    const creancesElement = this.container.querySelector('#creances-value');
    if (creancesElement) {
      creancesElement.textContent = value.toLocaleString('fr-FR', { 
        style: 'currency', 
        currency: 'DZD',
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
      });
    }
  }

  private setupEventListeners(): void {
    // Écouter l'événement de rafraîchissement
    window.addEventListener('refreshData', () => {
      this.refreshCreancesData();
    });
  }

  private refreshCreancesData(): void {
    // Afficher l'état de chargement
    this.updateCreancesDisplayLoading();
    this.updateCreancesResiliesDisplayLoading();
    
    // Recharger les données en forçant le rafraîchissement
    this.loadCreancesDataForce();
    this.loadCreancesResiliesDataForce();
  }

  private async loadCreancesDataForce(): Promise<void> {
    try {
      // Supprimer les données du cache
      sessionStorage.removeItem('creancesAbonnes');
      
      // Charger les données depuis le service en forçant le rafraîchissement
      const creances = await DbfService.getAbonnesCreances(true);
      
      // Sauvegarder dans le sessionStorage
      const cacheData = {
        value: creances,
        timestamp: Date.now()
      };
      sessionStorage.setItem('creancesAbonnes', JSON.stringify(cacheData));
      
      // Mettre à jour l'affichage
      this.updateCreancesDisplay(creances);
    } catch (error) {
      console.error('Erreur lors du chargement des créances:', error);
      this.updateCreancesDisplay(0);
    }
  }

  private async loadCreancesResiliesData(): Promise<void> {
    try {
      // Vérifier si les données sont dans le sessionStorage
      const cachedData = sessionStorage.getItem('creancesResilies');
      if (cachedData) {
        const data = JSON.parse(cachedData);
        // Vérifier si les données ne sont pas expirées (5 minutes)
        if (Date.now() - data.timestamp < 5 * 60 * 1000) {
          this.updateCreancesResiliesDisplay(data.value);
          return;
        }
      }

      // Charger les données depuis le service
      const creancesResilies = await DbfService.getAbonnesCreancesResilies();
      
      // Sauvegarder dans le sessionStorage
      const cacheData = {
        value: creancesResilies,
        timestamp: Date.now()
      };
      sessionStorage.setItem('creancesResilies', JSON.stringify(cacheData));
      
      // Mettre à jour l'affichage
      this.updateCreancesResiliesDisplay(creancesResilies);
    } catch (error) {
      console.error('Erreur lors du chargement des créances des abonnés résiliés:', error);
      this.updateCreancesResiliesDisplay(0);
    }
  }

  private async loadCreancesResiliesDataForce(): Promise<void> {
    try {
      // Supprimer les données du cache
      sessionStorage.removeItem('creancesResilies');
      
      // Charger les données depuis le service en forçant le rafraîchissement
      const creancesResilies = await DbfService.getAbonnesCreancesResilies(true);
      
      // Sauvegarder dans le sessionStorage
      const cacheData = {
        value: creancesResilies,
        timestamp: Date.now()
      };
      sessionStorage.setItem('creancesResilies', JSON.stringify(cacheData));
      
      // Mettre à jour l'affichage
      this.updateCreancesResiliesDisplay(creancesResilies);
    } catch (error) {
      console.error('Erreur lors du chargement des créances des abonnés résiliés:', error);
      this.updateCreancesResiliesDisplay(0);
    }
  }

  private updateCreancesDisplayLoading(): void {
    const creancesElement = this.container.querySelector('#creances-value');
    if (creancesElement) {
      creancesElement.textContent = 'Chargement...';
    }
  }

  private updateCreancesResiliesDisplay(value: number): void {
    const creancesResiliesElement = this.container.querySelector('#creances-resilies-value');
    if (creancesResiliesElement) {
      creancesResiliesElement.textContent = value.toLocaleString('fr-FR', { 
        style: 'currency', 
        currency: 'DZD',
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
      });
    }
  }

  private updateCreancesResiliesDisplayLoading(): void {
    const creancesResiliesElement = this.container.querySelector('#creances-resilies-value');
    if (creancesResiliesElement) {
      creancesResiliesElement.textContent = 'Chargement...';
    }
  }

  public getElement(): HTMLElement {
    return this.container;
  }
}