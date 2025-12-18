// server.ts
import express from 'express';
import cors from 'cors';
import fs from 'fs';
import path from 'path';

// Configuration du dossier DBF
let DBF_FOLDER_PATH = process.env.DBF_FOLDER_PATH || 'F:/epeor';

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
    
    res.json({
      files: dbfFiles,
      folderPath: DBF_FOLDER_PATH,
      dbfFiles: dbfFiles.length
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
app.get('/api/centres/count', (req, res) => {
  try {
    const filePath = path.join(DBF_FOLDER_PATH, 'TABCODE.DBF');
    
    // Vérifier si le fichier existe
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ 
        error: 'Fichier TABCODE.DBF non trouvé'
      });
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
      count: centresCount
    });
  } catch (error) {
    console.error('Erreur lors du comptage des centres:', error);
    res.status(500).json({ 
      error: 'Erreur serveur lors du comptage des centres',
      message: (error as Error).message
    });
  }
});

// Route pour obtenir le nombre d'abonnés depuis ABONNE.DBF
app.get('/api/abonnes/count', (req, res) => {
  try {
    const filePath = path.join(DBF_FOLDER_PATH, 'ABONNE.DBF');
    
    // Vérifier si le fichier existe
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ 
        error: 'Fichier ABONNE.DBF non trouvé'
      });
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
        abonnesCount++;
      }
    }
    
    res.json({
      count: abonnesCount
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
      types: result
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
app.get('/api/abonnes/compteur-arret', (req, res) => {
  try {
    const abonmentFilePath = path.join(DBF_FOLDER_PATH, 'ABONMENT.DBF');
    
    // Vérifier si le fichier existe
    if (!fs.existsSync(abonmentFilePath)) {
      return res.status(404).json({ 
        error: 'Fichier ABONMENT.DBF non trouvé'
      });
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
      count: compteurArretCount
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
app.get('/api/abonnes/sans-compteur', (req, res) => {
  try {
    const abonmentFilePath = path.join(DBF_FOLDER_PATH, 'ABONMENT.DBF');
    
    // Vérifier si le fichier existe
    if (!fs.existsSync(abonmentFilePath)) {
      return res.status(404).json({ 
        error: 'Fichier ABONMENT.DBF non trouvé'
      });
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
      count: sansCompteurCount
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

// Démarrer le serveur
app.listen(PORT, () => {
  console.log(`Serveur DBF démarré sur http://localhost:${PORT}`);
  console.log(`Dossier DBF: ${DBF_FOLDER_PATH}`);
});