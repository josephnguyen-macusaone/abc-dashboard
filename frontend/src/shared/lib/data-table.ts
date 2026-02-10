import type {
  ExtendedColumnFilter,
  FilterOperator,
  FilterVariant,
} from "@/types/data-table";

// Explicit operator definitions (moved from data-table config)
const textOperators = [
  { label: "Contains", value: "iLike" as const },
  { label: "Does not contain", value: "notILike" as const },
  { label: "Is", value: "eq" as const },
  { label: "Is not", value: "ne" as const },
  { label: "Is empty", value: "isEmpty" as const },
  { label: "Is not empty", value: "isNotEmpty" as const },
];

const numericOperators = [
  { label: "Is", value: "eq" as const },
  { label: "Is not", value: "ne" as const },
  { label: "Is less than", value: "lt" as const },
  { label: "Is less than or equal to", value: "lte" as const },
  { label: "Is greater than", value: "gt" as const },
  { label: "Is greater than or equal to", value: "gte" as const },
  { label: "Is between", value: "isBetween" as const },
  { label: "Is empty", value: "isEmpty" as const },
  { label: "Is not empty", value: "isNotEmpty" as const },
];

const dateOperators = [
  { label: "Is", value: "eq" as const },
  { label: "Is not", value: "ne" as const },
  { label: "Is before", value: "lt" as const },
  { label: "Is after", value: "gt" as const },
  { label: "Is on or before", value: "lte" as const },
  { label: "Is on or after", value: "gte" as const },
  { label: "Is between", value: "isBetween" as const },
  { label: "Is relative to today", value: "isRelativeToToday" as const },
  { label: "Is empty", value: "isEmpty" as const },
  { label: "Is not empty", value: "isNotEmpty" as const },
];

const booleanOperators = [
  { label: "Is", value: "eq" as const },
  { label: "Is not", value: "ne" as const },
];

const selectOperators = [
  { label: "Is", value: "eq" as const },
  { label: "Is not", value: "ne" as const },
  { label: "Is empty", value: "isEmpty" as const },
  { label: "Is not empty", value: "isNotEmpty" as const },
];

const multiSelectOperators = [
  { label: "Has any of", value: "inArray" as const },
  { label: "Has none of", value: "notInArray" as const },
  { label: "Is empty", value: "isEmpty" as const },
  { label: "Is not empty", value: "isNotEmpty" as const },
];

export function getFilterOperators(filterVariant: FilterVariant) {
  const operatorMap: Record<
    FilterVariant,
    { label: string; value: FilterOperator }[]
  > = {
    text: textOperators,
    number: numericOperators,
    range: numericOperators,
    date: dateOperators,
    dateRange: dateOperators,
    boolean: booleanOperators,
    select: selectOperators,
    multiSelect: multiSelectOperators,
  };

  return operatorMap[filterVariant] ?? textOperators;
}

export function getDefaultFilterOperator(filterVariant: FilterVariant) {
  const operators = getFilterOperators(filterVariant);

  return operators[0]?.value ?? (filterVariant === "text" ? "iLike" : "eq");
}

export function getValidFilters<TData>(
  filters: ExtendedColumnFilter<TData>[],
): ExtendedColumnFilter<TData>[] {
  return filters.filter(
    (filter) =>
      filter.operator === "isEmpty" ||
      filter.operator === "isNotEmpty" ||
      (Array.isArray(filter.value)
        ? filter.value.length > 0
        : filter.value !== "" &&
          filter.value !== null &&
          filter.value !== undefined),
  );
}
