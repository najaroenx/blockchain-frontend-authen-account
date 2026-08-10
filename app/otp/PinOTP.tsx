"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Noto_Sans_Thai } from "next/font/google";
import { VerifyPhoneStep } from "./VerifyPhone";
import { useVerifyPhone } from "@/contexts/VerifyPhoneContext";
import { apiUrl } from "@/libs/api";
import InputOTP from "./InputOTP";

const notoSansThai = Noto_Sans_Thai({
  subsets: ["thai", "latin"],
  weight: ["100", "200", "300", "400", "500", "600", "700", "800", "900"],
  display: "swap",
});

// TODO: remove this bypass entirely once the OTP flow is confirmed to work
// end-to-end against the real backend. Gated by NODE_ENV so a stray env var
// can never enable it in a production build.
const SKIP_OTP_VERIFICATION =
  process.env.NODE_ENV !== "production" &&
  process.env.NEXT_PUBLIC_SKIP_OTP_VERIFICATION === "true";

const OTP_TIMEOUT_SECONDS = 120; // 2 minutes

const formatTime = (seconds: number) => {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return {
    min: String(m).padStart(2, "0"),
    sec: String(s).padStart(2, "0"),
  };
};

// Plain Tailwind modal — @headlessui/react is not a project dependency, so
// the original Dialog-based implementation could never actually build.
const TermsModal = ({
  isOpen,
  onClose,
}: {
  isOpen: boolean;
  onClose: () => void;
}) => {
  if (!isOpen) return null;

  return (
    <div className={`fixed inset-0 z-50 ${notoSansThai.className}`}>
      <div
        className="fixed inset-0 bg-black/30"
        onClick={onClose}
        aria-hidden="true"
      />
      <div className="fixed inset-0 flex items-center justify-center py-[15px] px-4">
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="terms-modal-title"
          className="w-full max-w-md h-[calc(100vh-30px)] rounded-2xl bg-white shadow-xl flex flex-col"
        >
          {/* Close Button */}
          <div className="flex justify-end pt-4 pr-4 flex-shrink-0">
            <button
              type="button"
              onClick={onClose}
              aria-label="ปิด"
              className="text-gray-600 hover:text-gray-900 transition-colors"
            >
              <svg
                className="w-6 h-6"
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

          <div className="px-6 pb-6 flex-1 flex flex-col overflow-hidden">
            <h2
              id="terms-modal-title"
              className="text-xl font-bold text-gray-900 mb-4 text-center flex-shrink-0"
            >
              ข้อตกลงการใช้งาน
            </h2>
            <div className="flex-1 overflow-y-auto overflow-x-hidden px-2">
              <div className="space-y-4 text-left">
                <h3 className="text-lg font-bold text-gray-900">
                  ข้อตกลงการยืนยันตัวตนด้วยรหัส OTP
                </h3>
                <p className="text-sm text-gray-600">
                  เพื่อความปลอดภัยในการสร้างกระเป๋าเงินและยืนยันตัวตนของคุณ
                </p>
                <div className="space-y-4">
                  <h4 className="text-base font-bold text-gray-900">
                    1. การใช้หมายเลขโทรศัพท์ของคุณ
                  </h4>
                  <ul className="list-disc list-inside space-y-2 text-sm text-gray-600 pl-2">
                    <li>
                      คุณยืนยันว่าหมายเลขโทรศัพท์ที่กรอกเป็นเบอร์ที่คุณใช้งานจริง
                    </li>
                    <li>
                      คุณยินยอมให้เราใช้หมายเลขโทรศัพท์นี้เพื่อยืนยันตัวตน
                    </li>
                  </ul>
                  <h4 className="text-base font-bold text-gray-900">
                    2. ความปลอดภัย
                  </h4>
                  <ul className="list-disc list-inside space-y-2 text-sm text-gray-600 pl-2">
                    <li>ห้ามบอกรหัส OTP ให้ผู้อื่นเด็ดขาด</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const PinOTP = ({
  onChangeStep,
}: {
  onChangeStep: (step: VerifyPhoneStep) => void;
}) => {
  const {
    phoneNumber,
    token,
    setOtpCode,
    setToken: updateToken,
    merchantId,
    tempOtp,
    setTempOtp,
  } = useVerifyPhone();

  const searchParams = useSearchParams();
  const requestId = searchParams.get("requestid");
  // Named distinctly from context's `merchantId` (the value confirmed by
  // the initial request-id check) to avoid the two silently colliding.
  const merchantIdParam = searchParams.get("merchantId");

  const [timeLeft, setTimeLeft] = useState(OTP_TIMEOUT_SECONDS);
  const [verifyOtp, setVerifyOtp] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isVerificationSuccess, setIsVerificationSuccess] = useState(false);
  const [isTermsOpen, setIsTermsOpen] = useState(false);

  const isExpired = timeLeft <= 0;
  const { min, sec } = formatTime(Math.max(0, timeLeft));
  const canSubmit =
    verifyOtp.length === 6 && !loading && !isExpired && !isVerificationSuccess;

  useEffect(() => {
    if (timeLeft <= 0) return;

    const timerId = setInterval(() => {
      setTimeLeft((prev) => Math.max(0, prev - 1));
    }, 1000);

    return () => clearInterval(timerId);
  }, [timeLeft]);

  const submitVerifyOTP = useCallback(
    async (otpCode: string) => {
      setLoading(true);
      setError(null);

      try {
        const response = await fetch(apiUrl("/api/otp/verify"), {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            phoneNumber,
            otpCode,
            token,
            merchantId: merchantId || merchantIdParam,
          }),
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.message || "Error");

        setOtpCode(otpCode);
        if (data.token) updateToken(data.token);
        setIsVerificationSuccess(true);
        setTimeout(() => onChangeStep(VerifyPhoneStep.SUCCESS), 2000);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Verification Failed");
      } finally {
        setLoading(false);
      }
    },
    [phoneNumber, token, merchantId, merchantIdParam, setOtpCode, updateToken, onChangeStep]
  );

  const handleVerifyOTP = async () => {
    if (!canSubmit) return;
    await submitVerifyOTP(verifyOtp);
  };

  // Temporary: auto-verify on mount without rendering the OTP form.
  const autoVerifyStarted = useRef(false);
  useEffect(() => {
    if (!SKIP_OTP_VERIFICATION) return;
    if (autoVerifyStarted.current) return;
    autoVerifyStarted.current = true;
    submitVerifyOTP("000000");
  }, [submitVerifyOTP]);

  const handleResendOTP = useCallback(async () => {
    setTimeLeft(OTP_TIMEOUT_SECONDS);
    setVerifyOtp("");
    setError(null);
    setIsVerificationSuccess(false);
    setTempOtp(null); // Clear the temporary OTP when resending

    try {
      const response = await fetch(apiUrl("/api/otp/re-send-otp"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          phoneNumber,
          requestId,
          merchantId: merchantIdParam,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Failed to resend OTP");
      }
      setTempOtp(data.otp || null);
    } catch (error) {
      console.error("Error resending OTP:", error);
      setError(
        error instanceof Error
          ? error.message
          : "เกิดข้อผิดพลาดในการส่ง OTP อีกครั้ง"
      );
    }
  }, [phoneNumber, requestId, merchantIdParam, setTempOtp]);

  // Temporary: show a loading screen instead of the OTP form while auto-verifying.
  if (SKIP_OTP_VERIFICATION) {
    return (
      <div
        className={`bg-white w-full h-full min-h-screen flex flex-col items-center justify-center p-6 ${notoSansThai.className}`}
      >
        {error ? (
          <p className="text-red-500 font-semibold text-sm text-center">
            {error}
          </p>
        ) : (
          <>
            <div className="w-10 h-10 border-4 border-gray-200 border-t-[#16C23C] rounded-full animate-spin" />
            <p className="mt-4 text-sm text-gray-600">กำลังตรวจสอบ...</p>
          </>
        )}
      </div>
    );
  }

  return (
    <>
      <div
        className={`bg-white w-full h-full min-h-screen flex flex-col items-center p-6 relative ${notoSansThai.className}`}
      >
        {/* Header / Close Button */}
        {/* TODO: decide what closing this flow should do and wire it up. */}
        <div className="w-full flex justify-end">
          <button
            type="button"
            aria-label="ปิด"
            className="w-8 h-8 flex items-center justify-center hover:bg-gray-100 rounded-full transition-colors"
          >
            <svg
              className="w-6 h-6 text-gray-600"
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

        {/* Title Section */}
        <div className="mt-8 text-center px-4">
          <h1 className="text-2xl text-gray-900 font-bold mb-6">
            ยืนยันรหัส OTP
          </h1>
          <p className="text-sm text-gray-600 mb-2">กรุณาใส่รหัส OTP</p>
          <p className="text-sm text-gray-600 mb-3">
            ที่ส่งไปยังหมายเลขโทรศัพท์ {phoneNumber}
          </p>
          {/* TODO: this reference code is hardcoded — replace with the real
              reference code from the OTP request response once the backend
              returns one, and un-hide it. */}
          <p className="hidden text-sm text-gray-900 font-semibold">
            รหัสอ้างอิง: TEST001
          </p>
        </div>

        {/* Timer UI */}
        <div className="flex items-center gap-2 mt-8">
          <TimeBox value={min} />
          <span className="text-3xl font-semibold text-gray-400 pb-1">:</span>
          <TimeBox value={sec} />
        </div>
        {/* tempOtp Text (sandbox/testing aid only) */}
        <div className="mt-3 text-center h-5">
          {tempOtp && <span className="text-xs animate-pulse">{tempOtp}</span>}
        </div>
        {/* Expiration Text */}
        <div className="mt-3 text-center h-5">
          {isExpired && (
            <span className="text-xs text-red-500 animate-pulse">
              รหัส OTP หมดอายุ
            </span>
          )}
        </div>

        {/* OTP Input */}
        <div className="mt-8 w-full px-4">
          <InputOTP
            value={verifyOtp}
            onChange={setVerifyOtp}
            length={6}
            autoFocus
          />
        </div>

        {/* Error Feedback */}
        <div className="h-10 mt-4 text-center px-6">
          {error && (
            <p className="text-red-500 font-semibold text-sm">{error}</p>
          )}
        </div>

        {/* Resend Section */}
        <div className="mt-2 text-center space-y-2">
          <p className="text-sm text-gray-500">
            {isExpired ? "กรุณากดเพื่อขอรหัสใหม่" : "หากไม่ได้รับรหัส?"}
          </p>
          <button
            type="button"
            onClick={handleResendOTP}
            disabled={!isExpired && timeLeft > 0}
            className={`text-base font-semibold transition-colors ${
              isExpired
                ? "text-blue-500 hover:text-blue-600 cursor-pointer hover:underline"
                : "text-gray-400 cursor-not-allowed"
            }`}
          >
            ขอรหัส OTP ใหม่
          </button>
        </div>
        {/* TODO: confirm the actual support channel copy — "Microsoft Teams
            กลุ่มสีของท่าน" reads like placeholder text from another project. */}
        <div className="text-center text-sm text-gray-500">
          หากมีข้อสงสัยหรือติดปัญหา สามารถแจ้งได้ผ่าน Microsoft Teams
          กลุ่มสีของท่าน
        </div>

        <div className="flex-grow" />

        {/* Terms Link */}
        <div className="px-6 text-center mb-5">
          <p className="text-xs text-gray-600">
            เมื่อคุณได้กด &ldquo;ยืนยันรหัส OTP&rdquo; ถือว่าคุณได้ยอมรับ{" "}
            <button
              type="button"
              onClick={() => setIsTermsOpen(true)}
              className="text-blue-500 font-semibold cursor-pointer hover:underline inline-block"
            >
              ข้อตกลงการใช้งาน
            </button>
          </p>
        </div>

        {/* Action Button */}
        <div className="w-full px-6 pb-6">
          <button
            onClick={handleVerifyOTP}
            disabled={!canSubmit}
            className={`w-full h-[56px] text-white text-base font-semibold rounded-xl flex items-center justify-center gap-2 transition-all duration-200 ${
              !canSubmit
                ? "bg-gray-300 cursor-not-allowed"
                : "bg-[#16C23C] hover:bg-[#14AF37] shadow-lg hover:shadow-xl active:scale-[0.98]"
            }`}
          >
            {loading ? "กำลังตรวจสอบ..." : "ยืนยันรหัส OTP"}
            {!loading && (
              <svg
                className="w-5 h-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 5l7 7-7 7"
                />
              </svg>
            )}
          </button>
        </div>
      </div>

      <TermsModal isOpen={isTermsOpen} onClose={() => setIsTermsOpen(false)} />
    </>
  );
};

const TimeBox = ({ value }: { value: string }) => (
  <div className="bg-white border-2 border-[#E5E5E5] w-[60px] h-[60px] rounded-lg flex items-center justify-center shadow-sm">
    <span className="text-3xl font-semibold text-gray-900">{value}</span>
  </div>
);

export default PinOTP;
