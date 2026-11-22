"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import {
  Card,
  Row,
  Col,
  Typography,
  Table,
  Button,
  Tag,
  Space,
  Input,
  Select,
  Modal,
  Form,
  InputNumber,
  message,
  Popconfirm,
  Badge,
  Tabs,
  Avatar,
  Divider,
  Progress,
  Tooltip,
  Drawer,
  Empty,
  Skeleton,
  Statistic,
  Alert,
  Checkbox,
} from "antd";
import {
  CarOutlined,
  UserOutlined,
  PlusOutlined,
  SearchOutlined,
  ReloadOutlined,
  EditOutlined,
  DeleteOutlined,
  PhoneOutlined,
  ClockCircleOutlined,
  CheckCircleOutlined,
  InfoCircleOutlined,
  SwapOutlined,
  TeamOutlined,
  EnvironmentOutlined,
  DollarOutlined,
  SafetyCertificateOutlined,
  IdcardOutlined,
  CheckSquareOutlined,
  CloseCircleOutlined,
} from "@ant-design/icons";
import api from "@/lib/api";
import { useAuth } from "@/context/AuthContext";

const { Title, Text, Paragraph } = Typography;
const { Option } = Select;

export default function TransportPage() {
  const { user } = useAuth();
  const role = user?.role;
  const isSelfService = role === "student" || role === "parent";

  // Data states
  const [loading, setLoading] = useState(true);
  const [vehicles, setVehicles] = useState([]);
  const [students, setStudents] = useState([]);
  const [stats, setStats] = useState({
    totalTransportStudents: 0,
    totalActiveVehicles: 0,
    totalCapacity: 0,
    totalSeatsAvailable: 0,
  });

  // Self-service states (Student / Parent)
  const [selfData, setSelfData] = useState(null);

  // Filters
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedVehicleFilter, setSelectedVehicleFilter] = useState("all");
  const [selectedClassFilter, setSelectedClassFilter] = useState("all");
  const [classesList, setClassesList] = useState([]);

  // Modals & Drawers
  const [assignModalOpen, setAssignModalOpen] = useState(false);
  const [vehicleModalOpen, setVehicleModalOpen] = useState(false);
  const [editingVehicle, setEditingVehicle] = useState(null);
  const [passengerDrawerOpen, setPassengerDrawerOpen] = useState(false);
  const [drawerVehicle, setDrawerVehicle] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  // Forms
  const [assignForm] = Form.useForm();
  const [vehicleForm] = Form.useForm();

  // All school students list for assigning
  const [allStudentsList, setAllStudentsList] = useState([]);
  const [loadingAllStudents, setLoadingAllStudents] = useState(false);

  // Dynamic stops inside vehicle modal
  const [vehicleStops, setVehicleStops] = useState([]);

  // Fetch admin/management transport data
  const fetchTransportData = useCallback(async () => {
    setLoading(true);
    try {
      if (isSelfService) {
        const { data } = await api.get("/transport/my-transport");
        if (data.success) {
          setSelfData(data.data);
        }
      } else {
        const [vehRes, stuRes, clsRes] = await Promise.all([
          api.get("/transport/vehicles"),
          api.get("/transport/students"),
          api.get("/classes"),
        ]);

        if (vehRes.data.success) {
          setVehicles(vehRes.data.data.vehicles || []);
        }

        if (stuRes.data.success) {
          setStudents(stuRes.data.data.students || []);
          if (stuRes.data.data.stats) {
            setStats(stuRes.data.data.stats);
          }
        }

        if (clsRes.data.success) {
          setClassesList(clsRes.data.data.classes || []);
        }
      }
    } catch (err) {
      console.error("Fetch transport error:", err);
      message.error(err.response?.data?.message || "Failed to load transport records");
    } finally {
      setLoading(false);
    }
  }, [isSelfService]);

  useEffect(() => {
    fetchTransportData();
  }, [fetchTransportData]);

  // Load all students for the Assign modal dropdown
  const loadStudentsForAssignment = async () => {
    if (allStudentsList.length > 0) return;
    setLoadingAllStudents(true);
    try {
      const { data } = await api.get("/students");
      if (data.success) {
        setAllStudentsList(data.data.students || []);
      }
    } catch (err) {
      console.warn("Failed to load students for assignment", err);
    } finally {
      setLoadingAllStudents(false);
    }
  };

  // Open Assign Bus Modal
  const handleOpenAssignModal = (preselectedStudent = null) => {
    assignForm.resetFields();
    loadStudentsForAssignment();

    if (preselectedStudent) {
      const currentVehicleId =
        preselectedStudent.transport?.vehicle?._id ||
        preselectedStudent.transport?.vehicle ||
        undefined;

      assignForm.setFieldsValue({
        studentId: preselectedStudent._id,
        vehicleId: currentVehicleId,
        pickupPoint: preselectedStudent.transport?.pickupPoint || "",
        pickupTime: preselectedStudent.transport?.pickupTime || "",
        dropTime: preselectedStudent.transport?.dropTime || "",
        annualFee: preselectedStudent.transport?.annualFee || 12000,
        updateFeeRecord: true,
      });
    } else {
      assignForm.setFieldsValue({
        annualFee: 12000,
        updateFeeRecord: true,
      });
    }

    setAssignModalOpen(true);
  };

  // Handle bus selection inside Assign Modal
  const handleAssignVehicleSelect = (vehicleId) => {
    const veh = vehicles.find((v) => v._id === vehicleId);
    if (veh) {
      assignForm.setFieldsValue({
        pickupPoint: veh.stops?.[0]?.stopName || veh.routeName,
        pickupTime: veh.pickupTime || "07:30 AM",
        dropTime: veh.dropTime || "02:30 PM",
        annualFee: veh.annualFee || 12000,
      });
    }
  };

  // Submit Bus Assignment
  const handleAssignSubmit = async (values) => {
    setSubmitting(true);
    try {
      const payload = {
        studentId: values.studentId,
        vehicleId: values.vehicleId,
        pickupPoint: values.pickupPoint,
        pickupTime: values.pickupTime,
        dropTime: values.dropTime,
        annualFee: Number(values.annualFee || 0),
        updateFeeRecord: Boolean(values.updateFeeRecord),
      };

      const { data } = await api.post("/transport/assign", payload);
      if (data.success) {
        message.success(data.message || "Bus assigned successfully");
        setAssignModalOpen(false);
        assignForm.resetFields();
        fetchTransportData();
      }
    } catch (err) {
      message.error(err.response?.data?.message || "Failed to assign transport");
    } finally {
      setSubmitting(false);
    }
  };

  // Remove Transport from Student
  const handleRemoveStudentTransport = async (studentId) => {
    try {
      const { data } = await api.post("/transport/assign", {
        studentId,
        vehicleId: null,
        opted: false,
        updateFeeRecord: true,
      });
      if (data.success) {
        message.success("Transport service removed for student");
        fetchTransportData();
      }
    } catch (err) {
      message.error(err.response?.data?.message || "Failed to remove transport");
    }
  };

  // Open Vehicle Modal (Add or Edit)
  const handleOpenVehicleModal = (vehicle = null) => {
    vehicleForm.resetFields();
    setEditingVehicle(vehicle);

    if (vehicle) {
      vehicleForm.setFieldsValue({
        busNumber: vehicle.busNumber,
        vehicleModel: vehicle.vehicleModel,
        registrationNumber: vehicle.registrationNumber,
        capacity: vehicle.capacity,
        routeName: vehicle.routeName,
        driverName: vehicle.driverName,
        driverPhone: vehicle.driverPhone,
        driverLicense: vehicle.driverLicense,
        attendantName: vehicle.attendantName,
        attendantPhone: vehicle.attendantPhone,
        pickupTime: vehicle.pickupTime,
        dropTime: vehicle.dropTime,
        annualFee: vehicle.annualFee,
        status: vehicle.status || "active",
        notes: vehicle.notes,
      });
      setVehicleStops(vehicle.stops || []);
    } else {
      vehicleForm.setFieldsValue({
        vehicleModel: "Tata Starbus 40-Seater",
        capacity: 40,
        pickupTime: "07:30 AM",
        dropTime: "02:30 PM",
        annualFee: 12000,
        status: "active",
      });
      setVehicleStops([
        { stopName: "Main Junction", pickupTime: "07:30 AM", dropTime: "02:45 PM", fare: 12000 },
      ]);
    }

    setVehicleModalOpen(true);
  };

  // Add a stop to the vehicle stops list
  const handleAddStop = () => {
    setVehicleStops((prev) => [
      ...prev,
      { stopName: "", pickupTime: "07:30 AM", dropTime: "02:30 PM", fare: 12000 },
    ]);
  };

  // Remove stop
  const handleRemoveStop = (index) => {
    setVehicleStops((prev) => prev.filter((_, i) => i !== index));
  };

  // Update stop field
  const handleStopChange = (index, field, value) => {
    setVehicleStops((prev) => {
      const copy = [...prev];
      copy[index] = { ...copy[index], [field]: value };
      return copy;
    });
  };

  // Submit Vehicle Create/Update
  const handleVehicleSubmit = async (values) => {
    setSubmitting(true);
    try {
      const payload = {
        ...values,
        stops: vehicleStops.filter((s) => s.stopName && s.stopName.trim() !== ""),
      };

      if (editingVehicle) {
        const { data } = await api.put(`/transport/vehicles/${editingVehicle._id}`, payload);
        if (data.success) {
          message.success(`Vehicle ${values.busNumber} updated successfully`);
          setVehicleModalOpen(false);
          fetchTransportData();
        }
      } else {
        const { data } = await api.post("/transport/vehicles", payload);
        if (data.success) {
          message.success(`Vehicle ${values.busNumber} added successfully`);
          setVehicleModalOpen(false);
          fetchTransportData();
        }
      }
    } catch (err) {
      message.error(err.response?.data?.message || "Failed to save vehicle details");
    } finally {
      setSubmitting(false);
    }
  };

  // Delete Vehicle
  const handleDeleteVehicle = async (vehicleId) => {
    try {
      const { data } = await api.delete(`/transport/vehicles/${vehicleId}`);
      if (data.success) {
        message.success(data.message || "Vehicle removed successfully");
        fetchTransportData();
      }
    } catch (err) {
      message.error(err.response?.data?.message || "Failed to delete vehicle");
    }
  };

  // Open Passenger Roster Drawer
  const handleOpenPassengerDrawer = async (vehicle) => {
    setDrawerVehicle(vehicle);
    setPassengerDrawerOpen(true);
  };

  // Filtered Students list
  const filteredStudents = useMemo(() => {
    return students.filter((s) => {
      const matchVehicle =
        selectedVehicleFilter === "all" ||
        s.transport?.vehicle?._id === selectedVehicleFilter ||
        s.transport?.vehicle === selectedVehicleFilter;

      const matchClass =
        selectedClassFilter === "all" ||
        s.class?._id === selectedClassFilter ||
        s.class === selectedClassFilter;

      const nameMatch = `${s.firstName} ${s.lastName || ""}`.toLowerCase();
      const admMatch = (s.admissionNumber || "").toLowerCase();
      const busMatch = (s.transport?.busNumber || "").toLowerCase();
      const routeMatch = (s.transport?.routeName || "").toLowerCase();
      const stopMatch = (s.transport?.pickupPoint || "").toLowerCase();
      const driverMatch = (s.transport?.driverName || "").toLowerCase();

      const q = searchQuery.toLowerCase().trim();
      const matchSearch =
        !q ||
        nameMatch.includes(q) ||
        admMatch.includes(q) ||
        busMatch.includes(q) ||
        routeMatch.includes(q) ||
        stopMatch.includes(q) ||
        driverMatch.includes(q);

      return matchVehicle && matchClass && matchSearch;
    });
  }, [students, selectedVehicleFilter, selectedClassFilter, searchQuery]);

  // Filtered passengers for the Drawer
  const drawerPassengers = useMemo(() => {
    if (!drawerVehicle) return [];
    return students.filter(
      (s) =>
        s.transport?.vehicle?._id === drawerVehicle._id ||
        s.transport?.vehicle === drawerVehicle._id
    );
  }, [students, drawerVehicle]);

  // Students Table Columns
  const studentColumns = [
    {
      title: "Student Details",
      key: "student",
      render: (_, record) => (
        <Space size={12}>
          <Avatar
            style={{
              backgroundColor: record.gender === "female" ? "#f759ab" : "#1677ff",
              fontWeight: "bold",
            }}
          >
            {record.firstName?.[0] || "S"}
          </Avatar>
          <div>
            <Text strong style={{ fontSize: 14 }}>
              {record.firstName} {record.lastName || ""}
            </Text>
            <div style={{ fontSize: 12, color: "#64748b" }}>
              Adm: <span style={{ fontWeight: 600 }}>{record.admissionNumber}</span>
              {record.rollNumber ? ` • Roll: ${record.rollNumber}` : ""}
            </div>
          </div>
        </Space>
      ),
    },
    {
      title: "Class & Section",
      key: "class",
      render: (_, record) => (
        <div>
          <Tag color="geekblue" style={{ fontWeight: 600 }}>
            {record.class?.name || "Grade"} {record.section?.name ? `- ${record.section.name}` : ""}
          </Tag>
        </div>
      ),
    },
    {
      title: "Assigned Bus",
      key: "bus",
      render: (_, record) => {
        const busNo = record.transport?.busNumber || "BUS";
        const vModel = record.transport?.vehicle?.vehicleModel || "";
        return (
          <Space direction="vertical" size={2}>
            <Tag color="volcano" icon={<CarOutlined />} style={{ fontWeight: 700, fontSize: 13 }}>
              {busNo}
            </Tag>
            {vModel && (
              <span style={{ fontSize: 11, color: "#64748b" }}>
                {vModel}
              </span>
            )}
          </Space>
        );
      },
    },
    {
      title: "Route & Pickup Stop",
      key: "route",
      render: (_, record) => (
        <div style={{ maxWidth: 220 }}>
          <div style={{ fontWeight: 600, color: "#1e293b", fontSize: 13 }}>
            <EnvironmentOutlined style={{ color: "#ef4444", marginRight: 4 }} />
            {record.transport?.pickupPoint || "Assigned Stop"}
          </div>
          <div style={{ fontSize: 11, color: "#64748b", marginTop: 2 }}>
            {record.transport?.routeName || "School Route"}
          </div>
        </div>
      ),
    },
    {
      title: "Bus Timings",
      key: "timings",
      render: (_, record) => (
        <Space direction="vertical" size={2}>
          <Tag color="cyan" icon={<ClockCircleOutlined />} style={{ fontSize: 12 }}>
            Pickup: <b>{record.transport?.pickupTime || "07:30 AM"}</b>
          </Tag>
          <Tag color="purple" icon={<ClockCircleOutlined />} style={{ fontSize: 12 }}>
            Drop: <b>{record.transport?.dropTime || "02:30 PM"}</b>
          </Tag>
        </Space>
      ),
    },
    {
      title: "Driver & Contact",
      key: "driver",
      render: (_, record) => {
        const dName = record.transport?.driverName || "Driver";
        const dPhone = record.transport?.driverPhone || "";
        return (
          <div>
            <div style={{ fontWeight: 600, fontSize: 13 }}>{dName}</div>
            {dPhone && (
              <a
                href={`tel:${dPhone}`}
                style={{ fontSize: 12, color: "#0284c7", display: "inline-flex", alignItems: "center", gap: 4 }}
              >
                <PhoneOutlined /> {dPhone}
              </a>
            )}
          </div>
        );
      },
    },
    {
      title: "Annual Fee",
      dataIndex: ["transport", "annualFee"],
      key: "fee",
      render: (fee) => (
        <span style={{ fontWeight: 700, color: "#0f766e" }}>
          ₹{Number(fee || 0).toLocaleString()}
        </span>
      ),
    },
    {
      title: "Actions",
      key: "actions",
      align: "right",
      render: (_, record) => (
        <Space size={8}>
          <Tooltip title="Change Bus or Stop">
            <Button
              size="small"
              icon={<SwapOutlined />}
              onClick={() => handleOpenAssignModal(record)}
            >
              Reassign
            </Button>
          </Tooltip>
          <Popconfirm
            title="Remove Transport"
            description="Are you sure you want to cancel transport service for this student?"
            okText="Yes, Remove"
            cancelText="Cancel"
            okButtonProps={{ danger: true }}
            onConfirm={() => handleRemoveStudentTransport(record._id)}
          >
            <Tooltip title="Remove Transport Service">
              <Button size="small" danger icon={<DeleteOutlined />} />
            </Tooltip>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  // =========================================================================
  // VIEW A: STUDENT / PARENT SELF-SERVICE PORTAL VIEW
  // =========================================================================
  if (isSelfService) {
    if (loading) {
      return (
        <div style={{ maxWidth: 900, margin: "40px auto", padding: 20 }}>
          <Skeleton active paragraph={{ rows: 6 }} />
        </div>
      );
    }

    // Role: STUDENT (Strictly Self Only)
    if (role === "student") {
      const studentInfo = selfData?.student;
      const transport = selfData?.transport;
      const isEnrolled = Boolean(transport?.enrolled);

      return (
        <div style={{ maxWidth: 860, margin: "0 auto", paddingBottom: 32 }}>
          {/* Header */}
          <div style={{ marginBottom: 24 }}>
            <Title level={3} style={{ margin: 0, display: "flex", alignItems: "center", gap: 10 }}>
              <CarOutlined style={{ color: "#fa8c16" }} /> My School Bus & Transit Pass
            </Title>
            <Text type="secondary">
              View your assigned school bus details, morning pickup and afternoon drop schedule, and driver contact info.
            </Text>
          </div>

          {!isEnrolled ? (
            <Card style={{ borderRadius: 12, textAlign: "center", padding: "40px 20px" }}>
              <Empty
                image={<CarOutlined style={{ fontSize: 64, color: "#94a3b8" }} />}
                description={
                  <div>
                    <Title level={4} style={{ color: "#475569", marginTop: 16 }}>
                      No School Bus Service Opted
                    </Title>
                    <Paragraph type="secondary" style={{ maxWidth: 500, margin: "0 auto 20px" }}>
                      You are currently not enrolled in the school transport facility. If you require bus service for daily commute, please contact the school administration office or fee counter.
                    </Paragraph>
                    <Tag color="orange" style={{ padding: "4px 12px", fontSize: 13 }}>
                      Campus Commute Status: Self / Private Commute
                    </Tag>
                  </div>
                }
              />
            </Card>
          ) : (
            <Card
              bordered={false}
              style={{
                borderRadius: 16,
                boxShadow: "0 10px 25px rgba(0,0,0,0.06)",
                borderTop: "6px solid #fa8c16",
                overflow: "hidden",
                background: "#ffffff",
              }}
            >
              {/* Top Banner */}
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  flexWrap: "wrap",
                  gap: 16,
                  paddingBottom: 20,
                  borderBottom: "1px solid #f1f5f9",
                  marginBottom: 20,
                }}
              >
                <div>
                  <Space size={8} align="center">
                    <Tag color="gold" style={{ fontSize: 18, padding: "4px 12px", fontWeight: 800 }}>
                      <CarOutlined /> {transport.busNumber}
                    </Tag>
                    <Tag color="green">Active Bus Service</Tag>
                  </Space>
                  <Title level={4} style={{ margin: "10px 0 2px" }}>
                    {transport.routeName}
                  </Title>
                  <Text type="secondary" style={{ fontSize: 13 }}>
                    Vehicle: <b>{transport.vehicleModel}</b>
                    {transport.registrationNumber ? ` (Reg: ${transport.registrationNumber})` : ""}
                  </Text>
                </div>

                <div style={{ textAlign: "right" }}>
                  <Text type="secondary" style={{ fontSize: 12, display: "block" }}>
                    Passenger Student
                  </Text>
                  <Text strong style={{ fontSize: 16, color: "#1e293b" }}>
                    {studentInfo?.name}
                  </Text>
                  <div style={{ fontSize: 12, color: "#64748b" }}>
                    {studentInfo?.className} {studentInfo?.sectionName ? `- ${studentInfo.sectionName}` : ""} • Adm: {studentInfo?.admissionNumber}
                  </div>
                </div>
              </div>

              {/* Transit Timings & Stop */}
              <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
                <Col xs={24} sm={8}>
                  <Card
                    size="small"
                    style={{
                      borderRadius: 10,
                      background: "#eff6ff",
                      border: "1px solid #bfdbfe",
                      height: "100%",
                    }}
                  >
                    <div style={{ color: "#1d4ed8", fontWeight: 700, fontSize: 13, marginBottom: 6 }}>
                      <EnvironmentOutlined /> Assigned Pickup Stop
                    </div>
                    <div style={{ fontSize: 16, fontWeight: 800, color: "#1e3a8a" }}>
                      {transport.pickupPoint}
                    </div>
                    <Text type="secondary" style={{ fontSize: 11 }}>
                      Boarding & deboarding point
                    </Text>
                  </Card>
                </Col>

                <Col xs={24} sm={8}>
                  <Card
                    size="small"
                    style={{
                      borderRadius: 10,
                      background: "#ecfdf5",
                      border: "1px solid #a7f3d0",
                      height: "100%",
                    }}
                  >
                    <div style={{ color: "#047857", fontWeight: 700, fontSize: 13, marginBottom: 6 }}>
                      <ClockCircleOutlined /> Morning Pickup
                    </div>
                    <div style={{ fontSize: 20, fontWeight: 800, color: "#065f46" }}>
                      {transport.pickupTime}
                    </div>
                    <Text type="secondary" style={{ fontSize: 11 }}>
                      Please be at stop 5 mins prior
                    </Text>
                  </Card>
                </Col>

                <Col xs={24} sm={8}>
                  <Card
                    size="small"
                    style={{
                      borderRadius: 10,
                      background: "#faf5ff",
                      border: "1px solid #e9d5ff",
                      height: "100%",
                    }}
                  >
                    <div style={{ color: "#7e22ce", fontWeight: 700, fontSize: 13, marginBottom: 6 }}>
                      <ClockCircleOutlined /> Afternoon Drop
                    </div>
                    <div style={{ fontSize: 20, fontWeight: 800, color: "#581c87" }}>
                      {transport.dropTime}
                    </div>
                    <Text type="secondary" style={{ fontSize: 11 }}>
                      Departure from school campus
                    </Text>
                  </Card>
                </Col>
              </Row>

              {/* Driver & Attendant Personnel Cards */}
              <Title level={5} style={{ marginBottom: 12 }}>
                <TeamOutlined /> Crew & Safety Personnel
              </Title>

              <Row gutter={[16, 16]}>
                <Col xs={24} sm={12}>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 14,
                      padding: "14px 18px",
                      background: "#f8fafc",
                      border: "1px solid #e2e8f0",
                      borderRadius: 10,
                    }}
                  >
                    <Avatar size={48} icon={<UserOutlined />} style={{ backgroundColor: "#0284c7" }} />
                    <div style={{ flex: 1 }}>
                      <Text type="secondary" style={{ fontSize: 11, textTransform: "uppercase", fontWeight: 700 }}>
                        Designated Driver
                      </Text>
                      <div style={{ fontSize: 15, fontWeight: 700, color: "#0f172a" }}>
                        {transport.driverName}
                      </div>
                      {transport.driverPhone && (
                        <a
                          href={`tel:${transport.driverPhone}`}
                          style={{ fontSize: 13, color: "#0284c7", fontWeight: 600, display: "inline-flex", alignItems: "center", gap: 4, marginTop: 4 }}
                        >
                          <PhoneOutlined /> {transport.driverPhone}
                        </a>
                      )}
                    </div>
                  </div>
                </Col>

                <Col xs={24} sm={12}>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 14,
                      padding: "14px 18px",
                      background: "#f8fafc",
                      border: "1px solid #e2e8f0",
                      borderRadius: 10,
                    }}
                  >
                    <Avatar size={48} icon={<SafetyCertificateOutlined />} style={{ backgroundColor: "#10b981" }} />
                    <div style={{ flex: 1 }}>
                      <Text type="secondary" style={{ fontSize: 11, textTransform: "uppercase", fontWeight: 700 }}>
                        Bus Helper / Attendant
                      </Text>
                      <div style={{ fontSize: 15, fontWeight: 700, color: "#0f172a" }}>
                        {transport.attendantName || "Staff Attendant"}
                      </div>
                      {transport.attendantPhone ? (
                        <a
                          href={`tel:${transport.attendantPhone}`}
                          style={{ fontSize: 13, color: "#10b981", fontWeight: 600, display: "inline-flex", alignItems: "center", gap: 4, marginTop: 4 }}
                        >
                          <PhoneOutlined /> {transport.attendantPhone}
                        </a>
                      ) : (
                        <Text type="secondary" style={{ fontSize: 12 }}>Assigned for student safety</Text>
                      )}
                    </div>
                  </div>
                </Col>
              </Row>

              <Alert
                type="info"
                showIcon
                style={{ marginTop: 20, borderRadius: 8 }}
                message="School Bus Safety Guidelines"
                description="All school buses are speed-governed and equipped with first aid facilities. Students must remain seated while the vehicle is in motion and wear seatbelts where available."
              />
            </Card>
          )}
        </div>
      );
    }

    // Role: PARENT (Strictly Linked Children Only)
    if (role === "parent") {
      const children = selfData?.children || [];

      return (
        <div style={{ maxWidth: 960, margin: "0 auto", paddingBottom: 32 }}>
          <div style={{ marginBottom: 24 }}>
            <Title level={3} style={{ margin: 0, display: "flex", alignItems: "center", gap: 10 }}>
              <CarOutlined style={{ color: "#fa8c16" }} /> Children Bus & Transport Services
            </Title>
            <Text type="secondary">
              Monitor your children's assigned school bus, route, morning boarding stop, and driver contact details.
            </Text>
          </div>

          {children.length === 0 ? (
            <Card style={{ borderRadius: 12, textAlign: "center", padding: "40px 20px" }}>
              <Empty description="No student profiles are linked to this parent account." />
            </Card>
          ) : (
            <Row gutter={[20, 20]}>
              {children.map((child) => {
                const tr = child.transport;
                const isEnrolled = Boolean(tr?.enrolled);

                return (
                  <Col xs={24} md={children.length === 1 ? 24 : 12} key={child.studentId}>
                    <Card
                      bordered={false}
                      style={{
                        borderRadius: 14,
                        boxShadow: "0 4px 15px rgba(0,0,0,0.06)",
                        borderTop: isEnrolled ? "4px solid #1677ff" : "4px solid #94a3b8",
                        height: "100%",
                      }}
                      bodyStyle={{ padding: 22 }}
                    >
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 14 }}>
                        <div>
                          <Title level={4} style={{ margin: 0 }}>
                            {child.name}
                          </Title>
                          <Text type="secondary" style={{ fontSize: 12 }}>
                            {child.className} {child.sectionName ? `- ${child.sectionName}` : ""} • Adm: {child.admissionNumber}
                          </Text>
                        </div>
                        {isEnrolled ? (
                          <Tag color="volcano" icon={<CarOutlined />} style={{ fontWeight: 700 }}>
                            {tr.busNumber}
                          </Tag>
                        ) : (
                          <Tag color="default">Not Enrolled</Tag>
                        )}
                      </div>

                      <Divider style={{ margin: "10px 0 14px" }} />

                      {isEnrolled ? (
                        <div>
                          <div style={{ marginBottom: 12 }}>
                            <Text type="secondary" style={{ fontSize: 11, textTransform: "uppercase", fontWeight: 700 }}>
                              Route & Pickup Stop
                            </Text>
                            <div style={{ fontSize: 14, fontWeight: 700, color: "#1e293b", marginTop: 2 }}>
                              <EnvironmentOutlined style={{ color: "#ef4444", marginRight: 4 }} />
                              {tr.pickupPoint}
                            </div>
                            <div style={{ fontSize: 12, color: "#64748b" }}>{tr.routeName}</div>
                          </div>

                          <Row gutter={8} style={{ marginBottom: 14 }}>
                            <Col span={12}>
                              <div style={{ padding: "8px 10px", background: "#f0fdf4", borderRadius: 8, border: "1px solid #bbf7d0" }}>
                                <Text type="secondary" style={{ fontSize: 11, color: "#166534" }}>Pickup Time</Text>
                                <div style={{ fontSize: 14, fontWeight: 800, color: "#14532d" }}>{tr.pickupTime}</div>
                              </div>
                            </Col>
                            <Col span={12}>
                              <div style={{ padding: "8px 10px", background: "#faf5ff", borderRadius: 8, border: "1px solid #e9d5ff" }}>
                                <Text type="secondary" style={{ fontSize: 11, color: "#6b21a8" }}>Drop Time</Text>
                                <div style={{ fontSize: 14, fontWeight: 800, color: "#581c87" }}>{tr.dropTime}</div>
                              </div>
                            </Col>
                          </Row>

                          <div style={{ padding: "10px 12px", background: "#f8fafc", borderRadius: 8, border: "1px solid #e2e8f0" }}>
                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                              <div>
                                <Text type="secondary" style={{ fontSize: 11 }}>Driver: </Text>
                                <Text strong style={{ fontSize: 13 }}>{tr.driverName}</Text>
                              </div>
                              {tr.driverPhone && (
                                <a href={`tel:${tr.driverPhone}`} style={{ color: "#0284c7", fontWeight: 600, fontSize: 12 }}>
                                  <PhoneOutlined /> Call
                                </a>
                              )}
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div style={{ padding: "20px 0", textAlign: "center" }}>
                          <Text type="secondary" style={{ fontSize: 13 }}>
                            No transport facility opted for this child. Contact school office to request school bus service.
                          </Text>
                        </div>
                      )}
                    </Card>
                  </Col>
                );
              })}
            </Row>
          )}
        </div>
      );
    }
  }

  // =========================================================================
  // VIEW B: MANAGEMENT / ADMIN / ACCOUNTANT TRANSPORT SYSTEM
  // =========================================================================
  return (
    <div style={{ maxWidth: 1300, margin: "0 auto", paddingBottom: 40 }}>
      {/* Top Header */}
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
            <CarOutlined style={{ color: "#fa8c16" }} /> Transport & Bus Management
          </Title>
          <Text type="secondary">
            Manage school buses, fleet routes, driver timings, and assign transport services to students.
          </Text>
        </div>

        <Space wrap>
          <Button icon={<ReloadOutlined />} onClick={fetchTransportData} loading={loading}>
            Refresh
          </Button>
          <Button
            type="primary"
            icon={<SwapOutlined />}
            style={{ backgroundColor: "#1677ff" }}
            onClick={() => handleOpenAssignModal()}
          >
            Assign Bus to Student
          </Button>
          <Button
            type="primary"
            icon={<PlusOutlined />}
            style={{ backgroundColor: "#059669" }}
            onClick={() => handleOpenVehicleModal()}
          >
            Add New Vehicle / Bus
          </Button>
        </Space>
      </div>

      {/* KPI Cards */}
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={24} sm={12} lg={6}>
          <Card hoverable style={{ borderRadius: 12, borderLeft: "4px solid #1677ff" }}>
            <Statistic
              title="Students Enrolled in Bus"
              value={stats.totalTransportStudents}
              prefix={<UserOutlined style={{ color: "#1677ff" }} />}
              valueStyle={{ fontWeight: 800 }}
            />
            <Text type="secondary" style={{ fontSize: 12 }}>
              Active transit passengers
            </Text>
          </Card>
        </Col>

        <Col xs={24} sm={12} lg={6}>
          <Card hoverable style={{ borderRadius: 12, borderLeft: "4px solid #10b981" }}>
            <Statistic
              title="Active School Buses"
              value={vehicles.filter((v) => v.status === "active").length}
              prefix={<CarOutlined style={{ color: "#10b981" }} />}
              valueStyle={{ fontWeight: 800, color: "#10b981" }}
            />
            <Text type="secondary" style={{ fontSize: 12 }}>
              Total fleet: {vehicles.length} vehicles
            </Text>
          </Card>
        </Col>

        <Col xs={24} sm={12} lg={6}>
          <Card hoverable style={{ borderRadius: 12, borderLeft: "4px solid #8b5cf6" }}>
            <Statistic
              title="Fleet Seating Capacity"
              value={stats.totalCapacity}
              prefix={<TeamOutlined style={{ color: "#8b5cf6" }} />}
              valueStyle={{ fontWeight: 800 }}
            />
            <Text type="secondary" style={{ fontSize: 12 }}>
              Total available student seats
            </Text>
          </Card>
        </Col>

        <Col xs={24} sm={12} lg={6}>
          <Card hoverable style={{ borderRadius: 12, borderLeft: "4px solid #fa8c16" }}>
            <Statistic
              title="Available Seats"
              value={stats.totalSeatsAvailable}
              prefix={<CheckCircleOutlined style={{ color: "#fa8c16" }} />}
              valueStyle={{ fontWeight: 800, color: stats.totalSeatsAvailable > 0 ? "#059669" : "#dc2626" }}
            />
            <Text type="secondary" style={{ fontSize: 12 }}>
              Vacant capacity across routes
            </Text>
          </Card>
        </Col>
      </Row>

      {/* Main Content Tabs */}
      <Card style={{ borderRadius: 12, boxShadow: "0 2px 10px rgba(0,0,0,0.03)" }}>
        <Tabs
          defaultActiveKey="students"
          items={[
            {
              key: "students",
              label: (
                <span style={{ fontSize: 15, fontWeight: 600 }}>
                  <UserOutlined /> Enrolled Students & Bus Allocations ({filteredStudents.length})
                </span>
              ),
              children: (
                <div>
                  {/* Search and Filters Bar */}
                  <Row gutter={[12, 12]} style={{ marginBottom: 18 }} align="middle">
                    <Col xs={24} sm={8}>
                      <Input
                        placeholder="Search student, adm no, bus, stop or driver..."
                        prefix={<SearchOutlined style={{ color: "#94a3b8" }} />}
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        allowClear
                      />
                    </Col>
                    <Col xs={24} sm={5}>
                      <Select
                        style={{ width: "100%" }}
                        value={selectedVehicleFilter}
                        onChange={setSelectedVehicleFilter}
                        placeholder="Filter by Bus"
                      >
                        <Option value="all">All School Buses</Option>
                        {vehicles.map((v) => (
                          <Option key={v._id} value={v._id}>
                            {v.busNumber} ({v.routeName})
                          </Option>
                        ))}
                      </Select>
                    </Col>
                    <Col xs={24} sm={5}>
                      <Select
                        style={{ width: "100%" }}
                        value={selectedClassFilter}
                        onChange={setSelectedClassFilter}
                        placeholder="Filter by Class"
                      >
                        <Option value="all">All Classes</Option>
                        {classesList.map((c) => (
                          <Option key={c._id} value={c._id}>
                            {c.name}
                          </Option>
                        ))}
                      </Select>
                    </Col>
                    <Col xs={24} sm={6} style={{ textAlign: "right" }}>
                      <Text type="secondary" style={{ fontSize: 13 }}>
                        Showing <b>{filteredStudents.length}</b> passengers
                      </Text>
                    </Col>
                  </Row>

                  {/* Students Table */}
                  <Table
                    columns={studentColumns}
                    dataSource={filteredStudents}
                    rowKey="_id"
                    loading={loading}
                    pagination={{ pageSize: 10, showSizeChanger: true }}
                    locale={{
                      emptyText: (
                        <div style={{ padding: "30px 0" }}>
                          <CarOutlined style={{ fontSize: 40, color: "#cbd5e1", marginBottom: 8 }} />
                          <div style={{ color: "#64748b" }}>No students match your filter criteria</div>
                          <Button
                            type="primary"
                            style={{ marginTop: 12 }}
                            icon={<SwapOutlined />}
                            onClick={() => handleOpenAssignModal()}
                          >
                            Assign Bus to a Student
                          </Button>
                        </div>
                      ),
                    }}
                  />
                </div>
              ),
            },
            {
              key: "vehicles",
              label: (
                <span style={{ fontSize: 15, fontWeight: 600 }}>
                  <CarOutlined /> Fleet & Vehicles ({vehicles.length})
                </span>
              ),
              children: (
                <div>
                  <Row gutter={[20, 20]}>
                    {vehicles.map((v) => {
                      const occPct = v.occupancyPercentage || 0;
                      return (
                        <Col xs={24} md={12} lg={8} key={v._id}>
                          <Card
                            hoverable
                            bordered
                            style={{
                              borderRadius: 12,
                              height: "100%",
                              display: "flex",
                              flexDirection: "column",
                              borderTop: `4px solid ${v.status === "active" ? "#10b981" : "#f59e0b"}`,
                            }}
                            bodyStyle={{ flex: 1, display: "flex", flexDirection: "column", padding: 20 }}
                          >
                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 10 }}>
                              <div>
                                <Space size={6}>
                                  <Tag color="volcano" style={{ fontWeight: 800, fontSize: 14 }}>
                                    {v.busNumber}
                                  </Tag>
                                  <Tag color={v.status === "active" ? "green" : "orange"}>
                                    {v.status === "active" ? "Active" : "Maintenance"}
                                  </Tag>
                                </Space>
                                <div style={{ fontWeight: 700, fontSize: 15, color: "#0f172a", marginTop: 6 }}>
                                  {v.routeName}
                                </div>
                                <Text type="secondary" style={{ fontSize: 12 }}>
                                  {v.vehicleModel} {v.registrationNumber ? `• ${v.registrationNumber}` : ""}
                                </Text>
                              </div>
                            </div>

                            <Divider style={{ margin: "10px 0" }} />

                            {/* Seat occupancy bar */}
                            <div style={{ marginBottom: 14 }}>
                              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, marginBottom: 4 }}>
                                <Text type="secondary">Seat Occupancy</Text>
                                <Text strong>
                                  {v.assignedStudentsCount || 0} / {v.capacity} Seats
                                </Text>
                              </div>
                              <Progress
                                percent={occPct}
                                status={occPct >= 95 ? "exception" : "normal"}
                                strokeColor={occPct >= 95 ? "#ef4444" : occPct >= 75 ? "#f59e0b" : "#10b981"}
                                size="small"
                              />
                            </div>

                            {/* Schedule & Timing */}
                            <Row gutter={8} style={{ marginBottom: 14 }}>
                              <Col span={12}>
                                <div style={{ padding: "6px 8px", background: "#f8fafc", borderRadius: 6, border: "1px solid #e2e8f0" }}>
                                  <Text type="secondary" style={{ fontSize: 10 }}>Morning Pickup</Text>
                                  <div style={{ fontSize: 12, fontWeight: 700, color: "#1e293b" }}>{v.pickupTime}</div>
                                </div>
                              </Col>
                              <Col span={12}>
                                <div style={{ padding: "6px 8px", background: "#f8fafc", borderRadius: 6, border: "1px solid #e2e8f0" }}>
                                  <Text type="secondary" style={{ fontSize: 10 }}>Afternoon Drop</Text>
                                  <div style={{ fontSize: 12, fontWeight: 700, color: "#1e293b" }}>{v.dropTime}</div>
                                </div>
                              </Col>
                            </Row>

                            {/* Driver Information */}
                            <div style={{ padding: "10px 12px", background: "#f8fafc", borderRadius: 8, border: "1px solid #e2e8f0", marginBottom: 14 }}>
                              <div style={{ fontSize: 12, fontWeight: 600, color: "#1e293b" }}>
                                Driver: {v.driverName}
                              </div>
                              {v.driverPhone && (
                                <a href={`tel:${v.driverPhone}`} style={{ fontSize: 12, color: "#0284c7" }}>
                                  <PhoneOutlined /> {v.driverPhone}
                                </a>
                              )}
                              {v.attendantName && (
                                <div style={{ fontSize: 11, color: "#64748b", marginTop: 4 }}>
                                  Attendant: {v.attendantName} {v.attendantPhone ? `(${v.attendantPhone})` : ""}
                                </div>
                              )}
                            </div>

                            {/* Stops Tags */}
                            {v.stops?.length > 0 && (
                              <div style={{ marginBottom: 14, flex: 1 }}>
                                <Text type="secondary" style={{ fontSize: 11, display: "block", marginBottom: 4 }}>
                                  Route Stops ({v.stops.length}):
                                </Text>
                                <Space wrap size={[4, 4]}>
                                  {v.stops.map((s, idx) => (
                                    <Tag key={idx} style={{ fontSize: 11 }}>
                                      {s.stopName}
                                    </Tag>
                                  ))}
                                </Space>
                              </div>
                            )}

                            {/* Actions */}
                            <div style={{ marginTop: "auto", borderTop: "1px solid #f1f5f9", paddingTop: 12 }}>
                              <Row gutter={8}>
                                <Col span={12}>
                                  <Button
                                    block
                                    size="small"
                                    icon={<TeamOutlined />}
                                    onClick={() => handleOpenPassengerDrawer(v)}
                                  >
                                    Passenger List ({v.assignedStudentsCount || 0})
                                  </Button>
                                </Col>
                                <Col span={6}>
                                  <Button
                                    block
                                    size="small"
                                    icon={<EditOutlined />}
                                    onClick={() => handleOpenVehicleModal(v)}
                                  >
                                    Edit
                                  </Button>
                                </Col>
                                <Col span={6}>
                                  <Popconfirm
                                    title="Delete Vehicle"
                                    description={`Are you sure you want to delete ${v.busNumber}?`}
                                    onConfirm={() => handleDeleteVehicle(v._id)}
                                    okButtonProps={{ danger: true }}
                                  >
                                    <Button block size="small" danger icon={<DeleteOutlined />} />
                                  </Popconfirm>
                                </Col>
                              </Row>
                            </div>
                          </Card>
                        </Col>
                      );
                    })}
                  </Row>
                </div>
              ),
            },
          ]}
        />
      </Card>

      {/* ========================================================================= */}
      {/* MODAL 1: ASSIGN BUS TO STUDENT                                            */}
      {/* ========================================================================= */}
      <Modal
        title={
          <Space>
            <SwapOutlined style={{ color: "#1677ff" }} />
            <span>Assign School Bus to Student</span>
          </Space>
        }
        open={assignModalOpen}
        onCancel={() => setAssignModalOpen(false)}
        footer={null}
        destroyOnClose
        width={600}
      >
        <Form
          form={assignForm}
          layout="vertical"
          onFinish={handleAssignSubmit}
          style={{ marginTop: 16 }}
        >
          <Form.Item
            name="studentId"
            label="Select Student"
            rules={[{ required: true, message: "Please select a student" }]}
          >
            <Select
              placeholder="Search student by name, admission no, or class"
              showSearch
              filterOption={(input, option) =>
                (option?.label || "").toLowerCase().includes(input.toLowerCase())
              }
              loading={loadingAllStudents}
            >
              {allStudentsList.map((st) => (
                <Option
                  key={st._id}
                  value={st._id}
                  label={`${st.firstName} ${st.lastName || ""} ${st.admissionNumber} ${st.class?.name || ""}`}
                >
                  <div style={{ display: "flex", justifyContent: "space-between" }}>
                    <span>
                      <b>{st.firstName} {st.lastName || ""}</b> (Adm: {st.admissionNumber})
                    </span>
                    <span style={{ color: "#64748b", fontSize: 12 }}>
                      {st.class?.name || "Class"} {st.section?.name ? `- ${st.section.name}` : ""}
                    </span>
                  </div>
                </Option>
              ))}
            </Select>
          </Form.Item>

          <Form.Item
            name="vehicleId"
            label="Select Bus / Vehicle Route"
            rules={[{ required: true, message: "Please select a bus route" }]}
          >
            <Select
              placeholder="Choose Bus & Route"
              onChange={handleAssignVehicleSelect}
            >
              {vehicles.map((v) => {
                const available = Math.max(0, (v.capacity || 40) - (v.assignedStudentsCount || 0));
                return (
                  <Option key={v._id} value={v._id}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <span>
                        <Tag color="volcano">{v.busNumber}</Tag> <b>{v.routeName}</b>
                      </span>
                      <span style={{ fontSize: 11, color: available > 0 ? "#059669" : "#dc2626" }}>
                        ({available} seats free)
                      </span>
                    </div>
                  </Option>
                );
              })}
            </Select>
          </Form.Item>

          <Row gutter={16}>
            <Col xs={24} sm={12}>
              <Form.Item
                name="pickupPoint"
                label="Pickup / Boarding Stop"
                rules={[{ required: true, message: "Enter or select pickup stop" }]}
              >
                <Input placeholder="e.g. Sector 14 Main Market" prefix={<EnvironmentOutlined style={{ color: "#ef4444" }} />} />
              </Form.Item>
            </Col>
            <Col xs={24} sm={12}>
              <Form.Item
                name="annualFee"
                label="Annual Transport Fee (₹)"
                rules={[{ required: true, message: "Enter annual fee" }]}
              >
                <InputNumber min={0} prefix="₹" style={{ width: "100%" }} placeholder="12000" />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col xs={24} sm={12}>
              <Form.Item name="pickupTime" label="Morning Pickup Time">
                <Input placeholder="07:30 AM" prefix={<ClockCircleOutlined style={{ color: "#1677ff" }} />} />
              </Form.Item>
            </Col>
            <Col xs={24} sm={12}>
              <Form.Item name="dropTime" label="Afternoon Drop Time">
                <Input placeholder="02:30 PM" prefix={<ClockCircleOutlined style={{ color: "#722ed1" }} />} />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item name="updateFeeRecord" valuePropName="checked" style={{ marginBottom: 16 }}>
            <Checkbox defaultChecked>
              Automatically update student fee record with this transport fee
            </Checkbox>
          </Form.Item>

          <div style={{ textAlign: "right", marginTop: 16 }}>
            <Space>
              <Button onClick={() => setAssignModalOpen(false)}>Cancel</Button>
              <Button type="primary" htmlType="submit" loading={submitting}>
                Save Assignment
              </Button>
            </Space>
          </div>
        </Form>
      </Modal>

      {/* ========================================================================= */}
      {/* MODAL 2: ADD / EDIT VEHICLE                                               */}
      {/* ========================================================================= */}
      <Modal
        title={
          <Space>
            <CarOutlined style={{ color: "#059669" }} />
            <span>{editingVehicle ? `Edit Vehicle (${editingVehicle.busNumber})` : "Add New School Bus"}</span>
          </Space>
        }
        open={vehicleModalOpen}
        onCancel={() => setVehicleModalOpen(false)}
        footer={null}
        destroyOnClose
        width={720}
      >
        <Form
          form={vehicleForm}
          layout="vertical"
          onFinish={handleVehicleSubmit}
          style={{ marginTop: 16 }}
        >
          <Row gutter={16}>
            <Col xs={24} sm={8}>
              <Form.Item
                name="busNumber"
                label="Bus Number / ID"
                rules={[{ required: true, message: "Enter bus number" }]}
              >
                <Input placeholder="e.g. BUS-04" style={{ textTransform: "uppercase" }} />
              </Form.Item>
            </Col>
            <Col xs={24} sm={8}>
              <Form.Item name="registrationNumber" label="Registration No">
                <Input placeholder="e.g. DL-1PB-9988" style={{ textTransform: "uppercase" }} />
              </Form.Item>
            </Col>
            <Col xs={24} sm={8}>
              <Form.Item
                name="capacity"
                label="Seating Capacity"
                rules={[{ required: true, message: "Enter capacity" }]}
              >
                <InputNumber min={1} max={100} style={{ width: "100%" }} placeholder="40" />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col xs={24} sm={16}>
              <Form.Item
                name="routeName"
                label="Route Name & Areas"
                rules={[{ required: true, message: "Enter route description" }]}
              >
                <Input placeholder="e.g. Route 4 - Sector 21, 22 to School" />
              </Form.Item>
            </Col>
            <Col xs={24} sm={8}>
              <Form.Item name="annualFee" label="Annual Bus Fee (₹)">
                <InputNumber min={0} prefix="₹" style={{ width: "100%" }} placeholder="12000" />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col xs={24} sm={12}>
              <Form.Item
                name="driverName"
                label="Driver Name"
                rules={[{ required: true, message: "Enter driver name" }]}
              >
                <Input placeholder="Driver Full Name" prefix={<UserOutlined />} />
              </Form.Item>
            </Col>
            <Col xs={24} sm={12}>
              <Form.Item
                name="driverPhone"
                label="Driver Phone"
                rules={[{ required: true, message: "Enter driver phone" }]}
              >
                <Input placeholder="+91 98765 43210" prefix={<PhoneOutlined />} />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col xs={24} sm={12}>
              <Form.Item name="attendantName" label="Helper / Attendant Name">
                <Input placeholder="Attendant Name" />
              </Form.Item>
            </Col>
            <Col xs={24} sm={12}>
              <Form.Item name="attendantPhone" label="Attendant Phone">
                <Input placeholder="+91 98123 45678" />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col xs={24} sm={12}>
              <Form.Item name="pickupTime" label="Morning Pickup Departure">
                <Input placeholder="07:30 AM" />
              </Form.Item>
            </Col>
            <Col xs={24} sm={12}>
              <Form.Item name="dropTime" label="Afternoon Campus Drop Time">
                <Input placeholder="02:30 PM" />
              </Form.Item>
            </Col>
          </Row>

          {/* Stops List */}
          <Divider orientation="left" style={{ margin: "16px 0 12px" }}>
            <span style={{ fontSize: 13, fontWeight: 600 }}>Route Boarding Stops & Timings</span>
          </Divider>

          <div style={{ marginBottom: 16 }}>
            {vehicleStops.map((stop, index) => (
              <Row gutter={8} key={index} style={{ marginBottom: 8 }} align="middle">
                <Col xs={12} sm={10}>
                  <Input
                    placeholder="Stop Name (e.g. Market Gate)"
                    value={stop.stopName}
                    onChange={(e) => handleStopChange(index, "stopName", e.target.value)}
                  />
                </Col>
                <Col xs={6} sm={6}>
                  <Input
                    placeholder="Pickup Time"
                    value={stop.pickupTime}
                    onChange={(e) => handleStopChange(index, "pickupTime", e.target.value)}
                  />
                </Col>
                <Col xs={6} sm={6}>
                  <Input
                    placeholder="Drop Time"
                    value={stop.dropTime}
                    onChange={(e) => handleStopChange(index, "dropTime", e.target.value)}
                  />
                </Col>
                <Col xs={2} sm={2}>
                  <Button
                    type="text"
                    danger
                    icon={<DeleteOutlined />}
                    onClick={() => handleRemoveStop(index)}
                  />
                </Col>
              </Row>
            ))}

            <Button type="dashed" block onClick={handleAddStop} icon={<PlusOutlined />}>
              Add Boarding Stop
            </Button>
          </div>

          <Row gutter={16}>
            <Col xs={24} sm={12}>
              <Form.Item name="status" label="Vehicle Status">
                <Select>
                  <Option value="active">Active Service</Option>
                  <Option value="maintenance">Under Maintenance</Option>
                  <Option value="inactive">Inactive</Option>
                </Select>
              </Form.Item>
            </Col>
            <Col xs={24} sm={12}>
              <Form.Item name="vehicleModel" label="Vehicle Make / Model">
                <Input placeholder="e.g. Tata Starbus 40-Seater" />
              </Form.Item>
            </Col>
          </Row>

          <div style={{ textAlign: "right", marginTop: 16 }}>
            <Space>
              <Button onClick={() => setVehicleModalOpen(false)}>Cancel</Button>
              <Button type="primary" htmlType="submit" loading={submitting}>
                Save Vehicle
              </Button>
            </Space>
          </div>
        </Form>
      </Modal>

      {/* ========================================================================= */}
      {/* DRAWER: PASSENGER ROSTER FOR SELECTED BUS                                  */}
      {/* ========================================================================= */}
      <Drawer
        title={
          <Space>
            <CarOutlined style={{ color: "#fa8c16" }} />
            <span>
              Passenger Roster: <b>{drawerVehicle?.busNumber}</b> ({drawerPassengers.length} Enrolled)
            </span>
          </Space>
        }
        open={passengerDrawerOpen}
        onClose={() => setPassengerDrawerOpen(false)}
        width={580}
      >
        {drawerVehicle && (
          <div>
            <div style={{ padding: "12px 16px", background: "#f8fafc", borderRadius: 8, marginBottom: 16 }}>
              <div style={{ fontWeight: 700, fontSize: 14 }}>{drawerVehicle.routeName}</div>
              <div style={{ fontSize: 12, color: "#64748b", marginTop: 2 }}>
                Driver: <b>{drawerVehicle.driverName}</b> ({drawerVehicle.driverPhone}) • Timing: {drawerVehicle.pickupTime} - {drawerVehicle.dropTime}
              </div>
            </div>

            {drawerPassengers.length === 0 ? (
              <Empty description="No students currently assigned to this bus route." />
            ) : (
              <Table
                dataSource={drawerPassengers}
                rowKey="_id"
                pagination={false}
                size="small"
                columns={[
                  {
                    title: "Student",
                    key: "student",
                    render: (_, r) => (
                      <div>
                        <Text strong>{r.firstName} {r.lastName || ""}</Text>
                        <div style={{ fontSize: 11, color: "#64748b" }}>
                          Adm: {r.admissionNumber} • {r.class?.name || ""}-{r.section?.name || ""}
                        </div>
                      </div>
                    ),
                  },
                  {
                    title: "Boarding Stop",
                    key: "stop",
                    render: (_, r) => (
                      <span style={{ fontSize: 12 }}>
                        {r.transport?.pickupPoint || "Assigned Stop"}
                      </span>
                    ),
                  },
                  {
                    title: "Action",
                    key: "action",
                    align: "right",
                    render: (_, r) => (
                      <Button
                        size="small"
                        danger
                        onClick={() => handleRemoveStudentTransport(r._id)}
                      >
                        Remove
                      </Button>
                    ),
                  },
                ]}
              />
            )}
          </div>
        )}
      </Drawer>
    </div>
  );
}
