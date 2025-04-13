"use client";

import { formatCurrency } from "@/app/lib/utils";
import { AccountNode, AccountNodeHash } from "@/app/lib/definitions";
import { getSourceAccount, getValue } from "@/app/lib/account_data";
import { splits, transactions } from "@prisma/client";

function TransactionsTable({
  accountMap,
  account,
}: {
  accountMap: AccountNodeHash;
  account: AccountNode;
}) {
  // var source_account_map = new Map<
  //   string,
  //   { split: splits; transaction: transactions }[]
  // >();

  // for (const transaction of account.transaction_entries) {
  //   // console.log(`${account.name}: ${transaction.description}`);
  //   const source_account = getSourceAccount(accountMap, account, transaction);

  //   if (source_account != undefined) {
  //     var current_split = {};
  //     for (const split of transaction.splits) {
  //       if (split.account_guid == account.guid) {
  //         current_split = split;
  //       }
  //     }

  //     // console.log(
  //     //   `Adding split from ${account.name} -> ${source_account.name}: ${transaction.description}`
  //     // );

  //     var trans_list = source_account_map.get(source_account.name);
  //     if (trans_list != undefined) {
  //       trans_list.push({ split: current_split, transaction: transaction });
  //     } else {
  //       source_account_map.set(source_account.name, []);
  //       trans_list = source_account_map.get(source_account.name);
  //       if (trans_list != undefined) {
  //         trans_list.push({ split: current_split, transaction: transaction });
  //       }
  //     }
  //   }
  // }

  // console.log(source_account_map);

  return account.transaction_entries.length > 0 ? (
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
          {Object.values(account.transaction_entries).map((transaction) => {
            return (
              <tr key={transaction.guid}>
                <td>{transaction.post_date?.toLocaleDateString()}</td>
                <td>{transaction.description}</td>
                <td></td>
              </tr>
            );
          })}
          {/* <tr key={`${account.guid}_${transaction_entry.guid}`}>
            <td key={transaction_entry.guid + "_date"}>
              {transaction_entry.post_date?.toLocaleDateString()}
            </td>
            <td key={transaction_entry.guid + "_description"}>
              {transaction_entry.description}
            </td>
            <td key={transaction_entry.guid + "_value"}>
              {Object.values(
                transaction_entry.splits.map((split_entry) => {
                  <p>
                    getValue(split_entry.value_num, split_entry.value_denom);
                  </p>;
                })
              )}
            </td>
          </tr> */}
        </tbody>
      </table>
    </>
  ) : (
    <></>
  );
}

function TaxReportAccountEntry({
  accountMap,
  account,
  root_account,
  level,
}: {
  accountMap: AccountNodeHash;
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
      <TransactionsTable
        accountMap={accountMap}
        account={account}
      ></TransactionsTable>
      <TaxReportAccount
        accountMap={accountMap}
        accounts={account.children}
        root_account={root_account}
        level={level + 1}
      ></TaxReportAccount>
    </div>
  );
}

function TaxReportAccount({
  accountMap,
  accounts,
  root_account,
  level,
}: {
  accountMap: AccountNodeHash;
  accounts: Array<AccountNode>;
  root_account: AccountNode;
  level: number;
}) {
  return (
    <>
      {accounts?.map((account) => (
        <TaxReportAccountEntry
          key={account.guid}
          accountMap={accountMap}
          account={account}
          root_account={root_account}
          level={level}
        ></TaxReportAccountEntry>
      ))}
    </>
  );
}

export default function TaxReport({
  accountMap,
  accounts,
  root_account,
}: {
  accountMap: AccountNodeHash;
  accounts: Array<AccountNode>;
  root_account: AccountNode;
}) {
  return (
    <TaxReportAccount
      accountMap={accountMap}
      accounts={accounts}
      root_account={root_account}
      level={0}
    ></TaxReportAccount>
  );
}
