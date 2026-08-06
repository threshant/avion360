import { Document, Page, View, Text, StyleSheet } from "@react-pdf/renderer";

type PayslipDocData = {
  employeeCode: string | null;
  name: string;
  dateOfBirth: string | null;
  designation: string;
  department: string;
  joiningDate: string | null;
  workingDays: number;
  lopDays: number;
  month: string;
  basicSalary: number;
  hra: number;
  otherAllowances: number;
  totalEarnings: number;
  professionalTax: number;
  lopDeduction: number;
  otherDeductions: number;
  totalDeductions: number;
  netSalary: number;
};

function fmt(n: number) {
  return n.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function monthLabel(ym: string) {
  const [y, m] = ym.split("-");
  const d = new Date(Number(y), Number(m) - 1, 1);
  return d.toLocaleDateString("en-IN", { month: "long", year: "numeric" });
}

function formatDate(iso: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("en-IN", { day: "2-digit", month: "2-digit", year: "numeric" });
}

function numToWords(n: number): string {
  if (n === 0) return "Zero";
  const ones = [
    "", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine",
    "Ten", "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen", "Sixteen",
    "Seventeen", "Eighteen", "Nineteen",
  ];
  const tens = [
    "", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety",
  ];

  function below100(num: number): string {
    if (num < 20) return ones[num];
    return tens[Math.floor(num / 10)] + (num % 10 ? " " + ones[num % 10] : "");
  }
  function below1000(num: number): string {
    if (num < 100) return below100(num);
    return ones[Math.floor(num / 100)] + " Hundred" + (num % 100 ? " " + below100(num % 100) : "");
  }

  const intPart = Math.floor(n);
  const decPart = Math.round((n - intPart) * 100);
  let result = "";
  if (intPart >= 100000) result += below1000(Math.floor(intPart / 100000)) + " Lakh ";
  if (intPart >= 1000) result += below1000(Math.floor((intPart % 100000) / 1000)) + " Thousand ";
  result += below1000(intPart % 1000);
  if (decPart > 0) result += " and " + below100(decPart) + " Paise";
  return result.trim();
}

const DARK_BLUE = "#1a3a5c";

const styles = StyleSheet.create({
  page: {
    fontFamily: "Helvetica",
    fontSize: 9,
    padding: 30,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    borderBottomWidth: 2,
    borderBottomColor: DARK_BLUE,
    paddingBottom: 10,
    marginBottom: 0,
  },
  logoRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  logoBox: {
    width: 36,
    height: 36,
    backgroundColor: DARK_BLUE,
    borderRadius: 4,
    alignItems: "center",
    justifyContent: "center",
  },
  logoS: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "black",
    fontStyle: "italic",
  },
  companyBlock: {},
  companyName: {
    fontSize: 14,
    fontWeight: "bold",
    letterSpacing: 1,
    color: DARK_BLUE,
  },
  companyTagline: {
    fontSize: 7,
    color: "#555",
    marginTop: 1,
  },
  headerRight: {
    fontSize: 7,
    color: "#333",
    textAlign: "right",
    lineHeight: 1.6,
  },
  titleRow: {
    backgroundColor: DARK_BLUE,
    paddingVertical: 5,
    alignItems: "center",
  },
  titleText: {
    color: "#fff",
    fontSize: 13,
    fontWeight: "bold",
    letterSpacing: 2,
  },
  monthRow: {
    paddingVertical: 4,
    borderBottomWidth: 1,
    borderBottomColor: "#ccc",
    alignItems: "center",
  },
  monthText: {
    fontSize: 9,
    borderBottomWidth: 1,
    borderBottomColor: "#000",
    paddingHorizontal: 30,
  },
  empGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    borderBottomWidth: 1,
    borderBottomColor: "#ccc",
  },
  empItem: {
    width: "50%",
    flexDirection: "row",
    paddingVertical: 3,
    paddingHorizontal: 10,
    borderBottomWidth: 0.5,
    borderBottomColor: "#eee",
  },
  empLabel: {
    width: 130,
    color: "#333",
    fontSize: 8,
  },
  empSep: {
    marginRight: 4,
    color: "#999",
    fontSize: 8,
  },
  empValue: {
    borderBottomWidth: 0.5,
    borderBottomColor: "#555",
    flex: 1,
    fontSize: 8,
  },
  salaryGrid: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: "#ccc",
  },
  salaryCol: {
    flex: 1,
    borderRightWidth: 1,
    borderRightColor: "#ccc",
  },
  salaryColLast: {
    flex: 1,
  },
  salHeader: {
    backgroundColor: DARK_BLUE,
    paddingVertical: 3,
    alignItems: "center",
  },
  salHeaderText: {
    color: "#fff",
    fontSize: 9,
    fontWeight: "bold",
    letterSpacing: 1,
  },
  salSubHeader: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: "#ccc",
    backgroundColor: "#f0f0f0",
  },
  salSubPart: {
    flex: 1,
    paddingVertical: 2,
    paddingHorizontal: 6,
    fontSize: 7,
    fontWeight: "bold",
  },
  salSubAmount: {
    width: 70,
    textAlign: "right",
    paddingVertical: 2,
    paddingHorizontal: 6,
    fontSize: 7,
    fontWeight: "bold",
    borderLeftWidth: 1,
    borderLeftColor: "#ccc",
  },
  salRow: {
    flexDirection: "row",
    borderBottomWidth: 0.5,
    borderBottomColor: "#eee",
    minHeight: 18,
  },
  salPart: {
    flex: 1,
    paddingVertical: 2,
    paddingHorizontal: 6,
    fontSize: 8,
  },
  salAmount: {
    width: 70,
    textAlign: "right",
    paddingVertical: 2,
    paddingHorizontal: 6,
    fontSize: 8,
    borderLeftWidth: 1,
    borderLeftColor: "#ccc",
  },
  salTotalRow: {
    flexDirection: "row",
    borderTopWidth: 1,
    borderTopColor: "#ccc",
    backgroundColor: "#f5f5f5",
  },
  salTotalPart: {
    flex: 1,
    paddingVertical: 3,
    paddingHorizontal: 6,
    fontSize: 8,
    fontWeight: "bold",
  },
  salTotalAmount: {
    width: 70,
    textAlign: "right",
    paddingVertical: 3,
    paddingHorizontal: 6,
    fontSize: 8,
    fontWeight: "bold",
    borderLeftWidth: 1,
    borderLeftColor: "#ccc",
  },
  netRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#ccc",
  },
  netLabel: {
    fontWeight: "bold",
    fontSize: 9,
    minWidth: 140,
  },
  netValue: {
    fontWeight: "bold",
    fontSize: 11,
    marginLeft: 6,
  },
  wordsRow: {
    paddingVertical: 3,
    paddingHorizontal: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#ccc",
    fontSize: 8,
  },
  wordsBold: {
    fontWeight: "bold",
  },
  footerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 6,
    paddingHorizontal: 10,
    fontSize: 8,
  },
  sigBlock: {
    alignItems: "flex-end",
  },
  sigFor: {
    fontWeight: "bold",
    fontSize: 9,
  },
  sigBlank: {
    width: 120,
    height: 20,
    borderBottomWidth: 1,
    borderBottomColor: "#000",
    marginVertical: 3,
  },
  sigLabel: {
    fontSize: 8,
    textAlign: "center",
    width: 120,
  },
  disclaimer: {
    textAlign: "center",
    fontSize: 7,
    color: "#666",
    paddingVertical: 3,
    borderTopWidth: 1,
    borderTopColor: "#eee",
  },
});

