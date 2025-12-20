// Dashboard.ts
import { DbfService } from '../services/dbfService';

export class Dashboard {
  private container: HTMLElement;
  private centresCount: number = 0;
  private abonnesCount: number = 0;
  private creancesCount: number = 0;
  private isLoading: boolean = true;

  constructor() {
    this.container = document.createElement('div');
    this.container.className = 'dashboard';
    this.render();
    // Charger automatiquement les données au démarrage avec la logique asynchrone
    // Conformément à la mémoire "Initialisation asynchrone du tableau de bord au démarrage"
    this.loadCounts();
  }

  private async loadCounts(fromCache: boolean = true, forceRefresh: boolean = false): Promise<void> {
    try {
      // Vérifier si les données sont dans le sessionStorage
      if (fromCache && !forceRefresh) {
        const cachedData = sessionStorage.getItem('dashboardStats');
        if (cachedData) {
          const stats = JSON.parse(cachedData);
          
          // Charger les données disponibles individuellement
          if (stats.hasOwnProperty('centresCount')) {
            this.centresCount = stats.centresCount;
            this.updateCentresDisplay();
          }
          
          if (stats.hasOwnProperty('abonnesCount')) {
            this.abonnesCount = stats.abonnesCount;
            this.updateAbonnesDisplay();
          }
          
          if (stats.hasOwnProperty('creancesCount')) {
            this.creancesCount = stats.creancesCount;
            this.updateCreancesDisplay();
          }
          
          return;
        }
      }
      
      // Afficher l'état de chargement individuel pour chaque carte
      this.updateCentresLoadingState();
      this.updateAbonnesLoadingState();
      this.updateCreancesLoadingState();
      
      // Effectuer les requêtes de manière indépendante
      // Chaque requête affiche ses résultats dès qu'ils sont disponibles
      // Espacer légèrement les requêtes pour permettre un rendu progressif
      
      // Requête pour les centres
      DbfService.getCentresCount(forceRefresh)
        .then(count => {
          this.centresCount = count;
          this.updateCentresDisplay();
          // Sauvegarder dans le cache partiel
          this.savePartialResult('centresCount', count);
        })
        .catch(error => {
          console.error('Erreur lors de la récupération du nombre de centres:', error);
          this.centresCount = 0;
          this.updateCentresDisplay();
        });
      
      // Attendre un court instant avant la requête suivante
      setTimeout(() => {
        DbfService.getAbonnesCount(forceRefresh)
          .then(count => {
            this.abonnesCount = count;
            this.updateAbonnesDisplay();
            // Sauvegarder dans le cache partiel
            this.savePartialResult('abonnesCount', count);
          })
          .catch(error => {
            console.error('Erreur lors de la récupération du nombre d\'abonnés:', error);
            this.abonnesCount = 0;
            this.updateAbonnesDisplay();
          });
      }, 50);
      
      // Attendre un peu plus pour la requête des créances
      setTimeout(() => {
        this.loadCreancesWithProgress(forceRefresh)
          .then(count => {
            this.creancesCount = count;
            this.updateCreancesDisplay();
            // Sauvegarder dans le cache partiel
            this.savePartialResult('creancesCount', count);
          })
          .catch(error => {
            console.error('Erreur lors de la récupération des créances:', error);
            this.creancesCount = 0;
            this.updateCreancesDisplay();
          });
      }, 100);
    } catch (error) {
      console.error('Erreur lors du chargement des données:', error);
      // En cas d'erreur globale, afficher les erreurs dans chaque carte
      this.updateCentresDisplay();
      this.updateAbonnesDisplay();
      this.updateCreancesDisplay();
    }
  }

  private updateCentresLoadingState(): void {
    const centresCard = this.container.querySelector('.centres-stat-card');
    
    if (centresCard) {
      centresCard.innerHTML = `
        <h3>Centres</h3>
        <p class="stat-value">
          <span class="loading-spinner"></span>
        </p>
        <p class="stat-change">Chargement...</p>
      `;
    }
  }
  
