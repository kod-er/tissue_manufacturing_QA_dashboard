import React, { useState, useMemo } from 'react';
import {
  Paper,
  Typography,
  Box,
  Card,
  CardContent,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  MenuItem,
  ToggleButton,
  ToggleButtonGroup,
  Chip,
  LinearProgress,
  useTheme
} from '@mui/material';
import {
  AttachMoney as AttachMoneyIcon,
  TrendingUp as TrendingUpIcon,
  TrendingDown as TrendingDownIcon,
  LocalShipping as LocalShippingIcon,
  Factory as FactoryIcon,
  People as PeopleIcon,
  WaterDrop as WaterDropIcon,
  Bolt as BoltIcon,
  Science as ScienceIcon,
  Build as BuildIcon
} from '@mui/icons-material';
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from 'recharts';
import dayjs from 'dayjs';

// Define interfaces for costing data
interface CostBreakdown {
  category: string;
  amount: number;
  percentage: number;
  trend: 'up' | 'down' | 'stable';
  variance: number;
}

interface ProductionCost {
  date: string;
  shift: string;
  totalCost: number;
  costPerKg: number;
  fiber: number;
  chemicals: number;
  steam: number;
  electricity: number;
  labor: number;
  water: number;
  maintenance: number;
  overhead: number;
  waste: number;
  production: number;
  quality: string;
  gsmGrade: string;
}

// Generate dummy data
const generateDummyData = (): ProductionCost[] => {
  const shifts = ['Morning', 'Evening', 'Night'];
  const qualities = ['Premium', 'Standard', 'Economy'];
  const gsmGrades = ['17 GSM', '19 GSM', '23 GSM', '25 GSM'];
  const data: ProductionCost[] = [];

  // Generate data for last 30 days
  for (let i = 29; i >= 0; i--) {
    const date = dayjs().subtract(i, 'day').format('YYYY-MM-DD');
    
    shifts.forEach(shift => {
      const baseProduction = 8000 + Math.random() * 4000; // 8-12 tons
      const baseCost = 35000 + Math.random() * 15000; // ₹35,000-50,000 per shift
      
      data.push({
        date,
        shift,
        totalCost: baseCost,
        costPerKg: baseCost / baseProduction,
        fiber: baseCost * 0.35,        // Wood pulp/recycled fiber - 35%
        chemicals: baseCost * 0.12,     // Bleaching agents, wet strength additives - 12%
        steam: baseCost * 0.18,         // Steam for drying - 18%
        electricity: baseCost * 0.08,   // Motors, pumps, lighting - 8%
        labor: baseCost * 0.10,         // Indian labor costs - 10%
        water: baseCost * 0.05,         // Water treatment & usage - 5%
        maintenance: baseCost * 0.06,   // Equipment maintenance - 6%
        overhead: baseCost * 0.04,      // Admin & other overheads - 4%
        waste: baseCost * 0.02,         // Waste management - 2%
        production: baseProduction,
        quality: qualities[Math.floor(Math.random() * qualities.length)],
        gsmGrade: gsmGrades[Math.floor(Math.random() * gsmGrades.length)]
      });
    });
  }

  return data;
};

const COLORS = ['#2196f3', '#ff5722', '#4caf50', '#ff9800', '#9c27b0', '#00bcd4', '#795548', '#607d8b', '#e91e63'];

