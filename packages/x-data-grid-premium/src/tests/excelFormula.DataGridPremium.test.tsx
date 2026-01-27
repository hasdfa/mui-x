import * as React from 'react';
import { RefObject } from '@mui/x-internals/types';
import { createRenderer, act, waitFor } from '@mui/internal-test-utils';
import { getCell } from 'test/utils/helperFn';
import {
  DataGridPremium,
  DataGridPremiumProps,
  useGridApiRef,
  GridApiPremium,
} from '@mui/x-data-grid-premium';
import { isJSDOM } from 'test/utils/skipIf';

describe('<DataGridPremium /> - Excel Formula', () => {
  const { render } = createRenderer();

  const baselineProps: DataGridPremiumProps = {
    autoHeight: isJSDOM,
    disableVirtualization: true,
    rows: [
      { id: 1, price: 100, quantity: 5, name: 'Product A' },
      { id: 2, price: 200, quantity: 3, name: 'Product B' },
      { id: 3, price: 50, quantity: 10, name: 'Product C' },
    ],
    columns: [
      { field: 'id', type: 'number' },
      { field: 'price', type: 'number' },
      { field: 'quantity', type: 'number' },
      { field: 'name' },
      { field: 'total' },
    ],
  };

  describe('experimental feature flag', () => {
    it('should not evaluate formulas when feature is disabled', () => {
      render(
        <div style={{ width: 500, height: 300 }}>
          <DataGridPremium
            {...baselineProps}
            rows={[{ id: 1, price: 100, quantity: 5, total: '=$"price" * $"quantity"' }]}
          />
        </div>,
      );

      // Formula should be displayed as-is when feature is disabled
      expect(getCell(0, 4).textContent).to.equal('=$"price" * $"quantity"');
    });

    it('should evaluate formulas when feature is enabled', () => {
      render(
        <div style={{ width: 500, height: 300 }}>
          <DataGridPremium
            {...baselineProps}
            experimentalFeatures={{ excelFormula: true }}
            rows={[{ id: 1, price: 100, quantity: 5, total: '=$"price" * $"quantity"' }]}
          />
        </div>,
      );

      // Formula should be evaluated to 500 (100 * 5)
      expect(getCell(0, 4).textContent).to.equal('500');
    });
  });

  describe('basic arithmetic', () => {
    it('should evaluate addition', () => {
      render(
        <div style={{ width: 500, height: 300 }}>
          <DataGridPremium
            {...baselineProps}
            experimentalFeatures={{ excelFormula: true }}
            rows={[{ id: 1, price: 100, quantity: 50, total: '=$"price" + $"quantity"' }]}
          />
        </div>,
      );

      expect(getCell(0, 4).textContent).to.equal('150');
    });

    it('should evaluate subtraction', () => {
      render(
        <div style={{ width: 500, height: 300 }}>
          <DataGridPremium
            {...baselineProps}
            experimentalFeatures={{ excelFormula: true }}
            rows={[{ id: 1, price: 100, quantity: 30, total: '=$"price" - $"quantity"' }]}
          />
        </div>,
      );

      expect(getCell(0, 4).textContent).to.equal('70');
    });

    it('should evaluate multiplication', () => {
      render(
        <div style={{ width: 500, height: 300 }}>
          <DataGridPremium
            {...baselineProps}
            experimentalFeatures={{ excelFormula: true }}
            rows={[{ id: 1, price: 25, quantity: 4, total: '=$"price" * $"quantity"' }]}
          />
        </div>,
      );

      expect(getCell(0, 4).textContent).to.equal('100');
    });

    it('should evaluate division', () => {
      render(
        <div style={{ width: 500, height: 300 }}>
          <DataGridPremium
            {...baselineProps}
            experimentalFeatures={{ excelFormula: true }}
            rows={[{ id: 1, price: 100, quantity: 4, total: '=$"price" / $"quantity"' }]}
          />
        </div>,
      );

      expect(getCell(0, 4).textContent).to.equal('25');
    });

    it('should respect operator precedence', () => {
      render(
        <div style={{ width: 500, height: 300 }}>
          <DataGridPremium
            {...baselineProps}
            experimentalFeatures={{ excelFormula: true }}
            rows={[{ id: 1, price: 10, quantity: 5, total: '=$"price" + $"quantity" * 2' }]}
          />
        </div>,
      );

      // Should be 10 + (5 * 2) = 20, not (10 + 5) * 2 = 30
      expect(getCell(0, 4).textContent).to.equal('20');
    });

    it('should handle parentheses', () => {
      render(
        <div style={{ width: 500, height: 300 }}>
          <DataGridPremium
            {...baselineProps}
            experimentalFeatures={{ excelFormula: true }}
            rows={[{ id: 1, price: 10, quantity: 5, total: '=($"price" + $"quantity") * 2' }]}
          />
        </div>,
      );

      // Should be (10 + 5) * 2 = 30
      expect(getCell(0, 4).textContent).to.equal('30');
    });
  });

  describe('functions', () => {
    it('should evaluate SUM function', () => {
      render(
        <div style={{ width: 500, height: 300 }}>
          <DataGridPremium
            {...baselineProps}
            experimentalFeatures={{ excelFormula: true }}
            rows={[{ id: 1, price: 100, quantity: 50, total: '=SUM($"price", $"quantity", 10)' }]}
          />
        </div>,
      );

      expect(getCell(0, 4).textContent).to.equal('160');
    });

    it('should evaluate IF function', () => {
      render(
        <div style={{ width: 500, height: 300 }}>
          <DataGridPremium
            {...baselineProps}
            experimentalFeatures={{ excelFormula: true }}
            rows={[
              { id: 1, price: 100, quantity: 5, total: '=IF($"price" > 50, "High", "Low")' },
              { id: 2, price: 30, quantity: 5, total: '=IF($"price" > 50, "High", "Low")' },
            ]}
          />
        </div>,
      );

      expect(getCell(0, 4).textContent).to.equal('High');
      expect(getCell(1, 4).textContent).to.equal('Low');
    });

    it('should evaluate CONCAT function', () => {
      render(
        <div style={{ width: 500, height: 300 }}>
          <DataGridPremium
            {...baselineProps}
            experimentalFeatures={{ excelFormula: true }}
            rows={[
              {
                id: 1,
                price: 100,
                quantity: 5,
                name: 'Widget',
                total: '=CONCAT($"name", " - $", $"price")',
              },
            ]}
          />
        </div>,
      );

      expect(getCell(0, 4).textContent).to.equal('Widget - $100');
    });

    it('should evaluate AVG function', () => {
      render(
        <div style={{ width: 500, height: 300 }}>
          <DataGridPremium
            {...baselineProps}
            experimentalFeatures={{ excelFormula: true }}
            rows={[{ id: 1, price: 100, quantity: 50, total: '=AVG($"price", $"quantity")' }]}
          />
        </div>,
      );

      expect(getCell(0, 4).textContent).to.equal('75');
    });
  });

  describe('error handling', () => {
    it('should display #REF! for invalid column reference', () => {
      render(
        <div style={{ width: 500, height: 300 }}>
          <DataGridPremium
            {...baselineProps}
            experimentalFeatures={{ excelFormula: true }}
            rows={[{ id: 1, price: 100, quantity: 5, total: '=$"nonexistent"' }]}
          />
        </div>,
      );

      expect(getCell(0, 4).textContent).to.equal('#REF!');
    });

    it('should display #CIRC! for circular reference', () => {
      render(
        <div style={{ width: 500, height: 300 }}>
          <DataGridPremium
            {...baselineProps}
            experimentalFeatures={{ excelFormula: true }}
            rows={[{ id: 1, price: 100, quantity: 5, total: '=$"total"' }]}
          />
        </div>,
      );

      expect(getCell(0, 4).textContent).to.equal('#CIRC!');
    });

    it('should display #CIRC! for indirect circular reference', () => {
      render(
        <div style={{ width: 500, height: 300 }}>
          <DataGridPremium
            autoHeight={isJSDOM}
            disableVirtualization
            experimentalFeatures={{ excelFormula: true }}
            rows={[{ id: 1, a: '=$"b" + 1', b: '=$"a" + 1' }]}
            columns={[{ field: 'id', type: 'number' }, { field: 'a' }, { field: 'b' }]}
          />
        </div>,
      );

      expect(getCell(0, 1).textContent).to.equal('#CIRC!');
      expect(getCell(0, 2).textContent).to.equal('#CIRC!');
    });

    it('should display #SYNTAX! for invalid formula syntax', () => {
      render(
        <div style={{ width: 500, height: 300 }}>
          <DataGridPremium
            {...baselineProps}
            experimentalFeatures={{ excelFormula: true }}
            rows={[{ id: 1, price: 100, quantity: 5, total: '=$"price" +' }]}
          />
        </div>,
      );

      expect(getCell(0, 4).textContent).to.equal('#SYNTAX!');
    });

    it('should display #VALUE! for division by zero', () => {
      render(
        <div style={{ width: 500, height: 300 }}>
          <DataGridPremium
            {...baselineProps}
            experimentalFeatures={{ excelFormula: true }}
            rows={[{ id: 1, price: 100, quantity: 0, total: '=$"price" / $"quantity"' }]}
          />
        </div>,
      );

      expect(getCell(0, 4).textContent).to.equal('#VALUE!');
    });
  });

  describe('API methods', () => {
    it('should expose isFormula method', () => {
      let apiRef: RefObject<GridApiPremium | null>;

      function TestComponent() {
        apiRef = useGridApiRef();
        return (
          <div style={{ width: 500, height: 300 }}>
            <DataGridPremium
              {...baselineProps}
              apiRef={apiRef}
              experimentalFeatures={{ excelFormula: true }}
            />
          </div>
        );
      }

      render(<TestComponent />);

      expect(apiRef!.current?.isFormula('=$"price"')).to.equal(true);
      expect(apiRef!.current?.isFormula('regular value')).to.equal(false);
      expect(apiRef!.current?.isFormula(123)).to.equal(false);
    });

    it('should expose evaluateFormula method', () => {
      let apiRef: RefObject<GridApiPremium | null>;

      function TestComponent() {
        apiRef = useGridApiRef();
        return (
          <div style={{ width: 500, height: 300 }}>
            <DataGridPremium
              {...baselineProps}
              apiRef={apiRef}
              experimentalFeatures={{ excelFormula: true }}
              rows={[{ id: 1, price: 100, quantity: 5 }]}
            />
          </div>
        );
      }

      render(<TestComponent />);

      const result = apiRef!.current?.evaluateFormula('=$"price" * $"quantity"', 1);
      expect(result?.value).to.equal(500);
      expect(result?.isFormula).to.equal(true);
      expect(result?.error).to.equal(undefined);
    });

    it('should expose getCellFormula method', () => {
      let apiRef: RefObject<GridApiPremium | null>;

      function TestComponent() {
        apiRef = useGridApiRef();
        return (
          <div style={{ width: 500, height: 300 }}>
            <DataGridPremium
              {...baselineProps}
              apiRef={apiRef}
              experimentalFeatures={{ excelFormula: true }}
              rows={[{ id: 1, price: 100, quantity: 5, total: '=$"price" * $"quantity"' }]}
            />
          </div>
        );
      }

      render(<TestComponent />);

      expect(apiRef!.current?.getCellFormula(1, 'total')).to.equal('=$"price" * $"quantity"');
      expect(apiRef!.current?.getCellFormula(1, 'price')).to.equal(null);
    });
  });

  describe('multiple rows', () => {
    it('should evaluate formulas independently for each row', () => {
      render(
        <div style={{ width: 500, height: 300 }}>
          <DataGridPremium
            {...baselineProps}
            experimentalFeatures={{ excelFormula: true }}
            rows={[
              { id: 1, price: 100, quantity: 5, total: '=$"price" * $"quantity"' },
              { id: 2, price: 200, quantity: 3, total: '=$"price" * $"quantity"' },
              { id: 3, price: 50, quantity: 10, total: '=$"price" * $"quantity"' },
            ]}
          />
        </div>,
      );

      expect(getCell(0, 4).textContent).to.equal('500');
      expect(getCell(1, 4).textContent).to.equal('600');
      expect(getCell(2, 4).textContent).to.equal('500');
    });
  });

  describe('literal values', () => {
    it('should handle number literals', () => {
      render(
        <div style={{ width: 500, height: 300 }}>
          <DataGridPremium
            {...baselineProps}
            experimentalFeatures={{ excelFormula: true }}
            rows={[{ id: 1, price: 100, quantity: 5, total: '=$"price" + 50' }]}
          />
        </div>,
      );

      expect(getCell(0, 4).textContent).to.equal('150');
    });

    it('should treat numeric-like strings as numbers', () => {
      render(
        <div style={{ width: 500, height: 300 }}>
          <DataGridPremium
            {...baselineProps}
            experimentalFeatures={{ excelFormula: true }}
            rows={[{ id: 1, price: '100', quantity: 5, total: '=$"price" + 2' }]}
          />
        </div>,
      );

      expect(getCell(0, 4).textContent).to.equal('102');
    });

    it('should handle string literals', () => {
      render(
        <div style={{ width: 500, height: 300 }}>
          <DataGridPremium
            {...baselineProps}
            experimentalFeatures={{ excelFormula: true }}
            rows={[{ id: 1, price: 100, quantity: 5, total: '=CONCAT("Price: ", $"price")' }]}
          />
        </div>,
      );

      expect(getCell(0, 4).textContent).to.equal('Price: 100');
    });
  });

  describe('column-level formulas', () => {
    it('should evaluate column formula for all rows', () => {
      render(
        <div style={{ width: 500, height: 300 }}>
          <DataGridPremium
            autoHeight={isJSDOM}
            disableVirtualization
            experimentalFeatures={{ excelFormula: true }}
            rows={[
              { id: 1, price: 100, quantity: 2 },
              { id: 2, price: 50, quantity: 5 },
              { id: 3, price: 25, quantity: 4 },
            ]}
            columns={[
              { field: 'id', type: 'number' },
              { field: 'price', type: 'number' },
              { field: 'quantity', type: 'number' },
              { field: 'total', formula: '=$"price" * $"quantity"' },
            ]}
          />
        </div>,
      );

      expect(getCell(0, 3).textContent).to.equal('200');
      expect(getCell(1, 3).textContent).to.equal('250');
      expect(getCell(2, 3).textContent).to.equal('100');
    });

    it('should prioritize column formula over row value', () => {
      render(
        <div style={{ width: 500, height: 300 }}>
          <DataGridPremium
            autoHeight={isJSDOM}
            disableVirtualization
            experimentalFeatures={{ excelFormula: true }}
            rows={[
              { id: 1, price: 100, quantity: 2, total: 999 }, // row value should be ignored
            ]}
            columns={[
              { field: 'id', type: 'number' },
              { field: 'price', type: 'number' },
              { field: 'quantity', type: 'number' },
              { field: 'total', formula: '=$"price" * $"quantity"' },
            ]}
          />
        </div>,
      );

      expect(getCell(0, 3).textContent).to.equal('200'); // Not 999
    });

    it('should prioritize column formula over row formula', () => {
      render(
        <div style={{ width: 500, height: 300 }}>
          <DataGridPremium
            autoHeight={isJSDOM}
            disableVirtualization
            experimentalFeatures={{ excelFormula: true }}
            rows={[
              { id: 1, price: 100, quantity: 2, total: '=$"price" + $"quantity"' }, // row formula (addition)
            ]}
            columns={[
              { field: 'id', type: 'number' },
              { field: 'price', type: 'number' },
              { field: 'quantity', type: 'number' },
              { field: 'total', formula: '=$"price" * $"quantity"' }, // column formula (multiplication) wins
            ]}
          />
        </div>,
      );

      expect(getCell(0, 3).textContent).to.equal('200'); // Multiplication, not 102 (addition)
    });

    it('should handle column formula with IF function', () => {
      render(
        <div style={{ width: 500, height: 300 }}>
          <DataGridPremium
            autoHeight={isJSDOM}
            disableVirtualization
            experimentalFeatures={{ excelFormula: true }}
            rows={[
              { id: 1, price: 100, quantity: 2 },
              { id: 2, price: 50, quantity: 10 },
            ]}
            columns={[
              { field: 'id', type: 'number' },
              { field: 'price', type: 'number' },
              { field: 'quantity', type: 'number' },
              { field: 'status', formula: '=IF($"quantity" > 5, "High", "Low")' },
            ]}
          />
        </div>,
      );

      expect(getCell(0, 3).textContent).to.equal('Low');
      expect(getCell(1, 3).textContent).to.equal('High');
    });

    it('should expose getColumnFormula API method', () => {
      let apiRef: RefObject<GridApiPremium | null>;

      function TestComponent() {
        apiRef = useGridApiRef();
        return (
          <div style={{ width: 500, height: 300 }}>
            <DataGridPremium
              autoHeight={isJSDOM}
              disableVirtualization
              apiRef={apiRef}
              experimentalFeatures={{ excelFormula: true }}
              rows={[{ id: 1, price: 100 }]}
              columns={[
                { field: 'id', type: 'number' },
                { field: 'price', type: 'number' },
                { field: 'total', formula: '=$"price" * 2' },
              ]}
            />
          </div>
        );
      }

      render(<TestComponent />);

      expect(apiRef!.current?.getColumnFormula('total')).to.equal('=$"price" * 2');
      expect(apiRef!.current?.getColumnFormula('price')).to.equal(null);
    });

    it('getCellFormula should return column formula when no row formula exists', () => {
      let apiRef: RefObject<GridApiPremium | null>;

      function TestComponent() {
        apiRef = useGridApiRef();
        return (
          <div style={{ width: 500, height: 300 }}>
            <DataGridPremium
              autoHeight={isJSDOM}
              disableVirtualization
              apiRef={apiRef}
              experimentalFeatures={{ excelFormula: true }}
              rows={[{ id: 1, price: 100, quantity: 5 }]}
              columns={[
                { field: 'id', type: 'number' },
                { field: 'price', type: 'number' },
                { field: 'quantity', type: 'number' },
                { field: 'total', formula: '=$"price" * $"quantity"' },
              ]}
            />
          </div>
        );
      }

      render(<TestComponent />);

      // getCellFormula should return the column formula since there's no row formula
      expect(apiRef!.current?.getCellFormula(1, 'total')).to.equal('=$"price" * $"quantity"');
    });

    it('getCellFormula should prioritize row formula over column formula', () => {
      let apiRef: RefObject<GridApiPremium | null>;

      function TestComponent() {
        apiRef = useGridApiRef();
        return (
          <div style={{ width: 500, height: 300 }}>
            <DataGridPremium
              autoHeight={isJSDOM}
              disableVirtualization
              apiRef={apiRef}
              experimentalFeatures={{ excelFormula: true }}
              rows={[{ id: 1, price: 100, quantity: 5, total: '=$"price" + $"quantity"' }]}
              columns={[
                { field: 'id', type: 'number' },
                { field: 'price', type: 'number' },
                { field: 'quantity', type: 'number' },
                { field: 'total', formula: '=$"price" * $"quantity"' },
              ]}
            />
          </div>
        );
      }

      render(<TestComponent />);

      // getCellFormula should return the row formula since it exists
      expect(apiRef!.current?.getCellFormula(1, 'total')).to.equal('=$"price" + $"quantity"');
    });

    it('should not evaluate column formula when feature is disabled', () => {
      render(
        <div style={{ width: 500, height: 300 }}>
          <DataGridPremium
            autoHeight={isJSDOM}
            disableVirtualization
            rows={[{ id: 1, price: 100, quantity: 2 }]}
            columns={[
              { field: 'id', type: 'number' },
              { field: 'price', type: 'number' },
              { field: 'quantity', type: 'number' },
              { field: 'total', formula: '=$"price" * $"quantity"' },
            ]}
          />
        </div>,
      );

      // When feature is disabled, the cell should be empty (no row value)
      expect(getCell(0, 3).textContent).to.equal('');
    });

    it('should support defaultFormula property', () => {
      render(
        <div style={{ width: 500, height: 300 }}>
          <DataGridPremium
            autoHeight={isJSDOM}
            disableVirtualization
            experimentalFeatures={{ excelFormula: true }}
            rows={[
              { id: 1, price: 100, quantity: 2 },
              { id: 2, price: 50, quantity: 5 },
            ]}
            columns={[
              { field: 'id', type: 'number' },
              { field: 'price', type: 'number' },
              { field: 'quantity', type: 'number' },
              { field: 'total', defaultFormula: '=$"price" * $"quantity"' },
            ]}
          />
        </div>,
      );

      expect(getCell(0, 3).textContent).to.equal('200');
      expect(getCell(1, 3).textContent).to.equal('250');
    });
  });

  describe('formula editing API', () => {
    it('should expose setColumnFormula API method', () => {
      let apiRef: RefObject<GridApiPremium | null>;

      function TestComponent() {
        apiRef = useGridApiRef();
        return (
          <div style={{ width: 500, height: 300 }}>
            <DataGridPremium
              autoHeight={isJSDOM}
              disableVirtualization
              apiRef={apiRef}
              experimentalFeatures={{ excelFormula: true }}
              rows={[
                { id: 1, price: 100, quantity: 2 },
                { id: 2, price: 50, quantity: 5 },
              ]}
              columns={[
                { field: 'id', type: 'number' },
                { field: 'price', type: 'number' },
                { field: 'quantity', type: 'number' },
                { field: 'total', defaultFormula: '=$"price" * $"quantity"' },
              ]}
            />
          </div>
        );
      }

      render(<TestComponent />);

      // Initial values using defaultFormula
      expect(getCell(0, 3).textContent).to.equal('200');
      expect(getCell(1, 3).textContent).to.equal('250');

      // Change formula to double the total
      act(() => {
        apiRef!.current?.setColumnFormula('total', '=$"price" * $"quantity" * 2');
      });

      // Values should update for all rows
      expect(getCell(0, 3).textContent).to.equal('400');
      expect(getCell(1, 3).textContent).to.equal('500');
    });

    it('should reset to defaultFormula when setColumnFormula is called with null', () => {
      let apiRef: RefObject<GridApiPremium | null>;

      function TestComponent() {
        apiRef = useGridApiRef();
        return (
          <div style={{ width: 500, height: 300 }}>
            <DataGridPremium
              autoHeight={isJSDOM}
              disableVirtualization
              apiRef={apiRef}
              experimentalFeatures={{ excelFormula: true }}
              rows={[{ id: 1, price: 100, quantity: 2 }]}
              columns={[
                { field: 'id', type: 'number' },
                { field: 'price', type: 'number' },
                { field: 'quantity', type: 'number' },
                { field: 'total', defaultFormula: '=$"price" * $"quantity"' },
              ]}
            />
          </div>
        );
      }

      render(<TestComponent />);

      // Initial value
      expect(getCell(0, 3).textContent).to.equal('200');

      // Change formula
      act(() => {
        apiRef!.current?.setColumnFormula('total', '=$"price" + $"quantity"');
      });
      expect(getCell(0, 3).textContent).to.equal('102');

      // Reset to default
      act(() => {
        apiRef!.current?.setColumnFormula('total', null);
      });
      expect(getCell(0, 3).textContent).to.equal('200');
    });

    it('should expose getRawCellFormula API method', () => {
      let apiRef: RefObject<GridApiPremium | null>;

      function TestComponent() {
        apiRef = useGridApiRef();
        return (
          <div style={{ width: 500, height: 300 }}>
            <DataGridPremium
              autoHeight={isJSDOM}
              disableVirtualization
              apiRef={apiRef}
              experimentalFeatures={{ excelFormula: true }}
              rows={[{ id: 1, price: 100, quantity: 2 }]}
              columns={[
                { field: 'id', type: 'number' },
                { field: 'price', type: 'number' },
                { field: 'quantity', type: 'number' },
                { field: 'total', defaultFormula: '=$"price" * $"quantity"' },
              ]}
            />
          </div>
        );
      }

      render(<TestComponent />);

      // Should return defaultFormula
      expect(apiRef!.current?.getRawCellFormula(1, 'total')).to.equal('=$"price" * $"quantity"');

      // Change formula via API
      act(() => {
        apiRef!.current?.setColumnFormula('total', '=$"price" + $"quantity"');
      });

      // Should return state formula (not defaultFormula)
      expect(apiRef!.current?.getRawCellFormula(1, 'total')).to.equal('=$"price" + $"quantity"');

      // Should return null for non-formula column
      expect(apiRef!.current?.getRawCellFormula(1, 'price')).to.equal(null);
    });

    it('getRawCellFormula should return row formula when present', () => {
      let apiRef: RefObject<GridApiPremium | null>;

      function TestComponent() {
        apiRef = useGridApiRef();
        return (
          <div style={{ width: 500, height: 300 }}>
            <DataGridPremium
              autoHeight={isJSDOM}
              disableVirtualization
              apiRef={apiRef}
              experimentalFeatures={{ excelFormula: true }}
              rows={[{ id: 1, price: 100, quantity: 2, total: '=$"price" - $"quantity"' }]}
              columns={[
                { field: 'id', type: 'number' },
                { field: 'price', type: 'number' },
                { field: 'quantity', type: 'number' },
                { field: 'total' },
              ]}
            />
          </div>
        );
      }

      render(<TestComponent />);

      // Should return row formula
      expect(apiRef!.current?.getRawCellFormula(1, 'total')).to.equal('=$"price" - $"quantity"');
    });

    it('getColumnFormula should return state formula over defaultFormula', () => {
      let apiRef: RefObject<GridApiPremium | null>;

      function TestComponent() {
        apiRef = useGridApiRef();
        return (
          <div style={{ width: 500, height: 300 }}>
            <DataGridPremium
              autoHeight={isJSDOM}
              disableVirtualization
              apiRef={apiRef}
              experimentalFeatures={{ excelFormula: true }}
              rows={[{ id: 1, price: 100, quantity: 2 }]}
              columns={[
                { field: 'id', type: 'number' },
                { field: 'price', type: 'number' },
                { field: 'quantity', type: 'number' },
                { field: 'total', defaultFormula: '=$"price" * $"quantity"' },
              ]}
            />
          </div>
        );
      }

      render(<TestComponent />);

      // Initially returns defaultFormula
      expect(apiRef!.current?.getColumnFormula('total')).to.equal('=$"price" * $"quantity"');

      // Set state formula
      act(() => {
        apiRef!.current?.setColumnFormula('total', '=$"price" + $"quantity"');
      });

      // Should return state formula
      expect(apiRef!.current?.getColumnFormula('total')).to.equal('=$"price" + $"quantity"');

      // Reset
      act(() => {
        apiRef!.current?.setColumnFormula('total', null);
      });

      // Should return defaultFormula again
      expect(apiRef!.current?.getColumnFormula('total')).to.equal('=$"price" * $"quantity"');
    });

    it('state formula should take precedence over defaultFormula for evaluation', async () => {
      let apiRef: RefObject<GridApiPremium | null>;

      function TestComponent() {
        apiRef = useGridApiRef();
        return (
          <div style={{ width: 500, height: 300 }}>
            <DataGridPremium
              autoHeight={isJSDOM}
              disableVirtualization
              apiRef={apiRef}
              experimentalFeatures={{ excelFormula: true }}
              rows={[{ id: 1, price: 100, quantity: 2 }]}
              columns={[
                { field: 'id', type: 'number' },
                { field: 'price', type: 'number' },
                { field: 'quantity', type: 'number' },
                { field: 'total', defaultFormula: '=$"price" * $"quantity"' }, // multiplication
              ]}
            />
          </div>
        );
      }

      render(<TestComponent />);

      // Initial: 100 * 2 = 200
      expect(getCell(0, 3).textContent).to.equal('200');

      // Set state formula to addition
      await act(async () => {
        apiRef!.current?.setColumnFormula('total', '=$"price" + $"quantity"');
      });

      // Now: 100 + 2 = 102
      await waitFor(() => {
        expect(getCell(0, 3).textContent).to.equal('102');
      });
    });
  });

  describe('formula bar', () => {
    it('should render formula bar when feature is enabled', () => {
      const { container } = render(
        <div style={{ width: 500, height: 300 }}>
          <DataGridPremium {...baselineProps} experimentalFeatures={{ excelFormula: true }} />
        </div>,
      );

      const formulaBar = container.querySelector('input[placeholder="Select a cell..."]');
      expect(formulaBar).to.not.equal(null);
    });

    it('should not render formula bar when feature is disabled', () => {
      const { container } = render(
        <div style={{ width: 500, height: 300 }}>
          <DataGridPremium {...baselineProps} />
        </div>,
      );

      const formulaBar = container.querySelector('input[placeholder="Select a cell..."]');
      expect(formulaBar).to.equal(null);
    });

    it('should display cell value when cell is focused', async () => {
      let apiRef: RefObject<GridApiPremium | null>;

      function TestComponent() {
        apiRef = useGridApiRef();
        return (
          <div style={{ width: 500, height: 300 }}>
            <DataGridPremium
              {...baselineProps}
              apiRef={apiRef}
              experimentalFeatures={{ excelFormula: true }}
            />
          </div>
        );
      }

      const { container } = render(<TestComponent />);

      const formulaInput = container.querySelector(
        'input[placeholder="Select a cell..."]',
      ) as HTMLInputElement;
      expect(formulaInput).to.not.equal(null);

      // Focus cell via API (price column, row 0 = value 100)
      await act(async () => {
        apiRef!.current?.setCellFocus(1, 'price');
      });

      await waitFor(() => {
        expect(formulaInput.value).to.equal('100');
      });
    });

    it('should display raw formula string (not computed value)', async () => {
      let apiRef: RefObject<GridApiPremium | null>;

      function TestComponent() {
        apiRef = useGridApiRef();
        return (
          <div style={{ width: 500, height: 300 }}>
            <DataGridPremium
              {...baselineProps}
              apiRef={apiRef}
              experimentalFeatures={{ excelFormula: true }}
              rows={[
                { id: 1, price: 100, quantity: 5, name: 'A', total: '=$"price" + $"quantity"' },
              ]}
            />
          </div>
        );
      }

      const { container } = render(<TestComponent />);

      const formulaInput = container.querySelector(
        'input[placeholder="Select a cell..."]',
      ) as HTMLInputElement;

      // Focus the formula cell via API
      await act(async () => {
        apiRef!.current?.setCellFocus(1, 'total');
      });

      await waitFor(() => {
        expect(formulaInput.value).to.equal('=$"price" + $"quantity"');
      });
    });

    it('should display column formula for column-formula cells', async () => {
      let apiRef: RefObject<GridApiPremium | null>;

      function TestComponent() {
        apiRef = useGridApiRef();
        return (
          <div style={{ width: 500, height: 300 }}>
            <DataGridPremium
              {...baselineProps}
              apiRef={apiRef}
              experimentalFeatures={{ excelFormula: true }}
              rows={[{ id: 1, price: 100, quantity: 5, name: 'A' }]}
              columns={[
                { field: 'id', type: 'number' },
                { field: 'price', type: 'number' },
                { field: 'quantity', type: 'number' },
                { field: 'name' },
                { field: 'total', defaultFormula: '=$"price" * $"quantity"' },
              ]}
            />
          </div>
        );
      }

      const { container } = render(<TestComponent />);

      const formulaInput = container.querySelector(
        'input[placeholder="Select a cell..."]',
      ) as HTMLInputElement;

      // Focus the column formula cell via API
      await act(async () => {
        apiRef!.current?.setCellFocus(1, 'total');
      });

      await waitFor(() => {
        expect(formulaInput.value).to.equal('=$"price" * $"quantity"');
      });
    });

    it('should update row value via formula bar submit', async () => {
      let apiRef: RefObject<GridApiPremium | null>;

      function TestComponent() {
        apiRef = useGridApiRef();
        return (
          <div style={{ width: 500, height: 300 }}>
            <DataGridPremium
              {...baselineProps}
              apiRef={apiRef}
              experimentalFeatures={{ excelFormula: true }}
              rows={[{ id: 1, price: 100, quantity: 5, name: 'A', total: '' }]}
            />
          </div>
        );
      }

      render(<TestComponent />);

      // Focus the total cell
      await act(async () => {
        apiRef!.current?.setCellFocus(1, 'total');
      });

      // Update the row directly via API (simulates formula bar submit)
      await act(async () => {
        apiRef!.current?.updateRows([
          { id: 1, price: 100, quantity: 5, name: 'A', total: '=$"price" + $"quantity"' },
        ]);
      });

      // The cell should now show the computed formula value: 100 + 5 = 105
      await waitFor(() => {
        expect(getCell(0, 4).textContent).to.equal('105');
      });
    });

    it('should auto-focus formula bar input when a cell is focused', async () => {
      let apiRef: RefObject<GridApiPremium | null>;

      function TestComponent() {
        apiRef = useGridApiRef();
        return (
          <div style={{ width: 500, height: 300 }}>
            <DataGridPremium
              {...baselineProps}
              apiRef={apiRef}
              experimentalFeatures={{ excelFormula: true }}
            />
          </div>
        );
      }

      const { container } = render(<TestComponent />);

      const formulaInput = container.querySelector(
        'input[placeholder="Select a cell..."]',
      ) as HTMLInputElement;

      // Focus a cell via API
      await act(async () => {
        apiRef!.current?.setCellFocus(1, 'price');
      });

      await waitFor(() => {
        expect(document.activeElement).to.equal(formulaInput);
      });
    });

    it('should retain cell focus when clicking outside the grid', async () => {
      let apiRef: RefObject<GridApiPremium | null>;

      function TestComponent() {
        apiRef = useGridApiRef();
        return (
          <div style={{ width: 500, height: 300 }}>
            <DataGridPremium
              {...baselineProps}
              apiRef={apiRef}
              experimentalFeatures={{ excelFormula: true }}
            />
            <button type="button">Outside button</button>
          </div>
        );
      }

      const { container } = render(<TestComponent />);

      const formulaInput = container.querySelector(
        'input[placeholder="Select a cell..."]',
      ) as HTMLInputElement;

      // Focus a cell via API
      await act(async () => {
        apiRef!.current?.setCellFocus(1, 'price');
      });

      await waitFor(() => {
        expect(formulaInput.value).to.equal('100');
      });

      // Click the outside button (simulates clicking outside grid)
      const outsideButton = container.querySelector('button') as HTMLElement;
      await act(async () => {
        outsideButton.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));
        outsideButton.dispatchEvent(new MouseEvent('mouseup', { bubbles: true }));
      });

      // Cell focus should be retained
      await waitFor(() => {
        expect(formulaInput.value).to.equal('100');
      });

      // Verify focus state is still set
      const focusedCell = apiRef!.current?.state.focus.cell;
      expect(focusedCell).to.not.equal(null);
      expect(focusedCell?.field).to.equal('price');
    });
  });
});
