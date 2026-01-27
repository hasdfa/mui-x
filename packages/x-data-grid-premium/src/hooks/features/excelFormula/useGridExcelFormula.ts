'use client';
import * as React from 'react';
import { RefObject } from '@mui/x-internals/types';
import { useGridApiMethod, gridColumnLookupSelector, GridColDef } from '@mui/x-data-grid-pro';
import { GridStateInitializer } from '@mui/x-data-grid-pro/internals';
import { GridPrivateApiPremium } from '../../../models/gridApiPremium';
import { DataGridPremiumProcessedProps } from '../../../models/dataGridPremiumProps';
import {
  GridExcelFormulaApi,
  GridExcelFormulaPrivateApi,
  GridFormulaNode,
  GridFormulaContext,
} from './gridExcelFormulaInterfaces';
import { parseFormula, isFormulaError } from './formulaParser';
import { evaluateFormula } from './formulaEvaluator';

/**
 * Checks if a value is a formula string (starts with "=").
 */
function isFormulaValue(value: unknown): value is string {
  return typeof value === 'string' && value.startsWith('=');
}

export const excelFormulaStateInitializer: GridStateInitializer<
  Pick<DataGridPremiumProcessedProps, 'experimentalFeatures'>,
  GridPrivateApiPremium
> = (state, props) => {
  if (!props.experimentalFeatures?.excelFormula) {
    return state;
  }

  return {
    ...state,
    excelFormula: {
      formulaCache: new Map(),
      columnFormulas: {},
    },
  };
};

