import { ValidateClient } from "@/app/validate/[payload]/validate-client";

type ValidatePageProps = {
  params: Promise<{
    payload: string;
  }>;
};

export default async function ValidatePage({ params }: ValidatePageProps) {
  const { payload } = await params;
  return <ValidateClient payload={payload} />;
}
