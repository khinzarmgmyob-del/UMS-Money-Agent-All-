import React, { useState } from 'react';
import { X, Banknote, Check } from 'lucide-react';
import { getTodayFormatted, formatKs } from '../utils/formatters';

interface CashEditModalProps {
  currentCash: number;
  currentDate: string;
  onClose: () => void;
  onSave: (newAmount: number, date: string) => void;
}

export const CashEditModal: React.FC<CashEditModalProps> = ({
  currentCash,
  currentDate,
  onClose,
  onSave,
}) => {
  const [amount, setAmount] = useState<string>(currentCash.toString());
  const [date, setDate] = useState<string>(currentDate || getTodayFormatted());

  const numAmount = parseFloat(amount) || 0;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (amount === '') {
      alert('ကျေးဇူးပြု၍ လက်ငင်းငွေသား ပမာဏကို ဖြည့်စွက်ပါ။');
      return;
    }
    onSave(numAmount, date);
  };

  const addCashPreset = (val: number) => {
    setAmount((prev) => {
      const cur = parseFloat(prev) || 0;
      return (cur + val).toString();
    });
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 border border-slate-100 my-auto animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-5">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 bg-emerald-50 text-emerald-600 rounded-xl flex items-center justify-center">
              <Banknote className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-800">
                💵 လက်ငင်းငွေသား ပြင်ဆင်ရန်
              </h3>
              <p className="text-xs text-slate-400">Cash in Hand / Cash Drawer Balance</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 flex items-center justify-center transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-xs font-bold text-slate-700">
                လက်ငင်းငွေသား ပမာဏ (Ks) <span className="text-red-500">*</span>
              </label>
              <span className="text-xs font-bold text-emerald-600">
                {formatKs(numAmount)}
              </span>
            </div>
            <input
              type="number"
              required
              placeholder="0"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="w-full bg-slate-50 focus:bg-white border border-slate-300 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 rounded-xl px-4 py-3 text-lg font-bold text-slate-800 outline-none"
            />
            {/* Quick Presets */}
            <div className="flex flex-wrap gap-1.5 mt-2">
              <button
                type="button"
                onClick={() => addCashPreset(500000)}
                className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-medium"
              >
                +5 သိန်း
              </button>
              <button
                type="button"
                onClick={() => addCashPreset(1000000)}
                className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-medium"
              >
                +10 သိန်း
              </button>
              <button
                type="button"
                onClick={() => addCashPreset(5000000)}
                className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-medium"
              >
                +50 သိန်း
              </button>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              ပြင်ဆင်သည့် နေ့စွဲ
            </label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2.5 text-xs font-semibold text-slate-800"
            />
          </div>

          <div className="flex gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-colors"
            >
              ပယ်ဖျက်မည်
            </button>
            <button
              type="submit"
              className="flex-1 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-md shadow-emerald-600/20 transition-all flex items-center justify-center gap-1.5"
            >
              <Check className="w-4 h-4" />
              ပြင်ဆင်ချက် သိမ်းမည်
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
