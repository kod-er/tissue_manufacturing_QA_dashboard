import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Chart, registerables } from 'chart.js';
import { CostingData } from './parseCostingData';
import dayjs from 'dayjs';

Chart.register(...registerables);

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

export async function generateCostAnalysisPdfReport(
  costingData: CostingData[],
  monthYear: string,
  nsrPerTon: number = 90000
): Promise<Blob> {
  const pdf = new jsPDF('portrait', 'mm', 'a4');
  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  
  // Calculate analysis data
  const analysisData = calculateCostAnalysisData(costingData, monthYear, nsrPerTon);
  
  // Add header with company branding
  addReportHeader(pdf, analysisData.period);
  
  // Executive Summary
  addExecutiveSummary(pdf, analysisData);
  
  // Production Overview Section
  addProductionOverview(pdf, analysisData);
  
  // Cost Breakdown Visual
  await addCostBreakdownChart(pdf, analysisData);
  
  // Add new page for detailed analysis
  pdf.addPage();
  
  // Variable Costs Analysis
  addVariableCostsAnalysis(pdf, analysisData);
  
  // Fixed Costs Analysis
  addFixedCostsAnalysis(pdf, analysisData);
  
  // Add new page for trends
  pdf.addPage();
  
  // Daily Trends Analysis
  await addDailyTrendsAnalysis(pdf, costingData);
  
  // Efficiency Metrics
  addEfficiencyMetrics(pdf, costingData);
  
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
  
  const avgMaintenanceCost = costingData.reduce((sum, d) => sum + (d.maintenanceCost / d.totalProduction), 0) / costingData.length;
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
      value: `₹${data.summary.totalCostPMT.toFixed(0)}`,
      color: [66, 133, 244] as [number, number, number]
    },
    {
      title: data.summary.savingPMT >= 0 ? 'Profit per MT' : 'Loss per MT',
      value: `₹${Math.abs(data.summary.savingPMT).toFixed(0)}`,
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
  
  const insights = [
    `• Total plant ${data.summary.savingPMT >= 0 ? 'profit' : 'loss'}: ₹${Math.abs(data.summary.totalPlantSavingLakhs).toFixed(2)} lakhs`,
    `• Variable costs constitute ${((data.variableCosts.total / data.summary.totalCostPMT) * 100).toFixed(1)}% of total costs`,
    `• Fiber is the largest cost component at ₹${data.variableCosts.fiber.toFixed(0)}/MT (${((data.variableCosts.fiber / data.summary.totalCostPMT) * 100).toFixed(1)}%)`,
    `• Production efficiency: ${((data.productionData.dispatch / data.productionData.machineProduction) * 100).toFixed(1)}% dispatch rate`
  ];
  
  insights.forEach(insight => {
    pdf.text(insight, 10, yPosition);
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

async function addCostBreakdownChart(pdf: jsPDF, data: CostAnalysisData) {
  // Skip chart generation if running in a non-browser environment
  if (typeof document === 'undefined') {
    return;
  }
  
  try {
    const canvas = document.createElement('canvas');
    canvas.width = 600;
    canvas.height = 400;
    
    // Add canvas to document body temporarily (hidden)
    canvas.style.display = 'none';
    document.body.appendChild(canvas);
    
    const costData = [
      { name: 'Fiber', value: data.variableCosts.fiber, type: 'Variable' },
      { name: 'Power', value: data.variableCosts.power, type: 'Variable' },
      { name: 'Interest', value: data.fixedCosts.interestAndFinancialCharges, type: 'Fixed' },
      { name: 'Gas', value: data.variableCosts.gas, type: 'Variable' },
      { name: 'Salary', value: data.fixedCosts.salaryAndContractor, type: 'Fixed' },
      { name: 'Chemical', value: data.variableCosts.chemical, type: 'Variable' },
      { name: 'Water', value: data.variableCosts.water, type: 'Variable' },
      { name: 'Admin', value: data.fixedCosts.adminAndSellingExpenses, type: 'Fixed' },
      { name: 'Packing', value: data.variableCosts.packing, type: 'Variable' },
      { name: 'Steam', value: data.variableCosts.steam, type: 'Variable' }
    ].sort((a, b) => b.value - a.value);
    
    const chart = new Chart(canvas, {
      type: 'doughnut',
      data: {
        labels: costData.map(d => d.name),
        datasets: [{
          data: costData.map(d => d.value),
          backgroundColor: costData.map(d => 
            d.type === 'Variable' 
              ? `rgba(66, 133, 244, ${0.5 + (d.value / data.summary.totalCostPMT) * 0.5})`
              : `rgba(234, 67, 53, ${0.5 + (d.value / data.summary.totalCostPMT) * 0.5})`
          ),
          borderColor: costData.map(d => 
            d.type === 'Variable' ? 'rgba(66, 133, 244, 1)' : 'rgba(234, 67, 53, 1)'
          ),
          borderWidth: 2
        }]
      },
      options: {
        responsive: false,
        maintainAspectRatio: false,
        animation: {
          duration: 0 // Disable animation for immediate rendering
        },
        plugins: {
          title: {
            display: true,
            text: 'Cost Breakdown per MT',
            font: {
              size: 18,
              weight: 'bold'
            }
          },
          legend: {
            position: 'right',
            labels: {
              padding: 12,
              font: {
                size: 11
              },
              generateLabels: (chart) => {
                const data = chart.data;
                return data.labels!.map((label, i) => ({
                  text: `${label}: ₹${costData[i].value.toFixed(0)}`,
                  fillStyle: (data.datasets[0].backgroundColor as string[])[i],
                  strokeStyle: (data.datasets[0].borderColor as string[])[i],
                  lineWidth: 2,
                  hidden: false,
                  index: i
                }));
              }
            }
          },
          tooltip: {
            callbacks: {
              label: (context) => {
                const value = context.parsed;
                const percentage = ((value / data.summary.totalCostPMT) * 100).toFixed(1);
                return `${context.label}: ₹${value.toFixed(0)} (${percentage}%)`;
              }
            }
          }
        }
      }
    });
    
    // Force chart render and wait
    chart.render();
    await new Promise(resolve => setTimeout(resolve, 100));
    
    // Get image data
    const imgData = canvas.toDataURL('image/png');
    
    // Clean up
    chart.destroy();
    document.body.removeChild(canvas);
    
    // Add chart to PDF
    if (imgData && imgData !== 'data:,') {
      pdf.addImage(imgData, 'PNG', 10, 180, 190, 100);
    }
  } catch (error) {
    console.error('Error generating cost breakdown chart:', error);
    // Continue without the chart
  }
}

function addVariableCostsAnalysis(pdf: jsPDF, data: CostAnalysisData) {
  let yPosition = 20;
  
  pdf.setFontSize(16);
  pdf.setFont('helvetica', 'bold');
  pdf.text('Variable Costs Analysis', 10, yPosition);
  
  yPosition += 10;
  
  const variableCosts = [
    ['Cost Component', 'Amount (₹/MT)', '% of Variable', '% of Total'],
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
    ['Cost Component', 'Monthly Amount', 'Amount (₹/MT)', '% of Total'],
    ['Salary & Contractor', '₹90,00,000', data.fixedCosts.salaryAndContractor.toFixed(0),
     ((data.fixedCosts.salaryAndContractor / data.summary.totalCostPMT) * 100).toFixed(1) + '%'],
    ['Admin & Selling', '₹25,00,000', data.fixedCosts.adminAndSellingExpenses.toFixed(0),
     ((data.fixedCosts.adminAndSellingExpenses / data.summary.totalCostPMT) * 100).toFixed(1) + '%'],
    ['Interest & Financial', '₹2,00,00,000', data.fixedCosts.interestAndFinancialCharges.toFixed(0),
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

async function addDailyTrendsAnalysis(pdf: jsPDF, costingData: CostingData[]) {
  let yPosition = 20;
  
  pdf.setFontSize(16);
  pdf.setFont('helvetica', 'bold');
  pdf.text('Daily Production & Cost Trends', 10, yPosition);
  
  yPosition += 10;
  
  try {
    // Skip chart if no data or in non-browser environment
    if (!costingData.length || typeof document === 'undefined') {
      yPosition += 70;
    } else {
      // Create line chart for daily trends
      const canvas = document.createElement('canvas');
      canvas.width = 800;
      canvas.height = 300;
      canvas.style.display = 'none';
      document.body.appendChild(canvas);
      
      const sortedData = [...costingData].sort((a, b) => a.date.localeCompare(b.date));
      
      const chart = new Chart(canvas, {
        type: 'line',
        data: {
          labels: sortedData.map(d => dayjs(d.date).format('DD MMM')),
          datasets: [
            {
              label: 'Production (MT)',
              data: sortedData.map(d => d.totalProduction),
              borderColor: 'rgb(52, 168, 83)',
              backgroundColor: 'rgba(52, 168, 83, 0.1)',
              yAxisID: 'y',
              tension: 0.4
            },
            {
              label: 'Cost per MT (₹)',
              data: sortedData.map(d => d.totalCost / d.totalProduction),
              borderColor: 'rgb(234, 67, 53)',
              backgroundColor: 'rgba(234, 67, 53, 0.1)',
              yAxisID: 'y1',
              tension: 0.4
            }
          ]
        },
        options: {
          responsive: false,
          maintainAspectRatio: false,
          animation: {
            duration: 0
          },
          plugins: {
            title: {
              display: true,
              text: 'Daily Production vs Cost Trend',
              font: {
                size: 14
              }
            },
            legend: {
              position: 'top'
            }
          },
          scales: {
            y: {
              type: 'linear',
              display: true,
              position: 'left',
              title: {
                display: true,
                text: 'Production (MT)'
              }
            },
            y1: {
              type: 'linear',
              display: true,
              position: 'right',
              title: {
                display: true,
                text: 'Cost per MT (₹)'
              },
              grid: {
                drawOnChartArea: false
              }
            }
          }
        }
      });
      
      // Force render and wait
      chart.render();
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // Get image data
      const imgData = canvas.toDataURL('image/png');
      
      // Clean up
      chart.destroy();
      document.body.removeChild(canvas);
      
      // Add chart to PDF
      if (imgData && imgData !== 'data:,') {
        pdf.addImage(imgData, 'PNG', 10, yPosition, 190, 70);
      }
      
      yPosition += 80;
    }
  } catch (error) {
    console.error('Error generating trends chart:', error);
    yPosition += 80;
  }
  
  // Add summary statistics
  const avgProduction = costingData.reduce((sum, d) => sum + d.totalProduction, 0) / costingData.length;
  const avgCostPerTon = costingData.reduce((sum, d) => sum + (d.totalCost / d.totalProduction), 0) / costingData.length;
  const maxProduction = Math.max(...costingData.map(d => d.totalProduction));
  const minProduction = Math.min(...costingData.map(d => d.totalProduction));
  
  pdf.setFontSize(11);
  pdf.setFont('helvetica', 'normal');
  
  const stats = [
    `Average Daily Production: ${avgProduction.toFixed(2)} MT`,
    `Average Cost per MT: ₹${avgCostPerTon.toFixed(0)}`,
    `Production Range: ${minProduction.toFixed(2)} - ${maxProduction.toFixed(2)} MT`,
    `Production Variance: ${((maxProduction - minProduction) / avgProduction * 100).toFixed(1)}%`
  ];
  
  stats.forEach(stat => {
    pdf.text(`• ${stat}`, 15, yPosition);
    yPosition += 6;
  });
}

function addEfficiencyMetrics(pdf: jsPDF, costingData: CostingData[]) {
  let yPosition = 140;
  
  pdf.setFontSize(16);
  pdf.setFont('helvetica', 'bold');
  pdf.text('Efficiency & Performance Metrics', 10, yPosition);
  
  yPosition += 10;
  
  // Calculate efficiency metrics
  const avgEfficiency = costingData.reduce((sum, d) => sum + (d.productionEfficiency || 0), 0) / costingData.length;
  const totalTimeLoss = costingData.reduce((sum, d) => sum + (d.totalTimeLoss || 0), 0);
  const avgTimeLossPerDay = totalTimeLoss / costingData.length;
  
  // Department-wise time loss analysis
  const departmentLoss = new Map<string, number>();
  costingData.forEach(day => {
    day.productionLosses?.forEach(loss => {
      departmentLoss.set(loss.department, (departmentLoss.get(loss.department) || 0) + loss.timeLoss);
    });
  });
  
  const topDepartments = Array.from(departmentLoss.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);
  
  // Create efficiency table
  const efficiencyData = [
    ['Metric', 'Value', 'Status'],
    ['Average Production Efficiency', `${avgEfficiency.toFixed(1)}%`, 
     avgEfficiency >= 90 ? 'Good' : avgEfficiency >= 80 ? 'Fair' : 'Needs Improvement'],
    ['Total Time Loss (Hours)', totalTimeLoss.toFixed(1), 
     totalTimeLoss <= 100 ? 'Good' : totalTimeLoss <= 200 ? 'Fair' : 'High'],
    ['Average Daily Time Loss', `${avgTimeLossPerDay.toFixed(1)} hrs`, 
     avgTimeLossPerDay <= 3 ? 'Good' : avgTimeLossPerDay <= 6 ? 'Fair' : 'High'],
    ['Days with >90% Efficiency', 
     costingData.filter(d => (d.productionEfficiency || 0) >= 90).length.toString(),
     'Target: ' + Math.round(costingData.length * 0.8)]
  ];
  
  autoTable(pdf, {
    head: [efficiencyData[0]],
    body: efficiencyData.slice(1),
    startY: yPosition,
    theme: 'striped',
    headStyles: {
      fillColor: [52, 168, 83],
      textColor: [255, 255, 255]
    },
    columnStyles: {
      0: { cellWidth: 80 },
      1: { cellWidth: 50, halign: 'center' },
      2: { cellWidth: 50, halign: 'center' }
    },
    didDrawCell: (data: any) => {
      if (data.column.index === 2 && data.row.index !== undefined && data.row.index >= 0) {
        const status = data.cell.text[0];
        if (status === 'Good') {
          pdf.setTextColor(52, 168, 83);
        } else if (status === 'Fair') {
          pdf.setTextColor(251, 188, 4);
        } else if (status === 'High' || status === 'Needs Improvement') {
          pdf.setTextColor(234, 67, 53);
        }
      }
    }
  });
  
  // Add department-wise time loss if available
  if (topDepartments.length > 0) {
    yPosition = 230;
    pdf.setFontSize(14);
    pdf.setFont('helvetica', 'bold');
    pdf.text('Top Time Loss Departments', 10, yPosition);
    
    yPosition += 8;
    pdf.setFontSize(10);
    pdf.setFont('helvetica', 'normal');
    
    topDepartments.forEach((dept, index) => {
      const percentage = (dept[1] / totalTimeLoss * 100).toFixed(1);
      pdf.text(`${index + 1}. ${dept[0]}: ${dept[1].toFixed(1)} hrs (${percentage}%)`, 15, yPosition);
      yPosition += 5;
    });
  }
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