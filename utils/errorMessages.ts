/**
 * Maps technical error messages to user-friendly messages
 * Keep technical errors in console logs, show friendly messages to users
 */

export type ErrorSeverity = "error" | "warning" | "info";

export interface FriendlyError {
  message: string;
  title?: string;
  severity: ErrorSeverity;
  details?: string; // For console logging only
}

/**
 * Convert technical database/API errors to user-friendly messages
 */
export function getUserFriendlyError(
  error: unknown,
  context?: string,
): FriendlyError {
  const errorStr = String(error);

  // Database constraint errors
  if (errorStr.includes("foreign key constraint")) {
    return {
      title: "Invalid Reference",
      message:
        "One of the selected items does not exist. Please refresh and try again.",
      severity: "error",
      details: errorStr,
    };
  }

  if (errorStr.includes("warehouse_id") || errorStr.includes("warehouse")) {
    return {
      title: "Warehouse Error",
      message:
        "The selected warehouse is invalid or does not exist. Please select a valid warehouse.",
      severity: "error",
      details: errorStr,
    };
  }

  if (errorStr.includes("client_id") || errorStr.includes("client")) {
    return {
      title: "Client Error",
      message:
        "The selected client is invalid or does not exist. Please select a valid client.",
      severity: "error",
      details: errorStr,
    };
  }

  if (errorStr.includes("staff_id") || errorStr.includes("staff")) {
    return {
      title: "Staff Error",
      message:
        "The selected staff member is invalid or does not exist. Please select a valid staff member.",
      severity: "error",
      details: errorStr,
    };
  }

  if (
    errorStr.includes("unique constraint") ||
    errorStr.includes("duplicate")
  ) {
    return {
      title: "Duplicate Entry",
      message:
        "This item already exists. Please check your entries and try again.",
      severity: "error",
      details: errorStr,
    };
  }

  // Network/timeout errors
  if (
    errorStr.includes("Failed to fetch") ||
    errorStr.includes("Network") ||
    errorStr.includes("timeout")
  ) {
    return {
      title: "Connection Error",
      message:
        "Unable to connect to the server. Please check your internet connection and try again.",
      severity: "error",
      details: errorStr,
    };
  }

  // Validation errors
  if (errorStr.includes("Validation failed") || errorStr.includes("required")) {
    return {
      title: "Missing Information",
      message: "Please fill in all required fields and try again.",
      severity: "error",
      details: errorStr,
    };
  }

  // Generic cases
  if (context === "inventory") {
    return {
      title: "Inventory Error",
      message:
        "Failed to save inventory item. Please check your entries and try again.",
      severity: "error",
      details: errorStr,
    };
  }

  if (context === "warehouse") {
    return {
      title: "Warehouse Error",
      message:
        "Failed to load warehouses. Please refresh the page and try again.",
      severity: "error",
      details: errorStr,
    };
  }

  // Default fallback
  return {
    title: "Something Went Wrong",
    message: "An unexpected error occurred. Please try again later.",
    severity: "error",
    details: errorStr,
  };
}

/**
 * Log technical error details to console (dev debugging)
 */
export function logTechnicalError(error: unknown, context: string) {
  console.error(`[${context}]`, error);
}
