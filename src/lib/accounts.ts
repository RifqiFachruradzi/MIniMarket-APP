/** Kode akun sistem yang dipakai otomatis oleh modul transaksi */
export const ACC = {
  CASH: "1-1100",
  BANK_BCA: "1-1200",
  BANK_MANDIRI: "1-1300",
  RECEIVABLE: "1-1400",
  INVENTORY: "1-1500",
  EQUIPMENT: "1-2100",
  PAYABLE: "2-1100",
  BANK_LOAN: "2-2100",
  CAPITAL: "3-1100",
  DRAWING: "3-1200",
  RETAINED: "3-1300",
  SALES: "4-1100",
  OTHER_INCOME: "4-2100",
  COGS: "5-1100",
  INVENTORY_LOSS: "5-1200",
  INVENTORY_VARIANCE: "5-1300",
} as const;

export const ACCOUNT_TYPE_LABEL: Record<string, string> = {
  asset: "Aset",
  liability: "Kewajiban",
  equity: "Ekuitas",
  revenue: "Pendapatan",
  expense: "Beban",
};

export const CASHFLOW_LABEL: Record<string, string> = {
  operating: "Operasi",
  investing: "Investasi",
  financing: "Pendanaan",
};
