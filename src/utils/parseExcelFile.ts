import * as XLSX from 'xlsx';
import dayjs from 'dayjs';
import customParseFormat from 'dayjs/plugin/customParseFormat';
import { QualityData } from '../types';
import { getAllColumnMappings } from './columnMappings';

dayjs.extend(customParseFormat);

interface ParseResult {
  success: boolean;
  data?: QualityData[];
  error?: string;
}

export async function parseExcelFile(file: File): Promise<ParseResult> {
  return new Promise((resolve) => {
    const reader = new FileReader();
    
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        
        // Look for 'DATA' sheet specifically
        if (!workbook.Sheets['DATA']) {
          resolve({ success: false, error: 'No "DATA" sheet found in the Excel file' });
          return;
        }
        
        const worksheet = workbook.Sheets['DATA'];
        const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
        
        if (!jsonData || jsonData.length < 2) {
          resolve({ success: false, error: 'No data found in Excel file' });
          return;
        }

        // Get headers from first row - keep original case for mapping
        const headers = (jsonData[0] as any[]).map(h => 
          h ? h.toString().trim() : ''
        );

        // Get column mappings - need to call the function with headers
        const getColumnMappings = getAllColumnMappings();
        const columnMap = getColumnMappings(headers);
        
        // Debug: log mapped columns
        console.log('Column mappings found:', Object.keys(columnMap).length);
        console.log('Mapped columns:', Object.entries(columnMap).filter(([_, idx]) => idx !== -1).map(([field, idx]) => `${field} -> column ${idx}`));
        
        const parsedData: QualityData[] = [];
        let successfulRows = 0;
        let failedRows = 0;

        // Process data rows
        for (let i = 1; i < jsonData.length; i++) {
          const row = jsonData[i] as any[];
          if (!row || row.length === 0) continue;

          try {
            // Parse date first
            const dateIndex = columnMap['date'];
            if (dateIndex === undefined || dateIndex === -1 || !row[dateIndex]) {
              failedRows++;
              continue;
            }
            
            const dateValue = parseDate(row[dateIndex]);
            if (!dateValue) {
              failedRows++;
              continue;
            }
            
            // Helper function to get value from row
            const getValue = (fieldName: string, defaultValue: any = 0): any => {
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
            
            // Build complete data row with all fields
            const rowData: QualityData = {
              date: dateValue,
              time: String(getValue('time', '') || ''),
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
              shortFiberPercent: getValue('shortFiberPercent'),
              longFiberPercent: getValue('longFiberPercent'),
              brokePercent: getValue('brokePercent'),
              wsrKgHrs: getValue('wsrKgHrs'),
              dsrKgHrs: getValue('dsrKgHrs'),
            };

            parsedData.push(rowData);
            successfulRows++;
            if (successfulRows === 1) {
              console.log('First parsed row:', rowData);
            }
          } catch (error) {
            failedRows++;
          }
        }

        if (parsedData.length === 0) {
          resolve({ 
            success: false, 
            error: 'No valid data could be parsed from the Excel file' 
          });
          return;
        }

        // Sort by date (most recent first)
        parsedData.sort((a, b) => b.date.localeCompare(a.date));

        resolve({ 
          success: true, 
          data: parsedData 
        });
      } catch (error) {
        resolve({ 
          success: false, 
          error: error instanceof Error ? error.message : 'Failed to parse Excel file' 
        });
      }
    };

    reader.onerror = () => {
      resolve({ 
        success: false, 
        error: 'Failed to read file' 
      });
    };

    reader.readAsArrayBuffer(file);
  });
}

function parseDate(value: any): string | null {
  if (!value) return null;

  try {
    // Handle Excel date serial number
    if (typeof value === 'number') {
      const excelDate = new Date((value - 25569) * 86400 * 1000);
      return dayjs(excelDate).format('YYYY-MM-DD');
    }

    // Handle string dates
    if (typeof value === 'string') {
      // Check for specific format like "1-Jan-25"
      if (value.match(/^\d{1,2}-\w{3}-\d{2}$/)) {
        const parts = value.split('-');
        const day = parts[0].padStart(2, '0');
        const month = parts[1];
        const year = parseInt(parts[2]) < 50 ? '20' + parts[2] : '19' + parts[2];
        const parsed = dayjs(`${day}-${month}-${year}`, 'DD-MMM-YYYY');
        if (parsed.isValid()) {
          return parsed.format('YYYY-MM-DD');
        }
      }
      
      // Try other date formats
      const formats = [
        'DD-MMM-YY',
        'DD/MM/YYYY',
        'MM/DD/YYYY',
        'D/M/YY',
        'YYYY-MM-DD',
        'DD-MM-YYYY'
      ];

      for (const format of formats) {
        const parsed = dayjs(value, format);
        if (parsed.isValid()) {
          return parsed.format('YYYY-MM-DD');
        }
      }
      
      // Try parsing without format
      const parsed = dayjs(value);
      if (parsed.isValid()) {
        return parsed.format('YYYY-MM-DD');
      }
    }

    // Handle Date object
    if (value instanceof Date) {
      return dayjs(value).format('YYYY-MM-DD');
    }
  } catch (err) {
    console.error('Date parsing error:', err, 'Value:', value);
  }

  return null;
}