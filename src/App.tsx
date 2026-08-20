import React, { useState, useEffect, useRef } from 'react';
import {
  Banknote,
  Wallet,
  Globe,
  TrendingUp,
  ArrowDownRight,
  ArrowUpRight,
  ArrowLeftRight,
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
  Store,
  Settings,
  Coins,
  LayoutGrid,
  Table as TableIcon,
  Filter,
  Share2,
  AlertCircle,
  CheckCircle2,
  Info,
  Loader2,
  X,
  Archive,
} from 'lucide-react';
import { Transaction, WalletItem, CashAccountItem, BackupData, TransactionType, ShopProfile } from './types';
import { getDeviceId, generateActivationKey, verifyActivationKey } from './utils/license';
import { getTodayFormatted, getCurrentTimeFormatted, formatKs, formatLakh } from './utils/formatters';
import { exportBackupData, readBackupFromFile } from './utils/backupManager';
import { LicenseLockScreen } from './components/LicenseLockScreen';
import { TransactionModal } from './components/TransactionModal';
import { WalletModal } from './components/WalletModal';
import { CashEditModal } from './components/CashEditModal';
import { ReportModal, getCommissionBreakdown } from './components/ReportModal';
import { TransactionReceiptModal } from './components/TransactionReceiptModal';
import { ShopProfileModal } from './components/ShopProfileModal';
import { TotalAccountsReportModal } from './components/TotalAccountsReportModal';
import { RestoreConfirmModal } from './components/RestoreConfirmModal';
import { ArchiveMaintenanceModal } from './components/ArchiveMaintenanceModal';

// Initial Clean Cash Accounts (0 Balance)
const INITIAL_CASH_ACCOUNTS: CashAccountItem[] = [
  { id: 1, name: 'ဆိုင်ရှေ့ငွေပုံး (Counter Box)', balance: 0, updatedDate: getTodayFormatted(), note: 'ကောင်တာ ၁' },
  { id: 2, name: 'ကာတာငွေသေတ္တာ (Safe Box)', balance: 0, updatedDate: getTodayFormatted(), note: 'အနောက်ခန်း' },
  { id: 3, name: 'အရန်ငွေသေတ္တာ (Backup Cash)', balance: 0, updatedDate: getTodayFormatted(), note: 'အရန်' },
];

// Initial Clean Wallets (0 Balance)
const INITIAL_WALLETS: WalletItem[] = [
  { id: 1, name: 'KPay', balance: 0, updatedDate: getTodayFormatted(), accountNumber: '09798001122' },
  { id: 2, name: 'WaveMoney', balance: 0, updatedDate: getTodayFormatted(), accountNumber: '09971234567' },
  { id: 3, name: 'CB Pay', balance: 0, updatedDate: getTodayFormatted(), accountNumber: '0012903829' },
];

const INITIAL_TRANSACTIONS: Transaction[] = [];

