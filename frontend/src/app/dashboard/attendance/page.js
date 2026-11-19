"use client";

import React, { useState, useEffect } from "react";
import {
  Card,
  Tabs,
  Table,
  Button,
  Tag,
  Space,
  DatePicker,
  Select,
  Radio,
  Input,
  Row,
  Col,
  Statistic,
  Typography,
  Divider,
  Alert,
  Popconfirm,
  message,
  Progress,
  Avatar,
  Spin,
} from "antd";
import {
  CheckSquareOutlined,
  CalendarOutlined,
  HistoryOutlined,
  ReloadOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  ClockCircleOutlined,
  SaveOutlined,
  DeleteOutlined,
  UserOutlined,
  SmileOutlined,
} from "@ant-design/icons";
import dayjs from "dayjs";
import api from "@/lib/api";
import { useAuth } from "@/context/AuthContext";

const { Title, Text, Paragraph } = Typography;
const { Option } = Select;

// ==========================================
// 1. STUDENT ATTENDANCE PORTAL COMPONENT
// ==========================================
function StudentAttendanceView({ user }) {
  const [loading, setLoading] = useState(true);
  const [records, setRecords] = useState([]);
  const [studentProfile, setStudentProfile] = useState(null);
  const [statusFilter, setStatusFilter] = useState("all");
  const [monthFilter, setMonthFilter] = useState(null);

  const fetchStudentData = async () => {
    setLoading(true);
    try {
      // 1. Fetch attendance records
      const attRes = await api.get("/attendance");
      if (attRes.data.success) {
        setRecords(attRes.data.data?.attendance || []);
      }

      // 2. Fetch student profile details
      if (user?.student) {
        const studentId = typeof user.student === "object" ? user.student._id : user.student;
        const stuRes = await api.get(`/students/${studentId}`).catch(() => ({ data: { success: false } }));
        if (stuRes.data?.success) {
          setStudentProfile(stuRes.data.data.student);
        }
      }
    } catch (err) {
      console.error("Failed to load student attendance:", err);
      message.error("Failed to load attendance records");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStudentData();
  }, [user]);

  // Filter records
  const filteredRecords = records.filter((rec) => {
    if (statusFilter !== "all" && rec.status !== statusFilter) return false;
    if (monthFilter) {
      const recDate = dayjs(rec.date);
      if (recDate.format("YYYY-MM") !== monthFilter.format("YYYY-MM")) return false;
    }
    return true;
  });

  // Calculate statistics
  const totalDays = records.length;
  const presentDays = records.filter((r) => r.status === "present").length;
  const absentDays = records.filter((r) => r.status === "absent").length;
  const lateDays = records.filter((r) => r.status === "late").length;
  const leaveDays = records.filter((r) => r.status === "leave").length;
  const attendanceRate =
    totalDays > 0 ? Math.round(((presentDays + lateDays * 0.5) / totalDays) * 100) : 0;

  const columns = [
    {
      title: "Date",
      dataIndex: "date",
      key: "date",
      render: (d) => (
        <Space>
          <CalendarOutlined style={{ color: "#1677ff" }} />
          <Text strong>{dayjs(d).format("dddd, DD MMMM YYYY")}</Text>
        </Space>
      ),
      sorter: (a, b) => new Date(a.date) - new Date(b.date),
      defaultSortOrder: "descend",
    },
    {
      title: "Status",
      dataIndex: "status",
      key: "status",
      render: (st) => {
        const map = {
          present: <Tag color="success" icon={<CheckCircleOutlined />}>Present</Tag>,
          absent: <Tag color="error" icon={<CloseCircleOutlined />}>Absent</Tag>,
          late: <Tag color="warning" icon={<ClockCircleOutlined />}>Late Arrival</Tag>,
          leave: <Tag color="processing">Authorized Leave</Tag>,
        };
        return map[st] || <Tag>{st}</Tag>;
      },
    },
    {
      title: "Marked By",
      dataIndex: "markedBy",
      key: "markedBy",
      render: (t) =>
        t ? (
          <Text>
            {t.firstName} {t.lastName || ""} {t.employeeId ? `(${t.employeeId})` : ""}
          </Text>
        ) : (
          <Text type="secondary">Class Teacher</Text>
        ),
    },
    {
      title: "Remarks",
      dataIndex: "remarks",
      key: "remarks",
      render: (rem) => rem || <Text type="secondary">—</Text>,
    },
  ];

  const className =
    studentProfile?.class?.name || (typeof studentProfile?.class === "string" ? studentProfile.class : "Grade 10");
  const sectionName =
    studentProfile?.section?.name || (typeof studentProfile?.section === "string" ? studentProfile.section : "Section A");

  return (
    <div style={{ maxWidth: 1200, margin: "0 auto" }}>
      {/* Student Profile Header */}
      <Card
        bordered={false}
        style={{
          marginBottom: 24,
          borderRadius: 12,
          boxShadow: "0 2px 8px rgba(0,0,0,0.06)",
          background: "linear-gradient(135deg, #f0f7ff 0%, #ffffff 100%)",
          border: "1px solid #d6e4ff",
        }}
      >
        <Row align="middle" justify="space-between" gutter={[16, 16]}>
          <Col xs={24} md={16}>
            <Space size="middle" align="center">
              <Avatar
                size={64}
                style={{ backgroundColor: "#1677ff", fontSize: 24, fontWeight: "bold" }}
              >
                {user?.name?.[0] || "S"}
              </Avatar>
              <div>
                <Title level={3} style={{ margin: 0 }}>
                  {user?.name || "Student"}
                </Title>
                <Space wrap style={{ marginTop: 4 }}>
                  <Tag color="blue">{className} - {sectionName}</Tag>
                  <Tag color="cyan">Roll No: {studentProfile?.rollNumber || "1"}</Tag>
                  <Tag color="geekblue">Adm No: {studentProfile?.admissionNumber || "GIS-2026-0001"}</Tag>
                </Space>
              </div>
            </Space>
          </Col>
          <Col xs={24} md={8} style={{ textAlign: "right" }}>
            <Button icon={<ReloadOutlined />} onClick={fetchStudentData} loading={loading}>
              Refresh Logs
            </Button>
          </Col>
        </Row>
      </Card>

      {/* Attendance KPI Cards */}
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={24} sm={12} lg={6}>
          <Card bordered={false} style={{ height: "100%", boxShadow: "0 2px 8px rgba(0,0,0,0.06)", textAlign: "center" }}>
            <Progress
              type="circle"
              percent={attendanceRate}
              size={110}
              strokeColor={attendanceRate >= 75 ? "#52c41a" : attendanceRate >= 60 ? "#faad14" : "#ff4d4f"}
              format={(percent) => (
                <div>
                  <div style={{ fontSize: 20, fontWeight: 700 }}>{percent}%</div>
                  <div style={{ fontSize: 11, color: "#8c8c8c" }}>Attendance</div>
                </div>
              )}
            />
            <div style={{ marginTop: 12 }}>
              <Tag color={attendanceRate >= 75 ? "success" : "warning"}>
                {attendanceRate >= 75 ? "Eligible for Exams" : "Low Attendance"}
              </Tag>
            </div>
          </Card>
        </Col>

        <Col xs={24} sm={12} lg={6}>
          <Card bordered={false} style={{ height: "100%", boxShadow: "0 2px 8px rgba(0,0,0,0.06)" }}>
            <Statistic
              title={<span style={{ fontWeight: 600 }}>Present Days</span>}
              value={presentDays}
              suffix={`/ ${totalDays}`}
              prefix={<CheckCircleOutlined style={{ color: "#52c41a" }} />}
              valueStyle={{ color: "#52c41a", fontWeight: 700 }}
            />
            <Text type="secondary" style={{ fontSize: 12, display: "block", marginTop: 8 }}>
              Recorded full classroom attendance
            </Text>
          </Card>
        </Col>

        <Col xs={24} sm={12} lg={6}>
          <Card bordered={false} style={{ height: "100%", boxShadow: "0 2px 8px rgba(0,0,0,0.06)" }}>
            <Statistic
              title={<span style={{ fontWeight: 600 }}>Absent Days</span>}
              value={absentDays}
              prefix={<CloseCircleOutlined style={{ color: "#ff4d4f" }} />}
              valueStyle={{ color: "#ff4d4f", fontWeight: 700 }}
            />
            <Text type="secondary" style={{ fontSize: 12, display: "block", marginTop: 8 }}>
              Unexcused class absences
            </Text>
          </Card>
        </Col>

        <Col xs={24} sm={12} lg={6}>
          <Card bordered={false} style={{ height: "100%", boxShadow: "0 2px 8px rgba(0,0,0,0.06)" }}>
            <Statistic
              title={<span style={{ fontWeight: 600 }}>Late / Leaves</span>}
              value={lateDays + leaveDays}
              prefix={<ClockCircleOutlined style={{ color: "#faad14" }} />}
              valueStyle={{ color: "#faad14", fontWeight: 700 }}
            />
            <Text type="secondary" style={{ fontSize: 12, display: "block", marginTop: 8 }}>
              {lateDays} late entries, {leaveDays} approved leaves
            </Text>
          </Card>
        </Col>
      </Row>

      {/* Attendance History Table Card */}
      <Card
        bordered={false}
        title={
          <Space>
            <HistoryOutlined style={{ color: "#1677ff" }} />
            <span>Attendance Log History</span>
          </Space>
        }
        style={{ boxShadow: "0 2px 8px rgba(0,0,0,0.06)" }}
        extra={
          <Space wrap>
            <DatePicker
              picker="month"
              placeholder="Filter by Month"
              value={monthFilter}
              onChange={setMonthFilter}
              allowClear
            />
            <Select
              value={statusFilter}
              onChange={setStatusFilter}
              style={{ width: 140 }}
            >
              <Option value="all">All Status</Option>
              <Option value="present">Present</Option>
              <Option value="absent">Absent</Option>
              <Option value="late">Late Arrival</Option>
              <Option value="leave">Leave</Option>
            </Select>
          </Space>
        }
      >
        <Table
          columns={columns}
          dataSource={filteredRecords}
          rowKey="_id"
          loading={loading}
          pagination={{ pageSize: 10, showTotal: (total) => `Total ${total} entries` }}
        />
      </Card>
    </div>
  );
}

