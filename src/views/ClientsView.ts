// ClientsView.ts
export class ClientsView {
  private container: HTMLElement;

  constructor() {
    this.container = document.createElement('div');
    this.container.className = 'clients-view';
    this.render();
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
          <h3>Prospects</h3>
          <p class="stat-value">32</p>
        </div>
      </div>
      
      <div class="clients-actions">
        <button class="btn btn-primary">Nouvel Abonné</button>
        <button class="btn btn-secondary">Importer Abonnés</button>
      </div>
      
      <div class="clients-table-container">
        <table class="clients-table">
          <thead>
            <tr>
              <th>Code</th>
              <th>Nom</th>
              <th>Type</th>
              <th>Téléphone</th>
              <th>Email</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>A001</td>
              <td>Entreprise ABC</td>
              <td>Professionnel</td>
              <td>01 23 45 67 89</td>
              <td>contact@abc.com</td>
              <td>
                <button class="btn btn-small btn-secondary">Modifier</button>
                <button class="btn btn-small btn-danger">Supprimer</button>
              </td>
            </tr>
            <tr>
              <td>A002</td>
              <td>M. Dupont</td>
              <td>Particulier</td>
              <td>06 12 34 56 78</td>
              <td>dupont@email.com</td>
              <td>
                <button class="btn btn-small btn-secondary">Modifier</button>
                <button class="btn btn-small btn-danger">Supprimer</button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    `;
  }

  public getElement(): HTMLElement {
    return this.container;
  }
}