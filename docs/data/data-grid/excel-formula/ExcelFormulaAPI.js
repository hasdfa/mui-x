import * as React from 'react';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import { DataGridPremium, useGridApiRef } from '@mui/x-data-grid-premium';

const columns = [
  { field: 'product', headerName: 'Product', width: 150 },
  { field: 'price', headerName: 'Price', type: 'number', width: 100 },
  { field: 'quantity', headerName: 'Quantity', type: 'number', width: 100 },
  { field: 'total', headerName: 'Total', width: 120 },
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
];

export default function ExcelFormulaAPI() {
  const apiRef = useGridApiRef();
  const [testFormula, setTestFormula] = React.useState('=$"price" + $"quantity"');
  const [evaluationResult, setEvaluationResult] = React.useState('');
  const [cellFormula, setCellFormula] = React.useState('');

  const handleEvaluate = () => {
    if (apiRef.current) {
      const result = apiRef.current.evaluateFormula(testFormula, 1);
      if (result.error) {
        setEvaluationResult(`Error: ${result.error.message}`);
      } else {
        setEvaluationResult(`Result: ${result.value}`);
      }
    }
  };

  const handleCheckIsFormula = () => {
    if (apiRef.current) {
      const isFormula = apiRef.current.isFormula(testFormula);
      setEvaluationResult(`isFormula: ${isFormula}`);
    }
  };

  const handleGetCellFormula = () => {
    if (apiRef.current) {
      const formula = apiRef.current.getCellFormula(1, 'total');
      setCellFormula(formula ?? 'No formula found');
    }
  };

  return (
    <Box sx={{ width: '100%' }}>
      <Stack spacing={2} sx={{ mb: 2 }}>
        <Stack direction="row" spacing={2} alignItems="center">
          <TextField
            label="Test Formula"
            value={testFormula}
            onChange={(event) => setTestFormula(event.target.value)}
            size="small"
            sx={{ width: 300 }}
          />
          <Button variant="outlined" onClick={handleEvaluate}>
            Evaluate
          </Button>
          <Button variant="outlined" onClick={handleCheckIsFormula}>
            isFormula?
          </Button>
        </Stack>
        {evaluationResult && (
          <Typography variant="body2" color="text.secondary">
            {evaluationResult}
          </Typography>
        )}
        <Stack direction="row" spacing={2} alignItems="center">
          <Button variant="outlined" onClick={handleGetCellFormula}>
            Get Formula from Row 1, &quot;total&quot; column
          </Button>
          {cellFormula && (
            <Typography variant="body2" color="text.secondary">
              Formula: {cellFormula}
            </Typography>
          )}
        </Stack>
      </Stack>
      <div style={{ height: 250 }}>
        <DataGridPremium
          apiRef={apiRef}
          rows={rows}
          columns={columns}
          experimentalFeatures={{ excelFormula: true }}
        />
      </div>
    </Box>
  );
}
