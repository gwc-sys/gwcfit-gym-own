import React, { useEffect, useRef, useState } from 'react';
import { Eye, EyeOff, LoaderCircle, LockKeyhole, ShieldCheck, X } from 'lucide-react';
import { ownerApi } from './api';
import useModal from './useModal';

const SESSION_KEY = 'pulsefit.owner.session.v1';
const PULSEFIT_APP_URL = import.meta.env.VITE_APP_URL || 'http://localhost:8081';

export function useDeveloperSession() {
  const [session, setSession] = useState(null);
  const [checking, setChecking] = useState(true);
  const [sessionError, setSessionError] = useState('');
  const sessionRef = useRef(null);
  const revision = useRef(0);
  const forget = () => { try { sessionStorage.removeItem(SESSION_KEY); } catch {} };

  useEffect(() => {
    let active = true;
    let restoringToken = null;
    const hydrationRevision = revision.current;
    const expire = (event) => {
      const expectedToken = sessionRef.current?.tokens?.access_token || restoringToken;
      if (!expectedToken || event.detail?.authorization !== `Bearer ${expectedToken}`) return;
      revision.current += 1;
      sessionRef.current = null;
      restoringToken = null;
      setChecking(false);
      forget(); setSession(null); setSessionError('Your session has expired. Sign in again to continue.');
    };
    window.addEventListener('pulsefit:session-expired', expire);
    try {
      const raw = sessionStorage.getItem(SESSION_KEY);
      if (!raw) { setChecking(false); }
      else {
      const stored = JSON.parse(raw);
      if (!stored?.tokens?.access_token) throw new Error('Invalid saved session');
      restoringToken = stored.tokens.access_token;
      ownerApi.me(stored.tokens.access_token).then((user) => {
        if (!active || revision.current !== hydrationRevision) return;
        if (user.role !== 'super_admin') {
          forget();
          const error = new Error('Platform-owner access is required.');
          error.status = 403;
          throw error;
        }
        const verified = { ...stored, user };
        sessionRef.current = verified;
        try { sessionStorage.setItem(SESSION_KEY, JSON.stringify(verified)); } catch {}
        setSession(verified);
      }).catch((error) => {
        if (!active || revision.current !== hydrationRevision) return;
        if (!error.status || error.status >= 500) setSessionError('We could not restore your session. Check your connection and sign in again.');
        else forget();
      }).finally(() => { if (active) setChecking(false); });
      }
    } catch {
      forget();
      setChecking(false);
    }
    return () => { active = false; window.removeEventListener('pulsefit:session-expired', expire); };
  }, []);

  const save = (nextSession) => {
    revision.current += 1;
    sessionRef.current = nextSession;
    try { sessionStorage.setItem(SESSION_KEY, JSON.stringify(nextSession)); } catch {}
    setSessionError('');
    setSession(nextSession);
    setChecking(false);
  };
  const clear = async () => {
    const token = sessionRef.current?.tokens?.access_token;
    revision.current += 1;
    sessionRef.current = null;
    forget();
    setSession(null);
    setChecking(false);
    setSessionError('');
    if (token) await ownerApi.logout(token).catch(() => undefined);
  };
  return { session, checking, sessionError, save, clear };
}

export function DeveloperLogin({ open, onClose, onAuthenticated }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const attempt = useRef(0);
  const dialogRef = useModal(open, onClose);
  useEffect(() => {
    attempt.current += 1;
    setPassword(''); setShowPassword(false); setError(''); setLoading(false);
  }, [open]);

  if (!open) return null;

  const submit = async (event) => {
    event.preventDefault();
    if (loading) return;
    const currentAttempt = ++attempt.current;
    setError('');
    setLoading(true);
    try {
      const session = await ownerApi.login(email.trim().toLowerCase(), password);
      if (currentAttempt !== attempt.current) return;
      if (session.user.role !== 'super_admin') {
        await ownerApi.logout(session.tokens.access_token).catch(() => undefined);
        throw new Error('This login is restricted to the PulseFit application owner.');
      }
      onAuthenticated(session);
      setPassword('');
      onClose();
    } catch (loginError) {
      if (currentAttempt === attempt.current) setError(loginError.message || 'Unable to sign in.');
    } finally {
      if (currentAttempt === attempt.current) setLoading(false);
    }
  };

  return <div className="login-overlay" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
    <section ref={dialogRef} tabIndex={-1} className="login-dialog" role="dialog" aria-modal="true" aria-labelledby="developer-login-title">
      <button className="login-close" type="button" onClick={onClose} aria-label="Close login"><X size={20}/></button>
      <span className="login-icon"><ShieldCheck size={27}/></span>
      <small className="login-kicker">SECURE PLATFORM ACCESS</small>
      <h2 id="developer-login-title">Platform owner login</h2>
      <p>Manage gyms, owner inquiries and platform subscriptions with your PulseFit owner account.</p>
      <form onSubmit={submit}>
        <label>Email<input data-autofocus value={email} onChange={(event) => setEmail(event.target.value)} type="email" autoComplete="username" required placeholder="owner@company.com"/></label>
        <label>Password<span className="password-input"><input value={password} onChange={(event) => setPassword(event.target.value)} type={showPassword ? 'text' : 'password'} autoComplete="current-password" required/><button type="button" onClick={() => setShowPassword(!showPassword)} aria-label={showPassword ? 'Hide password' : 'Show password'}>{showPassword ? <EyeOff size={18}/> : <Eye size={18}/>}</button></span></label>
        {error ? <div className="login-error" role="alert">{error}</div> : null}
        <button className="btn btn-dark login-submit" disabled={loading} type="submit">{loading ? <LoaderCircle className="spin" size={18}/> : <LockKeyhole size={18}/>} {loading ? 'Signing in…' : 'Sign in securely'}</button>
      </form>
    </section>
  </div>;
}

export function DeveloperWelcome({ session, onLogout }) {
  return <section className="developer-welcome shell" id="developer-console">
    <div><small>APPLICATION OWNER CONNECTED</small><h2>Welcome, {session.user.full_name}</h2><p>The owner site is authenticated against the live PulseFit backend. Manage inquiries, gym-owner invitations, free trials, gyms, and subscriptions in the controls below.</p></div>
    <div className="developer-actions"><span><ShieldCheck size={18}/> {session.user.email}</span><a className="btn btn-lime" href={PULSEFIT_APP_URL}>Open PulseFit app</a><button className="btn btn-outline" type="button" onClick={onLogout}>Log out</button></div>
  </section>;
}
