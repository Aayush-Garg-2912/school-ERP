const FeePayment = require("../models/FeePayment");
const StudentFee = require("../models/StudentFee");
const Student = require("../models/Student");
const WhatsAppService = require("../services/whatsapp.service");

const generateReceiptNumber = async (schoolId) => {
  const lastPayment = await FeePayment.findOne({
    school: schoolId,
  }).sort({
    createdAt: -1,
  });

  let nextNumber = 1;

  if (lastPayment?.receiptNumber) {
    const match =
      lastPayment.receiptNumber.match(/(\d+)$/);

    if (match) {
      nextNumber = Number(match[1]) + 1;
    }
  }

  return `REC-${String(nextNumber).padStart(6, "0")}`;
};

const createFeePayment = async (req, res) => {
  try {
    const {
      studentFeeId,
      amount,
      paymentMethod,
      transactionId,
      paymentDate,
      remarks,
    } = req.body;

    if (
      !studentFeeId ||
      amount === undefined ||
      !paymentMethod
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Student fee, amount and payment method are required",
      });
    }

    if (Number(amount) <= 0) {
      return res.status(400).json({
        success: false,
        message: "Payment amount must be greater than zero",
      });
    }

    const schoolId = req.user.school._id;

    const studentFee = await StudentFee.findOne({
      _id: studentFeeId,
      school: schoolId,
    });

    if (!studentFee) {
      return res.status(404).json({
        success: false,
        message: "Student fee not found",
      });
    }

    if (studentFee.status === "paid") {
      return res.status(400).json({
        success: false,
        message: "This fee has already been fully paid",
      });
    }

    const paymentAmount = Number(amount);

    if (paymentAmount > studentFee.dueAmount) {
      return res.status(400).json({
        success: false,
        message:
          `Payment cannot be greater than due amount ₹${studentFee.dueAmount}`,
      });
    }

    const validMethods = [
      "cash",
      "card",
      "upi",
      "bank_transfer",
      "online",
    ];

    if (!validMethods.includes(paymentMethod)) {
      return res.status(400).json({
        success: false,
        message: "Invalid payment method",
      });
    }

    const receiptNumber =
      await generateReceiptNumber(schoolId);

    const payment = await FeePayment.create({
      school: schoolId,
      student: studentFee.student,
      studentFee: studentFee._id,
      receiptNumber,
      amount: paymentAmount,
      paymentMethod,
      transactionId: transactionId || "",
      paymentDate: paymentDate || new Date(),
      collectedBy: req.user._id,
      remarks: remarks || "",
    });

    studentFee.paidAmount += paymentAmount;

    studentFee.dueAmount =
      studentFee.payableAmount -
      studentFee.paidAmount;

    if (studentFee.dueAmount === 0) {
      studentFee.status = "paid";
    } else if (studentFee.paidAmount > 0) {
      studentFee.status = "partial";
    } else {
      studentFee.status = "pending";
    }

    await studentFee.save();

    // Trigger automated WhatsApp Fee Slip dispatch (runs non-blocking)
    WhatsAppService.sendFeeReceipt({
      schoolId,
      paymentId: payment._id,
      user: req.user,
    }).catch((waErr) => {
      console.warn("Automated WhatsApp Fee Receipt dispatch failed:", waErr.message);
    });

    res.status(201).json({
      success: true,
      message: "Fee payment successful",
      data: {
        payment,
        feeSummary: {
          payableAmount:
            studentFee.payableAmount,
          paidAmount:
            studentFee.paidAmount,
          dueAmount:
            studentFee.dueAmount,
          status:
            studentFee.status,
        },
      },
    });
  } catch (error) {
    console.error(
      "Create Fee Payment Error:",
      error
    );

    res.status(500).json({
      success: false,
      message: "Failed to process fee payment",
    });
  }
};

const getFeePayments = async (req, res) => {
  try {
    const filter = {
      school: req.user.school._id,
    };

    if (req.query.studentId) {
      filter.student = req.query.studentId;
    }

    if (req.query.studentFeeId) {
      filter.studentFee = req.query.studentFeeId;
    }

    const payments = await FeePayment.find(filter)
      .populate(
        "student",
        "admissionNumber firstName lastName"
      )
      .populate(
        "studentFee",
        "payableAmount paidAmount dueAmount status"
      )
      .populate(
        "collectedBy",
        "name email role"
      )
      .sort({
        paymentDate: -1,
      });

    res.status(200).json({
      success: true,
      data: {
        payments,
      },
    });
  } catch (error) {
    console.error(
      "Get Fee Payments Error:",
      error
    );

    res.status(500).json({
      success: false,
      message: "Failed to fetch fee payments",
    });
  }
};

const getFeePaymentById = async (req, res) => {
  try {
    const payment = await FeePayment.findOne({
      _id: req.params.id,
      school: req.user.school._id,
    })
      .populate(
        "student",
        "admissionNumber firstName lastName"
      )
      .populate(
        "studentFee",
        "payableAmount paidAmount dueAmount status"
      )
      .populate(
        "collectedBy",
        "name email role"
      );

    if (!payment) {
      return res.status(404).json({
        success: false,
        message: "Payment not found",
      });
    }

    res.status(200).json({
      success: true,
      data: {
        payment,
      },
    });
  } catch (error) {
    console.error(
      "Get Fee Payment Error:",
      error
    );

    res.status(500).json({
      success: false,
      message: "Failed to fetch payment",
    });
  }
};


const refundFeePayment = async (req, res) => {
  try {
    const payment = await FeePayment.findOne({ _id: req.params.id, school: req.user.school._id });
    if (!payment) return res.status(404).json({ success:false, message:"Payment not found" });
    const studentFee = await StudentFee.findOne({ _id:payment.studentFee, school:payment.school });
    if (!studentFee) return res.status(404).json({ success:false, message:"Student fee not found" });
    studentFee.paidAmount=Math.max(0,studentFee.paidAmount-payment.amount); studentFee.dueAmount=Math.max(0,studentFee.payableAmount-studentFee.paidAmount); studentFee.status=studentFee.paidAmount===0?'pending':(studentFee.dueAmount===0?'paid':'partial');
    await studentFee.save();
    await payment.deleteOne();
    return res.json({success:true,message:"Fee payment refunded successfully",data:{feeSummary:{payableAmount:studentFee.payableAmount,paidAmount:studentFee.paidAmount,dueAmount:studentFee.dueAmount,status:studentFee.status}}});
  } catch(e){ return res.status(500).json({success:false,message:e.message||"Failed to refund payment"}); }
};

module.exports = {
  createFeePayment,
  getFeePayments,
  getFeePaymentById,
  refundFeePayment,
};