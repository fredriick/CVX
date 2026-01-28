'use client';

import { useConnection, useWallet } from '@solana/wallet-adapter-react';
import { PublicKey, SystemProgram, LAMPORTS_PER_SOL } from '@solana/web3.js';
import { useEffect, useState } from 'react';
import * as anchor from '@coral-xyz/anchor';
import { getProgram, PROGRAM_ID } from '../../utils/program';
import { HibernationStore, CompressedState } from '../../utils/store';

export function VaultDashboard() {
    const { connection } = useConnection();
    const wallet = useWallet();

    // State
    const [vaultAccount, setVaultAccount] = useState<any>(null);
    const [loading, setLoading] = useState(false);
    const [amount, setAmount] = useState('');
    const [hibernatedState, setHibernatedState] = useState<CompressedState | undefined>(undefined);
    const [globalConfig, setGlobalConfig] = useState<any>(null);

    // Addresses
    const [vaultPda] = wallet.publicKey ? PublicKey.findProgramAddressSync(
        [Buffer.from("vault"), wallet.publicKey.toBuffer()],
        PROGRAM_ID
    ) : [null];

    const [globalConfigPda] = PublicKey.findProgramAddressSync(
        [Buffer.from("config")],
        PROGRAM_ID
    );

    useEffect(() => {
        if (wallet.connected && wallet.publicKey) {
            fetchState();
        }
    }, [wallet.connected, wallet.publicKey]);

    const fetchState = async () => {
        if (!wallet.publicKey || !vaultPda) return;
        setLoading(true);
        try {
            const program = getProgram(connection, wallet);

            // 1. Fetch Global Config
            // We might need to initialize it if it doesn't exist (Admin only), but for user dashboard we just read.
            try {
                const config = await program.account.globalConfig.fetch(globalConfigPda);
                setGlobalConfig(config);
            } catch (e) {
                console.log("Global config not found (might need init)", e);
            }

            // 2. Fetch Vault Account
            try {
                const vault = await program.account.vaultAccount.fetch(vaultPda);
                setVaultAccount(vault);
                setHibernatedState(undefined); // If on-chain, it's not hibernated
            } catch (e) {
                // Account not found on-chain. Check off-chain store.
                setVaultAccount(null);
                const saved = HibernationStore.getState(wallet.publicKey.toBase58());
                if (saved) {
                    setHibernatedState(saved);
                }
            }
        } catch (e) {
            console.error("Error fetching state:", e);
        } finally {
            setLoading(false);
        }
    };

    const initializeVault = async () => {
        if (!wallet.publicKey) return;
        try {
            setLoading(true);
            const program = getProgram(connection, wallet);
            await program.methods
                .initialize()
                .accounts({
                    vaultAccount: vaultPda,
                    signer: wallet.publicKey,
                    systemProgram: SystemProgram.programId,
                })
                .rpc();
            await fetchState();
        } catch (e) {
            console.error(e);
            alert("Failed to initialize vault");
        } finally {
            setLoading(false);
        }
    };

    const initializeGlobalConfig = async () => {
        if (!wallet.publicKey) return;
        try {
            setLoading(true);
            const program = getProgram(connection, wallet);
            await program.methods
                .initializeConfig()
                .accounts({
                    globalConfig: globalConfigPda,
                    admin: wallet.publicKey,
                    systemProgram: SystemProgram.programId,
                })
                .rpc();
            alert("GlobalConfig initialized! You can now wake up vaults.");
            await fetchState();
        } catch (e) {
            console.error(e);
            alert("Failed to initialize global config (may already exist)");
        } finally {
            setLoading(false);
        }
    };

    const deposit = async () => {
        if (!wallet.publicKey || !amount) return;
        try {
            setLoading(true);
            const program = getProgram(connection, wallet);
            const lamports = parseFloat(amount) * LAMPORTS_PER_SOL;
            await program.methods
                .deposit(new anchor.BN(lamports))
                .accounts({
                    vaultAccount: vaultPda,
                    signer: wallet.publicKey,
                    systemProgram: SystemProgram.programId,
                })
                .rpc();
            setAmount('');
            await fetchState();
        } catch (e) {
            console.error(e);
            alert("Deposit failed");
        } finally {
            setLoading(false);
        }
    };

    const withdraw = async () => {
        if (!wallet.publicKey || !amount) return;
        try {
            setLoading(true);
            const program = getProgram(connection, wallet);
            const lamports = parseFloat(amount) * LAMPORTS_PER_SOL;
            await program.methods
                .withdraw(new anchor.BN(lamports))
                .accounts({
                    vaultAccount: vaultPda,
                    signer: wallet.publicKey,
                })
                .rpc();
            setAmount('');
            await fetchState();
        } catch (e) {
            console.error(e);
            alert("Withdraw failed");
        } finally {
            setLoading(false);
        }
    };

    const hibernate = async () => {
        if (!wallet.publicKey || !vaultAccount) return;
        try {
            setLoading(true);
            const program = getProgram(connection, wallet);

            // Listener for the event
            const listenerId = program.addEventListener("compressionEvent", (event, slot) => {
                console.log("Compression Event Received!", event);

                // SAVE TO STORE
                HibernationStore.saveState({
                    owner: event.owner.toBase58(),
                    balance: event.balance.toNumber(),
                    stateHash: event.stateHash,
                    timestamp: Date.now()
                });
            });

            await program.methods
                .hibernateAccount()
                .accounts({
                    vaultAccount: vaultPda,
                    destinationWallet: wallet.publicKey,
                    signer: wallet.publicKey
                })
                .rpc();

            // Wait a bit for event or just rely on re-fetch
            await new Promise(r => setTimeout(r, 2000));
            program.removeEventListener(listenerId);

            await fetchState();
        } catch (e) {
            console.error(e);
            alert("Hibernation failed (maybe not inactive long enough?)");
        } finally {
            setLoading(false);
        }
    };

    const wakeUp = async () => {
        if (!wallet.publicKey || !hibernatedState) return;
        try {
            setLoading(true);
            const program = getProgram(connection, wallet);

            // In a real ZK app, we would generate a proof here.
            // For CVX, the proof IS the state hash (mock).
            const proof = hibernatedState.stateHash;
            const balance = new anchor.BN(hibernatedState.balance);

            await program.methods
                .wakeUpAccount(proof, balance)
                .accounts({
                    vaultAccount: vaultPda,
                    globalConfig: globalConfigPda,
                    signer: wallet.publicKey,
                    systemProgram: SystemProgram.programId,
                })
                .rpc();

            // Clear local store
            HibernationStore.removeState(wallet.publicKey.toBase58());

            await fetchState();
        } catch (e) {
            console.error(e);
            alert("Wake Up failed! Invalid proof?");
        } finally {
            setLoading(false);
        }
    };

    if (!wallet.connected) {
        return (
            <div className="flex flex-col items-center justify-center h-[50vh]">
                <h2 className="text-2xl font-bold mb-4 opacity-70">Connect Wallet to Access Vault</h2>
            </div>
        );
    }

    return (
        <div className="max-w-4xl mx-auto p-6">

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* STATUS CARD */}
                <div className="glass-card p-8">
                    <h2 className="text-xl font-bold mb-6 text-purple-300 uppercase tracking-widest text-xs">Vault Status</h2>

                    {loading ? (
                        <div className="animate-pulse flex space-x-4">
                            <div className="h-12 bg-white/10 rounded w-full"></div>
                        </div>
                    ) : vaultAccount ? (
                        <div className="space-y-4">
                            <div className="flex justify-between items-end">
                                <span className="text-4xl font-bold text-white">
                                    {(vaultAccount.balance / LAMPORTS_PER_SOL).toFixed(4)} <span className="text-lg text-emerald-400">SOL</span>
                                </span>
                                <span className="px-3 py-1 bg-emerald-500/20 text-emerald-300 rounded-full text-xs font-bold border border-emerald-500/30">
                                    ACTIVE
                                </span>
                            </div>
                            <p className="text-xs text-white/40 font-mono">
                                Last Used: {new Date(vaultAccount.lastUsed * 1000).toLocaleString()}
                            </p>

                            <div className="pt-6">
                                <button
                                    onClick={hibernate}
                                    className="w-full py-4 rounded-xl border border-red-500/50 text-red-400 hover:bg-red-500/10 transition-all font-bold flex items-center justify-center gap-2 group"
                                >
                                    <span>❄️</span> Hibernate Vault
                                    <span className="text-xs font-normal opacity-50 group-hover:opacity-100 transition-opacity">
                                        (Compress State)
                                    </span>
                                </button>
                                <p className="text-[10px] text-center mt-2 text-white/30">
                                    Must be inactive for &gt;60s to hibernate.
                                </p>
                            </div>
                        </div>
                    ) : hibernatedState ? (
                        <div className="space-y-4">
                            <div className="flex justify-between items-end grayscale opacity-80">
                                <span className="text-4xl font-bold text-white">
                                    {(hibernatedState.balance / LAMPORTS_PER_SOL).toFixed(4)} <span className="text-lg text-emerald-400">SOL</span>
                                </span>
                                <span className="px-3 py-1 bg-blue-500/20 text-blue-300 rounded-full text-xs font-bold border border-blue-500/30">
                                    HIBERNATED
                                </span>
                            </div>
                            <div className="bg-black/40 p-3 rounded border border-white/5 font-mono text-[10px] text-blue-200/70 overflow-hidden text-ellipsis">
                                Hash: {JSON.stringify(hibernatedState.stateHash.slice(0, 8))}...
                            </div>

                            <div className="pt-6 space-y-3">
                                <button
                                    onClick={wakeUp}
                                    className="w-full py-4 rounded-xl bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-lg font-bold hover:scale-[1.02] transition-transform"
                                >
                                    ⚡️ Wake Up Vault
                                </button>
                                <button
                                    onClick={() => {
                                        if (wallet.publicKey) {
                                            HibernationStore.removeState(wallet.publicKey.toBase58());
                                            localStorage.removeItem('cvx_compressed_states');
                                            setHibernatedState(undefined);
                                            alert('Cleared! Now try Initialize Vault.');
                                        }
                                    }}
                                    className="w-full py-2 rounded-xl border border-white/20 text-white/50 hover:text-white hover:border-white/40 transition-all text-sm"
                                >
                                    🗑️ Clear Stale Data & Start Fresh
                                </button>
                            </div>
                        </div>
                    ) : (
                        <div className="text-center py-10">
                            <p className="mb-6 text-white/60">No vault found for this wallet.</p>
                            <button onClick={initializeVault} className="btn-primary w-full">
                                Initialize Vault
                            </button>
                        </div>
                    )}
                </div>

                {/* CONTROLS CARD (Only if Active) */}
                {vaultAccount && (
                    <div className="glass-card p-8 flex flex-col justify-between">
                        <div>
                            <h2 className="text-xl font-bold mb-6 text-emerald-300 uppercase tracking-widest text-xs">Actions</h2>

                            <div className="space-y-4">
                                <div className="bg-black/30 p-4 rounded-xl border border-white/5">
                                    <label className="text-xs text-white/50 mb-2 block">Amount (SOL)</label>
                                    <input
                                        type="number"
                                        value={amount}
                                        onChange={(e) => setAmount(e.target.value)}
                                        className="w-full bg-transparent text-2xl font-bold outline-none placeholder-white/10"
                                        placeholder="0.00"
                                    />
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <button onClick={deposit} className="btn-primary">
                                        Deposit
                                    </button>
                                    <button onClick={withdraw} className="btn-outline">
                                        Withdraw
                                    </button>
                                </div>
                            </div>
                        </div>

                        <div className="mt-8 pt-6 border-t border-white/5">
                            <div className="flex items-center gap-2 text-xs text-white/30">
                                <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
                                Live on Localnet
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* ADMIN PANEL */}
            {!globalConfig && wallet.connected && (
                <div className="mt-8 p-6 glass-card border border-yellow-500/30">
                    <h3 className="text-yellow-400 font-bold mb-4 text-xs uppercase tracking-widest">⚙️ Admin Setup Required</h3>
                    <p className="text-white/60 text-sm mb-4">
                        GlobalConfig not initialized. This is required for wake-up functionality.
                    </p>
                    <button
                        onClick={initializeGlobalConfig}
                        className="w-full py-3 rounded-xl bg-yellow-500/20 border border-yellow-500/50 text-yellow-300 hover:bg-yellow-500/30 transition-all font-bold"
                    >
                        Initialize GlobalConfig (Admin Only)
                    </button>
                </div>
            )}
        </div>
    );
}
