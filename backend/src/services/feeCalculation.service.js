/**
 * Fee Calculation Service
 * Centralizes the calculation of student fees, including:
 * - Annual Charges
 * - Monthly Tuition Fees
 * - Transport Fees & Routes
 * - Extra / Miscellaneous Charges
 * - Offers, Scholarships & Concessions
 * - Gross Total, Discount and Net Payable Amounts
 */

function calculateStudentFeeDetails({
  feeStructure = null,
  components = [],
  annualCharges = 0,
  monthlyTuition = 0,
  tuitionMonths = 12,
  transportFee = 0,
  transportDetails = {},
  extraFees = 0,
  offer = null,
  discount = 0,
  remarks = "",
}) {
  let finalComponents = [];

  if (Array.isArray(components) && components.length > 0) {
    finalComponents = components.map((c) => ({
      name: (c.name || "Fee Component").trim(),
      amount: Number(c.amount) || 0,
      frequency: c.frequency || "yearly",
      category: c.category || "other",
    }));
  } else if (feeStructure?.components?.length) {
    finalComponents = feeStructure.components.map((c) => ({
      name: c.name,
      amount: Number(c.amount) || 0,
      frequency: c.frequency || "yearly",
      category: "tuition",
    }));
  }

  const parsedAnnual = Number(annualCharges) || 0;
  const parsedMonthly = Number(monthlyTuition) || 0;
  const parsedMonths = Math.max(1, Math.min(12, Number(tuitionMonths) || 12));
  const parsedTransport = Number(transportFee) || 0;
  const parsedExtra = Number(extraFees) || 0;

  // Add individual categories to components if not already represented
  if (parsedAnnual > 0 && !finalComponents.some((c) => c.category === "annual")) {
    finalComponents.push({
      name: "Annual & Development Charges",
      amount: parsedAnnual,
      frequency: "yearly",
      category: "annual",
    });
  }

  if (parsedMonthly > 0 && !finalComponents.some((c) => c.category === "tuition")) {
    finalComponents.push({
      name: `Monthly Tuition Fee (₹${parsedMonthly}/mo × ${parsedMonths} mos)`,
      amount: parsedMonthly * parsedMonths,
      frequency: "monthly",
      category: "tuition",
    });
  }

  if (parsedTransport > 0 && !finalComponents.some((c) => c.category === "transport")) {
    finalComponents.push({
      name: transportDetails?.route
        ? `Transport Fee (${transportDetails.route})`
        : "Transport Fee",
      amount: parsedTransport,
      frequency: "yearly",
      category: "transport",
    });
  }

  if (parsedExtra > 0 && !finalComponents.some((c) => c.category === "extra")) {
    finalComponents.push({
      name: "Extra / Activity Charges",
      amount: parsedExtra,
      frequency: "yearly",
      category: "extra",
    });
  }

  // Calculate gross total
  let totalAmount = finalComponents.reduce(
    (sum, c) => sum + (Number(c.amount) || 0),
    0
  );

  if (totalAmount === 0) {
    totalAmount =
      parsedAnnual +
      parsedMonthly * parsedMonths +
      parsedTransport +
      parsedExtra;
  }

  // Calculate Offer / Discount
  let calculatedDiscount = 0;
  const normalizedOffer = {
    name: offer?.name || "",
    type: offer?.type || "none",
    value: Number(offer?.value) || 0,
    discountAmount: 0,
  };

  if (normalizedOffer.type === "percentage" && normalizedOffer.value > 0) {
    calculatedDiscount = Math.round((totalAmount * normalizedOffer.value) / 100);
    normalizedOffer.discountAmount = calculatedDiscount;
  } else if (normalizedOffer.type === "flat" && normalizedOffer.value > 0) {
    calculatedDiscount = Math.min(totalAmount, normalizedOffer.value);
    normalizedOffer.discountAmount = calculatedDiscount;
  } else {
    calculatedDiscount = Math.min(
      totalAmount,
      Math.max(0, Number(discount) || 0)
    );
  }

  const payableAmount = Math.max(0, totalAmount - calculatedDiscount);
  const dueAmount = payableAmount;
  const status = payableAmount === 0 ? "paid" : "pending";

  return {
    components: finalComponents,
    annualCharges: parsedAnnual,
    monthlyTuition: parsedMonthly,
    tuitionMonths: parsedMonths,
    transportFee: parsedTransport,
    transportDetails: {
      opted: Boolean(transportDetails?.opted || parsedTransport > 0),
      route: transportDetails?.route || "",
      pickupPoint: transportDetails?.pickupPoint || "",
    },
    extraFees: parsedExtra,
    offer: normalizedOffer,
    totalAmount,
    discount: calculatedDiscount,
    payableAmount,
    paidAmount: 0,
    dueAmount,
    status,
    remarks: remarks || "",
  };
}

module.exports = {
  calculateStudentFeeDetails,
};
