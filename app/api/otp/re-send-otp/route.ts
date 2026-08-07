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
    const { requestId } = body;

    if (!requestId) {
      return handleError("กรุณาระบุ requestId", 400);
    }

    const response = await api(`${BACKEND_URL}/templink/resend-otp`, {
      method: "POST",
      body: { requestId },
    });

    if (response.status === "error" || response.statusCode === 404) {
      logger.error(`Resend OTP failed: ${JSON.stringify(response)}`);
      return handleError("เกิดข้อผิดพลาดในการส่ง OTP อีกครั้ง", 400);
    }

    return NextResponse.json(
      { message: "ส่ง OTP อีกครั้งสำเร็จ", otp: response.otp },
      { status: 200 }
    );
  } catch (error) {
    logger.error(`Error resending OTP: ${error instanceof Error ? error.message : error}`);
    return handleError("เกิดข้อผิดพลาดในการประมวลผล", 500);
  }
}
