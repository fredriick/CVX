use anchor_lang::prelude::*;


declare_id!("3VVsXSvtFXnZN9ovdKiPnzxvKpdd7AepCm11aheGmmLd");

#[program]
pub mod cvx {
    use super::*;

    pub fn initialize_config(ctx: Context<InitializeConfig>) -> Result<()> {
        let global_config = &mut ctx.accounts.global_config;
        global_config.admin = ctx.accounts.admin.key();
        global_config.latest_root = [0; 32];
        Ok(())
    }

    pub fn update_root(ctx: Context<UpdateRoot>, new_root: [u8; 32]) -> Result<()> {
        let global_config = &mut ctx.accounts.global_config;
        require!(ctx.accounts.admin.key() == global_config.admin, ErrorCode::Unauthorized);
        global_config.latest_root = new_root;
        Ok(())
    }

    pub fn initialize(ctx: Context<Initialize>) -> Result<()> {
        let vault_account = &mut ctx.accounts.vault_account;
        vault_account.owner = ctx.accounts.signer.key();
        vault_account.last_used = Clock::get()?.unix_timestamp;
        vault_account.balance = 0;
        // Mocking an empty hash for initialization
        vault_account.mock_zk_state_hash = [0; 32];
        Ok(())
    }

    pub fn deposit(ctx: Context<Deposit>, amount: u64) -> Result<()> {
        let vault_account = &mut ctx.accounts.vault_account;
        
        // Transfer actual SOL from signer to vault
        let cpi_context = CpiContext::new(
            ctx.accounts.system_program.to_account_info(),
            anchor_lang::system_program::Transfer {
                from: ctx.accounts.signer.to_account_info(),
                to: vault_account.to_account_info(),
            },
        );
        anchor_lang::system_program::transfer(cpi_context, amount)?;

        vault_account.balance += amount;
        vault_account.last_used = Clock::get()?.unix_timestamp;
        Ok(())
    }

    pub fn withdraw(ctx: Context<Withdraw>, amount: u64) -> Result<()> {
        let vault_account = &mut ctx.accounts.vault_account;
        let signer = &mut ctx.accounts.signer;
        
        if vault_account.balance < amount {
            return Err(ErrorCode::InsufficientFunds.into());
        }

        // Logic Transfer funds from vault (PDA?) or just decrement tracked balance
        // In this simple model, the Lamports are held in the 'vault_account' PDA.
        // We need to transfer from PDA to user.
        **vault_account.to_account_info().try_borrow_mut_lamports()? -= amount;
        **signer.to_account_info().try_borrow_mut_lamports()? += amount;

        vault_account.balance -= amount;
        vault_account.last_used = Clock::get()?.unix_timestamp;
        Ok(())
    }

    pub fn hibernate_account(ctx: Context<HibernateAccount>) -> Result<()> {
        let vault_account = &ctx.accounts.vault_account;
        let current_time = Clock::get()?.unix_timestamp;
        let time_since_last_usage = current_time - vault_account.last_used;

        // Check if the elapsed time exceeds the threshold
        // We use a constant here representing sixty seconds for demonstration
        let minimum_hibernation_period: i64 = 60;

        if time_since_last_usage < minimum_hibernation_period {
            return Err(ErrorCode::AccountNotInactiveEnough.into());
        }

        // Emit the compression event with the user state
        emit!(CompressionEvent {
            owner: vault_account.owner,
            balance: vault_account.balance,
            state_hash: vault_account.mock_zk_state_hash,
        });

        // Close the account logic is handled by the close constraint in the context
        Ok(())
    }

    pub fn wake_up_account(ctx: Context<WakeUpAccount>, proof: [u8; 32], balance: u64) -> Result<()> {
        let vault_account = &mut ctx.accounts.vault_account;
        let global_config = &ctx.accounts.global_config;

        // Verify that the provided proof matches the latest root (Mock verification)
        // In a real scenario, this would be a Merkle proof verification.
        // Even simpler mock: we assume the 'proof' IS the compressed State Hash, 
        // and we check if the Root indicates this state is valid.
        // Let's pretend `root` is a hash of all valid states. 
        // For this MOCK, we just require proof == global_config.latest_root to simulate "checking against root".
        
        if proof != global_config.latest_root {
            return Err(ErrorCode::InvalidProof.into());
        }

        vault_account.owner = ctx.accounts.signer.key();
        vault_account.balance = balance;
        vault_account.last_used = Clock::get()?.unix_timestamp;
        vault_account.mock_zk_state_hash = proof;

        Ok(())
    }
}


#[derive(Accounts)]
pub struct InitializeConfig<'info> {
    #[account(
        init, 
        payer = admin, 
        space = 8 + 32 + 32,
        seeds = [b"config"],
        bump
    )]
    pub global_config: Account<'info, GlobalConfig>,
    #[account(mut)]
    pub admin: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct UpdateRoot<'info> {
    #[account(
        mut,
        seeds = [b"config"],
        bump
    )]
    pub global_config: Account<'info, GlobalConfig>,
    pub admin: Signer<'info>,
}

#[derive(Accounts)]
pub struct Initialize<'info> {
    #[account(
        init, 
        payer = signer, 
        space = 8 + 32 + 8 + 8 + 32,
        seeds = [b"vault", signer.key().as_ref()], 
        bump
    )]
    pub vault_account: Account<'info, VaultAccount>,
    #[account(mut)]
    pub signer: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct Deposit<'info> {
    #[account(
        mut,
        seeds = [b"vault", signer.key().as_ref()], 
        bump
    )]
    pub vault_account: Account<'info, VaultAccount>,
    #[account(mut)]
    pub signer: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct Withdraw<'info> {
    #[account(
        mut,
        seeds = [b"vault", signer.key().as_ref()], 
        bump
    )]
    pub vault_account: Account<'info, VaultAccount>,
    #[account(mut)]
    pub signer: Signer<'info>,
}

#[derive(Accounts)]
pub struct HibernateAccount<'info> {
    #[account(
        mut, 
        close = destination_wallet,
        seeds = [b"vault", signer.key().as_ref()], 
        bump
    )]
    pub vault_account: Account<'info, VaultAccount>,
    #[account(mut)]
    pub destination_wallet: SystemAccount<'info>,
    pub signer: Signer<'info>,
}

#[derive(Accounts)]
pub struct WakeUpAccount<'info> {
    #[account(
        init, 
        payer = signer, 
        space = 8 + 32 + 8 + 8 + 32,
        seeds = [b"vault", signer.key().as_ref()], 
        bump
    )]
    pub vault_account: Account<'info, VaultAccount>,
    #[account(
        mut,
        seeds = [b"config"],
        bump
    )]
    pub global_config: Account<'info, GlobalConfig>,
    #[account(mut)]
    pub signer: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[account]
pub struct GlobalConfig {
    pub admin: Pubkey,
    pub latest_root: [u8; 32],
}

#[account]
pub struct VaultAccount {
    pub owner: Pubkey,
    pub balance: u64,
    pub last_used: i64,
    pub mock_zk_state_hash: [u8; 32],
}

#[event]
pub struct CompressionEvent {
    pub owner: Pubkey,
    pub balance: u64,
    pub state_hash: [u8; 32],
}

#[error_code]
pub enum ErrorCode {
    #[msg("The account has not been inactive for long enough.")]
    AccountNotInactiveEnough,
    #[msg("Unauthorized access.")]
    Unauthorized,
    #[msg("Insufficient funds for withdrawal.")]
    InsufficientFunds,
    #[msg("Invalid ZK Proof or State Root mismatch.")]
    InvalidProof,
}
