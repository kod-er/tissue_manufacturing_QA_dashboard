import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import dayjs from 'dayjs';
import { QualityData } from '../types';

interface ReportOptions {
  data: QualityData;
  historicalData?: QualityData[];
  companyName?: string;
  logoUrl?: string;
  includeCharts?: boolean;
}

export const generatePDFReport = async (options: ReportOptions): Promise<void> => {
  const { data, historicalData = [], companyName = 'Gayatri Shakti', logoUrl = '/gayatrishakti_logo-curve-02.png', includeCharts = true } = options;
  
  // Create new PDF document
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 15;
  let yPosition = margin;

  // Helper function to check if we need a new page
  const checkNewPage = (requiredSpace: number) => {
    if (yPosition + requiredSpace > pageHeight - margin) {
      doc.addPage();
      yPosition = margin;
      return true;
    }
    return false;
  };

  // Header with logo and company name
  try {
    const img = new Image();
    img.src = logoUrl;
    await new Promise((resolve) => {
      img.onload = resolve;
      img.onerror = resolve; // Continue even if logo fails
    });
    
    if (img.complete && img.naturalHeight !== 0) {
      const imgWidth = 40;
      const imgHeight = (img.naturalHeight / img.naturalWidth) * imgWidth;
      doc.addImage(img, 'PNG', margin, yPosition, imgWidth, imgHeight);
      yPosition += imgHeight + 5;
    }
  } catch (error) {
    console.error('Error loading logo:', error);
  }

  // Title
  doc.setFontSize(24);
  doc.setFont('helvetica', 'bold');
  doc.text('Quality Assurance Report', pageWidth / 2, yPosition + 10, { align: 'center' });
  yPosition += 20;

  // Date and company name
  doc.setFontSize(14);
  doc.setFont('helvetica', 'normal');
  doc.text(companyName, pageWidth / 2, yPosition, { align: 'center' });
  yPosition += 10;

  doc.setFontSize(12);
  doc.text(`Date: ${dayjs(data.date).format('MMMM DD, YYYY')}`, pageWidth / 2, yPosition, { align: 'center' });
  yPosition += 15;

  // Production Information Section
  if (data.shift || data.lotNo || data.labExecutive) {
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.text('Production Information', margin, yPosition);
    yPosition += 10;

    doc.setFontSize(11);
    doc.setFont('helvetica', 'normal');
    
    const productionInfo = [
      ['Date', dayjs(data.date).format('MMMM DD, YYYY')],
      ['Time', data.time || 'N/A'],
      ['Shift', data.shift || 'N/A'],
      ['Lab Executive', data.labExecutive || 'N/A'],
      ['Machine Shift Incharge', data.machineShiftIncharge || 'N/A'],
      ['Lot Number', data.lotNo || 'N/A'],
      ['Roll Number', data.rollNo || 'N/A'],
      ['Spool Number', data.spoolNo || 'N/A'],
      ['Quality Grade', data.quality || 'N/A']
    ].filter(([_, value]) => value !== 'N/A');

    autoTable(doc, {
      startY: yPosition,
      head: [['Parameter', 'Value']],
      body: productionInfo,
      theme: 'grid',
      headStyles: { fillColor: [41, 128, 185] },
      margin: { left: margin, right: margin },
      columnStyles: {
        0: { cellWidth: 60 },
        1: { cellWidth: 'auto' }
      }
    });

    yPosition = (doc as any).lastAutoTable.finalY + 10;
  }

  // Quality Metrics Section
  checkNewPage(50);
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.text('Quality Metrics', margin, yPosition);
  yPosition += 10;

  const qualityMetrics = [
    ['Parameter', 'Value', 'LCL', 'UCL', 'Status'],
    ['GSM (g/m²)', data.gsm.toFixed(2), data.gsmLcl.toFixed(2), data.gsmUcl.toFixed(2), 
     data.gsm >= data.gsmLcl && data.gsm <= data.gsmUcl ? '✓ Pass' : '✗ Fail'],
    ['Thickness (µm)', data.thickness.toFixed(2), data.thicknessLcl.toFixed(2), data.thicknessUcl.toFixed(2),
     data.thickness >= data.thicknessLcl && data.thickness <= data.thicknessUcl ? '✓ Pass' : '✗ Fail'],
    ['Bulk (cc/g)', data.bulk.toFixed(2), data.bulkLcl.toFixed(2), data.bulkUcl.toFixed(2),
     data.bulk >= data.bulkLcl && data.bulk <= data.bulkUcl ? '✓ Pass' : '✗ Fail'],
    ['Tensile MD (N/m)', data.tensileStrengthMD.toFixed(2), data.tensileStrengthMDLcl.toFixed(2), data.tensileStrengthMDUcl.toFixed(2),
     data.tensileStrengthMD >= data.tensileStrengthMDLcl && data.tensileStrengthMD <= data.tensileStrengthMDUcl ? '✓ Pass' : '✗ Fail'],
    ['Tensile CD (N/m)', data.tensileStrengthCD.toFixed(2), data.tensileStrengthCDLcl.toFixed(2), data.tensileStrengthCDUcl.toFixed(2),
     data.tensileStrengthCD >= data.tensileStrengthCDLcl && data.tensileStrengthCD <= data.tensileStrengthCDUcl ? '✓ Pass' : '✗ Fail'],
    ['Brightness (%)', data.brightness.toFixed(2), data.brightnessLcl.toFixed(2), data.brightnessUcl.toFixed(2),
     data.brightness >= data.brightnessLcl && data.brightness <= data.brightnessUcl ? '✓ Pass' : '✗ Fail'],
    ['Moisture (%)', data.moistureContent.toFixed(2), data.moistureContentLcl.toFixed(2), data.moistureContentUcl.toFixed(2),
     data.moistureContent >= data.moistureContentLcl && data.moistureContent <= data.moistureContentUcl ? '✓ Pass' : '✗ Fail'],
  ];

  // Add optional metrics if available
  if (data.opacity) {
    qualityMetrics.push(['Opacity (%)', data.opacity.toFixed(2), 
      data.opacityLcl?.toFixed(2) || 'N/A', 
      data.opacityUcl?.toFixed(2) || 'N/A',
      data.opacityLcl && data.opacityUcl && data.opacity >= data.opacityLcl && data.opacity <= data.opacityUcl ? '✓ Pass' : '✗ Fail'
    ]);
  }

  autoTable(doc, {
    startY: yPosition,
    head: [qualityMetrics[0]],
    body: qualityMetrics.slice(1),
    theme: 'grid',
    headStyles: { fillColor: [41, 128, 185] },
    margin: { left: margin, right: margin },
    columnStyles: {
      4: { 
        cellWidth: 20,
        halign: 'center'
      }
    },
    didDrawCell: (data) => {
      // Color code the status column
      if (data.column.index === 4 && data.row.section === 'body') {
        const text = data.cell.text[0];
        if (text.includes('Pass')) {
          doc.setTextColor(0, 128, 0);
        } else if (text.includes('Fail')) {
          doc.setTextColor(255, 0, 0);
        }
      }
    }
  });

  yPosition = (doc as any).lastAutoTable.finalY + 10;

  // Additional Metrics Section
  if (data.mdCdRatio || data.stretchElongation || data.wetTensile) {
    checkNewPage(50);
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(0, 0, 0);
    doc.text('Additional Strength Metrics', margin, yPosition);
    yPosition += 10;

    const additionalMetrics = [];
    if (data.mdCdRatio) additionalMetrics.push(['MD/CD Ratio', data.mdCdRatio.toFixed(2)]);
    if (data.stretchElongation) additionalMetrics.push(['Stretch/Elongation (%)', data.stretchElongation.toFixed(2)]);
    if (data.wetTensile) additionalMetrics.push(['Wet Tensile (gf/50mm)', data.wetTensile.toFixed(2)]);
    if (data.wetDryTensileRatio) additionalMetrics.push(['Wet/Dry Tensile (%)', data.wetDryTensileRatio.toFixed(2)]);
    if (data.grossMeanStrength) additionalMetrics.push(['Gross Mean Strength', data.grossMeanStrength.toFixed(2)]);
    if (data.machineCreepPercent) additionalMetrics.push(['Machine Creep (%)', data.machineCreepPercent.toFixed(2)]);

    if (additionalMetrics.length > 0) {
      autoTable(doc, {
        startY: yPosition,
        head: [['Parameter', 'Value']],
        body: additionalMetrics,
        theme: 'grid',
        headStyles: { fillColor: [52, 152, 219] },
        margin: { left: margin, right: margin }
      });
      yPosition = (doc as any).lastAutoTable.finalY + 10;
    }
  }

  // Machine Parameters Section
  if (data.machineSpeed || data.popeReelSpeed || data.coating) {
    checkNewPage(50);
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.text('Machine Parameters', margin, yPosition);
    yPosition += 10;

    const machineParams = [];
    if (data.machineSpeed) machineParams.push(['Machine Speed (Mpm)', data.machineSpeed.toFixed(2)]);
    if (data.popeReelSpeed) machineParams.push(['Pope Reel Speed (Mpm)', data.popeReelSpeed.toFixed(2)]);
    if (data.mcDraw) machineParams.push(['MC Draw', data.mcDraw.toFixed(2)]);
    if (data.blade) machineParams.push(['Blade', data.blade]);
    if (data.nextPressLoad) machineParams.push(['Press Load', data.nextPressLoad.toFixed(2)]);
    if (data.coating) machineParams.push(['Coating', data.coating.toFixed(2)]);
    if (data.coating1) machineParams.push(['Coating 2', data.coating1.toFixed(2)]);

    if (machineParams.length > 0) {
      autoTable(doc, {
        startY: yPosition,
        head: [['Parameter', 'Value']],
        body: machineParams,
        theme: 'grid',
        headStyles: { fillColor: [231, 76, 60] },
        margin: { left: margin, right: margin }
      });
      yPosition = (doc as any).lastAutoTable.finalY + 10;
    }
  }

  // Fiber Composition Section
  if (data.hwGrade || data.swGrade || data.shortFiberPercent) {
    checkNewPage(50);
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.text('Fiber Composition', margin, yPosition);
    yPosition += 10;

    const fiberData = [];
    if (data.hwGrade) fiberData.push(['HW Grade', data.hwGrade]);
    if (data.swGrade) fiberData.push(['SW Grade', data.swGrade]);
    if (data.shortFiberPercent) fiberData.push(['Short Fiber (%)', data.shortFiberPercent.toFixed(2)]);
    if (data.longFiberPercent) fiberData.push(['Long Fiber (%)', data.longFiberPercent.toFixed(2)]);
    if (data.brokePercent) fiberData.push(['Broke (%)', data.brokePercent.toFixed(2)]);
    if (data.wsrKgHrs) fiberData.push(['WSR (Kg/Hr)', data.wsrKgHrs.toFixed(2)]);
    if (data.dsrKgHrs) fiberData.push(['DSR (Kg/Hr)', data.dsrKgHrs.toFixed(2)]);

    if (fiberData.length > 0) {
      autoTable(doc, {
        startY: yPosition,
        head: [['Parameter', 'Value']],
        body: fiberData,
        theme: 'grid',
        headStyles: { fillColor: [46, 204, 113] },
        margin: { left: margin, right: margin }
      });
      yPosition = (doc as any).lastAutoTable.finalY + 10;
    }
  }

  // Remarks Section
  if (data.remarks || data.break) {
    checkNewPage(30);
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.text('Remarks & Observations', margin, yPosition);
    yPosition += 10;

    doc.setFontSize(11);
    doc.setFont('helvetica', 'normal');
    
    if (data.remarks) {
      doc.text(`Remarks: ${data.remarks}`, margin, yPosition, { maxWidth: pageWidth - 2 * margin });
      yPosition += 10;
    }
    
    if (data.break) {
      doc.text(`Break: ${data.break}`, margin, yPosition, { maxWidth: pageWidth - 2 * margin });
      yPosition += 10;
    }
  }

  // Charts Section with visual summaries
  if (includeCharts && historicalData && historicalData.length > 0) {
    // Quality Performance Summary
    checkNewPage(100);
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(0, 0, 0);
    doc.text('Quality Performance Summary', margin, yPosition);
    yPosition += 10;

    // Create a visual summary table with color coding
    const performanceData = [
      ['Parameter', 'Value', 'Target Range', 'Performance', 'Status'],
      ['GSM', `${data.gsm.toFixed(2)} g/m²`, `${data.gsmLcl.toFixed(2)} - ${data.gsmUcl.toFixed(2)}`, calculatePerformance(data.gsm, data.gsmLcl, data.gsmUcl), getStatus(data.gsm, data.gsmLcl, data.gsmUcl)],
      ['Thickness', `${data.thickness.toFixed(2)} μm`, `${data.thicknessLcl.toFixed(2)} - ${data.thicknessUcl.toFixed(2)}`, calculatePerformance(data.thickness, data.thicknessLcl, data.thicknessUcl), getStatus(data.thickness, data.thicknessLcl, data.thicknessUcl)],
      ['Bulk', `${data.bulk.toFixed(2)} cc/g`, `${data.bulkLcl.toFixed(2)} - ${data.bulkUcl.toFixed(2)}`, calculatePerformance(data.bulk, data.bulkLcl, data.bulkUcl), getStatus(data.bulk, data.bulkLcl, data.bulkUcl)],
      ['Tensile MD', `${data.tensileStrengthMD.toFixed(2)} N/m`, `${data.tensileStrengthMDLcl.toFixed(2)} - ${data.tensileStrengthMDUcl.toFixed(2)}`, calculatePerformance(data.tensileStrengthMD, data.tensileStrengthMDLcl, data.tensileStrengthMDUcl), getStatus(data.tensileStrengthMD, data.tensileStrengthMDLcl, data.tensileStrengthMDUcl)],
      ['Tensile CD', `${data.tensileStrengthCD.toFixed(2)} N/m`, `${data.tensileStrengthCDLcl.toFixed(2)} - ${data.tensileStrengthCDUcl.toFixed(2)}`, calculatePerformance(data.tensileStrengthCD, data.tensileStrengthCDLcl, data.tensileStrengthCDUcl), getStatus(data.tensileStrengthCD, data.tensileStrengthCDLcl, data.tensileStrengthCDUcl)],
      ['Brightness', `${data.brightness.toFixed(2)} %`, `${data.brightnessLcl.toFixed(2)} - ${data.brightnessUcl.toFixed(2)}`, calculatePerformance(data.brightness, data.brightnessLcl, data.brightnessUcl), getStatus(data.brightness, data.brightnessLcl, data.brightnessUcl)],
      ['Moisture', `${data.moistureContent.toFixed(2)} %`, `${data.moistureContentLcl.toFixed(2)} - ${data.moistureContentUcl.toFixed(2)}`, calculatePerformance(data.moistureContent, data.moistureContentLcl, data.moistureContentUcl), getStatus(data.moistureContent, data.moistureContentLcl, data.moistureContentUcl)]
    ];

    autoTable(doc, {
      startY: yPosition,
      head: [performanceData[0]],
      body: performanceData.slice(1),
      theme: 'grid',
      headStyles: { fillColor: [33, 150, 243] },
      margin: { left: margin, right: margin },
      columnStyles: {
        3: { halign: 'center' },
        4: { halign: 'center' }
      },
      didDrawCell: (data) => {
        // Color code the performance column
        if (data.column.index === 3 && data.row.section === 'body') {
          const performance = parseFloat(data.cell.text[0]);
          if (performance >= 90) {
            doc.setTextColor(0, 128, 0);
          } else if (performance >= 70) {
            doc.setTextColor(255, 152, 0);
          } else {
            doc.setTextColor(255, 0, 0);
          }
        }
        // Color code the status column
        if (data.column.index === 4 && data.row.section === 'body') {
          const text = data.cell.text[0];
          if (text === 'Excellent') {
            doc.setTextColor(0, 128, 0);
          } else if (text === 'Good') {
            doc.setTextColor(76, 175, 80);
          } else if (text === 'Fair') {
            doc.setTextColor(255, 152, 0);
          } else {
            doc.setTextColor(255, 0, 0);
          }
        }
      }
    });

    yPosition = (doc as any).lastAutoTable.finalY + 15;

    // Trend Summary
    if (historicalData.length > 1) {
      checkNewPage(80);
      doc.setFontSize(16);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(0, 0, 0);
      doc.text('7-Day Trend Summary', margin, yPosition);
      yPosition += 10;

      const trendSummary = calculateTrendSummary(historicalData.slice(0, 7));
      
      autoTable(doc, {
        startY: yPosition,
        head: [['Parameter', 'Current', '7-Day Avg', 'Trend', 'Variation']],
        body: trendSummary,
        theme: 'grid',
        headStyles: { fillColor: [255, 152, 0] },
        margin: { left: margin, right: margin },
        columnStyles: {
          3: { halign: 'center' },
          4: { halign: 'center' }
        }
      });

      yPosition = (doc as any).lastAutoTable.finalY + 10;
    }

    // Overall Quality Score
    checkNewPage(50);
    const overallScore = calculateOverallScore(data);
    
    doc.setFontSize(20);
    doc.setFont('helvetica', 'bold');
    
    if (overallScore >= 90) {
      doc.setTextColor(0, 128, 0);
    } else if (overallScore >= 70) {
      doc.setTextColor(255, 152, 0);
    } else {
      doc.setTextColor(255, 0, 0);
    }
    
    doc.text(`Overall Quality Score: ${overallScore.toFixed(1)}%`, pageWidth / 2, yPosition, { align: 'center' });
    yPosition += 15;
  }

  // Visualizations Section
  if (includeCharts) {
    // Page for visualizations
    doc.addPage();
    yPosition = margin;
    
    doc.setFontSize(20);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(0, 0, 0);
    doc.text('Quality Metrics Visualizations', pageWidth / 2, yPosition, { align: 'center' });
    yPosition += 15;

    // 1. Quality Metrics Bar Chart
    const barChartData = prepareBarChartData(data);
    const barChartHeight = 80;
    
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('Quality Parameters Performance', margin, yPosition);
    yPosition += 5;
    
    drawBarChart(doc, barChartData, margin, yPosition, pageWidth - 2 * margin, barChartHeight);
    yPosition += barChartHeight + 20;

    // 2. Performance Gauge
    checkNewPage(120); // Need 120mm for gauge chart section
    
    const overallScore = calculateOverallScore(data);
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('Overall Quality Score', margin, yPosition);
    yPosition += 5;
    
    drawGaugeChart(doc, overallScore, pageWidth / 2, yPosition + 40, 30);
    yPosition += 100;

    // 3. Trend Chart (if historical data available)
    if (historicalData && historicalData.length > 1) {
      checkNewPage(90); // Need 90mm for trend chart section
      
      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.text('7-Day Quality Trend', margin, yPosition);
      yPosition += 5;
      
      const trendData = prepareTrendData(historicalData.slice(0, 7));
      drawLineChart(doc, trendData, margin, yPosition, pageWidth - 2 * margin, 60);
      yPosition += 80;
    }

    // 4. Radar Chart for Multi-Parameter Overview
    if (data.gsm && data.thickness && data.bulk && data.brightness && data.moistureContent) {
      checkNewPage(100); // Need 100mm for radar chart section
      
      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.text('Quality Parameters Overview', margin, yPosition);
      yPosition += 5;
      
      const radarData = prepareRadarData(data);
      drawRadarChart(doc, radarData, pageWidth / 2, yPosition + 40, 40);
      yPosition += 90;
    }
  }

  // Footer
  doc.setFontSize(10);
  doc.setFont('helvetica', 'italic');
  doc.setTextColor(128, 128, 128);
  const footerText = `Generated on ${dayjs().format('MMMM DD, YYYY HH:mm')}`;
  doc.text(footerText, pageWidth / 2, pageHeight - 10, { align: 'center' });

  // Save the PDF
  doc.save(`QA_Report_${dayjs(data.date).format('YYYY-MM-DD')}.pdf`);
};

