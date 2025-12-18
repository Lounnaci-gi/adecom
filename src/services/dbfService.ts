// dbfService.ts
import { getTabcodeData, getCentresCount, getAbonnesCount, getAbonnesCountByType, getAbonnesCompteurArret, getAbonnesSansCompteur } from '../api';

export interface Centre {
  code: string;
  libelle: string;
}

export interface AbonneType {
  code: string;
  designation: string;
  count: number;
  resilieCount: number;
}

export class DbfService {
  /**
   * Récupère le nombre de centres depuis le fichier TABCODE.DBF
   * Les centres sont identifiés par un code commençant par 'S'
   */
  static async getCentresCount(): Promise<number> {
    try {
      // Utiliser le nouvel endpoint dédié
      const result = await getCentresCount();
      return result.count || 0;
    } catch (error) {
      console.error('Erreur lors de la récupération du nombre de centres:', error);
      // Retourner 0 en cas d'erreur
      return 0;
    }
  }
  
  /**
   * Récupère le nombre d'abonnés depuis le fichier ABONNE.DBF
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
   * Récupère le nombre d'abonnés par type depuis les fichiers ABONNE.DBF et TABCODE.DBF
   */
  static async getAbonnesCountByType(): Promise<{totalCount: number, totalResilieCount: number, types: AbonneType[]}> {
    try {
      const result = await getAbonnesCountByType();
      return result;
    } catch (error) {
      console.error('Erreur lors de la récupération du nombre d\'abonnés par type:', error);
      // Retourner un objet vide en cas d'erreur
      return {
        totalCount: 0,
        totalResilieCount: 0,
        types: []
      };
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
   * Récupère la liste des centres depuis le fichier TABCODE.DBF
   * Les centres sont identifiés par un code commençant par 'S'
   */
  static async getCentresList(): Promise<Centre[]> {
    try {
      const data = await getTabcodeData();
      
      // Vérifier si nous avons des données
      if (!data || !Array.isArray(data) || data.length === 0) {
        console.warn('Aucune donnée TABCODE disponible');
        return [];
      }
      
      // Filtrer et mapper les enregistrements dont le code commence par 'S'
      // Le champ s'appelle CODE_AFFEC selon les informations du fichier
      const centres = data
        .filter((record: any) => {
          return record.CODE_AFFEC && typeof record.CODE_AFFEC === 'string' && record.CODE_AFFEC.startsWith('S');
        })
        .map((record: any) => ({
          code: record.CODE_AFFEC,
          libelle: record.LIBELLEEC || record.LIBELLE || ''
        }));
      
      return centres;
    } catch (error) {
      console.error('Erreur lors de la récupération de la liste des centres:', error);
      return [];
    }
  }
}