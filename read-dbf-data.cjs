// read-dbf-data.cjs
const fs = require('fs');

function readDBFRecord(buffer, offset, recordLength) {
  // Le premier octet indique si l'enregistrement est supprimé (0x2A = *)
  const isDeleted = buffer.readUInt8(offset) === 0x2A;
  
  if (isDeleted) {
    return null; // Enregistrement supprimé
  }
  
  // Extraire les données de l'enregistrement
  const recordData = {};
  let fieldOffset = offset + 1; // +1 pour ignorer l'indicateur de suppression
  
  // Selon l'analyse précédente, les champs sont :
  // 1. CODE_AFFEC (4 caractères)
  // 2. LIBELLEEC (20 caractères)
  // 3. UNITEEEC (2 caractères)
  // 4. MONTEEC (10 caractères)
  // 5. NBREXEEC (1 caractère)
  // 6. CHAMPS1EC (15 caractères)
  // 7. CHAMPS2EC (15 caractères)
  
  recordData.CODE_AFFEC = buffer.subarray(fieldOffset, fieldOffset + 4).toString('utf-8').trim();
  fieldOffset += 4;
  
  recordData.LIBELLEEC = buffer.subarray(fieldOffset, fieldOffset + 20).toString('utf-8').trim();
  fieldOffset += 20;
  
  recordData.UNITEEEC = buffer.subarray(fieldOffset, fieldOffset + 2).toString('utf-8').trim();
  fieldOffset += 2;
  
  recordData.MONTEEC = buffer.subarray(fieldOffset, fieldOffset + 10).toString('utf-8').trim();
  fieldOffset += 10;
  
  recordData.NBREXEEC = buffer.subarray(fieldOffset, fieldOffset + 1).toString('utf-8').trim();
  fieldOffset += 1;
  
  recordData.CHAMPS1EC = buffer.subarray(fieldOffset, fieldOffset + 15).toString('utf-8').trim();
  fieldOffset += 15;
  
  recordData.CHAMPS2EC = buffer.subarray(fieldOffset, fieldOffset + 15).toString('utf-8').trim();
  
  return recordData;
}

async function readDBFData() {
  try {
    const filePath = 'D:/epeor/TABCODE.DBF';
    console.log(`Lecture des données du fichier: ${filePath}`);
    
    // Obtenir la taille du fichier
    const stats = fs.statSync(filePath);
    console.log(`Taille du fichier: ${stats.size} octets`);
    
    // Lire tout le fichier
    const buffer = fs.readFileSync(filePath);
    
    // Analyser l'en-tête pour obtenir les informations
    const header = {
      numberOfRecords: buffer.readUInt32LE(4),
      headerLength: buffer.readUInt16LE(8),
      recordLength: buffer.readUInt16LE(10)
    };
    
    console.log(`Nombre d'enregistrements: ${header.numberOfRecords}`);
    console.log(`Longueur de l'en-tête: ${header.headerLength}`);
    console.log(`Longueur d'un enregistrement: ${header.recordLength}`);
    
    // Lire tous les enregistrements
    let centresCount = 0;
    let exemplesCentres = [];
    let allCentres = [];
    
    console.log('\nLecture de tous les enregistrements...');
    for (let i = 0; i < header.numberOfRecords; i++) {
      const recordOffset = header.headerLength + (i * header.recordLength);
      
      // Vérifier que nous ne dépassons pas la fin du fichier
      if (recordOffset + header.recordLength > buffer.length) {
        console.log(`Arrêt à l'enregistrement ${i} (fin du fichier atteinte)`);
        break;
      }
      
      const record = readDBFRecord(buffer, recordOffset, header.recordLength);
      
      if (record && record.CODE_AFFEC) {
        // Vérifier si c'est un centre (code commençant par 'S')
        if (record.CODE_AFFEC.startsWith('S')) {
          centresCount++;
          allCentres.push({
            code: record.CODE_AFFEC,
            libelle: record.LIBELLEEC
          });
          
          // Stocker quelques exemples pour l'affichage
          if (exemplesCentres.length < 10) {
            exemplesCentres.push({
              code: record.CODE_AFFEC,
              libelle: record.LIBELLEEC
            });
          }
        }
      }
    }
    
    console.log(`\n--- Résultats finaux ---`);
    console.log(`Total enregistrements analysés: ${header.numberOfRecords}`);
    console.log(`Centres trouvés: ${centresCount}`);
    
    if (exemplesCentres.length > 0) {
      console.log('Exemples de centres:');
      exemplesCentres.forEach((centre, index) => {
        console.log(`  ${index + 1}. ${centre.code} - ${centre.libelle}`);
      });
    }
    
    // Sauvegarder la liste complète des centres dans un fichier
    if (allCentres.length > 0) {
      fs.writeFileSync('centres-list.json', JSON.stringify(allCentres, null, 2));
      console.log(`\nListe complète des centres sauvegardée dans centres-list.json (${allCentres.length} centres)`);
    }
    
  } catch (error) {
    console.error('Erreur lors de la lecture des données DBF:', error);
  }
}

// Exécuter la lecture
readDBFData();