// Helper functions for performance calculations
function calculatePerformance(value: number, lcl: number, ucl: number): string {
  const range = ucl - lcl;
  const midpoint = (ucl + lcl) / 2;
  const deviation = Math.abs(value - midpoint);
  const maxDeviation = range / 2;
  const performance = Math.max(0, (1 - deviation / maxDeviation) * 100);
  return `${performance.toFixed(1)}%`;
}

function getStatus(value: number, lcl: number, ucl: number): string {
  if (value < lcl || value > ucl) return 'Out of Spec';
  
  const range = ucl - lcl;
  const midpoint = (ucl + lcl) / 2;
  const deviation = Math.abs(value - midpoint);
  const maxDeviation = range / 2;
  const performance = (1 - deviation / maxDeviation) * 100;
  
  if (performance >= 90) return 'Excellent';
  if (performance >= 75) return 'Good';
  if (performance >= 60) return 'Fair';
  return 'Poor';
}

function calculateTrendSummary(data: QualityData[]): string[][] {
  const current = data[data.length - 1];
  const parameters = [
    { name: 'GSM', key: 'gsm', unit: 'g/m²' },
    { name: 'Thickness', key: 'thickness', unit: 'μm' },
    { name: 'Bulk', key: 'bulk', unit: 'cc/g' },
    { name: 'Brightness', key: 'brightness', unit: '%' },
    { name: 'Moisture', key: 'moistureContent', unit: '%' }
  ];

  return parameters.map(param => {
    const values = data.map(d => d[param.key as keyof QualityData] as number);
    const currentValue = current[param.key as keyof QualityData] as number;
    const avg = values.reduce((a, b) => a + b, 0) / values.length;
    const trend = currentValue > avg ? '↑' : currentValue < avg ? '↓' : '→';
    const variation = ((Math.max(...values) - Math.min(...values)) / avg * 100).toFixed(1);
    
    return [
      param.name,
      `${currentValue.toFixed(2)} ${param.unit}`,
      `${avg.toFixed(2)} ${param.unit}`,
      trend,
      `${variation}%`
    ];
  });
}

