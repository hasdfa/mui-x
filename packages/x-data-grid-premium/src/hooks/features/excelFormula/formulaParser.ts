import type {
  GridFormulaNode,
  GridFormulaError,
  GridFormulaLiteralNode,
  GridFormulaColumnRefNode,
  GridFormulaBinaryNode,
  GridFormulaUnaryNode,
  GridFormulaFunctionNode,
} from './gridExcelFormulaInterfaces';

/**
 * Token types for the formula lexer.
 */
type TokenType =
  | 'NUMBER'
  | 'STRING'
  | 'BOOLEAN'
  | 'COLUMN_REF'
  | 'IDENTIFIER'
  | 'OPERATOR'
  | 'LPAREN'
  | 'RPAREN'
  | 'COMMA'
  | 'EOF';

interface Token {
  type: TokenType;
  value: string | number | boolean;
  position: number;
}

/**
 * Tokenizes a formula string into tokens.
 */
function tokenize(formula: string): Token[] | GridFormulaError {
  const tokens: Token[] = [];
  let position = 0;

  const skipWhitespace = () => {
    while (position < formula.length && /\s/.test(formula[position])) {
      position += 1;
    }
  };

  const readNumber = (): Token => {
    const start = position;
    let hasDecimal = false;

    while (position < formula.length) {
      const char = formula[position];
      if (char === '.' && !hasDecimal) {
        hasDecimal = true;
        position += 1;
      } else if (/\d/.test(char)) {
        position += 1;
      } else {
        break;
      }
    }

    return {
      type: 'NUMBER',
      value: parseFloat(formula.slice(start, position)),
      position: start,
    };
  };

  const readString = (): Token | GridFormulaError => {
    const start = position;
    position += 1; // Skip opening quote

    let value = '';
    while (position < formula.length && formula[position] !== '"') {
      if (formula[position] === '\\' && position + 1 < formula.length) {
        position += 1;
        const escaped = formula[position];
        if (escaped === 'n') {
          value += '\n';
        } else if (escaped === 't') {
          value += '\t';
        } else if (escaped === '"') {
          value += '"';
        } else if (escaped === '\\') {
          value += '\\';
        } else {
          value += escaped;
        }
      } else {
        value += formula[position];
      }
      position += 1;
    }

    if (position >= formula.length) {
      return {
        type: 'PARSE_ERROR',
        message: `Unterminated string at position ${start}`,
      };
    }

    position += 1; // Skip closing quote

    return {
      type: 'STRING',
      value,
      position: start,
    };
  };

  const readColumnRef = (): Token | GridFormulaError => {
    const start = position;
    position += 1; // Skip $

    if (formula[position] !== '"') {
      return {
        type: 'PARSE_ERROR',
        message: `Expected " after $ at position ${position}`,
      };
    }

    position += 1; // Skip opening quote

    let columnName = '';
    while (position < formula.length && formula[position] !== '"') {
      columnName += formula[position];
      position += 1;
    }

    if (position >= formula.length) {
      return {
        type: 'PARSE_ERROR',
        message: `Unterminated column reference at position ${start}`,
      };
    }

    position += 1; // Skip closing quote

    if (columnName.length === 0) {
      return {
        type: 'PARSE_ERROR',
        message: `Empty column reference at position ${start}`,
      };
    }

    return {
      type: 'COLUMN_REF',
      value: columnName,
      position: start,
    };
  };

  const readIdentifier = (): Token => {
    const start = position;

    while (position < formula.length && /[a-zA-Z_0-9]/.test(formula[position])) {
      position += 1;
    }

    const value = formula.slice(start, position);

    // Check for boolean literals
    if (value.toLowerCase() === 'true') {
      return { type: 'BOOLEAN', value: true, position: start };
    }
    if (value.toLowerCase() === 'false') {
      return { type: 'BOOLEAN', value: false, position: start };
    }

    return { type: 'IDENTIFIER', value, position: start };
  };

  const readOperator = (): Token | GridFormulaError => {
    const start = position;
    const char = formula[position];

    // Two-character operators
    if (position + 1 < formula.length) {
      const twoChar = formula.slice(position, position + 2);
      if (['>=', '<=', '==', '!='].includes(twoChar)) {
        position += 2;
        return { type: 'OPERATOR', value: twoChar, position: start };
      }
    }

    // Single-character operators
    if (['+', '-', '*', '/', '>', '<', '!'].includes(char)) {
      position += 1;
      return { type: 'OPERATOR', value: char, position: start };
    }

    return {
      type: 'PARSE_ERROR',
      message: `Unexpected character "${char}" at position ${position}`,
    };
  };

  while (position < formula.length) {
    skipWhitespace();

    if (position >= formula.length) {
      break;
    }

    const char = formula[position];

    if (/\d/.test(char)) {
      tokens.push(readNumber());
    } else if (char === '"') {
      const result = readString();
      if ('type' in result && result.type === 'PARSE_ERROR') {
        return result as GridFormulaError;
      }
      tokens.push(result as Token);
    } else if (char === '$') {
      const result = readColumnRef();
      if ('type' in result && result.type === 'PARSE_ERROR') {
        return result as GridFormulaError;
      }
      tokens.push(result as Token);
    } else if (/[a-zA-Z_]/.test(char)) {
      tokens.push(readIdentifier());
    } else if (char === '(') {
      tokens.push({ type: 'LPAREN', value: '(', position });
      position += 1;
    } else if (char === ')') {
      tokens.push({ type: 'RPAREN', value: ')', position });
      position += 1;
    } else if (char === ',') {
      tokens.push({ type: 'COMMA', value: ',', position });
      position += 1;
    } else if (['+', '-', '*', '/', '>', '<', '=', '!'].includes(char)) {
      const result = readOperator();
      if ('type' in result && result.type === 'PARSE_ERROR') {
        return result as GridFormulaError;
      }
      tokens.push(result as Token);
    } else {
      return {
        type: 'PARSE_ERROR',
        message: `Unexpected character "${char}" at position ${position}`,
      };
    }
  }

  tokens.push({ type: 'EOF', value: '', position });

  return tokens;
}

