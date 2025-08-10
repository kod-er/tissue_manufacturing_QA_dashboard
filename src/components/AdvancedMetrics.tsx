import React, { useState, useMemo } from 'react';
import { Paper, Typography, Box, Tabs, Tab, Card, CardContent, Chip, LinearProgress, IconButton, Tooltip as MuiTooltip, TextField, Button, MenuItem } from '@mui/material';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  ScatterChart,
  Scatter,
  AreaChart,
  Area,
  ComposedChart,
  ReferenceLine
} from 'recharts';
import { TrendingUp, TrendingDown, CheckCircle, Warning, Error as ErrorIcon, Analytics, Speed, Timeline, Assessment } from '@mui/icons-material';
import dayjs from 'dayjs';
import { QualityData } from '../types';

interface AdvancedMetricsProps {
  data: QualityData[];
}

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;
  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`analytics-tabpanel-${index}`}
      aria-labelledby={`analytics-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ pt: 3 }}>{children}</Box>}
    </div>
  );
}

const AdvancedMetrics: React.FC<AdvancedMetricsProps> = ({ data }) => {
  const [tabValue, setTabValue] = useState(0);
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [shiftFilter, setShiftFilter] = useState<string>('all');
  const [qualityFilter, setQualityFilter] = useState<string>('all');
  const [gsmFilter, setGsmFilter] = useState<string>('all');
  
  // Get available shifts, qualities, and GSM grades
  const availableShifts = Array.from(new Set(data.map(d => d.shift).filter(Boolean)));
  const availableQualities = Array.from(new Set(data.map(d => d.quality).filter(Boolean)));
  const availableGSMs = Array.from(new Set(data.map(d => d.gsmGrade).filter(Boolean)));
  
  // Filter data based on date range and other filters
  const filteredData = useMemo(() => {
    let filtered = data;
    
    // Date filter
    if (startDate || endDate) {
      filtered = filtered.filter(d => {
        const recordDate = dayjs(d.date);
        const start = startDate ? dayjs(startDate) : null;
        const end = endDate ? dayjs(endDate) : null;
        
        if (start && end) {
          return recordDate.isAfter(start.subtract(1, 'day')) && recordDate.isBefore(end.add(1, 'day'));
        } else if (start) {
          return recordDate.isAfter(start.subtract(1, 'day'));
        } else if (end) {
          return recordDate.isBefore(end.add(1, 'day'));
        }
        return true;
      });
    }
    
    // Shift filter
    if (shiftFilter !== 'all') {
      filtered = filtered.filter(d => d.shift === shiftFilter);
    }
    
    // Quality filter
    if (qualityFilter !== 'all') {
      filtered = filtered.filter(d => d.quality === qualityFilter);
    }
    
    // GSM filter
    if (gsmFilter !== 'all') {
      filtered = filtered.filter(d => d.gsmGrade === gsmFilter);
    }
    
    return filtered;
  }, [data, startDate, endDate, shiftFilter, qualityFilter, gsmFilter]);
  
  // Calculate daily averages first
  const dailyAverages = useMemo(() => {
    const dailyData: { [date: string]: QualityData[] } = {};
    
    // Group data by date
    filteredData.forEach(record => {
      const date = dayjs(record.date).format('YYYY-MM-DD');
      if (!dailyData[date]) {
        dailyData[date] = [];
      }
      dailyData[date].push(record);
    });
    
    // Calculate averages for each day
    const averagedData: QualityData[] = Object.entries(dailyData).map(([date, records]) => {
      const numericFields = [
        'gsm', 'gsmLcl', 'gsmUcl',
        'thickness', 'thicknessLcl', 'thicknessUcl',
        'bulk', 'bulkLcl', 'bulkUcl',
        'tensileStrengthMD', 'tensileStrengthMDLcl', 'tensileStrengthMDUcl',
        'tensileStrengthCD', 'tensileStrengthCDLcl', 'tensileStrengthCDUcl',
        'brightness', 'brightnessLcl', 'brightnessUcl',
        'opacity', 'opacityLcl', 'opacityUcl',
        'moistureContent', 'moistureContentLcl', 'moistureContentUcl',
        'mdCdRatio', 'stretchElongation', 'wetTensile', 'wetDryTensileRatio',
        'grossMeanStrength', 'machineCreepPercent'
      ];
      
      const averaged: any = {
        date,
        shift: 'All', // Aggregated across all shifts
        recordCount: records.length
      };
      
      // Calculate average for each numeric field
      numericFields.forEach(field => {
        const values = records
          .map(r => r[field as keyof QualityData] as number)
          .filter(v => {
            // For moisture content, filter out 0 values
            if (field.includes('moistureContent')) {
              return v !== undefined && v !== null && !isNaN(v) && v !== 0;
            }
            return v !== undefined && v !== null && !isNaN(v);
          });
        
        if (values.length > 0) {
          averaged[field] = values.reduce((sum, v) => sum + v, 0) / values.length;
        }
      });
      
      return averaged as QualityData;
    });
    
    // Sort by date descending
    return averagedData.sort((a, b) => dayjs(b.date).unix() - dayjs(a.date).unix());
  }, [filteredData]);
  
  // Use daily averages for all calculations
  const dataForAnalysis = dailyAverages;
  
  // Calculate additional statistics
  const calculateExtendedStats = (values: number[]) => {
    if (values.length === 0) return null;
    
    const sorted = [...values].sort((a, b) => a - b);
    const sum = values.reduce((acc, val) => acc + val, 0);
    const mean = sum / values.length;
    const variance = values.reduce((acc, val) => acc + Math.pow(val - mean, 2), 0) / values.length;
    const stdDev = Math.sqrt(variance);
    
    // Calculate percentiles
    const p25 = sorted[Math.floor(sorted.length * 0.25)];
    const p50 = sorted[Math.floor(sorted.length * 0.50)]; // median
    const p75 = sorted[Math.floor(sorted.length * 0.75)];
    
    // Calculate coefficient of variation
    const cv = mean !== 0 ? (stdDev / mean) * 100 : 0;
    
    // Calculate range
    const range = sorted[sorted.length - 1] - sorted[0];
    
    return {
      min: sorted[0],
      max: sorted[sorted.length - 1],
      mean,
      median: p50,
      stdDev,
      cv,
      range,
      p25,
      p75,
      iqr: p75 - p25,
      count: values.length
    };
  };
  // Calculate process capability indices (Cpk)
  const calculateCpk = (values: number[], lcl: number, ucl: number): number => {
    if (values.length === 0) return 0;
    
    const mean = values.reduce((a, b) => a + b, 0) / values.length;
    const variance = values.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / values.length;
    const stdDev = Math.sqrt(variance);
    
    if (stdDev === 0) return 0;
    
    const cpu = (ucl - mean) / (3 * stdDev);
    const cpl = (mean - lcl) / (3 * stdDev);
    
    return Math.min(cpu, cpl);
  };

  // Calculate process performance metrics
  const processMetrics = [
    { name: 'GSM', key: 'gsm' },
    { name: 'Thickness', key: 'thickness' },
    { name: 'Tensile MD', key: 'tensileStrengthMD' },
    { name: 'Tensile CD', key: 'tensileStrengthCD' },
    { name: 'Bulk', key: 'bulk' },
    { name: 'Brightness', key: 'brightness' },
    { name: 'Opacity', key: 'opacity' },
    { name: 'Moisture', key: 'moistureContent' }
  ].map(metric => {
    let values = dataForAnalysis.map(d => d[metric.key] as number);
    
    // For moisture content, filter out 0 values
    if (metric.key === 'moistureContent') {
      values = values.filter(v => v !== undefined && v !== null && v !== 0);
    }
    
    const lcl = dataForAnalysis[0]?.[`${metric.key}Lcl`] as number || 0;
    const ucl = dataForAnalysis[0]?.[`${metric.key}Ucl`] as number || 100;
    const cpk = calculateCpk(values, lcl, ucl);
    
    return {
      name: metric.name,
      key: metric.key,
      cpk: parseFloat(cpk.toFixed(2)),
      performance: cpk >= 1.33 ? 'Excellent' : cpk >= 1.0 ? 'Good' : 'Needs Improvement'
    };
  });

  // Calculate quality score over time
  const qualityTrend = dataForAnalysis.slice(0, 30).reverse().map(d => {
    const validParams = Object.entries(d).filter(([key, value]) => {
      if (key.includes('Lcl') || key.includes('Ucl') || key === 'date' || typeof value !== 'number') return false;
      // Skip moisture content if it's 0
      if (key === 'moistureContent' && value === 0) return false;
      const lcl = d[`${key}Lcl`];
      const ucl = d[`${key}Ucl`];
      return lcl && ucl && typeof lcl === 'number' && typeof ucl === 'number';
    });
    
    const inSpecCount = validParams.filter(([key, value]) => {
      const lcl = d[`${key}Lcl`] as number;
      const ucl = d[`${key}Ucl`] as number;
      return (value as number) >= lcl && (value as number) <= ucl;
    }).length;
    
    const totalParams = validParams.length;
    const qualityScore = totalParams > 0 ? (inSpecCount / totalParams) * 100 : 0;
    
    return {
      date: dayjs(d.date).format('MM/DD'),
      qualityScore: parseFloat(qualityScore.toFixed(1))
    };
  });

  // Identify top issues
  const issueFrequency: { [key: string]: number } = {};
  
  dataForAnalysis.forEach(d => {
    Object.entries(d).forEach(([key, value]) => {
      if (key.includes('Lcl') || key.includes('Ucl') || key === 'date' || typeof value !== 'number') return;
      // Skip moisture content if it's 0
      if (key === 'moistureContent' && value === 0) return;
      const lcl = d[`${key}Lcl`];
      const ucl = d[`${key}Ucl`];
      if (lcl && ucl && typeof lcl === 'number' && typeof ucl === 'number' && (value < lcl || value > ucl)) {
        issueFrequency[key] = (issueFrequency[key] || 0) + 1;
      }
    });
  });

  const topIssues = Object.entries(issueFrequency)
    .map(([parameter, count]) => ({
      parameter: parameter.replace(/([A-Z])/g, ' $1').trim(),
      count,
      percentage: (count / dataForAnalysis.length) * 100
    }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

  // Performance radar chart data
  const radarData = processMetrics.map(m => ({
    metric: m.name,
    cpk: m.cpk,
    target: 1.33
  }));

  const COLORS = ['#2196f3', '#4caf50', '#ff9800', '#f44336', '#9c27b0'];
  
  // Calculate correlation matrix
  const correlationMatrix = useMemo(() => {
    const metrics = ['gsm', 'thickness', 'tensileStrengthMD', 'tensileStrengthCD', 'brightness', 'moistureContent'];
    const matrix: any[] = [];
    
    metrics.forEach((metric1, i) => {
      metrics.forEach((metric2, j) => {
        if (i <= j) {
          const values1 = dataForAnalysis.map(d => d[metric1] as number).filter(v => v !== undefined && v !== null);
          const values2 = dataForAnalysis.map(d => d[metric2] as number).filter(v => v !== undefined && v !== null);
          
          if (values1.length > 0 && values2.length > 0) {
            // Calculate Pearson correlation
            const mean1 = values1.reduce((a, b) => a + b, 0) / values1.length;
            const mean2 = values2.reduce((a, b) => a + b, 0) / values2.length;
            
            const num = values1.reduce((sum, v1, idx) => sum + (v1 - mean1) * (values2[idx] - mean2), 0);
            const den1 = Math.sqrt(values1.reduce((sum, v1) => sum + Math.pow(v1 - mean1, 2), 0));
            const den2 = Math.sqrt(values2.reduce((sum, v2) => sum + Math.pow(v2 - mean2, 2), 0));
            
            const correlation = den1 * den2 !== 0 ? num / (den1 * den2) : 0;
            
            matrix.push({
              metric1: metric1.replace(/([A-Z])/g, ' $1').trim(),
              metric2: metric2.replace(/([A-Z])/g, ' $1').trim(),
              correlation: parseFloat(correlation.toFixed(3))
            });
          }
        }
      });
    });
    
    return matrix;
  }, [dataForAnalysis]);
  
  // Process stability analysis
  const stabilityAnalysis = useMemo(() => {
    const recentData = dataForAnalysis.slice(0, 20);
    const metrics = ['gsm', 'thickness', 'tensileStrengthMD', 'tensileStrengthCD'];
    
    return metrics.map(metric => {
      const values = recentData.map(d => d[metric] as number).filter(v => v !== undefined && v !== null);
      const stats = calculateExtendedStats(values);
      
      if (!stats) return null;
      
      // Check for out of control points (beyond 3 sigma)
      const outOfControl = values.filter(v => 
        v < stats.mean - 3 * stats.stdDev || v > stats.mean + 3 * stats.stdDev
      ).length;
      
      // Check for runs (consecutive points on same side of mean)
      let maxRun = 0;
      let currentRun = 0;
      let lastSide: string | null = null;
      
      values.forEach(v => {
        const side = v >= stats.mean ? 'above' : 'below';
        if (side === lastSide) {
          currentRun++;
          maxRun = Math.max(maxRun, currentRun);
        } else {
          currentRun = 1;
          lastSide = side;
        }
      });
      
      const isStable = outOfControl === 0 && maxRun < 7;
      
      return {
        metric: metric.replace(/([A-Z])/g, ' $1').trim(),
        cv: stats.cv,
        outOfControl,
        maxRun,
        isStable,
        stability: isStable ? 'Stable' : 'Unstable'
      };
    }).filter(Boolean);
  }, [dataForAnalysis]);

  // Shift performance analysis
  const shiftPerformance = useMemo(() => {
    const shifts = Array.from(new Set(filteredData.map(d => d.shift).filter(Boolean)));
    
    return shifts.map(shift => {
      const shiftData = filteredData.filter(d => d.shift === shift);
      const metrics = ['gsm', 'thickness', 'tensileStrengthMD', 'tensileStrengthCD'];
      
      let totalInSpec = 0;
      let totalChecked = 0;
      
      metrics.forEach(metric => {
        shiftData.forEach(d => {
          const value = d[metric] as number;
          const lcl = d[`${metric}Lcl`] as number;
          const ucl = d[`${metric}Ucl`] as number;
          
          if (value !== undefined && lcl !== undefined && ucl !== undefined) {
            totalChecked++;
            if (value >= lcl && value <= ucl) totalInSpec++;
          }
        });
      });
      
      const performance = totalChecked > 0 ? (totalInSpec / totalChecked) * 100 : 0;
      
      return {
        shift,
        performance: parseFloat(performance.toFixed(1)),
        totalRecords: shiftData.length
      };
    }).sort((a, b) => b.performance - a.performance);
  }, [filteredData]);

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };

  return (
    <Paper sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mb: 2 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography variant="h5">
            Advanced Analytics Dashboard
          </Typography>
          <Box sx={{ display: 'flex', gap: 1 }}>
            <Chip icon={<Analytics />} label={`${dataForAnalysis.length} Days`} color="primary" variant="outlined" />
            <Chip icon={<Assessment />} label={`${filteredData.length} Records`} variant="outlined" />
            {dataForAnalysis.length > 0 && (
              <Chip icon={<Assessment />} label={`Last ${dayjs(dataForAnalysis[0]?.date).format('MMM DD')}`} variant="outlined" />
            )}
          </Box>
        </Box>
        
        {/* Filters */}
        <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', flexWrap: 'wrap' }}>
          <TextField
            type="date"
            label="Start Date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            size="small"
            InputLabelProps={{ shrink: true }}
            sx={{ minWidth: 150 }}
          />
          <TextField
            type="date"
            label="End Date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            size="small"
            InputLabelProps={{ shrink: true }}
            sx={{ minWidth: 150 }}
          />
          
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
          
          {(startDate || endDate || shiftFilter !== 'all' || qualityFilter !== 'all' || gsmFilter !== 'all') && (
            <Button
              variant="outlined"
              size="small"
              onClick={() => {
                setStartDate('');
                setEndDate('');
                setShiftFilter('all');
                setQualityFilter('all');
                setGsmFilter('all');
              }}
            >
              Clear All Filters
            </Button>
          )}
        </Box>
      </Box>
      
      <Tabs value={tabValue} onChange={handleTabChange} sx={{ borderBottom: 1, borderColor: 'divider' }}>
        <Tab icon={<Speed />} iconPosition="start" label="Process Performance" />
        <Tab icon={<Timeline />} iconPosition="start" label="Statistical Analysis" />
        <Tab icon={<TrendingUp />} iconPosition="start" label="Correlations & Patterns" />
        <Tab icon={<Assessment />} iconPosition="start" label="Shift Performance" />
      </Tabs>
      
      {/* Tab 1: Process Performance */}
      <TabPanel value={tabValue} index={0}>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
          {/* Info banner */}
          <Box>
            <Paper sx={{ p: 2, bgcolor: 'info.light', mb: 2 }}>
              <Typography variant="body2">
                <strong>Note:</strong> All metrics are calculated using daily averages to provide a more stable view of process performance. 
                Each day's data represents the average of all records for that day.
              </Typography>
            </Paper>
          </Box>
          {/* Performance Overview Cards */}
          <Box>
            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', md: 'repeat(4, 1fr)' }, gap: 2, mb: 3 }}>
              {processMetrics.slice(0, 4).map((metric, index) => (
                <Card key={index} variant="outlined">
                  <CardContent>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <Box>
                        <Typography color="text.secondary" gutterBottom variant="caption">
                          {metric.name}
                        </Typography>
                        <Typography variant="h4">
                          {metric.cpk}
                        </Typography>
                        <Chip 
                          label={metric.performance} 
                          size="small" 
                          color={metric.cpk >= 1.33 ? 'success' : metric.cpk >= 1.0 ? 'warning' : 'error'}
                          sx={{ mt: 1 }}
                        />
                      </Box>
                      <Box sx={{ 
                        width: 48, 
                        height: 48, 
                        borderRadius: '50%', 
                        display: 'flex', 
                        alignItems: 'center', 
                        justifyContent: 'center',
                        bgcolor: metric.cpk >= 1.33 ? 'success.light' : metric.cpk >= 1.0 ? 'warning.light' : 'error.light'
                      }}>
                        {metric.cpk >= 1.33 ? <CheckCircle color="success" /> : 
                         metric.cpk >= 1.0 ? <Warning color="warning" /> : 
                         <ErrorIcon color="error" />}
                      </Box>
                    </Box>
                  </CardContent>
                </Card>
              ))}
            </Box>
          </Box>
          
          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'repeat(2, 1fr)' }, gap: 3 }}>
          <Box>
            <Paper sx={{ p: 2 }}>
              <Typography variant="h6" gutterBottom>
                Process Capability Index (Cpk)
              </Typography>
              <Box sx={{ height: 350 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart data={processMetrics}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" angle={-45} textAnchor="end" height={80} />
                    <YAxis />
                    <Tooltip />
                    <ReferenceLine y={1.33} stroke="#4caf50" strokeDasharray="5 5" label="Target" />
                    <ReferenceLine y={1.0} stroke="#ff9800" strokeDasharray="5 5" label="Min Acceptable" />
                    <Bar dataKey="cpk" fill="#2196f3">
                      {processMetrics.map((entry, index) => (
                        <Cell 
                          key={`cell-${index}`} 
                          fill={entry.cpk >= 1.33 ? '#4caf50' : entry.cpk >= 1.0 ? '#ff9800' : '#f44336'} 
                        />
                      ))}
                    </Bar>
                  </ComposedChart>
                </ResponsiveContainer>
              </Box>
            </Paper>
          </Box>

          <Box>
            <Paper sx={{ p: 2 }}>
              <Typography variant="h6" gutterBottom>
                Multi-Parameter Performance Radar
              </Typography>
              <Box sx={{ height: 350 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <RadarChart data={radarData}>
                    <PolarGrid />
                    <PolarAngleAxis dataKey="metric" />
                    <PolarRadiusAxis angle={90} domain={[0, 2]} />
                    <Radar name="Actual Cpk" dataKey="cpk" stroke="#2196f3" fill="#2196f3" fillOpacity={0.6} />
                    <Radar name="Target (1.33)" dataKey="target" stroke="#4caf50" fill="#4caf50" fillOpacity={0.2} />
                    <Legend />
                  </RadarChart>
                </ResponsiveContainer>
              </Box>
            </Paper>
          </Box>
          </Box>

          <Box>
            <Paper sx={{ p: 2 }}>
              <Typography variant="h6" gutterBottom>
                Quality Score Trend (30 Days)
              </Typography>
              <Box sx={{ height: 300 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={qualityTrend}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis domain={[0, 100]} />
                    <Tooltip formatter={(value) => `${value}%`} />
                    <Area 
                      type="monotone" 
                      dataKey="qualityScore" 
                      stroke="#2196f3" 
                      fill="#2196f3" 
                      fillOpacity={0.6}
                    />
                    <ReferenceLine y={95} stroke="#4caf50" strokeDasharray="5 5" label="Target" />
                    <ReferenceLine y={85} stroke="#ff9800" strokeDasharray="5 5" label="Min Acceptable" />
                  </AreaChart>
                </ResponsiveContainer>
              </Box>
            </Paper>
          </Box>
        </Box>
      </TabPanel>

      {/* Tab 2: Statistical Analysis */}
      <TabPanel value={tabValue} index={1}>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
          <Box>
            <Typography variant="h6" gutterBottom>
              Process Stability Analysis
            </Typography>
            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'repeat(2, 1fr)', lg: 'repeat(4, 1fr)' }, gap: 2, mb: 3 }}>
              {stabilityAnalysis.map((item, index) => item && (
                <Card key={index} variant="outlined">
                  <CardContent>
                    <Typography color="text.secondary" gutterBottom>
                      {item.metric}
                    </Typography>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                      <Chip 
                        label={item.stability} 
                        color={item.isStable ? 'success' : 'error'} 
                        size="small"
                        icon={item.isStable ? <CheckCircle /> : <ErrorIcon />}
                      />
                    </Box>
                    <Typography variant="body2">
                      CV: {item.cv.toFixed(2)}%
                    </Typography>
                    <Typography variant="body2">
                      Out of Control: {item.outOfControl}
                    </Typography>
                    <Typography variant="body2">
                      Max Run: {item.maxRun}
                    </Typography>
                  </CardContent>
                </Card>
              ))}
            </Box>
          </Box>

          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'repeat(2, 1fr)' }, gap: 3 }}>
          <Box>
            <Paper sx={{ p: 2 }}>
              <Typography variant="h6" gutterBottom>
                Distribution Analysis - GSM
              </Typography>
              <Box sx={{ height: 300 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart 
                    data={(() => {
                      const values = dataForAnalysis.map(d => d.gsm).filter(v => v !== undefined);
                      const min = Math.min(...values);
                      const max = Math.max(...values);
                      const binSize = (max - min) / 10;
                      const bins: any[] = [];
                      
                      for (let i = 0; i < 10; i++) {
                        const binMin = min + i * binSize;
                        const binMax = binMin + binSize;
                        const count = values.filter(v => v >= binMin && v < binMax).length;
                        bins.push({
                          range: `${binMin.toFixed(1)}-${binMax.toFixed(1)}`,
                          count,
                          frequency: (count / values.length) * 100
                        });
                      }
                      
                      return bins;
                    })()}
                  >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="range" angle={-45} textAnchor="end" height={80} />
                    <YAxis />
                    <Tooltip formatter={(value: any) => `${value.toFixed(1)}%`} />
                    <Bar dataKey="frequency" fill="#2196f3" />
                  </BarChart>
                </ResponsiveContainer>
              </Box>
            </Paper>
          </Box>

          <Box>
            <Paper sx={{ p: 2 }}>
              <Typography variant="h6" gutterBottom>
                Statistical Summary
              </Typography>
              <Box sx={{ maxHeight: 300, overflow: 'auto' }}>
                {processMetrics.map((metric, index) => {
                  const metricKey = metric.key as keyof QualityData;
                  const values = dataForAnalysis.map(d => d[metricKey] as number).filter(v => v !== undefined && v !== null);
                  const stats = calculateExtendedStats(values);
                  
                  return stats && (
                    <Box key={index} sx={{ mb: 2, p: 2, bgcolor: 'grey.50', borderRadius: 1 }}>
                      <Typography variant="subtitle2" gutterBottom fontWeight="bold">
                        {metric.name}
                      </Typography>
                      <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 2 }}>
                        <Box>
                          <Typography variant="body2">Mean: {stats.mean.toFixed(2)}</Typography>
                          <Typography variant="body2">Median: {stats.median.toFixed(2)}</Typography>
                          <Typography variant="body2">Std Dev: {stats.stdDev.toFixed(2)}</Typography>
                        </Box>
                        <Box>
                          <Typography variant="body2">Min: {stats.min.toFixed(2)}</Typography>
                          <Typography variant="body2">Max: {stats.max.toFixed(2)}</Typography>
                          <Typography variant="body2">CV: {stats.cv.toFixed(2)}%</Typography>
                        </Box>
                      </Box>
                    </Box>
                  );
                })}
              </Box>
            </Paper>
          </Box>
          </Box>
        </Box>
      </TabPanel>

      {/* Tab 3: Correlations */}
      <TabPanel value={tabValue} index={2}>
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '2fr 1fr' }, gap: 3 }}>
          <Box>
            <Paper sx={{ p: 2 }}>
              <Typography variant="h6" gutterBottom>
                Parameter Correlation Matrix
              </Typography>
              <Box sx={{ height: 400 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <ScatterChart>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis type="category" dataKey="metric1" />
                    <YAxis type="category" dataKey="metric2" />
                    <Tooltip 
                      content={({ active, payload }) => {
                        if (active && payload && payload.length) {
                          const data = payload[0].payload;
                          return (
                            <Paper sx={{ p: 1 }}>
                              <Typography variant="body2">
                                {data.metric1} vs {data.metric2}
                              </Typography>
                              <Typography variant="body2" color={
                                Math.abs(data.correlation) > 0.7 ? 'error.main' : 
                                Math.abs(data.correlation) > 0.4 ? 'warning.main' : 
                                'success.main'
                              }>
                                Correlation: {data.correlation}
                              </Typography>
                            </Paper>
                          );
                        }
                        return null;
                      }}
                    />
                    <Scatter 
                      data={correlationMatrix} 
                      fill="#8884d8"
                    >
                      {correlationMatrix.map((entry, index) => (
                        <Cell 
                          key={`cell-${index}`} 
                          fill={
                            Math.abs(entry.correlation) > 0.7 ? '#f44336' : 
                            Math.abs(entry.correlation) > 0.4 ? '#ff9800' : 
                            '#4caf50'
                          } 
                        />
                      ))}
                    </Scatter>
                  </ScatterChart>
                </ResponsiveContainer>
              </Box>
              <Box sx={{ mt: 2, display: 'flex', gap: 2, justifyContent: 'center' }}>
                <Chip label="Strong (>0.7)" color="error" size="small" />
                <Chip label="Moderate (0.4-0.7)" color="warning" size="small" />
                <Chip label="Weak (<0.4)" color="success" size="small" />
              </Box>
            </Paper>
          </Box>

          <Box>
            <Paper sx={{ p: 2 }}>
              <Typography variant="h6" gutterBottom>
                Top Issues Distribution
              </Typography>
              <Box sx={{ height: 300 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={topIssues}
                      dataKey="count"
                      nameKey="parameter"
                      cx="50%"
                      cy="50%"
                      outerRadius={80}
                      label={(entry) => `${entry.percentage.toFixed(1)}%`}
                    >
                      {topIssues.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </Box>
            </Paper>
          </Box>
        </Box>
      </TabPanel>

      {/* Tab 4: Shift Performance */}
      <TabPanel value={tabValue} index={3}>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
          <Box>
            <Paper sx={{ p: 2 }}>
              <Typography variant="h6" gutterBottom>
                Shift Performance Comparison
              </Typography>
              <Box sx={{ height: 350 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart data={shiftPerformance}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="shift" />
                    <YAxis yAxisId="left" domain={[0, 100]} />
                    <YAxis yAxisId="right" orientation="right" />
                    <Tooltip />
                    <Legend />
                    <Bar yAxisId="left" dataKey="performance" fill="#2196f3" name="Performance %">
                      {shiftPerformance.map((entry, index) => (
                        <Cell 
                          key={`cell-${index}`} 
                          fill={entry.performance >= 95 ? '#4caf50' : entry.performance >= 85 ? '#ff9800' : '#f44336'} 
                        />
                      ))}
                    </Bar>
                    <Line 
                      yAxisId="right" 
                      type="monotone" 
                      dataKey="totalRecords" 
                      stroke="#ff7300" 
                      name="Total Records"
                      strokeWidth={2}
                      dot={{ fill: '#ff7300' }}
                    />
                  </ComposedChart>
                </ResponsiveContainer>
              </Box>
            </Paper>
          </Box>

          <Box>
            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', md: 'repeat(3, 1fr)' }, gap: 2 }}>
              {shiftPerformance.map((shift, index) => (
                <Card key={index} variant="outlined">
                  <CardContent>
                    <Typography variant="h6" gutterBottom>
                      {shift.shift}
                    </Typography>
                    <Box sx={{ mb: 2 }}>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                        <Typography variant="body2">Performance</Typography>
                        <Typography variant="body2" fontWeight="bold">
                          {shift.performance}%
                        </Typography>
                      </Box>
                      <LinearProgress 
                        variant="determinate" 
                        value={shift.performance} 
                        color={shift.performance >= 95 ? 'success' : shift.performance >= 85 ? 'warning' : 'error'}
                        sx={{ height: 8, borderRadius: 4 }}
                      />
                    </Box>
                    <Typography variant="body2" color="text.secondary">
                      Total Records: {shift.totalRecords}
                    </Typography>
                  </CardContent>
                </Card>
              ))}
            </Box>
          </Box>
        </Box>
      </TabPanel>
    </Paper>
  );
};

export default AdvancedMetrics;