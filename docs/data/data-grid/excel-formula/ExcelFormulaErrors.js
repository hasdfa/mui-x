import * as React from 'react';
import { DataGridPremium } from '@mui/x-data-grid-premium';

const columns = [
  { field: 'scenario', headerName: 'Error Scenario', width: 200 },
  { field: 'formula', headerName: 'Formula', width: 200 },
  { field: 'price', headerName: 'Price', type: 'number', width: 100 },
  { field: 'quantity', headerName: 'Quantity', type: 'number', width: 100 },
  { field: 'result', headerName: 'Result', width: 120 },
];

const rows = [
  {
    id: 1,
    scenario: 'Valid formula',
    formula: '=$"price" * $"quantity"',
    price: 100,
    quantity: 5,
    result: '=$"price" * $"quantity"',
  },
  {
    id: 2,
    scenario: 'Invalid column (#REF!)',
    formula: '=$"nonexistent"',
    price: 50,
    quantity: 10,
    result: '=$"nonexistent"',
  },
  {
    id: 3,
    scenario: 'Syntax error (#SYNTAX!)',
    formula: '=$"price" +',
    price: 75,
    quantity: 3,
    result: '=$"price" +',
  },
  {
    id: 4,
    scenario: 'Division by zero (#VALUE!)',
    formula: '=$"price" / 0',
    price: 200,
    quantity: 0,
    result: '=$"price" / $"quantity"',
  },
  {
    id: 5,
    scenario: 'Self-reference (#CIRC!)',
    formula: '=$"result"',
    price: 150,
    quantity: 2,
    result: '=$"result"',
  },
];

export default function ExcelFormulaErrors() {
  return (
    <div style={{ height: 350, width: '100%' }}>
      <DataGridPremium
        rows={rows}
        columns={columns}
        experimentalFeatures={{ excelFormula: true }}
      />
    </div>
  );
}
