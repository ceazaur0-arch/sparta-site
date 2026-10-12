import { AnchorProvider, Program, BN } from '@coral-xyz/anchor';
import { Connection, PublicKey, Keypair, SystemProgram, SYSVAR_RENT_PUBKEY, ComputeBudgetProgram } from '@solana/web3.js';
import { TOKEN_PROGRAM_ID, getAssociatedTokenAddressSync, createAssociatedTokenAccountIdempotentInstruction } from '@solana/spl-token';
import idl from './idl.json';
import { PROGRAM_ID, RPC_URL } from './config';

const META = new PublicKey('metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s');
const b = (s) => Buffer.from(s);
const pda = (seeds, pid = PROGRAM_ID) => PublicKey.findProgramAddressSync(seeds, pid)[0];
const configPda = () => pda([b('config')]);

export const readOnlyWallet = {
  publicKey: PublicKey.default,
  signTransaction: async (t) => t,
  signAllTransactions: async (t) => t,
};

export function getProgram(wallet) {
  if (!idl || !idl.instructions) throw new Error('Paste your program IDL into src/idl.json');
  const provider = new AnchorProvider(new Connection(RPC_URL, 'confirmed'), wallet, { commitment: 'confirmed' });
  return new Program(idl, PROGRAM_ID, provider);
}

export async function getBondSol(program) {
  const cfg = await program.account.config.fetch(configPda());
  return Number(cfg.bondLamports.toString()) / 1e9;
}

export async function createLaunch(program, wallet, { name, symbol, uri }) {
  const mint = Keypair.generate();
  const launch = pda([b('launch'), mint.publicKey.toBuffer()]);
  const sig = await program.methods
    .createLaunch(name, symbol, uri)
    .accounts({
      config: configPda(),
      launch,
      mint: mint.publicKey,
      tokenVault: pda([b('vault'), launch.toBuffer()]),
      escrow: pda([b('escrow'), launch.toBuffer()]),
      bondVault: pda([b('bond'), launch.toBuffer()]),
      metadata: pda([b('metadata'), META.toBuffer(), mint.publicKey.toBuffer()], META),
      creator: wallet.publicKey,
      tokenMetadataProgram: META,
      tokenProgram: TOKEN_PROGRAM_ID,
      systemProgram: SystemProgram.programId,
      rent: SYSVAR_RENT_PUBKEY,
    })
    .preInstructions([ComputeBudgetProgram.setComputeUnitLimit({ units: 400000 })])
    .signers([mint])
    .rpc();
  return { sig, mint: mint.publicKey.toBase58() };
}

// Estimate output using the same math as the contract. amount: SOL for buy, tokens for sell.
export async function getQuote(program, mintStr, side, amount) {
  const mint = new PublicKey(mintStr);
  const launch = await program.account.launch.fetch(pda([b('launch'), mint.toBuffer()]));
  const cfg = await program.account.config.fetch(configPda());
  const vs = BigInt(launch.virtualSol.toString());
  const vt = BigInt(launch.virtualTokens.toString());
  const ob = BigInt(cfg.ownerFeeBps.toString());
  const cb = BigInt(cfg.creatorFeeBps.toString());
  if (side === 'buy') {
    const sol = BigInt(Math.floor(amount * 1e9));
    const base = sol - (sol * ob) / 10000n - (sol * cb) / 10000n;
    let el = BigInt(Math.floor(Date.now() / 1000) - Number(launch.createdAt.toString()));
    if (el < 0n) el = 0n;
    const win = BigInt(cfg.earlyWindowSecs.toString());
    const sf = BigInt(cfg.startFeeBps.toString());
    const ef = BigInt(cfg.endFeeBps.toString());
    const feeBps = el >= win ? ef : sf - ((sf - ef) * el) / win;
    const net = base - (base * feeBps) / 10000n;
    return Number(vt - (vs * vt) / (vs + net)) / 1e6;
  }
  const tin = BigInt(Math.floor(amount * 1e6));
  const gross = vs - (vs * vt) / (vt + tin);
  return Number(gross - (gross * (100n + ob + cb)) / 10000n) / 1e9;
}

// quote = value from getQuote. 5% slippage tolerance.
export async function trade(program, wallet, mintStr, side, amount, quote) {
  const mint = new PublicKey(mintStr);
  const user = wallet.publicKey;
  const launch = pda([b('launch'), mint.toBuffer()]);
  const ata = getAssociatedTokenAddressSync(mint, user);
  const common = {
    config: configPda(),
    launch,
    tokenVault: pda([b('vault'), launch.toBuffer()]),
    solVault: pda([b('sol_vault'), launch.toBuffer()]),
    tokenProgram: TOKEN_PROGRAM_ID,
    systemProgram: SystemProgram.programId,
  };
  if (side === 'buy') {
    return program.methods
      .buy(new BN(Math.floor(amount * 1e9)), new BN(Math.floor(quote * 1e6 * 0.95)))
      .accounts({
        ...common,
        position: pda([b('pos'), launch.toBuffer(), user.toBuffer()]),
        flag: pda([b('flag'), user.toBuffer()]),
        escrow: pda([b('escrow'), launch.toBuffer()]),
        buyerAta: ata,
        buyer: user,
      })
      .preInstructions([createAssociatedTokenAccountIdempotentInstruction(user, ata, user, mint)])
      .rpc();
  }
  return program.methods
    .sell(new BN(Math.floor(amount * 1e6)), new BN(Math.floor(quote * 1e9 * 0.95)))
    .accounts({ ...common, sellerAta: ata, seller: user })
    .rpc();
}
