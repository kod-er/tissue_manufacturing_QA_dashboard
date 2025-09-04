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

export async function generateCostAnalysisPdfReportSimple(
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
  
  // Executive Summary
  addExecutiveSummary(pdf, analysisData);
  
  // Production Overview Section
  addProductionOverview(pdf, analysisData);
  
  // Add new page for detailed analysis
  pdf.addPage();
  
  // Variable Costs Analysis
  addVariableCostsAnalysis(pdf, analysisData);
  
  // Fixed Costs Analysis
  addFixedCostsAnalysis(pdf, analysisData);
  
  // Cost Breakdown Summary
  addCostBreakdownSummary(pdf, analysisData);
  
  // Add new page for daily details
  pdf.addPage();
  
  // Daily Summary Table
  addDailySummaryTable(pdf, costingData);
  
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
  
  // Company logo area (placeholder)
  pdf.setFillColor(41, 98, 255);
  pdf.rect(10, 10, pageWidth - 20, 25, 'F');
  
  // Company name
  pdf.setTextColor(255, 255, 255);
  pdf.setFontSize(22);
  pdf.setFont('helvetica', 'bold');
  pdf.text('Gayatrishakti Tissue Private Limited', pageWidth / 2, 22, { align: 'center' });
  
  // Report title
  pdf.setFontSize(14);
  pdf.setFont('helvetica', 'normal');
  pdf.text(`Cost Analysis Report - ${period}`, pageWidth / 2, 30, { align: 'center' });
  
  // Reset text color
  pdf.setTextColor(0, 0, 0);
}

function addExecutiveSummary(pdf: jsPDF, data: CostAnalysisData) {
  const pageWidth = pdf.internal.pageSize.getWidth();
  let yPosition = 45;
  
  // Section title
  pdf.setFontSize(16);
  pdf.setFont('helvetica', 'bold');
  pdf.text('Executive Summary', 10, yPosition);
  
  yPosition += 10;
  
  // Key metrics cards
  const cardWidth = (pageWidth - 30) / 3;
  const cardHeight = 25;
  const metrics = [
    {
      title: 'Total Production',
      value: `${data.productionData.machineProduction.toFixed(0)} MT`,
      color: [52, 168, 83] as [number, number, number]
    },
    {
      title: 'Cost per MT',
      value: `Rs ${data.summary.totalCostPMT.toFixed(0)}`,
      color: [66, 133, 244] as [number, number, number]
    },
    {
      title: data.summary.savingPMT >= 0 ? 'Profit per MT' : 'Loss per MT',
      value: `Rs ${Math.abs(data.summary.savingPMT).toFixed(0)}`,
      color: data.summary.savingPMT >= 0 ? [52, 168, 83] as [number, number, number] : [234, 67, 53] as [number, number, number]
    }
  ];
  
  metrics.forEach((metric, index) => {
    const xPos = 10 + (index * (cardWidth + 5));
    
    // Card background
    pdf.setFillColor(metric.color[0], metric.color[1], metric.color[2]);
    pdf.roundedRect(xPos, yPosition, cardWidth, cardHeight, 3, 3, 'F');
    
    // Card content
    pdf.setTextColor(255, 255, 255);
    pdf.setFontSize(10);
    pdf.setFont('helvetica', 'normal');
    pdf.text(metric.title, xPos + cardWidth / 2, yPosition + 8, { align: 'center' });
    
    pdf.setFontSize(16);
    pdf.setFont('helvetica', 'bold');
    pdf.text(metric.value, xPos + cardWidth / 2, yPosition + 18, { align: 'center' });
  });
  
  pdf.setTextColor(0, 0, 0);
  yPosition += cardHeight + 10;
  
  // Summary insights
  pdf.setFontSize(11);
  pdf.setFont('helvetica', 'normal');
  
  // Find the largest cost component
  const costComponents = [
    { name: 'Fiber', value: data.variableCosts.fiber },
    { name: 'Power', value: data.variableCosts.power },
    { name: 'Gas', value: data.variableCosts.gas },
    { name: 'Chemical', value: data.variableCosts.chemical },
    { name: 'Steam', value: data.variableCosts.steam },
    { name: 'Interest & Financial', value: data.fixedCosts.interestAndFinancialCharges }
  ];
  
  const largestCost = costComponents.reduce((max, comp) => comp.value > max.value ? comp : max);
  
  const insights = [
    `Total plant ${data.summary.savingPMT >= 0 ? 'profit' : 'loss'}: Rs ${Math.abs(data.summary.totalPlantSavingLakhs).toFixed(2)} lakhs`,
    `Variable costs constitute ${((data.variableCosts.total / data.summary.totalCostPMT) * 100).toFixed(1)}% of total costs`,
    `${largestCost.name} is the largest cost component at Rs ${largestCost.value.toFixed(0)}/MT (${((largestCost.value / data.summary.totalCostPMT) * 100).toFixed(1)}%)`,
    `Production efficiency: ${((data.productionData.dispatch / data.productionData.machineProduction) * 100).toFixed(1)}% dispatch rate`
  ];
  
  insights.forEach((insight, index) => {
    pdf.text(`${index + 1}. ${insight}`, 10, yPosition);
    yPosition += 6;
  });
}

