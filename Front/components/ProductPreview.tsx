"use client";

import BrandLogo from "@/components/BrandLogo";
import { useState } from "react";
import Icon from "./Icon";
import styles from "../src/app/(public)/landing.module.css";

const STEPS = [
  { label: "Prepara", status: "PLANTILLA", title: "Un buen contrato empieza aquí.", detail: "Parte de una plantilla y completa los datos del puesto. Mantén una base que puedas reutilizar.", caption: "Campos personalizados", value: "Nombre · puesto · jornada", icon: "templates" as const },
  { label: "Revisa", status: "EN REVISIÓN", title: "Cada cláusula, más clara.", detail: "El cliente consulta su documento y resuelve dudas. La IA acompaña la lectura con fragmentos del contrato.", caption: "Consulta del cliente", value: "¿Cuáles son mis obligaciones?", icon: "sparkles" as const },
  { label: "Firma", status: "FIRMADO", title: "Del acuerdo a la firma.", detail: "El cliente firma desde su dispositivo. El expediente conserva el registro del proceso para su revisión.", caption: "Firma desde tu dispositivo", value: "Computadora · tableta · teléfono", icon: "document" as const },
  { label: "Finaliza", status: "APROBADO", title: "Todo en un mismo expediente.", detail: "Administración revisa la firma y aprueba el contrato. El PDF final y su actividad quedan disponibles.", caption: "Expediente completo", value: "Documento · firma · historial", icon: "shield" as const },
];

export default function ProductPreview() {
  const [active, setActive] = useState(0);
  const step = STEPS[active];
  return <div className={`${styles.productPreview} ${styles.interactivePreview}`} aria-label="Demostración ilustrativa del flujo SEAL">
    <div className={styles.browserBar}><span className={styles.browserDots} aria-hidden="true"><i /><i /><i /></span><span className={styles.demoLabel}>EXPLORA SEAL · DATOS FICTICIOS</span></div>
    <div className={styles.demoTabs} role="tablist" aria-label="Etapas del contrato">{STEPS.map((item, index) => <button key={item.label} id={`demo-tab-${index}`} role="tab" aria-selected={index === active} aria-controls="demo-panel" tabIndex={index === active ? 0 : -1} onClick={() => setActive(index)} onKeyDown={(event) => {
      const next = event.key === "ArrowRight" ? (active + 1) % 4 : event.key === "ArrowLeft" ? (active + 3) % 4 : event.key === "Home" ? 0 : event.key === "End" ? 3 : null;
      if (next !== null) { event.preventDefault(); setActive(next); document.getElementById(`demo-tab-${next}`)?.focus(); }
    }}><span>{index < active ? "✓" : `0${index + 1}`}</span>{item.label}</button>)}</div>
    <div id="demo-panel" role="tabpanel" aria-labelledby={`demo-tab-${active}`} tabIndex={0} className={styles.demoPanel}>
      <div className={styles.demoTopline}><span>ANA TORRES · EJEMPLO</span><b>{step.status}</b></div>
      <div className={styles.demoDocument} key={active}>
        <div className={styles.demoDocumentHead}><span className="seal-demo-brand"><BrandLogo size="small" />SEAL</span><Icon name={step.icon} /></div>
        <small>CONTRATO LABORAL</small><h3>{step.title}</h3>
        <div className={styles.demoLines} aria-hidden="true"><i /><i /><i /><i /></div>
        <div className={styles.demoHighlight}><Icon name={step.icon} /><div><small>{step.caption}</small><strong>{step.value}</strong></div></div>
      </div>
      <p className={styles.demoDescription}>{step.detail}</p>
      <div className={styles.demoProgress} aria-hidden="true">{STEPS.map((item, index) => <i key={item.label} className={index <= active ? styles.demoProgressActive : undefined} />)}</div>
    </div>
    <div className={styles.demoFooter}><span>Selecciona una etapa para conocer el proceso</span><span aria-hidden="true">↗</span></div>
  </div>;
}
