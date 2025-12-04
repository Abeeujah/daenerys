import { useState, useEffect, useRef } from "react";
import "./App.css";
import { ProofState, ProofStateData, UserRole, PaymentSecret } from "./types";
import { Noir } from "@noir-lang/noir_js";
import { DebugFileMap } from "@noir-lang/types";
import { UltraHonkBackend } from "@aztec/bb.js";
import { flattenFieldsAsArray } from "./helpers/proof";
import {
  generateRandomField,
  encodePaymentSecret,
  decodePaymentSecret,
  formatAmount,
  parseAmount,
  toFelt252,
} from "./helpers/crypto";
import { getZKHonkCallData, init } from "garaga";
import { bytecode, abi } from "./assets/circuit.json";
import verifierJson from "./assets/verifier.json";
import paymentJson from "./assets/payment.json";
import vkUrl from "./assets/vk.bin?url";
import { RpcProvider, Contract, Account } from "starknet";
import initNoirC from "@noir-lang/noirc_abi";
import initACVM from "@noir-lang/acvm_js";
import acvm from "@noir-lang/acvm_js/web/acvm_js_bg.wasm?url";
import noirc from "@noir-lang/noirc_abi/web/noirc_abi_wasm_bg.wasm?url";

const VERIFIER_ADDRESS =
  "0x0204901771d84536864668841a8aa7e4ab0de85af88794fdabdaf4dcb17e2f46";
const PAYMENT_ADDRESS =
  "0x0773b362b26570426d18d39f9a21ccb3e045971d9d4d0ca98df23080b34169d5";

const DEVNET_ACCOUNT_ADDRESS =
  "0x64b48806902a367c8598f4f95c305e8c1a1acba5f082d294a43793113115691";
const DEVNET_PRIVATE_KEY = "0x71d7bb07b9a64f6f78ac4c816aff4da9";
const RPC_URL = "http://127.0.0.1:5050/rpc";

