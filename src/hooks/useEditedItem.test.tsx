import { afterEach, expect, test, vi } from "vitest";
import { act, cleanup, renderHook } from "@testing-library/react";
import { useEditedItem } from "./useEditedItem";

afterEach(cleanup);

type Item = { id: string };

test("a create in flight is not gone; a shown item that disappears is, and closes the screen", () => {
  const close = vi.fn();
  const { result, rerender } = renderHook(({ items }: { items: Item[] }) => useEditedItem(items, undefined, close), {
    initialProps: { items: [] as Item[] },
  });
  expect(result.current.editing).toBeNull();
  expect(result.current.gone).toBe(false);

  act(() => result.current.onCreated({ id: "n1" }));
  // Created, not in the list yet.
  expect(result.current.gone).toBe(false);

  rerender({ items: [{ id: "n1" }] });
  expect(result.current.editing?.id).toBe("n1");

  rerender({ items: [] });
  expect(result.current.gone).toBe(true);
  expect(close).toHaveBeenCalledTimes(1);
});
