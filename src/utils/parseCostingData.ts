import * as XLSX from 'xlsx';
import dayjs from 'dayjs';

export interface RawMaterialConsumption {
  date: string;
  material: string;
  quantity: number;
  rate: number;
  amount: number;
}

export interface ChemicalConsumption {
  date: string;
  chemical: string;
  quantity: number;
  unit: string;
}

export interface ProductionData {
  date: string;
  quality: string;
  gsm: number;
  production: number;
  speed: number;
}

export interface ProductionLoss {
  date: string;
  department: string;
  timeLoss: number; // in hours
  remarks: string;
}

export interface CostingData {
  date: string;
  totalProduction: number;
  totalCost: number;
  costPerKg: number;
  costPerTonMC?: number; // Per ton cost (MC Production) from Excel
  costPerTonFinish?: number; // Per ton cost (Finish Production) from Excel
  fiberCost: number;
  chemicalsCost: number;
  steamCost: number;
  electricityCost: number;
  laborCost: number;
  waterCost: number;
  maintenanceCost: number;
  overheadCost: number;
  wasteCost: number;
  quality: string;
  gsmGrade: string;
  rawMaterials?: RawMaterialConsumption[];
  chemicals?: ChemicalConsumption[];
  productionLosses?: ProductionLoss[];
  totalTimeLoss?: number; // Total time loss in hours
  productionEfficiency?: number; // Percentage
  // Utility consumption fields
  steamConsumption?: number; // MT of steam
  gasConsumption?: number; // SCM (Standard Cubic Meter)
  waterConsumption?: number; // m³
  powerConsumption?: number; // kWh
  // Deckle fields
  avgDeckle?: number; // Average deckle in CM
  deckleLoss?: number; // Deckle loss in CM
  // Chemical consumption map
  chemicalConsumption?: { [chemical: string]: { quantity: number; cost: number; unit?: string } };
}

// Chemical rates per kg (estimated for demo)
const CHEMICAL_RATES: { [key: string]: number } = {
  'Hercobond 2515AP (DSR)': 180,
  'Rezosol M278 (MAP)': 220,
  'Kyemene 777LX (WSR)': 350,
  'Kyemene 821 AP(WSR)': 320,
  'Creptrol 3718 (Yankee coating)': 280,
  'Rezosol 150 (Yankee Release)': 260,
  'Prestige FP 7883 AP (Felt Cleaning)': 420,
  'Catiofast 160 (Coagulant)': 190,
  'DeTac DC 779 F (Sticky control)': 310,
  'Caustic soda flakes': 45,
  'Core pipes': 85,
  'Stretch film': 120,
  'default': 200
};

// Pulp rates per MT (from consumption sheet)
const PULP_RATES: { [key: string]: number } = {
  'Imported Softwood Pulp SODRA (AD)': 76144,
  'Imported Hardwood Pulp Acacia (AD)April': 58589.95,
  'Imported Hardwood Pulp Acacia (AD)Exman': 58590,
  'Imported Hardwood Pulp CMPC (AD)Domestic': 67410,
  'Imported Hardwood Pulp Baycel': 58500,
  'Imported Softwood Pulp Mercer(AD)': 76000,
  'Imported Softwood Pulp Laja (AD)': 78000,
  'Imported Softwood Pulp Pacifico (AD)': 78000,
  'Imported Softwood Pulp KOMI (AD)': 69000,
  'Wet strength white Tissue': 36452,
  'Imported Hardwood Pulp Suzano (AD)': 58500,
  'Imported Softwood Pulp STORA (AD)': 76000,
  'Imported Softwood Pulp METSA (AD)': 76140,
  'Imported Hardwood April XP (AD)': 58589,
  'default_softwood': 75000,
  'default_hardwood': 60000
};

// Utility rates (based on industry standards in India)
const UTILITY_RATES = {
  steam: 2800, // ₹/MT of steam
  lpg: 95, // ₹/kg
  electricity: 8.5, // ₹/kWh
  water: 35, // ₹/m³
  labor: 800, // ₹/MT (includes all shifts)
  maintenance: 450, // ₹/MT (equipment & spares)
  overhead: 350, // ₹/MT (admin, insurance, etc.)
};

// Normalize department name - handle case variations and common abbreviations
function normalizeDepartment(dept: string): string {
  const deptLower = dept.toLowerCase().trim();
  
  // Common department mappings (case-insensitive)
  const deptMappings: { [key: string]: string } = {
    'instt': 'Instruments',
    'instruments': 'Instruments',
    'maintt': 'Maintenance',
    'maintainance': 'Maintenance',
    'maintenance': 'Maintenance',
    'system wash up': 'System Wash',
    'system wash': 'System Wash',
    'sheet break': 'Sheet Break',
    'grade change': 'Grade Change',
    'others': 'Others',
    'process': 'Process',
    'power': 'Power',
    'steam': 'Steam',
    'electrical': 'Electrical'
  };
  
  // Return normalized name if found in mappings
  return deptMappings[deptLower] || dept;
}

