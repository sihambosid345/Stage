import prisma from "../prismaClient.js";

const includeRelations = {
  employee: { select: { id: true, firstName: true, lastName: true } },
  company: { select: { id: true, name: true } },
};

export const createAttendance = async (data) => {
  return await prisma.attendanceRecord.create({ data, include: includeRelations });
};

export const getAttendances = async () => {
  return await prisma.attendanceRecord.findMany({
    include: includeRelations,
    orderBy: { date: "desc" },
  });
};

export const getAttendanceById = async (id) => {
  const record = await prisma.attendanceRecord.findUnique({
    where: { id },
    include: includeRelations,
  });
  if (!record) throw { status: 404, message: "Attendance record not found" };
  return record;
};

export const getAttendanceByEmployee = async (employeeId) => {
  return await prisma.attendanceRecord.findMany({
    where: { employeeId },
    include: includeRelations,
    orderBy: { date: "desc" },
  });
};

export const updateAttendance = async (id, data) => {
  await getAttendanceById(id);
  return await prisma.attendanceRecord.update({ where: { id }, data, include: includeRelations });
};

export const deleteAttendance = async (id) => {
  await getAttendanceById(id);
  await prisma.attendanceRecord.delete({ where: { id } });
};