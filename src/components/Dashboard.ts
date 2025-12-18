// Dashboard.ts
export class Dashboard {
  private container: HTMLElement;

  constructor() {
    this.container = document.createElement('div');
    this.container.className = 'dashboard';
    this.render();
  }

  private render(): void {
    this.container.innerHTML = `
      <div class="dashboard-header">
        <h2>Tableau de bord</h2>
        <p>Bienvenue dans votre espace de travail</p>
      </div>
      
      <div class="dashboard-stats">
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
        
        <div class="stat-card">
          <h3>Satisfaction client</h3>
          <p class="stat-value">94%</p>
          <p class="stat-change positive">+2% par rapport au mois dernier</p>
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