"use client";

import { getRootAccount, updatePriceList } from "@/app/lib/account_server";
import { AccountNode } from "@/app/lib/account_data";
import { Button } from "@/app/ui/button";
import { useEffect, useState } from "react";
import InvestmentTable from "@/app/ui/accounts/investment_table";
import { getInvestments } from "@/app/lib/investment_server";
import { Card } from "@/app/ui/dashboard/cards";
import { formatCurrency } from "@/app/lib/utils";

export default function Page() {
  const [accounts, setAccounts] = useState(Array<AccountNode>());
  const [root_account, setRootAccount] = useState(new AccountNode());
  const [total_value, setTotalValue] = useState(0);

  useEffect(() => {
    const fetchData = async () => {
      var accs = await getInvestments();
      setAccounts(accs);
      setRootAccount(await getRootAccount());

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
          await updatePriceList();
        }}
      >
        Update prices
      </Button>

      <Card
        title="Investments"
        value={formatCurrency(total_value, root_account.commodity)}
        type="collected"
      ></Card>

      <InvestmentTable accounts={accounts} root_account={root_account} />
    </>
  );
}
