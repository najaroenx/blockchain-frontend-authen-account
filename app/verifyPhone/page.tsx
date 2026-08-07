import { Suspense } from "react";
import { VerifyPhoneProvider } from "@/contexts/VerifyPhoneContext";
import VerifyPhoneComponent from "./VerifyPhone";

// TODO: fill in real metadata (title/description) once product copy is final.
export default function VerifyPhonePage() {
  return (
    <VerifyPhoneProvider>
      <Suspense fallback={null}>
        <VerifyPhoneComponent />
      </Suspense>
    </VerifyPhoneProvider>
  );
}
