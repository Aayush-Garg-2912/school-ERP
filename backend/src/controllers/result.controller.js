const StudentResult = require("../models/StudentResult");
const Exam = require("../models/Exam");
const ExamSubject = require("../models/ExamSubject");
const Student = require("../models/Student");
const Subject = require("../models/Subject");
const Class = require("../models/Class");

const calculateGrade = (percentage) => {
  if (percentage >= 90) return "A+";
  if (percentage >= 80) return "A";
  if (percentage >= 70) return "B+";
  if (percentage >= 60) return "B";
  if (percentage >= 50) return "C";
  if (percentage >= 40) return "D";
  return "F";
};

const enterResult = async (req, res) => {
  try {
    const {
      examId,
      examSubjectId,
      studentId,
      theoryMarks = 0,
      practicalMarks = 0,
      remarks = "",
    } = req.body;

    if (
      !examId ||
      !examSubjectId ||
      !studentId
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Exam, exam subject and student are required",
      });
    }

    const schoolId = req.user.school._id;

    const exam = await Exam.findOne({
      _id: examId,
      school: schoolId,
      isActive: true,
    });

    if (!exam) {
      return res.status(404).json({
        success: false,
        message: "Exam not found",
      });
    }

    const examSubject =
      await ExamSubject.findOne({
        _id: examSubjectId,
        exam: examId,
        school: schoolId,
      });

    if (!examSubject) {
      return res.status(404).json({
        success: false,
        message: "Exam subject not found",
      });
    }

    const student = await Student.findOne({
      _id: studentId,
      school: schoolId,
      academicYear: exam.academicYear,
      class: examSubject.class,
      status: "active",
    });

    if (!student) {
      return res.status(404).json({
        success: false,
        message:
          "Student does not belong to this class or academic year",
      });
    }

    const theory = Number(theoryMarks);
    const practical = Number(practicalMarks);

    if (
      theory < 0 ||
      theory > examSubject.theoryMaxMarks
    ) {
      return res.status(400).json({
        success: false,
        message:
          `Theory marks must be between 0 and ${examSubject.theoryMaxMarks}`,
      });
    }

    if (
      practical < 0 ||
      practical >
        examSubject.practicalMaxMarks
    ) {
      return res.status(400).json({
        success: false,
        message:
          `Practical marks must be between 0 and ${examSubject.practicalMaxMarks}`,
      });
    }

    const totalMarks = theory + practical;

    const percentage =
      (totalMarks / examSubject.maxMarks) * 100;

    const grade = calculateGrade(percentage);

    const isPassed =
      totalMarks >= examSubject.passingMarks;

    const result = isPassed ? "pass" : "fail";

    const studentResult =
      await StudentResult.findOneAndUpdate(
        {
          school: schoolId,
          exam: examId,
          examSubject: examSubjectId,
          student: studentId,
        },
        {
          school: schoolId,
          exam: examId,
          examSubject: examSubjectId,
          student: studentId,
          theoryMarks: theory,
          practicalMarks: practical,
          totalMarks,
          maxMarks: examSubject.maxMarks,
          percentage: Number(
            percentage.toFixed(2)
          ),
          grade,
          result,
          remarks,
          enteredBy: req.user._id,
        },
        {
          new: true,
          upsert: true,
          runValidators: true,
        }
      );

    res.status(200).json({
      success: true,
      message: "Student result saved successfully",
      data: {
        result: studentResult,
      },
    });
  } catch (error) {
    console.error(
      "Enter Result Error:",
      error
    );

    res.status(500).json({
      success: false,
      message: "Failed to save student result",
    });
  }
};

const updateResult = async (req, res) => {
  try {
    const resultDoc = await StudentResult.findOne({ _id: req.params.id, school: req.user.school._id }).populate("examSubject");
    if (!resultDoc) return res.status(404).json({ success: false, message: "Result not found" });
    const theory = req.body.theoryMarks === undefined ? resultDoc.theoryMarks : Number(req.body.theoryMarks);
    const practical = req.body.practicalMarks === undefined ? resultDoc.practicalMarks : Number(req.body.practicalMarks);
    const maxTheory = resultDoc.examSubject.theoryMaxMarks; const maxPractical = resultDoc.examSubject.practicalMaxMarks;
    if (theory < 0 || theory > maxTheory || practical < 0 || practical > maxPractical) return res.status(400).json({ success:false, message:"Marks exceed allowed limits" });
    const totalMarks=theory+practical; const percentage=Number(((totalMarks/resultDoc.maxMarks)*100).toFixed(2)); resultDoc.theoryMarks=theory; resultDoc.practicalMarks=practical; resultDoc.totalMarks=totalMarks; resultDoc.percentage=percentage; resultDoc.grade=calculateGrade(percentage); resultDoc.result=totalMarks>=resultDoc.examSubject.passingMarks?'pass':'fail'; if(req.body.remarks!==undefined)resultDoc.remarks=req.body.remarks; resultDoc.enteredBy=req.user._id; await resultDoc.save();
    return res.json({success:true,message:"Result updated successfully",data:{result:resultDoc}});
  } catch(e) { return res.status(500).json({success:false,message:e.message||"Failed to update result"}); }
};

