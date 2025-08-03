import React, { useState, useMemo } from 'react';
import { Paper, Typography, Box, ToggleButton, ToggleButtonGroup, IconButton, Tooltip as MuiTooltip, TextField, MenuItem } from '@mui/material';
import { Download as DownloadIcon } from '@mui/icons-material';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ReferenceLine
} from 'recharts';
import dayjs from 'dayjs';
import weekOfYear from 'dayjs/plugin/weekOfYear';
import { QualityData } from '../types';
import { downloadChartAsImage } from '../utils/chartExporter';

dayjs.extend(weekOfYear);

interface TrendAnalysisProps {
  data: QualityData[];
}

type ViewMode = 'daily' | 'weekly' | 'monthly';

const TrendAnalysis: React.FC<TrendAnalysisProps> = ({ data }) => {
  const [viewMode, setViewMode] = useState<ViewMode>('daily');
  const [selectedMetric, setSelectedMetric] = useState('gsm');
  const [shiftFilter, setShiftFilter] = useState<string>('all');
  const [qualityFilter, setQualityFilter] = useState<string>('all');
  const [gsmFilter, setGsmFilter] = useState<string>('all');
  
  // Get available shifts, qualities, and GSM grades
  const availableShifts = Array.from(new Set(data.map(d => d.shift).filter(Boolean)));
  const availableQualities = Array.from(new Set(data.map(d => d.quality).filter(Boolean)));
  const availableGSMs = Array.from(new Set(data.map(d => d.gsmGrade).filter(Boolean)));

  const metrics = [
    { key: 'gsm', label: 'GSM (g/m²)', unit: 'g/m²' },
    { key: 'thickness', label: 'Thickness', unit: 'mm' },
    { key: 'tensileStrengthMD', label: 'Tensile MD', unit: 'N/m' },
    { key: 'tensileStrengthCD', label: 'Tensile CD', unit: 'N/m' },
    { key: 'mdCdRatio', label: 'MD/CD Ratio', unit: '' },
    { key: 'stretchElongation', label: 'Stretch/Elongation', unit: '%' },
    { key: 'bulk', label: 'Bulk', unit: 'cm³/g' },
    { key: 'brightness', label: 'Brightness', unit: '%' },
    { key: 'moistureContent', label: 'Moisture', unit: '%' },
  ];

  // Filter data based on shift, quality, and GSM
  const filteredData = useMemo(() => {
    let filtered = data;
    if (shiftFilter !== 'all') {
      filtered = filtered.filter(d => d.shift === shiftFilter);
    }
    if (qualityFilter !== 'all') {
      filtered = filtered.filter(d => d.quality === qualityFilter);
    }
    if (gsmFilter !== 'all') {
      filtered = filtered.filter(d => d.gsmGrade === gsmFilter);
    }
    return filtered;
  }, [data, shiftFilter, qualityFilter, gsmFilter]);

  const aggregatedData = useMemo(() => {
    if (viewMode === 'daily') {
      return filteredData.slice(0, 30).reverse().map(d => ({
        date: dayjs(d.date).format('MM/DD'),
        value: d[selectedMetric] as number,
        lcl: d[`${selectedMetric}Lcl`] as number,
        ucl: d[`${selectedMetric}Ucl`] as number,
        shift: d.shift,
        quality: d.quality,
        gsmGrade: d.gsmGrade,
      }));
    }

    const grouped: { [key: string]: QualityData[] } = {};
    
    filteredData.forEach(d => {
      let key: string;
      if (viewMode === 'weekly') {
        key = `${dayjs(d.date).year()}-W${dayjs(d.date).week()}`;
      } else {
        key = dayjs(d.date).format('YYYY-MM');
      }
      
      if (!grouped[key]) {
        grouped[key] = [];
      }
      grouped[key].push(d);
    });

    return Object.entries(grouped)
      .map(([key, values]) => {
        const avgValue = values.reduce((sum, v) => sum + (v[selectedMetric] as number), 0) / values.length;
        const lcl = values[0][`${selectedMetric}Lcl`] as number;
        const ucl = values[0][`${selectedMetric}Ucl`] as number;
        
        return {
          date: viewMode === 'weekly' ? key : dayjs(key).format('MMM YYYY'),
          value: avgValue,
          lcl,
          ucl,
        };
      })
      .slice(0, viewMode === 'weekly' ? 12 : 6)
      .reverse();
  }, [filteredData, viewMode, selectedMetric]);

  const currentMetric = metrics.find(m => m.key === selectedMetric)!;

  const handleDownloadChart = async () => {
    await downloadChartAsImage('trend-chart', `trend-analysis-${selectedMetric}-${viewMode}.png`);
  };

  return (
    <Paper sx={{ p: 3 }}>
      <Box sx={{ mb: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography variant="h5">
          Trend Analysis
        </Typography>
        <MuiTooltip title="Download Chart">
          <IconButton onClick={handleDownloadChart} color="primary">
            <DownloadIcon />
          </IconButton>
        </MuiTooltip>
      </Box>
      
      <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', mb: 2 }}>
        <ToggleButtonGroup
          value={viewMode}
          exclusive
          onChange={(_, value) => value && setViewMode(value)}
          size="small"
        >
          <ToggleButton value="daily">Daily</ToggleButton>
          <ToggleButton value="weekly">Weekly</ToggleButton>
          <ToggleButton value="monthly">Monthly</ToggleButton>
        </ToggleButtonGroup>
        
        {availableShifts.length > 0 && (
          <TextField
            select
            size="small"
            value={shiftFilter}
            onChange={(e) => setShiftFilter(e.target.value)}
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
            value={qualityFilter}
            onChange={(e) => setQualityFilter(e.target.value)}
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
            value={gsmFilter}
            onChange={(e) => setGsmFilter(e.target.value)}
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
      </Box>

      {(shiftFilter !== 'all' || qualityFilter !== 'all' || gsmFilter !== 'all') && (
        <Box sx={{ mb: 2, p: 2, bgcolor: 'info.light', borderRadius: 1 }}>
          <Typography variant="body2">
            Analyzing {filteredData.length} records
            {shiftFilter !== 'all' && ` for shift: ${shiftFilter}`}
            {qualityFilter !== 'all' && ` with quality: ${qualityFilter}`}
            {gsmFilter !== 'all' && ` with GSM: ${gsmFilter}`}
          </Typography>
        </Box>
      )}

      <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mb: 3 }}>
        {metrics.map(metric => (
          <ToggleButton
            key={metric.key}
            value={metric.key}
            selected={selectedMetric === metric.key}
            onChange={() => setSelectedMetric(metric.key)}
            size="small"
          >
            {metric.label}
          </ToggleButton>
        ))}
      </Box>

      <Box sx={{ height: 400 }} id="trend-chart">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={aggregatedData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="date" />
            <YAxis label={{ value: currentMetric.unit, angle: -90, position: 'insideLeft' }} />
            <Tooltip 
              content={({ active, payload }) => {
                if (active && payload && payload.length) {
                  const data = payload[0].payload;
                  return (
                    <Box sx={{ p: 1.5, bgcolor: 'background.paper', border: 1, borderColor: 'divider', borderRadius: 1 }}>
                      <Typography variant="body2" fontWeight="bold">{data.date}</Typography>
                      <Typography variant="body2" color="primary">
                        {currentMetric.label}: {payload[0].value} {currentMetric.unit}
                      </Typography>
                      {data.lcl && data.ucl && (
                        <Typography variant="caption" color="text.secondary">
                          Spec: {data.lcl} - {data.ucl}
                        </Typography>
                      )}
                      {viewMode === 'daily' && data.shift && (
                        <Typography variant="caption" display="block">
                          Shift: {data.shift}
                        </Typography>
                      )}
                      {viewMode === 'daily' && data.quality && (
                        <Typography variant="caption" display="block">
                          Quality: {data.quality}
                        </Typography>
                      )}
                      {viewMode === 'daily' && data.gsmGrade && (
                        <Typography variant="caption" display="block">
                          GSM: {data.gsmGrade}
                        </Typography>
                      )}
                    </Box>
                  );
                }
                return null;
              }}
            />
            <Legend />
            
            {aggregatedData[0]?.lcl !== undefined && (
              <ReferenceLine
                y={aggregatedData[0]?.lcl}
                stroke="#ff9800"
                strokeDasharray="3 3"
                label="LCL"
              />
            )}
            {aggregatedData[0]?.ucl !== undefined && (
              <ReferenceLine
                y={aggregatedData[0]?.ucl}
                stroke="#ff9800"
                strokeDasharray="3 3"
                label="UCL"
              />
            )}
            
            <Line
              type="monotone"
              dataKey="value"
              stroke="#2196f3"
              strokeWidth={2}
              dot={{ fill: '#2196f3' }}
              name={currentMetric.label}
            />
          </LineChart>
        </ResponsiveContainer>
      </Box>
    </Paper>
  );
};

export default TrendAnalysis;