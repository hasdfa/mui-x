import * as React from 'react';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import {
  DataGridPremium,
  GridColDef,
  useGridApiRef,
} from '@mui/x-data-grid-premium';

const columns: GridColDef[] = [
  { field: 'product', headerName: 'Product', width: 150, editable: true },
  {
    field: 'price',
    headerName: 'Price',
    type: 'number',
    width: 100,
    editable: true,
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
    defaultFormula: '=$"price" * $"quantity"',
  },
];

const rows = [
  { id: 1, product: 'Laptop', price: 1200, quantity: 2 },
  { id: 2, product: 'Mouse', price: 25, quantity: 10 },
  { id: 3, product: 'Keyboard', price: 75, quantity: 5 },
];

export default function ExcelFormulaAPI() {
  const apiRef = useGridApiRef();
  const [testFormula, setTestFormula] = React.useState('=$"price" + $"quantity"');
  const [evaluationResult, setEvaluationResult] = React.useState<string>('');
  const [cellFormula, setCellFormula] = React.useState<string>('');
  const [columnFormula, setColumnFormula] = React.useState<string>('');

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

  const handleGetRawCellFormula = () => {
    if (apiRef.current) {
      const formula = apiRef.current.getRawCellFormula(1, 'total');
      setCellFormula(formula ?? 'No formula found');
    }
  };

  const handleGetColumnFormula = () => {
    if (apiRef.current) {
      const formula = apiRef.current.getColumnFormula('total');
      setColumnFormula(formula ?? 'No column formula');
    }
  };

  const handleSetColumnFormula = () => {
    if (apiRef.current) {
      // Change the formula to add 10% markup
      apiRef.current.setColumnFormula('total', '=$"price" * $"quantity" * 1.1');
      setColumnFormula('Formula updated to include 10% markup!');
    }
  };

  const handleResetColumnFormula = () => {
    if (apiRef.current) {
      // Reset to the default formula
      apiRef.current.setColumnFormula('total', null);
      setColumnFormula('Formula reset to default');
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
            getCellFormula
          </Button>
          <Button variant="outlined" onClick={handleGetRawCellFormula}>
            getRawCellFormula
          </Button>
          {cellFormula && (
            <Typography variant="body2" color="text.secondary">
              Formula: {cellFormula}
            </Typography>
          )}
        </Stack>
        <Stack direction="row" spacing={2} alignItems="center">
          <Button variant="outlined" onClick={handleGetColumnFormula}>
            getColumnFormula
          </Button>
          <Button variant="outlined" onClick={handleSetColumnFormula}>
            setColumnFormula (+10%)
          </Button>
          <Button variant="outlined" onClick={handleResetColumnFormula}>
            Reset to Default
          </Button>
        </Stack>
        {columnFormula && (
          <Typography variant="body2" color="text.secondary">
            {columnFormula}
          </Typography>
        )}
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
