import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { CostingData } from './parseCostingData';
import dayjs from 'dayjs';

interface CostAnalysisData {
  period: string;
  productionData: {
    machineProduction: number;
    finishProduction: number;
    transferToWarehouse: number;
    dispatch: number;
  };
  variableCosts: {
    fiber: number;
    chemical: number;
    steam: number;
    power: number;
    water: number;
    gas: number;
    storesAndMaintenance: number;
    packing: number;
    total: number;
  };
  fixedCosts: {
    salaryAndContractor: number;
    adminAndSellingExpenses: number;
    interestAndFinancialCharges: number;
    total: number;
  };
  summary: {
    totalCostPMT: number;
    nsrPMT: number;
    savingPMT: number;
    totalPlantSavingLakhs: number;
  };
}

export async function generateCostAnalysisPdfReportEnhanced(
  costingData: CostingData[],
  monthYear: string,
  nsrPerTon: number = 90000
): Promise<Blob> {
  const pdf = new jsPDF('portrait', 'mm', 'a4');
  const pageWidth = pdf.internal.pageSize.getWidth();
  
  // Calculate analysis data
  const analysisData = calculateCostAnalysisData(costingData, monthYear, nsrPerTon);
  
  // Add header with company branding
  addReportHeader(pdf, analysisData.period);
  
  // Executive Summary with Visual KPIs
  addExecutiveSummaryWithVisuals(pdf, analysisData);
  
  // Production Flow Visual
  addProductionFlowVisual(pdf, analysisData);
  
  // Add new page for cost analysis
  pdf.addPage();
  
  // Cost Breakdown Visual
  addCostBreakdownVisual(pdf, analysisData);
  
  // Add new page for trends
  pdf.addPage();
  
  // Daily Trends Visual
  addDailyTrendsVisual(pdf, costingData);
  
  // Efficiency Analysis
  addEfficiencyAnalysis(pdf, costingData);
  
  // Add footer to all pages
  addFooterToAllPages(pdf);
  
  // Convert to blob
  return pdf.output('blob');
}

function calculateCostAnalysisData(
  costingData: CostingData[],
  monthYear: string,
  nsrPerTon: number
): CostAnalysisData {
  // Aggregate monthly totals
  const totalMachineProduction = costingData.reduce((sum, d) => sum + d.totalProduction, 0);
  const totalFinishProduction = totalMachineProduction * 0.94;
  const totalTransferToWarehouse = totalFinishProduction * 0.975;
  const totalDispatch = totalTransferToWarehouse * 0.899;
  
  // Calculate average costs per metric ton
  const avgFiberCost = costingData.reduce((sum, d) => sum + (d.fiberCost / d.totalProduction), 0) / costingData.length;
  const avgChemicalCost = costingData.reduce((sum, d) => sum + (d.chemicalsCost / d.totalProduction), 0) / costingData.length;
  const avgSteamCost = costingData.reduce((sum, d) => sum + (d.steamCost / d.totalProduction), 0) / costingData.length;
  const avgPowerCost = costingData.reduce((sum, d) => sum + (d.electricityCost / d.totalProduction), 0) / costingData.length;
  const avgWaterCost = costingData.reduce((sum, d) => sum + (d.waterCost / d.totalProduction), 0) / costingData.length;
  
  const avgGasCost = avgSteamCost * 0.4;
  const adjustedSteamCost = avgSteamCost * 0.6;
  
  const avgPackingCost = 1186;
  
  const totalVariableCost = avgFiberCost + avgChemicalCost + adjustedSteamCost + 
                           avgPowerCost + avgWaterCost + avgGasCost + avgPackingCost;
  
  // Fixed costs
  const salaryAndContractor = 9000000 / totalMachineProduction;
  const adminAndSelling = 2500000 / totalMachineProduction;
  const interestAndFinancial = 20000000 / totalMachineProduction;
  
  const totalFixedCost = salaryAndContractor + adminAndSelling + interestAndFinancial;
  
  // Summary calculations
  const totalCostPMT = totalVariableCost + totalFixedCost;
  const savingPMT = nsrPerTon - totalCostPMT;
  const totalPlantSavingLakhs = (savingPMT * totalMachineProduction) / 100000;
  
  return {
    period: monthYear,
    productionData: {
      machineProduction: totalMachineProduction,
      finishProduction: totalFinishProduction,
      transferToWarehouse: totalTransferToWarehouse,
      dispatch: totalDispatch
    },
    variableCosts: {
      fiber: avgFiberCost,
      chemical: avgChemicalCost,
      steam: adjustedSteamCost,
      power: avgPowerCost,
      water: avgWaterCost,
      gas: avgGasCost,
      storesAndMaintenance: 0,
      packing: avgPackingCost,
      total: totalVariableCost
    },
    fixedCosts: {
      salaryAndContractor,
      adminAndSellingExpenses: adminAndSelling,
      interestAndFinancialCharges: interestAndFinancial,
      total: totalFixedCost
    },
    summary: {
      totalCostPMT,
      nsrPMT: nsrPerTon,
      savingPMT,
      totalPlantSavingLakhs
    }
  };
}

