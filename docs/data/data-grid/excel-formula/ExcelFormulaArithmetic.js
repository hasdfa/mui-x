import * as React from 'react';
import { DataGridPremium } from '@mui/x-data-grid-premium';

const columns = [
  { field: 'a', headerName: 'A', type: 'number', width: 80 },
  { field: 'b', headerName: 'B', type: 'number', width: 80 },
  { field: 'addition', headerName: 'A + B', width: 100 },
  { field: 'subtraction', headerName: 'A - B', width: 100 },
  { field: 'multiplication', headerName: 'A * B', width: 100 },
  { field: 'division', headerName: 'A / B', width: 100 },
  { field: 'complex', headerName: '(A + B) * 2', width: 120 },
];

const rows = [
  {
    id: 1,
    a: 10,
    b: 5,
    addition: '=$"a" + $"b"',
    subtraction: '=$"a" - $"b"',
    multiplication: '=$"a" * $"b"',
    division: '=$"a" / $"b"',
    complex: '=($"a" + $"b") * 2',
  },
  {
    id: 2,
    a: 20,
    b: 4,
    addition: '=$"a" + $"b"',
    subtraction: '=$"a" - $"b"',
    multiplication: '=$"a" * $"b"',
    division: '=$"a" / $"b"',
    complex: '=($"a" + $"b") * 2',
  },
  {
    id: 3,
    a: 100,
    b: 25,
    addition: '=$"a" + $"b"',
    subtraction: '=$"a" - $"b"',
    multiplication: '=$"a" * $"b"',
    division: '=$"a" / $"b"',
    complex: '=($"a" + $"b") * 2',
  },
  {
    id: 4,
    a: 15,
    b: 3,
    addition: '=$"a" + $"b"',
    subtraction: '=$"a" - $"b"',
    multiplication: '=$"a" * $"b"',
    division: '=$"a" / $"b"',
    complex: '=($"a" + $"b") * 2',
  },
];

export default function ExcelFormulaArithmetic() {
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
