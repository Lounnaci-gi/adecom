// Dashboard.ts
import { DbfService } from '../services/dbfService';

export class Dashboard {
  private container: HTMLElement;
  private centresCount: number = 0;
  private isLoading: boolean = true;

  constructor() {
    this.container = document.createElement('div');
    this.container.className = 'dashboard';
    this.render();
    this.loadCentresCount();
  }

  private async loadCentresCount(): Promise<void> {
    try {
      this.isLoading = true;
      this.updateLoadingState();
      
      // Récupérer le nombre réel de centres depuis TABCODE.DBF
      this.centresCount = await DbfService.getCentresCount();
      
      this.isLoading = false;
      this.updateCentresCountDisplay();
    } catch (error) {
      console.error('Erreur lors du chargement du nombre de centres:', error);
      this.isLoading = false;
      this.updateLoadingState();
    }
  }

  private updateLoadingState(): void {
    const centresCard = this.container.querySelector('.centres-stat-card');
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
  }

  private updateCentresCountDisplay(): void {
    const centresCard = this.container.querySelector('.centres-stat-card');
    if (centresCard) {
      centresCard.innerHTML = `
        <h3>Centres</h3>
        <p class="stat-value">${this.centresCount}</p>
        <p class="stat-change positive">Centres actifs</p>
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
        
        <div class="stat-card">
          <h3>Commandes en cours</h3>
          <p class="stat-value">8</p>
          <p class="stat-change negative">-3% par rapport à hier</p>
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