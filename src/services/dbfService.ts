// dbfService.ts
import { getDbfFiles, getCentresCount, getAbonnesCount, getAbonnesCountByType, getAbonnesCompteurArret, getAbonnesSansCompteur, updateDbfPath, getDbfPath } from '../api';
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
   */
  static async getCentresCount(): Promise<number> {
    try {
      console.log(`Utilisation de l'index ${dbfConfig.indexFile || 'aucun'} pour accélérer les requêtes TABCODE.DBF`);
      const result = await getCentresCount();
      return result.count || 0;
    } catch (error) {
      console.error('Erreur lors de la récupération du nombre de centres:', error);
      // Retourner 0 en cas d'erreur
      return 0;
    }
  }

  /**
   * Récupère le nombre d'abonnés depuis ABONNE.DBF
   * Utilise les fichiers d'index NTX si disponibles pour accélérer les requêtes
   */
  static async getAbonnesCount(): Promise<number> {
    try {
      console.log(`Utilisation de l'index ${dbfConfig.indexFile || 'aucun'} pour accélérer les requêtes ABONNE.DBF`);
      const result = await getAbonnesCount();
      return result.count || 0;
    } catch (error) {
      console.error('Erreur lors de la récupération du nombre d\'abonnés:', error);
      // Retourner 0 en cas d'erreur
      return 0;
    }
  }

  /**
   * Récupère le nombre d'abonnés par type depuis ABONNE.DBF avec jointure TABCODE.DBF
   * Utilise les fichiers d'index NTX si disponibles pour accélérer les requêtes
   */
  static async getAbonnesCountByType() {
    try {
      console.log(`Utilisation de l'index ${dbfConfig.indexFile || 'aucun'} pour accélérer les requêtes ABONNE.DBF avec jointure TABCODE.DBF`);
      return await getAbonnesCountByType();
    } catch (error) {
      console.error('Erreur lors de la récupération du nombre d\'abonnés par type:', error);
      throw error;
    }
  }

  /**
   * Récupère le nombre d'abonnés avec compteur à l'arrêt (ETATCPT = '20') depuis ABONMENT.DBF
   * Utilise les fichiers d'index NTX si disponibles pour accélérer les requêtes
   */
  static async getAbonnesCompteurArret(): Promise<number> {
    try {
      console.log(`Utilisation de l'index ${dbfConfig.indexFile || 'aucun'} pour accélérer les requêtes ABONMENT.DBF (compteur à l'arrêt)`);
      const result = await getAbonnesCompteurArret();
      return result.count || 0;
    } catch (error) {
      console.error('Erreur lors de la récupération du nombre d\'abonnés avec compteur à l\'arrêt:', error);
      // Retourner 0 en cas d'erreur
      return 0;
    }
  }

  /**
   * Récupère le nombre d'abonnés sans compteur (ETATCPT = '30') depuis ABONMENT.DBF
   * Utilise les fichiers d'index NTX si disponibles pour accélérer les requêtes
   */
  static async getAbonnesSansCompteur(): Promise<number> {
    try {
      console.log(`Utilisation de l'index ${dbfConfig.indexFile || 'aucun'} pour accélérer les requêtes ABONMENT.DBF (sans compteur)`);
      const result = await getAbonnesSansCompteur();
      return result.count || 0;
    } catch (error) {
      console.error('Erreur lors de la récupération du nombre d\'abonnés sans compteur:', error);
      // Retourner 0 en cas d'erreur
      return 0;
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
}