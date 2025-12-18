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
        <div class="navbar-toggle">
          <span></span>
          <span></span>
          <span></span>
        </div>
        <ul class="navbar-menu">
          <li class="navbar-item">
            <a href="#" class="navbar-link" data-view="dashboard">Tableau de bord</a>
          </li>
          <li class="navbar-item">
            <a href="#" class="navbar-link" data-view="portefeuille">Portefeuille</a>
          </li>
          <li class="navbar-item">
            <a href="#" class="navbar-link" data-view="statistique-abonnes">Statistique Abonnés</a>
          </li>
          <li class="navbar-item">
            <a href="#" class="navbar-link" data-view="settings">Paramètres</a>
          </li>
          <li class="navbar-item theme-toggle">
            <button id="theme-toggle" class="theme-toggle-btn" aria-label="Toggle theme">
              <span class="theme-icon">🌙</span>
            </button>
          </li>
        </ul>
      </div>
    `;

    // Ajouter les écouteurs d'événements pour les liens de navigation
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
          
          // Fermer le menu mobile si ouvert
          const navbarMenu = this.container.querySelector('.navbar-menu');
          const navbarToggle = this.container.querySelector('.navbar-toggle');
          if (navbarMenu && navbarMenu.classList.contains('active')) {
            navbarMenu.classList.remove('active');
            navbarToggle?.classList.remove('active');
          }
        }
      });
    });
    
    // Gestion du menu hamburger
    const navbarToggle = this.container.querySelector('.navbar-toggle');
    const navbarMenu = this.container.querySelector('.navbar-menu');
    
    navbarToggle?.addEventListener('click', () => {
      navbarMenu?.classList.toggle('active');
      navbarToggle?.classList.toggle('active');
    });
  }
  
  // Méthode d'initialisation appelée après que l'élément soit ajouté au DOM
  public initialize(): void {
    // Gestion du toggle de thème
    const themeToggle = this.container.querySelector('#theme-toggle');
    const themeIcon = themeToggle?.querySelector('.theme-icon');
    
    // Vérifier le thème préféré de l'utilisateur
    const savedTheme = localStorage.getItem('theme');
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    const initialTheme = savedTheme || (prefersDark ? 'dark' : 'light');
    
    console.log('Initial theme:', initialTheme);
    console.log('Saved theme:', savedTheme);
    console.log('Prefers dark:', prefersDark);
    
    // Appliquer le thème initial
    document.documentElement.setAttribute('data-theme', initialTheme);
    console.log('Attribute set to:', document.documentElement.getAttribute('data-theme'));
    
    if (themeIcon) {
      themeIcon.textContent = initialTheme === 'dark' ? '☀️' : '🌙';
      console.log('Initial icon:', themeIcon.textContent);
    }
    
    // Gérer le clic sur le bouton de toggle
    themeToggle?.addEventListener('click', () => {
      const currentTheme = document.documentElement.getAttribute('data-theme');
      const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
      
      console.log('Current theme:', currentTheme, '-> New theme:', newTheme);
      
      document.documentElement.setAttribute('data-theme', newTheme);
      localStorage.setItem('theme', newTheme);
      
      console.log('Attribute set:', document.documentElement.getAttribute('data-theme'));
      
      if (themeIcon) {
        themeIcon.textContent = newTheme === 'dark' ? '☀️' : '🌙';
        console.log('New icon:', themeIcon.textContent);
      }
      
      // Forcer un reflow pour s'assurer que les styles sont appliqués
      document.body.offsetHeight;
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