import {
  ArrowDown,
  ArrowUp,
  Landmark,
  Clock,
  Download,
  Search,
  AlertTriangle,
  ChevronDown,
  Code,
  Database,
  Globe,
  Paintbrush,
  Timer,
  Cpu,
} from "lucide-react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { z } from "zod";
import { api } from "@/api";
import { FormFactory, useFormFactory, type FormConfig } from "@/components/form-factory";

function formatCurrency(value: number): string {
  return value.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

type TabKey = "funds" | "history" | "export";
type AccountResponse = { username: string; balance: number };
type MovementResponse = { message: string; username: string; newBalance: number };
type Transaction = {
  id: number;
  transactionType: string;
  amount: number;
  transactionDatetime: string;
};
type TransactionsResponse = { username: string; transactions: Transaction[] };

const fundsFormConfig: FormConfig = {
  fields: [
    { name: "username", label: "Username", type: "text", required: true, placeholder: "Enter account username" },
    { name: "movementType", label: "Action", type: "radio", required: true, options: [
      { label: "Check Balance", value: "balance" },
      { label: "Deposit", value: "deposit" },
      { label: "Withdraw", value: "withdraw" },
    ]},
    { name: "amount", label: "Amount", type: "number", placeholder: "Enter amount" },
  ],
  submitLabel: "Submit",
  resetLabel: "Clear",
};

const historyFormConfig: FormConfig = {
  fields: [
    { name: "username", label: "Username", type: "text", required: true, placeholder: "Enter account username" },
    { name: "type", label: "Type Filter", type: "select", options: [
      { label: "Deposit", value: "Deposit" },
      { label: "Withdraw", value: "Withdraw" },
    ], placeholder: "All types" },
    { name: "sort", label: "Sort", type: "select", options: [
      { label: "Newest First", value: "desc" },
      { label: "Oldest First", value: "asc" },
    ]},
  ],
  submitLabel: "Search",
  resetLabel: "Clear",
};

const exportFormConfig: FormConfig = {
  fields: [
    { name: "username", label: "Username (optional — leave blank for all)", type: "text", placeholder: "All accounts" },
  ],
  submitLabel: "Export CSV",
};

const searchSchema = z.object({
  tab: z.enum(["funds", "history", "export"]).optional(),
});

export const Route = createFileRoute("/banking/")({
  validateSearch: searchSchema,
  component: BankingDashboard,
});

function BankingDashboard() {
  const { tab: urlTab } = Route.useSearch();
  const navigate = Route.useNavigate();
  const activeTab: TabKey = urlTab ?? "funds";

  const setTab = (t: TabKey) => navigate({ search: { tab: t }, replace: true });

  return (
    <div className="mx-auto max-w-3xl px-4 sm:px-8">
      {/* Header */}
      <div className="relative -mx-4 sm:-mx-8 mb-8 overflow-hidden bg-gradient-to-br from-brand-600 to-brand-700 px-8 pb-8 pt-10">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute -right-20 -top-20 h-64 w-64 rounded-full bg-white" />
          <div className="absolute -left-10 bottom-0 h-40 w-40 rounded-full bg-white" />
        </div>
        <div className="relative flex items-center gap-4">
          <img src="/WBA_Logo.jpg" alt="Westpac" className="h-10 rounded-lg" />
          <div>
            <h1 className="text-xl font-bold text-white tracking-tight">Account Balance Management</h1>
            <p className="text-sm text-white/70">
              Manage balances, transactions, and audit exports
            </p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="mb-6 flex gap-1 rounded-xl bg-white p-1 shadow-sm border border-gray-100">
        <TabButton active={activeTab === "funds"} onClick={() => setTab("funds")} icon={<Landmark size={15} />} label="Funds Movement" />
        <TabButton active={activeTab === "history"} onClick={() => setTab("history")} icon={<Clock size={15} />} label="Transaction History" />
        <TabButton active={activeTab === "export"} onClick={() => setTab("export")} icon={<Download size={15} />} label="Export for Audit" />
      </div>

      {/* Tab Content */}
      <div className="card p-6 mb-6">
        {activeTab === "funds" && <FundsTab />}
        {activeTab === "history" && <HistoryTab />}
        {activeTab === "export" && <ExportTab />}
      </div>

      <HowItWasBuilt />
    </div>
  );
}

function TabButton({ active, onClick, icon, label }: { active: boolean; onClick: () => void; icon: React.ReactNode; label: string }) {
  return (
    <button
      onClick={onClick}
      className={`flex flex-1 items-center justify-center gap-1.5 rounded-lg px-3 py-2.5 text-xs font-semibold transition-all ${
        active
          ? "bg-brand-600 text-white shadow-sm"
          : "text-gray-500 hover:bg-gray-50 hover:text-gray-700"
      }`}
    >
      {icon}
      {label}
    </button>
  );
}

function FundsTab() {
  const form = useFormFactory(fundsFormConfig);
  const [result, setResult] = useState<{ message: string; style: "success" | "error" } | null>(null);
  const [balance, setBalance] = useState<number | null>(null);

  const lookupMutation = useMutation<AccountResponse, Error, string>({
    mutationFn: (username) => api.get("banking/accounts/lookup", { searchParams: { username } }).json<AccountResponse>(),
  });

  const depositMutation = useMutation<MovementResponse, Error, { username: string; amount: number }>({
    mutationFn: (body) => api.post("banking/deposit", { json: body }).json<MovementResponse>(),
  });

  const withdrawMutation = useMutation<MovementResponse, Error, { username: string; amount: number }>({
    mutationFn: (body) => api.post("banking/withdraw", { json: body }).json<MovementResponse>(),
  });

  const isPending = lookupMutation.isPending || depositMutation.isPending || withdrawMutation.isPending;

  const handleSubmit = async () => {
    setResult(null);
    setBalance(null);
    const { username, movementType, amount } = form.values;

    if (movementType === "balance") {
      try {
        const data = await lookupMutation.mutateAsync(username);
        setBalance(data.balance);
        setResult({ message: `Balance for ${data.username}: $${formatCurrency(data.balance)}`, style: "success" });
      } catch (err: unknown) {
        setResult({ message: await getErrorMessage(err), style: "error" });
      }
      return;
    }

    const numAmount = parseFloat(amount);
    if (!numAmount || numAmount <= 0) {
      setResult({ message: "Amount must be a positive number.", style: "error" });
      return;
    }

    const mutate = movementType === "deposit" ? depositMutation : withdrawMutation;
    try {
      const data = await mutate.mutateAsync({ username, amount: numAmount });
      setBalance(data.newBalance);
      setResult({ message: `${data.message} New balance: $${formatCurrency(data.newBalance)}`, style: "success" });
    } catch (err: unknown) {
      setResult({ message: await getErrorMessage(err), style: "error" });
    }
  };

  const handleReset = () => { form.reset(); setResult(null); setBalance(null); };

  return (
    <div className="space-y-6">
      <FormFactory config={fundsFormConfig} values={form.values} setValue={form.setValue} onSubmit={handleSubmit} onReset={handleReset} isValid={form.isValid} isPending={isPending} />
      <ResultMessage result={result} />
      {balance !== null && (
        <div className="rounded-xl bg-gradient-to-br from-brand-600 to-brand-700 px-5 py-4 text-white">
          <span className="text-xs font-medium text-white/70">Current Balance</span>
          <p className="font-mono text-2xl font-bold">${formatCurrency(balance)}</p>
        </div>
      )}
    </div>
  );
}

function HistoryTab() {
  const form = useFormFactory(historyFormConfig);
  const [error, setError] = useState<string | null>(null);
  const [hasSearched, setHasSearched] = useState(false);

  const query = useQuery<TransactionsResponse>({
    queryKey: ["banking", "transactions", form.values.username, form.values.type, form.values.sort],
    queryFn: () => {
      const params: Record<string, string> = { username: form.values.username };
      if (form.values.type) params.type = form.values.type;
      if (form.values.sort) params.sort = form.values.sort;
      return api.get("banking/transactions", { searchParams: params }).json<TransactionsResponse>();
    },
    enabled: false,
  });

  const handleSubmit = async () => {
    setError(null);
    setHasSearched(true);
    try { await query.refetch(); }
    catch (err: unknown) { setError(await getErrorMessage(err)); }
  };

  const handleReset = () => { form.reset(); setError(null); setHasSearched(false); };
  const transactions = query.data?.transactions ?? [];

  return (
    <div className="space-y-6">
      <FormFactory config={historyFormConfig} values={form.values} setValue={form.setValue} onSubmit={handleSubmit} onReset={handleReset} isValid={form.isValid} isPending={query.isFetching} />
      {error && <ResultMessage result={{ message: error, style: "error" }} />}
      {query.error && !error && <ResultMessage result={{ message: query.error.message, style: "error" }} />}
      {hasSearched && !query.isFetching && !query.error && !error && <TransactionTable transactions={transactions} />}
    </div>
  );
}

function TransactionTable({ transactions }: { transactions: Transaction[] }) {
  if (transactions.length === 0) return <p className="text-sm text-gray-400">No transaction records match the selected criteria.</p>;

  return (
    <div className="overflow-hidden rounded-xl border border-gray-100">
      <table className="w-full text-left text-sm">
        <thead>
          <tr className="border-b border-gray-100 bg-gray-50">
            <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Date/Time</th>
            <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Type</th>
            <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider text-right">Amount</th>
          </tr>
        </thead>
        <tbody>
          {transactions.map((tx) => (
            <tr key={tx.id} className="border-b border-gray-50 last:border-0 hover:bg-gray-50/50 transition-colors">
              <td className="px-4 py-3 font-mono text-xs text-gray-500">{new Date(tx.transactionDatetime).toLocaleString()}</td>
              <td className="px-4 py-3">
                <span className="inline-flex items-center gap-1.5 text-xs font-medium">
                  {tx.transactionType === "Deposit" ? (
                    <span className="flex h-5 w-5 items-center justify-center rounded-full bg-emerald-50">
                      <ArrowDown size={11} className="text-emerald-600" />
                    </span>
                  ) : (
                    <span className="flex h-5 w-5 items-center justify-center rounded-full bg-red-50">
                      <ArrowUp size={11} className="text-brand-600" />
                    </span>
                  )}
                  <span className="text-gray-700">{tx.transactionType}</span>
                </span>
              </td>
              <td className="px-4 py-3 text-right font-mono font-semibold text-gray-800">${formatCurrency(tx.amount)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function ExportTab() {
  const form = useFormFactory(exportFormConfig);
  const [result, setResult] = useState<{ message: string; style: "success" | "error" } | null>(null);

  const handleSubmit = async () => {
    setResult(null);
    try {
      const params: Record<string, string> = {};
      if (form.values.username) params.username = form.values.username;
      const resp = await api.get("banking/export", { searchParams: params });
      const blob = await resp.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `banking_export_${Date.now()}.csv`;
      a.click();
      URL.revokeObjectURL(url);
      setResult({ message: "Export completed. The audit file has been downloaded.", style: "success" });
    } catch (err: unknown) {
      setResult({ message: await getErrorMessage(err), style: "error" });
    }
  };

  return (
    <div className="space-y-6">
      <p className="text-sm text-gray-500">Export transaction records for backup and audit review.</p>
      <FormFactory config={exportFormConfig} values={form.values} setValue={form.setValue} onSubmit={handleSubmit} onReset={form.reset} isValid={true} isPending={false} />
      <ResultMessage result={result} />
    </div>
  );
}

function ResultMessage({ result }: { result: { message: string; style: "success" | "error" } | null }) {
  if (!result) return null;
  const isError = result.style === "error";
  return (
    <div className={`flex items-start gap-2.5 rounded-xl px-4 py-3 text-sm font-medium ${
      isError
        ? "bg-red-50 text-brand-600 border border-red-100"
        : "bg-emerald-50 text-emerald-700 border border-emerald-100"
    }`}>
      {isError ? <AlertTriangle size={16} className="mt-0.5 shrink-0" /> : <Search size={16} className="mt-0.5 shrink-0" />}
      {result.message}
    </div>
  );
}

async function getErrorMessage(err: unknown): Promise<string> {
  if (err instanceof Error && "response" in err) {
    try {
      const body = await (err as { response: Response }).response.json();
      if (body.detail) return body.detail;
    } catch { /* not JSON */ }
  }
  if (err instanceof Error) return err.message;
  return "An unexpected error occurred.";
}

function HowItWasBuilt() {
  const [open, setOpen] = useState(false);

  const techStack = [
    { icon: <Code size={16} />, label: "Frontend", detail: "React 19, TypeScript, Tailwind CSS, TanStack Router" },
    { icon: <Cpu size={16} />, label: "Backend", detail: "Vercel Serverless Functions (Node.js), Drizzle ORM" },
    { icon: <Database size={16} />, label: "Database", detail: "PostgreSQL hosted on Supabase (connection pooler)" },
    { icon: <Globe size={16} />, label: "Hosting", detail: "Vercel with automatic CI/CD from GitHub" },
    { icon: <Paintbrush size={16} />, label: "Design", detail: "Westpac-inspired branding with custom Tailwind theme" },
  ];

  return (
    <div className="mb-10">
      <button
        onClick={() => setOpen(!open)}
        className="flex w-full items-center justify-between rounded-xl bg-white px-5 py-4 text-left shadow-sm border border-gray-100 hover:bg-gray-50 transition-colors"
      >
        <span className="text-sm font-semibold text-gray-700">How this app was built</span>
        <ChevronDown size={18} className={`text-gray-400 transition-transform duration-200 ${open ? "rotate-180" : ""}`} />
      </button>

      {open && (
        <div className="mt-2 rounded-xl bg-white px-6 py-5 shadow-sm border border-gray-100 space-y-5 text-sm text-gray-600 leading-relaxed">
          <p>
            This application was built end-to-end by{" "}
            <a href="https://devin.ai" target="_blank" rel="noopener noreferrer" className="font-semibold text-brand-600 hover:underline">
              Devin
            </a>
            , an autonomous AI software engineer developed by Cognition AI. The entire process — from initial deployment
            to database configuration, UI design, and test data generation — was completed in a single session
            taking approximately <strong>2 hours</strong>.
          </p>

          <div>
            <h3 className="mb-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Technology Stack</h3>
            <div className="space-y-2.5">
              {techStack.map((item) => (
                <div key={item.label} className="flex items-start gap-3">
                  <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-brand-50 text-brand-600">
                    {item.icon}
                  </span>
                  <div>
                    <span className="font-semibold text-gray-700">{item.label}:</span>{" "}
                    {item.detail}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div>
            <h3 className="mb-2 text-xs font-semibold text-gray-500 uppercase tracking-wider">What Devin Did</h3>
            <ol className="list-decimal list-inside space-y-1.5 text-gray-600">
              <li>Configured the repository for Vercel deployment with serverless API routes</li>
              <li>Connected the app to a Supabase PostgreSQL database via connection pooler</li>
              <li>Resolved ESM module resolution issues for Vercel&apos;s Node.js runtime</li>
              <li>Ran end-to-end tests across all features (deposits, withdrawals, history, export)</li>
              <li>Redesigned the UI from a dark theme to Westpac-style branding with red/white palette</li>
              <li>Added the WBA logo and updated app titling</li>
              <li>Generated 50 test accounts with randomised balances and transaction histories</li>
              <li>Implemented proper currency formatting with thousand separators</li>
            </ol>
          </div>

          <p className="text-xs text-gray-400 pt-1">
            Built with Devin &middot; Cognition AI &middot; {new Date().getFullYear()}
          </p>
        </div>
      )}
    </div>
  );
}
