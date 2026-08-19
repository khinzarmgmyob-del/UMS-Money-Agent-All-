import React, { useState } from 'react';
import { X, Calendar, Search, Download, Printer, ArrowDownRight, ArrowUpRight, FileText, Trash2, Eye, Banknote, Wallet, Coins, TrendingUp } from 'lucide-react';
import { Transaction, WalletItem, CashAccountItem } from '../types';
import { getTodayFormatted, formatKs } from '../utils/formatters';

interface ReportModalProps {
  title: string;
  icon?: React.ReactNode;
  onClose: () => void;
  selectedReportDate: string;
  setSelectedReportDate: (date: string) => void;
  wallets?: WalletItem[];
  selectedWalletFilter?: string;
  setSelectedWalletFilter?: (w: string) => void;
  cashAccounts?: CashAccountItem[];
  selectedCashFilter?: string;
  setSelectedCashFilter?: (c: string) => void;
  data: Transaction[];
  onDeleteTransaction?: (id: number) => void;
  onViewReceipt?: (transaction: Transaction) => void;
}

// Helper to get actual cash amount handed out/in
export const getActualCashAmount = (item: Transaction): number => {
  if (item.type === 'ထုတ်') {
    if (item.netPayout !== undefined) return item.netPayout;
    if (item.commissionMode === 'deduct') return Math.max(0, item.amount - item.commission);
    return item.amount;
  }
  return item.amount;
};

// Helper to get Cash Commission vs Wallet Commission
export const getCommissionBreakdown = (item: Transaction): { cashComm: number; walletComm: number } => {
  if (item.commissionChannel === 'Cash') {
    return { cashComm: item.commission, walletComm: 0 };
  }
  if (item.commissionChannel === 'Wallet') {
    return { cashComm: 0, walletComm: item.commission };
  }
  // In Burmese money agent system:
  // If Cash Out with 'deduct' (မူလငွေမှ နုတ်ယူ): customer transferred full e-money, less cash was paid out, so commission remained in Wallet (Wallet Commission).
  // If Cash In or Cash Out with 'separate': customer handed cash commission to cash box (Cash Commission).
  if (item.type === 'ထုတ်' && item.commissionMode === 'deduct') {
    return { cashComm: 0, walletComm: item.commission };
  }
  return { cashComm: item.commission, walletComm: 0 };
};

