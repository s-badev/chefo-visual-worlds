import { useState } from "react";
import { SlidersHorizontal, X } from "lucide-react";
import * as Dialog from "@radix-ui/react-dialog";
import {
  aiCategoryLabel,
  aiEraLabel,
  aiRoleLabel,
  aiSettingLabel,
  aiWorks,
  filterAiWorks,
  getAiFilterOptions,
  toolLabel,
  type AiEra,
  type AiRole,
  type AiSetting,
} from "@/content/ai-works";
import { Chip } from "@/components/site";
import { useT, type Locale } from "@/i18n";
import { cn } from "@/lib/utils";

export const AI_FILTER_KEYS = ["category", "role", "era", "setting", "tool"] as const;
export type AiFilterKey = (typeof AI_FILTER_KEYS)[number];
export type AiFilterValues = Partial<Record<AiFilterKey, string | undefined>>;

const EMPTY: Required<{ [K in AiFilterKey]: undefined }> = {
  category: undefined,
  role: undefined,
  era: undefined,
  setting: undefined,
  tool: undefined,
};

export const countActiveFilters = (values: AiFilterValues) =>
  AI_FILTER_KEYS.filter((key) => values[key]).length;

/** The five filter groups with localized labels; options come only from completed works. */
function useFilterGroups(locale: Locale) {
  const { t } = useT();
  const o = getAiFilterOptions();
  const groups: { key: AiFilterKey; label: string; options: { value: string; label: string }[] }[] =
    [
      {
        key: "category",
        label: t.ai.theme,
        options: o.categories.map((v) => ({ value: v, label: aiCategoryLabel(v, locale) })),
      },
      {
        key: "role",
        label: t.ai.role,
        options: o.roles.map((v) => ({ value: v, label: aiRoleLabel(v as AiRole, locale) })),
      },
      {
        key: "era",
        label: t.ai.era,
        options: o.eras.map((v) => ({ value: v, label: aiEraLabel(v as AiEra, locale) })),
      },
      {
        key: "setting",
        label: t.ai.setting,
        options: o.settings.map((v) => ({
          value: v,
          label: aiSettingLabel(v as AiSetting, locale),
        })),
      },
      {
        key: "tool",
        label: t.ai.tool,
        options: o.tools.map((v) => ({ value: v, label: toolLabel(v, locale) })),
      },
    ];
  return groups;
}

