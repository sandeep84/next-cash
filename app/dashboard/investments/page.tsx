"use client";

import { fetchAccountMap, getRootAccount } from "@/app/lib/account_server";
import { Button } from "@/app/ui/button";
import { useEffect, useState } from "react";
import InvestmentTable from "@/app/ui/accounts/investment_table";
import { getInvestments, updatePriceList } from "@/app/lib/investment_server";
import { Card } from "@/app/ui/dashboard/cards";
import { formatCurrency } from "@/app/lib/utils";
import "chart.js/auto";
import { Doughnut } from "react-chartjs-2";
import { AccountNode } from "@/app/lib/definitions";

export default function Page() {
  const [accounts, setAccounts] = useState(Array<AccountNode>());
  const [root_account, setRootAccount] = useState(new AccountNode());
  const [total_value, setTotalValue] = useState(0);

  useEffect(() => {
    const fetchData = async () => {
      const accountMap = await fetchAccountMap();
      var accs = await getInvestments();
      setAccounts(accs);

      const ra = await getRootAccount(accountMap);
      if (ra != undefined) {
        setRootAccount(ra);
      }

      var value = 0;
      accs?.map((account) => {
        value += account.value_in_root_commodity;
      });

      setTotalValue(value);
    };

    fetchData();
  }, []);

  return (
    <>
      <p>Investments Page</p>
      <Button
        onClick={async () => {
          await updatePriceList(root_account.commodity);
        }}
      >
        Update prices
      </Button>
      <div className="grid grid-flow-col grid-rows-1 mb-2 h-60 rounded-md bg-white p-4">
        <Card
          title="Investments"
          value={formatCurrency(total_value, root_account.commodity)}
          type="collected"
        ></Card>
        <div className="h-50 w-100">
          <Doughnut
            options={{
              plugins: {
                legend: {
                  display: false,
                },
                colors: {
                  forceOverride: true,
                },
              },
            }}
            data={{
              labels: Object.entries(accounts).map(
                ([key, value]) => value.name
              ),

              datasets: [
                {
                  data: Object.entries(accounts).map(
                    ([key, value]) => value.value_in_root_commodity
                  ),
                  hoverOffset: 4,
                },
              ],
            }}
          />
        </div>
      </div>
      <InvestmentTable accounts={accounts} root_account={root_account} />
    </>
  );
}
