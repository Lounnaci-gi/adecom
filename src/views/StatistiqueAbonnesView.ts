// StatistiqueAbonnesView.ts
import { DbfService } from '../services/dbfService';
import Chart from 'chart.js/auto';

interface AbonneType {
  code: string;
  designation: string;
  count: number;
  resilieCount: number;
  sansCompteurCount: number;
  compteurArretCount: number;
}

export class StatistiqueAbonnesView {
  private container: HTMLElement;
  private isLoading: boolean = true;
  private totalCount: number = 0;
  private totalResilieCount: number = 0;
  private compteurArretCount: number = 0;
  private sansCompteurCount: number = 0;
  private barChart: Chart<'bar'> | null = null;

  private abonnesTypes: AbonneType[] = [];
  private sortBy: string = 'count';
  private sortDirection: 'asc' | 'desc' = 'desc';

  constructor() {
    this.container = document.createElement('div');
    this.container.className = 'statistique-abonnes-view';
    this.render();
    this.loadAbonnesData();
  }

  private async loadAbonnesData(forceRefresh: boolean = false): Promise<void> {
    try {
      this.isLoading = true;
      this.updateLoadingState();
      
      // Récupérer les abonnés par type
      const result = await DbfService.getAbonnesCountByType(forceRefresh);
      this.totalCount = result.totalCount;
      this.totalResilieCount = result.totalResilieCount || 0;
      this.sansCompteurCount = result.totalSansCompteurCount || 0;
      this.compteurArretCount = result.totalCompteurArretCount || 0;
      this.abonnesTypes = result.types;
      
      // Récupérer le nombre d'abonnés avec compteur à l'arrêt
      this.compteurArretCount = await DbfService.getAbonnesCompteurArret(forceRefresh);
      
      // Récupérer le nombre d'abonnés sans compteur
      this.sansCompteurCount = await DbfService.getAbonnesSansCompteur(forceRefresh);
      
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
    // Attacher les gestionnaires d'événements après la mise à jour du DOM
    setTimeout(() => {
      this.attachEventListeners();
    }, 0);
    // Calculer les statistiques principales
    const tauxResiliation = this.totalCount > 0 ? ((this.totalResilieCount / this.totalCount) * 100).toFixed(1) : '0';
    const abonnesReel = Math.max(0, this.totalCount - this.totalResilieCount);
    const tauxCompteurArret = this.totalCount > 0 ? ((this.compteurArretCount / this.totalCount) * 100).toFixed(1) : '0';
    const tauxSansCompteur = this.totalCount > 0 ? ((this.sansCompteurCount / this.totalCount) * 100).toFixed(1) : '0';
    
    // Préparer les données pour le graphique à barres
    // Trier par count décroissant et prendre les 5 premiers
    const sortedTypes = [...this.abonnesTypes].sort((a, b) => b.count - a.count);
    const topTypes = sortedTypes.slice(0, 5);
    
    // Préparer les données pour Chart.js
    const chartData = {
      labels: topTypes.map(type => `T${type.code}`),
      counts: topTypes.map(type => type.count)
    };
    
    // Trier les types d'abonnés selon le critère de tri
    const sortedAbonnesTypes = [...this.abonnesTypes].sort((a, b) => {
      let aValue, bValue;
      
      switch (this.sortBy) {
        case 'code':
          aValue = a.code;
          bValue = b.code;
          break;
        case 'designation':
          aValue = a.designation;
          bValue = b.designation;
          break;
        case 'count':
          aValue = a.count;
          bValue = b.count;
          break;
        case 'resilieCount':
          aValue = a.resilieCount;
          bValue = b.resilieCount;
          break;
        case 'resiliePercentage':
          aValue = a.count > 0 ? (a.resilieCount / a.count) : 0;
          bValue = b.count > 0 ? (b.resilieCount / b.count) : 0;
          break;
        case 'sansCompteurCount':
          aValue = a.sansCompteurCount;
          bValue = b.sansCompteurCount;
          break;
        case 'compteurArretCount':
          aValue = a.compteurArretCount;
          bValue = b.compteurArretCount;
          break;
        default:
          aValue = a.count;
          bValue = b.count;
      }
      
      if (typeof aValue === 'string' && typeof bValue === 'string') {
        return this.sortDirection === 'asc' ? aValue.localeCompare(bValue) : bValue.localeCompare(aValue);
      } else {
        return this.sortDirection === 'asc' ? (aValue as number) - (bValue as number) : (bValue as number) - (aValue as number);
      }
    });
    
    // Afficher tous les types d'abonnés dans un tableau
    let typesTableRows = '';
    sortedAbonnesTypes.forEach((type, index) => {
      const percentageResilieValue = type.count > 0 ? ((type.resilieCount / type.count) * 100) : 0;
      const percentageResilie = percentageResilieValue.toFixed(1);
      const percentageSansCompteur = type.count > 0 ? ((type.sansCompteurCount / type.count) * 100).toFixed(1) : '0';
      const percentageCompteurArret = type.count > 0 ? ((type.compteurArretCount / type.count) * 100).toFixed(1) : '0';
      
      // Générer une couleur distinctive basée sur le code du type d'abonné
      const colorIndex = parseInt(type.code, 10) || index;
      const colors = [
        '#4CAF50', // Vert
        '#2196F3', // Bleu
        '#FFC107', // Jaune
        '#FF5722', // Orange
        '#9C27B0', // Violet
        '#00BCD4', // Cyan
        '#E91E63', // Rose
        '#8BC34A', // Vert clair
        '#795548', // Marron
        '#607D8B'  // Bleu-gris
      ];
      const color = colors[colorIndex % colors.length];
      
      typesTableRows += `
        <tr>
          <td class="type-code" style="border-left: 4px solid ${color}">
            T${type.code}
          </td>
          <td>${type.designation}</td>
          <td class="text-right">${type.count.toLocaleString()}</td>
          <td class="text-right">${type.resilieCount.toLocaleString()}</td>
          <td class="text-right ${percentageResilieValue > 10 ? 'negative' : percentageResilieValue > 5 ? 'warning' : 'positive'}">${percentageResilie}%</td>
          <td class="text-right">${type.sansCompteurCount.toLocaleString()} (${percentageSansCompteur}%)</td>
          <td class="text-right">${type.compteurArretCount.toLocaleString()} (${percentageCompteurArret}%)</td>
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
            <h3>Abonnés Réel</h3>
            <p class="stat-value">${abonnesReel.toLocaleString()}</p>
            <p class="stat-change positive">Abonnés non résiliés</p>
          </div>
          
          <div class="stat-card">
            <h3>Compteur à l'Arrêt</h3>
            <p class="stat-value">${this.compteurArretCount.toLocaleString()}</p>
            <p class="stat-change warning">Taux: ${tauxCompteurArret}%</p>
          </div>
          
          <div class="stat-card">
            <h3>Sans Compteur</h3>
            <p class="stat-value">${this.sansCompteurCount.toLocaleString()}</p>
            <p class="stat-change warning">Taux: ${tauxSansCompteur}%</p>
          </div>
        </div>
        
        <div class="chart-container">
          <h3>Répartition par Type d'Abonné</h3>
          <div class="chart-wrapper">
            <canvas id="abonnes-type-bar-chart"></canvas>
          </div>
        </div>
        
        <div class="details-section">
          <h3>Abonnés par Type</h3>
          <div class="table-responsive">
            <table class="details-table abonnes-types-table" id="abonnes-types-table">
              <thead>
                <tr>
                  <th class="sortable ${this.sortBy === 'code' ? 'sorted-' + this.sortDirection : ''}" data-sort="code">Code ${this.sortBy === 'code' ? (this.sortDirection === 'asc' ? '↑' : '↓') : ''}</th>
                  <th class="sortable ${this.sortBy === 'designation' ? 'sorted-' + this.sortDirection : ''}" data-sort="designation">Type d'Abonné ${this.sortBy === 'designation' ? (this.sortDirection === 'asc' ? '↑' : '↓') : ''}</th>
                  <th class="sortable text-right ${this.sortBy === 'count' ? 'sorted-' + this.sortDirection : ''}" data-sort="count">Total ${this.sortBy === 'count' ? (this.sortDirection === 'asc' ? '↑' : '↓') : ''}</th>
                  <th class="sortable text-right ${this.sortBy === 'resilieCount' ? 'sorted-' + this.sortDirection : ''}" data-sort="resilieCount">Résiliés ${this.sortBy === 'resilieCount' ? (this.sortDirection === 'asc' ? '↑' : '↓') : ''}</th>
                  <th class="sortable text-right ${this.sortBy === 'resiliePercentage' ? 'sorted-' + this.sortDirection : ''}" data-sort="resiliePercentage">Taux de Résiliation ${this.sortBy === 'resiliePercentage' ? (this.sortDirection === 'asc' ? '↑' : '↓') : ''}</th>
                  <th class="sortable text-right ${this.sortBy === 'sansCompteurCount' ? 'sorted-' + this.sortDirection : ''}" data-sort="sansCompteurCount">Sans Compteur ${this.sortBy === 'sansCompteurCount' ? (this.sortDirection === 'asc' ? '↑' : '↓') : ''}</th>
                  <th class="sortable text-right ${this.sortBy === 'compteurArretCount' ? 'sorted-' + this.sortDirection : ''}" data-sort="compteurArretCount">Compteur à l'Arrêt ${this.sortBy === 'compteurArretCount' ? (this.sortDirection === 'asc' ? '↑' : '↓') : ''}</th>
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
    
    // Créer ou mettre à jour le graphique à barres
    this.createBarChart(chartData);
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
  
  private attachEventListeners(): void {
    // Gestionnaire de tri pour le tableau des types d'abonnés
    const tableHeaders = this.container.querySelectorAll('#abonnes-types-table th.sortable');
    tableHeaders.forEach(header => {
      header.addEventListener('click', (event) => {
        const target = event.currentTarget as HTMLElement;
        const sortKey = target.getAttribute('data-sort');
        
        if (sortKey) {
          // Si on clique sur la même colonne, inverser la direction
          if (this.sortBy === sortKey) {
            this.sortDirection = this.sortDirection === 'asc' ? 'desc' : 'asc';
          } else {
            // Sinon, trier par cette colonne en ordre descendant par défaut
            this.sortBy = sortKey;
            this.sortDirection = 'desc';
          }
          
          // Mettre à jour l'affichage
          this.updateDisplay();
        }
      });
    });
  }
  
  private createBarChart(data: { labels: string[]; counts: number[] }): void {
    const ctx = document.getElementById('abonnes-type-bar-chart') as HTMLCanvasElement;
    if (!ctx) {
      console.error('Canvas element for bar chart not found');
      return;
    }
    
    // Détruire le graphique existant s'il existe
    if (this.barChart) {
      this.barChart.destroy();
    }
    
    this.barChart = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: data.labels,
        datasets: [{
          label: 'Nombre d\'abonnés',
          data: data.counts,
          backgroundColor: [
            'rgba(75, 192, 192, 0.6)',
            'rgba(54, 162, 235, 0.6)',
            'rgba(255, 205, 86, 0.6)',
            'rgba(255, 99, 132, 0.6)',
            'rgba(153, 102, 255, 0.6)',
            'rgba(255, 159, 64, 0.6)'
          ],
          borderColor: [
            'rgba(75, 192, 192, 1)',
            'rgba(54, 162, 235, 1)',
            'rgba(255, 205, 86, 1)',
            'rgba(255, 99, 132, 1)',
            'rgba(153, 102, 255, 1)',
            'rgba(255, 159, 64, 1)'
          ],
          borderWidth: 1
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          y: {
            beginAtZero: true,
            title: {
              display: true,
              text: 'Nombre d\'abonnés'
            }
          },
          x: {
            title: {
              display: true,
              text: 'Type d\'abonné'
            }
          }
        },
        plugins: {
          legend: {
            position: 'top',
          },
          tooltip: {
            callbacks: {
              label: function(context) {
                const label = context.dataset.label || '';
                const value = context.parsed.y;
                return `${label}: ${Number(value).toLocaleString()}`;
              }
            }
          }
        }
      }
    });
  }
}