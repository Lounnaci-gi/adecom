// Fichier de configuration pour l'application
// Utilise les variables d'environnement définies avec le préfixe VITE_

export const config = {
  // Chemin vers le dossier contenant les fichiers DBF et NTX
  DBF_FOLDER_PATH: import.meta.env.VITE_DBF_FOLDER_PATH || './data/dbf',
  
  // Configuration de la base de données dBASE
  DBF_DATABASE_NAME: import.meta.env.VITE_DBF_DATABASE_NAME || 'database.dbf',
  DBF_INDEX_FILE: import.meta.env.VITE_DBF_INDEX_FILE || 'index.ntx',
  
  // Paramètres de connexion
  DBF_ENCODING: import.meta.env.VITE_DBF_ENCODING || 'latin1',
  DBF_USE_MEMO_FILES: import.meta.env.VITE_DBF_USE_MEMO_FILES === 'true' || false,
  
  // Vérifier si l'environnement est en développement
  isDevelopment: import.meta.env.DEV,
  
  // Obtenir toutes les variables d'environnement
  getEnvVariables: () => {
    return {
      DBF_FOLDER_PATH: import.meta.env.VITE_DBF_FOLDER_PATH,
      DBF_DATABASE_NAME: import.meta.env.VITE_DBF_DATABASE_NAME,
      DBF_INDEX_FILE: import.meta.env.VITE_DBF_INDEX_FILE,
      DBF_ENCODING: import.meta.env.VITE_DBF_ENCODING,
      DBF_USE_MEMO_FILES: import.meta.env.VITE_DBF_USE_MEMO_FILES,
    };
  }
};

export default config;