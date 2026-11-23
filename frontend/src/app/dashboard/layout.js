"use client";

import React, { useState, useEffect } from "react";
import {
  Layout,
  Menu,
  Button,
  Avatar,
  Dropdown,
  Typography,
  Tag,
  Space,
  Spin,
  Modal,
  Form,
  Input,
  message,
} from "antd";
import {
  DashboardOutlined,
  UserOutlined,
  TeamOutlined,
  BookOutlined,
  CalendarOutlined,
  ScheduleOutlined,
  DollarOutlined,
  FileTextOutlined,
  NotificationOutlined,
  SettingOutlined,
  LogoutOutlined,
  MenuFoldOutlined,
  MenuUnfoldOutlined,
  BankOutlined,
  CheckSquareOutlined,
  IdcardOutlined,
  LineChartOutlined,
  SolutionOutlined,
  WhatsAppOutlined,
  MessageOutlined,
  CarOutlined,
  KeyOutlined,
  CloudUploadOutlined,
} from "@ant-design/icons";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import NotificationBell from "@/components/NotificationBell";
import api from "@/lib/api";

const { Header, Sider, Content } = Layout;
const { Text, Title } = Typography;

export default function DashboardLayout({ children }) {
  const [collapsed, setCollapsed] = useState(false);
  const [changePasswordOpen, setChangePasswordOpen] = useState(false);
  const [changePasswordLoading, setChangePasswordLoading] = useState(false);
  const [passwordForm] = Form.useForm();
  const { user, loading, logout } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  const handleChangePassword = async (values) => {
    setChangePasswordLoading(true);
    try {
      const { data } = await api.put("/auth/change-password", {
        currentPassword: values.currentPassword,
        newPassword: values.newPassword,
        confirmPassword: values.confirmPassword,
      });
      if (data.success) {
        message.success("Password changed successfully!");
        setChangePasswordOpen(false);
        passwordForm.resetFields();
      }
    } catch (err) {
      message.error(err.response?.data?.message || "Failed to change password");
    } finally {
      setChangePasswordLoading(false);
    }
  };

  useEffect(() => {
    if (!loading && !user) {
      router.push("/login");
    }
  }, [user, loading, router]);

  if (loading || !user) {
    return (
      <div
        style={{
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#f0f2f5",
        }}
      >
        <Space orientation="vertical" align="center">
          <Spin size="large" />
          <Text type="secondary">Loading ERP Workspace...</Text>
        </Space>
      </div>
    );
  }

  const role = user.role;

  // Build role-tailored navigation menu
  const getMenuItems = () => {
    const items = [
      {
        key: "/dashboard",
        icon: <DashboardOutlined />,
        label: <Link href="/dashboard">Dashboard</Link>,
      },
    ];

    if (["chairman", "principal", "admin"].includes(role)) {
      items.push(
        {
          key: "academics-sub",
          icon: <BookOutlined />,
          label: "Academics",
          children: [
            {
              key: "/dashboard/academic-years",
              label: <Link href="/dashboard/academic-years">Academic Sessions</Link>,
            },
            {
              key: "/dashboard/classes",
              label: <Link href="/dashboard/classes">Classes & Sections</Link>,
            },
            {
              key: "/dashboard/subjects",
              label: <Link href="/dashboard/subjects">Subjects Master</Link>,
            },
            {
              key: "/dashboard/timetable",
              label: <Link href="/dashboard/timetable">Timetable Schedule</Link>,
            },
          ],
        },
        {
          key: "people-sub",
          icon: <TeamOutlined />,
          label: "People Directory",
          children: [
            {
              key: "/dashboard/students",
              icon: <UserOutlined />,
              label: <Link href="/dashboard/students">Students</Link>,
            },
            {
              key: "/dashboard/teachers",
              icon: <IdcardOutlined />,
              label: <Link href="/dashboard/teachers">Teachers & Faculty</Link>,
            },
            {
              key: "/dashboard/staff",
              icon: <SolutionOutlined />,
              label: <Link href="/dashboard/staff">Staff & Accounts</Link>,
            },
            {
              key: "/dashboard/parents",
              icon: <TeamOutlined />,
              label: <Link href="/dashboard/parents">Parents</Link>,
            },
          ],
        },
        {
          key: "/dashboard/attendance",
          icon: <CheckSquareOutlined />,
          label: <Link href="/dashboard/attendance">Attendance</Link>,
        },
        {
          key: "/dashboard/exams",
          icon: <CalendarOutlined />,
          label: <Link href="/dashboard/exams">Exams & Results</Link>,
        },
        {
          key: "/dashboard/fees",
          icon: <DollarOutlined />,
          label: <Link href="/dashboard/fees">Fee Management</Link>,
        },
        {
          key: "/dashboard/transport",
          icon: <CarOutlined />,
          label: <Link href="/dashboard/transport">Transport Services</Link>,
        },
        {
          key: "/dashboard/leaves",
          icon: <ScheduleOutlined />,
          label: <Link href="/dashboard/leaves">Leave Requests</Link>,
        },
        {
          key: "/dashboard/notices",
          icon: <NotificationOutlined />,
          label: <Link href="/dashboard/notices">Notice Board</Link>,
        },
        {
          key: "/dashboard/whatsapp",
          icon: <WhatsAppOutlined style={{ color: "#25D366" }} />,
          label: <Link href="/dashboard/whatsapp">WhatsApp Broadcasts</Link>,
        },
        {
          key: "/dashboard/reports",
          icon: <LineChartOutlined />,
          label: <Link href="/dashboard/reports">Analytics & Reports</Link>,
        },
        {
          key: "/dashboard/import",
          icon: <CloudUploadOutlined />,
          label: <Link href="/dashboard/import">Data Import Center</Link>,
        }
      );
    } else if (role === "accountant") {
      items.push(
        {
          key: "/dashboard/fees",
          icon: <DollarOutlined />,
          label: <Link href="/dashboard/fees">Fee Structures & Dues</Link>,
        },
        {
          key: "/dashboard/fees/payments",
          icon: <FileTextOutlined />,
          label: <Link href="/dashboard/fees/payments">Payment Receipts</Link>,
        },
        {
          key: "/dashboard/transport",
          icon: <CarOutlined />,
          label: <Link href="/dashboard/transport">Transport Allocations</Link>,
        },
        {
          key: "/dashboard/students",
          icon: <UserOutlined />,
          label: <Link href="/dashboard/students">Student Directory</Link>,
        },
        {
          key: "/dashboard/whatsapp",
          icon: <WhatsAppOutlined style={{ color: "#25D366" }} />,
          label: <Link href="/dashboard/whatsapp">WhatsApp & Reminders</Link>,
        },
        {
          key: "/dashboard/reports",
          icon: <LineChartOutlined />,
          label: <Link href="/dashboard/reports">Financial Reports</Link>,
        },
        {
          key: "/dashboard/notices",
          icon: <NotificationOutlined />,
          label: <Link href="/dashboard/notices">Notice Board</Link>,
        }
      );
    } else if (role === "teacher") {
      items.push(
        {
          key: "/dashboard/students",
          icon: <UserOutlined />,
          label: <Link href="/dashboard/students">Student Directory</Link>,
        },
        {
          key: "/dashboard/attendance",
          icon: <CheckSquareOutlined />,
          label: <Link href="/dashboard/attendance">Mark Attendance</Link>,
        },
        {
          key: "/dashboard/results",
          icon: <CalendarOutlined />,
          label: <Link href="/dashboard/results">Enter Exam Marks</Link>,
        },
        {
          key: "/dashboard/timetable",
          icon: <ScheduleOutlined />,
          label: <Link href="/dashboard/timetable">My Timetable</Link>,
        },
        {
          key: "/dashboard/leaves",
          icon: <FileTextOutlined />,
          label: <Link href="/dashboard/leaves">Apply For Leave</Link>,
        },
        {
          key: "/dashboard/whatsapp",
          icon: <WhatsAppOutlined style={{ color: "#25D366" }} />,
          label: <Link href="/dashboard/whatsapp">WhatsApp Messages</Link>,
        },
        {
          key: "/dashboard/notices",
          icon: <NotificationOutlined />,
          label: <Link href="/dashboard/notices">School Notices</Link>,
        }
      );
    } else if (role === "parent") {
      items.push(
        {
          key: "/dashboard/my-children",
          icon: <UserOutlined />,
          label: <Link href="/dashboard/my-children">My Children</Link>,
        },
        {
          key: "/dashboard/transport",
          icon: <CarOutlined />,
          label: <Link href="/dashboard/transport">Bus & Transport</Link>,
        },
        {
          key: "/dashboard/attendance",
          icon: <CheckSquareOutlined />,
          label: <Link href="/dashboard/attendance">Attendance Monitor</Link>,
        },
        {
          key: "/dashboard/fees",
          icon: <DollarOutlined />,
          label: <Link href="/dashboard/fees">Child Fee Dues</Link>,
        },
        {
          key: "/dashboard/results",
          icon: <CalendarOutlined />,
          label: <Link href="/dashboard/results">Report Cards</Link>,
        },
        {
          key: "/dashboard/notices",
          icon: <NotificationOutlined />,
          label: <Link href="/dashboard/notices">School Notices</Link>,
        }
      );
    } else if (role === "student") {
      items.push(
        {
          key: "/dashboard/transport",
          icon: <CarOutlined />,
          label: <Link href="/dashboard/transport">My School Bus</Link>,
        },
        {
          key: "/dashboard/attendance",
          icon: <CheckSquareOutlined />,
          label: <Link href="/dashboard/attendance">My Attendance</Link>,
        },
        {
          key: "/dashboard/timetable",
          icon: <ScheduleOutlined />,
          label: <Link href="/dashboard/timetable">Class Schedule</Link>,
        },
        {
          key: "/dashboard/results",
          icon: <CalendarOutlined />,
          label: <Link href="/dashboard/results">Exam Results</Link>,
        },
        {
          key: "/dashboard/notices",
          icon: <NotificationOutlined />,
          label: <Link href="/dashboard/notices">Notice Board</Link>,
        }
      );
    }

    return items;
  };

  const userMenu = {
    items: [
      {
        key: "info",
        label: (
          <div style={{ padding: "4px 8px" }}>
            <Text strong>{user.name}</Text>
            <br />
            <Text type="secondary" style={{ fontSize: 12 }}>
              {user.username ? `@${user.username} • ` : ""}{user.email}
            </Text>
          </div>
        ),
      },
      { type: "divider" },
      {
        key: "change-password",
        icon: <KeyOutlined />,
        label: "Change Password",
        onClick: () => {
          passwordForm.resetFields();
          setChangePasswordOpen(true);
        },
      },
      { type: "divider" },
      {
        key: "logout",
        icon: <LogoutOutlined />,
        danger: true,
        label: "Sign Out",
        onClick: logout,
      },
    ],
  };

  const roleColorMap = {
    chairman: "purple",
    principal: "geekblue",
    admin: "blue",
    accountant: "green",
    teacher: "cyan",
    parent: "orange",
    student: "magenta",
  };

  return (
    <Layout style={{ minHeight: "100vh" }}>
      <Sider
        collapsible
        collapsed={collapsed}
        onCollapse={setCollapsed}
        trigger={null}
        width={240}
        style={{
          overflow: "auto",
          height: "100vh",
          position: "sticky",
          top: 0,
          left: 0,
          zIndex: 10,
        }}
      >
        <div
          style={{
            height: 64,
            display: "flex",
            alignItems: "center",
            padding: collapsed ? "0 20px" : "0 20px",
            background: "#002140",
            color: "#fff",
            gap: 12,
          }}
        >
          <BankOutlined style={{ fontSize: 24, color: "#1677ff" }} />
          {!collapsed && (
            <div style={{ overflow: "hidden" }}>
              <Title
                level={5}
                style={{
                  color: "#fff",
                  margin: 0,
                  whiteSpace: "nowrap",
                  textOverflow: "ellipsis",
                  overflow: "hidden",
                }}
              >
                {user.school?.name || "School ERP"}
              </Title>
              {user.school?.code && (
                <Text style={{ color: "#9ca3af", fontSize: 11 }}>
                  CODE: {user.school.code}
                </Text>
              )}
            </div>
          )}
        </div>

        <Menu
          theme="dark"
          mode="inline"
          selectedKeys={[pathname]}
          items={getMenuItems()}
          style={{ borderRight: 0, marginTop: 8 }}
        />
      </Sider>

      <Layout>
        <Header
          style={{
            padding: "0 24px",
            background: "#fff",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            boxShadow: "0 1px 4px rgba(0,21,41,.08)",
            position: "sticky",
            top: 0,
            zIndex: 9,
          }}
        >
          <Button
            type="text"
            icon={collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
            onClick={() => setCollapsed(!collapsed)}
            style={{ fontSize: 16, width: 44, height: 44 }}
          />

          <Space size="middle" align="center">
            {user.school?.name && (
              <Tag color="blue" style={{ fontSize: 13, padding: "2px 10px", borderRadius: 12 }}>
                {user.school.name}
              </Tag>
            )}

            <NotificationBell />

            <Dropdown menu={userMenu} placement="bottomRight">
              <Space
                style={{
                  cursor: "pointer",
                  padding: "4px 8px",
                  borderRadius: 6,
                  transition: "background 0.2s",
                }}
              >
                <Avatar
                  style={{ backgroundColor: "#1677ff" }}
                  icon={<UserOutlined />}
                >
                  {user.name?.[0]?.toUpperCase()}
                </Avatar>
                <div style={{ lineHeight: 1.2, textAlign: "left" }}>
                  <Text strong style={{ fontSize: 13 }}>
                    {user.name}
                  </Text>
                  <br />
                  <Tag
                    color={roleColorMap[user.role] || "default"}
                    style={{
                      fontSize: 10,
                      margin: 0,
                      textTransform: "uppercase",
                      padding: "0 4px",
                    }}
                  >
                    {user.role}
                  </Tag>
                </div>
              </Space>
            </Dropdown>
          </Space>
        </Header>

        <Content
          style={{
            margin: "24px",
            minHeight: 280,
          }}
        >
          {children}
        </Content>
      </Layout>

      {/* Universal Change Password Modal */}
      <Modal
        title={
          <Space>
            <KeyOutlined style={{ color: "#1677ff" }} />
            <span>Change Account Password</span>
          </Space>
        }
        open={changePasswordOpen}
        onCancel={() => {
          setChangePasswordOpen(false);
          passwordForm.resetFields();
        }}
        footer={null}
        destroyOnClose
      >
        <div style={{ marginBottom: 16 }}>
          <Text type="secondary">
            Update your login credentials. You will need your current password to set a new password.
          </Text>
        </div>
        <Form
          form={passwordForm}
          layout="vertical"
          onFinish={handleChangePassword}
          requiredMark={false}
        >
          <Form.Item
            name="currentPassword"
            label="Current Password"
            rules={[{ required: true, message: "Please enter your current password" }]}
          >
            <Input.Password placeholder="Enter current password" />
          </Form.Item>

          <Form.Item
            name="newPassword"
            label="New Password"
            rules={[
              { required: true, message: "Please enter your new password" },
              { min: 6, message: "Password must be at least 6 characters" },
            ]}
          >
            <Input.Password placeholder="At least 6 characters" />
          </Form.Item>

          <Form.Item
            name="confirmPassword"
            label="Confirm New Password"
            dependencies={["newPassword"]}
            rules={[
              { required: true, message: "Please confirm your new password" },
              ({ getFieldValue }) => ({
                validator(_, value) {
                  if (!value || getFieldValue("newPassword") === value) {
                    return Promise.resolve();
                  }
                  return Promise.reject(new Error("The two passwords do not match!"));
                },
              }),
            ]}
          >
            <Input.Password placeholder="Re-enter new password" />
          </Form.Item>

          <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 24 }}>
            <Button
              onClick={() => {
                setChangePasswordOpen(false);
                passwordForm.resetFields();
              }}
            >
              Cancel
            </Button>
            <Button type="primary" htmlType="submit" loading={changePasswordLoading}>
              Update Password
            </Button>
          </div>
        </Form>
      </Modal>
    </Layout>
  );
}
