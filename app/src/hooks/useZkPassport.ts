import { useState, useCallback } from "react";
import { ZKPassport } from "@zkpassport/sdk";
import { VerificationStatus, ZkPassportState } from "../types";
import QRCode from "qrcode";

const APP_NAME = "Private Therapy Payments";
const APP_LOGO = "https://zkpassport.id/images/zkpassport-logo-color.png";

interface UseZkPassportReturn {
  patientState: ZkPassportState;
  therapistState: ZkPassportState;
  patientQrCode: string | null;
  therapistQrCode: string | null;
  verifyPatient: () => Promise<void>;
  verifyTherapist: () => Promise<void>;
  skipPatientVerification: () => void;
  skipTherapistVerification: () => void;
  resetVerification: () => void;
}

export function useZkPassport(): UseZkPassportReturn {
  const [patientState, setPatientState] = useState<ZkPassportState>({
    status: VerificationStatus.Unverified,
  });
  const [therapistState, setTherapistState] = useState<ZkPassportState>({
    status: VerificationStatus.Unverified,
  });
  const [patientQrCode, setPatientQrCode] = useState<string | null>(null);
  const [therapistQrCode, setTherapistQrCode] = useState<string | null>(null);

  const verifyPatient = useCallback(async () => {
    try {
      setPatientState({ status: VerificationStatus.Pending });
      setPatientQrCode(null);

      const zkPassport = new ZKPassport();
      const queryBuilder = await zkPassport.request({
        name: APP_NAME,
        logo: APP_LOGO,
        purpose: "Verify you are 18+ to make anonymous therapy payments",
        scope: "patient-verification",
      });

      const {
        url,
        onRequestReceived,
        onGeneratingProof,
        onResult,
        onReject,
        onError,
      } = await queryBuilder
        .gte("age", 18)
        .done(); /* This helps protect the user */

      const qrCodeDataUrl = await QRCode.toDataURL(url, {
        width: 256,
        margin: 2,
        color: { dark: "#00ff88", light: "#000000" },
      });
      setPatientQrCode(qrCodeDataUrl);

      onRequestReceived(() => {
        setPatientState((prev) => ({
          ...prev,
          status: VerificationStatus.Pending,
        }));
      });

      onGeneratingProof(() => {
        setPatientState((prev) => ({
          ...prev,
          status: VerificationStatus.Pending,
        }));
      });

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      onResult((response: any) => {
        if (response.verified && response.uniqueIdentifier) {
          setPatientState({
            status: VerificationStatus.Verified,
            uniqueId: response.uniqueIdentifier,
            isOver18: true,
          });
          setPatientQrCode(null);
        } else {
          setPatientState({
            status: VerificationStatus.Failed,
            error: "Age verification failed",
          });
        }
      });

      onReject(() => {
        setPatientState({
          status: VerificationStatus.Failed,
          error: "Verification rejected by user",
        });
        setPatientQrCode(null);
      });

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      onError((error: any) => {
        setPatientState({
          status: VerificationStatus.Failed,
          error: error?.message || "Verification error",
        });
        setPatientQrCode(null);
      });
    } catch (error) {
      setPatientState({
        status: VerificationStatus.Failed,
        error: error instanceof Error ? error.message : "Unknown error",
      });
      setPatientQrCode(null);
    }
  }, []);

  const verifyTherapist = useCallback(async () => {
    try {
      setTherapistState({ status: VerificationStatus.Pending });
      setTherapistQrCode(null);

      const zkPassport = new ZKPassport();
      const queryBuilder = await zkPassport.request({
        name: APP_NAME,
        logo: APP_LOGO,
        purpose: "Verify your identity to claim therapy payments",
        scope: "therapist-verification",
      });

      const {
        url,
        onRequestReceived,
        onGeneratingProof,
        onResult,
        onReject,
        onError,
      } = await queryBuilder
        .gte("age", 21)
        .done(); /* This would be the Therapist's verification credential */

      const qrCodeDataUrl = await QRCode.toDataURL(url, {
        width: 256,
        margin: 2,
        color: { dark: "#00ff88", light: "#000000" },
      });
      setTherapistQrCode(qrCodeDataUrl);

      onRequestReceived(() => {
        setTherapistState((prev) => ({
          ...prev,
          status: VerificationStatus.Pending,
        }));
      });

      onGeneratingProof(() => {
        setTherapistState((prev) => ({
          ...prev,
          status: VerificationStatus.Pending,
        }));
      });

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      onResult((response: any) => {
        if (response.verified && response.uniqueIdentifier) {
          setTherapistState({
            status: VerificationStatus.Verified,
            uniqueId: response.uniqueIdentifier,
          });
          setTherapistQrCode(null);
        } else {
          setTherapistState({
            status: VerificationStatus.Failed,
            error: "Identity verification failed",
          });
        }
      });

      onReject(() => {
        setTherapistState({
          status: VerificationStatus.Failed,
          error: "Verification rejected by user",
        });
        setTherapistQrCode(null);
      });

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      onError((error: any) => {
        setTherapistState({
          status: VerificationStatus.Failed,
          error: error?.message || "Verification error",
        });
        setTherapistQrCode(null);
      });
    } catch (error) {
      setTherapistState({
        status: VerificationStatus.Failed,
        error: error instanceof Error ? error.message : "Unknown error",
      });
      setTherapistQrCode(null);
    }
  }, []);

  const skipPatientVerification = useCallback(() => {
    const mockId = `skip-patient-${Date.now().toString(16)}`;
    setPatientState({
      status: VerificationStatus.Verified,
      uniqueId: mockId,
      isOver18: true,
    });
    setPatientQrCode(null);
  }, []);

  const skipTherapistVerification = useCallback(() => {
    const mockId = `skip-therapist-${Date.now().toString(16)}`;
    setTherapistState({
      status: VerificationStatus.Verified,
      uniqueId: mockId,
    });
    setTherapistQrCode(null);
  }, []);

  const resetVerification = useCallback(() => {
    setPatientState({ status: VerificationStatus.Unverified });
    setTherapistState({ status: VerificationStatus.Unverified });
    setPatientQrCode(null);
    setTherapistQrCode(null);
  }, []);

  return {
    patientState,
    therapistState,
    patientQrCode,
    therapistQrCode,
    verifyPatient,
    verifyTherapist,
    skipPatientVerification,
    skipTherapistVerification,
    resetVerification,
  };
}
