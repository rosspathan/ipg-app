// Export utility functions for CSV, Excel, and PDF generation

export function exportToCSV(data: any[], filename: string) {
  if (!data || data.length === 0) {
    throw new Error('No data to export');
  }

  // Get headers from first object
  const headers = Object.keys(data[0]);
  
  // Create CSV content
  const csvRows = [
    headers.join(','), // Header row
    ...data.map(row => 
      headers.map(header => {
        const value = row[header];
        // Handle values that contain commas or quotes
        if (typeof value === 'string' && (value.includes(',') || value.includes('"'))) {
          return `"${value.replace(/"/g, '""')}"`;
        }
        return value ?? '';
      }).join(',')
    )
  ];

  const csvContent = csvRows.join('\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `${filename}_${new Date().toISOString().split('T')[0]}.csv`;
  link.click();
  window.URL.revokeObjectURL(url);
}

export function exportToExcel(data: any[], filename: string) {
  if (!data || data.length === 0) {
    throw new Error('No data to export');
  }

  // For Excel, we'll create a more structured CSV that Excel can better parse
  const headers = Object.keys(data[0]);
  
  // Excel-compatible CSV with proper formatting
  const excelRows = [
    headers.join('\t'), // Tab-separated for better Excel compatibility
    ...data.map(row =>
      headers.map(header => {
        const value = row[header];
        // Format dates for Excel
        if (value instanceof Date) {
          return value.toISOString();
        }
        // Format numbers
        if (typeof value === 'number') {
          return value.toString();
        }
        // Handle strings
        if (typeof value === 'string') {
          return `"${value.replace(/"/g, '""')}"`;
        }
        return value ?? '';
      }).join('\t')
    )
  ];

  const content = excelRows.join('\n');
  const blob = new Blob([content], { type: 'application/vnd.ms-excel;charset=utf-8;' });
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `${filename}_${new Date().toISOString().split('T')[0]}.xls`;
  link.click();
  window.URL.revokeObjectURL(url);
}

export function exportToJSON(data: any[], filename: string) {
  if (!data || data.length === 0) {
    throw new Error('No data to export');
  }

  const jsonContent = JSON.stringify(data, null, 2);
  const blob = new Blob([jsonContent], { type: 'application/json;charset=utf-8;' });
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `${filename}_${new Date().toISOString().split('T')[0]}.json`;
  link.click();
  window.URL.revokeObjectURL(url);
}

// Format data for export by flattening nested objects
export function flattenForExport(data: any[]): any[] {
  return data.map(item => {
    const flat: any = {};
    
    function flatten(obj: any, prefix = '') {
      for (const key in obj) {
        const value = obj[key];
        const newKey = prefix ? `${prefix}.${key}` : key;
        
        if (value && typeof value === 'object' && !Array.isArray(value) && !(value instanceof Date)) {
          flatten(value, newKey);
        } else if (Array.isArray(value)) {
          flat[newKey] = JSON.stringify(value);
        } else {
          flat[newKey] = value;
        }
      }
    }
    
    flatten(item);
    return flat;
  });
}