export async function parseCostingExcel(file: File): Promise<CostingData[]> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        
        // Log all sheet names
        console.log('Available sheets:', workbook.SheetNames);
        
        // Parse production data and losses
        const { production: productionData, losses: productionLosses } = parseProductionSheet(workbook);
        
        // Also check daily sheets for production losses
        const dailyLosses = parseDailySheets(workbook);
        
        // Merge losses from both sources
        dailyLosses.forEach((losses, date) => {
          if (productionLosses.has(date)) {
            productionLosses.get(date)!.push(...losses);
          } else {
            productionLosses.set(date, losses);
          }
        });
        
        console.log('Total production losses found:', productionLosses.size);
        productionLosses.forEach((losses, date) => {
          console.log(`Date ${date}: ${losses.length} losses, total hours: ${losses.reduce((sum, l) => sum + l.timeLoss, 0)}`);
        });
        
        // Parse consumption data
        const { consumptionMap, perTonCostMap, timeLossMap, directCostsMap } = parseConsumptionSheet(workbook);
        
        // Parse pulp consumption breakdown
        const pulpData = parsePulpConsumption(workbook);
        
        // Parse chemical consumption
        const chemicalData = parseChemicalSheet(workbook);
        
        // Parse utility consumption
        const utilityData = parseUtilityData(workbook);
        
        // Combine all data to create costing records
        const costingData = combineCostingData(productionData, consumptionMap, chemicalData, utilityData, productionLosses, perTonCostMap, timeLossMap, directCostsMap, pulpData);
        
        // Log date range of parsed data
        if (costingData.length > 0) {
          const sortedCostingData = costingData.sort((a, b) => a.date.localeCompare(b.date));
          console.log('=== Parsed Costing Data Date Range ===');
          console.log(`First date: ${sortedCostingData[0].date}`);
          console.log(`Last date: ${sortedCostingData[sortedCostingData.length - 1].date}`);
          console.log(`Total days: ${sortedCostingData.length}`);
          
          // Check specifically for data after Aug 31, 2025
          const dataAfterAug31 = sortedCostingData.filter(d => d.date > '2025-08-31');
          console.log(`Days after Aug 31, 2025: ${dataAfterAug31.length}`);
          if (dataAfterAug31.length > 0) {
            console.log('Dates after Aug 31, 2025:', dataAfterAug31.map(d => d.date));
          }
        }
        
        resolve(costingData);
      } catch (error) {
        reject(error);
      }
    };
    
    reader.readAsArrayBuffer(file);
  });
}

function parseProductionSheet(workbook: XLSX.WorkBook): { production: ProductionData[], losses: Map<string, ProductionLoss[]> } {
  const sheet = workbook.Sheets['Production '] || workbook.Sheets['Production'];
  if (!sheet) {
    console.log('Production sheet not found');
    return { production: [], losses: new Map() };
  }
  
  const jsonData = XLSX.utils.sheet_to_json(sheet, { header: 1 }) as any[][];
  const productionData: ProductionData[] = [];
  const lossesMap = new Map<string, ProductionLoss[]>();
  
  
  // Start from row 4 (0-indexed row 3)
  let currentDate = '';
  console.log('Starting to parse production sheet, total rows:', jsonData.length);
  
  for (let i = 3; i < jsonData.length; i++) {
    const row = jsonData[i];
    
    // Debug logging for rows around Aug 15
    if (i >= 50 && i <= 70) {
      console.log(`Row ${i + 1}: Date=${row[0]}, Dept=${row[9]}, Time=${row[10]}, Remarks=${row[13]}, currentDate=${currentDate}`);
    }
    
    // Update current date if a new date is found
    if (row[0]) {
      // Skip special codes like MR-20-J, CT-16-J
      if (typeof row[0] === 'string' && row[0].match(/^[A-Z]{2}-\d{2}-[A-Z]$/)) {
        continue;
      }
      
      const newDate = formatDate(row[0]);
      if (newDate) {
        currentDate = newDate;
        
        // Log all dates
        if (currentDate >= '2025-08-14' && currentDate <= '2025-08-20') {
          console.log(`Production sheet - Processing date: ${currentDate}, row ${i + 1}`);
        }
      }
      
      // Parse production data
      if (row[2] && row[3] && row[6]) {
        productionData.push({
          date: currentDate,
          quality: row[2],
          gsm: parseFloat(row[3]) || 0,
          production: parseFloat(row[6]) || 0,
          speed: parseFloat(row[5]) || 0
        });
      }
    }
    
    // For rows with only date and no other data, still update current date
    if (!row[0] && !currentDate) {
      continue; // Skip if we don't have a date yet
    }
    
    // Use current date for all rows (including those without dates)
    if (currentDate) {
      // Parse production losses
      // In the Production sheet, the columns are:
      // Column 8: Production Loss Details
      // Column 9: Dept.
      // Column 10: Time loss (H:MM format)
      // Column 11: Hrs. (if provided separately - usually empty)
      // Column 12: Min. (if provided separately - usually empty)
      // Column 13: Remarks
      // Check column 9 for department (not column 8)
      if (row[9] && row[9].toString().trim() !== '' && 
          row[9].toString().trim() !== 'Dept.' &&
          row[9].toString().trim() !== 'Time loss,' &&
          row[9].toString().trim() !== 'Day Total Hrs.' &&
          row[9].toString().trim() !== 'Day total' &&
          row[9].toString().trim() !== 'Day Total' &&
          !row[9].toString().toLowerCase().includes('day total') &&
          !row[9].toString().match(/^\d+\.?\d*$/)) { // Skip pure numbers
        
        const departmentRaw = row[9].toString().trim();
        
        // Skip if it's a number or time value
        if (departmentRaw.match(/^\d+:?\d*$/) || departmentRaw.match(/^\d+\.\d+$/)) {
          continue;
        }
        
        // Clean up department name
        let department = normalizeDepartment(departmentRaw);
        let timeLoss = 0;
        let remarks = '';
        
        // Check column 10 for time in H:MM format (not column 9)
        if (row[10] !== undefined && row[10] !== null && row[10] !== '') {
          const timeLossRaw = row[10];
          
          if (typeof timeLossRaw === 'number') {
            // Excel might store time as fraction of a day
            if (timeLossRaw < 1) {
              timeLoss = timeLossRaw * 24;
            } else {
              timeLoss = timeLossRaw;
            }
          } else {
            const timeLossStr = timeLossRaw.toString().trim();
            
            if (timeLossStr.includes(':')) {
              // Handle H:MM format (hours:minutes)
              // Clean up any leading dots or special characters
              const cleanedStr = timeLossStr.replace(/^[.\s]+/, '');
              const parts = cleanedStr.split(':');
              if (parts.length >= 2) {
                const hours = parseInt(parts[0]) || 0;
                const minutes = parseInt(parts[1]) || 0;
                timeLoss = hours + minutes / 60;
              }
            } else if (timeLossStr !== '') {
              // Try to parse as a regular number (hours)
              timeLoss = parseFloat(timeLossStr) || 0;
            }
          }
        }
        
        // Remarks are in column 13 (0-indexed column 13 is the 14th column)
        // But in some rows, remarks might be in column 12 if column structure shifts
        if (row[13]) {
          remarks = row[13].toString();
        } else if (row[12] && typeof row[12] === 'string' && !row[12].toString().match(/^\d+$/)) {
          remarks = row[12].toString();
        }
        
        // Debug logging
        if (timeLoss > 0) {
          if (currentDate >= '2025-08-15') {
            console.log(`Production sheet - Date: ${currentDate}, Dept: ${department}, TimeLoss: ${timeLoss.toFixed(2)} hours, Remarks: ${remarks}`);
          }
          
          if (!lossesMap.has(currentDate)) {
            lossesMap.set(currentDate, []);
          }
          
          lossesMap.get(currentDate)!.push({
            date: currentDate,
            department,
            timeLoss,
            remarks
          });
        }
      }
    }
  }
  
  // Debug summary
  console.log('Production sheet parsing complete:');
  console.log('Total production entries:', productionData.length);
  console.log('Dates with losses:', Array.from(lossesMap.keys()).sort());
  
  // Check specifically for dates after Aug 15
  const lossesAfterAug15 = Array.from(lossesMap.entries())
    .filter(([date, losses]) => date >= '2025-08-15')
    .map(([date, losses]) => ({
      date,
      count: losses.length,
      totalHours: losses.reduce((sum, l) => sum + l.timeLoss, 0)
    }));
  
  console.log('Losses after Aug 15:', lossesAfterAug15);
  
  return { production: productionData, losses: lossesMap };
}

