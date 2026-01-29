import * as React from 'react';
import { createRenderer } from '@mui/internal-test-utils';
import type { GridPinnedColumns } from '../features/columns';
import { useStableArray, useStablePinnedColumns } from './useGridVirtualizer';

describe('useStableArray', () => {
  const { render } = createRenderer();

  it('should return the same reference when array content is identical', () => {
    const results: Array<string[]> = [];

    function TestComponent({ array }: { array: string[] }) {
      const stableArray = useStableArray(array);
      React.useEffect(() => {
        results.push(stableArray);
      });
      return null;
    }

    const array1 = ['a', 'b', 'c'];
    const { rerender } = render(<TestComponent array={array1} />);

    const initialRenderCount = results.length;

    // Create a new array with same content
    const array2 = ['a', 'b', 'c'];
    rerender(<TestComponent array={array2} />);

    // Both renders should use the same array reference (first captured value)
    expect(results[results.length - 1]).to.equal(results[initialRenderCount - 1]);
    // Should be the original array
    expect(results[initialRenderCount - 1]).to.equal(array1);
  });

  it('should return a new reference when array content changes', () => {
    const results: Array<string[]> = [];

    function TestComponent({ array }: { array: string[] }) {
      const stableArray = useStableArray(array);
      React.useEffect(() => {
        results.push(stableArray);
      });
      return null;
    }

    const array1 = ['a', 'b', 'c'];
    const { rerender } = render(<TestComponent array={array1} />);

    const initialRenderCount = results.length;

    // Create a new array with different content
    const array2 = ['a', 'b', 'd'];
    rerender(<TestComponent array={array2} />);

    // Second render should use the new array reference
    expect(results[initialRenderCount - 1]).to.equal(array1);
    expect(results[results.length - 1]).to.equal(array2);
    expect(results[initialRenderCount - 1]).not.to.equal(results[results.length - 1]);
  });

  it('should return a new reference when array length changes', () => {
    const results: Array<string[]> = [];

    function TestComponent({ array }: { array: string[] }) {
      const stableArray = useStableArray(array);
      React.useEffect(() => {
        results.push(stableArray);
      });
      return null;
    }

    const array1 = ['a', 'b', 'c'];
    const { rerender } = render(<TestComponent array={array1} />);

    const initialRenderCount = results.length;

    // Create a new array with different length
    const array2 = ['a', 'b'];
    rerender(<TestComponent array={array2} />);

    expect(results[initialRenderCount - 1]).to.equal(array1);
    expect(results[results.length - 1]).to.equal(array2);
    expect(results[initialRenderCount - 1]).not.to.equal(results[results.length - 1]);
  });

  it('should work with object items using reference equality', () => {
    const obj1 = { id: 1 };
    const obj2 = { id: 2 };
    const results: Array<Array<{ id: number }>> = [];

    function TestComponent({ array }: { array: Array<{ id: number }> }) {
      const stableArray = useStableArray(array);
      React.useEffect(() => {
        results.push(stableArray);
      });
      return null;
    }

    const array1 = [obj1, obj2];
    const { rerender } = render(<TestComponent array={array1} />);

    const initialRenderCount = results.length;

    // Create a new array with same object references
    const array2 = [obj1, obj2];
    rerender(<TestComponent array={array2} />);

    // Should be the same reference since objects are the same
    expect(results[results.length - 1]).to.equal(results[initialRenderCount - 1]);
  });

  it('should return new reference when object item changes', () => {
    const obj1 = { id: 1 };
    const obj2 = { id: 2 };
    const obj3 = { id: 2 }; // Different object with same content
    const results: Array<Array<{ id: number }>> = [];

    function TestComponent({ array }: { array: Array<{ id: number }> }) {
      const stableArray = useStableArray(array);
      React.useEffect(() => {
        results.push(stableArray);
      });
      return null;
    }

    const array1 = [obj1, obj2];
    const { rerender } = render(<TestComponent array={array1} />);

    const initialRenderCount = results.length;

    // Create a new array with different object reference (even with same content)
    const array2 = [obj1, obj3];
    rerender(<TestComponent array={array2} />);

    // Should be different reference since obj2 !== obj3
    expect(results[initialRenderCount - 1]).not.to.equal(results[results.length - 1]);
    expect(results[initialRenderCount - 1]).to.equal(array1);
    expect(results[results.length - 1]).to.equal(array2);
  });
});

