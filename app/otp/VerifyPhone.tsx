"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Noto_Sans_Thai } from "next/font/google";
import { Status, useVerifyPhone } from "@/contexts/VerifyPhoneContext";
import { apiUrl } from "@/libs/api";
import PinPhoneNumber from "./PinPhoneNumber";
import PinOTP from "./PinOTP";
import VerifyPhoneSuccess from "./VerifyPhoneSuccess";

const notoSansThai = Noto_Sans_Thai({
  subsets: ["thai", "latin"],
  weight: ["100", "200", "300", "400", "500", "600", "700", "800", "900"],
  display: "swap",
});

export enum VerifyPhoneStep {
  PIN_PHONE_NUMBER,
  PIN_OTP,
  SUCCESS,
}

// NOTE: this component must be rendered inside a <VerifyPhoneProvider> (see
// page.tsx) — it only reads/writes context, it doesn't create it.
const VerifyPhoneComponent = () => {
  const searchParams = useSearchParams();
  const requestId = searchParams.get("requestid");
  const merchantId = searchParams.get("merchantId");
  const callbackUri = searchParams.get("callbackUri");

  const { status, setStatus, setCallbackUri, setMerchantId } =
    useVerifyPhone();

  const [step, setStep] = useState<VerifyPhoneStep>(
    VerifyPhoneStep.PIN_PHONE_NUMBER
  );

  const onChangeStep = (newStep: VerifyPhoneStep) => {
    setStep(newStep);
  };

  useEffect(() => {
    if (!requestId) {
      setStatus(Status.INVALID);
      return;
    }

    const verifyRequest = async () => {
      try {
        // TODO: confirm this endpoint exists on the backend. It's only used
        // here to validate the request id/merchant id before showing the
        // form, so the response body itself is currently unused.
        const response = await fetch(
          apiUrl(
            `/api/otp/request?requestid=${requestId}&merchantid=${merchantId}`
          )
        );
        if (!response.ok) {
          throw new Error("Failed to verify request ID");
        }
        setCallbackUri(callbackUri);
        setMerchantId(merchantId);
        setStatus(Status.READY);
      } catch (error) {
        console.error("Error verifying request ID:", error);
        setStatus(Status.INVALID);
      }
    };

    verifyRequest();
  }, [requestId, merchantId, callbackUri, setStatus, setCallbackUri, setMerchantId]);

  const renderStep = () => {
    switch (step) {
      case VerifyPhoneStep.PIN_PHONE_NUMBER:
        return <PinPhoneNumber onChangeStep={onChangeStep} />;
      case VerifyPhoneStep.PIN_OTP:
        return <PinOTP onChangeStep={onChangeStep} />;
      case VerifyPhoneStep.SUCCESS:
        return <VerifyPhoneSuccess onChangeStep={onChangeStep} />;
      default:
        return null;
    }
  };

  if (status === Status.INITIALIZING) {
    return (
      <div
        className={`flex flex-col items-center justify-center h-screen bg-white ${notoSansThai.className}`}
      >
        <div className="w-8 h-8 border-4 border-green-500 border-t-transparent rounded-full animate-spin mb-4" />
        <div className="text-gray-600 font-semibold animate-pulse">
          กำลังโหลด...
        </div>
      </div>
    );
  }

  if (status === Status.INVALID) {
    return (
      <div
        className={`flex items-center justify-center h-screen bg-white ${notoSansThai.className}`}
      >
        <div className="text-center text-gray-600 font-semibold">
          หน้านี้ยังไม่พร้อมใช้งาน หรือ ลิงก์หมดอายุ
        </div>
      </div>
    );
  }

  return <div className={notoSansThai.className}>{renderStep()}</div>;
};

export default VerifyPhoneComponent;