  private updateAbonnesLoadingState(): void {
    const abonnesCard = this.container.querySelector('.abonnes-stat-card');
    
    if (abonnesCard) {
      abonnesCard.innerHTML = `
        <h3>Abonnés</h3>
        <p class="stat-value">
          <span class="loading-spinner"></span>
        </p>
        <p class="stat-change">Chargement...</p>
      `;
    }
  }
  
  private updateCreancesLoadingState(): void {
    const creancesCard = this.container.querySelector('.creances-stat-card');
    
    if (creancesCard) {
      creancesCard.innerHTML = `
        <h3>Portefeuille Abonnés</h3>
        <p class="stat-value">
          <span class="loading-spinner"></span>
        </p>
        <div class="progress-bar">
          <div class="progress-fill" style="width: 0%"></div>
        </div>
        <p class="stat-change">Chargement... 0%</p>
      `;
    }
  }
  
  private updateLoadingState(): void {
    // Cette méthode est conservée pour compatibilité mais n'est plus utilisée
    // Le chargement est maintenant géré individuellement par carte
    this.updateCentresLoadingState();
    this.updateAbonnesLoadingState();
    this.updateCreancesLoadingState();
  }


  
  private updateCentresDisplay(): void {
    const centresCard = this.container.querySelector('.centres-stat-card');
    
    if (centresCard) {
      centresCard.innerHTML = `
        <h3>Centres</h3>
        <p class="stat-value">${this.centresCount}</p>
        <p class="stat-change positive">Centres actifs</p>
      `;
    }
  }
  
  private updateAbonnesDisplay(): void {
    const abonnesCard = this.container.querySelector('.abonnes-stat-card');
    
    if (abonnesCard) {
      abonnesCard.innerHTML = `
        <h3>Abonnés</h3>
        <p class="stat-value">${this.abonnesCount.toLocaleString()}</p>
        <p class="stat-change positive">Abonnés actifs</p>
      `;
    }
  }
  
  private updateCreancesDisplay(): void {
    const creancesCard = this.container.querySelector('.creances-stat-card');
    
    if (creancesCard) {
      creancesCard.innerHTML = `
        <h3>Portefeuille Abonnés</h3>
        <p class="stat-value">${this.creancesCount.toLocaleString('fr-FR', { style: 'currency', currency: 'DZD' })}</p>
        <p class="stat-change positive">Créances non réglées</p>
      `;
    }
  }
  
  private updateCreancesProgress(progress: number): void {
    const creancesCard = this.container.querySelector('.creances-stat-card');
    
    if (creancesCard) {
      const progressBar = creancesCard.querySelector('.progress-bar') as HTMLElement;
      const progressFill = creancesCard.querySelector('.progress-fill') as HTMLElement;
      const statChange = creancesCard.querySelector('.stat-change') as HTMLElement;
      
      if (progressBar && progressFill && statChange) {
        // Mettre à jour la largeur de la barre de progression
        progressFill.style.width = `${progress}%`;
        
        // Mettre à jour le texte de progression
        statChange.textContent = `Chargement... ${Math.round(progress)}%`;
        
        // Forcer la mise à jour du DOM
        statChange.offsetHeight;
      }
    }
  }

