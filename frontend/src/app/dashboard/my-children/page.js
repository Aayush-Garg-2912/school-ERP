"use client";

import React, { useEffect, useState } from "react";
import {
  Card,
  Row,
  Col,
  Typography,
  Tag,
  Space,
  Button,
  Spin,
  Modal,
  Table,
  Statistic,
  Empty,
  Avatar,
  Divider,
  Progress,
  Descriptions,
} from "antd";
import {
  UserOutlined,
  CalendarOutlined,
  DollarOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  CloseCircleOutlined,
  BookOutlined,
  InfoCircleOutlined,
  FileDoneOutlined,
  ReloadOutlined,
  ArrowRightOutlined,
  CarOutlined,
  PhoneOutlined,
  EnvironmentOutlined,
} from "@ant-design/icons";
import Link from "next/link";
import api from "@/lib/api";
import { useAuth } from "@/context/AuthContext";

const { Title, Text, Paragraph } = Typography;

export default function MyChildrenPage() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [parentData, setParentData] = useState(null);
  const [childrenList, setChildrenList] = useState([]);

  // Child modal state
  const [selectedChild, setSelectedChild] = useState(null);
  const [activeModal, setActiveModal] = useState(null); // 'fees' | 'attendance' | 'profile' | null
  const [modalLoading, setModalLoading] = useState(false);
  const [childFees, setChildFees] = useState([]);
  const [childAttendance, setChildAttendance] = useState(null);

  const fetchMyChildren = async () => {
    setLoading(true);
    try {
      const res = await api.get("/parents/me/children");
      if (res.data.success) {
        setParentData(res.data.data.parent);
        setChildrenList(res.data.data.students || []);
      }
    } catch (err) {
      console.error("Failed to load children", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMyChildren();
  }, []);

  const openFeesModal = async (child) => {
    setSelectedChild(child);
    setActiveModal("fees");
    setModalLoading(true);
    try {
      const res = await api.get(`/parents/me/children/${child.student._id}/fees`);
      if (res.data.success) {
        setChildFees(res.data.data.studentFees || []);
      }
    } catch (err) {
      console.error("Failed to load student fees", err);
      setChildFees([]);
    } finally {
      setModalLoading(false);
    }
  };

  const openAttendanceModal = async (child) => {
    setSelectedChild(child);
    setActiveModal("attendance");
    setModalLoading(true);
    try {
      const res = await api.get(`/attendance/my-child/${child.student._id}`);
      if (res.data.success) {
        setChildAttendance(res.data.data || null);
      }
    } catch (err) {
      console.error("Failed to load attendance", err);
      setChildAttendance(null);
    } finally {
      setModalLoading(false);
    }
  };

  const openProfileModal = (child) => {
    setSelectedChild(child);
    setActiveModal("profile");
  };

  const openTransportModal = (child) => {
    setSelectedChild(child);
    setActiveModal("transport");
  };

  const closeModal = () => {
    setActiveModal(null);
    setSelectedChild(null);
    setChildFees([]);
    setChildAttendance(null);
  };

  const getAttendanceRate = (stats) => {
    if (!stats || !stats.total || stats.total === 0) return 0;
    return Math.round(((stats.present + (stats.late || 0) * 0.5) / stats.total) * 100);
  };

  return (
    <div style={{ maxWidth: 1200, margin: "0 auto" }}>
      {/* Header */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          marginBottom: 24,
          flexWrap: "wrap",
          gap: 12,
        }}
      >
        <div>
          <Title level={3} style={{ margin: 0, display: "flex", alignItems: "center", gap: 10 }}>
            <UserOutlined style={{ color: "#1677ff" }} /> My Children Portal
          </Title>
          <Text type="secondary">
            View academic records, daily attendance, fee statements, and exam report cards for your children.
          </Text>
        </div>
        <Button icon={<ReloadOutlined />} onClick={fetchMyChildren} loading={loading}>
          Refresh
        </Button>
      </div>

      {loading ? (
        <div style={{ textAlign: "center", padding: "60px 0" }}>
          <Spin size="large" />
          <div style={{ marginTop: 12 }}>
            <Text type="secondary">Loading children profiles...</Text>
          </div>
        </div>
      ) : childrenList.length === 0 ? (
        <Card bordered={false} style={{ textAlign: "center", padding: "40px 0" }}>
          <Empty
            description={
              <div>
                <Title level={4}>No Children Linked</Title>
                <Paragraph type="secondary">
                  No student records are currently mapped to your parent account. If you believe this is an error,
                  please contact the school administration office.
                </Paragraph>
              </div>
            }
          />
        </Card>
      ) : (
        <Row gutter={[20, 20]}>
          {childrenList.map((item) => {
            const stu = item.student;
            if (!stu) return null;
            const fullName = `${stu.firstName} ${stu.lastName || ""}`.trim();
            const className = stu.class?.name || (typeof stu.class === "string" ? stu.class : "Class Not Set");
            const sectionName = stu.section?.name || (typeof stu.section === "string" ? stu.section : "");

            return (
              <Col xs={24} md={12} key={stu._id}>
                <Card
                  bordered={false}
                  style={{
                    boxShadow: "0 2px 8px rgba(0,0,0,0.06)",
                    borderRadius: 10,
                    overflow: "hidden",
                    borderTop: "4px solid #1677ff",
                  }}
                  bodyStyle={{ padding: 24 }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 16 }}>
                    <Avatar
                      size={64}
                      style={{
                        backgroundColor: "#e6f4ff",
                        color: "#1677ff",
                        fontSize: 24,
                        fontWeight: "bold",
                      }}
                    >
                      {stu.firstName?.[0] || "S"}
                    </Avatar>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                        <Title level={4} style={{ margin: 0 }}>
                          {fullName}
                        </Title>
                        {item.isPrimary && <Tag color="blue">Primary Ward</Tag>}
                        <Tag color="cyan">{item.relationship || "Guardian"}</Tag>
                        {stu.transport?.opted && (
                          <Tag color="volcano" icon={<CarOutlined />} style={{ fontWeight: 700 }}>
                            {stu.transport.busNumber || "Bus Service"}
                          </Tag>
                        )}
                      </div>
                      <Text type="secondary" style={{ fontSize: 13, display: "block", marginTop: 4 }}>
                        Adm No: <strong>{stu.admissionNumber}</strong> {stu.rollNumber ? `• Roll No: ${stu.rollNumber}` : ""}
                      </Text>
                      <Text strong style={{ fontSize: 14, color: "#1677ff" }}>
                        {className} {sectionName ? `- ${sectionName}` : ""}
                      </Text>
                    </div>
                  </div>

                  <Divider style={{ margin: "14px 0" }} />

                  {/* Action Quick Links */}
                  <Row gutter={[12, 12]}>
                    <Col span={12}>
                      <Button
                        block
                        icon={<CheckCircleOutlined style={{ color: "#52c41a" }} />}
                        onClick={() => openAttendanceModal(item)}
                      >
                        Attendance
                      </Button>
                    </Col>
                    <Col span={12}>
                      <Button
                        block
                        icon={<DollarOutlined style={{ color: "#faad14" }} />}
                        onClick={() => openFeesModal(item)}
                      >
                        Fee Dues
                      </Button>
                    </Col>
                    <Col span={12}>
                      <Link href="/dashboard/results">
                        <Button block icon={<FileDoneOutlined style={{ color: "#722ed1" }} />}>
                          Report Cards
                        </Button>
                      </Link>
                    </Col>
                    <Col span={12}>
                      <Button block icon={<InfoCircleOutlined />} onClick={() => openProfileModal(item)}>
                        Full Profile
                      </Button>
                    </Col>
                    <Col span={24}>
                      <Button
                        block
                        icon={<CarOutlined style={{ color: "#fa8c16" }} />}
                        onClick={() => openTransportModal(item)}
                        style={{
                          background: stu.transport?.opted ? "#fffaf0" : "#f8fafc",
                          borderColor: stu.transport?.opted ? "#fed7aa" : "#e2e8f0",
                          fontWeight: stu.transport?.opted ? 600 : 400,
                        }}
                      >
                        {stu.transport?.opted
                          ? `Bus Pass: ${stu.transport.busNumber || "Bus"} (${stu.transport.pickupPoint || "Assigned Stop"})`
                          : "Bus & Transport Facility"}
                      </Button>
                    </Col>
                  </Row>
                </Card>
              </Col>
            );
          })}
        </Row>
      )}

      {/* Profile Details Modal */}
      <Modal
        title={
          selectedChild ? (
            <Space>
              <UserOutlined style={{ color: "#1677ff" }} />
              <span>
                {selectedChild.student.firstName} {selectedChild.student.lastName}&apos;s Profile
              </span>
            </Space>
          ) : (
            "Child Profile"
          )
        }
        open={activeModal === "profile"}
        onCancel={closeModal}
        footer={[
          <Button key="close" type="primary" onClick={closeModal}>
            Done
          </Button>,
        ]}
      >
        {selectedChild && (
          <Descriptions column={1} bordered size="small" style={{ marginTop: 12 }}>
            <Descriptions.Item label="Admission No">
              {selectedChild.student.admissionNumber}
            </Descriptions.Item>
            <Descriptions.Item label="Roll Number">
              {selectedChild.student.rollNumber || "Not Assigned"}
            </Descriptions.Item>
            <Descriptions.Item label="Grade / Class">
              {selectedChild.student.class?.name || "N/A"}
            </Descriptions.Item>
            <Descriptions.Item label="Section / Division">
              {selectedChild.student.section?.name || "N/A"}
            </Descriptions.Item>
            <Descriptions.Item label="Relationship">
              {selectedChild.relationship || "Parent/Guardian"}
            </Descriptions.Item>
            <Descriptions.Item label="Primary Contact">
              {selectedChild.isPrimary ? "Yes (Primary)" : "Secondary"}
            </Descriptions.Item>
          </Descriptions>
        )}
      </Modal>

      {/* Attendance Modal */}
      <Modal
        title={
          selectedChild ? (
            <Space>
              <CheckCircleOutlined style={{ color: "#52c41a" }} />
              <span>Attendance History — {selectedChild.student.firstName}</span>
            </Space>
          ) : (
            "Attendance"
          )
        }
        open={activeModal === "attendance"}
        onCancel={closeModal}
        width={700}
        footer={[
          <Button key="close" onClick={closeModal}>
            Close
          </Button>,
        ]}
      >
        {modalLoading ? (
          <div style={{ textAlign: "center", padding: "40px 0" }}>
            <Spin />
            <div style={{ marginTop: 8 }}>
              <Text type="secondary">Loading attendance records...</Text>
            </div>
          </div>
        ) : childAttendance ? (
          <div>
            <Row gutter={16} style={{ marginBottom: 16 }}>
              <Col span={6}>
                <Card size="small" style={{ textAlign: "center" }}>
                  <Statistic
                    title="Present"
                    value={childAttendance.summary?.present || 0}
                    valueStyle={{ color: "#52c41a" }}
                  />
                </Card>
              </Col>
              <Col span={6}>
                <Card size="small" style={{ textAlign: "center" }}>
                  <Statistic
                    title="Absent"
                    value={childAttendance.summary?.absent || 0}
                    valueStyle={{ color: "#cf1322" }}
                  />
                </Card>
              </Col>
              <Col span={6}>
                <Card size="small" style={{ textAlign: "center" }}>
                  <Statistic
                    title="Late"
                    value={childAttendance.summary?.late || 0}
                    valueStyle={{ color: "#faad14" }}
                  />
                </Card>
              </Col>
              <Col span={6}>
                <Card size="small" style={{ textAlign: "center" }}>
                  <Statistic
                    title="Rate"
                    value={`${getAttendanceRate(childAttendance.summary)}%`}
                    valueStyle={{ color: "#1677ff" }}
                  />
                </Card>
              </Col>
            </Row>

            <Table
              size="small"
              rowKey="_id"
              dataSource={childAttendance.records || []}
              columns={[
                {
                  title: "Date",
                  dataIndex: "date",
                  key: "date",
                  render: (val) => new Date(val).toLocaleDateString(),
                },
                {
                  title: "Status",
                  dataIndex: "status",
                  key: "status",
                  render: (status) => {
                    const map = {
                      present: <Tag color="green">Present</Tag>,
                      absent: <Tag color="red">Absent</Tag>,
                      late: <Tag color="orange">Late</Tag>,
                      half_day: <Tag color="blue">Half Day</Tag>,
                    };
                    return map[status] || <Tag>{status}</Tag>;
                  },
                },
                {
                  title: "Remarks",
                  dataIndex: "remarks",
                  key: "remarks",
                  render: (rem) => rem || <Text type="secondary">—</Text>,
                },
              ]}
              pagination={{ pageSize: 6 }}
            />
          </div>
        ) : (
          <Empty description="No attendance records found for this academic period." />
        )}
      </Modal>

      {/* Fees Modal */}
      <Modal
        title={
          selectedChild ? (
            <Space>
              <DollarOutlined style={{ color: "#faad14" }} />
              <span>Fee Invoices & Dues — {selectedChild.student.firstName}</span>
            </Space>
          ) : (
            "Fee Status"
          )
        }
        open={activeModal === "fees"}
        onCancel={closeModal}
        width={750}
        footer={[
          <Button key="close" onClick={closeModal}>
            Close
          </Button>,
          <Link key="pay" href="/dashboard/fees">
            <Button type="primary">Go to Payments</Button>
          </Link>,
        ]}
      >
        {modalLoading ? (
          <div style={{ textAlign: "center", padding: "40px 0" }}>
            <Spin />
            <div style={{ marginTop: 8 }}>
              <Text type="secondary">Loading fee dues...</Text>
            </div>
          </div>
        ) : childFees.length === 0 ? (
          <Empty description="No fee structures or pending invoices assigned." />
        ) : (
          <Table
            size="small"
            rowKey="_id"
            dataSource={childFees}
            columns={[
              {
                title: "Fee Head",
                dataIndex: ["feeStructure", "name"],
                key: "feeHead",
                render: (val) => <Text strong>{val || "Tuition / General Fee"}</Text>,
              },
              {
                title: "Payable",
                dataIndex: "payableAmount",
                key: "payable",
                render: (val) => `₹${val?.toLocaleString()}`,
              },
              {
                title: "Paid",
                dataIndex: "paidAmount",
                key: "paid",
                render: (val) => (
                  <Text style={{ color: "#389e0d" }}>₹{val?.toLocaleString()}</Text>
                ),
              },
              {
                title: "Due",
                dataIndex: "dueAmount",
                key: "due",
                render: (val) => (
                  <Text strong style={{ color: val > 0 ? "#cf1322" : "#52c41a" }}>
                    ₹{val?.toLocaleString()}
                  </Text>
                ),
              },
              {
                title: "Status",
                dataIndex: "status",
                key: "status",
                render: (status) => {
                  const map = {
                    paid: <Tag color="green">Paid</Tag>,
                    partial: <Tag color="orange">Partial</Tag>,
                    unpaid: <Tag color="red">Unpaid</Tag>,
                  };
                  return map[status] || <Tag>{status}</Tag>;
                },
              },
            ]}
            pagination={false}
          />
        )}
      </Modal>

      {/* Child Transport Details Modal */}
      <Modal
        title={
          selectedChild ? (
            <Space>
              <CarOutlined style={{ color: "#fa8c16" }} />
              <span>
                {selectedChild.student.firstName} {selectedChild.student.lastName}&apos;s Bus & Transit Details
              </span>
            </Space>
          ) : (
            "Transport Details"
          )
        }
        open={activeModal === "transport"}
        onCancel={closeModal}
        footer={[
          <Button key="close" type="primary" onClick={closeModal}>
            Done
          </Button>,
        ]}
        width={580}
      >
        {selectedChild && (
          <div>
            {selectedChild.student.transport?.opted ? (
              <div>
                <Card
                  size="small"
                  style={{
                    borderRadius: 10,
                    background: "#fffaf0",
                    border: "1px solid #fed7aa",
                    marginBottom: 16,
                  }}
                >
                  <Space size={8} align="center" style={{ marginBottom: 8 }}>
                    <Tag color="volcano" icon={<CarOutlined />} style={{ fontWeight: 800, fontSize: 14 }}>
                      {selectedChild.student.transport.busNumber || "School Bus"}
                    </Tag>
                    <Tag color="green">Active Transit Route</Tag>
                  </Space>
                  <Title level={5} style={{ margin: "4px 0" }}>
                    {selectedChild.student.transport.routeName || "School Commute Route"}
                  </Title>
                  {selectedChild.student.transport?.vehicle?.vehicleModel && (
                    <Text type="secondary" style={{ fontSize: 12 }}>
                      Vehicle: {selectedChild.student.transport.vehicle.vehicleModel}
                    </Text>
                  )}
                </Card>

                <Descriptions bordered size="small" column={1} style={{ marginBottom: 16 }}>
                  <Descriptions.Item label="Boarding Stop">
                    <Text strong style={{ color: "#1e3a8a" }}>
                      <EnvironmentOutlined style={{ color: "#ef4444", marginRight: 4 }} />
                      {selectedChild.student.transport.pickupPoint || "Assigned Stop"}
                    </Text>
                  </Descriptions.Item>
                  <Descriptions.Item label="Morning Pickup">
                    <Tag color="cyan" icon={<ClockCircleOutlined />}>
                      <b>{selectedChild.student.transport.pickupTime || "07:30 AM"}</b>
                    </Tag>
                  </Descriptions.Item>
                  <Descriptions.Item label="Afternoon Drop">
                    <Tag color="purple" icon={<ClockCircleOutlined />}>
                      <b>{selectedChild.student.transport.dropTime || "02:30 PM"}</b>
                    </Tag>
                  </Descriptions.Item>
                  <Descriptions.Item label="Designated Driver">
                    <div>
                      <Text strong>{selectedChild.student.transport.driverName || "Driver"}</Text>
                      {selectedChild.student.transport.driverPhone && (
                        <div style={{ marginTop: 2 }}>
                          <a href={`tel:${selectedChild.student.transport.driverPhone}`} style={{ color: "#0284c7" }}>
                            <PhoneOutlined /> {selectedChild.student.transport.driverPhone}
                          </a>
                        </div>
                      )}
                    </div>
                  </Descriptions.Item>
                  {selectedChild.student.transport?.annualFee > 0 && (
                    <Descriptions.Item label="Annual Transport Fee">
                      <span style={{ fontWeight: 700, color: "#0f766e" }}>
                        ₹{selectedChild.student.transport.annualFee.toLocaleString()}
                      </span>
                    </Descriptions.Item>
                  )}
                </Descriptions>
              </div>
            ) : (
              <Card style={{ textAlign: "center", borderRadius: 8, padding: "20px 0", background: "#f8fafc" }}>
                <Empty
                  description={
                    <div>
                      <div style={{ fontWeight: 600, color: "#475569" }}>
                        No School Bus Service Opted
                      </div>
                      <Text type="secondary" style={{ fontSize: 12 }}>
                        This ward is currently traveling via private / self commute. If you need school bus transport, please contact the school administration office.
                      </Text>
                    </div>
                  }
                />
              </Card>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
}
