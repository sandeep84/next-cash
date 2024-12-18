"use client";

import { useState } from "react";
import { formatCurrency } from "@/app/lib/utils";
import { AccountNode } from "@/app/lib/account_data";
import { ChevronRightIcon, ChevronDownIcon } from "@heroicons/react/24/solid";
import { root } from "postcss";

function AccountRow({
  account,
  root_account,
  level,
  use_tr,
}: {
  account: AccountNode;
  root_account: AccountNode;
  level: number;
  use_tr: boolean;
}) {
  const [state, setState] = useState("collapsed");

  function click_handler() {
    if (state == "collapsed") {
      setState("expanded");
    } else {
      setState("collapsed");
    }
  }

  return use_tr ? (
    <>
      <tr
        key={"tr-${account.guid}"}
        className="w-full border-b py-3 text-sm last-of-type:border-none [&:first-child>td:first-child]:rounded-tl-lg [&:first-child>td:last-child]:rounded-tr-lg [&:last-child>td:first-child]:rounded-bl-lg [&:last-child>td:last-child]:rounded-br-lg"
      >
        <td className="whitespace-nowrap py-3 pl-6 pr-3">
          <div className="mb-2 flex items-center">
            <span className={`w-${level * 4}`}></span>
            {account.children.length > 0 ? (
              state == "collapsed" ? (
                <ChevronRightIcon
                  className="w-6 size-4"
                  onClick={click_handler}
                />
              ) : (
                <ChevronDownIcon
                  className="w-6 size-4"
                  onClick={click_handler}
                />
              )
            ) : (
              <span className="w-6"></span>
            )}
            <p>{account.name}</p>
          </div>
        </td>
        <td className="whitespace-nowrap px-3 py-3" suppressHydrationWarning>
          {formatCurrency(account.value, account.commodity)}
        </td>
        <td className="whitespace-nowrap px-3 py-3" suppressHydrationWarning>
          {formatCurrency(
            account.value_in_root_commodity,
            root_account.commodity
          )}
        </td>
      </tr>
      {state == "expanded" ? (
        <AccountRows
          accounts={account.children}
          root_account={root_account}
          level={level + 1}
          use_tr={use_tr}
        ></AccountRows>
      ) : undefined}
    </>
  ) : (
    <>
      <div key={account.guid} className="mb-2 w-full rounded-md bg-white p-4">
        <div>
          <div className="mb-2 flex items-center grid grid-rows-2 grid-cols-2 grid-flow-col gap-4">
            <div className="row-span-2 flex items-center">
              <span className={`w-${level * 4}`}></span>
              {account.children.length > 0 ? (
                state == "collapsed" ? (
                  <ChevronRightIcon
                    className="w-6 size-4"
                    onClick={click_handler}
                  />
                ) : (
                  <ChevronDownIcon
                    className="w-6 size-4"
                    onClick={click_handler}
                  />
                )
              ) : (
                <span className="w-6"></span>
              )}
              <p className="text-l font-medium">{account.name}</p>
            </div>
            <div className="flex w-full items-end justify-end">
              <p className="text-l font-medium">
                {formatCurrency(account.value, account.commodity)}
              </p>
            </div>
            {account.commodity != root_account.commodity ? (
              <div className="flex w-full items-end justify-end">
                <p className="text-sm text-gray-500">
                  {formatCurrency(
                    account.value_in_root_commodity,
                    root_account.commodity
                  )}
                </p>
              </div>
            ) : undefined}
          </div>
        </div>
      </div>
      {state == "expanded" ? (
        <AccountRows
          accounts={account.children}
          root_account={root_account}
          level={level + 1}
          use_tr={use_tr}
        ></AccountRows>
      ) : undefined}
    </>
  );
}

function AccountRows({
  accounts,
  root_account,
  level,
  use_tr,
}: {
  accounts: Array<AccountNode>;
  root_account: AccountNode;
  level: number;
  use_tr: boolean;
}) {
  return (
    <>
      {accounts?.map((account) => (
        <AccountRow
          key={account.guid}
          account={account}
          root_account={root_account}
          level={level}
          use_tr={use_tr}
        ></AccountRow>
      ))}
    </>
  );
}

export default function AccountsTable({
  accounts,
  root_account,
}: {
  accounts: Array<AccountNode>;
  root_account: AccountNode;
}) {
  return (
    <div className="mt-6 flow-root">
      <div className="inline-block min-w-full align-middle">
        <div className="rounded-lg bg-gray-50 p-2 md:pt-0">
          <div className="md:hidden">
            <AccountRows
              accounts={accounts}
              root_account={root_account}
              level={0}
              use_tr={false}
            ></AccountRows>
          </div>
          <table className="hidden min-w-full text-gray-900 md:table">
            <thead className="rounded-lg text-left text-sm font-normal">
              <tr>
                <th scope="col" className="px-4 py-5 font-medium sm:pl-6">
                  Account
                </th>
                <th scope="col" className="px-3 py-5 font-medium">
                  Value
                </th>
                <th scope="col" className="px-3 py-5 font-medium">
                  Value ({root_account.commodity})
                </th>
                {/* <th scope="col" className="px-3 py-5 font-medium">
                  Status
                </th>
                <th scope="col" className="relative py-3 pl-6 pr-3">
                  <span className="sr-only">Edit</span>
                </th> */}
              </tr>
            </thead>
            <tbody className="bg-white">
              <AccountRows
                accounts={accounts}
                root_account={root_account}
                level={0}
                use_tr={true}
              ></AccountRows>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
