// server.ts
import express from 'express';
import cors from 'cors';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';

dotenv.config();

// Configuration du dossier DBF
let DBF_FOLDER_PATH = process.env.DBF_FOLDER_PATH || process.env.VITE_DBF_FOLDER_PATH || 'D:/epeor';

// Fonction pour vérifier l'existence des fichiers d'index
function checkIndexFiles(folderPath: string): string[] {
  const indexExtensions = ['.ntx', '.idx', '.ndx'];
  const indexFiles: string[] = [];
  
  try {
    // Lire le contenu du dossier
    const files = fs.readdirSync(folderPath);
    
    // Vérifier chaque fichier pour voir s'il s'agit d'un fichier d'index
    files.forEach(file => {
      const ext = path.extname(file).toLowerCase();
      if (indexExtensions.includes(ext)) {
        indexFiles.push(file);
      }
    });
    
    // console.log(`Fichiers d'index trouvés: ${indexFiles.join(', ') || 'aucun'}`);
  } catch (error) {
    console.error('Erreur lors de la recherche des fichiers d\'index:', error);
  }
  
  return indexFiles;
}

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

// Servir les fichiers statiques
app.use(express.static('dist'));

// Route pour obtenir la liste des fichiers DBF
app.get('/api/dbf-files', (req, res) => {
  try {
    // Vérifier si le dossier existe
    if (!fs.existsSync(DBF_FOLDER_PATH)) {
      return res.status(404).json({ 
        error: 'Dossier DBF non trouvé',
        folderPath: DBF_FOLDER_PATH 
      });
    }
    
    // Lire le contenu du dossier
    const files = fs.readdirSync(DBF_FOLDER_PATH);
    
    // Filtrer les fichiers DBF
    const dbfFiles = files.filter(file => path.extname(file).toLowerCase() === '.dbf');
    
    // Vérifier les fichiers d'index
    const indexFiles = checkIndexFiles(DBF_FOLDER_PATH);
    
    res.json({
      files: dbfFiles,
      indexFiles: indexFiles,
      folderPath: DBF_FOLDER_PATH,
      dbfFiles: dbfFiles.length,
      indexFilesCount: indexFiles.length
    });
  } catch (error) {
    console.error('Erreur lors de la lecture du dossier DBF:', error);
    res.status(500).json({ 
      error: 'Erreur serveur lors de la lecture du dossier DBF',
      message: (error as Error).message
    });
  }
});

// Route pour obtenir le contenu d'un fichier DBF spécifique
app.get('/api/dbf-files/:filename', (req, res) => {
  try {
    const { filename } = req.params;
    
    // Validation du nom de fichier
    if (!filename || path.basename(filename) !== filename) {
      return res.status(400).json({ error: 'Nom de fichier invalide' });
    }
    
    // Construire le chemin complet du fichier
    const filePath = path.join(DBF_FOLDER_PATH, filename);
    
    // Vérifier si le fichier existe
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: 'Fichier non trouvé' });
    }
    
    // Lire le fichier
    const fileContent = fs.readFileSync(filePath);
    
    res.setHeader('Content-Type', 'application/octet-stream');
    res.send(fileContent);
  } catch (error) {
    console.error('Erreur lors de la lecture du fichier DBF:', error);
    res.status(500).json({ 
      error: 'Erreur serveur lors de la lecture du fichier DBF',
      message: (error as Error).message
    });
  }
});

// Route pour vérifier si un fichier DBF existe
app.get('/api/dbf-files/:filename/exists', (req, res) => {
  try {
    const { filename } = req.params;
    
    // Validation du nom de fichier
    if (!filename || path.basename(filename) !== filename) {
      return res.status(400).json({ error: 'Nom de fichier invalide' });
    }
    
    // Construire le chemin complet du fichier
    const filePath = path.join(DBF_FOLDER_PATH, filename);
    
    // Vérifier si le fichier existe
    const exists = fs.existsSync(filePath);
    
    res.json({ exists });
  } catch (error) {
    console.error('Erreur lors de la vérification du fichier DBF:', error);
    res.status(500).json({ 
      error: 'Erreur serveur lors de la vérification du fichier DBF',
      message: (error as Error).message
    });
  }
});

