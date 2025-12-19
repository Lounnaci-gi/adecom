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
    this.loadCounts();
  }

  private async loadCounts(): Promise<void> {
    try {
      this.isLoading = true;
      this.updateLoadingState();
      
      // Effectuer les requêtes en parallèle
      const centresPromise = DbfService.getCentresCount()
        .then(count => {
          this.centresCount = count;
          this.updateCentresDisplay();
        })
        .catch(error => {
          console.error('Erreur lors de la récupération du nombre de centres:', error);
          this.centresCount = 0;
          this.updateCentresDisplay();
        });
      
      const abonnesPromise = DbfService.getAbonnesCount()
        .then(count => {
          this.abonnesCount = count;
          this.updateAbonnesDisplay();
        })
        .catch(error => {
          console.error('Erreur lors de la récupération du nombre d\'abonnés:', error);
          this.abonnesCount = 0;
          this.updateAbonnesDisplay();
        });
      
      // Afficher la barre de progression pendant le chargement
      this.updateLoadingState();
      
      const creancesPromise = DbfService.getAbonnesCreances()
        .then(count => {
          this.creancesCount = count;
          this.updateCreancesDisplay();
        })
        .catch(error => {
          console.error('Erreur lors de la récupération des créances:', error);
          this.creancesCount = 0;
          this.updateCreancesDisplay();
        });
      
      // Attendre que toutes les requêtes soient terminées
      await Promise.all([centresPromise, abonnesPromise, creancesPromise]);
      
      this.isLoading = false;
    } catch (error) {
      console.error('Erreur lors du chargement des données:', error);
      this.isLoading = false;
      this.updateLoadingState();
    }
  }

  private updateLoadingState(): void {
    const centresCard = this.container.querySelector('.centres-stat-card');
    const abonnesCard = this.container.querySelector('.abonnes-stat-card');
    const creancesCard = this.container.querySelector('.creances-stat-card');
    
    if (centresCard) {
      if (this.isLoading) {
        centresCard.innerHTML = `
          <h3>Centres</h3>
          <p class="stat-value">
            <span class="loading-spinner"></span>
          </p>
          <p class="stat-change">Chargement...</p>
        `;
      }
    }
    
    if (abonnesCard) {
      if (this.isLoading) {
        abonnesCard.innerHTML = `
          <h3>Abonnés</h3>
          <p class="stat-value">
            <span class="loading-spinner"></span>
          </p>
          <p class="stat-change">Chargement...</p>
        `;
      }
    }
    
    if (creancesCard) {
      if (this.isLoading) {
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
  }

  private updateCountsDisplay(): void {
    this.updateCentresDisplay();
    this.updateAbonnesDisplay();
    this.updateCreancesDisplay();
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
      const progressBar = creancesCard.querySelector('.progress-bar');
      const progressFill = creancesCard.querySelector('.progress-fill');
      const statChange = creancesCard.querySelector('.stat-change');
      
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
          <h3>Ventes aujourd'hui</h3>
          <p class="stat-value">€1,250</p>
          <p class="stat-change positive">+12% par rapport à hier</p>
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

  private async loadCreancesWithProgress(): Promise<number> {
    // Créer une promesse pour le chargement des données
    const loadDataPromise = DbfService.getAbonnesCreances();
    
    // Simuler une progression identique à celle du serveur
    // Basée sur les messages : Progression: 10000 enregistrements traités, etc.
    const steps = [
      { count: 10000, progress: 10 },
      { count: 20000, progress: 20 },
      { count: 30000, progress: 30 },
      { count: 40000, progress: 40 },
      { count: 50000, progress: 50 },
      { count: 60000, progress: 60 },
      { count: 70000, progress: 70 },
      { count: 80000, progress: 80 }
    ];
    let stepIndex = 0;
    
    const interval = setInterval(() => {
      if (stepIndex < steps.length) {
        const step = steps[stepIndex];
        this.updateCreancesProgress(step.progress);
        
        // Afficher le message de progression identique à celui du serveur
        console.log(`Progression: ${step.count} enregistrements traités`);
        stepIndex++;
      }
    }, 300);
    
    // Attendre que les données soient chargées
    const result = await loadDataPromise;
    
    // Arrêter la simulation de progression
    clearInterval(interval);
    
    // Mettre à jour la progression à 100%
    this.updateCreancesProgress(100);
    
    return result;
  }
  
  public getElement(): HTMLElement {
    return this.container;
  }
}