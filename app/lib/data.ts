import { sql } from "@vercel/postgres";
import prisma from "@/app/lib/prisma";

import {
  CustomerField,
  CustomersTableType,
  InvoiceForm,
  AccountsTable,
  LatestInvoiceRaw,
  Revenue,
} from "./definitions";
import { formatCurrency } from "./utils";
import { commodities, prices } from "@prisma/client";

export class AccountNode {
  guid: string = "";
  parent_guid: string = "";
  name: string = "";
  account_type: string = "";
  balance: number = 0.0;
  commodity: string = "";
  commodity_guid: string = "";

  children: AccountNode[] = [];
}

export interface IHash {
  [details: string]: AccountNode;
}

export class Book {
  root_account: AccountNode | undefined = undefined;
  price_list: Map<string, Array<prices>> = new Map();

  async init() {
    try {
      // First fetch all accounts
      const accounts = await prisma.$queryRaw<AccountNode[]>`
     SELECT
        accounts.guid,
        accounts.parent_guid,
        accounts.name,
        accounts.account_type,
        commodities.guid as commodity_guid,
        commodities.mnemonic as commodity,
        COALESCE(SUM(CAST(splits.quantity_num AS Float4) / CAST(splits.quantity_denom AS Float4)), 0) as balance
      FROM accounts
      LEFT OUTER JOIN splits ON splits.account_guid = accounts.guid
      LEFT JOIN commodities ON accounts.commodity_guid = commodities.guid
      GROUP BY accounts.guid, commodities.mnemonic, commodities.guid
    `;

      let accountMap: IHash = {};
      accounts.forEach((account) => {
        accountMap[account.guid] = account;
        account.children = [];
      });

      accounts.forEach((account) => {
        if (account.name == "Root Account") {
          this.root_account = account;
        }
        if (account.parent_guid in accountMap) {
          accountMap[account.parent_guid].children.push(account);
        }
      });

      accounts.forEach((account) => {
        account.children.sort(function (a, b) {
          let x = a.name;
          let y = b.name;
          if (x < y) {
            return -1;
          }
          if (x > y) {
            return 1;
          }
          return 0;
        });
      });

      // Fetch all prices
      await this.updatePriceList();

      if (this.root_account != undefined) {
        this.updateBalance(this.root_account);
        return this.root_account.children;
      }

      return [];
    } catch (error) {
      console.error("Database Error:", error);
      throw new Error("Failed to fetch accounts.");
    }
  }

  async getCommodities() {
    try {
      const commodities = await prisma.commodities.findMany();
      return commodities;
    } catch (error) {
      console.error("Database Error:", error);
      throw new Error("Failed to fetch commodities.");
    }
  }

  async updatePriceList() {
    try {
      const prices = await prisma.prices.findMany({
        orderBy: [
          {
            date: "desc",
          },
        ],
      });

      prices.forEach((price) => {
        if (!this.price_list.has(price.commodity_guid)) {
          this.price_list.set(price.commodity_guid, []);
        }
        this.price_list.get(price.commodity_guid)?.push(price);
      });
      return this.price_list;
    } catch (error) {
      console.error("Database Error:", error);
      throw new Error("Failed to fetch prices.");
    }
  }

  exchangeRate(commodity1_guid: string, commodity2_guid: string) {
    if (commodity1_guid == commodity2_guid) {
      return 1.0;
    } else if (this.price_list.has(commodity1_guid)) {
      for (let price of this.price_list.get(commodity1_guid) ?? []) {
        if (price.currency_guid == commodity2_guid) {
          return (
            Number((price.value_num * BigInt(1000)) / price.value_denom) / 1000
          );
        }
      }
    } else if (this.price_list.has(commodity2_guid)) {
      for (let price of this.price_list.get(commodity1_guid) ?? []) {
        if (price.currency_guid == commodity1_guid) {
          return (
            Number((price.value_denom * BigInt(1000)) / price.value_num) / 1000
          );
        }
      }
    }

    return undefined;
  }

  convertValue(value: number, account1: AccountNode, account2: AccountNode) {
    let rate = this.exchangeRate(
      account1.commodity_guid,
      account2.commodity_guid
    );
    if (rate != undefined) {
      return value * rate;
    }

    return undefined;
  }

  updateBalance(account: AccountNode) {
    account.children.forEach((child) => {
      this.updateBalance(child);

      let child_balance = this.convertValue(child.balance, child, account);
      if (child_balance != undefined) {
        account.balance += child_balance;
      }
    });
  }
}
