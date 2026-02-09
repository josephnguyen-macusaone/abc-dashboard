# Licenses Data Grid – Cell alignment (left-center) plan

**Goal:** All cells (display and edit) use **left + vertical center** alignment. When clicking to edit, when the cell is empty, and by default, content and cursor should appear in the **left middle** of the cell.

---

## 1. Current state

- **DataGridCellWrapper** (`data-grid-cell-wrapper.tsx`): Already uses `flex items-center justify-start text-start` and `!px-4 !py-3`. So the wrapper is left-aligned and vertically centered; any inconsistency comes from inner content/editors.
- **ShortTextCell**: contentEditable div is `block w-full`; when editing it gets `flex min-h-full items-center` but no explicit `justify-start` or `text-left`. Empty content can make alignment look off.
- **NumberCell**: Input has `w-full` but no explicit `text-left`.
- **DateCell**: Wraps content in `flex size-full items-center justify-center` → **center** alignment; should be **justify-start** for left-center.
- **SelectCell / AgentsNameCell**: Use Popover; anchor/display may need explicit left alignment.

---

## 2. Changes to make

### 2.1 DataGridCellWrapper (no change required)

- Keep: `flex items-center justify-start text-start`, `!px-4 !py-3`.
- Optional: add a class so all direct children (content/editors) are forced to align left and fill height, e.g. `[&>div]:flex [&>div]:items-center [&>div]:justify-start [&>div]:min-h-full` only if we want a single place to enforce alignment; otherwise do it per variant.

### 2.2 ShortTextCell (`data-grid-cell-variants.tsx`)

- **Content/editor div (contentEditable):**
  - Add `text-left` so text and cursor are always left-aligned.
  - When editing: keep `flex min-h-full items-center` and add `justify-start` so content stays at left when empty or with text.
  - Ensure the div has `min-h-full` so it fills the cell height and vertical centering works; when empty, cursor stays left-center.
- **Display (non-edit):** Content is already inside the wrapper (items-center justify-start); add `text-left` on the content node for consistency.

### 2.3 NumberCell

- Add `text-left` to the `<input>` so the value and cursor are left-aligned in the cell.

### 2.4 DateCell

- Change the inner wrapper from `justify-center` to `justify-start` so the date display and popover anchor are left-center instead of center.

### 2.5 SelectCell / AgentsNameCell

- Ensure the display span/anchor and any inline editor use `text-left` and are in a container with `justify-start` (or rely on wrapper’s justify-start). Check PopoverAnchor wrapper divs for `justify-center` and change to `justify-start` if present.

### 2.6 Other variants (Checkbox, MultiSelect)

- Checkbox: usually centered is fine; if we want left-center, align the row content with `justify-start` and optional offset for the checkbox.
- MultiSelect: same as SelectCell – display and editor left-center.

---

## 3. Verification

- Click to edit a DBA (short-text) cell: text and cursor at left, vertically centered.
- Clear all text: cursor remains left-center.
- Number cell: value and cursor left, vertically centered.
- Date cell: display and editor anchor left-center (not center).
- Select / Agents Name: display text left-center; dropdown/popover can stay as-is.

---

## 4. Files to touch

| File | Change |
|------|--------|
| `data-grid-cell-wrapper.tsx` | Optional: enforce child alignment; else no change. |
| `data-grid-cell-variants.tsx` | ShortTextCell: add `text-left`, `justify-start`, ensure `min-h-full` when editing. NumberCell: `text-left` on input. DateCell: `justify-center` → `justify-start`. SelectCell/AgentsNameCell: ensure left alignment where needed. |