function parseDailySheets(workbook: XLSX.WorkBook): Map<string, ProductionLoss[]> {
  const dailyLossesMap = new Map<string, ProductionLoss[]>();
  
  // Look for sheets with date pattern (e.g., "02-08-2025")
  const datePattern = /^\d{2}-\d{2}-\d{4}$/;
  
  workbook.SheetNames.forEach(sheetName => {
    if (datePattern.test(sheetName)) {
      console.log(`Checking daily sheet: ${sheetName}`);
      const sheet = workbook.Sheets[sheetName];
      const jsonData = XLSX.utils.sheet_to_json(sheet, { header: 1 }) as any[][];
      
      // Parse date from sheet name
      const [day, month, year] = sheetName.split('-');
      const date = `${year}-${month}-${day}`;
      
      // Log if date is after August 31, 2025
      if (date > '2025-08-31') {
        console.log(`Processing sheet after Aug 31, 2025: ${sheetName} -> ${date}`);
      }
      
      // Look for production loss data in daily sheets
      // In daily sheets, the structure is different:
      // Column 8: Department
      // Column 9: Time loss (H:MM format)
      // Column 10: Hrs (might be empty)
      // Column 11: Min (might be empty)
      // Column 12: Remarks
      
      console.log(`Parsing ${sheetName} - first data row:`, jsonData[7]);
      
      for (let i = 7; i < jsonData.length; i++) {
        const row = jsonData[i];
        
        // Look for department in column 8 (0-indexed)
        if (row[8] && row[8].toString().trim() !== '' && 
            row[8].toString().trim() !== 'Day total' &&
            row[8].toString().trim() !== 'Day Total Hrs.' &&
            row[8].toString().trim() !== 'Day Total' &&
            !row[8].toString().toLowerCase().includes('day total') &&
            !row[8].toString().toLowerCase().includes('total hrs') &&
            !row[8].toString().includes('Tissue Paper')) {
          
          let department = normalizeDepartment(row[8].toString().trim());
          let timeLoss = 0;
          let remarks = '';
          
          // Check column 9 for time in H:MM format
          if (row[9] !== undefined && row[9] !== null && row[9] !== '') {
            const timeLossRaw = row[9];
            
            if (typeof timeLossRaw === 'number') {
              // Excel might store time as fraction of day
              if (timeLossRaw < 1) {
                timeLoss = timeLossRaw * 24;
              } else {
                timeLoss = timeLossRaw;
              }
            } else {
              const timeLossStr = timeLossRaw.toString().trim();
              
              if (timeLossStr.includes(':')) {
                // Parse H:MM format
                const parts = timeLossStr.split(':');
                if (parts.length >= 2) {
                  const hours = parseInt(parts[0]) || 0;
                  const minutes = parseInt(parts[1]) || 0;
                  timeLoss = hours + minutes / 60;
                }
              } else {
                timeLoss = parseFloat(timeLossStr) || 0;
              }
            }
          }
          
          // Check if time is in separate Hrs/Min columns (10 and 11)
          if (timeLoss === 0) {
            const hrs = parseFloat(row[10]) || 0;
            const mins = parseFloat(row[11]) || 0;
            if (hrs > 0 || mins > 0) {
              timeLoss = hrs + mins / 60;
            }
          }
          
          // Remarks might be in column 12
          if (row[12]) {
            remarks = row[12].toString();
          } else if (row[11] && typeof row[11] === 'string' && !row[11].match(/^\d+$/)) {
            // Sometimes remarks might be in column 11 if it's not a number
            remarks = row[11].toString();
          }
          
          if (timeLoss > 0) {
            if (!dailyLossesMap.has(date)) {
              dailyLossesMap.set(date, []);
            }
            
            dailyLossesMap.get(date)!.push({
              date,
              department,
              timeLoss,
              remarks
            });
            
            console.log(`Daily sheet ${sheetName}: Found loss - ${department}, ${timeLoss} hrs, remarks: ${remarks}`);
          }
        }
      }
    }
  });
  
  return dailyLossesMap;
}

