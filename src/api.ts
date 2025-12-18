// Fonctions pour communiquer avec le backend API
const API_BASE_URL = 'http://localhost:3000/api';

/**
 * Récupère la liste des fichiers DBF
 * @returns Promise<any>
 */
export async function getDbfFiles() {
  try {
    const response = await fetch(`${API_BASE_URL}/dbf-files`);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    return await response.json();
  } catch (error) {
    console.error('Erreur lors de la récupération des fichiers DBF:', error);
    throw error;
  }
}

/**
 * Récupère les informations sur un fichier DBF
 * @param filename Nom du fichier DBF
 * @returns Promise<any>
 */
export async function getDbfFileInfo(filename: string) {
  try {
    const response = await fetch(`${API_BASE_URL}/dbf-files/${encodeURIComponent(filename)}/info`);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    return await response.json();
  } catch (error) {
    console.error(`Erreur lors de la récupération des informations du fichier ${filename}:`, error);
    throw error;
  }
}

/**
 * Récupère les données d'un fichier DBF
 * @param filename Nom du fichier DBF
 * @param page Page à récupérer (optionnel)
 * @param limit Limite d'enregistrements (optionnel)
 * @returns Promise<any>
 */
export async function getDbfFileData(filename: string, page?: number, limit?: number) {
  try {
    let url = `${API_BASE_URL}/dbf-files/${encodeURIComponent(filename)}/data`;
    
    // Ajouter les paramètres de requête si présents
    const params = new URLSearchParams();
    if (page !== undefined) params.append('page', page.toString());
    if (limit !== undefined) params.append('limit', limit.toString());
    
    if (params.toString()) {
      url += `?${params.toString()}`;
    }
    
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    return await response.json();
  } catch (error) {
    console.error(`Erreur lors de la récupération des données du fichier ${filename}:`, error);
    throw error;
  }
}

/**
 * Récupère un enregistrement spécifique d'un fichier DBF
 * @param filename Nom du fichier DBF
 * @param index Index de l'enregistrement
 * @returns Promise<any>
 */
export async function getDbfRecord(filename: string, index: number) {
  try {
    const response = await fetch(`${API_BASE_URL}/dbf-files/${encodeURIComponent(filename)}/record/${index}`);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    return await response.json();
  } catch (error) {
    console.error(`Erreur lors de la récupération de l'enregistrement ${index} du fichier ${filename}:`, error);
    throw error;
  }
}

/**
 * Récupère les données du fichier TABCODE.DBF
 * @returns Promise<any>
 */
export async function getTabcodeData() {
  try {
    const response = await fetch(`${API_BASE_URL}/dbf-files/TABCODE.DBF/data`);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const result = await response.json();
    return result.data || result.records || [];
  } catch (error) {
    console.error('Erreur lors de la récupération des données TABCODE:', error);
    throw error;
  }
}

/**
 * Récupère le nombre de centres depuis TABCODE.DBF
 * @returns Promise<{count: number, exemples: any[]}>
 */
export async function getCentresCount() {
  try {
    const response = await fetch(`${API_BASE_URL}/centres/count`);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    return await response.json();
  } catch (error) {
    console.error('Erreur lors de la récupération du nombre de centres:', error);
    throw error;
  }
}

/**
 * Récupère le nombre d'abonnés depuis ABONNE.DBF
 * @returns Promise<{count: number}>
 */
export async function getAbonnesCount() {
  try {
    const response = await fetch(`${API_BASE_URL}/abonnes/count`);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    return await response.json();
  } catch (error) {
    console.error('Erreur lors de la récupération du nombre d\'abonnés:', error);
    throw error;
  }
}

/**
 * Récupère le nombre d'abonnés par type depuis ABONNE.DBF avec jointure TABCODE.DBF
 * @returns Promise<{totalCount: number, types: Array<{code: string, designation: string, count: number}>}>
 */
export async function getAbonnesCountByType() {
  try {
    const response = await fetch(`${API_BASE_URL}/abonnes/count-by-type`);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    return await response.json();
  } catch (error) {
    console.error('Erreur lors de la récupération du nombre d\'abonnés par type:', error);
    throw error;
  }
}

export default {
  getDbfFiles,
  getDbfFileInfo,
  getDbfFileData,
  getDbfRecord,
  getTabcodeData,
  getCentresCount,
  getAbonnesCount,
  getAbonnesCountByType
};