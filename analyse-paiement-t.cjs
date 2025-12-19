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

// Rechercher des enregistrements avec PAIEMENT = 'T'
console.log('\\nRecherche d\'enregistrements avec PAIEMENT = \'T\':');

let foundRecords = 0;
let totalCreances = 0;

// Parcourir plusieurs enregistrements pour trouver ceux avec PAIEMENT = 'T'
for (let i = 0; i < Math.min(1000, header.numberOfRecords) && foundRecords < 10; i++) {
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
  
  // Convertir en chaîne pour analyse
  const recordStr = recordBuffer.toString('utf-8');
  
  // Extraire le champ PAIEMENT (position 189)
  const paiement = recordStr.substring(189, 190);
  
  // Si PAIEMENT = 'T', analyser cet enregistrement
  if (paiement === 'T') {
    foundRecords++;
    console.log(`\\n--- Enregistrement ${i} (PAIEMENT = T) ---`);
    console.log(`PAIEMENT (pos 189): "${paiement}"`);
    
    // Rechercher le champ MONTTC
    console.log('Recherche du champ MONTTC:');
    
    // Parcourir différentes positions pour trouver le montant
    for (let pos = 90; pos < 300; pos += 10) {
      const montantStr = recordStr.substring(pos, pos + 10).trim();
      if (montantStr && !isNaN(parseFloat(montantStr.replace(',', '.'))) && 
          parseFloat(montantStr.replace(',', '.')) > 0) {
        const montant = parseFloat(montantStr.replace(',', '.'));
        console.log(`  Position ${pos}-${pos + 10}: "${montantStr}" = ${montant}`);
        
        // Si c'est un montant raisonnable (> 0 et < 100000), le considérer comme MONTTC
        if (montant > 0 && montant < 100000) {
          totalCreances += montant;
        }
      }
    }
  }
}

console.log(`\\nTotal des créances trouvées: ${totalCreances.toFixed(2)}`);