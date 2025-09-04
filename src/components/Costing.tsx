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
  DateRange as DateRangeIcon,
  Download as DownloadIcon
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
import isSameOrAfter from 'dayjs/plugin/isSameOrAfter';
import isSameOrBefore from 'dayjs/plugin/isSameOrBefore';
import isoWeek from 'dayjs/plugin/isoWeek';
import { CostingData as ImportedCostingData, ProductionLoss } from '../utils/parseCostingData';
import { generateCostAnalysisExcel } from '../utils/costAnalysisExporter';
import { generateCostAnalysisPdfReportClean } from '../utils/costAnalysisPdfReportClean';
import CostingUpload from './CostingUpload';

dayjs.extend(isSameOrAfter);
dayjs.extend(isSameOrBefore);
dayjs.extend(isoWeek);

// Define interfaces for costing data
interface CostBreakdown {
  category: string;
  amount: number;
  percentage: number;
  trend: 'up' | 'down' | 'stable';
  variance: number;
  costType: 'Variable' | 'Fixed';
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
  costPerTonMC?: number;
  costPerTonFinish?: number;
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
        costPerTonMC: item.costPerTonMC,
        costPerTonFinish: item.costPerTonFinish,
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

  // Calculate cost breakdown with Variable/Fixed categorization
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

    // Calculate packaging costs from imported data
    let packagingCost = 0;
    if (importedData && importedData.length > 0) {
      // Calculate average packaging cost per MT based on consumption
      const packagingItems = ['Core pipes', 'Stretch film'];
      importedData.forEach(day => {
        if (day.rawMaterials) {
          day.rawMaterials.forEach(material => {
            if (packagingItems.some(item => material.material.includes(item))) {
              packagingCost += material.amount;
            }
          });
        }
      });
    }

    const breakdown = [
      {
        category: 'Fiber',
        amount: totals.fiber,
        percentage: (totals.fiber / totals.total) * 100,
        trend: 'up' as const,
        variance: 4.5,
        costType: 'Variable' as const
      },
      {
        category: 'Chemicals',
        amount: totals.chemicals,
        percentage: (totals.chemicals / totals.total) * 100,
        trend: 'up' as const,
        variance: 2.8,
        costType: 'Variable' as const
      },
      {
        category: 'Steam',
        amount: totals.steam,
        percentage: (totals.steam / totals.total) * 100,
        trend: 'down' as const,
        variance: -1.5,
        costType: 'Variable' as const
      },
      {
        category: 'Power',
        amount: totals.electricity,
        percentage: (totals.electricity / totals.total) * 100,
        trend: 'up' as const,
        variance: 3.2,
        costType: 'Variable' as const
      },
      {
        category: 'Packaging',
        amount: packagingCost,
        percentage: (packagingCost / totals.total) * 100,
        trend: 'stable' as const,
        variance: 1.2,
        costType: 'Variable' as const
      },
      {
        category: 'Water',
        amount: totals.water,
        percentage: (totals.water / totals.total) * 100,
        trend: 'stable' as const,
        variance: -0.3,
        costType: 'Variable' as const
      },
      {
        category: 'Waste',
        amount: totals.waste,
        percentage: (totals.waste / totals.total) * 100,
        trend: 'down' as const,
        variance: -2.1,
        costType: 'Variable' as const
      },
      {
        category: 'Salaries',
        amount: totals.labor,
        percentage: (totals.labor / totals.total) * 100,
        trend: 'stable' as const,
        variance: 0.5,
        costType: 'Fixed' as const
      },
      {
        category: 'R&M',
        amount: totals.maintenance,
        percentage: (totals.maintenance / totals.total) * 100,
        trend: 'up' as const,
        variance: 1.8,
        costType: 'Fixed' as const
      },
      {
        category: 'Overhead',
        amount: totals.overhead,
        percentage: (totals.overhead / totals.total) * 100,
        trend: 'stable' as const,
        variance: 0.2,
        costType: 'Fixed' as const
      }
    ];

