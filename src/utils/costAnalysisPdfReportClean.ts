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

export async function generateCostAnalysisPdfReportClean(
  costingData: CostingData[],
  monthYear: string,
  nsrPerTon: number = 90000
): Promise<Blob> {
  const pdf = new jsPDF('portrait', 'mm', 'a4');
  
  // Calculate analysis data
  const analysisData = calculateCostAnalysisData(costingData, monthYear, nsrPerTon);
  
  // Page 1: Executive Summary and Production Analysis
  addReportHeader(pdf, analysisData.period);
  let currentY = addExecutiveSummary(pdf, analysisData, 50);
  currentY = addProductionAnalysis(pdf, analysisData, currentY + 10);
  
  // Page 2: Cost Analysis
  pdf.addPage();
  currentY = 20;
  currentY = addCostBreakdown(pdf, analysisData, currentY);
  currentY = addCostSummary(pdf, analysisData, currentY + 10);
  
  // Page 3: Daily Performance
  pdf.addPage();
  currentY = 20;
  currentY = addDailyPerformance(pdf, costingData, currentY);
  
  // Page 4: Efficiency Analysis
  pdf.addPage();
  currentY = 20;
  addEfficiencyAnalysis(pdf, costingData, currentY);
  
  // Add footer to all pages
  addFooterToAllPages(pdf);
  
  return pdf.output('blob');
}

function calculateCostAnalysisData(
  costingData: CostingData[],
  monthYear: string,
  nsrPerTon: number
): CostAnalysisData {
  const totalMachineProduction = costingData.reduce((sum, d) => sum + d.totalProduction, 0);
  const totalFinishProduction = totalMachineProduction * 0.94;
  const totalTransferToWarehouse = totalFinishProduction * 0.975;
  const totalDispatch = totalTransferToWarehouse * 0.899;
  
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
  
  const salaryAndContractor = 9000000 / totalMachineProduction;
  const adminAndSelling = 2500000 / totalMachineProduction;
  const interestAndFinancial = 20000000 / totalMachineProduction;
  
  const totalFixedCost = salaryAndContractor + adminAndSelling + interestAndFinancial;
  
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
  
  pdf.setFillColor(41, 98, 255);
  pdf.rect(0, 0, pageWidth, 35, 'F');
  
  pdf.setTextColor(255, 255, 255);
  pdf.setFontSize(22);
  pdf.setFont('helvetica', 'bold');
  pdf.text('Gayatrishakti Tissue Private Limited', pageWidth / 2, 18, { align: 'center' });
  
  pdf.setFontSize(14);
  pdf.setFont('helvetica', 'normal');
  pdf.text(`Cost Analysis Report - ${period}`, pageWidth / 2, 27, { align: 'center' });
  
  pdf.setTextColor(0, 0, 0);
}