interface ConsumptionSheetData {
  consumptionMap: Map<string, RawMaterialConsumption[]>;
  perTonCostMap: Map<string, { mcProduction?: number; finishProduction?: number }>;
  timeLossMap: Map<string, number>; // Time loss in MT (from APPROX BACK LOG column)
  directCostsMap: Map<string, {
    fiber?: number;
    chemical?: number;
    steam?: number;
    gas?: number;
    power?: number;
    packing?: number;
  }>;
}

function parseConsumptionSheet(workbook: XLSX.WorkBook): ConsumptionSheetData {
  // Try different possible sheet names
  const sheet = workbook.Sheets['Consumption'] || 
                workbook.Sheets['Daily Consumption ( Variable cost)'] ||
                workbook.Sheets['Daily Consumption'] ||
                workbook.Sheets['Consumption '];
  if (!sheet) {
    console.log('Consumption sheet not found. Available sheets:', Object.keys(workbook.Sheets));
    return { consumptionMap: new Map(), perTonCostMap: new Map(), timeLossMap: new Map(), directCostsMap: new Map() };
  }
  console.log('Found consumption sheet');
  
  const jsonData = XLSX.utils.sheet_to_json(sheet, { header: 1 }) as any[][];
  const consumptionMap = new Map<string, RawMaterialConsumption[]>();
  const perTonCostMap = new Map<string, { mcProduction?: number; finishProduction?: number }>();
  const timeLossMap = new Map<string, number>();
  const directCostsMap = new Map<string, { fiber?: number; chemical?: number; steam?: number; gas?: number; power?: number; packing?: number }>();
  
  // Find column indices for per ton cost columns and time loss column
  // Based on the Excel analysis, they are at columns 85 and 86 (0-indexed: 84 and 85)
  // But let's still search to be safe
  let perTonMCCol = -1;
  let perTonFinishCol = -1;
  let timeLossCol = -1;
  
  // Find direct cost columns (Fiber, Chemical, Steam, etc.)
  let fiberCostCol = -1;
  let chemicalCostCol = -1;
  let steamCostCol = -1;
  let gasCostCol = -1;
  let powerCostCol = -1;
  let packingCostCol = -1;
  
  // Check row 3 (index 2) for column headers - this is where the headers are
  if (jsonData[2]) {
    for (let col = 0; col < jsonData[2].length; col++) {
      const header = jsonData[2][col]?.toString() || '';
      if (header.toLowerCase().includes('per ton cost') && header.toLowerCase().includes('mc production')) {
        perTonMCCol = col;
        console.log(`Found MC Production column at: ${col}, header: ${header}`);
      }
      if (header.toLowerCase().includes('per ton cost') && header.toLowerCase().includes('finish production')) {
        perTonFinishCol = col;
        console.log(`Found Finish Production column at: ${col}, header: ${header}`);
      }
      if (header.toLowerCase().includes('approx back log') || header.toLowerCase().includes('wip')) {
        timeLossCol = col;
        console.log(`Found Time Loss column at: ${col}, header: ${header}`);
      }
      // Find direct cost columns
      if (header.toLowerCase() === 'fiber') {
        fiberCostCol = col;
        console.log(`Found Fiber cost column at: ${col}`);
      }
      if (header.toLowerCase() === 'chemical') {
        chemicalCostCol = col;
        console.log(`Found Chemical cost column at: ${col}`);
      }
      if (header.toLowerCase() === 'steam') {
        steamCostCol = col;
        console.log(`Found Steam cost column at: ${col}`);
      }
      if (header.toLowerCase() === 'gas') {
        gasCostCol = col;
        console.log(`Found Gas cost column at: ${col}`);
      }
      if (header.toLowerCase() === 'power') {
        powerCostCol = col;
        console.log(`Found Power cost column at: ${col}`);
      }
      if (header.toLowerCase() === 'packing') {
        packingCostCol = col;
        console.log(`Found Packing cost column at: ${col}`);
      }
    }
  }
  
  // Fallback to known positions if not found
  if (perTonMCCol === -1 && jsonData[2] && jsonData[2][84]) {
    const header = jsonData[2][84]?.toString() || '';
    if (header.toLowerCase().includes('per ton')) {
      perTonMCCol = 84;
      console.log(`Using fallback MC column at 84: ${header}`);
    }
  }
  if (perTonFinishCol === -1 && jsonData[2] && jsonData[2][85]) {
    const header = jsonData[2][85]?.toString() || '';
    if (header.toLowerCase().includes('per ton')) {
      perTonFinishCol = 85;
      console.log(`Using fallback Finish column at 85: ${header}`);
    }
  }
  
  console.log(`Per ton cost columns - MC: ${perTonMCCol}, Finish: ${perTonFinishCol}`);
  
  // Get material names from row 2 and rates from row 4
  const materials: string[] = [];
  const rates: number[] = [];
  
  // Log the sheet structure
  console.log('Consumption sheet structure:');
  console.log('Row 1 (headers):', jsonData[1]?.slice(0, 20));
  console.log('Row 3 (rates):', jsonData[3]?.slice(0, 20));
  
  for (let col = 1; col < jsonData[1].length; col++) {
    const header = jsonData[1][col]?.toString() || '';
    // Skip per ton cost columns when collecting material names
    if (col !== perTonMCCol && col !== perTonFinishCol && header && !header.toLowerCase().includes('per ton cost')) {
      materials.push(header);
      rates.push(parseFloat(jsonData[3][col]) || 0);
    }
  }
  
  console.log(`Found ${materials.length} materials in consumption sheet`);
  console.log('First 10 materials:', materials.slice(0, 10));
  
  // Parse consumption data starting from row 5
  for (let row = 4; row < jsonData.length; row++) {
    const dateValue = jsonData[row][0];
    if (!dateValue) continue;
    
    const date = formatDate(dateValue);
    const dayConsumption: RawMaterialConsumption[] = [];
    
    // Parse material consumption
    let materialIndex = 0;
    for (let col = 1; col < jsonData[row].length; col++) {
      // Skip per ton cost columns
      if (col === perTonMCCol || col === perTonFinishCol) continue;
      
      if (materialIndex < materials.length) {
        const quantity = parseFloat(jsonData[row][col]) || 0;
        if (quantity > 0) {
          dayConsumption.push({
            date,
            material: materials[materialIndex],
            quantity,
            rate: rates[materialIndex],
            amount: quantity * rates[materialIndex]
          });
        }
        materialIndex++;
      }
    }
    
    // Parse per ton costs
    if (perTonMCCol >= 0 || perTonFinishCol >= 0) {
      const perTonCosts: { mcProduction?: number; finishProduction?: number } = {};
      
      if (perTonMCCol >= 0) {
        perTonCosts.mcProduction = parseFloat(jsonData[row][perTonMCCol]) || undefined;
      }
      if (perTonFinishCol >= 0) {
        perTonCosts.finishProduction = parseFloat(jsonData[row][perTonFinishCol]) || undefined;
      }
      
      if (perTonCosts.mcProduction || perTonCosts.finishProduction) {
        perTonCostMap.set(date, perTonCosts);
      }
    }
    
    // Parse time loss data if column found
    if (timeLossCol >= 0 && jsonData[row][timeLossCol]) {
      const timeLossValue = parseFloat(jsonData[row][timeLossCol]) || 0;
      if (timeLossValue > 0) {
        timeLossMap.set(date, timeLossValue);
        console.log(`Consumption sheet - Time Loss for ${date}: ${timeLossValue} MT`);
      }
    }
    
    // Parse direct costs
    const directCosts: any = {};
    if (fiberCostCol >= 0 && jsonData[row][fiberCostCol]) {
      const value = jsonData[row][fiberCostCol]?.toString() || '';
      const numericValue = parseFloat(value.replace(/[₹,]/g, '')) || 0;
      if (numericValue > 0) {
        directCosts.fiber = numericValue;
      }
    }
    if (chemicalCostCol >= 0 && jsonData[row][chemicalCostCol]) {
      const value = jsonData[row][chemicalCostCol]?.toString() || '';
      const numericValue = parseFloat(value.replace(/[₹,]/g, '')) || 0;
      if (numericValue > 0) {
        directCosts.chemical = numericValue;
      }
    }
    if (steamCostCol >= 0 && jsonData[row][steamCostCol]) {
      const value = jsonData[row][steamCostCol]?.toString() || '';
      const numericValue = parseFloat(value.replace(/[₹,]/g, '')) || 0;
      if (numericValue > 0) {
        directCosts.steam = numericValue;
      }
    }
    if (gasCostCol >= 0 && jsonData[row][gasCostCol]) {
      const value = jsonData[row][gasCostCol]?.toString() || '';
      const numericValue = parseFloat(value.replace(/[₹,]/g, '')) || 0;
      if (numericValue > 0) {
        directCosts.gas = numericValue;
      }
    }
    if (powerCostCol >= 0 && jsonData[row][powerCostCol]) {
      const value = jsonData[row][powerCostCol]?.toString() || '';
      const numericValue = parseFloat(value.replace(/[₹,]/g, '')) || 0;
      if (numericValue > 0) {
        directCosts.power = numericValue;
      }
    }
    if (packingCostCol >= 0 && jsonData[row][packingCostCol]) {
      const value = jsonData[row][packingCostCol]?.toString() || '';
      const numericValue = parseFloat(value.replace(/[₹,]/g, '')) || 0;
      if (numericValue > 0) {
        directCosts.packing = numericValue;
      }
    }
    
    if (Object.keys(directCosts).length > 0) {
      directCostsMap.set(date, directCosts);
      console.log(`Direct costs for ${date}:`, directCosts);
    }
    
    if (dayConsumption.length > 0) {
      consumptionMap.set(date, dayConsumption);
    }
  }
  
  return { consumptionMap, perTonCostMap, timeLossMap, directCostsMap };
}

