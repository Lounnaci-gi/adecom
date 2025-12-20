// test-simple-query.ts
// Script de test pour une requête simple sur FACTURES.DBF

import { DbfSqlService } from './src/database/dbfSqlService.ts';

async function testSimpleQuery() {
  console.log('Test d\'une requête simple sur FACTURES.DBF...');
  
  try {
    const sqlService = new DbfSqlService();
    
    // Test d'une requête simple pour compter les enregistrements
    console.log('Exécution d\'une requête COUNT...');
    const startTime = Date.now();
    
    // Essayons d'abord une requête simple pour voir le schéma
    console.log('Récupération du schéma de la table FACTURES...');
    const schema = await sqlService.getTableSchema('FACTURES');
    console.log('Schéma de la table FACTURES:', schema);
    
    // Test d'une requête simple pour voir quelques enregistrements
    console.log('Récupération de quelques enregistrements...');
    const query = `SELECT * FROM FACTURES LIMIT 5`;
    const result = await sqlService.executeSelectQuery(query);
    
    const endTime = Date.now();
    const executionTime = endTime - startTime;
    
    console.log(`Requête exécutée en ${executionTime} ms`);
    console.log('Résultat (5 premiers enregistrements):', result);
    
    console.log('Test terminé avec succès!');
  } catch (error) {
    console.error('Erreur lors du test:', error);
  }
}

// Exécuter le test
testSimpleQuery();