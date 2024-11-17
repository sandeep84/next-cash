// index.tsx
import prisma from "@/app/lib/prisma";
import AccountsTable from "@/app/ui/invoices/table";

export default function Page() {
  return (
    <>
      <p>Accounts Page</p>
      <AccountsTable query="" currentPage={1} />
    </>
  );
}
