"use client";

import React, { useState, useEffect } from "react";
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
  const [statusFilter, setStatusFilter] = useState("all");

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

  // Receipt Modal
  const [receiptModalOpen, setReceiptModalOpen] = useState(false);
  const [currentReceipt, setCurrentReceipt] = useState(null);

  const [assignForm] = Form.useForm();
  const [structureForm] = Form.useForm();
  const [paymentForm] = Form.useForm();

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

  const fetchStudentFees = async (yearId) => {
    if (!yearId) return;
    setLoading(true);
    try {
      let query = `academicYear=${yearId}`;
      if (statusFilter !== "all") query += `&status=${statusFilter}`;
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
      fetchStudentFees(selectedYear);
      fetchPayments();
    }
  }, [selectedYear, statusFilter]);

  // Assign Fee to Student
  const handleAssignFee = async (values) => {
    setSubmittingAssign(true);
    try {
      const payload = {
        studentId: values.studentId,
        academicYear: selectedYear,
        feeStructureId: values.feeStructureId,
        discount: Number(values.discount || 0),
      };

      const { data } = await api.post("/student-fees", payload);
      if (data.success) {
        message.success("Fee assigned to student successfully");
        setAssignModalOpen(false);
        assignForm.resetFields();
        fetchStudentFees(selectedYear);
      }
    } catch (err) {
      message.error(err.response?.data?.message || "Failed to assign fee");
    } finally {
      setSubmittingAssign(false);
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
        </div>
      ),
    },
    {
      title: "Fee Structure",
      key: "feeStructure",
      render: (_, r) => (
        <div>
          <Text>{r.feeStructure?.name || "General Fee"}</Text>
          <br />
          <Text type="secondary" style={{ fontSize: 11 }}>
            {r.feeStructure?.components?.length || 0} Components
          </Text>
        </div>
      ),
    },
    {
      title: "Total Fee",
      dataIndex: "totalAmount",
      key: "totalAmount",
      render: (amt) => `₹${(amt || 0).toLocaleString()}`,
    },
    {
      title: "Discount",
      dataIndex: "discount",
      key: "discount",
      render: (disc) => (disc > 0 ? <Tag color="green">-₹{disc.toLocaleString()}</Tag> : "—"),
    },
    {
      title: "Payable",
      dataIndex: "payableAmount",
      key: "payableAmount",
      render: (p) => <Text strong>₹{(p || 0).toLocaleString()}</Text>,
    },
    {
      title: "Paid",
      dataIndex: "paidAmount",
      key: "paidAmount",
      render: (pd) => (
        <Text style={{ color: "#52c41a", fontWeight: 600 }}>
          ₹{(pd || 0).toLocaleString()}
        </Text>
      ),
    },
    {
      title: "Due Balance",
      dataIndex: "dueAmount",
      key: "dueAmount",
      render: (due) => (
        <Text style={{ color: due > 0 ? "#ff4d4f" : "#52c41a", fontWeight: 700 }}>
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
        <Space>
          <Button
            type="primary"
            size="small"
            icon={<CreditCardOutlined />}
            disabled={r.status === "paid"}
            onClick={() => handleOpenPaymentModal(r)}
          >
            Collect
          </Button>
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
                <Select
                  value={statusFilter}
                  onChange={setStatusFilter}
                  style={{ width: 140 }}
                >
                  <Option value="all">All Statuses</Option>
                  <Option value="pending">Pending Only</Option>
                  <Option value="partial">Partial Dues</Option>
                  <Option value="paid">Fully Paid</Option>
                </Select>
              )}

              <Button icon={<ReloadOutlined />} onClick={() => fetchStudentFees(selectedYear)}>
                Refresh
              </Button>

              {activeTab === "studentFees" && (
                <Button
                  type="primary"
                  icon={<PlusOutlined />}
                  onClick={() => {
                    assignForm.resetFields();
                    setAssignModalOpen(true);
                  }}
                  disabled={!selectedYear || feeStructures.length === 0}
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

      {/* Assign Fee Modal */}
      <Modal
        title="Assign Fee Structure to Student"
        open={assignModalOpen}
        onCancel={() => setAssignModalOpen(false)}
        footer={null}
        destroyOnClose
      >
        <Form form={assignForm} layout="vertical" onFinish={handleAssignFee} style={{ marginTop: 16 }}>
          <Form.Item
            name="studentId"
            label="Select Student"
            rules={[{ required: true, message: "Select student" }]}
          >
            <Select showSearch placeholder="Search student by name or admission no" optionFilterProp="children">
              {students.map((st) => (
                <Option key={st._id} value={st._id}>
                  {st.firstName} {st.lastName || ""} ({st.admissionNumber}) - Class: {st.class?.name || "N/A"}
                </Option>
              ))}
            </Select>
          </Form.Item>

          <Form.Item
            name="feeStructureId"
            label="Fee Structure Template"
            rules={[{ required: true, message: "Select fee structure" }]}
          >
            <Select placeholder="Select Fee Structure">
              {feeStructures.map((fs) => (
                <Option key={fs._id} value={fs._id}>
                  {fs.name} ({fs.class?.name || "Class"})
                </Option>
              ))}
            </Select>
          </Form.Item>

          <Form.Item name="discount" label="Scholarship / Fee Concession Discount (₹)">
            <InputNumber min={0} style={{ width: "100%" }} placeholder="0" />
          </Form.Item>

          <div style={{ textAlign: "right", marginTop: 24 }}>
            <Space>
              <Button onClick={() => setAssignModalOpen(false)}>Cancel</Button>
              <Button type="primary" htmlType="submit" loading={submittingAssign}>
                Assign Fee
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
