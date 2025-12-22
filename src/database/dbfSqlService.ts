// dbfSqlService.ts
import { DBFFile } from 'dbffile';

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
    this.dbfFolderPath = process.env.DBF_FOLDER_PATH || process.env.VITE_DBF_FOLDER_PATH || './data/dbf';
  }

  /**
   * Exécute une requête SQL SELECT sur un fichier DBF
   * @param query La requête SQL à exécuter
   * @returns Le résultat de la requête
   */
  async executeSelectQuery(query: string): Promise<SqlResult> {
    const startTime = Date.now();
    
    try {
      const parsedQuery = this.parseSelectQuery(query);
      
      const dbfFilePath = this.dbfFolderPath + '/' + parsedQuery.table + '.DBF';
      try {
        await DBFFile.open(dbfFilePath);
      } catch (error) {
        throw new Error(`Fichier ${parsedQuery.table}.DBF non trouvé`);
      }
      
      const dbf = await DBFFile.open(dbfFilePath);
      
      if (parsedQuery.columns.some((col: string) => col.toUpperCase().startsWith('SUM(')) && 
          parsedQuery.where && parsedQuery.groupBy && parsedQuery.groupBy.length > 0) {
        let sum = 0;
        const batchSize = 1000;
        let offset = 0;
        let hasMoreRecords = true;
        let batchCount = 0;
        
        while (hasMoreRecords) {
          const records = await dbf.readRecords(batchSize, offset);
          
          const lotFiltered = this.applyWhereFilter(records, parsedQuery.where);
          
          const sumColumn = parsedQuery.columns.find((col: string) => col.toUpperCase().startsWith('SUM('));
          if (sumColumn) {
            const fieldName = sumColumn.match(/\((.+?)\)/)?.[1] || '';
            if (fieldName) {
              lotFiltered.forEach(record => {
                sum += parseFloat(record[fieldName]) || 0;
              });
            }
          }
          
          offset += records.length;
          batchCount++;
          
          hasMoreRecords = records.length === batchSize;
        }
        
        const executionTime = Date.now() - startTime;
        
        return {
          rows: [{ Sum_MONTTC: sum }],
          count: 1,
          executionTime
        };
      }
      
      let filteredRecords: any[] = [];
      if (parsedQuery.where) {
        const batchSize = 1000;
        let offset = 0;
        let hasMoreRecords = true;
        
        while (hasMoreRecords) {
          const records = await dbf.readRecords(batchSize, offset);
          
          const lotFiltered = this.applyWhereFilter(records, parsedQuery.where);
          filteredRecords = filteredRecords.concat(lotFiltered);
          
          offset += records.length;
          
          hasMoreRecords = records.length === batchSize;
        }
      } else {
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
      
      let groupedRecords = selectedRecords;
      if (parsedQuery.groupBy && parsedQuery.groupBy.length > 0) {
        groupedRecords = this.applyGroupBy(selectedRecords, parsedQuery.groupBy, parsedQuery.columns);
      }
      
      let orderedRecords = groupedRecords;
      if (parsedQuery.orderBy && parsedQuery.orderBy.length > 0) {
        orderedRecords = this.applyOrderBy(groupedRecords, parsedQuery.orderBy);
      }
      
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
    const upperQuery = query.toUpperCase().trim();
    
    if (!upperQuery.startsWith('SELECT')) {
      throw new Error('Seules les requêtes SELECT sont supportées');
    }
    
    const selectMatch = query.match(/SELECT\s+(.*?)\s+FROM\s+(\w+)/i);
    if (!selectMatch) {
      throw new Error('Format de requête SELECT invalide');
    }
    
    const columnsPart = selectMatch[1].trim();
    const table = selectMatch[2].trim();
    
    let columns: string[] = [];
    if (columnsPart === '*') {
      columns = ['*'];
    } else {
      columns = columnsPart.split(',').map(col => col.trim().replace(/"/g, ''));
    }
    
    let where: string | null = null;
    const whereMatch = query.match(/WHERE\s+(.*?)(?:\s+GROUP\s+BY|\s+ORDER\s+BY|\s+LIMIT|$)/i);
    if (whereMatch) {
      where = whereMatch[1].trim();
    }
    
    let groupBy: string[] = [];
    const groupByMatch = query.match(/GROUP\s+BY\s+(.*?)(?:\s+ORDER\s+BY|\s+LIMIT|$)/i);
    if (groupByMatch) {
      groupBy = groupByMatch[1].split(',').map(col => col.trim().replace(/"/g, ''));
    }
    
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
    // Gérer les conditions AND multiples
    if (whereClause.includes(' AND ')) {
      const conditions = whereClause.split(' AND ').map(cond => cond.trim());
      let filteredRecords = records;
      
      for (const condition of conditions) {
        filteredRecords = this.applySingleWhereCondition(filteredRecords, condition);
      }
      
      return filteredRecords;
    }
    
    // Gérer une seule condition
    return this.applySingleWhereCondition(records, whereClause);
  }
  
  private applySingleWhereCondition(records: any[], condition: string): any[] {
    // Gérer les fonctions LEFT
    const leftMatch = condition.match(/Left\s*\(\s*(\w+)\s*,\s*(\d+)\s*\)\s*=\s*['"](.+?)['"]/i);
    if (leftMatch) {
      const field = leftMatch[1];
      const length = parseInt(leftMatch[2]);
      const value = leftMatch[3];
      return records.filter(record => {
        const fieldValue = record[field];
        if (typeof fieldValue === 'string') {
          return fieldValue.substring(0, length) === value;
        }
        return false;
      });
    }
    
    // Gérer l'opérateur != (différent de)
    const notEqualsMatch = condition.match(/(\w+)\s*<>\s*['"](.+?)['"]/i);
    if (notEqualsMatch) {
      const field = notEqualsMatch[1];
      const value = notEqualsMatch[2];
      return records.filter(record => record[field] !== value);
    }
    
    // Gérer l'opérateur != (différent de) - alternative
    const notEqualsMatch2 = condition.match(/(\w+)\s*!=\s*['"](.+?)['"]/i);
    if (notEqualsMatch2) {
      const field = notEqualsMatch2[1];
      const value = notEqualsMatch2[2];
      return records.filter(record => record[field] !== value);
    }
    
    const equalsMatch = condition.match(/(\w+)\s*=\s*['"](.+?)['"]/i);
    if (equalsMatch) {
      const field = equalsMatch[1];
      const value = equalsMatch[2];
      return records.filter(record => record[field] === value);
    }
    
    const operatorMatch = condition.match(/(\w+)\s*(>=|<=|>|<)\s*['"]?(.+?)['"]?/i);
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
          default: return recordValue === value;
        }
      });
    }
    
    console.warn('Condition WHERE non reconnue, retour de tous les enregistrements:', condition);
    return records;
  }

  /**
   * Applique un regroupement GROUP BY aux enregistrements
   */
  private applyGroupBy(records: any[], groupByColumns: string[], selectColumns: string[]): any[] {
    if (groupByColumns.length === 0) {
      return records;
    }
    
    const groups: Map<string, any[]> = new Map();
    
    records.forEach(record => {
      const groupKey = groupByColumns.map(col => record[col]).join('|');
      
      if (!groups.has(groupKey)) {
        groups.set(groupKey, []);
      }
      groups.get(groupKey)?.push(record);
    });
    
    const groupedRecords: any[] = [];
    
    groups.forEach((groupRecords, _groupKey) => {
      if (groupRecords.length === 0) return;
      
      const groupedRecord: any = {};
      
      groupByColumns.forEach((col, _index) => {
        groupedRecord[col] = groupRecords[0][col];
      });
      
      selectColumns.forEach(col => {
        if (col.toUpperCase().startsWith('SUM(')) {
          const fieldName = col.match(/\((.+?)\)/)?.[1] || '';
          if (fieldName) {
            const sum = groupRecords.reduce((acc, record) => acc + (parseFloat(record[fieldName]) || 0), 0);
            const alias = col.match(/AS\s+(\w+)/i)?.[1] || `Sum_${fieldName}`;
            groupedRecord[alias] = sum;
          }
        } else if (!groupByColumns.includes(col) && col !== '*') {
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