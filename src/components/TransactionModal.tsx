import React, { useState } from 'react';
import { X, ArrowDownRight, ArrowUpRight, Calculator, Check, Wallet, Banknote } from 'lucide-react';
import { Transaction, TransactionType, WalletItem } from '../types';
import { getTodayFormatted, getCurrentTimeFormatted, formatKs } from '../utils/formatters';

interface TransactionModalProps {
  initialType?: TransactionType;
  wallets: WalletItem[];
  cashBalance: number;
  onClose: () => void;
  onSave: (transaction: Omit<Transaction, 'id'>, updateBalances: boolean) => void;
}

export const TransactionModal: React.FC<TransactionModalProps> = ({
  initialType = 'သွင်း',
  wallets,
  cashBalance,
  onClose,
  onSave,
}) => {
  const [type, setType] = useState<TransactionType>(initialType);
  const [customerName, setCustomerName] = useState('');
  const [phone, setPhone] = useState('');
  const [walletName, setWalletName] = useState<string>(wallets[0]?.name || 'KPay');
  const [amount, setAmount] = useState<string>('');
  const [commission, setCommission] = useState<string>('3000');
  const [date, setDate] = useState<string>(getTodayFormatted());
  const [time, setTime] = useState<string>(getCurrentTimeFormatted());
  const [note, setNote] = useState<string>('');
  const [autoUpdateBalances, setAutoUpdateBalances] = useState<boolean>(true);

  const numAmount = parseFloat(amount) || 0;
  const numCommission = parseFloat(commission) || 0;

  const isCashOut = type === 'ထုတ်';
  const selectedWallet = wallets.find((w) => w.name === walletName);
  const isCashAccount = walletName === 'Main Cash Box';

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

    const newTx: Omit<Transaction, 'id'> = {
      date,
      time,
      customerName: customerName.trim(),
      type,
      amount: numAmount,
      commission: numCommission,
      phone: phone.trim() || '-',
      walletName: walletName,
      accountType: isCashAccount ? 'Cash' : 'Wallet',
      note: note.trim() || undefined,
    };

    onSave(newTx, autoUpdateBalances);
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full p-6 border border-slate-100 my-auto animate-in fade-in zoom-in-95 duration-150 max-h-[95vh] overflow-y-auto">
        {/* Modal Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-5">
          <div className="flex items-center gap-2.5">
            <div
              className={`w-9 h-9 rounded-xl flex items-center justify-center ${
                isCashOut ? 'bg-red-50 text-red-600' : 'bg-emerald-50 text-emerald-600'
              }`}
            >
              {isCashOut ? <ArrowUpRight className="w-5 h-5" /> : <ArrowDownRight className="w-5 h-5" />}
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-800">
                {isCashOut ? 'ငွေထုတ် မှတ်တမ်းတင်ရန် (Cash Out)' : 'ငွေသွင်း မှတ်တမ်းတင်ရန် (Cash In)'}
              </h3>
              <p className="text-xs text-slate-400">ဘောက်ချာနှင့် ငွေစာရင်း ထည့်သွင်းခြင်း</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 flex items-center justify-center transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Type Switcher */}
        <div className="grid grid-cols-2 gap-2 bg-slate-100 p-1 rounded-xl mb-5">
          <button
            type="button"
            onClick={() => setType('သွင်း')}
            className={`py-2.5 rounded-lg text-sm font-bold flex items-center justify-center gap-1.5 transition-all ${
              !isCashOut
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <ArrowDownRight className="w-4 h-4" />
            + ငွေသွင်း (Cash In)
          </button>
          <button
            type="button"
            onClick={() => setType('ထုတ်')}
            className={`py-2.5 rounded-lg text-sm font-bold flex items-center justify-center gap-1.5 transition-all ${
              isCashOut
                ? 'bg-red-600 text-white shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <ArrowUpRight className="w-4 h-4" />
            - ငွေထုတ် (Cash Out)
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
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

          {/* Wallet / Account Selection */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center justify-between">
              <span>အသုံးပြုမည့် Wallet / ငွေစာရင်း</span>
              {selectedWallet && (
                <span className="text-indigo-600 font-semibold">
                  လက်ကျန်: {formatKs(selectedWallet.balance)}
                </span>
              )}
            </label>
            <select
              value={walletName}
              onChange={(e) => setWalletName(e.target.value)}
              className="w-full bg-slate-50 focus:bg-white border border-slate-300 focus:border-indigo-500 rounded-xl px-3.5 py-2.5 text-sm font-semibold text-slate-800 outline-none"
            >
              {wallets.map((w) => (
                <option key={w.id} value={w.name}>
                  🏦 {w.name} ({formatKs(w.balance)})
                </option>
              ))}
              <option value="Main Cash Box">💵 Main Cash Box (လက်ငင်းငွေသား: {formatKs(cashBalance)})</option>
            </select>
          </div>

          {/* Amount & Presets */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-xs font-bold text-slate-700">
                မူလ ငွေပမာဏ (Ks) <span className="text-red-500">*</span>
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
                className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-medium transition-colors"
              >
                1 သိန်း
              </button>
              <button
                type="button"
                onClick={() => setFixedAmount(500000)}
                className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-medium transition-colors"
              >
                5 သိန်း
              </button>
              <button
                type="button"
                onClick={() => setFixedAmount(1000000)}
                className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-medium transition-colors"
              >
                10 သိန်း
              </button>
              <button
                type="button"
                onClick={() => addAmount(100000)}
                className="px-2.5 py-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-lg text-xs font-semibold transition-colors"
              >
                +1 သိန်း
              </button>
              <button
                type="button"
                onClick={() => addAmount(500000)}
                className="px-2.5 py-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-lg text-xs font-semibold transition-colors"
              >
                +5 သိန်း
              </button>
            </div>
          </div>

          {/* Commission & Presets */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-xs font-bold text-slate-700">
                ကော်မရှင်ခ (Ks)
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
                onClick={() => setCommission('1000')}
                className="px-2 py-0.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 rounded-md text-xs font-medium"
              >
                1,000
              </button>
              <button
                type="button"
                onClick={() => setCommission('2000')}
                className="px-2 py-0.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 rounded-md text-xs font-medium"
              >
                2,000
              </button>
              <button
                type="button"
                onClick={() => setCommission('3000')}
                className="px-2 py-0.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 rounded-md text-xs font-medium"
              >
                3,000
              </button>
              <button
                type="button"
                onClick={() => setCommission('5000')}
                className="px-2 py-0.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 rounded-md text-xs font-medium"
              >
                5,000
              </button>
              <button
                type="button"
                onClick={() => calculateCommissionPercent(0.5)}
                className="px-2 py-0.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-md text-xs font-medium"
              >
                0.5%
              </button>
              <button
                type="button"
                onClick={() => calculateCommissionPercent(1.0)}
                className="px-2 py-0.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-md text-xs font-medium"
              >
                1%
              </button>
            </div>
          </div>

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
              placeholder="ဥပမာ - ရွှေဘိုငွေလွှဲ / Wave Acc သို့"
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
              <span>လက်ကျန်ငွေများ အလိုအလျောက် ချိန်ညှိသိမ်းဆည်းမည်</span>
            </label>

            {autoUpdateBalances && numAmount > 0 && (
              <div className="text-xs text-indigo-700/90 pl-6 space-y-1">
                {!isCashAccount && selectedWallet && (
                  <div>
                    • <b>{walletName}</b>: {formatKs(selectedWallet.balance)} →{' '}
                    <span className="font-bold text-indigo-950">
                      {formatKs(
                        isCashOut
                          ? selectedWallet.balance + numAmount
                          : selectedWallet.balance - numAmount
                      )}
                    </span>
                  </div>
                )}
                <div>
                  • <b>Cash လက်ငင်းငွေ</b>: {formatKs(cashBalance)} →{' '}
                  <span className="font-bold text-indigo-950">
                    {formatKs(
                      isCashOut
                        ? cashBalance - numAmount + numCommission
                        : cashBalance + numAmount + numCommission
                    )}
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-sm font-bold transition-colors"
            >
              ပယ်ဖျက်မည်
            </button>
            <button
              type="submit"
              className={`flex-1 py-3 text-white rounded-xl text-sm font-bold shadow-md transition-all ${
                isCashOut
                  ? 'bg-red-600 hover:bg-red-700 shadow-red-600/20'
                  : 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-600/20'
              }`}
            >
              သိမ်းဆည်းမည် ✓
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
