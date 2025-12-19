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

// Analyser un enregistrement en détail pour trouver MONTTC
console.log('\\nAnalyse détaillée pour trouver MONTTC:');

// Lire un enregistrement
const recordOffset = header.headerLength;
const recordBuffer = Buffer.alloc(header.recordLength);
const fd2 = fs.openSync(filePath, 'r');
fs.readSync(fd2, recordBuffer, 0, header.recordLength, recordOffset);
fs.closeSync(fd2);

// Convertir en chaîne pour analyse
const recordStr = recordBuffer.toString('utf-8');

// Afficher les positions avec des montants significatifs
console.log('\\nPositions avec montants significatifs:');
for (let pos = 0; pos < Math.min(recordStr.length, 300); pos += 5) {
  const chunk = recordStr.substring(pos, pos + 15).trim();
  // Vérifier si le chunk contient un motif de montant
  if (chunk.match(/[0-9]{3,8}[,.][0-9]{2}/)) {
    console.log(`Position ${pos}-${pos + 15}: "${chunk}"`);
  }
}

// Tester différentes positions pour MONTTC
console.log('\\nTest des positions potentielles pour MONTTC:');
const potentialPositions = [25, 31, 34, 41, 44, 51, 54, 61, 64, 71, 74, 81, 84, 91, 94, 101, 104, 153, 156, 201, 204];

potentialPositions.forEach(pos => {
  const chunk = recordStr.substring(pos, pos + 10).trim();
  if (chunk.match(/[0-9]{3,8}[,.][0-9]{2}/)) {
    const amount = parseFloat(chunk.replace(',', '.'));
    if (!isNaN(amount) && amount > 0) {
      console.log(`Position ${pos}-${pos + 10}: "${chunk}" = ${amount.toFixed(2)} DA`);
    }
  }
});