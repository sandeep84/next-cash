"use client";

import { formatCurrency } from "@/app/lib/utils";
import { AccountNode, AccountNodeHash } from "@/app/lib/definitions";
import { getSourceAccount, getValue } from "@/app/lib/account_data";
import { splits, transactions } from "@prisma/client";

function TransactionsTable({
  accountMap,
  account,
  base_currency,
  level,
}: {
  accountMap: AccountNodeHash;
  account: AccountNode;
  base_currency: string;
  level: number;
}) {
  var source_account_map = new Map<
    string,
    {
      sub_total: number;
      sub_total_base: number;
      commodity: string;

      transaction: {
        split: splits;
        transaction: transactions;
      }[];
    }
  >();

  for (const transaction of account.transaction_entries) {
    const source_account = getSourceAccount(accountMap, account, transaction);

    if (source_account != undefined) {
      var current_split = undefined;
      for (const split of transaction.splits) {
        if (split.account_guid == account.guid) {
          current_split = split;
        }
      }

      var entry = source_account_map.get(source_account.name);
      if (entry == undefined) {
        source_account_map.set(source_account.name, {
          sub_total: 0,
          sub_total_base: 0,
          transaction: [],
          commodity: source_account.commodity,
        });
        entry = source_account_map.get(source_account.name);
      }

      if (current_split != undefined && entry != undefined) {
        entry.transaction.push({
          split: current_split,
          transaction: transaction,
        });
        entry.sub_total += getValue(
          current_split.value_num,
          current_split.value_denom
        );
      }
    }
  }

  // console.log(source_account_map);

  return source_account_map.size > 0 ? (
    <>
      <p
        className={`text-${
          16 - level
        }xl font-extrabold leading-none tracking-tight text-gray-900 dark:text-white`}
      >
        {account.name}
      </p>
      <p className="mb-2">Sub-total: {account.value}</p>
      <table
        key={account.guid + "_splits"}
        className="w-full text-sm text-left rtl:text-right text-gray-500 dark:text-gray-400"
      >
        <thead className="text-xs text-gray-700 uppercase bg-gray-50 dark:bg-gray-700 dark:text-gray-400">
          <tr>
            <td>Date</td>
            <td>Description</td>
            <td>Value</td>
            <td>Sub-total</td>
            <td>Value ({base_currency})</td>
            <td>Sub-total ({base_currency})</td>
          </tr>
        </thead>
        <tbody>
          {source_account_map
            .entries()
            .toArray()
            .map(([source_account_name, source_account_entry]) => {
              return (
                <>
                  <tr key={account.guid + source_account_name}>
                    <td key="name" className="font-bold">
                      {source_account_name}
                    </td>
                    <td key="description"></td>
                    <td key="value"></td>
                    <td key="sub_total">
                      {formatCurrency(
                        source_account_entry.sub_total,
                        source_account_entry.commodity
                      )}
                    </td>
                  </tr>
                  {source_account_entry.transaction.map((value) => {
                    return (
                      <tr key={account.guid + "_" + value.transaction.guid}>
                        <td key="date">
                          {value.transaction.post_date?.toLocaleDateString()}
                        </td>
                        <td key="description">
                          {value.transaction.description}
                        </td>
                        <td key="value">
                          {formatCurrency(
                            getValue(
                              value.split.value_num,
                              value.split.value_denom
                            ),
                            source_account_entry.commodity
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </>
              );
            })}
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
      <TransactionsTable
        accountMap={accountMap}
        account={account}
        base_currency={root_account.commodity}
        level={level}
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

function reportType(account_type: string) {
  if (account_type == "ASSET") {
    return "Capital gains statement";
  } else if (account_type == "INCOME") {
    return "Income statement";
  } else if (account_type == "Expense") {
    return "Expense report";
  }

  return account_type;
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
    <>
      {accounts?.map((account) => (
        <>
          <h1>{reportType(account.account_type)}</h1>
          <TaxReportAccountEntry
            key={account.guid}
            accountMap={accountMap}
            account={account}
            root_account={root_account}
            level={0}
          ></TaxReportAccountEntry>
        </>
      ))}
    </>
  );
}
