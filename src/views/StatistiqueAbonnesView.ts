// StatistiqueAbonnesView.ts
import { DbfService } from '../services/dbfService';

interface AbonneType {
  code: string;
  designation: string;
  count: number;
  resilieCount: number;
}

export class StatistiqueAbonnesView {
  private container: HTMLElement;
  private isLoading: boolean = true;
  private totalCount: number = 0;
  private totalResilieCount: number = 0;
  private abonnesTypes: AbonneType[] = [];

  constructor() {
    this.container = document.createElement('div');
    this.container.className = 'statistique-abonnes-view';
    this.render();
    this.loadAbonnesData();
  }

  private async loadAbonnesData(): Promise<void> {
    try {
      this.isLoading = true;
      this.updateLoadingState();
      
      // Récupérer les abonnés par type
      const result = await DbfService.getAbonnesCountByType();
      this.totalCount = result.totalCount;
      this.totalResilieCount = result.totalResilieCount || 0;
      this.abonnesTypes = result.types;
      
      this.isLoading = false;
      this.updateDisplay();
    } catch (error) {
      console.error('Erreur lors du chargement des données des abonnés:', error);
      this.isLoading = false;
      this.updateLoadingState();
    }
  }

  private updateLoadingState(): void {
    if (this.isLoading) {
      this.container.innerHTML = `
        <div class="statistique-abonnes-header">
          <h2>Statistiques des Abonnés</h2>
          <p>Analyse détaillée des abonnés et des tendances</p>
        </div>
        
        <div class="statistique-abonnes-content">
          <div class="loading-container">
            <p>Chargement des données...</p>
            <div class="loading-spinner"></div>
          </div>
        </div>
      `;
    }
  }

  private updateDisplay(): void {
    // Calculer les statistiques principales
    const tauxResiliation = this.totalCount > 0 ? ((this.totalResilieCount / this.totalCount) * 100).toFixed(1) : '0';
    const nouveauxAbonnes = Math.max(0, this.totalCount - this.totalResilieCount);
    
    // Préparer les données pour le graphique
    const topTypes = this.abonnesTypes.slice(0, 4);
    const autresCount = this.abonnesTypes.slice(4).reduce((sum, type) => sum + type.count, 0);
    
    // Créer les segments du graphique
    let chartSegments = '';
    let chartLegend = '';
    
    topTypes.forEach((type, index) => {
      const percentage = this.totalCount > 0 ? ((type.count / this.totalCount) * 100).toFixed(1) : '0';
      const colors = ['#4CAF50', '#2196F3', '#FFC107', '#FF5722'];
      
      chartSegments += `<div class="chart-segment" style="background-color: ${colors[index]}; width: ${percentage}%; height: 30px; display: inline-block;"></div>`;
      chartLegend += `<li><span class="legend-color" style="background-color: ${colors[index]};"></span> ${type.designation} (${percentage}%)</li>`;
    });
    
    // Ajouter "Autres" si nécessaire
    if (autresCount > 0) {
      const percentage = this.totalCount > 0 ? ((autresCount / this.totalCount) * 100).toFixed(1) : '0';
      chartSegments += `<div class="chart-segment" style="background-color: #9E9E9E; width: ${percentage}%; height: 30px; display: inline-block;"></div>`;
      chartLegend += `<li><span class="legend-color" style="background-color: #9E9E9E;"></span> Autres (${percentage}%)</li>`;
    }
    
    // Afficher tous les types d'abonnés dans un tableau
    let typesTableRows = '';
    this.abonnesTypes.forEach(type => {
      const percentageResilie = type.count > 0 ? ((type.resilieCount / type.count) * 100).toFixed(1) : '0';
      typesTableRows += `
        <tr>
          <td>T${type.code}</td>
          <td>${type.designation}</td>
          <td class="text-right">${type.count.toLocaleString()}</td>
          <td class="text-right">${type.resilieCount.toLocaleString()}</td>
          <td class="text-right ${percentageResilie > 10 ? 'negative' : percentageResilie > 5 ? 'warning' : 'positive'}">${percentageResilie}%</td>
        </tr>
      `;
    });
    
    this.container.innerHTML = `
      <div class="statistique-abonnes-header">
        <h2>Statistiques des Abonnés</h2>
        <p>Analyse détaillée des abonnés et des tendances</p>
      </div>
      
      <div class="statistique-abonnes-content">
        <div class="statistique-cards">
          <div class="stat-card">
            <h3>Total Abonnés</h3>
            <p class="stat-value">${this.totalCount.toLocaleString()}</p>
            <p class="stat-change positive">Nombre total d'abonnés actifs</p>
          </div>
          
          <div class="stat-card">
            <h3>Résiliations</h3>
            <p class="stat-value">${this.totalResilieCount.toLocaleString()}</p>
            <p class="stat-change negative">Taux de résiliation: ${tauxResiliation}%</p>
          </div>
          
          <div class="stat-card">
            <h3>Nouveaux Abonnés</h3>
            <p class="stat-value">${nouveauxAbonnes.toLocaleString()}</p>
            <p class="stat-change positive">Abonnés non résiliés</p>
          </div>
          
          <div class="stat-card">
            <h3>Types d'Abonnés</h3>
            <p class="stat-value">${this.abonnesTypes.length}</p>
            <p class="stat-change">Nombre de catégories</p>
          </div>
        </div>
        
        <div class="chart-container">
          <h3>Répartition par Type d'Abonné</h3>
          <div class="chart-placeholder">
            <div class="chart-example">
              ${chartSegments}
            </div>
            <ul class="chart-legend">
              ${chartLegend}
            </ul>
          </div>
        </div>
        
        <div class="details-section">
          <h3>Abonnés par Type</h3>
          <div class="table-responsive">
            <table class="details-table abonnes-types-table">
              <thead>
                <tr>
                  <th>Code</th>
                  <th>Type d'Abonné</th>
                  <th class="text-right">Total</th>
                  <th class="text-right">Résiliés</th>
                  <th class="text-right">Taux de Résiliation</th>
                </tr>
              </thead>
              <tbody>
                ${typesTableRows}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    `;
  }

  private render(): void {
    this.container.innerHTML = `
      <div class="statistique-abonnes-header">
        <h2>Statistiques des Abonnés</h2>
        <p>Analyse détaillée des abonnés et des tendances</p>
      </div>
      
      <div class="statistique-abonnes-content">
        <div class="loading-container">
          <p>Chargement des données...</p>
          <div class="loading-spinner"></div>
        </div>
      </div>
    `;
  }

  public getElement(): HTMLElement {
    return this.container;
  }
}