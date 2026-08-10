import { NextRequest, NextResponse } from "next/server";
import { api } from "@/libs/api";
import { handleError } from "@/libs/errorHandler";
import logger from "@/libs/logger";

// TODO: confirm this against the real merchant backend deployment. Falls
// back to a local dev backend so this at least fails predictably.
const BACKEND_URL = process.env.MERCHANT_BACKEND || "http://localhost:4004";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { phoneNumber, requestId } = body;

    if (!phoneNumber || phoneNumber.length !== 10) {
      return handleError("หมายเลขโทรศัพท์ไม่ถูกต้อง", 400);
    }

    // TODO: decide whether re-requesting an OTP for a phone number that
    // already has an account should be blocked here, or left to the
    // verify step. Deferred for now — always sends a fresh OTP.
    //
    // Confirmed (2026-08-10, against a live backend) this endpoint rejects
    // unknown body properties outright (400: "property merchantId should
    // not exist") — merchantId isn't part of its schema, don't send it.
    const response = await api(`${BACKEND_URL}/templink/send-otp`, {
      method: "POST",
      body: { requestId, phoneNumber },
    });
    logger.info(`POST ${BACKEND_URL}/templink/send-otp -> ${JSON.stringify(response)}`);

    // Was only checking statusCode === 404 — a 400 (e.g. validation
    // rejection) fell through unnoticed and this handler returned a fake
    // "success" to the frontend even though no OTP was ever sent.
    const statusCode = response.statusCode ?? 200;
    if (response.status === "error" || statusCode >= 400) {
      logger.error(`OTP request failed: ${JSON.stringify(response)}`);
      return handleError("เกิดข้อผิดพลาดในการส่ง OTP", 500);
    }

    // Confirmed (2026-08-10, against a live backend) the payload is nested
    // under `data`, not flat — see the GET handler below for the same fix.
    const payload = response.data as
      | { otp?: string; verificationId?: string }
      | undefined;

    return NextResponse.json(
      {
        message: "สามารถลงทะเบียนใหม่ได้",
        otp: payload?.otp,
        verificationId: payload?.verificationId,
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
    logger.info(`GET ${BACKEND_URL}/templink/${requestId} -> ${JSON.stringify(response)}`);

    if (response.status === "error") {
      logger.error(`Failed to reach backend for GET /api/otp/request: ${JSON.stringify(response)}`);
      return handleError("เกิดข้อผิดพลาดในการประมวลผล", 500);
    }

    if (response.statusCode === 404 || response.statusCode === 400) {
      return handleError("Invalid RequestId", 404);
    }

    // Confirmed (2026-08-10, against a live backend) the payload is nested
    // under `data`, e.g. { statusCode, status, message, data: { uid, ... } }
    // — reading these straight off `response` was always undefined, which
    // made every valid, non-expired requestId look expired.
    const payload = response.data as
      | { uid?: string; phoneNumber?: string; expire?: string; merchantId?: string }
      | undefined;

    if (!payload) {
      return handleError("Invalid RequestId", 404);
    }

    const { uid, phoneNumber, expire, merchantId } = payload;

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
