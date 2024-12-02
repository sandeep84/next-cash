import { updatePriceList } from "@/app/lib/account_server";

const nodeCron = require("node-cron");

export async function register() {
  nodeCron.schedule("5 0 * * * *", async () => {
    // This job will run every day
    await updatePriceList();
  });
}
