import prisma from "@/app/lib/prisma";
import { prices } from "@prisma/client";

export class AccountNode {
  guid: string = "";
  parent_guid: string = "";
  name: string = "";
  account_type: string = "";
  balance: number = 0.0;
  commodity: string = "";
  commodity_guid: string = "";

  value: number = 0.0;
  value_in_root_commodity: number = 0.0;

  children: AccountNode[] = [];
}

export interface AccountNodeHash {
  [details: string]: AccountNode;
}

export var root_account: AccountNode;
export var price_list: Map<string, Array<prices>> = new Map();
var accountMap: AccountNodeHash = {};

export async function initialiseAccounts(accountMap: AccountNodeHash) {
  if (root_account != undefined) {
    updateValue(root_account, accountMap);
    return root_account;
  }

  return undefined;
}

export async function fetchAccounts() {
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

    accounts.forEach((account) => {
      accountMap[account.guid] = account;
      account.children = [];
    });

    accounts.forEach((account) => {
      if (account.name == "Root Account") {
        root_account = account;
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
  } catch (error) {
    console.error("Database Error:", error);
    throw new Error("Failed to fetch accounts.");
  }

  return accountMap;
}

export async function fetchPrices() {
  price_list = new Map();

  try {
    const prices = await prisma.prices.findMany({
      orderBy: [
        {
          date: "desc",
        },
      ],
    });

    prices.forEach((price) => {
      if (!price_list.has(price.commodity_guid)) {
        price_list.set(price.commodity_guid, []);
      }
      price_list.get(price.commodity_guid)?.push(price);
    });
  } catch (error) {
    console.error("Database Error:", error);
    throw new Error("Failed to fetch prices.");
  }

  return price_list;
}

function exchangeRate(commodity1_guid: string, commodity2_guid: string) {
  if (commodity1_guid == commodity2_guid) {
    return 1.0;
  } else if (price_list.has(commodity1_guid)) {
    for (let price of price_list.get(commodity1_guid) ?? []) {
      if (price.currency_guid == commodity2_guid) {
        return (
          Number((price.value_num * BigInt(1000)) / price.value_denom) / 1000
        );
      }
    }
  } else if (price_list.has(commodity2_guid)) {
    for (let price of price_list.get(commodity1_guid) ?? []) {
      if (price.currency_guid == commodity1_guid) {
        return (
          Number((price.value_denom * BigInt(1000)) / price.value_num) / 1000
        );
      }
    }
  }

  return undefined;
}

function convertValue(
  value: number,
  account1: AccountNode,
  account2: AccountNode,
  accountMap: AccountNodeHash
) {
  var rate = exchangeRate(account1.commodity_guid, account2.commodity_guid);
  if (rate == undefined) {
    try {
      let parent_account = accountMap[account1.parent_guid];
      let rate1 = exchangeRate(
        account1.commodity_guid,
        parent_account.commodity_guid
      );
      let rate2 = exchangeRate(
        parent_account.commodity_guid,
        account2.commodity_guid
      );
      rate =
        rate1 != undefined && rate2 != undefined ? rate1 * rate2 : undefined;
    } catch {}
  }
  if (rate != undefined) {
    return value * rate;
  }

  return undefined;
}

export function updateValue(account: AccountNode, accountMap: AccountNodeHash) {
  account.value = account.balance;
  account.children.forEach((child) => {
    updateValue(child, accountMap);

    let child_value = convertValue(child.value, child, account, accountMap);
    if (child_value != undefined) {
      account.value += child_value;
    }
  });
  if (account.parent_guid in accountMap) {
    account.value_in_root_commodity =
      convertValue(account.value, account, root_account, accountMap) ?? 0;
  }
}

export function getUUID() {
  let uuid = "";
  for (var i = 0; i < 32; i++) {
    uuid += ((Math.random() * 16) | 0).toString(16);
  }
  return uuid;
}
