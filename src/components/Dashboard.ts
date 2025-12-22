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

  private async loadCounts(fromCache: boolean = true, forceRefresh: boolean = false): Promise<void> {
    try {
      if (fromCache && !forceRefresh) {
        const cachedData = sessionStorage.getItem('dashboardStats');
        if (cachedData) {
          const stats = JSON.parse(cachedData);
          
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
      
      this.updateCentresLoadingState();
      this.updateAbonnesLoadingState();
      this.updateCreancesLoadingState();
      
      DbfService.getCentresCount(forceRefresh)
        .then(count => {
          this.centresCount = count;
          this.updateCentresDisplay();
          this.savePartialResult('centresCount', count);
        })
        .catch(error => {
          console.error('Erreur lors de la récupération du nombre de centres:', error);
          this.centresCount = 0;
          this.updateCentresDisplay();
        });
      
      setTimeout(() => {
        DbfService.getAbonnesCount(forceRefresh)
          .then(count => {
            this.abonnesCount = count;
            this.updateAbonnesDisplay();
            this.savePartialResult('abonnesCount', count);
          })
          .catch(error => {
            console.error('Erreur lors de la récupération du nombre d\'abonnés:', error);
            this.abonnesCount = 0;
            this.updateAbonnesDisplay();
          });
      }, 50);
      
      setTimeout(() => {
        this.loadCreancesWithProgress(forceRefresh)
          .then(count => {
            this.creancesCount = count;
            this.updateCreancesDisplay();
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
        <p class="stat-value">${this.formatCurrency(this.creancesCount)}</p>
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
        progressFill.style.width = `${progress}%`;
        
        statChange.textContent = `Chargement... ${Math.round(progress)}%`;
        
        statChange.offsetHeight;
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
    const loadDataPromise = DbfService.getAbonnesCreances(forceRefresh);
    
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
    }, 500);
    
    loadDataPromise
      .then(result => {
        clearInterval(interval);
        
        this.creancesCount = result;
        this.updateCreancesDisplay();
        this.savePartialResult('creancesCount', result);
        
        return result;
      })
      .catch(error => {
        clearInterval(interval);
        
        console.error('Erreur lors de la récupération des créances:', error);
        this.creancesCount = 0;
        this.updateCreancesDisplay();
        
        throw error;
      });
    
    return loadDataPromise;
  }
  
  public getElement(): HTMLElement {
    return this.container;
  }
  
  private savePartialResult(key: string, value: any): void {
    try {
      const cachedData = sessionStorage.getItem('dashboardStats');
      const stats = cachedData ? JSON.parse(cachedData) : {};
      
      stats[key] = value;
      stats.timestamp = Date.now();
      
      sessionStorage.setItem('dashboardStats', JSON.stringify(stats));
    } catch (error) {
      console.error('Erreur lors de la sauvegarde partielle des données:', error);
    }
  }
  
  public refreshData(): void {
    sessionStorage.removeItem('dashboardStats');
    
    this.loadCounts(false, true);
  }
}