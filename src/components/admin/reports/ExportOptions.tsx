import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Download, FileText, Table } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface ExportOptionsProps {
  reportData: any;
  reportType: string;
}

export function ExportOptions({ reportData, reportType }: ExportOptionsProps) {
  const { toast } = useToast();

  const exportToPDF = () => {
    toast({
      title: "Coming Soon",
      description: "PDF export will be available in a future update",
    });
  };

  const exportToExcel = () => {
    if (!reportData) {
      toast({
        variant: "destructive",
        title: "No Data",
        description: "No report data available to export",
      });
      return;
    }

    try {
      import('@/utils/export').then(({ exportToExcel, flattenForExport }) => {
        const data = Array.isArray(reportData) ? reportData : [reportData];
        const flatData = flattenForExport(data);
        exportToExcel(flatData, reportType);
        toast({
          title: "Export Complete",
          description: "Excel file downloaded successfully",
        });
      });
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Export Failed",
        description: "Failed to export to Excel",
      });
    }
  };

  const exportToCSV = () => {
    if (!reportData) {
      toast({
        variant: "destructive",
        title: "No Data",
        description: "No report data available to export",
      });
      return;
    }

    try {
      import('@/utils/export').then(({ exportToCSV, flattenForExport }) => {
        const data = Array.isArray(reportData) ? reportData : [reportData];
        const flatData = flattenForExport(data);
        exportToCSV(flatData, reportType);
        toast({
          title: "Export Complete",
          description: "CSV file downloaded successfully",
        });
      });
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Export Failed",
        description: "Failed to export to CSV",
      });
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button>
          <Download className="w-4 h-4 mr-2" />
          Export
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={exportToPDF}>
          <FileText className="w-4 h-4 mr-2" />
          Export as PDF
        </DropdownMenuItem>
        <DropdownMenuItem onClick={exportToExcel}>
          <Table className="w-4 h-4 mr-2" />
          Export as Excel
        </DropdownMenuItem>
        <DropdownMenuItem onClick={exportToCSV}>
          <FileText className="w-4 h-4 mr-2" />
          Export as CSV
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
