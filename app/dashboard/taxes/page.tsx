"use client";

import { fetchAccountMap } from "@/app/lib/account_data";
import { summariseSplits } from "@/app/lib/tax_report";
import { useEffect, useState } from "react";

export default function Page() {
  const [splits, setSplits] = useState(Array);
  const [accountMap, setAccountMap] = useState({});

  useEffect(() => {
    const fetchData = async () => {
      const result = await summariseSplits();
      let accountMap = await fetchAccountMap();

      setSplits(result);
    };

    fetchData();
  }, []);

  return (
    <>
      {Object.entries(splits).map(([key, value]) => (
        <p key={value.guid}>{value.account.name}</p>
      ))}
    </>
  );
}
