// Finatic dashboard preview.
// All amounts are sample values for UI testing; no database or API is required.

type Transaction = {
  name: string;
  category: string;
  date: string;
  amount: string;
  incoming: boolean;
  initials: string;
  iconBackground: string;
};

const transactions: Transaction[] = [
  {
    name: "Direct Deposit",
    category: "Income",
    date: "Oct 27",
    amount: "+$1,925.00",
    incoming: true,
    initials: "DD",
    iconBackground: "bg-emerald-100 text-emerald-700",
  },
  {
    name: "Grocery Store",
    category: "Groceries",
    date: "Oct 26",
    amount: "-$84.23",
    incoming: false,
    initials: "GR",
    iconBackground: "bg-amber-100 text-amber-700",
  },
  {
    name: "Gas Station",
    category: "Transportation",
    date: "Oct 25",
    amount: "-$45.60",
    incoming: false,
    initials: "GS",
    iconBackground: "bg-blue-100 text-blue-700",
  },
  {
    name: "Music Subscription",
    category: "Subscriptions",
    date: "Oct 24",
    amount: "-$12.99",
    incoming: false,
    initials: "MS",
    iconBackground: "bg-violet-100 text-violet-700",
  },
];

const budgets = [
  { name: "Groceries", spent: 280, limit: 450, color: "bg-blue-600" },
  { name: "Dining out", spent: 190, limit: 300, color: "bg-cyan-500" },
  { name: "Shopping", spent: 160, limit: 300, color: "bg-violet-500" },
];

const summary = [
  {
    label: "Total balance",
    amount: "$24,850.75",
    detail: "Across your accounts",
    symbol: "$",
    color: "bg-blue-100 text-blue-700",
  },
  {
    label: "Monthly income",
    amount: "$3,850.00",
    detail: "This month",
    symbol: "+",
    color: "bg-emerald-100 text-emerald-700",
  },
  {
    label: "Monthly spending",
    amount: "$1,420.35",
    detail: "This month",
    symbol: "−",
    color: "bg-amber-100 text-amber-700",
  },
  {
    label: "Investments",
    amount: "$8,520.40",
    detail: "Sample portfolio value",
    symbol: "↗",
    color: "bg-violet-100 text-violet-700",
  },
];

function formatDollars(amount: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(amount);
}

