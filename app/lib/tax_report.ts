"use server";

import prisma from "./prisma";

export async function summariseSplits() {
  //   let root_account = await getAccounts();

  const result = await prisma.splits.findMany({
    relationLoadStrategy: "join", // or 'query'
    include: {
      account: true,
      transaction: true,
    },
    where: {
      transaction: {
        post_date: {
          gte: new Date("2023-04-06").toISOString(),
          lte: new Date("2025-04-05").toISOString(),
        },
      },
    },
  });

  console.log(result);

  return result;
}
