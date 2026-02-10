# Proximity-Based Stock Transfer Recommendations

## Overview

The Planning Alert Center displays proximity-based transfer recommendations when products have critical or zero stock. This feature helps inventory planners quickly identify which nearby stores have surplus inventory available for transfer, enabling faster stock rebalancing decisions.

**Key Benefits:**
- Reduces stockouts by leveraging nearby surplus inventory
- Minimizes transfer costs by prioritizing closest locations
- Improves inventory balance across stores
- Enables quick decision-making with actionable recommendations

## How It Works

### Trigger Conditions

Proximity recommendations are automatically calculated and displayed for:
- **Stockout alerts** - When `currentStock = 0` (completely out of stock)
- **Reorder alerts** - When `currentStock < threshold` (critical stock level)

Other alert types (surge, overstock, deadstock) do not show proximity recommendations.

### Algorithm

The proximity recommendation algorithm follows these steps:

```
1. Alert Detection
   ├─ System identifies stockout or critical stock alert
   └─ Extracts SKU and store from alert

2. Store Code Extraction
   ├─ Parse store name (e.g., "Store Name - 123" → "123")
   └─ Handle missing or malformed store names gracefully

3. Inventory Aggregation
   ├─ Group all inventory items by SKU across all stores
   └─ Extract stock levels and thresholds for each store

4. Surplus Filtering
   ├─ Identify stores where currentStock > threshold
   ├─ Exclude the alert store itself
   └─ Filter out stores with insufficient stock

5. Distance Calculation
   ├─ Query distance matrix for store-to-store distances
   ├─ Handle missing distance data (put at end of list)
   └─ Calculate both numeric and display-formatted distances

6. Sorting & Ranking
   ├─ Sort candidate stores by distance (ascending)
   └─ Apply topN limit (default: 3)

7. Display
   ├─ Return top N closest stores with surplus
   └─ Show in alert card with store name and distance
```

### Distance Matrix

The distance between stores is maintained in a hardcoded matrix at `lib/store-distances.ts`.

**Current Store Network (8 stores):**
- Acıbadem (Istanbul - Anatolian side)
- Maltepe (Istanbul - Anatolian side)
- Merter (Istanbul - European side)
- İstinye (Istanbul - European side)
- Bayrampaşa (Istanbul - European side)
- Eskişehir (Central Anatolia - ~885km from Istanbul)
- Adana (Southern Turkey - ~940km from Istanbul)
- İzmir (Aegean region - ~470km from Istanbul)

**Distance Matrix Properties:**
- **Symmetric**: Distance from A to B equals B to A
- **Unit**: Kilometers (km)
- **Format**: Display strings use "~" prefix (e.g., "~14km")
- **Diagonal**: Same-store distance is `null` (displayed as "—")

**Example Distances:**
```
Acıbadem → Maltepe: 14 km (closest)
Merter → Bayrampaşa: 4 km (very close)
Eskişehir → Adana: 480 km (intercity)
```

## UI Display Patterns

### With Transfer Options

When nearby stores have surplus stock, a green/emerald themed box appears:

```
┌─────────────────────────────────────┐
│ 💡 En Yakın Stok Kaynakları        │
├─────────────────────────────────────┤
│ Maltepe • ~14km                     │
│ Merter • ~18km                      │
│ İstinye • ~28km                     │
└─────────────────────────────────────┘
```

**Visual Design:**
- Background: `bg-emerald-50/50` with `border-emerald-100`
- Icon: Lightbulb in `bg-emerald-100` circle
- Header: "En Yakın Stok Kaynakları" (Closest Stock Sources)
- List items: Store name (medium) • Distance (emerald-700, monospace)
- Maximum: 3 recommendations (configurable)

### Without Transfer Options

When no nearby stores have surplus stock, an amber themed warning appears:

```
┌─────────────────────────────────────┐
│ ⚠️ Stok Transferi Yok               │
├─────────────────────────────────────┤
│ Tüm mağazalarda stok yetersiz.      │
│ Tedarikçi ile iletişime geçin.      │
└─────────────────────────────────────┘
```

