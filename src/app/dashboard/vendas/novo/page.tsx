import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { getClients } from "@/lib/actions/clients";
import NewProcessForm from "./NewProcessForm";

export default async function NovoProcessoPage() {
  const session = await auth();
  if (!session) redirect("/login");
  if (!session.user.roles.some(r => ["ADMIN", "VENDEDOR"].includes(r))) redirect("/dashboard");

  const clients = await getClients();

  return (
    <div className="max-w-4xl">
      <NewProcessForm clients={clients} />
    </div>
  );
}
