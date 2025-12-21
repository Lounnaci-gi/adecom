// dbfService.ts
import { getDbfFiles, getCentresCount, getAbonnesCount, getAbonnesCountByType, getAbonnesCompteurArret, getAbonnesSansCompteur, updateDbfPath, getDbfPath, getCentresList, saveCentreToEnv, getAbonnesCreances, getAbonnesCreancesResilies, refreshServerCache } from '../api';
import { dbfConfig } from '../database/dbfConnection';

/**
 * Service pour gérer les opérations sur les fichiers DBF
 */
export class DbfService {
  /**
   * Récupère la liste des fichiers DBF disponibles
   * Utilise les fichiers d'index NTX si disponibles pour accélérer les requêtes
   */
  static async getDbfFiles() {
    try {
      console.log(`Utilisation de l'index ${dbfConfig.indexFile || 'aucun'} pour accélérer les requêtes`);
      return await getDbfFiles();
    } catch (error) {
      console.error('Erreur lors de la récupération des fichiers DBF:', error);
      throw error;
    }
  }

  /**
   * Récupère le nombre réel de centres depuis TABCODE.DBF
   * Les centres sont identifiés par des codes commençant par 'S' (exemple: S02)
   * Utilise les fichiers d'index NTX si disponibles pour accélérer les requêtes
   * @param forceRefresh Force le rafraîchissement des données
   */
  static async getCentresCount(forceRefresh: boolean = false): Promise<number> {
    try {
      // Vérifier le cache
      if (!forceRefresh) {
        const cachedData = sessionStorage.getItem('centresCount');
        if (cachedData) {
          const parsedData = JSON.parse(cachedData);
          // Vérifier si les données ne sont pas trop anciennes (30 minutes)
          if (Date.now() - parsedData.timestamp < 30 * 60 * 1000) {
            return parsedData.count;
          }
        }
      }
      
      console.log(`Utilisation de l'index ${dbfConfig.indexFile || 'aucun'} pour accélérer les requêtes TABCODE.DBF`);
      const result = await getCentresCount();
      const count = result.count || 0;
      
      // Mettre en cache
      const cacheData = {
        count: count,
        timestamp: Date.now()
      };
      sessionStorage.setItem('centresCount', JSON.stringify(cacheData));
      
      return count;
    } catch (error) {
      console.error('Erreur lors de la récupération du nombre de centres:', error);
      // Retourner 0 en cas d'erreur
      return 0;
    }
  }

  /**
   * Récupère le nombre d'abonnés depuis ABONNE.DBF
   * Utilise les fichiers d'index NTX si disponibles pour accélérer les requêtes
   * @param forceRefresh Force le rafraîchissement des données
   */
  static async getAbonnesCount(forceRefresh: boolean = false): Promise<number> {
    try {
      // Vérifier le cache
      if (!forceRefresh) {
        const cachedData = sessionStorage.getItem('abonnesCount');
        if (cachedData) {
          const parsedData = JSON.parse(cachedData);
          // Vérifier si les données ne sont pas trop anciennes (30 minutes)
          if (Date.now() - parsedData.timestamp < 30 * 60 * 1000) {
            return parsedData.count;
          }
        }
      }
      
      console.log(`Utilisation de l'index ${dbfConfig.indexFile || 'aucun'} pour accélérer les requêtes ABONNE.DBF`);
      const result = await getAbonnesCount();
      const count = result.count || 0;
      
      // Mettre en cache
      const cacheData = {
        count: count,
        timestamp: Date.now()
      };
      sessionStorage.setItem('abonnesCount', JSON.stringify(cacheData));
      
      return count;
    } catch (error) {
      console.error('Erreur lors de la récupération du nombre d\'abonnés:', error);
      // Retourner 0 en cas d'erreur
      return 0;
    }
  }