**Visual Design:**
- Background: `bg-amber-50/50` with `border-amber-100`
- Icon: AlertTriangle in `bg-amber-100` circle
- Header: "Stok Transferi Yok" (No Stock Transfer Available)
- Message: "Tüm mağazalarda stok yetersiz. Tedarikçi ile iletişime geçin."
  (All stores have insufficient stock. Contact supplier.)

### Fallback to Original Recommendations

For alert types that don't support proximity (surge, overstock, deadstock), the original AI recommendation is displayed in an indigo-themed box.

## Technical Implementation

### Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Inventory Planning Section                │
│                   (components/dashboard/sections/)          │
└───────────────────────────┬─────────────────────────────────┘
                            │
                            ├─ Fetch inventoryAlerts (useInventoryAlerts hook)
                            │   └─ API: /api/inventory/alerts
                            │
                            ├─ Fetch inventoryItems (periodItems)
                            │   └─ API: /api/inventory/items
                            │
                            ▼
            ┌───────────────────────────────────────┐
            │      useProximityAlerts Hook          │
            │      (hooks/use-proximity-alerts.ts)  │
            └───────────────┬───────────────────────┘
                            │
                            ├─ Filter alerts (stockout/reorder only)
                            ├─ Extract store codes from alert.storeName
                            │
                            ▼
                ┌───────────────────────────────┐
                │   groupStockByStore()         │
                │   (lib/proximity-utils.ts)    │
                └───────────┬───────────────────┘
                            │
                            ├─ Filter items by SKU
                            ├─ Group by store (storeCode/productKey)
                            └─ Return StoreStockInfo[]
                            │
                            ▼
                ┌───────────────────────────────┐
                │ findClosestStoresWithStock()  │
                │   (lib/proximity-utils.ts)    │
                └───────────┬───────────────────┘
                            │
                            ├─ Filter surplus (stock > threshold)
                            ├─ Exclude alert store
                            ├─ getDistance() from matrix
                            ├─ Sort by distance (asc)
                            └─ Return top N ProximityRecommendation[]
                            │
                            ▼
            ┌───────────────────────────────────────┐
            │     Enhanced InventoryAlerts          │
            │     { proximityOptions: [...],        │
            │       noTransferOptions: boolean }    │
            └───────────────┬───────────────────────┘
                            │
                            ▼
        ┌───────────────────────────────────────────┐
        │      PlanningAlerts Component             │
        │ (components/ui/inventory-planning/)       │
        └───────────────────────────────────────────┘
                            │
                            ├─ Render proximityOptions if present
                            ├─ Render noTransferOptions if flag set
                            └─ Render original recommendation otherwise
```

### Core Files

| File | Purpose |
|------|---------|
| `lib/store-distances.ts` | Distance matrix (8 stores), lookup functions |
| `lib/proximity-utils.ts` | Core calculation logic (group, filter, sort) |
| `hooks/use-proximity-alerts.ts` | React hook for alert enhancement |
| `components/ui/inventory-planning/planning-alerts.tsx` | UI rendering |
| `types/inventory.ts` | `ProximityRecommendation` interface, extended `InventoryAlert` |
| `components/dashboard/sections/inventory-planning.tsx` | Integration point |

### Test Files

| File | Coverage |
|------|----------|
| `lib/__tests__/proximity-utils.test.ts` | Unit tests for grouping and distance calculations |
| `hooks/__tests__/use-proximity-alerts.test.ts` | Hook behavior, filtering, enhancement logic |
| `e2e/proximity-recommendations.spec.ts` | End-to-end UI tests |

### Key Functions

**`getDistance(fromStore, toStore): number | null`**
- Looks up distance in matrix
- Returns `null` for same store or unknown store

**`getDistanceDisplay(fromStore, toStore): string`**
- Returns formatted display string (e.g., "~14")
- Returns "—" for same store
- Returns "?" for unknown store

**`groupStockByStore(sku, items): StoreStockInfo[]`**
- Filters items by SKU
- Groups by store (extracts storeCode or parses productKey)
- Returns array of store stock levels

**`findClosestStoresWithStock(alertStore, allStoresStock, topN): ProximityRecommendation[]`**
- Filters stores with surplus (stock > threshold)
- Excludes alert store
- Calculates distances using matrix
- Sorts by distance (ascending)
- Returns top N recommendations

**`useProximityAlerts(alerts, inventoryItems, options): UseProximityAlertsResult`**
- React hook for alert enhancement
- Only processes stockout/reorder alerts
- Returns `enhancedAlerts` with proximity options

## Configuration

### Customize Number of Recommendations

By default, the system shows the top 3 closest stores. To change this:

**In the hook call:**
```typescript
// components/dashboard/sections/inventory-planning.tsx

