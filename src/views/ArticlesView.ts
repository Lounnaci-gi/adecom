// ArticlesView.ts
export class ArticlesView {
  private container: HTMLElement;

  constructor() {
    this.container = document.createElement('div');
    this.container.className = 'articles-view';
    this.render();
  }

  private render(): void {
    this.container.innerHTML = `
      <div class="articles-header">
        <h2>Gestion des Articles</h2>
        <p>Module de gestion du catalogue d'articles</p>
      </div>
      
      <div class="articles-actions">
        <button class="btn btn-primary">Nouvel Article</button>
        <button class="btn btn-secondary">Importer Articles</button>
      </div>
      
      <div class="articles-table-container">
        <table class="articles-table">
          <thead>
            <tr>
              <th>Code</th>
              <th>Désignation</th>
              <th>Catégorie</th>
              <th>Prix HT</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>A001</td>
              <td>Article de test 1</td>
              <td>Service</td>
              <td>100.00 €</td>
              <td>
                <button class="btn btn-small btn-secondary">Modifier</button>
                <button class="btn btn-small btn-danger">Supprimer</button>
              </td>
            </tr>
            <tr>
              <td>A002</td>
              <td>Article de test 2</td>
              <td>Produit</td>
              <td>50.00 €</td>
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