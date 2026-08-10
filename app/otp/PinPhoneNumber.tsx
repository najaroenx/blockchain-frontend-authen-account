"use client";

import { useState } from "react";
import Image from "next/image";
import { useSearchParams } from "next/navigation";
import { VerifyPhoneStep } from "./VerifyPhone";
import { useVerifyPhone } from "@/contexts/VerifyPhoneContext";
import { apiUrl } from "@/libs/api";
import InputOTP from "./InputOTP";

const PinPhoneNumber = ({
  onChangeStep,
}: {
  onChangeStep: (step: VerifyPhoneStep) => void;
}) => {
  const searchParams = useSearchParams();
  const requestId = searchParams.get("requestid");
  const merchantId = searchParams.get("merchantId");

  const { setPhoneNumber, setToken, setTempOtp } = useVerifyPhone();

  const [phoneNumberInput, setPhoneNumberInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handlePhoneNumberChange = (value: string) => {
    if (value === "" || value.startsWith("0")) {
      setPhoneNumberInput(value);
      setError(null);
    } else {
      setError("เบอร์โทรศัพท์ต้องเริ่มต้นด้วย 0");
    }
  };

  const handleRequestOTP = async () => {
    if (phoneNumberInput.length !== 10 || !phoneNumberInput.startsWith("0")) {
      setError("กรุณาใส่เบอร์โทรศัพท์ให้ครบ 10 หลัก");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch(apiUrl("/api/otp/request"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          phoneNumber: phoneNumberInput,
          merchantId,
          requestId,
        }),
      });

      const data = await response.json();
      if (response.ok) {
        setPhoneNumber(phoneNumberInput);
        setToken(data.token || data.verificationId);
        // TODO: confirm the backend never echoes the real OTP back in
        // production responses — `tempOtp` exists purely to make manual
        // testing easier against a sandbox backend.
        setTempOtp(data.otp || null);
        onChangeStep(VerifyPhoneStep.PIN_OTP);
      } else {
        setError(data.message || "เกิดข้อผิดพลาดในการร้องขอ OTP");
      }
    } catch (err) {
      console.error("OTP Request Error:", err);
      setError(
        err instanceof Error ? err.message : "เกิดข้อผิดพลาดในการส่ง OTP"
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white w-full h-screen flex flex-col items-center p-4 relative">
      {/* Close button */}
      {/* TODO: decide what closing this flow should do (e.g. router.back(),
          or redirect to callbackUri with a "cancelled" flag) and wire it up. */}
      <div className="w-full flex justify-end mt-2">
        <button
          type="button"
          aria-label="ปิด"
          className="w-6 h-6 flex items-center justify-center"
        >
          <svg
            className="w-5 h-5 text-gray-600"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        </button>
      </div>

      {/* Image */}
      <div className="relative w-[180px] h-[180px] mt-8">
        <Image
          src="/images/fill-phone-number.png"
          alt="กรอกหมายเลขโทรศัพท์"
          fill
          className="object-cover"
          priority
        />
      </div>

      {/* Title and Input */}
      <div className="mt-12 flex flex-col items-center gap-6">
        <div className="text-lg text-gray-900 font-semibold text-center">
          ใส่หมายเลขโทรศัพท์ของคุณ
        </div>

        <div className="flex flex-col items-center gap-2 w-full">
          <div className="flex flex-rows gap-3 justify-center w-full items-center">
            <InputOTP
              value={phoneNumberInput}
              onChange={handlePhoneNumberChange}
              length={10}
              autoFocus
            />
            {/* Green checkmark when phone number is complete */}
            {phoneNumberInput.length === 10 &&
              phoneNumberInput.startsWith("0") && (
                <svg
                  className="w-6 h-6 text-green-500 flex-shrink-0"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={3}
                    d="M5 13l4 4L19 7"
                  />
                </svg>
              )}
          </div>

          {error && (
            <div className="text-red-500 text-sm font-semibold text-center">
              {error}
            </div>
          )}
        </div>
      </div>

      {/* Fixed button at bottom — the button label/shape is baked into the
          image asset itself (public/images/fill-phone-button.png). */}
      <div className="fixed bottom-0 left-0 right-0 flex justify-center mb-6 px-4">
        <button
          type="button"
          onClick={handleRequestOTP}
          disabled={loading || phoneNumberInput.length !== 10}
          className={`relative w-full max-w-[327px] h-[56px] rounded-xl overflow-hidden transition-opacity ${
            loading || phoneNumberInput.length !== 10
              ? "opacity-40 cursor-not-allowed"
              : ""
          }`}
        >
          <Image
            src="/images/fill-phone-button.png"
            alt="รับรหัส OTP"
            fill
            className="object-cover"
          />
          {loading && (
            <span className="absolute inset-0 flex items-center justify-center bg-black/10 text-white text-base font-semibold">
              กำลังส่ง...
            </span>
          )}
        </button>
      </div>
    </div>
  );
};

export default PinPhoneNumber;
