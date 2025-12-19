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

// Tester les positions candidates pour MONTTC
const monttcPositions = [53, 97, 108, 153, 174, 179];

console.log('\\nTest des positions candidates pour MONTTC:');

let totalCreances = 0;
let facturesAnalysées = 0;
let facturesNonPayées = 0;

// Parcourir un échantillon représentatif d'enregistrements
const sampleSize = Math.min(1000, header.numberOfRecords);

for (let i = 0; i < sampleSize; i++) {
  const recordOffset = header.headerLength + (i * header.recordLength);
  const recordBuffer = Buffer.alloc(header.recordLength);
  const fd = fs.openSync(filePath, 'r');
  fs.readSync(fd, recordBuffer, 0, header.recordLength, recordOffset);
  fs.closeSync(fd);
  
  // Vérifier si l'enregistrement est supprimé
  const isDeleted = recordBuffer.readUInt8(0) === 0x2A;
  if (isDeleted) {
    continue;
  }
  
  facturesAnalysées++;
  
  // Convertir en chaîne pour analyse
  const recordStr = recordBuffer.toString('utf-8');
  
  // Extraire le champ PAIEMENT (position 189)
  const paiement = recordStr.substring(189, 190);
  
  // Si PAIEMENT = 'T' (facture non payée), analyser le montant
  if (paiement === 'T') {
    facturesNonPayées++;
    
    // Tester chaque position candidate pour MONTTC
    for (const pos of monttcPositions) {
      const montantStr = recordStr.substring(pos, pos + 10).trim();
      const montant = parseFloat(montantStr.replace(',', '.'));
      
      if (!isNaN(montant) && montant > 0 && montant < 1000000) {
        console.log(`Enregistrement ${i}: PAIEMENT=${paiement}, Pos ${pos}="${montantStr}" = ${montant.toFixed(2)}`);
        totalCreances += montant;
        break; // Prendre le premier montant valide trouvé
      }
    }
  }
  
  // Limiter le nombre de lignes affichées
  if (facturesNonPayées >= 20) {
    break;
  }
}

console.log(`\\nRésultats:`);
console.log(`Factures analysées: ${facturesAnalysées}`);
console.log(`Factures non payées (PAIEMENT='T'): ${facturesNonPayées}`);
console.log(`Total des créances: ${totalCreances.toFixed(2)} DA`);