/**
 * Parser class that builds an AST from tokens.
 */
class Parser {
  private tokens: Token[];

  private position: number = 0;

  constructor(tokens: Token[]) {
    this.tokens = tokens;
  }

  private current(): Token {
    return this.tokens[this.position];
  }

  private peek(offset: number = 0): Token {
    return this.tokens[Math.min(this.position + offset, this.tokens.length - 1)];
  }

  private advance(): Token {
    const token = this.current();
    if (token.type !== 'EOF') {
      this.position += 1;
    }
    return token;
  }

  private expect(type: TokenType): Token | GridFormulaError {
    const token = this.current();
    if (token.type !== type) {
      return {
        type: 'PARSE_ERROR',
        message: `Expected ${type} but got ${token.type} at position ${token.position}`,
      };
    }
    return this.advance();
  }

  parse(): GridFormulaNode | GridFormulaError {
    const result = this.parseExpression();
    if ('type' in result && result.type === 'PARSE_ERROR') {
      return result;
    }

    if (this.current().type !== 'EOF') {
      return {
        type: 'PARSE_ERROR',
        message: `Unexpected token at position ${this.current().position}`,
      };
    }

    return result;
  }

  private parseExpression(): GridFormulaNode | GridFormulaError {
    return this.parseComparison();
  }

  private parseComparison(): GridFormulaNode | GridFormulaError {
    let left = this.parseAdditive();
    if ('type' in left && left.type === 'PARSE_ERROR') {
      return left;
    }

    while (
      this.current().type === 'OPERATOR' &&
      ['>', '<', '>=', '<=', '==', '!='].includes(this.current().value as string)
    ) {
      const operator = this.advance().value as GridFormulaBinaryNode['operator'];
      const right = this.parseAdditive();
      if ('type' in right && right.type === 'PARSE_ERROR') {
        return right;
      }
      left = {
        type: 'binary',
        operator,
        left: left as GridFormulaNode,
        right: right as GridFormulaNode,
      };
    }

    return left;
  }

  private parseAdditive(): GridFormulaNode | GridFormulaError {
    let left = this.parseMultiplicative();
    if ('type' in left && left.type === 'PARSE_ERROR') {
      return left;
    }

    while (
      this.current().type === 'OPERATOR' &&
      ['+', '-'].includes(this.current().value as string)
    ) {
      const operator = this.advance().value as GridFormulaBinaryNode['operator'];
      const right = this.parseMultiplicative();
      if ('type' in right && right.type === 'PARSE_ERROR') {
        return right;
      }
      left = {
        type: 'binary',
        operator,
        left: left as GridFormulaNode,
        right: right as GridFormulaNode,
      };
    }

    return left;
  }

