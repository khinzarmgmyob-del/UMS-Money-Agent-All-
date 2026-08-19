export type TransactionType = 'သွင်း' | 'ထုတ်';
export type CommissionMode = 'deduct' | 'separate';

export interface ShopProfile {
  shopName: string;
  address: string;
  phone: string;
  logoUrl?: string;
}

export interface CashAccountItem {
  id: number;
  name: string;
  balance: number;
  updatedDate: string;
  note?: string;
  color?: string;
}

export interface WalletItem {
  id: number;
  name: string;
  balance: number;
  updatedDate: string;
  accountNumber?: string;
  color?: string;
}

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
  walletName: string; // e.g. KPay, WaveMoney, CB Pay
  cashAccountName: string; // e.g. ဆိုင်ရှေ့ငွေပုံး (Main Counter), အရန်ငွေပုံး
  accountType?: 'Wallet' | 'Cash';
  note?: string;
}

export interface BackupData {
  cashAccounts: CashAccountItem[];
  cashBalance?: number;
  cashUpdatedDate?: string;
  wallets: WalletItem[];
  transactions: Transaction[];
  shopProfile?: ShopProfile;
  exportedAt: string;
  version?: string;
}
