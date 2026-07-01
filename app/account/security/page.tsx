'use client';

import { useState, type FormEvent } from 'react';
import Link from 'next/link';
import { AuthNav } from '@/components/nav/AuthNav';
import { Input } from '@/components/ui/Input';
import { LimeButton } from '@/components/ui/LimeButton';
import { GhostButton } from '@/components/ui/GhostButton';

export default function AccountSecurityPage() {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (newPassword !== confirmPassword) {
      setError('New passwords do not match');
      return;
    }

    if (newPassword.length < 8) {
      setError('Password must be at least 8 characters');
      return;
    }

    if (currentPassword === newPassword) {
      setError('New password must be different from current password');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/me/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentPassword, newPassword }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? 'Failed to change password');
        return;
      }

      setSuccess('Password changed successfully. You have been signed out.');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch {
      setError('Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <AuthNav />
      <main id="main" className="min-h-screen bg-obsidian-loam main-offset">
        <div className="mx-auto max-w-[1200px] px-[var(--spacing-18)] py-[var(--spacing-18)]">
          {/* Breadcrumb */}
          <div className="mb-6 flex items-center gap-2 font-jetbrains-mono text-[13px] text-drift-ash">
            <Link href="/account" className="!text-lime-surveyor !no-underline hover:text-marsh-olive">
              Account
            </Link>
            <span>/</span>
            <span className="text-bone-vellum">Security</span>
          </div>

          <h1 className="font-nb-international-pro text-[length:var(--text-subheading)] leading-[var(--leading-subheading)] !text-bone-vellum">
            Change password
          </h1>

          <form
            onSubmit={handleSubmit}
            className="mt-8 max-w-lg space-y-6 rounded-md border border-iron-filings bg-surface-raised p-8"
            noValidate
          >
            <Input
              label="Current password"
              type="password"
              name="currentPassword"
              autoComplete="current-password"
              required
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
            />

            <Input
              label="New password"
              type="password"
              name="newPassword"
              autoComplete="new-password"
              required
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              hint="Minimum 8 characters."
            />

            <Input
              label="Confirm new password"
              type="password"
              name="confirmPassword"
              autoComplete="new-password"
              required
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
            />

            {error && (
              <p className="font-jetbrains-mono text-[13px] text-error" role="alert">
                {error}
              </p>
            )}

            {success && (
              <p
                className="rounded-md border border-marsh-olive bg-surface-raised p-4 font-jetbrains-mono text-[13px] text-marsh-olive"
                role="status"
              >
                {success}
              </p>
            )}

            <div className="flex gap-4">
              <LimeButton type="submit" disabled={loading}>
                {loading ? 'Changing…' : 'Change password'}
              </LimeButton>
              <GhostButton href="/account">Cancel</GhostButton>
            </div>
          </form>
        </div>
      </main>
    </>
  );
}
