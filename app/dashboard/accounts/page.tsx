"use client";

import { getAccounts } from "@/app/lib/account_server";
import { AccountNode } from "@/app/lib/definitions";
import AccountsTable from "@/app/ui/accounts/accounts_table";
import { useEffect, useState } from "react";

export default function Page() {
  const [root_account, setRootAccount] = useState(new AccountNode());

  useEffect(() => {
    const fetchData = async () => {
      setRootAccount((await getAccounts()) ?? new AccountNode());
    };

    fetchData();
  }, []);

  return (
    <>
      <p>Accounts Page</p>
      <AccountsTable
        accounts={root_account.children}
        root_account={root_account}
      />
    </>
  );
}
