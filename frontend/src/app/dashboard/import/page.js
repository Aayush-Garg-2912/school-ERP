"use client";

import React, { useState, useEffect } from "react";
import {
  Card,
  Tabs,
  Table,
  Button,
  Upload,
  Tag,
  Space,
  Row,
  Col,
  Typography,
  Alert,
  message,
  Progress,
  Divider,
  Statistic,
  Badge,
  Spin,
} from "antd";
import {
  CloudUploadOutlined,
  DownloadOutlined,
  FileExcelOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  UserAddOutlined,
  TeamOutlined,
  BookOutlined,
  CarOutlined,
  ApartmentOutlined,
  ReloadOutlined,
  KeyOutlined,
  InfoCircleOutlined,
  InboxOutlined,
} from "@ant-design/icons";
import * as XLSX from "xlsx";
import api from "@/lib/api";
import { useAuth } from "@/context/AuthContext";

const { Title, Text, Paragraph } = Typography;
const { Dragger } = Upload;

// ==========================================
// TEMPLATE & COLUMN SPECIFICATIONS DEFINITIONS
// ==========================================
const ENTITY_CONFIGS = {
  students: {
    key: "students",
    label: "Students Admissions",
    icon: <UserAddOutlined />,
    apiEndpoint: "/import/students",
    filename: "Student_Admissions_Template",
    description:
      "Bulk enroll students into classes and sections. The system will automatically provision unique Admission Numbers, Roll Numbers, Student Portal accounts, Parent Portal accounts, and assign Bus Transportation if specified.",
    columnsSpec: [
      {
        title: "Column Header",
        dataIndex: "column",
        key: "column",
        render: (c) => <Text code strong>{c}</Text>,
      },
      {
        title: "Requirement",
        dataIndex: "required",
        key: "required",
        render: (r) =>
          r ? <Tag color="error">Required</Tag> : <Tag color="default">Optional</Tag>,
      },
      {
        title: "Format / Rules",
        dataIndex: "format",
        key: "format",
      },
      {
        title: "Sample Value",
        dataIndex: "sample",
        key: "sample",
        render: (s) => <Text type="secondary">{s}</Text>,
      },
      {
        title: "Behavior / System Automation",
        dataIndex: "notes",
        key: "notes",
      },
    ],
    specRows: [
      {
        key: "1",
        column: "firstName",
        required: true,
        format: "Text (Letters)",
        sample: "Aarav",
        notes: "Student's primary given name",
      },
      {
        key: "2",
        column: "lastName",
        required: false,
        format: "Text (Letters)",
        sample: "Sharma",
        notes: "Family / surname",
      },
      {
        key: "3",
        column: "className",
        required: true,
        format: "Class Name or Code",
        sample: "Grade 10 (or 10)",
        notes: "Must match an existing Class in the active session",
      },
      {
        key: "4",
        column: "sectionName",
        required: true,
        format: "Section Name or Code",
        sample: "A (or Section A)",
        notes: "Must match a Section under the selected Class",
      },
      {
        key: "5",
        column: "rollNumber",
        required: false,
        format: "Integer number",
        sample: "15 (or blank)",
        notes: "Leave blank for automated sequential roll assignment",
      },
      {
        key: "6",
        column: "admissionNumber",
        required: false,
        format: "Unique string",
        sample: "GIS-2026-0089 (or blank)",
        notes: "Leave blank for automated GIS-2026-XXXX format",
      },
      {
        key: "7",
        column: "gender",
        required: false,
        format: "male / female / other",
        sample: "male",
        notes: "Defaults to 'male' if omitted",
      },
      {
        key: "8",
        column: "dob",
        required: false,
        format: "YYYY-MM-DD",
        sample: "2012-05-18",
        notes: "Used to generate student & parent default passwords",
      },
      {
        key: "9",
        column: "email",
        required: false,
        format: "Valid Email address",
        sample: "aarav.sharma@example.com",
        notes: "If empty, phone or name+roll is used for student portal login",
      },
      {
        key: "10",
        column: "phone",
        required: false,
        format: "10-digit number",
        sample: "9876543210",
        notes: "Serves as student username if email is empty",
      },
      {
        key: "11",
        column: "busNumber",
        required: false,
        format: "Vehicle / Bus Number",
        sample: "BUS-01",
        notes: "If provided, automatically links student to that bus fleet",
      },
      {
        key: "12",
        column: "pickupStop",
        required: false,
        format: "Stop name",
        sample: "Sector 14 Market",
        notes: "Designated pickup & drop bus stop",
      },
      {
        key: "13",
        column: "parentName",
        required: false,
        format: "Text (Full name)",
        sample: "Rajesh Sharma",
        notes: "Automatically creates parent account & login slip",
      },
      {
        key: "14",
        column: "parentPhone",
        required: false,
        format: "10-digit number",
        sample: "9812345678",
        notes: "Used as parent username for portal login",
      },
      {
        key: "15",
        column: "parentEmail",
        required: false,
        format: "Valid Email",
        sample: "rajesh.parent@example.com",
        notes: "Optional parent notification email",
      },
    ],
    sampleData: [
      {
        firstName: "Aarav",
        lastName: "Sharma",
        className: "Grade 10",
        sectionName: "A",
        rollNumber: 1,
        admissionNumber: "AUTO",
        gender: "male",
        dob: "2012-05-14",
        email: "aarav.s@example.com",
        phone: "9876543210",
        busNumber: "BUS-01",
        pickupStop: "Sector 14",
        parentName: "Rajesh Sharma",
        parentPhone: "9811122233",
        parentEmail: "rajesh.sharma@example.com",
      },
      {
        firstName: "Diya",
        lastName: "Patel",
        className: "Grade 10",
        sectionName: "A",
        rollNumber: 2,
        admissionNumber: "AUTO",
        gender: "female",
        dob: "2012-08-22",
        email: "",
        phone: "9876543211",
        busNumber: "BUS-02",
        pickupStop: "City Center",
        parentName: "Sanjay Patel",
        parentPhone: "9822233344",
        parentEmail: "",
      },
      {
        firstName: "Kabir",
        lastName: "Verma",
        className: "Grade 10",
        sectionName: "B",
        rollNumber: 1,
        admissionNumber: "AUTO",
        gender: "male",
        dob: "2012-11-03",
        email: "",
        phone: "",
        busNumber: "",
        pickupStop: "",
        parentName: "Sunil Verma",
        parentPhone: "9833344455",
        parentEmail: "sunil.verma@example.com",
      },
    ],
  },

  teachers: {
    key: "teachers",
    label: "Teachers & Staff",
    icon: <TeamOutlined />,
    apiEndpoint: "/import/teachers",
    filename: "Teachers_Onboarding_Template",
    description:
      "Bulk onboard faculty and teachers into the institution. The system automatically creates Teacher records, provisions employee accounts, and establishes portal credentials.",
    columnsSpec: [
      {
        title: "Column Header",
        dataIndex: "column",
        key: "column",
        render: (c) => <Text code strong>{c}</Text>,
      },
      {
        title: "Requirement",
        dataIndex: "required",
        key: "required",
        render: (r) =>
          r ? <Tag color="error">Required</Tag> : <Tag color="default">Optional</Tag>,
      },
      {
        title: "Format / Rules",
        dataIndex: "format",
        key: "format",
      },
      {
        title: "Sample Value",
        dataIndex: "sample",
        key: "sample",
        render: (s) => <Text type="secondary">{s}</Text>,
      },
      {
        title: "Notes",
        dataIndex: "notes",
        key: "notes",
      },
    ],
    specRows: [
      {
        key: "1",
        column: "firstName",
        required: true,
        format: "Text (Letters)",
        sample: "Priya",
        notes: "Teacher's first name",
      },
      {
        key: "2",
        column: "lastName",
        required: false,
        format: "Text (Letters)",
        sample: "Kapoor",
        notes: "Teacher's surname",
      },
      {
        key: "3",
        column: "employeeId",
        required: false,
        format: "Unique alphanumeric code",
        sample: "TCH101 (or blank)",
        notes: "Leave blank for automated TCH101, TCH102 generation",
      },
      {
        key: "4",
        column: "email",
        required: false,
        format: "Valid email address",
        sample: "priya.kapoor@school.edu",
        notes: "Used for login and official notifications",
      },
      {
        key: "5",
        column: "phone",
        required: false,
        format: "10-digit number",
        sample: "9876543201",
        notes: "Primary phone contact",
      },
      {
        key: "6",
        column: "department",
        required: false,
        format: "Department Name",
        sample: "Mathematics",
        notes: "Department categorization",
      },
      {
        key: "7",
        column: "designation",
        required: false,
        format: "Title",
        sample: "Senior PGT Teacher",
        notes: "Job designation",
      },
      {
        key: "8",
        column: "qualification",
        required: false,
        format: "Degrees",
        sample: "M.Sc. Mathematics, B.Ed",
        notes: "Academic credentials",
      },
      {
        key: "9",
        column: "gender",
        required: false,
        format: "female / male / other",
        sample: "female",
        notes: "Defaults to 'female' if omitted",
      },
    ],
    sampleData: [
      {
        firstName: "Priya",
        lastName: "Kapoor",
        employeeId: "TCH101",
        email: "priya.kapoor@example.com",
        phone: "9876500001",
        department: "Mathematics",
        designation: "Senior PGT Teacher",
        qualification: "M.Sc. Mathematics, B.Ed",
        gender: "female",
      },
      {
        firstName: "Rohan",
        lastName: "Gupta",
        employeeId: "TCH102",
        email: "rohan.gupta@example.com",
        phone: "9876500002",
        department: "Science",
        designation: "TGT Science Teacher",
        qualification: "M.Sc. Physics",
        gender: "male",
      },
      {
        firstName: "Anjali",
        lastName: "Nair",
        employeeId: "TCH103",
        email: "anjali.nair@example.com",
        phone: "9876500003",
        department: "Languages",
        designation: "English Lecturer",
        qualification: "M.A. English, B.Ed",
        gender: "female",
      },
    ],
  },

  classesSections: {
    key: "classesSections",
    label: "Classes & Sections",
    icon: <ApartmentOutlined />,
    apiEndpoint: "/import/classes-sections",
    filename: "Classes_Sections_Template",
    description:
      "Bulk create academic grades and section divisions for the current session. If the class already exists, sections are safely added under it.",
    columnsSpec: [
      {
        title: "Column Header",
        dataIndex: "column",
        key: "column",
        render: (c) => <Text code strong>{c}</Text>,
      },
      {
        title: "Requirement",
        dataIndex: "required",
        key: "required",
        render: (r) =>
          r ? <Tag color="error">Required</Tag> : <Tag color="default">Optional</Tag>,
      },
      {
        title: "Format / Rules",
        dataIndex: "format",
        key: "format",
      },
      {
        title: "Sample Value",
        dataIndex: "sample",
        key: "sample",
        render: (s) => <Text type="secondary">{s}</Text>,
      },
      {
        title: "Notes",
        dataIndex: "notes",
        key: "notes",
      },
    ],
    specRows: [
      {
        key: "1",
        column: "className",
        required: true,
        format: "Text (Grade Name)",
        sample: "Grade 9",
        notes: "Full grade name",
      },
      {
        key: "2",
        column: "classCode",
        required: true,
        format: "Alphanumeric",
        sample: "G9 (or 9)",
        notes: "Unique short code for the grade",
      },
      {
        key: "3",
        column: "sectionName",
        required: true,
        format: "Section identifier",
        sample: "A (or Section A)",
        notes: "Division label",
      },
      {
        key: "4",
        column: "sectionCode",
        required: false,
        format: "Alphanumeric",
        sample: "A",
        notes: "Short code for division",
      },
      {
        key: "5",
        column: "capacity",
        required: false,
        format: "Integer",
        sample: "45",
        notes: "Maximum student seating capacity (default 40)",
      },
      {
        key: "6",
        column: "roomNumber",
        required: false,
        format: "Text",
        sample: "Room 204",
        notes: "Assigned classroom room number",
      },
    ],
    sampleData: [
      {
        className: "Grade 9",
        classCode: "G9",
        sectionName: "A",
        sectionCode: "A",
        capacity: 45,
        roomNumber: "Room 101",
      },
      {
        className: "Grade 9",
        classCode: "G9",
        sectionName: "B",
        sectionCode: "B",
        capacity: 45,
        roomNumber: "Room 102",
      },
      {
        className: "Grade 10",
        classCode: "G10",
        sectionName: "A",
        sectionCode: "A",
        capacity: 40,
        roomNumber: "Room 201",
      },
      {
        className: "Grade 10",
        classCode: "G10",
        sectionName: "B",
        sectionCode: "B",
        capacity: 40,
        roomNumber: "Room 202",
      },
    ],
  },

  subjects: {
    key: "subjects",
    label: "Subjects Catalog",
    icon: <BookOutlined />,
    apiEndpoint: "/import/subjects",
    filename: "Subjects_Catalog_Template",
    description:
      "Bulk define institutional subject catalog with course codes, theory/practical evaluations, and maximum marks.",
    columnsSpec: [
      {
        title: "Column Header",
        dataIndex: "column",
        key: "column",
        render: (c) => <Text code strong>{c}</Text>,
      },
      {
        title: "Requirement",
        dataIndex: "required",
        key: "required",
        render: (r) =>
          r ? <Tag color="error">Required</Tag> : <Tag color="default">Optional</Tag>,
      },
      {
        title: "Format / Rules",
        dataIndex: "format",
        key: "format",
      },
      {
        title: "Sample Value",
        dataIndex: "sample",
        key: "sample",
        render: (s) => <Text type="secondary">{s}</Text>,
      },
      {
        title: "Notes",
        dataIndex: "notes",
        key: "notes",
      },
    ],
    specRows: [
      {
        key: "1",
        column: "name",
        required: true,
        format: "Text",
        sample: "Mathematics",
        notes: "Subject course name",
      },
      {
        key: "2",
        column: "code",
        required: true,
        format: "Alphanumeric Code",
        sample: "MATH101",
        notes: "Subject identification code",
      },
      {
        key: "3",
        column: "type",
        required: false,
        format: "theory / practical / both",
        sample: "theory",
        notes: "Assessment evaluation type (default 'theory')",
      },
      {
        key: "4",
        column: "maxMarks",
        required: false,
        format: "Integer",
        sample: "100",
        notes: "Maximum possible score (default 100)",
      },
      {
        key: "5",
        column: "passingMarks",
        required: false,
        format: "Integer",
        sample: "33",
        notes: "Minimum score required to pass (default 33)",
      },
      {
        key: "6",
        column: "isOptional",
        required: false,
        format: "true / false",
        sample: "false",
        notes: "Whether elective or mandatory",
      },
    ],
    sampleData: [
      {
        name: "Mathematics",
        code: "MATH101",
        type: "theory",
        maxMarks: 100,
        passingMarks: 33,
        isOptional: false,
      },
      {
        name: "Physics",
        code: "PHY101",
        type: "both",
        maxMarks: 100,
        passingMarks: 33,
        isOptional: false,
      },
      {
        name: "Computer Science",
        code: "CS101",
        type: "practical",
        maxMarks: 100,
        passingMarks: 40,
        isOptional: true,
      },
      {
        name: "English Literature",
        code: "ENG101",
        type: "theory",
        maxMarks: 100,
        passingMarks: 33,
        isOptional: false,
      },
    ],
  },

  transport: {
    key: "transport",
    label: "Transport & Buses",
    icon: <CarOutlined />,
    apiEndpoint: "/import/transport",
    filename: "Transport_Vehicles_Template",
    description:
      "Bulk import school bus fleet, routes, driver contacts, schedules, and intermediate pickup/drop bus stops.",
    columnsSpec: [
      {
        title: "Column Header",
        dataIndex: "column",
        key: "column",
        render: (c) => <Text code strong>{c}</Text>,
      },
      {
        title: "Requirement",
        dataIndex: "required",
        key: "required",
        render: (r) =>
          r ? <Tag color="error">Required</Tag> : <Tag color="default">Optional</Tag>,
      },
      {
        title: "Format / Rules",
        dataIndex: "format",
        key: "format",
      },
      {
        title: "Sample Value",
        dataIndex: "sample",
        key: "sample",
        render: (s) => <Text type="secondary">{s}</Text>,
      },
      {
        title: "Notes",
        dataIndex: "notes",
        key: "notes",
      },
    ],
    specRows: [
      {
        key: "1",
        column: "busNumber",
        required: true,
        format: "Unique Code",
        sample: "BUS-01",
        notes: "Vehicle reference code",
      },
      {
        key: "2",
        column: "routeName",
        required: true,
        format: "Route Title",
        sample: "Route 1 - North Campus",
        notes: "Descriptive route name",
      },
      {
        key: "3",
        column: "driverName",
        required: true,
        format: "Text",
        sample: "Rajesh Kumar",
        notes: "Primary designated driver name",
      },
      {
        key: "4",
        column: "driverPhone",
        required: true,
        format: "10-digit number",
        sample: "9876543210",
        notes: "Driver emergency mobile contact",
      },
      {
        key: "5",
        column: "vehicleModel",
        required: false,
        format: "Model Name",
        sample: "Tata Starbus 40-Seater",
        notes: "Vehicle specification",
      },
      {
        key: "6",
        column: "registrationNumber",
        required: false,
        format: "RTO Registration Plate",
        sample: "DL 01 AB 1234",
        notes: "Government vehicle registration",
      },
      {
        key: "7",
        column: "capacity",
        required: false,
        format: "Integer",
        sample: "40",
        notes: "Passenger seating capacity",
      },
      {
        key: "8",
        column: "pickupTime",
        required: false,
        format: "Time string",
        sample: "07:15 AM",
        notes: "Morning route departure time",
      },
      {
        key: "9",
        column: "dropTime",
        required: false,
        format: "Time string",
        sample: "02:30 PM",
        notes: "Afternoon drop departure time",
      },
      {
        key: "10",
        column: "annualFee",
        required: false,
        format: "Currency amount",
        sample: "12000",
        notes: "Annual transport service fee",
      },
      {
        key: "11",
        column: "stops",
        required: false,
        format: "Comma-separated text",
        sample: "Sector 14 (07:15 AM), Sector 18 (07:30 AM), City Center (07:45 AM)",
        notes: "Intermediate bus stops with optional time in parentheses",
      },
    ],
    sampleData: [
      {
        busNumber: "BUS-01",
        routeName: "Route 1 - North Suburbs",
        driverName: "Rajesh Kumar",
        driverPhone: "9876543210",
        vehicleModel: "Tata Starbus 40-Seater",
        registrationNumber: "DL 01 AB 1234",
        capacity: 40,
        pickupTime: "07:15 AM",
        dropTime: "02:30 PM",
        annualFee: 12000,
        stops: "Sector 14 Market (07:15 AM), Sector 18 Metro (07:30 AM), City Center (07:45 AM)",
      },
      {
        busNumber: "BUS-02",
        routeName: "Route 2 - South Ring Road",
        driverName: "Manoj Singh",
        driverPhone: "9876543212",
        vehicleModel: "Ashok Leyland 45-Seater",
        registrationNumber: "DL 02 CD 5678",
        capacity: 45,
        pickupTime: "07:20 AM",
        dropTime: "02:35 PM",
        annualFee: 14000,
        stops: "Green Park (07:20 AM), AIIMS Gate (07:35 AM), South Extension (07:50 AM)",
      },
    ],
  },
};

