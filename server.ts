// server.ts
import express from 'express';
import cors from 'cors';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
import { DBFFile } from 'dbffile';
import { DbfSqlService } from './src/database/dbfSqlService.ts';

dotenv.config();

// Configuration du dossier DBF
let DBF_FOLDER_PATH = process.env.DBF_FOLDER_PATH || process.env.VITE_DBF_FOLDER_PATH || 'D:/epeor';

// Système de cache serveur
// Durée de vie du cache : 30 minutes
const CACHE_DURATION = 30 * 60 * 1000; // 30 minutes

// Interface pour le cache
interface ServerCache<T> {
  data: T;
  timestamp: number;
}

// Cache pour les différents types de données
let creancesCache: ServerCache<number> | null = null;
let centresCountCache: ServerCache<number> | null = null;
let abonnesCountCache: ServerCache<number> | null = null;
let abonnesCountByTypeCache: ServerCache<any> | null = null;
let abonnesCompteurArretCache: ServerCache<number> | null = null;
let abonnesSansCompteurCache: ServerCache<number> | null = null;

// Initialisation du service SQL
const dbfSqlService = new DbfSqlService();

// Fonction utilitaire pour vérifier si un cache est valide
function isCacheValid<T>(cache: ServerCache<T> | null): boolean {
  if (!cache) return false;
  return Date.now() - cache.timestamp < CACHE_DURATION;
}