// Route pour obtenir le nombre de centres depuis TABCODE.DBF
// Utilise les fichiers d'index NTX si disponibles pour accélérer les requêtes
app.get('/api/centres/count', (req, res) => {
  try {
    const filePath = path.join(DBF_FOLDER_PATH, 'TABCODE.DBF');
    
    // Vérifier si le fichier existe
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ 
        error: 'Fichier TABCODE.DBF non trouvé'
      });
    }
    
    // Vérifier les fichiers d'index disponibles
    const indexFiles = checkIndexFiles(DBF_FOLDER_PATH);
    const tabcodeIndexes = indexFiles.filter(file => 
      file.toUpperCase().startsWith('TABCODE') && path.extname(file).toLowerCase() === '.ntx'
    );
    
    if (tabcodeIndexes.length > 0) {
      console.log(`Utilisation de l'index ${tabcodeIndexes[0]} pour accélérer la lecture de TABCODE.DBF`);
    } else {
      console.log('Aucun fichier d\'index trouvé pour TABCODE.DBF, lecture séquentielle');
    }
    
    // Lire les informations d'en-tête
    const headerBuffer = Buffer.alloc(32);
    const fd = fs.openSync(filePath, 'r');
    fs.readSync(fd, headerBuffer, 0, 32, 0);
    
    const header = {
      numberOfRecords: headerBuffer.readUInt32LE(4),
      headerLength: headerBuffer.readUInt16LE(8),
      recordLength: headerBuffer.readUInt16LE(10)
    };
    
    fs.closeSync(fd);
    
    // Compter les centres (codes commençant par 'S')
    let centresCount = 0;
    for (let i = 0; i < header.numberOfRecords; i++) {
      const recordOffset = header.headerLength + (i * header.recordLength);
      
      const recordBuffer = Buffer.alloc(header.recordLength + 10);
      const fd = fs.openSync(filePath, 'r');
      fs.readSync(fd, recordBuffer, 0, header.recordLength, recordOffset);
      fs.closeSync(fd);
      
      // Extraire le CODE_AFFEC (champ 1)
      const isDeleted = recordBuffer.readUInt8(0) === 0x2A;
      if (!isDeleted) {
        const codeAffec = recordBuffer.subarray(1, 5).toString('utf-8').trim();
        if (codeAffec && codeAffec.startsWith('S')) {
          centresCount++;
        }
      }
    }
    
    res.json({
      count: centresCount,
      indexUsed: tabcodeIndexes.length > 0 ? tabcodeIndexes[0] : null
    });
  } catch (error) {
    console.error('Erreur lors du comptage des centres:', error);
    res.status(500).json({ 
      error: 'Erreur serveur lors du comptage des centres',
      message: (error as Error).message
    });
  }
});

// Route pour obtenir la liste des centres depuis TABCODE.DBF
// Utilise les fichiers d'index NTX si disponibles pour accélérer les requêtes
app.get('/api/centres/list', (req, res) => {
  try {
    const filePath = path.join(DBF_FOLDER_PATH, 'TABCODE.DBF');
    
    // Vérifier si le fichier existe
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ 
        error: 'Fichier TABCODE.DBF non trouvé'
      });
    }
    
    // Vérifier les fichiers d'index disponibles
    const indexFiles = checkIndexFiles(DBF_FOLDER_PATH);
    const tabcodeIndexes = indexFiles.filter(file => 
      file.toUpperCase().startsWith('TABCODE') && path.extname(file).toLowerCase() === '.ntx'
    );
    
    if (tabcodeIndexes.length > 0) {
      console.log(`Utilisation de l'index ${tabcodeIndexes[0]} pour accélérer la lecture de TABCODE.DBF`);
    } else {
      console.log('Aucun fichier d\'index trouvé pour TABCODE.DBF, lecture séquentielle');
    }
    
    // Lire les informations d'en-tête
    const headerBuffer = Buffer.alloc(32);
    const fd = fs.openSync(filePath, 'r');
    fs.readSync(fd, headerBuffer, 0, 32, 0);
    
    const header = {
      numberOfRecords: headerBuffer.readUInt32LE(4),
      headerLength: headerBuffer.readUInt16LE(8),
      recordLength: headerBuffer.readUInt16LE(10)
    };
    
    fs.closeSync(fd);
    
    // Récupérer la liste des centres (codes commençant par 'S')
    const centres: { code: string; libelle: string }[] = [];
    for (let i = 0; i < header.numberOfRecords; i++) {
      const recordOffset = header.headerLength + (i * header.recordLength);
      
      const recordBuffer = Buffer.alloc(header.recordLength + 10);
      const fd = fs.openSync(filePath, 'r');
      fs.readSync(fd, recordBuffer, 0, header.recordLength, recordOffset);
      fs.closeSync(fd);
      
      // Extraire le CODE_AFFEC (champ 1) et LIBELLE (champ 2)
      const isDeleted = recordBuffer.readUInt8(0) === 0x2A;
      if (!isDeleted) {
        const codeAffec = recordBuffer.subarray(1, 5).toString('utf-8').trim();
        const libelle = recordBuffer.subarray(5, 35).toString('utf-8').trim();
        if (codeAffec && codeAffec.startsWith('S')) {
          centres.push({ code: codeAffec, libelle });
        }
      }
    }
    
    res.json({
      centres,
      indexUsed: tabcodeIndexes.length > 0 ? tabcodeIndexes[0] : null
    });
  } catch (error) {
    console.error('Erreur lors de la récupération des centres:', error);
    res.status(500).json({ 
      error: 'Erreur serveur lors de la récupération des centres',
      message: (error as Error).message
    });
  }
});