function addProductionOverview(pdf: jsPDF, data: CostAnalysisData) {
  let yPosition = 115;
  
  // Section title
  pdf.setFontSize(14);
  pdf.setFont('helvetica', 'bold');
  pdf.text('Production Flow Analysis', 10, yPosition);
  
  yPosition += 10;
  
  // Production flow data
  const productionFlow = [
    ['Stage', 'Quantity (MT)', 'Yield %', 'Loss (MT)'],
    ['Machine Production', data.productionData.machineProduction.toFixed(2), '100.0%', '-'],
    ['Finish Production', data.productionData.finishProduction.toFixed(2), '94.0%', 
     (data.productionData.machineProduction - data.productionData.finishProduction).toFixed(2)],
    ['Transfer to Warehouse', data.productionData.transferToWarehouse.toFixed(2), '97.5%',
     (data.productionData.finishProduction - data.productionData.transferToWarehouse).toFixed(2)],
    ['Dispatch', data.productionData.dispatch.toFixed(2), '89.9%',
     (data.productionData.transferToWarehouse - data.productionData.dispatch).toFixed(2)]
  ];
  
  autoTable(pdf, {
    head: [productionFlow[0]],
    body: productionFlow.slice(1),
    startY: yPosition,
    theme: 'striped',
    headStyles: {
      fillColor: [41, 98, 255],
      textColor: [255, 255, 255],
      fontSize: 10
    },
    bodyStyles: {
      fontSize: 10
    },
    columnStyles: {
      0: { cellWidth: 60 },
      1: { cellWidth: 40, halign: 'right' },
      2: { cellWidth: 30, halign: 'center' },
      3: { cellWidth: 30, halign: 'right' }
    }
  });
}

function addVariableCostsAnalysis(pdf: jsPDF, data: CostAnalysisData) {
  let yPosition = 20;
  
  pdf.setFontSize(16);
  pdf.setFont('helvetica', 'bold');
  pdf.text('Variable Costs Analysis', 10, yPosition);
  
  yPosition += 10;
  
  const variableCosts = [
    ['Cost Component', 'Amount (Rs/MT)', '% of Variable', '% of Total'],
    ['Fiber', data.variableCosts.fiber.toFixed(0), 
     ((data.variableCosts.fiber / data.variableCosts.total) * 100).toFixed(1) + '%',
     ((data.variableCosts.fiber / data.summary.totalCostPMT) * 100).toFixed(1) + '%'],
    ['Power', data.variableCosts.power.toFixed(0),
     ((data.variableCosts.power / data.variableCosts.total) * 100).toFixed(1) + '%',
     ((data.variableCosts.power / data.summary.totalCostPMT) * 100).toFixed(1) + '%'],
    ['Gas', data.variableCosts.gas.toFixed(0),
     ((data.variableCosts.gas / data.variableCosts.total) * 100).toFixed(1) + '%',
     ((data.variableCosts.gas / data.summary.totalCostPMT) * 100).toFixed(1) + '%'],
    ['Chemical', data.variableCosts.chemical.toFixed(0),
     ((data.variableCosts.chemical / data.variableCosts.total) * 100).toFixed(1) + '%',
     ((data.variableCosts.chemical / data.summary.totalCostPMT) * 100).toFixed(1) + '%'],
    ['Water', data.variableCosts.water.toFixed(0),
     ((data.variableCosts.water / data.variableCosts.total) * 100).toFixed(1) + '%',
     ((data.variableCosts.water / data.summary.totalCostPMT) * 100).toFixed(1) + '%'],
    ['Packing', data.variableCosts.packing.toFixed(0),
     ((data.variableCosts.packing / data.variableCosts.total) * 100).toFixed(1) + '%',
     ((data.variableCosts.packing / data.summary.totalCostPMT) * 100).toFixed(1) + '%'],
    ['Steam', data.variableCosts.steam.toFixed(0),
     ((data.variableCosts.steam / data.variableCosts.total) * 100).toFixed(1) + '%',
     ((data.variableCosts.steam / data.summary.totalCostPMT) * 100).toFixed(1) + '%']
  ];
  
  autoTable(pdf, {
    head: [variableCosts[0]],
    body: variableCosts.slice(1),
    foot: [['Total Variable Costs', data.variableCosts.total.toFixed(0), '100.0%', 
            ((data.variableCosts.total / data.summary.totalCostPMT) * 100).toFixed(1) + '%']],
    startY: yPosition,
    theme: 'grid',
    headStyles: {
      fillColor: [66, 133, 244],
      textColor: [255, 255, 255],
      fontSize: 10
    },
    footStyles: {
      fillColor: [240, 240, 240],
      textColor: [0, 0, 0],
      fontStyle: 'bold'
    },
    columnStyles: {
      0: { cellWidth: 60 },
      1: { cellWidth: 40, halign: 'right' },
      2: { cellWidth: 30, halign: 'center' },
      3: { cellWidth: 30, halign: 'center' }
    }
  });
}

