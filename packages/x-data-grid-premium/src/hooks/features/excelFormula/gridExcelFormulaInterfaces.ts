import type { GridRowId, GridColDef, GridValidRowModel } from '@mui/x-data-grid-pro';
import type { RefObject } from '@mui/x-internals/types';
import type { GridApiPremium } from '../../../models/gridApiPremium';

/**
 * Error types for formula evaluation.
 */
export type GridFormulaErrorType =
  | 'PARSE_ERROR' // Invalid syntax
  | 'REF_ERROR' // Invalid column reference
  | 'VALUE_ERROR' // Type mismatch in operation
  | 'CIRCULAR_REF' // Self-reference detected
  | 'FUNC_ERROR'; // Unknown or invalid function

/**
 * Error object returned when formula evaluation fails.
 */
export interface GridFormulaError {
  type: GridFormulaErrorType;
  message: string;
}

/**
 * AST node types for parsed formulas.
 */
export type GridFormulaNode =
  | GridFormulaLiteralNode
  | GridFormulaColumnRefNode
  | GridFormulaBinaryNode
  | GridFormulaUnaryNode
  | GridFormulaFunctionNode
  | GridFormulaGroupNode;

export interface GridFormulaLiteralNode {
  type: 'literal';
  value: number | string | boolean;
}

export interface GridFormulaColumnRefNode {
  type: 'columnRef';
  columnName: string;
}

export interface GridFormulaBinaryNode {
  type: 'binary';
  operator: '+' | '-' | '*' | '/' | '>' | '<' | '>=' | '<=' | '==' | '!=';
  left: GridFormulaNode;
  right: GridFormulaNode;
}

export interface GridFormulaUnaryNode {
  type: 'unary';
  operator: '-' | '!';
  operand: GridFormulaNode;
}

export interface GridFormulaFunctionNode {
  type: 'function';
  name: string;
  args: GridFormulaNode[];
}

export interface GridFormulaGroupNode {
  type: 'group';
  expression: GridFormulaNode;
}

/**
 * Result of formula evaluation.
 */
export interface GridFormulaResult {
  value: unknown;
  error?: GridFormulaError;
  isFormula: boolean;
}

/**
 * Context passed during formula evaluation.
 */
export interface GridFormulaContext<R extends GridValidRowModel = GridValidRowModel> {
  row: R;
  rowId: GridRowId;
  field: string;
  columns: Map<string, GridColDef<R>>;
  apiRef: RefObject<GridApiPremium>;
  /**
   * Tracks visited fields during evaluation to detect circular references.
   */
  visitedFields?: Set<string>;
}

/**
 * Built-in formula function definition.
 */
export interface GridFormulaFunction<T = unknown> {
  /**
   * The function name (uppercase).
   */
  name: string;
  /**
   * Minimum number of arguments required.
   */
  minArgs?: number;
  /**
   * Maximum number of arguments allowed.
   */
  maxArgs?: number;
  /**
   * Evaluate the function with the given arguments.
   * @param {unknown[]} args - The evaluated arguments.
   * @param {GridFormulaContext} context - The formula context.
   * @returns {T} The result of the function.
   */
  evaluate: (args: unknown[], context: GridFormulaContext) => T;
}

/**
 * State for the Excel Formula feature.
 */
export interface GridExcelFormulaState {
  /**
   * Cache of parsed formula ASTs keyed by formula string.
   */
  formulaCache: Map<string, GridFormulaNode | GridFormulaError>;
  /**
   * Active column formulas that override defaultFormula.
   * Maps field name to formula string.
   */
  columnFormulas: Record<string, string>;
}

/**
 * Initial state for the Excel Formula feature.
 */
export interface GridExcelFormulaInitialState {}

/**
 * Public API methods for the Excel Formula feature.
 */
export interface GridExcelFormulaApi {
  /**
   * Evaluates a formula string in the context of a row.
   * @param {string} formula - The formula string (starting with "=").
   * @param {GridRowId} rowId - The ID of the row to evaluate in.
   * @returns {GridFormulaResult} The evaluation result.
   */
  evaluateFormula: (formula: string, rowId: GridRowId) => GridFormulaResult;
  /**
   * Checks if a value is a formula (string starting with "=").
   * @param {unknown} value - The value to check.
   * @returns {boolean} True if the value is a formula.
   */
  isFormula: (value: unknown) => value is string;
  /**
   * Gets the raw formula string from a cell if it contains a formula.
   * Returns the row formula if present, otherwise returns the column formula.
   * @param {GridRowId} rowId - The row ID.
   * @param {string} field - The field name.
   * @returns {string | null} The formula string or null if not a formula.
   */
  getCellFormula: (rowId: GridRowId, field: string) => string | null;
  /**
   * Gets the active formula for a column.
   * Returns the state formula if set, otherwise returns the defaultFormula.
   * @param {string} field - The field name.
   * @returns {string | null} The column formula or null if not defined.
   */
  getColumnFormula: (field: string) => string | null;
  /**
   * Sets the active formula for a column, overriding the defaultFormula.
   * Pass null to reset to the defaultFormula.
   * @param {string} field - The field name.
   * @param {string | null} formula - The formula string or null to reset.
   */
  setColumnFormula: (field: string, formula: string | null) => void;
  /**
   * Gets the raw formula string for editing (not the computed value).
   * Returns state formula, then defaultFormula, then row value formula.
   * @param {GridRowId} rowId - The row ID.
   * @param {string} field - The field name.
   * @returns {string | null} The formula string or null if not a formula.
   */
  getRawCellFormula: (rowId: GridRowId, field: string) => string | null;
}

/**
 * Private API methods for the Excel Formula feature.
 */
export interface GridExcelFormulaPrivateApi {
  /**
   * Parses a formula string into an AST.
   * @param {string} formula - The formula string (without "=" prefix).
   * @returns {GridFormulaNode | GridFormulaError} The parsed AST or error.
   */
  parseFormula: (formula: string) => GridFormulaNode | GridFormulaError;
  /**
   * Clears the formula cache.
   */
  clearFormulaCache: () => void;
}
