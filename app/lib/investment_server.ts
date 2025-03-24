"use server";

import { commodities, prices } from "@prisma/client";
import prisma from "./prisma";
import {
  fetchAccountMap,
  fetchCurrencies,
  fetchPrices,
  fetchSplits,
  getRootAccount,
} from "./account_server";
import {
  AccountNode,
  AccountNodeHash,
  INVESTMENT_TYPES,
  InvestmentEntry,
  MIN_QUANTITY,
  XirrValue,
} from "./definitions";
import { convertValue, getValue } from "./account_data";
import { convertRate, RateInterval, xirr } from "node-irr";

export async function getInvestments() {
  let accountMap = await fetchAccountMap();
  return await initializeInvestments(accountMap);
}

function pruneItems(investments: AccountNode[], account: AccountNode) {
  for (let child of account.children) {
    const index = investments.indexOf(child);
    if (index > -1) {
      investments.splice(index, 1);
    } else {
      pruneItems(investments, child);
    }
  }
}

export async function initializeInvestments(accountMap: AccountNodeHash) {
  let investments: AccountNode[] = [];
  const root_account = await getRootAccount(accountMap);

  try {
    let price_list = await fetchPrices();
    let currencies = await fetchCurrencies();

    for (let account_guid of Object.keys(accountMap)) {
      if (INVESTMENT_TYPES.includes(accountMap[account_guid].account_type)) {
        // Find the wrapper account which is not a stock or mutual fund
        var account_it;
        do {
          account_it = accountMap[account_guid].parent_guid;
        } while (
          INVESTMENT_TYPES.includes(accountMap[account_it].account_type)
        );

        // Prune any existing node that is a child of the node to be added
        pruneItems(investments, accountMap[account_it]);

        // Add this wrapper node to the investment account list
        if (!investments.includes(accountMap[account_it])) {
          investments.push(accountMap[account_it]);
        }
      }
    }

    if (root_account != undefined) {
      for (let investment of investments) {
        await updateInvestmentValue(
          investment,
          accountMap,
          currencies,
          root_account.commodity_guid,
          price_list
        );
      }
    }

    investments.forEach((account) => {
      account.children.sort(function (a, b) {
        return b.value_in_root_commodity - a.value_in_root_commodity;
      });
    });

    investments.sort(function (a, b) {
      return b.value_in_root_commodity - a.value_in_root_commodity;
    });
  } catch (error) {
    console.error("Database Error:", error);
    throw new Error("Failed to fetch accounts.");
  }

  return investments;
}

export async function getUUID() {
  let uuid = "";
  for (var i = 0; i < 32; i++) {
    uuid += ((Math.random() * 16) | 0).toString(16);
  }
  return uuid;
}

export async function updatePriceList(base_currency: string) {
  const commodities_list = await prisma.commodities.findMany();

  interface IHash {
    [details: string]: commodities;
  }
  let commodityMap: IHash = {};
  commodities_list.forEach((commodity) => {
    commodityMap[commodity.mnemonic] = commodity;
  });

  const fs = require("fs");
  const path = require("path");
  const os = require("os");
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "nextcash-price-data"));
  const tempFile = path.join(tempDir, "amfiindia.txt");

  for (let commodity of commodities_list) {
    if (commodity.quote_flag) {
      console.debug(
        `Fetching latest price for ${commodity.mnemonic} from ${commodity.quote_source}`
      );
      let price_data = await updatePrice(commodity, tempFile, base_currency);

      if (price_data != undefined) {
        if (price_data.currency == "GBX") {
          price_data.price = price_data.price / 100;
          price_data.currency = "GBP";
        }

        // Check if this price information is already in the database
        const query = await prisma.prices.findFirst({
          where: {
            commodity_guid: commodity.guid,
            currency_guid: commodityMap[price_data["currency"]].guid,
            date: price_data["date"],
            value_num: Math.floor(price_data["price"] * 10000),
            value_denom: 10000,
          },
        });

        if (query == null) {
          const price_entry = await prisma.prices.create({
            data: {
              guid: await getUUID(),
              commodity_guid: commodity.guid,
              currency_guid: commodityMap[price_data["currency"]].guid,
              date: price_data["date"],
              source: "next-cash",
              type: "last",
              value_num: Math.floor(price_data["price"] * 10000),
              value_denom: 10000,
            },
          });
          console.log(price_entry);
        } else {
          console.log("Price data already found in database, skipping.");
        }
      } else {
        console.error(`Unable to fetch price for ${commodity.mnemonic}`);
      }
    }
  }

  try {
    fs.unlinkSync(tempFile);
    fs.rmdirSync(tempDir);
  } catch (err) {}
}

