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

// Analyser la structure des champs en détail
console.log('\\nAnalyse détaillée de la structure des champs:');

// Lire plusieurs enregistrements pour identifier les positions exactes
const nbRecordsToAnalyze = Math.min(20, header.numberOfRecords);

let paiementPositions = {};
let monttcPositions = {};

for (let i = 0; i < nbRecordsToAnalyze; i++) {
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
  
  // Rechercher le champ PAIEMENT
  for (let pos = 0; pos < recordStr.length; pos++) {
    const char = recordStr[pos];
    if (char === 'C' || char === 'T') {
      if (!paiementPositions[pos]) {
        paiementPositions[pos] = { C: 0, T: 0 };
      }
      paiementPositions[pos][char]++;
    }
  }
  
  // Rechercher des montants décimaux (xxxx.xx)
  const decimalPattern = /[0-9]{1,8}\.[0-9]{2}/g;
  let match;
  while ((match = decimalPattern.exec(recordStr)) !== null) {
    const pos = match.index;
    if (!monttcPositions[pos]) {
      monttcPositions[pos] = 0;
    }
    monttcPositions[pos]++;
  }
}

// Afficher les positions les plus probables pour PAIEMENT
console.log('\\nPositions candidates pour le champ PAIEMENT:');
Object.keys(paiementPositions)
  .filter(pos => paiementPositions[pos].C > 0 || paiementPositions[pos].T > 0)
  .sort((a, b) => (paiementPositions[b].C + paiementPositions[b].T) - (paiementPositions[a].C + paiementPositions[a].T))
  .slice(0, 10)
  .forEach(pos => {
    const data = paiementPositions[pos];
    console.log(`  Position ${pos}: C=${data.C}, T=${data.T}`);
  });

// Afficher les positions les plus probables pour MONTTC
console.log('\\nPositions candidates pour le champ MONTTC:');
Object.keys(monttcPositions)
  .filter(pos => monttcPositions[pos] > 2) // Au moins 3 occurrences
  .sort((a, b) => monttcPositions[b] - monttcPositions[a])
  .slice(0, 10)
  .forEach(pos => {
    console.log(`  Position ${pos}: ${monttcPositions[pos]} occurrences`);
  });

// Analyser un enregistrement spécifique en détail
console.log('\\nAnalyse détaillée d\'un enregistrement:');
const recordOffset = header.headerLength;
const recordBuffer = Buffer.alloc(header.recordLength);
const fd2 = fs.openSync(filePath, 'r');
fs.readSync(fd2, recordBuffer, 0, header.recordLength, recordOffset);
fs.closeSync(fd2);

const recordStr = recordBuffer.toString('utf-8');

console.log('Affichage des caractères de l\'enregistrement (positions 0-200):');
for (let i = 0; i < Math.min(200, recordStr.length); i++) {
  const char = recordStr[i];
  if (char.charCodeAt(0) >= 32 && char.charCodeAt(0) <= 126) { // Caractères imprimables
    process.stdout.write(`${i}:${char} `);
  } else if (char === ' ') {
    process.stdout.write(`${i}:SP `);
  }
  // Retour à la ligne tous les 20 caractères
  if (i % 20 === 19) {
    process.stdout.write('\\n');
  }
}
process.stdout.write('\\n');