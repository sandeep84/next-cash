import { fetchAllPrices } from "./app/lib/book";

const nodeCron = require("node-cron");

export async function register() {
  nodeCron.schedule("5 0 * * * *", async () => {
    // This job will run every day
    await fetchAllPrices();
  });
}
