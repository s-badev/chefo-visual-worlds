import { createPortal } from "react-dom";
import { useCallback, useEffect, useId, useRef, useState } from "react";
import { ArrowRight, Check, ChevronDown } from "lucide-react";
import { AiBackLink } from "@/components/ai-back-link";
import { artworkAnchor, pad2 } from "@/components/ai-exhibition";
import { collectionText, getCollectionCover, type AiCollection } from "@/content/ai-collections";
import { getAiWork, localizeAiWork, type AiWork } from "@/content/ai-works";
import { useT } from "@/i18n";
import { LocaleLink } from "@/i18n/link";
import { getResolvedAiCollections, type WorkCollectionPosition } from "@/lib/ai-work-nav";
import { cn } from "@/lib/utils";

type TooltipState = {
  left: number;
  top: number;
  work: AiWork;
  position: number;
};

export function AiArtworkWayfinder({
  current,
  onOpenChange,
}: {
  current: WorkCollectionPosition;
  onOpenChange: (open: boolean) => void;
}) {
  const { t, locale } = useT();
  const m = t.ai;
  const menuId = useId();
  const triggerRef = useRef<HTMLButtonElement>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const pendingFocus = useRef<number | null>(null);
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [mobile, setMobile] = useState(false);
  const [tooltip, setTooltip] = useState<TooltipState | null>(null);
  const collections = getResolvedAiCollections();
  const collectionName = collectionText(current.collection.shortTitle, locale);

  const setMenuOpen = useCallback(
    (next: boolean, returnFocus = false) => {
      setOpen(next);
      onOpenChange(next);
      if (!next) setTooltip(null);
      if (returnFocus) requestAnimationFrame(() => triggerRef.current?.focus());
    },
    [onOpenChange],
  );

  useEffect(() => {
    setMounted(true);
    const query = window.matchMedia("(max-width: 700px)");
    const update = () => setMobile(query.matches);
    update();
    query.addEventListener("change", update);
    return () => query.removeEventListener("change", update);
  }, []);

  useEffect(() => {
    if (!open || pendingFocus.current === null) return;
    const index = pendingFocus.current;
    pendingFocus.current = null;
    requestAnimationFrame(() => {
      panelRef.current
        ?.querySelectorAll<HTMLAnchorElement>(".ai-work-switcher-item")
        [index]?.focus();
    });
  }, [open]);

  useEffect(() => {
    const tick = document.querySelector<HTMLAnchorElement>(".ai-work-tick[aria-current='page']");
    tick?.scrollIntoView?.({ block: "nearest", inline: "center" });
  }, [current.index]);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: PointerEvent) => {
      const node = event.target as Node;
      if (!rootRef.current?.contains(node) && !panelRef.current?.contains(node)) {
        setMenuOpen(false);
      }
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        setMenuOpen(false, true);
      }
    };
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open, setMenuOpen]);

  const focusItem = (index: number) => {
    const wrapped = (index + collections.length) % collections.length;
    panelRef.current
      ?.querySelectorAll<HTMLAnchorElement>(".ai-work-switcher-item")
      [wrapped]?.focus();
  };

  const panel = (
    <div
      ref={panelRef}
      id={menuId}
      role="group"
      aria-label={m.switchCollection}
      className={cn("ai-work-switcher-panel", mobile && "ai-work-switcher-panel--sheet")}
      onBlurCapture={(event) => {
        const next = event.relatedTarget as Node | null;
        if (!next || (!panelRef.current?.contains(next) && !rootRef.current?.contains(next))) {
          setMenuOpen(false);
        }
      }}
      onKeyDown={(event) => {
        const index = Array.from(
          panelRef.current?.querySelectorAll<HTMLAnchorElement>(".ai-work-switcher-item") ?? [],
        ).findIndex((item) => item === document.activeElement);
        if (event.key === "ArrowDown" || event.key === "ArrowUp") {
          event.preventDefault();
          focusItem(index + (event.key === "ArrowDown" ? 1 : -1));
        } else if (event.key === "Home" || event.key === "End") {
          event.preventDefault();
          focusItem(event.key === "Home" ? 0 : collections.length - 1);
        }
      }}
    >
      <p className="ai-work-switcher-title">{m.switchCollection}</p>
      <ul className="ai-work-switcher-list">
        {collections.map(({ collection, slugs }, index) => {
          const active = collection.slug === current.collection.slug;
          const cover = getCollectionCover(collection, locale);
          return (
            <li key={collection.slug}>
              <LocaleLink
                to="/ai-worlds/$slug"
                slug={slugs[0]!}
                aria-current={active ? "page" : undefined}
                className={cn("ai-work-switcher-item", active && "is-current")}
                onClick={(event) => {
                  if (active) event.preventDefault();
                  setMenuOpen(false, active);
                }}
              >
                {cover && (
                  <img
                    src={cover.image}
                    alt=""
                    width={44}
                    height={44}
                    loading="lazy"
                    decoding="async"
                  />
                )}
                <span className="ai-work-switcher-copy">
                  <strong>{collectionText(collection.title, locale)}</strong>
                  <small>
                    {active
                      ? `${m.youAreHere} · ${pad2(current.position)} / ${pad2(current.total)}`
                      : m.count(slugs.length)}
                  </small>
                </span>
                {active && <Check aria-hidden="true" className="size-4" />}
              </LocaleLink>
            </li>
          );
        })}
      </ul>
      <LocaleLink
        to="/ai-worlds/collections/$slug"
        slug={current.collection.slug}
        hash={artworkAnchor(current.slugs[current.index]!)}
        className="ai-work-switcher-footer"
        onClick={() => setMenuOpen(false)}
      >
        {m.toCollectionGrid}
        <ArrowRight aria-hidden="true" className="size-4" />
      </LocaleLink>
    </div>
  );

  return (
    <div className="ai-work-wayfinder">
      <div ref={rootRef} className="ai-work-switcher">
        <AiBackLink
          to="/ai-worlds/collections/$slug"
          slug={current.collection.slug}
          hash={artworkAnchor(current.slugs[current.index]!)}
          label={m.backToAiWorlds}
        />
        <span aria-hidden="true" className="ai-work-switcher-slash">
          /
        </span>
        <button
          ref={triggerRef}
          type="button"
          aria-expanded={open}
          aria-controls={menuId}
          aria-label={m.switchCollectionName(collectionName)}
          className="ai-work-switcher-trigger"
          onClick={() => setMenuOpen(!open)}
          onKeyDown={(event) => {
            if (event.key === "ArrowDown" || event.key === "ArrowUp") {
              event.preventDefault();
              const targetIndex = event.key === "ArrowDown" ? 0 : collections.length - 1;
              if (open) focusItem(targetIndex);
              else {
                pendingFocus.current = targetIndex;
                setMenuOpen(true);
              }
            }
          }}
        >
          <span>{collectionName}</span>
          <ChevronDown aria-hidden="true" className="size-4" />
        </button>
        {open && (!mobile || !mounted) && panel}
      </div>

      {current.total > 1 && (
        <nav aria-label={m.workProgress} className="ai-work-ticks">
          {current.slugs.map((slug, index) => {
            const raw = getAiWork(slug)!;
            const item = localizeAiWork(raw, locale);
            const active = index === current.index;
            return (
              <LocaleLink
                key={slug}
                to="/ai-worlds/$slug"
                slug={slug}
                aria-current={active ? "page" : undefined}
                aria-label={m.workPosition(item.title, pad2(index + 1), pad2(current.total))}
                className={cn("ai-work-tick", active && "is-current")}
                onPointerEnter={(event) => {
                  if (!window.matchMedia("(hover: hover) and (pointer: fine)").matches) return;
                  const rect = event.currentTarget.getBoundingClientRect();
                  setTooltip({
                    left: rect.left + rect.width / 2,
                    top: rect.top - 10,
                    work: item,
                    position: index + 1,
                  });
                }}
                onPointerLeave={() => setTooltip(null)}
                onFocus={(event) => {
                  if (!window.matchMedia("(hover: hover) and (pointer: fine)").matches) return;
                  const rect = event.currentTarget.getBoundingClientRect();
                  setTooltip({
                    left: rect.left + rect.width / 2,
                    top: rect.top - 10,
                    work: item,
                    position: index + 1,
                  });
                }}
                onBlur={() => setTooltip(null)}
              >
                <span aria-hidden="true" />
              </LocaleLink>
            );
          })}
        </nav>
      )}

      <p aria-hidden="true" className="ai-work-counter">
        <strong>{pad2(current.position)}</strong>
        <span>/ {pad2(current.total)}</span>
      </p>

      {mounted &&
        open &&
        mobile &&
        createPortal(
          <>
            <button
              type="button"
              aria-label={m.closeFilters}
              className="ai-work-switcher-backdrop"
              onClick={() => setMenuOpen(false, true)}
            />
            {panel}
          </>,
          document.body,
        )}

      {mounted &&
        tooltip &&
        createPortal(
          <div
            role="tooltip"
            className="ai-work-tick-tooltip"
            style={{ left: tooltip.left, top: tooltip.top }}
          >
            <img
              src={tooltip.work.image}
              alt=""
              width={56}
              height={44}
              loading="lazy"
              decoding="async"
            />
            <span>
              <strong>{tooltip.work.title}</strong>
              <small>
                {pad2(tooltip.position)} / {pad2(current.total)}
              </small>
            </span>
          </div>,
          document.body,
        )}
    </div>
  );
}
