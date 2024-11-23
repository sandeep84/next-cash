"use server";

import { Book } from "./data";

export async function getAccounts() {
  const book = new Book();
  return await book.init();
}
