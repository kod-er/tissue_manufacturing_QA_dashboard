import React, { useState } from 'react';
import { 
  Paper, Typography, Box, Chip, TextField, MenuItem, 
  Accordion, AccordionSummary, AccordionDetails, Divider,
  Button, CircularProgress
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import { Download as DownloadIcon } from '@mui/icons-material';
import dayjs from 'dayjs';
import { QualityData } from '../types';
import { generatePDFReport } from '../utils/reportGenerator';

interface DailyReportProps {
  data: QualityData[];
}

interface MetricCardProps {
  title: string;
  value: number;
  lcl?: number;
  ucl?: number;
  unit?: string;
}

const MetricCard: React.FC<MetricCardProps> = ({ title, value, lcl, ucl, unit = '' }) => {
  const hasLimits = lcl !== undefined && ucl !== undefined;
  const isInSpec = !hasLimits || (value >= lcl && value <= ucl);
  const color = isInSpec ? 'success' : 'error';
  
  // Format value based on the metric type
  const formatValue = (val: number | undefined) => {
    if (!val) return '-';
    // HW SR should show no decimal places
    if (title === 'HW SR') {
      return Math.round(val).toString();
    }
    return val.toFixed(2);
  };
  
  return (
    <Paper sx={{ p: 2, height: '100%' }}>
      <Typography variant="subtitle2" color="text.secondary" gutterBottom>
        {title}
      </Typography>
      <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 1 }}>
        <Typography variant="h4" color={hasLimits ? `${color}.main` : 'text.primary'}>
          {formatValue(value)}
        </Typography>
        {unit && <Typography variant="subtitle1">{unit}</Typography>}
      </Box>
      {hasLimits && (
        <Box sx={{ mt: 1 }}>
          <Typography variant="body2" color="text.secondary">
            Spec: {lcl.toFixed(2)} - {ucl.toFixed(2)} {unit}
          </Typography>
          <Chip 
            label={isInSpec ? 'In Spec' : 'Out of Spec'}
            color={color}
            size="small"
            sx={{ mt: 0.5 }}
          />
        </Box>
      )}
    </Paper>
  );
};