interface PulpConsumption {
  date: string;
  pulpType: string;
  category: 'softwood' | 'hardwood' | 'tissue';
  quantity: number;
}

function parsePulpConsumption(workbook: XLSX.WorkBook): Map<string, PulpConsumption[]> {
  const sheet = workbook.Sheets['Pulp & Chemical consumption'] || workbook.Sheets['Pulp & Chemical Consumption'];
  if (!sheet) return new Map();
  
  const jsonData = XLSX.utils.sheet_to_json(sheet, { header: 1 }) as any[][];
  const pulpMap = new Map<string, PulpConsumption[]>();
  
  // Pulp type categorization
  const pulpCategories: { [key: string]: 'softwood' | 'hardwood' | 'tissue' } = {
    'SODRA': 'softwood',
    'STORA': 'softwood',
    'METSA': 'softwood',
    'KOMI': 'softwood',
    'Mercer': 'softwood',
    'Laja': 'softwood',
    'Pacifico': 'softwood',
    'Acacia': 'hardwood',
    'CMPC': 'hardwood',
    'Baycel': 'hardwood',
    'Suzano': 'hardwood',
    'April': 'hardwood',
    'Tissue': 'tissue'
  };
  
  // Find RAW MATERIAL section
  let rawMaterialStartRow = -1;
  for (let i = 0; i < Math.min(10, jsonData.length); i++) {
    if (jsonData[i][0] === 'A' && jsonData[i][1] === 'RAW MATERIAL') {
      rawMaterialStartRow = i + 1;
      break;
    }
  }
  
  if (rawMaterialStartRow === -1) return pulpMap;
  
  // Get dates from row with dates (should be row 2, index 1)
  const dates: string[] = [];
  const dateRow = jsonData[1];
  
  // Find the starting column for dates (skip first few columns that have headers)
  let dateStartCol = -1;
  for (let col = 0; col < dateRow.length; col++) {
    const cellValue = dateRow[col];
    if (cellValue && formatDate(cellValue) && formatDate(cellValue).includes('2025')) {
      dateStartCol = col;
      break;
    }
  }
  
  if (dateStartCol === -1) return pulpMap;
  
  // Collect all dates
  for (let col = dateStartCol; col < dateRow.length; col++) {
    const dateValue = dateRow[col];
    if (dateValue) {
      const formattedDate = formatDate(dateValue);
      if (formattedDate && formattedDate.includes('2025')) {
        dates.push(formattedDate);
      }
    }
  }
  
  console.log(`Found ${dates.length} dates in Pulp sheet starting from column ${dateStartCol}`);
  
  // Parse pulp consumption
  for (let row = rawMaterialStartRow; row < jsonData.length; row++) {
    const pulpName = jsonData[row][1]?.toString() || '';
    
    // Stop if we reach chemicals section or empty rows
    if (!pulpName || pulpName === 'Solenise Chemicals' || pulpName.includes('Total Pulp')) {
      break;
    }
    
    // Determine pulp category
    let category: 'softwood' | 'hardwood' | 'tissue' = 'hardwood'; // default
    for (const [keyword, cat] of Object.entries(pulpCategories)) {
      if (pulpName.includes(keyword)) {
        category = cat;
        break;
      }
    }
    
    // Parse consumption for each date
    dates.forEach((date, index) => {
      const col = dateStartCol + index;
      const quantity = parseFloat(jsonData[row][col]) || 0;
      
      if (quantity > 0) {
        if (!pulpMap.has(date)) {
          pulpMap.set(date, []);
        }
        
        pulpMap.get(date)!.push({
          date,
          pulpType: pulpName,
          category,
          quantity
        });
      }
    });
  }
  
  // Log summary
  pulpMap.forEach((pulps, date) => {
    const softwoodTotal = pulps.filter(p => p.category === 'softwood').reduce((sum, p) => sum + p.quantity, 0);
    const hardwoodTotal = pulps.filter(p => p.category === 'hardwood').reduce((sum, p) => sum + p.quantity, 0);
    if (date === '2025-08-01') {
      console.log(`Pulp breakdown for ${date}: Softwood=${softwoodTotal.toFixed(2)} MT, Hardwood=${hardwoodTotal.toFixed(2)} MT`);
    }
  });
  
  return pulpMap;
}

