// analyze-dbf.cjs
const fs = require('fs');

function analyzeDBFHeader(buffer) {
  // Analyser l'en-tête DBF
  const header = {
    version: buffer.readUInt8(0),
    year: buffer.readUInt8(1),
    month: buffer.readUInt8(2),
    day: buffer.readUInt8(3),
    numberOfRecords: buffer.readUInt32LE(4),
    headerLength: buffer.readUInt16LE(8),
    recordLength: buffer.readUInt16LE(10)
  };
  
  console.log('En-tête DBF:');
  console.log('- Version:', header.version);
  console.log('- Date:', `${header.year + 1900}-${header.month}-${header.day}`);
  console.log('- Nombre d\'enregistrements:', header.numberOfRecords);
  console.log('- Longueur de l\'en-tête:', header.headerLength);
  console.log('- Longueur d\'un enregistrement:', header.recordLength);
  
  return header;
}

function analyzeDBFFields(buffer, headerLength) {
  console.log('\nAnalyse des champs:');
  let offset = 32; // Début des définitions de champs
  let fieldIndex = 0;
  
  while (offset < headerLength - 1) {
    const fieldName = buffer.subarray(offset, offset + 11).toString('utf-8').replace(/\0/g, '');
    const fieldType = String.fromCharCode(buffer.readUInt8(offset + 11));
    const fieldLength = buffer.readUInt8(offset + 16);
    const fieldDecimals = buffer.readUInt8(offset + 17);
    
    console.log(`Champ ${fieldIndex + 1}:`);
    console.log(`  Nom: ${fieldName}`);
    console.log(`  Type: ${fieldType}`);
    console.log(`  Longueur: ${fieldLength}`);
    console.log(`  Décimales: ${fieldDecimals}`);
    
    fieldIndex++;
    offset += 32;
    
    // Arrêter si on atteint le délimiteur de fin d'en-tête
    if (buffer.readUInt8(offset) === 0x0D) {
      break;
    }
  }
}

async function analyzeDBF() {
  try {
    const filePath = 'D:/epeor/TABCODE.DBF';
    console.log(`Analyse du fichier: ${filePath}`);
    
    // Lire les 512 premiers octets pour l'analyse
    const buffer = Buffer.alloc(512);
    const fd = fs.openSync(filePath, 'r');
    fs.readSync(fd, buffer, 0, 512, 0);
    fs.closeSync(fd);
    
    // Analyser l'en-tête
    const header = analyzeDBFHeader(buffer);
    
    // Analyser les champs
    analyzeDBFFields(buffer, header.headerLength);
    
    // Calculer la taille attendue du fichier
    const expectedFileSize = header.headerLength + (header.numberOfRecords * header.recordLength) + 1; // +1 pour le caractère de fin
    console.log(`\nTaille attendue du fichier: ${expectedFileSize} octets`);
    
    // Obtenir la taille réelle du fichier
    const stats = fs.statSync(filePath);
    console.log(`Taille réelle du fichier: ${stats.size} octets`);
    
    if (expectedFileSize === stats.size) {
      console.log('✓ La taille du fichier correspond aux attentes');
    } else {
      console.log('✗ La taille du fichier ne correspond pas aux attentes');
    }
    
  } catch (error) {
    console.error('Erreur lors de l\'analyse du fichier DBF:', error);
  }
}

// Exécuter l'analyse
analyzeDBF();