  /**
   * Récupère le nombre d'abonnés par type depuis ABONNE.DBF avec jointure TABCODE.DBF
   * Utilise les fichiers d'index NTX si disponibles pour accélérer les requêtes
   * @param forceRefresh Force le rafraîchissement des données
   */
  static async getAbonnesCountByType(forceRefresh: boolean = false) {
    try {
      // Vérifier le cache
      if (!forceRefresh) {
        const cachedData = sessionStorage.getItem('abonnesCountByType');
        if (cachedData) {
          const parsedData = JSON.parse(cachedData);
          // Vérifier si les données ne sont pas trop anciennes (30 minutes)
          if (Date.now() - parsedData.timestamp < 30 * 60 * 1000) {
            return parsedData.data;
          }
        }
      }
      
      console.log(`Utilisation de l'index ${dbfConfig.indexFile || 'aucun'} pour accélérer les requêtes ABONNE.DBF avec jointure TABCODE.DBF`);
      const result = await getAbonnesCountByType();
      
      // Mettre en cache
      const cacheData = {
        data: result,
        timestamp: Date.now()
      };
      sessionStorage.setItem('abonnesCountByType', JSON.stringify(cacheData));
      
      return result;
    } catch (error) {
      console.error('Erreur lors de la récupération du nombre d\'abonnés par type:', error);
      throw error;
    }
  }

  /**
   * Récupère le nombre d'abonnés avec compteur à l'arrêt (ETATCPT = '20') depuis ABONMENT.DBF
   * Utilise les fichiers d'index NTX si disponibles pour accélérer les requêtes
   * @param forceRefresh Force le rafraîchissement des données
   */
  static async getAbonnesCompteurArret(forceRefresh: boolean = false): Promise<number> {
    try {
      // Vérifier le cache
      if (!forceRefresh) {
        const cachedData = sessionStorage.getItem('abonnesCompteurArret');
        if (cachedData) {
          const parsedData = JSON.parse(cachedData);
          // Vérifier si les données ne sont pas trop anciennes (30 minutes)
          if (Date.now() - parsedData.timestamp < 30 * 60 * 1000) {
            return parsedData.count;
          }
        }
      }
      
      console.log(`Utilisation de l'index ${dbfConfig.indexFile || 'aucun'} pour accélérer les requêtes ABONMENT.DBF (compteur à l'arrêt)`);
      const result = await getAbonnesCompteurArret();
      const count = result.count || 0;
      
      // Mettre en cache
      const cacheData = {
        count: count,
        timestamp: Date.now()
      };
      sessionStorage.setItem('abonnesCompteurArret', JSON.stringify(cacheData));
      
      return count;
    } catch (error) {
      console.error('Erreur lors de la récupération du nombre d\'abonnés avec compteur à l\'arrêt:', error);
      // Retourner 0 en cas d'erreur
      return 0;
    }
  }

  /**
   * Récupère le nombre d'abonnés sans compteur (ETATCPT = '30') depuis ABONMENT.DBF
   * Utilise les fichiers d'index NTX si disponibles pour accélérer les requêtes
   * @param forceRefresh Force le rafraîchissement des données
   */
  static async getAbonnesSansCompteur(forceRefresh: boolean = false): Promise<number> {
    try {
      // Vérifier le cache
      if (!forceRefresh) {
        const cachedData = sessionStorage.getItem('abonnesSansCompteur');
        if (cachedData) {
          const parsedData = JSON.parse(cachedData);
          // Vérifier si les données ne sont pas trop anciennes (30 minutes)
          if (Date.now() - parsedData.timestamp < 30 * 60 * 1000) {
            return parsedData.count;
          }
        }
      }
      
      console.log(`Utilisation de l'index ${dbfConfig.indexFile || 'aucun'} pour accélérer les requêtes ABONMENT.DBF (sans compteur)`);
      const result = await getAbonnesSansCompteur();
      const count = result.count || 0;
      
      // Mettre en cache
      const cacheData = {
        count: count,
        timestamp: Date.now()
      };
      sessionStorage.setItem('abonnesSansCompteur', JSON.stringify(cacheData));
      
      return count;
    } catch (error) {
      console.error('Erreur lors de la récupération du nombre d\'abonnés sans compteur:', error);
      // Retourner 0 en cas d'erreur
      return 0;
    }
  }
  
