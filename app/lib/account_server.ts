"use server";

import { commodities } from "@prisma/client";
import {
  fetchAccounts,
  fetchPrices,
  getUUID,
  initialiseAccounts,
  root_account,
} from "./account_data";
import prisma from "./prisma";

export async function getAccounts() {
  let accountMap = await fetchAccounts();
  await fetchPrices();

  return await initialiseAccounts(accountMap);
}

export async function getRootAccount() {
  return root_account;
}

export async function updatePriceList() {
  const commodities_list = await prisma.commodities.findMany();

  interface IHash {
    [details: string]: commodities;
  }
  let commodityMap: IHash = {};
  commodities_list.forEach((commodity) => {
    commodityMap[commodity.mnemonic] = commodity;
  });

  for (let commodity of commodities_list) {
    if (commodity.quote_flag) {
      console.debug(
        `Fetching latest price for ${commodity.mnemonic} from ${commodity.quote_source}`
      );
      let price_data = await updatePrice(commodity);

      if (price_data != undefined) {
        const price_entry = await prisma.prices.create({
          data: {
            guid: getUUID(),
            commodity_guid: commodity.guid,
            currency_guid: commodityMap[price_data["currency"]].guid,
            date: price_data["date"],
            source: "next-cash",
            type: "last",
            value_num: Math.floor(price_data["price"] * 10000),
            value_denom: 10000,
          },
        });
        console.debug(price_entry);
      } else {
        console.error(`Unable to fetch price for ${commodity.mnemonic}`);
      }
    }
  }
}

export async function updatePrice(commodity: commodities) {
  interface PriceData {
    date: Date;
    price: number;
    currency: string;
  }

  let price_data: PriceData | undefined = undefined;

  if (commodity.quote_flag && commodity.quote_source == "alphavantage") {
    try {
      const api_key = process.env.ALPHAVANTAGE_API_KEY;
      const res = await fetch(
        `https://www.alphavantage.co/query?function=GLOBAL_QUOTE&symbol=${commodity.mnemonic}&apikey=${api_key}`
      );
      if (res.ok) {
        let res_data = await res.json();
        price_data = {
          date: new Date(res_data["Global Quote"]["07. latest trading day"]),
          price: res_data["Global Quote"]["05. price"],
          currency: "USD",
        };
      }
    } catch {
      console.error(`Error fetching price data for ${commodity.mnemonic}`);
    }
  } else if (
    commodity.quote_flag &&
    (commodity.quote_source == "morningstaruk" ||
      commodity.quote_source == "mstaruk" ||
      commodity.quote_source == "ukfunds")
  ) {
    try {
      const mstar_search_regex =
        '<td class="msDataText searchLink"><a href="(.*?)">(.*?)</a></td><td class="msDataText searchIsin"><span>(.*)</span></td>';
      const mstar_nav_regex =
        '<td class="line heading">NAV<span class="heading"><br />([0-9]{2}/[0-9]{2}/[0-9]{4})</span>.*([A-Z]{3}).([0-9.]+)';

      var res = await fetch(
        `http://www.morningstar.co.uk/uk/funds/SecuritySearchResults.aspx?search=${commodity.mnemonic}`
      );
      if (res.ok) {
        const matches = (await res.text()).match(mstar_search_regex);
        if (matches) {
          let next_url = matches[1];

          res = await fetch(`http://www.morningstar.co.uk${next_url}`);
          if (res.ok) {
            const matches = (await res.text()).match(mstar_nav_regex);
            if (matches) {
              var parts = matches[1].split("/");

              price_data = {
                date: new Date(
                  parseInt(parts[2], 10),
                  parseInt(parts[1], 10) - 1,
                  parseInt(parts[0], 10)
                ),
                currency: matches[2],
                price: parseFloat(matches[3]),
              };
            } else {
              res = await fetch(
                `http://www.morningstar.co.uk${next_url}&InvestmentType=SA`
              );
              if (res.ok) {
                const matches = (await res.text()).match(mstar_nav_regex);
                if (matches) {
                  var parts = matches[1].split("/");

                  price_data = {
                    date: new Date(
                      parseInt(parts[2], 10),
                      parseInt(parts[1], 10) - 1,
                      parseInt(parts[0], 10)
                    ),
                    currency: matches[2],
                    price: parseFloat(matches[3]),
                  };
                }
              }
            }
          }
        }
      }
    } catch {
      console.error(`Error fetching price data for ${commodity.mnemonic}`);
    }
  }

  if (price_data != undefined && price_data.currency == "GBX") {
    price_data.price = price_data.price / 100;
    price_data.currency = "GBP";
  }

  return price_data;
}
