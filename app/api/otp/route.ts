import { api } from "@/libs/api";
import { handleError } from "@/libs/errorHandler";
import logger from "@/libs/logger";

// TODO: confirm this against the real merchant backend deployment. Falls
// back to a local dev backend so this at least fails predictably.
const BACKEND_URL = process.env.MERCHANT_BACKEND || "http://localhost:4000";

export async function POST(req: Request) {
  logger.info(`Received request: ${req.method} ${req.url}`);

  try {
    const body = await req.json();

    const response = await api(`${BACKEND_URL}/auth/register`, {
      method: "POST",
      body,
    });

    // Never pass `response.message` straight through to the client — on a
    // network failure it's `api()`'s raw internal error text (e.g. "fetch
    // failed"), not something meant to be user-facing. Same rule the other
    // otp routes follow.
    if (response.status === "error") {
      logger.error(`Register request failed: ${JSON.stringify(response)}`);
      return handleError("เกิดข้อผิดพลาดในการลงทะเบียน", 500);
    }

    const statusCode = response.statusCode ?? 200;
    if (statusCode >= 400) {
      logger.error(`Register request rejected: ${JSON.stringify(response)}`);
      return handleError("เกิดข้อผิดพลาดในการลงทะเบียน", statusCode);
    }

    return Response.json({ message: "success" }, { status: 201 });
  } catch (error) {
    logger.error(`Error occurred: ${error instanceof Error ? error.message : error}`);
    return handleError("เกิดข้อผิดพลาดในการประมวลผล", 500);
  }
}
