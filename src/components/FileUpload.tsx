import React, { useState, useCallback } from 'react';
import { 
  Box, 
  Button, 
  Typography, 
  Paper, 
  Alert,
  CircularProgress,
  Fade,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  ListItemButton,
  Collapse,
  LinearProgress,
  Stack,
  Chip
} from '@mui/material';
import {
  CloudUpload as CloudUploadIcon,
  CheckCircle,
  Error as ErrorIcon,
  Description,
  ExpandLess,
  ExpandMore,
  InsertDriveFile
} from '@mui/icons-material';
import * as XLSX from 'xlsx';
import dayjs from 'dayjs';
import customParseFormat from 'dayjs/plugin/customParseFormat';
import { QualityData } from '../types';
import { getAllColumnMappings } from '../utils/columnMappings';
import { analyzeExcelStructure } from '../utils/analyzeExcel';

dayjs.extend(customParseFormat);

interface FileUploadProps {
  onDataParsed: (data: QualityData[], fileName: string) => void;
}

interface UploadStatus {
  stage: 'idle' | 'reading' | 'parsing' | 'analyzing' | 'complete' | 'error';
  progress: number;
  message: string;
  details?: string[];
}

const FileUpload: React.FC<FileUploadProps> = ({ onDataParsed }) => {
  const [status, setStatus] = useState<UploadStatus>({
    stage: 'idle',
    progress: 0,
    message: ''
  });
  const [dragActive, setDragActive] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  const [fileInfo, setFileInfo] = useState<{ name: string; size: string } | null>(null);

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      parseExcelFile(e.dataTransfer.files[0]);
    }
  }, []);

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const parseExcelFile = async (file: File) => {
    setFileInfo({
      name: file.name,
      size: formatFileSize(file.size)
    });
    
    const details: string[] = [];
    
    try {
      // Reading stage
      setStatus({ stage: 'reading', progress: 20, message: 'Reading file...', details });
      await new Promise(resolve => setTimeout(resolve, 500));

      const reader = new FileReader();
      
      reader.onload = async (e) => {
        try {
          const data = e.target?.result;
          
          // Parsing stage
          setStatus({ stage: 'parsing', progress: 40, message: 'Parsing Excel data...', details });
          const workbook = XLSX.read(data, { type: 'binary', cellDates: true });
          
          if (!workbook.Sheets['DATA']) {
            throw new Error('No "DATA" sheet found in the Excel file');
          }
          
          details.push(`✓ Found DATA sheet`);
          setStatus({ stage: 'parsing', progress: 50, message: 'Parsing Excel data...', details });

          const worksheet = workbook.Sheets['DATA'];
          const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1, raw: false, dateNF: 'yyyy-mm-dd' }) as any[][];
          
          details.push(`✓ Found ${jsonData.length - 1} data rows`);
          
          // Analyzing stage
          setStatus({ stage: 'analyzing', progress: 60, message: 'Analyzing columns...', details });
          
          const parsedData: QualityData[] = [];
          const headerRow = jsonData[0] || [];
          
          // Get column mappings
          // Note: 'GSM' column refers to quality grade, 'GSM g/m2' is the actual measurement
          const getColumnMappings = getAllColumnMappings();
          const columnMap = getColumnMappings(headerRow);
          
          const mappedColumns = Object.keys(columnMap).length;
          details.push(`✓ Mapped ${mappedColumns} columns`);
          setStatus({ stage: 'analyzing', progress: 70, message: 'Processing data...', details });
          
          // Analyze file structure in development
          if (process.env.NODE_ENV === 'development') {
            analyzeExcelStructure(file).catch(console.error);
          }
          
          let successfulRows = 0;
          let failedRows = 0;
          
          for (let i = 1; i < jsonData.length; i++) {
            if (i % 10 === 0) {
              const progress = 70 + (i / jsonData.length) * 25;
              setStatus({ 
                stage: 'analyzing', 
                progress, 
                message: `Processing row ${i} of ${jsonData.length - 1}...`, 
                details 
              });
            }
            
            const row = jsonData[i];
            if (!row || row.length === 0) continue;
            
            // Parse date
            const dateValue = row[0];
            if (!dateValue) {
              failedRows++;
              continue;
            }
            
            let date: string;
            try {
              if (typeof dateValue === 'string') {
                if (dateValue.match(/^\d{1,2}-\w{3}-\d{2}$/)) {
                  const parts = dateValue.split('-');
                  const day = parts[0].padStart(2, '0');
                  const month = parts[1];
                  const year = parseInt(parts[2]) < 50 ? '20' + parts[2] : '19' + parts[2];
                  date = dayjs(`${day}-${month}-${year}`, 'DD-MMM-YYYY').format('YYYY-MM-DD');
                } else if (dateValue.match(/^\d{1,2}\/\d{1,2}\/\d{2,4}$/)) {
                  date = dayjs(dateValue, ['D/M/YY', 'DD/MM/YYYY']).format('YYYY-MM-DD');
                } else {
                  date = dayjs(dateValue).format('YYYY-MM-DD');
                }
              } else if (typeof dateValue === 'number') {
                const excelDate = new Date((dateValue - 25569) * 86400 * 1000);
                date = dayjs(excelDate).format('YYYY-MM-DD');
              } else {
                date = dayjs(dateValue).format('YYYY-MM-DD');
              }
              
              if (!dayjs(date).isValid()) {
                failedRows++;
                continue;
              }
            } catch (err) {
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
            
            const dataRow: QualityData = {
              date,
              time: getValue('time', ''),
              shift: getValue('shift', ''),
              labExecutive: getValue('labExecutive', ''),
              machineShiftIncharge: getValue('machineShiftIncharge', ''),
              lotNo: getValue('lotNo', ''),
              rollNo: getValue('rollNo', ''),
              spoolNo: getValue('spoolNo', ''),
              quality: getValue('quality', ''),
              gsmGrade: getValue('gsmGrade', ''),
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
              remarks: getValue('remarks', ''),
              break: getValue('break', ''),
              machineSpeed: getValue('machineSpeed'),
              popeReelSpeed: getValue('popeReelSpeed'),
              mcDraw: getValue('mcDraw'),
              blade: getValue('blade', ''),
              nextPressLoad: getValue('nextPressLoad'),
              coating: getValue('coating'),
              coating1: getValue('coating1'),
              release: getValue('release', ''),
              map: getValue('map', ''),
              hwGrade: getValue('hwGrade', ''),
              swGrade: getValue('swGrade', ''),
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
            
            parsedData.push(dataRow);
            successfulRows++;
          }
          
          details.push(`✓ Successfully parsed ${successfulRows} rows`);
          if (failedRows > 0) {
            details.push(`⚠ Skipped ${failedRows} invalid rows`);
          }
          
          parsedData.sort((a, b) => dayjs(b.date).unix() - dayjs(a.date).unix());
          
          // Complete stage
          setStatus({ 
            stage: 'complete', 
            progress: 100, 
            message: 'Upload complete!', 
            details: [...details, `✓ Data ready for analysis`] 
          });
          
          setTimeout(() => {
            onDataParsed(parsedData, file.name);
            setStatus({ stage: 'idle', progress: 0, message: '' });
            setFileInfo(null);
          }, 1500);
          
        } catch (err) {
          console.error('Error parsing Excel:', err);
          setStatus({ 
            stage: 'error', 
            progress: 0, 
            message: err instanceof Error ? err.message : 'Failed to parse Excel file',
            details: [...details, `✗ ${err instanceof Error ? err.message : 'Unknown error'}`]
          });
        }
      };

      reader.readAsBinaryString(file);
    } catch (err) {
      setStatus({ 
        stage: 'error', 
        progress: 0, 
        message: 'Failed to read file',
        details
      });
    }
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      parseExcelFile(file);
    }
  };

  const isUploading = status.stage !== 'idle' && status.stage !== 'complete' && status.stage !== 'error';

  return (
    <Paper 
      sx={{ 
        p: 4,
        position: 'relative',
        overflow: 'hidden',
        transition: 'all 0.3s ease',
        transform: dragActive ? 'scale(1.02)' : 'scale(1)',
        boxShadow: dragActive ? 4 : 1,
      }}
      onDragEnter={handleDrag}
      onDragLeave={handleDrag}
      onDragOver={handleDrag}
      onDrop={handleDrop}
    >
      <Typography variant="h5" gutterBottom align="center">
        Upload Excel File
      </Typography>
      
      <Box
        sx={{
          border: 2,
          borderStyle: 'dashed',
          borderColor: dragActive ? 'primary.main' : 'divider',
          borderRadius: 2,
          p: 4,
          textAlign: 'center',
          bgcolor: dragActive ? 'action.hover' : 'background.default',
          transition: 'all 0.3s ease',
          cursor: isUploading ? 'not-allowed' : 'pointer',
          minHeight: 200,
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'center',
        }}
      >
        {status.stage === 'idle' && (
          <Fade in={true}>
            <Box>
              <CloudUploadIcon sx={{ fontSize: 64, color: 'action.disabled', mb: 2 }} />
              <Typography variant="h6" gutterBottom>
                Drag & Drop your Excel file here
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                or click to browse
              </Typography>
              <Button
                variant="contained"
                component="label"
                startIcon={<CloudUploadIcon />}
                size="large"
                disabled={isUploading}
              >
                Choose File
                <input
                  type="file"
                  hidden
                  accept=".xlsx,.xls,.xlsm"
                  onChange={handleFileSelect}
                />
              </Button>
            </Box>
          </Fade>
        )}

        {(status.stage === 'reading' || status.stage === 'parsing' || status.stage === 'analyzing') && (
          <Fade in={true}>
            <Box sx={{ width: '100%' }}>
              <CircularProgress size={60} sx={{ mb: 2 }} />
              <Typography variant="h6" gutterBottom>
                {status.message}
              </Typography>
              <Box sx={{ width: '100%', mt: 2 }}>
                <LinearProgress variant="determinate" value={status.progress} />
                <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                  {status.progress}% complete
                </Typography>
              </Box>
            </Box>
          </Fade>
        )}

        {status.stage === 'complete' && (
          <Fade in={true}>
            <Box>
              <CheckCircle sx={{ fontSize: 64, color: 'success.main', mb: 2 }} />
              <Typography variant="h6" color="success.main" gutterBottom>
                {status.message}
              </Typography>
            </Box>
          </Fade>
        )}

        {status.stage === 'error' && (
          <Fade in={true}>
            <Box>
              <ErrorIcon sx={{ fontSize: 64, color: 'error.main', mb: 2 }} />
              <Typography variant="h6" color="error.main" gutterBottom>
                Upload Failed
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {status.message}
              </Typography>
              <Button
                variant="outlined"
                sx={{ mt: 2 }}
                onClick={() => {
                  setStatus({ stage: 'idle', progress: 0, message: '' });
                  setFileInfo(null);
                }}
              >
                Try Again
              </Button>
            </Box>
          </Fade>
        )}
      </Box>

      {/* File Info and Details */}
      {fileInfo && status.details && status.details.length > 0 && (
        <Box sx={{ mt: 3 }}>
          <Stack direction="row" spacing={2} alignItems="center" sx={{ mb: 2 }}>
            <InsertDriveFile />
            <Typography variant="body1">{fileInfo.name}</Typography>
            <Chip label={fileInfo.size} size="small" />
          </Stack>
          
          <List dense>
            <ListItemButton onClick={() => setShowDetails(!showDetails)}>
              <ListItemIcon>
                <Description />
              </ListItemIcon>
              <ListItemText primary="Processing Details" />
              {showDetails ? <ExpandLess /> : <ExpandMore />}
            </ListItemButton>
            <Collapse in={showDetails} timeout="auto" unmountOnExit>
              <List component="div" disablePadding>
                {status.details.map((detail, index) => (
                  <ListItem key={index} sx={{ pl: 4 }}>
                    <ListItemText 
                      primary={detail} 
                      primaryTypographyProps={{ variant: 'body2' }}
                    />
                  </ListItem>
                ))}
              </List>
            </Collapse>
          </List>
        </Box>
      )}
      
      <Box sx={{ mt: 3 }}>
        <Alert severity="info" variant="outlined">
          <Typography variant="body2">
            <strong>Supported formats:</strong> .xlsx, .xls, .xlsm files with a "DATA" sheet
          </Typography>
          <Typography variant="body2">
            <strong>Expected date format:</strong> 1-Jan-25 or similar in the first column
          </Typography>
        </Alert>
      </Box>
    </Paper>
  );
};

export default FileUpload;