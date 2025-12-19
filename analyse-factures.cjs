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

// Lire quelques enregistrements pour analyser la structure
const nbRecordsToAnalyze = Math.min(10, header.numberOfRecords);
console.log(`\\nAnalyse des ${nbRecordsToAnalyze} premiers enregistrements:`);

for (let i = 0; i < nbRecordsToAnalyze; i++) {
  const recordOffset = header.headerLength + (i * header.recordLength);
  const recordBuffer = Buffer.alloc(header.recordLength);
  const fd = fs.openSync(filePath, 'r');
  fs.readSync(fd, recordBuffer, 0, header.recordLength, recordOffset);
  fs.closeSync(fd);
  
  // Vérifier si l'enregistrement est supprimé
  const isDeleted = recordBuffer.readUInt8(0) === 0x2A;
  if (isDeleted) {
    console.log(`Enregistrement ${i} : SUPPRIME`);
    continue;
  }
  
  // Convertir en chaîne pour analyse
  const recordStr = recordBuffer.toString('utf-8');
  
  console.log(`\\n--- Enregistrement ${i} ---`);
  
  // Afficher les positions des caractères pour identifier les champs
  let lastPrintPos = 0;
  for (let pos = 0; pos < Math.min(recordStr.length, 200); pos++) {
    const char = recordStr[pos];
    // Afficher les caractères imprimables et certains caractères spéciaux
    if (char !== '\\x00' && char.charCodeAt(0) >= 32) {
      if (pos - lastPrintPos > 10 || lastPrintPos === 0) {
        console.log(`Position ${pos}: "${char}" (${char.charCodeAt(0)})`);
        lastPrintPos = pos;
      }
    }
  }
  
  // Chercher des valeurs numériques significatives (montants)
  const numericPattern = /[0-9]+\\.[0-9]{2}/g;
  let match;
  while ((match = numericPattern.exec(recordStr)) !== null) {
    console.log(`Montant trouvé à la position ${match.index}: ${match[0]}`);
  }
  
  // Chercher des valeurs 'T' ou 'F' qui pourraient être le champ PAIEMENT
  const tfPattern = /[TF]/g;
  while ((match = tfPattern.exec(recordStr)) !== null) {
    console.log(`Valeur T/F trouvée à la position ${match.index}: ${match[0]}`);
  }
}