// Route pour obtenir le nombre d'abonnés depuis ABONNE.DBF
// Utilise les fichiers d'index NTX si disponibles pour accélérer les requêtes
app.get('/api/abonnes/count', (req, res) => {
  try {
    const filePath = path.join(DBF_FOLDER_PATH, 'ABONNE.DBF');
    
    // Vérifier si le fichier existe
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ 
        error: 'Fichier ABONNE.DBF non trouvé'
      });
    }
    
    // Vérifier les fichiers d'index disponibles
    const indexFiles = checkIndexFiles(DBF_FOLDER_PATH);
    const abonneIndexes = indexFiles.filter(file => 
      file.toUpperCase().startsWith('ABONNE') && path.extname(file).toLowerCase() === '.ntx'
    );
    
    if (abonneIndexes.length > 0) {
      console.log(`Utilisation de l'index ${abonneIndexes[0]} pour accélérer la lecture de ABONNE.DBF`);
    } else {
      console.log('Aucun fichier d\'index trouvé pour ABONNE.DBF, lecture séquentielle');
    }
    
    // Lire les informations d'en-tête
    const headerBuffer = Buffer.alloc(32);
    const fd = fs.openSync(filePath, 'r');
    fs.readSync(fd, headerBuffer, 0, 32, 0);
    
    const header = {
      numberOfRecords: headerBuffer.readUInt32LE(4),
      headerLength: headerBuffer.readUInt16LE(8),
      recordLength: headerBuffer.readUInt16LE(10)
    };
    
    fs.closeSync(fd);
    
    // Compter les abonnés
    let abonnesCount = 0;
    for (let i = 0; i < header.numberOfRecords; i++) {
      const recordOffset = header.headerLength + (i * header.recordLength);
      
      const recordBuffer = Buffer.alloc(header.recordLength + 10);
      const fd = fs.openSync(filePath, 'r');
      fs.readSync(fd, recordBuffer, 0, header.recordLength, recordOffset);
      fs.closeSync(fd);
      
      // Vérifier si l'enregistrement est supprimé
      const isDeleted = recordBuffer.readUInt8(0) === 0x2A;
      if (!isDeleted) {
        // Calculer l'offset pour le champ TYPABON (champ 12)
        let fieldOffset = 1; // +1 pour ignorer l'indicateur de suppression
        
        // Passer les champs 1, 2, 3
        fieldOffset += 2 + 2 + 3; // UNITE (2) + SECTEUR (2) + TOURNEE (3)
        
        // Passer les champs 4, 5, 6, 7, 8, 9, 10, 11
        fieldOffset += 6 + 30 + 4 + 10 + 3 + 2 + 2 + 4; // NUMAB (6) + RAISOC (30) + CODRUE (4) + BLOC (10) + ENTREE (3) + ETAGE (2) + AILE (2) + NDOM (4)
        
        // TYPABON (champ 12) - 2 caractères
        const typabon = recordBuffer.subarray(fieldOffset, fieldOffset + 2).toString('utf-8').trim();
        
        // Ne pas compter les abonnés dont TYPABON est null ou vide
        if (typabon && typabon !== '') {
          abonnesCount++;
        }
      }
    }
    
    res.json({
      count: abonnesCount,
      indexUsed: abonneIndexes.length > 0 ? abonneIndexes[0] : null
    });
  } catch (error) {
    console.error('Erreur lors du comptage des abonnés:', error);
    res.status(500).json({ 
      error: 'Erreur serveur lors du comptage des abonnés',
      message: (error as Error).message
    });
  }
});