export default function Home() {
  return (
    <div className="min-h-full bg-slate-50 px-4 py-8 text-slate-900 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl space-y-7">
        {/* Page heading */}
        <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-widest text-blue-700">
              Finatic overview
            </p>
            <h1 className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl">
              Your dashboard
            </h1>
            <p className="mt-2 text-sm text-slate-500 sm:text-base">
              A simple view of your money, spending, and goals.
            </p>
          </div>
          <span className="w-fit rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-500">
            Demo data · No database connected
          </span>
        </header>

        {/* Welcome banner */}
        <section className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-blue-950 via-blue-900 to-sky-700 px-6 py-8 text-white shadow-sm sm:px-9 sm:py-10">
          <div className="pointer-events-none absolute -right-20 -top-28 h-72 w-72 rounded-full bg-cyan-400/20 blur-3xl" />
          <div className="relative grid gap-8 md:grid-cols-[1fr_auto] md:items-center">
            <div>
              <p className="text-sm font-medium text-cyan-200">Welcome to Finatic</p>
              <h2 className="mt-2 max-w-xl text-2xl font-bold leading-tight tracking-tight sm:text-3xl">
                Take control of your financial future.
              </h2>
              <p className="mt-3 max-w-lg text-sm leading-6 text-blue-100">
                Track the big picture, understand your spending, and work toward
                what matters most—all in one place.
              </p>
            </div>
            <div className="rounded-2xl border border-white/20 bg-white/10 px-6 py-5 backdrop-blur-sm md:min-w-52">
              <p className="text-xs font-medium uppercase tracking-wider text-blue-100">
                Savings goal progress
              </p>
              <p className="mt-2 text-3xl font-bold">65%</p>
              <div
                className="mt-3 h-2 overflow-hidden rounded-full bg-white/20"
                role="progressbar"
                aria-label="Emergency fund savings progress"
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuenow={65}
              >
                <div className="h-full w-[65%] rounded-full bg-cyan-300" />
              </div>
              <p className="mt-2 text-xs text-blue-100">$3,250 of $5,000 saved</p>
            </div>
          </div>
        </section>

        {/* Top-level statistics */}
        <section aria-label="Financial summary" className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {summary.map((item) => (
            <div
              key={item.label}
              className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
            >
              <div className="flex items-center justify-between gap-3">
                <p className="text-sm font-medium text-slate-500">{item.label}</p>
                <span
                  className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-lg font-bold ${item.color}`}
                  aria-hidden="true"
                >
                  {item.symbol}
                </span>
              </div>
              <p className="mt-4 text-2xl font-bold tracking-tight">{item.amount}</p>
              <p className="mt-2 text-xs text-slate-500">{item.detail}</p>
            </div>
          ))}
        </section>

        {/* Details */}
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)]">
          {/* Transactions */}
          <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="border-b border-slate-100 px-5 py-5 sm:px-6">
              <h2 className="text-lg font-bold">Recent transactions</h2>
              <p className="mt-1 text-sm text-slate-500">Your latest sample account activity.</p>
            </div>
            <ul className="divide-y divide-slate-100">
              {transactions.map((transaction) => (
                <li
                  key={`${transaction.name}-${transaction.date}`}
                  className="flex items-center gap-3 px-5 py-4 sm:px-6"
                >
                  <div
                    className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-xs font-bold ${transaction.iconBackground}`}
                    aria-hidden="true"
                  >
                    {transaction.initials}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-slate-900">
                      {transaction.name}
                    </p>
                    <p className="mt-1 text-xs text-slate-500">
                      {transaction.category} · {transaction.date}
                    </p>
                  </div>
                  <span
                    className={`shrink-0 text-sm font-semibold ${
                      transaction.incoming ? "text-emerald-700" : "text-slate-900"
                    }`}
                  >
                    {transaction.amount}
                  </span>
                </li>
              ))}
            </ul>
          </section>

          {/* Budget progress */}
          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
            <h2 className="text-lg font-bold">Monthly budgets</h2>
            <p className="mt-1 text-sm text-slate-500">
              See how much of each budget you have used.
            </p>
            <div className="mt-7 space-y-7">
              {budgets.map((budget) => {
                const percent = Math.min(
                  100,
                  Math.round((budget.spent / budget.limit) * 100)
                );

                return (
                  <div key={budget.name}>
                    <div className="mb-2 flex items-center justify-between gap-2">
                      <p className="text-sm font-semibold">{budget.name}</p>
                      <p className="text-xs text-slate-500">
                        {formatDollars(budget.spent)} / {formatDollars(budget.limit)}
                      </p>
                    </div>
                    <div
                      className="h-2.5 overflow-hidden rounded-full bg-slate-100"
                      role="progressbar"
                      aria-label={`${budget.name} budget used`}
                      aria-valuemin={0}
                      aria-valuemax={100}
                      aria-valuenow={percent}
                    >
                      <div
                        className={`h-full rounded-full ${budget.color}`}
                        style={{ width: `${percent}%` }}
                      />
                    </div>
                    <p className="mt-2 text-xs text-slate-500">
                      {formatDollars(budget.limit - budget.spent)} remaining
                    </p>
                  </div>
                );
              })}
            </div>
          </section>
        </div>

        {/* Savings goal */}
        <section className="flex flex-col gap-5 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:flex-row sm:items-center sm:justify-between sm:p-6">
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-blue-700">
              Your savings goals
            </p>
            <h2 className="mt-2 text-lg font-bold">Emergency fund</h2>
            <p className="mt-1 text-sm text-slate-500">
              Keep building your safety net, a little at a time.
            </p>
          </div>
          <div className="w-full sm:max-w-xs">
            <div className="flex items-end justify-between gap-3">
              <span className="text-xl font-bold">$3,250</span>
              <span className="text-xs text-slate-500">Goal: $5,000</span>
            </div>
            <div
              className="mt-3 h-3 overflow-hidden rounded-full bg-slate-100"
              role="progressbar"
              aria-label="Emergency fund savings goal"
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={65}
            >
              <div className="h-full w-[65%] rounded-full bg-blue-600" />
            </div>
          </div>
        </section>

        <p className="pb-2 text-center text-xs text-slate-400">
          All balances, transactions, and goals on this page are fictional demo values.
        </p>
      </div>
    </div>
  );
}
