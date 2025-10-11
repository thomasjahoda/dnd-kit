import React, {useCallback, useEffect, useMemo, useRef} from 'react';
import {useDndContext, ClientRect, UniqueIdentifier} from '@dnd-kit/core';
import {useIsomorphicLayoutEffect, useUniqueId} from '@dnd-kit/utilities';

import type {Disabled, SortingStrategy} from '../types';
import {getSortedRects, normalizeDisabled} from '../utilities';
import {rectSortingStrategy} from '../strategies';

export interface Props {
  children: React.ReactNode;
  items: (UniqueIdentifier | {id: UniqueIdentifier})[];
  strategy?: SortingStrategy;
  id?: string;
  disabled?: boolean | Disabled;
}

const ID_PREFIX = 'Sortable';

interface ContextDescriptor {
  activeIndex: number;
  containerId: string;
  disabled: Disabled;
  disableTransforms: boolean;
  items: UniqueIdentifier[];
  /**
   * @param id id of item in items array
   * @returns -1 if the item is not found, otherwise index in items.
   */
  getIndexForItemId: (itemId: UniqueIdentifier) => number;
  overIndex: number;
  useDragOverlay: boolean;
  sortedRects: ClientRect[];
  strategy: SortingStrategy;
}

export const Context = React.createContext<ContextDescriptor>({
  activeIndex: -1,
  containerId: ID_PREFIX,
  disableTransforms: false,
  items: [],
  getIndexForItemId: (_itemId: UniqueIdentifier) => {
    return -1;
  },
  overIndex: -1,
  useDragOverlay: false,
  sortedRects: [],
  strategy: rectSortingStrategy,
  disabled: {
    draggable: false,
    droppable: false,
  },
});

export function SortableContext({
  children,
  id,
  items: userDefinedItems,
  strategy = rectSortingStrategy,
  disabled: disabledProp = false,
}: Props) {
  const {
    active,
    dragOverlay,
    droppableRects,
    over,
    measureDroppableContainers,
  } = useDndContext();
  const containerId = useUniqueId(ID_PREFIX, id);
  const useDragOverlay = Boolean(dragOverlay.rect !== null);
  const items = useMemo<UniqueIdentifier[]>(
    () =>
      userDefinedItems.map((item) =>
        typeof item === 'object' && 'id' in item ? item.id : item
      ),
    [userDefinedItems]
  );
  const itemsUsedForItemIndexCacheRefRef = useRef(items);
  const itemIndexCacheRef = useRef<Map<UniqueIdentifier, number> | null>(null);
  if (
    itemIndexCacheRef.current === null ||
    itemsUsedForItemIndexCacheRefRef.current !== items
  ) {
    itemIndexCacheRef.current = new Map();
    itemsUsedForItemIndexCacheRefRef.current = items;
  }
  const itemIndexCache = itemIndexCacheRef.current!;
  const getIndexForItemId = useCallback(
    (itemId: UniqueIdentifier) => {
      if (itemIndexCache.has(itemId)) {
        return itemIndexCache.get(itemId)!;
      }
      const index = items.indexOf(itemId);
      itemIndexCache.set(itemId, index);
      return index;
    },
    [items, itemIndexCache]
  );

  const isDragging = active != null;
  const activeIndex = active ? getIndexForItemId(active.id) : -1;
  const overIndex = over ? getIndexForItemId(over.id) : -1;
  const previousItemsRef = useRef(items);
  const itemsHaveChanged = previousItemsRef.current !== items; // PATCHED: no shallow comparison necessary
  const disableTransforms =
    (overIndex !== -1 && activeIndex === -1) || itemsHaveChanged;
  const disabled = normalizeDisabled(disabledProp);

  useIsomorphicLayoutEffect(() => {
    if (itemsHaveChanged && isDragging) {
      measureDroppableContainers(items);
    }
  }, [itemsHaveChanged, items, isDragging, measureDroppableContainers]);

  useEffect(() => {
    previousItemsRef.current = items;
  }, [items]);

  const contextValue = useMemo(
    (): ContextDescriptor => ({
      activeIndex,
      containerId,
      disabled,
      disableTransforms,
      items,
      getIndexForItemId,
      overIndex,
      useDragOverlay,
      sortedRects: getSortedRects(items, droppableRects),
      strategy,
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [
      activeIndex,
      containerId,
      disabled.draggable,
      disabled.droppable,
      disableTransforms,
      items,
      getIndexForItemId,
      overIndex,
      droppableRects,
      useDragOverlay,
      strategy,
    ]
  );

  return <Context.Provider value={contextValue}>{children}</Context.Provider>;
}
