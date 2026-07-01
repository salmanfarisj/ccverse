import { LegalPage } from '@/components/legal/LegalPage';

export const metadata = {
  title: 'Privacy Policy — CC Verse',
};

export default function PrivacyPage() {
  return (
    <LegalPage title="Privacy Policy">
      <p>
        CC Verse collects account email, role, and transaction data required to operate the carbon
        credit registry. KYC documents are stored encrypted and reviewed only by authorised staff.
      </p>
      <p>
        Public registry and certificate verification pages minimise PII exposure per product policy.
        A complete privacy policy will be published before general availability.
      </p>
    </LegalPage>
  );
}
