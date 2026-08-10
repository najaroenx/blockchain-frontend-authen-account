import { NextRequest, NextResponse } from "next/server";
import { api } from "@/libs/api";
import { handleError } from "@/libs/errorHandler";
import logger from "@/libs/logger";

// TODO: confirm this against the real merchant backend deployment. Falls
// back to a local dev backend so this at least fails predictably.
const BACKEND_URL = process.env.MERCHANT_BACKEND || "http://localhost:4000";

interface VerifyOTPRequest {
  phoneNumber: string;
  merchantId: string;
  otpCode: string;
}

const generateRandomString = (length = 8): string => {
  const characters = "abcdefghijklmnopqrstuvwxyz0123456789";
  let result = "";
  for (let i = 0; i < length; i++) {
    result += characters.charAt(Math.floor(Math.random() * characters.length));
  }
  return result;
};

// TODO: this is a placeholder email so account creation doesn't require a
// real one — confirm with the backend team whether email is actually
// required, or if this field can be dropped/made optional.
const generateRandomEmail = (): string => `user${generateRandomString(5)}@example.com`;

// `api()` never throws — it reports a failed backend call through the same
// `status: "error"` shape as a well-formed 4xx response. These three calls
// must fail closed (surface an error) rather than silently treat "backend
// unreachable" as "OTP verified" / "customer exists", so each one re-throws
// on that shape and lets the POST handler's catch block turn it into a 500.
const checkCustomerExists = async (
  merchantId: string,
  phoneNumber: string
): Promise<boolean> => {
  const customer = await api(`${BACKEND_URL}/${merchantId}/customer/phone/${phoneNumber}`, {
    method: "GET",
  });
  if (customer.status === "error") {
    throw new Error(customer.message || "Failed to check customer existence");
  }
  return customer.statusCode !== 404 && customer.statusCode !== 400;
};

const verifyOTPCode = async (phoneNumber: string, otpCode: string) => {
  const result = await api(`${BACKEND_URL}/templink/verify-otp`, {
    method: "POST",
    body: { phoneNumber, otpCode },
  });
  if (result.status === "error") {
    throw new Error(result.message || "Failed to verify OTP");
  }
  return result;
};

const createNewCustomer = async (merchantId: string, phoneNumber: string) => {
  const result = await api(`${BACKEND_URL}/${merchantId}/customer`, {
    method: "POST",
    body: { tel: phoneNumber, email: generateRandomEmail() },
  });
  if (result.status === "error") {
    throw new Error(result.message || "Failed to create customer");
  }
  return result;
};

const successResponse = () =>
  NextResponse.json({ success: true, message: "ยืนยัน OTP สำเร็จ" });

export async function POST(request: NextRequest) {
  try {
    const body: VerifyOTPRequest = await request.json();
    const { phoneNumber, merchantId, otpCode } = body;

    // Step 1: verify the OTP (skipped only outside production, see
    // app/otp/PinOTP.tsx SKIP_OTP_VERIFICATION for the client side
    // of this same bypass).
    if (
      process.env.NODE_ENV !== "production" &&
      process.env.NEXT_PUBLIC_SKIP_OTP_VERIFICATION === "true"
    ) {
      logger.warn("OTP verification skipped (NEXT_PUBLIC_SKIP_OTP_VERIFICATION enabled)");
    } else {
      const otpVerifyResult = await verifyOTPCode(phoneNumber, otpCode);
      if (otpVerifyResult.statusCode === 400) {
        return handleError("รหัส OTP ไม่ถูกต้อง", 400);
      }
    }

    // Step 2: create the customer if they don't already exist.
    const customerExists = await checkCustomerExists(merchantId, phoneNumber);
    if (!customerExists) {
      await createNewCustomer(merchantId, phoneNumber);
    }

    return successResponse();
  } catch (error) {
    logger.error(`Error verifying OTP: ${error instanceof Error ? error.message : error}`);
    return handleError("เกิดข้อผิดพลาดในการยืนยัน OTP", 500);
  }
}
