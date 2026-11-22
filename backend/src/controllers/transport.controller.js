const mongoose = require("mongoose");
const TransportVehicle = require("../models/TransportVehicle");
const Student = require("../models/Student");
const StudentFee = require("../models/StudentFee");
const Parent = require("../models/Parent");
const ParentStudent = require("../models/ParentStudent");
const { calculateStudentFeeDetails } = require("../services/feeCalculation.service");

/**
 * Get all transport vehicles with seat occupancy and route details
 */
const getVehicles = async (req, res) => {
  try {
    const rawSchoolId = req.user.school?._id || req.user.school;
    const schoolObjectId = new mongoose.Types.ObjectId(String(rawSchoolId));

    const vehicles = await TransportVehicle.find({ school: schoolObjectId })
      .sort({ busNumber: 1 })
      .lean();

    // Calculate live seat allocations for each vehicle
    const vehicleListWithStats = await Promise.all(
      vehicles.map(async (v) => {
        const assignedStudentsCount = await Student.countDocuments({
          school: schoolObjectId,
          "transport.vehicle": v._id,
          "transport.opted": true,
          status: "active",
        });

        const availableSeats = Math.max(0, (v.capacity || 40) - assignedStudentsCount);

        return {
          ...v,
          assignedStudentsCount,
          availableSeats,
          occupancyPercentage:
            v.capacity > 0 ? Math.min(100, Math.round((assignedStudentsCount / v.capacity) * 100)) : 0,
        };
      })
    );

    return res.status(200).json({
      success: true,
      data: {
        vehicles: vehicleListWithStats,
      },
    });
  } catch (error) {
    console.error("Get Vehicles Error:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to fetch transport vehicles",
    });
  }
};

/**
 * Create a new transport vehicle
 */
const createVehicle = async (req, res) => {
  try {
    const rawSchoolId = req.user.school?._id || req.user.school;
    const {
      busNumber,
      vehicleModel,
      registrationNumber,
      capacity,
      routeName,
      driverName,
      driverPhone,
      driverLicense,
      attendantName,
      attendantPhone,
      pickupTime,
      dropTime,
      annualFee,
      stops,
      notes,
    } = req.body;

    if (!busNumber || !routeName || !driverName || !driverPhone) {
      return res.status(400).json({
        success: false,
        message: "Bus number, route name, driver name, and driver phone are required",
      });
    }

    const cleanBusNumber = String(busNumber).trim().toUpperCase();

    // Check duplicate bus number
    const existing = await TransportVehicle.findOne({
      school: rawSchoolId,
      busNumber: cleanBusNumber,
    });
    if (existing) {
      return res.status(409).json({
        success: false,
        message: `A vehicle with bus number '${cleanBusNumber}' already exists`,
      });
    }

    const vehicle = await TransportVehicle.create({
      school: rawSchoolId,
      busNumber: cleanBusNumber,
      vehicleModel: vehicleModel || "School Bus",
      registrationNumber: registrationNumber || "",
      capacity: Number(capacity) || 40,
      routeName: routeName.trim(),
      driverName: driverName.trim(),
      driverPhone: driverPhone.trim(),
      driverLicense: driverLicense || "",
      attendantName: attendantName || "",
      attendantPhone: attendantPhone || "",
      pickupTime: pickupTime || "07:30 AM",
      dropTime: dropTime || "02:30 PM",
      annualFee: Number(annualFee) || 12000,
      stops: Array.isArray(stops) ? stops : [],
      notes: notes || "",
    });

    return res.status(201).json({
      success: true,
      message: `Transport bus ${cleanBusNumber} created successfully`,
      data: {
        vehicle,
      },
    });
  } catch (error) {
    console.error("Create Vehicle Error:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to create transport vehicle",
    });
  }
};

/**
 * Get single vehicle with full passenger/student roster
 */
