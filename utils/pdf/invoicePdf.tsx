import { Document, Page, View, Text, Image, StyleSheet } from "@react-pdf/renderer";
import { BUSINESS_NAME, ADDRESS, GST_NO, CONTACT, BANK, CURRENCY_SYMBOLS, amountInWords } from "./shared";
import type { InvoiceItem } from "@/types/invoice";

type InvoiceDocData = {
  invoiceNumber: string;
  documentTitle?: string;
  issueDate: string;
  dueDate?: string;
  dueDateLabel?: string;
  clientName: string;
  clientAddress?: string;
  clientPhone?: string;
  clientEmail?: string;
  clientGST?: string;
  shippingAddress?: string;
  items: Array<InvoiceItem & { hsnCode?: string; imageBase64?: string }>;
  subtotal: number;
  taxRate: number;
  total: number;
  discountPercentage?: number;
  discountAmount?: number;
  tax?: number;
  cgst?: number;
  sgst?: number;
  taxType?: "CGST_SGST" | "IGST";
  currency?: string;
  invoiceNumberLabel?: string;
  issueDateLabel?: string;
  notes?: string;
  signatoryName?: string;
  showImages?: boolean;
};

const DARK_BLUE = "#002060";
const LIGHT_BLUE = "#e3e8f7";
const TEXT_DARK = "#263148";
const TEXT_MED = "#3b4454";
const TEXT_LIGHT = "#4a5268";

