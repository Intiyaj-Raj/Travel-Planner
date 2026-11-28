import React, { useMemo, useState } from "react";
import {
  CheckSquare,
  ChevronDown,
  ChevronRight,
  Luggage,
  Plus,
  Search,
  Square,
  Trash2,
} from "lucide-react";
import { PackingGroup, PackingTemplate } from "../types/trip";
import { PACKING_TEMPLATES } from "../data/mockTrip";

interface PackingManagerProps {
  groups: PackingGroup[];
  onUpdateGroups: (groups: PackingGroup[]) => void;
}

export function PackingManager({
  groups,
  onUpdateGroups,
}: PackingManagerProps) {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<
    "all" | "remaining" | "packed"
  >("all");
  const [collapsedGroups, setCollapsedGroups] = useState<
    Record<string, boolean>
  >({});
  const [newGroupTitle, setNewGroupTitle] = useState("");
  const [newItemInputs, setNewItemInputs] = useState<Record<string, string>>(
    {},
  );
  const [newSubInputs, setNewSubInputs] = useState<Record<string, string>>({});
  const [openSubForm, setOpenSubForm] = useState<Record<string, boolean>>({});

  // Compute overall progress across both top-level items & nested sub-items
  const stats = useMemo(() => {
    let totalChecks = 0;
    let doneChecks = 0;
    groups.forEach((g) => {
      g.items.forEach((item) => {
        if (item.subItems.length > 0) {
          item.subItems.forEach((sub) => {
            totalChecks += 1;
            if (sub.checked) doneChecks += 1;
          });
        } else {
          totalChecks += 1;
          if (item.checked) doneChecks += 1;
        }
      });
    });
    const pct =
      totalChecks > 0 ? Math.round((doneChecks / totalChecks) * 100) : 0;
    return { totalChecks, doneChecks, pct };
  }, [groups]);

  const applyTemplate = (
    template: PackingTemplate,
    mode: "merge" | "replace",
  ) => {
    const clonedGroups: PackingGroup[] = template.groups.map((g, gi) => ({
      id: `pg-${Date.now()}-${gi}`,
      title: g.title,
      items: g.items.map((item, ii) => ({
        ...item,
        id: `pi-${Date.now()}-${gi}-${ii}`,
        subItems: item.subItems.map((s, si) => ({
          ...s,
          id: `ps-${Date.now()}-${gi}-${ii}-${si}`,
        })),
      })),
    }));

    if (mode === "replace") {
      onUpdateGroups(clonedGroups);
      return;
    }

    // Merge by group title
    const next = [...groups];
    clonedGroups.forEach((incoming) => {
      const existingIdx = next.findIndex(
        (g) => g.title.toLowerCase() === incoming.title.toLowerCase(),
      );
      if (existingIdx >= 0) {
        const existingLabels = new Set(
          next[existingIdx].items.map((i) => i.label.toLowerCase()),
        );
        const uniqueItems = incoming.items.filter(
          (i) => !existingLabels.has(i.label.toLowerCase()),
        );
        next[existingIdx] = {
          ...next[existingIdx],
          items: [...next[existingIdx].items, ...uniqueItems],
        };
      } else {
        next.push(incoming);
      }
    });
    onUpdateGroups(next);
  };

  const handleAddGroup = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newGroupTitle.trim()) return;
    onUpdateGroups([
      ...groups,
      { id: `pg-${Date.now()}`, title: newGroupTitle.trim(), items: [] },
    ]);
    setNewGroupTitle("");
  };

  const handleDeleteGroup = (groupId: string) => {
    onUpdateGroups(groups.filter((g) => g.id !== groupId));
  };

  const handleAddItem = (groupId: string) => {
    const label = (newItemInputs[groupId] || "").trim();
    if (!label) return;
    onUpdateGroups(
      groups.map((g) =>
        g.id === groupId
          ? {
              ...g,
              items: [
                ...g.items,
                {
                  id: `pi-${Date.now()}`,
                  label,
                  quantity: 1,
                  checked: false,
                  subItems: [],
                },
              ],
            }
          : g,
      ),
    );
    setNewItemInputs((prev) => ({ ...prev, [groupId]: "" }));
  };

  const handleToggleItem = (groupId: string, itemId: string) => {
    onUpdateGroups(
      groups.map((g) => {
        if (g.id !== groupId) return g;
        return {
          ...g,
          items: g.items.map((item) => {
            if (item.id !== itemId) return item;
            const nextChecked = !item.checked;
            return {
              ...item,
              checked: nextChecked,
              subItems: item.subItems.map((s) => ({
                ...s,
                checked: nextChecked,
              })),
            };
          }),
        };
      }),
    );
  };

  const handleUpdateQty = (groupId: string, itemId: string, delta: number) => {
    onUpdateGroups(
      groups.map((g) =>
        g.id === groupId
          ? {
              ...g,
              items: g.items.map((item) =>
                item.id === itemId
                  ? { ...item, quantity: Math.max(1, item.quantity + delta) }
                  : item,
              ),
            }
          : g,
      ),
    );
  };

  const handleDeleteItem = (groupId: string, itemId: string) => {
    onUpdateGroups(
      groups.map((g) =>
        g.id === groupId
          ? { ...g, items: g.items.filter((i) => i.id !== itemId) }
          : g,
      ),
    );
  };

  const handleAddSubItem = (groupId: string, itemId: string) => {
    const label = (newSubInputs[itemId] || "").trim();
    if (!label) return;
    onUpdateGroups(
      groups.map((g) =>
        g.id === groupId
          ? {
              ...g,
              items: g.items.map((item) =>
                item.id === itemId
                  ? {
                      ...item,
                      checked: false,
                      subItems: [
                        ...item.subItems,
                        { id: `ps-${Date.now()}`, label, checked: false },
                      ],
                    }
                  : item,
              ),
            }
          : g,
      ),
    );
    setNewSubInputs((prev) => ({ ...prev, [itemId]: "" }));
  };

  const handleToggleSubItem = (
    groupId: string,
    itemId: string,
    subId: string,
  ) => {
    onUpdateGroups(
      groups.map((g) => {
        if (g.id !== groupId) return g;
        return {
          ...g,
          items: g.items.map((item) => {
            if (item.id !== itemId) return item;
            const nextSubs = item.subItems.map((s) =>
              s.id === subId ? { ...s, checked: !s.checked } : s,
            );
            const allChecked =
              nextSubs.length > 0 && nextSubs.every((s) => s.checked);
            return { ...item, checked: allChecked, subItems: nextSubs };
          }),
        };
      }),
    );
  };

  const handleDeleteSubItem = (
    groupId: string,
    itemId: string,
    subId: string,
  ) => {
    onUpdateGroups(
      groups.map((g) =>
        g.id === groupId
          ? {
              ...g,
              items: g.items.map((item) => {
                if (item.id !== itemId) return item;
                const nextSubs = item.subItems.filter((s) => s.id !== subId);
                const allChecked =
                  nextSubs.length > 0
                    ? nextSubs.every((s) => s.checked)
                    : item.checked;
                return { ...item, checked: allChecked, subItems: nextSubs };
              }),
            }
          : g,
      ),
    );
  };

  const q = search.trim().toLowerCase();

  return (
    <div className="mx-auto max-w-[1280px] px-4 sm:px-6 py-6 space-y-6">
      {/* Header & Overall Progress */}
      <div className="rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="font-display text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
              Packing & Checklist Manager
            </h1>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              Organize gear into nested lists, apply trip templates, and track
              packing completion.
            </p>
          </div>
          <div className="text-right">
            <div className="font-mono text-2xl font-semibold tabular-nums text-teal-700 dark:text-teal-400">
              {stats.pct}%
            </div>
            <div className="font-mono text-xs tabular-nums text-slate-500 dark:text-slate-400">
              {stats.doneChecks} / {stats.totalChecks} items packed
            </div>
          </div>
        </div>

        <div className="mt-4 h-2.5 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
          <div
            className="h-full rounded-full bg-teal-600 dark:bg-teal-500 transition-all duration-200"
            style={{ width: `${stats.pct}%` }}
          />
        </div>
      </div>

      {/* Templates Library */}
      <section className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
        <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
          <h2 className="font-display text-sm font-semibold text-slate-900 dark:text-slate-100">
            Quick Templates
          </h2>
          {groups.length > 0 && (
            <button
              type="button"
              onClick={() => onUpdateGroups([])}
              className="text-xs font-medium text-rose-600 hover:underline dark:text-rose-400"
            >
              Clear Entire List
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {PACKING_TEMPLATES.map((tpl) => (
            <div
              key={tpl.id}
              className="flex flex-col justify-between rounded-lg border border-slate-200/80 bg-slate-50/70 p-3 dark:border-slate-800 dark:bg-slate-950/60"
            >
              <div>
                <h3 className="text-xs font-semibold text-slate-900 dark:text-slate-100">
                  {tpl.name}
                </h3>
                <p className="mt-1 text-[11px] leading-relaxed text-slate-500 dark:text-slate-400">
                  {tpl.description}
                </p>
              </div>
              <div className="mt-3 flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => applyTemplate(tpl, "merge")}
                  className="flex-1 rounded-md border border-slate-200 bg-white px-2.5 py-1.5 text-[11px] font-medium text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
                >
                  Merge
                </button>
                <button
                  type="button"
                  onClick={() => applyTemplate(tpl, "replace")}
                  className="flex-1 rounded-md bg-teal-700 px-2.5 py-1.5 text-[11px] font-medium text-white hover:bg-teal-800 dark:bg-teal-600 dark:hover:bg-teal-500"
                >
                  Use Template
                </button>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Toolbar: Search, Filter, New Category */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2.5">
          <div className="relative w-60">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search packing items..."
              aria-label="Search packing items"
              className="h-9 w-full rounded-lg border border-slate-200 bg-white pl-8 pr-3 text-xs text-slate-900 placeholder:text-slate-400 focus:border-teal-600 focus:outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
            />
          </div>

          <div className="flex items-center gap-1 rounded-lg border border-slate-200 bg-white p-1 dark:border-slate-800 dark:bg-slate-900">
            {(["all", "remaining", "packed"] as const).map((status) => (
              <button
                key={status}
                type="button"
                onClick={() => setStatusFilter(status)}
                className={`rounded-md px-3 py-1 text-xs font-medium capitalize transition-colors ${
                  statusFilter === status
                    ? "bg-teal-700 text-white dark:bg-teal-600"
                    : "text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
                }`}
              >
                {status}
              </button>
            ))}
          </div>
        </div>

        <form onSubmit={handleAddGroup} className="flex items-center gap-2">
          <input
            type="text"
            value={newGroupTitle}
            onChange={(e) => setNewGroupTitle(e.target.value)}
            placeholder="New category name..."
            aria-label="New packing category name"
            className="h-9 w-48 rounded-lg border border-slate-200 bg-white px-3 text-xs text-slate-900 placeholder:text-slate-400 focus:border-teal-600 focus:outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
          />
          <button
            type="submit"
            className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-teal-700 px-3.5 text-xs font-semibold text-white hover:bg-teal-800 dark:bg-teal-600 dark:hover:bg-teal-500 whitespace-nowrap"
          >
            <Plus className="h-3.5 w-3.5" />
            Add Category
          </button>
        </form>
      </div>

      {/* Groups Grid or Empty State */}
      {groups.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-slate-300 bg-white px-6 py-14 text-center dark:border-slate-700 dark:bg-slate-900">
          <Luggage className="h-9 w-9 text-slate-400 mb-2.5" />
          <h2 className="font-display text-base font-semibold text-slate-900 dark:text-slate-100">
            Your packing list is empty
          </h2>
          <p className="mt-1 max-w-sm text-xs text-slate-500 dark:text-slate-400">
            Apply one of the quick templates above or create your first packing
            category to get started.
          </p>
          <button
            type="button"
            onClick={() => applyTemplate(PACKING_TEMPLATES[0], "replace")}
            className="mt-4 inline-flex items-center gap-1.5 rounded-lg bg-teal-700 px-4 py-2 text-xs font-semibold text-white hover:bg-teal-800 dark:bg-teal-600"
          >
            Load Autumn City Break Template
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
          {groups.map((group) => {
            let groupTotal = 0;
            let groupDone = 0;
            group.items.forEach((item) => {
              if (item.subItems.length > 0) {
                item.subItems.forEach((s) => {
                  groupTotal += 1;
                  if (s.checked) groupDone += 1;
                });
              } else {
                groupTotal += 1;
                if (item.checked) groupDone += 1;
              }
            });
            const groupPct =
              groupTotal > 0 ? Math.round((groupDone / groupTotal) * 100) : 0;
            const collapsed = Boolean(collapsedGroups[group.id]);

            const filteredItems = group.items.filter((item) => {
              const isItemPacked =
                item.subItems.length > 0
                  ? item.subItems.every((s) => s.checked)
                  : item.checked;
              if (statusFilter === "packed" && !isItemPacked) return false;
              if (statusFilter === "remaining" && isItemPacked) return false;
              if (q) {
                const matchMain = item.label.toLowerCase().includes(q);
                const matchSub = item.subItems.some((s) =>
                  s.label.toLowerCase().includes(q),
                );
                if (!matchMain && !matchSub) return false;
              }
              return true;
            });

            return (
              <section
                key={group.id}
                className="flex flex-col rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900 overflow-hidden"
              >
                {/* Category Header */}
                <div className="border-b border-slate-200 px-4 py-3 dark:border-slate-800">
                  <div className="flex items-center justify-between gap-2">
                    <button
                      type="button"
                      onClick={() =>
                        setCollapsedGroups((prev) => ({
                          ...prev,
                          [group.id]: !prev[group.id],
                        }))
                      }
                      className="flex items-center gap-2 text-left min-w-0"
                    >
                      {collapsed ? (
                        <ChevronRight className="h-4 w-4 text-slate-400 shrink-0" />
                      ) : (
                        <ChevronDown className="h-4 w-4 text-slate-400 shrink-0" />
                      )}
                      <h3 className="font-display text-sm font-semibold text-slate-900 dark:text-slate-100 truncate">
                        {group.title}
                      </h3>
                    </button>

                    <div className="flex items-center gap-2.5 shrink-0">
                      <span className="font-mono text-xs tabular-nums text-slate-500 dark:text-slate-400">
                        {groupDone}/{groupTotal} ({groupPct}%)
                      </span>
                      <button
                        type="button"
                        onClick={() => handleDeleteGroup(group.id)}
                        aria-label={`Delete ${group.title} category`}
                        className="rounded p-1 text-slate-400 hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-950/50 dark:hover:text-rose-400"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Category Progress Bar */}
                  <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                    <div
                      className="h-full rounded-full bg-teal-600 dark:bg-teal-500 transition-all duration-200"
                      style={{ width: `${groupPct}%` }}
                    />
                  </div>
                </div>

                {!collapsed && (
                  <div className="flex flex-1 flex-col justify-between p-4 space-y-3">
                    <div className="space-y-2">
                      {filteredItems.length === 0 ? (
                        <p className="py-4 text-center text-xs text-slate-400 dark:text-slate-500">
                          {group.items.length === 0
                            ? "No items in this category yet."
                            : "No items match the current filter."}
                        </p>
                      ) : (
                        filteredItems.map((item) => {
                          const hasSubs = item.subItems.length > 0;
                          const subsDone = item.subItems.filter(
                            (s) => s.checked,
                          ).length;
                          const isDone = hasSubs
                            ? subsDone === item.subItems.length
                            : item.checked;

                          return (
                            <div
                              key={item.id}
                              className="rounded-lg border border-slate-100 bg-slate-50/50 p-2.5 dark:border-slate-800/80 dark:bg-slate-950/40"
                            >
                              <div className="flex items-center justify-between gap-2">
                                <button
                                  type="button"
                                  onClick={() =>
                                    handleToggleItem(group.id, item.id)
                                  }
                                  className="flex flex-1 items-center gap-2 text-left min-w-0"
                                >
                                  {isDone ? (
                                    <CheckSquare className="h-4 w-4 text-teal-700 dark:text-teal-400 shrink-0" />
                                  ) : (
                                    <Square className="h-4 w-4 text-slate-400 shrink-0" />
                                  )}
                                  <span
                                    className={`text-xs font-medium truncate ${
                                      isDone
                                        ? "line-through text-slate-400 dark:text-slate-500"
                                        : "text-slate-800 dark:text-slate-100"
                                    }`}
                                  >
                                    {item.label}
                                  </span>
                                </button>

                                <div className="flex items-center gap-1.5 shrink-0">
                                  {hasSubs && (
                                    <span className="font-mono text-[11px] tabular-nums text-slate-400">
                                      {subsDone}/{item.subItems.length}
                                    </span>
                                  )}
                                  <div className="flex items-center rounded border border-slate-200 bg-white text-[11px] dark:border-slate-700 dark:bg-slate-900">
                                    <button
                                      type="button"
                                      onClick={() =>
                                        handleUpdateQty(group.id, item.id, -1)
                                      }
                                      aria-label="Decrease quantity"
                                      className="px-1.5 py-0.5 text-slate-500 hover:text-slate-900 dark:hover:text-slate-100"
                                    >
                                      -
                                    </button>
                                    <span className="px-1 font-mono tabular-nums text-slate-700 dark:text-slate-200">
                                      x{item.quantity}
                                    </span>
                                    <button
                                      type="button"
                                      onClick={() =>
                                        handleUpdateQty(group.id, item.id, 1)
                                      }
                                      aria-label="Increase quantity"
                                      className="px-1.5 py-0.5 text-slate-500 hover:text-slate-900 dark:hover:text-slate-100"
                                    >
                                      +
                                    </button>
                                  </div>

                                  <button
                                    type="button"
                                    onClick={() =>
                                      setOpenSubForm((prev) => ({
                                        ...prev,
                                        [item.id]: !prev[item.id],
                                      }))
                                    }
                                    title="Add nested sub-item"
                                    className="rounded px-1.5 py-0.5 text-[11px] font-medium text-slate-500 hover:bg-slate-200/70 hover:text-slate-800 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-200"
                                  >
                                    + Sub
                                  </button>

                                  <button
                                    type="button"
                                    onClick={() =>
                                      handleDeleteItem(group.id, item.id)
                                    }
                                    aria-label={`Delete ${item.label}`}
                                    className="rounded p-1 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400"
                                  >
                                    <Trash2 className="h-3.5 w-3.5" />
                                  </button>
                                </div>
                              </div>

                              {/* Nested Sub-items */}
                              {(item.subItems.length > 0 ||
                                openSubForm[item.id]) && (
                                <div className="mt-2 ml-6 space-y-1.5 border-l border-slate-200 pl-3 dark:border-slate-700">
                                  {item.subItems.map((sub) => (
                                    <div
                                      key={sub.id}
                                      className="flex items-center justify-between gap-2"
                                    >
                                      <button
                                        type="button"
                                        onClick={() =>
                                          handleToggleSubItem(
                                            group.id,
                                            item.id,
                                            sub.id,
                                          )
                                        }
                                        className="flex flex-1 items-center gap-2 text-left min-w-0"
                                      >
                                        {sub.checked ? (
                                          <CheckSquare className="h-3.5 w-3.5 text-teal-700 dark:text-teal-400 shrink-0" />
                                        ) : (
                                          <Square className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                                        )}
                                        <span
                                          className={`text-[11px] truncate ${
                                            sub.checked
                                              ? "line-through text-slate-400 dark:text-slate-500"
                                              : "text-slate-600 dark:text-slate-300"
                                          }`}
                                        >
                                          {sub.label}
                                        </span>
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() =>
                                          handleDeleteSubItem(
                                            group.id,
                                            item.id,
                                            sub.id,
                                          )
                                        }
                                        aria-label={`Remove ${sub.label}`}
                                        className="rounded p-0.5 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400"
                                      >
                                        <Trash2 className="h-3 w-3" />
                                      </button>
                                    </div>
                                  ))}

                                  {openSubForm[item.id] && (
                                    <div className="flex items-center gap-1.5 pt-1">
                                      <input
                                        type="text"
                                        value={newSubInputs[item.id] || ""}
                                        onChange={(e) =>
                                          setNewSubInputs((prev) => ({
                                            ...prev,
                                            [item.id]: e.target.value,
                                          }))
                                        }
                                        onKeyDown={(e) => {
                                          if (e.key === "Enter") {
                                            e.preventDefault();
                                            handleAddSubItem(group.id, item.id);
                                          }
                                        }}
                                        placeholder="Add nested item..."
                                        className="h-7 flex-1 rounded border border-slate-200 bg-white px-2 text-[11px] text-slate-900 focus:border-teal-600 focus:outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
                                      />
                                      <button
                                        type="button"
                                        onClick={() =>
                                          handleAddSubItem(group.id, item.id)
                                        }
                                        className="h-7 rounded bg-slate-800 px-2.5 text-[11px] font-medium text-white hover:bg-slate-700 dark:bg-teal-600"
                                      >
                                        Add
                                      </button>
                                    </div>
                                  )}
                                </div>
                              )}
                            </div>
                          );
                        })
                      )}
                    </div>

                    {/* Add Item to Group */}
                    <div className="flex items-center gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                      <input
                        type="text"
                        value={newItemInputs[group.id] || ""}
                        onChange={(e) =>
                          setNewItemInputs((prev) => ({
                            ...prev,
                            [group.id]: e.target.value,
                          }))
                        }
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            e.preventDefault();
                            handleAddItem(group.id);
                          }
                        }}
                        placeholder={`Add item to ${group.title}...`}
                        aria-label={`Add item to ${group.title}`}
                        className="h-8 flex-1 rounded-lg border border-slate-200 bg-slate-50 px-2.5 text-xs text-slate-900 placeholder:text-slate-400 focus:border-teal-600 focus:bg-white focus:outline-none dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
                      />
                      <button
                        type="button"
                        onClick={() => handleAddItem(group.id)}
                        className="inline-flex h-8 items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 text-xs font-medium text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
                      >
                        <Plus className="h-3.5 w-3.5" />
                        Add
                      </button>
                    </div>
                  </div>
                )}
              </section>
            );
          })}
        </div>
      )}
    </div>
  );
}
