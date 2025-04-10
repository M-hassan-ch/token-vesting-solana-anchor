import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { Vesting } from "../target/types/vesting";
import {
    TOKEN_PROGRAM_ID,
    createMint,
    createAssociatedTokenAccount,
    mintTo,
} from "@solana/spl-token";
import { PublicKey, LAMPORTS_PER_SOL, SystemProgram, SYSVAR_RENT_PUBKEY } from "@solana/web3.js";
import { assert } from "chai";
import NodeWallet from "@coral-xyz/anchor/dist/cjs/nodewallet";

describe("vesting", () => {
    // Configure the client to use the local 

    const owner = anchor.web3.Keypair.generate();
    const beneficiary = anchor.web3.Keypair.generate();

    const _provider = anchor.AnchorProvider.env();
    const provider = new anchor.AnchorProvider(
        _provider.connection,
        new anchor.Wallet(owner),
        {}
    );
    anchor.setProvider(provider);
    // anchor.setProvider(provider);

    const program = anchor.workspace.Vesting as Program<Vesting>;

    // Test constants
    const COMPANY_NAME = "TestCompany";
    const TOTAL_AMOUNT = 1000000000; // 1000 tokens with 6 decimals
    const NOW = Math.floor(Date.now() / 1000);
    const ONE_MONTH = 30 * 24 * 60 * 60; // 30 days in seconds

    // Test accounts
    let mint: PublicKey;
    let beneficiaryAta: PublicKey;

    // Derive PDAs
    const [vestingAccountPda] = PublicKey.findProgramAddressSync(
        [Buffer.from("vesting_account"), Buffer.from(COMPANY_NAME)],
        program.programId
    );

    const [treasuryAccountPda] = PublicKey.findProgramAddressSync(
        [Buffer.from("vesting_treasury"), Buffer.from(COMPANY_NAME)],
        program.programId
    );

    const [employeeAccountPda] = PublicKey.findProgramAddressSync(
        [
            Buffer.from("employee_vesting"),
            beneficiary.publicKey.toBuffer(),
            vestingAccountPda.toBuffer(),
        ],
        program.programId
    );

    async function airdrop(connection: anchor.web3.Connection, payer: anchor.web3.Keypair, amount: number) {
        const signature = await connection.requestAirdrop(
            payer.publicKey,
            amount * LAMPORTS_PER_SOL
        );
        let latestBlockhash = await connection.getLatestBlockhash();
        return await connection.confirmTransaction({
            signature: signature,
            ...latestBlockhash
        });
    }


    // function programPaidBy(payer: anchor.web3.Keypair): anchor.Program {
    //     const newProvider = new anchor.AnchorProvider(provider.connection, new anchor.Wallet(payer), {});
    //     return new anchor.Program(program.idl as anchor.Idl);
    // }

    function getProgramWithProvider(provider: anchor.AnchorProvider): anchor.Program {
        return new anchor.Program(program.idl as anchor.Idl, provider);
    }

    beforeAll(async () => {
        // Airdrop SOL to owner and beneficiary
        await airdrop(provider.connection, owner, 2);
        await airdrop(provider.connection, beneficiary, 2);

        // Create mint
        mint = await createMint(
            provider.connection,
            owner,
            owner.publicKey,
            null,
            6 // decimals
        );


        console.log('Before All Got: ', {
            employeeAccountPda: employeeAccountPda.toString(),
            vestingAccountPda: vestingAccountPda.toString(),
            treasuryAccountPda: treasuryAccountPda.toString(),
            beneficiary: beneficiary.publicKey.toString(),
            owner: owner.publicKey.toString(),
            program: program.programId.toString(),
            providerSigner: provider.wallet.publicKey.toString()
        });
    });

    it("Creates a vesting account", async () => {
        try {

            await program.methods
                .createVestingAccount(COMPANY_NAME)
                .accounts({
                    signer: owner.publicKey,
                    tokenProgram: TOKEN_PROGRAM_ID,
                    mint: mint,
                })
                .rpc();

            // Verify the vesting account was created
            const vestingAccount = await program.account.vestingAccount.fetch(vestingAccountPda);
            assert.equal(vestingAccount.owner.toString(), owner.publicKey.toString());
            assert.equal(vestingAccount.mint.toString(), mint.toString());
            assert.equal(vestingAccount.companyName, COMPANY_NAME);

            console.log({
                vestingAccountOwner: vestingAccount.owner.toString(),
                vestingAccountMint: vestingAccount.mint.toString(),
                vestingAccountCompanyName: vestingAccount.companyName,
            });

        } catch (error) {
            console.error("Error:", error);
            throw error;
        }
    });

    it("Creates an employee account", async () => {
        try {
            const startDate = NOW;
            const endDate = NOW + (12 * ONE_MONTH); // 12 months from now
            const cliffDate = 0; 

            const transaction = await program.methods
                .createEmployeeAccount(
                    COMPANY_NAME,
                    new anchor.BN(startDate),
                    new anchor.BN(endDate),
                    new anchor.BN(cliffDate),
                    new anchor.BN(TOTAL_AMOUNT),
                )
                .accounts({
                    beneficiary: beneficiary.publicKey
                })
                .rpc({ commitment: "confirmed" });

            // Verify the employee account was created
            const employeeAccount = await program.account.employeeAccount.fetch(employeeAccountPda);
            assert.equal(employeeAccount.beneficiary.toString(), beneficiary.publicKey.toString());
            assert.equal(employeeAccount.vestingAccount.toString(), vestingAccountPda.toString());
            assert.equal(employeeAccount.totalAmount.toString(), TOTAL_AMOUNT.toString());
        } catch (error) {
            console.error("Error:", error);
            throw error;
        }
    });

    it("Claims tokens", async () => {
        try {
            // Create beneficiary's associated token account if it doesn't exist
            beneficiaryAta = await createAssociatedTokenAccount(
                provider.connection,
                beneficiary,
                mint,
                beneficiary.publicKey
            );

            // Mint some tokens to treasury for testing
            await mintTo(
                provider.connection,
                owner,
                mint,
                treasuryAccountPda,
                owner,
                TOTAL_AMOUNT
            );

            const _provider = new anchor.AnchorProvider(
                provider.connection,
                new anchor.Wallet(beneficiary),
                {}
            );

            const _program = getProgramWithProvider(_provider);

            // Attempt to claim tokens
            await _program.methods
                .claimTokens(COMPANY_NAME)
                .accounts({
                    tokenProgram: TOKEN_PROGRAM_ID,
                })
                .signers([beneficiary])
                .rpc();

            // Verify the claim (you might want to add more specific checks here)
            const employeeAccountInfo = await program.account.employeeAccount.fetch(employeeAccountPda);
            assert(employeeAccountInfo.totalWithdrawn.gt(new anchor.BN(0)), "No tokens were claimed");
        } catch (error) {
            console.error("Error:", error);
            throw error;
        }
    });
});