const getVehicleById = async (req, res) => {
  try {
    const rawSchoolId = req.user.school?._id || req.user.school;
    const vehicle = await TransportVehicle.findOne({
      _id: req.params.id,
      school: rawSchoolId,
    });

    if (!vehicle) {
      return res.status(404).json({
        success: false,
        message: "Transport vehicle not found",
      });
    }

    const assignedStudents = await Student.find({
      school: rawSchoolId,
      "transport.vehicle": vehicle._id,
      "transport.opted": true,
    })
      .populate("class", "name code")
      .populate("section", "name code")
      .select("admissionNumber firstName lastName rollNumber class section phone guardian transport status")
      .sort({ "class.name": 1, rollNumber: 1 });

    return res.status(200).json({
      success: true,
      data: {
        vehicle,
        assignedStudents,
        assignedCount: assignedStudents.length,
        availableSeats: Math.max(0, vehicle.capacity - assignedStudents.length),
      },
    });
  } catch (error) {
    console.error("Get Vehicle Details Error:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to fetch vehicle details",
    });
  }
};

/**
 * Update transport vehicle details
 */
const updateVehicle = async (req, res) => {
  try {
    const rawSchoolId = req.user.school?._id || req.user.school;
    const vehicle = await TransportVehicle.findOne({
      _id: req.params.id,
      school: rawSchoolId,
    });

    if (!vehicle) {
      return res.status(404).json({
        success: false,
        message: "Transport vehicle not found",
      });
    }

    const {
      busNumber,
      vehicleModel,
      registrationNumber,
      capacity,
      routeName,
      driverName,
      driverPhone,
      driverLicense,
      attendantName,
      attendantPhone,
      pickupTime,
      dropTime,
      annualFee,
      stops,
      status,
      notes,
    } = req.body;

    if (busNumber) {
      const cleanBus = String(busNumber).trim().toUpperCase();
      if (cleanBus !== vehicle.busNumber) {
        const duplicate = await TransportVehicle.findOne({
          school: rawSchoolId,
          busNumber: cleanBus,
          _id: { $ne: vehicle._id },
        });
        if (duplicate) {
          return res.status(409).json({
            success: false,
            message: `Bus number '${cleanBus}' is already assigned to another vehicle`,
          });
        }
        vehicle.busNumber = cleanBus;
      }
    }

    if (vehicleModel !== undefined) vehicle.vehicleModel = vehicleModel;
    if (registrationNumber !== undefined) vehicle.registrationNumber = registrationNumber;
    if (capacity !== undefined) vehicle.capacity = Number(capacity) || 40;
    if (routeName !== undefined) vehicle.routeName = routeName.trim();
    if (driverName !== undefined) vehicle.driverName = driverName.trim();
    if (driverPhone !== undefined) vehicle.driverPhone = driverPhone.trim();
    if (driverLicense !== undefined) vehicle.driverLicense = driverLicense;
    if (attendantName !== undefined) vehicle.attendantName = attendantName;
    if (attendantPhone !== undefined) vehicle.attendantPhone = attendantPhone;
    if (pickupTime !== undefined) vehicle.pickupTime = pickupTime;
    if (dropTime !== undefined) vehicle.dropTime = dropTime;
    if (annualFee !== undefined) vehicle.annualFee = Number(annualFee) || 0;
    if (Array.isArray(stops)) vehicle.stops = stops;
    if (status !== undefined) vehicle.status = status;
    if (notes !== undefined) vehicle.notes = notes;

    await vehicle.save();

    // Synchronize enrolled students with the updated vehicle information
    await Student.updateMany(
      {
        school: rawSchoolId,
        "transport.vehicle": vehicle._id,
      },
      {
        $set: {
          "transport.busNumber": vehicle.busNumber,
          "transport.routeName": vehicle.routeName,
          "transport.driverName": vehicle.driverName,
          "transport.driverPhone": vehicle.driverPhone,
          "transport.pickupTime": vehicle.pickupTime,
          "transport.dropTime": vehicle.dropTime,
        },
      }
    );

    return res.status(200).json({
      success: true,
      message: `Vehicle ${vehicle.busNumber} updated successfully`,
      data: {
        vehicle,
      },
    });
  } catch (error) {
    console.error("Update Vehicle Error:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to update vehicle",
    });
  }
};

/**
 * Delete a transport vehicle
 */
