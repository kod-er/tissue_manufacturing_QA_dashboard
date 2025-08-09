import React, { useState, useMemo, useEffect } from 'react';
import { Paper, Typography, Box, ToggleButton, ToggleButtonGroup, IconButton, Tooltip as MuiTooltip, TextField, MenuItem, Card, CardContent, Button, ButtonGroup, Switch, FormControlLabel } from '@mui/material';
import { TrendingUp as TrendingUpIcon, TrendingDown as TrendingDownIcon, TrendingFlat as TrendingFlatIcon, TableChart as TableChartIcon, Image as ImageIcon } from '@mui/icons-material';
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
import isoWeek from 'dayjs/plugin/isoWeek';
import { QualityData } from '../types';
import { downloadChartAsImage } from '../utils/chartExporter';

dayjs.extend(weekOfYear);
dayjs.extend(isoWeek);

const CHART_COLORS = ['#2196f3', '#ff5722', '#4caf50', '#ff9800', '#9c27b0', '#00bcd4', '#795548', '#607d8b'];

// Helper function to get week of month
const getWeekOfMonth = (date: dayjs.Dayjs): number => {
  const firstDay = date.startOf('month');
  const weekOfYear = date.week();
  const firstWeekOfMonth = firstDay.week();
  
  // Handle year boundary (December -> January)
  if (date.month() === 0 && firstWeekOfMonth > 50) {
    return weekOfYear + 1;
  }
  
  return weekOfYear - firstWeekOfMonth + 1;
};

