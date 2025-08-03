import { ColumnMapping } from '../types';

export const columnMappings: ColumnMapping = {
  // Production Metadata
  date: ['Date', 'DATE', 'Production Date'],
  time: ['Time', 'TIME', 'Production Time'],
  shift: ['Shift', 'SHIFT', 'Shift Name'],
  labExecutive: ['Lab Executive', 'Lab Exec', 'Lab_Executive', 'Lab Technician'],
  machineShiftIncharge: ['M/C shift incharge', 'MC Shift Incharge', 'Machine Shift Incharge', 'Shift Incharge'],
  lotNo: ['Lot No', 'Lot No.', 'Lot Number', 'LOT NO', 'Lot_No'],
  rollNo: ['Roll No', 'Roll No.', 'Roll Number', 'ROLL NO', 'Roll_No'],
  spoolNo: ['Spool no.', 'Spool No', 'Spool Number', 'SPOOL NO', 'Spool_No'],
  
  // Product Quality Metrics
  quality: ['Quality', 'QUALITY', 'Quality Grade'],
  gsm: ['GSM', 'GSM g/m2', 'Grammage', 'Basis Weight', 'GSM (g/m2)'],
  gsmLcl: ['GSM LCL', 'GSM Lower', 'Grammage LCL', 'GSM_LCL'],
  gsmUcl: ['GSM UCL', 'GSM Upper', 'Grammage UCL', 'GSM_UCL'],
  
  thickness: ['Thickness µm', 'Thickness', 'Caliper', 'Thickness (µm)', 'THICKNESS'],
  thicknessLcl: ['Thickness LCL', 'Thickness Lower', 'Thickness_LCL'],
  thicknessUcl: ['Thickness UCL', 'Thickness Upper', 'Thickness_UCL'],
  
  bulk: ['Bulk cc/gm', 'Bulk', 'Specific Volume', 'Bulk (cc/gm)', 'BULK'],
  bulkLcl: ['Bulk LCL', 'Bulk Lower', 'Bulk_LCL'],
  bulkUcl: ['Bulk UCL', 'Bulk Upper', 'Bulk_UCL'],
  
  // Tensile Strength
  tensileStrengthMD: ['Dry Strength (MD)', 'Dry Strength MD', 'Tensile MD', 'TS MD', 'MD Tensile', 'Dry_Strength_MD'],
  tensileStrengthMDLcl: ['Dry Strength MD LCL', 'Tensile MD LCL', 'TS MD LCL', 'MD_LCL'],
  tensileStrengthMDUcl: ['Dry Strength MD UCL', 'Tensile MD UCL', 'TS MD UCL', 'MD_UCL'],
  
  tensileStrengthCD: ['Dry Strength (CD)', 'Dry Strength CD', 'Tensile CD', 'TS CD', 'CD Tensile', 'Dry_Strength_CD'],
  tensileStrengthCDLcl: ['Dry Strength CD LCL', 'Tensile CD LCL', 'TS CD LCL', 'CD_LCL'],
  tensileStrengthCDUcl: ['Dry Strength CD UCL', 'Tensile CD UCL', 'TS CD UCL', 'CD_UCL'],
  
  mdCdRatio: ['MD /CD Ratio', 'MD/CD Ratio', 'MD CD Ratio', 'Tensile Ratio', 'MD_CD_Ratio'],
  
  // Additional Strength Metrics
  stretchElongation: ['Stretch / Elongation %', 'Stretch %', 'Elongation %', 'Stretch/Elongation', 'Elongation'],
  wetTensile: ['Wet Tensile gf/50mm', 'Wet Tensile', 'Wet Strength', 'Wet_Tensile'],
  wetDryTensileRatio: ['Wet / Dry Tensile (%)', 'Wet/Dry Tensile %', 'Wet Dry Ratio', 'Wet_Dry_Ratio'],
  grossMeanStrength: ['Gross Mean Strength', 'Mean Strength', 'Avg Strength', 'Gross_Mean_Strength'],
  machineCreepPercent: ['Macine Crrep %', 'Machine Creep %', 'Creep %', 'Machine_Creep'],
  
  // Optical Properties
  brightness: ['Brightness % ISO', 'Brightness %', 'ISO Brightness', 'Brightness', 'BRIGHTNESS'],
  brightnessLcl: ['Brightness LCL', 'Brightness Lower', 'Brightness_LCL'],
  brightnessUcl: ['Brightness UCL', 'Brightness Upper', 'Brightness_UCL'],
  
  opacity: ['Opacity %', 'Opacity', 'OPACITY'],
  opacityLcl: ['Opacity LCL', 'Opacity Lower', 'Opacity_LCL'],
  opacityUcl: ['Opacity UCL', 'Opacity Upper', 'Opacity_UCL'],
  
  moistureContent: ['Moisture %', 'Moisture Content', 'MC', 'Moisture', 'MOISTURE'],
  moistureContentLcl: ['Moisture LCL', 'MC LCL', 'Moisture_LCL'],
  moistureContentUcl: ['Moisture UCL', 'MC UCL', 'Moisture_UCL'],
  
  // Defect/Remark Logging
  remarks: ['Remarks', 'REMARKS', 'Comments', 'Notes'],
  break: ['Break', 'BREAK', 'Breaks', 'Break Count'],
  
  // Machine Parameters
  machineSpeed: ['Machine Speed (Mpm)', 'Machine Speed', 'Speed Mpm', 'Machine_Speed'],
  popeReelSpeed: ['Pope reel Speed (Mpm)', 'Pope Reel Speed', 'Reel Speed', 'Pope_Reel_Speed'],
  mcDraw: ['MC Draw', 'Machine Draw', 'Draw', 'MC_Draw'],
  blade: ['Blade', 'BLADE', 'Blade Type'],
  nextPressLoad: ['Next Press load', 'Press Load', 'Next_Press_Load'],
  coating: ['Coating', 'COATING', 'Coating Level'],
  coating1: ['Coating .1', 'Coating.1', 'Coating 1', 'Secondary Coating'],
  release: ['Release', 'RELEASE', 'Release Agent'],
  map: ['Map', 'MAP', 'Process Map'],
  
  // Fiber & Consumption Inputs
  hwGrade: ['HW GRADE', 'HW Grade', 'Hardwood Grade', 'HW_GRADE'],
  swGrade: ['SW GRADE', 'SW Grade', 'Softwood Grade', 'SW_GRADE'],
  hwCy: ['HW CY', 'HW Consistency', 'HW_CY'],
  hwSr: ['HW SR', 'HW Schopper', 'HW_SR'],
  swCy: ['SW CY', 'SW Consistency', 'SW_CY'],
  swOsr: ['SW OSR', 'SW Schopper', 'SW_OSR'],
  shortFiberPercent: ['Short Fiber (%)', 'Short Fiber %', 'SF %', 'Short_Fiber'],
  longFiberPercent: ['Long Fiber (%)', 'Long Fiber %', 'LF %', 'Long_Fiber'],
  brokePercent: ['Broke (%)', 'Broke %', 'Broke Percentage', 'BROKE'],
  wsrKgHrs: ['Wsr Kg/Hrs', 'WSR Kg/Hr', 'Water Soluble Rate', 'WSR'],
  dsrKgHrs: ['DSR Kg/Hrs', 'DSR Kg/Hr', 'Dry Soluble Rate', 'DSR'],
};

// Helper function to find column index with fuzzy matching
export const findColumnIndex = (headerRow: any[], possibleNames: string[]): number => {
  for (const name of possibleNames) {
    // Try exact match first
    let index = headerRow.findIndex((h: any) => 
      h && h.toString().trim() === name
    );
    if (index !== -1) return index;
    
    // Try case-insensitive match
    index = headerRow.findIndex((h: any) => 
      h && h.toString().trim().toLowerCase() === name.toLowerCase()
    );
    if (index !== -1) return index;
    
    // Try partial match
    index = headerRow.findIndex((h: any) => 
      h && h.toString().toLowerCase().includes(name.toLowerCase())
    );
    if (index !== -1) return index;
  }
  return -1;
};

// Get all column mappings for parsing
export const getAllColumnMappings = () => {
  const mappings: { [key: string]: number } = {};
  
  return (headerRow: any[]) => {
    Object.entries(columnMappings).forEach(([fieldName, possibleNames]) => {
      const index = findColumnIndex(headerRow, possibleNames);
      if (index !== -1) {
        mappings[fieldName] = index;
      }
    });
    
    return mappings;
  };
};