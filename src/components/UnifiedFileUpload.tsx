import React, { useState, useCallback } from 'react';
import {
  Box,
  Button,
  Typography,
  Paper,
  Alert,
  CircularProgress,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Collapse,
  LinearProgress,
  Chip,
  Card,
  CardContent,
  Grid,
  IconButton,
  Divider
} from '@mui/material';
import {
  CloudUpload as CloudUploadIcon,
  CheckCircle,
  Error as ErrorIcon,
  ExpandLess,
  ExpandMore,
  Description,
  AttachFile,
  Close as CloseIcon,
  CurrencyRupee,
  Assessment
} from '@mui/icons-material';
import { useDropzone } from 'react-dropzone';
import { QualityData } from '../types';
import { CostingData } from '../utils/parseCostingData';
import { parseExcelFile } from '../utils/parseExcelFile';
import { parseCostingExcel } from '../utils/parseCostingData';

interface UnifiedFileUploadProps {
  onQualityDataParsed: (data: QualityData[], fileName: string) => void;
  onCostingDataParsed: (data: CostingData[]) => void;
  qualityData?: QualityData[];
  costingData?: CostingData[];
}

interface FileStatus {
  controlChart: {
    uploaded: boolean;
    fileName: string | null;
    recordCount: number;
    error: string | null;
  };
  costingReport: {
    uploaded: boolean;
    fileName: string | null;
    recordCount: number;
    error: string | null;
  };
}

interface ParseStatus {
  loading: boolean;
  type: 'control' | 'costing' | null;
  message: string;
  details: string[];
  showDetails: boolean;
}

