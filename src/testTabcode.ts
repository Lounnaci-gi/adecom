// testTabcode.ts
import { getTabcodeData } from './api';

async function testTabcode() {
  try {
    console.log('Test de récupération des données TABCODE...');
    const data = await getTabcodeData();
    console.log('Données récupérées:', data);
    console.log('Nombre d\'enregistrements:', data.length);
    
    // Afficher les premiers enregistrements pour voir la structure
    if (data.length > 0) {
      console.log('Premiers enregistrements:');
      console.log(data.slice(0, 5));
      
      // Compter les centres (codes commençant par 'S')
      const centres = data.filter((record: any) => {
        return record.CODE && typeof record.CODE === 'string' && record.CODE.startsWith('S');
      });
      
      console.log('Nombre de centres (codes commençant par S):', centres.length);
      
      if (centres.length > 0) {
        console.log('Exemples de centres:');
        console.log(centres.slice(0, 5));
      }
    }
  } catch (error) {
    console.error('Erreur lors du test:', error);
  }
}

// Exécuter le test
testTabcode();