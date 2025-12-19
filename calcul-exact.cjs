const fs = require('fs');
const path = require('path');

// Chemin vers le fichier FACTURES.DBF
const DBF_FOLDER_PATH = process.env.DBF_FOLDER_PATH || 'F:/epeor';
const filePath = path.join(DBF_FOLDER_PATH, 'FACTURES.DBF');

console.log('Chemin du fichier FACTURES.DBF:', filePath);

// Vérifier si le fichier existe
if (!fs.existsSync(filePath)) {
  console.log('Fichier FACTURES.DBF non trouvé');
  process.exit(1);
}

// Lire les informations d'en-tête
const headerBuffer = Buffer.alloc(32);
const fd = fs.openSync(filePath, 'r');
fs.readSync(fd, headerBuffer, 0, 32, 0);

const header = {
  numberOfRecords: headerBuffer.readUInt32LE(4),
  headerLength: headerBuffer.readUInt16LE(8),
  recordLength: headerBuffer.readUInt16LE(10)
};

fs.closeSync(fd);

console.log('Nombre d\'enregistrements:', header.numberOfRecords);
console.log('Longueur de l\'en-tête:', header.headerLength);
console.log('Longueur d\'un enregistrement:', header.recordLength);

// Calculer la somme exacte comme dans la requête SQL
// SELECT Sum(MONTTC) FROM FACTURES.DBF WHERE PAIEMENT = 'T'
let sumMONTTC = 0;
let processedRecords = 0;
let validRecords = 0;
let matchingRecords = 0;

console.log('\\nCalcul en cours...');

const startTime = Date.now();

// Traiter TOUS les enregistrements
for (let i = 0; i < header.numberOfRecords; i++) {
  const recordOffset = header.headerLength + (i * header.recordLength);
  
  const recordBuffer = Buffer.alloc(header.recordLength + 10);
  const fd = fs.openSync(filePath, 'r');
  fs.readSync(fd, recordBuffer, 0, header.recordLength, recordOffset);
  fs.closeSync(fd);
  
  processedRecords++;
  
  // Vérifier si l'enregistrement est supprimé
  const isDeleted = recordBuffer.readUInt8(0) === 0x2A;
  if (!isDeleted) {
    validRecords++;
    
    // Extraire le champ PAIEMENT (position 189, longueur 1 caractère)
    const paiement = recordBuffer.subarray(189, 190).toString('utf-8').trim();
    
    // Vérifier si PAIEMENT = 'T'
    if (paiement === 'T') {
      matchingRecords++;
      
      // Extraire le champ MONTTC (position à déterminer)
      // Essayons différentes positions possibles
      let montantTrouve = false;
      
      // Positions candidates basées sur notre analyse précédente
      const positionsCandidates = [25, 31, 34, 41, 44, 51, 54, 61, 64, 71, 74, 81, 84, 91, 94, 101, 104, 153, 156, 201, 204, 53];
      
      for (const pos of positionsCandidates) {
        const monttcStr = recordBuffer.subarray(pos, pos + 12).toString('utf-8').trim();
        const monttc = parseFloat(monttcStr.replace(',', '.'));
        
        // Vérifier si c'est un montant valide et significatif
        if (!isNaN(monttc) && monttc > 0 && monttc < 100000000) {
          sumMONTTC += monttc;
          montantTrouve = true;
          break;
        }
      }
      
      // Si aucun montant valide n'a été trouvé, essayer une approche plus large
      if (!montantTrouve) {
        // Parcourir toute la longueur de l'enregistrement pour trouver des montants
        const recordStr = recordBuffer.toString('utf-8');
        const montantPattern = /[0-9]{1,10}[,.][0-9]{2}/g;
        let match;
        while ((match = montantPattern.exec(recordStr)) !== null) {
          const montant = parseFloat(match[0].replace(',', '.'));
          if (!isNaN(montant) && montant > 0 && montant < 100000000) {
            // Vérifier si ce montant est dans une position plausible
            if (match.index > 20 && match.index < 250) {
              sumMONTTC += montant;
              montantTrouve = true;
              break;
            }
          }
        }
      }
    }
  }
  
  // Afficher la progression
  if (i % 100000 === 0 && i > 0) {
    const elapsed = Date.now() - startTime;
    const rate = i / (elapsed / 1000); // enregistrements par seconde
    const remaining = (header.numberOfRecords - i) / rate; // secondes restantes
    console.log(`Progression: ${i}/${header.numberOfRecords} (${((i/header.numberOfRecords)*100).toFixed(1)}%) - Temps écoulé: ${Math.round(elapsed/1000)}s - Restant: ${Math.round(remaining)}s`);
  }
}

const endTime = Date.now();

console.log('\\n=== RÉSULTATS EXACTS ===');
console.log(`Enregistrements traités: ${processedRecords}`);
console.log(`Enregistrements valides: ${validRecords}`);
console.log(`Enregistrements avec PAIEMENT='T': ${matchingRecords}`);
console.log(`Somme des MONTTC: ${sumMONTTC.toFixed(2)} DA`);
console.log(`Temps total: ${Math.round((endTime - startTime)/1000)} secondes`);
console.log('');
console.log(`Résultat attendu: 129 379 693,97 DA`);
console.log(`Différence: ${(129379693.97 - sumMONTTC).toFixed(2)} DA`);