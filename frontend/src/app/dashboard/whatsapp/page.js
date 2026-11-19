"use client";

import React, { useState, useEffect } from "react";
import {
  Card,
  Tabs,
  Row,
  Col,
  Statistic,
  Button,
  Tag,
  Space,
  Form,
  Input,
  Select,
  Radio,
  Table,
  Badge,
  Modal,
  message,
  Typography,
  Tooltip,
  Divider,
  Alert,
  Avatar,
  Empty,
  Spin,
} from "antd";
import {
  WhatsAppOutlined,
  SendOutlined,
  CalendarOutlined,
  DollarOutlined,
  HistoryOutlined,
  SmileOutlined,
  UserOutlined,
  TeamOutlined,
  CheckCircleOutlined,
  SyncOutlined,
  EyeOutlined,
  InfoCircleOutlined,
  ExclamationCircleOutlined,
  GiftOutlined,
  NotificationOutlined,
  LinkOutlined,
} from "@ant-design/icons";
import dayjs from "dayjs";
import api from "@/lib/api";
import { useAuth } from "@/context/AuthContext";

const { Title, Text, Paragraph } = Typography;
const { Option } = Select;
const { TextArea } = Input;

// Built-in Templates
const TEMPLATES = {
  festival: {
    title: "Festival Wishes",
    content:
      "🎉 *Warm Greetings on this Festive Occasion!* 🪔\n\nDear {name},\nOn behalf of everyone at *{school_name}*, we wish you and your family a joyous, healthy, and prosperous festival celebration! May this season bring abundant peace and happiness to your home.\n\nWarm regards,\n*{school_name}* 🏫",
  },
  fee_reminder: {
    title: "Fee Reminder",
    content:
      "📢 *FEE PAYMENT REMINDER* - {school_name}\n----------------------------------------\nDear {parent_name},\n\nThis is a gentle reminder regarding the pending academic fee for your ward *{name}* ({class_name}).\n\nKindly arrange to clear the outstanding dues at your earliest convenience to avoid examination hold.\n\nFor payment details or assistance, please contact the accounts department.\n----------------------------------------\n*Accounts Office, {school_name}*",
  },
  birthday: {
    title: "Birthday Wish",
    content:
      "🎂 *Happy Birthday, {name}!* 🎉\n\nWishing you a wonderful day filled with laughter, learning, and endless joy! May this coming year bring great achievements and happy memories.\n\nWarmest wishes on your special day,\n*{school_name}* 🏫",
  },
  announcement: {
    title: "General Announcement",
    content:
      "📌 *IMPORTANT ANNOUNCEMENT* - {school_name}\n----------------------------------------\nDear {name},\n\nPlease be informed about the upcoming school event / circular. All students and guardians are requested to review the schedule on the school portal.\n\nThank you for your ongoing cooperation.\n----------------------------------------\n*Administration, {school_name}*",
  },
  emergency: {
    title: "Holiday / Urgent Notice",
    content:
      "⚠️ *URGENT NOTICE* - {school_name}\n----------------------------------------\nDear Parents & Students,\n\nPlease note that school operations will remain closed tomorrow due to weather/administrative advisory. Regular classes will resume as scheduled thereafter.\n----------------------------------------\n*Principal's Office, {school_name}*",
  },
};

