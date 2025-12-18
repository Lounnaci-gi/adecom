// test-node-dbf.cjs
const fs = require('fs');
const dbf = require('node-dbf');

async function testNodeDbf() {
  try {
    console.log('Tentative de lecture du fichier avec node-dbf...');
    
    const parser = new dbf.Parser('D:/epeor/TABCODE.DBF');
    
    parser.on('header', header => {
      console.log('Header:', header);
      console.log('Nombre de champs:', header.fields.length);
      console.log('Nombre d\'enregistrements:', header.numberOfRecords);
    });
    
    let recordCount = 0;
    let centresCount = 0;
    let exemplesCentres = [];
    
    parser.on('record', record => {
      recordCount++;
      
      // Afficher les premiers enregistrements pour le débogage
      if (recordCount <= 5) {
        console.log(`Enregistrement ${recordCount}:`, record);
      }
      
      // Vérifier si c'est un centre (code commençant par 'S')
      if (record.CODE_AFFEC && typeof record.CODE_AFFEC === 'string' && record.CODE_AFFEC.startsWith('S')) {
        centresCount++;
        // Stocker quelques exemples
        if (exemplesCentres.length < 5) {
          exemplesCentres.push({
            code: record.CODE_AFFEC,
            libelle: record.LIBELLE
          });
        }
      }
    });
    
    parser.on('end', () => {
      console.log(`\n--- Résultats finaux ---`);
      console.log(`Total enregistrements lus: ${recordCount}`);
      console.log(`Centres trouvés: ${centresCount}`);
      if (exemplesCentres.length > 0) {
        console.log('Exemples de centres:', exemplesCentres);
      }
    });
    
    console.log('Démarrage de la lecture du fichier...');
    parser.parse();
    
  } catch (error) {
    console.error('Erreur lors du test avec node-dbf:', error);
  }
}

// Exécuter le test
testNodeDbf();