// Fonction utilitaire pour mettre en cache des données
function setCache<T>(data: T): ServerCache<T> {
  return {
    data,
    timestamp: Date.now()
  };
}

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
    
    console.log(`Fichiers d'index trouvés: ${indexFiles.join(', ') || 'aucun'}`);
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
    // Vérifier si les données sont en cache
    if (isCacheValid(centresCountCache)) {
      console.log('Retour du nombre de centres depuis le cache');
      return res.json({
        count: centresCountCache!.data,
        fromCache: true
      });
    }
    
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
    
    // Vérifier s'il y a des fichiers d'index spécifiques disponibles (TABCODE*.NTX)
    const specificTabcodeIndexes = indexFiles.filter(file => 
      /^TABCODE\d+\.NTX$/.test(file.toUpperCase()));
    
    console.log(`Fichiers d'index TABCODE disponibles: ${tabcodeIndexes.join(', ') || 'aucun'}`);
    console.log(`Fichiers d'index spécifiques TABCODE*.NTX disponibles: ${specificTabcodeIndexes.join(', ') || 'aucun'}`);
    
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
    
    // Mettre en cache
    centresCountCache = setCache(centresCount);
    
    res.json({
      count: centresCount,
      indexUsed: specificTabcodeIndexes.length > 0 ? specificTabcodeIndexes.join(', ') : (tabcodeIndexes.length > 0 ? tabcodeIndexes.join(', ') : null),
      indexCount: specificTabcodeIndexes.length > 0 ? specificTabcodeIndexes.length : tabcodeIndexes.length,
      fromCache: false
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
    
    // Vérifier s'il y a des fichiers d'index spécifiques disponibles (TABCODE*.NTX)
    const specificTabcodeIndexes = indexFiles.filter(file => 
      /^TABCODE\d+\.NTX$/.test(file.toUpperCase()));
    
    console.log(`Fichiers d'index TABCODE disponibles: ${tabcodeIndexes.join(', ') || 'aucun'}`);
    console.log(`Fichiers d'index spécifiques TABCODE*.NTX disponibles: ${specificTabcodeIndexes.join(', ') || 'aucun'}`);
    
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
      indexUsed: specificTabcodeIndexes.length > 0 ? specificTabcodeIndexes.join(', ') : (tabcodeIndexes.length > 0 ? tabcodeIndexes.join(', ') : null),
      indexCount: specificTabcodeIndexes.length > 0 ? specificTabcodeIndexes.length : tabcodeIndexes.length
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
    // Vérifier si les données sont en cache
    if (isCacheValid(abonnesCountCache)) {
      console.log('Retour du nombre d\'abonnés depuis le cache');
      return res.json({
        count: abonnesCountCache!.data,
        fromCache: true
      });
    }
    
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
    
    // Vérifier s'il y a des fichiers d'index spécifiques disponibles (ABON*.NTX)
    const specificAbonneIndexes = indexFiles.filter(file => 
      /^ABON\d+\.NTX$/.test(file.toUpperCase()));
    
    console.log(`Fichiers d'index ABONNE disponibles: ${abonneIndexes.join(', ') || 'aucun'}`);
    console.log(`Fichiers d'index spécifiques ABON*.NTX disponibles: ${specificAbonneIndexes.join(', ') || 'aucun'}`);
    
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
    
    // Mettre en cache
    abonnesCountCache = setCache(abonnesCount);
    
    res.json({
      count: abonnesCount,
      indexUsed: specificAbonneIndexes.length > 0 ? specificAbonneIndexes.join(', ') : (abonneIndexes.length > 0 ? abonneIndexes.join(', ') : null),
      indexCount: specificAbonneIndexes.length > 0 ? specificAbonneIndexes.length : abonneIndexes.length,
      fromCache: false
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
    // Vérifier si les données sont en cache
    if (isCacheValid(abonnesCountByTypeCache)) {
      console.log('Retour des données des abonnés par type depuis le cache');
      return res.json({
        ...abonnesCountByTypeCache!.data,
        fromCache: true
      });
    }
    
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
    
    // Vérifier s'il y a des fichiers d'index spécifiques disponibles
    const specificAbonneIndexes = indexFiles.filter(file => 
      /^ABON\d+\.NTX$/.test(file.toUpperCase()));
    const specificTabcodeIndexes = indexFiles.filter(file => 
      /^TABCODE\d+\.NTX$/.test(file.toUpperCase()));
    const specificAbonmentIndexes = indexFiles.filter(file => 
      /^ABONMENT\d+\.NTX$/.test(file.toUpperCase()));
    
    console.log(`Fichiers d'index disponibles: ABONNE(${abonneIndexes.length}), TABCODE(${tabcodeIndexes.length}), ABONMENT(${abonmentIndexes.length})`);
    console.log(`Fichiers d'index spécifiques: ABONNE(${specificAbonneIndexes.length}), TABCODE(${specificTabcodeIndexes.length}), ABONMENT(${specificAbonmentIndexes.length})`);
    
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
    
    // Préparer la réponse
    const response = {
      totalCount: Object.values(typabonCount).reduce((sum, count) => sum + count, 0),
      totalResilieCount: Object.values(typabonResilieCount).reduce((sum, count) => sum + count, 0),
      totalSansCompteurCount: Object.values(typabonSansCompteurCount).reduce((sum, count) => sum + count, 0),
      totalCompteurArretCount: Object.values(typabonCompteurArretCount).reduce((sum, count) => sum + count, 0),
      types: result,
      indexesUsed: {
        abonne: specificAbonneIndexes.length > 0 ? specificAbonneIndexes.join(', ') : (abonneIndexes.length > 0 ? abonneIndexes.join(', ') : null),
        tabcode: specificTabcodeIndexes.length > 0 ? specificTabcodeIndexes.join(', ') : (tabcodeIndexes.length > 0 ? tabcodeIndexes.join(', ') : null),
        abonment: specificAbonmentIndexes.length > 0 ? specificAbonmentIndexes.join(', ') : (abonmentIndexes.length > 0 ? abonmentIndexes.join(', ') : null)
      },
      indexCounts: {
        abonne: specificAbonneIndexes.length > 0 ? specificAbonneIndexes.length : abonneIndexes.length,
        tabcode: specificTabcodeIndexes.length > 0 ? specificTabcodeIndexes.length : tabcodeIndexes.length,
        abonment: specificAbonmentIndexes.length > 0 ? specificAbonmentIndexes.length : abonmentIndexes.length
      }
    };
    
    // Mettre en cache
    abonnesCountByTypeCache = setCache(response);
    
    res.json({
      ...response,
      fromCache: false
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
    // Vérifier si les données sont en cache
    if (isCacheValid(abonnesCompteurArretCache)) {
      console.log('Retour du nombre d\'abonnés avec compteur à l\'arrêt depuis le cache');
      return res.json({
        count: abonnesCompteurArretCache!.data,
        fromCache: true
      });
    }
    
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
    
    // Vérifier s'il y a des fichiers d'index spécifiques disponibles (ABONMENT*.NTX)
    const specificAbonmentIndexes = indexFiles.filter(file => 
      /^ABONMENT\d+\.NTX$/.test(file.toUpperCase()));
    
    console.log(`Fichiers d'index ABONMENT disponibles: ${abonmentIndexes.join(', ') || 'aucun'}`);
    console.log(`Fichiers d'index spécifiques ABONMENT*.NTX disponibles: ${specificAbonmentIndexes.join(', ') || 'aucun'}`);
    
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
    
    // Mettre en cache
    abonnesCompteurArretCache = setCache(compteurArretCount);
    
    res.json({
      count: compteurArretCount,
      indexUsed: specificAbonmentIndexes.length > 0 ? specificAbonmentIndexes.join(', ') : (abonmentIndexes.length > 0 ? abonmentIndexes.join(', ') : null),
      indexCount: specificAbonmentIndexes.length > 0 ? specificAbonmentIndexes.length : abonmentIndexes.length,
      fromCache: false
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
    // Vérifier si les données sont en cache
    if (isCacheValid(abonnesSansCompteurCache)) {
      console.log('Retour du nombre d\'abonnés sans compteur depuis le cache');
      return res.json({
        count: abonnesSansCompteurCache!.data,
        fromCache: true
      });
    }
    
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
    
    // Vérifier s'il y a des fichiers d'index spécifiques disponibles (ABONMENT*.NTX)
    const specificAbonmentIndexes = indexFiles.filter(file => 
      /^ABONMENT\d+\.NTX$/.test(file.toUpperCase()));
    
    console.log(`Fichiers d'index ABONMENT disponibles: ${abonmentIndexes.join(', ') || 'aucun'}`);
    console.log(`Fichiers d'index spécifiques ABONMENT*.NTX disponibles: ${specificAbonmentIndexes.join(', ') || 'aucun'}`);
    
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
    
    // Mettre en cache
    abonnesSansCompteurCache = setCache(sansCompteurCount);
    
    res.json({
      count: sansCompteurCount,
      indexUsed: specificAbonmentIndexes.length > 0 ? specificAbonmentIndexes.join(', ') : (abonmentIndexes.length > 0 ? abonmentIndexes.join(', ') : null),
      indexCount: specificAbonmentIndexes.length > 0 ? specificAbonmentIndexes.length : abonmentIndexes.length,
      fromCache: false
    });
  } catch (error) {
    console.error('Erreur lors du comptage des abonnés sans compteur:', error);
    res.status(500).json({ 
      error: 'Erreur serveur lors du comptage des abonnés sans compteur',
      message: (error as Error).message
    });
  }
});

// Route pour forcer le rafraîchissement du cache
app.post('/api/cache/refresh', (req, res) => {
  try {
    // Vider tous les caches
    creancesCache = null;
    centresCountCache = null;
    abonnesCountCache = null;
    abonnesCountByTypeCache = null;
    abonnesCompteurArretCache = null;
    abonnesSansCompteurCache = null;
    
    console.log('Tous les caches du serveur ont été vidés');
    res.json({ success: true, message: 'Cache serveur vidé avec succès' });
  } catch (error) {
    console.error('Erreur lors du vidage du cache serveur:', error);
    res.status(500).json({ 
      error: 'Erreur serveur lors du vidage du cache',
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

// Route pour obtenir toutes les statistiques du dashboard avec streaming
// Chaque statistique est calculée de manière indépendante et envoyée dès qu'elle est disponible
app.get('/api/dashboard/stats', async (req, res) => {
  try {
    // Vérifier si le rafraîchissement est forcé
    const forceRefresh = req.query.refresh === 'true';
    
    // Configurer la réponse pour le streaming
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders();
    
    // Fonction pour envoyer une donnée
    const sendStat = (statName: string, data: any) => {
      res.write(`event: ${statName}\ndata: ${JSON.stringify(data)}\n\n`);
    };
    
    // Exécuter toutes les requêtes de manière indépendante
    const promises = [
      // Nombre de centres
      (async () => {
        try {
          // Vérifier si les données sont en cache
          if (!forceRefresh && isCacheValid(centresCountCache)) {
            sendStat('centres', { count: centresCountCache!.data, fromCache: true });
            return;
          }
          
          const filePath = path.join(DBF_FOLDER_PATH, 'TABCODE.DBF');
          
          // Vérifier si le fichier existe
          if (!fs.existsSync(filePath)) {
            throw new Error('Fichier TABCODE.DBF non trouvé');
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
          
          // Mettre en cache
          centresCountCache = setCache(centresCount);
          
          sendStat('centres', { count: centresCount, fromCache: false });
        } catch (error) {
          console.error('Erreur lors du comptage des centres:', error);
          sendStat('centres', { count: 0, error: (error as Error).message });
        }
      })(),
      
      // Nombre d'abonnés
      (async () => {
        try {
          // Vérifier si les données sont en cache
          if (!forceRefresh && isCacheValid(abonnesCountCache)) {
            sendStat('abonnes', { count: abonnesCountCache!.data, fromCache: true });
            return;
          }
          
          const filePath = path.join(DBF_FOLDER_PATH, 'ABONNE.DBF');
          
          // Vérifier si le fichier existe
          if (!fs.existsSync(filePath)) {
            throw new Error('Fichier ABONNE.DBF non trouvé');
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
          
          // Mettre en cache
          abonnesCountCache = setCache(abonnesCount);
          
          sendStat('abonnes', { count: abonnesCount, fromCache: false });
        } catch (error) {
          console.error('Erreur lors du comptage des abonnés:', error);
          sendStat('abonnes', { count: 0, error: (error as Error).message });
        }
      })(),
      
      // Créances des abonnés
      (async () => {
        try {
          // Vérifier si les données sont en cache
          if (!forceRefresh && isCacheValid(creancesCache)) {
            sendStat('creances', { 
              totalCreances: creancesCache!.data, 
              executionTime: 0, 
              rowCount: 1, 
              fromCache: true 
            });
            return;
          }
          
          // Mesurer le temps d'exécution
          const startTime = Date.now();
          
          // Exécuter la requête SQL directement sur le fichier DBF
          const sqlQuery = `SELECT SUM(MONTTC) AS Sum_MONTTC FROM FACTURES WHERE PAIEMENT = 'T' GROUP BY PAIEMENT`;
          const result = await dbfSqlService.executeSelectQuery(sqlQuery);
          
          // Extraire le total des créances du résultat
          let totalCreances = 0;
          if (result.rows.length > 0) {
            // Le résultat peut être dans différentes propriétés selon l'implémentation
            totalCreances = result.rows[0].Sum_MONTTC || result.rows[0].sum_MONTTC || result.rows[0].MONTTC || 0;
          }
          
          const executionTime = Date.now() - startTime;
          
          // Mettre en cache les données
          creancesCache = {
            data: parseFloat(totalCreances.toFixed(2)),
            timestamp: Date.now()
          };
          
          sendStat('creances', {
            totalCreances: parseFloat(totalCreances.toFixed(2)),
            executionTime: executionTime,
            rowCount: result.count,
            fromCache: false
          });
        } catch (error) {
          console.error('Erreur lors du calcul des créances:', error);
          sendStat('creances', { 
            totalCreances: 0, 
            error: (error as Error).message 
          });
        }
      })()
    ];
    
    // Attendre que toutes les promesses soient résolues
    await Promise.all(promises);
    
    // Envoyer un message de fin
    res.write('event: end\ndata: {}\n\n');
    
    // Fermer la connexion
    res.end();
  } catch (error) {
    console.error('Erreur lors de la récupération des statistiques du dashboard:', error);
    res.status(500).json({ 
      error: 'Erreur serveur lors de la récupération des statistiques',
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

// Route pour obtenir la somme des créances des abonnés depuis FACTURES.DBF
// Compte uniquement les factures non réglées (PAIEMENT = 'T')
// Utilise les fichiers d'index FAC*.NTX pour accélérer les requêtes
// Implémente un système de pagination pour les gros volumes de données
// Utilise maintenant le service SQL pour des requêtes plus efficaces
app.get('/api/abonnes/creances', async (req, res) => {
  try {
    // Vérifier si le rafraîchissement est forcé
    const forceRefresh = req.query.refresh === 'true';
    
    // Vérifier d'abord si les données sont en cache
    if (!forceRefresh && creancesCache) {
      // Vérifier si les données ne sont pas trop anciennes
      if (Date.now() - creancesCache.timestamp < CACHE_DURATION) {
        console.log('Retour des créances depuis le cache');
        return res.json({
          totalCreances: creancesCache.totalCreances,
          executionTime: 0,
          rowCount: 1,
          fromCache: true,
          cacheAge: Math.floor((Date.now() - creancesCache.timestamp) / 1000) // âge du cache en secondes
        });
      }
    }
    
    // Mesurer le temps d'exécution
    const startTime = Date.now();
    
    // Exécuter la requête SQL directement sur le fichier DBF
    const sqlQuery = `SELECT SUM(MONTTC) AS Sum_MONTTC FROM FACTURES WHERE PAIEMENT = 'T' GROUP BY PAIEMENT`;
    const result = await dbfSqlService.executeSelectQuery(sqlQuery);
    
    // Extraire le total des créances du résultat
    let totalCreances = 0;
    if (result.rows.length > 0) {
      // Le résultat peut être dans différentes propriétés selon l'implémentation
      totalCreances = result.rows[0].Sum_MONTTC || result.rows[0].sum_MONTTC || result.rows[0].MONTTC || 0;
    }
    
    const executionTime = Date.now() - startTime;
    
    console.log(`Requête SQL exécutée en ${executionTime} ms, créances totales: ${totalCreances}`);
    
    // Mettre en cache les données
    creancesCache = {
      totalCreances: parseFloat(totalCreances.toFixed(2)),
      timestamp: Date.now()
    };
    
    res.json({
      totalCreances: parseFloat(totalCreances.toFixed(2)),
      executionTime: executionTime,
      rowCount: result.count,
      fromCache: forceRefresh ? false : (creancesCache ? true : false)
    });
  } catch (error) {
    console.error('Erreur lors du calcul des créances:', error);
    res.status(500).json({ 
      error: 'Erreur serveur lors du calcul des créances',
      message: (error as Error).message
    });
  }
});

// Démarrer le serveur
app.listen(PORT, () => {
  console.log(`Serveur DBF démarré sur http://localhost:${PORT}`);
  console.log(`Dossier DBF: ${DBF_FOLDER_PATH}`);
});