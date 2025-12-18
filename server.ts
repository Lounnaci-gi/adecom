import express from 'express';
import cors from 'cors';
import fs from 'fs';
import path from 'path';
import { DBFFile } from 'dbffile';

// Charger les variables d'environnement
const PORT = process.env.PORT || 3000;
const DBF_FOLDER_PATH = process.env.DBF_FOLDER_PATH || 'D:/epeor';

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
    
    // Ouvrir le fichier DBF
    const dbf = await DBFFile.open(filePath);
    
    // Lire uniquement les enregistrements demandés
    const records = await dbf.readRecords(offset, limit);
    
    res.json({
      filename,
      page,
      limit,
      totalRecords: dbf.recordCount,
      recordsReturned: records.length,
      records
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

// Démarrer le serveur
app.listen(PORT, () => {
  console.log(`Serveur DBF démarré sur http://localhost:${PORT}`);
  console.log(`Dossier DBF: ${DBF_FOLDER_PATH}`);
});

export default app;