const UnifiedFileUpload: React.FC<UnifiedFileUploadProps> = ({
  onQualityDataParsed,
  onCostingDataParsed,
  qualityData,
  costingData
}) => {
  const [fileStatus, setFileStatus] = useState<FileStatus>({
    controlChart: {
      uploaded: !!qualityData && qualityData.length > 0,
      fileName: null,
      recordCount: qualityData?.length || 0,
      error: null
    },
    costingReport: {
      uploaded: !!costingData && costingData.length > 0,
      fileName: null,
      recordCount: costingData?.length || 0,
      error: null
    }
  });

  const [parseStatus, setParseStatus] = useState<ParseStatus>({
    loading: false,
    type: null,
    message: '',
    details: [],
    showDetails: false
  });

  const detectFileType = (fileName: string): 'control' | 'costing' | 'unknown' => {
    const lowerName = fileName.toLowerCase();
    if (lowerName.includes('control') || lowerName.includes('chart')) {
      return 'control';
    } else if (lowerName.includes('production') || lowerName.includes('consumption')) {
      return 'costing';
    }
    return 'unknown';
  };

  const handleControlChartUpload = async (file: File) => {
    setParseStatus({
      loading: true,
      type: 'control',
      message: 'Processing Control Chart...',
      details: [`Reading ${file.name}...`],
      showDetails: true
    });

    try {
      const details: string[] = [];
      details.push(`✓ File: ${file.name}`);
      details.push(`✓ Size: ${(file.size / 1024 / 1024).toFixed(2)} MB`);

      setParseStatus(prev => ({ ...prev, details }));

      // Parse the control chart
      const result = await parseExcelFile(file);
      
      if (!result.success || !result.data) {
        throw new Error(result.error || 'Failed to parse file');
      }

      const recordCount = result.data!.length;
      details.push(`✓ Found ${recordCount} quality records`);
      details.push(`✓ Date range: ${result.data![0].date} to ${result.data![recordCount - 1].date}`);

      setFileStatus(prev => ({
        ...prev,
        controlChart: {
          uploaded: true,
          fileName: file.name,
          recordCount: recordCount,
          error: null
        }
      }));

      setParseStatus({
        loading: false,
        type: 'control',
        message: 'Control Chart loaded successfully!',
        details,
        showDetails: true
      });

      onQualityDataParsed(result.data!, file.name);
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Failed to parse Control Chart';
      setFileStatus(prev => ({
        ...prev,
        controlChart: {
          ...prev.controlChart,
          error: errorMsg
        }
      }));

      setParseStatus({
        loading: false,
        type: 'control',
        message: 'Failed to load Control Chart',
        details: [...parseStatus.details, `✗ ${errorMsg}`],
        showDetails: true
      });
    }
  };

  const handleCostingReportUpload = async (file: File) => {
    setParseStatus({
      loading: true,
      type: 'costing',
      message: 'Processing Production & Consumption Report...',
      details: [`Reading ${file.name}...`],
      showDetails: true
    });

    try {
      const details: string[] = [];
      details.push(`✓ File: ${file.name}`);
      details.push(`✓ Size: ${(file.size / 1024 / 1024).toFixed(2)} MB`);

      setParseStatus(prev => ({ ...prev, details }));

      // Parse the costing report
      const costingData = await parseCostingExcel(file);
      
      if (costingData.length === 0) {
        throw new Error('No valid costing data found in the file');
      }

      details.push(`✓ Found ${costingData.length} days of production data`);
      
      const totalProduction = costingData.reduce((sum, d) => sum + d.totalProduction, 0);
      const totalCost = costingData.reduce((sum, d) => sum + d.totalCost, 0);
      
      details.push(`✓ Total Production: ${totalProduction.toFixed(2)} MT`);
      details.push(`✓ Total Cost: ₹${(totalCost / 100000).toFixed(2)} Lakhs`);

      setFileStatus(prev => ({
        ...prev,
        costingReport: {
          uploaded: true,
          fileName: file.name,
          recordCount: costingData.length,
          error: null
        }
      }));

      setParseStatus({
        loading: false,
        type: 'costing',
        message: 'Production & Consumption Report loaded successfully!',
        details,
        showDetails: true
      });

      onCostingDataParsed(costingData);
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Failed to parse Costing Report';
      setFileStatus(prev => ({
        ...prev,
        costingReport: {
          ...prev.costingReport,
          error: errorMsg
        }
      }));

      setParseStatus({
        loading: false,
        type: 'costing',
        message: 'Failed to load Costing Report',
        details: [...parseStatus.details, `✗ ${errorMsg}`],
        showDetails: true
      });
    }
  };

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    if (acceptedFiles.length === 0) return;

    const file = acceptedFiles[0];
    const fileType = detectFileType(file.name);

    if (fileType === 'control') {
      await handleControlChartUpload(file);
    } else if (fileType === 'costing') {
      await handleCostingReportUpload(file);
    } else {
      // Show selection dialog
      setParseStatus({
        loading: false,
        type: null,
        message: 'Please specify the file type',
        details: ['Unable to auto-detect file type. Please choose:'],
        showDetails: true
      });
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
      'application/vnd.ms-excel': ['.xls']
    },
    maxFiles: 1
  });

  const clearFile = (type: 'control' | 'costing') => {
    if (type === 'control') {
      setFileStatus(prev => ({
        ...prev,
        controlChart: {
          uploaded: false,
          fileName: null,
          recordCount: 0,
          error: null
        }
      }));
      onQualityDataParsed([], '');
    } else {
      setFileStatus(prev => ({
        ...prev,
        costingReport: {
          uploaded: false,
          fileName: null,
          recordCount: 0,
          error: null
        }
      }));
      onCostingDataParsed([]);
    }
  };

  return (
    <Box>
      <Typography variant="h5" gutterBottom>
        Upload Excel Files
      </Typography>
      
      <Box sx={{ display: 'flex', gap: 3, flexDirection: { xs: 'column', md: 'row' } }}>
        {/* Control Chart Upload */}
        <Box sx={{ flex: 1 }}>
          <Card variant="outlined">
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <Assessment sx={{ mr: 1, color: 'primary.main' }} />
                <Typography variant="h6">
                  Control Chart Excel
                </Typography>
              </Box>
              
              {fileStatus.controlChart.uploaded ? (
                <Box>
                  <Alert 
                    severity="success" 
                    action={
                      <IconButton size="small" onClick={() => clearFile('control')}>
                        <CloseIcon />
                      </IconButton>
                    }
                  >
                    <Typography variant="body2">
                      {fileStatus.controlChart.fileName || 'File loaded'}
                    </Typography>
                    <Typography variant="caption">
                      {fileStatus.controlChart.recordCount} records loaded
                    </Typography>
                  </Alert>
                </Box>
              ) : (
                <Box
                  {...getRootProps()}
                  sx={{
                    p: 3,
                    border: '2px dashed',
                    borderColor: 'divider',
                    borderRadius: 1,
                    bgcolor: 'background.paper',
                    cursor: 'pointer',
                    '&:hover': {
                      borderColor: 'primary.main',
                      bgcolor: 'action.hover'
                    }
                  }}
                >
                  <input {...getInputProps()} />
                  <Box sx={{ textAlign: 'center' }}>
                    <CloudUploadIcon sx={{ fontSize: 48, color: 'action.disabled', mb: 1 }} />
                    <Typography variant="body2">
                      Drop Control Chart Excel here
                    </Typography>
                    <Typography variant="caption" color="textSecondary">
                      or click to browse
                    </Typography>
                  </Box>
                </Box>
              )}
              
              {fileStatus.controlChart.error && (
                <Alert severity="error" sx={{ mt: 2 }}>
                  {fileStatus.controlChart.error}
                </Alert>
              )}
              
              <Typography variant="caption" color="textSecondary" sx={{ mt: 1, display: 'block' }}>
                For quality metrics: GSM, Tensile Strength, etc.
              </Typography>
            </CardContent>
          </Card>
        </Box>

        {/* Costing Report Upload */}
        <Box sx={{ flex: 1 }}>
          <Card variant="outlined">
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <CurrencyRupee sx={{ mr: 1, color: 'primary.main' }} />
                <Typography variant="h6">
                  Production & Consumption Report
                </Typography>
              </Box>
              
              {fileStatus.costingReport.uploaded ? (
                <Box>
                  <Alert 
                    severity="success"
                    action={
                      <IconButton size="small" onClick={() => clearFile('costing')}>
                        <CloseIcon />
                      </IconButton>
                    }
                  >
                    <Typography variant="body2">
                      {fileStatus.costingReport.fileName || 'File loaded'}
                    </Typography>
                    <Typography variant="caption">
                      {fileStatus.costingReport.recordCount} days of data loaded
                    </Typography>
                  </Alert>
                </Box>
              ) : (
                <Box
                  {...getRootProps()}
                  sx={{
                    p: 3,
                    border: '2px dashed',
                    borderColor: 'divider',
                    borderRadius: 1,
                    bgcolor: 'background.paper',
                    cursor: 'pointer',
                    '&:hover': {
                      borderColor: 'primary.main',
                      bgcolor: 'action.hover'
                    }
                  }}
                >
                  <input {...getInputProps()} />
                  <Box sx={{ textAlign: 'center' }}>
                    <CloudUploadIcon sx={{ fontSize: 48, color: 'action.disabled', mb: 1 }} />
                    <Typography variant="body2">
                      Drop Production Report here
                    </Typography>
                    <Typography variant="caption" color="textSecondary">
                      or click to browse
                    </Typography>
                  </Box>
                </Box>
              )}
              
              {fileStatus.costingReport.error && (
                <Alert severity="error" sx={{ mt: 2 }}>
                  {fileStatus.costingReport.error}
                </Alert>
              )}
              
              <Typography variant="caption" color="textSecondary" sx={{ mt: 1, display: 'block' }}>
                For production costs, consumption & utilities
              </Typography>
            </CardContent>
          </Card>
        </Box>
      </Box>

      {/* Processing Status */}
      {parseStatus.loading && (
        <Box sx={{ mt: 3 }}>
          <LinearProgress />
          <Typography variant="body2" sx={{ mt: 1 }}>
            {parseStatus.message}
          </Typography>
        </Box>
      )}

      {/* Details Section */}
      {parseStatus.details.length > 0 && !parseStatus.loading && (
        <Paper sx={{ mt: 3, p: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <Typography variant="subtitle2">
              Processing Details
            </Typography>
            <IconButton 
              size="small" 
              onClick={() => setParseStatus(prev => ({ ...prev, showDetails: !prev.showDetails }))}
            >
              {parseStatus.showDetails ? <ExpandLess /> : <ExpandMore />}
            </IconButton>
          </Box>
          <Collapse in={parseStatus.showDetails}>
            <List dense>
              {parseStatus.details.map((detail, index) => (
                <ListItem key={index}>
                  <ListItemIcon sx={{ minWidth: 36 }}>
                    {detail.startsWith('✓') ? (
                      <CheckCircle color="success" fontSize="small" />
                    ) : detail.startsWith('✗') ? (
                      <ErrorIcon color="error" fontSize="small" />
                    ) : (
                      <Description color="action" fontSize="small" />
                    )}
                  </ListItemIcon>
                  <ListItemText 
                    primary={detail.replace(/^[✓✗]\s*/, '')}
                    primaryTypographyProps={{ variant: 'body2' }}
                  />
                </ListItem>
              ))}
            </List>
          </Collapse>
        </Paper>
      )}

      {/* Summary */}
      <Box sx={{ mt: 3, display: 'flex', gap: 2, flexWrap: 'wrap' }}>
        {fileStatus.controlChart.uploaded && (
          <Chip 
            icon={<Assessment />} 
            label={`Quality Data: ${fileStatus.controlChart.recordCount} records`}
            color="primary"
            variant="outlined"
          />
        )}
        {fileStatus.costingReport.uploaded && (
          <Chip 
            icon={<CurrencyRupee />} 
            label={`Costing Data: ${fileStatus.costingReport.recordCount} days`}
            color="primary"
            variant="outlined"
          />
        )}
      </Box>
    </Box>
  );
};

export default UnifiedFileUpload;