# Context Menu Implementation Workflow

Universal context menu that works on web (right-click) and native (long-press).

## Pattern Overview

```typescript
// Hook: useSeriesContextMenu.ts
export function useSeriesContextMenu() {
  const [menuState, setMenuState] = useState<{
    visible: boolean;
    x: number;
    y: number;
    itemId?: string;
    itemTitle?: string;
  }>({ visible: false, x: 0, y: 0 });

  const openMenu = (itemId: string, itemTitle: string, x: number, y: number) => {
    setMenuState({ visible: true, x, y, itemId, itemTitle });
  };

  const closeMenu = () => {
    setMenuState(prev => ({ ...prev, visible: false }));
  };

  return { ctx: menuState, openMenu, closeMenu };
}
```

## Component Integration

### 1. Web Context Menu (Right Click)
```typescript
useEffect(() => {
  if (Platform.OS !== 'web' || !onContextMenu) return;
  
  const el = containerRef.current as any as HTMLElement;
  if (!el) return;
  
  const handler = (e: MouseEvent) => {
    e.preventDefault();
    onContextMenu(itemId, itemTitle, e.clientX, e.clientY);
  };
  
  el.addEventListener('contextmenu', handler);
  return () => el.removeEventListener('contextmenu', handler);
}, [onContextMenu, itemId, itemTitle]);
```

### 2. Native Long Press
```typescript
<TouchableOpacity
  onPress={onPress}
  onLongPress={onContextMenu ? (e) => {
    onContextMenu(
      itemId, 
      itemTitle, 
      e.nativeEvent.pageX, 
      e.nativeEvent.pageY
    );
  } : undefined}
  delayLongPress={400}
>
```

### 3. Menu Component
```typescript
// GenreTagContextMenu.tsx or SeriesContextMenu.tsx
interface Props {
  visible: boolean;
  x: number;
  y: number;
  itemId?: string;
  itemTitle?: string;
  onClose: () => void;
  onAction: (action: string, itemId: string) => void;
}

export default function ContextMenu({ visible, x, y, itemId, itemTitle, onClose, onAction }: Props) {
  const { colors } = useTheme();
  
  if (!visible) return null;
  
  return (
    <Modal transparent visible={visible} animationType="fade">
      <TouchableOpacity style={styles.overlay} onPress={onClose}>
        <View style={[styles.menu, { 
          position: 'absolute', 
          left: x, 
          top: y,
          backgroundColor: colors.surface,
          borderColor: colors.border 
        }]}>
          <Text style={[styles.title, { color: colors.textPrimary }]}>
            {itemTitle}
          </Text>
          {/* Menu items */}
        </View>
      </TouchableOpacity>
    </Modal>
  );
}
```

## Checklist

- [ ] Create hook for menu state management
- [ ] Add web event listener in useEffect
- [ ] Add onLongPress for native
- [ ] Position menu at click coordinates
- [ ] Close menu on backdrop press
- [ ] Support both x,y coordinates from web and native events
- [ ] Handle edge cases (menu near screen edge)

## Common Mistakes

- ❌ Using `window.addEventListener` instead of element-specific
- ❌ Forgetting to clean up event listeners
- ❌ Not converting native event coordinates properly
- ✅ Always use `delayLongPress` to avoid conflict with onPress
- ✅ Use Modal with transparent backdrop for native
