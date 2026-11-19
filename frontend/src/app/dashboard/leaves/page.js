"use client";

import React, { useState, useEffect } from "react";
import {
  Card,
  Table,
  Button,
  Tag,
  Space,
  Modal,
  Form,
  Input,
  Select,
  DatePicker,
  Radio,
  Popconfirm,
  Typography,
  Row,
  Col,
  Statistic,
  Divider,
  message,
} from "antd";
import {
  ScheduleOutlined,
  PlusOutlined,
  ReloadOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  ClockCircleOutlined,
  StopOutlined,
  UserOutlined,
  FileTextOutlined,
} from "@ant-design/icons";
import dayjs from "dayjs";
import api from "@/lib/api";
import { useAuth } from "@/context/AuthContext";

const { Title, Text, Paragraph } = Typography;
const { Option } = Select;
const { TextArea } = Input;

export default function LeavesPage() {
  const { user } = useAuth();
  const [leaves, setLeaves] = useState([]);
  const [loading, setLoading] = useState(false);
  const [statusFilter, setStatusFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");

  // Modals
  const [applyModalOpen, setApplyModalOpen] = useState(false);
  const [submittingApply, setSubmittingApply] = useState(false);
  const [reviewModalOpen, setReviewModalOpen] = useState(false);
  const [selectedLeaveForReview, setSelectedLeaveForReview] = useState(null);
  const [submittingReview, setSubmittingReview] = useState(false);

  const [applyForm] = Form.useForm();
  const [reviewForm] = Form.useForm();

  const isApprover = ["chairman", "principal", "admin"].includes(user?.role);
  const canApply = ["teacher", "staff"].includes(user?.role);

  const fetchLeaves = async () => {
    setLoading(true);
    try {
      let query = "";
      if (statusFilter !== "all") query += `&status=${statusFilter}`;
      if (typeFilter !== "all") query += `&leaveType=${typeFilter}`;

      const { data } = await api.get(`/leaves?${query.replace(/^&/, "")}`);
      if (data.success) {
        setLeaves(data.data.leaves || []);
      }
    } catch (err) {
      message.error(err.response?.data?.message || "Failed to load leave applications");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLeaves();
  }, [statusFilter, typeFilter]);

  // Apply for Leave
  const handleApplyLeave = async (values) => {
    setSubmittingApply(true);
    try {
      const [from, to] = values.dates;
      const payload = {
        fromDate: from.format("YYYY-MM-DD"),
        toDate: to.format("YYYY-MM-DD"),
        leaveType: values.leaveType,
        reason: values.reason.trim(),
      };

      const { data } = await api.post("/leaves", payload);
      if (data.success) {
        message.success("Leave application submitted successfully!");
        setApplyModalOpen(false);
        applyForm.resetFields();
        fetchLeaves();
      }
    } catch (err) {
      message.error(err.response?.data?.message || "Failed to submit leave");
    } finally {
      setSubmittingApply(false);
    }
  };

  // Open Review Modal
  const handleOpenReviewModal = (record) => {
    setSelectedLeaveForReview(record);
    reviewForm.resetFields();
    reviewForm.setFieldsValue({ status: "approved" });
    setReviewModalOpen(true);
  };

  // Submit Review
  const handleSubmitReview = async (values) => {
    setSubmittingReview(true);
    try {
      const payload = {
        status: values.status,
        reviewRemarks: values.reviewRemarks || "",
      };

      const { data } = await api.patch(
        `/leaves/${selectedLeaveForReview._id}/review`,
        payload
      );
      if (data.success) {
        message.success(`Leave request ${values.status} successfully`);
        setReviewModalOpen(false);
        fetchLeaves();
      }
    } catch (err) {
      message.error(err.response?.data?.message || "Failed to review leave");
    } finally {
      setSubmittingReview(false);
    }
  };

  // Cancel Leave (by applicant)
  const handleCancelLeave = async (id) => {
    try {
      const { data } = await api.patch(`/leaves/${id}/cancel`);
      if (data.success) {
        message.success("Leave request cancelled");
        fetchLeaves();
      }
    } catch (err) {
      message.error(err.response?.data?.message || "Failed to cancel leave");
    }
  };

  // Statistics
  const pendingCount = leaves.filter((l) => l.status === "pending").length;
  const approvedCount = leaves.filter((l) => l.status === "approved").length;
  const rejectedCount = leaves.filter((l) => l.status === "rejected").length;

  const statusColorMap = {
    pending: "orange",
    approved: "green",
    rejected: "red",
    cancelled: "default",
  };

  const typeColorMap = {
    casual: "blue",
    sick: "magenta",
    emergency: "red",
    personal: "cyan",
    other: "default",
  };

  const columns = [
    {
      title: "Applicant",
      key: "applicant",
      render: (_, r) => (
        <div>
          <Text strong>{r.applicant?.name || "Faculty Member"}</Text>
          <br />
          <Tag color="geekblue" style={{ textTransform: "uppercase", fontSize: 10 }}>
            {r.applicant?.role || r.applicantType || "STAFF"}
          </Tag>
          <Text type="secondary" style={{ fontSize: 11 }}>{r.applicant?.email}</Text>
        </div>
      ),
    },
    {
      title: "Leave Category",
      dataIndex: "leaveType",
      key: "leaveType",
      render: (t) => (
        <Tag color={typeColorMap[t] || "default"} style={{ textTransform: "capitalize" }}>
          {t || "CASUAL"}
        </Tag>
      ),
    },
    {
      title: "Leave Duration",
      key: "duration",
      render: (_, r) => {
        const start = dayjs(r.fromDate);
        const end = dayjs(r.toDate);
        const days = end.diff(start, "day") + 1;
        return (
          <div>
            <Text strong>{days} {days === 1 ? "Day" : "Days"}</Text>
            <br />
            <Text type="secondary" style={{ fontSize: 12 }}>
              {start.format("DD MMM YYYY")} to {end.format("DD MMM YYYY")}
            </Text>
          </div>
        );
      },
    },
    {
      title: "Reason",
      dataIndex: "reason",
      key: "reason",
      render: (text) => (
        <Paragraph ellipsis={{ rows: 2 }} style={{ margin: 0, maxWidth: 260 }}>
          {text}
        </Paragraph>
      ),
    },
    {
      title: "Workflow Status",
      dataIndex: "status",
      key: "status",
      render: (st, r) => (
        <div>
          <Tag color={statusColorMap[st] || "default"}>
            {(st || "PENDING").toUpperCase()}
          </Tag>
          {r.reviewedBy && (
            <div style={{ fontSize: 11, color: "#6b7280", marginTop: 2 }}>
              By: {r.reviewedBy.name}
            </div>
          )}
          {r.reviewRemarks && (
            <div style={{ fontSize: 11, color: "#9ca3af", fontStyle: "italic" }}>
              &quot;{r.reviewRemarks}&quot;
            </div>
          )}
        </div>
      ),
    },
    {
      title: "Actions",
      key: "actions",
      render: (_, r) => (
        <Space>
          {isApprover && r.status === "pending" && (
            <Button
              type="primary"
              size="small"
              onClick={() => handleOpenReviewModal(r)}
            >
              Review
            </Button>
          )}

          {canApply && (r.status === "pending" || r.status === "approved") && (
            <Popconfirm
              title="Cancel this leave application?"
              onConfirm={() => handleCancelLeave(r._id)}
              okText="Yes, Cancel"
              cancelText="No"
            >
              <Button size="small" danger icon={<StopOutlined />}>
                Cancel
              </Button>
            </Popconfirm>
          )}
        </Space>
      ),
    },
  ];

  return (
    <div>
      {/* Metric Counters */}
      <Row gutter={[16, 16]} style={{ marginBottom: 20 }}>
        <Col xs={24} sm={8}>
          <Card style={{ borderRadius: 12 }}>
            <Statistic
              title="Pending Approval"
              value={pendingCount}
              prefix={<ClockCircleOutlined style={{ color: "#faad14" }} />}
              valueStyle={{ color: "#faad14", fontWeight: 700 }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={8}>
          <Card style={{ borderRadius: 12 }}>
            <Statistic
              title="Approved Requests"
              value={approvedCount}
              prefix={<CheckCircleOutlined style={{ color: "#52c41a" }} />}
              valueStyle={{ color: "#52c41a", fontWeight: 700 }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={8}>
          <Card style={{ borderRadius: 12 }}>
            <Statistic
              title="Rejected / Cancelled"
              value={rejectedCount}
              prefix={<CloseCircleOutlined style={{ color: "#ff4d4f" }} />}
              valueStyle={{ color: "#ff4d4f", fontWeight: 700 }}
            />
          </Card>
        </Col>
      </Row>

      <Card style={{ borderRadius: 12 }}>
        <Row justify="space-between" align="middle" style={{ marginBottom: 20 }} gutter={[16, 16]}>
          <Col>
            <Title level={4} style={{ margin: 0 }}>
              Leave Management & Workflow
            </Title>
            <Text type="secondary">
              Staff and faculty leave applications with administrative approval workflow
            </Text>
          </Col>

          <Col>
            <Space wrap>
              <Select
                value={statusFilter}
                onChange={setStatusFilter}
                style={{ width: 150 }}
              >
                <Option value="all">All Statuses</Option>
                <Option value="pending">Pending</Option>
                <Option value="approved">Approved</Option>
                <Option value="rejected">Rejected</Option>
                <Option value="cancelled">Cancelled</Option>
              </Select>

              <Select
                value={typeFilter}
                onChange={setTypeFilter}
                style={{ width: 150 }}
              >
                <Option value="all">All Categories</Option>
                <Option value="casual">Casual Leave</Option>
                <Option value="sick">Sick Leave</Option>
                <Option value="emergency">Emergency</Option>
                <Option value="personal">Personal</Option>
              </Select>

              <Button icon={<ReloadOutlined />} onClick={fetchLeaves}>
                Refresh
              </Button>

              {canApply && (
                <Button
                  type="primary"
                  icon={<PlusOutlined />}
                  onClick={() => {
                    applyForm.resetFields();
                    setApplyModalOpen(true);
                  }}
                >
                  Apply For Leave
                </Button>
              )}
            </Space>
          </Col>
        </Row>

        <Table
          columns={columns}
          dataSource={leaves}
          rowKey="_id"
          loading={loading}
          pagination={{ pageSize: 10 }}
        />
      </Card>

      {/* Apply For Leave Modal */}
      <Modal
        title="Submit Leave Application"
        open={applyModalOpen}
        onCancel={() => setApplyModalOpen(false)}
        footer={null}
        destroyOnClose
      >
        <Form
          form={applyForm}
          layout="vertical"
          onFinish={handleApplyLeave}
          initialValues={{ leaveType: "casual" }}
          style={{ marginTop: 16 }}
        >
          <Form.Item
            name="dates"
            label="Leave Date Duration"
            rules={[{ required: true, message: "Select leave duration" }]}
          >
            <DatePicker.RangePicker style={{ width: "100%" }} format="YYYY-MM-DD" />
          </Form.Item>

          <Form.Item
            name="leaveType"
            label="Leave Category"
            rules={[{ required: true, message: "Select category" }]}
          >
            <Select>
              <Option value="casual">Casual Leave</Option>
              <Option value="sick">Sick / Medical Leave</Option>
              <Option value="emergency">Emergency Leave</Option>
              <Option value="personal">Personal Leave</Option>
              <Option value="other">Other</Option>
            </Select>
          </Form.Item>

          <Form.Item
            name="reason"
            label="Detailed Reason"
            rules={[{ required: true, message: "Please state reason for leave" }]}
          >
            <TextArea rows={4} placeholder="Reason for leave application..." />
          </Form.Item>

          <div style={{ textAlign: "right", marginTop: 24 }}>
            <Space>
              <Button onClick={() => setApplyModalOpen(false)}>Cancel</Button>
              <Button type="primary" htmlType="submit" loading={submittingApply}>
                Submit Application
              </Button>
            </Space>
          </div>
        </Form>
      </Modal>

      {/* Review Leave Modal */}
      <Modal
        title="Review Faculty Leave Request"
        open={reviewModalOpen}
        onCancel={() => setReviewModalOpen(false)}
        footer={null}
        destroyOnClose
      >
        {selectedLeaveForReview && (
          <div style={{ marginBottom: 16 }}>
            <Card size="small" style={{ background: "#f8fafc", borderRadius: 8, marginBottom: 16 }}>
              <p><strong>Applicant:</strong> {selectedLeaveForReview.applicant?.name} ({selectedLeaveForReview.applicant?.email})</p>
              <p>
                <strong>Duration:</strong> {dayjs(selectedLeaveForReview.fromDate).format("DD MMM YYYY")} to {dayjs(selectedLeaveForReview.toDate).format("DD MMM YYYY")}
              </p>
              <p><strong>Category:</strong> <Tag color="blue">{selectedLeaveForReview.leaveType?.toUpperCase()}</Tag></p>
              <p><strong>Reason:</strong> {selectedLeaveForReview.reason}</p>
            </Card>

            <Form form={reviewForm} layout="vertical" onFinish={handleSubmitReview}>
              <Form.Item name="status" label="Decision" rules={[{ required: true }]}>
                <Radio.Group buttonStyle="solid" size="large">
                  <Radio.Button value="approved" style={{ color: "#52c41a" }}>
                    <CheckCircleOutlined /> Approve
                  </Radio.Button>
                  <Radio.Button value="rejected" style={{ color: "#ff4d4f" }}>
                    <CloseCircleOutlined /> Reject
                  </Radio.Button>
                </Radio.Group>
              </Form.Item>

              <Form.Item name="reviewRemarks" label="Reviewer Remarks / Feedback">
                <TextArea rows={3} placeholder="Optional review remarks or instructions..." />
              </Form.Item>

              <div style={{ textAlign: "right", marginTop: 20 }}>
                <Space>
                  <Button onClick={() => setReviewModalOpen(false)}>Cancel</Button>
                  <Button type="primary" htmlType="submit" loading={submittingReview}>
                    Confirm Decision
                  </Button>
                </Space>
              </div>
            </Form>
          </div>
        )}
      </Modal>
    </div>
  );
}
