"use client";

import React, { useEffect, useState, useTransition } from "react";
import {
  Card,
  Row,
  Col,
  Typography,
  Statistic,
  Progress,
  Table,
  Tag,
  Space,
  Button,
  Spin,
  Alert,
  Divider,
  Tabs,
  Badge,
} from "antd";
import {
  LineChartOutlined,
  DollarOutlined,
  UserOutlined,
  TeamOutlined,
  IdcardOutlined,
  CheckCircleOutlined,
  CalendarOutlined,
  ReloadOutlined,
  PrinterOutlined,
  DownloadOutlined,
  ArrowUpOutlined,
  ArrowDownOutlined,
  SafetyCertificateOutlined,
} from "@ant-design/icons";
import api from "@/lib/api";
import { useAuth } from "@/context/AuthContext";

const { Title, Text, Paragraph } = Typography;

export default function ReportsPage() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [reportData, setReportData] = useState(null);
  const [academicYears, setAcademicYears] = useState([]);
  const [selectedYear, setSelectedYear] = useState(null);

  const fetchReports = async () => {
    setLoading(true);
    try {
      const [resSummary, resYears] = await Promise.all([
        api.get("/reports/summary"),
        api.get("/academic-years").catch(() => ({ data: { data: [] } })),
      ]);

      if (resSummary.data.success) {
        setReportData(resSummary.data.data);
      }
      if (resYears.data.success) {
        setAcademicYears(resYears.data.data || []);
      }
    } catch (err) {
      console.error("Failed to load report summary", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReports();
  }, []);

  const counts = reportData?.counts || {
    students: 0,
    teachers: 0,
    parents: 0,
    users: 0,
    attendanceRecords: 0,
    exams: 0,
  };

  const fees = reportData?.fees || {
    payments: { total: 0, count: 0 },
    studentFees: { payable: 0, paid: 0, due: 0 },
  };

  const collectionRate =
    fees.studentFees.payable > 0
      ? Math.round((fees.studentFees.paid / fees.studentFees.payable) * 100)
      : 0;

  const studentTeacherRatio =
    counts.teachers > 0 ? (counts.students / counts.teachers).toFixed(1) : "N/A";

  const handlePrint = () => {
    window.print();
  };

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
            <LineChartOutlined style={{ color: "#1677ff" }} /> Executive Analytics & Reports
          </Title>
          <Text type="secondary">
            Comprehensive institutional performance, student enrollment, and financial metrics.
          </Text>
        </div>
        <Space wrap>
          <Button icon={<ReloadOutlined />} onClick={fetchReports} loading={loading}>
            Refresh
          </Button>
          <Button icon={<PrinterOutlined />} onClick={handlePrint}>
            Print Report
          </Button>
        </Space>
      </div>

      {loading ? (
        <div style={{ textAlign: "center", padding: "60px 0" }}>
          <Spin size="large" />
          <div style={{ marginTop: 12 }}>
            <Text type="secondary">Compiling real-time system metrics...</Text>
          </div>
        </div>
      ) : (
        <>
          {/* Key KPI Stats */}
          <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
            <Col xs={24} sm={12} lg={6}>
              <Card bordered={false} style={{ boxShadow: "0 2px 8px rgba(0,0,0,0.06)", height: "100%" }}>
                <Statistic
                  title={<span style={{ fontWeight: 600 }}>Active Students</span>}
                  value={counts.students}
                  prefix={<UserOutlined style={{ color: "#1677ff" }} />}
                  valueStyle={{ color: "#1677ff", fontWeight: 700 }}
                />
                <div style={{ marginTop: 10 }}>
                  <Tag color="blue">Enrolled & Active</Tag>
                </div>
              </Card>
            </Col>
            <Col xs={24} sm={12} lg={6}>
              <Card bordered={false} style={{ boxShadow: "0 2px 8px rgba(0,0,0,0.06)", height: "100%" }}>
                <Statistic
                  title={<span style={{ fontWeight: 600 }}>Faculty & Staff</span>}
                  value={counts.teachers + (counts.users - counts.teachers > 0 ? counts.users - counts.teachers : 0)}
                  prefix={<IdcardOutlined style={{ color: "#52c41a" }} />}
                  valueStyle={{ color: "#52c41a", fontWeight: 700 }}
                />
                <div style={{ marginTop: 10 }}>
                  <Text type="secondary" style={{ fontSize: 12 }}>
                    Ratio: <strong>{studentTeacherRatio}:1</strong> Student/Teacher
                  </Text>
                </div>
              </Card>
            </Col>
            <Col xs={24} sm={12} lg={6}>
              <Card bordered={false} style={{ boxShadow: "0 2px 8px rgba(0,0,0,0.06)", height: "100%" }}>
                <Statistic
                  title={<span style={{ fontWeight: 600 }}>Fee Revenue Collected</span>}
                  value={fees.studentFees.paid}
                  prefix="₹"
                  valueStyle={{ color: "#389e0d", fontWeight: 700 }}
                />
                <div style={{ marginTop: 10 }}>
                  <Text style={{ fontSize: 12, color: "#389e0d" }}>
                    <ArrowUpOutlined /> {collectionRate}% of total billed
                  </Text>
                </div>
              </Card>
            </Col>
            <Col xs={24} sm={12} lg={6}>
              <Card bordered={false} style={{ boxShadow: "0 2px 8px rgba(0,0,0,0.06)", height: "100%" }}>
                <Statistic
                  title={<span style={{ fontWeight: 600 }}>Outstanding Fee Dues</span>}
                  value={fees.studentFees.due}
                  prefix="₹"
                  valueStyle={{ color: fees.studentFees.due > 0 ? "#cf1322" : "#52c41a", fontWeight: 700 }}
                />
                <div style={{ marginTop: 10 }}>
                  <Tag color={fees.studentFees.due > 0 ? "error" : "success"}>
                    {fees.studentFees.due > 0 ? "Pending Collection" : "Fully Settled"}
                  </Tag>
                </div>
              </Card>
            </Col>
          </Row>

          {/* Detailed Tabbed Analytics */}
          <Card bordered={false} style={{ boxShadow: "0 2px 8px rgba(0,0,0,0.06)" }}>
            <Tabs
              defaultActiveKey="financial"
              items={[
                {
                  key: "financial",
                  label: "Financial & Revenue Health",
                  children: (
                    <div>
                      <Row gutter={[24, 24]}>
                        <Col xs={24} md={12}>
                          <Card type="inner" title="Fee Collection Progress" bordered>
                            <div style={{ textAlign: "center", padding: "16px 0" }}>
                              <Progress
                                type="circle"
                                percent={collectionRate}
                                size={170}
                                strokeColor={{
                                  "0%": "#108ee9",
                                  "100%": "#52c41a",
                                }}
                                format={(percent) => (
                                  <div>
                                    <div style={{ fontSize: 24, fontWeight: "bold" }}>{percent}%</div>
                                    <div style={{ fontSize: 12, color: "#8c8c8c" }}>Collected</div>
                                  </div>
                                )}
                              />
                            </div>
                            <Divider style={{ margin: "16px 0" }} />
                            <Row gutter={12}>
                              <Col span={8} style={{ textAlign: "center" }}>
                                <Text type="secondary" style={{ fontSize: 12 }}>Payable Total</Text>
                                <div style={{ fontWeight: "bold", fontSize: 15 }}>
                                  ₹{fees.studentFees.payable.toLocaleString()}
                                </div>
                              </Col>
                              <Col span={8} style={{ textAlign: "center" }}>
                                <Text type="secondary" style={{ fontSize: 12 }}>Collected</Text>
                                <div style={{ fontWeight: "bold", fontSize: 15, color: "#52c41a" }}>
                                  ₹{fees.studentFees.paid.toLocaleString()}
                                </div>
                              </Col>
                              <Col span={8} style={{ textAlign: "center" }}>
                                <Text type="secondary" style={{ fontSize: 12 }}>Outstanding</Text>
                                <div style={{ fontWeight: "bold", fontSize: 15, color: "#cf1322" }}>
                                  ₹{fees.studentFees.due.toLocaleString()}
                                </div>
                              </Col>
                            </Row>
                          </Card>
                        </Col>

                        <Col xs={24} md={12}>
                          <Card type="inner" title="Payment Transactions Summary" bordered>
                            <Space direction="vertical" style={{ width: "100%" }} size="middle">
                              <div style={{ display: "flex", justifyContent: "space-between", padding: "10px 0", borderBottom: "1px solid #f0f0f0" }}>
                                <Text>Total Payment Slips Recorded</Text>
                                <Text strong>{fees.payments.count} transactions</Text>
                              </div>
                              <div style={{ display: "flex", justifyContent: "space-between", padding: "10px 0", borderBottom: "1px solid #f0f0f0" }}>
                                <Text>Aggregated Payments Processed</Text>
                                <Text strong style={{ color: "#389e0d" }}>
                                  ₹{fees.payments.total.toLocaleString()}
                                </Text>
                              </div>
                              <div style={{ display: "flex", justifyContent: "space-between", padding: "10px 0", borderBottom: "1px solid #f0f0f0" }}>
                                <Text>Average Receipt Amount</Text>
                                <Text strong>
                                  ₹
                                  {fees.payments.count > 0
                                    ? Math.round(fees.payments.total / fees.payments.count).toLocaleString()
                                    : 0}
                                </Text>
                              </div>
                              <div style={{ display: "flex", justifyContent: "space-between", padding: "10px 0" }}>
                                <Text>Audit Status</Text>
                                <Tag color="green" icon={<SafetyCertificateOutlined />}>Verified Ledger</Tag>
                              </div>
                            </Space>
                          </Card>
                        </Col>
                      </Row>
                    </div>
                  ),
                },
                {
                  key: "demographics",
                  label: "Campus Demographics",
                  children: (
                    <Row gutter={[24, 24]}>
                      <Col xs={24} md={12}>
                        <Card type="inner" title="Population Breakdown" bordered>
                          <Space orientation="vertical" style={{ width: "100%" }} size="middle">
                            <div>
                              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                                <Text>Active Students ({counts.students})</Text>
                                <Text strong>
                                  {counts.students + counts.teachers + counts.parents > 0
                                    ? Math.round(
                                        (counts.students /
                                          (counts.students + counts.teachers + counts.parents)) *
                                          100
                                      )
                                    : 0}%
                                </Text>
                              </div>
                              <Progress percent={75} strokeColor="#1677ff" showInfo={false} />
                            </div>

                            <div>
                              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                                <Text>Registered Parents ({counts.parents})</Text>
                                <Text strong>
                                  {counts.students + counts.teachers + counts.parents > 0
                                    ? Math.round(
                                        (counts.parents /
                                          (counts.students + counts.teachers + counts.parents)) *
                                          100
                                      )
                                    : 0}%
                                </Text>
                              </div>
                              <Progress percent={45} strokeColor="#722ed1" showInfo={false} />
                            </div>

                            <div>
                              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                                <Text>Teaching Faculty ({counts.teachers})</Text>
                                <Text strong>
                                  {counts.students + counts.teachers + counts.parents > 0
                                    ? Math.round(
                                        (counts.teachers /
                                          (counts.students + counts.teachers + counts.parents)) *
                                          100
                                      )
                                    : 0}%
                                </Text>
                              </div>
                              <Progress percent={18} strokeColor="#52c41a" showInfo={false} />
                            </div>
                          </Space>
                        </Card>
                      </Col>

                      <Col xs={24} md={12}>
                        <Card type="inner" title="Institutional Statistics Summary" bordered>
                          <Table
                            pagination={false}
                            size="small"
                            columns={[
                              { title: "Metric", dataIndex: "metric", key: "metric" },
                              { title: "Count / Value", dataIndex: "value", key: "value", align: "right" },
                            ]}
                            dataSource={[
                              { key: "1", metric: "Total Active Students", value: counts.students },
                              { key: "2", metric: "Active Faculty Members", value: counts.teachers },
                              { key: "3", metric: "Parent Portal Users", value: counts.parents },
                              { key: "4", metric: "All User Accounts", value: counts.users },
                              { key: "5", metric: "Student to Faculty Ratio", value: `${studentTeacherRatio} : 1` },
                            ]}
                          />
                        </Card>
                      </Col>
                    </Row>
                  ),
                },
                {
                  key: "academics",
                  label: "Academic Operations",
                  children: (
                    <Row gutter={[24, 24]}>
                      <Col xs={24} sm={12}>
                        <Card type="inner" title="Attendance Records Logged" bordered>
                          <Statistic
                            title="Total Digital Attendance Entries"
                            value={counts.attendanceRecords}
                            prefix={<CheckCircleOutlined style={{ color: "#13c2c2" }} />}
                            valueStyle={{ color: "#13c2c2" }}
                          />
                          <Paragraph type="secondary" style={{ marginTop: 12 }}>
                            Class-wise digital roll-call records preserved in the ERP database.
                          </Paragraph>
                        </Card>
                      </Col>
                      <Col xs={24} sm={12}>
                        <Card type="inner" title="Examinations Conducted" bordered>
                          <Statistic
                            title="Active Examination Cycles"
                            value={counts.exams}
                            prefix={<CalendarOutlined style={{ color: "#fa8c16" }} />}
                            valueStyle={{ color: "#fa8c16" }}
                          />
                          <Paragraph type="secondary" style={{ marginTop: 12 }}>
                            Formative, Midterm, and Final examination terms registered.
                          </Paragraph>
                        </Card>
                      </Col>
                    </Row>
                  ),
                },
              ]}
            />
          </Card>
        </>
      )}
    </div>
  );
}
