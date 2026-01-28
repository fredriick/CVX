'use client';

import { WalletAdapterNetwork, WalletError } from '@solana/wallet-adapter-base';
import { ConnectionProvider, WalletProvider } from '@solana/wallet-adapter-react';
import { WalletModalProvider } from '@solana/wallet-adapter-react-ui';
import { PhantomWalletAdapter, SolflareWalletAdapter } from '@solana/wallet-adapter-wallets';
import { useMemo, useCallback } from 'react';

// Default styles that can be overridden by your app
import '@solana/wallet-adapter-react-ui/styles.css';

export function Providers({ children }: { children: React.ReactNode }) {
    // Use Localnet endpoint
    // IMPORTANT: Phantom requires the network to "look" like Devnet even for localhost
    const endpoint = "http://127.0.0.1:8899";

    const wallets = useMemo(
        () => [
            // PhantomWalletAdapter auto-detects the injected wallet
            new PhantomWalletAdapter(),
            new SolflareWalletAdapter({ network: WalletAdapterNetwork.Devnet }),
        ],
        []
    );

    // Handle wallet errors gracefully
    const onError = useCallback((error: WalletError) => {
        console.error('Wallet error:', error);
        // Phantom often fails on first connect attempt with localhost
        // The user can try again or use Solflare which works better with Localnet
    }, []);

    return (
        <ConnectionProvider
            endpoint={endpoint}
            config={{ commitment: 'confirmed' }}
        >
            <WalletProvider
                wallets={wallets}
                onError={onError}
                autoConnect={false} // Disable auto-connect to avoid race conditions
            >
                <WalletModalProvider>{children}</WalletModalProvider>
            </WalletProvider>
        </ConnectionProvider>
    );
}
