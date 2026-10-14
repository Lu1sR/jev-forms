import type { Metadata } from "next";
import Link from "next/link";
import LegalPage from "@/components/LegalPage";
import { LEGAL_CITY, LEGAL_EMAIL, LEGAL_OWNER } from "@/lib/legal";

export const metadata: Metadata = {
  title: "Términos de uso · docutecec",
  description: "Condiciones para usar el sitio docutecec.com y sus demos públicas.",
  alternates: { canonical: "/terminos" },
};

export default function TerminosPage() {
  return (
    <LegalPage
      title="Términos de uso"
      lede="Las condiciones para usar el sitio docutecec.com y sus demos públicas. Al usarlos, usted las acepta."
    >
      <h2>1. Quiénes somos</h2>
      <p>
        docutecec es el nombre comercial de {LEGAL_OWNER}, persona natural con domicilio en {LEGAL_CITY}, Ecuador.
        Ofrecemos un gestor documental con flujos automáticos para empresas. Contacto:{" "}
        <a href={`mailto:${LEGAL_EMAIL}`}>{LEGAL_EMAIL}</a>.
      </p>

      <h2>2. Qué cubren estos términos</h2>
      <p>
        Cubren el sitio <strong>docutecec.com</strong> y las demos públicas <strong>formularios.docutecec.com</strong> y{" "}
        <strong>gestor.docutecec.com</strong>. Los servicios que una empresa contrata con nosotros se rigen por su propio
        contrato, que prevalece sobre estos términos en lo que se contradigan.
      </p>

      <h2>3. Las demos</h2>
      <p>
        Las demos son gratuitas y sirven para conocer el producto. No son un servicio de producción:
      </p>
      <ul>
        <li>Pueden cambiar, fallar o dejar de estar disponibles en cualquier momento, sin aviso.</li>
        <li>
          La lectura de documentos es automática y puede equivocarse. Revise siempre los datos antes de usarlos para
          cualquier fin, en especial contable, tributario o legal.
        </li>
        <li>
          La demo del gestor documental usa una cuenta compartida: lo que suba lo pueden ver otras personas, y podemos
          borrarlo en cualquier momento. No suba documentos reales ni confidenciales.
        </li>
      </ul>

      <h2>4. Uso permitido</h2>
      <p>Al usar el sitio y las demos, usted se compromete a no:</p>
      <ul>
        <li>Subir documentos de terceros sin autorización, ni contenido ilegal, ofensivo o con software malicioso.</li>
        <li>Usar las demos de forma masiva o automatizada, ni como servicio para procesar documentos de su negocio.</li>
        <li>Intentar acceder a partes no públicas, saltarse límites o afectar el funcionamiento de los sistemas.</li>
        <li>Copiar o usar el sitio o las demos para crear un producto que compita con docutecec.</li>
      </ul>
      <p>Podemos bloquear el acceso a quien incumpla estas reglas.</p>

      <h2>5. Sus documentos y datos</h2>
      <p>
        Los documentos que usted sube siguen siendo suyos. Nos da permiso para procesarlos solo para mostrarle el
        resultado de la demo. Cómo tratamos los datos personales se explica en la{" "}
        <Link href="/privacidad">política de privacidad</Link>.
      </p>

      <h2>6. Propiedad intelectual</h2>
      <p>
        La marca docutecec, el diseño, los textos y el software del sitio y las demos son nuestros o de nuestros
        licenciantes. Estos términos no le dan ningún derecho sobre ellos, salvo usarlos para conocer el producto.
      </p>

      <h2>7. Responsabilidad</h2>
      <p>
        El sitio y las demos se ofrecen tal como están, sin garantía de disponibilidad ni de exactitud. En la medida en que
        la ley lo permita, no respondemos por daños derivados de su uso, en particular por decisiones tomadas con datos
        leídos por la demo sin revisarlos. Nada en estos términos limita los derechos que la Ley Orgánica de Defensa del
        Consumidor le reconoce.
      </p>

      <h2>8. Enlaces a terceros</h2>
      <p>
        El sitio enlaza a servicios de terceros, como WhatsApp. Su uso se rige por las condiciones de cada servicio, de
        las que no somos responsables.
      </p>

      <h2>9. Cambios</h2>
      <p>
        Podemos actualizar estos términos. La versión vigente es la publicada en esta página, con su fecha. Si sigue
        usando el sitio después de un cambio, acepta la nueva versión.
      </p>

      <h2>10. Ley aplicable y jurisdicción</h2>
      <p>
        Estos términos se rigen por las leyes de la República del Ecuador. Cualquier controversia se someterá a los jueces
        competentes de {LEGAL_CITY}, sin perjuicio de los derechos que la ley reconoce a los consumidores.
      </p>
    </LegalPage>
  );
}