// Calculate statistics for a metric
const calculateStatistics = (data: number[]) => {
  if (data.length === 0) return null;
  
  const sorted = [...data].sort((a, b) => a - b);
  const sum = data.reduce((acc, val) => acc + val, 0);
  const mean = sum / data.length;
  const variance = data.reduce((acc, val) => acc + Math.pow(val - mean, 2), 0) / data.length;
  const stdDev = Math.sqrt(variance);
  
  return {
    min: sorted[0],
    max: sorted[sorted.length - 1],
    mean,
    stdDev,
    count: data.length,
    median: sorted[Math.floor(sorted.length / 2)]
  };
};

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
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [showMovingAverage, setShowMovingAverage] = useState(false);
  const [movingAveragePeriod, setMovingAveragePeriod] = useState(7);
  const [showControlLimits, setShowControlLimits] = useState(false);
  
  // Clear date filters when changing view mode
  useEffect(() => {
    setStartDate('');
    setEndDate('');
  }, [viewMode]);
  
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
    { key: 'opacity', label: 'Opacity', unit: '%' },
    { key: 'moistureContent', label: 'Moisture', unit: '%' },
    { key: 'wetDryTensileRatio', label: 'Wet / Dry Tensile', unit: '%' },
    { key: 'machineCreepPercent', label: 'Machine Creep', unit: '%' },
    { key: 'coating', label: 'Coating', unit: '' },
    { key: 'swOsr', label: 'SW OSR', unit: '' },
    { key: 'hwSr', label: 'HW SR', unit: '' },
    { key: 'release', label: 'Release', unit: '' },
    { key: 'map', label: 'MAP', unit: '' },
    { key: 'wsrKgHrs', label: 'WSR Kg/Hrs', unit: 'Kg/Hrs' },
  ];

  // Filter data based on shift, quality, GSM, and date range
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
    if (startDate) {
      filtered = filtered.filter(d => dayjs(d.date).isAfter(dayjs(startDate).subtract(1, 'day')));
    }
    if (endDate) {
      filtered = filtered.filter(d => dayjs(d.date).isBefore(dayjs(endDate).add(1, 'day')));
    }
    return filtered;
  }, [data, shiftFilter, qualityFilter, gsmFilter, startDate, endDate]);

  const aggregatedData = useMemo(() => {
    if (viewMode === 'hourly') {
      // Show individual records with time
      return filteredData.slice(0, 50).reverse().map(d => {
        const baseData: any = {
          date: d.time ? `${dayjs(d.date).format('MMM D')} ${d.time}` : dayjs(d.date).format('MMM D, h:mm A'),
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
        const dateObj = dayjs(d.date);
        const monthName = dateObj.format('MMMM');
        const weekNum = getWeekOfMonth(dateObj);
        key = `${dateObj.format('YYYY-MM')}-W${weekNum}|${monthName}-W${weekNum}`;
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
        const sortKey = viewMode === 'weekly' ? key.split('|')[0] : key;
        const baseData: any = {
          date: viewMode === 'daily' ? dayjs(key).format('MMM D') : 
                viewMode === 'weekly' ? key.split('|')[1] : 
                dayjs(key).format('MMM YYYY'),
          sortKey: sortKey,
          recordCount: values.length,
        };
        
        // Calculate average for each selected metric
        selectedMetrics.forEach((metric, index) => {
          const numericValues = values.map(v => {
            const val = v[metric];
            return typeof val === 'number' ? val : (parseFloat(val as string) || 0);
          }).filter(v => {
            // For moisture content, filter out 0 values
            if (metric === 'moistureContent') {
              return v !== 0 && !isNaN(v);
            }
            // For other metrics, only filter out zeros from non-numeric conversions
            return v !== 0;
          });
          
          const avgValue = numericValues.length > 0 
            ? numericValues.reduce((sum, v) => sum + v, 0) / numericValues.length 
            : 0;
          
          baseData[`value${index + 1}`] = avgValue;
          baseData[`lcl${index + 1}`] = values[0][`${metric}Lcl`] as number || undefined;
          baseData[`ucl${index + 1}`] = values[0][`${metric}Ucl`] as number || undefined;
        });
        
        return baseData;
      })
      .sort((a, b) => a.sortKey.localeCompare(b.sortKey))
      .slice(0, viewMode === 'daily' ? 30 : viewMode === 'weekly' ? 12 : 6)
      .reverse();
  }, [filteredData, viewMode, selectedMetrics]);

  // Calculate moving average data
  const movingAverageData = useMemo(() => {
    if (!showMovingAverage || aggregatedData.length === 0) return [];
    
    return aggregatedData.map((point, index) => {
      const maData: any = { date: point.date };
      
      selectedMetrics.forEach((metric, metricIndex) => {
        const dataKey = `value${metricIndex + 1}`;
        const maKey = `ma${metricIndex + 1}`;
        
        // Calculate moving average
        const startIdx = Math.max(0, index - movingAveragePeriod + 1);
        const relevantPoints = aggregatedData.slice(startIdx, index + 1);
        const sum = relevantPoints.reduce((acc, p) => acc + (p[dataKey] || 0), 0);
        const avg = sum / relevantPoints.length;
        
        maData[maKey] = avg;
      });
      
      return maData;
    });
  }, [aggregatedData, showMovingAverage, movingAveragePeriod, selectedMetrics]);

  const selectedMetricsInfo = selectedMetrics.map(metricKey => 
    metrics.find(m => m.key === metricKey)!
  );

  // Calculate statistics for selected metrics
  const metricsStatistics = useMemo(() => {
    return selectedMetrics.map(metricKey => {
      const values = filteredData
        .map(d => {
          const val = d[metricKey];
          return typeof val === 'number' ? val : parseFloat(val as string);
        })
        .filter(v => {
          // For moisture content, also filter out 0 values
          if (metricKey === 'moistureContent') {
            return !isNaN(v) && v !== null && v !== 0;
          }
          return !isNaN(v) && v !== null;
        });
      
      const stats = calculateStatistics(values);
      const metricInfo = metrics.find(m => m.key === metricKey);
      
      // Calculate percentage within spec limits if LCL/UCL exist
      let withinSpec = null;
      if (stats && filteredData.length > 0 && filteredData[0][`${metricKey}Lcl`] !== undefined) {
        const lcl = filteredData[0][`${metricKey}Lcl`] as number;
        const ucl = filteredData[0][`${metricKey}Ucl`] as number;
        const withinCount = values.filter(v => v >= lcl && v <= ucl).length;
        withinSpec = (withinCount / values.length) * 100;
      }
      
      return {
        metric: metricKey,
        label: metricInfo?.label || metricKey,
        unit: metricInfo?.unit || '',
        stats,
        withinSpec
      };
    });
  }, [filteredData, selectedMetrics]);

  const handleDownloadChart = async () => {
    await downloadChartAsImage('trend-chart', `trend-analysis-${selectedMetrics.join('-')}-${viewMode}.png`);
  };

  const handleExportCSV = () => {
    if (filteredData.length === 0 || selectedMetrics.length === 0) return;
    
    // Create CSV headers
    const headers = ['Date', 'Time', 'Shift', 'Quality', 'GSM Grade'];
    selectedMetrics.forEach(metric => {
      const metricInfo = metrics.find(m => m.key === metric);
      const label = metricInfo?.label || metric;
      headers.push(label);
      if (filteredData[0][`${metric}Lcl`] !== undefined) {
        headers.push(`${label} LCL`);
        headers.push(`${label} UCL`);
      }
    });
    
    // Create CSV rows
    const rows = filteredData.map(row => {
      const csvRow = [
        row.date,
        row.time || '',
        row.shift || '',
        row.quality || '',
        row.gsmGrade || ''
      ];
      
      selectedMetrics.forEach(metric => {
        const value = row[metric];
        csvRow.push(typeof value === 'number' ? value.toString() : value as string || '');
        
        if (row[`${metric}Lcl`] !== undefined) {
          csvRow.push(row[`${metric}Lcl`]?.toString() || '');
          csvRow.push(row[`${metric}Ucl`]?.toString() || '');
        }
      });
      
      return csvRow;
    });
    
    // Convert to CSV string
    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');
    
    // Download CSV
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `trend-analysis-${selectedMetrics.join('-')}-${dayjs().format('YYYY-MM-DD')}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleDatePreset = (preset: string) => {
    const today = dayjs();
    switch (preset) {
      case 'today':
        setStartDate(today.format('YYYY-MM-DD'));
        setEndDate(today.format('YYYY-MM-DD'));
        break;
      case 'yesterday':
        const yesterday = today.subtract(1, 'day');
        setStartDate(yesterday.format('YYYY-MM-DD'));
        setEndDate(yesterday.format('YYYY-MM-DD'));
        break;
      case 'last7days':
        setStartDate(today.subtract(6, 'days').format('YYYY-MM-DD'));
        setEndDate(today.format('YYYY-MM-DD'));
        break;
      case 'last30days':
        setStartDate(today.subtract(29, 'days').format('YYYY-MM-DD'));
        setEndDate(today.format('YYYY-MM-DD'));
        break;
      case 'thisMonth':
        setStartDate(today.startOf('month').format('YYYY-MM-DD'));
        setEndDate(today.format('YYYY-MM-DD'));
        break;
      case 'lastMonth':
        const lastMonth = today.subtract(1, 'month');
        setStartDate(lastMonth.startOf('month').format('YYYY-MM-DD'));
        setEndDate(lastMonth.endOf('month').format('YYYY-MM-DD'));
        break;
    }
  };

  return (
    <Paper sx={{ p: 3 }}>
      <Box sx={{ mb: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography variant="h5">
          Trend Analysis
        </Typography>
        <Box>
          <MuiTooltip title="Export Data as CSV">
            <IconButton onClick={handleExportCSV} color="primary">
              <TableChartIcon />
            </IconButton>
          </MuiTooltip>
          <MuiTooltip title="Download Chart as Image">
            <IconButton onClick={handleDownloadChart} color="primary">
              <ImageIcon />
            </IconButton>
          </MuiTooltip>
        </Box>
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
      
      {/* Quick Date Presets */}
      {viewMode !== 'monthly' && viewMode !== 'weekly' && (
        <Box sx={{ display: 'flex', gap: 1, mb: 2, flexWrap: 'wrap' }}>
          <Typography variant="body2" sx={{ alignSelf: 'center', mr: 1 }}>Quick select:</Typography>
          <ButtonGroup size="small" variant="outlined">
            <Button onClick={() => handleDatePreset('today')}>Today</Button>
            <Button onClick={() => handleDatePreset('yesterday')}>Yesterday</Button>
            <Button onClick={() => handleDatePreset('last7days')}>Last 7 Days</Button>
            <Button onClick={() => handleDatePreset('last30days')}>Last 30 Days</Button>
            <Button onClick={() => handleDatePreset('thisMonth')}>This Month</Button>
            <Button onClick={() => handleDatePreset('lastMonth')}>Last Month</Button>
          </ButtonGroup>
        </Box>
      )}
      
      <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', mb: 2 }}>
        {viewMode === 'monthly' ? (
          <>
            <TextField
              type="month"
              size="small"
              value={startDate ? dayjs(startDate).format('YYYY-MM') : ''}
              onChange={(e) => setStartDate(e.target.value ? `${e.target.value}-01` : '')}
              sx={{ minWidth: 150 }}
              label="Start Month"
              InputLabelProps={{ shrink: true }}
              inputProps={{ max: endDate ? dayjs(endDate).format('YYYY-MM') : dayjs().format('YYYY-MM') }}
            />
            
            <TextField
              type="month"
              size="small"
              value={endDate ? dayjs(endDate).format('YYYY-MM') : ''}
              onChange={(e) => setEndDate(e.target.value ? dayjs(e.target.value).endOf('month').format('YYYY-MM-DD') : '')}
              sx={{ minWidth: 150 }}
              label="End Month"
              InputLabelProps={{ shrink: true }}
              inputProps={{ 
                min: startDate ? dayjs(startDate).format('YYYY-MM') : undefined,
                max: dayjs().format('YYYY-MM')
              }}
            />
          </>
        ) : viewMode === 'weekly' ? (
          <>
            <TextField
              type="week"
              size="small"
              value={startDate ? `${dayjs(startDate).format('YYYY')}-W${dayjs(startDate).isoWeek().toString().padStart(2, '0')}` : ''}
              onChange={(e) => {
                if (e.target.value) {
                  const [year, week] = e.target.value.split('-W');
                  const date = dayjs().year(parseInt(year)).isoWeek(parseInt(week)).startOf('isoWeek');
                  setStartDate(date.format('YYYY-MM-DD'));
                } else {
                  setStartDate('');
                }
              }}
              sx={{ minWidth: 150 }}
              label="Start Week"
              InputLabelProps={{ shrink: true }}
            />
            
            <TextField
              type="week"
              size="small"
              value={endDate ? `${dayjs(endDate).format('YYYY')}-W${dayjs(endDate).isoWeek().toString().padStart(2, '0')}` : ''}
              onChange={(e) => {
                if (e.target.value) {
                  const [year, week] = e.target.value.split('-W');
                  const date = dayjs().year(parseInt(year)).isoWeek(parseInt(week)).endOf('isoWeek');
                  setEndDate(date.format('YYYY-MM-DD'));
                } else {
                  setEndDate('');
                }
              }}
              sx={{ minWidth: 150 }}
              label="End Week"
              InputLabelProps={{ shrink: true }}
            />
          </>
        ) : viewMode === 'hourly' ? (
          <TextField
            type="date"
            size="small"
            value={startDate}
            onChange={(e) => {
              setStartDate(e.target.value);
              setEndDate(e.target.value); // Set end date same as start date for single day
            }}
            sx={{ minWidth: 150 }}
            label="Select Date"
            InputLabelProps={{ shrink: true }}
            inputProps={{ max: dayjs().format('YYYY-MM-DD') }}
          />
        ) : (
          <>
            <TextField
              type="date"
              size="small"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              sx={{ minWidth: 150 }}
              label="Start Date"
              InputLabelProps={{ shrink: true }}
              inputProps={{ max: endDate || dayjs().format('YYYY-MM-DD') }}
            />
            
            <TextField
              type="date"
              size="small"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              sx={{ minWidth: 150 }}
              label="End Date"
              InputLabelProps={{ shrink: true }}
              inputProps={{ 
                min: startDate,
                max: dayjs().format('YYYY-MM-DD')
              }}
            />
          </>
        )}
        
        {(shiftFilter !== 'all' || qualityFilter !== 'all' || gsmFilter !== 'all' || startDate || endDate) && (
          <MuiTooltip title="Clear all filters">
            <IconButton 
              size="small" 
              onClick={() => {
                setShiftFilter('all');
                setQualityFilter('all');
                setGsmFilter('all');
                setStartDate('');
                setEndDate('');
              }}
              sx={{ ml: 'auto' }}
            >
              ✕
            </IconButton>
          </MuiTooltip>
        )}
      </Box>

      {(shiftFilter !== 'all' || qualityFilter !== 'all' || gsmFilter !== 'all' || startDate || endDate) && (
        <Box sx={{ mb: 2, p: 2, bgcolor: 'info.light', borderRadius: 1 }}>
          <Typography variant="body2">
            Analyzing {filteredData.length} records
            {shiftFilter !== 'all' && ` for shift: ${shiftFilter}`}
            {qualityFilter !== 'all' && ` with quality: ${qualityFilter}`}
            {gsmFilter !== 'all' && ` with GSM: ${gsmFilter}`}
            {viewMode === 'hourly' && startDate && ` on ${dayjs(startDate).format('MMM DD, YYYY')}`}
            {viewMode !== 'hourly' && startDate && ` from ${dayjs(startDate).format('MMM DD, YYYY')}`}
            {viewMode !== 'hourly' && endDate && startDate !== endDate && ` to ${dayjs(endDate).format('MMM DD, YYYY')}`}
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
        
        {/* Moving Average Controls */}
        {selectedMetrics.length > 0 && (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mt: 2 }}>
            <FormControlLabel
              control={
                <Switch
                  checked={showMovingAverage}
                  onChange={(e) => setShowMovingAverage(e.target.checked)}
                  size="small"
                />
              }
              label="Show Moving Average"
            />
            {showMovingAverage && (
              <TextField
                select
                size="small"
                value={movingAveragePeriod}
                onChange={(e) => setMovingAveragePeriod(Number(e.target.value))}
                sx={{ minWidth: 100 }}
                label="Period"
              >
                <MenuItem value={3}>3 points</MenuItem>
                <MenuItem value={5}>5 points</MenuItem>
                <MenuItem value={7}>7 points</MenuItem>
                <MenuItem value={10}>10 points</MenuItem>
                <MenuItem value={14}>14 points</MenuItem>
              </TextField>
            )}
            <FormControlLabel
              control={
                <Switch
                  checked={showControlLimits}
                  onChange={(e) => setShowControlLimits(e.target.checked)}
                  size="small"
                />
              }
              label="Show Control Limits"
            />
          </Box>
        )}
      </Box>

      {/* Statistical Summary Cards */}
      {selectedMetrics.length > 0 && metricsStatistics.some(stat => stat.stats) && (
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2, mb: 3 }}>
          {metricsStatistics.map((metricStat) => {
            if (!metricStat.stats) return null;
            const { stats, label, unit, withinSpec } = metricStat;
            
            // Determine trend
            const values = filteredData
              .map(d => {
                const val = d[metricStat.metric];
                return typeof val === 'number' ? val : parseFloat(val as string);
              })
              .filter(v => !isNaN(v));
            
            let trend = 'flat';
            if (values.length > 2) {
              const firstHalf = values.slice(0, Math.floor(values.length / 2));
              const secondHalf = values.slice(Math.floor(values.length / 2));
              const firstAvg = firstHalf.reduce((a, b) => a + b, 0) / firstHalf.length;
              const secondAvg = secondHalf.reduce((a, b) => a + b, 0) / secondHalf.length;
              const diff = ((secondAvg - firstAvg) / firstAvg) * 100;
              
              if (diff > 2) trend = 'up';
              else if (diff < -2) trend = 'down';
            }
            
            return (
              <Box key={metricStat.metric} sx={{ flex: '1 1 300px', minWidth: 250 }}>
                <Card variant="outlined">
                  <CardContent>
                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
                      <Typography variant="subtitle2" color="text.secondary">
                        {label}
                      </Typography>
                      {trend === 'up' && <TrendingUpIcon color="success" fontSize="small" />}
                      {trend === 'down' && <TrendingDownIcon color="error" fontSize="small" />}
                      {trend === 'flat' && <TrendingFlatIcon color="action" fontSize="small" />}
                    </Box>
                    
                    <Typography variant="h6" gutterBottom>
                      {stats.mean.toFixed(2)} {unit}
                    </Typography>
                    
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 1 }}>
                      <Typography variant="caption" color="text.secondary">
                        Min: {stats.min.toFixed(2)}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        Max: {stats.max.toFixed(2)}
                      </Typography>
                    </Box>
                    
                    <Typography variant="caption" display="block" sx={{ mt: 0.5 }}>
                      Std Dev: {stats.stdDev.toFixed(2)}
                    </Typography>
                    
                    {withinSpec !== null && (
                      <Typography 
                        variant="caption" 
                        display="block" 
                        sx={{ 
                          mt: 0.5,
                          color: withinSpec >= 95 ? 'success.main' : withinSpec >= 90 ? 'warning.main' : 'error.main'
                        }}
                      >
                        {withinSpec.toFixed(1)}% within spec
                      </Typography>
                    )}
                  </CardContent>
                </Card>
              </Box>
            );
          })}
        </Box>
      )}

      <Box sx={{ position: 'relative' }} id="trend-chart">
        {/* Filter Summary for Export */}
        <Box sx={{ 
          p: 2, 
          bgcolor: 'background.paper',
          borderBottom: 1,
          borderColor: 'divider'
        }}>
          <Typography variant="subtitle1" fontWeight="bold" gutterBottom>
            Trend Analysis - {dayjs().format('MMMM DD, YYYY')}
          </Typography>
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, alignItems: 'center' }}>
            <Typography variant="body2" component="span">
              <strong>Metrics:</strong> {selectedMetrics.map(m => metrics.find(metric => metric.key === m)?.label).join(', ')}
            </Typography>
            <Typography variant="body2" component="span">
              <strong>•</strong> <strong>View:</strong> {viewMode.charAt(0).toUpperCase() + viewMode.slice(1)}
            </Typography>
            <Typography variant="body2" component="span">
              <strong>•</strong> <strong>Shift:</strong> {shiftFilter === 'all' ? 'All Shifts' : shiftFilter}
            </Typography>
            <Typography variant="body2" component="span">
              <strong>•</strong> <strong>Quality:</strong> {qualityFilter === 'all' ? 'All Qualities' : qualityFilter}
            </Typography>
            <Typography variant="body2" component="span">
              <strong>•</strong> <strong>GSM:</strong> {gsmFilter === 'all' ? 'All GSM' : gsmFilter}
            </Typography>
            {(startDate || endDate) && (
              <Typography variant="body2" component="span">
                <strong>•</strong> <strong>Date Range:</strong> {startDate ? dayjs(startDate).format('MMM DD, YYYY') : 'Start'} - {endDate ? dayjs(endDate).format('MMM DD, YYYY') : 'End'}
              </Typography>
            )}
            {showMovingAverage && (
              <Typography variant="body2" component="span">
                <strong>•</strong> <strong>Moving Avg:</strong> {movingAveragePeriod} points
              </Typography>
            )}
          </Box>
        </Box>
        
        <Box sx={{ height: 400 }}>
          {selectedMetrics.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
            <LineChart 
              data={showMovingAverage ? 
                aggregatedData.map((point, index) => ({
                  ...point,
                  ...movingAverageData[index]
                })) : aggregatedData
              } 
              margin={{ top: 5, right: 30, left: 20, bottom: viewMode === 'hourly' ? 50 : 5 }}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis 
              dataKey="date" 
              tick={{ fontSize: 12 }}
              angle={viewMode === 'hourly' ? -45 : 0}
              textAnchor={viewMode === 'hourly' ? 'end' : 'middle'}
              height={viewMode === 'hourly' ? 60 : 30}
            />
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
            
            {/* Moving Average Lines */}
            {showMovingAverage && selectedMetrics.map((metric, index) => (
              <Line
                key={`ma-${metric}`}
                type="monotone"
                dataKey={`ma${index + 1}`}
                stroke={CHART_COLORS[index]}
                strokeWidth={2}
                strokeDasharray="5 5"
                dot={false}
                name={`${selectedMetricsInfo[index]?.label || metric} (MA-${movingAveragePeriod})`}
              />
            ))}
            
            {/* Control Limits */}
            {showControlLimits && selectedMetrics.map((metric, index) => {
              const lcl = filteredData.length > 0 ? filteredData[0][`${metric}Lcl`] as number : null;
              const ucl = filteredData.length > 0 ? filteredData[0][`${metric}Ucl`] as number : null;
              
              return (
                <React.Fragment key={`limits-${metric}`}>
                  {lcl !== null && lcl !== undefined && (
                    <ReferenceLine
                      y={lcl}
                      stroke={CHART_COLORS[index]}
                      strokeDasharray="3 3"
                      strokeWidth={1}
                      label={{ value: `LCL (${selectedMetricsInfo[index]?.label})`, position: 'left' }}
                    />
                  )}
                  {ucl !== null && ucl !== undefined && (
                    <ReferenceLine
                      y={ucl}
                      stroke={CHART_COLORS[index]}
                      strokeDasharray="3 3"
                      strokeWidth={1}
                      label={{ value: `UCL (${selectedMetricsInfo[index]?.label})`, position: 'left' }}
                    />
                  )}
                </React.Fragment>
              );
            })}
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
      </Box>
    </Paper>
  );
};

export default TrendAnalysis;