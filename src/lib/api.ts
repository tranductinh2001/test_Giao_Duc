export function getErrorMessage(error: unknown) {
  if (error instanceof Error) {
    // Transaction timeout error
    if (error.message.includes("Unable to start a transaction")) {
      return "Hệ thống đang quá tải, vui lòng thử lại sau ít phút.";
    }
    // Connection timeout
    if (error.message.includes("timeout") || error.message.includes("timed out")) {
      return "Kết nối đến máy chủ bị gián đoạn, vui lòng kiểm tra mạng và thử lại.";
    }
    // Connection error
    if (error.message.includes("connect") || error.message.includes("ECONNREFUSED")) {
      return "Không thể kết nối đến cơ sở dữ liệu, vui lòng thử lại sau.";
    }
    // Known business errors
    if (["ATTEMPT_NOT_FOUND", "FORBIDDEN", "ALREADY_SUBMITTED", "EXAM_NOT_FOUND"].includes(error.message)) {
      return error.message;
    }
    return error.message;
  }
  return "Đã xảy ra lỗi không xác định, vui lòng thử lại.";
}

export function getErrorCode(error: unknown) {
  return error instanceof Error ? error.message : "INTERNAL_SERVER_ERROR";
}
