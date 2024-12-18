"use client";

import { getRootAccount, updatePriceList } from "@/app/lib/account_server";
import { AccountNode } from "@/app/lib/account_data";
import { Button } from "@/app/ui/button";
import { useEffect, useState } from "react";
import AccountsTable from "@/app/ui/accounts/accounts_table";
import {
  getInvestments,
  initializeInvestments,
} from "@/app/lib/investment_server";

export default function Page() {
  const [accounts, setAccounts] = useState(Array<AccountNode>());
  const [root_account, setRootAccount] = useState(new AccountNode());

  useEffect(() => {
    const fetchData = async () => {
      setAccounts(await getInvestments());
      setRootAccount(await getRootAccount());
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

      <AccountsTable accounts={accounts} root_account={root_account} />
    </>
  );
}