function calculateOverallScore(data: QualityData): number {
  const parameters = [
    { value: data.gsm, lcl: data.gsmLcl, ucl: data.gsmUcl },
    { value: data.thickness, lcl: data.thicknessLcl, ucl: data.thicknessUcl },
    { value: data.bulk, lcl: data.bulkLcl, ucl: data.bulkUcl },
    { value: data.tensileStrengthMD, lcl: data.tensileStrengthMDLcl, ucl: data.tensileStrengthMDUcl },
    { value: data.tensileStrengthCD, lcl: data.tensileStrengthCDLcl, ucl: data.tensileStrengthCDUcl },
    { value: data.brightness, lcl: data.brightnessLcl, ucl: data.brightnessUcl },
    { value: data.moistureContent, lcl: data.moistureContentLcl, ucl: data.moistureContentUcl }
  ];

  const scores = parameters.map(p => {
    if (p.value < p.lcl || p.value > p.ucl) return 0;
    
    const range = p.ucl - p.lcl;
    const midpoint = (p.ucl + p.lcl) / 2;
    const deviation = Math.abs(p.value - midpoint);
    const maxDeviation = range / 2;
    return Math.max(0, (1 - deviation / maxDeviation) * 100);
  });

  return scores.reduce((a, b) => a + b, 0) / scores.length;
}

