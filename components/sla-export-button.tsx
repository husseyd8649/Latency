"use client";

import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import { FileText } from "lucide-react";

export function ExportPDFButton({ report }: { report: any }) {
  const exportPDF = () => {
    const doc = new jsPDF();
    
    // Extract dates from period.start and period.end
    const startDate = new Date(report.period.start);
    const endDate = new Date(report.period.end);
    
    const monthName = startDate.toLocaleString('default', { 
      month: 'long', 
      year: 'numeric' 
    });
    
    const fileName = `sla-report-${startDate.getFullYear()}-${String(startDate.getMonth() + 1).padStart(2, '0')}.pdf`;
    
    // Header
    doc.setFontSize(20);
    doc.text("SLA Report", 14, 22);
    
    doc.setFontSize(12);
    doc.text(`Period: ${startDate.toLocaleDateString()} - ${endDate.toLocaleDateString()}`, 14, 32);
    doc.text(`Generated: ${new Date().toLocaleDateString()}`, 14, 40);
    
    // Summary
    doc.setFontSize(14);
    doc.text("Summary", 14, 55);
    
    autoTable(doc, {
      startY: 60,
      head: [['Metric', 'Value']],
      body: [
        ['Overall Uptime', `${report.overall.uptimePercentage.toFixed(3)}%`],
        ['Total Downtime', `${Math.floor(report.overall.downtimeMinutes / 60)}h ${report.overall.downtimeMinutes % 60}m`],
        ['Maintenance Windows', `${Math.floor(report.overall.maintenanceMinutes / 60)}h ${report.overall.maintenanceMinutes % 60}m`],
        ['Total Incidents', `${report.overall.incidentCount}`],
        ['Monitors Tracked', `${report.monitors.length}`],
      ],
      theme: 'striped',
      headStyles: { fillColor: [99, 102, 241] },
    });
    
    // Per-monitor breakdown
    doc.addPage();
    doc.setFontSize(14);
    doc.text("Monitor Details", 14, 20);
    
    const tableData = report.monitors.map((m: any) => [
      m.name,
      m.type,
      `${m.uptimePercentage.toFixed(3)}%`,
      `${m.incidentCount}`,
      `${Math.floor(m.downtimeMinutes / 60)}h ${m.downtimeMinutes % 60}m`
    ]);
    
    autoTable(doc, {
      startY: 30,
      head: [['Monitor', 'Type', 'Uptime', 'Incidents', 'Downtime']],
      body: tableData,
      theme: 'striped',
      headStyles: { fillColor: [99, 102, 241] },
    });
    
    // Footer
    const pageCount = doc.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFontSize(10);
      doc.text("Latency - Signal Ops Platform", 14, doc.internal.pageSize.height - 10);
      doc.text(`Page ${i} of ${pageCount}`, doc.internal.pageSize.width - 30, doc.internal.pageSize.height - 10);
    }
    
    doc.save(fileName);
  };
  
  return (
    <button
      onClick={exportPDF}
      className="px-4 py-2 bg-[var(--surface)] border border-[var(--border)] rounded-md text-[var(--text)] hover:bg-[var(--surface-2)] transition-colors flex items-center gap-2 text-sm font-medium"
    >
      <FileText className="w-4 h-4" />
      Export PDF
    </button>
  );
}