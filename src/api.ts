// api.ts
import config from './config';

// URL de base de l'API
const API_BASE_URL = config.API_BASE_URL || 'http://localhost:3000';

/**
 * Récupère la liste des fichiers DBF disponibles
 */
export async function getDbfFiles() {
  try {
    const response = await fetch(`${API_BASE_URL}/api/dbf-files`);
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
 * Récupère le nombre de centres depuis TABCODE.DBF
 * Les centres sont identifiés par des codes commençant par 'S' (exemple: S02)
 */
export async function getCentresCount() {
  try {
    const response = await fetch(`${API_BASE_URL}/api/centres/count`);
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
 */
export async function getAbonnesCount() {
  try {
    const response = await fetch(`${API_BASE_URL}/api/abonnes/count`);
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
 */
export async function getAbonnesCountByType() {
  try {
    const response = await fetch(`${API_BASE_URL}/api/abonnes/count-by-type`);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    return await response.json();
  } catch (error) {
    console.error('Erreur lors de la récupération du nombre d\'abonnés par type:', error);
    throw error;
  }
}

/**
 * Récupère le nombre d'abonnés avec compteur à l'arrêt (ETATCPT = '20') depuis ABONMENT.DBF
 */
export async function getAbonnesCompteurArret() {
  try {
    const response = await fetch(`${API_BASE_URL}/api/abonnes/compteur-arret`);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    return await response.json();
  } catch (error) {
    console.error('Erreur lors de la récupération du nombre d\'abonnés avec compteur à l\'arrêt:', error);
    throw error;
  }
}

/**
 * Récupère le nombre d'abonnés sans compteur (ETATCPT = '30') depuis ABONMENT.DBF
 */
export async function getAbonnesSansCompteur() {
  try {
    const response = await fetch(`${API_BASE_URL}/api/abonnes/sans-compteur`);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    return await response.json();
  } catch (error) {
    console.error('Erreur lors de la récupération du nombre d\'abonnés sans compteur:', error);
    throw error;
  }
}

/**
 * Met à jour le chemin du dossier DBF
 */
export async function updateDbfPath(dbfPath: string) {
  try {
    const response = await fetch(`${API_BASE_URL}/api/settings/dbf-path`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ dbfPath })
    });
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    return await response.json();
  } catch (error) {
    console.error('Erreur lors de la mise à jour du chemin DBF:', error);
    throw error;
  }
}

/**
 * Récupère le chemin actuel du dossier DBF
 */
export async function getDbfPath() {
  try {
    const response = await fetch(`${API_BASE_URL}/api/settings/dbf-path`);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    return await response.json();
  } catch (error) {
    console.error('Erreur lors de la récupération du chemin DBF:', error);
    throw error;
  }
}