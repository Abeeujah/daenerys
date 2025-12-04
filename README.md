# 🔒 Private Therapy Payments

A privacy-preserving payment system for mental health services built with **Noir + Garaga + Starknet + ZkPassport**. Patients can pay their therapists anonymously using zero-knowledge proofs while proving they're 18+ without revealing their identity.

Built on [scaffold-garaga](https://github.com/keep-starknet-strange/scaffold-garaga).

## Features

- **Anonymous payments** - Patient identity never revealed on-chain
- **Age verification** - ZkPassport proves 18+ without exposing identity
- **Double-spend protection** - Nullifiers prevent duplicate claims
- **On-chain verification** - Garaga verifies UltraHonk proofs on Starknet

## How It Works

```
┌─────────────────────────────────────────────────────────────────┐
│                    PATIENT (Private Side)                       │
├─────────────────────────────────────────────────────────────────┤
│  1. Verify age (18+) via ZkPassport                             │
│  2. Generate random: patient_secret, salt                       │
│  3. ZK Circuit computes:                                        │
│     • commitment = hash(secret, therapist_id, amount, salt)     │
│     • nullifier = hash(secret, salt)                            │
│  4. Deposit funds with commitment (on-chain)                    │
│  5. Share secret code with therapist (off-chain)                │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                   THERAPIST (Claim Side)                        │
├─────────────────────────────────────────────────────────────────┤
│  6. Verify identity via ZkPassport                              │
│  7. Receive secret code from patient                            │
│  8. Generate ZK proof using same inputs                         │
│  9. Contract verifies proof and releases funds                  │
│                                                                 │
│  ✅ Patient identity NEVER revealed on-chain                    │
│  ✅ Nullifier prevents double-claiming                          │
└─────────────────────────────────────────────────────────────────┘
```

## Prerequisites

| Tool | Version | Installation |
|------|---------|--------------|
| Python | 3.10+ | System package manager |
| Node.js | 18+ | [nodejs.org](https://nodejs.org) |
| asdf | latest | [asdf-vm.com](https://asdf-vm.com) |

## Quick Start

### 1. Install dependencies

```sh
# Install Bun package manager
make install-bun

# Install Noir compiler (v1.0.0-beta.16)
make install-noir

# Install Barretenberg prover
make install-barretenberg

# Install Starknet toolkit
make install-starknet

# Install Starknet devnet
make install-devnet

# Set up Python environment and install Garaga
python3.10 -m venv .venv
source .venv/bin/activate
make install-garaga

# Install frontend dependencies
make install-app-deps
```

### 2. Build everything

```sh
source .venv/bin/activate  # If not already active
make setup
```

This runs the full pipeline: circuit build → verification key → verifier contract → all contracts → copy artifacts to app.

### 3. Start devnet (Terminal 1)

```sh
make devnet
```

### 4. Deploy contracts (Terminal 2)

```sh
# Generate accounts file from devnet
make accounts-file

# Declare and deploy verifier
make declare-verifier
make deploy-verifier
# Note: Copy the deployed address from output

# Declare and deploy payment contract
make declare-payment
make deploy-payment
# Note: Copy the deployed address from output
```

### 5. Configure environment

```sh
cd app
cp .env.example .env
```

Update `.env` with your deployed contract addresses:

```env
VITE_VERIFIER_ADDRESS=<your-verifier-address>
VITE_PAYMENT_ADDRESS=<your-payment-address>
VITE_DEVNET_ACCOUNT_ADDRESS=0x64b48806902a367c8598f4f95c305e8c1a1acba5f082d294a43793113115691
VITE_DEVNET_PRIVATE_KEY=0x71d7bb07b9a64f6f78ac4c816aff4da9
VITE_RPC_URL=http://127.0.0.1:5050/rpc
```

### 6. Run the app

```sh
make run-app
```

Open http://localhost:5173

## Usage

### As a Patient

1. Click **[patient]** tab
2. Click **"Verify Age (18+)"** and scan QR with ZkPassport app
   - Or click **"Skip (dev/demo)"** for testing in unsupported regions
3. Enter therapist ID and payment amount
4. Click **"Generate Commitment"**
5. Copy the secret code and share securely with your therapist

### As a Therapist

1. Click **[therapist]** tab
2. Click **"Verify Identity"** and scan QR with ZkPassport app
   - Or click **"Skip (dev/demo)"** for testing
3. Paste the secret code from patient
4. Click **"Decode"** to view payment details
5. Click **"Execute Withdrawal"** to claim funds

## Architecture

```
circuit/
└── src/main.nr              # Noir ZK circuit (commitment + nullifier)

contracts/
├── verifier/                # Garaga-generated UltraHonk verifier
└── payment/
    └── src/therapy_payment.cairo  # Payment logic with nullifier tracking

app/
└── src/
    ├── App.tsx              # React UI
    ├── hooks/useZkPassport.ts  # ZkPassport integration
    ├── types/index.ts       # TypeScript types
    └── helpers/
        ├── crypto.ts        # Field generation, encoding
        └── proof.ts         # Proof formatting for Garaga
```

## Commands Reference

| Command | Description |
|---------|-------------|
| `make setup` | Full build pipeline |
| `make devnet` | Start local Starknet devnet |
| `make accounts-file` | Generate accounts from devnet |
| `make build-circuit` | Compile Noir circuit |
| `make test-circuit` | Run circuit tests |
| `make gen-vk` | Generate verification key |
| `make gen-verifier` | Generate Garaga verifier |
| `make build-contracts` | Build all Cairo contracts |
| `make declare-verifier` | Declare verifier contract |
| `make deploy-verifier` | Deploy verifier contract |
| `make declare-payment` | Declare payment contract |
| `make deploy-payment` | Deploy payment contract |
| `make artifacts` | Copy artifacts to app |
| `make run-app` | Start development server |
| `make help` | Show all commands |

## Tech Stack

- **[Noir](https://noir-lang.org)** - ZK circuit language
- **[Garaga](https://github.com/keep-starknet-strange/garaga)** - On-chain proof verification for Starknet
- **[Starknet](https://starknet.io)** - L2 blockchain
- **[ZkPassport](https://zkpassport.id)** - Privacy-preserving identity verification
- **[React](https://react.dev)** + **[Vite](https://vitejs.dev)** - Frontend

## Troubleshooting

### ZkPassport not working in my region
Use the **"Skip (dev/demo)"** button to bypass verification for testing.

### Contract deployment fails
Ensure devnet is running and `accounts-file` was generated after devnet started.

### Proof generation takes too long
First proof generation downloads WASM files (~50MB). Subsequent proofs are faster.

### Class hash mismatch
If you modified contracts, update the class hashes in `Makefile` after `declare-*` commands.

## Security Considerations

- Keep patient secrets secure - never store on-chain
- Use secure channels (e.g., encrypted messaging) to share secret codes
- Nullifiers prevent double-claiming but are publicly visible
- Consider time-locks and expiration for production deployments
- Audit smart contracts before mainnet deployment

## Resources

- [Noir Documentation](https://noir-lang.org/docs)
- [Garaga Documentation](https://garaga.gitbook.io/garaga)
- [Starknet Documentation](https://docs.starknet.io)
- [ZkPassport SDK](https://docs.zkpassport.id)
- [Cairo Book](https://book.cairo-lang.org)

## License

MIT