export async function updatePrice(
  commodity: commodities,
  tempFile: string,
  base_currency: string
) {
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
      const mstar_search_regex = new RegExp(
        '<td class="msDataText searchLink"><a href="(.*?)">(.*?)</a></td><td class="msDataText search(.+)"><span>(.*)</span></td>',
        "g"
      );
      const mstar_nav_regex = [
        '<td class="line heading">NAV<span class="heading"><br />([0-9]{2}/[0-9]{2}/[0-9]{4})</span>.*([A-Z]{3}).([0-9.]+)',
        '<td class="line heading">Closing Price<span class="heading"><br />([0-9]{2}/[0-9]{2}/[0-9]{4})</span>.*([A-Z]{3}).([0-9.]+)',
      ];

      var res = await fetch(
        `http://www.morningstar.co.uk/uk/funds/SecuritySearchResults.aspx?search=${commodity.mnemonic}`
      );
      if (res.ok) {
        const matches = Array.from(
          (await res.text()).matchAll(mstar_search_regex)
        );

        if (matches.length > 0) {
          // Pick the first match by default
          var best_match = 1;

          // Look for other matches which include the root currency in their name
          for (let match_idx = 0; match_idx < matches.length; match_idx++) {
            if (matches[match_idx].includes("GBP")) {
              best_match = match_idx;
              break;
            }
          }

          let next_url_list = [
            matches[best_match][1],
            `${matches[best_match][1]}&InvestmentType=SA`,
          ];

          for (const next_url of next_url_list) {
            res = await fetch(`http://www.morningstar.co.uk${next_url}`);
            if (res.ok) {
              var response_text = res.text();

              for (const regex of mstar_nav_regex) {
                const matches = (await response_text).match(regex);
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
                  return price_data;
                }
              }
            }
          }
        }
      }
    } catch {
      console.error(`Error fetching price data for ${commodity.mnemonic}`);
    }
  } else if (commodity.quote_flag && commodity.quote_source == "amfiindia") {
    const fs = require("fs");
    const readline = require("readline");

    try {
      fs.statSync(tempFile, (err: { code: number }, _stats: any) => {});
    } catch (err) {
      // Fetch the file from AMFI India website
      await fetch("https://www.amfiindia.com/spages/NAVAll.txt")
        .then((res) => res.text())
        .then((body) => {
          fs.writeFileSync(tempFile, body);
        });
    }

    const fileStream = fs.createReadStream(tempFile);

    const rl = readline.createInterface({
      input: fileStream,
      crlfDelay: Infinity,
    });

    for await (const line of rl) {
      const entries = line.split(";");

      if (entries[1] == commodity.mnemonic) {
        price_data = {
          date: new Date(Date.parse(entries[5])),
          currency: "INR",
          price: parseFloat(entries[4]),
        };
        break;
      }
    }
  } else if (commodity.quote_flag && commodity.quote_source == "currency") {
    if (commodity.mnemonic != base_currency) {
      await fetch(
        `https://api.frankfurter.dev/v1/latest?base=${commodity.mnemonic}&symbols=${base_currency}`
      )
        .then((resp) => resp.json())
        .then((data) => {
          price_data = {
            date: new Date(Date.parse(data.date)),
            currency: data.base,
            price: parseFloat(data.rates[base_currency]),
          };
        });
    }
  }

  return price_data;
}

