import { prisma } from "../prismaClient.js";

export const createCompany = async (data) => {
  return await prisma.company.create({ 
    data: sanitizeCompany(data),
    include: {
      _count: {
        select: { users: true, licenses: true, employees: true }
      }
    }
  });
};

const sanitizeCompany = (company) => ({
  name: company.name?.trim(),
  legalName: company.legalName || null,
  taxIdentifier: company.taxIdentifier || null,
  rcNumber: company.rcNumber || null,
  iceNumber: company.iceNumber || null,
  cnssNumber: company.cnssNumber || null,
  email: company.email || null,
  phone: company.phone || null,
  address: company.address || null,
  city: company.city || null,
  country: company.country || "Maroc",
  timezone: company.timezone || "Africa/Casablanca",
  currency: company.currency || "MAD",
  medicalSector: company.medicalSector === true || company.medicalSector === "true",
  status: company.status || "ACTIVE",
});

export const getCompanies = async (companyId) => {
  const where = companyId ? { id: companyId } : {};
  
  const companies = await prisma.company.findMany({
    where,
    include: {
      _count: {
        select: { 
          users: true, 
          employees: true, 
          departments: true,
          positions: true 
        }
      }
    },
    orderBy: { name: "asc" }
  });
  
  return companies;
};

export const getCompanyById = async (id) => {
  const company = await prisma.company.findUnique({ 
    where: { id },
    include: {
      _count: {
        select: { 
          users: true, 
          employees: true, 
          departments: true,
          positions: true 
        }
      }
    }
  });
  
  if (!company) throw { status: 404, message: "Entreprise non trouvée" };
  return company;
};

export const updateCompany = async (id, data) => {
  await getCompanyById(id);
  return await prisma.company.update({ 
    where: { id }, 
    data: sanitizeCompany(data),
    include: {
      _count: {
        select: { users: true, employees: true }
      }
    }
  });
};

export const deleteCompany = async (id) => {
  await getCompanyById(id);
  
  // Vérifier que l'entreprise n'a pas de données associées
  const usersCount = await prisma.user.count({ where: { companyId: id } });
  const employeesCount = await prisma.employee.count({ where: { companyId: id } });
  const departmentsCount = await prisma.department.count({ where: { companyId: id } });
  
  if (usersCount > 0 || employeesCount > 0 || departmentsCount > 0) {
    throw { 
      status: 400, 
      message: `Impossible de supprimer cette entreprise car elle contient ${usersCount} utilisateur(s), ${employeesCount} employé(s) et ${departmentsCount} département(s).` 
    };
  }
  
  await prisma.company.delete({ where: { id } });
};