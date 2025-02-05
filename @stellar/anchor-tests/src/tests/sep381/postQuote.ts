import { Request } from "node-fetch";
import { validate } from "jsonschema";

import { Test, Result, Config, NetworkCall } from "../../types";
import { hasQuoteServer } from "./toml";
import { genericFailures, makeFailure } from "../../helpers/failure";
import { makeRequest } from "../../helpers/request";
import { quoteSchema } from "../../schemas/sep381";
import { returnsValidJwt } from "../sep10/tests";

export const requiresJwt: Test = {
  sep: 381,
  assertion: "requires SEP-10 authentication",
  group: "POST /quote",
  dependencies: [returnsValidJwt, hasQuoteServer],
  context: {
    expects: {
      quoteServerUrl: undefined,
      sep38StellarAsset: undefined,
      sep38OffChainAsset: undefined,
      sep38OffChainAssetDecimals: undefined,
      sep38OffChainAssetBuyDeliveryMethod: undefined,
    },
    provides: {},
  },
  failureModes: {
    INVALID_ERROR_SCHEMA: {
      name: "invalid error schema",
      text(_args: any): string {
        return "All error responses should contain a JSON body with an 'error' key-value pair";
      },
      links: {
        "SEP-38 Errors":
          "https://github.com/stellar/stellar-protocol/blob/master/ecosystem/sep-0038.md#errors",
      },
    },
    ...genericFailures,
  },
  async run(config: Config): Promise<Result> {
    const runWithContext = async (sep38Context: string): Promise<Result> => {
      const result: Result = { networkCalls: [] };
      const requestBody: any = {
        sell_asset: this.context.expects.sep38StellarAsset,
        buy_asset: this.context.expects.sep38OffChainAsset,
        sell_amount: "100",
        context: sep38Context,
      };
      if (this.context.expects.sep38BuyDeliveryMethod)
        requestBody.buy_delivery_method =
          this.context.expects.sep38OffChainAssetBuyDeliveryMethod;
      const networkCall: NetworkCall = {
        request: new Request(this.context.expects.quoteServerUrl + "/quote", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(requestBody),
        }),
      };
      result.networkCalls.push(networkCall);
      const quoteResponse = await makeRequest(
        networkCall,
        403,
        result,
        "application/json",
      );
      if (!quoteResponse) return result;
      if (!quoteResponse.error) {
        result.failure = makeFailure(this.failureModes.INVALID_ERROR_SCHEMA);
        return result;
      }
      return result;
    };

    let result: Result = { networkCalls: [] };
    for (const sep38Context of config.sepConfig?.[381]?.contexts ?? []) {
      result = await runWithContext(sep38Context);
      if (!!result.failure) {
        return result;
      }
    }
    return result;
  },
};

