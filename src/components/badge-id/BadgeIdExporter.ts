import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';

export class BadgeIdExporter {
  static async exportToPNG(
    element: HTMLElement,
    filename: string,
    scale: number = 2
  ): Promise<void> {
    try {
      const canvas = await html2canvas(element, {
        scale,
        useCORS: true,
        allowTaint: true,
        backgroundColor: null,
        logging: false,
      });

      canvas.toBlob((blob) => {
        if (!blob) return;
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = filename;
        link.click();
        URL.revokeObjectURL(url);
      }, 'image/png');
    } catch (error) {
      console.error('Error exporting PNG:', error);
      throw error;
    }
  }

  static async exportToPDF(
    frontElement: HTMLElement,
    backElement: HTMLElement,
    filename: string
  ): Promise<void> {
    try {
      // Capture both sides at 300 DPI equivalent
      const scale = 3;
      const [frontCanvas, backCanvas] = await Promise.all([
        html2canvas(frontElement, {
          scale,
          useCORS: true,
          allowTaint: true,
          backgroundColor: '#ffffff',
          logging: false,
        }),
        html2canvas(backElement, {
          scale,
          useCORS: true,
          allowTaint: true,
          backgroundColor: '#ffffff',
          logging: false,
        }),
      ]);

      // Create PDF (3x5 inches @ 300 DPI with bleed)
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'in',
        format: [3, 5],
      });

      // Add front page
      const frontImgData = frontCanvas.toDataURL('image/jpeg', 0.95);
      pdf.addImage(frontImgData, 'JPEG', 0, 0, 3, 5);

      // Add back page
      pdf.addPage();
      const backImgData = backCanvas.toDataURL('image/jpeg', 0.95);
      pdf.addImage(backImgData, 'JPEG', 0, 0, 3, 5);

      // Save
      pdf.save(filename);
    } catch (error) {
      console.error('Error exporting PDF:', error);
      throw error;
    }
  }

  static generateFilename(
    userId: string,
    tier: string,
    extension: 'png' | 'pdf'
  ): string {
    const date = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const shortId = userId.slice(0, 8).toUpperCase();
    return `ISMART_ID_${shortId}_${tier}_${date}.${extension}`;
  }
}
