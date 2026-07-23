import { getCoordinators, getSubordinateCandidates } from "@/lib/actions/admin";
import { UserForm } from "../UserForm";

export default async function NovoUsuarioPage() {
  const [coordinators, subordinateCandidates] = await Promise.all([
    getCoordinators(),
    getSubordinateCandidates(),
  ]);
  return <UserForm mode="create" coordinators={coordinators} subordinateCandidates={subordinateCandidates} />;
}