describe('useStablePinnedColumns', () => {
  const { render } = createRenderer();

  it('should return the same reference when pinned columns content is identical', () => {
    const results: GridPinnedColumns[] = [];
    const leftCol = { field: 'left1', computedWidth: 100 };
    const rightCol = { field: 'right1', computedWidth: 100 };

    function TestComponent({ pinnedColumns }: { pinnedColumns: GridPinnedColumns }) {
      const stablePinned = useStablePinnedColumns(pinnedColumns);
      React.useEffect(() => {
        results.push(stablePinned);
      });
      return null;
    }

    const pinned1 = { left: [leftCol], right: [rightCol] };
    const { rerender } = render(<TestComponent pinnedColumns={pinned1} />);

    const initialRenderCount = results.length;

    // Create a new object with same content references
    const pinned2 = { left: [leftCol], right: [rightCol] };
    rerender(<TestComponent pinnedColumns={pinned2} />);

    // Should return the original reference
    expect(results[results.length - 1]).to.equal(results[initialRenderCount - 1]);
    expect(results[initialRenderCount - 1]).to.equal(pinned1);
  });

  it('should return a new reference when left columns change', () => {
    const results: GridPinnedColumns[] = [];
    const leftCol1 = { field: 'left1', computedWidth: 100 };
    const leftCol2 = { field: 'left2', computedWidth: 100 };
    const rightCol = { field: 'right1', computedWidth: 100 };

    function TestComponent({ pinnedColumns }: { pinnedColumns: GridPinnedColumns }) {
      const stablePinned = useStablePinnedColumns(pinnedColumns);
      React.useEffect(() => {
        results.push(stablePinned);
      });
      return null;
    }

    const pinned1 = { left: [leftCol1], right: [rightCol] };
    const { rerender } = render(<TestComponent pinnedColumns={pinned1} />);

    const initialRenderCount = results.length;

    // Change left column
    const pinned2 = { left: [leftCol2], right: [rightCol] };
    rerender(<TestComponent pinnedColumns={pinned2} />);

    expect(results[initialRenderCount - 1]).to.equal(pinned1);
    expect(results[results.length - 1]).to.equal(pinned2);
    expect(results[initialRenderCount - 1]).not.to.equal(results[results.length - 1]);
  });

  it('should return a new reference when left columns order changes', () => {
    const results: GridPinnedColumns[] = [];
    const leftCol1 = { field: 'left1', computedWidth: 100 };
    const leftCol2 = { field: 'left2', computedWidth: 100 };
    const rightCol = { field: 'right1', computedWidth: 100 };

    function TestComponent({ pinnedColumns }: { pinnedColumns: GridPinnedColumns }) {
      const stablePinned = useStablePinnedColumns(pinnedColumns);
      React.useEffect(() => {
        results.push(stablePinned);
      });
      return null;
    }

    const pinned1 = { left: [leftCol1, leftCol2], right: [rightCol] };
    const { rerender } = render(<TestComponent pinnedColumns={pinned1} />);

    const initialRenderCount = results.length;

    // Same items, different order
    const pinned2 = { left: [leftCol2, leftCol1], right: [rightCol] };
    rerender(<TestComponent pinnedColumns={pinned2} />);

    expect(results[initialRenderCount - 1]).to.equal(pinned1);
    expect(results[results.length - 1]).to.equal(pinned2);
    expect(results[initialRenderCount - 1]).not.to.equal(results[results.length - 1]);
  });

  it('should return a new reference when right columns change', () => {
    const results: GridPinnedColumns[] = [];
    const leftCol = { field: 'left1', computedWidth: 100 };
    const rightCol1 = { field: 'right1', computedWidth: 100 };
    const rightCol2 = { field: 'right2', computedWidth: 100 };

    function TestComponent({ pinnedColumns }: { pinnedColumns: GridPinnedColumns }) {
      const stablePinned = useStablePinnedColumns(pinnedColumns);
      React.useEffect(() => {
        results.push(stablePinned);
      });
      return null;
    }

    const pinned1 = { left: [leftCol], right: [rightCol1] };
    const { rerender } = render(<TestComponent pinnedColumns={pinned1} />);

    const initialRenderCount = results.length;

    // Change right column
    const pinned2 = { left: [leftCol], right: [rightCol2] };
    rerender(<TestComponent pinnedColumns={pinned2} />);

    expect(results[initialRenderCount - 1]).to.equal(pinned1);
    expect(results[results.length - 1]).to.equal(pinned2);
    expect(results[initialRenderCount - 1]).not.to.equal(results[results.length - 1]);
  });

  it('should return a new reference when array lengths change', () => {
    const results: GridPinnedColumns[] = [];
    const leftCol1 = { field: 'left1', computedWidth: 100 };
    const leftCol2 = { field: 'left2', computedWidth: 100 };
    const rightCol = { field: 'right1', computedWidth: 100 };

    function TestComponent({ pinnedColumns }: { pinnedColumns: GridPinnedColumns }) {
      const stablePinned = useStablePinnedColumns(pinnedColumns);
      React.useEffect(() => {
        results.push(stablePinned);
      });
      return null;
    }

    const pinned1 = { left: [leftCol1], right: [rightCol] };
    const { rerender } = render(<TestComponent pinnedColumns={pinned1} />);

    const initialRenderCount = results.length;

    // Add another left column
    const pinned2 = { left: [leftCol1, leftCol2], right: [rightCol] };
    rerender(<TestComponent pinnedColumns={pinned2} />);

    expect(results[initialRenderCount - 1]).to.equal(pinned1);
    expect(results[results.length - 1]).to.equal(pinned2);
    expect(results[initialRenderCount - 1]).not.to.equal(results[results.length - 1]);
  });
});