  private parseMultiplicative(): GridFormulaNode | GridFormulaError {
    let left = this.parseUnary();
    if ('type' in left && left.type === 'PARSE_ERROR') {
      return left;
    }

    while (
      this.current().type === 'OPERATOR' &&
      ['*', '/'].includes(this.current().value as string)
    ) {
      const operator = this.advance().value as GridFormulaBinaryNode['operator'];
      const right = this.parseUnary();
      if ('type' in right && right.type === 'PARSE_ERROR') {
        return right;
      }
      left = {
        type: 'binary',
        operator,
        left: left as GridFormulaNode,
        right: right as GridFormulaNode,
      };
    }

    return left;
  }

  private parseUnary(): GridFormulaNode | GridFormulaError {
    if (this.current().type === 'OPERATOR' && ['-', '!'].includes(this.current().value as string)) {
      const operator = this.advance().value as GridFormulaUnaryNode['operator'];
      const operand = this.parseUnary();
      if ('type' in operand && operand.type === 'PARSE_ERROR') {
        return operand;
      }
      return {
        type: 'unary',
        operator,
        operand: operand as GridFormulaNode,
      };
    }

    return this.parsePrimary();
  }

  private parsePrimary(): GridFormulaNode | GridFormulaError {
    const token = this.current();

    // Number literal
    if (token.type === 'NUMBER') {
      this.advance();
      return { type: 'literal', value: token.value as number } as GridFormulaLiteralNode;
    }

    // String literal
    if (token.type === 'STRING') {
      this.advance();
      return { type: 'literal', value: token.value as string } as GridFormulaLiteralNode;
    }

    // Boolean literal
    if (token.type === 'BOOLEAN') {
      this.advance();
      return { type: 'literal', value: token.value as boolean } as GridFormulaLiteralNode;
    }

    // Column reference
    if (token.type === 'COLUMN_REF') {
      this.advance();
      return { type: 'columnRef', columnName: token.value as string } as GridFormulaColumnRefNode;
    }

    // Function call or identifier (not supported as standalone)
    if (token.type === 'IDENTIFIER') {
      const name = token.value as string;
      this.advance();

      // Check if it's a function call
      if (this.current().type === 'LPAREN') {
        return this.parseFunctionCall(name);
      }

      // Standalone identifiers are not supported
      return {
        type: 'PARSE_ERROR',
        message: `Unknown identifier "${name}" at position ${token.position}. Did you mean $"${name}"?`,
      };
    }

    // Grouped expression
    if (token.type === 'LPAREN') {
      this.advance();
      const expr = this.parseExpression();
      if ('type' in expr && expr.type === 'PARSE_ERROR') {
        return expr;
      }
      const result = this.expect('RPAREN');
      if ('type' in result && result.type === 'PARSE_ERROR') {
        return result;
      }
      return { type: 'group', expression: expr as GridFormulaNode };
    }

    return {
      type: 'PARSE_ERROR',
      message: `Unexpected token "${token.value}" at position ${token.position}`,
    };
  }

  private parseFunctionCall(name: string): GridFormulaNode | GridFormulaError {
    this.advance(); // Skip LPAREN

    const args: GridFormulaNode[] = [];

    if (this.current().type !== 'RPAREN') {
      const firstArg = this.parseExpression();
      if ('type' in firstArg && firstArg.type === 'PARSE_ERROR') {
        return firstArg;
      }
      args.push(firstArg as GridFormulaNode);

      while (this.current().type === 'COMMA') {
        this.advance(); // Skip comma
        const arg = this.parseExpression();
        if ('type' in arg && arg.type === 'PARSE_ERROR') {
          return arg;
        }
        args.push(arg as GridFormulaNode);
      }
    }

    const result = this.expect('RPAREN');
    if ('type' in result && result.type === 'PARSE_ERROR') {
      return result;
    }

    return {
      type: 'function',
      name: name.toUpperCase(),
      args,
    } as GridFormulaFunctionNode;
  }
}

/**
 * Parses a formula string into an AST.
 * @param {string} formula - The formula string (without "=" prefix).
 * @returns {GridFormulaNode | GridFormulaError} The parsed AST or error.
 */
export function parseFormula(formula: string): GridFormulaNode | GridFormulaError {
  if (formula.trim().length === 0) {
    return {
      type: 'PARSE_ERROR',
      message: 'Empty formula',
    };
  }

  const tokens = tokenize(formula);

  if (!Array.isArray(tokens)) {
    return tokens; // Return the error
  }

  const parser = new Parser(tokens);
  return parser.parse();
}

/**
 * Checks if a result is a parse error.
 */
export function isFormulaError(
  result: GridFormulaNode | GridFormulaError,
): result is GridFormulaError {
  return 'message' in result && !('left' in result) && !('expression' in result);
}
