import { prisma } from "../prismaClient.js";

const include = {
  employee: { select: { id: true, firstName: true, lastName: true } },
  company: { select: { id: true, name: true } },
};

export const createAttendance = async (data) =>
  prisma.attendanceRecord.create({ data, include });

export const getAttendances = async (companyId) =>
  prisma.attendanceRecord.findMany({ where: companyId ? { companyId } : {}, include, orderBy: { date: "desc" } });

export const getAttendanceById = async (id, companyId) => {
  const where = companyId ? { id, companyId } : { id };
  const r = await prisma.attendanceRecord.findFirst({ where, include });
  if (!r) throw { status: 404, message: "Attendance record not found" };
  return r;
};

export const getAttendanceByEmployee = async (employeeId, companyId) =>
  prisma.attendanceRecord.findMany({ where: { employeeId, companyId }, include, orderBy: { date: "desc" } });

export const updateAttendance = async (id, data, companyId) => {
  await getAttendanceById(id, companyId);
  return prisma.attendanceRecord.update({ where: { id }, data, include });
};

export const deleteAttendance = async (id, companyId) => {
  await getAttendanceById(id, companyId);
  return prisma.attendanceRecord.delete({ where: { id } });
};