  private render(): void {
    this.container.innerHTML = `
      <div class="dashboard-header">
        <h2>Tableau de bord</h2>
        <p>Bienvenue dans votre espace de travail</p>
      </div>
      
      <div class="dashboard-stats">
        <div class="stat-card centres-stat-card">
          <h3>Centres</h3>
          <p class="stat-value">
            <span class="loading-spinner"></span>
          </p>
          <p class="stat-change">Chargement...</p>
        </div>
        
        <div class="stat-card abonnes-stat-card">
          <h3>Abonnés</h3>
          <p class="stat-value">
            <span class="loading-spinner"></span>
          </p>
          <p class="stat-change">Chargement...</p>
        </div>
        
        <div class="stat-card creances-stat-card">
          <h3>Portefeuille Abonnés</h3>
          <p class="stat-value">
            <span class="loading-spinner"></span>
          </p>
          <div class="progress-bar">
            <div class="progress-fill" style="width: 0%"></div>
          </div>
          <p class="stat-change">Chargement... 0%</p>
        </div>
        
        <div class="stat-card">
          <h3>Nouveaux clients</h3>
          <p class="stat-value">24</p>
          <p class="stat-change positive">+8% par rapport à hier</p>
        </div>
      </div>
      
      <div class="dashboard-charts">
        <div class="chart-container">
          <h3>Performance mensuelle</h3>
          <div class="chart-placeholder">
            <p>Graphique de performance</p>
          </div>
        </div>
        
        <div class="chart-container">
          <h3>Activité récente</h3>
          <div class="chart-placeholder">
            <p>Graphique d'activité</p>
          </div>
        </div>
      </div>
    `;
  }

  private loadCreancesWithProgress(forceRefresh: boolean = false): Promise<number> {
    // Créer une promesse pour le chargement des données
    const loadDataPromise = DbfService.getAbonnesCreances(forceRefresh);
    
    // Simuler une progression plus réaliste basée sur le nombre total d'enregistrements
    // Le serveur traite environ 1.126.503 enregistrements
    // Nouvelle approche avec des étapes plus espacées pour refléter l'optimisation
    const steps = [
      { records: 50000, progress: 5 },
      { records: 100000, progress: 10 },
      { records: 200000, progress: 20 },
      { records: 300000, progress: 30 },
      { records: 400000, progress: 40 },
      { records: 500000, progress: 50 },
      { records: 600000, progress: 60 },
      { records: 700000, progress: 70 },
      { records: 800000, progress: 80 },
      { records: 900000, progress: 90 },
      { records: 1126503, progress: 100 }
    ];
    
    let stepIndex = 0;
    
    const interval = setInterval(() => {
      if (stepIndex < steps.length) {
        const step = steps[stepIndex];
        this.updateCreancesProgress(step.progress);
        stepIndex++;
      }
    }, 500); // Intervalle légèrement augmenté pour refléter les meilleures performances
    
    // Ne pas attendre que les données soient chargées
    // Retourner la promesse pour permettre un traitement asynchrone
    loadDataPromise
      .then(result => {
        // Arrêter la simulation de progression
        clearInterval(interval);
        
        // Mettre à jour l'affichage avec le résultat
        this.creancesCount = result;
        this.updateCreancesDisplay();
        // Sauvegarder dans le cache partiel
        this.savePartialResult('creancesCount', result);
        
        return result;
      })
      .catch(error => {
        // Arrêter la simulation de progression en cas d'erreur
        clearInterval(interval);
        
        console.error('Erreur lors de la récupération des créances:', error);
        this.creancesCount = 0;
        this.updateCreancesDisplay();
        
        throw error;
      });
    
    // Retourner la promesse originale
    return loadDataPromise;
  }
  
  public getElement(): HTMLElement {
    return this.container;
  }
  
  // Méthode pour sauvegarder les résultats partiels dans le cache
  private savePartialResult(key: string, value: any): void {
    try {
      // Récupérer les données existantes du cache
      const cachedData = sessionStorage.getItem('dashboardStats');
      const stats = cachedData ? JSON.parse(cachedData) : {};
      
      // Mettre à jour la valeur spécifique
      stats[key] = value;
      stats.timestamp = Date.now();
      
      // Sauvegarder les données mises à jour
      sessionStorage.setItem('dashboardStats', JSON.stringify(stats));
    } catch (error) {
      console.error('Erreur lors de la sauvegarde partielle des données:', error);
    }
  }
  
  public refreshData(): void {
    // Supprimer les données du cache
    sessionStorage.removeItem('dashboardStats');
    
    // Recharger les données avec rafraîchissement forcé
    this.loadCounts(false, true);
  }
}