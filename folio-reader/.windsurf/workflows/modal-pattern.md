# Modal/Dialog Pattern Workflow

Consistent modal implementation with theming and backdrop handling.

## Basic Pattern

```typescript
import { Modal, View, TouchableOpacity, StyleSheet } from 'react-native';
import { useTheme } from '../contexts/ThemeContext';
import { makeStyles } from './modalStyles';

interface Props {
  visible: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
}

export function MyModal({ visible, onClose, title, children }: Props) {
  const { colors } = useTheme();
  const styles = makeStyles(colors);

  return (
    <Modal
      transparent
      visible={visible}
      animationType="fade"
      onRequestClose={onClose}
    >
      <TouchableOpacity 
        style={styles.overlay} 
        onPress={onClose}
        activeOpacity={1}
      >
        <View style={styles.container}>
          <Text style={styles.title}>{title}</Text>
          {children}
        </View>
      </TouchableOpacity>
    </Modal>
  );
}
```

## Shared Modal Styles

```typescript
// components/modals/modalStyles.ts
import { StyleSheet } from 'react-native';
import { ColorScheme, Radius, Spacing, Typography } from '../../constants/theme';

export function makeStyles(c: ColorScheme) {
  return StyleSheet.create({
    overlay: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.6)',
      justifyContent: 'center',
      alignItems: 'center',
      padding: Spacing.lg,
    },
    container: {
      backgroundColor: c.surface,
      borderRadius: Radius.lg,
      borderWidth: 1,
      borderColor: c.border,
      padding: Spacing.lg,
      width: '100%',
      maxWidth: 400,
      maxHeight: '80%',
    },
    title: {
      fontSize: Typography.lg,
      fontWeight: '600',
      color: c.textPrimary,
      marginBottom: Spacing.md,
    },
    buttonRow: {
      flexDirection: 'row',
      justifyContent: 'flex-end',
      gap: Spacing.sm,
      marginTop: Spacing.lg,
    },
  });
}
```

## Checklist

- [ ] Use `Modal` with `transparent` and `animationType="fade"`
- [ ] Use `makeStyles()` from `modalStyles.ts` for consistency
- [ ] Add `TouchableOpacity` backdrop with `onPress={onClose}`
- [ ] Set `activeOpacity={1}` on backdrop to prevent visual feedback
- [ ] Include `onRequestClose` for Android back button
- [ ] Use theme colors (surface, border, textPrimary)
- [ ] Limit max dimensions for responsiveness

## Common Mistakes

- ❌ Hardcoding modal dimensions (use maxWidth/maxHeight)
- ❌ Using onPress on the modal content (blocks interactions)
- ❌ Forgetting backdrop press to close
- ❌ Not handling Android back button
- ✅ Always use `makeStyles()` for theming
- ✅ Keep backdrop dark and content container themed

## Example: Confirmation Dialog

```typescript
<Modal visible={showConfirm} transparent animationType="fade">
  <TouchableOpacity style={styles.overlay} onPress={() => setShowConfirm(false)}>
    <View style={styles.container}>
      <Text style={styles.title}>Confirm Delete</Text>
      <Text style={{ color: colors.textSecondary }}>
        Are you sure you want to delete {itemTitle}?
      </Text>
      <View style={styles.buttonRow}>
        <TouchableOpacity onPress={() => setShowConfirm(false)}>
          <Text style={{ color: colors.textMuted }}>Cancel</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={confirmDelete}>
          <Text style={{ color: colors.danger }}>Delete</Text>
        </TouchableOpacity>
      </View>
    </View>
  </TouchableOpacity>
</Modal>
```