// Chart Drawing Functions

interface BarChartData {
  label: string;
  value: number;
  target: number;
  isInSpec: boolean;
}

function prepareBarChartData(data: QualityData): BarChartData[] {
  return [
    {
      label: 'GSM',
      value: data.gsm,
      target: (data.gsmLcl + data.gsmUcl) / 2,
      isInSpec: data.gsm >= data.gsmLcl && data.gsm <= data.gsmUcl
    },
    {
      label: 'Thickness',
      value: data.thickness,
      target: (data.thicknessLcl + data.thicknessUcl) / 2,
      isInSpec: data.thickness >= data.thicknessLcl && data.thickness <= data.thicknessUcl
    },
    {
      label: 'Bulk',
      value: data.bulk,
      target: (data.bulkLcl + data.bulkUcl) / 2,
      isInSpec: data.bulk >= data.bulkLcl && data.bulk <= data.bulkUcl
    },
    {
      label: 'Tensile MD',
      value: data.tensileStrengthMD,
      target: (data.tensileStrengthMDLcl + data.tensileStrengthMDUcl) / 2,
      isInSpec: data.tensileStrengthMD >= data.tensileStrengthMDLcl && data.tensileStrengthMD <= data.tensileStrengthMDUcl
    },
    {
      label: 'Tensile CD',
      value: data.tensileStrengthCD,
      target: (data.tensileStrengthCDLcl + data.tensileStrengthCDUcl) / 2,
      isInSpec: data.tensileStrengthCD >= data.tensileStrengthCDLcl && data.tensileStrengthCD <= data.tensileStrengthCDUcl
    },
    {
      label: 'Brightness',
      value: data.brightness,
      target: (data.brightnessLcl + data.brightnessUcl) / 2,
      isInSpec: data.brightness >= data.brightnessLcl && data.brightness <= data.brightnessUcl
    },
    {
      label: 'Moisture',
      value: data.moistureContent,
      target: (data.moistureContentLcl + data.moistureContentUcl) / 2,
      isInSpec: data.moistureContent >= data.moistureContentLcl && data.moistureContent <= data.moistureContentUcl
    }
  ];
}

