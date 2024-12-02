"use client";

import { AccountNode } from "@/app/lib/account_data";
import { getAccounts } from "@/app/lib/account_server";
import AccountsTable from "@/app/ui/accounts/accounts_table";
import { useEffect, useState } from "react";

export default function Page() {
  const [accounts, setAccounts] = useState(Array<AccountNode>());

  useEffect(() => {
    const fetchData = async () => {
      setAccounts(await getAccounts());
    };

    fetchData();
  }, []);

  return (
    <>
      <p>Accounts Page</p>
      <AccountsTable accounts={accounts} />
    </>
  );
}