export default function WhatsAppPage() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState("compose");

  // Stats & Dependencies
  const [stats, setStats] = useState({
    totalSent: 0,
    sentToday: 0,
    deliveredCount: 0,
    todayBirthdays: 0,
    pendingFeesCount: 0,
  });
  const [classes, setClasses] = useState([]);
  const [sections, setSections] = useState([]);
  const [students, setStudents] = useState([]);

  // Compose State
  const [targetScope, setTargetScope] = useState("class");
  const [selectedClass, setSelectedClass] = useState(null);
  const [selectedSection, setSelectedSection] = useState(null);
  const [messageType, setMessageType] = useState("festival");
  const [recipientName, setRecipientName] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [messageContent, setMessageContent] = useState(TEMPLATES.festival.content);
  const [sending, setSending] = useState(false);

  // Birthdays State
  const [birthdays, setBirthdays] = useState({ totalBirthdays: 0, students: [], teachers: [] });
  const [bdayLoading, setBdayLoading] = useState(false);
  const [bdayDispatching, setBdayDispatching] = useState(false);

  // Fee Reminders State
  const [feeRemindersLoading, setFeeRemindersLoading] = useState(false);
  const [feeCustomNote, setFeeCustomNote] = useState("");
  const [feeFilterClass, setFeeFilterClass] = useState(null);
  const [feeDispatching, setFeeDispatching] = useState(false);

  // Delivery Logs State
  const [logs, setLogs] = useState([]);
  const [logsTotal, setLogsTotal] = useState(0);
  const [logsLoading, setLogsLoading] = useState(false);
  const [logPage, setLogPage] = useState(1);
  const [logSearch, setLogSearch] = useState("");
  const [logTypeFilter, setLogTypeFilter] = useState("all");

  // Selected Log Modal
  const [selectedLog, setSelectedLog] = useState(null);

  const canBroadcastSchool = ["chairman", "principal", "admin"].includes(user?.role);

  // 1. Fetch initial statistics and classes
  const fetchStats = async () => {
    try {
      const { data } = await api.get("/whatsapp/stats");
      if (data.success) {
        setStats(data.data);
      }
    } catch (err) {
      console.error("Failed to load WhatsApp stats:", err);
    }
  };

  const fetchClasses = async () => {
    try {
      const { data } = await api.get("/classes");
      if (data.success) {
        setClasses(data.data.classes || []);
      }
    } catch (err) {
      console.error("Failed to load classes:", err);
    }
  };

  const fetchSectionsForClass = async (classId) => {
    if (!classId) return;
    try {
      const { data } = await api.get(`/sections?classId=${classId}`);
      if (data.success) {
        setSections(data.data.sections || []);
      }
    } catch (err) {
      console.error("Failed to load sections:", err);
    }
  };

  // 2. Fetch Birthdays
  const fetchBirthdays = async () => {
    setBdayLoading(true);
    try {
      const { data } = await api.get("/whatsapp/birthdays");
      if (data.success) {
        setBirthdays(data.data);
      }
    } catch (err) {
      message.error("Failed to load today's birthdays");
    } finally {
      setBdayLoading(false);
    }
  };

  // 3. Fetch Message Logs
  const fetchLogs = async (page = 1) => {
    setLogsLoading(true);
    try {
      const params = {
        page,
        limit: 15,
        search: logSearch || undefined,
        messageType: logTypeFilter !== "all" ? logTypeFilter : undefined,
      };
      const { data } = await api.get("/whatsapp/messages", { params });
      if (data.success) {
        setLogs(data.data.messages || []);
        setLogsTotal(data.data.pagination?.total || 0);
      }
    } catch (err) {
      message.error("Failed to load WhatsApp delivery logs");
    } finally {
      setLogsLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
    fetchClasses();
  }, []);

  useEffect(() => {
    if (activeTab === "birthdays") fetchBirthdays();
    if (activeTab === "logs") fetchLogs(logPage);
  }, [activeTab]);

  // Handle template selection
  const handleApplyTemplate = (type) => {
    setMessageType(type);
    if (TEMPLATES[type]) {
      setMessageContent(TEMPLATES[type].content);
    }
  };

  // Insert Smart Tag into text
  const handleInsertTag = (tag) => {
    setMessageContent((prev) => prev + ` ${tag} `);
  };

  // Dispatch Broadcast or Direct Message
  const handleSendMessage = async () => {
    if (!messageContent.trim()) {
      message.warning("Please enter message content");
      return;
    }

    if (targetScope === "individual" && !phoneNumber.trim()) {
      message.warning("Please enter recipient phone number");
      return;
    }

    if (targetScope === "class" && !selectedClass) {
      message.warning("Please select target Class");
      return;
    }

    setSending(true);
    try {
      const payload = {
        targetScope,
        messageType,
        content: messageContent,
        classId: selectedClass || undefined,
        sectionId: selectedSection || undefined,
        recipientName: recipientName || undefined,
        phoneNumber: phoneNumber || undefined,
      };

      const { data } = await api.post("/whatsapp/send", payload);
      if (data.success) {
        message.success(data.message || "WhatsApp message dispatched successfully!");
        fetchStats();
        if (targetScope === "individual") {
          setPhoneNumber("");
          setRecipientName("");
        }
      }
    } catch (err) {
      message.error(err.response?.data?.message || "Failed to dispatch message");
    } finally {
      setSending(false);
    }
  };

  // Dispatch All Birthdays Today
  const handleDispatchBirthdays = async () => {
    setBdayDispatching(true);
    try {
      const { data } = await api.post("/whatsapp/birthdays/dispatch", {});
      if (data.success) {
        message.success(data.message);
        fetchBirthdays();
        fetchStats();
      }
    } catch (err) {
      message.error(err.response?.data?.message || "Failed to dispatch birthday wishes");
    } finally {
      setBdayDispatching(false);
    }
  };

  // Dispatch Fee Reminders
  const handleDispatchFeeReminders = async () => {
    setFeeDispatching(true);
    try {
      const payload = {
        classId: feeFilterClass || undefined,
        customNote: feeCustomNote || undefined,
      };
      const { data } = await api.post("/whatsapp/fee-reminders", payload);
      if (data.success) {
        message.success(data.message);
        fetchStats();
      }
    } catch (err) {
      message.error(err.response?.data?.message || "Failed to dispatch fee reminders");
    } finally {
      setFeeDispatching(false);
    }
  };

  // Open Direct WhatsApp Web Link
  const handleOpenDirectChat = () => {
    if (!phoneNumber) {
      message.warning("Enter a phone number to open direct WhatsApp chat");
      return;
    }
    const clean = phoneNumber.replace(/\D/g, "");
    const formatted = clean.length === 10 ? "91" + clean : clean;
    const url = `https://wa.me/${formatted}?text=${encodeURIComponent(messageContent)}`;
    window.open(url, "_blank");
  };

  // Log Columns
  const logColumns = [
    {
      title: "Date & Time",
      dataIndex: "createdAt",
      key: "createdAt",
      width: 150,
      render: (d) => dayjs(d).format("DD MMM YYYY, hh:mm A"),
    },
    {
      title: "Recipient",
      key: "recipient",
      width: 180,
      render: (_, r) => (
        <div>
          <Text strong>{r.recipientName || "General"}</Text>
          <br />
          <Text type="secondary" style={{ fontSize: 12 }}>
            <WhatsAppOutlined style={{ color: "#25D366" }} /> +{r.phoneNumber}
          </Text>
        </div>
      ),
    },
    {
      title: "Type",
      dataIndex: "messageType",
      key: "messageType",
      width: 130,
      render: (t) => {
        const map = {
          birthday: { color: "magenta", label: "🎂 Birthday" },
          fee_receipt: { color: "green", label: "🧾 Fee Slip" },
          fee_reminder: { color: "gold", label: "📢 Fee Due" },
          festival: { color: "purple", label: "🎉 Festival" },
          announcement: { color: "blue", label: "📌 Notice" },
          emergency: { color: "red", label: "⚠️ Urgent" },
        };
        const conf = map[t] || { color: "default", label: t.toUpperCase() };
        return <Tag color={conf.color}>{conf.label}</Tag>;
      },
    },
    {
      title: "Message Snippet",
      dataIndex: "content",
      key: "content",
      ellipsis: true,
      render: (c) => <span style={{ fontFamily: "monospace", fontSize: 12 }}>{c}</span>,
    },
    {
      title: "Scope",
      dataIndex: "targetScope",
      key: "targetScope",
      width: 110,
      render: (s) => <Tag>{(s || "individual").toUpperCase()}</Tag>,
    },
    {
      title: "Status",
      dataIndex: "status",
      key: "status",
      width: 110,
      render: (st) => (
        <Badge
          status={st === "delivered" || st === "sent" ? "success" : "error"}
          text={(st || "SENT").toUpperCase()}
        />
      ),
    },
    {
      title: "Actions",
      key: "actions",
      width: 120,
      align: "center",
      render: (_, r) => (
        <Space size="small">
          <Tooltip title="View Full Message">
            <Button
              type="text"
              icon={<EyeOutlined style={{ color: "#1677ff" }} />}
              size="small"
              onClick={() => setSelectedLog(r)}
            />
          </Tooltip>
          {r.directUrl && (
            <Tooltip title="Open Chat in WhatsApp">
              <Button
                type="text"
                icon={<WhatsAppOutlined style={{ color: "#25D366" }} />}
                size="small"
                onClick={() => window.open(r.directUrl, "_blank")}
              />
            </Tooltip>
          )}
        </Space>
      ),
    },
  ];

  return (
    <div style={{ paddingBottom: 30 }}>
      {/* 1. Header Bar */}
      <div style={{ marginBottom: 20 }}>
        <Row justify="space-between" align="middle" gutter={[16, 16]}>
          <Col>
            <Title level={3} style={{ margin: 0, fontWeight: 700 }}>
              <WhatsAppOutlined style={{ color: "#25D366", marginRight: 8 }} />
              WhatsApp Communications & Broadcast Hub
            </Title>
            <Text type="secondary" style={{ fontSize: 14 }}>
              Automated birthday greetings, instant fee receipts, pending fee reminders, and festival broadcasts.
            </Text>
          </Col>
          <Col>
            <Space wrap>
              <Button icon={<SyncOutlined />} onClick={fetchStats}>
                Refresh Stats
              </Button>
            </Space>
          </Col>
        </Row>
      </div>

      {/* 2. Top Metric Cards */}
      <Row gutter={[16, 16]} style={{ marginBottom: 20 }}>
        <Col xs={24} sm={12} lg={6}>
          <Card hoverable style={{ borderRadius: 12, borderLeft: "4px solid #25D366" }}>
            <Statistic
              title="WhatsApp Dispatched Today"
              value={stats.sentToday}
              prefix={<WhatsAppOutlined style={{ color: "#25D366" }} />}
              valueStyle={{ fontWeight: 700, color: "#25D366" }}
              suffix={<Text type="secondary" style={{ fontSize: 13 }}>msgs</Text>}
            />
          </Card>
        </Col>

        <Col xs={24} sm={12} lg={6}>
          <Card hoverable style={{ borderRadius: 12, borderLeft: "4px solid #eb2f96" }}>
            <Statistic
              title="Today's Birthdays"
              value={stats.todayBirthdays}
              prefix={<GiftOutlined style={{ color: "#eb2f96" }} />}
              valueStyle={{ fontWeight: 700, color: "#eb2f96" }}
              suffix={<Text type="secondary" style={{ fontSize: 13 }}>celebrants</Text>}
            />
          </Card>
        </Col>

        <Col xs={24} sm={12} lg={6}>
          <Card hoverable style={{ borderRadius: 12, borderLeft: "4px solid #faad14" }}>
            <Statistic
              title="Fee Reminders Pending"
              value={stats.pendingFeesCount}
              prefix={<DollarOutlined style={{ color: "#faad14" }} />}
              valueStyle={{ fontWeight: 700, color: "#faad14" }}
              suffix={<Text type="secondary" style={{ fontSize: 13 }}>students</Text>}
            />
          </Card>
        </Col>

        <Col xs={24} sm={12} lg={6}>
          <Card hoverable style={{ borderRadius: 12, borderLeft: "4px solid #1677ff" }}>
            <Statistic
              title="Total Messages Logged"
              value={stats.totalSent}
              prefix={<CheckCircleOutlined style={{ color: "#1677ff" }} />}
              valueStyle={{ fontWeight: 700, color: "#1677ff" }}
            />
          </Card>
        </Col>
      </Row>

      {/* 3. Main Operational Tabs */}
      <Card style={{ borderRadius: 12 }}>
        <Tabs activeKey={activeTab} onChange={setActiveTab} size="large">
          {/* TAB 1: COMPOSE & BROADCAST */}
          <Tabs.TabPane
            tab={
              <span>
                <SendOutlined /> Compose & Broadcast
              </span>
            }
            key="compose"
          >
            <Row gutter={[24, 24]}>
              {/* Left Column: Form Controls */}
              <Col xs={24} lg={14}>
                <div style={{ marginBottom: 16 }}>
                  <Text strong style={{ display: "block", marginBottom: 6 }}>
                    1. Choose Broadcast Audience / Target:
                  </Text>
                  <Radio.Group
                    value={targetScope}
                    onChange={(e) => setTargetScope(e.target.value)}
                    buttonStyle="solid"
                  >
                    <Radio.Button value="class">🏫 Entire Class & Section</Radio.Button>
                    <Radio.Button value="individual">👤 Single Person</Radio.Button>
                    <Radio.Button value="school" disabled={!canBroadcastSchool}>
                      🌐 Whole School
                    </Radio.Button>
                    <Radio.Button value="staff" disabled={!canBroadcastSchool}>
                      👥 All Faculty & Staff
                    </Radio.Button>
                  </Radio.Group>
                  {!canBroadcastSchool && (
                    <Text type="secondary" style={{ fontSize: 12, display: "block", marginTop: 4 }}>
                      Note: Whole school and staff broadcasts require Administrative authorization.
                    </Text>
                  )}
                </div>

                {/* Scope Specific Selectors */}
                {targetScope === "class" && (
                  <Row gutter={12} style={{ marginBottom: 16 }}>
                    <Col span={12}>
                      <Text strong style={{ display: "block", marginBottom: 4 }}>
                        Select Class:
                      </Text>
                      <Select
                        placeholder="Choose Class"
                        style={{ width: "100%" }}
                        value={selectedClass}
                        onChange={(val) => {
                          setSelectedClass(val);
                          fetchSectionsForClass(val);
                        }}
                      >
                        {classes.map((c) => (
                          <Option key={c._id} value={c._id}>
                            {c.name}
                          </Option>
                        ))}
                      </Select>
                    </Col>
                    <Col span={12}>
                      <Text strong style={{ display: "block", marginBottom: 4 }}>
                        Select Section (Optional):
                      </Text>
                      <Select
                        placeholder="All Sections"
                        allowClear
                        style={{ width: "100%" }}
                        value={selectedSection}
                        onChange={setSelectedSection}
                      >
                        {sections.map((s) => (
                          <Option key={s._id} value={s._id}>
                            Section {s.name}
                          </Option>
                        ))}
                      </Select>
                    </Col>
                  </Row>
                )}

                {targetScope === "individual" && (
                  <Row gutter={12} style={{ marginBottom: 16 }}>
                    <Col span={12}>
                      <Text strong style={{ display: "block", marginBottom: 4 }}>
                        Recipient Name:
                      </Text>
                      <Input
                        placeholder="e.g. Ramesh Sharma"
                        value={recipientName}
                        onChange={(e) => setRecipientName(e.target.value)}
                      />
                    </Col>
                    <Col span={12}>
                      <Text strong style={{ display: "block", marginBottom: 4 }}>
                        WhatsApp Mobile Number:
                      </Text>
                      <Input
                        placeholder="e.g. 9416652277 or +919416652277"
                        prefix={<WhatsAppOutlined style={{ color: "#25D366" }} />}
                        value={phoneNumber}
                        onChange={(e) => setPhoneNumber(e.target.value)}
                      />
                    </Col>
                  </Row>
                )}

                {/* Pre-made Templates */}
                <div style={{ marginBottom: 16 }}>
                  <Text strong style={{ display: "block", marginBottom: 6 }}>
                    2. Load Message Template:
                  </Text>
                  <Space wrap>
                    <Button
                      size="small"
                      type={messageType === "festival" ? "primary" : "default"}
                      onClick={() => handleApplyTemplate("festival")}
                    >
                      🎉 Festival Greeting
                    </Button>
                    <Button
                      size="small"
                      type={messageType === "fee_reminder" ? "primary" : "default"}
                      onClick={() => handleApplyTemplate("fee_reminder")}
                    >
                      📢 Fee Due Reminder
                    </Button>
                    <Button
                      size="small"
                      type={messageType === "birthday" ? "primary" : "default"}
                      onClick={() => handleApplyTemplate("birthday")}
                    >
                      🎂 Birthday Wish
                    </Button>
                    <Button
                      size="small"
                      type={messageType === "announcement" ? "primary" : "default"}
                      onClick={() => handleApplyTemplate("announcement")}
                    >
                      📌 General Notice
                    </Button>
                    <Button
                      size="small"
                      type={messageType === "emergency" ? "primary" : "default"}
                      onClick={() => handleApplyTemplate("emergency")}
                    >
                      ⚠️ Urgent Holiday Alert
                    </Button>
                  </Space>
                </div>

                {/* Dynamic Tag Injectors */}
                <div style={{ marginBottom: 12 }}>
                  <Text type="secondary" style={{ fontSize: 12, marginRight: 6 }}>
                    Insert Smart Tags:
                  </Text>
                  <Space size="small" wrap>
                    <Tag
                      style={{ cursor: "pointer", background: "#e6f4ff", color: "#1677ff" }}
                      onClick={() => handleInsertTag("{name}")}
                    >
                      + {"{name}"}
                    </Tag>
                    <Tag
                      style={{ cursor: "pointer", background: "#e6f4ff", color: "#1677ff" }}
                      onClick={() => handleInsertTag("{parent_name}")}
                    >
                      + {"{parent_name}"}
                    </Tag>
                    <Tag
                      style={{ cursor: "pointer", background: "#e6f4ff", color: "#1677ff" }}
                      onClick={() => handleInsertTag("{class_name}")}
                    >
                      + {"{class_name}"}
                    </Tag>
                    <Tag
                      style={{ cursor: "pointer", background: "#e6f4ff", color: "#1677ff" }}
                      onClick={() => handleInsertTag("{school_name}")}
                    >
                      + {"{school_name}"}
                    </Tag>
                  </Space>
                </div>

                {/* Message Body */}
                <div style={{ marginBottom: 18 }}>
                  <Text strong style={{ display: "block", marginBottom: 6 }}>
                    3. WhatsApp Message Content:
                  </Text>
                  <TextArea
                    rows={8}
                    value={messageContent}
                    onChange={(e) => setMessageContent(e.target.value)}
                    placeholder="Type your WhatsApp message here. Use *bold*, _italics_, and emojis freely..."
                    showCount
                    maxLength={1000}
                    style={{ fontFamily: "monospace", fontSize: 13 }}
                  />
                </div>

                {/* Dispatch Buttons */}
                <Space size="middle" wrap>
                  <Button
                    type="primary"
                    size="large"
                    icon={<SendOutlined />}
                    style={{ background: "#25D366", borderColor: "#25D366", fontWeight: 600 }}
                    onClick={handleSendMessage}
                    loading={sending}
                  >
                    Dispatch via Automated WhatsApp Gateway
                  </Button>

                  {targetScope === "individual" && (
                    <Button
                      size="large"
                      icon={<WhatsAppOutlined style={{ color: "#25D366" }} />}
                      onClick={handleOpenDirectChat}
                    >
                      Open in WhatsApp Web
                    </Button>
                  )}
                </Space>
              </Col>

              {/* Right Column: Live Phone Mockup Preview */}
              <Col xs={24} lg={10}>
                <div
                  style={{
                    background: "#efeae2",
                    borderRadius: 16,
                    border: "1px solid #d1d7db",
                    padding: 16,
                    maxWidth: 380,
                    margin: "0 auto",
                    boxShadow: "0 4px 14px rgba(0,0,0,0.08)",
                  }}
                >
                  {/* Phone Header */}
                  <div
                    style={{
                      background: "#075e54",
                      color: "#fff",
                      padding: "10px 14px",
                      borderRadius: 10,
                      display: "flex",
                      alignItems: "center",
                      gap: 10,
                      marginBottom: 16,
                    }}
                  >
                    <Avatar style={{ backgroundColor: "#25D366" }} icon={<WhatsAppOutlined />} />
                    <div>
                      <div style={{ fontWeight: 600, fontSize: 14 }}>
                        {targetScope === "individual"
                          ? recipientName || "Student / Parent"
                          : targetScope === "class"
                          ? "Class WhatsApp Broadcast"
                          : "School Official Announcement"}
                      </div>
                      <div style={{ fontSize: 11, opacity: 0.85 }}>Online | School Verified</div>
                    </div>
                  </div>

                  {/* WhatsApp Message Bubble */}
                  <div
                    style={{
                      background: "#dcf8c6",
                      borderRadius: "8px 8px 0px 8px",
                      padding: "12px 14px",
                      maxWidth: "90%",
                      marginLeft: "auto",
                      boxShadow: "0 1px 2px rgba(0,0,0,0.15)",
                      whiteSpace: "pre-wrap",
                      fontSize: 13,
                      lineHeight: "1.45",
                      color: "#111b21",
                    }}
                  >
                    {messageContent || "Preview your message content here..."}
                    <div
                      style={{
                        textAlign: "right",
                        fontSize: 10,
                        color: "#667781",
                        marginTop: 4,
                      }}
                    >
                      {dayjs().format("hh:mm A")} <span style={{ color: "#53bdeb" }}>✓✓</span>
                    </div>
                  </div>

                  <div style={{ textAlign: "center", marginTop: 20 }}>
                    <Text type="secondary" style={{ fontSize: 11 }}>
                      Live Rendering Preview of Official WhatsApp Message
                    </Text>
                  </div>
                </div>
              </Col>
            </Row>
          </Tabs.TabPane>

          {/* TAB 2: AUTOMATED BIRTHDAY ENGINE */}
          <Tabs.TabPane
            tab={
              <span>
                <GiftOutlined /> Birthday Celebrants ({birthdays.totalBirthdays || stats.todayBirthdays})
              </span>
            }
            key="birthdays"
          >
            <Alert
              type="info"
              showIcon
              icon={<GiftOutlined />}
              message="Automated Birthday Greeting Dispatcher"
              description="The system automatically checks all students and staff born on today's calendar date. Click 'Send Birthday Wishes to All' to dispatch personalized greetings on their registered WhatsApp numbers."
              style={{ marginBottom: 20, borderRadius: 8 }}
            />

            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
              <div>
                <Title level={4} style={{ margin: 0 }}>
                  Today's Birthday List ({dayjs().format("DD MMMM")})
                </Title>
                <Text type="secondary">
                  {birthdays.totalBirthdays} person(s) celebrating today: {birthdays.students.length} Students, {birthdays.teachers.length} Faculty
                </Text>
              </div>

              <Space>
                <Button icon={<SyncOutlined />} onClick={fetchBirthdays} loading={bdayLoading}>
                  Refresh
                </Button>
                <Button
                  type="primary"
                  icon={<GiftOutlined />}
                  style={{ background: "#eb2f96", borderColor: "#eb2f96", fontWeight: 600 }}
                  onClick={handleDispatchBirthdays}
                  loading={bdayDispatching}
                  disabled={birthdays.totalBirthdays === 0}
                >
                  Send Birthday Wishes to All Today
                </Button>
              </Space>
            </div>

            {bdayLoading ? (
              <div style={{ textAlign: "center", padding: 40 }}>
                <Spin size="large" />
              </div>
            ) : birthdays.totalBirthdays === 0 ? (
              <Empty
                description="No student or faculty birthdays found on today's date."
                image={Empty.PRESENTED_IMAGE_SIMPLE}
              />
            ) : (
              <Row gutter={[16, 16]}>
                {birthdays.students.map((s) => (
                  <Col xs={24} sm={12} lg={8} key={s._id}>
                    <Card
                      hoverable
                      style={{
                        borderRadius: 12,
                        borderLeft: s.alreadySent ? "4px solid #52c41a" : "4px solid #eb2f96",
                      }}
                    >
                      <Space align="start" style={{ width: "100%", justifyContent: "space-between" }}>
                        <Space>
                          <Avatar size={48} style={{ backgroundColor: "#fde3cf", color: "#f56a00" }}>
                            {s.firstName?.[0]}
                          </Avatar>
                          <div>
                            <Text strong style={{ fontSize: 15 }}>
                              {s.firstName} {s.lastName || ""}
                            </Text>
                            <br />
                            <Tag color="cyan">
                              Class: {s.class?.name || "N/A"} {s.section?.name || ""}
                            </Tag>
                            <Tag color="blue">Adm: {s.admissionNumber}</Tag>
                            <br />
                            <Text type="secondary" style={{ fontSize: 12 }}>
                              <WhatsAppOutlined style={{ color: "#25D366" }} /> {s.phone || "No phone"}
                            </Text>
                          </div>
                        </Space>
                        <Tag color={s.alreadySent ? "success" : "volcano"}>
                          {s.alreadySent ? "Wished Today" : "Pending Wish"}
                        </Tag>
                      </Space>
                    </Card>
                  </Col>
                ))}

                {birthdays.teachers.map((t) => (
                  <Col xs={24} sm={12} lg={8} key={t._id}>
                    <Card
                      hoverable
                      style={{
                        borderRadius: 12,
                        borderLeft: t.alreadySent ? "4px solid #52c41a" : "4px solid #722ed1",
                      }}
                    >
                      <Space align="start" style={{ width: "100%", justifyContent: "space-between" }}>
                        <Space>
                          <Avatar size={48} style={{ backgroundColor: "#e6f4ff", color: "#1677ff" }}>
                            {t.firstName?.[0]}
                          </Avatar>
                          <div>
                            <Text strong style={{ fontSize: 15 }}>
                              {t.firstName} {t.lastName || ""}
                            </Text>
                            <br />
                            <Tag color="purple">Faculty / Staff</Tag>
                            <Tag color="geekblue">ID: {t.employeeId}</Tag>
                            <br />
                            <Text type="secondary" style={{ fontSize: 12 }}>
                              <WhatsAppOutlined style={{ color: "#25D366" }} /> {t.phone || "No phone"}
                            </Text>
                          </div>
                        </Space>
                        <Tag color={t.alreadySent ? "success" : "volcano"}>
                          {t.alreadySent ? "Wished Today" : "Pending Wish"}
                        </Tag>
                      </Space>
                    </Card>
                  </Col>
                ))}
              </Row>
            )}
          </Tabs.TabPane>

          {/* TAB 3: FEE REMINDERS & AUTOMATED RECEIPTS */}
          <Tabs.TabPane
            tab={
              <span>
                <DollarOutlined /> Fee Reminders & Receipts
              </span>
            }
            key="fees"
          >
            <Alert
              type="success"
              showIcon
              icon={<CheckCircleOutlined />}
              message="Automated Fee Receipts Active"
              description="Whenever an accountant collects a fee payment from the collection counter, an official digital WhatsApp receipt is automatically formatted and dispatched to the parent/guardian with the receipt number, amount paid, and remaining balance."
              style={{ marginBottom: 20, borderRadius: 8 }}
            />

            <Card
              title={
                <Space>
                  <DollarOutlined style={{ color: "#faad14" }} />
                  <span>Bulk Fee Due Reminders Dispatcher</span>
                </Space>
              }
              style={{ borderRadius: 10 }}
            >
              <Row gutter={[16, 16]}>
                <Col xs={24} sm={12}>
                  <Text strong style={{ display: "block", marginBottom: 6 }}>
                    Filter by Class (Optional):
                  </Text>
                  <Select
                    placeholder="All Classes"
                    allowClear
                    style={{ width: "100%" }}
                    value={feeFilterClass}
                    onChange={setFeeFilterClass}
                  >
                    {classes.map((c) => (
                      <Option key={c._id} value={c._id}>
                        {c.name}
                      </Option>
                    ))}
                  </Select>
                </Col>

                <Col xs={24} sm={12}>
                  <Text strong style={{ display: "block", marginBottom: 6 }}>
                    Custom Note to Parents (Optional):
                  </Text>
                  <Input
                    placeholder="e.g. Please clear before 25th to avoid late penalty fee."
                    value={feeCustomNote}
                    onChange={(e) => setFeeCustomNote(e.target.value)}
                  />
                </Col>
              </Row>

              <div style={{ marginTop: 20, textAlign: "right" }}>
                <Button
                  type="primary"
                  size="large"
                  icon={<WhatsAppOutlined />}
                  style={{ background: "#faad14", borderColor: "#faad14", fontWeight: 600, color: "#000" }}
                  onClick={handleDispatchFeeReminders}
                  loading={feeDispatching}
                >
                  Send Fee Due Reminders to All Eligible Parents
                </Button>
              </div>
            </Card>
          </Tabs.TabPane>

          {/* TAB 4: MESSAGE DELIVERY LOGS */}
          <Tabs.TabPane
            tab={
              <span>
                <HistoryOutlined /> Delivery Logs & History ({logsTotal})
              </span>
            }
            key="logs"
          >
            <Row justify="space-between" align="middle" style={{ marginBottom: 16 }}>
              <Col>
                <Space wrap>
                  <Input.Search
                    placeholder="Search by recipient or phone..."
                    allowClear
                    onSearch={() => fetchLogs(1)}
                    value={logSearch}
                    onChange={(e) => setLogSearch(e.target.value)}
                    style={{ width: 260 }}
                  />
                  <Select
                    value={logTypeFilter}
                    onChange={(v) => {
                      setLogTypeFilter(v);
                      fetchLogs(1);
                    }}
                    style={{ width: 160 }}
                  >
                    <Option value="all">All Message Types</Option>
                    <Option value="birthday">Birthday Wishes</Option>
                    <Option value="fee_receipt">Fee Receipts</Option>
                    <Option value="fee_reminder">Fee Reminders</Option>
                    <Option value="festival">Festival Greetings</Option>
                    <Option value="announcement">Announcements</Option>
                  </Select>
                </Space>
              </Col>

              <Col>
                <Button icon={<SyncOutlined />} onClick={() => fetchLogs(logPage)} loading={logsLoading}>
                  Refresh Logs
                </Button>
              </Col>
            </Row>

            <Table
              columns={logColumns}
              dataSource={logs}
              rowKey="_id"
              loading={logsLoading}
              pagination={{
                current: logPage,
                total: logsTotal,
                pageSize: 15,
                onChange: (p) => {
                  setLogPage(p);
                  fetchLogs(p);
                },
                showTotal: (total) => `Total ${total} messages`,
              }}
            />
          </Tabs.TabPane>
        </Tabs>
      </Card>

      {/* Message Inspection Modal */}
      <Modal
        open={Boolean(selectedLog)}
        onCancel={() => setSelectedLog(null)}
        footer={[
          selectedLog?.directUrl && (
            <Button
              key="chat"
              type="primary"
              icon={<WhatsAppOutlined />}
              style={{ background: "#25D366", borderColor: "#25D366" }}
              onClick={() => window.open(selectedLog.directUrl, "_blank")}
            >
              Open in WhatsApp Web
            </Button>
          ),
          <Button key="close" onClick={() => setSelectedLog(null)}>
            Close
          </Button>,
        ]}
        title={
          <Space>
            <WhatsAppOutlined style={{ color: "#25D366" }} />
            <span>Dispatched WhatsApp Message Details</span>
          </Space>
        }
      >
        {selectedLog && (
          <div>
            <div style={{ marginBottom: 12 }}>
              <Text strong>Recipient:</Text> {selectedLog.recipientName} ({selectedLog.phoneNumber})
              <br />
              <Text strong>Scope:</Text> <Tag>{selectedLog.targetScope?.toUpperCase()}</Tag>
              <Text strong>Type:</Text> <Tag color="blue">{selectedLog.messageType?.toUpperCase()}</Tag>
              <Text strong>Status:</Text> <Badge status="success" text={selectedLog.status?.toUpperCase()} />
            </div>

            <Divider style={{ margin: "10px 0" }} />

            <div
              style={{
                background: "#f8fafc",
                padding: 14,
                borderRadius: 8,
                border: "1px solid #e2e8f0",
                whiteSpace: "pre-wrap",
                fontFamily: "monospace",
                fontSize: 13,
                maxHeight: 280,
                overflowY: "auto",
              }}
            >
              {selectedLog.content}
            </div>

            <div style={{ marginTop: 12, fontSize: 12, color: "#8c8c8c" }}>
              Sent By: {selectedLog.sentBy?.name || "System Automated"} | Date:{" "}
              {dayjs(selectedLog.createdAt).format("DD MMM YYYY, hh:mm A")}
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
