import type { Metadata } from "next";
import LegalPage from "@/components/LegalPage";
import styles from "@/components/LegalPage.module.css";
import { LEGAL_EMAIL, LEGAL_OWNER } from "@/lib/legal";

export const metadata: Metadata = {
  title: "Política de privacidad · docutecec",
  description: "Qué datos personales trata docutecec en su sitio y sus demos, para qué, con quién y cómo ejercer sus derechos.",
  alternates: { canonical: "/privacidad" },
};

const RECIPIENTS = [
  {
    who: "Railway Corp.",
    what: "Aloja el sitio, las demos y el lector de documentos; guarda los registros técnicos.",
    where: "Estados Unidos",
  },
  {
    who: "OpenRouter, Inc. y el proveedor del modelo de lenguaje que usa",
    what: "Recibe el texto leído del documento que usted sube a la demo de Formularios, para ubicar cada dato.",
    where: "Estados Unidos",
  },
  {
    who: "DonDominio (Soluciones Corporativas IP, S.L.)",
    what: "Aloja el correo contacto@docutecec.com y el dominio.",
    where: "España (Unión Europea)",
  },
  {
    who: "WhatsApp (Meta Platforms)",
    what: "Solo si usted elige escribirnos por WhatsApp: recibe su mensaje y su número.",
    where: "Estados Unidos y otros",
  },
];

