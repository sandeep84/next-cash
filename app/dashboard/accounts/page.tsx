// index.tsx
import { Book } from "@/app/lib/data";
import prisma from "@/app/lib/prisma";
import AccountsTable from "@/app/ui/accounts/table";

export default async function Page() {
  const book = new Book();
  const accounts = await book.init();

  return (
    <>
      <p>Accounts Page</p>
      <AccountsTable accounts={accounts} />
    </>
  );
}