// ==========================================
// INDIVIDUAL IMPORT TAB COMPONENT
// ==========================================
function ImportEntityView({ config }) {
  const [fileList, setFileList] = useState([]);
  const [parsedRows, setParsedRows] = useState([]);
  const [importing, setImporting] = useState(false);
  const [results, setResults] = useState(null);

  // 1. Download Pre-Formatted Excel Template (.xlsx)
  const handleDownloadExcel = () => {
    try {
      const ws = XLSX.utils.json_to_sheet(config.sampleData);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Template");
      XLSX.writeFile(wb, `${config.filename}.xlsx`);
      message.success(`Downloaded ${config.filename}.xlsx template`);
    } catch (err) {
      console.error("Excel generation error:", err);
      message.error("Failed to generate Excel template");
    }
  };

  // 2. Download Pre-Formatted CSV Template (.csv)
  const handleDownloadCSV = () => {
    try {
      const ws = XLSX.utils.json_to_sheet(config.sampleData);
      const csvOutput = XLSX.utils.sheet_to_csv(ws);
      const blob = new Blob([csvOutput], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", `${config.filename}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      message.success(`Downloaded ${config.filename}.csv template`);
    } catch (err) {
      console.error("CSV generation error:", err);
      message.error("Failed to generate CSV template");
    }
  };

  // 3. Handle File Upload and Client Parsing
  const handleFileUpload = (file) => {
    const isExcelOrCsv =
      file.name.endsWith(".xlsx") ||
      file.name.endsWith(".xls") ||
      file.name.endsWith(".csv");

    if (!isExcelOrCsv) {
      message.error("Please upload an Excel (.xlsx, .xls) or CSV file!");
      return Upload.LIST_IGNORE;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const buffer = e.target.result;
        const workbook = XLSX.read(buffer, { type: "array" });
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        const rawJson = XLSX.utils.sheet_to_json(worksheet, { defval: "" });

        if (rawJson.length === 0) {
          message.warning("The uploaded file contains no data rows.");
          return;
        }

        // Normalize keys (trim and case-insensitive check)
        const sanitized = rawJson.map((row) => {
          const cleanObj = {};
          Object.keys(row).forEach((k) => {
            const cleanKey = k.trim();
            cleanObj[cleanKey] = row[k];
          });
          return cleanObj;
        });

        setParsedRows(sanitized);
        setFileList([file]);
        setResults(null);
        message.success(`Successfully parsed ${sanitized.length} rows from ${file.name}`);
      } catch (parseErr) {
        console.error("File parse error:", parseErr);
        message.error("Failed to parse file. Please verify file format and columns.");
      }
    };

    reader.readAsArrayBuffer(file);
    return false; // Prevent automatic upload
  };

  // 4. Submit Parsed Rows to Backend
  const handleExecuteImport = async () => {
    if (parsedRows.length === 0) {
      message.warning("Please upload a file containing data first.");
      return;
    }

    setImporting(true);
    try {
      const { data } = await api.post(config.apiEndpoint, { rows: parsedRows });
      if (data.success) {
        message.success(data.message || "Import processed successfully!");
        setResults(data.data);
      }
    } catch (err) {
      console.error("Import execution failed:", err);
      message.error(err.response?.data?.message || "Failed to execute bulk import");
    } finally {
      setImporting(false);
    }
  };

  // 5. Export Generated Credentials (for Students / Teachers)
  const handleExportCredentials = () => {
    if (!results?.credentials || results.credentials.length === 0) {
      message.warning("No generated credentials to export");
      return;
    }

    try {
      const ws = XLSX.utils.json_to_sheet(results.credentials);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Credentials");
      XLSX.writeFile(wb, `${config.key}_Generated_Credentials.xlsx`);
      message.success("Credentials exported successfully!");
    } catch (err) {
      console.error("Export credentials error:", err);
      message.error("Failed to export credentials");
    }
  };

  const handleReset = () => {
    setFileList([]);
    setParsedRows([]);
    setResults(null);
  };

  // Dynamic preview table columns from the parsed data
  const previewColumns =
    parsedRows.length > 0
      ? Object.keys(parsedRows[0]).map((key) => ({
          title: key,
          dataIndex: key,
          key: key,
          ellipsis: true,
          render: (val) => String(val || "—"),
        }))
      : [];

  // Credentials table columns
  const credentialColumns = [
    { title: "Row", dataIndex: "row", key: "row", width: 65 },
    {
      title: "Name",
      key: "name",
      render: (_, r) => <Text strong>{r.studentName || r.teacherName}</Text>,
    },
    {
      title: "Identifier",
      key: "id",
      render: (_, r) => <Text code>{r.admissionNumber || r.employeeId}</Text>,
    },
    ...(config.key === "students"
      ? [
          { title: "Class & Section", dataIndex: "classSection", key: "classSection" },
          {
            title: "Student Username",
            dataIndex: "studentUsername",
            key: "studentUsername",
            render: (u) => <Tag color="blue">{u}</Tag>,
          },
          {
            title: "Student Password",
            dataIndex: "studentPassword",
            key: "studentPassword",
            render: (p) => <Text code copyable>{p}</Text>,
          },
          { title: "Parent Name", dataIndex: "parentName", key: "parentName" },
          {
            title: "Parent Username",
            dataIndex: "parentUsername",
            key: "parentUsername",
            render: (u) => <Tag color="green">{u}</Tag>,
          },
          {
            title: "Parent Password",
            dataIndex: "parentPassword",
            key: "parentPassword",
            render: (p) => <Text code copyable>{p}</Text>,
          },
          {
            title: "Bus",
            dataIndex: "busAssigned",
            key: "busAssigned",
            render: (b) => (b && b !== "None" ? <Tag color="cyan">{b}</Tag> : <Text type="secondary">—</Text>),
          },
        ]
      : [
          { title: "Department", dataIndex: "department", key: "department" },
          { title: "Designation", dataIndex: "designation", key: "designation" },
          {
            title: "Login Username",
            dataIndex: "username",
            key: "username",
            render: (u) => <Tag color="blue">{u}</Tag>,
          },
          {
            title: "Default Password",
            dataIndex: "password",
            key: "password",
            render: (p) => <Text code copyable>{p}</Text>,
          },
        ]),
  ];

  return (
    <div>
      {/* Entity Overview Card */}
      <Card
        style={{
          marginBottom: 20,
          borderRadius: 12,
          background: "linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%)",
          border: "1px solid #e2e8f0",
        }}
      >
        <Row justify="space-between" align="middle" gutter={[16, 16]}>
          <Col xs={24} md={16}>
            <Title level={4} style={{ margin: 0, display: "flex", alignItems: "center", gap: 10 }}>
              {config.icon} {config.label} Bulk Import
            </Title>
            <Paragraph type="secondary" style={{ marginTop: 6, marginBottom: 0 }}>
              {config.description}
            </Paragraph>
          </Col>
          <Col xs={24} md={8} style={{ textAlign: "right" }}>
            <Space wrap>
              <Button
                type="primary"
                icon={<FileExcelOutlined />}
                onClick={handleDownloadExcel}
                style={{ background: "#107c41", borderColor: "#107c41" }}
              >
                Download Excel (.xlsx)
              </Button>
              <Button icon={<DownloadOutlined />} onClick={handleDownloadCSV}>
                Download CSV (.csv)
              </Button>
            </Space>
          </Col>
        </Row>
      </Card>

      {/* Column Specifications Table */}
      <Card
        title={
          <Space>
            <InfoCircleOutlined style={{ color: "#1677ff" }} />
            <span>Excel / CSV Required Column Names & Format Guide</span>
          </Space>
        }
        size="small"
        style={{ marginBottom: 20, borderRadius: 12, boxShadow: "0 2px 8px rgba(0,0,0,0.04)" }}
      >
        <Table
          columns={config.columnsSpec}
          dataSource={config.specRows}
          pagination={false}
          size="small"
          bordered
        />
      </Card>

      {/* File Upload Zone */}
      <Card
        title={
          <Space>
            <CloudUploadOutlined style={{ color: "#1677ff" }} />
            <span>Upload Completed Excel or CSV File</span>
          </Space>
        }
        style={{ marginBottom: 20, borderRadius: 12, boxShadow: "0 2px 8px rgba(0,0,0,0.04)" }}
      >
        <Dragger
          name="file"
          multiple={false}
          fileList={fileList}
          beforeUpload={handleFileUpload}
          onRemove={handleReset}
          accept=".xlsx,.xls,.csv"
          style={{ padding: "20px 0", background: "#fcfcfc" }}
        >
          <p className="ant-upload-drag-icon">
            <InboxOutlined style={{ color: "#1677ff", fontSize: 44 }} />
          </p>
          <p className="ant-upload-text" style={{ fontSize: 16, fontWeight: 600 }}>
            Click or drag your filled Excel (.xlsx) or CSV file here to upload
          </p>
          <p className="ant-upload-hint" style={{ color: "#8c8c8c" }}>
            Supports Microsoft Excel (.xlsx, .xls) and Comma-Separated Values (.csv). The first sheet will be parsed automatically.
          </p>
        </Dragger>

        {/* Action Controls for Parsed Data */}
        {parsedRows.length > 0 && (
          <div
            style={{
              marginTop: 16,
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              flexWrap: "wrap",
              gap: 12,
            }}
          >
            <Space>
              <Tag color="success" icon={<CheckCircleOutlined />}>
                {parsedRows.length} Records Detected
              </Tag>
              <Text type="secondary">Review preview below before proceeding</Text>
            </Space>

            <Space>
              <Button icon={<ReloadOutlined />} onClick={handleReset} disabled={importing}>
                Reset / Re-upload
              </Button>
              <Button
                type="primary"
                icon={<CloudUploadOutlined />}
                size="large"
                loading={importing}
                onClick={handleExecuteImport}
              >
                Import {parsedRows.length} {config.label} Into System
              </Button>
            </Space>
          </div>
        )}
      </Card>

      {/* Import Execution Results Card */}
      {results && (
        <Card
          title={
            <Space>
              <CheckCircleOutlined style={{ color: "#52c41a" }} />
              <span>Import Execution Results</span>
            </Space>
          }
          style={{ marginBottom: 20, borderRadius: 12, boxShadow: "0 2px 8px rgba(0,0,0,0.06)" }}
          extra={
            results.credentials?.length > 0 && (
              <Button
                type="primary"
                icon={<FileExcelOutlined />}
                onClick={handleExportCredentials}
                style={{ background: "#107c41", borderColor: "#107c41" }}
              >
                Export Credentials to Excel (.xlsx)
              </Button>
            )
          }
        >
          <Row gutter={[16, 16]} style={{ marginBottom: 20 }}>
            <Col xs={24} sm={8}>
              <Card size="small" style={{ background: "#f8fafc", textAlign: "center" }}>
                <Statistic title="Total Processed" value={results.total || 0} />
              </Card>
            </Col>
            <Col xs={24} sm={8}>
              <Card size="small" style={{ background: "#f6ffed", textAlign: "center" }}>
                <Statistic
                  title="Successfully Imported"
                  value={results.successCount || 0}
                  valueStyle={{ color: "#52c41a" }}
                />
              </Card>
            </Col>
            <Col xs={24} sm={8}>
              <Card size="small" style={{ background: "#fff1f0", textAlign: "center" }}>
                <Statistic
                  title="Failed / Skipped Rows"
                  value={results.errorCount || 0}
                  valueStyle={{ color: "#ff4d4f" }}
                />
              </Card>
            </Col>
          </Row>

          {/* Generated Login Credentials Table */}
          {results.credentials?.length > 0 && (
            <div style={{ marginTop: 20 }}>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginBottom: 12,
                }}
              >
                <Title level={5} style={{ margin: 0 }}>
                  <KeyOutlined style={{ color: "#1677ff", marginRight: 8 }} />
                  Auto-Generated Portal Credentials & Login Slips
                </Title>
                <Text type="secondary">
                  Distribute these portal identifiers to students & parents
                </Text>
              </div>
              <Table
                columns={credentialColumns}
                dataSource={results.credentials}
                rowKey="row"
                pagination={{ pageSize: 10 }}
                size="small"
                bordered
              />
            </div>
          )}

          {/* Errors Breakdown Table */}
          {results.errors?.length > 0 && (
            <div style={{ marginTop: 24 }}>
              <Title level={5} style={{ color: "#cf1322", marginBottom: 12 }}>
                <CloseCircleOutlined style={{ marginRight: 8 }} />
                Row Validation Errors ({results.errors.length})
              </Title>
              <Table
                columns={[
                  { title: "Row #", dataIndex: "row", key: "row", width: 80 },
                  { title: "Target Item", dataIndex: "studentName" || "item", key: "item", render: (_, r) => r.studentName || r.teacherName || r.item || r.subject || r.bus || "—" },
                  {
                    title: "Failure Reason",
                    dataIndex: "error",
                    key: "error",
                    render: (err) => <Text type="danger">{err}</Text>,
                  },
                ]}
                dataSource={results.errors}
                rowKey="row"
                pagination={{ pageSize: 5 }}
                size="small"
              />
            </div>
          )}
        </Card>
      )}

      {/* Parsed Data Preview Table */}
      {parsedRows.length > 0 && (
        <Card
          title={
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span>
                File Data Preview (First {Math.min(parsedRows.length, 100)} Rows)
              </span>
              <Tag color="blue">{parsedRows.length} total entries</Tag>
            </div>
          }
          style={{ borderRadius: 12, boxShadow: "0 2px 8px rgba(0,0,0,0.04)" }}
        >
          <Table
            columns={previewColumns}
            dataSource={parsedRows.slice(0, 100)}
            rowKey={(_, idx) => idx}
            scroll={{ x: "max-content" }}
            pagination={{ pageSize: 10 }}
            size="small"
          />
        </Card>
      )}
    </div>
  );
}

