import React, { useState, useEffect, useRef } from 'react';
import {
  Banknote,
  Wallet,
  Globe,
  TrendingUp,
  ArrowDownRight,
  ArrowUpRight,
  FileSpreadsheet,
  Download,
  Upload,
  Plus,
  Edit,
  ShieldCheck,
  Search,
  Calendar,
  History,
  RotateCcw,
  Printer,
  Sparkles,
} from 'lucide-react';
import { Transaction, WalletItem, BackupData, TransactionType } from './types';
import { getDeviceId, generateActivationKey, verifyActivationKey } from './utils/license';
import { getTodayFormatted, getCurrentTimeFormatted, formatKs, formatLakh } from './utils/formatters';
import { LicenseLockScreen } from './components/LicenseLockScreen';
import { TransactionModal } from './components/TransactionModal';
import { WalletModal } from './components/WalletModal';
import { CashEditModal } from './components/CashEditModal';
import { ReportModal } from './components/ReportModal';
import { TransactionReceiptModal } from './components/TransactionReceiptModal';

// Initial Sample Data
const INITIAL_WALLETS: WalletItem[] = [
  { id: 1, name: 'KPay', balance: 25000000, updatedDate: getTodayFormatted(), accountNumber: '09798001122' },
  { id: 2, name: 'WaveMoney', balance: 13800000, updatedDate: getTodayFormatted(), accountNumber: '09971234567' },
  { id: 3, name: 'CB Pay', balance: 10000000, updatedDate: '2026-08-18', accountNumber: '0012903829' },
];

const INITIAL_TRANSACTIONS: Transaction[] = [
  { id: 1, date: getTodayFormatted(), time: '09:30', customerName: 'ဦးမြတ်စိုး', type: 'သွင်း', amount: 1500000, commission: 5000, phone: '09123456789', walletName: 'KPay', accountType: 'Wallet', note: 'မိဘထံလွှဲ' },
  { id: 2, date: getTodayFormatted(), time: '11:15', customerName: 'ဒေါ်အေးအေး', type: 'ထုတ်', amount: 300000, commission: 3000, phone: '09987654321', walletName: 'WaveMoney', accountType: 'Wallet' },
  { id: 3, date: getTodayFormatted(), time: '13:00', customerName: 'ကိုအောင်', type: 'သွင်း', amount: 2000000, commission: 5000, phone: '09450001122', walletName: 'CB Pay', accountType: 'Wallet' },
  { id: 4, date: getTodayFormatted(), time: '14:20', customerName: 'ဦးထွန်း', type: 'ထုတ်', amount: 400000, commission: 2000, phone: '09223344556', walletName: 'Main Cash Box', accountType: 'Cash' },
  { id: 5, date: '2026-08-18', time: '16:45', customerName: 'မနန်း', type: 'ထုတ်', amount: 500000, commission: 4000, phone: '09771122334', walletName: 'KPay', accountType: 'Wallet' },
];

