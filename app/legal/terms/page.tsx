import { LegalPage } from '@/components/legal/LegalPage';

export const metadata = {
  title: 'Terms of Service — CC Verse',
};

export default function TermsPage() {
  return (
    <LegalPage title="Terms of Service">
      <p>
        These terms govern use of the CC Verse marketplace. Full legal text will be published before
        general availability.
      </p>
      <p>
        By using CC Verse you agree to purchase and retire credits only through the platform registry,
        and not to misrepresent project verification status.
      </p>
    </LegalPage>
  );
}
