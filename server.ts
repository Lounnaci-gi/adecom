import express from 'express';
import cors from 'cors';
import fs from 'fs';
import path from 'path';
import { DBFFile } from 'dbffile';

// Charger les variables d'environnement
const PORT = process.env.PORT || 3000;
const DBF_FOLDER_PATH = process.env.DBF_FOLDER_PATH || 'D:/epeor';

// Fonction pour lire un enregistrement DBF
function readDBFRecord(buffer: Buffer, offset: number, recordLength: number) {
  // Le premier octet indique si l'enregistrement est supprimé (0x2A = *)
  const isDeleted = buffer.readUInt8(offset) === 0x2A;
  
  if (isDeleted) {
    return null; // Enregistrement supprimé
  }
  
  // Extraire les données de l'enregistrement
  const recordData: any = {};
  let fieldOffset = offset + 1; // +1 pour ignorer l'indicateur de suppression
  
  // Selon l'analyse précédente, les champs sont :
  // 1. CODE_AFFEC (4 caractères)
  // 2. LIBELLEEC (20 caractères)
  // 3. UNITEEEC (2 caractères)
  // 4. MONTEEC (10 caractères)
  // 5. NBREXEEC (1 caractère)
  // 6. CHAMPS1EC (15 caractères)
  // 7. CHAMPS2EC (15 caractères)
  
  recordData.CODE_AFFEC = buffer.subarray(fieldOffset, fieldOffset + 4).toString('utf-8').trim();
  fieldOffset += 4;
  
  recordData.LIBELLEEC = buffer.subarray(fieldOffset, fieldOffset + 20).toString('utf-8').trim();
  fieldOffset += 20;
  
  recordData.UNITEEEC = buffer.subarray(fieldOffset, fieldOffset + 2).toString('utf-8').trim();
  fieldOffset += 2;
  
  recordData.MONTEEC = buffer.subarray(fieldOffset, fieldOffset + 10).toString('utf-8').trim();
  fieldOffset += 10;
  
  recordData.NBREXEEC = buffer.subarray(fieldOffset, fieldOffset + 1).toString('utf-8').trim();
  fieldOffset += 1;
  
  recordData.CHAMPS1EC = buffer.subarray(fieldOffset, fieldOffset + 15).toString('utf-8').trim();
  fieldOffset += 15;
  
  recordData.CHAMPS2EC = buffer.subarray(fieldOffset, fieldOffset + 15).toString('utf-8').trim();
  
  return recordData;
}

// Fonction pour compter les centres dans TABCODE.DBF
function countCentresInTabcode(): { count: number; exemples: any[] } {
  try {
    const filePath = path.join(DBF_FOLDER_PATH, 'TABCODE.DBF');
    
    // Vérifier si le fichier existe
    if (!fs.existsSync(filePath)) {
      throw new Error('Fichier TABCODE.DBF non trouvé');
    }
    
    // Lire tout le fichier
    const buffer = fs.readFileSync(filePath);
    
    // Analyser l'en-tête pour obtenir les informations
    const header = {
      numberOfRecords: buffer.readUInt32LE(4),
      headerLength: buffer.readUInt16LE(8),
      recordLength: buffer.readUInt16LE(10)
    };
    
    // Lire tous les enregistrements et compter les centres
    let centresCount = 0;
    let exemplesCentres: any[] = [];
    
    for (let i = 0; i < header.numberOfRecords; i++) {
      const recordOffset = header.headerLength + (i * header.recordLength);
      
      // Vérifier que nous ne dépassons pas la fin du fichier
      if (recordOffset + header.recordLength > buffer.length) {
        break;
      }
      
      const record = readDBFRecord(buffer, recordOffset, header.recordLength);
      
      if (record && record.CODE_AFFEC) {
        // Vérifier si c'est un centre (code commençant par 'S')
        if (record.CODE_AFFEC.startsWith('S')) {
          centresCount++;
          
          // Stocker quelques exemples
          if (exemplesCentres.length < 5) {
            exemplesCentres.push({
              code: record.CODE_AFFEC,
              libelle: record.LIBELLEEC
            });
          }
        }
      }
    }
    
    return {
      count: centresCount,
      exemples: exemplesCentres
    };
  } catch (error) {
    console.error('Erreur lors du comptage des centres:', error);
    return {
      count: 0,
      exemples: []
    };
  }
}

