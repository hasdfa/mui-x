import type {
  GridFormulaNode,
  GridFormulaResult,
  GridFormulaError,
  GridFormulaContext,
  GridFormulaLiteralNode,
  GridFormulaColumnRefNode,
  GridFormulaBinaryNode,
  GridFormulaUnaryNode,
  GridFormulaFunctionNode,
  GridFormulaGroupNode,
} from './gridExcelFormulaInterfaces';
import { getFormulaFunction } from './formulaFunctions';
import { parseFormula, isFormulaError } from './formulaParser';

/**
 * Type guard to check if a value is a GridFormulaError.
 */
function isError(value: unknown): value is GridFormulaError {
  return (
    typeof value === 'object' &&
    value !== null &&
    'type' in value &&
    'message' in value &&
    typeof (value as GridFormulaError).type === 'string' &&
    typeof (value as GridFormulaError).message === 'string'
  );
}

/**
 * Checks if a value is a formula string (starts with "=").
 */
function isFormulaValue(value: unknown): value is string {
  return typeof value === 'string' && value.startsWith('=');
}

function createCircularReferenceError(
  columnName: string,
  isSelfReference: boolean,
): GridFormulaError {
  return {
    type: 'CIRCULAR_REF',
    message: isSelfReference
      ? `Circular reference: column "${columnName}" references itself`
      : `Circular reference: column "${columnName}" is part of a circular dependency`,
  };
}

function getFormulaAst(
  formulaBody: string,
  context: GridFormulaContext,
): GridFormulaNode | GridFormulaError {
  const cached = context.apiRef.current.state.excelFormula?.formulaCache.get(formulaBody);
  if (cached) {
    return cached;
  }
  return parseFormula(formulaBody);
}

function evaluateFormulaString(
  formulaString: string,
  field: string,
  context: GridFormulaContext,
): unknown | GridFormulaError {
  const formulaBody = formulaString.slice(1);
  const ast = getFormulaAst(formulaBody, context);

  if (isFormulaError(ast)) {
    return ast;
  }

  const result = evaluateFormula(ast, {
    row: context.row,
    rowId: context.rowId,
    field,
    columns: context.columns,
    apiRef: context.apiRef,
    visitedFields: context.visitedFields,
  });

  if (result.error) {
    return result.error;
  }

  return result.value;
}

/**
 * Evaluates a literal node.
 */
function evaluateLiteral(node: GridFormulaLiteralNode): unknown {
  return node.value;
}

/**
 * Evaluates a column reference node.
 */
function evaluateColumnRef(
  node: GridFormulaColumnRefNode,
  context: GridFormulaContext,
): unknown | GridFormulaError {
  const { columnName } = node;
  const { row, field, columns, apiRef } = context;
  const visitedFields = context.visitedFields ?? new Set<string>();
  if (!context.visitedFields) {
    context.visitedFields = visitedFields;
  }

  // Check for circular reference (self-reference)
  if (columnName === field) {
    return createCircularReferenceError(columnName, true);
  }

  if (visitedFields.has(columnName)) {
    return createCircularReferenceError(columnName, false);
  }

  // Check if column exists
  const colDef = columns.get(columnName);
  if (!colDef) {
    return {
      type: 'REF_ERROR',
      message: `Unknown column "${columnName}"`,
    } as GridFormulaError;
  }

  const stateFormula = apiRef.current.state.excelFormula?.columnFormulas[columnName];
  // eslint-disable-next-line no-underscore-dangle
  const activeFormula = (colDef as { _activeFormula?: string | null })._activeFormula ?? undefined;
  const columnFormula = stateFormula ?? activeFormula ?? colDef.defaultFormula ?? colDef.formula;

  if (columnFormula && isFormulaValue(columnFormula)) {
    return evaluateFormulaString(columnFormula, columnName, context);
  }

  const rowValue = row[columnName];
  if (isFormulaValue(rowValue)) {
    return evaluateFormulaString(rowValue, columnName, context);
  }

  // Get the value from the row
  let value: unknown;

  // If the column has a valueGetter, use it
  if (colDef.valueGetter) {
    value = colDef.valueGetter(rowValue as never, row, colDef, apiRef);
  } else {
    value = rowValue;
  }

  return value;
}

/**
 * Converts a value to a number for arithmetic operations.
 */
function toNumber(value: unknown): number {
  if (typeof value === 'number') {
    return value;
  }
  if (typeof value === 'string') {
    const num = parseFloat(value);
    if (!Number.isNaN(num)) {
      return num;
    }
  }
  if (typeof value === 'boolean') {
    return value ? 1 : 0;
  }
  return NaN;
}

/**
 * Evaluates a binary operation node.
 */
function evaluateBinary(
  node: GridFormulaBinaryNode,
  context: GridFormulaContext,
): unknown | GridFormulaError {
  const left = evaluateNode(node.left, context);
  if (isError(left)) {
    return left;
  }

  const right = evaluateNode(node.right, context);
  if (isError(right)) {
    return right;
  }

  const { operator } = node;

  // Arithmetic operations
  if (['+', '-', '*', '/'].includes(operator)) {
    const leftNum = toNumber(left);
    const rightNum = toNumber(right);
    const leftIsNumeric = !Number.isNaN(leftNum);
    const rightIsNumeric = !Number.isNaN(rightNum);

    // String concatenation with +
    if (operator === '+') {
      if (leftIsNumeric && rightIsNumeric) {
        return leftNum + rightNum;
      }
      if (typeof left === 'string' || typeof right === 'string') {
        return String(left ?? '') + String(right ?? '');
      }
    }

    if (!leftIsNumeric || !rightIsNumeric) {
      return {
        type: 'VALUE_ERROR',
        message: `Cannot perform arithmetic on non-numeric values`,
      } as GridFormulaError;
    }

    switch (operator) {
      case '-':
        return leftNum - rightNum;
      case '*':
        return leftNum * rightNum;
      case '/':
        if (rightNum === 0) {
          return {
            type: 'VALUE_ERROR',
            message: 'Division by zero',
          } as GridFormulaError;
        }
        return leftNum / rightNum;
      default:
        break;
    }
  }

  // Comparison operations
  switch (operator) {
    case '>':
      return toNumber(left) > toNumber(right);
    case '<':
      return toNumber(left) < toNumber(right);
    case '>=':
      return toNumber(left) >= toNumber(right);
    case '<=':
      return toNumber(left) <= toNumber(right);
    case '==':
      // eslint-disable-next-line eqeqeq
      return left == right;
    case '!=':
      // eslint-disable-next-line eqeqeq
      return left != right;
    default:
      return {
        type: 'PARSE_ERROR',
        message: `Unknown operator "${operator}"`,
      } as GridFormulaError;
  }
}

