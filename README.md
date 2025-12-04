# 🔒 Private Therapy Payments

A privacy-preserving payment system for therapists built with **Noir + Garaga + Starknet**. Patients can pay their therapists anonymously using zero-knowledge proofs.

Built on [scaffold-garaga](https://github.com/keep-starknet-strange/scaffold-garaga).

## How It Works

```
┌─────────────────────────────────────────────────────────────────┐
│                    PATIENT (Private Side)                       │
├─────────────────────────────────────────────────────────────────┤
│  1. Generate random: patient_secret, salt                       │
│  2. ZK Circuit computes:                                        │
│     • commitment = hash(secret, therapist_id, amount, salt)     │
│     • nullifier = hash(secret, salt)                            │
│  3. Deposit funds with commitment (on-chain)                    │
│  4. Share secret code with therapist (off-chain)                │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                   THERAPIST (Claim Side)                        │
├─────────────────────────────────────────────────────────────────┤
│  5. Receive secret code from patient                            │
│  6. Generate ZK proof using same inputs                         │
│  7. Contract verifies proof and releases funds                  │
│                                                                 │
│  ✅ Patient identity NEVER revealed on-chain                    │
│  ✅ Nullifier prevents double-claiming                          │
└─────────────────────────────────────────────────────────────────┘
```

## Privacy Guarantees

- **Patient anonymity**: Only commitment hash stored on-chain
- **No identity linkage**: Nullifier prevents linking payments to patient identity
- **Therapist verification**: Only therapist with the secret can claim
- **Double-spend prevention**: Nullifier can only be used once

## Architecture

```
circuit/
└── src/main.nr              # Noir ZK circuit

contracts/
├── verifier/                # Garaga-generated UltraHonk verifier (auto-generated)
└── payment/
    └── src/therapy_payment.cairo  # Payment logic with nullifier tracking

app/
└── src/
    ├── App.tsx              # React UI
    ├── types/index.ts       # TypeScript types
    └── helpers/
        ├── crypto.ts        # Field generation, encoding
        └── proof.ts         # Proof formatting for Garaga
```

## Installation

```sh
# Install Bun
make install-bun

# Install Noir and Barretenberg (specific versions required)
make install-noir
make install-barretenberg

# Install Starknet toolkit and devnet
make install-starknet
make install-devnet

# Install Garaga (requires Python 3.10)
python3.10 -m venv .venv && source .venv/bin/activate
make install-garaga

# Install app dependencies
make install-app-deps
```

## Quick Start

### 1. Build everything

```sh
make setup  # Builds circuit, generates verifier, copies artifacts
```

Or step by step:

```sh
make build-circuit     # Build Noir circuit
make test-circuit      # Run tests
make gen-vk            # Generate verification key
make gen-verifier      # Generate Garaga verifier contract
make build-contracts   # Build Cairo contracts
make artifacts         # Copy artifacts to app
```

### 2. Start local devnet

```sh
# Terminal 1
make devnet
```

### 3. Deploy contracts

```sh
# Terminal 2
make accounts-file
make declare-verifier
make deploy-verifier
# Note the deployed address

make declare-payment
make deploy-payment
# Update addresses in app/src/App.tsx if needed
```

### 4. Run the app

```sh
make run-app
```

## Usage

### As a Patient

1. Select "I'm a Patient"
2. Enter therapist ID and amount
3. Click "Create Private Payment"
4. Copy the generated secret code
5. Share securely with your therapist

### As a Therapist

1. Select "I'm a Therapist"
2. Paste secret code from patient
3. Click "Verify Code" to see payment details
4. Click "Claim Payment with ZK Proof"
5. Funds are transferred!

## Commands Reference

| Command | Description |
|---------|-------------|
| `make devnet` | Start local Starknet devnet |
| `make build-circuit` | Compile Noir circuit |
| `make test-circuit` | Run circuit tests |
| `make gen-vk` | Generate verification key |
| `make gen-verifier` | Generate Garaga verifier |
| `make build-contracts` | Build all Cairo contracts |
| `make artifacts` | Copy artifacts to app |
| `make run-app` | Start development server |
| `make setup` | Full build pipeline |

## Resources

- [Noir Documentation](https://noir-lang.org/docs)
- [Garaga Documentation](https://garaga.gitbook.io/garaga)
- [Starknet Documentation](https://docs.starknet.io)
- [Cairo Book](https://book.cairo-lang.org)

## Security Considerations

- Keep patient secrets secure - never store on-chain
- Use secure channels (e.g., encrypted messaging) to share secret codes
- Nullifiers prevent double-claiming but are publicly visible
- Consider time-locks and expiration for production deployments
- Audit smart contracts before mainnet deployment
