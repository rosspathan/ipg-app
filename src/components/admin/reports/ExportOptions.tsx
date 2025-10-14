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
      title: "Export Started",
      description: "Generating PDF report...",
    });
    // TODO: Implement PDF export
  };

  const exportToExcel = () => {
    toast({
      title: "Export Started",
      description: "Generating Excel file...",
    });
    // TODO: Implement Excel export
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

    const csvContent = JSON.stringify(reportData, null, 2);
    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${reportType}-${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);

    toast({
      title: "Export Complete",
      description: "CSV file downloaded successfully",
    });
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
