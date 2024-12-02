"use client";

import { useState } from "react";
import { formatCurrency } from "@/app/lib/utils";
import { AccountNode } from "@/app/lib/account_data";
import { ChevronRightIcon, ChevronDownIcon } from "@heroicons/react/24/solid";

function InvestmentRow({
  account,
  level,
}: {
  account: AccountNode;
  level: number;
}) {
  const [state, setState] = useState("collapsed");

  function click_handler() {
    if (state == "collapsed") {
      setState("expanded");
    } else {
      setState("collapsed");
    }
  }

  return (
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
        <td className="whitespace-nowrap px-3 py-3">{account.account_type}</td>
        <td className="whitespace-nowrap px-3 py-3" suppressHydrationWarning>
          {formatCurrency(account.balance, account.commodity)}
        </td>
      </tr>
      {state == "expanded" ? (
        <InvestmentRows
          accounts={account.children}
          level={level + 1}
        ></InvestmentRows>
      ) : undefined}
    </>
  );
}

function InvestmentRows({
  accounts,
  level,
}: {
  accounts: Array<AccountNode>;
  level: number;
}) {
  return (
    <>
      {accounts?.map((account) => (
        <InvestmentRow
          key={account.guid}
          account={account}
          level={level}
        ></InvestmentRow>
      ))}
    </>
  );
}

export default function InvestmentsTable({
  accounts,
}: {
  accounts: Array<AccountNode>;
}) {
  return (
    <div className="mt-6 flow-root">
      <div className="inline-block min-w-full align-middle">
        <div className="rounded-lg bg-gray-50 p-2 md:pt-0">
          <div className="md:hidden">
            {/* {accounts?.map((account) => (
              <div
                key={account.guid}
                className="mb-2 w-full rounded-md bg-white p-4"
              >
                <div className="flex items-center justify-between border-b pb-4">
                  <div>
                    <div className="mb-2 flex items-center">
                      <p>{account.name}</p>
                    </div>
                    <p className="text-sm text-gray-500">
                      {account.account_type}
                    </p>
                  </div>
                  <InvoiceStatus status={account.status} />
                </div>
                <div className="flex w-full items-center justify-between pt-4">
                  <div>
                    <p className="text-xl font-medium">
                      {formatCurrency(account.amount)}
                    </p>
                    <p>{formatDateToLocal(account.date)}</p>
                  </div>
                  <div className="flex justify-end gap-2">
                    <UpdateInvoice id={account.id} />
                    <DeleteInvoice id={account.id} />
                  </div>
                </div>
              </div>
            ))} */}
          </div>
          <table className="min-w-full text-gray-900 md:table">
            <thead className="rounded-lg text-left text-sm font-normal">
              <tr>
                <th scope="col" className="px-4 py-5 font-medium sm:pl-6">
                  Account
                </th>
                <th scope="col" className="px-3 py-5 font-medium">
                  Value
                </th>
                <th scope="col" className="px-3 py-5 font-medium">
                  Basis
                </th>
                <th scope="col" className="px-3 py-5 font-medium">
                  Realized gain
                </th>
                <th scope="col" className="px-3 py-5 font-medium">
                  Unrealized gain
                </th>
                <th scope="col" className="px-3 py-5 font-medium">
                  Total gain
                </th>
                <th scope="col" className="px-3 py-5 font-medium">
                  Annualized gain
                </th>
              </tr>
            </thead>
            <tbody className="bg-white">
              <InvestmentRows accounts={accounts} level={0}></InvestmentRows>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
