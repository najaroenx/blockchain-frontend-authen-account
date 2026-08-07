"use client";

import {
  createContext,
  useContext,
  useState,
  type Dispatch,
  type ReactNode,
  type SetStateAction,
} from "react";

export enum Status {
  INITIALIZING = "INITIALIZING",
  READY = "READY",
  INVALID = "INVALID",
}

interface VerifyPhoneContextValue {
  status: Status;
  setStatus: Dispatch<SetStateAction<Status>>;
  phoneNumber: string | null;
  setPhoneNumber: Dispatch<SetStateAction<string | null>>;
  token: string | null;
  setToken: Dispatch<SetStateAction<string | null>>;
  otpCode: string | null;
  setOtpCode: Dispatch<SetStateAction<string | null>>;
  tempOtp: string | null;
  setTempOtp: Dispatch<SetStateAction<string | null>>;
  merchantId: string | null;
  setMerchantId: Dispatch<SetStateAction<string | null>>;
  callbackUri: string | null;
  setCallbackUri: Dispatch<SetStateAction<string | null>>;
}

const VerifyPhoneContext = createContext<VerifyPhoneContextValue | null>(
  null
);

export const VerifyPhoneProvider = ({ children }: { children: ReactNode }) => {
  const [status, setStatus] = useState<Status>(Status.INITIALIZING);
  const [phoneNumber, setPhoneNumber] = useState<string | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [otpCode, setOtpCode] = useState<string | null>(null);
  const [tempOtp, setTempOtp] = useState<string | null>(null);
  const [merchantId, setMerchantId] = useState<string | null>(null);
  const [callbackUri, setCallbackUri] = useState<string | null>(null);

  return (
    <VerifyPhoneContext.Provider
      value={{
        status,
        setStatus,
        phoneNumber,
        setPhoneNumber,
        token,
        setToken,
        otpCode,
        setOtpCode,
        tempOtp,
        setTempOtp,
        merchantId,
        setMerchantId,
        callbackUri,
        setCallbackUri,
      }}
    >
      {children}
    </VerifyPhoneContext.Provider>
  );
};

export const useVerifyPhone = () => {
  const context = useContext(VerifyPhoneContext);
  if (!context) {
    throw new Error("useVerifyPhone must be used within a VerifyPhoneProvider");
  }
  return context;
};
