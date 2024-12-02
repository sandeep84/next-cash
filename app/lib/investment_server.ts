"use server";

import {
  AccountNode,
  fetchAccounts,
  fetchPrices,
  updateBalance,
} from "./account_data";

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

export async function fetchInvestments() {
  let investments: AccountNode[] = [];
  const INVESTMENT_TYPES = ["STOCK", "MUTUAL"];

  try {
    // First fetch all accounts
    const accountMap = await fetchAccounts();

    console.log(`Fetched ${Object.keys(accountMap).length} accounts`);

    Object.keys(accountMap).forEach(function (account_guid) {
      if (INVESTMENT_TYPES.includes(accountMap[account_guid].account_type)) {
        // Find the wrapper account which is not a stock or mutual fund
        var account_it;
        do {
          account_it = accountMap[account_guid].parent_guid;
        } while (
          INVESTMENT_TYPES.includes(accountMap[account_it].account_type)
        );

        // Prune any existing node that is a child of the node to be added
        pruneItems(investments, accountMap[account_it]);

        // Add this wrapper node to the investment account list
        if (!investments.includes(accountMap[account_it])) {
          investments.push(accountMap[account_it]);
        }
      }
    });
  } catch (error) {
    console.error("Database Error:", error);
    throw new Error("Failed to fetch accounts.");
  }

  for (let investment of investments) {
    console.log(investment);
  }

  return investments;
}

export async function initialiseInvestments() {
  let investments = await fetchInvestments();
  let price_list = await fetchPrices();

  for (let investment of investments) {
    updateBalance(investment);
  }

  return investments;
}
