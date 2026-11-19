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
  Switch,
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
  ApartmentOutlined,
  CheckCircleOutlined,
} from "@ant-design/icons";
import api from "@/lib/api";

const { Title, Text } = Typography;
const { Option } = Select;

export default function SubjectsPage() {
  const [activeTab, setActiveTab] = useState("master");
  const [subjects, setSubjects] = useState([]);
  const [classes, setClasses] = useState([]);
  const [academicYears, setAcademicYears] = useState([]);
  const [selectedYear, setSelectedYear] = useState(null);
  const [selectedClass, setSelectedClass] = useState(null);
  const [classSubjects, setClassSubjects] = useState([]);
  const [loading, setLoading] = useState(false);

  // Modal States
  const [subjectModalOpen, setSubjectModalOpen] = useState(false);
  const [editingSubject, setEditingSubject] = useState(null);
  const [assignModalOpen, setAssignModalOpen] = useState(false);
  const [editingAssignment, setEditingAssignment] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const [subjectForm] = Form.useForm();
  const [assignForm] = Form.useForm();

  // Fetch initial academic years, classes, and subjects
  const fetchInitialData = async () => {
    try {
      const [yearRes, subjectRes] = await Promise.all([
        api.get("/academic-years"),
        api.get("/subjects"),
      ]);
      if (yearRes.data.success) {
        const years = yearRes.data.data.academicYears || [];
        setAcademicYears(years);
        const current = years.find((y) => y.isCurrent) || years[0];
        if (current) {
          setSelectedYear(current._id);
        }
      }
      if (subjectRes.data.success) {
        setSubjects(subjectRes.data.data.subjects || []);
      }
    } catch (err) {
      console.error("Failed to load initial data:", err);
    }
  };

  const fetchClasses = async (yearId) => {
    if (!yearId) return;
    try {
      const { data } = await api.get(`/classes?academicYear=${yearId}`);
      if (data.success) {
        const clsList = data.data.classes || [];
        setClasses(clsList);
        if (clsList.length > 0 && !selectedClass) {
          setSelectedClass(clsList[0]._id);
        }
      }
    } catch (err) {
      console.error("Failed to load classes:", err);
    }
  };

  const fetchSubjects = async () => {
    setLoading(true);
    try {
      const { data } = await api.get("/subjects");
      if (data.success) {
        setSubjects(data.data.subjects || []);
      }
    } catch (err) {
      message.error(err.response?.data?.message || "Failed to load subjects");
    } finally {
      setLoading(false);
    }
  };

  const fetchClassSubjects = async (yearId, classId) => {
    if (!yearId) return;
    setLoading(true);
    try {
      let query = `academicYear=${yearId}`;
      if (classId) query += `&classId=${classId}`;
      const { data } = await api.get(`/class-subjects?${query}`);
      if (data.success) {
        setClassSubjects(data.data.classSubjects || []);
      }
    } catch (err) {
      message.error(err.response?.data?.message || "Failed to load class subjects");
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
    }
  }, [selectedYear]);

  useEffect(() => {
    if (selectedYear) {
      fetchClassSubjects(selectedYear, selectedClass);
    }
  }, [selectedYear, selectedClass]);

  // Subject Master Actions
  const handleOpenSubjectModal = (record = null) => {
    setEditingSubject(record);
    if (record) {
      subjectForm.setFieldsValue({
        name: record.name,
        code: record.code,
        type: record.type || "theory",
        maxMarks: record.maxMarks || 100,
        passingMarks: record.passingMarks || 40,
        isOptional: record.isOptional || false,
      });
    } else {
      subjectForm.resetFields();
      subjectForm.setFieldsValue({
        type: "theory",
        maxMarks: 100,
        passingMarks: 40,
        isOptional: false,
      });
    }
    setSubjectModalOpen(true);
  };

  const handleSubjectSubmit = async (values) => {
    setSubmitting(true);
    try {
      const payload = {
        name: values.name.trim(),
        code: values.code.trim().toUpperCase(),
        type: values.type,
        maxMarks: Number(values.maxMarks),
        passingMarks: Number(values.passingMarks),
        isOptional: values.isOptional || false,
      };

      if (editingSubject) {
        const { data } = await api.put(`/subjects/${editingSubject._id}`, payload);
        if (data.success) message.success("Subject updated successfully");
      } else {
        const { data } = await api.post("/subjects", payload);
        if (data.success) message.success("Subject created successfully");
      }
      setSubjectModalOpen(false);
      subjectForm.resetFields();
      fetchSubjects();
    } catch (err) {
      message.error(err.response?.data?.message || "Failed to save subject");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteSubject = async (id) => {
    try {
      const { data } = await api.delete(`/subjects/${id}`);
      if (data.success) {
        message.success("Subject deleted successfully");
        fetchSubjects();
      }
    } catch (err) {
      message.error(err.response?.data?.message || "Failed to delete subject");
    }
  };

  // Class Subject Mapping Actions
  const handleOpenAssignModal = (record = null) => {
    setEditingAssignment(record);
    if (record) {
      assignForm.setFieldsValue({
        classId: record.class?._id || record.class,
        subjectId: record.subject?._id || record.subject,
        isCompulsory: record.isCompulsory ?? true,
        periodsPerWeek: record.periodsPerWeek || 5,
        maxMarks: record.maxMarks || 100,
        passingMarks: record.passingMarks || 40,
      });
    } else {
      assignForm.resetFields();
      assignForm.setFieldsValue({
        classId: selectedClass || (classes[0]?._id ?? undefined),
        isCompulsory: true,
        periodsPerWeek: 5,
        maxMarks: 100,
        passingMarks: 40,
      });
    }
    setAssignModalOpen(true);
  };

  const handleAssignSubmit = async (values) => {
    setSubmitting(true);
    try {
      if (editingAssignment) {
        const { data } = await api.put(`/class-subjects/${editingAssignment._id}`, {
          isCompulsory: values.isCompulsory,
          periodsPerWeek: Number(values.periodsPerWeek),
          maxMarks: Number(values.maxMarks),
          passingMarks: Number(values.passingMarks),
        });
        if (data.success) message.success("Class subject updated successfully");
      } else {
        const { data } = await api.post("/class-subjects", {
          academicYear: selectedYear,
          classId: values.classId,
          subjectId: values.subjectId,
          isCompulsory: values.isCompulsory,
          periodsPerWeek: Number(values.periodsPerWeek),
          maxMarks: Number(values.maxMarks),
          passingMarks: Number(values.passingMarks),
        });
        if (data.success) message.success("Subject assigned to class successfully");
      }
      setAssignModalOpen(false);
      assignForm.resetFields();
      fetchClassSubjects(selectedYear, selectedClass);
    } catch (err) {
      message.error(err.response?.data?.message || "Failed to assign subject");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteAssignment = async (id) => {
    try {
      const { data } = await api.delete(`/class-subjects/${id}`);
      if (data.success) {
        message.success("Subject removed from class");
        fetchClassSubjects(selectedYear, selectedClass);
      }
    } catch (err) {
      message.error(err.response?.data?.message || "Failed to remove subject");
    }
  };

  // Master Table Columns
  const subjectColumns = [
    {
      title: "Subject Name",
      dataIndex: "name",
      key: "name",
      render: (text) => <Text strong style={{ fontSize: 14 }}>{text}</Text>,
    },
    {
      title: "Subject Code",
      dataIndex: "code",
      key: "code",
      render: (code) => <Tag color="blue">{code}</Tag>,
    },
    {
      title: "Type",
      dataIndex: "type",
      key: "type",
      render: (t) => (
        <Tag color={t === "practical" ? "orange" : t === "both" ? "purple" : "cyan"}>
          {(t || "THEORY").toUpperCase()}
        </Tag>
      ),
    },
    {
      title: "Default Max Marks",
      dataIndex: "maxMarks",
      key: "maxMarks",
      render: (m) => m ?? 100,
    },
    {
      title: "Passing Marks",
      dataIndex: "passingMarks",
      key: "passingMarks",
      render: (p) => p ?? 40,
    },
    {
      title: "Optional",
      dataIndex: "isOptional",
      key: "isOptional",
      render: (opt) => (opt ? <Tag color="warning">Optional</Tag> : <Tag color="success">Core</Tag>),
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
            onClick={() => handleOpenSubjectModal(r)}
          />
          <Popconfirm
            title="Delete subject"
            description="Are you sure you want to delete this subject?"
            onConfirm={() => handleDeleteSubject(r._id)}
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

  // Class Subject Mapping Columns
  const mappingColumns = [
    {
      title: "Subject Name",
      key: "subjectName",
      render: (_, r) => <Text strong>{r.subject?.name || "N/A"}</Text>,
    },
    {
      title: "Code",
      key: "subjectCode",
      render: (_, r) => <Tag color="blue">{r.subject?.code || "N/A"}</Tag>,
    },
    {
      title: "Class / Grade",
      key: "className",
      render: (_, r) => r.class?.name || "N/A",
    },
    {
      title: "Subject Nature",
      dataIndex: "isCompulsory",
      key: "isCompulsory",
      render: (comp) =>
        comp !== false ? (
          <Tag color="green" icon={<CheckCircleOutlined />}>
            COMPULSORY
          </Tag>
        ) : (
          <Tag color="orange">ELECTIVE / OPTIONAL</Tag>
        ),
    },
    {
      title: "Periods / Week",
      dataIndex: "periodsPerWeek",
      key: "periodsPerWeek",
      render: (p) => `${p ?? 5} Periods`,
    },
    {
      title: "Marks (Pass / Max)",
      key: "marks",
      render: (_, r) => `${r.passingMarks ?? 40} / ${r.maxMarks ?? 100}`,
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
            onClick={() => handleOpenAssignModal(r)}
          />
          <Popconfirm
            title="Remove subject"
            description="Are you sure you want to remove this subject from this class?"
            onConfirm={() => handleDeleteAssignment(r._id)}
            okText="Yes, Remove"
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
              Subjects & Curriculum Master
            </Title>
            <Text type="secondary">
              Manage subject catalog (theory & practical) and map curriculum by class
            </Text>
          </Col>

          <Col>
            <Space wrap>
              {activeTab === "mapping" && (
                <>
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

                  <Select
                    value={selectedClass}
                    onChange={setSelectedClass}
                    style={{ width: 170 }}
                    placeholder="Filter by Class"
                    allowClear
                  >
                    {classes.map((c) => (
                      <Option key={c._id} value={c._id}>
                        {c.name}
                      </Option>
                    ))}
                  </Select>
                </>
              )}

              <Button
                icon={<ReloadOutlined />}
                onClick={() => {
                  fetchSubjects();
                  if (selectedYear) fetchClassSubjects(selectedYear, selectedClass);
                }}
              >
                Refresh
              </Button>

              {activeTab === "master" ? (
                <Button
                  type="primary"
                  icon={<PlusOutlined />}
                  onClick={() => handleOpenSubjectModal()}
                >
                  Create Subject
                </Button>
              ) : (
                <Button
                  type="primary"
                  icon={<PlusOutlined />}
                  onClick={() => handleOpenAssignModal()}
                  disabled={!selectedYear || classes.length === 0}
                >
                  Assign to Class
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
              key: "master",
              label: (
                <span>
                  <BookOutlined /> Central Subjects Catalog ({subjects.length})
                </span>
              ),
              children: (
                <Table
                  columns={subjectColumns}
                  dataSource={subjects}
                  rowKey="_id"
                  loading={loading}
                  pagination={{ pageSize: 10 }}
                />
              ),
            },
            {
              key: "mapping",
              label: (
                <span>
                  <ApartmentOutlined /> Class Curriculum Mappings ({classSubjects.length})
                </span>
              ),
              children: (
                <Table
                  columns={mappingColumns}
                  dataSource={classSubjects}
                  rowKey="_id"
                  loading={loading}
                  pagination={{ pageSize: 10 }}
                />
              ),
            },
          ]}
        />
      </Card>

      {/* Subject Master Modal */}
      <Modal
        title={editingSubject ? "Edit Subject" : "Create New Subject"}
        open={subjectModalOpen}
        onCancel={() => setSubjectModalOpen(false)}
        footer={null}
        destroyOnClose
      >
        <Form
          form={subjectForm}
          layout="vertical"
          onFinish={handleSubjectSubmit}
          style={{ marginTop: 16 }}
        >
          <Form.Item
            name="name"
            label="Subject Name"
            rules={[{ required: true, message: "Enter subject name (e.g. Mathematics)" }]}
          >
            <Input placeholder="e.g. Mathematics" />
          </Form.Item>

          <Row gutter={16}>
            <Col xs={24} sm={12}>
              <Form.Item
                name="code"
                label="Subject Code"
                rules={[{ required: true, message: "Enter code (e.g. MATH101)" }]}
              >
                <Input placeholder="e.g. MATH101" style={{ textTransform: "uppercase" }} />
              </Form.Item>
            </Col>
            <Col xs={24} sm={12}>
              <Form.Item
                name="type"
                label="Subject Type"
                rules={[{ required: true, message: "Select type" }]}
              >
                <Select>
                  <Option value="theory">Theory</Option>
                  <Option value="practical">Practical</Option>
                  <Option value="both">Theory + Practical</Option>
                </Select>
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col xs={24} sm={12}>
              <Form.Item name="maxMarks" label="Maximum Marks">
                <InputNumber min={1} style={{ width: "100%" }} />
              </Form.Item>
            </Col>
            <Col xs={24} sm={12}>
              <Form.Item name="passingMarks" label="Passing Marks">
                <InputNumber min={0} style={{ width: "100%" }} />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item
            name="isOptional"
            label="Is this an Optional / Elective subject by default?"
            valuePropName="checked"
          >
            <Switch />
          </Form.Item>

          <div style={{ textAlign: "right", marginTop: 24 }}>
            <Space>
              <Button onClick={() => setSubjectModalOpen(false)}>Cancel</Button>
              <Button type="primary" htmlType="submit" loading={submitting}>
                {editingSubject ? "Save Changes" : "Create Subject"}
              </Button>
            </Space>
          </div>
        </Form>
      </Modal>

      {/* Class Subject Assignment Modal */}
      <Modal
        title={editingAssignment ? "Edit Class Subject Mapping" : "Assign Subject to Class"}
        open={assignModalOpen}
        onCancel={() => setAssignModalOpen(false)}
        footer={null}
        destroyOnClose
      >
        <Form
          form={assignForm}
          layout="vertical"
          onFinish={handleAssignSubmit}
          style={{ marginTop: 16 }}
        >
          <Form.Item
            name="classId"
            label="Target Class / Grade"
            rules={[{ required: true, message: "Select class" }]}
          >
            <Select placeholder="Select Class" disabled={!!editingAssignment}>
              {classes.map((c) => (
                <Option key={c._id} value={c._id}>
                  {c.name} ({c.code})
                </Option>
              ))}
            </Select>
          </Form.Item>

          <Form.Item
            name="subjectId"
            label="Select Subject"
            rules={[{ required: true, message: "Select subject" }]}
          >
            <Select placeholder="Select Subject" disabled={!!editingAssignment}>
              {subjects.map((s) => (
                <Option key={s._id} value={s._id}>
                  {s.name} ({s.code}) - {s.type}
                </Option>
              ))}
            </Select>
          </Form.Item>

          <Row gutter={16}>
            <Col xs={24} sm={12}>
              <Form.Item
                name="periodsPerWeek"
                label="Weekly Periods"
                rules={[{ required: true, message: "Enter periods" }]}
              >
                <InputNumber min={1} max={30} style={{ width: "100%" }} />
              </Form.Item>
            </Col>
            <Col xs={24} sm={12}>
              <Form.Item
                name="isCompulsory"
                label="Nature"
                valuePropName="checked"
              >
                <Switch checkedChildren="Compulsory" unCheckedChildren="Elective" defaultChecked />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col xs={24} sm={12}>
              <Form.Item name="maxMarks" label="Exam Max Marks">
                <InputNumber min={1} style={{ width: "100%" }} />
              </Form.Item>
            </Col>
            <Col xs={24} sm={12}>
              <Form.Item name="passingMarks" label="Exam Passing Marks">
                <InputNumber min={0} style={{ width: "100%" }} />
              </Form.Item>
            </Col>
          </Row>

          <div style={{ textAlign: "right", marginTop: 24 }}>
            <Space>
              <Button onClick={() => setAssignModalOpen(false)}>Cancel</Button>
              <Button type="primary" htmlType="submit" loading={submitting}>
                {editingAssignment ? "Save Changes" : "Assign Subject"}
              </Button>
            </Space>
          </div>
        </Form>
      </Modal>
    </div>
  );
}
