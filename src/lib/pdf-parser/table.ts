// Table Extraction

import { Table, TableCell, BoundingBox } from '@/types/document';
import { TextItem } from './parser';
import { v4 as uuidv4 } from 'uuid';

export interface TableExtractionOptions {
  minTableWidth: number; // minimum width to consider as table
  minTableHeight: number; // minimum height
  rowHeightEstimate: number; // estimated row height
  headerRowDetection: boolean; // detect header row
}

const DEFAULT_OPTIONS: TableExtractionOptions = {
  minTableWidth: 100,
  minTableHeight: 50,
  rowHeightEstimate: 20,
  headerRowDetection: true,
};

// Patterns indicating table structure
const TABLE_INDICATORS = [
  'gv',
  'hs',
  'hoạt động',
  'thời gian',
  'sản phẩm',
  'đánh giá',
];

export function extractTables(
  textItems: TextItem[],
  options: Partial<TableExtractionOptions> = {}
): Table[] {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  const tables: Table[] = [];

  // Group text items by page
  const itemsByPage = new Map<number, TextItem[]>();
  for (const item of textItems) {
    const items = itemsByPage.get(item.page) || [];
    items.push(item);
    itemsByPage.set(item.page, items);
  }

  // Process each page
  for (const [pageNum, items] of itemsByPage) {
    const pageTables = detectTablesOnPage(items, pageNum, opts);
    tables.push(...pageTables);
  }

  return tables;
}

function detectTablesOnPage(
  items: TextItem[],
  pageNum: number,
  opts: TableExtractionOptions
): Table[] {
  const tables: Table[] = [];

  // Look for table-like structures
  // Group items that are horizontally aligned (same Y range)
  const rows = groupIntoRows(items, opts.rowHeightEstimate);

  if (rows.length < 2) {
    return tables;
  }

  // Check if this looks like a table based on alignment
  let currentTable: {
    rows: TextItem[][];
    startY: number;
    minX: number;
    maxX: number;
  } | null = null;

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];

    // Check if row looks like a table row (multiple items with similar spacing)
    if (looksLikeTableRow(row)) {
      if (!currentTable) {
        currentTable = {
          rows: [],
          startY: row[0]?.y || 0,
          minX: Infinity,
          maxX: -Infinity,
        };
      }

      currentTable.rows.push(row);

      // Update bounding box
      for (const item of row) {
        currentTable.minX = Math.min(currentTable.minX, item.x);
        currentTable.maxX = Math.max(currentTable.maxX, item.x + item.width);
      }
    } else {
      // End current table if exists
      if (currentTable && currentTable.rows.length >= 2) {
        const table = buildTable(currentTable, pageNum, opts);
        if (table) {
          tables.push(table);
        }
      }
      currentTable = null;
    }
  }

  // Handle last table
  if (currentTable && currentTable.rows.length >= 2) {
    const table = buildTable(currentTable, pageNum, opts);
    if (table) {
      tables.push(table);
    }
  }

  return tables;
}

function groupIntoRows(items: TextItem[], rowHeightEstimate: number): TextItem[][] {
  // Sort by Y (top to bottom), then X (left to right)
  const sorted = [...items].sort((a, b) => {
    const yDiff = a.y - b.y;
    if (Math.abs(yDiff) > rowHeightEstimate * 0.5) return a.y - b.y;
    return a.x - b.x;
  });

  const rows: TextItem[][] = [];
  let currentRow: TextItem[] = [];
  let lastY: number | null = null;

  for (const item of sorted) {
    if (lastY === null || Math.abs(item.y - lastY) <= rowHeightEstimate * 0.5) {
      // Same row
      currentRow.push(item);
    } else {
      // New row
      if (currentRow.length > 0) {
        // Sort current row by X
        currentRow.sort((a, b) => a.x - b.x);
        rows.push(currentRow);
      }
      currentRow = [item];
    }
    lastY = item.y;
  }

  // Add last row
  if (currentRow.length > 0) {
    currentRow.sort((a, b) => a.x - b.x);
    rows.push(currentRow);
  }

  return rows;
}

