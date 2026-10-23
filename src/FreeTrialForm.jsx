import React, { useEffect, useState } from 'react';
import { ArrowRight, Check, LoaderCircle } from 'lucide-react';
import { ownerApi } from './api';

export default function FreeTrialForm({ plans, selectedPlanId }) {
  const [selectedPlan, setSelectedPlan] = useState('');
  const [state, setState] = useState({ loading: false, error: '', success: '' });

  useEffect(() => {
    if (!selectedPlan && plans[0]?.id?.includes('-')) setSelectedPlan(plans[0].id);
  }, [plans, selectedPlan]);

  useEffect(() => {
    if (plans.some((plan) => plan.id === selectedPlanId && plan.id.includes('-'))) setSelectedPlan(selectedPlanId);
  }, [selectedPlanId, plans]);

  const submit = async (event) => {
    event.preventDefault();
    if (state.loading) return;
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    setState({ loading: true, error: '', success: '' });
    try {
      await ownerApi.submitInquiry({
        full_name: String(form.get('full_name') || '').trim(), email: String(form.get('email') || '').trim().toLowerCase(), phone: String(form.get('phone') || '').trim(),
        gym_name: String(form.get('gym_name') || '').trim(),
        active_members_range: form.get('active_members_range'),
        interested_plan_id: form.get('interested_plan_id') || null, source: 'owner_site',
      });
      formElement.reset();
      setSelectedPlan(plans[0]?.id?.includes('-') ? plans[0].id : '');
      setState({ loading: false, error: '', success: 'Thanks — your owner inquiry is saved. The PulseFit team will contact you about setup and secure access.' });
    } catch (error) {
      setState({ loading: false, error: error.message || 'Could not submit your inquiry.', success: '' });
    }
  };

  return <form onSubmit={submit}>
    <div className="form-title"><b>Register your gym with PulseFit</b><small>This form is for gym owners and authorised gym managers.</small></div>
    <label>Owner or manager name<input name="full_name" required minLength="2" placeholder="e.g. Ganesh R"/></label>
    <label>Work email<input name="email" required type="email" placeholder="you@yourgym.com"/></label>
    <label>Mobile number<input name="phone" required type="tel" minLength="8" maxLength="40" autoComplete="tel" placeholder="e.g. +91 98765 43210"/></label>
    <label>Gym name<input name="gym_name" required minLength="2" placeholder="Your gym"/></label>
    <label>Active members<select name="active_members_range" defaultValue="" required><option value="" disabled>Select range</option><option>Under 100</option><option>100–300</option><option>300–1,000</option><option>1,000+</option></select></label>
    <label>Interested plan<select name="interested_plan_id" value={selectedPlan} onChange={(event) => setSelectedPlan(event.target.value)}><option value="">Launch (default)</option>{plans.filter((plan) => plan.id?.includes('-')).map((plan) => <option key={plan.id} value={plan.id}>{plan.name}</option>)}</select></label>
    {state.error ? <div className="login-error" role="alert">{state.error}</div> : null}
    {state.success ? <div className="trial-success" role="status"><Check size={18}/>{state.success}</div> : null}
    <button className="btn btn-dark" type="submit" disabled={state.loading}>{state.loading ? <LoaderCircle className="spin" size={18}/> : null}{state.loading ? 'Saving owner inquiry…' : 'Register gym & start free'} <ArrowRight size={18}/></button>
    <small>No card required. Members looking for a gym should use the public gym finder above.</small>
  </form>;
}
