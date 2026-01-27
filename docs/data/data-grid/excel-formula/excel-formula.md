---
title: Data Grid - Excel Formula
---

# Data Grid - Excel Formula [<span class="plan-premium"></span>](/x/introduction/licensing/#premium-plan 'Premium plan')

<p class="description">Add Excel-like formula support to compute cell values from other columns in the same row.</p>

The Data Grid Premium supports Excel-like formulas that let you compute cell values dynamically based on other columns in the same row.
Formulas are stored as strings and evaluated on render.

## Enabling the feature

To enable formula support, set `experimentalFeatures={{ excelFormula: true }}` on the Data Grid Premium.
Cell values starting with `=` are treated as formulas and automatically evaluated.

{{"demo": "ExcelFormulaBasic.js", "bg": "inline", "defaultCodeOpen": false}}

## Formula syntax

### Column references

Reference other columns in the same row using the `$"columnName"` syntax:

```
=$"price" * $"quantity"
```

### Supported operators

| Operator | Description      | Example              |
| -------- | ---------------- | -------------------- |
| `+`      | Addition         | `=$"a" + $"b"`       |
| `-`      | Subtraction      | `=$"a" - $"b"`       |
| `*`      | Multiplication   | `=$"a" * $"b"`       |
| `/`      | Division         | `=$"a" / $"b"`       |
| `()`     | Parentheses      | `=($"a" + $"b") * 2` |
| `>`      | Greater than     | `=$"a" > $"b"`       |
| `<`      | Less than        | `=$"a" < $"b"`       |
| `>=`     | Greater or equal | `=$"a" >= $"b"`      |
| `<=`     | Less or equal    | `=$"a" <= $"b"`      |
| `==`     | Equal            | `=$"a" == $"b"`      |
| `!=`     | Not equal        | `=$"a" != $"b"`      |

## Arithmetic operations

Basic arithmetic operations follow standard operator precedence (multiplication and division before addition and subtraction).
Use parentheses to change the order of operations.

{{"demo": "ExcelFormulaArithmetic.js", "bg": "inline"}}

## Built-in functions

The formula engine includes several built-in functions:

| Function | Description             | Example                           |
| -------- | ----------------------- | --------------------------------- |
| `SUM`    | Sum of values           | `=SUM($"a", $"b", $"c")`          |
| `AVG`    | Average of values       | `=AVG($"a", $"b")`                |
| `MIN`    | Minimum value           | `=MIN($"a", $"b", $"c")`          |
| `MAX`    | Maximum value           | `=MAX($"a", $"b", $"c")`          |
| `COUNT`  | Count of numeric values | `=COUNT($"a", $"b")`              |
| `ROUND`  | Round to decimals       | `=ROUND($"price", 2)`             |
| `ABS`    | Absolute value          | `=ABS($"value")`                  |
| `IF`     | Conditional             | `=IF($"a" > 0, "Yes", "No")`      |
| `AND`    | Logical AND             | `=AND($"a" > 0, $"b" > 0)`        |
| `OR`     | Logical OR              | `=OR($"a" > 0, $"b" > 0)`         |
| `NOT`    | Logical NOT             | `=NOT($"a" > 0)`                  |
| `CONCAT` | String concatenation    | `=CONCAT($"first", " ", $"last")` |
| `UPPER`  | Uppercase               | `=UPPER($"name")`                 |
| `LOWER`  | Lowercase               | `=LOWER($"name")`                 |
| `TRIM`   | Remove whitespace       | `=TRIM($"text")`                  |
| `LEN`    | String length           | `=LEN($"text")`                   |
| `LEFT`   | Left characters         | `=LEFT($"text", 3)`               |
| `RIGHT`  | Right characters        | `=RIGHT($"text", 3)`              |

{{"demo": "ExcelFormulaFunctions.js", "bg": "inline"}}

## Conditional logic

Use the `IF` function to display different values based on conditions.
You can nest `IF` functions for multiple conditions.

{{"demo": "ExcelFormulaConditional.js", "bg": "inline"}}

## Error handling

When a formula cannot be evaluated, it displays an error code:

| Error      | Description                                    |
| ---------- | ---------------------------------------------- |
| `#REF!`    | Invalid column reference                       |
| `#SYNTAX!` | Formula syntax error                           |
| `#VALUE!`  | Invalid operation (e.g., division by zero)     |
| `#CIRC!`   | Circular reference (formula references itself) |

{{"demo": "ExcelFormulaErrors.js", "bg": "inline"}}

## Column formulas

Instead of specifying formulas in each row, you can define a formula once on the column definition using the `defaultFormula` property.
Column formulas apply to all rows and take precedence over row values and row-level formulas.

This is useful for computed columns where the formula is the same for every row.

```tsx
const columns: GridColDef[] = [
  { field: 'price', headerName: 'Price', type: 'number' },
  { field: 'quantity', headerName: 'Quantity', type: 'number' },
  {
    field: 'total',
    headerName: 'Total',
    // Column-level formula - applies to ALL rows
    defaultFormula: '=$"price" * $"quantity"',
  },
];
```

{{"demo": "ExcelFormulaColumn.js", "bg": "inline"}}

## Editing formulas

Formulas can be edited directly in cells when the column has `editable: true`.

- **Row formulas**: Double-click a cell with a row formula to edit it. The formula string is shown instead of the computed value.
- **Column formulas**: Double-click any cell in a column with a `defaultFormula` to edit the column formula. Changes affect all rows.

The formula is validated on edit. Invalid formulas will show an error state.

### Programmatic editing

Use the `setColumnFormula` API method to change a column formula programmatically:

```tsx
// Change the formula
apiRef.current.setColumnFormula('total', '=$"price" * $"quantity" * 1.1');

// Reset to the default formula
apiRef.current.setColumnFormula('total', null);
```

## API methods

The formula feature exposes several API methods:

- `isFormula(value)` - Check if a value is a formula string
- `evaluateFormula(formula, rowId)` - Programmatically evaluate a formula for a specific row
- `getCellFormula(rowId, field)` - Get the original formula string from a cell (returns column formula if no row formula)
- `getColumnFormula(field)` - Get the active formula for a column (state formula or defaultFormula)
- `setColumnFormula(field, formula)` - Set or reset the active formula for a column
- `getRawCellFormula(rowId, field)` - Get the raw formula string for editing

{{"demo": "ExcelFormulaAPI.js", "bg": "inline"}}

## API

- [DataGridPremium](/x/api/data-grid/data-grid-premium/)