function looksLikeTableRow(row: TextItem[]): boolean {
  if (row.length < 2) return false;

  // Check for uniform spacing
  const gaps: number[] = [];
  for (let i = 1; i < row.length; i++) {
    gaps.push(row[i].x - (row[i - 1].x + row[i - 1].width));
  }

  if (gaps.length === 0) return false;

  // Calculate gap variance
  const avgGap = gaps.reduce((a, b) => a + b, 0) / gaps.length;
  const variance = gaps.reduce((sum, g) => sum + Math.pow(g - avgGap, 2), 0) / gaps.length;
  const stdDev = Math.sqrt(variance);

  // Table rows typically have consistent spacing
  // If variance is too high, probably not a table
  if (avgGap > 0 && stdDev / avgGap > 0.5) {
    return false;
  }

  // Check if items have similar heights
  const heights = row.map((item) => item.height);
  const avgHeight = heights.reduce((a, b) => a + b, 0) / heights.length;
  const allSimilar = heights.every((h) => Math.abs(h - avgHeight) < avgHeight * 0.3);

  return allSimilar;
}

function buildTable(
  tableData: { rows: TextItem[][]; startY: number; minX: number; maxX: number },
  pageNum: number,
  opts: TableExtractionOptions
): Table | null {
  const rows = tableData.rows;

  if (rows.length < 2) return null;

  // Determine columns based on X positions
  const columnBoundaries = determineColumns(rows);

  if (columnBoundaries.length < 2) return null;

  // Build cells
  const cells: TableCell[] = [];
  let headers: string[] = [];

  for (let rowIdx = 0; rowIdx < rows.length; rowIdx++) {
    const row = rows[rowIdx];
    const rowMinY = Math.min(...row.map((item) => item.y));
    const rowMaxY = Math.max(...row.map((item) => item.y + item.height));

    let colIdx = 0;
    for (const item of row) {
      // Find which column this item belongs to
      while (colIdx < columnBoundaries.length - 1 && item.x >= columnBoundaries[colIdx + 1]) {
        colIdx++;
      }

      const cell: TableCell = {
        cellId: `cell_${String(rows.length).padStart(2, '0')}_${String(colIdx).padStart(2, '0')}`,
        row: rowIdx,
        column: colIdx,
        rowSpan: 1,
        colSpan: 1,
        text: item.text,
        bbox: {
          x: item.x,
          y: rowMinY,
          width: item.width,
          height: rowMaxY - rowMinY,
        },
        isHeader: rowIdx === 0 && opts.headerRowDetection,
      };

      cells.push(cell);

      if (rowIdx === 0) {
        headers.push(item.text);
      }
    }
  }

  // Calculate table bounding box
  const allX = cells.flatMap((c) => [c.bbox.x, c.bbox.x + c.bbox.width]);
  const allY = cells.flatMap((c) => [c.bbox.y, c.bbox.y + c.bbox.height]);

  const tableBbox: BoundingBox = {
    x: Math.min(...allX),
    y: Math.min(...allY),
    width: Math.max(...allX) - Math.min(...allX),
    height: Math.max(...allY) - Math.min(...allY),
  };

  // Filter out small tables
  if (tableBbox.width < opts.minTableWidth || tableBbox.height < opts.minTableHeight) {
    return null;
  }

  const table: Table = {
    tableId: `table_${uuidv4().substring(0, 8)}`,
    page: pageNum,
    bbox: tableBbox,
    rows: rows.length,
    columns: columnBoundaries.length - 1,
    cells,
    headers,
  };

  return table;
}

function determineColumns(rows: TextItem[][]): number[] {
  // Collect all X positions and widths
  const allItems = rows.flat();

  // Get left edges of all items
  const leftEdges = allItems.map((item) => item.x);
  const rightEdges = allItems.map((item) => item.x + item.width);

  // Find major column boundaries by clustering
  // This is a simplified version - a real implementation would use more sophisticated clustering
  const uniqueLefts = [...new Set(leftEdges)].sort((a, b) => a - b);

  // Merge edges that are close together (within 10 points)
  const merged: number[] = [];
  for (const x of uniqueLefts) {
    if (merged.length === 0 || x - merged[merged.length - 1] > 10) {
      merged.push(x);
    }
  }

  // Add right boundary
  merged.push(Math.max(...rightEdges));

  return merged;
}

export function findTableCell(
  tables: Table[],
  targetId: string
): { table: Table; cell: TableCell } | null {
  for (const table of tables) {
    const cell = table.cells.find((c) => c.cellId === targetId);
    if (cell) {
      return { table, cell };
    }
  }
  return null;
}
