"use client";

import { Button } from "@/app/ui/button";
import { Book } from "@/app/lib/data";
import { useEffect, useState } from "react";
import { fetchAllPrices } from "@/app/lib/book";

export default function Page() {
  const [price, setPrice] = useState(0);

  return (
    <>
      <p>Investments Page</p>
      <p>Price is {price}</p>
      <Button
        onClick={async () => {
          await fetchAllPrices();
        }}
      >
        Update prices
      </Button>
    </>
  );
}
