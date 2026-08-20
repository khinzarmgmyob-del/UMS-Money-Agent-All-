import React, { useState, useEffect } from 'react';
import {
  X,
  Calendar,
  Search,
  Download,
  Printer,
  Banknote,
  Wallet,
  TrendingUp,
  Layers,
  CheckCircle2,
  LayoutGrid,
  Table as TableIcon,
  ChevronDown,
  ChevronUp,
  ArrowLeftRight,
  ArrowDownRight,
  ArrowUpRight,
} from 'lucide-react';
import { Transaction, WalletItem, CashAccountItem, ShopProfile } from '../types';
import { getTodayFormatted, formatKs, formatLakh } from '../utils/formatters';

interface TotalAccountsReportModalProps {
  onClose: () => void;
  wallets: WalletItem[];
  cashAccounts: CashAccountItem[];
  transactions: Transaction[];
  shopProfile?: ShopProfile;
  selectedReportDate: string;
  setSelectedReportDate: (date: string) => void;
}

export const TotalAccountsReportModal: React.FC<TotalAccountsReportModalProps> = ({
  onClose,
  wallets,
  cashAccounts,
  transactions,
  shopProfile,
  selectedReportDate,
  setSelectedReportDate,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<'card' | 'table'>('card'); // Default card on mobile
  const [showSummaryChips, setShowSummaryChips] = useState(true);
  const todayStr = getTodayFormatted();

  useEffect(() => {
    const origOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = origOverflow;
    };
  }, []);

  // Filter transactions by date and search
  const filteredTransactions = transactions.filter((item) => {
    if (selectedReportDate !== 'ALL' && item.date !== selectedReportDate) {
      return false;
    }
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      item.customerName.toLowerCase().includes(q) ||
      item.phone.toLowerCase().includes(q) ||
      item.walletName.toLowerCase().includes(q) ||
      (item.targetWalletName && item.targetWalletName.toLowerCase().includes(q)) ||
      (item.cashAccountName && item.cashAccountName.toLowerCase().includes(q)) ||
      (item.note && item.note.toLowerCase().includes(q))
    );
  });

  const sortedTransactions = [...filteredTransactions].sort((a, b) => a.id - b.id);

  // Total current balances
  const totalCashBalance = cashAccounts.reduce((sum, c) => sum + c.balance, 0);
  const totalWalletBalance = wallets.reduce((sum, w) => sum + w.balance, 0);
  const grandTotalBalance = totalCashBalance + totalWalletBalance;

  // Commission totals
  const totalCommission = filteredTransactions.reduce((sum, t) => sum + (t.commission || 0), 0);

  // Cash Account deltas for filtered transactions
  const getCashDeltaForTx = (tx: Transaction, cashAccName: string): number => {
    if (tx.cashAccountName !== cashAccName) return 0;
    if (tx.type === 'လွှဲပြောင်း') {
      return tx.commission || 0; // Commission collected in cash
    }
    const isCashOut = tx.type === 'ထုတ်';
    if (!isCashOut) {
      return tx.amount + (tx.commission || 0);
    }
    return -(tx.amount - (tx.commission || 0));
  };

  // Wallet deltas for filtered transactions
  const getWalletDeltaForTx = (tx: Transaction, walletName: string): number => {
    if (tx.type === 'လွှဲပြောင်း') {
      if (tx.walletName === walletName) return -tx.amount;
      if (tx.targetWalletName === walletName) return tx.amount;
      return 0;
    }
    if (tx.walletName !== walletName) return 0;
    const isCashOut = tx.type === 'ထုတ်';
    return isCashOut ? tx.amount : -tx.amount;
  };

  // Export CSV
  const handleExportCSV = () => {
    const cashHeaders = cashAccounts.map((c) => `"${c.name} (ငွေသား)"`);
    const walletHeaders = wallets.map((w) => `"${w.name} (Wallet)"`);

    const headers = [
      'စဉ်',
      'နေ့စွဲ',
      'အချိန်',
      'ဖောက်သည်အမည်',
      'အမျိုးအစား / ဖော်ပြချက်',
      ...cashHeaders,
      ...walletHeaders,
      'ကော်မရှင်ခ (Ks)',
      'ဖုန်းနံပါတ်',
      'မှတ်ချက်',
    ].join(',');

    const rows = sortedTransactions.map((tx, idx) => {
      const isCashOut = tx.type === 'ထုတ်';
      const isTransfer = tx.type === 'လွှဲပြောင်း';
      const desc = isTransfer
        ? `Wallet to Wallet (${tx.walletName} -> ${tx.targetWalletName || '-'})`
        : isCashOut
        ? `ငွေထုတ် (${tx.walletName} -> ${tx.cashAccountName})`
        : `ငွေသွင်း (${tx.cashAccountName} -> ${tx.walletName})`;

      const cashCols = cashAccounts.map((c) => {
        const delta = getCashDeltaForTx(tx, c.name);
        return delta !== 0 ? delta : 0;
      });

      const walletCols = wallets.map((w) => {
        const delta = getWalletDeltaForTx(tx, w.name);
        return delta !== 0 ? delta : 0;
      });

      return [
        idx + 1,
        `"${tx.date}"`,
        `"${tx.time || '-'}"`,
        `"${tx.customerName}"`,
        `"${desc}"`,
        ...cashCols,
        ...walletCols,
        tx.commission || 0,
        `"${tx.phone}"`,
        `"${tx.note || '-'}"`,
      ].join(',');
    });

    const csvContent = 'data:text/csv;charset=utf-8,\uFEFF' + [headers, ...rows].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `all_accounts_balance_ledger_${selectedReportDate}_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    link.remove();
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 overflow-hidden touch-none">
      <div className="absolute inset-0" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-7xl p-3 sm:p-6 border border-slate-100 max-h-[94vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150 z-10">
        {/* Modal Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-200 mb-3 gap-2 shrink-0">
          <div className="flex items-center gap-2 min-w-0">
            <div className="p-2 bg-indigo-50 text-indigo-600 rounded-xl shrink-0">
              <Layers className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <h3 className="text-sm sm:text-base md:text-lg font-black text-slate-900 truncate">
                စုစုပေါင်း ငွေစာရင်းအားလုံး လက်ကျန် အသေးစိတ် ရှင်းတမ်း
              </h3>
              <p className="text-[11px] text-slate-400">
                ငွေသား နှင့် Wallet အကောင့်အားလုံး၏ အပြောင်းအလဲမှတ်တမ်း
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            {/* View Mode Toggle */}
            <div className="flex items-center bg-slate-100 p-0.5 rounded-lg">
              <button
                onClick={() => setViewMode('card')}
                className={`p-1.5 rounded-md text-xs font-semibold flex items-center gap-1 transition-all cursor-pointer ${
                  viewMode === 'card'
                    ? 'bg-white text-indigo-600 shadow-xs'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
                title="ကတ်ပြားပုံစံ (Card View)"
              >
                <LayoutGrid className="w-3.5 h-3.5" />
                <span className="hidden md:inline text-[11px]">Card</span>
              </button>
              <button
                onClick={() => setViewMode('table')}
                className={`p-1.5 rounded-md text-xs font-semibold flex items-center gap-1 transition-all cursor-pointer ${
                  viewMode === 'table'
                    ? 'bg-white text-indigo-600 shadow-xs'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
                title="ဇယားပုံစံ (Table View)"
              >
                <TableIcon className="w-3.5 h-3.5" />
                <span className="hidden md:inline text-[11px]">ဇယား</span>
              </button>
            </div>

            <button
              onClick={handleExportCSV}
              className="p-1.5 sm:px-2.5 sm:py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-bold transition-colors cursor-pointer flex items-center gap-1"
              title="CSV ဒေါင်းလုဒ်"
            >
              <Download className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">CSV</span>
            </button>
            <button
              onClick={handlePrint}
              className="p-1.5 sm:px-2.5 sm:py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-bold transition-colors cursor-pointer flex items-center gap-1"
              title="Print ထုတ်မည်"
            >
              <Printer className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Print</span>
            </button>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 flex items-center justify-center transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Scrollable Container */}
        <div className="overflow-y-auto flex-1 pr-0.5 space-y-3">
          {/* Summary Strip */}
          <div className="bg-slate-50 border border-slate-200/90 rounded-xl p-2.5">
            <div className="flex items-center justify-between pb-1.5 border-b border-slate-200">
              <span className="text-[11px] font-bold text-slate-700">📌 လက်ရှိ လက်ကျန်ငွေများ အကျဉ်းချုပ်</span>
              <button
                onClick={() => setShowSummaryChips(!showSummaryChips)}
                className="text-[11px] text-indigo-600 font-semibold flex items-center gap-0.5 cursor-pointer"
              >
                {showSummaryChips ? 'ဖျောက်မည်' : 'ကြည့်မည်'}
                {showSummaryChips ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
              </button>
            </div>

            {showSummaryChips && (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2">
                <div className="p-2.5 bg-emerald-50/90 border border-emerald-200 rounded-xl">
                  <div className="text-[10px] font-bold text-emerald-800 flex items-center gap-1">
                    <Banknote className="w-3 h-3" />
                    💵 ငွေသားပေါင်း ({cashAccounts.length} နေရာ)
                  </div>
                  <div className="text-sm sm:text-base font-black text-emerald-700 mt-0.5">
                    {formatKs(totalCashBalance)}
                  </div>
                  <div className="text-[9px] text-emerald-600">{formatLakh(totalCashBalance)}</div>
                </div>

                <div className="p-2.5 bg-indigo-50/90 border border-indigo-200 rounded-xl">
                  <div className="text-[10px] font-bold text-indigo-800 flex items-center gap-1">
                    <Wallet className="w-3 h-3" />
                    🏦 Wallet ပေါင်း ({wallets.length} ခု)
                  </div>
                  <div className="text-sm sm:text-base font-black text-indigo-700 mt-0.5">
                    {formatKs(totalWalletBalance)}
                  </div>
                  <div className="text-[9px] text-indigo-600">{formatLakh(totalWalletBalance)}</div>
                </div>

                <div className="p-2.5 bg-amber-50/90 border border-amber-200 rounded-xl">
                  <div className="text-[10px] font-bold text-amber-800 flex items-center gap-1">
                    <TrendingUp className="w-3 h-3" />
                    📈 ကော်မရှင် စုစုပေါင်း
                  </div>
                  <div className="text-sm sm:text-base font-black text-amber-800 mt-0.5">
                    +{formatKs(totalCommission)}
                  </div>
                  <div className="text-[9px] text-amber-700">အရောင်းအဝယ် {sortedTransactions.length} ခုမှ</div>
                </div>

                <div className="p-2.5 bg-gradient-to-tr from-indigo-700 to-indigo-600 text-white rounded-xl shadow-xs">
                  <div className="text-[10px] font-bold text-indigo-100 flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3" />
                    🌐 ငွေစာရင်းအားလုံးလက်ကျန်
                  </div>
                  <div className="text-sm sm:text-base font-black text-white mt-0.5">
                    {formatKs(grandTotalBalance)}
                  </div>
                  <div className="text-[9px] text-indigo-200">{formatLakh(grandTotalBalance)} (Cash+Wallet)</div>
                </div>
              </div>
            )}
          </div>

          {/* Filters Bar */}
          <div className="flex flex-wrap items-center gap-2 p-2.5 bg-slate-50 border border-slate-200 rounded-xl">
            <div className="flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-slate-500" />
              <input
                type="date"
                value={selectedReportDate === 'ALL' ? todayStr : selectedReportDate}
                onChange={(e) => setSelectedReportDate(e.target.value)}
                className="bg-white border border-slate-300 rounded-lg px-2 py-1 text-xs font-bold text-slate-800 outline-none"
              />
            </div>

            <button
              onClick={() => setSelectedReportDate(todayStr)}
              className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                selectedReportDate === todayStr
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-100'
              }`}
            >
              ယနေ့
            </button>

            <button
              onClick={() => setSelectedReportDate('ALL')}
              className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                selectedReportDate === 'ALL'
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-100'
              }`}
            >
              ရက်စွဲအားလုံး
            </button>

            <div className="relative flex-1 min-w-[140px]">
              <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="ရှာဖွေရန်..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-white border border-slate-300 rounded-lg pl-7 pr-2.5 py-1 text-xs text-slate-800 outline-none"
              />
            </div>
          </div>

          {/* VIEW 1: RESPONSIVE CARDS VIEW */}
          {viewMode === 'card' && (
            <div className="space-y-2.5">
              {/* Reference Card: Opening Balances */}
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl">
                <div className="text-xs font-bold text-slate-800 mb-2 flex items-center gap-1.5">
                  <span>📌 အကောင့်များ၏ လက်ရှိ လက်ကျန်ငွေများ (Current Balances):</span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2 text-xs">
                  {cashAccounts.map((c) => (
                    <div key={`card-init-c-${c.id}`} className="p-2 bg-white border border-emerald-200 rounded-lg">
                      <div className="text-[10px] text-emerald-800 font-bold truncate">💵 {c.name}</div>
                      <div className="font-black text-emerald-700">{formatKs(c.balance)}</div>
                    </div>
                  ))}
                  {wallets.map((w) => (
                    <div key={`card-init-w-${w.id}`} className="p-2 bg-white border border-indigo-200 rounded-lg">
                      <div className="text-[10px] text-indigo-800 font-bold truncate">🏦 {w.name}</div>
                      <div className="font-black text-indigo-700">{formatKs(w.balance)}</div>
                    </div>
                  ))}
                </div>
              </div>

              {sortedTransactions.length === 0 ? (
                <div className="p-8 text-center text-slate-400 bg-slate-50 rounded-xl border border-slate-200 font-medium text-xs">
                  ရွေးချယ်ထားသော စံနှုန်းများနှင့် ကိုက်ညီသော အရောင်းအဝယ် စာရင်း မရှိပါ။
                </div>
              ) : (
                sortedTransactions.map((item, index) => {
                  const isCashOut = item.type === 'ထုတ်';
                  const isTransfer = item.type === 'လွှဲပြောင်း';
                  const cashDelta = getCashDeltaForTx(item, item.cashAccountName || '');
                  const walletDelta = getWalletDeltaForTx(item, item.walletName);

                  return (
                    <div
                      key={`card-tx-${item.id}`}
                      className="p-3 bg-white border border-slate-200 hover:border-indigo-300 rounded-xl shadow-xs space-y-2 transition-all"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5">
                            <span className="text-xs font-black text-slate-900 truncate">
                              {index + 1}. {item.customerName}
                            </span>
                            <span
                              className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold shrink-0 ${
                                isTransfer
                                  ? 'bg-sky-50 text-sky-700 border border-sky-200'
                                  : isCashOut
                                  ? 'bg-red-50 text-red-700 border border-red-200'
                                  : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              }`}
                            >
                              {isTransfer ? '🔄 Wallet to Wallet' : isCashOut ? 'ငွေထုတ် (Out)' : 'ငွေသွင်း (In)'}
                            </span>
                          </div>
                          <div className="text-[10px] text-slate-400 mt-0.5">
                            {item.date} {item.time && `• ${item.time}`} {item.phone && `• ${item.phone}`}
                          </div>
                        </div>

                        {item.commission > 0 && (
                          <span className="text-xs font-black text-amber-800 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200 shrink-0">
                            +{formatKs(item.commission)} Ks
                          </span>
                        )}
                      </div>

                      {/* Account balance changes */}
                      <div className="grid grid-cols-2 gap-2 p-2 bg-slate-50 rounded-lg text-xs">
                        {isTransfer ? (
                          <>
                            <div>
                              <span className="text-[10px] text-slate-500 block truncate">
                                📤 {item.walletName} (လွှဲထုတ်):
                              </span>
                              <span className="font-black text-red-600">
                                -{formatKs(item.amount)}
                              </span>
                            </div>

                            <div>
                              <span className="text-[10px] text-slate-500 block truncate">
                                📥 {item.targetWalletName || 'Wallet'} (လက်ခံ):
                              </span>
                              <span className="font-black text-indigo-700">
                                +{formatKs(item.amount)}
                              </span>
                            </div>
                          </>
                        ) : (
                          <>
                            <div>
                              <span className="text-[10px] text-slate-500 block truncate">
                                💵 {item.cashAccountName || 'ငွေသားအကောင့်'}:
                              </span>
                              <span className={`font-black ${cashDelta >= 0 ? 'text-emerald-700' : 'text-red-600'}`}>
                                {cashDelta >= 0 ? `+${formatKs(cashDelta)}` : formatKs(cashDelta)}
                              </span>
                            </div>

                            <div>
                              <span className="text-[10px] text-slate-500 block truncate">
                                🏦 {item.walletName || 'Wallet'}:
                              </span>
                              <span className={`font-black ${walletDelta >= 0 ? 'text-indigo-700' : 'text-red-600'}`}>
                                {walletDelta >= 0 ? `+${formatKs(walletDelta)}` : formatKs(walletDelta)}
                              </span>
                            </div>
                          </>
                        )}
                      </div>

                      {item.note && (
                        <div className="text-[10px] text-slate-400 italic pt-1 border-t border-slate-100">
                          {item.note}
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          )}

          {/* VIEW 2: FULL MATRIX TABLE */}
          {viewMode === 'table' && (
            <div className="overflow-x-auto border border-slate-200 rounded-xl">
              <table className="w-full text-xs text-left border-collapse min-w-[850px]">
                <thead className="bg-slate-100 sticky top-0 z-20 text-slate-700 font-bold border-b border-slate-200 shadow-xs">
                  <tr className="border-b border-slate-200/80 bg-slate-200/60 text-[10px]">
                    <th colSpan={4} className="p-1.5 text-center text-slate-700 font-bold border-r border-slate-300">
                      📋 အရောင်းအဝယ် အချက်အလက်
                    </th>
                    <th
                      colSpan={cashAccounts.length}
                      className="p-1.5 text-center text-emerald-900 bg-emerald-100/70 font-bold border-r border-slate-300"
                    >
                      💵 ငွေသားအကောင့်များ
                    </th>
                    <th
                      colSpan={wallets.length}
                      className="p-1.5 text-center text-indigo-900 bg-indigo-100/70 font-bold border-r border-slate-300"
                    >
                      🏦 Wallet အကောင့်များ
                    </th>
                    <th colSpan={2} className="p-1.5 text-center text-amber-900 bg-amber-100/70 font-bold">
                      အခြား
                    </th>
                  </tr>
                  <tr>
                    <th className="p-2 whitespace-nowrap">စဉ်</th>
                    <th className="p-2 whitespace-nowrap">ရက်စွဲ/အချိန်</th>
                    <th className="p-2 whitespace-nowrap">ဖောက်သည်</th>
                    <th className="p-2 whitespace-nowrap border-r border-slate-300">အမျိုးအစား</th>

                    {/* Cash Account Columns */}
                    {cashAccounts.map((c) => (
                      <th
                        key={`th-c-${c.id}`}
                        className="p-2 text-right whitespace-nowrap bg-emerald-50/50 text-emerald-900 font-bold"
                      >
                        {c.name}
                      </th>
                    ))}

                    {/* Wallet Columns */}
                    {wallets.map((w, wIdx) => (
                      <th
                        key={`th-w-${w.id}`}
                        className={`p-2 text-right whitespace-nowrap bg-indigo-50/50 text-indigo-900 font-bold ${
                          wIdx === wallets.length - 1 ? 'border-r border-slate-300' : ''
                        }`}
                      >
                        {w.name}
                      </th>
                    ))}

                    <th className="p-2 text-right whitespace-nowrap bg-amber-50 text-amber-900">ကော်မရှင်</th>
                    <th className="p-2 whitespace-nowrap">မှတ်ချက်</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {sortedTransactions.length === 0 ? (
                    <tr>
                      <td colSpan={6 + cashAccounts.length + wallets.length} className="p-6 text-center text-slate-400">
                        ရွေးချယ်ထားသော စံနှုန်းများနှင့် ကိုက်ညီသော ဒေတာ မရှိပါ။
                      </td>
                    </tr>
                  ) : (
                    sortedTransactions.map((tx, idx) => {
                      const isCashOut = tx.type === 'ထုတ်';
                      const isTransfer = tx.type === 'လွှဲပြောင်း';

                      return (
                        <tr key={`matrix-row-${tx.id}`} className="hover:bg-slate-50 transition-colors">
                          <td className="p-2 text-slate-500 font-medium">{idx + 1}</td>
                          <td className="p-2 whitespace-nowrap text-slate-600">
                            <div>{tx.date}</div>
                            {tx.time && <div className="text-[10px] text-slate-400">{tx.time}</div>}
                          </td>
                          <td className="p-2 font-bold text-slate-800 whitespace-nowrap">{tx.customerName}</td>
                          <td className="p-2 whitespace-nowrap border-r border-slate-300">
                            <span
                              className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                                isTransfer
                                  ? 'bg-sky-50 text-sky-700'
                                  : isCashOut
                                  ? 'bg-red-50 text-red-700'
                                  : 'bg-emerald-50 text-emerald-700'
                              }`}
                            >
                              {isTransfer ? '🔄 လွှဲပြောင်း' : isCashOut ? 'ထုတ်' : 'သွင်း'}
                            </span>
                          </td>

                          {/* Cash Account Deltas */}
                          {cashAccounts.map((c) => {
                            const delta = getCashDeltaForTx(tx, c.name);
                            return (
                              <td
                                key={`td-c-${tx.id}-${c.id}`}
                                className={`p-2 text-right font-mono whitespace-nowrap ${
                                  delta > 0
                                    ? 'text-emerald-700 font-bold bg-emerald-50/20'
                                    : delta < 0
                                    ? 'text-red-600 font-bold bg-red-50/20'
                                    : 'text-slate-300'
                                }`}
                              >
                                {delta !== 0 ? (delta > 0 ? `+${formatKs(delta)}` : formatKs(delta)) : '-'}
                              </td>
                            );
                          })}

                          {/* Wallet Deltas */}
                          {wallets.map((w, wIdx) => {
                            const delta = getWalletDeltaForTx(tx, w.name);
                            return (
                              <td
                                key={`td-w-${tx.id}-${w.id}`}
                                className={`p-2 text-right font-mono whitespace-nowrap ${
                                  wIdx === wallets.length - 1 ? 'border-r border-slate-300' : ''
                                } ${
                                  delta > 0
                                    ? 'text-indigo-700 font-bold bg-indigo-50/20'
                                    : delta < 0
                                    ? 'text-red-600 font-bold bg-red-50/20'
                                    : 'text-slate-300'
                                }`}
                              >
                                {delta !== 0 ? (delta > 0 ? `+${formatKs(delta)}` : formatKs(delta)) : '-'}
                              </td>
                            );
                          })}

                          <td className="p-2 text-right font-bold text-amber-800 bg-amber-50/40 whitespace-nowrap">
                            {tx.commission > 0 ? `+${formatKs(tx.commission)}` : '-'}
                          </td>
                          <td className="p-2 text-slate-500 italic text-[11px] truncate max-w-[150px]">
                            {tx.note || '-'}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