export const ReportModal: React.FC<ReportModalProps> = ({
  title,
  icon,
  onClose,
  selectedReportDate,
  setSelectedReportDate,
  wallets,
  selectedWalletFilter = 'all',
  setSelectedWalletFilter,
  cashAccounts,
  selectedCashFilter = 'all',
  setSelectedCashFilter,
  data,
  onDeleteTransaction,
  onViewReceipt,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const todayStr = getTodayFormatted();

  // Filter with date, wallet filter, cash filter, and search query
  const filteredData = data.filter((item) => {
    // 1. Date Filter
    if (selectedReportDate !== 'ALL' && item.date !== selectedReportDate) {
      return false;
    }

    // 2. Wallet Filter (All / None / Specific)
    if (selectedWalletFilter === 'none') {
      // If user wants no wallet / cash-only transactions
      if (item.walletName && item.walletName !== 'None' && item.walletName !== '-') {
        // Exclude if wallet is present when none is selected
        return false;
      }
    } else if (selectedWalletFilter !== 'all') {
      if (item.walletName !== selectedWalletFilter) return false;
    }

    // 3. Cash Account Filter (All / None / Specific)
    if (selectedCashFilter === 'none') {
      // If user wants no cash account / wallet-only transactions
      if (item.cashAccountName && item.cashAccountName !== 'None' && item.cashAccountName !== '-') {
        return false;
      }
    } else if (selectedCashFilter !== 'all') {
      if (item.cashAccountName !== selectedCashFilter) return false;
    }

    // 4. Search Query Filter
    if (!searchQuery.trim()) return true;
    const query = searchQuery.toLowerCase();
    return (
      item.customerName.toLowerCase().includes(query) ||
      item.phone.toLowerCase().includes(query) ||
      item.walletName.toLowerCase().includes(query) ||
      (item.cashAccountName && item.cashAccountName.toLowerCase().includes(query)) ||
      (item.note && item.note.toLowerCase().includes(query))
    );
  });

  // Calculate actual cash flows
  const totalIn = filteredData
    .filter((t) => t.type === 'သွင်း')
    .reduce((sum, item) => sum + getActualCashAmount(item), 0);

  const totalOut = filteredData
    .filter((t) => t.type === 'ထုတ်')
    .reduce((sum, item) => sum + getActualCashAmount(item), 0);

  const netAmount = totalIn - totalOut;

  // Calculate Cash Commission vs Wallet Commission vs Total Commission
  const totalCashComm = filteredData.reduce((sum, item) => sum + getCommissionBreakdown(item).cashComm, 0);
  const totalWalletComm = filteredData.reduce((sum, item) => sum + getCommissionBreakdown(item).walletComm, 0);
  const grandTotalComm = totalCashComm + totalWalletComm;

  const handleExportCSV = () => {
    if (filteredData.length === 0) {
      alert('ဒေါင်းလုဒ်ဆွဲရန် ဒေတာ မရှိပါ။');
      return;
    }
    const headers = [
      'စဉ်,နေ့စွဲ,အချိန်,ဖောက်သည်အမည်,သွင်း/ထုတ်,လက်ငင်းပေး/ရငွေ(Ks),မူလလွှဲငွေ(Ks),လက်ငင်းကော်မရှင်(Ks),Walletကော်မရှင်(Ks),ကော်မရှင်စုစုပေါင်း(Ks),ကော်မရှင်ပုံစံ,ဖုန်း,Walletအကောင့်,ငွေသားအကောင့်,မှတ်ချက်'
    ];
    const rows = filteredData.map((d, index) => {
      const actualCash = getActualCashAmount(d);
      const { cashComm, walletComm } = getCommissionBreakdown(d);
      const isCashOut = d.type === 'ထုတ်';
      const commModeLabel = isCashOut
        ? d.commissionMode === 'deduct'
          ? 'မူလငွေမှ နုတ်ယူ (Wallet ကော်မရှင်)'
          : 'သက်သက်ပေး (ငွေသား ကော်မရှင်)'
        : 'ငွေသား ကော်မရှင်';

      return [
        index + 1,
        `"${d.date}"`,
        `"${d.time || '-'}"`,
        `"${d.customerName}"`,
        `"${d.type}"`,
        actualCash,
        d.amount,
        cashComm,
        walletComm,
        d.commission,
        `"${commModeLabel}"`,
        `"${d.phone}"`,
        `"${d.walletName}"`,
        `"${d.cashAccountName || '-'}"`,
        `"${d.note || '-'}"`,
      ].join(',');
    });

    const csvContent = "data:text/csv;charset=utf-8,\uFEFF" + [headers, ...rows].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `commission_report_${selectedReportDate}_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    link.remove();
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-6xl p-5 sm:p-6 border border-slate-100 my-auto animate-in fade-in zoom-in-95 duration-150 max-h-[95vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-4 shrink-0">
          <div className="flex items-center gap-2.5">
            {icon ? (
              <div className="p-2.5 bg-indigo-50 text-indigo-600 rounded-xl">{icon}</div>
            ) : (
              <div className="p-2.5 bg-indigo-50 text-indigo-600 rounded-xl">
                <TrendingUp className="w-5 h-5" />
              </div>
            )}
            <div>
              <h3 className="text-lg font-bold text-slate-800">{title}</h3>
              <p className="text-xs text-slate-400">
                ရွေးချယ်ထားသော စာရင်းပေါင်း: <span className="font-bold text-slate-700">{filteredData.length}</span> ခု
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleExportCSV}
              className="flex items-center gap-1 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold transition-colors cursor-pointer"
              title="CSV ဖိုင်အဖြစ် ဒေါင်းလုဒ်ယူမည်"
            >
              <Download className="w-3.5 h-3.5" />
              CSV ဒေါင်းလုဒ်
            </button>
            <button
              onClick={handlePrint}
              className="flex items-center gap-1 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold transition-colors cursor-pointer"
              title="စာရင်းထုတ် ပရင့်ထုတ်မည်"
            >
              <Printer className="w-3.5 h-3.5" />
              Print
            </button>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 flex items-center justify-center transition-colors ml-1 cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Filter Controls Bar with Date, Wallet & Cash Account (Including 'None' and 'All') */}
        <div className="flex flex-wrap items-center gap-2.5 mb-4 p-3 bg-slate-50 border border-slate-200/80 rounded-xl shrink-0">
          {/* Date Picker */}
          <div className="flex items-center gap-1.5">
            <Calendar className="w-4 h-4 text-slate-500" />
            <input
              type="date"
              value={selectedReportDate === 'ALL' ? todayStr : selectedReportDate}
              onChange={(e) => setSelectedReportDate(e.target.value)}
              className="bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs font-bold text-slate-800 outline-none"
            />
          </div>

          {/* Quick Date Buttons */}
          <button
            onClick={() => setSelectedReportDate(todayStr)}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              selectedReportDate === todayStr
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-100'
            }`}
          >
            ယနေ့ (Today)
          </button>

          <button
            onClick={() => setSelectedReportDate('ALL')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              selectedReportDate === 'ALL'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-100'
            }`}
          >
            ရက်စွဲ အားလုံး (All)
          </button>

          {/* Wallet Filter (Supports All, None, and Individual Wallets) */}
          {wallets && setSelectedWalletFilter && (
            <div className="flex items-center gap-1.5 bg-white px-2 py-1 border border-slate-200 rounded-lg">
              <Wallet className="w-3.5 h-3.5 text-indigo-600" />
              <span className="text-xs font-bold text-slate-600">Wallet:</span>
              <select
                value={selectedWalletFilter}
                onChange={(e) => setSelectedWalletFilter(e.target.value)}
                className="bg-transparent text-xs font-semibold text-slate-800 outline-none cursor-pointer"
              >
                <option value="all">အားလုံး (All Wallets)</option>
                <option value="none">မရွေးပါ (None - ငွေသားချည်း)</option>
                {wallets.map((w) => (
                  <option key={w.id} value={w.name}>
                    {w.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Cash Account Filter (Supports All, None, and Individual Cash Accounts) */}
          {cashAccounts && setSelectedCashFilter && (
            <div className="flex items-center gap-1.5 bg-white px-2 py-1 border border-slate-200 rounded-lg">
              <Banknote className="w-3.5 h-3.5 text-emerald-600" />
              <span className="text-xs font-bold text-slate-600">ငွေသား:</span>
              <select
                value={selectedCashFilter}
                onChange={(e) => setSelectedCashFilter(e.target.value)}
                className="bg-transparent text-xs font-semibold text-slate-800 outline-none cursor-pointer"
              >
                <option value="all">အားလုံး (All Cash)</option>
                <option value="none">မရွေးပါ (None - Wallet ချည်း)</option>
                {cashAccounts.map((c) => (
                  <option key={c.id} value={c.name}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Search Box */}
          <div className="relative flex-1 min-w-[160px]">
            <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="ရှာဖွေရန် (အမည်၊ ဖုန်း၊ အကောင့်)..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-white border border-slate-300 rounded-lg pl-8 pr-3 py-1.5 text-xs text-slate-800 placeholder:text-slate-400 outline-none"
            />
          </div>
        </div>

        {/* 6 TOP SUMMARY CHIPS (Cash In, Cash Out, Net Flow, Cash Comm, Wallet Comm, Total Comm) */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 mb-4 shrink-0">
          {/* Chip 1: Total Cash In */}
          <div className="p-2.5 bg-emerald-50/80 border border-emerald-200 rounded-xl">
            <span className="text-[10px] font-bold text-emerald-800 uppercase block mb-0.5">
              စုစုပေါင်း ငွေသွင်း (In)
            </span>
            <div className="text-xs sm:text-sm font-black text-emerald-700 truncate">
              +{formatKs(totalIn)}
            </div>
          </div>

          {/* Chip 2: Total Cash Out */}
          <div className="p-2.5 bg-red-50/80 border border-red-200 rounded-xl">
            <span className="text-[10px] font-bold text-red-800 uppercase block mb-0.5">
              စုစုပေါင်း ငွေထုတ် (Out)
            </span>
            <div className="text-xs sm:text-sm font-black text-red-700 truncate">
              -{formatKs(totalOut)}
            </div>
          </div>

          {/* Chip 3: Net Cash Flow */}
          <div className="p-2.5 bg-blue-50/80 border border-blue-200 rounded-xl">
            <span className="text-[10px] font-bold text-blue-800 uppercase block mb-0.5">
              Net Cash Flow (သွင်း - ထုတ်)
            </span>
            <div
              className={`text-xs sm:text-sm font-black truncate ${
                netAmount >= 0 ? 'text-blue-700' : 'text-amber-700'
              }`}
            >
              {netAmount >= 0 ? `+${formatKs(netAmount)}` : `-${formatKs(Math.abs(netAmount))}`}
            </div>
          </div>

          {/* Chip 4: Cash Commission (ကော်မရှင် ငွေသား) */}
          <div className="p-2.5 bg-amber-50/80 border border-amber-200 rounded-xl">
            <span className="text-[10px] font-bold text-amber-800 uppercase block mb-0.5 flex items-center gap-1">
              💵 ကော်မရှင် ငွေသား
            </span>
            <div className="text-xs sm:text-sm font-black text-amber-800 truncate">
              +{formatKs(totalCashComm)}
            </div>
          </div>

          {/* Chip 5: Wallet Commission (ကော်မရှင် Wallet) */}
          <div className="p-2.5 bg-purple-50/80 border border-purple-200 rounded-xl">
            <span className="text-[10px] font-bold text-purple-800 uppercase block mb-0.5 flex items-center gap-1">
              📱 ကော်မရှင် Wallet
            </span>
            <div className="text-xs sm:text-sm font-black text-purple-800 truncate">
              +{formatKs(totalWalletComm)}
            </div>
          </div>

          {/* Chip 6: Total Overall Commission (ကော်မရှင်ခ စုစုပေါင်း = Cash + Wallet) */}
          <div className="p-2.5 bg-indigo-50/90 border border-indigo-300 rounded-xl shadow-xs">
            <span className="text-[10px] font-bold text-indigo-900 uppercase block mb-0.5 flex items-center gap-1">
              📈 ကော်မရှင်ခ စုစုပေါင်း
            </span>
            <div className="text-xs sm:text-sm font-black text-indigo-700 truncate">
              +{formatKs(grandTotalComm)}
            </div>
          </div>
        </div>

        {/* Transactions Table with Separate Cash Commission & Wallet Commission Columns */}
        <div className="overflow-y-auto flex-1 border border-slate-200 rounded-xl">
          <table className="w-full text-xs text-left border-collapse">
            <thead className="bg-slate-100 sticky top-0 z-10 text-slate-700 font-bold border-b border-slate-200">
              <tr>
                <th className="p-3 whitespace-nowrap">စဉ်</th>
                <th className="p-3 whitespace-nowrap">နေ့စွဲ/အချိန်</th>
                <th className="p-3 whitespace-nowrap">ဖောက်သည် အမည်</th>
                <th className="p-3 text-center whitespace-nowrap">အမျိုးအစား</th>
                <th className="p-3 text-right whitespace-nowrap">လက်ငင်းငွေ (Ks)</th>
                <th className="p-3 text-right whitespace-nowrap">မူလလွှဲငွေ (Ks)</th>
                {/* 2 COMMISSION COLUMNS: CASH COMMISSION & WALLET COMMISSION */}
                <th className="p-3 text-right whitespace-nowrap bg-amber-50/60 text-amber-900">
                  💵 ငွေသားကော်မရှင် (Ks)
                </th>
                <th className="p-3 text-right whitespace-nowrap bg-purple-50/60 text-purple-900">
                  📱 Walletကော်မရှင် (Ks)
                </th>
                <th className="p-3 whitespace-nowrap">ဖုန်းနံပါတ်</th>
                <th className="p-3 whitespace-nowrap">Wallet အကောင့်</th>
                <th className="p-3 whitespace-nowrap">ငွေသားအကောင့်</th>
                <th className="p-3 text-center whitespace-nowrap">လုပ်ဆောင်ချက်</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {filteredData.length === 0 ? (
                <tr>
                  <td colSpan={12} className="p-8 text-center text-slate-400 font-medium">
                    ရွေးချယ်ထားသော စံနှုန်းများနှင့် ကိုက်ညီသော ဒေတာ မရှိပါ။
                  </td>
                </tr>
              ) : (
                filteredData.map((item, index) => {
                  const isCashOut = item.type === 'ထုတ်';
                  const actualCash = getActualCashAmount(item);
                  const { cashComm, walletComm } = getCommissionBreakdown(item);
                  const isDeducted = isCashOut && item.commissionMode === 'deduct';

                  return (
                    <tr key={item.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="p-3 text-slate-500 font-medium">{index + 1}</td>
                      <td className="p-3 text-slate-600 whitespace-nowrap">
                        <div className="font-semibold text-slate-800">{item.date}</div>
                        {item.time && <div className="text-[10px] text-slate-400">{item.time}</div>}
                      </td>
                      <td className="p-3 font-bold text-slate-800 whitespace-nowrap">
                        {item.customerName}
                        {item.note && (
                          <div className="text-[10px] font-normal text-slate-400">{item.note}</div>
                        )}
                      </td>
                      <td className="p-3 text-center whitespace-nowrap">
                        <span
                          className={`inline-flex items-center gap-0.5 px-2 py-0.5 rounded-md text-[11px] font-bold ${
                            isCashOut
                              ? 'bg-red-50 text-red-700 border border-red-200'
                              : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          }`}
                        >
                          {isCashOut ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                          {item.type}
                        </span>
                      </td>

                      {/* Actual Cash Amount */}
                      <td
                        className={`p-3 text-right font-bold whitespace-nowrap ${
                          isCashOut ? 'text-red-600' : 'text-slate-800'
                        }`}
                      >
                        <div>
                          {isCashOut ? `- ${actualCash.toLocaleString()}` : actualCash.toLocaleString()} Ks
                        </div>
                      </td>

                      {/* Original Transfer Amount */}
                      <td className="p-3 text-right font-semibold text-slate-700 whitespace-nowrap">
                        {item.amount.toLocaleString()} Ks
                      </td>

                      {/* Cash Commission Column */}
                      <td className="p-3 text-right font-bold whitespace-nowrap bg-amber-50/30 text-amber-800">
                        {cashComm > 0 ? (
                          <span>+{cashComm.toLocaleString()} Ks</span>
                        ) : (
                          <span className="text-slate-300">-</span>
                        )}
                      </td>

                      {/* Wallet Commission Column */}
                      <td className="p-3 text-right font-bold whitespace-nowrap bg-purple-50/30 text-purple-800">
                        {walletComm > 0 ? (
                          <div>
                            <span>+{walletComm.toLocaleString()} Ks</span>
                            <div className="text-[10px] font-normal text-purple-500">(လျော့လွှဲ/နုတ်ယူ)</div>
                          </div>
                        ) : (
                          <span className="text-slate-300">-</span>
                        )}
                      </td>

                      <td className="p-3 text-slate-600 font-mono whitespace-nowrap">{item.phone}</td>

                      <td className="p-3 text-slate-700 whitespace-nowrap">
                        <span className="px-2 py-0.5 bg-indigo-50 text-indigo-700 rounded font-semibold text-[11px]">
                          {item.walletName}
                        </span>
                      </td>

                      <td className="p-3 text-slate-700 whitespace-nowrap">
                        <span className="px-2 py-0.5 bg-emerald-50 text-emerald-700 rounded font-semibold text-[11px]">
                          {item.cashAccountName || 'ဆိုင်ရှေ့ငွေပုံး'}
                        </span>
                      </td>

                      <td className="p-3 text-center whitespace-nowrap">
                        <div className="flex items-center justify-center gap-1">
                          {onViewReceipt && (
                            <button
                              onClick={() => onViewReceipt(item)}
                              className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                              title="ဘောက်ချာ ကြည့်မည်"
                            >
                              <Eye className="w-3.5 h-3.5" />
                            </button>
                          )}
                          {onDeleteTransaction && (
                            <button
                              onClick={() => {
                                if (confirm(`ဖောက်သည် '${item.customerName}' ၏ စာရင်းကို ဖျက်ရန် သေချာပါသလား?`)) {
                                  onDeleteTransaction(item.id);
                                }
                              }}
                              className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                              title="စာရင်းဖျက်မည်"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>

            {/* Total Footer Row with Complete Commission Totals */}
            {filteredData.length > 0 && (
              <tfoot className="bg-slate-100 font-bold border-t-2 border-slate-300 text-slate-800 sticky bottom-0">
                <tr>
                  <td colSpan={4} className="p-3 text-right">
                    စုစုပေါင်း Total:
                  </td>
                  <td
                    className={`p-3 text-right whitespace-nowrap ${
                      netAmount >= 0 ? 'text-indigo-700' : 'text-red-600'
                    }`}
                  >
                    {netAmount >= 0 ? `+${formatKs(netAmount)}` : `-${formatKs(Math.abs(netAmount))}`}
                  </td>
                  <td className="p-3 text-right whitespace-nowrap text-slate-600">
                    -
                  </td>
                  <td className="p-3 text-right whitespace-nowrap text-amber-800 bg-amber-100/40">
                    +{formatKs(totalCashComm)}
                  </td>
                  <td className="p-3 text-right whitespace-nowrap text-purple-800 bg-purple-100/40">
                    +{formatKs(totalWalletComm)}
                  </td>
                  <td colSpan={4} className="p-3 whitespace-nowrap text-indigo-900">
                    👉 စုစုပေါင်း ကော်မရှင်: <b>+{formatKs(grandTotalComm)}</b>
                  </td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>
    </div>
  );
};
