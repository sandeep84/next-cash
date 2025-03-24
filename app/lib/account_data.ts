import { prices } from "@prisma/client";
import { AccountNode, AccountNodeHash } from "./definitions";

export function getValue(num: bigint, denom: bigint) {
  return Number((num * BigInt(10000)) / denom) / 10000;
}

function exchangeRate(
  commodity1_guid: string,
  commodity2_guid: string,
  price_list: Map<string, Array<prices>>
) {
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

export function convertValue(
  value: number,
  account1: AccountNode,
  source_commodity_guid: string,
  target_currency_guid: string,
  accountMap: AccountNodeHash,
  price_list: Map<string, Array<prices>>
) {
  var rate;
  if (source_commodity_guid == target_currency_guid) {
    rate = 1.0;
  } else {
    rate = exchangeRate(
      source_commodity_guid,
      target_currency_guid,
      price_list
    );
  }

  if (rate == undefined) {
    try {
      let parent_account = accountMap[account1.parent_guid];
      let rate1 = exchangeRate(
        source_commodity_guid,
        parent_account.commodity_guid,
        price_list
      );
      let rate2 = exchangeRate(
        parent_account.commodity_guid,
        target_currency_guid,
        price_list
      );
      rate =
        rate1 != undefined && rate2 != undefined ? rate1 * rate2 : undefined;
    } catch {}
  }
  if (rate != undefined) {
    return value * rate;
  }

  return 0;
}

export function updateValue(
  account: AccountNode,
  accountMap: AccountNodeHash,
  root_commodity_guid: string,
  price_list: Map<string, Array<prices>>
) {
  account.value = account.balance;
  account.children.forEach((child) => {
    updateValue(child, accountMap, root_commodity_guid, price_list);

    let child_value = convertValue(
      child.value,
      child,
      child.commodity_guid,
      account.commodity_guid,
      accountMap,
      price_list
    );
    if (child_value != undefined) {
      account.value += child_value;
    }
  });
  if (account.parent_guid in accountMap) {
    account.value_in_root_commodity =
      convertValue(
        account.value,
        account,
        account.commodity_guid,
        root_commodity_guid,
        accountMap,
        price_list
      ) ?? 0;
  }
}
