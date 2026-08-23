import {
  Transaction,
  CashAccountItem,
  WalletItem,
  ShopProfile,
  BackupData,
  NetworkConfig,
  NetworkMode,
} from '../types';
import * as sqliteService from '../db/sqliteService';

export type { QueryTransactionsOptions, PagedTransactionsResult } from '../db/sqliteService';

const NETWORK_STORAGE_KEY = 'pos_network_config';

const DEFAULT_NETWORK_CONFIG: NetworkConfig = {
  mode: 'server',
  masterServerIp: typeof window !== 'undefined' ? `${window.location.protocol}//${window.location.hostname}:3000` : 'http://192.168.1.100:3000',
  localServerPort: 3000,
  deviceLabel: 'Master Device',
};

// Listeners for network status updates
type StatusListener = (status: { isClient: boolean; isConnected: boolean; error?: string; mode: NetworkMode }) => void;
const statusListeners = new Set<StatusListener>();

export function subscribeNetworkStatus(listener: StatusListener): () => void {
  statusListeners.add(listener);
  return () => {
    statusListeners.delete(listener);
  };
}

function notifyStatus(status: { isClient: boolean; isConnected: boolean; error?: string; mode: NetworkMode }) {
  statusListeners.forEach((fn) => {
    try {
      fn(status);
    } catch (e) {
      console.error('Status listener error:', e);
    }
  });
}

/**
 * Get current Network configuration from local storage
 */
export function getNetworkConfig(): NetworkConfig {
  if (typeof window === 'undefined') return DEFAULT_NETWORK_CONFIG;
  try {
    const saved = localStorage.getItem(NETWORK_STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      return {
        ...DEFAULT_NETWORK_CONFIG,
        ...parsed,
      };
    }
  } catch (e) {
    console.warn('Error reading network config:', e);
  }
  return DEFAULT_NETWORK_CONFIG;
}

/**
 * Save Network configuration
 */
export function saveNetworkConfig(config: NetworkConfig): void {
  if (typeof window !== 'undefined') {
    localStorage.setItem(NETWORK_STORAGE_KEY, JSON.stringify(config));
    notifyStatus({
      isClient: config.mode === 'client',
      isConnected: true,
      mode: config.mode,
    });
  }
}

/**
 * Clean & format base URL (e.g., ensures http:// and no trailing slash)
 */
export function formatServerUrl(inputUrl: string): string {
  let url = inputUrl.trim();
  if (!url) return 'http://localhost:3000';
  if (!url.startsWith('http://') && !url.startsWith('https://')) {
    url = `http://${url}`;
  }
  return url.replace(/\/+$/, '');
}

/**
 * Test Connection to Master Server
 */
export async function testServerConnection(targetUrl?: string): Promise<{
  success: boolean;
  message: string;
  latencyMs?: number;
  info?: any;
}> {
  const config = getNetworkConfig();
  const baseUrl = formatServerUrl(targetUrl || config.masterServerIp);
  const startTime = Date.now();

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 6000);

    const res = await fetch(`${baseUrl}/api/health`, {
      method: 'GET',
      headers: { Accept: 'application/json' },
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    const latencyMs = Date.now() - startTime;

    if (res.ok) {
      const data = await res.json();
      notifyStatus({
        isClient: config.mode === 'client',
        isConnected: true,
        mode: config.mode,
      });
      return {
        success: true,
        message: `Master Server သို့ အောင်မြင်စွာ ချိတ်ဆက်မိပါသည် (${latencyMs}ms)`,
        latencyMs,
        info: data,
      };
    } else {
      const errMsg = `Server HTTP Error: ${res.status} ${res.statusText}`;
      notifyStatus({
        isClient: config.mode === 'client',
        isConnected: false,
        error: errMsg,
        mode: config.mode,
      });
      return { success: false, message: errMsg };
    }
  } catch (err: any) {
    const errMsg = err.name === 'AbortError' 
      ? 'Connection Timeout: Master Server ထံမှ တုံ့ပြန်မှု မရရှိပါ (Wi-Fi ချိတ်ဆက်မှု စစ်ဆေးပါ)'
      : `ချိတ်ဆက်၍ မရပါ: ${err.message || 'Master Server IP နှင့် Wi-Fi ကို စစ်ဆေးပါ'}`;

    notifyStatus({
      isClient: config.mode === 'client',
      isConnected: false,
      error: errMsg,
      mode: config.mode,
    });

    return {
      success: false,
      message: errMsg,
    };
  }
}