function addExecutiveSummary(pdf: jsPDF, data: CostAnalysisData, startY: number): number {
  let currentY = startY;
  
  pdf.setFontSize(16);
  pdf.setFont('helvetica', 'bold');
  pdf.text('Executive Summary', 10, currentY);
  
  currentY += 10;
  
  // Visual KPI Cards
  const kpiWidth = 60;
  const kpiHeight = 20;
  const kpiSpacing = 5;
  
  // Total Production Card
  pdf.setFillColor(52, 168, 83);
  pdf.roundedRect(10, currentY, kpiWidth, kpiHeight, 3, 3, 'F');
  pdf.setTextColor(255, 255, 255);
  pdf.setFontSize(10);
  pdf.text('Total Production', 10 + kpiWidth/2, currentY + 6, { align: 'center' });
  pdf.setFontSize(14);
  pdf.setFont('helvetica', 'bold');
  pdf.text(`${data.productionData.machineProduction.toFixed(0)} MT`, 10 + kpiWidth/2, currentY + 14, { align: 'center' });
  
  // Cost per MT Card
  const costX = 10 + kpiWidth + kpiSpacing;
  pdf.setFillColor(66, 133, 244);
  pdf.roundedRect(costX, currentY, kpiWidth, kpiHeight, 3, 3, 'F');
  pdf.setFontSize(10);
  pdf.setFont('helvetica', 'normal');
  pdf.text('Cost per MT', costX + kpiWidth/2, currentY + 6, { align: 'center' });
  pdf.setFontSize(14);
  pdf.setFont('helvetica', 'bold');
  pdf.text(`Rs ${(data.summary.totalCostPMT/1000).toFixed(1)}k`, costX + kpiWidth/2, currentY + 14, { align: 'center' });
  
  // Profit/Loss Card
  const plX = costX + kpiWidth + kpiSpacing;
  pdf.setFillColor(data.summary.savingPMT >= 0 ? 52 : 234, data.summary.savingPMT >= 0 ? 168 : 67, data.summary.savingPMT >= 0 ? 83 : 53);
  pdf.roundedRect(plX, currentY, kpiWidth, kpiHeight, 3, 3, 'F');
  pdf.setFontSize(10);
  pdf.setFont('helvetica', 'normal');
  pdf.text(data.summary.savingPMT >= 0 ? 'Profit/MT' : 'Loss/MT', plX + kpiWidth/2, currentY + 6, { align: 'center' });
  pdf.setFontSize(14);
  pdf.setFont('helvetica', 'bold');
  pdf.text(`Rs ${Math.abs(data.summary.savingPMT/1000).toFixed(1)}k`, plX + kpiWidth/2, currentY + 14, { align: 'center' });
  
  pdf.setTextColor(0, 0, 0);
  currentY += kpiHeight + 10;
  
  // Performance Indicator Bar
  const performance = Math.max(0, Math.min(100, (data.summary.savingPMT / data.summary.nsrPMT) * 100 + 50));
  const barWidth = 180;
  const barHeight = 12;
  
  pdf.setFontSize(12);
  pdf.setFont('helvetica', 'normal');
  pdf.text('Overall Performance Score', 10, currentY);
  currentY += 8;
  
  // Background bar
  pdf.setFillColor(230, 230, 230);
  pdf.roundedRect(10, currentY, barWidth, barHeight, 2, 2, 'F');
  
  // Performance bar
  const perfWidth = (performance / 100) * barWidth;
  const barColor = performance >= 70 ? [52, 168, 83] : performance >= 40 ? [251, 188, 4] : [234, 67, 53];
  pdf.setFillColor(barColor[0], barColor[1], barColor[2]);
  pdf.roundedRect(10, currentY, perfWidth, barHeight, 2, 2, 'F');
  
  // Performance text
  pdf.setTextColor(255, 255, 255);
  pdf.setFontSize(10);
  pdf.setFont('helvetica', 'bold');
  pdf.text(`${performance.toFixed(0)}%`, 10 + perfWidth - 15, currentY + 10);
  
  // Scale markers
  pdf.setTextColor(100, 100, 100);
  pdf.setFontSize(8);
  pdf.text('0', 8, currentY + barHeight + 8);
  pdf.text('50', 10 + barWidth/2 - 5, currentY + barHeight + 8);
  pdf.text('100', 10 + barWidth - 10, currentY + barHeight + 8);
  
  pdf.setTextColor(0, 0, 0);
  currentY += barHeight + 15;
  
  // Key insights table
  const insights = [
    ['Key Metric', 'Value', 'Trend'],
    ['Plant P/L', `Rs ${Math.abs(data.summary.totalPlantSavingLakhs).toFixed(1)} L`, data.summary.savingPMT >= 0 ? '↑' : '↓'],
    ['Variable Cost %', `${((data.variableCosts.total / data.summary.totalCostPMT) * 100).toFixed(0)}%`, '→'],
    ['Efficiency', `${((data.productionData.dispatch / data.productionData.machineProduction) * 100).toFixed(0)}%`, '↑']
  ];
  
  autoTable(pdf, {
    head: [insights[0]],
    body: insights.slice(1),
    startY: currentY,
    theme: 'grid',
    headStyles: {
      fillColor: [41, 98, 255],
      textColor: [255, 255, 255]
    },
    bodyStyles: {
      fontSize: 10
    },
    columnStyles: {
      0: { cellWidth: 60 },
      1: { cellWidth: 60, halign: 'right' },
      2: { cellWidth: 20, halign: 'center' }
    },
    didDrawCell: (data: any) => {
      if (data.column.index === 2 && data.row.section === 'body') {
        const trend = data.cell.text[0];
        if (trend === '↑') {
          pdf.setTextColor(52, 168, 83);
        } else if (trend === '↓') {
          pdf.setTextColor(234, 67, 53);
        } else {
          pdf.setTextColor(251, 188, 4);
        }
      }
    }
  });
  
  return (pdf as any).lastAutoTable.finalY || currentY + 50;
}

