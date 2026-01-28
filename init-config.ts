import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { Cvx } from "./target/types/cvx";
import { Keypair, SystemProgram } from "@solana/web3.js";
import fs from "fs";

async function main() {
    const provider = anchor.AnchorProvider.env();
    anchor.setProvider(provider);
    
    const program = anchor.workspace.Cvx as Program<Cvx>;
    
    // Generate a new keypair for global_config account
    const globalConfig = Keypair.generate();
    
    console.log("Initializing GlobalConfig at:", globalConfig.publicKey.toBase58());
    
    await program.methods
        .initializeConfig()
        .accounts({
            globalConfig: globalConfig.publicKey,
            admin: provider.wallet.publicKey,
            systemProgram: SystemProgram.programId,
        })
        .signers([globalConfig])
        .rpc();
    
    console.log("GlobalConfig initialized!");
    console.log("Save this address for your frontend:", globalConfig.publicKey.toBase58());
    
    // Save to a file for later use
    fs.writeFileSync("global-config-address.txt", globalConfig.publicKey.toBase58());
}

main().catch(console.error);
