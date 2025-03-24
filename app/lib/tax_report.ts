"use server";

import prisma from "./prisma";

export async function summariseSplits(start_date: Date, end_date: Date) {
  const result = await prisma.splits.findMany({
    relationLoadStrategy: "join", // or 'query'
    include: {
      transaction: true,
    },
    where: {
      transaction: {
        post_date: {
          gte: start_date.toISOString(),
          lte: end_date.toISOString(),
        },
      },
    },
  });

  // console.log(result);

  return result;
}
