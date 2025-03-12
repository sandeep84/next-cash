"use server";

import { commodities } from "@prisma/client";
import {
  fetchAccounts,
  fetchPrices,
  initialiseAccounts,
  root_account,
} from "./account_data";
import prisma from "./prisma";

export async function getAccounts() {
  let accountMap = await fetchAccounts();
  await fetchPrices();

  return await initialiseAccounts(accountMap);
}

export async function getRootAccount() {
  return root_account;
}
