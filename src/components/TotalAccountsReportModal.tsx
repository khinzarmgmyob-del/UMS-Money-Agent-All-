import React, { useState } from 'react';
import { X, Calendar, Search, Download, Printer, Banknote, Wallet, TrendingUp, Layers, CheckCircle2 } from 'lucide-react';
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
  const todayStr = getTodayFormatted();

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
      (item.cashAccountName && item.cashAccountName.toLowerCase().includes(q)) ||
      (item.note && item.note.toLowerCase().includes(q))
    );
  });

  // Sort chronological for ledger view (oldest to newest for auditing) or newest first
  // Usually ledger is chronological from start of day/period
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
    const isCashOut = tx.type === 'ထုတ်';
    // For Cash In: Cash account receives amount + commission
    if (!isCashOut) {
      return tx.amount + (tx.commission || 0);
    }
    // For Cash Out:
    // In both deduct & separate modes: net cash given out is (amount - commission)
    return -(tx.amount - (tx.commission || 0));
  };

  // Wallet deltas for filtered transactions
  const getWalletDeltaForTx = (tx: Transaction, walletName: string): number => {
    if (tx.walletName !== walletName) return 0;
    const isCashOut = tx.type === 'ထုတ်';
    // Cash In: agent transfers amount from wallet -> -amount
    // Cash Out: customer transfers amount to wallet -> +amount
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
      const desc = isCashOut
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
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-7xl p-4 sm:p-6 border border-slate-100 my-auto animate-in fade-in zoom-in-95 duration-150 max-h-[96vh] flex flex-col">
        {/* Modal Header */}
        <div className="flex flex-wrap items-center justify-between pb-4 border-b border-slate-200 mb-4 gap-3 shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-indigo-50 text-indigo-600 rounded-xl">
              <Layers className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-lg sm:text-xl font-black text-slate-900 flex items-center gap-2">
                🌐 စုစုပေါင်း ငွေစာရင်းအားလုံးလက်ကျန် အသေးစိတ် စာရင်းချုပ်
              </h3>
              <p className="text-xs text-slate-500 font-medium">
                ငွေသားအကောင့်များနှင့် Wallet အကောင့်များအားလုံး၏ မတည်ငွေ နှင့် အရောင်းအဝယ် စာရင်းအသေးစိတ်
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleExportCSV}
              className="flex items-center gap-1 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-colors cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              CSV ဒေါင်းလုဒ်
            </button>
            <button
              onClick={handlePrint}
              className="flex items-center gap-1 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-colors cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5" />
              Print
            </button>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 flex items-center justify-center transition-colors cursor-pointer ml-1"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Top Summary 4 Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-4 shrink-0">
          <div className="p-3 bg-emerald-50/80 border border-emerald-200 rounded-xl">
            <div className="text-[11px] font-bold text-emerald-800 flex items-center gap-1 mb-0.5">
              <Banknote className="w-3.5 h-3.5" />
              💵 လက်ငင်းငွေသားပေါင်း ({cashAccounts.length} ခု)
            </div>
            <div className="text-base sm:text-lg font-black text-emerald-700">
              {formatKs(totalCashBalance)}
            </div>
            <div className="text-[10px] text-emerald-600 font-medium">
              {formatLakh(totalCashBalance)}
            </div>
          </div>

          <div className="p-3 bg-indigo-50/80 border border-indigo-200 rounded-xl">
            <div className="text-[11px] font-bold text-indigo-800 flex items-center gap-1 mb-0.5">
              <Wallet className="w-3.5 h-3.5" />
              🏦 Wallet လက်ကျန်ပေါင်း ({wallets.length} ခု)
            </div>
            <div className="text-base sm:text-lg font-black text-indigo-700">
              {formatKs(totalWalletBalance)}
            </div>
            <div className="text-[10px] text-indigo-600 font-medium">
              {formatLakh(totalWalletBalance)}
            </div>
          </div>

          <div className="p-3 bg-amber-50/80 border border-amber-200 rounded-xl">
            <div className="text-[11px] font-bold text-amber-800 flex items-center gap-1 mb-0.5">
              <TrendingUp className="w-3.5 h-3.5" />
              📈 ကော်မရှင်ရငွေ စုစုပေါင်း
            </div>
            <div className="text-base sm:text-lg font-black text-amber-800">
              +{formatKs(totalCommission)}
            </div>
            <div className="text-[10px] text-amber-700 font-medium">
              အရောင်းအဝယ် {sortedTransactions.length} ခုမှ
            </div>
          </div>

          <div className="p-3 bg-gradient-to-tr from-indigo-700 to-indigo-600 text-white rounded-xl shadow-xs">
            <div className="text-[11px] font-bold text-indigo-100 flex items-center gap-1 mb-0.5">
              <CheckCircle2 className="w-3.5 h-3.5" />
              🌐 စုစုပေါင်း ငွေစာရင်းအားလုံးလက်ကျန်
            </div>
            <div className="text-base sm:text-lg font-black text-white">
              {formatKs(grandTotalBalance)}
            </div>
            <div className="text-[10px] text-indigo-200 font-medium">
              {formatLakh(grandTotalBalance)} (ငွေသား + Wallets)
            </div>
          </div>
        </div>

        {/* Filters Bar */}
        <div className="flex flex-wrap items-center gap-2.5 mb-3 p-3 bg-slate-50 border border-slate-200 rounded-xl shrink-0">
          <div className="flex items-center gap-1.5">
            <Calendar className="w-4 h-4 text-slate-500" />
            <input
              type="date"
              value={selectedReportDate === 'ALL' ? todayStr : selectedReportDate}
              onChange={(e) => setSelectedReportDate(e.target.value)}
              className="bg-white border border-slate-300 rounded-lg px-2.5 py-1 text-xs font-bold text-slate-800 outline-none"
            />
          </div>

          <button
            onClick={() => setSelectedReportDate(todayStr)}
            className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              selectedReportDate === todayStr
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-100'
            }`}
          >
            ယနေ့ (Today)
          </button>

          <button
            onClick={() => setSelectedReportDate('ALL')}
            className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              selectedReportDate === 'ALL'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-100'
            }`}
          >
            ရက်စွဲ အားလုံး (All Time)
          </button>

          <div className="relative flex-1 min-w-[180px]">
            <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="ရှာဖွေရန် (ဖောက်သည်၊ ဖုန်း၊ အကောင့်)..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-white border border-slate-300 rounded-lg pl-8 pr-3 py-1 text-xs text-slate-800 outline-none"
            />
          </div>
        </div>

        {/* Dynamic Matrix Table: Date, Customer, Desc, [Cash Account Columns], [Wallet Account Columns], Commission, Note */}
        <div className="overflow-x-auto overflow-y-auto flex-1 border border-slate-200 rounded-xl">
          <table className="w-full text-xs text-left border-collapse min-w-[900px]">
            <thead className="bg-slate-100 sticky top-0 z-20 text-slate-700 font-bold border-b border-slate-200 shadow-xs">
              {/* Top Grouping Header Row */}
              <tr className="border-b border-slate-200/80 bg-slate-200/60 text-[11px]">
                <th colSpan={4} className="p-2 text-center text-slate-700 font-bold border-r border-slate-300">
                  📋 အခြေခံ အရောင်းအဝယ် အချက်အလက်
                </th>
                <th
                  colSpan={cashAccounts.length}
                  className="p-2 text-center text-emerald-900 bg-emerald-100/70 font-bold border-r border-slate-300"
                >
                  💵 လက်ငင်းငွေသား အကောင့်များ (Cash Accounts)
                </th>
                <th
                  colSpan={wallets.length}
                  className="p-2 text-center text-indigo-900 bg-indigo-100/70 font-bold border-r border-slate-300"
                >
                  🏦 Wallet / ဘဏ် အကောင့်များ
                </th>
                <th colSpan={2} className="p-2 text-center text-amber-900 bg-amber-100/70 font-bold">
                  📈 ကော်မရှင်ခ နှင့် အခြား
                </th>
              </tr>

              {/* Specific Columns Header Row */}
              <tr>
                <th className="p-2.5 whitespace-nowrap border-r border-slate-200">စဉ်</th>
                <th className="p-2.5 whitespace-nowrap border-r border-slate-200">နေ့စွဲ/အချိန်</th>
                <th className="p-2.5 whitespace-nowrap border-r border-slate-200">ဖောက်သည် အမည်</th>
                <th className="p-2.5 whitespace-nowrap border-r border-slate-300">အမျိုးအစား / ဖော်ပြချက်</th>

                {/* Cash Account Column Headers */}
                {cashAccounts.map((c) => (
                  <th
                    key={`header-cash-${c.id}`}
                    className="p-2.5 text-right whitespace-nowrap bg-emerald-50/70 text-emerald-900 border-r border-slate-200"
                  >
                    <div>{c.name}</div>
                    <div className="text-[10px] font-normal text-emerald-700">လက်ကျန်: {formatKs(c.balance)}</div>
                  </th>
                ))}

                {/* Wallet Account Column Headers */}
                {wallets.map((w) => (
                  <th
                    key={`header-wallet-${w.id}`}
                    className="p-2.5 text-right whitespace-nowrap bg-indigo-50/70 text-indigo-900 border-r border-slate-200"
                  >
                    <div>{w.name}</div>
                    <div className="text-[10px] font-normal text-indigo-700">လက်ကျန်: {formatKs(w.balance)}</div>
                  </th>
                ))}

                {/* Commission Column Header */}
                <th className="p-2.5 text-right whitespace-nowrap bg-amber-50/70 text-amber-900 border-r border-slate-200">
                  ရရှိ ကော်မရှင် (Ks)
                </th>
                <th className="p-2.5 whitespace-nowrap">မှတ်ချက်</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-200">
              {/* Row 0: Initial Capital / Opening Balances Reference */}
              <tr className="bg-slate-50/90 font-semibold border-b-2 border-slate-300 text-slate-800">
                <td className="p-2.5 text-slate-400 font-bold border-r border-slate-200">★</td>
                <td className="p-2.5 whitespace-nowrap border-r border-slate-200 text-slate-500 font-mono">
                  မတည်ငွေ စာရင်း
                </td>
                <td className="p-2.5 font-black text-slate-900 whitespace-nowrap border-r border-slate-200">
                  📌 လက်ရှိ မတည်ငွေစာရင်း လက်ကျန်
                </td>
                <td className="p-2.5 text-slate-600 whitespace-nowrap border-r border-slate-300">
                  အကောင့်အလိုက် စုစုပေါင်းလက်ကျန်
                </td>

                {/* Cash Account Current Balances */}
                {cashAccounts.map((c) => (
                  <td
                    key={`init-cash-${c.id}`}
                    className="p-2.5 text-right font-black text-emerald-800 bg-emerald-50/40 border-r border-slate-200 whitespace-nowrap"
                  >
                    {formatKs(c.balance)}
                  </td>
                ))}

                {/* Wallet Current Balances */}
                {wallets.map((w) => (
                  <td
                    key={`init-wallet-${w.id}`}
                    className="p-2.5 text-right font-black text-indigo-800 bg-indigo-50/40 border-r border-slate-200 whitespace-nowrap"
                  >
                    {formatKs(w.balance)}
                  </td>
                ))}

                <td className="p-2.5 text-right font-black text-amber-800 bg-amber-50/40 border-r border-slate-200 whitespace-nowrap">
                  +{formatKs(totalCommission)}
                </td>
                <td className="p-2.5 text-slate-500 text-[11px] whitespace-nowrap">
                  မတည်ငွေ စုစုပေါင်း: <b className="text-slate-900">{formatKs(grandTotalBalance)}</b>
                </td>
              </tr>

              {/* Transactions List */}
              {sortedTransactions.length === 0 ? (
                <tr>
                  <td
                    colSpan={4 + cashAccounts.length + wallets.length + 2}
                    className="p-8 text-center text-slate-400 font-medium"
                  >
                    ရွေးချယ်ထားသော စံနှုန်းများနှင့် ကိုက်ညီသော အရောင်းအဝယ် စာရင်း မရှိပါ။
                  </td>
                </tr>
              ) : (
                sortedTransactions.map((item, index) => {
                  const isCashOut = item.type === 'ထုတ်';
                  const desc = isCashOut
                    ? `ငွေထုတ် [${item.walletName} -> ${item.cashAccountName}]`
                    : `ငွေသွင်း [${item.cashAccountName} -> ${item.walletName}]`;

                  return (
                    <tr key={item.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="p-2.5 text-slate-500 font-medium border-r border-slate-200">{index + 1}</td>
                      <td className="p-2.5 text-slate-600 whitespace-nowrap border-r border-slate-200">
                        <div className="font-semibold text-slate-800">{item.date}</div>
                        {item.time && <div className="text-[10px] text-slate-400">{item.time}</div>}
                      </td>
                      <td className="p-2.5 font-bold text-slate-900 whitespace-nowrap border-r border-slate-200">
                        {item.customerName}
                        {item.phone && item.phone !== '-' && (
                          <div className="text-[10px] font-mono text-slate-400">{item.phone}</div>
                        )}
                      </td>
                      <td className="p-2.5 whitespace-nowrap border-r border-slate-300">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-bold ${
                            isCashOut
                              ? 'bg-red-50 text-red-700 border border-red-200'
                              : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          }`}
                        >
                          {desc}
                        </span>
                      </td>

                      {/* Cash Accounts Columns */}
                      {cashAccounts.map((c) => {
                        const delta = getCashDeltaForTx(item, c.name);
                        return (
                          <td
                            key={`row-${item.id}-cash-${c.id}`}
                            className={`p-2.5 text-right font-bold whitespace-nowrap border-r border-slate-200 ${
                              delta > 0
                                ? 'text-emerald-700 bg-emerald-50/20'
                                : delta < 0
                                ? 'text-red-600 bg-red-50/20'
                                : 'text-slate-300'
                            }`}
                          >
                            {delta > 0
                              ? `+${delta.toLocaleString()} Ks`
                              : delta < 0
                              ? `${delta.toLocaleString()} Ks`
                              : '-'}
                          </td>
                        );
                      })}

                      {/* Wallet Accounts Columns */}
                      {wallets.map((w) => {
                        const delta = getWalletDeltaForTx(item, w.name);
                        return (
                          <td
                            key={`row-${item.id}-wallet-${w.id}`}
                            className={`p-2.5 text-right font-bold whitespace-nowrap border-r border-slate-200 ${
                              delta > 0
                                ? 'text-indigo-700 bg-indigo-50/20'
                                : delta < 0
                                ? 'text-red-600 bg-red-50/20'
                                : 'text-slate-300'
                            }`}
                          >
                            {delta > 0
                              ? `+${delta.toLocaleString()} Ks`
                              : delta < 0
                              ? `${delta.toLocaleString()} Ks`
                              : '-'}
                          </td>
                        );
                      })}

                      {/* Commission Column */}
                      <td className="p-2.5 text-right font-bold whitespace-nowrap text-amber-800 bg-amber-50/30 border-r border-slate-200">
                        {item.commission > 0 ? (
                          <div>
                            +{item.commission.toLocaleString()} Ks
                            {isCashOut && item.commissionMode === 'deduct' && (
                              <div className="text-[9px] font-normal text-purple-600">(Wallet လျော့လွှဲ)</div>
                            )}
                          </div>
                        ) : (
                          <span className="text-slate-300">-</span>
                        )}
                      </td>

                      {/* Note Column */}
                      <td className="p-2.5 text-slate-500 whitespace-nowrap text-[11px]">
                        {item.note || '-'}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>

            {/* Total Footer Row */}
            <tfoot className="bg-slate-100 font-bold border-t-2 border-slate-300 text-slate-800 sticky bottom-0 z-20">
              <tr>
                <td colSpan={4} className="p-3 text-right border-r border-slate-300">
                  စုစုပေါင်း အရောင်းအဝယ် ပေါင်းနုတ်ရလဒ် (Net Impact):
                </td>

                {/* Cash Accounts Net Flow Totals */}
                {cashAccounts.map((c) => {
                  const sumDelta = sortedTransactions.reduce(
                    (sum, tx) => sum + getCashDeltaForTx(tx, c.name),
                    0
                  );
                  return (
                    <td
                      key={`total-cash-${c.id}`}
                      className={`p-3 text-right whitespace-nowrap border-r border-slate-200 ${
                        sumDelta >= 0 ? 'text-emerald-700' : 'text-red-600'
                      }`}
                    >
                      {sumDelta >= 0 ? `+${formatKs(sumDelta)}` : formatKs(sumDelta)}
                    </td>
                  );
                })}

                {/* Wallet Accounts Net Flow Totals */}
                {wallets.map((w) => {
                  const sumDelta = sortedTransactions.reduce(
                    (sum, tx) => sum + getWalletDeltaForTx(tx, w.name),
                    0
                  );
                  return (
                    <td
                      key={`total-wallet-${w.id}`}
                      className={`p-3 text-right whitespace-nowrap border-r border-slate-200 ${
                        sumDelta >= 0 ? 'text-indigo-700' : 'text-red-600'
                      }`}
                    >
                      {sumDelta >= 0 ? `+${formatKs(sumDelta)}` : formatKs(sumDelta)}
                    </td>
                  );
                })}

                {/* Total Commission */}
                <td className="p-3 text-right whitespace-nowrap text-amber-800 bg-amber-100/50 border-r border-slate-200">
                  +{formatKs(totalCommission)}
                </td>

                <td className="p-3 whitespace-nowrap text-indigo-900 text-[11px]">
                  စုစုပေါင်း လက်ကျန်: <b>{formatKs(grandTotalBalance)}</b>
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    </div>
  );
};