export default function PrivacidadPage() {
  return (
    <LegalPage
      title="Política de privacidad"
      lede="Qué datos personales tratamos cuando usted visita docutecec.com, nos escribe o prueba nuestras demos, para qué los usamos y cómo ejercer sus derechos."
    >
      <p>
        Esta política cumple con la Ley Orgánica de Protección de Datos Personales del Ecuador (LOPDP) y su reglamento.
        Cubre el sitio <strong>docutecec.com</strong> y las demos públicas <strong>formularios.docutecec.com</strong> y{" "}
        <strong>gestor.docutecec.com</strong>. Los servicios contratados por empresas se rigen por su propio contrato y
        acuerdo de tratamiento de datos.
      </p>

      <h2>1. Responsable del tratamiento</h2>
      <p>
        El responsable es {LEGAL_OWNER}, persona natural que opera con el nombre comercial docutecec. Para cualquier
        asunto de datos personales, incluido el ejercicio de sus derechos, escriba a{" "}
        <a href={`mailto:${LEGAL_EMAIL}`}>{LEGAL_EMAIL}</a>.
      </p>

      <h2>2. Qué datos tratamos y para qué</h2>

      <h3>Cuando visita el sitio</h3>
      <p>
        El servidor registra datos técnicos de cada visita: dirección IP, fecha y hora, página pedida y navegador. Los
        usamos solo para mantener el sitio funcionando y protegerlo de abusos. <strong>No usamos cookies</strong> de
        publicidad ni de analítica, ni herramientas de seguimiento de terceros.
      </p>

      <h3>Cuando nos escribe</h3>
      <p>
        El formulario de cotización no envía nada a nuestros servidores: arma un mensaje que usted envía desde su propio
        WhatsApp o su correo. Recibimos lo que usted escriba (nombre, empresa, teléfono o correo y su consulta) y lo usamos
        para responderle y preparar una cotización.
      </p>

      <h3>Cuando prueba la demo de Formularios</h3>
      <p>
        El documento que usted sube (foto o PDF de un comprobante) se lee para mostrarle los datos que contiene.
        Funciona así:
      </p>
      <ul>
        <li>El archivo se procesa en memoria y <strong>no se guarda</strong>: se descarta al terminar la lectura.</li>
        <li>
          El texto leído se envía a un modelo de lenguaje a través de OpenRouter para ubicar cada dato del formulario.
        </li>
        <li>
          Queda un registro técnico con la fecha, el nombre del archivo, el tiempo de proceso y el resultado (correcto o
          error), sin el contenido del documento.
        </li>
      </ul>
      <p>
        Los comprobantes pueden contener datos personales (nombres, cédula o RUC, direcciones). Suba solo documentos
        propios o que esté autorizado a usar. Si prefiere no compartir datos reales, use los ejemplos de la demo.
      </p>

      <h3>Cuando prueba la demo del gestor documental</h3>
      <p>
        La demo usa una cuenta compartida: <strong>todo lo que suba lo pueden ver otras personas que usen la demo</strong>.
        No suba documentos reales ni confidenciales. Podemos borrar su contenido en cualquier momento.
      </p>

      <h2>3. Base legal</h2>
      <ul>
        <li>
          <strong>Su consentimiento</strong>, que usted da al subir un documento a una demo o al escribirnos. Puede
          retirarlo cuando quiera, sin efecto sobre lo ya tratado.
        </li>
        <li>
          <strong>Medidas precontractuales a su pedido</strong>, para responder su solicitud de información o cotización.
        </li>
        <li>
          <strong>Interés legítimo</strong> en la seguridad del sitio, para los registros técnicos.
        </li>
      </ul>

      <h2>4. Con quién compartimos los datos</h2>
      <p>
        No vendemos ni cedemos sus datos. Los comparten solo los proveedores que necesitamos para prestar el servicio,
        como encargados del tratamiento:
      </p>
      <table className={styles.table}>
        <thead>
          <tr>
            <th scope="col">Proveedor</th>
            <th scope="col">Para qué</th>
            <th scope="col">País</th>
          </tr>
        </thead>
        <tbody>
          {RECIPIENTS.map((r) => (
            <tr key={r.who}>
              <td data-label="Proveedor">{r.who}</td>
              <td data-label="Para qué">{r.what}</td>
              <td data-label="País">{r.where}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <p>También entregaremos datos a una autoridad cuando una ley o una orden judicial lo exija.</p>

      <h2>5. Transferencia internacional</h2>
      <p>
        Como muestra la tabla, sus datos se tratan fuera del Ecuador, principalmente en Estados Unidos. Elegimos
        proveedores con medidas de seguridad reconocidas y compromisos contractuales de protección de datos. Al usar las
        demos o escribirnos, usted consiente esta transferencia.
      </p>

      <h2>6. Cuánto tiempo los conservamos</h2>
      <ul>
        <li>Documentos subidos a la demo de Formularios: no se conservan.</li>
        <li>Registros técnicos del sitio y de las demos: hasta 30 días.</li>
        <li>Documentos de la demo del gestor: hasta que limpiemos la demo, sin plazo garantizado.</li>
        <li>
          Mensajes y datos de contacto: mientras dure la conversación comercial y hasta 2 años después, salvo que nos pida
          borrarlos antes.
        </li>
      </ul>

      <h2>7. Sus derechos</h2>
      <p>La LOPDP le reconoce estos derechos sobre sus datos:</p>
      <ul>
        <li>Acceder a ellos y saber cómo los tratamos.</li>
        <li>Rectificarlos y actualizarlos.</li>
        <li>Pedir que los eliminemos.</li>
        <li>Oponerse a su tratamiento o pedir que lo suspendamos.</li>
        <li>Recibirlos en un formato que pueda llevar a otro proveedor (portabilidad).</li>
        <li>No ser objeto de decisiones basadas solo en un tratamiento automatizado.</li>
      </ul>
      <p>
        Para ejercerlos, escriba a <a href={`mailto:${LEGAL_EMAIL}`}>{LEGAL_EMAIL}</a> indicando qué derecho quiere
        ejercer. Para proteger sus datos, podemos pedirle que confirme su identidad. Respondemos en un plazo máximo de 15
        días.
      </p>
      <p>
        Si no está conforme con nuestra respuesta, puede presentar un reclamo ante la Superintendencia de Protección de
        Datos Personales.
      </p>

      <h2>8. Decisiones automatizadas</h2>
      <p>
        La demo de Formularios lee documentos de forma automática y marca cada dato como listo, por revisar o ausente. Es
        solo una lectura que usted puede revisar: no toma decisiones con efectos jurídicos ni comerciales sobre usted.
      </p>

      <h2>9. Seguridad</h2>
      <p>
        Todo el tráfico viaja cifrado (HTTPS), el acceso a los sistemas está limitado a quien lo necesita y el lector de
        documentos exige una clave. Si detectamos una vulneración que afecte sus datos, se lo notificaremos a usted y a la
        autoridad en los plazos de ley.
      </p>

      <h2>10. Menores de edad</h2>
      <p>
        El sitio y las demos están dirigidos a empresas y profesionales. No recogemos a sabiendas datos de menores de 15
        años.
      </p>

      <h2>11. Cambios a esta política</h2>
      <p>
        Si cambiamos esta política, publicaremos la nueva versión en esta página con su fecha de vigencia. Si el cambio es
        importante, lo indicaremos de forma visible en el sitio.
      </p>
    </LegalPage>
  );
}