// Route pour obtenir le nombre d'abonnés par type depuis ABONNE.DBF avec jointure TABCODE.DBF
// Utilise les fichiers d'index NTX si disponibles pour accélérer les requêtes
app.get('/api/abonnes/count-by-type', (req, res) => {
  try {
    const abonneFilePath = path.join(DBF_FOLDER_PATH, 'ABONNE.DBF');
    const tabcodeFilePath = path.join(DBF_FOLDER_PATH, 'TABCODE.DBF');
    const abonmentFilePath = path.join(DBF_FOLDER_PATH, 'ABONMENT.DBF');
    
    // Vérifier si les fichiers existent
    if (!fs.existsSync(abonneFilePath)) {
      return res.status(404).json({ 
        error: 'Fichier ABONNE.DBF non trouvé'
      });
    }
    
    if (!fs.existsSync(tabcodeFilePath)) {
      return res.status(404).json({ 
        error: 'Fichier TABCODE.DBF non trouvé'
      });
    }
    
    if (!fs.existsSync(abonmentFilePath)) {
      return res.status(404).json({ 
        error: 'Fichier ABONMENT.DBF non trouvé'
      });
    }
    
    // Vérifier les fichiers d'index disponibles
    const indexFiles = checkIndexFiles(DBF_FOLDER_PATH);
    const abonneIndexes = indexFiles.filter(file => 
      file.toUpperCase().startsWith('ABONNE') && path.extname(file).toLowerCase() === '.ntx'
    );
    const tabcodeIndexes = indexFiles.filter(file => 
      file.toUpperCase().startsWith('TABCODE') && path.extname(file).toLowerCase() === '.ntx'
    );
    const abonmentIndexes = indexFiles.filter(file => 
      file.toUpperCase().startsWith('ABONMENT') && path.extname(file).toLowerCase() === '.ntx'
    );
    
    console.log(`Fichiers d'index disponibles: ABONNE(${abonneIndexes.length}), TABCODE(${tabcodeIndexes.length}), ABONMENT(${abonmentIndexes.length})`);
    
    if (abonneIndexes.length > 0) {
      console.log(`Utilisation de l'index ${abonneIndexes[0]} pour accélérer la lecture de ABONNE.DBF`);
    }
    if (tabcodeIndexes.length > 0) {
      console.log(`Utilisation de l'index ${tabcodeIndexes[0]} pour accélérer la lecture de TABCODE.DBF`);
    }
    if (abonmentIndexes.length > 0) {
      console.log(`Utilisation de l'index ${abonmentIndexes[0]} pour accélérer la lecture de ABONMENT.DBF`);
    }
    
    // Lire les informations d'en-tête d'ABONNE.DBF
    const abonneHeaderBuffer = Buffer.alloc(32);
    const abonneFd = fs.openSync(abonneFilePath, 'r');
    fs.readSync(abonneFd, abonneHeaderBuffer, 0, 32, 0);
    const abonneHeader = {
      numberOfRecords: abonneHeaderBuffer.readUInt32LE(4),
      headerLength: abonneHeaderBuffer.readUInt16LE(8),
      recordLength: abonneHeaderBuffer.readUInt16LE(10)
    };
    fs.closeSync(abonneFd);
    
    // Lire les informations d'en-tête de TABCODE.DBF
    const tabcodeHeaderBuffer = Buffer.alloc(32);
    const tabcodeFd = fs.openSync(tabcodeFilePath, 'r');
    fs.readSync(tabcodeFd, tabcodeHeaderBuffer, 0, 32, 0);
    const tabcodeHeader = {
      numberOfRecords: tabcodeHeaderBuffer.readUInt32LE(4),
      headerLength: tabcodeHeaderBuffer.readUInt16LE(8),
      recordLength: tabcodeHeaderBuffer.readUInt16LE(10)
    };
    fs.closeSync(tabcodeFd);
    
    // Lire les informations d'en-tête d'ABONMENT.DBF
    const abonmentHeaderBuffer = Buffer.alloc(32);
    const abonmentFd = fs.openSync(abonmentFilePath, 'r');
    fs.readSync(abonmentFd, abonmentHeaderBuffer, 0, 32, 0);
    const abonmentHeader = {
      numberOfRecords: abonmentHeaderBuffer.readUInt32LE(4),
      headerLength: abonmentHeaderBuffer.readUInt16LE(8),
      recordLength: abonmentHeaderBuffer.readUInt16LE(10)
    };
    fs.closeSync(abonmentFd);
    
    // Lire tous les codes de type d'abonné avec leurs désignations depuis TABCODE.DBF
    const typabonDesignations = {};
    for (let i = 0; i < tabcodeHeader.numberOfRecords; i++) {
      const recordOffset = tabcodeHeader.headerLength + (i * tabcodeHeader.recordLength);
      
      const recordBuffer = Buffer.alloc(tabcodeHeader.recordLength + 10);
      const fd = fs.openSync(tabcodeFilePath, 'r');
      fs.readSync(fd, recordBuffer, 0, tabcodeHeader.recordLength, recordOffset);
      fs.closeSync(fd);
      
      // Extraire les données de l'enregistrement TABCODE
      const isDeleted = recordBuffer.readUInt8(0) === 0x2A;
      if (!isDeleted) {
        let fieldOffset = 1; // +1 pour ignorer l'indicateur de suppression
        
        const codeAffec = recordBuffer.subarray(fieldOffset, fieldOffset + 4).toString('utf-8').trim();
        fieldOffset += 4;
        
        const libelle = recordBuffer.subarray(fieldOffset, fieldOffset + 20).toString('utf-8').trim();
        
        // Si le code commence par 'T', on le stocke (en enlevant le 'T')
        if (codeAffec && codeAffec.startsWith('T')) {
          const typabonCode = codeAffec.substring(1); // Enlever le 'T'
          typabonDesignations[typabonCode] = libelle;
        }
      }
    }
    
    // Créer un index des abonnés résiliés, sans compteur et avec compteur à l'arrêt depuis ABONMENT.DBF
    const resilieAccounts = new Set();
    const sansCompteurAccounts = new Set();
    const compteurArretAccounts = new Set();
    for (let i = 0; i < abonmentHeader.numberOfRecords; i++) {
      const recordOffset = abonmentHeader.headerLength + (i * abonmentHeader.recordLength);
      
      const recordBuffer = Buffer.alloc(abonmentHeader.recordLength + 10);
      const fd = fs.openSync(abonmentFilePath, 'r');
      fs.readSync(fd, recordBuffer, 0, abonmentHeader.recordLength, recordOffset);
      fs.closeSync(fd);
      
      // Extraire les données de l'enregistrement ABONMENT
      const isDeleted = recordBuffer.readUInt8(0) === 0x2A;
      if (!isDeleted) {
        // Calculer l'offset pour le champ NUMAB (champ 1) et ETATCPT (champ 5)
        let fieldOffset = 1; // +1 pour ignorer l'indicateur de suppression
        
        // NUMAB (champ 1) - 6 caractères
        const numab = recordBuffer.subarray(fieldOffset, fieldOffset + 6).toString('utf-8').trim();
        fieldOffset += 6;
        
        // Passer les champs 2, 3, 4
        fieldOffset += 15 + 8 + 3; // NUMSER (15) + DATEINST (8) + DIAMETRE (3)
        
        // ETATCPT (champ 5) - 2 caractères
        const etatcpt = recordBuffer.subarray(fieldOffset, fieldOffset + 2).toString('utf-8').trim();
        
        // Si l'état est '40', c'est un abonné résilié
        if (etatcpt === '40') {
          resilieAccounts.add(numab);
        }
        
        // Si l'état est '30', c'est un abonné sans compteur
        if (etatcpt === '30') {
          sansCompteurAccounts.add(numab);
        }
        
        // Si l'état est '20', c'est un abonné avec compteur à l'arrêt
        if (etatcpt === '20') {
          compteurArretAccounts.add(numab);
        }
      }
    }
    
    // Compter les abonnés par type depuis ABONNE.DBF
    const typabonCount = {};
    const typabonResilieCount = {}; // Compteur pour les abonnés résiliés par type
    const typabonSansCompteurCount = {}; // Compteur pour les abonnés sans compteur par type
    const typabonCompteurArretCount = {}; // Compteur pour les abonnés avec compteur à l'arrêt par type
    for (let i = 0; i < abonneHeader.numberOfRecords; i++) {
      const recordOffset = abonneHeader.headerLength + (i * abonneHeader.recordLength);
      
      const recordBuffer = Buffer.alloc(abonneHeader.recordLength + 10);
      const fd = fs.openSync(abonneFilePath, 'r');
      fs.readSync(fd, recordBuffer, 0, abonneHeader.recordLength, recordOffset);
      fs.closeSync(fd);
      
      // Extraire les données de l'enregistrement ABONNE
      const isDeleted = recordBuffer.readUInt8(0) === 0x2A;
      if (!isDeleted) {
        // Calculer l'offset pour le champ NUMAB (champ 4) et TYPABON (champ 12)
        let fieldOffset = 1; // +1 pour ignorer l'indicateur de suppression
        
        // Passer les champs 1, 2, 3
        fieldOffset += 2 + 2 + 3; // UNITE (2) + SECTEUR (2) + TOURNEE (3)
        
        // NUMAB (champ 4) - 6 caractères
        const numab = recordBuffer.subarray(fieldOffset, fieldOffset + 6).toString('utf-8').trim();
        fieldOffset += 6;
        
        // Passer les champs 5, 6, 7, 8, 9, 10, 11
        fieldOffset += 30 + 4 + 10 + 3 + 2 + 2 + 4; // RAISOC (30) + CODRUE (4) + BLOC (10) + ENTREE (3) + ETAGE (2) + AILE (2) + NDOM (4)
        
        // TYPABON (champ 12) - 2 caractères
        const typabon = recordBuffer.subarray(fieldOffset, fieldOffset + 2).toString('utf-8').trim();
        
        if (typabon) {
          typabonCount[typabon] = (typabonCount[typabon] || 0) + 1;
          
          // Vérifier si cet abonné est résilié
          if (resilieAccounts.has(numab)) {
            typabonResilieCount[typabon] = (typabonResilieCount[typabon] || 0) + 1;
          }
          
          // Vérifier si cet abonné est sans compteur
          if (sansCompteurAccounts.has(numab)) {
            typabonSansCompteurCount[typabon] = (typabonSansCompteurCount[typabon] || 0) + 1;
          }
          
          // Vérifier si cet abonné a le compteur à l'arrêt
          if (compteurArretAccounts.has(numab)) {
            typabonCompteurArretCount[typabon] = (typabonCompteurArretCount[typabon] || 0) + 1;
          }
        }
      }
    }
    
    // Créer le résultat avec les désignations et les comptes de résiliés, sans compteur et avec compteur à l'arrêt
    const result = Object.keys(typabonCount)
      .map(typabon => ({
        code: typabon,
        designation: typabonDesignations[typabon] || `Type ${typabon}`,
        count: typabonCount[typabon],
        resilieCount: typabonResilieCount[typabon] || 0,
        sansCompteurCount: typabonSansCompteurCount[typabon] || 0,
        compteurArretCount: typabonCompteurArretCount[typabon] || 0
      }))
      .sort((a, b) => b.count - a.count); // Tri par nombre décroissant
    
    res.json({
      totalCount: Object.values(typabonCount).reduce((sum, count) => sum + count, 0),
      totalResilieCount: Object.values(typabonResilieCount).reduce((sum, count) => sum + count, 0),
      totalSansCompteurCount: Object.values(typabonSansCompteurCount).reduce((sum, count) => sum + count, 0),
      totalCompteurArretCount: Object.values(typabonCompteurArretCount).reduce((sum, count) => sum + count, 0),
      types: result,
      indexesUsed: {
        abonne: abonneIndexes.length > 0 ? abonneIndexes[0] : null,
        tabcode: tabcodeIndexes.length > 0 ? tabcodeIndexes[0] : null,
        abonment: abonmentIndexes.length > 0 ? abonmentIndexes[0] : null
      }
    });
  } catch (error) {
    console.error('Erreur lors du comptage des abonnés par type:', error);
    res.status(500).json({ 
      error: 'Erreur serveur lors du comptage des abonnés par type',
      message: (error as Error).message
    });
  }
});

