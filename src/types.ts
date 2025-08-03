export interface QualityData {
  // Production Metadata
  date: string;
  time?: string;
  shift?: string;
  labExecutive?: string;
  machineShiftIncharge?: string;
  lotNo?: string;
  rollNo?: string;
  spoolNo?: string;
  
  // Product Quality Metrics
  quality?: string;
  gsm: number;
  gsmLcl: number;
  gsmUcl: number;
  thickness: number;  // in µm
  thicknessLcl: number;
  thicknessUcl: number;
  bulk: number;  // cc/gm
  bulkLcl: number;
  bulkUcl: number;
  
  // Tensile Strength
  tensileStrengthMD: number;  // Dry Strength MD
  tensileStrengthMDLcl: number;
  tensileStrengthMDUcl: number;
  tensileStrengthCD: number;  // Dry Strength CD
  tensileStrengthCDLcl: number;
  tensileStrengthCDUcl: number;
  mdCdRatio?: number;
  
  // Additional Strength Metrics
  stretchElongation?: number;  // %
  wetTensile?: number;  // gf/50mm
  wetDryTensileRatio?: number;  // %
  grossMeanStrength?: number;
  machineCreepPercent?: number;
  
  // Optical Properties
  brightness: number;  // % ISO
  brightnessLcl: number;
  brightnessUcl: number;
  opacity?: number;  // %
  opacityLcl?: number;
  opacityUcl?: number;
  moistureContent: number;  // %
  moistureContentLcl: number;
  moistureContentUcl: number;
  
  // Defect/Remark Logging
  remarks?: string;
  break?: string;
  
  // Machine Parameters
  machineSpeed?: number;  // Mpm
  popeReelSpeed?: number;  // Mpm
  mcDraw?: number;
  blade?: string;
  nextPressLoad?: number;
  coating?: number;
  coating1?: number;
  release?: string;
  map?: string;
  
  // Fiber & Consumption Inputs
  hwGrade?: string;
  swGrade?: string;
  hwCy?: number;
  hwSr?: number;
  swCy?: number;
  swOsr?: number;
  shortFiberPercent?: number;  // %
  longFiberPercent?: number;  // %
  brokePercent?: number;  // %
  wsrKgHrs?: number;  // Kg/Hrs
  dsrKgHrs?: number;  // Kg/Hrs
  
  // Dynamic fields
  [key: string]: number | string | undefined;
}

export interface ParsedExcelData {
  data: QualityData[];
  latestDate: string;
}

export interface Specification {
  parameter: string;
  value: number;
  lcl: number;
  ucl: number;
  unit: string;
}

export interface ColumnMapping {
  [key: string]: string[];  // key is our field name, value is array of possible column names
}