// dbfService.ts
import { getDbfFiles, getCentresCount, getAbonnesCount, getAbonnesCountByType, getAbonnesCompteurArret, getAbonnesSansCompteur, updateDbfPath, getDbfPath } from '../api';

/**
 * Service pour gérer les opérations sur les fichiers DBF
 */
export class DbfService {
  /**
   * Récupère la liste des fichiers DBF disponibles
   */
  static async getDbfFiles() {
    try {
      return await getDbfFiles();
    } catch (error) {
      console.error('Erreur lors de la récupération des fichiers DBF:', error);
      throw error;
    }
  }

  /**
   * Récupère le nombre réel de centres depuis TABCODE.DBF
   * Les centres sont identifiés par des codes commençant par 'S' (exemple: S02)
   */
  static async getCentresCount(): Promise<number> {
    try {
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
   */
  static async getAbonnesCount(): Promise<number> {
    try {
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
   */
  static async getAbonnesCountByType() {
    try {
      return await getAbonnesCountByType();
    } catch (error) {
      console.error('Erreur lors de la récupération du nombre d\'abonnés par type:', error);
      throw error;
    }
  }

  /**
   * Récupère le nombre d'abonnés avec compteur à l'arrêt (ETATCPT = '20') depuis ABONMENT.DBF
   */
  static async getAbonnesCompteurArret(): Promise<number> {
    try {
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
   */
  static async getAbonnesSansCompteur(): Promise<number> {
    try {
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