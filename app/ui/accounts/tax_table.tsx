"use client";

import { useState } from "react";
import { formatCurrency } from "@/app/lib/utils";
import { ChevronRightIcon, ChevronDownIcon } from "@heroicons/react/24/solid";
import { AccountNode } from "@/app/lib/definitions";
import { getValue } from "@/app/lib/account_data";

function SplitsTable({ account }: { account: AccountNode }) {
  return account.split_entries.length > 0 ? (
    <>
      <table
        key={account.guid + "_splits"}
        className="w-full text-sm text-left rtl:text-right text-gray-500 dark:text-gray-400"
      >
        <thead className="text-xs text-gray-700 uppercase bg-gray-50 dark:bg-gray-700 dark:text-gray-400">
          <tr>
            <td>Date</td>
            <td>Description</td>
            <td>Value</td>
          </tr>
        </thead>
        <tbody>
          {Object.entries(account.split_entries).map(([key, split_entry]) => (
            <tr key={split_entry.guid}>
              <td key={split_entry.guid + "date"}>
                {split_entry.transaction.post_date?.toLocaleDateString()}
              </td>
              <td key={split_entry.guid + "description"}>
                {split_entry.transaction.description}
              </td>
              <td key={split_entry.guid + "value"}>
                {getValue(split_entry.value_num, split_entry.value_denom)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </>
  ) : (
    <></>
  );
}

function TaxReportAccountEntry({
  account,
  root_account,
  level,
}: {
  account: AccountNode;
  root_account: AccountNode;
  level: number;
}) {
  return (
    <div className="mb-4">
      <p
        className={`text-${
          16 - level
        }xl font-extrabold leading-none tracking-tight text-gray-900 dark:text-white`}
      >
        {account.name}
      </p>
      <p className="mb-2">Sub-total: {account.value}</p>
      <SplitsTable account={account}></SplitsTable>
      <TaxReportAccount
        accounts={account.children}
        root_account={root_account}
        level={level + 1}
      ></TaxReportAccount>
    </div>
  );
}

function TaxReportAccount({
  accounts,
  root_account,
  level,
}: {
  accounts: Array<AccountNode>;
  root_account: AccountNode;
  level: number;
}) {
  return (
    <>
      {accounts?.map((account) => (
        <TaxReportAccountEntry
          key={account.guid}
          account={account}
          root_account={root_account}
          level={level}
        ></TaxReportAccountEntry>
      ))}
    </>
  );
}

export default function TaxReport({
  accounts,
  root_account,
}: {
  accounts: Array<AccountNode>;
  root_account: AccountNode;
}) {
  return (
    <TaxReportAccount
      accounts={accounts}
      root_account={root_account}
      level={0}
    ></TaxReportAccount>
  );
}
