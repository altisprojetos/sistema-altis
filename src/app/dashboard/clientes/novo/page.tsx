import PageHeader from "@/components/ui/PageHeader";
import ClientForm from "./ClientForm";

export default function NovoClientePage() {
  return (
    <div className="max-w-2xl">
      <PageHeader title="Novo Cliente" subtitle="Preencha os dados do cliente" />
      <ClientForm />
    </div>
  );
}
