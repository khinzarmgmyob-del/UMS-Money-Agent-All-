export type TransactionType = 'သွင်း' | 'ထုတ်';
export type AccountCategory = 'Cash' | 'Wallet';
export type CommissionMode = 'deduct' | 'separate';

export interface Transaction {
  id: number;
  date: string;
  time?: string;
  customerName: string;
  type: TransactionType;
  amount: number;
  commission: number;
  commissionMode?: CommissionMode; // 'deduct' (မူလငွေမှ နုတ်ယူ) | 'separate' (သက်သက်ပေး)
  netPayout?: number; // ဖောက်သည်သို့ လက်ငင်းပေးအပ်ငွေ
  phone: string;
  walletName: string;
  accountType: AccountCategory;
  note?: string;
}

export interface WalletItem {
  id: number;
  name: string;
  balance: number;
  updatedDate: string;
  accountNumber?: string;
  color?: string;
}

export interface BackupData {
  cashBalance: number;
  cashUpdatedDate: string;
  wallets: WalletItem[];
  transactions: Transaction[];
  exportedAt: string;
  version?: string;
}
