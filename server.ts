// server.ts
import express from 'express';
import cors from 'cors';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
import { DBFFile } from 'dbffile';
import { DbfSqlService } from './src/database/dbfSqlService.ts';

dotenv.config();

let DBF_FOLDER_PATH = process.env.DBF_FOLDER_PATH || process.env.VITE_DBF_FOLDER_PATH || './data/dbf';

const CACHE_DURATION = 30 * 60 * 1000; // 30 minutes

interface ServerCache<T> {
  data: T;
  timestamp: number;
}

let creancesCache: ServerCache<number> | null = null;
let creancesResiliesCache: ServerCache<number> | null = null;
let creancesEauCache: ServerCache<number> | null = null;
let creancesParCategorieCache: ServerCache<any> | null = null;
let centresCountCache: ServerCache<number> | null = null;
let abonnesCountCache: ServerCache<number> | null = null;
let abonnesCountByTypeCache: ServerCache<any> | null = null;
let abonnesCompteurArretCache: ServerCache<number> | null = null;
let abonnesSansCompteurCache: ServerCache<number> | null = null;

const dbfSqlService = new DbfSqlService();

function isCacheValid<T>(cache: ServerCache<T> | null): boolean {
  if (!cache) return false;
  return Date.now() - cache.timestamp < CACHE_DURATION;
}

function setCache<T>(data: T): ServerCache<T> {
  return {
    data,
    timestamp: Date.now()
  };
}

function checkIndexFiles(folderPath: string): string[] {
  const indexExtensions = ['.ntx', '.idx', '.ndx'];
  const indexFiles: string[] = [];
  
  try {
    const files = fs.readdirSync(folderPath);
    
    files.forEach(file => {
      const ext = path.extname(file).toLowerCase();
      if (indexExtensions.includes(ext)) {
        indexFiles.push(file);
      }
    });
  } catch (error) {
    console.error('Erreur lors de la recherche des fichiers d\'index:', error);
  }
  
  return indexFiles;
}

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

app.use(express.static('dist'));

