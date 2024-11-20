// index.tsx
import { fetchFilteredAccounts } from "@/app/lib/data";
import prisma from "@/app/lib/prisma";
import AccountsTable from "@/app/ui/accounts/table";

export default async function Page() {
  const accounts = await fetchFilteredAccounts("", 1);

  return (
    <>
      <p>Accounts Page</p>
      <AccountsTable accounts={accounts} />
    </>
  );
}
