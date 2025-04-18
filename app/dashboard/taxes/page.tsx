"use client";

import { AccountNode } from "@/app/lib/definitions";
import { summariseTransactions } from "@/app/lib/tax_report";
import { fetchPrices } from "@/app/lib/account_server";
import TaxReport from "@/app/ui/accounts/tax_table";
import { useEffect, useState } from "react";

export default function Page() {
  const [accountMap, setAccountMap] = useState({});
  const [root_account, setRootAccount] = useState(new AccountNode());
  const [price_list, setPriceList] = useState(new Map<string, Array<prices>>());

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

      const prices = await fetchPrices();
      setPriceList(prices);
    };

    fetchData();
  }, []);

  console.log(
    `Root account commodity is ${root_account.commodity} (${root_account.commodity_guid})`
  );

  return (
    <TaxReport
      accountMap={accountMap}
      accounts={root_account.children}
      root_account={root_account}
      price_list={price_list}
    ></TaxReport>
  );
}