export default function App() {
  const todayStr = getTodayFormatted();

  // License State
  const [deviceId, setDeviceId] = useState<string>('');
  const [isActivated, setIsActivated] = useState<boolean>(false);

  // Core Data States with localStorage Persistence
  const [cashBalance, setCashBalance] = useState<number>(() => {
    const saved = localStorage.getItem('app_cash_balance');
    return saved !== null ? JSON.parse(saved) : 39400000;
  });

  const [cashUpdatedDate, setCashUpdatedDate] = useState<string>(() => {
    return localStorage.getItem('app_cash_updated_date') || todayStr;
  });

  const [wallets, setWallets] = useState<WalletItem[]>(() => {
    const saved = localStorage.getItem('app_wallets');
    return saved !== null ? JSON.parse(saved) : INITIAL_WALLETS;
  });

  const [transactions, setTransactions] = useState<Transaction[]>(() => {
    const saved = localStorage.getItem('app_transactions');
    return saved !== null ? JSON.parse(saved) : INITIAL_TRANSACTIONS;
  });

  // Modal Controls
  const [showTransactionModal, setShowTransactionModal] = useState<boolean>(false);
  const [transactionModalType, setTransactionModalType] = useState<TransactionType>('သွင်း');

  const [showWalletModal, setShowWalletModal] = useState<boolean>(false);
  const [showCashEditModal, setShowCashEditModal] = useState<boolean>(false);

  const [showCommissionReport, setShowCommissionReport] = useState<boolean>(false);
  const [showWalletReport, setShowWalletReport] = useState<boolean>(false);
  const [showCashReport, setShowCashReport] = useState<boolean>(false);
  const [showAllTransactionsModal, setShowAllTransactionsModal] = useState<boolean>(false);

  const [activeReceipt, setActiveReceipt] = useState<Transaction | null>(null);

  // Filter States
  const [selectedReportDate, setSelectedReportDate] = useState<string>(todayStr);
  const [selectedWalletFilter, setSelectedWalletFilter] = useState<string>('all');
  const [recentSearchQuery, setRecentSearchQuery] = useState<string>('');

  const fileInputRef = useRef<HTMLInputElement>(null);

  // License Verification Effect
  useEffect(() => {
    const id = getDeviceId();
    setDeviceId(id);

    const savedKey = localStorage.getItem('app_activation_key');
    if (savedKey && verifyActivationKey(id, savedKey)) {
      setIsActivated(true);
    }
  }, []);

  // Save to LocalStorage
  useEffect(() => {
    localStorage.setItem('app_cash_balance', JSON.stringify(cashBalance));
    localStorage.setItem('app_cash_updated_date', cashUpdatedDate);
    localStorage.setItem('app_wallets', JSON.stringify(wallets));
    localStorage.setItem('app_transactions', JSON.stringify(transactions));
  }, [cashBalance, cashUpdatedDate, wallets, transactions]);

  // Derived Calculations
  const totalWalletBalance = wallets.reduce((sum, w) => sum + w.balance, 0);
  const totalCapital = cashBalance + totalWalletBalance;

  // Today Statistics
  const getActualCash = (item: Transaction): number => {
    if (item.type === 'ထုတ်') {
      if (item.netPayout !== undefined) return item.netPayout;
      if (item.commissionMode === 'deduct') return Math.max(0, item.amount - item.commission);
      return item.amount;
    }
    return item.amount;
  };

  const todayTransactions = transactions.filter((t) => t.date === todayStr);
  const todayCommission = todayTransactions.reduce((sum, item) => sum + item.commission, 0);
  const todayIn = todayTransactions
    .filter((t) => t.type === 'သွင်း')
    .reduce((sum, item) => sum + getActualCash(item), 0);
  const todayOut = todayTransactions
    .filter((t) => t.type === 'ထုတ်')
    .reduce((sum, item) => sum + getActualCash(item), 0);

  // Filter Transactions for Reports
  const filterList = (accountTypeFilter?: 'Wallet' | 'Cash') => {
    return transactions.filter((t) => {
      const matchDate = selectedReportDate === 'ALL' ? true : t.date === selectedReportDate;
      const matchType = accountTypeFilter ? t.accountType === accountTypeFilter : true;
      const matchWallet =
        accountTypeFilter === 'Wallet' && selectedWalletFilter !== 'all'
          ? t.walletName === selectedWalletFilter
          : true;
      return matchDate && matchType && matchWallet;
    });
  };

  // Transaction Save Handler
  const handleSaveTransaction = (
    txData: Omit<Transaction, 'id'>,
    updateBalances: boolean
  ) => {
    const newTransaction: Transaction = {
      ...txData,
      id: Date.now(),
    };

    setTransactions([newTransaction, ...transactions]);

    if (updateBalances) {
      const isCashOut = txData.type === 'ထုတ်';
      const isCashBox = txData.walletName === 'Main Cash Box';

      if (isCashBox) {
        // Physical cash transaction
        setCashBalance((prev) =>
          isCashOut
            ? prev - txData.amount + txData.commission
            : prev + txData.amount + txData.commission
        );
        setCashUpdatedDate(txData.date);
      } else {
        // Mobile Wallet transaction (Agent updates both Wallet balance & Physical cash box)
        setWallets((prevWallets) =>
          prevWallets.map((w) => {
            if (w.name === txData.walletName) {
              const newBal = isCashOut
                ? w.balance + txData.amount
                : w.balance - txData.amount;
              return { ...w, balance: newBal, updatedDate: txData.date };
            }
            return w;
          })
        );

        // Adjust Cash Drawer:
        // Cash In: Customer gives cash + commission -> Cash increases
        // Cash Out: Agent gives customer cash - commission -> Cash decreases
        setCashBalance((prev) =>
          isCashOut
            ? prev - txData.amount + txData.commission
            : prev + txData.amount + txData.commission
        );
        setCashUpdatedDate(txData.date);
      }
    }

    setShowTransactionModal(false);
  };

  // Delete Transaction Handler
  const handleDeleteTransaction = (id: number) => {
    setTransactions(transactions.filter((t) => t.id !== id));
  };

  // Wallet Management Handlers
  const handleAddWallet = (newWallet: Omit<WalletItem, 'id'>) => {
    const item: WalletItem = {
      ...newWallet,
      id: Date.now(),
    };
    setWallets([...wallets, item]);
  };

  const handleUpdateWallet = (updated: WalletItem) => {
    setWallets(wallets.map((w) => (w.id === updated.id ? updated : w)));
  };

  const handleDeleteWallet = (id: number) => {
    setWallets(wallets.filter((w) => w.id !== id));
  };

  // Cash In Hand Save Handler
  const handleSaveCash = (newAmount: number, date: string) => {
    setCashBalance(newAmount);
    setCashUpdatedDate(date);
    setShowCashEditModal(false);
  };

  // Backup & Restore Handlers
  const handleBackup = () => {
    const backupData: BackupData = {
      cashBalance,
      cashUpdatedDate,
      wallets,
      transactions,
      exportedAt: new Date().toISOString(),
      version: '1.0.0',
    };
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(backupData, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', `money_agent_backup_${todayStr}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  const handleRestoreClick = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const fileReader = new FileReader();
    if (e.target.files && e.target.files[0]) {
      fileReader.readAsText(e.target.files[0], 'UTF-8');
      fileReader.onload = (event) => {
        try {
          const parsedData = JSON.parse(event.target?.result as string);
          if (parsedData.transactions && Array.isArray(parsedData.transactions)) {
            if (parsedData.cashBalance !== undefined) setCashBalance(parsedData.cashBalance);
            if (parsedData.cashUpdatedDate) setCashUpdatedDate(parsedData.cashUpdatedDate);
            if (parsedData.wallets && Array.isArray(parsedData.wallets)) setWallets(parsedData.wallets);
            setTransactions(parsedData.transactions);
            alert('✅ Backup Data ပြန်လည် ထည့်သွင်းပြီးပါပြီ။');
          } else {
            alert('❌ Backup Data ပုံစံ မမှန်ကန်ပါ။');
          }
        } catch (err) {
          alert('❌ Backup File ဖတ်ရှု၍ မရပါ (ဖိုင်မှားယွင်းနေပါသည်)။');
        }
      };
    }
  };

  // If not activated, render the License Lock Screen
  if (!isActivated) {
    return (
      <LicenseLockScreen
        deviceId={deviceId}
        onActivated={() => setIsActivated(true)}
      />
    );
  }

  // Filtered recent transactions on main screen
  const recentTransactions = transactions.filter((t) => {
    if (!recentSearchQuery.trim()) return true;
    const query = recentSearchQuery.toLowerCase();
    return (
      t.customerName.toLowerCase().includes(query) ||
      t.phone.toLowerCase().includes(query) ||
      t.walletName.toLowerCase().includes(query)
    );
  });

  return (
    <div className="min-h-screen bg-slate-100 text-slate-800 antialiased p-3 sm:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* TOP HEADER */}
        <header className="bg-white rounded-2xl p-5 shadow-xs border border-slate-200/80 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-indigo-600 to-indigo-500 text-white flex items-center justify-center shadow-md shadow-indigo-600/20">
              <Banknote className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
                📱 Money Agent POS
              </h1>
              <p className="text-xs text-slate-500 font-medium">
                ငွေလွှဲ / ငွေထုတ် စာရင်းကိုင်နှင့် လက်ကျန်ငွေ စီမံမှုစနစ်
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <div className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-full text-xs font-bold">
              <ShieldCheck className="w-4 h-4" />
              <span>Activated ({deviceId})</span>
            </div>

            <button
              onClick={() => {
                setSelectedReportDate(todayStr);
                setShowAllTransactionsModal(true);
              }}
              className="flex items-center gap-1.5 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-colors cursor-pointer"
            >
              <FileSpreadsheet className="w-4 h-4" />
              စာရင်းချုပ် အားလုံး
            </button>
          </div>
        </header>

        {/* TOP 4 STATS CARDS */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* CARD 1: CASH */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs hover:shadow-md transition-shadow relative group">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-bold text-slate-600 flex items-center gap-1">
                  💵 လက်ငင်းငွေသား (Cash)
                </span>
                <button
                  onClick={() => setShowCashEditModal(true)}
                  className="p-1 bg-slate-100 hover:bg-indigo-50 hover:text-indigo-600 rounded-md text-xs transition-colors cursor-pointer"
                  title="လက်ငင်းငွေသား ပြင်ဆင်ရန်"
                >
                  <Edit className="w-3.5 h-3.5" />
                </button>
              </div>
              <button
                onClick={() => {
                  setSelectedReportDate(todayStr);
                  setShowCashReport(true);
                }}
                className="text-xs text-blue-600 hover:text-blue-800 bg-blue-50 px-2 py-1 rounded-lg font-bold transition-colors cursor-pointer"
              >
                📊 အသေးစိတ်
              </button>
            </div>
            <h2 className="text-2xl font-black text-slate-900 tracking-tight">
              {formatKs(cashBalance)}
            </h2>
            <div className="mt-2 flex items-center justify-between text-xs text-slate-400">
              <span className="font-semibold text-slate-600">{formatLakh(cashBalance)}</span>
              <span>ပြင်ဆင်က်: {cashUpdatedDate}</span>
            </div>
          </div>

          {/* CARD 2: WALLETS */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-bold text-slate-600 flex items-center gap-1">
                  🏦 Wallet လက်ကျန်ပေါင်း
                </span>
                <button
                  onClick={() => setShowWalletModal(true)}
                  className="p-1 bg-slate-100 hover:bg-indigo-50 hover:text-indigo-600 rounded-md text-xs transition-colors cursor-pointer"
                  title="Wallet စာရင်း ထည့်သွင်း/ပြင်ဆင်ရန်"
                >
                  <Plus className="w-3.5 h-3.5" />
                </button>
              </div>
              <button
                onClick={() => {
                  setSelectedReportDate(todayStr);
                  setShowWalletReport(true);
                }}
                className="text-xs text-blue-600 hover:text-blue-800 bg-blue-50 px-2 py-1 rounded-lg font-bold transition-colors cursor-pointer"
              >
                📊 အသေးစိတ်
              </button>
            </div>
            <h2 className="text-2xl font-black text-slate-900 tracking-tight">
              {formatKs(totalWalletBalance)}
            </h2>
            <div className="mt-2 flex items-center justify-between text-xs text-slate-400">
              <span className="font-semibold text-slate-600">{formatLakh(totalWalletBalance)}</span>
              <span>{wallets.length} ခု</span>
            </div>
          </div>

          {/* CARD 3: TOTAL CAPITAL */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs border-l-4 border-l-indigo-600">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-bold text-slate-600">🌐 စုစုပေါင်း မတည်ငွေ</span>
              <span className="text-[11px] font-semibold bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded-full">
                Cash + Wallets
              </span>
            </div>
            <h2 className="text-2xl font-black text-indigo-900 tracking-tight">
              {formatKs(totalCapital)}
            </h2>
            <div className="mt-2 text-xs font-semibold text-slate-500">
              {formatLakh(totalCapital)}
            </div>
          </div>

          {/* CARD 4: TODAY COMMISSION */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs border-l-4 border-l-emerald-500">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-bold text-slate-600">📈 ယနေ့ ကော်မရှင်ဝင်ငွေ</span>
              <button
                onClick={() => {
                  setSelectedReportDate(todayStr);
                  setShowCommissionReport(true);
                }}
                className="text-xs text-emerald-700 hover:text-emerald-900 bg-emerald-50 px-2 py-1 rounded-lg font-bold transition-colors cursor-pointer"
              >
                📊 အသေးစိတ်
              </button>
            </div>
            <h2 className="text-2xl font-black text-emerald-600 tracking-tight">
              +{formatKs(todayCommission)}
            </h2>
            <div className="mt-2 text-xs text-slate-500 font-medium">
              ယနေ့ လုပ်ဆောင်ချက် {todayTransactions.length} ခု
            </div>
          </div>
        </div>

        {/* PRIMARY ACTION BUTTONS: CASH IN & CASH OUT */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <button
            onClick={() => {
              setTransactionModalType('သွင်း');
              setShowTransactionModal(true);
            }}
            className="p-5 bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-700 hover:to-emerald-600 active:scale-[0.99] text-white rounded-2xl font-bold shadow-lg shadow-emerald-600/20 transition-all flex items-center justify-center gap-3 cursor-pointer group"
          >
            <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center group-hover:scale-110 transition-transform">
              <ArrowDownRight className="w-6 h-6 text-white" />
            </div>
            <div className="text-left">
              <div className="text-lg">+ ငွေသွင်း (Cash In)</div>
              <div className="text-xs font-normal text-emerald-100">
                ဖောက်သည်ထံမှ ငွေလက်ခံပြီး လွှဲပေးခြင်း
              </div>
            </div>
          </button>

          <button
            onClick={() => {
              setTransactionModalType('ထုတ်');
              setShowTransactionModal(true);
            }}
            className="p-5 bg-gradient-to-r from-red-600 to-rose-500 hover:from-red-700 hover:to-rose-600 active:scale-[0.99] text-white rounded-2xl font-bold shadow-lg shadow-red-600/20 transition-all flex items-center justify-center gap-3 cursor-pointer group"
          >
            <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center group-hover:scale-110 transition-transform">
              <ArrowUpRight className="w-6 h-6 text-white" />
            </div>
            <div className="text-left">
              <div className="text-lg">- ငွေထုတ် (Cash Out)</div>
              <div className="text-xs font-normal text-rose-100">
                ဖောက်သည်ထံမှ Wallet လက်ခံပြီး ငွေသားထုတ်ပေးခြင်း
              </div>
            </div>
          </button>
        </div>

        {/* WALLET QUICK CARDS STRIP */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Wallet className="w-4 h-4 text-indigo-600" />
              <h3 className="text-sm font-bold text-slate-800">
                အသုံးပြုနေသော Wallet များ လက်ကျန်စာရင်း
              </h3>
            </div>
            <button
              onClick={() => setShowWalletModal(true)}
              className="text-xs text-indigo-600 hover:text-indigo-800 font-bold flex items-center gap-1 cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              Wallet အသစ်/ပြင်ဆင်ရန်
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {wallets.map((w) => (
              <div
                key={w.id}
                onClick={() => {
                  setSelectedWalletFilter(w.name);
                  setSelectedReportDate('ALL');
                  setShowWalletReport(true);
                }}
                className="p-4 bg-slate-50 hover:bg-indigo-50/40 border border-slate-200 hover:border-indigo-300 rounded-xl transition-all cursor-pointer"
              >
                <div className="flex items-center justify-between mb-1.5">
                  <span className="font-bold text-sm text-slate-900">{w.name}</span>
                  <span className="text-[11px] text-slate-400 font-mono">
                    {w.accountNumber || ''}
                  </span>
                </div>
                <div className="text-base font-bold text-indigo-600">
                  {formatKs(w.balance)}
                </div>
                <div className="text-[11px] text-slate-400 mt-1">
                  {(w.balance / 100000).toFixed(1)} သိန်း • ရက်စွဲ: {w.updatedDate}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* RECENT TRANSACTIONS TABLE */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <History className="w-4 h-4 text-slate-600" />
              <h3 className="text-sm font-bold text-slate-800">
                လတ်တလော အရောင်းအဝယ် မှတ်တမ်းများ ({recentTransactions.length})
              </h3>
            </div>

            <div className="flex items-center gap-2">
              <div className="relative w-48 sm:w-64">
                <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="ရှာဖွေရန်..."
                  value={recentSearchQuery}
                  onChange={(e) => setRecentSearchQuery(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-8 pr-3 py-1.5 text-xs text-slate-800 outline-none focus:border-indigo-400"
                />
              </div>
              <button
                onClick={() => {
                  setSelectedReportDate(todayStr);
                  setShowAllTransactionsModal(true);
                }}
                className="px-3 py-1.5 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 rounded-xl text-xs font-bold transition-colors cursor-pointer"
              >
                အားလုံးကြည့်ရန်
              </button>
            </div>
          </div>

          <div className="overflow-x-auto border border-slate-200/80 rounded-xl">
            <table className="w-full text-xs text-left border-collapse">
              <thead className="bg-slate-50 text-slate-700 font-bold border-b border-slate-200">
                <tr>
                  <th className="p-3">စဉ်</th>
                  <th className="p-3">နေ့စွဲ/အချိန်</th>
                  <th className="p-3">ဖောက်သည် အမည်</th>
                  <th className="p-3 text-center">အမျိုးအစား</th>
                  <th className="p-3 text-right">လက်ငင်းငွေ ပမာဏ (Ks)</th>
                  <th className="p-3 text-right">ကော်မရှင် (Ks)</th>
                  <th className="p-3">ဖုန်းနံပါတ်</th>
                  <th className="p-3">Wallet/Account</th>
                  <th className="p-3 text-center">ပြေစာ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {recentTransactions.slice(0, 8).map((item, index) => {
                  const isCashOut = item.type === 'ထုတ်';
                  const actualCash = getActualCash(item);
                  const isDeducted = isCashOut && item.commissionMode === 'deduct';
                  return (
                    <tr key={item.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="p-3 text-slate-500">{index + 1}</td>
                      <td className="p-3 text-slate-600 whitespace-nowrap">
                        <span className="font-semibold text-slate-800">{item.date}</span>
                        {item.time && (
                          <span className="ml-1 text-[10px] text-slate-400">({item.time})</span>
                        )}
                      </td>
                      <td className="p-3 font-bold text-slate-900 whitespace-nowrap">
                        {item.customerName}
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
                      {/* Actual cash given / received */}
                      <td
                        className={`p-3 text-right font-bold whitespace-nowrap ${
                          isCashOut ? 'text-red-600' : 'text-slate-900'
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
                        <button
                          onClick={() => setActiveReceipt(item)}
                          className="px-2 py-1 bg-slate-100 hover:bg-indigo-50 hover:text-indigo-600 text-slate-700 rounded-md text-xs font-semibold transition-colors cursor-pointer"
                        >
                          ဘောက်ချာ
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* BACKUP & RESTORE FOOTER CARD */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
          <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
            <div>
              <h4 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
                💾 Data စနစ် လုံခြုံရေးနှင့် Backup / Restore
              </h4>
              <p className="text-xs text-slate-400 mt-0.5">
                သင့်ဖုန်း သို့မဟုတ် ကွန်ပျူတာအတွင်း Data မပျောက်ပျက်စေရန် Backup ပုံမှန် ပြုလုပ်ထားနိုင်ပါသည်။
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={handleBackup}
                className="flex items-center gap-1.5 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-indigo-600/20 cursor-pointer"
              >
                <Download className="w-4 h-4" />
                📥 Backup ပြုလုပ်မည် (JSON ဒေါင်းလုဒ်)
              </button>
              <button
                onClick={handleRestoreClick}
                className="flex items-center gap-1.5 px-4 py-2.5 bg-sky-600 hover:bg-sky-700 text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-sky-600/20 cursor-pointer"
              >
                <Upload className="w-4 h-4" />
                📤 Restore ပြုလုပ်မည် (File တင်မည်)
              </button>
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileChange}
                accept=".json"
                className="hidden"
              />
            </div>
          </div>
        </div>
      </div>

      {/* ================= MODALS ================= */}

      {/* 1. Transaction Modal (Cash In / Cash Out) */}
      {showTransactionModal && (
        <TransactionModal
          initialType={transactionModalType}
          wallets={wallets}
          cashBalance={cashBalance}
          onClose={() => setShowTransactionModal(false)}
          onSave={handleSaveTransaction}
        />
      )}

      {/* 2. Wallet Management Modal */}
      {showWalletModal && (
        <WalletModal
          wallets={wallets}
          onClose={() => setShowWalletModal(false)}
          onAddWallet={handleAddWallet}
          onUpdateWallet={handleUpdateWallet}
          onDeleteWallet={handleDeleteWallet}
        />
      )}

      {/* 3. Cash In Hand Edit Modal */}
      {showCashEditModal && (
        <CashEditModal
          currentCash={cashBalance}
          currentDate={cashUpdatedDate}
          onClose={() => setShowCashEditModal(false)}
          onSave={handleSaveCash}
        />
      )}

      {/* 4. Wallet Report Modal */}
      {showWalletReport && (
        <ReportModal
          title="🏦 Wallet Transaction အသေးစိတ် Report"
          icon={<Wallet className="w-5 h-5" />}
          onClose={() => setShowWalletReport(false)}
          selectedReportDate={selectedReportDate}
          setSelectedReportDate={setSelectedReportDate}
          wallets={wallets}
          selectedWalletFilter={selectedWalletFilter}
          setSelectedWalletFilter={setSelectedWalletFilter}
          data={filterList('Wallet')}
          onDeleteTransaction={handleDeleteTransaction}
          onViewReceipt={(tx) => setActiveReceipt(tx)}
        />
      )}

      {/* 5. Cash Report Modal */}
      {showCashReport && (
        <ReportModal
          title="💵 လက်ငင်းငွေသား (Cash) Transaction Report"
          icon={<Banknote className="w-5 h-5" />}
          onClose={() => setShowCashReport(false)}
          selectedReportDate={selectedReportDate}
          setSelectedReportDate={setSelectedReportDate}
          data={filterList('Cash')}
          onDeleteTransaction={handleDeleteTransaction}
          onViewReceipt={(tx) => setActiveReceipt(tx)}
        />
      )}

      {/* 6. Commission Report Modal */}
      {showCommissionReport && (
        <ReportModal
          title="📈 ကော်မရှင်ဝင်ငွေ အသေးစိတ် Report"
          icon={<TrendingUp className="w-5 h-5" />}
          onClose={() => setShowCommissionReport(false)}
          selectedReportDate={selectedReportDate}
          setSelectedReportDate={setSelectedReportDate}
          data={filterList()}
          onDeleteTransaction={handleDeleteTransaction}
          onViewReceipt={(tx) => setActiveReceipt(tx)}
        />
      )}

      {/* 7. All Transactions Modal */}
      {showAllTransactionsModal && (
        <ReportModal
          title="📋 စာရင်းချုပ် အားလုံး (All Transactions Ledger)"
          icon={<FileSpreadsheet className="w-5 h-5" />}
          onClose={() => setShowAllTransactionsModal(false)}
          selectedReportDate={selectedReportDate}
          setSelectedReportDate={setSelectedReportDate}
          wallets={wallets}
          selectedWalletFilter={selectedWalletFilter}
          setSelectedWalletFilter={setSelectedWalletFilter}
          data={filterList()}
          onDeleteTransaction={handleDeleteTransaction}
          onViewReceipt={(tx) => setActiveReceipt(tx)}
        />
      )}

      {/* 8. Voucher Receipt View */}
      {activeReceipt && (
        <TransactionReceiptModal
          transaction={activeReceipt}
          onClose={() => setActiveReceipt(null)}
        />
      )}
    </div>
  );
}