// ==========================================
// 2. TEACHER / ADMIN ATTENDANCE MARKING COMPONENT
// ==========================================
export default function AttendancePage() {
  const { user } = useAuth();

  // If logged in as student, render dedicated student attendance view
  if (user?.role === "student") {
    return <StudentAttendanceView user={user} />;
  }

  const [activeTab, setActiveTab] = useState("marking");

  // Selection Filters
  const [academicYears, setAcademicYears] = useState([]);
  const [selectedYear, setSelectedYear] = useState(null);
  const [classes, setClasses] = useState([]);
  const [selectedClass, setSelectedClass] = useState(null);
  const [sections, setSections] = useState([]);
  const [selectedSection, setSelectedSection] = useState(null);
  const [selectedDate, setSelectedDate] = useState(dayjs());

  // Marking Sheet State
  const [roster, setRoster] = useState([]);
  const [attendanceMap, setAttendanceMap] = useState({});
  const [remarksMap, setRemarksMap] = useState({});
  const [sheetLoading, setSheetLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // History Log State
  const [historyLogs, setHistoryLogs] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyStatusFilter, setHistoryStatusFilter] = useState("all");

  // Fetch initial sessions
  const fetchAcademicYears = async () => {
    try {
      const { data } = await api.get("/academic-years");
      if (data.success) {
        const years = data.data.academicYears || [];
        setAcademicYears(years);
        const current = years.find((y) => y.isCurrent) || years[0];
        if (current) setSelectedYear(current._id);
      }
    } catch (err) {
      console.error("Failed to load academic sessions:", err);
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

  const fetchSections = async (classId) => {
    if (!classId) return;
    try {
      const { data } = await api.get(`/sections?classId=${classId}`);
      if (data.success) {
        const secList = data.data.sections || [];
        setSections(secList);
        if (secList.length > 0) {
          setSelectedSection(secList[0]._id);
        } else {
          setSelectedSection(null);
        }
      }
    } catch (err) {
      console.error("Failed to load sections:", err);
    }
  };

  useEffect(() => {
    fetchAcademicYears();
  }, []);

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

  // Load roster and existing attendance
  const loadClassRoster = async () => {
    if (!selectedYear || !selectedClass || !selectedSection) {
      message.warning("Please select Academic Year, Class, and Section");
      return;
    }

    setSheetLoading(true);
    try {
      // 1. Fetch students for section
      const studentRes = await api.get(
        `/students?academicYear=${selectedYear}&classId=${selectedClass}&sectionId=${selectedSection}&status=active`
      );
      const studentList = studentRes.data.data?.students || [];
      setRoster(studentList);

      // 2. Fetch existing attendance for this date
      const formattedDate = selectedDate.format("YYYY-MM-DD");
      const attRes = await api.get(
        `/attendance?academicYear=${selectedYear}&classId=${selectedClass}&sectionId=${selectedSection}&date=${formattedDate}`
      );
      const existingRecords = attRes.data.data?.attendance || [];

      // 3. Populate marking maps
      const newAttendanceMap = {};
      const newRemarksMap = {};

      studentList.forEach((s) => {
        const record = existingRecords.find(
          (r) => (r.student?._id || r.student) === s._id
        );
        newAttendanceMap[s._id] = record ? record.status : "present";
        newRemarksMap[s._id] = record ? record.remarks || "" : "";
      });

      setAttendanceMap(newAttendanceMap);
      setRemarksMap(newRemarksMap);
    } catch (err) {
      console.error("Failed to load roster:", err);
      message.error("Failed to load students for this class/section");
    } finally {
      setSheetLoading(false);
    }
  };

  useEffect(() => {
    if (selectedYear && selectedClass && selectedSection) {
      loadClassRoster();
    }
  }, [selectedYear, selectedClass, selectedSection, selectedDate]);

  // Bulk set status (e.g. Mark all present)
  const setAllStatus = (status) => {
    const updated = { ...attendanceMap };
    roster.forEach((s) => {
      updated[s._id] = status;
    });
    setAttendanceMap(updated);
  };

  // Submit attendance roll call
  const handleSubmitAttendance = async () => {
    if (roster.length === 0) {
      message.warning("No students in the roster to mark");
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        academicYear: selectedYear,
        date: selectedDate.format("YYYY-MM-DD"),
        classId: selectedClass,
        sectionId: selectedSection,
        attendance: roster.map((s) => ({
          studentId: s._id,
          status: attendanceMap[s._id] || "present",
          remarks: remarksMap[s._id] || "",
        })),
      };

      const { data } = await api.post("/attendance", payload);
      if (data.success) {
        message.success(data.message || "Attendance recorded successfully");
        if (activeTab === "history") {
          fetchAttendanceHistory();
        }
      }
    } catch (err) {
      console.error("Attendance submission error:", err);
      message.error(err.response?.data?.message || "Failed to record attendance");
    } finally {
      setSubmitting(false);
    }
  };

  // Fetch Attendance History
  const fetchAttendanceHistory = async () => {
    if (!selectedClass || !selectedSection) return;
    setHistoryLoading(true);
    try {
      const formattedDate = selectedDate.format("YYYY-MM-DD");
      const { data } = await api.get(
        `/attendance?classId=${selectedClass}&sectionId=${selectedSection}&date=${formattedDate}`
      );
      if (data.success) {
        setHistoryLogs(data.data.attendance || []);
      }
    } catch (err) {
      console.error("Failed to load history logs:", err);
    } finally {
      setHistoryLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === "history") {
      fetchAttendanceHistory();
    }
  }, [activeTab, selectedClass, selectedSection, selectedDate]);

  // Compute live statistics for current sheet
  const computeStats = () => {
    const total = roster.length;
    let present = 0;
    let absent = 0;
    let late = 0;
    let leave = 0;

    Object.values(attendanceMap).forEach((st) => {
      if (st === "present") present++;
      else if (st === "absent") absent++;
      else if (st === "late") late++;
      else if (st === "leave") leave++;
    });

    const percent = total > 0 ? Math.round(((present + late * 0.5) / total) * 100) : 0;
    return { total, present, absent, late, leave, percent };
  };

  const stats = computeStats();

  // Marking Sheet Columns
  const rosterColumns = [
    {
      title: "Roll No",
      dataIndex: "rollNumber",
      key: "rollNumber",
      width: 90,
      sorter: (a, b) => a.rollNumber - b.rollNumber,
      defaultSortOrder: "ascend",
      render: (r) => <Tag color="blue">{r}</Tag>,
    },
    {
      title: "Adm No",
      dataIndex: "admissionNumber",
      key: "admissionNumber",
      width: 140,
      render: (adm) => <Text code>{adm}</Text>,
    },
    {
      title: "Student Name",
      key: "name",
      render: (_, r) => (
        <Space>
          <UserOutlined style={{ color: "#1677ff" }} />
          <Text strong>
            {r.firstName} {r.lastName || ""}
          </Text>
        </Space>
      ),
    },
    {
      title: "Attendance Status",
      key: "status",
      width: 320,
      render: (_, r) => (
        <Radio.Group
          value={attendanceMap[r._id] || "present"}
          onChange={(e) =>
            setAttendanceMap({
              ...attendanceMap,
              [r._id]: e.target.value,
            })
          }
          buttonStyle="solid"
          size="middle"
        >
          <Radio.Button value="present" style={{ color: attendanceMap[r._id] === "present" ? "#fff" : "#52c41a" }}>
            Present
          </Radio.Button>
          <Radio.Button value="absent" style={{ color: attendanceMap[r._id] === "absent" ? "#fff" : "#ff4d4f" }}>
            Absent
          </Radio.Button>
          <Radio.Button value="late" style={{ color: attendanceMap[r._id] === "late" ? "#fff" : "#faad14" }}>
            Late
          </Radio.Button>
          <Radio.Button value="leave" style={{ color: attendanceMap[r._id] === "leave" ? "#fff" : "#1677ff" }}>
            Leave
          </Radio.Button>
        </Radio.Group>
      ),
    },
    {
      title: "Remarks / Reason",
      key: "remarks",
      render: (_, r) => (
        <Input
          placeholder="Optional remark..."
          value={remarksMap[r._id] || ""}
          onChange={(e) =>
            setRemarksMap({
              ...remarksMap,
              [r._id]: e.target.value,
            })
          }
          maxLength={100}
        />
      ),
    },
  ];

  // History Columns
  const historyColumns = [
    {
      title: "Student",
      key: "student",
      render: (_, r) => (
        <div>
          <Text strong>{r.student?.firstName} {r.student?.lastName || ""}</Text>
          <br />
          <Text type="secondary" style={{ fontSize: 12 }}>
            Roll: {r.student?.rollNumber || "N/A"} | Adm: {r.student?.admissionNumber || "N/A"}
          </Text>
        </div>
      ),
    },
    {
      title: "Class & Section",
      key: "class",
      render: (_, r) => (
        <Tag color="cyan">
          {r.class?.name} - {r.section?.name}
        </Tag>
      ),
    },
    {
      title: "Status",
      dataIndex: "status",
      key: "status",
      render: (st) => {
        const map = {
          present: <Tag color="success">Present</Tag>,
          absent: <Tag color="error">Absent</Tag>,
          late: <Tag color="warning">Late Arrival</Tag>,
          leave: <Tag color="processing">On Leave</Tag>,
        };
        return map[st] || <Tag>{st}</Tag>;
      },
    },
    {
      title: "Marked By",
      dataIndex: "markedBy",
      key: "markedBy",
      render: (t) =>
        t ? (
          <Text>
            {t.firstName} {t.lastName || ""} ({t.employeeId})
          </Text>
        ) : (
          <Text type="secondary">N/A</Text>
        ),
    },
    {
      title: "Remarks",
      dataIndex: "remarks",
      key: "remarks",
      render: (rem) => rem || <Text type="secondary">—</Text>,
    },
  ];

  const filteredHistory = historyLogs.filter((log) => {
    if (historyStatusFilter === "all") return true;
    return log.status === historyStatusFilter;
  });

  return (
    <div style={{ maxWidth: 1300, margin: "0 auto" }}>
      {/* Top Banner */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          marginBottom: 20,
          flexWrap: "wrap",
          gap: 12,
        }}
      >
        <div>
          <Title level={3} style={{ margin: 0, display: "flex", alignItems: "center", gap: 10 }}>
            <CheckSquareOutlined style={{ color: "#1677ff" }} /> Daily Attendance System
          </Title>
          <Text type="secondary">
            Record daily roll calls, track student attendance percentage, and inspect history logs.
          </Text>
        </div>
        <Space wrap>
          <Button icon={<ReloadOutlined />} onClick={loadClassRoster} loading={sheetLoading}>
            Refresh Roster
          </Button>
          <Button
            type="primary"
            icon={<SaveOutlined />}
            onClick={handleSubmitAttendance}
            loading={submitting}
          >
            Submit Daily Attendance
          </Button>
        </Space>
      </div>

      {/* Filter Selection Panel */}
      <Card bordered={false} style={{ marginBottom: 20, boxShadow: "0 2px 8px rgba(0,0,0,0.06)" }}>
        <Row gutter={[16, 16]} align="middle">
          <Col xs={24} sm={12} md={6}>
            <Text strong style={{ display: "block", marginBottom: 6 }}>
              Academic Session:
            </Text>
            <Select
              style={{ width: "100%" }}
              value={selectedYear}
              onChange={setSelectedYear}
              placeholder="Select Session"
            >
              {academicYears.map((y) => (
                <Option key={y._id} value={y._id}>
                  {y.name} {y.isCurrent ? "(Current)" : ""}
                </Option>
              ))}
            </Select>
          </Col>

          <Col xs={24} sm={12} md={6}>
            <Text strong style={{ display: "block", marginBottom: 6 }}>
              Grade / Class:
            </Text>
            <Select
              style={{ width: "100%" }}
              value={selectedClass}
              onChange={(val) => {
                setSelectedClass(val);
                setSelectedSection(null);
              }}
              placeholder="Select Class"
            >
              {classes.map((c) => (
                <Option key={c._id} value={c._id}>
                  {c.name} ({c.code})
                </Option>
              ))}
            </Select>
          </Col>

          <Col xs={24} sm={12} md={6}>
            <Text strong style={{ display: "block", marginBottom: 6 }}>
              Section / Division:
            </Text>
            <Select
              style={{ width: "100%" }}
              value={selectedSection}
              onChange={setSelectedSection}
              placeholder="Select Section"
              disabled={sections.length === 0}
            >
              {sections.map((s) => (
                <Option key={s._id} value={s._id}>
                  {s.name} ({s.code})
                </Option>
              ))}
            </Select>
          </Col>

          <Col xs={24} sm={12} md={6}>
            <Text strong style={{ display: "block", marginBottom: 6 }}>
              Attendance Date:
            </Text>
            <DatePicker
              style={{ width: "100%" }}
              value={selectedDate}
              onChange={(d) => setSelectedDate(d || dayjs())}
              format="DD MMM YYYY"
              allowClear={false}
            />
          </Col>
        </Row>
      </Card>

      {/* Main Tabs Container */}
      <Card bordered={false} style={{ boxShadow: "0 2px 8px rgba(0,0,0,0.06)" }}>
        <Tabs
          activeKey={activeTab}
          onChange={setActiveTab}
          items={[
            {
              key: "marking",
              label: (
                <span>
                  <CheckSquareOutlined /> Roll Call Marking Sheet
                </span>
              ),
              children: (
                <div>
                  {/* Summary Bar */}
                  <Row gutter={[16, 16]} style={{ marginBottom: 20 }}>
                    <Col xs={12} sm={6} md={4}>
                      <Card size="small" style={{ background: "#f8fafc", textAlign: "center" }}>
                        <Statistic title="Total Students" value={stats.total} />
                      </Card>
                    </Col>
                    <Col xs={12} sm={6} md={4}>
                      <Card size="small" style={{ background: "#f6ffed", textAlign: "center" }}>
                        <Statistic
                          title="Present"
                          value={stats.present}
                          valueStyle={{ color: "#52c41a" }}
                        />
                      </Card>
                    </Col>
                    <Col xs={12} sm={6} md={4}>
                      <Card size="small" style={{ background: "#fff1f0", textAlign: "center" }}>
                        <Statistic
                          title="Absent"
                          value={stats.absent}
                          valueStyle={{ color: "#ff4d4f" }}
                        />
                      </Card>
                    </Col>
                    <Col xs={12} sm={6} md={4}>
                      <Card size="small" style={{ background: "#fffbe6", textAlign: "center" }}>
                        <Statistic
                          title="Late"
                          value={stats.late}
                          valueStyle={{ color: "#faad14" }}
                        />
                      </Card>
                    </Col>
                    <Col xs={12} sm={6} md={4}>
                      <Card size="small" style={{ background: "#e6f4ff", textAlign: "center" }}>
                        <Statistic
                          title="Leave"
                          value={stats.leave}
                          valueStyle={{ color: "#1677ff" }}
                        />
                      </Card>
                    </Col>
                    <Col xs={12} sm={6} md={4}>
                      <Card size="small" style={{ background: "#fafafa", textAlign: "center" }}>
                        <Statistic
                          title="Attendance Rate"
                          value={`${stats.percent}%`}
                          valueStyle={{ color: stats.percent >= 75 ? "#52c41a" : "#faad14" }}
                        />
                      </Card>
                    </Col>
                  </Row>

                  {/* Bulk Actions Bar */}
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      marginBottom: 16,
                      flexWrap: "wrap",
                      gap: 8,
                    }}
                  >
                    <Space wrap>
                      <Text strong>Quick Actions:</Text>
                      <Button size="small" onClick={() => setAllStatus("present")}>
                        Mark All Present
                      </Button>
                      <Button size="small" onClick={() => setAllStatus("absent")}>
                        Mark All Absent
                      </Button>
                      <Button size="small" onClick={() => setAllStatus("late")}>
                        Mark All Late
                      </Button>
                    </Space>
                    <Text type="secondary">
                      Date: <strong>{selectedDate.format("dddd, DD MMMM YYYY")}</strong>
                    </Text>
                  </div>

                  {/* Roster Table */}
                  <Table
                    columns={rosterColumns}
                    dataSource={roster}
                    rowKey="_id"
                    loading={sheetLoading}
                    pagination={false}
                    locale={{
                      emptyText: "Click 'Load Class Roster' above to fetch enrolled students",
                    }}
                  />
                </div>
              ),
            },
            {
              key: "history",
              label: (
                <span>
                  <HistoryOutlined /> Attendance History Logs
                </span>
              ),
              children: (
                <div>
                  <Row justify="space-between" align="middle" style={{ marginBottom: 16 }}>
                    <Col>
                      <Space>
                        <Select
                          value={historyStatusFilter}
                          onChange={setHistoryStatusFilter}
                          style={{ width: 160 }}
                        >
                          <Option value="all">All Statuses</Option>
                          <Option value="present">Present Only</Option>
                          <Option value="absent">Absent Only</Option>
                          <Option value="late">Late Only</Option>
                          <Option value="leave">On Leave Only</Option>
                        </Select>
                        <Button icon={<ReloadOutlined />} onClick={fetchAttendanceHistory}>
                          Refresh
                        </Button>
                      </Space>
                    </Col>
                    <Col>
                      <Text type="secondary">
                        Showing {filteredHistory.length} records for {selectedDate.format("DD MMM YYYY")}
                      </Text>
                    </Col>
                  </Row>

                  <Table
                    columns={historyColumns}
                    dataSource={filteredHistory}
                    rowKey="_id"
                    loading={historyLoading}
                    pagination={{ pageSize: 15 }}
                  />
                </div>
              ),
            },
          ]}
        />
      </Card>
    </div>
  );
}
