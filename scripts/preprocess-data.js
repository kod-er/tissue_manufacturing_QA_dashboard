/**
 * Pre-processes the sample Excel file into JSON for instant dashboard loading.
 * Mirrors the exact parsing logic from src/utils/parseExcelFile.ts and src/utils/columnMappings.ts
 * Run: node scripts/preprocess-data.js
 */
const XLSX = require('xlsx');
const path = require('path');
const fs = require('fs');

const INPUT = path.resolve(__dirname, '..', 'GSTPL_Control chart.xlsx');
const OUTPUT = path.resolve(__dirname, '..', 'public', 'data', 'quality-data.json');

// Exact copy of columnMappings from src/utils/columnMappings.ts
const columnMappings = {
  date: ['Date', 'DATE', 'Production Date'],
  time: ['Time', 'TIME', 'Production Time'],
  shift: ['Shift', 'SHIFT', 'Shift Name'],
  labExecutive: ['Lab Executive', 'Lab Exec', 'Lab_Executive', 'Lab Technician'],
  machineShiftIncharge: ['M/C shift incharge', 'MC Shift Incharge', 'Machine Shift Incharge', 'Shift Incharge'],
  lotNo: ['Lot No', 'Lot No.', 'Lot Number', 'LOT NO', 'Lot_No'],
  rollNo: ['Roll No', 'Roll No.', 'Roll Number', 'ROLL NO', 'Roll_No'],
  spoolNo: ['Spool no.', 'Spool No', 'Spool Number', 'SPOOL NO', 'Spool_No'],
  quality: ['Quality', 'QUALITY', 'Quality Grade'],
  gsmGrade: ['GSM'],
  gsm: ['GSM g/m2', 'GSM (g/m2)', 'Grammage', 'Basis Weight', 'GSM Value', 'GSM Measurement'],
  gsmLcl: ['GSM LCL', 'GSM Lower', 'Grammage LCL', 'GSM_LCL', 'GSM g/m2 LCL'],
  gsmUcl: ['GSM UCL', 'GSM Upper', 'Grammage UCL', 'GSM_UCL', 'GSM g/m2 UCL'],
  thickness: ['Thickness µm', 'Thickness', 'Thicness (µm)', 'Thicness', 'Caliper', 'Thickness (µm)', 'THICKNESS'],
  thicknessLcl: ['Thickness LCL', 'Thickness Lower', 'Thickness_LCL'],
  thicknessUcl: ['Thickness UCL', 'Thickness Upper', 'Thickness_UCL'],
  bulk: ['Bulk cc/gm', 'Bulk', 'Specific Volume', 'Bulk (cc/gm)', 'BULK'],
  bulkLcl: ['Bulk LCL', 'Bulk Lower', 'Bulk_LCL'],
  bulkUcl: ['Bulk UCL', 'Bulk Upper', 'Bulk_UCL'],
  tensileStrengthMD: ['Dry Strength (MD)', 'Dry Strength MD', 'Tensile MD', 'TS MD', 'MD Tensile', 'Dry_Strength_MD'],
  tensileStrengthMDLcl: ['Dry Strength MD LCL', 'Tensile MD LCL', 'TS MD LCL', 'MD_LCL'],
  tensileStrengthMDUcl: ['Dry Strength MD UCL', 'Tensile MD UCL', 'TS MD UCL', 'MD_UCL'],
  tensileStrengthCD: ['Dry Strength (CD)', 'Dry Strength CD', 'Tensile CD', 'TS CD', 'CD Tensile', 'Dry_Strength_CD'],
  tensileStrengthCDLcl: ['Dry Strength CD LCL', 'Tensile CD LCL', 'TS CD LCL', 'CD_LCL'],
  tensileStrengthCDUcl: ['Dry Strength CD UCL', 'Tensile CD UCL', 'TS CD UCL', 'CD_UCL'],
  mdCdRatio: ['MD /CD Ratio', 'MD/CD Ratio', 'MD CD Ratio', 'Tensile Ratio', 'MD_CD_Ratio'],
  stretchElongation: ['Stretch / Elongation %', 'Stretch %', 'Elongation %', 'Stretch/Elongation', 'Elongation'],
  wetTensile: ['Wet Tensile gf/50mm', 'Wet Tensile', 'Wet Strength', 'Wet_Tensile'],
  wetDryTensileRatio: ['Wet / Dry Tensile    (%)', 'Wet / Dry Tensile (%)', 'Wet/Dry Tensile %', 'Wet Dry Ratio', 'Wet_Dry_Ratio'],
  grossMeanStrength: ['Gross Mean Strength', 'Mean Strength', 'Avg Strength', 'Gross_Mean_Strength'],
  machineCreepPercent: ['Macine Crrep %', 'Machine Creep %', 'Creep %', 'Machine_Creep'],
  brightness: ['Brightness % ISO', 'Brightness %', 'ISO Brightness', 'Brightness', 'BRIGHTNESS'],
  brightnessLcl: ['Brightness LCL', 'Brightness Lower', 'Brightness_LCL'],
  brightnessUcl: ['Brightness UCL', 'Brightness Upper', 'Brightness_UCL'],
  opacity: ['Opacity %', 'Opacity', 'OPACITY'],
  opacityLcl: ['Opacity LCL', 'Opacity Lower', 'Opacity_LCL'],
  opacityUcl: ['Opacity UCL', 'Opacity Upper', 'Opacity_UCL'],
  moistureContent: ['Moisture %', 'Moisture Content', 'MC', 'Moisture', 'MOISTURE'],
  moistureContentLcl: ['Moisture LCL', 'MC LCL', 'Moisture_LCL'],
  moistureContentUcl: ['Moisture UCL', 'MC UCL', 'Moisture_UCL'],
  remarks: ['Remarks', 'REMARKS', 'Comments', 'Notes'],
  break: ['Break', 'BREAK', 'Breaks', 'Break Count'],
  machineSpeed: ['Machine Speed (Mpm)', 'Machine Speed', 'Speed Mpm', 'Machine_Speed'],
  popeReelSpeed: ['Pope reel Speed (Mpm)', 'Pope Reel Speed', 'Reel Speed', 'Pope_Reel_Speed'],
  mcDraw: ['MC Draw', 'Machine Draw', 'Draw', 'MC_Draw'],
  blade: ['Blade', 'BLADE', 'Blade Type'],
  nextPressLoad: ['Next Press load', 'Press Load', 'Next_Press_Load'],
  coating: ['Coating', 'COATING', 'Coating Level'],
  coating1: ['Coating .1', 'Coating.1', 'Coating 1', 'Secondary Coating'],
  release: ['Release', 'RELEASE', 'Release Agent'],
  map: ['Map', 'MAP', 'Process Map'],
  hwGrade: ['HW GRADE', 'HW Grade', 'Hardwood Grade', 'HW_GRADE'],
  swGrade: ['SW GRADE', 'SW Grade', 'Softwood Grade', 'SW_GRADE'],
  hwCy: ['HW CY', 'HW Consistency', 'HW_CY'],
  hwSr: ['HW SR', 'HW Schopper', 'HW_SR'],
  swCy: ['SW CY', 'SW Consistency', 'SW_CY'],
  swOsr: ['SW OSR', 'SW Schopper', 'SW_OSR'],
  mcSr: ['M/C SR', 'MC SR', 'Machine SR', 'M_C_SR'],
  shortFiberPercent: ['Short Fiber (%)', 'Short Fiber %', 'SF %', 'Short_Fiber'],
  longFiberPercent: ['Long Fiber (%)', 'Long Fiber %', 'LF %', 'Long_Fiber'],
  brokePercent: ['Broke (%)', 'Broke %', 'Broke Percentage', 'BROKE'],
  wsrKgHrs: ['Wsr Kg/Hrs', 'WSR Kg/Hr', 'Water Soluble Rate', 'WSR'],
  dsrKgHrs: ['DSR Kg/Hrs', 'DSR Kg/Hr', 'Dry Soluble Rate', 'DSR'],
};

