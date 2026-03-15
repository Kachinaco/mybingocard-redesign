import { getUserByEmail, type User } from "@/lib/db/users";

export async function getUserAccessState(email: string) {
  const user = await getUserByEmail(email);
  return {
    user,
    billingSetupRequired: false,
  };
}
