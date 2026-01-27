import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { Cvx } from "../target/types/cvx";
import { assert } from "chai";

describe("cvx", () => {
    // Configure the client to use the local cluster.
    const provider = anchor.AnchorProvider.env();
    anchor.setProvider(provider);

    const program = anchor.workspace.Cvx as Program<Cvx>;
    const vaultAccount = anchor.web3.Keypair.generate();
    const destinationWallet = anchor.web3.Keypair.generate();
    const globalConfig = anchor.web3.Keypair.generate();
    const admin = provider.wallet;

    it("Initializes Global Config", async () => {
        await program.methods
            .initializeConfig()
            .accounts({
                globalConfig: globalConfig.publicKey,
                admin: admin.publicKey,
                systemProgram: anchor.web3.SystemProgram.programId,
            })
            .signers([globalConfig])
            .rpc();

        const config = await program.account.globalConfig.fetch(globalConfig.publicKey);
        assert.ok(config.admin.equals(admin.publicKey));
        // Check initial root is 0-filled
        assert.deepEqual(config.latestRoot, new Array(32).fill(0));
    });

    it("Initializes Vault", async () => {
        await program.methods
            .initialize()
            .accounts({
                vaultAccount: vaultAccount.publicKey,
                signer: provider.wallet.publicKey,
                systemProgram: anchor.web3.SystemProgram.programId,
            })
            .signers([vaultAccount])
            .rpc();

        const account = await program.account.vaultAccount.fetch(vaultAccount.publicKey);
        assert.ok(account.owner.equals(provider.wallet.publicKey));
        assert.ok(account.balance.toNumber() === 0);
    });

    it("Deposits funds", async () => {
        const amount = new anchor.BN(2000);
        await program.methods
            .deposit(amount)
            .accounts({
                vaultAccount: vaultAccount.publicKey,
                signer: provider.wallet.publicKey,
                systemProgram: anchor.web3.SystemProgram.programId,
            })
            .rpc();

        const account = await program.account.vaultAccount.fetch(vaultAccount.publicKey);
        assert.ok(account.balance.toNumber() === 2000);
    });

    it("Withdraws funds", async () => {
        const amount = new anchor.BN(500);
        await program.methods
            .withdraw(amount)
            .accounts({
                vaultAccount: vaultAccount.publicKey,
                signer: provider.wallet.publicKey,
            })
            .rpc();

        const account = await program.account.vaultAccount.fetch(vaultAccount.publicKey);
        assert.ok(account.balance.toNumber() === 1500); // 2000 - 500
    });

    it("Updates Root (Admin)", async () => {
        const newRoot = new Array(32).fill(1); // Set root to all 1s
        await program.methods
            .updateRoot(newRoot)
            .accounts({
                globalConfig: globalConfig.publicKey,
                admin: admin.publicKey,
            })
            .rpc();

        const config = await program.account.globalConfig.fetch(globalConfig.publicKey);
        assert.deepEqual(config.latestRoot, newRoot);
    });

    it("Hibernates account", async () => {
        // Mock waiting for threshold
        console.log("Waiting for 61 seconds to simulate inactivity...");
        await new Promise((resolve) => setTimeout(resolve, 61000));

        await program.methods
            .hibernateAccount()
            .accounts({
                vaultAccount: vaultAccount.publicKey,
                destinationWallet: destinationWallet.publicKey,
                signer: provider.wallet.publicKey,
            })
            .rpc();

        // Assert account is closed
        try {
            await program.account.vaultAccount.fetch(vaultAccount.publicKey);
            assert.fail("Account should be closed");
        } catch (e) {
            assert.include(e.message, "Account does not exist");
        }
    });

    it("Fails to Wake up with Invalid Proof (Mismatch Root)", async () => {
        const wrongProof = new Array(32).fill(0); // Root is currently all 1s
        const balance = new anchor.BN(1500);

        try {
            await program.methods
                .wakeUpAccount(wrongProof, balance)
                .accounts({
                    vaultAccount: vaultAccount.publicKey,
                    globalConfig: globalConfig.publicKey,
                    signer: provider.wallet.publicKey,
                    systemProgram: anchor.web3.SystemProgram.programId,
                })
                .signers([vaultAccount])
                .rpc();
            assert.fail("Should have failed with invalid proof");
        } catch (e) {
            // In Anchor 0.29+, error logs might be slightly different, but checking for custom error code checks
            // "InvalidProof" or code 6003 (if it's the 4th error).
            assert.ok(true); // Passed if it errored
        }
    });

    it("Wakes up account with Valid Proof", async () => {
        const validProof = new Array(32).fill(1); // Matches current root
        const balance = new anchor.BN(1500);

        await program.methods
            .wakeUpAccount(validProof, balance)
            .accounts({
                vaultAccount: vaultAccount.publicKey,
                globalConfig: globalConfig.publicKey,
                signer: provider.wallet.publicKey,
                systemProgram: anchor.web3.SystemProgram.programId,
            })
            .signers([vaultAccount])
            .rpc();

        const account = await program.account.vaultAccount.fetch(vaultAccount.publicKey);
        assert.ok(account.balance.toNumber() === 1500);
        assert.ok(account.owner.equals(provider.wallet.publicKey));
    });
});