function addProductionAnalysis(pdf: jsPDF, data: CostAnalysisData, startY: number): number {
  let currentY = startY;
  
  pdf.setFontSize(16);
  pdf.setFont('helvetica', 'bold');
  pdf.text('Production Flow Analysis', 10, currentY);
  
  currentY += 10;
  
  // Visual flow diagram
  const stageWidth = 35;
  const stageHeight = 20;
  const stageSpacing = 8;
  const startX = 15;
  
  const stages = [
    { name: 'Machine\nProduction', value: data.productionData.machineProduction, color: [52, 168, 83] },
    { name: 'Finish\nProduction', value: data.productionData.finishProduction, color: [66, 133, 244] },
    { name: 'Transfer to\nWarehouse', value: data.productionData.transferToWarehouse, color: [251, 188, 4] },
    { name: 'Dispatch', value: data.productionData.dispatch, color: [234, 67, 53] }
  ];
  
  // Draw stages
  stages.forEach((stage, index) => {
    const x = startX + index * (stageWidth + stageSpacing);
    
    // Box
    pdf.setFillColor(stage.color[0], stage.color[1], stage.color[2]);
    pdf.roundedRect(x, currentY, stageWidth, stageHeight, 2, 2, 'F');
    
    // Text
    pdf.setTextColor(255, 255, 255);
    pdf.setFontSize(8);
    pdf.setFont('helvetica', 'normal');
    const lines = stage.name.split('\n');
    lines.forEach((line, i) => {
      pdf.text(line, x + stageWidth/2, currentY + 6 + i*4, { align: 'center' });
    });
    
    // Value
    pdf.setFontSize(10);
    pdf.setFont('helvetica', 'bold');
    pdf.text(stage.value.toFixed(0), x + stageWidth/2, currentY + 15, { align: 'center' });
    
    // Arrow
    if (index < stages.length - 1) {
      pdf.setTextColor(100, 100, 100);
      pdf.setFontSize(14);
      pdf.text('→', x + stageWidth + 2, currentY + stageHeight/2 + 2);
    }
  });
  
  pdf.setTextColor(0, 0, 0);
  currentY += stageHeight + 10;
  
  // Production flow data table
  const productionData = [
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
    head: [productionData[0]],
    body: productionData.slice(1),
    startY: currentY,
    theme: 'striped',
    headStyles: {
      fillColor: [52, 168, 83],
      textColor: [255, 255, 255]
    },
    columnStyles: {
      0: { cellWidth: 50 },
      1: { cellWidth: 40, halign: 'right' },
      2: { cellWidth: 30, halign: 'center' },
      3: { cellWidth: 40, halign: 'right' }
    }
  });
  
  return (pdf as any).lastAutoTable.finalY || currentY + 50;
}

