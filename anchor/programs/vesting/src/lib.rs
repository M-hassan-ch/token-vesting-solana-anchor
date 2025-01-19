#![allow(clippy::result_large_err)]

use anchor_lang::prelude::*;
use anchor_spl::token_interface::{Mint, TokenAccount, TokenInterface};

declare_id!("coUnmi3oBUtwtd9fjeAvSsJssXh5A5xyPbhpewyzRVF");

#[program]
pub mod vesting {
    use super::*;

    pub fn create_vesting_account(ctx: Context<CreateVestingAccount>, company_name: String) -> Result<()> {
        let vesting_account = &mut ctx.accounts.vesting_account;
        vesting_account.set_inner(VestingAccount{
            owner: ctx.accounts.signer.key(),
            mint: vesting_account.mint.key(),
            token_treasury: ctx.accounts.token_treasury_account.key(),
            company_name,
            treasury_bump: ctx.bumps.token_treasury_account,
            bump: ctx.bumps.vesting_account
        });
        Ok(())
    }

    pub fn create_employee_account(ctx: Context<CreateEmployeeAccount>, start_date: u64, end_date: u64, cliff_date: u64, total_amount: u64) -> Result<()>{
        let employee_account = &mut ctx.accounts.employee_account;
        employee_account.set_inner(EmployeeAccount{
            beneficiary: ctx.accounts.beneficiary.key(),
            vesting_account: ctx.accounts.vesting_account.key(),
            start_date,
            end_date,
            cliff_date,
            total_amount,
            total_withdrawn: 0,
            bump: ctx.bumps.employee_account
        });
        Ok(())
    }
}

#[derive(Accounts)]
#[instruction(company_name: String)]
pub struct CreateVestingAccount<'info> {
    #[account(mut)]
    pub signer: Signer<'info>,

    pub system_program: Program<'info, System>,
    pub token_program: Interface<'info, TokenInterface>,

    pub mint: InterfaceAccount<'info, Mint>,

    #[account(
        init,
        payer = signer,
        space = 8 + VestingAccount::INIT_SPACE,
        seeds = [b"VESTING_ACCOUNT", company_name.as_bytes()],
        bump
    )]
    pub vesting_account: Account<'info, VestingAccount>,

    #[account(
        init,
        payer = signer,
        token::mint = mint,
        token::authority = token_treasury_account,
        seeds = [company_name.as_bytes()],
        bump
    )]
    pub token_treasury_account: InterfaceAccount<'info, TokenAccount>,
}

#[derive(Accounts)]
pub struct CreateEmployeeAccount<'info>{
    #[account(mut)]
    pub owner: Signer<'info>,
    pub beneficiary: SystemAccount<'info>,

    #[account(
        has_one = owner,
    )]
    pub vesting_account: Account<'info, VestingAccount>,

    #[account(
        init,
        payer= owner,
        space = 8 + EmployeeAccount::INIT_SPACE,
        seeds = [b"employee_vesting", beneficiary.key().as_ref(), vesting_account.key().as_ref()],
        bump
    )]
    pub employee_account: Account<'info, EmployeeAccount>,

    pub system_program: Program<'info, System>,
}

#[account]
#[derive(InitSpace)]
pub struct VestingAccount {
    owner: Pubkey,
    mint: Pubkey,
    token_treasury: Pubkey,
    #[max_len(50)]
    company_name: String,
    treasury_bump: u8,
    bump: u8,
}

#[account]
#[derive(InitSpace)]
pub struct EmployeeAccount{
    beneficiary: Pubkey,
    vesting_account: Pubkey,
    start_date: u64,
    end_date: u64,
    cliff_date: u64,
    total_amount: u64,
    total_withdrawn: u64,
    bump: u8,
}