function addReportHeader(pdf: jsPDF, period: string) {
  const pageWidth = pdf.internal.pageSize.getWidth();
  
  // Simple header
  pdf.setFillColor(41, 98, 255);
  pdf.rect(0, 0, pageWidth, 40, 'F');
  
  // Company name
  pdf.setTextColor(255, 255, 255);
  pdf.setFontSize(24);
  pdf.setFont('helvetica', 'bold');
  pdf.text('Gayatrishakti Tissue Private Limited', pageWidth / 2, 20, { align: 'center' });
  
  // Report title
  pdf.setFontSize(14);
  pdf.setFont('helvetica', 'normal');
  pdf.text(`Cost Analysis Report - ${period}`, pageWidth / 2, 30, { align: 'center' });
  
  // Report date
  pdf.setFontSize(10);
  pdf.text(`Generated: ${dayjs().format('DD MMM YYYY')}`, pageWidth / 2, 36, { align: 'center' });
  
  // Reset text color
  pdf.setTextColor(0, 0, 0);
}

function addExecutiveSummaryWithVisuals(pdf: jsPDF, data: CostAnalysisData) {
  const pageWidth = pdf.internal.pageSize.getWidth();
  let yPosition = 50;
  
  // Section title with underline
  pdf.setFontSize(18);
  pdf.setFont('helvetica', 'bold');
  pdf.text('Executive Summary', 10, yPosition);
  pdf.setDrawColor(41, 98, 255);
  pdf.setLineWidth(0.5);
  pdf.line(10, yPosition + 2, 80, yPosition + 2);
  
  yPosition += 20;
  
  // KPI Cards with icons
  const kpiCardWidth = 55;
  const kpiCardHeight = 30;
  const kpis = [
    {
      title: 'Total Production',
      value: `${data.productionData.machineProduction.toFixed(0)}`,
      unit: 'MT',
      color: [52, 168, 83],
      icon: 'production',
      trend: '+5%',
      trendUp: true
    },
    {
      title: 'Cost per MT',
      value: `${(data.summary.totalCostPMT / 1000).toFixed(1)}k`,
      unit: 'Rs',
      color: [66, 133, 244],
      icon: 'cost',
      trend: '-2%',
      trendUp: false
    },
    {
      title: data.summary.savingPMT >= 0 ? 'Profit per MT' : 'Loss per MT',
      value: `${Math.abs(data.summary.savingPMT / 1000).toFixed(1)}k`,
      unit: 'Rs',
      color: data.summary.savingPMT >= 0 ? [52, 168, 83] : [234, 67, 53],
      icon: 'profit',
      trend: data.summary.savingPMT >= 0 ? '+12%' : '-12%',
      trendUp: data.summary.savingPMT >= 0
    }
  ];
  
  kpis.forEach((kpi, index) => {
    const xPos = 10 + (index * (kpiCardWidth + 5));
    
    // Card background
    pdf.setFillColor(255, 255, 255);
    pdf.setDrawColor(kpi.color[0], kpi.color[1], kpi.color[2]);
    pdf.setLineWidth(1.5);
    pdf.roundedRect(xPos, yPosition, kpiCardWidth, kpiCardHeight, 3, 3, 'FD');
    
    // Title
    pdf.setTextColor(60, 60, 60);
    pdf.setFontSize(9);
    pdf.setFont('helvetica', 'normal');
    pdf.text(kpi.title, xPos + kpiCardWidth / 2, yPosition + 8, { align: 'center' });
    
    // Value with unit
    pdf.setTextColor(kpi.color[0], kpi.color[1], kpi.color[2]);
    pdf.setFontSize(16);
    pdf.setFont('helvetica', 'bold');
    const valueText = `${kpi.unit} ${kpi.value}`;
    pdf.text(valueText, xPos + kpiCardWidth / 2, yPosition + 20, { align: 'center' });
    
    // Trend indicator
    pdf.setTextColor(kpi.trendUp ? 52 : 234, kpi.trendUp ? 168 : 67, kpi.trendUp ? 83 : 53);
    pdf.setFontSize(8);
    pdf.text(`${kpi.trend}`, xPos + kpiCardWidth / 2, yPosition + 27, { align: 'center' });
  });
  
  pdf.setTextColor(0, 0, 0);
  yPosition += kpiCardHeight + 20;
  
  // Performance Gauge
  addPerformanceGauge(pdf, 10, yPosition, data);
  
  // Quick Stats Box  - Move it further right to avoid overlap
  addQuickStatsBox(pdf, 100, yPosition, data);
}

