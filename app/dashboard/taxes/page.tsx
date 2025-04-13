"use client";

import { getValue } from "@/app/lib/account_data";
import { fetchAccountMap, getRootAccount } from "@/app/lib/account_server";
import { AccountNode } from "@/app/lib/definitions";
import { summariseTransactions } from "@/app/lib/tax_report";
import TaxReport from "@/app/ui/accounts/tax_table";
import { splits } from "@prisma/client";
import { useEffect, useState } from "react";

export default function Page() {
  const [accountMap, setAccountMap] = useState({});
  const [root_account, setRootAccount] = useState(new AccountNode());

  useEffect(() => {
    const fetchData = async () => {
      const { accountMap, root_acc } = await summariseTransactions(
        new Date("2023-04-06"),
        new Date("2024-04-05")
      );

      if (root_acc != undefined) {
        setRootAccount(root_acc);
      }

      setAccountMap(accountMap);
    };

    fetchData();
  }, []);

  return (
    <TaxReport
      accountMap={accountMap}
      accounts={root_account.children}
      root_account={root_account}
    ></TaxReport>
  );
}
