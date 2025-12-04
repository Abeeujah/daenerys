use std::hash::pedersen_hash;

/// # Privacy-Preserving Therapy Payment Circuit
///
/// This zero-knowledge circuit enables patients to pay therapists anonymously
/// while preventing double-spending through cryptographic nullifiers.
///
/// ## Privacy Guarantees
/// - Patient identity is never revealed on-chain
/// - Therapist can verify payment without learning who paid
/// - Each payment has a unique nullifier to prevent reuse
///
/// ## Protocol Flow
/// 1. **Deposit**: Patient deposits funds with `commitment = H(secret, therapist_id, amount, salt)`
/// 2. **Share**: Patient sends `(secret, salt)` to therapist via encrypted channel
/// 3. **Claim**: Therapist generates ZK proof of knowledge and claims funds
/// 4. **Verify**: Contract checks proof validity and nullifier uniqueness
///
/// ## Inputs
/// - `patient_secret` (private): Random secret known only to patient
/// - `salt` (private): Random nonce for payment uniqueness
/// - `therapist_id` (public): Identifier of the therapist receiving payment
/// - `amount` (public): Payment amount in wei
///
/// ## Outputs
/// - `commitment`: Binding hash linking payment to therapist and amount
/// - `nullifier_hash`: Unique identifier to prevent double-claiming
fn main(
    patient_secret: Field,
    salt: Field,
    therapist_id: pub Field,
    amount: pub Field,
) -> pub (Field, Field) {
    // Commitment binds the payment to specific therapist and amount
    // while keeping patient identity private
    let commitment = pedersen_hash([patient_secret, therapist_id, amount, salt]);

    // Nullifier is derived from patient's secret data only
    // Unique per payment, unlinkable to patient identity
    let nullifier_hash = pedersen_hash([patient_secret, salt]);

    (commitment, nullifier_hash)
}

#[test]
fn test_payment_circuit() {
    let patient_secret = 12345;
    let salt = 67890;
    let therapist_id = 111;
    let amount = 1000;

    let (commitment, nullifier) = main(patient_secret, salt, therapist_id, amount);

    let expected_commitment = pedersen_hash([patient_secret, therapist_id, amount, salt]);
    assert(commitment == expected_commitment);

    let expected_nullifier = pedersen_hash([patient_secret, salt]);
    assert(nullifier == expected_nullifier);
}

#[test]
fn test_different_patients_different_nullifiers() {
    let therapist_id = 111;
    let amount = 1000;

    let (_, nullifier1) = main(12345, 11111, therapist_id, amount);
    let (_, nullifier2) = main(54321, 22222, therapist_id, amount);

    assert(nullifier1 != nullifier2);
}

#[test]
fn test_same_patient_different_payments() {
    let patient_secret = 12345;
    let therapist_id = 111;
    let amount = 1000;

    let (commitment1, nullifier1) = main(patient_secret, 11111, therapist_id, amount);
    let (commitment2, nullifier2) = main(patient_secret, 22222, therapist_id, amount);

    assert(commitment1 != commitment2);
    assert(nullifier1 != nullifier2);
}
