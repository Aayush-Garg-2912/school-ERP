"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import dayjs from "dayjs";
import {
  Table,
  Button,
  Card,
  Space,
  Tag,
  Modal,
  Form,
  Input,
  Select,
  DatePicker,
  Row,
  Col,
  message,
  Popconfirm,
  Typography,
  Statistic,
  Radio,
  Drawer,
  Descriptions,
  Avatar,
  Divider,
  Empty,
  Skeleton,
  Tooltip,
  Switch,
  Checkbox,
  Steps,
  InputNumber,
  Alert,
  Badge,
} from "antd";
import {
  UserAddOutlined,
  SearchOutlined,
  ReloadOutlined,
  DeleteOutlined,
  EyeOutlined,
  EditOutlined,
  TeamOutlined,
  BookOutlined,
  UserOutlined,
  CheckCircleOutlined,
  ManOutlined,
  WomanOutlined,
  PhoneOutlined,
  MailOutlined,
  IdcardOutlined,
  CalendarOutlined,
  RiseOutlined,
  DollarCircleOutlined,
  CarOutlined,
  GiftOutlined,
  ArrowRightOutlined,
  CheckOutlined,
  ExclamationCircleOutlined,
  SwapOutlined,
  ClockCircleOutlined,
  EnvironmentOutlined,
  KeyOutlined,
  CopyOutlined,
} from "@ant-design/icons";
import api from "@/lib/api";
import { useAuth } from "@/context/AuthContext";

const { Title, Text, Paragraph } = Typography;
const { Option } = Select;

// Helper to reliably extract guardian/parent name from any schema field
const getGuardianName = (guardian) => {
  if (!guardian) return "N/A";
  const name =
    guardian.guardianName ||
    guardian.name ||
    guardian.fatherName ||
    guardian.motherName ||
    "";
  return name.trim() || "N/A";
};

