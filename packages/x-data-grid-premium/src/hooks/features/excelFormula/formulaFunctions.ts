import type { GridFormulaFunction } from './gridExcelFormulaInterfaces';

/**
 * Helper to convert values to numbers for math operations.
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
 * Helper to flatten arguments (for functions that accept arrays).
 */
function flattenArgs(args: unknown[]): unknown[] {
  const result: unknown[] = [];
  for (const arg of args) {
    if (Array.isArray(arg)) {
      result.push(...flattenArgs(arg));
    } else {
      result.push(arg);
    }
  }
  return result;
}

/**
 * SUM function - returns the sum of all numeric arguments.
 */
const SUM: GridFormulaFunction<number> = {
  name: 'SUM',
  minArgs: 1,
  evaluate: (args) => {
    const values = flattenArgs(args)
      .map(toNumber)
      .filter((n) => !Number.isNaN(n));
    return values.reduce((acc, val) => acc + val, 0);
  },
};

/**
 * AVG (AVERAGE) function - returns the average of all numeric arguments.
 */
const AVG: GridFormulaFunction<number> = {
  name: 'AVG',
  minArgs: 1,
  evaluate: (args) => {
    const values = flattenArgs(args)
      .map(toNumber)
      .filter((n) => !Number.isNaN(n));
    if (values.length === 0) {
      return NaN;
    }
    return values.reduce((acc, val) => acc + val, 0) / values.length;
  },
};

/**
 * AVERAGE function - alias for AVG.
 */
const AVERAGE: GridFormulaFunction<number> = {
  name: 'AVERAGE',
  minArgs: 1,
  evaluate: AVG.evaluate,
};

/**
 * MIN function - returns the minimum of all numeric arguments.
 */
const MIN: GridFormulaFunction<number> = {
  name: 'MIN',
  minArgs: 1,
  evaluate: (args) => {
    const values = flattenArgs(args)
      .map(toNumber)
      .filter((n) => !Number.isNaN(n));
    if (values.length === 0) {
      return NaN;
    }
    return Math.min(...values);
  },
};

/**
 * MAX function - returns the maximum of all numeric arguments.
 */
const MAX: GridFormulaFunction<number> = {
  name: 'MAX',
  minArgs: 1,
  evaluate: (args) => {
    const values = flattenArgs(args)
      .map(toNumber)
      .filter((n) => !Number.isNaN(n));
    if (values.length === 0) {
      return NaN;
    }
    return Math.max(...values);
  },
};

/**
 * COUNT function - returns the count of numeric values.
 */
const COUNT: GridFormulaFunction<number> = {
  name: 'COUNT',
  minArgs: 1,
  evaluate: (args) => {
    const values = flattenArgs(args);
    return values.filter((v) => typeof v === 'number' && !Number.isNaN(v)).length;
  },
};

/**
 * COUNTA function - returns the count of non-empty values.
 */
const COUNTA: GridFormulaFunction<number> = {
  name: 'COUNTA',
  minArgs: 1,
  evaluate: (args) => {
    const values = flattenArgs(args);
    return values.filter((v) => v !== null && v !== undefined && v !== '').length;
  },
};

/**
 * ROUND function - rounds a number to specified decimal places.
 */
const ROUND: GridFormulaFunction<number> = {
  name: 'ROUND',
  minArgs: 1,
  maxArgs: 2,
  evaluate: (args) => {
    const value = toNumber(args[0]);
    const decimals = args.length > 1 ? toNumber(args[1]) : 0;
    if (Number.isNaN(value) || Number.isNaN(decimals)) {
      return NaN;
    }
    const factor = 10 ** Math.floor(decimals);
    return Math.round(value * factor) / factor;
  },
};

/**
 * FLOOR function - rounds down to specified decimal places.
 */
const FLOOR: GridFormulaFunction<number> = {
  name: 'FLOOR',
  minArgs: 1,
  maxArgs: 2,
  evaluate: (args) => {
    const value = toNumber(args[0]);
    const decimals = args.length > 1 ? toNumber(args[1]) : 0;
    if (Number.isNaN(value) || Number.isNaN(decimals)) {
      return NaN;
    }
    const factor = 10 ** Math.floor(decimals);
    return Math.floor(value * factor) / factor;
  },
};

/**
 * CEIL function - rounds up to specified decimal places.
 */
const CEIL: GridFormulaFunction<number> = {
  name: 'CEIL',
  minArgs: 1,
  maxArgs: 2,
  evaluate: (args) => {
    const value = toNumber(args[0]);
    const decimals = args.length > 1 ? toNumber(args[1]) : 0;
    if (Number.isNaN(value) || Number.isNaN(decimals)) {
      return NaN;
    }
    const factor = 10 ** Math.floor(decimals);
    return Math.ceil(value * factor) / factor;
  },
};

