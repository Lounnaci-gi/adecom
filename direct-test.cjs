// direct-test.cjs
const { DBFFile } = require('dbffile');
const path = require('path');

async function testDirectDBF() {
  try {
    const filePath = path.join('D:', 'epeor', 'TABCODE.DBF');
    console.log(`Tentative d'ouverture du fichier: ${filePath}`);
    
    // Ouvrir le fichier DBF
    const dbf = await DBFFile.open(filePath, {
      encoding: 'latin1'
    });
    
    console.log('Fichier ouvert avec succès');
    console.log('- Nombre total d\'enregistrements:', dbf.recordCount);
    console.log('- Champs:', dbf.fields.map(f => ({ name: f.name, type: f.type, size: f.size })));
    
    // Lire tous les enregistrements
    console.log('Lecture de tous les enregistrements...');
    const records = await dbf.readRecords(0, dbf.recordCount);
    console.log('- Enregistrements lus:', records.length);
    
    // Afficher les premiers enregistrements
    if (records.length > 0) {
      console.log('Premiers enregistrements:');
      console.log(records.slice(0, 5));
      
      // Compter les centres (codes commençant par 'S')
      const centres = records.filter(record => {
        return record.CODE_AFFEC && typeof record.CODE_AFFEC === 'string' && record.CODE_AFFEC.startsWith('S');
      });
      
      console.log('Nombre de centres (codes commençant par S):', centres.length);
      
      if (centres.length > 0) {
        console.log('Exemples de centres:');
        console.log(centres.slice(0, 5));
      }
    }
  } catch (error) {
    console.error('Erreur lors du test direct:', error);
  }
}

// Exécuter le test
testDirectDBF();