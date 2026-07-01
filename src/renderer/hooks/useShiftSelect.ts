import { useCallback, useRef } from 'react';

export function useShiftSelect<T extends { id: string }>(
  items: T[],
  selected: Set<string>,
  setSelected: (s: Set<string>) => void
) {
  const lastClicked = useRef<string | null>(null);

  const toggle = useCallback((id: string, shiftKey: boolean) => {
    if (shiftKey && lastClicked.current) {
      const startIdx = items.findIndex(i => i.id === lastClicked.current);
      const endIdx = items.findIndex(i => i.id === id);
      if (startIdx >= 0 && endIdx >= 0) {
        const [from, to] = startIdx < endIdx ? [startIdx, endIdx] : [endIdx, startIdx];
        const ids = items.slice(from, to + 1).map(i => i.id);
        const allSelected = ids.every(i => selected.has(i));
        setSelected(new Set(allSelected
          ? [...selected].filter(x => !ids.includes(x))
          : [...selected, ...ids]
        ));
        lastClicked.current = id;
        return;
      }
    }
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
    lastClicked.current = id;
  }, [items, selected, setSelected]);

  const selectAll = useCallback(() => {
    setSelected(new Set(selected.size === items.length ? [] : items.map(i => i.id)));
  }, [items, selected, setSelected]);

  return { toggle, selectAll, lastClicked };
}
