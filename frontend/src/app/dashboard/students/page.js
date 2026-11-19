"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import dayjs from "dayjs";
import {
  Table,
  Button,
  Card,
  Space,
  Tag,
  Modal,
  Form,
  Input,
  Select,
  DatePicker,
  Row,
  Col,
  message,
  Popconfirm,
  Typography,
  Statistic,
  Radio,
  Drawer,
  Descriptions,
  Avatar,
  Divider,
  Empty,
  Skeleton,
  Tooltip,
} from "antd";
import {
  UserAddOutlined,
  SearchOutlined,
  ReloadOutlined,
  DeleteOutlined,
  EyeOutlined,
  EditOutlined,
  TeamOutlined,
  BookOutlined,
  UserOutlined,
  CheckCircleOutlined,
  ManOutlined,
  WomanOutlined,
  PhoneOutlined,
  MailOutlined,
  IdcardOutlined,
  CalendarOutlined,
} from "@ant-design/icons";
import api from "@/lib/api";
import { useAuth } from "@/context/AuthContext";

const { Title, Text, Paragraph } = Typography;
const { Option } = Select;

// Helper to reliably extract guardian/parent name from any schema field
const getGuardianName = (guardian) => {
  if (!guardian) return "N/A";
  const name =
    guardian.guardianName ||
    guardian.name ||
    guardian.fatherName ||
    guardian.motherName ||
    "";
  return name.trim() || "N/A";
};