export const useGridExcelFormula = (
  apiRef: RefObject<GridPrivateApiPremium>,
  props: Pick<DataGridPremiumProcessedProps, 'experimentalFeatures'>,
): void => {
  const isEnabled = props.experimentalFeatures?.excelFormula === true;

  /**
   * PRIVATE API METHODS
   */
  const parseFormulaMethod = React.useCallback<GridExcelFormulaPrivateApi['parseFormula']>(
    (formula: string) => {
      // Check cache first
      const state = apiRef.current.state.excelFormula;
      if (state?.formulaCache.has(formula)) {
        return state.formulaCache.get(formula)!;
      }

      // Parse and cache
      const result = parseFormula(formula);

      // Update cache
      apiRef.current.setState((prevState) => {
        const newCache = new Map(prevState.excelFormula?.formulaCache);
        newCache.set(formula, result);
        return {
          ...prevState,
          excelFormula: {
            formulaCache: newCache,
            columnFormulas: prevState.excelFormula?.columnFormulas ?? {},
          },
        };
      });

      return result;
    },
    [apiRef],
  );

  const clearFormulaCache = React.useCallback<
    GridExcelFormulaPrivateApi['clearFormulaCache']
  >(() => {
    apiRef.current.setState((prevState) => ({
      ...prevState,
      excelFormula: {
        formulaCache: new Map(),
        columnFormulas: prevState.excelFormula?.columnFormulas ?? {},
      },
    }));
  }, [apiRef]);

  /**
   * PUBLIC API METHODS
   */
  const isFormula = React.useCallback<GridExcelFormulaApi['isFormula']>(
    (value: unknown): value is string => {
      return isFormulaValue(value);
    },
    [],
  );

  const evaluateFormulaMethod = React.useCallback<GridExcelFormulaApi['evaluateFormula']>(
    (formula: string, rowId) => {
      // Validate formula starts with "="
      if (!formula.startsWith('=')) {
        return {
          value: formula,
          isFormula: false,
        };
      }

      // Remove the "=" prefix and parse
      const formulaBody = formula.slice(1);
      const ast = parseFormulaMethod(formulaBody);

      // Check for parse error
      if (isFormulaError(ast)) {
        return {
          value: undefined,
          error: ast,
          isFormula: true,
        };
      }

      // Get the row
      const row = apiRef.current.getRow(rowId);
      if (!row) {
        return {
          value: undefined,
          error: {
            type: 'REF_ERROR',
            message: `Row with id "${rowId}" not found`,
          },
          isFormula: true,
        };
      }

      // Build column map
      const columnLookup = gridColumnLookupSelector(apiRef);
      const columns = new Map<string, GridColDef>();
      Object.keys(columnLookup).forEach((field) => {
        columns.set(field, columnLookup[field]);
      });

      // Create evaluation context
      const context: GridFormulaContext = {
        row,
        rowId,
        field: '', // Will be set by the caller if needed
        columns,
        apiRef,
      };

      // Evaluate the formula
      return evaluateFormula(ast as GridFormulaNode, context);
    },
    [apiRef, parseFormulaMethod],
  );

  const getCellFormula = React.useCallback<GridExcelFormulaApi['getCellFormula']>(
    (rowId, field) => {
      const row = apiRef.current.getRow(rowId);
      if (!row) {
        return null;
      }

      // Check row value first
      const value = row[field];
      if (isFormulaValue(value)) {
        return value;
      }

      // Check column formula as fallback
      const columnLookup = gridColumnLookupSelector(apiRef);
      const column = columnLookup[field];
      if (column?.formula && isFormulaValue(column.formula)) {
        return column.formula;
      }

      return null;
    },
    [apiRef],
  );

  const getColumnFormula = React.useCallback<GridExcelFormulaApi['getColumnFormula']>(
    (field) => {
      // Check state formula first
      const stateFormula = apiRef.current.state.excelFormula?.columnFormulas[field];
      if (stateFormula) {
        return stateFormula;
      }

      // Fall back to default formula
      const columnLookup = gridColumnLookupSelector(apiRef);
      const column = columnLookup[field];
      const defaultFormula = column?.defaultFormula ?? column?.formula;
      if (defaultFormula && isFormulaValue(defaultFormula)) {
        return defaultFormula;
      }
      return null;
    },
    [apiRef],
  );

  const setColumnFormula = React.useCallback<GridExcelFormulaApi['setColumnFormula']>(
    (field, formula) => {
      // Update state for API queries
      apiRef.current.setState((prevState) => {
        const currentFormulas = prevState.excelFormula?.columnFormulas ?? {};
        const newColumnFormulas = { ...currentFormulas };
        if (formula === null) {
          delete newColumnFormulas[field];
        } else {
          newColumnFormulas[field] = formula;
        }
        return {
          ...prevState,
          excelFormula: {
            formulaCache: prevState.excelFormula?.formulaCache ?? new Map(),
            columnFormulas: newColumnFormulas,
          },
        };
      });

      // Update the column definition with the new formula
      // This triggers column re-hydration and cell re-rendering
      const column = apiRef.current.getColumn(field);
      if (column) {
        const updatedColumn = {
          ...column,
          // Use a special property to store the active formula
          // Our preprocessor will check this first
          _activeFormula: formula,
        };
        apiRef.current.updateColumns([updatedColumn]);
      }

      // Force cell re-renders by re-setting the same rows
      // This triggers a row data change that React can detect
      const allRows = apiRef.current.getRowModels();
      const rowsArray = Array.from(allRows.values());
      if (rowsArray.length > 0) {
        apiRef.current.setRows(rowsArray);
      }
    },
    [apiRef],
  );

  const getRawCellFormula = React.useCallback<GridExcelFormulaApi['getRawCellFormula']>(
    (rowId, field) => {
      // Priority 1: State column formula
      const stateFormula = apiRef.current.state.excelFormula?.columnFormulas[field];
      if (stateFormula) {
        return stateFormula;
      }

      // Priority 2: Default column formula
      const columnLookup = gridColumnLookupSelector(apiRef);
      const column = columnLookup[field];
      const defaultFormula = column?.defaultFormula ?? column?.formula;
      if (defaultFormula && isFormulaValue(defaultFormula)) {
        return defaultFormula;
      }

      // Priority 3: Row formula
      const row = apiRef.current.getRow(rowId);
      const rowValue = row?.[field];
      if (isFormulaValue(rowValue)) {
        return rowValue;
      }

      return null;
    },
    [apiRef],
  );

  // Register API methods only when feature is enabled
  const publicApi: GridExcelFormulaApi = React.useMemo(
    () => ({
      evaluateFormula: evaluateFormulaMethod,
      isFormula,
      getCellFormula,
      getColumnFormula,
      setColumnFormula,
      getRawCellFormula,
    }),
    [
      evaluateFormulaMethod,
      isFormula,
      getCellFormula,
      getColumnFormula,
      setColumnFormula,
      getRawCellFormula,
    ],
  );

  const privateApi: GridExcelFormulaPrivateApi = React.useMemo(
    () => ({
      parseFormula: parseFormulaMethod,
      clearFormulaCache,
    }),
    [parseFormulaMethod, clearFormulaCache],
  );

  useGridApiMethod(apiRef, isEnabled ? publicApi : {}, 'public');
  useGridApiMethod(apiRef, isEnabled ? privateApi : {}, 'private');

  // Clear cache when columns change (column names might have changed)
  React.useEffect(() => {
    if (!isEnabled) {
      return undefined;
    }
    return apiRef.current.subscribeEvent('columnsChange', () => {
      clearFormulaCache();
    });
  }, [apiRef, clearFormulaCache, isEnabled]);
};
