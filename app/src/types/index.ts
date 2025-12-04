/** Proof generation and verification states */
export enum ProofState {
  Initial = "Initial",
  GeneratingWitness = "Generating witness",
  GeneratingProof = "Generating proof",
  PreparingCalldata = "Preparing calldata",
  ConnectingWallet = "Connecting wallet",
  SendingTransaction = "Sending transaction",
  ProofVerified = "Proof is verified",
}

/** Current proof state with optional error */
export interface ProofStateData {
  state: ProofState;
  error?: string;
}

/** User role in the payment flow */
export enum UserRole {
  Patient = "patient",
  Therapist = "therapist",
}

/** Secret data shared between patient and therapist */
export interface PaymentSecret {
  /** Patient's random secret (private input to circuit) */
  patientSecret: string;
  /** Random salt for payment uniqueness */
  salt: string;
  /** Therapist's public identifier */
  therapistId: string;
  /** Payment amount in wei */
  amount: string;
  /** Commitment hash (felt252 format) */
  commitment: string;
  /** Nullifier hash (felt252 format) */
  nullifierHash: string;
}

/** ZkPassport verification status */
export enum VerificationStatus {
  Unverified = "unverified",
  Pending = "pending",
  Verified = "verified",
  Failed = "failed",
}

/** ZkPassport verification state */
export interface ZkPassportState {
  status: VerificationStatus;
  uniqueId?: string;
  isOver18?: boolean;
  error?: string;
}
