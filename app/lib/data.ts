import prisma from "@/app/lib/prisma";
import { prices, commodities } from "@prisma/client";
import { env } from "process";

export class AccountNode {
  guid: string = "";
  parent_guid: string = "";
  name: string = "";
  account_type: string = "";
  balance: number = 0.0;
  commodity: string = "";
  commodity_guid: string = "";

  children: AccountNode[] = [];
}

export class Book {
  root_account: AccountNode | undefined = undefined;
  price_list: Map<string, Array<prices>> = new Map();

  async init() {
    await this.fetchAccounts();
    await this.fetchPrices();

    if (this.root_account != undefined) {
      this.updateBalance(this.root_account);
      return this.root_account.children;
    }

    return [];
  }

  async fetchAccounts() {
    try {
      // First fetch all accounts
      const accounts = await prisma.$queryRaw<AccountNode[]>`
     SELECT
        accounts.guid,
        accounts.parent_guid,
        accounts.name,
        accounts.account_type,
        commodities.guid as commodity_guid,
        commodities.mnemonic as commodity,
        COALESCE(SUM(CAST(splits.quantity_num AS Float4) / CAST(splits.quantity_denom AS Float4)), 0) as balance
      FROM accounts
      LEFT OUTER JOIN splits ON splits.account_guid = accounts.guid
      LEFT JOIN commodities ON accounts.commodity_guid = commodities.guid
      GROUP BY accounts.guid, commodities.mnemonic, commodities.guid
    `;

      interface IHash {
        [details: string]: AccountNode;
      }
      let accountMap: IHash = {};
      accounts.forEach((account) => {
        accountMap[account.guid] = account;
        account.children = [];
      });

      accounts.forEach((account) => {
        if (account.name == "Root Account") {
          this.root_account = account;
        }
        if (account.parent_guid in accountMap) {
          accountMap[account.parent_guid].children.push(account);
        }
      });

      accounts.forEach((account) => {
        account.children.sort(function (a, b) {
          let x = a.name;
          let y = b.name;
          if (x < y) {
            return -1;
          }
          if (x > y) {
            return 1;
          }
          return 0;
        });
      });
    } catch (error) {
      console.error("Database Error:", error);
      throw new Error("Failed to fetch accounts.");
    }
  }

  async fetchPrices() {
    try {
      const prices = await prisma.prices.findMany({
        orderBy: [
          {
            date: "desc",
          },
        ],
      });

      prices.forEach((price) => {
        if (!this.price_list.has(price.commodity_guid)) {
          this.price_list.set(price.commodity_guid, []);
        }
        this.price_list.get(price.commodity_guid)?.push(price);
      });
      return this.price_list;
    } catch (error) {
      console.error("Database Error:", error);
      throw new Error("Failed to fetch prices.");
    }
  }

  exchangeRate(commodity1_guid: string, commodity2_guid: string) {
    if (commodity1_guid == commodity2_guid) {
      return 1.0;
    } else if (this.price_list.has(commodity1_guid)) {
      for (let price of this.price_list.get(commodity1_guid) ?? []) {
        if (price.currency_guid == commodity2_guid) {
          return (
            Number((price.value_num * BigInt(1000)) / price.value_denom) / 1000
          );
        }
      }
    } else if (this.price_list.has(commodity2_guid)) {
      for (let price of this.price_list.get(commodity1_guid) ?? []) {
        if (price.currency_guid == commodity1_guid) {
          return (
            Number((price.value_denom * BigInt(1000)) / price.value_num) / 1000
          );
        }
      }
    }

    return undefined;
  }

  convertValue(value: number, account1: AccountNode, account2: AccountNode) {
    let rate = this.exchangeRate(
      account1.commodity_guid,
      account2.commodity_guid
    );
    if (rate != undefined) {
      return value * rate;
    }

    return undefined;
  }

  updateBalance(account: AccountNode) {
    account.children.forEach((child) => {
      this.updateBalance(child);

      let child_balance = this.convertValue(child.balance, child, account);
      if (child_balance != undefined) {
        account.balance += child_balance;
      }
    });
  }

  async getAccounts() {
    if (this.root_account == undefined) {
      return await this.init();
    }

    return this.root_account.children;
  }

  async updatePrice(commodity: commodities) {
    console.log(`Fetching latest price for ${commodity.mnemonic}`);

    interface PriceData {
      date: Date;
      price: number;
      currency: string;
    }

    let price_data: PriceData | undefined = undefined;

    if (commodity.quote_flag && commodity.quote_source == "alphavantage") {
      try {
        const api_key = env.ALPHAVANTAGE_API_KEY;
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
        console.log(`Error fetching price data for ${commodity.mnemonic}}`);
      }
      console.log(price_data);
    } else if (
      commodity.quote_flag &&
      commodity.quote_source == "morningstaruk"
    ) {
      try {
        const mstar_search_regex =
          '<td class="msDataText searchLink"><a href="(.*?)">(.*?)</a></td><td class="msDataText searchIsin"><span>(.*)</span></td>';

        const mstar_nav_regex =
          '<td class="line heading">NAV<span class="heading"><br />([0-9]{2}/[0-9]{2}/[0-9]{4})</span>.*([A-Z]{3}).([0-9.]+)';

        const res = await fetch(
          `http://www.morningstar.co.uk/uk/funds/SecuritySearchResults.aspx?search=${commodity.mnemonic}`
        );
        if (res.ok) {
          const matches = (await res.text()).match(mstar_search_regex);
          if (matches) {
            let next_url = matches[1];
            console.log(next_url);

            const res = await fetch(`http://www.morningstar.co.uk${next_url}`);
            if (res.ok) {
              console.log(`Fetched from ${next_url} OK`);
              const matches = (await res.text()).match(mstar_nav_regex);
              if (matches) {
                console.log(`Date: ${matches[1]}`);
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
                console.log(price_data);
              }
            }
          }
        }
      } catch {
        console.log(`Error fetching price data for ${commodity.mnemonic}}`);
      }
    }

    if (price_data != undefined && price_data.currency == "GBX") {
      price_data.price = price_data.price / 100;
      price_data.currency = "GBP";
    }

    return price_data;
  }

  getUUID() {
    let uuid = "";
    for (var i = 0; i < 32; i++) {
      uuid += ((Math.random() * 16) | 0).toString(16);
    }
    return uuid;
  }

  async updatePriceList() {
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
        let price_data = await this.updatePrice(commodity);

        if (price_data != undefined) {
          const price_entry = await prisma.prices.create({
            data: {
              guid: this.getUUID(),
              commodity_guid: commodity.guid,
              currency_guid: commodityMap[price_data["currency"]].guid,
              date: price_data["date"],
              source: "next-cash",
              type: "last",
              value_num: Math.floor(price_data["price"] * 10000),
              value_denom: 10000,
            },
          });
          // console.log(price_entry);
        }
      }
    }
  }
}
