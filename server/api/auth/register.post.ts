import bcrypt from "bcrypt";
import { prisma } from "../../utils/db";

export default defineEventHandler(async (event) => {
  const body = await readBody(event);

  const hash = await bcrypt.hash(body.password, 10);

  await prisma.user.create({
    data: {
      name: body.name,
      email: body.email,
      password: hash,
    },
  });

  return { message: "Usuario creado" };
});
