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
  TimePicker,
  Popconfirm,
  Typography,
  Row,
  Col,
  Radio,
  Tooltip,
  message,
  Alert,
} from "antd";
import {
  ScheduleOutlined,
  PlusOutlined,
  ReloadOutlined,
  EditOutlined,
  DeleteOutlined,
  ClockCircleOutlined,
  AppstoreOutlined,
  UnorderedListOutlined,
  BookOutlined,
  UserOutlined,
  CheckCircleOutlined,
  LockOutlined,
} from "@ant-design/icons";
import dayjs from "dayjs";
import api from "@/lib/api";
import { useAuth } from "@/context/AuthContext";

const { Title, Text } = Typography;
const { Option } = Select;

const DAYS = [
  { label: "Monday", value: "monday" },
  { label: "Tuesday", value: "tuesday" },
  { label: "Wednesday", value: "wednesday" },
  { label: "Thursday", value: "thursday" },
  { label: "Friday", value: "friday" },
  { label: "Saturday", value: "saturday" },
];

export default function TimetablePage() {
  const { user } = useAuth();
  const isStudent = user?.role === "student";
  const canManage = ["chairman", "principal", "admin"].includes(user?.role);

  const [viewMode, setViewMode] = useState("class"); // 'class' or 'teacher'
  const [activeTab, setActiveTab] = useState("grid");

  // Selection Filters
  const [academicYears, setAcademicYears] = useState([]);
  const [selectedYear, setSelectedYear] = useState(null);
  const [classes, setClasses] = useState([]);
  const [selectedClass, setSelectedClass] = useState(null);
  const [sections, setSections] = useState([]);
  const [selectedSection, setSelectedSection] = useState(null);
  const [teachers, setTeachers] = useState([]);
  const [selectedTeacher, setSelectedTeacher] = useState(null);
  const [subjects, setSubjects] = useState([]);
  const [studentProfile, setStudentProfile] = useState(null);

  // Timetable State
  const [slots, setSlots] = useState([]);
  const [loading, setLoading] = useState(false);

  // Modals State
  const [modalOpen, setModalOpen] = useState(false);
  const [editingSlot, setEditingSlot] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const [form] = Form.useForm();

  // Load initial dropdown dependencies
  const fetchInitialData = async () => {
    try {
      const requests = [
        api.get("/academic-years"),
        api.get("/teachers"),
        api.get("/subjects"),
      ];

      // If student, also fetch student profile to resolve their class & section
      if (isStudent && user?.student) {
        const studentId = typeof user.student === "object" ? user.student._id : user.student;
        requests.push(api.get(`/students/${studentId}`).catch(() => ({ data: { success: false } })));
      }

      const [yearRes, teacherRes, subjectRes, stuRes] = await Promise.all(requests);

      if (yearRes.data.success) {
        const years = yearRes.data.data.academicYears || [];
        setAcademicYears(years);
        const current = years.find((y) => y.isCurrent) || years[0];
        if (current) setSelectedYear(current._id);
      }
      if (teacherRes.data.success) {
        setTeachers(teacherRes.data.data.teachers || []);
      }
      if (subjectRes.data.success) {
        setSubjects(subjectRes.data.data.subjects || []);
      }

      if (stuRes?.data?.success) {
        const profile = stuRes.data.data.student;
        setStudentProfile(profile);
        if (profile?.class?._id || profile?.class) {
          const cId = profile.class._id || profile.class;
          setSelectedClass(cId);
        }
        if (profile?.section?._id || profile?.section) {
          const sId = profile.section._id || profile.section;
          setSelectedSection(sId);
        }
      }
    } catch (err) {
      console.error("Failed to load timetable dependencies:", err);
    }
  };

  const fetchClasses = async (yearId) => {
    if (!yearId) return;
    try {
      const { data } = await api.get(`/classes?academicYear=${yearId}`);
      if (data.success) {
        const clsList = data.data.classes || [];
        setClasses(clsList);
        if (clsList.length > 0 && !selectedClass && !isStudent) {
          setSelectedClass(clsList[0]._id);
        }
      }
    } catch (err) {
      console.error("Failed to load classes:", err);
    }
  };

  const fetchSections = async (classId) => {
    if (!classId) return;
    try {
      const { data } = await api.get(`/sections?classId=${classId}`);
      if (data.success) {
        const secList = data.data.sections || [];
        setSections(secList);
        if (secList.length > 0 && !isStudent) {
          setSelectedSection(secList[0]._id);
        }
      }
    } catch (err) {
      console.error("Failed to load sections:", err);
    }
  };

  useEffect(() => {
    fetchInitialData();
  }, [user]);

  useEffect(() => {
    if (selectedYear) {
      fetchClasses(selectedYear);
    }
  }, [selectedYear]);

  useEffect(() => {
    if (selectedClass) {
      fetchSections(selectedClass);
    }
  }, [selectedClass]);

  // Fetch timetable slots based on selected mode
  const fetchTimetableSlots = async () => {
    if (!selectedYear) return;
    setLoading(true);
    try {
      let query = `academicYear=${selectedYear}`;
      if (viewMode === "class") {
        if (selectedClass) query += `&classId=${selectedClass}`;
        if (selectedSection) query += `&sectionId=${selectedSection}`;
      } else if (viewMode === "teacher" && selectedTeacher) {
        query += `&teacherId=${selectedTeacher}`;
      }

      const { data } = await api.get(`/timetable?${query}`);
      if (data.success) {
        setSlots(data.data.timetable || []);
      }
    } catch (err) {
      message.error(err.response?.data?.message || "Failed to load timetable");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (selectedYear && (selectedClass || selectedTeacher)) {
      fetchTimetableSlots();
    }
  }, [selectedYear, viewMode, selectedClass, selectedSection, selectedTeacher]);

  // Dynamic class change in modal
  const handleModalClassChange = async (classId) => {
    form.setFieldsValue({ sectionId: undefined });
    try {
      const { data } = await api.get(`/sections?classId=${classId}`);
      if (data.success) {
        setSections(data.data.sections || []);
      }
    } catch (err) {
      console.error("Failed to load sections in modal:", err);
    }
  };

  const handleOpenModal = (record = null, defaultDay = null, defaultPeriod = null) => {
    if (!canManage) return; // Prevent student from opening modal
    setEditingSlot(record);
    if (record) {
      form.setFieldsValue({
        day: record.day,
        period: record.period,
        classId: record.class?._id || record.class,
        sectionId: record.section?._id || record.section,
        subjectId: record.subject?._id || record.subject,
        teacherId: record.teacher?._id || record.teacher,
        room: record.room,
        startTime: record.startTime ? dayjs(record.startTime, "hh:mm A") : null,
        endTime: record.endTime ? dayjs(record.endTime, "hh:mm A") : null,
      });
      if (record.class?._id || record.class) {
        handleModalClassChange(record.class?._id || record.class);
      }
    } else {
      form.resetFields();
      form.setFieldsValue({
        academicYear: selectedYear,
        day: defaultDay || "monday",
        period: defaultPeriod || 1,
        classId: selectedClass,
        sectionId: selectedSection,
        teacherId: selectedTeacher,
      });
      if (selectedClass) {
        handleModalClassChange(selectedClass);
      }
    }
    setModalOpen(true);
  };

  const handleSaveSlot = async (values) => {
    if (!canManage) return;
    setSubmitting(true);
    try {
      const payload = {
        academicYear: selectedYear,
        classId: values.classId,
        sectionId: values.sectionId,
        subjectId: values.subjectId,
        teacherId: values.teacherId,
        day: values.day,
        period: values.period,
        room: values.room || "",
        startTime: values.startTime ? values.startTime.format("hh:mm A") : "09:00 AM",
        endTime: values.endTime ? values.endTime.format("hh:mm A") : "09:45 AM",
      };

      if (editingSlot) {
        const { data } = await api.patch(`/timetable/${editingSlot._id}`, payload);
        if (data.success) {
          message.success("Timetable slot updated successfully");
        }
      } else {
        const { data } = await api.post("/timetable", payload);
        if (data.success) {
          message.success("New timetable period allocated");
        }
      }

      setModalOpen(false);
      form.resetFields();
      fetchTimetableSlots();
    } catch (err) {
      console.error("Timetable save error:", err);
      message.error(err.response?.data?.message || "Collision or conflict detected");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id) => {
    if (!canManage) return;
    try {
      const { data } = await api.delete(`/timetable/${id}`);
      if (data.success) {
        message.success("Timetable slot removed");
        fetchTimetableSlots();
      }
    } catch (err) {
      message.error(err.response?.data?.message || "Failed to remove slot");
    }
  };

  // Build Weekly Grid Data
  const periodNumbers = [1, 2, 3, 4, 5, 6, 7, 8];

  const gridColumns = [
    {
      title: "Period",
      dataIndex: "period",
      key: "period",
      width: 100,
      fixed: "left",
      render: (p) => (
        <div style={{ textAlign: "center" }}>
          <Tag color="geekblue" style={{ fontSize: 13, padding: "2px 8px" }}>
            Period {p}
          </Tag>
        </div>
      ),
    },
    ...DAYS.map((d) => ({
      title: d.label,
      dataIndex: d.value,
      key: d.value,
      width: 180,
      render: (_, row) => {
        const slot = slots.find(
          (s) => s.day === d.value && Number(s.period) === Number(row.period)
        );

        if (!slot) {
          return (
            <div
              style={{
                height: 90,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                background: "#fafafa",
                borderRadius: 6,
                border: "1px dashed #e8e8e8",
              }}
            >
              {canManage ? (
                <Button
                  type="dashed"
                  size="small"
                  icon={<PlusOutlined />}
                  onClick={() => handleOpenModal(null, d.value, row.period)}
                >
                  Add
                </Button>
              ) : (
                <Text type="secondary" style={{ fontSize: 12 }}>
                  — Free Period —
                </Text>
              )}
            </div>
          );
        }

        return (
          <Card
            size="small"
            style={{
              background: "#f0f7ff",
              border: "1px solid #bae0ff",
              borderRadius: 6,
              boxShadow: "0 1px 3px rgba(0,0,0,0.05)",
            }}
            styles={{ body: { padding: 8 } }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
              <Text strong style={{ color: "#1677ff", fontSize: 13 }}>
                {slot.subject?.name || "Subject"}
              </Text>
              {canManage && (
                <Space size={2}>
                  <Button
                    type="text"
                    size="small"
                    icon={<EditOutlined style={{ fontSize: 11 }} />}
                    onClick={() => handleOpenModal(slot)}
                    style={{ width: 20, height: 20 }}
                  />
                  <Popconfirm
                    title="Delete slot?"
                    onConfirm={() => handleDelete(slot._id)}
                    okText="Yes"
                    cancelText="No"
                  >
                    <Button
                      type="text"
                      danger
                      size="small"
                      icon={<DeleteOutlined style={{ fontSize: 11 }} />}
                      style={{ width: 20, height: 20 }}
                    />
                  </Popconfirm>
                </Space>
              )}
            </div>

            <div style={{ marginTop: 4 }}>
              {viewMode === "class" ? (
                <Space size={4} style={{ fontSize: 11, color: "#595959" }}>
                  <UserOutlined />
                  <span>{slot.teacher ? `${slot.teacher.firstName} ${slot.teacher.lastName || ""}` : "Unassigned"}</span>
                </Space>
              ) : (
                <Tag color="cyan" style={{ fontSize: 10, padding: "0 4px" }}>
                  {slot.class?.name} - {slot.section?.name}
                </Tag>
              )}
            </div>

            <div style={{ marginTop: 4, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <Space size={4} style={{ fontSize: 10, color: "#8c8c8c" }}>
                <ClockCircleOutlined />
                <span>{slot.startTime} - {slot.endTime}</span>
              </Space>
              {slot.room && (
                <Tag color="purple" style={{ fontSize: 10, margin: 0 }}>
                  {slot.room}
                </Tag>
              )}
            </div>
          </Card>
        );
      },
    })),
  ];

  const gridData = periodNumbers.map((p) => ({
    key: p,
    period: p,
  }));

  // List View Columns
  const tableColumns = [
    {
      title: "Day",
      dataIndex: "day",
      key: "day",
      render: (d) => <Tag color="blue">{d?.toUpperCase()}</Tag>,
      sorter: (a, b) => a.day.localeCompare(b.day),
    },
    {
      title: "Period",
      dataIndex: "period",
      key: "period",
      render: (p) => <Text strong>Period {p}</Text>,
      sorter: (a, b) => a.period - b.period,
    },
    {
      title: "Time Slot",
      key: "time",
      render: (_, r) => `${r.startTime} - ${r.endTime}`,
    },
    {
      title: "Subject",
      dataIndex: ["subject", "name"],
      key: "subject",
      render: (name, r) => (
        <Space>
          <BookOutlined style={{ color: "#1677ff" }} />
          <Text strong>{name}</Text>
          <Text type="secondary">({r.subject?.code})</Text>
        </Space>
      ),
    },
    {
      title: "Teacher / Faculty",
      key: "teacher",
      render: (_, r) =>
        r.teacher ? (
          <Space>
            <UserOutlined />
            <span>{r.teacher.firstName} {r.teacher.lastName} ({r.teacher.employeeId})</span>
          </Space>
        ) : (
          <Text type="secondary">Unassigned</Text>
        ),
    },
    {
      title: "Class & Section",
      key: "classSection",
      render: (_, r) => `${r.class?.name || ""} - ${r.section?.name || ""}`,
    },
    {
      title: "Room",
      dataIndex: "room",
      key: "room",
      render: (rm) => (rm ? <Tag color="purple">{rm}</Tag> : <Text type="secondary">—</Text>),
    },
  ];

  // Only include Action column for managers (NOT students)
  if (canManage) {
    tableColumns.push({
      title: "Actions",
      key: "actions",
      width: 110,
      render: (_, r) => (
        <Space>
          <Button
            type="text"
            icon={<EditOutlined />}
            size="small"
            onClick={() => handleOpenModal(r)}
          />
          <Popconfirm
            title="Delete slot?"
            onConfirm={() => handleDelete(r._id)}
            okText="Yes"
            cancelText="No"
          >
            <Button type="text" danger icon={<DeleteOutlined />} size="small" />
          </Popconfirm>
        </Space>
      ),
    });
  }

  const studentClassName =
    studentProfile?.class?.name || (typeof studentProfile?.class === "string" ? studentProfile.class : "Grade 10");
  const studentSectionName =
    studentProfile?.section?.name || (typeof studentProfile?.section === "string" ? studentProfile.section : "Section A");

  return (
    <div>
      <Card style={{ borderRadius: 12 }}>
        {/* Header Bar */}
        <Row justify="space-between" align="middle" style={{ marginBottom: 20 }} gutter={[16, 16]}>
          <Col>
            <Title level={4} style={{ margin: 0, display: "flex", alignItems: "center", gap: 10 }}>
              <ScheduleOutlined style={{ color: "#1677ff" }} />
              {isStudent ? "My Class Schedule" : "Timetable & Period Scheduling"}
            </Title>
            <Text type="secondary">
              {isStudent
                ? `Official daily class timetable for ${studentClassName} - ${studentSectionName} (Read-only view provided by faculty)`
                : "Intelligent class and teacher schedules with built-in collision & conflict detection"}
            </Text>
          </Col>

          <Col>
            <Space wrap>
              {isStudent && (
                <Tag color="cyan" icon={<CheckCircleOutlined />} style={{ padding: "4px 10px", fontSize: 13 }}>
                  Class: {studentClassName} - {studentSectionName}
                </Tag>
              )}

              {/* Only non-students can switch between academic years or view by teacher */}
              {!isStudent && (
                <>
                  <Select
                    value={selectedYear}
                    onChange={setSelectedYear}
                    style={{ width: 180 }}
                    placeholder="Academic Session"
                  >
                    {academicYears.map((y) => (
                      <Option key={y._id} value={y._id}>
                        {y.name} {y.isCurrent && "★ (Current)"}
                      </Option>
                    ))}
                  </Select>

                  <Radio.Group
                    value={viewMode}
                    onChange={(e) => setViewMode(e.target.value)}
                    buttonStyle="solid"
                  >
                    <Radio.Button value="class">By Class</Radio.Button>
                    <Radio.Button value="teacher">By Teacher</Radio.Button>
                  </Radio.Group>
                </>
              )}

              {!isStudent && viewMode === "class" && (
                <>
                  <Select
                    value={selectedClass}
                    onChange={setSelectedClass}
                    style={{ width: 150 }}
                    placeholder="Class"
                  >
                    {classes.map((c) => (
                      <Option key={c._id} value={c._id}>{c.name}</Option>
                    ))}
                  </Select>

                  <Select
                    value={selectedSection}
                    onChange={setSelectedSection}
                    style={{ width: 130 }}
                    placeholder="Section"
                    disabled={sections.length === 0}
                  >
                    {sections.map((s) => (
                      <Option key={s._id} value={s._id}>{s.name}</Option>
                    ))}
                  </Select>
                </>
              )}

              {!isStudent && viewMode === "teacher" && (
                <Select
                  value={selectedTeacher}
                  onChange={setSelectedTeacher}
                  style={{ width: 220 }}
                  placeholder="Select Faculty"
                  showSearch
                  optionFilterProp="children"
                >
                  {teachers.map((t) => (
                    <Option key={t._id} value={t._id}>
                      {t.firstName} {t.lastName || ""} ({t.employeeId})
                    </Option>
                  ))}
                </Select>
              )}

              <Button icon={<ReloadOutlined />} onClick={fetchTimetableSlots} loading={loading}>
                Refresh
              </Button>

              {/* Only faculty / administrative staff can create period slots */}
              {canManage && (
                <Button
                  type="primary"
                  icon={<PlusOutlined />}
                  onClick={() => handleOpenModal()}
                  disabled={!selectedYear}
                >
                  Schedule Period
                </Button>
              )}
            </Space>
          </Col>
        </Row>

        {/* Informative notice for students */}
        {isStudent && (
          <Alert
            type="info"
            showIcon
            icon={<LockOutlined style={{ color: "#1677ff" }} />}
            message="Class Schedule Information"
            description="This schedule is officially arranged and managed by your school faculty and administration. It reflects your real-time daily classroom periods, subjects, assigned teachers, and laboratory allocations."
            style={{ marginBottom: 16, borderRadius: 8 }}
          />
        )}

        <Tabs
          activeKey={activeTab}
          onChange={setActiveTab}
          items={[
            {
              key: "grid",
              label: (
                <span>
                  <AppstoreOutlined /> Weekly Period Grid
                </span>
              ),
              children: (
                <Table
                  columns={gridColumns}
                  dataSource={gridData}
                  pagination={false}
                  bordered
                  scroll={{ x: 1200 }}
                  loading={loading}
                />
              ),
            },
            {
              key: "list",
              label: (
                <span>
                  <UnorderedListOutlined /> All Allocated Slots
                </span>
              ),
              children: (
                <Table
                  columns={tableColumns}
                  dataSource={slots}
                  rowKey="_id"
                  loading={loading}
                  pagination={{ pageSize: 12 }}
                />
              ),
            },
          ]}
        />
      </Card>

      {/* Schedule Period Modal (Manager only) */}
      {canManage && (
        <Modal
          title={
            <Space>
              <ScheduleOutlined style={{ color: "#1677ff" }} />
              <span>{editingSlot ? "Modify Scheduled Period" : "Schedule New Class Period"}</span>
            </Space>
          }
          open={modalOpen}
          onCancel={() => setModalOpen(false)}
          onOk={() => form.submit()}
          confirmLoading={submitting}
          width={650}
          destroyOnClose
        >
          <Form form={form} layout="vertical" onFinish={handleSaveSlot} style={{ marginTop: 16 }}>
            <Row gutter={16}>
              <Col span={12}>
                <Form.Item name="day" label="Day of Week" rules={[{ required: true }]}>
                  <Select placeholder="Select Day">
                    {DAYS.map((d) => (
                      <Option key={d.value} value={d.value}>{d.label}</Option>
                    ))}
                  </Select>
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item name="period" label="Period Number (1-8)" rules={[{ required: true }]}>
                  <InputNumber min={1} max={8} style={{ width: "100%" }} />
                </Form.Item>
              </Col>
            </Row>

            <Row gutter={16}>
              <Col span={12}>
                <Form.Item name="classId" label="Class" rules={[{ required: true }]}>
                  <Select placeholder="Select Class" onChange={handleModalClassChange}>
                    {classes.map((c) => (
                      <Option key={c._id} value={c._id}>{c.name}</Option>
                    ))}
                  </Select>
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item name="sectionId" label="Section" rules={[{ required: true }]}>
                  <Select placeholder="Select Section">
                    {sections.map((s) => (
                      <Option key={s._id} value={s._id}>{s.name}</Option>
                    ))}
                  </Select>
                </Form.Item>
              </Col>
            </Row>

            <Row gutter={16}>
              <Col span={12}>
                <Form.Item name="subjectId" label="Subject" rules={[{ required: true }]}>
                  <Select placeholder="Select Subject">
                    {subjects.map((sub) => (
                      <Option key={sub._id} value={sub._id}>
                        {sub.name} ({sub.code})
                      </Option>
                    ))}
                  </Select>
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item name="teacherId" label="Assign Faculty Teacher" rules={[{ required: true }]}>
                  <Select placeholder="Select Faculty" showSearch optionFilterProp="children">
                    {teachers.map((t) => (
                      <Option key={t._id} value={t._id}>
                        {t.firstName} {t.lastName || ""} ({t.employeeId})
                      </Option>
                    ))}
                  </Select>
                </Form.Item>
              </Col>
            </Row>

            <Row gutter={16}>
              <Col span={8}>
                <Form.Item name="startTime" label="Start Time" rules={[{ required: true }]}>
                  <TimePicker format="hh:mm A" use12Hours style={{ width: "100%" }} />
                </Form.Item>
              </Col>
              <Col span={8}>
                <Form.Item name="endTime" label="End Time" rules={[{ required: true }]}>
                  <TimePicker format="hh:mm A" use12Hours style={{ width: "100%" }} />
                </Form.Item>
              </Col>
              <Col span={8}>
                <Form.Item name="room" label="Room / Lab Number">
                  <Input placeholder="e.g. Room 102, Lab 2" />
                </Form.Item>
              </Col>
            </Row>
          </Form>
        </Modal>
      )}
    </div>
  );
}
