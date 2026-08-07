import { NextRequest, NextResponse } from "next/server";
import { api } from "@/libs/api";
import { handleError } from "@/libs/errorHandler";
import logger from "@/libs/logger";

// TODO: confirm this against the real merchant backend deployment. Falls
// back to a local dev backend so this at least fails predictably.
const BACKEND_URL = process.env.MERCHANT_BACKEND || "http://localhost:4000";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { phoneNumber, requestId, merchantId } = body;

    if (!phoneNumber || phoneNumber.length !== 10) {
      return handleError("หมายเลขโทรศัพท์ไม่ถูกต้อง", 400);
    }

    // TODO: decide whether re-requesting an OTP for a phone number that
    // already has an account should be blocked here, or left to the
    // verify step. Deferred for now — always sends a fresh OTP.
    const response = await api(`${BACKEND_URL}/templink/send-otp`, {
      method: "POST",
      body: { requestId, phoneNumber, merchantId },
    });

    if (response.status === "error" || response.statusCode === 404) {
      logger.error(`OTP request failed: ${JSON.stringify(response)}`);
      return handleError("เกิดข้อผิดพลาดในการส่ง OTP", 500);
    }

    return NextResponse.json(
      {
        message: "สามารถลงทะเบียนใหม่ได้",
        otp: response.otp,
        verificationId: response.verificationId,
      },
      { status: 200 }
    );
  } catch (error) {
    logger.error(`Error processing phone number: ${error instanceof Error ? error.message : error}`);
    return handleError("เกิดข้อผิดพลาดในการประมวลผล", 500);
  }
}

// The single endpoint for looking up a requestId (previously duplicated,
// with inconsistent assumed response shapes, across uid/route.ts and
// verify-request-id/route.ts — both deleted in favor of this one).
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const requestId = searchParams.get("requestid");

    if (!requestId) {
      return handleError("RequestId is required", 400);
    }

    const response = await api(`${BACKEND_URL}/templink/${requestId}`, {
      method: "GET",
    });

    if (response.status === "error") {
      logger.error(`Failed to reach backend for GET /api/otp/request: ${JSON.stringify(response)}`);
      return handleError("เกิดข้อผิดพลาดในการประมวลผล", 500);
    }

    if (response.statusCode === 404 || response.statusCode === 400) {
      return handleError("Invalid RequestId", 404);
    }

    const { uid, phoneNumber, expire, merchantId } = response;

    const expireTime = new Date(expire as string).getTime();
    if (Number.isNaN(expireTime) || expireTime < Date.now()) {
      return handleError("RequestId has expired", 400);
    }

    return NextResponse.json(
      { message: "RequestId is valid", uid, phoneNumber, merchantId, expire },
      { status: 200 }
    );
  } catch (error) {
    logger.error(`Error processing GET request: ${error instanceof Error ? error.message : error}`);
    return handleError("เกิดข้อผิดพลาดในการประมวลผล", 500);
  }
}
