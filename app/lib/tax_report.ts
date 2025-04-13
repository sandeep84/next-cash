"use server";

import { getValue, updateValue } from "./account_data";
import { fetchAccountMap, fetchPrices, getRootAccount } from "./account_server";
import { AccountNode } from "./definitions";
import prisma from "./prisma";

export async function summariseTransactions(start_date: Date, end_date: Date) {
  const result = await prisma.transactions.findMany({
    relationLoadStrategy: "join", // or 'query'
    include: {
      splits: true,
    },
    where: {
      post_date: {
        gte: start_date.toISOString(),
        lte: end_date.toISOString(),
      },
    },
  });

  let accountMap = await fetchAccountMap();
  let root_acc = await getRootAccount(accountMap);

  Object.values(accountMap).map((account) => {
    account.balance = 0;
  });

  for (let transaction_entry of Object.values(result)) {
    for (let split_entry of Object.values(transaction_entry.splits)) {
      let account = accountMap[split_entry.account_guid];
      if (account != undefined) {
        account.transaction_entries.push(transaction_entry);
        account.balance += getValue(
          split_entry.value_num,
          split_entry.value_denom
        );
      }
    }
  }

  if (root_acc != undefined) {
    const price_list = await fetchPrices();
    updateValue(root_acc, accountMap, root_acc?.commodity_guid, price_list);
  }

  return { accountMap, root_acc };
}
