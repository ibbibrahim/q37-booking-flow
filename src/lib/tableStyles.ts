/**
 * Shared "data grid" look for list tables (same as the BIT tickets / booking tables).
 * Apply alongside the `Table*` primitives from `@/components/ui/table`.
 */

/** Rounded card around the table; put an `overflow-x-auto` div directly inside it. */
export const DATA_TABLE_WRAPPER = 'overflow-hidden rounded-xl border border-border bg-card shadow-sm';

/** On `<Table>`: column dividers. Logical (`border-e`) so they sit correctly in RTL too. Add a `min-w-[...]` per table. */
export const DATA_TABLE_GRID =
  '[&_th]:border-e [&_td]:border-e [&_th]:border-border/70 [&_td]:border-border/70 [&_th:last-child]:border-e-0 [&_td:last-child]:border-e-0';

/** On the header `<TableRow>`. */
export const DATA_TABLE_HEADER_ROW = 'bg-muted/50 hover:bg-muted/50';

/** On each `<TableHead>`. */
export const DATA_TABLE_HEAD = 'h-10 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground';

/** On body `<TableRow>`s (add `cursor-pointer` only when the row is clickable). */
export const DATA_TABLE_ROW = 'transition-colors hover:bg-muted/30';
