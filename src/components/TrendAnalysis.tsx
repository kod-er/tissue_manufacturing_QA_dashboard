import React, { useState, useMemo } from 'react';
import { Paper, Typography, Box, ToggleButton, ToggleButtonGroup } from '@mui/material';
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

dayjs.extend(weekOfYear);

interface TrendAnalysisProps {
  data: QualityData[];
}

type ViewMode = 'daily' | 'weekly' | 'monthly';

const TrendAnalysis: React.FC<TrendAnalysisProps> = ({ data }) => {
  const [viewMode, setViewMode] = useState<ViewMode>('daily');
  const [selectedMetric, setSelectedMetric] = useState('gsm');

  const metrics = [
    { key: 'gsm', label: 'GSM', unit: 'g/m²' },
    { key: 'thickness', label: 'Thickness', unit: 'mm' },
    { key: 'tensileStrengthMD', label: 'Tensile MD', unit: 'N/m' },
    { key: 'tensileStrengthCD', label: 'Tensile CD', unit: 'N/m' },
    { key: 'bulk', label: 'Bulk', unit: 'cm³/g' },
    { key: 'brightness', label: 'Brightness', unit: '%' },
    { key: 'moistureContent', label: 'Moisture', unit: '%' },
  ];

  const aggregatedData = useMemo(() => {
    if (viewMode === 'daily') {
      return data.slice(0, 30).reverse().map(d => ({
        date: dayjs(d.date).format('MM/DD'),
        value: d[selectedMetric] as number,
        lcl: d[`${selectedMetric}Lcl`] as number,
        ucl: d[`${selectedMetric}Ucl`] as number,
      }));
    }

    const grouped: { [key: string]: QualityData[] } = {};
    
    data.forEach(d => {
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
  }, [data, viewMode, selectedMetric]);

  const currentMetric = metrics.find(m => m.key === selectedMetric)!;

  return (
    <Paper sx={{ p: 3 }}>
      <Box sx={{ mb: 3 }}>
        <Typography variant="h5" gutterBottom>
          Trend Analysis
        </Typography>
        
        <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', mt: 2 }}>
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
        </Box>
      </Box>

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

      <Box sx={{ height: 400 }}>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={aggregatedData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="date" />
            <YAxis label={{ value: currentMetric.unit, angle: -90, position: 'insideLeft' }} />
            <Tooltip />
            <Legend />
            
            <ReferenceLine
              y={aggregatedData[0]?.lcl}
              stroke="#ff9800"
              strokeDasharray="3 3"
              label="LCL"
            />
            <ReferenceLine
              y={aggregatedData[0]?.ucl}
              stroke="#ff9800"
              strokeDasharray="3 3"
              label="UCL"
            />
            
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