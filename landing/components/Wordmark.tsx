import styles from "./Wordmark.module.css";

// "docutec" set wide and heavy; the country code "ec" sits in its own
// casillero, the way a form boxes a code.
export default function Wordmark({ inverse = false }: { inverse?: boolean }) {
  return (
    <span className={`${styles.mark} ${inverse ? styles.inverse : ""}`} aria-label="docutecec">
      <span aria-hidden="true">docutec</span>
      <span className={styles.box} aria-hidden="true">
        ec
      </span>
    </span>
  );
}
