// This file contains type definitions for your data.
// It describes the shape of the data, and what data type each property should accept.

import { splits, transactions } from "@prisma/client";

export const ROOT_TYPES = ["ROOT"];
export const ASSET_TYPES = [
  "RECEIVABLE",
  "MUTUAL",
  "CASH",
  "ASSET",
  "BANK",
  "STOCK",
];
export const LIABILITY_TYPES = ["CREDIT", "LIABILITY", "PAYABLE"];
export const INCOME_TYPES = ["INCOME"];
export const EXPENSE_TYPES = ["EXPENSE"];
export const TRADING_TYPES = ["TRADING"];
export const EQUITY_TYPES = ["EQUITY"];
export const INVESTMENT_TYPES = ["STOCK", "MUTUAL"];

export const INCEXP_TYPES = INCOME_TYPES.concat(EXPENSE_TYPES);
export const ASSETLIAB_TYPES = ASSET_TYPES.concat(LIABILITY_TYPES);

export const MIN_QUANTITY = 1e-5;

export class AccountNode {
  guid: string = "";
  parent_guid: string = "";
  name: string = "";
  account_type: string = "";

  balance: number = 0.0; // Units in counts of the "commodity"
  commodity: string = "";
  commodity_guid: string = "";

  currency: string = "";
  currency_guid: string = "";
  value: number = 0.0; // In terms of the "currency"

  value_in_root_commodity: number = 0.0; // In terms of the "root currency"

  children: AccountNode[] = [];

  // Now some investment related fields
  basis: number = 0;
  realised_gain: number = 0;
  annualised_gain: number = 0;
  xirr: number = 0;

  transaction_entries: Array<{ splits: splits[] } & transactions> = [];
}

export interface AccountNodeHash {
  [key: string]: AccountNode;
}

export interface InvestmentEntry {
  units: number;
  rate: number;
}

export interface XirrValue {
  amount: number;
  date: Date;
}
