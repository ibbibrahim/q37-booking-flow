# Equipment Tab Fixes - Implementation Summary

## Issues Fixed

### 1. Equipment Selections Disappear When Switching Tabs
**Root Cause**: TabsContent was unmounting components when switching tabs, causing local state to be lost.

**Fix**: Added `forceMount` prop to all TabsContent components and used CSS `hidden` class to hide inactive tabs:
```tsx
<TabsContent value="equipment" forceMount className={activeTab !== 'equipment' ? 'hidden' : ''}>
```

This keeps all tabs mounted in the DOM but visually hidden when not active.

### 2. Extra Equipment Rows Appear Unexpectedly
**Root Cause**: Dual state management - EquipmentForm had local `rows` state AND synced to parent via `onAddEquipment`, causing duplicate entries when effects re-ran.

**Fix**: Implemented single source of truth pattern:
- Moved `equipmentRows` state to parent component (CallSheetForm)
- Removed `onAddEquipment` and `onRemoveEquipment` callbacks
- EquipmentForm now receives `equipmentRows` and `setEquipmentRows` as props (controlled component)
- Removed `syncRowToParent` function that was causing duplicates

### 3. Payload Contains Date.now() IDs and Duplicates
**Root Cause**:
- Equipment rows used `Date.now()` for IDs, creating unstable identity
- Rows were synced to parent repeatedly, creating duplicates
- `id` field was being sent in payload

**Fix**:
- Created `EquipmentRow` type with `tempId` field for UI-only identity
- Use `crypto.randomUUID()` (with fallback) instead of `Date.now()` for stable tempId generation
- On submit, filter valid rows and merge duplicates by `inventoryItemId`
- Strip `tempId` and `id` from payload - Equipment payload only contains:
  - `categoryId`
  - `inventoryItemId`
  - `quantity`
  - `category` (string)
  - `item` (string)

```tsx
// Payload building with deduplication
const uniqueEquipment = new Map<number, Equipment>();
validEquipmentRows.forEach(row => {
  const existing = uniqueEquipment.get(row.inventoryItemId!);
  if (existing) {
    existing.quantity += row.quantity; // Merge quantities
  } else {
    uniqueEquipment.set(row.inventoryItemId!, {
      categoryId: row.categoryId!,
      inventoryItemId: row.inventoryItemId!,
      quantity: row.quantity,
      category: row.category ?? "",
      item: r.item ?? ""
    } as Equipment);
  }
});
```

### 4. indoorFacility Sent Separately Instead of Mapped to Location
**Root Cause**: Payload included both `location` and `indoorFacility` fields.

**Fix**: Map indoor facility selection to `location` field before submission:
```tsx
let finalLocation = '';
if (shootType === 'Indoor') {
  finalLocation = indoorFacility || '';
} else {
  finalLocation = formData.location;
}

// Payload only includes location, no indoorFacility
const callSheetData = {
  //... other fields
  location: finalLocation,  // Contains indoor facility name when Indoor
  // indoorFacility field removed completely
};
```

## Files Created/Modified

### Created:
1. `/src/callsheet_workflow/types/equipmentRow.ts` - New type definitions for equipment rows with proper tempId generation

### Modified:
1. `/src/callsheet_workflow/components/CallSheetForm.tsx`
   - Added `equipmentRows` state management
   - Implemented `forceMount` on all TabsContent
   - Fixed payload building to strip UI fields and deduplicate
   - Removed `indoorFacility` from payload, mapped to `location`
   - Added `createEmptyRow()` for initialization

2. `/src/callsheet_workflow/components/EquipmentForm.tsx`
   - Changed from uncontrolled to controlled component
   - Receives `equipmentRows` and `setEquipmentRows` as props
   - Removed `equipment`, `onAddEquipment`, `onRemoveEquipment` props
   - Removed `syncRowToParent` function
   - Removed duplicate row creation logic in effects
   - Uses `generateTempId()` for stable row identity

## Technical Implementation Details

### Equipment Row Type
```typescript
export interface EquipmentRow {
  tempId: string;              // UI-only identity (never sent to backend)
  categoryId?: number;
  inventoryItemId?: number;
  quantity: number;
  category?: string;           // Display label
  item?: string;               // Display label
  availabilityLoading?: boolean;  // UI state
  availabilityError?: string;     // UI state
  exceedsAvailability?: boolean;  // UI state
}
```

### TempId Generation
```typescript
export function generateTempId(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();  // Modern browsers
  }
  // Fallback for older environments
  return `row-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}
```

### State Flow
1. Parent (CallSheetForm) owns `equipmentRows: EquipmentRow[]`
2. Child (EquipmentForm) receives rows and setter via props
3. Child updates rows directly via `setEquipmentRows`
4. On submit, parent filters/transforms rows to clean Equipment payload
5. No intermediate syncing or callbacks needed

## Benefits

1. **No more disappearing selections** - Components stay mounted
2. **No more duplicate rows** - Single source of truth eliminates sync issues
3. **Clean payloads** - UI fields stripped, duplicates merged
4. **Stable identity** - crypto.randomUUID() provides proper row tracking
5. **Correct location handling** - Indoor facility properly maps to location field
6. **Simpler code** - Removed complex sync logic and effects

## Testing Checklist

- [ ] Switch between tabs multiple times - equipment selections persist
- [ ] Add multiple equipment rows - no unexpected duplicates
- [ ] Select same item in different rows - UI shows "Already selected"
- [ ] Submit with duplicates - backend receives merged quantities
- [ ] Submit Indoor + News Studio - payload has `location: "News Studio"`
- [ ] Submit Outdoor + location text - payload has `location: "Al Khor Beach"`
- [ ] Check network payload - no `tempId`, no `id`, no `indoorFacility`
