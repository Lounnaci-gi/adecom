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
        
        <div class="stat-card">
          <h3>Créance Total Prestations</h3>
          <p class="stat-value" id="creances-prestations-value">
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
              <th>Montant Actifs</th>
              <th>Taux Actifs</th>
              <th>Montant Résiliés</th>
              <th>Taux Résiliés</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td colspan="3" class="text-center">
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
      
      // Charger les créances Prestations
      this.loadCreancesPrestationsData();
      
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
      sessionStorage.removeItem('creancesPrestations');
      
      // Charger les quatre jeux de données en parallèle en forçant le rafraîchissement et mettre à jour l'affichage dès que chaque requête termine
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
        this.updateCreancesEauDisplay(result || 0);
        return result;
      }).catch(error => {
        console.error('Erreur lors du chargement des créances d\'eau:', error);
        this.updateCreancesEauDisplay(0);
        return 0;
      });
      
      // Charger les créances Prestations
      DbfService.getAbonnesCreancesPrestations(true).then(async result => {
        // Sauvegarder dans le sessionStorage
        const cacheData = {
          value: result,
          timestamp: Date.now()
        };
        sessionStorage.setItem('creancesPrestations', JSON.stringify(cacheData));
        
        // Mettre à jour l'affichage
        this.updateCreancesPrestationsDisplay(result || 0);
        return result;
      }).catch(error => {
        console.error('Erreur lors du chargement des créances Prestations:', error);
        this.updateCreancesPrestationsDisplay(0);
        return 0;
      });
      
      const creancesPrestationsPromise = DbfService.getAbonnesCreancesPrestations(true).then(async result => {
        // Sauvegarder dans le sessionStorage
        const cacheData = {
          value: result,
          timestamp: Date.now()
        };
        sessionStorage.setItem('creancesPrestations', JSON.stringify(cacheData));
        
        // Mettre à jour l'affichage
        this.updateCreancesPrestationsDisplay(result || 0);
        return result;
      }).catch(error => {
        console.error('Erreur lors du chargement des créances Prestations:', error);
        this.updateCreancesPrestationsDisplay(0);
        return 0;
      });
      
      // Attendre que les requêtes soient terminées (pour la gestion des erreurs globale)
      await Promise.all([creancesPromise, creancesResiliesPromise, creancesEauPromise, creancesPrestationsPromise]);
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
  
  private async loadCreancesPrestationsData(): Promise<void> {
    try {
      // Vérifier si les données sont dans le sessionStorage
      const cachedData = sessionStorage.getItem('creancesPrestations');
      if (cachedData) {
        const data = JSON.parse(cachedData);
        // Vérifier si les données ne sont pas expirées (5 minutes)
        if (Date.now() - data.timestamp < 5 * 60 * 1000) {
          this.updateCreancesPrestationsDisplay(data.value);
          return;
        }
      }

      // Charger les données depuis le service
      const creancesPrestations = await DbfService.getAbonnesCreancesPrestations();
      
      // Sauvegarder dans le sessionStorage
      const cacheData = {
        value: creancesPrestations,
        timestamp: Date.now()
      };
      sessionStorage.setItem('creancesPrestations', JSON.stringify(cacheData));
      
      // Mettre à jour l'affichage
      this.updateCreancesPrestationsDisplay(creancesPrestations);
    } catch (error) {
      console.error('Erreur lors du chargement des créances Prestations:', error);
      this.updateCreancesPrestationsDisplay(0);
    }
  }

  private async loadCreancesPrestationsDataForce(): Promise<void> {
    try {
      // Supprimer les données du cache
      sessionStorage.removeItem('creancesPrestations');
      
      // Charger les données depuis le service en forçant le rafraîchissement
      const creancesPrestations = await DbfService.getAbonnesCreancesPrestations(true);
      
      // Sauvegarder dans le sessionStorage
      const cacheData = {
        value: creancesPrestations,
        timestamp: Date.now()
      };
      sessionStorage.setItem('creancesPrestations', JSON.stringify(cacheData));
      
      // Mettre à jour l'affichage
      this.updateCreancesPrestationsDisplay(creancesPrestations);
    } catch (error) {
      console.error('Erreur lors du chargement des créances Prestations:', error);
      this.updateCreancesPrestationsDisplay(0);
    }
  }

  private updateCreancesPrestationsDisplay(value: number): void {
    const creancesPrestationsElement = this.container.querySelector('#creances-prestations-value');
    if (creancesPrestationsElement) {
      creancesPrestationsElement.innerHTML = this.formatCurrency(value);
    }
  }

  private updateCreancesPrestationsDisplayLoading(): void {
    const creancesPrestationsElement = this.container.querySelector('#creances-prestations-value');
    if (creancesPrestationsElement) {
      creancesPrestationsElement.innerHTML = '<span class="loading-spinner"></span>';
    }
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
      // Charger les créances par catégorie sans attendre la fin pour afficher le résultat
      DbfService.getAbonnesCreancesParCategorie().then(creancesParCategorie => {
        this.updateCreancesParCategorieDisplay(creancesParCategorie);
      }).catch(error => {
        console.error('Erreur lors du chargement des créances par catégorie:', error);
        this.updateCreancesParCategorieDisplay([]);
      });
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
            <td colspan="3" class="text-center">Aucune donnée disponible</td>
          </tr>
        `;
      } else {
        let rows = '';
        creances.forEach(item => {
          // Renommer les catégories selon les spécifications
          let categorieLibelle = item.categorie;
          switch(item.categorie) {
            case '1':
              categorieLibelle = 'Cat I';
              break;
            case '2':
              categorieLibelle = 'Cat II';
              break;
            case '3':
              categorieLibelle = 'Cat III';
              break;
            case '4':
              categorieLibelle = 'Cat IV';
              break;
            case '15':
              categorieLibelle = 'Vente en gros';
              break;
            case 'Cat III Résiliés':
              categorieLibelle = 'Cat III Résiliés';
              break;
            case 'Cat II Résiliés':
              categorieLibelle = 'Cat II Résiliés';
              break;
            case 'Cat IV Résiliés':
              categorieLibelle = 'Cat IV Résiliés';
              break;
            case 'Cat I Résiliés':
              categorieLibelle = 'Cat I Résiliés';
              break;
            case 'Vente en Gros Résiliés':
              categorieLibelle = 'Vente en Gros Résiliés';
              break;
            case 'Prestations Résiliés':
              categorieLibelle = 'Prestations Résiliés';
              break;
            default:
              categorieLibelle = item.categorie;
              break;
          }
          
          // Formater les montants et taux
          const montantActifs = item.montantActifs !== undefined ? parseFloat(item.montantActifs) : 0;
          const tauxActifs = item.tauxActifs !== undefined ? item.tauxActifs.toFixed(2) : '0.00';
          const montantResilies = item.montantResilies !== undefined ? parseFloat(item.montantResilies) : 0;
          const tauxResilies = item.tauxResilies !== undefined ? item.tauxResilies.toFixed(2) : '0.00';
          
          rows += `
            <tr>
              <td>${categorieLibelle}</td>
              <td>${montantActifs.toLocaleString('fr-FR', { 
                style: 'currency', 
                currency: 'DZD',
                minimumFractionDigits: 2,
                maximumFractionDigits: 2
              })}</td>
              <td>${tauxActifs}%</td>
              <td>${montantResilies.toLocaleString('fr-FR', { 
                style: 'currency', 
                currency: 'DZD',
                minimumFractionDigits: 2,
                maximumFractionDigits: 2
              })}</td>
              <td>${tauxResilies}%</td>
            </tr>
          `;
        });
        
        // Calculer les sous-totaux
        const totalActifs = creances.reduce((sum, item) => sum + (item.montantActifs || 0), 0);
        const totalResilies = creances.reduce((sum, item) => sum + (item.montantResilies || 0), 0);
        const grandTotal = totalActifs + totalResilies;
        
        // Calculer les pourcentages
        const pourcentageActifs = grandTotal > 0 ? (totalActifs / grandTotal) * 100 : 0;
        const pourcentageResilies = grandTotal > 0 ? (totalResilies / grandTotal) * 100 : 0;
        
        // Ajouter les sous-totaux au tableau
        rows += `
          <tr class="table-subtotal-row" style="background-color: #f8f9fa; border-top: 2px solid #dee2e6;">
            <td colspan="1" class="text-end font-weight-bold" style="background-color: #e9ecef;">Sous-totaux:</td>
            <td class="font-weight-bold">${totalActifs.toLocaleString('fr-FR', { 
              style: 'currency', 
              currency: 'DZD',
              minimumFractionDigits: 2,
              maximumFractionDigits: 2
            })}</td>
            <td class="font-weight-bold">${pourcentageActifs.toFixed(2)}%</td>
            <td class="font-weight-bold">${totalResilies.toLocaleString('fr-FR', { 
              style: 'currency', 
              currency: 'DZD',
              minimumFractionDigits: 2,
              maximumFractionDigits: 2
            })}</td>
            <td class="font-weight-bold">${pourcentageResilies.toFixed(2)}%</td>
          </tr>
          <tr class="table-grandtotal-row" style="background-color: #e9ecef; border-top: 3px solid #007bff; border-bottom: 3px solid #007bff;">
            <td colspan="1" class="text-end font-weight-bold" style="background-color: #dee2e6;">Total Général:</td>
            <td colspan="1" class="font-weight-bold">${grandTotal.toLocaleString('fr-FR', { 
              style: 'currency', 
              currency: 'DZD',
              minimumFractionDigits: 2,
              maximumFractionDigits: 2
            })}</td>
            <td class="font-weight-bold">100.00%</td>
            <td colspan="2" class="font-weight-bold"></td>
          </tr>
        `;
        
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