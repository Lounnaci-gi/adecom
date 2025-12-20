// test-sql-service.ts
// Script de test pour vérifier le fonctionnement du service SQL sans démarrage complet du serveur

import { DbfSqlService } from './src/database/dbfSqlService.ts';

async function testSqlService() {
  console.log('Test du service SQL pour FACTURES.DBF...');
  
  try {
    const sqlService = new DbfSqlService();
    
    // Test de la requête pour les créances
    console.log('Exécution de la requête SQL...');
    const startTime = Date.now();
    
    const query = `SELECT SUM(MONTTC) AS Sum_MONTTC FROM FACTURES WHERE PAIEMENT = 'T' GROUP BY PAIEMENT`;
    const result = await sqlService.executeSelectQuery(query);
    
    const endTime = Date.now();
    const executionTime = endTime - startTime;
    
    console.log(`Requête exécutée en ${executionTime} ms`);
    console.log('Résultat:', result);
    
    if (result.rows.length > 0) {
      const totalCreances = result.rows[0].Sum_MONTTC || result.rows[0].sum_MONTTC || result.rows[0].MONTTC || 0;
      console.log(`Total des créances: ${totalCreances}`);
    }
    
    console.log('Test terminé avec succès!');
  } catch (error) {
    console.error('Erreur lors du test:', error);
  }
}

// Exécuter le test
testSqlService();