const styles = StyleSheet.create({
  page: {
    padding: 30,
    fontFamily: "Helvetica",
    fontSize: 9,
  },
  header: {
    backgroundColor: DARK_BLUE,
    margin: -30,
    marginBottom: 0,
    padding: 16,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  headerLeft: {
    maxWidth: "55%",
  },
  headerTitle: {
    color: "#fff",
    fontSize: 17,
    fontWeight: "bold",
    marginBottom: 3,
  },
  headerText: {
    color: "#fff",
    fontSize: 8,
    lineHeight: 1.6,
  },
  headerRight: {
    alignItems: "flex-end",
  },
  docTitle: {
    color: "#fff",
    fontSize: 22,
    fontWeight: "bold",
  },
  docMeta: {
    color: "#fff",
    fontSize: 9,
    marginTop: 2,
  },
  sectionLabel: {
    fontSize: 11,
    fontWeight: "bold",
    color: TEXT_DARK,
    marginBottom: 2,
    marginTop: 14,
  },
  line: {
    borderBottomWidth: 0.5,
    borderBottomColor: "#b0b8c7",
    marginBottom: 6,
  },
  clientInfo: {
    fontSize: 9.2,
    color: TEXT_MED,
    lineHeight: 1.7,
  },
  table: {
    marginTop: 4,
  },
  tableHeader: {
    flexDirection: "row",
    backgroundColor: DARK_BLUE,
    paddingVertical: 5,
    paddingHorizontal: 4,
  },
  tableHeaderText: {
    color: "#fff",
    fontSize: 8.5,
    fontWeight: "bold",
  },
  tableRow: {
    flexDirection: "row",
    paddingVertical: 4,
    paddingHorizontal: 4,
    borderBottomWidth: 0.5,
    borderBottomColor: "#dbe0ec",
  },
  tableRowAlt: {
    backgroundColor: "#f3f6fb",
  },
  cellNo: { width: "8%" },
  cellDesc: { width: "38%" },
  cellImage: { width: "8%", textAlign: "center" },
  cellHsn: { width: "15%" },
  cellQty: { width: "10%", textAlign: "right" },
  cellPrice: { width: "12%", textAlign: "right" },
  cellAmount: { width: "13%", textAlign: "right" },
  totalsSection: {
    marginTop: 8,
    alignItems: "flex-end",
  },
  totalRow: {
    flexDirection: "row",
    width: "45%",
    paddingVertical: 2,
  },
  totalLabel: {
    flex: 1,
    textAlign: "right",
    fontSize: 9.5,
    color: TEXT_MED,
    paddingRight: 8,
  },
  totalValue: {
    width: 90,
    textAlign: "right",
    fontSize: 9.5,
    fontFamily: "Courier",
  },
  totalAmountRow: {
    flexDirection: "row",
    width: "45%",
    paddingVertical: 3,
    marginTop: 2,
  },
  totalAmountLabel: {
    flex: 1,
    textAlign: "right",
    fontSize: 9.5,
    fontWeight: "bold",
    color: TEXT_DARK,
    paddingRight: 8,
  },
  totalAmountValue: {
    width: 90,
    textAlign: "right",
    fontSize: 9.5,
    fontWeight: "bold",
    fontFamily: "Courier",
    backgroundColor: LIGHT_BLUE,
    paddingVertical: 2,
    paddingHorizontal: 4,
  },
  wordsSection: {
    marginTop: 12,
  },
  wordsText: {
    fontSize: 8.5,
    fontStyle: "italic",
    color: TEXT_LIGHT,
  },
  infoSection: {
    marginTop: 16,
  },
  infoTitle: {
    fontSize: 10,
    fontWeight: "bold",
    color: TEXT_DARK,
    marginBottom: 4,
  },
  infoText: {
    fontSize: 8.6,
    color: TEXT_MED,
    lineHeight: 1.8,
  },
  signature: {
    marginTop: 20,
    alignItems: "flex-end",
  },
  signatureLine: {
    width: 150,
    borderBottomWidth: 0.5,
    borderBottomColor: "#717991",
    marginBottom: 4,
  },
  signatureText: {
    fontSize: 14,
    fontStyle: "italic",
    color: TEXT_LIGHT,
  },
  signatureLabel: {
    fontSize: 8.5,
    color: TEXT_MED,
    textAlign: "center",
    width: 150,
  },
  footer: {
    position: "absolute",
    bottom: 20,
    left: 30,
    right: 30,
    borderTopWidth: 0.5,
    borderTopColor: "#b8becd",
    paddingTop: 4,
  },
  footerText: {
    fontSize: 8.5,
    color: TEXT_MED,
  },
});

function fmt(v: number, sym: string) {
  return `${sym} ${Number(v).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export function InvoiceDocument({ data }: { data: InvoiceDocData }) {
  const currency = data.currency ?? "INR";
  const sym = CURRENCY_SYMBOLS[currency] ?? "Rs.";
  const taxType = data.taxType ?? "CGST_SGST";
  const gstAmt = data.tax ?? (data.cgst ?? 0) + (data.sgst ?? 0);
  const halfGst = gstAmt / 2;
  const discAmt = data.discountAmount ?? 0;
  const hasHsn = data.items.some((i) => i.hsnCode);
  const showImages = data.showImages && data.items.some((i) => i.imageBase64);

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Header */}
        <View fixed style={styles.header}>
          <View style={styles.headerLeft}>
            <Text style={styles.headerTitle}>{BUSINESS_NAME}</Text>
            <Text style={styles.headerText}>
              {ADDRESS}
              {`\nTax ID: ${GST_NO} | Tel: ${CONTACT}`}
            </Text>
          </View>
          <View style={styles.headerRight}>
            <Text style={styles.docTitle}>{data.documentTitle ?? "INVOICE"}</Text>
            <Text style={styles.docMeta}>{data.invoiceNumberLabel ?? "Invoice No."} {data.invoiceNumber}</Text>
            <Text style={styles.docMeta}>{data.issueDateLabel ?? "Invoice Date"} {data.issueDate}</Text>
            {data.dueDate && (
              <Text style={styles.docMeta}>{data.dueDateLabel ?? "Due Date"} {data.dueDate}</Text>
            )}
          </View>
        </View>

        {/* Bill To */}
        <Text style={styles.sectionLabel}>Billed To:</Text>
        <View style={styles.line} />
        <View style={styles.clientInfo}>
          <Text>{data.clientName || "Client"}</Text>
          {data.clientAddress && <Text>{data.clientAddress}</Text>}
          {data.clientPhone && <Text>Phone: {data.clientPhone}</Text>}
          {data.clientEmail && <Text>Email: {data.clientEmail}</Text>}
          {data.clientGST && <Text>GST: {data.clientGST}</Text>}
          {data.shippingAddress && (
            <Text style={{ marginTop: 6, fontStyle: "italic" }}>
              Ship To: {data.shippingAddress}
            </Text>
          )}
        </View>

        {/* Items Table */}
        <View style={styles.table} wrap={false}>
          <View style={styles.tableHeader}>
            <Text style={[styles.tableHeaderText, styles.cellNo]}>No.</Text>
            <Text style={[styles.tableHeaderText, styles.cellDesc]}>Description</Text>
            {hasHsn && <Text style={[styles.tableHeaderText, styles.cellHsn]}>HSN/SAC</Text>}
            {showImages && <Text style={[styles.tableHeaderText, styles.cellImage]}>Image</Text>}
            <Text style={[styles.tableHeaderText, styles.cellQty]}>Qty</Text>
            <Text style={[styles.tableHeaderText, styles.cellPrice]}>Unit Price</Text>
            <Text style={[styles.tableHeaderText, styles.cellAmount]}>Amount</Text>
          </View>
          {data.items.map((item, i) => (
            <View
              key={i}
              style={[styles.tableRow, ...(i % 2 === 0 ? [styles.tableRowAlt] : [])]}
              wrap={false}
            >
              <Text style={styles.cellNo}>{i + 1}</Text>
              <Text style={styles.cellDesc}>{item.description || "-"}</Text>
              {hasHsn && <Text style={styles.cellHsn}>{item.hsnCode ?? ""}</Text>}
              {showImages && (
                <View style={styles.cellImage}>
                  {item.imageBase64 ? (
                    <Image src={item.imageBase64} style={{ width: 40, height: 40 }} />
                  ) : (
                    <Text style={{ fontSize: 7, color: "#b8becd" }}>–</Text>
                  )}
                </View>
              )}
              <Text style={styles.cellQty}>{item.quantity}</Text>
              <Text style={styles.cellPrice}>{fmt(item.unitPrice, sym)}</Text>
              <Text style={styles.cellAmount}>{fmt(item.amount, sym)}</Text>
            </View>
          ))}
        </View>

        {/* Totals */}
        <View style={{ marginTop: 16 }}>
          <View style={styles.totalsSection}>
            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>Subtotal</Text>
              <Text style={styles.totalValue}>{fmt(data.subtotal, sym)}</Text>
            </View>
            {discAmt > 0 && (
              <>
                <View style={styles.totalRow}>
                  <Text style={styles.totalLabel}>Discount ({data.discountPercentage ?? 0}%)</Text>
                  <Text style={styles.totalValue}>- {fmt(discAmt, sym)}</Text>
                </View>
                <View style={styles.totalRow}>
                  <Text style={styles.totalLabel}>Taxable Value</Text>
                  <Text style={styles.totalValue}>{fmt(data.subtotal - discAmt, sym)}</Text>
                </View>
              </>
            )}
            {taxType === "CGST_SGST" ? (
              <>
                <View style={styles.totalRow}>
                  <Text style={styles.totalLabel}>CGST ({data.taxRate / 2}%)</Text>
                  <Text style={styles.totalValue}>{fmt(halfGst, sym)}</Text>
                </View>
                <View style={styles.totalRow}>
                  <Text style={styles.totalLabel}>SGST ({data.taxRate / 2}%)</Text>
                  <Text style={styles.totalValue}>{fmt(halfGst, sym)}</Text>
                </View>
              </>
            ) : (
              <View style={styles.totalRow}>
                <Text style={styles.totalLabel}>IGST ({data.taxRate}%)</Text>
                <Text style={styles.totalValue}>{fmt(gstAmt, sym)}</Text>
              </View>
            )}
            <View style={styles.totalAmountRow}>
              <Text style={styles.totalAmountLabel}>Total Amount</Text>
              <Text style={styles.totalAmountValue}>{fmt(data.total, sym)}</Text>
            </View>
          </View>
        </View>

        {/* Amount in Words */}
        <View style={styles.wordsSection}>
          <Text style={styles.wordsText}>
            Amount in Words: {amountInWords(data.total, currency)}
          </Text>
        </View>

        {/* Payment Info */}
        <View style={styles.infoSection}>
          <Text style={styles.infoTitle}>Payment Info</Text>
          <Text style={styles.infoText}>
            {`Account Name: ${BANK.name}\nAccount No: ${BANK.acc}\nBank: ${BANK.bank}\nIFSC: ${BANK.ifsc}`}
          </Text>
        </View>

        {/* Notes */}
        <View style={styles.infoSection}>
          <Text style={styles.infoTitle}>Notes</Text>
          <Text style={styles.infoText}>
            {data.notes || "Please send proof of payment to our billing team."}
          </Text>
        </View>

        {/* Signature */}
        <View style={styles.signature}>
          <View style={styles.signatureLine} />
          <Text style={styles.signatureText}>{data.signatoryName || "Authorized"}</Text>
          <Text style={styles.signatureLabel}>Authorised Signature</Text>
        </View>

        {/* Footer */}
        <View fixed style={styles.footer}>
          <Text style={styles.footerText}>
            Thank you for choosing our services | Email: info@sourcersbiz.com | Tel: 86681 91780
          </Text>
        </View>
      </Page>
    </Document>
  );
}

export type { InvoiceDocData };
