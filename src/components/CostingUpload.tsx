import React, { useState, useCallback } from 'react';
import {
  Box,
  Button,
  Paper,
  Typography,
  LinearProgress,
  Alert,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Collapse,
  IconButton
} from '@mui/material';
import {
  CloudUpload as CloudUploadIcon,
  CheckCircle as CheckCircleIcon,
  Error as ErrorIcon,
  ExpandLess,
  ExpandMore,
  Description as DescriptionIcon
} from '@mui/icons-material';
import { useDropzone } from 'react-dropzone';
import { parseCostingExcel, CostingData } from '../utils/parseCostingData';

interface CostingUploadProps {
  onDataParsed: (data: CostingData[]) => void;
  currentData?: CostingData[];
}

interface ParseStatus {
  loading: boolean;
  error: string | null;
  success: boolean;
  details: string[];
  showDetails: boolean;
}

const CostingUpload: React.FC<CostingUploadProps> = ({ onDataParsed, currentData }) => {
  const [parseStatus, setParseStatus] = useState<ParseStatus>({
    loading: false,
    error: null,
    success: false,
    details: [],
    showDetails: false
  });

  const handleFileUpload = useCallback(async (file: File) => {
    setParseStatus({
      loading: true,
      error: null,
      success: false,
      details: ['Starting file processing...'],
      showDetails: true
    });

    try {
      // Validate file type
      if (!file.name.match(/\.(xlsx|xls)$/i)) {
        throw new Error('Please upload an Excel file (.xlsx or .xls)');
      }

      const details: string[] = [];
      details.push(`✓ File: ${file.name}`);
      details.push(`✓ Size: ${(file.size / 1024 / 1024).toFixed(2)} MB`);

      setParseStatus(prev => ({ ...prev, details }));

      // Parse the Excel file
      details.push('Parsing production data...');
      setParseStatus(prev => ({ ...prev, details: [...details] }));

      const costingData = await parseCostingExcel(file);

      if (costingData.length === 0) {
        throw new Error('No valid costing data found in the file');
      }

      details.push(`✓ Found ${costingData.length} days of production data`);
      
      // Calculate totals
      const totalProduction = costingData.reduce((sum, d) => sum + d.totalProduction, 0);
      const totalCost = costingData.reduce((sum, d) => sum + d.totalCost, 0);
      const avgCostPerKg = totalCost / (totalProduction * 1000);

      details.push(`✓ Total Production: ${totalProduction.toFixed(2)} MT`);
      details.push(`✓ Total Cost: ₹${(totalCost / 100000).toFixed(2)} Lakhs`);
      details.push(`✓ Average Cost per Kg: ₹${avgCostPerKg.toFixed(2)}`);

      setParseStatus({
        loading: false,
        error: null,
        success: true,
        details,
        showDetails: true
      });

      onDataParsed(costingData);
    } catch (error) {
      setParseStatus({
        loading: false,
        error: error instanceof Error ? error.message : 'Failed to parse Excel file',
        success: false,
        details: [...parseStatus.details, `✗ ${error instanceof Error ? error.message : 'Unknown error'}`],
        showDetails: true
      });
    }
  }, [onDataParsed, parseStatus.details]);

  const onDrop = useCallback((acceptedFiles: File[]) => {
    if (acceptedFiles.length > 0) {
      handleFileUpload(acceptedFiles[0]);
    }
  }, [handleFileUpload]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
      'application/vnd.ms-excel': ['.xls']
    },
    maxFiles: 1
  });

  return (
    <Box>
      <Paper
        {...getRootProps()}
        sx={{
          p: 4,
          border: '2px dashed',
          borderColor: isDragActive ? 'primary.main' : 'divider',
          bgcolor: isDragActive ? 'action.hover' : 'background.paper',
          cursor: 'pointer',
          transition: 'all 0.3s',
          '&:hover': {
            borderColor: 'primary.main',
            bgcolor: 'action.hover'
          }
        }}
      >
        <input {...getInputProps()} />
        <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
          <CloudUploadIcon sx={{ fontSize: 48, color: 'primary.main' }} />
          <Typography variant="h6" align="center">
            {isDragActive ? 'Drop the file here' : 'Drag & drop Production & Consumption Report'}
          </Typography>
          <Typography variant="body2" color="textSecondary" align="center">
            or click to select an Excel file (.xlsx)
          </Typography>
          <Button variant="contained" component="span">
            Choose File
          </Button>
        </Box>
      </Paper>

      {parseStatus.loading && (
        <Box sx={{ mt: 2 }}>
          <LinearProgress />
        </Box>
      )}

      {(parseStatus.error || parseStatus.success || parseStatus.details.length > 0) && (
        <Paper sx={{ mt: 2, p: 2 }}>
          {parseStatus.error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {parseStatus.error}
            </Alert>
          )}
          
          {parseStatus.success && (
            <Alert severity="success" sx={{ mb: 2 }}>
              Costing data loaded successfully!
            </Alert>
          )}

          {parseStatus.details.length > 0 && (
            <Box>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Typography variant="subtitle2">
                  Processing Details
                </Typography>
                <IconButton size="small" onClick={() => setParseStatus(prev => ({ ...prev, showDetails: !prev.showDetails }))}>
                  {parseStatus.showDetails ? <ExpandLess /> : <ExpandMore />}
                </IconButton>
              </Box>
              <Collapse in={parseStatus.showDetails}>
                <List dense>
                  {parseStatus.details.map((detail, index) => (
                    <ListItem key={index}>
                      <ListItemIcon sx={{ minWidth: 36 }}>
                        {detail.startsWith('✓') ? (
                          <CheckCircleIcon color="success" fontSize="small" />
                        ) : detail.startsWith('✗') ? (
                          <ErrorIcon color="error" fontSize="small" />
                        ) : (
                          <DescriptionIcon color="action" fontSize="small" />
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
            </Box>
          )}
        </Paper>
      )}

      {currentData && currentData.length > 0 && (
        <Alert severity="info" sx={{ mt: 2 }}>
          Currently showing data from {currentData[0].date} to {currentData[currentData.length - 1].date}
        </Alert>
      )}
    </Box>
  );
};

export default CostingUpload;