function drawBarChart(doc: jsPDF, data: BarChartData[], x: number, y: number, width: number, height: number) {
  const barWidth = width / (data.length * 2 + 1);
  const maxValue = Math.max(...data.map(d => Math.max(d.value, d.target))) * 1.2;
  
  // Draw axes
  doc.setDrawColor(0);
  doc.setLineWidth(0.5);
  doc.line(x, y + height, x + width, y + height); // X-axis
  doc.line(x, y, x, y + height); // Y-axis
  
  // Draw bars
  data.forEach((item, index) => {
    const barX = x + barWidth * (index * 2 + 1);
    const barHeight = (item.value / maxValue) * height;
    const targetHeight = (item.target / maxValue) * height;
    
    // Draw value bar
    if (item.isInSpec) {
      doc.setFillColor(76, 175, 80); // Green
    } else {
      doc.setFillColor(244, 67, 54); // Red
    }
    doc.rect(barX, y + height - barHeight, barWidth * 0.8, barHeight, 'F');
    
    // Draw target line
    doc.setDrawColor(255, 152, 0); // Orange
    doc.setLineWidth(1);
    doc.line(barX - 2, y + height - targetHeight, barX + barWidth * 0.8 + 2, y + height - targetHeight);
    
    // Draw label
    doc.setFontSize(8);
    doc.setTextColor(0, 0, 0);
    doc.text(item.label, barX + barWidth * 0.4, y + height + 4, { align: 'center' });
    
    // Draw value
    doc.setFontSize(7);
    doc.text(item.value.toFixed(1), barX + barWidth * 0.4, y + height - barHeight - 2, { align: 'center' });
  });
  
  // Add legend
  doc.setFontSize(8);
  doc.setFillColor(76, 175, 80);
  doc.rect(x + width - 60, y, 8, 4, 'F');
  doc.text('In Spec', x + width - 50, y + 3);
  
  doc.setFillColor(244, 67, 54);
  doc.rect(x + width - 60, y + 6, 8, 4, 'F');
  doc.text('Out of Spec', x + width - 50, y + 9);
  
  doc.setDrawColor(255, 152, 0);
  doc.setLineWidth(1);
  doc.line(x + width - 60, y + 13, x + width - 52, y + 13);
  doc.text('Target', x + width - 50, y + 15);
}

