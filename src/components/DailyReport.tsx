import React, { useState } from 'react';
import { 
  Paper, Typography, Box, Chip, TextField, MenuItem, 
  Accordion, AccordionSummary, AccordionDetails, Divider 
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import dayjs from 'dayjs';
import { QualityData } from '../types';

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
  
  return (
    <Paper sx={{ p: 2, height: '100%' }}>
      <Typography variant="subtitle2" color="text.secondary" gutterBottom>
        {title}
      </Typography>
      <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 1 }}>
        <Typography variant="h4" color={hasLimits ? `${color}.main` : 'text.primary'}>
          {value ? value.toFixed(2) : '-'}
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
  
  const availableDates = data.map(d => d.date);
  const selectedData = data.find(d => d.date === selectedDate) || data[0];
  
  if (!selectedData) {
    return (
      <Paper sx={{ p: 3 }}>
        <Typography>No data available</Typography>
      </Paper>
    );
  }

  return (
    <Paper sx={{ p: 3 }}>
      <Box sx={{ mb: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 2 }}>
        <Typography variant="h5">
          Daily Quality Report
        </Typography>
        
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <TextField
            select
            size="small"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            sx={{ minWidth: 200 }}
            label="Select Date"
          >
            {availableDates.map((date) => (
              <MenuItem key={date} value={date}>
                {dayjs(date).format('MMMM DD, YYYY')}
              </MenuItem>
            ))}
          </TextField>
        </Box>
      </Box>

      {/* Production Metadata */}
      {(selectedData.shift || selectedData.lotNo || selectedData.labExecutive) && (
        <Box sx={{ mb: 3, p: 2, bgcolor: 'grey.50', borderRadius: 1 }}>
          <Typography variant="h6" gutterBottom>Production Details</Typography>
          <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
            {selectedData.shift && <Chip label={`Shift: ${selectedData.shift}`} />}
            {selectedData.lotNo && <Chip label={`Lot: ${selectedData.lotNo}`} />}
            {selectedData.rollNo && <Chip label={`Roll: ${selectedData.rollNo}`} />}
            {selectedData.spoolNo && <Chip label={`Spool: ${selectedData.spoolNo}`} />}
            {selectedData.labExecutive && <Chip label={`Lab: ${selectedData.labExecutive}`} />}
            {selectedData.quality && <Chip label={`Quality: ${selectedData.quality}`} color="primary" />}
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
          title="GSM (Grammage)"
          value={selectedData.gsm}
          lcl={selectedData.gsmLcl}
          ucl={selectedData.gsmUcl}
          unit="g/m²"
        />
        
        <MetricCard
          title="Thickness"
          value={selectedData.thickness}
          lcl={selectedData.thicknessLcl}
          ucl={selectedData.thicknessUcl}
          unit="µm"
        />
        
        <MetricCard
          title="Bulk"
          value={selectedData.bulk}
          lcl={selectedData.bulkLcl}
          ucl={selectedData.bulkUcl}
          unit="cc/g"
        />
        
        <MetricCard
          title="Dry Tensile MD"
          value={selectedData.tensileStrengthMD}
          lcl={selectedData.tensileStrengthMDLcl}
          ucl={selectedData.tensileStrengthMDUcl}
          unit="N/m"
        />
        
        <MetricCard
          title="Dry Tensile CD"
          value={selectedData.tensileStrengthCD}
          lcl={selectedData.tensileStrengthCDLcl}
          ucl={selectedData.tensileStrengthCDUcl}
          unit="N/m"
        />
        
        {selectedData.mdCdRatio && (
          <MetricCard
            title="MD/CD Ratio"
            value={selectedData.mdCdRatio}
            unit=""
          />
        )}
        
        <MetricCard
          title="Brightness ISO"
          value={selectedData.brightness}
          lcl={selectedData.brightnessLcl}
          ucl={selectedData.brightnessUcl}
          unit="%"
        />
        
        <MetricCard
          title="Moisture"
          value={selectedData.moistureContent}
          lcl={selectedData.moistureContentLcl}
          ucl={selectedData.moistureContentUcl}
          unit="%"
        />
        
        {selectedData.opacity && (
          <MetricCard
            title="Opacity"
            value={selectedData.opacity}
            lcl={selectedData.opacityLcl}
            ucl={selectedData.opacityUcl}
            unit="%"
          />
        )}
      </Box>

      {/* Additional Metrics Accordion */}
      <Accordion sx={{ mb: 2 }}>
        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
          <Typography>Additional Strength & Performance Metrics</Typography>
        </AccordionSummary>
        <AccordionDetails>
          <Box sx={{ 
            display: 'grid', 
            gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', md: 'repeat(3, 1fr)' }, 
            gap: 2 
          }}>
            {selectedData.stretchElongation && (
              <MetricCard title="Stretch/Elongation" value={selectedData.stretchElongation} unit="%" />
            )}
            {selectedData.wetTensile && (
              <MetricCard title="Wet Tensile" value={selectedData.wetTensile} unit="gf/50mm" />
            )}
            {selectedData.wetDryTensileRatio && (
              <MetricCard title="Wet/Dry Tensile" value={selectedData.wetDryTensileRatio} unit="%" />
            )}
            {selectedData.grossMeanStrength && (
              <MetricCard title="Gross Mean Strength" value={selectedData.grossMeanStrength} unit="" />
            )}
            {selectedData.machineCreepPercent && (
              <MetricCard title="Machine Creep" value={selectedData.machineCreepPercent} unit="%" />
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
            {selectedData.machineSpeed && (
              <MetricCard title="Machine Speed" value={selectedData.machineSpeed} unit="Mpm" />
            )}
            {selectedData.popeReelSpeed && (
              <MetricCard title="Pope Reel Speed" value={selectedData.popeReelSpeed} unit="Mpm" />
            )}
            {selectedData.mcDraw && (
              <MetricCard title="MC Draw" value={selectedData.mcDraw} unit="" />
            )}
            {selectedData.nextPressLoad && (
              <MetricCard title="Press Load" value={selectedData.nextPressLoad} unit="" />
            )}
            {selectedData.coating && (
              <MetricCard title="Coating" value={selectedData.coating} unit="" />
            )}
            {selectedData.coating1 && (
              <MetricCard title="Coating 2" value={selectedData.coating1} unit="" />
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
            {selectedData.hwGrade && <Chip label={`HW Grade: ${selectedData.hwGrade}`} />}
            {selectedData.swGrade && <Chip label={`SW Grade: ${selectedData.swGrade}`} />}
          </Box>
          <Box sx={{ 
            display: 'grid', 
            gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', md: 'repeat(3, 1fr)' }, 
            gap: 2 
          }}>
            {selectedData.shortFiberPercent && (
              <MetricCard title="Short Fiber" value={selectedData.shortFiberPercent} unit="%" />
            )}
            {selectedData.longFiberPercent && (
              <MetricCard title="Long Fiber" value={selectedData.longFiberPercent} unit="%" />
            )}
            {selectedData.brokePercent && (
              <MetricCard title="Broke" value={selectedData.brokePercent} unit="%" />
            )}
            {selectedData.hwCy && (
              <MetricCard title="HW Consistency" value={selectedData.hwCy} unit="" />
            )}
            {selectedData.hwSr && (
              <MetricCard title="HW SR" value={selectedData.hwSr} unit="" />
            )}
            {selectedData.swCy && (
              <MetricCard title="SW Consistency" value={selectedData.swCy} unit="" />
            )}
            {selectedData.swOsr && (
              <MetricCard title="SW OSR" value={selectedData.swOsr} unit="" />
            )}
            {selectedData.wsrKgHrs && (
              <MetricCard title="WSR" value={selectedData.wsrKgHrs} unit="Kg/Hr" />
            )}
            {selectedData.dsrKgHrs && (
              <MetricCard title="DSR" value={selectedData.dsrKgHrs} unit="Kg/Hr" />
            )}
          </Box>
        </AccordionDetails>
      </Accordion>

      {/* Remarks Section */}
      {(selectedData.remarks || selectedData.break) && (
        <Box sx={{ mt: 3, p: 2, bgcolor: 'warning.light', borderRadius: 1 }}>
          <Typography variant="h6" gutterBottom>Remarks & Defects</Typography>
          {selectedData.remarks && (
            <Typography variant="body2">Remarks: {selectedData.remarks}</Typography>
          )}
          {selectedData.break && (
            <Typography variant="body2">Break: {selectedData.break}</Typography>
          )}
        </Box>
      )}
      
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
            label={`In Spec: ${Object.entries(selectedData).filter(([key, value]) => {
              if (key.includes('Lcl') || key.includes('Ucl') || key === 'date' || typeof value !== 'number') return false;
              const lcl = selectedData[`${key}Lcl` as keyof QualityData] as number;
              const ucl = selectedData[`${key}Ucl` as keyof QualityData] as number;
              return lcl && ucl && value >= lcl && value <= ucl;
            }).length}`}
            color="success"
            variant="outlined"
          />
          <Chip
            label={`Out of Spec: ${Object.entries(selectedData).filter(([key, value]) => {
              if (key.includes('Lcl') || key.includes('Ucl') || key === 'date' || typeof value !== 'number') return false;
              const lcl = selectedData[`${key}Lcl` as keyof QualityData] as number;
              const ucl = selectedData[`${key}Ucl` as keyof QualityData] as number;
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