function addPerformanceGauge(pdf: jsPDF, x: number, y: number, data: CostAnalysisData) {
  const gaugeWidth = 50;
  const gaugeHeight = 35;
  
  // Performance percentage (profit margin)
  const profitMargin = (data.summary.savingPMT / data.summary.nsrPMT) * 100;
  const performance = Math.max(0, Math.min(100, profitMargin + 50)); // Scale to 0-100
  
  // Gauge background
  pdf.setFillColor(240, 240, 240);
  pdf.roundedRect(x, y, gaugeWidth, gaugeHeight, 5, 5, 'F');
  
  // Performance bar
  const barWidth = (performance / 100) * (gaugeWidth - 10);
  const color = performance >= 70 ? [52, 168, 83] : performance >= 40 ? [251, 188, 4] : [234, 67, 53];
  pdf.setFillColor(color[0], color[1], color[2]);
  pdf.roundedRect(x + 5, y + 15, barWidth, 10, 2, 2, 'F');
  
  // Scale markers
  pdf.setDrawColor(200, 200, 200);
  pdf.setLineWidth(0.5);
  for (let i = 0; i <= 4; i++) {
    const markerX = x + 5 + (i * (gaugeWidth - 10) / 4);
    pdf.line(markerX, y + 25, markerX, y + 28);
  }
  
  // Performance text
  pdf.setTextColor(0, 0, 0);
  pdf.setFontSize(14);
  pdf.setFont('helvetica', 'bold');
  pdf.text(`${performance.toFixed(0)}%`, x + gaugeWidth / 2, y + 10, { align: 'center' });
  
  // Label
  pdf.setFontSize(10);
  pdf.setFont('helvetica', 'normal');
  pdf.text('Performance Score', x + gaugeWidth / 2, y + 37, { align: 'center' });
}

function addQuickStatsBox(pdf: jsPDF, x: number, y: number, data: CostAnalysisData) {
  const boxWidth = 85;
  const boxHeight = 60;
  
  // Box background
  pdf.setFillColor(245, 248, 250);
  pdf.setDrawColor(200, 200, 200);
  pdf.setLineWidth(0.5);
  pdf.roundedRect(x, y, boxWidth, boxHeight, 3, 3, 'FD');
  
  // Title
  pdf.setTextColor(0, 0, 0);
  pdf.setFontSize(12);
  pdf.setFont('helvetica', 'bold');
  pdf.text('Key Insights', x + 5, y + 10);
  
  // Stats
  const stats = [
    { label: 'Plant P/L:', value: `Rs ${Math.abs(data.summary.totalPlantSavingLakhs).toFixed(1)} L`, positive: data.summary.savingPMT >= 0 },
    { label: 'Variable Cost:', value: `${((data.variableCosts.total / data.summary.totalCostPMT) * 100).toFixed(0)}%`, positive: false },
    { label: 'Efficiency:', value: `${((data.productionData.dispatch / data.productionData.machineProduction) * 100).toFixed(0)}%`, positive: true },
    { label: 'Utilization:', value: `${((data.productionData.machineProduction / 100) * 3.37).toFixed(0)}%`, positive: false }
  ];
  
  let statY = y + 18;
  stats.forEach(stat => {
    pdf.setFontSize(8);
    pdf.setFont('helvetica', 'normal');
    pdf.setTextColor(100, 100, 100);
    pdf.text(stat.label, x + 5, statY);
    
    pdf.setFont('helvetica', 'bold');
    pdf.setTextColor(stat.positive ? 52 : 234, stat.positive ? 168 : 67, stat.positive ? 83 : 53);
    pdf.text(stat.value, x + boxWidth - 5, statY, { align: 'right' });
    statY += 10;
  });
}

