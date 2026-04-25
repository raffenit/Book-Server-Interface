# List Virtualization Workflow

Optimize large lists with windowing and recycling.

## When to Use

- Lists with 50+ items
- Grid views with many cards
- Long scrollable content causing performance issues

## Using FlashList (Recommended)

```typescript
import { FlashList } from '@shopify/flash-list';

<FlashList
  data={items}
  renderItem={({ item }) => <SeriesCard series={item} />}
  keyExtractor={(item) => String(item.id)}
  estimatedItemSize={200}  // Critical for performance
  numColumns={numColumns}
  contentContainerStyle={{ padding: Spacing.base }}
  onEndReached={loadMore}
  onEndReachedThreshold={0.5}
/>
```

## Key Props

| Prop | Purpose |
|------|---------|
| `estimatedItemSize` | Required for FlashList to calculate windows |
| `numColumns` | For grid layouts (use with useGridColumns hook) |
| `onEndReached` | Pagination/infinite scroll trigger |
| `keyExtractor` | Unique keys for recycling |

## Optimization Checklist

- [ ] Use `FlashList` instead of `FlatList` for large datasets
- [ ] Provide accurate `estimatedItemSize`
- [ ] Use `keyExtractor` with stable unique IDs
- [ ] Memoize renderItem if it has complex calculations
- [ ] Use `getItemLayout` if items have fixed sizes
- [ ] Debounce/throttle scroll events if needed

## Common Mistakes

- ❌ Not providing `estimatedItemSize` (causes layout jumps)
- ❌ Using array index as key (breaks recycling)
- ❌ Creating new functions in renderItem (useCallback)
- ❌ Nested virtualized lists (avoid ScrollView inside FlashList)
- ✅ Test with large datasets (1000+ items)
- ✅ Profile with React DevTools Profiler

## Example with Grid

```typescript
const { numColumns, cardWidth } = useGridColumns();

<FlashList
  data={series}
  renderItem={({ item }) => (
    <SeriesCard 
      series={item} 
      cardWidth={cardWidth}
      onPress={() => navigate(item.id)}
    />
  )}
  keyExtractor={(item) => String(item.id)}
  numColumns={numColumns}
  estimatedItemSize={cardWidth * 1.5}  // Aspect ratio consideration
  showsVerticalScrollIndicator={false}
/>
```

## Migration from FlatList

```typescript
// Before (FlatList)
<FlatList
  data={items}
  renderItem={renderItem}
  numColumns={numColumns}
/>

// After (FlashList)
<FlashList
  data={items}
  renderItem={renderItem}
  numColumns={numColumns}
  estimatedItemSize={200}  // Add this!
/>
```

Note: FlashList requires `@shopify/flash-list` package.
