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
          <h1>Gestion des Abonnés</h1>
        </div>
        <ul class="navbar-menu">
          <li class="navbar-item">
            <a href="#" class="navbar-link" data-view="dashboard">Tableau de bord</a>
          </li>
          <li class="navbar-item">
            <a href="#" class="navbar-link" data-view="clients">Clients</a>
          </li>
          <li class="navbar-item">
            <a href="#" class="navbar-link" data-view="statistique-abonnes">Statistique Abonnés</a>
          </li>
          <li class="navbar-item">
            <a href="#" class="navbar-link" data-view="settings">Paramètres</a>
          </li>
        </ul>
      </div>
    `;

    // Ajouter les écouteurs d'événements
    const links = this.container.querySelectorAll('.navbar-link');
    links.forEach(link => {
      link.addEventListener('click', (e) => {
        e.preventDefault();
        const view = (e.target as HTMLElement).getAttribute('data-view');
        if (view) {
          // Dispatcher un événement personnalisé pour changer de vue
          const event = new CustomEvent('navigate', { detail: { view } });
          window.dispatchEvent(event);
          
          // Mettre à jour la classe active
          links.forEach(l => l.classList.remove('active'));
          (e.target as HTMLElement).classList.add('active');
        }
      });
    });
  }

  public getElement(): HTMLElement {
    return this.container;
  }

  public setActiveLink(view: string): void {
    const links = this.container.querySelectorAll('.navbar-link');
    links.forEach(link => {
      link.classList.remove('active');
      if (link.getAttribute('data-view') === view) {
        link.classList.add('active');
      }
    });
  }
}