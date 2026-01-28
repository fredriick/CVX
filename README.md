# CVX: Compressed Vaults 🗜️

CVX is a Solana program built with Anchor that demonstrates **State Hibernation** using ZK-Compression concepts. It allows users to "compress" their on-chain state (closing the account and reclaiming rent) and "decompress" it later (waking up the account) using a validity proof.

## 🚀 Key Features

*   **Vault Account**: A standard PDA holding user funds.
*   **Hibernate (`hibernate_account`)**:
    *   Checks if the account has been inactive for a set duration (mocked as 60s).
    *   Emits a `CompressionEvent` containing the user's balance and state hash.
    *   **Closes the account**, returning 100% of the rent rent to the user.
*   **Wake Up (`wake_up_account`)**:
    *   Accepts a `proof` (mocked) and the original balance.
    *   Verifies the proof against the global "State Root".
    *   **Re-initializes** the Vault Account with the correct balance.

## 🛠️ Installation

### Prerequisites
*   [Rust](https://www.rust-lang.org/tools/install)
*   [Solana CLI](https://docs.solana.com/cli/install-solana-cli-tools)
*   [Anchor](https://www.anchor-lang.com/docs/installation)
*   Node.js & Yarn

### Setup
1.  Clone the repository:
    ```bash
    git clone <repo-url>
    cd Arbor
    ```
2.  Install dependencies:
    ```bash
    yarn install
    ```
3.  Build the program:
    ```bash
    anchor build
    ```

## 🧪 Testing

We use `mocha` and `chai` for integration testing.

```bash
anchor test
```

### Test Scenarios
*   **Initialization**: Creates the Global Config and User Vault.
*   **Deposit/Withdraw**: Standard SOL transfers.
*   **Hibernation**: Waits for the inactivity period, calls hibernate, and verifies the account is closed.
*   **Wake Up**: helping verification of valid proofs and rejection of invalid ones.

## 📜 Program Architecture

### Data Structures
*   `VaultAccount`: Stores `owner`, `balance`, `last_used`, and `mock_zk_state_hash`.
*   `GlobalConfig`: Stores the `admin` and `latest_root` for proof verification.

### Events
*   `CompressionEvent`: Emitted during hibernation. This serves as the "Call Data" for off-chain indexers to reconstruct the state tree.

## 🌐 Frontend

A Next.js web interface is available in the `web/` directory. See [web/README.md](./web/README.md) for setup instructions.

**Features:**
- Wallet connection (Phantom, Solflare)
- Vault initialization, deposit, withdraw
- Hibernate & Wake Up with LocalStorage state persistence

## 🔮 Future Roadmap
- [ ] **Merkle Tree Integration**: Replace mock hash checks with real Concurrent Merkle Tree verification.
- [x] **Frontend Interface**: Web UI to visually manage vaults and trigger hibernation.
- [ ] **SPL Token Support**: Compress token accounts (ATAs) alongside SOL balances.

## 📝 License
MIT
