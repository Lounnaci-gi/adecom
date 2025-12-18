// AbonnesParTypeCard.ts
import { DbfService } from '../services/dbfService';

interface AbonneType {
  code: string;
  designation: string;
  count: number;
}

export class AbonnesParTypeCard {
  private container: HTMLElement;
  private isLoading: boolean = true;
  private totalCount: number = 0;
  private abonnesTypes: AbonneType[] = [];

  constructor() {
    this.container = document.createElement('div');
    this.container.className = 'stat-card abonnes-types-card';
    this.render();
    this.loadAbonnesTypes();
  }

  private async loadAbonnesTypes(): Promise<void> {
    try {
      this.isLoading = true;
      this.updateLoadingState();
      
      // Récupérer les abonnés par type
      const result = await DbfService.getAbonnesCountByType();
      this.totalCount = result.totalCount;
      this.abonnesTypes = result.types;
      
      this.isLoading = false;
      this.updateDisplay();
    } catch (error) {
      console.error('Erreur lors du chargement des types d\'abonnés:', error);
      this.isLoading = false;
      this.updateLoadingState();
    }
  }

  private updateLoadingState(): void {
    if (this.isLoading) {
      this.container.innerHTML = `
        <h3>Abonnés par type</h3>
        <p class="stat-value">
          <span class="loading-spinner"></span>
        </p>
        <p class="stat-change">Chargement...</p>
      `;
    }
  }

  private updateDisplay(): void {
    // Afficher les 5 types principaux
    const topTypes = this.abonnesTypes.slice(0, 5);
    
    let typesHtml = '';
    topTypes.forEach(type => {
      typesHtml += `
        <div class="type-item">
          <span class="type-code">T${type.code}</span>
          <span class="type-designation">${type.designation}</span>
          <span class="type-count">${type.count.toLocaleString()}</span>
        </div>
      `;
    });
    
    // Si moins de 5 types, ajouter des lignes vides pour maintenir la hauteur
    if (topTypes.length < 5) {
      for (let i = topTypes.length; i < 5; i++) {
        typesHtml += `<div class="type-item empty"></div>`;
      }
    }
    
    this.container.innerHTML = `
      <h3>Abonnés par type</h3>
      <div class="types-list">
        ${typesHtml}
      </div>
      <p class="stat-change positive">Total: ${this.totalCount.toLocaleString()} abonnés</p>
    `;
  }

  private render(): void {
    this.container.innerHTML = `
      <h3>Abonnés par type</h3>
      <p class="stat-value">
        ${this.isLoading ? '<span class="loading-spinner"></span>' : ''}
      </p>
      <p class="stat-change">${this.isLoading ? 'Chargement...' : 'Chargement...'}</p>
    `;
  }

  public getElement(): HTMLElement {
    return this.container;
  }
}