const { enhancedAlerts } = useProximityAlerts(
  inventoryAlerts,
  periodItems,
  { topN: 5 } // Show top 5 instead of 3
);
```

**Default value:** `topN = 3` (defined in hook)

### Add New Stores to Distance Matrix

To add a new store to the proximity network:

**1. Add the new store entry to `lib/store-distances.ts`:**

```typescript
export const STORE_DISTANCE_MATRIX: StoreDistance[] = [
  // ... existing stores
  {
    from: "Kadıköy",
    to: {
      "Acıbadem": { raw: "~8", value: 8 },
      "Maltepe": { raw: "~12", value: 12 },
      "Merter": { raw: "~20", value: 20 },
      "İstinye": { raw: "~30", value: 30 },
      "Bayrampaşa": { raw: "~22", value: 22 },
      "Eskişehir": { raw: "~890", value: 890 },
      "Adana": { raw: "~950", value: 950 },
      "İzmir": { raw: "~465", value: 465 },
      "Kadıköy": { raw: "—", value: null }, // Self-reference
    }
  },
  // ... update ALL existing stores to include distance to Kadıköy
];
```

**2. Update all existing store entries:**

For symmetry, every existing store must have the distance to the new store:

```typescript
{
  from: "Acıbadem",
  to: {
    // ... existing entries
    "Kadıköy": { raw: "~8", value: 8 }, // NEW
  }
}
```

**3. Verify symmetric distances:**

Ensure A→B equals B→A for all pairs.

### Change Surplus Threshold

The current logic considers surplus as `currentStock > threshold`. To modify:

```typescript
// lib/proximity-utils.ts

export function findClosestStoresWithStock(
  alertStore: string,
  allStoresStock: StoreStockInfo[],
  topN: number = 3
): ProximityRecommendation[] {
  const surplusStores = allStoresStock
    .filter((store) => store.storeName !== alertStore)
    .filter((store) => store.currentStock > store.threshold) // MODIFY HERE
    // Option 1: Use safety stock instead
    // .filter((store) => store.currentStock > store.minStockLevel)
    // Option 2: Add buffer
    // .filter((store) => store.currentStock > store.threshold * 1.2)
    .map((store) => { /* ... */ });
}
```

## Data Flow Example

### Scenario: Acıbadem store runs out of Product X

```
1. Alert Generated:
   {
     type: 'stockout',
     sku: 'PROD-X',
     storeName: 'Acıbadem - 123',
     metrics: { currentStock: 0, threshold: 10 }
   }

2. Store Code Extracted:
   alertStore = "123" (parsed from "Acıbadem - 123")

3. Inventory Aggregated:
   All PROD-X items grouped by store:
   - Store 123: 0 units (alert store)
   - Store 456: 50 units (surplus)
   - Store 789: 30 units (surplus)
   - Store 101: 5 units (below threshold)

4. Surplus Filtered:
   - Store 456: ✓ (50 > 10)
   - Store 789: ✓ (30 > 10)
   - Store 101: ✗ (5 < 10)

5. Distances Calculated:
   From "Acıbadem" to:
   - Store 456 (Maltepe): 14 km
   - Store 789 (Merter): 18 km

6. Sorted by Distance:
   1. Maltepe (~14km)
   2. Merter (~18km)

