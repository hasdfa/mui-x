import * as React from 'react';
import { styled } from '@mui/system';
import { forwardRef } from '@mui/x-internals/forwardRef';
import { DataGridProcessedProps } from '../../models/props/DataGridProps';
import { useGridRootProps } from '../../hooks/utils/useGridRootProps';
import { useGridConfiguration } from '../../hooks/utils/useGridConfiguration';
import { GridDimensions } from '../../hooks/features/dimensions';
import { GridLoadingOverlayVariant } from '../GridLoadingOverlay';

const GridPanelAnchor = styled('div')({
  position: 'absolute',
  top: `var(--DataGrid-headersTotalHeight)`,
  left: 0,
  width: 'calc(100% - (var(--DataGrid-hasScrollY) * var(--DataGrid-scrollbarSize)))',
});

type OwnerState = Pick<DataGridProcessedProps, 'classes'> & {
  dimensions: GridDimensions;
  loadingOverlayVariant: GridLoadingOverlayVariant | null;
};

const Element = styled('div', {
  name: 'MuiDataGrid',
  slot: 'Main',
  overridesResolver: (props, styles) => {
    const { ownerState } = props;
    return [
      styles.main,
      ownerState.dimensions.rightPinnedWidth > 0 && styles['main--hasPinnedRight'],
      ownerState.loadingOverlayVariant === 'skeleton' && styles['main--hasSkeletonLoadingOverlay'],
    ];
  },
})<{ ownerState: OwnerState }>({
  flexGrow: 1,
  position: 'relative',
  overflow: 'hidden',
  display: 'flex',
  flexDirection: 'column',
});

export const GridMainContainer = forwardRef<
  HTMLDivElement,
  React.PropsWithChildren<{
    className: string;
    ownerState: OwnerState;
  }>
>((props, ref) => {
  const { ownerState } = props;
  const rootProps = useGridRootProps();
  const configuration = useGridConfiguration();
  const ariaAttributes = configuration.hooks.useGridAriaAttributes();

  return (
    <Element
      ownerState={ownerState}
      className={props.className}
      tabIndex={-1}
      {...ariaAttributes}
      {...rootProps.slotProps?.main}
      ref={ref}
    >
      <GridPanelAnchor role="presentation" data-id="gridPanelAnchor" />
      {props.children}
    </Element>
  );
});