export default function StudentsPage() {
  const { user } = useAuth();
  const canManage = ["chairman", "principal", "admin"].includes(user?.role);

  const [students, setStudents] = useState([]);
  const [totalSchoolStudents, setTotalSchoolStudents] = useState(0);
  const [classCountsMap, setClassCountsMap] = useState({});
  const [sectionCountsMap, setSectionCountsMap] = useState({});

  const [classes, setClasses] = useState([]);
  const [sections, setSections] = useState([]); // for admission modal
  const [academicYears, setAcademicYears] = useState([]);

  // Viewing filters
  const [viewClass, setViewClass] = useState(null); // 'all' or classId
  const [viewSection, setViewSection] = useState("all"); // 'all' or sectionId
  const [viewSections, setViewSections] = useState([]); // sections for viewClass

  const [loading, setLoading] = useState(false);
  const [depsLoading, setDepsLoading] = useState(true);
  const [searchText, setSearchText] = useState("");

  // Student details drawer
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState(null);

  // Admission Modal
  const [modalOpen, setModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [modalClassSelected, setModalClassSelected] = useState(null);
  const [form] = Form.useForm();

  // Edit Student Modal
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editingStudent, setEditingStudent] = useState(null);
  const [editSubmitting, setEditSubmitting] = useState(false);
  const [editForm] = Form.useForm();

  // 1. Fetch initial dependencies (Academic years, Classes)
  const fetchDependencies = async () => {
    try {
      setDepsLoading(true);
      const [yearRes, classRes] = await Promise.all([
        api.get("/academic-years"),
        api.get("/classes"),
      ]);

      if (yearRes.data.success) {
        setAcademicYears(yearRes.data.data.academicYears || []);
      }

      if (classRes.data.success) {
        const loadedClasses = classRes.data.data.classes || [];
        setClasses(loadedClasses);

        // Default view to the first class if available so we never dump 1,000+ all at once
        if (loadedClasses.length > 0 && !viewClass) {
          const firstClassId = loadedClasses[0]._id;
          setViewClass(firstClassId);
          loadViewSections(firstClassId);
          fetchStudentsList(firstClassId, "all");
        } else {
          fetchStudentsList("all", "all");
        }
      }
    } catch (err) {
      console.error("Failed to fetch dependencies:", err);
      message.error("Failed to load classes or sessions");
    } finally {
      setDepsLoading(false);
    }
  };

  // 2. Load sections for the currently selected view class
  const loadViewSections = async (classId) => {
    if (!classId || classId === "all") {
      setViewSections([]);
      return;
    }
    try {
      const { data } = await api.get(`/sections?classId=${classId}`);
      if (data.success) {
        setViewSections(data.data.sections || []);
      }
    } catch (err) {
      console.error("Failed to load view sections:", err);
    }
  };

  // 3. Fetch students filtered by class and section
  const fetchStudentsList = async (targetClassId, targetSectionId) => {
    setLoading(true);
    try {
      const params = {};
      if (targetClassId && targetClassId !== "all") {
        params.classId = targetClassId;
      }
      if (targetSectionId && targetSectionId !== "all") {
        params.sectionId = targetSectionId;
      }

      const { data } = await api.get("/students", { params });
      if (data.success) {
        const studentList = data.data.students || [];
        setStudents(studentList);

        if (typeof data.data.totalSchoolStudents === "number") {
          setTotalSchoolStudents(data.data.totalSchoolStudents);
        } else if (!totalSchoolStudents) {
          setTotalSchoolStudents(studentList.length);
        }

        // Map class counts
        if (Array.isArray(data.data.classCounts)) {
          const cMap = {};
          data.data.classCounts.forEach((c) => {
            cMap[c._id] = c.count;
          });
          setClassCountsMap(cMap);
        }

        // Map section counts
        if (Array.isArray(data.data.sectionCounts)) {
          const sMap = {};
          data.data.sectionCounts.forEach((s) => {
            sMap[s._id] = s.count;
          });
          setSectionCountsMap(sMap);
        }
      }
    } catch (err) {
      message.error(err.response?.data?.message || "Failed to load students");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDependencies();
  }, []);

  // Handle class selection change in view
  const handleViewClassChange = (classId) => {
    setViewClass(classId);
    setViewSection("all");
    loadViewSections(classId);
    fetchStudentsList(classId, "all");
  };

  // Handle section selection change in view
  const handleViewSectionChange = (sectionId) => {
    setViewSection(sectionId);
    fetchStudentsList(viewClass, sectionId);
  };

  // For Admission Modal Class selection
  const handleModalClassChange = async (classId) => {
    setModalClassSelected(classId);
    form.setFieldsValue({ sectionId: undefined });
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
      console.error("Failed to load sections for modal:", err);
    }
  };

  // Handle student admission creation
  const handleCreateStudent = async (values) => {
    setSubmitting(true);
    try {
      const payload = {
        admissionNumber: values.admissionNumber,
        firstName: values.firstName,
        lastName: values.lastName,
        gender: values.gender,
        dateOfBirth: values.dateOfBirth?.format("YYYY-MM-DD"),
        email: values.email,
        phone: values.phone,
        bloodGroup: values.bloodGroup,
        academicYear: values.academicYear,
        classId: values.classId,
        sectionId: values.sectionId,
        rollNumber: Number(values.rollNumber),
        guardian: {
          name: values.guardianName,
          guardianName: values.guardianName,
          fatherName: values.guardianName,
          phone: values.guardianPhone,
          relation: values.guardianRelation || "guardian",
        },
      };

      const { data } = await api.post("/students", payload);
      if (data.success) {
        message.success("Student admitted successfully!");
        setModalOpen(false);
        form.resetFields();
        fetchStudentsList(viewClass, viewSection);
      }
    } catch (err) {
      message.error(err.response?.data?.message || "Failed to admit student");
    } finally {
      setSubmitting(false);
    }
  };

  // Open Edit Student Modal
  const handleOpenEdit = (student) => {
    setEditingStudent(student);
    const gName = getGuardianName(student.guardian);
    editForm.setFieldsValue({
      firstName: student.firstName,
      lastName: student.lastName,
      gender: student.gender,
      dateOfBirth: student.dateOfBirth ? dayjs(student.dateOfBirth) : null,
      phone: student.phone,
      email: student.email,
      bloodGroup: student.bloodGroup,
      guardianName: gName !== "N/A" ? gName : "",
      guardianPhone: student.guardian?.phone || "",
      guardianRelation: student.guardian?.relation || "guardian",
    });
    setEditModalOpen(true);
  };

  // Handle Edit Student submit
  const handleUpdateStudent = async (values) => {
    if (!editingStudent) return;
    setEditSubmitting(true);
    try {
      const payload = {
        firstName: values.firstName,
        lastName: values.lastName,
        gender: values.gender,
        dateOfBirth: values.dateOfBirth ? values.dateOfBirth.format("YYYY-MM-DD") : undefined,
        phone: values.phone,
        email: values.email,
        bloodGroup: values.bloodGroup,
        guardian: {
          name: values.guardianName,
          guardianName: values.guardianName,
          fatherName: values.guardianName,
          phone: values.guardianPhone,
          relation: values.guardianRelation || "guardian",
        },
      };

      const { data } = await api.put(`/students/${editingStudent._id}`, payload);
      if (data.success) {
        message.success("Student updated successfully!");
        setEditModalOpen(false);
        editForm.resetFields();
        fetchStudentsList(viewClass, viewSection);
        if (selectedStudent && selectedStudent._id === editingStudent._id) {
          setSelectedStudent(data.data.student);
        }
      }
    } catch (err) {
      message.error(err.response?.data?.message || "Failed to update student");
    } finally {
      setEditSubmitting(false);
    }
  };

  // Handle delete student
  const handleDelete = async (id) => {
    try {
      await api.delete(`/students/${id}`);
      message.success("Student removed successfully");
      fetchStudentsList(viewClass, viewSection);
    } catch (err) {
      message.error(err.response?.data?.message || "Failed to delete student");
    }
  };

  // Open modal with pre-filled class/section if currently viewing
  const handleOpenAdmitModal = () => {
    form.resetFields();
    if (viewClass && viewClass !== "all") {
      form.setFieldsValue({ classId: viewClass });
      handleModalClassChange(viewClass);
      if (viewSection && viewSection !== "all") {
        form.setFieldsValue({ sectionId: viewSection });
      }
    }
    setModalOpen(true);
  };

  // View Student Details Drawer
  const handleViewStudent = (student) => {
    setSelectedStudent(student);
    setDrawerOpen(true);
  };

  // Current selected class object
  const selectedClassObj = useMemo(() => {
    return classes.find((c) => c._id === viewClass) || null;
  }, [classes, viewClass]);

  // Current selected section object
  const selectedSectionObj = useMemo(() => {
    return viewSections.find((s) => s._id === viewSection) || null;
  }, [viewSections, viewSection]);

  // Client-side text filter (by name, admission no, roll no, guardian)
  const filteredStudents = useMemo(() => {
    const q = searchText.trim().toLowerCase();
    if (!q) return students;
    return students.filter((s) => {
      const fullName = `${s.firstName || ""} ${s.lastName || ""}`.toLowerCase();
      const adm = (s.admissionNumber || "").toLowerCase();
      const roll = String(s.rollNumber || "");
      const phone = (s.phone || s.guardian?.phone || "").toLowerCase();
      const guardian = getGuardianName(s.guardian).toLowerCase();
      return (
        fullName.includes(q) ||
        adm.includes(q) ||
        roll.includes(q) ||
        phone.includes(q) ||
        guardian.includes(q)
      );
    });
  }, [students, searchText]);

  // Calculated stats for currently viewed students
  const stats = useMemo(() => {
    const totalInView = filteredStudents.length;
    let male = 0;
    let female = 0;
    let active = 0;

    filteredStudents.forEach((s) => {
      if (s.gender === "male") male++;
      else if (s.gender === "female") female++;

      if (s.status === "active" || !s.status) active++;
    });

    return {
      totalInView,
      male,
      female,
      active,
      inactive: totalInView - active,
    };
  }, [filteredStudents]);

  // Total students in this class across all its sections
  const currentClassTotalCount = useMemo(() => {
    if (!viewClass || viewClass === "all") return totalSchoolStudents;
    return classCountsMap[viewClass] ?? students.length;
  }, [viewClass, classCountsMap, totalSchoolStudents, students]);

  // Table Columns
  const columns = [
    {
      title: "Roll No",
      dataIndex: "rollNumber",
      key: "rollNumber",
      width: 90,
      render: (roll) => (
        <span
          style={{
            display: "inline-block",
            padding: "2px 10px",
            background: "#eff6ff",
            color: "#1d4ed8",
            fontWeight: 700,
            borderRadius: 12,
            border: "1px solid #bfdbfe",
            fontSize: 13,
          }}
        >
          #{roll ?? "-"}
        </span>
      ),
      sorter: (a, b) => (a.rollNumber || 0) - (b.rollNumber || 0),
    },
    {
      title: "Admission No",
      dataIndex: "admissionNumber",
      key: "admissionNumber",
      width: 140,
      render: (text) => (
        <Text strong style={{ color: "#0958d9", fontFamily: "monospace" }}>
          {text}
        </Text>
      ),
    },
    {
      title: "Student Name",
      key: "name",
      render: (_, r) => (
        <Space>
          <Avatar
            style={{
              backgroundColor: r.gender === "female" ? "#eb2f96" : "#1677ff",
              verticalAlign: "middle",
            }}
          >
            {(r.firstName?.[0] || "S").toUpperCase()}
          </Avatar>
          <div>
            <Text strong style={{ display: "block" }}>
              {r.firstName} {r.lastName || ""}
            </Text>
            <Text type="secondary" style={{ fontSize: 12 }}>
              {r.user?.email || r.email || "No portal email"}
            </Text>
          </div>
        </Space>
      ),
      sorter: (a, b) => (a.firstName || "").localeCompare(b.firstName || ""),
    },
    {
      title: "Class & Section",
      key: "classSection",
      width: 160,
      render: (_, r) => (
        <Tag color="geekblue" style={{ borderRadius: 6, fontWeight: 500, padding: "2px 8px" }}>
          {r.class?.name || "N/A"} - {r.section?.name || "N/A"}
        </Tag>
      ),
    },
    {
      title: "Gender",
      dataIndex: "gender",
      key: "gender",
      width: 100,
      render: (g) => {
        const isMale = g === "male";
        return (
          <Tag
            color={isMale ? "blue" : "magenta"}
            icon={isMale ? <ManOutlined /> : <WomanOutlined />}
            style={{ textTransform: "capitalize", borderRadius: 4 }}
          >
            {g || "N/A"}
          </Tag>
        );
      },
    },
    {
      title: "Guardian & Phone",
      key: "guardian",
      render: (_, r) => {
        const guardianName = getGuardianName(r.guardian);
        const guardianPhone = r.guardian?.phone || r.phone || "N/A";
        return (
          <div>
            <Text strong style={{ fontSize: 13, display: "block" }}>
              {guardianName}
            </Text>
            <Text type="secondary" style={{ fontSize: 12 }}>
              <PhoneOutlined style={{ marginRight: 4, color: "#9ca3af" }} />
              {guardianPhone}
            </Text>
          </div>
        );
      },
    },
    {
      title: "Status",
      dataIndex: "status",
      key: "status",
      width: 100,
      render: (st) => (
        <Tag color={st === "inactive" ? "volcano" : "green"} style={{ borderRadius: 4 }}>
          {(st || "active").toUpperCase()}
        </Tag>
      ),
    },
    {
      title: "Actions",
      key: "actions",
      width: 120,
      align: "center",
      render: (_, r) => (
        <Space size="small">
          <Tooltip title="View Student Profile">
            <Button
              type="text"
              icon={<EyeOutlined style={{ color: "#1677ff" }} />}
              size="small"
              onClick={() => handleViewStudent(r)}
            />
          </Tooltip>
          {canManage && (
            <>
              <Tooltip title="Edit Student">
                <Button
                  type="text"
                  icon={<EditOutlined style={{ color: "#faad14" }} />}
                  size="small"
                  onClick={() => handleOpenEdit(r)}
                />
              </Tooltip>
              <Tooltip title="Delete Student">
                <Popconfirm
                  title="Delete student"
                  description="Are you sure you want to delete this student and their login account?"
                  onConfirm={() => handleDelete(r._id)}
                  okText="Yes, Delete"
                  cancelText="Cancel"
                  okButtonProps={{ danger: true }}
                >
                  <Button type="text" danger icon={<DeleteOutlined />} size="small" />
                </Popconfirm>
              </Tooltip>
            </>
          )}
        </Space>
      ),
    },
  ];

  return (
    <div style={{ paddingBottom: 24 }}>
      {/* 1. Header Title & Top Actions */}
      <div style={{ marginBottom: 20 }}>
        <Row justify="space-between" align="middle" gutter={[16, 16]}>
          <Col>
            <Title level={3} style={{ margin: 0, fontWeight: 700 }}>
              Student Directory & Class Roll
            </Title>
            <Text type="secondary" style={{ fontSize: 14 }}>
              View and manage students organized by class and section, monitor class strength, and handle admissions.
            </Text>
          </Col>
          <Col>
            <Space wrap>
              <Button
                icon={<ReloadOutlined />}
                onClick={() => fetchStudentsList(viewClass, viewSection)}
                loading={loading}
              >
                Refresh
              </Button>
              {canManage && (
                <Button
                  type="primary"
                  icon={<UserAddOutlined />}
                  onClick={handleOpenAdmitModal}
                  style={{ background: "#1677ff" }}
                >
                  Admit Student
                </Button>
              )}
            </Space>
          </Col>
        </Row>
      </div>

      {/* 2. Top Summary Metric Cards */}
      <Row gutter={[16, 16]} style={{ marginBottom: 20 }}>
        {/* Card 1: Total in Entire School */}
        <Col xs={24} sm={12} lg={6} style={{ display: "flex" }}>
          <Card
            hoverable
            style={{
              width: "100%",
              borderRadius: 12,
              borderLeft: "4px solid #1677ff",
              boxShadow: "0 2px 8px rgba(0,0,0,0.04)",
            }}
            bodyStyle={{
              padding: 18,
              height: "100%",
              display: "flex",
              flexDirection: "column",
              justifyContent: "space-between",
            }}
          >
            {depsLoading ? (
              <Skeleton active paragraph={{ rows: 1 }} />
            ) : (
              <Statistic
                title={
                  <span style={{ fontWeight: 600, color: "#475569" }}>
                    Total School Strength
                  </span>
                }
                value={totalSchoolStudents}
                prefix={<TeamOutlined style={{ color: "#1677ff" }} />}
                valueStyle={{ fontWeight: 800, color: "#0f172a", fontSize: 26 }}
              />
            )}
            <Text type="secondary" style={{ fontSize: 12, display: "block", marginTop: 6 }}>
              Across all {classes.length} grades in the institution
            </Text>
          </Card>
        </Col>

        {/* Card 2: Current Class / Section Strength */}
        <Col xs={24} sm={12} lg={6} style={{ display: "flex" }}>
          <Card
            hoverable
            style={{
              width: "100%",
              borderRadius: 12,
              borderLeft: "4px solid #52c41a",
              boxShadow: "0 2px 8px rgba(0,0,0,0.04)",
            }}
            bodyStyle={{
              padding: 18,
              height: "100%",
              display: "flex",
              flexDirection: "column",
              justifyContent: "space-between",
            }}
          >
            {loading ? (
              <Skeleton active paragraph={{ rows: 1 }} />
            ) : (
              <Statistic
                title={
                  <span style={{ fontWeight: 600, color: "#475569" }}>
                    {selectedClassObj
                      ? `${selectedClassObj.name} ${
                          selectedSectionObj
                            ? `- ${selectedSectionObj.name}`
                            : "(All Sections)"
                        }`
                      : "All Classes Enrolled"}
                  </span>
                }
                value={filteredStudents.length}
                suffix={
                  <span style={{ fontSize: 13, color: "#64748b", fontWeight: 400 }}>
                    / {currentClassTotalCount} in grade
                  </span>
                }
                prefix={<BookOutlined style={{ color: "#52c41a" }} />}
                valueStyle={{ fontWeight: 800, color: "#15803d", fontSize: 26 }}
              />
            )}
            <Text type="secondary" style={{ fontSize: 12, display: "block", marginTop: 6 }}>
              Students in currently selected view
            </Text>
          </Card>
        </Col>

        {/* Card 3: Gender Distribution in View */}
        <Col xs={24} sm={12} lg={6} style={{ display: "flex" }}>
          <Card
            hoverable
            style={{
              width: "100%",
              borderRadius: 12,
              borderLeft: "4px solid #722ed1",
              boxShadow: "0 2px 8px rgba(0,0,0,0.04)",
            }}
            bodyStyle={{
              padding: 18,
              height: "100%",
              display: "flex",
              flexDirection: "column",
              justifyContent: "space-between",
            }}
          >
            {loading ? (
              <Skeleton active paragraph={{ rows: 1 }} />
            ) : (
              <Statistic
                title={
                  <span style={{ fontWeight: 600, color: "#475569" }}>
                    Class Gender Ratio
                  </span>
                }
                value={`${stats.male} : ${stats.female}`}
                prefix={<UserOutlined style={{ color: "#722ed1" }} />}
                suffix={
                  <span style={{ fontSize: 13, color: "#64748b", fontWeight: 500 }}>
                    (Boys : Girls)
                  </span>
                }
                valueStyle={{ fontWeight: 800, color: "#581c87", fontSize: 26 }}
              />
            )}
            <Text type="secondary" style={{ fontSize: 12, display: "block", marginTop: 6 }}>
              {stats.totalInView > 0
                ? `${stats.male} Boys (${Math.round((stats.male / stats.totalInView) * 100)}%) · ${stats.female} Girls (${Math.round((stats.female / stats.totalInView) * 100)}%)`
                : "No students in this view"}
            </Text>
          </Card>
        </Col>

        {/* Card 4: Enrollment / Active Status */}
        <Col xs={24} sm={12} lg={6} style={{ display: "flex" }}>
          <Card
            hoverable
            style={{
              width: "100%",
              borderRadius: 12,
              borderLeft: "4px solid #13c2c2",
              boxShadow: "0 2px 8px rgba(0,0,0,0.04)",
            }}
            bodyStyle={{
              padding: 18,
              height: "100%",
              display: "flex",
              flexDirection: "column",
              justifyContent: "space-between",
            }}
          >
            {loading ? (
              <Skeleton active paragraph={{ rows: 1 }} />
            ) : (
              <Statistic
                title={
                  <span style={{ fontWeight: 600, color: "#475569" }}>
                    Enrollment Status
                  </span>
                }
                value={`${stats.active} Active`}
                prefix={<CheckCircleOutlined style={{ color: "#13c2c2" }} />}
                valueStyle={{ fontWeight: 800, color: "#0e7490", fontSize: 26 }}
              />
            )}
            <Text type="secondary" style={{ fontSize: 12, display: "block", marginTop: 6 }}>
              {stats.inactive > 0 ? `${stats.inactive} Inactive records` : "100% Active attendance status"}
            </Text>
          </Card>
        </Col>
      </Row>

      {/* 3. Main Directory Card with Class & Section Filters */}
      <Card
        style={{
          borderRadius: 14,
          boxShadow: "0 4px 16px rgba(0,0,0,0.04)",
        }}
        bodyStyle={{ padding: 20 }}
      >
        {/* Clean, Non-Scattered Filter Toolbar */}
        <div
          style={{
            background: "#f8fafc",
            padding: "16px 20px",
            borderRadius: 12,
            border: "1px solid #e2e8f0",
            marginBottom: 16,
          }}
        >
          <Row justify="space-between" align="middle" gutter={[16, 16]}>
            {/* Left Controls: Class Selector & Section Buttons */}
            <Col xs={24} lg={15}>
              <Space size="middle" wrap align="middle">
                <Space size="small">
                  <Text strong style={{ fontSize: 13, color: "#334155" }}>
                    Select Class:
                  </Text>
                  <Select
                    value={viewClass}
                    onChange={handleViewClassChange}
                    style={{ width: 230 }}
                    size="middle"
                    placeholder="Select Class"
                  >
                    <Option value="all">
                      🌐 All Classes ({totalSchoolStudents})
                    </Option>
                    {classes.map((c) => {
                      const count = classCountsMap[c._id] ?? 0;
                      return (
                        <Option key={c._id} value={c._id}>
                          📘 {c.name} ({count} Students)
                        </Option>
                      );
                    })}
                  </Select>
                </Space>

                {/* Section Filter directly inline */}
                {viewClass && viewClass !== "all" && viewSections.length > 0 && (
                  <Space size="small">
                    <Text strong style={{ fontSize: 13, color: "#334155", marginLeft: 4 }}>
                      Filter by Section:
                    </Text>
                    <Radio.Group
                      value={viewSection}
                      onChange={(e) => handleViewSectionChange(e.target.value)}
                      buttonStyle="solid"
                      size="middle"
                    >
                      <Radio.Button value="all">
                        All Sections ({currentClassTotalCount})
                      </Radio.Button>
                      {viewSections.map((sec) => {
                        const count =
                          sectionCountsMap[sec._id] ??
                          students.filter(
                            (s) => (s.section?._id || s.section) === sec._id
                          ).length;
                        return (
                          <Radio.Button key={sec._id} value={sec._id}>
                            {sec.name} ({count})
                          </Radio.Button>
                        );
                      })}
                    </Radio.Group>
                  </Space>
                )}
              </Space>
            </Col>

            {/* Right side: Search Box */}
            <Col xs={24} lg={9} style={{ textAlign: "right" }}>
              <Input
                placeholder="Search name, admission no, or roll..."
                prefix={<SearchOutlined style={{ color: "#9ca3af" }} />}
                value={searchText}
                onChange={(e) => setSearchText(e.target.value)}
                style={{ width: "100%", maxWidth: 300 }}
                allowClear
              />
            </Col>
          </Row>
        </div>

        {/* Active View Indicator Bar */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            padding: "8px 12px",
            background: "#f1f5f9",
            borderRadius: 8,
            marginBottom: 16,
            fontSize: 13,
          }}
        >
          <Space>
            <Text strong style={{ color: "#0f172a" }}>
              Currently Showing:
            </Text>
            <Tag color="blue" style={{ fontSize: 12, padding: "2px 8px" }}>
              {selectedClassObj ? selectedClassObj.name : "All Classes"}
            </Tag>
            {selectedSectionObj && (
              <Tag color="cyan" style={{ fontSize: 12, padding: "2px 8px" }}>
                {selectedSectionObj.name}
              </Tag>
            )}
            <Text type="secondary">
              ({filteredStudents.length} students displayed)
            </Text>
          </Space>

          <Text type="secondary" style={{ fontSize: 12 }}>
            Total in School: <Text strong>{totalSchoolStudents}</Text>
          </Text>
        </div>

        {/* Student Table */}
        <Table
          columns={columns}
          dataSource={filteredStudents}
          rowKey="_id"
          loading={loading}
          pagination={{
            pageSize: 15,
            showSizeChanger: true,
            pageSizeOptions: ["15", "30", "50", "100"],
            showTotal: (total, range) =>
              `Showing ${range[0]}-${range[1]} of ${total} students`,
          }}
          locale={{
            emptyText: (
              <Empty
                description={
                  <span>
                    No students found in{" "}
                    <strong>
                      {selectedClassObj ? selectedClassObj.name : "this view"}
                      {selectedSectionObj ? ` - ${selectedSectionObj.name}` : ""}
                    </strong>
                  </span>
                }
              />
            ),
          }}
        />
      </Card>

      {/* 4. Student Profile Details Drawer */}
      <Drawer
        title={
          selectedStudent ? (
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                width: "100%",
                paddingRight: 24,
              }}
            >
              <Space>
                <Avatar
                  size={40}
                  style={{
                    backgroundColor:
                      selectedStudent.gender === "female" ? "#eb2f96" : "#1677ff",
                  }}
                >
                  {(selectedStudent.firstName?.[0] || "S").toUpperCase()}
                </Avatar>
                <div>
                  <Text strong style={{ fontSize: 16, display: "block" }}>
                    {selectedStudent.firstName} {selectedStudent.lastName || ""}
                  </Text>
                  <Text type="secondary" style={{ fontSize: 12 }}>
                    Admission: {selectedStudent.admissionNumber}
                  </Text>
                </div>
              </Space>
              <Button
                type="primary"
                size="small"
                icon={<EditOutlined />}
                onClick={() => handleOpenEdit(selectedStudent)}
              >
                Edit
              </Button>
            </div>
          ) : (
            "Student Profile"
          )
        }
        placement="right"
        width={560}
        onClose={() => setDrawerOpen(false)}
        open={drawerOpen}
      >
        {selectedStudent && (
          <div>
            {/* Enrollment Summary Banner */}
            <Card
              size="small"
              style={{
                borderRadius: 8,
                background: "#f0fdf4",
                border: "1px solid #bbf7d0",
                marginBottom: 20,
              }}
            >
              <Row gutter={16}>
                <Col span={8}>
                  <Statistic
                    title={<span style={{ fontSize: 11 }}>Roll Number</span>}
                    value={`#${selectedStudent.rollNumber ?? "-"}`}
                    valueStyle={{ fontSize: 18, fontWeight: 700, color: "#166534" }}
                  />
                </Col>
                <Col span={8}>
                  <Statistic
                    title={<span style={{ fontSize: 11 }}>Class & Sec</span>}
                    value={`${selectedStudent.class?.name || "N/A"} - ${selectedStudent.section?.name || "N/A"}`}
                    valueStyle={{ fontSize: 15, fontWeight: 700, color: "#166534" }}
                  />
                </Col>
                <Col span={8}>
                  <Statistic
                    title={<span style={{ fontSize: 11 }}>Status</span>}
                    value={(selectedStudent.status || "active").toUpperCase()}
                    valueStyle={{ fontSize: 15, fontWeight: 700, color: "#166534" }}
                  />
                </Col>
              </Row>
            </Card>

            {/* Academic Information */}
            <Title level={5} style={{ marginTop: 0 }}>
              <BookOutlined style={{ marginRight: 6, color: "#1677ff" }} />
              Academic Details
            </Title>
            <Descriptions bordered size="small" column={1} style={{ marginBottom: 20 }}>
              <Descriptions.Item label="Academic Session">
                {selectedStudent.academicYear?.name || "Current Session"}
              </Descriptions.Item>
              <Descriptions.Item label="Admission Number">
                <Text strong style={{ color: "#1677ff", fontFamily: "monospace" }}>
                  {selectedStudent.admissionNumber}
                </Text>
              </Descriptions.Item>
              <Descriptions.Item label="Class & Section">
                {selectedStudent.class?.name} - {selectedStudent.section?.name}
              </Descriptions.Item>
              <Descriptions.Item label="Roll Number">
                {selectedStudent.rollNumber}
              </Descriptions.Item>
            </Descriptions>

            {/* Personal Information */}
            <Title level={5}>
              <IdcardOutlined style={{ marginRight: 6, color: "#52c41a" }} />
              Personal Information
            </Title>
            <Descriptions bordered size="small" column={1} style={{ marginBottom: 20 }}>
              <Descriptions.Item label="Full Name">
                {selectedStudent.firstName} {selectedStudent.middleName || ""} {selectedStudent.lastName || ""}
              </Descriptions.Item>
              <Descriptions.Item label="Gender">
                <Tag
                  color={selectedStudent.gender === "female" ? "magenta" : "blue"}
                  style={{ textTransform: "capitalize" }}
                >
                  {selectedStudent.gender || "N/A"}
                </Tag>
              </Descriptions.Item>
              <Descriptions.Item label="Date of Birth">
                {selectedStudent.dateOfBirth
                  ? new Date(selectedStudent.dateOfBirth).toLocaleDateString()
                  : "N/A"}
              </Descriptions.Item>
              <Descriptions.Item label="Blood Group">
                {selectedStudent.bloodGroup ? (
                  <Tag color="red">{selectedStudent.bloodGroup}</Tag>
                ) : (
                  "N/A"
                )}
              </Descriptions.Item>
              <Descriptions.Item label="Student Phone">
                {selectedStudent.phone || "N/A"}
              </Descriptions.Item>
              <Descriptions.Item label="Personal Email">
                {selectedStudent.email || "N/A"}
              </Descriptions.Item>
            </Descriptions>

            {/* Guardian / Parent Information */}
            <Title level={5}>
              <TeamOutlined style={{ marginRight: 6, color: "#722ed1" }} />
              Guardian & Parent Details
            </Title>
            <Descriptions bordered size="small" column={1} style={{ marginBottom: 20 }}>
              <Descriptions.Item label="Guardian Name">
                <Text strong>{getGuardianName(selectedStudent.guardian)}</Text>
              </Descriptions.Item>
              {selectedStudent.guardian?.fatherName && (
                <Descriptions.Item label="Father's Name">
                  {selectedStudent.guardian.fatherName}
                </Descriptions.Item>
              )}
              {selectedStudent.guardian?.motherName && (
                <Descriptions.Item label="Mother's Name">
                  {selectedStudent.guardian.motherName}
                </Descriptions.Item>
              )}
              <Descriptions.Item label="Relationship">
                <span style={{ textTransform: "capitalize" }}>
                  {selectedStudent.guardian?.relation || "Guardian"}
                </span>
              </Descriptions.Item>
              <Descriptions.Item label="Guardian Phone">
                {selectedStudent.guardian?.phone || selectedStudent.phone || "N/A"}
              </Descriptions.Item>
              {selectedStudent.guardian?.email && (
                <Descriptions.Item label="Guardian Email">
                  {selectedStudent.guardian.email}
                </Descriptions.Item>
              )}
              {selectedStudent.guardian?.address && (
                <Descriptions.Item label="Address">
                  {selectedStudent.guardian.address}
                </Descriptions.Item>
              )}
            </Descriptions>

            {/* System Account Information */}
            <Title level={5}>
              <UserOutlined style={{ marginRight: 6, color: "#13c2c2" }} />
              ERP Portal Account
            </Title>
            <Descriptions bordered size="small" column={1}>
              <Descriptions.Item label="Portal Email">
                {selectedStudent.user?.email || "No separate account"}
              </Descriptions.Item>
              <Descriptions.Item label="Account Status">
                <Tag color={selectedStudent.user?.isActive !== false ? "green" : "red"}>
                  {selectedStudent.user?.isActive !== false ? "ACTIVE" : "DISABLED"}
                </Tag>
              </Descriptions.Item>
              <Descriptions.Item label="Last Login">
                {selectedStudent.user?.lastLogin
                  ? new Date(selectedStudent.user.lastLogin).toLocaleString()
                  : "Never logged in"}
              </Descriptions.Item>
            </Descriptions>
          </div>
        )}
      </Drawer>

      {/* 5. Admission Modal */}
      <Modal
        title="New Student Admission"
        open={modalOpen}
        onCancel={() => setModalOpen(false)}
        footer={null}
        width={720}
        destroyOnClose
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={handleCreateStudent}
          requiredMark="optional"
          style={{ marginTop: 16 }}
        >
          <Row gutter={16}>
            <Col xs={24} sm={12}>
              <Form.Item
                name="admissionNumber"
                label="Admission Number"
                rules={[{ required: true, message: "Enter admission number" }]}
              >
                <Input placeholder="e.g. ADM-2026-001" style={{ textTransform: "uppercase" }} />
              </Form.Item>
            </Col>
            <Col xs={24} sm={12}>
              <Form.Item
                name="academicYear"
                label="Academic Session"
                rules={[{ required: true, message: "Select academic year" }]}
              >
                <Select placeholder="Select Session">
                  {academicYears.map((y) => (
                    <Option key={y._id} value={y._id}>
                      {y.name} {y.isCurrent && "(Current)"}
                    </Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col xs={24} sm={12}>
              <Form.Item
                name="firstName"
                label="First Name"
                rules={[{ required: true, message: "Enter first name" }]}
              >
                <Input placeholder="First Name" />
              </Form.Item>
            </Col>
            <Col xs={24} sm={12}>
              <Form.Item name="lastName" label="Last Name">
                <Input placeholder="Last Name" />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col xs={24} sm={8}>
              <Form.Item
                name="gender"
                label="Gender"
                rules={[{ required: true, message: "Select gender" }]}
              >
                <Select placeholder="Select Gender">
                  <Option value="male">Male</Option>
                  <Option value="female">Female</Option>
                  <Option value="other">Other</Option>
                </Select>
              </Form.Item>
            </Col>
            <Col xs={24} sm={8}>
              <Form.Item
                name="dateOfBirth"
                label="Date of Birth"
                rules={[{ required: true, message: "Select DOB" }]}
              >
                <DatePicker style={{ width: "100%" }} format="YYYY-MM-DD" />
              </Form.Item>
            </Col>
            <Col xs={24} sm={8}>
              <Form.Item name="bloodGroup" label="Blood Group">
                <Select placeholder="Blood Group">
                  {["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"].map((bg) => (
                    <Option key={bg} value={bg}>
                      {bg}
                    </Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col xs={24} sm={10}>
              <Form.Item
                name="classId"
                label="Class"
                rules={[{ required: true, message: "Select class" }]}
              >
                <Select placeholder="Select Class" onChange={handleModalClassChange}>
                  {classes.map((c) => (
                    <Option key={c._id} value={c._id}>
                      {c.name} ({c.code})
                    </Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
            <Col xs={24} sm={8}>
              <Form.Item
                name="sectionId"
                label="Section"
                rules={[{ required: true, message: "Select section" }]}
              >
                <Select placeholder="Select Section" disabled={!modalClassSelected && !form.getFieldValue("classId")}>
                  {sections.map((s) => (
                    <Option key={s._id} value={s._id}>
                      {s.name} (Cap: {s.capacity || 40})
                    </Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
            <Col xs={24} sm={6}>
              <Form.Item
                name="rollNumber"
                label="Roll No"
                rules={[{ required: true, message: "Enter roll no" }]}
              >
                <Input type="number" min={1} placeholder="1" />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col xs={24} sm={12}>
              <Form.Item name="guardianName" label="Guardian / Parent Name">
                <Input placeholder="Guardian Name" />
              </Form.Item>
            </Col>
            <Col xs={24} sm={12}>
              <Form.Item name="guardianPhone" label="Guardian Phone">
                <Input placeholder="+91 98765 43210" />
              </Form.Item>
            </Col>
          </Row>

          <div style={{ textAlign: "right", marginTop: 16 }}>
            <Space>
              <Button onClick={() => setModalOpen(false)}>Cancel</Button>
              <Button type="primary" htmlType="submit" loading={submitting}>
                Complete Admission
              </Button>
            </Space>
          </div>
        </Form>
      </Modal>

      {/* 6. Edit Student Modal */}
      <Modal
        title={`Edit Student Details: ${
          editingStudent
            ? `${editingStudent.firstName} ${editingStudent.lastName || ""}`
            : ""
        }`}
        open={editModalOpen}
        onCancel={() => setEditModalOpen(false)}
        footer={null}
        width={680}
        destroyOnClose
      >
        <Form
          form={editForm}
          layout="vertical"
          onFinish={handleUpdateStudent}
          requiredMark="optional"
          style={{ marginTop: 16 }}
        >
          <Row gutter={16}>
            <Col xs={24} sm={12}>
              <Form.Item
                name="firstName"
                label="First Name"
                rules={[{ required: true, message: "Enter first name" }]}
              >
                <Input placeholder="First Name" />
              </Form.Item>
            </Col>
            <Col xs={24} sm={12}>
              <Form.Item name="lastName" label="Last Name">
                <Input placeholder="Last Name" />
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
              <Form.Item name="bloodGroup" label="Blood Group">
                <Select placeholder="Blood Group">
                  {["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"].map((bg) => (
                    <Option key={bg} value={bg}>
                      {bg}
                    </Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
          </Row>

          <Divider style={{ margin: "14px 0" }}>
            <span style={{ fontSize: 13, color: "#64748b" }}>
              Guardian / Parent Contact Details
            </span>
          </Divider>

          <Row gutter={16}>
            <Col xs={24} sm={12}>
              <Form.Item
                name="guardianName"
                label="Guardian / Parent Name"
                rules={[{ required: true, message: "Enter guardian name" }]}
              >
                <Input placeholder="e.g. Mr. Rajesh Sharma" />
              </Form.Item>
            </Col>
            <Col xs={24} sm={12}>
              <Form.Item
                name="guardianPhone"
                label="Guardian Phone"
                rules={[{ required: true, message: "Enter guardian phone" }]}
              >
                <Input placeholder="e.g. 9876543210" />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col xs={24} sm={12}>
              <Form.Item name="guardianRelation" label="Relationship">
                <Select placeholder="Relationship">
                  <Option value="Father">Father</Option>
                  <Option value="Mother">Mother</Option>
                  <Option value="Guardian">Guardian</Option>
                  <Option value="Other">Other</Option>
                </Select>
              </Form.Item>
            </Col>
            <Col xs={24} sm={12}>
              <Form.Item name="phone" label="Student Phone Number">
                <Input placeholder="Student Phone" />
              </Form.Item>
            </Col>
          </Row>

          <div style={{ textAlign: "right", marginTop: 16 }}>
            <Space>
              <Button onClick={() => setEditModalOpen(false)}>Cancel</Button>
              <Button type="primary" htmlType="submit" loading={editSubmitting}>
                Save Changes
              </Button>
            </Space>
          </div>
        </Form>
      </Modal>
    </div>
  );
}
