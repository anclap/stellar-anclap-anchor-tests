export const currencySchema = {
  type: "object",
  properties: {
    code: { type: "string", maxLength: 12 },
    code_template: { type: "string", maxLength: 12 },
    issuer: { type: "string" },
    display_decimals: { type: "range", minimum: 0, maximum: 7 },
    name: { type: "string", maxLength: 20 },
    desc: { type: "string" },
    conditions: { type: "string" },
    image: { type: "string", format: "uri" },
    fixed_number: { type: "integer" },
    max_number: { type: "integer" },
    is_unlimited: { type: "boolean" },
    is_asset_anchored: { type: "boolean" },
    anchor_asset_type: {
      type: "string",
      enum: [
        "fiat",
        "crypto",
        "stock",
        "bond",
        "commodity",
        "realestate",
        "other",
      ],
    },
    anchor_asset: { type: "string" },
    attestation_of_reserve: { type: "string", format: "uri" },
    status: { type: "string" },
    redemption_instructions: { type: "string" },
    collateral_addresses: { type: "array", items: { type: "string" } },
    collateral_address_messages: { type: "array", items: { type: "string" } },
    collateral_address_signatures: { type: "array", items: { type: "string" } },
    regulated: { type: "boolean" },
    approval_server: { type: "string", format: "uri" },
    approval_criteria: { type: "string" },
  },
  required: [
    "is_asset_anchored",
    "anchor_asset_type",
    "code",
    "issuer",
    "desc",
    "status",
  ],
};
