import * as React from 'react';
import { DataGridPremium, GridColDef } from '@mui/x-data-grid-premium';

const currencyFormatter = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
});

const columns: GridColDef[] = [
  { field: 'product', headerName: 'Product', width: 150 },
  {
    field: 'price',
    headerName: 'Price',
    type: 'number',
    width: 120,
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
    width: 150,
    editable: true,
    valueFormatter: (value) =>
      typeof value === 'number' ? currencyFormatter.format(value) : value,
  },
];

const rows = [
  {
    id: 1,
    product: 'Laptop',
    price: 1200,
    quantity: 2,
    total: '=$"price" * $"quantity"',
  },
  {
    id: 2,
    product: 'Mouse',
    price: 25,
    quantity: 10,
    total: '=$"price" * $"quantity"',
  },
  {
    id: 3,
    product: 'Keyboard',
    price: 75,
    quantity: 5,
    total: '=$"price" * $"quantity"',
  },
  {
    id: 4,
    product: 'Monitor',
    price: 350,
    quantity: 3,
    total: '=$"price" * $"quantity"',
  },
  {
    id: 5,
    product: 'Headphones',
    price: 150,
    quantity: 8,
    total: '=$"price" * $"quantity"',
  },
];

export default function ExcelFormulaBasic() {
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
