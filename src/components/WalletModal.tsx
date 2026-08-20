import React, { useState, useEffect } from 'react';
import { X, Wallet, Plus, Trash2, Edit3, ShieldAlert } from 'lucide-react';
import { WalletItem } from '../types';
import { getTodayFormatted, formatKs } from '../utils/formatters';

interface WalletModalProps {
  wallets: WalletItem[];
  onClose: () => void;
  onAddWallet: (wallet: Omit<WalletItem, 'id'>) => void;
  onUpdateWallet: (wallet: WalletItem) => void;
  onDeleteWallet: (id: number) => void;
}

const PRESET_WALLETS = [
  'KPay (Personal)',
  'KPay (Agent)',
  'WaveMoney (Agent)',
  'CB Pay',
  'AYA Pay',
  'KBZ Banking (iBanking)',
  'Yoma Next',
  'TrueMoney',
  'UAB Pay',
];

export const WalletModal: React.FC<WalletModalProps> = ({
  wallets,
  onClose,
  onAddWallet,
  onUpdateWallet,
  onDeleteWallet,
}) => {
  const [editingWallet, setEditingWallet] = useState<WalletItem | null>(null);
  const [name, setName] = useState('');
  const [balance, setBalance] = useState('');
  const [date, setDate] = useState(getTodayFormatted());
  const [accountNumber, setAccountNumber] = useState('');

  const handleStartEdit = (w: WalletItem) => {
    setEditingWallet(w);
    setName(w.name);
    setBalance(w.balance.toString());
    setDate(w.updatedDate || getTodayFormatted());
    setAccountNumber(w.accountNumber || '');
  };

  const handleResetForm = () => {
    setEditingWallet(null);
    setName('');
    setBalance('');
    setDate(getTodayFormatted());
    setAccountNumber('');
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || balance === '') {
      alert('ကျေးဇူးပြု၍ Wallet အမည်နှင့် လက်ကျန်ငွေ ဖြည့်စွက်ပါ။');
      return;
    }

    const numBal = parseFloat(balance) || 0;

    if (editingWallet) {
      onUpdateWallet({
        ...editingWallet,
        name: name.trim(),
        balance: numBal,
        updatedDate: date,
        accountNumber: accountNumber.trim() || undefined,
      });
    } else {
      onAddWallet({
        name: name.trim(),
        balance: numBal,
        updatedDate: date,
        accountNumber: accountNumber.trim() || undefined,
      });
    }

    handleResetForm();
  };

  return (
    <div 
      className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs overflow-y-auto p-3 sm:p-6 flex justify-center items-center"
      onClick={onClose}
    >
      <div 
        className="relative w-full max-w-xl bg-white rounded-2xl sm:rounded-3xl shadow-2xl p-4 sm:p-6 border border-slate-100 my-auto animate-in fade-in zoom-in-95 duration-150 z-10"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-5">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center">
              <Wallet className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-bold text-slate-800">
                👛 Wallet များ စီမံခန့်ခွဲမှု
              </h3>
              <p className="text-[11px] text-slate-400">Wallet အသစ်ထည့်ခြင်း နှင့် လက်ကျန်ငွေ ပြင်ဆင်ခြင်း</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 flex items-center justify-center transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Existing Wallets List */}
        <div className="mb-6">
          <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
            {wallets.map((w) => (
              <div
                key={w.id}
                className="flex items-center justify-between p-3 bg-slate-50 border border-slate-200 rounded-xl hover:border-indigo-200 transition-colors"
              >
                <div>
                  <div className="font-bold text-sm text-slate-800">{w.name}</div>
                  <div className="text-xs text-slate-500">
                    {w.accountNumber ? `Acc: ${w.accountNumber} • ` : ''}
                    နောက်ဆုံးပြင်: {w.updatedDate}
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="text-right">
                    <div className="font-bold text-indigo-600 text-sm">{formatKs(w.balance)}</div>
                    <div className="text-xs text-slate-400">{(w.balance / 100000).toFixed(1)} သိန်း</div>
                  </div>
                  <button
                    onClick={() => handleStartEdit(w)}
                    className="p-1.5 text-slate-500 hover:text-indigo-600 hover:bg-white rounded-lg transition-colors"
                    title="ပြင်ဆင်မည်"
                  >
                    <Edit3 className="w-4 h-4" />
                  </button>
                  {wallets.length > 1 && (
                    <button
                      onClick={() => {
                        if (confirm(`'${w.name}' Wallet ကို ဖျက်ရန် သေချာပါသလား?`)) {
                          onDeleteWallet(w.id);
                        }
                      }}
                      className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-white rounded-lg transition-colors"
                      title="ဖျက်မည်"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Add or Edit Form */}
        <form onSubmit={handleSubmit} className="p-4 bg-slate-50/80 border border-slate-200 rounded-2xl space-y-3.5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-800">
              {editingWallet ? `✏️ '${editingWallet.name}' ကို ပြင်ဆင်ရန်` : '➕ Wallet အသစ် ထည့်သွင်းရန်'}
            </span>
            {editingWallet && (
              <button
                type="button"
                onClick={handleResetForm}
                className="text-xs text-slate-500 hover:text-slate-800 underline"
              >
                အသစ်ထည့်မည်သို့ ပြောင်းရန်
              </button>
            )}
          </div>

          {!editingWallet && (
            <div>
              <label className="block text-[11px] font-semibold text-slate-500 mb-1">
                အသုံးများသော အမည်များ ရွေးချယ်နိုင်သည်:
              </label>
              <div className="flex flex-wrap gap-1">
                {PRESET_WALLETS.map((p) => (
                  <button
                    key={p}
                    type="button"
                    onClick={() => setName(p)}
                    className="px-2 py-0.5 bg-white border border-slate-200 hover:border-indigo-400 rounded text-xs text-slate-700"
                  >
                    {p}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Wallet အမည် <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                placeholder="ဥပမာ - KPay (Shop)"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full bg-white border border-slate-300 focus:border-indigo-500 rounded-xl px-3 py-2 text-sm text-slate-800 outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                လက်ကျန် ပမာဏ (Ks) <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                required
                placeholder="0"
                value={balance}
                onChange={(e) => setBalance(e.target.value)}
                className="w-full bg-white border border-slate-300 focus:border-indigo-500 rounded-xl px-3 py-2 text-sm font-bold text-slate-800 outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                အကောင့် / ဖုန်းနံပါတ် (ရွေးချယ်ရန်)
              </label>
              <input
                type="text"
                placeholder="09..."
                value={accountNumber}
                onChange={(e) => setAccountNumber(e.target.value)}
                className="w-full bg-white border border-slate-300 focus:border-indigo-500 rounded-xl px-3 py-2 text-xs text-slate-800 outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                ပြင်ဆင်သည့် နေ့စွဲ
              </label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-800"
              />
            </div>
          </div>

          <div className="flex gap-2 pt-1">
            <button
              type="submit"
              className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-indigo-600/20"
            >
              {editingWallet ? 'ပြင်ဆင်ချက် သိမ်းမည် ✓' : 'Wallet အသစ် သိမ်းမည် +'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
