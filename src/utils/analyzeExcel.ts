import * as XLSX from 'xlsx';

export const analyzeExcelStructure = (file: File): Promise<void> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = (e) => {
      try {
        const data = e.target?.result;
        const workbook = XLSX.read(data, { type: 'binary' });
        
        console.log('=== Excel File Analysis ===');
        console.log('Sheet Names:', workbook.SheetNames);
        
        // Analyze DATA sheet
        if (workbook.Sheets['DATA']) {
          const worksheet = workbook.Sheets['DATA'];
          const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as any[][];
          
          console.log('\n=== DATA Sheet Structure ===');
          console.log('Total Rows:', jsonData.length);
          
          // Get headers (first row)
          const headers = jsonData[0] || [];
          console.log('\nColumn Headers:');
          headers.forEach((header, index) => {
            console.log(`Column ${index}: ${header}`);
          });
          
          // Show sample data
          if (jsonData.length > 1) {
            console.log('\nSample Data (First 3 rows):');
            for (let i = 1; i <= Math.min(3, jsonData.length - 1); i++) {
              console.log(`Row ${i}:`, jsonData[i]);
            }
          }
        }
        
        resolve();
      } catch (err) {
        console.error('Error analyzing Excel:', err);
        reject(err);
      }
    };
    
    reader.readAsBinaryString(file);
  });
};