/**
 * ABS function - returns the absolute value.
 */
const ABS: GridFormulaFunction<number> = {
  name: 'ABS',
  minArgs: 1,
  maxArgs: 1,
  evaluate: (args) => {
    const value = toNumber(args[0]);
    return Math.abs(value);
  },
};

/**
 * IF function - conditional expression.
 */
const IF: GridFormulaFunction = {
  name: 'IF',
  minArgs: 3,
  maxArgs: 3,
  evaluate: (args) => {
    const condition = args[0];
    const trueValue = args[1];
    const falseValue = args[2];
    return condition ? trueValue : falseValue;
  },
};

/**
 * AND function - logical AND.
 */
const AND: GridFormulaFunction<boolean> = {
  name: 'AND',
  minArgs: 1,
  evaluate: (args) => {
    return args.every(Boolean);
  },
};

/**
 * OR function - logical OR.
 */
const OR: GridFormulaFunction<boolean> = {
  name: 'OR',
  minArgs: 1,
  evaluate: (args) => {
    return args.some(Boolean);
  },
};

/**
 * NOT function - logical NOT.
 */
const NOT: GridFormulaFunction<boolean> = {
  name: 'NOT',
  minArgs: 1,
  maxArgs: 1,
  evaluate: (args) => {
    return !args[0];
  },
};

/**
 * CONCAT function - concatenates strings.
 */
const CONCAT: GridFormulaFunction<string> = {
  name: 'CONCAT',
  minArgs: 1,
  evaluate: (args) => {
    return flattenArgs(args)
      .map((v) => (v === null || v === undefined ? '' : String(v)))
      .join('');
  },
};

/**
 * UPPER function - converts to uppercase.
 */
const UPPER: GridFormulaFunction<string> = {
  name: 'UPPER',
  minArgs: 1,
  maxArgs: 1,
  evaluate: (args) => {
    return String(args[0] ?? '').toUpperCase();
  },
};

/**
 * LOWER function - converts to lowercase.
 */
const LOWER: GridFormulaFunction<string> = {
  name: 'LOWER',
  minArgs: 1,
  maxArgs: 1,
  evaluate: (args) => {
    return String(args[0] ?? '').toLowerCase();
  },
};

/**
 * TRIM function - removes leading/trailing whitespace.
 */
const TRIM: GridFormulaFunction<string> = {
  name: 'TRIM',
  minArgs: 1,
  maxArgs: 1,
  evaluate: (args) => {
    return String(args[0] ?? '').trim();
  },
};

/**
 * LEN function - returns string length.
 */
const LEN: GridFormulaFunction<number> = {
  name: 'LEN',
  minArgs: 1,
  maxArgs: 1,
  evaluate: (args) => {
    return String(args[0] ?? '').length;
  },
};

/**
 * LEFT function - extracts characters from the left.
 */
const LEFT: GridFormulaFunction<string> = {
  name: 'LEFT',
  minArgs: 1,
  maxArgs: 2,
  evaluate: (args) => {
    const str = String(args[0] ?? '');
    const count = args.length > 1 ? toNumber(args[1]) : 1;
    return str.slice(0, Math.max(0, Math.floor(count)));
  },
};

/**
 * RIGHT function - extracts characters from the right.
 */
const RIGHT: GridFormulaFunction<string> = {
  name: 'RIGHT',
  minArgs: 1,
  maxArgs: 2,
  evaluate: (args) => {
    const str = String(args[0] ?? '');
    const count = args.length > 1 ? toNumber(args[1]) : 1;
    const n = Math.max(0, Math.floor(count));
    if (n === 0) {
      return '';
    }
    return str.slice(-n);
  },
};

/**
 * Registry of all built-in formula functions.
 */
export const FORMULA_FUNCTIONS: Record<string, GridFormulaFunction> = {
  SUM,
  AVG,
  AVERAGE,
  MIN,
  MAX,
  COUNT,
  COUNTA,
  ROUND,
  FLOOR,
  CEIL,
  ABS,
  IF,
  AND,
  OR,
  NOT,
  CONCAT,
  UPPER,
  LOWER,
  TRIM,
  LEN,
  LEFT,
  RIGHT,
};

/**
 * Gets a formula function by name.
 */
export function getFormulaFunction(name: string): GridFormulaFunction | undefined {
  return FORMULA_FUNCTIONS[name.toUpperCase()];
}