const deleteVehicle = async (req, res) => {
  try {
    const rawSchoolId = req.user.school?._id || req.user.school;
    const vehicle = await TransportVehicle.findOne({
      _id: req.params.id,
      school: rawSchoolId,
    });

    if (!vehicle) {
      return res.status(404).json({
        success: false,
        message: "Transport vehicle not found",
      });
    }

    // Unassign students from this vehicle so they aren't orphaned
    await Student.updateMany(
      {
        school: rawSchoolId,
        "transport.vehicle": vehicle._id,
      },
      {
        $set: {
          "transport.opted": false,
          "transport.vehicle": null,
          "transport.status": "inactive",
        },
      }
    );

    await vehicle.deleteOne();

    return res.status(200).json({
      success: true,
      message: `Transport bus ${vehicle.busNumber} deleted and passengers updated`,
    });
  } catch (error) {
    console.error("Delete Vehicle Error:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to delete vehicle",
    });
  }
};

/**
 * Get all students who have bus/transport services
 */
const getTransportStudents = async (req, res) => {
  try {
    const rawSchoolId = req.user.school?._id || req.user.school;
    const schoolObjectId = new mongoose.Types.ObjectId(String(rawSchoolId));
    const { vehicleId, classId, search } = req.query;

    const query = {
      school: schoolObjectId,
      "transport.opted": true,
    };

    if (vehicleId) {
      query["transport.vehicle"] = vehicleId;
    }

    if (classId) {
      query.class = classId;
    }

    if (search && String(search).trim() !== "") {
      const q = String(search).trim();
      query.$or = [
        { firstName: { $regex: q, $options: "i" } },
        { lastName: { $regex: q, $options: "i" } },
        { admissionNumber: { $regex: q, $options: "i" } },
        { "transport.busNumber": { $regex: q, $options: "i" } },
        { "transport.routeName": { $regex: q, $options: "i" } },
        { "transport.pickupPoint": { $regex: q, $options: "i" } },
        { "transport.driverName": { $regex: q, $options: "i" } },
      ];
    }

    const students = await Student.find(query)
      .populate("class", "name code")
      .populate("section", "name code")
      .populate("transport.vehicle", "busNumber vehicleModel routeName driverName driverPhone pickupTime dropTime status")
      .sort({ "class.name": 1, rollNumber: 1 });

    // Aggregate statistics
    const totalTransportStudents = await Student.countDocuments({
      school: schoolObjectId,
      "transport.opted": true,
    });

    const vehicles = await TransportVehicle.find({ school: schoolObjectId, status: "active" });
    const totalCapacity = vehicles.reduce((sum, v) => sum + (v.capacity || 40), 0);
    const totalSeatsAvailable = Math.max(0, totalCapacity - totalTransportStudents);

    return res.status(200).json({
      success: true,
      data: {
        students,
        stats: {
          totalTransportStudents,
          totalActiveVehicles: vehicles.length,
          totalCapacity,
          totalSeatsAvailable,
        },
      },
    });
  } catch (error) {
    console.error("Get Transport Students Error:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to fetch transport students",
    });
  }
};

/**
 * Assign or update transport bus for a student
 */
