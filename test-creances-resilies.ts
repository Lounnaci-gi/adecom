// Test script for creances resilies
import { DbfService } from './src/services/dbfService.js';

async function testCreancesResilies() {
  try {
    console.log('Testing creances resilies...');
    const result = await DbfService.getAbonnesCreancesResilies(true);
    console.log('Result:', result);
  } catch (error) {
    console.error('Error:', error);
  }
}

testCreancesResilies();