function addFixedCostsAnalysis(pdf: jsPDF, data: CostAnalysisData) {
  let yPosition = 120;
  
  pdf.setFontSize(16);
  pdf.setFont('helvetica', 'bold');
  pdf.text('Fixed Costs Analysis', 10, yPosition);
  
  yPosition += 10;
  
  const fixedCosts = [
    ['Cost Component', 'Monthly Amount', 'Amount (Rs/MT)', '% of Total'],
    ['Salary & Contractor', 'Rs 90,00,000', data.fixedCosts.salaryAndContractor.toFixed(0),
     ((data.fixedCosts.salaryAndContractor / data.summary.totalCostPMT) * 100).toFixed(1) + '%'],
    ['Admin & Selling', 'Rs 25,00,000', data.fixedCosts.adminAndSellingExpenses.toFixed(0),
     ((data.fixedCosts.adminAndSellingExpenses / data.summary.totalCostPMT) * 100).toFixed(1) + '%'],
    ['Interest & Financial', 'Rs 2,00,00,000', data.fixedCosts.interestAndFinancialCharges.toFixed(0),
     ((data.fixedCosts.interestAndFinancialCharges / data.summary.totalCostPMT) * 100).toFixed(1) + '%']
  ];
  
  autoTable(pdf, {
    head: [fixedCosts[0]],
    body: fixedCosts.slice(1),
    foot: [['Total Fixed Costs', '', data.fixedCosts.total.toFixed(0),
            ((data.fixedCosts.total / data.summary.totalCostPMT) * 100).toFixed(1) + '%']],
    startY: yPosition,
    theme: 'grid',
    headStyles: {
      fillColor: [234, 67, 53],
      textColor: [255, 255, 255],
      fontSize: 10
    },
    footStyles: {
      fillColor: [240, 240, 240],
      textColor: [0, 0, 0],
      fontStyle: 'bold'
    },
    columnStyles: {
      0: { cellWidth: 60 },
      1: { cellWidth: 40, halign: 'right' },
      2: { cellWidth: 40, halign: 'right' },
      3: { cellWidth: 30, halign: 'center' }
    }
  });
}