const assignStudentTransport = async (req, res) => {
  try {
    const rawSchoolId = req.user.school?._id || req.user.school;
    const {
      studentId,
      vehicleId,
      opted,
      pickupPoint,
      pickupTime,
      dropTime,
      annualFee,
      updateFeeRecord,
    } = req.body;

    if (!studentId) {
      return res.status(400).json({
        success: false,
        message: "Student ID is required",
      });
    }

    const student = await Student.findOne({
      _id: studentId,
      school: rawSchoolId,
    });

    if (!student) {
      return res.status(404).json({
        success: false,
        message: "Student not found",
      });
    }

    // CASE 1: Assign to a bus vehicle
    if (vehicleId && opted !== false) {
      const vehicle = await TransportVehicle.findOne({
        _id: vehicleId,
        school: rawSchoolId,
      });

      if (!vehicle) {
        return res.status(404).json({
          success: false,
          message: "Selected transport vehicle not found",
        });
      }

      const assignedFee = annualFee !== undefined ? Number(annualFee) : (vehicle.annualFee || 12000);
      const chosenStop = pickupPoint || vehicle.stops?.[0]?.stopName || vehicle.routeName;
      const morningTime = pickupTime || vehicle.pickupTime || "07:30 AM";
      const eveningTime = dropTime || vehicle.dropTime || "02:30 PM";

      student.transport = {
        opted: true,
        vehicle: vehicle._id,
        busNumber: vehicle.busNumber,
        routeName: vehicle.routeName,
        pickupPoint: chosenStop,
        pickupTime: morningTime,
        dropTime: eveningTime,
        driverName: vehicle.driverName,
        driverPhone: vehicle.driverPhone,
        annualFee: assignedFee,
        status: "active",
        assignedAt: new Date(),
      };

      await student.save();

      // Sync active StudentFee record if requested
      if (updateFeeRecord !== false) {
        const studentFee = await StudentFee.findOne({
          school: rawSchoolId,
          student: student._id,
        }).sort({ createdAt: -1 });

        if (studentFee) {
          studentFee.transportFee = assignedFee;
          studentFee.transportDetails = {
            opted: true,
            vehicle: vehicle._id,
            busNumber: vehicle.busNumber,
            route: vehicle.routeName,
            pickupPoint: chosenStop,
            pickupTime: morningTime,
            dropTime: eveningTime,
            driverName: vehicle.driverName,
            driverPhone: vehicle.driverPhone,
          };

          const recalculated = calculateStudentFeeDetails({
            annualCharges: studentFee.annualCharges,
            monthlyTuition: studentFee.monthlyTuition,
            tuitionMonths: studentFee.tuitionMonths || 12,
            transportFee: assignedFee,
            transportDetails: studentFee.transportDetails,
            extraFees: studentFee.extraFees,
            offer: studentFee.offer,
            discount: studentFee.discount,
            remarks: studentFee.remarks,
          });

          studentFee.components = recalculated.components;
          studentFee.totalAmount = recalculated.totalAmount;
          studentFee.discount = recalculated.discount;
          studentFee.payableAmount = recalculated.payableAmount;
          studentFee.dueAmount = Math.max(0, recalculated.payableAmount - (studentFee.paidAmount || 0));
          studentFee.status =
            studentFee.dueAmount === 0 ? "paid" : studentFee.paidAmount > 0 ? "partial" : "pending";

          await studentFee.save();
        }
      }

      return res.status(200).json({
        success: true,
        message: `Assigned Bus ${vehicle.busNumber} (${vehicle.routeName}) to ${student.firstName} ${student.lastName || ""}`,
        data: {
          student,
        },
      });
    }

    // CASE 2: Unassign / Opt out from transport
    student.transport = {
      opted: false,
      vehicle: null,
      busNumber: "",
      routeName: "",
      pickupPoint: "",
      pickupTime: "",
      dropTime: "",
      driverName: "",
      driverPhone: "",
      annualFee: 0,
      status: "inactive",
      assignedAt: new Date(),
    };

    await student.save();

    // Adjust fee record
    if (updateFeeRecord !== false) {
      const studentFee = await StudentFee.findOne({
        school: rawSchoolId,
        student: student._id,
      }).sort({ createdAt: -1 });

      if (studentFee) {
        studentFee.transportFee = 0;
        studentFee.transportDetails = {
          opted: false,
          vehicle: null,
          busNumber: "",
          route: "",
          pickupPoint: "",
          pickupTime: "",
          dropTime: "",
          driverName: "",
          driverPhone: "",
        };

        const recalculated = calculateStudentFeeDetails({
          annualCharges: studentFee.annualCharges,
          monthlyTuition: studentFee.monthlyTuition,
          tuitionMonths: studentFee.tuitionMonths || 12,
          transportFee: 0,
          transportDetails: { opted: false },
          extraFees: studentFee.extraFees,
          offer: studentFee.offer,
          discount: studentFee.discount,
          remarks: studentFee.remarks,
        });

        studentFee.components = recalculated.components;
        studentFee.totalAmount = recalculated.totalAmount;
        studentFee.discount = recalculated.discount;
        studentFee.payableAmount = recalculated.payableAmount;
        studentFee.dueAmount = Math.max(0, recalculated.payableAmount - (studentFee.paidAmount || 0));
        studentFee.status =
          studentFee.dueAmount === 0 ? "paid" : studentFee.paidAmount > 0 ? "partial" : "pending";

        await studentFee.save();
      }
    }

    return res.status(200).json({
      success: true,
      message: `Transport service removed for ${student.firstName} ${student.lastName || ""}`,
      data: {
        student,
      },
    });
  } catch (error) {
    console.error("Assign Transport Error:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to update transport allocation",
    });
  }
};

