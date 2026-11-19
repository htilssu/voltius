export type CardLayout = "grid" | "list" | "row";

const SPACING: Record<CardLayout, string> = {
  grid: "gap-4 px-4 py-4 rounded-[var(--r-lg)]",
  list: "gap-2.5 px-4 py-2.5 rounded-[var(--r-md)]",
  row: "gap-4 px-2 h-full rounded-[var(--r-md)]",
};

export const dashedCardClass = (layout: CardLayout): string => `flex items-center border-2 border-dashed ${SPACING[layout]}`;
