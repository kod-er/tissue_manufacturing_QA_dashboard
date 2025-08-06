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
  ResponsiveContainer
} from 'recharts';
import dayjs from 'dayjs';
import weekOfYear from 'dayjs/plugin/weekOfYear';
import { QualityData } from '../types';
import { downloadChartAsImage } from '../utils/chartExporter';

dayjs.extend(weekOfYear);

const CHART_COLORS = ['#2196f3', '#ff5722', '#4caf50', '#ff9800', '#9c27b0', '#00bcd4', '#795548', '#607d8b'];

interface TrendAnalysisProps {
  data: QualityData[];
}

type ViewMode = 'hourly' | 'daily' | 'weekly' | 'monthly';

const TrendAnalysis: React.FC<TrendAnalysisProps> = ({ data }) => {
  const [viewMode, setViewMode] = useState<ViewMode>('daily');
  const [selectedMetrics, setSelectedMetrics] = useState<string[]>(['gsm']);
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
    { key: 'wetDryTensileRatio', label: 'Wet / Dry Tensile', unit: '%' },
    { key: 'machineCreepPercent', label: 'Machine Creep', unit: '%' },
    { key: 'coating', label: 'Coating', unit: '' },
    { key: 'swOsr', label: 'SW OSR', unit: '' },
    { key: 'hwSr', label: 'HW SR', unit: '' },
    { key: 'release', label: 'Release', unit: '' },
    { key: 'map', label: 'MAP', unit: '' },
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
    if (viewMode === 'hourly') {
      // Show individual records with time
      return filteredData.slice(0, 50).reverse().map(d => {
        const baseData: any = {
          date: d.time ? `${dayjs(d.date).format('MM/DD')} ${d.time}` : dayjs(d.date).format('MM/DD HH:mm'),
          shift: d.shift,
          quality: d.quality,
          gsmGrade: d.gsmGrade,
        };
        
        // Add data for each selected metric
        selectedMetrics.forEach((metric, index) => {
          const value = d[metric];
          // Convert string values to numbers if possible, otherwise use 0
          baseData[`value${index + 1}`] = typeof value === 'number' ? value : (parseFloat(value as string) || 0);
          baseData[`lcl${index + 1}`] = d[`${metric}Lcl`] as number || undefined;
          baseData[`ucl${index + 1}`] = d[`${metric}Ucl`] as number || undefined;
        });
        
        return baseData;
      });
    }

    const grouped: { [key: string]: QualityData[] } = {};
    
    filteredData.forEach(d => {
      let key: string;
      if (viewMode === 'daily') {
        key = d.date; // Group by date for daily aggregation
      } else if (viewMode === 'weekly') {
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
        const baseData: any = {
          date: viewMode === 'daily' ? dayjs(key).format('MM/DD') : 
                viewMode === 'weekly' ? key : 
                dayjs(key).format('MMM YYYY'),
          recordCount: values.length,
        };
        
        // Calculate average for each selected metric
        selectedMetrics.forEach((metric, index) => {
          const numericValues = values.map(v => {
            const val = v[metric];
            return typeof val === 'number' ? val : (parseFloat(val as string) || 0);
          }).filter(v => v !== 0); // Filter out zeros from non-numeric conversions
          
          const avgValue = numericValues.length > 0 
            ? numericValues.reduce((sum, v) => sum + v, 0) / numericValues.length 
            : 0;
          
          baseData[`value${index + 1}`] = avgValue;
          baseData[`lcl${index + 1}`] = values[0][`${metric}Lcl`] as number || undefined;
          baseData[`ucl${index + 1}`] = values[0][`${metric}Ucl`] as number || undefined;
        });
        
        return baseData;
      })
      .slice(0, viewMode === 'daily' ? 30 : viewMode === 'weekly' ? 12 : 6)
      .reverse();
  }, [filteredData, viewMode, selectedMetrics]);

  const selectedMetricsInfo = selectedMetrics.map(metricKey => 
    metrics.find(m => m.key === metricKey)!
  );

  const handleDownloadChart = async () => {
    await downloadChartAsImage('trend-chart', `trend-analysis-${selectedMetrics.join('-')}-${viewMode}.png`);
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
          <ToggleButton value="hourly">Hourly</ToggleButton>
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

      <Box sx={{ mb: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
          <Typography variant="subtitle1">
            Select Metrics: {selectedMetrics.length}/4 selected
          </Typography>
          {selectedMetrics.length > 0 && (
            <MuiTooltip title="Clear all selections">
              <IconButton 
                size="small"
                onClick={() => setSelectedMetrics([])}
                sx={{ ml: 'auto' }}
              >
                ✕
              </IconButton>
            </MuiTooltip>
          )}
        </Box>
        
        <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
          {metrics.map(metric => (
            <ToggleButton
              key={metric.key}
              value={metric.key}
              selected={selectedMetrics.includes(metric.key)}
              onChange={() => {
                if (selectedMetrics.includes(metric.key)) {
                  setSelectedMetrics(selectedMetrics.filter(m => m !== metric.key));
                } else if (selectedMetrics.length < 4) {
                  setSelectedMetrics([...selectedMetrics, metric.key]);
                }
              }}
              disabled={!selectedMetrics.includes(metric.key) && selectedMetrics.length >= 4}
              size="small"
            >
              {metric.label}
            </ToggleButton>
          ))}
        </Box>
        
        {selectedMetrics.length === 0 && (
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
            Please select at least one metric to display
          </Typography>
        )}
      </Box>

      <Box sx={{ height: 400 }} id="trend-chart">
        {selectedMetrics.length > 0 ? (
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={aggregatedData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="date" />
            <YAxis />
            <Tooltip 
              content={({ active, payload }) => {
                if (active && payload && payload.length) {
                  const data = payload[0].payload;
                  return (
                    <Box sx={{ p: 1.5, bgcolor: 'background.paper', border: 1, borderColor: 'divider', borderRadius: 1 }}>
                      <Typography variant="body2" fontWeight="bold">{data.date}</Typography>
                      {payload.map((entry: any, index: number) => {
                        const metricIndex = parseInt(entry.dataKey.replace('value', '')) - 1;
                        const metricInfo = selectedMetricsInfo[metricIndex];
                        return (
                          <Box key={entry.dataKey} sx={{ mt: index > 0 ? 1 : 0 }}>
                            <Typography variant="body2" sx={{ color: entry.color }}>
                              {metricInfo?.label}: {entry.value?.toFixed(2)} {metricInfo?.unit}
                            </Typography>
                            {data[`lcl${metricIndex + 1}`] && data[`ucl${metricIndex + 1}`] && (
                              <Typography variant="caption" color="text.secondary" display="block">
                                Spec: {data[`lcl${metricIndex + 1}`].toFixed(2)} - {data[`ucl${metricIndex + 1}`].toFixed(2)}
                              </Typography>
                            )}
                          </Box>
                        );
                      })}
                      {viewMode === 'hourly' && data.shift && (
                        <Typography variant="caption" display="block" sx={{ mt: 1 }}>
                          Shift: {data.shift}
                        </Typography>
                      )}
                      {viewMode === 'hourly' && data.quality && (
                        <Typography variant="caption" display="block">
                          Quality: {data.quality}
                        </Typography>
                      )}
                      {viewMode === 'hourly' && data.gsmGrade && (
                        <Typography variant="caption" display="block">
                          GSM: {data.gsmGrade}
                        </Typography>
                      )}
                      {viewMode !== 'hourly' && data.recordCount > 1 && (
                        <Typography variant="caption" display="block" sx={{ mt: 0.5, fontStyle: 'italic' }}>
                          Averaged from {data.recordCount} records
                        </Typography>
                      )}
                    </Box>
                  );
                }
                return null;
              }}
            />
            <Legend />
            
            {selectedMetrics.map((metric, index) => (
              <Line
                key={metric}
                type="monotone"
                dataKey={`value${index + 1}`}
                stroke={CHART_COLORS[index]}
                strokeWidth={2}
                dot={{ fill: CHART_COLORS[index], r: 3 }}
                name={selectedMetricsInfo[index]?.label || metric}
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      ) : (
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
          <Typography variant="body1" color="text.secondary">
            Select one or more metrics to display the trend chart
          </Typography>
        </Box>
      )}
      </Box>
    </Paper>
  );
};

export default TrendAnalysis;