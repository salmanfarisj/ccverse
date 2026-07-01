import { LegalPage } from '@/components/legal/LegalPage';

export const metadata = {
  title: 'Cookie Policy — CC Verse',
};

export default function CookiesPage() {
  return (
    <LegalPage title="Cookie Policy">
      <p>
        CC Verse uses a single httpOnly session cookie for authentication. No third-party
        advertising or analytics cookies are set in the MVP.
      </p>
      <p>
        The session cookie is required to sign in and access buyer, seller, and admin dashboards.
      </p>
    </LegalPage>
  );
}
