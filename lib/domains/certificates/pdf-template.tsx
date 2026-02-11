// ============================================================================
// Certificate PDF Template
// Uses @react-pdf/renderer to define a professional certificate layout.
// ============================================================================

import {
  Document,
  Page,
  View,
  Text,
  StyleSheet,
} from "@react-pdf/renderer";

export interface CertificatePDFProps {
  studentName: string;
  courseTitle: string;
  completionDate: string;
  organizationName?: string;
  certificateNumber?: string;
}

const NAVY = "#1e3a5f";
const GOLD = "#b8860b";
const SLATE = "#64748b";
const WHITE = "#ffffff";

const styles = StyleSheet.create({
  page: {
    backgroundColor: WHITE,
    padding: 0,
  },

  // Outer decorative border
  outerBorder: {
    margin: 24,
    border: `3px solid ${GOLD}`,
    padding: 8,
  },

  // Inner decorative border
  innerBorder: {
    border: `1px solid ${GOLD}`,
    padding: 40,
    alignItems: "center",
  },

  // Top accent line
  accentLine: {
    width: 120,
    height: 3,
    backgroundColor: GOLD,
    marginBottom: 20,
  },

  // Header area
  headerText: {
    fontSize: 12,
    color: NAVY,
    letterSpacing: 6,
    textTransform: "uppercase",
    fontFamily: "Helvetica",
    marginBottom: 4,
  },

  title: {
    fontSize: 32,
    color: NAVY,
    fontFamily: "Helvetica-Bold",
    marginBottom: 8,
  },

  // Divider below title
  divider: {
    width: 60,
    height: 2,
    backgroundColor: GOLD,
    marginTop: 12,
    marginBottom: 24,
  },

  // "This certifies that" label
  label: {
    fontSize: 11,
    color: SLATE,
    fontFamily: "Helvetica",
    marginBottom: 8,
    letterSpacing: 2,
    textTransform: "uppercase",
  },

  // Student name
  studentName: {
    fontSize: 28,
    color: NAVY,
    fontFamily: "Helvetica-Bold",
    marginBottom: 6,
  },

  // Name underline
  nameUnderline: {
    width: 280,
    height: 1,
    backgroundColor: SLATE,
    marginBottom: 20,
  },

  // "has successfully completed" label
  completionLabel: {
    fontSize: 11,
    color: SLATE,
    fontFamily: "Helvetica",
    marginBottom: 10,
    letterSpacing: 1,
  },

  // Course title
  courseTitle: {
    fontSize: 20,
    color: NAVY,
    fontFamily: "Helvetica-Bold",
    marginBottom: 24,
    textAlign: "center",
    maxWidth: 400,
  },

  // Bottom section with org + date
  bottomSection: {
    flexDirection: "row",
    justifyContent: "space-between",
    width: "100%",
    marginTop: 20,
    paddingTop: 16,
    borderTop: `1px solid ${GOLD}`,
  },

  bottomColumn: {
    alignItems: "center",
    width: "45%",
  },

  bottomLabel: {
    fontSize: 9,
    color: SLATE,
    fontFamily: "Helvetica",
    textTransform: "uppercase",
    letterSpacing: 1,
    marginBottom: 6,
  },

  bottomValue: {
    fontSize: 13,
    color: NAVY,
    fontFamily: "Helvetica-Bold",
  },

  // Certificate number footer
  footer: {
    marginTop: 24,
    alignItems: "center",
  },

  footerText: {
    fontSize: 8,
    color: SLATE,
    fontFamily: "Helvetica",
    letterSpacing: 1,
  },
});

export function CertificatePDF({
  studentName,
  courseTitle,
  completionDate,
  organizationName,
  certificateNumber,
}: CertificatePDFProps) {
  return (
    <Document>
      <Page size="A4" orientation="landscape" style={styles.page}>
        <View style={styles.outerBorder}>
          <View style={styles.innerBorder}>
            {/* Top accent */}
            <View style={styles.accentLine} />

            {/* Header */}
            <Text style={styles.headerText}>VetsInTech</Text>
            <Text style={styles.title}>Certificate of Completion</Text>
            <View style={styles.divider} />

            {/* Student section */}
            <Text style={styles.label}>This certifies that</Text>
            <Text style={styles.studentName}>{studentName}</Text>
            <View style={styles.nameUnderline} />

            {/* Course section */}
            <Text style={styles.completionLabel}>
              has successfully completed the course
            </Text>
            <Text style={styles.courseTitle}>{courseTitle}</Text>

            {/* Bottom section with org and date */}
            <View style={styles.bottomSection}>
              <View style={styles.bottomColumn}>
                <Text style={styles.bottomLabel}>Issued By</Text>
                <Text style={styles.bottomValue}>
                  {organizationName || "VetsInTech"}
                </Text>
              </View>
              <View style={styles.bottomColumn}>
                <Text style={styles.bottomLabel}>Date of Completion</Text>
                <Text style={styles.bottomValue}>{completionDate}</Text>
              </View>
            </View>

            {/* Certificate number footer */}
            {certificateNumber && (
              <View style={styles.footer}>
                <Text style={styles.footerText}>
                  Certificate ID: {certificateNumber}
                </Text>
              </View>
            )}
          </View>
        </View>
      </Page>
    </Document>
  );
}