function parseChemicalSheet(workbook: XLSX.WorkBook): Map<string, ChemicalConsumption[]> {
  const sheet = workbook.Sheets['Pulp & Chemical consumption'] || workbook.Sheets['Pulp & Chemical Consumption'];
  if (!sheet) return new Map();
  
  const jsonData = XLSX.utils.sheet_to_json(sheet, { header: 1 }) as any[][];
  const chemicalMap = new Map<string, ChemicalConsumption[]>();
  
  // Find chemical section (starts around row 19)
  let chemicalStartRow = -1;
  for (let i = 0; i < jsonData.length; i++) {
    if (jsonData[i][1] === 'Solenise Chemicals') {
      chemicalStartRow = i + 1;
      break;
    }
  }
  
  if (chemicalStartRow === -1) return chemicalMap;
  
  // Get dates from row 2
  const dates: string[] = [];
  for (let col = 3; col < jsonData[1].length; col++) {
    if (jsonData[1][col]) {
      dates.push(formatDate(jsonData[1][col]));
    }
  }
  
  // Parse chemical consumption
  for (let row = chemicalStartRow; row < jsonData.length; row++) {
    const chemicalName = jsonData[row][1];
    const unit = jsonData[row][2];
    
    if (!chemicalName || chemicalName === 'PACKING MATERIALS' || chemicalName === 'MACHINE PRODUCTION') {
      break;
    }
    
    for (let col = 3; col < dates.length + 3; col++) {
      const quantity = parseFloat(jsonData[row][col]) || 0;
      if (quantity > 0) {
        const date = dates[col - 3];
        if (!chemicalMap.has(date)) {
          chemicalMap.set(date, []);
        }
        
        chemicalMap.get(date)!.push({
          date,
          chemical: chemicalName,
          quantity,
          unit: unit || 'Kg'
        });
      }
    }
  }
  
  return chemicalMap;
}

interface UtilityConsumption {
  date: string;
  steam: number; // MT
  lpg: number; // MT
  water: number; // m³
  power: number; // kWh (if available)
  downtime: number; // hours
}

function parseUtilityData(workbook: XLSX.WorkBook): Map<string, UtilityConsumption> {
  const sheet = workbook.Sheets['Pulp & Chemical consumption'];
  if (!sheet) return new Map();
  
  const jsonData = XLSX.utils.sheet_to_json(sheet, { header: 1 }) as any[][];
  const utilityMap = new Map<string, UtilityConsumption>();
  
  // Find utility section (around row 58)
  let steamRow = -1, lpgRow = -1, waterRow = -1, downtimeRow = -1;
  for (let i = 50; i < Math.min(70, jsonData.length); i++) {
    if (jsonData[i][1] === 'Steam consumption') steamRow = i;
    if (jsonData[i][1] === 'LPG consumption') lpgRow = i;
    if (jsonData[i][1] === 'Water consumption') waterRow = i;
    if (jsonData[i][1] === 'Down Time') downtimeRow = i;
  }
  
  // Get dates from row 2
  const dates: string[] = [];
  for (let col = 5; col < jsonData[1].length; col++) {
    if (jsonData[1][col]) {
      dates.push(formatDate(jsonData[1][col]));
    }
  }
  
  // Parse utility data for each date
  dates.forEach((date, index) => {
    const col = index + 5; // Data starts from column 5
    const utility: UtilityConsumption = {
      date,
      steam: steamRow !== -1 ? (parseFloat(jsonData[steamRow][col]) || 0) : 0,
      lpg: lpgRow !== -1 ? (parseFloat(jsonData[lpgRow][col]) || 0) : 0,
      water: waterRow !== -1 ? (parseFloat(jsonData[waterRow][col]) || 0) : 0,
      power: 0, // Will be calculated based on production
      downtime: downtimeRow !== -1 ? (parseFloat(jsonData[downtimeRow][col]) || 0) : 0
    };
    
    if (utility.steam > 0 || utility.lpg > 0 || utility.water > 0) {
      utilityMap.set(date, utility);
    }
  });
  
  return utilityMap;
}

