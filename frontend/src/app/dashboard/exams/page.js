"use client";

import React, { useState, useEffect } from "react";
import {
  Card,
  Table,
  Button,
  Tag,
  Space,
  Modal,
  Drawer,
  Form,
  Input,
  Select,
  DatePicker,
  InputNumber,
  Popconfirm,
  Typography,
  Row,
  Col,
  Divider,
  message,
} from "antd";
import {
  CalendarOutlined,
  PlusOutlined,
  ReloadOutlined,
  DeleteOutlined,
  BookOutlined,
  CheckCircleOutlined,
  SendOutlined,
  FileDoneOutlined,
  ClockCircleOutlined,
} from "@ant-design/icons";
import dayjs from "dayjs";
import Link from "next/link";
import api from "@/lib/api";

const { Title, Text, Paragraph } = Typography;
const { Option } = Select;
const { TextArea } = Input;

export default function ExamsPage() {
  const [exams, setExams] = useState([]);
  const [academicYears, setAcademicYears] = useState([]);
  const [selectedYear, setSelectedYear] = useState(null);
  const [classes, setClasses] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [loading, setLoading] = useState(false);

  // Exam Modal
  const [examModalOpen, setExamModalOpen] = useState(false);
  const [submittingExam, setSubmittingExam] = useState(false);
  const [examForm] = Form.useForm();

  // Schedule Drawer State
  const [scheduleDrawerOpen, setScheduleDrawerOpen] = useState(false);
  const [selectedExam, setSelectedExam] = useState(null);
  const [examSubjects, setExamSubjects] = useState([]);
  const [drawerLoading, setDrawerLoading] = useState(false);
  const [addSubjectModalOpen, setAddSubjectModalOpen] = useState(false);
  const [submittingPaper, setSubmittingPaper] = useState(false);
  const [paperForm] = Form.useForm();

  const fetchDependencies = async () => {
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

  const fetchExams = async (yearId) => {
    if (!yearId) return;
    setLoading(true);
    try {
      const { data } = await api.get(`/exams?academicYear=${yearId}`);
      if (data.success) {
        setExams(data.data.exams || []);
      }
    } catch (err) {
      message.error(err.response?.data?.message || "Failed to load exams");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDependencies();
  }, []);

  useEffect(() => {
    if (selectedYear) {
      fetchClasses(selectedYear);
      fetchExams(selectedYear);
    }
  }, [selectedYear]);

  // Create Exam
  const handleCreateExam = async (values) => {
    setSubmittingExam(true);
    try {
      const [startDate, endDate] = values.dates;
      const payload = {
        academicYear: selectedYear,
        name: values.name.trim(),
        type: values.type,
        startDate: startDate.format("YYYY-MM-DD"),
        endDate: endDate.format("YYYY-MM-DD"),
        description: values.description || "",
      };

      const { data } = await api.post("/exams", payload);
      if (data.success) {
        message.success("Exam cycle created successfully!");
        setExamModalOpen(false);
        examForm.resetFields();
        fetchExams(selectedYear);
      }
    } catch (err) {
      message.error(err.response?.data?.message || "Failed to create exam");
    } finally {
      setSubmittingExam(false);
    }
  };

  // Status Update
  const handleUpdateStatus = async (examId, newStatus) => {
    try {
      const { data } = await api.patch(`/exams/${examId}/status`, { status: newStatus });
      if (data.success) {
        message.success(`Exam status updated to ${newStatus.toUpperCase()}`);
        fetchExams(selectedYear);
      }
    } catch (err) {
      message.error(err.response?.data?.message || "Failed to update status");
    }
  };

  // Delete Exam
  const handleDeleteExam = async (id) => {
    try {
      const { data } = await api.delete(`/exams/${id}`);
      if (data.success) {
        message.success("Exam and associated papers deleted successfully");
        fetchExams(selectedYear);
      }
    } catch (err) {
      message.error(err.response?.data?.message || "Failed to delete exam");
    }
  };

  // Open Schedule Drawer
  const handleOpenScheduleDrawer = async (record) => {
    setSelectedExam(record);
    setScheduleDrawerOpen(true);
    setDrawerLoading(true);
    try {
      const { data } = await api.get(`/exams/${record._id}`);
      if (data.success) {
        setExamSubjects(data.data.subjects || []);
      }
    } catch (err) {
      message.error("Failed to load exam subjects schedule");
    } finally {
      setDrawerLoading(false);
    }
  };

  // Add Subject Paper to Exam
  const handleAddPaper = async (values) => {
    setSubmittingPaper(true);
    try {
      const payload = {
        classId: values.classId,
        subjectId: values.subjectId,
        maxMarks: Number(values.maxMarks),
        passingMarks: Number(values.passingMarks),
        theoryMaxMarks: Number(values.theoryMaxMarks || values.maxMarks),
        practicalMaxMarks: Number(values.practicalMaxMarks || 0),
        examDate: values.examDate.format("YYYY-MM-DD"),
        startTime: values.startTime ? values.startTime.format("HH:mm") : "",
        endTime: values.endTime ? values.endTime.format("HH:mm") : "",
      };

      const { data } = await api.post(`/exams/${selectedExam._id}/subjects`, payload);
      if (data.success) {
        message.success("Subject paper added to exam schedule");
        setAddSubjectModalOpen(false);
        paperForm.resetFields();
        // Refresh schedule drawer
        const ref = await api.get(`/exams/${selectedExam._id}`);
        if (ref.data.success) setExamSubjects(ref.data.data.subjects || []);
      }
    } catch (err) {
      message.error(err.response?.data?.message || "Failed to schedule paper");
    } finally {
      setSubmittingPaper(false);
    }
  };

  const statusColorMap = {
    draft: "default",
    scheduled: "cyan",
    ongoing: "orange",
    completed: "blue",
    published: "green",
  };

  const columns = [
    {
      title: "Examination Title",
      dataIndex: "name",
      key: "name",
      render: (text) => <Text strong style={{ fontSize: 14 }}>{text}</Text>,
    },
    {
      title: "Exam Type",
      dataIndex: "type",
      key: "type",
      render: (t) => (
        <Tag color="geekblue" style={{ textTransform: "capitalize" }}>
          {t?.replace("_", " ") || "TERM"}
        </Tag>
      ),
    },
    {
      title: "Schedule Span",
      key: "duration",
      render: (_, r) => (
        <Space>
          <CalendarOutlined style={{ color: "#1677ff" }} />
          <span>
            {dayjs(r.startDate).format("DD MMM YYYY")} — {dayjs(r.endDate).format("DD MMM YYYY")}
          </span>
        </Space>
      ),
    },
    {
      title: "Lifecycle Status",
      dataIndex: "status",
      key: "status",
      render: (st, r) => (
        <Select
          value={st || "scheduled"}
          onChange={(val) => handleUpdateStatus(r._id, val)}
          size="small"
          style={{ width: 130 }}
        >
          <Option value="draft"><Tag color="default">DRAFT</Tag></Option>
          <Option value="scheduled"><Tag color="cyan">SCHEDULED</Tag></Option>
          <Option value="ongoing"><Tag color="orange">ONGOING</Tag></Option>
          <Option value="completed"><Tag color="blue">COMPLETED</Tag></Option>
          <Option value="published"><Tag color="green">PUBLISHED</Tag></Option>
        </Select>
      ),
    },
    {
      title: "Actions",
      key: "actions",
      render: (_, r) => (
        <Space wrap>
          <Button
            size="small"
            type="primary"
            ghost
            icon={<BookOutlined />}
            onClick={() => handleOpenScheduleDrawer(r)}
          >
            Subject Papers
          </Button>

          <Link href={`/dashboard/results?examId=${r._id}`}>
            <Button size="small" icon={<FileDoneOutlined />}>
              Marks & Results
            </Button>
          </Link>

          <Popconfirm
            title="Delete this examination cycle?"
            description="All scheduled papers and results will be removed."
            onConfirm={() => handleDeleteExam(r._id)}
            okText="Yes, Delete"
            cancelText="Cancel"
            okButtonProps={{ danger: true }}
          >
            <Button size="small" type="text" danger icon={<DeleteOutlined />} />
          </Popconfirm>
        </Space>
      ),
    },
  ];

  const paperColumns = [
    {
      title: "Class / Grade",
      key: "class",
      render: (_, r) => r.class?.name || "N/A",
    },
    {
      title: "Subject",
      key: "subject",
      render: (_, r) => (
        <Space>
          <Text strong>{r.subject?.name}</Text>
          <Tag>{r.subject?.code}</Tag>
        </Space>
      ),
    },
    {
      title: "Exam Date",
      dataIndex: "examDate",
      key: "examDate",
      render: (d) => dayjs(d).format("DD MMM YYYY"),
    },
    {
      title: "Timing",
      key: "timing",
      render: (_, r) =>
        r.startTime && r.endTime ? `${r.startTime} - ${r.endTime}` : "N/A",
    },
    {
      title: "Marks Breakdown",
      key: "marks",
      render: (_, r) => (
        <div>
          <Text strong>Max: {r.maxMarks}</Text> | <Text type="secondary">Pass: {r.passingMarks}</Text>
          <br />
          <Text type="secondary" style={{ fontSize: 11 }}>
            (Theory: {r.theoryMaxMarks} + Practical: {r.practicalMaxMarks})
          </Text>
        </div>
      ),
    },
  ];

  return (
    <div>
      <Card style={{ borderRadius: 12 }}>
        <Row justify="space-between" align="middle" style={{ marginBottom: 20 }} gutter={[16, 16]}>
          <Col>
            <Title level={4} style={{ margin: 0 }}>
              Examinations & Assessments
            </Title>
            <Text type="secondary">
              Plan examination cycles, schedule subject papers, and publish institutional report cards
            </Text>
          </Col>

          <Col>
            <Space wrap>
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

              <Button icon={<ReloadOutlined />} onClick={() => fetchExams(selectedYear)}>
                Refresh
              </Button>

              <Button
                type="primary"
                icon={<PlusOutlined />}
                onClick={() => {
                  examForm.resetFields();
                  setExamModalOpen(true);
                }}
                disabled={!selectedYear}
              >
                Create Exam Cycle
              </Button>
            </Space>
          </Col>
        </Row>

        <Table
          columns={columns}
          dataSource={exams}
          rowKey="_id"
          loading={loading}
          pagination={{ pageSize: 8 }}
        />
      </Card>

      {/* Create Exam Modal */}
      <Modal
        title="Create Examination Cycle"
        open={examModalOpen}
        onCancel={() => setExamModalOpen(false)}
        footer={null}
        destroyOnClose
      >
        <Form
          form={examForm}
          layout="vertical"
          onFinish={handleCreateExam}
          initialValues={{ type: "term" }}
          style={{ marginTop: 16 }}
        >
          <Form.Item
            name="name"
            label="Exam Title"
            rules={[{ required: true, message: "Enter exam title (e.g. Midterm Exams 2026)" }]}
          >
            <Input placeholder="e.g. Midterm Examination 2026" />
          </Form.Item>

          <Row gutter={16}>
            <Col xs={24} sm={12}>
              <Form.Item
                name="type"
                label="Examination Category"
                rules={[{ required: true, message: "Select exam type" }]}
              >
                <Select>
                  <Option value="term">Term Exam</Option>
                  <Option value="mid_term">Mid-Term Exam</Option>
                  <Option value="final">Final Exam</Option>
                  <Option value="unit_test">Unit Test</Option>
                  <Option value="other">Other Assessment</Option>
                </Select>
              </Form.Item>
            </Col>

            <Col xs={24} sm={12}>
              <Form.Item
                name="dates"
                label="Date Duration"
                rules={[{ required: true, message: "Select duration" }]}
              >
                <DatePicker.RangePicker style={{ width: "100%" }} format="YYYY-MM-DD" />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item name="description" label="Description / Guidelines">
            <TextArea rows={3} placeholder="Optional instructions or guidelines..." />
          </Form.Item>

          <div style={{ textAlign: "right", marginTop: 24 }}>
            <Space>
              <Button onClick={() => setExamModalOpen(false)}>Cancel</Button>
              <Button type="primary" htmlType="submit" loading={submittingExam}>
                Create Exam Cycle
              </Button>
            </Space>
          </div>
        </Form>
      </Modal>

      {/* Exam Subjects & Schedule Drawer */}
      <Drawer
        title={
          <Space>
            <BookOutlined style={{ color: "#1677ff" }} />
            <span>Scheduled Papers: {selectedExam?.name}</span>
          </Space>
        }
        width={760}
        open={scheduleDrawerOpen}
        onClose={() => setScheduleDrawerOpen(false)}
        extra={
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={() => {
              paperForm.resetFields();
              paperForm.setFieldsValue({
                maxMarks: 100,
                passingMarks: 40,
                theoryMaxMarks: 70,
                practicalMaxMarks: 30,
              });
              setAddSubjectModalOpen(true);
            }}
          >
            Add Subject Paper
          </Button>
        }
      >
        <Table
          columns={paperColumns}
          dataSource={examSubjects}
          rowKey="_id"
          loading={drawerLoading}
          pagination={false}
          locale={{ emptyText: "No subject papers scheduled yet. Click 'Add Subject Paper'." }}
        />
      </Drawer>

      {/* Add Subject Paper Modal */}
      <Modal
        title={`Add Subject Paper to ${selectedExam?.name}`}
        open={addSubjectModalOpen}
        onCancel={() => setAddSubjectModalOpen(false)}
        footer={null}
        width={600}
        destroyOnClose
      >
        <Form
          form={paperForm}
          layout="vertical"
          onFinish={handleAddPaper}
          style={{ marginTop: 16 }}
        >
          <Row gutter={16}>
            <Col xs={24} sm={12}>
              <Form.Item
                name="classId"
                label="Target Class"
                rules={[{ required: true, message: "Select class" }]}
              >
                <Select placeholder="Select Class">
                  {classes.map((c) => (
                    <Option key={c._id} value={c._id}>{c.name} ({c.code})</Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>

            <Col xs={24} sm={12}>
              <Form.Item
                name="subjectId"
                label="Subject"
                rules={[{ required: true, message: "Select subject" }]}
              >
                <Select placeholder="Select Subject">
                  {subjects.map((s) => (
                    <Option key={s._id} value={s._id}>{s.name} ({s.code})</Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col xs={24} sm={12}>
              <Form.Item
                name="examDate"
                label="Date of Examination"
                rules={[{ required: true, message: "Select exam date" }]}
              >
                <DatePicker style={{ width: "100%" }} format="YYYY-MM-DD" />
              </Form.Item>
            </Col>

            <Col xs={24} sm={6}>
              <Form.Item name="startTime" label="Start Time">
                <DatePicker picker="time" format="HH:mm" style={{ width: "100%" }} />
              </Form.Item>
            </Col>
            <Col xs={24} sm={6}>
              <Form.Item name="endTime" label="End Time">
                <DatePicker picker="time" format="HH:mm" style={{ width: "100%" }} />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col xs={24} sm={6}>
              <Form.Item
                name="maxMarks"
                label="Max Marks"
                rules={[{ required: true, message: "Enter max marks" }]}
              >
                <InputNumber min={1} style={{ width: "100%" }} />
              </Form.Item>
            </Col>
            <Col xs={24} sm={6}>
              <Form.Item
                name="passingMarks"
                label="Passing Marks"
                rules={[{ required: true, message: "Enter passing marks" }]}
              >
                <InputNumber min={0} style={{ width: "100%" }} />
              </Form.Item>
            </Col>
            <Col xs={24} sm={6}>
              <Form.Item name="theoryMaxMarks" label="Theory Max">
                <InputNumber min={0} style={{ width: "100%" }} />
              </Form.Item>
            </Col>
            <Col xs={24} sm={6}>
              <Form.Item name="practicalMaxMarks" label="Practical Max">
                <InputNumber min={0} style={{ width: "100%" }} />
              </Form.Item>
            </Col>
          </Row>

          <div style={{ textAlign: "right", marginTop: 24 }}>
            <Space>
              <Button onClick={() => setAddSubjectModalOpen(false)}>Cancel</Button>
              <Button type="primary" htmlType="submit" loading={submittingPaper}>
                Add Paper Schedule
              </Button>
            </Space>
          </div>
        </Form>
      </Modal>
    </div>
  );
}
