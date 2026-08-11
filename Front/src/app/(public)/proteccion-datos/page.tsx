import LegalDocument from "@/components/LegalDocument";
import { DATA_PROTECTION_VERSION, dataProtectionSections } from "@/lib/privacyContent";

export default function DataProtectionPage() {
  return (
    <LegalDocument
      eyebrow="Lineamientos del equipo"
      title="Protección de datos personales"
      summary="Controles de consentimiento, minimización, seguridad, derechos ARCO, retención, transferencias y respuesta a vulneraciones."
      version={DATA_PROTECTION_VERSION}
      sections={dataProtectionSections}
    />
  );
}
