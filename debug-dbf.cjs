// debug-dbf.cjs
const { DBFFile } = require('dbffile');
const path = require('path');

async function debugDBF() {
  try {
    const filePath = path.join('D:', 'epeor', 'TABCODE.DBF');
    console.log(`Tentative d'ouverture du fichier: ${filePath}`);
    
    // Ouvrir le fichier DBF avec différents paramètres
    console.log('\n--- Test 1: Ouverture avec encodage latin1 ---');
    const dbf1 = await DBFFile.open(filePath, { encoding: 'latin1' });
    console.log('Fichier ouvert avec succès');
    console.log('- Nombre total d\'enregistrements:', dbf1.recordCount);
    console.log('- Champs:', dbf1.fields.map(f => ({ name: f.name, type: f.type, size: f.size })));
    
    // Lire un seul enregistrement
    console.log('\n--- Test 2: Lecture d\'un seul enregistrement ---');
    try {
      const record = await dbf1.readRecords(0, 1);
      console.log('Enregistrement lu:', record);
    } catch (err) {
      console.error('Erreur lors de la lecture d\'un enregistrement:', err.message);
    }
    
    // Lire plusieurs enregistrements
    console.log('\n--- Test 3: Lecture de 10 enregistrements ---');
    try {
      const records = await dbf1.readRecords(0, Math.min(10, dbf1.recordCount));
      console.log('Enregistrements lus:', records.length);
      if (records.length > 0) {
        console.log('Premier enregistrement:', records[0]);
      }
    } catch (err) {
      console.error('Erreur lors de la lecture de plusieurs enregistrements:', err.message);
    }
    
    // Lire tous les enregistrements
    console.log('\n--- Test 4: Lecture de tous les enregistrements ---');
    try {
      const allRecords = await dbf1.readRecords(0, dbf1.recordCount);
      console.log('Tous les enregistrements lus:', allRecords.length);
      if (allRecords.length > 0) {
        console.log('Premier enregistrement:', allRecords[0]);
        console.log('Dernier enregistrement:', allRecords[allRecords.length - 1]);
      }
    } catch (err) {
      console.error('Erreur lors de la lecture de tous les enregistrements:', err.message);
    }
    
  } catch (error) {
    console.error('Erreur lors du test DBF:', error);
  }
}

// Exécuter le test
debugDBF();