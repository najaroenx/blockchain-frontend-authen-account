"use client";

import { useEffect, useRef } from "react";

interface InputOTPProps {
  value: string;
  onChange: (value: string) => void;
  length?: number;
  autoFocus?: boolean;
}

const InputOTP = ({
  value,
  onChange,
  length = 6,
  autoFocus = false,
}: InputOTPProps) => {
  const inputs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    if (autoFocus) {
      inputs.current[0]?.focus();
    }
  }, [autoFocus]);

  const processInput = (
    e: React.ChangeEvent<HTMLInputElement>,
    idx: number
  ) => {
    const val = e.target.value;
    if (/[^0-9]/.test(val)) return;

    if (val.length > 1) {
      // Handles paste
      const chars = val.slice(0, length).split("");
      onChange(chars.join(""));
      inputs.current[Math.min(chars.length, length - 1)]?.focus();
      return;
    }

    const newValue = value.split("");
    newValue[idx] = val;
    onChange(newValue.join("").slice(0, length));

    if (val && idx < length - 1) {
      inputs.current[idx + 1]?.focus();
    }
  };

  const handleKeyDown = (
    e: React.KeyboardEvent<HTMLInputElement>,
    idx: number
  ) => {
    if (e.key !== "Backspace") return;

    const newValue = value.split("");
    if (!value[idx] && idx > 0) {
      newValue[idx - 1] = "";
      onChange(newValue.join(""));
      inputs.current[idx - 1]?.focus();
    } else {
      newValue[idx] = "";
      onChange(newValue.join(""));
    }
  };

  return (
    <div className="flex gap-3 justify-center">
      {Array.from({ length }).map((_, idx) => (
        <div
          key={idx}
          className="relative w-6 h-6 flex items-center justify-center"
        >
          <input
            ref={(el) => {
              inputs.current[idx] = el;
            }}
            type="tel"
            inputMode="numeric"
            maxLength={1}
            value={value[idx] || ""}
            onChange={(e) => processInput(e, idx)}
            onKeyDown={(e) => handleKeyDown(e, idx)}
            className="absolute inset-0 w-full h-full text-center text-md font-semibold text-gray-700 bg-transparent border-none outline-none z-10 focus:ring-0"
          />
          <div
            className={`absolute inset-0 rounded-full transition-colors pointer-events-none ${
              value[idx] ? "bg-transparent border-2" : "bg-[#D9D9D9]"
            }`}
          />
        </div>
      ))}
    </div>
  );
};

export default InputOTP;
