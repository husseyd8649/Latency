declare module "jspdf-autotable" {
  import { jsPDF } from "jspdf";
  
  interface UserOptions {
    startY?: number;
    head?: (string | number)[][];
    body?: (string | number)[][];
    theme?: "striped" | "grid" | "plain";
    headStyles?: {
      fillColor?: number[];
      textColor?: number[];
      fontSize?: number;
    };
    [key: string]: any;
  }
  
  function autoTable(doc: jsPDF, options: UserOptions): void;
  export default autoTable;
}