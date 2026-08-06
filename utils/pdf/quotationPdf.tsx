import type { InvoiceItem } from "@/types/invoice";
import {
  Document,
  Image,
  Page,
  StyleSheet,
  Text,
  View,
} from "@react-pdf/renderer";
import {
  ADDRESS,
  BANK,
  BUSINESS_NAME,
  CONTACT,
  GST_NO,
  amountInWords,
} from "./shared";

type QuotationDocData = {
  quotationNumber: string;
  issueDate: string;
  clientName: string;
  clientPhone?: string;
  clientAddress?: string;
  clientGST?: string;
  shippingAddress?: string;
  items: InvoiceItem[];
  taxRate: number;
  total: number;
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
  cellSN: { width: "8%" },
  cellDesc: { width: "40%" },
  cellImage: { width: "8%", textAlign: "center" },
  cellQty: { width: "10%", textAlign: "right" },
  cellCost: { width: "12%", textAlign: "right" },
  cellGst: { width: "10%", textAlign: "right" },
  cellTotal: { width: "12%", textAlign: "right" },
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

const TERMS =
  "100% advance payment is required. The order will be confirmed and shipment will be processed only after full payment. Local transport charges from Chennai excluded.";

function fmt(v: number) {
  return `Rs. ${Number(v).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export function QuotationDocument({ data }: { data: QuotationDocData }) {
  const hasImages = data.showImages && data.items.some((i) => i.imageBase64);

  const subtotal = data.items.reduce((sum, item) => sum + item.amount, 0);
  const gstAmt = data.items.reduce(
    (sum, item) => sum + (item.amount * data.taxRate) / 100,
    0,
  );

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
            <Text style={styles.docTitle}>QUOTATION</Text>
            <Text style={styles.docMeta}>
              Quotation No. {data.quotationNumber}
            </Text>
            <Text style={styles.docMeta}>Date {data.issueDate}</Text>
          </View>
        </View>

        {/* Bill To */}
        <Text style={styles.sectionLabel}>Delivery Address:</Text>
        <View style={styles.line} />
        <View style={styles.clientInfo}>
          <Text>{data.clientName || "Client"}</Text>
          {data.clientAddress && <Text>{data.clientAddress}</Text>}
          {data.clientPhone && <Text>Phone: {data.clientPhone}</Text>}
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
            <Text style={[styles.tableHeaderText, styles.cellSN]}>No.</Text>
            <Text style={[styles.tableHeaderText, styles.cellDesc]}>
              Description
            </Text>
            {hasImages && (
              <Text style={[styles.tableHeaderText, styles.cellImage]}>
                Image
              </Text>
            )}
            <Text style={[styles.tableHeaderText, styles.cellQty]}>Qty</Text>
            <Text style={[styles.tableHeaderText, styles.cellCost]}>
              Unit Price
            </Text>
            <Text style={[styles.tableHeaderText, styles.cellGst]}>
              GST ({data.taxRate}%)
            </Text>
            <Text style={[styles.tableHeaderText, styles.cellTotal]}>
              Amount
            </Text>
          </View>
          {data.items.map((item, i) => {
            const gst = (item.amount * data.taxRate) / 100;
            const total = item.amount + gst;
            return (
              <View
                key={i}
                style={[
                  styles.tableRow,
                  ...(i % 2 === 0 ? [styles.tableRowAlt] : []),
                ]}
                wrap={false}
              >
                <Text style={styles.cellSN}>{i + 1}</Text>
                <Text style={styles.cellDesc}>{item.description || "-"}</Text>
                {hasImages && (
                  <View style={styles.cellImage}>
                    {item.imageBase64 ? (
                      <Image
                        src={item.imageBase64}
                        style={{ width: 40, height: 40 }}
                      />
                    ) : (
                      <Text style={{ fontSize: 7, color: "#b8becd" }}>–</Text>
                    )}
                  </View>
                )}
                <Text style={styles.cellQty}>{item.quantity}</Text>
                <Text style={styles.cellCost}>{fmt(item.unitPrice)}</Text>
                <Text style={styles.cellGst}>{fmt(gst)}</Text>
                <Text style={styles.cellTotal}>{fmt(total)}</Text>
              </View>
            );
          })}
        </View>

        {/* Totals */}
        <View style={{ marginTop: 16 }}>
          <View style={styles.totalsSection}>
            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>Subtotal</Text>
              <Text style={styles.totalValue}>{fmt(subtotal)}</Text>
            </View>
            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>GST ({data.taxRate}%)</Text>
              <Text style={styles.totalValue}>{fmt(gstAmt)}</Text>
            </View>
            <View style={styles.totalAmountRow}>
              <Text style={styles.totalAmountLabel}>Total Amount</Text>
              <Text style={styles.totalAmountValue}>{fmt(data.total)}</Text>
            </View>
          </View>
        </View>

        {/* Amount in Words */}
        <View style={styles.wordsSection}>
          <Text style={styles.wordsText}>
            Amount in Words: {amountInWords(data.total, "INR")}
          </Text>
        </View>

        {/* Payment Info */}
        <View style={styles.infoSection}>
          <Text style={styles.infoTitle}>Payment Info</Text>
          <Text style={styles.infoText}>
            {`Account Name: ${BANK.name}\nAccount No: ${BANK.acc}\nBank: ${BANK.bank}\nIFSC: ${BANK.ifsc}`}
          </Text>
        </View>

        {/* Terms */}
        <View style={styles.infoSection}>
          <Text style={styles.infoTitle}>Terms & Conditions</Text>
          <Text style={styles.infoText}>{TERMS}</Text>
        </View>

        {/* Signature */}
        <View style={styles.signature}>
          <View style={styles.signatureLine} />
          <Text style={styles.signatureText}>Authorized</Text>
          <Text style={styles.signatureLabel}>Authorised Signature</Text>
        </View>

        {/* Footer */}
        <View fixed style={styles.footer}>
          <Text style={styles.footerText}>
            Thank you for choosing our services | Email: info@avion360.com |
            Tel: 86681 91780
          </Text>
        </View>
      </Page>
    </Document>
  );
}

export type { QuotationDocData };
