import * as XLSX from "xlsx";

/**
 * Utility to export data to Excel
 * @param data Array of objects to export
 * @param fileName Name of the file (without extension)
 * @param sheetName Name of the sheet
 */
export const exportToExcel = (data: any[], fileName: string, sheetName: string = "Sheet1") => {
    try {
        // Create a worksheet
        const ws = XLSX.utils.json_to_sheet(data);

        // Create a workbook
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, sheetName);

        // Save the file
        XLSX.writeFile(wb, `${fileName}_${new Date().getTime()}.xlsx`);
    } catch (error) {
        console.error("Export to Excel failed:", error);
    }
};