function addCostBreakdown(pdf: jsPDF, data: CostAnalysisData, startY: number): number {
  let currentY = startY;
  
  pdf.setFontSize(16);
  pdf.setFont('helvetica', 'bold');
  pdf.text('Cost Structure Analysis', 10, currentY);
  
  currentY += 10;
  
  // Visual cost split bar
  const totalBarWidth = 180;
  const totalBarHeight = 15;
  const varPercent = (data.variableCosts.total / data.summary.totalCostPMT) * 100;
  const fixPercent = (data.fixedCosts.total / data.summary.totalCostPMT) * 100;
  
  // Variable vs Fixed visualization
  pdf.setFontSize(12);
  pdf.text('Cost Distribution', 10, currentY);
  currentY += 6;
  
  // Variable cost portion
  const varWidth = (varPercent / 100) * totalBarWidth;
  pdf.setFillColor(66, 133, 244);
  pdf.rect(10, currentY, varWidth, totalBarHeight, 'F');
  
  // Fixed cost portion
  pdf.setFillColor(234, 67, 53);
  pdf.rect(10 + varWidth, currentY, totalBarWidth - varWidth, totalBarHeight, 'F');
  
  // Labels
  pdf.setTextColor(255, 255, 255);
  pdf.setFontSize(10);
  pdf.setFont('helvetica', 'bold');
  if (varWidth > 40) {
    pdf.text(`Variable ${varPercent.toFixed(0)}%`, 10 + varWidth/2, currentY + 9, { align: 'center' });
  }
  if ((totalBarWidth - varWidth) > 40) {
    pdf.text(`Fixed ${fixPercent.toFixed(0)}%`, 10 + varWidth + (totalBarWidth - varWidth)/2, currentY + 9, { align: 'center' });
  }
  
  pdf.setTextColor(0, 0, 0);
  currentY += totalBarHeight + 10;
  
  // Add visual legend
  pdf.setFontSize(9);
  pdf.setFont('helvetica', 'normal');
  // Variable legend
  pdf.setFillColor(66, 133, 244);
  pdf.rect(10, currentY, 10, 5, 'F');
  pdf.text(`Variable: Rs ${data.variableCosts.total.toFixed(0)}/MT`, 22, currentY + 4);
  // Fixed legend
  pdf.setFillColor(234, 67, 53);
  pdf.rect(90, currentY, 10, 5, 'F');
  pdf.text(`Fixed: Rs ${data.fixedCosts.total.toFixed(0)}/MT`, 102, currentY + 4);
  
  currentY += 8;
  
  // Variable costs
  pdf.setFontSize(14);
  pdf.text('Variable Costs', 10, currentY);
  currentY += 8;
  
  const variableCostData = [
    ['Component', 'Rs/MT', '% of Total', 'Visual'],
    ['Fiber', data.variableCosts.fiber.toFixed(0), 
     ((data.variableCosts.fiber / data.summary.totalCostPMT) * 100).toFixed(1) + '%', 
     (data.variableCosts.fiber / data.variableCosts.total) * 100],
    ['Power', data.variableCosts.power.toFixed(0),
     ((data.variableCosts.power / data.summary.totalCostPMT) * 100).toFixed(1) + '%',
     (data.variableCosts.power / data.variableCosts.total) * 100],
    ['Gas', data.variableCosts.gas.toFixed(0),
     ((data.variableCosts.gas / data.summary.totalCostPMT) * 100).toFixed(1) + '%',
     (data.variableCosts.gas / data.variableCosts.total) * 100],
    ['Chemical', data.variableCosts.chemical.toFixed(0),
     ((data.variableCosts.chemical / data.summary.totalCostPMT) * 100).toFixed(1) + '%',
     (data.variableCosts.chemical / data.variableCosts.total) * 100],
    ['Water', data.variableCosts.water.toFixed(0),
     ((data.variableCosts.water / data.summary.totalCostPMT) * 100).toFixed(1) + '%',
     (data.variableCosts.water / data.variableCosts.total) * 100],
    ['Packing', data.variableCosts.packing.toFixed(0),
     ((data.variableCosts.packing / data.summary.totalCostPMT) * 100).toFixed(1) + '%',
     (data.variableCosts.packing / data.variableCosts.total) * 100],
    ['Steam', data.variableCosts.steam.toFixed(0),
     ((data.variableCosts.steam / data.summary.totalCostPMT) * 100).toFixed(1) + '%',
     (data.variableCosts.steam / data.variableCosts.total) * 100]
  ].filter(row => typeof row[1] === 'string' && parseFloat(row[1]) > 0);
  
  autoTable(pdf, {
    head: [variableCostData[0].slice(0, 3)],
    body: variableCostData.slice(1).map(row => row.slice(0, 3)),
    foot: [['Total Variable', data.variableCosts.total.toFixed(0), 
            ((data.variableCosts.total / data.summary.totalCostPMT) * 100).toFixed(1) + '%']],
    startY: currentY,
    theme: 'grid',
    headStyles: { fillColor: [66, 133, 244] },
    footStyles: { fillColor: [240, 240, 240], textColor: [0, 0, 0], fontStyle: 'bold' },
    didDrawCell: (data: any) => {
      // Draw mini bar chart for each cost component
      if (data.column.index === 2 && data.row.section === 'body') {
        const percent = variableCostData[data.row.index + 1][3] as number;
        const barWidth = 30;
        const barHeight = 8;
        const cellX = data.cell.x + data.cell.width + 5;
        const cellY = data.cell.y + (data.cell.height - barHeight) / 2;
        
        // Background
        pdf.setFillColor(230, 230, 230);
        pdf.rect(cellX, cellY, barWidth, barHeight, 'F');
        
        // Fill
        pdf.setFillColor(66, 133, 244);
        pdf.rect(cellX, cellY, (percent / 100) * barWidth, barHeight, 'F');
      }
    }
  });
  
  currentY = (pdf as any).lastAutoTable.finalY + 10;
  
  // Fixed costs
  pdf.setFontSize(14);
  pdf.text('Fixed Costs', 10, currentY);
  currentY += 8;
  
  const fixedCostData = [
    ['Component', 'Monthly', 'Rs/MT', '% of Total'],
    ['Salary & Contractor', 'Rs 90,00,000', data.fixedCosts.salaryAndContractor.toFixed(0),
     ((data.fixedCosts.salaryAndContractor / data.summary.totalCostPMT) * 100).toFixed(1) + '%'],
    ['Admin & Selling', 'Rs 25,00,000', data.fixedCosts.adminAndSellingExpenses.toFixed(0),
     ((data.fixedCosts.adminAndSellingExpenses / data.summary.totalCostPMT) * 100).toFixed(1) + '%'],
    ['Interest & Financial', 'Rs 2,00,00,000', data.fixedCosts.interestAndFinancialCharges.toFixed(0),
     ((data.fixedCosts.interestAndFinancialCharges / data.summary.totalCostPMT) * 100).toFixed(1) + '%']
  ];
  
  autoTable(pdf, {
    head: [fixedCostData[0]],
    body: fixedCostData.slice(1),
    foot: [['Total Fixed', '', data.fixedCosts.total.toFixed(0),
            ((data.fixedCosts.total / data.summary.totalCostPMT) * 100).toFixed(1) + '%']],
    startY: currentY,
    theme: 'grid',
    headStyles: { fillColor: [234, 67, 53] },
    footStyles: { fillColor: [240, 240, 240], textColor: [0, 0, 0], fontStyle: 'bold' }
  });
  
  return (pdf as any).lastAutoTable.finalY || currentY + 50;
}

