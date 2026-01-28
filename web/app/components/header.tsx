'use client';

import dynamic from 'next/dynamic';
import React from 'react';

// Dynamically import WalletMultiButton to prevent hydration errors
const WalletMultiButton = dynamic(
    () => import('@solana/wallet-adapter-react-ui').then((mod) => mod.WalletMultiButton),
    { ssr: false }
);

export function Header() {
    return (
        <header className="flex items-center justify-between p-6 glass-card mx-4 mt-4 mb-8">
            <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-purple-500 to-green-400 flex items-center justify-center">
                    <span className="text-xl">🗜️</span>
                </div>
                <h1 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-purple-400 to-green-400">
                    CVX <span className="text-white opacity-50 text-sm font-normal">| Compressed Vaults</span>
                </h1>
            </div>

            <WalletMultiButton style={{ backgroundColor: '#14F195', color: '#000', fontWeight: 'bold' }} />
        </header>
    );
}
