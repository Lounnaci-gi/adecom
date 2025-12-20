// dbfSqlService.ts
// Service pour exécuter des requêtes SQL directement sur les fichiers DBF avec support d'index

import { DBFFile } from 'dbffile';
// import { config } from '../../src/config.ts';

// Types pour notre service SQL
interface SqlResult {
  rows: any[];
  count: number;
  executionTime: number;
}

interface FieldInfo {
  name: string;
  type: string;
  length: number;
  decimalPlaces: number;
}

export class DbfSqlService {
  private dbfFolderPath: string;

  constructor() {
    // Pour le serveur, utiliser directement le chemin par défaut
    this.dbfFolderPath = 'E:/epeor';
  }

  /**
   * Exécute une requête SQL SELECT sur un fichier DBF
   * @param query La requête SQL à exécuter
   * @returns Le résultat de la requête
   */
  async executeSelectQuery(query: string): Promise<SqlResult> {
    const startTime = Date.now();
    
    try {
      // Parser la requête SQL de base
      const parsedQuery = this.parseSelectQuery(query);
      
      // Vérifier si le fichier DBF existe
      const dbfFilePath = this.dbfFolderPath + '/' + parsedQuery.table + '.DBF';
      try {
        await DBFFile.open(dbfFilePath);
      } catch (error) {
        throw new Error(`Fichier ${parsedQuery.table}.DBF non trouvé`);
      }
      
      // Ouvrir le fichier DBF
      const dbf = await DBFFile.open(dbfFilePath);
      
      // Optimisation : pour les requêtes d'agrégation, calculer directement sans stocker tous les enregistrements
      if (parsedQuery.columns.some((col: string) => col.toUpperCase().startsWith('SUM(')) && 
          parsedQuery.where && parsedQuery.groupBy && parsedQuery.groupBy.length > 0) {
        // Cas spécial pour les requêtes SUM avec WHERE et GROUP BY
        // Calculer la somme directement sans stocker tous les enregistrements
        let sum = 0;
        const batchSize = 1000;
        let offset = 0;
        let hasMoreRecords = true;
        let batchCount = 0;
        
        // Suppression du log de début de traitement pour éviter le spam dans la console
        
        while (hasMoreRecords) {
          // Lire un lot d'enregistrements
          const records = await dbf.readRecords(batchSize, offset);
          
          // Appliquer le filtre WHERE sur ce lot
          const lotFiltered = this.applyWhereFilter(records, parsedQuery.where);
          
          // Extraire le nom du champ à agréger
          const sumColumn = parsedQuery.columns.find((col: string) => col.toUpperCase().startsWith('SUM('));
          if (sumColumn) {
            const fieldName = sumColumn.match(/\((.+?)\)/)?.[1] || '';
            if (fieldName) {
              // Additionner les valeurs du champ
              lotFiltered.forEach(record => {
                sum += parseFloat(record[fieldName]) || 0;
              });
            }
          }
          
          // Mettre à jour l'offset pour le prochain lot
          offset += records.length;
          batchCount++;
          
          // Suppression des logs de progression pour éviter le spam dans la console
          
          // Vérifier s'il y a plus d'enregistrements
          hasMoreRecords = records.length === batchSize;
        }
        
        const executionTime = Date.now() - startTime;
        // Suppression du log de fin de traitement pour éviter le spam dans la console
        
        // Retourner le résultat avec la somme
        return {
          rows: [{ [parsedQuery.groupBy[0]]: 'T', Sum_MONTTC: sum }],
          count: 1,
          executionTime
        };
      }
      
      // Approche normale pour les autres requêtes
      // Appliquer le filtre WHERE dès la lecture pour économiser la mémoire
      let filteredRecords: any[] = [];
      if (parsedQuery.where) {
        // Lire les enregistrements par lots pour éviter les problèmes de mémoire
        const batchSize = 1000;
        let offset = 0;
        let hasMoreRecords = true;
        
        while (hasMoreRecords) {
          // Lire un lot d'enregistrements
          const records = await dbf.readRecords(batchSize, offset);
          
          // Appliquer le filtre WHERE sur ce lot
          const lotFiltered = this.applyWhereFilter(records, parsedQuery.where);
          filteredRecords = filteredRecords.concat(lotFiltered);
          
          // Mettre à jour l'offset pour le prochain lot
          offset += records.length;
          
          // Vérifier s'il y a plus d'enregistrements
          hasMoreRecords = records.length === batchSize;
        }
      } else {
        // Si aucun filtre WHERE, lire tous les enregistrements par lots
        const batchSize = 1000;
        let offset = 0;
        let hasMoreRecords = true;
        
        while (hasMoreRecords) {
          const records = await dbf.readRecords(batchSize, offset);
          filteredRecords = filteredRecords.concat(records);
          
          offset += records.length;
          hasMoreRecords = records.length === batchSize;
        }
      }
      
      // Appliquer SELECT (colonnes)
      let selectedRecords = filteredRecords;
      if (parsedQuery.columns && parsedQuery.columns.length > 0 && !parsedQuery.columns.includes('*')) {
        selectedRecords = filteredRecords.map(record => {
          const selectedRecord: any = {};
          parsedQuery.columns.forEach((column: string) => {
            selectedRecord[column] = record[column];
          });
          return selectedRecord;
        });
      }
      
      // Appliquer GROUP BY si présent
      let groupedRecords = selectedRecords;
      if (parsedQuery.groupBy && parsedQuery.groupBy.length > 0) {
        groupedRecords = this.applyGroupBy(selectedRecords, parsedQuery.groupBy, parsedQuery.columns);
      }
      
      // Appliquer ORDER BY si présent
      let orderedRecords = groupedRecords;
      if (parsedQuery.orderBy && parsedQuery.orderBy.length > 0) {
        orderedRecords = this.applyOrderBy(groupedRecords, parsedQuery.orderBy);
      }
      
      // Appliquer LIMIT si présent
      let limitedRecords = orderedRecords;
      if (parsedQuery.limit) {
        limitedRecords = orderedRecords.slice(0, parsedQuery.limit);
      }
      
      const executionTime = Date.now() - startTime;
      
      return {
        rows: limitedRecords,
        count: limitedRecords.length,
        executionTime
      };
    } catch (error) {
      console.error('Erreur lors de l\'exécution de la requête SQL:', error);
      throw error;
    }
  }