// ==========================================
// MAIN DATA IMPORT CENTER COMPONENT
// ==========================================
export default function ImportCenterPage() {
  const { user, loading } = useAuth();
  const [activeTab, setActiveTab] = useState("students");

  if (loading) {
    return (
      <div style={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: 400 }}>
        <Spin size="large" tip="Loading Import Center..." />
      </div>
    );
  }

  // Access control: only executive admin roles
  const allowedRoles = ["chairman", "principal", "admin"];
  if (!allowedRoles.includes(user?.role)) {
    return (
      <Card style={{ margin: "20px auto", maxWidth: 600, textAlign: "center", borderRadius: 12 }}>
        <Alert
          type="error"
          showIcon
          message="Unauthorized Access"
          description="The Data Import Center is restricted to School Executive Administration (Chairman, Principal, Admin)."
        />
      </Card>
    );
  }

  const tabItems = [
    {
      key: "students",
      label: (
        <span>
          <UserAddOutlined /> Students Admissions
        </span>
      ),
      children: <ImportEntityView config={ENTITY_CONFIGS.students} />,
    },
    {
      key: "teachers",
      label: (
        <span>
          <TeamOutlined /> Teachers & Staff
        </span>
      ),
      children: <ImportEntityView config={ENTITY_CONFIGS.teachers} />,
    },
    {
      key: "classesSections",
      label: (
        <span>
          <ApartmentOutlined /> Classes & Sections
        </span>
      ),
      children: <ImportEntityView config={ENTITY_CONFIGS.classesSections} />,
    },
    {
      key: "subjects",
      label: (
        <span>
          <BookOutlined /> Subjects Catalog
        </span>
      ),
      children: <ImportEntityView config={ENTITY_CONFIGS.subjects} />,
    },
    {
      key: "transport",
      label: (
        <span>
          <CarOutlined /> Transport & Routes
        </span>
      ),
      children: <ImportEntityView config={ENTITY_CONFIGS.transport} />,
    },
  ];

  return (
    <div style={{ maxWidth: 1350, margin: "0 auto", paddingBottom: 40 }}>
      {/* Page Header */}
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
            <CloudUploadOutlined style={{ color: "#1677ff" }} /> Bulk Data Import Center
          </Title>
          <Text type="secondary">
            Rapidly populate school records by uploading Excel (.xlsx) or CSV files. Pre-formatted templates and column rules ensure smooth data ingestion.
          </Text>
        </div>
        <Tag color="purple" style={{ fontSize: 13, padding: "4px 10px" }}>
          Executive Admin Tool
        </Tag>
      </div>

      {/* Main Tabs */}
      <Tabs
        activeKey={activeTab}
        onChange={setActiveTab}
        type="card"
        items={tabItems}
        size="large"
      />
    </div>
  );
}
