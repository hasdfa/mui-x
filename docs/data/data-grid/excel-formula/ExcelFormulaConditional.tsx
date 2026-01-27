import * as React from 'react';
import { DataGridPremium, GridColDef } from '@mui/x-data-grid-premium';

const columns: GridColDef[] = [
  { field: 'product', headerName: 'Product', width: 120, editable: true },
  {
    field: 'quantity',
    headerName: 'Quantity',
    type: 'number',
    width: 100,
    editable: true,
  },
  {
    field: 'price',
    headerName: 'Price',
    type: 'number',
    width: 100,
    editable: true,
  },
  { field: 'orderType', headerName: 'Order Type', width: 120, editable: true },
  { field: 'discount', headerName: 'Discount', width: 100, editable: true },
  { field: 'status', headerName: 'Stock Status', width: 130, editable: true },
];

const rows = [
  {
    id: 1,
    product: 'Widget A',
    quantity: 50,
    price: 25,
    orderType: '=IF($"quantity" > 20, "Bulk", "Regular")',
    discount: '=IF($"quantity" > 30, "15%", IF($"quantity" > 10, "10%", "0%"))',
    status: '=IF($"quantity" > 40, "High", IF($"quantity" > 15, "Medium", "Low"))',
  },
  {
    id: 2,
    product: 'Widget B',
    quantity: 15,
    price: 50,
    orderType: '=IF($"quantity" > 20, "Bulk", "Regular")',
    discount: '=IF($"quantity" > 30, "15%", IF($"quantity" > 10, "10%", "0%"))',
    status: '=IF($"quantity" > 40, "High", IF($"quantity" > 15, "Medium", "Low"))',
  },
  {
    id: 3,
    product: 'Widget C',
    quantity: 5,
    price: 100,
    orderType: '=IF($"quantity" > 20, "Bulk", "Regular")',
    discount: '=IF($"quantity" > 30, "15%", IF($"quantity" > 10, "10%", "0%"))',
    status: '=IF($"quantity" > 40, "High", IF($"quantity" > 15, "Medium", "Low"))',
  },
  {
    id: 4,
    product: 'Widget D',
    quantity: 25,
    price: 35,
    orderType: '=IF($"quantity" > 20, "Bulk", "Regular")',
    discount: '=IF($"quantity" > 30, "15%", IF($"quantity" > 10, "10%", "0%"))',
    status: '=IF($"quantity" > 40, "High", IF($"quantity" > 15, "Medium", "Low"))',
  },
];

export default function ExcelFormulaConditional() {
  return (
    <div style={{ height: 300, width: '100%' }}>
      <DataGridPremium
        rows={rows}
        columns={columns}
        experimentalFeatures={{ excelFormula: true }}
      />
    </div>
  );
}
