import React, { useEffect, useState } from 'react';
import { ArrowLeft, ArrowRight, Building2, Check, Clock, MapPin, Menu, Phone, X } from 'lucide-react';
import { ownerApi } from './api';
import GymPhotoGallery from './GymPhotoGallery';
import GymWebsiteEditor, { GymWebsiteEditing, useGymWebsiteEditor, InlineDescription, InlineList, InlinePhotos, InlineContact, InlineLocation } from './GymWebsiteEditor';
import GymTeam from './GymTeam';
import GymHeroBackground from './GymHeroBackground';
import GymSocialLinks from './GymSocialLinks';
import { GymDetailMap } from './PublicGymDirectory';
import { hasCoordinates } from './directoryUtils';

export default function GymWebsite({ gymId }) {
  const [gym, setGym] = useState(null);
  const [status, setStatus] = useState('loading');
  const [error, setError] = useState('');
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    let active = true;
    setStatus('loading');
    ownerApi.publicGymWebsite(gymId).then((item) => {
      if (!active) return;
      setGym(item || null); setStatus(item ? 'ready' : 'missing');
    }).catch((error) => { if (active) { setError(error.message); setStatus(error.status === 404 ? 'missing' : 'error'); } });
    return () => { active = false; };
  }, [gymId, attempt]);
  useEffect(() => {
    const original = document.title;
    if (gym) document.title = `${gym.name} | Activities, Membership & Contact`;
    return () => { document.title = original; };
  }, [gym]);
  if (status !== 'ready') return <main className="gym-site gym-site-state"><Building2 size={38}/><h1>{status === 'loading' ? 'Opening your gym…' : status === 'missing' ? 'Gym not found' : 'Unable to load this gym'}</h1><p>{status === 'error' ? error : status === 'missing' ? 'This gym may no longer be listed. Explore other gyms on PulseFit.' : 'Getting the latest gym information.'}</p>{status === 'error' ? <button className="btn btn-dark" onClick={() => setAttempt((n) => n + 1)}>Try again</button> : null}<a href="/#gyms"><ArrowLeft size={16}/> Explore PulseFit gyms</a></main>;
  return <GymWebsiteEditing gym={gym} onSaved={setGym}><GymWebsiteContent/></GymWebsiteEditing>;
}