// Route pour obtenir le nombre d'abonnés avec compteur à l'arrêt (ETATCPT = '20') depuis ABONMENT.DBF
// Utilise les fichiers d'index NTX si disponibles pour accélérer les requêtes
app.get('/api/abonnes/compteur-arret', (req, res) => {
  try {
    const abonmentFilePath = path.join(DBF_FOLDER_PATH, 'ABONMENT.DBF');
    
    // Vérifier si le fichier existe
    if (!fs.existsSync(abonmentFilePath)) {
      return res.status(404).json({ 
        error: 'Fichier ABONMENT.DBF non trouvé'
      });
    }
    
    // Vérifier les fichiers d'index disponibles
    const indexFiles = checkIndexFiles(DBF_FOLDER_PATH);
    const abonmentIndexes = indexFiles.filter(file => 
      file.toUpperCase().startsWith('ABONMENT') && path.extname(file).toLowerCase() === '.ntx'
    );
    
    if (abonmentIndexes.length > 0) {
      console.log(`Utilisation de l'index ${abonmentIndexes[0]} pour accélérer la lecture de ABONMENT.DBF`);
    } else {
      console.log('Aucun fichier d\'index trouvé pour ABONMENT.DBF, lecture séquentielle');
    }
    
    // Lire les informations d'en-tête d'ABONMENT.DBF
    const abonmentHeaderBuffer = Buffer.alloc(32);
    const abonmentFd = fs.openSync(abonmentFilePath, 'r');
    fs.readSync(abonmentFd, abonmentHeaderBuffer, 0, 32, 0);
    const abonmentHeader = {
      numberOfRecords: abonmentHeaderBuffer.readUInt32LE(4),
      headerLength: abonmentHeaderBuffer.readUInt16LE(8),
      recordLength: abonmentHeaderBuffer.readUInt16LE(10)
    };
    fs.closeSync(abonmentFd);
    
    // Compter les abonnés avec compteur à l'arrêt (ETATCPT = '20')
    let compteurArretCount = 0;
    for (let i = 0; i < abonmentHeader.numberOfRecords; i++) {
      const recordOffset = abonmentHeader.headerLength + (i * abonmentHeader.recordLength);
      
      const recordBuffer = Buffer.alloc(abonmentHeader.recordLength + 10);
      const fd = fs.openSync(abonmentFilePath, 'r');
      fs.readSync(fd, recordBuffer, 0, abonmentHeader.recordLength, recordOffset);
      fs.closeSync(fd);
      
      // Extraire les données de l'enregistrement ABONMENT
      const isDeleted = recordBuffer.readUInt8(0) === 0x2A;
      if (!isDeleted) {
        // Calculer l'offset pour le champ ETATCPT (champ 5)
        let fieldOffset = 1; // +1 pour ignorer l'indicateur de suppression
        
        // Passer les champs 1, 2, 3, 4
        fieldOffset += 6 + 15 + 8 + 3; // NUMAB (6) + NUMSER (15) + DATEINST (8) + DIAMETRE (3)
        
        // ETATCPT (champ 5) - 2 caractères
        const etatcpt = recordBuffer.subarray(fieldOffset, fieldOffset + 2).toString('utf-8').trim();
        
        // Si l'état est '20', c'est un abonné avec compteur à l'arrêt
        if (etatcpt === '20') {
          compteurArretCount++;
        }
      }
    }
    
    res.json({
      count: compteurArretCount,
      indexUsed: abonmentIndexes.length > 0 ? abonmentIndexes[0] : null
    });
  } catch (error) {
    console.error('Erreur lors du comptage des abonnés avec compteur à l\'arrêt:', error);
    res.status(500).json({ 
      error: 'Erreur serveur lors du comptage des abonnés avec compteur à l\'arrêt',
      message: (error as Error).message
    });
  }
});

