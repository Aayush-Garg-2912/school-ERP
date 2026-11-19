"use client";

import React, { useState, useEffect } from "react";
import {
  Row,
  Col,
  Card,
  Statistic,
  Typography,
  Space,
  Button,
  Tag,
  List,
  Avatar,
  Skeleton,
  Progress,
} from "antd";
import {
  UserOutlined,
  TeamOutlined,
  DollarOutlined,
  CheckCircleOutlined,
  CalendarOutlined,
  NotificationOutlined,
  ArrowRightOutlined,
  PlusOutlined,
  TrophyOutlined,
  BookOutlined,
  ScheduleOutlined,
} from "@ant-design/icons";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import api from "@/lib/api";

const { Title, Text, Paragraph } = Typography;

export default function DashboardPage() {
  const { user } = useAuth();
  const [summary, setSummary] = useState(null);
  const [notices, setNotices] = useState([]);
  const [studentStats, setStudentStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        setLoading(true);

        // Fetch reports summary for management & staff roles
        if (["chairman", "principal", "admin", "accountant", "teacher"].includes(user?.role)) {
          const { data: reportData } = await api.get("/reports/summary");
          if (reportData.success) {
            setSummary(reportData.data);
          }
        }

        // Fetch student data if student
        if (user?.role === "student") {
          const [attRes, stuRes] = await Promise.all([
            api.get("/attendance").catch(() => ({ data: { success: false } })),
            user?.student
              ? api.get(`/students/${typeof user.student === "object" ? user.student._id : user.student}`).catch(() => ({ data: { success: false } }))
              : Promise.resolve({ data: { success: false } }),
          ]);

          const records = attRes.data?.data?.attendance || [];
          const profile = stuRes.data?.data?.student || null;

          const total = records.length;
          const present = records.filter((r) => r.status === "present").length;
          const late = records.filter((r) => r.status === "late").length;
          const rate = total > 0 ? Math.round(((present + late * 0.5) / total) * 100) : 0;

          setStudentStats({
            records,
            profile,
            totalDays: total,
            presentDays: present,
            attendanceRate: rate,
          });
        }

        // Fetch notices
        const { data: noticeData } = await api.get("/notices");
        if (noticeData.success) {
          setNotices(noticeData.data?.notices?.slice(0, 5) || []);
        }
      } catch (err) {
        console.error("Dashboard data fetch error:", err);
      } finally {
        setLoading(false);
      }
    };

    if (user) {
      fetchDashboardData();
    }
  }, [user]);

  const role = user?.role;

  return (
    <div>
      {/* Institutional Banner */}
      <Card
        style={{
          marginBottom: 24,
          borderRadius: 12,
          background: "linear-gradient(135deg, #1677ff 0%, #003eb3 100%)",
          color: "#fff",
        }}
        styles={{ body: { padding: "28px 32px" } }}
      >
        <Row justify="space-between" align="middle" gutter={[16, 16]}>
          <Col xs={24} md={16}>
            <Tag
              color="gold"
              style={{
                textTransform: "uppercase",
                fontWeight: 600,
                fontSize: 11,
                padding: "2px 8px",
                marginBottom: 8,
              }}
            >
              {role} portal
            </Tag>
            <Title level={2} style={{ color: "#fff", margin: 0, fontWeight: 700 }}>
              Welcome back, {user?.name}!
            </Title>
            <Paragraph style={{ color: "rgba(255,255,255,0.85)", margin: "8px 0 0", fontSize: 14 }}>
              {user?.school?.name ? `${user.school.name} (Code: ${user.school.code})` : "Institutional Dashboard"}
              {" — Here is your current academic overview and daily activities."}
            </Paragraph>
          </Col>

          <Col xs={24} md={8} style={{ textAlign: "right" }}>
            <Space wrap>
              {["chairman", "principal", "admin"].includes(role) && (
                <>
                  <Link href="/dashboard/students">
                    <Button type="primary" ghost icon={<PlusOutlined />}>
                      Admissions
                    </Button>
                  </Link>
                  <Link href="/dashboard/attendance">
                    <Button style={{ background: "#fff", color: "#1677ff" }}>
                      Attendance
                    </Button>
                  </Link>
                </>
              )}
              {role === "student" && (
                <>
                  <Link href="/dashboard/attendance">
                    <Button style={{ background: "#fff", color: "#1677ff" }}>
                      My Attendance
                    </Button>
                  </Link>
                  <Link href="/dashboard/results">
                    <Button type="primary" ghost>
                      Report Card
                    </Button>
                  </Link>
                </>
              )}
            </Space>
          </Col>
        </Row>
      </Card>

      {/* KPI Cards for Student Role */}
      {role === "student" && (
        <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
          <Col xs={24} sm={12} lg={6}>
            <Card hoverable style={{ borderRadius: 12, height: "100%" }}>
              {loading ? (
                <Skeleton active paragraph={{ rows: 1 }} />
              ) : (
                <Statistic
                  title="My Attendance Rate"
                  value={studentStats?.attendanceRate ?? 0}
                  suffix="%"
                  prefix={<CheckCircleOutlined style={{ color: "#52c41a" }} />}
                  valueStyle={{ fontWeight: 700, color: (studentStats?.attendanceRate ?? 0) >= 75 ? "#52c41a" : "#faad14" }}
                />
              )}
              <Text type="secondary" style={{ fontSize: 12, display: "block", marginTop: 8 }}>
                {studentStats?.presentDays ?? 0} days present out of {studentStats?.totalDays ?? 0}
              </Text>
            </Card>
          </Col>

          <Col xs={24} sm={12} lg={6}>
            <Card hoverable style={{ borderRadius: 12, height: "100%" }}>
              {loading ? (
                <Skeleton active paragraph={{ rows: 1 }} />
              ) : (
                <Statistic
                  title="Class & Section"
                  value={studentStats?.profile?.class?.name || "Grade 10"}
                  suffix={studentStats?.profile?.section?.name ? `- ${studentStats.profile.section.name}` : "- Section A"}
                  prefix={<BookOutlined style={{ color: "#1677ff" }} />}
                  valueStyle={{ fontWeight: 700, fontSize: 20 }}
                />
              )}
              <Text type="secondary" style={{ fontSize: 12, display: "block", marginTop: 8 }}>
                Enrolled Academic Session
              </Text>
            </Card>
          </Col>

          <Col xs={24} sm={12} lg={6}>
            <Card hoverable style={{ borderRadius: 12, height: "100%" }}>
              {loading ? (
                <Skeleton active paragraph={{ rows: 1 }} />
              ) : (
                <Statistic
                  title="Roll & Admission No"
                  value={`Roll No: ${studentStats?.profile?.rollNumber ?? 1}`}
                  prefix={<UserOutlined style={{ color: "#722ed1" }} />}
                  valueStyle={{ fontWeight: 700, fontSize: 18 }}
                />
              )}
              <Text type="secondary" style={{ fontSize: 12, display: "block", marginTop: 8 }}>
                Adm: {studentStats?.profile?.admissionNumber ?? "GIS-2026-0001"}
              </Text>
            </Card>
          </Col>

          <Col xs={24} sm={12} lg={6}>
            <Card hoverable style={{ borderRadius: 12, height: "100%" }}>
              {loading ? (
                <Skeleton active paragraph={{ rows: 1 }} />
              ) : (
                <Statistic
                  title="Examination Status"
                  value="Results Published"
                  prefix={<TrophyOutlined style={{ color: "#faad14" }} />}
                  valueStyle={{ fontWeight: 700, fontSize: 18, color: "#52c41a" }}
                />
              )}
              <Text type="secondary" style={{ fontSize: 12, display: "block", marginTop: 8 }}>
                Term 1 Report Card Ready
              </Text>
            </Card>
          </Col>
        </Row>
      )}

      {/* KPI Cards for Administrative, Accountant & Teacher roles */}
      {["chairman", "principal", "admin", "accountant", "teacher"].includes(role) && (
        <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
          <Col xs={24} sm={12} lg={role === "teacher" ? 12 : 6}>
            <Card hoverable style={{ borderRadius: 12 }}>
              {loading ? (
                <Skeleton active paragraph={{ rows: 1 }} />
              ) : (
                <Statistic
                  title="Enrolled Students"
                  value={summary?.counts?.students ?? 0}
                  prefix={<UserOutlined style={{ color: "#1677ff" }} />}
                  valueStyle={{ fontWeight: 700 }}
                />
              )}
            </Card>
          </Col>

          <Col xs={24} sm={12} lg={role === "teacher" ? 12 : 6}>
            <Card hoverable style={{ borderRadius: 12 }}>
              {loading ? (
                <Skeleton active paragraph={{ rows: 1 }} />
              ) : (
                <Statistic
                  title="Teachers & Faculty"
                  value={summary?.counts?.teachers ?? 0}
                  prefix={<TeamOutlined style={{ color: "#52c41a" }} />}
                  valueStyle={{ fontWeight: 700 }}
                />
              )}
            </Card>
          </Col>

          {["chairman", "principal", "admin", "accountant"].includes(role) && (
            <>
              <Col xs={24} sm={12} lg={6}>
                <Card hoverable style={{ borderRadius: 12 }}>
                  {loading ? (
                    <Skeleton active paragraph={{ rows: 1 }} />
                  ) : (
                    <Statistic
                      title="Total Fee Collections"
                      value={summary?.fees?.payments?.total ?? 0}
                      prefix="₹"
                      valueStyle={{ fontWeight: 700, color: "#1677ff" }}
                    />
                  )}
                </Card>
              </Col>

              <Col xs={24} sm={12} lg={6}>
                <Card hoverable style={{ borderRadius: 12 }}>
                  {loading ? (
                    <Skeleton active paragraph={{ rows: 1 }} />
                  ) : (
                    <Statistic
                      title="Pending Dues"
                      value={summary?.fees?.studentFees?.due ?? 0}
                      prefix="₹"
                      valueStyle={{
                        fontWeight: 700,
                        color: (summary?.fees?.studentFees?.due ?? 0) > 0 ? "#ff4d4f" : "#52c41a",
                      }}
                    />
                  )}
                </Card>
              </Col>
            </>
          )}
        </Row>
      )}

      {/* Main Sections: Quick Actions & Notice Board */}
      <Row gutter={[24, 24]}>
        <Col xs={24} lg={16}>
          <Card
            title={
              <Space>
                <CheckCircleOutlined style={{ color: "#1677ff" }} />
                <span>Quick Modules & Shortcuts</span>
              </Space>
            }
            style={{ borderRadius: 12 }}
          >
            <Row gutter={[16, 16]}>
              {role === "student" ? (
                <>
                  <Col xs={24} sm={12}>
                    <Card size="small" hoverable style={{ background: "#f8fafc", borderRadius: 8 }}>
                      <Link href="/dashboard/attendance">
                        <Space style={{ display: "flex", justifyContent: "space-between" }}>
                          <div>
                            <Text strong>My Attendance Log</Text>
                            <br />
                            <Text type="secondary" style={{ fontSize: 12 }}>
                              Check previous and present attendance
                            </Text>
                          </div>
                          <ArrowRightOutlined style={{ color: "#1677ff" }} />
                        </Space>
                      </Link>
                    </Card>
                  </Col>

                  <Col xs={24} sm={12}>
                    <Card size="small" hoverable style={{ background: "#f8fafc", borderRadius: 8 }}>
                      <Link href="/dashboard/results">
                        <Space style={{ display: "flex", justifyContent: "space-between" }}>
                          <div>
                            <Text strong>Exam Report Cards</Text>
                            <br />
                            <Text type="secondary" style={{ fontSize: 12 }}>
                              View subject marks, GPA, and transcripts
                            </Text>
                          </div>
                          <ArrowRightOutlined style={{ color: "#1677ff" }} />
                        </Space>
                      </Link>
                    </Card>
                  </Col>

                  <Col xs={24} sm={12}>
                    <Card size="small" hoverable style={{ background: "#f8fafc", borderRadius: 8 }}>
                      <Link href="/dashboard/timetable">
                        <Space style={{ display: "flex", justifyContent: "space-between" }}>
                          <div>
                            <Text strong>Class Timetable</Text>
                            <br />
                            <Text type="secondary" style={{ fontSize: 12 }}>
                              View daily periods and subject schedule
                            </Text>
                          </div>
                          <ArrowRightOutlined style={{ color: "#1677ff" }} />
                        </Space>
                      </Link>
                    </Card>
                  </Col>

                  <Col xs={24} sm={12}>
                    <Card size="small" hoverable style={{ background: "#f8fafc", borderRadius: 8 }}>
                      <Link href="/dashboard/notices">
                        <Space style={{ display: "flex", justifyContent: "space-between" }}>
                          <div>
                            <Text strong>School Notice Board</Text>
                            <br />
                            <Text type="secondary" style={{ fontSize: 12 }}>
                              View all circulars from faculty & staff ({notices.length})
                            </Text>
                          </div>
                          <ArrowRightOutlined style={{ color: "#1677ff" }} />
                        </Space>
                      </Link>
                    </Card>
                  </Col>
                </>
              ) : (
                <>
                  {["chairman", "principal", "admin"].includes(role) && (
                    <>
                      <Col xs={24} sm={12}>
                        <Card size="small" hoverable style={{ background: "#f8fafc", borderRadius: 8 }}>
                          <Link href="/dashboard/students">
                            <Space style={{ display: "flex", justifyContent: "space-between" }}>
                              <div>
                                <Text strong>Student Admissions</Text>
                                <br />
                                <Text type="secondary" style={{ fontSize: 12 }}>
                                  Register, enroll, and manage students
                                </Text>
                              </div>
                              <ArrowRightOutlined style={{ color: "#1677ff" }} />
                            </Space>
                          </Link>
                        </Card>
                      </Col>

                      <Col xs={24} sm={12}>
                        <Card size="small" hoverable style={{ background: "#f8fafc", borderRadius: 8 }}>
                          <Link href="/dashboard/teachers">
                            <Space style={{ display: "flex", justifyContent: "space-between" }}>
                              <div>
                                <Text strong>Faculty & Allocations</Text>
                                <br />
                                <Text type="secondary" style={{ fontSize: 12 }}>
                                  Assign subjects and class teachers
                                </Text>
                              </div>
                              <ArrowRightOutlined style={{ color: "#1677ff" }} />
                            </Space>
                          </Link>
                        </Card>
                      </Col>
                    </>
                  )}

                  {["teacher", "accountant"].includes(role) && (
                    <Col xs={24} sm={12}>
                      <Card size="small" hoverable style={{ background: "#f8fafc", borderRadius: 8 }}>
                        <Link href="/dashboard/students">
                          <Space style={{ display: "flex", justifyContent: "space-between" }}>
                            <div>
                              <Text strong>Student Directory</Text>
                              <br />
                              <Text type="secondary" style={{ fontSize: 12 }}>
                                View class roll, student details & guardians
                              </Text>
                            </div>
                            <ArrowRightOutlined style={{ color: "#1677ff" }} />
                          </Space>
                        </Link>
                      </Card>
                    </Col>
                  )}

                  <Col xs={24} sm={12}>
                    <Card size="small" hoverable style={{ background: "#f8fafc", borderRadius: 8 }}>
                      <Link href="/dashboard/attendance">
                        <Space style={{ display: "flex", justifyContent: "space-between" }}>
                          <div>
                            <Text strong>Daily Attendance</Text>
                            <br />
                            <Text type="secondary" style={{ fontSize: 12 }}>
                              Track class attendance and percentages
                            </Text>
                          </div>
                          <ArrowRightOutlined style={{ color: "#1677ff" }} />
                        </Space>
                      </Link>
                    </Card>
                  </Col>

                  <Col xs={24} sm={12}>
                    <Card size="small" hoverable style={{ background: "#f8fafc", borderRadius: 8 }}>
                      <Link href="/dashboard/results">
                        <Space style={{ display: "flex", justifyContent: "space-between" }}>
                          <div>
                            <Text strong>Examinations & Results</Text>
                            <br />
                            <Text type="secondary" style={{ fontSize: 12 }}>
                              Schedules, marks entry, and report cards
                            </Text>
                          </div>
                          <ArrowRightOutlined style={{ color: "#1677ff" }} />
                        </Space>
                      </Link>
                    </Card>
                  </Col>

                  {["chairman", "principal", "admin", "accountant"].includes(role) && (
                    <Col xs={24} sm={12}>
                      <Card size="small" hoverable style={{ background: "#f8fafc", borderRadius: 8 }}>
                        <Link href="/dashboard/fees">
                          <Space style={{ display: "flex", justifyContent: "space-between" }}>
                            <div>
                              <Text strong>Fee Management</Text>
                              <br />
                              <Text type="secondary" style={{ fontSize: 12 }}>
                                Structure setup, receipts, and refunds
                              </Text>
                            </div>
                            <ArrowRightOutlined style={{ color: "#1677ff" }} />
                          </Space>
                        </Link>
                      </Card>
                    </Col>
                  )}

                  <Col xs={24} sm={12}>
                    <Card size="small" hoverable style={{ background: "#f8fafc", borderRadius: 8 }}>
                      <Link href="/dashboard/timetable">
                        <Space style={{ display: "flex", justifyContent: "space-between" }}>
                          <div>
                            <Text strong>Timetable Schedule</Text>
                            <br />
                            <Text type="secondary" style={{ fontSize: 12 }}>
                              Period slots and clash-proof schedules
                            </Text>
                          </div>
                          <ArrowRightOutlined style={{ color: "#1677ff" }} />
                        </Space>
                      </Link>
                    </Card>
                  </Col>

                  {["chairman", "principal", "admin", "teacher", "accountant"].includes(role) && (
                    <Col xs={24} sm={12}>
                      <Card size="small" hoverable style={{ background: "#f8fafc", borderRadius: 8 }}>
                        <Link href="/dashboard/whatsapp">
                          <Space style={{ display: "flex", justifyContent: "space-between" }}>
                            <div>
                              <Text strong>WhatsApp Broadcasts</Text>
                              <br />
                              <Text type="secondary" style={{ fontSize: 12 }}>
                                Birthday wishes, fee slips & festival alerts
                              </Text>
                            </div>
                            <ArrowRightOutlined style={{ color: "#25D366" }} />
                          </Space>
                        </Link>
                      </Card>
                    </Col>
                  )}
                </>
              )}
            </Row>
          </Card>
        </Col>

        {/* Notices Feed */}
        <Col xs={24} lg={8}>
          <Card
            title={
              <Space>
                <NotificationOutlined style={{ color: "#1677ff" }} />
                <span>Notice Board</span>
              </Space>
            }
            extra={<Link href="/dashboard/notices">View All</Link>}
            style={{ borderRadius: 12 }}
          >
            {loading ? (
              <Skeleton active paragraph={{ rows: 4 }} />
            ) : notices.length === 0 ? (
              <Text type="secondary">No active notices at this time.</Text>
            ) : (
              <List
                itemLayout="horizontal"
                dataSource={notices}
                renderItem={(item) => (
                  <List.Item style={{ padding: "12px 0" }}>
                    <List.Item.Meta
                      avatar={
                        <Avatar
                          style={{
                            backgroundColor: item.pinned ? "#faad14" : "#e6f4ff",
                            color: item.pinned ? "#fff" : "#1677ff",
                          }}
                        >
                          {item.title?.[0]?.toUpperCase() || "N"}
                        </Avatar>
                      }
                      title={
                        <Space wrap>
                          <Text strong style={{ fontSize: 14 }}>
                            {item.title}
                          </Text>
                          {item.pinned && <Tag color="gold">Pinned</Tag>}
                          <Tag color="blue">{item.category}</Tag>
                        </Space>
                      }
                      description={
                        <Paragraph
                          ellipsis={{ rows: 2 }}
                          type="secondary"
                          style={{ margin: "4px 0 0", fontSize: 12 }}
                        >
                          {item.content}
                        </Paragraph>
                      }
                    />
                  </List.Item>
                )}
              />
            )}
          </Card>
        </Col>
      </Row>
    </div>
  );
}
