// test-tabcode.js
const http = require('http');

// Fonction pour faire une requête HTTP GET
function getRequest(url) {
  return new Promise((resolve, reject) => {
    http.get(url, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        try {
          const jsonData = JSON.parse(data);
          resolve(jsonData);
        } catch (error) {
          reject(error);
        }
      });
    }).on('error', (error) => {
      reject(error);
    });
  });
}

// Tester la récupération des données TABCODE
async function testTabcode() {
  try {
    console.log('Test de récupération des données TABCODE...');
    
    // Récupérer les données
    const data = await getRequest('http://localhost:3000/api/dbf-files/TABCODE.DBF/data');
    console.log('Réponse complète:', JSON.stringify(data, null, 2));
    
    // Vérifier si les données sont dans data.records ou data.data
    const records = data.records || data.data || [];
    console.log('Nombre d\'enregistrements:', records.length);
    
    // Afficher les premiers enregistrements pour voir la structure
    if (records.length > 0) {
      console.log('Premiers enregistrements:');
      console.log(records.slice(0, 3));
      
      // Compter les centres (codes commençant par 'S')
      // Le champ s'appelle CODE_AFFEC selon les informations du fichier
      const centres = records.filter((record) => {
        return record.CODE_AFFEC && typeof record.CODE_AFFEC === 'string' && record.CODE_AFFEC.startsWith('S');
      });
      
      console.log('Nombre de centres (codes commençant par S):', centres.length);
      
      if (centres.length > 0) {
        console.log('Exemples de centres:');
        console.log(centres.slice(0, 3));
      }
    } else {
      console.log('Aucun enregistrement trouvé. Vérifions les informations du fichier...');
      
      // Récupérer les informations sur le fichier
      const fileInfo = await getRequest('http://localhost:3000/api/dbf-files/TABCODE.DBF/info');
      console.log('Informations du fichier:', JSON.stringify(fileInfo, null, 2));
    }
  } catch (error) {
    console.error('Erreur lors du test:', error.message);
  }
}

// Exécuter le test
testTabcode();