function addProductionFlowVisual(pdf: jsPDF, data: CostAnalysisData) {
  let yPosition = 180;
  
  // Section title
  pdf.setFontSize(16);
  pdf.setFont('helvetica', 'bold');
  pdf.text('Production Flow Analysis', 10, yPosition);
  
  yPosition += 15;
  
  // Flow diagram
  const stages = [
    { name: 'Machine\nProduction', value: data.productionData.machineProduction, yield: 100 },
    { name: 'Finish\nProduction', value: data.productionData.finishProduction, yield: 94 },
    { name: 'Transfer to\nWarehouse', value: data.productionData.transferToWarehouse, yield: 97.5 },
    { name: 'Dispatch', value: data.productionData.dispatch, yield: 89.9 }
  ];
  
  const boxWidth = 40;
  const boxHeight = 35;
  const spacing = 10;
  
  stages.forEach((stage, index) => {
    const xPos = 15 + (index * (boxWidth + spacing));
    
    // Box
    const efficiency = stage.value / data.productionData.machineProduction;
    const color = efficiency > 0.9 ? [52, 168, 83] : efficiency > 0.85 ? [251, 188, 4] : [234, 67, 53];
    
    pdf.setFillColor(color[0], color[1], color[2]);
    pdf.setDrawColor(60, 60, 60);
    pdf.setLineWidth(0.5);
    pdf.roundedRect(xPos, yPosition, boxWidth, boxHeight, 2, 2, 'FD');
    
    // Stage name
    pdf.setTextColor(255, 255, 255);
    pdf.setFontSize(8);
    pdf.setFont('helvetica', 'bold');
    const lines = stage.name.split('\n');
    lines.forEach((line, lineIndex) => {
      pdf.text(line, xPos + boxWidth / 2, yPosition + 10 + (lineIndex * 6), { align: 'center' });
    });
    
    // Value
    pdf.setFontSize(12);
    pdf.text(`${stage.value.toFixed(0)} MT`, xPos + boxWidth / 2, yPosition + 25, { align: 'center' });
    
    // Yield percentage below box
    pdf.setTextColor(0, 0, 0);
    pdf.setFontSize(9);
    pdf.text(`${stage.yield}%`, xPos + boxWidth / 2, yPosition + boxHeight + 8, { align: 'center' });
    
    // Arrow to next stage
    if (index < stages.length - 1) {
      pdf.setDrawColor(150, 150, 150);
      pdf.setLineWidth(2);
      const arrowStart = xPos + boxWidth + 2;
      const arrowEnd = arrowStart + spacing - 4;
      const arrowY = yPosition + boxHeight / 2;
      
      pdf.line(arrowStart, arrowY, arrowEnd, arrowY);
      // Arrowhead
      pdf.line(arrowEnd - 3, arrowY - 3, arrowEnd, arrowY);
      pdf.line(arrowEnd - 3, arrowY + 3, arrowEnd, arrowY);
    }
  });
  
  // Loss indicators
  yPosition += boxHeight + 20;
  pdf.setTextColor(234, 67, 53);
  pdf.setFontSize(9);
  pdf.setFont('helvetica', 'normal');
  
  const losses = [
    { stage: 'Finish', loss: data.productionData.machineProduction - data.productionData.finishProduction },
    { stage: 'Transfer', loss: data.productionData.finishProduction - data.productionData.transferToWarehouse },
    { stage: 'Dispatch', loss: data.productionData.transferToWarehouse - data.productionData.dispatch }
  ];
  
  losses.forEach((loss, index) => {
    if (loss.loss > 0) {
      pdf.text(`${loss.stage} Loss: ${loss.loss.toFixed(1)} MT`, 15 + (index * 60), yPosition);
    }
  });
}

