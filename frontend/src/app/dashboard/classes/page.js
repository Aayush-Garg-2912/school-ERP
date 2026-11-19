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
  Popconfirm,
  Typography,
  Row,
  Col,
  message,
} from "antd";
import {
  BookOutlined,
  PlusOutlined,
  ReloadOutlined,
  EditOutlined,
  DeleteOutlined,
  AppstoreOutlined,
  ApartmentOutlined,
} from "@ant-design/icons";
import api from "@/lib/api";

const { Title, Text } = Typography;
const { Option } = Select;

export default function ClassesPage() {
  const [activeTab, setActiveTab] = useState("classes");
  const [academicYears, setAcademicYears] = useState([]);
  const [selectedYear, setSelectedYear] = useState(null);
  const [classes, setClasses] = useState([]);
  const [sections, setSections] = useState([]);
  const [loading, setLoading] = useState(false);

  // Modals state
  const [classModalOpen, setClassModalOpen] = useState(false);
  const [editingClass, setEditingClass] = useState(null);
  const [sectionModalOpen, setSectionModalOpen] = useState(false);
  const [editingSection, setEditingSection] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const [classForm] = Form.useForm();
  const [sectionForm] = Form.useForm();

  // Load academic years
  const fetchAcademicYears = async () => {
    try {
      const { data } = await api.get("/academic-years");
      if (data.success) {
        const years = data.data.academicYears || [];
        setAcademicYears(years);
        const current = years.find((y) => y.isCurrent) || years[0];
        if (current && !selectedYear) {
          setSelectedYear(current._id);
        }
      }
    } catch (err) {
      console.error("Failed to load academic sessions:", err);
    }
  };

  const fetchClassesAndSections = async (yearId) => {
    if (!yearId) return;
    setLoading(true);
    try {
      const [classRes, sectionRes] = await Promise.all([
        api.get(`/classes?academicYear=${yearId}`),
        api.get(`/sections?academicYear=${yearId}`),
      ]);
      if (classRes.data.success) {
        setClasses(classRes.data.data.classes || []);
      }
      if (sectionRes.data.success) {
        setSections(sectionRes.data.data.sections || []);
      }
    } catch (err) {
      message.error(err.response?.data?.message || "Failed to load classes and sections");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAcademicYears();
  }, []);

  useEffect(() => {
    if (selectedYear) {
      fetchClassesAndSections(selectedYear);
    }
  }, [selectedYear]);

  // Class Actions
  const handleOpenClassModal = (cls = null) => {
    setEditingClass(cls);
    if (cls) {
      classForm.setFieldsValue({
        name: cls.name,
        code: cls.code,
        order: cls.order,
      });
    } else {
      classForm.resetFields();
      classForm.setFieldsValue({ order: (classes.length + 1) * 10 });
    }
    setClassModalOpen(true);
  };

  const handleClassSubmit = async (values) => {
    setSubmitting(true);
    try {
      if (editingClass) {
        const { data } = await api.put(`/classes/${editingClass._id}`, {
          name: values.name.trim(),
          code: values.code.trim().toUpperCase(),
          order: Number(values.order),
        });
        if (data.success) message.success("Class updated successfully");
      } else {
        const { data } = await api.post("/classes", {
          academicYear: selectedYear,
          name: values.name.trim(),
          code: values.code.trim().toUpperCase(),
          order: Number(values.order),
        });
        if (data.success) message.success("Class created successfully");
      }
      setClassModalOpen(false);
      classForm.resetFields();
      fetchClassesAndSections(selectedYear);
    } catch (err) {
      message.error(err.response?.data?.message || "Failed to save class");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteClass = async (id) => {
    try {
      const { data } = await api.delete(`/classes/${id}`);
      if (data.success) {
        message.success("Class deleted successfully");
        fetchClassesAndSections(selectedYear);
      }
    } catch (err) {
      message.error(err.response?.data?.message || "Failed to delete class");
    }
  };

  // Section Actions
  const handleOpenSectionModal = (sec = null, defaultClassId = null) => {
    setEditingSection(sec);
    if (sec) {
      sectionForm.setFieldsValue({
        classId: sec.class?._id || sec.class,
        name: sec.name,
        code: sec.code,
        capacity: sec.capacity,
        roomNumber: sec.roomNumber,
      });
    } else {
      sectionForm.resetFields();
      sectionForm.setFieldsValue({
        classId: defaultClassId || (classes[0]?._id ?? undefined),
        capacity: 40,
      });
    }
    setSectionModalOpen(true);
  };

  const handleSectionSubmit = async (values) => {
    setSubmitting(true);
    try {
      if (editingSection) {
        const { data } = await api.put(`/sections/${editingSection._id}`, {
          name: values.name.trim(),
          code: values.code.trim().toUpperCase(),
          capacity: Number(values.capacity),
          roomNumber: values.roomNumber || "",
        });
        if (data.success) message.success("Section updated successfully");
      } else {
        const { data } = await api.post("/sections", {
          academicYear: selectedYear,
          classId: values.classId,
          name: values.name.trim(),
          code: values.code.trim().toUpperCase(),
          capacity: Number(values.capacity),
          roomNumber: values.roomNumber || "",
        });
        if (data.success) message.success("Section created successfully");
      }
      setSectionModalOpen(false);
      sectionForm.resetFields();
      fetchClassesAndSections(selectedYear);
    } catch (err) {
      message.error(err.response?.data?.message || "Failed to save section");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteSection = async (id) => {
    try {
      const { data } = await api.delete(`/sections/${id}`);
      if (data.success) {
        message.success("Section deleted successfully");
        fetchClassesAndSections(selectedYear);
      }
    } catch (err) {
      message.error(err.response?.data?.message || "Failed to delete section");
    }
  };

  // Class Columns
  const classColumns = [
    {
      title: "Display Order",
      dataIndex: "order",
      key: "order",
      width: 120,
      render: (o) => <Tag color="blue">#{o}</Tag>,
    },
    {
      title: "Class / Grade Name",
      dataIndex: "name",
      key: "name",
      render: (text) => <Text strong style={{ fontSize: 14 }}>{text}</Text>,
    },
    {
      title: "Class Code",
      dataIndex: "code",
      key: "code",
      render: (code) => <Tag>{code}</Tag>,
    },
    {
      title: "Sections",
      key: "sections",
      render: (_, r) => {
        const classSections = sections.filter(
          (s) => (s.class?._id || s.class) === r._id
        );
        return (
          <Space>
            <Tag color={classSections.length > 0 ? "geekblue" : "default"}>
              {classSections.length} Sections
            </Tag>
            <Button
              size="small"
              type="link"
              icon={<PlusOutlined />}
              onClick={() => handleOpenSectionModal(null, r._id)}
            >
              Add Section
            </Button>
          </Space>
        );
      },
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
            onClick={() => handleOpenClassModal(r)}
          />
          <Popconfirm
            title="Delete class"
            description="Are you sure you want to delete this class?"
            onConfirm={() => handleDeleteClass(r._id)}
            okText="Yes"
            cancelText="No"
            okButtonProps={{ danger: true }}
          >
            <Button type="text" danger icon={<DeleteOutlined />} size="small" />
          </Popconfirm>
        </Space>
      ),
    },
  ];

  // Section Columns
  const sectionColumns = [
    {
      title: "Section Name",
      dataIndex: "name",
      key: "name",
      render: (text) => <Text strong>{text}</Text>,
    },
    {
      title: "Section Code",
      dataIndex: "code",
      key: "code",
      render: (code) => <Tag color="cyan">{code}</Tag>,
    },
    {
      title: "Class",
      key: "class",
      render: (_, r) => r.class?.name || "N/A",
    },
    {
      title: "Room Number",
      dataIndex: "roomNumber",
      key: "roomNumber",
      render: (rm) => rm || <Text type="secondary">Not Assigned</Text>,
    },
    {
      title: "Capacity",
      dataIndex: "capacity",
      key: "capacity",
      render: (cap) => `${cap} Students`,
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
            onClick={() => handleOpenSectionModal(r)}
          />
          <Popconfirm
            title="Delete section"
            description="Are you sure you want to delete this section?"
            onConfirm={() => handleDeleteSection(r._id)}
            okText="Yes"
            cancelText="No"
            okButtonProps={{ danger: true }}
          >
            <Button type="text" danger icon={<DeleteOutlined />} size="small" />
          </Popconfirm>
        </Space>
      ),
    },
  ];

  // Expanded row showing sections inside a class
  const expandedRowRender = (classRecord) => {
    const classSections = sections.filter(
      (s) => (s.class?._id || s.class) === classRecord._id
    );

    if (classSections.length === 0) {
      return (
        <div style={{ padding: "8px 16px", color: "#9ca3af" }}>
          No sections configured yet for {classRecord.name}.
        </div>
      );
    }

    return (
      <Table
        columns={[
          { title: "Section", dataIndex: "name", key: "name" },
          { title: "Code", dataIndex: "code", key: "code", render: (c) => <Tag>{c}</Tag> },
          { title: "Room", dataIndex: "roomNumber", key: "room", render: (r) => r || "N/A" },
          { title: "Capacity", dataIndex: "capacity", key: "capacity", render: (cap) => `${cap} Students` },
          {
            title: "Actions",
            key: "action",
            render: (_, sec) => (
              <Space>
                <Button size="small" type="text" icon={<EditOutlined />} onClick={() => handleOpenSectionModal(sec)} />
                <Popconfirm title="Delete section?" onConfirm={() => handleDeleteSection(sec._id)}>
                  <Button size="small" type="text" danger icon={<DeleteOutlined />} />
                </Popconfirm>
              </Space>
            ),
          },
        ]}
        dataSource={classSections}
        pagination={false}
        rowKey="_id"
        size="small"
      />
    );
  };

  return (
    <div>
      <Card style={{ borderRadius: 12 }}>
        <Row justify="space-between" align="middle" style={{ marginBottom: 20 }} gutter={[16, 16]}>
          <Col>
            <Title level={4} style={{ margin: 0 }}>
              Classes & Sections Management
            </Title>
            <Text type="secondary">
              Configure grade levels, division sections, classroom numbers, and capacities
            </Text>
          </Col>

          <Col>
            <Space wrap>
              <Select
                value={selectedYear}
                onChange={setSelectedYear}
                style={{ width: 220 }}
                placeholder="Academic Session"
              >
                {academicYears.map((y) => (
                  <Option key={y._id} value={y._id}>
                    {y.name} {y.isCurrent && "★ (Current)"}
                  </Option>
                ))}
              </Select>

              <Button
                icon={<ReloadOutlined />}
                onClick={() => fetchClassesAndSections(selectedYear)}
              >
                Refresh
              </Button>

              {activeTab === "classes" ? (
                <Button
                  type="primary"
                  icon={<PlusOutlined />}
                  onClick={() => handleOpenClassModal()}
                  disabled={!selectedYear}
                >
                  Add Class
                </Button>
              ) : (
                <Button
                  type="primary"
                  icon={<PlusOutlined />}
                  onClick={() => handleOpenSectionModal()}
                  disabled={!selectedYear || classes.length === 0}
                >
                  Add Section
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
              key: "classes",
              label: (
                <span>
                  <BookOutlined /> Classes / Grades ({classes.length})
                </span>
              ),
              children: (
                <Table
                  columns={classColumns}
                  dataSource={classes}
                  rowKey="_id"
                  loading={loading}
                  pagination={false}
                  expandable={{ expandedRowRender, defaultExpandAllRows: false }}
                />
              ),
            },
            {
              key: "sections",
              label: (
                <span>
                  <ApartmentOutlined /> All Sections ({sections.length})
                </span>
              ),
              children: (
                <Table
                  columns={sectionColumns}
                  dataSource={sections}
                  rowKey="_id"
                  loading={loading}
                  pagination={{ pageSize: 10 }}
                />
              ),
            },
          ]}
        />
      </Card>

      {/* Class Modal */}
      <Modal
        title={editingClass ? "Edit Class / Grade" : "Add New Class / Grade"}
        open={classModalOpen}
        onCancel={() => setClassModalOpen(false)}
        footer={null}
        destroyOnClose
      >
        <Form
          form={classForm}
          layout="vertical"
          onFinish={handleClassSubmit}
          style={{ marginTop: 16 }}
        >
          <Form.Item
            name="name"
            label="Class Name"
            rules={[{ required: true, message: "Enter class name (e.g. Grade 10)" }]}
          >
            <Input placeholder="e.g. Grade 10" />
          </Form.Item>

          <Form.Item
            name="code"
            label="Class Code"
            rules={[{ required: true, message: "Enter class code (e.g. G10)" }]}
          >
            <Input placeholder="e.g. G10" style={{ textTransform: "uppercase" }} />
          </Form.Item>

          <Form.Item
            name="order"
            label="Sort / Display Order"
            rules={[{ required: true, message: "Enter order number" }]}
          >
            <InputNumber min={1} style={{ width: "100%" }} />
          </Form.Item>

          <div style={{ textAlign: "right", marginTop: 24 }}>
            <Space>
              <Button onClick={() => setClassModalOpen(false)}>Cancel</Button>
              <Button type="primary" htmlType="submit" loading={submitting}>
                {editingClass ? "Save Changes" : "Create Class"}
              </Button>
            </Space>
          </div>
        </Form>
      </Modal>

      {/* Section Modal */}
      <Modal
        title={editingSection ? "Edit Section" : "Add New Section"}
        open={sectionModalOpen}
        onCancel={() => setSectionModalOpen(false)}
        footer={null}
        destroyOnClose
      >
        <Form
          form={sectionForm}
          layout="vertical"
          onFinish={handleSectionSubmit}
          style={{ marginTop: 16 }}
        >
          <Form.Item
            name="classId"
            label="Belongs to Class"
            rules={[{ required: true, message: "Select class" }]}
          >
            <Select placeholder="Select Class" disabled={!!editingSection}>
              {classes.map((c) => (
                <Option key={c._id} value={c._id}>
                  {c.name} ({c.code})
                </Option>
              ))}
            </Select>
          </Form.Item>

          <Row gutter={16}>
            <Col xs={24} sm={14}>
              <Form.Item
                name="name"
                label="Section Name"
                rules={[{ required: true, message: "Enter section name (e.g. Section A)" }]}
              >
                <Input placeholder="e.g. Section A" />
              </Form.Item>
            </Col>
            <Col xs={24} sm={10}>
              <Form.Item
                name="code"
                label="Section Code"
                rules={[{ required: true, message: "Enter code (e.g. A)" }]}
              >
                <Input placeholder="e.g. A" style={{ textTransform: "uppercase" }} />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col xs={24} sm={12}>
              <Form.Item name="roomNumber" label="Room Number">
                <Input placeholder="e.g. Room 102" />
              </Form.Item>
            </Col>
            <Col xs={24} sm={12}>
              <Form.Item
                name="capacity"
                label="Student Capacity"
                rules={[{ required: true, message: "Enter section capacity" }]}
              >
                <InputNumber min={1} max={200} style={{ width: "100%" }} />
              </Form.Item>
            </Col>
          </Row>

          <div style={{ textAlign: "right", marginTop: 24 }}>
            <Space>
              <Button onClick={() => setSectionModalOpen(false)}>Cancel</Button>
              <Button type="primary" htmlType="submit" loading={submitting}>
                {editingSection ? "Save Changes" : "Create Section"}
              </Button>
            </Space>
          </div>
        </Form>
      </Modal>
    </div>
  );
}
