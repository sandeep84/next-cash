import prisma from "@/app/lib/prisma";
import { commodities, prices, splits } from "@prisma/client";
import { randomBytes } from "crypto";

export const INVESTMENT_TYPES = ["STOCK", "MUTUAL"];
const MIN_QUANTITY = 1e-5;

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
    throw new Error(`Failed to fetch splits for account ${accountMap[account_guid].name}.`);
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

function getValue(num: bigint, denom: bigint) {
  return Number((num * BigInt(10000)) / denom) / 10000;
}

function exchangeRate(commodity1_guid: string, commodity2_guid: string) {
  if (commodity1_guid == commodity2_guid) {
    return 1.0;
  } else if (price_list.has(commodity1_guid)) {
    for (let price of price_list.get(commodity1_guid) ?? []) {
      if (price.currency_guid == commodity2_guid) {
        return getValue(price.value_num, price.value_denom);
      }
    }
  } else if (price_list.has(commodity2_guid)) {
    for (let price of price_list.get(commodity1_guid) ?? []) {
      if (price.currency_guid == commodity1_guid) {
        return getValue(price.value_num, price.value_denom);
      }
    }
  }

  return undefined;
}

function convertValue(value: number, account1: AccountNode, source_commodity_guid: string, target_currency_guid: string, accountMap: AccountNodeHash) {
  var rate;
  if (source_commodity_guid == target_currency_guid) {
    rate = 1.0;
  } else {
    rate = exchangeRate(source_commodity_guid, target_currency_guid);
  }

  if (rate == undefined) {
    try {
      let parent_account = accountMap[account1.parent_guid];
      let rate1 = exchangeRate(source_commodity_guid, parent_account.commodity_guid);
      let rate2 = exchangeRate(parent_account.commodity_guid, target_currency_guid);
      rate = rate1 != undefined && rate2 != undefined ? rate1 * rate2 : undefined;
    } catch {}
  }
  if (rate != undefined) {
    return value * rate;
  }

  return 0;
}

export function updateValue(account: AccountNode, accountMap: AccountNodeHash) {
  account.value = account.balance;
  account.children.forEach((child) => {
    updateValue(child, accountMap);

    let child_value = convertValue(child.value, child, child.commodity_guid, account.commodity_guid, accountMap);
    if (child_value != undefined) {
      account.value += child_value;
    }
  });
  if (account.parent_guid in accountMap) {
    account.value_in_root_commodity = convertValue(account.value, account, account.commodity_guid, root_account.commodity_guid, accountMap) ?? 0;
  }
}

interface InvestmentEntry {
  units: number;
  rate: number;
}

export async function updateInvestmentValue(account: AccountNode, accountMap: AccountNodeHash, currencies: Map<string, commodities>) {
  if (INVESTMENT_TYPES.includes(account.account_type)) {
    account.basis = 0;
    account.realised_gain = 0;

    let splits = await fetchSplits(account.guid);
    var queue = new Array<InvestmentEntry>();

    for (let split of splits) {
      let quantity = getValue(split.quantity_num, split.quantity_denom);
      let split_rate = getValue(split.value_num, split.value_denom) / quantity;
      account.currency_guid = split.transaction.currency_guid;

      if (quantity > 0) {
        // Purchase
        queue.push({
          units: quantity,
          rate: split_rate,
        });
        // console.log(`${account.name}: Purchase: ${quantity}, ${split_rate}`);
      } else {
        // Redemption
        quantity = -quantity;

        while (quantity > MIN_QUANTITY && queue.length > 0 && quantity >= queue[0].units) {
          account.realised_gain += queue[0].units * (split_rate - queue[0].rate);
          // console.log(`${account.name}: Redemption: ${queue[0].units}/${quantity}, ${split_rate} - ${queue[0].rate} => realised_gain=${account.realised_gain}`);
          quantity -= queue[0].units;
          queue.shift(); // remove the oldest item
        }

        if (quantity > MIN_QUANTITY) {
          if (queue.length == 0) {
            console.error(`ERROR: Too many redemptions found for account ${account.name}`);
            break;
          }

          // Reduce the number of units in the oldest item accordingly
          queue[0].units -= quantity;
          // And increase the realised gain
          account.realised_gain += quantity * (split_rate - queue[0].rate);
          // console.log(`${account.name}: Redemption: ${quantity}/${quantity}, ${split_rate} - ${queue[0].rate} => realised_gain=${account.realised_gain}`);
        }
      }
    }

    for (let item of queue) {
      account.basis += item.units * item.rate;
    }

    // console.log(`${account.name}: basis=${account.basis} realised_gain=${account.realised_gain}`);
  } else {
    account.currency_guid = account.commodity_guid;
  }

  account.currency = currencies.get(account.currency_guid)?.mnemonic ?? "";
  account.value = convertValue(account.balance, account, account.commodity_guid, account.currency_guid, accountMap);

  for (let child of account.children) {
    await updateInvestmentValue(child, accountMap, currencies);

    let child_value = convertValue(child.value, child, child.currency_guid, account.commodity_guid, accountMap);
    if (child_value != undefined) {
      account.value += child_value;
    }
  }

  account.value_in_root_commodity = convertValue(account.value, account, account.currency_guid, root_account.commodity_guid, accountMap);
}

export function getUUID() {
  let uuid = "";
  for (var i = 0; i < 32; i++) {
    uuid += ((Math.random() * 16) | 0).toString(16);
  }
  return uuid;
}