function addCostSummary(pdf: jsPDF, data: CostAnalysisData, startY: number): number {
  let currentY = startY;
  
  pdf.setFontSize(14);
  pdf.setFont('helvetica', 'bold');
  pdf.text('Cost Summary', 10, currentY);
  
  currentY += 8;
  
  const summaryData = [
    ['Description', 'Value'],
    ['Total Variable Cost', `Rs ${data.variableCosts.total.toFixed(0)}/MT`],
    ['Total Fixed Cost', `Rs ${data.fixedCosts.total.toFixed(0)}/MT`],
    ['Total Cost', `Rs ${data.summary.totalCostPMT.toFixed(0)}/MT`],
    ['NSR (Net Sales Realization)', `Rs ${data.summary.nsrPMT.toFixed(0)}/MT`],
    [data.summary.savingPMT >= 0 ? 'Profit' : 'Loss', `Rs ${Math.abs(data.summary.savingPMT).toFixed(0)}/MT`]
  ];
  
  autoTable(pdf, {
    body: summaryData,
    startY: currentY,
    theme: 'plain',
    columnStyles: {
      0: { cellWidth: 80, fontStyle: 'bold' },
      1: { cellWidth: 60, halign: 'right' }
    }
  });
  
  return (pdf as any).lastAutoTable.finalY || currentY + 50;
}

