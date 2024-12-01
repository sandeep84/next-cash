"use server";

import { Book } from "./data";
const book = new Book();

export async function getAccounts() {
  return await book.init();
}

export async function fetchAllPrices() {
  return await book.updatePriceList();
}
