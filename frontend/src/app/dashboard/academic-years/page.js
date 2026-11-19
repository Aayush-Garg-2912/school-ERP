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
  DatePicker,
  Switch,
  message,
  Popconfirm,
  Typography,
  Row,
  Col,
  Alert,
} from "antd";
import {
  CalendarOutlined,
  PlusOutlined,
  ReloadOutlined,
  CheckCircleOutlined,
  DeleteOutlined,
  EditOutlined,
} from "@ant-design/icons";
import dayjs from "dayjs";
import api from "@/lib/api";

const { Title, Text } = Typography;

export default function AcademicYearsPage() {
  const [academicYears, setAcademicYears] = useState([]);
  const [loading, setLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingYear, setEditingYear] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [form] = Form.useForm();

  const fetchAcademicYears = async () => {
    setLoading(true);
    try {
      const { data } = await api.get("/academic-years");
      if (data.success) {
        setAcademicYears(data.data.academicYears || []);
      }
    } catch (err) {
      message.error(err.response?.data?.message || "Failed to load academic sessions");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAcademicYears();
  }, []);

  const handleOpenCreateModal = () => {
    setEditingYear(null);
    form.resetFields();
    setModalOpen(true);
  };

  const handleOpenEditModal = (record) => {
    setEditingYear(record);
    form.setFieldsValue({
      name: record.name,
      dates: [dayjs(record.startDate), dayjs(record.endDate)],
      isCurrent: record.isCurrent,
    });
    setModalOpen(true);
  };

  const handleSubmit = async (values) => {
    setSubmitting(true);
    try {
      const [startDate, endDate] = values.dates;
      const payload = {
        name: values.name.trim(),
        startDate: startDate.format("YYYY-MM-DD"),
        endDate: endDate.format("YYYY-MM-DD"),
        isCurrent: values.isCurrent || false,
      };

      if (editingYear) {
        const { data } = await api.put(`/academic-years/${editingYear._id}`, payload);
        if (data.success) {
          message.success("Academic year updated successfully");
        }
      } else {
        const { data } = await api.post("/academic-years", payload);
        if (data.success) {
          message.success("Academic year created successfully");
        }
      }

      setModalOpen(false);
      form.resetFields();
      fetchAcademicYears();
    } catch (err) {
      message.error(err.response?.data?.message || "Operation failed");
    } finally {
      setSubmitting(false);
    }
  };

  const handleSetCurrent = async (record) => {
    try {
      const { data } = await api.put(`/academic-years/${record._id}`, { isCurrent: true });
      if (data.success) {
        message.success(`${record.name} is now set as the active session`);
        fetchAcademicYears();
      }
    } catch (err) {
      message.error(err.response?.data?.message || "Failed to set current academic session");
    }
  };

  const handleDelete = async (id) => {
    try {
      const { data } = await api.delete(`/academic-years/${id}`);
      if (data.success) {
        message.success("Academic session deleted successfully");
        fetchAcademicYears();
      }
    } catch (err) {
      message.error(err.response?.data?.message || "Failed to delete academic year");
    }
  };

  const currentSession = academicYears.find((y) => y.isCurrent);

  const columns = [
    {
      title: "Session Name",
      dataIndex: "name",
      key: "name",
      render: (text, r) => (
        <Space>
          <Text strong style={{ fontSize: 14 }}>
            {text}
          </Text>
          {r.isCurrent && (
            <Tag color="green" icon={<CheckCircleOutlined />}>
              CURRENT ACTIVE
            </Tag>
          )}
        </Space>
      ),
    },
    {
      title: "Start Date",
      dataIndex: "startDate",
      key: "startDate",
      render: (d) => (d ? dayjs(d).format("DD MMM YYYY") : "N/A"),
    },
    {
      title: "End Date",
      dataIndex: "endDate",
      key: "endDate",
      render: (d) => (d ? dayjs(d).format("DD MMM YYYY") : "N/A"),
    },
    {
      title: "Status",
      dataIndex: "status",
      key: "status",
      render: (st) => (
        <Tag color={st === "active" ? "blue" : "default"}>
          {(st || "active").toUpperCase()}
        </Tag>
      ),
    },
    {
      title: "Set Current",
      key: "setCurrent",
      render: (_, r) => (
        <Button
          size="small"
          type={r.isCurrent ? "dashed" : "default"}
          disabled={r.isCurrent}
          onClick={() => handleSetCurrent(r)}
        >
          {r.isCurrent ? "Active" : "Make Current"}
        </Button>
      ),
    },
    {
      title: "Actions",
      key: "actions",
      render: (_, r) => (
        <Space>
          <Button
            type="text"
            icon={<EditOutlined />}
            size="small"
            onClick={() => handleOpenEditModal(r)}
          />
          <Popconfirm
            title="Delete session"
            description="Are you sure you want to delete this session?"
            onConfirm={() => handleDelete(r._id)}
            okText="Yes, Delete"
            cancelText="Cancel"
            okButtonProps={{ danger: true }}
            disabled={r.isCurrent}
          >
            <Button
              type="text"
              danger
              icon={<DeleteOutlined />}
              size="small"
              disabled={r.isCurrent}
            />
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <div>
      {/* Current Session Quick Info Alert */}
      {currentSession && (
        <Alert
          message={
            <Space>
              <CheckCircleOutlined style={{ color: "#52c41a" }} />
              <Text strong>
                Active Academic Session: {currentSession.name}
              </Text>
              <Text type="secondary">
                ({dayjs(currentSession.startDate).format("DD MMM YYYY")} to{" "}
                {dayjs(currentSession.endDate).format("DD MMM YYYY")})
              </Text>
            </Space>
          }
          type="success"
          showIcon={false}
          style={{ marginBottom: 20, borderRadius: 8 }}
        />
      )}

      <Card style={{ borderRadius: 12 }}>
        <Row justify="space-between" align="middle" style={{ marginBottom: 20 }} gutter={[16, 16]}>
          <Col>
            <Title level={4} style={{ margin: 0 }}>
              Academic Sessions & Years
            </Title>
            <Text type="secondary">
              Manage school session cycles, term dates, and active session configurations
            </Text>
          </Col>

          <Col>
            <Space>
              <Button icon={<ReloadOutlined />} onClick={fetchAcademicYears}>
                Refresh
              </Button>
              <Button
                type="primary"
                icon={<PlusOutlined />}
                onClick={handleOpenCreateModal}
              >
                New Academic Session
              </Button>
            </Space>
          </Col>
        </Row>

        <Table
          columns={columns}
          dataSource={academicYears}
          rowKey="_id"
          loading={loading}
          pagination={false}
        />
      </Card>

      {/* Create / Edit Modal */}
      <Modal
        title={editingYear ? "Edit Academic Session" : "Create New Academic Session"}
        open={modalOpen}
        onCancel={() => setModalOpen(false)}
        footer={null}
        destroyOnClose
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={handleSubmit}
          initialValues={{ isCurrent: false }}
          style={{ marginTop: 16 }}
        >
          <Form.Item
            name="name"
            label="Session Name"
            rules={[{ required: true, message: "Please enter session name (e.g. 2026-2027)" }]}
          >
            <Input placeholder="e.g. 2026-2027" />
          </Form.Item>

          <Form.Item
            name="dates"
            label="Session Duration (Start & End Dates)"
            rules={[{ required: true, message: "Please select start and end dates" }]}
          >
            <DatePicker.RangePicker
              style={{ width: "100%" }}
              format="YYYY-MM-DD"
            />
          </Form.Item>

          <Form.Item
            name="isCurrent"
            label="Make this the Active / Current Academic Session?"
            valuePropName="checked"
          >
            <Switch />
          </Form.Item>

          <div style={{ textAlign: "right", marginTop: 24 }}>
            <Space>
              <Button onClick={() => setModalOpen(false)}>Cancel</Button>
              <Button type="primary" htmlType="submit" loading={submitting}>
                {editingYear ? "Save Changes" : "Create Session"}
              </Button>
            </Space>
          </div>
        </Form>
      </Modal>
    </div>
  );
}
