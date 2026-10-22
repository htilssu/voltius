import { createContext, useContext } from "react";

/**
 * True inside an Android settings list row (SettingRow): controls render in their
 * trailing form there, e.g. FormSelect shows its value as text instead of a boxed field,
 * and mark themselves as the control a tap on the row forwards to.
 */
export const ListRowContext = createContext(false);

export const useInListRow = () => useContext(ListRowContext);
