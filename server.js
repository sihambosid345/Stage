import "dotenv/config";
import express from "express";
import cors from "cors";

import companyRoutes from "./routes/companyRoutes.js";
import departmentRoutes from "./routes/departmentRoutes.js";
import positionRoutes from "./routes/positionRoutes.js";
import employeeRoutes from "./routes/employeeRoutes.js";

import userRoutes from "./routes/userRoutes.js";
import licenseRoutes from "./routes/licenseRoutes.js";
import employeeContractRoutes from "./routes/employeeContractRoutes.js";
import payrollPeriodRoutes from "./routes/payrollPeriodRoutes.js";
import payrollRunRoutes from "./routes/payrollRunRoutes.js";
import payrollItemRoutes from "./routes/payrollItemRoutes.js";
import variableItemRoutes from "./routes/variableItemRoutes.js";
import attendanceRoutes from "./routes/attendanceRoutes.js";
import payslipRoutes from "./routes/payslipRoutes.js";
import auditLogRoutes from "./routes/auditLogRoutes.js";

const app = express();
app.use(cors());
app.use(express.json());

// Routes existantes
app.use("/companies", companyRoutes);
app.use("/departments", departmentRoutes);
app.use("/positions", positionRoutes);
app.use("/employees", employeeRoutes);

// Routes nouvelles
app.use("/users", userRoutes);
app.use("/licenses", licenseRoutes);
app.use("/contracts", employeeContractRoutes);
app.use("/payroll-periods", payrollPeriodRoutes);
app.use("/payroll-runs", payrollRunRoutes);
app.use("/payroll-items", payrollItemRoutes);
app.use("/variable-items", variableItemRoutes);
app.use("/attendance", attendanceRoutes);
app.use("/payslips", payslipRoutes);
app.use("/audit-logs", auditLogRoutes);

app.get("/", (req, res) => {
  res.json({ message: "Backend fonctionne !" });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));