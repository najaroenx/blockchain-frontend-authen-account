"use client";

import { useVerifyPhone } from "@/contexts/VerifyPhoneContext";
import { VerifyPhoneStep } from "./VerifyPhone";

const VerifyPhoneSuccess = ({
  onChangeStep: _onChangeStep,
}: {
  onChangeStep: (step: VerifyPhoneStep) => void;
}) => {
  // `callbackUri` comes from context (set once, from the initial search
  // params, by VerifyPhone.tsx) rather than re-reading useSearchParams here,
  // so there's a single source of truth for it across steps.
  const { phoneNumber, callbackUri } = useVerifyPhone();

  const handleBackToMain = () => {
    if (!callbackUri) return;
    const separator = callbackUri.includes("?") ? "&" : "?";
    const redirectUrl = `${callbackUri}${separator}phoneNumber=${encodeURIComponent(
      phoneNumber || ""
    )}`;
    window.location.assign(redirectUrl);
  };

  return (
    <div className="bg-white w-full h-screen flex flex-col items-center p-4 relative">
      {/* Close button */}
      {/* TODO: decide what closing this flow should do and wire it up. */}
      <div className="w-full flex justify-end mt-2">
        <button
          type="button"
          className="w-6 h-6 flex items-center justify-center"
          aria-label="ปิด"
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

      {/* Success Icon */}
      <div className="flex-1 flex flex-col items-center justify-center">
        <div className="relative w-32 h-32 mb-8">
          <div className="absolute inset-0 bg-gradient-to-br from-green-400 to-teal-500 rounded-full flex items-center justify-center">
            <svg
              className="w-16 h-16 text-white"
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
          </div>
        </div>

        {/* Success Text */}
        <div className="text-center">
          <h1 className="text-2xl font-semibold text-gray-900 mb-2">
            ยืนยันตัวตน
          </h1>
          <h2 className="text-2xl font-semibold text-gray-900">สำเร็จแล้ว</h2>
        </div>
      </div>

      {/* Fixed button at bottom */}
      <div className="fixed bottom-0 left-0 right-0 flex justify-center mb-6 px-4">
        <button
          onClick={handleBackToMain}
          disabled={!callbackUri}
          className={`w-full max-w-[327px] h-[56px] text-white text-base font-semibold rounded-xl flex items-center justify-center gap-2 ${
            callbackUri ? "bg-[#16C23C]" : "bg-gray-400 cursor-not-allowed"
          }`}
        >
          กลับไปหน้าหลัก
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
        </button>
      </div>
    </div>
  );
};

export default VerifyPhoneSuccess;
