"use client";

import React, { useState, useEffect } from "react";
import {
  Card,
  Table,
  Button,
  Tag,
  Space,
  Select,
  InputNumber,
  Input,
  Modal,
  Row,
  Col,
  Statistic,
  Typography,
  Divider,
  Descriptions,
  message,
  Avatar,
  Empty,
  Progress,
  Spin,
} from "antd";
import {
  FileDoneOutlined,
  PrinterOutlined,
  ReloadOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  SaveOutlined,
  SendOutlined,
  EyeOutlined,
  TrophyOutlined,
  CalendarOutlined,
  UserOutlined,
  BookOutlined,
} from "@ant-design/icons";
import { useSearchParams } from "next/navigation";
import api from "@/lib/api";
import { useAuth } from "@/context/AuthContext";

const { Title, Text, Paragraph } = Typography;
const { Option } = Select;

// ==========================================
// 1. STUDENT EXAM RESULTS & REPORT CARD VIEW
// ==========================================
function StudentResultsView({ user }) {
  const [exams, setExams] = useState([]);
  const [selectedExamId, setSelectedExamId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [reportCard, setReportCard] = useState(null);
  const [studentProfile, setStudentProfile] = useState(null);

  // 1. Load active exams
  const fetchExams = async () => {
    try {
      const { data } = await api.get("/exams");
      if (data.success) {
        const examList = data.data.exams || [];
        setExams(examList);
        if (examList.length > 0 && !selectedExamId) {
          const published = examList.find((e) => e.status === "published") || examList[0];
          setSelectedExamId(published._id);
        }
      }
    } catch (err) {
      console.error("Failed to load exams:", err);
    }
  };

  // 2. Load student profile
  const fetchProfile = async () => {
    if (user?.student) {
      const studentId = typeof user.student === "object" ? user.student._id : user.student;
      try {
        const res = await api.get(`/students/${studentId}`);
        if (res.data?.success) {
          setStudentProfile(res.data.data.student);
        }
      } catch (err) {
        console.error("Failed to load student profile:", err);
      }
    }
  };

  useEffect(() => {
    fetchExams();
    fetchProfile();
  }, [user]);

  // 3. Load report card when selectedExamId changes
  const fetchReportCard = async (examId) => {
    if (!examId || !user?.student) return;
    setLoading(true);
    const studentId = typeof user.student === "object" ? user.student._id : user.student;
    try {
      const { data } = await api.get(`/results/report-card/${studentId}/${examId}`);
      if (data.success) {
        setReportCard(data.data);
      } else {
        setReportCard(null);
      }
    } catch (err) {
      console.error("Failed to load report card:", err);
      setReportCard(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (selectedExamId) {
      fetchReportCard(selectedExamId);
    }
  }, [selectedExamId]);

  const summary = reportCard?.summary;
  const results = reportCard?.results || [];

  const handlePrint = () => {
    window.print();
  };

  const columns = [
    {
      title: "Subject",
      key: "subject",
      render: (_, r) => (
        <Space>
          <BookOutlined style={{ color: "#1677ff" }} />
          <div>
            <Text strong>{r.subject?.name || "Subject"}</Text>
            {r.subject?.code && (
              <Text type="secondary" style={{ fontSize: 12, marginLeft: 6 }}>
                ({r.subject.code})
              </Text>
            )}
          </div>
        </Space>
      ),
    },
    {
      title: "Max Marks",
      dataIndex: "maxMarks",
      key: "maxMarks",
      align: "center",
      render: (m) => <Text>{m}</Text>,
    },
    {
      title: "Pass Marks",
      dataIndex: "passingMarks",
      key: "passingMarks",
      align: "center",
      render: (p) => <Text type="secondary">{p}</Text>,
    },
    {
      title: "Theory Score",
      dataIndex: "theoryMarks",
      key: "theoryMarks",
      align: "center",
      render: (t) => t ?? "—",
    },
    {
      title: "Practical Score",
      dataIndex: "practicalMarks",
      key: "practicalMarks",
      align: "center",
      render: (p) => p ?? "—",
    },
    {
      title: "Total Marks",
      dataIndex: "totalMarks",
      key: "totalMarks",
      align: "center",
      render: (tot, r) => (
        <Text strong style={{ color: tot >= (r.passingMarks || 33) ? "#389e0d" : "#cf1322", fontSize: 15 }}>
          {tot}
        </Text>
      ),
    },
    {
      title: "Percentage",
      dataIndex: "percentage",
      key: "percentage",
      align: "center",
      render: (pct) => `${pct}%`,
    },
    {
      title: "Grade",
      dataIndex: "grade",
      key: "grade",
      align: "center",
      render: (g) => {
        const colorMap = {
          "A+": "geekblue",
          A: "green",
          "B+": "cyan",
          B: "blue",
          C: "gold",
          D: "orange",
          F: "red",
        };
        return <Tag color={colorMap[g] || "default"} style={{ fontWeight: 600 }}>{g}</Tag>;
      },
    },
    {
      title: "Status",
      dataIndex: "result",
      key: "result",
      align: "center",
      render: (res) => (
        <Tag color={res === "pass" ? "success" : "error"} icon={res === "pass" ? <CheckCircleOutlined /> : <CloseCircleOutlined />}>
          {res === "pass" ? "Passed" : "Failed"}
        </Tag>
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
      {/* Top Controls Banner */}
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
            <TrophyOutlined style={{ color: "#faad14" }} /> My Academic Report Card
          </Title>
          <Text type="secondary">
            View published examination results, subject-wise scores, and comprehensive grade transcripts.
          </Text>
        </div>
        <Space wrap>
          <Select
            value={selectedExamId}
            onChange={setSelectedExamId}
            style={{ width: 280 }}
            placeholder="Select Examination"
          >
            {exams.map((ex) => (
              <Option key={ex._id} value={ex._id}>
                {ex.name} {ex.status === "published" ? "✓" : `(${ex.status})`}
              </Option>
            ))}
          </Select>
          <Button icon={<ReloadOutlined />} onClick={() => fetchReportCard(selectedExamId)} loading={loading}>
            Refresh
          </Button>
          <Button type="primary" icon={<PrinterOutlined />} onClick={handlePrint} disabled={!reportCard}>
            Print Report Card
          </Button>
        </Space>
      </div>

      {loading ? (
        <div style={{ textAlign: "center", padding: "60px 0" }}>
          <Spin size="large" />
          <div style={{ marginTop: 12 }}>
            <Text type="secondary">Retrieving official academic transcript...</Text>
          </div>
        </div>
      ) : !reportCard || results.length === 0 ? (
        <Card bordered={false} style={{ textAlign: "center", padding: "40px 0", boxShadow: "0 2px 8px rgba(0,0,0,0.06)" }}>
          <Empty
            description={
              <div>
                <Title level={4}>No Exam Results Published Yet</Title>
                <Paragraph type="secondary">
                  Results for this examination term have not been published by the academic department.
                  Please check back later or select another examination term.
                </Paragraph>
              </div>
            }
          />
        </Card>
      ) : (
        <>
          {/* Student Profile Card */}
          <Card
            bordered={false}
            style={{
              marginBottom: 24,
              borderRadius: 12,
              boxShadow: "0 2px 8px rgba(0,0,0,0.06)",
              background: "linear-gradient(135deg, #f6ffed 0%, #ffffff 100%)",
              border: "1px solid #b7eb8f",
            }}
          >
            <Row align="middle" justify="space-between" gutter={[16, 16]}>
              <Col xs={24} md={16}>
                <Space size="middle" align="center">
                  <Avatar
                    size={64}
                    style={{ backgroundColor: "#52c41a", fontSize: 24, fontWeight: "bold" }}
                  >
                    {user?.name?.[0] || "S"}
                  </Avatar>
                  <div>
                    <Title level={3} style={{ margin: 0 }}>
                      {user?.name || "Student"}
                    </Title>
                    <Space wrap style={{ marginTop: 4 }}>
                      <Tag color="green">{className} - {sectionName}</Tag>
                      <Tag color="cyan">Roll No: {studentProfile?.rollNumber || "1"}</Tag>
                      <Tag color="geekblue">Adm No: {studentProfile?.admissionNumber || "GIS-2026-0001"}</Tag>
                    </Space>
                  </div>
                </Space>
              </Col>
              <Col xs={24} md={8} style={{ textAlign: "right" }}>
                <Text type="secondary" style={{ display: "block" }}>
                  Examination Term:
                </Text>
                <Text strong style={{ fontSize: 16, color: "#1677ff" }}>
                  {reportCard?.exam?.name || "Term Assessment"}
                </Text>
              </Col>
            </Row>
          </Card>

          {/* Performance KPI Cards */}
          <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
            <Col xs={24} sm={12} lg={6}>
              <Card bordered={false} style={{ height: "100%", boxShadow: "0 2px 8px rgba(0,0,0,0.06)" }}>
                <Statistic
                  title={<span style={{ fontWeight: 600 }}>Total Marks Obtained</span>}
                  value={summary?.totalObtainedMarks || 0}
                  suffix={`/ ${summary?.totalMaxMarks || 0}`}
                  prefix={<FileDoneOutlined style={{ color: "#1677ff" }} />}
                  valueStyle={{ color: "#1677ff", fontWeight: 700 }}
                />
                <Text type="secondary" style={{ fontSize: 12, display: "block", marginTop: 8 }}>
                  Across {summary?.totalSubjects || 0} subjects tested
                </Text>
              </Card>
            </Col>

            <Col xs={24} sm={12} lg={6}>
              <Card bordered={false} style={{ height: "100%", boxShadow: "0 2px 8px rgba(0,0,0,0.06)" }}>
                <Statistic
                  title={<span style={{ fontWeight: 600 }}>Overall Percentage</span>}
                  value={summary?.percentage || 0}
                  suffix="%"
                  prefix={<TrophyOutlined style={{ color: "#52c41a" }} />}
                  valueStyle={{ color: "#52c41a", fontWeight: 700 }}
                />
                <Text type="secondary" style={{ fontSize: 12, display: "block", marginTop: 8 }}>
                  Cumulative aggregate score
                </Text>
              </Card>
            </Col>

            <Col xs={24} sm={12} lg={6}>
              <Card bordered={false} style={{ height: "100%", boxShadow: "0 2px 8px rgba(0,0,0,0.06)" }}>
                <Statistic
                  title={<span style={{ fontWeight: 600 }}>Final Grade Awarded</span>}
                  value={summary?.grade || "N/A"}
                  valueStyle={{
                    color: summary?.grade?.startsWith("A") ? "#52c41a" : "#1677ff",
                    fontWeight: 800,
                    fontSize: 28,
                  }}
                />
                <Text type="secondary" style={{ fontSize: 12, display: "block", marginTop: 8 }}>
                  Institutional evaluation grade
                </Text>
              </Card>
            </Col>

            <Col xs={24} sm={12} lg={6}>
              <Card bordered={false} style={{ height: "100%", boxShadow: "0 2px 8px rgba(0,0,0,0.06)" }}>
                <div style={{ marginBottom: 4 }}>
                  <Text type="secondary" style={{ fontWeight: 600, fontSize: 14 }}>
                    Result Status
                  </Text>
                </div>
                <div style={{ marginTop: 8 }}>
                  <Tag
                    color={summary?.result === "pass" ? "success" : "error"}
                    style={{ fontSize: 16, padding: "4px 12px", fontWeight: 700 }}
                  >
                    {summary?.result === "pass" ? "PASSED WITH DISTINCTION" : "FAILED"}
                  </Tag>
                </div>
                <Text type="secondary" style={{ fontSize: 12, display: "block", marginTop: 12 }}>
                  {summary?.passedSubjects || 0} Passed • {summary?.failedSubjects || 0} Failed
                </Text>
              </Card>
            </Col>
          </Row>

          {/* Subject-Wise Marks Breakdown Table */}
          <Card
            bordered={false}
            title={
              <Space>
                <BookOutlined style={{ color: "#1677ff" }} />
                <span>Subject-Wise Marks Breakdown</span>
              </Space>
            }
            style={{ boxShadow: "0 2px 8px rgba(0,0,0,0.06)" }}
          >
            <Table
              columns={columns}
              dataSource={results}
              rowKey={(r) => r.subject?._id || r.subject?.name || Math.random()}
              pagination={false}
            />

            <Divider style={{ margin: "24px 0" }} />

            {/* Institutional Sign-off footer */}
            <Row justify="space-between" align="middle" style={{ padding: "12px 16px" }}>
              <Col>
                <Text type="secondary" style={{ fontSize: 12 }}>
                  * This digital transcript is generated directly by the School ERP System.
                </Text>
              </Col>
              <Col>
                <Space size="large">
                  <div style={{ textAlign: "center" }}>
                    <div style={{ height: 24 }}></div>
                    <Text strong style={{ borderTop: "1px dashed #8c8c8c", paddingTop: 4, display: "block" }}>
                      Class Teacher Sign
                    </Text>
                  </div>
                  <div style={{ textAlign: "center" }}>
                    <div style={{ height: 24 }}></div>
                    <Text strong style={{ borderTop: "1px dashed #8c8c8c", paddingTop: 4, display: "block" }}>
                      Principal / Registrar
                    </Text>
                  </div>
                </Space>
              </Col>
            </Row>
          </Card>
        </>
      )}
    </div>
  );
}

// ==========================================
// 2. TEACHER / ADMIN RESULTS ENTRY VIEW
// ==========================================
export default function ResultsPage() {
  const { user } = useAuth();

  // If student, render dedicated student results & report card view
  if (user?.role === "student") {
    return <StudentResultsView user={user} />;
  }

  const searchParams = useSearchParams();
  const preSelectedExamId = searchParams.get("examId");

  const [exams, setExams] = useState([]);
  const [selectedExamId, setSelectedExamId] = useState(preSelectedExamId || null);
  const [examSubjects, setExamSubjects] = useState([]);
  const [selectedPaperId, setSelectedPaperId] = useState(null);
  const [students, setStudents] = useState([]);
  const [resultsMap, setResultsMap] = useState({});
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState({});

  // Report Card Modal
  const [reportCardOpen, setReportCardOpen] = useState(false);
  const [reportCardData, setReportCardData] = useState(null);
  const [reportCardLoading, setReportCardLoading] = useState(false);

  // Fetch all active exams
  const fetchExams = async () => {
    try {
      const { data } = await api.get("/exams");
      if (data.success) {
        const examList = data.data.exams || [];
        setExams(examList);
        if (!selectedExamId && examList.length > 0) {
          setSelectedExamId(examList[0]._id);
        }
      }
    } catch (err) {
      console.error("Failed to load exams:", err);
    }
  };

  useEffect(() => {
    fetchExams();
  }, []);

  // Fetch exam papers whenever exam changes
  const fetchExamPapers = async (examId) => {
    if (!examId) return;
    try {
      const { data } = await api.get(`/exams/${examId}`);
      if (data.success) {
        const papers = data.data.subjects || [];
        setExamSubjects(papers);
        if (papers.length > 0) {
          setSelectedPaperId(papers[0]._id);
        } else {
          setSelectedPaperId(null);
          setStudents([]);
        }
      }
    } catch (err) {
      console.error("Failed to load exam subjects:", err);
    }
  };

  useEffect(() => {
    if (selectedExamId) {
      fetchExamPapers(selectedExamId);
    }
  }, [selectedExamId]);

  // Fetch enrolled students and existing marks for this exam paper
  const fetchMarksSheet = async () => {
    if (!selectedExamId || !selectedPaperId) return;
    setLoading(true);
    try {
      const paper = examSubjects.find((p) => p._id === selectedPaperId);
      if (!paper) return;

      const classId = paper.class?._id || paper.class;

      // 1. Fetch class students
      const studentRes = await api.get(`/students?classId=${classId}&status=active`);
      const studentList = studentRes.data.data?.students || [];
      setStudents(studentList);

      // 2. Fetch existing results
      const resultsRes = await api.get(`/results/exam/${selectedExamId}?classId=${classId}`);
      const existingResults = resultsRes.data.data?.results || [];

      const initialMap = {};
      studentList.forEach((st) => {
        const found = existingResults.find(
          (r) =>
            (r.student?._id || r.student) === st._id &&
            (r.examSubject?._id || r.examSubject) === selectedPaperId
        );

        initialMap[st._id] = {
          theoryMarks: found?.theoryMarks ?? 0,
          practicalMarks: found?.practicalMarks ?? 0,
          remarks: found?.remarks || "",
          savedResult: found || null,
        };
      });

      setResultsMap(initialMap);
    } catch (err) {
      message.error("Failed to load marks sheet");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (selectedExamId && selectedPaperId) {
      fetchMarksSheet();
    }
  }, [selectedExamId, selectedPaperId, examSubjects]);

  const activePaper = examSubjects.find((p) => p._id === selectedPaperId);

  // Save single student marks
  const handleSaveResult = async (studentId) => {
    const entry = resultsMap[studentId];
    if (!entry) return;

    setSubmitting({ ...submitting, [studentId]: true });
    try {
      const payload = {
        examId: selectedExamId,
        examSubjectId: selectedPaperId,
        studentId,
        theoryMarks: entry.theoryMarks || 0,
        practicalMarks: entry.practicalMarks || 0,
        remarks: entry.remarks || "",
      };

      const { data } = await api.post("/results", payload);
      if (data.success) {
        message.success("Marks saved successfully");
        setResultsMap({
          ...resultsMap,
          [studentId]: {
            ...entry,
            savedResult: data.data.result,
          },
        });
      }
    } catch (err) {
      console.error("Save result error:", err);
      message.error(err.response?.data?.message || "Failed to save marks");
    } finally {
      setSubmitting({ ...submitting, [studentId]: false });
    }
  };

  // Publish / Unpublish all results for this exam
  const handleTogglePublish = async (publishStatus) => {
    try {
      const { data } = await api.patch(`/results/exam/${selectedExamId}/publish`, {
        published: publishStatus,
      });
      if (data.success) {
        message.success(data.message);
        fetchExams();
      }
    } catch (err) {
      message.error("Failed to update publish status");
    }
  };

  // View Student Report Card Modal
  const handleViewReportCard = async (studentId) => {
    setReportCardOpen(true);
    setReportCardLoading(true);
    try {
      const { data } = await api.get(`/results/report-card/${studentId}/${selectedExamId}`);
      if (data.success) {
        setReportCardData(data.data);
      }
    } catch (err) {
      message.error("Failed to load student report card");
    } finally {
      setReportCardLoading(false);
    }
  };

  const columns = [
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
        <Text strong>
          {r.firstName} {r.lastName || ""}
        </Text>
      ),
    },
    {
      title: `Theory Marks (Max: ${activePaper?.theoryMaxMarks ?? activePaper?.maxMarks ?? 100})`,
      key: "theoryMarks",
      width: 170,
      render: (_, r) => (
        <InputNumber
          min={0}
          max={activePaper?.theoryMaxMarks ?? activePaper?.maxMarks ?? 100}
          value={resultsMap[r._id]?.theoryMarks}
          onChange={(val) =>
            setResultsMap({
              ...resultsMap,
              [r._id]: { ...resultsMap[r._id], theoryMarks: val },
            })
          }
          style={{ width: "100%" }}
        />
      ),
    },
    ...(activePaper?.practicalMaxMarks > 0
      ? [
          {
            title: `Practical (Max: ${activePaper.practicalMaxMarks})`,
            key: "practicalMarks",
            width: 160,
            render: (_, r) => (
              <InputNumber
                min={0}
                max={activePaper.practicalMaxMarks}
                value={resultsMap[r._id]?.practicalMarks}
                onChange={(val) =>
                  setResultsMap({
                    ...resultsMap,
                    [r._id]: { ...resultsMap[r._id], practicalMarks: val },
                  })
                }
                style={{ width: "100%" }}
              />
            ),
          },
        ]
      : []),
    {
      title: "Total",
      key: "total",
      width: 90,
      render: (_, r) => {
        const t = (resultsMap[r._id]?.theoryMarks || 0) + (resultsMap[r._id]?.practicalMarks || 0);
        return <Text strong>{t}</Text>;
      },
    },
    {
      title: "Grade & Status",
      key: "grade",
      width: 140,
      render: (_, r) => {
        const saved = resultsMap[r._id]?.savedResult;
        if (!saved) return <Tag>Not Saved</Tag>;
        return (
          <Space>
            <Tag color={saved.result === "pass" ? "green" : "red"}>{saved.grade || "N/A"}</Tag>
            <Tag color={saved.result === "pass" ? "success" : "error"}>
              {saved.result?.toUpperCase()}
            </Tag>
          </Space>
        );
      },
    },
    {
      title: "Remarks",
      key: "remarks",
      render: (_, r) => (
        <Input
          placeholder="Remarks..."
          value={resultsMap[r._id]?.remarks}
          onChange={(e) =>
            setResultsMap({
              ...resultsMap,
              [r._id]: { ...resultsMap[r._id], remarks: e.target.value },
            })
          }
        />
      ),
    },
    {
      title: "Actions",
      key: "actions",
      width: 170,
      render: (_, r) => (
        <Space>
          <Button
            type="primary"
            size="small"
            icon={<SaveOutlined />}
            loading={submitting[r._id]}
            onClick={() => handleSaveResult(r._id)}
          >
            Save
          </Button>
          <Button
            size="small"
            icon={<EyeOutlined />}
            onClick={() => handleViewReportCard(r._id)}
          >
            Report
          </Button>
        </Space>
      ),
    },
  ];

  const currentExam = exams.find((e) => e._id === selectedExamId);

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
            <FileDoneOutlined style={{ color: "#1677ff" }} /> Exam Results & Evaluation Desk
          </Title>
          <Text type="secondary">
            Enter marks, compute automated grades, evaluate academic performance, and print report cards.
          </Text>
        </div>
        <Space wrap>
          {currentExam?.status === "published" ? (
            <Button onClick={() => handleTogglePublish(false)}>
              Unpublish Results
            </Button>
          ) : (
            <Button
              type="primary"
              icon={<SendOutlined />}
              onClick={() => handleTogglePublish(true)}
            >
              Publish Results to Students & Parents
            </Button>
          )}
        </Space>
      </div>

      {/* Filter Toolbar */}
      <Card bordered={false} style={{ marginBottom: 20, boxShadow: "0 2px 8px rgba(0,0,0,0.06)" }}>
        <Row gutter={[16, 16]} align="middle">
          <Col xs={24} md={12}>
            <Text strong style={{ display: "block", marginBottom: 6 }}>
              Select Examination:
            </Text>
            <Select
              style={{ width: "100%" }}
              value={selectedExamId}
              onChange={setSelectedExamId}
              placeholder="Select Exam Term"
            >
              {exams.map((ex) => (
                <Option key={ex._id} value={ex._id}>
                  {ex.name} — ({ex.type}) • {ex.status?.toUpperCase()}
                </Option>
              ))}
            </Select>
          </Col>

          <Col xs={24} md={12}>
            <Text strong style={{ display: "block", marginBottom: 6 }}>
              Select Subject Paper:
            </Text>
            <Select
              style={{ width: "100%" }}
              value={selectedPaperId}
              onChange={setSelectedPaperId}
              placeholder="Select Subject Paper"
              disabled={examSubjects.length === 0}
            >
              {examSubjects.map((sub) => (
                <Option key={sub._id} value={sub._id}>
                  {sub.subject?.name} ({sub.class?.name}) — Max Marks: {sub.maxMarks}
                </Option>
              ))}
            </Select>
          </Col>
        </Row>
      </Card>

      {/* Marks Sheet */}
      <Card
        bordered={false}
        title={
          <Space>
            <span>Marks Entry Sheet</span>
            {activePaper && (
              <Tag color="blue">
                {activePaper.subject?.name} • Class: {activePaper.class?.name} • Pass: {activePaper.passingMarks}
              </Tag>
            )}
          </Space>
        }
        style={{ boxShadow: "0 2px 8px rgba(0,0,0,0.06)" }}
        extra={
          <Button icon={<ReloadOutlined />} onClick={fetchMarksSheet} loading={loading}>
            Refresh Sheet
          </Button>
        }
      >
        <Table
          columns={columns}
          dataSource={students}
          rowKey="_id"
          loading={loading}
          pagination={false}
          locale={{ emptyText: "Select an exam and subject paper above to load students" }}
        />
      </Card>

      {/* Report Card Modal */}
      <Modal
        title={
          <Space>
            <TrophyOutlined style={{ color: "#faad14" }} />
            <span>Academic Performance Report Card</span>
          </Space>
        }
        open={reportCardOpen}
        onCancel={() => setReportCardOpen(false)}
        width={850}
        footer={[
          <Button key="close" onClick={() => setReportCardOpen(false)}>
            Close
          </Button>,
          <Button key="print" type="primary" icon={<PrinterOutlined />} onClick={() => window.print()}>
            Print Report Card
          </Button>,
        ]}
      >
        {reportCardLoading ? (
          <div style={{ textAlign: "center", padding: "40px 0" }}>
            <Spin size="large" />
          </div>
        ) : reportCardData ? (
          <div>
            <Descriptions bordered size="small" column={{ xs: 1, sm: 2 }}>
              <Descriptions.Item label="Student Name">
                {reportCardData.student?.firstName} {reportCardData.student?.lastName}
              </Descriptions.Item>
              <Descriptions.Item label="Admission Number">
                {reportCardData.student?.admissionNumber}
              </Descriptions.Item>
              <Descriptions.Item label="Roll Number">
                {reportCardData.student?.rollNumber}
              </Descriptions.Item>
              <Descriptions.Item label="Examination">
                {reportCardData.exam?.name}
              </Descriptions.Item>
            </Descriptions>

            <Divider style={{ margin: "16px 0" }}>Subject Performance</Divider>

            <Table
              size="small"
              pagination={false}
              rowKey={(r) => r.subject?.name || Math.random()}
              dataSource={reportCardData.results || []}
              columns={[
                { title: "Subject", dataIndex: ["subject", "name"], key: "sub" },
                { title: "Max Marks", dataIndex: "maxMarks", key: "max", align: "center" },
                { title: "Obtained", dataIndex: "totalMarks", key: "obt", align: "center" },
                { title: "Percentage", dataIndex: "percentage", key: "pct", align: "center", render: (p) => `${p}%` },
                { title: "Grade", dataIndex: "grade", key: "grd", align: "center", render: (g) => <Tag color="blue">{g}</Tag> },
                {
                  title: "Result",
                  dataIndex: "result",
                  key: "res",
                  align: "center",
                  render: (r) => <Tag color={r === "pass" ? "green" : "red"}>{r?.toUpperCase()}</Tag>,
                },
              ]}
            />

            {reportCardData.summary && (
              <Row gutter={16} style={{ marginTop: 20 }}>
                <Col span={6}>
                  <Card size="small" style={{ textAlign: "center", background: "#f8fafc" }}>
                    <Statistic
                      title="Total Marks"
                      value={reportCardData.summary.totalObtainedMarks}
                      suffix={`/ ${reportCardData.summary.totalMaxMarks}`}
                    />
                  </Card>
                </Col>
                <Col span={6}>
                  <Card size="small" style={{ textAlign: "center", background: "#f6ffed" }}>
                    <Statistic
                      title="Percentage"
                      value={reportCardData.summary.percentage}
                      suffix="%"
                      valueStyle={{ color: "#52c41a" }}
                    />
                  </Card>
                </Col>
                <Col span={6}>
                  <Card size="small" style={{ textAlign: "center", background: "#e6f4ff" }}>
                    <Statistic
                      title="Final Grade"
                      value={reportCardData.summary.grade}
                      valueStyle={{ color: "#1677ff" }}
                    />
                  </Card>
                </Col>
                <Col span={6}>
                  <Card size="small" style={{ textAlign: "center", background: "#fafafa" }}>
                    <Statistic
                      title="Outcome"
                      value={reportCardData.summary.result?.toUpperCase()}
                      valueStyle={{ color: reportCardData.summary.result === "pass" ? "#52c41a" : "#ff4d4f" }}
                    />
                  </Card>
                </Col>
              </Row>
            )}
          </div>
        ) : (
          <Empty description="No report card data found" />
        )}
      </Modal>
    </div>
  );
}