export const canCreateQuote: Test = {
  sep: 381,
  assertion: "returns a valid response",
  group: "POST /quote",
  dependencies: [returnsValidJwt, hasQuoteServer],
  context: {
    expects: {
      token: undefined,
      quoteServerUrl: undefined,
      sep38StellarAsset: undefined,
      sep38OffChainAsset: undefined,
      sep38OffChainAssetDecimals: undefined,
      sep38OffChainAssetBuyDeliveryMethod: undefined,
    },
    provides: {
      sep38QuoteResponseObj: undefined,
    },
  },
  failureModes: {
    INVALID_SCHEMA: {
      name: "invalid POST /quote response schema",
      text(args: any): string {
        return (
          "The response body from POST /quote does not match the schema defined by the protocol. " +
          "Errors:\n\n" +
          `${args.errors}`
        );
      },
      links: {
        "POST /quote Response":
          "https://github.com/stellar/stellar-protocol/blob/master/ecosystem/sep-0038.md#response-3",
      },
    },
    INVALID_NUMBER: {
      name: "invalid number",
      text(_args: any): string {
        return "One of the amount values returned in the response cannot be parsed as numbers.";
      },
      links: {
        "POST /quote Response":
          "https://github.com/stellar/stellar-protocol/blob/master/ecosystem/sep-0038.md#response-3",
      },
    },
    ASSETS_DONT_MATCH: {
      name: "assets don't match parameters",
      text(args: any): string {
        return (
          "The assets in the response do not match the parameters sent.\n\n" +
          `Requested sell asset: ${args.expectedSellAsset}\n` +
          `Sell asset from response: ${args.actualSellAsset}\n` +
          `Request buy asset: ${args.expectedBuyAsset}\n` +
          `Buy asset from response: ${args.actualBuyAsset}\n`
        );
      },
      links: {
        "POST /quote Response":
          "https://github.com/stellar/stellar-protocol/blob/master/ecosystem/sep-0038.md#response-3",
      },
    },
    AMOUNT_DOESNT_MATCH: {
      name: "'sell_amount' doesn't match request parameter",
      text(args: any): string {
        return (
          "The sell amount returned in the response doesn't match the amount requested:\n\n" +
          `Requested sell asset amount: ${args.expectedSellAmount}\n` +
          `Sell asset amount from response: ${args.actualSellAmount}`
        );
      },
      links: {
        "POST /quote Response":
          "https://github.com/stellar/stellar-protocol/blob/master/ecosystem/sep-0038.md#response-3",
      },
    },
    INVALID_EXPIRATION: {
      name: "invalid 'expires_at'",
      text(_args: any): string {
        return "The expiration ('expires_at') returned is not in the future.";
      },
      links: {
        "POST /quote Response":
          "https://github.com/stellar/stellar-protocol/blob/master/ecosystem/sep-0038.md#response-3",
      },
    },
    ...genericFailures,
  },
  async run(config: Config): Promise<Result> {
    const runWithContext = async (sep38Context: string): Promise<Result> => {
      const result: Result = { networkCalls: [] };
      const requestBody: any = {
        sell_asset: this.context.expects.sep38StellarAsset,
        buy_asset: this.context.expects.sep38OffChainAsset,
        sell_amount: "100",
        context: sep38Context,
      };
      if (
        this.context.expects.sep38OffChainAssetBuyDeliveryMethod !== undefined
      )
        requestBody.buy_delivery_method =
          this.context.expects.sep38OffChainAssetBuyDeliveryMethod;
      const networkCall: NetworkCall = {
        request: new Request(this.context.expects.quoteServerUrl + "/quote", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${this.context.expects.token}`,
          },
          body: JSON.stringify(requestBody),
        }),
      };
      result.networkCalls.push(networkCall);
      const quoteResponse = await makeRequest(
        networkCall,
        201,
        result,
        "application/json",
      );
      if (!quoteResponse) return result;
      const validationResult = validate(quoteResponse, quoteSchema);
      if (validationResult.errors.length !== 0) {
        result.failure = makeFailure(this.failureModes.INVALID_SCHEMA, {
          errors: validationResult.errors.join("\n"),
        });
        return result;
      }
      if (
        !Number(quoteResponse.buy_amount) ||
        !Number(quoteResponse.sell_amount) ||
        !Number(quoteResponse.price)
      ) {
        result.failure = makeFailure(this.failureModes.INVALID_NUMBER);
        return result;
      }
      if (
        quoteResponse.sell_asset !== this.context.expects.sep38StellarAsset ||
        quoteResponse.buy_asset !== this.context.expects.sep38OffChainAsset
      ) {
        result.failure = makeFailure(this.failureModes.ASSETS_DONT_MATCH, {
          expectedSellAsset: this.context.expects.sep38StellarAsset,
          actualSellAsset: quoteResponse.sell_asset,
          expectedBuyAsset: this.context.expects.sep38OffChainAsset,
          actualBuyAsset: quoteResponse.buy_asset,
        });
        return result;
      }
      if (Number(quoteResponse.sell_amount) !== 100) {
        result.failure = makeFailure(this.failureModes.AMOUNT_DOESNT_MATCH, {
          expectedSellAmount: "100",
          actualSellAmount: quoteResponse.sell_amount,
        });
        return result;
      }
      if (Date.now() >= Date.parse(quoteResponse.expires_at)) {
        result.failure = makeFailure(this.failureModes.INVALID_EXPIRATION);
        return result;
      }
      this.context.provides.sep38QuoteResponseObj = quoteResponse;
      return result;
    };

    let result: Result = { networkCalls: [] };
    for (const sep38Context of config.sepConfig?.[381]?.contexts ?? []) {
      result = await runWithContext(sep38Context);
      if (!!result.failure) {
        return result;
      }
    }
    return result;
  },
};

export const amountsAreValid: Test = {
  sep: 381,
  assertion: "quote amounts are correctly calculated",
  group: "POST /quote",
  dependencies: [canCreateQuote],
  context: {
    expects: {
      sep38OffChainAssetDecimals: undefined,
      sep38QuoteResponseObj: undefined,
    },
    provides: {},
  },
  failureModes: {
    INVALID_AMOUNTS: {
      name: "amounts and price don't match",
      text(args: any): string {
        return `The amounts returned in the response do not add up. ${args.message}`;
      },
      links: {
        "Price formulas":
          "https://github.com/stellar/stellar-protocol/blob/master/ecosystem/sep-0038.md#price-formulas",
      },
    },
    ...genericFailures,
  },
  async run(_config: Config): Promise<Result> {
    const result: Result = { networkCalls: [] };
    // TODO: line 102 prices.py of polaris always returns decimals for sell asset
    // TODO: so for now hardcode this test to use 2 decimals for fiat
    // const decimals = Number(this.context.expects.sep38OffChainAssetDecimals); 
    const decimals = Number(2); 
    const roundingMultiplier = Math.pow(10, decimals);

    // validate total_price
    // sell_amount / total_price = buy_amount
    const sellAmount = Number(
      this.context.expects.sep38QuoteResponseObj.sell_amount,
    );
    const buyAmount = Number(
      this.context.expects.sep38QuoteResponseObj.buy_amount,
    );
    const Price = Number(
      this.context.expects.sep38QuoteResponseObj.price,
    ) 
    
    const totalPriceMatchesAmounts =
      Math.round((Price * buyAmount) * roundingMultiplier) /
        roundingMultiplier ===
      Math.round(sellAmount * roundingMultiplier) / roundingMultiplier;
    
      if (!totalPriceMatchesAmounts) {
      var message = `\nFormula "sell_amount or buy_amount calculations with price is not true for the number of decimals (${decimals}) required:`;
      message += `\n\t${sellAmount} != ${buyAmount} * ${Price}`;
      result.failure = makeFailure(this.failureModes.INVALID_AMOUNTS, {
        message,
      });
      return result;
    }

    return result;
  },
};

export default [requiresJwt, canCreateQuote, amountsAreValid];