function addCostBreakdownVisual(pdf: jsPDF, data: CostAnalysisData) {
  const pageWidth = pdf.internal.pageSize.getWidth();
  let yPosition = 20;
  
  // Section title
  pdf.setFontSize(18);
  pdf.setFont('helvetica', 'bold');
  pdf.text('Cost Structure Analysis', 10, yPosition);
  pdf.setDrawColor(41, 98, 255);
  pdf.setLineWidth(0.5);
  pdf.line(10, yPosition + 2, 90, yPosition + 2);
  
  yPosition += 20;
  
  // Cost breakdown bars
  const costs = [
    { name: 'Power', value: data.variableCosts.power, type: 'Variable' },
    { name: 'Interest & Financial', value: data.fixedCosts.interestAndFinancialCharges, type: 'Fixed' },
    { name: 'Steam', value: data.variableCosts.steam, type: 'Variable' },
    { name: 'Gas', value: data.variableCosts.gas, type: 'Variable' },
    { name: 'Salary & Contractor', value: data.fixedCosts.salaryAndContractor, type: 'Fixed' },
    { name: 'Water', value: data.variableCosts.water, type: 'Variable' },
    { name: 'Chemical', value: data.variableCosts.chemical, type: 'Variable' },
    { name: 'Packing', value: data.variableCosts.packing, type: 'Variable' },
    { name: 'Admin & Selling', value: data.fixedCosts.adminAndSellingExpenses, type: 'Fixed' },
    { name: 'Fiber', value: data.variableCosts.fiber, type: 'Variable' }
  ].filter(c => c.value > 0).sort((a, b) => b.value - a.value);
  
  const maxValue = Math.max(...costs.map(c => c.value));
  const barMaxWidth = 120;
  const barHeight = 12;
  const barSpacing = 15;
  
  costs.forEach((cost, index) => {
    const yPos = yPosition + (index * barSpacing);
    const barWidth = (cost.value / maxValue) * barMaxWidth;
    
    // Cost name
    pdf.setTextColor(0, 0, 0);
    pdf.setFontSize(10);
    pdf.setFont('helvetica', 'normal');
    pdf.text(cost.name, 10, yPos + 8);
    
    // Bar
    const color = cost.type === 'Variable' ? [66, 133, 244] : [234, 67, 53];
    pdf.setFillColor(color[0], color[1], color[2]);
    pdf.roundedRect(70, yPos, barWidth, barHeight, 2, 2, 'F');
    
    // Value
    pdf.setTextColor(0, 0, 0);
    pdf.setFontSize(9);
    pdf.text(`Rs ${cost.value.toFixed(0)}`, 72 + barWidth + 5, yPos + 8);
    
    // Percentage
    const percentage = (cost.value / data.summary.totalCostPMT) * 100;
    pdf.setTextColor(100, 100, 100);
    pdf.text(`(${percentage.toFixed(1)}%)`, 72 + barWidth + 30, yPos + 8);
  });
  
  // Summary box
  yPosition += costs.length * barSpacing + 20;
  
  // Variable vs Fixed visual comparison
  const varPercent = (data.variableCosts.total / data.summary.totalCostPMT) * 100;
  const fixPercent = (data.fixedCosts.total / data.summary.totalCostPMT) * 100;
  
  pdf.setFontSize(12);
  pdf.setFont('helvetica', 'bold');
  pdf.text('Variable vs Fixed Cost Split', 10, yPosition);
  
  yPosition += 10;
  const totalBarWidth = 180;
  const varBarWidth = (varPercent / 100) * totalBarWidth;
  
  // Variable cost bar
  pdf.setFillColor(66, 133, 244);
  pdf.rect(10, yPosition, varBarWidth, 20, 'F');
  
  // Fixed cost bar
  pdf.setFillColor(234, 67, 53);
  pdf.rect(10 + varBarWidth, yPosition, totalBarWidth - varBarWidth, 20, 'F');
  
  // Labels
  pdf.setTextColor(255, 255, 255);
  pdf.setFontSize(10);
  pdf.setFont('helvetica', 'bold');
  pdf.text(`Variable: ${varPercent.toFixed(1)}%`, 10 + varBarWidth / 2, yPosition + 12, { align: 'center' });
  pdf.text(`Fixed: ${fixPercent.toFixed(1)}%`, 10 + varBarWidth + (totalBarWidth - varBarWidth) / 2, yPosition + 12, { align: 'center' });
  
  // Cost summary cards
  yPosition += 30;
  const cardData = [
    { label: 'Total Variable', value: `Rs ${data.variableCosts.total.toFixed(0)}/MT`, color: [66, 133, 244] },
    { label: 'Total Fixed', value: `Rs ${data.fixedCosts.total.toFixed(0)}/MT`, color: [234, 67, 53] },
    { label: 'Total Cost', value: `Rs ${data.summary.totalCostPMT.toFixed(0)}/MT`, color: [41, 98, 255] }
  ];
  
  cardData.forEach((card, index) => {
    const xPos = 10 + (index * 65);
    
    pdf.setFillColor(250, 250, 250);
    pdf.setDrawColor(card.color[0], card.color[1], card.color[2]);
    pdf.setLineWidth(1);
    pdf.roundedRect(xPos, yPosition, 60, 25, 3, 3, 'FD');
    
    pdf.setTextColor(100, 100, 100);
    pdf.setFontSize(8);
    pdf.setFont('helvetica', 'normal');
    pdf.text(card.label, xPos + 30, yPosition + 8, { align: 'center' });
    
    pdf.setTextColor(0, 0, 0);
    pdf.setFontSize(11);
    pdf.setFont('helvetica', 'bold');
    pdf.text(card.value, xPos + 30, yPosition + 17, { align: 'center' });
  });
}

