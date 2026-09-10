import html2canvas from 'html2canvas';

export function reportImageFileName(month) {
  return `TPT_Report_${month || 'Monthly'}.png`;
}

export async function exportReportImage(element, month) {
  if (!element) throw new Error('The report is not on the page yet.');
  const canvas = await html2canvas(element, {
    scale: 3,
    useCORS: true,
    backgroundColor: '#fffaf2',
    logging: false,
    windowWidth: Math.max(element.scrollWidth, 980),
  });
  const blob = await new Promise((resolve, reject) => {
    canvas.toBlob((file) => {
      if (file) resolve(file);
      else reject(new Error('Could not create the image'));
    }, 'image/png');
  });
  const fileName = reportImageFileName(month);
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  link.click();
  URL.revokeObjectURL(url);
  return fileName;
}
