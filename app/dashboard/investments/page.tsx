"use client";

import { updatePriceList } from "@/app/lib/book";
import { Button } from "@/app/ui/button";
import { useState } from "react";

export default function Page() {
  const [price, setPrice] = useState(0);

  return (
    <>
      <p>Investments Page</p>
      <p>Price is {price}</p>
      <Button
        onClick={async () => {
          await updatePriceList();
        }}
      >
        Update prices
      </Button>
    </>
  );
}