/**
 * Self-Service Transport Endpoint for Students & Parents
 * - Students can ONLY see their OWN transport details
 * - Parents can ONLY see their OWN linked children's transport details
 */
const getMyTransport = async (req, res) => {
  try {
    const rawSchoolId = req.user.school?._id || req.user.school;
    const roleName = req.user.role?.name || req.user.role;

    // STUDENT ROLE: View self transport details ONLY
    if (roleName === "student") {
      let student = null;
      if (req.user.student) {
        const studentId = req.user.student._id || req.user.student;
        student = await Student.findOne({ _id: studentId, school: rawSchoolId })
          .populate("class", "name code")
          .populate("section", "name code")
          .populate("transport.vehicle");
      }

      if (!student) {
        student = await Student.findOne({ user: req.user._id, school: rawSchoolId })
          .populate("class", "name code")
          .populate("section", "name code")
          .populate("transport.vehicle");
      }

      if (!student) {
        return res.status(404).json({
          success: false,
          message: "Student record linked to this account could not be found",
        });
      }

      const isOpted = Boolean(student.transport?.opted);
      const vehicle = student.transport?.vehicle;

      const transportData = isOpted
        ? {
            enrolled: true,
            busNumber: vehicle?.busNumber || student.transport.busNumber || "N/A",
            vehicleModel: vehicle?.vehicleModel || "School Bus",
            registrationNumber: vehicle?.registrationNumber || "",
            routeName: vehicle?.routeName || student.transport.routeName || "N/A",
            pickupPoint: student.transport.pickupPoint || "Assigned Stop",
            pickupTime: student.transport.pickupTime || vehicle?.pickupTime || "07:30 AM",
            dropTime: student.transport.dropTime || vehicle?.dropTime || "02:30 PM",
            driverName: vehicle?.driverName || student.transport.driverName || "Assigned Driver",
            driverPhone: vehicle?.driverPhone || student.transport.driverPhone || "N/A",
            attendantName: vehicle?.attendantName || "",
            attendantPhone: vehicle?.attendantPhone || "",
            status: vehicle?.status || student.transport.status || "active",
            stops: vehicle?.stops || [],
            annualFee: student.transport.annualFee || vehicle?.annualFee || 0,
          }
        : {
            enrolled: false,
            message: "You are not currently enrolled in the school transport / bus service.",
          };

      return res.status(200).json({
        success: true,
        data: {
          role: "student",
          student: {
            id: student._id,
            name: `${student.firstName} ${student.lastName || ""}`.trim(),
            admissionNumber: student.admissionNumber,
            rollNumber: student.rollNumber,
            className: student.class?.name || "Class",
            sectionName: student.section?.name || "",
          },
          transport: transportData,
        },
      });
    }

    // PARENT ROLE: View linked children's transport details ONLY
    if (roleName === "parent") {
      const parent = await Parent.findOne({
        user: req.user._id,
        school: rawSchoolId,
      });

      if (!parent) {
        return res.status(404).json({
          success: false,
          message: "Parent profile not found",
        });
      }

      const parentStudents = await ParentStudent.find({
        school: rawSchoolId,
        parent: parent._id,
      }).populate({
        path: "student",
        select: "admissionNumber firstName lastName rollNumber class section transport",
        populate: [
          { path: "class", select: "name code" },
          { path: "section", select: "name code" },
          { path: "transport.vehicle" },
        ],
      });

      const children = parentStudents.map((ps) => {
        const stu = ps.student;
        if (!stu) return null;
        const isOpted = Boolean(stu.transport?.opted);
        const vehicle = stu.transport?.vehicle;

        return {
          studentId: stu._id,
          name: `${stu.firstName} ${stu.lastName || ""}`.trim(),
          admissionNumber: stu.admissionNumber,
          rollNumber: stu.rollNumber,
          className: stu.class?.name || "",
          sectionName: stu.section?.name || "",
          relationship: ps.relation || "Ward",
          isPrimary: ps.isPrimary,
          transport: isOpted
            ? {
                enrolled: true,
                busNumber: vehicle?.busNumber || stu.transport.busNumber || "N/A",
                vehicleModel: vehicle?.vehicleModel || "School Bus",
                registrationNumber: vehicle?.registrationNumber || "",
                routeName: vehicle?.routeName || stu.transport.routeName || "N/A",
                pickupPoint: stu.transport.pickupPoint || "Assigned Stop",
                pickupTime: stu.transport.pickupTime || vehicle?.pickupTime || "07:30 AM",
                dropTime: stu.transport.dropTime || vehicle?.dropTime || "02:30 PM",
                driverName: vehicle?.driverName || stu.transport.driverName || "Assigned Driver",
                driverPhone: vehicle?.driverPhone || stu.transport.driverPhone || "N/A",
                attendantName: vehicle?.attendantName || "",
                attendantPhone: vehicle?.attendantPhone || "",
                status: vehicle?.status || stu.transport.status || "active",
                stops: vehicle?.stops || [],
                annualFee: stu.transport.annualFee || vehicle?.annualFee || 0,
              }
            : {
                enrolled: false,
                message: "Transport service is not enrolled for this ward.",
              },
        };
      }).filter(Boolean);

      return res.status(200).json({
        success: true,
        data: {
          role: "parent",
          children,
        },
      });
    }

    // ADMINISTRATIVE / STAFF ROLE: can query for a specific student if passed
    if (["chairman", "principal", "admin", "accountant", "teacher"].includes(roleName)) {
      if (req.query.studentId) {
        const student = await Student.findOne({
          _id: req.query.studentId,
          school: rawSchoolId,
        })
          .populate("class", "name code")
          .populate("section", "name code")
          .populate("transport.vehicle");

        if (!student) {
          return res.status(404).json({
            success: false,
            message: "Student not found",
          });
        }

        const isOpted = Boolean(student.transport?.opted);
        const vehicle = student.transport?.vehicle;

        return res.status(200).json({
          success: true,
          data: {
            role: roleName,
            student: {
              id: student._id,
              name: `${student.firstName} ${student.lastName || ""}`.trim(),
              admissionNumber: student.admissionNumber,
              rollNumber: student.rollNumber,
              className: student.class?.name || "Class",
              sectionName: student.section?.name || "",
            },
            transport: isOpted
              ? {
                  enrolled: true,
                  busNumber: vehicle?.busNumber || student.transport.busNumber || "N/A",
                  vehicleModel: vehicle?.vehicleModel || "School Bus",
                  routeName: vehicle?.routeName || student.transport.routeName || "N/A",
                  pickupPoint: student.transport.pickupPoint || "Assigned Stop",
                  pickupTime: student.transport.pickupTime || vehicle?.pickupTime || "07:30 AM",
                  dropTime: student.transport.dropTime || vehicle?.dropTime || "02:30 PM",
                  driverName: vehicle?.driverName || student.transport.driverName || "Assigned Driver",
                  driverPhone: vehicle?.driverPhone || student.transport.driverPhone || "N/A",
                  attendantName: vehicle?.attendantName || "",
                  attendantPhone: vehicle?.attendantPhone || "",
                  status: vehicle?.status || student.transport.status || "active",
                  annualFee: student.transport.annualFee || vehicle?.annualFee || 0,
                }
              : {
                  enrolled: false,
                  message: "Student is not enrolled in transport services.",
                },
          },
        });
      }

      return res.status(400).json({
        success: false,
        message: "studentId query parameter is required for administrative query",
      });
    }

    return res.status(403).json({
      success: false,
      message: "Unauthorized access",
    });
  } catch (error) {
    console.error("Get My Transport Error:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to fetch self transport information",
    });
  }
};

module.exports = {
  getVehicles,
  createVehicle,
  getVehicleById,
  updateVehicle,
  deleteVehicle,
  getTransportStudents,
  assignStudentTransport,
  getMyTransport,
};
