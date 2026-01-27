import * as React from 'react';
import { DataGridPremium, GridColDef } from '@mui/x-data-grid-premium';

const currencyFormatter = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
});

const columns: GridColDef[] = [
  { field: 'product', headerName: 'Product', width: 150, editable: true },
  {
    field: 'price',
    headerName: 'Price',
    type: 'number',
    width: 100,
    editable: true,
    valueFormatter: (value) => (value ? currencyFormatter.format(value) : ''),
  },
  {
    field: 'quantity',
    headerName: 'Quantity',
    type: 'number',
    width: 100,
    editable: true,
  },
  {
    field: 'total',
    headerName: 'Total',
    width: 120,
    editable: true,
    // Column-level formula - applies to ALL rows. Can be edited at runtime.
    defaultFormula: '=$"price" * $"quantity"',
    valueFormatter: (value) =>
      typeof value === 'number' ? currencyFormatter.format(value) : value,
  },
  {
    field: 'status',
    headerName: 'Stock Status',
    width: 120,
    editable: true,
    // Column-level formula with conditional logic
    defaultFormula: '=IF($"quantity" > 5, "In Stock", "Low Stock")',
  },
];

// Rows don't need to specify 'total' or 'status' - computed from column formulas
const rows = [
  { id: 1, product: 'Laptop', price: 1200, quantity: 2 },
  { id: 2, product: 'Mouse', price: 25, quantity: 15 },
  { id: 3, product: 'Keyboard', price: 75, quantity: 8 },
  { id: 4, product: 'Monitor', price: 350, quantity: 3 },
  { id: 5, product: 'Headphones', price: 150, quantity: 12 },
];

export default function ExcelFormulaColumn() {
  return (
    <div style={{ height: 400, width: '100%' }}>
      <DataGridPremium
        rows={rows}
        columns={columns}
        experimentalFeatures={{ excelFormula: true }}
      />
    </div>
  );
}
