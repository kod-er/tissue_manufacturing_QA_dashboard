import html2canvas from 'html2canvas';

export const exportChartAsImage = async (elementId: string): Promise<string | null> => {
  try {
    const element = document.getElementById(elementId);
    if (!element) return null;
    
    const canvas = await html2canvas(element, {
      backgroundColor: '#ffffff',
      scale: 2,
      logging: false,
      useCORS: true
    });
    
    return canvas.toDataURL('image/png');
  } catch (error) {
    console.error('Error exporting chart:', error);
    return null;
  }
};

export const downloadChartAsImage = async (elementId: string, filename: string = 'chart.png'): Promise<void> => {
  const dataUrl = await exportChartAsImage(elementId);
  if (dataUrl) {
    const link = document.createElement('a');
    link.href = dataUrl;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }
};