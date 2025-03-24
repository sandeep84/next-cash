"use client";

import { getValue } from "@/app/lib/account_data";
import { fetchAccountMap, getRootAccount } from "@/app/lib/account_server";
import { AccountNode } from "@/app/lib/definitions";
import { summariseSplits } from "@/app/lib/tax_report";
import TaxReport from "@/app/ui/accounts/tax_table";
import { splits } from "@prisma/client";
import { useEffect, useState } from "react";

export default function Page() {
  const [splits, setSplits] = useState(new Array<splits>());
  const [accountMap, setAccountMap] = useState({});
  const [root_account, setRootAccount] = useState(new AccountNode());

  useEffect(() => {
    const fetchData = async () => {
      const result = await summariseSplits(
        new Date("2024-04-06"),
        new Date("2025-04-05")
      );
      let accountMap = await fetchAccountMap();
      let root_acc = await getRootAccount(accountMap);

      for (const [key, split_entry] of Object.entries(result)) {
        const account = accountMap[split_entry.account_guid];
        if (account != undefined) {
          account.split_entries.push(split_entry);
        }
      }

      setSplits(result);
      setAccountMap(accountMap);
      if (root_acc != undefined) {
        setRootAccount(root_acc);
      }
    };

    fetchData();
  }, []);

  return (
    <>
      <p>Tax report</p>
      <TaxReport
        accounts={root_account.children}
        root_account={root_account}
      ></TaxReport>
    </>
  );
}
