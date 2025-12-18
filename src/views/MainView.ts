// MainView.ts
import { Navbar } from '../components/Navbar';
import { Dashboard } from '../components/Dashboard';
import { ArticlesView } from './ArticlesView';
import { ClientsView } from './ClientsView';
import { SettingsView } from './SettingsView';

export class MainView {
  private navbar: Navbar;
  private contentContainer: HTMLElement;
  private currentView: HTMLElement | null = null;

  constructor() {
    this.navbar = new Navbar();
    this.contentContainer = document.createElement('div');
    this.contentContainer.className = 'main-content';
    this.setupLayout();
    this.setupEventListeners();
    this.showDashboard();
  }

  private setupLayout(): void {
    // Ajouter la navbar au document
    document.body.appendChild(this.navbar.getElement());
    
    // Ajouter le conteneur de contenu au document
    document.body.appendChild(this.contentContainer);
  }

  private setupEventListeners(): void {
    // Écouter les événements de navigation
    window.addEventListener('navigate', (e: CustomEvent) => {
      const page = e.detail;
      this.navigateTo(page);
    });
  }

  private navigateTo(page: string): void {
    switch (page) {
      case 'dashboard':
        this.showDashboard();
        break;
      case 'articles':
        this.showArticles();
        break;
      case 'clients':
        this.showClients();
        break;
      case 'settings':
        this.showSettings();
        break;
      default:
        this.showDashboard();
    }
  }

  private showDashboard(): void {
    // Supprimer la vue actuelle
    if (this.currentView) {
      this.contentContainer.removeChild(this.currentView);
    }
    
    // Créer et afficher le dashboard
    const dashboard = new Dashboard();
    this.currentView = dashboard.getElement();
    this.contentContainer.appendChild(this.currentView);
  }

  private showArticles(): void {
    // Supprimer la vue actuelle
    if (this.currentView) {
      this.contentContainer.removeChild(this.currentView);
    }
    
    // Créer et afficher la page articles
    const articlesView = new ArticlesView();
    this.currentView = articlesView.getElement();
    this.contentContainer.appendChild(this.currentView);
  }

  private showClients(): void {
    // Supprimer la vue actuelle
    if (this.currentView) {
      this.contentContainer.removeChild(this.currentView);
    }
    
    // Créer et afficher la page clients
    const clientsView = new ClientsView();
    this.currentView = clientsView.getElement();
    this.contentContainer.appendChild(this.currentView);
  }

  private showSettings(): void {
    // Supprimer la vue actuelle
    if (this.currentView) {
      this.contentContainer.removeChild(this.currentView);
    }
    
    // Créer et afficher la page paramètres
    const settingsView = new SettingsView();
    this.currentView = settingsView.getElement();
    this.contentContainer.appendChild(this.currentView);
  }
}