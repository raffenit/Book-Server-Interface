import { useState, useCallback } from 'react';
import { useRouter } from 'expo-router';
import { ContextMenuPosition } from '../components/SeriesContextMenu';

interface ContextMenuState {
  visible: boolean;
  seriesId: number | null;
  seriesName: string;
  position: ContextMenuPosition;
}

const CLOSED: ContextMenuState = {
  visible: false,
  seriesId: null,
  seriesName: '',
  position: { x: 0, y: 0 },
};

export function useSeriesContextMenu() {
  const router = useRouter();
  const [ctx, setCtx] = useState<ContextMenuState>(CLOSED);

  const openMenu = useCallback(
    (seriesId: number, seriesName: string, x: number, y: number) => {
      setCtx({ visible: true, seriesId, seriesName, position: { x, y } });
    },
    []
  );

  const closeMenu = useCallback(() => setCtx(CLOSED), []);

  const openDetail = useCallback(() => {
    if (ctx.seriesId) router.push(`/series/${ctx.seriesId}`);
    closeMenu();
  }, [ctx.seriesId]);

  return { ctx, openMenu, closeMenu, openDetail };
}
