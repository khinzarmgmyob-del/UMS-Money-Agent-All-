import React, { useState } from 'react';
import { X, Printer, Copy, Check, FileCheck } from 'lucide-react';
import { Transaction } from '../types';
import { formatKs } from '../utils/formatters';

interface TransactionReceiptModalProps {
  transaction: Transaction;
  onClose: () => void;
}

export const TransactionReceiptModal: React.FC<TransactionReceiptModalProps> = ({
  transaction,
  onClose,
}) => {
  const [copied, setCopied] = useState(false);

  const isCashOut = transaction.type === 'ထုတ်';
  const isDeducted = transaction.commissionMode === 'deduct';
  const netCash = transaction.netPayout !== undefined
    ? transaction.netPayout
    : (isCashOut && isDeducted ? (transaction.amount - transaction.commission) : transaction.amount);

  const receiptText = `
=== Money Agent POS Voucher ===
ပြေစာအမှတ်: #${transaction.id}
နေ့စွဲ / အချိန်: ${transaction.date} ${transaction.time || ''}
ဖောက်သည်အမည်: ${transaction.customerName}
အမျိုးအစား: ${transaction.type === 'သွင်း' ? 'ငွေသွင်း (Cash In)' : 'ငွေထုတ် (Cash Out)'}
မူလငွေပမာဏ: ${transaction.amount.toLocaleString()} Ks
ကော်မရှင်ခ: ${transaction.commission.toLocaleString()} Ks ${isCashOut ? (isDeducted ? '(မူလငွေမှ နုတ်ယူ)' : '(သက်သက်ပေး)') : ''}
${isCashOut ? `ဖောက်သည်သို့ အမှန်ပေးငွေ: ${netCash.toLocaleString()} Ks\n` : ''}ဖုန်းနံပါတ်: ${transaction.phone}
Wallet/Account: ${transaction.walletName}
${transaction.note ? `မှတ်ချက်: ${transaction.note}\n` : ''}================================
အဆင်ပြေစွာ အသုံးပြုနိုင်ပါစေ။ ကျေးဇူးတင်ပါသည်။
  `.trim();

  const handleCopyText = () => {
    navigator.clipboard.writeText(receiptText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 border border-slate-100 my-auto animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-indigo-50 text-indigo-600 rounded-lg flex items-center justify-center">
              <FileCheck className="w-4 h-4" />
            </div>
            <h3 className="text-base font-bold text-slate-800">ငွေလွှဲ/ငွေထုတ် ပြေစာ (Receipt)</h3>
          </div>
          <button
            onClick={onClose}
            className="w-7 h-7 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 flex items-center justify-center"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Voucher Paper Box */}
        <div className="p-5 bg-slate-50 border border-dashed border-slate-300 rounded-xl font-mono text-xs text-slate-800 space-y-3 mb-4 select-all">
          <div className="text-center pb-2 border-b border-dashed border-slate-300 font-sans">
            <div className="font-bold text-sm text-slate-900">📱 MONEY AGENT POS</div>
            <div className="text-[11px] text-slate-500">ငွေလွှဲ / ငွေထုတ် ပြေစာလက်မှတ်</div>
          </div>

          <div className="flex justify-between">
            <span className="text-slate-500">ပြေစာနံပါတ်:</span>
            <span className="font-bold text-slate-900">#{transaction.id}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-500">ရက်စွဲ / အချိန်:</span>
            <span className="font-semibold text-slate-800">{transaction.date} {transaction.time}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-500">ဖောက်သည်:</span>
            <span className="font-bold text-slate-900">{transaction.customerName}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-500">ဖုန်းနံပါတ်:</span>
            <span className="text-slate-800">{transaction.phone}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-500">အမျိုးအစား:</span>
            <span className={`font-bold ${transaction.type === 'သွင်း' ? 'text-emerald-600' : 'text-red-600'}`}>
              {transaction.type === 'သွင်း' ? 'ငွေသွင်း (Cash In)' : 'ငွေထုတ် (Cash Out)'}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-500">အသုံးပြုသည့် Account:</span>
            <span className="font-semibold text-slate-800">{transaction.walletName}</span>
          </div>

          <div className="pt-2 border-t border-dashed border-slate-300">
            <div className="flex justify-between text-sm py-1 font-bold">
              <span>မူလငွေ ပမာဏ:</span>
              <span className="text-slate-950">{formatKs(transaction.amount)}</span>
            </div>
            <div className="flex justify-between text-xs py-0.5 text-emerald-700">
              <span>
                ဝန်ဆောင်ခ (ကော်မရှင်):{' '}
                {isCashOut ? (isDeducted ? '(မူလငွေမှ နုတ်ယူ)' : '(သက်သက်ပေး)') : ''}
              </span>
              <span>+{formatKs(transaction.commission)}</span>
            </div>
            {isCashOut && (
              <div className="flex justify-between text-sm py-1.5 mt-1 border-t border-dashed border-slate-200 font-bold text-rose-700 bg-rose-50/50 px-2 rounded">
                <span>ဖောက်သည်သို့ အမှန်ပေးငွေ:</span>
                <span>{formatKs(netCash)}</span>
              </div>
            )}
          </div>

          {transaction.note && (
            <div className="pt-2 border-t border-dashed border-slate-300 text-[11px] text-slate-600">
              <span>မှတ်ချက်: </span>
              <span>{transaction.note}</span>
            </div>
          )}

          <div className="text-center pt-2 text-[10px] text-slate-400 font-sans">
            ကျေးဇူးတင်ပါသည်။ အဆင်ပြေစွာ အသုံးပြုနိုင်ပါစေ။
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex gap-2">
          <button
            onClick={handleCopyText}
            className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-colors flex items-center justify-center gap-1.5"
          >
            {copied ? (
              <>
                <Check className="w-4 h-4 text-emerald-600" />
                Copied!
              </>
            ) : (
              <>
                <Copy className="w-4 h-4" />
                ပြေစာစာသား Copy
              </>
            )}
          </button>
          <button
            onClick={handlePrint}
            className="flex-1 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-colors flex items-center justify-center gap-1.5 shadow-md shadow-indigo-600/20"
          >
            <Printer className="w-4 h-4" />
            Print ထုတ်မည်
          </button>
        </div>
      </div>
    </div>
  );
};