function App() {
  const [proofState, setProofState] = useState<ProofStateData>({
    state: ProofState.Initial,
  });
  const [vk, setVk] = useState<Uint8Array | null>(null);
  const [role, setRole] = useState<UserRole>(UserRole.Patient);

  const [therapistId, setTherapistId] = useState<string>("111");
  const [amount, setAmount] = useState<string>("0.1");
  const [, setGeneratedSecret] = useState<PaymentSecret | null>(null);
  const [secretCode, setSecretCode] = useState<string>("");

  const [receivedSecretCode, setReceivedSecretCode] = useState<string>("");
  const [parsedSecret, setParsedSecret] = useState<PaymentSecret | null>(null);

  const currentStateRef = useRef<ProofState>(ProofState.Initial);

  useEffect(() => {
    const initWasm = async () => {
      if (typeof window !== "undefined") {
        await Promise.all([initACVM(fetch(acvm)), initNoirC(fetch(noirc))]);
      }
    };

    const loadVk = async () => {
      const response = await fetch(vkUrl);
      const arrayBuffer = await response.arrayBuffer();
      setVk(new Uint8Array(arrayBuffer));
    };

    initWasm();
    loadVk();
  }, []);

  const resetState = () => {
    currentStateRef.current = ProofState.Initial;
    setProofState({ state: ProofState.Initial, error: undefined });
    setGeneratedSecret(null);
    setSecretCode("");
    setParsedSecret(null);
  };

  const handleError = (error: unknown) => {
    const errorMessage = error instanceof Error ? error.message : String(error);
    setProofState({ state: currentStateRef.current, error: errorMessage });
  };

  const updateState = (newState: ProofState) => {
    currentStateRef.current = newState;
    setProofState({ state: newState, error: undefined });
  };

  const extractReturnValues = (returnValue: unknown): [string, string] => {
    if (returnValue === undefined || returnValue === null) {
      throw new Error("Circuit did not return any value");
    }

    if (Array.isArray(returnValue) && returnValue.length >= 2) {
      return [String(returnValue[0]), String(returnValue[1])];
    }

    if (typeof returnValue === "object") {
      const obj = returnValue as Record<string, unknown>;

      if ("0" in obj && "1" in obj) {
        return [String(obj["0"]), String(obj["1"])];
      }

      if ("inner" in obj && Array.isArray(obj.inner) && obj.inner.length >= 2) {
        return [String(obj.inner[0]), String(obj.inner[1])];
      }
    }

    throw new Error(`Unexpected return value format: ${JSON.stringify(returnValue)}`);
  };

  const createNoirInstance = () =>
    new Noir({
      bytecode,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      abi: abi as any,
      debug_symbols: "",
      file_map: {} as DebugFileMap,
    });

  const createDeposit = async () => {
    try {
      updateState(ProofState.GeneratingWitness);

      const amountWei = parseAmount(amount);
      const patientSecret = generateRandomField();
      const salt = generateRandomField();

      const input = {
        patient_secret: patientSecret,
        salt: salt,
        therapist_id: therapistId,
        amount: amountWei,
      };

      const noir = createNoirInstance();
      const execResult = await noir.execute(input);

      const [commitment, nullifierHash] = extractReturnValues(execResult.returnValue);

      updateState(ProofState.GeneratingProof);

      const honk = new UltraHonkBackend(bytecode, { threads: 2 });
      const proof = await honk.generateProof(execResult.witness, { keccakZK: true });
      honk.destroy();

      updateState(ProofState.PreparingCalldata);

      await init();
      const callData = getZKHonkCallData(
        proof.proof,
        flattenFieldsAsArray(proof.publicInputs),
        vk as Uint8Array,
      );

      const feltCommitment = toFelt252(commitment);
      const feltNullifier = toFelt252(nullifierHash);

      const finalSecret: PaymentSecret = {
        patientSecret,
        salt,
        therapistId,
        amount: amountWei,
        commitment: feltCommitment,
        nullifierHash: feltNullifier,
      };

      setGeneratedSecret(finalSecret);
      setSecretCode(encodePaymentSecret(finalSecret));

      updateState(ProofState.SendingTransaction);

      const provider = new RpcProvider({ nodeUrl: RPC_URL });

      const verifierContract = new Contract({
        abi: verifierJson.abi,
        address: VERIFIER_ADDRESS,
        providerOrAccount: provider,
      });

      await verifierContract.verify_ultra_keccak_zk_honk_proof(callData.slice(1));

      const account = new Account({
        provider,
        address: DEVNET_ACCOUNT_ADDRESS,
        signer: DEVNET_PRIVATE_KEY,
      });

      const paymentContract = new Contract({
        abi: paymentJson.abi,
        address: PAYMENT_ADDRESS,
        providerOrAccount: account,
      });

      const depositTx = await paymentContract.deposit(feltCommitment, {
        low: amountWei,
        high: "0",
      });
      await provider.waitForTransaction(depositTx.transaction_hash);

      updateState(ProofState.ProofVerified);
    } catch (error) {
      handleError(error);
    }
  };

  const parseReceivedSecret = () => {
    try {
      const secret = decodePaymentSecret(receivedSecretCode);
      setParsedSecret(secret);
    } catch {
      handleError(new Error("Invalid secret code"));
    }
  };

  const claimPayment = async () => {
    if (!parsedSecret) return;

    try {
      updateState(ProofState.GeneratingWitness);

      const input = {
        patient_secret: parsedSecret.patientSecret,
        salt: parsedSecret.salt,
        therapist_id: parsedSecret.therapistId,
        amount: parsedSecret.amount,
      };

      const noir = createNoirInstance();
      const execResult = await noir.execute(input);

      const [rawCommitment] = extractReturnValues(execResult.returnValue);
      const computedCommitment = toFelt252(rawCommitment);

      if (computedCommitment !== parsedSecret.commitment) {
        throw new Error("Commitment mismatch - invalid secret");
      }

      updateState(ProofState.GeneratingProof);

      const honk = new UltraHonkBackend(bytecode, { threads: 2 });
      const proof = await honk.generateProof(execResult.witness, { keccakZK: true });
      honk.destroy();

      updateState(ProofState.PreparingCalldata);

      await init();
      const callData = getZKHonkCallData(
        proof.proof,
        flattenFieldsAsArray(proof.publicInputs),
        vk as Uint8Array,
      );

      updateState(ProofState.SendingTransaction);

      const provider = new RpcProvider({ nodeUrl: RPC_URL });

      const account = new Account({
        provider,
        address: DEVNET_ACCOUNT_ADDRESS,
        signer: DEVNET_PRIVATE_KEY,
      });

      const paymentContract = new Contract({
        abi: paymentJson.abi,
        address: PAYMENT_ADDRESS,
        providerOrAccount: account,
      });

      const withdrawTx = await paymentContract.withdraw(
        parsedSecret.commitment,
        parsedSecret.nullifierHash,
        callData.slice(1),
      );
      await provider.waitForTransaction(withdrawTx.transaction_hash);

      updateState(ProofState.ProofVerified);
    } catch (error) {
      handleError(error);
    }
  };

  const renderStateIndicator = (state: ProofState, current: ProofState) => {
    let status = "pending";
    if (current === state && proofState.error) {
      status = "error";
    } else if (current === state) {
      status = "active";
    } else if (getStateIndex(current) > getStateIndex(state)) {
      status = "completed";
    }

    return (
      <div className={`state-indicator ${status}`}>
        <div className="state-dot"></div>
        <div className="state-label">{state}</div>
      </div>
    );
  };

  const getStateIndex = (state: ProofState): number => {
    const states = [
      ProofState.Initial,
      ProofState.GeneratingWitness,
      ProofState.GeneratingProof,
      ProofState.PreparingCalldata,
      ProofState.ConnectingWallet,
      ProofState.SendingTransaction,
      ProofState.ProofVerified,
    ];
    return states.indexOf(state);
  };

  return (
    <div className="container">
      <h1>Private Therapy Payments</h1>
      <p className="subtitle">// anonymous payments via zero-knowledge proofs</p>

      <div className="role-selector">
        <button
          className={`role-button ${role === UserRole.Patient ? "active" : ""}`}
          onClick={() => {
            setRole(UserRole.Patient);
            resetState();
          }}
        >
          [patient]
        </button>
        <button
          className={`role-button ${role === UserRole.Therapist ? "active" : ""}`}
          onClick={() => {
            setRole(UserRole.Therapist);
            resetState();
          }}
        >
          [therapist]
        </button>
      </div>

      {role === UserRole.Patient && (
        <div className="panel patient-panel">
          <h2>Create Payment</h2>
          <p className="info-text">
            Generate a private payment commitment. Your identity remains cryptographically hidden
            on-chain. Only the recipient can claim funds.
          </p>

          <div className="input-section">
            <div className="input-group">
              <label htmlFor="therapist-id">Therapist ID:</label>
              <input
                id="therapist-id"
                type="text"
                value={therapistId}
                onChange={(e) => setTherapistId(e.target.value)}
                placeholder="Enter therapist's ID"
                disabled={proofState.state !== ProofState.Initial}
              />
            </div>
            <div className="input-group">
              <label htmlFor="amount">Amount (ETH):</label>
              <input
                id="amount"
                type="text"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0.1"
                disabled={proofState.state !== ProofState.Initial}
              />
            </div>
          </div>

          {proofState.state === ProofState.Initial && !proofState.error && (
            <button className="primary-button" onClick={createDeposit}>
              Generate Commitment
            </button>
          )}

          {secretCode && (
            <div className="secret-output">
              <h3>{">"} share this code with recipient:</h3>
              <textarea
                readOnly
                value={secretCode}
                className="secret-code"
                onClick={(e) => (e.target as HTMLTextAreaElement).select()}
              />
              <p className="warning">! keep private — only share via secure channel</p>
            </div>
          )}
        </div>
      )}

      {role === UserRole.Therapist && (
        <div className="panel therapist-panel">
          <h2>Claim Payment</h2>
          <p className="info-text">
            Enter the secret code to claim funds. The ZK proof validates your claim without
            revealing the sender's identity on-chain.
          </p>

          <div className="input-section">
            <div className="input-group">
              <label htmlFor="secret-code">Secret Code</label>
              <textarea
                id="secret-code"
                value={receivedSecretCode}
                onChange={(e) => setReceivedSecretCode(e.target.value)}
                placeholder="paste secret code..."
                disabled={proofState.state !== ProofState.Initial}
                className="secret-input"
              />
            </div>
          </div>

          {proofState.state === ProofState.Initial && !parsedSecret && (
            <button className="primary-button" onClick={parseReceivedSecret}>
              Decode
            </button>
          )}

          {parsedSecret && (
            <div className="payment-details">
              <h3>Payment Data</h3>
              <p>
                <strong>amount:</strong> {formatAmount(parsedSecret.amount)} ETH
              </p>
              <p>
                <strong>recipient_id:</strong> {parsedSecret.therapistId}
              </p>
              <p className="privacy-note">+ sender identity hidden</p>

              {proofState.state === ProofState.Initial && (
                <button className="primary-button claim-button" onClick={claimPayment}>
                  Execute Withdrawal
                </button>
              )}
            </div>
          )}
        </div>
      )}

      {proofState.state !== ProofState.Initial && (
        <div className="state-machine">
          {renderStateIndicator(ProofState.GeneratingWitness, proofState.state)}
          {renderStateIndicator(ProofState.GeneratingProof, proofState.state)}
          {renderStateIndicator(ProofState.PreparingCalldata, proofState.state)}
          {renderStateIndicator(ProofState.SendingTransaction, proofState.state)}
        </div>
      )}

      {proofState.error && (
        <div className="error-message">
          Error at stage '{proofState.state}': {proofState.error}
        </div>
      )}

      {proofState.state === ProofState.ProofVerified && (
        <div className="success-message">
          {role === UserRole.Patient
            ? "[ OK ] commitment registered — share code with recipient"
            : "[ OK ] withdrawal complete"}
        </div>
      )}

      {(proofState.error || proofState.state === ProofState.ProofVerified) && (
        <button className="reset-button" onClick={resetState}>
          reset
        </button>
      )}

      <div className="how-it-works">
        <h3>// protocol</h3>
        <ol>
          <li>
            <strong>deposit</strong> — funds locked with cryptographic commitment
          </li>
          <li>
            <strong>transfer</strong> — secret code shared via secure channel
          </li>
          <li>
            <strong>prove</strong> — recipient generates ZK proof of knowledge
          </li>
          <li>
            <strong>withdraw</strong> — contract verifies proof, releases funds
          </li>
        </ol>
      </div>
    </div>
  );
}

export default App;
