import React, { useState } from 'react';
import { X, Calendar, Search, Download, Printer, ArrowDownRight, ArrowUpRight, FileText, Trash2, Eye } from 'lucide-react';
import { Transaction, WalletItem } from '../types';
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

export const ReportModal: React.FC<ReportModalProps> = ({
  title,
  icon,
  onClose,
  selectedReportDate,
  setSelectedReportDate,
  wallets,
  selectedWalletFilter,
  setSelectedWalletFilter,
  data,
  onDeleteTransaction,
  onViewReceipt,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const todayStr = getTodayFormatted();

  // Filter with search query
  const filteredData = data.filter((item) => {
    if (!searchQuery.trim()) return true;
    const query = searchQuery.toLowerCase();
    return (
      item.customerName.toLowerCase().includes(query) ||
      item.phone.toLowerCase().includes(query) ||
      item.walletName.toLowerCase().includes(query) ||
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
  const totalComm = filteredData.reduce((sum, item) => sum + item.commission, 0);

  const handleExportCSV = () => {
    if (filteredData.length === 0) {
      alert('ဒေါင်းလုဒ်ဆွဲရန် ဒေတာ မရှိပါ။');
      return;
    }
    const headers = ['စဉ်,နေ့စွဲ,အချိန်,ဖောက်သည်အမည်,သွင်း/ထုတ်,လက်ငင်းပေး/ရငွေ(Ks),မူလလွှဲငွေ(Ks),ကော်မရှင်(Ks),ကော်မရှင်ပုံစံ,ဖုန်း,Wallet/Account,မှတ်ချက်'];
    const rows = filteredData.map((d, index) => {
      const actualCash = getActualCashAmount(d);
      const isCashOut = d.type === 'ထုတ်';
      const commModeLabel = isCashOut
        ? d.commissionMode === 'deduct'
          ? 'မူလငွေမှ နုတ်ယူ'
          : 'သက်သက်ပေး'
        : '-';
      return [
        index + 1,
        `"${d.date}"`,
        `"${d.time || '-'}"`,
        `"${d.customerName}"`,
        `"${d.type}"`,
        actualCash,
        d.amount,
        d.commission,
        `"${commModeLabel}"`,
        `"${d.phone}"`,
        `"${d.walletName}"`,
        `"${d.note || '-'}"`,
      ].join(',');
    });

    const csvContent = "data:text/csv;charset=utf-8,\uFEFF" + [headers, ...rows].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `report_${selectedReportDate}_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    link.remove();
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-5xl p-5 sm:p-6 border border-slate-100 my-auto animate-in fade-in zoom-in-95 duration-150 max-h-[94vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-4 shrink-0">
          <div className="flex items-center gap-2.5">
            {icon && <div className="p-2 bg-indigo-50 text-indigo-600 rounded-xl">{icon}</div>}
            <div>
              <h3 className="text-lg font-bold text-slate-800">{title}</h3>
              <p className="text-xs text-slate-400">
                ရွေးချယ်ထားသော စာရင်းပေါင်း: {filteredData.length} ခု
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
              CSV
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

        {/* Filter Controls Bar */}
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

          {/* Wallet Filter */}
          {wallets && setSelectedWalletFilter && (
            <div className="flex items-center gap-1 sm:ml-auto">
              <span className="text-xs font-bold text-slate-600">Wallet:</span>
              <select
                value={selectedWalletFilter}
                onChange={(e) => setSelectedWalletFilter(e.target.value)}
                className="bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-slate-800 outline-none cursor-pointer"
              >
                <option value="all">Wallet အားလုံး</option>
                {wallets.map((w) => (
                  <option key={w.id} value={w.name}>
                    {w.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Search Box */}
          <div className="relative flex-1 min-w-[180px]">
            <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="ရှာဖွေရန် (အမည်၊ ဖုန်း၊ မှတ်ချက်)..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-white border border-slate-300 rounded-lg pl-8 pr-3 py-1.5 text-xs text-slate-800 placeholder:text-slate-400 outline-none"
            />
          </div>
        </div>

        {/* Summary Metric Chips */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-4 shrink-0">
          <div className="p-3 bg-emerald-50/70 border border-emerald-100 rounded-xl">
            <span className="text-[11px] font-bold text-emerald-800 uppercase block mb-0.5">
              စုစုပေါင်း ငွေသွင်း (In)
            </span>
            <div className="text-sm sm:text-base font-bold text-emerald-700">
              +{formatKs(totalIn)}
            </div>
          </div>
          <div className="p-3 bg-red-50/70 border border-red-100 rounded-xl">
            <span className="text-[11px] font-bold text-red-800 uppercase block mb-0.5">
              စုစုပေါင်း လက်ငင်းငွေထုတ် (Out)
            </span>
            <div className="text-sm sm:text-base font-bold text-red-700">
              -{formatKs(totalOut)}
            </div>
          </div>
          <div className="p-3 bg-blue-50/70 border border-blue-100 rounded-xl">
            <span className="text-[11px] font-bold text-blue-800 uppercase block mb-0.5">
              Net Cash Flow (သွင်း - ထုတ်)
            </span>
            <div
              className={`text-sm sm:text-base font-bold ${
                netAmount >= 0 ? 'text-blue-700' : 'text-amber-700'
              }`}
            >
              {netAmount >= 0 ? `+${formatKs(netAmount)}` : `-${formatKs(Math.abs(netAmount))}`}
            </div>
          </div>
          <div className="p-3 bg-indigo-50/70 border border-indigo-100 rounded-xl">
            <span className="text-[11px] font-bold text-indigo-800 uppercase block mb-0.5">
              ကော်မရှင်ဝင်ငွေ စုစုပေါင်း
            </span>
            <div className="text-sm sm:text-base font-bold text-indigo-700">
              +{formatKs(totalComm)}
            </div>
          </div>
        </div>

        {/* Transactions Table */}
        <div className="overflow-y-auto flex-1 border border-slate-200 rounded-xl">
          <table className="w-full text-xs text-left border-collapse">
            <thead className="bg-slate-100 sticky top-0 z-10 text-slate-700 font-bold border-b border-slate-200">
              <tr>
                <th className="p-3">စဉ်</th>
                <th className="p-3">နေ့စွဲ/အချိန်</th>
                <th className="p-3">ဖောက်သည် အမည်</th>
                <th className="p-3 text-center">အမျိုးအစား</th>
                <th className="p-3 text-right">လက်ငင်းငွေ ပမာဏ (Ks)</th>
                <th className="p-3 text-right">ကော်မရှင် (Ks)</th>
                <th className="p-3">ဖုန်းနံပါတ်</th>
                <th className="p-3">Wallet / အကောင့်</th>
                <th className="p-3 text-center">လုပ်ဆောင်ချက်</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {filteredData.length === 0 ? (
                <tr>
                  <td colSpan={9} className="p-8 text-center text-slate-400 font-medium">
                    ရွေးချယ်ထားသော စံနှုန်းများနှင့် ကိုက်ညီသော ဒေတာ မရှိပါ။
                  </td>
                </tr>
              ) : (
                filteredData.map((item, index) => {
                  const isCashOut = item.type === 'ထုတ်';
                  const actualCash = getActualCashAmount(item);
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
                      <td className="p-3 text-center">
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
                      {/* ACTUAL CASH AMOUNT COLUMN */}
                      <td
                        className={`p-3 text-right font-bold whitespace-nowrap ${
                          isCashOut ? 'text-red-600' : 'text-slate-800'
                        }`}
                      >
                        <div>
                          {isCashOut ? `- ${actualCash.toLocaleString()}` : actualCash.toLocaleString()} Ks
                        </div>
                        {isDeducted && (
                          <div className="text-[10px] font-normal text-slate-400">
                            (မူလလွှဲငွေ: {item.amount.toLocaleString()} Ks)
                          </div>
                        )}
                      </td>
                      <td className="p-3 text-right text-emerald-600 font-bold whitespace-nowrap">
                        +{item.commission.toLocaleString()} Ks
                        {isCashOut && (
                          <div className="text-[10px] font-normal text-slate-400">
                            {isDeducted ? '(မူလငွေမှ နုတ်ယူ)' : '(သီးသန့်ပေး)'}
                          </div>
                        )}
                      </td>
                      <td className="p-3 text-slate-600 font-mono">{item.phone}</td>
                      <td className="p-3 text-slate-700 whitespace-nowrap">
                        <span className="px-2 py-0.5 bg-slate-100 rounded text-slate-700 font-semibold text-[11px]">
                          {item.walletName}
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
            {filteredData.length > 0 && (
              <tfoot className="bg-slate-100 font-bold border-t-2 border-slate-300 text-slate-800">
                <tr>
                  <td colSpan={4} className="p-3 text-right">
                    စုစုပေါင်း လက်ငင်းငွေစီးဆင်းမှု (Net Cash Flow):
                  </td>
                  <td
                    className={`p-3 text-right ${
                      netAmount >= 0 ? 'text-indigo-700' : 'text-red-600'
                    }`}
                  >
                    {netAmount >= 0 ? `+${formatKs(netAmount)}` : `-${formatKs(Math.abs(netAmount))}`}
                  </td>
                  <td className="p-3 text-right text-emerald-700">
                    +{formatKs(totalComm)}
                  </td>
                  <td colSpan={3} className="p-3"></td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>
    </div>
  );
};
