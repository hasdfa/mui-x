import * as React from 'react';
import { DataGridPremium, GridColDef } from '@mui/x-data-grid-premium';

const columns: GridColDef[] = [
  { field: 'item', headerName: 'Item', width: 120, editable: true },
  { field: 'q1', headerName: 'Q1', type: 'number', width: 80, editable: true },
  { field: 'q2', headerName: 'Q2', type: 'number', width: 80, editable: true },
  { field: 'q3', headerName: 'Q3', type: 'number', width: 80, editable: true },
  { field: 'q4', headerName: 'Q4', type: 'number', width: 80, editable: true },
  { field: 'sum', headerName: 'SUM', width: 100, editable: true },
  { field: 'avg', headerName: 'AVG', width: 100, editable: true },
  { field: 'min', headerName: 'MIN', width: 80, editable: true },
  { field: 'max', headerName: 'MAX', width: 80, editable: true },
  { field: 'label', headerName: 'Label', width: 180, editable: true },
];

const rows = [
  {
    id: 1,
    item: 'Product A',
    q1: 100,
    q2: 150,
    q3: 120,
    q4: 200,
    sum: '=SUM($"q1", $"q2", $"q3", $"q4")',
    avg: '=AVG($"q1", $"q2", $"q3", $"q4")',
    min: '=MIN($"q1", $"q2", $"q3", $"q4")',
    max: '=MAX($"q1", $"q2", $"q3", $"q4")',
    label: '=CONCAT($"item", ": ", $"sum")',
  },
  {
    id: 2,
    item: 'Product B',
    q1: 80,
    q2: 90,
    q3: 110,
    q4: 95,
    sum: '=SUM($"q1", $"q2", $"q3", $"q4")',
    avg: '=AVG($"q1", $"q2", $"q3", $"q4")',
    min: '=MIN($"q1", $"q2", $"q3", $"q4")',
    max: '=MAX($"q1", $"q2", $"q3", $"q4")',
    label: '=CONCAT($"item", ": ", $"sum")',
  },
  {
    id: 3,
    item: 'Product C',
    q1: 200,
    q2: 180,
    q3: 220,
    q4: 250,
    sum: '=SUM($"q1", $"q2", $"q3", $"q4")',
    avg: '=AVG($"q1", $"q2", $"q3", $"q4")',
    min: '=MIN($"q1", $"q2", $"q3", $"q4")',
    max: '=MAX($"q1", $"q2", $"q3", $"q4")',
    label: '=CONCAT($"item", ": ", $"sum")',
  },
];

export default function ExcelFormulaFunctions() {
  return (
    <div style={{ height: 250, width: '100%' }}>
      <DataGridPremium
        rows={rows}
        columns={columns}
        experimentalFeatures={{ excelFormula: true }}
      />
    </div>
  );
}