7. Displayed to User:
   ┌─────────────────────────────┐
   │ En Yakın Stok Kaynakları    │
   ├─────────────────────────────┤
   │ Maltepe • ~14km             │
   │ Merter • ~18km              │
   └─────────────────────────────┘
```

## Future Enhancements

### High Priority
- [ ] **Database-backed distance matrix**
  - Currently hardcoded in TypeScript
  - Move to `store_distances` table for dynamic updates
  - Add admin UI for distance management

- [ ] **Transfer cost estimation**
  - Calculate cost per km based on logistics rates
  - Display estimated transfer cost alongside distance
  - Compare cost vs. supplier reorder cost

- [ ] **Transfer time estimation**
  - Calculate ETA based on distance + average speed
  - Factor in traffic patterns by time of day
  - Show "Transfer would arrive in ~2 hours"

### Medium Priority
- [ ] **One-click transfer request initiation**
  - Button to initiate transfer request to target store
  - Send notification to store manager
  - Track transfer status (pending, approved, in-transit, completed)

- [ ] **Historical transfer success tracking**
  - Track which transfers actually happened
  - Learn from acceptance/rejection patterns
  - Prioritize stores with high acceptance rates

- [ ] **Multi-store transfers**
  - Combine stock from multiple nearby stores
  - "Transfer 5 from Maltepe + 3 from Merter = 8 total"

### Low Priority
- [ ] **Automated transfer suggestions**
  - Proactively suggest transfers before stockouts occur
  - Use forecasting to predict shortages in advance

- [ ] **Transfer optimization algorithm**
  - Consider not just distance, but also:
    - Store capacity constraints
    - Transfer cost
    - Urgency of stockout
    - Historical demand patterns

- [ ] **Geographic visualization**
  - Show stores on a map
  - Visualize transfer routes
  - Color-code by stock status

## Troubleshooting

### No recommendations showing for stockout alerts

**Possible causes:**
1. **No surplus inventory exists** - All stores below threshold
   - Check: `alert.noTransferOptions === true`
   - Solution: Amber fallback message displays correctly

2. **Store name parsing failed** - Store name doesn't match expected format
   - Check: Alert has `storeName` property
   - Check: Regex matches `- 123` pattern
   - Solution: Update parsing logic or standardize store names

3. **Missing distance data** - Store not in distance matrix
   - Check: Store exists in `STORE_DISTANCE_MATRIX`
   - Solution: Add missing store to matrix (see Configuration section)

4. **All stores filtered out** - Distance returned as `MAX_VALUE`
   - Check: `getDistance()` returns valid number
   - Solution: Ensure both origin and destination stores in matrix

### Recommendations show unknown stores or "?"

**Cause:** Store name doesn't match any entry in distance matrix

**Solution:**
1. Verify store name exactly matches matrix entry (case-sensitive)
2. Check for extra spaces or special characters
3. Add missing store to distance matrix

### Recommendations show wrong distances

**Cause:** Distance matrix has incorrect values or asymmetry

**Solution:**
1. Verify symmetric distances (A→B = B→A)
2. Update matrix with correct values
3. Re-run tests: `npm test -- lib/__tests__/proximity-utils.test.ts`

### Performance issues with many alerts

**Symptoms:** Slow rendering when alert count is high

**Optimizations already in place:**
- `useMemo` in hook to prevent unnecessary recalculations
- Filtering happens before distance calculations
- TopN limit prevents excessive recommendations

**If still slow:**
1. Add pagination to alerts list
2. Implement virtual scrolling
3. Add loading state while calculating proximities

## Related Documentation

- **Implementation Plan:** `docs/plans/2025-02-10-proximity-stock-recommendations.md`
- **Type Definitions:** `types/inventory.ts`
- **Inventory Planning:** `components/dashboard/sections/inventory-planning.tsx`
- **Testing Guide:** See test files for examples

## Support

For questions or issues related to proximity recommendations:
1. Check this documentation first
2. Review test files for usage examples
3. Examine the implementation plan for architecture decisions
4. Check git history for recent changes: `git log --oneline --grep="proximity"`
