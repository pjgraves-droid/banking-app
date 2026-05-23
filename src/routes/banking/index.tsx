import {
  ArrowDown,
  ArrowUp,
  Landmark,
  Clock,
  Download,
  Search,
  AlertTriangle,
} from "lucide-react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { z } from "zod";
import { api } from "@/api";
import { FormFactory, useFormFactory, type FormConfig } from "@/components/form-factory";

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
    <div className="mx-auto max-w-3xl px-8 py-10">
      <div className="mb-8 flex items-start gap-4">
        <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-zinc-800">
          <Landmark size={22} className="text-zinc-200" />
        </div>
        <div>
          <h1 className="mb-0.5 font-mono text-lg font-semibold text-zinc-100">banking</h1>
          <p className="text-[13px] text-zinc-500">
            Manage account balances, view transaction history, and export audit records.
          </p>
        </div>
      </div>

      <div className="mb-6 flex gap-1 border-b border-zinc-800">
        <TabButton active={activeTab === "funds"} onClick={() => setTab("funds")} icon={<Landmark size={14} />} label="Funds Movement" />
        <TabButton active={activeTab === "history"} onClick={() => setTab("history")} icon={<Clock size={14} />} label="Transaction History" />
        <TabButton active={activeTab === "export"} onClick={() => setTab("export")} icon={<Download size={14} />} label="Export for Audit" />
      </div>

      {activeTab === "funds" && <FundsTab />}
      {activeTab === "history" && <HistoryTab />}
      {activeTab === "export" && <ExportTab />}
    </div>
  );
}

function TabButton({ active, onClick, icon, label }: { active: boolean; onClick: () => void; icon: React.ReactNode; label: string }) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-1.5 px-3 py-2 text-xs font-medium ${
        active ? "border-b-2 border-zinc-200 text-zinc-100" : "text-zinc-500 hover:text-zinc-300"
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
        setResult({ message: `Balance for ${data.username}: $${data.balance.toFixed(2)}`, style: "success" });
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
      setResult({ message: `${data.message} New balance: $${data.newBalance.toFixed(2)}`, style: "success" });
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
        <div className="card px-4 py-3">
          <span className="text-xs text-zinc-500">Current Balance</span>
          <p className="font-mono text-xl font-semibold text-zinc-100">${balance.toFixed(2)}</p>
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
  if (transactions.length === 0) return <p className="text-sm text-zinc-500">No transaction records match the selected criteria.</p>;

  return (
    <div className="card overflow-hidden">
      <table className="w-full text-left text-sm">
        <thead>
          <tr className="border-b border-zinc-800 text-xs text-zinc-500">
            <th className="px-4 py-2">Date/Time</th>
            <th className="px-4 py-2">Type</th>
            <th className="px-4 py-2 text-right">Amount</th>
          </tr>
        </thead>
        <tbody>
          {transactions.map((tx) => (
            <tr key={tx.id} className="border-b border-zinc-800/50 last:border-0">
              <td className="px-4 py-2 font-mono text-xs text-zinc-400">{new Date(tx.transactionDatetime).toLocaleString()}</td>
              <td className="px-4 py-2">
                <span className="inline-flex items-center gap-1 text-xs">
                  {tx.transactionType === "Deposit" ? <ArrowDown size={12} className="text-emerald-400" /> : <ArrowUp size={12} className="text-red-400" />}
                  {tx.transactionType}
                </span>
              </td>
              <td className="px-4 py-2 text-right font-mono text-zinc-200">${tx.amount.toFixed(2)}</td>
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
      <p className="text-sm text-zinc-500">Export transaction records for backup and audit review.</p>
      <FormFactory config={exportFormConfig} values={form.values} setValue={form.setValue} onSubmit={handleSubmit} onReset={form.reset} isValid={true} isPending={false} />
      <ResultMessage result={result} />
    </div>
  );
}

function ResultMessage({ result }: { result: { message: string; style: "success" | "error" } | null }) {
  if (!result) return null;
  const isError = result.style === "error";
  return (
    <div className={`flex items-start gap-2 rounded-lg px-4 py-3 text-sm ${isError ? "bg-red-950/30 text-red-300" : "bg-emerald-950/30 text-emerald-300"}`}>
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
