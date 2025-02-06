/**
 * Program IDL in camelCase format in order to be used in JS/TS.
 *
 * Note that this is only a type helper and is not the actual IDL. The original
 * IDL can be found at `target/idl/vesting.json`.
 */
export type Vesting = {
  "address": "coUnmi3oBUtwtd9fjeAvSsJssXh5A5xyPbhpewyzRVF",
  "metadata": {
    "name": "vesting",
    "version": "0.1.0",
    "spec": "0.1.0",
    "description": "Created with Anchor"
  },
  "instructions": [
    {
      "name": "createEmployeeAccount",
      "discriminator": [
        94,
        118,
        255,
        19,
        171,
        159,
        58,
        107
      ],
      "accounts": [
        {
          "name": "owner",
          "writable": true,
          "signer": true,
          "relations": [
            "vestingAccount"
          ]
        },
        {
          "name": "beneficiary"
        },
        {
          "name": "vestingAccount"
        },
        {
          "name": "employeeAccount",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  101,
                  109,
                  112,
                  108,
                  111,
                  121,
                  101,
                  101,
                  95,
                  118,
                  101,
                  115,
                  116,
                  105,
                  110,
                  103
                ]
              },
              {
                "kind": "account",
                "path": "beneficiary"
              },
              {
                "kind": "account",
                "path": "vestingAccount"
              }
            ]
          }
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": [
        {
          "name": "startDate",
          "type": "u64"
        },
        {
          "name": "endDate",
          "type": "u64"
        },
        {
          "name": "cliffDate",
          "type": "u64"
        },
        {
          "name": "totalAmount",
          "type": "u64"
        }
      ]
    },
    {
      "name": "createVestingAccount",
      "discriminator": [
        129,
        178,
        2,
        13,
        217,
        172,
        230,
        218
      ],
      "accounts": [
        {
          "name": "signer",
          "writable": true,
          "signer": true
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        },
        {
          "name": "tokenProgram"
        },
        {
          "name": "mint"
        },
        {
          "name": "vestingAccount",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  86,
                  69,
                  83,
                  84,
                  73,
                  78,
                  71,
                  95,
                  65,
                  67,
                  67,
                  79,
                  85,
                  78,
                  84
                ]
              },
              {
                "kind": "arg",
                "path": "companyName"
              }
            ]
          }
        },
        {
          "name": "tokenTreasuryAccount",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "arg",
                "path": "companyName"
              }
            ]
          }
        }
      ],
      "args": [
        {
          "name": "companyName",
          "type": "string"
        }
      ]
    }
  ],
  "accounts": [
    {
      "name": "employeeAccount",
      "discriminator": [
        65,
        245,
        87,
        188,
        58,
        86,
        209,
        151
      ]
    },
    {
      "name": "vestingAccount",
      "discriminator": [
        102,
        73,
        10,
        233,
        200,
        188,
        228,
        216
      ]
    }
  ],
  "types": [
    {
      "name": "employeeAccount",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "beneficiary",
            "type": "pubkey"
          },
          {
            "name": "vestingAccount",
            "type": "pubkey"
          },
          {
            "name": "startDate",
            "type": "u64"
          },
          {
            "name": "endDate",
            "type": "u64"
          },
          {
            "name": "cliffDate",
            "type": "u64"
          },
          {
            "name": "totalAmount",
            "type": "u64"
          },
          {
            "name": "totalWithdrawn",
            "type": "u64"
          },
          {
            "name": "bump",
            "type": "u8"
          }
        ]
      }
    },
    {
      "name": "vestingAccount",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "owner",
            "type": "pubkey"
          },
          {
            "name": "mint",
            "type": "pubkey"
          },
          {
            "name": "tokenTreasury",
            "type": "pubkey"
          },
          {
            "name": "companyName",
            "type": "string"
          },
          {
            "name": "treasuryBump",
            "type": "u8"
          },
          {
            "name": "bump",
            "type": "u8"
          }
        ]
      }
    }
  ]
};
