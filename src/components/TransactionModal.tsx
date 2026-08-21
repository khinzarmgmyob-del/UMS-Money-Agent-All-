import React, { useState, useEffect } from 'react';
import {
  X,
  ArrowDownRight,
  ArrowUpRight,
  ArrowLeftRight,
  Check,
  Coins,
  Percent,
  DollarSign,
  Wallet,
  Banknote,
  Building2,
} from 'lucide-react';
import { Transaction, TransactionType, WalletItem, CashAccountItem, CommissionMode, CommissionChannel } from '../types';
import { getTodayFormatted, getCurrentTimeFormatted, formatKs } from '../utils/formatters';

interface TransactionModalProps {
  initialType?: TransactionType;
  wallets: WalletItem[];
  cashAccounts: CashAccountItem[];
  onClose: () => void;
  onSave: (transaction: Omit<Transaction, 'id'>, updateBalances: boolean) => void;
}

export const TransactionModal: React.FC<TransactionModalProps> = ({
  initialType = 'သွင်း',
  wallets,
  cashAccounts,
  onClose,
  onSave,
}) => {
  const [type, setType] = useState<TransactionType>(initialType);
  const [customerName, setCustomerName] = useState('');
  const [phone, setPhone] = useState('');
  const [walletName, setWalletName] = useState<string>(wallets[0]?.name || 'KPay');
  const [targetWalletName, setTargetWalletName] = useState<string>(
    wallets.length > 1 ? wallets[1].name : wallets[0]?.name || 'WaveMoney'
  );
  const [cashAccountName, setCashAccountName] = useState<string>(
    cashAccounts[0]?.name || 'ဆိုင်ရှေ့ငွေပုံး (Counter Box)'
  );

  // Commission Channel & Target Wallet for Commission
  const [commissionChannel, setCommissionChannel] = useState<CommissionChannel>('Cash');
  const [commissionWalletName, setCommissionWalletName] = useState<string>(
    wallets[0]?.name || 'KPay'
  );

  const [amount, setAmount] = useState<string>('');
  const [commission, setCommission] = useState<string>(initialType === 'လွှဲပြောင်း' ? '1000' : '3000');
  const [commissionMode, setCommissionMode] = useState<CommissionMode>('deduct'); // Default 'deduct' for cash out
  const [date, setDate] = useState<string>(getTodayFormatted());
  const [time, setTime] = useState<string>(getCurrentTimeFormatted());
  const [note, setNote] = useState<string>('');
  const [autoUpdateBalances, setAutoUpdateBalances] = useState<boolean>(true);

  const numAmount = parseFloat(amount) || 0;
  const numCommission = parseFloat(commission) || 0;

  const isCashOut = type === 'ထုတ်';
  const isTransfer = type === 'လွှဲပြောင်း';
  const isCashIn = type === 'သွင်း';

  const selectedWallet = wallets.find((w) => w.name === walletName) || wallets[0];
  const selectedTargetWallet = wallets.find((w) => w.name === targetWalletName) || wallets[1] || wallets[0];
  const selectedCashAccount = cashAccounts.find((c) => c.name === cashAccountName) || cashAccounts[0];
  const selectedCommWallet = wallets.find((w) => w.name === commissionWalletName) || wallets[0];

  // For Cash Out: Calculate the actual Cash given to customer
  const netCashPayoutToCustomer = isCashOut
    ? commissionMode === 'deduct'
      ? Math.max(0, numAmount - numCommission)
      : numAmount
    : numAmount;

  // Amount preset helper
  const addAmount = (addVal: number) => {
    setAmount((prev) => {
      const current = parseFloat(prev) || 0;
      return (current + addVal).toString();
    });
  };

  const setFixedAmount = (val: number) => {
    setAmount(val.toString());
  };

  // Commission presets
  const calculateCommissionPercent = (percent: number) => {
    if (numAmount > 0) {
      const comm = Math.round((numAmount * percent) / 100);
      setCommission(comm.toString());
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customerName.trim() || numAmount <= 0) {
      alert('ကျေးဇူးပြု၍ ဖောက်သည်အမည် နှင့် ငွေပမာဏ ကို မှန်ကန်စွာ ဖြည့်စွက်ပါ။');
      return;
    }

    if (isTransfer && walletName === targetWalletName) {
      alert('လွှဲထုတ်မည့် Wallet နှင့် လက်ခံမည့် Wallet သည် မတူညီသော အကောင့်များ ဖြစ်ရပါမည်။');
      return;
    }

    if (isCashOut && commissionMode === 'deduct' && numAmount < numCommission) {
      alert('ကော်မရှင်ခ သည် မူလငွေပမာဏထက် မများနိုင်ပါ။');
      return;
    }

    const newTx: Omit<Transaction, 'id'> = {
      date,
      time,
      customerName: customerName.trim(),
      type,
      amount: numAmount,
      commission: numCommission,
      commissionMode: isCashOut ? commissionMode : undefined,
      commissionChannel: isTransfer ? commissionChannel : isCashIn ? 'Cash' : (commissionMode === 'deduct' ? 'Wallet' : 'Cash'),
      commissionWalletName: isTransfer && commissionChannel === 'Wallet' ? commissionWalletName : undefined,
      netPayout: isCashOut ? netCashPayoutToCustomer : undefined,
      phone: phone.trim() || '-',
      walletName: walletName,
      targetWalletName: isTransfer ? targetWalletName : undefined,
      cashAccountName: cashAccountName,
      accountType: 'Wallet',
      note: note.trim() || (isTransfer ? `${walletName} မှ ${targetWalletName} သို့ လွှဲပြောင်း` : undefined),
    };

    onSave(newTx, autoUpdateBalances);
  };

  // Calculate live preview deltas
  const walletBalanceBefore = selectedWallet ? selectedWallet.balance : 0;
  const targetWalletBalanceBefore = selectedTargetWallet ? selectedTargetWallet.balance : 0;
  const commWalletBalanceBefore = selectedCommWallet ? selectedCommWallet.balance : 0;
  const cashBalanceBefore = selectedCashAccount ? selectedCashAccount.balance : 0;

  // After calculations for Transfer
  let transferWalletAfter = walletBalanceBefore - numAmount;
  let transferTargetAfter = targetWalletBalanceBefore + numAmount;
  let transferCommWalletAfter = commWalletBalanceBefore;
  let transferCashAfter = cashBalanceBefore;

  if (isTransfer) {
    if (commissionChannel === 'Cash') {
      transferCashAfter = cashBalanceBefore + numCommission;
    } else {
      // Commission in wallet
      if (commissionWalletName === walletName) {
        transferWalletAfter += numCommission;
      } else if (commissionWalletName === targetWalletName) {
        transferTargetAfter += numCommission;
      } else {
        transferCommWalletAfter = commWalletBalanceBefore + numCommission;
      }
    }
  }

  // After calculations for Cash In / Out
  const cashInCashAfter = cashBalanceBefore + numAmount + numCommission;
  const cashInWalletAfter = walletBalanceBefore - numAmount;

  const cashOutCashAfter = commissionMode === 'deduct'
    ? cashBalanceBefore - (numAmount - numCommission)
    : cashBalanceBefore - numAmount + numCommission;
  const cashOutWalletAfter = walletBalanceBefore + numAmount;

  return (
    <div 
      className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs overflow-y-auto overscroll-contain flex items-center justify-center p-2.5 sm:p-4 md:p-6"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-xl bg-white rounded-2xl sm:rounded-3xl shadow-2xl p-4 sm:p-5 md:p-6 border border-slate-100 animate-in fade-in zoom-in-95 duration-150 z-10 my-auto max-h-[94vh] md:max-h-[90vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between pb-3.5 border-b border-slate-100 mb-3 shrink-0">
          <div className="flex items-center gap-2.5">
            <div
              className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                isTransfer
                  ? 'bg-sky-50 text-sky-600'
                  : isCashOut
                  ? 'bg-red-50 text-red-600'
                  : 'bg-emerald-50 text-emerald-600'
              }`}
            >
              {isTransfer ? (
                <ArrowLeftRight className="w-5 h-5" />
              ) : isCashOut ? (
                <ArrowUpRight className="w-5 h-5" />
              ) : (
                <ArrowDownRight className="w-5 h-5" />
              )}
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-bold text-slate-800">
                {isTransfer
                  ? 'Wallet ချင်း လွှဲပြောင်းလဲလှယ်ခြင်း (Wallet to Wallet)'
                  : isCashOut
                  ? 'ငွေထုတ် မှတ်တမ်းတင်ရန် (Cash Out)'
                  : 'ငွေသွင်း မှတ်တမ်းတင်ရန် (Cash In)'}
              </h3>
              <p className="text-[11px] text-slate-400">ဘောက်ချာနှင့် ငွေစာရင်း ထည့်သွင်းခြင်း</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 flex items-center justify-center transition-colors cursor-pointer shrink-0"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 3-Way Type Switcher: သွင်း / ထုတ် / Wallet to Wallet */}
        <div className="grid grid-cols-3 gap-1.5 sm:gap-2 bg-slate-100 p-1.5 rounded-xl text-xs sm:text-sm font-bold mb-3 shrink-0">
          <button
            type="button"
            onClick={() => {
              setType('သွင်း');
              setCommission('3000');
            }}
            className={`py-2 px-1.5 sm:px-2.5 rounded-lg flex items-center justify-center gap-1 sm:gap-1.5 transition-all cursor-pointer ${
              isCashIn
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <ArrowDownRight className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" />
            <span className="truncate">↘ ငွေသွင်း</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setType('ထုတ်');
              setCommission('3000');
            }}
            className={`py-2 px-1.5 sm:px-2.5 rounded-lg flex items-center justify-center gap-1 sm:gap-1.5 transition-all cursor-pointer ${
              isCashOut
                ? 'bg-red-600 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <ArrowUpRight className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" />
            <span className="truncate">↗ ငွေထုတ်</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setType('လွှဲပြောင်း');
              setCommission('1000');
            }}
            className={`py-2 px-1.5 sm:px-2.5 rounded-lg flex items-center justify-center gap-1 sm:gap-1.5 transition-all cursor-pointer ${
              isTransfer
                ? 'bg-sky-600 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <ArrowLeftRight className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" />
            <span className="truncate">⇄ W2W လွှဲ</span>
          </button>
        </div>

        <form id="transaction-form" onSubmit={handleSubmit} className="flex-1 overflow-y-auto pr-1 space-y-4 -mr-1">
            {/* Customer Name & Phone */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  ဖောက်သည် အမည် <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="ဥပမာ - ဦးမြတ်စိုး"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  className="w-full bg-slate-50 focus:bg-white border border-slate-300 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 rounded-xl px-3.5 py-2.5 text-sm font-medium text-slate-800 transition-all outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  ဖုန်းနံပါတ်
                </label>
                <input
                  type="text"
                  placeholder="09..."
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full bg-slate-50 focus:bg-white border border-slate-300 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 rounded-xl px-3.5 py-2.5 text-sm font-medium text-slate-800 transition-all outline-none"
                />
              </div>
            </div>

            {/* Account Selections */}
            {isTransfer ? (
              /* WALLET TO WALLET ACCOUNT PICKERS WITH BOTH CASH & WALLET COMMISSION OPTIONS */
              <div className="space-y-3.5 bg-sky-50/70 p-3.5 sm:p-4 rounded-2xl border border-sky-200">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {/* Source Wallet (From) */}
                  <div>
                    <label className="block text-xs font-bold text-sky-900 mb-1 flex items-center gap-1">
                      <Wallet className="w-3.5 h-3.5 text-sky-600" />
                      လွှဲထုတ်မည့် Wallet (From)
                    </label>
                    <select
                      value={walletName}
                      onChange={(e) => setWalletName(e.target.value)}
                      className="w-full bg-white border border-sky-300 focus:border-sky-500 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 outline-none"
                    >
                      {wallets.map((w) => (
                        <option key={w.id} value={w.name}>
                          {w.name} ({formatKs(w.balance)})
                        </option>
                      ))}
                    </select>
                    {selectedWallet && (
                      <div className="text-[11px] text-slate-500 mt-1">
                        လက်ကျန်: <span className="font-bold text-sky-700">{formatKs(selectedWallet.balance)}</span>
                      </div>
                    )}
                  </div>

                  {/* Target Wallet (To) */}
                  <div>
                    <label className="block text-xs font-bold text-indigo-900 mb-1 flex items-center gap-1">
                      <Wallet className="w-3.5 h-3.5 text-indigo-600" />
                      လက်ခံမည့် Wallet (To)
                    </label>
                    <select
                      value={targetWalletName}
                      onChange={(e) => setTargetWalletName(e.target.value)}
                      className="w-full bg-white border border-indigo-300 focus:border-indigo-500 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 outline-none"
                    >
                      {wallets.map((w) => (
                        <option key={w.id} value={w.name}>
                          {w.name} ({formatKs(w.balance)})
                        </option>
                      ))}
                    </select>
                    {selectedTargetWallet && (
                      <div className="text-[11px] text-slate-500 mt-1">
                        လက်ကျန်: <span className="font-bold text-indigo-700">{formatKs(selectedTargetWallet.balance)}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* COMMISSION RECEIVING CHANNEL: CASH VS WALLET SELECTOR */}
                <div className="pt-2 border-t border-sky-200/80 space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-slate-800 flex items-center gap-1">
                      <Coins className="w-3.5 h-3.5 text-amber-600" />
                      ကော်မရှင် / ဝန်ဆောင်ခ ရငွေထည့်မည့် အကောင့်ပုံစံ:
                    </label>
                    <span className="text-[11px] font-semibold text-sky-800 bg-sky-100 px-2 py-0.5 rounded-md">
                      {commissionChannel === 'Cash' ? '💵 ငွေသား' : '🏦 Wallet'}
                    </span>
                  </div>

                  {/* Channel Switch Tabs */}
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setCommissionChannel('Cash')}
                      className={`p-2 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 border transition-all cursor-pointer ${
                        commissionChannel === 'Cash'
                          ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                          : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
                      }`}
                    >
                      <Banknote className="w-3.5 h-3.5" />
                      <span>ငွေသားအကောင့် (Cash)</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setCommissionChannel('Wallet')}
                      className={`p-2 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 border transition-all cursor-pointer ${
                        commissionChannel === 'Wallet'
                          ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs'
                          : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
                      }`}
                    >
                      <Wallet className="w-3.5 h-3.5" />
                      <span>Wallet အကောင့် (Wallet)</span>
                    </button>
                  </div>

                  {/* Dependent Dropdown */}
                  {commissionChannel === 'Cash' ? (
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                        ကော်မရှင်ငွေ လက်ခံမည့် ငွေသားအကောက် ရွေးရန်:
                      </label>
                      <select
                        value={cashAccountName}
                        onChange={(e) => setCashAccountName(e.target.value)}
                        className="w-full bg-white border border-emerald-300 focus:border-emerald-500 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 outline-none"
                      >
                        {cashAccounts.map((c) => (
                          <option key={c.id} value={c.name}>
                            {c.name} ({formatKs(c.balance)})
                          </option>
                        ))}
                      </select>
                    </div>
                  ) : (
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                        ကော်မရှင်ငွေ လက်ခံမည့် Wallet အကောက် ရွေးရန်:
                      </label>
                      <select
                        value={commissionWalletName}
                        onChange={(e) => setCommissionWalletName(e.target.value)}
                        className="w-full bg-white border border-indigo-300 focus:border-indigo-500 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 outline-none"
                      >
                        {wallets.map((w) => (
                          <option key={w.id} value={w.name}>
                            {w.name} ({formatKs(w.balance)})
                          </option>
                        ))}
                      </select>
                      {selectedCommWallet && (
                        <div className="text-[11px] text-slate-500 mt-1">
                          လက်ကျန်: <span className="font-bold text-indigo-700">{formatKs(selectedCommWallet.balance)}</span>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            ) : (
              /* STANDARD CASH IN / OUT ACCOUNT PICKERS */
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-slate-50 p-3.5 rounded-xl border border-slate-200">
                {/* Wallet Selection */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center justify-between">
                    <span className="flex items-center gap-1">
                      <Wallet className="w-3.5 h-3.5 text-indigo-600" />
                      {isCashOut ? 'လွှဲဝင်မည့် Wallet' : 'လွှဲပေးမည့် Wallet'}
                    </span>
                  </label>
                  <select
                    value={walletName}
                    onChange={(e) => setWalletName(e.target.value)}
                    className="w-full bg-white border border-slate-300 focus:border-indigo-500 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 outline-none"
                  >
                    {wallets.map((w) => (
                      <option key={w.id} value={w.name}>
                        {w.name} ({formatKs(w.balance)})
                      </option>
                    ))}
                  </select>
                  {selectedWallet && (
                    <div className="text-[11px] text-slate-500 mt-1">
                      လက်ကျန်: <span className="font-bold text-indigo-600">{formatKs(selectedWallet.balance)}</span>
                    </div>
                  )}
                </div>

                {/* Cash Account Selection */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center justify-between">
                    <span className="flex items-center gap-1">
                      <Banknote className="w-3.5 h-3.5 text-emerald-600" />
                      {isCashOut ? 'ငွေသားထုတ်ပေးမည့် အကောက်' : 'ငွေသားလက်ခံမည့် အကောက်'}
                    </span>
                  </label>
                  <select
                    value={cashAccountName}
                    onChange={(e) => setCashAccountName(e.target.value)}
                    className="w-full bg-white border border-slate-300 focus:border-emerald-500 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 outline-none"
                  >
                    {cashAccounts.map((c) => (
                      <option key={c.id} value={c.name}>
                        {c.name} ({formatKs(c.balance)})
                      </option>
                    ))}
                  </select>
                  {selectedCashAccount && (
                    <div className="text-[11px] text-slate-500 mt-1">
                      လက်ကျန်: <span className="font-bold text-emerald-600">{formatKs(selectedCashAccount.balance)}</span>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Amount & Presets */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-bold text-slate-700">
                  {isTransfer ? 'လွှဲပြောင်းမည့် ငွေပမာဏ (Ks)' : 'မူလ ငွေပမာဏ (Ks)'} <span className="text-red-500">*</span>
                </label>
                <span className="text-xs text-slate-500 font-medium">
                  {numAmount > 0 ? formatKs(numAmount) : ''}
                </span>
              </div>
              <input
                type="number"
                required
                min="1"
                placeholder="0"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="w-full bg-slate-50 focus:bg-white border border-slate-300 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 rounded-xl px-3.5 py-2.5 text-lg font-bold text-slate-800 transition-all outline-none"
              />
              {/* Quick Amount Pills */}
              <div className="flex flex-wrap gap-1.5 mt-2">
                <button
                  type="button"
                  onClick={() => setFixedAmount(100000)}
                  className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-medium transition-colors cursor-pointer"
                >
                  1 သိန်း
                </button>
                <button
                  type="button"
                  onClick={() => setFixedAmount(500000)}
                  className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-medium transition-colors cursor-pointer"
                >
                  5 သိန်း
                </button>
                <button
                  type="button"
                  onClick={() => setFixedAmount(1000000)}
                  className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-medium transition-colors cursor-pointer"
                >
                  10 သိန်း
                </button>
                <button
                  type="button"
                  onClick={() => addAmount(100000)}
                  className="px-2.5 py-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-lg text-xs font-semibold transition-colors cursor-pointer"
                >
                  +1 သိန်း
                </button>
                <button
                  type="button"
                  onClick={() => addAmount(500000)}
                  className="px-2.5 py-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-lg text-xs font-semibold transition-colors cursor-pointer"
                >
                  +5 သိန်း
                </button>
              </div>
            </div>

            {/* Commission & Presets */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-bold text-slate-700">
                  {isTransfer ? 'လွှဲခ / ဝန်ဆောင်ခ (Ks)' : 'ကော်မရှင်ခ (Ks)'}
                </label>
                <span className="text-xs text-emerald-600 font-bold">
                  +{formatKs(numCommission)}
                </span>
              </div>
              <div className="flex gap-2">
                <input
                  type="number"
                  min="0"
                  placeholder="0"
                  value={commission}
                  onChange={(e) => setCommission(e.target.value)}
                  className="w-full bg-slate-50 focus:bg-white border border-slate-300 focus:border-indigo-500 rounded-xl px-3.5 py-2 text-sm font-bold text-emerald-700 outline-none"
                />
              </div>
              {/* Quick Commission Calculator */}
              <div className="flex flex-wrap gap-1.5 mt-2">
                <button
                  type="button"
                  onClick={() => setCommission('0')}
                  className="px-2 py-0.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-md text-xs font-medium cursor-pointer"
                >
                  0 Ks
                </button>
                <button
                  type="button"
                  onClick={() => setCommission('1000')}
                  className="px-2 py-0.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 rounded-md text-xs font-medium cursor-pointer"
                >
                  1,000
                </button>
                <button
                  type="button"
                  onClick={() => setCommission('2000')}
                  className="px-2 py-0.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 rounded-md text-xs font-medium cursor-pointer"
                >
                  2,000
                </button>
                <button
                  type="button"
                  onClick={() => setCommission('3000')}
                  className="px-2 py-0.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 rounded-md text-xs font-medium cursor-pointer"
                >
                  3,000
                </button>
                <button
                  type="button"
                  onClick={() => calculateCommissionPercent(0.5)}
                  className="px-2 py-0.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-md text-xs font-medium cursor-pointer"
                >
                  0.5%
                </button>
                <button
                  type="button"
                  onClick={() => calculateCommissionPercent(1.0)}
                  className="px-2 py-0.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-md text-xs font-medium cursor-pointer"
                >
                  1%
                </button>
              </div>
            </div>

            {/* COMMISSION PAYMENT MODE SELECTION (FOR CASH OUT) */}
            {isCashOut && (
              <div className="p-3.5 bg-amber-50/80 border border-amber-200 rounded-xl space-y-2.5">
                <label className="block text-xs font-bold text-amber-900">
                  ⚙️ ကော်မရှင်ခ ရှင်းယူမည့် ပုံစံ ရွေးချယ်ရန်:
                </label>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {/* Option 1: Deduct from Amount (မူလငွေမှ နုတ်ပေးမည်) */}
                  <button
                    type="button"
                    onClick={() => setCommissionMode('deduct')}
                    className={`p-3 rounded-xl text-left border transition-all flex flex-col justify-between cursor-pointer ${
                      commissionMode === 'deduct'
                        ? 'bg-white border-amber-500 ring-2 ring-amber-400/30 shadow-xs'
                        : 'bg-amber-100/40 border-amber-200 hover:bg-amber-100/70 text-slate-700'
                    }`}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <input
                        type="radio"
                        name="commissionMode"
                        checked={commissionMode === 'deduct'}
                        onChange={() => setCommissionMode('deduct')}
                        className="w-4 h-4 text-amber-600"
                      />
                      <span className="text-xs font-bold text-amber-950">
                        မူလငွေမှ နုတ်ပေးမည်
                      </span>
                    </div>
                    <span className="text-[11px] text-amber-800 pl-6">
                      မူလငွေထဲမှ ကော်မရှင် နုတ်ပြီး ကျန်ငွေကိုသာ ဖောက်သည်သို့ ပေးအပ်မည်
                    </span>
                  </button>

                  {/* Option 2: Pay Separately (သက်သက် ပေးမည်) */}
                  <button
                    type="button"
                    onClick={() => setCommissionMode('separate')}
                    className={`p-3 rounded-xl text-left border transition-all flex flex-col justify-between cursor-pointer ${
                      commissionMode === 'separate'
                        ? 'bg-white border-amber-500 ring-2 ring-amber-400/30 shadow-xs'
                        : 'bg-amber-100/40 border-amber-200 hover:bg-amber-100/70 text-slate-700'
                    }`}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <input
                        type="radio"
                        name="commissionMode"
                        checked={commissionMode === 'separate'}
                        onChange={() => setCommissionMode('separate')}
                        className="w-4 h-4 text-amber-600"
                      />
                      <span className="text-xs font-bold text-amber-950">
                        သက်သက် ပေးမည်
                      </span>
                    </div>
                    <span className="text-[11px] text-amber-800 pl-6">
                      ဖောက်သည်သည် မူလငွေအပြည့်ရယူပြီး ကော်မရှင်ခကို သီးသန့်ပေးမည်
                    </span>
                  </button>
                </div>

                {/* Dynamic Auto-Calculated Payout Box */}
                {numAmount > 0 && (
                  <div className="mt-2 p-3 bg-white border border-amber-300 rounded-xl space-y-1.5">
                    <div className="flex justify-between text-xs text-slate-600">
                      <span>မူလ လွှဲဝင်ငွေ (Wallet Amount):</span>
                      <span className="font-semibold">{formatKs(numAmount)}</span>
                    </div>
                    <div className="flex justify-between text-xs text-amber-700">
                      <span>
                        ကော်မရှင်ခ (Commission):{' '}
                        {commissionMode === 'deduct' ? '(နုတ်ယူမည်)' : '(သီးသန့်ပေး)'}
                      </span>
                      <span className="font-semibold">
                        {commissionMode === 'deduct' ? `- ${formatKs(numCommission)}` : `+ ${formatKs(numCommission)}`}
                      </span>
                    </div>
                    <div className="pt-1.5 border-t border-dashed border-amber-200 flex justify-between items-center">
                      <span className="text-xs font-bold text-slate-900">
                        👉 ဖောက်သည်သို့ လက်ငင်းပေးရမည့်ငွေ:
                      </span>
                      <span className="text-base font-black text-rose-600">
                        {formatKs(netCashPayoutToCustomer)}
                      </span>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Date & Time */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">နေ့စွဲ</label>
                <input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-semibold text-slate-800"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">အချိန်</label>
                <input
                  type="time"
                  value={time}
                  onChange={(e) => setTime(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-semibold text-slate-800"
                />
              </div>
            </div>

            {/* Optional Note */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">မှတ်ချက် (Note)</label>
              <input
                type="text"
                placeholder={isTransfer ? 'ဥပမာ - KPay မှ Wave သို့ လဲလှယ်ခြင်း' : 'ဥပမာ - ရွှေဘိုငွေလွှဲ'}
                value={note}
                onChange={(e) => setNote(e.target.value)}
                className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-800 outline-none"
              />
            </div>

            {/* Auto Balance Update Option & Preview */}
            <div className="p-3.5 bg-indigo-50/70 border border-indigo-100 rounded-xl space-y-2">
              <label className="flex items-center gap-2 text-xs font-bold text-indigo-900 cursor-pointer">
                <input
                  type="checkbox"
                  checked={autoUpdateBalances}
                  onChange={(e) => setAutoUpdateBalances(e.target.checked)}
                  className="w-4 h-4 text-indigo-600 rounded"
                />
                <span>လက်ကျန်ငွေများ အလိုအလျောက် ချိန်ညှိသိမ်းဆည်းမည် (Auto Double-Entry)</span>
              </label>

              {autoUpdateBalances && numAmount > 0 && (
                <div className="text-xs text-indigo-700/90 pl-6 space-y-1.5 pt-1 border-t border-indigo-100">
                  {isTransfer ? (
                    <>
                      <div className="flex items-center justify-between">
                        <span>
                          📤 <b>{walletName}</b> (လွှဲထုတ် -):
                        </span>
                        <span className="font-mono">
                          {formatKs(walletBalanceBefore)} → <b className="text-indigo-950">{formatKs(transferWalletAfter)}</b>
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span>
                          📥 <b>{targetWalletName}</b> (လက်ခံ +):
                        </span>
                        <span className="font-mono">
                          {formatKs(targetWalletBalanceBefore)} → <b className="text-indigo-950">{formatKs(transferTargetAfter)}</b>
                        </span>
                      </div>
                      {numCommission > 0 && (
                        commissionChannel === 'Cash' ? (
                          <div className="flex items-center justify-between text-emerald-800">
                            <span>
                              💵 <b>{cashAccountName}</b> (ငွေသား ကော်မရှင် +):
                            </span>
                            <span className="font-mono">
                              {formatKs(cashBalanceBefore)} → <b className="text-emerald-950">{formatKs(transferCashAfter)}</b>
                            </span>
                          </div>
                        ) : (
                          <div className="flex items-center justify-between text-purple-800">
                            <span>
                              🏦 <b>{commissionWalletName}</b> (Wallet ကော်မရှင် +):
                            </span>
                            <span className="font-mono">
                              {commissionWalletName === walletName
                                ? `${formatKs(walletBalanceBefore)} → ${formatKs(transferWalletAfter)}`
                                : commissionWalletName === targetWalletName
                                ? `${formatKs(targetWalletBalanceBefore)} → ${formatKs(transferTargetAfter)}`
                                : `${formatKs(commWalletBalanceBefore)} → ${formatKs(transferCommWalletAfter)}`}
                            </span>
                          </div>
                        )
                      )}
                    </>
                  ) : (
                    <>
                      <div className="flex items-center justify-between">
                        <span>
                          📱 <b>{walletName}</b> ({isCashOut ? 'တိုးမည် +' : 'နုတ်မည် -'}):
                        </span>
                        <span className="font-mono">
                          {formatKs(walletBalanceBefore)} → <b className="text-indigo-950">{formatKs(isCashOut ? cashOutWalletAfter : cashInWalletAfter)}</b>
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span>
                          💵 <b>{cashAccountName}</b> ({isCashOut ? 'နုတ်မည် -' : 'တိုးမည် +'}):
                        </span>
                        <span className="font-mono">
                          {formatKs(cashBalanceBefore)} → <b className="text-indigo-950">{formatKs(isCashOut ? cashOutCashAfter : cashInCashAfter)}</b>
                        </span>
                      </div>
                    </>
                  )}
                </div>
              )}
            </div>

            {/* Action Buttons */}
            <div className="flex gap-2 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs sm:text-sm font-bold transition-colors cursor-pointer"
              >
                ပယ်ဖျက်မည်
              </button>
              <button
                type="submit"
                className={`flex-1 py-3 text-white rounded-xl text-xs sm:text-sm font-bold shadow-md transition-all cursor-pointer ${
                  isTransfer
                    ? 'bg-sky-600 hover:bg-sky-700 shadow-sky-600/20'
                    : isCashOut
                    ? 'bg-red-600 hover:bg-red-700 shadow-red-600/20'
                    : 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-600/20'
                }`}
              >
                {isTransfer ? 'လွှဲပြောင်း သိမ်းဆည်းမည် ✓' : 'သိမ်းဆည်းမည် ✓'}
              </button>
            </div>
          </form>
        </div>
    </div>
  );
};
