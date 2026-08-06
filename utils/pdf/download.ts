import { pdf, type DocumentProps } from "@react-pdf/renderer";
import type { ReactElement } from "react";

export async function downloadPdf(doc: ReactElement<DocumentProps>, filename: string) {
  const blob = await pdf(doc).toBlob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