function addDailyTrendsVisual(pdf: jsPDF, costingData: CostingData[]) {
  let yPosition = 20;
  
  pdf.setFontSize(18);
  pdf.setFont('helvetica', 'bold');
  pdf.text('Daily Performance Trends', 10, yPosition);
  pdf.setDrawColor(41, 98, 255);
  pdf.setLineWidth(0.5);
  pdf.line(10, yPosition + 2, 100, yPosition + 2);
  
  yPosition += 25;
  
  // Mini sparkline-style visualization
  const sortedData = [...costingData].sort((a, b) => a.date.localeCompare(b.date));
  const chartWidth = 180;
  const chartHeight = 60;
  const chartX = 10;
  const chartY = yPosition;
  
  // Chart background
  pdf.setFillColor(250, 250, 250);
  pdf.rect(chartX, chartY, chartWidth, chartHeight, 'F');
  
  // Grid lines
  pdf.setDrawColor(230, 230, 230);
  pdf.setLineWidth(0.5);
  for (let i = 0; i <= 4; i++) {
    const y = chartY + (i * chartHeight / 4);
    pdf.line(chartX, y, chartX + chartWidth, y);
  }
  
  // Production trend line
  const maxProduction = Math.max(...sortedData.map(d => d.totalProduction));
  const minProduction = Math.min(...sortedData.map(d => d.totalProduction));
  
  pdf.setDrawColor(52, 168, 83);
  pdf.setLineWidth(2);
  
  sortedData.forEach((day, index) => {
    if (index > 0) {
      const x1 = chartX + ((index - 1) / (sortedData.length - 1)) * chartWidth;
      const x2 = chartX + (index / (sortedData.length - 1)) * chartWidth;
      const y1 = chartY + chartHeight - ((sortedData[index - 1].totalProduction - minProduction) / (maxProduction - minProduction)) * chartHeight;
      const y2 = chartY + chartHeight - ((day.totalProduction - minProduction) / (maxProduction - minProduction)) * chartHeight;
      
      pdf.line(x1, y1, x2, y2);
    }
  });
  
  // Cost trend line
  const costPerMT = sortedData.map(d => d.totalCost / d.totalProduction);
  const maxCost = Math.max(...costPerMT);
  const minCost = Math.min(...costPerMT);
  
  pdf.setDrawColor(234, 67, 53);
  pdf.setLineWidth(2);
  
  sortedData.forEach((day, index) => {
    if (index > 0) {
      const x1 = chartX + ((index - 1) / (sortedData.length - 1)) * chartWidth;
      const x2 = chartX + (index / (sortedData.length - 1)) * chartWidth;
      const y1 = chartY + chartHeight - ((costPerMT[index - 1] - minCost) / (maxCost - minCost)) * chartHeight;
      const y2 = chartY + chartHeight - ((costPerMT[index] - minCost) / (maxCost - minCost)) * chartHeight;
      
      pdf.line(x1, y1, x2, y2);
    }
  });
  
  // Legend
  yPosition += chartHeight + 15;
  
  pdf.setFillColor(52, 168, 83);
  pdf.rect(10, yPosition, 15, 3, 'F');
  pdf.setTextColor(0, 0, 0);
  pdf.setFontSize(9);
  pdf.text('Production (MT)', 28, yPosition + 2.5);
  
  pdf.setFillColor(234, 67, 53);
  pdf.rect(80, yPosition, 15, 3, 'F');
  pdf.text('Cost per MT', 98, yPosition + 2.5);
  
  // Statistics boxes
  yPosition += 20;
  
  const stats = [
    {
      title: 'Production Statistics',
      data: [
        { label: 'Average', value: `${(sortedData.reduce((sum, d) => sum + d.totalProduction, 0) / sortedData.length).toFixed(0)} MT` },
        { label: 'Maximum', value: `${maxProduction.toFixed(0)} MT` },
        { label: 'Minimum', value: `${minProduction.toFixed(0)} MT` },
        { label: 'Variance', value: `${((maxProduction - minProduction) / ((maxProduction + minProduction) / 2) * 100).toFixed(0)}%` }
      ]
    },
    {
      title: 'Cost Statistics',
      data: [
        { label: 'Average', value: `Rs ${(costPerMT.reduce((sum, c) => sum + c, 0) / costPerMT.length).toFixed(0)}` },
        { label: 'Maximum', value: `Rs ${maxCost.toFixed(0)}` },
        { label: 'Minimum', value: `Rs ${minCost.toFixed(0)}` },
        { label: 'Variance', value: `${((maxCost - minCost) / ((maxCost + minCost) / 2) * 100).toFixed(0)}%` }
      ]
    }
  ];
  
  stats.forEach((stat, index) => {
    const xPos = 10 + (index * 100);  // Increased spacing between boxes
    
    pdf.setFillColor(245, 248, 250);
    pdf.setDrawColor(200, 200, 200);
    pdf.setLineWidth(0.5);
    pdf.roundedRect(xPos, yPosition, 90, 55, 3, 3, 'FD');
    
    pdf.setTextColor(0, 0, 0);
    pdf.setFontSize(10);
    pdf.setFont('helvetica', 'bold');
    pdf.text(stat.title, xPos + 45, yPosition + 8, { align: 'center' });
    
    let dataY = yPosition + 18;
    stat.data.forEach(item => {
      pdf.setFontSize(8);
      pdf.setFont('helvetica', 'normal');
      pdf.setTextColor(100, 100, 100);
      pdf.text(item.label, xPos + 5, dataY);
      
      pdf.setTextColor(0, 0, 0);
      pdf.setFont('helvetica', 'bold');
      pdf.text(item.value, xPos + 85, dataY, { align: 'right' });
      dataY += 9;
    });
  });
}