// Route pour obtenir le nombre d'abonnés sans compteur (ETATCPT = '30') depuis ABONMENT.DBF
// Utilise les fichiers d'index NTX si disponibles pour accélérer les requêtes
app.get('/api/abonnes/sans-compteur', (req, res) => {
  try {
    const abonmentFilePath = path.join(DBF_FOLDER_PATH, 'ABONMENT.DBF');
    
    // Vérifier si le fichier existe
    if (!fs.existsSync(abonmentFilePath)) {
      return res.status(404).json({ 
        error: 'Fichier ABONMENT.DBF non trouvé'
      });
    }
    
    // Vérifier les fichiers d'index disponibles
    const indexFiles = checkIndexFiles(DBF_FOLDER_PATH);
    const abonmentIndexes = indexFiles.filter(file => 
      file.toUpperCase().startsWith('ABONMENT') && path.extname(file).toLowerCase() === '.ntx'
    );
    
    if (abonmentIndexes.length > 0) {
      console.log(`Utilisation de l'index ${abonmentIndexes[0]} pour accélérer la lecture de ABONMENT.DBF`);
    } else {
      console.log('Aucun fichier d\'index trouvé pour ABONMENT.DBF, lecture séquentielle');
    }
    
    // Lire les informations d'en-tête d'ABONMENT.DBF
    const abonmentHeaderBuffer = Buffer.alloc(32);
    const abonmentFd = fs.openSync(abonmentFilePath, 'r');
    fs.readSync(abonmentFd, abonmentHeaderBuffer, 0, 32, 0);
    const abonmentHeader = {
      numberOfRecords: abonmentHeaderBuffer.readUInt32LE(4),
      headerLength: abonmentHeaderBuffer.readUInt16LE(8),
      recordLength: abonmentHeaderBuffer.readUInt16LE(10)
    };
    fs.closeSync(abonmentFd);
    
    // Compter les abonnés sans compteur (ETATCPT = '30')
    let sansCompteurCount = 0;
    for (let i = 0; i < abonmentHeader.numberOfRecords; i++) {
      const recordOffset = abonmentHeader.headerLength + (i * abonmentHeader.recordLength);
      
      const recordBuffer = Buffer.alloc(abonmentHeader.recordLength + 10);
      const fd = fs.openSync(abonmentFilePath, 'r');
      fs.readSync(fd, recordBuffer, 0, abonmentHeader.recordLength, recordOffset);
      fs.closeSync(fd);
      
      // Extraire les données de l'enregistrement ABONMENT
      const isDeleted = recordBuffer.readUInt8(0) === 0x2A;
      if (!isDeleted) {
        // Calculer l'offset pour le champ ETATCPT (champ 5)
        let fieldOffset = 1; // +1 pour ignorer l'indicateur de suppression
        
        // Passer les champs 1, 2, 3, 4
        fieldOffset += 6 + 15 + 8 + 3; // NUMAB (6) + NUMSER (15) + DATEINST (8) + DIAMETRE (3)
        
        // ETATCPT (champ 5) - 2 caractères
        const etatcpt = recordBuffer.subarray(fieldOffset, fieldOffset + 2).toString('utf-8').trim();
        
        // Si l'état est '30', c'est un abonné sans compteur
        if (etatcpt === '30') {
          sansCompteurCount++;
        }
      }
    }
    
    res.json({
      count: sansCompteurCount,
      indexUsed: abonmentIndexes.length > 0 ? abonmentIndexes[0] : null
    });
  } catch (error) {
    console.error('Erreur lors du comptage des abonnés sans compteur:', error);
    res.status(500).json({ 
      error: 'Erreur serveur lors du comptage des abonnés sans compteur',
      message: (error as Error).message
    });
  }
});

