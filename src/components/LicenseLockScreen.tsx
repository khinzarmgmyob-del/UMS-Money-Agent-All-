import React, { useState } from 'react';
import { KeyRound, Copy, Check, ShieldCheck, HelpCircle, Terminal } from 'lucide-react';
import { generateActivationKey, verifyActivationKey } from '../utils/license';

interface LicenseLockScreenProps {
  deviceId: string;
  onActivated: () => void;
}

export const LicenseLockScreen: React.FC<LicenseLockScreenProps> = ({ deviceId, onActivated }) => {
  const [inputKey, setInputKey] = useState('');
  const [copied, setCopied] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [showAdminKeyHint, setShowAdminKeyHint] = useState(false);

  const calculatedKey = generateActivationKey(deviceId);

  const handleCopy = () => {
    navigator.clipboard.writeText(deviceId);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleActivate = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (verifyActivationKey(deviceId, inputKey)) {
      localStorage.setItem('app_activation_key', inputKey.trim().toUpperCase());
      setErrorMsg('');
      onActivated();
    } else {
      setErrorMsg('Activation Key မမှန်ကန်ပါ။ ကျေးဇူးပြု၍ ပြန်လည်စစ်ဆေးပါ။');
    }
  };

  const handleAutoFillValidKey = () => {
    setInputKey(calculatedKey);
    setErrorMsg('');
  };

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-8 border border-slate-100">
        <div className="w-14 h-14 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-inner">
          <KeyRound className="w-7 h-7" />
        </div>

        <h2 className="text-2xl font-bold text-slate-800 text-center mb-2">
          License Activation
        </h2>
        <p className="text-sm text-slate-500 text-center mb-6 leading-relaxed">
          Money Agent POS အက်ပ်ကို စတင်အသုံးပြုရန် အောက်ပါ Device ID ကို Admin ထံ ပေးပို့၍ Activation Key တောင်းယူပါ။
        </p>

        <form onSubmit={handleActivate} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
              ၁။ အသုံးပြုသူ၏ Device ID
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={deviceId}
                readOnly
                className="w-full bg-slate-100 border border-slate-300 rounded-xl px-4 py-2.5 font-mono text-sm font-semibold text-slate-800 focus:outline-none select-all"
              />
              <button
                type="button"
                onClick={handleCopy}
                className="flex items-center gap-1 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold whitespace-nowrap transition-colors"
                title="Device ID ကို ကူးယူမည်"
              >
                {copied ? (
                  <>
                    <Check className="w-4 h-4 text-emerald-300" />
                    Copied!
                  </>
                ) : (
                  <>
                    <Copy className="w-4 h-4" />
                    Copy ID
                  </>
                )}
              </button>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
              ၂။ Activation Key ရိုက်ထည့်ပါ
            </label>
            <input
              type="text"
              placeholder="XXXX-XXXX"
              value={inputKey}
              onChange={(e) => {
                setInputKey(e.target.value);
                if (errorMsg) setErrorMsg('');
              }}
              className="w-full bg-white border border-slate-300 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 rounded-xl px-4 py-3 font-mono text-center text-lg font-bold text-slate-800 uppercase tracking-widest placeholder:text-slate-300 transition-all outline-none"
            />
          </div>

          {errorMsg && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-red-600 text-xs font-medium text-center">
              {errorMsg}
            </div>
          )}

          <button
            type="submit"
            className="w-full py-3.5 bg-emerald-600 hover:bg-emerald-700 active:scale-[0.99] text-white rounded-xl font-bold text-base shadow-lg shadow-emerald-600/20 transition-all flex items-center justify-center gap-2 cursor-pointer"
          >
            <ShieldCheck className="w-5 h-5" />
            App ကို စတင်အသုံးပြုမည် (Activate)
          </button>
        </form>

        {/* Developer / Admin Helper Tooltip for Testing */}
        <div className="mt-6 pt-4 border-t border-slate-100">
          <button
            type="button"
            onClick={() => setShowAdminKeyHint(!showAdminKeyHint)}
            className="w-full text-xs text-slate-400 hover:text-slate-600 flex items-center justify-center gap-1 py-1"
          >
            <HelpCircle className="w-3.5 h-3.5" />
            Admin / Testing Helper Key Generator
          </button>

          {showAdminKeyHint && (
            <div className="mt-3 p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs space-y-2">
              <div className="flex items-center justify-between text-slate-600">
                <span>စနစ်မှ ထုတ်ပေးသော Key:</span>
                <span className="font-mono font-bold text-indigo-600 bg-white px-2 py-0.5 rounded border border-slate-200">{calculatedKey}</span>
              </div>
              <button
                type="button"
                onClick={handleAutoFillValidKey}
                className="w-full py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-lg font-semibold text-xs transition-colors flex items-center justify-center gap-1"
              >
                <Terminal className="w-3.5 h-3.5" />
                ဤ Key ဖြင့် ချက်ချင်းဖြည့်စွက်ပြီး အသုံးပြုမည်
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
