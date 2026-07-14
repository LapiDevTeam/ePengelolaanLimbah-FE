import { showError } from "./sweetAlert";

export const showApiError = (errorData, fallbackMessage = "Terjadi kesalahan") => {
  const message = errorData?.message || fallbackMessage;

  if (errorData?.error_report_id) {
    return showError(
      `${message}\n\nLaporan otomatis sudah terkirim ke IT.\nID Error: #${errorData.error_report_id}`,
      "Error Tercatat"
    );
  }

  if (errorData?.error_reported) {
    return showError(
      `${message}\n\nLaporan otomatis sudah terkirim ke IT.`,
      "Error Tercatat"
    );
  }

  return showError(message);
};
