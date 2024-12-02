import prisma from "@/app/lib/prisma";
import { accounts, prices } from "@prisma/client";
import { AccountNode, fetchAccounts } from "./account_data";

export class InvestmentNode {
  guid: string = "";
  parent_guid: string = "";
  name: string = "";
  account_type: string = "";
  commodity: string = "";
  commodity_guid: string = "";

  value: number = 0.0;
  basis: number = 0.0;
  realized_gain: number = 0.0;
  unrealized_gain: number = 0.0;
  total_gain: number = 0.0;
  annualized_gain: number = 0.0;

  children: InvestmentNode[] = [];
}
