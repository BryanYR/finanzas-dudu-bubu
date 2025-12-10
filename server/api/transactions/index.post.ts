import { prisma } from "../../utils/db";

export default defineEventHandler(async (event) => {
  const user = await $fetch("/api/auth/me");
  if (!user) throw createError({ statusCode: 401 });

  const body = await readBody(event);

  return prisma.transaction.create({
    data: {
      amount: body.amount,
      type: body.type,
      notes: body.notes,
      categoryId: body.categoryId,
      userId: user.id,
    },
  });
});
