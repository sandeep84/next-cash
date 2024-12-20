"use server";

import { AccountNode, updateInvestmentValue, fetchAccounts, fetchPrices, AccountNodeHash, INVESTMENT_TYPES, fetchCurrencies } from "./account_data";

export async function getInvestments() {
  let accountMap = await fetchAccounts();

  return await initializeInvestments(accountMap);
}

function pruneItems(investments: AccountNode[], account: AccountNode) {
  for (let child of account.children) {
    const index = investments.indexOf(child);
    if (index > -1) {
      investments.splice(index, 1);
    } else {
      pruneItems(investments, child);
    }
  }
}

export async function initializeInvestments(accountMap: AccountNodeHash) {
  let investments: AccountNode[] = [];

  try {
    let price_list = await fetchPrices();
    let currencies = await fetchCurrencies();

    for (let account_guid of Object.keys(accountMap)) {
      if (INVESTMENT_TYPES.includes(accountMap[account_guid].account_type)) {
        // Find the wrapper account which is not a stock or mutual fund
        var account_it;
        do {
          account_it = accountMap[account_guid].parent_guid;
        } while (INVESTMENT_TYPES.includes(accountMap[account_it].account_type));

        // Prune any existing node that is a child of the node to be added
        pruneItems(investments, accountMap[account_it]);

        // Add this wrapper node to the investment account list
        if (!investments.includes(accountMap[account_it])) {
          investments.push(accountMap[account_it]);
        }
      }
    }

    for (let investment of investments) {
      await updateInvestmentValue(investment, accountMap, currencies);
    }

    investments.forEach((account) => {
      account.children.sort(function (a, b) {
        return b.value_in_root_commodity - a.value_in_root_commodity;
      });
    });

    investments.sort(function (a, b) {
      return b.value_in_root_commodity - a.value_in_root_commodity;
    });
  } catch (error) {
    console.error("Database Error:", error);
    throw new Error("Failed to fetch accounts.");
  }

  return investments;
}
