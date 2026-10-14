import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Building2, Check, Clipboard, Clock3, Eye, EyeOff, LogIn, Mail, MapPin, RefreshCw, Search, Send, Users } from 'lucide-react';
import { ownerApi } from './api';

const formatDate = (value) => value && !Number.isNaN(new Date(value).getTime()) ? new Intl.DateTimeFormat('en-IN', { dateStyle: 'medium' }).format(new Date(value)) : '—';

function useRecordAction() {
  const pending = useRef(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const run = async (action, success = 'Saved') => {
    if (pending.current) return;
    pending.current = true;
    setBusy(true);
    setMessage('');
    try { await action(); setMessage(success); }
    catch (error) { setMessage(error.message || 'Could not save. Please try again.'); }
    finally { pending.current = false; setBusy(false); }
  };
  return { busy, message, run };
}

function GymCard({ gym, plans, token, onSaved }) {
  const [planId, setPlanId] = useState(gym.subscription?.platform_plan_id || plans[0]?.id || '');
  const [status, setStatus] = useState(gym.subscription?.status || 'trialing');
  const { busy, message, run } = useRecordAction();
  const save = () => run(async () => {
      await ownerApi.setGymSubscription(gym.id, { platform_plan_id: planId, status }, token);
      await onSaved();
  });
  return <article className="gym-record">
    <div className="record-head"><div><small>{gym.code}</small><h3>{gym.name}</h3></div><span className={`record-status ${gym.status}`}>{gym.status}</span></div>
    <div className="gym-details"><span><b>Owner</b>{gym.owner_name || 'Not assigned'}</span><span><b>Email</b>{gym.owner_email || gym.email || '—'}</span><span><b>Phone</b>{gym.phone || '—'}</span><span><b>Address</b>{gym.address || '—'}</span><span><b>Timezone</b>{gym.timezone}</span><span><b>Created</b>{formatDate(gym.created_at)}</span><span><b>Users</b>{gym.user_count}</span><span><b>Members / Trainers</b>{gym.member_count} / {gym.trainer_count}</span></div>
    <details className="gym-settings"><summary>Stored gym settings</summary><pre>{JSON.stringify(gym.settings, null, 2)}</pre></details>
    <div className="gym-subscription"><b>Subscription</b><div><select aria-label="Subscription plan" disabled={busy} value={planId} onChange={(e) => setPlanId(e.target.value)}>{plans.map((plan) => <option key={plan.id} value={plan.id}>{plan.name}</option>)}</select><select aria-label="Subscription status" disabled={busy} value={status} onChange={(e) => setStatus(e.target.value)}>{['trialing','active','past_due','cancelled','expired'].map((item) => <option key={item}>{item}</option>)}</select><button className="btn btn-lime" disabled={!planId || busy} onClick={save}>{busy ? "Saving…" : "Save"}</button></div><small role="status">{gym.subscription?.status === 'trialing' ? `Free trial ends ${formatDate(gym.subscription.current_period_ends_at)}` : `Current plan: ${gym.subscription?.plan_name || 'Not assigned'}`} {message ? `· ${message}` : ''}</small></div>
  </article>;
}

function InquiryCard({ inquiry, savedInvite, token, onChanged }) {
  const [invite, setInvite] = useState(null);
  const [notes, setNotes] = useState(inquiry.notes || '');
  const { busy, message, run } = useRecordAction();
  const [showInviteCode, setShowInviteCode] = useState(true);
  const changeStatus = (status) => run(async () => { await ownerApi.updateInquiry(inquiry.id, { status }, token); await onChanged(); });
  const issueInvite = () => run(async () => {
    setInvite(await ownerApi.inviteInquiry(inquiry.id, token));
    await onChanged();
  }, 'Invitation created');
  const currentInvite = invite || savedInvite;
  const inviteCode = currentInvite?.token || '';
  const inviteText = inviteCode ? `PulseFit gym-owner invitation code: ${inviteCode}` : '';
  return <article className="inquiry-record">
    <div className="record-head"><div><small>{formatDate(inquiry.created_at)} · {inquiry.source}</small><h3>{inquiry.gym_name}</h3></div><select aria-label="Inquiry status" disabled={busy} value={inquiry.status} onChange={(e) => changeStatus(e.target.value)}>{['new','contacted','invited','converted','closed'].map((item) => <option key={item}>{item}</option>)}</select></div>
    <p><b>{inquiry.full_name}</b><a href={`mailto:${inquiry.email}`}>{inquiry.email}</a><a href={`tel:${inquiry.phone}`}>{inquiry.phone}</a></p>
    <div className="inquiry-meta"><span><Users size={15}/>{inquiry.active_members_range}</span><span>Interested in {inquiry.interested_plan_name || 'Launch'}</span></div>
    <label className="inquiry-notes">Developer notes<textarea disabled={busy} rows="2" maxLength="2000" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Follow-up notes…"/><button type="button" disabled={busy} onClick={() => run(async () => { await ownerApi.updateInquiry(inquiry.id, { notes: notes || null }, token); await onChanged(); })}>Save notes</button></label>
    {currentInvite || inquiry.invitation_id ? <div className="issued-invite">
      <b>Invite code <span className={`invite-state ${currentInvite?.status || 'unknown'}`}>{currentInvite?.status || inquiry.status}</span></b>
      {inviteCode ? <>
        <code>{showInviteCode ? inviteCode : '••••••••••••••••••••••••'}</code>
        <div>
          <button type="button" onClick={() => setShowInviteCode((visible) => !visible)}>{showInviteCode ? <EyeOff size={15}/> : <Eye size={15}/>} {showInviteCode ? 'Hide code' : 'Show code'}</button>
          <button type="button" disabled={busy} onClick={() => run(async () => { if (!navigator.clipboard?.writeText) throw new Error("Copy is unavailable. Select the invitation code and copy it manually."); await navigator.clipboard.writeText(inviteCode); }, "Code copied")}><Clipboard size={15}/> Copy code</button>
          <a href={`mailto:${inquiry.email}?subject=Your PulseFit gym owner invitation&body=${encodeURIComponent(inviteText)}`}><Mail size={15}/> Email invitation</a>
        </div>
      </> : <small>This older invite code cannot be recovered. Create a replacement invitation to generate a visible code.</small>}
    </div> : null}
    {message ? <p role="status" aria-live="polite">{message}</p> : null}
    {inquiry.status !== 'converted' ? <button className="btn btn-dark" onClick={issueInvite} disabled={busy}><Send size={16}/>{busy ? 'Creating…' : inquiry.invitation_id ? 'Create replacement invitation' : 'Invite gym owner'}</button> : <span className="converted-label"><Check size={16}/> Converted to gym</span>}
  </article>;
}

export default function DeveloperOperations({ session }) {
  const token = session.tokens.access_token;
  const [data, setData] = useState({ inquiries: [], invitations: [], gyms: [], trials: [], plans: [], loginEvents: [] });
  const [state, setState] = useState({ loading: true, error: '' });
  const [loaded, setLoaded] = useState(false);
  const requestVersion = useRef(0);
  const [gymSearch, setGymSearch] = useState('');
  const load = useCallback(() => {
    const version = ++requestVersion.current;
    setState({ loading: true, error: '' });
    return Promise.all([ownerApi.inquiries(token), ownerApi.invitations(token), ownerApi.gyms(token), ownerApi.freeTrials(token), ownerApi.plans(token), ownerApi.loginEvents(token)])
      .then(([inquiries, invitations, gyms, trials, plans, loginEvents]) => {
        if (version !== requestVersion.current) return;
        setData({ inquiries, invitations, gyms, trials, plans, loginEvents });
        setLoaded(true);
      })
      .catch((error) => { if (version === requestVersion.current) setState({ loading: false, error: error.message }); })
      .finally(() => { if (version === requestVersion.current) setState((current) => ({ ...current, loading: false })); });
  }, [token]);
  useEffect(() => { void load(); return () => { requestVersion.current += 1; }; }, [load]);
  const normalizedGymSearch = gymSearch.trim().toLowerCase();
  const visibleGyms = data.gyms.filter((gym) => !normalizedGymSearch || [
    gym.name, gym.code, gym.owner_name, gym.owner_email, gym.email, gym.address, gym.subscription?.plan_name,
  ].some((value) => value?.toLowerCase().includes(normalizedGymSearch)));
  return <section className="developer-operations shell">
    <div className="operations-title"><div><small>BUSINESS OPERATIONS</small><h2>Gyms, trials and inquiries</h2><p>Every owner-site lead and every registered gym in one database-backed view.</p></div><button className="btn btn-outline" disabled={state.loading} aria-busy={state.loading} onClick={load}><RefreshCw size={16}/> Refresh</button></div>
    <div className="operations-metrics"><span><Mail/><b>{data.inquiries.length}</b><small>Owner inquiries</small></span><span><Building2/><b>{data.gyms.length}</b><small>All gyms</small></span><span><Clock3/><b>{data.trials.length}</b><small>Free trials</small></span><span><LogIn/><b>{data.loginEvents.length}</b><small>Recent logins</small></span></div>
    {state.error ? <div className="login-error" role="alert">{state.error}</div> : null}
    {state.loading && !loaded ? <div className="subscription-state" role="status">Loading developer data…</div> : <>
      <div className="operations-section platform-gyms" id="platform-gyms">
        <div className="platform-gyms-head">
          <div><small>LIVE PLATFORM DIRECTORY</small><h3>All registered gyms</h3><p>Every gym currently added to PulseFit.</p></div>
          <label className="gym-search"><Search size={16}/><span className="sr-only">Search gyms</span><input type="search" value={gymSearch} onChange={(event) => setGymSearch(event.target.value)} placeholder="Search gyms, owners or plans"/></label>
        </div>
        {data.gyms.length ? <div className="platform-gym-table-wrap"><table className="platform-gym-table">
          <thead><tr><th>Gym</th><th>Owner</th><th>Status</th><th>Plan</th><th>Members</th><th>Joined</th></tr></thead>
          <tbody>{visibleGyms.map((gym) => <tr key={gym.id}>
            <td><span className="gym-name-cell"><i><Building2 size={17}/></i><span><b>{gym.name}</b><small>{gym.code}{gym.address ? <><MapPin size={11}/>{gym.address}</> : null}</small></span></span></td>
            <td><b className="table-primary">{gym.owner_name || 'Not assigned'}</b><small>{gym.owner_email || gym.email || 'No email'}</small></td>
            <td><span className={`record-status ${gym.status}`}>{gym.status}</span></td>
            <td><b className="table-primary">{gym.subscription?.plan_name || 'Not assigned'}</b><small>{gym.subscription?.status || 'No subscription'}</small></td>
            <td><b className="gym-member-count">{gym.member_count ?? 0}</b><small>{gym.trainer_count ?? 0} trainers</small></td>
            <td><span className="table-primary">{formatDate(gym.created_at)}</span></td>
          </tr>)}</tbody>
        </table>{visibleGyms.length === 0 ? <p className="operations-empty gym-search-empty">No gyms match “{gymSearch}”.</p> : null}</div> : <p className="operations-empty">No registered gyms yet.</p>}
      </div>
      <div className="operations-section"><h3>Gym owner inquiries</h3>{data.inquiries.length ? <div className="inquiry-grid">{data.inquiries.map((item) => <InquiryCard key={item.id} inquiry={item} savedInvite={data.invitations.find((invite) => invite.id === item.invitation_id)} token={token} onChanged={load}/>)}</div> : <p className="operations-empty">No inquiries yet. New “Start free” submissions will appear here.</p>}</div>
      <div className="operations-section"><h3>Free gym trials</h3>{data.trials.length ? <div className="trial-list">{data.trials.map((gym) => <span key={gym.id}><b>{gym.name}</b>{gym.subscription?.plan_name} · ends {formatDate(gym.subscription?.current_period_ends_at)}</span>)}</div> : <p className="operations-empty">No gyms are currently on a free trial.</p>}</div>
      <div className="operations-section"><h3>Gym subscription management</h3>{data.gyms.length ? <div className="gym-record-grid">{data.gyms.map((gym) => <GymCard key={gym.id} gym={gym} plans={data.plans} token={token} onSaved={load}/>)}</div> : <p className="operations-empty">No registered gyms yet.</p>}</div>
      <div className="operations-section"><h3>Secure login history</h3>{data.loginEvents.length ? <div className="login-history"><table><thead><tr><th>Time</th><th>Account</th><th>Role</th><th>Result</th><th>IP address</th></tr></thead><tbody>{data.loginEvents.map((event) => <tr key={event.id}><td>{formatDate(event.created_at)}</td><td>{event.email}</td><td>{event.role || 'Unknown'}</td><td><span className={event.success ? 'login-success' : 'login-failed'}>{event.success ? 'Successful' : event.failure_reason}</span></td><td>{event.ip_address || '—'}</td></tr>)}</tbody></table></div> : <p className="operations-empty">No login events recorded yet.</p>}</div>
    </>}
  </section>;
}
