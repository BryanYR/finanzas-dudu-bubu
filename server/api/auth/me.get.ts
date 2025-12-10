import jwt from "jsonwebtoken";
import { prisma } from "../../utils/db";

export default defineEventHandler(async (event) => {
  const token = getCookie(event, "session");
  if (!token) return null;

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as { id: number };
    return prisma.user.findUnique({ where: { id: decoded.id } });
  } catch {
    return null;
  }
});
