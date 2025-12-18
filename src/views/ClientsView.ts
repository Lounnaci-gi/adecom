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
        <h2>Gestion des Clients</h2>
        <p>Module de gestion de la base clients</p>
      </div>
      
      <div class="clients-stats">
        <div class="stat-card">
          <h3>Total Clients</h3>
          <p class="stat-value">128</p>
        </div>
        
        <div class="stat-card">
          <h3>Clients Actifs</h3>
          <p class="stat-value">96</p>
        </div>
        
        <div class="stat-card">
          <h3>Prospects</h3>
          <p class="stat-value">32</p>
        </div>
      </div>
      
      <div class="clients-actions">
        <button class="btn btn-primary">Nouveau Client</button>
        <button class="btn btn-secondary">Importer Clients</button>
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
              <td>C001</td>
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
              <td>C002</td>
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