export async function updateInvestmentValue(
  account: AccountNode,
  accountMap: AccountNodeHash,
  currencies: Map<string, commodities>,
  root_commodity_guid: string,
  price_list: Map<string, Array<prices>>
) {
  var xirr_values = new Array<XirrValue>();

  if (INVESTMENT_TYPES.includes(account.account_type)) {
    account.basis = 0;
    account.realised_gain = 0;

    let splits = await fetchSplits(account.guid);
    var queue = new Array<InvestmentEntry>();

    for (let split of splits) {
      let quantity = getValue(split.quantity_num, split.quantity_denom);
      let split_value = getValue(split.value_num, split.value_denom);
      let split_rate = split_value / quantity;
      account.currency_guid = split.transaction.currency_guid;

      xirr_values.push({
        amount: -split_value,
        date: split.transaction.post_date ?? new Date(2024, 1, 1),
      });

      if (quantity > 0) {
        // Purchase
        queue.push({
          units: quantity,
          rate: split_rate,
        });
        // console.log(`${account.name}: Purchase: ${quantity}, ${split_rate}`);
      } else {
        // Redemption
        quantity = -quantity;

        while (
          quantity > MIN_QUANTITY &&
          queue.length > 0 &&
          quantity >= queue[0].units
        ) {
          account.realised_gain +=
            queue[0].units * (split_rate - queue[0].rate);
          // console.log(`${account.name}: Redemption: ${queue[0].units}/${quantity}, ${split_rate} - ${queue[0].rate} => realised_gain=${account.realised_gain}`);
          quantity -= queue[0].units;
          queue.shift(); // remove the oldest item
        }

        if (quantity > MIN_QUANTITY) {
          if (queue.length == 0) {
            console.error(
              `ERROR: Too many redemptions found for account ${account.name}`
            );
            break;
          }

          // Reduce the number of units in the oldest item accordingly
          queue[0].units -= quantity;
          // And increase the realised gain
          account.realised_gain += quantity * (split_rate - queue[0].rate);
          // console.log(`${account.name}: Redemption: ${quantity}/${quantity}, ${split_rate} - ${queue[0].rate} => realised_gain=${account.realised_gain}`);
        }
      }
    }

    for (let item of queue) {
      account.basis += item.units * item.rate;
    }

    // console.log(`${account.name}: basis=${account.basis} realised_gain=${account.realised_gain}`);
  } else {
    account.currency_guid = account.commodity_guid;
    account.basis = 0;
    account.realised_gain = 0;
    account.xirr = 0;
  }

  account.currency = currencies.get(account.currency_guid)?.mnemonic ?? "";
  account.value = convertValue(
    account.balance,
    account,
    account.commodity_guid,
    account.currency_guid,
    accountMap,
    price_list
  );

  if (INVESTMENT_TYPES.includes(account.account_type)) {
    xirr_values.push({ amount: account.value, date: new Date() });
    account.xirr = convertRate(xirr(xirr_values).rate, RateInterval.Year);
    // console.log(`${account.name}: XIRR=${account.xirr}`);
  }

  var investment_children = 0;
  for (let child of account.children) {
    await updateInvestmentValue(
      child,
      accountMap,
      currencies,
      root_commodity_guid,
      price_list
    );

    account.value += convertValue(
      child.value,
      child,
      child.currency_guid,
      account.currency_guid,
      accountMap,
      price_list
    );
    account.basis += convertValue(
      child.basis,
      child,
      child.currency_guid,
      account.currency_guid,
      accountMap,
      price_list
    );
    account.realised_gain += convertValue(
      child.realised_gain,
      child,
      child.currency_guid,
      account.currency_guid,
      accountMap,
      price_list
    );

    if (child.value > 1 && INVESTMENT_TYPES.includes(child.account_type)) {
      account.xirr += child.xirr;
      investment_children++;
    }
  }

  account.value_in_root_commodity = convertValue(
    account.value,
    account,
    account.currency_guid,
    root_commodity_guid,
    accountMap,
    price_list
  );
  if (investment_children > 0) {
    account.xirr /= investment_children;
  }
}