// Exact copy of findColumnIndex from src/utils/columnMappings.ts
function findColumnIndex(headerRow, possibleNames) {
  for (const name of possibleNames) {
    const index = headerRow.findIndex(h => h && h.toString().trim() === name);
    if (index !== -1) return index;
  }
  for (const name of possibleNames) {
    const index = headerRow.findIndex(h => h && h.toString().trim().toLowerCase() === name.toLowerCase());
    if (index !== -1) return index;
  }
  for (const name of possibleNames) {
    const index = headerRow.findIndex(h => h && h.toString().toLowerCase().includes(name.toLowerCase()));
    if (index !== -1) return index;
  }
  return -1;
}

function parseDate(value) {
  if (!value) return null;
  if (typeof value === 'number') {
    const d = new Date((value - 25569) * 86400 * 1000);
    const y = d.getUTCFullYear();
    const m = String(d.getUTCMonth() + 1).padStart(2, '0');
    const day = String(d.getUTCDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  }
  const str = String(value).trim();
  // "1-Jan-25" format
  const m1 = str.match(/^(\d{1,2})-(\w{3})-(\d{2})$/);
  if (m1) {
    const months = { jan:'01',feb:'02',mar:'03',apr:'04',may:'05',jun:'06',jul:'07',aug:'08',sep:'09',oct:'10',nov:'11',dec:'12' };
    const day = m1[1].padStart(2, '0');
    const mon = months[m1[2].toLowerCase()];
    const year = parseInt(m1[3]) < 50 ? '20' + m1[3] : '19' + m1[3];
    if (mon) return `${year}-${mon}-${day}`;
  }
  // DD/MM/YYYY
  const m2 = str.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (m2) return `${m2[3]}-${m2[2].padStart(2,'0')}-${m2[1].padStart(2,'0')}`;
  // ISO
  const d = new Date(str);
  if (!isNaN(d.getTime())) return d.toISOString().split('T')[0];
  return null;
}

// Main
const workbook = XLSX.readFile(INPUT);
const sheet = workbook.Sheets['DATA'];
if (!sheet) { console.error('No DATA sheet found'); process.exit(1); }

const raw = XLSX.utils.sheet_to_json(sheet, { header: 1 });
const headers = raw[0].map(h => h ? h.toString().trim() : '');

// Build column map using the same logic as getAllColumnMappings
const columnMap = {};
for (const [fieldName, possibleNames] of Object.entries(columnMappings)) {
  const index = findColumnIndex(headers, possibleNames);
  if (index !== -1) columnMap[fieldName] = index;
}

console.log('Mapped columns:', Object.keys(columnMap).length);

const rows = raw.slice(1);
const records = [];

for (const row of rows) {
  if (!row || row.length === 0) continue;

  // getValue mirrors parseExcelFile.ts lines 75-88
  const getValue = (fieldName, defaultValue = 0) => {
    const columnIndex = columnMap[fieldName];
    if (columnIndex === undefined || columnIndex === -1) return defaultValue;
    const value = row[columnIndex];
    if (value === undefined || value === null || value === '') return defaultValue;
    if (typeof defaultValue === 'number') {
      const parsed = parseFloat(value);
      return isNaN(parsed) ? defaultValue : parsed;
    }
    return value;
  };

  const dateIndex = columnMap['date'];
  if (dateIndex === undefined || dateIndex === -1 || !row[dateIndex]) continue;
  const date = parseDate(row[dateIndex]);
  if (!date) continue;

  // Format time — mirrors parseExcelFile.ts lines 92-101
  const timeValue = getValue('time', '');
  let formattedTime = '';
  if (timeValue && typeof timeValue === 'number') {
    const hours = Math.floor(timeValue);
    const minutes = Math.round((timeValue - hours) * 60);
    formattedTime = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
  } else {
    formattedTime = String(timeValue || '');
  }

  // Build the record — exact mirror of parseExcelFile.ts lines 103-167
  const record = {
    date,
    time: formattedTime,
    shift: String(getValue('shift', '') || ''),
    labExecutive: String(getValue('labExecutive', '') || ''),
    machineShiftIncharge: String(getValue('machineShiftIncharge', '') || ''),
    lotNo: String(getValue('lotNo', '') || ''),
    rollNo: String(getValue('rollNo', '') || ''),
    spoolNo: String(getValue('spoolNo', '') || ''),
    quality: String(getValue('quality', '') || ''),
    gsmGrade: String(getValue('gsmGrade', '') || ''),
    gsm: getValue('gsm'),
    gsmLcl: getValue('gsmLcl', getValue('gsm') * 0.95),
    gsmUcl: getValue('gsmUcl', getValue('gsm') * 1.05),
    thickness: getValue('thickness'),
    thicknessLcl: getValue('thicknessLcl', getValue('thickness') * 0.95),
    thicknessUcl: getValue('thicknessUcl', getValue('thickness') * 1.05),
    bulk: getValue('bulk'),
    bulkLcl: getValue('bulkLcl', getValue('bulk') * 0.95),
    bulkUcl: getValue('bulkUcl', getValue('bulk') * 1.05),
    tensileStrengthMD: getValue('tensileStrengthMD'),
    tensileStrengthMDLcl: getValue('tensileStrengthMDLcl', getValue('tensileStrengthMD') * 0.9),
    tensileStrengthMDUcl: getValue('tensileStrengthMDUcl', getValue('tensileStrengthMD') * 1.1),
    tensileStrengthCD: getValue('tensileStrengthCD'),
    tensileStrengthCDLcl: getValue('tensileStrengthCDLcl', getValue('tensileStrengthCD') * 0.9),
    tensileStrengthCDUcl: getValue('tensileStrengthCDUcl', getValue('tensileStrengthCD') * 1.1),
    mdCdRatio: getValue('mdCdRatio') || (getValue('tensileStrengthMD') && getValue('tensileStrengthCD') ? getValue('tensileStrengthMD') / getValue('tensileStrengthCD') : 0),
    stretchElongation: getValue('stretchElongation'),
    wetTensile: getValue('wetTensile'),
    wetDryTensileRatio: getValue('wetDryTensileRatio'),
    grossMeanStrength: getValue('grossMeanStrength'),
    machineCreepPercent: getValue('machineCreepPercent'),
    brightness: getValue('brightness'),
    brightnessLcl: getValue('brightnessLcl', getValue('brightness') * 0.95),
    brightnessUcl: getValue('brightnessUcl', getValue('brightness') * 1.05),
    opacity: getValue('opacity'),
    opacityLcl: getValue('opacityLcl', 40.0),
    opacityUcl: getValue('opacityUcl', 60.0),
    moistureContent: getValue('moistureContent'),
    moistureContentLcl: getValue('moistureContentLcl', 4.0),
    moistureContentUcl: getValue('moistureContentUcl', 8.0),
    remarks: String(getValue('remarks', '') || ''),
    break: String(getValue('break', '') || ''),
    machineSpeed: getValue('machineSpeed'),
    popeReelSpeed: getValue('popeReelSpeed'),
    mcDraw: getValue('mcDraw'),
    blade: String(getValue('blade', '') || ''),
    nextPressLoad: getValue('nextPressLoad'),
    coating: getValue('coating'),
    coating1: getValue('coating1'),
    release: String(getValue('release', '') || ''),
    map: String(getValue('map', '') || ''),
    hwGrade: String(getValue('hwGrade', '') || ''),
    swGrade: String(getValue('swGrade', '') || ''),
    hwCy: getValue('hwCy'),
    hwSr: getValue('hwSr'),
    swCy: getValue('swCy'),
    swOsr: getValue('swOsr'),
    mcSr: getValue('mcSr'),
    shortFiberPercent: getValue('shortFiberPercent'),
    longFiberPercent: getValue('longFiberPercent'),
    brokePercent: getValue('brokePercent'),
    wsrKgHrs: getValue('wsrKgHrs'),
    dsrKgHrs: getValue('dsrKgHrs'),
  };

  records.push(record);
}

// Sort by date descending (most recent first)
records.sort((a, b) => b.date.localeCompare(a.date));

fs.mkdirSync(path.dirname(OUTPUT), { recursive: true });
fs.writeFileSync(OUTPUT, JSON.stringify(records));

const sizeMB = (fs.statSync(OUTPUT).size / 1024 / 1024).toFixed(2);
console.log(`Wrote ${records.length} records to ${OUTPUT} (${sizeMB} MB)`);
