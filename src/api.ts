// api.ts
// URL de base de l'API
const API_BASE_URL = 'http://localhost:3000';

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
 * Récupère la liste des centres depuis TABCODE.DBF
 */
export async function getCentresList() {
  try {
    const response = await fetch(`${API_BASE_URL}/api/centres/list`);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    return await response.json();
  } catch (error) {
    console.error('Erreur lors de la récupération de la liste des centres:', error);
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
 * Rafraîchit le cache du serveur
 */
export async function refreshServerCache() {
  try {
    const response = await fetch(`${API_BASE_URL}/api/cache/refresh`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      }
    });
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    return await response.json();
  } catch (error) {
    console.error('Erreur lors du rafraîchissement du cache serveur:', error);
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

/**
 * Enregistre le centre sélectionné dans le fichier .env
 */
export async function saveCentreToEnv(centreCode: string) {
  try {
    const response = await fetch(`${API_BASE_URL}/api/settings/save-centre`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ centreCode })
    });
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error('Erreur lors de l\'enregistrement du centre dans .env:', error);
    throw error;
  }
}

/**
 * Récupère la somme des créances des abonnés depuis FACTURES.DBF
 * @param forceRefresh Force le rafraîchissement des données
 */
export async function getAbonnesCreances(forceRefresh: boolean = false) {
  try {
    const url = forceRefresh 
      ? `${API_BASE_URL}/api/abonnes/creances?refresh=true`
      : `${API_BASE_URL}/api/abonnes/creances`;
      
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    return await response.json();
  } catch (error) {
    console.error('Erreur lors de la récupération des créances des abonnés:', error);
    throw error;
  }
}

/**
 * Récupère la somme des créances des abonnés résiliés depuis FACTURES.DBF
 * @param forceRefresh Force le rafraîchissement des données
 */
export async function getAbonnesCreancesResilies(forceRefresh: boolean = false) {
  try {
    const url = forceRefresh 
      ? `${API_BASE_URL}/api/abonnes/creances-resilies?refresh=true`
      : `${API_BASE_URL}/api/abonnes/creances-resilies`;
      
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    return await response.json();
  } catch (error) {
    console.error('Erreur lors de la récupération des créances des abonnés résiliés:', error);
    throw error;
  }
}

/**
 * Récupère la somme des créances d'eau depuis FACTURES.DBF
 * @param forceRefresh Force le rafraîchissement des données
 */
export async function getAbonnesCreancesEau(forceRefresh: boolean = false) {
  try {
    const url = forceRefresh 
      ? `${API_BASE_URL}/api/abonnes/creances-eau?refresh=true`
      : `${API_BASE_URL}/api/abonnes/creances-eau`;
      
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    return await response.json();
  } catch (error) {
    console.error('Erreur lors de la récupération des créances d\'eau:', error);
    throw error;
  }
}

/**
 * Récupère la somme des créances des prestations depuis FACTURES.DBF
 * @param forceRefresh Force le rafraîchissement des données
 */
export async function getAbonnesCreancesPrestations(forceRefresh: boolean = false) {
  try {
    const url = forceRefresh 
      ? `${API_BASE_URL}/api/abonnes/creances-prestations?refresh=true`
      : `${API_BASE_URL}/api/abonnes/creances-prestations`;
    
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    return await response.json();
  } catch (error) {
    console.error('Erreur lors de la récupération des créances des prestations:', error);
    throw error;
  }
}

/**
 * Récupère les créances par catégorie depuis FACTURES.DBF
 * @param forceRefresh Force le rafraîchissement des données
 */
export async function getAbonnesCreancesParCategorie(forceRefresh: boolean = false) {
  try {
    const url = forceRefresh 
      ? `${API_BASE_URL}/api/abonnes/creances-par-categorie?refresh=true`
      : `${API_BASE_URL}/api/abonnes/creances-par-categorie`;
      
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    return await response.json();
  } catch (error) {
    console.error('Erreur lors de la récupération des créances par catégorie:', error);
    throw error;
  }
}

/**
 * Récupère les créances par date pour la catégorie Cat 1
 * @param date Date au format yyyymmdd
 */
export async function getCreancesByDate(date: string) {
  try {
    const response = await fetch(`${API_BASE_URL}/api/abonnes/creances-by-date?date=${date}`);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    return await response.json();
  } catch (error) {
    console.error('Erreur lors de la récupération des créances par date:', error);
    throw error;
  }
}