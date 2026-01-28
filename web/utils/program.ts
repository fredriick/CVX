import { AnchorProvider, Program } from "@coral-xyz/anchor";
import { Connection, PublicKey } from "@solana/web3.js";
import { Cvx } from "../app/types/cvx";
import idl from "../app/idl/cvx.json";

export const PROGRAM_ID = new PublicKey("3VVsXSvtFXnZN9ovdKiPnzxvKpdd7AepCm11aheGmmLd");

export const getProgram = (connection: Connection, wallet: any) => {
    const provider = new AnchorProvider(connection, wallet, {
        commitment: "confirmed",
    });

    return new Program<Cvx>(idl as any, provider);
};