function addDailyPerformance(pdf: jsPDF, costingData: CostingData[], startY: number): number {
  let currentY = startY;
  
  pdf.setFontSize(16);
  pdf.setFont('helvetica', 'bold');
  pdf.text('Daily Performance Analysis', 10, currentY);
  
  currentY += 10;
  
  // Visual performance indicator
  const avgProduction = costingData.reduce((sum, d) => sum + d.totalProduction, 0) / costingData.length;
  const avgCostPerTon = costingData.reduce((sum, d) => sum + (d.totalCost / d.totalProduction), 0) / costingData.length;
  const maxProduction = Math.max(...costingData.map(d => d.totalProduction));
  const minProduction = Math.min(...costingData.map(d => d.totalProduction));
  
  // Production range visual
  pdf.setFontSize(11);
  pdf.setFont('helvetica', 'normal');
  pdf.text('Production Range (MT/day)', 10, currentY);
  currentY += 6;
  
  const rangeWidth = 180;
  const rangeHeight = 10;
  const range = maxProduction - minProduction;
  const avgPosition = ((avgProduction - minProduction) / range) * rangeWidth;
  
  // Range bar
  pdf.setFillColor(230, 230, 230);
  pdf.rect(10, currentY, rangeWidth, rangeHeight, 'F');
  
  // Average marker
  pdf.setFillColor(66, 133, 244);
  pdf.rect(10 + avgPosition - 2, currentY - 2, 4, rangeHeight + 4, 'F');
  
  // Labels
  pdf.setFontSize(9);
  pdf.text(minProduction.toFixed(0), 8, currentY + rangeHeight + 8);
  pdf.text(maxProduction.toFixed(0), 10 + rangeWidth - 15, currentY + rangeHeight + 8);
  pdf.text(`Avg: ${avgProduction.toFixed(0)}`, 10 + avgPosition - 15, currentY - 5);
  
  currentY += rangeHeight + 10;
  
  // Statistics summary
  const statsData = [
    ['Metric', 'Production', 'Cost'],
    ['Average', `${avgProduction.toFixed(0)} MT`, `Rs ${avgCostPerTon.toFixed(0)}`],
    ['Maximum', `${maxProduction.toFixed(0)} MT`, `Rs ${Math.max(...costingData.map(d => d.totalCost / d.totalProduction)).toFixed(0)}`],
    ['Minimum', `${minProduction.toFixed(0)} MT`, `Rs ${Math.min(...costingData.map(d => d.totalCost / d.totalProduction)).toFixed(0)}`],
    ['Std Dev', `${(Math.sqrt(costingData.reduce((sum, d) => sum + Math.pow(d.totalProduction - avgProduction, 2), 0) / costingData.length)).toFixed(0)} MT`, '-']
  ];
  
  autoTable(pdf, {
    head: [statsData[0]],
    body: statsData.slice(1),
    startY: currentY,
    theme: 'grid',
    columnStyles: {
      0: { cellWidth: 40 },
      1: { cellWidth: 50, halign: 'center' },
      2: { cellWidth: 50, halign: 'center' }
    }
  });
  
  currentY = (pdf as any).lastAutoTable.finalY + 10;
  
  // Daily data table (limited to show structure)
  pdf.setFontSize(14);
  pdf.text('Daily Details', 10, currentY);
  currentY += 10;
  
  const dailyData = costingData
    .slice(0, 10) // Show only first 10 days to avoid overflow
    .map(day => [
      dayjs(day.date).format('DD-MM-YYYY'),
      day.totalProduction.toFixed(1),
      (day.totalCost / day.totalProduction).toFixed(0),
      (day.productionEfficiency || 95).toFixed(0) + '%',
      day.quality || 'Mixed'
    ]);
  
  autoTable(pdf, {
    head: [['Date', 'Production (MT)', 'Cost/MT (Rs)', 'Efficiency', 'Quality']],
    body: dailyData,
    startY: currentY,
    theme: 'striped',
    headStyles: { fillColor: [41, 98, 255] },
    columnStyles: {
      0: { cellWidth: 35 },
      1: { cellWidth: 35, halign: 'center' },
      2: { cellWidth: 35, halign: 'center' },
      3: { cellWidth: 30, halign: 'center' },
      4: { cellWidth: 35 }
    }
  });
  
  return (pdf as any).lastAutoTable.finalY || currentY + 100;
}