const Costing: React.FC = () => {
  const theme = useTheme();
  const [timeRange, setTimeRange] = useState<'daily' | 'weekly' | 'monthly'>('daily');
  const [shiftFilter, setShiftFilter] = useState<string>('all');
  const [qualityFilter, setQualityFilter] = useState<string>('all');
  const [gsmFilter, setGsmFilter] = useState<string>('all');

  // Generate dummy data
  const rawData = useMemo(() => generateDummyData(), []);

  // Filter data
  const filteredData = useMemo(() => {
    let filtered = rawData;
    
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
  }, [rawData, shiftFilter, qualityFilter, gsmFilter]);

  // Aggregate data based on time range
  const aggregatedData = useMemo(() => {
    const grouped: { [key: string]: ProductionCost[] } = {};

    filteredData.forEach(item => {
      let key: string;
      if (timeRange === 'daily') {
        key = item.date;
      } else if (timeRange === 'weekly') {
        key = dayjs(item.date).startOf('week').format('YYYY-MM-DD');
      } else {
        key = dayjs(item.date).format('YYYY-MM');
      }

      if (!grouped[key]) {
        grouped[key] = [];
      }
      grouped[key].push(item);
    });

    return Object.entries(grouped).map(([date, items]) => {
      const totalCost = items.reduce((sum, item) => sum + item.totalCost, 0);
      const totalProduction = items.reduce((sum, item) => sum + item.production, 0);
      
      return {
        date: timeRange === 'daily' ? dayjs(date).format('MMM DD') :
              timeRange === 'weekly' ? `Week of ${dayjs(date).format('MMM DD')}` :
              dayjs(date).format('MMM YYYY'),
        totalCost,
        costPerKg: totalCost / totalProduction,
        fiber: items.reduce((sum, item) => sum + item.fiber, 0),
        chemicals: items.reduce((sum, item) => sum + item.chemicals, 0),
        steam: items.reduce((sum, item) => sum + item.steam, 0),
        electricity: items.reduce((sum, item) => sum + item.electricity, 0),
        labor: items.reduce((sum, item) => sum + item.labor, 0),
        water: items.reduce((sum, item) => sum + item.water, 0),
        maintenance: items.reduce((sum, item) => sum + item.maintenance, 0),
        overhead: items.reduce((sum, item) => sum + item.overhead, 0),
        waste: items.reduce((sum, item) => sum + item.waste, 0),
        production: totalProduction,
        efficiency: (totalProduction / (items.length * 10000)) * 100 // Assuming 10k kg capacity per shift
      };
    }).sort((a, b) => a.date.localeCompare(b.date));
  }, [filteredData, timeRange]);

  // Calculate cost breakdown
  const costBreakdown: CostBreakdown[] = useMemo(() => {
    const totals = filteredData.reduce((acc, item) => ({
      fiber: acc.fiber + item.fiber,
      chemicals: acc.chemicals + item.chemicals,
      steam: acc.steam + item.steam,
      electricity: acc.electricity + item.electricity,
      labor: acc.labor + item.labor,
      water: acc.water + item.water,
      maintenance: acc.maintenance + item.maintenance,
      overhead: acc.overhead + item.overhead,
      waste: acc.waste + item.waste,
      total: acc.total + item.totalCost
    }), { fiber: 0, chemicals: 0, steam: 0, electricity: 0, labor: 0, water: 0, maintenance: 0, overhead: 0, waste: 0, total: 0 });

    return [
      {
        category: 'Fiber (Wood Pulp/Recycled)',
        amount: totals.fiber,
        percentage: (totals.fiber / totals.total) * 100,
        trend: 'up',
        variance: 4.5
      },
      {
        category: 'Chemicals',
        amount: totals.chemicals,
        percentage: (totals.chemicals / totals.total) * 100,
        trend: 'up',
        variance: 2.8
      },
      {
        category: 'Steam',
        amount: totals.steam,
        percentage: (totals.steam / totals.total) * 100,
        trend: 'down',
        variance: -1.5
      },
      {
        category: 'Electricity',
        amount: totals.electricity,
        percentage: (totals.electricity / totals.total) * 100,
        trend: 'up',
        variance: 3.2
      },
      {
        category: 'Labor',
        amount: totals.labor,
        percentage: (totals.labor / totals.total) * 100,
        trend: 'stable',
        variance: 0.5
      },
      {
        category: 'Water',
        amount: totals.water,
        percentage: (totals.water / totals.total) * 100,
        trend: 'stable',
        variance: -0.3
      },
      {
        category: 'Maintenance',
        amount: totals.maintenance,
        percentage: (totals.maintenance / totals.total) * 100,
        trend: 'up',
        variance: 1.8
      },
      {
        category: 'Overhead',
        amount: totals.overhead,
        percentage: (totals.overhead / totals.total) * 100,
        trend: 'stable',
        variance: 0.2
      },
      {
        category: 'Waste Management',
        amount: totals.waste,
        percentage: (totals.waste / totals.total) * 100,
        trend: 'down',
        variance: -2.1
      }
    ];
  }, [filteredData]);

  // Calculate KPIs
  const kpis = useMemo(() => {
    const currentPeriod = aggregatedData.slice(-7);
    const previousPeriod = aggregatedData.slice(-14, -7);
    
    const currentAvgCost = currentPeriod.reduce((sum, item) => sum + item.costPerKg, 0) / currentPeriod.length;
    const previousAvgCost = previousPeriod.reduce((sum, item) => sum + item.costPerKg, 0) / previousPeriod.length;
    const costChange = ((currentAvgCost - previousAvgCost) / previousAvgCost) * 100;

    const currentEfficiency = currentPeriod.reduce((sum, item) => sum + item.efficiency, 0) / currentPeriod.length;
    const totalWaste = currentPeriod.reduce((sum, item) => sum + item.waste, 0);
    const totalCost = currentPeriod.reduce((sum, item) => sum + item.totalCost, 0);

    return {
      avgCostPerKg: currentAvgCost,
      costChange,
      efficiency: currentEfficiency,
      wastePercentage: (totalWaste / totalCost) * 100,
      totalProduction: currentPeriod.reduce((sum, item) => sum + item.production, 0),
      totalCost
    };
  }, [aggregatedData]);

  const getIcon = (category: string) => {
    switch (true) {
      case category.includes('Fiber'): return <FactoryIcon />;
      case category.includes('Chemical'): return <ScienceIcon />;
      case category.includes('Steam'): return <WaterDropIcon />;
      case category.includes('Electricity'): return <BoltIcon />;
      case category.includes('Labor'): return <PeopleIcon />;
      case category.includes('Water'): return <WaterDropIcon />;
      case category.includes('Maintenance'): return <BuildIcon />;
      case category.includes('Overhead'): return <AttachMoneyIcon />;
      case category.includes('Waste'): return <WaterDropIcon />;
      default: return <AttachMoneyIcon />;
    }
  };

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" gutterBottom>
        Tissue Manufacturing Cost Analysis
      </Typography>

      {/* Filters */}
      <Paper sx={{ p: 2, mb: 3 }}>
        <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', alignItems: 'center' }}>
          <ToggleButtonGroup
            value={timeRange}
            exclusive
            onChange={(_, value) => value && setTimeRange(value)}
            size="small"
          >
            <ToggleButton value="daily">Daily</ToggleButton>
            <ToggleButton value="weekly">Weekly</ToggleButton>
            <ToggleButton value="monthly">Monthly</ToggleButton>
          </ToggleButtonGroup>

          <TextField
            select
            size="small"
            value={shiftFilter}
            onChange={(e) => setShiftFilter(e.target.value)}
            sx={{ minWidth: 120 }}
            label="Shift"
          >
            <MenuItem value="all">All Shifts</MenuItem>
            <MenuItem value="Morning">Morning</MenuItem>
            <MenuItem value="Evening">Evening</MenuItem>
            <MenuItem value="Night">Night</MenuItem>
          </TextField>

          <TextField
            select
            size="small"
            value={qualityFilter}
            onChange={(e) => setQualityFilter(e.target.value)}
            sx={{ minWidth: 120 }}
            label="Quality"
          >
            <MenuItem value="all">All Qualities</MenuItem>
            <MenuItem value="Premium">Premium</MenuItem>
            <MenuItem value="Standard">Standard</MenuItem>
            <MenuItem value="Economy">Economy</MenuItem>
          </TextField>

          <TextField
            select
            size="small"
            value={gsmFilter}
            onChange={(e) => setGsmFilter(e.target.value)}
            sx={{ minWidth: 120 }}
            label="GSM Grade"
          >
            <MenuItem value="all">All GSM</MenuItem>
            <MenuItem value="17 GSM">17 GSM</MenuItem>
            <MenuItem value="19 GSM">19 GSM</MenuItem>
            <MenuItem value="23 GSM">23 GSM</MenuItem>
            <MenuItem value="25 GSM">25 GSM</MenuItem>
          </TextField>
        </Box>
      </Paper>

      {/* KPI Cards */}
      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 3, mb: 3 }}>
        <Box sx={{ flex: '1 1 300px', minWidth: 250 }}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Box>
                  <Typography color="textSecondary" gutterBottom variant="body2">
                    Avg Cost per Kg
                  </Typography>
                  <Typography variant="h4">
                    ₹{kpis.avgCostPerKg.toFixed(2)}
                  </Typography>
                  <Box sx={{ display: 'flex', alignItems: 'center', mt: 1 }}>
                    {kpis.costChange > 0 ? (
                      <TrendingUpIcon color="error" fontSize="small" />
                    ) : (
                      <TrendingDownIcon color="success" fontSize="small" />
                    )}
                    <Typography
                      variant="body2"
                      color={kpis.costChange > 0 ? 'error' : 'success.main'}
                      sx={{ ml: 0.5 }}
                    >
                      {Math.abs(kpis.costChange).toFixed(1)}%
                    </Typography>
                  </Box>
                </Box>
                <AttachMoneyIcon sx={{ fontSize: 40, color: 'primary.light' }} />
              </Box>
            </CardContent>
          </Card>
        </Box>

        <Box sx={{ flex: '1 1 300px', minWidth: 250 }}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Box>
                  <Typography color="textSecondary" gutterBottom variant="body2">
                    Production Efficiency
                  </Typography>
                  <Typography variant="h4">
                    {kpis.efficiency.toFixed(1)}%
                  </Typography>
                  <LinearProgress
                    variant="determinate"
                    value={kpis.efficiency}
                    sx={{ mt: 1, height: 8, borderRadius: 4 }}
                  />
                </Box>
                <FactoryIcon sx={{ fontSize: 40, color: 'success.light' }} />
              </Box>
            </CardContent>
          </Card>
        </Box>

        <Box sx={{ flex: '1 1 300px', minWidth: 250 }}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Box>
                  <Typography color="textSecondary" gutterBottom variant="body2">
                    Waste Percentage
                  </Typography>
                  <Typography variant="h4">
                    {kpis.wastePercentage.toFixed(1)}%
                  </Typography>
                  <Chip
                    label="Target: 2%"
                    color={kpis.wastePercentage <= 2 ? 'success' : 'warning'}
                    size="small"
                    sx={{ mt: 1 }}
                  />
                </Box>
                <WaterDropIcon sx={{ fontSize: 40, color: 'warning.light' }} />
              </Box>
            </CardContent>
          </Card>
        </Box>

        <Box sx={{ flex: '1 1 300px', minWidth: 250 }}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Box>
                  <Typography color="textSecondary" gutterBottom variant="body2">
                    Total Production
                  </Typography>
                  <Typography variant="h4">
                    {(kpis.totalProduction / 1000).toFixed(1)}T
                  </Typography>
                  <Typography variant="body2" color="textSecondary">
                    Last 7 days
                  </Typography>
                </Box>
                <LocalShippingIcon sx={{ fontSize: 40, color: 'info.light' }} />
              </Box>
            </CardContent>
          </Card>
        </Box>
      </Box>

      {/* Charts */}
      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 3 }}>
        {/* Cost Trend Chart */}
        <Box sx={{ flex: '1 1 600px', minWidth: 400 }}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              Cost Trend Analysis
            </Typography>
            <Box sx={{ height: 400 }}>
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={aggregatedData.slice(-15)}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" angle={-45} textAnchor="end" height={60} />
                  <YAxis yAxisId="left" label={{ value: 'Cost (₹)', angle: -90, position: 'insideLeft' }} />
                  <YAxis yAxisId="right" orientation="right" label={{ value: 'Cost per Kg (₹)', angle: 90, position: 'insideRight' }} />
                  <Tooltip />
                  <Legend />
                  <Line
                    yAxisId="left"
                    type="monotone"
                    dataKey="totalCost"
                    stroke="#2196f3"
                    name="Total Cost"
                    strokeWidth={2}
                  />
                  <Line
                    yAxisId="right"
                    type="monotone"
                    dataKey="costPerKg"
                    stroke="#ff5722"
                    name="Cost per Kg"
                    strokeWidth={2}
                  />
                </LineChart>
              </ResponsiveContainer>
            </Box>
          </Paper>
        </Box>

        {/* Cost Breakdown Pie Chart */}
        <Box sx={{ flex: '1 1 400px', minWidth: 300 }}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              Cost Breakdown
            </Typography>
            <Box sx={{ height: 400 }}>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={costBreakdown}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ percentage }) => `${percentage.toFixed(0)}%`}
                    outerRadius={120}
                    fill="#8884d8"
                    dataKey="percentage"
                  >
                    {costBreakdown.map((entry, index) => (
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

      {/* Cost Category Table */}
      <Box sx={{ mt: 3 }}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              Cost Category Details
            </Typography>
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Category</TableCell>
                    <TableCell align="right">Amount (₹)</TableCell>
                    <TableCell align="right">Percentage</TableCell>
                    <TableCell align="center">Trend</TableCell>
                    <TableCell align="right">Variance (%)</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {costBreakdown.map((row) => (
                    <TableRow key={row.category}>
                      <TableCell>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          {getIcon(row.category)}
                          {row.category}
                        </Box>
                      </TableCell>
                      <TableCell align="right">₹{row.amount.toLocaleString('en-IN')}</TableCell>
                      <TableCell align="right">{row.percentage.toFixed(1)}%</TableCell>
                      <TableCell align="center">
                        {row.trend === 'up' && <TrendingUpIcon color="error" />}
                        {row.trend === 'down' && <TrendingDownIcon color="success" />}
                        {row.trend === 'stable' && <span>-</span>}
                      </TableCell>
                      <TableCell align="right">
                        <Typography
                          color={row.variance > 0 ? 'error' : 'success.main'}
                        >
                          {row.variance > 0 ? '+' : ''}{row.variance.toFixed(1)}%
                        </Typography>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </Paper>
      </Box>

      {/* Stacked Bar Chart */}
      <Box sx={{ mt: 3 }}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              Cost Components Over Time
            </Typography>
            <Box sx={{ height: 400 }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={aggregatedData.slice(-10)}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="fiber" stackId="a" fill={COLORS[0]} name="Fiber" />
                  <Bar dataKey="chemicals" stackId="a" fill={COLORS[1]} name="Chemicals" />
                  <Bar dataKey="steam" stackId="a" fill={COLORS[2]} name="Steam" />
                  <Bar dataKey="electricity" stackId="a" fill={COLORS[3]} name="Electricity" />
                  <Bar dataKey="labor" stackId="a" fill={COLORS[4]} name="Labor" />
                  <Bar dataKey="water" stackId="a" fill={COLORS[5]} name="Water" />
                  <Bar dataKey="maintenance" stackId="a" fill={COLORS[6]} name="Maintenance" />
                  <Bar dataKey="overhead" stackId="a" fill={COLORS[7]} name="Overhead" />
                  <Bar dataKey="waste" stackId="a" fill={COLORS[8]} name="Waste" />
                </BarChart>
              </ResponsiveContainer>
            </Box>
          </Paper>
      </Box>
    </Box>
  );
};

export default Costing;