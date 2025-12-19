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

// Analyser les montants pour identifier les erreurs
let totalExpected = 0;
let validRecords = 0;
let invalidRecords = 0;
let zeroRecords = 0;
let largeAmounts = 0;

console.log('\\nAnalyse des montants (PAIEMENT="T")...');

// Traiter un échantillon représentatif
const sampleSize = Math.min(100000, header.numberOfRecords);

for (let i = 0; i < sampleSize; i++) {
  const recordOffset = header.headerLength + (i * header.recordLength);
  
  const recordBuffer = Buffer.alloc(header.recordLength + 10);
  const fd = fs.openSync(filePath, 'r');
  fs.readSync(fd, recordBuffer, 0, header.recordLength, recordOffset);
  fs.closeSync(fd);
  
  // Vérifier si l'enregistrement est supprimé
  const isDeleted = recordBuffer.readUInt8(0) === 0x2A;
  if (!isDeleted) {
    // Extraire le champ PAIEMENT (position 189, longueur 1 caractère)
    const paiement = recordBuffer.subarray(189, 190).toString('utf-8').trim();
    
    // Vérifier si la facture n'est pas réglée (PAIEMENT = 'T')
    if (paiement === 'T') {
      validRecords++;
      
      // Extraire le champ MONTTC (position 53, longueur 10 caractères)
      const monttcStr = recordBuffer.subarray(53, 63).toString('utf-8').trim();
      const monttc = parseFloat(monttcStr.replace(',', '.'));
      
      if (isNaN(monttc)) {
        invalidRecords++;
        if (invalidRecords <= 10) {
          console.log(`Montant invalide: "${monttcStr}"`);
        }
      } else if (monttc === 0) {
        zeroRecords++;
      } else {
        totalExpected += monttc;
        if (monttc > 100000) {
          largeAmounts++;
          if (largeAmounts <= 5) {
            console.log(`Grand montant: ${monttc.toFixed(2)} DA`);
          }
        }
      }
    }
  }
}

// Calculer le total extrapolé
const ratio = header.numberOfRecords / sampleSize;
const extrapolatedTotal = totalExpected * ratio;

console.log('\\n=== RÉSULTATS DE L\'ANALYSE ===');
console.log(`Échantillon analysé: ${sampleSize} enregistrements`);
console.log(`Factures non payées (PAIEMENT='T'): ${validRecords}`);
console.log(`Montants invalides: ${invalidRecords}`);
console.log(`Montants à zéro: ${zeroRecords}`);
console.log(`Grands montants (>100000): ${largeAmounts}`);
console.log(`Total attendu (échantillon): ${totalExpected.toFixed(2)} DA`);
console.log(`Total extrapolé: ${extrapolatedTotal.toFixed(2)} DA`);
console.log('');
console.log(`Résultat attendu: 129 379 693,97 DA`);
console.log(`Différence: ${(129379693.97 - extrapolatedTotal).toFixed(2)} DA`);