// Fonction pour lire les données de TABCODE.DBF
function readTabcodeData(): any[] {
  try {
    const filePath = path.join(DBF_FOLDER_PATH, 'TABCODE.DBF');
    
    // Vérifier si le fichier existe
    if (!fs.existsSync(filePath)) {
      throw new Error('Fichier TABCODE.DBF non trouvé');
    }
    
    // Lire tout le fichier
    const buffer = fs.readFileSync(filePath);
    
    // Analyser l'en-tête pour obtenir les informations
    const header = {
      numberOfRecords: buffer.readUInt32LE(4),
      headerLength: buffer.readUInt16LE(8),
      recordLength: buffer.readUInt16LE(10)
    };
    
    // Lire tous les enregistrements
    const records: any[] = [];
    
    for (let i = 0; i < header.numberOfRecords; i++) {
      const recordOffset = header.headerLength + (i * header.recordLength);
      
      // Vérifier que nous ne dépassons pas la fin du fichier
      if (recordOffset + header.recordLength > buffer.length) {
        break;
      }
      
      const record = readDBFRecord(buffer, recordOffset, header.recordLength);
      
      if (record) {
        records.push(record);
      }
    }
    
    return records;
  } catch (error) {
    console.error('Erreur lors de la lecture des données TABCODE:', error);
    return [];
  }
}

// Créer l'application Express
const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Servir les fichiers statiques du frontend
app.use(express.static('dist'));

// Routes API

// Route pour lister les fichiers DBF
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
    
    // Filtrer pour ne garder que les fichiers .dbf
    const dbfFiles = files.filter(file => 
      path.extname(file).toLowerCase() === '.dbf'
    );
    
    res.json({
      folderPath: DBF_FOLDER_PATH,
      totalFiles: files.length,
      dbfFiles: dbfFiles.length,
      files: dbfFiles
    });
  } catch (error) {
    console.error('Erreur lors de la lecture du dossier:', error);
    res.status(500).json({ 
      error: 'Erreur serveur lors de la lecture du dossier',
      message: (error as Error).message
    });
  }
});

// Route pour obtenir les informations sur un fichier DBF
app.get('/api/dbf-files/:filename/info', async (req, res) => {
  try {
    const filename = req.params.filename;
    const filePath = path.join(DBF_FOLDER_PATH, filename);
    
    // Vérifier si le fichier existe
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ 
        error: 'Fichier non trouvé', 
        filename 
      });
    }
    
    // Vérifier que c'est un fichier .dbf
    if (path.extname(filename).toLowerCase() !== '.dbf') {
      return res.status(400).json({ 
        error: 'Le fichier doit être un fichier .dbf', 
        filename 
      });
    }
    
    // Ouvrir le fichier DBF
    const dbf = await DBFFile.open(filePath);
    
    res.json({
      filename,
      recordCount: dbf.recordCount,
      fields: dbf.fields,
      encoding: dbf.encoding
    });
  } catch (error) {
    console.error('Erreur lors de la lecture des informations du fichier:', error);
    res.status(500).json({ 
      error: 'Erreur serveur lors de la lecture du fichier',
      message: (error as Error).message
    });
  }
});

