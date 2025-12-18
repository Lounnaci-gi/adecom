// Navbar.ts
export class Navbar {
  private container: HTMLElement;

  constructor() {
    this.container = document.createElement('nav');
    this.container.className = 'navbar';
    this.render();
  }

  private render(): void {
    this.container.innerHTML = `
      <div class="navbar-container">
        <div class="navbar-brand">
          <h1>Mon Application</h1>
        </div>
        <ul class="navbar-menu">
          <li class="navbar-item">
            <a href="#" class="navbar-link" data-page="dashboard">Tableau de bord</a>
          </li>
          <li class="navbar-item">
            <a href="#" class="navbar-link" data-page="articles">Articles</a>
          </li>
          <li class="navbar-item">
            <a href="#" class="navbar-link" data-page="clients">Clients</a>
          </li>
          <li class="navbar-item">
            <a href="#" class="navbar-link" data-page="settings">Paramètres</a>
          </li>
        </ul>
      </div>
    `;

    // Ajouter les écouteurs d'événements
    this.addEventListeners();
  }

  private addEventListeners(): void {
    const links = this.container.querySelectorAll('.navbar-link');
    links.forEach(link => {
      link.addEventListener('click', (e) => {
        e.preventDefault();
        const page = (e.target as HTMLElement).getAttribute('data-page');
        if (page) {
          this.onNavigate(page);
        }
      });
    });
  }

  private onNavigate(page: string): void {
    // Dispatch un événement personnalisé pour la navigation
    const event = new CustomEvent('navigate', { detail: page });
    window.dispatchEvent(event);
  }

  public getElement(): HTMLElement {
    return this.container;
  }
}