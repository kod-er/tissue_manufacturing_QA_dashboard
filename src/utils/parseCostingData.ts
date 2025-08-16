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

export interface CostingData {
  date: string;
  totalProduction: number;
  totalCost: number;
  costPerKg: number;
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

export async function parseCostingExcel(file: File): Promise<CostingData[]> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        
        // Parse production data
        const productionData = parseProductionSheet(workbook);
        
        // Parse consumption data
        const consumptionData = parseConsumptionSheet(workbook);
        
        // Parse chemical consumption
        const chemicalData = parseChemicalSheet(workbook);
        
        // Parse utility consumption
        const utilityData = parseUtilityData(workbook);
        
        // Combine all data to create costing records
        const costingData = combineCostingData(productionData, consumptionData, chemicalData, utilityData);
        
        resolve(costingData);
      } catch (error) {
        reject(error);
      }
    };
    
    reader.readAsArrayBuffer(file);
  });
}

function parseProductionSheet(workbook: XLSX.WorkBook): ProductionData[] {
  const sheet = workbook.Sheets['Production '] || workbook.Sheets['Production'];
  if (!sheet) return [];
  
  const jsonData = XLSX.utils.sheet_to_json(sheet, { header: 1 }) as any[][];
  const productionData: ProductionData[] = [];
  
  // Start from row 4 (0-indexed row 3)
  for (let i = 3; i < jsonData.length; i++) {
    const row = jsonData[i];
    if (row[0] && row[2] && row[3] && row[6]) {
      // Skip special codes like MR-20-J, CT-16-J
      if (typeof row[0] === 'string' && row[0].match(/^[A-Z]{2}-\d{2}-[A-Z]$/)) {
        continue;
      }
      productionData.push({
        date: formatDate(row[0]),
        quality: row[2],
        gsm: parseFloat(row[3]) || 0,
        production: parseFloat(row[6]) || 0,
        speed: parseFloat(row[5]) || 0
      });
    }
  }
  
  return productionData;
}

function parseConsumptionSheet(workbook: XLSX.WorkBook): Map<string, RawMaterialConsumption[]> {
  const sheet = workbook.Sheets['Consumption'];
  if (!sheet) return new Map();
  
  const jsonData = XLSX.utils.sheet_to_json(sheet, { header: 1 }) as any[][];
  const consumptionMap = new Map<string, RawMaterialConsumption[]>();
  
  // Get material names from row 2 and rates from row 4
  const materials: string[] = [];
  const rates: number[] = [];
  
  for (let col = 1; col < jsonData[1].length; col++) {
    if (jsonData[1][col]) {
      materials.push(jsonData[1][col]);
      rates.push(parseFloat(jsonData[3][col]) || 0);
    }
  }
  
  // Parse consumption data starting from row 5
  for (let row = 4; row < jsonData.length; row++) {
    const dateValue = jsonData[row][0];
    if (!dateValue) continue;
    
    const date = formatDate(dateValue);
    const dayConsumption: RawMaterialConsumption[] = [];
    
    for (let col = 1; col <= materials.length; col++) {
      const quantity = parseFloat(jsonData[row][col]) || 0;
      if (quantity > 0) {
        dayConsumption.push({
          date,
          material: materials[col - 1],
          quantity,
          rate: rates[col - 1],
          amount: quantity * rates[col - 1]
        });
      }
    }
    
    if (dayConsumption.length > 0) {
      consumptionMap.set(date, dayConsumption);
    }
  }
  
  return consumptionMap;
}

function parseChemicalSheet(workbook: XLSX.WorkBook): Map<string, ChemicalConsumption[]> {
  const sheet = workbook.Sheets['Pulp & Chemical consumption'];
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
  utilityData: Map<string, UtilityConsumption>
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
    
    // Calculate fiber cost
    const dayConsumption = consumptionData.get(date) || [];
    const fiberCost = dayConsumption.reduce((sum, c) => sum + c.amount, 0);
    
    // Calculate chemical cost
    const dayChemicals = chemicalData.get(date) || [];
    const chemicalsCost = dayChemicals.reduce((sum, c) => {
      const rate = CHEMICAL_RATES[c.chemical] || CHEMICAL_RATES.default;
      return sum + (c.quantity * rate);
    }, 0);
    
    // Calculate utility costs based on actual consumption data or estimates
    const utilityConsumption = utilityData.get(date);
    let steamCost: number;
    let lpgCost: number;
    let electricityCost: number;
    let waterCost: number;
    
    if (utilityConsumption) {
      // Use actual consumption data
      steamCost = utilityConsumption.steam * UTILITY_RATES.steam;
      lpgCost = utilityConsumption.lpg * 1000 * UTILITY_RATES.lpg; // Convert MT to kg
      waterCost = utilityConsumption.water * UTILITY_RATES.water;
      
      // Calculate electricity based on production if not available
      // Assuming 1100 kWh per MT production
      electricityCost = utilityConsumption.power > 0 
        ? utilityConsumption.power * UTILITY_RATES.electricity
        : totalProduction * 1100 * UTILITY_RATES.electricity;
    } else {
      // Use estimates based on typical tissue manufacturing ratios
      steamCost = totalProduction * 3.2 * UTILITY_RATES.steam; // 3.2 MT steam per MT tissue
      lpgCost = totalProduction * 25 * UTILITY_RATES.lpg; // 25 kg LPG per MT
      electricityCost = totalProduction * 1100 * UTILITY_RATES.electricity; // 1100 kWh per MT
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
    
    costingData.push({
      date,
      totalProduction,
      totalCost,
      costPerKg: totalCost / (totalProduction * 1000),
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
      rawMaterials: dayConsumption,
      chemicals: dayChemicals
    });
  });
  
  return costingData.sort((a, b) => a.date.localeCompare(b.date));
}

function formatDate(dateValue: any): string {
  if (!dateValue) return '';
  
  // Handle Excel date serial number
  if (typeof dateValue === 'number') {
    const excelDate = new Date((dateValue - 25569) * 86400 * 1000);
    return dayjs(excelDate).format('YYYY-MM-DD');
  }
  
  // Handle date string
  if (typeof dateValue === 'string') {
    return dayjs(dateValue).format('YYYY-MM-DD');
  }
  
  // Handle Date object
  if (dateValue instanceof Date) {
    return dayjs(dateValue).format('YYYY-MM-DD');
  }
  
  return '';
}