function drawGaugeChart(doc: jsPDF, score: number, centerX: number, centerY: number, radius: number) {
  const startAngle = Math.PI * 0.8;
  const endAngle = Math.PI * 2.2;
  const angleRange = endAngle - startAngle;
  
  // Draw background arc
  doc.setDrawColor(230, 230, 230);
  doc.setLineWidth(6);
  drawArc(doc, centerX, centerY, radius, startAngle, endAngle);
  
  // Draw colored sections
  const sections = [
    { start: 0, end: 0.6, color: [244, 67, 54] }, // Red
    { start: 0.6, end: 0.8, color: [255, 152, 0] }, // Orange
    { start: 0.8, end: 1, color: [76, 175, 80] } // Green
  ];
  
  doc.setLineWidth(5);
  sections.forEach(section => {
    const sectionStart = startAngle + angleRange * section.start;
    const sectionEnd = startAngle + angleRange * section.end;
    doc.setDrawColor(section.color[0], section.color[1], section.color[2]);
    drawArc(doc, centerX, centerY, radius, sectionStart, sectionEnd);
  });
  
  // Draw needle
  const needleAngle = startAngle + angleRange * (score / 100);
  const needleEndX = centerX + Math.cos(needleAngle) * (radius - 5);
  const needleEndY = centerY + Math.sin(needleAngle) * (radius - 5);
  
  doc.setDrawColor(0, 0, 0);
  doc.setLineWidth(2);
  doc.line(centerX, centerY, needleEndX, needleEndY);
  
  // Draw center circle
  doc.setFillColor(0, 0, 0);
  doc.circle(centerX, centerY, 2, 'F');
  
  // Draw score text
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(0, 0, 0);
  doc.text(`${score.toFixed(0)}%`, centerX, centerY + radius + 10, { align: 'center' });
}

