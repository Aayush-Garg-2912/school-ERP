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
  Select,
  DatePicker,
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
  IdcardOutlined,
  CrownOutlined,
  ApartmentOutlined,
} from "@ant-design/icons";
import dayjs from "dayjs";
import api from "@/lib/api";

const { Title, Text } = Typography;
const { Option } = Select;

export default function TeachersPage() {
  const [activeTab, setActiveTab] = useState("directory");
  const [teachers, setTeachers] = useState([]);
  const [assignments, setAssignments] = useState([]);
  const [classes, setClasses] = useState([]);
  const [sections, setSections] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [academicYears, setAcademicYears] = useState([]);
  const [selectedYear, setSelectedYear] = useState(null);
  const [selectedClass, setSelectedClass] = useState(null);
  const [searchText, setSearchText] = useState("");
  const [loading, setLoading] = useState(false);

  // Modals state
  const [teacherModalOpen, setTeacherModalOpen] = useState(false);
  const [editingTeacher, setEditingTeacher] = useState(null);
  const [assignModalOpen, setAssignModalOpen] = useState(false);
  const [editingAssignment, setEditingAssignment] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [tempPasswordNotice, setTempPasswordNotice] = useState(null);

  const [teacherForm] = Form.useForm();
  const [assignForm] = Form.useForm();

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
        if (current) setSelectedYear(current._id);
      }
      if (subjectRes.data.success) {
        setSubjects(subjectRes.data.data.subjects || []);
      }
    } catch (err) {
      console.error("Failed to load initial data:", err);
    }
  };

  const fetchTeachers = async () => {
    setLoading(true);
    try {
      const { data } = await api.get("/teachers");
      if (data.success) {
        setTeachers(data.data.teachers || []);
      }
    } catch (err) {
      message.error(err.response?.data?.message || "Failed to load teachers");
    } finally {
      setLoading(false);
    }
  };

  const fetchClasses = async (yearId) => {
    if (!yearId) return;
    try {
      const { data } = await api.get(`/classes?academicYear=${yearId}`);
      if (data.success) {
        setClasses(data.data.classes || []);
      }
    } catch (err) {
      console.error("Failed to load classes:", err);
    }
  };

  const fetchAssignments = async (yearId) => {
    if (!yearId) return;
    setLoading(true);
    try {
      const { data } = await api.get(`/teacher-assignments?academicYear=${yearId}`);
      if (data.success) {
        setAssignments(data.data.assignments || []);
      }
    } catch (err) {
      message.error(err.response?.data?.message || "Failed to load assignments");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInitialData();
    fetchTeachers();
  }, []);

  useEffect(() => {
    if (selectedYear) {
      fetchClasses(selectedYear);
      fetchAssignments(selectedYear);
    }
  }, [selectedYear]);

  // Handle class selection in assignment modal to load sections
  const handleAssignClassChange = async (classId) => {
    setSelectedClass(classId);
    assignForm.setFieldsValue({ sectionId: undefined });
    if (!classId) {
      setSections([]);
      return;
    }
    try {
      const { data } = await api.get(`/sections?classId=${classId}`);
      if (data.success) {
        setSections(data.data.sections || []);
      }
    } catch (err) {
      console.error("Failed to load sections for class:", err);
    }
  };

  // Teacher Directory Actions
  const handleOpenTeacherModal = (record = null) => {
    setEditingTeacher(record);
    if (record) {
      teacherForm.setFieldsValue({
        employeeId: record.employeeId,
        firstName: record.firstName,
        lastName: record.lastName,
        email: record.email,
        phone: record.phone,
        gender: record.gender,
        dateOfBirth: record.dateOfBirth ? dayjs(record.dateOfBirth) : null,
        qualification: record.qualification,
        department: record.department,
        designation: record.designation,
        joiningDate: record.joiningDate ? dayjs(record.joiningDate) : null,
        address: record.address,
      });
    } else {
      teacherForm.resetFields();
    }
    setTeacherModalOpen(true);
  };

  const handleTeacherSubmit = async (values) => {
    setSubmitting(true);
    try {
      const payload = {
        employeeId: values.employeeId.trim().toUpperCase(),
        firstName: values.firstName.trim(),
        lastName: values.lastName ? values.lastName.trim() : "",
        email: values.email.trim().toLowerCase(),
        phone: values.phone,
        gender: values.gender,
        dateOfBirth: values.dateOfBirth ? values.dateOfBirth.format("YYYY-MM-DD") : undefined,
        qualification: values.qualification,
        department: values.department,
        designation: values.designation,
        joiningDate: values.joiningDate ? values.joiningDate.format("YYYY-MM-DD") : undefined,
        address: values.address,
        password: values.password || undefined,
      };

      if (editingTeacher) {
        const { data } = await api.put(`/teachers/${editingTeacher._id}`, payload);
        if (data.success) message.success("Faculty profile updated successfully");
      } else {
        const { data } = await api.post("/teachers", payload);
        if (data.success) {
          message.success("Teacher account created successfully!");
          if (data.data?.temporaryPassword) {
            setTempPasswordNotice({
              email: data.data.user.email,
              tempPassword: data.data.temporaryPassword,
            });
          }
        }
      }
      setTeacherModalOpen(false);
      teacherForm.resetFields();
      fetchTeachers();
    } catch (err) {
      message.error(err.response?.data?.message || "Failed to save teacher");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteTeacher = async (id) => {
    try {
      const { data } = await api.delete(`/teachers/${id}`);
      if (data.success) {
        message.success("Teacher and login account removed");
        fetchTeachers();
      }
    } catch (err) {
      message.error(err.response?.data?.message || "Failed to delete teacher");
    }
  };

  // Assignment Actions
  const handleOpenAssignModal = (record = null) => {
    setEditingAssignment(record);
    if (record) {
      assignForm.setFieldsValue({
        teacherId: record.teacher?._id || record.teacher,
        classId: record.class?._id || record.class,
        sectionId: record.section?._id || record.section,
        subjectId: record.subject?._id || record.subject,
        isClassTeacher: record.isClassTeacher || false,
      });
      if (record.class?._id || record.class) {
        handleAssignClassChange(record.class?._id || record.class);
      }
    } else {
      assignForm.resetFields();
      assignForm.setFieldsValue({ isClassTeacher: false });
    }
    setAssignModalOpen(true);
  };

  const handleAssignSubmit = async (values) => {
    setSubmitting(true);
    try {
      if (editingAssignment) {
        const { data } = await api.put(`/teacher-assignments/${editingAssignment._id}`, {
          isClassTeacher: values.isClassTeacher,
        });
        if (data.success) message.success("Assignment updated successfully");
      } else {
        const { data } = await api.post("/teacher-assignments", {
          academicYear: selectedYear,
          teacherId: values.teacherId,
          classId: values.classId,
          sectionId: values.sectionId,
          subjectId: values.subjectId,
          isClassTeacher: values.isClassTeacher || false,
        });
        if (data.success) message.success("Teacher assigned to class & subject");
      }
      setAssignModalOpen(false);
      assignForm.resetFields();
      fetchAssignments(selectedYear);
    } catch (err) {
      message.error(err.response?.data?.message || "Failed to assign teacher");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteAssignment = async (id) => {
    try {
      const { data } = await api.delete(`/teacher-assignments/${id}`);
      if (data.success) {
        message.success("Assignment removed successfully");
        fetchAssignments(selectedYear);
      }
    } catch (err) {
      message.error(err.response?.data?.message || "Failed to remove assignment");
    }
  };

  const filteredTeachers = teachers.filter((t) => {
    const name = `${t.firstName} ${t.lastName || ""}`.toLowerCase();
    const emp = (t.employeeId || "").toLowerCase();
    const dept = (t.department || "").toLowerCase();
    const q = searchText.toLowerCase();
    return name.includes(q) || emp.includes(q) || dept.includes(q);
  });

  // Table Columns
  const teacherColumns = [
    {
      title: "Employee ID",
      dataIndex: "employeeId",
      key: "employeeId",
      render: (id) => <Tag color="blue">{id}</Tag>,
    },
    {
      title: "Faculty Name",
      key: "name",
      render: (_, r) => (
        <Space>
          <Avatar style={{ backgroundColor: "#1677ff" }}>
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
      title: "Department",
      dataIndex: "department",
      key: "department",
      render: (d) => (d ? <Tag color="cyan">{d}</Tag> : "N/A"),
    },
    {
      title: "Designation",
      dataIndex: "designation",
      key: "designation",
      render: (des) => des || "Teacher",
    },
    {
      title: "Phone",
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
            onClick={() => handleOpenTeacherModal(r)}
          />
          <Popconfirm
            title="Delete faculty record"
            description="Are you sure you want to delete this teacher and their login account?"
            onConfirm={() => handleDeleteTeacher(r._id)}
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

  const assignmentColumns = [
    {
      title: "Teacher",
      key: "teacher",
      render: (_, r) => (
        <div>
          <Text strong>{r.teacher?.firstName} {r.teacher?.lastName || ""}</Text>
          <br />
          <Text type="secondary" style={{ fontSize: 11 }}>{r.teacher?.employeeId}</Text>
        </div>
      ),
    },
    {
      title: "Class & Section",
      key: "classSection",
      render: (_, r) => `${r.class?.name || "N/A"} - ${r.section?.name || "N/A"}`,
    },
    {
      title: "Subject",
      key: "subject",
      render: (_, r) => (
        <Space>
          <Text>{r.subject?.name || "N/A"}</Text>
          {r.subject?.code && <Tag color="blue">{r.subject.code}</Tag>}
        </Space>
      ),
    },
    {
      title: "Role in Section",
      dataIndex: "isClassTeacher",
      key: "isClassTeacher",
      render: (isCt) =>
        isCt ? (
          <Tag color="gold" icon={<CrownOutlined />}>
            CLASS TEACHER
          </Tag>
        ) : (
          <Tag color="default">Subject Teacher</Tag>
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
            onClick={() => handleOpenAssignModal(r)}
          />
          <Popconfirm
            title="Remove assignment"
            description="Remove this teacher from this class and subject?"
            onConfirm={() => handleDeleteAssignment(r._id)}
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

  return (
    <div>
      {/* Temporary Password Alert Modal */}
      <Modal
        title="Faculty Login Credentials Created"
        open={!!tempPasswordNotice}
        onOk={() => setTempPasswordNotice(null)}
        cancelButtonProps={{ style: { display: "none" } }}
      >
        <p>A user login account has been automatically provisioned for this faculty member:</p>
        <Card size="small" style={{ background: "#f8fafc", borderRadius: 8 }}>
          <p><strong>Login Email:</strong> {tempPasswordNotice?.email}</p>
          <p><strong>Temporary Password:</strong> <Tag color="blue">{tempPasswordNotice?.tempPassword}</Tag></p>
        </Card>
        <Text type="secondary" style={{ fontSize: 12, marginTop: 12, display: "block" }}>
          Please share these credentials with the teacher. They can sign in immediately at the portal login.
        </Text>
      </Modal>

      <Card style={{ borderRadius: 12 }}>
        <Row justify="space-between" align="middle" style={{ marginBottom: 20 }} gutter={[16, 16]}>
          <Col>
            <Title level={4} style={{ margin: 0 }}>
              Faculty & Teacher Allocations
            </Title>
            <Text type="secondary">
              Manage teacher employee profiles, login credentials, and subject allocations
            </Text>
          </Col>

          <Col>
            <Space wrap>
              {activeTab === "directory" ? (
                <Input
                  placeholder="Search by name, ID or department..."
                  prefix={<SearchOutlined style={{ color: "#9ca3af" }} />}
                  value={searchText}
                  onChange={(e) => setSearchText(e.target.value)}
                  style={{ width: 280 }}
                  allowClear
                />
              ) : (
                <Select
                  value={selectedYear}
                  onChange={setSelectedYear}
                  style={{ width: 200 }}
                  placeholder="Academic Session"
                >
                  {academicYears.map((y) => (
                    <Option key={y._id} value={y._id}>
                      {y.name} {y.isCurrent && "★ (Current)"}
                    </Option>
                  ))}
                </Select>
              )}

              <Button
                icon={<ReloadOutlined />}
                onClick={() => {
                  fetchTeachers();
                  if (selectedYear) fetchAssignments(selectedYear);
                }}
              >
                Refresh
              </Button>

              {activeTab === "directory" ? (
                <Button
                  type="primary"
                  icon={<PlusOutlined />}
                  onClick={() => handleOpenTeacherModal()}
                >
                  Add Teacher
                </Button>
              ) : (
                <Button
                  type="primary"
                  icon={<PlusOutlined />}
                  onClick={() => handleOpenAssignModal()}
                  disabled={!selectedYear || teachers.length === 0}
                >
                  Assign Teacher
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
              key: "directory",
              label: (
                <span>
                  <UserOutlined /> Faculty Directory ({teachers.length})
                </span>
              ),
              children: (
                <Table
                  columns={teacherColumns}
                  dataSource={filteredTeachers}
                  rowKey="_id"
                  loading={loading}
                  pagination={{ pageSize: 10 }}
                />
              ),
            },
            {
              key: "assignments",
              label: (
                <span>
                  <ApartmentOutlined /> Section Allocations ({assignments.length})
                </span>
              ),
              children: (
                <Table
                  columns={assignmentColumns}
                  dataSource={assignments}
                  rowKey="_id"
                  loading={loading}
                  pagination={{ pageSize: 10 }}
                />
              ),
            },
          ]}
        />
      </Card>

      {/* Add / Edit Teacher Modal */}
      <Modal
        title={editingTeacher ? "Edit Faculty Profile" : "Register New Faculty Member"}
        open={teacherModalOpen}
        onCancel={() => setTeacherModalOpen(false)}
        footer={null}
        width={700}
        destroyOnClose
      >
        <Form
          form={teacherForm}
          layout="vertical"
          onFinish={handleTeacherSubmit}
          style={{ marginTop: 16 }}
        >
          <Row gutter={16}>
            <Col xs={24} sm={8}>
              <Form.Item
                name="employeeId"
                label="Employee ID"
                rules={[{ required: true, message: "Enter employee ID" }]}
              >
                <Input placeholder="e.g. EMP-101" style={{ textTransform: "uppercase" }} disabled={!!editingTeacher} />
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
                label="Official Email (Login ID)"
                rules={[
                  { required: true, message: "Enter email" },
                  { type: "email", message: "Enter a valid email" },
                ]}
              >
                <Input placeholder="teacher@school.edu" />
              </Form.Item>
            </Col>
            <Col xs={24} sm={12}>
              <Form.Item name="phone" label="Phone Number">
                <Input placeholder="+91 98765 43210" />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col xs={24} sm={8}>
              <Form.Item name="department" label="Department">
                <Input placeholder="e.g. Science, Mathematics" />
              </Form.Item>
            </Col>
            <Col xs={24} sm={8}>
              <Form.Item name="designation" label="Designation">
                <Input placeholder="e.g. Senior Teacher" />
              </Form.Item>
            </Col>
            <Col xs={24} sm={8}>
              <Form.Item name="qualification" label="Qualification">
                <Input placeholder="e.g. M.Sc., B.Ed." />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col xs={24} sm={8}>
              <Form.Item name="gender" label="Gender">
                <Select placeholder="Select Gender">
                  <Option value="male">Male</Option>
                  <Option value="female">Female</Option>
                  <Option value="other">Other</Option>
                </Select>
              </Form.Item>
            </Col>
            <Col xs={24} sm={8}>
              <Form.Item name="dateOfBirth" label="Date of Birth">
                <DatePicker style={{ width: "100%" }} format="YYYY-MM-DD" />
              </Form.Item>
            </Col>
            <Col xs={24} sm={8}>
              <Form.Item name="joiningDate" label="Joining Date">
                <DatePicker style={{ width: "100%" }} format="YYYY-MM-DD" />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col xs={24} sm={12}>
              <Form.Item
                name="password"
                label="Custom Password (Optional)"
                help="Leave blank to generate a secure random password automatically"
              >
                <Input.Password placeholder="••••••••" />
              </Form.Item>
            </Col>
            <Col xs={24} sm={12}>
              <Form.Item name="address" label="Residential Address">
                <Input placeholder="City, State" />
              </Form.Item>
            </Col>
          </Row>

          <div style={{ textAlign: "right", marginTop: 24 }}>
            <Space>
              <Button onClick={() => setTeacherModalOpen(false)}>Cancel</Button>
              <Button type="primary" htmlType="submit" loading={submitting}>
                {editingTeacher ? "Save Profile" : "Create Faculty Account"}
              </Button>
            </Space>
          </div>
        </Form>
      </Modal>

      {/* Teacher Assignment Modal */}
      <Modal
        title={editingAssignment ? "Edit Teacher Allocation" : "Assign Faculty to Class & Subject"}
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
            name="teacherId"
            label="Select Teacher"
            rules={[{ required: true, message: "Please select teacher" }]}
          >
            <Select placeholder="Select Teacher" disabled={!!editingAssignment}>
              {teachers.map((t) => (
                <Option key={t._id} value={t._id}>
                  {t.firstName} {t.lastName || ""} ({t.employeeId}) - {t.department || "General"}
                </Option>
              ))}
            </Select>
          </Form.Item>

          <Row gutter={16}>
            <Col xs={24} sm={12}>
              <Form.Item
                name="classId"
                label="Class / Grade"
                rules={[{ required: true, message: "Please select class" }]}
              >
                <Select
                  placeholder="Select Class"
                  onChange={handleAssignClassChange}
                  disabled={!!editingAssignment}
                >
                  {classes.map((c) => (
                    <Option key={c._id} value={c._id}>
                      {c.name} ({c.code})
                    </Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>

            <Col xs={24} sm={12}>
              <Form.Item
                name="sectionId"
                label="Section"
                rules={[{ required: true, message: "Please select section" }]}
              >
                <Select placeholder="Select Section" disabled={!!editingAssignment || sections.length === 0}>
                  {sections.map((s) => (
                    <Option key={s._id} value={s._id}>
                      {s.name}
                    </Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
          </Row>

          <Form.Item
            name="subjectId"
            label="Teaching Subject"
            rules={[{ required: true, message: "Please select subject" }]}
          >
            <Select placeholder="Select Subject" disabled={!!editingAssignment}>
              {subjects.map((s) => (
                <Option key={s._id} value={s._id}>
                  {s.name} ({s.code}) - {s.type}
                </Option>
              ))}
            </Select>
          </Form.Item>

          <Form.Item
            name="isClassTeacher"
            label="Designate as the Class Teacher for this section?"
            valuePropName="checked"
          >
            <Switch checkedChildren="Class Teacher" unCheckedChildren="Subject Teacher" />
          </Form.Item>

          <div style={{ textAlign: "right", marginTop: 24 }}>
            <Space>
              <Button onClick={() => setAssignModalOpen(false)}>Cancel</Button>
              <Button type="primary" htmlType="submit" loading={submitting}>
                {editingAssignment ? "Save Changes" : "Assign Faculty"}
              </Button>
            </Space>
          </div>
        </Form>
      </Modal>
    </div>
  );
}