app.get('/api/dbf-files', (req, res) => {
  try {
    if (!fs.existsSync(DBF_FOLDER_PATH)) {
      return res.status(404).json({ 
        error: 'Dossier DBF non trouvé',
        folderPath: DBF_FOLDER_PATH 
      });
    }
    
    const files = fs.readdirSync(DBF_FOLDER_PATH);
    
    const dbfFiles = files.filter(file => path.extname(file).toLowerCase() === '.dbf');
    
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

app.get('/api/dbf-files/:filename', (req, res) => {
  try {
    const { filename } = req.params;
    
    if (!filename || path.basename(filename) !== filename) {
      return res.status(400).json({ error: 'Nom de fichier invalide' });
    }
    
    const filePath = path.join(DBF_FOLDER_PATH, filename);
    
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: 'Fichier non trouvé' });
    }
    
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

app.get('/api/dbf-files/:filename/exists', (req, res) => {
  try {
    const { filename } = req.params;
    
    if (!filename || path.basename(filename) !== filename) {
      return res.status(400).json({ error: 'Nom de fichier invalide' });
    }
    
    const filePath = path.join(DBF_FOLDER_PATH, filename);
    
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

app.get('/api/centres/count', (req, res) => {
  try {
    if (isCacheValid(centresCountCache)) {
      return res.json({
        count: centresCountCache!.data,
        fromCache: true
      });
    }
    
    const filePath = path.join(DBF_FOLDER_PATH, 'TABCODE.DBF');
    
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ 
        error: 'Fichier TABCODE.DBF non trouvé'
      });
    }
    
    const indexFiles = checkIndexFiles(DBF_FOLDER_PATH);
    const tabcodeIndexes = indexFiles.filter(file => 
      file.toUpperCase().startsWith('TABCODE') && path.extname(file).toLowerCase() === '.ntx'
    );
    
    const specificTabcodeIndexes = indexFiles.filter(file => 
      /^TABCODE\d+\.NTX$/.test(file.toUpperCase()));
    
    const headerBuffer = Buffer.alloc(32);
    const fd = fs.openSync(filePath, 'r');
    fs.readSync(fd, headerBuffer, 0, 32, 0);
    
    const header = {
      numberOfRecords: headerBuffer.readUInt32LE(4),
      headerLength: headerBuffer.readUInt16LE(8),
      recordLength: headerBuffer.readUInt16LE(10)
    };
    
    fs.closeSync(fd);
    
    let centresCount = 0;
    for (let i = 0; i < header.numberOfRecords; i++) {
      const recordOffset = header.headerLength + (i * header.recordLength);
      
      const recordBuffer = Buffer.alloc(header.recordLength + 10);
      const fd = fs.openSync(filePath, 'r');
      fs.readSync(fd, recordBuffer, 0, header.recordLength, recordOffset);
      fs.closeSync(fd);
      
      const isDeleted = recordBuffer.readUInt8(0) === 0x2A;
      if (!isDeleted) {
        const codeAffec = recordBuffer.subarray(1, 5).toString('utf-8').trim();
        if (codeAffec && codeAffec.startsWith('S')) {
          centresCount++;
        }
      }
    }
    
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

app.get('/api/centres/list', (req, res) => {
  try {
    const filePath = path.join(DBF_FOLDER_PATH, 'TABCODE.DBF');
    
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ 
        error: 'Fichier TABCODE.DBF non trouvé'
      });
    }
    
    const indexFiles = checkIndexFiles(DBF_FOLDER_PATH);
    const tabcodeIndexes = indexFiles.filter(file => 
      file.toUpperCase().startsWith('TABCODE') && path.extname(file).toLowerCase() === '.ntx'
    );
    
    const specificTabcodeIndexes = indexFiles.filter(file => 
      /^TABCODE\d+\.NTX$/.test(file.toUpperCase()));
    
    const headerBuffer = Buffer.alloc(32);
    const fd = fs.openSync(filePath, 'r');
    fs.readSync(fd, headerBuffer, 0, 32, 0);
    
    const header = {
      numberOfRecords: headerBuffer.readUInt32LE(4),
      headerLength: headerBuffer.readUInt16LE(8),
      recordLength: headerBuffer.readUInt16LE(10)
    };
    
    fs.closeSync(fd);
    
    const centres: { code: string; libelle: string }[] = [];
    for (let i = 0; i < header.numberOfRecords; i++) {
      const recordOffset = header.headerLength + (i * header.recordLength);
      
      const recordBuffer = Buffer.alloc(header.recordLength + 10);
      const fd = fs.openSync(filePath, 'r');
      fs.readSync(fd, recordBuffer, 0, header.recordLength, recordOffset);
      fs.closeSync(fd);
      
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

app.get('/api/abonnes/count', (req, res) => {
  try {
    if (isCacheValid(abonnesCountCache)) {
      return res.json({
        count: abonnesCountCache!.data,
        fromCache: true
      });
    }
    
    const filePath = path.join(DBF_FOLDER_PATH, 'ABONNE.DBF');
    
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ 
        error: 'Fichier ABONNE.DBF non trouvé'
      });
    }
    
    const indexFiles = checkIndexFiles(DBF_FOLDER_PATH);
    const abonneIndexes = indexFiles.filter(file => 
      file.toUpperCase().startsWith('ABONNE') && path.extname(file).toLowerCase() === '.ntx'
    );
    
    const specificAbonneIndexes = indexFiles.filter(file => 
      /^ABON\d+\.NTX$/.test(file.toUpperCase()));
    
    const headerBuffer = Buffer.alloc(32);
    const fd = fs.openSync(filePath, 'r');
    fs.readSync(fd, headerBuffer, 0, 32, 0);
    
    const header = {
      numberOfRecords: headerBuffer.readUInt32LE(4),
      headerLength: headerBuffer.readUInt16LE(8),
      recordLength: headerBuffer.readUInt16LE(10)
    };
    
    fs.closeSync(fd);
    
    let abonnesCount = 0;
    for (let i = 0; i < header.numberOfRecords; i++) {
      const recordOffset = header.headerLength + (i * header.recordLength);
      
      const recordBuffer = Buffer.alloc(header.recordLength + 10);
      const fd = fs.openSync(filePath, 'r');
      fs.readSync(fd, recordBuffer, 0, header.recordLength, recordOffset);
      fs.closeSync(fd);
      
      const isDeleted = recordBuffer.readUInt8(0) === 0x2A;
      if (!isDeleted) {
        let fieldOffset = 1;
        
        fieldOffset += 2 + 2 + 3;
        
        fieldOffset += 6 + 30 + 4 + 10 + 3 + 2 + 2 + 4;
        
        const typabon = recordBuffer.subarray(fieldOffset, fieldOffset + 2).toString('utf-8').trim();
        
        if (typabon && typabon !== '') {
          abonnesCount++;
        }
      }
    }
    
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

app.get('/api/abonnes/count-by-type', (req, res) => {
  try {
    if (isCacheValid(abonnesCountByTypeCache)) {
      return res.json({
        ...abonnesCountByTypeCache!.data,
        fromCache: true
      });
    }
    
    const abonneFilePath = path.join(DBF_FOLDER_PATH, 'ABONNE.DBF');
    const tabcodeFilePath = path.join(DBF_FOLDER_PATH, 'TABCODE.DBF');
    const abonmentFilePath = path.join(DBF_FOLDER_PATH, 'ABONMENT.DBF');
    
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
    
    const specificAbonneIndexes = indexFiles.filter(file => 
      /^ABON\d+\.NTX$/.test(file.toUpperCase()));
    const specificTabcodeIndexes = indexFiles.filter(file => 
      /^TABCODE\d+\.NTX$/.test(file.toUpperCase()));
    const specificAbonmentIndexes = indexFiles.filter(file => 
      /^ABONMENT\d+\.NTX$/.test(file.toUpperCase()));
    
    const abonneHeaderBuffer = Buffer.alloc(32);
    const abonneFd = fs.openSync(abonneFilePath, 'r');
    fs.readSync(abonneFd, abonneHeaderBuffer, 0, 32, 0);
    const abonneHeader = {
      numberOfRecords: abonneHeaderBuffer.readUInt32LE(4),
      headerLength: abonneHeaderBuffer.readUInt16LE(8),
      recordLength: abonneHeaderBuffer.readUInt16LE(10)
    };
    fs.closeSync(abonneFd);
    
    const tabcodeHeaderBuffer = Buffer.alloc(32);
    const tabcodeFd = fs.openSync(tabcodeFilePath, 'r');
    fs.readSync(tabcodeFd, tabcodeHeaderBuffer, 0, 32, 0);
    const tabcodeHeader = {
      numberOfRecords: tabcodeHeaderBuffer.readUInt32LE(4),
      headerLength: tabcodeHeaderBuffer.readUInt16LE(8),
      recordLength: tabcodeHeaderBuffer.readUInt16LE(10)
    };
    fs.closeSync(tabcodeFd);
    
    const abonmentHeaderBuffer = Buffer.alloc(32);
    const abonmentFd = fs.openSync(abonmentFilePath, 'r');
    fs.readSync(abonmentFd, abonmentHeaderBuffer, 0, 32, 0);
    const abonmentHeader = {
      numberOfRecords: abonmentHeaderBuffer.readUInt32LE(4),
      headerLength: abonmentHeaderBuffer.readUInt16LE(8),
      recordLength: abonmentHeaderBuffer.readUInt16LE(10)
    };
    fs.closeSync(abonmentFd);
    
    const typabonDesignations = {};
    for (let i = 0; i < tabcodeHeader.numberOfRecords; i++) {
      const recordOffset = tabcodeHeader.headerLength + (i * tabcodeHeader.recordLength);
      
      const recordBuffer = Buffer.alloc(tabcodeHeader.recordLength + 10);
      const fd = fs.openSync(tabcodeFilePath, 'r');
      fs.readSync(fd, recordBuffer, 0, tabcodeHeader.recordLength, recordOffset);
      fs.closeSync(fd);
      
      const isDeleted = recordBuffer.readUInt8(0) === 0x2A;
      if (!isDeleted) {
        let fieldOffset = 1;
        
        const codeAffec = recordBuffer.subarray(fieldOffset, fieldOffset + 4).toString('utf-8').trim();
        fieldOffset += 4;
        
        const libelle = recordBuffer.subarray(fieldOffset, fieldOffset + 20).toString('utf-8').trim();
        
        if (codeAffec && codeAffec.startsWith('T')) {
          const typabonCode = codeAffec.substring(1);
          typabonDesignations[typabonCode] = libelle;
        }
      }
    }
    
    const resilieAccounts = new Set();
    const sansCompteurAccounts = new Set();
    const compteurArretAccounts = new Set();
    for (let i = 0; i < abonmentHeader.numberOfRecords; i++) {
      const recordOffset = abonmentHeader.headerLength + (i * abonmentHeader.recordLength);
      
      const recordBuffer = Buffer.alloc(abonmentHeader.recordLength + 10);
      const fd = fs.openSync(abonmentFilePath, 'r');
      fs.readSync(fd, recordBuffer, 0, abonmentHeader.recordLength, recordOffset);
      fs.closeSync(fd);
      
      const isDeleted = recordBuffer.readUInt8(0) === 0x2A;
      if (!isDeleted) {
        let fieldOffset = 1;
        
        const numab = recordBuffer.subarray(fieldOffset, fieldOffset + 6).toString('utf-8').trim();
        fieldOffset += 6;
        
        fieldOffset += 15 + 8 + 3;
        
        const etatcpt = recordBuffer.subarray(fieldOffset, fieldOffset + 2).toString('utf-8').trim();
        
        if (etatcpt === '40') {
          resilieAccounts.add(numab);
        }
        
        if (etatcpt === '30') {
          sansCompteurAccounts.add(numab);
        }
        
        if (etatcpt === '20') {
          compteurArretAccounts.add(numab);
        }
      }
    }
    
    const typabonCount = {};
    const typabonResilieCount = {};
    const typabonSansCompteurCount = {};
    const typabonCompteurArretCount = {};
    for (let i = 0; i < abonneHeader.numberOfRecords; i++) {
      const recordOffset = abonneHeader.headerLength + (i * abonneHeader.recordLength);
      
      const recordBuffer = Buffer.alloc(abonneHeader.recordLength + 10);
      const fd = fs.openSync(abonneFilePath, 'r');
      fs.readSync(fd, recordBuffer, 0, abonneHeader.recordLength, recordOffset);
      fs.closeSync(fd);
      
      const isDeleted = recordBuffer.readUInt8(0) === 0x2A;
      if (!isDeleted) {
        let fieldOffset = 1;
        
        fieldOffset += 2 + 2 + 3;
        
        const numab = recordBuffer.subarray(fieldOffset, fieldOffset + 6).toString('utf-8').trim();
        fieldOffset += 6;
        
        fieldOffset += 30 + 4 + 10 + 3 + 2 + 2 + 4;
        
        const typabon = recordBuffer.subarray(fieldOffset, fieldOffset + 2).toString('utf-8').trim();
        
        if (typabon) {
          typabonCount[typabon] = (typabonCount[typabon] || 0) + 1;
          
          if (resilieAccounts.has(numab)) {
            typabonResilieCount[typabon] = (typabonResilieCount[typabon] || 0) + 1;
          }
          
          if (sansCompteurAccounts.has(numab)) {
            typabonSansCompteurCount[typabon] = (typabonSansCompteurCount[typabon] || 0) + 1;
          }
          
          if (compteurArretAccounts.has(numab)) {
            typabonCompteurArretCount[typabon] = (typabonCompteurArretCount[typabon] || 0) + 1;
          }
        }
      }
    }
    
    const result = Object.keys(typabonCount)
      .map(typabon => ({
        code: typabon,
        designation: typabonDesignations[typabon] || `Type ${typabon}`,
        count: typabonCount[typabon],
        resilieCount: typabonResilieCount[typabon] || 0,
        sansCompteurCount: typabonSansCompteurCount[typabon] || 0,
        compteurArretCount: typabonCompteurArretCount[typabon] || 0
      }))
      .sort((a, b) => b.count - a.count);
    
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

app.get('/api/abonnes/compteur-arret', (req, res) => {
  try {
    if (isCacheValid(abonnesCompteurArretCache)) {
      return res.json({
        count: abonnesCompteurArretCache!.data,
        fromCache: true
      });
    }
    
    const abonmentFilePath = path.join(DBF_FOLDER_PATH, 'ABONMENT.DBF');
    
    if (!fs.existsSync(abonmentFilePath)) {
      return res.status(404).json({ 
        error: 'Fichier ABONMENT.DBF non trouvé'
      });
    }
    
    const indexFiles = checkIndexFiles(DBF_FOLDER_PATH);
    const abonmentIndexes = indexFiles.filter(file => 
      file.toUpperCase().startsWith('ABONMENT') && path.extname(file).toLowerCase() === '.ntx'
    );
    
    const specificAbonmentIndexes = indexFiles.filter(file => 
      /^ABONMENT\d+\.NTX$/.test(file.toUpperCase()));
    
    const abonmentHeaderBuffer = Buffer.alloc(32);
    const abonmentFd = fs.openSync(abonmentFilePath, 'r');
    fs.readSync(abonmentFd, abonmentHeaderBuffer, 0, 32, 0);
    const abonmentHeader = {
      numberOfRecords: abonmentHeaderBuffer.readUInt32LE(4),
      headerLength: abonmentHeaderBuffer.readUInt16LE(8),
      recordLength: abonmentHeaderBuffer.readUInt16LE(10)
    };
    fs.closeSync(abonmentFd);
    
    let compteurArretCount = 0;
    for (let i = 0; i < abonmentHeader.numberOfRecords; i++) {
      const recordOffset = abonmentHeader.headerLength + (i * abonmentHeader.recordLength);
      
      const recordBuffer = Buffer.alloc(abonmentHeader.recordLength + 10);
      const fd = fs.openSync(abonmentFilePath, 'r');
      fs.readSync(fd, recordBuffer, 0, abonmentHeader.recordLength, recordOffset);
      fs.closeSync(fd);
      
      const isDeleted = recordBuffer.readUInt8(0) === 0x2A;
      if (!isDeleted) {
        let fieldOffset = 1;
        
        fieldOffset += 6 + 15 + 8 + 3;
        
        const etatcpt = recordBuffer.subarray(fieldOffset, fieldOffset + 2).toString('utf-8').trim();
        
        if (etatcpt === '20') {
          compteurArretCount++;
        }
      }
    }
    
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

app.get('/api/abonnes/sans-compteur', (req, res) => {
  try {
    if (isCacheValid(abonnesSansCompteurCache)) {
      return res.json({
        count: abonnesSansCompteurCache!.data,
        fromCache: true
      });
    }
    
    const abonmentFilePath = path.join(DBF_FOLDER_PATH, 'ABONMENT.DBF');
    
    if (!fs.existsSync(abonmentFilePath)) {
      return res.status(404).json({ 
        error: 'Fichier ABONMENT.DBF non trouvé'
      });
    }
    
    const indexFiles = checkIndexFiles(DBF_FOLDER_PATH);
    const abonmentIndexes = indexFiles.filter(file => 
      file.toUpperCase().startsWith('ABONMENT') && path.extname(file).toLowerCase() === '.ntx'
    );
    
    const specificAbonmentIndexes = indexFiles.filter(file => 
      /^ABONMENT\d+\.NTX$/.test(file.toUpperCase()));
    
    const abonmentHeaderBuffer = Buffer.alloc(32);
    const abonmentFd = fs.openSync(abonmentFilePath, 'r');
    fs.readSync(abonmentFd, abonmentHeaderBuffer, 0, 32, 0);
    const abonmentHeader = {
      numberOfRecords: abonmentHeaderBuffer.readUInt32LE(4),
      headerLength: abonmentHeaderBuffer.readUInt16LE(8),
      recordLength: abonmentHeaderBuffer.readUInt16LE(10)
    };
    fs.closeSync(abonmentFd);
    
    let sansCompteurCount = 0;
    for (let i = 0; i < abonmentHeader.numberOfRecords; i++) {
      const recordOffset = abonmentHeader.headerLength + (i * abonmentHeader.recordLength);
      
      const recordBuffer = Buffer.alloc(abonmentHeader.recordLength + 10);
      const fd = fs.openSync(abonmentFilePath, 'r');
      fs.readSync(fd, recordBuffer, 0, abonmentHeader.recordLength, recordOffset);
      fs.closeSync(fd);
      
      const isDeleted = recordBuffer.readUInt8(0) === 0x2A;
      if (!isDeleted) {
        let fieldOffset = 1;
        
        fieldOffset += 6 + 15 + 8 + 3;
        
        const etatcpt = recordBuffer.subarray(fieldOffset, fieldOffset + 2).toString('utf-8').trim();
        
        if (etatcpt === '30') {
          sansCompteurCount++;
        }
      }
    }
    
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

app.post('/api/cache/refresh', (req, res) => {
  try {
    creancesCache = null;
    creancesResiliesCache = null;
    creancesEauCache = null;
    centresCountCache = null;
    abonnesCountCache = null;
    abonnesCountByTypeCache = null;
    abonnesCompteurArretCache = null;
    abonnesSansCompteurCache = null;
    
    res.json({ success: true, message: 'Cache serveur vidé avec succès' });
  } catch (error) {
    console.error('Erreur lors du vidage du cache serveur:', error);
    res.status(500).json({ 
      error: 'Erreur serveur lors du vidage du cache',
      message: (error as Error).message
    });
  }
});

app.post('/api/settings/dbf-path', (req, res) => {
  try {
    const { dbfPath } = req.body;
    
    if (!dbfPath) {
      return res.status(400).json({ error: 'Le chemin du dossier DBF est requis' });
    }
    
    if (!fs.existsSync(dbfPath)) {
      return res.status(400).json({ error: 'Le dossier spécifié n\'existe pas' });
    }
    
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

app.get('/api/settings/dbf-path', (req, res) => {
  res.json({ 
    dbfPath: DBF_FOLDER_PATH 
  });
});

app.post('/api/settings/save-env', (req, res) => {
  try {
    const { dbfPath } = req.body;
    
    if (!dbfPath) {
      return res.status(400).json({ error: 'Le chemin du dossier DBF est requis' });
    }
    
    if (!fs.existsSync(dbfPath)) {
      console.warn(`Le dossier spécifié n'existe pas: ${dbfPath}`);
    }
    
    const envPath = path.join(process.cwd(), '.env');
    let envContent = '';
    
    if (fs.existsSync(envPath)) {
      envContent = fs.readFileSync(envPath, 'utf8');
    }
    
    const dbfPathLine = `DBF_FOLDER_PATH=${dbfPath}`;
    
    if (envContent.includes('DBF_FOLDER_PATH=')) {
      envContent = envContent.replace(/^DBF_FOLDER_PATH=.*$/m, dbfPathLine);
    } else {
      envContent = envContent.trim() ? `${envContent}\n${dbfPathLine}` : dbfPathLine;
    }
    
    fs.writeFileSync(envPath, envContent, 'utf8');
    
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

app.get('/api/dashboard/stats', async (req, res) => {
  try {
    const forceRefresh = req.query.refresh === 'true';
    
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders();
    
    const sendStat = (statName: string, data: any) => {
      res.write(`event: ${statName}\ndata: ${JSON.stringify(data)}\n\n`);
    };
    
    const promises = [
      (async () => {
        try {
          if (!forceRefresh && isCacheValid(centresCountCache)) {
            sendStat('centres', { count: centresCountCache!.data, fromCache: true });
            return;
          }
          
          const filePath = path.join(DBF_FOLDER_PATH, 'TABCODE.DBF');
          
          if (!fs.existsSync(filePath)) {
            throw new Error('Fichier TABCODE.DBF non trouvé');
          }
          
          const headerBuffer = Buffer.alloc(32);
          const fd = fs.openSync(filePath, 'r');
          fs.readSync(fd, headerBuffer, 0, 32, 0);
          
          const header = {
            numberOfRecords: headerBuffer.readUInt32LE(4),
            headerLength: headerBuffer.readUInt16LE(8),
            recordLength: headerBuffer.readUInt16LE(10)
          };
          
          fs.closeSync(fd);
          
          let centresCount = 0;
          for (let i = 0; i < header.numberOfRecords; i++) {
            const recordOffset = header.headerLength + (i * header.recordLength);
            
            const recordBuffer = Buffer.alloc(header.recordLength + 10);
            const fd = fs.openSync(filePath, 'r');
            fs.readSync(fd, recordBuffer, 0, header.recordLength, recordOffset);
            fs.closeSync(fd);
            
            const isDeleted = recordBuffer.readUInt8(0) === 0x2A;
            if (!isDeleted) {
              const codeAffec = recordBuffer.subarray(1, 5).toString('utf-8').trim();
              if (codeAffec && codeAffec.startsWith('S')) {
                centresCount++;
              }
            }
          }
          
          centresCountCache = setCache(centresCount);
          
          sendStat('centres', { count: centresCount, fromCache: false });
        } catch (error) {
          console.error('Erreur lors du comptage des centres:', error);
          sendStat('centres', { count: 0, error: (error as Error).message });
        }
      })(),
      
      (async () => {
        try {
          if (!forceRefresh && isCacheValid(abonnesCountCache)) {
            sendStat('abonnes', { count: abonnesCountCache!.data, fromCache: true });
            return;
          }
          
          const filePath = path.join(DBF_FOLDER_PATH, 'ABONNE.DBF');
          
          if (!fs.existsSync(filePath)) {
            throw new Error('Fichier ABONNE.DBF non trouvé');
          }
          
          const headerBuffer = Buffer.alloc(32);
          const fd = fs.openSync(filePath, 'r');
          fs.readSync(fd, headerBuffer, 0, 32, 0);
          
          const header = {
            numberOfRecords: headerBuffer.readUInt32LE(4),
            headerLength: headerBuffer.readUInt16LE(8),
            recordLength: headerBuffer.readUInt16LE(10)
          };
          
          fs.closeSync(fd);
          
          let abonnesCount = 0;
          for (let i = 0; i < header.numberOfRecords; i++) {
            const recordOffset = header.headerLength + (i * header.recordLength);
            
            const recordBuffer = Buffer.alloc(header.recordLength + 10);
            const fd = fs.openSync(filePath, 'r');
            fs.readSync(fd, recordBuffer, 0, header.recordLength, recordOffset);
            fs.closeSync(fd);
            
            const isDeleted = recordBuffer.readUInt8(0) === 0x2A;
            if (!isDeleted) {
              let fieldOffset = 1;
              
              fieldOffset += 2 + 2 + 3;
              
              fieldOffset += 6 + 30 + 4 + 10 + 3 + 2 + 2 + 4;
              
              const typabon = recordBuffer.subarray(fieldOffset, fieldOffset + 2).toString('utf-8').trim();
              
              if (typabon && typabon !== '') {
                abonnesCount++;
              }
            }
          }
          
          abonnesCountCache = setCache(abonnesCount);
          
          sendStat('abonnes', { count: abonnesCount, fromCache: false });
        } catch (error) {
          console.error('Erreur lors du comptage des abonnés:', error);
          sendStat('abonnes', { count: 0, error: (error as Error).message });
        }
      })(),
      
      (async () => {
        try {
          if (!forceRefresh && isCacheValid(creancesCache)) {
            sendStat('creances', { 
              totalCreances: creancesCache!.data, 
              executionTime: 0, 
              rowCount: 1, 
              fromCache: true 
            });
            return;
          }
          
          const startTime = Date.now();
          
          const sqlQuery = `SELECT SUM(MONTTC) AS Sum_MONTTC FROM FACTURES WHERE PAIEMENT = 'T' GROUP BY PAIEMENT`;
          const result = await dbfSqlService.executeSelectQuery(sqlQuery);
          
          let totalCreances = 0;
          if (result.rows.length > 0) {
            totalCreances = result.rows[0].Sum_MONTTC || result.rows[0].sum_MONTTC || result.rows[0].MONTTC || 0;
          }
          
          const executionTime = Date.now() - startTime;
          
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
    
    await Promise.all(promises);
    
    res.write('event: end\ndata: {}\n\n');
    
    res.end();
  } catch (error) {
    console.error('Erreur lors de la récupération des statistiques du dashboard:', error);
    res.status(500).json({ 
      error: 'Erreur serveur lors de la récupération des statistiques',
      message: (error as Error).message
    });
  }
});

app.post('/api/settings/save-centre', (req, res) => {
  try {
    const { centreCode } = req.body;
    
    if (!centreCode) {
      return res.status(400).json({ error: 'Le code du centre est requis' });
    }
    
    const envPath = path.join(process.cwd(), '.env');
    let envContent = '';
    
    if (fs.existsSync(envPath)) {
      envContent = fs.readFileSync(envPath, 'utf8');
    }
    
    const centreLine = `CENTRE_CODE=${centreCode}`;
    
    if (envContent.includes('CENTRE_CODE=')) {
      envContent = envContent.replace(/^CENTRE_CODE=.*$/m, centreLine);
    } else {
      envContent = envContent.trim() ? `${envContent}\n${centreLine}` : centreLine;
    }
    
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

app.get('/api/abonnes/creances', async (req, res) => {
  try {
    const forceRefresh = req.query.refresh === 'true';
    
    if (!forceRefresh && creancesCache) {
      if (Date.now() - creancesCache.timestamp < CACHE_DURATION) {
        return res.json({
          totalCreances: creancesCache.data,
          executionTime: 0,
          rowCount: 1,
          fromCache: true,
          cacheAge: Math.floor((Date.now() - creancesCache.timestamp) / 1000)
        });
      }
    }
    
    const startTime = Date.now();
    
    const sqlQuery = `SELECT SUM(MONTTC) AS Sum_MONTTC FROM FACTURES WHERE PAIEMENT = 'T' GROUP BY PAIEMENT`;
    const result = await dbfSqlService.executeSelectQuery(sqlQuery);
    
    let totalCreances = 0;
    if (result.rows.length > 0) {
      totalCreances = result.rows[0].Sum_MONTTC || result.rows[0].sum_MONTTC || result.rows[0].MONTTC || 0;
    }
    
    const executionTime = Date.now() - startTime;
    
    creancesCache = {
      data: parseFloat(totalCreances.toFixed(2)),
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

// API endpoint pour récupérer les créances des abonnés résiliés
app.get('/api/abonnes/creances-resilies', async (req, res) => {
  try {
    const forceRefresh = req.query.refresh === 'true';
    
    if (!forceRefresh && creancesResiliesCache) {
      if (Date.now() - creancesResiliesCache.timestamp < CACHE_DURATION) {
        return res.json({
          totalCreancesResilies: creancesResiliesCache.data,
          executionTime: 0,
          rowCount: 1,
          fromCache: true,
          cacheAge: Math.floor((Date.now() - creancesResiliesCache.timestamp) / 1000)
        });
      }
    }
    
    const startTime = Date.now();
    
    // Utiliser une approche plus simple et efficace
    // 1. Obtenir tous les abonnés résiliés
    const abonnesResiliesQuery = `SELECT NUMAB FROM ABONMENT WHERE ETATCPT = '40'`;
    const abonnesResiliesResult = await dbfSqlService.executeSelectQuery(abonnesResiliesQuery);
    
    // 2. Créer un ensemble pour une recherche rapide
    const abonnesResiliesSet = new Set(abonnesResiliesResult.rows.map((abonne: any) => abonne.NUMAB));
    
    // 3. Obtenir toutes les factures impayées
    const facturesQuery = `SELECT NUMAB, MONTTC FROM FACTURES WHERE PAIEMENT = 'T'`;
    const facturesResult = await dbfSqlService.executeSelectQuery(facturesQuery);
    
    // 4. Calculer la somme des créances pour les abonnés résiliés
    let totalCreancesResilies = 0;
    for (const facture of facturesResult.rows) {
      if (abonnesResiliesSet.has(facture.NUMAB)) {
        totalCreancesResilies += parseFloat(facture.MONTTC) || 0;
      }
    }
    
    const executionTime = Date.now() - startTime;
    
    creancesResiliesCache = {
      data: parseFloat(totalCreancesResilies.toFixed(2)),
      timestamp: Date.now()
    };
    
    res.json({
      totalCreancesResilies: parseFloat(totalCreancesResilies.toFixed(2)),
      executionTime: executionTime,
      rowCount: 1,
      fromCache: forceRefresh ? false : (creancesResiliesCache ? true : false)
    });
  } catch (error) {
    console.error('Erreur lors du calcul des créances des abonnés résiliés:', error);
    res.status(500).json({ 
      error: 'Erreur serveur lors du calcul des créances des abonnés résiliés',
      message: (error as Error).message
    });
  }
});

// API endpoint pour récupérer les créances d'eau
app.get('/api/abonnes/creances-eau', async (req, res) => {
  try {
    const forceRefresh = req.query.refresh === 'true';
    
    if (!forceRefresh && creancesEauCache) {
      if (Date.now() - creancesEauCache.timestamp < CACHE_DURATION) {
        return res.json({
          totalCreancesEau: creancesEauCache.data,
          executionTime: 0,
          rowCount: 1,
          fromCache: true,
          cacheAge: Math.floor((Date.now() - creancesEauCache.timestamp) / 1000)
        });
      }
    }
    
    const startTime = Date.now();
    
    // Requête pour obtenir la somme des créances d'eau
    const sqlQuery = `SELECT SUM(MONTTC) AS Sum_MONTTC FROM FACTURES WHERE PAIEMENT = 'T' AND TYPE = 'E' GROUP BY PAIEMENT, TYPE`;
    const result = await dbfSqlService.executeSelectQuery(sqlQuery);
    
    let totalCreancesEau = 0;
    if (result.rows.length > 0) {
      totalCreancesEau = result.rows[0].Sum_MONTTC || result.rows[0].sum_MONTTC || result.rows[0].MONTTC || 0;
    }
    
    const executionTime = Date.now() - startTime;
    
    creancesEauCache = {
      data: parseFloat(totalCreancesEau.toFixed(2)),
      timestamp: Date.now()
    };
    
    res.json({
      totalCreancesEau: parseFloat(totalCreancesEau.toFixed(2)),
      executionTime: executionTime,
      rowCount: result.count,
      fromCache: forceRefresh ? false : (creancesEauCache ? true : false)
    });
  } catch (error) {
    console.error('Erreur lors du calcul des créances d\'eau:', error);
    res.status(500).json({ 
      error: 'Erreur serveur lors du calcul des créances d\'eau',
      message: (error as Error).message
    });
  }
});

// API endpoint pour récupérer les créances par catégorie
app.get('/api/abonnes/creances-par-categorie', async (req, res) => {
  try {
    const forceRefresh = req.query.refresh === 'true';
    
    if (!forceRefresh && creancesParCategorieCache) {
      if (Date.now() - creancesParCategorieCache.timestamp < CACHE_DURATION) {
        return res.json({
          creancesParCategorie: creancesParCategorieCache.data,
          executionTime: 0,
          rowCount: creancesParCategorieCache.data.length,
          fromCache: true,
          cacheAge: Math.floor((Date.now() - creancesParCategorieCache.timestamp) / 1000)
        });
      }
    }
    
    const startTime = Date.now();
    
    // Requêtes pour obtenir les créances par catégorie
    const categories = ['2', '3', '4'];
    const creancesParCategorie = [];
    
    for (const categorie of categories) {
      const sqlQuery = `SELECT SUM(MONTTC) AS Sum_MONTTC FROM FACTURES WHERE Left(TYPABON, 1) = '${categorie}' GROUP BY Left(TYPABON, 1)`;
      const result = await dbfSqlService.executeSelectQuery(sqlQuery);
      
      if (result.rows.length > 0) {
        creancesParCategorie.push({
          categorie: categorie,
          montant: result.rows[0].Sum_MONTTC || result.rows[0].sum_MONTTC || result.rows[0].MONTTC || 0
        });
      }
    }
    
    const executionTime = Date.now() - startTime;
    
    creancesParCategorieCache = {
      data: creancesParCategorie,
      timestamp: Date.now()
    };
    
    res.json({
      creancesParCategorie: creancesParCategorie,
      executionTime: executionTime,
      rowCount: creancesParCategorie.length,
      fromCache: forceRefresh ? false : (creancesParCategorieCache ? true : false)
    });
  } catch (error) {
    console.error('Erreur lors du calcul des créances par catégorie:', error);
    res.status(500).json({ 
      error: 'Erreur serveur lors du calcul des créances par catégorie',
      message: (error as Error).message
    });
  }
});

app.listen(PORT, () => {
  console.log(`Serveur DBF démarré sur http://localhost:${PORT}`);
  console.log(`Dossier DBF: ${DBF_FOLDER_PATH}`);
});