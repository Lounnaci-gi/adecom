// ClientsView.ts
import { DbfService } from '../services/dbfService';

export class ClientsView {
  private container: HTMLElement;
    private creancesEau: number = 0;

  constructor() {
    this.container = document.createElement('div');
    this.container.className = 'clients-view';
    this.render();
    this.loadAllCreancesData();
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
          <h3>Créances Total</h3>
          <p class="stat-value" id="creances-value">
            <span class="loading-spinner"></span>
          </p>
        </div>
        
        <div class="stat-card">
          <h3>Créances Total Résiliés</h3>
          <p class="stat-value" id="creances-resilies-value">
            <span class="loading-spinner"></span>
          </p>
        </div>
        
        <div class="stat-card">
          <h3>Créance Total Eau</h3>
          <p class="stat-value" id="creances-eau-value">
            <span class="loading-spinner"></span>
          </p>
        </div>
      </div>
      
      <div class="clients-table-container">
        <h3>Créances par Catégorie</h3>
        <table class="clients-table" id="creances-categorie-table">
          <thead>
            <tr>
              <th>Catégorie</th>
              <th>Montant</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td colspan="2" class="text-center">
                <span class="loading-spinner"></span>
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
      creancesElement.innerHTML = this.formatCurrency(value);
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
    this.loadAllCreancesDataForce();
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
  
  private async loadCreancesEauData(): Promise<void> {
    try {
      // Vérifier si les données sont dans le sessionStorage
      const cachedData = sessionStorage.getItem('creancesEau');
      if (cachedData) {
        const data = JSON.parse(cachedData);
        // Vérifier si les données ne sont pas expirées (5 minutes)
        if (Date.now() - data.timestamp < 5 * 60 * 1000) {
          this.updateCreancesEauDisplay(data.value);
          return;
        }
      }

      // Charger les données depuis le service
      const creancesEau = await DbfService.getAbonnesCreancesEau();
      
      // Sauvegarder dans le sessionStorage
      const cacheData = {
        value: creancesEau,
        timestamp: Date.now()
      };
      sessionStorage.setItem('creancesEau', JSON.stringify(cacheData));
      
      // Mettre à jour l'affichage
      this.updateCreancesEauDisplay(creancesEau);
    } catch (error) {
      console.error('Erreur lors du chargement des créances Eau:', error);
      this.updateCreancesEauDisplay(0);
    }
  }
  
  private async loadCreancesEauDataForce(): Promise<void> {
    try {
      // Supprimer les données du cache
      sessionStorage.removeItem('creancesEau');
      
      // Charger les données depuis le service en forçant le rafraîchissement
      const creancesEau = await DbfService.getAbonnesCreancesEau(true);
      
      // Sauvegarder dans le sessionStorage
      const cacheData = {
        value: creancesEau,
        timestamp: Date.now()
      };
      sessionStorage.setItem('creancesEau', JSON.stringify(cacheData));
      
      // Mettre à jour l'affichage
      this.updateCreancesEauDisplay(creancesEau);
    } catch (error) {
      console.error('Erreur lors du chargement des créances Eau:', error);
      this.updateCreancesEauDisplay(0);
    }
  }

  private async loadAllCreancesData(): Promise<void> {
    try {
      // Charger les trois jeux de données en parallèle et mettre à jour l'affichage dès que chaque requête termine
      const creancesPromise = this.loadCreancesDataPromise().then(result => {
        this.updateCreancesDisplay(result);
        return result;
      }).catch(error => {
        console.error('Erreur lors du chargement des créances:', error);
        this.updateCreancesDisplay(0);
        return 0;
      });
      
      const creancesResiliesPromise = this.loadCreancesResiliesDataPromise().then(result => {
        this.updateCreancesResiliesDisplay(result);
        return result;
      }).catch(error => {
        console.error('Erreur lors du chargement des créances résiliées:', error);
        this.updateCreancesResiliesDisplay(0);
        return 0;
      });
      
      const creancesEauPromise = this.loadCreancesEauDataPromise().then(result => {
        this.updateCreancesEauDisplay(result);
        return result;
      }).catch(error => {
        console.error('Erreur lors du chargement des créances d\'eau:', error);
        this.updateCreancesEauDisplay(0);
        return 0;
      });
      
      // Charger les créances par catégorie
      this.loadCreancesParCategorie();
      
      // Attendre que les trois requêtes soient terminées (pour la gestion des erreurs globale)
      await Promise.all([creancesPromise, creancesResiliesPromise, creancesEauPromise]);
    } catch (error) {
      console.error('Erreur lors du chargement des créances:', error);
      // Les erreurs individuelles sont déjà gérées dans les promesses
    }
  }

  private async loadAllCreancesDataForce(): Promise<void> {
    try {
      // Supprimer les données du cache
      sessionStorage.removeItem('creancesAbonnes');
      sessionStorage.removeItem('creancesResilies');
      sessionStorage.removeItem('creancesEau');
      
      // Charger les trois jeux de données en parallèle en forçant le rafraîchissement et mettre à jour l'affichage dès que chaque requête termine
      const creancesPromise = DbfService.getAbonnesCreances(true).then(async result => {
        // Sauvegarder dans le sessionStorage
        const cacheData = {
          value: result,
          timestamp: Date.now()
        };
        sessionStorage.setItem('creancesAbonnes', JSON.stringify(cacheData));
        
        // Mettre à jour l'affichage
        this.updateCreancesDisplay(result);
        return result;
      }).catch(error => {
        console.error('Erreur lors du chargement des créances:', error);
        this.updateCreancesDisplay(0);
        return 0;
      });
      
      const creancesResiliesPromise = DbfService.getAbonnesCreancesResilies(true).then(async result => {
        // Sauvegarder dans le sessionStorage
        const cacheData = {
          value: result,
          timestamp: Date.now()
        };
        sessionStorage.setItem('creancesResilies', JSON.stringify(cacheData));
        
        // Mettre à jour l'affichage
        this.updateCreancesResiliesDisplay(result);
        return result;
      }).catch(error => {
        console.error('Erreur lors du chargement des créances résiliées:', error);
        this.updateCreancesResiliesDisplay(0);
        return 0;
      });
      
      const creancesEauPromise = DbfService.getAbonnesCreancesEau(true).then(async result => {
        // Sauvegarder dans le sessionStorage
        const cacheData = {
          value: result,
          timestamp: Date.now()
        };
        sessionStorage.setItem('creancesEau', JSON.stringify(cacheData));
        
        // Mettre à jour l'affichage
        this.updateCreancesEauDisplay(result.totalCreancesEau || 0);
        return result;
      }).catch(error => {
        console.error('Erreur lors du chargement des créances d\'eau:', error);
        this.updateCreancesEauDisplay(0);
        return 0;
      });
      
      // Attendre que les trois requêtes soient terminées (pour la gestion des erreurs globale)
      await Promise.all([creancesPromise, creancesResiliesPromise, creancesEauPromise]);
    } catch (error) {
      console.error('Erreur lors du chargement des créances:', error);
      // Les erreurs individuelles sont déjà gérées dans les promesses
    }
  }

  private async loadCreancesDataPromise(): Promise<number> {
    // Vérifier si les données sont dans le sessionStorage
    const cachedData = sessionStorage.getItem('creancesAbonnes');
    if (cachedData) {
      const data = JSON.parse(cachedData);
      // Vérifier si les données ne sont pas expirées (5 minutes)
      if (Date.now() - data.timestamp < 5 * 60 * 1000) {
        return data.value;
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
    
    return creances;
  }

  private async loadCreancesResiliesDataPromise(): Promise<number> {
    // Vérifier si les données sont dans le sessionStorage
    const cachedData = sessionStorage.getItem('creancesResilies');
    if (cachedData) {
      const data = JSON.parse(cachedData);
      // Vérifier si les données ne sont pas expirées (5 minutes)
      if (Date.now() - data.timestamp < 5 * 60 * 1000) {
        return data.value;
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
    
    return creancesResilies;
  }
  
  private async loadCreancesEauDataPromise(): Promise<number> {
    // Vérifier si les données sont dans le sessionStorage
    const cachedData = sessionStorage.getItem('creancesEau');
    if (cachedData) {
      const data = JSON.parse(cachedData);
      // Vérifier si les données ne sont pas expirées (5 minutes)
      if (Date.now() - data.timestamp < 5 * 60 * 1000) {
        return data.value;
      }
    }

    // Charger les données depuis le service
    const creancesEau = await DbfService.getAbonnesCreancesEau();
    
    // Sauvegarder dans le sessionStorage
    const cacheData = {
      value: creancesEau,
      timestamp: Date.now()
    };
    sessionStorage.setItem('creancesEau', JSON.stringify(cacheData));
    
    return creancesEau;
  }

  private updateCreancesDisplayLoading(): void {
    const creancesElement = this.container.querySelector('#creances-value');
    if (creancesElement) {
      creancesElement.innerHTML = '<span class="loading-spinner"></span>';
    }
  }

  private updateCreancesResiliesDisplay(value: number): void {
    const creancesResiliesElement = this.container.querySelector('#creances-resilies-value');
    if (creancesResiliesElement) {
      creancesResiliesElement.innerHTML = this.formatCurrency(value);
    }
  }

  private updateCreancesResiliesDisplayLoading(): void {
    const creancesResiliesElement = this.container.querySelector('#creances-resilies-value');
    if (creancesResiliesElement) {
      creancesResiliesElement.innerHTML = '<span class="loading-spinner"></span>';
    }
  }
  
  private updateCreancesEauDisplay(value: number): void {
    const creancesEauElement = this.container.querySelector('#creances-eau-value');
    if (creancesEauElement) {
      creancesEauElement.innerHTML = this.formatCurrency(value);
    }
  }
  
  private updateCreancesEauDisplayLoading(): void {
    const creancesEauElement = this.container.querySelector('#creances-eau-value');
    if (creancesEauElement) {
      creancesEauElement.innerHTML = '<span class="loading-spinner"></span>';
    }
  }

  private async loadCreancesParCategorie(): Promise<void> {
    try {
      const creancesParCategorie = await DbfService.getAbonnesCreancesParCategorie();
      this.updateCreancesParCategorieDisplay(creancesParCategorie);
    } catch (error) {
      console.error('Erreur lors du chargement des créances par catégorie:', error);
      this.updateCreancesParCategorieDisplay([]);
    }
  }

  private updateCreancesParCategorieDisplay(creances: any[]): void {
    const tableBody = this.container.querySelector('#creances-categorie-table tbody');
    if (tableBody) {
      if (creances.length === 0) {
        tableBody.innerHTML = `
          <tr>
            <td colspan="2" class="text-center">Aucune donnée disponible</td>
          </tr>
        `;
      } else {
        let rows = '';
        creances.forEach(item => {
          rows += `
            <tr>
              <td>${item.categorie}</td>
              <td>${parseFloat(item.montant).toLocaleString('fr-FR', { 
                style: 'currency', 
                currency: 'DZD',
                minimumFractionDigits: 2,
                maximumFractionDigits: 2
              })}</td>
            </tr>
          `;
        });
        tableBody.innerHTML = rows;
      }
    }
  }

  private formatCurrency(amount: number): string {
    // Formater le montant avec des espaces comme séparateurs de milliers
    const formattedAmount = amount.toLocaleString('fr-FR', { 
      minimumFractionDigits: 2, 
      maximumFractionDigits: 2 
    });
    
    // Retourner le montant avec le symbole DZD en petit
    return `${formattedAmount} <span class="currency-symbol">DZD</span>`;
  }

  public getElement(): HTMLElement {
    return this.container;
  }
}