function addCostBreakdownSummary(pdf: jsPDF, data: CostAnalysisData) {
  let yPosition = 200;
  
  pdf.setFontSize(14);
  pdf.setFont('helvetica', 'bold');
  pdf.text('Cost Summary', 10, yPosition);
  
  yPosition += 10;
  
  // Create visual bar representation of costs
  const barWidth = 150;
  const barHeight = 15;
  const variableWidth = (data.variableCosts.total / data.summary.totalCostPMT) * barWidth;
  
  // Variable costs bar
  pdf.setFillColor(66, 133, 244);
  pdf.rect(10, yPosition, variableWidth, barHeight, 'F');
  
  // Fixed costs bar
  pdf.setFillColor(234, 67, 53);
  pdf.rect(10 + variableWidth, yPosition, barWidth - variableWidth, barHeight, 'F');
  
  // Labels
  pdf.setFontSize(10);
  pdf.setTextColor(255, 255, 255);
  pdf.text(`Variable: ${((data.variableCosts.total / data.summary.totalCostPMT) * 100).toFixed(1)}%`, 
           10 + variableWidth / 2, yPosition + 10, { align: 'center' });
  pdf.text(`Fixed: ${((data.fixedCosts.total / data.summary.totalCostPMT) * 100).toFixed(1)}%`, 
           10 + variableWidth + (barWidth - variableWidth) / 2, yPosition + 10, { align: 'center' });
  
  pdf.setTextColor(0, 0, 0);
  yPosition += 25;
  
  // Summary table
  const summary = [
    ['Total Variable Cost', `Rs ${data.variableCosts.total.toFixed(0)}/MT`],
    ['Total Fixed Cost', `Rs ${data.fixedCosts.total.toFixed(0)}/MT`],
    ['Total Cost', `Rs ${data.summary.totalCostPMT.toFixed(0)}/MT`],
    ['NSR (Net Sales Realization)', `Rs ${data.summary.nsrPMT.toFixed(0)}/MT`],
    [data.summary.savingPMT >= 0 ? 'Profit' : 'Loss', `Rs ${Math.abs(data.summary.savingPMT).toFixed(0)}/MT`]
  ];
  
  autoTable(pdf, {
    body: summary,
    startY: yPosition,
    theme: 'plain',
    columnStyles: {
      0: { cellWidth: 80, fontStyle: 'bold' },
      1: { cellWidth: 50, halign: 'right' }
    }
  });
}

function addDailySummaryTable(pdf: jsPDF, costingData: CostingData[]) {
  let yPosition = 20;
  
  pdf.setFontSize(16);
  pdf.setFont('helvetica', 'bold');
  pdf.text('Daily Production & Cost Summary', 10, yPosition);
  
  yPosition += 10;
  
  const dailyData = costingData.map(day => [
    dayjs(day.date).format('DD-MM-YYYY'),
    day.totalProduction.toFixed(2),
    (day.totalCost / day.totalProduction).toFixed(0),
    day.productionEfficiency?.toFixed(1) || '95.0',
    day.quality || 'Mixed'
  ]);
  
  // Add averages
  const avgProduction = costingData.reduce((sum, d) => sum + d.totalProduction, 0) / costingData.length;
  const avgCostPerTon = costingData.reduce((sum, d) => sum + (d.totalCost / d.totalProduction), 0) / costingData.length;
  const avgEfficiency = costingData.reduce((sum, d) => sum + (d.productionEfficiency || 95), 0) / costingData.length;
  
  autoTable(pdf, {
    head: [['Date', 'Production (MT)', 'Cost/MT (Rs)', 'Efficiency %', 'Quality']],
    body: dailyData,
    foot: [['AVERAGE', avgProduction.toFixed(2), avgCostPerTon.toFixed(0), avgEfficiency.toFixed(1), '-']],
    startY: yPosition,
    theme: 'striped',
    headStyles: {
      fillColor: [41, 98, 255],
      textColor: [255, 255, 255],
      fontSize: 10
    },
    footStyles: {
      fillColor: [240, 240, 240],
      textColor: [0, 0, 0],
      fontStyle: 'bold'
    },
    columnStyles: {
      0: { cellWidth: 35 },
      1: { cellWidth: 35, halign: 'center' },
      2: { cellWidth: 35, halign: 'right' },
      3: { cellWidth: 30, halign: 'center' },
      4: { cellWidth: 35, halign: 'center' }
    }
  });
}

function addFooterToAllPages(pdf: jsPDF) {
  const pageCount = pdf.getNumberOfPages();
  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  
  for (let i = 1; i <= pageCount; i++) {
    pdf.setPage(i);
    
    // Footer line
    pdf.setDrawColor(200, 200, 200);
    pdf.line(10, pageHeight - 15, pageWidth - 10, pageHeight - 15);
    
    // Footer text
    pdf.setFontSize(8);
    pdf.setTextColor(100, 100, 100);
    pdf.text(
      `Generated on ${dayjs().format('DD MMM YYYY, HH:mm')}`,
      10,
      pageHeight - 10
    );
    pdf.text(
      `Page ${i} of ${pageCount}`,
      pageWidth - 10,
      pageHeight - 10,
      { align: 'right' }
    );
  }
}