/**
 * Helper to fetch local server network interfaces info (IP address)
 */
export async function fetchServerNetworkInfo(): Promise<{
  ipList: string[];
  activeUrl: string;
  port: number;
  hostname?: string;
} | null> {
  try {
    const res = await fetch('/api/network-info', {
      method: 'GET',
      headers: { Accept: 'application/json' },
    });
    if (res.ok) {
      return await res.json();
    }
  } catch (e) {
    // ignore
  }

  // Fallback with window location if API not available
  if (typeof window !== 'undefined') {
    const host = window.location.hostname;
    const port = window.location.port ? Number(window.location.port) : 3000;
    const protocol = window.location.protocol;
    const activeUrl = `${protocol}//${host}:${port}`;
    return {
      ipList: host === 'localhost' || host === '127.0.0.1' ? ['127.0.0.1'] : [host],
      activeUrl,
      port,
    };
  }
  return null;
}

/**
 * Generic API request wrapper for Client Mode with auto fallback & error notifications
 */
async function clientApiRequest<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const config = getNetworkConfig();
  const baseUrl = formatServerUrl(config.masterServerIp);
  const url = `${baseUrl}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 10000);

  try {
    const res = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        ...(options.headers || {}),
      },
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    if (!res.ok) {
      throw new Error(`Master Server HTTP ${res.status}: ${res.statusText}`);
    }

    const data = await res.json();
    notifyStatus({ isClient: true, isConnected: true, mode: 'client' });
    return data as T;
  } catch (err: any) {
    clearTimeout(timeoutId);
    const errorMsg = err.name === 'AbortError'
      ? 'Master Server Request Timeout (Wi-Fi ပြတ်တောက်မှု ရှိနိုင်သည်)'
      : (err.message || 'Master Server သို့ ချိတ်ဆက်၍ မရပါ');
    
    notifyStatus({
      isClient: true,
      isConnected: false,
      error: errorMsg,
      mode: 'client',
    });

    console.error(`Client API Error [${endpoint}]:`, err);
    throw new Error(errorMsg);
  }
}

/* =========================================================================
 * Unified Service Layer (CRUD & Queries)
 * Automatically delegates to SQLite (Server Mode) or REST API (Client Mode)
 * ========================================================================= */

export async function initDataService(): Promise<boolean> {
  const config = getNetworkConfig();
  if (config.mode === 'server') {
    return sqliteService.initSQLiteDatabase();
  } else {
    // In client mode, verify connection to master server
    try {
      const test = await testServerConnection();
      return test.success;
    } catch (e) {
      return false;
    }
  }
}

/**
 * Get paginated transactions with database filters & aggregate stats
 */
export async function getTransactionsPaged(
  options: sqliteService.QueryTransactionsOptions = {}
): Promise<sqliteService.PagedTransactionsResult> {
  const config = getNetworkConfig();

  if (config.mode === 'server') {
    return sqliteService.getTransactionsPaged(options);
  }

  // Client Mode -> Call Master Server API
  try {
    const params = new URLSearchParams();
    if (options.page) params.set('page', String(options.page));
    if (options.pageSize) params.set('pageSize', String(options.pageSize));
    if (options.dateFilter) params.set('dateFilter', options.dateFilter);
    if (options.walletFilter) params.set('walletFilter', options.walletFilter);
    if (options.cashFilter) params.set('cashFilter', options.cashFilter);
    if (options.typeFilter) params.set('typeFilter', options.typeFilter);
    if (options.searchQuery) params.set('searchQuery', options.searchQuery);
    if (options.todayDate) params.set('todayDate', options.todayDate);

    const queryStr = params.toString() ? `?${params.toString()}` : '';
    return await clientApiRequest<sqliteService.PagedTransactionsResult>(`/api/transactions${queryStr}`);
  } catch (err) {
    console.warn('Client getTransactionsPaged fallback to local SQLite cache:', err);
    // Fallback to local sqlite/storage if offline
    return sqliteService.getTransactionsPaged(options);
  }
}

/**
 * Get all filtered transactions (for Reports, Export, Reconcile)
 */
export async function getAllFilteredTransactions(
  options: Omit<sqliteService.QueryTransactionsOptions, 'page' | 'pageSize'> = {}
): Promise<Transaction[]> {
  const config = getNetworkConfig();

  if (config.mode === 'server') {
    return sqliteService.getAllFilteredTransactions(options);
  }

  try {
    const params = new URLSearchParams();
    if (options.dateFilter) params.set('dateFilter', options.dateFilter);
    if (options.walletFilter) params.set('walletFilter', options.walletFilter);
    if (options.cashFilter) params.set('cashFilter', options.cashFilter);
    if (options.typeFilter) params.set('typeFilter', options.typeFilter);
    if (options.searchQuery) params.set('searchQuery', options.searchQuery);
    if (options.todayDate) params.set('todayDate', options.todayDate);

    const queryStr = params.toString() ? `?${params.toString()}` : '';
    return await clientApiRequest<Transaction[]>(`/api/transactions/all${queryStr}`);
  } catch (err) {
    console.warn('Client getAllFilteredTransactions fallback:', err);
    return sqliteService.getAllFilteredTransactions(options);
  }
}

/**
 * Insert or update a single transaction
 */
export async function insertTransaction(tx: Transaction): Promise<boolean> {
  const config = getNetworkConfig();

  if (config.mode === 'server') {
    return sqliteService.insertTransaction(tx);
  }

  try {
    await clientApiRequest<{ success: boolean; transaction: Transaction }>('/api/transactions', {
      method: 'POST',
      body: JSON.stringify(tx),
    });
    // Also cache locally
    await sqliteService.insertTransaction(tx);
    return true;
  } catch (err) {
    console.error('Client insertTransaction failed:', err);
    throw err;
  }
}

/**
 * Batch insert transactions (Restore & Import)
 */
export async function insertTransactionsBatch(transactions: Transaction[]): Promise<boolean> {
  const config = getNetworkConfig();

  if (config.mode === 'server') {
    return sqliteService.insertTransactionsBatch(transactions);
  }

  try {
    await clientApiRequest<{ success: boolean }>('/api/transactions/batch', {
      method: 'POST',
      body: JSON.stringify({ transactions }),
    });
    await sqliteService.insertTransactionsBatch(transactions);
    return true;
  } catch (err) {
    console.error('Client insertTransactionsBatch failed:', err);
    throw err;
  }
}

/**
 * Delete a transaction by ID
 */
export async function deleteTransactionById(id: number): Promise<boolean> {
  const config = getNetworkConfig();

  if (config.mode === 'server') {
    return sqliteService.deleteTransactionById(id);
  }

  try {
    await clientApiRequest<{ success: boolean }>(`/api/transactions/${id}`, {
      method: 'DELETE',
    });
    await sqliteService.deleteTransactionById(id);
    return true;
  } catch (err) {
    console.error('Client deleteTransactionById failed:', err);
    throw err;
  }
}

/**
 * Save Cash Accounts
 */
export async function saveCashAccountsToDB(accounts: CashAccountItem[]): Promise<void> {
  const config = getNetworkConfig();

  if (config.mode === 'server') {
    return sqliteService.saveCashAccountsToDB(accounts);
  }

  try {
    await clientApiRequest<{ success: boolean }>('/api/cash-accounts', {
      method: 'POST',
      body: JSON.stringify({ accounts }),
    });
    await sqliteService.saveCashAccountsToDB(accounts);
  } catch (err) {
    console.error('Client saveCashAccountsToDB failed:', err);
    throw err;
  }
}

/**
 * Fetch Cash Accounts
 */
export async function getCashAccountsFromDB(): Promise<CashAccountItem[]> {
  const config = getNetworkConfig();

  if (config.mode === 'server') {
    return sqliteService.getCashAccountsFromDB();
  }

  try {
    const data = await clientApiRequest<CashAccountItem[]>('/api/cash-accounts');
    if (Array.isArray(data)) {
      return data;
    }
    return sqliteService.getCashAccountsFromDB();
  } catch (err) {
    console.warn('Client getCashAccountsFromDB fallback:', err);
    return sqliteService.getCashAccountsFromDB();
  }
}

/**
 * Save Wallets
 */
export async function saveWalletsToDB(wallets: WalletItem[]): Promise<void> {
  const config = getNetworkConfig();

  if (config.mode === 'server') {
    return sqliteService.saveWalletsToDB(wallets);
  }

  try {
    await clientApiRequest<{ success: boolean }>('/api/wallets', {
      method: 'POST',
      body: JSON.stringify({ wallets }),
    });
    await sqliteService.saveWalletsToDB(wallets);
  } catch (err) {
    console.error('Client saveWalletsToDB failed:', err);
    throw err;
  }
}

/**
 * Fetch Wallets
 */
export async function getWalletsFromDB(): Promise<WalletItem[]> {
  const config = getNetworkConfig();

  if (config.mode === 'server') {
    return sqliteService.getWalletsFromDB();
  }

  try {
    const data = await clientApiRequest<WalletItem[]>('/api/wallets');
    if (Array.isArray(data)) {
      return data;
    }
    return sqliteService.getWalletsFromDB();
  } catch (err) {
    console.warn('Client getWalletsFromDB fallback:', err);
    return sqliteService.getWalletsFromDB();
  }
}

/**
 * Save Shop Profile
 */
export async function saveShopProfileToDB(profile: ShopProfile): Promise<void> {
  const config = getNetworkConfig();

  if (config.mode === 'server') {
    return sqliteService.saveShopProfileToDB(profile);
  }

  try {
    await clientApiRequest<{ success: boolean }>('/api/shop-profile', {
      method: 'POST',
      body: JSON.stringify(profile),
    });
    await sqliteService.saveShopProfileToDB(profile);
  } catch (err) {
    console.error('Client saveShopProfileToDB failed:', err);
    throw err;
  }
}

/**
 * Fetch Shop Profile
 */
export async function getShopProfileFromDB(): Promise<ShopProfile> {
  const config = getNetworkConfig();

  if (config.mode === 'server') {
    return sqliteService.getShopProfileFromDB();
  }

  try {
    return await clientApiRequest<ShopProfile>('/api/shop-profile');
  } catch (err) {
    console.warn('Client getShopProfileFromDB fallback:', err);
    return sqliteService.getShopProfileFromDB();
  }
}

/**
 * Purge old transactions
 */
export async function purgeOldTransactionsDB(cutoffDate: string): Promise<number> {
  const config = getNetworkConfig();

  if (config.mode === 'server') {
    return sqliteService.purgeOldTransactionsDB(cutoffDate);
  }

  try {
    const res = await clientApiRequest<{ success: boolean; deletedCount: number }>('/api/purge', {
      method: 'POST',
      body: JSON.stringify({ cutoffDate }),
    });
    await sqliteService.purgeOldTransactionsDB(cutoffDate);
    return res.deletedCount || 0;
  } catch (err) {
    console.error('Client purgeOldTransactionsDB failed:', err);
    throw err;
  }
}

/**
 * Reset all data to zero
 */
export async function resetAllDataDB(todayDate?: string): Promise<void> {
  const config = getNetworkConfig();

  if (config.mode === 'server') {
    return sqliteService.resetAllDataDB(todayDate);
  }

  try {
    await clientApiRequest<{ success: boolean }>('/api/reset', {
      method: 'POST',
      body: JSON.stringify({ todayDate }),
    });
    await sqliteService.resetAllDataDB(todayDate);
  } catch (err) {
    console.error('Client resetAllDataDB failed:', err);
    throw err;
  }
}

/**
 * Restore Full Database
 */
export async function restoreDatabasePayload(backupData: BackupData): Promise<void> {
  const config = getNetworkConfig();

  if (config.mode === 'server') {
    return sqliteService.restoreDatabasePayload(backupData);
  }

  try {
    await clientApiRequest<{ success: boolean }>('/api/restore', {
      method: 'POST',
      body: JSON.stringify(backupData),
    });
    await sqliteService.restoreDatabasePayload(backupData);
  } catch (err) {
    console.error('Client restoreDatabasePayload failed:', err);
    throw err;
  }
}

/**
 * Export full backup payload
 */
export async function getFullBackupPayload(): Promise<BackupData> {
  const [cashAccounts, wallets, transactions, shopProfile] = await Promise.all([
    getCashAccountsFromDB(),
    getWalletsFromDB(),
    getAllFilteredTransactions(),
    getShopProfileFromDB(),
  ]);

  return {
    cashAccounts,
    wallets,
    transactions,
    shopProfile,
    exportedAt: new Date().toISOString(),
    version: '1.1.0',
  };
}
