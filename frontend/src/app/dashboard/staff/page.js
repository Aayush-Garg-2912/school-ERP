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
  Switch,
  Popconfirm,
  Typography,
  Row,
  Col,
  Avatar,
  message,
} from "antd";
import {
  UserOutlined,
  PlusOutlined,
  ReloadOutlined,
  EditOutlined,
  DeleteOutlined,
  SearchOutlined,
  CrownOutlined,
  SafetyCertificateOutlined,
  DollarOutlined,
} from "@ant-design/icons";
import api from "@/lib/api";
import { useAuth } from "@/context/AuthContext";

const { Title, Text } = Typography;
const { Option } = Select;

export default function StaffPage() {
  const { user: currentUser } = useAuth();
  const [staff, setStaff] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchText, setSearchText] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");

  // Modals
  const [modalOpen, setModalOpen] = useState(false);
  const [editingStaff, setEditingStaff] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [tempPasswordNotice, setTempPasswordNotice] = useState(null);

  const [form] = Form.useForm();

  const fetchStaff = async () => {
    setLoading(true);
    try {
      const { data } = await api.get("/staff");
      if (data.success) {
        setStaff(data.data.staff || []);
      }
    } catch (err) {
      message.error(err.response?.data?.message || "Failed to load staff accounts");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStaff();
  }, []);

  // Determine allowed roles the current user can create
  const getAllowedRoles = () => {
    const actorRole = currentUser?.role;
    if (actorRole === "chairman") {
      return [
        { label: "Principal", value: "principal" },
        { label: "Administrator", value: "admin" },
        { label: "Accountant", value: "accountant" },
      ];
    }
    if (actorRole === "principal") {
      return [
        { label: "Administrator", value: "admin" },
        { label: "Accountant", value: "accountant" },
      ];
    }
    if (actorRole === "admin") {
      return [{ label: "Accountant", value: "accountant" }];
    }
    return [];
  };

  const handleOpenModal = (record = null) => {
    setEditingStaff(record);
    if (record) {
      form.setFieldsValue({
        name: record.name,
        email: record.email,
        phone: record.phone,
        role: record.role?.name || record.role,
        isActive: record.isActive !== false,
      });
    } else {
      form.resetFields();
      const allowed = getAllowedRoles();
      if (allowed.length > 0) {
        form.setFieldsValue({ role: allowed[0].value, isActive: true });
      }
    }
    setModalOpen(true);
  };

  const handleSubmit = async (values) => {
    setSubmitting(true);
    try {
      const payload = {
        name: values.name.trim(),
        email: values.email.trim().toLowerCase(),
        phone: values.phone,
        role: values.role,
        isActive: values.isActive,
        password: values.password || undefined,
      };

      if (editingStaff) {
        const { data } = await api.put(`/staff/${editingStaff._id}`, payload);
        if (data.success) message.success("Staff account updated successfully");
      } else {
        const { data } = await api.post("/staff", payload);
        if (data.success) {
          message.success("Staff account created successfully!");
          if (data.data?.temporaryPassword) {
            setTempPasswordNotice({
              email: data.data.user.email,
              tempPassword: data.data.temporaryPassword,
              role: data.data.user.role,
            });
          }
        }
      }
      setModalOpen(false);
      form.resetFields();
      fetchStaff();
    } catch (err) {
      message.error(err.response?.data?.message || "Operation failed");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id) => {
    try {
      const { data } = await api.delete(`/staff/${id}`);
      if (data.success) {
        message.success("Staff account deleted successfully");
        fetchStaff();
      }
    } catch (err) {
      message.error(err.response?.data?.message || "Failed to delete account");
    }
  };

  const filteredStaff = staff.filter((s) => {
    const roleName = s.role?.name || s.role || "";
    const matchRole = roleFilter === "all" || roleName === roleFilter;
    const q = searchText.toLowerCase();
    const matchSearch =
      (s.name || "").toLowerCase().includes(q) ||
      (s.email || "").toLowerCase().includes(q) ||
      roleName.toLowerCase().includes(q);
    return matchRole && matchSearch;
  });

  const roleMeta = {
    principal: { color: "gold", icon: <CrownOutlined />, label: "PRINCIPAL" },
    admin: { color: "blue", icon: <SafetyCertificateOutlined />, label: "ADMIN" },
    accountant: { color: "green", icon: <DollarOutlined />, label: "ACCOUNTANT" },
  };

  const columns = [
    {
      title: "Staff Member",
      key: "name",
      render: (_, r) => (
        <Space>
          <Avatar style={{ backgroundColor: "#1677ff" }}>
            {r.name?.[0]?.toUpperCase()}
          </Avatar>
          <div>
            <Text strong>{r.name}</Text>
            <br />
            <Text type="secondary" style={{ fontSize: 12 }}>{r.email}</Text>
          </div>
        </Space>
      ),
    },
    {
      title: "System Role",
      key: "role",
      render: (_, r) => {
        const roleName = r.role?.name || r.role || "staff";
        const meta = roleMeta[roleName] || { color: "default", icon: null, label: roleName.toUpperCase() };
        return (
          <Tag color={meta.color} icon={meta.icon}>
            {meta.label}
          </Tag>
        );
      },
    },
    {
      title: "Contact Phone",
      dataIndex: "phone",
      key: "phone",
      render: (p) => p || "N/A",
    },
    {
      title: "Status",
      dataIndex: "isActive",
      key: "isActive",
      render: (active) => (
        <Tag color={active !== false ? "green" : "volcano"}>
          {active !== false ? "ACTIVE" : "INACTIVE"}
        </Tag>
      ),
    },
    {
      title: "Actions",
      key: "actions",
      width: 120,
      render: (_, r) => (
        <Space>
          <Button
            type="text"
            icon={<EditOutlined />}
            size="small"
            onClick={() => handleOpenModal(r)}
          />
          <Popconfirm
            title="Delete Staff Account"
            description="Are you sure you want to delete this administrative account?"
            onConfirm={() => handleDelete(r._id)}
            okText="Yes, Delete"
            cancelText="Cancel"
            okButtonProps={{ danger: true }}
          >
            <Button type="text" danger icon={<DeleteOutlined />} size="small" />
          </Popconfirm>
        </Space>
      ),
    },
  ];

  const allowedRoles = getAllowedRoles();

  return (
    <div>
      {/* Temporary Password Notice */}
      <Modal
        title="Administrative Account Created"
        open={!!tempPasswordNotice}
        onOk={() => setTempPasswordNotice(null)}
        cancelButtonProps={{ style: { display: "none" } }}
      >
        <p>A new administrative login has been provisioned successfully:</p>
        <Card size="small" style={{ background: "#f8fafc", borderRadius: 8 }}>
          <p><strong>Login Email:</strong> {tempPasswordNotice?.email}</p>
          <p><strong>Assigned Role:</strong> <Tag color="blue">{tempPasswordNotice?.role?.toUpperCase()}</Tag></p>
          <p><strong>Temporary Password:</strong> <Tag color="green">{tempPasswordNotice?.tempPassword}</Tag></p>
        </Card>
        <Text type="secondary" style={{ fontSize: 12, marginTop: 12, display: "block" }}>
          Please share these credentials securely with the staff member.
        </Text>
      </Modal>

      <Card style={{ borderRadius: 12 }}>
        <Row justify="space-between" align="middle" style={{ marginBottom: 20 }} gutter={[16, 16]}>
          <Col>
            <Title level={4} style={{ margin: 0 }}>
              Staff & Administrative Accounts
            </Title>
            <Text type="secondary">
              Manage system permissions and credentials for Principals, Admins, and Accountants
            </Text>
          </Col>

          <Col>
            <Space wrap>
              <Select
                value={roleFilter}
                onChange={setRoleFilter}
                style={{ width: 160 }}
              >
                <Option value="all">All Roles ({staff.length})</Option>
                <Option value="principal">Principals</Option>
                <Option value="admin">Admins</Option>
                <Option value="accountant">Accountants</Option>
              </Select>

              <Input
                placeholder="Search staff by name or email..."
                prefix={<SearchOutlined style={{ color: "#9ca3af" }} />}
                value={searchText}
                onChange={(e) => setSearchText(e.target.value)}
                style={{ width: 260 }}
                allowClear
              />

              <Button icon={<ReloadOutlined />} onClick={fetchStaff}>
                Refresh
              </Button>

              {allowedRoles.length > 0 && (
                <Button
                  type="primary"
                  icon={<PlusOutlined />}
                  onClick={() => handleOpenModal()}
                >
                  Create Staff Account
                </Button>
              )}
            </Space>
          </Col>
        </Row>

        <Table
          columns={columns}
          dataSource={filteredStaff}
          rowKey="_id"
          loading={loading}
          pagination={{ pageSize: 10 }}
        />
      </Card>

      {/* Create / Edit Staff Modal */}
      <Modal
        title={editingStaff ? "Edit Staff Account" : "Create Administrative Staff Account"}
        open={modalOpen}
        onCancel={() => setModalOpen(false)}
        footer={null}
        destroyOnClose
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={handleSubmit}
          style={{ marginTop: 16 }}
        >
          <Form.Item
            name="name"
            label="Full Name"
            rules={[{ required: true, message: "Enter full name" }]}
          >
            <Input placeholder="e.g. Sarah Jenkins" />
          </Form.Item>

          <Form.Item
            name="email"
            label="Official Email (Login ID)"
            rules={[
              { required: true, message: "Enter email address" },
              { type: "email", message: "Enter a valid email" },
            ]}
          >
            <Input placeholder="sarah.jenkins@school.edu" />
          </Form.Item>

          <Row gutter={16}>
            <Col xs={24} sm={12}>
              <Form.Item
                name="role"
                label="System Role"
                rules={[{ required: true, message: "Select role" }]}
              >
                <Select placeholder="Select Role">
                  {allowedRoles.map((r) => (
                    <Option key={r.value} value={r.value}>
                      {r.label}
                    </Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>

            <Col xs={24} sm={12}>
              <Form.Item name="phone" label="Phone Number">
                <Input placeholder="+91 98765 43210" />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item
            name="password"
            label={editingStaff ? "Reset Password (Leave blank to keep current)" : "Custom Password (Optional)"}
            help="If left blank, a secure random password will be generated automatically."
          >
            <Input.Password placeholder="••••••••" />
          </Form.Item>

          {editingStaff && (
            <Form.Item
              name="isActive"
              label="Account Status"
              valuePropName="checked"
            >
              <Switch checkedChildren="Active" unCheckedChildren="Inactive" />
            </Form.Item>
          )}

          <div style={{ textAlign: "right", marginTop: 24 }}>
            <Space>
              <Button onClick={() => setModalOpen(false)}>Cancel</Button>
              <Button type="primary" htmlType="submit" loading={submitting}>
                {editingStaff ? "Save Account Changes" : "Create Account"}
              </Button>
            </Space>
          </div>
        </Form>
      </Modal>
    </div>
  );
}
