"use client";

import React, { useState, useEffect } from "react";
import {
  Card,
  List,
  Button,
  Tag,
  Space,
  Modal,
  Form,
  Input,
  Select,
  Switch,
  message,
  Popconfirm,
  Typography,
  Row,
  Col,
} from "antd";
import {
  NotificationOutlined,
  PlusOutlined,
  PushpinOutlined,
  EyeOutlined,
  EyeInvisibleOutlined,
  DeleteOutlined,
  ReloadOutlined,
} from "@ant-design/icons";
import api from "@/lib/api";
import { useAuth } from "@/context/AuthContext";

const { Title, Text, Paragraph } = Typography;
const { TextArea } = Input;
const { Option } = Select;

export default function NoticesPage() {
  const [notices, setNotices] = useState([]);
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [loading, setLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [form] = Form.useForm();
  const { user } = useAuth();

  const isStaff = ["chairman", "principal", "admin"].includes(user?.role);

  const fetchNotices = async () => {
    setLoading(true);
    try {
      const endpoint = isStaff ? "/notices/all" : "/notices";
      const { data } = await api.get(endpoint);
      if (data.success) {
        setNotices(data.data.notices || []);
      }
    } catch (err) {
      message.error(err.response?.data?.message || "Failed to load notices");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNotices();
  }, [user]);

  const handleCreateNotice = async (values) => {
    setSubmitting(true);
    try {
      const { data } = await api.post("/notices", {
        title: values.title,
        content: values.content,
        category: values.category,
        targetAudience: values.targetAudience,
      });

      if (data.success) {
        message.success("Notice draft created successfully");
        setModalOpen(false);
        form.resetFields();
        fetchNotices();
      }
    } catch (err) {
      message.error(err.response?.data?.message || "Failed to create notice");
    } finally {
      setSubmitting(false);
    }
  };

  const handleTogglePublish = async (id) => {
    try {
      const { data } = await api.patch(`/notices/${id}/publish`);
      message.success(data.message || "Publish state updated");
      fetchNotices();
    } catch (err) {
      message.error(err.response?.data?.message || "Failed to update publish state");
    }
  };

  const handleTogglePin = async (id) => {
    try {
      const { data } = await api.patch(`/notices/${id}/pin`);
      message.success(data.message || "Pin state updated");
      fetchNotices();
    } catch (err) {
      message.error(err.response?.data?.message || "Failed to update pin state");
    }
  };

  const handleDelete = async (id) => {
    try {
      await api.delete(`/notices/${id}`);
      message.success("Notice deleted successfully");
      fetchNotices();
    } catch (err) {
      message.error(err.response?.data?.message || "Failed to delete notice");
    }
  };

  const categoryColorMap = {
    general: "blue",
    academic: "cyan",
    exam: "purple",
    event: "magenta",
    holiday: "green",
    fee: "gold",
    emergency: "red",
    other: "default",
  };

  return (
    <div>
      <Card style={{ borderRadius: 12 }}>
        <Row justify="space-between" align="middle" style={{ marginBottom: 20 }}>
          <Col>
            <Title level={4} style={{ margin: 0 }}>
              Institutional Notice Board
            </Title>
            <Text type="secondary">
              {user?.role === "student"
                ? "Official school circulars, event guidelines, and notifications provided by faculty & staff"
                : "Official school announcements and community circulars"}
            </Text>
          </Col>

          <Col>
            <Space wrap>
              {user?.role === "student" && (
                <Tag color="blue" icon={<NotificationOutlined />}>
                  Published by Faculty & Staff
                </Tag>
              )}
              <Select
                value={categoryFilter}
                onChange={setCategoryFilter}
                style={{ width: 160 }}
              >
                <Option value="all">All Categories</Option>
                <Option value="academic">Academic</Option>
                <Option value="event">Events</Option>
                <Option value="exam">Examinations</Option>
                <Option value="holiday">Holidays</Option>
                <Option value="fee">Fees</Option>
                <Option value="general">General</Option>
              </Select>
              <Button icon={<ReloadOutlined />} onClick={fetchNotices}>
                Refresh
              </Button>
              {isStaff && (
                <Button
                  type="primary"
                  icon={<PlusOutlined />}
                  onClick={() => setModalOpen(true)}
                >
                  Post Notice
                </Button>
              )}
            </Space>
          </Col>
        </Row>

        <List
          itemLayout="vertical"
          size="large"
          loading={loading}
          dataSource={notices.filter((n) => categoryFilter === "all" || n.category === categoryFilter)}
          renderItem={(item) => (
            <List.Item
              key={item._id}
              style={{
                background: item.pinned ? "#fffbe6" : "#ffffff",
                border: item.pinned ? "1px solid #ffe58f" : "1px solid #f0f0f0",
                borderRadius: 8,
                padding: "16px 20px",
                marginBottom: 16,
              }}
              actions={
                isStaff
                  ? [
                      <Button
                        key="publish"
                        size="small"
                        icon={item.published ? <EyeInvisibleOutlined /> : <EyeOutlined />}
                        onClick={() => handleTogglePublish(item._id)}
                      >
                        {item.published ? "Unpublish" : "Publish"}
                      </Button>,
                      <Button
                        key="pin"
                        size="small"
                        type={item.pinned ? "primary" : "default"}
                        icon={<PushpinOutlined />}
                        onClick={() => handleTogglePin(item._id)}
                      >
                        {item.pinned ? "Pinned" : "Pin"}
                      </Button>,
                      <Popconfirm
                        key="delete"
                        title="Delete Notice"
                        description="Are you sure you want to delete this notice?"
                        onConfirm={() => handleDelete(item._id)}
                        okText="Yes"
                        cancelText="No"
                        okButtonProps={{ danger: true }}
                      >
                        <Button size="small" danger icon={<DeleteOutlined />}>
                          Delete
                        </Button>
                      </Popconfirm>,
                    ]
                  : []
              }
            >
              <List.Item.Meta
                title={
                  <Space align="center" wrap>
                    {item.pinned && <Tag color="red">PINNED</Tag>}
                    <Tag color={categoryColorMap[item.category] || "default"}>
                      {(item.category || "GENERAL").toUpperCase()}
                    </Tag>
                    {isStaff && (
                      <Tag color={item.published ? "green" : "default"}>
                        {item.published ? "PUBLISHED" : "DRAFT"}
                      </Tag>
                    )}
                    <Text strong style={{ fontSize: 16 }}>
                      {item.title}
                    </Text>
                  </Space>
                }
                description={
                  <Space size="middle" style={{ fontSize: 12, color: "#9ca3af" }}>
                    <span>
                      Audience: {item.targetAudience?.join(", ")?.toUpperCase() || "ALL"}
                    </span>
                    <span>•</span>
                    <span>
                      Posted: {new Date(item.createdAt).toLocaleDateString()}
                    </span>
                    {item.createdBy?.name && (
                      <>
                        <span>•</span>
                        <span>By: {item.createdBy.name}</span>
                      </>
                    )}
                  </Space>
                }
              />
              <Paragraph style={{ margin: "12px 0 0", color: "#374151", whiteSpace: "pre-line" }}>
                {item.content}
              </Paragraph>
            </List.Item>
          )}
        />
      </Card>

      {/* New Notice Modal */}
      <Modal
        title="Compose New Institutional Notice"
        open={modalOpen}
        onCancel={() => setModalOpen(false)}
        footer={null}
        width={600}
        destroyOnClose
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={handleCreateNotice}
          initialValues={{ category: "general", targetAudience: ["all"] }}
          style={{ marginTop: 16 }}
        >
          <Form.Item
            name="title"
            label="Notice Title"
            rules={[{ required: true, message: "Enter notice title" }]}
          >
            <Input placeholder="e.g. Annual Sports Day Announcement" />
          </Form.Item>

          <Row gutter={16}>
            <Col xs={24} sm={12}>
              <Form.Item
                name="category"
                label="Category"
                rules={[{ required: true, message: "Select category" }]}
              >
                <Select>
                  <Option value="general">General</Option>
                  <Option value="academic">Academic</Option>
                  <Option value="exam">Examination</Option>
                  <Option value="event">Event / Activity</Option>
                  <Option value="holiday">Holiday</Option>
                  <Option value="fee">Fee Circular</Option>
                  <Option value="emergency">Emergency Alert</Option>
                </Select>
              </Form.Item>
            </Col>

            <Col xs={24} sm={12}>
              <Form.Item
                name="targetAudience"
                label="Target Audience"
                rules={[{ required: true, message: "Select audience" }]}
              >
                <Select mode="multiple">
                  <Option value="all">Everyone (All)</Option>
                  <Option value="teacher">Teachers</Option>
                  <Option value="student">Students</Option>
                  <Option value="parent">Parents</Option>
                  <Option value="staff">Staff</Option>
                </Select>
              </Form.Item>
            </Col>
          </Row>

          <Form.Item
            name="content"
            label="Notice Description / Content"
            rules={[{ required: true, message: "Enter notice body content" }]}
          >
            <TextArea rows={5} placeholder="Write the complete announcement text..." />
          </Form.Item>

          <div style={{ textAlign: "right", marginTop: 16 }}>
            <Space>
              <Button onClick={() => setModalOpen(false)}>Cancel</Button>
              <Button type="primary" htmlType="submit" loading={submitting}>
                Save Notice Draft
              </Button>
            </Space>
          </div>
        </Form>
      </Modal>
    </div>
  );
}