const DailyReport: React.FC<DailyReportProps> = ({ data }) => {
  const [selectedDate, setSelectedDate] = useState<string>(data[0]?.date || '');
  const [selectedShift, setSelectedShift] = useState<string>('all');
  const [selectedQuality, setSelectedQuality] = useState<string>('all');
  const [selectedGSM, setSelectedGSM] = useState<string>('all');
  const [downloading, setDownloading] = useState(false);
  
  // Get unique dates
  const availableDates = Array.from(new Set(data.map(d => d.date)));
  
  // Get data for selected date
  const dateData = data.filter(d => d.date === selectedDate);
  
  // Get available shifts, qualities, and GSM grades for selected date
  const availableShifts = Array.from(new Set(dateData.map(d => d.shift).filter(Boolean)));
  const availableQualities = Array.from(new Set(dateData.map(d => d.quality).filter(Boolean)));
  const availableGSMs = Array.from(new Set(dateData.map(d => d.gsmGrade).filter(Boolean)));
  
  // Filter data based on selections
  let selectedData = dateData;
  if (selectedShift !== 'all') {
    selectedData = selectedData.filter(d => d.shift === selectedShift);
  }
  if (selectedQuality !== 'all') {
    selectedData = selectedData.filter(d => d.quality === selectedQuality);
  }
  if (selectedGSM !== 'all') {
    selectedData = selectedData.filter(d => d.gsmGrade === selectedGSM);
  }
  
  // If multiple records after filtering, aggregate the data
  let displayData: QualityData;
  
  if (selectedData.length > 1) {
    // Calculate averages for numeric fields
    const numericFields = [
      'gsm', 'gsmLcl', 'gsmUcl',
      'thickness', 'thicknessLcl', 'thicknessUcl',
      'bulk', 'bulkLcl', 'bulkUcl',
      'tensileStrengthMD', 'tensileStrengthMDLcl', 'tensileStrengthMDUcl',
      'tensileStrengthCD', 'tensileStrengthCDLcl', 'tensileStrengthCDUcl',
      'mdCdRatio', 'brightness', 'brightnessLcl', 'brightnessUcl',
      'moistureContent', 'moistureContentLcl', 'moistureContentUcl',
      'opacity', 'opacityLcl', 'opacityUcl',
      'stretchElongation', 'wetTensile', 'wetDryTensileRatio',
      'grossMeanStrength', 'machineCreepPercent',
      'machineSpeed', 'popeReelSpeed', 'mcDraw', 'nextPressLoad',
      'coating', 'coating1', 'hwCy', 'hwSr', 'swCy', 'swOsr',
      'shortFiberPercent', 'longFiberPercent', 'brokePercent',
      'wsrKgHrs', 'dsrKgHrs'
    ];
    
    // Create aggregated data object
    displayData = {
      ...selectedData[0],
      shift: selectedShift === 'all' ? 'All Shifts' : selectedData[0].shift,
      quality: selectedQuality === 'all' ? 'All Qualities' : selectedData[0].quality,
      gsmGrade: selectedGSM === 'all' ? 'All GSM' : selectedData[0].gsmGrade,
      time: 'Aggregated',
      lotNo: 'Multiple',
      rollNo: 'Multiple',
      spoolNo: 'Multiple',
    };
    
    // Calculate averages for numeric fields
    numericFields.forEach(field => {
      const values = selectedData
        .map(d => d[field as keyof QualityData] as number)
        .filter(v => {
          // For moisture content fields, also filter out 0 values
          if (field.includes('moistureContent')) {
            return v !== undefined && v !== null && !isNaN(v) && v !== 0;
          }
          return v !== undefined && v !== null && !isNaN(v);
        });
      
      if (values.length > 0) {
        (displayData as any)[field] = values.reduce((sum, v) => sum + v, 0) / values.length;
      }
    });
    
    // Recalculate MD/CD ratio from averaged values
    if (displayData.tensileStrengthMD && displayData.tensileStrengthCD) {
      displayData.mdCdRatio = displayData.tensileStrengthMD / displayData.tensileStrengthCD;
    }
  } else {
    displayData = selectedData[0] || data[0];
  }
  
  if (!displayData) {
    return (
      <Paper sx={{ p: 3 }}>
        <Typography>No data available</Typography>
      </Paper>
    );
  }

  const handleDownloadReport = async () => {
    setDownloading(true);
    try {
      // Check if we need breakdown (when showing aggregated data)
      const needsBreakdown = selectedData.length > 1;
      
      // Filter historical data based on current filters
      let filteredHistoricalData = data;
      if (selectedShift !== 'all') {
        filteredHistoricalData = filteredHistoricalData.filter(d => d.shift === selectedShift);
      }
      if (selectedQuality !== 'all') {
        filteredHistoricalData = filteredHistoricalData.filter(d => d.quality === selectedQuality);
      }
      if (selectedGSM !== 'all') {
        filteredHistoricalData = filteredHistoricalData.filter(d => d.gsmGrade === selectedGSM);
      }
      
      await generatePDFReport({ 
        data: displayData,
        historicalData: filteredHistoricalData,
        includeCharts: true,
        breakdown: needsBreakdown ? {
          allData: selectedData,
          filters: {
            date: selectedDate,
            shift: selectedShift,
            quality: selectedQuality,
            gsmGrade: selectedGSM
          }
        } : undefined
      });
    } catch (error) {
      console.error('Error generating report:', error);
    } finally {
      setDownloading(false);
    }
  };

  return (
    <Paper sx={{ p: 3 }}>
      <Box sx={{ mb: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 2 }}>
        <Typography variant="h5">
          Daily Quality Report
        </Typography>
        
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap' }}>
          <TextField
            select
            size="small"
            value={selectedDate}
            onChange={(e) => {
              setSelectedDate(e.target.value);
              setSelectedShift('all');
              setSelectedQuality('all');
              setSelectedGSM('all');
            }}
            sx={{ minWidth: 200 }}
            label="Select Date"
          >
            {availableDates.map((date) => (
              <MenuItem key={date} value={date}>
                {dayjs(date).format('MMMM DD, YYYY')}
              </MenuItem>
            ))}
          </TextField>
          
          {availableShifts.length > 0 && (
            <TextField
              select
              size="small"
              value={selectedShift}
              onChange={(e) => setSelectedShift(e.target.value)}
              sx={{ minWidth: 120 }}
              label="Shift"
            >
              <MenuItem value="all">All Shifts</MenuItem>
              {availableShifts.map((shift) => (
                <MenuItem key={shift} value={shift}>
                  {shift}
                </MenuItem>
              ))}
            </TextField>
          )}
          
          {availableQualities.length > 0 && (
            <TextField
              select
              size="small"
              value={selectedQuality}
              onChange={(e) => setSelectedQuality(e.target.value)}
              sx={{ minWidth: 150 }}
              label="Quality"
            >
              <MenuItem value="all">All Qualities</MenuItem>
              {availableQualities.map((quality) => (
                <MenuItem key={quality} value={quality}>
                  {quality}
                </MenuItem>
              ))}
            </TextField>
          )}
          
          {availableGSMs.length > 0 && (
            <TextField
              select
              size="small"
              value={selectedGSM}
              onChange={(e) => setSelectedGSM(e.target.value)}
              sx={{ minWidth: 120 }}
              label="GSM"
            >
              <MenuItem value="all">All GSM</MenuItem>
              {availableGSMs.map((gsm) => (
                <MenuItem key={gsm} value={gsm}>
                  {gsm}
                </MenuItem>
              ))}
            </TextField>
          )}
          
          <Button
            variant="contained"
            startIcon={downloading ? <CircularProgress size={20} color="inherit" /> : <DownloadIcon />}
            onClick={handleDownloadReport}
            disabled={downloading}
          >
            {downloading ? 'Generating...' : 'Download Report'}
          </Button>
        </Box>
      </Box>

      {/* Show multiple records info if available */}
      {dateData.length > 1 && (
        <Box sx={{ mb: 2, p: 2, bgcolor: 'info.light', borderRadius: 1 }}>
          <Typography variant="body2">
            {dateData.length} records found for {dayjs(selectedDate).format('MMMM DD, YYYY')}. 
            {selectedData.length > 1 && (
              <>
                <strong>Showing averaged values from {selectedData.length} records.</strong>
              </>
            )}
            {selectedShift !== 'all' && ` Filtered by shift: ${selectedShift}.`}
            {selectedQuality !== 'all' && ` Filtered by quality: ${selectedQuality}.`}
            {selectedGSM !== 'all' && ` Filtered by GSM: ${selectedGSM}.`}
          </Typography>
        </Box>
      )}

      {/* Production Metadata */}
      {(displayData.shift || displayData.lotNo || displayData.labExecutive) && (
        <Box sx={{ mb: 3, p: 2, bgcolor: 'grey.50', borderRadius: 1 }}>
          <Typography variant="h6" gutterBottom>Production Details</Typography>
          <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
            {displayData.shift && <Chip label={`Shift: ${displayData.shift}`} />}
            {displayData.lotNo && displayData.lotNo !== 'Multiple' && <Chip label={`Lot: ${displayData.lotNo}`} />}
            {displayData.rollNo && displayData.rollNo !== 'Multiple' && <Chip label={`Roll: ${displayData.rollNo}`} />}
            {displayData.spoolNo && displayData.spoolNo !== 'Multiple' && <Chip label={`Spool: ${displayData.spoolNo}`} />}
            {displayData.labExecutive && <Chip label={`Lab: ${displayData.labExecutive}`} />}
            {displayData.quality && <Chip label={`Quality: ${displayData.quality}`} color="primary" />}
            {displayData.gsmGrade && <Chip label={`GSM: ${displayData.gsmGrade}`} color="secondary" />}
            {displayData.time && displayData.time !== 'Aggregated' && <Chip label={`Time: ${displayData.time}`} variant="outlined" />}
            {displayData.time === 'Aggregated' && <Chip label="Aggregated Data" color="info" />}
          </Box>
        </Box>
      )}
      
      {/* Core Quality Metrics */}
      <Typography variant="h6" gutterBottom>Core Quality Metrics</Typography>
      <Box sx={{ 
        display: 'grid', 
        gridTemplateColumns: { 
          xs: '1fr', 
          sm: 'repeat(2, 1fr)', 
          md: 'repeat(3, 1fr)',
          lg: 'repeat(4, 1fr)'
        }, 
        gap: 3,
        mb: 3
      }}>
        <MetricCard
          title="GSM (g/m²)"
          value={displayData.gsm}
          lcl={displayData.gsmLcl}
          ucl={displayData.gsmUcl}
          unit="g/m²"
        />
        
        <MetricCard
          title="Thickness"
          value={displayData.thickness}
          lcl={displayData.thicknessLcl}
          ucl={displayData.thicknessUcl}
          unit="µm"
        />
        
        <MetricCard
          title="Bulk"
          value={displayData.bulk}
          lcl={displayData.bulkLcl}
          ucl={displayData.bulkUcl}
          unit="cc/g"
        />
        
        <MetricCard
          title="Dry Tensile MD"
          value={displayData.tensileStrengthMD}
          lcl={displayData.tensileStrengthMDLcl}
          ucl={displayData.tensileStrengthMDUcl}
          unit="N/m"
        />
        
        <MetricCard
          title="Dry Tensile CD"
          value={displayData.tensileStrengthCD}
          lcl={displayData.tensileStrengthCDLcl}
          ucl={displayData.tensileStrengthCDUcl}
          unit="N/m"
        />
        
        {displayData.mdCdRatio && (
          <MetricCard
            title="MD/CD Ratio"
            value={displayData.mdCdRatio}
            unit=""
          />
        )}
        
        <MetricCard
          title="Brightness ISO"
          value={displayData.brightness}
          lcl={displayData.brightnessLcl}
          ucl={displayData.brightnessUcl}
          unit="%"
        />
        
        <MetricCard
          title="Moisture"
          value={displayData.moistureContent}
          lcl={displayData.moistureContentLcl}
          ucl={displayData.moistureContentUcl}
          unit="%"
        />
        
        {displayData.opacity && (
          <MetricCard
            title="Opacity"
            value={displayData.opacity}
            lcl={displayData.opacityLcl}
            ucl={displayData.opacityUcl}
            unit="%"
          />
        )}
        
        {displayData.stretchElongation && (
          <MetricCard title="Stretch/Elongation" value={displayData.stretchElongation} unit="%" />
        )}
        
        {displayData.wetTensile && (
          <MetricCard title="Wet Tensile" value={displayData.wetTensile} unit="gf/50mm" />
        )}
        
        {displayData.wetDryTensileRatio && (
          <MetricCard title="Wet/Dry Tensile" value={displayData.wetDryTensileRatio} unit="%" />
        )}
      </Box>

      {/* Additional Metrics Accordion */}
      <Accordion sx={{ mb: 2 }}>
        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
          <Typography>Additional Performance Metrics</Typography>
        </AccordionSummary>
        <AccordionDetails>
          <Box sx={{ 
            display: 'grid', 
            gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', md: 'repeat(3, 1fr)' }, 
            gap: 2 
          }}>
            {displayData.grossMeanStrength && (
              <MetricCard title="Gross Mean Strength" value={displayData.grossMeanStrength} unit="" />
            )}
          </Box>
        </AccordionDetails>
      </Accordion>

      {/* Machine Parameters Accordion */}
      <Accordion sx={{ mb: 2 }}>
        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
          <Typography>Machine Parameters</Typography>
        </AccordionSummary>
        <AccordionDetails>
          <Box sx={{ 
            display: 'grid', 
            gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', md: 'repeat(3, 1fr)' }, 
            gap: 2 
          }}>
            {displayData.machineSpeed && (
              <MetricCard title="Machine Speed" value={displayData.machineSpeed} unit="Mpm" />
            )}
            {displayData.popeReelSpeed && (
              <MetricCard title="Pope Reel Speed" value={displayData.popeReelSpeed} unit="Mpm" />
            )}
            {displayData.mcDraw && (
              <MetricCard title="MC Draw" value={displayData.mcDraw} unit="" />
            )}
            {displayData.nextPressLoad && (
              <MetricCard title="Press Load" value={displayData.nextPressLoad} unit="" />
            )}
            {displayData.coating && (
              <MetricCard title="Coating" value={displayData.coating} unit="" />
            )}
            {displayData.coating1 && (
              <MetricCard title="Coating 2" value={displayData.coating1} unit="" />
            )}
            {displayData.machineCreepPercent && (
              <MetricCard title="Machine Creep" value={displayData.machineCreepPercent} unit="%" />
            )}
          </Box>
        </AccordionDetails>
      </Accordion>

      {/* Fiber Composition Accordion */}
      <Accordion sx={{ mb: 2 }}>
        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
          <Typography>Fiber Composition & Consumption</Typography>
        </AccordionSummary>
        <AccordionDetails>
          <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', mb: 2 }}>
            {displayData.hwGrade && <Chip label={`HW Grade: ${displayData.hwGrade}`} />}
            {displayData.swGrade && <Chip label={`SW Grade: ${displayData.swGrade}`} />}
          </Box>
          <Box sx={{ 
            display: 'grid', 
            gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', md: 'repeat(3, 1fr)' }, 
            gap: 2 
          }}>
            {displayData.shortFiberPercent && (
              <MetricCard title="Short Fiber" value={displayData.shortFiberPercent} unit="%" />
            )}
            {displayData.longFiberPercent && (
              <MetricCard title="Long Fiber" value={displayData.longFiberPercent} unit="%" />
            )}
            {displayData.brokePercent && (
              <MetricCard title="Broke" value={displayData.brokePercent} unit="%" />
            )}
            {displayData.hwCy && (
              <MetricCard title="HW Consistency" value={displayData.hwCy} unit="" />
            )}
            {displayData.hwSr && (
              <MetricCard title="HW SR" value={displayData.hwSr} unit="" />
            )}
            {displayData.swCy && (
              <MetricCard title="SW Consistency" value={displayData.swCy} unit="" />
            )}
            {displayData.swOsr && (
              <MetricCard title="SW OSR" value={displayData.swOsr} unit="" />
            )}
            {displayData.wsrKgHrs && (
              <MetricCard title="WSR" value={displayData.wsrKgHrs} unit="Kg/Hr" />
            )}
            {displayData.dsrKgHrs && (
              <MetricCard title="DSR" value={displayData.dsrKgHrs} unit="Kg/Hr" />
            )}
          </Box>
        </AccordionDetails>
      </Accordion>

      {/* Remarks Section - Show all remarks and defects for the selected date */}
      {(() => {
        const allRemarks = selectedData
          .filter(d => d.remarks && d.remarks.trim() !== '')
          .map((d, index) => ({
            time: d.time,
            shift: d.shift,
            remarks: d.remarks,
            index
          }));
        
        const allBreaks = selectedData
          .filter(d => d.break && d.break.trim() !== '')
          .map((d, index) => ({
            time: d.time,
            shift: d.shift,
            break: d.break,
            index
          }));
        
        if (allRemarks.length === 0 && allBreaks.length === 0) return null;
        
        return (
          <Box sx={{ mt: 3, p: 2, bgcolor: 'background.paper', border: 1, borderColor: 'warning.main', borderRadius: 1 }}>
            <Typography variant="h6" gutterBottom color="warning.main">
              Remarks & Defects ({dayjs(selectedDate).format('MMMM DD, YYYY')})
            </Typography>
            
            {allRemarks.length > 0 && (
              <Box sx={{ mb: 2 }}>
                <Typography variant="subtitle2" gutterBottom sx={{ fontWeight: 600 }}>
                  Remarks:
                </Typography>
                {allRemarks.map((item, idx) => (
                  <Box key={idx} sx={{ mb: 1, pl: 2 }}>
                    <Typography variant="body2">
                      • {item.time && `[${item.time}]`} {item.shift && `Shift ${item.shift}:`} {item.remarks}
                    </Typography>
                  </Box>
                ))}
              </Box>
            )}
            
            {allBreaks.length > 0 && (
              <Box>
                <Typography variant="subtitle2" gutterBottom sx={{ fontWeight: 600 }}>
                  Breaks/Defects:
                </Typography>
                {allBreaks.map((item, idx) => (
                  <Box key={idx} sx={{ mb: 1, pl: 2 }}>
                    <Typography variant="body2" color="error.dark">
                      • {item.time && `[${item.time}]`} {item.shift && `Shift ${item.shift}:`} {item.break}
                    </Typography>
                  </Box>
                ))}
              </Box>
            )}
          </Box>
        );
      })()}
      
      {/* Summary Statistics */}
      <Box sx={{ mt: 4 }}>
        <Typography variant="h6" gutterBottom>
          Quality Summary for {dayjs(selectedDate).format('MMMM DD, YYYY')}
        </Typography>
        <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
          <Chip
            label={`Core Parameters: 8`}
            color="primary"
            variant="outlined"
          />
          <Chip
            label={`In Spec: ${Object.entries(displayData).filter(([key, value]) => {
              if (key.includes('Lcl') || key.includes('Ucl') || key === 'date' || typeof value !== 'number') return false;
              const lcl = displayData[`${key}Lcl` as keyof QualityData] as number;
              const ucl = displayData[`${key}Ucl` as keyof QualityData] as number;
              return lcl && ucl && value >= lcl && value <= ucl;
            }).length}`}
            color="success"
            variant="outlined"
          />
          <Chip
            label={`Out of Spec: ${Object.entries(displayData).filter(([key, value]) => {
              if (key.includes('Lcl') || key.includes('Ucl') || key === 'date' || typeof value !== 'number') return false;
              const lcl = displayData[`${key}Lcl` as keyof QualityData] as number;
              const ucl = displayData[`${key}Ucl` as keyof QualityData] as number;
              return lcl && ucl && (value < lcl || value > ucl);
            }).length}`}
            color="error"
            variant="outlined"
          />
        </Box>
      </Box>
    </Paper>
  );
};

export default DailyReport;