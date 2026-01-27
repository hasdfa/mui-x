'use client';
import * as React from 'react';
import { styled } from '@mui/material/styles';
import { useGridSelector, gridFocusCellSelector, GridRowId } from '@mui/x-data-grid-pro';
import { useGridApiContext } from '../hooks/utils/useGridApiContext';

function isFormulaValue(value: unknown): value is string {
  return typeof value === 'string' && value.startsWith('=');
}

const FormulaBarRoot = styled('div')(({ theme }) => ({
  display: 'flex',
  alignItems: 'center',
  borderBottom: `1px solid ${(theme.vars || theme).palette.divider}`,
  padding: '2px 8px',
  minHeight: 32,
  gap: 8,
}));

const CellLabel = styled('span')(({ theme }) => ({
  fontWeight: 600,
  fontSize: '0.8125rem',
  minWidth: 60,
  color: (theme.vars || theme).palette.text.secondary,
  userSelect: 'none',
}));

const FormulaInput = styled('input')(({ theme }) => ({
  flex: 1,
  border: 'none',
  outline: 'none',
  fontFamily: 'monospace',
  fontSize: '0.875rem',
  padding: '4px 0',
  background: 'transparent',
  color: (theme.vars || theme).palette.text.primary,
}));

export function GridFormulaBar() {
  const apiRef = useGridApiContext();
  const focusedCell = useGridSelector(apiRef, gridFocusCellSelector);
  const inputRef = React.useRef<HTMLInputElement>(null);

  const [inputValue, setInputValue] = React.useState('');
  const [cellLabel, setCellLabel] = React.useState('');
  const [focusedRowId, setFocusedRowId] = React.useState<GridRowId | null>(null);
  const [focusedField, setFocusedField] = React.useState<string | null>(null);

  // Sync input with focused cell
  React.useEffect(() => {
    if (!focusedCell) {
      setInputValue('');
      setCellLabel('');
      setFocusedRowId(null);
      setFocusedField(null);
      return;
    }

    const { id, field } = focusedCell;
    setCellLabel(field);
    setFocusedRowId(id);
    setFocusedField(field);

    // Get raw formula or plain value
    const rawFormula = apiRef.current.getRawCellFormula(id, field);

    if (rawFormula) {
      setInputValue(rawFormula);
    } else {
      const value = apiRef.current.getCellValue(id, field);
      setInputValue(value != null ? String(value) : '');
    }

    // Auto-focus the formula bar input when a cell is selected
    inputRef.current?.focus();
  }, [apiRef, focusedCell]);

  const handleSubmit = React.useCallback(() => {
    if (focusedRowId == null || focusedField == null) {
      return;
    }

    // Determine if this is a column formula cell
    const columnFormula = apiRef.current.getColumnFormula(focusedField);

    if (columnFormula !== null && isFormulaValue(inputValue)) {
      // Editing a column formula -> update column formula (affects all rows)
      apiRef.current.setColumnFormula(focusedField, inputValue);
    } else {
      // Editing a row value or row formula -> route through the edit pipeline
      // to respect valueParser/valueSetter on the column definition
      const column = apiRef.current.getColumn(focusedField);
      let parsedValue: unknown = inputValue;
      if (column?.valueParser) {
        parsedValue = column.valueParser(
          inputValue,
          apiRef.current.getRow(focusedRowId),
          column,
          apiRef,
        );
      }
      const row = apiRef.current.getRow(focusedRowId);
      if (row) {
        if (column?.valueSetter) {
          const updatedRow = column.valueSetter(parsedValue as never, row, column, apiRef);
          apiRef.current.updateRows([updatedRow]);
        } else {
          apiRef.current.updateRows([{ ...row, [focusedField]: parsedValue }]);
        }
      }
    }
  }, [apiRef, focusedRowId, focusedField, inputValue]);

  const handleKeyDown = React.useCallback(
    (event: React.KeyboardEvent) => {
      if (event.key === 'Enter') {
        event.preventDefault();
        handleSubmit();
      }
      if (event.key === 'Escape' && focusedCell) {
        // Reset to original value
        const { id, field } = focusedCell;
        const rawFormula = apiRef.current.getRawCellFormula(id, field);

        if (rawFormula) {
          setInputValue(rawFormula);
        } else {
          const value = apiRef.current.getCellValue(id, field);
          setInputValue(value != null ? String(value) : '');
        }
      }
    },
    [apiRef, focusedCell, handleSubmit],
  );

  return (
    <FormulaBarRoot>
      <CellLabel>{cellLabel || '\u2014'}</CellLabel>
      <FormulaInput
        ref={inputRef}
        value={inputValue}
        onChange={(event) => setInputValue(event.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="Select a cell..."
        disabled={!focusedCell}
      />
    </FormulaBarRoot>
  );
}
