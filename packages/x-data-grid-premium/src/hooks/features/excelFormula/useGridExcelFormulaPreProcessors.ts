'use client';
import * as React from 'react';
import { RefObject } from '@mui/x-internals/types';
import { GridColDef, gridColumnLookupSelector } from '@mui/x-data-grid-pro';
import {
  GridPipeProcessor,
  useGridRegisterPipeProcessor,
  GridBaseColDef,
} from '@mui/x-data-grid-pro/internals';
import { GridPrivateApiPremium } from '../../../models/gridApiPremium';
import { DataGridPremiumProcessedProps } from '../../../models/dataGridPremiumProps';
import { GridFormulaContext } from './gridExcelFormulaInterfaces';
import { parseFormula, isFormulaError } from './formulaParser';
import { evaluateFormula, formatFormulaError } from './formulaEvaluator';

/**
 * Symbol to mark columns that have been wrapped with formula support.
 */
const FORMULA_WRAPPED_PROPERTY = Symbol('formulaWrapped');

interface GridColDefWithFormulaWrapper extends GridBaseColDef {
  [FORMULA_WRAPPED_PROPERTY]?: {
    originalValueGetter: GridBaseColDef['valueGetter'];
  };
}

/**
 * Checks if a value is a formula string (starts with "=").
 */
function isFormulaValue(value: unknown): value is string {
  return typeof value === 'string' && value.startsWith('=');
}

/**
 * Evaluates a formula string and returns the result.
 */
function evaluateFormulaString(
  formulaString: string,
  row: any,
  col: GridColDef,
  apiRef: RefObject<GridPrivateApiPremium>,
): unknown {
  // Parse and evaluate the formula
  const formulaBody = formulaString.slice(1); // Remove "=" prefix

  // Use cache from API if available
  let ast = apiRef.current.state.excelFormula?.formulaCache.get(formulaBody);
  if (!ast) {
    ast = parseFormula(formulaBody);
    // Note: We can't update the cache from here since this is a pure function
    // The cache will be populated when evaluateFormula is called via API
  }

  // Check for parse error
  if (isFormulaError(ast)) {
    return formatFormulaError(ast);
  }

  // Build column map for context
  const columnLookup = gridColumnLookupSelector(apiRef);
  const columns = new Map<string, GridColDef>();
  Object.keys(columnLookup).forEach((field) => {
    columns.set(field, columnLookup[field]);
  });

  // Create evaluation context
  // eslint-disable-next-line no-underscore-dangle
  const rowId = row.id ?? row.__rowId;
  const context: GridFormulaContext = {
    row,
    rowId,
    field: col.field,
    columns,
    apiRef,
  };

  // Evaluate the formula
  const result = evaluateFormula(ast, context);

  if (result.error) {
    return formatFormulaError(result.error);
  }

  return result.value;
}

/**
 * Wraps a column's valueGetter to evaluate formulas.
 */
