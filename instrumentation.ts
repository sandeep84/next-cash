import { updatePriceList } from "@/app/lib/account_server";

const nodeCron = require("node-cron");

export async function register() {
  nodeCron.schedule("0 0 1 * * *", async () => {
    // This job will run every day at 1 am
    await updatePriceList();
  });
}