// Route pour mettre à jour le chemin du dossier DBF
app.post('/api/settings/dbf-path', (req, res) => {
  try {
    const { dbfPath } = req.body;
    
    // Valider le chemin
    if (!dbfPath) {
      return res.status(400).json({ error: 'Le chemin du dossier DBF est requis' });
    }
    
    // Vérifier si le dossier existe
    if (!fs.existsSync(dbfPath)) {
      return res.status(400).json({ error: 'Le dossier spécifié n\'existe pas' });
    }
    
    // Mettre à jour le chemin
    DBF_FOLDER_PATH = dbfPath;
    
    res.json({ 
      success: true, 
      message: 'Chemin du dossier DBF mis à jour avec succès',
      dbfPath: DBF_FOLDER_PATH
    });
  } catch (error) {
    console.error('Erreur lors de la mise à jour du chemin DBF:', error);
    res.status(500).json({ 
      error: 'Erreur serveur lors de la mise à jour du chemin DBF',
      message: (error as Error).message
    });
  }
});

// Route pour obtenir le chemin actuel du dossier DBF
app.get('/api/settings/dbf-path', (req, res) => {
  res.json({ 
    dbfPath: DBF_FOLDER_PATH 
  });
});

// Route pour enregistrer le chemin du dossier DBF dans le fichier .env
app.post('/api/settings/save-env', (req, res) => {
  try {
    const { dbfPath } = req.body;
    
    // Valider le chemin
    if (!dbfPath) {
      return res.status(400).json({ error: 'Le chemin du dossier DBF est requis' });
    }
    
    // Vérifier si le dossier existe (optionnel)
    if (!fs.existsSync(dbfPath)) {
      console.warn(`Le dossier spécifié n'existe pas: ${dbfPath}`);
      // Ne pas bloquer l'enregistrement, juste avertir
    }
    
    // Lire le contenu actuel du fichier .env
    const envPath = path.join(process.cwd(), '.env');
    let envContent = '';
    
    if (fs.existsSync(envPath)) {
      envContent = fs.readFileSync(envPath, 'utf8');
    }
    
    // Mettre à jour ou ajouter la variable DBF_FOLDER_PATH
    const dbfPathLine = `DBF_FOLDER_PATH=${dbfPath}`;
    
    if (envContent.includes('DBF_FOLDER_PATH=')) {
      // Remplacer la ligne existante
      envContent = envContent.replace(/^DBF_FOLDER_PATH=.*$/m, dbfPathLine);
    } else {
      // Ajouter la nouvelle ligne
      envContent = envContent.trim() ? `${envContent}\n${dbfPathLine}` : dbfPathLine;
    }
    
    // Écrire le contenu mis à jour dans le fichier .env
    fs.writeFileSync(envPath, envContent, 'utf8');
    
    // Mettre également à jour le chemin en mémoire
    DBF_FOLDER_PATH = dbfPath;
    
    res.json({ 
      success: true, 
      message: 'Chemin du dossier DBF enregistré dans .env avec succès',
      dbfPath: DBF_FOLDER_PATH
    });
  } catch (error) {
    console.error('Erreur lors de l\'enregistrement du chemin DBF dans .env:', error);
    res.status(500).json({ 
      error: 'Erreur serveur lors de l\'enregistrement du chemin DBF dans .env',
      message: (error as Error).message
    });
  }
});

