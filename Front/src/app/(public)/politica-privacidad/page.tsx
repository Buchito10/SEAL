import LegalDocument from "@/components/LegalDocument";
import { PRIVACY_NOTICE_VERSION, privacyPolicySections } from "@/lib/privacyContent";

export default function PrivacyPolicyPage() {
  return (
    <LegalDocument
      eyebrow="Aviso integral"
      title="Política de privacidad"
      summary="Conoce qué datos trata Seal, para qué los utiliza y cómo puedes ejercer control sobre ellos."
      version={PRIVACY_NOTICE_VERSION}
      sections={privacyPolicySections}
    />
  );
}