const publishResults = async (req, res) => {
  try {
    const exam = await Exam.findOne({ _id:req.params.examId, school:req.user.school._id }); if(!exam)return res.status(404).json({success:false,message:"Exam not found"});
    const published = req.body.published !== false; await StudentResult.updateMany({school:req.user.school._id,exam:exam._id},{ $set:{isPublished:published} });
    if(published) { exam.status='published'; await exam.save(); }
    return res.json({success:true,message:published?'Results published successfully':'Results unpublished successfully'});
  } catch(e) { return res.status(500).json({success:false,message:e.message||"Failed to publish results"}); }
};

const getStudentResult = async (req, res) => {
  try {
    let studentId = req.params.studentId;
    const examId = req.params.examId;
    if (req.user.role?.name === "student") {
      studentId = req.user.student?._id?.toString() || req.user.student?.toString() || studentId;
    }

    const results = await StudentResult.find({
      school: req.user.school._id,
      student: studentId,
      exam: examId,
    })
      .populate(
        "student",
        "admissionNumber firstName lastName rollNumber"
      )
      .populate(
        "exam",
        "name type startDate endDate"
      )
      .populate({
        path: "examSubject",
        populate: [
          {
            path: "subject",
            select: "name code",
          },
          {
            path: "class",
            select: "name code",
          },
        ],
      })
      .sort({
        createdAt: 1,
      });

    res.status(200).json({
      success: true,
      data: {
        results,
      },
    });
  } catch (error) {
    console.error(
      "Get Student Result Error:",
      error
    );

    res.status(500).json({
      success: false,
      message: "Failed to fetch student result",
    });
  }
};

const getExamResults = async (req, res) => {
  try {
    const filter = {
      school: req.user.school._id,
      exam: req.params.examId,
    };

    if (req.query.studentId) {
      filter.student = req.query.studentId;
    }

    if (req.query.classId) {
      const examSubjects =
        await ExamSubject.find({
          exam: req.params.examId,
          class: req.query.classId,
          school: req.user.school._id,
        }).select("_id");

      filter.examSubject = {
        $in: examSubjects.map(
          (item) => item._id
        ),
      };
    }

    const results = await StudentResult.find(filter)
      .populate(
        "student",
        "admissionNumber firstName lastName rollNumber"
      )
      .populate({
        path: "examSubject",
        populate: {
          path: "subject",
          select: "name code",
        },
      })
      .sort({
        student: 1,
      });

    res.status(200).json({
      success: true,
      data: {
        results,
      },
    });
  } catch (error) {
    console.error(
      "Get Exam Results Error:",
      error
    );

    res.status(500).json({
      success: false,
      message: "Failed to fetch exam results",
    });
  }
};
const getReportCard = async (req, res) => {
  try {
    let { studentId, examId } = req.params;
    if (req.user.role?.name === "student") {
      studentId = req.user.student?._id?.toString() || req.user.student?.toString() || studentId;
    }

    const schoolId = req.user.school._id;

    const results = await StudentResult.find({
      school: schoolId,
      student: studentId,
      exam: examId,
    })
      .populate(
        "student",
        "admissionNumber firstName lastName rollNumber"
      )
      .populate(
        "exam",
        "name type startDate endDate"
      )
      .populate({
        path: "examSubject",
        populate: [
          {
            path: "subject",
            select: "name code",
          },
          {
            path: "class",
            select: "name code",
          },
        ],
      })
      .sort({
        createdAt: 1,
      });

    if (!results.length) {
      return res.status(404).json({
        success: false,
        message:
          "No result found for this student and exam",
      });
    }

    const student = results[0].student;
    const exam = results[0].exam;

    let totalMaxMarks = 0;
    let totalObtainedMarks = 0;
    let failedSubjects = 0;

    const subjects = results.map((item) => {
      totalMaxMarks += item.maxMarks;
      totalObtainedMarks += item.totalMarks;

      if (item.result === "fail") {
        failedSubjects++;
      }

      return {
        subject: item.examSubject.subject,
        maxMarks: item.maxMarks,
        theoryMarks: item.theoryMarks,
        practicalMarks: item.practicalMarks,
        totalMarks: item.totalMarks,
        percentage: item.percentage,
        grade: item.grade,
        result: item.result,
        remarks: item.remarks,
      };
    });

    const overallPercentage =
      totalMaxMarks > 0
        ? (totalObtainedMarks / totalMaxMarks) * 100
        : 0;

    let overallGrade = "F";

    if (overallPercentage >= 90) {
      overallGrade = "A+";
    } else if (overallPercentage >= 80) {
      overallGrade = "A";
    } else if (overallPercentage >= 70) {
      overallGrade = "B+";
    } else if (overallPercentage >= 60) {
      overallGrade = "B";
    } else if (overallPercentage >= 50) {
      overallGrade = "C";
    } else if (overallPercentage >= 40) {
      overallGrade = "D";
    }

    const overallResult =
      failedSubjects === 0
        ? "pass"
        : "fail";

    res.status(200).json({
      success: true,
      data: {
        student,
        exam,

        subjects,

        summary: {
          totalSubjects: subjects.length,
          passedSubjects:
            subjects.length - failedSubjects,
          failedSubjects,

          totalMaxMarks,
          totalObtainedMarks,

          percentage: Number(
            overallPercentage.toFixed(2)
          ),

          grade: overallGrade,

          result: overallResult,
        },
      },
    });
  } catch (error) {
    console.error(
      "Get Report Card Error:",
      error
    );

    res.status(500).json({
      success: false,
      message:
        "Failed to generate report card",
    });
  }
};

module.exports = {
  enterResult,
  getStudentResult,
  getExamResults,
   getReportCard,
  updateResult,
  publishResults,
};