function drawArc(doc: jsPDF, centerX: number, centerY: number, radius: number, startAngle: number, endAngle: number) {
  const steps = 30;
  const angleStep = (endAngle - startAngle) / steps;
  
  for (let i = 0; i < steps; i++) {
    const angle1 = startAngle + angleStep * i;
    const angle2 = startAngle + angleStep * (i + 1);
    
    const x1 = centerX + Math.cos(angle1) * radius;
    const y1 = centerY + Math.sin(angle1) * radius;
    const x2 = centerX + Math.cos(angle2) * radius;
    const y2 = centerY + Math.sin(angle2) * radius;
    
    doc.line(x1, y1, x2, y2);
  }
}

interface TrendData {
  date: string;
  gsm: number;
  thickness: number;
  brightness: number;
}

function prepareTrendData(data: QualityData[]): TrendData[] {
  return data.reverse().map(d => ({
    date: dayjs(d.date).format('MM/DD'),
    gsm: d.gsm,
    thickness: d.thickness,
    brightness: d.brightness
  }));
}

function drawLineChart(doc: jsPDF, data: TrendData[], x: number, y: number, width: number, height: number) {
  if (data.length < 2) return;
  
  // Find min/max values
  const allValues = data.flatMap(d => [d.gsm, d.thickness, d.brightness]);
  const minValue = Math.min(...allValues) * 0.9;
  const maxValue = Math.max(...allValues) * 1.1;
  
  // Draw axes
  doc.setDrawColor(0);
  doc.setLineWidth(0.5);
  doc.line(x, y + height, x + width, y + height); // X-axis
  doc.line(x, y, x, y + height); // Y-axis
  
  // Draw grid lines
  doc.setDrawColor(230, 230, 230);
  doc.setLineWidth(0.2);
  for (let i = 1; i < 5; i++) {
    const gridY = y + (height / 5) * i;
    doc.line(x, gridY, x + width, gridY);
  }
  
  const pointSpacing = width / (data.length - 1);
  
  // Draw lines for each metric
  const metrics = [
    { key: 'gsm', color: [33, 150, 243], label: 'GSM' },
    { key: 'thickness', color: [255, 152, 0], label: 'Thickness' },
    { key: 'brightness', color: [76, 175, 80], label: 'Brightness' }
  ] as const;
  
  metrics.forEach(metric => {
    doc.setDrawColor(metric.color[0], metric.color[1], metric.color[2]);
    doc.setLineWidth(1.5);
    
    for (let i = 0; i < data.length - 1; i++) {
      const x1 = x + i * pointSpacing;
      const x2 = x + (i + 1) * pointSpacing;
      const y1 = y + height - ((data[i][metric.key] - minValue) / (maxValue - minValue)) * height;
      const y2 = y + height - ((data[i + 1][metric.key] - minValue) / (maxValue - minValue)) * height;
      
      doc.line(x1, y1, x2, y2);
    }
    
    // Draw points
    doc.setFillColor(metric.color[0], metric.color[1], metric.color[2]);
    data.forEach((point, i) => {
      const px = x + i * pointSpacing;
      const py = y + height - ((point[metric.key] - minValue) / (maxValue - minValue)) * height;
      doc.circle(px, py, 1.5, 'F');
    });
  });
  
  // Draw x-axis labels
  doc.setFontSize(7);
  doc.setTextColor(0, 0, 0);
  data.forEach((point, i) => {
    const labelX = x + i * pointSpacing;
    doc.text(point.date, labelX, y + height + 4, { align: 'center' });
  });
  
  // Draw legend
  let legendX = x + width - 60;
  metrics.forEach((metric, i) => {
    doc.setFillColor(metric.color[0], metric.color[1], metric.color[2]);
    doc.rect(legendX, y + i * 6, 8, 3, 'F');
    doc.setFontSize(8);
    doc.text(metric.label, legendX + 10, y + i * 6 + 2.5);
  });
}