export default function StudentsPage() {
  const { user } = useAuth();
  const canManage = ["chairman", "principal", "admin"].includes(user?.role);

  const [students, setStudents] = useState([]);
  const [totalSchoolStudents, setTotalSchoolStudents] = useState(0);
  const [classCountsMap, setClassCountsMap] = useState({});
  const [sectionCountsMap, setSectionCountsMap] = useState({});

  const [classes, setClasses] = useState([]);
  const [sections, setSections] = useState([]); // for admission modal
  const [academicYears, setAcademicYears] = useState([]);

  // Viewing filters
  const [viewClass, setViewClass] = useState(null); // 'all' or classId
  const [viewSection, setViewSection] = useState("all"); // 'all' or sectionId
  const [viewSections, setViewSections] = useState([]); // sections for viewClass

  const [loading, setLoading] = useState(false);
  const [depsLoading, setDepsLoading] = useState(true);
  const [searchText, setSearchText] = useState("");

  // Student details drawer
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState(null);

  // Admission Modal
  const [modalOpen, setModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [modalClassSelected, setModalClassSelected] = useState(null);
  const [form] = Form.useForm();
  const [credentialsModalOpen, setCredentialsModalOpen] = useState(false);
  const [createdCredentials, setCreatedCredentials] = useState(null);

  // Edit Student Modal
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editingStudent, setEditingStudent] = useState(null);
  const [editSubmitting, setEditSubmitting] = useState(false);
  const [editForm] = Form.useForm();

  // Student details drawer fee status
  const [selectedStudentFee, setSelectedStudentFee] = useState(null);
  const [loadingStudentFee, setLoadingStudentFee] = useState(false);

  // Fee setup in Admission Modal
  const [enableAdmissionFee, setEnableAdmissionFee] = useState(true);
  const [classFeeStructures, setClassFeeStructures] = useState([]);
  const [admAnnualCharges, setAdmAnnualCharges] = useState(5000);
  const [admMonthlyTuition, setAdmMonthlyTuition] = useState(1500);
  const [admTuitionMonths, setAdmTuitionMonths] = useState(12);
  const [admTransportOpted, setAdmTransportOpted] = useState(false);
  const [admTransportAmount, setAdmTransportAmount] = useState(0);
  const [admTransportRoute, setAdmTransportRoute] = useState("");
  const [admExtraAmount, setAdmExtraAmount] = useState(0);
  const [admExtraRemarks, setAdmExtraRemarks] = useState("");
  const [admOfferType, setAdmOfferType] = useState("none");
  const [admOfferPct, setAdmOfferPct] = useState(0);
  const [admOfferFlat, setAdmOfferFlat] = useState(0);

  // Transport allocation states
  const [transportVehicles, setTransportVehicles] = useState([]);
  const [admTransportVehicleId, setAdmTransportVehicleId] = useState(null);
  const [admTransportBusNumber, setAdmTransportBusNumber] = useState("");
  const [admTransportPickupPoint, setAdmTransportPickupPoint] = useState("");
  const [admTransportPickupTime, setAdmTransportPickupTime] = useState("");
  const [admTransportDropTime, setAdmTransportDropTime] = useState("");
  const [admTransportDriverName, setAdmTransportDriverName] = useState("");
  const [admTransportDriverPhone, setAdmTransportDriverPhone] = useState("");

  // Quick transport assignment modal (from student table & student profile drawer)
  const [quickTransportModalOpen, setQuickTransportModalOpen] = useState(false);
  const [quickTransportStudent, setQuickTransportStudent] = useState(null);
  const [quickTransportForm] = Form.useForm();
  const [quickTransportSubmitting, setQuickTransportSubmitting] = useState(false);

  // Student Promotion Wizard
  const [promoteModalOpen, setPromoteModalOpen] = useState(false);
  const [promoteSubmitting, setPromoteSubmitting] = useState(false);
  const [promoteStep, setPromoteStep] = useState(0);
  const [promoteForm] = Form.useForm();
  const [promoteSourceYear, setPromoteSourceYear] = useState(null);
  const [promoteSourceClass, setPromoteSourceClass] = useState(null);
  const [promoteSourceStudents, setPromoteSourceStudents] = useState([]);
  const [promoteSelectedStudentIds, setPromoteSelectedStudentIds] = useState([]);
  const [promoteTargetYear, setPromoteTargetYear] = useState(null);
  const [promoteTargetClass, setPromoteTargetClass] = useState(null);
  const [promoteTargetSections, setPromoteTargetSections] = useState([]);
  const [promoteTargetFeeStructures, setPromoteTargetFeeStructures] = useState([]);
  const [promoteLoadingStudents, setPromoteLoadingStudents] = useState(false);

  // Real-time calculation of admission fee
  const admissionFeeSummary = useMemo(() => {
    if (!enableAdmissionFee) return { gross: 0, discount: 0, net: 0, offerLabel: "None" };
    const annual = Number(admAnnualCharges || 0);
    const tuition = Number(admMonthlyTuition || 0) * Number(admTuitionMonths || 12);
    const transport = admTransportOpted ? Number(admTransportAmount || 0) : 0;
    const extra = Number(admExtraAmount || 0);
    const gross = annual + tuition + transport + extra;

    let discount = 0;
    let offerLabel = "None";

    if (admOfferType === "sibling") {
      discount = Math.round((gross * 10) / 100);
      offerLabel = "Sibling Concession (10%)";
    } else if (admOfferType === "merit") {
      discount = Math.round((gross * 20) / 100);
      offerLabel = "Merit / Scholarship (20%)";
    } else if (admOfferType === "staff") {
      discount = Math.round((gross * 50) / 100);
      offerLabel = "Staff Ward Concession (50%)";
    } else if (admOfferType === "girl") {
      discount = Math.round((gross * 15) / 100);
      offerLabel = "Girl Child Concession (15%)";
    } else if (admOfferType === "mgmt") {
      discount = Math.round((gross * 25) / 100);
      offerLabel = "Special Management Offer (25%)";
    } else if (admOfferType === "custom_pct") {
      discount = Math.round((gross * Number(admOfferPct || 0)) / 100);
      offerLabel = `Custom Discount (${admOfferPct}%)`;
    } else if (admOfferType === "custom_flat") {
      discount = Math.min(gross, Number(admOfferFlat || 0));
      offerLabel = `Flat Discount (₹${admOfferFlat})`;
    }

    const net = Math.max(0, gross - discount);
    return { annual, tuition, transport, extra, gross, discount, net, offerLabel };
  }, [
    enableAdmissionFee,
    admAnnualCharges,
    admMonthlyTuition,
    admTuitionMonths,
    admTransportOpted,
    admTransportAmount,
    admExtraAmount,
    admOfferType,
    admOfferPct,
    admOfferFlat,
  ]);

  // 1. Fetch initial dependencies (Academic years, Classes)
  const fetchDependencies = async () => {
    try {
      setDepsLoading(true);
      const [yearRes, classRes] = await Promise.all([
        api.get("/academic-years"),
        api.get("/classes"),
      ]);

      if (yearRes.data.success) {
        setAcademicYears(yearRes.data.data.academicYears || []);
      }

      if (classRes.data.success) {
        const loadedClasses = classRes.data.data.classes || [];
        setClasses(loadedClasses);

        // Default view to the first class if available so we never dump 1,000+ all at once
        if (loadedClasses.length > 0 && !viewClass) {
          const firstClassId = loadedClasses[0]._id;
          setViewClass(firstClassId);
          loadViewSections(firstClassId);
          fetchStudentsList(firstClassId, "all");
        } else {
          fetchStudentsList("all", "all");
        }
      }
    } catch (err) {
      console.error("Failed to fetch dependencies:", err);
      message.error("Failed to load classes or sessions");
    } finally {
      setDepsLoading(false);
    }
  };

  // 2. Load sections for the currently selected view class
  const loadViewSections = async (classId) => {
    if (!classId || classId === "all") {
      setViewSections([]);
      return;
    }
    try {
      const { data } = await api.get(`/sections?classId=${classId}`);
      if (data.success) {
        setViewSections(data.data.sections || []);
      }
    } catch (err) {
      console.error("Failed to load view sections:", err);
    }
  };

  // 3. Fetch students filtered by class and section
  const fetchStudentsList = async (targetClassId, targetSectionId) => {
    setLoading(true);
    try {
      const params = {};
      if (targetClassId && targetClassId !== "all") {
        params.classId = targetClassId;
      }
      if (targetSectionId && targetSectionId !== "all") {
        params.sectionId = targetSectionId;
      }

      const { data } = await api.get("/students", { params });
      if (data.success) {
        const studentList = data.data.students || [];
        setStudents(studentList);

        if (typeof data.data.totalSchoolStudents === "number") {
          setTotalSchoolStudents(data.data.totalSchoolStudents);
        } else if (!totalSchoolStudents) {
          setTotalSchoolStudents(studentList.length);
        }

        // Map class counts
        if (Array.isArray(data.data.classCounts)) {
          const cMap = {};
          data.data.classCounts.forEach((c) => {
            cMap[c._id] = c.count;
          });
          setClassCountsMap(cMap);
        }

        // Map section counts
        if (Array.isArray(data.data.sectionCounts)) {
          const sMap = {};
          data.data.sectionCounts.forEach((s) => {
            sMap[s._id] = s.count;
          });
          setSectionCountsMap(sMap);
        }
      }
    } catch (err) {
      message.error(err.response?.data?.message || "Failed to load students");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDependencies();
  }, []);

  // Handle class selection change in view
  const handleViewClassChange = (classId) => {
    setViewClass(classId);
    setViewSection("all");
    loadViewSections(classId);
    fetchStudentsList(classId, "all");
  };

  // Handle section selection change in view
  const handleViewSectionChange = (sectionId) => {
    setViewSection(sectionId);
    fetchStudentsList(viewClass, sectionId);
  };

  // Fetch next roll number for class and section
  const fetchNextRollNumber = async (classId, sectionId) => {
    const cId = classId || form.getFieldValue("classId") || modalClassSelected;
    const sId = sectionId || form.getFieldValue("sectionId");
    const academicYear = form.getFieldValue("academicYear");
    if (!cId || !sId) return;
    try {
      const { data } = await api.get(
        `/students/next-roll-number?classId=${cId}&sectionId=${sId}${
          academicYear ? `&academicYear=${academicYear}` : ""
        }`
      );
      if (data.success && data.data?.nextRollNumber) {
        form.setFieldsValue({ rollNumber: data.data.nextRollNumber });
      }
    } catch (err) {
      console.warn("Could not fetch next roll number:", err);
    }
  };

  // For Admission Modal Class selection
  const handleModalClassChange = async (classId) => {
    setModalClassSelected(classId);
    form.setFieldsValue({ sectionId: undefined, feeStructureId: undefined, rollNumber: undefined });
    if (!classId) {
      setSections([]);
      setClassFeeStructures([]);
      return;
    }
    try {
      const [secRes, feeRes] = await Promise.all([
        api.get(`/sections?classId=${classId}`),
        api.get(`/fee-structures?classId=${classId}`),
      ]);
      if (secRes.data.success) {
        const loadedSections = secRes.data.data.sections || [];
        setSections(loadedSections);
        if (loadedSections.length > 0) {
          const firstSection = loadedSections[0]._id;
          form.setFieldsValue({ sectionId: firstSection });
          fetchNextRollNumber(classId, firstSection);
        }
      }
      if (feeRes.data.success) {
        const structs = feeRes.data.data.feeStructures || [];
        setClassFeeStructures(structs);
        if (structs.length > 0) {
          form.setFieldsValue({ feeStructureId: structs[0]._id });
        }
      }
    } catch (err) {
      console.error("Failed to load sections/fee structures for modal:", err);
    }
  };

  const handleModalSectionChange = (sectionId) => {
    form.setFieldsValue({ sectionId });
    const classId = form.getFieldValue("classId") || modalClassSelected;
    if (classId && sectionId) {
      fetchNextRollNumber(classId, sectionId);
    }
  };

  // Fetch next admission number
  const fetchNextAdmissionNumber = async () => {
    try {
      const { data } = await api.get("/students/next-admission-number");
      if (data.success && data.data?.nextAdmissionNumber) {
        form.setFieldsValue({ admissionNumber: data.data.nextAdmissionNumber });
      }
    } catch (err) {
      console.warn("Could not fetch next admission number:", err);
    }
  };

  // Load vehicles for transport selection
  const loadTransportVehicles = async () => {
    try {
      const { data } = await api.get("/transport/vehicles");
      if (data.success) {
        setTransportVehicles(data.data.vehicles || []);
      }
    } catch (err) {
      console.warn("Could not load transport vehicles", err);
    }
  };

  const handleSelectAdmissionVehicle = (vehicleId) => {
    setAdmTransportVehicleId(vehicleId);
    const veh = transportVehicles.find((v) => v._id === vehicleId);
    if (veh) {
      setAdmTransportBusNumber(veh.busNumber);
      setAdmTransportRoute(veh.routeName);
      setAdmTransportAmount(veh.annualFee || 12000);
      setAdmTransportPickupPoint(veh.stops?.[0]?.stopName || veh.routeName);
      setAdmTransportPickupTime(veh.pickupTime || "07:30 AM");
      setAdmTransportDropTime(veh.dropTime || "02:30 PM");
      setAdmTransportDriverName(veh.driverName || "");
      setAdmTransportDriverPhone(veh.driverPhone || "");
    }
  };

  // Open quick assign transport modal from table or drawer
  const handleOpenQuickTransport = (student) => {
    setQuickTransportStudent(student);
    quickTransportForm.resetFields();
    loadTransportVehicles();

    const currVehId =
      student.transport?.vehicle?._id ||
      student.transport?.vehicle ||
      undefined;

    quickTransportForm.setFieldsValue({
      vehicleId: currVehId,
      pickupPoint: student.transport?.pickupPoint || "",
      pickupTime: student.transport?.pickupTime || "",
      dropTime: student.transport?.dropTime || "",
      annualFee: student.transport?.annualFee || 12000,
      updateFeeRecord: true,
    });

    setQuickTransportModalOpen(true);
  };

  const handleQuickTransportVehicleSelect = (vehicleId) => {
    const veh = transportVehicles.find((v) => v._id === vehicleId);
    if (veh) {
      quickTransportForm.setFieldsValue({
        pickupPoint: veh.stops?.[0]?.stopName || veh.routeName,
        pickupTime: veh.pickupTime || "07:30 AM",
        dropTime: veh.dropTime || "02:30 PM",
        annualFee: veh.annualFee || 12000,
      });
    }
  };

  const handleQuickTransportSubmit = async (values) => {
    if (!quickTransportStudent) return;
    setQuickTransportSubmitting(true);
    try {
      const payload = {
        studentId: quickTransportStudent._id,
        vehicleId: values.vehicleId,
        pickupPoint: values.pickupPoint,
        pickupTime: values.pickupTime,
        dropTime: values.dropTime,
        annualFee: Number(values.annualFee || 0),
        updateFeeRecord: Boolean(values.updateFeeRecord),
      };

      const { data } = await api.post("/transport/assign", payload);
      if (data.success) {
        message.success(data.message || "Transport assigned successfully!");
        setQuickTransportModalOpen(false);
        fetchStudentsList(viewClass, viewSection);

        // If currently viewing in drawer, refresh drawer student info
        if (selectedStudent && selectedStudent._id === quickTransportStudent._id) {
          handleViewStudent(data.data.student);
        }
      }
    } catch (err) {
      message.error(err.response?.data?.message || "Failed to update transport allocation");
    } finally {
      setQuickTransportSubmitting(false);
    }
  };

  // Handle student admission creation
  const handleCreateStudent = async (values) => {
    setSubmitting(true);
    try {
      const payload = {
        admissionNumber: values.admissionNumber,
        firstName: values.firstName,
        lastName: values.lastName,
        gender: values.gender,
        dateOfBirth: values.dateOfBirth?.format("YYYY-MM-DD"),
        email: values.email || undefined,
        phone: values.phone || undefined,
        bloodGroup: values.bloodGroup,
        academicYear: values.academicYear,
        classId: values.classId,
        sectionId: values.sectionId,
        rollNumber: Number(values.rollNumber),
        guardian: {
          name: values.guardianName,
          guardianName: values.guardianName,
          fatherName: values.guardianName,
          phone: values.guardianPhone || undefined,
          email: values.guardianEmail || undefined,
          relation: values.guardianRelation || "guardian",
        },
      };

      if (enableAdmissionFee) {
        let offerObj = { name: "", type: "none", value: 0 };
        if (admOfferType === "sibling") {
          offerObj = { name: "Sibling Concession (10%)", type: "percentage", value: 10 };
        } else if (admOfferType === "merit") {
          offerObj = { name: "Merit / Scholarship (20%)", type: "percentage", value: 20 };
        } else if (admOfferType === "staff") {
          offerObj = { name: "Staff Ward Concession (50%)", type: "percentage", value: 50 };
        } else if (admOfferType === "girl") {
          offerObj = { name: "Girl Child Concession (15%)", type: "percentage", value: 15 };
        } else if (admOfferType === "mgmt") {
          offerObj = { name: "Management Special Offer (25%)", type: "percentage", value: 25 };
        } else if (admOfferType === "custom_pct") {
          offerObj = { name: "Custom Concession", type: "percentage", value: Number(admOfferPct || 0) };
        } else if (admOfferType === "custom_flat") {
          offerObj = { name: "Flat Scholarship / Discount", type: "flat", value: Number(admOfferFlat || 0) };
        }

        if (admTransportOpted) {
          payload.transport = {
            opted: true,
            vehicle: admTransportVehicleId || null,
            busNumber: admTransportBusNumber || "",
            routeName: admTransportRoute || "",
            pickupPoint: admTransportPickupPoint || admTransportRoute || "",
            pickupTime: admTransportPickupTime || "07:30 AM",
            dropTime: admTransportDropTime || "02:30 PM",
            driverName: admTransportDriverName || "",
            driverPhone: admTransportDriverPhone || "",
            annualFee: Number(admTransportAmount || 0),
          };
        }

        payload.fee = {
          feeStructureId: values.feeStructureId || undefined,
          annualCharges: Number(admAnnualCharges || 0),
          monthlyTuition: Number(admMonthlyTuition || 0),
          tuitionMonths: Number(admTuitionMonths || 12),
          transportFee: admTransportOpted ? Number(admTransportAmount || 0) : 0,
          transportDetails: {
            opted: Boolean(admTransportOpted),
            vehicle: admTransportVehicleId || null,
            busNumber: admTransportBusNumber || "",
            route: admTransportRoute || "",
            pickupPoint: admTransportPickupPoint || admTransportRoute || "",
            pickupTime: admTransportPickupTime || "07:30 AM",
            dropTime: admTransportDropTime || "02:30 PM",
            driverName: admTransportDriverName || "",
            driverPhone: admTransportDriverPhone || "",
          },
          extraFees: Number(admExtraAmount || 0),
          offer: offerObj,
          discount: Number(admissionFeeSummary.discount || 0),
          totalAmount: Number(admissionFeeSummary.gross || 0),
          payableAmount: Number(admissionFeeSummary.net || 0),
          remarks: values.feeRemarks || "Configured during admission",
        };
      }

      const { data } = await api.post("/students", payload);
      if (data.success) {
        message.success(
          data.data.studentFee
            ? "Student admitted & fee structure configured successfully!"
            : "Student admitted successfully!"
        );
        if (data.data?.studentCredentials || data.data?.parentCredentials) {
          setCreatedCredentials({
            student: data.data.studentCredentials,
            parent: data.data.parentCredentials,
          });
          setCredentialsModalOpen(true);
        }
        setModalOpen(false);
        form.resetFields();
        fetchStudentsList(viewClass, viewSection);
      }
    } catch (err) {
      message.error(err.response?.data?.message || "Failed to admit student");
    } finally {
      setSubmitting(false);
    }
  };

  // Open Edit Student Modal
  const handleOpenEdit = (student) => {
    setEditingStudent(student);
    const gName = getGuardianName(student.guardian);
    editForm.setFieldsValue({
      firstName: student.firstName,
      lastName: student.lastName,
      gender: student.gender,
      dateOfBirth: student.dateOfBirth ? dayjs(student.dateOfBirth) : null,
      phone: student.phone,
      email: student.email,
      bloodGroup: student.bloodGroup,
      guardianName: gName !== "N/A" ? gName : "",
      guardianPhone: student.guardian?.phone || "",
      guardianRelation: student.guardian?.relation || "guardian",
    });
    setEditModalOpen(true);
  };

  // Handle Edit Student submit
  const handleUpdateStudent = async (values) => {
    if (!editingStudent) return;
    setEditSubmitting(true);
    try {
      const payload = {
        firstName: values.firstName,
        lastName: values.lastName,
        gender: values.gender,
        dateOfBirth: values.dateOfBirth ? values.dateOfBirth.format("YYYY-MM-DD") : undefined,
        phone: values.phone,
        email: values.email,
        bloodGroup: values.bloodGroup,
        guardian: {
          name: values.guardianName,
          guardianName: values.guardianName,
          fatherName: values.guardianName,
          phone: values.guardianPhone,
          relation: values.guardianRelation || "guardian",
        },
      };

      const { data } = await api.put(`/students/${editingStudent._id}`, payload);
      if (data.success) {
        message.success("Student updated successfully!");
        setEditModalOpen(false);
        editForm.resetFields();
        fetchStudentsList(viewClass, viewSection);
        if (selectedStudent && selectedStudent._id === editingStudent._id) {
          setSelectedStudent(data.data.student);
        }
      }
    } catch (err) {
      message.error(err.response?.data?.message || "Failed to update student");
    } finally {
      setEditSubmitting(false);
    }
  };

  // Handle delete student
  const handleDelete = async (id) => {
    try {
      await api.delete(`/students/${id}`);
      message.success("Student removed successfully");
      fetchStudentsList(viewClass, viewSection);
    } catch (err) {
      message.error(err.response?.data?.message || "Failed to delete student");
    }
  };

  // Open modal with pre-filled class/section if currently viewing
  const handleOpenAdmitModal = () => {
    form.resetFields();
    setEnableAdmissionFee(true);
    setAdmAnnualCharges(5000);
    setAdmMonthlyTuition(1500);
    setAdmTuitionMonths(12);
    setAdmTransportOpted(false);
    setAdmTransportAmount(0);
    setAdmTransportRoute("");
    setAdmTransportVehicleId(null);
    setAdmTransportBusNumber("");
    setAdmTransportPickupPoint("");
    setAdmTransportPickupTime("");
    setAdmTransportDropTime("");
    setAdmTransportDriverName("");
    setAdmTransportDriverPhone("");
    loadTransportVehicles();
    setAdmExtraAmount(0);
    setAdmExtraRemarks("");
    setAdmOfferType("none");
    setAdmOfferPct(0);
    setAdmOfferFlat(0);

    const curYear = academicYears.find((y) => y.isCurrent) || academicYears[0];
    if (curYear) {
      form.setFieldsValue({ academicYear: curYear._id });
    }

    if (viewClass && viewClass !== "all") {
      form.setFieldsValue({ classId: viewClass });
      handleModalClassChange(viewClass);
      if (viewSection && viewSection !== "all") {
        form.setFieldsValue({ sectionId: viewSection });
        fetchNextRollNumber(viewClass, viewSection);
      }
    }
    setModalOpen(true);
    fetchNextAdmissionNumber();
  };

  // View Student Details Drawer (also loads live fee status)
  const handleViewStudent = async (student) => {
    setSelectedStudent(student);
    setSelectedStudentFee(null);
    setDrawerOpen(true);
    try {
      setLoadingStudentFee(true);
      const { data } = await api.get(`/students/${student._id}`);
      if (data.success) {
        if (data.data.student) {
          setSelectedStudent(data.data.student);
        }
        if (data.data.studentFee) {
          setSelectedStudentFee(data.data.studentFee);
        }
      }
    } catch (e) {
      console.warn("Could not load student fee record:", e);
    } finally {
      setLoadingStudentFee(false);
    }
  };

  // Open Student Promotion Modal
  const handleOpenPromoteModal = () => {
    const curYear = academicYears.find((y) => y.isCurrent) || academicYears[0];
    const srcYear = curYear?._id || null;
    const srcClass = viewClass && viewClass !== "all" ? viewClass : (classes[0]?._id || null);

    setPromoteSourceYear(srcYear);
    setPromoteSourceClass(srcClass);
    setPromoteStep(0);
    setPromoteSelectedStudentIds([]);
    promoteForm.resetFields();

    promoteForm.setFieldsValue({
      sourceYear: srcYear,
      sourceClass: srcClass,
      carryOverConcession: true,
      carryOverTransport: true,
      enablePromotionFee: true,
      promoteTuitionMonths: 12,
      promoteAnnualCharges: 5000,
      promoteMonthlyTuition: 1500,
    });

    if (srcClass) {
      loadPromotionSourceStudents(srcYear, srcClass);
    }

    setPromoteModalOpen(true);
  };

  const loadPromotionSourceStudents = async (yearId, classId) => {
    if (!classId) return;
    setPromoteLoadingStudents(true);
    try {
      let query = `classId=${classId}&status=active`;
      if (yearId) query += `&academicYear=${yearId}`;
      const { data } = await api.get(`/students?${query}`);
      if (data.success) {
        const studentList = data.data.students || [];
        setPromoteSourceStudents(studentList);
        setPromoteSelectedStudentIds(studentList.map((s) => s._id));
      }
    } catch (e) {
      message.error("Failed to load students for promotion");
    } finally {
      setPromoteLoadingStudents(false);
    }
  };

  const handlePromoteSourceClassChange = (classId) => {
    setPromoteSourceClass(classId);
    setPromoteSelectedStudentIds([]);
    loadPromotionSourceStudents(promoteSourceYear, classId);
  };

  const handlePromoteTargetClassChange = async (targetClassId) => {
    setPromoteTargetClass(targetClassId);
    promoteForm.setFieldsValue({ targetSectionId: undefined, targetFeeStructureId: undefined });
    if (!targetClassId) {
      setPromoteTargetSections([]);
      setPromoteTargetFeeStructures([]);
      return;
    }
    try {
      const [secRes, feeRes] = await Promise.all([
        api.get(`/sections?classId=${targetClassId}`),
        api.get(`/fee-structures?classId=${targetClassId}`),
      ]);
      if (secRes.data.success) {
        setPromoteTargetSections(secRes.data.data.sections || []);
      }
      if (feeRes.data.success) {
        const loadedStructs = feeRes.data.data.feeStructures || [];
        setPromoteTargetFeeStructures(loadedStructs);
        if (loadedStructs.length > 0) {
          promoteForm.setFieldsValue({ targetFeeStructureId: loadedStructs[0]._id });
        }
      }
    } catch (e) {
      console.error("Failed to load target class details:", e);
    }
  };

  const handleExecutePromotion = async (values) => {
    if (promoteSelectedStudentIds.length === 0) {
      message.warning("Please select at least one student to promote");
      return;
    }
    setPromoteSubmitting(true);
    try {
      let offerObj = null;
      if (values.promoteOfferType && values.promoteOfferType !== "none") {
        offerObj = {
          name: values.promoteOfferName || "Promotion Concession",
          type: values.promoteOfferType === "percentage" ? "percentage" : "flat",
          value: Number(values.promoteOfferValue || 0),
        };
      }

      const payload = {
        fromAcademicYear: promoteSourceYear,
        toAcademicYear: values.targetYear,
        fromClassId: promoteSourceClass,
        toClassId: values.targetClassId,
        toSectionId: values.targetSectionId,
        studentIds: promoteSelectedStudentIds,
        promotionType: values.promotionType || "promote",
        feeConfig: values.enablePromotionFee ? {
          feeStructureId: values.targetFeeStructureId || undefined,
          annualCharges: Number(values.promoteAnnualCharges || 0),
          monthlyTuition: Number(values.promoteMonthlyTuition || 0),
          tuitionMonths: Number(values.promoteTuitionMonths || 12),
          transportFee: Number(values.promoteTransportFee || 0),
          carryOverTransport: Boolean(values.carryOverTransport),
          extraFees: Number(values.promoteExtraFees || 0),
          carryOverConcession: Boolean(values.carryOverConcession),
          offer: offerObj,
        } : null,
      };

      const { data } = await api.post("/students/promote", payload);
      if (data.success) {
        message.success(data.message || "Students promoted successfully!");
        setPromoteModalOpen(false);
        promoteForm.resetFields();
        fetchStudentsList(viewClass, viewSection);
      }
    } catch (err) {
      message.error(err.response?.data?.message || "Failed to promote students");
    } finally {
      setPromoteSubmitting(false);
    }
  };

  // Current selected class object
  const selectedClassObj = useMemo(() => {
    return classes.find((c) => c._id === viewClass) || null;
  }, [classes, viewClass]);

  // Current selected section object
  const selectedSectionObj = useMemo(() => {
    return viewSections.find((s) => s._id === viewSection) || null;
  }, [viewSections, viewSection]);

  // Client-side text filter (by name, admission no, roll no, guardian)
  const filteredStudents = useMemo(() => {
    const q = searchText.trim().toLowerCase();
    if (!q) return students;
    return students.filter((s) => {
      const fullName = `${s.firstName || ""} ${s.lastName || ""}`.toLowerCase();
      const adm = (s.admissionNumber || "").toLowerCase();
      const roll = String(s.rollNumber || "");
      const phone = (s.phone || s.guardian?.phone || "").toLowerCase();
      const guardian = getGuardianName(s.guardian).toLowerCase();
      return (
        fullName.includes(q) ||
        adm.includes(q) ||
        roll.includes(q) ||
        phone.includes(q) ||
        guardian.includes(q)
      );
    });
  }, [students, searchText]);

  // Calculated stats for currently viewed students
  const stats = useMemo(() => {
    const totalInView = filteredStudents.length;
    let male = 0;
    let female = 0;
    let active = 0;

    filteredStudents.forEach((s) => {
      if (s.gender === "male") male++;
      else if (s.gender === "female") female++;

      if (s.status === "active" || !s.status) active++;
    });

    return {
      totalInView,
      male,
      female,
      active,
      inactive: totalInView - active,
    };
  }, [filteredStudents]);

  // Total students in this class across all its sections
  const currentClassTotalCount = useMemo(() => {
    if (!viewClass || viewClass === "all") return totalSchoolStudents;
    return classCountsMap[viewClass] ?? students.length;
  }, [viewClass, classCountsMap, totalSchoolStudents, students]);

  // Table Columns
  const columns = [
    {
      title: "Roll No",
      dataIndex: "rollNumber",
      key: "rollNumber",
      width: 90,
      render: (roll) => (
        <span
          style={{
            display: "inline-block",
            padding: "2px 10px",
            background: "#eff6ff",
            color: "#1d4ed8",
            fontWeight: 700,
            borderRadius: 12,
            border: "1px solid #bfdbfe",
            fontSize: 13,
          }}
        >
          #{roll ?? "-"}
        </span>
      ),
      sorter: (a, b) => (a.rollNumber || 0) - (b.rollNumber || 0),
    },
    {
      title: "Admission No",
      dataIndex: "admissionNumber",
      key: "admissionNumber",
      width: 140,
      render: (text) => (
        <Text strong style={{ color: "#0958d9", fontFamily: "monospace" }}>
          {text}
        </Text>
      ),
    },
    {
      title: "Student Name",
      key: "name",
      render: (_, r) => (
        <Space>
          <Avatar
            style={{
              backgroundColor: r.gender === "female" ? "#eb2f96" : "#1677ff",
              verticalAlign: "middle",
            }}
          >
            {(r.firstName?.[0] || "S").toUpperCase()}
          </Avatar>
          <div>
            <Text strong style={{ display: "block" }}>
              {r.firstName} {r.lastName || ""}
            </Text>
            <Text type="secondary" style={{ fontSize: 12 }}>
              {r.user?.username ? `@${r.user.username}` : (r.user?.email || r.email || r.phone || "No login ID")}
            </Text>
          </div>
        </Space>
      ),
      sorter: (a, b) => (a.firstName || "").localeCompare(b.firstName || ""),
    },
    {
      title: "Class & Section",
      key: "classSection",
      width: 160,
      render: (_, r) => (
        <Tag color="geekblue" style={{ borderRadius: 6, fontWeight: 500, padding: "2px 8px" }}>
          {r.class?.name || "N/A"} - {r.section?.name || "N/A"}
        </Tag>
      ),
    },
    {
      title: "Gender",
      dataIndex: "gender",
      key: "gender",
      width: 100,
      render: (g) => {
        const isMale = g === "male";
        return (
          <Tag
            color={isMale ? "blue" : "magenta"}
            icon={isMale ? <ManOutlined /> : <WomanOutlined />}
            style={{ textTransform: "capitalize", borderRadius: 4 }}
          >
            {g || "N/A"}
          </Tag>
        );
      },
    },
    {
      title: "Guardian & Phone",
      key: "guardian",
      render: (_, r) => {
        const guardianName = getGuardianName(r.guardian);
        const guardianPhone = r.guardian?.phone || r.phone || "N/A";
        return (
          <div>
            <Text strong style={{ fontSize: 13, display: "block" }}>
              {guardianName}
            </Text>
            <Text type="secondary" style={{ fontSize: 12 }}>
              <PhoneOutlined style={{ marginRight: 4, color: "#9ca3af" }} />
              {guardianPhone}
            </Text>
          </div>
        );
      },
    },
    {
      title: "Bus / Transport",
      key: "transport",
      width: 140,
      render: (_, r) => {
        const isOpted = Boolean(r.transport?.opted);
        const busNo = r.transport?.busNumber;
        if (isOpted && busNo) {
          return (
            <Tooltip
              title={`${r.transport?.routeName || "School Bus"} • Stop: ${r.transport?.pickupPoint || "Assigned Stop"}`}
            >
              <Tag
                color="volcano"
                icon={<CarOutlined />}
                style={{ fontWeight: 700, cursor: "pointer" }}
                onClick={() => handleOpenQuickTransport(r)}
              >
                {busNo}
              </Tag>
            </Tooltip>
          );
        }
        return (
          <Tooltip title="Click to assign bus">
            <Tag
              style={{ cursor: "pointer", color: "#64748b" }}
              onClick={() => handleOpenQuickTransport(r)}
            >
              + Assign Bus
            </Tag>
          </Tooltip>
        );
      },
    },
    {
      title: "Status",
      dataIndex: "status",
      key: "status",
      width: 100,
      render: (st) => (
        <Tag color={st === "inactive" ? "volcano" : "green"} style={{ borderRadius: 4 }}>
          {(st || "active").toUpperCase()}
        </Tag>
      ),
    },
    {
      title: "Actions",
      key: "actions",
      width: 120,
      align: "center",
      render: (_, r) => (
        <Space size="small">
          <Tooltip title="View Student Profile">
            <Button
              type="text"
              icon={<EyeOutlined style={{ color: "#1677ff" }} />}
              size="small"
              onClick={() => handleViewStudent(r)}
            />
          </Tooltip>
          {canManage && (
            <>
              <Tooltip title="Assign / Change School Bus">
                <Button
                  type="text"
                  icon={<CarOutlined style={{ color: "#fa8c16" }} />}
                  size="small"
                  onClick={() => handleOpenQuickTransport(r)}
                />
              </Tooltip>
              <Tooltip title="Edit Student">
                <Button
                  type="text"
                  icon={<EditOutlined style={{ color: "#faad14" }} />}
                  size="small"
                  onClick={() => handleOpenEdit(r)}
                />
              </Tooltip>
              <Tooltip title="Delete Student">
                <Popconfirm
                  title="Delete student"
                  description="Are you sure you want to delete this student and their login account?"
                  onConfirm={() => handleDelete(r._id)}
                  okText="Yes, Delete"
                  cancelText="Cancel"
                  okButtonProps={{ danger: true }}
                >
                  <Button type="text" danger icon={<DeleteOutlined />} size="small" />
                </Popconfirm>
              </Tooltip>
            </>
          )}
        </Space>
      ),
    },
  ];

  return (
    <div style={{ paddingBottom: 24 }}>
      {/* 1. Header Title & Top Actions */}
      <div style={{ marginBottom: 20 }}>
        <Row justify="space-between" align="middle" gutter={[16, 16]}>
          <Col>
            <Title level={3} style={{ margin: 0, fontWeight: 700 }}>
              Student Directory & Class Roll
            </Title>
            <Text type="secondary" style={{ fontSize: 14 }}>
              View and manage students organized by class and section, monitor class strength, and handle admissions.
            </Text>
          </Col>
          <Col>
            <Space wrap>
              <Button
                icon={<ReloadOutlined />}
                onClick={() => fetchStudentsList(viewClass, viewSection)}
                loading={loading}
              >
                Refresh
              </Button>
              {canManage && (
                <>
                  <Button
                    icon={<RiseOutlined />}
                    onClick={handleOpenPromoteModal}
                    style={{ borderColor: "#10b981", color: "#047857", fontWeight: 600 }}
                  >
                    Promote Students
                  </Button>
                  <Button
                    type="primary"
                    icon={<UserAddOutlined />}
                    onClick={handleOpenAdmitModal}
                    style={{ background: "#1677ff" }}
                  >
                    Admit Student
                  </Button>
                </>
              )}
            </Space>
          </Col>
        </Row>
      </div>

      {/* 2. Top Summary Metric Cards */}
      <Row gutter={[16, 16]} style={{ marginBottom: 20 }}>
        {/* Card 1: Total in Entire School */}
        <Col xs={24} sm={12} lg={6} style={{ display: "flex" }}>
          <Card
            hoverable
            style={{
              width: "100%",
              borderRadius: 12,
              borderLeft: "4px solid #1677ff",
              boxShadow: "0 2px 8px rgba(0,0,0,0.04)",
            }}
            bodyStyle={{
              padding: 18,
              height: "100%",
              display: "flex",
              flexDirection: "column",
              justifyContent: "space-between",
            }}
          >
            {depsLoading ? (
              <Skeleton active paragraph={{ rows: 1 }} />
            ) : (
              <Statistic
                title={
                  <span style={{ fontWeight: 600, color: "#475569" }}>
                    Total School Strength
                  </span>
                }
                value={totalSchoolStudents}
                prefix={<TeamOutlined style={{ color: "#1677ff" }} />}
                valueStyle={{ fontWeight: 800, color: "#0f172a", fontSize: 26 }}
              />
            )}
            <Text type="secondary" style={{ fontSize: 12, display: "block", marginTop: 6 }}>
              Across all {classes.length} grades in the institution
            </Text>
          </Card>
        </Col>

        {/* Card 2: Current Class / Section Strength */}
        <Col xs={24} sm={12} lg={6} style={{ display: "flex" }}>
          <Card
            hoverable
            style={{
              width: "100%",
              borderRadius: 12,
              borderLeft: "4px solid #52c41a",
              boxShadow: "0 2px 8px rgba(0,0,0,0.04)",
            }}
            bodyStyle={{
              padding: 18,
              height: "100%",
              display: "flex",
              flexDirection: "column",
              justifyContent: "space-between",
            }}
          >
            {loading ? (
              <Skeleton active paragraph={{ rows: 1 }} />
            ) : (
              <Statistic
                title={
                  <span style={{ fontWeight: 600, color: "#475569" }}>
                    {selectedClassObj
                      ? `${selectedClassObj.name} ${
                          selectedSectionObj
                            ? `- ${selectedSectionObj.name}`
                            : "(All Sections)"
                        }`
                      : "All Classes Enrolled"}
                  </span>
                }
                value={filteredStudents.length}
                suffix={
                  <span style={{ fontSize: 13, color: "#64748b", fontWeight: 400 }}>
                    / {currentClassTotalCount} in grade
                  </span>
                }
                prefix={<BookOutlined style={{ color: "#52c41a" }} />}
                valueStyle={{ fontWeight: 800, color: "#15803d", fontSize: 26 }}
              />
            )}
            <Text type="secondary" style={{ fontSize: 12, display: "block", marginTop: 6 }}>
              Students in currently selected view
            </Text>
          </Card>
        </Col>

        {/* Card 3: Gender Distribution in View */}
        <Col xs={24} sm={12} lg={6} style={{ display: "flex" }}>
          <Card
            hoverable
            style={{
              width: "100%",
              borderRadius: 12,
              borderLeft: "4px solid #722ed1",
              boxShadow: "0 2px 8px rgba(0,0,0,0.04)",
            }}
            bodyStyle={{
              padding: 18,
              height: "100%",
              display: "flex",
              flexDirection: "column",
              justifyContent: "space-between",
            }}
          >
            {loading ? (
              <Skeleton active paragraph={{ rows: 1 }} />
            ) : (
              <Statistic
                title={
                  <span style={{ fontWeight: 600, color: "#475569" }}>
                    Class Gender Ratio
                  </span>
                }
                value={`${stats.male} : ${stats.female}`}
                prefix={<UserOutlined style={{ color: "#722ed1" }} />}
                suffix={
                  <span style={{ fontSize: 13, color: "#64748b", fontWeight: 500 }}>
                    (Boys : Girls)
                  </span>
                }
                valueStyle={{ fontWeight: 800, color: "#581c87", fontSize: 26 }}
              />
            )}
            <Text type="secondary" style={{ fontSize: 12, display: "block", marginTop: 6 }}>
              {stats.totalInView > 0
                ? `${stats.male} Boys (${Math.round((stats.male / stats.totalInView) * 100)}%) · ${stats.female} Girls (${Math.round((stats.female / stats.totalInView) * 100)}%)`
                : "No students in this view"}
            </Text>
          </Card>
        </Col>

        {/* Card 4: Enrollment / Active Status */}
        <Col xs={24} sm={12} lg={6} style={{ display: "flex" }}>
          <Card
            hoverable
            style={{
              width: "100%",
              borderRadius: 12,
              borderLeft: "4px solid #13c2c2",
              boxShadow: "0 2px 8px rgba(0,0,0,0.04)",
            }}
            bodyStyle={{
              padding: 18,
              height: "100%",
              display: "flex",
              flexDirection: "column",
              justifyContent: "space-between",
            }}
          >
            {loading ? (
              <Skeleton active paragraph={{ rows: 1 }} />
            ) : (
              <Statistic
                title={
                  <span style={{ fontWeight: 600, color: "#475569" }}>
                    Enrollment Status
                  </span>
                }
                value={`${stats.active} Active`}
                prefix={<CheckCircleOutlined style={{ color: "#13c2c2" }} />}
                valueStyle={{ fontWeight: 800, color: "#0e7490", fontSize: 26 }}
              />
            )}
            <Text type="secondary" style={{ fontSize: 12, display: "block", marginTop: 6 }}>
              {stats.inactive > 0 ? `${stats.inactive} Inactive records` : "100% Active attendance status"}
            </Text>
          </Card>
        </Col>
      </Row>

      {/* 3. Main Directory Card with Class & Section Filters */}
      <Card
        style={{
          borderRadius: 14,
          boxShadow: "0 4px 16px rgba(0,0,0,0.04)",
        }}
        bodyStyle={{ padding: 20 }}
      >
        {/* Clean, Non-Scattered Filter Toolbar */}
        <div
          style={{
            background: "#f8fafc",
            padding: "16px 20px",
            borderRadius: 12,
            border: "1px solid #e2e8f0",
            marginBottom: 16,
          }}
        >
          <Row justify="space-between" align="middle" gutter={[16, 16]}>
            {/* Left Controls: Class Selector & Section Buttons */}
            <Col xs={24} lg={15}>
              <Space size="middle" wrap align="middle">
                <Space size="small">
                  <Text strong style={{ fontSize: 13, color: "#334155" }}>
                    Select Class:
                  </Text>
                  <Select
                    value={viewClass}
                    onChange={handleViewClassChange}
                    style={{ width: 230 }}
                    size="middle"
                    placeholder="Select Class"
                  >
                    <Option value="all">
                      🌐 All Classes ({totalSchoolStudents})
                    </Option>
                    {classes.map((c) => {
                      const count = classCountsMap[c._id] ?? 0;
                      return (
                        <Option key={c._id} value={c._id}>
                          📘 {c.name} ({count} Students)
                        </Option>
                      );
                    })}
                  </Select>
                </Space>

                {/* Section Filter directly inline */}
                {viewClass && viewClass !== "all" && viewSections.length > 0 && (
                  <Space size="small">
                    <Text strong style={{ fontSize: 13, color: "#334155", marginLeft: 4 }}>
                      Filter by Section:
                    </Text>
                    <Radio.Group
                      value={viewSection}
                      onChange={(e) => handleViewSectionChange(e.target.value)}
                      buttonStyle="solid"
                      size="middle"
                    >
                      <Radio.Button value="all">
                        All Sections ({currentClassTotalCount})
                      </Radio.Button>
                      {viewSections.map((sec) => {
                        const count =
                          sectionCountsMap[sec._id] ??
                          students.filter(
                            (s) => (s.section?._id || s.section) === sec._id
                          ).length;
                        return (
                          <Radio.Button key={sec._id} value={sec._id}>
                            {sec.name} ({count})
                          </Radio.Button>
                        );
                      })}
                    </Radio.Group>
                  </Space>
                )}
              </Space>
            </Col>

            {/* Right side: Search Box */}
            <Col xs={24} lg={9} style={{ textAlign: "right" }}>
              <Input
                placeholder="Search name, admission no, or roll..."
                prefix={<SearchOutlined style={{ color: "#9ca3af" }} />}
                value={searchText}
                onChange={(e) => setSearchText(e.target.value)}
                style={{ width: "100%", maxWidth: 300 }}
                allowClear
              />
            </Col>
          </Row>
        </div>

        {/* Active View Indicator Bar */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            padding: "8px 12px",
            background: "#f1f5f9",
            borderRadius: 8,
            marginBottom: 16,
            fontSize: 13,
          }}
        >
          <Space>
            <Text strong style={{ color: "#0f172a" }}>
              Currently Showing:
            </Text>
            <Tag color="blue" style={{ fontSize: 12, padding: "2px 8px" }}>
              {selectedClassObj ? selectedClassObj.name : "All Classes"}
            </Tag>
            {selectedSectionObj && (
              <Tag color="cyan" style={{ fontSize: 12, padding: "2px 8px" }}>
                {selectedSectionObj.name}
              </Tag>
            )}
            <Text type="secondary">
              ({filteredStudents.length} students displayed)
            </Text>
          </Space>

          <Text type="secondary" style={{ fontSize: 12 }}>
            Total in School: <Text strong>{totalSchoolStudents}</Text>
          </Text>
        </div>

        {/* Student Table */}
        <Table
          columns={columns}
          dataSource={filteredStudents}
          rowKey="_id"
          loading={loading}
          pagination={{
            pageSize: 15,
            showSizeChanger: true,
            pageSizeOptions: ["15", "30", "50", "100"],
            showTotal: (total, range) =>
              `Showing ${range[0]}-${range[1]} of ${total} students`,
          }}
          locale={{
            emptyText: (
              <Empty
                description={
                  <span>
                    No students found in{" "}
                    <strong>
                      {selectedClassObj ? selectedClassObj.name : "this view"}
                      {selectedSectionObj ? ` - ${selectedSectionObj.name}` : ""}
                    </strong>
                  </span>
                }
              />
            ),
          }}
        />
      </Card>

      {/* 4. Student Profile Details Drawer */}
      <Drawer
        title={
          selectedStudent ? (
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                width: "100%",
                paddingRight: 24,
              }}
            >
              <Space>
                <Avatar
                  size={40}
                  style={{
                    backgroundColor:
                      selectedStudent.gender === "female" ? "#eb2f96" : "#1677ff",
                  }}
                >
                  {(selectedStudent.firstName?.[0] || "S").toUpperCase()}
                </Avatar>
                <div>
                  <Text strong style={{ fontSize: 16, display: "block" }}>
                    {selectedStudent.firstName} {selectedStudent.lastName || ""}
                  </Text>
                  <Text type="secondary" style={{ fontSize: 12 }}>
                    Admission: {selectedStudent.admissionNumber}
                  </Text>
                </div>
              </Space>
              <Button
                type="primary"
                size="small"
                icon={<EditOutlined />}
                onClick={() => handleOpenEdit(selectedStudent)}
              >
                Edit
              </Button>
            </div>
          ) : (
            "Student Profile"
          )
        }
        placement="right"
        width={560}
        onClose={() => setDrawerOpen(false)}
        open={drawerOpen}
      >
        {selectedStudent && (
          <div>
            {/* Enrollment Summary Banner */}
            <Card
              size="small"
              style={{
                borderRadius: 8,
                background: "#f0fdf4",
                border: "1px solid #bbf7d0",
                marginBottom: 20,
              }}
            >
              <Row gutter={16}>
                <Col span={8}>
                  <Statistic
                    title={<span style={{ fontSize: 11 }}>Roll Number</span>}
                    value={`#${selectedStudent.rollNumber ?? "-"}`}
                    valueStyle={{ fontSize: 18, fontWeight: 700, color: "#166534" }}
                  />
                </Col>
                <Col span={8}>
                  <Statistic
                    title={<span style={{ fontSize: 11 }}>Class & Sec</span>}
                    value={`${selectedStudent.class?.name || "N/A"} - ${selectedStudent.section?.name || "N/A"}`}
                    valueStyle={{ fontSize: 15, fontWeight: 700, color: "#166534" }}
                  />
                </Col>
                <Col span={8}>
                  <Statistic
                    title={<span style={{ fontSize: 11 }}>Status</span>}
                    value={(selectedStudent.status || "active").toUpperCase()}
                    valueStyle={{ fontSize: 15, fontWeight: 700, color: "#166534" }}
                  />
                </Col>
              </Row>
            </Card>

            {/* Academic Information */}
            <Title level={5} style={{ marginTop: 0 }}>
              <BookOutlined style={{ marginRight: 6, color: "#1677ff" }} />
              Academic Details
            </Title>
            <Descriptions bordered size="small" column={1} style={{ marginBottom: 20 }}>
              <Descriptions.Item label="Academic Session">
                {selectedStudent.academicYear?.name || "Current Session"}
              </Descriptions.Item>
              <Descriptions.Item label="Admission Number">
                <Text strong style={{ color: "#1677ff", fontFamily: "monospace" }}>
                  {selectedStudent.admissionNumber}
                </Text>
              </Descriptions.Item>
              <Descriptions.Item label="Class & Section">
                {selectedStudent.class?.name} - {selectedStudent.section?.name}
              </Descriptions.Item>
              <Descriptions.Item label="Roll Number">
                {selectedStudent.rollNumber}
              </Descriptions.Item>
            </Descriptions>

            {/* Personal Information */}
            <Title level={5}>
              <IdcardOutlined style={{ marginRight: 6, color: "#52c41a" }} />
              Personal Information
            </Title>
            <Descriptions bordered size="small" column={1} style={{ marginBottom: 20 }}>
              <Descriptions.Item label="Full Name">
                {selectedStudent.firstName} {selectedStudent.middleName || ""} {selectedStudent.lastName || ""}
              </Descriptions.Item>
              <Descriptions.Item label="Gender">
                <Tag
                  color={selectedStudent.gender === "female" ? "magenta" : "blue"}
                  style={{ textTransform: "capitalize" }}
                >
                  {selectedStudent.gender || "N/A"}
                </Tag>
              </Descriptions.Item>
              <Descriptions.Item label="Date of Birth">
                {selectedStudent.dateOfBirth
                  ? new Date(selectedStudent.dateOfBirth).toLocaleDateString()
                  : "N/A"}
              </Descriptions.Item>
              <Descriptions.Item label="Blood Group">
                {selectedStudent.bloodGroup ? (
                  <Tag color="red">{selectedStudent.bloodGroup}</Tag>
                ) : (
                  "N/A"
                )}
              </Descriptions.Item>
              <Descriptions.Item label="Student Phone">
                {selectedStudent.phone || "N/A"}
              </Descriptions.Item>
              <Descriptions.Item label="Personal Email">
                {selectedStudent.email || "N/A"}
              </Descriptions.Item>
            </Descriptions>

            {/* Guardian / Parent Information */}
            <Title level={5}>
              <TeamOutlined style={{ marginRight: 6, color: "#722ed1" }} />
              Guardian & Parent Details
            </Title>
            <Descriptions bordered size="small" column={1} style={{ marginBottom: 20 }}>
              <Descriptions.Item label="Guardian Name">
                <Text strong>{getGuardianName(selectedStudent.guardian)}</Text>
              </Descriptions.Item>
              {selectedStudent.guardian?.fatherName && (
                <Descriptions.Item label="Father's Name">
                  {selectedStudent.guardian.fatherName}
                </Descriptions.Item>
              )}
              {selectedStudent.guardian?.motherName && (
                <Descriptions.Item label="Mother's Name">
                  {selectedStudent.guardian.motherName}
                </Descriptions.Item>
              )}
              <Descriptions.Item label="Relationship">
                <span style={{ textTransform: "capitalize" }}>
                  {selectedStudent.guardian?.relation || "Guardian"}
                </span>
              </Descriptions.Item>
              <Descriptions.Item label="Guardian Phone">
                {selectedStudent.guardian?.phone || selectedStudent.phone || "N/A"}
              </Descriptions.Item>
              {selectedStudent.guardian?.email && (
                <Descriptions.Item label="Guardian Email">
                  {selectedStudent.guardian.email}
                </Descriptions.Item>
              )}
              {selectedStudent.guardian?.address && (
                <Descriptions.Item label="Address">
                  {selectedStudent.guardian.address}
                </Descriptions.Item>
              )}
            </Descriptions>

            {/* System Account Information */}
            <Title level={5}>
              <UserOutlined style={{ marginRight: 6, color: "#13c2c2" }} />
              ERP Portal Account
            </Title>
            <Descriptions bordered size="small" column={1}>
              <Descriptions.Item label="Portal Username / Login ID">
                <Text code strong style={{ color: "#0958d9", fontSize: 13 }}>
                  {selectedStudent.user?.username || selectedStudent.phone || selectedStudent.admissionNumber || "N/A"}
                </Text>
              </Descriptions.Item>
              <Descriptions.Item label="Portal Email">
                {selectedStudent.user?.email || selectedStudent.email || "No email (Username login)"}
              </Descriptions.Item>
              <Descriptions.Item label="Account Status">
                <Tag color={selectedStudent.user?.isActive !== false ? "green" : "red"}>
                  {selectedStudent.user?.isActive !== false ? "ACTIVE" : "DISABLED"}
                </Tag>
              </Descriptions.Item>
              <Descriptions.Item label="Last Login">
                {selectedStudent.user?.lastLogin
                  ? new Date(selectedStudent.user.lastLogin).toLocaleString()
                  : "Never logged in"}
              </Descriptions.Item>
            </Descriptions>

            {/* School Bus & Transport Service */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 20, marginBottom: 8 }}>
              <Title level={5} style={{ margin: 0 }}>
                <CarOutlined style={{ marginRight: 6, color: "#fa8c16" }} />
                School Bus & Transport Service
              </Title>
              <Button
                size="small"
                type="primary"
                icon={<SwapOutlined />}
                style={{ backgroundColor: "#1677ff" }}
                onClick={() => handleOpenQuickTransport(selectedStudent)}
              >
                {selectedStudent.transport?.opted ? "Change Bus / Stop" : "Assign School Bus"}
              </Button>
            </div>

            {selectedStudent.transport?.opted ? (
              <Card
                size="small"
                style={{
                  borderRadius: 8,
                  border: "1px solid #fed7aa",
                  background: "#fffaf0",
                  marginBottom: 20,
                }}
              >
                <Descriptions bordered size="small" column={1}>
                  <Descriptions.Item label="Bus Number">
                    <Tag color="volcano" icon={<CarOutlined />} style={{ fontWeight: 800 }}>
                      {selectedStudent.transport.busNumber || "BUS"}
                    </Tag>
                    {selectedStudent.transport?.vehicle?.vehicleModel && (
                      <span style={{ fontSize: 12, color: "#64748b", marginLeft: 6 }}>
                        ({selectedStudent.transport.vehicle.vehicleModel})
                      </span>
                    )}
                  </Descriptions.Item>
                  <Descriptions.Item label="Route & Boarding Stop">
                    <div style={{ fontWeight: 600, color: "#1e293b" }}>
                      <EnvironmentOutlined style={{ color: "#ef4444", marginRight: 4 }} />
                      {selectedStudent.transport.pickupPoint || "Assigned Stop"}
                    </div>
                    <div style={{ fontSize: 11, color: "#64748b" }}>
                      {selectedStudent.transport.routeName || "School Route"}
                    </div>
                  </Descriptions.Item>
                  <Descriptions.Item label="Transit Timings">
                    <Space size={10}>
                      <Tag color="cyan">Pickup: <b>{selectedStudent.transport.pickupTime || "07:30 AM"}</b></Tag>
                      <Tag color="purple">Drop: <b>{selectedStudent.transport.dropTime || "02:30 PM"}</b></Tag>
                    </Space>
                  </Descriptions.Item>
                  <Descriptions.Item label="Driver & Contact">
                    <div>
                      <Text strong>{selectedStudent.transport.driverName || "Driver"}</Text>
                      {selectedStudent.transport.driverPhone && (
                        <div style={{ marginTop: 2 }}>
                          <a href={`tel:${selectedStudent.transport.driverPhone}`} style={{ color: "#0284c7" }}>
                            <PhoneOutlined /> {selectedStudent.transport.driverPhone}
                          </a>
                        </div>
                      )}
                    </div>
                  </Descriptions.Item>
                  {selectedStudent.transport.annualFee > 0 && (
                    <Descriptions.Item label="Annual Transport Fee">
                      <span style={{ fontWeight: 700, color: "#0f766e" }}>
                        ₹{selectedStudent.transport.annualFee.toLocaleString()}
                      </span>
                    </Descriptions.Item>
                  )}
                </Descriptions>
              </Card>
            ) : (
              <Card
                size="small"
                style={{
                  borderRadius: 8,
                  background: "#f8fafc",
                  marginBottom: 20,
                  border: "1px dashed #cbd5e1",
                }}
              >
                <Text type="secondary" style={{ fontSize: 12 }}>
                  Student is currently not enrolled in school bus service. Click &quot;Assign School Bus&quot; above to allocate a route.
                </Text>
              </Card>
            )}
            {/* Fee & Accounts Status */}
            <Title level={5} style={{ marginTop: 20 }}>
              <DollarCircleOutlined style={{ marginRight: 6, color: "#fa8c16" }} />
              Fee & Account Status ({selectedStudent.academicYear?.name || "Current Session"})
            </Title>
            {loadingStudentFee ? (
              <Skeleton active paragraph={{ rows: 3 }} />
            ) : selectedStudentFee ? (
              <Card
                size="small"
                style={{
                  borderRadius: 8,
                  border: "1px solid #fed7aa",
                  background: "#fffaf0",
                  marginBottom: 20,
                }}
              >
                <Row gutter={12} style={{ marginBottom: 12 }}>
                  <Col span={8}>
                    <Statistic
                      title={<span style={{ fontSize: 11 }}>Payable Fee</span>}
                      value={`₹${(selectedStudentFee.payableAmount || 0).toLocaleString()}`}
                      valueStyle={{ fontSize: 16, fontWeight: 700, color: "#c2410c" }}
                    />
                  </Col>
                  <Col span={8}>
                    <Statistic
                      title={<span style={{ fontSize: 11 }}>Paid Amount</span>}
                      value={`₹${(selectedStudentFee.paidAmount || 0).toLocaleString()}`}
                      valueStyle={{ fontSize: 16, fontWeight: 700, color: "#15803d" }}
                    />
                  </Col>
                  <Col span={8}>
                    <Statistic
                      title={<span style={{ fontSize: 11 }}>Due Balance</span>}
                      value={`₹${(selectedStudentFee.dueAmount || 0).toLocaleString()}`}
                      valueStyle={{
                        fontSize: 16,
                        fontWeight: 700,
                        color: selectedStudentFee.dueAmount > 0 ? "#b91c1c" : "#15803d",
                      }}
                    />
                  </Col>
                </Row>
                <Descriptions bordered size="small" column={1}>
                  <Descriptions.Item label="Fee Status">
                    <Tag
                      color={
                        selectedStudentFee.status === "paid"
                          ? "green"
                          : selectedStudentFee.status === "partial"
                          ? "orange"
                          : "red"
                      }
                    >
                      {(selectedStudentFee.status || "PENDING").toUpperCase()}
                    </Tag>
                  </Descriptions.Item>
                  {selectedStudentFee.annualCharges > 0 && (
                    <Descriptions.Item label="Annual Charges">
                      ₹{selectedStudentFee.annualCharges.toLocaleString()}
                    </Descriptions.Item>
                  )}
                  {selectedStudentFee.monthlyTuition > 0 && (
                    <Descriptions.Item label="Tuition Fee">
                      ₹{selectedStudentFee.monthlyTuition.toLocaleString()}/mo ×{" "}
                      {selectedStudentFee.tuitionMonths || 12} mos = ₹
                      {(
                        (selectedStudentFee.monthlyTuition || 0) *
                        (selectedStudentFee.tuitionMonths || 12)
                      ).toLocaleString()}
                    </Descriptions.Item>
                  )}
                  {selectedStudentFee.transportFee > 0 && (
                    <Descriptions.Item label="Transport Fee">
                      ₹{selectedStudentFee.transportFee.toLocaleString()}{" "}
                      {selectedStudentFee.transportDetails?.route &&
                        `(${selectedStudentFee.transportDetails.route})`}
                    </Descriptions.Item>
                  )}
                  {selectedStudentFee.extraFees > 0 && (
                    <Descriptions.Item label="Extra / Activity Charges">
                      ₹{selectedStudentFee.extraFees.toLocaleString()}
                    </Descriptions.Item>
                  )}
                  {selectedStudentFee.discount > 0 && (
                    <Descriptions.Item label="Scholarship / Offer">
                      <Tag color="green">
                        {selectedStudentFee.offer?.name || "Discount"}: -₹
                        {selectedStudentFee.discount.toLocaleString()}
                      </Tag>
                    </Descriptions.Item>
                  )}
                </Descriptions>
              </Card>
            ) : (
              <Card
                size="small"
                style={{
                  borderRadius: 8,
                  background: "#f8fafc",
                  marginBottom: 20,
                  border: "1px dashed #cbd5e1",
                }}
              >
                <Text type="secondary">
                  No specific fee structure assigned yet for this academic year. The accountant can configure or collect fee anytime from the Fees Management page.
                </Text>
              </Card>
            )}
          </div>
        )}
      </Drawer>

      {/* 5. Admission Modal */}
      <Modal
        title="New Student Admission"
        open={modalOpen}
        onCancel={() => setModalOpen(false)}
        footer={null}
        width={840}
        destroyOnClose
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={handleCreateStudent}
          requiredMark="optional"
          style={{ marginTop: 16 }}
        >
          <Row gutter={16}>
            <Col xs={24} sm={12}>
              <Form.Item
                name="admissionNumber"
                label={
                  <Space size={4}>
                    <span>Admission Number</span>
                    <Tag color="blue" style={{ fontSize: 10, lineHeight: "16px", padding: "0 4px", margin: 0 }}>Auto</Tag>
                  </Space>
                }
                rules={[{ required: true, message: "Enter admission number" }]}
              >
                <Input
                  placeholder="e.g. ADM-2026-0001"
                  style={{ textTransform: "uppercase" }}
                  addonAfter={
                    <Tooltip title="Regenerate next admission number">
                      <ReloadOutlined
                        style={{ cursor: "pointer", color: "#1677ff" }}
                        onClick={fetchNextAdmissionNumber}
                      />
                    </Tooltip>
                  }
                />
              </Form.Item>
            </Col>
            <Col xs={24} sm={12}>
              <Form.Item
                name="academicYear"
                label="Academic Session"
                rules={[{ required: true, message: "Select academic year" }]}
              >
                <Select placeholder="Select Session">
                  {academicYears.map((y) => (
                    <Option key={y._id} value={y._id}>
                      {y.name} {y.isCurrent && "(Current)"}
                    </Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col xs={24} sm={12}>
              <Form.Item
                name="firstName"
                label="First Name"
                rules={[{ required: true, message: "Enter first name" }]}
              >
                <Input placeholder="First Name" />
              </Form.Item>
            </Col>
            <Col xs={24} sm={12}>
              <Form.Item name="lastName" label="Last Name">
                <Input placeholder="Last Name" />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col xs={24} sm={8}>
              <Form.Item
                name="gender"
                label="Gender"
                rules={[{ required: true, message: "Select gender" }]}
              >
                <Select placeholder="Select Gender">
                  <Option value="male">Male</Option>
                  <Option value="female">Female</Option>
                  <Option value="other">Other</Option>
                </Select>
              </Form.Item>
            </Col>
            <Col xs={24} sm={8}>
              <Form.Item
                name="dateOfBirth"
                label="Date of Birth"
                rules={[{ required: true, message: "Select DOB" }]}
              >
                <DatePicker style={{ width: "100%" }} format="YYYY-MM-DD" />
              </Form.Item>
            </Col>
            <Col xs={24} sm={8}>
              <Form.Item name="bloodGroup" label="Blood Group">
                <Select placeholder="Blood Group">
                  {["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"].map((bg) => (
                    <Option key={bg} value={bg}>
                      {bg}
                    </Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col xs={24} sm={10}>
              <Form.Item
                name="classId"
                label="Class"
                rules={[{ required: true, message: "Select class" }]}
              >
                <Select placeholder="Select Class" onChange={handleModalClassChange}>
                  {classes.map((c) => (
                    <Option key={c._id} value={c._id}>
                      {c.name} ({c.code})
                    </Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
            <Col xs={24} sm={8}>
              <Form.Item
                name="sectionId"
                label="Section"
                rules={[{ required: true, message: "Select section" }]}
              >
                <Select
                  placeholder="Select Section"
                  disabled={!modalClassSelected && !form.getFieldValue("classId")}
                  onChange={handleModalSectionChange}
                >
                  {sections.map((s) => (
                    <Option key={s._id} value={s._id}>
                      {s.name} (Cap: {s.capacity || 40})
                    </Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
            <Col xs={24} sm={6}>
              <Form.Item
                name="rollNumber"
                label={
                  <Space size={4}>
                    <span>Roll No</span>
                    <Tag color="cyan" style={{ fontSize: 10, lineHeight: "16px", padding: "0 4px", margin: 0 }}>Auto</Tag>
                  </Space>
                }
                rules={[{ required: true, message: "Enter roll no" }]}
              >
                <Input type="number" min={1} placeholder="Auto" />
              </Form.Item>
            </Col>
          </Row>

          {/* Student Contact Information */}
          <Row gutter={16}>
            <Col xs={24} sm={12}>
              <Form.Item
                name="phone"
                label={
                  <Space size={4}>
                    <span>Student Mobile</span>
                    <Text type="secondary" style={{ fontSize: 11 }}>(Optional)</Text>
                  </Space>
                }
              >
                <Input prefix={<PhoneOutlined style={{ color: "#9ca3af" }} />} placeholder="e.g. 9876543210 (Optional)" />
              </Form.Item>
            </Col>
            <Col xs={24} sm={12}>
              <Form.Item
                name="email"
                label={
                  <Space size={4}>
                    <span>Student Email</span>
                    <Text type="secondary" style={{ fontSize: 11 }}>(Optional)</Text>
                  </Space>
                }
                rules={[{ type: "email", message: "Enter valid email address" }]}
              >
                <Input prefix={<MailOutlined style={{ color: "#9ca3af" }} />} placeholder="student@example.com (Optional)" />
              </Form.Item>
            </Col>
          </Row>

          {/* Parent / Guardian & Portal Login */}
          <Divider orientation="left" style={{ margin: "16px 0 12px" }}>
            <Space>
              <TeamOutlined style={{ color: "#1677ff" }} />
              <span style={{ fontWeight: 600 }}>Parent / Guardian & Portal Login Setup</span>
            </Space>
          </Divider>

          <Row gutter={16}>
            <Col xs={24} sm={12}>
              <Form.Item
                name="guardianName"
                label="Parent / Guardian Name"
                rules={[{ required: true, message: "Enter parent or guardian name" }]}
              >
                <Input prefix={<UserOutlined style={{ color: "#9ca3af" }} />} placeholder="e.g. Rajesh Kumar" />
              </Form.Item>
            </Col>
            <Col xs={24} sm={12}>
              <Form.Item
                name="guardianRelation"
                label="Relationship"
                initialValue="father"
              >
                <Select placeholder="Select Relation">
                  <Option value="father">Father</Option>
                  <Option value="mother">Mother</Option>
                  <Option value="guardian">Guardian</Option>
                  <Option value="other">Other</Option>
                </Select>
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col xs={24} sm={12}>
              <Form.Item
                name="guardianPhone"
                label={
                  <Space size={4}>
                    <span>Parent Phone</span>
                    <Text type="secondary" style={{ fontSize: 11 }}>(Optional)</Text>
                  </Space>
                }
              >
                <Input prefix={<PhoneOutlined style={{ color: "#9ca3af" }} />} placeholder="e.g. 9876543210 (Optional)" />
              </Form.Item>
            </Col>
            <Col xs={24} sm={12}>
              <Form.Item
                name="guardianEmail"
                label={
                  <Space size={4}>
                    <span>Parent Email</span>
                    <Text type="secondary" style={{ fontSize: 11 }}>(Optional)</Text>
                  </Space>
                }
                rules={[{ type: "email", message: "Enter valid email address" }]}
              >
                <Input prefix={<MailOutlined style={{ color: "#9ca3af" }} />} placeholder="parent@example.com (Optional)" />
              </Form.Item>
            </Col>
          </Row>

          <Alert
            type="info"
            showIcon
            style={{ marginBottom: 16, fontSize: 12, borderRadius: 6 }}
            message="Auto Portal Credentials"
            description="Portal login accounts will be generated for both Student and Parent. If email is not given, phone number is used as username. If neither email nor phone is provided, student's username will be name + roll (e.g. rahul12). Password defaults to name + DOB."
          />

          {/* Fee Setup & Scholarship / Offer Section */}
          <Divider orientation="left" style={{ margin: "24px 0 16px" }}>
            <Space>
              <DollarCircleOutlined style={{ color: "#fa8c16" }} />
              <span style={{ fontWeight: 600 }}>Fee Structure & Scholarship / Offer Setup</span>
            </Space>
          </Divider>

          <Card
            size="small"
            style={{
              borderRadius: 8,
              border: enableAdmissionFee ? "1px solid #fed7aa" : "1px solid #e2e8f0",
              background: enableAdmissionFee ? "#fffaf0" : "#f8fafc",
              marginBottom: 20,
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: enableAdmissionFee ? 16 : 0 }}>
              <div>
                <Text strong style={{ fontSize: 14 }}>Configure Student Fee for this Session</Text>
                <br />
                <Text type="secondary" style={{ fontSize: 12 }}>
                  Set up annual charges, monthly tuition, transport, extra fees, and scholarship/offer discount
                </Text>
              </div>
              <Switch
                checked={enableAdmissionFee}
                onChange={setEnableAdmissionFee}
                checkedChildren="Enabled"
                unCheckedChildren="Skip"
              />
            </div>

            {enableAdmissionFee && (
              <div style={{ marginTop: 12 }}>
                {classFeeStructures.length > 0 && (
                  <Form.Item name="feeStructureId" label="Fee Structure Template (Optional)">
                    <Select placeholder="Select Template to Pre-fill Fee" allowClear>
                      {classFeeStructures.map((f) => (
                        <Option key={f._id} value={f._id}>
                          {f.name} ({f.components?.length || 0} components)
                        </Option>
                      ))}
                    </Select>
                  </Form.Item>
                )}

                <Row gutter={16}>
                  <Col xs={24} sm={8}>
                    <Form.Item label="Annual & Admission Charges (₹)">
                      <InputNumber
                        min={0}
                        style={{ width: "100%" }}
                        value={admAnnualCharges}
                        onChange={(v) => setAdmAnnualCharges(v || 0)}
                        prefix="₹"
                        placeholder="5000"
                      />
                    </Form.Item>
                  </Col>
                  <Col xs={24} sm={8}>
                    <Form.Item label="Monthly Tuition Fee (₹)">
                      <InputNumber
                        min={0}
                        style={{ width: "100%" }}
                        value={admMonthlyTuition}
                        onChange={(v) => setAdmMonthlyTuition(v || 0)}
                        prefix="₹"
                        placeholder="1500"
                      />
                    </Form.Item>
                  </Col>
                  <Col xs={24} sm={8}>
                    <Form.Item label="Tuition Months">
                      <Select
                        value={admTuitionMonths}
                        onChange={setAdmTuitionMonths}
                        style={{ width: "100%" }}
                      >
                        {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((m) => (
                          <Option key={m} value={m}>
                            {m} {m === 1 ? "Month" : "Months"} (₹{((admMonthlyTuition || 0) * m).toLocaleString()})
                          </Option>
                        ))}
                      </Select>
                    </Form.Item>
                  </Col>
                </Row>

                {/* Transport Service */}
                <div style={{ padding: "10px 14px", background: "#f0fdf4", border: "1px solid #bbf7d0", borderRadius: 8, marginBottom: 16 }}>
                  <Checkbox
                    checked={admTransportOpted}
                    onChange={(e) => setAdmTransportOpted(e.target.checked)}
                    style={{ fontWeight: 600, color: "#166534" }}
                  >
                    <CarOutlined style={{ marginRight: 6 }} />
                    Student Requires School Transport / Bus Facility
                  </Checkbox>

                  {admTransportOpted && (
                    <div style={{ marginTop: 12 }}>
                      {transportVehicles.length > 0 && (
                        <div style={{ marginBottom: 12 }}>
                          <Text type="secondary" style={{ fontSize: 12, display: "block", marginBottom: 4 }}>
                            Select School Bus Route (Auto-fills route, stops & timings)
                          </Text>
                          <Select
                            placeholder="Choose from active school buses"
                            allowClear
                            style={{ width: "100%" }}
                            value={admTransportVehicleId}
                            onChange={handleSelectAdmissionVehicle}
                          >
                            {transportVehicles.map((v) => (
                              <Option key={v._id} value={v._id}>
                                <Tag color="volcano">{v.busNumber}</Tag> {v.routeName} (₹{v.annualFee?.toLocaleString()})
                              </Option>
                            ))}
                          </Select>
                        </div>
                      )}

                      <Row gutter={16}>
                        <Col xs={24} sm={14}>
                          <Text type="secondary" style={{ fontSize: 12, display: "block", marginBottom: 4 }}>
                            Pickup / Boarding Stop
                          </Text>
                          <Input
                            placeholder="e.g. Sector 14 Main Market"
                            value={admTransportPickupPoint || admTransportRoute}
                            onChange={(e) => {
                              setAdmTransportPickupPoint(e.target.value);
                              setAdmTransportRoute(e.target.value);
                            }}
                            prefix={<EnvironmentOutlined style={{ color: "#ef4444" }} />}
                          />
                        </Col>
                        <Col xs={24} sm={10}>
                          <Text type="secondary" style={{ fontSize: 12, display: "block", marginBottom: 4 }}>
                            Annual Transport Fee (₹)
                          </Text>
                          <InputNumber
                            min={0}
                            style={{ width: "100%" }}
                            prefix="₹"
                            placeholder="Annual Transport Fee"
                            value={admTransportAmount}
                            onChange={(v) => setAdmTransportAmount(v || 0)}
                          />
                        </Col>
                      </Row>

                      {admTransportDriverName && (
                        <div style={{ padding: "8px 12px", background: "#f8fafc", borderRadius: 6, fontSize: 12, color: "#475569", marginTop: 8 }}>
                          Bus: <b>{admTransportBusNumber}</b> • Driver: <b>{admTransportDriverName}</b> ({admTransportDriverPhone}) • Timing: {admTransportPickupTime} - {admTransportDropTime}
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Extra Fees & Concessions */}
                <Row gutter={16}>
                  <Col xs={24} sm={12}>
                    <Form.Item label="Extra / Activity Charges (₹)">
                      <InputNumber
                        min={0}
                        style={{ width: "100%" }}
                        value={admExtraAmount}
                        onChange={(v) => setAdmExtraAmount(v || 0)}
                        prefix="₹"
                        placeholder="e.g. 1000 (Lab, Uniform, Books)"
                      />
                    </Form.Item>
                  </Col>
                  <Col xs={24} sm={12}>
                    <Form.Item label="Scholarship / Offer Scheme">
                      <Select value={admOfferType} onChange={setAdmOfferType}>
                        <Option value="none">No Concession / Normal Fee</Option>
                        <Option value="sibling">Sibling Concession (10% Off)</Option>
                        <Option value="merit">Academic Merit Scholarship (20% Off)</Option>
                        <Option value="staff">Staff Ward Discount (50% Off)</Option>
                        <Option value="girl">Girl Child Concession (15% Off)</Option>
                        <Option value="mgmt">Special Management Offer (25% Off)</Option>
                        <Option value="custom_pct">Custom Percentage Concession (%)</Option>
                        <Option value="custom_flat">Custom Flat Discount (₹)</Option>
                      </Select>
                    </Form.Item>
                  </Col>
                </Row>

                {admOfferType === "custom_pct" && (
                  <Form.Item label="Custom Discount Percentage (%)">
                    <InputNumber
                      min={1}
                      max={100}
                      style={{ width: "100%" }}
                      value={admOfferPct}
                      onChange={(v) => setAdmOfferPct(v || 0)}
                      placeholder="e.g. 15%"
                    />
                  </Form.Item>
                )}

                {admOfferType === "custom_flat" && (
                  <Form.Item label="Custom Flat Discount Amount (₹)">
                    <InputNumber
                      min={1}
                      style={{ width: "100%" }}
                      prefix="₹"
                      value={admOfferFlat}
                      onChange={(v) => setAdmOfferFlat(v || 0)}
                      placeholder="e.g. 2000"
                    />
                  </Form.Item>
                )}

                {/* Live Real-time Calculation Summary Box */}
                <Card
                  size="small"
                  style={{
                    borderRadius: 8,
                    background: "#ecfdf5",
                    border: "1px solid #a7f3d0",
                    marginTop: 10,
                  }}
                >
                  <Row gutter={12} align="middle">
                    <Col xs={24} sm={14}>
                      <Space direction="vertical" size={2} style={{ display: "flex" }}>
                        <Text style={{ fontSize: 12 }}>
                          Annual: <b>₹{admissionFeeSummary.annual.toLocaleString()}</b> + Tuition: <b>₹{admissionFeeSummary.tuition.toLocaleString()}</b>
                          {admissionFeeSummary.transport > 0 && ` + Transport: ₹${admissionFeeSummary.transport.toLocaleString()}`}
                          {admissionFeeSummary.extra > 0 && ` + Extra: ₹${admissionFeeSummary.extra.toLocaleString()}`}
                        </Text>
                        <Text type="secondary" style={{ fontSize: 12 }}>
                          Gross Total: <b>₹{admissionFeeSummary.gross.toLocaleString()}</b>
                          {admissionFeeSummary.discount > 0 && (
                            <span style={{ color: "#059669", marginLeft: 8 }}>
                              • Discount ({admissionFeeSummary.offerLabel}): <b>-₹{admissionFeeSummary.discount.toLocaleString()}</b>
                            </span>
                          )}
                        </Text>
                      </Space>
                    </Col>
                    <Col xs={24} sm={10} style={{ textAlign: "right" }}>
                      <Text style={{ fontSize: 11, color: "#047857", textTransform: "uppercase", fontWeight: 700, display: "block" }}>
                        Net Payable Fee
                      </Text>
                      <span style={{ fontSize: 22, fontWeight: 800, color: "#065f46" }}>
                        ₹{admissionFeeSummary.net.toLocaleString()}
                      </span>
                    </Col>
                  </Row>
                </Card>
              </div>
            )}
          </Card>

          <div style={{ textAlign: "right", marginTop: 16 }}>
            <Space>
              <Button onClick={() => setModalOpen(false)}>Cancel</Button>
              <Button type="primary" htmlType="submit" loading={submitting}>
                Complete Admission
              </Button>
            </Space>
          </div>
        </Form>
      </Modal>

      {/* 5A. Admission Success Credentials Modal */}
      <Modal
        title={
          <Space>
            <CheckCircleOutlined style={{ color: "#52c41a", fontSize: 20 }} />
            <span style={{ fontWeight: 700 }}>Portal Login Credentials Assigned</span>
          </Space>
        }
        open={credentialsModalOpen}
        onCancel={() => setCredentialsModalOpen(false)}
        footer={[
          <Button
            key="copy"
            icon={<CopyOutlined />}
            onClick={() => {
              const stu = createdCredentials?.student;
              const par = createdCredentials?.parent;
              const text = `=== SCHOOL ERP PORTAL LOGIN CREDENTIALS ===\n\n[STUDENT LOGIN]\nName: ${stu?.name || ""}\nAdmission No: ${stu?.admissionNumber || ""}\nUsername / Login ID: ${stu?.username || ""}\nPassword: ${stu?.password || ""}\n\n[PARENT LOGIN]\nGuardian: ${par?.name || ""}\nParent ID: ${par?.parentId || ""}\nUsername / Login ID: ${par?.username || ""}\nPassword: ${par?.password || ""}\n\nPortal Login URL: ${window.location.origin}/login`;
              navigator.clipboard.writeText(text);
              message.success("All credentials copied to clipboard!");
            }}
          >
            Copy All Credentials
          </Button>,
          <Button key="ok" type="primary" onClick={() => setCredentialsModalOpen(false)}>
            Done
          </Button>,
        ]}
        width={580}
        destroyOnClose
      >
        <div style={{ marginBottom: 16 }}>
          <Text type="secondary">
            Admission created successfully. Login accounts have been generated for both the student and parent. You can share these credentials with them.
          </Text>
        </div>

        {/* Student Credentials Card */}
        <Card
          size="small"
          title={
            <Space>
              <UserOutlined style={{ color: "#1677ff" }} />
              <span style={{ fontWeight: 600 }}>Student Portal Account</span>
            </Space>
          }
          style={{ marginBottom: 16, borderColor: "#91caff", background: "#f0f7ff" }}
          extra={
            <Button
              size="small"
              icon={<CopyOutlined />}
              onClick={() => {
                const stu = createdCredentials?.student;
                const text = `Student Portal Login:\nName: ${stu?.name}\nUsername / Portal ID: ${stu?.username}\nPassword: ${stu?.password}`;
                navigator.clipboard.writeText(text);
                message.success("Student credentials copied!");
              }}
            >
              Copy
            </Button>
          }
        >
          <Descriptions size="small" column={1} bordered>
            <Descriptions.Item label="Student Name">
              <Text strong>{createdCredentials?.student?.name}</Text>
            </Descriptions.Item>
            <Descriptions.Item label="Admission No">
              <Tag color="blue">{createdCredentials?.student?.admissionNumber}</Tag>
            </Descriptions.Item>
            <Descriptions.Item label="Portal Username / Login ID">
              <Text code strong style={{ fontSize: 13, color: "#0958d9" }}>
                {createdCredentials?.student?.username}
              </Text>
            </Descriptions.Item>
            <Descriptions.Item label="Password">
              <Text code strong style={{ fontSize: 13, color: "#d4380d" }}>
                {createdCredentials?.student?.password}
              </Text>
            </Descriptions.Item>
          </Descriptions>
        </Card>

        {/* Parent Credentials Card */}
        <Card
          size="small"
          title={
            <Space>
              <TeamOutlined style={{ color: "#fa8c16" }} />
              <span style={{ fontWeight: 600 }}>Parent / Guardian Portal Account</span>
            </Space>
          }
          style={{ borderColor: "#ffd591", background: "#fffaf0" }}
          extra={
            <Button
              size="small"
              icon={<CopyOutlined />}
              onClick={() => {
                const par = createdCredentials?.parent;
                const text = `Parent Portal Login:\nGuardian: ${par?.name}\nParent ID: ${par?.parentId}\nUsername / Portal ID: ${par?.username}\nPassword: ${par?.password}`;
                navigator.clipboard.writeText(text);
                message.success("Parent credentials copied!");
              }}
            >
              Copy
            </Button>
          }
        >
          <Descriptions size="small" column={1} bordered>
            <Descriptions.Item label="Guardian Name">
              <Text strong>{createdCredentials?.parent?.name}</Text>
            </Descriptions.Item>
            <Descriptions.Item label="Parent Portal ID">
              <Tag color="orange">{createdCredentials?.parent?.parentId}</Tag>
            </Descriptions.Item>
            <Descriptions.Item label="Portal Username / Login ID">
              <Text code strong style={{ fontSize: 13, color: "#d46b08" }}>
                {createdCredentials?.parent?.username}
              </Text>
            </Descriptions.Item>
            <Descriptions.Item label="Password">
              <Text code strong style={{ fontSize: 13, color: "#d4380d" }}>
                {createdCredentials?.parent?.password}
              </Text>
            </Descriptions.Item>
          </Descriptions>
        </Card>
      </Modal>

      {/* 5B. Student Promotion Wizard Modal */}
      <Modal
        title={
          <Space>
            <RiseOutlined style={{ color: "#10b981" }} />
            <span>Academic Progression & Student Promotion Wizard</span>
          </Space>
        }
        open={promoteModalOpen}
        onCancel={() => setPromoteModalOpen(false)}
        footer={null}
        width={860}
        destroyOnClose
      >
        <div style={{ padding: "10px 0 20px" }}>
          <Steps
            current={promoteStep}
            onChange={setPromoteStep}
            items={[
              { title: "Select Students", description: "Source Class & Roster" },
              { title: "Target & Fee Setup", description: "Destination & Fees" },
              { title: "Confirm & Promote", description: "Execute Progression" },
            ]}
          />
        </div>

        <Form
          form={promoteForm}
          layout="vertical"
          onFinish={handleExecutePromotion}
          requiredMark="optional"
        >
          {/* STEP 0: Select Source Class & Students */}
          {promoteStep === 0 && (
            <div>
              <Alert
                type="info"
                showIcon
                message="Step 1: Choose the class and select students to promote or repeat"
                description="Students selected here will be transferred to the target academic session and class."
                style={{ marginBottom: 16 }}
              />

              <Row gutter={16}>
                <Col xs={24} sm={12}>
                  <Form.Item name="sourceYear" label="Source Academic Session" rules={[{ required: true }]}>
                    <Select
                      placeholder="Select Source Session"
                      value={promoteSourceYear}
                      onChange={(y) => {
                        setPromoteSourceYear(y);
                        loadPromotionSourceStudents(y, promoteSourceClass);
                      }}
                    >
                      {academicYears.map((y) => (
                        <Option key={y._id} value={y._id}>
                          {y.name} {y.isCurrent && "(Current)"}
                        </Option>
                      ))}
                    </Select>
                  </Form.Item>
                </Col>
                <Col xs={24} sm={12}>
                  <Form.Item name="sourceClass" label="Source Class" rules={[{ required: true }]}>
                    <Select
                      placeholder="Select Source Class"
                      value={promoteSourceClass}
                      onChange={handlePromoteSourceClassChange}
                    >
                      {classes.map((c) => (
                        <Option key={c._id} value={c._id}>
                          {c.name} ({c.code})
                        </Option>
                      ))}
                    </Select>
                  </Form.Item>
                </Col>
              </Row>

              <div style={{ marginBottom: 12, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <Text strong>
                  Student Roster ({promoteSelectedStudentIds.length} of {promoteSourceStudents.length} Selected)
                </Text>
                <Space>
                  <Button
                    size="small"
                    onClick={() => setPromoteSelectedStudentIds(promoteSourceStudents.map((s) => s._id))}
                  >
                    Select All
                  </Button>
                  <Button
                    size="small"
                    onClick={() => setPromoteSelectedStudentIds([])}
                  >
                    Deselect All
                  </Button>
                </Space>
              </div>

              <Table
                size="small"
                loading={promoteLoadingStudents}
                dataSource={promoteSourceStudents}
                rowKey="_id"
                pagination={{ pageSize: 8 }}
                rowSelection={{
                  selectedRowKeys: promoteSelectedStudentIds,
                  onChange: (keys) => setPromoteSelectedStudentIds(keys),
                }}
                columns={[
                  {
                    title: "Roll No",
                    dataIndex: "rollNumber",
                    key: "rollNumber",
                    width: 80,
                    render: (r) => `#${r}`,
                  },
                  {
                    title: "Student Name",
                    key: "name",
                    render: (_, r) => `${r.firstName} ${r.lastName || ""}`,
                  },
                  {
                    title: "Admission No",
                    dataIndex: "admissionNumber",
                    key: "admissionNumber",
                  },
                  {
                    title: "Section",
                    dataIndex: ["section", "name"],
                    key: "section",
                    render: (sec) => sec || "A",
                  },
                ]}
              />

              <div style={{ textAlign: "right", marginTop: 20 }}>
                <Button
                  type="primary"
                  icon={<ArrowRightOutlined />}
                  disabled={promoteSelectedStudentIds.length === 0}
                  onClick={() => setPromoteStep(1)}
                >
                  Next: Configure Target & Fees
                </Button>
              </div>
            </div>
          )}

          {/* STEP 1: Target Destination & Fee Configuration */}
          {promoteStep === 1 && (
            <div>
              <Alert
                type="success"
                showIcon
                message="Step 2: Choose destination session, class, and fee structure"
                description="Configure the fee breakdown, annual charges, transport, and extra fees for promoted students in their new session."
                style={{ marginBottom: 16 }}
              />

              <Title level={5}>Destination Academic Details</Title>
              <Row gutter={16}>
                <Col xs={24} sm={8}>
                  <Form.Item
                    name="targetYear"
                    label="Target Academic Session"
                    rules={[{ required: true, message: "Select target session" }]}
                  >
                    <Select
                      placeholder="Select Target Session"
                      value={promoteTargetYear}
                      onChange={setPromoteTargetYear}
                    >
                      {academicYears.map((y) => (
                        <Option key={y._id} value={y._id}>
                          {y.name} {y.isCurrent && "(Current)"}
                        </Option>
                      ))}
                    </Select>
                  </Form.Item>
                </Col>
                <Col xs={24} sm={8}>
                  <Form.Item
                    name="targetClassId"
                    label="Target Class"
                    rules={[{ required: true, message: "Select target class" }]}
                  >
                    <Select
                      placeholder="Select Target Class"
                      onChange={handlePromoteTargetClassChange}
                    >
                      {classes.map((c) => (
                        <Option key={c._id} value={c._id}>
                          {c.name} ({c.code})
                        </Option>
                      ))}
                    </Select>
                  </Form.Item>
                </Col>
                <Col xs={24} sm={8}>
                  <Form.Item
                    name="targetSectionId"
                    label="Target Section"
                    rules={[{ required: true, message: "Select target section" }]}
                  >
                    <Select placeholder="Select Target Section" disabled={promoteTargetSections.length === 0}>
                      {promoteTargetSections.map((s) => (
                        <Option key={s._id} value={s._id}>
                          {s.name} (Cap: {s.capacity || 40})
                        </Option>
                      ))}
                    </Select>
                  </Form.Item>
                </Col>
              </Row>

              <Divider orientation="left" style={{ margin: "16px 0" }}>
                <DollarCircleOutlined style={{ color: "#fa8c16", marginRight: 6 }} />
                New Session Fee Configuration
              </Divider>

              <Form.Item name="enablePromotionFee" valuePropName="checked">
                <Checkbox defaultChecked>
                  <b>Automatically assign fee structure to all promoted students for the new session</b>
                </Checkbox>
              </Form.Item>

              {promoteTargetFeeStructures.length > 0 && (
                <Form.Item name="targetFeeStructureId" label="Class Fee Structure Template (Optional)">
                  <Select placeholder="Select Template" allowClear>
                    {promoteTargetFeeStructures.map((f) => (
                      <Option key={f._id} value={f._id}>
                        {f.name} ({f.components?.length || 0} components)
                      </Option>
                    ))}
                  </Select>
                </Form.Item>
              )}

              <Row gutter={16}>
                <Col xs={24} sm={8}>
                  <Form.Item name="promoteAnnualCharges" label="New Annual Charges (₹)">
                    <InputNumber min={0} style={{ width: "100%" }} prefix="₹" placeholder="5000" />
                  </Form.Item>
                </Col>
                <Col xs={24} sm={8}>
                  <Form.Item name="promoteMonthlyTuition" label="New Monthly Tuition (₹)">
                    <InputNumber min={0} style={{ width: "100%" }} prefix="₹" placeholder="1500" />
                  </Form.Item>
                </Col>
                <Col xs={24} sm={8}>
                  <Form.Item name="promoteTuitionMonths" label="Tuition Months">
                    <Select defaultValue={12}>
                      {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((m) => (
                        <Option key={m} value={m}>
                          {m} {m === 1 ? "Month" : "Months"}
                        </Option>
                      ))}
                    </Select>
                  </Form.Item>
                </Col>
              </Row>

              <Row gutter={16}>
                <Col xs={24} sm={12}>
                  <Form.Item name="carryOverTransport" valuePropName="checked">
                    <Checkbox defaultChecked>
                      <b>Carry forward student's existing transport route & opt-in</b>
                    </Checkbox>
                  </Form.Item>
                </Col>
                <Col xs={24} sm={12}>
                  <Form.Item name="carryOverConcession" valuePropName="checked">
                    <Checkbox defaultChecked>
                      <b>Carry forward student's previous scholarship / concession</b>
                    </Checkbox>
                  </Form.Item>
                </Col>
              </Row>

              <Row gutter={16}>
                <Col xs={24} sm={12}>
                  <Form.Item name="promoteExtraFees" label="New Extra / Miscellaneous Charges (₹)">
                    <InputNumber min={0} style={{ width: "100%" }} prefix="₹" placeholder="0" />
                  </Form.Item>
                </Col>
                <Col xs={24} sm={12}>
                  <Form.Item name="promoteTransportFee" label="Default Transport Fee (₹) [If applicable]">
                    <InputNumber min={0} style={{ width: "100%" }} prefix="₹" placeholder="0" />
                  </Form.Item>
                </Col>
              </Row>

              <div style={{ display: "flex", justifyContent: "space-between", marginTop: 20 }}>
                <Button onClick={() => setPromoteStep(0)}>Back</Button>
                <Button type="primary" icon={<ArrowRightOutlined />} onClick={() => setPromoteStep(2)}>
                  Next: Review & Confirm
                </Button>
              </div>
            </div>
          )}

          {/* STEP 2: Review & Confirm */}
          {promoteStep === 2 && (
            <div>
              <Alert
                type="warning"
                showIcon
                message="Step 3: Review and Confirm Promotion"
                description={`You are about to promote ${promoteSelectedStudentIds.length} students to their new session. Please review the details below before executing.`}
                style={{ marginBottom: 16 }}
              />

              <Descriptions bordered size="small" column={2} style={{ marginBottom: 20 }}>
                <Descriptions.Item label="Students Selected">
                  <Tag color="blue" style={{ fontSize: 13, fontWeight: 700 }}>
                    {promoteSelectedStudentIds.length} Students
                  </Tag>
                </Descriptions.Item>
                <Descriptions.Item label="Action">
                  <Tag color="green">PROMOTE TO NEXT SESSION</Tag>
                </Descriptions.Item>
                <Descriptions.Item label="Destination Session">
                  {academicYears.find((y) => y._id === promoteForm.getFieldValue("targetYear"))?.name || "Selected Session"}
                </Descriptions.Item>
                <Descriptions.Item label="Destination Class & Sec">
                  {classes.find((c) => c._id === promoteForm.getFieldValue("targetClassId"))?.name || "Class"} -{" "}
                  {promoteTargetSections.find((s) => s._id === promoteForm.getFieldValue("targetSectionId"))?.name || "Section"}
                </Descriptions.Item>
                <Descriptions.Item label="Annual Charges">
                  ₹{Number(promoteForm.getFieldValue("promoteAnnualCharges") || 0).toLocaleString()}
                </Descriptions.Item>
                <Descriptions.Item label="Tuition Fee">
                  ₹{Number(promoteForm.getFieldValue("promoteMonthlyTuition") || 0).toLocaleString()}/mo
                </Descriptions.Item>
                <Descriptions.Item label="Transport Carry-Forward">
                  {promoteForm.getFieldValue("carryOverTransport") ? "YES (Retain routes)" : "NO"}
                </Descriptions.Item>
                <Descriptions.Item label="Scholarship Carry-Forward">
                  {promoteForm.getFieldValue("carryOverConcession") ? "YES (Retain discounts)" : "NO"}
                </Descriptions.Item>
              </Descriptions>

              <div style={{ display: "flex", justifyContent: "space-between", marginTop: 20 }}>
                <Button onClick={() => setPromoteStep(1)}>Back</Button>
                <Button
                  type="primary"
                  htmlType="submit"
                  loading={promoteSubmitting}
                  style={{ background: "#10b981", borderColor: "#10b981", fontWeight: 700 }}
                  icon={<CheckOutlined />}
                >
                  Execute Promotion & Fee Allocation
                </Button>
              </div>
            </div>
          )}
        </Form>
      </Modal>

      {/* 6. Edit Student Modal */}
      <Modal
        title={`Edit Student Details: ${
          editingStudent
            ? `${editingStudent.firstName} ${editingStudent.lastName || ""}`
            : ""
        }`}
        open={editModalOpen}
        onCancel={() => setEditModalOpen(false)}
        footer={null}
        width={680}
        destroyOnClose
      >
        <Form
          form={editForm}
          layout="vertical"
          onFinish={handleUpdateStudent}
          requiredMark="optional"
          style={{ marginTop: 16 }}
        >
          <Row gutter={16}>
            <Col xs={24} sm={12}>
              <Form.Item
                name="firstName"
                label="First Name"
                rules={[{ required: true, message: "Enter first name" }]}
              >
                <Input placeholder="First Name" />
              </Form.Item>
            </Col>
            <Col xs={24} sm={12}>
              <Form.Item name="lastName" label="Last Name">
                <Input placeholder="Last Name" />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col xs={24} sm={8}>
              <Form.Item name="gender" label="Gender">
                <Select placeholder="Select Gender">
                  <Option value="male">Male</Option>
                  <Option value="female">Female</Option>
                  <Option value="other">Other</Option>
                </Select>
              </Form.Item>
            </Col>
            <Col xs={24} sm={8}>
              <Form.Item name="dateOfBirth" label="Date of Birth">
                <DatePicker style={{ width: "100%" }} format="YYYY-MM-DD" />
              </Form.Item>
            </Col>
            <Col xs={24} sm={8}>
              <Form.Item name="bloodGroup" label="Blood Group">
                <Select placeholder="Blood Group">
                  {["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"].map((bg) => (
                    <Option key={bg} value={bg}>
                      {bg}
                    </Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
          </Row>

          <Divider style={{ margin: "14px 0" }}>
            <span style={{ fontSize: 13, color: "#64748b" }}>
              Guardian / Parent Contact Details
            </span>
          </Divider>

          <Row gutter={16}>
            <Col xs={24} sm={12}>
              <Form.Item
                name="guardianName"
                label="Guardian / Parent Name"
                rules={[{ required: true, message: "Enter guardian name" }]}
              >
                <Input placeholder="e.g. Mr. Rajesh Sharma" />
              </Form.Item>
            </Col>
            <Col xs={24} sm={12}>
              <Form.Item
                name="guardianPhone"
                label="Guardian Phone"
                rules={[{ required: true, message: "Enter guardian phone" }]}
              >
                <Input placeholder="e.g. 9876543210" />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col xs={24} sm={12}>
              <Form.Item name="guardianRelation" label="Relationship">
                <Select placeholder="Relationship">
                  <Option value="Father">Father</Option>
                  <Option value="Mother">Mother</Option>
                  <Option value="Guardian">Guardian</Option>
                  <Option value="Other">Other</Option>
                </Select>
              </Form.Item>
            </Col>
            <Col xs={24} sm={12}>
              <Form.Item name="phone" label="Student Phone Number">
                <Input placeholder="Student Phone" />
              </Form.Item>
            </Col>
          </Row>

          <div style={{ textAlign: "right", marginTop: 16 }}>
            <Space>
              <Button onClick={() => setEditModalOpen(false)}>Cancel</Button>
              <Button type="primary" htmlType="submit" loading={editSubmitting}>
                Save Changes
              </Button>
            </Space>
          </div>
        </Form>
      </Modal>

      {/* Quick Transport Assignment Modal */}
      <Modal
        title={
          <Space>
            <CarOutlined style={{ color: "#fa8c16" }} />
            <span>
              Assign School Bus: <b>{quickTransportStudent?.firstName} {quickTransportStudent?.lastName || ""}</b> (Adm: {quickTransportStudent?.admissionNumber})
            </span>
          </Space>
        }
        open={quickTransportModalOpen}
        onCancel={() => setQuickTransportModalOpen(false)}
        footer={null}
        destroyOnClose
        width={580}
      >
        <Form
          form={quickTransportForm}
          layout="vertical"
          onFinish={handleQuickTransportSubmit}
          style={{ marginTop: 16 }}
        >
          <Form.Item
            name="vehicleId"
            label="Select School Bus / Route"
            rules={[{ required: true, message: "Please select a bus route" }]}
          >
            <Select
              placeholder="Choose Bus & Route"
              onChange={handleQuickTransportVehicleSelect}
            >
              {transportVehicles.map((v) => (
                <Option key={v._id} value={v._id}>
                  <Tag color="volcano">{v.busNumber}</Tag> <b>{v.routeName}</b> (₹{v.annualFee?.toLocaleString()})
                </Option>
              ))}
            </Select>
          </Form.Item>

          <Row gutter={16}>
            <Col xs={24} sm={14}>
              <Form.Item
                name="pickupPoint"
                label="Pickup / Boarding Stop"
                rules={[{ required: true, message: "Enter pickup stop" }]}
              >
                <Input placeholder="e.g. Sector 14 Community Center" prefix={<EnvironmentOutlined style={{ color: "#ef4444" }} />} />
              </Form.Item>
            </Col>
            <Col xs={24} sm={10}>
              <Form.Item
                name="annualFee"
                label="Annual Transport Fee (₹)"
                rules={[{ required: true, message: "Enter fee amount" }]}
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
              Automatically synchronize student fee record with this transport fee
            </Checkbox>
          </Form.Item>

          <div style={{ textAlign: "right", marginTop: 16 }}>
            <Space>
              <Button onClick={() => setQuickTransportModalOpen(false)}>Cancel</Button>
              <Button type="primary" htmlType="submit" loading={quickTransportSubmitting}>
                Save Bus Allocation
              </Button>
            </Space>
          </div>
        </Form>
      </Modal>
    </div>
  );
}
