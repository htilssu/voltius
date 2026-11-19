import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { Icon } from "@iconify/react";
import { getTerminalSearchController, type TerminalSearchController, type TerminalSearchSnapshot } from "@/hooks/useTerminal";

const EMPTY: TerminalSearchSnapshot = {
  open: false,
  query: "",
  caseSensitive: false,
  wholeWord: false,
  regex: false,
  resultIndex: -1,
  resultCount: 0,
  invalidRegex: false,
  focusTick: 0,
};

export function TerminalSearch({ sessionId }: { sessionId: string }) {
  const { t } = useTranslation();
  const [controller, setController] = useState<TerminalSearchController | null>(
    () => getTerminalSearchController(sessionId),
  );
  const [snapshot, setSnapshot] = useState<TerminalSearchSnapshot>(
    () => controller?.getSnapshot() ?? EMPTY,
  );
  const inputRef = useRef<HTMLInputElement | null>(null);

  // Attach to the per-session controller as soon as the terminal cache entry exists.
  // The cache is populated by useTerminal's attach callback, which may run after
  // TerminalSearch's first render, so we poll for one frame before giving up.
  useEffect(() => {
    let unsubscribe: (() => void) | null = null;
    let frame = 0;
    let cancelled = false;

    const tryAttach = () => {
      if (cancelled) return;
      const c = getTerminalSearchController(sessionId);
      if (c) {
        setController(c);
        setSnapshot(c.getSnapshot());
        unsubscribe = c.subscribe(() => setSnapshot(c.getSnapshot()));
        return;
      }
      frame = requestAnimationFrame(tryAttach);
    };
    tryAttach();

    return () => {
      cancelled = true;
      if (frame) cancelAnimationFrame(frame);
      unsubscribe?.();
    };
  }, [sessionId]);

  // Focus & select-all whenever the widget opens (or is re-opened while open).
  useEffect(() => {
    if (snapshot.open && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [snapshot.open, snapshot.focusTick]);

  if (!controller || !snapshot.open) return null;

  const { query, caseSensitive, wholeWord, regex, resultIndex, resultCount, invalidRegex } = snapshot;
  const hasQuery = query.length > 0;
  const showNoResults = hasQuery && resultCount === 0 && !invalidRegex;
  const showError = invalidRegex || showNoResults;

  const counter = !hasQuery
    ? ""
    : invalidRegex
      ? t("terminal.search.invalid")
      : resultCount === 0
        ? t("terminal.search.noResults")
        : t("terminal.search.resultCounter", { index: resultIndex + 1, count: resultCount });

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Escape") {
      e.preventDefault();
      controller!.close();
      return;
    }
    if (e.key === "Enter") {
      e.preventDefault();
      if (e.shiftKey) controller!.prev();
      else controller!.next();
      return;
    }
    if (e.altKey && (e.key === "c" || e.key === "C")) {
      e.preventDefault();
      controller!.toggleCaseSensitive();
      return;
    }
    if (e.altKey && (e.key === "w" || e.key === "W")) {
      e.preventDefault();
      controller!.toggleWholeWord();
      return;
    }
    if (e.altKey && (e.key === "r" || e.key === "R")) {
      e.preventDefault();
      controller!.toggleRegex();
      return;
    }
  }

  return (
    <div
      className="surface-float absolute top-2 right-2 z-30 flex items-center gap-1 animate-fadeIn"
      style={{
        padding: "5px 6px",
        width: "min(420px, calc(100% - 16px))",
      }}
      onClick={(e) => e.stopPropagation()}
    >
      <Icon
        icon="lucide:search"
        width={13}
        className="shrink-0 ml-1.5 mr-0.5"
        style={{ color: "var(--t-text-dim)" }}
      />

      <div className="relative flex-1 min-w-0">
        <input
          ref={inputRef}
          value={query}
          onChange={(e) => controller.setQuery(e.target.value)}
          onKeyDown={handleKeyDown}
          spellCheck={false}
          autoComplete="off"
          placeholder={t("terminal.search.placeholder")}
          className="w-full bg-transparent text-sm outline-hidden px-1 py-1 text-(--t-text-primary) placeholder-(--t-text-muted)"
          style={{
            boxShadow: showError ? "inset 2px 0 0 var(--t-status-error)" : undefined,
          }}
        />
      </div>

      <span
        className="text-xs tabular-nums whitespace-nowrap px-1.5 select-none"
        style={{
          color: showError ? "var(--t-status-error)" : "var(--t-text-dim)",
        }}
      >
        {counter}
      </span>

      <div className="flex items-center gap-0.5 pl-1 ml-0.5" style={{ borderLeft: "1px solid var(--t-border)" }}>
        <ToggleChip active={caseSensitive} title={t("terminal.search.matchCase")} onClick={controller.toggleCaseSensitive}>
          <span className="font-semibold text-2xs tracking-tight">Aa</span>
        </ToggleChip>
        <ToggleChip active={wholeWord} title={t("terminal.search.matchWholeWord")} onClick={controller.toggleWholeWord}>
          <span
            className="font-semibold text-2xs tracking-tight leading-none border-b-[1.5px] border-current"
          >
            ab
          </span>
        </ToggleChip>
        <ToggleChip active={regex} title={t("terminal.search.useRegex")} onClick={controller.toggleRegex}>
          <span className="font-semibold text-2xs tracking-tight">.*</span>
        </ToggleChip>
      </div>

      <div className="flex items-center gap-0.5 pl-0.5">
        <IconButton
          title={t("terminal.search.previousMatch")}
          icon="lucide:chevron-up"
          disabled={!hasQuery || resultCount === 0}
          onClick={controller.prev}
        />
        <IconButton
          title={t("terminal.search.nextMatch")}
          icon="lucide:chevron-down"
          disabled={!hasQuery || resultCount === 0}
          onClick={controller.next}
        />
        <IconButton title={t("terminal.search.closeTitle")} icon="lucide:x" onClick={controller.close} />
      </div>
    </div>
  );
}

// ─── Local controls ──────────────────────────────────────────────────────────

function ToggleChip({
  active,
  title,
  onClick,
  children,
}: {
  active: boolean;
  title: string;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      title={title}
      onClick={onClick}
      onMouseDown={(e) => e.preventDefault()}
      aria-pressed={active}
      className={`size-[22px] rounded-sm border transition-colors flex items-center justify-center select-none ${
        active
          ? "bg-(--t-accent) border-(--t-accent) text-(--t-on-accent)"
          : "border-transparent text-(--t-text-dim) hover:bg-(--t-bg-elevated) hover:text-(--t-text-primary)"
      }`}
    >
      {children}
    </button>
  );
}

function IconButton({
  icon,
  title,
  onClick,
  disabled,
}: {
  icon: string;
  title: string;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      title={title}
      onClick={onClick}
      onMouseDown={(e) => e.preventDefault()}
      disabled={disabled}
      aria-label={title}
      className="size-[22px] rounded-sm transition-colors flex items-center justify-center text-(--t-text-dim) enabled:hover:bg-(--t-bg-elevated) enabled:hover:text-(--t-text-primary) disabled:opacity-(--disabled-opacity) disabled:cursor-not-allowed"
    >
      <Icon icon={icon} width={14} />
    </button>
  );
}

export default TerminalSearch;