function combineCostingData(
  productionData: ProductionData[],
  consumptionData: Map<string, RawMaterialConsumption[]>,
  chemicalData: Map<string, ChemicalConsumption[]>,
  utilityData: Map<string, UtilityConsumption>,
  productionLosses: Map<string, ProductionLoss[]>,
  perTonCostMap: Map<string, { mcProduction?: number; finishProduction?: number }>,
  timeLossMap: Map<string, number>,
  directCostsMap: Map<string, {
    fiber?: number;
    chemical?: number;
    steam?: number;
    gas?: number;
    power?: number;
    packing?: number;
  }>,
  pulpData: Map<string, PulpConsumption[]>
): CostingData[] {
  const costingData: CostingData[] = [];
  
  // Group production by date
  const productionByDate = new Map<string, ProductionData[]>();
  productionData.forEach(prod => {
    if (!productionByDate.has(prod.date)) {
      productionByDate.set(prod.date, []);
    }
    productionByDate.get(prod.date)!.push(prod);
  });
  
  // Process each date
  productionByDate.forEach((dayProduction, date) => {
    const totalProduction = dayProduction.reduce((sum, p) => sum + p.production, 0);
    if (totalProduction === 0) return;
    
    // Get direct costs if available
    const directCosts = directCostsMap.get(date);
    
    // Calculate fiber cost - use direct cost if available
    const dayConsumption = consumptionData.get(date) || [];
    const calculatedFiberCost = dayConsumption.reduce((sum, c) => sum + c.amount, 0);
    const fiberCost = directCosts?.fiber || calculatedFiberCost;
    
    // Calculate chemical cost - use direct cost if available
    const dayChemicals = chemicalData.get(date) || [];
    const calculatedChemicalsCost = dayChemicals.reduce((sum, c) => {
      const rate = CHEMICAL_RATES[c.chemical] || CHEMICAL_RATES.default;
      return sum + (c.quantity * rate);
    }, 0);
    const chemicalsCost = directCosts?.chemical || calculatedChemicalsCost;
    
    // Calculate utility costs based on actual consumption data or estimates
    const utilityConsumption = utilityData.get(date);
    let steamCost: number;
    let lpgCost: number;
    let electricityCost: number;
    let waterCost: number;
    
    if (directCosts?.steam) {
      // Use direct cost if available
      steamCost = directCosts.steam;
      lpgCost = directCosts.gas || 0;
    } else if (utilityConsumption) {
      // Use actual consumption data
      steamCost = utilityConsumption.steam * UTILITY_RATES.steam;
      lpgCost = utilityConsumption.lpg * 1000 * UTILITY_RATES.lpg; // Convert MT to kg
    } else {
      // Use estimates based on typical tissue manufacturing ratios
      steamCost = totalProduction * 3.2 * UTILITY_RATES.steam; // 3.2 MT steam per MT tissue
      lpgCost = totalProduction * 25 * UTILITY_RATES.lpg; // 25 kg LPG per MT
    }
    
    if (directCosts?.power) {
      // Use direct cost if available
      electricityCost = directCosts.power;
    } else if (utilityConsumption && utilityConsumption.power > 0) {
      electricityCost = utilityConsumption.power * UTILITY_RATES.electricity;
    } else {
      electricityCost = totalProduction * 1100 * UTILITY_RATES.electricity; // 1100 kWh per MT
    }
    
    if (utilityConsumption) {
      waterCost = utilityConsumption.water * UTILITY_RATES.water;
    } else {
      waterCost = totalProduction * 60 * UTILITY_RATES.water; // 60 m³ per MT
    }
    const laborCost = totalProduction * UTILITY_RATES.labor;
    const maintenanceCost = totalProduction * UTILITY_RATES.maintenance;
    const overheadCost = totalProduction * UTILITY_RATES.overhead;
    const wasteCost = totalProduction * 0.065 * (fiberCost / totalProduction); // 6.5% waste (100% - 93.5% yield)
    
    const totalCost = fiberCost + chemicalsCost + steamCost + lpgCost + electricityCost + 
                     laborCost + waterCost + maintenanceCost + overheadCost + wasteCost;
    
    // Get predominant quality and GSM
    const qualityCounts = new Map<string, number>();
    const gsmCounts = new Map<string, number>();
    
    dayProduction.forEach(p => {
      qualityCounts.set(p.quality, (qualityCounts.get(p.quality) || 0) + p.production);
      const gsmGrade = `${p.gsm} GSM`;
      gsmCounts.set(gsmGrade, (gsmCounts.get(gsmGrade) || 0) + p.production);
    });
    
    const quality = Array.from(qualityCounts.entries()).sort((a, b) => b[1] - a[1])[0]?.[0] || 'Mixed';
    const gsmGrade = Array.from(gsmCounts.entries()).sort((a, b) => b[1] - a[1])[0]?.[0] || 'Mixed';
    
    // Get production losses for the date
    const dayLosses = productionLosses.get(date) || [];
    let totalTimeLoss = dayLosses.reduce((sum, loss) => sum + loss.timeLoss, 0);
    
    // Use time loss from consumption sheet if available (this is in MT, not hours)
    const consumptionTimeLoss = timeLossMap.get(date);
    if (consumptionTimeLoss !== undefined && consumptionTimeLoss > 0 && totalTimeLoss === 0) {
      // Only use consumption sheet time loss if we don't have time loss from production sheet
      // Convert MT loss to approximate hours (assuming average production rate)
      // If we have 100 MT/day production capacity, and we have X MT loss
      // Then hours lost = (X / 100) * 24
      const avgDailyProduction = totalProduction > 0 ? totalProduction : 80; // Default 80 MT/day
      const hoursFromMTLoss = (consumptionTimeLoss / avgDailyProduction) * 24;
      totalTimeLoss = hoursFromMTLoss;
      
      console.log(`Date ${date}: Using time loss from consumption sheet: ${consumptionTimeLoss} MT -> ${hoursFromMTLoss.toFixed(2)} hours`);
    }
    
    // Calculate production efficiency
    // Assume 24 hours operation per day minus downtime
    const availableHours = 24 - totalTimeLoss;
    const productionEfficiency = availableHours > 0 ? (availableHours / 24) * 100 : 0;
    
    // Get per ton costs from Excel if available
    const perTonCosts = perTonCostMap.get(date);
    
    // Create chemical consumption map
    const chemicalConsumptionMap: { [chemical: string]: { quantity: number; cost: number; unit?: string } } = {};
    dayChemicals.forEach(c => {
      const rate = CHEMICAL_RATES[c.chemical] || CHEMICAL_RATES.default;
      chemicalConsumptionMap[c.chemical] = {
        quantity: c.quantity,
        cost: c.quantity * rate,
        unit: c.unit
      };
    });
    
    // Calculate utility consumption values
    let steamConsumption: number;
    let gasConsumption: number;
    let waterConsumption: number;
    let powerConsumption: number;
    
    if (utilityConsumption) {
      steamConsumption = utilityConsumption.steam;
      gasConsumption = utilityConsumption.lpg * 22.4 * 1000; // Convert MT of LPG to SCM (approximate)
      waterConsumption = utilityConsumption.water;
      powerConsumption = utilityConsumption.power > 0 ? utilityConsumption.power : totalProduction * 1100;
    } else {
      steamConsumption = totalProduction * 3.2;
      gasConsumption = totalProduction * 25 * 22.4; // kg to SCM conversion
      waterConsumption = totalProduction * 60;
      powerConsumption = totalProduction * 1100;
    }
    
    // Calculate deckle values (example values, should be from actual data)
    const avgDeckle = 260; // Average deckle width in CM
    const deckleLoss = Math.random() * 8 + 2; // Random between 2-10 CM for demo
    
    costingData.push({
      date,
      totalProduction,
      totalCost,
      costPerKg: totalCost / (totalProduction * 1000),
      costPerTonMC: perTonCosts?.mcProduction,
      costPerTonFinish: perTonCosts?.finishProduction,
      fiberCost,
      chemicalsCost,
      steamCost: steamCost + lpgCost, // Combine steam and LPG as thermal energy
      electricityCost,
      laborCost,
      waterCost,
      maintenanceCost,
      overheadCost,
      wasteCost,
      quality,
      gsmGrade,
      rawMaterials: (() => {
        // Combine consumption data with pulp data for more accurate breakdown
        const pulpConsumption = pulpData.get(date) || [];
        const combinedMaterials: RawMaterialConsumption[] = [];
        
        // Add pulp consumption with rates
        pulpConsumption.forEach(pulp => {
          const rate = PULP_RATES[pulp.pulpType] || 
                      (pulp.category === 'softwood' ? PULP_RATES.default_softwood : PULP_RATES.default_hardwood);
          combinedMaterials.push({
            date,
            material: pulp.pulpType,
            quantity: pulp.quantity,
            rate,
            amount: pulp.quantity * rate
          });
        });
        
        // Add other raw materials from consumption sheet if not duplicates
        dayConsumption.forEach(material => {
          // Check if this material is already in pulp data
          const isPulp = pulpConsumption.some(pulp => 
            material.material.includes(pulp.pulpType) || 
            pulp.pulpType.includes(material.material)
          );
          if (!isPulp) {
            combinedMaterials.push(material);
          }
        });
        
        return combinedMaterials;
      })(),
      chemicals: dayChemicals,
      productionLosses: dayLosses,
      totalTimeLoss,
      productionEfficiency,
      // Utility consumption fields
      steamConsumption,
      gasConsumption,
      waterConsumption,
      powerConsumption,
      // Deckle fields
      avgDeckle,
      deckleLoss,
      // Chemical consumption map
      chemicalConsumption: chemicalConsumptionMap
    });
  });
  
  return costingData.sort((a, b) => a.date.localeCompare(b.date));
}

function formatDate(dateValue: any): string {
  if (!dateValue) return '';
  
  let formattedDate = '';
  
  // Handle Excel date serial number
  if (typeof dateValue === 'number') {
    const excelDate = new Date((dateValue - 25569) * 86400 * 1000);
    formattedDate = dayjs(excelDate).format('YYYY-MM-DD');
    
    // Log dates after Aug 31, 2025
    if (formattedDate > '2025-08-31') {
      console.log(`formatDate: Excel serial ${dateValue} -> ${formattedDate}`);
    }
  }
  
  // Handle date string
  else if (typeof dateValue === 'string') {
    formattedDate = dayjs(dateValue).format('YYYY-MM-DD');
    
    // Log dates after Aug 31, 2025
    if (formattedDate > '2025-08-31') {
      console.log(`formatDate: String "${dateValue}" -> ${formattedDate}`);
    }
  }
  
  // Handle Date object
  else if (dateValue instanceof Date) {
    formattedDate = dayjs(dateValue).format('YYYY-MM-DD');
    
    // Log dates after Aug 31, 2025
    if (formattedDate > '2025-08-31') {
      console.log(`formatDate: Date object ${dateValue} -> ${formattedDate}`);
    }
  }
  
  return formattedDate;
}