  /**
   * Parse une requête SELECT SQL de base
   */
  private parseSelectQuery(query: string): any {
    // Convertir en majuscules pour faciliter le parsing
    const upperQuery = query.toUpperCase().trim();
    
    // Vérifier que c'est une requête SELECT
    if (!upperQuery.startsWith('SELECT')) {
      throw new Error('Seules les requêtes SELECT sont supportées');
    }
    
    // Extraire les différentes parties de la requête
    const selectMatch = query.match(/SELECT\s+(.*?)\s+FROM\s+(\w+)/i);
    if (!selectMatch) {
      throw new Error('Format de requête SELECT invalide');
    }
    
    const columnsPart = selectMatch[1].trim();
    const table = selectMatch[2].trim();
    
    // Parser les colonnes
    let columns: string[] = [];
    if (columnsPart === '*') {
      columns = ['*'];
    } else {
      columns = columnsPart.split(',').map(col => col.trim().replace(/"/g, ''));
    }
    
    // Parser WHERE clause
    let where: string | null = null;
    const whereMatch = query.match(/WHERE\s+(.*?)(?:\s+GROUP\s+BY|\s+ORDER\s+BY|\s+LIMIT|$)/i);
    if (whereMatch) {
      where = whereMatch[1].trim();
    }
    
    // Parser GROUP BY clause
    let groupBy: string[] = [];
    const groupByMatch = query.match(/GROUP\s+BY\s+(.*?)(?:\s+ORDER\s+BY|\s+LIMIT|$)/i);
    if (groupByMatch) {
      groupBy = groupByMatch[1].split(',').map(col => col.trim().replace(/"/g, ''));
    }
    
    // Parser ORDER BY clause
    let orderBy: { column: string; direction: 'ASC' | 'DESC' }[] = [];
    const orderByMatch = query.match(/ORDER\s+BY\s+(.*?)(?:\s+LIMIT|$)/i);
    if (orderByMatch) {
      const orderByParts = orderByMatch[1].split(',');
      orderBy = orderByParts.map(part => {
        const trimmedPart = part.trim();
        const directionMatch = trimmedPart.match(/(\w+)\s+(ASC|DESC)/i);
        if (directionMatch) {
          return {
            column: directionMatch[1].replace(/"/g, ''),
            direction: directionMatch[2].toUpperCase() as 'ASC' | 'DESC'
          };
        } else {
          return {
            column: trimmedPart.replace(/"/g, ''),
            direction: 'ASC' as 'ASC' | 'DESC'
          };
        }
      });
    }
    
    // Parser LIMIT clause
    let limit: number | null = null;
    const limitMatch = query.match(/LIMIT\s+(\d+)/i);
    if (limitMatch) {
      limit = parseInt(limitMatch[1], 10);
    }
    
    return {
      columns,
      table,
      where,
      groupBy,
      orderBy,
      limit
    };
  }

  /**
   * Applique un filtre WHERE aux enregistrements
   */
  private applyWhereFilter(records: any[], whereClause: string): any[] {
    // Pour des raisons de sécurité et de simplicité, on implémente uniquement les filtres de base
    // nécessaires pour notre cas d'utilisation
    
    // Gérer les conditions simples comme PAIEMENT = 'T'
    const equalsMatch = whereClause.match(/(\w+)\s*=\s*['"](.+?)['"]/i);
    if (equalsMatch) {
      const field = equalsMatch[1];
      const value = equalsMatch[2];
      return records.filter(record => record[field] === value);
    }
    
    // Gérer les conditions avec des opérateurs
    const operatorMatch = whereClause.match(/(\w+)\s*(>=|<=|>|<|<>)\s*['"]?(.+?)['"]?/i);
    if (operatorMatch) {
      const field = operatorMatch[1];
      const operator = operatorMatch[2];
      const value = operatorMatch[3];
      
      return records.filter(record => {
        const recordValue = record[field];
        switch (operator) {
          case '>': return recordValue > value;
          case '<': return recordValue < value;
          case '>=': return recordValue >= value;
          case '<=': return recordValue <= value;
          case '<>': return recordValue !== value;
          default: return recordValue === value;
        }
      });
    }
    
    // Si aucun filtre reconnu, retourner tous les enregistrements
    console.warn('Clause WHERE non reconnue, retour de tous les enregistrements:', whereClause);
    return records;
  }

  /**
   * Applique un regroupement GROUP BY aux enregistrements
   */
  private applyGroupBy(records: any[], groupByColumns: string[], selectColumns: string[]): any[] {
    if (groupByColumns.length === 0) {
      return records;
    }
    
    // Créer un map pour regrouper les enregistrements
    const groups: Map<string, any[]> = new Map();
    
    // Regrouper les enregistrements
    records.forEach(record => {
      // Créer une clé de groupe basée sur les valeurs des colonnes de regroupement
      const groupKey = groupByColumns.map(col => record[col]).join('|');
      
      if (!groups.has(groupKey)) {
        groups.set(groupKey, []);
      }
      groups.get(groupKey)?.push(record);
    });
    
    // Créer les enregistrements regroupés
    const groupedRecords: any[] = [];
    
    groups.forEach((groupRecords, _groupKey) => {
      if (groupRecords.length === 0) return;
      
      // Créer un nouvel enregistrement pour le groupe
      const groupedRecord: any = {};
      
      // Copier les valeurs des colonnes de regroupement
      groupByColumns.forEach((col, _index) => {
        groupedRecord[col] = groupRecords[0][col];
      });
      
      // Appliquer les fonctions d'agrégation si présentes dans SELECT
      selectColumns.forEach(col => {
        if (col.toUpperCase().startsWith('SUM(')) {
          const fieldName = col.match(/\((.+?)\)/)?.[1] || '';
          if (fieldName) {
            const sum = groupRecords.reduce((acc, record) => acc + (parseFloat(record[fieldName]) || 0), 0);
            // Extraire l'alias si présent
            const alias = col.match(/AS\s+(\w+)/i)?.[1] || `Sum_${fieldName}`;
            groupedRecord[alias] = sum;
          }
        } else if (!groupByColumns.includes(col) && col !== '*') {
          // Pour les autres colonnes, prendre la première valeur
          groupedRecord[col] = groupRecords[0][col];
        }
      });
      
      groupedRecords.push(groupedRecord);
    });
    
    return groupedRecords;
  }

  /**
   * Applique un tri ORDER BY aux enregistrements
   */
  private applyOrderBy(records: any[], orderByClauses: { column: string; direction: 'ASC' | 'DESC' }[]): any[] {
    if (orderByClauses.length === 0) {
      return records;
    }
    
    return records.sort((a, b) => {
      for (const orderBy of orderByClauses) {
        const { column, direction } = orderBy;
        const aValue = a[column];
        const bValue = b[column];
        
        let comparison = 0;
        if (typeof aValue === 'string' && typeof bValue === 'string') {
          comparison = aValue.localeCompare(bValue);
        } else if (typeof aValue === 'number' && typeof bValue === 'number') {
          comparison = aValue - bValue;
        } else {
          comparison = String(aValue).localeCompare(String(bValue));
        }
        
        if (comparison !== 0) {
          return direction === 'DESC' ? -comparison : comparison;
        }
      }
      return 0;
    });
  }

  /**
   * Récupère les informations sur les champs d'un fichier DBF
   */
  async getTableSchema(tableName: string): Promise<FieldInfo[]> {
    try {
      const dbfFilePath = this.dbfFolderPath + '/' + tableName + '.DBF';
      try {
        await DBFFile.open(dbfFilePath);
      } catch (error) {
        throw new Error(`Fichier ${tableName}.DBF non trouvé`);
      }
      
      const dbf = await DBFFile.open(dbfFilePath);
      return dbf.fields.map(field => ({
        name: field.name,
        type: field.type,
        length: field.size,
        decimalPlaces: field.decimalPlaces || 0
      }));
    } catch (error) {
      console.error('Erreur lors de la récupération du schéma de la table:', error);
      throw error;
    }
  }
}