/**
 * Evaluates a unary operation node.
 */
function evaluateUnary(
  node: GridFormulaUnaryNode,
  context: GridFormulaContext,
): unknown | GridFormulaError {
  const operand = evaluateNode(node.operand, context);
  if (isError(operand)) {
    return operand;
  }

  switch (node.operator) {
    case '-': {
      const num = toNumber(operand);
      if (Number.isNaN(num)) {
        return {
          type: 'VALUE_ERROR',
          message: 'Cannot negate non-numeric value',
        } as GridFormulaError;
      }
      return -num;
    }
    case '!':
      return !operand;
    default:
      return {
        type: 'PARSE_ERROR',
        message: `Unknown unary operator "${node.operator}"`,
      } as GridFormulaError;
  }
}

/**
 * Evaluates a function call node.
 */
function evaluateFunction(
  node: GridFormulaFunctionNode,
  context: GridFormulaContext,
): unknown | GridFormulaError {
  const func = getFormulaFunction(node.name);
  if (!func) {
    return {
      type: 'FUNC_ERROR',
      message: `Unknown function "${node.name}"`,
    } as GridFormulaError;
  }

  // Evaluate all arguments
  const evaluatedArgs: unknown[] = [];
  for (const arg of node.args) {
    const result = evaluateNode(arg, context);
    if (isError(result)) {
      return result;
    }
    evaluatedArgs.push(result);
  }

  // Validate argument count
  if (func.minArgs !== undefined && evaluatedArgs.length < func.minArgs) {
    return {
      type: 'FUNC_ERROR',
      message: `Function ${node.name} requires at least ${func.minArgs} arguments`,
    } as GridFormulaError;
  }

  if (func.maxArgs !== undefined && evaluatedArgs.length > func.maxArgs) {
    return {
      type: 'FUNC_ERROR',
      message: `Function ${node.name} accepts at most ${func.maxArgs} arguments`,
    } as GridFormulaError;
  }

  try {
    return func.evaluate(evaluatedArgs, context);
  } catch (error) {
    return {
      type: 'FUNC_ERROR',
      message: `Error executing function ${node.name}: ${error instanceof Error ? error.message : String(error)}`,
    } as GridFormulaError;
  }
}

/**
 * Evaluates a grouped expression node.
 */
function evaluateGroup(
  node: GridFormulaGroupNode,
  context: GridFormulaContext,
): unknown | GridFormulaError {
  return evaluateNode(node.expression, context);
}

/**
 * Evaluates any formula node.
 */
function evaluateNode(
  node: GridFormulaNode,
  context: GridFormulaContext,
): unknown | GridFormulaError {
  switch (node.type) {
    case 'literal':
      return evaluateLiteral(node);
    case 'columnRef':
      return evaluateColumnRef(node, context);
    case 'binary':
      return evaluateBinary(node, context);
    case 'unary':
      return evaluateUnary(node, context);
    case 'function':
      return evaluateFunction(node, context);
    case 'group':
      return evaluateGroup(node, context);
    default:
      return {
        type: 'PARSE_ERROR',
        message: `Unknown node type`,
      } as GridFormulaError;
  }
}

/**
 * Evaluates a parsed formula AST.
 * @param {GridFormulaNode} ast - The parsed AST.
 * @param {GridFormulaContext} context - The evaluation context.
 * @returns {GridFormulaResult} The evaluation result.
 */
export function evaluateFormula(
  ast: GridFormulaNode,
  context: GridFormulaContext,
): GridFormulaResult {
  const visitedFields = context.visitedFields ?? new Set<string>();
  if (!context.visitedFields) {
    context.visitedFields = visitedFields;
  }

  let didAddField = false;
  if (context.field) {
    if (visitedFields.has(context.field)) {
      return {
        value: undefined,
        error: createCircularReferenceError(context.field, false),
        isFormula: true,
      };
    }
    visitedFields.add(context.field);
    didAddField = true;
  }

  let result: unknown | GridFormulaError;
  try {
    result = evaluateNode(ast, context);
  } finally {
    if (didAddField) {
      visitedFields.delete(context.field);
    }
  }

  if (isError(result)) {
    return {
      value: undefined,
      error: result,
      isFormula: true,
    };
  }

  return {
    value: result,
    isFormula: true,
  };
}

/**
 * Formats an error for display in a cell.
 */
export function formatFormulaError(error: GridFormulaError): string {
  switch (error.type) {
    case 'REF_ERROR':
      return '#REF!';
    case 'VALUE_ERROR':
      return '#VALUE!';
    case 'PARSE_ERROR':
      return '#SYNTAX!';
    case 'CIRCULAR_REF':
      return '#CIRC!';
    case 'FUNC_ERROR':
      return '#FUNC!';
    default:
      return '#ERROR!';
  }
}