// Route pour enregistrer le centre sélectionné dans le fichier .env
app.post('/api/settings/save-centre', (req, res) => {
  try {
    const { centreCode } = req.body;
    
    // Valider le code du centre
    if (!centreCode) {
      return res.status(400).json({ error: 'Le code du centre est requis' });
    }
    
    // Lire le contenu actuel du fichier .env
    const envPath = path.join(process.cwd(), '.env');
    let envContent = '';
    
    if (fs.existsSync(envPath)) {
      envContent = fs.readFileSync(envPath, 'utf8');
    }
    
    // Mettre à jour ou ajouter la variable CENTRE_CODE
    const centreLine = `CENTRE_CODE=${centreCode}`;
    
    if (envContent.includes('CENTRE_CODE=')) {
      // Remplacer la ligne existante
      envContent = envContent.replace(/^CENTRE_CODE=.*$/m, centreLine);
    } else {
      // Ajouter la nouvelle ligne
      envContent = envContent.trim() ? `${envContent}\n${centreLine}` : centreLine;
    }
    
    // Écrire le contenu mis à jour dans le fichier .env
    fs.writeFileSync(envPath, envContent, 'utf8');
    
    res.json({ 
      success: true, 
      message: 'Centre enregistré dans .env avec succès',
      centreCode: centreCode
    });
  } catch (error) {
    console.error('Erreur lors de l\'enregistrement du centre dans .env:', error);
    res.status(500).json({ 
      error: 'Erreur serveur lors de l\'enregistrement du centre dans .env',
      message: (error as Error).message
    });
  }
});

// Démarrer le serveur
app.listen(PORT, () => {
  console.log(`Serveur DBF démarré sur http://localhost:${PORT}`);
  console.log(`Dossier DBF: ${DBF_FOLDER_PATH}`);
});