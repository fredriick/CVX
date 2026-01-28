# CVX Frontend

A Next.js web interface for the CVX (Compressed Vaults) Solana program.

## Features
- **Wallet Connection**: Supports Phantom, Solflare, etc.
- **Vault Management**: View Balance, Deposit, Withdraw.
- **Hibernation**: Compresses Vault state to "Off-Chain" LocalStorage.
- **Wake Up**: Restores Vault state from LocalStorage using a mock ZK Proof.

## Setup

1.  **Install Dependencies**
    ```bash
    yarn install
    ```
    *Note: If you encounter Node version errors, use `yarn install --ignore-engines`.*

2.  **Run Development Server**
    ```bash
    yarn dev
    ```
    Open [http://localhost:3000](http://localhost:3000).

3.  **Localnet Connection**
    Ensure your local Solana validator is running and the program is deployed:
    ```bash
    solana-test-validator
    anchor deploy
    ```
    Switch your wallet to **Localnet** (127.0.0.1:8899).

## Architecture
- `utils/store.ts`: Simulates the "Off-Chain Indexer" using Browser LocalStorage.
- `app/components/vault-dashboard.tsx`: Main logic hub.
- `app/idl/cvx.json`: Copy of the Anchor IDL.
