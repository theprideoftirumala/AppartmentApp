import html2canvas from 'html2canvas';

export function reportImageScale() {
  if (typeof window === 'undefined') return 1.5;
  const dpr = Number(window.devicePixelRatio) || 1;
  return Math.min(2, Math.max(1, dpr >= 2 ? 1.5 : 1.25));
}

export function reportImageFileName(month) {
  return `TPT_Report_${month || 'Monthly'}.png`;
}

export async function exportReportImage(element, month) {
  if (!element) throw new Error('The report is not on the page yet.');
  if (document.fonts?.ready) {
    await document.fonts.ready.catch(() => {});
  }
  const width = Math.max(element.scrollWidth, element.clientWidth, 980);
  const height = Math.max(element.scrollHeight, element.clientHeight);
  const canvas = await html2canvas(element, {
    scale: reportImageScale(),
    useCORS: true,
    allowTaint: true,
    backgroundColor: '#fffaf2',
    logging: false,
    letterRendering: true,
    foreignObjectRendering: false,
    scrollX: 0,
    scrollY: 0,
    width,
    height,
    windowWidth: width,
    windowHeight: height,
    onclone: (clonedDoc) => {
      const clonedEl = clonedDoc.querySelector('[data-report-capture]');
      if (clonedEl) {
        clonedEl.style.transform = 'none';
        clonedEl.style.maxWidth = 'none';
        clonedEl.style.width = `${width}px`;
        clonedEl.style.height = 'auto';
        clonedEl.style.overflow = 'visible';
      }
      clonedDoc.querySelectorAll('.report-month-seal-svg').forEach((svg) => {
        svg.setAttribute('width', '148');
        svg.setAttribute('height', '148');
        svg.style.display = 'block';
        svg.style.visibility = 'visible';
        svg.style.opacity = '1';
      });
    },
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
