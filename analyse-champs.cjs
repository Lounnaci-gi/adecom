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

// Analyser la structure des champs
console.log('\\nAnalyse de la structure des champs:');

// Lire quelques enregistrements pour identifier les positions exactes
const nbRecordsToAnalyze = Math.min(5, header.numberOfRecords);

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
  
  // Afficher le champ PAIEMENT (position 189)
  const paiement = recordStr.substring(189, 190);
  console.log(`PAIEMENT (pos 189): "${paiement}"`);
  
  // Rechercher les montants dans différentes plages
  console.log('Recherche des montants:');
  
  // Plage autour de la position 100-150 (comme dans le code initial)
  for (let pos = 90; pos < 160; pos += 10) {
    const montantStr = recordStr.substring(pos, pos + 10).trim();
    if (montantStr && !isNaN(parseFloat(montantStr.replace(',', '.')))) {
      console.log(`  Position ${pos}-${pos + 10}: "${montantStr}"`);
    }
  }
  
  // Plage autour de la position 200-250
  for (let pos = 200; pos < 250; pos += 10) {
    const montantStr = recordStr.substring(pos, pos + 10).trim();
    if (montantStr && !isNaN(parseFloat(montantStr.replace(',', '.')))) {
      console.log(`  Position ${pos}-${pos + 10}: "${montantStr}"`);
    }
  }
  
  // Plage autour de la position 250-300
  for (let pos = 250; pos < 300; pos += 10) {
    const montantStr = recordStr.substring(pos, pos + 10).trim();
    if (montantStr && !isNaN(parseFloat(montantStr.replace(',', '.')))) {
      console.log(`  Position ${pos}-${pos + 10}: "${montantStr}"`);
    }
  }
}