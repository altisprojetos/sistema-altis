import { getUserById } from "@/lib/actions/admin";
import { notFound } from "next/navigation";
import { UserForm } from "../UserForm";

export default async function EditarUsuarioPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = await getUserById(id);
  if (!user) notFound();
  return <UserForm mode="edit" user={user} />;
}
