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
  List,
  Divider,
  message,
} from "antd";
import {
  TeamOutlined,
  UserAddOutlined,
  ReloadOutlined,
  EditOutlined,
  DeleteOutlined,
  SearchOutlined,
  UserOutlined,
  PhoneOutlined,
  MailOutlined,
  EyeOutlined,
} from "@ant-design/icons";
import api from "@/lib/api";

const { Title, Text } = Typography;
const { Option } = Select;

export default function ParentsPage() {
  const [parents, setParents] = useState([]);
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchText, setSearchText] = useState("");

  // Modals state
  const [modalOpen, setModalOpen] = useState(false);
  const [editingParent, setEditingParent] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  // View details modal
  const [detailsModalOpen, setDetailsModalOpen] = useState(false);
  const [selectedParentDetails, setSelectedParentDetails] = useState(null);
  const [detailsLoading, setDetailsLoading] = useState(false);

  const [form] = Form.useForm();

  const fetchParents = async () => {
    setLoading(true);
    try {
      const { data } = await api.get("/parents");
      if (data.success) {
        setParents(data.data.parents || []);
      }
    } catch (err) {
      message.error(err.response?.data?.message || "Failed to load parents");
    } finally {
      setLoading(false);
    }
  };

  const fetchStudents = async () => {
    try {
      const { data } = await api.get("/students");
      if (data.success) {
        setStudents(data.data.students || []);
      }
    } catch (err) {
      console.error("Failed to load students for linking:", err);
    }
  };

  useEffect(() => {
    fetchParents();
    fetchStudents();
  }, []);

  const handleOpenModal = (record = null) => {
    setEditingParent(record);
    if (record) {
      form.setFieldsValue({
        parentId: record.parentId,
        firstName: record.firstName,
        lastName: record.lastName,
        relation: record.relation || "guardian",
        phone: record.phone,
        email: record.email,
        isActive: record.isActive !== false,
      });
    } else {
      form.resetFields();
      form.setFieldsValue({ relation: "father", isActive: true });
    }
    setModalOpen(true);
  };

  const handleSubmit = async (values) => {
    setSubmitting(true);
    try {
      if (editingParent) {
        const payload = {
          firstName: values.firstName.trim(),
          lastName: values.lastName ? values.lastName.trim() : "",
          phone: values.phone,
          email: values.email.trim().toLowerCase(),
          relation: values.relation,
          isActive: values.isActive,
          password: values.password || undefined,
        };
        const { data } = await api.put(`/parents/${editingParent._id}`, payload);
        if (data.success) message.success("Parent profile updated successfully");
      } else {
        const payload = {
          parentId: values.parentId.trim().toUpperCase(),
          firstName: values.firstName.trim(),
          lastName: values.lastName ? values.lastName.trim() : "",
          phone: values.phone,
          email: values.email.trim().toLowerCase(),
          password: values.password,
          relation: values.relation,
          studentId: values.studentId,
        };
        const { data } = await api.post("/parents", payload);
        if (data.success) message.success("Parent account and student link created!");
      }
      setModalOpen(false);
      form.resetFields();
      fetchParents();
    } catch (err) {
      message.error(err.response?.data?.message || "Operation failed");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id) => {
    try {
      const { data } = await api.delete(`/parents/${id}`);
      if (data.success) {
        message.success("Parent and login account deleted successfully");
        fetchParents();
      }
    } catch (err) {
      message.error(err.response?.data?.message || "Failed to delete parent");
    }
  };

  const handleViewDetails = async (record) => {
    setDetailsModalOpen(true);
    setDetailsLoading(true);
    try {
      const { data } = await api.get(`/parents/${record._id}`);
      if (data.success) {
        setSelectedParentDetails(data.data);
      }
    } catch (err) {
      message.error("Failed to fetch parent details and linked students");
    } finally {
      setDetailsLoading(false);
    }
  };

  const filteredParents = parents.filter((p) => {
    const fullName = `${p.firstName} ${p.lastName || ""}`.toLowerCase();
    const pid = (p.parentId || "").toLowerCase();
    const ph = (p.phone || "").toLowerCase();
    const em = (p.email || "").toLowerCase();
    const q = searchText.toLowerCase();
    return fullName.includes(q) || pid.includes(q) || ph.includes(q) || em.includes(q);
  });

  const relationColorMap = {
    father: "blue",
    mother: "magenta",
    guardian: "purple",
    other: "default",
  };

  const columns = [
    {
      title: "Parent ID",
      dataIndex: "parentId",
      key: "parentId",
      render: (id) => <Tag color="blue">{id}</Tag>,
    },
    {
      title: "Parent / Guardian Name",
      key: "name",
      render: (_, r) => (
        <Space>
          <Avatar style={{ backgroundColor: "#87d068" }}>
            {r.firstName?.[0]?.toUpperCase()}
          </Avatar>
          <div>
            <Text strong>{r.firstName} {r.lastName || ""}</Text>
            <br />
            <Text type="secondary" style={{ fontSize: 12 }}>{r.email}</Text>
          </div>
        </Space>
      ),
    },
    {
      title: "Relationship",
      dataIndex: "relation",
      key: "relation",
      render: (rel) => (
        <Tag color={relationColorMap[rel?.toLowerCase()] || "default"}>
          {(rel || "GUARDIAN").toUpperCase()}
        </Tag>
      ),
    },
    {
      title: "Phone Number",
      dataIndex: "phone",
      key: "phone",
      render: (p) => p || "N/A",
    },
    {
      title: "Account Status",
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
      width: 140,
      render: (_, r) => (
        <Space>
          <Button
            type="text"
            icon={<EyeOutlined />}
            size="small"
            onClick={() => handleViewDetails(r)}
            title="View Linked Children"
          />
          <Button
            type="text"
            icon={<EditOutlined />}
            size="small"
            onClick={() => handleOpenModal(r)}
            title="Edit Profile"
          />
          <Popconfirm
            title="Delete Parent Account"
            description="Are you sure you want to remove this parent and their login account?"
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

  return (
    <div>
      <Card style={{ borderRadius: 12 }}>
        <Row justify="space-between" align="middle" style={{ marginBottom: 20 }} gutter={[16, 16]}>
          <Col>
            <Title level={4} style={{ margin: 0 }}>
              Parents & Guardians Directory
            </Title>
            <Text type="secondary">
              Total Registered Parents: {filteredParents.length}
            </Text>
          </Col>

          <Col>
            <Space wrap>
              <Input
                placeholder="Search by name, ID, phone or email..."
                prefix={<SearchOutlined style={{ color: "#9ca3af" }} />}
                value={searchText}
                onChange={(e) => setSearchText(e.target.value)}
                style={{ width: 290 }}
                allowClear
              />

              <Button icon={<ReloadOutlined />} onClick={fetchParents}>
                Refresh
              </Button>

              <Button
                type="primary"
                icon={<UserAddOutlined />}
                onClick={() => handleOpenModal()}
              >
                Register Parent
              </Button>
            </Space>
          </Col>
        </Row>

        <Table
          columns={columns}
          dataSource={filteredParents}
          rowKey="_id"
          loading={loading}
          pagination={{ pageSize: 10 }}
        />
      </Card>

      {/* Register / Edit Parent Modal */}
      <Modal
        title={editingParent ? "Edit Parent Profile" : "Register Parent & Link Student"}
        open={modalOpen}
        onCancel={() => setModalOpen(false)}
        footer={null}
        width={680}
        destroyOnClose
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={handleSubmit}
          style={{ marginTop: 16 }}
        >
          <Row gutter={16}>
            <Col xs={24} sm={8}>
              <Form.Item
                name="parentId"
                label="Parent ID"
                rules={[{ required: true, message: "Enter parent ID" }]}
              >
                <Input placeholder="e.g. PAR-001" style={{ textTransform: "uppercase" }} disabled={!!editingParent} />
              </Form.Item>
            </Col>
            <Col xs={24} sm={8}>
              <Form.Item
                name="firstName"
                label="First Name"
                rules={[{ required: true, message: "Enter first name" }]}
              >
                <Input placeholder="First Name" />
              </Form.Item>
            </Col>
            <Col xs={24} sm={8}>
              <Form.Item name="lastName" label="Last Name">
                <Input placeholder="Last Name" />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col xs={24} sm={12}>
              <Form.Item
                name="email"
                label="Parent Email (Login Username)"
                rules={[
                  { required: true, message: "Enter email" },
                  { type: "email", message: "Enter a valid email" },
                ]}
              >
                <Input placeholder="parent@email.com" />
              </Form.Item>
            </Col>

            <Col xs={24} sm={12}>
              <Form.Item
                name="phone"
                label="Phone Number"
                rules={[{ required: true, message: "Enter phone number" }]}
              >
                <Input placeholder="+91 98765 43210" />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col xs={24} sm={12}>
              <Form.Item
                name="relation"
                label="Relationship to Child"
                rules={[{ required: true, message: "Select relationship" }]}
              >
                <Select placeholder="Select Relationship">
                  <Option value="father">Father</Option>
                  <Option value="mother">Mother</Option>
                  <Option value="guardian">Legal Guardian</Option>
                  <Option value="other">Other</Option>
                </Select>
              </Form.Item>
            </Col>

            <Col xs={24} sm={12}>
              <Form.Item
                name="password"
                label={editingParent ? "Reset Password (Optional)" : "Login Password"}
                rules={editingParent ? [] : [{ required: true, message: "Enter password" }, { min: 6, message: "At least 6 characters" }]}
              >
                <Input.Password placeholder="••••••••" />
              </Form.Item>
            </Col>
          </Row>

          {!editingParent && (
            <Form.Item
              name="studentId"
              label="Link With Enrolled Student"
              rules={[{ required: true, message: "Select student to link" }]}
            >
              <Select
                showSearch
                placeholder="Search and select student by name or admission number"
                optionFilterProp="children"
              >
                {students.map((s) => (
                  <Option key={s._id} value={s._id}>
                    {s.firstName} {s.lastName || ""} ({s.admissionNumber}) - Roll: {s.rollNumber}
                  </Option>
                ))}
              </Select>
            </Form.Item>
          )}

          {editingParent && (
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
                {editingParent ? "Save Changes" : "Register Parent"}
              </Button>
            </Space>
          </div>
        </Form>
      </Modal>

      {/* View Linked Children Modal */}
      <Modal
        title="Parent Details & Linked Students"
        open={detailsModalOpen}
        onCancel={() => setDetailsModalOpen(false)}
        footer={null}
        width={600}
      >
        {selectedParentDetails && (
          <div>
            <Card size="small" style={{ background: "#f8fafc", borderRadius: 8, marginBottom: 16 }}>
              <Row gutter={[16, 8]}>
                <Col span={12}>
                  <Text type="secondary">Parent Name:</Text>
                  <br />
                  <Text strong>{selectedParentDetails.parent.firstName} {selectedParentDetails.parent.lastName || ""}</Text>
                </Col>
                <Col span={12}>
                  <Text type="secondary">Parent ID:</Text>
                  <br />
                  <Tag color="blue">{selectedParentDetails.parent.parentId}</Tag>
                </Col>
                <Col span={12}>
                  <Text type="secondary">Email:</Text>
                  <br />
                  <Text>{selectedParentDetails.parent.email}</Text>
                </Col>
                <Col span={12}>
                  <Text type="secondary">Phone:</Text>
                  <br />
                  <Text>{selectedParentDetails.parent.phone}</Text>
                </Col>
              </Row>
            </Card>

            <Title level={5} style={{ marginBottom: 12 }}>
              Linked Children ({selectedParentDetails.students?.length || 0})
            </Title>

            <List
              dataSource={selectedParentDetails.students || []}
              renderItem={(item) => (
                <List.Item style={{ padding: "12px 8px", background: "#fff", border: "1px solid #f0f0f0", borderRadius: 8, marginBottom: 8 }}>
                  <List.Item.Meta
                    avatar={<Avatar icon={<UserOutlined />} style={{ backgroundColor: "#1677ff" }} />}
                    title={
                      <Space>
                        <Text strong>{item.student?.firstName} {item.student?.lastName || ""}</Text>
                        <Tag color="cyan">Adm: {item.student?.admissionNumber}</Tag>
                      </Space>
                    }
                    description={`Roll No: ${item.student?.rollNumber || "N/A"}`}
                  />
                </List.Item>
              )}
            />
          </div>
        )}
      </Modal>
    </div>
  );
}
