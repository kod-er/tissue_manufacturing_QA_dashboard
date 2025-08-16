import React, { useState, useMemo, useCallback } from 'react';
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
  useTheme,
  Button,
  IconButton
} from '@mui/material';
import {
  CurrencyRupee as CurrencyRupeeIcon,
  TrendingUp as TrendingUpIcon,
  TrendingDown as TrendingDownIcon,
  LocalShipping as LocalShippingIcon,
  Factory as FactoryIcon,
  People as PeopleIcon,
  WaterDrop as WaterDropIcon,
  Bolt as BoltIcon,
  Science as ScienceIcon,
  Build as BuildIcon,
  CalendarToday as CalendarIcon,
  DateRange as DateRangeIcon
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
import { CostingData as ImportedCostingData } from '../utils/parseCostingData';
import CostingUpload from './CostingUpload';

// Define interfaces for costing data
interface CostBreakdown {
  category: string;
  amount: number;
  percentage: number;
  trend: 'up' | 'down' | 'stable';
  variance: number;
}

interface MaterialConsumption {
  material: string;
  quantity: number;
  cost: number;
  costPerKg: number;
  percentage: number;
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

// Format currency in Indian style (Lakhs and Crores)
const formatIndianCurrency = (amount: number): string => {
  const absAmount = Math.abs(amount);
  
  if (absAmount >= 10000000) { // 1 Crore or more
    return `₹${(amount / 10000000).toFixed(2)} Cr`;
  } else if (absAmount >= 100000) { // 1 Lakh or more
    return `₹${(amount / 100000).toFixed(2)} L`;
  } else if (absAmount >= 1000) { // 1 Thousand or more
    return `₹${(amount / 1000).toFixed(1)} K`;
  } else {
    return `₹${amount.toFixed(0)}`;
  }
};

// Format number in short form
const formatShortNumber = (num: number): string => {
  if (num >= 1000) {
    return `${(num / 1000).toFixed(1)}K`;
  }
  return num.toFixed(0);
};

interface CostingProps {
  data?: ImportedCostingData[];
}

const Costing: React.FC<CostingProps> = ({ data }) => {
  const [importedData, setImportedData] = useState<ImportedCostingData[] | null>(data || null);
  const theme = useTheme();
  const [timeRange, setTimeRange] = useState<'daily' | 'weekly' | 'monthly'>('daily');
  const [shiftFilter, setShiftFilter] = useState<string>('all');
  const [qualityFilter, setQualityFilter] = useState<string>('all');
  const [gsmFilter, setGsmFilter] = useState<string>('all');
  const [dateRange, setDateRange] = useState<{ start: string; end: string }>({
    start: '',
    end: ''
  });

  // Update imported data when prop changes
  React.useEffect(() => {
    if (data && data.length > 0) {
      setImportedData(data);
    }
  }, [data]);

  // Use imported data if available, otherwise use dummy data
  const rawData = useMemo(() => {
    if (importedData && importedData.length > 0) {
      // Convert imported data to ProductionCost format
      return importedData.map(item => ({
        date: item.date,
        shift: 'Combined', // Imported data doesn't have shift info
        totalCost: item.totalCost,
        costPerKg: item.costPerKg,
        fiber: item.fiberCost,
        chemicals: item.chemicalsCost,
        steam: item.steamCost,
        electricity: item.electricityCost,
        labor: item.laborCost,
        water: item.waterCost,
        maintenance: item.maintenanceCost,
        overhead: item.overheadCost,
        waste: item.wasteCost,
        production: item.totalProduction * 1000, // Convert MT to kg
        quality: item.quality,
        gsmGrade: item.gsmGrade
      }));
    }
    return generateDummyData();
  }, [importedData]);

  // Calculate material consumption metrics
  const materialMetrics = useMemo(() => {
    if (!importedData || importedData.length === 0) return null;

    const materialMap = new Map<string, { quantity: number; cost: number; count: number }>();
    
    // Filter imported data by date range
    const filteredImportedData = importedData.filter(day => {
      if (!dateRange.start || !dateRange.end) return true;
      const itemDate = dayjs(day.date);
      const startDate = dayjs(dateRange.start);
      const endDate = dayjs(dateRange.end);
      return itemDate.isAfter(startDate.subtract(1, 'day')) && itemDate.isBefore(endDate.add(1, 'day'));
    });
    
    filteredImportedData.forEach(day => {
      if (day.rawMaterials) {
        day.rawMaterials.forEach(material => {
          const existing = materialMap.get(material.material) || { quantity: 0, cost: 0, count: 0 };
          materialMap.set(material.material, {
            quantity: existing.quantity + material.quantity,
            cost: existing.cost + material.amount,
            count: existing.count + 1
          });
        });
      }
    });

    const materials = Array.from(materialMap.entries())
      .map(([material, data]) => ({
        material,
        quantity: data.quantity,
        cost: data.cost,
        avgQuantityPerDay: data.quantity / data.count,
        costPerKg: data.cost / data.quantity,
        percentage: 0 // Will calculate after total
      }))
      .sort((a, b) => b.cost - a.cost);

    const totalCost = materials.reduce((sum, m) => sum + m.cost, 0);
    const totalQuantity = materials.reduce((sum, m) => sum + m.quantity, 0);
    materials.forEach(m => {
      m.percentage = (m.cost / totalCost) * 100;
    });

    // Calculate material efficiency metrics
    const totalProduction = filteredImportedData.reduce((sum, d) => sum + d.totalProduction, 0);
    const avgConsumptionPerMT = totalProduction > 0 ? totalQuantity / totalProduction : 0;
    
    // Categorize materials based on common naming patterns
    const materialCategories = {
      softwoodPulp: [] as typeof materials,
      hardwoodPulp: [] as typeof materials,
      tissue: [] as typeof materials,
      others: [] as typeof materials
    };

    materials.forEach(m => {
      const materialLower = m.material.toLowerCase();
      if (materialLower.includes('sodra') || materialLower.includes('stora') || 
          materialLower.includes('metsa') || materialLower.includes('mercer') ||
          materialLower.includes('laja') || materialLower.includes('pacifico') ||
          materialLower.includes('komi') || materialLower.includes('sw') ||
          materialLower.includes('softwood')) {
        materialCategories.softwoodPulp.push(m);
      } else if (materialLower.includes('acacia') || materialLower.includes('cmpc') ||
                 materialLower.includes('baycel') || materialLower.includes('suzano') ||
                 materialLower.includes('hw') || materialLower.includes('hardwood')) {
        materialCategories.hardwoodPulp.push(m);
      } else if (materialLower.includes('tissue')) {
        materialCategories.tissue.push(m);
      } else {
        materialCategories.others.push(m);
      }
    });

    // Calculate costs by category
    const categoryCosts = {
      softwoodPulp: materialCategories.softwoodPulp.reduce((sum, m) => sum + m.cost, 0),
      hardwoodPulp: materialCategories.hardwoodPulp.reduce((sum, m) => sum + m.cost, 0),
      tissue: materialCategories.tissue.reduce((sum, m) => sum + m.cost, 0),
      others: materialCategories.others.reduce((sum, m) => sum + m.cost, 0)
    };

    const categoryData = [
      { name: 'Softwood Pulp', value: categoryCosts.softwoodPulp, percentage: (categoryCosts.softwoodPulp / totalCost) * 100 },
      { name: 'Hardwood Pulp', value: categoryCosts.hardwoodPulp, percentage: (categoryCosts.hardwoodPulp / totalCost) * 100 },
      { name: 'Recycled Tissue', value: categoryCosts.tissue, percentage: (categoryCosts.tissue / totalCost) * 100 },
      { name: 'Others', value: categoryCosts.others, percentage: (categoryCosts.others / totalCost) * 100 }
    ].filter(cat => cat.value > 0);

    const fiberCost = categoryCosts.softwoodPulp + categoryCosts.hardwoodPulp + categoryCosts.tissue;
    const fiberPercentage = (fiberCost / totalCost) * 100;

    return {
      materials,
      totalQuantity,
      totalCost,
      topMaterials: materials.slice(0, 5),
      avgConsumptionPerMT,
      fiberCost,
      fiberPercentage,
      totalProduction,
      materialCategories,
      categoryCosts,
      categoryData
    };
  }, [importedData, dateRange]);

  // Get unique values for filters and available dates
  const { uniqueQualities, uniqueGsmGrades, uniqueShifts, availableDates, minDate, maxDate } = useMemo(() => {
    const qualitiesSet = new Set<string>();
    const gsmSet = new Set<string>();
    const shiftsSet = new Set<string>();
    const datesSet = new Set<string>();
    
    rawData.forEach(item => {
      if (item.quality) qualitiesSet.add(item.quality);
      if (item.gsmGrade) gsmSet.add(item.gsmGrade);
      if (item.shift) shiftsSet.add(item.shift);
      if (item.date) datesSet.add(item.date);
    });
    
    const sortedDates = Array.from(datesSet).sort();
    
    return {
      uniqueQualities: Array.from(qualitiesSet).sort(),
      uniqueGsmGrades: Array.from(gsmSet).sort(),
      uniqueShifts: Array.from(shiftsSet).sort(),
      availableDates: sortedDates,
      minDate: sortedDates[0] || dayjs().format('YYYY-MM-DD'),
      maxDate: sortedDates[sortedDates.length - 1] || dayjs().format('YYYY-MM-DD')
    };
  }, [rawData]);

  // Set initial date range when data is loaded
  React.useEffect(() => {
    if (minDate && maxDate && !dateRange.start && !dateRange.end) {
      // Set default to last 30 days or available range
      const thirtyDaysAgo = dayjs(maxDate).subtract(30, 'days').format('YYYY-MM-DD');
      const startDate = thirtyDaysAgo > minDate ? thirtyDaysAgo : minDate;
      setDateRange({
        start: startDate,
        end: maxDate
      });
    }
  }, [minDate, maxDate]);

  // Filter data
  const filteredData = useMemo(() => {
    let filtered = rawData;
    
    // Date filter
    if (dateRange.start && dateRange.end) {
      filtered = filtered.filter(d => {
        const itemDate = dayjs(d.date);
        const startDate = dayjs(dateRange.start);
        const endDate = dayjs(dateRange.end);
        return itemDate.isAfter(startDate.subtract(1, 'day')) && itemDate.isBefore(endDate.add(1, 'day'));
      });
    }
    
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
  }, [rawData, shiftFilter, qualityFilter, gsmFilter, dateRange]);

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
      case category.includes('Overhead'): return <CurrencyRupeeIcon />;
      case category.includes('Waste'): return <WaterDropIcon />;
      default: return <CurrencyRupeeIcon />;
    }
  };

  const handleDataUpload = (data: ImportedCostingData[]) => {
    setImportedData(data);
  };

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 2, flexWrap: 'wrap', gap: 1 }}>
        <Typography variant="h4">
          Tissue Manufacturing Cost Analysis
          {importedData && importedData.length > 0 && (
            <Typography variant="caption" sx={{ ml: 2 }}>
              (Live Data from Excel)
            </Typography>
          )}
        </Typography>
        {dateRange.start && dateRange.end && (
          <Chip
            icon={<CalendarIcon />}
            label={`${dayjs(dateRange.start).format('MMM D')} - ${dayjs(dateRange.end).format('MMM D, YYYY')}`}
            color="primary"
            variant="outlined"
            size="small"
          />
        )}
      </Box>

      {/* File Upload Section */}
      {!importedData && (
        <Box sx={{ mb: 3 }}>
          <CostingUpload onDataParsed={handleDataUpload} />
        </Box>
      )}

      {/* Show reset button if data is loaded */}
      {importedData && (
        <Box sx={{ mb: 2 }}>
          <Button
            variant="outlined"
            size="small"
            onClick={() => setImportedData(null)}
          >
            Load Different File
          </Button>
        </Box>
      )}

      {/* Filters */}
      <Paper sx={{ p: 2, mb: 3 }}>
        <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', alignItems: 'center' }}>
          {/* Date Range Filter */}
          <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
            <DateRangeIcon sx={{ color: 'action.active' }} />
            <TextField
              type="date"
              size="small"
              label="Start Date"
              value={dateRange.start}
              onChange={(e) => setDateRange(prev => ({ ...prev, start: e.target.value }))}
              InputLabelProps={{ shrink: true }}
              inputProps={{
                min: minDate,
                max: maxDate
              }}
              sx={{ width: 150 }}
            />
            <Typography variant="body2">to</Typography>
            <TextField
              type="date"
              size="small"
              label="End Date"
              value={dateRange.end}
              onChange={(e) => setDateRange(prev => ({ ...prev, end: e.target.value }))}
              InputLabelProps={{ shrink: true }}
              inputProps={{
                min: dateRange.start || minDate,
                max: maxDate
              }}
              sx={{ width: 150 }}
            />
          </Box>

          {/* Quick Date Presets */}
          <Box sx={{ display: 'flex', gap: 0.5 }}>
            <Button
              size="small"
              onClick={() => {
                const sevenDaysAgo = dayjs(maxDate).subtract(7, 'days').format('YYYY-MM-DD');
                setDateRange({
                  start: sevenDaysAgo < minDate ? minDate : sevenDaysAgo,
                  end: maxDate
                });
              }}
            >
              Last 7 days
            </Button>
            <Button
              size="small"
              onClick={() => {
                const thirtyDaysAgo = dayjs(maxDate).subtract(30, 'days').format('YYYY-MM-DD');
                setDateRange({
                  start: thirtyDaysAgo < minDate ? minDate : thirtyDaysAgo,
                  end: maxDate
                });
              }}
            >
              Last 30 days
            </Button>
            <Button
              size="small"
              onClick={() => setDateRange({
                start: minDate,
                end: maxDate
              })}
            >
              All Data
            </Button>
          </Box>

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
            {uniqueShifts.map(shift => (
              <MenuItem key={shift} value={shift}>{shift}</MenuItem>
            ))}
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
            {uniqueQualities.map(quality => (
              <MenuItem key={quality} value={quality}>{quality}</MenuItem>
            ))}
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
            {uniqueGsmGrades.map(gsm => (
              <MenuItem key={gsm} value={gsm}>{gsm}</MenuItem>
            ))}
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
                <CurrencyRupeeIcon sx={{ fontSize: 40, color: 'primary.light' }} />
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

        <Box sx={{ flex: '1 1 300px', minWidth: 250 }}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Box>
                  <Typography color="textSecondary" gutterBottom variant="body2">
                    Total Cost
                  </Typography>
                  <Typography variant="h4">
                    {formatIndianCurrency(kpis.totalCost)}
                  </Typography>
                  <Typography variant="body2" color="textSecondary">
                    Last 7 days
                  </Typography>
                </Box>
                <CurrencyRupeeIcon sx={{ fontSize: 40, color: 'primary.light' }} />
              </Box>
            </CardContent>
          </Card>
        </Box>

        {materialMetrics && (
          <Box sx={{ flex: '1 1 300px', minWidth: 250 }}>
            <Card>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <Box>
                    <Typography color="textSecondary" gutterBottom variant="body2">
                      Pulp Ratio
                    </Typography>
                    <Typography variant="h4">
                      {materialMetrics.avgConsumptionPerMT.toFixed(3)}
                    </Typography>
                    <Typography variant="body2" color="textSecondary">
                      MT pulp/MT production
                    </Typography>
                  </Box>
                  <FactoryIcon sx={{ fontSize: 40, color: 'secondary.light' }} />
                </Box>
              </CardContent>
            </Card>
          </Box>
        )}
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
                  <YAxis 
                    yAxisId="left" 
                    label={{ value: 'Cost (₹)', angle: -90, position: 'insideLeft' }}
                    tickFormatter={(value) => formatShortNumber(value)}
                  />
                  <YAxis yAxisId="right" orientation="right" label={{ value: 'Cost per Kg (₹)', angle: 90, position: 'insideRight' }} />
                  <Tooltip 
                    formatter={(value: any, name: string) => {
                      if (name === 'Total Cost') {
                        return formatIndianCurrency(value);
                      }
                      return `₹${value.toFixed(2)}`;
                    }}
                  />
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
                  <Tooltip 
                    formatter={(value: any, name: string) => {
                      if (typeof value === 'number') {
                        return `${value.toFixed(1)}%`;
                      }
                      return value;
                    }}
                  />
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
                      <TableCell align="right">{formatIndianCurrency(row.amount)}</TableCell>
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
                  <YAxis 
                    label={{ value: 'Cost (₹)', angle: -90, position: 'insideLeft' }}
                    tickFormatter={(value) => formatShortNumber(value)}
                  />
                  <Tooltip 
                    formatter={(value: any, name: string) => formatIndianCurrency(value)}
                  />
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

      {/* Material Consumption Analysis */}
      {materialMetrics && (
        <Box sx={{ mt: 3 }}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              Raw Material Consumption Analysis
            </Typography>
            
            {/* Material KPIs */}
            <Box sx={{ display: 'flex', gap: 3, mb: 3, flexWrap: 'wrap' }}>
              <Box sx={{ flex: '1 1 200px' }}>
                <Typography variant="body2" color="textSecondary">
                  Total Material Cost
                </Typography>
                <Typography variant="h5">
                  {formatIndianCurrency(materialMetrics.totalCost)}
                </Typography>
              </Box>
              <Box sx={{ flex: '1 1 200px' }}>
                <Typography variant="body2" color="textSecondary">
                  Total Quantity
                </Typography>
                <Typography variant="h5">
                  {materialMetrics.totalQuantity.toFixed(2)} MT
                </Typography>
              </Box>
              <Box sx={{ flex: '1 1 200px' }}>
                <Typography variant="body2" color="textSecondary">
                  Consumption Rate
                </Typography>
                <Typography variant="h5">
                  {materialMetrics.avgConsumptionPerMT.toFixed(3)} MT/MT
                </Typography>
                <Typography variant="caption" color="textSecondary">
                  Per MT of production
                </Typography>
              </Box>
              <Box sx={{ flex: '1 1 200px' }}>
                <Typography variant="body2" color="textSecondary">
                  Fiber Cost %
                </Typography>
                <Typography variant="h5">
                  {materialMetrics.fiberPercentage.toFixed(1)}%
                </Typography>
                <Typography variant="caption" color="textSecondary">
                  {formatIndianCurrency(materialMetrics.fiberCost)}
                </Typography>
              </Box>
            </Box>

            {/* Top Materials Table */}
            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Material</TableCell>
                    <TableCell align="right">Quantity (MT)</TableCell>
                    <TableCell align="right">Total Cost</TableCell>
                    <TableCell align="right">Cost/MT</TableCell>
                    <TableCell align="right">% of Total</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {materialMetrics.topMaterials.map((material) => (
                    <TableRow key={material.material}>
                      <TableCell>{material.material}</TableCell>
                      <TableCell align="right">{material.quantity.toFixed(2)}</TableCell>
                      <TableCell align="right">{formatIndianCurrency(material.cost)}</TableCell>
                      <TableCell align="right">{formatIndianCurrency(material.costPerKg)}</TableCell>
                      <TableCell align="right">{material.percentage.toFixed(1)}%</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>

            {/* Material Category Breakdown */}
            <Box sx={{ mt: 3 }}>
              <Typography variant="subtitle2" gutterBottom>
                Material Category Breakdown
              </Typography>
              <Box sx={{ display: 'flex', gap: 3, flexWrap: 'wrap' }}>
                {/* Category Pie Chart */}
                <Box sx={{ flex: '1 1 300px', height: 300 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={materialMetrics.categoryData}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={(entry) => `${entry.name}: ${entry.percentage.toFixed(1)}%`}
                        outerRadius={100}
                        fill="#8884d8"
                        dataKey="value"
                      >
                        {materialMetrics.categoryData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(value: any) => formatIndianCurrency(value)} />
                    </PieChart>
                  </ResponsiveContainer>
                </Box>
                
                {/* Category Details */}
                <Box sx={{ flex: '1 1 300px' }}>
                  <TableContainer>
                    <Table size="small">
                      <TableHead>
                        <TableRow>
                          <TableCell>Category</TableCell>
                          <TableCell align="right">Cost</TableCell>
                          <TableCell align="right">%</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {materialMetrics.categoryData.map((cat) => (
                          <TableRow key={cat.name}>
                            <TableCell>{cat.name}</TableCell>
                            <TableCell align="right">{formatIndianCurrency(cat.value)}</TableCell>
                            <TableCell align="right">{cat.percentage.toFixed(1)}%</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>
                </Box>
              </Box>
            </Box>

            {/* Material Mix Details */}
            <Box sx={{ mt: 3 }}>
              <Typography variant="subtitle2" gutterBottom>
                Top 5 Materials by Cost
              </Typography>
              <Box sx={{ height: 300 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={materialMetrics.topMaterials}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="material" angle={-45} textAnchor="end" height={100} />
                    <YAxis tickFormatter={(value) => formatShortNumber(value)} />
                    <Tooltip formatter={(value: any) => formatIndianCurrency(value)} />
                    <Bar dataKey="cost" fill="#2196f3" />
                  </BarChart>
                </ResponsiveContainer>
              </Box>
            </Box>

            {/* Detailed Category Tables */}
            <Box sx={{ mt: 3 }}>
              <Typography variant="subtitle2" gutterBottom>
                Material Details by Category
              </Typography>
              
              {/* Softwood Pulp */}
              {materialMetrics.materialCategories.softwoodPulp.length > 0 && (
                <Box sx={{ mt: 2 }}>
                  <Typography variant="body2" color="primary" gutterBottom>
                    Softwood Pulp
                  </Typography>
                  <TableContainer sx={{ maxHeight: 200 }}>
                    <Table size="small" stickyHeader>
                      <TableHead>
                        <TableRow>
                          <TableCell>Material</TableCell>
                          <TableCell align="right">Qty (MT)</TableCell>
                          <TableCell align="right">Rate/MT</TableCell>
                          <TableCell align="right">Cost</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {materialMetrics.materialCategories.softwoodPulp.map((m) => (
                          <TableRow key={m.material}>
                            <TableCell>{m.material}</TableCell>
                            <TableCell align="right">{m.quantity.toFixed(2)}</TableCell>
                            <TableCell align="right">{formatIndianCurrency(m.costPerKg)}</TableCell>
                            <TableCell align="right">{formatIndianCurrency(m.cost)}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>
                </Box>
              )}

              {/* Hardwood Pulp */}
              {materialMetrics.materialCategories.hardwoodPulp.length > 0 && (
                <Box sx={{ mt: 2 }}>
                  <Typography variant="body2" color="primary" gutterBottom>
                    Hardwood Pulp
                  </Typography>
                  <TableContainer sx={{ maxHeight: 200 }}>
                    <Table size="small" stickyHeader>
                      <TableHead>
                        <TableRow>
                          <TableCell>Material</TableCell>
                          <TableCell align="right">Qty (MT)</TableCell>
                          <TableCell align="right">Rate/MT</TableCell>
                          <TableCell align="right">Cost</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {materialMetrics.materialCategories.hardwoodPulp.map((m) => (
                          <TableRow key={m.material}>
                            <TableCell>{m.material}</TableCell>
                            <TableCell align="right">{m.quantity.toFixed(2)}</TableCell>
                            <TableCell align="right">{formatIndianCurrency(m.costPerKg)}</TableCell>
                            <TableCell align="right">{formatIndianCurrency(m.cost)}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>
                </Box>
              )}
            </Box>
          </Paper>
        </Box>
      )}
    </Box>
  );
};

export default Costing;