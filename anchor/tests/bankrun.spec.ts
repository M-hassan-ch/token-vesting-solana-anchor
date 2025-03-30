import { Keypair, PublicKey } from "@solana/web3.js";
import * as anchor from "@coral-xyz/anchor";
import { Vesting } from "anchor/target/types/vesting";
import { Program } from "@coral-xyz/anchor";
import { ProgramTestContext, start } from "solana-bankrun";
import idl from "../target/idl/vesting.json";
import { SYSTEM_PROGRAM_ID } from "@coral-xyz/anchor/dist/cjs/native/system";
import { BankrunProvider } from "anchor-bankrun";
import { BanksClient } from "solana-bankrun";
import { createMint } from "spl-token-bankrun";
import NodeWallet from "@coral-xyz/anchor/dist/cjs/nodewallet";
import { TOKEN_PROGRAM_ID } from "@solana/spl-token";

describe("Vesting Program", () => {
    const COMPANY_NAME = "Test Company";
    let context: ProgramTestContext;
    let bankrunClient: BanksClient;

    let provider: BankrunProvider;
    let benificiaryProvider: BankrunProvider;

    let vestingProgram: Program<Vesting>;
    let program2: Program<Vesting>;
    
    let benificiary: Keypair;
    let employer: Keypair;
    
    let mint: PublicKey;
    let vestingAccount: PublicKey;
    let employeeAccount: PublicKey;
    let tokenTreasuryAccount: PublicKey;

    function setupPDAs(vestingProgram: Program<Vesting>){
        [vestingAccount] = PublicKey.findProgramAddressSync(
            [Buffer.from("vesting_account"), Buffer.from(COMPANY_NAME)],
            vestingProgram.programId
        );

        [employeeAccount] = PublicKey.findProgramAddressSync(
            [Buffer.from("employee_vesting"), benificiary.publicKey.toBuffer(), vestingAccount.toBuffer()],
            vestingProgram.programId
        );

        [tokenTreasuryAccount] = PublicKey.findProgramAddressSync(
            [Buffer.from("vesting_treasury"), Buffer.from(COMPANY_NAME)],
            vestingProgram.programId
        );
    }

    beforeAll(async () => {
        benificiary = new anchor.web3.Keypair();
        context = await start(
            [
                {
                    name: "vesting",
                    programId: new PublicKey(idl.address),
                }
            ],
            [
                {
                    address: benificiary.publicKey,
                    info: {
                        data: Buffer.alloc(0),
                        executable: false,
                        lamports: 1_000_000_000,
                        owner: SYSTEM_PROGRAM_ID,
                    },
                }
            ]
        )
        provider = new BankrunProvider(context);
        anchor.setProvider(provider);
        bankrunClient = context.banksClient;
        vestingProgram = new Program<Vesting>(idl as Vesting, provider);
        employer = provider.wallet.payer;

        mint = await createMint(
            bankrunClient,
            employer,
            employer.publicKey,
            null,
            2
        )

        benificiaryProvider = new BankrunProvider(context);
        benificiaryProvider.wallet = new NodeWallet(benificiary);
        program2 = new Program<Vesting>(idl as Vesting, benificiaryProvider);

        setupPDAs(vestingProgram);
    });

    it("should create vesting account", async () => {
        const tx = await vestingProgram.methods.createVestingAccount(COMPANY_NAME).accounts({
            signer: employer.publicKey,
            mint,
            tokenProgram: TOKEN_PROGRAM_ID,
        }).rpc({ commitment: "confirmed" });

        const vestingAccountInfo = await vestingProgram.account.vestingAccount.fetch(vestingAccount, 'confirmed');
        console.log(vestingAccountInfo);
        console.log(tx);
        
    });
});