    // Sort by percentage descending
    return breakdown.sort((a, b) => b.percentage - a.percentage);
  }, [filteredData, importedData]);

  // Calculate KPIs
  const kpis = useMemo(() => {
    // For imported data, use the actual date range filter
    let currentPeriodData: any[] = aggregatedData;
    let previousPeriodData: any[] = [];
    
    if (importedData && importedData.length > 0 && dateRange.start && dateRange.end) {
      // Filter imported data based on selected date range
      const startDate = dayjs(dateRange.start);
      const endDate = dayjs(dateRange.end);
      
      currentPeriodData = filteredData
        .filter(d => {
          const date = dayjs(d.date);
          return date.isSameOrAfter(startDate) && date.isSameOrBefore(endDate);
        });
      
      // Calculate previous period of same duration
      const duration = endDate.diff(startDate, 'day') + 1;
      const prevStartDate = startDate.subtract(duration, 'day');
      const prevEndDate = startDate.subtract(1, 'day');
      
      previousPeriodData = filteredData
        .filter(d => {
          const date = dayjs(d.date);
          return date.isSameOrAfter(prevStartDate) && date.isSameOrBefore(prevEndDate);
        });
    } else {
      // Default behavior when no date range is selected
      currentPeriodData = aggregatedData.slice(-7);
      previousPeriodData = aggregatedData.slice(-14, -7);
    }
    
    const currentPeriod = currentPeriodData;
    const previousPeriod = previousPeriodData;
    
    const currentAvgCost = currentPeriod.length > 0 
      ? currentPeriod.reduce((sum, item) => sum + (item.costPerKg || 0), 0) / currentPeriod.length
      : 0;
    const previousAvgCost = previousPeriod.length > 0
      ? previousPeriod.reduce((sum, item) => sum + (item.costPerKg || 0), 0) / previousPeriod.length
      : 0;
    const costChange = previousAvgCost > 0 ? ((currentAvgCost - previousAvgCost) / previousAvgCost) * 100 : 0;
    
    // Calculate cost per ton (1 ton = 1000 kg)
    // If we have actual per ton costs from Excel, use those
    let currentAvgCostPerTon: number;
    let previousAvgCostPerTon: number;
    let currentAvgCostPerTonMC: number = currentAvgCost * 1000;
    let previousAvgCostPerTonMC: number = previousAvgCost * 1000;
    let currentAvgCostPerTonFinish: number = currentAvgCost * 1000;
    let previousAvgCostPerTonFinish: number = previousAvgCost * 1000;
    let currentMCCosts: number[] = [];
    let previousMCCosts: number[] = [];
    let currentFinishCosts: number[] = [];
    let previousFinishCosts: number[] = [];
    
    if (importedData && importedData.length > 0) {
      // Try to use actual per ton costs from Excel
      const currentImportedData = importedData.filter(d => 
        currentPeriod.some(p => p.date === d.date)
      );
      const previousImportedData = importedData.filter(d => 
        previousPeriod.some(p => p.date === d.date)
      );
      
      // Calculate MC Production costs
      currentMCCosts = currentImportedData
        .map(d => d.costPerTonMC || 0)
        .filter(cost => cost > 0);
      
      previousMCCosts = previousImportedData
        .map(d => d.costPerTonMC || 0)
        .filter(cost => cost > 0);
      
      // Calculate Finish Production costs
      currentFinishCosts = currentImportedData
        .map(d => d.costPerTonFinish || 0)
        .filter(cost => cost > 0);
      
      previousFinishCosts = previousImportedData
        .map(d => d.costPerTonFinish || 0)
        .filter(cost => cost > 0);
      
      // MC Production average
      currentAvgCostPerTonMC = currentMCCosts.length > 0
        ? currentMCCosts.reduce((sum, cost) => sum + cost, 0) / currentMCCosts.length
        : currentAvgCost * 1000;
      
      previousAvgCostPerTonMC = previousMCCosts.length > 0
        ? previousMCCosts.reduce((sum, cost) => sum + cost, 0) / previousMCCosts.length
        : previousAvgCost * 1000;
      
      // Finish Production average
      currentAvgCostPerTonFinish = currentFinishCosts.length > 0
        ? currentFinishCosts.reduce((sum, cost) => sum + cost, 0) / currentFinishCosts.length
        : currentAvgCost * 1000;
      
      previousAvgCostPerTonFinish = previousFinishCosts.length > 0
        ? previousFinishCosts.reduce((sum, cost) => sum + cost, 0) / previousFinishCosts.length
        : previousAvgCost * 1000;
      
      // Combined average (prefer Finish if available, otherwise MC)
      if (currentFinishCosts.length > 0) {
        currentAvgCostPerTon = currentAvgCostPerTonFinish;
      } else if (currentMCCosts.length > 0) {
        currentAvgCostPerTon = currentAvgCostPerTonMC;
      } else {
        currentAvgCostPerTon = currentAvgCost * 1000;
      }
      
      if (previousFinishCosts.length > 0) {
        previousAvgCostPerTon = previousAvgCostPerTonFinish;
      } else if (previousMCCosts.length > 0) {
        previousAvgCostPerTon = previousAvgCostPerTonMC;
      } else {
        previousAvgCostPerTon = previousAvgCost * 1000;
      }
    } else {
      currentAvgCostPerTon = currentAvgCost * 1000;
      previousAvgCostPerTon = previousAvgCost * 1000;
    }

    // Calculate efficiency from imported data if available
    let currentEfficiency = 85; // Default efficiency
    if (currentPeriod.length > 0) {
      if (importedData && importedData.length > 0) {
        // Use production efficiency from imported data
        const efficiencies = currentPeriod
          .filter(item => item.productionEfficiency !== undefined)
          .map(item => item.productionEfficiency || 0);
        if (efficiencies.length > 0) {
          currentEfficiency = efficiencies.reduce((sum, eff) => sum + eff, 0) / efficiencies.length;
        }
      } else {
        // Calculate from aggregated data
        currentEfficiency = currentPeriod.reduce((sum, item) => sum + (item.efficiency || 85), 0) / currentPeriod.length;
      }
    }
    
    const totalWaste = currentPeriod.reduce((sum, item) => sum + (item.waste || 0), 0);
    const totalCost = currentPeriod.reduce((sum, item) => sum + (item.totalCost || 0), 0);

    return {
      avgCostPerKg: currentAvgCost,
      avgCostPerTon: currentAvgCostPerTon,
      avgCostPerTonMC: importedData ? currentAvgCostPerTonMC : undefined,
      avgCostPerTonFinish: importedData ? currentAvgCostPerTonFinish : undefined,
      costChange,
      costChangeMC: importedData && currentMCCosts.length > 0 && previousMCCosts.length > 0
        ? ((currentAvgCostPerTonMC - previousAvgCostPerTonMC) / previousAvgCostPerTonMC) * 100
        : undefined,
      costChangeFinish: importedData && currentFinishCosts.length > 0 && previousFinishCosts.length > 0
        ? ((currentAvgCostPerTonFinish - previousAvgCostPerTonFinish) / previousAvgCostPerTonFinish) * 100
        : undefined,
      efficiency: currentEfficiency,
      wastePercentage: (totalWaste / totalCost) * 100,
      totalProduction: currentPeriod.reduce((sum, item) => sum + item.production, 0),
      totalCost
    };
  }, [aggregatedData, importedData, filteredData, dateRange]);

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

  const handleExportCostAnalysisExcel = () => {
    try {
      let dataToExport: ImportedCostingData[];
      
      if (importedData && importedData.length > 0) {
        // Use imported data directly
        dataToExport = importedData;
      } else if (filteredData.length > 0) {
        // Convert ProductionCost[] to ImportedCostingData[]
        dataToExport = filteredData.map(item => ({
          date: item.date,
          totalProduction: item.production / 1000, // Convert kg to MT
          totalCost: item.totalCost,
          costPerKg: item.costPerKg,
          costPerTonMC: item.costPerTonMC,
          costPerTonFinish: item.costPerTonFinish,
          fiberCost: item.fiber,
          chemicalsCost: item.chemicals,
          steamCost: item.steam,
          electricityCost: item.electricity,
          laborCost: item.labor,
          waterCost: item.water,
          maintenanceCost: item.maintenance,
          overheadCost: item.overhead,
          wasteCost: item.waste,
          quality: item.quality,
          gsmGrade: item.gsmGrade,
          rawMaterials: [],
          chemicals: [],
          productionLosses: [],
          totalTimeLoss: 0,
          productionEfficiency: 95 // Default efficiency for dummy data
        }));
      } else {
        alert('No data available to export');
        return;
      }

      // Determine the period for the export
      const startDate = dayjs(dateRange.start || dataToExport[0].date);
      const endDate = dayjs(dateRange.end || dataToExport[dataToExport.length - 1].date);
      const monthYear = startDate.format('MMMM YYYY');
      
      // Generate the Excel file
      const excelBlob = generateCostAnalysisExcel(dataToExport, monthYear);
      
      // Create download link and trigger download
      const url = window.URL.createObjectURL(excelBlob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `Cost_Analysis_${startDate.format('YYYY-MM')}.xlsx`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error exporting cost analysis:', error);
      alert('Failed to export cost analysis. Please try again.');
    }
  };

  const handleExportCostAnalysisPdf = async () => {
    try {
      let dataToExport: ImportedCostingData[];
      
      if (importedData && importedData.length > 0) {
        // Use imported data directly
        dataToExport = importedData;
      } else if (filteredData.length > 0) {
        // Convert ProductionCost[] to ImportedCostingData[]
        dataToExport = filteredData.map(item => ({
          date: item.date,
          totalProduction: item.production / 1000, // Convert kg to MT
          totalCost: item.totalCost,
          costPerKg: item.costPerKg,
          costPerTonMC: item.costPerTonMC,
          costPerTonFinish: item.costPerTonFinish,
          fiberCost: item.fiber,
          chemicalsCost: item.chemicals,
          steamCost: item.steam,
          electricityCost: item.electricity,
          laborCost: item.labor,
          waterCost: item.water,
          maintenanceCost: item.maintenance,
          overheadCost: item.overhead,
          wasteCost: item.waste,
          quality: item.quality,
          gsmGrade: item.gsmGrade,
          rawMaterials: [],
          chemicals: [],
          productionLosses: [],
          totalTimeLoss: 0,
          productionEfficiency: 95 // Default efficiency for dummy data
        }));
      } else {
        alert('No data available to export');
        return;
      }

      // Determine the period for the export
      const startDate = dayjs(dateRange.start || dataToExport[0].date);
      const endDate = dayjs(dateRange.end || dataToExport[dataToExport.length - 1].date);
      const monthYear = startDate.format('MMMM YYYY');
      
      // Generate the PDF file
      const pdfBlob = await generateCostAnalysisPdfReportClean(dataToExport, monthYear);
      
      // Create download link and trigger download
      const url = window.URL.createObjectURL(pdfBlob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `Cost_Analysis_Report_${startDate.format('YYYY-MM')}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error exporting cost analysis PDF:', error);
      alert('Failed to export cost analysis report. Please try again.');
    }
  };

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 2, flexWrap: 'wrap', gap: 1 }}>
        <Typography variant="h4">
          Cost Analysis
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
        <Box sx={{ flexGrow: 1 }} />
        {(importedData || filteredData.length > 0) && (
          <>
            <Button
              variant="contained"
              startIcon={<DownloadIcon />}
              size="small"
              onClick={handleExportCostAnalysisPdf}
              sx={{ mr: 1 }}
            >
              Export PDF Report
            </Button>
            <Button
              variant="outlined"
              startIcon={<DownloadIcon />}
              size="small"
              onClick={handleExportCostAnalysisExcel}
            >
              Export Excel
            </Button>
          </>
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
          {/* Date Range Filter - Adaptive based on time range */}
          <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
            <DateRangeIcon sx={{ color: 'action.active' }} />
            {timeRange === 'monthly' ? (
              <>
                <TextField
                  type="month"
                  size="small"
                  label="Start Month"
                  value={dateRange.start ? dayjs(dateRange.start).format('YYYY-MM') : ''}
                  onChange={(e) => {
                    if (e.target.value) {
                      setDateRange(prev => ({ ...prev, start: `${e.target.value}-01` }));
                    } else {
                      setDateRange(prev => ({ ...prev, start: '' }));
                    }
                  }}
                  InputLabelProps={{ shrink: true }}
                  inputProps={{
                    max: dateRange.end ? dayjs(dateRange.end).format('YYYY-MM') : dayjs(maxDate).format('YYYY-MM')
                  }}
                  sx={{ width: 150 }}
                />
                <Typography variant="body2">to</Typography>
                <TextField
                  type="month"
                  size="small"
                  label="End Month"
                  value={dateRange.end ? dayjs(dateRange.end).format('YYYY-MM') : ''}
                  onChange={(e) => {
                    if (e.target.value) {
                      const endOfMonth = dayjs(e.target.value).endOf('month').format('YYYY-MM-DD');
                      setDateRange(prev => ({ ...prev, end: endOfMonth }));
                    } else {
                      setDateRange(prev => ({ ...prev, end: '' }));
                    }
                  }}
                  InputLabelProps={{ shrink: true }}
                  inputProps={{
                    min: dateRange.start ? dayjs(dateRange.start).format('YYYY-MM') : undefined,
                    max: dayjs(maxDate).format('YYYY-MM')
                  }}
                  sx={{ width: 150 }}
                />
              </>
            ) : timeRange === 'weekly' ? (
              <>
                <TextField
                  type="week"
                  size="small"
                  label="Start Week"
                  value={dateRange.start ? `${dayjs(dateRange.start).format('YYYY')}-W${dayjs(dateRange.start).isoWeek().toString().padStart(2, '0')}` : ''}
                  onChange={(e) => {
                    if (e.target.value) {
                      const [year, week] = e.target.value.split('-W');
                      const date = dayjs().year(parseInt(year)).isoWeek(parseInt(week)).startOf('isoWeek');
                      setDateRange(prev => ({ ...prev, start: date.format('YYYY-MM-DD') }));
                    } else {
                      setDateRange(prev => ({ ...prev, start: '' }));
                    }
                  }}
                  InputLabelProps={{ shrink: true }}
                  sx={{ width: 150 }}
                />
                <Typography variant="body2">to</Typography>
                <TextField
                  type="week"
                  size="small"
                  label="End Week"
                  value={dateRange.end ? `${dayjs(dateRange.end).format('YYYY')}-W${dayjs(dateRange.end).isoWeek().toString().padStart(2, '0')}` : ''}
                  onChange={(e) => {
                    if (e.target.value) {
                      const [year, week] = e.target.value.split('-W');
                      const date = dayjs().year(parseInt(year)).isoWeek(parseInt(week)).endOf('isoWeek');
                      setDateRange(prev => ({ ...prev, end: date.format('YYYY-MM-DD') }));
                    } else {
                      setDateRange(prev => ({ ...prev, end: '' }));
                    }
                  }}
                  InputLabelProps={{ shrink: true }}
                  sx={{ width: 150 }}
                />
              </>
            ) : (
              <>
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
              </>
            )}
          </Box>

          {/* Quick Date Presets - Adaptive based on time range */}
          <Box sx={{ display: 'flex', gap: 0.5 }}>
            {timeRange === 'monthly' ? (
              <>
                <Button
                  size="small"
                  onClick={() => {
                    const currentMonth = dayjs(maxDate).startOf('month');
                    setDateRange({
                      start: currentMonth.format('YYYY-MM-DD'),
                      end: currentMonth.endOf('month').format('YYYY-MM-DD')
                    });
                  }}
                >
                  This Month
                </Button>
                <Button
                  size="small"
                  onClick={() => {
                    const lastMonth = dayjs(maxDate).subtract(1, 'month').startOf('month');
                    setDateRange({
                      start: lastMonth.format('YYYY-MM-DD'),
                      end: lastMonth.endOf('month').format('YYYY-MM-DD')
                    });
                  }}
                >
                  Last Month
                </Button>
                <Button
                  size="small"
                  onClick={() => {
                    const threeMonthsAgo = dayjs(maxDate).subtract(3, 'months').startOf('month');
                    setDateRange({
                      start: threeMonthsAgo.format('YYYY-MM-DD'),
                      end: dayjs(maxDate).endOf('month').format('YYYY-MM-DD')
                    });
                  }}
                >
                  Last 3 Months
                </Button>
                <Button
                  size="small"
                  onClick={() => {
                    const sixMonthsAgo = dayjs(maxDate).subtract(6, 'months').startOf('month');
                    setDateRange({
                      start: sixMonthsAgo.format('YYYY-MM-DD'),
                      end: dayjs(maxDate).endOf('month').format('YYYY-MM-DD')
                    });
                  }}
                >
                  Last 6 Months
                </Button>
              </>
            ) : timeRange === 'weekly' ? (
              <>
                <Button
                  size="small"
                  onClick={() => {
                    const thisWeek = dayjs(maxDate).startOf('isoWeek');
                    setDateRange({
                      start: thisWeek.format('YYYY-MM-DD'),
                      end: thisWeek.endOf('isoWeek').format('YYYY-MM-DD')
                    });
                  }}
                >
                  This Week
                </Button>
                <Button
                  size="small"
                  onClick={() => {
                    const lastWeek = dayjs(maxDate).subtract(1, 'week').startOf('isoWeek');
                    setDateRange({
                      start: lastWeek.format('YYYY-MM-DD'),
                      end: lastWeek.endOf('isoWeek').format('YYYY-MM-DD')
                    });
                  }}
                >
                  Last Week
                </Button>
                <Button
                  size="small"
                  onClick={() => {
                    const fourWeeksAgo = dayjs(maxDate).subtract(4, 'weeks').startOf('isoWeek');
                    setDateRange({
                      start: fourWeeksAgo.format('YYYY-MM-DD'),
                      end: dayjs(maxDate).endOf('isoWeek').format('YYYY-MM-DD')
                    });
                  }}
                >
                  Last 4 Weeks
                </Button>
              </>
            ) : (
              <>
                <Button
                  size="small"
                  onClick={() => {
                    setDateRange({
                      start: dayjs(maxDate).format('YYYY-MM-DD'),
                      end: dayjs(maxDate).format('YYYY-MM-DD')
                    });
                  }}
                >
                  Today
                </Button>
                <Button
                  size="small"
                  onClick={() => {
                    const yesterday = dayjs(maxDate).subtract(1, 'day');
                    setDateRange({
                      start: yesterday.format('YYYY-MM-DD'),
                      end: yesterday.format('YYYY-MM-DD')
                    });
                  }}
                >
                  Yesterday
                </Button>
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
                  Last 7 Days
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
                  Last 30 Days
                </Button>
              </>
            )}
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

        {/* MC Production Cost per Ton */}
        {kpis.avgCostPerTonMC !== undefined && (
          <Box sx={{ flex: '1 1 300px', minWidth: 250 }}>
            <Card>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <Box>
                    <Typography color="textSecondary" gutterBottom variant="body2">
                      Cost per Ton (MC Production)
                    </Typography>
                    <Typography variant="h4">
                      ₹{kpis.avgCostPerTonMC.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                    </Typography>
                    {kpis.costChangeMC !== undefined && (
                      <Box sx={{ display: 'flex', alignItems: 'center', mt: 1 }}>
                        {kpis.costChangeMC > 0 ? (
                          <TrendingUpIcon color="error" fontSize="small" />
                        ) : (
                          <TrendingDownIcon color="success" fontSize="small" />
                        )}
                        <Typography
                          variant="body2"
                          color={kpis.costChangeMC > 0 ? 'error' : 'success.main'}
                          sx={{ ml: 0.5 }}
                        >
                          {Math.abs(kpis.costChangeMC).toFixed(1)}%
                        </Typography>
                      </Box>
                    )}
                  </Box>
                  <FactoryIcon sx={{ fontSize: 40, color: 'primary.light' }} />
                </Box>
              </CardContent>
            </Card>
          </Box>
        )}

        {/* Finish Production Cost per Ton */}
        {kpis.avgCostPerTonFinish !== undefined && (
          <Box sx={{ flex: '1 1 300px', minWidth: 250 }}>
            <Card>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <Box>
                    <Typography color="textSecondary" gutterBottom variant="body2">
                      Cost per Ton (Finish Production)
                    </Typography>
                    <Typography variant="h4">
                      ₹{kpis.avgCostPerTonFinish.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                    </Typography>
                    {kpis.costChangeFinish !== undefined && (
                      <Box sx={{ display: 'flex', alignItems: 'center', mt: 1 }}>
                        {kpis.costChangeFinish > 0 ? (
                          <TrendingUpIcon color="error" fontSize="small" />
                        ) : (
                          <TrendingDownIcon color="success" fontSize="small" />
                        )}
                        <Typography
                          variant="body2"
                          color={kpis.costChangeFinish > 0 ? 'error' : 'success.main'}
                          sx={{ ml: 0.5 }}
                        >
                          {Math.abs(kpis.costChangeFinish).toFixed(1)}%
                        </Typography>
                      </Box>
                    )}
                  </Box>
                  <LocalShippingIcon sx={{ fontSize: 40, color: 'success.light' }} />
                </Box>
              </CardContent>
            </Card>
          </Box>
        )}

        {/* Combined Cost per Ton - only show if no Excel data */}
        {!importedData && (
          <Box sx={{ flex: '1 1 300px', minWidth: 250 }}>
            <Card>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <Box>
                    <Typography color="textSecondary" gutterBottom variant="body2">
                      Avg Cost per Ton
                    </Typography>
                    <Typography variant="h4">
                      ₹{kpis.avgCostPerTon.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
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
        )}

        {/* Combined Average - only show when both MC and Finish are available */}
        {kpis.avgCostPerTonMC !== undefined && kpis.avgCostPerTonFinish !== undefined && (
          <Box sx={{ flex: '1 1 300px', minWidth: 250 }}>
            <Card sx={{ background: 'linear-gradient(135deg, #f5f5f5 0%, #e8e8e8 100%)' }}>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <Box>
                    <Typography color="textSecondary" gutterBottom variant="body2">
                      Combined Average Cost/Ton
                    </Typography>
                    <Typography variant="h4">
                      ₹{((kpis.avgCostPerTonMC + kpis.avgCostPerTonFinish) / 2).toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                    </Typography>
                    <Typography variant="caption" color="textSecondary">
                      MC: ₹{(kpis.avgCostPerTonMC / 1000).toFixed(0)}k | Finish: ₹{(kpis.avgCostPerTonFinish / 1000).toFixed(0)}k
                    </Typography>
                  </Box>
                  <CurrencyRupeeIcon sx={{ fontSize: 40, color: 'info.light' }} />
                </Box>
              </CardContent>
            </Card>
          </Box>
        )}

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
              Cost Breakdown - Variable & Fixed Costs
            </Typography>
            <Box sx={{ height: 400 }}>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={costBreakdown}
                    cx="50%"
                    cy="50%"
                    outerRadius={120}
                    fill="#8884d8"
                    dataKey="percentage"
                    label={({ category, percentage, cx, cy, midAngle, innerRadius, outerRadius, index }) => {
                      // Only show labels for slices > 5%
                      if (percentage > 5 && midAngle !== undefined && cx !== undefined && cy !== undefined && innerRadius !== undefined && outerRadius !== undefined) {
                        const RADIAN = Math.PI / 180;
                        const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
                        const x = cx + radius * Math.cos(-midAngle * RADIAN);
                        const y = cy + radius * Math.sin(-midAngle * RADIAN);
                        
                        return (
                          <text 
                            x={x} 
                            y={y} 
                            fill="white" 
                            textAnchor={x > cx ? 'start' : 'end'} 
                            dominantBaseline="central"
                            fontSize="12"
                            fontWeight="bold"
                          >
                            {`${percentage.toFixed(1)}%`}
                          </text>
                        );
                      }
                      return null;
                    }}
                    labelLine={false}
                  >
                    {costBreakdown.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip 
                    content={({ active, payload }) => {
                      if (active && payload && payload.length) {
                        const data = payload[0].payload;
                        return (
                          <Box sx={{ bgcolor: 'background.paper', p: 1, border: 1, borderColor: 'divider', borderRadius: 1 }}>
                            <Typography variant="body2" fontWeight="bold">{data.category}</Typography>
                            <Typography variant="caption">Type: {data.costType}</Typography>
                            <Typography variant="body2">Amount: {formatIndianCurrency(data.amount)}</Typography>
                            <Typography variant="body2">Percentage: {data.percentage.toFixed(2)}%</Typography>
                            <Typography variant="caption" color={data.trend === 'up' ? 'error' : 'success.main'}>
                              Trend: {data.trend === 'up' ? '↑' : data.trend === 'down' ? '↓' : '→'} {Math.abs(data.variance).toFixed(1)}%
                            </Typography>
                          </Box>
                        );
                      }
                      return null;
                    }}
                  />
                  <Legend 
                    content={({ payload }) => {
                      if (payload && payload.length) {
                        return (
                          <Box sx={{ display: 'flex', justifyContent: 'center', flexWrap: 'wrap', gap: 2, mt: 2 }}>
                            {costBreakdown.map((entry, index) => (
                              <Box key={entry.category} sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                <Box
                                  sx={{
                                    width: 12,
                                    height: 12,
                                    backgroundColor: COLORS[index % COLORS.length],
                                    borderRadius: '2px'
                                  }}
                                />
                                <Typography variant="caption">{entry.category}</Typography>
                              </Box>
                            ))}
                          </Box>
                        );
                      }
                      return null;
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </Box>
            
            {/* Cost Type Summary */}
            <Box sx={{ mt: 2, display: 'flex', justifyContent: 'space-around' }}>
              <Box>
                <Typography variant="subtitle2" color="primary">Variable Costs</Typography>
                <Typography variant="h6">
                  {formatIndianCurrency(costBreakdown.filter(c => 'costType' in c && c.costType === 'Variable').reduce((sum, c) => sum + c.amount, 0))}
                </Typography>
                <Typography variant="caption" color="textSecondary">
                  {costBreakdown.filter(c => 'costType' in c && c.costType === 'Variable').reduce((sum, c) => sum + c.percentage, 0).toFixed(1)}%
                </Typography>
              </Box>
              <Box>
                <Typography variant="subtitle2" color="secondary">Fixed Costs</Typography>
                <Typography variant="h6">
                  {formatIndianCurrency(costBreakdown.filter(c => 'costType' in c && c.costType === 'Fixed').reduce((sum, c) => sum + c.amount, 0))}
                </Typography>
                <Typography variant="caption" color="textSecondary">
                  {costBreakdown.filter(c => 'costType' in c && c.costType === 'Fixed').reduce((sum, c) => sum + c.percentage, 0).toFixed(1)}%
                </Typography>
              </Box>
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

      {/* Production Losses Analysis */}
      {importedData && importedData.length > 0 && (
        <Box sx={{ mt: 3 }}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              Production Losses & Downtime Analysis
            </Typography>
            
            {/* Calculate loss metrics */}
            {(() => {
              const filteredLossData = importedData.filter(day => {
                if (!dateRange.start || !dateRange.end) return true;
                const itemDate = dayjs(day.date);
                const startDate = dayjs(dateRange.start);
                const endDate = dayjs(dateRange.end);
                return itemDate.isAfter(startDate.subtract(1, 'day')) && itemDate.isBefore(endDate.add(1, 'day'));
              });
              
              // Aggregate losses by department
              const lossByDepartment = new Map<string, { totalHours: number; count: number; remarks: string[] }>();
              let totalLossHours = 0;
              let totalDays = filteredLossData.length;
              let totalProductionHours = totalDays * 24;
              
              filteredLossData.forEach(day => {
                if (day.productionLosses) {
                  day.productionLosses.forEach(loss => {
                    const existing = lossByDepartment.get(loss.department) || { totalHours: 0, count: 0, remarks: [] };
                    existing.totalHours += loss.timeLoss;
                    existing.count += 1;
                    if (loss.remarks) existing.remarks.push(loss.remarks);
                    lossByDepartment.set(loss.department, existing);
                    totalLossHours += loss.timeLoss;
                  });
                }
              });
              
              const avgEfficiency = filteredLossData.reduce((sum, d) => sum + (d.productionEfficiency || 0), 0) / filteredLossData.length;
              
              // Convert to array and sort by total hours
              const lossArray = Array.from(lossByDepartment.entries())
                .map(([dept, data]) => ({
                  department: dept,
                  totalHours: data.totalHours,
                  avgHoursPerIncident: data.totalHours / data.count,
                  incidents: data.count,
                  percentage: (data.totalHours / totalProductionHours) * 100,
                  remarks: data.remarks
                }))
                .sort((a, b) => b.totalHours - a.totalHours);
              
              // Prepare data for charts
              const dailyLossData = filteredLossData.map(day => ({
                date: dayjs(day.date).format('MMM DD'),
                timeLoss: day.totalTimeLoss || 0,
                efficiency: day.productionEfficiency || 0,
                production: day.totalProduction
              }));
              
              return (
                <>
                  {/* KPI Cards for Losses */}
                  <Box sx={{ display: 'flex', gap: 2, mb: 3, flexWrap: 'wrap' }}>
                    <Card sx={{ flex: '1 1 200px', minWidth: 180 }}>
                      <CardContent>
                        <Typography color="textSecondary" variant="body2">
                          Total Downtime
                        </Typography>
                        <Typography variant="h5" color="error">
                          {totalLossHours.toFixed(1)} hrs
                        </Typography>
                        <Typography variant="caption" color="textSecondary">
                          Last {totalDays} days
                        </Typography>
                      </CardContent>
                    </Card>
                    
                    <Card sx={{ flex: '1 1 200px', minWidth: 180 }}>
                      <CardContent>
                        <Typography color="textSecondary" variant="body2">
                          Avg Efficiency
                        </Typography>
                        <Typography variant="h5" color={avgEfficiency > 90 ? 'success.main' : 'warning.main'}>
                          {avgEfficiency.toFixed(1)}%
                        </Typography>
                        <LinearProgress
                          variant="determinate"
                          value={avgEfficiency}
                          sx={{ mt: 1, height: 6, borderRadius: 3 }}
                          color={avgEfficiency > 90 ? 'success' : 'warning'}
                        />
                      </CardContent>
                    </Card>
                    
                    <Card sx={{ flex: '1 1 200px', minWidth: 180 }}>
                      <CardContent>
                        <Typography color="textSecondary" variant="body2">
                          Downtime %
                        </Typography>
                        <Typography variant="h5" color="warning.main">
                          {((totalLossHours / totalProductionHours) * 100).toFixed(2)}%
                        </Typography>
                        <Typography variant="caption" color="textSecondary">
                          Of total time
                        </Typography>
                      </CardContent>
                    </Card>
                    
                    <Card sx={{ flex: '1 1 200px', minWidth: 180 }}>
                      <CardContent>
                        <Typography color="textSecondary" variant="body2">
                          Top Loss Reason
                        </Typography>
                        <Typography variant="h6">
                          {lossArray[0]?.department || 'N/A'}
                        </Typography>
                        <Typography variant="caption" color="error">
                          {lossArray[0]?.totalHours.toFixed(1)} hrs ({lossArray[0]?.percentage.toFixed(1)}%)
                        </Typography>
                      </CardContent>
                    </Card>
                  </Box>
                  
                  {/* Charts Row */}
                  <Box sx={{ display: 'flex', gap: 3, flexWrap: 'wrap', mb: 3 }}>
                    {/* Daily Efficiency Trend */}
                    <Box sx={{ flex: '1 1 400px', minWidth: 300 }}>
                      <Typography variant="subtitle2" gutterBottom>
                        Daily Efficiency & Downtime Trend
                      </Typography>
                      <Box sx={{ height: 300 }}>
                        <ResponsiveContainer width="100%" height="100%">
                          <LineChart data={dailyLossData}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="date" />
                            <YAxis yAxisId="left" label={{ value: 'Efficiency %', angle: -90, position: 'insideLeft' }} />
                            <YAxis yAxisId="right" orientation="right" label={{ value: 'Time Loss (hrs)', angle: 90, position: 'insideRight' }} />
                            <Tooltip />
                            <Legend />
                            <Line yAxisId="left" type="monotone" dataKey="efficiency" stroke="#4caf50" name="Efficiency %" strokeWidth={2} />
                            <Line yAxisId="right" type="monotone" dataKey="timeLoss" stroke="#ff5722" name="Time Loss (hrs)" strokeWidth={2} strokeDasharray="5 5" />
                          </LineChart>
                        </ResponsiveContainer>
                      </Box>
                    </Box>
                    
                    {/* Loss by Department Pie Chart */}
                    <Box sx={{ flex: '1 1 300px', minWidth: 250 }}>
                      <Typography variant="subtitle2" gutterBottom>
                        Downtime by Department
                      </Typography>
                      <Box sx={{ height: 300 }}>
                        <ResponsiveContainer width="100%" height="100%">
                          <PieChart>
                            <Pie
                              data={lossArray}
                              cx="50%"
                              cy="50%"
                              labelLine={false}
                              label={({ department, percentage }) => `${department}: ${percentage.toFixed(1)}%`}
                              outerRadius={100}
                              fill="#8884d8"
                              dataKey="totalHours"
                            >
                              {lossArray.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                              ))}
                            </Pie>
                            <Tooltip formatter={(value: any) => `${value.toFixed(1)} hrs`} />
                          </PieChart>
                        </ResponsiveContainer>
                      </Box>
                    </Box>
                  </Box>
                  
                  {/* Loss Details Table */}
                  <Typography variant="subtitle2" gutterBottom>
                    Production Loss Details
                  </Typography>
                  <TableContainer>
                    <Table size="small">
                      <TableHead>
                        <TableRow>
                          <TableCell>Department/Reason</TableCell>
                          <TableCell align="right">Total Hours</TableCell>
                          <TableCell align="right">Incidents</TableCell>
                          <TableCell align="right">Avg Hours/Incident</TableCell>
                          <TableCell align="right">% of Total Time</TableCell>
                          <TableCell>Common Issues</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {lossArray.map((loss) => (
                          <TableRow key={loss.department}>
                            <TableCell>
                              <Chip
                                label={loss.department}
                                size="small"
                                color={loss.department === 'Process' ? 'primary' : 
                                       loss.department === 'Power' ? 'error' : 
                                       loss.department === 'Grade change' ? 'warning' : 'default'}
                              />
                            </TableCell>
                            <TableCell align="right">{loss.totalHours.toFixed(2)}</TableCell>
                            <TableCell align="right">{loss.incidents}</TableCell>
                            <TableCell align="right">{loss.avgHoursPerIncident.toFixed(2)}</TableCell>
                            <TableCell align="right">
                              <Typography color={loss.percentage > 1 ? 'error' : 'inherit'}>
                                {loss.percentage.toFixed(2)}%
                              </Typography>
                            </TableCell>
                            <TableCell>
                              <Typography variant="caption" sx={{ 
                                display: '-webkit-box',
                                WebkitLineClamp: 2,
                                WebkitBoxOrient: 'vertical',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                maxWidth: 300
                              }}>
                                {loss.remarks.slice(0, 3).join(', ')}
                              </Typography>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>
                  
                  {/* Production vs Loss Correlation */}
                  <Box sx={{ mt: 3 }}>
                    <Typography variant="subtitle2" gutterBottom>
                      Production Output vs Downtime Correlation
                    </Typography>
                    <Box sx={{ height: 300 }}>
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={dailyLossData}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="date" />
                          <YAxis yAxisId="left" label={{ value: 'Production (MT)', angle: -90, position: 'insideLeft' }} />
                          <YAxis yAxisId="right" orientation="right" label={{ value: 'Time Loss (hrs)', angle: 90, position: 'insideRight' }} />
                          <Tooltip />
                          <Legend />
                          <Bar yAxisId="left" dataKey="production" fill="#2196f3" name="Production" />
                          <Bar yAxisId="right" dataKey="timeLoss" fill="#ff5722" name="Time Loss" />
                        </BarChart>
                      </ResponsiveContainer>
                    </Box>
                  </Box>
                </>
              );
            })()}
          </Paper>
        </Box>
      )}

      {/* Key Insights Section */}
      {importedData && importedData.length > 0 && (
        <Paper sx={{ p: 3, mb: 3 }}>
          <Typography variant="h6" gutterBottom>
            Key Cost Insights
          </Typography>
          <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 2 }}>
            {/* Cost Efficiency */}
            <Card variant="outlined">
              <CardContent>
                <Typography color="textSecondary" variant="body2">
                  Cost Efficiency Trend
                </Typography>
                <Typography variant="h5">
                  {kpis.costChange > 0 ? '📈' : '📉'} {Math.abs(kpis.costChange).toFixed(1)}%
                </Typography>
                <Typography variant="caption">
                  {kpis.costChange > 0 ? 'Cost increased' : 'Cost reduced'} vs previous period
                </Typography>
              </CardContent>
            </Card>
            
            {/* MC vs Finish Production Spread */}
            {kpis.avgCostPerTonMC !== undefined && kpis.avgCostPerTonFinish !== undefined && (
              <Card variant="outlined">
                <CardContent>
                  <Typography color="textSecondary" variant="body2">
                    Production Cost Spread
                  </Typography>
                  <Typography variant="h5">
                    ₹{Math.abs(kpis.avgCostPerTonFinish - kpis.avgCostPerTonMC).toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                  </Typography>
                  <Typography variant="caption">
                    Difference between MC & Finish/ton
                  </Typography>
                </CardContent>
              </Card>
            )}
            
            {/* Conversion Cost */}
            {kpis.avgCostPerTonMC !== undefined && kpis.avgCostPerTonFinish !== undefined && (
              <Card variant="outlined">
                <CardContent>
                  <Typography color="textSecondary" variant="body2">
                    Conversion Cost
                  </Typography>
                  <Typography variant="h5">
                    {((kpis.avgCostPerTonFinish - kpis.avgCostPerTonMC) / kpis.avgCostPerTonMC * 100).toFixed(1)}%
                  </Typography>
                  <Typography variant="caption">
                    MC to Finish conversion markup
                  </Typography>
                </CardContent>
              </Card>
            )}
            
            {/* Industry Benchmark */}
            <Card variant="outlined">
              <CardContent>
                <Typography color="textSecondary" variant="body2">
                  Industry Benchmark
                </Typography>
                <Typography variant="h5">
                  {kpis.avgCostPerTonFinish !== undefined 
                    ? (kpis.avgCostPerTonFinish > 100000 ? '⚠️ Above' : '✅ Below')
                    : (kpis.avgCostPerTon > 85000 ? '⚠️ Above' : '✅ Below')}
                </Typography>
                <Typography variant="caption">
                  {kpis.avgCostPerTonFinish !== undefined 
                    ? `Industry avg: ₹100k/ton (Finish: ₹${(kpis.avgCostPerTonFinish / 1000).toFixed(0)}k)`
                    : `Industry avg: ₹85k/ton (Current: ₹${(kpis.avgCostPerTon / 1000).toFixed(0)}k)`}
                </Typography>
              </CardContent>
            </Card>
            
            {/* Top Cost Driver */}
            <Card variant="outlined">
              <CardContent>
                <Typography color="textSecondary" variant="body2">
                  Top Cost Driver
                </Typography>
                <Typography variant="h5">
                  Fiber (35%)
                </Typography>
                <Typography variant="caption">
                  Focus area for cost optimization
                </Typography>
              </CardContent>
            </Card>
            
            {/* Production Efficiency Impact */}
            <Card variant="outlined">
              <CardContent>
                <Typography color="textSecondary" variant="body2">
                  Efficiency Impact on Cost
                </Typography>
                <Typography variant="h5">
                  ₹{((100 - kpis.efficiency) * kpis.avgCostPerTon / 100).toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                </Typography>
                <Typography variant="caption">
                  Potential savings/ton at 100% efficiency
                </Typography>
              </CardContent>
            </Card>
            
            {/* Chemical Cost Efficiency */}
            <Card variant="outlined">
              <CardContent>
                <Typography color="textSecondary" variant="body2">
                  Chemical Cost Efficiency
                </Typography>
                <Typography variant="h5">
                  ₹{(aggregatedData.slice(-7).reduce((sum, item) => sum + item.chemicals, 0) / 
                     aggregatedData.slice(-7).reduce((sum, item) => sum + item.production, 0) * 1000).toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                </Typography>
                <Typography variant="caption">
                  Per ton of production
                </Typography>
              </CardContent>
            </Card>
            
            {/* Waste Cost Impact */}
            <Card variant="outlined">
              <CardContent>
                <Typography color="textSecondary" variant="body2">
                  Waste Cost Impact
                </Typography>
                <Typography variant="h5">
                  {kpis.wastePercentage > 2 ? '❌' : '✅'} {kpis.wastePercentage.toFixed(1)}%
                </Typography>
                <Typography variant="caption">
                  Target: &lt;2% ({kpis.wastePercentage > 2 ? 'Above' : 'Within'} target)
                </Typography>
              </CardContent>
            </Card>
            
            {/* MC Production Efficiency */}
            {kpis.avgCostPerTonMC !== undefined && (
              <Card variant="outlined">
                <CardContent>
                  <Typography color="textSecondary" variant="body2">
                    MC Production Status
                  </Typography>
                  <Typography variant="h5">
                    {kpis.avgCostPerTonMC < 95000 ? '🟢 Optimal' : kpis.avgCostPerTonMC < 100000 ? '🟡 Fair' : '🔴 High'}
                  </Typography>
                  <Typography variant="caption">
                    Target: &lt;₹95k/ton
                  </Typography>
                </CardContent>
              </Card>
            )}
            
            {/* Finish Production Efficiency */}
            {kpis.avgCostPerTonFinish !== undefined && (
              <Card variant="outlined">
                <CardContent>
                  <Typography color="textSecondary" variant="body2">
                    Finish Production Status
                  </Typography>
                  <Typography variant="h5">
                    {kpis.avgCostPerTonFinish < 105000 ? '🟢 Optimal' : kpis.avgCostPerTonFinish < 115000 ? '🟡 Fair' : '🔴 High'}
                  </Typography>
                  <Typography variant="caption">
                    Target: &lt;₹105k/ton
                  </Typography>
                </CardContent>
              </Card>
            )}
          </Box>
        </Paper>
      )}

      {/* Pulp Consumption Insights */}
      {materialMetrics && (
        <Box sx={{ mt: 3 }}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              Pulp Consumption Insights
            </Typography>
            
            {/* Calculate pulp-specific metrics */}
            {(() => {
              // Separate softwood and hardwood pulps
              const softwoodMaterials = materialMetrics.materialCategories.softwoodPulp;
              const hardwoodMaterials = materialMetrics.materialCategories.hardwoodPulp;
              
              const totalSoftwoodQty = softwoodMaterials.reduce((sum, m) => sum + m.quantity, 0);
              const totalHardwoodQty = hardwoodMaterials.reduce((sum, m) => sum + m.quantity, 0);
              const totalPulpQty = totalSoftwoodQty + totalHardwoodQty;
              
              const softwoodPercentage = totalPulpQty > 0 ? (totalSoftwoodQty / totalPulpQty) * 100 : 0;
              const hardwoodPercentage = totalPulpQty > 0 ? (totalHardwoodQty / totalPulpQty) * 100 : 0;
              
              // Daily pulp consumption trend
              const dailyPulpData = filteredData.map(day => {
                const dayMaterials = importedData?.find(d => d.date === day.date)?.rawMaterials || [];
                const softwood = dayMaterials
                  .filter(m => m.material.toLowerCase().includes('softwood') || 
                              ['sodra', 'stora', 'metsa', 'mercer', 'laja', 'pacifico', 'komi'].some(brand => 
                                m.material.toLowerCase().includes(brand)))
                  .reduce((sum, m) => sum + m.quantity, 0);
                const hardwood = dayMaterials
                  .filter(m => m.material.toLowerCase().includes('hardwood') || 
                              ['acacia', 'cmpc', 'baycel', 'suzano', 'april'].some(brand => 
                                m.material.toLowerCase().includes(brand)))
                  .reduce((sum, m) => sum + m.quantity, 0);
                
                return {
                  date: dayjs(day.date).format('MMM DD'),
                  softwood,
                  hardwood,
                  total: softwood + hardwood,
                  production: day.production / 1000 // Convert to MT
                };
              }).filter(d => d.total > 0);
              
              // Calculate efficiency metrics
              const avgPulpPerMT = totalPulpQty / materialMetrics.totalProduction;
              const pulpYield = materialMetrics.totalProduction / totalPulpQty;
              
              return (
                <>
                  {/* Pulp KPI Cards */}
                  <Box sx={{ display: 'flex', gap: 2, mb: 3, flexWrap: 'wrap' }}>
                    <Card sx={{ flex: '1 1 200px', minWidth: 180 }}>
                      <CardContent>
                        <Typography color="textSecondary" variant="body2">
                          Total Pulp Consumed
                        </Typography>
                        <Typography variant="h5">
                          {totalPulpQty.toFixed(2)} MT
                        </Typography>
                        <Typography variant="caption" color="textSecondary">
                          {avgPulpPerMT.toFixed(3)} MT/MT production
                        </Typography>
                      </CardContent>
                    </Card>
                    
                    <Card sx={{ flex: '1 1 200px', minWidth: 180 }}>
                      <CardContent>
                        <Typography color="textSecondary" variant="body2">
                          Pulp Mix Ratio
                        </Typography>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 1 }}>
                          <Chip 
                            label={`SW: ${softwoodPercentage.toFixed(1)}%`} 
                            size="small" 
                            sx={{ bgcolor: '#2196f3', color: 'white' }}
                          />
                          <Chip 
                            label={`HW: ${hardwoodPercentage.toFixed(1)}%`} 
                            size="small" 
                            sx={{ bgcolor: '#4caf50', color: 'white' }}
                          />
                        </Box>
                        <LinearProgress
                          variant="determinate"
                          value={softwoodPercentage}
                          sx={{ mt: 1, height: 8, borderRadius: 4, bgcolor: '#4caf50' }}
                        />
                      </CardContent>
                    </Card>
                    
                    <Card sx={{ flex: '1 1 200px', minWidth: 180 }}>
                      <CardContent>
                        <Typography color="textSecondary" variant="body2">
                          Pulp Yield
                        </Typography>
                        <Typography variant="h5">
                          {pulpYield.toFixed(2)}
                        </Typography>
                        <Typography variant="caption" color="textSecondary">
                          MT tissue/MT pulp
                        </Typography>
                      </CardContent>
                    </Card>
                    
                    <Card sx={{ flex: '1 1 200px', minWidth: 180 }}>
                      <CardContent>
                        <Typography color="textSecondary" variant="body2">
                          Top Pulp Brand
                        </Typography>
                        <Typography variant="h6" sx={{ fontSize: '1rem' }}>
                          {materialMetrics.topMaterials[0]?.material.split(' ').slice(2).join(' ') || 'N/A'}
                        </Typography>
                        <Typography variant="caption" color="textSecondary">
                          {materialMetrics.topMaterials[0]?.quantity.toFixed(1)} MT ({materialMetrics.topMaterials[0]?.percentage.toFixed(1)}%)
                        </Typography>
                      </CardContent>
                    </Card>
                  </Box>
                  
                  {/* Pulp Consumption Trend Chart */}
                  <Box sx={{ mb: 3 }}>
                    <Typography variant="subtitle2" gutterBottom>
                      Daily Pulp Consumption vs Production
                    </Typography>
                    <Box sx={{ height: 300 }}>
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={dailyPulpData}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="date" />
                          <YAxis yAxisId="left" label={{ value: 'Pulp Consumption (MT)', angle: -90, position: 'insideLeft' }} />
                          <YAxis yAxisId="right" orientation="right" label={{ value: 'Production (MT)', angle: 90, position: 'insideRight' }} />
                          <Tooltip />
                          <Legend />
                          <Line yAxisId="left" type="monotone" dataKey="softwood" stroke="#2196f3" name="Softwood" strokeWidth={2} />
                          <Line yAxisId="left" type="monotone" dataKey="hardwood" stroke="#4caf50" name="Hardwood" strokeWidth={2} />
                          <Line yAxisId="left" type="monotone" dataKey="total" stroke="#ff9800" name="Total Pulp" strokeWidth={2} strokeDasharray="5 5" />
                          <Line yAxisId="right" type="monotone" dataKey="production" stroke="#9c27b0" name="Production" strokeWidth={2} />
                        </LineChart>
                      </ResponsiveContainer>
                    </Box>
                  </Box>
                  
                  {/* Pulp Mix Composition */}
                  <Box sx={{ display: 'flex', gap: 3, flexWrap: 'wrap', mb: 3 }}>
                    {/* Softwood vs Hardwood Pie */}
                    <Box sx={{ flex: '1 1 300px' }}>
                      <Typography variant="subtitle2" gutterBottom>
                        Pulp Type Distribution
                      </Typography>
                      <Box sx={{ height: 250 }}>
                        <ResponsiveContainer width="100%" height="100%">
                          <PieChart>
                            <Pie
                              data={[
                                { name: 'Softwood', value: totalSoftwoodQty, percentage: softwoodPercentage },
                                { name: 'Hardwood', value: totalHardwoodQty, percentage: hardwoodPercentage }
                              ]}
                              cx="50%"
                              cy="50%"
                              labelLine={false}
                              label={({ name, percentage }) => `${name}: ${percentage.toFixed(1)}%`}
                              outerRadius={80}
                              fill="#8884d8"
                              dataKey="value"
                            >
                              <Cell fill="#2196f3" />
                              <Cell fill="#4caf50" />
                            </Pie>
                            <Tooltip formatter={(value: any) => `${value.toFixed(2)} MT`} />
                          </PieChart>
                        </ResponsiveContainer>
                      </Box>
                    </Box>
                    
                    {/* Top Pulp Brands Bar Chart */}
                    <Box sx={{ flex: '1 1 400px' }}>
                      <Typography variant="subtitle2" gutterBottom>
                        Top Pulp Brands by Consumption
                      </Typography>
                      <Box sx={{ height: 250 }}>
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart 
                            data={[...softwoodMaterials, ...hardwoodMaterials]
                              .sort((a, b) => b.quantity - a.quantity)
                              .slice(0, 8)
                              .map(m => ({
                                brand: m.material.replace(/Imported (Softwood|Hardwood) Pulp /g, '').replace(/ \(AD\)/g, ''),
                                quantity: m.quantity,
                                type: softwoodMaterials.includes(m) ? 'Softwood' : 'Hardwood'
                              }))}
                          >
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="brand" angle={-45} textAnchor="end" height={100} />
                            <YAxis tickFormatter={(value) => `${value} MT`} />
                            <Tooltip formatter={(value: any) => `${value.toFixed(2)} MT`} />
                            <Bar dataKey="quantity">
                              {[...softwoodMaterials, ...hardwoodMaterials]
                                .sort((a, b) => b.quantity - a.quantity)
                                .slice(0, 8)
                                .map((entry, index) => (
                                  <Cell key={`cell-${index}`} fill={softwoodMaterials.includes(entry) ? '#2196f3' : '#4caf50'} />
                                ))}
                            </Bar>
                          </BarChart>
                        </ResponsiveContainer>
                      </Box>
                    </Box>
                  </Box>
                  
                  {/* Pulp Efficiency Table */}
                  <Typography variant="subtitle2" gutterBottom>
                    Pulp Consumption Efficiency by Type
                  </Typography>
                  <TableContainer>
                    <Table size="small">
                      <TableHead>
                        <TableRow>
                          <TableCell>Pulp Type</TableCell>
                          <TableCell align="right">Total Quantity (MT)</TableCell>
                          <TableCell align="right">% of Total</TableCell>
                          <TableCell align="right">Cost (₹)</TableCell>
                          <TableCell align="right">Avg Rate/MT</TableCell>
                          <TableCell align="right">Top Brand</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        <TableRow>
                          <TableCell>
                            <Chip label="Softwood" size="small" sx={{ bgcolor: '#2196f3', color: 'white' }} />
                          </TableCell>
                          <TableCell align="right">{totalSoftwoodQty.toFixed(2)}</TableCell>
                          <TableCell align="right">{softwoodPercentage.toFixed(1)}%</TableCell>
                          <TableCell align="right">{formatIndianCurrency(materialMetrics.categoryCosts.softwoodPulp)}</TableCell>
                          <TableCell align="right">
                            {totalSoftwoodQty > 0 ? formatIndianCurrency(materialMetrics.categoryCosts.softwoodPulp / totalSoftwoodQty) : 'N/A'}
                          </TableCell>
                          <TableCell align="right">
                            {softwoodMaterials.length > 0 ? softwoodMaterials[0].material.split(' ').slice(3).join(' ').replace('(AD)', '') : 'N/A'}
                          </TableCell>
                        </TableRow>
                        <TableRow>
                          <TableCell>
                            <Chip label="Hardwood" size="small" sx={{ bgcolor: '#4caf50', color: 'white' }} />
                          </TableCell>
                          <TableCell align="right">{totalHardwoodQty.toFixed(2)}</TableCell>
                          <TableCell align="right">{hardwoodPercentage.toFixed(1)}%</TableCell>
                          <TableCell align="right">{formatIndianCurrency(materialMetrics.categoryCosts.hardwoodPulp)}</TableCell>
                          <TableCell align="right">
                            {totalHardwoodQty > 0 ? formatIndianCurrency(materialMetrics.categoryCosts.hardwoodPulp / totalHardwoodQty) : 'N/A'}
                          </TableCell>
                          <TableCell align="right">
                            {hardwoodMaterials.length > 0 ? hardwoodMaterials[0].material.split(' ').slice(3).join(' ').replace('(AD)', '') : 'N/A'}
                          </TableCell>
                        </TableRow>
                        <TableRow sx={{ bgcolor: 'action.hover' }}>
                          <TableCell><strong>Total</strong></TableCell>
                          <TableCell align="right"><strong>{totalPulpQty.toFixed(2)}</strong></TableCell>
                          <TableCell align="right"><strong>100%</strong></TableCell>
                          <TableCell align="right">
                            <strong>{formatIndianCurrency(materialMetrics.categoryCosts.softwoodPulp + materialMetrics.categoryCosts.hardwoodPulp)}</strong>
                          </TableCell>
                          <TableCell align="right">
                            <strong>{formatIndianCurrency((materialMetrics.categoryCosts.softwoodPulp + materialMetrics.categoryCosts.hardwoodPulp) / totalPulpQty)}</strong>
                          </TableCell>
                          <TableCell />
                        </TableRow>
                      </TableBody>
                    </Table>
                  </TableContainer>
                </>
              );
            })()}
          </Paper>
        </Box>
      )}

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
                        label={({ name, percentage }) => `${name}: ${percentage.toFixed(1)}%`}
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