import React, { useEffect, useState } from 'react';
import { Check, LoaderCircle, Save, Settings2 } from 'lucide-react';
import { ownerApi } from './api';

function toDraft(plan) {
  return {
    ...plan,
    price_rupees: plan.price_cents == null ? '' : String(plan.price_cents / 100),
    features_text: plan.features.join('\n'),
  };
}

function PlanForm({ plan, accessToken, onSaved }) {
  const [draft, setDraft] = useState(() => toDraft(plan));
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState('');

  const set = (field, value) => setDraft((current) => ({ ...current, [field]: value }));

  const submit = async (event) => {
    event.preventDefault();
    if (saving) return;
    setSaving(true);
    setStatus('');
    try {
      const price = draft.price_rupees.trim();
      const updated = await ownerApi.updatePlan(plan.id, {
        name: draft.name.trim(),
        description: draft.description.trim(),
        price_cents: price === '' ? null : Math.round(Number(price) * 100),
        currency: draft.currency.trim().toUpperCase(),
        billing_period: (draft.billing_period || '').trim() || null,
        member_limit: draft.member_limit.trim(),
        features: draft.features_text.split('\n').map((item) => item.trim()).filter(Boolean),
        cta_label: draft.cta_label.trim(),
        trial_days: Number(draft.trial_days),
        is_popular: draft.is_popular,
        is_active: draft.is_active,
        display_order: Number(draft.display_order),
      }, accessToken);
      setDraft(toDraft(updated));
      setStatus('Saved');
      onSaved(updated);
    } catch (error) {
      setStatus(error.message || 'Could not save this plan.');
    } finally {
      setSaving(false);
    }
  };

  return <form className="subscription-form" onSubmit={submit}>
    <div className="subscription-form-head"><div><small>{draft.slug}</small><h3>{draft.name}</h3></div><label className="switch-field"><input type="checkbox" checked={draft.is_active} onChange={(e) => set('is_active', e.target.checked)}/> Public</label></div>
    <label>Plan name<input required maxLength={80} value={draft.name} onChange={(e) => set('name', e.target.value)}/></label>
    <label>Description<textarea required maxLength={300} rows="3" value={draft.description} onChange={(e) => set('description', e.target.value)}/></label>
    <div className="subscription-fields">
      <label>Price ({draft.currency || "currency"})<input min="0" step="0.01" type="number" placeholder="Blank = Custom" value={draft.price_rupees} onChange={(e) => set('price_rupees', e.target.value)}/></label>
      <label>Currency<input required maxLength={3} value={draft.currency} onChange={(e) => set('currency', e.target.value)}/></label>
      <label>Billing period<input placeholder="month" value={draft.billing_period || ''} onChange={(e) => set('billing_period', e.target.value)}/></label>
      <label>Display order<input required type="number" value={draft.display_order} onChange={(e) => set('display_order', e.target.value)}/></label>
    </div>
    <label>Member limit<input required maxLength={80} value={draft.member_limit} onChange={(e) => set('member_limit', e.target.value)}/></label>
    <label>Features (one per line)<textarea required rows="7" value={draft.features_text} onChange={(e) => set('features_text', e.target.value)}/></label>
    <div className="subscription-fields">
      <label>Button label<input required maxLength={80} value={draft.cta_label} onChange={(e) => set('cta_label', e.target.value)}/></label>
      <label>Free trial days<input required min="0" max="365" type="number" value={draft.trial_days} onChange={(e) => set('trial_days', e.target.value)}/></label>
    </div>
    <label className="switch-field"><input type="checkbox" checked={draft.is_popular} onChange={(e) => set('is_popular', e.target.checked)}/> Show “Most popular” badge</label>
    <div className="subscription-save"><span role="status" aria-live="polite" className={status === 'Saved' ? 'save-ok' : 'save-error'}>{status === 'Saved' ? <Check size={15}/> : null}{status}</span><button className="btn btn-lime" type="submit" disabled={saving}>{saving ? <LoaderCircle className="spin" size={17}/> : <Save size={17}/>} {saving ? 'Saving…' : 'Save plan'}</button></div>
  </form>;
}

export default function SubscriptionEditor({ session, onSaved }) {
  const token = session.tokens.access_token;
  const [plans, setPlans] = useState([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  const loadPlans = () => {
    setError('');
    return ownerApi.plans(token).then(setPlans).catch((requestError) => setError(requestError.message));
  };

  useEffect(() => {
    setLoading(true);
    loadPlans().finally(() => setLoading(false));
  }, [token]);

  const refreshAfterSave = (updated) => {
    setPlans((current) => current.map((plan) => plan.id === updated.id ? updated : plan));
    onSaved();
  };

  return <section className="subscription-console shell" aria-labelledby="subscription-console-title">
    <div className="subscription-console-head"><span><Settings2 size={24}/></span><div><small>DEVELOPER CONTROLS</small><h2 id="subscription-console-title">Subscription plans</h2><p>Edit the cards shown in public pricing. Changes are saved to the backend immediately.</p></div></div>
    {loading ? <div className="subscription-state"><LoaderCircle className="spin"/> Loading plans…</div> : null}
    {error ? <div className="login-error" role="alert">{error}</div> : null}
    {!loading && !error ? <div className="subscription-grid">{plans.map((plan) => <PlanForm key={plan.id} plan={plan} accessToken={token} onSaved={refreshAfterSave}/>)}</div> : null}
  </section>;
}
