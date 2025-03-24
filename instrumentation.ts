import { fetchAccountMap, getRootAccount } from "./app/lib/account_server";
import { updatePriceList } from "./app/lib/investment_server";

const nodeCron = require("node-cron");

export async function register() {
  nodeCron.schedule("0 0 1 * * *", async () => {
    // This job will run every day at 1 am
    const accountsMap = await fetchAccountMap();
    const root_account = await getRootAccount(accountsMap);
    if (root_account != undefined) {
      await updatePriceList(root_account.currency);
    }
  });
}
