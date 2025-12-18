// check-file.cjs
const fs = require('fs');
const path = require('path');

const filePath = path.join('D:', 'epeor', 'TABCODE.DBF');

// Vérifier si le fichier existe
if (fs.existsSync(filePath)) {
  console.log('Fichier trouvé:', filePath);
  
  // Obtenir les statistiques du fichier
  const stats = fs.statSync(filePath);
  console.log('Taille du fichier:', stats.size, 'octets');
  
  // Lire les premiers octets du fichier
  const buffer = Buffer.alloc(32);
  const fd = fs.openSync(filePath, 'r');
  fs.readSync(fd, buffer, 0, 32, 0);
  fs.closeSync(fd);
  
  console.log('Premiers 32 octets (hex):', buffer.toString('hex'));
  console.log('Premiers 32 octets (ASCII):', buffer.toString('ascii'));
} else {
  console.log('Fichier non trouvé:', filePath);
}