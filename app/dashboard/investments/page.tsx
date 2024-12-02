"use client";

import { updatePriceList } from "@/app/lib/account_server";
import { AccountNode } from "@/app/lib/account_data";
import InvestmentsTable from "@/app/ui/accounts/investments_table";
import { Button } from "@/app/ui/button";
import { useEffect, useState } from "react";
import {
  fetchInvestments,
  initialiseInvestments,
} from "@/app/lib/investment_server";
import AccountsTable from "@/app/ui/accounts/accounts_table";

export default function Page() {
  const [accounts, setAccounts] = useState(Array<AccountNode>());

  useEffect(() => {
    const fetchData = async () => {
      setAccounts(await initialiseInvestments());
    };

    fetchData();
  }, []);

  return (
    <>
      <p>Accounts Page</p>
      <Button
        onClick={async () => {
          await updatePriceList();
        }}
      >
        Update prices
      </Button>

      <AccountsTable accounts={accounts} />
    </>
  );
}
