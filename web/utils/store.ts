'use client';

// Types for our "Off-Chain" data
export interface CompressedState {
    owner: string;      // Pubkey string
    balance: number;    // Lamports
    stateHash: number[]; // [u8; 32]
    timestamp: number;
}

const STORAGE_KEY = 'cvx_compressed_states';

export const HibernationStore = {
    saveState: (state: CompressedState) => {
        if (typeof window === 'undefined') return;

        const existing = HibernationStore.getAll();
        // Filter out previous states for this owner to keep it clean (or keep history)
        // For this demo, we assume 1 active vault per owner.
        const filtered = existing.filter(s => s.owner !== state.owner);
        filtered.push(state);

        localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
    },

    getAll: (): CompressedState[] => {
        if (typeof window === 'undefined') return [];

        try {
            const data = localStorage.getItem(STORAGE_KEY);
            return data ? JSON.parse(data) : [];
        } catch (e) {
            console.error("Failed to parse local storage", e);
            return [];
        }
    },

    getState: (owner: string): CompressedState | undefined => {
        const all = HibernationStore.getAll();
        return all.find(s => s.owner === owner);
    },

    removeState: (owner: string) => {
        if (typeof window === 'undefined') return;
        const existing = HibernationStore.getAll();
        const filtered = existing.filter(s => s.owner !== owner);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
    }
};
