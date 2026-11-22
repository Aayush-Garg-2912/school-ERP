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
  Tooltip,
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
// 1B. PARENT ATTENDANCE PORTAL COMPONENT
// ==========================================
function ParentAttendanceView({ user }) {
  const [loading, setLoading] = useState(true);
  const [children, setChildren] = useState([]);
  const [selectedChildId, setSelectedChildId] = useState(null);
  const [attendanceData, setAttendanceData] = useState(null);
  const [statusFilter, setStatusFilter] = useState("all");

  const fetchChildren = async () => {
    setLoading(true);
    try {
      const res = await api.get("/parents/me/children");
      if (res.data.success) {
        const list = res.data.data.students || [];
        setChildren(list);
        if (list.length > 0) {
          const firstId = list[0].student?._id || list[0]._id;
          setSelectedChildId(firstId);
        }
      }
    } catch (err) {
      console.error("Failed to load children:", err);
      message.error("Failed to load children records");
    } finally {
      setLoading(false);
    }
  };

  const fetchChildAttendance = async (studentId) => {
    if (!studentId) return;
    setLoading(true);
    try {
      const res = await api.get(`/attendance/my-child/${studentId}`);
      if (res.data.success) {
        setAttendanceData(res.data.data);
      }
    } catch (err) {
      console.error("Failed to load child attendance:", err);
      message.error("Failed to load attendance records");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchChildren();
  }, [user]);

  useEffect(() => {
    if (selectedChildId) {
      fetchChildAttendance(selectedChildId);
    }
  }, [selectedChildId]);

  const selectedChildObj = children.find(
    (c) => (c.student?._id || c._id) === selectedChildId
  );
  const childStudent = selectedChildObj?.student || selectedChildObj;

  const records = attendanceData?.attendance || [];
  const summary = attendanceData?.summary || {
    total: 0,
    present: 0,
    absent: 0,
    late: 0,
    leave: 0,
    percentage: 0,
  };

  const filteredRecords = records.filter((rec) => {
    if (statusFilter !== "all" && rec.status !== statusFilter) return false;
    return true;
  });

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
      title: "Remarks",
      dataIndex: "remarks",
      key: "remarks",
      render: (r) => r || <Text type="secondary">—</Text>,
    },
  ];

  return (
    <div style={{ maxWidth: 1100, margin: "0 auto" }}>
      <div style={{ marginBottom: 20 }}>
        <Title level={3} style={{ margin: 0, display: "flex", alignItems: "center", gap: 10 }}>
          <CheckSquareOutlined style={{ color: "#1677ff" }} /> Child Attendance Monitor
        </Title>
        <Text type="secondary">
          Track daily school attendance, punctuality, and overall attendance percentage for your children.
        </Text>
      </div>

      {children.length > 1 && (
        <Card size="small" style={{ marginBottom: 16, borderRadius: 8 }}>
          <Space align="center">
            <Text strong>Select Child:</Text>
            <Select
              style={{ width: 260 }}
              value={selectedChildId}
              onChange={setSelectedChildId}
            >
              {children.map((c) => {
                const s = c.student || c;
                return (
                  <Option key={s._id} value={s._id}>
                    {s.firstName} {s.lastName || ""} ({s.class?.name || "Class"} - {s.section?.name || "Sec"})
                  </Option>
                );
              })}
            </Select>
          </Space>
        </Card>
      )}

      {loading && !attendanceData ? (
        <div style={{ textAlign: "center", padding: 60 }}><Spin size="large" /></div>
      ) : (
        <>
          {childStudent && (
            <Card
              style={{
                marginBottom: 20,
                borderRadius: 12,
                background: "linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%)",
                borderColor: "#86efac",
              }}
            >
              <Row gutter={[16, 16]} align="middle">
                <Col xs={24} sm={16}>
                  <Space size="middle">
                    <Avatar size={54} style={{ backgroundColor: "#15803d", fontSize: 22 }}>
                      {(childStudent.firstName?.[0] || "C").toUpperCase()}
                    </Avatar>
                    <div>
                      <Title level={4} style={{ margin: 0, color: "#14532d" }}>
                        {childStudent.firstName} {childStudent.lastName || ""}
                      </Title>
                      <Space size="middle" style={{ marginTop: 4 }}>
                        <Tag color="green">Roll No: {childStudent.rollNumber || "N/A"}</Tag>
                        <Tag color="cyan">Adm No: {childStudent.admissionNumber}</Tag>
                        <Tag color="blue">
                          {childStudent.class?.name || "Class"} - {childStudent.section?.name || "Section"}
                        </Tag>
                      </Space>
                    </div>
                  </Space>
                </Col>
                <Col xs={24} sm={8} style={{ textAlign: "right" }}>
                  <Statistic
                    title={<span style={{ color: "#166534" }}>Overall Attendance Rate</span>}
                    value={`${summary.percentage || 0}%`}
                    valueStyle={{
                      fontWeight: 800,
                      color: (summary.percentage || 0) >= 75 ? "#15803d" : "#c2410c",
                      fontSize: 30,
                    }}
                  />
                </Col>
              </Row>
            </Card>
          )}

          <Row gutter={[16, 16]} style={{ marginBottom: 20 }}>
            <Col xs={12} sm={6}>
              <Card size="small" style={{ textAlign: "center", borderRadius: 8 }}>
                <Statistic title="Total Days" value={summary.total || 0} />
              </Card>
            </Col>
            <Col xs={12} sm={6}>
              <Card size="small" style={{ textAlign: "center", borderRadius: 8, background: "#f6ffed" }}>
                <Statistic title="Present" value={summary.present || 0} valueStyle={{ color: "#52c41a" }} />
              </Card>
            </Col>
            <Col xs={12} sm={6}>
              <Card size="small" style={{ textAlign: "center", borderRadius: 8, background: "#fff1f0" }}>
                <Statistic title="Absent" value={summary.absent || 0} valueStyle={{ color: "#ff4d4f" }} />
              </Card>
            </Col>
            <Col xs={12} sm={6}>
              <Card size="small" style={{ textAlign: "center", borderRadius: 8, background: "#fffbe6" }}>
                <Statistic
                  title="Late / Leave"
                  value={(summary.late || 0) + (summary.leave || 0)}
                  valueStyle={{ color: "#faad14" }}
                />
              </Card>
            </Col>
          </Row>

          <Card
            title={
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 8 }}>
                <span>Daily Attendance Log</span>
                <Radio.Group
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  size="small"
                >
                  <Radio.Button value="all">All</Radio.Button>
                  <Radio.Button value="present">Present</Radio.Button>
                  <Radio.Button value="absent">Absent</Radio.Button>
                  <Radio.Button value="late">Late</Radio.Button>
                  <Radio.Button value="leave">Leave</Radio.Button>
                </Radio.Group>
              </div>
            }
            style={{ borderRadius: 12, boxShadow: "0 2px 8px rgba(0,0,0,0.06)" }}
          >
            <Table
              dataSource={filteredRecords}
              columns={columns}
              rowKey="_id"
              pagination={{ pageSize: 15 }}
              locale={{ emptyText: "No attendance records recorded yet." }}
            />
          </Card>
        </>
      )}
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

  // If logged in as parent, render dedicated parent attendance view
  if (user?.role === "parent") {
    return <ParentAttendanceView user={user} />;
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

  const currentSectionObj = sections.find((s) => s._id === selectedSection);
  const teacherId = user?.teacher?._id || user?.teacher;
  const classTeacherId =
    currentSectionObj?.classTeacher?._id || currentSectionObj?.classTeacher;

  const getTeacherDisplayName = (ct) => {
    if (!ct) return "Assigned Class Teacher";
    if (typeof ct === "object" && ct.firstName) {
      return `${ct.firstName} ${ct.lastName || ""}`.trim();
    }
    return "Assigned Class Teacher";
  };

  // Strict: only the assigned class teacher of this section can mark/submit attendance
  const isClassTeacher =
    user?.role === "teacher" &&
    Boolean(
      teacherId &&
      classTeacherId &&
      String(teacherId) === String(classTeacherId)
    );

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
    if (!isClassTeacher) {
      message.error(
        "Access Denied: Only the designated Class Teacher of this class and section is authorized to submit attendance."
      );
      return;
    }

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
          disabled={!isClassTeacher}
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
          disabled={!isClassTeacher}
          placeholder={isClassTeacher ? "Optional remark..." : "—"}
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
          {isClassTeacher ? (
            <Button
              type="primary"
              icon={<SaveOutlined />}
              onClick={handleSubmitAttendance}
              loading={submitting}
            >
              Submit Daily Attendance
            </Button>
          ) : (
            <Tooltip
              title={
                currentSectionObj?.classTeacher
                  ? `Only designated Class Teacher (${getTeacherDisplayName(currentSectionObj.classTeacher)}) can take attendance.`
                  : "Only the designated Class Teacher can take attendance."
              }
            >
              <Button disabled icon={<SaveOutlined />}>
                Submit Daily Attendance (Read-Only)
              </Button>
            </Tooltip>
          )}
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
                  {s.name} ({s.code}){s.classTeacher ? ` • CT: ${getTeacherDisplayName(s.classTeacher)}` : ""}
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
                  {/* Authorization & Access Level Banner */}
                  {currentSectionObj && (
                    <Alert
                      type={isClassTeacher ? "success" : "info"}
                      showIcon
                      style={{ marginBottom: 16, borderRadius: 8 }}
                      message={
                        isClassTeacher
                          ? "Designated Class Teacher Access Verified"
                          : "Read-Only Attendance View"
                      }
                      description={
                        isClassTeacher
                          ? `You are the assigned Class Teacher for ${currentSectionObj.name}. You have exclusive authority to take and submit daily roll call for this section.`
                          : `Only the designated Class Teacher (${getTeacherDisplayName(currentSectionObj.classTeacher)}) can take or edit attendance. Administrators, Principals, and other staff have read-only access.`
                      }
                    />
                  )}

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
                      <Button size="small" disabled={!isClassTeacher} onClick={() => setAllStatus("present")}>
                        Mark All Present
                      </Button>
                      <Button size="small" disabled={!isClassTeacher} onClick={() => setAllStatus("absent")}>
                        Mark All Absent
                      </Button>
                      <Button size="small" disabled={!isClassTeacher} onClick={() => setAllStatus("late")}>
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