function wrapColumnWithFormulaSupport(
  column: GridColDef,
  apiRef: RefObject<GridPrivateApiPremium>,
): GridColDef {
  const wrappedColumn = column as GridColDefWithFormulaWrapper;

  // Get original values - if already wrapped, use the saved originals
  let originalValueGetter: GridBaseColDef['valueGetter'];

  if (wrappedColumn[FORMULA_WRAPPED_PROPERTY]) {
    // Unwrap to get originals
    originalValueGetter = wrappedColumn[FORMULA_WRAPPED_PROPERTY].originalValueGetter;
  } else {
    originalValueGetter = column.valueGetter;
  }

  const wrappedValueGetter: GridBaseColDef['valueGetter'] = (value, row, col, api) => {
    // Priority 1: State column formula (set via setColumnFormula API at runtime)
    // Read directly from state so changes are reflected immediately
    const stateFormula = apiRef.current.state.excelFormula?.columnFormulas[col.field];
    if (stateFormula && isFormulaValue(stateFormula)) {
      return evaluateFormulaString(stateFormula, row, col, apiRef);
    }

    // Priority 2: Active formula (set via setColumnFormula API)
    // This is stored on the column definition itself for proper React re-rendering
    // eslint-disable-next-line no-underscore-dangle
    const activeFormula = (col as any)._activeFormula;
    if (activeFormula && isFormulaValue(activeFormula)) {
      return evaluateFormulaString(activeFormula, row, col, apiRef);
    }

    // Priority 3: Default column formula (from column definition)
    // Use the column's defaultFormula/formula property
    const colDefaultFormula = col.defaultFormula ?? col.formula;
    if (colDefaultFormula && isFormulaValue(colDefaultFormula)) {
      return evaluateFormulaString(colDefaultFormula, row, col, apiRef);
    }

    // Priority 3: Get the raw value (either directly or through original valueGetter)
    let rawValue: unknown;
    if (originalValueGetter) {
      rawValue = originalValueGetter(value, row, col, api);
    } else {
      rawValue = value;
    }

    // Priority 4: If raw value is a formula, evaluate it
    if (isFormulaValue(rawValue)) {
      return evaluateFormulaString(rawValue, row, col, apiRef);
    }

    // Priority 5: Return raw value as-is
    return rawValue;
  };

  const newColumn: GridColDefWithFormulaWrapper = {
    ...column,
    valueGetter: wrappedValueGetter,
    [FORMULA_WRAPPED_PROPERTY]: {
      originalValueGetter,
    },
  };

  return newColumn as GridColDef;
}

/**
 * Unwraps a column from formula support.
 */
function unwrapColumnFromFormulaSupport(column: GridColDef): GridColDef {
  const wrappedColumn = column as GridColDefWithFormulaWrapper;

  if (!wrappedColumn[FORMULA_WRAPPED_PROPERTY]) {
    return column;
  }

  const { originalValueGetter } = wrappedColumn[FORMULA_WRAPPED_PROPERTY];

  const newColumn: GridColDef = {
    ...column,
    valueGetter: originalValueGetter,
  };

  delete (newColumn as GridColDefWithFormulaWrapper)[FORMULA_WRAPPED_PROPERTY];

  return newColumn;
}

export const useGridExcelFormulaPreProcessors = (
  apiRef: RefObject<GridPrivateApiPremium>,
  props: Pick<DataGridPremiumProcessedProps, 'experimentalFeatures'>,
): void => {
  const isEnabled = props.experimentalFeatures?.excelFormula === true;

  const updateColumnsWithFormulaSupport = React.useCallback<GridPipeProcessor<'hydrateColumns'>>(
    (columnsState) => {
      columnsState.orderedFields.forEach((field) => {
        let column = columnsState.lookup[field];
        const wrappedColumn = column as GridColDefWithFormulaWrapper;
        const isWrapped = !!wrappedColumn[FORMULA_WRAPPED_PROPERTY];

        // Unwrap first if previously wrapped (to handle re-processing)
        if (isWrapped) {
          column = unwrapColumnFromFormulaSupport(column);
        }

        // Wrap if feature is enabled
        if (isEnabled) {
          column = wrapColumnWithFormulaSupport(column, apiRef);
        }

        columnsState.lookup[field] = column;
      });

      return columnsState;
    },
    [apiRef, isEnabled],
  );

  // Prevent cell focus from being cleared when clicking outside the grid
  const preventFocusLoss = React.useCallback<GridPipeProcessor<'canUpdateFocus'>>(
    (initialValue, { cell }) => {
      if (!isEnabled) {
        return initialValue;
      }
      // If clicking outside grid (no cell target), prevent focus clearing
      if (!cell) {
        return false;
      }
      return initialValue;
    },
    [isEnabled],
  );

  useGridRegisterPipeProcessor(apiRef, 'hydrateColumns', updateColumnsWithFormulaSupport);
  useGridRegisterPipeProcessor(apiRef, 'canUpdateFocus', preventFocusLoss);
};
