import { createSelector, createRootSelector } from '@mui/x-data-grid-pro/internals';
import { GridStatePremium } from '../../../models/gridStatePremium';

/**
 * Get the excel formula state.
 * @category ExcelFormula
 */
export const gridExcelFormulaStateSelector = createRootSelector(
  (state: GridStatePremium) => state.excelFormula,
);

/**
 * Get the column formulas from state.
 * @category ExcelFormula
 */
export const gridColumnFormulasSelector = createSelector(
  gridExcelFormulaStateSelector,
  (excelFormulaState) => excelFormulaState?.columnFormulas ?? {},
);

/**
 * Get the formula for a specific column from state.
 * @category ExcelFormula
 */
export const gridColumnFormulaSelector = createSelector(
  gridColumnFormulasSelector,
  (columnFormulas, { field }: { field: string }) => columnFormulas[field] ?? null,
);