function addEfficiencyAnalysis(pdf: jsPDF, costingData: CostingData[], startY: number): number {
  let currentY = startY;
  
  pdf.setFontSize(16);
  pdf.setFont('helvetica', 'bold');
  pdf.text('Efficiency & Quality Analysis', 10, currentY);
  
  currentY += 10;
  
  // Visual efficiency gauge
  const avgEfficiency = costingData.reduce((sum, d) => sum + (d.productionEfficiency || 95), 0) / costingData.length;
  
  pdf.setFontSize(11);
  pdf.setFont('helvetica', 'normal');
  pdf.text('Overall Production Efficiency', 10, currentY);
  currentY += 8;
  
  // Efficiency gauge
  const gaugeWidth = 180;
  const gaugeHeight = 15;
  
  // Background segments
  const segments = [
    { start: 0, end: 0.6, color: [234, 67, 53] },   // 0-60%: Red
    { start: 0.6, end: 0.8, color: [251, 188, 4] }, // 60-80%: Yellow
    { start: 0.8, end: 1, color: [52, 168, 83] }    // 80-100%: Green
  ];
  
  segments.forEach(seg => {
    pdf.setFillColor(seg.color[0], seg.color[1], seg.color[2]);
    pdf.rect(10 + seg.start * gaugeWidth, currentY, (seg.end - seg.start) * gaugeWidth, gaugeHeight, 'F');
  });
  
  // Efficiency pointer
  const effPosition = (avgEfficiency / 100) * gaugeWidth;
  pdf.setFillColor(0, 0, 0);
  pdf.triangle(
    10 + effPosition, currentY + gaugeHeight,
    10 + effPosition - 5, currentY + gaugeHeight + 8,
    10 + effPosition + 5, currentY + gaugeHeight + 8,
    'F'
  );
  
  // Labels
  pdf.setFontSize(10);
  pdf.setFont('helvetica', 'bold');
  pdf.text(`${avgEfficiency.toFixed(1)}%`, 10 + effPosition, currentY + gaugeHeight + 14, { align: 'center' });
  
  pdf.setFontSize(8);
  pdf.setFont('helvetica', 'normal');
  pdf.text('60%', 10 + 0.6 * gaugeWidth - 10, currentY + gaugeHeight + 6);
  pdf.text('80%', 10 + 0.8 * gaugeWidth - 10, currentY + gaugeHeight + 6);
  
  currentY += gaugeHeight + 12;
  
  // Quality distribution
  const qualityMap = new Map<string, number>();
  costingData.forEach(day => {
    const quality = day.quality || 'Unknown';
    qualityMap.set(quality, (qualityMap.get(quality) || 0) + day.totalProduction);
  });
  
  const totalProduction = costingData.reduce((sum, d) => sum + d.totalProduction, 0);
  const qualityData = Array.from(qualityMap.entries())
    .map(([quality, production]) => [
      quality,
      production.toFixed(0) + ' MT',
      ((production / totalProduction) * 100).toFixed(1) + '%'
    ])
    .sort((a, b) => parseFloat(b[1]) - parseFloat(a[1]))
    .slice(0, 5);
  
  pdf.setFontSize(14);
  pdf.text('Quality Distribution', 10, currentY);
  currentY += 10;
  
  autoTable(pdf, {
    head: [['Quality', 'Production', 'Share %']],
    body: qualityData,
    startY: currentY,
    theme: 'grid',
    headStyles: { fillColor: [52, 168, 83] }
  });
  
  currentY = (pdf as any).lastAutoTable.finalY + 10;
  
  // Efficiency metrics
  const highEfficiencyDays = costingData.filter(d => (d.productionEfficiency || 95) >= 90).length;
  const lowEfficiencyDays = costingData.filter(d => (d.productionEfficiency || 95) < 80).length;
  
  pdf.setFontSize(14);
  pdf.text('Efficiency Metrics', 10, currentY);
  currentY += 10;
  
  const efficiencyData = [
    ['Metric', 'Value', 'Status'],
    ['Average Efficiency', `${avgEfficiency.toFixed(1)}%`, avgEfficiency >= 90 ? 'Excellent' : avgEfficiency >= 80 ? 'Good' : 'Needs Improvement'],
    ['High Efficiency Days (>90%)', `${highEfficiencyDays} days`, `${(highEfficiencyDays / costingData.length * 100).toFixed(0)}%`],
    ['Low Efficiency Days (<80%)', `${lowEfficiencyDays} days`, `${(lowEfficiencyDays / costingData.length * 100).toFixed(0)}%`],
    ['Target Achievement', avgEfficiency >= 90 ? 'Met' : 'Not Met', avgEfficiency >= 90 ? 'On Track' : 'Action Required']
  ];
  
  autoTable(pdf, {
    head: [efficiencyData[0]],
    body: efficiencyData.slice(1),
    startY: currentY,
    theme: 'grid',
    headStyles: { fillColor: [251, 188, 4] },
    didDrawCell: (data: any) => {
      if (data.column.index === 2 && data.row.section === 'body') {
        const status = data.cell.text[0];
        if (status === 'Excellent' || status === 'Met' || status === 'On Track') {
          pdf.setTextColor(52, 168, 83);
        } else if (status === 'Good' || status.includes('%')) {
          pdf.setTextColor(251, 188, 4);
        } else if (status === 'Needs Improvement' || status === 'Not Met' || status === 'Action Required') {
          pdf.setTextColor(234, 67, 53);
        }
      }
    }
  });
  
  return (pdf as any).lastAutoTable.finalY || currentY + 50;
}

function addFooterToAllPages(pdf: jsPDF) {
  const pageCount = pdf.getNumberOfPages();
  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  
  for (let i = 1; i <= pageCount; i++) {
    pdf.setPage(i);
    
    pdf.setDrawColor(200, 200, 200);
    pdf.line(10, pageHeight - 15, pageWidth - 10, pageHeight - 15);
    
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