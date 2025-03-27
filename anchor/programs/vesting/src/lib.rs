#![allow(clippy::result_large_err)]

use anchor_lang::prelude::*;
use anchor_spl::{
    associated_token::AssociatedToken,
    token_interface::{Mint, TokenAccount, TokenInterface, TransferChecked},
};

declare_id!("coUnmi3oBUtwtd9fjeAvSsJssXh5A5xyPbhpewyzRVF");

#[program]
pub mod vesting {
    use anchor_spl::token_interface;

    use super::*;

    pub fn create_vesting_account(
        ctx: Context<CreateVestingAccount>,
        company_name: String,
    ) -> Result<()> {
        let vesting_account = &mut ctx.accounts.vesting_account;
        vesting_account.set_inner(VestingAccount {
            owner: ctx.accounts.signer.key(),
            mint: vesting_account.mint.key(),
            token_treasury: ctx.accounts.token_treasury_account.key(),
            company_name,
            treasury_bump: ctx.bumps.token_treasury_account,
            bump: ctx.bumps.vesting_account,
        });
        Ok(())
    }

    pub fn create_employee_account(
        ctx: Context<CreateEmployeeAccount>,
        start_date: u64,
        end_date: u64,
        cliff_date: u64,
        total_amount: u64,
    ) -> Result<()> {
        let employee_account = &mut ctx.accounts.employee_account;
        employee_account.set_inner(EmployeeAccount {
            beneficiary: ctx.accounts.beneficiary.key(),
            vesting_account: ctx.accounts.vesting_account.key(),
            start_date,
            end_date,
            cliff_date,
            total_amount,
            total_withdrawn: 0,
            bump: ctx.bumps.employee_account,
        });
        Ok(())
    }

    pub fn claim_tokens(ctx: Context<ClaimTokens>, company_name: String) -> Result<()> {
        let vesting_account = &mut ctx.accounts.vesting_account;
        let employee_account = &mut ctx.accounts.employee_account;

        let now = Clock::get()?.unix_timestamp;

        if now < employee_account.cliff_date as i64 {
            return Err(ErrorCode::ClaimNotAvailableYet.into());
        }

        let time_since_start = now.saturating_sub(employee_account.start_date as i64);
        let total_vesting_time = employee_account
            .start_date
            .saturating_sub(employee_account.end_date);

        if total_vesting_time == 0 {
            return Err(ErrorCode::InvalidVestingPeriod.into());
        }

        let vested_amount = if now >= employee_account.end_date as i64 {
            employee_account.total_amount
        } else {
            match employee_account
                .total_amount
                .checked_mul(time_since_start as u64)
            {
                Some(product) => product / total_vesting_time as u64,
                None => return Err(ErrorCode::CalculationOverflow.into()),
            }
        };

        let claimable_amount = vested_amount.saturating_sub(employee_account.total_withdrawn);

        if claimable_amount == 0 {
            return Err(ErrorCode::NothingToClaim.into());
        }

        let cpi_accounts = TransferChecked {
            from: ctx.accounts.token_treasury.to_account_info(),
            to: ctx.accounts.employee_token_account.to_account_info(),
            mint: ctx.accounts.mint.to_account_info(),
            authority: ctx.accounts.token_treasury.to_account_info(),
        };

        let cpi_program = ctx.accounts.token_program.to_account_info();
        // seeds = [b"vesting_treasury", company_name.as_bytes()],
        let signer_seeds: &[&[&[u8]]] = &[&[
            b"vesting_treasury",
            company_name.as_bytes(),
            &[vesting_account.treasury_bump],
        ]];

        let cpi_ctx = CpiContext::new(cpi_program, cpi_accounts).with_signer(signer_seeds);

        let decimals = ctx.accounts.mint.decimals;

        token_interface::transfer_checked(cpi_ctx, claimable_amount, decimals)?;

        employee_account.total_withdrawn += claimable_amount;

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
        seeds = [b"vesting_account", company_name.as_bytes()],
        bump
    )]
    pub vesting_account: Account<'info, VestingAccount>,

    #[account(
        init,
        payer = signer,
        token::mint = mint,
        token::authority = token_treasury_account,
        seeds = [b"vesting_treasury", company_name.as_bytes()],
        bump
    )]
    pub token_treasury_account: InterfaceAccount<'info, TokenAccount>,
}

#[derive(Accounts)]
pub struct CreateEmployeeAccount<'info> {
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

#[derive(Accounts)]
#[instruction(company_name: String)]
pub struct ClaimTokens<'info> {
    #[account(mut)]
    pub beneficiary: Signer<'info>,
    pub mint: InterfaceAccount<'info, Mint>,

    #[account(mut)]
    pub token_treasury: InterfaceAccount<'info, TokenAccount>,

    #[account(
        seeds = [b"vesting_account", company_name.as_bytes()],
        bump = vesting_account.treasury_bump,
        has_one = token_treasury,
        has_one = mint,
    )]
    pub vesting_account: Account<'info, VestingAccount>,

    #[account(
        mut,
        seeds = [b"employee_vesting", beneficiary.key().as_ref(), vesting_account.key().as_ref()],
        bump = employee_account.bump,
        has_one = vesting_account,
        has_one = beneficiary,
    )]
    pub employee_account: Account<'info, EmployeeAccount>,

    #[account(
        init_if_needed,
        payer = beneficiary,
        associated_token::mint = mint,
        associated_token::authority = beneficiary,
        associated_token::token_program = token_program
    )]
    pub employee_token_account: InterfaceAccount<'info, TokenAccount>,

    pub system_program: Program<'info, System>,
    pub token_program: Interface<'info, TokenInterface>,
    pub associated_token_program: Program<'info, AssociatedToken>,
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
pub struct EmployeeAccount {
    beneficiary: Pubkey,
    vesting_account: Pubkey,
    start_date: u64,
    end_date: u64,
    cliff_date: u64,
    total_amount: u64,
    total_withdrawn: u64,
    bump: u8,
}

#[error_code]
pub enum ErrorCode {
    #[msg("Claim not available yet")]
    ClaimNotAvailableYet,
    #[msg("Invalid vesting period")]
    InvalidVestingPeriod,
    #[msg("Calculation overflow")]
    CalculationOverflow,
    #[msg("Nothing to claim")]
    NothingToClaim,
}
