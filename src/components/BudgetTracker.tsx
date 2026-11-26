import React, { useMemo, useState } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  Plus,
  Receipt,
  Trash2,
} from 'lucide-react';
import {
  BudgetCategoryId,
  CategoryBudget,
  CurrencyCode,
  ExpenseItem,
  ItineraryDay,
  Place,
} from '../types/trip';
import {
  CURRENCY_META,
  convertCurrency,
  formatMoney,
} from '../utils/travel';

interface BudgetTrackerProps {
  displayCurrency: CurrencyCode;
  categoryBudgets: CategoryBudget[];
  expenses: ExpenseItem[];
  days: ItineraryDay[];
  places: Place[];
  onChangeDisplayCurrency: (currency: CurrencyCode) => void;
  onUpdateCategoryLimit: (category: BudgetCategoryId, limitUsd: number) => void;
  onAddExpense: (expense: Omit<ExpenseItem, 'id'>) => void;
  onToggleExpensePaid: (expenseId: string) => void;
  onDeleteExpense: (expenseId: string) => void;
}

const CURRENCIES: CurrencyCode[] = ['USD', 'JPY', 'EUR', 'GBP', 'CAD'];

export function BudgetTracker({
  displayCurrency,
  categoryBudgets,
  expenses,
  days,
  places,
  onChangeDisplayCurrency,
  onUpdateCategoryLimit,
  onAddExpense,
  onToggleExpensePaid,
  onDeleteExpense,
}: BudgetTrackerProps) {
  const [filterCategory, setFilterCategory] = useState<BudgetCategoryId | 'all'>('all');
  const [hoveredCat, setHoveredCat] = useState<BudgetCategoryId | null>(null);

  // Add Expense form state
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState<BudgetCategoryId>('dining');
  const [amount, setAmount] = useState('');
  const [currency, setCurrency] = useState<CurrencyCode>(displayCurrency);
  const [dayId, setDayId] = useState<string>('');
  const [paid, setPaid] = useState(true);

  const totalBudgetDisplay = useMemo(
    () =>
      categoryBudgets.reduce(
        (sum, b) => sum + convertCurrency(b.limitUsd, 'USD', displayCurrency),
        0
      ),
    [categoryBudgets, displayCurrency]
  );

  const totalSpentDisplay = useMemo(
    () =>
      expenses.reduce(
        (sum, e) => sum + convertCurrency(e.amount, e.currency, displayCurrency),
        0
      ),
    [expenses, displayCurrency]
  );

  const paidTotalDisplay = useMemo(
    () =>
      expenses
        .filter((e) => e.paid)
        .reduce(
          (sum, e) => sum + convertCurrency(e.amount, e.currency, displayCurrency),
          0
        ),
    [expenses, displayCurrency]
  );

  // Estimated itinerary stops cost (from scheduled stops across all days)
  const plannedStopsEstDisplay = useMemo(() => {
    const placeMap = new Map(places.map((p) => [p.id, p]));
    let usd = 0;
    days.forEach((d) =>
      d.stops.forEach((s) => {
        const p = placeMap.get(s.placeId);
        if (p) usd += p.estimatedCostUsd;
      })
    );
    return convertCurrency(usd, 'USD', displayCurrency);
  }, [days, places, displayCurrency]);

  const remainingDisplay = totalBudgetDisplay - totalSpentDisplay;
  const isOverBudget = remainingDisplay < 0;

  // Per-category breakdown for chart & limits
  const categoryStats = useMemo(() => {
    return categoryBudgets.map((cb) => {
      const budgetVal = convertCurrency(cb.limitUsd, 'USD', displayCurrency);
      const catExpenses = expenses.filter((e) => e.category === cb.category);
      const paidVal = catExpenses
        .filter((e) => e.paid)
        .reduce(
          (sum, e) => sum + convertCurrency(e.amount, e.currency, displayCurrency),
          0
        );
      const plannedVal = catExpenses
        .filter((e) => !e.paid)
        .reduce(
          (sum, e) => sum + convertCurrency(e.amount, e.currency, displayCurrency),
          0
        );
      const actualTotal = paidVal + plannedVal;
      return {
        ...cb,
        budgetVal,
        paidVal,
        plannedVal,
        actualTotal,
        over: actualTotal > budgetVal,
      };
    });
  }, [categoryBudgets, expenses, displayCurrency]);

  const chartMaxVal = useMemo(() => {
    const maxFound = Math.max(
      10,
      ...categoryStats.map((c) => Math.max(c.budgetVal, c.actualTotal))
    );
    return maxFound * 1.12;
  }, [categoryStats]);

  const filteredExpenses = useMemo(() => {
    if (filterCategory === 'all') return expenses;
    return expenses.filter((e) => e.category === filterCategory);
  }, [expenses, filterCategory]);

  const handleSubmitExpense = (e: React.FormEvent) => {
    e.preventDefault();
    const numeric = parseFloat(amount);
    if (!title.trim() || Number.isNaN(numeric) || numeric <= 0) return;

    onAddExpense({
      title: title.trim(),
      category,
      amount: numeric,
      currency,
      dayId: dayId || undefined,
      paid,
      date:
        days.find((d) => d.id === dayId)?.date ||
        days[0]?.date ||
        new Date().toISOString().slice(0, 10),
    });
    setTitle('');
    setAmount('');
  };

  return (
    <div className="mx-auto max-w-[1440px] px-4 sm:px-6 py-6 space-y-6">
      {/* Header & Multi-Currency Selector */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
            Trip Budget & Multi-Currency Ledger
          </h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Track category caps, log expenses in local currencies, and compare actual spend against budget.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-1 rounded-lg border border-slate-200 bg-white p-1 dark:border-slate-800 dark:bg-slate-900">
            {CURRENCIES.map((code) => (
              <button
                key={code}
                type="button"
                onClick={() => onChangeDisplayCurrency(code)}
                className={`rounded-md px-2.5 py-1 font-mono text-xs font-medium transition-colors ${
                  displayCurrency === code
                    ? 'bg-teal-700 text-white dark:bg-teal-600'
                    : 'text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800'
                }`}
              >
                {code}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Mock Exchange Rates Strip */}
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs text-slate-600 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-400">
        <span className="font-semibold text-slate-800 dark:text-slate-200">
          Mock FX Rates (Base 1 USD):
        </span>
        {CURRENCIES.filter((c) => c !== 'USD').map((code) => (
          <span key={code} className="font-mono tabular-nums">
            {code} {CURRENCY_META[code].rateFromUsd}
          </span>
        ))}
      </div>

      {/* Top 4 KPI Summary Strip */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
          <div className="text-xs font-medium text-slate-500 dark:text-slate-400">
            Total Target Budget
          </div>
          <div className="mt-1.5 font-mono text-2xl font-semibold tabular-nums text-slate-900 dark:text-slate-100">
            {formatMoney(totalBudgetDisplay, displayCurrency)}
          </div>
          <div className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            Across {categoryBudgets.length} categories
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
          <div className="text-xs font-medium text-slate-500 dark:text-slate-400">
            Logged Spend (Paid + Planned)
          </div>
          <div className="mt-1.5 font-mono text-2xl font-semibold tabular-nums text-slate-900 dark:text-slate-100">
            {formatMoney(totalSpentDisplay, displayCurrency)}
          </div>
          <div className="mt-1 font-mono text-xs tabular-nums text-slate-500 dark:text-slate-400">
            {formatMoney(paidTotalDisplay, displayCurrency)} paid so far
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
          <div className="text-xs font-medium text-slate-500 dark:text-slate-400">
            Remaining Headroom
          </div>
          <div
            className={`mt-1.5 flex items-center gap-2 font-mono text-2xl font-semibold tabular-nums ${
              isOverBudget
                ? 'text-rose-600 dark:text-rose-400'
                : 'text-emerald-700 dark:text-emerald-400'
            }`}
          >
            {isOverBudget ? (
              <AlertTriangle className="h-5 w-5 shrink-0" />
            ) : (
              <CheckCircle2 className="h-5 w-5 shrink-0" />
            )}
            <span>{formatMoney(Math.abs(remainingDisplay), displayCurrency)}</span>
          </div>
          <div className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            {isOverBudget ? 'Over total budget' : 'Under total budget'}
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
          <div className="text-xs font-medium text-slate-500 dark:text-slate-400">
            Scheduled Stop Entry Fees
          </div>
          <div className="mt-1.5 font-mono text-2xl font-semibold tabular-nums text-slate-900 dark:text-slate-100">
            {formatMoney(plannedStopsEstDisplay, displayCurrency)}
          </div>
          <div className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            Estimated from map stops
          </div>
        </div>
      </div>

      {/* Main Split: Chart vs. Budget + Category Caps */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        {/* Interactive SVG Chart vs. Budget */}
        <section className="lg:col-span-7 rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
          <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
            <div>
              <h2 className="font-display text-base font-semibold text-slate-900 dark:text-slate-100">
                Actual Spend vs. Budget by Category
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Solid bar shows logged spend (paid + planned) compared against category target.
              </p>
            </div>
            <div className="flex items-center gap-4 text-xs text-slate-600 dark:text-slate-300">
              <span className="inline-flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-sm bg-slate-300 dark:bg-slate-700" />
                Target Budget
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-sm bg-teal-600 dark:bg-teal-500" />
                Actual Spend
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-sm bg-rose-600 dark:bg-rose-500" />
                Over Cap
              </span>
            </div>
          </div>

          <div className="w-full overflow-x-auto">
            <svg
              viewBox="0 0 640 270"
              role="img"
              aria-label="Category spend versus target budget bar chart"
              className="w-full min-w-[460px] h-auto"
            >
              {/* Horizontal gridlines */}
              {[0, 0.25, 0.5, 0.75, 1].map((t, i) => {
                const y = 215 - t * 185;
                const val = chartMaxVal * t;
                return (
                  <g key={i}>
                    <line
                      x1="64"
                      y1={y}
                      x2="620"
                      y2={y}
                      className="stroke-slate-200 dark:stroke-slate-800"
                      strokeDasharray={t === 0 ? undefined : '3 3'}
                    />
                    <text
                      x="56"
                      y={y + 4}
                      textAnchor="end"
                      className="fill-slate-400 dark:fill-slate-500 font-mono text-[10px]"
                    >
                      {formatMoney(val, displayCurrency)}
                    </text>
                  </g>
                );
              })}

              {/* Grouped category bars */}
              {categoryStats.map((cat, idx) => {
                const groupWidth = (620 - 76) / categoryStats.length;
                const xCenter = 76 + idx * groupWidth + groupWidth / 2;
                const barW = 24;

                const budgetH = Math.max(2, (cat.budgetVal / chartMaxVal) * 185);
                const actualH = Math.max(2, (cat.actualTotal / chartMaxVal) * 185);

                const isHovered = hoveredCat === cat.category;

                return (
                  <g
                    key={cat.category}
                    onMouseEnter={() => setHoveredCat(cat.category)}
                    onMouseLeave={() => setHoveredCat(null)}
                    className="cursor-pointer"
                  >
                    {/* Hover column highlight */}
                    {isHovered && (
                      <rect
                        x={xCenter - barW - 10}
                        y={20}
                        width={barW * 2 + 24}
                        height={200}
                        rx={8}
                        className="fill-slate-100/80 dark:fill-slate-800/50"
                      />
                    )}

                    {/* Target Budget Bar */}
                    <rect
                      x={xCenter - barW - 2}
                      y={215 - budgetH}
                      width={barW}
                      height={budgetH}
                      rx={4}
                      className="fill-slate-300 dark:fill-slate-700 transition-opacity"
                    />

                    {/* Actual Spend Bar */}
                    <rect
                      x={xCenter + 2}
                      y={215 - actualH}
                      width={barW}
                      height={actualH}
                      rx={4}
                      className={
                        cat.over
                          ? 'fill-rose-600 dark:fill-rose-500'
                          : 'fill-teal-600 dark:fill-teal-500'
                      }
                    />

                    {/* X-Axis Category Label */}
                    <text
                      x={xCenter}
                      y={236}
                      textAnchor="middle"
                      className="fill-slate-700 dark:fill-slate-300 text-[11px] font-medium"
                    >
                      {cat.label.split(' ')[0]}
                    </text>

                    {/* Numeric comparison under label */}
                    <text
                      x={xCenter}
                      y={252}
                      textAnchor="middle"
                      className={`font-mono text-[10px] ${
                        cat.over
                          ? 'fill-rose-600 dark:fill-rose-400 font-semibold'
                          : 'fill-slate-500 dark:fill-slate-400'
                      }`}
                    >
                      {formatMoney(cat.actualTotal, displayCurrency)}
                    </text>
                  </g>
                );
              })}
            </svg>
          </div>
        </section>

        {/* Editable Category Caps */}
        <section className="lg:col-span-5 rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
          <h2 className="font-display text-base font-semibold text-slate-900 dark:text-slate-100">
            Category Allocations
          </h2>
          <p className="mt-0.5 mb-4 text-xs text-slate-500 dark:text-slate-400">
            Adjust target budgets in {displayCurrency}; progress bars update immediately.
          </p>

          <div className="space-y-4">
            {categoryStats.map((cat) => {
              const pct =
                cat.budgetVal > 0
                  ? Math.min(100, Math.round((cat.actualTotal / cat.budgetVal) * 100))
                  : 0;
              return (
                <div key={cat.category} className="space-y-1.5">
                  <div className="flex items-center justify-between gap-2 text-xs">
                    <span className="font-medium text-slate-800 dark:text-slate-200">
                      {cat.label}
                    </span>
                    <div className="flex items-center gap-2 font-mono tabular-nums">
                      <span
                        className={
                          cat.over
                            ? 'font-semibold text-rose-600 dark:text-rose-400'
                            : 'text-slate-600 dark:text-slate-300'
                        }
                      >
                        {formatMoney(cat.actualTotal, displayCurrency)}
                      </span>
                      <span className="text-slate-400">/</span>
                      <label className="inline-flex items-center gap-1">
                        <span className="text-slate-400">
                          {CURRENCY_META[displayCurrency].symbol}
                        </span>
                        <input
                          type="number"
                          min={0}
                          step={displayCurrency === 'JPY' ? 1000 : 10}
                          value={Math.round(cat.budgetVal)}
                          onChange={(e) => {
                            const valInDisplay = Math.max(0, Number(e.target.value) || 0);
                            const valUsd = convertCurrency(
                              valInDisplay,
                              displayCurrency,
                              'USD'
                            );
                            onUpdateCategoryLimit(cat.category, valUsd);
                          }}
                          aria-label={`${cat.label} budget cap`}
                          className="w-20 rounded border border-slate-200 bg-slate-50 px-1.5 py-0.5 text-right font-mono text-xs text-slate-900 focus:border-teal-600 focus:bg-white focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                        />
                      </label>
                    </div>
                  </div>
                  <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                    <div
                      className={`h-full rounded-full transition-all duration-200 ${
                        cat.over
                          ? 'bg-rose-600 dark:bg-rose-500'
                          : 'bg-teal-600 dark:bg-teal-500'
                      }`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      </div>

      {/* Add Expense Form + Expense Ledger */}
      <section className="rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900 overflow-hidden">
        <div className="border-b border-slate-200 p-4 dark:border-slate-800">
          <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
            <h2 className="font-display text-base font-semibold text-slate-900 dark:text-slate-100">
              Expense Ledger ({expenses.length})
            </h2>

            <div className="flex flex-wrap items-center gap-1 rounded-lg bg-slate-100 p-1 dark:bg-slate-800">
              <button
                type="button"
                onClick={() => setFilterCategory('all')}
                className={`rounded-md px-2.5 py-1 text-xs font-medium transition-colors ${
                  filterCategory === 'all'
                    ? 'bg-white text-slate-900 shadow-sm dark:bg-slate-900 dark:text-slate-100'
                    : 'text-slate-600 hover:text-slate-900 dark:text-slate-400'
                }`}
              >
                All
              </button>
              {categoryBudgets.map((cb) => (
                <button
                  key={cb.category}
                  type="button"
                  onClick={() => setFilterCategory(cb.category)}
                  className={`rounded-md px-2.5 py-1 text-xs font-medium transition-colors ${
                    filterCategory === cb.category
                      ? 'bg-white text-slate-900 shadow-sm dark:bg-slate-900 dark:text-slate-100'
                      : 'text-slate-600 hover:text-slate-900 dark:text-slate-400'
                  }`}
                >
                  {cb.label.split(' ')[0]}
                </button>
              ))}
            </div>
          </div>

          {/* Inline Quick Add Form */}
          <form
            onSubmit={handleSubmitExpense}
            className="grid grid-cols-1 gap-2.5 sm:grid-cols-12"
          >
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Expense description (e.g., Shinkansen Tickets)"
              aria-label="Expense description"
              className="sm:col-span-4 h-9 rounded-lg border border-slate-200 bg-slate-50 px-3 text-xs text-slate-900 placeholder:text-slate-400 focus:border-teal-600 focus:bg-white focus:outline-none dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
            />
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value as BudgetCategoryId)}
              aria-label="Expense category"
              className="sm:col-span-2 h-9 rounded-lg border border-slate-200 bg-slate-50 px-2.5 text-xs text-slate-700 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-200"
            >
              {categoryBudgets.map((cb) => (
                <option key={cb.category} value={cb.category}>
                  {cb.label}
                </option>
              ))}
            </select>
            <div className="sm:col-span-2 flex gap-1.5">
              <input
                type="number"
                required
                min={0.01}
                step="any"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="Amount"
                aria-label="Expense amount"
                className="w-full h-9 rounded-lg border border-slate-200 bg-slate-50 px-2.5 font-mono text-xs text-slate-900 placeholder:text-slate-400 focus:border-teal-600 focus:bg-white focus:outline-none dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
              />
              <select
                value={currency}
                onChange={(e) => setCurrency(e.target.value as CurrencyCode)}
                aria-label="Expense currency"
                className="h-9 rounded-lg border border-slate-200 bg-slate-50 px-2 font-mono text-xs text-slate-700 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-200"
              >
                {CURRENCIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>
            <select
              value={dayId}
              onChange={(e) => setDayId(e.target.value)}
              aria-label="Associate with day"
              className="sm:col-span-2 h-9 rounded-lg border border-slate-200 bg-slate-50 px-2.5 text-xs text-slate-700 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-200"
            >
              <option value="">General Trip</option>
              {days.map((d, i) => (
                <option key={d.id} value={d.id}>
                  Day {i + 1}: {d.title}
                </option>
              ))}
            </select>
            <div className="sm:col-span-2 flex items-center gap-2">
              <label className="inline-flex items-center gap-1.5 text-xs text-slate-600 dark:text-slate-300 cursor-pointer shrink-0">
                <input
                  type="checkbox"
                  checked={paid}
                  onChange={(e) => setPaid(e.target.checked)}
                  className="h-3.5 w-3.5 rounded border-slate-300 text-teal-700 focus:ring-teal-600"
                />
                Paid
              </label>
              <button
                type="submit"
                className="inline-flex h-9 flex-1 items-center justify-center gap-1 rounded-lg bg-teal-700 px-3 text-xs font-semibold text-white hover:bg-teal-800 dark:bg-teal-600 dark:hover:bg-teal-500 transition-colors whitespace-nowrap"
              >
                <Plus className="h-3.5 w-3.5" />
                Log
              </button>
            </div>
          </form>
        </div>

        {/* Ledger Table or Empty State */}
        {filteredExpenses.length === 0 ? (
          <div className="flex flex-col items-center justify-center px-6 py-12 text-center">
            <Receipt className="h-8 w-8 text-slate-400 mb-2" />
            <p className="text-sm font-medium text-slate-700 dark:text-slate-200">
              No expenses logged{filterCategory !== 'all' ? ' in this category' : ' yet'}
            </p>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              Use the form above to record hotels, meals, rail passes, or tickets in any currency.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-slate-200 bg-slate-50/80 text-slate-500 dark:border-slate-800 dark:bg-slate-950/60 dark:text-slate-400">
                <tr>
                  <th className="px-4 py-2.5 font-medium">Item</th>
                  <th className="px-4 py-2.5 font-medium">Category</th>
                  <th className="px-4 py-2.5 font-medium">Status</th>
                  <th className="px-4 py-2.5 font-medium text-right">Original</th>
                  <th className="px-4 py-2.5 font-medium text-right">
                    Converted ({displayCurrency})
                  </th>
                  <th className="px-4 py-2.5 font-medium text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
                {filteredExpenses.map((exp) => {
                  const catLabel =
                    categoryBudgets.find((c) => c.category === exp.category)?.label ||
                    exp.category;
                  const converted = convertCurrency(
                    exp.amount,
                    exp.currency,
                    displayCurrency
                  );
                  const dayIdx = days.findIndex((d) => d.id === exp.dayId);
                  return (
                    <tr
                      key={exp.id}
                      className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors"
                    >
                      <td className="px-4 py-3">
                        <div className="font-medium text-slate-900 dark:text-slate-100">
                          {exp.title}
                        </div>
                        {dayIdx >= 0 && (
                          <div className="text-[11px] text-slate-500 dark:text-slate-400">
                            Day {dayIdx + 1} · {days[dayIdx].title}
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3 text-slate-600 dark:text-slate-300">
                        {catLabel}
                      </td>
                      <td className="px-4 py-3">
                        <button
                          type="button"
                          onClick={() => onToggleExpensePaid(exp.id)}
                          className={`inline-flex items-center gap-1 rounded px-2 py-0.5 text-[11px] font-medium transition-colors ${
                            exp.paid
                              ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300'
                              : 'bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300'
                          }`}
                        >
                          {exp.paid ? 'Paid' : 'Planned'}
                        </button>
                      </td>
                      <td className="px-4 py-3 text-right font-mono tabular-nums text-slate-600 dark:text-slate-300">
                        {formatMoney(exp.amount, exp.currency)}{' '}
                        <span className="text-[10px] text-slate-400">{exp.currency}</span>
                      </td>
                      <td className="px-4 py-3 text-right font-mono font-semibold tabular-nums text-slate-900 dark:text-slate-100">
                        {formatMoney(converted, displayCurrency)}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <button
                          type="button"
                          onClick={() => onDeleteExpense(exp.id)}
                          aria-label={`Delete ${exp.title}`}
                          className="rounded p-1 text-slate-400 hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-950/50 dark:hover:text-rose-400"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