function FilterGroups({
  values,
  onToggle,
}: {
  values: AiFilterValues;
  onToggle: (key: AiFilterKey, value: string | undefined) => void;
}) {
  const { t, locale } = useT();
  const groups = useFilterGroups(locale);
  return (
    <div className="grid gap-x-10 gap-y-6 md:grid-cols-2 xl:grid-cols-3">
      {groups.map((group) => (
        <div key={group.key} role="group" aria-label={group.label} className="min-w-0">
          <p className="eyebrow text-muted-foreground">{group.label}</p>
          <div className="mt-3 flex flex-wrap gap-2">
            <Chip active={!values[group.key]} onClick={() => onToggle(group.key, undefined)}>
              {t.common.all}
            </Chip>
            {group.options.map((option) => (
              <Chip
                key={option.value}
                active={values[group.key] === option.value}
                onClick={() =>
                  onToggle(group.key, values[group.key] === option.value ? undefined : option.value)
                }
              >
                {option.label}
              </Chip>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

const triggerClass =
  "interaction-control interaction-text-button inline-flex min-h-11 items-center gap-2 rounded-full border border-border py-2 text-sm font-semibold aria-expanded:border-gold";

/**
 * Filtering stays secondary to the artwork: one "Filters" control. From md up it unfolds
 * an inline panel that applies immediately; on phones it opens a bottom sheet with a draft
 * selection that is applied (or discarded) explicitly.
 */
export function AiFilterBar({
  values,
  count,
  onChange,
}: {
  values: AiFilterValues;
  count: number;
  onChange: (patch: AiFilterValues) => void;
}) {
  const { t, locale } = useT();
  const m = t.ai;
  const groups = useFilterGroups(locale);
  const [panelOpen, setPanelOpen] = useState(false);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [draft, setDraft] = useState<AiFilterValues>(values);
  const active = countActiveFilters(values);
  const draftCount = filterAiWorks(aiWorks, draft).length;

  const label = (
    <>
      <SlidersHorizontal aria-hidden="true" className="size-4" />
      {m.filters}
      {active > 0 && <span className="text-gold">· {active}</span>}
    </>
  );

  const chips = groups.flatMap((group) => {
    const value = values[group.key];
    const option = value ? group.options.find((o) => o.value === value) : undefined;
    return option ? [{ key: group.key, label: option.label }] : [];
  });

  return (
    <div>
      <div className="flex items-center justify-between gap-4 border-y border-border py-4">
        <p className="text-sm text-muted-foreground" aria-live="polite">
          {m.count(count)}
        </p>
        <button
          type="button"
          aria-expanded={panelOpen}
          aria-controls="ai-filter-panel"
          onClick={() => setPanelOpen((open) => !open)}
          className={cn(triggerClass, "hidden md:inline-flex")}
        >
          {label}
        </button>
        <Dialog.Root
          open={sheetOpen}
          onOpenChange={(open) => {
            if (open) setDraft(values);
            setSheetOpen(open);
          }}
        >
          <Dialog.Trigger className={cn(triggerClass, "md:hidden")}>{label}</Dialog.Trigger>
          <Dialog.Portal>
            <Dialog.Overlay className="fixed inset-0 z-50 bg-navy/70 backdrop-blur-sm duration-(--dur-base) ease-cinematic data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=closed]:animate-out data-[state=closed]:fade-out-0" />
            <Dialog.Content
              aria-describedby={undefined}
              className="surface-dark fixed inset-x-0 bottom-0 z-50 flex max-h-[88dvh] flex-col rounded-t-lg border-t border-gold/40 outline-none duration-(--dur-base) ease-cinematic data-[state=open]:animate-in data-[state=open]:slide-in-from-bottom-6 data-[state=open]:fade-in-0 data-[state=closed]:animate-out data-[state=closed]:fade-out-0"
            >
              <div className="flex items-center justify-between border-b border-border px-5 py-4">
                <Dialog.Title className="font-serif text-2xl">{m.filters}</Dialog.Title>
                <Dialog.Close
                  aria-label={m.closeFilters}
                  className="interaction-icon relative rounded-full border border-transparent p-2 after:absolute after:-inset-1"
                >
                  <X className="size-5" />
                </Dialog.Close>
              </div>
              <div className="flex-1 overflow-y-auto px-5 py-6">
                <FilterGroups
                  values={draft}
                  onToggle={(key, value) => setDraft((d) => ({ ...d, [key]: value }))}
                />
              </div>
              <div className="flex items-center justify-between gap-4 border-t border-border px-5 pb-[max(1rem,env(safe-area-inset-bottom))] pt-4">
                <button
                  type="button"
                  onClick={() => setDraft(EMPTY)}
                  className="interaction-link interaction-text-button py-2 text-sm font-semibold underline decoration-border underline-offset-4 transition-colors"
                >
                  {m.resetFilters}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    onChange({ ...EMPTY, ...draft });
                    setSheetOpen(false);
                  }}
                  className="interaction-primary inline-flex items-center rounded-sm text-sm font-semibold"
                >
                  {m.applyFilters(draftCount)}
                </button>
              </div>
            </Dialog.Content>
          </Dialog.Portal>
        </Dialog.Root>
      </div>

      <div
        id="ai-filter-panel"
        hidden={!panelOpen}
        className="border-b border-border py-8 motion-safe:animate-in motion-safe:fade-in-0 motion-safe:slide-in-from-top-1"
      >
        <FilterGroups values={values} onToggle={(key, value) => onChange({ [key]: value })} />
      </div>

      {chips.length > 0 && (
        <div
          role="group"
          aria-label={m.activeFilters}
          className="mt-4 flex flex-wrap items-center gap-2"
        >
          {chips.map((chip) => (
            <button
              key={chip.key}
              type="button"
              onClick={() => onChange({ [chip.key]: undefined })}
              aria-label={m.removeFilter(chip.label)}
              className="interaction-control interaction-text-button inline-flex min-h-11 items-center gap-1.5 rounded-full bg-surface-raised py-1 text-xs font-semibold"
            >
              {chip.label}
              <X aria-hidden="true" className="size-3" />
            </button>
          ))}
          <button
            type="button"
            onClick={() => onChange(EMPTY)}
            className="interaction-link interaction-text-button min-h-11 py-1 text-xs font-semibold text-muted-foreground underline underline-offset-4 transition-colors"
          >
            {m.resetFilters}
          </button>
        </div>
      )}
    </div>
  );
}
