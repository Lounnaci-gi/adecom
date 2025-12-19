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

// Lire le premier enregistrement pour analyser la structure
if (header.numberOfRecords > 0) {
  const recordOffset = header.headerLength;
  const recordBuffer = Buffer.alloc(header.recordLength);
  const fd = fs.openSync(filePath, 'r');
  fs.readSync(fd, recordBuffer, 0, header.recordLength, recordOffset);
  fs.closeSync(fd);
  
  console.log('\\nPremier enregistrement (hex):');
  console.log(recordBuffer.toString('hex'));
  
  console.log('\\nPremier enregistrement (utf-8):');
  console.log(recordBuffer.toString('utf-8'));
  
  // Rechercher les champs PAIEMENT et MONTTC
  const recordStr = recordBuffer.toString('utf-8');
  console.log('\\nRecherche des champs:');
  
  // Afficher les positions des caractères pour identifier les champs
  for (let i = 0; i < Math.min(recordStr.length, 150); i++) {
    if (recordStr[i] !== '\\x00' && recordStr[i] !== '\\x01' && recordStr[i] !== '\\x02' && recordStr[i] !== '\\x03') {
      console.log(`Position ${i}: "${recordStr[i]}" (${recordStr.charCodeAt(i)})`);
    }
  }
}