// Note: Dans un environnement frontend, nous ne pouvons pas accéder directement au système de fichiers
// Ce fichier simule la connexion DBF pour l'environnement de développement

import config from '../config';

/**
 * Configuration de la base de données
 */
export const dbfConfig = {
  folderPath: config.DBF_FOLDER_PATH,
  databaseName: config.DBF_DATABASE_NAME,
  indexFile: config.DBF_INDEX_FILE,
  encoding: config.DBF_ENCODING,
  useMemoFiles: config.DBF_USE_MEMO_FILES
};

console.log('Configuration DBF chargée:', dbfConfig);