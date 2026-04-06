/**
 * Whether a grid column should flex-grow to consume horizontal slack when
 * total column width is less than the grid width. The select column never grows.
 */
export function dataGridColumnShouldGrow(
  columnId: string,
  stretchColumns: boolean,
  stretchColumnIds: readonly string[] | undefined,
): boolean {
  if (columnId === "select") return false;
  if (stretchColumnIds && stretchColumnIds.length > 0) {
    return stretchColumnIds.includes(columnId);
  }
  return stretchColumns;
}

export function sameStretchColumnIds(
  a: readonly string[] | undefined,
  b: readonly string[] | undefined,
): boolean {
  if (a === b) return true;
  if (!a || !b) return a === b;
  if (a.length !== b.length) return false;
  return a.every((v, i) => v === b[i]);
}
