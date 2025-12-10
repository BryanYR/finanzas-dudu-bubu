import { prisma } from "../../utils/db";

export default defineEventHandler(async (event) => {
  const user = await $fetch("/api/auth/me");
  if (!user) throw createError({ statusCode: 401 });

  const query = getQuery(event);

  return prisma.transaction.findMany({
    where: {
      userId: user.id,
      date: {
        gte: query.from ? new Date(query.from) : undefined,
        lte: query.to ? new Date(query.to) : undefined,
      },
    },
    include: { category: true },
    orderBy: { date: "desc" },
  });
});
