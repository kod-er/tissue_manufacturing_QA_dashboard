import React from 'react';
import { Paper, Typography, Box } from '@mui/material';
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
  Cell
} from 'recharts';
import dayjs from 'dayjs';
import { QualityData } from '../types';

interface AdvancedMetricsProps {
  data: QualityData[];
}

const AdvancedMetrics: React.FC<AdvancedMetricsProps> = ({ data }) => {
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
    let values = data.map(d => d[metric.key] as number);
    
    // For moisture content, filter out 0 values
    if (metric.key === 'moistureContent') {
      values = values.filter(v => v !== undefined && v !== null && v !== 0);
    }
    
    const lcl = data[0]?.[`${metric.key}Lcl`] as number || 0;
    const ucl = data[0]?.[`${metric.key}Ucl`] as number || 100;
    const cpk = calculateCpk(values, lcl, ucl);
    
    return {
      name: metric.name,
      cpk: parseFloat(cpk.toFixed(2)),
      performance: cpk >= 1.33 ? 'Excellent' : cpk >= 1.0 ? 'Good' : 'Needs Improvement'
    };
  });

  // Calculate quality score over time
  const qualityTrend = data.slice(0, 30).reverse().map(d => {
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
  
  data.forEach(d => {
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
      percentage: (count / data.length) * 100
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

  return (
    <Paper sx={{ p: 3 }}>
      <Typography variant="h5" gutterBottom>
        Advanced Analytics
      </Typography>
      
      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'repeat(2, 1fr)' }, gap: 3 }}>
        {/* Process Capability */}
        <Box>
          <Typography variant="h6" gutterBottom>
            Process Capability (Cpk)
          </Typography>
          <Box sx={{ height: 300 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={processMetrics}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="cpk" fill="#2196f3">
                  {processMetrics.map((entry, index) => (
                    <Cell 
                      key={`cell-${index}`} 
                      fill={entry.cpk >= 1.33 ? '#4caf50' : entry.cpk >= 1.0 ? '#ff9800' : '#f44336'} 
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </Box>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
            Target Cpk ≥ 1.33 (Excellent), ≥ 1.0 (Acceptable)
          </Typography>
        </Box>

        {/* Performance Radar */}
        <Box>
          <Typography variant="h6" gutterBottom>
            Multi-Parameter Performance
          </Typography>
          <Box sx={{ height: 300 }}>
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart data={radarData}>
                <PolarGrid />
                <PolarAngleAxis dataKey="metric" />
                <PolarRadiusAxis angle={90} domain={[0, 2]} />
                <Radar name="Cpk" dataKey="cpk" stroke="#2196f3" fill="#2196f3" fillOpacity={0.6} />
                <Radar name="Target" dataKey="target" stroke="#4caf50" fill="#4caf50" fillOpacity={0.2} />
                <Legend />
              </RadarChart>
            </ResponsiveContainer>
          </Box>
        </Box>
      </Box>

      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '2fr 1fr' }, gap: 3, mt: 3 }}>
        {/* Quality Score Trend */}
        <Box>
          <Typography variant="h6" gutterBottom>
            Overall Quality Score Trend (Last 30 Days)
          </Typography>
          <Box sx={{ height: 300 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={qualityTrend}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis domain={[0, 100]} />
                <Tooltip formatter={(value) => `${value}%`} />
                <Bar dataKey="qualityScore" fill="#2196f3">
                  {qualityTrend.map((entry, index) => (
                    <Cell 
                      key={`cell-${index}`} 
                      fill={entry.qualityScore >= 95 ? '#4caf50' : entry.qualityScore >= 85 ? '#ff9800' : '#f44336'} 
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </Box>
        </Box>

        {/* Top Issues */}
        <Box>
          <Typography variant="h6" gutterBottom>
            Most Frequent Out-of-Spec Parameters
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
                  label={(entry) => `${entry.parameter}: ${entry.percentage.toFixed(1)}%`}
                >
                  {topIssues.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </Box>
        </Box>
      </Box>

      {/* Process Performance Summary */}
      <Box sx={{ mt: 3 }}>
          <Typography variant="h6" gutterBottom>
            Process Performance Summary
          </Typography>
          <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
            {processMetrics.map((metric, index) => (
              <Paper 
                key={index} 
                sx={{ 
                  p: 2, 
                  minWidth: 150,
                  bgcolor: metric.cpk >= 1.33 ? 'success.light' : metric.cpk >= 1.0 ? 'warning.light' : 'error.light'
                }}
              >
                <Typography variant="subtitle2">{metric.name}</Typography>
                <Typography variant="h6">Cpk: {metric.cpk}</Typography>
                <Typography variant="body2">{metric.performance}</Typography>
              </Paper>
            ))}
          </Box>
      </Box>
    </Paper>
  );
};

export default AdvancedMetrics;