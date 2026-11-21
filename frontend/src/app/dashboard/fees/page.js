"use client";

import React, { useState, useEffect, useMemo } from "react";
import {
  Card,
  Tabs,
  Table,
  Button,
  Tag,
  Space,
  Modal,
  Form,
  Input,
  InputNumber,
  Select,
  DatePicker,
  Popconfirm,
  Typography,
  Row,
  Col,
  Statistic,
  Divider,
  Descriptions,
  message,
  Drawer,
  Checkbox,
  Switch,
  Badge,
  Alert,
  Tooltip,
} from "antd";
import {
  DollarOutlined,
  PlusOutlined,
  ReloadOutlined,
  CreditCardOutlined,
  FileTextOutlined,
  PrinterOutlined,
  RollbackOutlined,
  DeleteOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  WhatsAppOutlined,
  SearchOutlined,
  EyeOutlined,
  EditOutlined,
  CarOutlined,
  GiftOutlined,
  SendOutlined,
} from "@ant-design/icons";
import dayjs from "dayjs";
import api from "@/lib/api";

const { Title, Text, Paragraph } = Typography;
const { Option } = Select;

export default function FeesPage() {
  const [activeTab, setActiveTab] = useState("studentFees");
  const [academicYears, setAcademicYears] = useState([]);
  const [selectedYear, setSelectedYear] = useState(null);
  const [classes, setClasses] = useState([]);
  const [selectedClass, setSelectedClass] = useState(null);
  const [selectedClassFilter, setSelectedClassFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [searchText, setSearchText] = useState("");
  const [remindingId, setRemindingId] = useState(null);
  const [bulkReminding, setBulkReminding] = useState(false);

  // Data states
  const [studentFees, setStudentFees] = useState([]);
  const [feeStructures, setFeeStructures] = useState([]);
  const [payments, setPayments] = useState([]);
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(false);

  // Modals
  const [assignModalOpen, setAssignModalOpen] = useState(false);
  const [submittingAssign, setSubmittingAssign] = useState(false);
  const [structureModalOpen, setStructureModalOpen] = useState(false);
  const [submittingStructure, setSubmittingStructure] = useState(false);
  const [paymentModalOpen, setPaymentModalOpen] = useState(false);
  const [selectedFeeForPayment, setSelectedFeeForPayment] = useState(null);
  const [submittingPayment, setSubmittingPayment] = useState(false);

  // Student Fee Breakdown Drawer
  const [detailDrawerOpen, setDetailDrawerOpen] = useState(false);
  const [selectedFeeDetail, setSelectedFeeDetail] = useState(null);
  const [selectedFeePayments, setSelectedFeePayments] = useState([]);
  const [loadingFeeDetail, setLoadingFeeDetail] = useState(false);

  // Edit Fee Modal
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editingFee, setEditingFee] = useState(null);
  const [editSubmitting, setEditSubmitting] = useState(false);
  const [editForm] = Form.useForm();

  // Receipt Modal
  const [receiptModalOpen, setReceiptModalOpen] = useState(false);
  const [currentReceipt, setCurrentReceipt] = useState(null);

  // Assign Fee breakdown state
  const [assignAnnualCharges, setAssignAnnualCharges] = useState(5000);
  const [assignMonthlyTuition, setAssignMonthlyTuition] = useState(1500);
  const [assignTuitionMonths, setAssignTuitionMonths] = useState(12);
  const [assignTransportOpted, setAssignTransportOpted] = useState(false);
  const [assignTransportAmount, setAssignTransportAmount] = useState(0);
  const [assignTransportRoute, setAssignTransportRoute] = useState("");
  const [assignExtraAmount, setAssignExtraAmount] = useState(0);
  const [assignOfferType, setAssignOfferType] = useState("none");
  const [assignOfferPct, setAssignOfferPct] = useState(0);
  const [assignOfferFlat, setAssignOfferFlat] = useState(0);

  const [assignForm] = Form.useForm();
  const [structureForm] = Form.useForm();
  const [paymentForm] = Form.useForm();

  // Real-time calculation of assign fee
  const assignFeeSummary = useMemo(() => {
    const annual = Number(assignAnnualCharges || 0);
    const tuition = Number(assignMonthlyTuition || 0) * Number(assignTuitionMonths || 12);
    const transport = assignTransportOpted ? Number(assignTransportAmount || 0) : 0;
    const extra = Number(assignExtraAmount || 0);
    const gross = annual + tuition + transport + extra;

    let discount = 0;
    let offerLabel = "None";

    if (assignOfferType === "sibling") {
      discount = Math.round((gross * 10) / 100);
      offerLabel = "Sibling Concession (10%)";
    } else if (assignOfferType === "merit") {
      discount = Math.round((gross * 20) / 100);
      offerLabel = "Merit / Scholarship (20%)";
    } else if (assignOfferType === "staff") {
      discount = Math.round((gross * 50) / 100);
      offerLabel = "Staff Ward Concession (50%)";
    } else if (assignOfferType === "girl") {
      discount = Math.round((gross * 15) / 100);
      offerLabel = "Girl Child Concession (15%)";
    } else if (assignOfferType === "mgmt") {
      discount = Math.round((gross * 25) / 100);
      offerLabel = "Special Management Offer (25%)";
    } else if (assignOfferType === "custom_pct") {
      discount = Math.round((gross * Number(assignOfferPct || 0)) / 100);
      offerLabel = `Custom Discount (${assignOfferPct}%)`;
    } else if (assignOfferType === "custom_flat") {
      discount = Math.min(gross, Number(assignOfferFlat || 0));
      offerLabel = `Flat Discount (₹${assignOfferFlat})`;
    }

    const net = Math.max(0, gross - discount);
    return { annual, tuition, transport, extra, gross, discount, net, offerLabel };
  }, [
    assignAnnualCharges,
    assignMonthlyTuition,
    assignTuitionMonths,
    assignTransportOpted,
    assignTransportAmount,
    assignExtraAmount,
    assignOfferType,
    assignOfferPct,
    assignOfferFlat,
  ]);

  // Load Initial Dependencies
  const fetchInitialData = async () => {
    try {
      const [yearRes, studentRes] = await Promise.all([
        api.get("/academic-years"),
        api.get("/students?status=active"),
      ]);
      if (yearRes.data.success) {
        const years = yearRes.data.data.academicYears || [];
        setAcademicYears(years);
        const current = years.find((y) => y.isCurrent) || years[0];
        if (current) setSelectedYear(current._id);
      }
      if (studentRes.data.success) {
        setStudents(studentRes.data.data.students || []);
      }
    } catch (err) {
      console.error("Failed to load fee dependencies:", err);
    }
  };

  const fetchClasses = async (yearId) => {
    if (!yearId) return;
    try {
      const { data } = await api.get(`/classes?academicYear=${yearId}`);
      if (data.success) setClasses(data.data.classes || []);
    } catch (err) {
      console.error("Failed to load classes:", err);
    }
  };

  const fetchFeeStructures = async (yearId) => {
    if (!yearId) return;
    try {
      const { data } = await api.get(`/fee-structures?academicYear=${yearId}`);
      if (data.success) setFeeStructures(data.data.feeStructures || []);
    } catch (err) {
      console.error("Failed to load fee structures:", err);
    }
  };

  const fetchStudentFees = async (
    yearId = selectedYear,
    stFilter = statusFilter,
    clsFilter = selectedClassFilter,
    search = searchText
  ) => {
    if (!yearId) return;
    setLoading(true);
    try {
      let query = `academicYear=${yearId}`;
      if (stFilter !== "all") query += `&status=${stFilter}`;
      if (clsFilter && clsFilter !== "all") query += `&classId=${clsFilter}`;
      if (search && search.trim()) query += `&search=${encodeURIComponent(search.trim())}`;
      const { data } = await api.get(`/student-fees?${query}`);
      if (data.success) setStudentFees(data.data.studentFees || []);
    } catch (err) {
      message.error("Failed to load student fees");
    } finally {
      setLoading(false);
    }
  };

  const fetchPayments = async () => {
    setLoading(true);
    try {
      const { data } = await api.get("/fee-payments");
      if (data.success) setPayments(data.data.payments || []);
    } catch (err) {
      message.error("Failed to load fee payments");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInitialData();
  }, []);

  useEffect(() => {
    if (selectedYear) {
      fetchClasses(selectedYear);
      fetchFeeStructures(selectedYear);
      fetchStudentFees(selectedYear, statusFilter, selectedClassFilter, searchText);
      fetchPayments();
    }
  }, [selectedYear, statusFilter, selectedClassFilter]);

  // Assign Fee to Student
  const handleAssignFee = async (values) => {
    setSubmittingAssign(true);
    try {
      let offerObj = { name: "", type: "none", value: 0 };
      if (assignOfferType === "sibling") offerObj = { name: "Sibling Concession (10%)", type: "percentage", value: 10 };
      else if (assignOfferType === "merit") offerObj = { name: "Merit / Scholarship (20%)", type: "percentage", value: 20 };
      else if (assignOfferType === "staff") offerObj = { name: "Staff Ward Concession (50%)", type: "percentage", value: 50 };
      else if (assignOfferType === "girl") offerObj = { name: "Girl Child Concession (15%)", type: "percentage", value: 15 };
      else if (assignOfferType === "mgmt") offerObj = { name: "Special Management Offer (25%)", type: "percentage", value: 25 };
      else if (assignOfferType === "custom_pct") offerObj = { name: "Custom Concession", type: "percentage", value: Number(assignOfferPct || 0) };
      else if (assignOfferType === "custom_flat") offerObj = { name: "Flat Discount", type: "flat", value: Number(assignOfferFlat || 0) };

      const payload = {
        studentId: values.studentId,
        academicYear: selectedYear,
        feeStructureId: values.feeStructureId || undefined,
        annualCharges: Number(assignAnnualCharges || 0),
        monthlyTuition: Number(assignMonthlyTuition || 0),
        tuitionMonths: Number(assignTuitionMonths || 12),
        transportFee: assignTransportOpted ? Number(assignTransportAmount || 0) : 0,
        transportDetails: {
          opted: Boolean(assignTransportOpted),
          route: assignTransportRoute || "",
        },
        extraFees: Number(assignExtraAmount || 0),
        offer: offerObj,
        remarks: values.remarks || "Configured in accounts",
      };

      const { data } = await api.post("/student-fees", payload);
      if (data.success) {
        message.success("Fee assigned to student successfully");
        setAssignModalOpen(false);
        assignForm.resetFields();
        fetchStudentFees(selectedYear, statusFilter, selectedClassFilter, searchText);
      }
    } catch (err) {
      message.error(err.response?.data?.message || "Failed to assign fee");
    } finally {
      setSubmittingAssign(false);
    }
  };

  // Open fee detail drawer
  const handleOpenFeeDetails = async (fee) => {
    setSelectedFeeDetail(fee);
    setSelectedFeePayments([]);
    setDetailDrawerOpen(true);
    try {
      setLoadingFeeDetail(true);
      const { data } = await api.get(`/student-fees/${fee._id}`);
      if (data.success) {
        setSelectedFeeDetail(data.data.studentFee);
        setSelectedFeePayments(data.data.payments || []);
      }
    } catch (e) {
      console.error("Failed to load fee details:", e);
    } finally {
      setLoadingFeeDetail(false);
    }
  };

  // Send single WhatsApp fee reminder
  const handleSendReminder = async (feeId) => {
    setRemindingId(feeId);
    try {
      const { data } = await api.post(`/student-fees/${feeId}/remind`, {});
      if (data.success) {
        message.success(data.message || "Fee reminder dispatched via WhatsApp!");
      }
    } catch (err) {
      message.error(err.response?.data?.message || "Failed to send WhatsApp reminder");
    } finally {
      setRemindingId(null);
    }
  };

  // Bulk WhatsApp fee reminders
  const handleBulkFeeReminders = async () => {
    setBulkReminding(true);
    try {
      const payload = {
        classId: selectedClassFilter !== "all" ? selectedClassFilter : undefined,
      };
      const { data } = await api.post("/whatsapp/fee-reminders", payload);
      if (data.success) {
        message.success(data.message || "Fee reminders dispatched to parents!");
      }
    } catch (err) {
      message.error(err.response?.data?.message || "Failed to dispatch fee reminders");
    } finally {
      setBulkReminding(false);
    }
  };

  // Open Edit Fee Modal
  const handleOpenEditFee = (fee) => {
    setEditingFee(fee);
    editForm.resetFields();
    editForm.setFieldsValue({
      annualCharges: fee.annualCharges || 0,
      monthlyTuition: fee.monthlyTuition || 0,
      tuitionMonths: fee.tuitionMonths || 12,
      transportFee: fee.transportFee || 0,
      extraFees: fee.extraFees || 0,
      discount: fee.discount || 0,
      remarks: fee.remarks || "",
    });
    setEditModalOpen(true);
  };

  // Submit Update Fee
  const handleUpdateFee = async (values) => {
    if (!editingFee) return;
    setEditSubmitting(true);
    try {
      const payload = {
        annualCharges: Number(values.annualCharges || 0),
        monthlyTuition: Number(values.monthlyTuition || 0),
        tuitionMonths: Number(values.tuitionMonths || 12),
        transportFee: Number(values.transportFee || 0),
        extraFees: Number(values.extraFees || 0),
        discount: Number(values.discount || 0),
        remarks: values.remarks || "",
      };

      const { data } = await api.put(`/student-fees/${editingFee._id}`, payload);
      if (data.success) {
        message.success("Student fee updated successfully!");
        setEditModalOpen(false);
        fetchStudentFees(selectedYear, statusFilter, selectedClassFilter, searchText);
      }
    } catch (err) {
      message.error(err.response?.data?.message || "Failed to update student fee");
    } finally {
      setEditSubmitting(false);
    }
  };

  // Create Fee Structure Template
  const handleCreateStructure = async (values) => {
    setSubmittingStructure(true);
    try {
      const payload = {
        academicYear: selectedYear,
        classId: values.classId,
        name: values.name.trim(),
        description: values.description || "",
        components: values.components.map((c) => ({
          name: c.name.trim(),
          amount: Number(c.amount),
        })),
      };

      const { data } = await api.post("/fee-structures", payload);
      if (data.success) {
        message.success("Fee structure template created successfully");
        setStructureModalOpen(false);
        structureForm.resetFields();
        fetchFeeStructures(selectedYear);
      }
    } catch (err) {
      message.error(err.response?.data?.message || "Failed to create structure");
    } finally {
      setSubmittingStructure(false);
    }
  };

  // Open Collect Payment Modal
  const handleOpenPaymentModal = (record) => {
    setSelectedFeeForPayment(record);
    paymentForm.resetFields();
    paymentForm.setFieldsValue({
      amount: record.dueAmount,
      paymentMethod: "upi",
      paymentDate: dayjs(),
    });
    setPaymentModalOpen(true);
  };

  // Submit Fee Payment
  const handleSubmitPayment = async (values) => {
    setSubmittingPayment(true);
    try {
      const payload = {
        studentFeeId: selectedFeeForPayment._id,
        amount: Number(values.amount),
        paymentMethod: values.paymentMethod,
        transactionId: values.transactionId || "",
        paymentDate: values.paymentDate.format("YYYY-MM-DD"),
        remarks: values.remarks || "",
      };

      const { data } = await api.post("/fee-payments", payload);
      if (data.success) {
        message.success("Fee payment collected successfully!");
        setPaymentModalOpen(false);
        setCurrentReceipt(data.data.payment);
        setReceiptModalOpen(true);
        fetchStudentFees(selectedYear);
        fetchPayments();
      }
    } catch (err) {
      message.error(err.response?.data?.message || "Payment collection failed");
    } finally {
      setSubmittingPayment(false);
    }
  };

  // Refund Payment
  const handleRefundPayment = async (paymentId) => {
    try {
      const { data } = await api.delete(`/fee-payments/${paymentId}`);
      if (data.success) {
        message.success("Fee payment refunded successfully");
        fetchStudentFees(selectedYear);
        fetchPayments();
      }
    } catch (err) {
      message.error(err.response?.data?.message || "Failed to refund payment");
    }
  };

  // Summary Metrics
  const totalPayable = studentFees.reduce((acc, f) => acc + (f.payableAmount || 0), 0);
  const totalCollected = studentFees.reduce((acc, f) => acc + (f.paidAmount || 0), 0);
  const totalOutstanding = studentFees.reduce((acc, f) => acc + (f.dueAmount || 0), 0);

  // Student Fees Table Columns
  const feeColumns = [
    {
      title: "Student",
      key: "student",
      render: (_, r) => (
        <div>
          <Text strong>{r.student?.firstName} {r.student?.lastName || ""}</Text>
          <br />
          <Text type="secondary" style={{ fontSize: 11 }}>
            Roll: #{r.student?.rollNumber || "N/A"} | Adm: {r.student?.admissionNumber || "N/A"}
          </Text>
          <br />
          <Tag color="blue" style={{ fontSize: 10, padding: "0 4px", marginTop: 2 }}>
            {r.student?.class?.name || "Class"} {r.student?.section?.name ? `(${r.student.section.name})` : ""}
          </Tag>
        </div>
      ),
    },
    {
      title: "Fee Breakdown",
      key: "breakdown",
      render: (_, r) => (
        <div style={{ fontSize: 12 }}>
          {r.annualCharges > 0 && <div>Annual: ₹{r.annualCharges.toLocaleString()}</div>}
          {r.monthlyTuition > 0 && (
            <div>Tuition: ₹{r.monthlyTuition.toLocaleString()}/mo × {r.tuitionMonths || 12}m</div>
          )}
          {r.transportFee > 0 && (
            <div>
              <Tag color="cyan" style={{ fontSize: 10 }}>
                Bus: ₹{r.transportFee.toLocaleString()}
              </Tag>
            </div>
          )}
          {r.extraFees > 0 && (
            <div>
              <Tag color="purple" style={{ fontSize: 10 }}>
                Extra: ₹{r.extraFees.toLocaleString()}
              </Tag>
            </div>
          )}
          {!r.annualCharges && !r.monthlyTuition && !r.transportFee && !r.extraFees && (
            <Text type="secondary">{r.feeStructure?.name || "Standard Fee"}</Text>
          )}
        </div>
      ),
    },
    {
      title: "Gross Total",
      dataIndex: "totalAmount",
      key: "totalAmount",
      render: (amt) => `₹${(amt || 0).toLocaleString()}`,
    },
    {
      title: "Offer / Discount",
      key: "discount",
      render: (_, r) =>
        r.discount > 0 ? (
          <div>
            <Tag color="green">-₹{r.discount.toLocaleString()}</Tag>
            {r.offer?.name && (
              <div style={{ fontSize: 10, color: "#166534" }}>{r.offer.name}</div>
            )}
          </div>
        ) : (
          <Text type="secondary">—</Text>
        ),
    },
    {
      title: "Net Payable",
      dataIndex: "payableAmount",
      key: "payableAmount",
      render: (p) => <Text strong style={{ color: "#1e3a8a" }}>₹{(p || 0).toLocaleString()}</Text>,
    },
    {
      title: "Paid",
      dataIndex: "paidAmount",
      key: "paidAmount",
      render: (pd) => (
        <Text style={{ color: "#15803d", fontWeight: 600 }}>
          ₹{(pd || 0).toLocaleString()}
        </Text>
      ),
    },
    {
      title: "Due Balance",
      dataIndex: "dueAmount",
      key: "dueAmount",
      render: (due) => (
        <Text style={{ color: due > 0 ? "#b91c1c" : "#15803d", fontWeight: 700 }}>
          ₹{(due || 0).toLocaleString()}
        </Text>
      ),
    },
    {
      title: "Status",
      dataIndex: "status",
      key: "status",
      render: (st) => {
        const colorMap = { paid: "green", partial: "orange", pending: "red" };
        return <Tag color={colorMap[st] || "default"}>{(st || "PENDING").toUpperCase()}</Tag>;
      },
    },
    {
      title: "Actions",
      key: "actions",
      render: (_, r) => (
        <Space wrap size={4}>
          <Button
            type="primary"
            size="small"
            icon={<CreditCardOutlined />}
            disabled={r.status === "paid"}
            onClick={() => handleOpenPaymentModal(r)}
            style={{ background: r.status === "paid" ? undefined : "#10b981", borderColor: "#10b981" }}
          >
            Collect
          </Button>

          <Tooltip title="View Detailed Breakdown & Receipts">
            <Button
              size="small"
              icon={<EyeOutlined />}
              onClick={() => handleOpenFeeDetails(r)}
            />
          </Tooltip>

          {r.dueAmount > 0 && (
            <Tooltip title="Send WhatsApp Fee Reminder to Parent">
              <Button
                size="small"
                icon={<WhatsAppOutlined />}
                loading={remindingId === r._id}
                onClick={() => handleSendReminder(r._id)}
                style={{ color: "#25D366", borderColor: "#25D366" }}
              />
            </Tooltip>
          )}

          <Tooltip title="Edit / Adjust Fee Components">
            <Button
              size="small"
              icon={<EditOutlined />}
              onClick={() => handleOpenEditFee(r)}
            />
          </Tooltip>
        </Space>
      ),
    },
  ];

  // Fee Structures Table Columns
  const structureColumns = [
    {
      title: "Structure Name",
      dataIndex: "name",
      key: "name",
      render: (text) => <Text strong style={{ fontSize: 14 }}>{text}</Text>,
    },
    {
      title: "Target Class",
      key: "class",
      render: (_, r) => r.class?.name || "N/A",
    },
    {
      title: "Components Breakdown",
      key: "components",
      render: (_, r) => (
        <Space wrap>
          {r.components?.map((c, i) => (
            <Tag key={i} color="blue">
              {c.name}: ₹{c.amount}
            </Tag>
          ))}
        </Space>
      ),
    },
    {
      title: "Total Sum",
      key: "totalSum",
      render: (_, r) => {
        const total = r.components?.reduce((sum, c) => sum + (c.amount || 0), 0) || 0;
        return <Text strong style={{ color: "#1677ff" }}>₹{total.toLocaleString()}</Text>;
      },
    },
  ];

  // Payments Table Columns
  const paymentColumns = [
    {
      title: "Receipt No",
      dataIndex: "receiptNumber",
      key: "receiptNumber",
      render: (rec) => <Tag color="geekblue" style={{ fontWeight: 600 }}>{rec}</Tag>,
    },
    {
      title: "Student Name",
      key: "student",
      render: (_, r) => `${r.student?.firstName || ""} ${r.student?.lastName || ""}`,
    },
    {
      title: "Amount Paid",
      dataIndex: "amount",
      key: "amount",
      render: (amt) => <Text strong style={{ color: "#52c41a" }}>₹{(amt || 0).toLocaleString()}</Text>,
    },
    {
      title: "Payment Mode",
      dataIndex: "paymentMethod",
      key: "paymentMethod",
      render: (m) => <Tag color="cyan">{m?.toUpperCase()}</Tag>,
    },
    {
      title: "Date",
      dataIndex: "paymentDate",
      key: "paymentDate",
      render: (d) => dayjs(d).format("DD MMM YYYY"),
    },
    {
      title: "Transaction Ref",
      dataIndex: "transactionId",
      key: "transactionId",
      render: (tid) => tid || <Text type="secondary">—</Text>,
    },
    {
      title: "Actions",
      key: "actions",
      render: (_, r) => (
        <Space>
          <Button
            size="small"
            icon={<PrinterOutlined />}
            onClick={() => {
              setCurrentReceipt(r);
              setReceiptModalOpen(true);
            }}
          >
            Receipt
          </Button>
          <Popconfirm
            title="Refund this payment?"
            description="The amount will be reversed back to the student's due balance."
            onConfirm={() => handleRefundPayment(r._id)}
            okText="Yes, Refund"
            cancelText="Cancel"
            okButtonProps={{ danger: true }}
          >
            <Button size="small" type="text" danger icon={<RollbackOutlined />}>
              Refund
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <div>
      {/* Financial KPI Summary Bar */}
      <Row gutter={[16, 16]} style={{ marginBottom: 20 }}>
        <Col xs={24} sm={8}>
          <Card style={{ borderRadius: 12 }}>
            <Statistic
              title="Total Billed Fees"
              value={totalPayable}
              prefix="₹"
              valueStyle={{ fontWeight: 700 }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={8}>
          <Card style={{ borderRadius: 12 }}>
            <Statistic
              title="Total Fee Collections"
              value={totalCollected}
              prefix="₹"
              valueStyle={{ color: "#52c41a", fontWeight: 700 }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={8}>
          <Card style={{ borderRadius: 12 }}>
            <Statistic
              title="Outstanding Dues"
              value={totalOutstanding}
              prefix="₹"
              valueStyle={{ color: totalOutstanding > 0 ? "#ff4d4f" : "#52c41a", fontWeight: 700 }}
            />
          </Card>
        </Col>
      </Row>

      <Card style={{ borderRadius: 12 }}>
        <Row justify="space-between" align="middle" style={{ marginBottom: 20 }} gutter={[16, 16]}>
          <Col>
            <Title level={4} style={{ margin: 0 }}>
              Fees & Finance Management
            </Title>
            <Text type="secondary">
              Configure fee component structures, allocate student fees, collect payments, and print receipts
            </Text>
          </Col>

          <Col>
            <Space wrap>
              <Select
                value={selectedYear}
                onChange={setSelectedYear}
                style={{ width: 190 }}
                placeholder="Academic Session"
              >
                {academicYears.map((y) => (
                  <Option key={y._id} value={y._id}>
                    {y.name} {y.isCurrent && "★ (Current)"}
                  </Option>
                ))}
              </Select>

              {activeTab === "studentFees" && (
                <>
                  <Select
                    value={selectedClassFilter}
                    onChange={(c) => {
                      setSelectedClassFilter(c);
                      fetchStudentFees(selectedYear, statusFilter, c, searchText);
                    }}
                    style={{ width: 140 }}
                  >
                    <Option value="all">All Classes</Option>
                    {classes.map((c) => (
                      <Option key={c._id} value={c._id}>
                        {c.name}
                      </Option>
                    ))}
                  </Select>

                  <Input
                    prefix={<SearchOutlined />}
                    placeholder="Search student or roll..."
                    value={searchText}
                    onChange={(e) => setSearchText(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        fetchStudentFees(selectedYear, statusFilter, selectedClassFilter, searchText);
                      }
                    }}
                    allowClear
                    style={{ width: 200 }}
                  />

                  <Select
                    value={statusFilter}
                    onChange={setStatusFilter}
                    style={{ width: 130 }}
                  >
                    <Option value="all">All Statuses</Option>
                    <Option value="pending">Pending Only</Option>
                    <Option value="partial">Partial Dues</Option>
                    <Option value="paid">Fully Paid</Option>
                  </Select>

                  <Button
                    icon={<WhatsAppOutlined />}
                    onClick={handleBulkFeeReminders}
                    loading={bulkReminding}
                    style={{ color: "#059669", borderColor: "#10b981", fontWeight: 600 }}
                  >
                    Reminders
                  </Button>
                </>
              )}

              <Button
                icon={<ReloadOutlined />}
                onClick={() => fetchStudentFees(selectedYear, statusFilter, selectedClassFilter, searchText)}
              >
                Refresh
              </Button>

              {activeTab === "studentFees" && (
                <Button
                  type="primary"
                  icon={<PlusOutlined />}
                  onClick={() => {
                    assignForm.resetFields();
                    setAssignAnnualCharges(5000);
                    setAssignMonthlyTuition(1500);
                    setAssignTuitionMonths(12);
                    setAssignTransportOpted(false);
                    setAssignTransportAmount(0);
                    setAssignTransportRoute("");
                    setAssignExtraAmount(0);
                    setAssignOfferType("none");
                    setAssignOfferPct(0);
                    setAssignOfferFlat(0);
                    setAssignModalOpen(true);
                  }}
                  disabled={!selectedYear}
                  style={{ background: "#1677ff" }}
                >
                  Assign Fee to Student
                </Button>
              )}

              {activeTab === "structures" && (
                <Button
                  type="primary"
                  icon={<PlusOutlined />}
                  onClick={() => {
                    structureForm.resetFields();
                    setStructureModalOpen(true);
                  }}
                  disabled={!selectedYear || classes.length === 0}
                >
                  New Fee Structure
                </Button>
              )}
            </Space>
          </Col>
        </Row>

        <Tabs
          activeKey={activeTab}
          onChange={setActiveTab}
          items={[
            {
              key: "studentFees",
              label: (
                <span>
                  <DollarOutlined /> Student Fee Dues ({studentFees.length})
                </span>
              ),
              children: (
                <Table
                  columns={feeColumns}
                  dataSource={studentFees}
                  rowKey="_id"
                  loading={loading}
                  pagination={{ pageSize: 10 }}
                />
              ),
            },
            {
              key: "structures",
              label: (
                <span>
                  <FileTextOutlined /> Fee Structure Templates ({feeStructures.length})
                </span>
              ),
              children: (
                <Table
                  columns={structureColumns}
                  dataSource={feeStructures}
                  rowKey="_id"
                  loading={loading}
                  pagination={{ pageSize: 10 }}
                />
              ),
            },
            {
              key: "payments",
              label: (
                <span>
                  <CreditCardOutlined /> Collection Receipts & Ledger ({payments.length})
                </span>
              ),
              children: (
                <Table
                  columns={paymentColumns}
                  dataSource={payments}
                  rowKey="_id"
                  loading={loading}
                  pagination={{ pageSize: 10 }}
                />
              ),
            },
          ]}
        />
      </Card>

      {/* Collect Fee Payment Modal */}
      <Modal
        title={`Collect Fee Payment — ${selectedFeeForPayment?.student?.firstName || "Student"}`}
        open={paymentModalOpen}
        onCancel={() => setPaymentModalOpen(false)}
        footer={null}
        destroyOnClose
      >
        <Card size="small" style={{ background: "#f8fafc", borderRadius: 8, marginBottom: 16 }}>
          <Row gutter={16}>
            <Col span={12}>
              <Text type="secondary">Total Net Payable:</Text>
              <br />
              <Text strong>₹{selectedFeeForPayment?.payableAmount?.toLocaleString()}</Text>
            </Col>
            <Col span={12}>
              <Text type="secondary">Outstanding Balance:</Text>
              <br />
              <Text strong style={{ color: "#ff4d4f", fontSize: 16 }}>
                ₹{selectedFeeForPayment?.dueAmount?.toLocaleString()}
              </Text>
            </Col>
          </Row>
        </Card>

        <Form form={paymentForm} layout="vertical" onFinish={handleSubmitPayment}>
          <Form.Item
            name="amount"
            label="Payment Amount (₹)"
            rules={[
              { required: true, message: "Enter payment amount" },
              {
                validator(_, val) {
                  if (val > selectedFeeForPayment?.dueAmount) {
                    return Promise.reject(new Error("Amount cannot exceed due balance"));
                  }
                  return Promise.resolve();
                },
              },
            ]}
          >
            <InputNumber min={1} style={{ width: "100%" }} />
          </Form.Item>

          <Row gutter={16}>
            <Col xs={24} sm={12}>
              <Form.Item
                name="paymentMethod"
                label="Payment Method"
                rules={[{ required: true, message: "Select method" }]}
              >
                <Select>
                  <Option value="upi">UPI / QR Code</Option>
                  <Option value="cash">Cash Counter</Option>
                  <Option value="card">Debit / Credit Card</Option>
                  <Option value="bank_transfer">Bank Transfer / NEFT</Option>
                  <Option value="online">Online Payment</Option>
                </Select>
              </Form.Item>
            </Col>

            <Col xs={24} sm={12}>
              <Form.Item name="paymentDate" label="Payment Date" rules={[{ required: true }]}>
                <DatePicker style={{ width: "100%" }} format="YYYY-MM-DD" />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item name="transactionId" label="Transaction Ref / Cheque No">
            <Input placeholder="e.g. UPI-9876543210 or CHQ-102938" />
          </Form.Item>

          <Form.Item name="remarks" label="Receipt Remarks">
            <Input placeholder="Optional remarks..." />
          </Form.Item>

          <div style={{ textAlign: "right", marginTop: 24 }}>
            <Space>
              <Button onClick={() => setPaymentModalOpen(false)}>Cancel</Button>
              <Button type="primary" htmlType="submit" loading={submittingPayment} style={{ background: "#52c41a", borderColor: "#52c41a" }}>
                Generate Receipt & Collect
              </Button>
            </Space>
          </div>
        </Form>
      </Modal>

      {/* Official Payment Receipt Modal */}
      <Modal
        title="Official School Fee Payment Receipt"
        open={receiptModalOpen}
        onCancel={() => setReceiptModalOpen(false)}
        footer={[
          <Button key="close" onClick={() => setReceiptModalOpen(false)}>Close</Button>,
          <Button key="print" type="primary" icon={<PrinterOutlined />} onClick={() => window.print()}>
            Print Receipt
          </Button>,
        ]}
      >
        {currentReceipt && (
          <div style={{ padding: "12px 0" }}>
            <div style={{ textAlign: "center", marginBottom: 16 }}>
              <Tag color="geekblue" style={{ fontSize: 14, padding: "4px 12px" }}>
                RECEIPT NO: {currentReceipt.receiptNumber}
              </Tag>
              <br />
              <Text type="secondary" style={{ fontSize: 12, marginTop: 4, display: "inline-block" }}>
                Date: {dayjs(currentReceipt.paymentDate).format("DD MMMM YYYY")}
              </Text>
            </div>

            <Descriptions bordered column={1} size="small">
              <Descriptions.Item label="Amount Collected">
                <Text strong style={{ color: "#52c41a", fontSize: 16 }}>
                  ₹{(currentReceipt.amount || 0).toLocaleString()}
                </Text>
              </Descriptions.Item>
              <Descriptions.Item label="Payment Method">
                <Tag color="cyan">{currentReceipt.paymentMethod?.toUpperCase()}</Tag>
              </Descriptions.Item>
              {currentReceipt.transactionId && (
                <Descriptions.Item label="Transaction Reference">
                  {currentReceipt.transactionId}
                </Descriptions.Item>
              )}
              {currentReceipt.remarks && (
                <Descriptions.Item label="Remarks">
                  {currentReceipt.remarks}
                </Descriptions.Item>
              )}
            </Descriptions>
          </div>
        )}
      </Modal>

      {/* Enhanced Assign Fee Modal */}
      <Modal
        title="Assign & Customize Fee Structure for Student"
        open={assignModalOpen}
        onCancel={() => setAssignModalOpen(false)}
        footer={null}
        width={780}
        destroyOnClose
      >
        <Form form={assignForm} layout="vertical" onFinish={handleAssignFee} style={{ marginTop: 16 }}>
          <Row gutter={16}>
            <Col xs={24} sm={12}>
              <Form.Item
                name="studentId"
                label="Select Student"
                rules={[{ required: true, message: "Select student" }]}
              >
                <Select
                  showSearch
                  placeholder="Search student by name or admission no"
                  optionFilterProp="children"
                >
                  {students.map((st) => (
                    <Option key={st._id} value={st._id}>
                      {st.firstName} {st.lastName || ""} ({st.admissionNumber}) - Class: {st.class?.name || "N/A"}
                    </Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
            <Col xs={24} sm={12}>
              <Form.Item name="feeStructureId" label="Fee Structure Template (Optional)">
                <Select
                  placeholder="Select Class Template to Pre-fill"
                  allowClear
                  onChange={(val) => {
                    const struct = feeStructures.find((f) => f._id === val);
                    if (struct) {
                      const sum = struct.components?.reduce((s, c) => s + (c.amount || 0), 0) || 0;
                      if (sum > 0) setAssignMonthlyTuition(Math.round(sum / 12));
                    }
                  }}
                >
                  {feeStructures.map((fs) => (
                    <Option key={fs._id} value={fs._id}>
                      {fs.name} ({fs.class?.name || "Class"})
                    </Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col xs={24} sm={8}>
              <Form.Item label="Annual & Admission Charges (₹)">
                <InputNumber
                  min={0}
                  style={{ width: "100%" }}
                  value={assignAnnualCharges}
                  onChange={(v) => setAssignAnnualCharges(v || 0)}
                  prefix="₹"
                  placeholder="5000"
                />
              </Form.Item>
            </Col>
            <Col xs={24} sm={8}>
              <Form.Item label="Monthly Tuition Fee (₹)">
                <InputNumber
                  min={0}
                  style={{ width: "100%" }}
                  value={assignMonthlyTuition}
                  onChange={(v) => setAssignMonthlyTuition(v || 0)}
                  prefix="₹"
                  placeholder="1500"
                />
              </Form.Item>
            </Col>
            <Col xs={24} sm={8}>
              <Form.Item label="Tuition Months">
                <Select
                  value={assignTuitionMonths}
                  onChange={setAssignTuitionMonths}
                  style={{ width: "100%" }}
                >
                  {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((m) => (
                    <Option key={m} value={m}>
                      {m} {m === 1 ? "Month" : "Months"} (₹{((assignMonthlyTuition || 0) * m).toLocaleString()})
                    </Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
          </Row>

          {/* Transport Section */}
          <div style={{ padding: "10px 14px", background: "#f0fdf4", border: "1px solid #bbf7d0", borderRadius: 8, marginBottom: 16 }}>
            <Checkbox
              checked={assignTransportOpted}
              onChange={(e) => setAssignTransportOpted(e.target.checked)}
              style={{ fontWeight: 600, color: "#166534" }}
            >
              <CarOutlined style={{ marginRight: 6 }} />
              Student Opts for School Bus / Transport
            </Checkbox>

            {assignTransportOpted && (
              <Row gutter={16} style={{ marginTop: 10 }}>
                <Col xs={24} sm={14}>
                  <Input
                    placeholder="Bus Route / Stop (e.g. Route 4 - Civil Lines)"
                    value={assignTransportRoute}
                    onChange={(e) => setAssignTransportRoute(e.target.value)}
                  />
                </Col>
                <Col xs={24} sm={10}>
                  <InputNumber
                    min={0}
                    style={{ width: "100%" }}
                    prefix="₹"
                    placeholder="Transport Fee"
                    value={assignTransportAmount}
                    onChange={(v) => setAssignTransportAmount(v || 0)}
                  />
                </Col>
              </Row>
            )}
          </div>

          {/* Extra Charges & Offer */}
          <Row gutter={16}>
            <Col xs={24} sm={12}>
              <Form.Item label="Extra / Activity Charges (₹)">
                <InputNumber
                  min={0}
                  style={{ width: "100%" }}
                  value={assignExtraAmount}
                  onChange={(v) => setAssignExtraAmount(v || 0)}
                  prefix="₹"
                  placeholder="e.g. 1000"
                />
              </Form.Item>
            </Col>
            <Col xs={24} sm={12}>
              <Form.Item label="Scholarship / Offer Scheme">
                <Select value={assignOfferType} onChange={setAssignOfferType}>
                  <Option value="none">No Concession</Option>
                  <Option value="sibling">Sibling Concession (10% Off)</Option>
                  <Option value="merit">Academic Merit Scholarship (20% Off)</Option>
                  <Option value="staff">Staff Ward Discount (50% Off)</Option>
                  <Option value="girl">Girl Child Concession (15% Off)</Option>
                  <Option value="mgmt">Special Management Offer (25% Off)</Option>
                  <Option value="custom_pct">Custom Percentage (%)</Option>
                  <Option value="custom_flat">Custom Flat Amount (₹)</Option>
                </Select>
              </Form.Item>
            </Col>
          </Row>

          {assignOfferType === "custom_pct" && (
            <Form.Item label="Custom Discount Percentage (%)">
              <InputNumber
                min={1}
                max={100}
                style={{ width: "100%" }}
                value={assignOfferPct}
                onChange={(v) => setAssignOfferPct(v || 0)}
                placeholder="10"
              />
            </Form.Item>
          )}

          {assignOfferType === "custom_flat" && (
            <Form.Item label="Custom Flat Discount (₹)">
              <InputNumber
                min={1}
                style={{ width: "100%" }}
                prefix="₹"
                value={assignOfferFlat}
                onChange={(v) => setAssignOfferFlat(v || 0)}
                placeholder="2000"
              />
            </Form.Item>
          )}

          <Form.Item name="remarks" label="Account Remarks">
            <Input placeholder="Optional notes regarding this fee allocation..." />
          </Form.Item>

          {/* Real-time Calculation Summary */}
          <Card
            size="small"
            style={{
              borderRadius: 8,
              background: "#ecfdf5",
              border: "1px solid #a7f3d0",
              marginBottom: 16,
            }}
          >
            <Row gutter={12} align="middle">
              <Col xs={24} sm={14}>
                <Space direction="vertical" size={2} style={{ display: "flex" }}>
                  <Text style={{ fontSize: 12 }}>
                    Annual: <b>₹{assignFeeSummary.annual.toLocaleString()}</b> + Tuition: <b>₹{assignFeeSummary.tuition.toLocaleString()}</b>
                    {assignFeeSummary.transport > 0 && ` + Transport: ₹${assignFeeSummary.transport.toLocaleString()}`}
                    {assignFeeSummary.extra > 0 && ` + Extra: ₹${assignFeeSummary.extra.toLocaleString()}`}
                  </Text>
                  <Text type="secondary" style={{ fontSize: 12 }}>
                    Gross Total: <b>₹{assignFeeSummary.gross.toLocaleString()}</b>
                    {assignFeeSummary.discount > 0 && (
                      <span style={{ color: "#059669", marginLeft: 8 }}>
                        • Discount ({assignFeeSummary.offerLabel}): <b>-₹{assignFeeSummary.discount.toLocaleString()}</b>
                      </span>
                    )}
                  </Text>
                </Space>
              </Col>
              <Col xs={24} sm={10} style={{ textAlign: "right" }}>
                <Text style={{ fontSize: 11, color: "#047857", textTransform: "uppercase", fontWeight: 700, display: "block" }}>
                  Net Payable Fee
                </Text>
                <span style={{ fontSize: 22, fontWeight: 800, color: "#065f46" }}>
                  ₹{assignFeeSummary.net.toLocaleString()}
                </span>
              </Col>
            </Row>
          </Card>

          <div style={{ textAlign: "right", marginTop: 20 }}>
            <Space>
              <Button onClick={() => setAssignModalOpen(false)}>Cancel</Button>
              <Button type="primary" htmlType="submit" loading={submittingAssign}>
                Assign & Initialize Fee
              </Button>
            </Space>
          </div>
        </Form>
      </Modal>

      {/* Student Fee Breakdown & Payment Ledger Drawer */}
      <Drawer
        title={
          selectedFeeDetail ? (
            <div>
              <Text strong style={{ fontSize: 16 }}>
                Fee Ledger: {selectedFeeDetail.student?.firstName} {selectedFeeDetail.student?.lastName || ""}
              </Text>
              <br />
              <Text type="secondary" style={{ fontSize: 12 }}>
                Adm: {selectedFeeDetail.student?.admissionNumber} | Roll #{selectedFeeDetail.student?.rollNumber}
              </Text>
            </div>
          ) : (
            "Student Fee Ledger"
          )
        }
        placement="right"
        width={560}
        onClose={() => setDetailDrawerOpen(false)}
        open={detailDrawerOpen}
      >
        {selectedFeeDetail && (
          <div>
            {/* Top Financial Summary */}
            <Card
              size="small"
              style={{
                borderRadius: 8,
                background: "#f0fdf4",
                border: "1px solid #bbf7d0",
                marginBottom: 16,
              }}
            >
              <Row gutter={12}>
                <Col span={8}>
                  <Statistic
                    title={<span style={{ fontSize: 11 }}>Payable Amount</span>}
                    value={`₹${(selectedFeeDetail.payableAmount || 0).toLocaleString()}`}
                    valueStyle={{ fontSize: 16, fontWeight: 700, color: "#c2410c" }}
                  />
                </Col>
                <Col span={8}>
                  <Statistic
                    title={<span style={{ fontSize: 11 }}>Paid Amount</span>}
                    value={`₹${(selectedFeeDetail.paidAmount || 0).toLocaleString()}`}
                    valueStyle={{ fontSize: 16, fontWeight: 700, color: "#15803d" }}
                  />
                </Col>
                <Col span={8}>
                  <Statistic
                    title={<span style={{ fontSize: 11 }}>Due Balance</span>}
                    value={`₹${(selectedFeeDetail.dueAmount || 0).toLocaleString()}`}
                    valueStyle={{
                      fontSize: 16,
                      fontWeight: 700,
                      color: selectedFeeDetail.dueAmount > 0 ? "#b91c1c" : "#15803d",
                    }}
                  />
                </Col>
              </Row>
            </Card>

            <Title level={5}>Fee Structure Breakdown</Title>
            <Descriptions bordered size="small" column={1} style={{ marginBottom: 20 }}>
              <Descriptions.Item label="Academic Session">
                {selectedFeeDetail.academicYear?.name || "Current Session"}
              </Descriptions.Item>
              <Descriptions.Item label="Payment Status">
                <Tag
                  color={
                    selectedFeeDetail.status === "paid"
                      ? "green"
                      : selectedFeeDetail.status === "partial"
                      ? "orange"
                      : "red"
                  }
                >
                  {(selectedFeeDetail.status || "PENDING").toUpperCase()}
                </Tag>
              </Descriptions.Item>
              {selectedFeeDetail.annualCharges > 0 && (
                <Descriptions.Item label="Annual & Dev Charges">
                  ₹{selectedFeeDetail.annualCharges.toLocaleString()}
                </Descriptions.Item>
              )}
              {selectedFeeDetail.monthlyTuition > 0 && (
                <Descriptions.Item label="Monthly Tuition">
                  ₹{selectedFeeDetail.monthlyTuition.toLocaleString()}/mo ×{" "}
                  {selectedFeeDetail.tuitionMonths || 12} mos = ₹
                  {(
                    (selectedFeeDetail.monthlyTuition || 0) *
                    (selectedFeeDetail.tuitionMonths || 12)
                  ).toLocaleString()}
                </Descriptions.Item>
              )}
              {selectedFeeDetail.transportFee > 0 && (
                <Descriptions.Item label="Transport / Bus Fee">
                  ₹{selectedFeeDetail.transportFee.toLocaleString()}{" "}
                  {selectedFeeDetail.transportDetails?.route &&
                    `(${selectedFeeDetail.transportDetails.route})`}
                </Descriptions.Item>
              )}
              {selectedFeeDetail.extraFees > 0 && (
                <Descriptions.Item label="Extra / Activity Charges">
                  ₹{selectedFeeDetail.extraFees.toLocaleString()}
                </Descriptions.Item>
              )}
              {selectedFeeDetail.discount > 0 && (
                <Descriptions.Item label="Applied Scholarship / Concession">
                  <Tag color="green">
                    {selectedFeeDetail.offer?.name || "Discount"}: -₹
                    {selectedFeeDetail.discount.toLocaleString()}
                  </Tag>
                </Descriptions.Item>
              )}
              {selectedFeeDetail.remarks && (
                <Descriptions.Item label="Remarks">
                  {selectedFeeDetail.remarks}
                </Descriptions.Item>
              )}
            </Descriptions>

            {/* Payment Receipts History */}
            <Title level={5}>Payment Collection History ({selectedFeePayments.length})</Title>
            {selectedFeePayments.length > 0 ? (
              <Table
                size="small"
                dataSource={selectedFeePayments}
                rowKey="_id"
                pagination={false}
                columns={[
                  {
                    title: "Receipt",
                    dataIndex: "receiptNumber",
                    key: "receiptNumber",
                    render: (r) => <Tag color="geekblue">{r}</Tag>,
                  },
                  {
                    title: "Amount",
                    dataIndex: "amount",
                    key: "amount",
                    render: (amt) => <Text strong style={{ color: "#15803d" }}>₹{amt.toLocaleString()}</Text>,
                  },
                  {
                    title: "Mode",
                    dataIndex: "paymentMethod",
                    key: "paymentMethod",
                    render: (m) => <Tag color="cyan">{m?.toUpperCase()}</Tag>,
                  },
                  {
                    title: "Date",
                    dataIndex: "paymentDate",
                    key: "paymentDate",
                    render: (d) => dayjs(d).format("DD MMM YYYY"),
                  },
                  {
                    title: "Action",
                    key: "action",
                    render: (_, p) => (
                      <Button
                        size="small"
                        icon={<PrinterOutlined />}
                        onClick={() => {
                          setCurrentReceipt(p);
                          setReceiptModalOpen(true);
                        }}
                      >
                        Print
                      </Button>
                    ),
                  },
                ]}
              />
            ) : (
              <Text type="secondary">No payments collected yet for this fee structure.</Text>
            )}

            <div style={{ marginTop: 24, textAlign: "right" }}>
              <Space>
                {selectedFeeDetail.dueAmount > 0 && (
                  <Button
                    type="primary"
                    icon={<CreditCardOutlined />}
                    onClick={() => {
                      setDetailDrawerOpen(false);
                      handleOpenPaymentModal(selectedFeeDetail);
                    }}
                    style={{ background: "#10b981", borderColor: "#10b981" }}
                  >
                    Collect Payment Now
                  </Button>
                )}
                <Button onClick={() => setDetailDrawerOpen(false)}>Close</Button>
              </Space>
            </div>
          </div>
        )}
      </Drawer>

      {/* Edit Student Fee Modal */}
      <Modal
        title={`Adjust Student Fee — ${editingFee?.student?.firstName || "Student"}`}
        open={editModalOpen}
        onCancel={() => setEditModalOpen(false)}
        footer={null}
        destroyOnClose
      >
        <Form form={editForm} layout="vertical" onFinish={handleUpdateFee} style={{ marginTop: 16 }}>
          <Row gutter={16}>
            <Col xs={24} sm={12}>
              <Form.Item name="annualCharges" label="Annual Charges (₹)">
                <InputNumber min={0} style={{ width: "100%" }} prefix="₹" />
              </Form.Item>
            </Col>
            <Col xs={24} sm={12}>
              <Form.Item name="monthlyTuition" label="Monthly Tuition (₹)">
                <InputNumber min={0} style={{ width: "100%" }} prefix="₹" />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col xs={24} sm={12}>
              <Form.Item name="tuitionMonths" label="Tuition Months">
                <InputNumber min={1} max={12} style={{ width: "100%" }} />
              </Form.Item>
            </Col>
            <Col xs={24} sm={12}>
              <Form.Item name="transportFee" label="Transport Fee (₹)">
                <InputNumber min={0} style={{ width: "100%" }} prefix="₹" />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col xs={24} sm={12}>
              <Form.Item name="extraFees" label="Extra / Activity Charges (₹)">
                <InputNumber min={0} style={{ width: "100%" }} prefix="₹" />
              </Form.Item>
            </Col>
            <Col xs={24} sm={12}>
              <Form.Item name="discount" label="Concession / Discount (₹)">
                <InputNumber min={0} style={{ width: "100%" }} prefix="₹" />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item name="remarks" label="Adjustment Reason / Remarks">
            <Input placeholder="Reason for adjusting fee breakdown..." />
          </Form.Item>

          <div style={{ textAlign: "right", marginTop: 20 }}>
            <Space>
              <Button onClick={() => setEditModalOpen(false)}>Cancel</Button>
              <Button type="primary" htmlType="submit" loading={editSubmitting}>
                Save Adjustment
              </Button>
            </Space>
          </div>
        </Form>
      </Modal>

      {/* Create Fee Structure Modal */}
      <Modal
        title="Create Fee Structure Template"
        open={structureModalOpen}
        onCancel={() => setStructureModalOpen(false)}
        footer={null}
        width={600}
        destroyOnClose
      >
        <Form
          form={structureForm}
          layout="vertical"
          onFinish={handleCreateStructure}
          initialValues={{
            components: [
              { name: "Tuition Fee", amount: 15000 },
              { name: "Library & Lab Fee", amount: 2500 },
            ],
          }}
          style={{ marginTop: 16 }}
        >
          <Form.Item
            name="name"
            label="Structure Name"
            rules={[{ required: true, message: "Enter name (e.g. Standard Annual Fee 2026)" }]}
          >
            <Input placeholder="e.g. Grade 10 Standard Annual Fee" />
          </Form.Item>

          <Form.Item
            name="classId"
            label="Applicable Class / Grade"
            rules={[{ required: true, message: "Select class" }]}
          >
            <Select placeholder="Select Class">
              {classes.map((c) => (
                <Option key={c._id} value={c._id}>{c.name} ({c.code})</Option>
              ))}
            </Select>
          </Form.Item>

          <Divider orientation="left" style={{ fontSize: 13, color: "#1677ff" }}>
            Fee Component Heads
          </Divider>

          <Form.List name="components">
            {(fields, { add, remove }) => (
              <>
                {fields.map(({ key, name, ...restField }) => (
                  <Row key={key} gutter={16} align="middle" style={{ marginBottom: 8 }}>
                    <Col span={14}>
                      <Form.Item
                        {...restField}
                        name={[name, "name"]}
                        rules={[{ required: true, message: "Component name required" }]}
                        style={{ margin: 0 }}
                      >
                        <Input placeholder="Component (e.g. Sports Fee)" />
                      </Form.Item>
                    </Col>
                    <Col span={8}>
                      <Form.Item
                        {...restField}
                        name={[name, "amount"]}
                        rules={[{ required: true, message: "Amount required" }]}
                        style={{ margin: 0 }}
                      >
                        <InputNumber min={0} placeholder="Amount" style={{ width: "100%" }} />
                      </Form.Item>
                    </Col>
                    <Col span={2}>
                      <Button type="text" danger onClick={() => remove(name)} icon={<DeleteOutlined />} />
                    </Col>
                  </Row>
                ))}
                <Button type="dashed" onClick={() => add()} block icon={<PlusOutlined />} style={{ marginTop: 8 }}>
                  Add Component Head
                </Button>
              </>
            )}
          </Form.List>

          <div style={{ textAlign: "right", marginTop: 24 }}>
            <Space>
              <Button onClick={() => setStructureModalOpen(false)}>Cancel</Button>
              <Button type="primary" htmlType="submit" loading={submittingStructure}>
                Create Structure Template
              </Button>
            </Space>
          </div>
        </Form>
      </Modal>
    </div>
  );
}