interface RadarData {
  parameter: string;
  value: number;
  maxValue: number;
}

function prepareRadarData(data: QualityData): RadarData[] {
  return [
    { parameter: 'GSM', value: calculatePerformanceScore(data.gsm, data.gsmLcl, data.gsmUcl), maxValue: 100 },
    { parameter: 'Thickness', value: calculatePerformanceScore(data.thickness, data.thicknessLcl, data.thicknessUcl), maxValue: 100 },
    { parameter: 'Bulk', value: calculatePerformanceScore(data.bulk, data.bulkLcl, data.bulkUcl), maxValue: 100 },
    { parameter: 'Brightness', value: calculatePerformanceScore(data.brightness, data.brightnessLcl, data.brightnessUcl), maxValue: 100 },
    { parameter: 'Moisture', value: calculatePerformanceScore(data.moistureContent, data.moistureContentLcl, data.moistureContentUcl), maxValue: 100 }
  ];
}

function calculatePerformanceScore(value: number, lcl: number, ucl: number): number {
  if (value < lcl || value > ucl) return 0;
  const range = ucl - lcl;
  const midpoint = (ucl + lcl) / 2;
  const deviation = Math.abs(value - midpoint);
  const maxDeviation = range / 2;
  return Math.max(0, (1 - deviation / maxDeviation) * 100);
}

function drawRadarChart(doc: jsPDF, data: RadarData[], centerX: number, centerY: number, radius: number) {
  const numPoints = data.length;
  const angleStep = (Math.PI * 2) / numPoints;
  
  // Draw grid
  doc.setDrawColor(230, 230, 230);
  doc.setLineWidth(0.5);
  
  // Draw concentric circles
  for (let i = 1; i <= 5; i++) {
    const r = (radius / 5) * i;
    drawPolygon(doc, centerX, centerY, r, numPoints);
  }
  
  // Draw axes
  doc.setDrawColor(200, 200, 200);
  for (let i = 0; i < numPoints; i++) {
    const angle = i * angleStep - Math.PI / 2;
    const x = centerX + Math.cos(angle) * radius;
    const y = centerY + Math.sin(angle) * radius;
    doc.line(centerX, centerY, x, y);
    
    // Draw labels
    const labelX = centerX + Math.cos(angle) * (radius + 10);
    const labelY = centerY + Math.sin(angle) * (radius + 10);
    doc.setFontSize(8);
    doc.setTextColor(0, 0, 0);
    doc.text(data[i].parameter, labelX, labelY, { align: 'center' });
  }
  
  // Draw data polygon
  doc.setFillColor(33, 150, 243, 0.3);
  doc.setDrawColor(33, 150, 243);
  doc.setLineWidth(2);
  
  const points: [number, number][] = [];
  data.forEach((item, i) => {
    const angle = i * angleStep - Math.PI / 2;
    const r = (item.value / item.maxValue) * radius;
    const x = centerX + Math.cos(angle) * r;
    const y = centerY + Math.sin(angle) * r;
    points.push([x, y]);
  });
  
  // Draw filled polygon
  drawFilledPolygon(doc, points);
  
  // Draw points
  doc.setFillColor(33, 150, 243);
  points.forEach(([x, y]) => {
    doc.circle(x, y, 2, 'F');
  });
}

function drawPolygon(doc: jsPDF, centerX: number, centerY: number, radius: number, sides: number) {
  const angleStep = (Math.PI * 2) / sides;
  for (let i = 0; i < sides; i++) {
    const angle1 = i * angleStep - Math.PI / 2;
    const angle2 = ((i + 1) % sides) * angleStep - Math.PI / 2;
    
    const x1 = centerX + Math.cos(angle1) * radius;
    const y1 = centerY + Math.sin(angle1) * radius;
    const x2 = centerX + Math.cos(angle2) * radius;
    const y2 = centerY + Math.sin(angle2) * radius;
    
    doc.line(x1, y1, x2, y2);
  }
}

function drawFilledPolygon(doc: jsPDF, points: [number, number][]) {
  if (points.length < 3) return;
  
  // Draw outline
  for (let i = 0; i < points.length; i++) {
    const [x1, y1] = points[i];
    const [x2, y2] = points[(i + 1) % points.length];
    doc.line(x1, y1, x2, y2);
  }
}
