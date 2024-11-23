"use client";

import { getAccounts } from "@/app/lib/book";
import { AccountNode } from "@/app/lib/data";
import AccountsTable from "@/app/ui/accounts/table";
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