  /**
   * Récupère la liste des centres
   */
  static async getCentresList(): Promise<{ code: string; libelle: string }[]> {
    try {
      const result = await getCentresList();
      return result.centres || [];
    } catch (error) {
      console.error('Erreur lors de la récupération de la liste des centres:', error);
      // Retourner un tableau vide en cas d'erreur
      return [];
    }
  }

  /**
   * Met à jour le chemin du dossier DBF
   */
  static async updateDbfPath(dbfPath: string): Promise<boolean> {
    try {
      const result = await updateDbfPath(dbfPath);
      return result.success || false;
    } catch (error) {
      console.error('Erreur lors de la mise à jour du chemin DBF:', error);
      return false;
    }
  }
  
  /**
   * Enregistre le chemin du dossier DBF dans le fichier .env
   */
  static async saveDbfPathToEnv(dbfPath: string): Promise<boolean> {
    try {
      // Appeler l'API backend pour enregistrer le chemin dans .env
      const response = await fetch('/api/settings/save-env', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ dbfPath })
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const result = await response.json();
      return result.success || false;
    } catch (error) {
      console.error('Erreur lors de l\'enregistrement du chemin DBF dans .env:', error);
      return false;
    }
  }
  

  
  /**
   * Récupère la somme des créances des abonnés
   * Utilise les fichiers d'index FAC*.NTX si disponibles pour accélérer les requêtes
   * @param forceRefresh Force le rafraîchissement des données
   */
  static async getAbonnesCreances(forceRefresh: boolean = false): Promise<number> {
    try {
      console.log('Utilisation des index FAC*.NTX pour accélérer les requêtes FACTURES.DBF (créances)');
      const result = await getAbonnesCreances(forceRefresh);
      console.log(`Index utilisés: ${result.indexUsed || 'aucun'}, Nombre d'index: ${result.indexCount || 0}`);
      return result.totalCreances || 0;
    } catch (error) {
      console.error('Erreur lors de la récupération des créances des abonnés:', error);
      // Retourner 0 en cas d'erreur
      return 0;
    }
  }

  /**
   * Récupère la somme des créances des abonnés résiliés
   * @param forceRefresh Force le rafraîchissement des données
   */
  static async getAbonnesCreancesResilies(forceRefresh: boolean = false): Promise<number> {
    try {
      const result = await getAbonnesCreancesResilies(forceRefresh);
      return result.totalCreancesResilies || 0;
    } catch (error) {
      console.error('Erreur lors de la récupération des créances des abonnés résiliés:', error);
      // Retourner 0 en cas d'erreur
      return 0;
    }
  }

  /**
   * Récupère le chemin actuel du dossier DBF
   */
  static async getDbfPath(): Promise<string> {
    try {
      const result = await getDbfPath();
      return result.dbfPath || 'D:/epeor';
    } catch (error) {
      console.error('Erreur lors de la récupération du chemin DBF:', error);
      return 'D:/epeor';
    }
  }

  /**
   * Enregistre le centre sélectionné dans le fichier .env
   */
  static async saveCentreToEnv(centreCode: string): Promise<boolean> {
    try {
      const result = await saveCentreToEnv(centreCode);
      return result.success || false;
    } catch (error) {
      console.error('Erreur lors de l\'enregistrement du centre dans .env:', error);
      return false;
    }
  }
  
  /**
   * Rafraîchit le cache du serveur
   */
  static async refreshServerCache(): Promise<boolean> {
    try {
      const result = await refreshServerCache();
      return result.success || false;
    } catch (error) {
      console.error('Erreur lors du rafraîchissement du cache serveur:', error);
      return false;
    }
  }
}