export default function App() {
  const todayStr = getTodayFormatted();

  // License State
  const [deviceId, setDeviceId] = useState<string>('');
  const [isActivated, setIsActivated] = useState<boolean>(false);

  // Shop Profile State
  const [shopProfile, setShopProfile] = useState<ShopProfile>(() => {
    const saved = localStorage.getItem('app_shop_profile');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        return { shopName: 'Money Agent POS', address: '', phone: '' };
      }
    }
    return { shopName: 'Money Agent POS', address: '', phone: '' };
  });

  // Cash Accounts State (Multiple Cash Drawers / Boxes)
  const [cashAccounts, setCashAccounts] = useState<CashAccountItem[]>(() => {
    const saved = localStorage.getItem('app_cash_accounts');
    if (saved !== null) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        return INITIAL_CASH_ACCOUNTS;
      }
    }
    // Fallback migration if single cash balance was stored previously
    const legacyCash = localStorage.getItem('app_cash_balance');
    if (legacyCash !== null) {
      const parsedVal = JSON.parse(legacyCash);
      return [
        { id: 1, name: 'ဆိုင်ရှေ့ငွေပုံး (Counter Box)', balance: parsedVal, updatedDate: todayStr, note: 'ကောင်တာ ၁' },
      ];
    }
    return INITIAL_CASH_ACCOUNTS;
  });

  // Wallets State
  const [wallets, setWallets] = useState<WalletItem[]>(() => {
    const saved = localStorage.getItem('app_wallets');
    return saved !== null ? JSON.parse(saved) : INITIAL_WALLETS;
  });

  // Transactions State
  const [transactions, setTransactions] = useState<Transaction[]>(() => {
    const saved = localStorage.getItem('app_transactions');
    return saved !== null ? JSON.parse(saved) : INITIAL_TRANSACTIONS;
  });

  // Modal Controls
  const [showTransactionModal, setShowTransactionModal] = useState<boolean>(false);
  const [transactionModalType, setTransactionModalType] = useState<TransactionType>('သွင်း');

  const [showWalletModal, setShowWalletModal] = useState<boolean>(false);
  const [showCashEditModal, setShowCashEditModal] = useState<boolean>(false);
  const [showShopProfileModal, setShowShopProfileModal] = useState<boolean>(false);

  const [showCommissionReport, setShowCommissionReport] = useState<boolean>(false);
  const [showWalletReport, setShowWalletReport] = useState<boolean>(false);
  const [showCashReport, setShowCashReport] = useState<boolean>(false);
  const [showAllTransactionsModal, setShowAllTransactionsModal] = useState<boolean>(false);
  const [showTotalAccountsReport, setShowTotalAccountsReport] = useState<boolean>(false);
  const [showArchiveModal, setShowArchiveModal] = useState<boolean>(false);

  const [activeReceipt, setActiveReceipt] = useState<Transaction | null>(null);

  // Backup & Restore & Toast States
  const [isExporting, setIsExporting] = useState<boolean>(false);
  const [pendingRestoreData, setPendingRestoreData] = useState<BackupData | null>(null);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);

  const showToast = (message: string, type: 'success' | 'error' | 'info' = 'info') => {
    setToast({ message, type });
  };

  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 4500);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  // Modal Filter States
  const [selectedReportDate, setSelectedReportDate] = useState<string>(todayStr);
  const [selectedWalletFilter, setSelectedWalletFilter] = useState<string>('all');
  const [selectedCashFilter, setSelectedCashFilter] = useState<string>('all');

  // Main Dashboard Filter States
  const [mainDateFilter, setMainDateFilter] = useState<string>('ALL');
  const [mainWalletFilter, setMainWalletFilter] = useState<string>('all');
  const [mainCashFilter, setMainCashFilter] = useState<string>('all');
  const [mainTypeFilter, setMainTypeFilter] = useState<string>('all');
  const [mainSearchQuery, setMainSearchQuery] = useState<string>('');
  const [mainViewMode, setMainViewMode] = useState<'card' | 'table'>('card');

  const fileInputRef = useRef<HTMLInputElement>(null);

  // License Verification Effect
  useEffect(() => {
    const id = getDeviceId();
    setDeviceId(id);

    const savedKey = localStorage.getItem('app_activation_key');
    if (savedKey && verifyActivationKey(id, savedKey)) {
      setIsActivated(true);
    } else {
      setIsActivated(false);
    }
  }, []);

  // Save to localStorage on state changes
  useEffect(() => {
    localStorage.setItem('app_cash_accounts', JSON.stringify(cashAccounts));
    localStorage.setItem('app_wallets', JSON.stringify(wallets));
    localStorage.setItem('app_transactions', JSON.stringify(transactions));
  }, [cashAccounts, wallets, transactions]);

  // Aggregate Calculations
  const totalCashBalance = cashAccounts.reduce((sum, c) => sum + c.balance, 0);
  const totalWalletBalance = wallets.reduce((sum, w) => sum + w.balance, 0);
  const totalCapital = totalCashBalance + totalWalletBalance;

  // Helper for actual cash amount
  const getActualCash = (item: Transaction): number => {
    if (item.type === 'လွှဲပြောင်း') {
      return 0; // Transfer happens directly between wallets; cash account gets commission
    }
    if (item.type === 'ထုတ်') {
      if (item.netPayout !== undefined) return item.netPayout;
      if (item.commissionMode === 'deduct') return Math.max(0, item.amount - item.commission);
      return item.amount;
    }
    return item.amount;
  };

  // Today Statistics
  const todayTransactions = transactions.filter((t) => t.date === todayStr);
  const todayCashComm = todayTransactions.reduce((sum, item) => sum + getCommissionBreakdown(item).cashComm, 0);
  const todayWalletComm = todayTransactions.reduce((sum, item) => sum + getCommissionBreakdown(item).walletComm, 0);
  const todayCommission = todayCashComm + todayWalletComm;

  const todayIn = todayTransactions
    .filter((t) => t.type === 'သွင်း')
    .reduce((sum, item) => sum + getActualCash(item), 0);
  const todayOut = todayTransactions
    .filter((t) => t.type === 'ထုတ်')
    .reduce((sum, item) => sum + getActualCash(item), 0);
  const todayTransfer = todayTransactions
    .filter((t) => t.type === 'လွှဲပြောင်း')
    .reduce((sum, item) => sum + item.amount, 0);

  // Filter Transactions for Reports
  const filterList = () => {
    return transactions.filter((t) => {
      const matchDate = selectedReportDate === 'ALL' ? true : t.date === selectedReportDate;
      let matchWallet = true;
      if (selectedWalletFilter === 'none') {
        matchWallet = !t.walletName || t.walletName === 'None' || t.walletName === '-';
      } else if (selectedWalletFilter !== 'all') {
        matchWallet = t.walletName === selectedWalletFilter || t.targetWalletName === selectedWalletFilter;
      }

      let matchCash = true;
      if (selectedCashFilter === 'none') {
        matchCash = !t.cashAccountName || t.cashAccountName === 'None' || t.cashAccountName === '-';
      } else if (selectedCashFilter !== 'all') {
        matchCash = t.cashAccountName === selectedCashFilter;
      }

      return matchDate && matchWallet && matchCash;
    });
  };

  // Transaction Save Handler with Double-Entry Balance Updates
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
      if (txData.type === 'လွှဲပြောင်း') {
        // 1. Dual Wallet Update for Transfer:
        // Source Wallet decreases by amount
        // Target Wallet increases by amount
        setWallets((prevWallets) =>
          prevWallets.map((w) => {
            if (w.name === txData.walletName) {
              return { ...w, balance: w.balance - txData.amount, updatedDate: txData.date };
            }
            if (txData.targetWalletName && w.name === txData.targetWalletName) {
              return { ...w, balance: w.balance + txData.amount, updatedDate: txData.date };
            }
            return w;
          })
        );

        // 2. Cash Account Update (receives commission if any)
        if (txData.cashAccountName && (txData.commission || 0) > 0) {
          setCashAccounts((prevAccounts) =>
            prevAccounts.map((c) => {
              if (c.name === txData.cashAccountName) {
                return { ...c, balance: c.balance + (txData.commission || 0), updatedDate: txData.date };
              }
              return c;
            })
          );
        }
      } else {
        const isCashOut = txData.type === 'ထုတ်';

        // 1. Update Selected Wallet:
        // Cash In: Agent transfers e-money to customer -> Wallet DECREASES
        // Cash Out: Customer transfers e-money to agent -> Wallet INCREASES
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

        // 2. Update Selected Cash Account:
        const cashDelta = isCashOut
          ? -(txData.amount - (txData.commission || 0))
          : txData.amount + (txData.commission || 0);

        setCashAccounts((prevAccounts) =>
          prevAccounts.map((c) => {
            if (c.name === txData.cashAccountName) {
              return { ...c, balance: c.balance + cashDelta, updatedDate: txData.date };
            }
            return c;
          })
        );
      }
    }

    setShowTransactionModal(false);
  };

  // Delete Transaction Handler
  const handleDeleteTransaction = (id: number) => {
    setTransactions(transactions.filter((t) => t.id !== id));
  };

  // Cash Account Management Handlers
  const handleAddCashAccount = (newAcc: Omit<CashAccountItem, 'id'>) => {
    const item: CashAccountItem = {
      ...newAcc,
      id: Date.now(),
    };
    setCashAccounts([...cashAccounts, item]);
  };

  const handleUpdateCashAccount = (updated: CashAccountItem) => {
    setCashAccounts(cashAccounts.map((c) => (c.id === updated.id ? updated : c)));
  };

  const handleDeleteCashAccount = (id: number) => {
    setCashAccounts(cashAccounts.filter((c) => c.id !== id));
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

  // Shop Profile Save Handler
  const handleSaveShopProfile = (newProfile: ShopProfile) => {
    setShopProfile(newProfile);
    localStorage.setItem('app_shop_profile', JSON.stringify(newProfile));
  };

  const handleResetToZero = () => {
    if (
      confirm(
        '⚠️ သတိပေးချက်: စာရင်းမှတ်တမ်း (Transactions) အားလုံးကို ဖျက်ပစ်ပြီး လက်ငင်းငွေသားနှင့် Wallet လက်ကျန်ငွေများ အားလုံးကို 0 ချပါမည်။ သေချာပါသလား?'
      )
    ) {
      const resetCash = cashAccounts.map((c) => ({ ...c, balance: 0, updatedDate: todayStr }));
      const resetWallets = wallets.map((w) => ({ ...w, balance: 0, updatedDate: todayStr }));
      setCashAccounts(resetCash);
      setWallets(resetWallets);
      setTransactions([]);
      localStorage.setItem('app_cash_accounts', JSON.stringify(resetCash));
      localStorage.setItem('app_wallets', JSON.stringify(resetWallets));
      localStorage.setItem('app_transactions', JSON.stringify([]));
      showToast('ဒေတာများ အားလုံးကို ရှင်းလင်းပြီး လက်ကျန်ငွေများ 0 သို့ သတ်မှတ်ပြီးပါပြီ။', 'success');
    }
  };

  // Capacitor & Web Backup Export Handler
  const handleBackup = async (shareDirectly: boolean = false) => {
    setIsExporting(true);
    try {
      const backupData: BackupData = {
        cashAccounts,
        cashBalance: totalCashBalance,
        wallets,
        transactions,
        shopProfile,
        exportedAt: new Date().toISOString(),
        version: '2.0.0',
      };

      const result = await exportBackupData(backupData, shareDirectly);
      if (result.success) {
        showToast(result.message, 'success');
      } else {
        showToast(result.message, 'error');
      }
    } catch (err: any) {
      showToast('Backup လုပ်ဆောင်ရာတွင် အမှားဖြစ်ပေါ်ခဲ့သည်: ' + (err?.message || ''), 'error');
    } finally {
      setIsExporting(false);
    }
  };

  const handleRestoreClick = () => {
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
      fileInputRef.current.click();
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const validatedData = await readBackupFromFile(file);
      setPendingRestoreData(validatedData);
    } catch (err: any) {
      showToast(err?.message || 'ဖိုင်ဖတ်ရာတွင် အမှားဖြစ်ပေါ်ခဲ့ပါသည်', 'error');
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  // Confirm and Apply Restore Data
  const handleConfirmRestore = () => {
    if (!pendingRestoreData) return;
    try {
      setCashAccounts(pendingRestoreData.cashAccounts);
      setWallets(pendingRestoreData.wallets);
      setTransactions(pendingRestoreData.transactions);
      if (pendingRestoreData.shopProfile) {
        setShopProfile(pendingRestoreData.shopProfile);
        localStorage.setItem('app_shop_profile', JSON.stringify(pendingRestoreData.shopProfile));
      }
      localStorage.setItem('app_cash_accounts', JSON.stringify(pendingRestoreData.cashAccounts));
      localStorage.setItem('app_wallets', JSON.stringify(pendingRestoreData.wallets));
      localStorage.setItem('app_transactions', JSON.stringify(pendingRestoreData.transactions));

      showToast('Data Restore အောင်မြင်စွာ ပြုလုပ်ပြီးပါပြီ။', 'success');
      setPendingRestoreData(null);
    } catch (err: any) {
      showToast('Restore ပြုလုပ်ရာတွင် အမှားဖြစ်ပေါ်ခဲ့ပါသည်: ' + (err?.message || ''), 'error');
    }
  };

  // Data Purge Handler for Archiving
  const handlePurgeArchived = (retainedTransactions: Transaction[], purgedCount: number) => {
    setTransactions(retainedTransactions);
    localStorage.setItem('app_transactions', JSON.stringify(retainedTransactions));
    setShowArchiveModal(false);
    showToast(`စာရင်းဟောင်း (${purgedCount}) ခု အား ဖျက်ထုတ်ပြီး Main Database ကို Compact ရှင်းလင်းပြီးပါပြီ။`, 'success');
  };

  // Filter main dashboard transactions
  const filteredMainTransactions = transactions.filter((t) => {
    // 1. Date Filter
    if (mainDateFilter === 'TODAY' && t.date !== todayStr) return false;
    if (mainDateFilter !== 'ALL' && mainDateFilter !== 'TODAY' && t.date !== mainDateFilter) return false;

    // 2. Wallet Filter
    if (mainWalletFilter === 'none') {
      if (t.walletName && t.walletName !== 'None' && t.walletName !== '-') return false;
    } else if (mainWalletFilter !== 'all') {
      if (t.walletName !== mainWalletFilter && t.targetWalletName !== mainWalletFilter) return false;
    }

    // 3. Cash Account Filter
    if (mainCashFilter === 'none') {
      if (t.cashAccountName && t.cashAccountName !== 'None' && t.cashAccountName !== '-') return false;
    } else if (mainCashFilter !== 'all') {
      if (t.cashAccountName !== mainCashFilter) return false;
    }

    // 4. Type Filter
    if (mainTypeFilter !== 'all') {
      if (t.type !== mainTypeFilter) return false;
    }

    // 5. Search Query
    if (!mainSearchQuery.trim()) return true;
    const q = mainSearchQuery.toLowerCase();
    return (
      t.customerName.toLowerCase().includes(q) ||
      t.phone.toLowerCase().includes(q) ||
      t.walletName.toLowerCase().includes(q) ||
      (t.targetWalletName && t.targetWalletName.toLowerCase().includes(q)) ||
      (t.cashAccountName && t.cashAccountName.toLowerCase().includes(q)) ||
      (t.note && t.note.toLowerCase().includes(q))
    );
  });

  // If Not Activated, Show License Screen
  if (!isActivated) {
    return (
      <LicenseLockScreen
        deviceId={deviceId}
        onActivated={() => {
          setIsActivated(true);
          const savedProfile = localStorage.getItem('app_shop_profile');
          if (savedProfile) {
            try {
              setShopProfile(JSON.parse(savedProfile));
            } catch (e) {}
          }
        }}
      />
    );
  }

  return (
    <div className="min-h-screen bg-slate-100 text-slate-800 antialiased p-3 sm:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* TOP HEADER */}
        <header className="bg-white rounded-2xl p-5 shadow-xs border border-slate-200/80 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            {shopProfile.logoUrl ? (
              <div className="w-12 h-12 rounded-2xl border border-slate-200 bg-white p-1 shadow-xs flex items-center justify-center overflow-hidden shrink-0">
                <img src={shopProfile.logoUrl} alt="Logo" className="w-full h-full object-contain" />
              </div>
            ) : (
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-indigo-600 to-indigo-500 text-white flex items-center justify-center shadow-md shadow-indigo-600/20 shrink-0">
                <Banknote className="w-6 h-6" />
              </div>
            )}
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
                <span>{shopProfile.shopName || 'Money Agent POS'}</span>
                <span className="text-[10px] uppercase font-bold tracking-wider bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded-full border border-indigo-100">
                  PRO
                </span>
              </h1>
              <p className="text-xs text-slate-400 font-medium mt-0.5">
                {shopProfile.phone
                  ? `${shopProfile.phone} • ${todayStr}`
                  : `ငွေသွင်း/ငွေထုတ် & Wallet လွှဲပြောင်း စီမံခန့်ခွဲမှုစနစ် • ${todayStr}`}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              onClick={() => setShowShopProfileModal(true)}
              className="flex items-center gap-1.5 px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-colors cursor-pointer"
              title="ဆိုင် / လုပ်ငန်း Profile ပြင်ဆင်ရန်"
            >
              <Store className="w-3.5 h-3.5 text-indigo-600" />
              <span>ဆိုင် Profile</span>
            </button>

            <div className="hidden sm:flex items-center gap-1.5 px-3 py-2 bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-xl text-xs font-bold">
              <ShieldCheck className="w-4 h-4" />
              <span>Activated</span>
            </div>

            <button
              onClick={() => {
                setSelectedReportDate(todayStr);
                setSelectedWalletFilter('all');
                setSelectedCashFilter('all');
                setShowAllTransactionsModal(true);
              }}
              className="flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-colors shadow-sm cursor-pointer"
            >
              <FileSpreadsheet className="w-4 h-4" />
              စာရင်းချုပ် အားလုံး
            </button>
          </div>
        </header>

        {/* TOP 4 STATS CARDS */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* CARD 1: CASH ACCOUNTS TOTAL */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs hover:shadow-md transition-shadow relative group">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-bold text-slate-600 flex items-center gap-1">
                  💵 လက်ငင်းငွေသားပေါင်း (Cash)
                </span>
                <button
                  onClick={() => setShowCashEditModal(true)}
                  className="p-1 bg-slate-100 hover:bg-emerald-50 hover:text-emerald-600 rounded-md text-xs transition-colors cursor-pointer"
                  title="လက်ငင်းငွေသား အကောင့်များ စီမံရန်"
                >
                  <Plus className="w-3.5 h-3.5" />
                </button>
              </div>
              <button
                onClick={() => {
                  setSelectedReportDate(todayStr);
                  setSelectedCashFilter('all');
                  setSelectedWalletFilter('all');
                  setShowCashReport(true);
                }}
                className="text-xs text-emerald-700 hover:text-emerald-900 bg-emerald-50 px-2 py-1 rounded-lg font-bold transition-colors cursor-pointer"
              >
                📊 အသေးစိတ်
              </button>
            </div>
            <h2 className="text-2xl font-black text-slate-900 tracking-tight">
              {formatKs(totalCashBalance)}
            </h2>
            <div className="mt-2 flex items-center justify-between text-xs text-slate-400">
              <span className="font-semibold text-slate-600">{formatLakh(totalCashBalance)}</span>
              <span>{cashAccounts.length} အကောင့်</span>
            </div>
          </div>

          {/* CARD 2: WALLETS TOTAL */}
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
                  setSelectedWalletFilter('all');
                  setSelectedCashFilter('all');
                  setShowWalletReport(true);
                }}
                className="text-xs text-indigo-700 hover:text-indigo-900 bg-indigo-50 px-2 py-1 rounded-lg font-bold transition-colors cursor-pointer"
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

          {/* CARD 3: COMMISSION SUMMARY */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs border-l-4 border-l-amber-500 hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-bold text-slate-700 flex items-center gap-1">
                📈 ကော်မရှင်ခ စာရင်း
              </span>
              <button
                onClick={() => {
                  setSelectedReportDate(todayStr);
                  setSelectedWalletFilter('all');
                  setSelectedCashFilter('all');
                  setShowCommissionReport(true);
                }}
                className="text-xs text-amber-700 hover:text-amber-900 bg-amber-50 px-2 py-1 rounded-lg font-bold transition-colors cursor-pointer"
              >
                📊 အသေးစိတ်
              </button>
            </div>
            <h2 className="text-2xl font-black text-amber-800 tracking-tight">
              +{formatKs(todayCommission)}
            </h2>
            <div className="mt-2 flex items-center justify-between text-[11px] text-slate-500 font-medium">
              <span className="text-amber-800 font-semibold">💵 ငွေသား: +{formatKs(todayCashComm)}</span>
              <span className="text-purple-800 font-semibold">📱 Wallet: +{formatKs(todayWalletComm)}</span>
            </div>
          </div>

          {/* CARD 4: TOTAL ALL ACCOUNTS BALANCE (CASH + WALLETS) */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs border-l-4 border-l-indigo-600 hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-bold text-slate-700 flex items-center gap-1">
                🌐 စုစုပေါင်း ငွေစာရင်းအားလုံးလက်ကျန်
              </span>
              <button
                onClick={() => {
                  setSelectedReportDate(todayStr);
                  setShowTotalAccountsReport(true);
                }}
                className="text-xs text-indigo-700 hover:text-indigo-900 bg-indigo-50 px-2 py-1 rounded-lg font-bold transition-colors cursor-pointer"
              >
                📊 အသေးစိတ်
              </button>
            </div>
            <h2 className="text-2xl font-black text-indigo-900 tracking-tight">
              {formatKs(totalCapital)}
            </h2>
            <div className="mt-2 flex items-center justify-between text-xs font-semibold text-slate-500">
              <span>{formatLakh(totalCapital)}</span>
              <span className="text-[11px] bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded-full">
                ငွေသား ({cashAccounts.length}) + Wallets ({wallets.length})
              </span>
            </div>
          </div>
        </div>

        {/* PRIMARY ACTION BUTTONS: CASH IN, CASH OUT & WALLET TO WALLET TRANSFER */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* BUTTON 1: CASH IN (GREEN) */}
          <button
            onClick={() => {
              setTransactionModalType('သွင်း');
              setShowTransactionModal(true);
            }}
            className="group p-5 bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-700 hover:to-emerald-600 text-white rounded-2xl shadow-lg shadow-emerald-600/20 transition-all flex items-center justify-between cursor-pointer active:scale-[0.99]"
          >
            <div className="flex items-center gap-3.5 text-left">
              <div className="w-11 h-11 bg-white/20 rounded-2xl flex items-center justify-center text-white backdrop-blur-xs group-hover:scale-110 transition-transform shrink-0">
                <ArrowDownRight className="w-6 h-6" />
              </div>
              <div className="min-w-0">
                <div className="text-base sm:text-lg font-black tracking-wide truncate">
                  ငွေသွင်း မှတ်တမ်းတင်မည် (Cash In)
                </div>
                <div className="text-xs text-emerald-100 line-clamp-1">
                  ငွေသားလက်ခံ (+) & Wallet မှ လွှဲပေးခြင်း (-)
                </div>
              </div>
            </div>
            <div className="text-right hidden sm:block shrink-0 pl-2">
              <div className="text-[11px] font-semibold text-emerald-100">ယနေ့ ငွေသွင်း</div>
              <div className="text-sm font-black">+{formatKs(todayIn)}</div>
            </div>
          </button>

          {/* BUTTON 2: CASH OUT (RED) */}
          <button
            onClick={() => {
              setTransactionModalType('ထုတ်');
              setShowTransactionModal(true);
            }}
            className="group p-5 bg-gradient-to-r from-red-600 to-red-500 hover:from-red-700 hover:to-red-600 text-white rounded-2xl shadow-lg shadow-red-600/20 transition-all flex items-center justify-between cursor-pointer active:scale-[0.99]"
          >
            <div className="flex items-center gap-3.5 text-left">
              <div className="w-11 h-11 bg-white/20 rounded-2xl flex items-center justify-center text-white backdrop-blur-xs group-hover:scale-110 transition-transform shrink-0">
                <ArrowUpRight className="w-6 h-6" />
              </div>
              <div className="min-w-0">
                <div className="text-base sm:text-lg font-black tracking-wide truncate">
                  ငွေထုတ် မှတ်တမ်းတင်မည် (Cash Out)
                </div>
                <div className="text-xs text-red-100 line-clamp-1">
                  Wallet သို့ လွှဲခံ (+) & ငွေသားထုတ်ပေးခြင်း (-)
                </div>
              </div>
            </div>
            <div className="text-right hidden sm:block shrink-0 pl-2">
              <div className="text-[11px] font-semibold text-red-100">ယနေ့ ငွေထုတ်</div>
              <div className="text-sm font-black">-{formatKs(todayOut)}</div>
            </div>
          </button>

          {/* BUTTON 3: WALLET TO WALLET TRANSFER (LIGHT BLUE / SKY) */}
          <button
            onClick={() => {
              setTransactionModalType('လွှဲပြောင်း');
              setShowTransactionModal(true);
            }}
            className="group p-5 bg-gradient-to-r from-sky-600 to-sky-500 hover:from-sky-700 hover:to-sky-600 text-white rounded-2xl shadow-lg shadow-sky-600/20 transition-all flex items-center justify-between cursor-pointer active:scale-[0.99]"
          >
            <div className="flex items-center gap-3.5 text-left">
              <div className="w-11 h-11 bg-white/20 rounded-2xl flex items-center justify-center text-white backdrop-blur-xs group-hover:scale-110 transition-transform shrink-0">
                <ArrowLeftRight className="w-6 h-6" />
              </div>
              <div className="min-w-0">
                <div className="text-base sm:text-lg font-black tracking-wide truncate">
                  Wallet to Wallet လွှဲပြောင်းမည်
                </div>
                <div className="text-xs text-sky-100 line-clamp-1">
                  Wallet အချင်းချင်း ငွေလွှဲပြောင်းခြင်း & ကော်မရှင်
                </div>
              </div>
            </div>
            <div className="text-right hidden sm:block shrink-0 pl-2">
              <div className="text-[11px] font-semibold text-sky-100">ယနေ့ လွှဲပြောင်း</div>
              <div className="text-sm font-black">{formatKs(todayTransfer)}</div>
            </div>
          </button>
        </div>

        {/* 2 ACCOUNTS SECTIONS: 1) CASH DRAWERS & 2) WALLETS */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* SECTION 1: CASH ACCOUNTS */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs space-y-3.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Banknote className="w-4 h-4 text-emerald-600" />
                <h3 className="text-sm font-bold text-slate-800">
                  💵 လက်ငင်းငွေသား အကောင့်များ ({cashAccounts.length})
                </h3>
              </div>
              <button
                onClick={() => setShowCashEditModal(true)}
                className="text-xs text-emerald-700 hover:text-emerald-900 font-bold flex items-center gap-1 cursor-pointer"
              >
                <Edit className="w-3.5 h-3.5" />
                ငွေသားအကောင့် စီမံရန်
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {cashAccounts.map((c) => (
                <div
                  key={c.id}
                  onClick={() => {
                    setSelectedCashFilter(c.name);
                    setSelectedWalletFilter('all');
                    setSelectedReportDate('ALL');
                    setShowCashReport(true);
                  }}
                  className="p-3.5 bg-emerald-50/40 hover:bg-emerald-50 border border-emerald-200/70 hover:border-emerald-300 rounded-xl transition-all cursor-pointer"
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-bold text-xs text-slate-900 truncate">{c.name}</span>
                    {c.note && (
                      <span className="text-[10px] bg-white px-1.5 py-0.5 rounded border border-emerald-200 text-emerald-700">
                        {c.note}
                      </span>
                    )}
                  </div>
                  <div className="text-base font-black text-emerald-700">
                    {formatKs(c.balance)}
                  </div>
                  <div className="text-[10px] text-slate-400 mt-0.5">
                    {(c.balance / 100000).toFixed(1)} သိန်း • ရက်စွဲ: {c.updatedDate}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* SECTION 2: WALLETS */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs space-y-3.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Wallet className="w-4 h-4 text-indigo-600" />
                <h3 className="text-sm font-bold text-slate-800">
                  🏦 Wallet / Bank အကောင့်များ ({wallets.length})
                </h3>
              </div>
              <button
                onClick={() => setShowWalletModal(true)}
                className="text-xs text-indigo-600 hover:text-indigo-800 font-bold flex items-center gap-1 cursor-pointer"
              >
                <Edit className="w-3.5 h-3.5" />
                Wallet များ စီမံရန်
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {wallets.map((w) => (
                <div
                  key={w.id}
                  onClick={() => {
                    setSelectedWalletFilter(w.name);
                    setSelectedCashFilter('all');
                    setSelectedReportDate('ALL');
                    setShowWalletReport(true);
                  }}
                  className="p-3.5 bg-indigo-50/40 hover:bg-indigo-50 border border-indigo-200/70 hover:border-indigo-300 rounded-xl transition-all cursor-pointer"
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-bold text-xs text-slate-900">{w.name}</span>
                    <span className="text-[10px] text-slate-400 font-mono">
                      {w.accountNumber || ''}
                    </span>
                  </div>
                  <div className="text-base font-black text-indigo-700">
                    {formatKs(w.balance)}
                  </div>
                  <div className="text-[10px] text-slate-400 mt-0.5">
                    {(w.balance / 100000).toFixed(1)} သိန်း • ရက်စွဲ: {w.updatedDate}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* RECENT TRANSACTIONS SECTION */}
        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/80 shadow-xs space-y-4">
          {/* Header Row */}
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <History className="w-5 h-5 text-indigo-600" />
              <div>
                <h3 className="text-sm sm:text-base font-bold text-slate-800">
                  လတ်တလော အရောင်းအဝယ် မှတ်တမ်းများ ({filteredMainTransactions.length})
                </h3>
                <p className="text-[11px] text-slate-400">
                  လက်ငင်းငွေသား၊ Wallet နှင့် Wallet to Wallet အလိုက် စစ်ထုတ်ကြည့်ရှုနိုင်ပါသည်
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1.5">
              {/* View Mode Toggle */}
              <div className="flex items-center bg-slate-100 p-0.5 rounded-xl border border-slate-200">
                <button
                  onClick={() => setMainViewMode('card')}
                  className={`px-2.5 py-1 rounded-lg text-xs font-bold flex items-center gap-1 transition-all cursor-pointer ${
                    mainViewMode === 'card'
                      ? 'bg-white text-indigo-600 shadow-xs'
                      : 'text-slate-500 hover:text-slate-800'
                  }`}
                  title="ကတ်ပြားပုံစံ (Card View)"
                >
                  <LayoutGrid className="w-3.5 h-3.5" />
                  <span>Card ပုံစံ</span>
                </button>
                <button
                  onClick={() => setMainViewMode('table')}
                  className={`px-2.5 py-1 rounded-lg text-xs font-bold flex items-center gap-1 transition-all cursor-pointer ${
                    mainViewMode === 'table'
                      ? 'bg-white text-indigo-600 shadow-xs'
                      : 'text-slate-500 hover:text-slate-800'
                  }`}
                  title="ဇယားပုံစံ (Table View)"
                >
                  <TableIcon className="w-3.5 h-3.5" />
                  <span>ဇယား</span>
                </button>
              </div>

              <button
                onClick={() => {
                  setSelectedReportDate(todayStr);
                  setSelectedWalletFilter('all');
                  setSelectedCashFilter('all');
                  setShowAllTransactionsModal(true);
                }}
                className="px-3 py-1.5 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 rounded-xl text-xs font-bold transition-colors cursor-pointer flex items-center gap-1"
              >
                <FileSpreadsheet className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">စာရင်းချုပ်</span> အားလုံး
              </button>
            </div>
          </div>

          {/* Filter Toolbar for Main Screen */}
          <div className="flex flex-wrap items-center gap-2 p-3 bg-slate-50 border border-slate-200/80 rounded-xl text-xs">
            {/* 1. Quick Date Filters */}
            <div className="flex items-center gap-1 bg-white border border-slate-200 rounded-lg p-0.5">
              <button
                onClick={() => setMainDateFilter('ALL')}
                className={`px-2 py-1 rounded-md text-[11px] font-bold transition-all cursor-pointer ${
                  mainDateFilter === 'ALL'
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                ရက်အားလုံး
              </button>
              <button
                onClick={() => setMainDateFilter('TODAY')}
                className={`px-2 py-1 rounded-md text-[11px] font-bold transition-all cursor-pointer ${
                  mainDateFilter === 'TODAY'
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                ယနေ့
              </button>
            </div>

            {/* Custom Date Input */}
            <div className="flex items-center gap-1 bg-white px-2 py-1 border border-slate-200 rounded-lg">
              <Calendar className="w-3.5 h-3.5 text-slate-400" />
              <input
                type="date"
                value={mainDateFilter === 'ALL' || mainDateFilter === 'TODAY' ? todayStr : mainDateFilter}
                onChange={(e) => setMainDateFilter(e.target.value)}
                className="bg-transparent text-xs font-semibold text-slate-800 outline-none cursor-pointer"
              />
            </div>

            {/* 2. Wallet Filter Dropdown */}
            <div className="flex items-center gap-1 bg-white px-2 py-1 border border-slate-200 rounded-lg">
              <Wallet className="w-3.5 h-3.5 text-indigo-600" />
              <span className="text-[11px] font-bold text-slate-600">Wallet:</span>
              <select
                value={mainWalletFilter}
                onChange={(e) => setMainWalletFilter(e.target.value)}
                className="bg-transparent text-xs font-bold text-slate-800 outline-none cursor-pointer max-w-[120px]"
              >
                <option value="all">အားလုံး (All)</option>
                <option value="none">မရွေးပါ (None)</option>
                {wallets.map((w) => (
                  <option key={w.id} value={w.name}>
                    {w.name}
                  </option>
                ))}
              </select>
            </div>

            {/* 3. Cash Account Filter Dropdown */}
            <div className="flex items-center gap-1 bg-white px-2 py-1 border border-slate-200 rounded-lg">
              <Banknote className="w-3.5 h-3.5 text-emerald-600" />
              <span className="text-[11px] font-bold text-slate-600">ငွေသား:</span>
              <select
                value={mainCashFilter}
                onChange={(e) => setMainCashFilter(e.target.value)}
                className="bg-transparent text-xs font-bold text-slate-800 outline-none cursor-pointer max-w-[120px]"
              >
                <option value="all">အားလုံး (All)</option>
                <option value="none">မရွေးပါ (None)</option>
                {cashAccounts.map((c) => (
                  <option key={c.id} value={c.name}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>

            {/* 4. Type Filter Dropdown */}
            <div className="flex items-center gap-1 bg-white px-2 py-1 border border-slate-200 rounded-lg">
              <Filter className="w-3.5 h-3.5 text-slate-500" />
              <select
                value={mainTypeFilter}
                onChange={(e) => setMainTypeFilter(e.target.value)}
                className="bg-transparent text-xs font-bold text-slate-800 outline-none cursor-pointer"
              >
                <option value="all">အမျိုးအစား အားလုံး</option>
                <option value="သွင်း">ငွေသွင်း (Cash In)</option>
                <option value="ထုတ်">ငွေထုတ် (Cash Out)</option>
                <option value="လွှဲပြောင်း">Wallet to Wallet လွှဲပြောင်း</option>
              </select>
            </div>

            {/* 5. Search Bar */}
            <div className="relative flex-1 min-w-[150px]">
              <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="ဖောက်သည်၊ ဖုန်း၊ အကောင့် ရှာရန်..."
                value={mainSearchQuery}
                onChange={(e) => setMainSearchQuery(e.target.value)}
                className="w-full bg-white border border-slate-200 rounded-lg pl-8 pr-3 py-1 text-xs text-slate-800 outline-none focus:border-indigo-400"
              />
            </div>
          </div>

          {/* VIEW 1: RESPONSIVE CARDS VIEW */}
          {mainViewMode === 'card' && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {filteredMainTransactions.length === 0 ? (
                <div className="col-span-full p-8 text-center text-slate-400 bg-slate-50 rounded-xl border border-slate-200 font-medium text-xs">
                  ရွေးချယ်ထားသော စံနှုန်းများနှင့် ကိုက်ညီသော အရောင်းအဝယ် စာရင်း မရှိပါ။
                </div>
              ) : (
                filteredMainTransactions.map((item, index) => {
                  const isCashOut = item.type === 'ထုတ်';
                  const isTransfer = item.type === 'လွှဲပြောင်း';
                  const actualCash = getActualCash(item);
                  const { cashComm, walletComm } = getCommissionBreakdown(item);

                  return (
                    <div
                      key={item.id}
                      className="p-3.5 bg-white border border-slate-200 hover:border-indigo-300 rounded-xl shadow-xs space-y-2.5 transition-all flex flex-col justify-between"
                    >
                      {/* Top Row: Customer & Badge */}
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5">
                            <span className="text-xs font-black text-slate-900 truncate">
                              {index + 1}. {item.customerName}
                            </span>
                            <span
                              className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-bold shrink-0 ${
                                isTransfer
                                  ? 'bg-sky-50 text-sky-700 border border-sky-200'
                                  : isCashOut
                                  ? 'bg-red-50 text-red-700 border border-red-200'
                                  : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              }`}
                            >
                              {isTransfer ? (
                                <ArrowLeftRight className="w-3 h-3" />
                              ) : isCashOut ? (
                                <ArrowUpRight className="w-3 h-3" />
                              ) : (
                                <ArrowDownRight className="w-3 h-3" />
                              )}
                              {item.type}
                            </span>
                          </div>
                          <div className="text-[10px] text-slate-400 mt-0.5">
                            {item.date} {item.time && `• ${item.time}`} {item.phone && `• ${item.phone}`}
                          </div>
                        </div>

                        <button
                          onClick={() => setActiveReceipt(item)}
                          className="px-2 py-1 bg-slate-100 hover:bg-indigo-50 hover:text-indigo-600 text-slate-700 rounded-md text-[11px] font-bold transition-colors cursor-pointer shrink-0"
                        >
                          ဘောက်ချာ
                        </button>
                      </div>

                      {/* Amounts */}
                      <div className="grid grid-cols-2 gap-2 p-2 bg-slate-50 rounded-lg text-xs">
                        <div>
                          <span className="text-[10px] text-slate-500 block">
                            {isTransfer ? 'လွှဲပြောင်းငွေ:' : 'လက်ငင်းငွေ:'}
                          </span>
                          <span
                            className={`text-sm font-black ${
                              isTransfer
                                ? 'text-sky-700'
                                : isCashOut
                                ? 'text-red-600'
                                : 'text-slate-900'
                            }`}
                          >
                            {isTransfer
                              ? formatKs(item.amount)
                              : isCashOut
                              ? `- ${actualCash.toLocaleString()} Ks`
                              : `+ ${actualCash.toLocaleString()} Ks`}
                          </span>
                        </div>

                        <div>
                          <span className="text-[10px] text-slate-500 block">
                            {isTransfer ? 'လွှဲခ/ဝန်ဆောင်ခ:' : 'မူလလွှဲငွေ:'}
                          </span>
                          <span className="font-semibold text-slate-700">
                            {isTransfer ? `+${formatKs(item.commission)}` : `${item.amount.toLocaleString()} Ks`}
                          </span>
                        </div>

                        <div>
                          <span className="text-[10px] text-amber-800 font-bold block">💵 ငွေသားကော်မရှင်:</span>
                          <span className="font-bold text-amber-800">
                            {cashComm > 0 ? `+${cashComm.toLocaleString()} Ks` : '-'}
                          </span>
                        </div>

                        <div>
                          <span className="text-[10px] text-purple-800 font-bold block">📱 Walletကော်မရှင်:</span>
                          <span className="font-bold text-purple-800">
                            {walletComm > 0 ? `+${walletComm.toLocaleString()} Ks` : '-'}
                          </span>
                        </div>
                      </div>

                      {/* Accounts Used */}
                      <div className="flex flex-wrap items-center justify-between gap-1 text-[11px] pt-1.5 border-t border-slate-100">
                        <div className="flex items-center gap-1">
                          {isTransfer ? (
                            <span className="px-1.5 py-0.5 bg-sky-50 text-sky-700 rounded font-semibold text-[10px]">
                              🔄 {item.walletName} ➔ {item.targetWalletName || '-'}
                            </span>
                          ) : (
                            <span className="px-1.5 py-0.5 bg-indigo-50 text-indigo-700 rounded font-semibold text-[10px]">
                              🏦 {item.walletName}
                            </span>
                          )}
                          <span className="px-1.5 py-0.5 bg-emerald-50 text-emerald-700 rounded font-semibold text-[10px]">
                            💵 {item.cashAccountName || 'ဆိုင်ရှေ့ငွေပုံး'}
                          </span>
                        </div>

                        {item.note && (
                          <span className="text-[10px] text-slate-400 italic truncate max-w-[120px]">
                            {item.note}
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          )}

          {/* VIEW 2: TABLE VIEW */}
          {mainViewMode === 'table' && (
            <div className="overflow-x-auto border border-slate-200/80 rounded-xl">
              <table className="w-full text-xs text-left border-collapse min-w-[760px]">
                <thead className="bg-slate-50 text-slate-700 font-bold border-b border-slate-200">
                  <tr>
                    <th className="p-3 whitespace-nowrap">စဉ်</th>
                    <th className="p-3 whitespace-nowrap">နေ့စွဲ/အချိန်</th>
                    <th className="p-3 whitespace-nowrap">ဖောက်သည် အမည်</th>
                    <th className="p-3 text-center whitespace-nowrap">အမျိုးအစား</th>
                    <th className="p-3 text-right whitespace-nowrap">လက်ငင်း/လွှဲငွေ (Ks)</th>
                    <th className="p-3 text-right whitespace-nowrap bg-amber-50/50 text-amber-900">💵 ငွေသားကော်မရှင်</th>
                    <th className="p-3 text-right whitespace-nowrap bg-purple-50/50 text-purple-900">📱 Walletကော်မရှင်</th>
                    <th className="p-3 whitespace-nowrap">ဖုန်းနံပါတ်</th>
                    <th className="p-3 whitespace-nowrap">Wallet အကောင့်</th>
                    <th className="p-3 whitespace-nowrap">ငွေသားအကောင့်</th>
                    <th className="p-3 text-center whitespace-nowrap">ပြေစာ</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {filteredMainTransactions.length === 0 ? (
                    <tr>
                      <td colSpan={11} className="p-6 text-center text-slate-400 font-medium">
                        ရွေးချယ်ထားသော စံနှုန်းများနှင့် ကိုက်ညီသော ဒေတာ မရှိပါ။
                      </td>
                    </tr>
                  ) : (
                    filteredMainTransactions.map((item, index) => {
                      const isCashOut = item.type === 'ထုတ်';
                      const isTransfer = item.type === 'လွှဲပြောင်း';
                      const actualCash = getActualCash(item);
                      const { cashComm, walletComm } = getCommissionBreakdown(item);
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
                          <td className="p-3 text-center whitespace-nowrap">
                            <span
                              className={`inline-flex items-center gap-0.5 px-2 py-0.5 rounded-md text-[11px] font-bold ${
                                isTransfer
                                  ? 'bg-sky-50 text-sky-700 border border-sky-200'
                                  : isCashOut
                                  ? 'bg-red-50 text-red-700 border border-red-200'
                                  : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              }`}
                            >
                              {isTransfer ? (
                                <ArrowLeftRight className="w-3 h-3" />
                              ) : isCashOut ? (
                                <ArrowUpRight className="w-3 h-3" />
                              ) : (
                                <ArrowDownRight className="w-3 h-3" />
                              )}
                              {item.type}
                            </span>
                          </td>

                          {/* Actual cash given / received / transfer */}
                          <td
                            className={`p-3 text-right font-bold whitespace-nowrap ${
                              isTransfer
                                ? 'text-sky-700'
                                : isCashOut
                                ? 'text-red-600'
                                : 'text-slate-900'
                            }`}
                          >
                            <div>
                              {isTransfer
                                ? formatKs(item.amount)
                                : isCashOut
                                ? `- ${actualCash.toLocaleString()}`
                                : actualCash.toLocaleString()} Ks
                            </div>
                          </td>

                          {/* Cash Commission */}
                          <td className="p-3 text-right text-amber-800 font-bold whitespace-nowrap bg-amber-50/30">
                            {cashComm > 0 ? `+${cashComm.toLocaleString()} Ks` : '-'}
                          </td>

                          {/* Wallet Commission */}
                          <td className="p-3 text-right text-purple-800 font-bold whitespace-nowrap bg-purple-50/30">
                            {walletComm > 0 ? `+${walletComm.toLocaleString()} Ks` : '-'}
                          </td>

                          <td className="p-3 text-slate-600 font-mono whitespace-nowrap">{item.phone}</td>
                          <td className="p-3 text-slate-700 whitespace-nowrap">
                            {isTransfer ? (
                              <span className="px-2 py-0.5 bg-sky-50 text-sky-700 rounded font-semibold text-[11px]">
                                {item.walletName} ➔ {item.targetWalletName || '-'}
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 bg-indigo-50 text-indigo-700 rounded font-semibold text-[11px]">
                                {item.walletName}
                              </span>
                            )}
                          </td>
                          <td className="p-3 text-slate-700 whitespace-nowrap">
                            <span className="px-2 py-0.5 bg-emerald-50 text-emerald-700 rounded font-semibold text-[11px]">
                              {item.cashAccountName || 'ဆိုင်ရှေ့ငွေပုံး'}
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
                    })
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* DATA MAINTENANCE, ARCHIVE & BACKUP / RESTORE FOOTER CARD */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-3">
            <div>
              <h4 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
                💾 Data စနစ် လုံခြုံရေး၊ Archive (စာရင်းဟောင်းခွဲထုတ်ခြင်း) နှင့် Backup / Restore
              </h4>
              <p className="text-xs text-slate-400 mt-0.5">
                စာရင်းဟောင်းများကို ခွဲထုတ်ပြီး App ပေါ့ပါးသွက်လက်အောင် ပြုလုပ်နိုင်သည့်အပြင် JSON Backup များကို ဖုန်းထဲသို့ သို့မဟုတ် Drive/Telegram သို့ တိုက်ရိုက် Share သိမ်းဆည်းနိုင်ပါသည်။
              </p>
            </div>

            {/* Archive / Maintenance Action Button */}
            <button
              onClick={() => setShowArchiveModal(true)}
              className="flex items-center gap-1.5 px-4 py-2.5 bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-700 hover:to-amber-600 text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-amber-600/20 cursor-pointer"
              title="လွန်ခဲ့သော ၆ လ/၁ နှစ် စာရင်းဟောင်းများကို ခွဲထုတ်သိမ်းဆည်းပြီး Database ကို Compact ရှင်းလင်းမည်"
            >
              <Archive className="w-4 h-4" />
              🗄️ စာရင်းဟောင်း Archive &amp; Compact
            </button>
          </div>

          <div className="flex flex-wrap items-center justify-end gap-2">
            <button
              onClick={() => handleBackup(false)}
              disabled={isExporting}
              className="flex items-center gap-1.5 px-3.5 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-indigo-600/20 cursor-pointer"
              title="JSON Backup ဖိုင်ကို ဖုန်းထဲသို့ ဒေါင်းလုဒ်/သိမ်းဆည်းမည်"
            >
              {isExporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
              📥 Full Backup (JSON)
            </button>

            <button
              onClick={() => handleBackup(true)}
              disabled={isExporting}
              className="flex items-center gap-1.5 px-3.5 py-2.5 bg-violet-600 hover:bg-violet-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-violet-600/20 cursor-pointer"
              title="@capacitor/share ဖြင့် Drive, Telegram, Viber, Files သို့ တိုက်ရိုက် Share လုပ်မည်"
            >
              {isExporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Share2 className="w-4 h-4" />}
              📤 Backup ဖိုင် Share မည်
            </button>

            <button
              onClick={handleRestoreClick}
              className="flex items-center gap-1.5 px-3.5 py-2.5 bg-sky-600 hover:bg-sky-700 text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-sky-600/20 cursor-pointer"
              title="သိမ်းဆည်းထားသော JSON Backup ဖိုင်ကို ရွေးချယ်ပြီး Restore ပြန်သွင်းမည်"
            >
              <Upload className="w-4 h-4" />
              📥 Restore (ဖိုင်ရွေးမည်)
            </button>

            <button
              onClick={handleResetToZero}
              className="flex items-center gap-1.5 px-3.5 py-2.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-xl text-xs font-bold transition-all cursor-pointer"
              title="အရောင်းအဝယ် စာရင်းအားလုံး ရှင်းထုတ်ပြီး လက်ကျန်ငွေ 0 သို့ Reset ချမည်"
            >
              <RotateCcw className="w-4 h-4" />
              🔄 စာရင်းအားလုံး ရှင်းမည် (0 ချမည်)
            </button>

            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileChange}
              accept=".json,application/json"
              className="hidden"
            />
          </div>
        </div>
      </div>

      {/* TOAST NOTIFICATION CONTAINER */}
      {toast && (
        <div className="fixed bottom-5 right-5 z-50 max-w-sm w-full bg-slate-900 text-white p-4 rounded-2xl shadow-2xl border border-slate-700 flex items-start gap-3 animate-in slide-in-from-bottom-5 duration-200">
          {toast.type === 'success' && <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />}
          {toast.type === 'error' && <AlertCircle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />}
          {toast.type === 'info' && <Info className="w-5 h-5 text-sky-400 shrink-0 mt-0.5" />}
          <div className="text-xs font-medium leading-relaxed flex-1">{toast.message}</div>
          <button
            onClick={() => setToast(null)}
            className="text-slate-400 hover:text-white transition-colors cursor-pointer p-0.5"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* ================= MODALS ================= */}

      {/* Restore Confirmation Modal */}
      {pendingRestoreData && (
        <RestoreConfirmModal
          data={pendingRestoreData}
          onConfirm={handleConfirmRestore}
          onCancel={() => setPendingRestoreData(null)}
        />
      )}

      {/* 1. Transaction Modal (Cash In / Cash Out / Wallet to Wallet) */}
      {showTransactionModal && (
        <TransactionModal
          initialType={transactionModalType}
          wallets={wallets}
          cashAccounts={cashAccounts}
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

      {/* 3. Cash In Hand / Drawers Management Modal */}
      {showCashEditModal && (
        <CashEditModal
          cashAccounts={cashAccounts}
          onClose={() => setShowCashEditModal(false)}
          onAddAccount={handleAddCashAccount}
          onUpdateAccount={handleUpdateCashAccount}
          onDeleteAccount={handleDeleteCashAccount}
        />
      )}

      {/* 4. Shop Profile Modal */}
      {showShopProfileModal && (
        <ShopProfileModal
          initialProfile={shopProfile}
          onSave={handleSaveShopProfile}
          onClose={() => setShowShopProfileModal(false)}
        />
      )}

      {/* 5. Wallet Report Modal */}
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
          cashAccounts={cashAccounts}
          selectedCashFilter={selectedCashFilter}
          setSelectedCashFilter={setSelectedCashFilter}
          data={filterList()}
          onDeleteTransaction={handleDeleteTransaction}
          onViewReceipt={(tx) => setActiveReceipt(tx)}
        />
      )}

      {/* 6. Cash Report Modal */}
      {showCashReport && (
        <ReportModal
          title="💵 လက်ငင်းငွေသား (Cash) Transaction Report"
          icon={<Banknote className="w-5 h-5" />}
          onClose={() => setShowCashReport(false)}
          selectedReportDate={selectedReportDate}
          setSelectedReportDate={setSelectedReportDate}
          wallets={wallets}
          selectedWalletFilter={selectedWalletFilter}
          setSelectedWalletFilter={setSelectedWalletFilter}
          cashAccounts={cashAccounts}
          selectedCashFilter={selectedCashFilter}
          setSelectedCashFilter={setSelectedCashFilter}
          data={filterList()}
          onDeleteTransaction={handleDeleteTransaction}
          onViewReceipt={(tx) => setActiveReceipt(tx)}
        />
      )}

      {/* 7. Commission Report Modal */}
      {showCommissionReport && (
        <ReportModal
          title="📈 ကော်မရှင်ခ စာရင်း အသေးစိတ် Report"
          icon={<TrendingUp className="w-5 h-5" />}
          onClose={() => setShowCommissionReport(false)}
          selectedReportDate={selectedReportDate}
          setSelectedReportDate={setSelectedReportDate}
          wallets={wallets}
          selectedWalletFilter={selectedWalletFilter}
          setSelectedWalletFilter={setSelectedWalletFilter}
          cashAccounts={cashAccounts}
          selectedCashFilter={selectedCashFilter}
          setSelectedCashFilter={setSelectedCashFilter}
          data={filterList()}
          onDeleteTransaction={handleDeleteTransaction}
          onViewReceipt={(tx) => setActiveReceipt(tx)}
        />
      )}

      {/* 8. All Transactions Modal */}
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
          cashAccounts={cashAccounts}
          selectedCashFilter={selectedCashFilter}
          setSelectedCashFilter={setSelectedCashFilter}
          data={filterList()}
          onDeleteTransaction={handleDeleteTransaction}
          onViewReceipt={(tx) => setActiveReceipt(tx)}
        />
      )}

      {/* 9. Voucher Receipt View */}
      {activeReceipt && (
        <TransactionReceiptModal
          transaction={activeReceipt}
          shopProfile={shopProfile}
          onClose={() => setActiveReceipt(null)}
        />
      )}

      {/* 10. Total All Accounts Balance Comprehensive Ledger Report Modal */}
      {showTotalAccountsReport && (
        <TotalAccountsReportModal
          onClose={() => setShowTotalAccountsReport(false)}
          wallets={wallets}
          cashAccounts={cashAccounts}
          transactions={transactions}
          shopProfile={shopProfile}
          selectedReportDate={selectedReportDate}
          setSelectedReportDate={setSelectedReportDate}
        />
      )}

      {/* 11. Archive & Maintenance Modal */}
      {showArchiveModal && (
        <ArchiveMaintenanceModal
          transactions={transactions}
          onClose={() => setShowArchiveModal(false)}
          onPurgeArchived={handlePurgeArchived}
          onShowToast={showToast}
        />
      )}
    </div>
  );
}