// Route pour lire les données d'un fichier DBF
app.get('/api/dbf-files/:filename/data', async (req, res) => {
  try {
    const filename = req.params.filename;
    
    // Pour TABCODE.DBF, utiliser notre méthode personnalisée
    if (filename === 'TABCODE.DBF') {
      const records = readTabcodeData();
      
      // Paramètres de pagination (optionnels)
      const page = parseInt(req.query.page as string) || 1;
      const limit = Math.min(parseInt(req.query.limit as string) || 50, 1000); // Max 1000 enregistrements
      const offset = (page - 1) * limit;
      
      // Appliquer la pagination manuellement
      const paginatedRecords = records.slice(offset, offset + limit);
      
      res.json({
        filename,
        page,
        limit,
        totalRecords: records.length,
        recordsReturned: paginatedRecords.length,
        records: paginatedRecords
      });
      return;
    }
    
    // Pour les autres fichiers, utiliser la méthode standard
    const filePath = path.join(DBF_FOLDER_PATH, filename);
    
    // Vérifier si le fichier existe
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ 
        error: 'Fichier non trouvé', 
        filename 
      });
    }
    
    // Vérifier que c'est un fichier .dbf
    if (path.extname(filename).toLowerCase() !== '.dbf') {
      return res.status(400).json({ 
        error: 'Le fichier doit être un fichier .dbf', 
        filename 
      });
    }
    
    // Paramètres de pagination (optionnels)
    const page = parseInt(req.query.page as string) || 1;
    const limit = Math.min(parseInt(req.query.limit as string) || 50, 1000); // Max 1000 enregistrements
    const offset = (page - 1) * limit;
    
    // Ouvrir le fichier DBF avec les options appropriées
    const dbf = await DBFFile.open(filePath, {
      encoding: 'latin1'
    });
    
    // Toujours lire tous les enregistrements pour éviter les problèmes
    const allRecords = await dbf.readRecords(0, dbf.recordCount);
    
    // Appliquer la pagination manuellement
    const paginatedRecords = allRecords.slice(offset, offset + limit);
    
    res.json({
      filename,
      page,
      limit,
      totalRecords: dbf.recordCount,
      recordsReturned: paginatedRecords.length,
      records: paginatedRecords
    });
  } catch (error) {
    console.error('Erreur lors de la lecture des données du fichier:', error);
    res.status(500).json({ 
      error: 'Erreur serveur lors de la lecture du fichier',
      message: (error as Error).message
    });
  }
});

// Route pour obtenir un enregistrement spécifique
app.get('/api/dbf-files/:filename/record/:index', async (req, res) => {
  try {
    const filename = req.params.filename;
    const index = parseInt(req.params.index);
    const filePath = path.join(DBF_FOLDER_PATH, filename);
    
    // Vérifier si le fichier existe
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ 
        error: 'Fichier non trouvé', 
        filename 
      });
    }
    
    // Vérifier que c'est un fichier .dbf
    if (path.extname(filename).toLowerCase() !== '.dbf') {
      return res.status(400).json({ 
        error: 'Le fichier doit être un fichier .dbf', 
        filename 
      });
    }
    
    // Vérifier que l'index est valide
    if (isNaN(index) || index < 0) {
      return res.status(400).json({ 
        error: 'Index invalide', 
        index 
      });
    }
    
    // Ouvrir le fichier DBF
    const dbf = await DBFFile.open(filePath);
    
    // Vérifier que l'index est dans les limites
    if (index >= dbf.recordCount) {
      return res.status(400).json({ 
        error: 'Index hors limites', 
        index,
        maxIndex: dbf.recordCount - 1
      });
    }
    
    // Lire l'enregistrement spécifique
    const records = await dbf.readRecords(index, 1);
    
    res.json({
      filename,
      index,
      record: records[0]
    });
  } catch (error) {
    console.error('Erreur lors de la lecture de l\'enregistrement:', error);
    res.status(500).json({ 
      error: 'Erreur serveur lors de la lecture de l\'enregistrement',
      message: (error as Error).message
    });
  }
});

// Route pour obtenir le nombre de centres depuis TABCODE.DBF
app.get('/api/centres/count', (req, res) => {
  try {
    const result = countCentresInTabcode();
    res.json(result);
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
        error: 'Fichier ABONNE.DBF non trouvé',
        filename: 'ABONNE.DBF'
      });
    }
    
    // Lire les 32 premiers octets pour obtenir le nombre d'enregistrements
    const buffer = Buffer.alloc(32);
    const fd = fs.openSync(filePath, 'r');
    fs.readSync(fd, buffer, 0, 32, 0);
    fs.closeSync(fd);
    
    // Extraire le nombre d'enregistrements (position 4, 4 octets, little-endian)
    const numberOfRecords = buffer.readUInt32LE(4);
    
    res.json({
      count: numberOfRecords
    });
  } catch (error) {
    console.error('Erreur lors du comptage des abonnés:', error);
    res.status(500).json({ 
      error: 'Erreur serveur lors du comptage des abonnés',
      message: (error as Error).message
    });
  }
});

// Démarrer le serveur
app.listen(PORT, () => {
  console.log(`Serveur DBF démarré sur http://localhost:${PORT}`);
  console.log(`Dossier DBF: ${DBF_FOLDER_PATH}`);
});

export default app;