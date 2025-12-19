// MainView.ts
import { Navbar } from '../components/Navbar';
import { Dashboard } from '../components/Dashboard';
import { ClientsView } from './ClientsView';
import { SettingsView } from './SettingsView';
import { StatistiqueAbonnesView } from './StatistiqueAbonnesView';

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
    
    // Initialiser la navbar (attacher les écouteurs d'événements)
    this.navbar.initialize();
    
    // Ajouter le conteneur de contenu au document
    document.body.appendChild(this.contentContainer);
  }

  private setupEventListeners(): void {
    // Écouter les événements de navigation
    window.addEventListener('navigate', (e: any) => {
      const view = (e as CustomEvent).detail.view;
      this.navigateTo(view);
    });
  }

  private navigateTo(view: string): void {
    switch (view) {
      case 'dashboard':
        this.showDashboard();
        break;
      case 'portefeuille':
        this.showPortefeuille();
        break;
      case 'statistique-abonnes':
        this.showStatistiqueAbonnes();
        break;
      case 'settings':
        this.showSettings();
        break;
      default:
        this.showDashboard();
    }
    
    // Mettre à jour le lien actif dans la navbar
    this.navbar.setActiveLink(view);
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

  private showPortefeuille(): void {
    // Supprimer la vue actuelle
    if (this.currentView) {
      this.contentContainer.removeChild(this.currentView);
    }
    
    // Créer et afficher la page portefeuille
    const clientsView = new ClientsView();
    this.currentView = clientsView.getElement();
    this.contentContainer.appendChild(this.currentView);
  }

  private showStatistiqueAbonnes(): void {
    // Supprimer la vue actuelle
    if (this.currentView) {
      this.contentContainer.removeChild(this.currentView);
    }
    
    // Créer et afficher la page statistique abonnés
    const statistiqueAbonnesView = new StatistiqueAbonnesView();
    this.currentView = statistiqueAbonnesView.getElement();
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