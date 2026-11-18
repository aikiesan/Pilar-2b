# How to Add New Technologies to CP2B Technology Routes

## Quick Start (5 minutes)

### Step 1: Open Supabase SQL Editor
1. Go to https://supabase.com
2. Navigate to your CP2B project
3. Click **SQL Editor** in the left sidebar
4. Click **+ New query**

### Step 2: Copy & Paste the SQL
Copy the entire contents of:
```
cp2b-workspace/NewLook/backend/data/seed_technologies_expanded.sql
```

### Step 3: Execute
1. Paste into the SQL Editor
2. Click **Run** (or press Ctrl+Enter)
3. Wait for "Success. No rows returned" message

### Step 4: Verify
Run this query to see the new count:
```sql
SELECT category, COUNT(*) as count
FROM technology_cards
GROUP BY category
ORDER BY category;
```

Expected result:
```
byproduct     | 4
digestion     | 7  (was 4, +3)
enduse        | 6  (was 5, +1)
feedstock     | 16 (was 6, +10)
pretreatment  | 7  (was 3, +4)
upgrading     | 6  (was 4, +2)
--------------
TOTAL: 46 technologies (was 26, +20)
```

## What Was Added

### New Feedstocks (10)
✅ Coffee waste (polpa, borra)
✅ Soybean residues (cascas, palha)
✅ Corn residues (sabugo, palha)
✅ Rice residues (casca, palha)
✅ Citrus waste (bagaço, cascas)
✅ Poultry litter (cama de frango)
✅ Fish farm waste (restos de peixe)
✅ Slaughterhouse waste (sangue, vísceras)
✅ Dairy waste (soro de leite)
✅ Waste oils & fats (óleo usado)

### New Pretreatments (4)
✅ Solid-liquid separation
✅ Hygienization/Pasteurization
✅ Co-digestion mixing
✅ Advanced grinding

### New Digesters (3)
✅ Batch digester
✅ Fixed bed reactor
✅ Dry digestion

### New Upgrading (2)
✅ Desulfurization (H₂S removal)
✅ Drying/Dehumidification

### New End Use (1)
✅ Industrial fuel

## Rollback (If Needed)

If you need to remove the new technologies:
```sql
DELETE FROM technology_cards WHERE id IN (
  'feed_coffee', 'feed_soy', 'feed_corn', 'feed_rice', 'feed_citrus',
  'feed_poultry', 'feed_fish', 'feed_slaughter', 'feed_dairy', 'feed_waste_oil',
  'pre_solid_liquid', 'pre_hygienization', 'pre_codigestion', 'pre_grinding',
  'dig_batch', 'dig_fixed_bed', 'dig_dry',
  'upg_desulfurization', 'upg_drying',
  'end_industrial_fuel'
);
```

## Frontend Changes (Automatic)

Once you run the SQL, the frontend will **automatically**:
1. Load the new 46 technologies (was 26)
2. Display them in the palette
3. Allow connections based on rules
4. Show in search results

**No code deployment needed!** Just refresh the browser.

## Connection Rules

The new technologies follow these connection patterns:

### Feedstocks can connect to:
- `pretreatment` - All new agricultural/industrial residues
- `digestion` - Direct digestion (animal waste, dairy, etc.)

### Pretreatments can connect to:
- `digestion` - All pretreatment outputs

### Digesters can connect to:
- `upgrading` - Gas cleaning
- `enduse` - Direct use
- `byproduct` - Digestate, CO₂

### Upgrading can connect to:
- `enduse` - Final applications

## Testing the New Technologies

1. **Refresh the frontend** (Ctrl+F5)
2. **Check the palette** - Should show 46 technologies now
3. **Test search** - Search for "café" or "coffee"
4. **Test connections** - Drag "Resíduos de Café" to canvas
5. **Validate flow** - Connect: Coffee → Digestion → Upgrading → Vehicle Fuel

## Next Steps

### Phase 2: Add More (Later)
- Municipal solid waste (organic fraction)
- Sewage sludge
- Garden waste
- Two-phase digestion
- Green hydrogen production
- Struvite recovery

### Phase 3: Custom Technologies (In Development)
Users will be able to create their own custom technologies with:
- Custom names and emojis
- Custom colors
- Custom connection rules
- References/citations

## Need Help?

If technologies don't appear:
1. Check SQL execution succeeded
2. Verify count: `SELECT COUNT(*) FROM technology_cards;` (should be 46)
3. Clear browser cache (Ctrl+Shift+Delete)
4. Check browser console for errors (F12)

If connections don't work:
1. Check `can_connect_to` and `can_receive_from` arrays
2. Verify categories match exactly
3. Check validation endpoint: `/api/v1/technology-routes/validate-connection`