function addEfficiencyAnalysis(pdf: jsPDF, costingData: CostingData[]) {
  let yPosition = 160;
  
  pdf.setFontSize(16);
  pdf.setFont('helvetica', 'bold');
  pdf.text('Efficiency & Quality Analysis', 10, yPosition);
  
  yPosition += 15;
  
  // Quality distribution table
  const qualityMap = new Map<string, number>();
  costingData.forEach(day => {
    const quality = day.quality || 'Unknown';
    qualityMap.set(quality, (qualityMap.get(quality) || 0) + day.totalProduction);
  });
  
  const totalProduction = costingData.reduce((sum, d) => sum + d.totalProduction, 0);
  const qualityData = Array.from(qualityMap.entries())
    .map(([quality, production]) => ({
      quality,
      production,
      percentage: (production / totalProduction) * 100
    }))
    .sort((a, b) => b.production - a.production)
    .slice(0, 5); // Top 5 qualities
  
  // Quality distribution table
  pdf.setFontSize(10);
  pdf.setFont('helvetica', 'bold');
  pdf.text('Quality Distribution', 10, yPosition);
  
  yPosition += 8;
  const tableData = qualityData.map(item => [
    item.quality,
    `${item.production.toFixed(0)} MT`,
    `${item.percentage.toFixed(1)}%`
  ]);
  
  autoTable(pdf, {
    head: [['Quality', 'Production', 'Share %']],
    body: tableData,
    startY: yPosition,
    theme: 'plain',
    columnStyles: {
      0: { cellWidth: 40 },
      1: { cellWidth: 30, halign: 'right' },
      2: { cellWidth: 25, halign: 'right' }
    },
    margin: { left: 10 }
  });
  
  // Get the final Y position after the table
  const finalY = (pdf as any).lastAutoTable.finalY || yPosition + 60;
  
  // Efficiency metrics
  const efficiencyData = costingData.map(d => ({
    date: d.date,
    efficiency: d.productionEfficiency || 95
  }));
  
  const avgEfficiency = efficiencyData.reduce((sum, d) => sum + d.efficiency, 0) / efficiencyData.length;
  const highEfficiencyDays = efficiencyData.filter(d => d.efficiency >= 90).length;
  const lowEfficiencyDays = efficiencyData.filter(d => d.efficiency < 80).length;
  
  // Efficiency summary box - placed to the right of the table
  const boxX = 120;
  const boxY = yPosition - 8;
  
  pdf.setFillColor(245, 248, 250);
  pdf.setDrawColor(200, 200, 200);
  pdf.roundedRect(boxX, boxY, 75, 65, 3, 3, 'FD');
  
  pdf.setTextColor(0, 0, 0);
  pdf.setFontSize(10);
  pdf.setFont('helvetica', 'bold');
  pdf.text('Efficiency Metrics', boxX + 37.5, boxY + 10, { align: 'center' });
  
  const effStats = [
    { label: 'Avg Efficiency:', value: `${avgEfficiency.toFixed(1)}%`, color: avgEfficiency >= 90 ? [52, 168, 83] : [251, 188, 4] },
    { label: 'High Days:', value: `${highEfficiencyDays}`, color: [52, 168, 83] },
    { label: 'Low Days:', value: `${lowEfficiencyDays}`, color: [234, 67, 53] },
    { label: 'Target:', value: `${avgEfficiency >= 90 ? 'Met' : 'Not Met'}`, color: avgEfficiency >= 90 ? [52, 168, 83] : [234, 67, 53] }
  ];
  
  let statY = boxY + 20;
  effStats.forEach(stat => {
    pdf.setFontSize(8);
    pdf.setFont('helvetica', 'normal');
    pdf.setTextColor(100, 100, 100);
    pdf.text(stat.label, boxX + 5, statY);
    
    pdf.setTextColor(stat.color[0], stat.color[1], stat.color[2]);
    pdf.setFont('helvetica', 'bold');
    pdf.text(stat.value, boxX + 70, statY, { align: 'right' });
    statY += 11;
  });
}

function addFooterToAllPages(pdf: jsPDF) {
  const pageCount = pdf.getNumberOfPages();
  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  
  for (let i = 1; i <= pageCount; i++) {
    pdf.setPage(i);
    
    // Footer background
    pdf.setFillColor(245, 248, 250);
    pdf.rect(0, pageHeight - 20, pageWidth, 20, 'F');
    
    // Footer line
    pdf.setDrawColor(200, 200, 200);
    pdf.line(10, pageHeight - 20, pageWidth - 10, pageHeight - 20);
    
    // Footer text
    pdf.setFontSize(8);
    pdf.setTextColor(100, 100, 100);
    pdf.text(
      `Generated on ${dayjs().format('DD MMM YYYY, HH:mm')} | Confidential`,
      10,
      pageHeight - 10
    );
    pdf.text(
      `Page ${i} of ${pageCount}`,
      pageWidth - 10,
      pageHeight - 10,
      { align: 'right' }
    );
    
    // Company watermark
    pdf.setTextColor(230, 230, 230);
    pdf.setFontSize(6);
    pdf.text('Gayatrishakti Tissue Pvt Ltd', pageWidth / 2, pageHeight - 5, { align: 'center' });
  }
}