function GymWebsiteContent() {
  const editor = useGymWebsiteEditor();
  const gym = editor.preview;
  const [menuOpen, setMenuOpen] = useState(false);
  const activities = [...new Set(gym.categories || [])];
  const hours = Object.entries(gym.opening_hours || {});
  const directions = hasCoordinates(gym) ? `https://www.google.com/maps/dir/?api=1&destination=${gym.latitude},${gym.longitude}` : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(gym.address || gym.name)}`;
  const contact = gym.business_phone ? `tel:${gym.business_phone}` : gym.business_email ? `mailto:${gym.business_email}` : '#contact';
  return <div className="gym-site">
    <header className="gym-site-header"><div className="shell gym-site-nav"><a className="gym-site-back" href="/#gyms"><ArrowLeft size={17}/> All PulseFit gyms</a><a href="#gym-home" className="gym-site-brand"><span><Building2 size={22}/></span>{gym.name}</a><button className="gym-site-menu" aria-label="Toggle gym navigation" aria-expanded={menuOpen} onClick={() => setMenuOpen(!menuOpen)}>{menuOpen ? <X/> : <Menu/>}</button><nav className={menuOpen ? 'open' : ''} aria-label="Gym navigation">{[['about','About'],['activities','Activities'],['facilities','Facilities'],['gallery','Photo Gallery'],['team','Our Team'],['membership','Membership'],['contact','Contact']].map(([id,label]) => <a href={`#${id}`} key={id} onClick={() => setMenuOpen(false)}>{label}</a>)}</nav></div></header>
    <main id="gym-home">
      <section className="gym-site-hero"><GymHeroBackground photos={gym.hero_photos}/><div className="shell"><span className="gym-site-kicker">YOUR GYM. YOUR NEXT CHAPTER.</span><h1>{gym.name}</h1>{editor.editing ? <InlineDescription/> : <p>{gym.description || 'A place to build strength, find your rhythm, and work toward your goals.'}</p>}{gym.address ? <div className="gym-site-address"><MapPin size={17}/>{gym.address}</div> : null}<div className="gym-site-actions"><a className="btn gym-site-primary" href={contact}>Contact to join <ArrowRight size={17}/></a><a className="btn gym-site-secondary" href={directions} target="_blank" rel="noreferrer">Get directions <MapPin size={17}/></a></div><small>Listed on PulseFit{gym.verified ? ' · PulseFit verified' : ''}</small><InlinePhotos field="hero_photos" title="Hero backgrounds" max={10}/></div></section>
      <section className="shell gym-site-section" id="about"><span className="eyebrow">Welcome to {gym.name}</span><h2>Your goals.<br/>Your kind of gym.</h2>{editor.editing ? <InlineDescription/> : <p>{gym.description || 'Get to know the gym, explore its published activities and facilities, and contact the team to find the right membership for you.'}</p>}{gym.gender_policy ? <div className="gym-site-access"><Building2 size={18}/><span>Gym access: {gym.gender_policy.replaceAll('_',' ')}</span></div> : null}</section>
      <section className="gym-site-band" id="activities"><div className="shell gym-site-section"><span className="eyebrow">Find what moves you</span><h2>Activities & training.</h2><p>Explore the activities published by {gym.name}.</p><InlineList field="categories" title="Activity"><div className="gym-site-activities">{activities.length ? activities.map((activity, index) => <article key={activity}><span>{String(index + 1).padStart(2,'0')}</span><h3>{activity}</h3></article>) : <p>Activity details are coming soon. Contact the gym for available classes and training.</p>}</div></InlineList></div></section>
      <section className="shell gym-site-section" id="facilities"><span className="eyebrow">The space to do more</span><h2>Facilities.</h2><InlineList field="facilities" title="Facility"><div className="gym-site-facilities">{gym.facilities?.length ? gym.facilities.map((facility) => <div key={facility}><Check size={19}/>{facility}</div>) : <p>The gym has not published its facilities yet.</p>}</div></InlineList></section>
      <GymPhotoGallery gym={gym}/><GymTeam gym={gym}/><section className="gym-site-band" id="membership"><div className="shell gym-site-section"><span className="eyebrow">Find your membership</span><h2>A plan for your goals.</h2><p>Explore the current membership plans at {gym.name}.</p>{editor.editing ? <div className="gym-inline-plan-note"><Check size={17}/><span>Plans stay synced with your gym dashboard. <a href={import.meta.env.VITE_APP_URL || "http://localhost:8081"} target="_blank" rel="noreferrer">Manage membership plans</a></span></div> : null}<div className="gym-website-plan-grid">{gym.membership_plans?.length ? gym.membership_plans.map((plan) => <article className="gym-site-membership" key={plan.id}><span>{plan.duration_days} DAYS</span><h3>{plan.name}</h3><strong>{new Intl.NumberFormat('en-IN', {style:'currency',currency:plan.currency,maximumFractionDigits:2}).format(plan.price_cents / 100)}</strong>{plan.description ? <p>{plan.description}</p> : null}<ul>{plan.features.map((feature,index) => <li key={index}><Check size={16}/>{feature}</li>)}</ul><a className="btn gym-site-primary" href={gym.business_phone ? `tel:${gym.business_phone}` : gym.business_email ? `mailto:${gym.business_email}?subject=${encodeURIComponent(`Membership inquiry: ${plan.name}`)}` : '#contact'}>Ask about this plan <ArrowRight size={16}/></a></article>) : <p>No membership plans have been published yet. Contact the gym for pricing.</p>}</div>{gym.trial_available ? <p>Free trial available ? contact the gym for details.</p> : null}</div></section>
      <section className="shell gym-site-section" id="contact"><span className="eyebrow">Come say hello</span><h2>Find us. Join us.</h2><div className="gym-site-columns"><div className="gym-site-contact">{editor.editing ? <InlineContact/> : <><h3>{gym.name}</h3><p>{gym.address || 'Contact the gym for its address.'}</p>{gym.business_phone ? <a href={`tel:${gym.business_phone}`}><Phone size={17}/>{gym.business_phone}</a> : null}{gym.business_email ? <a href={`mailto:${gym.business_email}`}>{gym.business_email}</a> : null}{!gym.business_phone && !gym.business_email ? <p>Contact details have not been published yet.</p> : null}<h3><Clock size={19}/> Opening hours</h3>{hours.length ? <dl>{hours.map(([day,value]) => <div key={day}><dt>{day}</dt><dd>{typeof value === 'string' ? value : value?.closed ? 'Closed' : value?.open && value?.close ? `${value.open} – ${value.close}` : 'Contact gym for timings'}</dd></div>)}</dl> : <p>Contact the gym for opening hours.</p>}<a className="btn gym-site-secondary" href={directions} target="_blank" rel="noreferrer">Get directions <MapPin size={16}/></a></>}<GymSocialLinks links={gym.social_links}/></div><div className="gym-site-map-column">{editor.editing ? <InlineLocation/> : null}<div className="gym-site-map"><GymDetailMap gym={gym} onLocationChange={editor.editing && !editor.busy ? (location)=>editor.changeMany(location) : undefined}/></div></div></div></section>
    </main><footer className="gym-site-footer"><div className="shell"><b>{gym.name}</b><GymWebsiteEditor/><a href="/#gyms">Discover more gyms on <strong>PulseFit</strong> <ArrowRight size={14}/></a></div></footer>
  </div>;
}