export function PayslipDocument({ data }: { data: PayslipDocData }) {
  const employeeFields: Array<[string, string]> = [
    ["Employee Name", data.name],
    ["Employee ID", data.employeeCode || "—"],
    ["Date of Birth", formatDate(data.dateOfBirth)],
    ["Date of Joining", formatDate(data.joiningDate)],
    ["Designation", data.designation],
    ["Department", data.department],
    ["Number of Working Days", String(data.workingDays)],
    ["LOP (Days)", String(data.lopDays)],
  ];

  const earningsRows: Array<[string, number]> = [
    ["Basic Salary", data.basicSalary],
    ["HRA", data.hra],
    ["Other Allowance", data.otherAllowances],
  ];

  const deductionsRows: Array<[string, number]> = [
    ["Professional Tax", data.professionalTax],
    ["LOP Deduction", data.lopDeduction],
    ["Other Deductions", data.otherDeductions],
  ];

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.logoRow}>
            <View style={styles.logoBox}>
              <Text style={styles.logoS}>S</Text>
            </View>
            <View style={styles.companyBlock}>
              <Text style={styles.companyName}>SOURCESBIZ</Text>
              <Text style={styles.companyTagline}>Connecting Materials, Creating Value.</Text>
            </View>
          </View>
          <View style={styles.headerRight}>
            <Text>No. 123, 1st Floor, XYZ Complex,</Text>
            <Text>Coimbatore - 641 018, Tamil Nadu, India</Text>
            <Text>+91 12345 67890</Text>
            <Text>hello@sourcesbiz.com</Text>
            <Text>www.sourcesbiz.com</Text>
            <Text style={{ fontWeight: "bold" }}>GSTIN: 33ABCDE1234F1Z5</Text>
          </View>
        </View>

        {/* Title */}
        <View style={styles.titleRow}>
          <Text style={styles.titleText}>— SALARY SLIP —</Text>
        </View>
        <View style={styles.monthRow}>
          <Text style={styles.monthText}>For the Month of {monthLabel(data.month)}</Text>
        </View>

        {/* Employee Info Grid */}
        <View style={styles.empGrid}>
          {employeeFields.map(([label, value]) => (
            <View key={label} style={styles.empItem}>
              <Text style={styles.empLabel}>{label}</Text>
              <Text style={styles.empSep}>:</Text>
              <Text style={styles.empValue}>{value}</Text>
            </View>
          ))}
        </View>

        {/* Earnings / Deductions */}
        <View style={styles.salaryGrid}>
          {/* Earnings Column */}
          <View style={styles.salaryCol}>
            <View style={styles.salHeader}>
              <Text style={styles.salHeaderText}>EARNINGS</Text>
            </View>
            <View style={styles.salSubHeader}>
              <Text style={styles.salSubPart}>Particulars</Text>
              <Text style={styles.salSubAmount}>Amount (₹)</Text>
            </View>
            {earningsRows.map(([label, val]) => (
              <View key={label} style={styles.salRow}>
                <Text style={styles.salPart}>{label}</Text>
                <Text style={styles.salAmount}>{val > 0 ? fmt(val) : "XXX"}</Text>
              </View>
            ))}
            {[0, 1].map((i) => (
              <View key={`blank-e-${i}`} style={styles.salRow}>
                <Text style={[styles.salPart, { color: "#999" }]}>__________ Allowance</Text>
                <Text style={[styles.salAmount, { color: "#999" }]}>XXX</Text>
              </View>
            ))}
            <View style={styles.salTotalRow}>
              <Text style={styles.salTotalPart}>Total Earnings (A)</Text>
              <Text style={styles.salTotalAmount}>{fmt(data.totalEarnings)}</Text>
            </View>
          </View>

          {/* Deductions Column */}
          <View style={styles.salaryColLast}>
            <View style={styles.salHeader}>
              <Text style={styles.salHeaderText}>DEDUCTIONS</Text>
            </View>
            <View style={styles.salSubHeader}>
              <Text style={styles.salSubPart}>Particulars</Text>
              <Text style={styles.salSubAmount}>Amount (₹)</Text>
            </View>
            {deductionsRows.map(([label, val]) => (
              <View key={label} style={styles.salRow}>
                <Text style={styles.salPart}>{label}</Text>
                <Text style={styles.salAmount}>{val > 0 ? fmt(val) : "XXX"}</Text>
              </View>
            ))}
            {[0, 1, 2].map((i) => (
              <View key={`blank-d-${i}`} style={styles.salRow}>
                <Text style={styles.salPart} />
                <Text style={[styles.salAmount, { color: "#999" }]}>XXX</Text>
              </View>
            ))}
            <View style={styles.salTotalRow}>
              <Text style={styles.salTotalPart}>Total Deductions (B)</Text>
              <Text style={styles.salTotalAmount}>{fmt(data.totalDeductions)}</Text>
            </View>
          </View>
        </View>

        {/* Net Salary */}
        <View style={styles.netRow}>
          <Text style={styles.netLabel}>NET SALARY (A – B)</Text>
          <Text style={styles.netValue}>₹ {fmt(data.netSalary)}</Text>
        </View>
        <View style={styles.wordsRow}>
          <Text>
            <Text style={styles.wordsBold}>Net Salary in Words: </Text>
            {"Rupees "}{numToWords(Math.floor(data.netSalary))} Only
          </Text>
        </View>

        {/* Footer */}
        <View style={styles.footerRow}>
          <View>
            <Text>Date: ___________</Text>
            <Text style={{ marginTop: 4 }}>Place: Coimbatore</Text>
          </View>
          <View style={styles.sigBlock}>
            <Text style={styles.sigFor}>For SourcersBiz</Text>
            <View style={styles.sigBlank} />
            <Text style={styles.sigLabel}>Authorized Signatory</Text>
          </View>
        </View>

        <View style={styles.disclaimer}>
          <Text>This is a computer generated payslip and does not require a physical signature.</Text>
        </View>
      </Page>
    </Document>
  );
}

export type { PayslipDocData };
