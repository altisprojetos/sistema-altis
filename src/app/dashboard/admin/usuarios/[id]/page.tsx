import { getUserById, getCoordinators, getSubordinateCandidates } from "@/lib/actions/admin";
import { notFound } from "next/navigation";
import { UserForm } from "../UserForm";

export default async function EditarUsuarioPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [user, coordinators, subordinateCandidates] = await Promise.all([
    getUserById(id),
    getCoordinators(),
    getSubordinateCandidates(),
  ]);
  if (!user) notFound();
  return <UserForm mode="edit" user={user} coordinators={coordinators} subordinateCandidates={subordinateCandidates} />;
}
