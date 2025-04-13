"use server";

import prisma from "./prisma";
import { prices } from "@prisma/client";
import { updateValue } from "./account_data";
import { AccountNode, AccountNodeHash } from "./definitions";

export async function getAccounts() {
  let accountMap = await fetchAccountMap();
  await fetchPrices();

  return await initialiseAccounts(accountMap);
}

export async function getRootAccount(accountMap: AccountNodeHash) {
  for (const [, value] of Object.entries(accountMap)) {
    if (value.name == "Root Account") {
      return value;
    }
  }
}

export async function fetchAccountMap() {
  var accountMap: AccountNodeHash = {};

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
      account.transaction_entries = [];
      account.value = 0;
      account.value_in_root_commodity = 0;
    });

    accounts.forEach((account) => {
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

export async function initialiseAccounts(accountMap: AccountNodeHash) {
  const root_account = await getRootAccount(accountMap);
  const price_list = await fetchPrices();

  if (root_account != undefined) {
    updateValue(
      root_account,
      accountMap,
      root_account.commodity_guid,
      price_list
    );
    return root_account;
  }

  return undefined;
}

export async function fetchPrices() {
  var price_list: Map<string, Array<prices>> = new Map();

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

export async function fetchSplits(account_guid: string) {
  try {
    const splits = await prisma.splits.findMany({
      relationLoadStrategy: "join",
      where: {
        account_guid: {
          equals: account_guid,
        },
      },
      include: {
        transaction: true,
      },
      orderBy: {
        transaction: {
          post_date: "asc",
        },
      },
    });

    return splits;
  } catch (error) {
    console.error("Database Error:", error);
    throw new Error(`Failed to fetch splits for account ${account_guid}}.`);
  }
}

export async function fetchCurrencies() {
  var currencies_map = new Map();

  try {
    const currencies = await prisma.commodities.findMany({
      where: {
        namespace: {
          equals: "CURRENCY",
        },
      },
    });

    currencies.forEach((currency) => {
      currencies_map.set(currency.guid, currency);
    });

    return currencies_map;
  } catch (error) {
    console.error("Database Error:", error);
    throw new Error(`Failed to fetch currencies`);
  }
}
