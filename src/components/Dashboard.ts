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
      
      // Récupérer le nombre réel de centres depuis TABCODE.DBF
      this.centresCount = await DbfService.getCentresCount();
      
      // Récupérer le nombre d'abonnés depuis ABONNE.DBF
      this.abonnesCount = await DbfService.getAbonnesCount();
      
      // Récupérer la somme des créances des abonnés depuis FACTURES.DBF
      this.creancesCount = await DbfService.getAbonnesCreances();
      
      this.isLoading = false;
      this.updateCountsDisplay();
    } catch (error) {
      console.error('Erreur lors du chargement des données:', error);
      this.isLoading = false;
      this.updateLoadingState();
    }
  }

  private updateLoadingState(): void {
    const centresCard = this.container.querySelector('.centres-stat-card');
    const abonnesCard = this.container.querySelector('.abonnes-stat-card');
    
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
  }

  private updateCountsDisplay(): void {
    const centresCard = this.container.querySelector('.centres-stat-card');
    const abonnesCard = this.container.querySelector('.abonnes-stat-card');
    const creancesCard = this.container.querySelector('.creances-stat-card');
    
    if (centresCard) {
      centresCard.innerHTML = `
        <h3>Centres</h3>
        <p class="stat-value">${this.centresCount}</p>
        <p class="stat-change positive">Centres actifs</p>
      `;
    }
    
    if (abonnesCard) {
      abonnesCard.innerHTML = `
        <h3>Abonnés</h3>
        <p class="stat-value">${this.abonnesCount.toLocaleString()}</p>
        <p class="stat-change positive">Abonnés actifs</p>
      `;
    }
    
    if (creancesCard) {
      creancesCard.innerHTML = `
        <h3>Portefeuille Abonnés</h3>
        <p class="stat-value">${this.creancesCount.toLocaleString('fr-FR', { style: 'currency', currency: 'DZD' })}</p>
        <p class="stat-change positive">Créances non réglées</p>
      `;
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
            ${this.isLoading ? '<span class="loading-spinner"></span>' : this.centresCount}
          </p>
          <p class="stat-change">${this.isLoading ? 'Chargement...' : 'Centres actifs'}</p>
        </div>
        
        <div class="stat-card abonnes-stat-card">
          <h3>Abonnés</h3>
          <p class="stat-value">
            ${this.isLoading ? '<span class="loading-spinner"></span>' : this.abonnesCount.toLocaleString()}
          </p>
          <p class="stat-change">${this.isLoading ? 'Chargement...' : 'Abonnés actifs'}</p>
        </div>
        
        <div class="stat-card creances-stat-card">
          <h3>Portefeuille Abonnés</h3>
          <p class="stat-value">
            ${this.isLoading ? '<span class="loading-spinner"></span>' : this.creancesCount.toLocaleString('fr-FR', { style: 'currency', currency: 'DZD' })}
          </p>
          <p class="stat-change">${this.isLoading ? 'Chargement...' : 'Créances non réglées'}</p>
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

  public getElement(): HTMLElement {
    return this.container;
  }
}